"""
Rolagens na Tela (V10, especificação §5.4) — "as roladas acontecem nela".

Fonte única: `RollRequest` (a tabela e o índice `(campaign, status)` que já
existem; nenhuma migração). Toda rolagem que vai à mesa vira uma linha JÁ
RESOLVIDA: `status='public'` aparece na TV; `'private'` é o 🔒 Só eu do mestre
(fica no registro dele, nunca na TV). As rolagens de MESA — as que não são um
pedido do jogador ao mestre — levam o marcador no `note`:

    @mesa:dm        🎲 do mestre (📺 Na tela → public · 🔒 Só eu → private)
    @mesa:monster   ataque de monstro aplicado com "📺 vai à Tela"
    @mesa:save      salvaguarda em área aplicada com "📺 vai à Tela" (1 linha-resumo)
    @mesa:check     resposta de teste com 20 ou 1 natural
    @mesa:player    rolador da Mesa do jogador, quando a política do mestre deixa
    @mesa:sheet     rolagem da FICHA do jogador (V15, decisão D-1 do dono): rolada
                    no aparelho e mandada pronta, sem bloquear a ficha
                    (`clean_sheet_roll`; POST /characters/:id/table-roll)

`note = '@mesa:<tipo>[ <quem>]'` — `quem` é o nome do monstro (o mestre não tem
personagem); jogador e teste usam `RollRequest.character`. O marcador separa as
rolagens de mesa dos pedidos do Histórico de rolagens de Testes (que continua
igual) e é o que a arrumação apaga: ao gravar uma rolagem de mesa, ficam só as
300 mais novas da campanha COM o marcador (os pedidos nunca são tocados).

Detalhe por tipo (em `rolls`, que já é JSON e não tem teto):
  · dm/player/check/sheet: os dados [{value, kept, die}] (fórmula mista: `die` por dado);
  · monster: [{value: d20 natural, kept, die:'d20', hit, dmg:[{n, t}]}] e
    `total` = o d20 natural — o bônus do monstro NUNCA é gravado aqui;
  · save: um por alvo [{who, total, ok, value (d20), ab, dc}]; a Tela recebe só
    quem, total e ✓/✗ (o d20 com o total entregaria o bônus de um monstro).

A TV (`GET /api/screen/<t>`) lê uma JANELA pelo relógio do servidor
(`screen_rolls`): até 6 linhas públicas com `resolved_at ≥ agora − 90 s`, em
ordem (resolved_at, id), mais o `now` do servidor — é o que corrige o pedido
antigo resolvido depois de um novo, as 2 rolagens em menos de 2 s e a TV com o
relógio errado. A fila, os ids vistos e o "momento dramático" (< 10 s) ficam no
cliente (frontend/src/screen/roll-queue.js).
"""
from datetime import timedelta

from django.utils import timezone

from .dice_privacy import scrub_dice

PREFIX = '@mesa:'
KINDS = ('dm', 'monster', 'save', 'check', 'player', 'sheet')
KEEP = 300            # rolagens de mesa guardadas por campanha (a arrumação apaga as mais velhas)
WINDOW_S = 90         # a TV lê as rolagens públicas dos últimos 90 s (relógio do servidor)
MAX_ROWS = 6          # no máximo 6 por resposta da TV
MAX_WHO = 80
MAX_LABEL = 120


def note_for(kind, who=''):
    who = ' '.join(str(who or '').split())[:MAX_WHO]
    return f'{PREFIX}{kind}' + (f' {who}' if who else '')


def parse_note(note):
    """'@mesa:monster Goblin #2' → ('monster', 'Goblin #2'). Pedido → (None, '')."""
    note = note or ''
    if not note.startswith(PREFIX):
        return None, ''
    rest = note[len(PREFIX):]
    kind, _, who = rest.partition(' ')
    return (kind if kind in KINDS else None), who.strip()


def is_table(rr):
    return (rr.note or '').startswith(PREFIX)


def natural_crit(rolls, dice_type='d20'):
    """(20 natural, 1 natural) entre os d20 que contam."""
    d20 = [r for r in rolls or [] if isinstance(r, dict) and r.get('kept', True) is not False
           and (r.get('die') or dice_type) == 'd20']
    values = {int(r.get('value') or 0) for r in d20}
    return 20 in values, 1 in values


def players_allow(prefs, rolls, dice_type='d20'):
    """Política "Dos jogadores": all → todas; crits → só 20/1 natural em d20; off → nenhuma."""
    mode = (prefs or {}).get('players') or 'crits'
    if mode == 'all':
        return True
    if mode == 'off':
        return False
    crit, fail = natural_crit(rolls, dice_type)
    return crit or fail


def prefs_of(campaign):
    from .stage import get_stage
    return get_stage(campaign.state)['prefs']


