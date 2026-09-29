"""Grimório do mago no consumo do level-up: spellsAdded com {'id', 'inBook': True}."""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership
from api.progression.engine import apply_approval_to_character

User = get_user_model()


def make_user(email, name='U'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


ABIL = {'str': 8, 'dex': 14, 'con': 12, 'int': 16, 'wis': 12, 'cha': 10}


class SpellbookApplyTests(TestCase):
    def test_legacy_wizard_book_marked_and_new_spells_unprepared(self):
        data = {'level': 1, 'className': 'wizard', 'abilities': ABIL, 'maxHp': 7,
                'spells': [{'id': 'fireBolt', 'prepared': True}, {'id': 'shield', 'prepared': True}]}
        out = apply_approval_to_character(data, 'levelup', {
            'toLevel': 2, 'hpGain': 5, 'classId': 'wizard',
            'spellsAdded': [{'id': 'sleep', 'inBook': True}, {'id': 'charmPerson', 'inBook': True}],
        })
        by = {s['id']: s for s in out['spells']}
        self.assertEqual(by['sleep'], {'id': 'sleep', 'prepared': False, 'inBook': True})
        self.assertTrue(by['shield']['inBook'])
        self.assertTrue(by['shield']['prepared'])

    def test_other_class_strings_unchanged(self):
        data = {'level': 2, 'className': 'druid', 'abilities': ABIL, 'maxHp': 15, 'spells': []}
        out = apply_approval_to_character(data, 'levelup', {'toLevel': 3, 'hpGain': 5, 'spellsAdded': ['produceFlame']})
        self.assertEqual(out['spells'][0], {'id': 'produceFlame', 'prepared': True})


class SpellbookConsumeTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'P')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')

    def _char(self, cls):
        char = Character.objects.create(owner=self.player, name='X', data={
            'level': 1, 'className': cls, 'currentHp': 8, 'maxHp': 8, 'abilities': ABIL,
            'spells': [{'id': 'magicMissile', 'prepared': True, 'inBook': True}]})
        Membership.objects.create(campaign=self.camp, user=self.player, character=char, role='player')
        r = self.c_p.post(f'/api/approvals/campaign/{self.camp.id}',
                          {'characterId': char.id, 'type': 'levelup', 'payload': {'toLevel': 2}}, format='json')
        apr = r.json()['approval']['id']
        self.c_dm.post(f'/api/approvals/{apr}/review', {'status': 'approved'}, format='json')
        return char, apr

    def test_wizard_consume_adds_to_spellbook(self):
        char, apr = self._char('wizard')
        r = self.c_p.post(f'/api/approvals/{apr}/consume', {
            'hpGain': 4, 'classId': 'wizard',
            'spellsAdded': [{'id': 'sleep', 'inBook': True}, {'id': 'shield', 'inBook': True}],
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        char.refresh_from_db()
        by = {s['id']: s for s in char.data['spells']}
        self.assertEqual(by['sleep']['inBook'], True)
        self.assertEqual(by['sleep']['prepared'], False)

    def test_inbook_rejected_for_other_class(self):
        char, apr = self._char('cleric')
        r = self.c_p.post(f'/api/approvals/{apr}/consume', {
            'hpGain': 4, 'classId': 'cleric', 'spellsAdded': [{'id': 'bless', 'inBook': True}],
        }, format='json')
        self.assertEqual(r.status_code, 400, r.content)

    def test_bad_item_rejected(self):
        char, apr = self._char('wizard')
        r = self.c_p.post(f'/api/approvals/{apr}/consume', {
            'hpGain': 4, 'classId': 'wizard', 'spellsAdded': [{'id': 'sleep', 'prepared': True}],
        }, format='json')
        self.assertEqual(r.status_code, 400, r.content)
