"""
Diário da campanha — registro automático de eventos.

Uso geral (uma linha no ponto do evento):

    from .diary import log_diary
    log_diary(campaign, 'custom', 'A ponte caiu', body='...', data={...}, user=request.user)

`log_diary` NUNCA levanta exceção: o diário é acessório e não pode quebrar o
fluxo principal (aprovar nível, dar XP, etc.). Erros vão para o logger.

Subtipos usados: note, summary (notas escritas), session, roll, levelup,
item, combat, rest, xp, custom (eventos).

Helpers prontos por evento (cada um é chamado com uma linha):
  - log_levelup(approval)                      views_approvals.approval_consume
  - log_xp(campaign, each, members, granted, user)   views_approvals.campaign_award_xp
  - log_item_given(character, item, user)      views_inventory.inventory_add (mestre dá item)
  - log_long_rest(campaign, character_ids, user)     views_characters.campaign_long_rest_all
  - log_dice_roll(campaign, user, dice_type, results, label)  views_dice.dice_roll (só nat 20/1 em d20)
  - log_roll_request(rr)                       PENDENTE: views_combat.roll_resolve (telão/críticos)
  - log_combat_start(campaign, combatants, user)     PENDENTE: views_combat.combat_start
  - log_combat_end(campaign, round_number, combatants, user, action_log)  views_combat.combat_end
  - log_levelup_granted(approval)              sinal post_save de Approval (levelup → approved)

Para ligar o combate (arquivo de outro agente), basta, ao final de cada view:

    combat_start: log_combat_start(campaign, inst.combatants, request.user)
    combat_end:   log_combat_end(campaign, inst.round_number, inst.combatants, request.user)
    roll_resolve: log_roll_request(rr)   # depois de salvar status/rolls/total

Rolagens e itens próximos no tempo são AGRUPADOS numa única entrada (janela
de GROUP_WINDOW) para o diário não virar spam.
"""
import logging
import re
from datetime import timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)

GROUP_WINDOW = timedelta(minutes=15)
MAX_GROUPED = 40


# ------------------------------------------------------------------ sessão
def current_session(campaign):
    """Nº da sessão atual a partir de campaign.state.session ("12", "Sessão 12"…)."""
    raw = (campaign.state or {}).get('session')
    if isinstance(raw, int) and not isinstance(raw, bool):
        return raw if raw >= 0 else None
    m = re.search(r'\d+', str(raw or ''))
    return int(m.group()) if m else None


def session_meta(campaign):
    meta = (campaign.state or {}).get('diarySessions')
    return meta if isinstance(meta, dict) else {}


# ------------------------------------------------------------------ núcleo
def log_diary(campaign, subtype, title, body='', data=None, user=None, hidden=False, kind='event'):
    """Cria uma entrada no diário da campanha. Devolve a entrada ou None."""
    if campaign is None:
        return None
    try:
        from .models import DiaryEntry
        return DiaryEntry.objects.create(
            campaign=campaign, session=current_session(campaign), kind=kind,
            subtype=str(subtype)[:20], title=str(title or '')[:200], body=str(body or ''),
            data=data or {}, created_by=user if getattr(user, 'is_authenticated', False) else None,
            hidden=bool(hidden),
        )
    except Exception:  # noqa: BLE001 — diário nunca derruba a view
        logger.exception('diary: falha ao registrar %s', subtype)
        return None


def _group(campaign, subtype, key, item, make_title, make_body, user=None):
    """Acrescenta `item` em data[key] da última entrada `subtype` recente (mesma sessão,
    não editada à mão); senão cria uma nova."""
    try:
        from .models import DiaryEntry
        session = current_session(campaign)
        last = (DiaryEntry.objects
                .filter(campaign=campaign, subtype=subtype, kind='event', session=session,
                        edited_at__isnull=True, occurred_at__gte=timezone.now() - GROUP_WINDOW)
                .order_by('-occurred_at', '-id').first())
        if last and len((last.data or {}).get(key) or []) < MAX_GROUPED:
            items = list(last.data.get(key) or []) + [item]
            last.data = {**last.data, key: items}
            last.title = make_title(items)[:200]
            last.body = make_body(items)
            last.save(update_fields=['data', 'title', 'body'])
            return last
        items = [item]
        return log_diary(campaign, subtype, make_title(items), make_body(items), {key: items}, user=user)
    except Exception:  # noqa: BLE001
        logger.exception('diary: falha ao agrupar %s', subtype)
        return None


