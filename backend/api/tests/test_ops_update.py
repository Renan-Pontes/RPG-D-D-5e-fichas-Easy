"""Atualização do backend: POST /api/ops/update (chave) e as peças puras do
scripts/self_update.py (zip, caminhos, .env)."""
import hashlib
import importlib.util
import io
import json
import shutil
import tempfile
import zipfile
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings

SECRET = 'uma-senha-de-teste-2026'
DIGEST = hashlib.sha256(SECRET.encode()).hexdigest()


def load_updater():
    path = Path(settings.BASE_DIR).parent / 'scripts' / 'self_update.py'
    spec = importlib.util.spec_from_file_location('self_update', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class OpsUpdateTests(TestCase):
    def setUp(self):
        cache.clear()
        self.tmp = Path(tempfile.mkdtemp())
        self.key = self.tmp / 'update-key'
        self.updater = self.tmp / 'self_update.py'
        self.updater.write_text('print("ok")\n')
        self.ov = override_settings(FORJA_DATA_DIR=self.tmp, FORJA_UPDATE_KEY_FILE=self.key,
                                    FORJA_UPDATER=self.updater, FORJA_PYTHON='python')
        self.ov.enable()

    def tearDown(self):
        self.ov.disable()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def post(self, url, password):
        return self.client.post(url, data=json.dumps({'password': password}), content_type='application/json')

    def configure(self):
        self.key.write_text(make_password(DIGEST))

    def test_sem_chave_configurada(self):
        self.assertEqual(self.post('/api/ops/update', DIGEST).status_code, 503)

    @patch('api.views_ops.subprocess.Popen')
    def test_chave_certa_dispara(self, popen):
        self.configure()
        r = self.post('/api/ops/update', DIGEST.upper())
        self.assertEqual(r.status_code, 202)
        args = popen.call_args[0][0]
        self.assertEqual(args, ['python', str(self.updater)])

    @patch('api.views_ops.subprocess.Popen')
    def test_chave_errada_ou_senha_crua(self, popen):
        self.configure()
        for pw in (hashlib.sha256(b'outra').hexdigest(), SECRET, '', None, 'x' * 64):
            self.assertEqual(self.post('/api/ops/update', pw).status_code, 403, pw)
        popen.assert_not_called()

    @patch('api.views_ops.subprocess.Popen')
    def test_ja_rodando(self, popen):
        self.configure()
        work = self.tmp / 'update'
        work.mkdir()
        (work / 'status.json').write_text(json.dumps({'state': 'running'}))
        (work / 'lock').write_text('1')
        self.assertEqual(self.post('/api/ops/update', DIGEST).status_code, 409)
        popen.assert_not_called()

    @patch('api.views_ops.subprocess.Popen')
    def test_limite_de_tentativas(self, popen):
        self.configure()
        codes = [self.post('/api/ops/update', 'f' * 64).status_code for _ in range(11)]
        self.assertEqual(codes[-1], 429)

    def test_status_pede_chave_e_mostra_log(self):
        self.configure()
        work = self.tmp / 'update'
        work.mkdir()
        (work / 'status.json').write_text(json.dumps({'state': 'ok', 'step': 'pronto'}))
        (work / 'update.log').write_text('linha 1\nlinha 2\n')
        self.assertEqual(self.post('/api/ops/status', 'f' * 64).status_code, 403)
        d = self.post('/api/ops/status', DIGEST).json()
        self.assertEqual(d['status']['state'], 'ok')
        self.assertEqual(d['log'], ['linha 1', 'linha 2'])

    def test_versao_publica(self):
        r = self.client.get('/api/ops/version')
        self.assertEqual(r.status_code, 200)
        self.assertIn('sha', r.json())

    def test_comando_grava_verificador(self):
        with patch('api.management.commands.chave_atualizacao.getpass', side_effect=[SECRET, SECRET]):
            call_command('chave_atualizacao', stdout=io.StringIO())
        with patch('api.views_ops.subprocess.Popen'):
            self.assertEqual(self.post('/api/ops/update', DIGEST).status_code, 202)
        self.assertNotIn(SECRET, self.key.read_text())
        self.assertNotIn(DIGEST, self.key.read_text())


class UpdaterPiecesTests(TestCase):
    def setUp(self):
        self.up = load_updater()
        self.tmp = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def make_zip(self, names):
        path = self.tmp / 'p.zip'
        with zipfile.ZipFile(path, 'w') as z:
            for n in names:
                z.writestr(n, 'x')
        return path

    def test_raiz_do_release_e_do_codigo(self):
        self.assertEqual(self.up.zip_root({'backend/manage.py', 'scripts/a.py'}), '')
        self.assertEqual(self.up.zip_root({'Repo-main/backend/manage.py', 'Repo-main/README.md'}), 'Repo-main/')
        with self.assertRaises(self.up.UpdateError):
            self.up.zip_root({'outra/coisa.py'})

    def test_extrai_tirando_o_prefixo(self):
        z = self.make_zip(['Repo-main/backend/manage.py', 'Repo-main/backend/api/x.py'])
        out = self.tmp / 'out'
        self.up.extract(z, out)
        self.assertTrue((out / 'backend' / 'api' / 'x.py').is_file())

    def test_recusa_caminho_suspeito(self):
        z = self.make_zip(['backend/manage.py', 'backend/../../fora.py'])
        with self.assertRaises(self.up.UpdateError):
            self.up.extract(z, self.tmp / 'out')

    def test_guarda_so_os_backups_mais_novos(self):
        for i in range(8):
            (self.tmp / f'pre-update-20261016T0{i}0000Z.sqlite3').write_text('x')
        (self.tmp / 'forja-manual.sqlite3').write_text('x')
        self.up.prune_backups(self.tmp, keep=5)
        left = sorted(p.name for p in self.tmp.glob('*.sqlite3'))
        self.assertIn('forja-manual.sqlite3', left)
        self.assertEqual([n for n in left if n.startswith('pre-update')],
                         [f'pre-update-20261016T0{i}0000Z.sqlite3' for i in range(3, 8)])

    def test_le_env(self):
        env = self.tmp / '.env'
        env.write_text('# comentario\nDATABASE_PATH="/home/x/db.sqlite3"\nOUTRA=1\n')
        self.assertEqual(self.up.read_env_value(env, 'DATABASE_PATH'), '/home/x/db.sqlite3')
        self.assertIsNone(self.up.read_env_value(env, 'NADA'))
        self.assertIsNone(self.up.read_env_value(self.tmp / 'nao-existe', 'X'))
