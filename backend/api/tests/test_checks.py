"""
Pedido de teste do mestre para a mesa (CheckRequest/CheckResponse).

Cobre: criação só pelo mestre, alvos (todos/alguns), CD oculta, resposta no
app (servidor rola e respeita DiceRig), dado físico (natural+mod ou total),
sem re-rolagem, mestre anota por jogador, encerrar, telão.
"""
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership, DiceRig, CheckRequest

User = get_user_model()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class CheckRequestTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.p2 = make_user('p2@x.com', 'Bruno')
        self.outsider = make_user('o@x.com', 'Fora')
        self.camp = Campaign.objects.create(dm=self.dm, name='Mesa', slug='mesa')
        self.ch1 = Character.objects.create(owner=self.p1, name='Thal', data={'level': 1})
        self.ch2 = Character.objects.create(owner=self.p2, name='Brom', data={'level': 1})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        Membership.objects.create(campaign=self.camp, user=self.p1, character=self.ch1, role='player')
        Membership.objects.create(campaign=self.camp, user=self.p2, character=self.ch2, role='player')
        self.c_dm, self.c1, self.c2, self.c_out = (APIClient() for _ in range(4))
        self.c_dm.force_login(self.dm)
        self.c1.force_login(self.p1)
        self.c2.force_login(self.p2)
        self.c_out.force_login(self.outsider)

    def create(self, **body):
        data = {'label': 'Percepção', 'kind': 'skill', 'key': 'perception', 'dc': 15, **body}
        r = self.c_dm.post(f'/api/checks/campaign/{self.camp.id}', data, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()['check']

    # --- criação ---
    def test_dm_creates_for_all_players(self):
        check = self.create()
        names = sorted(t['characterName'] for t in check['targets'])
        self.assertEqual(names, ['Brom', 'Thal'])  # mestre não é alvo
        self.assertEqual(check['answered'], 0)

    def test_player_cannot_create(self):
        r = self.c1.post(f'/api/checks/campaign/{self.camp.id}', {'label': 'X'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_outsider_cannot_list(self):
        r = self.c_out.get(f'/api/checks/campaign/{self.camp.id}')
        self.assertEqual(r.status_code, 403)

    def test_invalid_payloads(self):
        url = f'/api/checks/campaign/{self.camp.id}'
        self.assertEqual(self.c_dm.post(url, {'label': ''}, format='json').status_code, 400)
        self.assertEqual(self.c_dm.post(url, {'label': 'X', 'dc': 99}, format='json').status_code, 400)
        self.assertEqual(self.c_dm.post(url, {'label': 'X', 'targetUserIds': [self.outsider.id]}, format='json').status_code, 400)
        self.assertEqual(self.c_dm.post(url, {'label': 'X', 'advantage': 'maybe'}, format='json').status_code, 400)

    def test_specific_targets(self):
        check = self.create(targetUserIds=[self.p1.id])
        self.assertEqual([t['userId'] for t in check['targets']], [self.p1.id])
        mine = self.c1.get('/api/checks/mine').json()['checks']
        self.assertEqual(len(mine), 1)
        self.assertEqual(mine[0]['characterId'], self.ch1.id)  # a ficha certa mostra o pedido
        self.assertEqual(len(self.c2.get('/api/checks/mine').json()['checks']), 0)
        r = self.c2.post(f"/api/checks/{check['id']}/respond", {'mode': 'physical', 'natural': 10}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_hidden_dc_not_leaked_to_player(self):
        self.create(dcHidden=True)
        mine = self.c1.get('/api/checks/mine').json()['checks'][0]
        self.assertIsNone(mine['dc'])
        self.assertTrue(mine['dcHidden'])
        r = self.c1.post(f"/api/checks/{mine['id']}/respond", {'mode': 'physical', 'natural': 20, 'modifier': 5}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()['check']['outcome'])  # não revela passou/falhou
        dm_view = self.c_dm.get(f'/api/checks/campaign/{self.camp.id}').json()['checks'][0]
        self.assertEqual(dm_view['dc'], 15)
        self.assertEqual(dm_view['passed'], 1)

    # --- respostas ---
    def test_app_roll_uses_server_and_rig(self):
        check = self.create()
        DiceRig.objects.create(campaign=self.camp, target_user=self.p1, dice_type='d20', values=[{'value': 3, 'consumed': False}])
        r = self.c1.post(f"/api/checks/{check['id']}/respond", {'mode': 'app', 'modifier': 4}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        resp = r.json()['response']
        self.assertEqual(resp['natural'], 3)
        self.assertEqual(resp['total'], 7)
        self.assertEqual(resp['mode'], 'app')
        self.assertEqual(r.json()['check']['outcome'], 'fail')

    def test_app_roll_cannot_be_rerolled(self):
        check = self.create()
        url = f"/api/checks/{check['id']}/respond"
        self.assertEqual(self.c1.post(url, {'mode': 'app'}, format='json').status_code, 200)
        r = self.c1.post(url, {'mode': 'app'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json().get('error'), 'already_rolled')
        r = self.c1.post(url, {'mode': 'physical', 'natural': 20}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_advantage_rolls_two_and_keeps_best(self):
        check = self.create(advantage='adv')
        DiceRig.objects.create(campaign=self.camp, target_user=self.p1, dice_type='d20',
                               values=[{'value': 4, 'consumed': False}, {'value': 17, 'consumed': False}])
        r = self.c1.post(f"/api/checks/{check['id']}/respond", {'mode': 'app', 'modifier': 0}, format='json')
        resp = r.json()['response']
        self.assertEqual(resp['natural'], 17)
        self.assertEqual([x['kept'] for x in resp['rolls']], [False, True])

    def test_physical_natural_plus_modifier(self):
        check = self.create()
        r = self.c1.post(f"/api/checks/{check['id']}/respond", {'mode': 'physical', 'natural': 12, 'modifier': 3}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['response']['total'], 15)
        self.assertEqual(r.json()['check']['outcome'], 'pass')  # 15 >= CD 15

    def test_physical_total_and_correction(self):
        check = self.create()
        url = f"/api/checks/{check['id']}/respond"
        r = self.c1.post(url, {'mode': 'physical', 'total': 9}, format='json')
        self.assertEqual(r.json()['response']['total'], 9)
        self.assertIsNone(r.json()['response']['natural'])
        # errou a digitação: pode corrigir enquanto o pedido está aberto
        r = self.c1.post(url, {'mode': 'physical', 'total': 19}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['response']['total'], 19)

    def test_physical_validation(self):
        check = self.create()
        url = f"/api/checks/{check['id']}/respond"
        self.assertEqual(self.c1.post(url, {'mode': 'physical', 'natural': 21}, format='json').status_code, 400)
        self.assertEqual(self.c1.post(url, {'mode': 'physical'}, format='json').status_code, 400)
        self.assertEqual(self.c1.post(url, {'mode': 'banana'}, format='json').status_code, 400)

    def test_dm_enters_result_for_player(self):
        check = self.create()
        r = self.c_dm.post(f"/api/checks/{check['id']}/respond",
                           {'userId': self.p2.id, 'mode': 'physical', 'total': 18}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        target = next(t for t in r.json()['check']['targets'] if t['userId'] == self.p2.id)
        self.assertEqual(target['response']['mode'], 'dm')
        self.assertEqual(target['outcome'], 'pass')

    def test_closed_check_rejects_answers_and_leaves_player_list(self):
        check = self.create()
        r = self.c_dm.post(f"/api/checks/{check['id']}/close", {}, format='json')
        self.assertEqual(r.json()['check']['status'], 'closed')
        r = self.c1.post(f"/api/checks/{check['id']}/respond", {'mode': 'physical', 'natural': 5}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.c1.get('/api/checks/mine').json()['checks'], [])
        r = self.c_dm.post(f"/api/checks/{check['id']}/close", {'reopen': True}, format='json')
        self.assertEqual(r.json()['check']['status'], 'open')

    def test_player_cannot_close_or_delete(self):
        check = self.create()
        self.assertEqual(self.c1.post(f"/api/checks/{check['id']}/close", {}, format='json').status_code, 403)
        self.assertEqual(self.c1.delete(f"/api/checks/{check['id']}").status_code, 403)
        self.assertEqual(self.c_dm.delete(f"/api/checks/{check['id']}").status_code, 200)
        self.assertFalse(CheckRequest.objects.exists())

    # --- telão ---
    def test_screen_shows_only_when_dm_decides(self):
        check = self.create(dcHidden=True)
        self.c1.post(f"/api/checks/{check['id']}/respond", {'mode': 'physical', 'natural': 18, 'modifier': 2}, format='json')
        screen = self.client.get(f'/api/screen/{self.camp.screen_token}').json()['campaign']
        self.assertIsNone(screen['publicCheck'])
        r = self.c_dm.post(f"/api/checks/{check['id']}/screen", {'show': True}, format='json')
        self.assertTrue(r.json()['check']['showOnScreen'])
        pc = self.client.get(f'/api/screen/{self.camp.screen_token}').json()['campaign']['publicCheck']
        self.assertEqual(pc['label'], 'Percepção')
        self.assertIsNone(pc['dc'])  # CD oculta não vai pro telão
        thal = next(x for x in pc['results'] if x['name'] == 'Thal')
        self.assertEqual((thal['total'], thal['outcome']), (20, 'pass'))
        brom = next(x for x in pc['results'] if x['name'] == 'Brom')
        self.assertIsNone(brom['total'])
        # só um no telão por vez
        other = self.create(label='Furtividade')
        self.c_dm.post(f"/api/checks/{other['id']}/screen", {'show': True}, format='json')
        pc = self.client.get(f'/api/screen/{self.camp.screen_token}').json()['campaign']['publicCheck']
        self.assertEqual(pc['label'], 'Furtividade')
        self.c_dm.post(f"/api/checks/{other['id']}/screen", {'show': False}, format='json')
        self.assertIsNone(self.client.get(f'/api/screen/{self.camp.screen_token}').json()['campaign']['publicCheck'])

    def test_player_cannot_put_on_screen(self):
        check = self.create()
        self.assertEqual(self.c1.post(f"/api/checks/{check['id']}/screen", {'show': True}, format='json').status_code, 403)
