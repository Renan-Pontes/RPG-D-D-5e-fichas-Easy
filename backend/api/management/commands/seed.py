"""
Seed de dados de teste — `py manage.py seed`.

Cria:
  - usuário "mestre" (mestre@forja.local / forja-mestre-2026)
  - usuário "renan" (renan@forja.local / thalion-druida-2026)
  - campanha "Reino Esquecido" com Renan como jogador
  - personagem Thalion (druida das estrelas nível 2)
  - 1 aprovação pendente de levelup pra você experimentar
  - 1 DiceRig com valores 20, 12, 17 pra rolagens do Renan

Idempotente — pode rodar várias vezes sem duplicar.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Profile, Character, Campaign, Membership, Approval, DiceRig

User = get_user_model()


class Command(BaseCommand):
    help = 'Cria dados de teste para testar fluxo completo.'

    def handle(self, *args, **options):
        def ensure_user(username, email, password, display_name):
            user, created = User.objects.get_or_create(
                username=username, defaults={'email': email}
            )
            if created:
                user.set_password(password)
                user.email = email
                user.save()
                Profile.objects.create(user=user, display_name=display_name)
                self.stdout.write(self.style.SUCCESS(f'  [+] User: {username} / {password}'))
            else:
                self.stdout.write(f'  [=] User: {username} (já existe)')
                Profile.objects.get_or_create(user=user, defaults={'display_name': display_name})
            return user

        self.stdout.write(self.style.HTTP_INFO('== Usuários =='))
        dm = ensure_user('mestre', 'mestre@forja.local', 'forja-mestre-2026', 'Mestre')
        player = ensure_user('renan', 'renan@forja.local', 'thalion-druida-2026', 'Renan')

        self.stdout.write(self.style.HTTP_INFO('== Campanha =='))
        camp, created = Campaign.objects.get_or_create(
            slug='reino-esquecido',
            defaults={
                'dm': dm,
                'name': 'Reino Esquecido',
                'description': 'Campanha de teste criada pelo seed.',
                'state': {'session': 1, 'scene': 'Taverna do Javali Cego'},
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  [+] Campanha: {camp.name} (invite {camp.invite_code})'))
        else:
            self.stdout.write(f'  [=] Campanha: {camp.name} (invite {camp.invite_code})')

        self.stdout.write(self.style.HTTP_INFO('== Personagem =='))
        thalion_data = {
            'name': 'Thalion',
            'race': 'elf-wood',
            'className': 'druid',
            'subclass': 'stars',
            'level': 2,
            'abilities': {'str': 8, 'dex': 14, 'con': 12, 'int': 13, 'wis': 16, 'cha': 10},
            'currentHp': 15,
            'maxHp': 15,
            'hasShield': False,
            'spells': [
                {'id': 'druidcraft', 'prepared': True},
                {'id': 'thornWhip', 'prepared': True},
                {'id': 'guidance', 'prepared': True, 'auto': True},
            ],
            'background': 'outlander',
            'alignment': 'NG',
            'conditions': [],
        }
        thalion, created = Character.objects.get_or_create(
            owner=player, name='Thalion',
            defaults={'data': thalion_data},
        )
        if created:
            self.stdout.write(self.style.SUCCESS('  [+] Thalion criado'))

        m, _ = Membership.objects.get_or_create(
            campaign=camp, user=player,
            defaults={'character': thalion, 'role': 'player'},
        )
        if not m.character:
            m.character = thalion
            m.save()

        self.stdout.write(self.style.HTTP_INFO('== Aprovação pendente =='))
        if not Approval.objects.filter(campaign=camp, character=thalion, status='pending').exists():
            Approval.objects.create(
                campaign=camp, character=thalion,
                requested_by=player,
                type='levelup',
                payload={'toLevel': 3, 'hpGain': 6},
                note='Thalion quer subir pro nível 3 após o evento da taverna.',
            )
            self.stdout.write(self.style.SUCCESS('  [+] Aprovação pendente criada'))
        else:
            self.stdout.write('  [=] Aprovação pendente já existe')

        self.stdout.write(self.style.HTTP_INFO('== DiceRig =='))
        if not DiceRig.objects.filter(campaign=camp, target_user=player).exists():
            DiceRig.objects.create(
                campaign=camp, target_user=player, dice_type='d20',
                values=[
                    {'value': 20, 'consumed': False, 'label': 'percepcao na taverna'},
                    {'value': 12, 'consumed': False, 'label': None},
                    {'value': 17, 'consumed': False, 'label': 'persuasao com o estalajadeiro'},
                ],
            )
            self.stdout.write(self.style.SUCCESS('  [+] DiceRig: 20, 12, 17'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Seed concluido! Credenciais:'))
        self.stdout.write(f'  Mestre:  mestre@forja.local  /  forja-mestre-2026')
        self.stdout.write(f'  Jogador: renan@forja.local   /  thalion-druida-2026')
        self.stdout.write(f'  Campanha invite code: {camp.invite_code}')
        self.stdout.write(f'  Tela publica: http://localhost:5173/tv/{camp.screen_token}')
