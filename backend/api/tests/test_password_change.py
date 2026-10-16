"""Senha temporária (admin e console) e troca obrigatória no próximo login."""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Profile

User = get_user_model()
TEMP = 'Temporaria-2026!'


def mk(email, staff=False, name=None, profile=True):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026', is_staff=staff)
    if profile:
        Profile.objects.create(user=u, display_name=name or email.split('@')[0].title())
    return u


def login(email, password):
    c = APIClient()
    r = c.post('/api/auth/login', {'email': email, 'password': password}, format='json')
    return c, r


class TempPasswordAdminTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = mk('chefe@x.com', staff=True)
        self.matheus = mk('matheus@x.com', name='Matheus')
        self.c_admin = APIClient(); self.c_admin.force_login(self.admin)

    def url(self, u):
        return f'/api/admin/users/{u.id}/temp-password'

    def test_admin_define_e_login_pede_troca(self):
        r = self.c_admin.post(self.url(self.matheus), {'password': TEMP}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['user']['mustChangePassword'])
        _, r = login('matheus@x.com', 'senha-forte-2026')
        self.assertEqual(r.status_code, 401)
        c, r = login('matheus@x.com', TEMP)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['user']['mustChangePassword'])
        self.assertTrue(c.get('/api/auth/me').data['user']['mustChangePassword'])

    def test_sem_troca(self):
        self.c_admin.post(self.url(self.matheus), {'password': TEMP, 'mustChange': False}, format='json')
        _, r = login('matheus@x.com', TEMP)
        self.assertFalse(r.data['user']['mustChangePassword'])

    def test_so_admin(self):
        outro = mk('ana@x.com')
        c = APIClient(); c.force_login(outro)
        self.assertEqual(c.post(self.url(self.matheus), {'password': TEMP}, format='json').status_code, 403)
        self.assertIn(APIClient().post(self.url(self.matheus), {'password': TEMP}, format='json').status_code, (401, 403))
        self.matheus.refresh_from_db()
        self.assertTrue(self.matheus.check_password('senha-forte-2026'))

    def test_senha_fraca_ou_vazia(self):
        for pw, code in (('123', 'weak_password'), ('', 'password_required'), (None, 'password_required'), ('x' * 201, 'password_too_long')):
            r = self.c_admin.post(self.url(self.matheus), {'password': pw}, format='json')
            self.assertEqual(r.status_code, 400, pw)
            self.assertEqual(r.data['error'], code)

    def test_derruba_sessoes_abertas(self):
        c, _ = login('matheus@x.com', 'senha-forte-2026')
        self.assertEqual(c.get('/api/auth/me').status_code, 200)
        self.c_admin.post(self.url(self.matheus), {'password': TEMP}, format='json')
        self.assertIn(c.get('/api/auth/me').status_code, (401, 403))

    def test_conta_sem_perfil(self):
        su = mk('root@x.com', profile=False)
        r = self.c_admin.post(self.url(su), {'password': TEMP}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(Profile.objects.get(user=su).must_change_password)

    def test_404(self):
        self.assertEqual(self.c_admin.post('/api/admin/users/9999/temp-password', {'password': TEMP}, format='json').status_code, 404)


class ChangePasswordTests(TestCase):
    def setUp(self):
        cache.clear()
        self.u = mk('matheus@x.com', name='Matheus')
        self.u.set_password(TEMP); self.u.save()
        Profile.objects.filter(user=self.u).update(must_change_password=True)
        self.c, _ = login('matheus@x.com', TEMP)

    def change(self, current, new):
        return self.c.post('/api/auth/change-password', {'currentPassword': current, 'newPassword': new}, format='json')

    def test_troca_desliga_flag_e_mantem_sessao(self):
        r = self.change(TEMP, 'minha-senha-nova-77')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['user']['mustChangePassword'])
        self.assertEqual(self.c.get('/api/auth/me').status_code, 200)
        _, r = login('matheus@x.com', 'minha-senha-nova-77')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['user']['mustChangePassword'])

    def test_senha_atual_errada(self):
        r = self.change('chute', 'minha-senha-nova-77')
        self.assertEqual((r.status_code, r.data['error']), (400, 'wrong_password'))

    def test_mesma_senha(self):
        r = self.change(TEMP, TEMP)
        self.assertEqual((r.status_code, r.data['error']), (400, 'same_password'))

    def test_senha_fraca(self):
        r = self.change(TEMP, '123')
        self.assertEqual((r.status_code, r.data['error']), (400, 'weak_password'))
        self.assertTrue(Profile.objects.get(user=self.u).must_change_password)

    def test_precisa_estar_logado(self):
        r = APIClient().post('/api/auth/change-password', {'currentPassword': TEMP, 'newPassword': 'x' * 12}, format='json')
        self.assertIn(r.status_code, (401, 403))


class TempPasswordCommandTests(TestCase):
    def setUp(self):
        self.matheus = mk('matheus@x.com', name='Matheus Souza')
        self.m2 = mk('mat.lima@x.com', name='Matheus Lima')

    def run_cmd(self, *args, answers=(TEMP, TEMP)):
        with patch('api.management.commands.senha_temporaria.getpass', side_effect=list(answers)):
            call_command('senha_temporaria', *args)

    def test_varias_contas_pede_id(self):
        with self.assertRaises(CommandError):
            self.run_cmd('matheus')

    def test_com_id(self):
        self.run_cmd('matheus', '--id', str(self.matheus.id))
        self.matheus.refresh_from_db()
        self.assertTrue(self.matheus.check_password(TEMP))
        self.assertTrue(Profile.objects.get(user=self.matheus).must_change_password)
        self.m2.refresh_from_db()
        self.assertTrue(self.m2.check_password('senha-forte-2026'))

    def test_busca_unica_e_sem_troca(self):
        self.run_cmd('souza', '--sem-troca')
        self.assertFalse(Profile.objects.get(user=self.matheus).must_change_password)
        self.matheus.refresh_from_db()
        self.assertTrue(self.matheus.check_password(TEMP))

    def test_senhas_diferentes_nao_muda(self):
        with self.assertRaises(CommandError):
            self.run_cmd('souza', answers=(TEMP, 'outra-coisa-99'))
        self.matheus.refresh_from_db()
        self.assertTrue(self.matheus.check_password('senha-forte-2026'))

    def test_nenhuma(self):
        with self.assertRaises(CommandError):
            self.run_cmd('ninguem')
