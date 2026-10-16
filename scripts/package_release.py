"""Package source and production assets; never include credentials or databases.

--slim: só o que o servidor usa (backend/, scripts/ e o build do frontend em
backend/frontend_dist) — é o pacote que scripts/self_update.py baixa.
Sempre grava backend/VERSION.json com o commit e a hora do pacote.
"""
from datetime import datetime, timezone
from pathlib import Path
import argparse
import json
import os
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--output', default=str(root / 'backups' / 'forja-release.zip'))
parser.add_argument('--slim', action='store_true', help='só backend/, scripts/ e o build do frontend')
args = parser.parse_args()
target = Path(args.output).resolve()
target.parent.mkdir(parents=True, exist_ok=True)
excluded = {'.git', '.agents', '.codex', '.claude', '.github', 'node_modules', '__pycache__', '.venv', 'venv',
            'backups', 'test-results', 'playwright-report', 'staticfiles', 'frontend_dist', 'dist', '.vercel',
            'dist-release'}
slim_roots = {'backend', 'scripts'}


def commit_sha():
    sha = os.environ.get('GITHUB_SHA')
    if sha:
        return sha
    try:
        return subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=root, capture_output=True, text=True).stdout.strip() or None
    except OSError:
        return None


with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        rel = path.relative_to(root)
        if not path.is_file() or any(part in excluded for part in rel.parts):
            continue
        if args.slim and rel.parts[0] not in slim_roots:
            continue
        if path.name.startswith('.env') and not path.name.endswith('.example') and path.name != '.env.production':
            continue
        if path.suffix in {'.pyc', '.sqlite3', '.db', '.zip'} or '.sqlite3-' in path.name:
            continue
        if rel.as_posix() == 'backend/VERSION.json':
            continue
        archive.write(path, str(rel))
    for path in sorted((root / 'frontend/dist').rglob('*')):
        if path.is_file():
            archive.write(path, str(Path('backend/frontend_dist') / path.relative_to(root / 'frontend/dist')))
    archive.writestr('backend/VERSION.json', json.dumps({
        'sha': commit_sha(), 'builtAt': datetime.now(timezone.utc).isoformat(timespec='seconds'),
    }))
print(f'{target}: {target.stat().st_size} bytes')
