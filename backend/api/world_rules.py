"""
Mundo da campanha — validação (whitelist) e filtro por papel. Funções puras.

Este módulo é a ÚNICA fonte do que o jogador pode ver de uma entrada do
Mundo. As views (views_world.py) só chamam `serialize_light` /
`serialize_full` com `for_dm=False` para jogadores; nada de `dm_notes`,
segredos não revelados, `data.statblock` ou entradas `hidden` sai daqui.

Visibilidade para o jogador:
  hidden   → nada (lista não traz; detalhe, imagem e pin = 404)
  partial  → kind, name, summary, imagem  ("conhecido de nome")
  revealed → + body, segredos revelados (só texto), dados públicos do tipo,
             links/parent/menções cujo alvo não está hidden, linha do tempo
  nunca    → dm_notes, segredos não revelados, data.statblock,
             data.campaignItemId, data.recipients, tags (são organização do
             mestre: "#vilão" estragaria a surpresa)

Erros de validação levantam WorldError(code); a view vira 400 {'error': code}.
"""
import hashlib
import json
import numbers
import re

KINDS = ('place', 'npc', 'faction', 'item', 'lore', 'handout')
VISIBILITIES = ('hidden', 'partial', 'revealed')
VIS_RANK = {'hidden': 0, 'partial': 1, 'revealed': 2}
RELS = ('ally', 'enemy', 'family', 'member', 'employer', 'owes', 'located_in', 'other')
PLACE_TYPES = ('region', 'city', 'village', 'dungeon', 'building', 'landmark')
HANDOUT_STYLES = ('scroll', 'letter', 'wanted', 'note')

MAX_ENTRIES = 2000
MAX_NAME = 120
MAX_SUMMARY = 280
MAX_BODY = 20_000
MAX_NOTES = 20_000
MAX_SECRETS = 20
MAX_SECRET_TEXT = 1000
MAX_TAGS = 12
MAX_TAG = 30
MAX_LINKS = 40
MAX_LINK_NOTE = 200
MAX_PINS = 100
MAX_WHEN_LABEL = 60
MAX_IMAGE_CHARS = 450_000
MAX_STATBLOCK_BYTES = 40_000
MAX_SESSION_PLAN_BYTES = 60_000
ORDER_LIMIT = 1_000_000_000

IMAGE_PREFIXES = ('data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,')
MENTION_RE = re.compile(r'@\[([^\]\n]{1,120})\]\((\d{1,10})\)')
COLOR_RE = re.compile(r'^#[0-9a-fA-F]{3,8}$')

# Campos de `data` por tipo: (nome, limpador, público?)
# público = o jogador vê quando a entrada está `revealed`.


class WorldError(ValueError):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def _bad(code):
    raise WorldError(code)


# ------------------------------------------------------------------ básicos
def text(value, limit):
    return value.strip()[:limit] if isinstance(value, str) else ''


def long_text(value, limit):
    """Texto longo do mestre: preserva quebras, só corta."""
    return value[:limit] if isinstance(value, str) else ''


def to_int(value, lo=-ORDER_LIMIT, hi=ORDER_LIMIT, default=None):
    if isinstance(value, bool):
        return default
    if isinstance(value, str) and value.strip():
        try:
            value = float(value)
        except ValueError:
            return default
    if not isinstance(value, numbers.Number) or value != value:
        return default
    return int(max(lo, min(hi, round(value))))


def to_unit(value, default=0.5):
    """Coordenada de pin: 0..1."""
    if isinstance(value, bool) or not isinstance(value, numbers.Number) or value != value:
        return default
    return round(max(0.0, min(1.0, float(value))), 5)


def json_size(obj):
    return len(json.dumps(obj, ensure_ascii=False, separators=(',', ':')))


def short_id(value, limit=24):
    if isinstance(value, int) and not isinstance(value, bool):
        value = str(value)
    if not isinstance(value, str):
        return ''
    return re.sub(r'[^A-Za-z0-9_-]', '', value)[:limit]


def image_version(data_url):
    return hashlib.sha1(data_url.encode('utf-8')).hexdigest()[:12]


