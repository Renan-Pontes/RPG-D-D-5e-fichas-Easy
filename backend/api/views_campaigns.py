import re

from django.db import IntegrityError
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Campaign, Character, Membership, new_screen_token, new_invite_code, slugify_clean, new_slug
from .serializers import CampaignSerializer, CampaignListSerializer
from .permissions import get_campaign_or_404, is_dm, require_member, require_dm
from .campaign_state import (clean_state_patch, clean_state_value, merge_state,
                             PATCHABLE_KEYS, SERVER_KEYS)
from .image_data import validate_data_url, image_ver, image_response
from .screen_card import clean_screen_card, resolve_screen_card
from .rate_limit import rate_limit

TONES = {'heroic', 'dark', 'mystery', 'comic', 'epic'}
_ACCENT = re.compile(r'^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$')
MAX_NAME = 120
MAX_DESCRIPTION = 4000
MAX_TAGLINE = 160
MAX_ONBOARDING_KEYS = 30


def _get_light(id_or_slug):
    """Como get_campaign_or_404, sem carregar a capa (o GET da campanha é polling)."""
    qs = Campaign.objects.defer('cover_image')
    obj = qs.filter(id=id_or_slug).first() if str(id_or_slug).isdigit() else None
    obj = obj or qs.filter(slug=id_or_slug).first()
    if not obj:
        raise NotFound('campaign_not_found')
    return obj


def _apply_identity(obj, data):
    """Campos de identidade da campanha (assistente de criação e ⚙ Ajustes)."""
    if 'tagline' in data:
        v = data.get('tagline') or ''
        if not isinstance(v, str) or len(v) > MAX_TAGLINE:
            raise ValidationError({'error': 'invalid_tagline'})
        obj.tagline = v.strip()
    if 'accent' in data:
        v = data.get('accent') or ''
        if not isinstance(v, str) or (v and not _ACCENT.match(v)):
            raise ValidationError({'error': 'invalid_accent'})
        obj.accent = v
    if 'tone' in data:
        v = data.get('tone') or ''
        if v and v not in TONES:
            raise ValidationError({'error': 'invalid_tone'})
        obj.tone = v


