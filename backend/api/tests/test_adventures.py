"""
Preparação do mestre (Adventure): CRUD, permissões (só mestre), validação do
JSON (forma e limites), estado de jogo (play) e diário, cena no telão.
"""
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership, Adventure, DiaryEntry

User = get_user_model()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


def sample_data():
    return {
        'version': 1,
        'nodes': [
            {'id': 'n1', 'name': 'Entrada', 'kind': 'room', 'x': 0, 'y': 0, 'readAloud': 'Um corredor úmido.',
             'notes': 'segredo', 'tags': ['início'],
             'encounter': [{'monsterId': 'goblin-warrior', 'name': 'Goblin', 'crNum': 0.25, 'count': 3}],
             'hazards': [{'name': 'Fosso', 'dc': 12, 'effect': 'cai', 'damage': '2d6'}],
             'checks': [{'skill': 'perception', 'dc': 13, 'note': 'porta'}],
             'treasure': {'items': [{'name': 'Poção de Cura', 'type': 'potion', 'qty': 2}], 'coins': {'gp': 30}}},
            {'id': 'n2', 'name': 'Cripta', 'kind': 'boss', 'x': 300, 'y': 0},
        ],
        'edges': [
            {'id': 'e1', 'from': 'n1', 'to': 'n2', 'kind': 'locked', 'label': 'Porta de ferro', 'condition': 'precisa da chave'},
            {'id': 'e2', 'from': 'n2', 'to': None, 'kind': 'adventure', 'toAdventureId': 99, 'toAdventureName': 'Parte 2'},
        ],
    }


class AdventureTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.other_dm = make_user('o@x.com', 'Outro')
        self.camp = Campaign.objects.create(dm=self.dm, name='Mesa', slug='mesa', state={'session': '3', 'weather': 'chuva'})
        self.other = Campaign.objects.create(dm=self.other_dm, name='Outra', slug='outra')
        self.ch1 = Character.objects.create(owner=self.p1, name='Thal', data={'level': 1})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        Membership.objects.create(campaign=self.camp, user=self.p1, character=self.ch1, role='player')
        self.c_dm, self.c1, self.c_out = APIClient(), APIClient(), APIClient()
        self.c_dm.force_login(self.dm)
        self.c1.force_login(self.p1)
        self.c_out.force_login(self.other_dm)
        self.base = f'/api/campaigns/{self.camp.id}/adventures'

    def create(self, **body):
        r = self.c_dm.post(self.base, {'name': 'A Cripta', **body}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()['adventure']

    # --- CRUD ---
    def test_crud(self):
        adv = self.create(summary='Resumo', data=sample_data())
        self.assertEqual(adv['status'], 'draft')
        self.assertEqual(len(adv['data']['nodes']), 2)
        self.assertEqual(adv['data']['nodes'][0]['treasure']['coins'], {'gp': 30})
        self.assertEqual(adv['play'], {'current': None, 'visited': [], 'unlocked': []})

        r = self.c_dm.get(self.base)
        self.assertEqual(r.status_code, 200)
        row = r.json()['adventures'][0]
        self.assertEqual(row['nodeCount'], 2)
        self.assertNotIn('data', row)  # lista leve

        url = f'{self.base}/{adv["id"]}'
        r = self.c_dm.patch(url, {'status': 'playing', 'name': 'Nova'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['adventure']['status'], 'playing')
        self.assertEqual(self.c_dm.get(url).json()['adventure']['name'], 'Nova')

        self.assertEqual(self.c_dm.delete(url).status_code, 200)
        self.assertFalse(Adventure.objects.exists())

    def test_slug_works(self):
        self.create()
        r = self.c_dm.get('/api/campaigns/mesa/adventures')
        self.assertEqual(len(r.json()['adventures']), 1)

    # --- permissões ---
    def test_player_sees_nothing(self):
        adv = self.create(data=sample_data())
        url = f'{self.base}/{adv["id"]}'
        self.assertEqual(self.c1.get(self.base).status_code, 403)
        self.assertEqual(self.c1.get(url).status_code, 403)
        self.assertEqual(self.c1.post(self.base, {'name': 'X'}, format='json').status_code, 403)
        self.assertEqual(self.c1.patch(url, {'name': 'X'}, format='json').status_code, 403)
        self.assertEqual(self.c1.delete(url).status_code, 403)
        self.assertEqual(self.c1.post(f'{url}/play', {'action': 'enter', 'nodeId': 'n1'}, format='json').status_code, 403)
        self.assertEqual(self.c1.post(f'{url}/screen', {'nodeId': 'n1'}, format='json').status_code, 403)
        # e nada vaza pela campanha
        body = self.c1.get(f'/api/campaigns/{self.camp.id}').content.decode()
        self.assertNotIn('segredo', body)

    def test_other_dm_and_anonymous(self):
        adv = self.create()
        self.assertEqual(self.c_out.get(self.base).status_code, 403)
        self.assertEqual(self.c_out.get(f'{self.base}/{adv["id"]}').status_code, 403)
        self.assertIn(APIClient().get(self.base).status_code, (401, 403))

    def test_adventure_of_other_campaign_is_404(self):
        foreign = Adventure.objects.create(campaign=self.other, name='X')
        self.assertEqual(self.c_dm.get(f'{self.base}/{foreign.id}').status_code, 404)

    # --- validação ---
    def test_invalid_payloads(self):
        post = lambda body: self.c_dm.post(self.base, body, format='json').status_code
        self.assertEqual(post({'name': ''}), 400)
        self.assertEqual(post({'name': 'X', 'status': 'weird'}), 400)
        self.assertEqual(post({'name': 'X', 'data': 'nope'}), 400)
        self.assertEqual(post({'name': 'X', 'data': {'nodes': 'nope'}}), 400)
        dup = {'nodes': [{'id': 'a', 'name': 'A'}, {'id': 'a', 'name': 'B'}]}
        self.assertEqual(post({'name': 'X', 'data': dup}), 400)
        dangling = {'nodes': [{'id': 'a', 'name': 'A'}], 'edges': [{'id': 'e', 'from': 'a', 'to': 'zz'}]}
        self.assertEqual(post({'name': 'X', 'data': dangling}), 400)
        no_target = {'nodes': [{'id': 'a', 'name': 'A'}], 'edges': [{'id': 'e', 'from': 'a', 'to': None, 'kind': 'door'}]}
        self.assertEqual(post({'name': 'X', 'data': no_target}), 400)
        bad_img = {'nodes': [{'id': 'a', 'name': 'A', 'image': 'javascript:alert(1)'}]}
        self.assertEqual(post({'name': 'X', 'data': bad_img}), 400)
        big_img = {'nodes': [{'id': 'a', 'name': 'A', 'image': 'data:image/jpeg;base64,' + 'A' * 500_000}]}
        self.assertEqual(post({'name': 'X', 'data': big_img}), 400)
        many = {'nodes': [{'id': f'n{i}', 'name': 'N'} for i in range(201)]}
        self.assertEqual(post({'name': 'X', 'data': many}), 400)
        bad_item = {'nodes': [{'id': 'a', 'name': 'A', 'treasure': {'items': [{'type': 'gear'}]}}]}
        self.assertEqual(post({'name': 'X', 'data': bad_item}), 400)

    def test_normalizes_fields(self):
        data = {'nodes': [{'id': 'a', 'name': '  Sala  ', 'kind': 'hacker', 'x': 'abc', 'y': 1e12,
                           'extra': 'lixo', 'tags': ['t', 't', 'u'],
                           'encounter': [{'monsterId': 'x', 'name': 'X', 'count': 999}],
                           'hazards': [{'name': 'H', 'dc': 99}],
                           'treasure': {'coins': {'gp': -5, 'pp': 2, 'zz': 9}}}]}
        adv = self.create(data=data)
        n = adv['data']['nodes'][0]
        self.assertEqual(n['name'], 'Sala')
        self.assertEqual(n['kind'], 'room')
        self.assertEqual(n['x'], 0)
        self.assertEqual(n['y'], 100_000)
        self.assertNotIn('extra', n)
        self.assertEqual(n['tags'], ['t', 'u'])
        self.assertEqual(n['encounter'][0]['count'], 50)
        self.assertEqual(n['hazards'][0]['dc'], 40)
        self.assertEqual(n['treasure']['coins'], {'pp': 2})

    def test_limit_per_campaign(self):
        for i in range(100):
            Adventure.objects.create(campaign=self.camp, name=f'A{i}')
        r = self.c_dm.post(self.base, {'name': 'Mais uma'}, format='json')
        self.assertEqual(r.status_code, 400)

    # --- estado de jogo ---
    def test_play_enter_logs_diary(self):
        adv = self.create(data=sample_data())
        url = f'{self.base}/{adv["id"]}/play'
        r = self.c_dm.post(url, {'action': 'enter', 'nodeId': 'n1'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        a = r.json()['adventure']
        self.assertEqual(a['play']['current'], 'n1')
        self.assertEqual(a['play']['visited'], ['n1'])
        self.assertEqual(a['status'], 'playing')
        entry = DiaryEntry.objects.get(campaign=self.camp)
        self.assertEqual(entry.title, 'O grupo entrou em Entrada')
        self.assertEqual(entry.session, 3)
        self.assertFalse(entry.hidden)

        # sem registro no diário quando o mestre desmarca
        self.c_dm.post(url, {'action': 'enter', 'nodeId': 'n2', 'log': False}, format='json')
        self.assertEqual(DiaryEntry.objects.count(), 1)

        r = self.c_dm.post(url, {'action': 'unlock', 'edgeId': 'e1'}, format='json')
        self.assertEqual(r.json()['adventure']['play']['unlocked'], ['e1'])
        r = self.c_dm.post(url, {'action': 'lock', 'edgeId': 'e1'}, format='json')
        self.assertEqual(r.json()['adventure']['play']['unlocked'], [])
        r = self.c_dm.post(url, {'action': 'unvisit', 'nodeId': 'n2'}, format='json')
        self.assertEqual(r.json()['adventure']['play'], {'current': None, 'visited': ['n1'], 'unlocked': []})
        r = self.c_dm.post(url, {'action': 'reset'}, format='json')
        self.assertEqual(r.json()['adventure']['play']['visited'], [])

        self.assertEqual(self.c_dm.post(url, {'action': 'enter', 'nodeId': 'nope'}, format='json').status_code, 400)
        self.assertEqual(self.c_dm.post(url, {'action': 'unlock', 'edgeId': 'nope'}, format='json').status_code, 400)
        self.assertEqual(self.c_dm.post(url, {'action': 'dance'}, format='json').status_code, 400)

    def test_play_log_custom(self):
        adv = self.create(data=sample_data())
        url = f'{self.base}/{adv["id"]}/play'
        r = self.c_dm.post(url, {'action': 'log', 'nodeId': 'n1', 'text': 'Tesouro entregue: 30 po'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(DiaryEntry.objects.get().title, 'Tesouro entregue: 30 po')

    def test_editing_structure_keeps_play_but_drops_removed_nodes(self):
        adv = self.create(data=sample_data())
        url = f'{self.base}/{adv["id"]}'
        self.c_dm.post(f'{url}/play', {'action': 'enter', 'nodeId': 'n2', 'log': False}, format='json')
        self.c_dm.post(f'{url}/play', {'action': 'unlock', 'edgeId': 'e1'}, format='json')
        # autosave do editor não mexe no play
        data = sample_data()
        data['nodes'][0]['name'] = 'Entrada 2'
        r = self.c_dm.patch(url, {'data': data}, format='json')
        self.assertEqual(r.json()['adventure']['play']['current'], 'n2')
        self.assertEqual(r.json()['adventure']['play']['unlocked'], ['e1'])
        # remover o nó limpa as referências
        data = {'nodes': [data['nodes'][0]], 'edges': []}
        r = self.c_dm.patch(url, {'data': data}, format='json')
        self.assertEqual(r.json()['adventure']['play'], {'current': None, 'visited': [], 'unlocked': []})

    # --- telão ---
    def test_screen_merges_state(self):
        adv = self.create(data=sample_data())
        url = f'{self.base}/{adv["id"]}/screen'
        r = self.c_dm.post(url, {'nodeId': 'n1', 'text': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['scene'], 'Entrada')
        self.assertEqual(self.camp.state['sceneText'], 'Um corredor úmido.')
        self.assertEqual(self.camp.state['weather'], 'chuva')  # preservado
        # notas secretas nunca vão para o telão
        screen = APIClient().get(f'/api/screen/{self.camp.screen_token}').content.decode()
        self.assertNotIn('segredo', screen)
        self.c_dm.post(url, {'nodeId': None}, format='json')
        self.camp.refresh_from_db()
        self.assertNotIn('sceneText', self.camp.state)
        self.assertEqual(self.camp.state['scene'], 'Entrada')
