import importlib

from django.http import JsonResponse
from django.urls import path
from . import views_world
from . import views_checks
from . import views_adventures
from . import views_ready
from . import views_share
from . import views_admin
from . import views_plans
from .plans import closed_guard
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


# Campanha encerrada é SOMENTE LEITURA: closed_guard responde 423
# campaign_closed a qualquer escrita nas rotas de campanha (ver api/plans.py).
# Livres: DELETE da campanha (encerrar de novo é idempotente), /close, /reopen,
# world/seen e world/<pk>/view (marcas pessoais de leitura).
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
    path('characters/<int:pk>/dm-edit', closed_guard(views_characters.character_dm_edit, 'character')),
    path('characters/<int:pk>/cast', views_characters.character_cast_spell),
    path('characters/<int:pk>/rest', views_characters.character_rest),
    path('characters/<int:pk>/level-choice', views_characters.character_level_choice),
    path('characters/<int:pk>/class-options', views_characters.character_class_options),
    path('characters/<int:pk>/resource', views_characters.character_resource),
    path('characters/<int:pk>/inventory', views_inventory.inventory_add),
    path('characters/<int:pk>/inventory/<str:item_id>', views_inventory.inventory_item),
    path('characters/<int:pk>/inventory/<str:item_id>/consume', views_inventory.inventory_consume),
    path('campaigns/<str:id_or_slug>/long-rest-all', closed_guard(views_characters.campaign_long_rest_all, 'campaign')),
    path('campaigns/<str:id_or_slug>/short-rest-all', closed_guard(views_characters.campaign_short_rest_all, 'campaign')),
    path('characters/<int:pk>/wild-shape/transform', views_characters.wild_shape_transform),
    path('characters/<int:pk>/wild-shape/end', views_characters.wild_shape_end),
    path('characters/<int:pk>/wild-shape/force-end', views_characters.wild_shape_force_end),

    # Campaigns
    path('campaigns', views_campaigns.campaign_list),
    path('campaigns/join', views_campaigns.campaign_join),
    path('campaigns/<str:id_or_slug>', closed_guard(views_campaigns.campaign_detail, 'campaign', allow=('DELETE',))),
    path('campaigns/<str:id_or_slug>/members/<int:membership_id>', closed_guard(views_campaigns.campaign_member, 'campaign')),
    path('campaigns/<str:id_or_slug>/close', views_campaigns.campaign_close),
    path('campaigns/<str:id_or_slug>/reopen', views_campaigns.campaign_reopen),
    path('campaigns/<str:id_or_slug>/leave', closed_guard(views_campaigns.campaign_leave, 'campaign')),
    path('campaigns/<str:id_or_slug>/rotate-screen-token', closed_guard(views_campaigns.campaign_rotate_screen, 'campaign')),
    path('campaigns/<str:id_or_slug>/rotate-invite-code', closed_guard(views_campaigns.campaign_rotate_invite, 'campaign')),
    path('campaigns/<str:id_or_slug>/items', closed_guard(views_items.campaign_items, 'campaign')),
    path('campaigns/<str:id_or_slug>/items/<int:item_pk>', closed_guard(views_items.campaign_item_detail, 'campaign')),
    # Estado parcial, capa e "Mostrar agora" no telão (WP2, contrato C1)
    path('campaigns/<str:id_or_slug>/state', closed_guard(_wp2('views_campaigns', 'campaign_state_patch'), 'campaign')),
    path('campaigns/<str:id_or_slug>/cover', closed_guard(_wp2('views_campaigns', 'campaign_cover'), 'campaign')),
    path('campaigns/<str:id_or_slug>/screen-card', closed_guard(_wp2('views_campaigns', 'campaign_screen_card'), 'campaign')),

    # Mundo da campanha (lugares, NPCs, facções, itens, lore, documentos)
    path('campaigns/<str:id_or_slug>/world', closed_guard(views_world.world_list, 'campaign')),
    path('campaigns/<str:id_or_slug>/world/sample', closed_guard(views_world.world_sample, 'campaign')),
    path('campaigns/<str:id_or_slug>/world/clear', closed_guard(views_world.world_clear, 'campaign')),
    path('campaigns/<str:id_or_slug>/world/seen', views_world.world_seen),
    path('campaigns/<str:id_or_slug>/world/echoes', closed_guard(views_world.world_echoes, 'campaign')),
    path('campaigns/<str:id_or_slug>/session-plan', closed_guard(views_world.session_plan, 'campaign')),
    path('world/<int:pk>', closed_guard(views_world.world_detail, 'world')),
    path('world/<int:pk>/image', closed_guard(views_world.world_image, 'world')),
    path('world/<int:pk>/reveal', closed_guard(views_world.world_reveal, 'world')),
    path('world/<int:pk>/react', closed_guard(views_world.world_react, 'world')),
    path('world/<int:pk>/view', views_world.world_view),

    path('campaigns/<str:id_or_slug>/diary', closed_guard(views_diary.campaign_diary, 'campaign')),
    path('campaigns/<str:id_or_slug>/diary/sessions', closed_guard(views_diary.campaign_diary_start_session, 'campaign')),
    path('campaigns/<str:id_or_slug>/diary/sessions/<int:number>', closed_guard(views_diary.campaign_diary_session, 'campaign')),
    path('campaigns/<str:id_or_slug>/diary/<int:entry_pk>', closed_guard(views_diary.campaign_diary_entry, 'campaign')),

    # Preparação do mestre (aventuras como mapa de salas/cenas) — só mestre
    path('campaigns/<str:id_or_slug>/adventures', closed_guard(views_adventures.adventure_list, 'campaign')),
    path('campaigns/<str:id_or_slug>/adventures/<int:pk>', closed_guard(views_adventures.adventure_detail, 'campaign')),
    path('campaigns/<str:id_or_slug>/adventures/<int:pk>/play', closed_guard(views_adventures.adventure_play, 'campaign')),
    path('campaigns/<str:id_or_slug>/adventures/<int:pk>/screen', closed_guard(views_adventures.adventure_screen, 'campaign')),
    # Aventuras prontas da Forja (pacotes originais: mundo + aventura)
    path('ready-adventures', views_ready.ready_catalog),
    path('campaigns/<str:id_or_slug>/ready-adventure', closed_guard(views_ready.campaign_ready_adventure, 'campaign')),

    # Approvals
    path('approvals/campaign/<str:id_or_slug>', closed_guard(views_approvals.campaign_approvals, 'campaign')),
    path('approvals/campaign/<str:id_or_slug>/grant-levelup', closed_guard(views_approvals.campaign_grant_levelup, 'campaign')),
    path('campaigns/<str:id_or_slug>/award-xp', closed_guard(views_approvals.campaign_award_xp, 'campaign')),
    path('approvals/<int:pk>/review', closed_guard(views_approvals.approval_review, 'approval')),
    path('approvals/<int:pk>/consume', closed_guard(views_approvals.approval_consume, 'approval')),

    # Dice
    path('admin/overview', views_admin.overview),
    path('admin/users', views_admin.users),
    path('admin/users/<int:pk>', views_admin.user_detail),
    path('admin/characters', views_admin.characters),
    path('admin/characters/<int:pk>', views_admin.character_detail),
    path('admin/campaigns', views_admin.campaigns),

    path('admin/users/<int:pk>/plan', views_plans.admin_user_plan),

    # Planos (limites da conta; pagamento ainda não — ver api/plans.py)
    path('plans', views_plans.plan_catalog),
    path('me/plan', views_plans.my_plan),
    path('me/plan/checkout', views_plans.my_plan_checkout),

    path('shares', views_share.share_create),
    path('shares/<str:token>', views_share.share_get),

    path('dice/roll', views_dice.dice_roll),
    path('dice/campaign/<str:id_or_slug>/rigs', closed_guard(views_dice.campaign_rigs, 'campaign')),
    path('dice/campaign/<str:id_or_slug>/log', closed_guard(views_dice.campaign_dice_log, 'campaign')),
    path('dice/rigs/<int:pk>', closed_guard(views_dice.rig_detail, 'rig')),

    # Pedido de teste do mestre para a mesa ("Todos: Percepção CD 15")
    path('checks/mine', views_checks.my_checks),
    path('checks/campaign/<str:id_or_slug>', closed_guard(views_checks.campaign_checks, 'campaign')),
    path('checks/<int:pk>', closed_guard(views_checks.check_detail, 'check')),
    path('checks/<int:pk>/respond', closed_guard(views_checks.check_respond, 'check')),
    path('checks/<int:pk>/close', closed_guard(views_checks.check_close, 'check')),
    path('checks/<int:pk>/screen', closed_guard(views_checks.check_screen, 'check')),

    # Prévia do convite. Fica DEPOIS das rotas campaigns/<id_or_slug>/<literal>:
    # códigos são maiúsculos, então nunca sombreiam essas rotas (case-sensitive).
    path('campaigns/invite/<str:code>', views_campaigns.campaign_invite_preview),
    path('campaigns/invite/<str:code>/cover', views_campaigns.campaign_invite_cover),

    # Screen (público)
    path('screen/<str:token>', views_screen.screen),
    path('screen/<str:token>/rolls', views_combat.roll_public_screen),
    path('screen/<str:token>/image/<int:entry_id>', _wp2('views_screen', 'screen_image')),
    path('screen/<str:token>/cover', _wp2('views_screen', 'screen_cover')),
    path('screen/<str:token>/map', views_screen.screen_map),

    # Combat
    path('combat/campaign/<str:id_or_slug>', closed_guard(views_combat.combat_get, 'campaign')),
    path('combat/campaign/<str:id_or_slug>/start', closed_guard(views_combat.combat_start, 'campaign')),
    path('combat/campaign/<str:id_or_slug>/end', closed_guard(views_combat.combat_end, 'campaign')),
    path('combat/campaign/<str:id_or_slug>/reset', closed_guard(views_combat.combat_reset, 'campaign')),
    path('combat/campaign/<str:id_or_slug>/combatants', closed_guard(views_combat.combat_add_combatant, 'campaign')),
    path('combat/campaign/<str:id_or_slug>/combatants/<str:combatant_id>', closed_guard(views_combat.combat_combatant, 'campaign')),
    path('combat/campaign/<str:id_or_slug>/action', closed_guard(views_combat.combat_action, 'campaign')),
    path('combat/campaign/<str:id_or_slug>/player-attack', closed_guard(views_combat.combat_player_attack, 'campaign')),
    path('combat/campaign/<str:id_or_slug>/attack-preview', closed_guard(_wp2('views_combat', 'combat_attack_preview'), 'campaign')),
    path('combat/campaign/<str:id_or_slug>/next-turn', closed_guard(views_combat.combat_next_turn, 'campaign')),
    path('combat/campaign/<str:id_or_slug>/map', closed_guard(views_combat.combat_set_map, 'campaign')),

    # RollRequest
    path('rolls/campaign/<str:id_or_slug>', closed_guard(views_combat.roll_create, 'campaign')),
    path('rolls/campaign/<str:id_or_slug>/pending', closed_guard(views_combat.roll_list_pending, 'campaign')),
    path('rolls/campaign/<str:id_or_slug>/recent', closed_guard(views_combat.roll_list_recent, 'campaign')),
    path('rolls/<int:pk>/resolve', closed_guard(views_combat.roll_resolve, 'roll')),
    path('rolls/<int:pk>/cancel', closed_guard(views_combat.roll_cancel, 'roll')),
]
