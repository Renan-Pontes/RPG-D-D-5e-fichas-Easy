"""
Diário da campanha.

GET    /api/campaigns/<id>/diary?session=&subtype=&kind=&offset=&limit=
       subtype: lista por vírgula de DiaryEntry.SUBTYPES + 'summary' (inclui 'levelgrant' e 'reveal')
POST   /api/campaigns/<id>/diary                 { title?, body, subtype?: 'note'|'summary', session?, hidden? }
PATCH  /api/campaigns/<id>/diary/<pk>            { title?, body?, hidden?, session? }
DELETE /api/campaigns/<id>/diary/<pk>
POST   /api/campaigns/<id>/diary/sessions        { number?, title? }  — mestre começa sessão
PATCH  /api/campaigns/<id>/diary/sessions/<n>    { title }            — mestre renomeia sessão
POST   /api/campaigns/<id>/diary/sessions/<n>/end { endCombat?, clearStage?, closeChecks?, carry?, moments? }
       — mestre encerra a sessão N (a atual) numa chamada só: grava diarySessions[n].endedAt,
       desliga "ao vivo", encerra o combate, limpa a Tela (frente, teste, fundo na capa), fecha
       os testes abertos, arquiva o plano e leva o que sobrou para a Sessão N+1 (carry), marca
       os momentos ([{charId, id?, text?}]) como "aconteceu" na sessão N e registra na Crônica
       "Sessão N terminou · 2h10". Repetir (2 toques, 2 aparelhos) não faz nada de novo.

O plano arquivado (subtype 'plan', sempre oculto) vai na lista SEM o `data.plan` (só as
contagens); ele só vem inteiro com ?subtype=plan (Crônica › Ver o plano desta sessão).

Permissões:
  - Mestre: lê tudo (inclusive ocultas), cria, edita/exclui/oculta qualquer entrada.
  - Jogador (membro): lê entradas não ocultas; cria notas próprias; edita/exclui só as dele.
Sessões ficam em campaign.state: session (nº atual, texto — o mesmo campo da
visão geral), live (sessão rolando) e diarySessions {"12": {title, startedAt}},
sempre gravados com merge atômico (campaign_state.update_state).
"""
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.db import transaction
from rest_framework import status as http

from . import world_rules as R
from .campaign_state import locked_dm_settings, update_state
from .diary import (current_session, length_text, log_combat_end, log_diary, log_session_end, session_meta,
                    session_minutes, _user_name)
from .models import Campaign, CheckRequest, CombatInstance, DiaryEntry, Membership
from .permissions import get_campaign_or_404, get_membership, is_dm, require_dm, require_member
from .rate_limit import rate_limit
from .stage import STAGE_KEY, get_stage

NOTE_SUBTYPES = {'note', 'summary'}
PLAN_SUBTYPE = 'plan'   # o plano arquivado ao encerrar (views_world.archive_session_plan)
ALL_SUBTYPES = set(DiaryEntry.SUBTYPES) | NOTE_SUBTYPES | {PLAN_SUBTYPE}
MAX_TITLE = 200
MAX_BODY = 20000
MAX_ENTRIES = 5000


def _serialize(e, user, dm, bodies=None, full_plan=False):
    mine = e.created_by_id == user.id and e.kind == 'note'
    body = bodies[e.id] if bodies and e.id in bodies else e.body
    data = e.data or {}
    if e.subtype == PLAN_SUBTYPE and not full_plan:
        # a lista é lida a cada 8 s: o plano inteiro (até 60 KB) só com ?subtype=plan
        data = {k: v for k, v in data.items() if k != 'plan'}
    return {
        'id': e.id, 'session': e.session, 'kind': e.kind, 'subtype': e.subtype,
        'title': e.title, 'body': body, 'data': data,
        'occurredAt': e.occurred_at.isoformat(),
        'editedAt': e.edited_at.isoformat() if e.edited_at else None,
        'createdBy': {'id': e.created_by_id, 'name': _user_name(e.created_by)} if e.created_by_id else None,
        'hidden': e.hidden,
        'canEdit': dm or mine,
    }


