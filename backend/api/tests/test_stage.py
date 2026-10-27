"""
V3 · Palco da Tela (api/stage.py): POST /campaigns/:id/stage, a projeção pública
(TV e jogador), "só a imagem" de cartão oculto, a URL da imagem da frente que
morre ao trocar, ↶ Desfazer, 🧹 Limpar, ◐ Escurecer, compatibilidade com o
POST /screen-card antigo, teste encerrado que sai da Tela e CD secreta sem ✓/✗.
"""
import base64

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import (Adventure, Campaign, CheckRequest, CombatInstance, Membership, Profile, Character,
                        WorldEntry, WorldImage)
from api.stage import get_stage, next_stage

User = get_user_model()
PNG = 'data:image/png;base64,' + base64.b64encode(b'\x89PNG\r\n\x1a\nstage').decode()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p1 = APIClient(); self.c_p1.force_login(self.p1)
        self.anon = APIClient()
        self.camp = Campaign.objects.create(dm=self.dm, name='Brumafria', slug='b',
                                            state={'session': '3', 'scene': 'Taverna', 'live': True})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.char = Character.objects.create(owner=self.p1, name='Dagna', data={'name': 'Dagna', 'level': 3})
        self.m1 = Membership.objects.create(campaign=self.camp, user=self.p1, character=self.char, role='player')
        self.velna = WorldEntry.objects.create(campaign=self.camp, kind='npc', name='Irmã Velna', summary='Sacerdotisa',
                                               body='Cuida do templo.', visibility='revealed', image_ver='abc123')
        WorldImage.objects.create(entry=self.velna, data=PNG)
        self.crypt = WorldEntry.objects.create(campaign=self.camp, kind='place', name='Cripta sob a capela',
                                               summary='Onde o noivo dorme', body='O culto se reúne aqui.',
                                               dm_notes='O sino está aqui', visibility='hidden', image_ver='cry777')
        WorldImage.objects.create(entry=self.crypt, data=PNG)
        self.letter = WorldEntry.objects.create(campaign=self.camp, kind='handout', name='Carta do capitão',
                                                visibility='revealed', image_ver='let1',
                                                data={'style': 'letter', 'recipients': [self.m1.id]})
        WorldImage.objects.create(entry=self.letter, data=PNG)
        self.adv = Adventure.objects.create(campaign=self.camp, name='O Sino Afogado', data={'nodes': [
            {'id': 'n1', 'name': 'Ponte velha', 'readAloud': 'A ponte range sob a chuva.', 'image': PNG},
            {'id': 'n2', 'name': 'Lago', 'readAloud': ''},
        ], 'edges': []})

    def stage(self, body, client=None):
        return (client or self.c_dm).post(f'/api/campaigns/{self.camp.id}/stage', body, format='json')

    def screen(self):
        r = self.anon.get(f'/api/screen/{self.camp.screen_token}')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def raw(self):
        self.camp.refresh_from_db()
        return get_stage(self.camp.state)