def clean_image(value):
    """Data URL jpeg/png/webp em base64, até MAX_IMAGE_CHARS."""
    if not isinstance(value, str) or not value.startswith(IMAGE_PREFIXES):
        _bad('invalid_image')
    if len(value) > MAX_IMAGE_CHARS:
        _bad('image_too_large')
    payload = value.split(',', 1)[1]
    if not payload or not re.fullmatch(r'[A-Za-z0-9+/=\s]+', payload):
        _bad('invalid_image')
    return value


# ------------------------------------------------------------------ campos
def clean_kind(value):
    if value not in KINDS:
        _bad('invalid_kind')
    return value


def clean_visibility(value):
    if value not in VISIBILITIES:
        _bad('invalid_visibility')
    return value


def clean_name(value):
    name = text(value, MAX_NAME)
    if not name:
        _bad('missing_name')
    return name


def clean_tags(raw):
    if raw is None:
        return []
    if not isinstance(raw, list):
        _bad('invalid_tags')
    out = []
    for tg in raw:
        tg = text(tg, MAX_TAG)
        if tg and tg.lower() not in {t.lower() for t in out}:
            out.append(tg)
    if len(out) > MAX_TAGS:
        _bad('too_many_tags')
    return out


def clean_secrets(raw, old=None):
    """[{id, text, revealed, session?}] — preserva `session` de quem já estava
    revelado; ids novos são gerados (s1, s2…)."""
    if raw is None:
        return []
    if not isinstance(raw, list) or len(raw) > MAX_SECRETS:
        _bad('too_many_secrets' if isinstance(raw, list) else 'invalid_secrets')
    old_by_id = {s.get('id'): s for s in (old or []) if isinstance(s, dict)}
    out, used = [], set()
    for s in raw:
        if isinstance(s, str):
            s = {'text': s}
        if not isinstance(s, dict):
            _bad('invalid_secrets')
        body = long_text(s.get('text'), MAX_SECRET_TEXT).strip()
        if not body:
            continue
        sid = short_id(s.get('id'))
        if not sid or sid in used:
            sid = ''
        item = {'id': sid, 'text': body, 'revealed': bool(s.get('revealed'))}
        prev = old_by_id.get(sid) if sid else None
        if item['revealed'] and prev and prev.get('revealed'):
            if prev.get('session') is not None:
                item['session'] = prev['session']
            if prev.get('revealedAt'):
                item['revealedAt'] = prev['revealedAt']
        if sid:
            used.add(sid)
        out.append(item)
    n = 1
    for item in out:
        if not item['id']:
            while f's{n}' in used:
                n += 1
            item['id'] = f's{n}'
            used.add(item['id'])
    return out


def clean_links(raw, self_id=None):
    """[{to, rel, note}]. A existência do alvo é checada na view."""
    if raw is None:
        return []
    if not isinstance(raw, list) or len(raw) > MAX_LINKS:
        _bad('too_many_links' if isinstance(raw, list) else 'invalid_links')
    out, seen = [], set()
    for ln in raw:
        if not isinstance(ln, dict):
            _bad('invalid_links')
        to = to_int(ln.get('to'), 1, 10**10)
        if not to or to == self_id:
            continue
        rel = ln.get('rel') if ln.get('rel') in RELS else 'other'
        if (to, rel) in seen:
            continue
        seen.add((to, rel))
        out.append({'to': to, 'rel': rel, 'note': text(ln.get('note'), MAX_LINK_NOTE)})
    return out


def _clean_map(raw):
    if raw is None:
        return None
    if not isinstance(raw, dict):
        _bad('invalid_map')
    pins_raw = raw.get('pins') or []
    if not isinstance(pins_raw, list):
        _bad('invalid_map')
    if len(pins_raw) > MAX_PINS:
        _bad('too_many_pins')
    pins, used = [], set()
    for p in pins_raw:
        if not isinstance(p, dict):
            _bad('invalid_map')
        pid = short_id(p.get('id'))
        if not pid or pid in used:
            n = len(used) + 1
            while f'p{n}' in used:
                n += 1
            pid = f'p{n}'
        used.add(pid)
        pin = {'id': pid, 'entryId': to_int(p.get('entryId'), 1, 10**10),
               'x': to_unit(p.get('x')), 'y': to_unit(p.get('y')),
               'visible': bool(p.get('visible'))}
        label = text(p.get('label'), 60)
        if label:
            pin['label'] = label
        pins.append(pin)
    return {'pins': pins}


