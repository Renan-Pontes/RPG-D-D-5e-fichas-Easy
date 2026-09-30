"""
Preparação do mestre — aventuras como mapa de nós (salas/cenas) e caminhos.

Só o mestre da campanha acessa (jogadores e estranhos recebem 403): a
preparação é segredo. Nada aqui altera fichas ou combate; o frontend usa as
APIs existentes (combate, inventário) sempre por clique do mestre.

GET    /api/campaigns/<c>/adventures                 lista (sem `data`)
POST   /api/campaigns/<c>/adventures                 { name, summary?, status?, data? }  (importar = POST com data)
GET    /api/campaigns/<c>/adventures/<pk>            completo (data + play)
PATCH  /api/campaigns/<c>/adventures/<pk>            { name?, summary?, status?, data? }
DELETE /api/campaigns/<c>/adventures/<pk>
POST   /api/campaigns/<c>/adventures/<pk>/play       { action: enter|visit|unvisit|unlock|lock|reset|log, nodeId?, edgeId?, log?, text? }
POST   /api/campaigns/<c>/adventures/<pk>/screen     { nodeId | null, text?: bool }  → cena no telão

Formato de `data` (tudo opcional exceto ids/nome):
  { version: 1,
    nodes: [{ id, name, kind, x, y, readAloud, notes, tags: [str], image: 'data:image/..',
              encounter: [{ monsterId, name, crNum, count, snapshot? }],
              hazards: [{ name, dc, effect, damage }],
              checks: [{ skill, dc, note }],
              treasure: { items: [instância de item], coins: {cp,sp,ep,gp,pp} } }],
    edges: [{ id, from, to|null, kind, label, condition, oneWay, toAdventureId? }] }
`play`: { current: nodeId|null, visited: [nodeId], unlocked: [edgeId] }
"""
import json
import numbers

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError

from .models import Adventure
from .permissions import get_campaign_or_404, require_dm
from .diary import log_diary

STATUSES = {'draft', 'playing', 'done'}
NODE_KINDS = {'room', 'social', 'exploration', 'rest', 'boss', 'combat', 'puzzle', 'trap', 'travel', 'other'}
EDGE_KINDS = {'door', 'locked', 'secret', 'path', 'stairs', 'adventure'}
COINS = ('cp', 'sp', 'ep', 'gp', 'pp')

MAX_ADVENTURES = 100
MAX_NODES = 200
MAX_EDGES = 600
MAX_DATA_BYTES = 2_000_000       # abaixo do DATA_UPLOAD_MAX_MEMORY_SIZE (2,5 MB)
MAX_IMAGE_CHARS = 450_000        # ~330 KB de JPEG em base64
MAX_ITEM_BYTES = 8000
MAX_SNAPSHOT_BYTES = 40_000
POS_LIMIT = 100_000


def _bad(code):
    raise ValidationError({'error': code})


def _text(value, limit):
    return value.strip()[:limit] if isinstance(value, str) else ''


def _long_text(value, limit):
    # texto do mestre: preserva quebras/indentação, só corta
    return value[:limit] if isinstance(value, str) else ''


def _num(value, lo, hi, default=None, integer=False):
    if isinstance(value, bool) or not isinstance(value, numbers.Number):
        if isinstance(value, str) and value.strip():
            try:
                value = float(value)
            except ValueError:
                return default
        else:
            return default
    if value != value:  # NaN
        return default
    value = max(lo, min(hi, value))
    return int(round(value)) if integer else value


def _id(value):
    s = _text(value if isinstance(value, str) else (str(value) if isinstance(value, int) else ''), 40)
    return s


def _list(value, limit, code):
    if value is None:
        return []
    if not isinstance(value, list):
        _bad(code)
    if len(value) > limit:
        _bad(code)
    return value


def _json_size(obj):
    return len(json.dumps(obj, ensure_ascii=False, separators=(',', ':')))


