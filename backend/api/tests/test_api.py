"""
Testes de integração da API — cobre fluxo de auth, personagens, campanhas,
aprovações, dice rigging, telão, e principalmente AUTORIZAÇÃO.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership, Approval, DiceRig

User = get_user_model()


def _signup(client, email, display_name='User', password='senha-forte-1234'):
    """Cria usuário direto pelo ORM para simplificar testes (evita CSRF/validators)."""
    user = User.objects.create_user(username=email.split('@')[0], email=email, password=password)
    Profile.objects.create(user=user, display_name=display_name)
    client.force_login(user)
    return user


class AuthTests(TestCase):
    def test_signup_login_me_logout(self):
        c = APIClient()
        # CSRF
        r = c.get('/api/auth/csrf')
        self.assertEqual(r.status_code, 200)
        # Não dá pra testar signup com CSRF/cookie facilmente via APIClient sem enforce.
        # Cria via ORM e testa que a sessão funciona via /me:
        user = User.objects.create_user(username='alice', email='alice@test.com', password='senha-forte-1234')
        Profile.objects.create(user=user, display_name='Alice')

        r = c.post('/api/auth/login', {'email': 'alice@test.com', 'password': 'senha-forte-1234'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['user']['email'], 'alice@test.com')

        r = c.get('/api/auth/me')
        self.assertEqual(r.status_code, 200)

        r = c.post('/api/auth/logout')
        self.assertEqual(r.status_code, 200)
        r = c.get('/api/auth/me')
        # DRF SessionAuthentication retorna 403 quando não há sessão; 401 só viria
        # com BasicAuth. Ambos os códigos significam "não autenticado" na prática.
        self.assertIn(r.status_code, (401, 403))

    def test_login_invalid_credentials(self):
        c = APIClient()
        User.objects.create_user(username='bob', email='bob@test.com', password='senha-forte-1234')
        r = c.post('/api/auth/login', {'email': 'bob@test.com', 'password': 'wrong'}, format='json')
        self.assertEqual(r.status_code, 401)


class CharacterAuthzTests(TestCase):
    def setUp(self):
        self.c_alice = APIClient()
        self.c_bob = APIClient()
        self.alice = _signup(self.c_alice, 'alice@x.com')
        self.bob = _signup(self.c_bob, 'bob@x.com')

    def test_alice_creates_and_lists_only_hers(self):
        r = self.c_alice.post('/api/characters', {'name': 'Thalion', 'data': {'level': 1}}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        char_id = r.json()['character']['id']

        r = self.c_alice.get('/api/characters')
        self.assertEqual(len(r.json()['characters']), 1)

        r = self.c_bob.get('/api/characters')
        self.assertEqual(len(r.json()['characters']), 0)

    def test_bob_cannot_read_alices_character(self):
        char = Character.objects.create(owner=self.alice, name='X', data={})
        r = self.c_bob.get(f'/api/characters/{char.id}')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_edit_alices_character(self):
        char = Character.objects.create(owner=self.alice, name='X', data={})
        r = self.c_bob.put(f'/api/characters/{char.id}', {'name': 'Hacked', 'data': {}}, format='json')
        self.assertEqual(r.status_code, 403)
        char.refresh_from_db()
        self.assertEqual(char.name, 'X')

    def test_bob_cannot_delete_alices_character(self):
        char = Character.objects.create(owner=self.alice, name='X', data={})
        r = self.c_bob.delete(f'/api/characters/{char.id}')
        self.assertEqual(r.status_code, 403)
        self.assertTrue(Character.objects.filter(id=char.id).exists())

    def test_character_campaigns_lists_only_assigned(self):
        from api.models import Campaign, Membership
        char = Character.objects.create(owner=self.alice, name='Thal', data={'level': 1})
        camp = Campaign.objects.create(dm=self.alice, name='C1', slug='c1')
        Membership.objects.create(campaign=camp, user=self.alice, character=char, role='player')

        # Personagem em 1 campanha
        r = self.c_alice.get(f'/api/characters/{char.id}/campaigns')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()['campaigns']), 1)
        self.assertEqual(r.json()['campaigns'][0]['id'], camp.id)

        # Outro user não pode ver as campanhas do char alheio
        r = self.c_bob.get(f'/api/characters/{char.id}/campaigns')
        self.assertEqual(r.status_code, 403)


class CampaignAuthzTests(TestCase):
    def setUp(self):
        self.c_dm = APIClient()
        self.c_player = APIClient()
        self.c_outsider = APIClient()
        self.dm = _signup(self.c_dm, 'dm@x.com', 'Mestre')
        self.player = _signup(self.c_player, 'p@x.com', 'Player')
        self.outsider = _signup(self.c_outsider, 'out@x.com', 'Out')

        self.camp = Campaign.objects.create(dm=self.dm, name='Reino', slug='reino')
        self.player_char = Character.objects.create(owner=self.player, name='Thal', data={'level': 1, 'className': 'druid'})
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.player_char, role='player')

    def test_outsider_cannot_read_campaign(self):
        r = self.c_outsider.get(f'/api/campaigns/{self.camp.id}')
        self.assertEqual(r.status_code, 403)

    def test_player_can_read_campaign_but_no_secrets(self):
        r = self.c_player.get(f'/api/campaigns/{self.camp.id}')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('inviteCode', r.json()['campaign'])
        self.assertNotIn('screenToken', r.json()['campaign'])

    def test_dm_sees_invite_code(self):
        r = self.c_dm.get(f'/api/campaigns/{self.camp.id}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['campaign']['inviteCode'], self.camp.invite_code)

    def test_player_cannot_edit_campaign(self):
        r = self.c_player.put(f'/api/campaigns/{self.camp.id}', {'name': 'Pwned'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_dm_can_edit_campaign(self):
        r = self.c_dm.put(f'/api/campaigns/{self.camp.id}', {'name': 'Outro Reino'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_join_with_invite_code(self):
        new = APIClient()
        u = _signup(new, 'new@x.com', 'New')
        r = new.post('/api/campaigns/join', {'inviteCode': self.camp.invite_code}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(Membership.objects.filter(campaign=self.camp, user=u).exists())

    def test_join_with_invalid_code(self):
        new = APIClient()
        _signup(new, 'new@x.com', 'New')
        r = new.post('/api/campaigns/join', {'inviteCode': 'XXXXXX'}, format='json')
        self.assertEqual(r.status_code, 404)


class ApprovalFlowTests(TestCase):
    def setUp(self):
        self.c_dm = APIClient()
        self.c_player = APIClient()
        self.dm = _signup(self.c_dm, 'dm@x.com', 'M')
        self.player = _signup(self.c_player, 'p@x.com', 'P')
        self.camp = Campaign.objects.create(dm=self.dm, name='R', slug='r')
        self.char = Character.objects.create(
            owner=self.player, name='T',
            data={'level': 2, 'className': 'druid', 'subclass': 'stars',
                  'currentHp': 15, 'maxHp': 15,
                  'abilities': {'str': 8, 'dex': 14, 'con': 12, 'int': 13, 'wis': 16, 'cha': 10}},
        )
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char, role='player')

    def test_player_creates_approval_dm_unlocks_player_consumes(self):
        r = self.c_player.post(f'/api/approvals/campaign/{self.camp.id}',
            {'characterId': self.char.id, 'type': 'levelup', 'payload': {'toLevel': 3, 'hpGain': 6}},
            format='json')
        self.assertEqual(r.status_code, 200, r.content)
        appr_id = r.json()['approval']['id']

        # DM aprova (libera, NÃO aplica): level continua igual.
        r = self.c_dm.post(f'/api/approvals/{appr_id}/review', {'status': 'approved'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['approval']['status'], 'approved')
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['level'], 2, 'aprovar não deve mudar nível')

        # Jogador consome: level sobe e autos rodam.
        r = self.c_player.post(f'/api/approvals/{appr_id}/consume', format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['approval']['status'], 'consumed')
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['level'], 3)
        self.assertEqual(self.char.data['maxHp'], 21)
        # Guidance entrou pela engine
        self.assertTrue(any(s.get('id') == 'guidance' for s in self.char.data.get('spells', [])))

    def test_player_cannot_review_own_approval(self):
        a = Approval.objects.create(campaign=self.camp, character=self.char, requested_by=self.player,
                                    type='levelup', payload={'toLevel': 3})
        r = self.c_player.post(f'/api/approvals/{a.id}/review', {'status': 'approved'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_invalid_levelup_rejected(self):
        # pular nível
        r = self.c_player.post(f'/api/approvals/campaign/{self.camp.id}',
            {'characterId': self.char.id, 'type': 'levelup', 'payload': {'toLevel': 5}},
            format='json')
        self.assertEqual(r.status_code, 400)


class DiceRigTests(TestCase):
    def setUp(self):
        self.c_dm = APIClient()
        self.c_player = APIClient()
        self.dm = _signup(self.c_dm, 'dm@x.com', 'M')
        self.player = _signup(self.c_player, 'p@x.com', 'P')
        self.camp = Campaign.objects.create(dm=self.dm, name='R', slug='r')
        Membership.objects.create(campaign=self.camp, user=self.player, role='player')

    def test_player_cannot_list_rigs(self):
        r = self.c_player.get(f'/api/dice/campaign/{self.camp.id}/rigs')
        self.assertEqual(r.status_code, 403)

    def test_dm_creates_rig_player_consumes(self):
        r = self.c_dm.post(f'/api/dice/campaign/{self.camp.id}/rigs',
            {'targetUserId': self.player.id, 'diceType': 'd20',
             'values': [{'value': 20}, {'value': 1}]},
            format='json')
        self.assertEqual(r.status_code, 200, r.content)

        r = self.c_player.post('/api/dice/roll',
            {'diceType': 'd20', 'campaignId': self.camp.id, 'count': 3},
            format='json')
        results = r.json()['results']
        self.assertEqual(results[0]['value'], 20)
        self.assertTrue(results[0]['rigged'])
        self.assertEqual(results[1]['value'], 1)
        self.assertTrue(results[1]['rigged'])
        # 3a rolagem cai pra random (fila esvaziada)
        self.assertFalse(results[2]['rigged'])
        self.assertGreaterEqual(results[2]['value'], 1)
        self.assertLessEqual(results[2]['value'], 20)

    def test_solo_roll_never_rigged(self):
        DiceRig.objects.create(campaign=self.camp, target_user=self.player, dice_type='d20', values=[{'value': 20}])
        # sem campaignId, não deve rigar
        r = self.c_player.post('/api/dice/roll', {'diceType': 'd20'}, format='json')
        self.assertFalse(r.json()['results'][0]['rigged'])


class ScreenPublicTests(TestCase):
    def setUp(self):
        self.dm = User.objects.create_user(username='dm', email='dm@x.com', password='x' * 12)
        Profile.objects.create(user=self.dm, display_name='M')
        self.camp = Campaign.objects.create(dm=self.dm, name='R', slug='r')

    def test_screen_public_no_auth(self):
        c = APIClient()
        r = c.get(f'/api/screen/{self.camp.screen_token}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['campaign']['name'], 'R')

    def test_screen_invalid_token(self):
        c = APIClient()
        r = c.get('/api/screen/nope')
        self.assertEqual(r.status_code, 404)


class HealthTests(TestCase):
    def test_health_endpoint(self):
        r = self.client.get('/api/health')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['ok'])
