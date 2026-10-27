"""
Pulso da mesa do mestre (V4, especificação §5.9) — no lugar do GET completo da
campanha no polling de 2,5 s.

GET /api/campaigns/<id>/pulse   (só o mestre)
    { rev, planRev, worldRev, advRev, checksRev, tableRollsRev, now,
      live, session, scene, sceneId, startedAt, endedAt,
      screen: { bg, front:{kind,title,imageUrl,hidden,caption,focus}|null,
                test:{id,label,done,total}|null,
                roll:{id,kind,who,label,total,crit,fail,at}|null, tvLive:n },
      combat: { active, ver, round, turnIndex, turnName, turnHp, nextName, acted,
                count, allMonstersDown, order:[{id,name,kind,acted,defeated}] } | null,
      counts: { openChecks, pendingRolls, approvals, dangers } }

~0,8 KB, com ETag: parado, a resposta é 304 sem corpo (o navegador revalida
sozinho: Cache-Control no-cache). `now` fica fora do ETag — é a hora do
servidor quando este pulso mudou.

Consultas leves (5 ou 6, nenhuma ficha serializada, nenhuma imagem):
  1. a campanha só com `state`, `updated_at` e os agregados em subconsultas
     (aprovações, Mundo, aventuras, testes, respostas, rolagens) e o
     `dm_settings.planRev` por json_extract;
  2. as vagas (id, ficha, papel, emprestada, quando a ficha mudou, nome);
  3. o combate pelo json_each do SQLite (só id, nome, tipo, PV e "caiu": os
     tokens com imagem não chegam ao Python; plano B lê no Python);
  4. o teste que está na Tela, com a contagem de respostas;
  5. a última rolagem pública;
  6. (só com um cartão na frente) o cartão, para o `rev`.

`checksRev` (testes, respostas e PEDIDOS de rolagem) não conta as rolagens de mesa
(`@mesa:`, api/table_rolls.py): elas não mudam nem os testes nem os pedidos, e a
rolagem da ficha (V15) é o gesto mais frequente do jogador — com elas ali, cada
rolagem fazia o mestre buscar Testes de novo (3 GET a mais por rolagem). Dos pedidos
bastam quantos são e quantos esperam: um pedido nunca muda de volta nem ganha o
marcador (pedido novo muda a conta; resolver ou cancelar muda os que esperam). As
listas de rolagens de mesa (Jogar › Tela › Últimas 5 e Testes › 🎲 Na Tela) seguem o
`tableRollsRev` (quantas e a mais nova, só das `@mesa:`). Custo: a conta de todas e
a dos pendentes saem do índice (campanha, status); só as `@mesa:` leem as linhas,
numa subconsulta (o MAX(resolved_at) de antes, que também lia, saiu).

`rev` muda quando qualquer campo do GET completo do mestre muda (o teste
api/tests/test_pulse.py confere campo a campo): a casca então busca o GET
completo. Um GET completo a cada 60 s fica de rede de segurança no cliente.

"TV conectada": a TV chama /api/screen/<t>?tv=1&c=<aba> e a view marca a aba
no LocMemCache que já existe (`mark_tv`); o pulso conta as abas vistas nos
últimos 30 s (`tv_count`). Nenhuma escrita no banco. A prévia do mestre
(`?preview=1`) não conta.
"""
import hashlib
import json
import time
from datetime import timezone as dt_timezone

from django.core.cache import cache
from django.db import OperationalError, connection
from django.db.models import Count, F, Max, OuterRef, Q, Subquery
from django.db.models.fields.json import KT
from django.http import HttpResponseNotModified
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (Adventure, Approval, Campaign, CheckRequest, CheckResponse, CombatInstance, Membership,
                     RollRequest, WorldEntry)
from .stage import get_stage
from .table_rolls import PREFIX, parse_note

TV_TTL = 30            # s: aba da TV sem pedir há mais que isso não conta
TV_MAX_TABS = 12       # teto de abas guardadas por campanha (cache pequeno)
TV_TAB_MAX_LEN = 40


# ------------------------------------------------------------------ "TV conectada"
def _tv_key(campaign_id):
    return f'tvs:{campaign_id}'


