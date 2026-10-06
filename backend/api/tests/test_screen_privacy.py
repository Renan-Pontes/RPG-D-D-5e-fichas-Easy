"""
WP2 · Privacidade do telão público e do jogador: whitelist de state, combate
filtrado, cartão "Mostrar agora" resolvido e imagens públicas por token.
"""
import base64

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import (Campaign, CombatInstance, Membership, Profile, Character, WorldEntry, WorldImage)
from api.views_combat import health_band

User = get_user_model()
PNG = 'data:image/png;base64,' + base64.b64encode(b'\x89PNG\r\n\x1a\nportrait').decode()

GOBLIN = {
    'id': 'g1', 'type': 'monster', 'name': 'Goblin #1', 'initiative': 12, 'current_hp': 3,
    'conditions': ['prone'], 'defeated': False, 'position': {'x': 1, 'y': 1},
    'stats': {'ac': 15, 'max_hp': 7, 'abilities': {'str': 8}, 'saves': {},
              'actions': [{'name': 'Cimitarra', 'atk': 4, 'damage': '1d6+2', 'damageType': 'slashing'}]},
}
PC = {
    'id': 'p1', 'type': 'pc', 'name': 'Thal', 'character_id': None, 'initiative': 15, 'current_hp': 18,
    'conditions': [], 'defeated': False, 'temp_hp': 0,
    'stats': {'ac': 14, 'max_hp': 20, 'abilities': {'dex': 14}, 'actions': []},
}


def make_user(email, name='User'):
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
        self.camp = Campaign.objects.create(dm=self.dm, name='Brumafria', slug='b', tagline='Névoa', accent='#b8862b',
                                            state={'session': '2', 'scene': 'Taverna', 'weather': 'Chuva', 'live': True,
                                                   'nudges': {'off': ['concentration']},
                                                   'concentration': {'p1': {'spell': 'Bless'}},
                                                   'diarySessions': {'2': {'title': 'Segredo do mestre'}},
                                                   'levelingMode': 'xp'})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.char = Character.objects.create(owner=self.p1, name='Thal', data={'name': 'Thal', 'level': 2})
        Membership.objects.create(campaign=self.camp, user=self.p1, character=self.char, role='player')
        PC['character_id'] = self.char.id
        self.combat = CombatInstance.objects.create(campaign=self.camp, active=True, combatants=[dict(GOBLIN), dict(PC)],
                                                    action_log=[{'type': 'attack', 'attacker': 'Thal', 'target': 'Goblin #1',
                                                                 'hit': True, 'total': 17, 'ac': 15, 'damage': {'total': 4}}])
        self.velna = WorldEntry.objects.create(campaign=self.camp, kind='npc', name='Irmã Velna', summary='Sacerdotisa',
                                               body='Cuida do templo de @[Brumafria](1).', dm_notes='É a vilã',
                                               secrets=[{'id': 's1', 'text': 'Serve ao culto', 'revealed': False},
                                                        {'id': 's2', 'text': 'Tem uma filha', 'revealed': True}],
                                               visibility='revealed', image_ver='abc123')
        WorldImage.objects.create(entry=self.velna, data=PNG)
        self.hidden = WorldEntry.objects.create(campaign=self.camp, kind='npc', name='Lorde Sombrio',
                                                visibility='hidden', image_ver='zzz999', dm_notes='chefe')
        WorldImage.objects.create(entry=self.hidden, data=PNG)

    def screen(self):
        r = self.anon.get(f'/api/screen/{self.camp.screen_token}')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()


