"""
Diário da campanha.

GET    /api/campaigns/<id>/diary?session=&subtype=&kind=&offset=&limit=
POST   /api/campaigns/<id>/diary                 { title?, body, subtype?: 'note'|'summary', session?, hidden? }
PATCH  /api/campaigns/<id>/diary/<pk>            { title?, body?, hidden?, session? }
DELETE /api/campaigns/<id>/diary/<pk>
POST   /api/campaigns/<id>/diary/sessions        { number?, title? }  — mestre começa sessão
PATCH  /api/campaigns/<id>/diary/sessions/<n>    { title }            — mestre renomeia sessão

Permissões:
  - Mestre: lê tudo (inclusive ocultas), cria, edita/exclui/oculta qualquer entrada.
  - Jogador (membro): lê entradas não ocultas; cria notas próprias; edita/exclui só as dele.
Sessões ficam em campaign.state: session (nº atual, texto — o mesmo campo da
visão geral), live (sessão rolando) e diarySessions {"12": {title, startedAt}},
sempre gravados com merge atômico (campaign_state.update_state).
"""
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .campaign_state import update_state
from .diary import current_session, log_diary, session_meta, _user_name
from .models import DiaryEntry
from .permissions import get_campaign_or_404, is_dm, require_dm, require_member
from .rate_limit import rate_limit

NOTE_SUBTYPES = {'note', 'summary'}
ALL_SUBTYPES = set(DiaryEntry.SUBTYPES) | NOTE_SUBTYPES
MAX_TITLE = 200
MAX_BODY = 20000
MAX_ENTRIES = 5000


def _serialize(e, user, dm):
    mine = e.created_by_id == user.id and e.kind == 'note'
    return {
        'id': e.id, 'session': e.session, 'kind': e.kind, 'subtype': e.subtype,
        'title': e.title, 'body': e.body, 'data': e.data or {},
        'occurredAt': e.occurred_at.isoformat(),
        'editedAt': e.edited_at.isoformat() if e.edited_at else None,
        'createdBy': {'id': e.created_by_id, 'name': _user_name(e.created_by)} if e.created_by_id else None,
        'hidden': e.hidden,
        'canEdit': dm or mine,
    }


def _session_number(value):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or not (0 <= value <= 100000):
        raise ValidationError({'error': 'invalid_session'})
    return value


def _text(value, limit, field):
    if value is None:
        return ''
    if not isinstance(value, str):
        raise ValidationError({'error': f'invalid_{field}'})
    value = value.strip()
    if len(value) > limit:
        raise ValidationError({'error': f'{field}_too_long'})
    return value


