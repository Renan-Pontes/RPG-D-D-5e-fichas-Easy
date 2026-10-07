"""Apaga de vez as campanhas encerradas há mais de 30 dias (ver api/plans.py).

Sem tarefa agendada no PythonAnywhere free: a purga também roda sozinha ao
listar campanhas/personagens e no login. Este comando é para rodar à mão ou no
deploy (scripts/bootstrap_pythonanywhere.py). Idempotente.

    python manage.py purge_closed_campaigns [--dry-run]
"""
from django.core.management.base import BaseCommand

from api import plans


class Command(BaseCommand):
    help = 'Apaga campanhas encerradas há mais de 30 dias (fichas em vaga: opção A).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Só lista o que seria apagado.')

    def handle(self, *args, **opts):
        due = list(plans.due_campaigns())
        if opts['dry_run']:
            for c in due:
                self.stdout.write(f'[dry-run] {c.id} {c.name} (encerrada em {c.closed_at:%Y-%m-%d})')
            self.stdout.write(f'{len(due)} campanha(s) vencida(s).')
            return
        results = plans.purge_expired()
        for r in results:
            self.stdout.write(f"campanha {r['campaignId']}: fichas mantidas {r['kept']}, apagadas {r['deleted']}")
        self.stdout.write(self.style.SUCCESS(f'{len(results)} campanha(s) apagada(s).'))
