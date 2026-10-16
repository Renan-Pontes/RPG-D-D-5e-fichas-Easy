"""
Atualização do backend no PythonAnywhere — roda NO SERVIDOR.

Disparada por `POST /api/ops/update` (backend/api/views_ops.py) ou na mão:
    ~/.virtualenvs/forja/bin/python ~/forja/scripts/self_update.py

Passos (cada um vai para ~/forja-data/update/status.json e update.log):
  1. trava: uma atualização por vez
  2. baixa o pacote do release `backend-latest` do GitHub (o workflow
     .github/workflows/backend-release.yml gera a cada push na main); se não
     der, usa o zip do código da main e mantém o build do frontend que já está
     no servidor
  3. confere o zip (precisa ter backend/manage.py; nada fora da pasta)
  4. backup do banco (API de backup do SQLite) em ~/forja-data/backups
  5. extrai numa pasta nova e traz o que só existe no servidor (.env e, se o
     pacote não trouxer, o frontend_dist)
  6. troca as pastas: ~/forja → ~/forja.prev, pasta nova → ~/forja
  7. pip install (só se o requirements.txt mudou), check, migrate,
     collectstatic, purge_closed_campaigns
  8. recarrega o site tocando o arquivo WSGI
  Falhou do passo 6 em diante: volta a pasta antiga (e o banco, se o migrate
  já tinha começado) e recarrega o site antigo.

Só usa a biblioteca padrão: precisa rodar mesmo com o código novo quebrado.
"""
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

HOME = Path(os.environ.get('FORJA_HOME', '/home/NGhetsis'))
ROOT = Path(os.environ.get('FORJA_ROOT', HOME / 'forja'))
DATA = Path(os.environ.get('FORJA_DATA', HOME / 'forja-data'))
PYTHON = os.environ.get('FORJA_PYTHON', str(HOME / '.virtualenvs' / 'forja' / 'bin' / 'python'))
WSGI = Path(os.environ.get('FORJA_WSGI', '/var/www/nghetsis_pythonanywhere_com_wsgi.py'))
REPO = os.environ.get('FORJA_REPO', 'Renan-Pontes/RPG-D-D-5e-fichas-Easy')
RELEASE_URL = f'https://github.com/{REPO}/releases/download/backend-latest/forja-release.zip'
SOURCE_URL = f'https://codeload.github.com/{REPO}/zip/refs/heads/main'
PA_PROXY = 'http://proxy.server:3128'     # proxy de saída das contas free

WORK = DATA / 'update'
STATUS = WORK / 'status.json'
LOG = WORK / 'update.log'
LOCK = WORK / 'lock'
STALE_LOCK = 15 * 60
MAX_UNZIPPED = 400 * 1024 * 1024
KEEP_PRE_UPDATE = 5


class UpdateError(Exception):
    pass


# ============================================================
# Registro
# ============================================================
def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def log(msg):
    WORK.mkdir(parents=True, exist_ok=True)
    line = f'[{now()}] {msg}'
    print(line, flush=True)
    with LOG.open('a', encoding='utf-8') as f:
        f.write(line + '\n')


def write_status(**fields):
    WORK.mkdir(parents=True, exist_ok=True)
    try:
        current = json.loads(STATUS.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        current = {}
    current.update(fields)
    tmp = STATUS.with_suffix('.tmp')
    tmp.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding='utf-8')
    tmp.replace(STATUS)


def step(name):
    log(f'— {name}')
    write_status(step=name)


# ============================================================
# Peças puras (testadas em backend/api/tests/test_ops_update.py)
# ============================================================
def read_env_value(env_file, key):
    """Valor de KEY=valor num .env simples (sem expandir nada)."""
    try:
        for raw in Path(env_file).read_text(encoding='utf-8').splitlines():
            line = raw.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            if k.strip() == key:
                return v.strip().strip('"').strip("'")
    except OSError:
        pass
    return None


def zip_root(names):
    """Prefixo do pacote: '' no zip do release, 'Repo-main/' no zip do código."""
    if 'backend/manage.py' in names:
        return ''
    tops = {n.split('/', 1)[0] for n in names if '/' in n}
    for top in tops:
        if f'{top}/backend/manage.py' in names:
            return f'{top}/'
    raise UpdateError('pacote sem backend/manage.py')