class ScreenWhitelistTests(Base):
    def test_anonymous_screen_has_no_dm_data(self):
        # (a) telão anônimo: sem nudges, diarySessions, concentration, PV/stats de monstro.
        data = self.screen()
        raw = str(data)
        for leak in ('nudges', 'diarySessions', 'concentration', 'Segredo do mestre', 'levelingMode',
                     'É a vilã', 'Serve ao culto', 'Cimitarra', "'ac': 15", 'abilities'):
            self.assertNotIn(leak, raw, leak)
        self.assertEqual(data['state'], {'session': '2', 'scene': 'Taverna', 'weather': 'Chuva', 'live': True})
        self.assertEqual(data['campaign']['state'], data['state'])
        self.assertEqual(data['campaign']['tagline'], 'Névoa')
        self.assertEqual(data['campaign']['accent'], '#b8862b')
        gob = next(c for c in data['combat']['combatants'] if c['id'] == 'g1')
        self.assertNotIn('current_hp', gob)
        self.assertNotIn('stats', gob)
        self.assertEqual(gob['health'], 'bloodied')
        self.assertEqual(gob['conditions'], ['prone'])
        pc = next(c for c in data['combat']['combatants'] if c['id'] == 'p1')
        self.assertEqual(pc['current_hp'], 18)
        self.assertNotIn('log', data['combat'])

    def test_health_bands(self):
        self.assertEqual(health_band(7, 7), 'unhurt')
        self.assertEqual(health_band(5, 7), 'hurt')
        self.assertEqual(health_band(3, 7), 'bloodied')
        self.assertEqual(health_band(0, 7), 'down')
        self.assertEqual(health_band(5, 7, defeated=True), 'down')

    def test_cover_and_images_by_token(self):
        tok = self.camp.screen_token
        self.assertEqual(self.anon.get(f'/api/screen/{tok}/cover').status_code, 404)
        self.c_dm.put(f'/api/campaigns/{self.camp.id}/cover', {'image': PNG}, format='json')
        self.camp.refresh_from_db()
        r = self.anon.get(f'/api/screen/{tok}/cover?v={self.camp.cover_ver}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'image/png')
        self.assertTrue(self.screen()['campaign']['coverVer'])
        r = self.anon.get(f'/api/screen/{tok}/image/{self.velna.id}?v=abc123')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['ETag'], '"abc123"')
        self.assertEqual(self.anon.get(f'/api/screen/{tok}/image/{self.velna.id}', HTTP_IF_NONE_MATCH='"abc123"').status_code, 304)
        self.assertEqual(self.anon.get(f'/api/screen/{tok}/image/{self.hidden.id}').status_code, 404)
        self.assertEqual(self.anon.get(f'/api/screen/wrong/image/{self.velna.id}').status_code, 404)
        self.assertEqual(self.anon.get('/api/screen/wrong/cover').status_code, 404)
        # entrada de outra campanha não vaza pelo token desta
        other = Campaign.objects.create(dm=self.dm, name='O', slug='o')
        e = WorldEntry.objects.create(campaign=other, kind='npc', name='X', visibility='revealed', image_ver='q')
        WorldImage.objects.create(entry=e, data=PNG)
        self.assertEqual(self.anon.get(f'/api/screen/{tok}/image/{e.id}').status_code, 404)

    def test_conditional_get_on_screen(self):
        r1 = self.anon.get(f'/api/screen/{self.camp.screen_token}')
        etag = r1['ETag']
        self.assertTrue(etag)
        r2 = self.anon.get(f'/api/screen/{self.camp.screen_token}', HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(r2.status_code, 304)


class ScreenCardTests(Base):
    def show(self, body, client=None):
        return (client or self.c_dm).post(f'/api/campaigns/{self.camp.id}/screen-card', body, format='json')

    def test_show_entry_resolves_public_data_only(self):
        r = self.show({'type': 'entry', 'entryId': self.velna.id, 'secretIds': ['s1', 's2']})
        self.assertEqual(r.status_code, 200, r.content)
        card = self.screen()['card']
        self.assertEqual(card['title'], 'Irmã Velna')
        self.assertEqual(card['kindLabel'], 'Personagem')
        self.assertIn('Cuida do templo de Brumafria.', card['text'])   # sem a marcação @[..](id)
        self.assertIn('Tem uma filha', card['text'])                    # segredo revelado e pedido
        self.assertNotIn('Serve ao culto', card['text'])                # não revelado: nunca
        self.assertEqual(card['imageUrl'], f'/api/screen/{self.camp.screen_token}/image/{self.velna.id}?v=abc123')
        self.assertTrue(card['at'])
        # celular do jogador recebe o mesmo cartão (para o toast), com URL autenticada
        pc = self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertEqual(pc['screenCard']['title'], 'Irmã Velna')
        self.assertEqual(pc['screenCard']['imageUrl'], f'/api/world/{self.velna.id}/image?v=abc123')

    def test_partial_entry_shows_only_summary(self):
        self.velna.visibility = 'partial'; self.velna.save()
        self.show({'type': 'entry', 'entryId': self.velna.id})
        card = self.screen()['card']
        self.assertEqual(card['text'], 'Sacerdotisa')
        self.assertTrue(card['partial'])

    def test_hidden_entry_is_refused_and_card_disappears_if_hidden_later(self):
        self.assertEqual(self.show({'type': 'entry', 'entryId': self.hidden.id}).status_code, 400)
        self.show({'type': 'entry', 'entryId': self.velna.id})
        self.velna.visibility = 'hidden'; self.velna.save()
        self.assertIsNone(self.screen()['card'])

    def test_recap_scene_and_clear(self):
        r = self.show({'type': 'recap', 'title': 'Anteriormente…', 'text': 'O grupo chegou a Brumafria.'})
        self.assertEqual(r.json()['card']['type'], 'recap')
        self.assertEqual(self.screen()['card']['text'], 'O grupo chegou a Brumafria.')
        self.assertEqual(self.show({'type': 'recap', 'title': '', 'text': ''}).status_code, 400)
        self.assertEqual(self.show({'type': 'scene', 'adventureId': 999, 'nodeId': 'n1'}).status_code, 404)
        self.assertEqual(self.show(None).status_code, 200)
        self.assertIsNone(self.screen()['card'])
        self.show({'type': 'recap', 'title': 'x', 'text': 'y'})
        self.assertEqual(self.show({'card': None}).status_code, 200)
        self.assertIsNone(self.screen()['card'])
        # o resto do state continua intacto
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['scene'], 'Taverna')

    def test_only_dm_and_validation(self):
        self.assertEqual(self.show({'type': 'recap', 'title': 'x'}, self.c_p1).status_code, 403)
        self.assertEqual(self.show({'type': 'bogus'}).status_code, 400)
        self.assertEqual(self.show({'type': 'entry', 'entryId': 'x'}).status_code, 400)


