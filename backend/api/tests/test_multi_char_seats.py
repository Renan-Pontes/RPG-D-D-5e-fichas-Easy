"""N fichas do mesmo usuário na MESMA campanha (inclusive o mestre na própria mesa)."""
from django.core.cache import cache
from django.test import TestCase

from api.models import Campaign, Character, Membership, WorldEntry
from .test_campaign_link import mk, client


class MultiCharSameCampaign(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = mk('ivan@x.com')
        self.c = client(self.dm)
        self.camp = Campaign.objects.create(dm=self.dm, name='Stormwreck', slug='storm')
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.angel = Character.objects.create(owner=self.dm, name='Angel Schwitz', data={'race': 'Goblin'})
        self.topov = Character.objects.create(owner=self.dm, name='Topov Povarov', data={})

    def join(self, ch, **extra):
        return self.c.post('/api/campaigns/join', {'campaignId': self.camp.id, 'characterId': ch.id, **extra}, format='json')

    def chars_in_camp(self):
        return sorted(Membership.objects.filter(campaign=self.camp, character__isnull=False)
                      .values_list('character__name', flat=True))

    def test_dm_adds_two_own_characters(self):
        self.assertEqual(self.join(self.angel).status_code, 200)
        r = self.join(self.topov)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.chars_in_camp(), ['Angel Schwitz', 'Topov Povarov'])
        # a lista e o detalhe mostram as duas vagas
        lst = self.c.get('/api/campaigns').json()['campaigns'][0]
        self.assertEqual(len([m for m in lst['myMemberships'] if m['characterId']]), 2)
        det = self.c.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertEqual(sorted(m['character']['name'] for m in det['members'] if m.get('character')),
                         ['Angel Schwitz', 'Topov Povarov'])

    def test_npc_seat_creates_world_entry(self):
        self.join(self.angel)
        m = Membership.objects.get(campaign=self.camp, character=self.angel)
        r = self.c.put(f'/api/campaigns/{self.camp.id}/members/{m.id}', {'isNpc': True, 'charType': 'npc'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(WorldEntry.objects.filter(campaign=self.camp, kind='npc', name='Angel Schwitz').exists())
        m.refresh_from_db()
        self.assertFalse(m.sponsored)