def _clean_statblock(raw):
    if raw is None:
        return None
    if not isinstance(raw, dict):
        _bad('invalid_statblock')
    if json_size(raw) > MAX_STATBLOCK_BYTES:
        _bad('statblock_too_large')
    return raw


def _enum(values):
    return lambda v: v if v in values else None


def _txt(limit):
    return lambda v: long_text(v, limit).strip() or None


def _color(v):
    return v if isinstance(v, str) and COLOR_RE.match(v) else None


def _bool(v):
    return bool(v) if v is not None else None


def _pos_int(v):
    return to_int(v, 1, 10**10)


def _recipients(v):
    if v == 'all' or v is None:
        return 'all'
    if not isinstance(v, list) or len(v) > 50:
        _bad('invalid_recipients')
    ids = []
    for x in v:
        i = to_int(x, 1, 10**10)
        if i and i not in ids:
            ids.append(i)
    return ids


# kind → {campo: (limpador, público)}
DATA_FIELDS = {
    'npc': {
        'role': (_txt(80), True), 'appearance': (_txt(600), True),
        'mannerism': (_txt(300), True), 'wants': (_txt(600), True),
        'statblock': (_clean_statblock, False),
    },
    'place': {'placeType': (_enum(PLACE_TYPES), True), 'map': (_clean_map, True)},
    'faction': {'goal': (_txt(600), True), 'symbolColor': (_color, True)},
    'item': {
        'rarity': (_txt(30), True), 'attunement': (_bool, True), 'effect': (_txt(2000), True),
        'campaignItemId': (_pos_int, False),
    },
    'lore': {},
    'handout': {'style': (_enum(HANDOUT_STYLES), True), 'recipients': (_recipients, False)},
}


def clean_data(kind, raw):
    """Whitelist dos campos por tipo. Campos desconhecidos são descartados."""
    if raw is None:
        raw = {}
    if not isinstance(raw, dict):
        _bad('invalid_data')
    out = {}
    for key, (fn, _public) in DATA_FIELDS.get(kind, {}).items():
        if key in raw:
            val = fn(raw.get(key))
            if val is not None:
                out[key] = val
    return out


def is_map(entry_kind, data):
    return entry_kind == 'place' and isinstance((data or {}).get('map'), dict)


def map_pin_targets(data):
    m = (data or {}).get('map')
    if not isinstance(m, dict):
        return []
    return [p['entryId'] for p in m.get('pins') or [] if isinstance(p, dict) and p.get('entryId')]


def mentions(body):
    out = []
    for m in MENTION_RE.finditer(body or ''):
        i = int(m.group(2))
        if i not in out:
            out.append(i)
    return out


def strip_mentions(body, allowed_ids):
    """Para o jogador: @[Nome](id) de alvo oculto/inexistente vira só `Nome`."""
    def repl(m):
        return m.group(0) if int(m.group(2)) in allowed_ids else m.group(1)
    return MENTION_RE.sub(repl, body or '')


# Campos do corpo da requisição → atributos do modelo.
FIELD_ALIASES = {
    'dmNotes': 'dm_notes', 'parentId': 'parent_id', 'whenLabel': 'when_label',
    'whenOrder': 'when_order',
}


def clean_entry_fields(body, kind, old_secrets=None, self_id=None):
    """Valida os campos presentes em `body` e devolve {atributo: valor} para o
    modelo. `kind` é o tipo final da entrada (já validado). Não toca no banco:
    parent/links/pins ainda precisam ser conferidos contra a campanha."""
    if not isinstance(body, dict):
        _bad('invalid_body')
    b = dict(body)
    for alias, attr in FIELD_ALIASES.items():
        if alias in b and attr not in b:
            b[attr] = b[alias]
    out = {}
    if 'name' in b:
        out['name'] = clean_name(b['name'])
    if 'summary' in b:
        out['summary'] = text(b['summary'], MAX_SUMMARY)
    if 'body' in b:
        if isinstance(b['body'], str) and len(b['body']) > MAX_BODY:
            _bad('body_too_long')
        out['body'] = long_text(b['body'], MAX_BODY)
    if 'dm_notes' in b:
        if isinstance(b['dm_notes'], str) and len(b['dm_notes']) > MAX_NOTES:
            _bad('notes_too_long')
        out['dm_notes'] = long_text(b['dm_notes'], MAX_NOTES)
    if 'secrets' in b:
        out['secrets'] = clean_secrets(b['secrets'], old_secrets)
    if 'visibility' in b:
        out['visibility'] = clean_visibility(b['visibility'])
    if 'tags' in b:
        out['tags'] = clean_tags(b['tags'])
    if 'links' in b:
        out['links'] = clean_links(b['links'], self_id)
    if 'data' in b:
        out['data'] = clean_data(kind, b['data'])
    if 'when_label' in b:
        out['when_label'] = text(b['when_label'], MAX_WHEN_LABEL)
    if 'when_order' in b:
        out['when_order'] = to_int(b['when_order'])
    if 'sort' in b:
        out['sort'] = to_int(b['sort'], default=0)
    if 'parent_id' in b:
        pid = b['parent_id']
        out['parent_id'] = to_int(pid, 1, 10**10) if pid not in (None, '', 0) else None
        if out['parent_id'] and out['parent_id'] == self_id:
            _bad('invalid_parent')
    return out


