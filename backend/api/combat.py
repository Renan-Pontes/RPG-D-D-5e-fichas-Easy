"""
Engine de combate D&D 5e — server-side.

Pure functions: rolar dado, resolver ataque, calcular dano com crítico,
aplicar a um combatente, processar saving throws, aplicar/remover condições.

Não acessa banco — recebe dicts (representação de combatente) e retorna
dicts atualizados. As views chamam isto e persistem em CombatInstance.

Formato de combatente (campo `combat_state.combatants` em CombatInstance):
{
  'id': 'uuid',
  'name': 'Goblin #1',
  'type': 'pc' | 'monster',
  'character_id': int?,        # se PC, ID do Character
  'monster_id': str?,          # se monstro, ID do template no catálogo do frontend
  'stats': {                   # snapshot ao adicionar (inline)
    'ac': 15, 'max_hp': 7, 'speed': 30,
    'abilities': {'str': 8, 'dex': 14, ...},
    'saves': {'dex': 4, ...},
    'damage_resistances': ['cold', ...],
    'damage_immunities': [...],
    'damage_vulnerabilities': [...],
    'condition_immunities': [...],
    'actions': [{name, type, atk, damage, damageType, save?, desc?}, ...]
  },
  'current_hp': 7,
  'temp_hp': 0,
  'conditions': ['poisoned'],
  'effects': [{id, name, rounds_left}],
  'position': {x: 0, y: 0},
  'sprite': null,              # base64 PNG do token, opcional
  'token_scale': 1,            # multiplicador (Small=1, Large=2, etc.)
  'initiative': 12,
  'defeated': false,
  'death_saves': {'success': 0, 'fail': 0},  # só PCs
}
"""
import re
import secrets


# ============================================================
# DICE
# ============================================================
def roll_die(sides):
    """Rola um dado justo usando secrets (CSPRNG)."""
    return secrets.randbelow(sides) + 1


def parse_dice(expr):
    """Parsea 'XdY+Z' ou 'XdY-Z' ou 'XdY'. Retorna (count, sides, mod)."""
    m = re.match(r'^\s*(\d+)d(\d+)\s*([+-]\s*\d+)?\s*$', expr or '')
    if not m:
        return (0, 0, 0)
    count = int(m.group(1))
    sides = int(m.group(2))
    mod_str = (m.group(3) or '0').replace(' ', '')
    return (count, sides, int(mod_str))


def roll_dice(expr, double_dice=False):
    """Rola 'XdY+Z'. Se double_dice (crítico), rola 2X dados."""
    count, sides, mod = parse_dice(expr)
    if count == 0 or sides == 0:
        return {'total': 0, 'rolls': [], 'mod': 0}
    n = count * 2 if double_dice else count
    rolls = [roll_die(sides) for _ in range(n)]
    return {'total': sum(rolls) + mod, 'rolls': rolls, 'mod': mod}


def roll_d20(advantage=False, disadvantage=False, forced=None):
    """Rola d20. Se forced (do dice rigging), usa-o. Trata vantagem/desvantagem."""
    if forced is not None:
        return {'value': int(forced), 'rolls': [int(forced)], 'forced': True}
    if advantage and disadvantage:
        # se cancelam, vira normal
        advantage = disadvantage = False
    if advantage:
        a, b = roll_die(20), roll_die(20)
        return {'value': max(a, b), 'rolls': [a, b]}
    if disadvantage:
        a, b = roll_die(20), roll_die(20)
        return {'value': min(a, b), 'rolls': [a, b]}
    v = roll_die(20)
    return {'value': v, 'rolls': [v]}