def _char_name(char):
    return (char.data or {}).get('name') or char.name or f'#{char.id}'


def _user_name(user):
    prof = getattr(user, 'profile', None)
    return getattr(prof, 'display_name', None) or getattr(user, 'username', '') or '?'


# ------------------------------------------------------------------ eventos
def log_levelup(approval):
    """Personagem aplicou a subida de nível (approval consumida)."""
    if approval.type != 'levelup':
        return None
    char = approval.character
    level = (char.data or {}).get('level') or (approval.payload or {}).get('toLevel')
    class_id = (approval.payload or {}).get('classId') or (char.data or {}).get('className') or ''
    name = _char_name(char)
    return log_diary(
        approval.campaign, 'levelup', f'{name} subiu para o nível {level}', '',
        {'characterId': char.id, 'characterName': name, 'level': level, 'classId': class_id},
        user=char.owner,
    )


def log_xp(campaign, each, members, granted=None, user=None):
    names = [_char_name(m.character) for m in members]
    ready = {(g.get('character') or {}).get('id') for g in (granted or []) if isinstance(g, dict)}
    body = ', '.join(names)
    return log_diary(
        campaign, 'xp', f'+{each} XP para {len(names)} personagem(ns)', body,
        {'each': each, 'characters': [{'id': m.character.id, 'name': _char_name(m.character)} for m in members],
         'levelReady': [n for n, m in zip(names, members) if m.character.id in ready]},
        user=user,
    )


def log_item_given(character, item, user=None):
    """Mestre entregou um item a um personagem em campanha."""
    from .models import Membership
    m = Membership.objects.filter(character=character).select_related('campaign').first()
    if not m:
        return None
    entry = {'characterId': character.id, 'characterName': _char_name(character),
             'itemName': str(item.get('name') or '')[:120], 'qty': item.get('qty') or 1}

    def title(items):
        if len(items) == 1:
            return f'{items[0]["characterName"]} recebeu {items[0]["itemName"]}'
        return f'{len(items)} itens entregues'

    def body(items):
        return '\n'.join(f'{i["itemName"]}{" ×" + str(i["qty"]) if i.get("qty", 1) != 1 else ""} → {i["characterName"]}'
                         for i in items)
    return _group(m.campaign, 'item', 'items', entry, title, body, user=user)


def log_long_rest(campaign, character_ids, user=None):
    from .models import Character
    names = [_char_name(c) for c in Character.objects.filter(pk__in=character_ids)]
    return log_diary(campaign, 'rest', 'Descanso longo da mesa', ', '.join(names),
                     {'rest': 'long', 'characters': names}, user=user)


def log_short_rest(campaign, character_ids, user=None):
    from .models import Character
    names = [_char_name(c) for c in Character.objects.filter(pk__in=character_ids)]
    return log_diary(campaign, 'rest', 'Descanso curto da mesa', ', '.join(names),
                     {'rest': 'short', 'characters': names}, user=user)


def _roll_group(campaign, user, entry):
    def title(items):
        crits = sum(1 for i in items if i['crit'] == 'crit')
        fails = len(items) - crits
        parts = []
        if crits:
            parts.append(f'{crits} crítico{"s" if crits > 1 else ""}')
        if fails:
            parts.append(f'{fails} falha{"s" if fails > 1 else ""} crítica{"s" if fails > 1 else ""}')
        return 'Rolagens marcantes: ' + ', '.join(parts)

    def body(items):
        return '\n'.join(
            f'{"✦ 20 natural" if i["crit"] == "crit" else "✖ 1 natural"} — {i["who"]}'
            f'{" (" + i["label"] + ")" if i.get("label") else ""}'
            + (f' · total {i["total"]}' if i.get('total') is not None else '')
            for i in items)
    return _group(campaign, 'roll', 'rolls', entry, title, body, user=user)


def _campaign_char_name(campaign, user):
    from .models import Membership
    m = Membership.objects.filter(campaign=campaign, user=user).select_related('character').first()
    return _char_name(m.character) if m and m.character else _user_name(user)


def log_dice_roll(campaign, user, dice_type, results, label=''):
    """Rolagem livre (/dice/roll): só registra 20/1 natural em d20, agrupado."""
    if campaign is None or dice_type != 'd20':
        return None
    try:
        values = [int(r['value']) for r in results]
    except (KeyError, TypeError, ValueError):
        return None
    last = None
    for v in values:
        if v in (1, 20):
            last = _roll_group(campaign, user, {
                'who': _campaign_char_name(campaign, user), 'label': (label or '')[:80],
                'crit': 'crit' if v == 20 else 'fail', 'value': v,
            })
    return last