# ------------------------------------------------------------------ leitura
def player_can_see(entry, membership_id=None):
    """Entrada visível ao jogador? (hidden nunca; handout só p/ destinatários)."""
    if entry.visibility == 'hidden':
        return False
    if entry.kind == 'handout':
        rec = (entry.data or {}).get('recipients', 'all')
        if isinstance(rec, list) and membership_id not in rec:
            return False
    return True


def _iso(dt):
    return dt.isoformat() if dt else None


def _image_url(entry):
    return f'/api/world/{entry.id}/image?v={entry.image_ver}' if entry.image_ver else None


def _public_pins(data, visible_ids):
    m = (data or {}).get('map')
    if not isinstance(m, dict):
        return None
    pins = []
    for p in m.get('pins') or []:
        if not isinstance(p, dict) or not p.get('visible'):
            continue
        target = p.get('entryId')
        if target and target not in visible_ids:
            continue
        pin = {'id': p.get('id'), 'entryId': target, 'x': p.get('x'), 'y': p.get('y'), 'visible': True}
        if p.get('label'):
            pin['label'] = p['label']
        pins.append(pin)
    return {'pins': pins}


def public_data(entry, visible_ids):
    """`data` que o jogador pode ver (sem statblock/recipients/campaignItemId)."""
    raw = entry.data or {}
    out = {}
    revealed = entry.visibility == 'revealed'
    for key, (_fn, public) in DATA_FIELDS.get(entry.kind, {}).items():
        if not public or key not in raw:
            continue
        if key == 'map':
            pins = _public_pins(raw, visible_ids)
            if pins is not None:
                out['map'] = pins
        elif revealed:
            out[key] = raw[key]
    return out


def revealed_secrets(entry):
    return [{'id': s.get('id'), 'text': s.get('text', ''), 'session': s.get('session')}
            for s in (entry.secrets or []) if isinstance(s, dict) and s.get('revealed')]


# Subconjunto de `data` que vai na lista leve (rótulo do cartão). Todos são
# campos públicos; o jogador só recebe quando a entrada está `revealed`.
LIGHT_DATA_KEYS = {'npc': ('role',), 'place': ('placeType',), 'item': ('rarity',), 'handout': ('style',)}


def light_data(entry, for_dm):
    raw = entry.data or {}
    if not for_dm and entry.visibility != 'revealed':
        return {}
    return {k: raw[k] for k in LIGHT_DATA_KEYS.get(entry.kind, ()) if raw.get(k) not in (None, '')}


