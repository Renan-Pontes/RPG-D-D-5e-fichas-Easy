"""
Catálogo de itens da campanha: itens mágicos do SRD 5.2.1 guardam os campos de
`magic` (categoria, bônus, cargas, cura, atributo fixo, sintonização restrita) e
as descrições longas (parágrafos e tabelas) sem corte.
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Campaign
from api.views_items import clean_item, MAX_DESC_CHARS

User = get_user_model()


def make_user(email, name='U'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


LONG_PT = ('Ao puxar uma carta, role na tabela abaixo.\n\n| d100 | Carta | Efeito |\n'
           + ''.join(f'| {i:02d} | Carta nº {i} | Você ganha poção e ação mágica. |\n' for i in range(1, 160)))
LONG_EN = LONG_PT.replace('Ao puxar uma carta, role na tabela abaixo.', 'When you draw a card, roll on the table below.')

STAFF = {
    'sourceId': 'staffFrost', 'name': 'Cajado do Gelo', 'type': 'magic',
    'magic': {
        'rarity': 'very rare', 'category': 'staff', 'charges': 10, 'spellAttackBonus': 2, 'saveBonus': 1,
        'attunement': {'by': {'pt': 'um druida, feiticeiro, bruxo ou mago', 'en': 'a Druid, Sorcerer, Warlock, or Wizard'}},
        'effect': {'pt': 'Resistência a Frio; 10 cargas.', 'en': 'Cold Resistance; 10 charges.'},
    },
    'description': {'pt': LONG_PT, 'en': LONG_EN},
}


class MagicItemCatalogTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.url = f'/api/campaigns/{self.camp.id}/items'

    def test_long_description_and_magic_fields_survive(self):
        self.assertGreater(len(LONG_PT), 8000)
        r = self.c_dm.post(self.url, {'item': STAFF}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        saved = r.json()['item']['item']
        self.assertEqual(saved['description']['pt'], LONG_PT.strip())
        self.assertIn('\n\n| d100 |', saved['description']['pt'])  # parágrafos/tabela preservados
        self.assertEqual(saved['description']['en'], LONG_EN.strip())
        m = saved['magic']
        self.assertEqual(m['category'], 'staff')
        self.assertEqual(m['charges'], 10)
        self.assertEqual(m['spellAttackBonus'], 2)
        self.assertEqual(m['saveBonus'], 1)
        self.assertEqual(m['attunement'], STAFF['magic']['attunement'])
        self.assertEqual(saved['sourceId'], 'staffFrost')
        # Lido de volta igual.
        self.assertEqual(self.c_dm.get(self.url).json()['items'][0]['item'], saved)

    def test_weapon_armor_potion_and_belt_fields(self):
        sword = clean_item({'name': 'Espada +2', 'type': 'weapon', 'base': 'longsword',
                            'weapon': {'damage': '1d8', 'dmgType': 'slashing', 'props': ['versatile']},
                            'magic': {'rarity': 'very rare', 'category': 'weapon', 'bonus': 2}})
        self.assertEqual(sword['magic']['bonus'], 2)
        self.assertEqual(sword['base'], 'longsword')
        armor = clean_item({'name': 'Armadura +1', 'type': 'armor', 'armor': {'ac': 16, 'type': 'heavy'},
                            'magic': {'rarity': 'rare', 'category': 'armor', 'acBonus': 1}})
        self.assertEqual(armor['magic']['acBonus'], 1)
        potion = clean_item({'name': 'Poção de Cura Maior', 'type': 'potion',
                             'magic': {'rarity': 'uncommon', 'category': 'potion', 'heal': '4d4+4'}})
        self.assertEqual(potion['magic']['heal'], '4d4+4')
        belt = clean_item({'name': 'Cinto', 'type': 'magic',
                           'magic': {'rarity': 'rare', 'attunement': True, 'setScore': {'str': 21, 'xyz': 3}}})
        self.assertEqual(belt['magic']['setScore'], {'str': 21})
        self.assertIs(belt['magic']['attunement'], True)

    def test_bad_magic_values_are_dropped(self):
        item = clean_item({'name': 'Estranho', 'type': 'magic', 'sourceId': '../../etc',
                           'magic': {'rarity': 'mythic', 'category': 'spaceship', 'bonus': True, 'acBonus': 99,
                                     'charges': -3, 'heal': 'drop table', 'setScore': {'str': 'x'},
                                     'attunement': {'by': 5}, 'evil': 1}})
        m = item['magic']
        self.assertEqual(m['rarity'], 'common')
        for key in ('category', 'bonus', 'acBonus', 'charges', 'heal', 'setScore', 'evil'):
            self.assertNotIn(key, m)
        self.assertIs(m['attunement'], True)
        self.assertNotIn('sourceId', item)

    def test_limits(self):
        huge = 'a' * (MAX_DESC_CHARS + 500)
        item = clean_item({'name': 'Grande', 'description': {'pt': huge}})
        self.assertEqual(len(item['description']['pt']), MAX_DESC_CHARS)
        # pt + en no limite passam do teto total do item → recusa amigável.
        r = self.c_dm.post(self.url, {'item': {'name': 'Enorme', 'description': {'pt': 'x' * 12000, 'en': 'y' * 12000},
                                                'magic': {'rarity': 'rare', 'effect': 'z' * 2000}}}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json().get('error'), 'item_too_large')
