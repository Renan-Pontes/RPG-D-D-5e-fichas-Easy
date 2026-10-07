"""
Mundo da campanha — lugares, NPCs, facções, itens, lore e documentos.

Regras de visibilidade e validação ficam em api/world_rules.py (puro). Aqui
só há acesso ao banco, permissão e respostas. Revelar é SEMPRE ação explícita
do mestre (PATCH/reveal); nada é revelado sozinho.

GET    /api/campaigns/<c>/world              lista leve (membro; jogador filtrado)
POST   /api/campaigns/<c>/world              cria (mestre)  { kind, name, ... }
POST   /api/campaigns/<c>/world/sample       mundo de exemplo (mestre) { lang } — 409 se já houver entradas
POST   /api/campaigns/<c>/world/seen         jogador marca o Mundo como visto
GET    /api/campaigns/<c>/session-plan       plano da próxima sessão (mestre)
PUT    /api/campaigns/<c>/session-plan       merge por chave (mestre)
GET    /api/world/<pk>                       detalhe (membro; jogador filtrado; hidden = 404)
PATCH  /api/world/<pk>                       { ...campos, version } — 409 {entry} se a versão divergir
DELETE /api/world/<pk>
GET    /api/world/<pk>/image?v=<ver>         imagem (bytes) com ETag/Cache-Control
PUT    /api/world/<pk>/image                 { image: dataURL } → { imageVer }
DELETE /api/world/<pk>/image
POST   /api/world/<pk>/reveal                { visibility?, secrets?: {s1: true}, pins?: {p1: true}, logDiary?: true, lang? }

Ecos da mesa (imersão; desligável em dm_settings.immersion — "Mundo vivo"):
POST   /api/world/<pk>/react                 jogador { kind: shiver|love|doubt|fight|star } (idempotente)
DELETE /api/world/<pk>/react                 jogador { kind } (ou ?kind=)
POST   /api/world/<pk>/view                  jogador registra leitura (1 por minuto por cartão)
GET    /api/campaigns/<c>/world/echoes       mestre: quem sussurrou o quê + frases de cronista (?lang=en)
"""
import base64

from django.db import transaction
from django.db import IntegrityError
from django.db.models import Count, F, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import world_rules as R
from .diary import current_session, log_diary
from .models import Campaign, Membership, WorldEntry, WorldImage, WorldReaction, WorldView
from .permissions import get_campaign_or_404, get_membership, is_dm, require_dm, require_member
from .rate_limit import rate_limit
from . import plans as P


def _bad(code):
    raise ValidationError({'error': code})


def _body(request):
    return request.data if isinstance(request.data, dict) else {}


def _run(fn, *args, **kwargs):
    """Executa uma função de world_rules convertendo WorldError em 400."""
    try:
        return fn(*args, **kwargs)
    except R.WorldError as e:
        _bad(e.code)


# ------------------------------------------------------------------ acesso
def player_visible_ids(campaign, membership_id):
    """Ids das entradas que o jogador pode ver (não-hidden; handout só p/ destinatários)."""
    ids = set()
    rows = WorldEntry.objects.filter(campaign=campaign).exclude(visibility='hidden').values_list('id', 'kind', 'data')
    for pk, kind, data in rows:
        if kind == 'handout':
            rec = (data or {}).get('recipients', 'all')
            if isinstance(rec, list) and membership_id not in rec:
                continue
        ids.add(pk)
    return ids


def world_new_count(campaign, membership):
    """Quantas entradas visíveis ao jogador foram reveladas depois do último
    `world_seen_at` (selo "Novo!"). Usado no GET da campanha (contrato C3)."""
    if membership is None:
        return 0
    ids = player_visible_ids(campaign, membership.id)
    if not ids:
        return 0
    qs = WorldEntry.objects.filter(id__in=ids, revealed_at__isnull=False)
    if membership.world_seen_at:
        qs = qs.filter(revealed_at__gt=membership.world_seen_at)
    return qs.count()


def _viewer(request, campaign):
    """(for_dm, membership) — levanta 403 para quem não é da campanha."""
    if is_dm(request.user, campaign):
        return True, get_membership(request.user, campaign)
    return False, require_member(request.user, campaign)