def _sessions_payload(campaign, qs):
    meta = session_meta(campaign)
    numbers = sorted({n for n in qs.values_list('session', flat=True).distinct() if n is not None}
                     | {int(k) for k in meta if str(k).isdigit()}, reverse=True)
    return {
        'currentSession': current_session(campaign),
        'sessions': [{'number': n, **({'title': '', 'startedAt': None} | (meta.get(str(n)) or {}))} for n in numbers],
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_diary(request, id_or_slug):
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    dm = is_dm(request.user, campaign)
    if request.method == 'POST':
        return _create_note(request, campaign, dm)

    base = DiaryEntry.objects.filter(campaign=campaign)
    if not dm:
        base = base.filter(hidden=False)
    qs = base.select_related('created_by', 'created_by__profile')
    p = request.query_params
    if p.get('session') not in (None, ''):
        if p['session'] == 'none':
            qs = qs.filter(session__isnull=True)
        elif p['session'].isdigit():
            qs = qs.filter(session=int(p['session']))
        else:
            raise ValidationError({'error': 'invalid_session'})
    if p.get('subtype'):
        qs = qs.filter(subtype__in=[s for s in p['subtype'].split(',') if s in ALL_SUBTYPES])
    if p.get('kind') in ('note', 'event'):
        qs = qs.filter(kind=p['kind'])
    try:
        offset = max(0, int(p.get('offset', 0)))
        limit = max(1, min(200, int(p.get('limit', 100))))
    except ValueError:
        raise ValidationError({'error': 'invalid_pagination'})
    page = list(qs[offset:offset + limit + 1])
    return Response({
        'entries': [_serialize(e, request.user, dm) for e in page[:limit]],
        'hasMore': len(page) > limit,
        'offset': offset,
        **_sessions_payload(campaign, base),
    })


@rate_limit(key='diary_note', max_attempts=60, window=60, per_user=True)
def _create_note(request, campaign, dm):
    body = _text(request.data.get('body'), MAX_BODY, 'body')
    title = _text(request.data.get('title'), MAX_TITLE, 'title')
    if not body and not title:
        raise ValidationError({'error': 'empty_note'})
    subtype = request.data.get('subtype') or 'note'
    if subtype not in NOTE_SUBTYPES:
        raise ValidationError({'error': 'invalid_subtype'})
    hidden = request.data.get('hidden', False)
    session = request.data.get('session', 'current')
    if not dm and (hidden or session != 'current' or subtype == 'summary'):
        raise PermissionDenied('dm_only')
    if DiaryEntry.objects.filter(campaign=campaign).count() >= MAX_ENTRIES:
        raise ValidationError({'error': 'diary_full'})
    entry = DiaryEntry.objects.create(
        campaign=campaign, kind='note', subtype=subtype, title=title, body=body,
        session=current_session(campaign) if session == 'current' else _session_number(session),
        created_by=request.user, hidden=bool(hidden),
    )
    return Response({'entry': _serialize(entry, request.user, dm)}, status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def campaign_diary_entry(request, id_or_slug, entry_pk):
    campaign = get_campaign_or_404(id_or_slug)
    require_member(request.user, campaign)
    dm = is_dm(request.user, campaign)
    entry = DiaryEntry.objects.filter(campaign=campaign, pk=entry_pk).select_related('created_by__profile').first()
    if not entry or (entry.hidden and not dm):
        raise NotFound('not_found')
    if not dm and not (entry.kind == 'note' and entry.created_by_id == request.user.id):
        raise PermissionDenied('forbidden')

    if request.method == 'DELETE':
        entry.delete()
        return Response({'ok': True})

    changed = False
    if 'title' in request.data:
        entry.title = _text(request.data['title'], MAX_TITLE, 'title'); changed = True
    if 'body' in request.data:
        entry.body = _text(request.data['body'], MAX_BODY, 'body'); changed = True
    if 'hidden' in request.data:
        if not dm:
            raise PermissionDenied('dm_only')
        entry.hidden = bool(request.data['hidden'])
    if 'session' in request.data:
        if not dm:
            raise PermissionDenied('dm_only')
        entry.session = _session_number(request.data['session'])
    if changed:
        entry.edited_at = timezone.now()
    entry.save()
    return Response({'entry': _serialize(entry, request.user, dm)})


def _save_session_meta(campaign, number, extra=None, **fields):
    """Grava diarySessions[number] (e `extra`, ex.: session/live) com merge
    atômico no servidor — não apaga o que outro aparelho escreveu no state."""
    def patch(state):
        meta = dict(state.get('diarySessions') if isinstance(state.get('diarySessions'), dict) else {})
        meta[str(number)] = {**(meta.get(str(number)) or {'title': '', 'startedAt': None}), **fields}
        return {'diarySessions': meta, **(extra or {})}
    return update_state(campaign, patch)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_diary_start_session(request, id_or_slug):
    """Mestre começa a sessão N: vira a sessão atual (state.session), liga
    state.live (selo "Ao vivo"; mande live:false para só abrir o grupo no
    diário) e abre o grupo no diário."""
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    number = request.data.get('number')
    if number is None:
        number = (current_session(campaign) or 0) + 1
    number = _session_number(number)
    title = _text(request.data.get('title'), MAX_TITLE, 'title')
    live = request.data.get('live', True)
    if not isinstance(live, bool):
        raise ValidationError({'error': 'invalid_live'})
    _save_session_meta(campaign, number, extra={'session': str(number), 'live': live},
                       title=title, startedAt=timezone.now().isoformat())
    log_diary(campaign, 'session', f'Sessão {number} começou' + (f' — {title}' if title else ''),
              data={'session': number, 'title': title}, user=request.user)
    return Response({'currentSession': number, 'state': campaign.state}, status=201)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def campaign_diary_session(request, id_or_slug, number):
    campaign = get_campaign_or_404(id_or_slug)
    require_dm(request.user, campaign)
    title = _text(request.data.get('title'), MAX_TITLE, 'title')
    _save_session_meta(campaign, number, title=title)
    return Response({'session': {'number': number, **campaign.state['diarySessions'][str(number)]}})
