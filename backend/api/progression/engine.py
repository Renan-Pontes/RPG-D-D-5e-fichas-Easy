"""
Engine de progressão — Python.

Espelha frontend/src/progression/engine.js. Aqui foco em:
  - prof_bonus
  - compute_progression (subset: features omitidas, mantém autos/escolhas)
  - apply_autos (idempotente, igual ao JS)
  - validate_level_up
  - apply_approval_to_character (move payload aprovado para o data da ficha)
"""
import math
from .rules import PROGRESSION_RULES, prof_bonus, rules_for  # re-export

ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha']


def _ability_mod(score):
    return (score - 10) // 2 if score else 0


def _ability_score(character, ability):
    base = (character.get('abilities') or {}).get(ability) or 10
    bonus = (character.get('raceBonus') or {}).get(ability) or 0
    return base + bonus


def _compute_spells_prepared(formula, character):
    if isinstance(formula, (int, float)):
        return int(formula)
    if not isinstance(formula, str):
        return 0
    level = character.get('level', 1) or 1
    full_map = {'wis+level': 'wis', 'int+level': 'int', 'cha+level': 'cha'}
    half_map = {'wis+halfLevel': 'wis', 'cha+halfLevel': 'cha', 'int+halfLevel': 'int'}
    if formula in full_map:
        return max(1, _ability_mod(_ability_score(character, full_map[formula])) + level)
    if formula in half_map:
        return max(1, _ability_mod(_ability_score(character, half_map[formula])) + (level // 2))
    return 0


def compute_progression(character):
    out = {
        'class_id': character.get('className'),
        'level': character.get('level', 1) or 1,
        'subclass': character.get('subclass'),
        'prof_bonus': prof_bonus(character.get('level', 1) or 1),
        'auto_cantrips': [],
        'auto_spells': [],
        'cantrips_known': 0,
        'spells_known': 0,
        'features': [],
        'spells_prepared': 0,
        'extra_attacks': 0,
        'fighting_styles': 0,
        'expertise_slots': 0,
        'asi_levels': [],
        'pending_choices': [],
    }
    rule = rules_for(character)
    if not rule:
        return out

    level = out['level']
    for lv in range(1, level + 1):
        _apply_node(out, rule['per_level'].get(lv, {}), lv, 'class')
        if out['subclass']:
            sub_rule = (rule.get('subclass_per_level') or {}).get(out['subclass'], {})
            _apply_node(out, sub_rule.get(lv, {}), lv, 'subclass')
            # Druid Land: spells dependentes de landType
            land_table = sub_rule.get('land_type_spells')
            if land_table and character.get('landType'):
                land_spells = land_table.get(character['landType'], {}).get(lv)
                if isinstance(land_spells, list):
                    out['auto_spells'].extend(land_spells)
        elif rule['per_level'].get(lv, {}).get('subclass_choice'):
            out['pending_choices'].append({'level': lv, 'type': 'subclass', 'reason': 'Escolha sua subclasse'})
    if (character.get('className') == 'druid' and character.get('subclass') == 'land'
            and not character.get('landType') and (character.get('level') or 0) >= 3):
        out['pending_choices'].append({'level': 3, 'type': 'landType', 'reason': 'Escolha um terreno (Círculo da Terra)'})

    # Spells prepared baseado no último node que define
    for lv in range(level, 0, -1):
        node = rule['per_level'].get(lv, {})
        if node.get('spells_prepared'):
            out['spells_prepared'] = _compute_spells_prepared(node['spells_prepared'].get('formula'), character)
            break

    # ASI/talento já escolhidos (levelChoices[nível]) deixam de ser pendência.
    done = character.get('levelChoices') or {}
    out['pending_choices'] = [
        c for c in out['pending_choices']
        if not (c['type'] in ('asiOrFeat', 'epicBoon') and (done.get(str(c['level'])) or done.get(c['level'])))
    ]

    out['auto_cantrips'] = list(dict.fromkeys(out['auto_cantrips']))  # dedup mantendo ordem
    out['auto_spells'] = list(dict.fromkeys(out['auto_spells']))
    return out


def _apply_node(out, node, level, source):
    if not node:
        return
    out['features'].extend({'level': level, 'source': source, **f} for f in node.get('features', []))
    if 'spells_known' in node:
        out['spells_known'] = max(out['spells_known'], node['spells_known'])
    if 'auto_cantrips' in node:
        out['auto_cantrips'].extend(node['auto_cantrips'])
    if 'auto_spells' in node:
        out['auto_spells'].extend(node['auto_spells'])
    if 'cantrips_known' in node:
        out['cantrips_known'] = max(out['cantrips_known'], node['cantrips_known'])
    if 'extra_attacks' in node:
        out['extra_attacks'] = max(out['extra_attacks'], node['extra_attacks'])
    if node.get('fighting_style_choice'):
        out['fighting_styles'] += node['fighting_style_choice']
        out['pending_choices'].append({'level': level, 'type': 'fightingStyle', 'reason': 'Escolha um Estilo de Combate'})
    if node.get('expertise_choice'):
        out['expertise_slots'] += node['expertise_choice']
        out['pending_choices'].append({'level': level, 'type': 'expertise', 'reason': 'Escolha perícias para Expertise'})
    if node.get('asi_or_feat'):
        out['asi_levels'].append(level)
        out['pending_choices'].append({'level': level, 'type': 'asiOrFeat', 'reason': 'ASI ou Feat'})
    if node.get('epicBoon'):
        out['pending_choices'].append({'level': level, 'type': 'epicBoon', 'reason': 'Escolha uma Dádiva Épica ou outro talento elegível'})


def apply_autos(character):
    """Adiciona truques automáticos da subclasse ao data do personagem.
    Idempotente — não duplica. Remove autos antigos que não fazem mais parte."""
    prog = compute_progression(character)
    spells = character.get('spells') or []
    norm = []
    for s in spells:
        if isinstance(s, str):
            norm.append({'id': s, 'prepared': False})
        else:
            norm.append(dict(s))

    valid_auto_ids = set(prog['auto_cantrips']) | set(prog['auto_spells'])
    filtered = [s for s in norm if not s.get('auto') or s.get('id') in valid_auto_ids]
    existing = {s['id'] for s in filtered}
    for sid in prog['auto_cantrips']:
        if sid not in existing:
            filtered.append({'id': sid, 'prepared': True, 'auto': True})
            existing.add(sid)
    for sid in prog['auto_spells']:
        if sid not in existing:
            filtered.append({'id': sid, 'prepared': True, 'auto': True})
            existing.add(sid)

    next_data = dict(character)
    next_data['spells'] = filtered
    next_data['progressionState'] = prog
    return next_data


def validate_level_up(character, proposal):
    issues = []
    from_level = character.get('level', 1) or 1
    to_level = proposal.get('toLevel')
    if not isinstance(to_level, int) or to_level <= from_level:
        issues.append('toLevel deve ser maior que o nível atual')
    elif to_level > 20:
        issues.append('Nível máximo é 20')
    elif to_level - from_level > 1:
        issues.append('Apenas 1 nível por aprovação')
    hp = proposal.get('hpGain')
    if hp is not None:
        try:
            hp = int(hp)
            if hp < 1 or hp > 20:
                issues.append('hpGain fora da faixa esperada')
        except (TypeError, ValueError):
            issues.append('hpGain inválido')
    return {'valid': not issues, 'issues': issues}


HIT_DIE = {
    'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
    'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8, 'rogue': 8, 'warlock': 8, 'artificer': 8,
    'sorcerer': 6, 'wizard': 6,
}


def max_hp_gain(character):
    """Maior ganho de PV legítimo num nível: dado de vida máximo + mod. de CON (mínimo 1)."""
    die = HIT_DIE.get(character.get('className'), 8)
    return max(1, die + _ability_mod(_ability_score(character, 'con')))


def validate_level_choice(character, level, choice):
    """Espelha validateLevelChoice (frontend/src/progression/engine.js)."""
    issues = []
    prog = compute_progression({**character, 'levelChoices': {}})
    epic_levels = [c['level'] for c in prog['pending_choices'] if c['type'] == 'epicBoon']
    if level not in prog['asi_levels'] and level not in epic_levels:
        issues.append('Este nível não concede ASI/talento')
    done = character.get('levelChoices') or {}
    if done.get(str(level)) or done.get(level):
        issues.append('Escolha deste nível já registrada')
    if not isinstance(choice, dict) or choice.get('type') not in ('asi', 'feat'):
        issues.append('Tipo de escolha inválido')
        return {'valid': False, 'issues': issues}
    if level in epic_levels and choice['type'] != 'feat':
        issues.append('Este nível concede uma Dádiva Épica (talento)')
    if choice['type'] == 'asi':
        asi = choice.get('asi') or {}
        if not isinstance(asi, dict) or any(k not in ABILITIES for k in asi):
            issues.append('Atributo inválido')
            return {'valid': False, 'issues': issues}
        vals = list(asi.values())
        if any(not isinstance(v, int) or isinstance(v, bool) or v < 0 or v > 2 for v in vals):
            issues.append('Cada atributo recebe 0, +1 ou +2')
        elif sum(vals) != 2:
            issues.append('Distribua exatamente 2 pontos')
        elif any(_ability_score(character, k) + v > 20 for k, v in asi.items()):
            issues.append('Atributo não pode passar de 20')
    else:
        feat = choice.get('feat')
        if not isinstance(feat, str) or not feat.strip() or len(feat) > 120:
            issues.append('Informe o nome do talento')
    return {'valid': not issues, 'issues': issues}


def apply_level_choice(character, level, choice):
    nxt = dict(character)
    nxt['levelChoices'] = {**(character.get('levelChoices') or {}), str(level): choice}
    if choice['type'] == 'asi':
        abilities = dict(character.get('abilities') or {})
        for k, v in (choice.get('asi') or {}).items():
            abilities[k] = (abilities.get(k) or 10) + v
        nxt['abilities'] = abilities
    else:
        note = choice.get('note') if isinstance(choice.get('note'), str) else ''
        nxt['feats'] = list(character.get('feats') or []) + [{'name': choice['feat'].strip(), 'note': note[:500], 'level': level}]
    return nxt


def apply_approval_to_character(data, approval_type, payload):
    """Devolve novo dict aplicando a mudança ao data da ficha. None se nada aplica."""
    nxt = dict(data) if isinstance(data, dict) else {}
    if approval_type == 'levelup':
        if isinstance(payload.get('toLevel'), int):
            nxt['level'] = payload['toLevel']
        if isinstance(payload.get('hpGain'), int):
            max_hp = (nxt.get('maxHp') or 0) + payload['hpGain']
            nxt['maxHp'] = max_hp
            cur = nxt.get('currentHp')
            if cur is None:
                nxt['currentHp'] = max_hp
            else:
                nxt['currentHp'] = min(cur + payload['hpGain'], max_hp)
        if isinstance(payload.get('spellsAdded'), list):
            existing = {s if isinstance(s, str) else s.get('id') for s in (nxt.get('spells') or [])}
            more = [{'id': sid, 'prepared': False} for sid in payload['spellsAdded'] if sid not in existing]
            nxt['spells'] = list(nxt.get('spells') or []) + more
        if isinstance(payload.get('featuresAdded'), list):
            nxt['customFeatures'] = list(nxt.get('customFeatures') or []) + payload['featuresAdded']
        # Escolha de ASI/talento já validada em approval_consume.
        if isinstance(payload.get('choice'), dict) and isinstance(payload.get('toLevel'), int):
            nxt = apply_level_choice(nxt, payload['toLevel'], payload['choice'])
        # aplica autos da nova subclasse/nível
        return apply_autos(nxt)
    if approval_type == 'feature':
        nxt['customFeatures'] = list(nxt.get('customFeatures') or []) + [payload]
        return nxt
    if approval_type == 'item':
        nxt['equipment'] = list(nxt.get('equipment') or []) + [payload]
        return nxt
    if approval_type == 'spell':
        sid = payload.get('id') or payload.get('spellId')
        if not sid:
            return None
        existing = {s if isinstance(s, str) else s.get('id') for s in (nxt.get('spells') or [])}
        if sid in existing:
            return None
        nxt['spells'] = list(nxt.get('spells') or []) + [{'id': sid, 'prepared': bool(payload.get('prepared'))}]
        return nxt
    return None
