"""
V8 · Montar o combate numa chamada (POST /api/combat/campaign/<id>/encounter).

- Monstros + personagens numa transação; personagens em casas livres (D1: antes
  "Adicionar todos" punha os 4 na mesma casa).
- Iniciativa de cada monstro rolada no servidor (d20 + bônus, escrita na linha); a
  digitada pelo mestre vale como veio; "uma para todos" usa 1 d20.
- `opId`: o 2º toque em "⚔ Começar" não duplica nada (D17).
- Trocar tira os monstros antigos (os personagens ficam onde estão); Somar mantém e
  numera os novos depois dos que já estavam.
- Pedir a iniciativa à mesa: teste `kind:'custom', key:'initiative'`; "Usar e começar"
  põe as respostas na ordem, quem não respondeu fica com 10 e "✎", e começa.
- Mapa da cena copiado no servidor (map-from) e "Recomeçar" sem o mapa (D10).
- O combate de quem está andando não pula a vez quando entra alguém antes na ordem.
"""
import base64
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Adventure, Campaign, CheckRequest, Character, CombatInstance, Membership, Profile
from api import combat as engine

User = get_user_model()

GOBLIN = {'id': 'goblin-warrior', 'name': {'pt': 'Goblin Guerreiro', 'en': 'Goblin Warrior'}, 'hp': 10, 'ac': 15,
          'abilities': {'str': 8, 'dex': 15, 'con': 10, 'int': 10, 'wis': 8, 'cha': 8}, 'initiative': 2,
          'speed': {'walk': 30}, 'actions': [{'name': 'Cimitarra', 'type': 'melee', 'atk': 4, 'damage': '1d6+2',
                                              'damageType': 'slashing'}]}
OGRE = {'id': 'ogre', 'name': 'Ogro', 'hp': 68, 'ac': 11, 'size': 'Large',
        'abilities': {'str': 19, 'dex': 8, 'con': 16, 'int': 5, 'wis': 7, 'cha': 7}, 'actions': []}

# PNG 1×1 (o mapa da sala) e um PNG 640×480 de cabeçalho (o tamanho vem do IHDR).
PNG_640 = ('data:image/png;base64,' + base64.b64encode(
    b'\x89PNG\r\n\x1a\n' + b'\x00\x00\x00\rIHDR' + (640).to_bytes(4, 'big') + (480).to_bytes(4, 'big')
    + b'\x08\x02\x00\x00\x00' + b'\x00' * 8).decode())


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.camp = Campaign.objects.create(dm=self.dm, name='Brumafria', slug='b')
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.players, self.chars = [], []
        for i, name in enumerate(['Dagna', 'Kaelor', 'Elarion', 'Pipo']):
            u = make_user(f'p{i}@x.com', name)
            ch = Character.objects.create(owner=u, name=name, data={
                'level': 1, 'maxHp': 10, 'currentHp': 10, 'armorClass': 14,
                'abilities': {'str': 10, 'dex': 12 + i, 'con': 10, 'int': 10, 'wis': 10, 'cha': 10}})
            Membership.objects.create(campaign=self.camp, user=u, character=ch, role='player')
            self.players.append(u)
            self.chars.append(ch)
        self.c = APIClient()
        self.c.force_login(self.dm)

    def url(self, what):
        return f'/api/combat/campaign/{self.camp.id}/{what}'

    def encounter(self, status=200, **body):
        r = self.c.post(self.url('encounter') + '?sets=1', body, format='json')
        self.assertEqual(r.status_code, status, r.content)
        return r.json()

    def combat(self):
        return CombatInstance.objects.get(campaign=self.camp)