def clean_tab(raw):
    """Id da aba da TV (aleatório, do navegador): só letras, números, - e _."""
    s = str(raw or '')[:TV_TAB_MAX_LEN]
    return s if s and all(ch.isalnum() or ch in '-_' for ch in s) else ''


def mark_tv(campaign_id, tab):
    """A TV `tab` pediu agora. Só cache em memória (0 escrita no banco)."""
    tab = clean_tab(tab)
    if not tab:
        return
    now = time.time()
    tabs = cache.get(_tv_key(campaign_id)) or {}
    tabs = {k: v for k, v in tabs.items() if now - v <= TV_TTL}
    tabs[tab] = now
    if len(tabs) > TV_MAX_TABS:
        tabs = dict(sorted(tabs.items(), key=lambda kv: kv[1])[-TV_MAX_TABS:])
    cache.set(_tv_key(campaign_id), tabs, TV_TTL * 4)


def tv_count(campaign_id):
    now = time.time()
    tabs = cache.get(_tv_key(campaign_id)) or {}
    return sum(1 for v in tabs.values() if now - v <= TV_TTL)


# ------------------------------------------------------------------ consultas
def _sub(model, expr, *, via='campaign'):
    """Subconsulta correlacionada: um agregado de `model` desta campanha."""
    return Subquery(model.objects.filter(**{via: OuterRef('pk')}).order_by()
                    .values(via).annotate(v=expr).values('v')[:1])


_ROW_FIELDS = (
    'id', 'dm_id', 'state', 'updated_at', 'status', 'plan_rev', 'dm_plan_at', 'n_approvals',
    'world_n', 'world_at', 'adv_n', 'adv_at', 'checks_n', 'checks_max', 'checks_open', 'checks_closed',
    'checks_screen', 'checks_shown', 'resp_n', 'resp_at', 'rolls_n', 'rolls_pending',
)
# As rolagens de mesa: o mesmo `note__startswith` (LIKE) das listas e da arrumação.
# `%%`: o SQL vai com parâmetros (%s); o Django devolve um `%` só ao SQLite.
_MESA = f" AND x.note LIKE '{PREFIX}%%'"


def _row_sql():
    """A linha da campanha com os agregados (SQL pronto: montar 16 subconsultas
    pelo ORM custava ~8 ms de Python a cada pulso; o SQL em si leva µs, cada
    subconsulta usa o índice por campanha)."""
    T = {m.__name__: m._meta.db_table for m in (Campaign, Approval, WorldEntry, Adventure, CheckRequest,
                                                   CheckResponse, RollRequest)}
    from .models import UserPlan

    def sub(table, expr, where=''):
        return f'(SELECT {expr} FROM "{table}" x WHERE x.campaign_id = c.id{where})'
    resp = (f'(SELECT {{}} FROM "{T["CheckResponse"]}" r JOIN "{T["CheckRequest"]}" q ON q.id = r.check_request_id '
            f'WHERE q.campaign_id = c.id)')
    cols = [
        'c.id', 'c.dm_id', 'c.state', 'c.updated_at', 'c.status', "json_extract(c.dm_settings, '$.planRev')",
        f'(SELECT updated_at FROM "{UserPlan._meta.db_table}" WHERE user_id = c.dm_id)',
        sub(T['Approval'], 'COUNT(*)', " AND x.status = 'pending'"),
        sub(T['WorldEntry'], 'COUNT(*)'), sub(T['WorldEntry'], 'MAX(x.updated_at)'),
        sub(T['Adventure'], 'COUNT(*)'), sub(T['Adventure'], 'MAX(x.updated_at)'),
        sub(T['CheckRequest'], 'COUNT(*)'), sub(T['CheckRequest'], 'MAX(x.id)'),
        sub(T['CheckRequest'], 'COUNT(*)', " AND x.status = 'open'"),
        sub(T['CheckRequest'], 'MAX(x.closed_at)'), sub(T['CheckRequest'], 'MAX(x.screen_at)'),
        sub(T['CheckRequest'], 'COUNT(*)', ' AND x.show_on_screen'),
        resp.format('COUNT(*)'), resp.format('MAX(r.updated_at)'),
        sub(T['RollRequest'], 'COUNT(*)'), sub(T['RollRequest'], 'COUNT(*)', " AND x.status = 'pending'"),
        # as de mesa numa varredura só: 'quantas maior-id' (separado em _campaign_row)
        sub(T['RollRequest'], "COUNT(*) || ' ' || IFNULL(MAX(x.id), 0)", _MESA),
    ]
    return f'SELECT {", ".join(cols)} FROM "{T["Campaign"]}" c WHERE '