# ============================================================
# ATAQUE → CA
# ============================================================
def resolve_attack(attacker, target, action, *,
                   advantage=False, disadvantage=False, forced_d20=None,
                   forced_damage=None):
    """Resolve um ataque (melee/ranged) contra alvo.

    Retorna:
    {
      'hit': bool, 'crit': bool, 'natural_one': bool,
      'attack_roll': {value, rolls, forced?},
      'attack_total': int,
      'target_ac': int,
      'damage': {total, rolls, type} | None,
      'log': str,                                  # mensagem narrativa
    }
    """
    atk_bonus = action.get('atk', 0)
    target_ac = (target.get('stats') or {}).get('ac', 10)

    d20 = roll_d20(advantage=advantage, disadvantage=disadvantage, forced=forced_d20)
    nat = d20['value']
    total = nat + atk_bonus
    natural_one = (nat == 1)
    crit = (nat == 20)
    hit = crit or (not natural_one and total >= target_ac)

    result = {
        'hit': hit, 'crit': crit, 'natural_one': natural_one,
        'attack_roll': d20, 'attack_total': total,
        'target_ac': target_ac, 'damage': None,
    }

    if hit:
        dmg_expr = action.get('damage', '0')
        dmg_type = action.get('damageType', 'bludgeoning')
        if forced_damage is not None:
            result['damage'] = {'total': int(forced_damage), 'rolls': [int(forced_damage)],
                                'type': dmg_type, 'forced': True, 'crit': crit}
        else:
            d = roll_dice(dmg_expr, double_dice=crit)
            result['damage'] = {**d, 'type': dmg_type, 'crit': crit}

    name_action = (action.get('name') or {}).get('en') if isinstance(action.get('name'), dict) else action.get('name', '?')
    if natural_one:
        result['log'] = f"{attacker.get('name','?')} → {target.get('name','?')}: NATURAL 1 (errou)"
    elif crit:
        dmg = result['damage']['total'] if result['damage'] else 0
        result['log'] = f"{attacker.get('name','?')} → {target.get('name','?')}: CRÍTICO! ({nat}+{atk_bonus}={total} vs CA {target_ac}) — {dmg} {dmg_type}"
    elif hit:
        dmg = result['damage']['total']
        result['log'] = f"{attacker.get('name','?')} → {target.get('name','?')}: acerto ({nat}+{atk_bonus}={total} vs CA {target_ac}) — {dmg} {dmg_type}"
    else:
        result['log'] = f"{attacker.get('name','?')} → {target.get('name','?')}: errou ({nat}+{atk_bonus}={total} vs CA {target_ac})"
    return result


# ============================================================
# SAVING THROW
# ============================================================
def resolve_save(target, ability, dc, *, advantage=False, disadvantage=False, forced_d20=None):
    """Rola SAL <ability> CD <dc> para o alvo. Retorna {success, total, d20, modifier}."""
    stats = target.get('stats') or {}
    save_mods = stats.get('saves') or {}
    abilities = stats.get('abilities') or {}
    ab = ability.lower()
    if ab in save_mods:
        modifier = int(save_mods[ab])
    else:
        score = abilities.get(ab, 10)
        modifier = (score - 10) // 2
    d = roll_d20(advantage=advantage, disadvantage=disadvantage, forced=forced_d20)
    total = d['value'] + modifier
    return {'success': total >= dc, 'total': total, 'd20': d, 'modifier': modifier, 'dc': dc}


def resolve_save_effect(action, targets, *, forced_d20s=None):
    """Resolve uma ação tipo magia com save (ex: Fireball: 8d6, DEX 15, half).

    targets: lista de combatant dicts. Retorna lista de dicts por alvo.
    forced_d20s: dict {target_id: forced_value} pra rigging.
    """
    save = action.get('save') or {}
    ability = save.get('ability', 'DEX')
    dc = int(save.get('dc', 10))
    half = bool(save.get('halfOnSave', False))
    dmg_expr = action.get('damage', '0')
    dmg_type = action.get('damageType', 'force')
    forced_d20s = forced_d20s or {}

    # Rola o dano uma vez (todos sofrem o mesmo total base)
    base = roll_dice(dmg_expr) if dmg_expr and dmg_expr != '0' else None

    out = []
    for tgt in targets:
        r = resolve_save(tgt, ability, dc, forced_d20=forced_d20s.get(tgt.get('id')))
        applied = 0
        if base:
            full = base['total']
            applied = full // 2 if (r['success'] and half) else (0 if r['success'] else full)
        out.append({
            'target_id': tgt.get('id'),
            'target_name': tgt.get('name'),
            'save': r,
            'damage_taken': applied,
            'damage_type': dmg_type,
        })
    return {'damage_base': base, 'per_target': out, 'ability': ability, 'dc': dc, 'half_on_save': half}


