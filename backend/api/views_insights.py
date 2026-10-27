"""
Raio-X do grupo (Grupo › Raio-X) — só o mestre.

Os gráficos (papel do grupo, perícias, dano, lacunas…) são calculados no navegador
do mestre com as fichas que o GET da campanha já entrega; o servidor só guarda os
ajustes e os momentos que o mestre escolhe, em Campaign.dm_settings.partyInsights
(sem migração). Fica FORA do CampaignSerializer e do polling: 1 GET ao abrir o
Raio-X e 1 PUT por edição (o cliente espera 800 ms entre um toque e o envio).

GET  /api/campaigns/<c>/party-insights   → {insights}
PUT  /api/campaigns/<c>/party-insights   {insights: {...}} (ou as chaves soltas) → {insights}
     merge por chave; nos mapas (focus, base, style, spotlights, dismissed) o merge
     entra um nível e null apaga o item. Validação em world_rules.clean_party_insights_patch.
     Quem entra: `exclude` (as fichas que o mestre tirou; quem chega entra sozinho).
GET  /api/campaigns/<c>/party-insights/history → {current, sessions: [...]}
     o Equilíbrio na mesa (G9): por sessão das últimas 5, contagens dos testes pedidos,
     respondidos e passados por personagem e das quedas no combate. Só números (nada de
     rótulos, totais ou nomes); sob demanda (o cliente pede ao abrir o bloco) e com cache
     de 60 s no LocMemCache que já existe — nenhum polling.
"""
from django.core.cache import cache
from django.db import transaction
from django.db.models import Min
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import world_rules as R
from .campaign_state import locked_dm_settings
from .diary import current_session, session_meta
from .models import Campaign, CheckRequest, CheckResponse, DiaryEntry, Membership
from .permissions import get_campaign_or_404, require_dm

HISTORY_SESSIONS = 5
HISTORY_TTL = 60


