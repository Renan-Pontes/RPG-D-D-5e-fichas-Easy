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
from .diary import log_combat_start, log_combat_end, log_roll_request
from .image_data import validate_data_url

# Fundo do mapa de combate: o canvas comprime para ≤1600 px em JPEG 0,82.
MAX_MAP_IMAGE_CHARS = 2_000_000


# ============================================================
# Helpers
# ============================================================
def _new_id():
    return secrets.token_hex(4)


MAX_MONSTER_ACTIONS = 80


def _uses_def(d):
    """{'uses': 3, 'lairUses': 4} saneado (1–10)."""
    def clamp(v):
        try:
            return max(1, min(10, int(v)))
        except (TypeError, ValueError):
            return None
    out = {'uses': clamp(d.get('uses')) or 3}
    lair = clamp(d.get('lairUses'))
    if lair:
        out['lairUses'] = lair
    return out


def _action_name(action):
    n = action.get('name')
    if isinstance(n, dict):
        return n.get('pt') or n.get('en') or '?'
    return n or '?'


def _check_and_consume(combatants, att, idx, force=False):
    """Valida recarga/usos/ações lendárias do atacante e marca o uso.
    Retorna (combatants, atacante atualizado). force=True ignora a validação
    (o mestre manda), mas ainda registra o gasto."""
    ok, reason = engine.action_availability(att, idx)
    if not ok and not force:
        raise ValidationError({'error': reason})
    updated = engine.consume_action(att, idx)
    return engine.replace_combatant(combatants, updated), updated


def _sync_changed(combatants, ids):
    for cid in ids:
        cur = engine.find_combatant(combatants, cid)
        if cur and cur.get('type') == 'pc' and cur.get('character_id'):
            _sync_pc_to_character(cur)


def _get_combat(campaign, create=True):
    """Instância de combate da campanha. create=False devolve None se não houver
    (GET de polling não escreve no banco)."""
    if not create:
        return CombatInstance.objects.filter(campaign=campaign).first()
    c, _ = CombatInstance.objects.get_or_create(campaign=campaign)
    return c


# Campos do log que jogador/telão podem ver (sem CA, totais nem dano de monstro).
PUBLIC_LOG_KEYS = ('type', 'attacker', 'target', 'action_name', 'attack_name', 'hit', 'crit',
                   'round', 'whose', 'condition', 'name', 'ts', 'downed')
EMPTY_COMBAT = {'active': False, 'round': 1, 'turnIndex': 0, 'combatants': [], 'map': {},
                'log': [], 'updatedAt': None}


def health_band(current, maximum, defeated=False):
    """Faixa de saúde pública: unhurt (ileso) · hurt (ferido) · bloodied (sangrando) · down (caído)."""
    try:
        current = float(current)
        maximum = float(maximum)
    except (TypeError, ValueError):
        return 'down' if defeated else 'unhurt'
    if defeated or current <= 0:
        return 'down'
    if maximum <= 0 or current >= maximum:
        return 'unhurt'
    return 'bloodied' if current <= maximum / 2 else 'hurt'


def public_combatant(cb):
    """Combatente visto por jogador/telão. Monstro: nome, condições e faixa de
    saúde (nada de PV, CA, ações ou atributos). PC: PV e CA (a mesa já vê na ficha)."""
    stats = cb.get('stats') or {}
    base = {
        'id': cb.get('id'), 'type': cb.get('type'), 'name': cb.get('name'),
        'initiative': cb.get('initiative'), 'position': cb.get('position'),
        'sprite': cb.get('sprite'), 'token_scale': cb.get('token_scale', 1),
        'conditions': cb.get('conditions') or [], 'defeated': bool(cb.get('defeated')),
        'health': health_band(cb.get('current_hp'), stats.get('max_hp'), cb.get('defeated')),
    }
    if cb.get('type') == 'pc':
        base.update({
            'character_id': cb.get('character_id'),
            'current_hp': cb.get('current_hp'), 'temp_hp': cb.get('temp_hp', 0),
            'death_saves': cb.get('death_saves'), 'wild_shape': bool(cb.get('wild_shape')),
            'stats': {'ac': stats.get('ac'), 'max_hp': stats.get('max_hp'), 'speed': stats.get('speed')},
        })
    return base


