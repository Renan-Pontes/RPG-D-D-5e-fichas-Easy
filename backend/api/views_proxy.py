"""
Proxy seguro para busca de conteúdo de RPG (DandWiki, Wikidot, etc.)
Evita problemas de CORS em navegadores durante a importação de monstros.
"""
import ipaddress
import socket
import urllib.error
import urllib.parse
import urllib.request

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

ALLOWED_DOMAINS = {
    'dandwiki.com',
    'www.dandwiki.com',
    'wikidot.com',
    'dndroll.wikidot.com',
    '5e.tools',
    '5etools-mirror-3.github.io',
    'raw.githubusercontent.com',
    'open5e.com',
    'api.open5e.com',
    'dndbeyond.com',
    'www.dndbeyond.com',
    'aidedd.org',
    'www.aidedd.org',
    '5e.d20srd.org',
    'roll20.net',
    'app.roll20.net',
}


def _is_safe_host(hostname: str) -> bool:
    if not hostname:
        return False
    host_lower = hostname.lower().strip()
    allowed = any(
        host_lower == d or host_lower.endswith('.' + d)
        for d in ALLOWED_DOMAINS
    )
    if not allowed:
        return False

    # Prevenção contra SSRF para IPs locais e privados
    try:
        ip = ipaddress.ip_address(host_lower)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            return False
    except ValueError:
        try:
            resolved = socket.getaddrinfo(host_lower, None)
            for item in resolved:
                addr = item[4][0]
                ip = ipaddress.ip_address(addr)
                if ip.is_private or ip.is_loopback or ip.is_link_local:
                    return False
        except Exception:
            return False

    return True


@csrf_exempt
def proxy_fetch(request):
    """
    GET /api/proxy?url=<encoded_url>
    Busca o conteúdo textual do alvo autorizado e retorna com cabeçalhos CORS.
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'method_not_allowed'}, status=405)

    target_url = request.GET.get('url', '').strip()
    if not target_url:
        return JsonResponse({'error': 'missing_url', 'detail': 'Parametro ?url obrigatorio'}, status=400)

    try:
        parsed = urllib.parse.urlparse(target_url)
    except Exception as e:
        return JsonResponse({'error': 'invalid_url', 'detail': str(e)}, status=400)

    if parsed.scheme not in ('http', 'https'):
        return JsonResponse({'error': 'invalid_scheme', 'detail': 'Apenas esquemas HTTP/HTTPS sao permitidos'}, status=400)

    if not _is_safe_host(parsed.hostname):
        return JsonResponse({'error': 'forbidden_host', 'detail': f'Dominio "{parsed.hostname}" nao autorizado no proxy'}, status=403)

    req = urllib.request.Request(
        target_url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            content = response.read()
            content_type = response.headers.get('Content-Type', 'text/plain; charset=utf-8')
            resp = HttpResponse(content, content_type=content_type, status=response.status)
            resp['Access-Control-Allow-Origin'] = '*'
            return resp
    except urllib.error.HTTPError as e:
        return JsonResponse({'error': 'upstream_error', 'status': e.code, 'detail': str(e)}, status=502)
    except Exception as e:
        return JsonResponse({'error': 'network_error', 'detail': str(e)}, status=504)
