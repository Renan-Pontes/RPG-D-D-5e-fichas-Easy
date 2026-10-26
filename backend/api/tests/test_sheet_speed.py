"""
V16 · Deslocamento da ficha na Tela e no combate: o servidor não calcula regras; usa o
deslocamento fixo do mestre, senão o que a ficha calculou ao salvar (data.speed, com o
Movimento sem Armadura do Monge e o Movimento Rápido do Bárbaro), senão 30.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Campaign, Character, CombatInstance, Membership, Profile

User = get_user_model()


def make_user(email, name='User'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class SheetSpeedTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.anon = APIClient()
        self.camp = Campaign.objects.create(dm=self.dm, name='Brumafria', slug='b', state={'live': True})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.monk = Character.objects.create(owner=self.p1, name='Irmã Ventania', data={
            'name': 'Irmã Ventania', 'className': 'monk', 'level': 6, 'race': 'human', 'speed': 45})
        Membership.objects.create(campaign=self.camp, user=self.p1, character=self.monk, role='player')

    def screen_speed(self):
        r = self.anon.get(f'/api/screen/{self.camp.screen_token}')
        self.assertEqual(r.status_code, 200, r.content)
        return next(m['character']['speed'] for m in r.json()['campaign']['members'] if m.get('character'))

    def test_screen_uses_saved_speed(self):
        self.assertEqual(self.screen_speed(), 45)

    def test_screen_override_wins_and_old_sheet_falls_back(self):
        self.monk.data = {**self.monk.data, 'speedOverride': 25}
        self.monk.save()
        self.assertEqual(self.screen_speed(), 25)
        self.monk.data = {k: v for k, v in self.monk.data.items() if k not in ('speed', 'speedOverride')}
        self.monk.save()
        self.assertEqual(self.screen_speed(), 30)

    def test_combat_pc_uses_saved_speed(self):
        self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/start')
        r = self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/combatants',
                           {'type': 'pc', 'characterId': self.monk.id, 'initiative': 17}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        combat = CombatInstance.objects.get(campaign=self.camp, active=True)
        pc = next(c for c in combat.combatants if c['type'] == 'pc')
        self.assertEqual(pc['stats']['speed'], 45)
