"""
Senha temporária pelo console — `py manage.py senha_temporaria <busca>`.

A busca casa com e-mail, usuário ou nome de exibição (pedaço serve). Achando
uma conta só, pede a senha duas vezes (não aparece na tela nem no histórico do
shell) e obriga a troca no próximo login. Achando várias, lista e pede --id.

  py manage.py senha_temporaria matheus
  py manage.py senha_temporaria matheus --id 12
  py manage.py senha_temporaria matheus --sem-troca   # não obriga a trocar
"""
from getpass import getpass

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from api.passwords import password_problem, set_temporary_password

PROBLEMS = {
    'password_required': 'senha vazia',
    'password_too_long': 'senha longa demais (máx. 200)',
    'weak_password': 'senha fraca (mín. 6 caracteres e nada muito comum)',
}


class Command(BaseCommand):
    help = 'Define uma senha temporária para uma conta e obriga a troca no próximo login.'

    def add_arguments(self, parser):
        parser.add_argument('busca', help='e-mail, usuário ou nome de exibição (ou parte)')
        parser.add_argument('--id', type=int, help='escolhe a conta quando a busca acha mais de uma')
        parser.add_argument('--sem-troca', action='store_true', help='não obriga a trocar no próximo login')

    def handle(self, *args, busca, id=None, sem_troca=False, **opts):
        User = get_user_model()
        qs = (User.objects.select_related('profile')
              .filter(Q(email__icontains=busca) | Q(username__icontains=busca)
                      | Q(profile__display_name__icontains=busca))
              .distinct().order_by('id'))
        if id is not None:
            qs = qs.filter(pk=id)
        found = list(qs[:20])
        if not found:
            raise CommandError(f'Nenhuma conta encontrada para "{busca}".')
        if len(found) > 1:
            for u in found:
                name = getattr(getattr(u, 'profile', None), 'display_name', '') or u.username
                self.stdout.write(f'  id {u.id:>4}  {u.email:<40} {name}')
            raise CommandError('Mais de uma conta. Rode de novo com --id <número>.')
        user = found[0]
        name = getattr(getattr(user, 'profile', None), 'display_name', '') or user.username
        self.stdout.write(f'Conta: {name} <{user.email}> (id {user.id})')
        password = getpass('Senha temporária: ')
        if getpass('Repita a senha: ') != password:
            raise CommandError('As senhas não conferem. Nada foi alterado.')
        problem = password_problem(password, user)
        if problem:
            raise CommandError(f'{PROBLEMS.get(problem, problem)}. Nada foi alterado.')
        set_temporary_password(user, password, must_change=not sem_troca)
        tail = '' if sem_troca else ' Ele vai precisar trocar no próximo login.'
        self.stdout.write(self.style.SUCCESS(f'Senha de {name} alterada.{tail}'))
