"""
Views REST de combate e RollRequest.

POST /api/combat/campaign/<id>/start   (DM)
GET  /api/combat/campaign/<id>          (member)
POST /api/combat/campaign/<id>/end      (DM)
POST /api/combat/campaign/<id>/combatants    (DM)  body: {snapshot, type}
DEL  /api/combat/campaign/<id>/combatants/<cid>  (DM)
PUT  /api/combat/campaign/<id>/combatants/<cid>  (DM)  body: campos a atualizar
POST /api/combat/campaign/<id>/action   (DM)  body: ataque/save/condição/dano/cura/death_save
POST /api/combat/campaign/<id>/next-turn (DM)
POST /api/combat/campaign/<id>/map      (DM)  body: {background_image, grid_size_px, grid_visible}

POST /api/rolls/campaign/<id>           (member)
GET  /api/rolls/campaign/<id>/pending   (member)
GET  /api/rolls/campaign/<id>/recent    (public via screen)
POST /api/rolls/<id>/resolve            (DM)  body: {visibility: 'public'|'private'}
POST /api/rolls/<id>/cancel             (DM ou owner)
"""
import secrets
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import Campaign, CombatInstance, RollRequest, Character, DiceRig, DiceLog, Membership
from .permissions import get_campaign_or_404, require_dm, require_member, is_dm
from . import combat as engine


# ============================================================
# Helpers
# ============================================================
def _new_id():
    return secrets.token_hex(4)


def _get_combat(campaign, create=False):
    c, created = CombatInstance.objects.get_or_create(campaign=campaign)
    return c


def _serialize_combat(c, *, for_dm=False):
    """Combat instance → dict pra resposta."""
    data = {
        'active': c.active,
        'round': c.round_number,
        'turnIndex': c.turn_index,
        'combatants': c.combatants,
        'map': c.map_data,
        'log': c.action_log[-30:],          # últimas 30 entradas
        'updatedAt': c.updated_at.isoformat() if c.updated_at else None,
    }
    return data


def _serialize_combat_public(c):
    """Vista pra rota pública do telão: esconde info sensível (HP de monstros não-derrotados pode ser opcional)."""
    return _serialize_combat(c, for_dm=False)


def _serialize_roll(rr):
    return {
        'id': rr.id,
        'campaignId': rr.campaign_id,
        'requestedBy': {'id': rr.requested_by_id, 'displayName': getattr(getattr(rr.requested_by, 'profile', None), 'display_name', None) or rr.requested_by.username},
        'characterId': rr.character_id,
        'label': rr.label,
        'diceType': rr.dice_type,
        'count': rr.count,
        'modifier': rr.modifier,
        'hasAdvantage': rr.has_advantage,
        'hasDisadvantage': rr.has_disadvantage,
        'status': rr.status,
        'rolls': rr.rolls,
        'total': rr.total,
        'isCritical': rr.is_critical,
        'isCriticalFail': rr.is_critical_fail,
        'rigged': rr.rigged,
        'note': rr.note,
        'createdAt': rr.created_at.isoformat() if rr.created_at else None,
        'resolvedAt': rr.resolved_at.isoformat() if rr.resolved_at else None,
    }


def _append_log(combat, entry):
    log = list(combat.action_log or [])
    log.append({**entry, 'ts': timezone.now().isoformat()})
    combat.action_log = log[-100:]


