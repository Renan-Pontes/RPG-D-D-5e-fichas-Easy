"""
Raio-X do grupo (Grupo › Raio-X) — só o mestre.

Os gráficos (papel do grupo, perícias, dano, lacunas…) são calculados no navegador
do mestre com as fichas que o GET da campanha já entrega; o servidor só guarda os
ajustes e os momentos que o mestre escolhe, em Campaign.dm_settings.partyInsights
(sem migração). Fica FORA do CampaignSerializer e do polling: 1 GET ao abrir o
Raio-X e 1 PUT por edição (o cliente espera 800 ms entre um toque e o envio).

GET  /api/campaigns/<c>/party-insights   → {insights}
PUT  /api/campaigns/<c>/party-insights   {insights: {...}} (ou as chaves soltas) → {insights}
     merge por chave; nos mapas (focus, base, style, spotlights, dismissed) o merge
     entra um nível e null apaga o item. Validação em world_rules.clean_party_insights_patch.
"""
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import world_rules as R
from .campaign_state import locked_dm_settings
from .models import Campaign
from .permissions import get_campaign_or_404, require_dm


def _run(fn, *args):
    try:
        return fn(*args)
    except R.WorldError as e:
        raise ValidationError({'error': e.code})


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def party_insights(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    if request.method == 'GET':
        insights = _run(R.merged_party_insights, (campaign.dm_settings or {}).get('partyInsights'), {})
        return Response({'insights': insights})
    body = request.data if isinstance(request.data, dict) else {}
    raw = body.get('insights') if isinstance(body.get('insights'), dict) else body
    patch = _run(R.clean_party_insights_patch, raw)
    with transaction.atomic():
        settings = locked_dm_settings(campaign.pk)
        insights = _run(R.merged_party_insights, settings.get('partyInsights'), patch)
        settings['partyInsights'] = insights
        Campaign.objects.filter(pk=campaign.pk).update(dm_settings=settings)
    return Response({'insights': insights})
