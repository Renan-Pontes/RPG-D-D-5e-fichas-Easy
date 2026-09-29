"""Magias da espécie no apply_autos do servidor (espelho de frontend species.js)."""
from django.test import SimpleTestCase

from api.progression import apply_autos
from api.progression.species import species_spell_ids


def _char(race, level=1, choices=None, **extra):
    return {'rulesVersion': '2024', 'race': race, 'className': 'fighter', 'level': level,
            'speciesChoices': choices or {}, 'spells': [], **extra}


class SpeciesSpellsTests(SimpleTestCase):
    def test_elf_drow_lineage_by_level(self):
        sc = {'lineage': 'drow', 'spellAbility': 'wis'}
        self.assertEqual(species_spell_ids(_char('elf', 1, sc)), ['dancingLights'])
        self.assertEqual(species_spell_ids(_char('elf', 3, sc)), ['dancingLights', 'faerieFire'])
        self.assertEqual(species_spell_ids(_char('elf', 5, sc)), ['dancingLights', 'faerieFire', 'darkness'])

    def test_high_elf_cantrip_default_and_choice(self):
        self.assertIn('prestidigitation', species_spell_ids(_char('elf', 1, {'lineage': 'high'})))
        ids = species_spell_ids(_char('elf', 1, {'lineage': 'high', 'cantrip': 'fireBolt'}))
        self.assertIn('fireBolt', ids)
        self.assertNotIn('prestidigitation', ids)

    def test_tiefling_and_legacy_races(self):
        ids = species_spell_ids(_char('tiefling', 5, {'lineage': 'infernal'}))
        self.assertEqual(sorted(ids), ['darkness', 'fireBolt', 'hellishRebuke', 'thaumaturgy'])
        drow_2014 = {'rulesVersion': '2014', 'race': 'drow', 'level': 3}
        self.assertEqual(species_spell_ids(drow_2014), ['dancingLights', 'faerieFire'])
        self.assertEqual(species_spell_ids(_char('halfling')), [])

    def test_apply_autos_adds_species_and_keeps_feat_autos(self):
        c = _char('elf', 3, {'lineage': 'wood'}, spells=[
            {'id': 'mageHand', 'prepared': True, 'auto': True, 'feat': True},
            {'id': 'dancingLights', 'prepared': True, 'auto': True, 'species': True},
        ])
        out = apply_autos(c)
        ids = [s['id'] for s in out['spells']]
        self.assertIn('druidcraft', ids)
        self.assertIn('longstrider', ids)
        self.assertIn('mageHand', ids, 'autos de talento não são apagados pelo servidor')
        self.assertNotIn('dancingLights', ids, 'auto de linhagem antiga sai')
        self.assertTrue(next(s for s in out['spells'] if s['id'] == 'druidcraft').get('species'))
