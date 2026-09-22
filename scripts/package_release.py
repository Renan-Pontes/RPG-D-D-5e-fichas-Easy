"""Package source and production assets; never include credentials or databases."""
from pathlib import Path
import argparse
import zipfile

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--output', default=str(root / 'backups' / 'forja-release.zip'))
args = parser.parse_args()
target = Path(args.output).resolve()
target.parent.mkdir(parents=True, exist_ok=True)
excluded = {'.git', '.agents', '.codex', 'node_modules', '__pycache__', '.venv', 'venv', 'backups', 'test-results', 'playwright-report', 'staticfiles', 'frontend_dist', 'dist', '.vercel'}
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        rel = path.relative_to(root)
        if not path.is_file() or any(part in excluded for part in rel.parts):
            continue
        if path.name.startswith('.env') and not path.name.endswith('.example') and path.name != '.env.production':
            continue
        if path.suffix in {'.pyc', '.sqlite3', '.db', '.zip'} or '.sqlite3-' in path.name:
            continue
        archive.write(path, str(rel))
    for path in sorted((root / 'frontend/dist').rglob('*')):
        if path.is_file():
            archive.write(path, str(Path('backend/frontend_dist') / path.relative_to(root / 'frontend/dist')))
print(f'{target}: {target.stat().st_size} bytes')
