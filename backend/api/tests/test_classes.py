"""
Cobertura por classe — paridade com frontend/tests/classes.test.js.
"""
from django.test import SimpleTestCase
from api.progression import compute_progression

ABILITIES = {'str': 14, 'dex': 14, 'con': 14, 'int': 14, 'wis': 14, 'cha': 14}


def build(class_name, level, subclass=None, **extra):
    return {'className': class_name, 'level': level, 'subclass': subclass, 'abilities': ABILITIES, **extra}


class ClericLifeAutoSpellsTests(SimpleTestCase):
    def test_level_1_grants_bless_and_cure_wounds(self):
        p = compute_progression(build('cleric', 1, 'life'))
        self.assertIn('bless', p['auto_spells'])
        self.assertIn('cureWounds', p['auto_spells'])

    def test_level_9_has_all_domain_spells_accumulated(self):
        p = compute_progression(build('cleric', 9, 'life'))
        for s in ['bless', 'cureWounds', 'lesserRestoration', 'spiritualWeapon',
                  'beaconOfHope', 'revivify', 'deathWard', 'guardianOfFaith',
                  'massCureWounds', 'raiseDead']:
            self.assertIn(s, p['auto_spells'], f'falta {s}')


class DruidLandTests(SimpleTestCase):
    def test_forest_at_5(self):
        p = compute_progression(build('druid', 5, 'land', landType='forest'))
        for s in ['barkskin', 'spiderClimb', 'callLightning', 'plantGrowth']:
            self.assertIn(s, p['auto_spells'])

    def test_no_land_type_pending_choice(self):
        p = compute_progression(build('druid', 3, 'land'))
        self.assertTrue(any(c['type'] == 'landType' for c in p['pending_choices']))

    def test_arctic_at_9(self):
        p = compute_progression(build('druid', 9, 'land', landType='arctic'))
        self.assertIn('coneOfCold', p['auto_spells'])

    def test_mountain_differs_from_swamp(self):
        m = compute_progression(build('druid', 5, 'land', landType='mountain'))
        s = compute_progression(build('druid', 5, 'land', landType='swamp'))
        self.assertNotEqual(set(m['auto_spells']), set(s['auto_spells']))


class PaladinDevotionTests(SimpleTestCase):
    def test_devotion_at_3_grants_oath_spells(self):
        p = compute_progression(build('paladin', 3, 'devotion'))
        self.assertIn('protectionFromEvilAndGood', p['auto_spells'])
        self.assertIn('sanctuary', p['auto_spells'])

    def test_devotion_accumulates_to_17(self):
        p = compute_progression(build('paladin', 17, 'devotion'))
        for s in ['protectionFromEvilAndGood', 'sanctuary', 'lesserRestoration',
                  'zoneOfTruth', 'beaconOfHope', 'dispelMagic', 'freedomOfMovement',
                  'guardianOfFaith', 'commune', 'flameStrike', 'holyAura']:
            self.assertIn(s, p['auto_spells'], f'falta {s}')


class WarlockHexbladeTests(SimpleTestCase):
    def test_hexblade_at_1(self):
        p = compute_progression(build('warlock', 1, 'hexblade'))
        self.assertIn('shield', p['auto_spells'])
        self.assertIn('wrathfulSmite', p['auto_spells'])

    def test_fiend_at_5_has_fireball(self):
        p = compute_progression(build('warlock', 5, 'fiend'))
        self.assertIn('fireball', p['auto_spells'])


class AsiLevelsCoverageTests(SimpleTestCase):
    def test_canonical_asi(self):
        for cls in ['barbarian', 'bard', 'cleric', 'druid', 'monk', 'paladin', 'ranger',
                    'sorcerer', 'warlock', 'wizard']:
            p = compute_progression(build(cls, 20))
            self.assertEqual(sorted(p['asi_levels']), [4, 8, 12, 16, 19], f'{cls} asi: {p["asi_levels"]}')

    def test_fighter_extra_asis(self):
        p = compute_progression(build('fighter', 20))
        self.assertEqual(sorted(p['asi_levels']), [4, 6, 8, 12, 14, 16, 19])

    def test_rogue_extra_asi(self):
        p = compute_progression(build('rogue', 20))
        self.assertEqual(sorted(p['asi_levels']), [4, 8, 10, 12, 16, 19])


class ExtraAttacksTests(SimpleTestCase):
    def test_fighter_extra_attacks(self):
        self.assertEqual(compute_progression(build('fighter', 5))['extra_attacks'], 1)
        self.assertEqual(compute_progression(build('fighter', 11))['extra_attacks'], 2)
        self.assertEqual(compute_progression(build('fighter', 20))['extra_attacks'], 3)

    def test_barbarian_paladin_ranger_get_1_at_5(self):
        for cls in ['barbarian', 'paladin', 'ranger', 'monk']:
            self.assertEqual(compute_progression(build(cls, 5))['extra_attacks'], 1)