_ROW_SQL = None


def _campaign_row(id_or_slug):
    """A campanha (pelo id ou pelo slug) com os agregados, num SELECT só. Outro
    banco que não o SQLite: as mesmas colunas pelo ORM (_campaign_row_orm)."""
    global _ROW_SQL
    key = str(id_or_slug)
    if connection.vendor == 'sqlite':
        _ROW_SQL = _ROW_SQL or _row_sql()
        with connection.cursor() as cur:
            row = None
            if key.isdigit():
                cur.execute(_ROW_SQL + 'c.id = %s', [int(key)])
                row = cur.fetchone()
            if row is None:
                cur.execute(_ROW_SQL + 'c.slug = %s', [key])
                row = cur.fetchone()
        if not row:
            raise NotFound('campaign_not_found')
        out = dict(zip(_ROW_FIELDS + ('mesa',), row))
        n, _, top = str(out.pop('mesa') or '0 0').partition(' ')
        out['mesa_n'], out['mesa_max'] = int(n), (int(top) or None)
        try:
            out['state'] = json.loads(out['state']) if isinstance(out['state'], str) else (out['state'] or {})
        except ValueError:
            out['state'] = {}
        return out
    return _campaign_row_orm(key)


def _campaign_row_orm(key):
    mesa = Q(note__startswith=PREFIX)
    qs = Campaign.objects.annotate(
        plan_rev=KT('dm_settings__planRev'), dm_plan_at=F('dm__user_plan__updated_at'),
        n_approvals=_sub(Approval, Count('id', filter=Q(status='pending'))),
        world_n=_sub(WorldEntry, Count('id')), world_at=_sub(WorldEntry, Max('updated_at')),
        adv_n=_sub(Adventure, Count('id')), adv_at=_sub(Adventure, Max('updated_at')),
        checks_n=_sub(CheckRequest, Count('id')), checks_max=_sub(CheckRequest, Max('id')),
        checks_open=_sub(CheckRequest, Count('id', filter=Q(status='open'))),
        checks_closed=_sub(CheckRequest, Max('closed_at')), checks_screen=_sub(CheckRequest, Max('screen_at')),
        checks_shown=_sub(CheckRequest, Count('id', filter=Q(show_on_screen=True))),
        resp_n=_sub(CheckResponse, Count('id'), via='check_request__campaign'),
        resp_at=_sub(CheckResponse, Max('updated_at'), via='check_request__campaign'),
        rolls_n=_sub(RollRequest, Count('id')),
        rolls_pending=_sub(RollRequest, Count('id', filter=Q(status='pending'))),
        mesa_n=_sub(RollRequest, Count('id', filter=mesa)), mesa_max=_sub(RollRequest, Max('id', filter=mesa)),
    ).values(*_ROW_FIELDS, 'mesa_n', 'mesa_max')
    row = qs.filter(id=key).first() if key.isdigit() else None
    row = row or qs.filter(slug=key).first()
    if not row:
        raise NotFound('campaign_not_found')
    return row


def _tables():
    from django.contrib.auth import get_user_model
    from .models import Character, Profile
    return {'m': Membership._meta.db_table, 'ch': Character._meta.db_table, 'u': get_user_model()._meta.db_table,
            'p': Profile._meta.db_table, 'r': RollRequest._meta.db_table}


def _fetch(sql, params):
    with connection.cursor() as cur:
        cur.execute(sql.format(**_tables()), params)
        return cur.fetchall()


