"""Suporte a múltiplos personagens por usuário na mesma campanha e toggle de NPC pelo mestre."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_profile_must_change_password'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='membership',
            unique_together=set(),
        ),
        migrations.AddField(
            model_name='membership',
            name='char_type',
            field=models.CharField(choices=[('player', 'Player'), ('npc', 'NPC')], default='player', max_length=10),
        ),
        migrations.AddField(
            model_name='membership',
            name='is_npc',
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name='membership',
            index=models.Index(fields=['user'], name='api_members_user_id_idx'),
        ),
        migrations.AddIndex(
            model_name='membership',
            index=models.Index(fields=['campaign', 'character'], name='api_members_camp_char_idx'),
        ),
    ]