# ============================================================
# APLICAR DANO
# ============================================================
RESIST_HALF = 0.5
VULN_DOUBLE = 2.0


def apply_damage(combatant, amount, damage_type):
    """Aplica dano a um combatente, respeitando resistência/imunidade/vulnerabilidade.
    Consome temp HP primeiro. Retorna novo combatant + delta info."""
    stats = combatant.get('stats') or {}
    immunities = [s.lower() for s in (stats.get('damage_immunities') or [])]
    resistances = [s.lower() for s in (stats.get('damage_resistances') or [])]
    vulnerabilities = [s.lower() for s in (stats.get('damage_vulnerabilities') or [])]

    dt = (damage_type or '').lower()
    multiplier = 1.0
    note = None
    # Match simples por substring (resistances podem ser "nonmagical bludgeoning...")
    if any(dt == imm or dt in imm for imm in immunities):
        multiplier = 0.0
        note = 'immune'
    elif any(dt == r or dt in r for r in resistances):
        multiplier = RESIST_HALF
        note = 'resisted'
    elif any(dt == v or dt in v for v in vulnerabilities):
        multiplier = VULN_DOUBLE
        note = 'vulnerable'

    effective = int(amount * multiplier)
    if effective <= 0 and multiplier == 0:
        return {
            'combatant': combatant, 'damage_taken': 0,
            'temp_hp_absorbed': 0, 'hp_lost': 0, 'note': note,
        }

    temp = combatant.get('temp_hp') or 0
    absorbed = min(temp, effective)
    remaining = effective - absorbed
    current = combatant.get('current_hp', 0)
    new_hp = max(0, current - remaining)

    next_c = dict(combatant)
    next_c['temp_hp'] = temp - absorbed
    next_c['current_hp'] = new_hp

    # PC chegou a 0: marca unconscious + começa death saves se ainda não tem
    if next_c.get('type') == 'pc' and new_hp == 0 and current > 0:
        conds = list(next_c.get('conditions') or [])
        if 'unconscious' not in conds:
            conds.append('unconscious')
        next_c['conditions'] = conds
        if not next_c.get('death_saves'):
            next_c['death_saves'] = {'success': 0, 'fail': 0}
    elif next_c.get('type') == 'monster' and new_hp == 0:
        next_c['defeated'] = True

    return {
        'combatant': next_c,
        'damage_taken': effective,
        'temp_hp_absorbed': absorbed,
        'hp_lost': remaining,
        'note': note,
    }


def apply_healing(combatant, amount):
    """Cura. Não passa do max_hp. Tira condição unconscious se voltar > 0."""
    stats = combatant.get('stats') or {}
    max_hp = stats.get('max_hp') or combatant.get('current_hp', 0)
    new_hp = min(max_hp, (combatant.get('current_hp') or 0) + int(amount))
    next_c = dict(combatant)
    next_c['current_hp'] = new_hp
    if new_hp > 0 and (next_c.get('conditions') or []):
        next_c['conditions'] = [c for c in next_c['conditions'] if c != 'unconscious']
    if combatant.get('type') == 'pc' and new_hp > 0:
        next_c['death_saves'] = {'success': 0, 'fail': 0}
    if next_c.get('defeated') and new_hp > 0:
        next_c['defeated'] = False
    return {'combatant': next_c, 'healed': new_hp - (combatant.get('current_hp') or 0)}


# ============================================================
# CONDIÇÕES
# ============================================================
ALL_CONDITIONS = {
    'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
    'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
    'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion',
}


