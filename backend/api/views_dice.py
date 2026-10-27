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
from .diary import log_dice_roll
from .dice_privacy import scrub_dice
from . import table_rolls

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


MAX_GROUPS = 6
MAX_DICE = 40


def _int_in(value, lo, hi, default=0):
    try:
        return max(lo, min(hi, int(value)))
    except (TypeError, ValueError):
        return default


def _groups(data):
    """Os grupos da fórmula: `groups` [{diceType, count, sign}] (fórmula mista do
    rolador do mestre, "1d8+2d6+3") ou o par de sempre `diceType` + `count`."""
    raw = data.get('groups')
    if isinstance(raw, list) and raw:
        if len(raw) > MAX_GROUPS:
            raise ValidationError({'error': 'too_many_groups'})
        out = []
        for g in raw:
            if not isinstance(g, dict) or g.get('diceType') not in DICE_SIDES:
                raise ValidationError({'error': 'invalid_dice_type'})
            out.append({'die': g['diceType'], 'count': _int_in(g.get('count', 1), 1, 20, 1),
                        'sign': -1 if g.get('sign') in (-1, '-1') else 1})
        if sum(g['count'] for g in out) > MAX_DICE:
            raise ValidationError({'error': 'too_many_dice'})
        return out
    dice_type = data.get('diceType', 'd20')
    if dice_type not in DICE_SIDES:
        raise ValidationError({'error': 'invalid_dice_type'})
    return [{'die': dice_type, 'count': _int_in(data.get('count', 1), 1, 20, 1), 'sign': 1}]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit(key='dice_roll', max_attempts=120, window=60, per_user=True)  # 120 rolagens/min por user
def dice_roll(request):
    """Rola N dados pelo servidor. Se em campanha, consome rigs pendentes.

    Rolagens na Tela (V10, api/table_rolls.py), só em campanha aberta:
      · o MESTRE manda `table` (o 🔒 Só eu · 📺 Na tela do rolador dele): true grava
        a linha pública `@mesa:dm` (a TV mostra "Mestre"), false a privada (fica no
        registro dele); sem `table` (rolador antigo), nada além do DiceLog;
      · o JOGADOR (rolador da Mesa) grava a linha `@mesa:player` quando a política
        "Dos jogadores" do mestre deixa (Todas · Só críticos · Nenhuma) e a
        resposta diz `shown` ("📺 apareceu na Tela").
    Extras opcionais: `modifier` (vai na linha da Tela; `total` continua sendo só a
    soma dos dados, como antes), `adv` ('adv'|'dis', para 1d20) e `groups`.
    """
    data = request.data
    groups = _groups(data)
    campaign_id = data.get('campaignId')
    label = (data.get('label') or '')[:120]
    modifier = _int_in(data.get('modifier', 0), -50, 50, 0)
    adv = data.get('adv') if data.get('adv') in ('adv', 'dis') else None
    if adv and not (len(groups) == 1 and groups[0]['die'] == 'd20' and groups[0]['count'] == 1):
        adv = None

    campaign = None
    if campaign_id:
        campaign = Campaign.objects.filter(pk=campaign_id).first()
        if not campaign:
            raise NotFound('campaign_not_found')
        is_member = (campaign.dm_id == request.user.id
                     or Membership.objects.filter(campaign=campaign, user=request.user).exists())
        if not is_member:
            raise PermissionDenied('not_a_member')
        if campaign.status == 'closed':
            # Campanha encerrada é somente leitura: a ficha do jogador continua
            # rolando, mas fora da campanha (sem log, sem diário, sem dado viciado).
            campaign = None

    results = []
    for g in groups:
        rolled = []
        for _ in range(2 if adv else g['count']):
            rolled.append({**_consume_or_roll(request.user, g['die'], campaign, label), 'die': g['die']})
        if adv:
            # 2d20, fica o maior (vantagem) ou o menor; no empate só um conta
            a, b = rolled[0]['value'], rolled[1]['value']
            keep_first = (a >= b) if adv == 'adv' else (a <= b)
            rolled[0]['kept'], rolled[1]['kept'] = keep_first, not keep_first
        else:
            for r in rolled:
                r['kept'] = True
        log_dice_roll(campaign, request.user, g['die'], [r for r in rolled if r['kept']], label)
        if g['sign'] < 0:
            for r in rolled:
                r['sign'] = -1
        results.append(rolled)
    flat = [r for rolled in results for r in rolled]
    total = sum(r['value'] * r.get('sign', 1) for r in flat if r.get('kept', True))

    payload = {'results': flat, 'total': total}
    dice_type = groups[0]['die'] if len(groups) == 1 else 'mixed'
    if campaign is not None:
        row = _table_row(request, campaign, flat, dice_type, sum(g['count'] for g in groups),
                         label, modifier, total)
        if row is not None:
            payload['shown'] = row.status == 'public'
            payload['rollId'] = row.id
        elif campaign.dm_id != request.user.id:
            payload['shown'] = False
    # Dado viciado é segredo do mestre: quem não é o mestre recebe só o valor.
    if not (campaign and campaign.dm_id == request.user.id):
        payload['results'] = scrub_dice(flat)
    return Response(payload)


def _table_row(request, campaign, flat, dice_type, count, label, modifier, total):
    """A linha da Tela desta rolagem (ou None): 🔒/📺 do mestre ou a política dos jogadores."""
    rigged = any(r.get('rigged') for r in flat)
    dice = [{'value': r['value'], 'kept': r.get('kept', True), 'die': r['die'],
             **({'sign': -1} if r.get('sign') == -1 else {}), **({'rigged': True} if r.get('rigged') else {})}
            for r in flat]
    crit, fail = table_rolls.natural_crit(dice)
    common = dict(label=label, dice_type=dice_type, count=count, modifier=modifier, rolls=dice,
                  total=total + modifier, crit=crit, fail=fail, rigged=rigged)
    if campaign.dm_id == request.user.id:
        if 'table' not in request.data:
            return None
        return table_rolls.record(campaign, request.user, 'dm', public=bool(request.data.get('table')), **common)
    if not table_rolls.players_allow(table_rolls.prefs_of(campaign), dice):
        return None
    character = (Membership.objects.filter(campaign=campaign, user=request.user)
                 .select_related('character').first())
    return table_rolls.record(campaign, request.user, 'player',
                              character=character.character if character else None, **common)


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
    log = DiceLog.objects.filter(campaign=campaign).order_by('-created_at', '-id')[:200]
    return Response({'log': DiceLogSerializer(log, many=True).data})