def _seats(campaign_id):
    """As vagas da mesa, só o que o `rev` e a contagem de alvos precisam:
    (id, user_id, character_id, role, sponsored, ficha mudou em, nome da ficha,
    e-mail, usuário, nome de exibição) — os campos de `members` no GET completo."""
    return [tuple(r) for r in _fetch(
        'SELECT m.id, m.user_id, m.character_id, m.role, m.sponsored, ch.updated_at, ch.name, '
        'u.email, u.username, p.display_name FROM {m} m JOIN {u} u ON u.id = m.user_id '
        'LEFT JOIN {ch} ch ON ch.id = m.character_id LEFT JOIN {p} p ON p.user_id = m.user_id '
        'WHERE m.campaign_id = %s ORDER BY m.id', [campaign_id])]


_COMBAT_SQL = (
    "SELECT c.active, c.round_number, c.turn_index, c.updated_at, "
    "json_extract(j.value, '$.id'), json_extract(j.value, '$.name'), json_extract(j.value, '$.type'), "
    "json_extract(j.value, '$.defeated'), json_extract(j.value, '$.current_hp'), "
    "json_extract(j.value, '$.stats.max_hp') "
    "FROM {table} c LEFT JOIN json_each(c.combatants) j "
    "WHERE c.campaign_id = %s ORDER BY j.key"
)


def _combat_rows(campaign_id):
    """(active, round, turn_index, updated_at, [combatente mínimo]) ou None.
    SQLite: json_each tira do JSON só 6 valores por combatente (os tokens com
    imagem ficam no banco). Sem JSON1 (ou outro banco): lê no Python."""
    if connection.vendor == 'sqlite':
        try:
            with connection.cursor() as cur:
                cur.execute(_COMBAT_SQL.format(table=CombatInstance._meta.db_table), [campaign_id])
                rows = cur.fetchall()
        except OperationalError:   # pragma: no cover — SQLite sem JSON1
            rows = None
        if rows is not None:
            if not rows:
                return None
            head = rows[0]
            fighters = [{'id': r[4], 'name': r[5], 'type': r[6], 'defeated': bool(r[7]),
                         'current_hp': r[8], 'max_hp': r[9]} for r in rows if r[4] is not None or r[5] is not None]
            # `ver` no MESMO formato do `updatedAt` do GET do combate (ISO com fuso): o
            # app compara os dois e, se o formato mudasse, buscaria o combate de novo.
            return bool(head[0]), head[1], head[2], _iso(head[3]), fighters
    c = (CombatInstance.objects.filter(campaign_id=campaign_id)
         .only('active', 'round_number', 'turn_index', 'updated_at', 'combatants').first())
    if not c:
        return None
    fighters = [{'id': x.get('id'), 'name': x.get('name'), 'type': x.get('type'), 'defeated': bool(x.get('defeated')),
                 'current_hp': x.get('current_hp'), 'max_hp': (x.get('stats') or {}).get('max_hp')}
                for x in (c.combatants or []) if isinstance(x, dict)]
    return bool(c.active), c.round_number, c.turn_index, c.updated_at.isoformat(), fighters


def _down(f):
    return bool(f.get('defeated')) or (isinstance(f.get('current_hp'), (int, float)) and f['current_hp'] <= 0)


def combat_summary(row):
    """O resumo do combate da barra da mesa (a vez, quem vem, quem já agiu)."""
    if not row:
        return None
    active, rnd, idx, ver, fighters = row
    n = len(fighters)
    if not n and not active:
        return None
    cur = fighters[idx] if active and 0 <= idx < n else None
    nxt = None
    if active and n:
        for i in range(1, n + 1):
            f = fighters[(idx + i) % n]
            if f is not cur and not f.get('defeated'):
                nxt = f
                break
    monsters = [f for f in fighters if f.get('type') == 'monster']
    order = [{'id': f.get('id'), 'name': f.get('name') or '', 'kind': f.get('type') or '',
              'acted': bool(active and i < idx), 'defeated': _down(f)} for i, f in enumerate(fighters)]
    hp = None
    if cur and cur.get('current_hp') is not None:
        hp = f"{cur.get('current_hp')}/{cur.get('max_hp') if cur.get('max_hp') is not None else '?'}"
    dangers = sum(1 for f in fighters if f.get('type') == 'pc' and not f.get('defeated')
                  and isinstance(f.get('current_hp'), (int, float)) and f['current_hp'] <= 0) if active else 0
    return {
        'active': active, 'ver': ver, 'round': rnd if active else None, 'turnIndex': idx if active else None,
        'turnId': cur.get('id') if cur else None, 'turnName': (cur or {}).get('name') or '',
        'turnHp': hp, 'nextName': (nxt or {}).get('name') or '',
        'acted': sum(1 for o in order if o['acted']), 'count': n,
        # montado e ainda não começou (o combate encerrado guarda a rodada em que parou)
        'setup': bool(not active and n and rnd == 1 and idx == 0),
        'allMonstersDown': bool(active and monsters and all(_down(f) for f in monsters)),
        'order': order, 'dangers': dangers,
    }


