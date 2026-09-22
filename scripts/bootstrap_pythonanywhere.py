"""Initialize production configuration without replacing existing secrets or data."""
from pathlib import Path
import secrets
import subprocess

root = Path('/home/NGhetsis/forja')
backend = root / 'backend'
data = Path('/home/NGhetsis/forja-data')
data.mkdir(mode=0o700, exist_ok=True)
env = backend / '.env'
if not env.exists():
    contents = '\n'.join([
        'DJANGO_ENV=production', 'DJANGO_DEBUG=False',
        'DJANGO_SECRET_KEY=' + secrets.token_urlsafe(64),
        'DJANGO_ALLOWED_HOSTS=nghetsis.pythonanywhere.com',
        'DATABASE_PATH=/home/NGhetsis/forja-data/db.sqlite3',
        'DJANGO_COOKIE_SECURE=True', 'DJANGO_COOKIE_SAMESITE=Lax',
        'CORS_ALLOWED_ORIGINS=https://nghetsis.pythonanywhere.com,https://dd5efichas.vercel.app',
        'CSRF_TRUSTED_ORIGINS=https://nghetsis.pythonanywhere.com,https://dd5efichas.vercel.app',
        '',
    ])
    with env.open('x') as f:
        env.chmod(0o600)
        f.write(contents)
python = '/home/NGhetsis/.virtualenvs/forja/bin/python'
for args in [('check',), ('migrate', '--noinput'), ('collectstatic', '--noinput'), ('backup', '--output', str(data / 'backups'))]:
    subprocess.run([python, 'manage.py', *args], cwd=backend, check=True)
print('FORJA_READY', flush=True)
