"""
Testes pros endpoints de inventário.

Cenários:
- Standalone: dono cria/edita/remove livremente; outro user 403.
- Em campanha: DM dá item; dono não cria (403); dono só edita
  equipped/qty/notes/attuned; dono não remove (403); DM remove OK.
- Attunement: limite de 3; item sem attunement não pode attune.
- Consume: dono decrementa qty; potion com qty=0 some.
- Cross-campanha: DM de outra campanha 403.
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership

User = get_user_model()


def make_user(email, name='User', password='senha-forte-2026'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password=password)
    Profile.objects.create(user=u, display_name=name)
    return u


def base_item(**over):
    return {
        'name': 'Item',
        'type': 'gear',
        'qty': 1,
        'equipped': False,
        'broken': False,
        'attunement': False,
        'attuned': False,
        **over,
    }


class StandaloneInventoryTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.other = make_user('z@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.c_other = APIClient(); self.c_other.force_login(self.other)
        self.char = Character.objects.create(owner=self.owner, name='C', data={'equipment': []})

    def test_owner_can_add(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory',
                              {'item': base_item(name='Sword')}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['item']['name'], 'Sword')
        self.char.refresh_from_db()
        self.assertEqual(len(self.char.data['equipment']), 1)

    def test_other_user_cannot_add(self):
        r = self.c_other.post(f'/api/characters/{self.char.id}/inventory',
                              {'item': base_item()}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_owner_can_patch_any_field(self):
        # Add first
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory',
                              {'item': base_item(name='Sword', type='weapon')}, format='json')
        item_id = r.json()['item']['id']
        r = self.c_owner.patch(f'/api/characters/{self.char.id}/inventory/{item_id}',
                               {'broken': True, 'name': 'Broken Sword'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        it = self.char.data['equipment'][0]
        self.assertTrue(it['broken'])
        self.assertEqual(it['name'], 'Broken Sword')

    def test_owner_can_delete(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory',
                              {'item': base_item()}, format='json')
        item_id = r.json()['item']['id']
        r = self.c_owner.delete(f'/api/characters/{self.char.id}/inventory/{item_id}')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(len(self.char.data['equipment']), 0)

    def test_owner_can_consume(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory',
                              {'item': base_item(name='Arrows', qty=20)}, format='json')
        item_id = r.json()['item']['id']
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory/{item_id}/consume')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['equipment'][0]['qty'], 19)

    def test_potion_consumed_to_zero_removes(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory',
                              {'item': base_item(name='Potion', type='potion', qty=1)}, format='json')
        item_id = r.json()['item']['id']
        self.c_owner.post(f'/api/characters/{self.char.id}/inventory/{item_id}/consume')
        self.char.refresh_from_db()
        self.assertEqual(len(self.char.data['equipment']), 0)


class CampaignInventoryTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.dm = make_user('dm@x.com')
        self.dm_other = make_user('dm2@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_dm_other = APIClient(); self.c_dm_other.force_login(self.dm_other)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.camp_other = Campaign.objects.create(dm=self.dm_other, name='C2', slug='c2')
        self.char = Character.objects.create(owner=self.owner, name='C', data={'equipment': []})
        Membership.objects.create(campaign=self.camp, user=self.owner, character=self.char, role='player')

    def test_dm_can_give_item(self):
        r = self.c_dm.post(f'/api/characters/{self.char.id}/inventory',
                            {'item': base_item(name='Longsword', type='weapon')}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        self.assertEqual(len(self.char.data['equipment']), 1)

    def test_owner_in_campaign_cannot_create_item(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory',
                              {'item': base_item()}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_dm_of_other_campaign_cannot_give(self):
        r = self.c_dm_other.post(f'/api/characters/{self.char.id}/inventory',
                                  {'item': base_item()}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_owner_can_equip_in_campaign(self):
        # DM dá item
        r = self.c_dm.post(f'/api/characters/{self.char.id}/inventory',
                            {'item': base_item(name='Sword', type='weapon')}, format='json')
        item_id = r.json()['item']['id']
        # Owner equipa
        r = self.c_owner.patch(f'/api/characters/{self.char.id}/inventory/{item_id}',
                                {'equipped': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertTrue(self.char.data['equipment'][0]['equipped'])

    def test_owner_cannot_change_broken_in_campaign(self):
        r = self.c_dm.post(f'/api/characters/{self.char.id}/inventory',
                            {'item': base_item(name='Sword')}, format='json')
        item_id = r.json()['item']['id']
        r = self.c_owner.patch(f'/api/characters/{self.char.id}/inventory/{item_id}',
                                {'broken': True}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_owner_cannot_delete_in_campaign(self):
        r = self.c_dm.post(f'/api/characters/{self.char.id}/inventory',
                            {'item': base_item()}, format='json')
        item_id = r.json()['item']['id']
        r = self.c_owner.delete(f'/api/characters/{self.char.id}/inventory/{item_id}')
        self.assertEqual(r.status_code, 403)

    def test_dm_can_delete(self):
        r = self.c_dm.post(f'/api/characters/{self.char.id}/inventory',
                            {'item': base_item()}, format='json')
        item_id = r.json()['item']['id']
        r = self.c_dm.delete(f'/api/characters/{self.char.id}/inventory/{item_id}')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(len(self.char.data['equipment']), 0)

    def test_dm_can_mark_broken(self):
        r = self.c_dm.post(f'/api/characters/{self.char.id}/inventory',
                            {'item': base_item(name='Sword')}, format='json')
        item_id = r.json()['item']['id']
        r = self.c_dm.patch(f'/api/characters/{self.char.id}/inventory/{item_id}',
                             {'broken': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertTrue(self.char.data['equipment'][0]['broken'])

    def test_owner_can_consume_in_campaign(self):
        r = self.c_dm.post(f'/api/characters/{self.char.id}/inventory',
                            {'item': base_item(name='Arrows', qty=20)}, format='json')
        item_id = r.json()['item']['id']
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory/{item_id}/consume')
        self.assertEqual(r.status_code, 200)


class AttunementTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.char = Character.objects.create(owner=self.owner, name='C', data={'equipment': []})

    def _give_attune_item(self, name='Ring'):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory',
                              {'item': base_item(name=name, type='magic',
                                                 attunement=True,
                                                 magic={'attunement': True, 'rarity': 'uncommon'})},
                              format='json')
        return r.json()['item']['id']

    def test_can_attune_one_item(self):
        item_id = self._give_attune_item('Ring 1')
        r = self.c_owner.patch(f'/api/characters/{self.char.id}/inventory/{item_id}',
                                {'attuned': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertTrue(self.char.data['equipment'][0]['attuned'])

    def test_attunement_limit_3(self):
        # Attune 3 itens
        ids = [self._give_attune_item(f'Ring {i}') for i in range(3)]
        for i in ids:
            self.c_owner.patch(f'/api/characters/{self.char.id}/inventory/{i}',
                                {'attuned': True}, format='json')
        # Tenta o 4º
        id4 = self._give_attune_item('Ring 4')
        r = self.c_owner.patch(f'/api/characters/{self.char.id}/inventory/{id4}',
                                {'attuned': True}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'attunement_limit_reached')

    def test_cannot_attune_item_without_attunement_flag(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory',
                              {'item': base_item(name='Pl Sword', type='weapon', attunement=False)},
                              format='json')
        item_id = r.json()['item']['id']
        r = self.c_owner.patch(f'/api/characters/{self.char.id}/inventory/{item_id}',
                                {'attuned': True}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'item_does_not_require_attunement')


class ItemNotFoundTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.char = Character.objects.create(owner=self.owner, name='C', data={'equipment': []})

    def test_patch_unknown_item_404(self):
        r = self.c_owner.patch(f'/api/characters/{self.char.id}/inventory/nope',
                                {'broken': True}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_consume_unknown_404(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/inventory/nope/consume')
        self.assertEqual(r.status_code, 404)