def serialize_light(entry, for_dm, visible_ids=None):
    """WorldEntryLight. `visible_ids` = ids não-hidden que o jogador pode ver
    (obrigatório quando for_dm=False)."""
    base = {
        'id': entry.id, 'kind': entry.kind, 'name': entry.name, 'summary': entry.summary,
        'tags': list(entry.tags or []) if for_dm else [], 'visibility': entry.visibility,
        'imageVer': entry.image_ver or '', 'imageUrl': _image_url(entry),
        'isMap': is_map(entry.kind, entry.data),
        'revealedAt': _iso(entry.revealed_at), 'updatedAt': _iso(entry.updated_at),
    }
    ldata = light_data(entry, for_dm)
    if ldata:  # só quando há rótulo (o front lê `entry.data?.role` etc.)
        base['data'] = ldata
    if for_dm:
        base.update({
            'parentId': entry.parent_id, 'whenLabel': entry.when_label, 'whenOrder': entry.when_order,
            'links': list(entry.links or []), 'mentions': mentions(entry.body),
            'secretsCount': len(entry.secrets or []),
            'secretsRevealed': sum(1 for s in entry.secrets or [] if isinstance(s, dict) and s.get('revealed')),
            'sort': entry.sort, 'version': entry.version,
            'pinTargets': map_pin_targets(entry.data),
        })
        return base
    visible_ids = visible_ids or set()
    revealed = entry.visibility == 'revealed'
    base.update({
        'parentId': entry.parent_id if revealed and entry.parent_id in visible_ids else None,
        'whenLabel': entry.when_label if revealed else '',
        'whenOrder': entry.when_order if revealed else None,
        'links': [ln for ln in entry.links or [] if ln.get('to') in visible_ids] if revealed else [],
        'mentions': [i for i in mentions(entry.body) if i in visible_ids] if revealed else [],
        'secretsCount': len(revealed_secrets(entry)) if revealed else 0,
        'sort': entry.sort,
    })
    return base


def serialize_full(entry, for_dm, visible_ids=None):
    """WorldEntryFull: completo para o mestre, filtrado para o jogador."""
    out = serialize_light(entry, for_dm, visible_ids)
    if for_dm:
        out.update({
            'body': entry.body, 'dmNotes': entry.dm_notes,
            'secrets': [dict(s) for s in entry.secrets or []],
            'data': dict(entry.data or {}),
            'createdAt': _iso(entry.created_at),
        })
        return out
    visible_ids = visible_ids or set()
    revealed = entry.visibility == 'revealed'
    out.update({
        'body': strip_mentions(entry.body, visible_ids) if revealed else '',
        'secrets': revealed_secrets(entry) if revealed else [],
        'data': public_data(entry, visible_ids),
    })
    return out


# ------------------------------------------------------------------ plano da sessão
def _ref_entry(v):
    if not isinstance(v, dict):
        return None
    eid = to_int(v.get('entryId'), 1, 10**10)
    if not eid:
        return None
    return {'entryId': eid, 'secretId': short_id(v.get('secretId')) or None}


def _ref_node(v):
    if not isinstance(v, dict):
        return None
    aid = to_int(v.get('adventureId'), 1, 10**10)
    nid = short_id(v.get('nodeId'), 40)
    if not aid or not nid:
        return None
    return {'adventureId': aid, 'nodeId': nid}


def _id_list(raw, limit):
    if not isinstance(raw, list):
        return []
    out = []
    for x in raw[:limit]:
        i = to_int(x, 1, 10**10)
        if i and i not in out:
            out.append(i)
    return out


def _items(raw, limit, prefix, make):
    if not isinstance(raw, list):
        _bad('invalid_session_plan')
    if len(raw) > limit:
        _bad('session_plan_too_large')
    out, used = [], set()
    for i, it in enumerate(raw):
        if not isinstance(it, dict):
            continue
        sid = short_id(it.get('id')) or f'{prefix}{i + 1}'
        while sid in used:
            sid = f'{sid}x'
        used.add(sid)
        out.append({'id': sid, **make(it)})
    return out


SESSION_PLAN_DEFAULT = {'strongStart': '', 'scenes': [], 'secrets': [], 'npcIds': [],
                        'placeIds': [], 'monsters': '', 'rewards': ''}


def clean_session_plan_patch(raw):
    """Valida as chaves presentes (merge por chave no servidor)."""
    if not isinstance(raw, dict):
        _bad('invalid_session_plan')
    out = {}
    if 'strongStart' in raw:
        out['strongStart'] = long_text(raw['strongStart'], 4000)
    if 'scenes' in raw:
        out['scenes'] = _items(raw['scenes'], 30, 'c', lambda it: {
            'text': long_text(it.get('text'), 1000), 'nodeRef': _ref_node(it.get('nodeRef')),
            'done': bool(it.get('done'))})
    if 'secrets' in raw:
        out['secrets'] = _items(raw['secrets'], 30, 'p', lambda it: {
            'text': long_text(it.get('text'), 1000), 'ref': _ref_entry(it.get('ref')),
            'discovered': bool(it.get('discovered'))})
    if 'npcIds' in raw:
        out['npcIds'] = _id_list(raw['npcIds'], 60)
    if 'placeIds' in raw:
        out['placeIds'] = _id_list(raw['placeIds'], 60)
    if 'monsters' in raw:
        out['monsters'] = long_text(raw['monsters'], 4000)
    if 'rewards' in raw:
        out['rewards'] = long_text(raw['rewards'], 4000)
    return out


