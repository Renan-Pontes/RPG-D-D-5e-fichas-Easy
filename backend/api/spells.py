"""
Tabela de slots de magia por classe e nível (PHB SRD 5.1).

Espelha defaultSlotsFor() do DMCharacterEditor.jsx. A fonte de verdade pode
ficar no frontend (já existe em rules.js parcial), mas duplicar aqui evita
round-trip no backend — endpoint /cast-spell valida sem precisar consultar
frontend.

Retorna lista de 9 ints: [nv1, nv2, ..., nv9].
"""

from .progression.multiclass import class_level, is_multiclass

_FULL = {
    1:  [2,0,0,0,0,0,0,0,0],
    2:  [3,0,0,0,0,0,0,0,0],
    3:  [4,2,0,0,0,0,0,0,0],
    4:  [4,3,0,0,0,0,0,0,0],
    5:  [4,3,2,0,0,0,0,0,0],
    6:  [4,3,3,0,0,0,0,0,0],
    7:  [4,3,3,1,0,0,0,0,0],
    8:  [4,3,3,2,0,0,0,0,0],
    9:  [4,3,3,3,1,0,0,0,0],
    10: [4,3,3,3,2,0,0,0,0],
    11: [4,3,3,3,2,1,0,0,0],
    12: [4,3,3,3,2,1,0,0,0],
    13: [4,3,3,3,2,1,1,0,0],
    14: [4,3,3,3,2,1,1,0,0],
    15: [4,3,3,3,2,1,1,1,0],
    16: [4,3,3,3,2,1,1,1,0],
    17: [4,3,3,3,2,1,1,1,1],
    18: [4,3,3,3,3,1,1,1,1],
    19: [4,3,3,3,3,2,1,1,1],
    20: [4,3,3,3,3,2,2,1,1],
}

_HALF = {  # paladin / ranger (começam a conjurar no nv2)
    1: [0,0,0,0,0,0,0,0,0],
    2: [2,0,0,0,0,0,0,0,0],
    3: [3,0,0,0,0,0,0,0,0],
    4: [3,0,0,0,0,0,0,0,0],
    5: [4,2,0,0,0,0,0,0,0],
    6: [4,2,0,0,0,0,0,0,0],
    7: [4,3,0,0,0,0,0,0,0],
    8: [4,3,0,0,0,0,0,0,0],
    9: [4,3,2,0,0,0,0,0,0],
    10:[4,3,2,0,0,0,0,0,0],
    11:[4,3,3,0,0,0,0,0,0],
    12:[4,3,3,0,0,0,0,0,0],
    13:[4,3,3,1,0,0,0,0,0],
    14:[4,3,3,1,0,0,0,0,0],
    15:[4,3,3,2,0,0,0,0,0],
    16:[4,3,3,2,0,0,0,0,0],
    17:[4,3,3,3,1,0,0,0,0],
    18:[4,3,3,3,1,0,0,0,0],
    19:[4,3,3,3,2,0,0,0,0],
    20:[4,3,3,3,2,0,0,0,0],
}

# Bruxo (Pact Magic): slots únicos que escalam de nível, sempre máx do mais alto.
# Slots ficam todos no mesmo nível efetivo (PHB).
_WARLOCK = {
    1: [1,0,0,0,0,0,0,0,0],
    2: [2,0,0,0,0,0,0,0,0],
    3: [0,2,0,0,0,0,0,0,0],
    4: [0,2,0,0,0,0,0,0,0],
    5: [0,0,2,0,0,0,0,0,0],
    6: [0,0,2,0,0,0,0,0,0],
    7: [0,0,0,2,0,0,0,0,0],
    8: [0,0,0,2,0,0,0,0,0],
    9: [0,0,0,0,2,0,0,0,0],
    10:[0,0,0,0,2,0,0,0,0],
    11:[0,0,0,0,3,0,0,0,0],
    12:[0,0,0,0,3,0,0,0,0],
    13:[0,0,0,0,3,0,0,0,0],
    14:[0,0,0,0,3,0,0,0,0],
    15:[0,0,0,0,3,0,0,0,0],
    16:[0,0,0,0,3,0,0,0,0],
    17:[0,0,0,0,4,0,0,0,0],
    18:[0,0,0,0,4,0,0,0,0],
    19:[0,0,0,0,4,0,0,0,0],
    20:[0,0,0,0,4,0,0,0,0],
}

FULL_CASTERS = {'bard', 'cleric', 'druid', 'sorcerer', 'wizard'}
HALF_CASTERS = {'paladin', 'ranger'}


_THIRD = [
    [], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3],
    [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 2], [4, 3, 3],
    [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
]