def player_reveal_filter(campaign, user):
    """Eventos 'reveal' da Crônica vistos pelo jogador seguem o estado ATUAL do
    Mundo: some o evento de cartão que voltou a ficar oculto, de documento que
    não é para ele, de segredo que o mestre escondeu de novo e de pin que saiu
    do mapa. Devolve (ids_excluídos, {id: corpo_filtrado})."""
    from . import world_rules as R
    from .models import WorldEntry
    membership = get_membership(user, campaign)
    mid = membership.id if membership else None
    events = list(DiaryEntry.objects.filter(campaign=campaign, subtype='reveal', kind='event')
                  .values_list('id', 'data', 'body'))
    if not events:
        return set(), {}
    entry_ids = {(d or {}).get('entryId') for _, d, _ in events}
    worlds = {w.id: w for w in WorldEntry.objects.filter(campaign=campaign, id__in=[i for i in entry_ids if i])}
    excluded, bodies = set(), {}
    for pk, data, body in events:
        data = data or {}
        w = worlds.get(data.get('entryId'))
        if not w or not R.player_can_see(w, mid):
            excluded.add(pk)
            continue
        secret_ids = data.get('secretIds') or []
        pin_ids = data.get('pinIds') or []
        if secret_ids:
            live = {s.get('id'): s for s in w.secrets or [] if isinstance(s, dict) and s.get('revealed')}
            still = [live[i] for i in secret_ids if i in live] if w.visibility == 'revealed' else []
            if not still and not pin_ids:
                excluded.add(pk)
                continue
            bodies[pk] = '\n'.join(s.get('text', '') for s in still)
        elif pin_ids:
            m = (w.data or {}).get('map')
            visible = {p.get('id') for p in (m.get('pins') or [] if isinstance(m, dict) else [])
                       if isinstance(p, dict) and p.get('visible')}
            if not visible.intersection(pin_ids):
                excluded.add(pk)
    return excluded, bodies


def _session_number(value):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or not (0 <= value <= 100000):
        raise ValidationError({'error': 'invalid_session'})
    return value


def _text(value, limit, field):
    if value is None:
        return ''
    if not isinstance(value, str):
        raise ValidationError({'error': f'invalid_{field}'})
    value = value.strip()
    if len(value) > limit:
        raise ValidationError({'error': f'{field}_too_long'})
    return value


