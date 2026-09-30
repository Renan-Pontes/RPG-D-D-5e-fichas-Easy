"""
Recursos com usos (Fúria, Canalizar Divindade…). Espelha
frontend/src/progression/resources.js; dados em catalog.json (options.<classe>.resources).

Gasto em data['resourcesUsed'] = {'<classId>.<id>': n}.
"""
from .rules import CLASS_OPTIONS, SPECIES_RESOURCES, prof_bonus
from .multiclass import class_entries, class_view
from .options import find_option, picks_of


def _mod(c, k):
    base = (c.get('abilities') or {}).get(k) or 10
    return (base + ((c.get('raceBonus') or {}).get(k) or 0) - 10) // 2


def _by_level(table, level):
    out = None
    for lv in sorted((table or {}), key=int):
        if level >= int(lv):
            out = table[lv]
    return out


def _uses_max(uses, character, class_level):
    uses = uses or {}
    mult = uses.get('multiplier') or 1
    if uses.get('byLevel'):
        n = _by_level(uses['byLevel'], class_level) or 0
    elif uses.get('fixed') is not None:
        n = uses['fixed']
    elif uses.get('ability'):
        n = _mod(character, uses['ability']) * mult
    elif uses.get('profBonus'):
        n = prof_bonus(character.get('level') or 1) * mult
    elif uses.get('perClassLevel'):
        n = uses['perClassLevel'] * class_level
    elif uses.get('classLevel'):
        n = class_level * mult
    else:
        n = 0
    n += uses.get('add') or 0
    if uses.get('min') is not None:
        n = max(uses['min'], n)
    return max(0, n)


def _min_level(r):
    if r.get('minLevel') is not None:
        return r['minLevel']
    keys = [int(k) for k in ((r.get('uses') or {}).get('byLevel') or {})]
    return min(keys) if keys else 1


def _build(character, class_id, r, key, class_level):
    mx = _uses_max(r.get('uses'), character, class_level)
    if mx <= 0:
        return None
    used = min(mx, max(0, int((character.get('resourcesUsed') or {}).get(key) or 0)))
    short = r.get('recharge') == 'short' or (r.get('shortRestFromLevel') is not None and class_level >= r['shortRestFromLevel'])
    return {'key': key, 'classId': class_id, 'id': r['id'], 'max': mx, 'used': used,
            'recharge': 'short' if short else 'long', 'shortRestRegain': r.get('shortRestRegain')}


def compute_resources(character):
    rules = '2024' if character.get('rulesVersion') == '2024' else '2014'
    out = []
    total = character.get('level') or 1
    # O catálogo converte chaves numéricas ('2024' → 2024) ao carregar.
    by_species = SPECIES_RESOURCES.get(int(rules)) or SPECIES_RESOURCES.get(rules) or {}
    for r in by_species.get(character.get('race'), []):
        if total < (r.get('minLevel') or 1):
            continue
        res = _build(character, 'species', r, f"species.{r['id']}", total)
        if res:
            out.append(res)
    for entry in class_entries(character):
        data = CLASS_OPTIONS.get(entry['id'])
        if not data:
            continue
        view = class_view(character, entry)
        lv = view.get('level') or 1
        sub = str(view.get('subclass') or '').lower()
        for r in data.get('resources') or []:
            if r.get('rules') and r['rules'] != rules:
                continue
            if r.get('subclass') and sub not in [s.lower() for s in r['subclass']]:
                continue
            if lv < _min_level(r):
                continue
            res = _build(character, entry['id'], r, f"{entry['id']}.{r['id']}", lv)
            if res:
                out.append(res)
        for p in picks_of(character, entry['id']):
            option = find_option(entry['id'], p.get('pool'), p.get('id'))
            if not option or not option.get('resource'):
                continue
            if lv < (option['resource'].get('minLevel') or 1):
                continue
            key = f"{entry['id']}.{p['pool']}.{p['id']}"
            res = _build(character, entry['id'], {'id': f"{p['pool']}.{p['id']}", **option['resource']}, key, lv)
            if res and not any(x['key'] == key for x in out):
                out.append(res)
    return out


def spend_resource(character, key, delta=1):
    res = next((r for r in compute_resources(character) if r['key'] == key), None)
    if not res:
        return None
    used = min(res['max'], max(0, res['used'] + delta))
    return {**character, 'resourcesUsed': {**(character.get('resourcesUsed') or {}), key: used}}


def rest_resources(character, rest_type):
    if rest_type == 'long':
        return {**character, 'resourcesUsed': {}}
    nxt = dict(character.get('resourcesUsed') or {})
    for r in compute_resources(character):
        if not r['used']:
            continue
        if r.get('shortRestRegain'):
            nxt[r['key']] = max(0, r['used'] - r['shortRestRegain'])
        elif r['recharge'] == 'short':
            nxt[r['key']] = 0
    return {**character, 'resourcesUsed': nxt}