def _clean_encounter(raw):
    out = []
    for e in _list(raw, 30, 'invalid_encounter'):
        if not isinstance(e, dict):
            _bad('invalid_encounter')
        name = _text(e.get('name'), 120)
        monster_id = _text(e.get('monsterId'), 80)
        if not (name or monster_id):
            continue
        entry = {
            'monsterId': monster_id, 'name': name or monster_id,
            'count': _num(e.get('count'), 1, 50, 1, integer=True),
        }
        cr = _num(e.get('crNum'), 0, 30)
        if cr is not None:
            entry['crNum'] = cr
        snap = e.get('snapshot')
        if isinstance(snap, dict):
            if _json_size(snap) > MAX_SNAPSHOT_BYTES:
                _bad('monster_too_large')
            entry['snapshot'] = snap
        out.append(entry)
    return out


def _clean_hazards(raw):
    out = []
    for h in _list(raw, 20, 'invalid_hazards'):
        if not isinstance(h, dict):
            _bad('invalid_hazards')
        name = _text(h.get('name'), 120)
        if not name:
            continue
        out.append({
            'name': name, 'dc': _num(h.get('dc'), 1, 40, None, integer=True),
            'effect': _long_text(h.get('effect'), 1000), 'damage': _text(h.get('damage'), 60),
        })
    return out


def _clean_checks(raw):
    out = []
    for c in _list(raw, 20, 'invalid_checks'):
        if not isinstance(c, dict):
            _bad('invalid_checks')
        skill = _text(c.get('skill'), 40)
        if not skill:
            continue
        out.append({'skill': skill, 'dc': _num(c.get('dc'), 1, 40, None, integer=True),
                    'note': _text(c.get('note'), 300)})
    return out


def _clean_treasure(raw):
    if raw is None:
        return {'items': [], 'coins': {}}
    if not isinstance(raw, dict):
        _bad('invalid_treasure')
    items = []
    for it in _list(raw.get('items'), 40, 'invalid_treasure'):
        if not isinstance(it, dict) or not _text(it.get('name'), 120):
            _bad('invalid_treasure_item')
        if _json_size(it) > MAX_ITEM_BYTES:
            _bad('treasure_item_too_large')
        items.append(it)
    coins_raw = raw.get('coins') if isinstance(raw.get('coins'), dict) else {}
    coins = {k: _num(coins_raw.get(k), 0, 10_000_000, 0, integer=True) for k in COINS}
    return {'items': items, 'coins': {k: v for k, v in coins.items() if v}}


def _clean_node(n):
    if not isinstance(n, dict):
        _bad('invalid_node')
    node_id = _id(n.get('id'))
    if not node_id:
        _bad('invalid_node_id')
    image = n.get('image') or ''
    if image:
        if not isinstance(image, str) or not image.startswith('data:image/'):
            _bad('invalid_image')
        if len(image) > MAX_IMAGE_CHARS:
            _bad('image_too_large')
    tags = []
    for tg in _list(n.get('tags'), 20, 'invalid_tags'):
        tg = _text(tg, 30)
        if tg and tg not in tags:
            tags.append(tg)
    return {
        'id': node_id,
        'name': _text(n.get('name'), 120) or '?',
        'kind': n.get('kind') if n.get('kind') in NODE_KINDS else 'room',
        'x': _num(n.get('x'), -POS_LIMIT, POS_LIMIT, 0),
        'y': _num(n.get('y'), -POS_LIMIT, POS_LIMIT, 0),
        'readAloud': _long_text(n.get('readAloud'), 5000),
        'notes': _long_text(n.get('notes'), 10000),
        'tags': tags,
        'image': image,
        'encounter': _clean_encounter(n.get('encounter')),
        'hazards': _clean_hazards(n.get('hazards')),
        'checks': _clean_checks(n.get('checks')),
        'treasure': _clean_treasure(n.get('treasure')),
    }