class EncounterTests(Base):
    def test_one_call_puts_monsters_and_pcs_in_different_cells(self):
        data = self.encounter(opId='op-aaaaaaaa', monsters=[{'monster': GOBLIN, 'count': 2}], pcs='all')
        cbs = data['combat']['combatants']
        self.assertEqual(len(cbs), 6)
        names = sorted(c['name'] for c in cbs if c['type'] == 'monster')
        self.assertEqual(names, ['Goblin Guerreiro #1', 'Goblin Guerreiro #2'])
        cells = {(c['position']['x'], c['position']['y']) for c in cbs}
        self.assertEqual(len(cells), 6, cells)      # ninguém empilhado (D1)
        pcs = [c for c in cbs if c['type'] == 'pc']
        self.assertTrue(all(c['initiative'] == 10 and c['init_guess'] for c in pcs))
        # ordenado por iniciativa (desc) e com as ações por ref (?sets=1)
        inits = [c['initiative'] for c in cbs]
        self.assertEqual(inits, sorted(inits, reverse=True))
        self.assertTrue(all('actionsRef' in c['stats'] for c in cbs if c['type'] == 'monster'))
        self.assertFalse(data['combat']['active'])

    def test_monster_initiative_is_rolled_per_monster_with_the_bonus(self):
        rolls = iter([3, 17])
        with mock.patch.object(engine, 'roll_die', side_effect=lambda s: next(rolls)):
            data = self.encounter(monsters=[{'monster': GOBLIN, 'count': 2}])
        by_name = {r['name']: r for r in data['rolled']}
        self.assertEqual(by_name['Goblin Guerreiro #1'], {**by_name['Goblin Guerreiro #1'], 'd20': 3, 'bonus': 2, 'initiative': 5})
        self.assertEqual(by_name['Goblin Guerreiro #2']['initiative'], 19)
        # a 2ª (19) vem antes na ordem
        self.assertEqual([c['name'] for c in data['combat']['combatants']], ['Goblin Guerreiro #2', 'Goblin Guerreiro #1'])

    def test_typed_initiative_is_kept_and_group_uses_one_d20(self):
        data = self.encounter(monsters=[{'monster': GOBLIN, 'count': 2, 'initiative': 12}])
        self.assertEqual({c['initiative'] for c in data['combat']['combatants']}, {12})
        self.assertEqual({r['d20'] for r in data['rolled']}, {None})
        with mock.patch.object(engine, 'roll_die', return_value=9):
            data = self.encounter(monsters=[{'monster': OGRE, 'count': 1}, {'monster': GOBLIN, 'count': 1}],
                                  monsterInit='group')
        rolled = {r['name']: r for r in data['rolled']}
        self.assertEqual(rolled['Ogro']['initiative'], 9 - 1)              # DES 8 → −1
        self.assertEqual(rolled['Goblin Guerreiro #3']['initiative'], 9 + 2)

    def test_same_op_id_twice_does_not_duplicate(self):
        body = dict(opId='op-dupl-0001', monsters=[{'monster': GOBLIN, 'count': 2}], pcs='all', askInitiative=True)
        first = self.encounter(**body)
        second = self.encounter(**body)
        self.assertTrue(second['duplicate'])
        self.assertEqual(len(self.combat().combatants), 6)
        self.assertEqual(second['check']['id'], first['check']['id'])
        self.assertEqual(CheckRequest.objects.filter(campaign=self.camp).count(), 1)

    def test_replace_drops_old_monsters_and_add_keeps_them(self):
        self.encounter(monsters=[{'monster': OGRE, 'count': 1}], pcs='all')
        before = {c['character_id']: c['position'] for c in self.combat().combatants if c['type'] == 'pc'}
        data = self.encounter(mode='replace', monsters=[{'monster': GOBLIN, 'count': 2}], pcs='all')
        cbs = data['combat']['combatants']
        self.assertEqual(sorted(c['name'] for c in cbs if c['type'] == 'monster'),
                         ['Goblin Guerreiro #1', 'Goblin Guerreiro #2'])
        self.assertEqual(len([c for c in cbs if c['type'] == 'pc']), 4)      # não duplicou os PJs
        self.assertEqual({c['character_id']: c['position'] for c in cbs if c['type'] == 'pc'}, before)
        data = self.encounter(mode='add', monsters=[{'monster': GOBLIN, 'count': 1}])
        names = sorted(c['name'] for c in data['combat']['combatants'] if c['type'] == 'monster')
        self.assertEqual(names, ['Goblin Guerreiro #1', 'Goblin Guerreiro #2', 'Goblin Guerreiro #3'])

    def test_adding_mid_combat_keeps_the_turn_with_the_same_combatant(self):
        self.encounter(monsters=[{'monster': GOBLIN, 'count': 1, 'initiative': 5}],
                       pcs=[{'characterId': self.chars[0].id, 'initiative': 15}], start=True)
        c = self.combat()
        self.assertTrue(c.active)
        self.c.post(self.url('next-turn'), {}, format='json')                # vez do goblin (índice 1)
        data = self.encounter(monsters=[{'monster': OGRE, 'count': 1, 'initiative': 20}])
        cmb = data['combat']
        self.assertEqual(cmb['combatants'][cmb['turnIndex']]['name'], 'Goblin Guerreiro')
        self.assertTrue(cmb['active'])

    def test_ask_initiative_and_use_and_start(self):
        data = self.encounter(monsters=[{'monster': GOBLIN, 'count': 2, 'initiative': 11}], pcs='all',
                              askInitiative=True, lang='pt')
        check = data['check']
        self.assertEqual((check['kind'], check['key'], check['label']), ('custom', 'initiative', 'Iniciativa'))
        self.assertEqual(check['targetUserIds'], [])                        # os 4 = a mesa toda
        # 3 de 4 respondem pelo app (o bônus vem da ficha, no app)
        for u, total in zip(self.players[:3], (18, 4, 13)):
            cl = APIClient(); cl.force_login(u)
            r = cl.post(f'/api/checks/{check["id"]}/respond', {'mode': 'physical', 'total': total}, format='json')
            self.assertEqual(r.status_code, 200, r.content)
        pcs = {c['character_id']: c['id'] for c in data['combat']['combatants'] if c['type'] == 'pc'}
        inits = [{'id': pcs[ch.id], 'initiative': t} for ch, t in zip(self.chars[:3], (18, 4, 13))]
        inits.append({'id': pcs[self.chars[3].id], 'initiative': 10, 'guess': True})
        out = self.encounter(opId='op-use-0001', initiatives=inits, start=True, closeCheck=check['id'])
        cmb = out['combat']
        self.assertTrue(cmb['active'])
        self.assertEqual((cmb['round'], cmb['turnIndex']), (1, 0))
        order = [(c['name'], c['initiative'], bool(c.get('init_guess'))) for c in cmb['combatants']]
        self.assertEqual(order[0], ('Dagna', 18, False))
        self.assertIn(('Pipo', 10, True), order)                             # ✎ quem não respondeu
        self.assertEqual(CheckRequest.objects.get(pk=check['id']).status, 'closed')

    def test_start_from_the_bar_uses_the_open_initiative_answers(self):
        data = self.encounter(monsters=[{'monster': GOBLIN, 'count': 1, 'initiative': 11}], pcs='all', askInitiative=True)
        check = data['check']
        cl = APIClient(); cl.force_login(self.players[1])
        cl.post(f'/api/checks/{check["id"]}/respond', {'mode': 'physical', 'total': 17}, format='json')
        out = self.encounter(opId='op-bar-start-1', start=True, fromCheck=True)['combat']
        self.assertTrue(out['active'])
        first = out['combatants'][0]
        self.assertEqual((first['name'], first['initiative']), ('Kaelor', 17))
        self.assertNotIn('init_guess', first)
        self.assertTrue(all(c.get('init_guess') for c in out['combatants'] if c['type'] == 'pc' and c['name'] != 'Kaelor'))
        self.assertEqual(CheckRequest.objects.get(pk=check['id']).status, 'closed')
        # sem teste aberto, só começa
        self.c.post(self.url('reset'), {}, format='json')
        self.encounter(monsters=[{'monster': GOBLIN, 'count': 1}])
        self.assertTrue(self.encounter(opId='op-bar-start-2', start=True, fromCheck=True)['combat']['active'])

    def test_initiative_check_only_for_who_is_in_combat_and_old_one_is_closed(self):
        first = self.encounter(pcs=[{'characterId': self.chars[0].id}], askInitiative=True)['check']
        self.assertEqual(first['targetUserIds'], [self.players[0].id])
        second = self.encounter(pcs=[{'characterId': self.chars[1].id}], askInitiative=True, lang='en')['check']
        self.assertEqual(second['label'], 'Initiative')
        self.assertEqual(CheckRequest.objects.get(pk=first['id']).status, 'closed')

    def test_pc_must_be_in_the_campaign(self):
        stranger = make_user('s@x.com', 'Fora')
        ch = Character.objects.create(owner=stranger, name='Intruso', data={})
        r = self.c.post(self.url('encounter'), {'pcs': [{'characterId': ch.id}]}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'character_not_in_campaign')

    def test_players_cannot_build_the_combat(self):
        cl = APIClient(); cl.force_login(self.players[0])
        r = cl.post(self.url('encounter'), {'monsters': [{'monster': GOBLIN}]}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_initiative_typed_later_clears_the_pencil_and_reorders(self):
        data = self.encounter(monsters=[{'monster': GOBLIN, 'count': 1, 'initiative': 12}],
                              pcs=[{'characterId': self.chars[0].id}])
        pc = next(c for c in data['combat']['combatants'] if c['type'] == 'pc')
        r = self.c.put(self.url(f'combatants/{pc["id"]}'), {'initiative': 19}, format='json')
        cbs = r.json()['combat']['combatants']
        self.assertEqual(cbs[0]['id'], pc['id'])
        self.assertNotIn('init_guess', cbs[0])


class SceneMapTests(Base):
    def setUp(self):
        super().setUp()
        self.adv = Adventure.objects.create(campaign=self.camp, name='O Sino Afogado', data={'version': 1, 'nodes': [
            {'id': 'n1', 'name': 'Ponte velha', 'image': PNG_640,
             'encounter': [{'monsterId': 'goblin-warrior', 'name': 'Goblin Guerreiro', 'count': 2}]},
        ], 'edges': []}, play={'current': 'n1', 'visited': ['n1'], 'unlocked': []})

    def test_map_from_the_scene_is_copied_on_the_server(self):
        data = self.encounter(monsters=[{'monster': GOBLIN, 'count': 2}], map={'advId': self.adv.id, 'nodeId': 'n1'},
                              scene={'advId': self.adv.id, 'nodeId': 'n1', 'name': 'Ponte velha'})
        md = self.combat().map_data
        self.assertEqual(md['background_image'], PNG_640)
        self.assertEqual((md['width_px'], md['height_px']), (640, 480))
        self.assertEqual(md['scene'], {'advId': self.adv.id, 'nodeId': 'n1', 'name': 'Ponte velha'})
        self.assertTrue(data['combat']['map']['backgroundUrl'])            # o JSON leva só a URL
        self.camp.refresh_from_db()
        self.assertTrue(self.camp.state.get('combatMapVer'))
        # o jogador e a Tela não veem de onde veio o combate
        pl = APIClient(); pl.force_login(self.players[0])
        self.assertNotIn('scene', pl.get(self.url('').rstrip('/')).json()['combat']['map'])

    def test_replace_without_scene_forgets_the_old_scene(self):
        self.encounter(monsters=[{'monster': GOBLIN, 'count': 1}], scene={'advId': self.adv.id, 'nodeId': 'n1', 'name': 'Ponte'})
        self.assertIn('scene', self.combat().map_data)
        self.encounter(mode='add', monsters=[{'monster': OGRE, 'count': 1}])
        self.assertIn('scene', self.combat().map_data)                     # Somar: continua a mesma luta
        self.encounter(mode='replace', monsters=[{'monster': OGRE, 'count': 1}])
        self.assertNotIn('scene', self.combat().map_data)

    def test_map_from_endpoint_and_reset_without_map(self):
        r = self.c.post(self.url('map-from'), {'advId': self.adv.id, 'nodeId': 'n1'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.json()['changed'])
        self.assertEqual(self.combat().map_data['background_image'], PNG_640)
        # Recomeçar mantendo o mapa (o app de antes não manda o campo)
        self.c.post(self.url('reset'), {}, format='json')
        self.assertEqual(self.combat().map_data['background_image'], PNG_640)
        # Recomeçar sem o mapa (D10)
        self.c.post(self.url('reset'), {'keepMap': False}, format='json')
        self.assertIsNone(self.combat().map_data['background_image'])
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state.get('combatMapVer'), '')

    def test_map_from_missing_image(self):
        r = self.c.post(self.url('map-from'), {'advId': self.adv.id, 'nodeId': 'nope'}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_adventure_list_carries_the_current_fight(self):
        r = self.c.get(f'/api/campaigns/{self.camp.id}/adventures')
        fight = r.json()['adventures'][0]['currentFight']
        self.assertEqual(fight, {'nodeId': 'n1', 'name': 'Ponte velha',
                                 'monsters': [{'name': 'Goblin Guerreiro', 'count': 2}]})


class ImageSizeTests(TestCase):
    def test_png_and_jpeg_headers(self):
        from api.image_data import image_size
        self.assertEqual(image_size(PNG_640), (640, 480))
        jpeg = (b'\xff\xd8' + b'\xff\xe0\x00\x10' + b'JFIF\x00' + b'\x00' * 9
                + b'\xff\xc0\x00\x11\x08' + (300).to_bytes(2, 'big') + (500).to_bytes(2, 'big') + b'\x03' + b'\x00' * 9)
        self.assertEqual(image_size('data:image/jpeg;base64,' + base64.b64encode(jpeg).decode()), (500, 300))
        self.assertIsNone(image_size('data:image/png;base64,AAAA'))
