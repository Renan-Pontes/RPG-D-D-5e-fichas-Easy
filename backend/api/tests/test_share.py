"""Link de compartilhamento de ficha: criar (logado), abrir (público), expirar em 24h."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import SharedCharacter

User = get_user_model()


class ShareTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username='a', email='a@x.com', password='senha-forte-2026')
        self.auth = APIClient(); self.auth.force_login(self.user)
        self.anon = APIClient()

    def create(self, data=None):
        return self.auth.post('/api/shares', {'character': data or {'name': 'Élara', 'avatar': 'data:image/jpeg;base64,' + 'A' * 40000}}, format='json')

    def test_cria_token_curto_e_qualquer_um_abre(self):
        res = self.create()
        self.assertEqual(res.status_code, 201)
        token = res.data['token']
        self.assertLessEqual(len(token), 16)
        got = self.anon.get(f'/api/shares/{token}')
        self.assertEqual(got.status_code, 200)
        self.assertEqual(got.data['character']['name'], 'Élara')

    def test_sem_conta_nao_cria(self):
        res = self.anon.post('/api/shares', {'character': {'name': 'X'}}, format='json')
        self.assertIn(res.status_code, (401, 403))

    def test_expira_em_24h(self):
        token = self.create().data['token']
        SharedCharacter.objects.filter(token=token).update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.anon.get(f'/api/shares/{token}').status_code, 404)
        share = SharedCharacter.objects.get(token=token)
        self.assertLessEqual(share.expires_at - share.created_at, timedelta(hours=24, seconds=1))

    def test_ficha_invalida_ou_grande_demais(self):
        self.assertEqual(self.create({'name': ''}).status_code, 400)
        self.assertEqual(self.create({'name': 'X', 'blob': 'A' * 1_600_000}).status_code, 400)

    def test_expirados_sao_limpos_ao_criar(self):
        old = self.create().data['token']
        SharedCharacter.objects.filter(token=old).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.create()
        self.assertFalse(SharedCharacter.objects.filter(token=old).exists())