def _serialize_combat(c, *, for_dm=False):
    """Combat instance → dict. Jogador e telão recebem a versão filtrada."""
    if c is None:
        return {**EMPTY_COMBAT, 'combatants': [], 'map': {}, 'log': []}
    log = c.action_log[-30:] if c.action_log else []   # últimas 30 entradas
    combatants = c.combatants or []
    if not for_dm:
        combatants = [public_combatant(x) for x in combatants if isinstance(x, dict)]
        log = [{k: v for k, v in e.items() if k in PUBLIC_LOG_KEYS} for e in log if isinstance(e, dict)]
    return {
        'active': c.active,
        'round': c.round_number,
        'turnIndex': c.turn_index,
        'combatants': combatants,
        'map': c.map_data or {},
        'log': log,
        'updatedAt': c.updated_at.isoformat() if c.updated_at else None,
    }


def _serialize_combat_public(c):
    """Vista do telão: igual à do jogador (monstros só com nome/condições/faixa de saúde)."""
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


def _int(value, default=0):
    """int tolerante para campos numéricos do corpo; inválido → 400."""
    if value is None or value == '':
        return default
    if isinstance(value, bool):
        raise ValidationError({'error': 'invalid_number'})
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError({'error': 'invalid_number'})


def _went_down(before, after):
    """Caiu agora: PV foi de >0 para 0 nesta ação."""
    try:
        return (before.get('current_hp') or 0) > 0 and (after.get('current_hp') or 0) <= 0
    except (TypeError, AttributeError):
        return False


def _typed_d20(value):
    """d20 natural digitado pelo mestre (dado físico). None se ausente."""
    if value is None or value == '':
        return None
    v = _int(value)
    if not 1 <= v <= 20:
        raise ValidationError({'error': 'invalid_attackRoll'})
    return v


def _typed_damage(value, action):
    """Dano digitado: int (tipo da ação) ou [{amount, type}]. None se ausente."""
    if value is None or value == '':
        return None
    default_type = action.get('damageType') or 'bludgeoning'
    if isinstance(value, list):
        if not value or len(value) > 6:
            raise ValidationError({'error': 'invalid_damage'})
        parts = []
        for p in value:
            if not isinstance(p, dict):
                raise ValidationError({'error': 'invalid_damage'})
            amount = _int(p.get('amount'))
            if not 0 <= amount <= 9999:
                raise ValidationError({'error': 'invalid_damage'})
            parts.append({'amount': amount, 'type': str(p.get('type') or default_type)[:30]})
        return parts
    amount = _int(value)
    if not 0 <= amount <= 9999:
        raise ValidationError({'error': 'invalid_damage'})
    return [{'amount': amount, 'type': default_type}]


def _dice_label(expr, crit):
    """'1d6+2' → '2d6+2' no crítico (só para mostrar)."""
    count, sides, mod = engine.parse_dice(expr)
    if not count:
        return str(expr or '')
    n = count * 2 if crit else count
    return f'{n}d{sides}' + (f'{mod:+d}' if mod else '')


def _roll_parts(action, crit):
    """Rola o dano da ação (principal + adicionais) sem aplicar."""
    out = []
    dmg_type = action.get('damageType') or 'bludgeoning'
    main = action.get('damage')
    if main and str(main) != '0':
        r = engine.roll_dice(main, double_dice=crit)
        out.append({'dice': _dice_label(main, crit), 'rolled': r['total'], 'rolls': r['rolls'], 'type': dmg_type})
    for extra in action.get('extraDamage') or []:
        if isinstance(extra, dict) and extra.get('damage'):
            r = engine.roll_dice(extra['damage'], double_dice=crit)
            out.append({'dice': _dice_label(extra['damage'], crit), 'rolled': r['total'], 'rolls': r['rolls'],
                        'type': extra.get('damageType') or dmg_type})
    return out