# ============================================================
# Combat: read / start / end / configure
# ============================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def combat_get(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    c = _get_combat(campaign)
    return Response({'combat': _serialize_combat(c, for_dm=is_dm(request.user, campaign))})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def combat_start(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    c = _get_combat(campaign)
    c.active = True
    c.round_number = 1
    c.turn_index = 0
    _append_log(c, {'type': 'start'})
    c.save()
    return Response({'combat': _serialize_combat(c, for_dm=True)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def combat_end(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    c = _get_combat(campaign)
    c.active = False
    _append_log(c, {'type': 'end'})
    c.save()
    return Response({'combat': _serialize_combat(c, for_dm=True)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def combat_reset(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    c = _get_combat(campaign)
    c.active = False
    c.combatants = []
    c.action_log = []
    c.round_number = 1
    c.turn_index = 0
    c.save()
    return Response({'combat': _serialize_combat(c, for_dm=True)})


# ============================================================
# Combat: combatants CRUD
# ============================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def combat_add_combatant(request, id_or_slug):
    """Adiciona combatente.
    body: {
      type: 'pc' | 'monster',
      characterId?: int,            # se pc (carregaremos stats)
      monster?: {...inline stats},  # se monstro (frontend manda o snapshot)
      initiative?: int,
    }
    """
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    c = _get_combat(campaign)
    t = request.data.get('type')
    initiative = int(request.data.get('initiative') or 10)
    position = request.data.get('position') or {'x': 50, 'y': 50}
    sprite = request.data.get('sprite')  # base64
    token_scale = float(request.data.get('tokenScale') or 1.0)

    combatant = {
        'id': _new_id(),
        'type': t,
        'initiative': initiative,
        'position': position,
        'sprite': sprite,
        'token_scale': token_scale,
        'conditions': [],
        'effects': [],
        'temp_hp': 0,
        'defeated': False,
    }

    if t == 'pc':
        cid = request.data.get('characterId')
        if not cid:
            raise ValidationError({'error': 'missing_characterId'})
        try:
            char = Character.objects.get(pk=cid)
        except Character.DoesNotExist:
            raise NotFound('character_not_found')
        # PC stats vêm da ficha (data JSON)
        d = char.data or {}
        ws = d.get('wildShape') or {}
        combatant['character_id'] = char.id
        combatant['death_saves'] = d.get('deathSaves') or {'success': 0, 'fail': 0}

        if ws.get('active'):
            # Druida transformado entra no combate como a fera
            beast_stats = ws.get('beastStats') or {}
            combatant['name'] = f"{char.name} ({ws.get('beastName')})"
            combatant['current_hp'] = ws.get('beastCurrentHp') or 1
            combatant['wild_shape'] = True
            combatant['stats'] = {
                'ac': ws.get('beastAc', 10),
                'max_hp': ws.get('beastMaxHp', 1),
                'speed': ws.get('beastSpeed') or 30,
                'abilities': beast_stats,
                'saves': {},
                'actions': ws.get('beastActions') or [],
            }
            # Token maior se fera Large+
            size = (ws.get('beastSize') or 'Medium')
            if size == 'Large':       combatant['token_scale'] = 2
            elif size == 'Huge':      combatant['token_scale'] = 3
            elif size == 'Gargantuan': combatant['token_scale'] = 4
            elif size in ('Tiny',):   combatant['token_scale'] = 0.5
        else:
            abilities = d.get('abilities') or {}
            dex_mod = (abilities.get('dex', 10) - 10) // 2
            ac = d.get('armorClass') or (10 + dex_mod + (2 if d.get('hasShield') else 0))
            combatant['name'] = char.name
            combatant['current_hp'] = d.get('currentHp', d.get('maxHp', 1))
            combatant['stats'] = {
                'ac': ac,
                'max_hp': d.get('maxHp', combatant['current_hp']),
                'speed': d.get('speedOverride') or 30,
                'abilities': abilities,
                'saves': {},
                'actions': [],
            }
    elif t == 'monster':
        m = request.data.get('monster') or {}
        if not m:
            raise ValidationError({'error': 'missing_monster_data'})
        combatant['name'] = m.get('name') or 'Monstro'
        combatant['monster_id'] = m.get('id')
        combatant['current_hp'] = m.get('hp') or 1
        combatant['stats'] = {
            'ac': m.get('ac', 10),
            'max_hp': m.get('hp', 1),
            'speed': (m.get('speed') or {}).get('walk') or 30,
            'abilities': m.get('abilities') or {},
            'saves': m.get('saves') or {},
            'damage_resistances': m.get('damageResistances') or [],
            'damage_immunities': m.get('damageImmunities') or [],
            'damage_vulnerabilities': m.get('damageVulnerabilities') or [],
            'condition_immunities': m.get('conditionImmunities') or [],
            'actions': m.get('actions') or [],
        }
    else:
        raise ValidationError({'error': 'invalid_type'})

    combatants = list(c.combatants or [])
    combatants.append(combatant)
    # Ordena por iniciativa desc (mantém posição do turno se possível)
    combatants.sort(key=lambda x: -int(x.get('initiative') or 0))
    c.combatants = combatants
    _append_log(c, {'type': 'add_combatant', 'name': combatant['name'], 'init': initiative})
    c.save()
    return Response({'combat': _serialize_combat(c, for_dm=True)})


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def combat_combatant(request, id_or_slug, combatant_id):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    c = _get_combat(campaign)
    target = engine.find_combatant(c.combatants or [], combatant_id)
    if not target:
        raise NotFound('combatant_not_found')

    if request.method == 'DELETE':
        c.combatants = [x for x in c.combatants if x.get('id') != combatant_id]
        _append_log(c, {'type': 'remove_combatant', 'name': target.get('name')})
        c.save()
        return Response({'combat': _serialize_combat(c, for_dm=True)})

    # PUT: aceita patch livre em campos seguros
    patch = request.data
    updated = dict(target)
    for key in ['name', 'initiative', 'position', 'sprite', 'token_scale',
                'current_hp', 'temp_hp', 'conditions', 'defeated', 'death_saves']:
        if key in patch:
            updated[key] = patch[key]
    # stats parciais
    if 'stats' in patch and isinstance(patch['stats'], dict):
        stats = dict(updated.get('stats') or {})
        stats.update(patch['stats'])
        updated['stats'] = stats
    c.combatants = engine.replace_combatant(c.combatants, updated)
    c.save()
    return Response({'combat': _serialize_combat(c, for_dm=True)})


# ============================================================
# Combat: ações
# ============================================================
def _maybe_consume_rig(campaign, user_id, dice_type):
    """Consome 1 valor da DiceRig se houver. Retorna int ou None."""
    rigs = DiceRig.objects.filter(
        campaign=campaign, target_user_id=user_id, dice_type__in=[dice_type, 'any']
    ).order_by('created_at')
    for rig in rigs:
        vals = list(rig.values or [])
        for i, v in enumerate(vals):
            if not v.get('consumed'):
                vals[i] = {**v, 'consumed': True, 'consumed_at': timezone.now().isoformat()}
                rig.values = vals
                rig.save()
                return int(v.get('value'))
    return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def combat_action(request, id_or_slug):
    """Resolve uma ação de combate.

    body comum: {action: 'attack'|'save'|'damage'|'heal'|'add_condition'|'remove_condition'|'death_save'}
    """
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    c = _get_combat(campaign)

    action_type = request.data.get('action')
    combatants = list(c.combatants or [])
    log_entry = {'type': action_type}
    response_payload = {}

    if action_type == 'attack':
        # body: {attackerId, targetId, actionIndex, advantage?, disadvantage?}
        att = engine.find_combatant(combatants, request.data.get('attackerId'))
        tgt = engine.find_combatant(combatants, request.data.get('targetId'))
        if not att or not tgt:
            raise NotFound('combatant_not_found')
        idx = int(request.data.get('actionIndex') or 0)
        actions = (att.get('stats') or {}).get('actions') or []
        if idx < 0 or idx >= len(actions):
            raise ValidationError({'error': 'invalid_action_index'})
        action_data = actions[idx]
        forced_d20 = _maybe_consume_rig(campaign, request.user.id, 'd20')
        forced_damage = None  # Damage poderia ter rig próprio também — não tratado aqui ainda
        result = engine.resolve_attack(
            att, tgt, action_data,
            advantage=bool(request.data.get('advantage')),
            disadvantage=bool(request.data.get('disadvantage')),
            forced_d20=forced_d20,
        )
        # Aplica dano se acertou
        if result['hit'] and result['damage']:
            dmg = result['damage']['total']
            applied = engine.apply_damage(tgt, dmg, result['damage']['type'])
            combatants = engine.replace_combatant(combatants, applied['combatant'])
            result['damage_applied'] = {
                'damage_taken': applied['damage_taken'],
                'note': applied['note'],
                'new_hp': applied['combatant'].get('current_hp'),
                'defeated': applied['combatant'].get('defeated', False),
            }
            # Se PC chegou a 0 e a ficha existe, atualizar Character.data
            if tgt.get('type') == 'pc' and tgt.get('character_id'):
                _sync_pc_to_character(applied['combatant'])
        log_entry.update({
            'attacker': att.get('name'), 'target': tgt.get('name'),
            'hit': result['hit'], 'crit': result['crit'],
            'total': result['attack_total'], 'ac': result['target_ac'],
            'damage': result.get('damage'),
        })
        response_payload['result'] = result

    elif action_type == 'damage':
        # body: {targetId, amount, damageType}
        tgt = engine.find_combatant(combatants, request.data.get('targetId'))
        if not tgt:
            raise NotFound('combatant_not_found')
        applied = engine.apply_damage(tgt, int(request.data.get('amount') or 0),
                                      request.data.get('damageType') or 'bludgeoning')
        combatants = engine.replace_combatant(combatants, applied['combatant'])
        if tgt.get('type') == 'pc' and tgt.get('character_id'):
            _sync_pc_to_character(applied['combatant'])
        log_entry.update({'target': tgt.get('name'), 'amount': applied['damage_taken'], 'note': applied['note']})
        response_payload['result'] = applied

    elif action_type == 'heal':
        tgt = engine.find_combatant(combatants, request.data.get('targetId'))
        if not tgt:
            raise NotFound('combatant_not_found')
        applied = engine.apply_healing(tgt, int(request.data.get('amount') or 0))
        combatants = engine.replace_combatant(combatants, applied['combatant'])
        if tgt.get('type') == 'pc' and tgt.get('character_id'):
            _sync_pc_to_character(applied['combatant'])
        log_entry.update({'target': tgt.get('name'), 'healed': applied['healed']})
        response_payload['result'] = applied

    elif action_type == 'save_aoe':
        # body: {action: 'save_aoe', actionIndex, attackerId, targetIds: [...]}
        att = engine.find_combatant(combatants, request.data.get('attackerId'))
        target_ids = request.data.get('targetIds') or []
        idx = int(request.data.get('actionIndex') or 0)
        if not att:
            raise NotFound('attacker_not_found')
        actions = (att.get('stats') or {}).get('actions') or []
        action_data = actions[idx] if idx < len(actions) else None
        if not action_data or not action_data.get('save'):
            raise ValidationError({'error': 'action_has_no_save'})
        targets = [t for t in combatants if t.get('id') in target_ids]
        result = engine.resolve_save_effect(action_data, targets)
        # Aplica dano em cada
        for entry in result['per_target']:
            tgt = next((t for t in combatants if t.get('id') == entry['target_id']), None)
            if not tgt or entry['damage_taken'] == 0:
                continue
            applied = engine.apply_damage(tgt, entry['damage_taken'], entry['damage_type'])
            combatants = engine.replace_combatant(combatants, applied['combatant'])
            if tgt.get('type') == 'pc' and tgt.get('character_id'):
                _sync_pc_to_character(applied['combatant'])
        log_entry.update({'attacker': att.get('name'), 'per_target': result['per_target']})
        response_payload['result'] = result

    elif action_type == 'add_condition':
        tgt = engine.find_combatant(combatants, request.data.get('targetId'))
        if not tgt:
            raise NotFound('combatant_not_found')
        cond = request.data.get('condition')
        rounds = request.data.get('rounds')
        applied = engine.add_condition(tgt, cond, rounds=rounds)
        combatants = engine.replace_combatant(combatants, applied['combatant'])
        log_entry.update({'target': tgt.get('name'), 'condition': cond, 'applied': applied['applied']})
        response_payload['result'] = applied

    elif action_type == 'remove_condition':
        tgt = engine.find_combatant(combatants, request.data.get('targetId'))
        if not tgt:
            raise NotFound('combatant_not_found')
        cond = request.data.get('condition')
        applied = engine.remove_condition(tgt, cond)
        combatants = engine.replace_combatant(combatants, applied['combatant'])
        log_entry.update({'target': tgt.get('name'), 'condition': cond})
        response_payload['result'] = applied

    elif action_type == 'death_save':
        tgt = engine.find_combatant(combatants, request.data.get('targetId'))
        if not tgt:
            raise NotFound('combatant_not_found')
        forced = _maybe_consume_rig(campaign, request.user.id, 'd20')
        applied = engine.death_save(tgt, forced_d20=forced)
        combatants = engine.replace_combatant(combatants, applied['combatant'])
        if tgt.get('character_id'):
            _sync_pc_to_character(applied['combatant'])
        log_entry.update({'target': tgt.get('name'), 'note': applied.get('note')})
        response_payload['result'] = applied

    else:
        raise ValidationError({'error': 'invalid_action_type'})

    c.combatants = combatants
    _append_log(c, log_entry)
    c.save()
    response_payload['combat'] = _serialize_combat(c, for_dm=True)
    return Response(response_payload)


def _sync_pc_to_character(combatant):
    """Sincroniza HP/condições/death_saves de volta na Character.data do PC.

    Se o combatant é wild_shape (druida transformado), o current_hp é o HP da fera.
    Atualiza wildShape.beastCurrentHp. Se zerado, termina a transformação (excedente
    seria 0 aqui — o combat engine não rastreia excedente; pra simplicidade,
    HP zero em wild shape = sai da forma com excess 0; dano excedente real
    aplica via /wild-shape/force-end com excessDamage).
    """
    from . import wild_shape as wse
    cid = combatant.get('character_id')
    if not cid:
        return
    try:
        char = Character.objects.get(pk=cid)
    except Character.DoesNotExist:
        return
    data = dict(char.data or {})
    if combatant.get('wild_shape') and (data.get('wildShape') or {}).get('active'):
        ws = dict(data['wildShape'])
        new_beast_hp = combatant.get('current_hp') or 0
        ws['beastCurrentHp'] = new_beast_hp
        data['wildShape'] = ws
        if new_beast_hp <= 0:
            # Fera caiu: sai da forma, druida fica com o HP pré-transform inteiro
            # (excedente real deveria vir do dano que sobrou, mas o engine de
            # combate só sabe o HP final aqui; mestre pode usar /force-end com
            # excessDamage explícito para subtrair).
            data, _ = wse.end_transform(data, excess_damage=0)
        # Não toca em currentHp principal aqui — só na fera
    else:
        data['currentHp'] = combatant.get('current_hp')
    if combatant.get('temp_hp') is not None:
        data['tempHp'] = combatant.get('temp_hp')
    data['conditions'] = combatant.get('conditions') or []
    if combatant.get('death_saves'):
        data['deathSaves'] = combatant['death_saves']
    char.data = data
    char.save()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def combat_next_turn(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    c = _get_combat(campaign)
    combatants = list(c.combatants or [])
    if not combatants:
        return Response({'combat': _serialize_combat(c, for_dm=True)})

    # Tick effects do combatente que terminou o turno (atual antes de avançar)
    cur_idx = c.turn_index
    if 0 <= cur_idx < len(combatants):
        ticked = engine.tick_effects(combatants[cur_idx])
        combatants[cur_idx] = ticked['combatant']
        if ticked['expired']:
            _append_log(c, {'type': 'effects_expired', 'target': combatants[cur_idx].get('name'), 'expired': ticked['expired']})

    next_idx = (cur_idx + 1) % len(combatants)
    next_round = c.round_number + 1 if next_idx == 0 else c.round_number
    c.combatants = combatants
    c.turn_index = next_idx
    c.round_number = next_round
    _append_log(c, {'type': 'next_turn', 'round': next_round, 'index': next_idx, 'whose': combatants[next_idx].get('name')})
    c.save()
    return Response({'combat': _serialize_combat(c, for_dm=True)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def combat_set_map(request, id_or_slug):
    """Define o mapa (background base64, grid). DM only."""
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    c = _get_combat(campaign)
    map_data = dict(c.map_data or {})
    payload = request.data
    # Aceita campos: background_image (base64 dataURL), grid_size_px, grid_visible, width_px, height_px
    for k in ['background_image', 'grid_size_px', 'grid_visible', 'width_px', 'height_px']:
        if k in payload:
            map_data[k] = payload[k]
    c.map_data = map_data
    c.save()
    return Response({'combat': _serialize_combat(c, for_dm=True)})


# ============================================================
# RollRequest
# ============================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def roll_create(request, id_or_slug):
    """Jogador (ou DM) cria pedido de rolagem. Status fica pending até o DM decidir."""
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    body = request.data
    rr = RollRequest.objects.create(
        campaign=campaign,
        requested_by=request.user,
        character_id=body.get('characterId'),
        label=(body.get('label') or '')[:120],
        dice_type=body.get('diceType') or 'd20',
        count=int(body.get('count') or 1),
        modifier=int(body.get('modifier') or 0),
        has_advantage=bool(body.get('hasAdvantage')),
        has_disadvantage=bool(body.get('hasDisadvantage')),
    )
    return Response({'roll': _serialize_roll(rr)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def roll_list_pending(request, id_or_slug):
    """DM lista todos pending. Jogador vê só os seus."""
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    qs = RollRequest.objects.filter(campaign=campaign, status='pending').select_related('requested_by', 'requested_by__profile')
    if not is_dm(request.user, campaign):
        qs = qs.filter(requested_by=request.user)
    return Response({'rolls': [_serialize_roll(r) for r in qs]})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def roll_list_recent(request, id_or_slug):
    """Lista rolagens recentes (public + as próprias do user)."""
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    qs = RollRequest.objects.filter(campaign=campaign).exclude(status='pending').select_related('requested_by', 'requested_by__profile')
    if not is_dm(request.user, campaign):
        from django.db.models import Q
        qs = qs.filter(Q(status='public') | Q(requested_by=request.user))
    return Response({'rolls': [_serialize_roll(r) for r in qs[:30]]})


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def roll_public_screen(request, token):
    """Rota pública (telão): últimas rolagens com status=public da campanha."""
    campaign = Campaign.objects.filter(screen_token=token).first()
    if not campaign:
        raise NotFound('not_found')
    qs = RollRequest.objects.filter(campaign=campaign, status='public').select_related('requested_by', 'requested_by__profile')[:5]
    return Response({'rolls': [_serialize_roll(r) for r in qs]})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def roll_resolve(request, pk):
    """DM resolve uma roll (public ou private). Backend rola, consumindo rig se houver."""
    try:
        rr = RollRequest.objects.select_related('campaign').get(pk=pk)
    except RollRequest.DoesNotExist:
        raise NotFound('not_found')
    if rr.campaign.dm_id != request.user.id:
        raise PermissionDenied('dm_only')
    if rr.status != 'pending':
        raise ValidationError({'error': 'already_resolved'})

    visibility = request.data.get('visibility', 'public')
    if visibility not in ('public', 'private'):
        raise ValidationError({'error': 'invalid_visibility'})

    sides = engine.parse_dice(rr.dice_type)[1] if rr.dice_type.startswith('d') else 20
    sides = {'d4':4,'d6':6,'d8':8,'d10':10,'d12':12,'d20':20,'d100':100}.get(rr.dice_type, 20)

    rolls = []
    rigged = False
    is_crit = False
    is_critfail = False
    for _ in range(max(1, rr.count)):
        forced = _maybe_consume_rig(rr.campaign, rr.requested_by_id, rr.dice_type)
        if forced is not None:
            rolls.append({'value': forced, 'kept': True, 'rigged': True})
            rigged = True
            if rr.dice_type == 'd20' and forced == 20: is_crit = True
            if rr.dice_type == 'd20' and forced == 1: is_critfail = True
        elif rr.dice_type == 'd20' and (rr.has_advantage or rr.has_disadvantage):
            a, b = engine.roll_die(20), engine.roll_die(20)
            keep = max(a, b) if rr.has_advantage else min(a, b)
            rolls.append({'value': a, 'kept': keep == a, 'rigged': False})
            rolls.append({'value': b, 'kept': keep == b, 'rigged': False})
            if keep == 20: is_crit = True
            if keep == 1: is_critfail = True
        else:
            v = engine.roll_die(sides)
            rolls.append({'value': v, 'kept': True, 'rigged': False})
            if rr.dice_type == 'd20' and v == 20: is_crit = True
            if rr.dice_type == 'd20' and v == 1: is_critfail = True

    kept_sum = sum(r['value'] for r in rolls if r['kept'])
    total = kept_sum + rr.modifier

    rr.status = visibility
    rr.rolls = rolls
    rr.total = total
    rr.is_critical = is_crit
    rr.is_critical_fail = is_critfail
    rr.rigged = rigged
    rr.resolved_at = timezone.now()
    rr.save()

    # Registra em DiceLog (compat com fluxo existente)
    DiceLog.objects.create(
        campaign=rr.campaign, user=rr.requested_by, dice_type=rr.dice_type,
        result=total, rigged=rigged, label=rr.label,
    )

    return Response({'roll': _serialize_roll(rr)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def roll_cancel(request, pk):
    try:
        rr = RollRequest.objects.select_related('campaign').get(pk=pk)
    except RollRequest.DoesNotExist:
        raise NotFound('not_found')
    if rr.campaign.dm_id != request.user.id and rr.requested_by_id != request.user.id:
        raise PermissionDenied('forbidden')
    if rr.status != 'pending':
        raise ValidationError({'error': 'already_resolved'})
    rr.status = 'cancelled'
    rr.resolved_at = timezone.now()
    rr.save()
    return Response({'roll': _serialize_roll(rr)})
