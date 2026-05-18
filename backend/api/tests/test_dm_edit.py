"""
Testes pro PATCH /characters/:id/dm-edit:
- DM da campanha do personagem pode patch livre no data.
- DM de outra campanha não pode.
- Outro user (não-DM, não-dono) não pode.
- Dono não usa esse endpoint (tem o PUT normal pra editar a própria ficha).
- Campos arbitrários passam (HP, slots, atributos, nível, conditions, etc).
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


class DMEditEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm_a = make_user('a@x.com', 'DM A')
        self.dm_b = make_user('b@x.com', 'DM B')
        self.owner = make_user('o@x.com', 'Owner')
        self.outsider = make_user('z@x.com', 'Z')
        self.c_dm_a = APIClient(); self.c_dm_a.force_login(self.dm_a)
        self.c_dm_b = APIClient(); self.c_dm_b.force_login(self.dm_b)
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.c_out = APIClient(); self.c_out.force_login(self.outsider)

        self.camp_a = Campaign.objects.create(dm=self.dm_a, name='A', slug='a')
        self.camp_b = Campaign.objects.create(dm=self.dm_b, name='B', slug='b')
        self.char = Character.objects.create(
            owner=self.owner, name='Thal',
            data={'level': 2, 'className': 'druid', 'currentHp': 15, 'maxHp': 15,
                  'abilities': {'str': 8, 'dex': 14, 'con': 12, 'int': 13, 'wis': 16, 'cha': 10}},
        )
        # char está NA campanha A, não na B
        Membership.objects.create(campaign=self.camp_a, user=self.owner, character=self.char, role='player')

    def test_dm_of_campaign_can_patch(self):
        r = self.c_dm_a.patch(
            f'/api/characters/{self.char.id}/dm-edit',
            {'data': {'currentHp': 5, 'maxHp': 20, 'level': 3, 'conditions': ['poisoned']}},
            format='json',
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['currentHp'], 5)
        self.assertEqual(self.char.data['maxHp'], 20)
        self.assertEqual(self.char.data['level'], 3)
        self.assertEqual(self.char.data['conditions'], ['poisoned'])
        # Não toca em coisas que não estão no patch
        self.assertEqual(self.char.data['abilities']['wis'], 16)

    def test_dm_of_other_campaign_cannot_patch(self):
        r = self.c_dm_b.patch(
            f'/api/characters/{self.char.id}/dm-edit',
            {'data': {'currentHp': 1}}, format='json',
        )
        self.assertEqual(r.status_code, 403)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['currentHp'], 15)  # inalterado

    def test_outsider_cannot_patch(self):
        r = self.c_out.patch(
            f'/api/characters/{self.char.id}/dm-edit',
            {'data': {'currentHp': 1}}, format='json',
        )
        self.assertEqual(r.status_code, 403)

    def test_owner_cannot_use_dm_endpoint(self):
        # Dono não é DM de campanha em que o personagem está atribuído (a campanha
        # é de outra pessoa); então 403.
        r = self.c_owner.patch(
            f'/api/characters/{self.char.id}/dm-edit',
            {'data': {'currentHp': 1}}, format='json',
        )
        self.assertEqual(r.status_code, 403)

    def test_can_rename(self):
        r = self.c_dm_a.patch(
            f'/api/characters/{self.char.id}/dm-edit',
            {'name': 'Thalion the Renamed', 'data': {}}, format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(self.char.name, 'Thalion the Renamed')

    def test_invalid_patch_400(self):
        r = self.c_dm_a.patch(
            f'/api/characters/{self.char.id}/dm-edit',
            {'data': 'not-a-dict'}, format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_patch_spell_slots(self):
        r = self.c_dm_a.patch(
            f'/api/characters/{self.char.id}/dm-edit',
            {'data': {'spellSlotsUsed': [1, 0, 0, 0, 0, 0, 0, 0, 0],
                      'spellSlotsMax': [3, 0, 0, 0, 0, 0, 0, 0, 0]}}, format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['spellSlotsUsed'][0], 1)
        self.assertEqual(self.char.data['spellSlotsMax'][0], 3)

    def test_unauthenticated_blocked(self):
        c = APIClient()
        r = c.patch(f'/api/characters/{self.char.id}/dm-edit',
                    {'data': {'currentHp': 1}}, format='json')
        self.assertIn(r.status_code, (401, 403))

    def test_not_found_for_missing_character(self):
        r = self.c_dm_a.patch('/api/characters/9999999/dm-edit',
                              {'data': {}}, format='json')
        self.assertEqual(r.status_code, 404)
