"""A 0014 criou um índice em Membership.user que já existia desde a 0001; tira a cópia."""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_membership_npc_and_multi_characters'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='membership',
            name='api_members_user_id_idx',
        ),
    ]
