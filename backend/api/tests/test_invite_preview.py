"""
Pacote I1: prévia do convite (GET /campaigns/invite/<code>), lista leve do Mundo
com subconjunto de `data`, telão sem fundo de mapa inline, documentos privados
fora do telão, subtipos novos do diário e admin do Mundo.
"""
import base64

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import (Campaign, CombatInstance, DiaryEntry, Membership, Profile, WorldEntry,
                        WorldImage)

User = get_user_model()

PNG_1PX = 'data:image/png;base64,' + base64.b64encode(
    bytes.fromhex('89504e470d0a1a0a0000000d4948445200000001000000010806000000'
                  '1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082')).decode()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre Zé')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.p2 = make_user('p2@x.com', 'Bia')
        self.out = make_user('o@x.com', 'Outro')
        self.camp = Campaign.objects.create(
            dm=self.dm, name='Mesa', slug='mesa', invite_code='ABC234', tagline='Brumas', accent='#c9a24a',
            state={'session': 2, 'levelingMode': 'xp', 'allowMulticlass': False, 'scene': 'SEGREDO-CENA'})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.m1 = Membership.objects.create(campaign=self.camp, user=self.p1, role='player')
        self.m2 = Membership.objects.create(campaign=self.camp, user=self.p2, role='player')
        self.c_dm, self.c1, self.c_out, self.anon = APIClient(), APIClient(), APIClient(), APIClient()
        self.c_dm.force_login(self.dm)
        self.c1.force_login(self.p1)
        self.c_out.force_login(self.out)


class InvitePreviewTests(Base):
    def test_preview_for_outsider(self):
        r = self.c_out.get('/api/campaigns/invite/ABC234')
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        self.assertEqual(body, {
            'campaignId': self.camp.id, 'slug': 'mesa', 'name': 'Mesa', 'tagline': 'Brumas',
            'accent': '#c9a24a', 'dmName': 'Mestre Zé', 'members': 2, 'levelingMode': 'xp',
            'allowMulticlass': False, 'alreadyMember': False,
        })
        # nada de estado, tokens ou código
        text = r.content.decode()
        for leak in ('SEGREDO-CENA', self.camp.screen_token, 'inviteCode', 'screenToken'):
            self.assertNotIn(leak, text)

    def test_lowercase_and_spaces(self):
        r = self.c_out.get('/api/campaigns/invite/abc234')
        self.assertEqual(r.status_code, 200)

    def test_already_member(self):
        self.assertTrue(self.c1.get('/api/campaigns/invite/ABC234').json()['alreadyMember'])
        self.assertTrue(self.c_dm.get('/api/campaigns/invite/ABC234').json()['alreadyMember'])

    def test_defaults(self):
        self.camp.state = {}
        self.camp.save()
        body = self.c_out.get('/api/campaigns/invite/ABC234').json()
        self.assertEqual(body['levelingMode'], 'milestone')
        self.assertTrue(body['allowMulticlass'])
        self.assertNotIn('coverUrl', body)

    def test_invalid(self):
        for code in ('ZZZ999', 'x', 'ABC234XXXXXXXX', 'ABC-23'):
            r = self.c_out.get(f'/api/campaigns/invite/{code}')
            self.assertEqual(r.status_code, 404, code)
            self.assertEqual(r.json()['error'], 'invite_invalid')

    def test_requires_login(self):
        self.assertIn(self.anon.get('/api/campaigns/invite/ABC234').status_code, (401, 403))
        self.assertIn(self.anon.get('/api/campaigns/invite/ABC234/cover').status_code, (401, 403))

    def test_rate_limited_per_user(self):
        for _ in range(30):
            self.c_out.get('/api/campaigns/invite/ZZZ999')
        r = self.c_out.get('/api/campaigns/invite/ABC234')
        self.assertEqual(r.status_code, 429)
        # outro usuário não é afetado
        self.assertEqual(self.c1.get('/api/campaigns/invite/ABC234').status_code, 200)

    def test_cover(self):
        self.camp.cover_image = PNG_1PX
        self.camp.cover_ver = 'v1abc'
        self.camp.save()
        body = self.c_out.get('/api/campaigns/invite/ABC234').json()
        self.assertEqual(body['coverUrl'], '/api/campaigns/invite/ABC234/cover?v=v1abc')
        r = self.c_out.get(body['coverUrl'])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'image/png')
        self.assertEqual(self.c_out.get('/api/campaigns/invite/ZZZ999/cover').status_code, 404)

    def test_rotated_code_stops_working(self):
        self.c_dm.post(f'/api/campaigns/{self.camp.id}/rotate-invite-code')
        self.assertEqual(self.c_out.get('/api/campaigns/invite/ABC234').status_code, 404)

    def test_campaign_routes_not_shadowed(self):
        # slug 'invite' continua acessível pelas rotas da campanha
        c = Campaign.objects.create(dm=self.dm, name='Inv', slug='invite')
        self.assertEqual(self.c_dm.get('/api/campaigns/invite/items').status_code, 200)
        self.assertEqual(self.c_dm.get('/api/campaigns/invite').json()['campaign']['id'], c.id)


