"""
Senha temporária e troca de senha.

O app não tem "esqueci a senha" (sem e-mail). Quando alguém perde o acesso, o
admin define uma senha temporária — pela área Admin ou por
`manage.py senha_temporaria` — e marca `Profile.must_change_password`. No
próximo login o app só mostra a tela de nova senha até a troca.
"""
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Profile

MAX_PASSWORD = 200


def password_problem(password, user=None):
    """Código de erro da senha nova, ou None se ela serve."""
    if not isinstance(password, str) or not password:
        return 'password_required'
    if len(password) > MAX_PASSWORD:
        return 'password_too_long'
    try:
        password_validation.validate_password(password, user)
    except DjangoValidationError:
        return 'weak_password'
    return None


def _profile(user):
    prof = getattr(user, 'profile', None)
    if prof is None:
        base = (user.email or user.username or 'user').split('@')[0]
        prof = Profile.objects.create(user=user, display_name=base[:80])
    return prof


def set_temporary_password(user, password, must_change=True):
    """Grava a senha e liga (ou desliga) a troca obrigatória. As sessões
    abertas da conta caem sozinhas (o hash da sessão muda com a senha)."""
    user.set_password(password)
    user.save(update_fields=['password'])
    prof = _profile(user)
    prof.must_change_password = bool(must_change)
    prof.save(update_fields=['must_change_password'])


def set_own_password(user, password):
    """Troca feita pelo próprio usuário: grava e desliga a troca obrigatória."""
    set_temporary_password(user, password, must_change=False)


def must_change(user):
    prof = getattr(user, 'profile', None)
    return bool(prof and prof.must_change_password)
