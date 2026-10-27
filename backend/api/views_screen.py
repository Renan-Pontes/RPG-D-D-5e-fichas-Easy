"""
Endpoints públicos do telão. Não exigem autenticação — só o screen_token.

GET /screen/<token>                   estado PÚBLICO (whitelist), cartão "Mostrar agora"
                                      resolvido, combate filtrado (monstros só com nome,
                                      condições e faixa de saúde), PJs, rolagem/teste públicos.
                                      ?tv=1&c=<aba>: a TV de verdade avisa que está aberta
                                      ("TV conectada" do mestre, só no cache em memória);
                                      ?preview=1 (a prévia do mestre) não conta.
GET /screen/<token>/image/<entryId>   imagem de uma entrada do Mundo que NÃO está oculta.
GET /screen/<token>/cover             capa da campanha.
GET /screen/<token>/map               fundo do mapa de combate (cacheável por ?v=).
GET /screen/<token>/stage-image?v=    a imagem que está na FRENTE da Tela agora (cartão
                                      oculto em "só a imagem", sala, mapa de lugar); outra
                                      versão ou outra frente → 404.
GET /screen/<token>/portrait/<charId>?v=   foto de um personagem da mesa (V9).
GET /screen/<token>/token/<combatantId>?v= imagem de um token do combate (V9).

O palco (`stage`, api/stage.py) é o que manda na Tela: frente, fundo e as
sobreposições. `card`, `publicCheck` e o resto continuam por 1 versão (TV aberta
com o JS antigo).

Payload magro (V9): cada coisa vai UMA vez (antes `state`, `card` e `combat` iam
no topo e de novo dentro de `campaign`). Ficam onde a TV de antes já lê:
`card` e `stage` no topo; `state`, `members`, `combat`, `publicRolls` e
`publicCheck` dentro de `campaign`. No topo fica só um resumo de `combat` e de
`state` para o app do mestre de antes (1 versão). Foto do personagem (`avatar`), imagem do
token (`sprite`) e fundo do mapa (`backgroundUrl`) vão por URL com `?v=` (binário
com ETag e cache de 1 ano): com fotos e tokens de verdade, cada mudança caiu de
~1 MB para poucos KB. `lang` é o idioma da campanha (o do mestre, gravado pelo
app dele em dm_settings.lang); sem ele, a TV usa o do aparelho.

Tudo o que é só do mestre (nudges, concentration, diarySessions, screenCard cru,
PV/CA/ações de monstro, notas e segredos do Mundo) fica de fora.
"""
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from django.db.models.fields.json import KT

from .models import Campaign, Character, CombatInstance, RollRequest, CheckRequest
from .progression.multiclass import class_entries
from .campaign_state import public_state
from .image_data import image_link, image_response
from .screen_card import is_private_handout, resolve_screen_card
from .stage import public_stage, stage_image_data
from .dice_privacy import scrub_dice


def armor_class(d):
    """CA da FICHA (`data.armorClass`, que o app grava ao salvar com o cálculo
    inteiro: armadura, escudo, estilos, Defesa sem Armadura…). Ficha antiga, sem
    ela: a estimativa de antes (10 + DES + escudo)."""
    ac = d.get('armorClass')
    if isinstance(ac, (int, float)) and not isinstance(ac, bool) and 0 < ac < 100:
        return int(ac)
    abilities = d.get('abilities') or {}
    try:
        dex_mod = (int(abilities.get('dex', 10)) - 10) // 2
        extra = int(d.get('extraAcBonus') or 0)
    except (TypeError, ValueError):
        dex_mod, extra = 0, 0
    return 10 + dex_mod + (2 if d.get('hasShield') else 0) + extra


