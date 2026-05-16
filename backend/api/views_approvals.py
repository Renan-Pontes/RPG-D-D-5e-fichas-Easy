from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Approval, Campaign, Character
from .serializers import ApprovalSerializer
from .permissions import get_campaign_or_404, require_member, is_dm
from .progression import apply_approval_to_character, validate_level_up

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
            qs = qs.filter(requested_by=request.user)
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
    obj = Approval.objects.filter(pk=pk).select_related('campaign', 'character').first()
    if not obj:
        raise NotFound('not_found')
    if obj.campaign.dm_id != request.user.id:
        raise PermissionDenied('dm_only')

    status = request.data.get('status')
    if status not in ('approved', 'rejected'):
        raise ValidationError({'error': 'invalid_status'})

    obj.status = status
    obj.note = request.data.get('note', obj.note)
    obj.reviewed_by = request.user
    obj.reviewed_at = timezone.now()
    obj.save()

    apply_changes = request.data.get('applyChanges', True)
    if status == 'approved' and apply_changes:
        next_data = apply_approval_to_character(obj.character.data or {}, obj.type, obj.payload or {})
        if next_data is not None:
            obj.character.data = next_data
            obj.character.save()

    return Response({'approval': ApprovalSerializer(obj).data})
