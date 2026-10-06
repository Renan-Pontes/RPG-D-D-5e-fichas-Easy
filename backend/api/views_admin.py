"""
Área de administração (só contas com is_staff). Somente leitura.

GET /api/admin/overview                       — números gerais e cadastros recentes
GET /api/admin/users?q=&offset=&limit=        — contas (busca por e-mail/nome)
GET /api/admin/users/<id>                     — conta + fichas + campanhas
GET /api/admin/characters?q=&className=&rules=&offset=&limit=  — fichas
GET /api/admin/characters/<id>                — ficha completa (data)
GET /api/admin/campaigns?q=&offset=&limit=    — campanhas
"""
from collections import Counter
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import Campaign, Character, Membership, SharedCharacter

User = get_user_model()
MAX_LIMIT = 100


def _page(request, default=50):
    try:
        offset = max(0, int(request.query_params.get('offset', 0)))
        limit = min(MAX_LIMIT, max(1, int(request.query_params.get('limit', default))))
    except ValueError:
        offset, limit = 0, default
    return offset, limit


def _display_name(u):
    prof = getattr(u, 'profile', None)
    return prof.display_name if prof else (u.email.split('@')[0] if u.email else u.username)


def _user_row(u):
    return {
        'id': u.id, 'email': u.email, 'displayName': _display_name(u),
        'isAdmin': u.is_staff, 'isActive': u.is_active,
        'dateJoined': u.date_joined.isoformat() if u.date_joined else None,
        'lastLogin': u.last_login.isoformat() if u.last_login else None,
        'characters': getattr(u, 'n_chars', None), 'campaigns': getattr(u, 'n_camps', None),
    }


def _char_row(c):
    d = c.data or {}
    return {
        'id': c.id, 'name': c.name,
        'owner': {'id': c.owner_id, 'email': c.owner.email, 'displayName': _display_name(c.owner)},
        'className': d.get('className', ''), 'level': d.get('level', 1), 'race': d.get('race', ''),
        'background': d.get('background', ''), 'rulesVersion': d.get('rulesVersion', '2014'),
        'hasAvatar': bool(d.get('avatar')),
        'createdAt': c.created_at.isoformat(), 'updatedAt': c.updated_at.isoformat(),
    }


def _campaign_row(c):
    return {
        'id': c.id, 'name': c.name, 'slug': c.slug,
        'dm': {'id': c.dm_id, 'email': c.dm.email, 'displayName': _display_name(c.dm)},
        'members': getattr(c, 'n_members', None),
        'createdAt': c.created_at.isoformat(), 'updatedAt': c.updated_at.isoformat(),
    }


@api_view(['GET'])
@permission_classes([IsAdminUser])
def overview(request):
    now = timezone.now()
    week, month = now - timedelta(days=7), now - timedelta(days=30)
    chars = list(Character.objects.values_list('data', flat=True))
    by_class = Counter((d or {}).get('className') or '—' for d in chars)
    by_rules = Counter((d or {}).get('rulesVersion') or '2014' for d in chars)
    recent_users = User.objects.select_related('profile').order_by('-date_joined')[:8]
    recent_chars = Character.objects.select_related('owner', 'owner__profile').order_by('-created_at')[:8]
    return Response({
        'totals': {
            'users': User.objects.count(),
            'characters': len(chars),
            'campaigns': Campaign.objects.count(),
            'activeShares': SharedCharacter.objects.filter(expires_at__gt=now).count(),
        },
        'signups': {
            'week': User.objects.filter(date_joined__gte=week).count(),
            'month': User.objects.filter(date_joined__gte=month).count(),
        },
        'activeUsers': {
            'week': User.objects.filter(last_login__gte=week).count(),
            'month': User.objects.filter(last_login__gte=month).count(),
        },
        'charactersCreated': {
            'week': Character.objects.filter(created_at__gte=week).count(),
            'month': Character.objects.filter(created_at__gte=month).count(),
        },
        'byClass': by_class.most_common(),
        'byRules': by_rules.most_common(),
        'recentUsers': [_user_row(u) for u in recent_users],
        'recentCharacters': [_char_row(c) for c in recent_chars],
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def users(request):
    q = (request.query_params.get('q') or '').strip()
    qs = User.objects.select_related('profile').annotate(
        n_chars=Count('characters', distinct=True), n_camps=Count('owned_campaigns', distinct=True),
    ).order_by('-date_joined')
    if q:
        qs = qs.filter(Q(email__icontains=q) | Q(profile__display_name__icontains=q) | Q(username__icontains=q))
    offset, limit = _page(request)
    return Response({'total': qs.count(), 'results': [_user_row(u) for u in qs[offset:offset + limit]]})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def user_detail(request, pk):
    u = User.objects.select_related('profile').filter(pk=pk).first()
    if not u:
        raise NotFound('Conta não encontrada.')
    chars = Character.objects.filter(owner=u).select_related('owner', 'owner__profile').order_by('-updated_at')
    owned = Campaign.objects.filter(dm=u).select_related('dm', 'dm__profile').annotate(n_members=Count('memberships'))
    joined = Membership.objects.filter(user=u).exclude(campaign__dm=u).select_related('campaign', 'campaign__dm', 'campaign__dm__profile')
    return Response({
        'user': _user_row(u),
        'characters': [_char_row(c) for c in chars],
        'campaignsAsDm': [_campaign_row(c) for c in owned],
        'campaignsAsPlayer': [_campaign_row(m.campaign) for m in joined],
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def characters(request):
    p = request.query_params
    qs = Character.objects.select_related('owner', 'owner__profile').order_by('-updated_at')
    q = (p.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(owner__email__icontains=q) | Q(owner__profile__display_name__icontains=q))
    if p.get('className'):
        qs = qs.filter(data__className=p['className'])
    if p.get('rules'):
        qs = qs.filter(data__rulesVersion=p['rules'])
    offset, limit = _page(request)
    return Response({'total': qs.count(), 'results': [_char_row(c) for c in qs[offset:offset + limit]]})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def character_detail(request, pk):
    c = Character.objects.select_related('owner', 'owner__profile').filter(pk=pk).first()
    if not c:
        raise NotFound('Ficha não encontrada.')
    return Response({**_char_row(c), 'data': c.data})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def campaigns(request):
    qs = Campaign.objects.select_related('dm', 'dm__profile').annotate(n_members=Count('memberships')).order_by('-updated_at')
    q = (request.query_params.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(dm__email__icontains=q))
    offset, limit = _page(request)
    return Response({'total': qs.count(), 'results': [_campaign_row(c) for c in qs[offset:offset + limit]]})