def _sessions_payload(campaign, qs):
    meta = session_meta(campaign)
    numbers = sorted({n for n in qs.values_list('session', flat=True).distinct() if n is not None}
                     | {int(k) for k in meta if str(k).isdigit()}, reverse=True)
    return {
        'currentSession': current_session(campaign),
        # doneBefore (as cenas já feitas ao começar) é só do rascunho do resumo, no estado do mestre
        'sessions': [{'number': n, **{k: v for k, v in ({'title': '', 'startedAt': None} | (meta.get(str(n)) or {})).items()
                                      if k != 'doneBefore'}} for n in numbers],
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_diary(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    dm = is_dm(request.user, campaign)
    if request.method == 'POST':
        return _create_note(request, campaign, dm)

    base = DiaryEntry.objects.filter(campaign=campaign)
    bodies = None
    if not dm:
        excluded, bodies = player_reveal_filter(campaign, request.user)
        base = base.filter(hidden=False).exclude(pk__in=excluded)
    qs = base.select_related('created_by', 'created_by__profile')
    p = request.query_params
    if p.get('session') not in (None, ''):
        if p['session'] == 'none':
            qs = qs.filter(session__isnull=True)
        elif p['session'].isdigit():
            qs = qs.filter(session=int(p['session']))
        else:
            raise ValidationError({'error': 'invalid_session'})
    full_plan = False
    if p.get('subtype'):
        wanted = [s for s in p['subtype'].split(',') if s in ALL_SUBTYPES]
        qs = qs.filter(subtype__in=wanted)
        full_plan = PLAN_SUBTYPE in wanted
    if p.get('kind') in ('note', 'event'):
        qs = qs.filter(kind=p['kind'])
    try:
        offset = max(0, int(p.get('offset', 0)))
        limit = max(1, min(200, int(p.get('limit', 100))))
    except ValueError:
        raise ValidationError({'error': 'invalid_pagination'})
    page = list(qs[offset:offset + limit + 1])
    return Response({
        'entries': [_serialize(e, request.user, dm, bodies, full_plan=full_plan and dm) for e in page[:limit]],
        'hasMore': len(page) > limit,
        'offset': offset,
        **_sessions_payload(campaign, base),
    })


@rate_limit(key='diary_note', max_attempts=60, window=60, per_user=True)
def _create_note(request, campaign, dm):
    body = _text(request.data.get('body'), MAX_BODY, 'body')
    title = _text(request.data.get('title'), MAX_TITLE, 'title')
    if not body and not title:
        raise ValidationError({'error': 'empty_note'})
    subtype = request.data.get('subtype') or 'note'
    if subtype not in NOTE_SUBTYPES:
        raise ValidationError({'error': 'invalid_subtype'})
    hidden = request.data.get('hidden', False)
    session = request.data.get('session', 'current')
    if not dm and (hidden or session != 'current' or subtype == 'summary'):
        raise PermissionDenied('dm_only')
    if DiaryEntry.objects.filter(campaign=campaign).count() >= MAX_ENTRIES:
        raise ValidationError({'error': 'diary_full'})
    entry = DiaryEntry.objects.create(
        campaign=campaign, kind='note', subtype=subtype, title=title, body=body,
        session=current_session(campaign) if session == 'current' else _session_number(session),
        created_by=request.user, hidden=bool(hidden),
    )
    return Response({'entry': _serialize(entry, request.user, dm)}, status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def campaign_diary_entry(request, id_or_slug, entry_pk):
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    dm = is_dm(request.user, campaign)
    entry = DiaryEntry.objects.filter(campaign=campaign, pk=entry_pk).select_related('created_by__profile').first()
    if not entry or (entry.hidden and not dm):
        raise NotFound('not_found')
    if not dm and not (entry.kind == 'note' and entry.created_by_id == request.user.id):
        raise PermissionDenied('forbidden')

    if request.method == 'DELETE':
        entry.delete()
        return Response({'ok': True})

    changed = False
    if 'title' in request.data:
        entry.title = _text(request.data['title'], MAX_TITLE, 'title'); changed = True
    if 'body' in request.data:
        entry.body = _text(request.data['body'], MAX_BODY, 'body'); changed = True
    if 'hidden' in request.data:
        if not dm:
            raise PermissionDenied('dm_only')
        if entry.subtype == PLAN_SUBTYPE and not request.data['hidden']:
            raise ValidationError({'error': 'plan_stays_hidden'})   # o plano nunca vai ao jogador
        entry.hidden = bool(request.data['hidden'])
    if 'session' in request.data:
        if not dm:
            raise PermissionDenied('dm_only')
        entry.session = _session_number(request.data['session'])
    if changed:
        entry.edited_at = timezone.now()
    entry.save()
    return Response({'entry': _serialize(entry, request.user, dm)})


def _save_session_meta(campaign, number, extra=None, **fields):
    """Grava diarySessions[number] (e `extra`, ex.: session/live) com merge
    atômico no servidor — não apaga o que outro aparelho escreveu no state."""
    def patch(state):
        meta = dict(state.get('diarySessions') if isinstance(state.get('diarySessions'), dict) else {})
        meta[str(number)] = {**(meta.get(str(number)) or {'title': '', 'startedAt': None}), **fields}
        return {'diarySessions': meta, **(extra or {})}
    return update_state(campaign, patch)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_diary_start_session(request, id_or_slug):
    """Mestre começa a sessão N: vira a sessão atual (state.session), liga
    state.live (selo "Ao vivo"; mande live:false para só abrir o grupo no
    diário) e abre o grupo no diário."""
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    number = request.data.get('number')
    if number is None:
        number = (current_session(campaign) or 0) + 1
    number = _session_number(number)
    title = _text(request.data.get('title'), MAX_TITLE, 'title')
    live = request.data.get('live', True)
    if not isinstance(live, bool):
        raise ValidationError({'error': 'invalid_live'})
    # V12: as cenas do plano que já estavam feitas ao começar (o resumo desta sessão não as
    # conta como jogadas hoje) e o fim de uma vez anterior com o mesmo número sai
    plan = (campaign.dm_settings or {}).get('sessionPlan')
    done_before = [str(sc.get('id')) for sc in (plan.get('scenes') or [] if isinstance(plan, dict) else [])
                   if isinstance(sc, dict) and sc.get('done') and sc.get('id')][:30]
    _save_session_meta(campaign, number, extra={'session': str(number), 'live': live},
                       title=title, startedAt=timezone.now().isoformat(), endedAt=None, doneBefore=done_before)
    log_diary(campaign, 'session', f'Sessão {number} começou' + (f' — {title}' if title else ''),
              data={'session': number, 'title': title}, user=request.user)
    return Response({'currentSession': number, 'state': campaign.state}, status=201)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def campaign_diary_session(request, id_or_slug, number):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    title = _text(request.data.get('title'), MAX_TITLE, 'title')
    _save_session_meta(campaign, number, title=title)
    return Response({'session': {'number': number, **campaign.state['diarySessions'][str(number)]}})


# ------------------------------------------------------------------ encerrar a sessão (V12)
END_FLAGS = {'endCombat': True, 'clearStage': True, 'closeChecks': True, 'carry': False}
MAX_END_MOMENTS = 12


def _end_flags(body):
    out = {}
    for key, default in END_FLAGS.items():
        v = body.get(key, default)
        if not isinstance(v, bool):
            raise ValidationError({'error': f'invalid_{key}'})
        out[key] = v
    return out


def _end_moments(raw):
    """[{charId, id?, text?}] → validado (o texto só vale para o momento novo)."""
    if raw is None:
        return []
    if not isinstance(raw, list) or len(raw) > MAX_END_MOMENTS:
        raise ValidationError({'error': 'invalid_moments'})
    out = []
    for it in raw:
        cid = it.get('charId') if isinstance(it, dict) else None
        if isinstance(cid, bool) or not isinstance(cid, int) or cid <= 0:
            raise ValidationError({'error': 'invalid_moments'})
        out.append({'charId': cid, 'id': R.short_id(it.get('id')) or None,
                    'text': R.long_text(it.get('text'), R.MAX_SPOTLIGHT_TEXT).strip()})
    return out


def _closing_stage(stage):
    """A Tela no fim da sessão: sem frente, de volta ao fundo automático (a capa, já sem
    combate) e acesa; o ↶ Desfazer volta ao que estava. None = já estava assim."""
    if not stage['front'] and stage['bg'] == 'auto' and stage['focus']:
        return None
    out = {**stage, 'bg': 'auto', 'front': None, 'focus': True, 'at': timezone.now().isoformat(),
           'prev': {'bg': stage['bg'], 'front': stage['front'], 'focus': stage['focus']}}
    out.pop('lit', None)
    return out


def _mark_moments(campaign, number, moments):
    """Os momentos escolhidos em "Quem teve um momento hoje?" ganham `done = number`; quem
    não tinha momento aberto ganha um (★, com o texto que veio). Só fichas da mesa.
    → quantos foram marcados."""
    if not moments:
        return 0
    at_table = set(Membership.objects.filter(campaign=campaign, character__isnull=False)
                   .values_list('character_id', flat=True))
    with transaction.atomic():
        settings = locked_dm_settings(campaign.pk)
        try:
            ins = R.merged_party_insights(settings.get('partyInsights'), {})
        except R.WorldError:
            return 0
        patch, marked = {}, 0
        for m in moments:
            if m['charId'] not in at_table:
                continue
            key = str(m['charId'])
            cur = [dict(x) for x in patch.get(key) or ins['spotlights'].get(key) or []]
            hit = next((x for x in cur if m['id'] and x.get('id') == m['id']), None)
            if hit:
                if hit.get('done') is None:
                    hit['done'] = number
                    marked += 1
            elif not any(x.get('done') == number for x in cur) and len(cur) < R.MAX_SPOTLIGHTS:
                used = {x.get('id') for x in cur}
                sid = f'm{len(cur) + 1}'
                while sid in used:
                    sid = f'{sid}x'
                cur.append({'id': sid, 'kind': 'shine', 'text': m['text'] or f'Sessão {number}',
                            'auto': None, 'done': number, 'plan': None})
                marked += 1
            patch[key] = cur
        if not marked:
            return 0
        try:
            clean = R.clean_party_insights_patch({'spotlights': patch})
            settings['partyInsights'] = R.merged_party_insights(settings.get('partyInsights'), clean)
        except R.WorldError:
            return 0
        Campaign.objects.filter(pk=campaign.pk).update(dm_settings=settings)
    return marked


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_diary_end_session(request, id_or_slug, number):
    """■ Encerrar a sessão N (a folha "Encerrar a Sessão N", §4.9). Uma chamada só."""
    from .views_combat import _append_log
    from .views_world import archive_session_plan
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    body = request.data if isinstance(request.data, dict) else {}
    flags = _end_flags(body)
    moments = _end_moments(body.get('moments'))
    cur = current_session(campaign)
    if cur != number:
        return Response({'error': 'not_current_session', 'currentSession': cur}, status=http.HTTP_409_CONFLICT)
    state = campaign.state or {}
    meta = session_meta(campaign).get(str(number)) or {}
    meta = meta if isinstance(meta, dict) else {}
    if not state.get('live') and meta.get('endedAt'):
        # já encerrada (2º toque, outro aparelho): nada de novo, nem na Crônica
        return Response({'already': True, 'state': state, 'session': {'number': number, **meta}})
    ended = {'combat': False, 'checks': 0, 'stage': False, 'moments': 0}

    if flags['endCombat']:
        combat = CombatInstance.objects.filter(campaign=campaign, active=True).first()
        if combat:
            combat.active = False
            _append_log(combat, {'type': 'end'})
            combat.save()
            log_combat_end(campaign, combat.round_number, combat.combatants, request.user, action_log=combat.action_log)
            ended['combat'] = True
    if flags['closeChecks']:
        ended['checks'] = CheckRequest.objects.filter(campaign=campaign, status='open').update(
            status='closed', closed_at=timezone.now(), show_on_screen=False, screen_at=None)
    if flags['clearStage']:
        # o teste sai da Tela mesmo encerrado antes (o painel ficaria na TV)
        CheckRequest.objects.filter(campaign=campaign, show_on_screen=True).update(show_on_screen=False, screen_at=None)

    archived = plan = None
    if flags['carry']:
        plan_now = (campaign.dm_settings or {}).get('sessionPlan')
        fs = R.to_int(plan_now.get('forSession'), 1, 9999) if isinstance(plan_now, dict) else None
        if not fs or fs <= number:   # o plano de outra sessão (a próxima, já preparada) fica
            out = archive_session_plan(campaign, session=number, next_session=number + 1, carry=True,
                                       scene_id=state.get('sceneId'), done_before=meta.get('doneBefore'),
                                       user=request.user)
            archived, plan = out['archived'], out['plan']
    ended['moments'] = _mark_moments(campaign, number, moments)

    ended_at = timezone.now().isoformat()
    seen = {'stage': False}

    def fn(st):
        sessions = dict(st.get('diarySessions') if isinstance(st.get('diarySessions'), dict) else {})
        row = sessions.get(str(number)) if isinstance(sessions.get(str(number)), dict) else {'title': '', 'startedAt': None}
        sessions[str(number)] = {**row, 'endedAt': ended_at}
        patch = {'diarySessions': sessions, 'live': False}
        if flags['clearStage']:
            stage = _closing_stage(get_stage(st))
            if stage:
                patch[STAGE_KEY] = stage
                seen['stage'] = True
            if st.get('screenCard'):
                patch['screenCard'] = None   # a TV antiga também volta à capa
                seen['stage'] = True
            if st.get('sceneText'):
                # o texto lido sai da capa e da Mesa; o nome da cena fica ("Continuar de onde paramos")
                patch['sceneText'] = None
                seen['stage'] = True
        return patch

    state = update_state(campaign, fn)
    ended['stage'] = seen['stage']
    started_at = (state.get('diarySessions') or {}).get(str(number), {}).get('startedAt')
    log_session_end(campaign, number, started_at, ended_at, user=request.user)
    return Response({
        'state': state, 'ended': ended, 'plan': plan, 'archived': archived,
        'session': {'number': number, 'startedAt': started_at, 'endedAt': ended_at,
                    'length': length_text(session_minutes(started_at, ended_at)) or None},
    })
