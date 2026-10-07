from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import (
    Profile, Character, Campaign, Membership, Approval, DiceRig, DiceLog,
)
from .progression.multiclass import class_entries

User = get_user_model()


# === User ===
class UserSerializer(serializers.ModelSerializer):
    displayName = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'displayName']

    def get_displayName(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.display_name
        return obj.email.split('@')[0] if obj.email else obj.username


class PublicUserSerializer(UserSerializer):
    """Usuário visto por outra pessoa da mesa: só id e nome de exibição.
    E-mail é dado pessoal — só o próprio usuário e o mestre da mesa o veem."""
    class Meta(UserSerializer.Meta):
        fields = ['id', 'displayName']


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=200)
    password = serializers.CharField(min_length=6, max_length=200, write_only=True)
    displayName = serializers.CharField(min_length=1, max_length=80, required=False)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('email_taken')
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=200)
    password = serializers.CharField(max_length=200, write_only=True)


# === Character ===
class CharacterSerializer(serializers.ModelSerializer):
    inCampaign = serializers.SerializerMethodField()
    campaignLeveling = serializers.SerializerMethodField()
    tableSlot = serializers.SerializerMethodField()

    class Meta:
        model = Character
        fields = ['id', 'name', 'data', 'created_at', 'updated_at', 'inCampaign', 'campaignLeveling', 'tableSlot']
        read_only_fields = ['id', 'created_at', 'updated_at', 'inCampaign', 'campaignLeveling', 'tableSlot']

    def get_tableSlot(self, obj):
        """Ficha numa VAGA DE MESA (não conta no limite do jogador): {campaignId,
        campaignName, dmName, status, purgeAt} — "usa uma vaga da mesa de <Mestre>"."""
        from .models import Membership
        from .plans import dm_display_name, purge_at
        m = (Membership.objects.filter(character=obj, sponsored=True)
             .select_related('campaign', 'campaign__dm', 'campaign__dm__profile').first())
        if not m:
            return None
        c = m.campaign
        p = purge_at(c)
        return {'campaignId': c.id, 'campaignName': c.name, 'dmName': dm_display_name(c.dm),
                'status': c.status, 'purgeAt': p.isoformat() if p else None}

    def get_inCampaign(self, obj):
        from .models import Membership
        return Membership.objects.filter(character=obj).exists()

    def get_campaignLeveling(self, obj):
        """Modo de progressão da campanha do personagem ('xp' | 'milestone'), ou None fora de campanha."""
        from .models import Membership
        m = Membership.objects.filter(character=obj).select_related('campaign').first()
        if not m:
            return None
        return 'xp' if (m.campaign.state or {}).get('levelingMode') == 'xp' else 'milestone'


# === Campaign ===
class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    character = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ['id', 'user', 'character', 'role', 'joined_at', 'sponsored']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        viewer_id = getattr(getattr(request, 'user', None), 'id', None)
        if not self.context.get('is_dm', False) and instance.user_id != viewer_id \
                and isinstance(data.get('user'), dict):
            data['user'].pop('email', None)   # jogador vê só o nome dos colegas
        return data

    def get_character(self, obj):
        if not obj.character:
            return None
        request = self.context.get('request')
        is_dm = self.context.get('is_dm', False)
        # DM ou dono vê data completo; outros, só sumário público
        if is_dm or (request and obj.character.owner_id == request.user.id):
            return {
                'id': obj.character.id,
                'name': obj.character.name,
                'data': obj.character.data,
            }
        d = obj.character.data or {}
        return {
            'id': obj.character.id,
            'name': obj.character.name,
            'summary': {
                'race': d.get('race', ''),
                'className': d.get('className', ''),
                'level': d.get('level', 1),
                'classes': [{'id': e['id'], 'level': e['level'], 'subclass': e['subclass']} for e in class_entries(d)] if d.get('className') else [],
                'currentHp': d.get('currentHp'),
                'maxHp': d.get('maxHp'),
                'tempHp': d.get('tempHp', 0),
                'conditions': d.get('conditions', []),
                'avatar': d.get('avatar', ''),
                'cheatMode': bool(d.get('cheatMode')),
            },
        }


def _viewer_is_dm(serializer, obj):
    request = serializer.context.get('request')
    return bool(request and request.user.is_authenticated and obj.dm_id == request.user.id)


def _lifecycle(data, obj):
    """status/closedAt/purgeAt (campanha encerrada = somente leitura até purgeAt)."""
    from .plans import purge_at
    p = purge_at(obj)
    data['status'] = obj.status
    data['closedAt'] = obj.closed_at.isoformat() if obj.closed_at else None
    data['purgeAt'] = p.isoformat() if p else None
    return data


def _cover_url(obj):
    return f'/api/campaigns/{obj.id}/cover?v={obj.cover_ver}' if getattr(obj, 'cover_ver', '') else None


