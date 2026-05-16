from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import (
    Profile, Character, Campaign, Membership, Approval, DiceRig, DiceLog,
)

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
    class Meta:
        model = Character
        fields = ['id', 'name', 'data', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


# === Campaign ===
class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    character = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ['id', 'user', 'character', 'role', 'joined_at']

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
                'currentHp': d.get('currentHp'),
                'maxHp': d.get('maxHp'),
                'tempHp': d.get('tempHp', 0),
                'conditions': d.get('conditions', []),
                'avatar': d.get('avatar', ''),
            },
        }


class CampaignSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    inviteCode = serializers.CharField(source='invite_code', read_only=True)
    screenToken = serializers.CharField(source='screen_token', read_only=True)
    dmId = serializers.IntegerField(source='dm_id', read_only=True)

    class Meta:
        model = Campaign
        fields = ['id', 'name', 'slug', 'description', 'state', 'role',
                  'members', 'inviteCode', 'screenToken', 'dmId',
                  'created_at', 'updated_at']

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
        is_dm = bool(request and request.user.is_authenticated and obj.dm_id == request.user.id)
        # select_related para evitar N+1 em user.profile e character
        members = (
            obj.memberships
            .select_related('user', 'user__profile', 'character')
            .all()
        )
        ms = MembershipSerializer(members, many=True, context={'request': request, 'is_dm': is_dm}).data
        return ms

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        is_dm = bool(request and request.user.is_authenticated and instance.dm_id == request.user.id)
        if not is_dm:
            # esconde tokens privados para não-DM
            data.pop('inviteCode', None)
            data.pop('screenToken', None)
        return data


class CampaignListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = ['id', 'name', 'slug', 'description', 'state', 'role']

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
    requested_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
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
        return {'id': obj.character_id, 'name': obj.character.name} if obj.character else None

    def get_requestedBy(self, obj):
        return UserSerializer(obj.requested_by).data if obj.requested_by else None

    def get_reviewedBy(self, obj):
        return UserSerializer(obj.reviewed_by).data if obj.reviewed_by else None


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
