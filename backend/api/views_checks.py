"""
Pedido de teste do mestre para a mesa ("Todos: Percepção CD 15").

Fluxo:
  1. Mestre cria o pedido (todos os jogadores ou alguns; CD opcional e
     opcionalmente oculta; vantagem/desvantagem opcional).
  2. Cada jogador-alvo vê o pedido na ficha e responde:
       - mode='app'      → o servidor rola o d20 (consome DiceRig do mestre
                           se houver) e soma o modificador da ficha;
       - mode='physical' → o jogador digita o dado físico (natural + mod) ou
                           o total já somado.
     O mestre também pode anotar o resultado por um jogador (mode='dm').
  3. O mestre vê quem passou/falhou e decide se mostra no telão.
Nada é aplicado na ficha — é só informação para o mestre decidir.
"""
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CheckRequest, CheckResponse, Membership
from .permissions import get_campaign_or_404, is_dm, require_member
from .rate_limit import rate_limit
from .views_dice import _consume_or_roll
from .dice_privacy import scrub_dice

KINDS = {'skill', 'save', 'ability', 'custom'}
ADV = {'normal', 'adv', 'dis'}
MOD_MIN, MOD_MAX = -20, 30
MAX_OPEN_RECENT = 20


def _display_name(user):
    prof = getattr(user, 'profile', None)
    try:
        if prof and prof.display_name:
            return prof.display_name
    except Exception:  # pragma: no cover - profile ausente
        pass
    return (user.email or user.username).split('@')[0] if user.email else user.username


def _int_or_none(value, field):
    if value is None or value == '':
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError({'error': f'invalid_{field}'})


def _player_memberships(campaign):
    return (Membership.objects
            .filter(campaign=campaign)
            .exclude(user_id=campaign.dm_id)
            .exclude(role='dm')
            .select_related('user', 'user__profile', 'character'))


def _targets(cr, memberships=None):
    """Memberships-alvo do pedido ([] = todos os jogadores)."""
    ms = list(memberships if memberships is not None else _player_memberships(cr.campaign))
    ids = set(cr.target_user_ids or [])
    return [m for m in ms if not ids or m.user_id in ids]


def outcome(total, dc):
    if dc is None or total is None:
        return None
    return 'pass' if total >= dc else 'fail'


def _serialize_response(resp, for_dm=False):
    """Resposta de teste. `rigged` só vai para o mestre: o jogador nunca sabe
    que o dado foi viciado."""
    if not resp:
        return None
    out = {
        'mode': resp.mode,
        'natural': resp.natural,
        'rolls': resp.rolls if for_dm else scrub_dice(resp.rolls or []),
        'modifier': resp.modifier,
        'total': resp.total,
        'at': resp.updated_at.isoformat() if resp.updated_at else None,
    }
    if for_dm:
        out['rigged'] = resp.rigged
    return out


def serialize_for_dm(cr):
    responses = {r.user_id: r for r in cr.responses.all()}
    targets = []
    for m in _targets(cr):
        resp = responses.get(m.user_id)
        targets.append({
            'userId': m.user_id,
            'displayName': _display_name(m.user),
            'characterId': m.character_id,
            'characterName': m.character.name if m.character else None,
            'response': _serialize_response(resp, for_dm=True),
            'outcome': outcome(resp.total, cr.dc) if resp else None,
        })
    answered = sum(1 for t in targets if t['response'])
    return {
        'id': cr.id,
        'campaignId': cr.campaign_id,
        'label': cr.label,
        'kind': cr.kind,
        'key': cr.key,
        'dc': cr.dc,
        'dcHidden': cr.dc_hidden,
        'advantage': cr.advantage,
        'targetUserIds': cr.target_user_ids or [],
        'status': cr.status,
        'showOnScreen': cr.show_on_screen,
        'createdAt': cr.created_at.isoformat() if cr.created_at else None,
        'closedAt': cr.closed_at.isoformat() if cr.closed_at else None,
        'targets': targets,
        'answered': answered,
        'passed': sum(1 for t in targets if t['outcome'] == 'pass'),
        'failed': sum(1 for t in targets if t['outcome'] == 'fail'),
    }


def serialize_for_player(cr, user, character_id=None):
    resp = next((r for r in cr.responses.all() if r.user_id == user.id), None)
    dc = None if cr.dc_hidden else cr.dc
    if character_id is None:
        character_id = (Membership.objects.filter(campaign_id=cr.campaign_id, user=user)
                        .values_list('character_id', flat=True).first())
    return {
        'id': cr.id,
        'campaignId': cr.campaign_id,
        'characterId': character_id,
        'campaignName': cr.campaign.name,
        'label': cr.label,
        'kind': cr.kind,
        'key': cr.key,
        'dc': dc,
        'dcHidden': cr.dc_hidden,
        'advantage': cr.advantage,
        'status': cr.status,
        'createdAt': cr.created_at.isoformat() if cr.created_at else None,
        'myResponse': _serialize_response(resp),
        # Só revela passou/falhou se a CD é visível.
        'outcome': outcome(resp.total, dc) if resp else None,
    }


