"""
Opções selecionáveis de classe (invocações, metamagia, manobras…).

Espelha frontend/src/progression/options.js. Os dados vêm de catalog.json
(chave "options", gerada por scripts/sync-rules.mjs a partir de
frontend/data/class-options/), sem nomes nem descrições.

A ficha guarda as escolhas em data['classOptions']:
    [{'classId', 'pool', 'id', 'level', 'detail'?}]
"""
from .rules import CLASS_OPTIONS

_GRANT_KEYS = ('spells', 'cantrips', 'spellbook', 'skills', 'expertise', 'languages', 'tools', 'weapons', 'armor', 'saves')
_GRANT_AS = {'spell': 'spells', 'cantrip': 'cantrips', 'skill': 'skills', 'expertise': 'expertise', 'language': 'languages',
             'tool': 'tools', 'weapon': 'weapons', 'spellbook': 'spellbook'}
_DEFAULT_GRANT = {'spell': 'spell', 'skill': 'skill', 'language': 'language'}


def class_options_data(class_id):
    return CLASS_OPTIONS.get(class_id)


def _pool(class_id, pool):
    return ((class_options_data(class_id) or {}).get('pools') or {}).get(pool)


def find_option(class_id, pool, option_id):
    d = _pool(class_id, pool)
    if not d or not isinstance(option_id, str) or not option_id or len(option_id) > 80:
        return None
    if d.get('kind'):
        allowed = (d.get('filter') or {}).get('from')
        if allowed and option_id not in allowed:
            return None
        return {'id': option_id, 'dynamic': d['kind']}
    return next((o for o in d.get('options', []) if o['id'] == option_id), None)


# Armas Kensei à distância (o catálogo do backend não leva o campo `melee`).
_KENSEI_RANGED = {'crossbowLight', 'dart', 'shortbow', 'sling', 'blowgun', 'crossbowHand', 'longbow', 'pistol', 'musket'}


def migrate_class_options(character):
    """Espelha migrateClassOptions: Kensei nível 3 passou de 2 x kenseiWeapon
    para kenseiWeaponMelee + kenseiWeaponRanged."""
    from .multiclass import class_level
    all_picks = character.get('classOptions') or []
    kensei = [p for p in all_picks if isinstance(p, dict) and p.get('classId') == 'monk' and p.get('pool') == 'kenseiWeapon']
    if not kensei:
        return character
    slots = option_slots(character, 'monk', class_level(character, 'monk'))
    room = (slots.get('kenseiWeapon') or {}).get('total', 0)
    if len(kensei) <= room:
        return character
    others = [p for p in all_picks if p not in kensei]
    view = {**character, 'classOptions': others}
    free = {pool: (slots.get(pool) or {}).get('total', 0) - len(picks_of(view, 'monk', pool))
            for pool in ('kenseiWeaponMelee', 'kenseiWeaponRanged')}
    excess = sorted(kensei, key=lambda p: p.get('level') or 0)[:len(kensei) - room]
    moved = {}
    for p in excess:
        pool = 'kenseiWeaponRanged' if p.get('id') in _KENSEI_RANGED else 'kenseiWeaponMelee'
        if free[pool] > 0:
            moved[id(p)] = pool
            free[pool] -= 1
    for p in excess:
        if id(p) in moved:
            continue
        for pool in ('kenseiWeaponMelee', 'kenseiWeaponRanged'):
            if free[pool] > 0:
                moved[id(p)] = pool
                free[pool] -= 1
                break
    if not moved:
        return character
    return {**character, 'classOptions': [{**p, 'pool': moved[id(p)]} if id(p) in moved else p for p in all_picks]}


def picks_of(character, class_id, pool=None):
    return [p for p in (character.get('classOptions') or [])
            if isinstance(p, dict) and p.get('classId') == class_id and (pool is None or p.get('pool') == pool)]


