"""
V9 · Payloads magros: a Tela, o combate e o GET da campanha sem imagem em base64.

- /api/screen/<t>: cada coisa uma vez (card e stage no topo; state, membros,
  combate, publicRolls e publicCheck em `campaign`, onde a TV de antes já lê);
  foto do personagem e imagem do token por URL (portrait/token), que dão 304;
  `lang` = o idioma do mestre (dm_settings.lang); CA da ficha (data.armorClass).
- GET da campanha (mestre e jogador): `avatarUrl` no lugar do base64 da foto;
  rota members/:mid/avatar só para quem é da mesa; a ficha regravada sem a chave
  `avatar` não perde a foto.
- Tetos de bytes com fotos e tokens "de verdade" (≈ os do banco real da medição).
"""
import base64
import copy
import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Campaign, CombatInstance, Membership, Profile, Character

User = get_user_model()
PNG = 'data:image/png;base64,' + base64.b64encode(b'\x89PNG\r\n\x1a\n' + b'x' * 64).decode()


def big_image(n=40_000, tag=b'a'):
    """Data URL "de verdade" (decodifica) com ~n caracteres."""
    raw = b'\x89PNG\r\n\x1a\n' + tag * (n * 3 // 4)
    return 'data:image/png;base64,' + base64.b64encode(raw).decode()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.ana = make_user('ana@x.com', 'Ana')
        self.bruno = make_user('bruno@x.com', 'Bruno')
        self.out = make_user('out@x.com', 'Fora')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_ana = APIClient(); self.c_ana.force_login(self.ana)
        self.c_out = APIClient(); self.c_out.force_login(self.out)
        self.anon = APIClient()
        self.camp = Campaign.objects.create(dm=self.dm, name='Brumafria', slug='brumafria',
                                            state={'session': '4', 'live': True})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.photo = big_image(40_000, b'k')
        self.kaelor = Character.objects.create(owner=self.ana, name='Kaelor', data={
            'name': 'Kaelor', 'className': 'paladin', 'level': 3, 'race': 'dragonborn', 'armorClass': 18,
            'abilities': {'dex': 10}, 'hasShield': True, 'currentHp': 20, 'maxHp': 28, 'avatar': self.photo})
        self.pipo = Character.objects.create(owner=self.bruno, name='Pipo', data={
            'name': 'Pipo', 'className': 'rogue', 'level': 3, 'abilities': {'dex': 16},
            'avatar': '/art/pregens/pipo.webp'})
        self.m_ana = Membership.objects.create(campaign=self.camp, user=self.ana, character=self.kaelor, role='player')
        self.m_bruno = Membership.objects.create(campaign=self.camp, user=self.bruno, character=self.pipo, role='player')
        self.sprite = big_image(60_000, b's')
        self.mapbg = big_image(200_000, b'm')
        self.combat = CombatInstance.objects.create(campaign=self.camp, active=True, combatants=[
            {'id': 'g1', 'type': 'monster', 'name': 'Goblin #1', 'initiative': 14, 'current_hp': 7,
             'position': {'x': 1, 'y': 1}, 'sprite': self.sprite,
             'stats': {'ac': 15, 'max_hp': 7, 'actions': [{'name': 'Cimitarra', 'atk': 4, 'damage': '1d6+2'}]}},
            {'id': 'k1', 'type': 'pc', 'name': 'Kaelor', 'character_id': self.kaelor.id, 'initiative': 12,
             'current_hp': 20, 'stats': {'ac': 18, 'max_hp': 28}},
        ], map_data={'background_image': self.mapbg, 'grid_size_px': 50, 'width_px': 1600, 'height_px': 1000})

    def screen(self, **headers):
        r = self.anon.get(f'/api/screen/{self.camp.screen_token}', **headers)
        self.assertEqual(r.status_code, 200, r.content)
        return r


class ScreenPayloadTests(Base):
    def test_each_piece_goes_once(self):
        d = self.screen().json()
        self.assertEqual(set(d), {'v', 'lang', 'now', 'rolls', 'card', 'stage', 'campaign', 'combat', 'state'})
        c = d['campaign']
        for key in ('state', 'members', 'combat', 'publicRolls', 'publicCheck'):
            self.assertIn(key, c)          # onde a TV de antes já lê (1 versão de transição)
        self.assertNotIn('card', c)        # o cartão só no topo (a TV de antes lê res.card primeiro)
        self.assertEqual(c['state'], {'session': '4', 'live': True})
        # no topo, só o resumo que o app do mestre de antes lê (📺 do cabeçalho, Jogar › Telão)
        self.assertEqual(d['combat'], {'active': True, 'round': 1, 'turnIndex': 0})
        self.assertEqual(d['state'], {'session': '4', 'live': True})
        self.combat.delete()
        self.camp.state = {**self.camp.state, 'scene': 'Ponte velha', 'sceneText': 'x' * 900}
        self.camp.save()
        d = self.screen().json()
        self.assertIsNone(d['combat'])
        self.assertEqual(d['state'], {'session': '4', 'live': True, 'scene': 'Ponte velha'})

    def test_no_base64_and_small(self):
        r = self.screen()
        self.assertNotIn(b'base64', r.content)
        self.assertLess(len(r.content), 10_000)

    def test_portrait_by_url_with_etag(self):
        d = self.screen().json()
        kael = next(m['character'] for m in d['campaign']['members'] if m['character'] and m['character']['name'] == 'Kaelor')
        url = kael['avatar']
        self.assertTrue(url.startswith(f'/api/screen/{self.camp.screen_token}/portrait/{self.kaelor.id}?v='), url)
        img = self.anon.get(url)
        self.assertEqual(img.status_code, 200)
        self.assertEqual(img['Content-Type'], 'image/png')
        self.assertIn('max-age=31536000', img['Cache-Control'])
        self.assertEqual(self.anon.get(url, HTTP_IF_NONE_MATCH=img['ETag']).status_code, 304)
        # arte do site passa como sempre
        pipo = next(m['character'] for m in d['campaign']['members'] if m['character'] and m['character']['name'] == 'Pipo')
        self.assertEqual(pipo['avatar'], '/art/pregens/pipo.webp')

    def test_portrait_only_for_this_table(self):
        tok = self.camp.screen_token
        other = Character.objects.create(owner=self.out, name='X', data={'avatar': PNG})
        self.assertEqual(self.anon.get(f'/api/screen/{tok}/portrait/{other.id}').status_code, 404)
        self.assertEqual(self.anon.get(f'/api/screen/{tok}/portrait/{self.pipo.id}').status_code, 404)   # arte, não foto
        self.assertEqual(self.anon.get(f'/api/screen/errado/portrait/{self.kaelor.id}').status_code, 404)
        # saiu da mesa → a URL morre
        self.m_ana.character = None; self.m_ana.save()
        self.assertEqual(self.anon.get(f'/api/screen/{tok}/portrait/{self.kaelor.id}').status_code, 404)

    def test_token_and_map_by_url(self):
        combat = self.screen().json()['campaign']['combat']
        gob = next(c for c in combat['combatants'] if c['id'] == 'g1')
        self.assertTrue(gob['sprite'].startswith(f'/api/screen/{self.camp.screen_token}/token/g1?v='), gob['sprite'])
        img = self.anon.get(gob['sprite'])
        self.assertEqual(img.status_code, 200)
        self.assertEqual(self.anon.get(gob['sprite'], HTTP_IF_NONE_MATCH=img['ETag']).status_code, 304)
        self.assertNotIn('background_image', combat['map'])
        self.assertEqual(self.anon.get(combat['map']['backgroundUrl']).status_code, 200)
        tok = self.camp.screen_token
        self.assertEqual(self.anon.get(f'/api/screen/{tok}/token/k1').status_code, 404)    # sem imagem própria
        self.assertEqual(self.anon.get(f'/api/screen/{tok}/token/nada').status_code, 404)
        self.assertEqual(self.anon.get('/api/screen/errado/token/g1').status_code, 404)

    def test_armor_class_from_the_sheet(self):
        members = {m['character']['name']: m['character'] for m in self.screen().json()['campaign']['members'] if m['character']}
        self.assertEqual(members['Kaelor']['armorClass'], 18)          # a da ficha, não 10 + DES + escudo (12)
        self.assertEqual(members['Pipo']['armorClass'], 13)            # ficha antiga, sem armorClass: a estimativa

    def test_lang_is_the_dms(self):
        self.assertIsNone(self.screen().json()['lang'])
        self.assertEqual(self.c_dm.patch(f'/api/campaigns/{self.camp.id}', {'lang': 'pt'}, format='json').status_code, 200)
        self.assertEqual(self.screen().json()['lang'], 'pt')
        self.assertEqual(self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']['lang'], 'pt')
        self.assertNotIn('lang', self.c_ana.get(f'/api/campaigns/{self.camp.id}').json()['campaign'])
        self.assertEqual(self.c_dm.patch(f'/api/campaigns/{self.camp.id}', {'lang': 'fr'}, format='json').status_code, 400)
        self.assertEqual(self.c_ana.patch(f'/api/campaigns/{self.camp.id}', {'lang': 'en'}, format='json').status_code, 403)
        self.assertEqual(self.screen().json()['lang'], 'pt')

    def test_unchanged_screen_is_304(self):
        r = self.screen()
        self.assertEqual(self.anon.get(f'/api/screen/{self.camp.screen_token}', HTTP_IF_NONE_MATCH=r['ETag']).status_code, 304)


class CampaignAvatarTests(Base):
    def member(self, client, name):
        c = client.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        return next(m['character'] for m in c['members'] if m['character'] and m['character']['name'] == name)

    def test_dm_and_player_get_url_not_base64(self):
        for client in (self.c_dm, self.c_ana):
            r = client.get(f'/api/campaigns/{self.camp.id}')
            self.assertNotIn(b'base64', r.content)
            self.assertLess(len(r.content), 20_000)
        kael = self.member(self.c_dm, 'Kaelor')
        self.assertNotIn('avatar', kael['data'])
        self.assertEqual(kael['data']['armorClass'], 18)       # o resto da ficha continua
        self.assertTrue(kael['avatarUrl'].startswith(f'/api/campaigns/{self.camp.id}/members/{self.m_ana.id}/avatar?v='))
        # o colega vê o resumo, com a foto por URL
        bruno = APIClient(); bruno.force_login(self.bruno)
        summary = self.member(bruno, 'Kaelor')
        self.assertEqual(summary['avatarUrl'], kael['avatarUrl'])
        self.assertEqual(summary['summary']['avatar'], '')
        # arte do site fica onde estava
        self.assertEqual(self.member(self.c_dm, 'Pipo')['data']['avatar'], '/art/pregens/pipo.webp')

    def test_avatar_route_members_only(self):
        url = self.member(self.c_dm, 'Kaelor')['avatarUrl']
        for client in (self.c_dm, self.c_ana):
            r = client.get(url)
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r['Content-Type'], 'image/png')
        self.assertEqual(self.c_out.get(url).status_code, 403)
        self.assertIn(self.anon.get(url).status_code, (401, 403))
        self.assertEqual(self.c_dm.get(f'/api/campaigns/{self.camp.id}/members/{self.m_bruno.id}/avatar').status_code, 404)
        self.assertEqual(self.c_dm.get(f'/api/campaigns/{self.camp.id}/members/99999/avatar').status_code, 404)

    def test_dm_editor_and_owner_put_keep_the_photo(self):
        # o editor do mestre manda a ficha que abriu (sem a foto): o merge guarda a foto
        data = self.member(self.c_dm, 'Kaelor')['data']
        r = self.c_dm.patch(f'/api/characters/{self.kaelor.id}/dm-edit', {'data': {**data, 'currentHp': 9}}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.kaelor.refresh_from_db()
        self.assertEqual(self.kaelor.data['avatar'], self.photo)
        self.assertEqual(self.kaelor.data['currentHp'], 9)
        # o dono regrava a ficha sem a chave `avatar`: a foto fica; com '' ela sai
        body = {k: v for k, v in self.kaelor.data.items() if k != 'avatar'}
        self.assertEqual(self.c_ana.put(f'/api/characters/{self.kaelor.id}', {'name': 'Kaelor', 'data': body},
                                        format='json').status_code, 200)
        self.kaelor.refresh_from_db()
        self.assertEqual(self.kaelor.data['avatar'], self.photo)
        self.assertEqual(self.c_ana.put(f'/api/characters/{self.kaelor.id}', {'name': 'Kaelor', 'data': {**body, 'avatar': ''}},
                                        format='json').status_code, 200)
        self.kaelor.refresh_from_db()
        self.assertEqual(self.kaelor.data['avatar'], '')


# Stat blocks de verdade, como o app os grava no combate (bestiário SRD 5.2.1, nomes e
# textos das regras em pt e en): Dragão Vermelho Adulto (~3,5 KB) e Goblin Guerreiro.
STATBLOCKS = json.loads((Path(__file__).parent / 'fixtures' / 'statblocks.json').read_text(encoding='utf-8'))


def real_monsters():
    """1 Dragão Vermelho Adulto + 3 goblins (os dois primeiros com token de ~250 KB)."""
    drg = {'id': 'drg', 'type': 'monster', 'name': 'Dragão Vermelho Adulto', 'monster_id': 'adult-red-dragon',
           'initiative': 20, 'current_hp': 256, 'position': {'x': 500, 'y': 300}, 'token_scale': 2,
           'sprite': big_image(250_000, b'd'), 'conditions': ['frightened'],
           'stats': copy.deepcopy(STATBLOCKS['adult-red-dragon']),
           'legendary': {'max': 3, 'remaining': 3, 'lair_max': 4},
           'legendary_resistance': {'max': 3, 'remaining': 3, 'lair_max': 4}}
    gobs = [{'id': f'gw{i}', 'type': 'monster', 'name': f'Goblin Afogado #{i}', 'monster_id': 'goblin-warrior',
             'initiative': 16 - i, 'current_hp': 10, 'position': {'x': 50 * i, 'y': 50},
             'sprite': big_image(250_000, bytes([97 + i])) if i < 3 else None,
             'stats': copy.deepcopy(STATBLOCKS['goblin-warrior'])} for i in range(1, 4)]
    return [drg, *gobs]


class RealSizeTests(Base):
    """Tetos do aceite com 4 fotos de ~40 KB, 3 tokens de ~250 KB, mapa de ~300 KB,
    stat blocks reais (Dragão Vermelho Adulto + 3 goblins) e o registro cheio."""

    def setUp(self):
        super().setUp()
        for i, email in enumerate(('carla@x.com', 'davi@x.com')):
            u = make_user(email, email[:5])
            ch = Character.objects.create(owner=u, name=f'PJ{i}', data={'name': f'PJ{i}', 'className': 'wizard', 'level': 3,
                                                                       'avatar': big_image(40_000, bytes([65 + i]))})
            Membership.objects.create(campaign=self.camp, user=u, character=ch, role='player')
        self.pipo.data = {**self.pipo.data, 'avatar': big_image(40_000, b'p')}
        self.pipo.save()
        c = self.combat
        c.combatants = real_monsters() + c.combatants
        c.map_data = {**c.map_data, 'background_image': big_image(300_000, b'z')}
        c.action_log = [{'type': 'next_turn', 'round': 1 + n // 6, 'index': n % 6, 'whose': 'Goblin Afogado #2',
                         'ts': '2026-10-24T18:05:43.262541+00:00'} for n in range(100)]
        c.save()

    def test_ceilings(self):
        tv = self.screen()
        self.assertLess(len(tv.content), 10_000, len(tv.content))
        combat = self.c_dm.get(f'/api/combat/campaign/{self.camp.id}?sets=1')
        self.assertLess(len(combat.content), 10_000, len(combat.content))
        camp = self.c_dm.get(f'/api/campaigns/{self.camp.id}')
        self.assertLess(len(camp.content), 20_000, len(camp.content))
        nxt = self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/next-turn?sets=1',
                             {'expect': {'round': 1, 'turnIndex': 0}}, format='json')
        self.assertEqual(nxt.status_code, 200)
        self.assertLess(len(nxt.content), 10_000, len(nxt.content))
        for r in (tv, combat, camp, nxt):
            self.assertNotIn(b'base64', r.content)
        self.assertEqual(len(json.loads(tv.content)['campaign']['members']), 5)
        # cada conjunto de ações vem uma vez só (os 3 goblins dividem um), e é pequeno
        refs = {cb['stats'].get('actionsRef') for cb in combat.json()['combat']['combatants']} - {None}
        self.assertEqual(len(refs), 3)    # dragão, goblin guerreiro e o Goblin #1 da base
        sets = sum(len(self.c_dm.get(f'/api/combat/campaign/{self.camp.id}/actions/{r}').content) for r in refs)
        self.assertLess(sets, 10_000, sets)


class ActionSetsTests(Base):
    """?sets=1: as ações dos stat blocks saem do JSON do combate (stats.actionsRef) e
    vêm de /actions/<ref>, cacheável; sem o parâmetro (o app de antes) vão inteiras."""

    def setUp(self):
        super().setUp()
        self.combat.combatants = real_monsters() + self.combat.combatants
        self.combat.save()
        self.url = f'/api/combat/campaign/{self.camp.id}'

    def by_id(self, combat):
        return {cb['id']: cb for cb in combat['combatants']}

    def test_refs_instead_of_actions(self):
        old = self.by_id(self.c_dm.get(self.url).json()['combat'])
        self.assertEqual(old['drg']['stats']['actions'], STATBLOCKS['adult-red-dragon']['actions'])   # app de antes
        new = self.by_id(self.c_dm.get(f'{self.url}?sets=1').json()['combat'])
        drg = new['drg']['stats']
        self.assertNotIn('actions', drg)
        self.assertEqual((drg['ac'], drg['max_hp'], drg['cr'], drg['legendary']), (19, 256, '17', {'uses': 3, 'lairUses': 4}))
        self.assertEqual(new['gw1']['stats']['actionsRef'], new['gw3']['stats']['actionsRef'])   # iguais: 1 ref
        self.assertNotEqual(new['gw1']['stats']['actionsRef'], drg['actionsRef'])
        self.assertNotIn('actionsRef', new['k1']['stats'])            # PJ sem ações: igual
        self.assertNotIn('actionsRef', json.dumps(self.c_ana.get(f'{self.url}?sets=1').json()))  # jogador nem vê ações

    def test_actions_route_cacheable_and_dm_only(self):
        ref = self.by_id(self.c_dm.get(f'{self.url}?sets=1').json()['combat'])['drg']['stats']['actionsRef']
        r = self.c_dm.get(f'{self.url}/actions/{ref}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['actions'], STATBLOCKS['adult-red-dragon']['actions'])
        self.assertIn('immutable', r['Cache-Control'])
        self.assertTrue(r['Cache-Control'].startswith('private'))
        self.assertEqual(self.c_dm.get(f'{self.url}/actions/{ref}', HTTP_IF_NONE_MATCH=r['ETag']).status_code, 304)
        self.assertEqual(self.c_ana.get(f'{self.url}/actions/{ref}').status_code, 403)     # ações de monstro: só o mestre
        self.assertIn(self.anon.get(f'{self.url}/actions/{ref}').status_code, (401, 403))
        self.assertEqual(self.c_out.get(f'{self.url}/actions/{ref}').status_code, 403)
        self.assertEqual(self.c_dm.get(f'{self.url}/actions/000000000000').status_code, 404)
        # o monstro saiu do combate: o ref some
        self.c_dm.delete(f'{self.url}/combatants/drg')
        self.assertEqual(self.c_dm.get(f'{self.url}/actions/{ref}').status_code, 404)

    def test_changed_actions_change_the_ref(self):
        before = self.by_id(self.c_dm.get(f'{self.url}?sets=1').json()['combat'])['gw2']['stats']['actionsRef']
        cbs = self.combat.combatants
        cbs[2]['stats']['actions'][0]['atk'] = 6
        self.combat.combatants = cbs
        self.combat.save()
        after = self.by_id(self.c_dm.get(f'{self.url}?sets=1').json()['combat'])
        self.assertNotEqual(after['gw2']['stats']['actionsRef'], before)
        self.assertEqual(after['gw1']['stats']['actionsRef'], before)

    def test_turn_and_conflict_answers_use_refs(self):
        r = self.c_dm.post(f'{self.url}/next-turn?sets=1', {'expect': {'round': 1, 'turnIndex': 0}}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('actionsRef', self.by_id(r.json()['combat'])['drg']['stats'])
        stale = self.c_dm.post(f'{self.url}/next-turn?sets=1', {'expect': {'round': 1, 'turnIndex': 0}}, format='json')
        self.assertEqual(stale.status_code, 409)
        self.assertIn('actionsRef', self.by_id(stale.json()['combat'])['drg']['stats'])
        old = self.c_dm.post(f'{self.url}/prev-turn', {}, format='json')
        self.assertEqual(old.status_code, 200)
        self.assertIn('actions', self.by_id(old.json()['combat'])['drg']['stats'])

    def test_recent_log_only(self):
        log = [{'type': 'attack', 'attacker': 'Goblin', 'target': 'Kaelor', 'n': n} for n in range(40)]
        marks = [{'type': 'next_turn', 'round': 1, 'index': i} for i in range(3)]
        # ... 40 ataques, turno, 2 ataques, turno, 15 ataques (um turno longo, área em muitos alvos)
        self.combat.action_log = log + [marks[0]] + log[:2] + [marks[1]] + log[:15]
        self.combat.save()
        got = self.c_dm.get(self.url).json()['combat']['log']
        self.assertEqual(len(got), 1 + 2 + 1 + 15)     # desde o penúltimo turno (os avisos do mestre leem isso)
        self.assertEqual(got[0]['type'], 'next_turn')
        self.combat.action_log = log[:3] + [marks[0]] + [marks[1]]
        self.combat.save()
        self.assertEqual(len(self.c_dm.get(self.url).json()['combat']['log']), 5)   # no mínimo 10, se houver
        self.combat.action_log = (log + [marks[0]]) * 3
        self.combat.save()
        self.assertEqual(len(self.c_dm.get(self.url).json()['combat']['log']), 30)  # e no máximo 30