def _clean_edge(e, node_ids):
    if not isinstance(e, dict):
        _bad('invalid_edge')
    edge_id = _id(e.get('id'))
    src = _id(e.get('from'))
    dst = _id(e.get('to')) or None
    kind = e.get('kind') if e.get('kind') in EDGE_KINDS else 'path'
    if not edge_id or src not in node_ids:
        _bad('invalid_edge')
    if dst is not None and dst not in node_ids:
        _bad('invalid_edge')
    if dst is None and kind != 'adventure':
        _bad('invalid_edge')
    if dst == src:
        _bad('invalid_edge')
    out = {
        'id': edge_id, 'from': src, 'to': dst, 'kind': kind,
        'label': _text(e.get('label'), 80), 'condition': _text(e.get('condition'), 200),
        'oneWay': bool(e.get('oneWay')),
    }
    if kind == 'adventure':
        target = e.get('toAdventureId')
        out['toAdventureId'] = target if isinstance(target, int) and not isinstance(target, bool) else None
        out['toAdventureName'] = _text(e.get('toAdventureName'), 120)
    return out


def clean_adventure_data(raw):
    """Valida e normaliza a estrutura da aventura (whitelist de campos)."""
    if raw is None:
        return {'version': 1, 'nodes': [], 'edges': []}
    if not isinstance(raw, dict):
        _bad('invalid_data')
    nodes = [_clean_node(n) for n in _list(raw.get('nodes'), MAX_NODES, 'too_many_nodes')]
    ids = [n['id'] for n in nodes]
    if len(set(ids)) != len(ids):
        _bad('duplicate_node_id')
    node_ids = set(ids)
    edges = [_clean_edge(e, node_ids) for e in _list(raw.get('edges'), MAX_EDGES, 'too_many_edges')]
    edge_ids = [e['id'] for e in edges]
    if len(set(edge_ids)) != len(edge_ids):
        _bad('duplicate_edge_id')
    data = {'version': 1, 'nodes': nodes, 'edges': edges}
    if _json_size(data) > MAX_DATA_BYTES:
        _bad('adventure_too_large')
    return data


def _clean_play(play, data):
    """Remove do estado de jogo referências a nós/arestas que não existem mais."""
    play = play if isinstance(play, dict) else {}
    node_ids = {n['id'] for n in data.get('nodes') or []}
    edge_ids = {e['id'] for e in data.get('edges') or []}
    current = play.get('current') if play.get('current') in node_ids else None
    return {
        'current': current,
        'visited': [v for v in play.get('visited') or [] if v in node_ids],
        'unlocked': [v for v in play.get('unlocked') or [] if v in edge_ids],
    }


def _summary(obj):
    data = obj.data or {}
    return {
        'id': obj.id, 'name': obj.name, 'summary': obj.summary, 'status': obj.status,
        'nodeCount': len(data.get('nodes') or []), 'edgeCount': len(data.get('edges') or []),
        'currentNodeId': (obj.play or {}).get('current'),
        'createdAt': obj.created_at.isoformat(), 'updatedAt': obj.updated_at.isoformat(),
    }


def _full(obj):
    return {**_summary(obj), 'data': obj.data or {'version': 1, 'nodes': [], 'edges': []},
            'play': _clean_play(obj.play, obj.data or {})}


def _apply_fields(obj, body):
    if 'name' in body:
        name = _text(body.get('name'), 120)
        if not name:
            _bad('missing_name')
        obj.name = name
    if 'summary' in body:
        obj.summary = _long_text(body.get('summary'), 4000)
    if 'status' in body:
        if body.get('status') not in STATUSES:
            _bad('invalid_status')
        obj.status = body['status']
    if 'data' in body:
        obj.data = clean_adventure_data(body.get('data'))
        obj.play = _clean_play(obj.play, obj.data)


