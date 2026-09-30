import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_campaign_items'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DiaryEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session', models.IntegerField(blank=True, null=True)),
                ('kind', models.CharField(choices=[('note', 'Note'), ('event', 'Event')], default='note', max_length=10)),
                ('subtype', models.CharField(default='note', max_length=20)),
                ('title', models.CharField(blank=True, default='', max_length=200)),
                ('body', models.TextField(blank=True, default='')),
                ('data', models.JSONField(blank=True, default=dict)),
                ('occurred_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('hidden', models.BooleanField(default=False)),
                ('edited_at', models.DateTimeField(blank=True, null=True)),
                ('campaign', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='diary_entries', to='api.campaign')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='diary_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-occurred_at', '-id'],
                'indexes': [models.Index(fields=['campaign', 'session'], name='api_diaryen_campaig_bacbdb_idx'), models.Index(fields=['campaign', '-occurred_at'], name='api_diaryen_campaig_d833cd_idx')],
            },
        ),
    ]