def _public_character(data, name, char_id, token):
    d = data or {}
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
        'armorClass': armor_class(d),
        'speed': d.get('speedOverride') or 30,
        'conditions': d.get('conditions', []),
        'inspiration': bool(d.get('inspiration')),
        'deathSaves': d.get('deathSaves') or {'success': 0, 'fail': 0},
        # a foto por URL (antes: o base64 inteiro a cada poll); a chave é a mesma
        # para a TV de antes, que põe o valor direto no <img>
        'avatar': image_link(d.get('avatar'), f'/api/screen/{token}/portrait/{char_id}') or '',
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
        # o idioma do mestre, lido no próprio SELECT (o dm_settings — com o plano da
        # sessão — não sai do banco)
        .annotate(_lang=KT('dm_settings__lang'))
        .first()
    )
    if not campaign:
        raise NotFound('not_found')
    if request.GET.get('tv') == '1' and request.GET.get('preview') != '1':
        from .views_pulse import mark_tv
        mark_tv(campaign.id, request.GET.get('c'))
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
    # Pedido de teste que o mestre escolheu mostrar (no máximo um; encerrado sai da Tela).
    shown_check = (
        CheckRequest.objects
        .filter(campaign=campaign, show_on_screen=True, status='open')
        .prefetch_related('responses')
        .first()
    )
    public_check = _check_for_screen(shown_check) if shown_check else None
    combat_payload = None
    if combat:
        combat_payload = _serialize_combat(combat, for_dm=False, token=token)
        combat_payload.pop('log', None)
    stage = public_stage(campaign, token=token, test=public_check, card=card)
    return Response({
        'v': 2,
        'lang': campaign._lang if campaign._lang in ('pt', 'en') else None,
        'card': card,
        'stage': stage,
        # 1 versão de transição: o app do mestre de antes (📺 do cabeçalho e Jogar › Telão)
        # lê `combat.active`/`round` e `state.scene` aqui no topo. Só o resumo (~150 bytes);
        # o combate e o estado inteiros estão em `campaign`.
        'combat': ({'active': combat_payload['active'], 'round': combat_payload['round'],
                    'turnIndex': combat_payload['turnIndex']} if combat_payload else None),
        'state': {k: state[k] for k in ('scene', 'session', 'live') if k in state},
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
            'dm': {'id': campaign.dm.id, 'displayName': _display_name(campaign.dm)},
            'members': [
                {
                    'id': m.id,
                    'role': m.role,
                    'user': {'id': m.user.id, 'displayName': _display_name(m.user)},
                    'character': _public_character(m.character.data, m.character.name, m.character.id, token) if m.character else None,
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
                    'rolls': scrub_dice(r.rolls or []),
                    'total': r.total,
                    'isCritical': r.is_critical,
                    'isCriticalFail': r.is_critical_fail,
                    'resolvedAt': r.resolved_at.isoformat() if r.resolved_at else None,
                }
                for r in public_rolls
            ],
            'publicCheck': public_check,
        }
    })


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
    if is_private_handout(entry):
        # Documento só para alguns jogadores nunca vai ao telão público.
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


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def screen_portrait(request, token, char_id):
    """Foto de um personagem DA MESA (sem login; a TV recebe só a URL)."""
    campaign = _campaign_by_token(token)
    ch = Character.objects.filter(pk=char_id, memberships__campaign=campaign).only('id', 'data').first()
    avatar = ((ch.data if ch else None) or {}).get('avatar')
    if not (isinstance(avatar, str) and avatar.startswith('data:')):
        raise NotFound('not_found')
    return image_response(request, avatar)


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def screen_token_image(request, token, combatant_id):
    """Imagem de um token do combate da campanha (sem login)."""
    from .views_combat import token_sprite
    campaign = _campaign_by_token(token)
    sprite = token_sprite(CombatInstance.objects.filter(campaign=campaign).only('combatants').first(), combatant_id)
    if not sprite:
        raise NotFound('not_found')
    return image_response(request, sprite)


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def screen_stage_image(request, token):
    """Imagem da frente da Tela (sem login). Só a frente ATUAL e só com a versão
    certa: o "só a imagem" de um cartão oculto não fica acessível depois de sair."""
    campaign = (Campaign.objects.filter(screen_token=token)
                .only('id', 'state', 'screen_token').first())
    if not campaign:
        raise NotFound('not_found')
    found = stage_image_data(campaign, request.GET.get('v') or '')
    if not found:
        raise NotFound('not_found')
    return image_response(request, found[0], found[1])


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
