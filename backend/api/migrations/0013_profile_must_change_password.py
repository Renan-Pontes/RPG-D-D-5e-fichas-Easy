"""Senha temporária: o admin define, o usuário troca no próximo login."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_seed_plans'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='must_change_password',
            field=models.BooleanField(default=False),
        ),
    ]
