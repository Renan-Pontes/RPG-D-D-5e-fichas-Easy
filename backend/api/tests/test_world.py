"""
Mundo da campanha (WorldEntry): CRUD, filtro por papel (o jogador nunca vê
dm_notes, segredos não revelados, statblock nem entradas ocultas), versão
otimista (409), imagem, revelar, mundo de exemplo, "visto" e plano da sessão.
"""
import base64
import json

from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from api import world_rules as R
from api.models import Adventure, Campaign, Character, DiaryEntry, Membership, Profile, WorldEntry
from api.views_world import world_new_count

User = get_user_model()

PNG_1PX = 'data:image/png;base64,' + base64.b64encode(
    bytes.fromhex('89504e470d0a1a0a0000000d4948445200000001000000010806000000'
                  '1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082')).decode()

SECRET_WORDS = ('NOTA-DO-MESTRE', 'SEGREDO-OCULTO', 'STATBLOCK-X', 'ENTRADA-OCULTA')


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class WorldBase(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.p2 = make_user('p2@x.com', 'Bia')
        self.out = make_user('o@x.com', 'Outro')
        self.camp = Campaign.objects.create(dm=self.dm, name='Mesa', slug='mesa', state={'session': '4'})
        self.other = Campaign.objects.create(dm=self.out, name='Outra', slug='outra')
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        ch = Character.objects.create(owner=self.p1, name='Thal', data={'level': 1})
        self.m1 = Membership.objects.create(campaign=self.camp, user=self.p1, character=ch, role='player')
        self.m2 = Membership.objects.create(campaign=self.camp, user=self.p2, role='player')
        self.c_dm, self.c1, self.c2, self.c_out, self.anon = APIClient(), APIClient(), APIClient(), APIClient(), APIClient()
        self.c_dm.force_login(self.dm)
        self.c1.force_login(self.p1)
        self.c2.force_login(self.p2)
        self.c_out.force_login(self.out)
        self.base = f'/api/campaigns/{self.camp.id}/world'

    def create(self, client=None, **body):
        r = (client or self.c_dm).post(self.base, {'kind': 'npc', 'name': 'Fulano', **body}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()['entry']

    def detail(self, client, pk):
        return client.get(f'/api/world/{pk}')

    def patch(self, pk, **body):
        return self.c_dm.patch(f'/api/world/{pk}', body, format='json')


class WorldCrudTests(WorldBase):
    def test_create_only_kind_and_name(self):
        e = self.create(name='Borin')
        self.assertEqual(e['kind'], 'npc')
        self.assertEqual(e['visibility'], 'hidden')
        self.assertEqual(e['version'], 1)
        self.assertEqual(e['secrets'], [])
        self.assertIsNone(e['revealedAt'])

    def test_create_validation(self):
        r = self.c_dm.post(self.base, {'kind': 'dragon', 'name': 'X'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'invalid_kind')
        r = self.c_dm.post(self.base, {'kind': 'npc', 'name': '  '}, format='json')
        self.assertEqual(r.json()['error'], 'missing_name')
        r = self.c_dm.post(self.base, {'kind': 'npc', 'name': 'X', 'tags': [f't{i}' for i in range(13)]}, format='json')
        self.assertEqual(r.json()['error'], 'too_many_tags')
        r = self.c_dm.post(self.base, {'kind': 'npc', 'name': 'X', 'secrets': ['s'] * 21}, format='json')
        self.assertEqual(r.json()['error'], 'too_many_secrets')
        r = self.c_dm.post(self.base, {'kind': 'npc', 'name': 'X', 'body': 'a' * 20_001}, format='json')
        self.assertEqual(r.json()['error'], 'body_too_long')

    def test_players_and_strangers_cannot_create(self):
        r = self.c1.post(self.base, {'kind': 'npc', 'name': 'X'}, format='json')
        self.assertEqual(r.status_code, 403)
        r = self.c_out.post(self.base, {'kind': 'npc', 'name': 'X'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self.anon.get(self.base).status_code, 403)
        self.assertEqual(self.c_out.get(self.base).status_code, 403)

    def test_data_whitelist_per_kind(self):
        e = self.create(data={'role': 'Ferreiro', 'hp': 99, 'map': {'pins': []}, 'statblock': {'ac': 12}})
        self.assertEqual(e['data'], {'role': 'Ferreiro', 'statblock': {'ac': 12}})
        e = self.create(kind='faction', name='Guilda', data={'goal': 'Ouro', 'symbolColor': 'red; x', 'role': 'x'})
        self.assertEqual(e['data'], {'goal': 'Ouro'})
        e = self.create(kind='handout', name='Carta', data={'style': 'letter', 'recipients': [self.m1.id, 'x']})
        self.assertEqual(e['data'], {'style': 'letter', 'recipients': [self.m1.id]})

    def test_secrets_get_ids(self):
        e = self.create(secrets=['um', {'text': 'dois'}, {'id': 's1', 'text': 'três'}])
        ids = [s['id'] for s in e['secrets']]
        self.assertEqual(len(set(ids)), 3)
        self.assertTrue(all(ids))

    def test_patch_and_version_conflict(self):
        e = self.create(name='Borin')
        r = self.patch(e['id'], name='Borin Pé-de-Malte', version=1)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['entry']['version'], 2)
        # versão velha → 409 com a entrada atual
        r = self.patch(e['id'], name='Outro nome', version=1)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['entry']['name'], 'Borin Pé-de-Malte')
        self.assertEqual(r.json()['entry']['version'], 2)
        self.assertEqual(WorldEntry.objects.get(pk=e['id']).name, 'Borin Pé-de-Malte')

    def test_patch_by_player_is_404(self):
        e = self.create(visibility='revealed')
        r = self.c1.patch(f'/api/world/{e["id"]}', {'name': 'x'}, format='json')
        self.assertEqual(r.status_code, 404)
        r = self.c1.delete(f'/api/world/{e["id"]}')
        self.assertEqual(r.status_code, 404)
        self.assertTrue(WorldEntry.objects.filter(pk=e['id']).exists())

    def test_parent_links_and_cycles(self):
        a = self.create(kind='place', name='Reino')
        b = self.create(kind='place', name='Cidade', parentId=a['id'])
        self.assertEqual(b['parentId'], a['id'])
        r = self.patch(a['id'], parentId=b['id'])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'invalid_parent')
        other = WorldEntry.objects.create(campaign=self.other, kind='npc', name='Alheio')
        r = self.patch(a['id'], parentId=other.id)
        self.assertEqual(r.status_code, 400)
        # links para outra campanha ou inexistentes são descartados
        r = self.patch(a['id'], links=[{'to': b['id'], 'rel': 'ally'}, {'to': other.id, 'rel': 'enemy'},
                                       {'to': 99999, 'rel': 'x'}, {'to': a['id'], 'rel': 'ally'}])
        self.assertEqual(r.json()['entry']['links'], [{'to': b['id'], 'rel': 'ally', 'note': ''}])

    def test_patch_parent_and_kind(self):
        a = self.create(kind='place', name='Reino')
        b = self.create(name='Coisa', data={'role': 'x'})
        r = self.patch(b['id'], parentId=a['id'], kind='item', data={'rarity': 'rara', 'role': 'x'})
        self.assertEqual(r.status_code, 200, r.content)
        e = r.json()['entry']
        self.assertEqual((e['parentId'], e['kind'], e['data']), (a['id'], 'item', {'rarity': 'rara'}))
        r = self.patch(b['id'], parentId=None)
        self.assertIsNone(r.json()['entry']['parentId'])

    def test_delete_cleans_references(self):
        a = self.create(kind='place', name='Vila', data={'map': {'pins': []}})
        b = self.create(name='NPC')
        self.patch(a['id'], links=[{'to': b['id'], 'rel': 'other'}],
                   data={'map': {'pins': [{'id': 'p1', 'entryId': b['id'], 'x': 0.5, 'y': 0.5}]}})
        self.assertEqual(self.c_dm.delete(f'/api/world/{b["id"]}').status_code, 200)
        a2 = self.detail(self.c_dm, a['id']).json()['entry']
        self.assertEqual(a2['links'], [])
        self.assertIsNone(a2['data']['map']['pins'][0]['entryId'])

    def test_limit_entries(self):
        # Teto técnico por campanha agora vem dos planos (api/plans.py): 2.000 → 402 plan_limit 'cards'.
        from api.plans import MAX_CARDS_PER_CAMPAIGN
        WorldEntry.objects.bulk_create([WorldEntry(campaign=self.camp, kind='lore', name=f'E{i}') for i in range(MAX_CARDS_PER_CAMPAIGN)])
        r = self.c_dm.post(self.base, {'kind': 'npc', 'name': 'A 2001ª'}, format='json')
        self.assertEqual(r.status_code, 402)
        self.assertEqual((r.json()['error'], r.json()['limit']), ('plan_limit', 'cards'))

    def test_dm_list_is_light(self):
        self.create(name='Borin', body='corpo @[Velna](1)', dmNotes='NOTA-DO-MESTRE', secrets=['SEGREDO-OCULTO'])
        r = self.c_dm.get(self.base)
        self.assertEqual(r.status_code, 200)
        e = r.json()['entries'][0]
        for key in ('body', 'dmNotes', 'secrets', 'data'):
            self.assertNotIn(key, e)
        self.assertEqual(e['secretsCount'], 1)
        self.assertEqual(e['mentions'], [1])
        self.assertNotIn('NOTA-DO-MESTRE', r.content.decode())


class WorldPrivacyTests(WorldBase):
    """Aceite (a): o jogador nunca recebe dm_notes, segredos não revelados,
    statblock nem entradas hidden — lista, detalhe, imagem e pins."""

    def setUp(self):
        super().setUp()
        self.hidden = self.create(name='ENTRADA-OCULTA', summary='ENTRADA-OCULTA', dmNotes='NOTA-DO-MESTRE')
        self.partial = self.create(name='Velna', summary='Sacerdotisa', body='corpo do partial', visibility='partial',
                                   dmNotes='NOTA-DO-MESTRE', secrets=['SEGREDO-OCULTO'],
                                   data={'role': 'Sacerdotisa', 'statblock': {'name': 'STATBLOCK-X'}})
        self.revealed = self.create(
            name='Borin', summary='Taverneiro', visibility='revealed', dmNotes='NOTA-DO-MESTRE',
            body=f'Amigo de @[Velna]({self.partial["id"]}) e de @[o vilão]({self.hidden["id"]}).',
            secrets=[{'id': 's1', 'text': 'Revelado ok', 'revealed': True}, {'id': 's2', 'text': 'SEGREDO-OCULTO'}],
            data={'role': 'Taverneiro', 'statblock': {'name': 'STATBLOCK-X'}},
            links=[{'to': self.hidden['id'], 'rel': 'enemy'}, {'to': self.partial['id'], 'rel': 'ally'}],
            parentId=self.hidden['id'], whenLabel='Ano 312')
        self.map = self.create(kind='place', name='Vale', visibility='revealed', data={'placeType': 'village', 'map': {'pins': [
            {'id': 'p1', 'entryId': self.revealed['id'], 'x': 0.4, 'y': 0.5, 'visible': True},
            {'id': 'p2', 'entryId': self.hidden['id'], 'x': 0.1, 'y': 0.1, 'visible': True, 'label': 'ENTRADA-OCULTA'},
            {'id': 'p3', 'entryId': self.partial['id'], 'x': 0.2, 'y': 0.2, 'visible': False},
        ]}})

    def assert_clean(self, content):
        text = content.decode() if isinstance(content, bytes) else content
        for word in SECRET_WORDS:
            self.assertNotIn(word, text)
        self.assertNotIn('dmNotes', text)
        self.assertNotIn('statblock', text)

    def test_player_list(self):
        r = self.c1.get(self.base)
        self.assertEqual(r.status_code, 200)
        self.assert_clean(r.content)
        ids = {e['id'] for e in r.json()['entries']}
        self.assertEqual(ids, {self.partial['id'], self.revealed['id'], self.map['id']})
        rev = next(e for e in r.json()['entries'] if e['id'] == self.revealed['id'])
        self.assertEqual(rev['links'], [{'to': self.partial['id'], 'rel': 'ally', 'note': ''}])
        self.assertIsNone(rev['parentId'])
        self.assertEqual(rev['mentions'], [self.partial['id']])
        self.assertEqual(rev['secretsCount'], 1)
        self.assertEqual(rev['whenLabel'], 'Ano 312')
        part = next(e for e in r.json()['entries'] if e['id'] == self.partial['id'])
        self.assertEqual(part['secretsCount'], 0)
        self.assertIn('seenAt', r.json())

    def test_player_detail(self):
        self.assertEqual(self.detail(self.c1, self.hidden['id']).status_code, 404)
        r = self.detail(self.c1, self.partial['id'])
        self.assertEqual(r.status_code, 200)
        self.assert_clean(r.content)
        e = r.json()['entry']
        self.assertEqual(e['body'], '')
        self.assertEqual(e['secrets'], [])
        self.assertEqual(e['data'], {})
        self.assertEqual(e['summary'], 'Sacerdotisa')
        r = self.detail(self.c1, self.revealed['id'])
        self.assert_clean(r.content)
        e = r.json()['entry']
        self.assertEqual([s['text'] for s in e['secrets']], ['Revelado ok'])
        self.assertEqual(e['data'], {'role': 'Taverneiro'})
        # menção ao alvo oculto vira texto simples (sem id); ao parcial continua link
        self.assertIn(f'@[Velna]({self.partial["id"]})', e['body'])
        self.assertNotIn(f'({self.hidden["id"]})', e['body'])
        self.assertTrue(e['body'].endswith('e de o vilão.'))

    def test_player_pins(self):
        r = self.detail(self.c1, self.map['id'])
        self.assert_clean(r.content)
        pins = r.json()['entry']['data']['map']['pins']
        self.assertEqual([p['id'] for p in pins], ['p1'])
        # aceite WP4 (d): pin novo só aparece depois de marcado visível
        self.c_dm.post(f'/api/world/{self.map["id"]}/reveal', {'pins': {'p3': True}}, format='json')
        pins = self.detail(self.c1, self.map['id']).json()['entry']['data']['map']['pins']
        self.assertEqual({p['id'] for p in pins}, {'p1', 'p3'})

    def test_player_image(self):
        for e in (self.hidden, self.partial):
            r = self.c_dm.put(f'/api/world/{e["id"]}/image', {'image': PNG_1PX}, format='json')
            self.assertEqual(r.status_code, 200)
        self.assertEqual(self.c1.get(f'/api/world/{self.hidden["id"]}/image').status_code, 404)
        r = self.c1.get(f'/api/world/{self.partial["id"]}/image')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'image/png')
        self.assertTrue(r.content.startswith(b'\x89PNG'))
        self.assertEqual(self.c_out.get(f'/api/world/{self.partial["id"]}/image').status_code, 404)
        self.assertIn(self.anon.get(f'/api/world/{self.partial["id"]}/image').status_code, (401, 403))

    def test_stranger_gets_404(self):
        for e in (self.hidden, self.revealed):
            self.assertEqual(self.detail(self.c_out, e['id']).status_code, 404)

    def test_dm_sees_everything(self):
        r = self.detail(self.c_dm, self.revealed['id'])
        e = r.json()['entry']
        self.assertEqual(e['dmNotes'], 'NOTA-DO-MESTRE')
        self.assertEqual(len(e['secrets']), 2)
        self.assertIn('statblock', e['data'])

    def test_handout_recipients(self):
        h = self.create(kind='handout', name='Carta', visibility='revealed',
                        data={'style': 'letter', 'recipients': [self.m1.id]})
        self.assertEqual(self.detail(self.c1, h['id']).status_code, 200)
        self.assertNotIn('recipients', self.detail(self.c1, h['id']).content.decode())
        self.assertEqual(self.detail(self.c2, h['id']).status_code, 404)
        self.assertNotIn(h['id'], {e['id'] for e in self.c2.get(self.base).json()['entries']})


