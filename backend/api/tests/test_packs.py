"""
Pacotes de equipamento: abrir troca o pacote pelo que vem dentro (api/packs.py,
mesmas regras de frontend/src/items/packs.js, tests/packs.test.js).

Cenários:
- Reconhece por chave, sourceId do catálogo e nome (criação, en, digitado).
- Conteúdo pela regra da ficha: 2014 = SRD 5.1, 2024 = SRD 5.2.1.
- Soma com itens iguais; ×2 fica ×1; notas vão para a mochila; herda `from`.
- Endpoint: dono abre em qualquer modo (também em campanha), mestre também;
  outro usuário 403; item que não é pacote 400; item antigo sem id pelo índice.
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership
from api.packs import open_pack, pack_key, pack_items, pack_name_key, item_key, rules_of

User = get_user_model()


def make_user(email, name='User', password='senha-forte-2026'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password=password)
    Profile.objects.create(user=u, display_name=name)
    return u


def names(equipment):
    return [(e['name'], e['qty']) for e in equipment]


class PackLogicTests(TestCase):
    def test_recognizes_packs(self):
        self.assertEqual(pack_key({'name': 'x', 'pack': 'priest'}), 'priest')
        self.assertEqual(pack_key({'sourceId': 'dungeoneersPack', 'name': 'Renomeado', 'type': 'gear'}), 'dungeoneer')
        self.assertEqual(pack_key({'name': 'Pacote de Aventureiro', 'qty': 1}), 'explorer')
        self.assertEqual(pack_key({'name': 'Mochila de Aventureiro'}), 'dungeoneer')
        self.assertEqual(pack_key({'name': "Explorer's Pack"}), 'explorer')
        self.assertEqual(pack_key({'name': 'explorers pack (10 gp)'}), 'explorer')
        self.assertEqual(pack_key({'name': 'PACOTE DO ESTUDIOSO'}), 'scholar')
        self.assertEqual(pack_key({'name': 'Pacote de Sacerdote ×2'}), 'priest')
        self.assertEqual(pack_key({'name': 'Kit de Masmorra'}), 'dungeoneer')
        self.assertEqual(pack_key({'name': 'Pacote de Explorador de Masmorra'}), 'dungeoneer')
        for name in ('Mochila', 'Kit de Curandeiro', 'Ferramentas de Ladrão', 'Box 12', ''):
            self.assertIsNone(pack_key({'name': name}), name)
        self.assertIsNone(pack_key({'name': 'Pacote de Aventureiro', 'type': 'weapon'}))
        self.assertEqual(pack_name_key('Box 12'), 'box 12')
        self.assertEqual(item_key('  Pé-de-Cabra  '), 'pe de cabra')

    def test_contents_by_rules(self):
        g14 = [c['gear'] for c in pack_items('explorer', 2014)]
        g24 = [c['gear'] for c in pack_items('explorer', 2024)]
        self.assertIn('messKit', g14)
        self.assertNotIn('messKit', g24)
        self.assertIn('oil', g24)
        rope14 = next(c for c in pack_items('explorer', 2014) if c['gear'] == 'rope')
        rope24 = next(c for c in pack_items('explorer', 2024) if c['gear'] == 'rope')
        self.assertEqual((rope14['weight'], rope24['weight']), (10, 5))
        self.assertIn('holyWater', [c['gear'] for c in pack_items('priest', 2024)])
        self.assertNotIn('holyWater', [c['gear'] for c in pack_items('priest', 2014)])

    def test_rules_of_legacy_sheet_is_2014(self):
        # Ficha antiga sem rulesVersion = 2014, como rules.py/spells.py/admin.py.
        self.assertEqual(rules_of({'className': 'cleric', 'level': 1}), 2014)
        self.assertEqual(rules_of(None), 2014)
        self.assertEqual(rules_of({'rulesVersion': '2014'}), 2014)
        self.assertEqual(rules_of({'rulesVersion': '2024'}), 2024)
        out = open_pack([{'name': 'Pacote de Sacerdote', 'qty': 1}], 0, rules_of({}), 'pt')
        got = [e['name'] for e in out]
        self.assertIn('Incensário', got)
        self.assertNotIn('Água Benta', got)

    def test_does_not_merge_into_broken_or_equipped(self):
        eq = [
            {'id': 'r', 'name': 'Corda', 'qty': 1, 'broken': True, 'notes': 'cortada'},
            {'id': 't', 'name': 'Tocha', 'qty': 1, 'equipped': True},
            {'id': 'w', 'name': 'Cantil', 'qty': 1, 'broken': False, 'equipped': False},
            {'id': 'p1', 'name': 'Pacote de Aventureiro', 'qty': 1},
        ]
        out = open_pack(eq, 3, 2024, 'pt')
        self.assertEqual([(e['name'], e['qty']) for e in out[:3]], [('Corda', 1), ('Tocha', 1), ('Cantil', 2)])
        rope = next(e for e in out[3:] if e['name'] == 'Corda 50 pés')
        self.assertEqual((rope['qty'], rope['broken'], rope['notes']), (1, False, ''))
        torch = next(e for e in out[3:] if e['name'] == 'Tocha')
        self.assertEqual((torch['qty'], torch['equipped']), (10, False))

    def test_open_2024_in_place(self):
        pack = {'name': 'Pacote de Aventureiro', 'qty': 1, 'from': 'classPack', 'pack': 'explorer'}
        out = open_pack([{'name': 'Flechas', 'qty': 20}, pack, {'name': 'Aljava', 'qty': 1}], 1, 2024, 'pt')
        self.assertEqual(names(out), [
            ('Flechas', 20), ('Mochila', 1), ('Saco de Dormir', 1), ('Frasco de Óleo', 2), ('Rações (1 dia)', 10),
            ('Corda 50 pés', 1), ('Isqueiro', 1), ('Tocha', 10), ('Cantil', 1), ('Aljava', 1),
        ])
        bag = out[1]
        self.assertEqual((bag['sourceId'], bag['weight'], bag['type'], bag['from']), ('backpack', 5, 'gear', 'classPack'))
        ids = [e['id'] for e in out[1:-1]]
        self.assertEqual(len(set(ids)), len(ids))

    def test_open_2014_english_text_items(self):
        out = open_pack([{'name': "Priest's Pack", 'qty': 1}], 0, 2014, 'en')
        self.assertEqual(names(out), [
            ('Backpack', 1), ('Blanket', 1), ('Candle', 10), ('Tinderbox', 1), ('Alms Box', 1),
            ('Incense (blocks)', 2), ('Censer', 1), ('Vestments', 1), ('Rations (1 day)', 2), ('Waterskin', 1),
        ])
        censer = next(e for e in out if e['name'] == 'Censer')
        self.assertNotIn('sourceId', censer)
        self.assertEqual(censer['artId'], 'censerControllingAirElementals')
        holy = next(e for e in open_pack([{'name': 'Pacote de Sacerdote'}], 0, 2024, 'pt') if e['name'] == 'Água Benta')
        self.assertEqual(holy['type'], 'potion')
        self.assertTrue(holy['description']['pt'])

    def test_merges_with_same_items(self):
        eq = [
            {'name': 'Tocha', 'qty': 2},
            {'id': 'x1', 'sourceId': 'backpack', 'name': 'Backpack', 'qty': 1, 'type': 'gear'},
            {'name': 'Óleo (frascos)', 'qty': 3},
            {'name': 'Pé de Cabra', 'qty': 1},
            {'name': 'Waterskin', 'qty': 0},
            {'name': 'Pacote de Explorador de Masmorras', 'qty': 1},
        ]
        out = open_pack(eq, 5, 2024, 'pt')
        self.assertEqual(names(out[:5]), [('Tocha', 12), ('Backpack', 2), ('Óleo (frascos)', 5), ('Pé de Cabra', 2), ('Waterskin', 1)])
        self.assertEqual([e['name'] for e in out[5:]], ['Estrepes (bolsa com 20)', 'Rações (1 dia)', 'Corda 50 pés', 'Isqueiro'])
        self.assertEqual(eq[0]['qty'], 2, 'não mexe na lista original')

    def test_qty_and_notes(self):
        two = open_pack([{'name': 'Pacote de Erudito', 'qty': 2, 'notes': 'do mestre'}], 0, 2024, 'pt')
        self.assertEqual((two[0]['name'], two[0]['qty'], two[0]['notes']), ('Pacote de Erudito', 1, 'do mestre'))
        self.assertEqual((two[1]['name'], two[1]['notes']), ('Mochila', ''))
        one = open_pack([{'name': 'Mochila', 'qty': 1, 'notes': 'velha'}, {'name': 'Pacote de Erudito', 'notes': 'do mestre'}], 1, 2024, 'pt')
        self.assertEqual((one[0]['qty'], one[0]['notes']), (2, 'velha · do mestre'))
        zero = open_pack([{'name': 'Pacote de Erudito', 'qty': 0}], 0, 2024, 'pt')
        self.assertEqual(len(zero), 8)
        self.assertIsNone(open_pack([{'name': 'Corda'}], 0, 2024, 'pt'))
        self.assertIsNone(open_pack([], 0, 2024, 'pt'))


class OpenPackEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.dm = make_user('dm@x.com')
        self.other = make_user('z@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_other = APIClient(); self.c_other.force_login(self.other)
        self.char = Character.objects.create(owner=self.owner, name='C', data={
            'rulesVersion': '2014',
            'equipment': [
                {'name': 'Tocha', 'qty': 1},
                {'name': 'Pacote de Aventureiro', 'qty': 1, 'from': 'classPack'},
                {'id': 'item-p2', 'name': "Priest's Pack", 'qty': 2, 'type': 'gear'},
                {'id': 'item-rope', 'name': 'Corda', 'qty': 1, 'type': 'gear'},
            ],
        })
        self.url = f'/api/characters/{self.char.id}/inventory/open-pack'

    def join_campaign(self):
        camp = Campaign.objects.create(dm=self.dm, name='Camp', slug='camp')
        Membership.objects.create(campaign=camp, user=self.owner, character=self.char, role='player')

    def test_owner_opens_legacy_item_by_index(self):
        r = self.c_owner.post(self.url, {'index': 1, 'name': 'Pacote de Aventureiro', 'lang': 'pt'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        eq = r.json()['character']['data']['equipment']
        self.assertEqual(eq[0], {'name': 'Tocha', 'qty': 11})
        got = [e['name'] for e in eq]
        self.assertIn('Kit de Refeição', got)  # 2014 = SRD 5.1
        self.assertNotIn('Pacote de Aventureiro', got)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['equipment'], eq)

    def test_index_must_match_name(self):
        r = self.c_owner.post(self.url, {'index': 1, 'name': 'Outro item'}, format='json')
        self.assertEqual(r.status_code, 404)
        r = self.c_owner.post(self.url, {'index': 9, 'name': 'Pacote de Aventureiro'}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_owner_opens_by_id_in_english(self):
        r = self.c_owner.post(self.url, {'itemId': 'item-p2', 'lang': 'en'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        eq = r.json()['character']['data']['equipment']
        p2 = next(e for e in eq if e.get('id') == 'item-p2')
        self.assertEqual(p2['qty'], 1)
        self.assertIn('Alms Box', [e['name'] for e in eq])
        self.assertEqual(next(e for e in eq if e['name'] == 'Tocha')['qty'], 1)  # priest 2014 não tem tocha

    def test_not_a_pack(self):
        r = self.c_owner.post(self.url, {'itemId': 'item-rope'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json().get('error'), 'not_a_pack')
        r = self.c_owner.post(self.url, {'itemId': 'nao-existe'}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_other_user_forbidden(self):
        r = self.c_other.post(self.url, {'itemId': 'item-p2'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_campaign_owner_and_dm_can_open(self):
        self.join_campaign()
        # Em campanha o PUT trava `equipment`; abrir pacote passa pelo servidor.
        r = self.c_owner.post(self.url, {'itemId': 'item-p2', 'lang': 'pt'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        r = self.c_dm.post(self.url, {'itemId': 'item-p2', 'lang': 'pt'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        eq = self.char.data['equipment']
        self.assertFalse(any(e.get('id') == 'item-p2' for e in eq))
        self.assertEqual(next(e for e in eq if e['name'] == 'Mochila')['qty'], 2)
        self.assertEqual(next(e for e in eq if e['name'] == 'Vela')['qty'], 20)
