"""
Operações do servidor — sem login de usuário, protegidas pela chave de atualização.

POST /api/ops/update   {password: sha256 da senha, em hex}  → 202 e roda
                       scripts/self_update.py em segundo plano
POST /api/ops/status   {password}  → status da última atualização + fim do log
GET  /api/ops/version  → commit no ar (público: o repositório também é)

A chave NÃO mora no repositório (que é público): o servidor guarda só um
verificador PBKDF2 do sha256 em ~/forja-data/update-key, criado por
`manage.py chave_atualizacao`. Sem o arquivo, a rota responde 503. A rota não
aceita URL nem código: só manda o servidor buscar o pacote do próprio
repositório (ver scripts/self_update.py).

Este módulo só depende de Django e do rate_limit: ele também roda num servidor
com código antigo, que é como a primeira atualização é feita.
"""
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .rate_limit import rate_limit

SHA256_HEX = re.compile(r'[0-9a-fA-F]{64}')
RUNNING_FOR = 15 * 60       # status "running" mais velho que isso é atualização morta


def _base():
    return Path(settings.BASE_DIR)


def _data_dir():
    return Path(getattr(settings, 'FORJA_DATA_DIR', _base().parent.parent / 'forja-data'))


def _key_file():
    return Path(getattr(settings, 'FORJA_UPDATE_KEY_FILE', _data_dir() / 'update-key'))


def _work_dir():
    return _data_dir() / 'update'


def _updater():
    return Path(getattr(settings, 'FORJA_UPDATER', _base().parent / 'scripts' / 'self_update.py'))


def _python():
    explicit = getattr(settings, 'FORJA_PYTHON', None) or os.environ.get('FORJA_PYTHON')
    if explicit:
        return explicit
    venv_python = Path(sys.prefix) / 'bin' / 'python'     # no PythonAnywhere: o virtualenv do site
    return str(venv_python) if venv_python.exists() else sys.executable


def _body(request):
    try:
        return json.loads(request.body or b'{}')
    except ValueError:
        return {}


def _authorized(request):
    """None se a chave confere; senão a resposta de erro."""
    key_file = _key_file()
    if not key_file.is_file():
        return JsonResponse({'error': 'not_configured'}, status=503)
    sent = _body(request).get('password')
    if not isinstance(sent, str) or not SHA256_HEX.fullmatch(sent):
        return JsonResponse({'error': 'forbidden'}, status=403)
    if not check_password(sent.lower(), key_file.read_text(encoding='utf-8').strip()):
        return JsonResponse({'error': 'forbidden'}, status=403)
    return None


def _status():
    try:
        return json.loads((_work_dir() / 'status.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def _is_running(status):
    if status.get('state') != 'running':
        return False
    lock = _work_dir() / 'lock'
    return lock.exists() and time.time() - lock.stat().st_mtime < RUNNING_FOR


@csrf_exempt
@require_POST
@rate_limit(key='ops_update', max_attempts=10, window=3600)
def update(request):
    denied = _authorized(request)
    if denied:
        return denied
    if _is_running(_status()):
        return JsonResponse({'error': 'already_running', 'status': _status()}, status=409)
    updater = _updater()
    if not updater.is_file():
        return JsonResponse({'error': 'updater_missing'}, status=500)
    work = _work_dir()
    work.mkdir(parents=True, exist_ok=True)
    out = (work / 'process.log').open('ab')
    subprocess.Popen(
        [_python(), str(updater)], cwd=str(updater.parent), stdin=subprocess.DEVNULL,
        stdout=out, stderr=subprocess.STDOUT, start_new_session=True,
        env={**os.environ, 'FORJA_TRIGGER': 'api'},
    )
    return JsonResponse({'started': True}, status=202)


@csrf_exempt
@require_POST
@rate_limit(key='ops_status', max_attempts=120, window=3600)
def status(request):
    denied = _authorized(request)
    if denied:
        return denied
    try:
        lines = (_work_dir() / 'update.log').read_text(encoding='utf-8').splitlines()[-60:]
    except OSError:
        lines = []
    return JsonResponse({'status': _status(), 'log': lines})


@require_GET
def version(request):
    try:
        info = json.loads((_base() / 'VERSION.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        info = {}
    return JsonResponse({'sha': info.get('sha'), 'builtAt': info.get('builtAt')})
