"""Dá (ou tira) acesso à área de administração do app e ao /admin/ do Django.

    python manage.py make_admin voce@email.com            # vira admin (is_staff + is_superuser)
    python manage.py make_admin voce@email.com --remove   # deixa de ser admin
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Marca uma conta (por e-mail) como administradora do app.'

    def add_arguments(self, parser):
        parser.add_argument('email')
        parser.add_argument('--remove', action='store_true', help='Remove o acesso de admin.')

    def handle(self, email, remove=False, **_):
        User = get_user_model()
        user = User.objects.filter(email__iexact=email.strip()).first()
        if not user:
            raise CommandError(f'Nenhuma conta com o e-mail {email}.')
        user.is_staff = user.is_superuser = not remove
        user.save(update_fields=['is_staff', 'is_superuser'])
        self.stdout.write(self.style.SUCCESS(f"{user.email}: {'não é mais admin' if remove else 'agora é admin'}"))
