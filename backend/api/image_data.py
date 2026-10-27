"""
Imagens guardadas como data URL (base64) no banco, servidas como binário com
ETag e cache longo — o cliente pede com `?v=<ver>` e o navegador nunca baixa
de novo a mesma versão. Usado pela capa da campanha, pelas rotas públicas da
Tela e (V9) pelos retratos, tokens e fundo do mapa, que deixaram de ir em
base64 no JSON (`image_link`). Funções puras + um builder de HttpResponse.
"""
import base64
import binascii
import hashlib
import re

from django.http import HttpResponse, HttpResponseNotModified
from rest_framework.exceptions import ValidationError

MAX_IMAGE_CHARS = 450_000
_DATA_URL = re.compile(r'^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$')
# Mapa de combate aceita também gif (o canvas gera jpeg/png; gif por compat).
_MAP_DATA_URL = re.compile(r'^data:(image/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$')


def validate_data_url(value, *, max_chars=MAX_IMAGE_CHARS, allow_gif=False):
    """Valida `data:image/(jpeg|png|webp);base64,...` dentro do limite. 400 se inválida."""
    if not isinstance(value, str) or not value:
        raise ValidationError({'error': 'invalid_image'})
    if len(value) > max_chars:
        raise ValidationError({'error': 'image_too_large', 'max': max_chars})
    if not (_MAP_DATA_URL if allow_gif else _DATA_URL).match(value):
        raise ValidationError({'error': 'invalid_image'})
    return value


def image_ver(value):
    """Hash curto e estável da imagem (vai no ETag e no ?v=)."""
    return hashlib.sha1(value.encode('utf-8')).hexdigest()[:12] if value else ''


def image_link(value, path):
    """O que vai no JSON no lugar de uma imagem guardada em base64 (retrato do
    personagem, imagem do token, fundo do mapa): data URL → `path?v=<ver>` (a
    rota serve o binário com ETag e cache de 1 ano); outro texto (a arte do site,
    `/art/…`) → ele mesmo, como sempre foi; vazio → None. Nunca o base64."""
    if not value or not isinstance(value, str):
        return None
    if value.startswith('data:'):
        return f'{path}?v={image_ver(value)}'
    return value


def decode_data_url(value):
    """(content_type, bytes) ou None se não for uma data URL de imagem válida."""
    m = _MAP_DATA_URL.match(value or '')
    if not m:
        return None
    try:
        return m.group(1), base64.b64decode(re.sub(r'\s', '', m.group(2)), validate=True)
    except (binascii.Error, ValueError):
        return None


def image_response(request, data_url, ver=None, *, public=False):
    """Serve a data URL como binário. 304 se o If-None-Match bater com a versão."""
    ver = ver or image_ver(data_url)
    etag = f'"{ver}"'
    cache = f'{"public" if public else "private"}, max-age=31536000, immutable'
    inm = request.META.get('HTTP_IF_NONE_MATCH', '')
    if inm and etag in [t.strip() for t in inm.split(',')]:
        resp = HttpResponseNotModified()
        resp['ETag'] = etag
        resp['Cache-Control'] = cache
        return resp
    decoded = decode_data_url(data_url)
    if not decoded:
        return HttpResponse(status=404)
    content_type, raw = decoded
    resp = HttpResponse(raw, content_type=content_type)
    resp['ETag'] = etag
    resp['Cache-Control'] = cache
    resp['X-Content-Type-Options'] = 'nosniff'
    return resp