def record(campaign, user, kind, *, label='', dice_type='d20', count=1, modifier=0, rolls=(),
           total=None, crit=False, fail=False, character=None, who='', rigged=False, public=True):
    """Grava UMA rolagem de mesa já resolvida (1 escrita) e arruma as velhas.
    `campaign` e `character` aceitam o objeto ou só o id (a ficha não carrega a campanha)."""
    from .models import RollRequest
    now = timezone.now()
    campaign_id = getattr(campaign, 'id', campaign)
    rr = RollRequest.objects.create(
        campaign_id=campaign_id, requested_by=user, character_id=getattr(character, 'id', character),
        label=str(label or '')[:MAX_LABEL], dice_type=dice_type if dice_type else 'd20',
        count=max(1, int(count or 1)), modifier=int(modifier or 0),
        status='public' if public else 'private', rolls=list(rolls or []), total=total,
        is_critical=bool(crit), is_critical_fail=bool(fail), rigged=bool(rigged),
        note=note_for(kind, who), resolved_at=now,
    )
    prune(campaign_id)
    return rr


# ------------------------------------------------------------------ rolagem da ficha (V15)
SHEET_DICE = {'d4': 4, 'd6': 6, 'd8': 8, 'd10': 10, 'd12': 12, 'd20': 20, 'd100': 100}
MAX_SHEET_DICE = 20     # dados por rolagem (o 2º d20 da vantagem conta)
MAX_SHEET_MOD = 50


def _bad(code):
    from rest_framework.exceptions import ValidationError
    raise ValidationError({'error': code})


def _plain_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def clean_sheet_roll(data):
    """Valida a rolagem que a ficha já rolou no aparelho e manda pronta:
    {label, dice:[{die, value, kept?, sign?}], modifier, total, adv?}. No máximo 20
    dados de lados conhecidos, cada valor dentro do dado, vantagem só com 2 d20 (fica
    o maior; desvantagem, o menor) e o total = soma dos que contam + modificador.
    → os campos de `record` (crítico/falha só no d20 sozinho, como a ficha mostra)."""
    data = data if isinstance(data, dict) else {}
    label = data.get('label', '')
    if not isinstance(label, str):
        _bad('invalid_label')
    label = ' '.join(label.split())
    if len(label) > MAX_LABEL:
        _bad('label_too_long')
    raw = data.get('dice')
    if not isinstance(raw, list) or not raw:
        _bad('invalid_dice')
    if len(raw) > MAX_SHEET_DICE:
        _bad('too_many_dice')
    dice = []
    for d in raw:
        if not isinstance(d, dict) or d.get('die') not in SHEET_DICE:
            _bad('invalid_dice_type')
        value = d.get('value')
        if not _plain_int(value) or not 1 <= value <= SHEET_DICE[d['die']]:
            _bad('invalid_value')
        kept = d.get('kept', True)
        sign = d.get('sign', 1)
        if not isinstance(kept, bool) or sign not in (1, -1):
            _bad('invalid_dice')
        dice.append({'value': value, 'kept': kept, 'die': d['die'], **({'sign': -1} if sign == -1 else {})})
    kept = [d for d in dice if d['kept']]
    if not kept:
        _bad('invalid_dice')
    adv = data.get('adv')
    if adv in ('adv', 'dis'):
        a, b = dice[0]['value'], dice[-1]['value']
        if (len(dice) != 2 or any(d['die'] != 'd20' or d.get('sign') for d in dice) or len(kept) != 1
                or kept[0]['value'] != (max(a, b) if adv == 'adv' else min(a, b))):
            _bad('incoherent_advantage')
    elif adv not in (None, '', 'normal') or len(kept) != len(dice):
        _bad('incoherent_advantage')
    modifier = data.get('modifier', 0)
    if not _plain_int(modifier) or abs(modifier) > MAX_SHEET_MOD:
        _bad('invalid_modifier')
    total = data.get('total')
    if not _plain_int(total) or total != sum(d['value'] * d.get('sign', 1) for d in kept) + modifier:
        _bad('incoherent_total')
    types = {d['die'] for d in dice}
    alone = types == {'d20'} and len(kept) == 1 and not kept[0].get('sign')
    return {
        'label': label, 'dice_type': types.pop() if len(types) == 1 else 'mixed', 'count': len(kept),
        'modifier': modifier, 'rolls': dice, 'total': total,
        'crit': alone and kept[0]['value'] == 20, 'fail': alone and kept[0]['value'] == 1,
    }


def prune(campaign_id, keep=KEEP):
    """Apaga as rolagens de mesa além das `keep` mais novas da campanha (2 consultas
    pequenas). Pedidos dos jogadores (sem o marcador) nunca são tocados."""
    from .models import RollRequest
    mesa = RollRequest.objects.filter(campaign_id=campaign_id, note__startswith=PREFIX)
    cut = mesa.order_by('-id').values_list('id', flat=True)[keep:keep + 1]
    cut = list(cut)
    if cut:
        # sem sinais nem tabelas filhas: o Django faz um DELETE só
        mesa.filter(id__lte=cut[0]).delete()


