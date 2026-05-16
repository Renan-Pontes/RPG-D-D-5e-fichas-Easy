"""
Endpoints de inventário com regras de modo (standalone vs campanha).

Modo standalone (sem Membership pra este personagem):
  - Dono pode tudo: criar, editar qualquer campo, remover.

Modo campanha (existe Membership pra este personagem):
  - Dono pode: equipar/desequipar, marcar consumido (qty--), editar notes,
    alternar attuned (se attunement=true e limite global de 3 não estourar).
  - Dono NÃO pode: criar item, editar broken/attunement/stats, remover.
  - DM da campanha pode tudo (give, patch livre, delete).

Estrutura do item em data.equipment[]:
  {
    id, sourceId?, name, type ('weapon'|'armor'|'shield'|'gear'|'potion'|'magic'),
    qty, equipped, broken, attunement (requer attunement), attuned (se ativo),
    notes, weapon?, armor?, magic?, description?
  }
"""
import secrets
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Character, Membership
from .serializers import CharacterSerializer


# ============================================================
# Helpers
# ============================================================
def _is_in_campaign(char):
    return Membership.objects.filter(character=char).exists()


def _is_dm_of(user, char):
    return Membership.objects.filter(character=char, campaign__dm=user).exists()


def _new_item_id():
    return f"item-{int(timezone.now().timestamp() * 1000)}-{secrets.token_hex(2)}"


def _find_item(inventory, item_id):
    for i, it in enumerate(inventory or []):
        # Skip legacy items que são string ou dict sem id
        if isinstance(it, dict) and it.get('id') == item_id:
            return i, it
    return -1, None


def _count_attuned(inventory):
    return sum(1 for it in (inventory or []) if isinstance(it, dict) and it.get('attuned'))


# ============================================================
# Endpoints
# ============================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def inventory_add(request, pk):
    """Adiciona um item. Autorização:
    - Standalone: dono OK; outros 403.
    - Campanha: DM OK; dono 403 (precisa o DM dar); outros 403.

    Body: { item: {name, type, ...stats...} }
    """
    try:
        char = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')

    item = request.data.get('item') or {}
    if not item.get('name'):
        raise ValidationError({'error': 'missing_item_name'})

    in_camp = _is_in_campaign(char)
    is_dm = _is_dm_of(request.user, char)
    is_owner = char.owner_id == request.user.id

    if in_camp:
        if not is_dm:
            raise PermissionDenied('dm_gives_items_in_campaign')
    else:
        if not is_owner:
            raise PermissionDenied('forbidden')

    # Garantir ID único
    new_item = dict(item)
    new_item['id'] = new_item.get('id') or _new_item_id()
    # Defaults seguros
    new_item.setdefault('qty', 1)
    new_item.setdefault('equipped', False)
    new_item.setdefault('broken', False)
    new_item.setdefault('attunement', bool((new_item.get('magic') or {}).get('attunement')))
    new_item.setdefault('attuned', False)
    new_item.setdefault('notes', '')

    data = dict(char.data or {})
    inventory = list(data.get('equipment') or [])
    inventory.append(new_item)
    data['equipment'] = inventory
    char.data = data
    char.save()
    return Response({'character': CharacterSerializer(char).data, 'item': new_item})


# Campos que o dono pode mexer livremente quando em campanha
OWNER_LIMITED_FIELDS = {'equipped', 'qty', 'notes', 'attuned'}


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def inventory_item(request, pk, item_id):
    """PATCH: edita item (regras de owner/DM/modo).
    DELETE: remove item (standalone owner OR DM em campanha).
    """
    try:
        char = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')

    if request.method == 'DELETE':
        return _do_delete(request, char, item_id)
    return _do_patch(request, char, item_id)


def _do_patch(request, char, item_id):

    in_camp = _is_in_campaign(char)
    is_dm = _is_dm_of(request.user, char)
    is_owner = char.owner_id == request.user.id

    if not (is_owner or is_dm):
        raise PermissionDenied('forbidden')

    patch = request.data.get('patch') or request.data
    if not isinstance(patch, dict):
        raise ValidationError({'error': 'invalid_patch'})

    data = dict(char.data or {})
    inventory = list(data.get('equipment') or [])
    idx, item = _find_item(inventory, item_id)
    if item is None:
        raise NotFound('item_not_found')

    # Owner em campanha: filtra patch pra só os campos permitidos
    effective_patch = dict(patch)
    if in_camp and not is_dm:
        rejected = [k for k in effective_patch.keys() if k not in OWNER_LIMITED_FIELDS]
        if rejected:
            raise PermissionDenied({'error': 'fields_forbidden_in_campaign', 'fields': rejected})

    # Attunement: se está marcando attuned=true, valida regra de 3 e que o item suporta
    if 'attuned' in effective_patch and effective_patch['attuned']:
        if not item.get('attunement'):
            raise ValidationError({'error': 'item_does_not_require_attunement'})
        # Conta os attuned, ignorando este item se já contado
        currently_attuned = sum(
            1 for it in inventory
            if isinstance(it, dict) and it.get('attuned') and it.get('id') != item_id
        )
        if currently_attuned >= 3:
            raise ValidationError({'error': 'attunement_limit_reached'})

    new_item = {**item, **effective_patch}
    # qty não pode ir abaixo de 0
    if 'qty' in effective_patch:
        try:
            new_item['qty'] = max(0, int(new_item['qty']))
        except (TypeError, ValueError):
            new_item['qty'] = 0
    inventory[idx] = new_item
    data['equipment'] = inventory
    char.data = data
    char.save()
    return Response({'character': CharacterSerializer(char).data, 'item': new_item})


def _do_delete(request, char, item_id):
    """Remove item.
    - Standalone owner: OK
    - Campanha: só DM (jogador não joga fora item dado pelo mestre).
    - Outros: 403.
    """
    in_camp = _is_in_campaign(char)
    is_dm = _is_dm_of(request.user, char)
    is_owner = char.owner_id == request.user.id

    if in_camp:
        if not is_dm:
            raise PermissionDenied('forbidden')
    else:
        if not is_owner:
            raise PermissionDenied('forbidden')

    data = dict(char.data or {})
    inventory = list(data.get('equipment') or [])
    idx, item = _find_item(inventory, item_id)
    if item is None:
        raise NotFound('item_not_found')
    del inventory[idx]
    data['equipment'] = inventory
    char.data = data
    char.save()
    return Response({'character': CharacterSerializer(char).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def inventory_consume(request, pk, item_id):
    """Owner consome 1 unidade. Funciona em qualquer modo. Quando qty chega
    a 0 e o item é potion, remove. Outros tipos ficam com qty=0 (DM decide
    se remove)."""
    try:
        char = Character.objects.get(pk=pk)
    except Character.DoesNotExist:
        raise NotFound('not_found')
    if char.owner_id != request.user.id:
        raise PermissionDenied('forbidden')

    data = dict(char.data or {})
    inventory = list(data.get('equipment') or [])
    idx, item = _find_item(inventory, item_id)
    if item is None:
        raise NotFound('item_not_found')
    new_qty = max(0, int(item.get('qty') or 1) - 1)
    new_item = {**item, 'qty': new_qty}
    if new_qty == 0 and item.get('type') == 'potion':
        del inventory[idx]
    else:
        inventory[idx] = new_item
    data['equipment'] = inventory
    char.data = data
    char.save()
    return Response({'character': CharacterSerializer(char).data})