def _manual_attack_result(att, tgt, action, typed_roll, typed_parts, body):
    """Resultado de ataque com valores do mestre (no formato de engine.resolve_attack).
    `hit`/`crit` no corpo, quando booleanos, mandam (autoridade do mestre)."""
    atk_bonus = _int(action.get('atk'), 0)
    target_ac = (tgt.get('stats') or {}).get('ac', 10)
    if typed_roll is None:
        d20 = engine.roll_d20(advantage=bool(body.get('advantage')), disadvantage=bool(body.get('disadvantage')))
    else:
        d20 = {'value': typed_roll, 'rolls': [typed_roll], 'manual': True}
    nat = d20['value']
    total = nat + atk_bonus
    crit = body['crit'] if isinstance(body.get('crit'), bool) else nat == 20
    hit = body['hit'] if isinstance(body.get('hit'), bool) else (crit or (nat != 1 and total >= target_ac))
    result = {'hit': hit, 'crit': crit, 'natural_one': nat == 1, 'attack_roll': d20,
              'attack_total': total, 'target_ac': target_ac, 'damage': None, 'manual': True}
    if hit:
        if typed_parts is not None:
            first, rest = typed_parts[0], typed_parts[1:]
            result['damage'] = {'total': first['amount'], 'rolls': [], 'mod': 0, 'type': first['type'],
                                'crit': crit, 'manual': True}
            if rest:
                result['extra_damage'] = [{'total': p['amount'], 'rolls': [], 'mod': 0, 'type': p['type'],
                                           'crit': crit, 'manual': True} for p in rest]
        else:
            rolled = _roll_parts(action, crit)
            if rolled:
                result['damage'] = {'total': rolled[0]['rolled'], 'rolls': rolled[0]['rolls'],
                                    'type': rolled[0]['type'], 'crit': crit}
                if rolled[1:]:
                    result['extra_damage'] = [{'total': p['rolled'], 'rolls': p['rolls'], 'type': p['type'],
                                               'crit': crit} for p in rolled[1:]]
    who = f"{att.get('name', '?')} → {tgt.get('name', '?')}"
    dmg = sum(p['amount'] for p in engine.attack_damage_parts(result))
    result['log'] = (f"{who}: {'CRÍTICO! ' if crit else ''}acerto ({nat}+{atk_bonus}={total} vs CA {target_ac}) — {dmg}"
                     if hit else f"{who}: errou ({nat}+{atk_bonus}={total} vs CA {target_ac})")
    return result


def _peek_rig(campaign, user_id, dice_type):
    """Próximo valor preparado (Ferramentas avançadas) SEM consumir. Int ou None."""
    rigs = DiceRig.objects.filter(
        campaign=campaign, target_user_id=user_id, dice_type__in=[dice_type, 'any']
    ).order_by('created_at')
    for rig in rigs:
        for v in rig.values or []:
            if not v.get('consumed'):
                try:
                    return int(v.get('value'))
                except (TypeError, ValueError):
                    return None
    return None


