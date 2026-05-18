import secrets
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Campaign, DiceRig, DiceLog, Membership
from .serializers import DiceRigSerializer, DiceLogSerializer
from .permissions import get_campaign_or_404, require_dm, is_dm
from .rate_limit import rate_limit

DICE_SIDES = {'d4': 4, 'd6': 6, 'd8': 8, 'd10': 10, 'd12': 12, 'd20': 20, 'd100': 100}
VALID_TYPES = set(DICE_SIDES.keys()) | {'any'}


def roll_fair(dice_type):
    sides = DICE_SIDES.get(dice_type, 20)
    return secrets.randbelow(sides) + 1


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_rigs(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    if request.method == 'GET':
        rigs = DiceRig.objects.filter(campaign=campaign).select_related('target_user', 'target_user__profile')
        return Response({'rigs': DiceRigSerializer(rigs, many=True).data})

    target_user_id = request.data.get('targetUserId')
    dice_type = request.data.get('diceType', 'd20')
    values = request.data.get('values') or []
    if dice_type not in VALID_TYPES:
        raise ValidationError({'error': 'invalid_dice_type'})
    if not isinstance(values, list):
        raise ValidationError({'error': 'invalid_values'})
    if not target_user_id:
        raise ValidationError({'error': 'missing_target'})
    # garante que o alvo é membro
    if not Membership.objects.filter(campaign=campaign, user_id=target_user_id).exists():
        raise PermissionDenied('not_a_member')

    # normaliza values
    norm = []
    for v in values:
        if isinstance(v, dict):
            try:
                norm.append({'value': int(v['value']), 'consumed': bool(v.get('consumed', False)),
                             'label': str(v.get('label', ''))[:120] or None})
            except (KeyError, TypeError, ValueError):
                raise ValidationError({'error': 'invalid_value_item'})
        else:
            try: norm.append({'value': int(v), 'consumed': False})
            except (TypeError, ValueError):
                raise ValidationError({'error': 'invalid_value_item'})
    if len(norm) > 50:
        raise ValidationError({'error': 'too_many_values'})

    rig = DiceRig.objects.create(campaign=campaign, target_user_id=target_user_id, dice_type=dice_type, values=norm)
    return Response({'rig': DiceRigSerializer(rig).data})


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def rig_detail(request, pk):
    rig = DiceRig.objects.filter(pk=pk).select_related('campaign').first()
    if not rig:
        raise NotFound('not_found')
    if rig.campaign.dm_id != request.user.id:
        raise PermissionDenied('dm_only')

    if request.method == 'DELETE':
        rig.delete()
        return Response({'ok': True})

    if 'diceType' in request.data:
        if request.data['diceType'] not in VALID_TYPES:
            raise ValidationError({'error': 'invalid_dice_type'})
        rig.dice_type = request.data['diceType']
    if 'values' in request.data:
        rig.values = request.data['values']
    rig.save()
    return Response({'rig': DiceRigSerializer(rig).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit(key='dice_roll', max_attempts=120, window=60, per_user=True)  # 120 rolagens/min por user
def dice_roll(request):
    """Rola N dados pelo servidor. Se em campanha, consome rigs pendentes."""
    dice_type = request.data.get('diceType', 'd20')
    if dice_type not in DICE_SIDES:
        raise ValidationError({'error': 'invalid_dice_type'})
    campaign_id = request.data.get('campaignId')
    label = (request.data.get('label') or '')[:120]
    try:
        count = int(request.data.get('count', 1))
    except (TypeError, ValueError):
        count = 1
    count = max(1, min(20, count))

    campaign = None
    if campaign_id:
        campaign = Campaign.objects.filter(pk=campaign_id).first()
        if not campaign:
            raise NotFound('campaign_not_found')
        is_member = (campaign.dm_id == request.user.id
                     or Membership.objects.filter(campaign=campaign, user=request.user).exists())
        if not is_member:
            raise PermissionDenied('not_a_member')

    results = []
    for _ in range(count):
        results.append(_consume_or_roll(request.user, dice_type, campaign, label))

    return Response({
        'results': results,
        'total': sum(r['value'] for r in results),
    })


def _consume_or_roll(user, dice_type, campaign, label):
    if campaign:
        rigs = DiceRig.objects.filter(campaign=campaign, target_user=user, dice_type__in=[dice_type, 'any']).order_by('created_at')
        for rig in rigs:
            values = list(rig.values or [])
            for idx, v in enumerate(values):
                if not v.get('consumed'):
                    v['consumed'] = True
                    v['consumed_at'] = timezone.now().isoformat()
                    values[idx] = v
                    rig.values = values
                    rig.save()
                    DiceLog.objects.create(campaign=campaign, user=user, dice_type=dice_type, result=int(v['value']), rigged=True, label=label or v.get('label') or '')
                    return {'value': int(v['value']), 'rigged': True, 'source': rig.id}
    val = roll_fair(dice_type)
    DiceLog.objects.create(campaign=campaign, user=user, dice_type=dice_type, result=val, rigged=False, label=label or '')
    return {'value': val, 'rigged': False}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def campaign_dice_log(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    log = DiceLog.objects.filter(campaign=campaign).order_by('-created_at')[:200]
    return Response({'log': DiceLogSerializer(log, many=True).data})