class WorldImageTests(WorldBase):
    def test_upload_and_cache_headers(self):
        e = self.create()
        r = self.c_dm.put(f'/api/world/{e["id"]}/image', {'image': PNG_1PX}, format='json')
        self.assertEqual(r.status_code, 200)
        ver = r.json()['imageVer']
        self.assertTrue(ver)
        self.assertEqual(self.detail(self.c_dm, e['id']).json()['entry']['imageVer'], ver)
        r = self.c_dm.get(f'/api/world/{e["id"]}/image?v={ver}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['ETag'], f'"{ver}"')
        self.assertIn('max-age=31536000', r['Cache-Control'])
        self.assertIn('private', r['Cache-Control'])
        r = self.c_dm.get(f'/api/world/{e["id"]}/image?v={ver}', HTTP_IF_NONE_MATCH=f'"{ver}"')
        self.assertEqual(r.status_code, 304)
        # a lista nunca leva a imagem
        self.assertNotIn('base64', self.c_dm.get(self.base).content.decode())
        r = self.c_dm.delete(f'/api/world/{e["id"]}/image')
        self.assertEqual(r.json()['imageVer'], '')
        self.assertEqual(self.c_dm.get(f'/api/world/{e["id"]}/image').status_code, 404)

    def test_image_too_large(self):
        e = self.create()
        big = 'data:image/jpeg;base64,' + 'A' * 450_001
        r = self.c_dm.put(f'/api/world/{e["id"]}/image', {'image': big}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'image_too_large')

    def test_image_invalid(self):
        e = self.create()
        for bad in ('data:image/svg+xml;base64,PHN2Zz4=', 'http://x/y.png', 'data:image/png;base64,<script>'):
            r = self.c_dm.put(f'/api/world/{e["id"]}/image', {'image': bad}, format='json')
            self.assertEqual(r.status_code, 400, bad)

    def test_player_cannot_upload(self):
        e = self.create(visibility='revealed')
        r = self.c1.put(f'/api/world/{e["id"]}/image', {'image': PNG_1PX}, format='json')
        self.assertEqual(r.status_code, 404)


class WorldRevealTests(WorldBase):
    def test_reveal_visibility_and_secret_logs_diary(self):
        e = self.create(name='Irmã Velna', secrets=['Ouve o sino', 'Tem um irmão'])
        sid = e['secrets'][0]['id']
        r = self.c_dm.post(f'/api/world/{e["id"]}/reveal', {'visibility': 'revealed', 'secrets': {sid: True}}, format='json')
        self.assertEqual(r.status_code, 200)
        out = r.json()['entry']
        self.assertEqual(out['visibility'], 'revealed')
        self.assertTrue(out['revealedAt'])
        self.assertEqual(out['version'], 2)
        s = next(x for x in out['secrets'] if x['id'] == sid)
        self.assertTrue(s['revealed'])
        self.assertEqual(s['session'], 4)
        d = DiaryEntry.objects.get(campaign=self.camp, subtype='reveal')
        self.assertEqual(d.title, 'Revelado: Irmã Velna')
        self.assertEqual(d.body, 'Ouve o sino')
        self.assertEqual(d.data['entryId'], e['id'])
        self.assertNotIn('Tem um irmão', json.dumps(d.data, ensure_ascii=False))
        # aceite WP4 (c): o jogador vê só aquele segredo
        p = self.detail(self.c1, e['id']).json()['entry']
        self.assertEqual([x['text'] for x in p['secrets']], ['Ouve o sino'])
        self.assertEqual(p['secrets'][0]['session'], 4)

    def test_reveal_without_diary(self):
        e = self.create()
        self.c_dm.post(f'/api/world/{e["id"]}/reveal', {'visibility': 'partial', 'logDiary': False}, format='json')
        self.assertFalse(DiaryEntry.objects.filter(subtype='reveal').exists())
        self.assertEqual(WorldEntry.objects.get(pk=e['id']).visibility, 'partial')

    def test_rehide_does_not_log(self):
        e = self.create(visibility='revealed')
        self.c_dm.post(f'/api/world/{e["id"]}/reveal', {'visibility': 'hidden'}, format='json')
        self.assertFalse(DiaryEntry.objects.filter(subtype='reveal').exists())
        self.assertEqual(self.detail(self.c1, e['id']).status_code, 404)

    def test_reveal_unknown_secret(self):
        e = self.create()
        r = self.c_dm.post(f'/api/world/{e["id"]}/reveal', {'secrets': {'zz': True}}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_player_cannot_reveal(self):
        e = self.create(visibility='partial')
        r = self.c1.post(f'/api/world/{e["id"]}/reveal', {'visibility': 'revealed'}, format='json')
        self.assertEqual(r.status_code, 404)
        self.assertEqual(WorldEntry.objects.get(pk=e['id']).visibility, 'partial')

    def test_patch_secret_reveal_stamps_session(self):
        e = self.create(visibility='revealed', secrets=['a'])
        secrets = [{**e['secrets'][0], 'revealed': True}]
        r = self.patch(e['id'], secrets=secrets, version=e['version'])
        self.assertEqual(r.json()['entry']['secrets'][0]['session'], 4)
        # PATCH não escreve no diário (só o reveal explícito)
        self.assertFalse(DiaryEntry.objects.filter(subtype='reveal').exists())


class WorldSeenTests(WorldBase):
    def test_new_count_and_seen(self):
        e = self.create()
        self.assertEqual(world_new_count(self.camp, self.m1), 0)
        self.c_dm.post(f'/api/world/{e["id"]}/reveal', {'visibility': 'revealed'}, format='json')
        self.assertEqual(world_new_count(self.camp, self.m1), 1)
        r = self.c1.post(f'{self.base}/seen')
        self.assertEqual(r.status_code, 200)
        self.m1.refresh_from_db()
        self.assertIsNotNone(self.m1.world_seen_at)
        self.assertEqual(world_new_count(self.camp, self.m1), 0)
        self.assertEqual(self.c1.get(self.base).json()['seenAt'], self.m1.world_seen_at.isoformat())
        self.assertEqual(self.c_out.post(f'{self.base}/seen').status_code, 403)
        self.assertEqual(self.c_dm.post(f'{self.base}/seen').status_code, 200)


class WorldSampleTests(WorldBase):
    def test_sample_creates_village_then_409(self):
        r = self.c_dm.post(f'{self.base}/sample', {'lang': 'pt'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        entries = r.json()['entries']
        kinds = sorted(e['kind'] for e in entries)
        self.assertEqual(kinds, ['faction', 'lore', 'lore', 'npc', 'npc', 'npc', 'place'])
        village = next(e for e in entries if e['kind'] == 'place')
        self.assertEqual(village['name'], 'Vale de Brumafria')
        self.assertTrue(village['isMap'])
        self.assertTrue(village['imageVer'])
        adv = Adventure.objects.get(pk=r.json()['adventureId'])
        self.assertEqual(len(adv.data['nodes']), 3)
        ids = {e['id'] for e in entries}
        for node in adv.data['nodes']:
            self.assertTrue(node['refs'])
            self.assertTrue(set(node['refs']) <= ids)
        # o jogador vê só o que nasceu revelado/parcial — sem o vilão
        visible = {e['name'] for e in self.c1.get(self.base).json()['entries']}
        self.assertIn('Vale de Brumafria', visible)
        self.assertNotIn('Morvane, o Tecelão de Névoa', visible)
        pins = self.detail(self.c1, village['id']).json()['entry']['data']['map']['pins']
        self.assertEqual(len(pins), 2)
        self.assertEqual(self.c1.get(f'/api/world/{village["id"]}/image').status_code, 200)
        # segunda chamada
        r = self.c_dm.post(f'{self.base}/sample', {'lang': 'pt'}, format='json')
        self.assertEqual(r.status_code, 409)

    def test_sample_english(self):
        r = self.c_dm.post(f'{self.base}/sample', {'lang': 'en'}, format='json')
        names = {e['name'] for e in r.json()['entries']}
        self.assertIn('Mistfrost Vale', names)
        self.assertIn('Sister Velna', names)

    def test_sample_dm_only(self):
        self.assertEqual(self.c1.post(f'{self.base}/sample', {}, format='json').status_code, 403)


class SessionPlanTests(WorldBase):
    def url(self):
        return f'/api/campaigns/{self.camp.id}/session-plan'

    def test_get_default_and_merge(self):
        r = self.c_dm.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['plan']['scenes'], [])
        r = self.c_dm.put(self.url(), {'strongStart': 'Emboscada na ponte'}, format='json')
        self.assertEqual(r.json()['plan']['strongStart'], 'Emboscada na ponte')
        r = self.c_dm.put(self.url(), {'scenes': [{'text': 'Taverna', 'nodeRef': {'adventureId': 1, 'nodeId': 'n1'}},
                                                   {'text': 'X', 'nodeRef': 'lixo'}],
                                       'secrets': [{'id': 'p1', 'text': 'O sino', 'ref': {'entryId': 5, 'secretId': 's2'},
                                                    'discovered': True}],
                                       'npcIds': [5, 5, 'x', 9], 'junk': 1}, format='json')
        plan = r.json()['plan']
        self.assertEqual(plan['strongStart'], 'Emboscada na ponte')  # merge preserva
        self.assertEqual(plan['scenes'][0]['nodeRef'], {'adventureId': 1, 'nodeId': 'n1'})
        self.assertIsNone(plan['scenes'][1]['nodeRef'])
        self.assertEqual(plan['secrets'][0]['ref'], {'entryId': 5, 'secretId': 's2'})
        self.assertEqual(plan['npcIds'], [5, 9])
        self.assertNotIn('junk', plan)
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.dm_settings['sessionPlan']['npcIds'], [5, 9])

    def test_keeps_other_dm_settings(self):
        self.camp.dm_settings = {'onboarding': {'cover': True}}
        self.camp.save()
        self.c_dm.put(self.url(), {'monsters': 'goblins'}, format='json')
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.dm_settings['onboarding'], {'cover': True})

    def test_dm_only(self):
        self.assertEqual(self.c1.get(self.url()).status_code, 403)
        self.assertEqual(self.c1.put(self.url(), {'monsters': 'x'}, format='json').status_code, 403)

    def test_limits(self):
        r = self.c_dm.put(self.url(), {'secrets': [{'text': 'x'}] * 31}, format='json')
        self.assertEqual(r.status_code, 400)


class WorldRulesUnitTests(TestCase):
    def test_mentions(self):
        self.assertEqual(R.mentions('a @[X](3) b @[Y](4) @[X](3)'), [3, 4])
        self.assertEqual(R.strip_mentions('@[X](3) e @[Y](4)', {3}), '@[X](3) e Y')

    def test_clean_map_limits(self):
        with self.assertRaises(R.WorldError):
            R.clean_data('place', {'map': {'pins': [{}] * 101}})
        d = R.clean_data('place', {'map': {'pins': [{'x': 5, 'y': -1, 'visible': 1}]}})
        self.assertEqual(d['map']['pins'][0]['x'], 1.0)
        self.assertEqual(d['map']['pins'][0]['y'], 0.0)
        self.assertTrue(d['map']['pins'][0]['id'])


class WorldClearTests(WorldBase):
    def test_clear_needs_dm_and_name(self):
        self.create(name='A')
        self.assertEqual(self.c1.post(f'{self.base}/clear', {'confirm': 'Mesa'}, format='json').status_code, 403)
        r = self.c_dm.post(f'{self.base}/clear', {'confirm': 'Outra coisa'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(WorldEntry.objects.filter(campaign=self.camp).count(), 1)

    def test_clear_keeps_campaign_and_optionally_adventures(self):
        r = self.c_dm.post(f'{self.base}/sample', {'lang': 'pt'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.create(name='Extra')
        WorldEntry.objects.create(campaign=self.other, kind='npc', name='Alheio')
        r = self.c_dm.post(f'{self.base}/clear', {'confirm': '  mesa '}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertGreater(r.json()['deleted']['entries'], 1)
        self.assertEqual(WorldEntry.objects.filter(campaign=self.camp).count(), 0)
        self.assertEqual(WorldEntry.objects.filter(campaign=self.other).count(), 1)
        self.assertTrue(Adventure.objects.filter(campaign=self.camp).exists())
        self.assertTrue(Campaign.objects.filter(pk=self.camp.pk).exists())
        self.assertEqual(self.camp.memberships.count(), 3)
        # o exemplo pode ser criado de novo
        self.assertEqual(self.c_dm.post(f'{self.base}/sample', {'lang': 'pt'}, format='json').status_code, 201)
        r = self.c_dm.post(f'{self.base}/clear', {'confirm': 'Mesa', 'adventures': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Adventure.objects.filter(campaign=self.camp).exists())