def safe_members(zf, root):
    """Entradas do zip sob `root`, sem caminho absoluto nem '..'."""
    out, total = [], 0
    for info in zf.infolist():
        name = info.filename
        if not name.startswith(root) or info.is_dir():
            continue
        rel = name[len(root):]
        parts = Path(rel).parts
        if not rel or rel.startswith(('/', '\\')) or '..' in parts or (parts and ':' in parts[0]):
            raise UpdateError(f'caminho suspeito no pacote: {name}')
        total += info.file_size
        if total > MAX_UNZIPPED:
            raise UpdateError('pacote grande demais')
        out.append((info, rel))
    return out


def extract(zip_path, target):
    with zipfile.ZipFile(zip_path) as zf:
        root = zip_root(set(zf.namelist()))
        members = safe_members(zf, root)
        for info, rel in members:
            dest = target / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, dest.open('wb') as dst:
                shutil.copyfileobj(src, dst)
    return root


# ============================================================
# Passos
# ============================================================
def take_lock():
    WORK.mkdir(parents=True, exist_ok=True)
    if LOCK.exists() and time.time() - LOCK.stat().st_mtime < STALE_LOCK:
        raise UpdateError('já tem uma atualização rodando')
    LOCK.write_text(str(os.getpid()))


def download(url, dest):
    """Baixa direto; se falhar, tenta pelo proxy do PythonAnywhere."""
    last = None
    for proxy in (None, PA_PROXY):
        handlers = [urllib.request.ProxyHandler({'http': proxy, 'https': proxy})] if proxy else []
        opener = urllib.request.build_opener(*handlers)
        try:
            with opener.open(url, timeout=120) as resp, dest.open('wb') as out:
                shutil.copyfileobj(resp, out)
            return
        except Exception as e:      # rede: tenta o próximo caminho
            last = e
            log(f'  download falhou ({"proxy" if proxy else "direto"}): {e}')
    raise UpdateError(f'não consegui baixar {url}: {last}')


def fetch_package():
    zip_path = WORK / 'release.zip'
    zip_path.unlink(missing_ok=True)
    try:
        download(RELEASE_URL, zip_path)
        return zip_path, 'release'
    except UpdateError:
        log('  sem pacote do release — usando o código da main (frontend do servidor fica)')
        download(SOURCE_URL, zip_path)
        return zip_path, 'source'


def database_path():
    value = read_env_value(ROOT / 'backend' / '.env', 'DATABASE_PATH')
    return Path(value) if value else DATA / 'db.sqlite3'


def backup_database():
    db = database_path()
    if not db.is_file():
        log(f'  banco não encontrado em {db} — sem backup')
        return None
    folder = DATA / 'backups'
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f'pre-update-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.sqlite3'
    with sqlite3.connect(db.as_uri() + '?mode=ro', uri=True) as src, sqlite3.connect(target) as dst:
        src.backup(dst)
    log(f'  backup: {target}')
    prune_backups(folder)
    return target


def prune_backups(folder, keep=KEEP_PRE_UPDATE):
    """O disco do plano free é pequeno: guarda só os `keep` backups mais novos
    desta rotina (os manuais e os do deploy antigo ficam)."""
    mine = sorted(folder.glob('pre-update-*.sqlite3'))
    for old in mine[:-keep] if keep else mine:
        old.unlink(missing_ok=True)
        log(f'  backup antigo apagado: {old.name}')


def restore_database(backup):
    if not backup:
        return
    db = database_path()
    with sqlite3.connect(backup) as src, sqlite3.connect(db) as dst:
        src.backup(dst)
    log(f'  banco restaurado de {backup}')


def prepare_new_tree(zip_path):
    new = WORK / 'new'
    if new.exists():
        shutil.rmtree(new)
    new.mkdir(parents=True)
    extract(zip_path, new)
    env = ROOT / 'backend' / '.env'
    if env.is_file():
        shutil.copy2(env, new / 'backend' / '.env')
    else:
        log('  aviso: servidor sem backend/.env')
    if not (new / 'backend' / 'frontend_dist' / 'index.html').is_file():
        old_dist = ROOT / 'backend' / 'frontend_dist'
        if old_dist.is_dir():
            shutil.copytree(old_dist, new / 'backend' / 'frontend_dist')
            log('  pacote sem frontend_dist — mantive o do servidor')
    return new


def prev_dir():
    return ROOT.with_name(ROOT.name + '.prev')


