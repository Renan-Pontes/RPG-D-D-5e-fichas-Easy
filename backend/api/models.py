"""
Models do app api — fichas, campanhas, aprovações e dados.
"""
import secrets
import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


# === Geradores ===
SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # sem 0/O/1/I


def new_slug(n=10):
    return ''.join(secrets.choice(SLUG_ALPHABET) for _ in range(n))


def new_invite_code(n=6):
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(n))


def new_screen_token():
    return secrets.token_hex(16)


def slugify_clean(text):
    out = []
    for ch in (text or '').lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in ' -_':
            out.append('-')
    s = ''.join(out).strip('-')[:40]
    return s or new_slug()


# === Profile (para display_name) ===
class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=80)

    def __str__(self):
        return self.display_name


# === Character ===
class Character(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='characters')
    name = models.CharField(max_length=120)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['owner', '-updated_at'])]

    def __str__(self):
        return self.name


# === Campaign ===
class Campaign(models.Model):
    dm = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_campaigns')
    name = models.CharField(max_length=120)
    slug = models.CharField(max_length=80, unique=True)
    screen_token = models.CharField(max_length=64, unique=True, default=new_screen_token)
    invite_code = models.CharField(max_length=10, unique=True, default=new_invite_code)
    description = models.TextField(blank=True, default='')
    state = models.JSONField(default=dict)  # iniciativa, cena, sessão, etc
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['dm'])]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify_clean(self.name)
            slug = base
            attempt = 0
            while Campaign.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                attempt += 1
                slug = f'{base}-{new_slug(4)}'
                if attempt > 5:
                    slug = new_slug()
                    break
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# === Membership ===
class Membership(models.Model):
    ROLE_CHOICES = [('player', 'Player'), ('dm', 'DM')]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships')
    character = models.ForeignKey(Character, on_delete=models.SET_NULL, null=True, blank=True, related_name='memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='player')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('campaign', 'user')]
        indexes = [models.Index(fields=['user'])]


# === Approval ===
class Approval(models.Model):
    TYPE_CHOICES = [
        ('levelup', 'Level up'),
        ('feature', 'Feature'),
        ('item', 'Item'),
        ('spell', 'Spell'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='approvals')
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='approvals')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='approvals_requested')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approvals_reviewed')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    note = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['campaign', 'status'])]


# === DiceRig ===
class DiceRig(models.Model):
    DICE_CHOICES = [
        ('d4', 'd4'), ('d6', 'd6'), ('d8', 'd8'), ('d10', 'd10'),
        ('d12', 'd12'), ('d20', 'd20'), ('d100', 'd100'), ('any', 'any'),
    ]
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='dice_rigs')
    target_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dice_rigs')
    dice_type = models.CharField(max_length=10, choices=DICE_CHOICES, default='d20')
    # values: [{value: int, consumed: bool, label?: str, consumed_at?: iso}]
    values = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['campaign', 'target_user'])]


# === DiceLog ===
class DiceLog(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.SET_NULL, null=True, blank=True, related_name='dice_logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dice_logs')
    dice_type = models.CharField(max_length=10)
    result = models.IntegerField()
    rigged = models.BooleanField(default=False)
    label = models.CharField(max_length=120, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['campaign']), models.Index(fields=['user'])]
