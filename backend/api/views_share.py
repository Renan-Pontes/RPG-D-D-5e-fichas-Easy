"""
Compartilhar ficha por link curto (vale 24h).

POST /api/shares          { character: {...} }  — logado; devolve { token, expiresAt }
GET  /api/shares/<token>                        — público; devolve { character, expiresAt } ou 404 se expirou
"""
import json
from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import SharedCharacter
from .rate_limit import rate_limit

SHARE_TTL = timedelta(hours=24)
MAX_SHARE_BYTES = 1_500_000  # ficha com foto cabe folgado; abaixo do limite de upload do Django
MAX_ACTIVE_PER_USER = 50


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit(key='share_create', max_attempts=30, window=3600, per_ip=False, per_user=True)
def share_create(request):
    data = request.data.get('character')
    if not isinstance(data, dict) or not str(data.get('name', '')).strip():
        raise ValidationError({'character': 'Ficha inválida.'})
    if len(json.dumps(data)) > MAX_SHARE_BYTES:
        raise ValidationError({'character': 'Ficha grande demais para compartilhar.'})
    now = timezone.now()
    SharedCharacter.objects.filter(expires_at__lte=now).delete()
    mine = SharedCharacter.objects.filter(owner=request.user).order_by('-created_at')
    for old in mine[MAX_ACTIVE_PER_USER - 1:]:
        old.delete()
    share = SharedCharacter.objects.create(owner=request.user, data=data, expires_at=now + SHARE_TTL)
    return Response({'token': share.token, 'expiresAt': share.expires_at.isoformat()}, status=201)


@api_view(['GET'])
@permission_classes([AllowAny])
@rate_limit(key='share_get', max_attempts=60, window=60)
def share_get(request, token):
    share = SharedCharacter.objects.filter(token=token, expires_at__gt=timezone.now()).first()
    if not share:
        raise NotFound('Link expirado ou inexistente.')
    return Response({'character': share.data, 'expiresAt': share.expires_at.isoformat()})
