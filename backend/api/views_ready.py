"""
Aventuras prontas da Forja (pacotes originais: mundo + aventura).

GET  /api/ready-adventures?lang=pt|en              catálogo da galeria (qualquer usuário logado; sem spoilers)
GET  /api/campaigns/<c>/ready-adventure?lang=…      catálogo + {imported, adventureId} desta campanha (só mestre)
POST /api/campaigns/<c>/ready-adventure {id, lang}  importa: cartões ocultos + aventura em Rascunho
                                                    (+ plano da próxima sessão, se estiver vazio).
     201 {adventureId, entryIds, sessionPlanFilled, name}
     409 {error: 'already_imported', adventureId}   (idempotente enquanto a aventura existir)
     400 {error: 'unknown_adventure' | 'world_full' | 'too_many_adventures'}
"""
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import adventures_ready as READY
from .permissions import get_campaign_or_404, require_dm


def _lang(value):
    return 'en' if value == 'en' else 'pt'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ready_catalog(request):
    return Response({'adventures': READY.catalog(_lang(request.query_params.get('lang')))})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_ready_adventure(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    if request.method == 'GET':
        items = READY.catalog(_lang(request.query_params.get('lang')))
        for it in items:
            aid = READY.imported_adventure_id(campaign, it['id'])
            it['imported'] = bool(aid)
            it['adventureId'] = aid
        return Response({'adventures': items})
    body = request.data if isinstance(request.data, dict) else {}
    pack_id = body.get('id') if isinstance(body.get('id'), str) else ''
    try:
        with transaction.atomic():
            result = READY.import_ready_adventure(campaign, pack_id, _lang(body.get('lang')))
    except READY.ReadyError as e:
        return Response({'error': e.code, **e.extra}, status=e.status)
    return Response(result, status=201)
