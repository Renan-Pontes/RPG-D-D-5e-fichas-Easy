from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Campaign, Character, Membership, new_screen_token, new_invite_code, slugify_clean, new_slug
from .serializers import CampaignSerializer, CampaignListSerializer
from .permissions import get_campaign_or_404, is_dm, require_member, require_dm


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_list(request):
    if request.method == 'GET':
        # Pré-busca memberships do usuário para evitar N+1 no get_role do serializer
        owned = list(Campaign.objects.filter(dm=request.user))
        joined = list(
            Campaign.objects
            .filter(memberships__user=request.user)
            .exclude(dm=request.user)
            .prefetch_related('memberships')
            .distinct()
        )
        seen = {c.id for c in owned}
        all_camps = owned + [c for c in joined if c.id not in seen]
        return Response({'campaigns': CampaignListSerializer(all_camps, many=True, context={'request': request}).data})

    name = (request.data.get('name') or '').strip()
    description = request.data.get('description') or ''
    if not name:
        raise ValidationError({'error': 'invalid_input'})
    base = slugify_clean(name)
    slug = base
    attempt = 0
    while Campaign.objects.filter(slug=slug).exists():
        attempt += 1
        slug = f'{base}-{new_slug(4)}'
        if attempt > 5:
            slug = new_slug()
            break
    obj = Campaign.objects.create(
        dm=request.user, name=name, description=description, slug=slug,
        screen_token=new_screen_token(), invite_code=new_invite_code(),
    )
    return Response({'campaign': CampaignSerializer(obj, context={'request': request}).data})


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def campaign_detail(request, id_or_slug):
    obj = get_campaign_or_404(id_or_slug)
    if request.method == 'GET':
        require_member(request.user, obj)
        return Response({'campaign': CampaignSerializer(obj, context={'request': request}).data})

    require_dm(request.user, obj)

    if request.method == 'DELETE':
        obj.delete()
        return Response({'ok': True})

    if 'name' in request.data:
        obj.name = request.data['name']
    if 'description' in request.data:
        obj.description = request.data['description']
    if 'state' in request.data:
        if not isinstance(request.data['state'], dict):
            raise ValidationError({'state': 'must be object'})
        obj.state = request.data['state']
    obj.save()
    return Response({'campaign': CampaignSerializer(obj, context={'request': request}).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_join(request):
    code = (request.data.get('inviteCode') or '').upper()
    character_id = request.data.get('characterId')
    if not code:
        raise ValidationError({'error': 'invalid_input'})
    campaign = Campaign.objects.filter(invite_code=code).first()
    if not campaign:
        return Response({'error': 'invite_invalid'}, status=404)

    char = None
    if character_id:
        char = Character.objects.filter(pk=character_id).first()
        if not char or char.owner_id != request.user.id:
            return Response({'error': 'character_forbidden'}, status=403)
        # Personagem só pode estar em UMA campanha. Bloqueia se já tem outra.
        other = Membership.objects.filter(character=char).exclude(campaign=campaign).first()
        if other:
            return Response({'error': 'character_already_in_campaign',
                             'campaignId': other.campaign_id}, status=409)

    m, _ = Membership.objects.update_or_create(
        campaign=campaign, user=request.user,
        defaults={
            'character': char,
            'role': 'dm' if campaign.dm_id == request.user.id else 'player',
        },
    )
    return Response({'membership': {'id': m.id}, 'campaignId': campaign.id, 'slug': campaign.slug})


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def campaign_member(request, id_or_slug, membership_id):
    campaign = get_campaign_or_404(id_or_slug)
    m = Membership.objects.filter(pk=membership_id, campaign=campaign).first()
    if not m:
        raise NotFound('not_found')

    if request.method == 'DELETE':
        # DM remove qualquer membro (exceto ele próprio); o próprio user pode
        # remover a si mesmo (sair da campanha voluntariamente).
        if m.user_id == request.user.id:
            # User sai voluntariamente — não pode se for o DM da campanha
            if m.user_id == campaign.dm_id:
                return Response({'error': 'dm_cannot_leave'}, status=400)
        else:
            require_dm(request.user, campaign)
            if m.user_id == campaign.dm_id:
                return Response({'error': 'cannot_remove_dm'}, status=400)
        m.delete()
        return Response({'ok': True})

    # PUT: o próprio jogador pode mudar seu personagem; DM idem
    if m.user_id != request.user.id and not is_dm(request.user, campaign):
        raise PermissionDenied('forbidden')

    char_id = request.data.get('characterId', None)
    if char_id is None or char_id == '':
        m.character = None
    else:
        char = Character.objects.filter(pk=char_id).first()
        if not char:
            raise NotFound('character_not_found')
        # garante que o personagem é do dono da membership
        if char.owner_id != m.user_id:
            raise PermissionDenied('character_not_owned')
        # personagem só pode estar em UMA campanha (excluindo esta própria)
        other = Membership.objects.filter(character=char).exclude(pk=m.id).first()
        if other:
            return Response({'error': 'character_already_in_campaign',
                             'campaignId': other.campaign_id}, status=409)
        m.character = char
    m.save()
    return Response({'membership': {'id': m.id, 'characterId': m.character_id}})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_rotate_screen(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    campaign.screen_token = new_screen_token()
    campaign.save()
    return Response({'screenToken': campaign.screen_token})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_rotate_invite(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    campaign.invite_code = new_invite_code()
    campaign.save()
    return Response({'inviteCode': campaign.invite_code})
