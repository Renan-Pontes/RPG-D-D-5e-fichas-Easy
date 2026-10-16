"""
Chave da atualização automática — `py manage.py chave_atualizacao`.

Pede a senha (sem eco), e grava em ~/forja-data/update-key só um verificador
PBKDF2 do sha256 dela — é o sha256 que vai no POST /api/ops/update. A senha e
o hash nunca vão para o repositório (que é público).
"""
import hashlib
from getpass import getpass
from pathlib import Path

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from api.views_ops import _key_file


class Command(BaseCommand):
    help = 'Define a senha que libera POST /api/ops/update (atualização do backend).'

    def handle(self, *args, **opts):
        password = getpass('Senha da atualização: ')
        if len(password) < 8:
            raise CommandError('Use pelo menos 8 caracteres. Nada foi alterado.')
        if getpass('Repita: ') != password:
            raise CommandError('As senhas não conferem. Nada foi alterado.')
        digest = hashlib.sha256(password.encode('utf-8')).hexdigest()
        target = Path(_key_file())
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(make_password(digest) + '\n', encoding='utf-8')
        target.chmod(0o600)
        self.stdout.write(self.style.SUCCESS(f'Chave gravada em {target}.'))
