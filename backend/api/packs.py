"""
Pacotes de equipamento (Explorer's Pack, Dungeoneer's Pack…) no inventário.

Abrir um pacote troca o item do pacote pelo que vem dentro, pela regra da ficha
(2014 = SRD 5.1, 2024 = SRD 5.2.1), somando com itens iguais que a ficha já
tenha. Espelha openPack() de frontend/src/items/packs.js; os dados vêm de
catalog.json['packs'] (gerado por scripts/sync-rules.mjs a partir de
frontend/data/equipment-packs.js):
  names       nome normalizado → chave do pacote ('pacote de aventureiro' → 'explorer')
  catalogIds  sourceId do catálogo → chave ('explorersPack' → 'explorer')
  gear        { chave: { sourceId?, type, name {pt,en}, weight {2014,2024}?, artId?, description?, match[] } }
  contents    { 2014: { pacote: [[gear, qtd], …] }, 2024: … }
"""
import re
import secrets
import unicodedata

from django.utils import timezone

from .progression.rules import _CATALOG

_PACKS = _CATALOG.get('packs', {})


def _by_rules(table, rules):
    # rules._numeric_keys converte chaves numéricas ("2024") em int.
    return (table or {}).get(int(rules)) or (table or {}).get(str(rules)) or {}


def rules_of(data):
    return 2014 if (data or {}).get('rulesVersion') == '2014' else 2024


def item_key(s):
    """Minúsculas, sem acento nem apóstrofo, hífen vira espaço (itemKey do frontend)."""
    s = unicodedata.normalize('NFD', str('' if s is None else s).lower())
    s = ''.join(ch for ch in s if not ('̀' <= ch <= 'ͯ'))
    s = re.sub(r"['’`]", '', s)
    s = re.sub(r'[-_]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def pack_name_key(s):
    """Para reconhecer o pacote: também sem "×2" e sem "(10 po)" no fim."""
    s = re.sub(r'(?:\s*×|\s+[xX])\s*\d+\s*$', '', str('' if s is None else s))
    s = re.sub(r'\s*\([^)]*\)\s*$', '', s)
    return item_key(s)


def _names(name):
    if isinstance(name, dict):
        return [name.get('pt'), name.get('en')]
    return [name]


def pack_key(item):
    """Chave do pacote ('explorer'…) se o item for um pacote; senão None."""
    if not isinstance(item, dict):
        return None
    known = set(_by_rules(_PACKS.get('contents'), 2024)) | set(_by_rules(_PACKS.get('contents'), 2014))
    if isinstance(item.get('pack'), str) and item['pack'] in known:
        return item['pack']
    sid = item.get('sourceId')
    if sid and sid in _PACKS.get('catalogIds', {}):
        return _PACKS['catalogIds'][sid]
    # Arma, armadura, poção e item mágico nunca são pacote.
    if item.get('type') not in (None, '', 'gear'):
        return None
    for n in _names(item.get('name')):
        key = _PACKS.get('names', {}).get(pack_name_key(n))
        if key:
            return key
    return None


def pack_items(key, rules):
    """Itens de dentro do pacote: [{gear, qty, sourceId?, type, name, weight?, …}]."""
    out = []
    for gk, qty in _by_rules(_PACKS.get('contents'), rules).get(key, []):
        g = dict(_PACKS.get('gear', {}).get(gk) or {})
        w = g.pop('weight', None)
        weight = w.get(int(rules), w.get(str(rules))) if isinstance(w, dict) else None
        out.append({**g, 'gear': gk, 'qty': int(qty), **({'weight': weight} if weight is not None else {})})
    return out


def _qty(item):
    q = item.get('qty')
    if q is None or q == '':
        return 1
    try:
        return int(float(q))
    except (TypeError, ValueError):
        return 1


def _pick(lang, name):
    if isinstance(name, str):
        return name
    name = name or {}
    first = name.get('en') if lang == 'en' else name.get('pt')
    return first or name.get('pt') or name.get('en') or ''


def _same(existing, content):
    if not isinstance(existing, dict) or pack_key(existing):
        return False
    if existing.get('weapon') or existing.get('armor') or existing.get('magic'):
        return False
    if existing.get('sourceId') and content.get('sourceId'):
        return existing['sourceId'] == content['sourceId']
    match = content.get('match') or []
    name = existing.get('name')
    return item_key(_pick('pt', name)) in match or item_key(_pick('en', name)) in match


def _new_id(i, taken):
    while True:
        new = f"item-{int(timezone.now().timestamp() * 1000)}-{i}{secrets.token_hex(2)}"
        if new not in taken:
            taken.add(new)
            return new


def open_pack(equipment, idx, rules, lang='pt'):
    """Nova lista de equipamento com o pacote em `idx` aberto, ou None se não for pacote.

    Mesmas regras do frontend: ×2 fica ×1 (itens logo depois); ×1 ou ×0 sai e os
    itens entram no lugar; item igual soma a quantidade; itens novos herdam
    `from`; as notas do pacote (quando ele sai) vão para o primeiro item.
    """
    items = list(equipment or [])
    if not (0 <= idx < len(items)):
        return None
    pack = items[idx]
    key = pack_key(pack)
    if not key:
        return None
    out = [dict(e) if isinstance(e, dict) else e for e in items]
    taken = {e.get('id') for e in out if isinstance(e, dict) and e.get('id')}
    left = _qty(pack) - 1
    pack_notes = '' if left > 0 else str(pack.get('notes') or '').strip()
    added = []
    for i, c in enumerate(pack_items(key, rules)):
        notes = pack_notes if i == 0 else ''
        j = next((k for k, e in enumerate(out) if k != idx and _same(e, c)), -1)
        if j >= 0:
            out[j]['qty'] = max(0, _qty(out[j])) + c['qty']
            if notes:
                out[j]['notes'] = ' · '.join(x for x in [str(out[j].get('notes') or '').strip(), notes] if x)
            continue
        new = {'id': _new_id(i, taken)}
        if c.get('sourceId'):
            new['sourceId'] = c['sourceId']
        new.update({
            'name': _pick(lang, c.get('name')), 'type': c.get('type') or 'gear', 'qty': c['qty'],
            'equipped': False, 'broken': False, 'attunement': False, 'attuned': False, 'notes': notes,
        })
        for field in ('weight', 'artId', 'description'):
            if c.get(field) is not None:
                new[field] = c[field]
        if pack.get('from'):
            new['from'] = pack['from']
        added.append(new)
    if left > 0:
        out[idx] = {**out[idx], 'qty': left}
        out[idx + 1:idx + 1] = added
    else:
        out[idx:idx + 1] = added
    return out
