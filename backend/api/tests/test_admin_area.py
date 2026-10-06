"""Área de administração: só is_staff acessa; números e listas batem."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Campaign, Character, Profile

User = get_user_model()


def mk(email, staff=False):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026', is_staff=staff)
    Profile.objects.create(user=u, display_name=email.split('@')[0].title())
    return u


class AdminAreaTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = mk('chefe@x.com', staff=True)
        self.ana = mk('ana@x.com')
        Character.objects.create(owner=self.ana, name='Élara', data={'className': 'wizard', 'level': 3, 'rulesVersion': '2024'})
        Character.objects.create(owner=self.ana, name='Brom', data={'className': 'fighter', 'rulesVersion': '2014'})
        Campaign.objects.create(dm=self.ana, name='Mesa da Ana')
        self.c_admin = APIClient(); self.c_admin.force_login(self.admin)
        self.c_ana = APIClient(); self.c_ana.force_login(self.ana)

    def test_so_admin_acessa(self):
        for url in ['/api/admin/overview', '/api/admin/users', '/api/admin/characters', '/api/admin/campaigns']:
            self.assertEqual(self.c_ana.get(url).status_code, 403, url)
            self.assertIn(APIClient().get(url).status_code, (401, 403), url)
            self.assertEqual(self.c_admin.get(url).status_code, 200, url)

    def test_visao_geral(self):
        d = self.c_admin.get('/api/admin/overview').data
        self.assertEqual(d['totals']['users'], 2)
        self.assertEqual(d['totals']['characters'], 2)
        self.assertEqual(d['totals']['campaigns'], 1)
        self.assertIn(['wizard', 1], [list(x) for x in d['byClass']])

    def test_listas_busca_e_detalhe(self):
        users = self.c_admin.get('/api/admin/users?q=ana').data
        self.assertEqual(users['total'], 1)
        self.assertEqual(users['results'][0]['characters'], 2)
        chars = self.c_admin.get('/api/admin/characters?className=wizard').data
        self.assertEqual([c['name'] for c in chars['results']], ['Élara'])
        self.assertEqual(self.c_admin.get('/api/admin/characters?rules=2014').data['total'], 1)
        det = self.c_admin.get(f"/api/admin/users/{self.ana.id}").data
        self.assertEqual(len(det['characters']), 2)
        self.assertEqual(len(det['campaignsAsDm']), 1)
        cid = chars['results'][0]['id']
        self.assertEqual(self.c_admin.get(f'/api/admin/characters/{cid}').data['data']['className'], 'wizard')

    def test_me_informa_admin_so_para_a_propria_conta(self):
        self.assertTrue(self.c_admin.get('/api/auth/me').data['user']['isAdmin'])
        self.assertFalse(self.c_ana.get('/api/auth/me').data['user']['isAdmin'])

    def test_comando_make_admin(self):
        call_command('make_admin', 'ANA@x.com')
        self.ana.refresh_from_db()
        self.assertTrue(self.ana.is_staff and self.ana.is_superuser)
        call_command('make_admin', 'ana@x.com', '--remove')
        self.ana.refresh_from_db()
        self.assertFalse(self.ana.is_staff)
