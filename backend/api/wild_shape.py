"""
Wild Shape — lógica server-side.

Estado persistido em Character.data['wildShape']:
{
  'active': True,
  'beastId': 'wolf',
  'beastName': 'Wolf',
  'preTransformHp': 15,
  'preTransformTempHp': 0,
  'beastMaxHp': 11,
  'beastCurrentHp': 11,
  'beastAc': 13,
  'beastStats': {'str':12,'dex':15,...},
  'beastActions': [...],
  'beastSpeed': 40,
  'beastSize': 'Medium',
  'transformedAt': '2026-05-17T...'
}

Regras 5e (simplificadas):
- Druida consome 1 uso de Wild Shape.
- Druida usa stats físicos da fera (FOR/DES/CON) e mentais próprios (INT/SAB/CAR).
- HP da fera é separado. Dano vai pra fera primeiro; quando ela cai a 0, o
  dano excedente vai pro HP do druida e ele sai da forma.
- Sair voluntariamente: HP da fera é descartado, HP do druida é o que estava
  ao transformar (menos qualquer dano que vazou).
"""
from django.utils import timezone


def max_cr_for(level, subclass):
    """CR máximo permitido pela regra de Wild Shape."""
    if subclass == 'moon':
        return max(1, level // 3) if level >= 6 else 1
    # Padrão (PHB)
    if level >= 8:
        return 1.0
    if level >= 4:
        return 0.5
    return 0.25


def beast_eligible(level, subclass, beast):
    """Verifica se uma fera é elegível para o druida transformar."""
    cr = beast.get('crNum', 0)
    if cr > max_cr_for(level, subclass):
        return False, 'cr_too_high'
    is_moon = subclass == 'moon'
    if not is_moon and level < 8 and beast.get('fly'):
        return False, 'no_fly_below_8'
    if level < 4 and beast.get('swim'):
        return False, 'no_swim_below_4'
    return True, None


def transform(character_data, beast):
    """Aplica transformação no data do personagem. Retorna novo data + uses_remaining.

    Não verifica permissão; o caller (view) faz isso.
    Não verifica usos restantes — caller faz e chama esta função se OK.
    """
    if (character_data.get('className') or '').lower() != 'druid':
        return character_data, 'not_druid'
    if (character_data.get('wildShape') or {}).get('active'):
        return character_data, 'already_transformed'

    next_data = dict(character_data)
    uses = next_data.get('wildShapeUses') or 0
    next_data['wildShapeUses'] = uses + 1

    next_data['wildShape'] = {
        'active': True,
        'beastId': beast.get('id'),
        'beastName': beast.get('name') or beast.get('id'),
        'preTransformHp': next_data.get('currentHp') or 0,
        'preTransformTempHp': next_data.get('tempHp') or 0,
        'beastMaxHp': int(beast.get('hp') or 1),
        'beastCurrentHp': int(beast.get('hp') or 1),
        'beastAc': int(beast.get('ac') or 10),
        'beastStats': {k: beast.get(k) for k in ['str', 'dex', 'con', 'int', 'wis', 'cha']},
        'beastActions': beast.get('actions') or [],
        'beastSpeed': beast.get('speed') or 30,
        'beastSize': beast.get('size') or 'Medium',
        'transformedAt': timezone.now().isoformat(),
    }
    # Enquanto transformado, currentHp visível é da fera; temp_hp some
    next_data['currentHp'] = next_data['wildShape']['beastCurrentHp']
    next_data['tempHp'] = 0
    return next_data, None


def end_transform(character_data, excess_damage=0):
    """Sai da forma selvagem. Restaura HP humanoide menos o dano excedente.

    excess_damage: dano que sobrou após reduzir a fera a 0. Subtraído do HP
    pré-transformação. Se 0 (voluntário), restaura como estava.
    """
    ws = character_data.get('wildShape') or {}
    if not ws.get('active'):
        return character_data, 'not_transformed'

    next_data = dict(character_data)
    pre_hp = ws.get('preTransformHp') or 0
    new_hp = max(0, pre_hp - max(0, int(excess_damage)))
    next_data['currentHp'] = new_hp
    next_data['tempHp'] = ws.get('preTransformTempHp') or 0
    next_data['wildShape'] = {'active': False}
    return next_data, None


def apply_damage_in_wild_shape(character_data, damage):
    """Aplica dano enquanto druida está em Wild Shape.

    Regra: dano vai primeiro pra HP da fera. Se ela chegar a 0, o excedente
    vai pro HP humanoide e a transformação termina.
    """
    ws = character_data.get('wildShape') or {}
    if not ws.get('active'):
        return character_data, 0, False  # não estava transformado

    beast_hp = ws.get('beastCurrentHp') or 0
    if damage <= beast_hp:
        new_data = dict(character_data)
        new_data['wildShape'] = dict(ws)
        new_data['wildShape']['beastCurrentHp'] = beast_hp - damage
        new_data['currentHp'] = beast_hp - damage
        return new_data, damage, False

    # Dano excede HP da fera — termina forma + transfere excedente
    excess = damage - beast_hp
    next_data, _ = end_transform(character_data, excess_damage=excess)
    return next_data, damage, True  # True = saiu da forma