def option_slots(character, class_id=None, class_level=None):
    class_id = class_id or character.get('className')
    class_level = class_level or character.get('level') or 1
    data = class_options_data(class_id)
    if not data:
        return {}
    table = data.get('choices') if character.get('rulesVersion') == '2024' else data.get('legacyChoices')
    table = table or {}
    sub_choices = data.get('subclassChoices') if character.get('rulesVersion') == '2024' else data.get('legacySubclassChoices')
    sub = (sub_choices or {}).get(character.get('subclass')) if character.get('subclass') else None
    multiclassed = bool(character.get('startingClass')) and character.get('startingClass') != class_id
    pools = data.get('pools') or {}
    out = {}

    def add(pool, level, count):
        if not count:
            return
        slot = out.setdefault(pool, {'total': 0, 'gains': []})
        slot['total'] += count
        slot['gains'].append({'level': level, 'count': count})

    for lv in range(1, class_level + 1):
        for pool, n in (table.get(lv) or {}).items():
            if not (multiclassed and (pools.get(pool) or {}).get('startingClassOnly')):
                add(pool, lv, n)
        for pool, n in ((sub or {}).get(lv) or {}).items():
            add(pool, lv, n)
    for p in picks_of(character, class_id):
        option = find_option(class_id, p.get('pool'), p.get('id'))
        for pool, n in ((option or {}).get('choices') or {}).items():
            add(pool, class_level, n)
    return out


def check_prereq(character, option, picks, class_level):
    issues = []
    req = option.get('prereq') or {}
    have = {p.get('id') for p in picks}
    rules = '2024' if character.get('rulesVersion') == '2024' else '2014'
    if option.get('rules') and option['rules'] != rules:
        issues.append(f"Só nas regras de {option['rules']}")
    if req.get('level') and class_level < req['level']:
        issues.append(f"Nível {req['level']}+")
    for oid in req.get('options') or []:
        if oid not in have:
            issues.append(f'Requer {oid}')
    any_of = req.get('anyOption') or []
    if any_of and not any(oid in have for oid in any_of):
        issues.append('Requer ' + ' ou '.join(any_of))
    if req.get('subclass') and character.get('subclass') not in req['subclass']:
        issues.append('Subclasse específica')
    if rules == '2014' and option.get('classes2014') and character.get('className') not in option['classes2014']:
        issues.append('Fora da lista desta classe (2014)')
    return issues


def _grants(data, picks):
    g = {k: [] for k in _GRANT_KEYS}
    for p in picks:
        d = (data.get('pools') or {}).get(p.get('pool')) or {}
        if d.get('kind'):
            key = _GRANT_AS.get(d.get('grantAs') or _DEFAULT_GRANT.get(d['kind']))
            if key:
                g[key].append(p['id'])
            continue
        for k in _GRANT_KEYS:
            g[k].extend(((p['option'].get('grants') or {}).get(k)) or [])
    return g


def class_option_state(character):
    """Escolhas, vagas e concessões de UMA classe (ficha vista como essa classe)."""
    character = migrate_class_options(character)
    class_id = character.get('className')
    data = class_options_data(class_id)
    if not data:
        return {'picks': [], 'slots': {}, 'grants': {k: [] for k in _GRANT_KEYS}}
    picks = []
    for p in picks_of(character, class_id):
        option = find_option(class_id, p.get('pool'), p.get('id'))
        if option:
            picks.append({**p, 'option': option})
    return {'picks': picks, 'slots': option_slots(character), 'grants': _grants(data, picks)}