def _entry_for(request, pk):
    """Carrega a entrada e decide o papel. Estranho ou jogador sem acesso = 404
    (não revela que a entrada existe)."""
    entry = WorldEntry.objects.select_related('campaign').filter(pk=pk).first()
    if not entry:
        raise NotFound('not_found')
    campaign = entry.campaign
    if is_dm(request.user, campaign):
        return entry, True, None
    membership = get_membership(request.user, campaign)
    if not membership or not R.player_can_see(entry, membership.id):
        raise NotFound('not_found')
    return entry, False, player_visible_ids(campaign, membership.id)


def _dm_entry(request, pk):
    entry = WorldEntry.objects.select_related('campaign').filter(pk=pk).first()
    if not entry or not is_dm(request.user, entry.campaign):
        raise NotFound('not_found')
    return entry


# ------------------------------------------------------------------ referências
def _check_refs(campaign, fields, self_id=None):
    """Confere parent/links/pins contra as entradas da campanha. Links e pins
    para entradas inexistentes são descartados; parent inválido = 400."""
    rows = dict(WorldEntry.objects.filter(campaign=campaign).values_list('id', 'parent_id'))
    if fields.get('parent_id'):
        pid = fields['parent_id']
        if pid not in rows or pid == self_id:
            _bad('invalid_parent')
        seen, cur = set(), pid
        while cur:  # evita ciclo (A dentro de B dentro de A)
            if cur == self_id or cur in seen:
                _bad('invalid_parent')
            seen.add(cur)
            cur = rows.get(cur)
    if 'links' in fields:
        fields['links'] = [ln for ln in fields['links'] if ln['to'] in rows and ln['to'] != self_id]
    data = fields.get('data')
    if isinstance(data, dict) and isinstance(data.get('map'), dict):
        for p in data['map']['pins']:
            if p.get('entryId') and p['entryId'] not in rows:
                p['entryId'] = None
    return fields


def _stamp_secrets(new, old, session, now_iso):
    """Segredos que passaram a revelados ganham sessão e data. Devolve True se houve."""
    old_rev = {s.get('id') for s in old or [] if isinstance(s, dict) and s.get('revealed')}
    changed = False
    for s in new:
        if s.get('revealed') and s['id'] not in old_rev:
            s['session'] = session
            s['revealedAt'] = now_iso
            changed = True
        if not s.get('revealed'):
            s.pop('session', None)
            s.pop('revealedAt', None)
    return changed


def _pins_newly_visible(new_data, old_data):
    old = {p.get('id') for p in ((old_data or {}).get('map') or {}).get('pins') or [] if p.get('visible')}
    return any(p.get('visible') and p.get('id') not in old
               for p in ((new_data or {}).get('map') or {}).get('pins') or [])


