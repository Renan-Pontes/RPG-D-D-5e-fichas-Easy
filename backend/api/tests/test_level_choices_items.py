"""
ASI/talento na subida de nível, escolha pendente e catálogo de itens da campanha.
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership, Approval

User = get_user_model()


def make_user(email, name='U'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


def druid_data(level):
    return {'rulesVersion': '2024', 'level': level, 'className': 'druid', 'subclass': 'stars',
            'currentHp': 20, 'maxHp': 20,
            'abilities': {'str': 8, 'dex': 14, 'con': 14, 'int': 10, 'wis': 16, 'cha': 10}}


class LevelChoiceTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'P')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.char = Character.objects.create(owner=self.player, name='Thal', data=druid_data(3))
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char, role='player')

    def _unlock(self):
        apr = Approval.objects.create(campaign=self.camp, character=self.char, requested_by=self.player,
                                      type='levelup', payload={'toLevel': 4}, status='approved')
        return apr.id

    def test_consume_applies_hp_and_asi(self):
        apr = self._unlock()
        r = self.c_p.post(f'/api/approvals/{apr}/consume',
                          {'hpGain': 7, 'choice': {'type': 'asi', 'asi': {'wis': 2}}}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['level'], 4)
        self.assertEqual(self.char.data['maxHp'], 27)
        self.assertEqual(self.char.data['abilities']['wis'], 18)
        self.assertIn('4', self.char.data['levelChoices'])

    def test_consume_rejects_inflated_hp_and_bad_asi(self):
        apr = self._unlock()
        r = self.c_p.post(f'/api/approvals/{apr}/consume', {'hpGain': 20}, format='json')
        self.assertEqual(r.status_code, 400)  # d8 + CON 2 = 10 no máximo
        r = self.c_p.post(f'/api/approvals/{apr}/consume',
                          {'choice': {'type': 'asi', 'asi': {'wis': 2, 'con': 2}}}, format='json')
        self.assertEqual(r.status_code, 400)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['level'], 3)

    def test_pending_choice_endpoint(self):
        self.char.data = druid_data(4)
        self.char.save()
        url = f'/api/characters/{self.char.id}/level-choice'
        r = self.c_p.post(url, {'level': 3, 'choice': {'type': 'feat', 'feat': 'Alert'}}, format='json')
        self.assertEqual(r.status_code, 400)  # nível 3 não dá ASI
        r = self.c_p.post(url, {'level': 4, 'choice': {'type': 'feat', 'feat': 'Alert'}}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        r = self.c_p.post(url, {'level': 4, 'choice': {'type': 'asi', 'asi': {'wis': 2}}}, format='json')
        self.assertEqual(r.status_code, 400)  # já escolhido
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['feats'][0]['name'], 'Alert')

    def test_owner_cannot_write_level_choices_directly_in_campaign(self):
        data = {**druid_data(3), 'levelChoices': {'4': {'type': 'feat', 'feat': 'x'}}, 'feats': [{'name': 'x'}]}
        r = self.c_p.put(f'/api/characters/{self.char.id}', {'name': 'Thal', 'data': data}, format='json')
        self.assertEqual(r.status_code, 403)


class CampaignItemTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'P')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=self.camp, user=self.player, role='player')
        self.url = f'/api/campaigns/{self.camp.id}/items'

    def test_dm_crud(self):
        item = {'name': 'Lâmina Lunar', 'type': 'weapon', 'weapon': {'damage': '1d8', 'dmgType': 'radiant', 'props': ['finesse']},
                'magic': {'rarity': 'rare', 'attunement': True, 'effect': 'Brilha sob a lua.'}, 'junk': 'x'}
        r = self.c_dm.post(self.url, {'item': item}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        saved = r.json()['item']
        self.assertNotIn('junk', saved['item'])
        self.assertEqual(saved['item']['magic']['effect'], {'pt': 'Brilha sob a lua.', 'en': 'Brilha sob a lua.'})
        r = self.c_dm.patch(f"{self.url}/{saved['id']}", {'item': {**item, 'name': 'Lâmina Solar'}}, format='json')
        self.assertEqual(r.json()['item']['item']['name'], 'Lâmina Solar')
        self.assertEqual(len(self.c_dm.get(self.url).json()['items']), 1)
        self.assertEqual(self.c_dm.delete(f"{self.url}/{saved['id']}").status_code, 200)
        self.assertEqual(self.c_dm.get(self.url).json()['items'], [])

    def test_player_cannot_see_or_create(self):
        self.assertEqual(self.c_p.get(self.url).status_code, 403)
        self.assertEqual(self.c_p.post(self.url, {'item': {'name': 'x'}}, format='json').status_code, 403)

    def test_name_required(self):
        self.assertEqual(self.c_dm.post(self.url, {'item': {'type': 'gear'}}, format='json').status_code, 400)