class ImageOnlyTests(Base):
    def test_hidden_card_image_only_never_leaks_the_card(self):
        r = self.stage({'op': 'show', 'target': {'kind': 'image', 'ref': {'entryId': self.crypt.id}},
                        'caption': 'Uma porta sob a capela'})
        self.assertEqual(r.status_code, 200, r.content)
        front = self.screen()['stage']['front']
        self.assertEqual(front['kind'], 'image')
        self.assertEqual(front['caption'], 'Uma porta sob a capela')
        self.assertTrue(front['imageUrl'].startswith(f'/api/screen/{self.camp.screen_token}/stage-image?v='))
        raw = str(self.screen())
        for leak in ('Cripta', 'Onde o noivo', 'O culto', 'O sino está', 'place', 'Lugar'):
            self.assertNotIn(leak, raw, leak)
        # a imagem vem pela URL da frente (sem login) e para o jogador (com login)
        img = self.anon.get(front['imageUrl'])
        self.assertEqual(img.status_code, 200)
        self.assertEqual(img['Content-Type'], 'image/png')
        player = self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertEqual(player['stage']['front']['kind'], 'image')
        self.assertNotIn('Cripta', str(player))
        self.assertEqual(self.c_p1.get(player['stage']['front']['imageUrl']).status_code, 200)
        # o cartão continua oculto para o jogador e o "revelou" não dispara
        self.assertEqual(self.c_p1.get(f'/api/world/{self.crypt.id}').status_code, 404)
        self.assertIsNone(player['screenCard'])
        # ✕ Tirar: a URL antiga morre (TV e jogador)
        self.assertEqual(self.stage({'op': 'back'}).status_code, 200)
        self.assertEqual(self.anon.get(front['imageUrl']).status_code, 404)
        self.assertEqual(self.c_p1.get(player['stage']['front']['imageUrl']).status_code, 404)
        self.assertIsNone(self.screen()['stage']['front'])

    def test_url_dies_when_front_changes_and_needs_the_right_version(self):
        self.stage({'op': 'show', 'target': {'kind': 'image', 'ref': {'entryId': self.crypt.id}}})
        url = self.screen()['stage']['front']['imageUrl']
        self.assertEqual(self.anon.get(f'/api/screen/{self.camp.screen_token}/stage-image?v=errada').status_code, 404)
        self.assertEqual(self.anon.get(f'/api/screen/{self.camp.screen_token}/stage-image').status_code, 404)
        self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}})
        self.assertEqual(self.anon.get(url).status_code, 404)
        self.assertEqual(self.anon.get('/api/screen/errado/stage-image?v=x').status_code, 404)

    def test_private_handout_never_goes(self):
        for target in ({'kind': 'card', 'entryId': self.letter.id},
                       {'kind': 'image', 'ref': {'entryId': self.letter.id}}):
            r = self.stage({'op': 'show', 'target': target})
            self.assertEqual(r.status_code, 400)
            self.assertEqual(r.json()['error'], 'handout_private')
        self.assertIsNone(self.raw()['front'])

    def test_hidden_card_as_card_is_refused(self):
        r = self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': self.crypt.id}})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'entry_hidden')

    def test_room_image_and_map_of_place(self):
        r = self.stage({'op': 'show', 'target': {'kind': 'image', 'ref': {'advId': self.adv.id, 'nodeId': 'n1'}}})
        self.assertEqual(r.status_code, 200, r.content)
        front = self.screen()['stage']['front']
        self.assertNotIn('Ponte', str(front))
        self.assertEqual(self.anon.get(front['imageUrl']).status_code, 200)
        self.assertEqual(self.stage({'op': 'show', 'target': {'kind': 'image', 'ref': {'advId': self.adv.id, 'nodeId': 'n2'}}}).json()['error'], 'no_image')
        self.stage({'op': 'show', 'target': {'kind': 'image', 'ref': {'mapOf': self.crypt.id}}})
        front = self.screen()['stage']['front']
        self.assertTrue(front['map'])
        self.assertEqual(self.anon.get(front['imageUrl']).status_code, 200)


