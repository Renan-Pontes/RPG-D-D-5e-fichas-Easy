"""
Rate limiting simples usando o cache do Django.

Pra um projeto pequeno em single-process (PythonAnywhere free), a cache
in-memory (LocMemCache padrão) já resolve. Se migrar pra multi-worker,
trocar para RedisCache (apenas mudando settings.CACHES).

Uso (decorator):
    @rate_limit(key='login', per_ip=True, max_attempts=5, window=300)
    def my_view(request): ...
"""
from functools import wraps
import time

from django.core.cache import cache
from django.http import JsonResponse


def _client_ip(request):
    # Atrás de proxy (PythonAnywhere), X-Forwarded-For traz o real
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')


def rate_limit(key, max_attempts=10, window=60, per_ip=True, per_user=False):
    """Decorator. Bloqueia após max_attempts dentro de window segundos.

    Retorna 429 quando estourar. O cliente pode ler `retryAfter` no body.
    """
    def deco(view_func):
        @wraps(view_func)
        def wrapped(request, *args, **kwargs):
            parts = ['rl', key]
            if per_ip:
                parts.append(_client_ip(request))
            if per_user and request.user.is_authenticated:
                parts.append(str(request.user.id))
            cache_key = ':'.join(parts)

            # Janela deslizante via lista de timestamps
            now = time.time()
            attempts = cache.get(cache_key, [])
            # remove fora da janela
            attempts = [t for t in attempts if now - t < window]
            if len(attempts) >= max_attempts:
                retry_after = int(window - (now - attempts[0]))
                resp = JsonResponse(
                    {'error': 'rate_limited', 'retryAfter': max(1, retry_after)},
                    status=429,
                )
                resp['Retry-After'] = str(max(1, retry_after))
                return resp
            attempts.append(now)
            # window+5 de TTL pra garantir limpeza
            cache.set(cache_key, attempts, timeout=window + 5)
            return view_func(request, *args, **kwargs)
        return wrapped
    return deco


def reset_rate_limit(key, request=None, ip=None, user=None):
    """Útil pra zerar o contador após autenticação bem-sucedida."""
    parts = ['rl', key]
    if request is not None:
        parts.append(_client_ip(request))
    elif ip is not None:
        parts.append(ip)
    if user is not None:
        parts.append(str(user.id))
    cache.delete(':'.join(parts))
