"""
Endpoints públicos do telão. Não exigem autenticação — só o screen_token.

GET /screen/<token>                   estado PÚBLICO (whitelist), cartão "Mostrar agora"
                                      resolvido, combate filtrado (monstros só com nome,
                                      condições e faixa de saúde), PJs, rolagem/teste públicos.
GET /screen/<token>/image/<entryId>   imagem de uma entrada do Mundo que NÃO está oculta.
GET /screen/<token>/cover             capa da campanha.
GET /screen/<token>/map               fundo do mapa de combate (cacheável por ?v=).

Tudo o que é só do mestre (nudges, concentration, diarySessions, screenCard cru,
PV/CA/ações de monstro, notas e segredos do Mundo) fica de fora.
"""
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from .models import Campaign, CombatInstance, RollRequest, CheckRequest
from .progression.multiclass import class_entries
from .campaign_state import public_state
from .image_data import image_response, image_ver
from .screen_card import resolve_screen_card


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
        'classes': [{'id': e['id'], 'level': e['level']} for e in class_entries(d)] if d.get('className') else [],
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
    campaign = (
        Campaign.objects
        .filter(screen_token=token)
        .select_related('dm', 'dm__profile')
        .defer('cover_image', 'dm_settings')
        .first()
    )
    if not campaign:
        raise NotFound('not_found')
    from .views_combat import _serialize_combat
    state = public_state(campaign.state)
    card = resolve_screen_card(campaign, token=token)
    memberships = campaign.memberships.select_related('user', 'user__profile', 'character').all()
    combat = CombatInstance.objects.filter(campaign=campaign).first()
    # publicRolls é só pra DISPARAR overlay dramático no TV (não renderizamos lista).
    # Limitamos a 1 — o mais recente — pra evitar payload inflado.
    public_rolls = list(
        RollRequest.objects
        .filter(campaign=campaign, status='public')
        .select_related('requested_by', 'requested_by__profile')[:1]
    )
    # Pedido de teste que o mestre escolheu mostrar (no máximo um).
    shown_check = (
        CheckRequest.objects
        .filter(campaign=campaign, show_on_screen=True)
        .prefetch_related('responses')
        .first()
    )
    combat_payload = None
    if combat:
        combat_payload = _serialize_combat(combat, for_dm=False)
        combat_payload.pop('log', None)
        combat_payload['map'] = _public_map(combat_payload.get('map') or {}, token)
    return Response({
        'state': state,
        'card': card,
        'combat': combat_payload,
        'campaign': {
            'id': campaign.id,
            'name': campaign.name,
            'slug': campaign.slug,
            'description': campaign.description,
            'tagline': campaign.tagline,
            'accent': campaign.accent,
            'tone': campaign.tone,
            'coverVer': campaign.cover_ver,
            'coverUrl': f'/api/screen/{token}/cover?v={campaign.cover_ver}' if campaign.cover_ver else None,
            'state': state,
            'card': card,
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
            'combat': combat_payload,
            'publicRolls': [
                {
                    'id': r.id,
                    'requester': _display_name(r.requested_by),
                    'label': r.label,
                    'diceType': r.dice_type,
                    'count': r.count,
                    'modifier': r.modifier,
                    'rolls': r.rolls,
                    'total': r.total,
                    'isCritical': r.is_critical,
                    'isCriticalFail': r.is_critical_fail,
                    'resolvedAt': r.resolved_at.isoformat() if r.resolved_at else None,
                }
                for r in public_rolls
            ],
            'publicCheck': _check_for_screen(shown_check) if shown_check else None,
        }
    })


def _public_map(map_data, token):
    """Mapa do telão: grade + fundo. O fundo continua inline (compat) e ganha
    `backgroundVer`/`backgroundUrl` para o telão trocar para a URL cacheável."""
    out = {k: map_data.get(k) for k in ('background_image', 'grid_size_px', 'grid_visible', 'width_px', 'height_px')
           if k in map_data}
    bg = map_data.get('background_image')
    if bg:
        ver = image_ver(bg)
        out['backgroundVer'] = ver
        out['backgroundUrl'] = f'/api/screen/{token}/map?v={ver}'
    return out


def _campaign_by_token(token, *fields):
    c = Campaign.objects.filter(screen_token=token).only('id', 'state', *fields).first()
    if not c:
        raise NotFound('not_found')
    return c


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def screen_image(request, token, entry_id=None, **kwargs):
    """Imagem de uma entrada do Mundo para o telão. 404 se a entrada estiver oculta."""
    from .models import WorldEntry, WorldImage
    entry_id = entry_id if entry_id is not None else (kwargs.get('entryId') or kwargs.get('pk'))
    campaign = _campaign_by_token(token)
    try:
        entry_id = int(entry_id)
    except (TypeError, ValueError):
        raise NotFound('not_found')
    entry = (WorldEntry.objects.filter(campaign=campaign, pk=entry_id)
             .exclude(visibility='hidden').only('id', 'kind', 'data', 'image_ver', 'visibility').first())
    if not entry or not entry.image_ver:
        raise NotFound('not_found')
    if entry.kind == 'handout' and isinstance((entry.data or {}).get('recipients'), list):
        # Documento só para alguns jogadores: no telão, só se o mestre o mostrou agora.
        card = (campaign.state or {}).get('screenCard') or {}
        if not (card.get('type') == 'entry' and card.get('entryId') == entry.id):
            raise NotFound('not_found')
    img = WorldImage.objects.filter(entry=entry).only('data').first()
    if not img or not img.data:
        raise NotFound('not_found')
    return image_response(request, img.data, entry.image_ver)


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def screen_cover(request, token):
    """Capa da campanha para o telão (sem login)."""
    campaign = _campaign_by_token(token, 'cover_image', 'cover_ver')
    if not campaign.cover_image:
        raise NotFound('not_found')
    return image_response(request, campaign.cover_image, campaign.cover_ver)


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def screen_map(request, token):
    """Fundo do mapa de combate para o telão (cacheável por ?v=backgroundVer)."""
    campaign = _campaign_by_token(token)
    combat = CombatInstance.objects.filter(campaign=campaign).only('map_data').first()
    bg = ((combat.map_data if combat else None) or {}).get('background_image')
    if not bg:
        raise NotFound('not_found')
    return image_response(request, bg)


def _display_name(user):
    if hasattr(user, 'profile'):
        try:
            return user.profile.display_name
        except Exception:
            pass
    return (user.email or user.username).split('@')[0] if user.email else user.username


def _check_for_screen(cr):
    from .views_checks import serialize_for_screen
    return serialize_for_screen(cr)