def who_of(rr, char_by_user=None):
    """(tipo, quem). Mestre: quem = '' (a tela escreve "Mestre"/"GM"); monstro e
    salvaguarda: o nome do monstro; o resto: o personagem (o da ficha da vaga
    quando o pedido não trouxe um), senão o nome de quem pediu."""
    kind, who = parse_note(rr.note)
    if kind == 'dm':
        return kind, ''
    if kind in ('monster', 'save'):
        return kind, who
    if rr.character_id and getattr(rr, 'character', None) is not None:
        return kind or 'request', rr.character.name
    name = (char_by_user or {}).get(rr.requested_by_id)
    if name:
        return kind or 'request', name
    return kind or 'request', _user_name(rr.requested_by)


def _user_name(user):
    prof = getattr(user, 'profile', None)
    try:
        if prof and prof.display_name:
            return prof.display_name
    except Exception:  # pragma: no cover - perfil ausente
        pass
    return (user.email or user.username).split('@')[0] if user.email else user.username


def _dice(rolls, dice_type):
    out = []
    for r in rolls or []:
        if not isinstance(r, dict) or 'value' not in r:
            continue
        d = {'value': r.get('value'), 'kept': r.get('kept', True) is not False}
        if r.get('die') and r.get('die') != dice_type:
            d['die'] = r['die']
        if r.get('sign') == -1:
            d['sign'] = -1
        out.append(d)
    return out


def detail(rr):
    """Os campos de cada tipo: {hit, damage} do ataque; {ability, dc, targets} da salvaguarda."""
    kind, _ = parse_note(rr.note)
    rolls = rr.rolls if isinstance(rr.rolls, list) else []
    if kind == 'monster':
        first = rolls[0] if rolls and isinstance(rolls[0], dict) else {}
        return {'hit': bool(first.get('hit')),
                'damage': [{'amount': int(p.get('n') or 0), 'type': str(p.get('t') or '')}
                           for p in first.get('dmg') or [] if isinstance(p, dict)]}
    if kind == 'save':
        head = rolls[0] if rolls and isinstance(rolls[0], dict) else {}
        return {'ability': str(head.get('ab') or ''), 'dc': head.get('dc'),
                'targets': [{'who': str(t.get('who') or ''), 'total': t.get('total'), 'ok': bool(t.get('ok'))}
                            for t in rolls if isinstance(t, dict)]}
    return {}


def public_roll(rr, char_by_user=None):
    """Uma rolagem para a Tela (e o jogador): nada de dado viciado, bônus de monstro
    nem o d20 de quem salvou (só quem, total e ✓/✗)."""
    kind, who = who_of(rr, char_by_user)
    out = {
        'id': rr.id, 'kind': kind, 'who': who, 'label': rr.label,
        'diceType': rr.dice_type, 'count': rr.count, 'modifier': rr.modifier,
        'rolls': [] if kind == 'save' else scrub_dice(_dice(rr.rolls, rr.dice_type)),
        'total': rr.total, 'crit': rr.is_critical, 'fail': rr.is_critical_fail,
        'at': rr.resolved_at.isoformat() if rr.resolved_at else None,
    }
    out.update(detail(rr))
    return out


def screen_rolls(campaign_id, now=None, char_by_user=None):
    """A janela da TV: até 6 públicas dos últimos 90 s (relógio do servidor), em
    ordem (resolved_at, id). 1 consulta pelo índice (campaign, status)."""
    from .models import RollRequest
    now = now or timezone.now()
    rows = list(
        RollRequest.objects
        .filter(campaign_id=campaign_id, status='public', resolved_at__gte=now - timedelta(seconds=WINDOW_S))
        .select_related('character', 'requested_by', 'requested_by__profile')
        .order_by('-resolved_at', '-id')[:MAX_ROWS]
    )
    rows.reverse()
    return rows, [public_roll(r, char_by_user) for r in rows]


def dm_row(rr, serialized):
    """A linha do mestre (Testes › 🎲 Rolagens na Tela): o pedido serializado + tipo,
    quem e o detalhe (com o d20 de cada alvo da salvaguarda)."""
    kind, who = who_of(rr)
    out = {**serialized, 'kind': kind, 'who': who, **detail(rr)}
    if kind == 'save':
        raw = [r for r in rr.rolls or [] if isinstance(r, dict)]
        out['targets'] = [{**t, 'd20': raw[i].get('value') if i < len(raw) else None}
                          for i, t in enumerate(out.get('targets') or [])]
    return out
