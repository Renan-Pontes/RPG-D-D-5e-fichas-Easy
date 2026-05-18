"""
Testes pro novo fluxo de level-up: mestre LIBERA (status='approved'),
jogador CONSOME (status='consumed' + level sobe na ficha).

- Mestre aprova levelup -> level NÃO muda (só desbloqueia).
- Jogador consome levelup liberada -> level sobe.
- Jogador tenta consumir sem aprovação -> 400.
- Mestre revoga (status='pending') -> approval volta pra pendente.
- Mestre aprova type='feature' -> aplica direto (compat com fluxo antigo).
- Outro jogador (não dono) tenta consumir -> 403.
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


class ApprovalFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'P')
        self.other = make_user('o@x.com', 'O')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.c_o = APIClient(); self.c_o.force_login(self.other)

        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.char = Character.objects.create(
            owner=self.player, name='Thal',
            data={'level': 2, 'className': 'druid', 'currentHp': 15, 'maxHp': 15,
                  'abilities': {'str': 8, 'dex': 14, 'con': 12, 'int': 13, 'wis': 16, 'cha': 10}},
        )
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char, role='player')

    def _req_levelup(self):
        r = self.c_p.post(
            f'/api/approvals/campaign/{self.camp.id}',
            {'characterId': self.char.id, 'type': 'levelup', 'payload': {'toLevel': 3}},
            format='json',
        )
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['approval']['id']

    def test_levelup_approve_does_not_change_level(self):
        apr_id = self._req_levelup()
        r = self.c_dm.post(f'/api/approvals/{apr_id}/review', {'status': 'approved'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['approval']['status'], 'approved')
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['level'], 2, 'level não deve mudar ao aprovar')

    def test_levelup_consume_changes_level(self):
        apr_id = self._req_levelup()
        self.c_dm.post(f'/api/approvals/{apr_id}/review', {'status': 'approved'}, format='json')
        r = self.c_p.post(f'/api/approvals/{apr_id}/consume', format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['approval']['status'], 'consumed')
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['level'], 3)

    def test_consume_without_approval_is_400(self):
        apr_id = self._req_levelup()
        # status ainda é 'pending'
        r = self.c_p.post(f'/api/approvals/{apr_id}/consume', format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'not_unlocked')

    def test_consume_after_rejected_is_400(self):
        apr_id = self._req_levelup()
        self.c_dm.post(f'/api/approvals/{apr_id}/review', {'status': 'rejected'}, format='json')
        r = self.c_p.post(f'/api/approvals/{apr_id}/consume', format='json')
        self.assertEqual(r.status_code, 400)

    def test_consume_twice_is_400(self):
        apr_id = self._req_levelup()
        self.c_dm.post(f'/api/approvals/{apr_id}/review', {'status': 'approved'}, format='json')
        self.c_p.post(f'/api/approvals/{apr_id}/consume', format='json')
        r = self.c_p.post(f'/api/approvals/{apr_id}/consume', format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'not_unlocked')

    def test_revoke_unlock_returns_to_pending(self):
        apr_id = self._req_levelup()
        self.c_dm.post(f'/api/approvals/{apr_id}/review', {'status': 'approved'}, format='json')
        r = self.c_dm.post(f'/api/approvals/{apr_id}/review', {'status': 'pending'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['approval']['status'], 'pending')

    def test_non_owner_cannot_consume(self):
        apr_id = self._req_levelup()
        self.c_dm.post(f'/api/approvals/{apr_id}/review', {'status': 'approved'}, format='json')
        r = self.c_o.post(f'/api/approvals/{apr_id}/consume', format='json')
        self.assertEqual(r.status_code, 403)

    def test_non_dm_cannot_review(self):
        apr_id = self._req_levelup()
        r = self.c_o.post(f'/api/approvals/{apr_id}/review', {'status': 'approved'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_feature_approval_still_applies_immediately(self):
        # compat: feature/item/spell continuam aplicando direto no review
        r = self.c_p.post(
            f'/api/approvals/campaign/{self.camp.id}',
            {'characterId': self.char.id, 'type': 'feature',
             'payload': {'name': 'Wild Shape', 'description': 'desc'}},
            format='json',
        )
        apr_id = r.json()['approval']['id']
        r2 = self.c_dm.post(f'/api/approvals/{apr_id}/review', {'status': 'approved'}, format='json')
        self.assertEqual(r2.status_code, 200, r2.content)
        self.assertEqual(r2.json()['approval']['status'], 'consumed')