# ============================================================
# Combat: read / start / end / configure
# ============================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def combat_get(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    c = _get_combat(campaign, create=False)   # GET de polling não cria linha
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
    log_combat_start(campaign, c.combatants, request.user)
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
    log_combat_end(campaign, c.round_number, c.combatants, request.user, action_log=c.action_log)
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
        combatant['temp_hp'] = d.get('tempHp', 0)
        combatant['death_saves'] = d.get('deathSaves') or {'success': 0, 'fail': 0}

        if ws.get('active'):
            # Druida transformado entra no combate como a fera
            beast_stats = ws.get('beastStats') or {}
            combatant['name'] = f"{char.name} ({ws.get('beastName')})"
            current_rules = d.get('rulesVersion') == '2024'
            combatant['current_hp'] = d.get('currentHp', 1) if current_rules else ws.get('beastCurrentHp', 1)
            combatant['wild_shape'] = True
            combatant['stats'] = {
                'ac': ws.get('beastAc', 10),
                'max_hp': d.get('maxHp', 1) if current_rules else ws.get('beastMaxHp', 1),
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
        if isinstance(combatant['name'], dict):
            combatant['name'] = combatant['name'].get('pt') or combatant['name'].get('en') or 'Monstro'
        combatant['name'] = str(combatant['name'])[:80]
        combatant['monster_id'] = m.get('id')
        combatant['current_hp'] = m.get('hp') or 1
        actions = [a for a in (m.get('actions') or []) if isinstance(a, dict)][:MAX_MONSTER_ACTIONS]
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
            'actions': actions,
        }
        if m.get('cr') is not None:
            combatant['stats']['cr'] = str(m.get('cr'))[:8]
        if isinstance(m.get('xp'), int):
            combatant['stats']['xp'] = m['xp']
        leg = m.get('legendary')
        if isinstance(leg, dict) and any(a.get('kind') == 'legendary' for a in actions):
            combatant['stats']['legendary'] = _uses_def(leg)
        lr = m.get('legendaryResistance')
        if isinstance(lr, dict):
            combatant['stats']['legendary_resistance'] = _uses_def(lr)
        combatant = engine.init_resources(combatant)
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
    if _went_down(target, updated):
        # PV zerado à mão também conta como queda no resumo do combate.
        _append_log(c, {'type': 'hp_set', 'target': target.get('name'), 'downed': target.get('name')})
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
        # body: {attackerId, targetId, actionIndex, advantage?, disadvantage?, force?,
        #        attackRoll?, damage?, hit?, crit?, consumeRig?}
        # Com attackRoll/damage o servidor aplica EXATAMENTE os valores enviados
        # (dado físico digitado ou valores da prévia); sem eles, rola como antes.
        att = engine.find_combatant(combatants, request.data.get('attackerId'))
        tgt = engine.find_combatant(combatants, request.data.get('targetId'))
        if not att or not tgt:
            raise NotFound('combatant_not_found')
        idx = _int(request.data.get('actionIndex'), 0)
        actions = (att.get('stats') or {}).get('actions') or []
        if idx < 0 or idx >= len(actions):
            raise ValidationError({'error': 'invalid_action_index'})
        action_data = actions[idx]
        combatants, att = _check_and_consume(combatants, att, idx, force=bool(request.data.get('force')))
        tgt = engine.find_combatant(combatants, tgt.get('id'))
        typed_roll = _typed_d20(request.data.get('attackRoll'))
        typed_parts = _typed_damage(request.data.get('damage'), action_data)
        if typed_roll is not None or typed_parts is not None:
            if request.data.get('consumeRig'):
                _maybe_consume_rig(campaign, request.user.id, 'd20')
            result = _manual_attack_result(att, tgt, action_data, typed_roll, typed_parts, request.data)
        else:
            forced_d20 = _maybe_consume_rig(campaign, request.user.id, 'd20')
            result = engine.resolve_attack(
                att, tgt, action_data,
                advantage=bool(request.data.get('advantage')),
                disadvantage=bool(request.data.get('disadvantage')),
                forced_d20=forced_d20,
            )
        # Aplica dano se acertou (parcela principal + dano adicional de outro tipo)
        parts = engine.attack_damage_parts(result)
        downed = False
        if parts:
            applied = engine.apply_damage_parts(tgt, parts)
            combatants = engine.replace_combatant(combatants, applied['combatant'])
            downed = _went_down(tgt, applied['combatant'])
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
            'action_name': _action_name(action_data),
            'hit': result['hit'], 'crit': result['crit'],
            'total': result['attack_total'], 'ac': result['target_ac'],
            'damage': result.get('damage'),
            'extra_damage': result.get('extra_damage'),
            # Dano sofrido (após resistências) — usado pelos avisos de concentração.
            'damage_taken': (result.get('damage_applied') or {}).get('damage_taken', 0),
        })
        if result.get('manual'):
            log_entry['manual'] = True
        if downed:
            log_entry['downed'] = tgt.get('name')
        response_payload['result'] = result

    elif action_type == 'damage':
        # body: {targetId, amount, damageType}
        tgt = engine.find_combatant(combatants, request.data.get('targetId'))
        if not tgt:
            raise NotFound('combatant_not_found')
        applied = engine.apply_damage(tgt, _int(request.data.get('amount'), 0),
                                      request.data.get('damageType') or 'bludgeoning')
        combatants = engine.replace_combatant(combatants, applied['combatant'])
        if tgt.get('type') == 'pc' and tgt.get('character_id'):
            _sync_pc_to_character(applied['combatant'])
        log_entry.update({'target': tgt.get('name'), 'amount': applied['damage_taken'], 'note': applied['note']})
        if _went_down(tgt, applied['combatant']):
            log_entry['downed'] = tgt.get('name')
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
        action_data = actions[idx] if 0 <= idx < len(actions) else None
        if not action_data or not action_data.get('save'):
            raise ValidationError({'error': 'action_has_no_save'})
        if not isinstance(target_ids, list) or not target_ids:
            raise ValidationError({'error': 'missing_targets'})
        combatants, att = _check_and_consume(combatants, att, idx, force=bool(request.data.get('force')))
        targets = [t for t in combatants if t.get('id') in target_ids]
        result = engine.resolve_save_effect(action_data, targets)
        # Aplica dano (por tipo) e condições em quem falhou
        before = {x.get('id'): x for x in combatants}
        combatants, changed = engine.apply_save_results(combatants, result)
        _sync_changed(combatants, changed)
        downs = [x.get('name') for x in combatants
                 if x.get('id') in changed and _went_down(before.get(x.get('id')) or {}, x)]
        if downs:
            log_entry['downed_list'] = downs
        log_entry.update({'attacker': att.get('name'), 'action_name': _action_name(action_data),
                          'dc': result['dc'], 'ability': result['ability'],
                          'per_target': result['per_target']})
        response_payload['result'] = result

    elif action_type == 'use_action':
        # Gasta a ação sem resolver (ações especiais, lendárias "faz um ataque", Multiataque…)
        # body: {attackerId, actionIndex, force?}
        att = engine.find_combatant(combatants, request.data.get('attackerId'))
        if not att:
            raise NotFound('combatant_not_found')
        idx = int(request.data.get('actionIndex') or 0)
        actions = (att.get('stats') or {}).get('actions') or []
        if idx < 0 or idx >= len(actions):
            raise ValidationError({'error': 'invalid_action_index'})
        combatants, att = _check_and_consume(combatants, att, idx, force=bool(request.data.get('force')))
        log_entry.update({'attacker': att.get('name'), 'action_name': _action_name(actions[idx]),
                          'kind': actions[idx].get('kind') or 'action'})
        response_payload['result'] = {
            'action_state': att.get('action_state'), 'legendary': att.get('legendary'),
        }

    elif action_type == 'set_resources':
        # Ajuste manual do mestre: recarga, usos, ações/resistências lendárias, covil.
        tgt = engine.find_combatant(combatants, request.data.get('targetId'))
        if not tgt:
            raise NotFound('combatant_not_found')
        patch = {k: request.data.get(k) for k in (
            'actionIndex', 'charged', 'usesLeft', 'legendaryRemaining', 'inLair',
            'legendaryResistanceRemaining', 'restoreAll') if k in request.data}
        try:
            updated = engine.set_resources(tgt, patch)
        except (TypeError, ValueError):
            raise ValidationError({'error': 'invalid_resources'})
        combatants = engine.replace_combatant(combatants, updated)
        log_entry.update({'target': tgt.get('name'), 'patch': patch})
        response_payload['result'] = {
            'action_state': updated.get('action_state'), 'legendary': updated.get('legendary'),
            'legendary_resistance': updated.get('legendary_resistance'), 'in_lair': updated.get('in_lair'),
        }

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def combat_attack_preview(request, id_or_slug):
    """Prévia de ataque (contrato C2 · AttackPreview): rola e calcula, mas NÃO
    aplica nada — nem PV, nem gasto de recarga/usos, nem dado preparado.
    O mestre confirma com POST /action {action:'attack', attackRoll, damage}.

    body: {attackerId, targetId, actionIndex, advantage?, disadvantage?, attackRoll?}
    resposta: {attackRoll, total, targetAC, hit, crit, damage: [{dice, rolled, type, rolls}],
               damageTotal, effectiveDamage, newHp, note, rolls, attackBonus, actionName,
               available, unavailableReason, rigged}
    `damage` vem rolado mesmo no erro (para o mestre "Ajustar" sem nova chamada);
    quem decide se aplica é `hit`.
    """
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    c = _get_combat(campaign, create=False)
    combatants = list((c.combatants if c else None) or [])
    att = engine.find_combatant(combatants, request.data.get('attackerId'))
    tgt = engine.find_combatant(combatants, request.data.get('targetId'))
    if not att or not tgt:
        raise NotFound('combatant_not_found')
    idx = _int(request.data.get('actionIndex'), 0)
    actions = (att.get('stats') or {}).get('actions') or []
    if idx < 0 or idx >= len(actions):
        raise ValidationError({'error': 'invalid_action_index'})
    action = actions[idx]
    available, reason = engine.action_availability(att, idx)

    typed = _typed_d20(request.data.get('attackRoll'))
    rigged = False
    if typed is not None:
        d20 = {'value': typed, 'rolls': [typed]}
    else:
        peek = _peek_rig(campaign, request.user.id, 'd20')
        rigged = peek is not None
        d20 = engine.roll_d20(advantage=bool(request.data.get('advantage')),
                              disadvantage=bool(request.data.get('disadvantage')),
                              forced=peek)
    nat = d20['value']
    atk_bonus = _int(action.get('atk'), 0)
    total = nat + atk_bonus
    target_ac = (tgt.get('stats') or {}).get('ac', 10)
    crit = nat == 20
    hit = crit or (nat != 1 and total >= target_ac)
    parts = _roll_parts(action, crit)
    damage_total = sum(p['rolled'] for p in parts)
    effective, new_hp, note = 0, tgt.get('current_hp'), None
    if hit and parts:
        sim = engine.apply_damage_parts(dict(tgt), [{'amount': p['rolled'], 'type': p['type']} for p in parts])
        effective, new_hp, note = sim['damage_taken'], sim['combatant'].get('current_hp'), sim['note']
    return Response({
        'attackerId': att.get('id'), 'targetId': tgt.get('id'), 'actionIndex': idx,
        'actionName': _action_name(action), 'attackBonus': atk_bonus,
        'attackRoll': nat, 'rolls': d20.get('rolls') or [nat], 'total': total,
        'targetAC': target_ac, 'hit': hit, 'crit': crit, 'naturalOne': nat == 1,
        'damage': parts, 'damageTotal': damage_total,
        'effectiveDamage': effective, 'newHp': new_hp, 'note': note,
        'available': available, 'unavailableReason': None if available else reason,
        'rigged': rigged,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def combat_player_attack(request, id_or_slug):
    """PC ataca alvo durante seu turno em combate.

    Body: {
      attackerCombatantId: str,  # combatente do próprio user (ou DM force)
      targetId: str,
      attackKind: 'weapon' | 'cantrip' | 'spell',
      attackName: str,           # ex.: 'Espada Longa', 'Sacred Flame'
      attackBonus?: int,         # bônus de ataque (frontend já computou)
      damage?: str,              # ex.: '1d8+3' (frontend monta)
      damageType?: str,
      save?: { ability: str, dc: int, halfOnSave: bool },  # se save-based
      advantage?: bool,
      disadvantage?: bool,
      withFallout?: bool,        # default True para ataques vs CA
    }

    Permissão: dono do PC OU DM. Retorna o mesmo formato de combat_action.
    """
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    c = _get_combat(campaign)
    combatants = list(c.combatants or [])

    att = engine.find_combatant(combatants, request.data.get('attackerCombatantId'))
    tgt = engine.find_combatant(combatants, request.data.get('targetId'))
    if not att or not tgt:
        raise NotFound('combatant_not_found')

    # Dono do PC ou DM pode disparar
    if not is_dm(request.user, campaign):
        if att.get('type') != 'pc' or att.get('character_id') is None:
            raise PermissionDenied('not_your_combatant')
        try:
            char = Character.objects.get(pk=att['character_id'])
        except Character.DoesNotExist:
            raise NotFound('character_not_found')
        if char.owner_id != request.user.id:
            raise PermissionDenied('not_your_combatant')

    attack_name = (request.data.get('attackName') or 'Ataque')[:80]
    attack_kind = request.data.get('attackKind') or 'weapon'
    save_spec = request.data.get('save')

    # Monta action dict com mesma estrutura usada por resolve_attack/resolve_save_effect
    action_data = {
        'name': attack_name,
        'type': attack_kind,
        'damage': str(request.data.get('damage') or '0'),
        'damageType': (request.data.get('damageType') or 'force')[:20],
    }
    if isinstance(save_spec, dict) and save_spec.get('ability') and save_spec.get('dc') is not None:
        action_data['save'] = {
            'ability': str(save_spec.get('ability')).lower(),
            'dc': int(save_spec.get('dc')),
            'halfOnSave': bool(save_spec.get('halfOnSave', True)),
        }
    else:
        # Ataque vs CA — precisa do bônus
        action_data['atk'] = int(request.data.get('attackBonus') or 0)

    forced_d20 = _maybe_consume_rig(campaign, request.user.id, 'd20')
    downs = []
    advantage = bool(request.data.get('advantage'))
    disadvantage = bool(request.data.get('disadvantage'))

    if 'save' in action_data:
        # Magia com save: alvo único faz save, dano metade no sucesso
        save_res = engine.resolve_save_effect(action_data, [tgt])
        combatants, changed = engine.apply_save_results(combatants, save_res)
        after = engine.find_combatant(combatants, tgt.get('id')) or {}
        if _went_down(tgt, after):
            downs.append(tgt.get('name'))
        _sync_changed(combatants, changed)
        result = {
            'kind': 'save',
            'attack_name': attack_name,
            'attacker_name': att.get('name'),
            'target_name': tgt.get('name'),
            'save': save_res,
        }
    else:
        # Ataque vs CA com fallout
        with_fallout = request.data.get('withFallout', True)
        if with_fallout:
            primary = engine.resolve_attack_with_fallout(
                att, tgt, action_data, combatants,
                advantage=advantage, disadvantage=disadvantage,
                forced_d20=forced_d20,
            )
        else:
            primary = engine.resolve_attack(
                att, tgt, action_data,
                advantage=advantage, disadvantage=disadvantage,
                forced_d20=forced_d20,
            )

        # Aplica dano do primário se acertou
        if primary['hit'] and primary['damage']:
            applied = engine.apply_damage(tgt, primary['damage']['total'], primary['damage']['type'])
            combatants = engine.replace_combatant(combatants, applied['combatant'])
            if _went_down(tgt, applied['combatant']):
                downs.append(tgt.get('name'))
            if tgt.get('type') == 'pc' and tgt.get('character_id'):
                _sync_pc_to_character(applied['combatant'])
            primary['damage_applied'] = {
                'damage_taken': applied['damage_taken'],
                'new_hp': applied['combatant'].get('current_hp'),
                'defeated': applied['combatant'].get('defeated', False),
            }

        # Aplica dano do desvio se houver e acertou o novo alvo
        if primary.get('fallout'):
            second = primary['fallout']['second_attack']
            redirected_id = primary['fallout']['redirected_to_id']
            redirected = engine.find_combatant(combatants, redirected_id)
            if second['hit'] and second['damage'] and redirected:
                applied = engine.apply_damage(redirected, second['damage']['total'], second['damage']['type'])
                combatants = engine.replace_combatant(combatants, applied['combatant'])
                if _went_down(redirected, applied['combatant']):
                    downs.append(redirected.get('name'))
                if redirected.get('type') == 'pc' and redirected.get('character_id'):
                    _sync_pc_to_character(applied['combatant'])
                second['damage_applied'] = {
                    'damage_taken': applied['damage_taken'],
                    'new_hp': applied['combatant'].get('current_hp'),
                    'defeated': applied['combatant'].get('defeated', False),
                }

        result = {
            'kind': 'attack',
            'attack_name': attack_name,
            'attacker_name': att.get('name'),
            'target_name': tgt.get('name'),
            **primary,
        }

    c.combatants = combatants
    log_entry = {
        'type': 'player_attack',
        'attacker': att.get('name'),
        'target': tgt.get('name'),
        'attack_name': attack_name,
        'kind': attack_kind,
        'hit': result.get('hit', None),
    }
    if result.get('kind') == 'save':
        log_entry['damage_taken'] = sum(p.get('damage_taken') or 0 for p in result['save'].get('per_target') or [])
    else:
        log_entry['damage_taken'] = (result.get('damage_applied') or {}).get('damage_taken', 0)
    if isinstance(result.get('fallout'), dict):
        log_entry['fallout_to'] = result['fallout'].get('redirected_to_name')
        log_entry['fallout_damage_taken'] = (result['fallout']['second_attack'].get('damage_applied') or {}).get('damage_taken', 0)
    if downs:
        log_entry['downed_list'] = downs
    _append_log(c, log_entry)
    c.save()
    return Response({'result': result, 'combat': _serialize_combat(c, for_dm=is_dm(request.user, campaign))})


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
    if data.get('rulesVersion') == '2024':
        data['currentHp'] = combatant.get('current_hp', 0)
        if data['currentHp'] <= 0 and (data.get('wildShape') or {}).get('active'):
            data, _ = wse.end_transform(data, excess_damage=0)
    elif combatant.get('wild_shape') and (data.get('wildShape') or {}).get('active'):
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
    c.turn_index = next_idx
    c.round_number = next_round
    _append_log(c, {'type': 'next_turn', 'round': next_round, 'index': next_idx, 'whose': combatants[next_idx].get('name')})

    # Início do turno do monstro: rola recarga (d6) e restaura ações lendárias.
    nxt = combatants[next_idx]
    if nxt.get('type') == 'monster':
        started = engine.start_turn(nxt)
        combatants[next_idx] = started['combatant']
        if started['recharge_rolls']:
            _append_log(c, {'type': 'recharge', 'target': nxt.get('name'), 'rolls': started['recharge_rolls']})
    c.combatants = combatants
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
    payload = request.data if isinstance(request.data, dict) else {}
    # background_image: data URL de imagem (jpeg/png/webp/gif) ou null/'' para tirar.
    if 'background_image' in payload:
        bg = payload.get('background_image')
        if bg in (None, ''):
            map_data['background_image'] = None
        else:
            map_data['background_image'] = validate_data_url(bg, max_chars=MAX_MAP_IMAGE_CHARS, allow_gif=True)
    if 'grid_size_px' in payload:
        map_data['grid_size_px'] = max(10, min(400, _int(payload.get('grid_size_px'), 50)))
    if 'grid_visible' in payload:
        map_data['grid_visible'] = bool(payload.get('grid_visible'))
    for k in ('width_px', 'height_px'):
        if k in payload:
            v = payload.get(k)
            map_data[k] = None if v in (None, '') else max(1, min(10000, _int(v, 1)))
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

    sides = {'d4':4,'d6':6,'d8':8,'d10':10,'d12':12,'d20':20,'d100':100}.get(rr.dice_type, 20)

    # DM pode forçar valor exibido — não consome rig, não rola dados; injeta resultado.
    # Útil pra ajustar narrativa em rolagens públicas (M1).
    override_raw = request.data.get('overrideValue', None)
    override_value = None
    if override_raw is not None and override_raw != '':
        try:
            override_value = int(override_raw)
        except (TypeError, ValueError):
            raise ValidationError({'error': 'invalid_override_value'})
        if override_value < 1 or override_value > sides:
            raise ValidationError({'error': 'override_out_of_range'})

    rolls = []
    rigged = False
    is_crit = False
    is_critfail = False

    if override_value is not None:
        # Pega o valor digitado como a rolagem; marca como overridden.
        rolls.append({'value': override_value, 'kept': True, 'rigged': True, 'override': True})
        rigged = True
        if rr.dice_type == 'd20' and override_value == 20: is_crit = True
        if rr.dice_type == 'd20' and override_value == 1: is_critfail = True
    else:
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

    # Permite forçar crit/falha independente do valor (raro, mas útil dramaticamente).
    if 'overrideCritical' in request.data:
        is_crit = bool(request.data.get('overrideCritical'))
    if 'overrideCriticalFail' in request.data:
        is_critfail = bool(request.data.get('overrideCriticalFail'))

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
    log_roll_request(rr)

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