def free_space():
    """O disco do plano free não comporta 3 cópias do app: a reserva da versão
    ANTERIOR à atual sai antes de baixar (a atual vira a nova reserva na troca)."""
    prev = prev_dir()
    if prev.exists():
        shutil.rmtree(prev)
        log(f'  reserva antiga apagada ({prev.name})')
    for leftover in (WORK / 'new', WORK / 'release.zip'):
        if leftover.is_dir():
            shutil.rmtree(leftover)
        elif leftover.exists():
            leftover.unlink()


def swap_in(new):
    prev = prev_dir()
    if prev.exists():
        shutil.rmtree(prev)
    if ROOT.exists():
        ROOT.rename(prev)
    new.rename(ROOT)
    return prev


def roll_back(prev):
    if not prev or not prev.exists():
        return
    failed = WORK / f'failed-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}'
    if ROOT.exists():
        ROOT.rename(failed)
    prev.rename(ROOT)
    log(f'  voltei a versão anterior (a nova ficou em {failed})')


def run(*args, timeout=600):
    log('  $ ' + ' '.join(str(a) for a in args))
    res = subprocess.run([str(a) for a in args], cwd=ROOT / 'backend', capture_output=True,
                         text=True, timeout=timeout)
    for line in (res.stdout + res.stderr).strip().splitlines()[-30:]:
        log('    ' + line)
    if res.returncode != 0:
        raise UpdateError(f'falhou: {" ".join(str(a) for a in args[1:])}')


def requirements_changed(prev):
    new_req = ROOT / 'backend' / 'requirements.txt'
    old_req = (prev / 'backend' / 'requirements.txt') if prev else None
    if not old_req or not old_req.is_file():
        return True
    return new_req.read_bytes() != old_req.read_bytes()


def reload_site():
    if WSGI.is_file():
        os.utime(WSGI, None)
        log(f'  site recarregado ({WSGI.name})')
        return True
    log(f'  aviso: {WSGI} não existe — recarregue o site pela aba Web')
    return False


def version():
    try:
        return json.loads((ROOT / 'backend' / 'VERSION.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def main():
    write_status(state='running', step='início', startedAt=now(), finishedAt=None, error=None)
    log('=== atualização do backend ===')
    prev = backup = None
    migrating = False
    try:
        take_lock()
        step('liberando espaço')
        free_space()
        step('baixando o pacote')
        zip_path, source = fetch_package()
        write_status(source=source)
        step('backup do banco')
        backup = backup_database()
        step('extraindo')
        new = prepare_new_tree(zip_path)
        zip_path.unlink(missing_ok=True)
        step('trocando as pastas')
        prev = swap_in(new)
        if requirements_changed(prev):
            step('instalando dependências')
            run(PYTHON, '-m', 'pip', 'install', '-q', '-r', 'requirements.txt', timeout=900)
        step('check')
        run(PYTHON, 'manage.py', 'check')
        step('migrate')
        migrating = True
        run(PYTHON, 'manage.py', 'migrate', '--noinput')
        migrating = False
        step('collectstatic')
        run(PYTHON, 'manage.py', 'collectstatic', '--noinput')
        step('limpeza de campanhas encerradas')
        run(PYTHON, 'manage.py', 'purge_closed_campaigns')
        info = version()
        write_status(state='ok', step='pronto', finishedAt=now(), version=info, reloaded=None)
        step('recarregando o site')
        write_status(reloaded=reload_site(), step='pronto')
        zip_path.unlink(missing_ok=True)
        log(f'=== pronto: {info.get("sha", "?")[:10]} ({source}) ===')
        return 0
    except Exception as e:
        log(f'ERRO: {e}')
        try:
            if migrating:
                restore_database(backup)
            roll_back(prev)
            if prev:
                reload_site()
        except Exception as e2:          # rollback quebrado: registrar e sair
            log(f'ERRO no rollback: {e2}')
        for leftover in (WORK / 'new', WORK / 'release.zip'):   # não deixa lixo no disco
            try:
                if leftover.is_dir():
                    shutil.rmtree(leftover)
                else:
                    leftover.unlink(missing_ok=True)
            except OSError:
                pass
        write_status(state='error', finishedAt=now(), error=str(e)[:500])
        return 1
    finally:
        LOCK.unlink(missing_ok=True)


if __name__ == '__main__':
    sys.exit(main())
