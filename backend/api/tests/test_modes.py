"""
Testes da distinção standalone vs campanha:
- PUT do dono: standalone aceita tudo; em campanha rejeita campos sensíveis.
- DM tem dm-edit endpoint próprio (já testado em test_dm_edit).
- Personagem só em UMA campanha (join + assign).
- Owner pode sair voluntariamente (DELETE membership próprio).
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


class LockedFieldsTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.dm = make_user('dm@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.char = Character.objects.create(owner=self.owner, name='Thal', data={
            'className': 'druid', 'level': 2, 'maxHp': 15, 'currentHp': 15,
            'abilities': {'str': 8, 'dex': 14, 'con': 12, 'int': 13, 'wis': 16, 'cha': 10},
        })

    def test_standalone_owner_can_edit_max_hp(self):
        # Sem membership → standalone
        r = self.c_owner.put(f'/api/characters/{self.char.id}',
            {'name': 'Thal', 'data': {**self.char.data, 'maxHp': 200}}, format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['maxHp'], 200)

    def test_standalone_owner_can_edit_abilities_and_level(self):
        r = self.c_owner.put(f'/api/characters/{self.char.id}',
            {'name': 'Thal', 'data': {**self.char.data,
                                       'level': 20,
                                       'abilities': {'str': 18, 'dex': 18, 'con': 18, 'int': 18, 'wis': 18, 'cha': 18}}},
            format='json')
        self.assertEqual(r.status_code, 200)

    def test_in_campaign_owner_cannot_edit_max_hp(self):
        camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=camp, user=self.owner, character=self.char, role='player')
        r = self.c_owner.put(f'/api/characters/{self.char.id}',
            {'name': 'Thal', 'data': {**self.char.data, 'maxHp': 200}}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['error'], 'fields_locked_in_campaign')
        self.assertIn('maxHp', r.json()['fields'])

    def test_in_campaign_owner_cannot_edit_abilities_level(self):
        camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=camp, user=self.owner, character=self.char, role='player')
        r = self.c_owner.put(f'/api/characters/{self.char.id}',
            {'name': 'Thal', 'data': {**self.char.data, 'level': 5, 'abilities': {'str': 20, 'dex': 14, 'con': 12, 'int': 13, 'wis': 16, 'cha': 10}}},
            format='json')
        self.assertEqual(r.status_code, 403)
        fields = r.json()['fields']
        self.assertIn('level', fields)
        self.assertIn('abilities', fields)

    def test_in_campaign_owner_can_edit_unlocked_fields(self):
        camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=camp, user=self.owner, character=self.char, role='player')
        # currentHp, tempHp, conditions, notes não estão na lista → OK
        r = self.c_owner.put(f'/api/characters/{self.char.id}',
            {'name': 'Thal', 'data': {**self.char.data,
                                       'currentHp': 8, 'tempHp': 5,
                                       'conditions': ['poisoned'],
                                       'notes': 'tomei poção'}},
            format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['currentHp'], 8)
        self.assertEqual(self.char.data['notes'], 'tomei poção')


class SingleCampaignTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.dm_a = make_user('a@x.com')
        self.dm_b = make_user('b@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.char = Character.objects.create(owner=self.owner, name='C', data={})
        self.camp_a = Campaign.objects.create(dm=self.dm_a, name='A', slug='a')
        self.camp_b = Campaign.objects.create(dm=self.dm_b, name='B', slug='b')

    def test_join_with_character_already_in_another_campaign_blocks(self):
        Membership.objects.create(campaign=self.camp_a, user=self.owner, character=self.char, role='player')
        r = self.c_owner.post('/api/campaigns/join',
            {'inviteCode': self.camp_b.invite_code, 'characterId': self.char.id}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['error'], 'character_already_in_campaign')

    def test_join_two_campaigns_without_char_ok(self):
        # Dono pode ser membro de 2 campanhas, só não pode anexar o MESMO char.
        # Aqui entra na A sem char; depois B com char.
        Membership.objects.create(campaign=self.camp_a, user=self.owner)
        r = self.c_owner.post('/api/campaigns/join',
            {'inviteCode': self.camp_b.invite_code, 'characterId': self.char.id}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_assign_character_to_membership_blocked_if_already_in_other(self):
        Membership.objects.create(campaign=self.camp_a, user=self.owner, character=self.char, role='player')
        # Cria membership na B sem char e tenta atribuir o mesmo char
        m_b = Membership.objects.create(campaign=self.camp_b, user=self.owner, role='player')
        r = self.c_owner.put(f'/api/campaigns/{self.camp_b.id}/members/{m_b.id}',
            {'characterId': self.char.id}, format='json')
        self.assertEqual(r.status_code, 409)


class OwnerLeaveCampaignTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.dm = make_user('dm@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.char = Character.objects.create(owner=self.owner, name='C', data={})
        self.m = Membership.objects.create(campaign=self.camp, user=self.owner, character=self.char, role='player')

    def test_owner_can_leave_voluntarily(self):
        r = self.c_owner.delete(f'/api/campaigns/{self.camp.id}/members/{self.m.id}')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Membership.objects.filter(pk=self.m.id).exists())

    def test_owner_leaves_makes_character_standalone_again(self):
        r = self.c_owner.delete(f'/api/campaigns/{self.camp.id}/members/{self.m.id}')
        self.assertEqual(r.status_code, 200)
        # Personagem volta a inCampaign=false
        r = self.c_owner.get(f'/api/characters/{self.char.id}')
        self.assertFalse(r.json()['character']['inCampaign'])

    def test_dm_cannot_leave_own_campaign(self):
        m_dm = Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        r = self.c_dm.delete(f'/api/campaigns/{self.camp.id}/members/{m_dm.id}')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'dm_cannot_leave')

    def test_other_user_cannot_remove_someones_membership(self):
        outsider = make_user('z@x.com')
        c_z = APIClient(); c_z.force_login(outsider)
        r = c_z.delete(f'/api/campaigns/{self.camp.id}/members/{self.m.id}')
        self.assertEqual(r.status_code, 403)

    def test_dm_can_remove_member(self):
        r = self.c_dm.delete(f'/api/campaigns/{self.camp.id}/members/{self.m.id}')
        self.assertEqual(r.status_code, 200)


class CrossCampaignDMTests(TestCase):
    """DM da campanha A não edita personagem de campanha B."""
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.dm_a = make_user('a@x.com')
        self.dm_b = make_user('b@x.com')
        self.c_dm_b = APIClient(); self.c_dm_b.force_login(self.dm_b)
        self.char = Character.objects.create(owner=self.owner, name='C', data={'maxHp': 10, 'currentHp': 10})
        self.camp_a = Campaign.objects.create(dm=self.dm_a, name='A', slug='a')
        Membership.objects.create(campaign=self.camp_a, user=self.owner, character=self.char, role='player')

    def test_dm_of_other_campaign_cannot_dm_edit(self):
        r = self.c_dm_b.patch(f'/api/characters/{self.char.id}/dm-edit',
            {'data': {'maxHp': 999}}, format='json')
        self.assertEqual(r.status_code, 403)
