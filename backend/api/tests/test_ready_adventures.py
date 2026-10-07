"""
Aventuras prontas da Forja: conteúdo (bilíngue, ids reais do bestiário e do
catálogo de itens, dificuldade adequada) e importação (cartões ocultos,
aventura em Rascunho, plano da sessão, idempotência, permissões).
"""
import os
import re

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api import adventures_ready as READY
from api import world_rules as R
from api.models import Adventure, Campaign, Character, Membership, Profile, WorldEntry

User = get_user_model()
FRONT_DATA = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'frontend', 'data')
XP_BY_CR = {0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700}
HIGH_BUDGET_PER_PC = {1: 100, 2: 200, 3: 400}   # XP "alta" por personagem (regras 2024)


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


def bestiary_ids():
    ids = set()
    for fname in ('monsters-srd521.js', 'monsters.js'):
        path = os.path.join(FRONT_DATA, fname)
        if os.path.exists(path):
            with open(path, encoding='utf-8') as f:
                ids |= set(re.findall(r"""['"]?id['"]?\s*:\s*['"]([a-z0-9-]+)['"]""", f.read()))
    return ids


def strings(value):
    """Todos os textos de um pacote (para conferir tokens {@chave})."""
    if isinstance(value, READY.Tr):
        yield from strings(value.pt)
        yield from strings(value.en)
    elif isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for v in value.values():
            yield from strings(v)
    elif isinstance(value, (list, tuple)):
        for v in value:
            yield from strings(v)


class ReadyContentTests(TestCase):
    def test_three_packs_with_expected_shape(self):
        packs = READY._packs()
        self.assertEqual([p['id'] for p in packs], ['lanterna-do-moinho', 'cha-da-madrinha', 'mare-de-cinzas'])
        monsters = bestiary_ids()
        self.assertTrue(monsters, 'bestiário do frontend não encontrado')
        items = READY.item_snapshots()
        for p in packs:
            with self.subTest(pack=p['id']):
                kinds = [e['kind'] for e in p['entries']]
                self.assertTrue(6 <= len(p['nodes']) <= 10)
                self.assertTrue(4 <= kinds.count('npc') <= 8)
                self.assertTrue(1 <= kinds.count('faction') <= 2)
                self.assertTrue(2 <= kinds.count('handout') <= 3)
                self.assertGreaterEqual(kinds.count('place'), 2)
                self.assertGreaterEqual(kinds.count('lore'), 1)
                keys = {e['key'] for e in p['entries']}
                self.assertEqual(len(keys), len(p['entries']))
                node_ids = {n['id'] for n in p['nodes']}
                for e in p['entries']:
                    for to, rel in e.get('links', []):
                        self.assertIn(to, keys)
                        self.assertIn(rel, R.RELS)
                    if e.get('parent'):
                        self.assertIn(e['parent'], keys)
                    if e['kind'] == 'npc':
                        for f in ('role', 'appearance', 'mannerism', 'wants'):
                            self.assertIn(f, e['data'])
                for n in p['nodes']:
                    for k in n.get('refs', []):
                        self.assertIn(k, keys)
                    for mid, count in n.get('encounter', []):
                        self.assertIn(mid, monsters, f'monstro inexistente no bestiário: {mid}')
                        self.assertIn(mid, READY.MONSTERS)
                    for sid, qty in n.get('treasure', {}).get('items', []):
                        self.assertIn(sid, items, f'item fora do catálogo: {sid}')
                    for skill, dc, _note in n.get('checks', []):
                        self.assertTrue(8 <= dc <= 20)
                for eid, a, b, kind, _l, _c in p['edges']:
                    self.assertIn(a, node_ids)
                    self.assertIn(b, node_ids)
                for _text, key, sidx in p['clues']:
                    entry = next(e for e in p['entries'] if e['key'] == key)
                    if sidx is not None:
                        self.assertLess(sidx, len(entry.get('secrets', [])))
                for token in {m for s in strings(p) for m in READY.TOKEN_RE.findall(s)}:
                    self.assertIn(token, keys)
                self.assertTrue(set(p['planScenes']) <= node_ids)

    def test_bilingual_and_within_limits(self):
        for p in READY._packs():
            for lang in ('pt', 'en'):
                with self.subTest(pack=p['id'], lang=lang):
                    for e in READY.loc(p['entries'], lang):
                        self.assertTrue(e['name'] and len(e['name']) <= R.MAX_NAME)
                        self.assertTrue(e['summary'] and len(e['summary']) <= R.MAX_SUMMARY, e['name'])
                        self.assertTrue(e['body'])
                        self.assertLessEqual(len(e.get('when', '')), R.MAX_WHEN_LABEL)
                    for n in READY.loc(p['nodes'], lang):
                        self.assertTrue(n['readAloud'] and n['notes'] and n['name'])
            # textos realmente traduzidos (pt ≠ en)
            for f in ('name', 'synopsis', 'hook', 'strongStart', 'pitch'):
                self.assertNotEqual(p[f].pt, p[f].en)
            for n in p['nodes']:
                self.assertNotEqual(n['readAloud'].pt, n['readAloud'].en)

    def test_encounters_fit_the_level(self):
        """Nenhum encontro passa da dificuldade Alta para 4 personagens do menor nível indicado."""
        for p in READY._packs():
            low = int(p['levels'][0])
            budget = HIGH_BUDGET_PER_PC[low] * 4
            for n in p['nodes']:
                xp = sum(XP_BY_CR[READY.MONSTERS[mid][2]] * c for mid, c in n.get('encounter', []))
                with self.subTest(pack=p['id'], node=n['id']):
                    self.assertLessEqual(xp, budget)
            self.assertTrue(any(n['kind'] == 'boss' for n in p['nodes']))


