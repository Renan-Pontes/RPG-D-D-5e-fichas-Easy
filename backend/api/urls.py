from django.urls import path
from . import views_auth, views_characters, views_campaigns, views_approvals, views_dice, views_screen

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

    # Campaigns
    path('campaigns', views_campaigns.campaign_list),
    path('campaigns/join', views_campaigns.campaign_join),
    path('campaigns/<str:id_or_slug>', views_campaigns.campaign_detail),
    path('campaigns/<str:id_or_slug>/members/<int:membership_id>', views_campaigns.campaign_member),
    path('campaigns/<str:id_or_slug>/rotate-screen-token', views_campaigns.campaign_rotate_screen),
    path('campaigns/<str:id_or_slug>/rotate-invite-code', views_campaigns.campaign_rotate_invite),

    # Approvals
    path('approvals/campaign/<str:id_or_slug>', views_approvals.campaign_approvals),
    path('approvals/<int:pk>/review', views_approvals.approval_review),

    # Dice
    path('dice/roll', views_dice.dice_roll),
    path('dice/campaign/<str:id_or_slug>/rigs', views_dice.campaign_rigs),
    path('dice/campaign/<str:id_or_slug>/log', views_dice.campaign_dice_log),
    path('dice/rigs/<int:pk>', views_dice.rig_detail),

    # Screen (público)
    path('screen/<str:token>', views_screen.screen),
]
