"""
"Mesa agora" do mestre: descanso curto da mesa inteira (/short-rest-all) e
preferências de avisos / fim de encontro guardadas em campaign.state.
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership, DiaryEntry

User = get_user_model()


def make_user(email, name='User', password='senha-forte-2026'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password=password)
    Profile.objects.create(user=u, display_name=name)
    return u


class ShortRestAllTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.p2 = make_user('p2@x.com', 'Bia')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p1 = APIClient(); self.c_p1.force_login(self.p1)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.warlock = Character.objects.create(owner=self.p1, name='Thal', data={
            'name': 'Thal', 'className': 'warlock', 'level': 3,
            'spellSlotsUsed': [0, 2, 0, 0, 0, 0, 0, 0, 0],
            'currentHp': 5, 'maxHp': 20, 'hitDiceUsed': 2,
        })
        self.fighter = Character.objects.create(owner=self.p2, name='Kor', data={
            'name': 'Kor', 'className': 'fighter', 'level': 3,
            'resourcesUsed': {'fighter.actionSurge': 1, 'fighter.secondWind2014': 1},
            'currentHp': 8, 'maxHp': 28,
        })
        Membership.objects.create(campaign=self.camp, user=self.p1, character=self.warlock, role='player')
        Membership.objects.create(campaign=self.camp, user=self.p2, character=self.fighter, role='player')

    def url(self):
        return f'/api/campaigns/{self.camp.id}/short-rest-all'

    def test_short_rest_restores_short_things_only(self):
        r = self.c_dm.post(self.url())
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(set(r.json()['restedCharacters']), {self.warlock.id, self.fighter.id})
        self.warlock.refresh_from_db(); self.fighter.refresh_from_db()
        # Bruxo recupera os espaços do Pacto; PV não sobem sozinhos (o jogador gasta dados de vida).
        self.assertEqual(self.warlock.data['spellSlotsUsed'], [0] * 9)
        self.assertEqual(self.warlock.data['currentHp'], 5)
        self.assertEqual(self.warlock.data['hitDiceUsed'], 2)
        # Surto de Ação / Retomar o Fôlego voltam no descanso curto.
        self.assertEqual(self.fighter.data['resourcesUsed'].get('fighter.actionSurge', 0), 0)
        self.assertEqual(self.fighter.data['currentHp'], 8)

    def test_requires_dm(self):
        r = self.c_p1.post(self.url())
        self.assertEqual(r.status_code, 403)
        self.warlock.refresh_from_db()
        self.assertEqual(self.warlock.data['spellSlotsUsed'][1], 2)

    def test_anonymous_rejected(self):
        r = APIClient().post(self.url())
        self.assertIn(r.status_code, (401, 403))

    def test_logs_short_rest_in_diary(self):
        self.c_dm.post(self.url())
        [e] = DiaryEntry.objects.filter(campaign=self.camp, subtype='rest')
        self.assertEqual(e.data['rest'], 'short')
        self.assertEqual(set(e.data['characters']), {'Thal', 'Kor'})
        self.assertIn('curto', e.title)

    def test_other_campaign_untouched(self):
        other_dm = make_user('odm@x.com')
        other = Campaign.objects.create(dm=other_dm, name='O', slug='o')
        c = APIClient(); c.force_login(other_dm)
        r = c.post(f'/api/campaigns/{other.id}/short-rest-all')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['restedCharacters'], [])
        self.warlock.refresh_from_db()
        self.assertEqual(self.warlock.data['spellSlotsUsed'][1], 2)


class TableNowStateTests(TestCase):
    """Preferências da Mesa agora ficam no JSON de state (sem migração)."""

    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p1 = APIClient(); self.c_p1.force_login(self.p1)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c', state={'scene': 'Taverna'})
        Membership.objects.create(campaign=self.camp, user=self.p1, role='player')

    def test_dm_saves_nudge_prefs_and_wizard_toggle(self):
        state = {'scene': 'Taverna', 'nudges': {'legendary': False, 'lowHp': True},
                 'endOfEncounterWizard': True, 'concentration': {'char:1': {'spell': 'Bênção'}}}
        r = self.c_dm.put(f'/api/campaigns/{self.camp.id}', {'state': state}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        got = self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']['state']
        self.assertEqual(got['nudges'], {'legendary': False, 'lowHp': True})
        self.assertTrue(got['endOfEncounterWizard'])
        self.assertEqual(got['concentration']['char:1']['spell'], 'Bênção')

    def test_player_cannot_change_prefs(self):
        r = self.c_p1.put(f'/api/campaigns/{self.camp.id}', {'state': {'nudges': {'zeroHp': False}}}, format='json')
        self.assertEqual(r.status_code, 403)


class CombatLogDamageTakenTests(TestCase):
    """O log do combate guarda o dano sofrido (base do aviso de concentração)."""

    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        base = f'/api/combat/campaign/{self.camp.id}'
        self.base = base
        for name in ('Orc', 'Mago'):
            r = self.c_dm.post(f'{base}/combatants', {'type': 'monster', 'monster': {
                'name': name, 'hp': 30, 'ac': 5,
                'damageResistances': ['fire'] if name == 'Mago' else [],
                'actions': [{'name': 'Tocha', 'type': 'melee', 'atk': 5, 'damage': '4', 'damageType': 'fire'}],
            }}, format='json')
            self.assertEqual(r.status_code, 200, r.content)
        self.ids = {c['name']: c['id'] for c in r.json()['combat']['combatants']}

    def test_attack_logs_damage_after_resistance(self):
        from unittest import mock
        with mock.patch('api.combat.roll_die', return_value=10):
            r = self.c_dm.post(f'{self.base}/action', {
                'action': 'attack', 'attackerId': self.ids['Orc'], 'targetId': self.ids['Mago'], 'actionIndex': 0,
            }, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        entry = [e for e in r.json()['combat']['log'] if e['type'] == 'attack'][-1]
        self.assertTrue(entry['hit'])
        self.assertEqual(entry['damage']['total'], 4)
        self.assertEqual(entry['damage_taken'], 2)  # resistência a fogo
