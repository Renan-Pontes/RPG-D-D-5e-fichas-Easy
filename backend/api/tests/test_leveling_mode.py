"""Progressão por campanha: Marcos (padrão) ou XP, e o mestre dando XP."""
from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APIClient

from api.models import Character, Campaign, Membership, Approval
from api.tests.test_multiclass import make_user, druid_data


class LevelingModeTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'P')
        self.other = make_user('q@x.com', 'Q')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.char = Character.objects.create(owner=self.player, name='Thal', data=druid_data(3, xp=2000))
        self.char2 = Character.objects.create(owner=self.other, name='Bor', data=druid_data(3, xp=0))
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char, role='player')
        Membership.objects.create(campaign=self.camp, user=self.other, character=self.char2, role='player')

    def _mode(self, mode):
        self.camp.state = {**(self.camp.state or {}), 'levelingMode': mode}
        self.camp.save()

    def test_default_is_milestone_and_character_sees_mode(self):
        r = self.c_p.get(f'/api/characters/{self.char.id}')
        self.assertEqual(r.json()['character']['campaignLeveling'], 'milestone')
        self._mode('xp')
        r = self.c_p.get('/api/characters')
        chars = r.json()['characters']
        self.assertEqual(next(c for c in chars if c['id'] == self.char.id)['campaignLeveling'], 'xp')

    def test_invalid_mode_rejected(self):
        r = self.c_dm.put(f'/api/campaigns/{self.camp.id}', {'state': {'levelingMode': 'bananas'}}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.c_dm.put(f'/api/campaigns/{self.camp.id}', {'state': {'levelingMode': 'xp'}}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_award_xp_refused_in_milestone_campaign(self):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/award-xp', {'amount': 100}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'campaign_uses_milestones')

    def test_split_xp_and_auto_unlock_level_up(self):
        self._mode('xp')
        # 1600 dividido por 2 = 800 cada: Thal vai a 2800 (>= 2700, nível 4), Bor a 800.
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/award-xp', {'amount': 1600, 'split': True}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['each'], 800)
        self.char.refresh_from_db(); self.char2.refresh_from_db()
        self.assertEqual(self.char.data['xp'], 2800)
        self.assertEqual(self.char2.data['xp'], 800)
        self.assertEqual([g['character']['id'] for g in r.json()['granted']], [self.char.id])
        self.assertTrue(Approval.objects.filter(character=self.char, type='levelup', status='approved').exists())
        self.assertFalse(Approval.objects.filter(character=self.char2, type='levelup').exists())

    def test_only_dm_awards_and_amount_validated(self):
        self._mode('xp')
        r = self.c_p.post(f'/api/campaigns/{self.camp.id}/award-xp', {'amount': 100}, format='json')
        self.assertEqual(r.status_code, 403)
        for bad in (0, -5, 'mil', True):
            r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/award-xp', {'amount': bad}, format='json')
            self.assertEqual(r.status_code, 400)
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/award-xp', {'amount': 50, 'characterIds': [self.char2.id]}, format='json')
        self.char.refresh_from_db(); self.char2.refresh_from_db()
        self.assertEqual((self.char.data['xp'], self.char2.data['xp']), (2000, 50))