class StageOpsTests(Base):
    def test_only_dm_and_validation(self):
        self.assertEqual(self.stage({'op': 'back'}, self.c_p1).status_code, 403)
        self.assertEqual(self.stage({'op': 'nada'}).status_code, 400)
        self.assertEqual(self.stage({'op': 'show', 'target': {'kind': 'bogus'}}).status_code, 400)
        self.assertEqual(self.stage({'op': 'show', 'target': {'kind': 'text', 'text': 'x' * 1001}}).status_code, 400)
        self.assertEqual(self.stage({'op': 'show', 'target': {'kind': 'image', 'ref': {'entryId': 1},
                                                             }, 'caption': 'x' * 141}).status_code, 400)
        self.assertEqual(self.stage({'op': 'bg', 'bg': 'dark'}).status_code, 400)
        self.assertEqual(self.stage({'op': 'prefs', 'prefs': {'players': 'talvez'}}).status_code, 400)
        self.assertEqual(self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': 99999}}).status_code, 404)

    def test_no_write_when_nothing_changes(self):
        self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}})
        self.camp.refresh_from_db()
        before = self.camp.updated_at
        r = self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}})
        self.assertFalse(r.json()['changed'])
        self.assertFalse(self.stage({'op': 'dark', 'on': False}).json()['changed'])
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.updated_at, before)

    def test_undo_clear_dark_light(self):
        self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}})
        self.stage({'op': 'show', 'target': {'kind': 'text', 'text': 'O sino toca.'}})
        self.assertEqual(self.screen()['stage']['front'], {'kind': 'text', 'text': 'O sino toca.'})
        # ↶ Desfazer volta para o cartão (e o próprio desfazer pode ser desfeito)
        self.stage({'op': 'undo'})
        self.assertEqual(self.screen()['stage']['front']['title'], 'Irmã Velna')
        self.assertEqual(self.raw()['prev']['front']['kind'], 'text')
        # ◐ Escurecer: o fundo fica 'dark' e a frente continua guardada; ◑ Acender volta ao que estava
        self.stage({'op': 'dark', 'on': True})
        self.assertEqual(self.screen()['stage']['bg'], 'dark')
        self.stage({'op': 'dark', 'on': False})
        st = self.screen()['stage']
        self.assertEqual((st['bg'], st['front']['title']), ('auto', 'Irmã Velna'))
        # 🧹 Limpar tira a frente e o teste numa chamada
        check = CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Percepção', kind='skill',
                                            key='perception', dc=15, show_on_screen=True)
        self.assertEqual(self.screen()['stage']['overlays']['test']['label'], 'Percepção')
        self.stage({'op': 'clear'})
        st = self.screen()['stage']
        self.assertIsNone(st['front'])
        self.assertIsNone(st['overlays']['test'])
        check.refresh_from_db()
        self.assertFalse(check.show_on_screen)
        # o resto do state continua intacto
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['scene'], 'Taverna')

    def test_show_lights_up_a_dark_screen_and_map_background(self):
        self.stage({'op': 'bg', 'bg': 'map'})
        self.stage({'op': 'dark', 'on': True})
        self.stage({'op': 'show', 'target': {'kind': 'text', 'text': 'Silêncio.'}})
        self.assertEqual(self.raw()['bg'], 'map')
        self.stage({'op': 'bg', 'bg': 'auto'})
        self.assertEqual(self.raw()['bg'], 'auto')

    def test_combat_front_over_or_kept_for_later(self):
        CombatInstance.objects.create(campaign=self.camp, active=True, round_number=2, combatants=[])
        self.stage({'op': 'show', 'target': {'kind': 'image', 'ref': {'entryId': self.crypt.id}}, 'focus': False})
        st = self.screen()['stage']
        self.assertFalse(st['focus'])
        self.assertEqual(st['front']['kind'], 'image')
        player = self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertEqual(player['combatNow'], {'active': True, 'round': 2})
        self.assertFalse(player['stage']['focus'])
        self.stage({'op': 'show', 'target': {'kind': 'image', 'ref': {'entryId': self.crypt.id}}, 'focus': True})
        self.assertTrue(self.screen()['stage']['focus'])

    def test_scene_from_room_and_from_plan(self):
        self.camp.dm_settings = {'sessionPlan': {'scenes': [
            {'id': 'c1', 'text': 'Emboscada na ponte\nGoblins atrás das pedras', 'nodeRef': None, 'done': False},
            {'id': 'c2', 'text': 'Descer ao lago', 'nodeRef': {'adventureId': self.adv.id, 'nodeId': 'n1'}, 'done': False},
        ]}}
        self.camp.save()
        self.stage({'op': 'show', 'target': {'kind': 'scene', 'sceneId': 'c1'}})
        front = self.screen()['stage']['front']
        # a cena só de texto mostra a 1ª linha (o resto é anotação do mestre)
        self.assertEqual(front, {'kind': 'scene', 'title': 'Emboscada na ponte', 'text': ''})
        self.assertNotIn('Goblins', str(self.screen()))
        self.stage({'op': 'show', 'target': {'kind': 'scene', 'sceneId': 'c2'}})
        front = self.screen()['stage']['front']
        self.assertEqual((front['title'], front['text']), ('Ponte velha', 'A ponte range sob a chuva.'))
        self.assertEqual(self.anon.get(front['imageUrl']).status_code, 200)
        self.assertEqual(self.stage({'op': 'show', 'target': {'kind': 'scene', 'sceneId': 'zz'}}).status_code, 404)

    def test_recap_keeps_text_outside_the_stage(self):
        self.stage({'op': 'show', 'target': {'kind': 'recap', 'title': 'Anteriormente…', 'text': 'O grupo chegou.' * 100}})
        self.camp.refresh_from_db()
        self.assertLess(len(str(self.camp.state['stage'])), 1000)
        st = self.screen()
        self.assertEqual(st['stage']['front']['kind'], 'recap')
        self.assertTrue(st['stage']['front']['text'].startswith('O grupo chegou.'))
        self.assertEqual(st['card']['type'], 'recap')          # TV antiga
        self.assertEqual(self.stage({'op': 'show', 'target': {'kind': 'recap', 'title': '', 'text': ' '}}).status_code, 400)

    def test_what_was_shown_goes_to_the_live_session(self):
        self.camp.state = {**self.camp.state, 'diarySessions': {'3': {'title': '', 'startedAt': '2026-10-24T18:00:00+00:00'}}}
        self.camp.save()
        self.stage({'op': 'show', 'target': {'kind': 'image', 'ref': {'entryId': self.crypt.id}}})
        self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}})
        self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}})   # repetido: nada
        self.stage({'op': 'show', 'target': {'kind': 'image', 'ref': {'entryId': self.crypt.id}}, 'caption': 'Uma porta'})
        self.camp.refresh_from_db()
        shown = self.camp.state['diarySessions']['3']['shown']
        # "Só a imagem" de oculto: nunca o nome (o rascunho do resumo vai à Tela) — a legenda ou 'Imagem'.
        self.assertEqual(shown, [{'t': 'Imagem', 'k': 'image', 'h': True}, {'t': 'Irmã Velna', 'k': 'card'},
                                 {'t': 'Uma porta', 'k': 'image', 'h': True}])
        self.assertNotIn('Cripta', str(self.camp.state['diarySessions']))
        self.assertNotIn('Cripta', str(self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()))
        for i in range(25):
            self.stage({'op': 'show', 'target': {'kind': 'text', 'text': f'linha {i}'}})
        self.camp.refresh_from_db()
        self.assertEqual(len(self.camp.state['diarySessions']['3']['shown']), 20)

    def test_prefs(self):
        self.stage({'op': 'prefs', 'prefs': {'players': 'all', 'initiative': False}})
        st = self.raw()
        self.assertEqual((st['prefs']['players'], st['prefs']['initiative'], st['prefs']['dm']), ('all', False, 'secret'))
        self.assertEqual(self.screen()['stage']['prefs'], {'initiative': False, 'party': True})

    def test_closed_campaign_is_locked(self):
        self.camp.status = 'closed'; self.camp.save()
        self.assertEqual(self.stage({'op': 'back'}).status_code, 423)


