"""
Exception handler customizado do DRF.

Padroniza todos os erros pra `{error: <code>, ...}` (já que o frontend lê
e.data.error). DRF default usa `{detail: ...}`.
"""
from rest_framework.views import exception_handler as drf_default_handler
from rest_framework.exceptions import (
    NotAuthenticated, AuthenticationFailed, PermissionDenied,
    NotFound, ValidationError, MethodNotAllowed, Throttled,
)


CODE_MAP = {
    NotAuthenticated: 'auth_required',
    AuthenticationFailed: 'auth_failed',
    PermissionDenied: 'forbidden',
    NotFound: 'not_found',
    MethodNotAllowed: 'method_not_allowed',
    Throttled: 'rate_limited',
}


def custom_exception_handler(exc, context):
    response = drf_default_handler(exc, context)
    if response is None:
        return None

    data = response.data
    new = {}

    # Se já existe 'error' (alguma view setou), mantém
    if isinstance(data, dict) and 'error' in data:
        new = data
    else:
        # mapeia o tipo do erro para um code curto
        for cls, code in CODE_MAP.items():
            if isinstance(exc, cls):
                new['error'] = code
                break
        else:
            new['error'] = 'invalid'

        # Inclui detail/issues para debugging
        if isinstance(data, dict):
            if 'detail' in data:
                new['detail'] = str(data['detail'])
            # Validation errors: dict de campo -> [msgs]
            field_errors = {k: v for k, v in data.items() if k != 'detail'}
            if field_errors:
                new['fields'] = field_errors
        elif isinstance(data, list):
            new['detail'] = '; '.join(str(x) for x in data)
        else:
            new['detail'] = str(data)

    response.data = new
    return response
