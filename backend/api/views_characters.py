from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Character, Membership
from .serializers import CharacterSerializer
from .permissions import can_read_character
from . import wild_shape as ws_engine
from . import spells as spells_engine


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

    # PUT: em campanha, owner não pode alterar campos sensíveis.
    # Esses campos só mudam via DM editor (PATCH /dm-edit) ou endpoints
    # dedicados (cast/rest/inventory).
    in_camp = Membership.objects.filter(character=obj).exists()
    new_data = request.data.get('data') or {}
    if in_camp and isinstance(new_data, dict):
        old = obj.data or {}
        rejected = []
        for field in OWNER_LOCKED_IN_CAMPAIGN:
            new_v = new_data.get(field, _SENTINEL)
            old_v = old.get(field, _SENTINEL)
            if new_v is not _SENTINEL and new_v != old_v:
                rejected.append(field)
        if rejected:
            raise PermissionDenied({
                'error': 'fields_locked_in_campaign',
                'fields': rejected,
                'hint': 'use_dm_editor_or_dedicated_endpoint',
            })

    s = CharacterSerializer(obj, data=request.data)
    s.is_valid(raise_exception=True)
    s.save()
    return Response({'character': s.data})


_SENTINEL = object()

# Campos que o dono NÃO pode alterar via PUT regular quando o personagem está
# atribuído a uma campanha. Esses ou só mudam pelo DM (via /dm-edit) ou por
# endpoints dedicados que aplicam regras (cast/rest/inventory/wild-shape).
OWNER_LOCKED_IN_CAMPAIGN = {
    'maxHp', 'level', 'className', 'subclass', 'race', 'background',
    'alignment', 'xp',
    'abilities', 'raceBonus',
    'saveProfs', 'skillProfs', 'skillExpertise',
    'spellSlotsMax', 'spellSlotsUsed',
    'equipment', 'weapons', 'armor', 'hasShield',
}


def _can_modify_character(user, char):
    """Dono sempre pode. Mestre da campanha em que o personagem está, também."""
    if char.owner_id == user.id:
        return True
    return Membership.objects.filter(
        character=char,
        campaign__dm=user,
    ).exists()


def _is_dm_of_char(user, char):
    return Membership.objects.filter(character=char, campaign__dm=user).exists()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def character_cast_spell(request, pk):
    """Jogador conjura magia. Desconta 1 slot do nível indicado.
    Body: { spellId: 'fireball', slotLevel: 3 }  (slotLevel=0 = truque)
    """
    try:
        char = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')
    if char.owner_id != request.user.id:
        raise PermissionDenied('forbidden')

    slot_level = request.data.get('slotLevel')
    if slot_level is None:
        raise ValidationError({'error': 'missing_slotLevel'})
    try:
        slot_level = int(slot_level)
    except (TypeError, ValueError):
        raise ValidationError({'error': 'invalid_slotLevel'})

    next_data, err = spells_engine.cast(char.data or {}, slot_level)
    if err:
        return Response({'error': err}, status=400)
    char.data = next_data
    char.save()
    return Response({'character': CharacterSerializer(char).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def character_rest(request, pk):
    """Descanso curto ou longo.
    Body: { type: 'short' | 'long' }
    Permissão: dono OU DM da campanha em que o personagem está.
    """
    try:
        char = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')
    if not _can_modify_character(request.user, char):
        raise PermissionDenied('forbidden')

    rest_type = request.data.get('type')
    if rest_type == 'long':
        next_data = spells_engine.long_rest(char.data or {})
    elif rest_type == 'short':
        next_data = spells_engine.short_rest(char.data or {})
    else:
        raise ValidationError({'error': 'invalid_rest_type'})

    char.data = next_data
    char.save()
    return Response({'character': CharacterSerializer(char).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_long_rest_all(request, id_or_slug):
    """DM aplica descanso longo em todos os PCs da campanha."""
    from .permissions import get_campaign_or_404, require_dm
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    members = Membership.objects.filter(campaign=campaign).select_related('character')
    affected = []
    for m in members:
        if m.character:
            m.character.data = spells_engine.long_rest(m.character.data or {})
            m.character.save()
            affected.append(m.character.id)
    return Response({'restedCharacters': affected})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def character_dm_edit(request, pk):
    """Mestre da campanha edita campos da ficha do jogador.

    Body: { data: {...patch...}, name?: str }
    O patch é mesclado no Character.data (merge no nível raiz).
    Apenas o DM de uma campanha em que o personagem está atribuído pode usar.
    """
    try:
        char = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')
    if not _is_dm_of_char(request.user, char):
        raise PermissionDenied('dm_only')

    patch = request.data.get('data') or {}
    if not isinstance(patch, dict):
        raise ValidationError({'error': 'invalid_patch'})

    data = dict(char.data or {})
    # Merge raso: o mestre pode trocar qualquer campo, incluindo sub-objetos
    # inteiros (abilities, spellSlotsUsed). Se quiser merge profundo de
    # abilities, frontend manda abilities inteiro.
    data.update(patch)
    char.data = data
    new_name = request.data.get('name')
    if new_name:
        char.name = str(new_name)[:120]
    char.save()
    return Response({'character': CharacterSerializer(char).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def wild_shape_transform(request, pk):
    """Druida transforma. Body: { beast: {id, hp, ac, str/dex/con/int/wis/cha,
    speed, size, fly?, swim?, crNum, actions[], traits[]} }

    Apenas o dono pode transformar a si mesmo. O mestre da campanha NÃO pode
    transformar o jogador (mas pode forçar saída).
    """
    try:
        char = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')
    if char.owner_id != request.user.id:
        raise PermissionDenied('forbidden')

    data = char.data or {}
    if (data.get('className') or '').lower() != 'druid':
        return Response({'error': 'not_druid'}, status=400)

    beast = request.data.get('beast') or {}
    if not beast.get('id') or not beast.get('hp'):
        raise ValidationError({'error': 'invalid_beast'})

    level = int(data.get('level') or 1)
    subclass = data.get('subclass') or ''
    eligible, reason = ws_engine.beast_eligible(level, subclass, beast)
    if not eligible:
        return Response({'error': 'beast_not_eligible', 'reason': reason}, status=400)

    uses = data.get('wildShapeUses') or 0
    if uses >= 2:
        return Response({'error': 'no_uses_remaining'}, status=400)

    next_data, err = ws_engine.transform(data, beast)
    if err:
        return Response({'error': err}, status=400)

    char.data = next_data
    char.save()
    return Response({'character': CharacterSerializer(char).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def wild_shape_end(request, pk):
    """Sai da forma selvagem voluntariamente. Apenas dono."""
    try:
        char = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')
    if char.owner_id != request.user.id:
        raise PermissionDenied('forbidden')
    next_data, err = ws_engine.end_transform(char.data or {}, excess_damage=0)
    if err:
        return Response({'error': err}, status=400)
    char.data = next_data
    char.save()
    return Response({'character': CharacterSerializer(char).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def wild_shape_force_end(request, pk):
    """Mestre força saída da forma selvagem. Personagem precisa estar numa
    campanha em que o request.user é o DM. Permite passar `excess_damage`
    pra simular dano excedente narrativo."""
    try:
        char = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')
    if not _is_dm_of_char(request.user, char):
        raise PermissionDenied('dm_only')
    excess = int(request.data.get('excessDamage') or 0)
    next_data, err = ws_engine.end_transform(char.data or {}, excess_damage=excess)
    if err:
        return Response({'error': err}, status=400)
    char.data = next_data
    char.save()
    return Response({'character': CharacterSerializer(char).data})


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