class WorldLightDataTests(Base):
    def setUp(self):
        super().setUp()
        self.npc = WorldEntry.objects.create(campaign=self.camp, kind='npc', name='Velna', visibility='revealed',
                                             data={'role': 'Taverneira', 'statblock': {'name': 'STAT-X'},
                                                   'wants': 'ouro'})
        self.place = WorldEntry.objects.create(campaign=self.camp, kind='place', name='Vila', visibility='partial',
                                               data={'placeType': 'village'})
        self.item = WorldEntry.objects.create(campaign=self.camp, kind='item', name='Espada', visibility='hidden',
                                              data={'rarity': 'rare', 'campaignItemId': 9})
        self.doc = WorldEntry.objects.create(campaign=self.camp, kind='handout', name='Carta', visibility='revealed',
                                             data={'style': 'letter', 'recipients': [self.m2.id]})

    def entries(self, client):
        r = client.get(f'/api/campaigns/{self.camp.id}/world')
        self.assertEqual(r.status_code, 200)
        return {e['name']: e for e in r.json()['entries']}

    def test_dm_gets_subset(self):
        e = self.entries(self.c_dm)
        self.assertEqual(e['Velna']['data'], {'role': 'Taverneira'})
        self.assertEqual(e['Vila']['data'], {'placeType': 'village'})
        self.assertEqual(e['Espada']['data'], {'rarity': 'rare'})
        self.assertEqual(e['Carta']['data'], {'style': 'letter'})

    def test_player_filtered(self):
        e = self.entries(self.c1)
        self.assertEqual(e['Velna']['data'], {'role': 'Taverneira'})
        self.assertNotIn('data', e['Vila'])  # parcial: só nome/resumo
        self.assertNotIn('Espada', e)
        self.assertNotIn('Carta', e)  # documento para outro jogador
        self.assertNotIn('STAT-X', str(e))


class ScreenTests(Base):
    def test_map_background_not_inline(self):
        CombatInstance.objects.create(campaign=self.camp, map_data={'background_image': PNG_1PX, 'grid_size_px': 50})
        r = self.anon.get(f'/api/screen/{self.camp.screen_token}')
        self.assertEqual(r.status_code, 200)
        m = r.json()['combat']['map']
        self.assertNotIn('background_image', m)
        self.assertEqual(m['grid_size_px'], 50)
        self.assertNotIn('base64', r.content.decode())
        img = self.anon.get(m['backgroundUrl'])
        self.assertEqual(img.status_code, 200)
        self.assertEqual(img['Content-Type'], 'image/png')
        self.assertEqual(self.anon.get('/api/screen/nao-existe/map').status_code, 404)

    def test_private_handout_refused_and_ignored(self):
        doc = WorldEntry.objects.create(campaign=self.camp, kind='handout', name='Carta', visibility='revealed',
                                        body='SO-PRA-BIA', image_ver='v1',
                                        data={'style': 'letter', 'recipients': [self.m2.id]})
        WorldImage.objects.create(entry=doc, data=PNG_1PX)
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/screen-card', {'type': 'entry', 'entryId': doc.id},
                           format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'handout_private')
        # mesmo que o cartão já esteja gravado (ex.: destinatários mudaram depois)
        self.camp.state = {**self.camp.state, 'screenCard': {'type': 'entry', 'entryId': doc.id, 'secretIds': []}}
        self.camp.save()
        tv = self.anon.get(f'/api/screen/{self.camp.screen_token}')
        self.assertIsNone(tv.json()['card'])
        self.assertNotIn('SO-PRA-BIA', tv.content.decode())
        self.assertEqual(self.anon.get(f'/api/screen/{self.camp.screen_token}/image/{doc.id}').status_code, 404)

    def test_public_handout_still_shows(self):
        doc = WorldEntry.objects.create(campaign=self.camp, kind='handout', name='Edital', visibility='revealed',
                                        body='Procura-se', data={'style': 'notice', 'recipients': 'all'})
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/screen-card', {'type': 'entry', 'entryId': doc.id},
                           format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['card']['title'], 'Edital')


class DiaryAndAdminTests(Base):
    def test_diary_filter_new_subtypes(self):
        for st in ('levelgrant', 'reveal', 'xp'):
            DiaryEntry.objects.create(campaign=self.camp, kind='event', subtype=st, title=st)
        r = self.c_dm.get(f'/api/campaigns/{self.camp.id}/diary?subtype=levelgrant,reveal')
        self.assertEqual(r.status_code, 200)
        subtypes = sorted(e['subtype'] for e in r.json()['entries'])
        self.assertEqual(subtypes, ['levelgrant', 'reveal'])

    def test_world_models_in_admin(self):
        self.assertIn(WorldEntry, admin.site._registry)
        self.assertIn(WorldImage, admin.site._registry)
