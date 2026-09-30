from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Approval, Campaign, Character
from .diary import log_levelup, log_xp
from .serializers import ApprovalSerializer
from .permissions import get_campaign_or_404, require_member, is_dm
from .progression import (
    apply_approval_to_character, validate_level_up, validate_level_choice, max_hp_gain,
    class_entries, can_multiclass_into, with_class_level, MULTICLASS_SKILL,
    validate_class_options,
)

VALID_TYPES = {'levelup', 'feature', 'item', 'spell', 'other'}


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_approvals(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    user_is_dm = is_dm(request.user, campaign)

    if request.method == 'GET':
        qs = Approval.objects.filter(campaign=campaign).select_related(
            'requested_by', 'requested_by__profile',
            'reviewed_by', 'reviewed_by__profile',
            'character',
        )
        if not user_is_dm:
            # Jogador vê o que pediu e o que o mestre liberou para os personagens dele.
            qs = qs.filter(Q(requested_by=request.user) | Q(character__owner=request.user))
        return Response({'approvals': ApprovalSerializer(qs, many=True).data})

    # POST
    type_ = request.data.get('type')
    if type_ not in VALID_TYPES:
        raise ValidationError({'error': 'invalid_type'})
    char_id = request.data.get('characterId')
    if not char_id:
        raise ValidationError({'error': 'invalid_input'})
    char = Character.objects.filter(pk=char_id).first()
    if not char:
        raise NotFound('character_not_found')
    if char.owner_id != request.user.id and not user_is_dm:
        raise PermissionDenied('forbidden')

    payload = request.data.get('payload') or {}
    note = request.data.get('note') or ''

    if type_ == 'levelup':
        check = validate_level_up(char.data or {}, payload)
        if not check['valid']:
            return Response({'error': 'invalid_levelup', 'issues': check['issues']}, status=400)

    obj = Approval.objects.create(
        campaign=campaign, character=char, requested_by=request.user,
        type=type_, payload=payload, note=note,
    )
    return Response({'approval': ApprovalSerializer(obj).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approval_review(request, pk):
    """
    Mestre libera ('approved') ou rejeita uma solicitação.

    Para type='levelup': aprovar só LIBERA — não sobe o nível. O jogador
    precisa chamar /consume pra de fato aplicar a evolução na ficha
    (clicando "Subir nível ✨" no celular).

    Para outros types (feature/item/spell/other): aprovar aplica direto,
    por compatibilidade com o fluxo antigo (não há decisões do jogador).
    """
    obj = Approval.objects.filter(pk=pk).select_related('campaign', 'character').first()
    if not obj:
        raise NotFound('not_found')
    if obj.campaign.dm_id != request.user.id:
        raise PermissionDenied('dm_only')

    new_status = request.data.get('status')
    if new_status not in ('approved', 'rejected', 'pending'):
        # 'pending' permite revogar liberação
        raise ValidationError({'error': 'invalid_status'})

    # Mestre decide se esta subida pode abrir uma classe nova (padrão: regra da mesa).
    if obj.type == 'levelup' and new_status == 'approved':
        allow = request.data.get('allowMulticlass')
        if not isinstance(allow, bool):
            allow = campaign_allows_multiclass(obj.campaign)
        obj.payload = {**(obj.payload or {}), 'allowMulticlass': allow}

    obj.status = new_status
    obj.note = request.data.get('note', obj.note)
    obj.reviewed_by = request.user if new_status != 'pending' else None
    obj.reviewed_at = timezone.now() if new_status != 'pending' else None
    obj.save()

    # Aplicação direta só pra types não-levelup (mantém compatibilidade).
    # Pra levelup o jogador consome via /consume.
    apply_changes = request.data.get('applyChanges', True)
    if new_status == 'approved' and apply_changes and obj.type != 'levelup':
        next_data = apply_approval_to_character(obj.character.data or {}, obj.type, obj.payload or {})
        if next_data is not None:
            obj.character.data = next_data
            obj.character.save()
            obj.status = 'consumed'
            obj.save(update_fields=['status'])

    return Response({'approval': ApprovalSerializer(obj).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approval_consume(request, pk):
    """
    Jogador consome uma approval já liberada (status='approved'),
    aplicando o efeito na ficha. Só o dono do personagem pode consumir.

    Após consumir, status vira 'consumed' e não pode mais ser aplicada.
    """
    obj = Approval.objects.filter(pk=pk).select_related('campaign', 'character').first()
    if not obj:
        raise NotFound('not_found')
    if obj.character.owner_id != request.user.id:
        raise PermissionDenied('owner_only')
    if obj.status != 'approved':
        raise ValidationError({'error': 'not_unlocked', 'currentStatus': obj.status})

    payload = dict(obj.payload or {})
    if obj.type == 'levelup':
        payload = _merge_levelup_choices(obj.character.data or {}, payload, request.data or {})

    next_data = apply_approval_to_character(obj.character.data or {}, obj.type, payload)
    if next_data is not None:
        obj.character.data = next_data
        obj.character.save()

    # Guarda o que o jogador escolheu (classe, PV, ASI…) para o histórico do mestre.
    obj.payload = payload
    obj.status = 'consumed'
    obj.save(update_fields=['status', 'payload'])
    log_levelup(obj)
    return Response({'approval': ApprovalSerializer(obj).data, 'character': {'id': obj.character.id, 'data': obj.character.data}})


def _grant_levelups(campaign, members, user, allow, note=''):
    """Aprova (ou cria aprovada) a subida de nível de cada membro. Devolve (granted, skipped)."""
    granted, skipped = [], []
    for m in members:
        char = m.character
        level = int((char.data or {}).get('level') or 1)
        open_ = Approval.objects.filter(campaign=campaign, character=char, type='levelup', status__in=('pending', 'approved'))
        if level >= 20 or open_.filter(status='approved').exists():
            skipped.append(char.id)
            continue
        payload = {'toLevel': level + 1, 'allowMulticlass': allow}
        obj = open_.filter(status='pending').first()
        if obj:
            obj.payload = {**(obj.payload or {}), **payload}
        else:
            obj = Approval(campaign=campaign, character=char, requested_by=user, type='levelup', payload=payload)
        obj.status = 'approved'
        obj.note = note or obj.note
        obj.reviewed_by = user
        obj.reviewed_at = timezone.now()
        obj.save()
        granted.append(ApprovalSerializer(obj).data)
    return granted, skipped


def campaign_allows_multiclass(campaign):
    return (campaign.state or {}).get('allowMulticlass', True) is not False


def _merge_levelup_choices(data, payload, body):
    """
    O jogador decide classe, PV, ASI/talento e magias ao consumir o level-up.
    Tudo é validado aqui: o mestre liberou o nível, não valores arbitrários.
    """
    to_level = payload.get('toLevel')
    current = [e['id'] for e in class_entries(data)]
    class_id = body.get('classId') or current[0]
    if class_id not in current:
        if payload.get('allowMulticlass', True) is False:
            raise ValidationError({'error': 'multiclass_not_allowed'})
        if not can_multiclass_into(data, class_id):
            raise ValidationError({'error': 'multiclass_prereq'})
    payload['classId'] = class_id
    after = {**with_class_level(data, class_id), 'level': to_level}
    hp = body.get('hpGain')
    if hp is not None:
        top = max_hp_gain(data, class_id)
        if not isinstance(hp, int) or isinstance(hp, bool) or hp < 1 or hp > top:
            raise ValidationError({'error': 'invalid_hpGain', 'max': top})
        payload['hpGain'] = hp
    skill = body.get('skillAdded')
    if skill is not None:
        if class_id in current or class_id not in MULTICLASS_SKILL or not isinstance(skill, str) or not skill or len(skill) > 40:
            raise ValidationError({'error': 'invalid_skillAdded'})
        payload['skillAdded'] = skill
    choice = body.get('choice')
    if choice is not None:
        check = validate_level_choice(after, to_level, choice)
        if not check['valid']:
            raise ValidationError({'error': 'invalid_choice', 'issues': check['issues']})
        payload['choice'] = choice
    options = body.get('options')
    if options is not None:
        check = validate_class_options(after, class_id, options, level_up=True)
        if not check['valid']:
            raise ValidationError({'error': 'invalid_options', 'issues': check['issues']})
        payload['options'] = options
    spells = body.get('spellsAdded')
    if spells is not None:
        # Itens: id (str) ou {'id', 'inBook': True} — grimório, só para o mago.
        def _ok(x):
            if isinstance(x, str):
                return 0 < len(x) <= 80
            return (isinstance(x, dict) and set(x) <= {'id', 'inBook'} and x.get('inBook') is True
                    and class_id == 'wizard' and isinstance(x.get('id'), str) and 0 < len(x['id']) <= 80)
        book = [x for x in spells if isinstance(x, dict)] if isinstance(spells, list) else []
        if (not isinstance(spells, list) or not all(_ok(x) for x in spells)
                or len(spells) - len(book) > 10 or len(book) > 6):
            raise ValidationError({'error': 'invalid_spellsAdded'})
        payload['spellsAdded'] = spells
    return payload


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_grant_levelup(request, id_or_slug):
    """
    Mestre libera a subida de nível direto (sem o jogador pedir), para um ou
    vários personagens da campanha — ex.: marco da história para a mesa toda.

    Body: { characterIds: [1, 2] | 'all', allowMulticlass?: bool, note?: str }
    Pedido pendente do personagem é aprovado; liberação já existente é mantida.
    """
    campaign = get_campaign_or_404(id_or_slug)
    if campaign.dm_id != request.user.id:
        raise PermissionDenied('dm_only')
    ids = request.data.get('characterIds')
    members = campaign.memberships.exclude(character=None).select_related('character')
    if ids != 'all':
        if not isinstance(ids, list) or not ids or not all(isinstance(i, int) for i in ids):
            raise ValidationError({'error': 'invalid_input'})
        members = members.filter(character_id__in=ids)
    allow = request.data.get('allowMulticlass')
    if not isinstance(allow, bool):
        allow = campaign_allows_multiclass(campaign)
    note = (request.data.get('note') or '')[:500]

    granted, skipped = _grant_levelups(campaign, members, request.user, allow, note)
    return Response({'granted': granted, 'skipped': skipped})


# XP total para chegar a cada nível (índice = nível atual → XP para o próximo). SRD 5.2.1.
XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000,
                 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]


def campaign_leveling_mode(campaign):
    return 'xp' if (campaign.state or {}).get('levelingMode') == 'xp' else 'milestone'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_award_xp(request, id_or_slug):
    """
    Mestre dá XP (campanha no modo XP). Body: { amount: int, characterIds: [..] | 'all', split?: bool }
    split=true divide o total entre os personagens (XP de encontro); senão cada um recebe `amount`.
    Quem passar do limiar do próximo nível ganha a subida liberada automaticamente.
    """
    campaign = get_campaign_or_404(id_or_slug)
    if campaign.dm_id != request.user.id:
        raise PermissionDenied('dm_only')
    if campaign_leveling_mode(campaign) != 'xp':
        raise ValidationError({'error': 'campaign_uses_milestones'})
    amount = request.data.get('amount')
    if not isinstance(amount, int) or isinstance(amount, bool) or not (0 < amount <= 1_000_000):
        raise ValidationError({'error': 'invalid_amount'})
    ids = request.data.get('characterIds', 'all')
    members = campaign.memberships.exclude(character=None).exclude(role='dm').select_related('character')
    if ids != 'all':
        if not isinstance(ids, list) or not ids or not all(isinstance(i, int) for i in ids):
            raise ValidationError({'error': 'invalid_input'})
        members = members.filter(character_id__in=ids)
    members = list(members)
    if not members:
        raise ValidationError({'error': 'no_characters'})
    each = amount // len(members) if request.data.get('split') else amount

    awarded, ready = [], []
    for m in members:
        char = m.character
        data = dict(char.data or {})
        data['xp'] = int(data.get('xp') or 0) + each
        data['levelingMode'] = 'xp'
        char.data = data
        char.save()
        level = int(data.get('level') or 1)
        awarded.append({'characterId': char.id, 'xp': data['xp']})
        if level < 20 and data['xp'] >= XP_THRESHOLDS[level]:
            ready.append(m)
    granted, _ = _grant_levelups(campaign, ready, request.user, campaign_allows_multiclass(campaign),
                                 f'XP suficiente para o nível seguinte.') if ready else ([], [])
    log_xp(campaign, each, members, granted, request.user)
    return Response({'each': each, 'awarded': awarded, 'granted': granted})