class CompatTests(Base):
    def test_screen_card_writes_the_stage(self):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/screen-card',
                           {'type': 'entry', 'entryId': self.velna.id}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['card']['title'], 'Irmã Velna')
        self.assertEqual(self.raw()['front']['entryId'], self.velna.id)
        self.assertEqual(self.screen()['stage']['front']['title'], 'Irmã Velna')
        # null tira (volta ao fundo)
        self.c_dm.post(f'/api/campaigns/{self.camp.id}/screen-card', {'card': None}, format='json')
        self.assertIsNone(self.raw()['front'])
        self.assertIsNone(self.screen()['card'])

    def test_conduct_room_name_and_text(self):
        url = f'/api/campaigns/{self.camp.id}/adventures/{self.adv.id}/screen'
        r = self.c_dm.post(url, {'nodeId': 'n1', 'text': False}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['state']['scene'], 'Ponte velha')
        front = self.screen()['stage']['front']
        self.assertEqual((front['kind'], front['title'], front['text']), ('scene', 'Ponte velha', ''))
        self.c_dm.post(url, {'nodeId': 'n1', 'text': True}, format='json')
        self.assertEqual(self.screen()['stage']['front']['text'], 'A ponte range sob a chuva.')
        self.assertEqual(self.screen()['card']['title'], 'Ponte velha')   # TV antiga, sem abrir a aventura
        r = self.c_dm.post(url, {'nodeId': None}, format='json')
        self.assertEqual(r.json()['changed'], True)
        self.assertIsNone(self.raw()['front'])
        self.camp.refresh_from_db()
        self.assertNotIn('sceneText', self.camp.state)

    def test_conduct_remove_text_with_something_else_on_screen_changes_nothing(self):
        # Sala com texto → Velna pela Tela → "Tirar texto da Tela": o palco não muda
        # (changed False: o aviso não oferece o ↶, que voltaria a sala COM o texto).
        url = f'/api/campaigns/{self.camp.id}/adventures/{self.adv.id}/screen'
        self.c_dm.post(url, {'nodeId': 'n1', 'text': True}, format='json')
        self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}})
        r = self.c_dm.post(url, {'nodeId': None}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['changed'], False)
        self.assertNotIn('sceneText', r.json()['state'])
        self.assertEqual(self.raw()['front']['entryId'], self.velna.id)
        # mostrar a mesma sala de novo, igualzinha: a Tela não muda
        self.c_dm.post(url, {'nodeId': 'n1', 'text': False}, format='json')
        self.assertEqual(self.c_dm.post(url, {'nodeId': 'n1', 'text': False}, format='json').json()['changed'], False)

    def test_player_toast_card_carries_revealed_at(self):
        from django.utils import timezone
        self.velna.revealed_at = timezone.now(); self.velna.save()
        self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}})
        card = self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']['screenCard']
        self.assertTrue(card['revealedAt'])
        # escurecer e acender com o mesmo cartão não renova o `at` (o celular não avisa de novo)
        at = card['at']
        self.stage({'op': 'dark', 'on': True})
        self.stage({'op': 'dark', 'on': False})
        self.assertEqual(self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']['screenCard']['at'], at)

    def test_campaign_from_before_the_stage_keeps_its_card(self):
        # Só screenCard (sem palco): a frente equivalente, guardada para depois do combate.
        self.camp.state = {**self.camp.state, 'screenCard': {'type': 'entry', 'entryId': self.velna.id, 'secretIds': [],
                                                            'at': '2026-10-24T18:05:42+00:00'}}
        self.camp.save()
        st = self.screen()['stage']
        self.assertEqual((st['front']['title'], st['focus']), ('Irmã Velna', False))
        dm = self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertEqual(dm['stage']['front']['label'], 'Irmã Velna')
        # ✕ Tirar funciona sobre ela e grava o palco de verdade, com o nome no ↶
        # ("↶ Voltar para: Irmã Velna"; o screenCard antigo não tinha o nome)
        r = self.stage({'op': 'back'})
        self.assertEqual(r.json()['stage']['prev']['front']['label'], 'Irmã Velna')
        self.assertIsNone(self.screen()['stage']['front'])
        self.assertEqual(self.raw()['prev']['front']['entryId'], self.velna.id)
        self.assertEqual(self.raw()['prev']['front']['label'], 'Irmã Velna')

    def test_hidden_after_shown_is_marked_gone_for_the_dm(self):
        # A Tela nunca mente: o cartão na frente foi ocultado depois → a TV e o jogador
        # mostram o fundo, e o mestre vê a frente com `gone` (não "Na tela").
        self.stage({'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}})
        self.c_dm.post(f'/api/world/{self.velna.id}/reveal', {'visibility': 'hidden'}, format='json')
        dm = self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']['stage']
        self.assertEqual((dm['front']['entryId'], dm['front'].get('gone')), (self.velna.id, True))
        self.assertIsNone(self.screen()['stage']['front'])
        self.assertIsNone(self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']['stage']['front'])
        # revelado de novo: volta à Tela e o `gone` some
        self.c_dm.post(f'/api/world/{self.velna.id}/reveal', {'visibility': 'revealed'}, format='json')
        dm = self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']['stage']
        self.assertNotIn('gone', dm['front'])
        # ✕ Tirar continua valendo sobre a frente oculta
        self.c_dm.post(f'/api/world/{self.velna.id}/reveal', {'visibility': 'hidden'}, format='json')
        self.assertTrue(self.stage({'op': 'back'}).json()['changed'])
        self.assertIsNone(self.raw()['front'])

    def test_stage_is_server_only(self):
        r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}/state', {'patch': {'stage': {'bg': 'dark'}}}, format='json')
        self.assertEqual(r.status_code, 400)
        self.c_dm.put(f'/api/campaigns/{self.camp.id}', {'state': {'stage': {'bg': 'dark'}}}, format='json')
        self.assertEqual(self.raw()['bg'], 'auto')
        player = self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertNotIn('stage', player['state'])


class ChecksOnScreenTests(Base):
    def test_closing_a_check_takes_it_off_and_secret_dc_has_no_marks(self):
        check = CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Percepção', kind='skill',
                                            key='perception', dc=15, dc_hidden=True)
        self.c_p1.post(f'/api/checks/{check.id}/respond', {'mode': 'physical', 'natural': 18}, format='json')
        self.c_dm.post(f'/api/checks/{check.id}/screen', {'show': True}, format='json')
        test = self.screen()['stage']['overlays']['test']
        self.assertIsNone(test['dc'])
        self.assertEqual([(r['total'], r['outcome']) for r in test['results']], [(18, None)])
        self.c_dm.post(f'/api/checks/{check.id}/close', {}, format='json')
        self.assertIsNone(self.screen()['stage']['overlays']['test'])
        self.assertIsNone(self.screen()['campaign']['publicCheck'])
        check.refresh_from_db()
        self.assertFalse(check.show_on_screen)


class NextStageTests(TestCase):
    """A função pura do palco, sem banco."""
    def test_back_and_undo(self):
        st = get_stage({})
        front = {'kind': 'text', 'text': 'a', 'label': 'a'}
        st, changed = next_stage(st, {'op': 'show', 'front': front, 'focus': True})
        self.assertTrue(changed)
        st, _ = next_stage(st, {'op': 'back'})
        self.assertIsNone(st['front'])
        self.assertEqual(st['prev']['front'], front)
        st, _ = next_stage(st, {'op': 'undo'})
        self.assertEqual(st['front'], front)
        _, changed = next_stage(st, {'op': 'show', 'front': dict(front, label='b'), 'focus': True})
        self.assertFalse(changed)


class SceneStartTests(Base):
    """V7 · ▶ Começar esta cena (POST /campaigns/:id/stage/scene)."""

    def setUp(self):
        super().setUp()
        self.camp.state = {**self.camp.state, 'diarySessions': {'3': {'title': '', 'startedAt': '2026-10-24T18:00:00+00:00'}}}
        self.camp.dm_settings = {'sessionPlan': {'forSession': 3, 'scenes': [
            {'id': 'c1', 'text': 'Taverna do Javali\nBorin sabe do sino', 'done': False,
             'read': 'O fogo crepita.', 'show': {'kind': 'entry', 'id': self.crypt.id}},
            {'id': 'c2', 'text': 'Ponte sobre o rio', 'nodeRef': {'adventureId': self.adv.id, 'nodeId': 'n1'}, 'done': False},
            {'id': 'c3', 'text': 'Só o nome', 'done': False},
            {'id': 'c4', 'text': 'Sem mostrar', 'read': 'Texto', 'showOnStart': False, 'done': False},
        ]}}
        self.camp.save()

    def start(self, body, client=None):
        return (client or self.c_dm).post(f'/api/campaigns/{self.camp.id}/stage/scene', body, format='json')

    def plan_scene(self, sid):
        self.camp.refresh_from_db()
        return next(s for s in self.camp.dm_settings['sessionPlan']['scenes'] if s['id'] == sid)

    def test_loose_scene_goes_to_state_and_screen_with_image_only(self):
        r = self.start({'sceneId': 'c1'})
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        self.assertTrue(body['shown'])
        self.assertTrue(body['changed'])
        self.camp.refresh_from_db()
        st = self.camp.state
        self.assertEqual(st['scene'], 'Taverna do Javali')     # só a 1ª linha (o resto é anotação do mestre)
        self.assertEqual(st['sceneId'], 'c1')
        self.assertEqual(st['sceneText'], 'O fogo crepita.')
        front = self.screen()['stage']['front']
        self.assertEqual(front['kind'], 'scene')
        self.assertEqual(front['title'], 'Taverna do Javali')
        self.assertEqual(front['text'], 'O fogo crepita.')
        self.assertTrue(front['imageUrl'].startswith(f'/api/screen/{self.camp.screen_token}/stage-image?v='))
        # a imagem do cartão OCULTO sai pela URL da frente, sem o nome nem o texto do cartão
        img = self.anon.get(front['imageUrl'])
        self.assertEqual(img.status_code, 200)
        raw = str(self.screen())
        for leak in ('Cripta', 'Onde o noivo', 'Borin sabe', 'O sino está'):
            self.assertNotIn(leak, raw)

    def test_linked_scene_reads_the_room_and_enters_it(self):
        r = self.start({'sceneId': 'c2'})
        self.assertEqual(r.status_code, 200, r.content)
        front = self.screen()['stage']['front']
        self.assertEqual(front['title'], 'Ponte sobre o rio')    # o nome da cena (a sala mantém o dela)
        self.assertEqual(front['text'], 'A ponte range sob a chuva.')
        self.assertIn('imageUrl', front)
        self.adv.refresh_from_db()
        self.assertEqual(self.adv.play['current'], 'n1')
        self.assertIn('n1', self.adv.play['visited'])
        from api.models import DiaryEntry
        self.assertTrue(DiaryEntry.objects.filter(campaign=self.camp, title='O grupo entrou em Ponte velha').exists())
        # a TV não abre a aventura: o texto e a versão da imagem ficam gravados no palco
        stage = self.raw()
        self.assertEqual(stage['front']['text'], 'A ponte range sob a chuva.')
        self.assertTrue(stage['front']['ver'])

    def test_without_media_or_show_off_only_the_name(self):
        self.stage({'op': 'show', 'target': {'kind': 'text', 'text': 'Antes'}})
        r = self.start({'sceneId': 'c3'})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(r.json()['shown'])
        self.assertEqual(self.raw()['front']['kind'], 'text')    # a Tela não muda
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['scene'], 'Só o nome')
        self.assertNotIn('sceneText', self.camp.state)
        r = self.start({'sceneId': 'c4'})
        self.assertFalse(r.json()['shown'])
        r = self.start({'sceneId': 'c4', 'show': True})
        self.assertTrue(r.json()['shown'])
        self.assertEqual(self.raw()['front']['title'], 'Sem mostrar')

    def test_previous_scene_is_marked_done_and_undo_brings_everything_back(self):
        self.start({'sceneId': 'c1'})
        before = self.raw()['front']
        r = self.start({'sceneId': 'c2'})
        body = r.json()
        self.assertEqual(body['doneId'], 'c1')
        self.assertTrue(self.plan_scene('c1')['done'])
        rev = self.camp.dm_settings['sessionPlan']['_rev']
        u = self.start({'undo': body['undo']})
        self.assertEqual(u.status_code, 200, u.content)
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['scene'], 'Taverna do Javali')
        self.assertEqual(self.camp.state['sceneId'], 'c1')
        self.assertFalse(self.plan_scene('c1')['done'])
        self.assertGreater(self.camp.dm_settings['sessionPlan']['_rev'], rev)
        self.assertEqual(self.raw()['front']['title'], before['title'])
        self.adv.refresh_from_db()
        self.assertIsNone(self.adv.play['current'])
        self.assertNotIn('n1', self.adv.play['visited'])
        from api.models import DiaryEntry
        self.assertFalse(DiaryEntry.objects.filter(campaign=self.camp, title='O grupo entrou em Ponte velha').exists())

    def test_log_off_and_combat_keeps_for_later(self):
        CombatInstance.objects.create(campaign=self.camp, active=True, round_number=2, combatants=[])
        r = self.start({'sceneId': 'c2', 'log': False, 'focus': False})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(self.raw()['focus'])
        from api.models import DiaryEntry
        self.assertFalse(DiaryEntry.objects.filter(campaign=self.camp, subtype='custom').exists())

    def test_only_dm_validation_and_missing_scene(self):
        self.assertEqual(self.start({'sceneId': 'c1'}, self.c_p1).status_code, 403)
        self.assertEqual(self.start({'sceneId': 'nope'}).status_code, 404)
        self.assertEqual(self.start({'sceneId': ''}).status_code, 400)
        self.assertEqual(self.start({'sceneId': 'c1', 'show': 'yes'}).status_code, 400)
        self.assertEqual(self.start({'undo': {'scene': 5}}).status_code, 400)
        self.camp.status = 'closed'
        self.camp.save()
        self.assertEqual(self.start({'sceneId': 'c1'}).status_code, 423)

    def test_scene_id_never_reaches_players_nor_the_tv(self):
        self.start({'sceneId': 'c1'})
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['sceneId'], 'c1')
        player = self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertEqual(player['state']['scene'], 'Taverna do Javali')
        self.assertNotIn('sceneId', player['state'])
        self.assertNotIn('"c1"', str(player))
        tv = self.screen()
        self.assertNotIn('sceneId', str(tv))
        dm = self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertEqual(dm['state']['sceneId'], 'c1')
