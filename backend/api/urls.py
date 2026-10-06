import importlib

from django.http import JsonResponse
from django.urls import path
from . import views_world
from . import views_checks
from . import views_adventures
from . import views_share
from . import views_admin
from . import views_auth, views_characters, views_campaigns, views_approvals, views_dice, views_screen, views_combat, views_inventory, views_items, views_diary


def _wp2(module, name):
    """Rotas do contrato C1 cujas views são do WP2. Se a função ainda não
    existir no módulo, a rota responde 501 (not_implemented) em vez de quebrar
    o import das URLs; quando existir, é usada direto."""
    mod = importlib.import_module(f'{__package__}.{module}')
    fn = getattr(mod, name, None)
    if fn is not None:
        return fn

    def pending(request, *args, **kwargs):
        real = getattr(importlib.import_module(f'{__package__}.{module}'), name, None)
        if real is not None:
            return real(request, *args, **kwargs)
        return JsonResponse({'error': 'not_implemented', 'detail': f'{module}.{name}'}, status=501)
    pending.csrf_exempt = True  # views DRF fazem a própria checagem de CSRF
    pending.__name__ = name
    return pending


urlpatterns = [
    # Auth
    path('auth/csrf', views_auth.csrf),
    path('auth/signup', views_auth.signup),
    path('auth/login', views_auth.login_view),
    path('auth/logout', views_auth.logout_view),
    path('auth/me', views_auth.me),

    # Characters
    path('characters', views_characters.character_list),
    path('characters/<int:pk>', views_characters.character_detail),
    path('characters/<int:pk>/campaigns', views_characters.character_campaigns),
    path('characters/<int:pk>/dm-edit', views_characters.character_dm_edit),
    path('characters/<int:pk>/cast', views_characters.character_cast_spell),
    path('characters/<int:pk>/rest', views_characters.character_rest),
    path('characters/<int:pk>/level-choice', views_characters.character_level_choice),
    path('characters/<int:pk>/class-options', views_characters.character_class_options),
    path('characters/<int:pk>/resource', views_characters.character_resource),
    path('characters/<int:pk>/inventory', views_inventory.inventory_add),
    path('characters/<int:pk>/inventory/<str:item_id>', views_inventory.inventory_item),
    path('characters/<int:pk>/inventory/<str:item_id>/consume', views_inventory.inventory_consume),
    path('campaigns/<str:id_or_slug>/long-rest-all', views_characters.campaign_long_rest_all),
    path('campaigns/<str:id_or_slug>/short-rest-all', views_characters.campaign_short_rest_all),
    path('characters/<int:pk>/wild-shape/transform', views_characters.wild_shape_transform),
    path('characters/<int:pk>/wild-shape/end', views_characters.wild_shape_end),
    path('characters/<int:pk>/wild-shape/force-end', views_characters.wild_shape_force_end),

    # Campaigns
    path('campaigns', views_campaigns.campaign_list),
    path('campaigns/join', views_campaigns.campaign_join),
    path('campaigns/<str:id_or_slug>', views_campaigns.campaign_detail),
    path('campaigns/<str:id_or_slug>/members/<int:membership_id>', views_campaigns.campaign_member),
    path('campaigns/<str:id_or_slug>/rotate-screen-token', views_campaigns.campaign_rotate_screen),
    path('campaigns/<str:id_or_slug>/rotate-invite-code', views_campaigns.campaign_rotate_invite),
    path('campaigns/<str:id_or_slug>/items', views_items.campaign_items),
    path('campaigns/<str:id_or_slug>/items/<int:item_pk>', views_items.campaign_item_detail),
    # Estado parcial, capa e "Mostrar agora" no telão (WP2, contrato C1)
    path('campaigns/<str:id_or_slug>/state', _wp2('views_campaigns', 'campaign_state_patch')),
    path('campaigns/<str:id_or_slug>/cover', _wp2('views_campaigns', 'campaign_cover')),
    path('campaigns/<str:id_or_slug>/screen-card', _wp2('views_campaigns', 'campaign_screen_card')),

    # Mundo da campanha (lugares, NPCs, facções, itens, lore, documentos)
    path('campaigns/<str:id_or_slug>/world', views_world.world_list),
    path('campaigns/<str:id_or_slug>/world/sample', views_world.world_sample),
    path('campaigns/<str:id_or_slug>/world/seen', views_world.world_seen),
    path('campaigns/<str:id_or_slug>/session-plan', views_world.session_plan),
    path('world/<int:pk>', views_world.world_detail),
    path('world/<int:pk>/image', views_world.world_image),
    path('world/<int:pk>/reveal', views_world.world_reveal),

    path('campaigns/<str:id_or_slug>/diary', views_diary.campaign_diary),
    path('campaigns/<str:id_or_slug>/diary/sessions', views_diary.campaign_diary_start_session),
    path('campaigns/<str:id_or_slug>/diary/sessions/<int:number>', views_diary.campaign_diary_session),
    path('campaigns/<str:id_or_slug>/diary/<int:entry_pk>', views_diary.campaign_diary_entry),

    # Preparação do mestre (aventuras como mapa de salas/cenas) — só mestre
    path('campaigns/<str:id_or_slug>/adventures', views_adventures.adventure_list),
    path('campaigns/<str:id_or_slug>/adventures/<int:pk>', views_adventures.adventure_detail),
    path('campaigns/<str:id_or_slug>/adventures/<int:pk>/play', views_adventures.adventure_play),
    path('campaigns/<str:id_or_slug>/adventures/<int:pk>/screen', views_adventures.adventure_screen),

    # Approvals
    path('approvals/campaign/<str:id_or_slug>', views_approvals.campaign_approvals),
    path('approvals/campaign/<str:id_or_slug>/grant-levelup', views_approvals.campaign_grant_levelup),
    path('campaigns/<str:id_or_slug>/award-xp', views_approvals.campaign_award_xp),
    path('approvals/<int:pk>/review', views_approvals.approval_review),
    path('approvals/<int:pk>/consume', views_approvals.approval_consume),

    # Dice
    path('admin/overview', views_admin.overview),
    path('admin/users', views_admin.users),
    path('admin/users/<int:pk>', views_admin.user_detail),
    path('admin/characters', views_admin.characters),
    path('admin/characters/<int:pk>', views_admin.character_detail),
    path('admin/campaigns', views_admin.campaigns),

    path('shares', views_share.share_create),
    path('shares/<str:token>', views_share.share_get),

    path('dice/roll', views_dice.dice_roll),
    path('dice/campaign/<str:id_or_slug>/rigs', views_dice.campaign_rigs),
    path('dice/campaign/<str:id_or_slug>/log', views_dice.campaign_dice_log),
    path('dice/rigs/<int:pk>', views_dice.rig_detail),

    # Pedido de teste do mestre para a mesa ("Todos: Percepção CD 15")
    path('checks/mine', views_checks.my_checks),
    path('checks/campaign/<str:id_or_slug>', views_checks.campaign_checks),
    path('checks/<int:pk>', views_checks.check_detail),
    path('checks/<int:pk>/respond', views_checks.check_respond),
    path('checks/<int:pk>/close', views_checks.check_close),
    path('checks/<int:pk>/screen', views_checks.check_screen),

    # Screen (público)
    path('screen/<str:token>', views_screen.screen),
    path('screen/<str:token>/rolls', views_combat.roll_public_screen),
    path('screen/<str:token>/image/<int:entry_id>', _wp2('views_screen', 'screen_image')),
    path('screen/<str:token>/cover', _wp2('views_screen', 'screen_cover')),

    # Combat
    path('combat/campaign/<str:id_or_slug>', views_combat.combat_get),
    path('combat/campaign/<str:id_or_slug>/start', views_combat.combat_start),
    path('combat/campaign/<str:id_or_slug>/end', views_combat.combat_end),
    path('combat/campaign/<str:id_or_slug>/reset', views_combat.combat_reset),
    path('combat/campaign/<str:id_or_slug>/combatants', views_combat.combat_add_combatant),
    path('combat/campaign/<str:id_or_slug>/combatants/<str:combatant_id>', views_combat.combat_combatant),
    path('combat/campaign/<str:id_or_slug>/action', views_combat.combat_action),
    path('combat/campaign/<str:id_or_slug>/player-attack', views_combat.combat_player_attack),
    path('combat/campaign/<str:id_or_slug>/attack-preview', _wp2('views_combat', 'combat_attack_preview')),
    path('combat/campaign/<str:id_or_slug>/next-turn', views_combat.combat_next_turn),
    path('combat/campaign/<str:id_or_slug>/map', views_combat.combat_set_map),

    # RollRequest
    path('rolls/campaign/<str:id_or_slug>', views_combat.roll_create),
    path('rolls/campaign/<str:id_or_slug>/pending', views_combat.roll_list_pending),
    path('rolls/campaign/<str:id_or_slug>/recent', views_combat.roll_list_recent),
    path('rolls/<int:pk>/resolve', views_combat.roll_resolve),
    path('rolls/<int:pk>/cancel', views_combat.roll_cancel),
]