class PlayerViewTests(Base):
    def test_player_campaign_state_is_filtered(self):
        c = self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertEqual(set(c['state']), {'session', 'scene', 'weather', 'live', 'levelingMode'})
        self.assertIn('worldNewCount', c)
        dm = self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertIn('nudges', dm['state'])
        self.assertNotIn('worldNewCount', dm)

    def test_campaign_list_has_no_private_state(self):
        for client in (self.c_dm, self.c_p1):
            camp = client.get('/api/campaigns').json()['campaigns'][0]
            self.assertNotIn('nudges', camp['state'])
            self.assertNotIn('diarySessions', camp['state'])
            self.assertEqual(camp['tagline'], 'Névoa')

    def test_world_new_count(self):
        from django.utils import timezone
        self.velna.revealed_at = timezone.now(); self.velna.save()
        c = self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertEqual(c['worldNewCount'], 1)

    def test_player_combat_get_has_no_statblock(self):
        # (d) o jogador não vê stat block de monstro em GET combat.
        r = self.c_p1.get(f'/api/combat/campaign/{self.camp.id}')
        self.assertEqual(r.status_code, 200)
        combat = r.json()['combat']
        gob = next(c for c in combat['combatants'] if c['id'] == 'g1')
        self.assertNotIn('stats', gob)
        self.assertNotIn('current_hp', gob)
        self.assertNotIn('ac', combat['log'][0])
        self.assertNotIn('total', combat['log'][0])
        self.assertEqual(combat['log'][0]['attacker'], 'Thal')
        # o mestre continua vendo tudo
        full = self.c_dm.get(f'/api/combat/campaign/{self.camp.id}').json()['combat']
        self.assertEqual(next(c for c in full['combatants'] if c['id'] == 'g1')['stats']['ac'], 15)

    def test_combat_get_does_not_create_row(self):
        other = Campaign.objects.create(dm=self.dm, name='Nova', slug='nova')
        r = self.c_dm.get(f'/api/combat/campaign/{other.id}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['combat']['combatants'], [])
        self.assertFalse(r.json()['combat']['active'])
        self.assertFalse(CombatInstance.objects.filter(campaign=other).exists())