def _apply_dm_settings(obj, data):
    """onboarding (merge raso de flags) e advancedDice — só o mestre vê (dm_settings)."""
    settings = dict(obj.dm_settings or {})
    if 'onboarding' in data:
        ob = data.get('onboarding')
        if not isinstance(ob, dict) or len(ob) > MAX_ONBOARDING_KEYS or not all(
                isinstance(k, str) and len(k) <= 40 and (isinstance(v, (bool, int)) or v is None)
                for k, v in ob.items()):
            raise ValidationError({'error': 'invalid_onboarding'})
        merged = {**(settings.get('onboarding') or {}), **ob}
        settings['onboarding'] = {k: v for k, v in merged.items() if v is not None}
    if 'advancedDice' in data:
        if not isinstance(data.get('advancedDice'), bool):
            raise ValidationError({'error': 'invalid_advancedDice'})
        settings['advancedDice'] = data['advancedDice']
    obj.dm_settings = settings


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_list(request):
    if request.method == 'GET':
        # Pré-busca memberships do usuário para evitar N+1 no get_role do serializer
        # defer: a capa (até 450k) nunca vai na lista — só por GET /cover.
        owned = list(Campaign.objects.filter(dm=request.user).defer('cover_image'))
        joined = list(
            Campaign.objects
            .defer('cover_image')
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
    if not name or len(name) > MAX_NAME or not isinstance(description, str):
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
    obj = Campaign(
        dm=request.user, name=name, description=description[:MAX_DESCRIPTION], slug=slug,
        screen_token=new_screen_token(), invite_code=new_invite_code(),
    )
    _apply_identity(obj, request.data)
    obj.save()
    return Response({'campaign': CampaignSerializer(obj, context={'request': request}).data})


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def campaign_detail(request, id_or_slug):
    obj = _get_light(id_or_slug) if request.method == 'GET' else get_campaign_or_404(id_or_slug)
    if request.method == 'GET':
        require_member(request.user, obj)
        return Response({'campaign': CampaignSerializer(obj, context={'request': request}).data})

    require_dm(request.user, obj)

    if request.method == 'DELETE':
        obj.delete()
        return Response({'ok': True})

    data = request.data if isinstance(request.data, dict) else {}
    if 'name' in data:
        name = (data.get('name') or '').strip() if isinstance(data.get('name'), str) else ''
        if not name or len(name) > MAX_NAME:
            raise ValidationError({'error': 'invalid_name'})
        obj.name = name
    if 'description' in data:
        if not isinstance(data.get('description') or '', str):
            raise ValidationError({'error': 'invalid_description'})
        obj.description = (data.get('description') or '')[:MAX_DESCRIPTION]
    _apply_identity(obj, data)
    _apply_dm_settings(obj, data)
    deprecated = False
    fields = ['name', 'description', 'tagline', 'accent', 'tone', 'dm_settings', 'updated_at']
    if 'state' in data:
        # DEPRECIADO: PUT do state inteiro (cópia do cliente). Prefira
        # PATCH /campaigns/:id/state {patch}. Mantido por compatibilidade, mas
        # agora é MERGE (chave ausente não apaga nada — a cópia do cliente pode
        # estar velha), chaves do servidor (diarySessions, screenCard) nunca são
        # sobrescritas e as chaves conhecidas são validadas.
        if not isinstance(data['state'], dict):
            raise ValidationError({'state': 'must be object'})
        deprecated = True
        incoming = data['state']
        patch = {}
        for key, value in incoming.items():
            if key in SERVER_KEYS:
                continue
            patch[key] = clean_state_value(key, value) if key in PATCHABLE_KEYS else value
        obj.save(update_fields=fields)
        merge_state(obj, patch)
    else:
        obj.save(update_fields=fields)
    resp = Response({'campaign': CampaignSerializer(obj, context={'request': request}).data})
    if deprecated:
        resp['Deprecation'] = 'true'
        resp['Warning'] = '299 - "PUT state is deprecated; use PATCH /api/campaigns/<id>/state"'
    return resp


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def campaign_state_patch(request, id_or_slug):
    """PATCH /campaigns/:id/state  {patch: {key: value|null}} → {state}

    Merge por chave no servidor (null remove a chave). Chaves permitidas:
    session, scene, sceneText, weather, live, nudges, concentration,
    endOfEncounterWizard, levelingMode, allowMulticlass. Outra chave → 400."""
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    body = request.data if isinstance(request.data, dict) else {}
    patch = clean_state_patch(body.get('patch'))
    return Response({'state': merge_state(campaign, patch)})


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def campaign_cover(request, id_or_slug):
    """Capa da campanha.
    GET  (membro)  → imagem binária; ETag = coverVer; use ?v=<coverVer> (cache de 1 ano). 404 sem capa.
    PUT  (mestre)  {image: dataURL (jpeg/png/webp ≤ 450k) | null} → {coverVer}
    DELETE (mestre) → {coverVer: ''}"""
    campaign = get_campaign_or_404(id_or_slug)
    if request.method == 'GET':
        require_member(request.user, campaign)
        if not campaign.cover_image:
            return HttpResponse(status=404)
        return image_response(request, campaign.cover_image, campaign.cover_ver)
    require_dm(request.user, campaign)
    image = None
    if request.method == 'PUT':
        body = request.data if isinstance(request.data, dict) else {}
        image = body.get('image')
        if image not in (None, ''):
            image = validate_data_url(image)
    campaign.cover_image = image or ''
    campaign.cover_ver = image_ver(image) if image else ''
    campaign.save(update_fields=['cover_image', 'cover_ver', 'updated_at'])
    return Response({'coverVer': campaign.cover_ver})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_screen_card(request, id_or_slug):
    """POST /campaigns/:id/screen-card  — "Mostrar agora" no telão (só mestre).
    body: {type:'entry', entryId, secretIds?} | {type:'recap', title, text}
        | {type:'scene', adventureId, nodeId} | null  (ou {card: ...})
    → {card: <cartão resolvido como o telão vê> | null}
    Entrada oculta → 400 entry_hidden (mostrar não revela: o mestre revela antes)."""
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    card = clean_screen_card(campaign, request.data)
    merge_state(campaign, {'screenCard': card})
    return Response({'card': resolve_screen_card(campaign, token=campaign.screen_token)})


_INVITE_CODE = re.compile(r'^[A-Z0-9]{4,10}$')


def _campaign_by_invite(code):
    code = (code or '').strip().upper()
    if not _INVITE_CODE.match(code):
        return None
    return Campaign.objects.filter(invite_code=code).select_related('dm', 'dm__profile').defer('cover_image').first()


def _dm_display_name(user):
    prof = getattr(user, 'profile', None)
    name = getattr(prof, 'display_name', '') if prof else ''
    return name or (user.email.split('@')[0] if user.email else user.username)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@rate_limit(key='invite_preview', max_attempts=30, window=60, per_ip=False, per_user=True)
def campaign_invite_preview(request, code):
    """GET /campaigns/invite/<code> — prévia da mesa antes de entrar (ex.: na
    criação de personagem: "tem um código de sala?"). Só dados de vitrine:
    nada de estado, membros nominais, tokens ou Mundo. 404 invite_invalid."""
    campaign = _campaign_by_invite(code)
    if not campaign:
        return Response({'error': 'invite_invalid'}, status=404)
    state = campaign.state or {}
    already = campaign.dm_id == request.user.id or \
        Membership.objects.filter(campaign=campaign, user=request.user).exists()
    out = {
        'campaignId': campaign.id,
        'slug': campaign.slug,
        'name': campaign.name,
        'tagline': campaign.tagline,
        'accent': campaign.accent,
        'dmName': _dm_display_name(campaign.dm),
        'members': Membership.objects.filter(campaign=campaign).exclude(role='dm').count(),
        'levelingMode': 'xp' if state.get('levelingMode') == 'xp' else 'milestone',
        'allowMulticlass': state.get('allowMulticlass', True) is not False,
        'alreadyMember': already,
    }
    if campaign.cover_ver:
        out['coverUrl'] = f'/api/campaigns/invite/{campaign.invite_code}/cover?v={campaign.cover_ver}'
    return Response(out)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@rate_limit(key='invite_cover', max_attempts=60, window=60, per_ip=False, per_user=True)
def campaign_invite_cover(request, code):
    """GET /campaigns/invite/<code>/cover — capa para a prévia do convite (quem
    tem o código já pode entrar na mesa, então pode ver a capa)."""
    campaign = _campaign_by_invite(code)
    if not campaign or not campaign.cover_ver:
        return Response({'error': 'invite_invalid' if not campaign else 'not_found'}, status=404)
    img = Campaign.objects.filter(pk=campaign.pk).values_list('cover_image', flat=True).first()
    if not img:
        return Response({'error': 'not_found'}, status=404)
    return image_response(request, img, campaign.cover_ver)


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