class CampaignSerializer(serializers.ModelSerializer):
    """Campanha completa (contrato C3).

    Mestre: state inteiro, inviteCode, screenToken, onboarding, advancedDice,
    pendingApprovals. Jogador: state recortado (campaign_state.PLAYER_KEYS),
    worldNewCount e o cartão do telão resolvido (screenCard) para o toast
    "O mestre revelou…"."""
    role = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    inviteCode = serializers.CharField(source='invite_code', read_only=True)
    screenToken = serializers.CharField(source='screen_token', read_only=True)
    dmId = serializers.IntegerField(source='dm_id', read_only=True)
    coverVer = serializers.CharField(source='cover_ver', read_only=True)
    coverUrl = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = ['id', 'name', 'slug', 'description', 'state', 'role',
                  'members', 'inviteCode', 'screenToken', 'dmId',
                  'tagline', 'accent', 'tone', 'coverVer', 'coverUrl',
                  'created_at', 'updated_at']

    def get_coverUrl(self, obj):
        return _cover_url(obj)

    def get_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        if obj.dm_id == request.user.id:
            return 'dm'
        m = obj.memberships.filter(user=request.user).first()
        return m.role if m else None

    def get_members(self, obj):
        request = self.context.get('request')
        is_dm = _viewer_is_dm(self, obj)
        # select_related para evitar N+1 em user.profile e character
        members = (
            obj.memberships
            .select_related('user', 'user__profile', 'character')
            .all()
        )
        ms = MembershipSerializer(members, many=True, context={'request': request, 'is_dm': is_dm}).data
        return ms

    def to_representation(self, instance):
        from .campaign_state import public_state, PLAYER_KEYS
        from .screen_card import resolve_screen_card
        data = super().to_representation(instance)
        request = self.context.get('request')
        is_dm = _viewer_is_dm(self, instance)
        _lifecycle(data, instance)
        data['screenCard'] = resolve_screen_card(instance)
        settings = instance.dm_settings if isinstance(instance.dm_settings, dict) else {}
        # "Mundo vivo" (padrão ligado): o jogador precisa saber para mostrar os ecos
        data['immersion'] = settings.get('immersion') is not False
        if is_dm:
            data['onboarding'] = settings.get('onboarding') or {}
            data['advancedDice'] = bool(settings.get('advancedDice'))
            data['fogHint'] = settings.get('fogHint') is True
            data['pendingApprovals'] = instance.approvals.filter(status='pending').count()
            from .plans import slots_info
            data['tableSlots'] = slots_info(instance)   # vagas de mesa {used, max}
        else:
            # esconde tokens privados e o que é só do mestre (nudges, concentração,
            # diarySessions, screenCard cru…) para não-DM
            data.pop('inviteCode', None)
            data.pop('screenToken', None)
            data['state'] = public_state(instance.state, PLAYER_KEYS)
            data['worldNewCount'] = _world_new_count(instance, request)
        return data


def _world_new_count(campaign, request):
    """Entradas do Mundo reveladas depois da última visita do jogador à aba Mundo
    (mesma regra do WP1: views_world.world_new_count, que respeita handouts)."""
    from .models import Membership
    if not request or not request.user.is_authenticated:
        return 0
    m = Membership.objects.filter(campaign=campaign, user=request.user).first()
    try:
        from .views_world import world_new_count
    except ImportError:  # pragma: no cover — Mundo ainda não instalado
        return 0
    return world_new_count(campaign, m)


class CampaignListSerializer(serializers.ModelSerializer):
    """Lista de campanhas: leve, sem segredos. state só com o recorte público
    (sessão, cena, clima, ao vivo) — nunca nudges, concentração ou diarySessions."""
    role = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()
    coverVer = serializers.CharField(source='cover_ver', read_only=True)
    coverUrl = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = ['id', 'name', 'slug', 'description', 'state', 'role',
                  'tagline', 'accent', 'tone', 'coverVer', 'coverUrl']

    def get_state(self, obj):
        from .campaign_state import public_state
        return public_state(obj.state)

    def to_representation(self, instance):
        return _lifecycle(super().to_representation(instance), instance)

    def get_coverUrl(self, obj):
        return _cover_url(obj)

    def get_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        if obj.dm_id == request.user.id:
            return 'dm'
        m = obj.memberships.filter(user=request.user).first()
        return m.role if m else None


# === Approval ===
class ApprovalSerializer(serializers.ModelSerializer):
    # Sem e-mail: o jogador lê as próprias aprovações e o revisor é o mestre.
    requested_by = PublicUserSerializer(read_only=True)
    reviewed_by = PublicUserSerializer(read_only=True)
    character = serializers.SerializerMethodField()
    requestedBy = serializers.SerializerMethodField()
    reviewedBy = serializers.SerializerMethodField()

    class Meta:
        model = Approval
        fields = ['id', 'type', 'payload', 'status', 'note',
                  'created_at', 'reviewed_at',
                  'character', 'requested_by', 'reviewed_by',
                  'requestedBy', 'reviewedBy']

    def get_character(self, obj):
        if not obj.character:
            return None
        d = obj.character.data or {}
        # Resumo para o mestre decidir a subida sem abrir a ficha.
        return {
            'id': obj.character_id, 'name': obj.character.name,
            'level': d.get('level', 1), 'maxHp': d.get('maxHp'),
            'classes': [{'id': e['id'], 'level': e['level']} for e in class_entries(d)] if d.get('className') else [],
        }

    def get_requestedBy(self, obj):
        return PublicUserSerializer(obj.requested_by).data if obj.requested_by else None

    def get_reviewedBy(self, obj):
        return PublicUserSerializer(obj.reviewed_by).data if obj.reviewed_by else None


# === DiceRig ===
class DiceRigSerializer(serializers.ModelSerializer):
    targetUser = serializers.SerializerMethodField()
    targetUserId = serializers.IntegerField(source='target_user_id', read_only=True)
    diceType = serializers.CharField(source='dice_type')

    class Meta:
        model = DiceRig
        fields = ['id', 'targetUserId', 'targetUser', 'diceType', 'values',
                  'created_at', 'updated_at']

    def get_targetUser(self, obj):
        return UserSerializer(obj.target_user).data if obj.target_user else None


class DiceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiceLog
        fields = ['id', 'campaign_id', 'user_id', 'dice_type', 'result', 'rigged', 'label', 'created_at']