def log_roll_request(rr):
    """RollRequest resolvida: registra se foi pública (telão) com crítico/falha, ou
    qualquer rolagem pública marcada como crítica. Privadas não entram (ou entram
    ocultas se críticas)."""
    if not (rr.is_critical or rr.is_critical_fail):
        return None
    who = _char_name(rr.character) if rr.character else _user_name(rr.requested_by)
    return _roll_group(rr.campaign, rr.requested_by, {
        'who': who, 'label': (rr.label or '')[:80], 'crit': 'crit' if rr.is_critical else 'fail',
        'total': rr.total, 'public': rr.status == 'public',
    }) if rr.status == 'public' else log_diary(
        rr.campaign, 'roll', f'Rolagem privada: {"crítico" if rr.is_critical else "falha crítica"} — {who}',
        rr.label or '', {'rolls': [{'who': who, 'label': rr.label, 'total': rr.total,
                                   'crit': 'crit' if rr.is_critical else 'fail'}]},
        user=rr.requested_by, hidden=True)


def _names(combatants, pred=lambda c: True):
    return [str(c.get('name') or '?') for c in (combatants or []) if isinstance(c, dict) and pred(c)]


def log_combat_start(campaign, combatants, user=None):
    names = _names(combatants)
    return log_diary(campaign, 'combat', 'Combate iniciado', ', '.join(names),
                     {'phase': 'start', 'combatants': names}, user=user)


def _base_name(name):
    """'Goblin #2' → 'Goblin' (agrupa cópias do mesmo monstro)."""
    return re.sub(r'\s*#\d+$', '', str(name or '?')).strip() or '?'


def _join_pt(names):
    names = [n for n in names if n]
    if len(names) <= 1:
        return ''.join(names)
    return ', '.join(names[:-1]) + ' e ' + names[-1]


def _times_pt(n):
    return {1: 'uma vez', 2: 'duas vezes'}.get(n, f'{n} vezes')


def combat_summary(round_number, combatants, action_log=None):
    """Resumo estruturado do combate: participantes, quedas e vencedor.

    winner: 'party' (todos os monstros caíram), 'monsters' (todos os PCs caídos)
    ou None (fuga, rendição, mestre encerrou antes)."""
    combatants = [c for c in (combatants or []) if isinstance(c, dict)]

    def down(c):
        hp = c.get('current_hp', c.get('hp'))
        return bool(c.get('defeated')) or (isinstance(hp, (int, float)) and hp <= 0)

    pcs = [c for c in combatants if c.get('type') == 'pc']
    monsters = [c for c in combatants if c.get('type') == 'monster']
    groups = {}
    for m in monsters:
        g = groups.setdefault(_base_name(m.get('name')), {'name': _base_name(m.get('name')), 'count': 0, 'defeated': 0})
        g['count'] += 1
        g['defeated'] += 1 if down(m) else 0

    # Quedas desde o último "start" do log (o log guarda os 100 últimos eventos).
    log = [e for e in (action_log or []) if isinstance(e, dict)]
    starts = [i for i, e in enumerate(log) if e.get('type') == 'start']
    if starts:
        log = log[starts[-1]:]
    downs = {}
    for e in log:
        names = list(e.get('downed_list') or [])
        if e.get('downed'):
            names.append(e['downed'])
        for n in names:
            downs[str(n)] = downs.get(str(n), 0) + 1
    pc_names = {str(c.get('name')) for c in pcs}
    pc_downs = {n: k for n, k in downs.items() if n in pc_names}

    winner = None
    if monsters and all(down(m) for m in monsters):
        winner = 'party'
    elif pcs and all(down(p) for p in pcs):
        winner = 'monsters'
    return {
        'rounds': round_number,
        'pcs': [str(c.get('name') or '?') for c in pcs],
        'monsters': list(groups.values()),
        'defeated': _names(combatants, down),
        'downs': pc_downs,
        'winner': winner,
    }


