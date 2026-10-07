"""Painel do Django (/admin/): tudo registrado para consulta e correções pontuais."""
from django.contrib import admin

from . import models as m


@admin.register(m.Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'user')
    search_fields = ('display_name', 'user__email')


@admin.register(m.Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'class_name', 'level', 'rules', 'updated_at')
    search_fields = ('name', 'owner__email')
    list_select_related = ('owner',)
    date_hierarchy = 'created_at'

    @admin.display(description='Classe')
    def class_name(self, obj):
        return (obj.data or {}).get('className', '')

    @admin.display(description='Nível')
    def level(self, obj):
        return (obj.data or {}).get('level', 1)

    @admin.display(description='Regras')
    def rules(self, obj):
        return (obj.data or {}).get('rulesVersion', '2014')


class MembershipInline(admin.TabularInline):
    model = m.Membership
    extra = 0
    raw_id_fields = ('user', 'character')


@admin.register(m.Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'dm', 'slug', 'invite_code', 'status', 'closed_at', 'updated_at')
    list_filter = ('status',)
    search_fields = ('name', 'slug', 'dm__email')
    inlines = [MembershipInline]


@admin.register(m.SharedCharacter)
class SharedCharacterAdmin(admin.ModelAdmin):
    list_display = ('token', 'owner', 'created_at', 'expires_at')
    search_fields = ('token', 'owner__email')


class WorldImageInline(admin.StackedInline):
    model = m.WorldImage
    extra = 0
    readonly_fields = ('data',)
    can_delete = True


@admin.register(m.WorldEntry)
class WorldEntryAdmin(admin.ModelAdmin):
    list_display = ('name', 'kind', 'visibility', 'campaign', 'updated_at')
    list_filter = ('kind', 'visibility')
    search_fields = ('name', 'summary', 'campaign__name')
    list_select_related = ('campaign',)
    raw_id_fields = ('campaign', 'parent')
    inlines = [WorldImageInline]


@admin.register(m.WorldImage)
class WorldImageAdmin(admin.ModelAdmin):
    list_display = ('entry',)
    raw_id_fields = ('entry',)
    readonly_fields = ('data',)


for model in (m.Membership, m.Approval, m.DiceRig, m.DiceLog, m.CombatInstance, m.RollRequest,
              m.CampaignItem, m.DiaryEntry, m.CheckRequest, m.CheckResponse, m.Adventure):
    admin.site.register(model)

# === Planos (api/plans.py) — editáveis aqui; o app lê os valores na hora ===
@admin.register(m.Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('slug', 'name_pt', 'price_cents', 'max_characters', 'max_campaigns',
                    'table_slots', 'storage_mb', 'order', 'active')
    list_editable = ('price_cents', 'max_characters', 'max_campaigns', 'table_slots', 'storage_mb',
                     'order', 'active')


@admin.register(m.AddOn)
class AddOnAdmin(admin.ModelAdmin):
    list_display = ('slug', 'name_pt', 'kind', 'amount', 'price_cents', 'order', 'active')
    list_editable = ('amount', 'price_cents', 'order', 'active')


@admin.register(m.UserPlan)
class UserPlanAdmin(admin.ModelAdmin):
    """Plano de cada conta. `addons` = {"slug do extra": quantidade}, ex. {"storage": 2}.
    Conta sem registro (ou vencida) usa o plano Grátis."""
    list_display = ('user', 'plan', 'addons', 'valid_until', 'source', 'updated_at')
    list_filter = ('plan', 'source')
    search_fields = ('user__email', 'note')
    raw_id_fields = ('user',)
    list_select_related = ('user', 'plan')


admin.site.site_header = 'Forja de Heróis — administração'
admin.site.site_title = 'Forja admin'