def add_condition(combatant, condition, rounds=None):
    """Adiciona condição. Respeita immunities. Se rounds, adiciona effect com duração."""
    if condition not in ALL_CONDITIONS:
        return {'combatant': combatant, 'applied': False, 'reason': 'unknown_condition'}
    immune = [s.lower() for s in (combatant.get('stats', {}).get('condition_immunities') or [])]
    if condition in immune:
        return {'combatant': combatant, 'applied': False, 'reason': 'immune'}
    conds = list(combatant.get('conditions') or [])
    if condition not in conds:
        conds.append(condition)
    next_c = dict(combatant)
    next_c['conditions'] = conds
    if rounds:
        effects = list(next_c.get('effects') or [])
        effects.append({'id': f'cond:{condition}', 'name': condition, 'rounds_left': int(rounds)})
        next_c['effects'] = effects
    return {'combatant': next_c, 'applied': True}


def remove_condition(combatant, condition):
    next_c = dict(combatant)
    next_c['conditions'] = [c for c in (combatant.get('conditions') or []) if c != condition]
    next_c['effects'] = [e for e in (combatant.get('effects') or []) if e.get('name') != condition]
    return {'combatant': next_c}


def tick_effects(combatant):
    """Decrementa duração das condições com effects. Remove ao chegar a 0."""
    effects = combatant.get('effects') or []
    new_effects = []
    expired = []
    for e in effects:
        rl = (e.get('rounds_left') or 0) - 1
        if rl <= 0:
            expired.append(e.get('name'))
        else:
            new_effects.append({**e, 'rounds_left': rl})
    next_c = dict(combatant)
    next_c['effects'] = new_effects
    if expired:
        next_c['conditions'] = [c for c in (combatant.get('conditions') or []) if c not in expired]
    return {'combatant': next_c, 'expired': expired}


# ============================================================
# DEATH SAVES (PC a 0 HP)
# ============================================================
def death_save(combatant, *, forced_d20=None):
    """Rola death save pra um PC a 0 HP."""
    if combatant.get('type') != 'pc' or (combatant.get('current_hp') or 0) > 0:
        return {'combatant': combatant, 'applied': False}
    d = roll_d20(forced=forced_d20)
    nat = d['value']
    ds = dict(combatant.get('death_saves') or {'success': 0, 'fail': 0})
    note = None
    if nat == 20:
        # acordou com 1 HP
        next_c = dict(combatant)
        next_c['current_hp'] = 1
        next_c['conditions'] = [c for c in (combatant.get('conditions') or []) if c != 'unconscious']
        next_c['death_saves'] = {'success': 0, 'fail': 0}
        return {'combatant': next_c, 'd20': d, 'note': 'natural_20_revive'}
    if nat == 1:
        ds['fail'] = (ds.get('fail') or 0) + 2
        note = 'natural_1'
    elif nat >= 10:
        ds['success'] = (ds.get('success') or 0) + 1
    else:
        ds['fail'] = (ds.get('fail') or 0) + 1

    next_c = dict(combatant)
    if ds['success'] >= 3:
        ds = {'success': 0, 'fail': 0}
        # estabilizado
        next_c['conditions'] = (combatant.get('conditions') or []) + ['stable']
        note = 'stabilized'
    if ds['fail'] >= 3:
        # morto
        next_c['defeated'] = True
        next_c['conditions'] = ['dead']
        note = 'dead'
    next_c['death_saves'] = ds
    return {'combatant': next_c, 'd20': d, 'note': note}


# ============================================================
# Utilities pra view: encontrar combatente, atualizar lista
# ============================================================
def find_combatant(combatants, combatant_id):
    for c in combatants:
        if c.get('id') == combatant_id:
            return c
    return None


def replace_combatant(combatants, updated):
    """Retorna nova lista com o combatant substituído pelo id."""
    return [updated if c.get('id') == updated.get('id') else c for c in combatants]
