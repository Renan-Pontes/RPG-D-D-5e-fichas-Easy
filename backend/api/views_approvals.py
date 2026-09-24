from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Approval, Campaign, Character
from .serializers import ApprovalSerializer
from .permissions import get_campaign_or_404, require_member, is_dm
from .progression import (
    apply_approval_to_character, validate_level_up, validate_level_choice, max_hp_gain,
    class_entries, can_multiclass_into, with_class_level, MULTICLASS_SKILL,
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
    return Response({'approval': ApprovalSerializer(obj).data, 'character': {'id': obj.character.id, 'data': obj.character.data}})


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
    spells = body.get('spellsAdded')
    if spells is not None:
        if not isinstance(spells, list) or not all(isinstance(x, str) and len(x) <= 80 for x in spells) or len(spells) > 10:
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
            obj = Approval(campaign=campaign, character=char, requested_by=request.user, type='levelup', payload=payload)
        obj.status = 'approved'
        obj.note = note or obj.note
        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        obj.save()
        granted.append(ApprovalSerializer(obj).data)
    return Response({'granted': granted, 'skipped': skipped})
