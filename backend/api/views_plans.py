"""
Planos — catálogo, plano da conta e atribuição pelo admin (ver api/plans.py).

GET   /api/plans                    catálogo público {plans, addons, contact, paymentsEnabled}
GET   /api/me/plan                  plano, extras, limites efetivos e uso da conta
POST  /api/me/plan/checkout         {plan?|addon?, quantity?} → hoje {available:false, contact}
GET   /api/admin/users/<id>/plan    (is_staff) mesmo corpo de /me/plan, da conta <id>
PATCH /api/admin/users/<id>/plan    (is_staff) {plan?, addons?: {slug: qtd}, validUntil?: iso|null, note?}
"""
from django.contrib.auth import get_user_model
from django.utils.dateparse import parse_date, parse_datetime
from django.utils import timezone
from datetime import datetime, time
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from . import plans as P
from .models import AddOn, Plan

User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def plan_catalog(request):
    return Response({
        'plans': [P.plan_payload(p) for p in Plan.objects.filter(active=True)],
        'addons': [P.addon_payload(a) for a in AddOn.objects.filter(active=True)],
        'cardsPerCampaign': P.MAX_CARDS_PER_CAMPAIGN,
        'closedGraceDays': P.CLOSED_GRACE_DAYS,
        'contact': P.contact_info(),
        'paymentsEnabled': P.payments_enabled(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_plan(request):
    return Response(P.account_payload(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def my_plan_checkout(request):
    body = request.data if isinstance(request.data, dict) else {}
    plan_slug = body.get('plan') if isinstance(body.get('plan'), str) else None
    addon_slug = body.get('addon') if isinstance(body.get('addon'), str) else None
    if plan_slug and not Plan.objects.filter(slug=plan_slug, active=True).exists():
        raise ValidationError({'error': 'unknown_plan'})
    if addon_slug and not AddOn.objects.filter(slug=addon_slug, active=True).exists():
        raise ValidationError({'error': 'unknown_addon'})
    if not plan_slug and not addon_slug:
        raise ValidationError({'error': 'invalid_input'})
    qty = body.get('quantity', 1)
    if not isinstance(qty, int) or isinstance(qty, bool) or not 1 <= qty <= 100:
        raise ValidationError({'error': 'invalid_quantity'})
    return Response(P.start_checkout(request.user, plan_slug, addon_slug, qty))


def _parse_valid_until(value):
    if value in (None, ''):
        return None
    if not isinstance(value, str):
        raise ValidationError({'error': 'invalid_validUntil'})
    dt = parse_datetime(value)
    if dt is None:
        d = parse_date(value)
        if d is None:
            raise ValidationError({'error': 'invalid_validUntil'})
        dt = datetime.combine(d, time(23, 59, 59))
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt)
    return dt


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_user_plan(request, pk):
    user = User.objects.filter(pk=pk).first()
    if not user:
        raise NotFound('Conta não encontrada.')
    if request.method == 'PATCH':
        body = request.data if isinstance(request.data, dict) else {}
        up = P.account(user)[2]
        plan_slug = body.get('plan', None)
        if plan_slug is not None and not isinstance(plan_slug, str):
            raise ValidationError({'error': 'unknown_plan'})
        addons = body.get('addons', None)
        if addons is not None:
            if not isinstance(addons, dict) or not all(
                    isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= 1000 for v in addons.values()):
                raise ValidationError({'error': 'invalid_addons'})
        if 'validUntil' in body:
            valid_until = _parse_valid_until(body.get('validUntil'))
        else:
            valid_until = up.valid_until if up else None
        try:
            P.assign_plan(user, plan_slug=plan_slug, addons=addons, valid_until=valid_until,
                          source='free' if plan_slug == P.FREE_SLUG and not addons else 'admin',
                          note=body.get('note') if isinstance(body.get('note'), str) else None)
        except ValueError as e:
            raise ValidationError({'error': str(e)})
    return Response({'userId': user.id, 'email': user.email, **P.account_payload(user)})