def merged_session_plan(current, patch):
    plan = dict(SESSION_PLAN_DEFAULT)
    if isinstance(current, dict):
        plan.update({k: v for k, v in current.items() if k in SESSION_PLAN_DEFAULT})
    plan.update(patch)
    if json_size(plan) > MAX_SESSION_PLAN_BYTES:
        _bad('session_plan_too_large')
    return plan


# ------------------------------------------------------------------ ecos da mesa
# Reações de personagem a cartões revelados/parciais (imersão, não placar): o
# jogador vê só as próprias marcas e contagens agregadas SEM nomes; o mestre vê
# quem sussurrou o quê, contado em linguagem de cronista (echo_lines).
REACTION_KINDS = ('shiver', 'love', 'doubt', 'fight')   # 😱 ❤️ 🤔 ⚔️
FAVORITE_KIND = 'star'                                  # ⭐ "quero voltar aqui"
ECHO_KINDS = REACTION_KINDS + (FAVORITE_KIND,)
REACTION_ALIASES = {
    '😱': 'shiver', 'chill': 'shiver', 'fear': 'shiver',
    '❤️': 'love', '❤': 'love', 'heart': 'love', 'affection': 'love',
    '🤔': 'doubt', 'suspicion': 'doubt', 'distrust': 'doubt', 'wary': 'doubt',
    '⚔️': 'fight', '⚔': 'fight', 'challenge': 'fight',
    '⭐': 'star', 'favorite': 'star', 'fav': 'star', 'return': 'star',
}
VIEW_THROTTLE_SECONDS = 60          # 1 leitura contada por minuto por cartão e jogador
MAX_ECHO_LINES = 12


def clean_reaction_kind(value):
    if isinstance(value, str):
        v = value.strip()
        v = REACTION_ALIASES.get(v, REACTION_ALIASES.get(v.lower(), v.lower()))
        if v in ECHO_KINDS:
            return v
    _bad('invalid_reaction')


def player_can_react(entry, membership_id):
    """Só cartões que o jogador enxerga (revelado ou conhecido de nome)."""
    return player_can_see(entry, membership_id) and entry.visibility in ('partial', 'revealed')


def view_counts(last_at, now):
    """A leitura conta? (throttle: uma por VIEW_THROTTLE_SECONDS)."""
    return last_at is None or (now - last_at).total_seconds() >= VIEW_THROTTLE_SECONDS


def immersion_on(campaign):
    """dm_settings.immersion ("Mundo vivo"), padrão ligado."""
    s = campaign.dm_settings if isinstance(campaign.dm_settings, dict) else {}
    return s.get('immersion') is not False


_TIMES = {
    'pt': {2: 'duas vezes', 3: 'três vezes', 4: 'quatro vezes', 5: 'cinco vezes', 6: 'seis vezes',
           7: 'sete vezes', 8: 'oito vezes', 9: 'nove vezes', 10: 'dez vezes'},
    'en': {2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times', 6: 'six times',
           7: 'seven times', 8: 'eight times', 9: 'nine times', 10: 'ten times'},
}
_MANY_TIMES = {'pt': 'muitas vezes', 'en': 'again and again'}

