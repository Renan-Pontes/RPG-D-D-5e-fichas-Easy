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

    def test_other_book_races_innate_spells(self):
        firbolg = {'rulesVersion': '2014', 'race': 'firbolg', 'level': 1}
        self.assertEqual(sorted(species_spell_ids(firbolg)), ['detectMagic', 'disguiseSelf'])
        out = apply_autos({**firbolg, 'className': 'fighter', 'spells': []})
        self.assertEqual(sorted(s['id'] for s in out['spells'] if s.get('species')), ['detectMagic', 'disguiseSelf'])
        triton = {'rulesVersion': '2014', 'race': 'triton', 'level': 3}
        self.assertEqual(species_spell_ids(triton), ['fogCloud', 'gustOfWind'])
        githyanki = {'rulesVersion': '2014', 'race': 'githyanki', 'level': 5, 'speciesChoices': {'spellAbility': 'int'}}
        self.assertEqual(species_spell_ids(githyanki), ['mageHand', 'jump', 'mistyStep'])
        astral = {'rulesVersion': '2014', 'race': 'astral-elf', 'level': 1, 'speciesChoices': {'astralFire': 'light'}}
        self.assertEqual(species_spell_ids(astral), ['light'])

    def test_kobold_sorcery_cantrip_only_with_that_legacy(self):
        def kobold(sc):
            return {'rulesVersion': '2014', 'race': 'kobold', 'level': 1, 'speciesChoices': sc}
        self.assertEqual(species_spell_ids(kobold({'legacy': 'sorcery', 'cantrip': 'fireBolt'})), ['fireBolt'])
        self.assertEqual(species_spell_ids(kobold({'legacy': 'craftiness', 'cantrip': 'fireBolt'})), [])

    def test_legacy_race_on_2024_sheet_uses_2024_spell_ids(self):
        water = {'race': 'genasi-water', 'level': 3}
        self.assertEqual(species_spell_ids({**water, 'rulesVersion': '2014'}), ['shapeWater', 'createDestroyWater'])
        self.assertEqual(species_spell_ids({**water, 'rulesVersion': '2024'}), ['shapeWater', 'createOrDestroyWater'])

    def test_eepc_genasi_and_mark_of_healing(self):
        air = {'rulesVersion': '2014', 'race': 'genasi-air', 'level': 1}
        self.assertEqual(species_spell_ids(air), ['levitate'])
        self.assertEqual(species_spell_ids({**air, 'race': 'genasi-earth'}), ['passWithoutTrace'])
        healing = {'rulesVersion': '2014', 'race': 'halfling-mark-healing'}
        self.assertEqual(species_spell_ids({**healing, 'level': 1}), ['cureWounds'])
        self.assertEqual(species_spell_ids({**healing, 'level': 3}), ['cureWounds', 'lesserRestoration'])

    def test_class_entry_of_a_species_spell_moves_to_the_species(self):
        druid = {'rulesVersion': '2014', 'race': 'firbolg', 'className': 'druid', 'level': 1,
                 'spells': [{'id': 'guidance', 'prepared': True}, {'id': 'detectMagic', 'prepared': True}]}
        out = apply_autos(druid)['spells']
        self.assertEqual([s for s in out if s['id'] == 'detectMagic'],
                         [{'id': 'detectMagic', 'species': True, 'prepared': True, 'auto': True}])
        self.assertTrue(any(s['id'] == 'guidance' and not s.get('auto') for s in out))
        self.assertEqual(apply_autos({**druid, 'spells': out})['spells'], out, 'idempotente')
        # Grimório do Mago fica; truque do Mago com o id de um truque da espécie vai para a espécie.
        wizard = {**druid, 'className': 'wizard', 'spells': [{'id': 'detectMagic', 'prepared': True}]}
        self.assertEqual([s for s in apply_autos(wizard)['spells'] if s['id'] == 'detectMagic'],
                         [{'id': 'detectMagic', 'prepared': True}])
        gnome = {'rulesVersion': '2014', 'race': 'gnome-forest', 'className': 'wizard', 'level': 1,
                 'spells': [{'id': 'minorIllusion', 'prepared': True}]}
        self.assertEqual([s for s in apply_autos(gnome)['spells'] if s['id'] == 'minorIllusion'],
                         [{'id': 'minorIllusion', 'species': True, 'prepared': True, 'auto': True}])