def spell_slots_max(class_name, level, subclass=''):
    """Retorna lista de 9 ints com o máximo de slots por nível (1..9)."""
    cls = (class_name or '').lower()
    lv = max(1, min(20, int(level or 1)))
    if cls == 'artificer':
        return list(_FULL[(lv + 1) // 2])
    if (cls, (subclass or '').lower()) in {('fighter', 'eldritchknight'), ('rogue', 'arcanetrickster')}:
        row = _THIRD[lv - 1]
        return row + [0] * (9 - len(row))
    if cls in FULL_CASTERS:
        return list(_FULL[lv])
    if cls in HALF_CASTERS:
        return list(_HALF[lv])
    if cls == 'warlock':
        return list(_WARLOCK[lv])
    return [0] * 9


def _caster_level(view):
    """Nível de conjurador da classe para a tabela de multiclasse (espelha utils.js)."""
    cls = (view.get('className') or '').lower()
    lv = int(view.get('level') or 0)
    sub = (view.get('subclass') or '').lower()
    if cls in FULL_CASTERS:
        return lv
    if cls == 'artificer':
        return (lv + 1) // 2
    if cls in HALF_CASTERS:
        return (lv + 1) // 2 if view.get('rulesVersion') == '2024' else lv // 2
    if (cls, sub) in {('fighter', 'eldritchknight'), ('rogue', 'arcanetrickster')}:
        return lv // 3
    return 0


def slots_max_for(character_data):
    """Resolve slots máximos da ficha. Respeita override em data.spellSlotsMax."""
    override = character_data.get('spellSlotsMax')
    if isinstance(override, list) and len(override) == 9:
        return [max(0, int(v) if v is not None else 0) for v in override]
    from .progression.multiclass import is_multiclass, class_entries, class_view
    if is_multiclass(character_data):
        views = [class_view(character_data, e) for e in class_entries(character_data)]
        casters = [v for v in views if v.get('className') != 'warlock' and any(_class_slots(v))]
        if len(casters) >= 2:
            slots = list(_FULL[max(1, min(20, sum(_caster_level(v) for v in casters)))])
        elif casters:
            slots = _class_slots(casters[0])
        else:
            slots = [0] * 9
        for v in views:
            if v.get('className') == 'warlock':  # Magia de Pacto somada no mesmo círculo
                slots = [a + b for a, b in zip(slots, _class_slots(v))]
        return slots
    return _class_slots(character_data)


def _class_slots(character_data):
    if character_data.get('rulesVersion') == '2024':
        from .progression.rules import rules_for
        rule = rules_for(character_data) or {}
        level = max(1, min(20, int(character_data.get('level') or 1)))
        row = rule.get('per_level', {}).get(level, {}).get('spellSlots')
        if row is not None:
            return (list(row) + [0] * 9)[:9]
    return spell_slots_max(character_data.get('className'), character_data.get('level') or 1, character_data.get('subclass'))


def slots_used(character_data):
    used = character_data.get('spellSlotsUsed') or []
    norm = list(used) + [0] * max(0, 9 - len(used))
    return [max(0, int(v) if v is not None else 0) for v in norm[:9]]


def is_cantrip(spell_def):
    return (spell_def or {}).get('level') == 0


# ============================================================
# Cast / Rest
# ============================================================
def cast(character_data, slot_level):
    """Gasta 1 slot do nível indicado (1-9). Truque (0) não desconta.

    Retorna (next_data, error_code).
    """
    if slot_level == 0:
        return character_data, None  # truque, sem custo
    if not (1 <= slot_level <= 9):
        return character_data, 'invalid_slot_level'
    idx = slot_level - 1
    maxs = slots_max_for(character_data)
    used = slots_used(character_data)
    if used[idx] >= maxs[idx]:
        return character_data, 'no_slot_available'

    new_used = list(used)
    new_used[idx] += 1
    next_data = dict(character_data)
    next_data['spellSlotsUsed'] = new_used
    return next_data, None


def long_rest(character_data):
    """Restaura tudo: slots, wildShapeUses, HP (até max), hit dice (metade)."""
    next_data = dict(character_data)
    next_data['spellSlotsUsed'] = [0] * 9
    if class_level(next_data, 'druid'):
        next_data['wildShapeUses'] = 0
    max_hp = next_data.get('maxHp') or 0
    next_data['currentHp'] = max_hp
    next_data['tempHp'] = 0
    # Remove unconscious + reseta death saves
    conds = [c for c in (next_data.get('conditions') or []) if c not in ('unconscious', 'stable', 'dead')]
    next_data['conditions'] = conds
    next_data['deathSaves'] = {'success': 0, 'fail': 0}
    # Hit dice: recupera metade do nível, arredondado pra cima, mínimo 1
    level = next_data.get('level') or 1
    used_hd = next_data.get('hitDiceUsed') or 0
    recover = level if character_data.get('rulesVersion') == '2024' else max(1, level // 2)
    next_data['hitDiceUsed'] = max(0, used_hd - recover)
    return next_data


def short_rest(character_data):
    """Restauração parcial. PHB:
    - Druida: recupera Wild Shape uses (na verdade é descanso curto/longo conforme regra)
    - Bruxo: recupera todos os slots
    - Outros: nada automático (Mago tem Arcane Recovery 1x/dia mas exige escolha; deixar manual)
    HP não restaura automático no descanso curto.
    """
    next_data = dict(character_data)
    if class_level(next_data, 'druid'):
        next_data['wildShapeUses'] = max(0, (character_data.get('wildShapeUses') or 0) - 1) if character_data.get('rulesVersion') == '2024' else 0
    # Bruxo puro recupera tudo; em multiclasse os espaços do Pacto estão somados
    # aos demais, então nada é zerado automaticamente.
    if (next_data.get('className') or '').lower() == 'warlock' and not is_multiclass(next_data):
        next_data['spellSlotsUsed'] = [0] * 9
    return next_data
