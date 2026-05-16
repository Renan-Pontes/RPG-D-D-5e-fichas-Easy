"""
Testes de segurança: rate limit, autorização cross-user, padronização de erro.
"""
from django.core.cache import cache
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership, DiceRig

User = get_user_model()


def make_user(email, name='User', password='senha-forte-2026'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password=password)
    Profile.objects.create(user=u, display_name=name)
    return u


class RateLimitTests(TestCase):
    def setUp(self):
        cache.clear()  # zera contador entre testes

    def test_login_blocks_after_too_many_attempts(self):
        c = APIClient()
        make_user('a@x.com')
        # 10 tentativas com senha errada
        for _ in range(10):
            r = c.post('/api/auth/login', {'email': 'a@x.com', 'password': 'wrong'}, format='json')
            self.assertEqual(r.status_code, 401)
        # 11ª deve ser rate-limited
        r = c.post('/api/auth/login', {'email': 'a@x.com', 'password': 'wrong'}, format='json')
        self.assertEqual(r.status_code, 429)
        self.assertEqual(r.json()['error'], 'rate_limited')
        self.assertIn('retryAfter', r.json())

    def test_signup_blocks_after_too_many_attempts(self):
        c = APIClient()
        # 5 signups (limite)
        for i in range(5):
            c.post('/api/auth/signup',
                   {'email': f'sx{i}@x.com', 'password': f'forja-test-2026-{i}', 'displayName': f'U{i}'},
                   format='json')
        # 6ª deve estourar
        r = c.post('/api/auth/signup',
                   {'email': 'sx6@x.com', 'password': 'forja-test-2026-x', 'displayName': 'U6'},
                   format='json')
        self.assertEqual(r.status_code, 429)

    def test_successful_login_resets_counter(self):
        c = APIClient()
        make_user('a@x.com')
        # 5 falhas
        for _ in range(5):
            c.post('/api/auth/login', {'email': 'a@x.com', 'password': 'wrong'}, format='json')
        # login OK reseta
        r = c.post('/api/auth/login', {'email': 'a@x.com', 'password': 'senha-forte-2026'}, format='json')
        self.assertEqual(r.status_code, 200)
        # 10 novas tentativas devem ser permitidas
        c2 = APIClient()
        c2.post('/api/auth/logout')
        # ... mas ratelimit é por IP, e o teste usa o mesmo IP. Após reset, contador zera.
        for _ in range(8):
            r = c.post('/api/auth/login', {'email': 'a@x.com', 'password': 'wrong'}, format='json')
            self.assertEqual(r.status_code, 401)


class CrossUserAuthorizationTests(TestCase):
    """Auditoria — todo recurso de outro user é negado."""

    def setUp(self):
        cache.clear()
        self.alice = make_user('alice@x.com', 'Alice')
        self.bob = make_user('bob@x.com', 'Bob')
        self.c_alice = APIClient(); self.c_alice.force_login(self.alice)
        self.c_bob = APIClient(); self.c_bob.force_login(self.bob)

        # Alice tem 1 personagem e 1 campanha
        self.alice_char = Character.objects.create(owner=self.alice, name='Alice Char', data={'level': 1})
        self.alice_camp = Campaign.objects.create(dm=self.alice, name='Alice Camp', slug='alicec')

        # Bob tem 1 personagem
        self.bob_char = Character.objects.create(owner=self.bob, name='Bob Char', data={'level': 1})

    def test_bob_cannot_attach_alice_character_to_alice_campaign(self):
        # Bob entra na campanha da Alice
        m = Membership.objects.create(campaign=self.alice_camp, user=self.bob, role='player')
        # tenta atribuir personagem da Alice
        r = self.c_bob.put(
            f'/api/campaigns/{self.alice_camp.id}/members/{m.id}',
            {'characterId': self.alice_char.id}, format='json',
        )
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_create_approval_for_alice_character(self):
        # Bob entra na campanha da Alice
        Membership.objects.create(campaign=self.alice_camp, user=self.bob, role='player')
        r = self.c_bob.post(
            f'/api/approvals/campaign/{self.alice_camp.id}',
            {'characterId': self.alice_char.id, 'type': 'levelup',
             'payload': {'toLevel': 2, 'hpGain': 5}},
            format='json',
        )
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_review_approval_in_other_campaign(self):
        # Alice é a DM. Bob pede approval pro próprio personagem na campanha dela.
        Membership.objects.create(campaign=self.alice_camp, user=self.bob, character=self.bob_char, role='player')
        appr = self.c_bob.post(
            f'/api/approvals/campaign/{self.alice_camp.id}',
            {'characterId': self.bob_char.id, 'type': 'levelup',
             'payload': {'toLevel': 2, 'hpGain': 5}},
            format='json',
        )
        self.assertEqual(appr.status_code, 200)
        appr_id = appr.json()['approval']['id']
        # Bob tenta aprovar (não é DM)
        r = self.c_bob.post(f'/api/approvals/{appr_id}/review', {'status': 'approved'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_outsider_cannot_join_unknown_campaign(self):
        outsider = make_user('out@x.com')
        c = APIClient(); c.force_login(outsider)
        r = c.post('/api/campaigns/join', {'inviteCode': 'INVALID'}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_bob_cannot_list_alices_rigs(self):
        DiceRig.objects.create(campaign=self.alice_camp, target_user=self.bob, dice_type='d20', values=[{'value': 20}])
        r = self.c_bob.get(f'/api/dice/campaign/{self.alice_camp.id}/rigs')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_rotate_invite_in_alices_campaign(self):
        r = self.c_bob.post(f'/api/campaigns/{self.alice_camp.id}/rotate-invite-code')
        # Bob nem é membro - retorna 403 via require_dm
        self.assertEqual(r.status_code, 403)

    def test_screen_endpoint_does_not_leak_invite_code(self):
        c = APIClient()  # anônimo
        r = c.get(f'/api/screen/{self.alice_camp.screen_token}')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertNotIn('inviteCode', data.get('campaign', {}))
        self.assertNotIn('invite_code', data.get('campaign', {}))


class ErrorShapeTests(TestCase):
    """Mensagens de erro padronizadas no formato {error: 'code', ...}."""

    def setUp(self):
        cache.clear()

    def test_unauthenticated_returns_auth_required(self):
        c = APIClient()
        r = c.get('/api/characters')
        self.assertIn(r.status_code, (401, 403))
        self.assertEqual(r.json()['error'], 'auth_required')

    def test_not_found_returns_not_found(self):
        u = make_user('u@x.com')
        c = APIClient(); c.force_login(u)
        r = c.get('/api/characters/999999')
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r.json()['error'], 'not_found')

    def test_forbidden_returns_forbidden(self):
        a = make_user('a@x.com')
        b = make_user('b@x.com')
        char_a = Character.objects.create(owner=a, name='X', data={})
        c = APIClient(); c.force_login(b)
        r = c.get(f'/api/characters/{char_a.id}')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['error'], 'forbidden')
