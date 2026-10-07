"""
Aventuras prontas da Forja — pacotes originais (mundo + aventura) para o
mestre iniciante seguir.

Cada pacote (um módulo neste diretório) descreve, nas duas línguas:
  - metadados da galeria (nome, frase, níveis, arte, pitch sem spoiler);
  - sinopse para o mestre, gancho para ler aos jogadores, começo forte e
    dicas de condução ("se os jogadores fizerem X…");
  - cartões do Mundo (lugares, NPCs, facções, lendas, documentos, item);
  - salas/cenas do grafo da Preparação (texto para ler em voz alta, testes
    com CD, armadilhas, encontros com ids reais do bestiário do app,
    tesouro com itens do catálogo do app) e os caminhos entre elas;
  - pistas (segredos & pistas do plano da sessão).

`import_ready_adventure(campaign, pack_id, lang)` cria tudo na campanha:
cartões OCULTOS (o mestre revela quando quiser), aventura em Rascunho e,
se o plano da próxima sessão estiver vazio, preenche o plano com o começo
forte, as cenas e as pistas. Tudo passa pelas mesmas validações das APIs
(world_rules.clean_entry_fields e views_adventures.clean_adventure_data).

Texto 100% original da Forja de Heróis (nenhum trecho de livro publicado).
Estatísticas de monstros e itens vêm do SRD 5.2.1 já presente no app.
"""
import json
import os
import re
import secrets as _secrets

from django.utils import timezone

from .. import world_rules as R
from ..models import Adventure, Campaign, WorldEntry

HERE = os.path.dirname(os.path.abspath(__file__))


class Tr:
    """Texto nas duas línguas."""
    __slots__ = ('pt', 'en')

    def __init__(self, pt, en):
        self.pt, self.en = pt, en


def T(pt, en):
    return Tr(pt, en)