def _run(fn, *args):
    try:
        return fn(*args)
    except R.WorldError as e:
        raise ValidationError({'error': e.code})


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def party_insights(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    if request.method == 'GET':
        insights = _run(R.merged_party_insights, (campaign.dm_settings or {}).get('partyInsights'), {})
        return Response({'insights': insights})
    body = request.data if isinstance(request.data, dict) else {}
    raw = body.get('insights') if isinstance(body.get('insights'), dict) else body
    patch = _run(R.clean_party_insights_patch, raw)

    def at_table():   # só quando um mapa passa do teto (fichas que saíram da mesa)
        return Membership.objects.filter(campaign=campaign, character__isnull=False).values_list('character_id', flat=True)

    with transaction.atomic():
        settings = locked_dm_settings(campaign.pk)
        insights = _run(R.merged_party_insights, settings.get('partyInsights'), patch, at_table)
        settings['partyInsights'] = insights
        Campaign.objects.filter(pk=campaign.pk).update(dm_settings=settings)
    return Response({'insights': insights})


# ------------------------------------------------------------------ histórico (G9)
def _session_numbers(campaign, limit=HISTORY_SESSIONS):
    """As últimas `limit` sessões (em ordem crescente): as do diário (diarySessions e o
    nº gravado nas entradas) e a atual."""
    nums = set()
    for k in session_meta(campaign):
        if str(k).isdigit():
            nums.add(int(k))
    cur = current_session(campaign)
    if cur is not None:
        nums.add(cur)
    nums.update(DiaryEntry.objects.filter(campaign=campaign, session__isnull=False)
                .values_list('session', flat=True).distinct())
    return sorted(n for n in nums if n >= 0)[-limit:]


def _session_starts(campaign, numbers):
    """Quando cada sessão começou: diarySessions[n].startedAt; sem ele, a 1ª entrada do
    diário daquela sessão. Sessão sem nenhum dos dois fica sem janela (conta 0)."""
    meta = session_meta(campaign)
    starts = {}
    for n in numbers:
        raw = (meta.get(str(n)) or {}).get('startedAt') if isinstance(meta.get(str(n)), dict) else None
        try:
            when = parse_datetime(raw) if isinstance(raw, str) else None
        except ValueError:
            when = None
        if when is not None:
            starts[n] = timezone.make_aware(when) if timezone.is_naive(when) else when
    missing = [n for n in numbers if n not in starts]
    if missing:
        rows = (DiaryEntry.objects.filter(campaign=campaign, session__in=missing)
                .values('session').annotate(first=Min('occurred_at')))
        for row in rows:
            starts[row['session']] = row['first']
    return starts


def session_history(campaign):
    numbers = _session_numbers(campaign)
    out = {'current': current_session(campaign), 'sessions': []}
    if not numbers:
        return out
    starts = _session_starts(campaign, numbers)
    # janelas [início, início da próxima) — só com inícios em ordem; a última vai até agora
    windows, prev = [], None
    for n in numbers:
        when = starts.get(n)
        if when is None or (prev is not None and when <= prev):
            continue
        windows.append((n, when))
        prev = when

    def session_at(when):
        hit = None
        for n, start in windows:
            if when >= start:
                hit = n
        return hit

    players = list(Membership.objects.filter(campaign=campaign).exclude(user_id=campaign.dm_id)
                   .exclude(role='dm').select_related('character').only('user_id', 'character_id', 'character__name'))
    char_of_user = {m.user_id: m.character_id for m in players if m.character_id}
    char_of_name = {m.character.name: m.character_id for m in players if m.character_id and m.character}
    checks = {n: {} for n in numbers}
    downs = {n: {} for n in numbers}

    def bump(n, char_id, field):
        row = checks[n].setdefault(str(char_id), {'asked': 0, 'answered': 0, 'passed': 0})
        row[field] += 1

    if windows:
        reqs = list(CheckRequest.objects.filter(campaign=campaign, created_at__gte=windows[0][1])
                    .values('id', 'created_at', 'dc', 'target_user_ids'))
        session_of = {}
        for cr in reqs:
            n = session_at(cr['created_at'])
            if n is None:
                continue
            session_of[cr['id']] = (n, cr['dc'])
            ids = set(cr['target_user_ids'] or [])
            for user_id, char_id in char_of_user.items():
                if not ids or user_id in ids:
                    bump(n, char_id, 'asked')
        if session_of:
            for r in (CheckResponse.objects.filter(check_request_id__in=list(session_of))
                      .values('check_request_id', 'user_id', 'character_id', 'total')):
                n, dc = session_of[r['check_request_id']]
                char_id = r['character_id'] or char_of_user.get(r['user_id'])
                if not char_id:
                    continue
                bump(n, char_id, 'answered')
                if dc is not None and r['total'] is not None and r['total'] >= dc:
                    bump(n, char_id, 'passed')

    for n, data in (DiaryEntry.objects.filter(campaign=campaign, subtype='combat', session__in=numbers)
                    .values_list('session', 'data')):
        if not isinstance(data, dict) or data.get('phase') != 'end' or not isinstance(data.get('downs'), dict):
            continue
        for name, k in data['downs'].items():
            char_id = char_of_name.get(name)
            if char_id and isinstance(k, int) and not isinstance(k, bool) and k > 0:
                downs[n][str(char_id)] = downs[n].get(str(char_id), 0) + k

    for n in reversed(numbers):
        out['sessions'].append({
            'number': n,
            'startedAt': starts[n].isoformat() if n in starts else None,
            'checks': checks[n],
            'downs': downs[n],
        })
    return out


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def party_insights_history(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    # a sessão atual entra na chave: começar a sessão seguinte não espera os 60 s
    key = f'party-history:{campaign.pk}:{current_session(campaign)}'
    data = cache.get(key)
    if data is None:
        data = session_history(campaign)
        cache.set(key, data, HISTORY_TTL)
    return Response(data)
