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
    'actions': [{name, type, atk, damage, damageType, extraDamage?, save?,
                 recharge?, uses?, usesPer?, kind?, cost?, desc?}, ...],
    'legendary': {'uses': 3, 'lairUses': 4}?,          # definição (catálogo)
    'legendary_resistance': {'uses': 3, 'lairUses': 4}?,
  },
  # Estado dos recursos do monstro (ver init_resources):
  'action_state': {'<idx>': {'charged': bool} | {'uses_left': int}},
  'legendary': {'max': 3, 'remaining': 3, 'lair_max': 4?}?,
  'legendary_resistance': {'max': 3, 'remaining': 3, 'lair_max': 4?}?,
  'in_lair': False,             # no covil: usa lair_max
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
    """Rola 'XdY+Z'. Se double_dice (crítico), rola 2X dados. Aceita valor fixo ('1')."""
    if re.fullmatch(r'\s*-?\d+\s*', str(expr or '')):
        v = int(expr)
        return {'total': max(0, v), 'rolls': [], 'mod': v}
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
        # Dano adicional ("plus 5 (2d4) Fire damage") — rolado à parte, com tipo próprio.
        extras = []
        for extra in action.get('extraDamage') or []:
            if not isinstance(extra, dict) or not extra.get('damage'):
                continue
            ed = roll_dice(extra.get('damage'), double_dice=crit)
            extras.append({**ed, 'type': extra.get('damageType') or dmg_type, 'crit': crit})
        if extras:
            result['extra_damage'] = extras

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
# FALLOUT: ataque que erra MUITO desvia para outro alvo
# ============================================================
def _grid_distance(a, b):
    """Distância Chebyshev entre posições de dois combatentes.
    Posições podem estar ausentes — retorna infinito nesse caso.
    """
    pa = a.get('position') or {}
    pb = b.get('position') or {}
    if 'x' not in pa or 'y' not in pa or 'x' not in pb or 'y' not in pb:
        return float('inf')
    return max(abs(pa['x'] - pb['x']), abs(pa['y'] - pb['y']))


def pick_fallout_target(attacker, intended_target, all_combatants, *, rng=None):
    """Seleciona alvo do desvio quando o ataque erra feio.

    Regra: outro combatente vivo (não o atacante nem o alvo original),
    preferindo o MAIS PRÓXIMO no grid. Se não há grid (sem posição),
    pega o próximo na lista. Aliados do atacante recebem peso menor
    apenas pra empatar — se houver inimigos próximos do alvo, eles
    sofrem primeiro (lógica de "errou e atingiu quem estava na linha").
    Mas o desvio é principalmente sobre aliados que estavam atrás:
    espelha o pedido "acerta um aliado ou quem estiver mais perto".

    Retorna combatant dict ou None se não houver candidato.
    """
    candidates = [
        c for c in all_combatants
        if c.get('id') != attacker.get('id')
        and c.get('id') != intended_target.get('id')
        and not c.get('defeated')
        and (c.get('current_hp') or 0) > 0
    ]
    if not candidates:
        return None

    intended_pos = (intended_target.get('position') or {})
    has_grid = 'x' in intended_pos and 'y' in intended_pos

    if has_grid:
        # Ordena por distância ao alvo original (mais próximo primeiro).
        # Empate vai para qualquer um — usa secrets pra escolher aleatoriamente
        # entre os mais próximos pra não viciar a ordem.
        scored = []
        for c in candidates:
            dist = _grid_distance(c, intended_target)
            scored.append((dist, c))
        scored.sort(key=lambda x: x[0])
        nearest_dist = scored[0][0]
        ties = [c for d, c in scored if d == nearest_dist]
        return ties[secrets.randbelow(len(ties))] if ties else None

    # Sem grid: aleatório entre os candidatos
    return candidates[secrets.randbelow(len(candidates))]