def loc(value, lang):
    """Resolve recursivamente os Tr para a língua pedida."""
    if isinstance(value, Tr):
        return loc(value.en if lang == 'en' else value.pt, lang)
    if isinstance(value, dict):
        return {k: loc(v, lang) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [loc(v, lang) for v in value]
    return value


# Monstros usados pelas aventuras: id do bestiário (frontend/data/bestiary.js,
# SRD 5.2.1) → (nome pt, nome en, ND). O teste confere que o id existe.
MONSTERS = {
    'kobold-warrior': ('Kobold Guerreiro', 'Kobold Warrior', 0.125),
    'giant-rat': ('Rato Gigante', 'Giant Rat', 0.125),
    'swarm-of-rats': ('Enxame de Ratos', 'Swarm of Rats', 0.25),
    'giant-frog': ('Sapo Gigante', 'Giant Frog', 0.25),
    'imp': ('Diabrete', 'Imp', 1),
    'wolf': ('Lobo', 'Wolf', 0.25),
    'satyr': ('Sátiro', 'Satyr', 0.5),
    'giant-spider': ('Aranha Gigante', 'Giant Spider', 1),
    'ettercap': ('Ettercap', 'Ettercap', 2),
    'will-o-wisp': ('Fogo-Fátuo', "Will-o'-Wisp", 2),
    'sprite': ('Sprite', 'Sprite', 0.25),
    'green-hag': ('Bruxa Verde', 'Green Hag', 3),
    'awakened-shrub': ('Arbusto Desperto', 'Awakened Shrub', 0),
    'sahuagin-warrior': ('Sahuagin Guerreiro', 'Sahuagin Warrior', 0.5),
    'merrow': ('Merrow', 'Merrow', 2),
    'reef-shark': ('Tubarão de Recife', 'Reef Shark', 0.5),
    'tough': ('Capanga', 'Tough', 0.5),
    'spy': ('Espião', 'Spy', 1),
    'pirate': ('Pirata', 'Pirate', 1),
    'bandit': ('Bandido', 'Bandit', 0.125),
    'bandit-captain': ('Capitão Bandido', 'Bandit Captain', 2),
    'giant-crab': ('Caranguejo Gigante', 'Giant Crab', 0.125),
    'doppelganger': ('Doppelganger', 'Doppelganger', 3),
}

_ITEMS = None
MAP_SCALE = 0.8  # salas mais juntas no mapa da Preparação (cartão tem 184 px)
START_TAG = {'pt': 'início', 'en': 'start'}  # sala de entrada (prep-graph.startNode)


def item_snapshots():
    """Instâncias de item (geradas do catálogo frontend/data/items.js) por sourceId."""
    global _ITEMS
    if _ITEMS is None:
        with open(os.path.join(HERE, 'items.json'), encoding='utf-8') as f:
            _ITEMS = json.load(f)
    return _ITEMS


def _packs():
    from . import lanterna_moinho, cha_madrinha, mare_cinzas
    return [lanterna_moinho.PACK, cha_madrinha.PACK, mare_cinzas.PACK]


def get_pack(pack_id):
    return next((p for p in _packs() if p['id'] == pack_id), None)


def pack_ids():
    return [p['id'] for p in _packs()]


def catalog(lang='pt'):
    """Metadados da galeria (sem spoilers: nada de sinopse do mestre)."""
    out = []
    for p in _packs():
        out.append({
            'id': p['id'], 'name': loc(p['name'], lang), 'tagline': loc(p['tagline'], lang),
            'pitch': loc(p['pitch'], lang), 'levels': p['levels'], 'sessions': p['sessions'],
            'art': p['art'], 'artFallback': p.get('artFallback', ''), 'theme': loc(p['theme'], lang),
            'scenes': len(p['nodes']), 'cards': len(p['entries']),
        })
    return out


# ------------------------------------------------------------------ texto
TOKEN_RE = re.compile(r'\{@([a-z0-9_]+)\}')
# Palavra anterior (opcional) + token: para não escrever "da A Guilda" / "the The Mill".
_CTX_RE = re.compile(r'(?:(\b\w+)(\s+))?\{@([a-z0-9_]+)\}')
_NAME_ART = {'pt': re.compile(r'^(O|A|Os|As)\s+(.+)$', re.S), 'en': re.compile(r'^(The|A|An)\s+(.+)$', re.S)}
_SKIP = {'pt': {'o', 'a', 'os', 'as', 'à', 'às', 'ao', 'aos', 'da', 'do', 'das', 'dos', 'na', 'no', 'nas', 'nos',
                'pela', 'pelo', 'pelas', 'pelos'},
         'en': {'the'}}
_MERGE_PT = {'de': {'o': 'do', 'a': 'da', 'os': 'dos', 'as': 'das'},
             'em': {'o': 'no', 'a': 'na', 'os': 'nos', 'as': 'nas'},
             'por': {'o': 'pelo', 'a': 'pela', 'os': 'pelos', 'as': 'pelas'}}


def _render(text, ids, names, mention, lang='pt'):
    """`{@chave}` → @[Nome](id) (corpo dos cartões) ou só o Nome (resto).
    Se o nome começa com artigo e a palavra anterior já é artigo/contração,
    o artigo do nome cai ("da {@guilda}" → "da Guilda do Sal"; "de" + "A …" → "da …")."""
    lang = 'en' if lang == 'en' else 'pt'

    def repl(m):
        prev, space, key = m.group(1), m.group(2) or '', m.group(3)
        if key not in ids:
            raise KeyError(f'token desconhecido: {key}')
        label = names[key]
        art = _NAME_ART[lang].match(label)
        if prev and art:
            low = prev.lower()
            if low in _SKIP[lang]:
                label = art.group(2)
            elif lang == 'pt' and low in _MERGE_PT:
                merged = _MERGE_PT[low][art.group(1).lower()]
                prev = merged[0].upper() + merged[1:] if prev[0].isupper() else merged
                label = art.group(2)
        out = f'@[{label}]({ids[key]})' if mention else label
        return f'{prev}{space}{out}' if prev else out
    return _CTX_RE.sub(repl, text or '')


def _new_item_id():
    return f'item-ready-{_secrets.token_hex(5)}'


def _treasure(raw, lang):
    snaps = item_snapshots()
    items = []
    for source_id, qty in raw.get('items', []):
        snap = dict(snaps[source_id]['en' if lang == 'en' else 'pt'])
        snap['id'] = _new_item_id()
        snap['qty'] = qty
        items.append(snap)
    return {'items': items, 'coins': dict(raw.get('coins', {}))}


def _coins_text(coins, lang):
    names = {'pp': ('pl', 'pp'), 'gp': ('po', 'gp'), 'ep': ('pe', 'ep'), 'sp': ('pp', 'sp'), 'cp': ('pc', 'cp')}
    parts = [f'{v} {names[k][1 if lang == "en" else 0]}' for k, v in coins.items() if v]
    return ', '.join(parts)


# ------------------------------------------------------------------ importar
class ReadyError(Exception):
    def __init__(self, code, status=400, extra=None):
        super().__init__(code)
        self.code, self.status, self.extra = code, status, extra or {}


def imported_adventure_id(campaign, pack_id):
    """Id da aventura importada deste pacote, se ainda existir na campanha."""
    rec = ((campaign.dm_settings or {}).get('readyAdventures') or {}).get(pack_id)
    aid = rec.get('adventureId') if isinstance(rec, dict) else None
    if aid and Adventure.objects.filter(campaign=campaign, pk=aid).exists():
        return aid
    return None


def _plan_is_empty(plan):
    plan = plan if isinstance(plan, dict) else {}
    return not (str(plan.get('strongStart') or '').strip() or plan.get('scenes') or plan.get('secrets'))


def import_ready_adventure(campaign, pack_id, lang='pt'):
    """Cria cartões + aventura. Chamar dentro de transaction.atomic().
    Levanta ReadyError (400 unknown_adventure / world_full / too_many_adventures;
    409 already_imported)."""
    from ..views_adventures import MAX_ADVENTURES, clean_adventure_data

    lang = 'en' if lang == 'en' else 'pt'
    pack = get_pack(pack_id)
    if not pack:
        raise ReadyError('unknown_adventure')
    campaign = Campaign.objects.select_for_update().get(pk=campaign.pk)
    existing = imported_adventure_id(campaign, pack_id)
    if existing:
        raise ReadyError('already_imported', 409, {'adventureId': existing})
    if WorldEntry.objects.filter(campaign=campaign).count() + len(pack['entries']) > R.MAX_ENTRIES:
        raise ReadyError('world_full')
    if campaign.adventures.count() >= MAX_ADVENTURES:
        raise ReadyError('too_many_adventures')

    P = loc({k: v for k, v in pack.items() if k not in ('entries', 'nodes', 'edges', 'clues')}, lang)
    entries = [loc(e, lang) for e in pack['entries']]
    nodes_raw = [loc(n, lang) for n in pack['nodes']]
    edges_raw = [loc(e, lang) for e in pack['edges']]
    clues = [loc(c, lang) for c in pack['clues']]

    # 1) cartões (sem corpo/links ainda: precisam dos ids de todos)
    base_sort = (WorldEntry.objects.filter(campaign=campaign).order_by('-sort')
                 .values_list('sort', flat=True).first() or 0) + 1
    by_key, names = {}, {}
    for i, e in enumerate(entries):
        fields = R.clean_entry_fields({
            'name': e['name'], 'summary': e.get('summary', ''), 'visibility': 'hidden',
            'tags': e.get('tags', []), 'data': e.get('data', {}),
            'when_label': e.get('when', ''), 'when_order': e.get('whenOrder'),
        }, e['kind'])
        obj = WorldEntry.objects.create(campaign=campaign, kind=e['kind'], sort=base_sort + i, **fields)
        by_key[e['key']] = obj
        names[e['key']] = obj.name
    ids = {k: o.id for k, o in by_key.items()}

    # 2) corpo, notas, segredos, ligações e pai
    for e in entries:
        obj = by_key[e['key']]
        fields = R.clean_entry_fields({
            'body': _render(e.get('body', ''), ids, names, True, lang),
            'dm_notes': _render(e.get('dmNotes', ''), ids, names, False, lang),
            'secrets': [_render(s, ids, names, False, lang) for s in e.get('secrets', [])],
            'links': [{'to': ids[to], 'rel': rel, 'note': ''} for to, rel in e.get('links', [])],
        }, e['kind'], self_id=obj.id)
        for attr, val in fields.items():
            setattr(obj, attr, val)
        if e.get('parent'):
            obj.parent_id = ids[e['parent']]
        obj.save()

    # 3) aventura
    nodes = []
    for n in nodes_raw:
        nodes.append({
            'id': n['id'], 'name': n['name'], 'kind': n['kind'],
            'x': round(n['x'] * MAP_SCALE), 'y': round(n['y'] * MAP_SCALE),
            'readAloud': _render(n.get('readAloud', ''), ids, names, False, lang),
            'notes': _render(n.get('notes', ''), ids, names, False, lang),
            'tags': n.get('tags') or ([START_TAG[lang]] if n['id'] == pack['nodes'][0]['id'] else []), 'image': '',
            'encounter': [{'monsterId': mid, 'name': MONSTERS[mid][1 if lang == 'en' else 0],
                           'crNum': MONSTERS[mid][2], 'count': count}
                          for mid, count in n.get('encounter', [])],
            'hazards': [{'name': h['name'], 'dc': h.get('dc'), 'effect': _render(h.get('effect', ''), ids, names, False, lang),
                         'damage': h.get('damage', '')} for h in n.get('hazards', [])],
            'checks': [{'skill': skill, 'dc': dc, 'note': _render(note, ids, names, False, lang)}
                       for skill, dc, note in n.get('checks', [])],
            'treasure': _treasure(n.get('treasure', {}), lang),
            'refs': [ids[k] for k in n.get('refs', [])],
        })
    edges = [{'id': eid, 'from': a, 'to': b, 'kind': kind, 'label': label, 'condition': cond, 'oneWay': False}
             for eid, a, b, kind, label, cond in edges_raw]
    data = clean_adventure_data({'version': 1, 'nodes': nodes, 'edges': edges})

    tips = '\n'.join(f'• {_render(x, ids, names, False, lang)}' for x in P['tips'])
    labels = {'pt': ('SINOPSE (só o mestre)', 'GANCHO (ler para os jogadores)', 'COMO CONDUZIR', 'Níveis'),
              'en': ('SYNOPSIS (GM only)', 'HOOK (read to the players)', 'RUNNING IT', 'Levels')}[lang]
    summary = (f"{P['tagline']} — {labels[3]} {pack['levels']}.\n\n"
               f"{labels[0]}\n{_render(P['synopsis'], ids, names, False, lang)}\n\n"
               f"{labels[1]}\n{P['hook']}\n\n{labels[2]}\n{tips}")[:4000]
    adventure = Adventure.objects.create(
        campaign=campaign, name=P['name'], summary=summary, status='draft',
        data=data, play={'current': None, 'visited': [], 'unlocked': []},
    )

    # 4) plano da próxima sessão (só se estiver vazio — nunca sobrescreve o mestre)
    settings = dict(campaign.dm_settings or {})
    plan_filled = False
    if _plan_is_empty(settings.get('sessionPlan')):
        by_id = {n['id']: n for n in data['nodes']}
        monsters, rewards = [], []
        for n in data['nodes']:
            if n['encounter']:
                monsters.append(f"{n['name']}: " + ', '.join(f"{x['count']}× {x['name']}" for x in n['encounter']))
            loot = [f"{it['name']}{' ×' + str(it['qty']) if it.get('qty', 1) > 1 else ''}" for it in n['treasure']['items']]
            coins = _coins_text(n['treasure']['coins'], lang)
            if loot or coins:
                rewards.append(f"{n['name']}: " + ', '.join(loot + ([coins] if coins else [])))
        secrets_plan = []
        for text, key, sidx in clues:
            ref = None
            if key:
                obj = by_key[key]
                sid = obj.secrets[sidx]['id'] if sidx is not None and sidx < len(obj.secrets or []) else None
                ref = {'entryId': obj.id, 'secretId': sid}
            secrets_plan.append({'text': _render(text, ids, names, False, lang), 'ref': ref, 'discovered': False})
        patch = R.clean_session_plan_patch({
            'strongStart': _render(P['strongStart'], ids, names, False, lang),
            'scenes': [{'text': by_id[nid]['name'], 'nodeRef': {'adventureId': adventure.id, 'nodeId': nid}, 'done': False}
                       for nid in pack['planScenes'] if nid in by_id],
            'secrets': secrets_plan,
            'npcIds': [o.id for o in by_key.values() if o.kind == 'npc'],
            'placeIds': [o.id for o in by_key.values() if o.kind == 'place'],
            'monsters': '\n'.join(monsters),
            'rewards': '\n'.join(rewards),
        })
        settings['sessionPlan'] = R.merged_session_plan(settings.get('sessionPlan'), patch)
        plan_filled = True

    ready = dict(settings.get('readyAdventures') or {})
    ready[pack_id] = {'adventureId': adventure.id, 'lang': lang, 'at': timezone.now().isoformat()}
    settings['readyAdventures'] = ready
    Campaign.objects.filter(pk=campaign.pk).update(dm_settings=settings)
    return {'adventureId': adventure.id, 'entryIds': list(ids.values()), 'sessionPlanFilled': plan_filled,
            'name': adventure.name}