def serialize_for_screen(cr):
    """Resumo público para o telão (sem CD se oculta)."""
    data = serialize_for_dm(cr)
    return {
        'id': cr.id,
        'label': cr.label,
        'dc': None if cr.dc_hidden else cr.dc,
        'advantage': cr.advantage,
        'screenAt': cr.screen_at.isoformat() if cr.screen_at else None,
        'results': [
            {
                'name': t['characterName'] or t['displayName'],
                'total': t['response']['total'] if t['response'] else None,
                'natural': t['response']['natural'] if t['response'] else None,
                'outcome': t['outcome'],
            }
            for t in data['targets']
        ],
    }


def _get_check(pk):
    cr = CheckRequest.objects.select_related('campaign').filter(pk=pk).first()
    if not cr:
        raise NotFound('not_found')
    return cr


# ============================================================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_checks(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    dm = is_dm(request.user, campaign)

    if request.method == 'GET':
        qs = (CheckRequest.objects.filter(campaign=campaign)
              .select_related('campaign').prefetch_related('responses'))
        if dm:
            return Response({'checks': [serialize_for_dm(c) for c in qs[:MAX_OPEN_RECENT]]})
        mine = [c for c in qs.filter(status='open') if request.user.id in {m.user_id for m in _targets(c)}]
        return Response({'checks': [serialize_for_player(c, request.user) for c in mine]})

    if not dm:
        raise PermissionDenied('dm_only')
    body = request.data
    label = str(body.get('label') or '').strip()[:120]
    if not label:
        raise ValidationError({'error': 'missing_label'})
    kind = body.get('kind') or 'skill'
    if kind not in KINDS:
        raise ValidationError({'error': 'invalid_kind'})
    advantage = body.get('advantage') or 'normal'
    if advantage not in ADV:
        raise ValidationError({'error': 'invalid_advantage'})
    dc = _int_or_none(body.get('dc'), 'dc')
    if dc is not None and not (1 <= dc <= 40):
        raise ValidationError({'error': 'dc_out_of_range'})
    raw_targets = body.get('targetUserIds') or []
    if raw_targets == 'all':
        raw_targets = []
    if not isinstance(raw_targets, list):
        raise ValidationError({'error': 'invalid_targets'})
    try:
        target_ids = sorted({int(x) for x in raw_targets})
    except (TypeError, ValueError):
        raise ValidationError({'error': 'invalid_targets'})
    players = {m.user_id for m in _player_memberships(campaign)}
    if any(t not in players for t in target_ids):
        raise ValidationError({'error': 'target_not_player'})
    if not players:
        raise ValidationError({'error': 'no_players'})

    cr = CheckRequest.objects.create(
        campaign=campaign, created_by=request.user, label=label, kind=kind,
        key=str(body.get('key') or '')[:30], dc=dc, dc_hidden=bool(body.get('dcHidden')) and dc is not None,
        advantage=advantage, target_user_ids=target_ids,
    )
    return Response({'check': serialize_for_dm(cr)}, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_checks(request):
    """Pedidos abertos para mim em todas as campanhas (usado pela ficha)."""
    char_by_campaign = dict(Membership.objects.filter(user=request.user)
                            .exclude(role='dm').values_list('campaign_id', 'character_id'))
    qs = (CheckRequest.objects.filter(campaign_id__in=list(char_by_campaign), status='open')
          .exclude(campaign__dm=request.user)
          .select_related('campaign').prefetch_related('responses'))
    out = []
    for c in qs[:MAX_OPEN_RECENT]:
        ids = c.target_user_ids or []
        if ids and request.user.id not in ids:
            continue
        out.append(serialize_for_player(c, request.user, char_by_campaign.get(c.campaign_id)))
    return Response({'checks': out})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def check_detail(request, pk):
    cr = _get_check(pk)
    if not is_dm(request.user, cr.campaign):
        raise PermissionDenied('dm_only')
    cr.delete()
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_close(request, pk):
    cr = _get_check(pk)
    if not is_dm(request.user, cr.campaign):
        raise PermissionDenied('dm_only')
    reopen = bool(request.data.get('reopen'))
    cr.status = 'open' if reopen else 'closed'
    cr.closed_at = None if reopen else timezone.now()
    cr.save(update_fields=['status', 'closed_at'])
    return Response({'check': serialize_for_dm(cr)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_screen(request, pk):
    """Mestre decide se o resultado aparece no telão (só um por vez)."""
    cr = _get_check(pk)
    if not is_dm(request.user, cr.campaign):
        raise PermissionDenied('dm_only')
    show = bool(request.data.get('show', True))
    with transaction.atomic():
        if show:
            CheckRequest.objects.filter(campaign=cr.campaign, show_on_screen=True).exclude(pk=cr.pk) \
                .update(show_on_screen=False)
        cr.show_on_screen = show
        cr.screen_at = timezone.now() if show else None
        cr.save(update_fields=['show_on_screen', 'screen_at'])
    return Response({'check': serialize_for_dm(cr)})


def _roll_d20(user, cr):
    """Rola no servidor (consome DiceRig do mestre, se houver)."""
    label = cr.label
    if cr.advantage in ('adv', 'dis'):
        a = _consume_or_roll(user, 'd20', cr.campaign, label)
        b = _consume_or_roll(user, 'd20', cr.campaign, label)
        keep = max(a['value'], b['value']) if cr.advantage == 'adv' else min(a['value'], b['value'])
        keep_first = keep == a['value']
        rolls = [{'value': a['value'], 'kept': keep_first}, {'value': b['value'], 'kept': not keep_first}]
        return keep, rolls, bool(a.get('rigged') or b.get('rigged'))
    r = _consume_or_roll(user, 'd20', cr.campaign, label)
    return r['value'], [{'value': r['value'], 'kept': True}], bool(r.get('rigged'))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit(key='check_respond', max_attempts=60, window=60, per_user=True)
def check_respond(request, pk):
    cr = _get_check(pk)
    campaign = cr.campaign
    dm = is_dm(request.user, campaign)
    body = request.data
    if cr.status != 'open':
        raise ValidationError({'error': 'check_closed'})

    # Mestre pode anotar por um jogador (mesa com dado físico, jogador sem celular).
    if dm and body.get('userId') is not None:
        target_user_id = _int_or_none(body.get('userId'), 'user')
    else:
        target_user_id = request.user.id
    membership = next((m for m in _targets(cr) if m.user_id == target_user_id), None)
    if not membership:
        raise PermissionDenied('not_a_target')
    if not dm and target_user_id != request.user.id:
        raise PermissionDenied('forbidden')

    mode = body.get('mode') or 'app'
    if mode not in ('app', 'physical'):
        raise ValidationError({'error': 'invalid_mode'})
    if dm and target_user_id != request.user.id:
        mode = 'dm' if mode == 'physical' else mode

    modifier = _int_or_none(body.get('modifier'), 'modifier')
    if modifier is not None:
        modifier = max(MOD_MIN, min(MOD_MAX, modifier))

    existing = CheckResponse.objects.filter(check_request=cr, user_id=target_user_id).first()
    # Jogador não pode "rolar de novo" até passar: rolagem no app é definitiva.
    if existing and not dm and existing.mode == 'app':
        raise ValidationError({'error': 'already_rolled'})
    if existing and not dm and mode == 'app':
        raise ValidationError({'error': 'already_answered'})

    natural = None
    rolls = []
    rigged = False
    if mode == 'app':
        natural, rolls, rigged = _roll_d20(request.user if not dm else membership.user, cr)
        total = natural + (modifier or 0)
    else:
        natural = _int_or_none(body.get('natural'), 'natural')
        raw_total = _int_or_none(body.get('total'), 'total')
        if natural is not None:
            if not (1 <= natural <= 20):
                raise ValidationError({'error': 'natural_out_of_range'})
            total = natural + (modifier or 0)
            rolls = [{'value': natural, 'kept': True}]
        elif raw_total is not None:
            if not (-20 <= raw_total <= 99):
                raise ValidationError({'error': 'total_out_of_range'})
            total = raw_total
            modifier = None
        else:
            raise ValidationError({'error': 'missing_value'})

    fields = dict(character_id=membership.character_id, mode=mode, natural=natural, rolls=rolls,
                  modifier=modifier, total=total, rigged=rigged)
    try:
        with transaction.atomic():
            resp, _ = CheckResponse.objects.update_or_create(
                check_request=cr, user_id=target_user_id, defaults=fields)
    except IntegrityError:  # corrida entre dois envios simultâneos
        raise ValidationError({'error': 'already_answered'})

    cr = CheckRequest.objects.select_related('campaign').prefetch_related('responses').get(pk=cr.pk)
    payload = serialize_for_dm(cr) if dm else serialize_for_player(cr, request.user)
    return Response({'check': payload, 'response': _serialize_response(resp, for_dm=dm)})
