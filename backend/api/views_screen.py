"""
Endpoint público do telão. Não exige autenticação — só o screen_token.
"""
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from .models import Campaign


def _public_character(data, name, char_id):
    d = data or {}
    abilities = d.get('abilities') or {}
    dex = abilities.get('dex', 10)
    dex_mod = (dex - 10) // 2
    ac_estimate = 10 + dex_mod + (2 if d.get('hasShield') else 0) + int(d.get('extraAcBonus') or 0)
    return {
        'id': char_id,
        'name': name or d.get('name', ''),
        'race': d.get('race', ''),
        'className': d.get('className', ''),
        'subclass': d.get('subclass', ''),
        'level': d.get('level', 1),
        'currentHp': d.get('currentHp'),
        'maxHp': d.get('maxHp'),
        'tempHp': d.get('tempHp', 0),
        'armorClass': ac_estimate,
        'speed': d.get('speedOverride') or 30,
        'conditions': d.get('conditions', []),
        'inspiration': bool(d.get('inspiration')),
        'deathSaves': d.get('deathSaves') or {'success': 0, 'fail': 0},
        'avatar': d.get('avatar', ''),
        'symbol': d.get('symbol', ''),
    }


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])  # sem CSRF/sessão pra rota pública
def screen(request, token):
    campaign = Campaign.objects.filter(screen_token=token).select_related('dm').first()
    if not campaign:
        raise NotFound('not_found')
    memberships = campaign.memberships.select_related('user', 'character').all()
    return Response({
        'campaign': {
            'id': campaign.id,
            'name': campaign.name,
            'slug': campaign.slug,
            'description': campaign.description,
            'state': campaign.state,
            'dm': {'id': campaign.dm.id, 'displayName': _display_name(campaign.dm)},
            'members': [
                {
                    'id': m.id,
                    'role': m.role,
                    'user': {'id': m.user.id, 'displayName': _display_name(m.user)},
                    'character': _public_character(m.character.data, m.character.name, m.character.id) if m.character else None,
                }
                for m in memberships
            ],
        }
    })


def _display_name(user):
    if hasattr(user, 'profile'):
        try:
            return user.profile.display_name
        except Exception:
            pass
    return (user.email or user.username).split('@')[0] if user.email else user.username
