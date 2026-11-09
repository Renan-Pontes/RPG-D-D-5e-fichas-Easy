"""Descanso curto devolve os espaços do Pacto (bruxo puro e em multiclasse)."""
from django.test import SimpleTestCase

from api import spells


class PactShortRest(SimpleTestCase):
    def test_pure_warlock_recovers_everything(self):
        out = spells.short_rest({'className': 'warlock', 'level': 12, 'spellSlotsUsed': [0, 0, 0, 0, 3]})
        self.assertEqual(out['spellSlotsUsed'], [0] * 9)

    def test_multiclass_recovers_only_pact(self):
        data = {'className': 'warlock', 'level': 12, 'multiclass': [{'id': 'sorcerer'}],
                'classSequence': ['warlock'] * 9 + ['sorcerer'] * 3,
                'spellSlotsUsed': [3, 1, 0, 0, 2, 0, 0, 0, 0]}
        out = spells.short_rest(data)
        # Bruxo 9: 2 espaços de 5º círculo do Pacto voltam; os de Feiticeiro (1º/2º) ficam gastos
        self.assertEqual(out['spellSlotsUsed'], [3, 1, 0, 0, 0, 0, 0, 0, 0])

    def test_non_warlock_untouched(self):
        out = spells.short_rest({'className': 'wizard', 'level': 5, 'spellSlotsUsed': [2, 1, 0]})
        self.assertEqual(out['spellSlotsUsed'], [2, 1, 0])
