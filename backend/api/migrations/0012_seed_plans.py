"""Cria os 4 planos e os 4 extras decididos pelo dono (DECISIONS.md › Planos).
Idempotente (update_or_create por slug) e sem apagar nada na volta: os valores
depois podem ser ajustados no Django admin."""
from django.db import migrations

PLANS = [
    # slug, pt, en, preço (centavos), personagens, campanhas, vagas/campanha, MB, ordem
    ('free', 'Grátis', 'Free', 0, 3, 1, 0, 25, 0),
    ('player', 'Jogador', 'Player', 490, 30, 1, 0, 50, 10),
    ('dm', 'Mestre', 'Game Master', 1490, 5, 3, 6, 400, 20),
    ('legend', 'Mestre Lendário', 'Legendary Game Master', 2990, 10, 8, 8, 1500, 30),
]

ADDONS = [
    # slug, pt, en, kind, quantidade por unidade, preço (centavos), ordem
    ('campaign', '+1 campanha', '+1 campaign', 'campaigns', 1, 290, 0),
    ('storage', '+250 MB de imagens', '+250 MB of images', 'storage_mb', 250, 390, 10),
    ('characters', '+20 personagens', '+20 characters', 'characters', 20, 190, 20),
    ('slots', '+2 vagas de mesa por campanha', '+2 table slots per campaign', 'table_slots', 2, 190, 30),
]


def seed(apps, schema_editor):
    Plan = apps.get_model('api', 'Plan')
    AddOn = apps.get_model('api', 'AddOn')
    for slug, pt, en, price, chars, camps, slots, mb, order in PLANS:
        Plan.objects.update_or_create(slug=slug, defaults=dict(
            name_pt=pt, name_en=en, price_cents=price, max_characters=chars, max_campaigns=camps,
            table_slots=slots, storage_mb=mb, order=order, active=True))
    for slug, pt, en, kind, amount, price, order in ADDONS:
        AddOn.objects.update_or_create(slug=slug, defaults=dict(
            name_pt=pt, name_en=en, kind=kind, amount=amount, price_cents=price, order=order, active=True))


class Migration(migrations.Migration):
    dependencies = [('api', '0011_plans_and_campaign_lifecycle')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
