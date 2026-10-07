"""Catálogo de itens por campanha. Só o mestre lê e edita (itens podem ser segredo)."""
import json
import re

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError

from .models import CampaignItem
from .permissions import get_campaign_or_404, require_dm

ITEM_TYPES = {'weapon', 'armor', 'shield', 'gear', 'potion', 'magic'}
RARITIES = {'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'}
# Itens mágicos do SRD têm descrições longas (tabelas, vários parágrafos).
MAX_DESC_CHARS = 12000
MAX_ITEM_BYTES = 24000
MAGIC_CATEGORIES = {'armor', 'potion', 'ring', 'rod', 'scroll', 'staff', 'wand', 'weapon', 'wondrous'}
ABILITIES = {'str', 'dex', 'con', 'int', 'wis', 'cha'}
DICE_RE = re.compile(r'^\d{1,2}d\d{1,3}(?:\s*[+-]\s*\d{1,3})?$')
SAFE_ID_RE = re.compile(r'^[A-Za-z0-9_+-]{1,64}$')
MASTERIES = {'cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex'}


def _text(value, limit):
    return value.strip()[:limit] if isinstance(value, str) else ''


def _bilingual(value, limit=2000):
    if isinstance(value, str):
        value = {'pt': value, 'en': value}
    if not isinstance(value, dict):
        return None
    out = {k: _text(value.get(k), limit) for k in ('pt', 'en') if _text(value.get(k), limit)}
    return out or None


def _int_in(value, lo, hi):
    """Inteiro dentro de [lo, hi] ou None (bool não conta)."""
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value if lo <= value <= hi else None


def _clean_magic(magic):
    out = {
        'rarity': magic.get('rarity') if magic.get('rarity') in RARITIES else 'common',
        'attunement': bool(magic.get('attunement')),
        'effect': _bilingual(magic.get('effect')) or {},
    }
    # Sintonização restrita ("por um conjurador"): {by: {pt, en}}.
    att = magic.get('attunement')
    if isinstance(att, dict):
        by = _bilingual(att.get('by'), 120)
        out['attunement'] = {'by': by} if by else True
    if magic.get('category') in MAGIC_CATEGORIES:
        out['category'] = magic['category']
    for key in ('bonus', 'acBonus', 'saveBonus', 'spellAttackBonus'):
        n = _int_in(magic.get(key), -10, 10)
        if n is not None:
            out[key] = n
    charges = _int_in(magic.get('charges'), 0, 100)
    if charges is not None:
        out['charges'] = charges
    heal = _text(magic.get('heal'), 20)
    if heal and DICE_RE.match(heal):
        out['heal'] = heal
    scores = magic.get('setScore')
    if isinstance(scores, dict):
        clean = {k: v for k, v in ((k, _int_in(scores.get(k), 1, 30)) for k in ABILITIES) if v is not None}
        if clean:
            out['setScore'] = clean
    return out


def clean_item(raw):
    """Valida e normaliza um item; só guarda os campos conhecidos."""
    if not isinstance(raw, dict):
        raise ValidationError({'error': 'invalid_item'})
    name = _text(raw.get('name'), 120)
    if not name:
        raise ValidationError({'error': 'missing_item_name'})
    item_type = raw.get('type') if raw.get('type') in ITEM_TYPES else 'gear'
    item = {'name': name, 'type': item_type}
    for key in ('weight', 'cost'):
        if isinstance(raw.get(key), (int, float)) and not isinstance(raw.get(key), bool) and raw[key] >= 0:
            item[key] = raw[key]
    # Referência ao catálogo de regras (ilustração e números da arma/armadura base).
    for key in ('sourceId', 'base'):
        ref = raw.get(key)
        if isinstance(ref, str) and SAFE_ID_RE.match(ref):
            item[key] = ref
    desc = _bilingual(raw.get('description'), MAX_DESC_CHARS)
    if desc:
        item['description'] = desc
    weapon = raw.get('weapon')
    if isinstance(weapon, dict) and _text(weapon.get('damage'), 20):
        item['weapon'] = {
            'damage': _text(weapon.get('damage'), 20),
            'dmgType': _text(weapon.get('dmgType'), 30),
            'props': [_text(p, 30) for p in (weapon.get('props') or []) if _text(p, 30)][:10],
        }
        if _text(weapon.get('range'), 20):
            item['weapon']['range'] = _text(weapon.get('range'), 20)
        if weapon.get('mastery') in MASTERIES:
            item['weapon']['mastery'] = weapon['mastery']
    armor = raw.get('armor')
    if isinstance(armor, dict) and isinstance(armor.get('ac'), int) and not isinstance(armor.get('ac'), bool):
        item['armor'] = {'ac': max(0, min(30, armor['ac'])), 'type': _text(armor.get('type'), 20) or 'light'}
    magic = raw.get('magic')
    if isinstance(magic, dict):
        item['magic'] = _clean_magic(magic)
    if len(json.dumps(item, ensure_ascii=False).encode('utf-8')) > MAX_ITEM_BYTES:
        raise ValidationError({'error': 'item_too_large'})
    return item


def _serialize(obj):
    return {'id': obj.id, 'item': obj.data, 'updatedAt': obj.updated_at.isoformat()}


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_items(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    if request.method == 'GET':
        return Response({'items': [_serialize(o) for o in campaign.items.all()]})
    if campaign.items.count() >= 500:
        raise ValidationError({'error': 'catalog_full'})
    obj = CampaignItem.objects.create(campaign=campaign, data=clean_item(request.data.get('item')))
    return Response({'item': _serialize(obj)}, status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def campaign_item_detail(request, id_or_slug, item_pk):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    obj = campaign.items.filter(pk=item_pk).first()
    if not obj:
        raise NotFound('not_found')
    if request.method == 'DELETE':
        obj.delete()
        return Response({'ok': True})
    obj.data = clean_item(request.data.get('item'))
    obj.save()
    return Response({'item': _serialize(obj)})