# ------------------------------------------------------------------ lista / criar
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def world_list(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    for_dm, membership = _viewer(request, campaign)
    if request.method == 'GET':
        if for_dm:
            # body só para calcular menções; nunca vai na resposta
            entries = [R.serialize_light(e, True) for e in WorldEntry.objects.filter(campaign=campaign).defer('dm_notes')]
            immersion = R.immersion_on(campaign)
            if immersion:
                add_dm_echoes(campaign, entries)
            return Response({'entries': entries, 'count': len(entries), 'max': P.MAX_CARDS_PER_CAMPAIGN,
                             'immersion': immersion})
        visible = player_visible_ids(campaign, membership.id)
        qs = WorldEntry.objects.filter(campaign=campaign, id__in=visible).defer('dm_notes')
        entries = [R.serialize_light(e, False, visible) for e in qs]
        immersion = R.immersion_on(campaign)
        out = {'entries': entries, 'immersion': immersion,
               'seenAt': membership.world_seen_at.isoformat() if membership.world_seen_at else None}
        if immersion:
            add_player_echoes(membership, entries)
            settings = campaign.dm_settings if isinstance(campaign.dm_settings, dict) else {}
            if settings.get('fogHint') is True:
                # só uma noção aproximada (poucos/alguns/muitos), nunca número
                hidden = WorldEntry.objects.filter(campaign=campaign).count() - len(visible)
                out['fog'] = {'hint': R.fog_hint(hidden)}
        return Response(out)

    if not for_dm:
        require_dm(request.user, campaign)
    body = _body(request)
    kind = _run(R.clean_kind, body.get('kind'))
    if not R.text(body.get('name'), R.MAX_NAME):
        _bad('missing_name')
    # Cartões: sem limite comercial; só o teto técnico por campanha (402 plan_limit 'cards').
    P.check_cards(campaign)
    fields = _run(R.clean_entry_fields, body, kind)
    fields = _check_refs(campaign, fields)
    now = timezone.now()
    if 'secrets' in fields:
        _stamp_secrets(fields['secrets'], [], current_session(campaign), now.isoformat())
    entry = WorldEntry(campaign=campaign, kind=kind, **fields)
    if entry.visibility != 'hidden':
        entry.revealed_at = now
    if 'sort' not in fields:
        last = WorldEntry.objects.filter(campaign=campaign).order_by('-sort').values_list('sort', flat=True).first()
        entry.sort = (last or 0) + 1
    entry.save()
    return Response({'entry': R.serialize_full(entry, True)}, status=201)


# ------------------------------------------------------------------ detalhe
@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def world_detail(request, pk):
    if request.method == 'GET':
        entry, for_dm, visible = _entry_for(request, pk)
        out = R.serialize_full(entry, for_dm, visible)
        if R.immersion_on(entry.campaign):
            if for_dm:
                add_dm_echoes(entry.campaign, [out], with_people=True)
            else:
                add_player_echoes(get_membership(request.user, entry.campaign), [out])
        return Response({'entry': out})

    entry = _dm_entry(request, pk)
    campaign = entry.campaign
    if request.method == 'DELETE':
        _delete_entry(entry)
        return Response({'ok': True})

    body = _body(request)
    version = R.to_int(body.get('version'), 0, 10**9)
    if version is not None and version != entry.version:
        return Response({'error': 'version_conflict', 'entry': R.serialize_full(entry, True)}, status=409)
    kind = _run(R.clean_kind, body['kind']) if 'kind' in body else entry.kind
    fields = _run(R.clean_entry_fields, body, kind, entry.secrets, entry.id)
    if kind != entry.kind:
        fields['kind'] = kind
        if 'data' not in fields:
            fields['data'] = _run(R.clean_data, kind, entry.data)
    fields = _check_refs(campaign, fields, entry.id)

    now = timezone.now()
    newly = False
    if 'visibility' in fields and R.VIS_RANK[fields['visibility']] > R.VIS_RANK[entry.visibility]:
        newly = True
    if 'secrets' in fields:
        newly = _stamp_secrets(fields['secrets'], entry.secrets, current_session(campaign), now.isoformat()) or newly
    if 'data' in fields and _pins_newly_visible(fields['data'], entry.data):
        newly = True
    if newly:
        fields['revealed_at'] = now

    # Atualização condicional: só grava se ninguém salvou no meio (versão igual).
    updated = WorldEntry.objects.filter(pk=entry.pk, version=entry.version).update(
        **fields, version=F('version') + 1, updated_at=now)
    entry.refresh_from_db()
    if not updated:
        return Response({'error': 'version_conflict', 'entry': R.serialize_full(entry, True)}, status=409)
    return Response({'entry': R.serialize_full(entry, True)})


def _delete_entry(entry):
    """Apaga e limpa links/pins que apontavam para ela (parent já vira NULL)."""
    with transaction.atomic():
        target = entry.id
        others = WorldEntry.objects.filter(campaign_id=entry.campaign_id).exclude(pk=target).only('id', 'links', 'data')
        for o in others:
            links = [ln for ln in o.links or [] if ln.get('to') != target]
            data = o.data or {}
            pins = (data.get('map') or {}).get('pins') if isinstance(data.get('map'), dict) else None
            changed_pins = False
            if pins:
                for p in pins:
                    if p.get('entryId') == target:
                        p['entryId'] = None
                        changed_pins = True
            if len(links) != len(o.links or []) or changed_pins:
                WorldEntry.objects.filter(pk=o.pk).update(links=links, data=data)
        entry.delete()


# ------------------------------------------------------------------ imagem
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def world_image(request, pk):
    if request.method == 'GET':
        entry, _for_dm, _visible = _entry_for(request, pk)
        return image_response(request, entry)
    entry = _dm_entry(request, pk)
    if request.method == 'DELETE':
        WorldImage.objects.filter(entry=entry).delete()
        WorldEntry.objects.filter(pk=entry.pk).update(image_ver='', updated_at=timezone.now())
        return Response({'imageVer': ''})
    raw = _body(request).get('image')
    if isinstance(raw, str) and len(raw) > R.MAX_IMAGE_CHARS:
        _bad('image_too_large')
    data_url = _run(R.clean_image, raw)
    old = WorldImage.objects.filter(entry=entry).values_list('data', flat=True).first()
    P.check_images(entry.campaign.dm, P.image_bytes(data_url), P.image_bytes(old))
    ver = R.image_version(data_url)
    with transaction.atomic():
        WorldImage.objects.update_or_create(entry=entry, defaults={'data': data_url})
        WorldEntry.objects.filter(pk=entry.pk).update(image_ver=ver, updated_at=timezone.now())
    return Response({'imageVer': ver, 'imageUrl': f'/api/world/{entry.id}/image?v={ver}'})


def image_response(request, entry):
    """Bytes da imagem com ETag = image_ver (304 se o cliente já tem).
    Reaproveitável pelo telão (views_screen.screen_image)."""
    if not entry.image_ver:
        raise NotFound('no_image')
    etag = f'"{entry.image_ver}"'
    headers = {'ETag': etag, 'Cache-Control': 'private, max-age=31536000'}
    if request.META.get('HTTP_IF_NONE_MATCH') == etag:
        resp = HttpResponse(status=304)
    else:
        img = WorldImage.objects.filter(entry_id=entry.id).values_list('data', flat=True).first()
        if not img:
            raise NotFound('no_image')
        head, payload = img.split(',', 1)
        mime = head[5:].split(';', 1)[0]
        resp = HttpResponse(base64.b64decode(payload), content_type=mime)
    for k, v in headers.items():
        resp[k] = v
    return resp


# ------------------------------------------------------------------ revelar
REVEAL_TITLES = {
    'pt': {'revealed': 'Revelado: {name}', 'partial': 'Rumor: {name}', 'secret': 'Descoberto: {name}',
           'pin': 'No mapa: {name}'},
    'en': {'revealed': 'Revealed: {name}', 'partial': 'Rumor: {name}', 'secret': 'Discovered: {name}',
           'pin': 'On the map: {name}'},
}


def _already_logged(campaign, entry, title, newly_secrets, newly_pins):
    """Revelar → ocultar → revelar o mesmo cartão na mesma sessão não repete a
    linha na Crônica: já existe um evento com o mesmo título e os mesmos
    segredos/pins para esta entrada."""
    from .models import DiaryEntry
    secret_ids = sorted(s['id'] for s in newly_secrets)
    pin_ids = sorted(p['id'] for p in newly_pins)
    rows = (DiaryEntry.objects
            .filter(campaign=campaign, subtype='reveal', kind='event', title=title[:200], hidden=False,
                    session=current_session(campaign), data__entryId=entry.id)
            .values_list('data', flat=True))
    return any(sorted((d or {}).get('secretIds') or []) == secret_ids
               and sorted((d or {}).get('pinIds') or []) == pin_ids for d in rows)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def world_reveal(request, pk):
    """Ação do mestre: muda visibilidade, revela/oculta segredos e pins. Só
    registra na Crônica se `logDiary` (padrão true) e algo foi revelado."""
    entry = _dm_entry(request, pk)
    campaign = entry.campaign
    body = _body(request)
    now = timezone.now()
    fields, newly_secrets, newly_pins = {}, [], []
    old_vis = entry.visibility

    if 'visibility' in body:
        fields['visibility'] = _run(R.clean_visibility, body['visibility'])
    sec_req = body.get('secrets')
    if sec_req is not None:
        if not isinstance(sec_req, dict):
            _bad('invalid_secrets')
        session = current_session(campaign)
        secrets = [dict(s) for s in entry.secrets or []]
        known = {s.get('id') for s in secrets}
        for sid in sec_req:
            if sid not in known:
                _bad('unknown_secret')
        for s in secrets:
            if s.get('id') not in sec_req:
                continue
            want = bool(sec_req[s['id']])
            if want and not s.get('revealed'):
                s.update({'revealed': True, 'session': session, 'revealedAt': now.isoformat()})
                newly_secrets.append(s)
            elif not want:
                s['revealed'] = False
                s.pop('session', None)
                s.pop('revealedAt', None)
        fields['secrets'] = secrets
    pin_req = body.get('pins')
    if pin_req is not None:
        if not isinstance(pin_req, dict):
            _bad('invalid_pins')
        data = dict(entry.data or {})
        m = data.get('map') if isinstance(data.get('map'), dict) else None
        pins = [dict(p) for p in (m or {}).get('pins') or []]
        known = {p.get('id') for p in pins}
        for pid in pin_req:
            if pid not in known:
                _bad('unknown_pin')
        for p in pins:
            if p.get('id') in pin_req:
                want = bool(pin_req[p['id']])
                if want and not p.get('visible'):
                    newly_pins.append(p)
                p['visible'] = want
        data['map'] = {**(m or {}), 'pins': pins}
        fields['data'] = data

    vis_up = 'visibility' in fields and R.VIS_RANK[fields['visibility']] > R.VIS_RANK[old_vis]
    if vis_up or newly_secrets or newly_pins:
        fields['revealed_at'] = now
    if fields:
        WorldEntry.objects.filter(pk=entry.pk).update(**fields, version=F('version') + 1, updated_at=now)
        entry.refresh_from_db()

    final_vis = entry.visibility
    if body.get('logDiary', True) and (vis_up or newly_secrets or newly_pins) and final_vis != 'hidden':
        lang = 'en' if body.get('lang') == 'en' else 'pt'
        t = REVEAL_TITLES[lang]
        key = ('revealed' if final_vis == 'revealed' else 'partial') if vis_up else ('secret' if newly_secrets else 'pin')
        if not _already_logged(campaign, entry, t[key].format(name=entry.name), newly_secrets, newly_pins):
            log_diary(campaign, 'reveal', t[key].format(name=entry.name),
                      body='\n'.join(s['text'] for s in newly_secrets),
                      data={'entryId': entry.id, 'entryName': entry.name, 'kind': entry.kind,
                            'visibility': final_vis, 'secretIds': [s['id'] for s in newly_secrets],
                            'pinIds': [p['id'] for p in newly_pins]},
                      user=request.user)
    return Response({'entry': R.serialize_full(entry, True)})


# ------------------------------------------------------------------ exemplo / visto
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def world_sample(request, id_or_slug):
    from .world_sample import create_sample_world
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    if WorldEntry.objects.filter(campaign=campaign).exists():
        return Response({'error': 'world_not_empty'}, status=409)
    lang = 'en' if _body(request).get('lang') == 'en' else 'pt'
    with transaction.atomic():
        result = create_sample_world(campaign, lang)
    entries = [R.serialize_light(e, True) for e in WorldEntry.objects.filter(campaign=campaign).defer('dm_notes')]
    return Response({'entries': entries, 'adventureId': result.get('adventureId')}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def world_seen(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    if is_dm(request.user, campaign):
        return Response({'seenAt': None})
    membership = require_member(request.user, campaign)
    now = timezone.now()
    Membership.objects.filter(pk=membership.pk).update(world_seen_at=now)
    return Response({'seenAt': now.isoformat()})


# ------------------------------------------------------------------ plano da sessão
@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def session_plan(request, id_or_slug):
    """Plano da próxima sessão (checklist do "Mestre Preguiçoso"), em
    Campaign.dm_settings.sessionPlan. PUT/PATCH fazem merge por chave."""
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    if request.method == 'GET':
        plan = R.merged_session_plan((campaign.dm_settings or {}).get('sessionPlan'), {})
        return Response({'plan': plan})
    body = _body(request)
    raw = body.get('plan') if isinstance(body.get('plan'), dict) else body
    patch = _run(R.clean_session_plan_patch, raw)
    with transaction.atomic():
        fresh = Campaign.objects.select_for_update().get(pk=campaign.pk)
        settings = dict(fresh.dm_settings or {})
        plan = _run(R.merged_session_plan, settings.get('sessionPlan'), patch)
        settings['sessionPlan'] = plan
        Campaign.objects.filter(pk=fresh.pk).update(dm_settings=settings)
    return Response({'plan': plan})


# ------------------------------------------------------------------ ecos da mesa
def _who(membership):
    """Nome que o mestre lê nos ecos: o personagem, senão o jogador."""
    if membership.character_id and membership.character:
        return membership.character.name
    prof = getattr(membership.user, 'profile', None)
    return (prof.display_name if prof else '') or membership.user.username


def _reaction_counts(entry_ids):
    """{entryId: {kind: n}} sem favoritos (agregado, sem nomes)."""
    out = {}
    rows = (WorldReaction.objects.filter(entry_id__in=entry_ids).exclude(kind=R.FAVORITE_KIND)
            .values('entry_id', 'kind').annotate(n=Count('id')))
    for r in rows:
        out.setdefault(r['entry_id'], {})[r['kind']] = r['n']
    return out


def add_player_echoes(membership, entries):
    """Marca do próprio jogador + contagens agregadas (sem nomes), só para
    cartões revelados/parciais. Muta `entries` (dicts serializados)."""
    if membership is None:
        return entries
    ids = [e['id'] for e in entries if e.get('visibility') in ('partial', 'revealed')]
    counts = _reaction_counts(ids)
    mine = {}
    for eid, kind in WorldReaction.objects.filter(membership=membership, entry_id__in=ids).values_list('entry_id', 'kind'):
        mine.setdefault(eid, set()).add(kind)
    for e in entries:
        if e['id'] not in ids:
            continue
        my = mine.get(e['id'], set())
        e['myReactions'] = [k for k in R.REACTION_KINDS if k in my]
        e['myFavorite'] = R.FAVORITE_KIND in my
        e['reactionCounts'] = counts.get(e['id'], {})
    return entries


def _echo_rows(campaign, entry_ids=None):
    """(reações, leituras) do mestre, com membership/personagem carregados."""
    rq = WorldReaction.objects.filter(entry__campaign=campaign).select_related(
        'membership__character', 'membership__user__profile')
    vq = WorldView.objects.filter(entry__campaign=campaign).select_related(
        'membership__character', 'membership__user__profile')
    if entry_ids is not None:
        rq, vq = rq.filter(entry_id__in=entry_ids), vq.filter(entry_id__in=entry_ids)
    return list(rq), list(vq)


def _people_by_entry(reactions, views):
    people = {}   # entryId -> membershipId -> pessoa
    for r in reactions:
        p = people.setdefault(r.entry_id, {}).setdefault(r.membership_id, {
            'membershipId': r.membership_id, 'name': _who(r.membership), 'kinds': [], 'views': 0,
            'lastAt': None})
        p['kinds'].append(r.kind)
        p['lastAt'] = max(filter(None, [p['lastAt'], r.created.isoformat()]))
    for v in views:
        p = people.setdefault(v.entry_id, {}).setdefault(v.membership_id, {
            'membershipId': v.membership_id, 'name': _who(v.membership), 'kinds': [], 'views': 0,
            'lastAt': None})
        p['views'] = v.count
        p['lastAt'] = max(filter(None, [p['lastAt'], v.last_at.isoformat()]))
    for by_m in people.values():
        for p in by_m.values():
            p['kinds'] = [k for k in R.ECHO_KINDS if k in p['kinds']]
    return {eid: sorted(by_m.values(), key=lambda p: p['lastAt'] or '', reverse=True)
            for eid, by_m in people.items()}


def add_dm_echoes(campaign, entries, with_people=False):
    """Mestre: contagens por cartão (reactionCounts, favoriteCount, viewCount)
    e, no detalhe, quem sussurrou (whispers)."""
    ids = [e['id'] for e in entries]
    counts = {}
    for r in (WorldReaction.objects.filter(entry_id__in=ids).values('entry_id', 'kind').annotate(n=Count('id'))):
        counts.setdefault(r['entry_id'], {})[r['kind']] = r['n']
    views = dict(WorldView.objects.filter(entry_id__in=ids).values('entry_id')
                 .annotate(n=Sum('count')).values_list('entry_id', 'n'))
    people = _people_by_entry(*_echo_rows(campaign, ids)) if with_people else {}
    for e in entries:
        c = dict(counts.get(e['id'], {}))
        e['favoriteCount'] = c.pop(R.FAVORITE_KIND, 0)
        e['reactionCounts'] = c
        e['viewCount'] = views.get(e['id']) or 0
        if with_people:
            e['whispers'] = people.get(e['id'], [])
    return entries


def _player_entry(request, pk):
    """Entrada + membership do jogador que pode reagir. Mestre = 403; quem
    não enxerga o cartão = 404 (não confirma que existe)."""
    entry = WorldEntry.objects.select_related('campaign').filter(pk=pk).first()
    if not entry:
        raise NotFound('not_found')
    if is_dm(request.user, entry.campaign):
        return entry, None
    membership = get_membership(request.user, entry.campaign)
    if not membership or not R.player_can_react(entry, membership.id):
        raise NotFound('not_found')
    return entry, membership


def _my_echo(entry, membership):
    mine = set(WorldReaction.objects.filter(entry=entry, membership=membership).values_list('kind', flat=True))
    return {'entryId': entry.id,
            'myReactions': [k for k in R.REACTION_KINDS if k in mine],
            'myFavorite': R.FAVORITE_KIND in mine,
            'reactionCounts': _reaction_counts([entry.id]).get(entry.id, {})}


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
@rate_limit(key='world_react', max_attempts=90, window=60, per_ip=False, per_user=True)
def world_react(request, pk):
    entry, membership = _player_entry(request, pk)
    if membership is None:
        return Response({'error': 'players_only'}, status=403)
    if not R.immersion_on(entry.campaign):
        return Response({'error': 'immersion_off'}, status=409)
    raw = _body(request).get('kind') or request.query_params.get('kind')
    kind = _run(R.clean_reaction_kind, raw)
    if request.method == 'POST':
        try:
            with transaction.atomic():
                WorldReaction.objects.get_or_create(entry=entry, membership=membership, kind=kind)
        except IntegrityError:
            pass  # clique duplo concorrente: já existe
    else:
        WorldReaction.objects.filter(entry=entry, membership=membership, kind=kind).delete()
    return Response(_my_echo(entry, membership))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def world_view(request, pk):
    """Jogador abriu o cartão. Conta no máximo 1 leitura por minuto por cartão
    (abrir/fechar seguido não infla nada). Mestre e "Mundo vivo" desligado = no-op."""
    entry, membership = _player_entry(request, pk)
    if membership is None or not R.immersion_on(entry.campaign):
        return Response({'counted': False})
    now = timezone.now()
    with transaction.atomic():
        row = WorldView.objects.select_for_update().filter(entry=entry, membership=membership).first()
        if row is None:
            try:
                with transaction.atomic():
                    WorldView.objects.create(entry=entry, membership=membership, count=1, last_at=now)
                return Response({'counted': True})
            except IntegrityError:
                row = WorldView.objects.select_for_update().get(entry=entry, membership=membership)
        if not R.view_counts(row.last_at, now):
            return Response({'counted': False})
        WorldView.objects.filter(pk=row.pk).update(count=F('count') + 1, last_at=now)
    return Response({'counted': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def world_echoes(request, id_or_slug):
    """Painel "Ecos da mesa" do mestre: por cartão, quem reagiu/voltou, mais
    frases de cronista prontas (`lines`) e a frase de quanto a mesa conhece."""
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    lang = 'en' if request.query_params.get('lang') == 'en' else 'pt'
    rows = list(WorldEntry.objects.filter(campaign=campaign).values_list('id', 'kind', 'name', 'visibility', 'data'))
    vis = [r[3] for r in rows]
    known = R.known_share_phrase(vis.count('revealed'), vis.count('partial'), len(rows), lang)
    if not R.immersion_on(campaign):
        return Response({'immersion': False, 'entries': [], 'lines': [], 'known': known})
    people = _people_by_entry(*_echo_rows(campaign))
    meta = {r[0]: r for r in rows}
    entries = []
    for eid, plist in people.items():
        if eid not in meta:
            continue
        _id, kind, name, visibility, data = meta[eid]
        reactions = {}
        for p in plist:
            for k in p['kinds']:
                reactions[k] = reactions.get(k, 0) + 1
        favorites = reactions.pop(R.FAVORITE_KIND, 0)
        entries.append({'entryId': eid, 'kind': kind, 'name': name, 'visibility': visibility,
                        'isMap': R.is_map(kind, data), 'reactions': reactions, 'favorites': favorites,
                        'views': sum(p['views'] for p in plist),
                        'lastAt': max((p['lastAt'] or '' for p in plist), default=''),
                        'people': plist})
    entries.sort(key=lambda e: e['lastAt'], reverse=True)
    return Response({'immersion': True, 'entries': entries, 'known': known,
                     'lines': R.echo_lines(entries, lang)})
