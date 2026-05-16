from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied

from .models import Character, Membership
from .serializers import CharacterSerializer
from .permissions import can_read_character


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def character_list(request):
    if request.method == 'GET':
        chars = Character.objects.filter(owner=request.user)
        return Response({'characters': CharacterSerializer(chars, many=True).data})
    s = CharacterSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    obj = Character.objects.create(owner=request.user, name=s.validated_data['name'], data=s.validated_data.get('data') or {})
    return Response({'character': CharacterSerializer(obj).data})


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def character_detail(request, pk):
    try:
        obj = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')

    if request.method == 'GET':
        if not can_read_character(request.user, obj):
            raise PermissionDenied('forbidden')
        return Response({'character': CharacterSerializer(obj).data})

    # PUT / DELETE — só o dono
    if obj.owner_id != request.user.id:
        raise PermissionDenied('forbidden')

    if request.method == 'DELETE':
        obj.delete()
        return Response({'ok': True})

    s = CharacterSerializer(obj, data=request.data)
    s.is_valid(raise_exception=True)
    s.save()
    return Response({'character': s.data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def character_campaigns(request, pk):
    """Lista as campanhas em que este personagem está atribuído.
    Útil pro frontend solicitar level-up sem ter que iterar todas as campanhas
    do usuário (evita N+1 do lado cliente)."""
    try:
        obj = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')
    if obj.owner_id != request.user.id:
        raise PermissionDenied('forbidden')
    memberships = (
        Membership.objects
        .filter(character=obj)
        .select_related('campaign')
    )
    return Response({
        'campaigns': [
            {
                'id': m.campaign.id,
                'name': m.campaign.name,
                'slug': m.campaign.slug,
                'membershipId': m.id,
            }
            for m in memberships
        ],
    })