def _shown_test(campaign_id, seats):
    cr = (CheckRequest.objects.filter(campaign_id=campaign_id, show_on_screen=True, status='open')
          .annotate(n_resp=Count('responses')).values('id', 'label', 'target_user_ids', 'n_resp').first())
    if not cr:
        return None
    ids = set(cr['target_user_ids'] or [])
    total = sum(1 for s in seats if s[3] != 'dm' and (not ids or s[1] in ids))
    return {'id': cr['id'], 'label': cr['label'], 'done': cr['n_resp'], 'total': total}


def _last_roll(campaign_id):
    """A rolagem pública mais nova (pelo relógio do servidor), com o nome do personagem.
    Rolagem de mesa (V10, `@mesa:` no note): `kind` diz de onde veio; o mestre vai com
    `who` vazio (a barra escreve "Mestre") e o monstro com o nome dele."""
    rows = _fetch(
        'SELECT r.id, r.label, r.total, r.is_critical, r.is_critical_fail, r.resolved_at, ch.name, '
        'p.display_name, u.username, r.note FROM {r} r JOIN {u} u ON u.id = r.requested_by_id '
        'LEFT JOIN {ch} ch ON ch.id = r.character_id LEFT JOIN {p} p ON p.user_id = r.requested_by_id '
        "WHERE r.campaign_id = %s AND r.status = 'public' AND r.resolved_at IS NOT NULL "
        'ORDER BY r.resolved_at DESC, r.id DESC LIMIT 1', [campaign_id])
    if not rows:
        return None
    rid, label, total, crit, fail, at, char_name, display, username, note = rows[0]
    kind, who = parse_note(note)
    if kind == 'dm':
        who = ''
    elif kind not in ('monster', 'save'):
        who = char_name or display or username or ''
    return {'id': rid, 'kind': kind or 'request', 'who': who, 'label': label, 'total': total,
            'crit': bool(crit), 'fail': bool(fail), 'at': _iso(at)}


def _front_entry_id(state):
    """O cartão do Mundo que o GET completo resolve para a Tela (frente ou o cartão antigo)."""
    front = get_stage(state)['front'] or {}
    if front.get('kind') == 'card' and isinstance(front.get('entryId'), int):
        return front['entryId']
    if front.get('kind') == 'image':
        ref = front.get('ref') or {}
        for k in ('entryId', 'mapOf'):
            if isinstance(ref.get(k), int):
                return ref[k]
    card = (state or {}).get('screenCard') if isinstance(state, dict) else None
    if isinstance(card, dict) and card.get('type') == 'entry' and isinstance(card.get('entryId'), int):
        return card['entryId']
    return None


def _front_payload(campaign_id, stage):
    """A frente para a barra (nomes do mestre; a imagem pela URL do mestre)."""
    front = stage['front']
    if not front:
        return None
    kind = front.get('kind')
    url = None
    if kind == 'card' and front.get('ver'):
        url = f"/api/world/{front.get('entryId')}/image?v={front['ver']}"
    elif (kind == 'image' or (kind == 'scene' and front.get('image'))) and front.get('ver'):
        url = f'/api/campaigns/{campaign_id}/stage-image?v={front["ver"]}'
    title = front.get('label') or front.get('title') or ''
    if kind == 'text' and not title:
        title = str(front.get('text') or '').split('\n')[0][:60]
    return {'kind': kind, 'title': title, 'imageUrl': url, 'hidden': bool(front.get('hidden')),
            'caption': front.get('caption') or '', 'focus': stage['focus']}


