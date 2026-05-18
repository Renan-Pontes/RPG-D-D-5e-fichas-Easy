"""Helpers de permissão para campanha/personagem."""
from rest_framework.exceptions import PermissionDenied, NotFound
from .models import Campaign, Character, Membership


def get_campaign_or_404(id_or_slug):
    qs = Campaign.objects.filter(id=id_or_slug) if str(id_or_slug).isdigit() else Campaign.objects.none()
    obj = qs.first() or Campaign.objects.filter(slug=id_or_slug).first()
    if not obj:
        raise NotFound('campaign_not_found')
    return obj


def is_dm(user, campaign):
    return user.is_authenticated and campaign.dm_id == user.id


def get_membership(user, campaign):
    if not user.is_authenticated:
        return None
    return Membership.objects.filter(campaign=campaign, user=user).first()


def require_member(user, campaign):
    if is_dm(user, campaign):
        return None
    m = get_membership(user, campaign)
    if not m:
        raise PermissionDenied('not_a_member')
    return m


def require_dm(user, campaign):
    if not is_dm(user, campaign):
        raise PermissionDenied('dm_only')


def can_read_character(user, character):
    if not user.is_authenticated:
        return False
    if character.owner_id == user.id:
        return True
    # DM da campanha em que o personagem está
    return Membership.objects.filter(
        character=character,
        campaign__dm=user,
    ).exists()
