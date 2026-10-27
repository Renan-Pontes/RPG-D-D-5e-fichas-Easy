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
import json

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
        self.assertEqual(set(d), {'v', 'lang', 'card', 'stage', 'campaign'})
        c = d['campaign']
        for key in ('state', 'members', 'combat', 'publicRolls', 'publicCheck'):
            self.assertIn(key, c)          # onde a TV de antes já lê (1 versão de transição)
        self.assertNotIn('card', c)        # o cartão só no topo (a TV de antes lê res.card primeiro)
        self.assertEqual(c['state'], {'session': '4', 'live': True})

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


class RealSizeTests(Base):
    """Tetos do aceite com 4 fotos de ~40 KB, 3 tokens de ~250 KB e mapa de ~300 KB."""

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
        monsters = [{'id': f'm{i}', 'type': 'monster', 'name': f'Goblin #{i}', 'initiative': 10 - i, 'current_hp': 7,
                     'position': {'x': 50 * i, 'y': 50}, 'sprite': big_image(250_000, bytes([97 + i])) if i < 3 else None,
                     'stats': {'ac': 15, 'max_hp': 7, 'actions': [{'name': 'Cimitarra', 'atk': 4, 'damage': '1d6+2',
                                                                   'damageType': 'slashing'}]}} for i in range(7)]
        c.combatants = monsters + c.combatants
        c.map_data = {**c.map_data, 'background_image': big_image(300_000, b'z')}
        c.save()

    def test_ceilings(self):
        tv = self.screen()
        self.assertLess(len(tv.content), 10_000, len(tv.content))
        combat = self.c_dm.get(f'/api/combat/campaign/{self.camp.id}')
        self.assertLess(len(combat.content), 10_000, len(combat.content))
        camp = self.c_dm.get(f'/api/campaigns/{self.camp.id}')
        self.assertLess(len(camp.content), 20_000, len(camp.content))
        nxt = self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/next-turn', {}, format='json')
        self.assertEqual(nxt.status_code, 200)
        self.assertLess(len(nxt.content), 10_000, len(nxt.content))
        for r in (tv, combat, camp, nxt):
            self.assertNotIn(b'base64', r.content)
        self.assertEqual(len(json.loads(tv.content)['campaign']['members']), 5)