def resolve_attack_with_fallout(attacker, intended_target, action, all_combatants, *,
                                 advantage=False, disadvantage=False,
                                 forced_d20=None, forced_damage=None,
                                 miss_by_threshold=5):
    """Ataque com desvio: se errar por miss_by_threshold ou for nat 1,
    re-rola contra outro alvo próximo (escolhido por pick_fallout_target).

    Retorna o resolve_attack regular, mais um campo 'fallout' opcional:
    {
      'triggered': True,
      'reason': 'natural_one' | 'miss_by_5',
      'redirected_to_id': str,
      'redirected_to_name': str,
      'second_attack': { ...mesma estrutura do resolve_attack regular... }
    }
    """
    primary = resolve_attack(attacker, intended_target, action,
                              advantage=advantage, disadvantage=disadvantage,
                              forced_d20=forced_d20, forced_damage=forced_damage)
    if primary['hit']:
        return primary

    target_ac = primary['target_ac']
    miss_margin = target_ac - primary['attack_total']
    triggers_fallout = primary['natural_one'] or miss_margin >= miss_by_threshold
    if not triggers_fallout:
        return primary

    new_target = pick_fallout_target(attacker, intended_target, all_combatants)
    if not new_target:
        return primary

    # Re-rola ataque contra novo alvo (sem forçar d20 desta vez — fallout é orgânico)
    second = resolve_attack(attacker, new_target, action,
                             advantage=False, disadvantage=False)
    primary['fallout'] = {
        'triggered': True,
        'reason': 'natural_one' if primary['natural_one'] else 'miss_by_5',
        'miss_margin': miss_margin,
        'redirected_to_id': new_target.get('id'),
        'redirected_to_name': new_target.get('name'),
        'second_attack': second,
    }
    return primary


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

    Dano adicional (action.extraDamage) é rolado à parte com seu tipo; condições
    em save.conditions são aplicadas a quem falhar (ver apply_save_results).
    """
    save = action.get('save') or {}
    ability = save.get('ability', 'DEX')
    dc = int(save.get('dc', 10))
    half = bool(save.get('halfOnSave', False))
    dmg_expr = action.get('damage', '0')
    dmg_type = action.get('damageType', 'force')
    conditions = [c for c in (save.get('conditions') or []) if c in ALL_CONDITIONS]
    forced_d20s = forced_d20s or {}

    # Rola o dano uma vez (todos sofrem o mesmo total base)
    base = roll_dice(dmg_expr) if dmg_expr and dmg_expr != '0' else None
    extra_rolls = []
    for extra in action.get('extraDamage') or []:
        if isinstance(extra, dict) and extra.get('damage'):
            extra_rolls.append({**roll_dice(extra['damage']), 'type': extra.get('damageType') or dmg_type})

    out = []
    for tgt in targets:
        r = resolve_save(tgt, ability, dc, forced_d20=forced_d20s.get(tgt.get('id')))

        def portion(full):
            return full // 2 if (r['success'] and half) else (0 if r['success'] else full)

        parts = []
        if base:
            parts.append({'amount': portion(base['total']), 'type': dmg_type})
        for er in extra_rolls:
            parts.append({'amount': portion(er['total']), 'type': er['type']})
        parts = [p for p in parts if p['amount'] > 0]
        out.append({
            'target_id': tgt.get('id'),
            'target_name': tgt.get('name'),
            'save': r,
            'damage_taken': sum(p['amount'] for p in parts),
            'damage_type': dmg_type,
            'damage_parts': parts,
            'conditions': [] if r['success'] else conditions,
        })
    return {'damage_base': base, 'extra_damage': extra_rolls, 'per_target': out,
            'ability': ability, 'dc': dc, 'half_on_save': half}


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


def attack_damage_parts(result):
    """Partes de dano de um resolve_attack que acertou: [{'amount', 'type'}]."""
    if not result.get('hit') or not result.get('damage'):
        return []
    parts = [{'amount': result['damage']['total'], 'type': result['damage']['type']}]
    for e in result.get('extra_damage') or []:
        parts.append({'amount': e['total'], 'type': e['type']})
    return [p for p in parts if p['amount'] > 0]


def apply_damage_parts(combatant, parts):
    """Aplica várias parcelas de dano (cada uma com seu tipo, p/ resistências)."""
    cur = combatant
    taken = 0
    notes = []
    for p in parts:
        r = apply_damage(cur, int(p.get('amount') or 0), p.get('type'))
        cur = r['combatant']
        taken += r['damage_taken']
        if r['note']:
            notes.append(r['note'])
    return {'combatant': cur, 'damage_taken': taken, 'note': ','.join(notes) or None}


def apply_save_results(combatants, result):
    """Aplica dano e condições de um resolve_save_effect. Retorna (combatants, ids alterados)."""
    changed = []
    for entry in result['per_target']:
        tgt = find_combatant(combatants, entry['target_id'])
        if not tgt:
            continue
        cur = tgt
        if entry.get('damage_parts'):
            applied = apply_damage_parts(cur, entry['damage_parts'])
            cur = applied['combatant']
            entry['damage_taken'] = applied['damage_taken']
        applied_conds = []
        for cond in entry.get('conditions') or []:
            r = add_condition(cur, cond)
            cur = r['combatant']
            if r['applied']:
                applied_conds.append(cond)
        entry['conditions_applied'] = applied_conds
        entry['new_hp'] = cur.get('current_hp')
        entry['defeated'] = cur.get('defeated', False)
        if cur is not tgt:
            combatants = replace_combatant(combatants, cur)
            changed.append(cur.get('id'))
    return combatants, changed


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


# ============================================================
# RECURSOS DE MONSTRO: recarga, usos por dia, ações lendárias
# ============================================================
def _stats_actions(combatant):
    return (combatant.get('stats') or {}).get('actions') or []


def init_resources(combatant):
    """Garante action_state/legendary/legendary_resistance a partir das stats.

    Idempotente: não mexe no que já existe (combatentes antigos são migrados
    na primeira chamada).
    """
    stats = combatant.get('stats') or {}
    next_c = dict(combatant)
    state = dict(combatant.get('action_state') or {})
    for i, a in enumerate(_stats_actions(combatant)):
        key = str(i)
        if key in state or not isinstance(a, dict):
            continue
        if a.get('recharge'):
            state[key] = {'charged': True}
        elif a.get('uses'):
            state[key] = {'uses_left': int(a['uses'])}
    next_c['action_state'] = state
    leg = stats.get('legendary')
    if isinstance(leg, dict) and not combatant.get('legendary'):
        n = int(leg.get('uses') or 3)
        next_c['legendary'] = {'max': n, 'remaining': n, 'lair_max': leg.get('lairUses')}
    lr = stats.get('legendary_resistance')
    if isinstance(lr, dict) and not combatant.get('legendary_resistance'):
        n = int(lr.get('uses') or 3)
        next_c['legendary_resistance'] = {'max': n, 'remaining': n, 'lair_max': lr.get('lairUses')}
    return next_c


def _res_max(combatant, key):
    res = combatant.get(key) or {}
    if combatant.get('in_lair') and res.get('lair_max'):
        return int(res['lair_max'])
    return int(res.get('max') or 0)


def legendary_max(combatant):
    return _res_max(combatant, 'legendary')


def legendary_resistance_max(combatant):
    return _res_max(combatant, 'legendary_resistance')


def action_availability(combatant, index):
    """(ok, motivo) — motivo: None | 'recharging' | 'no_uses_left' | 'no_legendary_actions'."""
    c = init_resources(combatant)
    actions = _stats_actions(c)
    if index < 0 or index >= len(actions):
        return False, 'invalid_action_index'
    a = actions[index]
    st = (c.get('action_state') or {}).get(str(index)) or {}
    if a.get('kind') == 'legendary':
        cost = int(a.get('cost') or 1)
        if (c.get('legendary') or {}).get('remaining', 0) < cost:
            return False, 'no_legendary_actions'
    if a.get('recharge') and not st.get('charged', True):
        return False, 'recharging'
    if a.get('uses') and st.get('uses_left', 1) <= 0:
        return False, 'no_uses_left'
    return True, None


def consume_action(combatant, index):
    """Marca o uso: recarga gasta, uso diário −1, ações lendárias −custo."""
    c = init_resources(combatant)
    actions = _stats_actions(c)
    if index < 0 or index >= len(actions):
        return c
    a = actions[index]
    state = dict(c.get('action_state') or {})
    key = str(index)
    if a.get('recharge'):
        state[key] = {**(state.get(key) or {}), 'charged': False}
    elif a.get('uses'):
        cur = (state.get(key) or {}).get('uses_left', int(a['uses']))
        state[key] = {**(state.get(key) or {}), 'uses_left': max(0, int(cur) - 1)}
    c['action_state'] = state
    if a.get('kind') == 'legendary' and c.get('legendary'):
        leg = dict(c['legendary'])
        leg['remaining'] = max(0, int(leg.get('remaining') or 0) - int(a.get('cost') or 1))
        c['legendary'] = leg
    return c


def start_turn(combatant, *, roll=None):
    """Início do turno do monstro: rola recarga (d6) das ações gastas e
    restaura as ações lendárias. Retorna {'combatant', 'recharge_rolls', 'legendary_reset'}.
    """
    roll = roll or (lambda: roll_die(6))
    c = init_resources(combatant)
    actions = _stats_actions(c)
    state = dict(c.get('action_state') or {})
    rolls = []
    for key, st in list(state.items()):
        try:
            i = int(key)
        except (TypeError, ValueError):
            continue
        if i >= len(actions) or not actions[i].get('recharge') or st.get('charged', True):
            continue
        need = int(actions[i]['recharge'])
        v = int(roll())
        ok = v >= need
        state[key] = {**st, 'charged': ok}
        name = actions[i].get('name')
        rolls.append({'index': i, 'name': name.get('en') if isinstance(name, dict) else name,
                      'roll': v, 'need': need, 'recharged': ok})
    c['action_state'] = state
    reset = False
    if c.get('legendary'):
        leg = dict(c['legendary'])
        mx = legendary_max(c)
        reset = leg.get('remaining') != mx
        leg['remaining'] = mx
        c['legendary'] = leg
    return {'combatant': c, 'recharge_rolls': rolls, 'legendary_reset': reset}


def set_resources(combatant, patch):
    """Ajuste manual do mestre. patch aceita:
    actionIndex + charged (bool) | usesLeft (int);
    legendaryRemaining, inLair (bool), legendaryResistanceRemaining; restoreAll (bool).
    """
    c = init_resources(combatant)
    actions = _stats_actions(c)
    state = dict(c.get('action_state') or {})
    if patch.get('restoreAll'):
        for i, a in enumerate(actions):
            if a.get('recharge'):
                state[str(i)] = {'charged': True}
            elif a.get('uses'):
                state[str(i)] = {'uses_left': int(a['uses'])}
        if c.get('legendary'):
            c['legendary'] = {**c['legendary'], 'remaining': legendary_max(c)}
        if c.get('legendary_resistance'):
            c['legendary_resistance'] = {**c['legendary_resistance'], 'remaining': legendary_resistance_max(c)}
    idx = patch.get('actionIndex')
    if idx is not None:
        idx = int(idx)
        if 0 <= idx < len(actions):
            a = actions[idx]
            st = dict(state.get(str(idx)) or {})
            if 'charged' in patch and a.get('recharge'):
                st['charged'] = bool(patch['charged'])
            if 'usesLeft' in patch and a.get('uses'):
                st['uses_left'] = max(0, min(int(a['uses']), int(patch['usesLeft'])))
            state[str(idx)] = st
    c['action_state'] = state
    if 'inLair' in patch:
        was, now = bool(c.get('in_lair')), bool(patch['inLair'])
        c['in_lair'] = now
        if was != now:
            for key, mx_fn in (('legendary', legendary_max), ('legendary_resistance', legendary_resistance_max)):
                if not c.get(key):
                    continue
                res = dict(c[key])
                rem = int(res.get('remaining') or 0)
                if now:  # entrar no covil concede os usos extras
                    rem += mx_fn(c) - int(res.get('max') or 0)
                res['remaining'] = max(0, min(mx_fn(c), rem))
                c[key] = res
    if c.get('legendary') and 'legendaryRemaining' in patch:
        c['legendary'] = {**c['legendary'],
                          'remaining': max(0, min(legendary_max(c), int(patch['legendaryRemaining'])))}
    if c.get('legendary_resistance') and 'legendaryResistanceRemaining' in patch:
        c['legendary_resistance'] = {**c['legendary_resistance'],
                                     'remaining': max(0, min(legendary_resistance_max(c), int(patch['legendaryResistanceRemaining'])))}
    return c
