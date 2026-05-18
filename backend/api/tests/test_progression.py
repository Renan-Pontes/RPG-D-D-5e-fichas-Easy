"""
Testes da engine de progressão em Python. Espelham os do JS para garantir paridade.
"""
from django.test import SimpleTestCase

from api.progression import (
    prof_bonus, compute_progression, apply_autos, validate_level_up,
    apply_approval_to_character,
)


def druid(level, subclass=None):
    return {
        'className': 'druid',
        'level': level,
        'subclass': subclass,
        'abilities': {'str': 8, 'dex': 14, 'con': 12, 'int': 13, 'wis': 16, 'cha': 10},
        'spells': [],
    }


class ProfBonusTests(SimpleTestCase):
    def test_canonical_scale(self):
        self.assertEqual(prof_bonus(1), 2)
        self.assertEqual(prof_bonus(4), 2)
        self.assertEqual(prof_bonus(5), 3)
        self.assertEqual(prof_bonus(8), 3)
        self.assertEqual(prof_bonus(9), 4)
        self.assertEqual(prof_bonus(13), 5)
        self.assertEqual(prof_bonus(17), 6)
        self.assertEqual(prof_bonus(20), 6)


class DruidProgressionTests(SimpleTestCase):
    def test_level_1_has_2_cantrips(self):
        p = compute_progression(druid(1))
        self.assertEqual(p['cantrips_known'], 2)
        self.assertEqual(p['spells_prepared'], 4)

    def test_level_2_no_subclass_pending(self):
        p = compute_progression(druid(2))
        choices = [c for c in p['pending_choices'] if c['type'] == 'subclass']
        self.assertEqual(len(choices), 1)

    def test_stars_at_2_grants_guidance(self):
        """EXEMPLO DO USUÁRIO: druida Estrelas no nível 2 ganha guidance auto."""
        p = compute_progression(druid(2, 'stars'))
        self.assertEqual(p['auto_cantrips'], ['guidance'])

    def test_moon_at_2_no_auto_cantrips(self):
        p = compute_progression(druid(2, 'moon'))
        self.assertEqual(p['auto_cantrips'], [])

    def test_level_4_gives_asi_and_cantrip(self):
        p = compute_progression(druid(4))
        self.assertEqual(p['cantrips_known'], 3)
        self.assertIn(4, p['asi_levels'])


class FighterProgressionTests(SimpleTestCase):
    def test_level_1_asks_fighting_style(self):
        p = compute_progression({'className': 'fighter', 'level': 1, 'abilities': {}})
        self.assertEqual(p['fighting_styles'], 1)
        self.assertTrue(any(c['type'] == 'fightingStyle' for c in p['pending_choices']))

    def test_level_5_extra_attack(self):
        p = compute_progression({'className': 'fighter', 'level': 5, 'abilities': {}})
        self.assertEqual(p['extra_attacks'], 1)


class RogueProgressionTests(SimpleTestCase):
    def test_level_1_offers_expertise(self):
        p = compute_progression({'className': 'rogue', 'level': 1, 'abilities': {}})
        self.assertEqual(p['expertise_slots'], 2)

    def test_level_6_acumulates_expertise(self):
        p = compute_progression({'className': 'rogue', 'level': 6, 'abilities': {}})
        self.assertEqual(p['expertise_slots'], 4)


class ApplyAutosTests(SimpleTestCase):
    def test_idempotent(self):
        c = druid(2, 'stars')
        once = apply_autos(c)
        twice = apply_autos(once)
        guidance_count = sum(1 for s in twice['spells'] if s['id'] == 'guidance')
        self.assertEqual(guidance_count, 1)

    def test_changing_subclass_removes_old_autos(self):
        c = druid(2, 'stars')
        c = apply_autos(c)
        self.assertTrue(any(s['id'] == 'guidance' for s in c['spells']))
        c['subclass'] = 'moon'
        c = apply_autos(c)
        self.assertFalse(any(s['id'] == 'guidance' for s in c['spells']))

    def test_keeps_manual_cantrips(self):
        c = druid(2, 'moon')
        c['spells'] = [{'id': 'druidcraft', 'prepared': True}]
        c = apply_autos(c)
        self.assertTrue(any(s['id'] == 'druidcraft' for s in c['spells']))


class ValidateLevelUpTests(SimpleTestCase):
    def test_reject_skipping(self):
        r = validate_level_up(druid(3), {'toLevel': 5})
        self.assertFalse(r['valid'])

    def test_reject_going_down(self):
        r = validate_level_up(druid(3), {'toLevel': 2})
        self.assertFalse(r['valid'])

    def test_accept_plus_one(self):
        r = validate_level_up(druid(3), {'toLevel': 4, 'hpGain': 6})
        self.assertTrue(r['valid'])

    def test_reject_absurd_hp(self):
        r = validate_level_up(druid(3), {'toLevel': 4, 'hpGain': 99})
        self.assertFalse(r['valid'])


class ApplyApprovalTests(SimpleTestCase):
    def test_levelup_applies_hp_and_level_and_autos(self):
        data = {**druid(2, 'stars'), 'currentHp': 15, 'maxHp': 15}
        nxt = apply_approval_to_character(data, 'levelup', {'toLevel': 3, 'hpGain': 6})
        self.assertEqual(nxt['level'], 3)
        self.assertEqual(nxt['maxHp'], 21)
        self.assertEqual(nxt['currentHp'], 21)
        # guidance entrou pela engine
        self.assertTrue(any(s['id'] == 'guidance' for s in nxt['spells']))

    def test_spell_approval_adds_spell(self):
        data = druid(3, 'stars')
        nxt = apply_approval_to_character(data, 'spell', {'id': 'cureWounds', 'prepared': True})
        self.assertTrue(any(s['id'] == 'cureWounds' for s in nxt['spells']))

    def test_item_approval_adds_to_equipment(self):
        data = druid(3)
        data['equipment'] = []
        nxt = apply_approval_to_character(data, 'item', {'name': 'Pocao de Cura', 'qty': 2})
        self.assertEqual(len(nxt['equipment']), 1)
