"""Consistent SQLite backup while the application remains online."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import sqlite3

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create a consistent SQLite backup and SHA-256 checksum.'

    def add_arguments(self, parser):
        parser.add_argument('--output', default=str(settings.BASE_DIR.parent / 'backups'))

    def handle(self, *args, **options):
        database = settings.DATABASES['default']
        source = Path(database['NAME']).resolve()
        if database['ENGINE'] != 'django.db.backends.sqlite3' or not source.is_file():
            raise CommandError('An existing SQLite database is required.')
        folder = Path(options['output']).resolve()
        folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        target = folder / f"forja-{datetime.now(timezone.utc):%Y%m%dT%H%M%S%fZ}.sqlite3"
        target.touch(mode=0o600, exist_ok=False)
        try:
            with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as src, sqlite3.connect(target) as dst:
                src.backup(dst)
                if dst.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise CommandError('Backup integrity check failed.')
            digest = hashlib.sha256(target.read_bytes()).hexdigest()
            target.with_suffix('.sha256').write_text(f'{digest}  {target.name}\n')
            self.stdout.write(self.style.SUCCESS(str(target)))
        except Exception:
            target.unlink(missing_ok=True)
            raise
