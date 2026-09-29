"""
Recursos com usos: gasto, recuperação só pelo descanso/mestre, recarga curta.
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership
from api.progression.resources import compute_resources, rest_resources, spend_resource

User = get_user_model()


def make_user(email):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=email)
    return u


def barbarian(level=5, **extra):
    return {'rulesVersion': '2024', 'className': 'barbarian', 'level': level, 'maxHp': 50, 'currentHp': 50,
            'abilities': {'str': 16, 'con': 14}, **extra}


class ResourceEngineTests(TestCase):
    def test_rage_counts_and_short_rest_regain(self):
        rage = next(r for r in compute_resources(barbarian(5)) if r['id'] == 'rage')
        self.assertEqual(rage['max'], 3)
        c = spend_resource(spend_resource(barbarian(5), 'barbarian.rage'), 'barbarian.rage')
        self.assertEqual(c['resourcesUsed']['barbarian.rage'], 2)
        self.assertEqual(rest_resources(c, 'short')['resourcesUsed']['barbarian.rage'], 1)
        self.assertEqual(rest_resources(c, 'long')['resourcesUsed'], {})

    def test_cannot_exceed_max(self):
        c = barbarian(1)
        for _ in range(5):
            c = spend_resource(c, 'barbarian.rage')
        self.assertEqual(c['resourcesUsed']['barbarian.rage'], 2)


class ResourceApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com')
        self.player = make_user('p@x.com')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.char = Character.objects.create(owner=self.player, name='Grok', data=barbarian(5))
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char, role='player')

    def post(self, client, body):
        return client.post(f'/api/characters/{self.char.id}/resource', body, format='json')

    def test_player_spends_but_cannot_restore_in_campaign(self):
        self.assertEqual(self.post(self.c_p, {'key': 'barbarian.rage', 'action': 'use'}).status_code, 200)
        self.assertEqual(self.post(self.c_p, {'key': 'barbarian.rage', 'action': 'restore'}).status_code, 403)
        self.assertEqual(self.post(self.c_dm, {'key': 'barbarian.rage', 'action': 'restore'}).status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['resourcesUsed']['barbarian.rage'], 0)

    def test_put_cannot_touch_resources_in_campaign(self):
        data = {**self.char.data, 'resourcesUsed': {'barbarian.rage': 0}}
        self.post(self.c_p, {'key': 'barbarian.rage', 'action': 'use'})
        r = self.c_p.put(f'/api/characters/{self.char.id}', {'name': 'Grok', 'data': data}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_rest_recovers(self):
        self.post(self.c_p, {'key': 'barbarian.rage', 'action': 'use'})
        self.post(self.c_p, {'key': 'barbarian.rage', 'action': 'use'})
        self.c_p.post(f'/api/characters/{self.char.id}/rest', {'type': 'short'}, format='json')
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['resourcesUsed']['barbarian.rage'], 1)

    def test_unknown_resource(self):
        self.assertEqual(self.post(self.c_p, {'key': 'barbarian.nope', 'action': 'use'}).status_code, 400)


class SpeciesResourceTests(TestCase):
    def test_orc_adrenaline_short_rest(self):
        c = {'rulesVersion': '2024', 'className': 'fighter', 'race': 'orc', 'level': 5}
        res = {r['id']: r for r in compute_resources(c)}
        self.assertEqual(res['adrenalineRush']['max'], 3)
        c = spend_resource(c, 'species.adrenalineRush')
        self.assertEqual(rest_resources(c, 'short')['resourcesUsed']['species.adrenalineRush'], 0)