def _iso(v):
    """Data em ISO com fuso (o SQL cru do SQLite devolve a data sem fuso; o banco guarda em UTC)."""
    if v is None:
        return None
    if isinstance(v, str):
        from django.utils.dateparse import parse_datetime
        d = parse_datetime(v)
        if d is None:
            return v
        v = d
    if hasattr(v, 'tzinfo') and v.tzinfo is None:
        v = v.replace(tzinfo=dt_timezone.utc)
    return v.isoformat() if hasattr(v, 'isoformat') else str(v)


def _h(*parts):
    raw = json.dumps(parts, default=str, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    return hashlib.sha1(raw.encode('utf-8')).hexdigest()[:16]


def build_pulse(id_or_slug, user):
    """(payload, etag) do pulso. PermissionDenied se não for o mestre."""
    row = _campaign_row(id_or_slug)
    if not user.is_authenticated or row['dm_id'] != user.id:
        raise PermissionDenied('dm_only')
    cid = row['id']
    state = row['state'] if isinstance(row['state'], dict) else {}
    seats = _seats(cid)
    combat = combat_summary(_combat_rows(cid))
    stage = get_stage(state)
    entry_id = _front_entry_id(state)
    entry_rev = None
    if entry_id:
        entry_rev = (WorldEntry.objects.filter(campaign_id=cid, pk=entry_id)
                     .values_list('updated_at', 'visibility').first())
    card = state.get('screenCard') if isinstance(state.get('screenCard'), dict) else {}
    adv_rev = _h(row['adv_n'], row['adv_at'])
    # Cada campo do GET completo do mestre tem uma fonte aqui (tests/test_pulse.py):
    # a campanha (state, identidade, dm_settings, status), as vagas e as fichas, as
    # aprovações pendentes, o combate do combatNow, o cartão (ou a sala) da Tela e
    # o plano do mestre (vagas de mesa).
    rev = _h(row['updated_at'], seats, row['n_approvals'], (combat or {}).get('active'), (combat or {}).get('round'),
             entry_rev, adv_rev if card.get('type') == 'scene' else None, row['dm_plan_at'])
    session = str(state.get('session') or '')
    meta = (state.get('diarySessions') or {}).get(session) if isinstance(state.get('diarySessions'), dict) else None
    meta = meta if isinstance(meta, dict) else {}
    pulse = {
        'rev': rev,
        'planRev': str(row['plan_rev'] or ''),
        'worldRev': _h(row['world_n'], row['world_at']),
        'advRev': adv_rev,
        'checksRev': _h(row['checks_n'], row['checks_max'], row['checks_open'], row['checks_closed'],
                        row['checks_screen'], row['checks_shown'], row['resp_n'], row['resp_at'],
                        (row['rolls_n'] or 0) - (row['mesa_n'] or 0), row['rolls_pending']),
        'tableRollsRev': _h(row['mesa_n'] or 0, row['mesa_max']),
        'live': bool(state.get('live')),
        'session': session,
        'scene': str(state.get('scene') or ''),
        'sceneId': state.get('sceneId') or None,
        'startedAt': meta.get('startedAt'),
        'endedAt': meta.get('endedAt'),
        'closed': row['status'] == 'closed',
        'screen': {
            'bg': stage['bg'],
            'front': _front_payload(cid, stage),
            'test': _shown_test(cid, seats) if row['checks_shown'] else None,
            'roll': _last_roll(cid) if row['rolls_n'] else None,
            'tvLive': tv_count(cid),
        },
        'combat': combat,
        'counts': {
            'openChecks': row['checks_open'] or 0,
            'pendingRolls': row['rolls_pending'] or 0,
            'approvals': row['n_approvals'] or 0,
            'dangers': (combat or {}).get('dangers') or 0,   # PJ a 0 PV no combate
        },
    }
    etag = f'"p{_h(pulse)}"'
    pulse['now'] = timezone.now().isoformat()
    return pulse, etag


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def campaign_pulse(request, id_or_slug):
    pulse, etag = build_pulse(id_or_slug, request.user)
    inm = request.META.get('HTTP_IF_NONE_MATCH', '')
    if inm and etag in [t.strip() for t in inm.split(',')]:
        resp = HttpResponseNotModified()
    else:
        resp = Response(pulse)
    resp['ETag'] = etag
    resp['Cache-Control'] = 'private, no-cache'
    return resp
