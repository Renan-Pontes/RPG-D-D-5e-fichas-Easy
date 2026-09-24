"""
Multiclasse — espelha frontend/src/progression/multiclass.js.

Na ficha: className/subclass = classe inicial; level = nível TOTAL;
multiclass = [{id, subclass, landType}] (classes adicionais);
classSequence = classe de cada nível total (só existe com multiclasse).
"""

MULTICLASS_PREREQS = {
    'barbarian': [['str']],
    'bard': [['cha']],
    'cleric': [['wis']],
    'druid': [['wis']],
    'fighter': [['str', 'dex']],
    'monk': [['dex'], ['wis']],
    'paladin': [['str'], ['cha']],
    'ranger': [['dex'], ['wis']],
    'rogue': [['dex']],
    'sorcerer': [['cha']],
    'warlock': [['cha']],
    'wizard': [['int']],
    'artificer': [['int']],
}

# Classes que dão 1 perícia ao entrar como multiclasse (2014 e 2024).
MULTICLASS_SKILL = {'bard', 'ranger', 'rogue'}


def _extra_classes(character):
    primary = character.get('className')
    return [m for m in (character.get('multiclass') or [])
            if isinstance(m, dict) and m.get('id') and m.get('id') != primary]


def is_multiclass(character):
    return bool(_extra_classes(character))


def class_sequence(character):
    level = max(1, int(character.get('level') or 1))
    primary = character.get('className')
    if not is_multiclass(character):
        return [primary] * level
    known = {primary, *(m['id'] for m in _extra_classes(character))}
    seq = [c for c in (character.get('classSequence') or []) if c in known][:level]
    if not seq or seq[0] != primary:
        seq.insert(0, primary)
    del seq[level:]
    seq.extend([primary] * (level - len(seq)))
    return seq


def class_entries(character):
    seq = class_sequence(character)
    out = [{'id': character.get('className'), 'subclass': character.get('subclass') or '',
            'landType': character.get('landType') or '', 'level': seq.count(character.get('className')), 'primary': True}]
    for m in _extra_classes(character):
        lv = seq.count(m['id'])
        if lv > 0 and not any(e['id'] == m['id'] for e in out):
            out.append({'id': m['id'], 'subclass': m.get('subclass') or '', 'landType': m.get('landType') or '',
                        'level': lv, 'primary': False})
    return out


def class_level(character, class_id):
    return next((e['level'] for e in class_entries(character) if e['id'] == class_id), 0)


def total_level_for(character, class_id, class_lvl):
    n = 0
    for i, c in enumerate(class_sequence(character)):
        if c == class_id:
            n += 1
            if n == class_lvl:
                return i + 1
    return None


def class_view(character, entry):
    """Ficha vista como classe única (nível da classe, levelChoices reindexado)."""
    if not is_multiclass(character):
        return {**character, 'totalLevel': character.get('totalLevel') or character.get('level')}
    choices = character.get('levelChoices') or {}
    level_choices = {}
    n = 0
    for i, c in enumerate(class_sequence(character)):
        if c != entry['id']:
            continue
        n += 1
        got = choices.get(str(i + 1)) or choices.get(i + 1)
        if got:
            level_choices[str(n)] = got
    view = {**character, 'className': entry['id'], 'subclass': entry.get('subclass') or '',
            'landType': entry.get('landType') or '', 'level': entry['level'],
            'totalLevel': character.get('level'), 'multiclass': [], 'levelChoices': level_choices}
    view.pop('classSequence', None)
    return view


def _score(character, k):
    return ((character.get('abilities') or {}).get(k) or 10) + ((character.get('raceBonus') or {}).get(k) or 0)


def missing_prereqs(character, class_id):
    return [g for g in MULTICLASS_PREREQS.get(class_id, []) if not any(_score(character, k) >= 13 for k in g)]


def can_multiclass_into(character, class_id):
    if any(e['id'] == class_id for e in class_entries(character)):
        return False
    if class_id not in MULTICLASS_PREREQS:
        return False
    if missing_prereqs(character, class_id):
        return False
    return not any(missing_prereqs(character, e['id']) for e in class_entries(character))


def with_class_level(character, class_id):
    """+1 nível na classe (sequência e lista de classes). Não mexe em PV/escolhas."""
    to_level = int(character.get('level') or 1) + 1
    primary = character.get('className')
    if class_id == primary and not is_multiclass(character):
        return {**character, 'level': to_level}
    nxt = {**character, 'level': to_level, 'classSequence': class_sequence(character) + [class_id]}
    if class_id != primary and not any(m['id'] == class_id for m in _extra_classes(character)):
        nxt['multiclass'] = _extra_classes(character) + [{'id': class_id, 'subclass': '', 'landType': ''}]
    return nxt