class ReadyRenderTests(TestCase):
    def test_articles_are_not_doubled(self):
        ids = {'g': 1, 'm': 2, 'c': 3}
        pt = {'g': 'A Guilda do Sal', 'm': 'O Moinho Velho', 'c': 'Cassio'}
        en = {'g': 'The Salt Guild', 'm': 'The Old Mill', 'c': 'Cassio'}
        self.assertEqual(READY._render('mestre da {@g}; A {@g} manda', ids, pt, False, 'pt'),
                         'mestre da Guilda do Sal; A Guilda do Sal manda')
        self.assertEqual(READY._render('lenda de {@m}, em {@m}, {@c}', ids, pt, False, 'pt'),
                         'lenda do Moinho Velho, no Moinho Velho, Cassio')
        self.assertEqual(READY._render('De {@g}', ids, pt, False, 'pt'), 'Da Guilda do Sal')
        self.assertEqual(READY._render('to the {@m}. {@m}', ids, en, False, 'en'), 'to the Old Mill. The Old Mill')
        self.assertEqual(READY._render('vá ao {@m}', ids, pt, True, 'pt'), 'vá ao @[Moinho Velho](2)')
        with self.assertRaises(KeyError):
            READY._render('{@zz}', ids, pt, False, 'pt')


class ReadyImportTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.out = make_user('o@x.com', 'Outro')
        self.camp = Campaign.objects.create(dm=self.dm, name='Mesa', slug='mesa')
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        ch = Character.objects.create(owner=self.p1, name='Thal', data={'level': 1})
        Membership.objects.create(campaign=self.camp, user=self.p1, character=ch, role='player')
        self.c_dm, self.c1, self.c_out = APIClient(), APIClient(), APIClient()
        self.c_dm.force_login(self.dm)
        self.c1.force_login(self.p1)
        self.c_out.force_login(self.out)
        self.url = f'/api/campaigns/{self.camp.id}/ready-adventure'

    def test_catalog_has_no_spoilers(self):
        r = self.c1.get('/api/ready-adventures?lang=en')
        self.assertEqual(r.status_code, 200)
        items = r.json()['adventures']
        self.assertEqual(len(items), 3)
        self.assertEqual(items[0]['name'], 'The Mill Lantern')
        for it in items:
            self.assertTrue(it['art'].startswith('/art/'))
            self.assertNotIn('synopsis', it)
        self.assertEqual(APIClient().get('/api/ready-adventures').status_code, 403)

    def test_import_creates_hidden_world_and_draft_adventure(self):
        r = self.c_dm.post(self.url, {'id': 'lanterna-do-moinho', 'lang': 'pt'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertTrue(body['sessionPlanFilled'])
        entries = WorldEntry.objects.filter(campaign=self.camp)
        pack = READY.get_pack('lanterna-do-moinho')
        self.assertEqual(entries.count(), len(pack['entries']))
        self.assertFalse(entries.exclude(visibility='hidden').exists())
        adv = Adventure.objects.get(pk=body['adventureId'])
        self.assertEqual(adv.status, 'draft')
        self.assertEqual(adv.name, 'A Lanterna do Moinho')
        self.assertIn('SINOPSE', adv.summary)
        nodes = adv.data['nodes']
        self.assertEqual(len(nodes), len(pack['nodes']))
        ids = set(entries.values_list('id', flat=True))
        for n in nodes:
            self.assertTrue(set(n['refs']) <= ids)
            self.assertNotIn('{@', n['readAloud'] + n['notes'])
        boss = next(n for n in nodes if n['kind'] == 'boss')
        self.assertEqual(boss['encounter'][0]['monsterId'], 'imp')
        self.assertEqual(boss['encounter'][0]['name'], 'Diabrete')
        loot = boss['treasure']['items']
        self.assertTrue(all(it['id'].startswith('item-ready-') for it in loot))
        self.assertEqual(loot[0]['sourceId'], 'cloakProtection')
        self.assertEqual(loot[0]['name'], 'Capa de Proteção')
        # menções do corpo apontam para cartões reais; segredos com id
        village = entries.get(name='Vau-de-Trigo')
        self.assertTrue(R.mentions(village.body))
        self.assertTrue(set(R.mentions(village.body)) <= ids)
        pavio = entries.get(name='Pavio, a Chama Verde')
        self.assertEqual(pavio.secrets[0]['id'], 's1')
        self.assertFalse(pavio.secrets[0]['revealed'])
        self.assertTrue(pavio.dm_notes)
        self.assertIsNotNone(pavio.parent_id)
        # plano da sessão preenchido com começo forte, cenas e pistas ligadas
        plan = Campaign.objects.get(pk=self.camp.pk).dm_settings['sessionPlan']
        self.assertIn('Mó Cantante', plan['strongStart'])
        self.assertEqual(plan['scenes'][0]['nodeRef'], {'adventureId': adv.id, 'nodeId': 'n1'})
        self.assertTrue(all(s['ref']['entryId'] in ids for s in plan['secrets']))
        self.assertTrue(plan['npcIds'] and plan['monsters'] and plan['rewards'])

    def test_player_sees_nothing_until_revealed(self):
        self.c_dm.post(self.url, {'id': 'mare-de-cinzas', 'lang': 'pt'}, format='json')
        r = self.c1.get(f'/api/campaigns/{self.camp.id}/world')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json().get('entries'), [])

    def test_idempotent_409_and_status(self):
        r1 = self.c_dm.post(self.url, {'id': 'cha-da-madrinha', 'lang': 'en'}, format='json')
        self.assertEqual(r1.status_code, 201)
        r2 = self.c_dm.post(self.url, {'id': 'cha-da-madrinha', 'lang': 'en'}, format='json')
        self.assertEqual(r2.status_code, 409)
        self.assertEqual(r2.json(), {'error': 'already_imported', 'adventureId': r1.json()['adventureId']})
        self.assertEqual(Adventure.objects.filter(campaign=self.camp).count(), 1)
        status = {a['id']: a for a in self.c_dm.get(self.url + '?lang=en').json()['adventures']}
        self.assertTrue(status['cha-da-madrinha']['imported'])
        self.assertFalse(status['mare-de-cinzas']['imported'])
        self.assertEqual(Adventure.objects.get(pk=r1.json()['adventureId']).name, "Granny Nettle's Tea")
        # Apagou a aventura → pode importar de novo
        Adventure.objects.filter(pk=r1.json()['adventureId']).delete()
        self.assertEqual(self.c_dm.post(self.url, {'id': 'cha-da-madrinha'}, format='json').status_code, 201)

    def test_existing_plan_is_never_overwritten(self):
        self.camp.dm_settings = {'sessionPlan': {'strongStart': 'Meu começo', 'scenes': [], 'secrets': []}}
        self.camp.save()
        r = self.c_dm.post(self.url, {'id': 'lanterna-do-moinho'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertFalse(r.json()['sessionPlanFilled'])
        settings = Campaign.objects.get(pk=self.camp.pk).dm_settings
        self.assertEqual(settings['sessionPlan']['strongStart'], 'Meu começo')
        self.assertIn('lanterna-do-moinho', settings['readyAdventures'])

    def test_all_three_import_together_with_existing_world(self):
        WorldEntry.objects.create(campaign=self.camp, kind='place', name='Meu lugar', sort=40)
        for pid in READY.pack_ids():
            self.assertEqual(self.c_dm.post(self.url, {'id': pid, 'lang': 'pt'}, format='json').status_code, 201)
        self.assertEqual(Adventure.objects.filter(campaign=self.camp).count(), 3)
        total = 1 + sum(len(p['entries']) for p in READY._packs())
        self.assertEqual(WorldEntry.objects.filter(campaign=self.camp).count(), total)
        self.assertGreater(WorldEntry.objects.exclude(name='Meu lugar').order_by('sort').first().sort, 40)

    def test_rendered_text_reads_naturally(self):
        """Nada de "da A Guilda", "the The Mill" ou tokens sobrando, nas duas línguas."""
        bad = {'pt': re.compile(r'\b(?:[Dd]a|[Dd]o|[Dd]as|[Dd]os|[Nn]a|[Nn]o|[Aa]o|[Àà]|[Pp]ela|[Pp]elo|[Dd]e|[Ee]m|a|o)\s+(?:O|A|Os|As)\s'),
               'en': re.compile(r'\b[Tt]he\s+(?:The|A)\s')}
        for lang in ('pt', 'en'):
            camp = Campaign.objects.create(dm=self.dm, name=f'C{lang}', slug=f'c-{lang}')
            Membership.objects.create(campaign=camp, user=self.dm, role='dm')
            for pid in READY.pack_ids():
                r = self.c_dm.post(f'/api/campaigns/{camp.id}/ready-adventure', {'id': pid, 'lang': lang}, format='json')
                self.assertEqual(r.status_code, 201)
            texts = []
            for e in WorldEntry.objects.filter(campaign=camp):
                texts += [R.strip_mentions(e.body, set()), e.dm_notes] + [s['text'] for s in e.secrets]
            for a in Adventure.objects.filter(campaign=camp):
                texts.append(a.summary)
                for n in a.data['nodes']:
                    texts += [n['readAloud'], n['notes']] + [c['note'] for c in n['checks']] + [h['effect'] for h in n['hazards']]
            plan = Campaign.objects.get(pk=camp.pk).dm_settings['sessionPlan']
            texts += [plan['strongStart']] + [x['text'] for x in plan['secrets']]
            for txt in texts:
                self.assertNotIn('{@', txt)
                self.assertIsNone(bad[lang].search(txt), f'{lang}: {txt[:160]}')

    def test_permissions_and_errors(self):
        self.assertEqual(self.c1.post(self.url, {'id': 'lanterna-do-moinho'}, format='json').status_code, 403)
        self.assertEqual(self.c_out.post(self.url, {'id': 'lanterna-do-moinho'}, format='json').status_code, 403)
        self.assertEqual(self.c1.get(self.url).status_code, 403)
        r = self.c_dm.post(self.url, {'id': 'nao-existe'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'unknown_adventure')
        self.assertFalse(WorldEntry.objects.filter(campaign=self.camp).exists())

    def test_world_full_is_rejected_atomically(self):
        WorldEntry.objects.bulk_create([WorldEntry(campaign=self.camp, kind='lore', name=f'x{i}')
                                        for i in range(R.MAX_ENTRIES - 3)])
        r = self.c_dm.post(self.url, {'id': 'lanterna-do-moinho'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'world_full')
        self.assertFalse(Adventure.objects.filter(campaign=self.camp).exists())