def _get(campaign, pk):
    obj = campaign.adventures.filter(pk=pk).first()
    if not obj:
        raise NotFound('not_found')
    return obj


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def adventure_list(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    if request.method == 'GET':
        return Response({'adventures': [_summary(o) for o in campaign.adventures.all()]})
    if campaign.adventures.count() >= MAX_ADVENTURES:
        _bad('too_many_adventures')
    body = request.data if isinstance(request.data, dict) else {}
    if not _text(body.get('name'), 120):
        _bad('missing_name')
    obj = Adventure(campaign=campaign, data=clean_adventure_data(None))
    _apply_fields(obj, body)
    obj.save()
    return Response({'adventure': _full(obj)}, status=201)


@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def adventure_detail(request, id_or_slug, pk):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    obj = _get(campaign, pk)
    if request.method == 'GET':
        return Response({'adventure': _full(obj)})
    if request.method == 'DELETE':
        obj.delete()
        return Response({'ok': True})
    body = request.data if isinstance(request.data, dict) else {}
    _apply_fields(obj, body)
    obj.save()
    return Response({'adventure': _full(obj)})


def _node(obj, node_id):
    for n in (obj.data or {}).get('nodes') or []:
        if n.get('id') == node_id:
            return n
    _bad('invalid_node')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def adventure_play(request, id_or_slug, pk):
    """Estado na mesa. Só muda o que o mestre clicou; 'enter' registra no diário."""
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    obj = _get(campaign, pk)
    body = request.data if isinstance(request.data, dict) else {}
    action = body.get('action')
    play = _clean_play(obj.play, obj.data or {})
    node_id = _id(body.get('nodeId'))
    edge_id = _id(body.get('edgeId'))
    edge_ids = {e['id'] for e in (obj.data or {}).get('edges') or []}

    if action == 'enter':
        node = _node(obj, node_id)
        play['current'] = node_id
        if node_id not in play['visited']:
            play['visited'].append(node_id)
        if obj.status == 'draft':
            obj.status = 'playing'
        if body.get('log', True):
            log_diary(campaign, 'custom', f'O grupo entrou em {node["name"]}'[:200], '',
                      {'adventureId': obj.id, 'adventureName': obj.name, 'nodeId': node_id},
                      user=request.user, hidden=bool(body.get('hidden')))
    elif action == 'leave':
        play['current'] = None
    elif action in ('visit', 'unvisit'):
        _node(obj, node_id)
        if action == 'visit' and node_id not in play['visited']:
            play['visited'].append(node_id)
        if action == 'unvisit':
            play['visited'] = [v for v in play['visited'] if v != node_id]
            if play['current'] == node_id:
                play['current'] = None
    elif action in ('unlock', 'lock'):
        if edge_id not in edge_ids:
            _bad('invalid_edge')
        if action == 'unlock' and edge_id not in play['unlocked']:
            play['unlocked'].append(edge_id)
        if action == 'lock':
            play['unlocked'] = [v for v in play['unlocked'] if v != edge_id]
    elif action == 'reset':
        play = {'current': None, 'visited': [], 'unlocked': []}
    elif action == 'log':
        text = _text(body.get('text'), 200)
        if not text:
            _bad('missing_text')
        log_diary(campaign, 'custom', text, _long_text(body.get('body'), 2000),
                  {'adventureId': obj.id, 'adventureName': obj.name, 'nodeId': node_id or None},
                  user=request.user, hidden=bool(body.get('hidden')))
        return Response({'adventure': _full(obj)})
    else:
        _bad('invalid_action')
    obj.play = play
    obj.save(update_fields=['play', 'status', 'updated_at'])
    return Response({'adventure': _full(obj)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def adventure_screen(request, id_or_slug, pk):
    """Mostra (ou tira) a cena do nó no telão: nome em state.scene e, se pedido,
    o texto para ler em voz alta em state.sceneText. Merge no servidor para não
    sobrescrever o resto do estado da campanha."""
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    obj = _get(campaign, pk)
    body = request.data if isinstance(request.data, dict) else {}
    state = dict(campaign.state or {})
    node_id = _id(body.get('nodeId'))
    if node_id:
        node = _node(obj, node_id)
        state['scene'] = node['name']
        if body.get('text'):
            state['sceneText'] = (node.get('readAloud') or '')[:5000]
        else:
            state.pop('sceneText', None)
    else:
        state.pop('sceneText', None)
        if body.get('clearScene'):
            state['scene'] = ''
    campaign.state = state
    campaign.save(update_fields=['state', 'updated_at'])
    return Response({'state': state})