def validate_option_picks(character, class_id, picks_in, class_level, level_up=False):
    """Espelha validateOptionPicks. picks_in: {'adds': [...], 'swaps': [...]}"""
    character = migrate_class_options(character)
    issues = []
    if not isinstance(picks_in, dict):
        return {'valid': False, 'issues': ['Formato inválido']}
    adds = picks_in.get('adds') or []
    swaps = picks_in.get('swaps') or []
    if not isinstance(adds, list) or not isinstance(swaps, list) or len(adds) + len(swaps) > 30:
        return {'valid': False, 'issues': ['Formato inválido']}
    data = class_options_data(class_id)
    if not data:
        ok = not adds and not swaps
        return {'valid': ok, 'issues': [] if ok else ['Classe sem opções selecionáveis']}
    view = {**character, 'className': class_id, 'level': class_level}
    picks = picks_of(character, class_id)
    pools = data.get('pools') or {}
    adds = list(adds)

    swaps_per_pool = {}
    for s in swaps:
        if not isinstance(s, dict):
            issues.append('Troca inválida')
            continue
        d = pools.get(s.get('pool'))
        level_ok = level_up and d and d.get('swapOnLevelUp') and (not d.get('swapLevels') or class_level in d['swapLevels'])
        if not d or not (d.get('freeSwap') or level_ok):
            issues.append('Este pool não permite troca agora')
            continue
        idx = next((i for i, p in enumerate(picks) if p.get('pool') == s['pool'] and p.get('id') == s.get('from')), None)
        if idx is None:
            issues.append('Opção a trocar não encontrada')
            continue
        picks = picks[:idx] + picks[idx + 1:]
        adds.append({'pool': s['pool'], 'id': s.get('to'), 'detail': s.get('detail')})
        swaps_per_pool[s['pool']] = swaps_per_pool.get(s['pool'], 0) + 1
    for pool, n in swaps_per_pool.items():
        d = pools.get(pool) or {}
        if not d.get('freeSwap') and n > (d.get('swapOnLevelUp') or 0):
            issues.append('Trocas demais neste nível')

    for a in adds:
        if not isinstance(a, dict):
            issues.append('Escolha inválida')
            continue
        option = find_option(class_id, a.get('pool'), a.get('id'))
        if not option:
            issues.append(f"Opção inválida: {a.get('id')}")
            continue
        detail = a.get('detail')
        if detail is not None and (not isinstance(detail, str) or len(detail) > 120):
            issues.append('Detalhe inválido')
        pre = check_prereq(view, option, picks + adds, class_level)
        if pre:
            issues.append(f"{a['id']}: {', '.join(pre)}")
        same = [p for p in picks if p.get('pool') == a['pool'] and p.get('id') == a['id']]
        if same and not option.get('repeatable'):
            issues.append(f"{a['id']} já escolhida")
        if same and option.get('repeatable') and option.get('detail') and any((p.get('detail') or '') == (detail or '') for p in same):
            issues.append(f"{a['id']}: escolha um alvo diferente")
        picks = picks + [{'classId': class_id, 'pool': a['pool'], 'id': a['id'], 'detail': detail}]

    others = [p for p in (character.get('classOptions') or []) if isinstance(p, dict) and p.get('classId') != class_id]
    slots = option_slots({**view, 'classOptions': others + picks}, class_id, class_level)
    counts = {}
    for p in picks:
        counts[p['pool']] = counts.get(p['pool'], 0) + 1
    for pool, n in counts.items():
        if n > (slots.get(pool) or {}).get('total', 0):
            issues.append(f'Escolhas demais em {pool}')
    return {'valid': not issues, 'issues': issues}


def _clean(p):
    return {k: v for k, v in p.items() if v is not None and v != ''}


def apply_option_picks(character, class_id, picks_in, level):
    character = migrate_class_options(character)
    out = [p for p in (character.get('classOptions') or []) if isinstance(p, dict)]
    for s in picks_in.get('swaps') or []:
        idx = next((i for i, p in enumerate(out) if p.get('classId') == class_id and p.get('pool') == s['pool'] and p.get('id') == s['from']), None)
        old = out.pop(idx) if idx is not None else {}
        out.append(_clean({'classId': class_id, 'pool': s['pool'], 'id': s['to'], 'level': level, 'detail': s.get('detail'),
                           'swappedFrom': s['from'], 'originalLevel': old.get('level'), 'originalDetail': old.get('detail')}))
    for a in picks_in.get('adds') or []:
        out.append(_clean({'classId': class_id, 'pool': a['pool'], 'id': a['id'], 'level': level, 'detail': a.get('detail')}))
    return {**character, 'classOptions': out}
