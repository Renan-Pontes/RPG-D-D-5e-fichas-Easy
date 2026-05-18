"""
Regras de progressão por classe e subclasse — Python.

Mantemos um subconjunto suficiente para validar e aplicar level-ups.
A renderização completa (descrições, traços) fica no frontend.

Formato por nível: dict com chaves:
  cantrips_known, spells_prepared (formula), features (list),
  auto_cantrips, auto_spells, subclass_choice, asi_or_feat,
  fighting_style_choice, expertise_choice, extra_attacks
"""

DRUID = {
    'class_id': 'druid',
    'hit_die': 8,
    'per_level': {
        1: {'cantrips_known': 2, 'spells_prepared': {'formula': 'wis+level'}},
        2: {'subclass_choice': True},
        4: {'asi_or_feat': True, 'cantrips_known': 3},
        8: {'asi_or_feat': True},
        10: {'cantrips_known': 4},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {
        'stars': {
            2: {'auto_cantrips': ['guidance']},
        },
        'moon': {},
        'land': {
            # land_type_spells é uma estrutura adicional consultada pelo engine
            # baseada em char['landType'].
            'land_type_spells': {
                'arctic':    {3: ['hold_person', 'spikeGrowth'], 5: ['sleet_storm', 'slow'],         7: ['freedomOfMovement', 'iceStorm'], 9: ['commune_with_nature', 'coneOfCold']},
                'coast':     {3: ['mirrorImage', 'misty_step'],   5: ['waterBreathing', 'waterWalk'], 7: ['controlWater', 'freedomOfMovement'], 9: ['conjureElemental', 'scrying']},
                'desert':    {3: ['blur', 'silence'],             5: ['createFood', 'protectionFromEnergy'], 7: ['blight', 'hallucinatoryTerrain'], 9: ['insectPlague', 'wallOfStone']},
                'forest':    {3: ['barkskin', 'spiderClimb'],     5: ['callLightning', 'plantGrowth'], 7: ['divination', 'freedomOfMovement'], 9: ['commune_with_nature', 'treeStride']},
                'grassland': {3: ['invisibility', 'pass_without_trace'], 5: ['daylight', 'haste'],    7: ['divination', 'freedomOfMovement'], 9: ['dream', 'insectPlague']},
                'mountain':  {3: ['spiderClimb', 'spikeGrowth'],  5: ['lightning_bolt', 'meld_into_stone'], 7: ['stoneShape', 'stoneskin'], 9: ['passwall', 'wallOfStone']},
                'swamp':     {3: ['acidArrow', 'darkness'],       5: ['waterWalk', 'stinkingCloud'],  7: ['freedomOfMovement', 'locateCreature'], 9: ['insectPlague', 'scrying']},
                'underdark': {3: ['spiderClimb', 'webSpell'],     5: ['gaseousForm', 'stinkingCloud'], 7: ['greaterInvisibility', 'stoneShape'], 9: ['cloudkill', 'insectPlague']},
            },
        },
        'spores': {},
        'wildfire': {},
        'dreams': {},
    },
}

FIGHTER = {
    'class_id': 'fighter',
    'hit_die': 10,
    'per_level': {
        1: {'fighting_style_choice': 1},
        3: {'subclass_choice': True},
        4: {'asi_or_feat': True},
        5: {'extra_attacks': 1},
        6: {'asi_or_feat': True},
        8: {'asi_or_feat': True},
        11: {'extra_attacks': 2},
        12: {'asi_or_feat': True},
        14: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
        20: {'extra_attacks': 3},
    },
    'subclass_per_level': {'champion': {3: {'fighting_style_choice': 0}}, 'battlemaster': {}},
}

WIZARD = {
    'class_id': 'wizard',
    'hit_die': 6,
    'per_level': {
        1: {'cantrips_known': 3, 'spells_prepared': {'formula': 'int+level'}},
        2: {'subclass_choice': True},
        4: {'asi_or_feat': True, 'cantrips_known': 4},
        8: {'asi_or_feat': True},
        10: {'cantrips_known': 5},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {'evocation': {}, 'divination': {}},
}

CLERIC = {
    'class_id': 'cleric',
    'hit_die': 8,
    'per_level': {
        1: {'cantrips_known': 3, 'spells_prepared': {'formula': 'wis+level'}, 'subclass_choice': True},
        4: {'asi_or_feat': True, 'cantrips_known': 4},
        8: {'asi_or_feat': True},
        10: {'cantrips_known': 5},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {
        'life': {
            # Domain spells sempre preparados
            1: {'auto_spells': ['bless', 'cureWounds']},
            3: {'auto_spells': ['lesserRestoration', 'spiritualWeapon']},
            5: {'auto_spells': ['beaconOfHope', 'revivify']},
            7: {'auto_spells': ['deathWard', 'guardianOfFaith']},
            9: {'auto_spells': ['massCureWounds', 'raiseDead']},
        },
        'light': {
            1: {'auto_cantrips': ['light'], 'auto_spells': ['burningHands', 'faerieFire']},
            3: {'auto_spells': ['flamingSphere', 'scorchingRay']},
            5: {'auto_spells': ['daylight', 'fireball']},
            7: {'auto_spells': ['guardianOfFaith', 'wallOfFire']},
            9: {'auto_spells': ['flameStrike', 'scrying']},
        },
        'knowledge': {
            1: {'auto_spells': ['commandSpell', 'identify']},
            3: {'auto_spells': ['augury', 'suggestion']},
            5: {'auto_spells': ['nondetection', 'speakWithDead']},
            7: {'auto_spells': ['arcaneEye', 'confusion']},
            9: {'auto_spells': ['legendLore', 'scrying']},
        },
    },
}

ROGUE = {
    'class_id': 'rogue',
    'hit_die': 8,
    'per_level': {
        1: {'expertise_choice': 2},
        3: {'subclass_choice': True},
        4: {'asi_or_feat': True},
        6: {'expertise_choice': 2},
        8: {'asi_or_feat': True},
        10: {'asi_or_feat': True},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {'thief': {}, 'assassin': {}, 'arcaneTrickster': {}},
}

BARBARIAN = {
    'class_id': 'barbarian',
    'hit_die': 12,
    'per_level': {
        3: {'subclass_choice': True},
        4: {'asi_or_feat': True},
        5: {'extra_attacks': 1},
        8: {'asi_or_feat': True},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {'berserker': {}, 'totem': {}},
}

PALADIN = {
    'class_id': 'paladin',
    'hit_die': 10,
    'per_level': {
        2: {'fighting_style_choice': 1, 'spells_prepared': {'formula': 'cha+halfLevel'}},
        3: {'subclass_choice': True},
        4: {'asi_or_feat': True},
        5: {'extra_attacks': 1},
        8: {'asi_or_feat': True},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {
        'devotion': {
            3: {'auto_spells': ['protectionFromEvilAndGood', 'sanctuary']},
            5: {'auto_spells': ['lesserRestoration', 'zoneOfTruth']},
            7: {'auto_spells': ['beaconOfHope', 'dispelMagic']},
            9: {'auto_spells': ['freedomOfMovement', 'guardianOfFaith']},
            13: {'auto_spells': ['commune', 'flameStrike']},
            17: {'auto_spells': ['holyAura']},
        },
        'oathbreaker': {},
        'vengeance': {},
    },
}

RANGER = {
    'class_id': 'ranger',
    'hit_die': 10,
    'per_level': {
        2: {'fighting_style_choice': 1, 'spells_prepared': {'formula': 'wis+halfLevel'}},
        3: {'subclass_choice': True},
        4: {'asi_or_feat': True},
        5: {'extra_attacks': 1},
        8: {'asi_or_feat': True},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {'hunter': {}, 'beastMaster': {}},
}

BARD = {
    'class_id': 'bard',
    'hit_die': 8,
    'per_level': {
        1: {'cantrips_known': 2},
        3: {'subclass_choice': True, 'expertise_choice': 2},
        4: {'asi_or_feat': True, 'cantrips_known': 3},
        8: {'asi_or_feat': True},
        10: {'cantrips_known': 4, 'expertise_choice': 2},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {'lore': {}, 'valor': {}, 'glamour': {}},
}

SORCERER = {
    'class_id': 'sorcerer',
    'hit_die': 6,
    'per_level': {
        1: {'cantrips_known': 4, 'subclass_choice': True},
        4: {'asi_or_feat': True, 'cantrips_known': 5},
        8: {'asi_or_feat': True},
        10: {'cantrips_known': 6},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {'draconic': {}, 'wildMagic': {}},
}

MONK = {
    'class_id': 'monk',
    'hit_die': 8,
    'per_level': {
        3: {'subclass_choice': True},
        4: {'asi_or_feat': True},
        5: {'extra_attacks': 1},
        8: {'asi_or_feat': True},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {'openHand': {}, 'shadow': {}, 'fourElements': {}},
}

WARLOCK = {
    'class_id': 'warlock',
    'hit_die': 8,
    'per_level': {
        1: {'cantrips_known': 2, 'subclass_choice': True},
        4: {'asi_or_feat': True, 'cantrips_known': 3},
        8: {'asi_or_feat': True},
        10: {'cantrips_known': 4},
        12: {'asi_or_feat': True},
        16: {'asi_or_feat': True},
        19: {'asi_or_feat': True},
    },
    'subclass_per_level': {
        'fiend': {
            1: {'auto_spells': ['burningHands', 'commandSpell']},
            3: {'auto_spells': ['blindnessDeafness', 'scorchingRay']},
            5: {'auto_spells': ['fireball', 'stinkingCloud']},
            7: {'auto_spells': ['fireShield', 'wallOfFire']},
            9: {'auto_spells': ['flameStrike', 'hallow']},
        },
        'hexblade': {
            1: {'auto_spells': ['shield', 'wrathfulSmite']},
            3: {'auto_spells': ['brandingSmite', 'magicWeapon']},
            5: {'auto_spells': ['blinkSpell', 'elemental_weapon']},
            7: {'auto_spells': ['phantasmal_killer', 'staggering_smite']},
            9: {'auto_spells': ['banishingSmite', 'cone_of_cold']},
        },
        'archfey': {},
        'greatOldOne': {},
    },
}

PROGRESSION_RULES = {
    'druid': DRUID,
    'fighter': FIGHTER,
    'wizard': WIZARD,
    'cleric': CLERIC,
    'rogue': ROGUE,
    'barbarian': BARBARIAN,
    'paladin': PALADIN,
    'ranger': RANGER,
    'bard': BARD,
    'sorcerer': SORCERER,
    'monk': MONK,
    'warlock': WARLOCK,
}


def prof_bonus(level):
    if level >= 17: return 6
    if level >= 13: return 5
    if level >= 9: return 4
    if level >= 5: return 3
    return 2