# (singular, plural) — {who} = nome(s), {name} = cartão
_ECHO_PHRASES = {
    'pt': {
        'shiver': ('{name} arrepiou {who}', '{name} arrepiou {who}'),
        'love': ('{who} se afeiçoou a {name}', '{who} se afeiçoaram a {name}'),
        'doubt': ('{who} desconfia de {name}', '{who} desconfiam de {name}'),
        'fight': ('{who} quer enfrentar {name}', '{who} querem enfrentar {name}'),
        'star': ('{who} quer voltar a {name}', '{who} querem voltar a {name}'),
        'read': '{who} voltou {times} a pensar em {name}',
        'read_place': '{who} voltou {times} a {name}',
        'read_map': '{who} voltou {times} ao mapa de {name}',
        'and': ' e ',
    },
    'en': {
        'shiver': ('{name} sent a shiver through {who}', '{name} sent a shiver through {who}'),
        'love': ('{who} grew fond of {name}', '{who} grew fond of {name}'),
        'doubt': ('{who} does not trust {name}', '{who} do not trust {name}'),
        'fight': ('{who} wants to face {name}', '{who} want to face {name}'),
        'star': ('{who} wants to return to {name}', '{who} want to return to {name}'),
        'read': '{who} thought back on {name} {times}',
        'read_place': '{who} returned to {name} {times}',
        'read_map': '{who} returned to the map of {name} {times}',
        'and': ' and ',
    },
}


def _join_names(names, lang):
    names = [n for n in names if n]
    if len(names) <= 1:
        return names[0] if names else ''
    return ', '.join(names[:-1]) + _ECHO_PHRASES[lang]['and'] + names[-1]


def _times(n, lang):
    return _TIMES[lang].get(n) or _MANY_TIMES[lang]


def echo_lines(entries, lang='pt', limit=MAX_ECHO_LINES):
    """Frases de cronista a partir dos ecos por cartão.

    `entries`: [{entryId, name, kind, isMap, lastAt, people: [{name, kinds, views}]}]
    (ordem = mais recente primeiro). Leituras só viram frase a partir de 2.
    Devolve [{entryId, kind, text}] — nunca números frios nem placar."""
    lang = 'en' if lang == 'en' else 'pt'
    P = _ECHO_PHRASES[lang]
    out = []
    for e in entries:
        name = e.get('name') or ''
        people = e.get('people') or []
        for kind in ECHO_KINDS:
            who = [p['name'] for p in people if kind in (p.get('kinds') or [])]
            if who:
                sing, plur = P[kind]
                tpl = plur if len(who) > 1 else sing
                out.append({'entryId': e.get('entryId'), 'kind': kind,
                            'text': tpl.format(who=_join_names(who, lang), name=name)})
        for p in sorted(people, key=lambda p: -(p.get('views') or 0)):
            n = p.get('views') or 0
            if n >= 2:
                tpl = P['read_map'] if e.get('isMap') else P['read_place'] if e.get('kind') == 'place' else P['read']
                out.append({'entryId': e.get('entryId'), 'kind': 'read',
                            'text': tpl.format(who=p['name'], name=name, times=_times(n, lang))})
    return out[:limit]


def known_share_phrase(revealed, partial, total, lang='pt'):
    """Indicador narrativo do mestre: quanto do mundo a mesa já conhece (frase,
    nunca porcentagem). Parcial conta meio."""
    lang = 'en' if lang == 'en' else 'pt'
    if total <= 0:
        return ''
    share = (revealed + 0.5 * partial) / total
    steps = [
        (0.0, 'Seus jogadores ainda não conhecem nada do seu mundo',
              'Your players know nothing of your world yet'),
        (0.15, 'Seus jogadores mal arranharam a superfície do seu mundo',
               'Your players have barely scratched the surface of your world'),
        (0.29, 'Seus jogadores já conhecem cerca de um quarto do seu mundo',
               'Your players already know about a quarter of your world'),
        (0.42, 'Seus jogadores já conhecem cerca de um terço do seu mundo',
               'Your players already know about a third of your world'),
        (0.62, 'Seus jogadores já conhecem cerca de metade do seu mundo',
               'Your players already know about half of your world'),
        (0.88, 'Seus jogadores já conhecem boa parte do seu mundo',
               'Your players already know most of your world'),
        (1.01, 'Seus jogadores conhecem quase todo o seu mundo — ainda há sombras?',
               'Your players know nearly all of your world — any shadows left?'),
    ]
    if share == 0:
        return steps[0][1 if lang == 'pt' else 2]
    for limit, pt, en in steps[1:]:
        if share < limit:
            return pt if lang == 'pt' else en
    return steps[-1][1 if lang == 'pt' else 2]


def fog_hint(hidden_count):
    """Quantidade APROXIMADA do desconhecido (só se o mestre permitir)."""
    if hidden_count <= 0:
        return 'none'
    if hidden_count <= 3:
        return 'few'
    if hidden_count <= 12:
        return 'some'
    return 'many'