def combat_narration_pt(summary):
    """'Thalion e Mira venceram 3 inimigos (Goblin ×3) em 4 rodadas; Mira caiu uma vez.'"""
    rounds = summary['rounds']
    rtxt = f'{rounds} rodada' + ('s' if rounds != 1 else '')
    pcs = _join_pt(summary['pcs']) or 'O grupo'
    foes = summary['monsters']
    total = sum(g['count'] for g in foes)
    foe_txt = ', '.join(f'{g["name"]} ×{g["count"]}' if g['count'] > 1 else g['name'] for g in foes)
    if summary['winner'] == 'party' and total:
        verb = 'venceu' if len(summary['pcs']) <= 1 else 'venceram'
        main = f'{pcs} {verb} {total} inimigo{"s" if total != 1 else ""} ({foe_txt}) em {rtxt}'
    elif summary['winner'] == 'monsters':
        main = f'{pcs} {"caiu" if len(summary["pcs"]) <= 1 else "caíram"} diante de {foe_txt or "inimigos"} em {rtxt}'
    else:
        main = f'Combate encerrado em {rtxt}' + (f' contra {foe_txt}' if foe_txt else '')
    falls = [f'{n} caiu {_times_pt(k)}' for n, k in summary['downs'].items()]
    return main + ('; ' + '; '.join(falls) if falls else '') + '.'


def log_combat_end(campaign, round_number, combatants, user=None, action_log=None):
    summary = combat_summary(round_number, combatants, action_log)
    body = combat_narration_pt(summary)
    return log_diary(campaign, 'combat', 'Combate encerrado', body,
                     {'phase': 'end', 'rounds': round_number, 'combatants': _names(combatants),
                      'defeated': summary['defeated'], 'pcs': summary['pcs'],
                      'monsters': summary['monsters'], 'downs': summary['downs'],
                      'winner': summary['winner']}, user=user)


# ------------------------------------------------------------------ liberação de nível
LEVELGRANT = 'levelgrant'   # subtipo próprio: 'levelup' é o jogador aplicando a subida


def log_levelup_granted(approval, user=None):
    """Mestre liberou a subida de nível (approval → 'approved'). Liberações
    próximas no tempo (marco da mesa toda) viram uma entrada só.
    Entrada: subtype 'levelgrant', data {phase:'granted', grants:[{characterId,
    characterName, toLevel}]}."""
    if approval.type != 'levelup' or approval.status != 'approved':
        return None
    try:
        from .models import DiaryEntry
        char = approval.character
        item = {'characterId': char.id, 'characterName': _char_name(char),
                'toLevel': (approval.payload or {}).get('toLevel')}
        campaign = approval.campaign
        session = current_session(campaign)
        last = (DiaryEntry.objects
                .filter(campaign=campaign, subtype=LEVELGRANT, kind='event', session=session,
                        edited_at__isnull=True, occurred_at__gte=timezone.now() - GROUP_WINDOW)
                .order_by('-occurred_at', '-id').first())

        def title(items):
            if len(items) == 1:
                lvl = items[0].get('toLevel')
                return f'Nível liberado para {items[0]["characterName"]}' + (f' (nível {lvl})' if lvl else '')
            return f'Nível liberado para {_join_pt([i["characterName"] for i in items])}'

        note = (approval.note or '')[:500]
        if last and len((last.data or {}).get('grants') or []) < MAX_GROUPED:
            grants = [g for g in (last.data.get('grants') or []) if g.get('characterId') != char.id] + [item]
            last.data = {**last.data, 'grants': grants}
            last.title = title(grants)[:200]
            last.save(update_fields=['data', 'title'])
            return last
        return log_diary(campaign, LEVELGRANT, title([item]), note,
                         {'phase': 'granted', 'grants': [item]},
                         user=user or approval.reviewed_by)
    except Exception:  # noqa: BLE001
        logger.exception('diary: falha ao registrar liberação de nível')
        return None


def _connect_levelup_signals():
    """Liga o registro da liberação ao salvar a Approval (as views de aprovação
    não precisam mudar). Idempotente via dispatch_uid."""
    from django.db.models.signals import pre_save, post_save
    from .models import Approval

    def remember_status(sender, instance, **kwargs):
        instance._diary_prev_status = (
            Approval.objects.filter(pk=instance.pk).values_list('status', flat=True).first()
            if instance.pk else None)

    def on_saved(sender, instance, created, **kwargs):
        prev = getattr(instance, '_diary_prev_status', None)
        if instance.type == 'levelup' and instance.status == 'approved' and prev != 'approved':
            log_levelup_granted(instance)

    pre_save.connect(remember_status, sender=Approval, weak=False, dispatch_uid='diary_levelup_prev')
    post_save.connect(on_saved, sender=Approval, weak=False, dispatch_uid='diary_levelup_granted')


_connect_levelup_signals()
