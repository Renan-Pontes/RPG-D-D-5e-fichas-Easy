"""
Ecos da mesa (imersão do Mundo): reações de personagem e leituras dos
jogadores, painel do mestre, "Mundo vivo" desligável, névoa aproximada,
exclusão de campanha (fichas ficam) e sair da campanha.

Privacidade: o jogador nunca vê quem reagiu, nem reage/lê cartão oculto.
"""
from datetime import timedelta

from django.core.cache import cache
from django.test import SimpleTestCase
from django.utils import timezone

from api import world_rules as R
from api.models import (Adventure, Campaign, Character, DiaryEntry, DiceRig, Membership, WorldEntry,
                        WorldReaction, WorldView)
from api.tests.test_world import WorldBase


class EchoBase(WorldBase):
    def setUp(self):
        super().setUp()
        self.velna = self.create(name='Irmã Velna', visibility='revealed')
        self.rumor = self.create(name='Rumor do Sino', kind='lore', visibility='partial')
        self.hidden = self.create(name='ENTRADA-OCULTA', visibility='hidden')

    def react(self, client, pk, kind, method='post'):
        return getattr(client, method)(f'/api/world/{pk}/react', {'kind': kind}, format='json')

    def player_list(self, client):
        r = client.get(self.base)
        self.assertEqual(r.status_code, 200)
        return r.json()


class ReactionTests(EchoBase):
    def test_player_reacts_and_sees_only_aggregates(self):
        r = self.react(self.c1, self.velna['id'], 'shiver')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['myReactions'], ['shiver'])
        self.react(self.c2, self.velna['id'], '😱')          # alias de emoji
        self.react(self.c2, self.velna['id'], 'star')
        body = self.player_list(self.c1)
        e = next(x for x in body['entries'] if x['id'] == self.velna['id'])
        self.assertEqual(e['myReactions'], ['shiver'])
        self.assertFalse(e['myFavorite'])
        self.assertEqual(e['reactionCounts'], {'shiver': 2})   # favorito não entra no agregado
        raw = str(body)
        for leak in ('Bia', 'Ana', 'Thal', 'membershipId', 'whispers', 'p2@x.com'):
            self.assertNotIn(leak, raw)
        e2 = next(x for x in self.player_list(self.c2)['entries'] if x['id'] == self.velna['id'])
        self.assertTrue(e2['myFavorite'])

    def test_idempotent_and_unique(self):
        for _ in range(3):
            self.react(self.c1, self.velna['id'], 'love')
        self.assertEqual(WorldReaction.objects.filter(kind='love').count(), 1)
        r = self.react(self.c1, self.velna['id'], 'love', 'delete')
        self.assertEqual(r.json()['myReactions'], [])
        self.assertFalse(WorldReaction.objects.exists())
        r = self.c1.delete(f'/api/world/{self.velna["id"]}/react?kind=love')
        self.assertEqual(r.status_code, 200)

    def test_partial_card_accepts_reactions(self):
        self.assertEqual(self.react(self.c1, self.rumor['id'], 'doubt').status_code, 200)

    def test_hidden_card_is_404_and_never_listed(self):
        self.assertEqual(self.react(self.c1, self.hidden['id'], 'shiver').status_code, 404)
        self.assertEqual(self.c1.post(f'/api/world/{self.hidden["id"]}/view').status_code, 404)
        self.assertNotIn('ENTRADA-OCULTA', str(self.player_list(self.c1)))

    def test_rehidden_card_hides_reactions_from_player(self):
        self.react(self.c1, self.velna['id'], 'fight')
        self.c_dm.post(f'/api/world/{self.velna["id"]}/reveal', {'visibility': 'hidden', 'logDiary': False},
                       format='json')
        self.assertNotIn('Irmã Velna', str(self.player_list(self.c1)))
        self.assertEqual(self.react(self.c1, self.velna['id'], 'fight', 'delete').status_code, 404)

    def test_handout_for_other_player_is_404(self):
        h = self.create(name='Carta', kind='handout', visibility='revealed',
                        data={'recipients': [self.m2.id]})
        self.assertEqual(self.react(self.c1, h['id'], 'love').status_code, 404)
        self.assertEqual(self.react(self.c2, h['id'], 'love').status_code, 200)

    def test_outsider_anon_dm_and_bad_kind(self):
        self.assertEqual(self.react(self.c_out, self.velna['id'], 'love').status_code, 404)
        self.assertIn(self.react(self.anon, self.velna['id'], 'love').status_code, (401, 403))
        self.assertEqual(self.react(self.c_dm, self.velna['id'], 'love').status_code, 403)
        r = self.react(self.c1, self.velna['id'], 'trophy')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'invalid_reaction')

    def test_react_rate_limited(self):
        codes = [self.react(self.c1, self.velna['id'], 'love').status_code for _ in range(95)]
        self.assertIn(429, codes)

    def test_detail_carries_echo_fields(self):
        self.react(self.c1, self.velna['id'], 'doubt')
        e = self.detail(self.c1, self.velna['id']).json()['entry']
        self.assertEqual(e['myReactions'], ['doubt'])
        self.assertNotIn('whispers', e)
        d = self.detail(self.c_dm, self.velna['id']).json()['entry']
        self.assertEqual(d['reactionCounts'], {'doubt': 1})
        self.assertEqual(d['whispers'][0]['name'], 'Thal')       # personagem, não o jogador
        self.assertEqual(d['whispers'][0]['kinds'], ['doubt'])


class ViewTests(EchoBase):
    def test_view_throttled_one_per_minute(self):
        url = f'/api/world/{self.velna["id"]}/view'
        self.assertTrue(self.c1.post(url).json()['counted'])
        self.assertFalse(self.c1.post(url).json()['counted'])
        row = WorldView.objects.get()
        self.assertEqual(row.count, 1)
        WorldView.objects.filter(pk=row.pk).update(last_at=timezone.now() - timedelta(seconds=61))
        self.assertTrue(self.c1.post(url).json()['counted'])
        self.assertEqual(WorldView.objects.get().count, 2)

    def test_dm_view_is_noop(self):
        r = self.c_dm.post(f'/api/world/{self.velna["id"]}/view')
        self.assertEqual(r.json(), {'counted': False})
        self.assertFalse(WorldView.objects.exists())


class DmEchoTests(EchoBase):
    def test_echoes_panel_narrative(self):
        self.react(self.c1, self.velna['id'], 'shiver')
        self.react(self.c2, self.velna['id'], 'shiver')
        WorldView.objects.create(entry_id=self.velna['id'], membership=self.m1, count=4, last_at=timezone.now())
        r = self.c_dm.get(f'/api/campaigns/{self.camp.id}/world/echoes')
        self.assertEqual(r.status_code, 200)
        body = r.json()
        texts = [ln['text'] for ln in body['lines']]
        self.assertIn('Irmã Velna arrepiou Thal e Bia', texts)
        self.assertIn('Thal voltou quatro vezes a pensar em Irmã Velna', texts)
        ent = body['entries'][0]
        self.assertEqual(ent['reactions'], {'shiver': 2})
        self.assertEqual(ent['views'], 4)
        self.assertTrue(body['known'])
        self.assertNotIn('%', body['known'])
        en = self.c_dm.get(f'/api/campaigns/{self.camp.id}/world/echoes?lang=en').json()
        self.assertIn('Irmã Velna sent a shiver through Thal and Bia', [ln['text'] for ln in en['lines']])

    def test_dm_list_counts(self):
        self.react(self.c1, self.velna['id'], 'star')
        e = next(x for x in self.c_dm.get(self.base).json()['entries'] if x['id'] == self.velna['id'])
        self.assertEqual(e['favoriteCount'], 1)
        self.assertEqual(e['reactionCounts'], {})
        self.assertEqual(e['viewCount'], 0)

    def test_echoes_dm_only(self):
        url = f'/api/campaigns/{self.camp.id}/world/echoes'
        self.assertEqual(self.c1.get(url).status_code, 403)
        self.assertEqual(self.c_out.get(url).status_code, 403)


class ImmersionToggleTests(EchoBase):
    def test_default_on_and_toggle_off(self):
        camp = self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertTrue(camp['immersion'])
        self.assertTrue(self.c1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']['immersion'])
        r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}', {'immersion': False}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(r.json()['campaign']['immersion'])
        self.assertFalse(self.c1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']['immersion'])
        self.assertEqual(self.react(self.c1, self.velna['id'], 'love').status_code, 409)
        self.assertFalse(self.c1.post(f'/api/world/{self.velna["id"]}/view').json()['counted'])
        body = self.player_list(self.c1)
        self.assertFalse(body['immersion'])
        self.assertNotIn('myReactions', str(body))
        self.assertEqual(self.c_dm.get(f'/api/campaigns/{self.camp.id}/world/echoes').json()['lines'], [])

    def test_invalid_toggle(self):
        r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}', {'immersion': 'sim'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.c1.patch(f'/api/campaigns/{self.camp.id}', {'immersion': False},
                                       format='json').status_code, 403)

    def test_fog_hint_only_when_allowed(self):
        self.assertNotIn('fog', self.player_list(self.c1))
        self.c_dm.patch(f'/api/campaigns/{self.camp.id}', {'fogHint': True}, format='json')
        body = self.player_list(self.c1)
        self.assertEqual(body['fog'], {'hint': 'few'})
        self.assertNotIn('ENTRADA-OCULTA', str(body))
        self.assertNotIn('fogHint', self.c1.get(f'/api/campaigns/{self.camp.id}').json()['campaign'])


class CampaignDeleteLeaveTests(EchoBase):
    def test_dm_deletes_campaign_keeps_characters(self):
        self.react(self.c1, self.velna['id'], 'love')
        Adventure.objects.create(campaign=self.camp, name='Aventura')
        DiaryEntry.objects.create(campaign=self.camp, kind='note', title='Nota')
        char_id = self.m1.character_id
        self.assertEqual(self.c1.delete(f'/api/campaigns/{self.camp.id}').status_code, 403)
        r = self.c_dm.delete(f'/api/campaigns/{self.camp.id}')
        self.assertEqual(r.status_code, 200)
        # "Apagar" agora encerra (30 dias somente leitura); a purga apaga de vez.
        self.assertEqual(r.json()['campaign']['status'], 'closed')
        from datetime import timedelta
        from django.utils import timezone
        from api.plans import purge_expired
        Campaign.objects.filter(pk=self.camp.id).update(closed_at=timezone.now() - timedelta(days=31))
        purge_expired()
        self.assertFalse(Campaign.objects.filter(pk=self.camp.id).exists())
        self.assertFalse(WorldEntry.objects.filter(campaign_id=self.camp.id).exists())
        self.assertFalse(Adventure.objects.filter(campaign_id=self.camp.id).exists())
        self.assertFalse(DiaryEntry.objects.filter(campaign_id=self.camp.id).exists())
        self.assertFalse(WorldReaction.objects.exists())
        self.assertFalse(Membership.objects.filter(campaign_id=self.camp.id).exists())
        self.assertTrue(Character.objects.filter(pk=char_id).exists())
        self.assertEqual(self.c1.get(f'/api/characters/{char_id}').status_code, 200)

    def test_player_leaves(self):
        DiceRig.objects.create(campaign=self.camp, target_user=self.p1, values=[{'value': 20, 'consumed': False}])
        self.react(self.c1, self.velna['id'], 'love')
        char_id = self.m1.character_id
        r = self.c1.post(f'/api/campaigns/{self.camp.id}/leave')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(Membership.objects.filter(pk=self.m1.pk).exists())
        self.assertFalse(WorldReaction.objects.exists())
        self.assertFalse(DiceRig.objects.filter(campaign=self.camp, target_user=self.p1).exists())
        self.assertTrue(Character.objects.filter(pk=char_id).exists())
        self.assertEqual(self.c1.get(f'/api/campaigns/{self.camp.id}').status_code, 403)
        self.assertEqual(self.c1.post(f'/api/campaigns/{self.camp.id}/leave').status_code, 403)

    def test_dm_cannot_leave(self):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/leave')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'dm_cannot_leave')


class PureRulesTests(SimpleTestCase):
    def test_clean_kind(self):
        self.assertEqual(R.clean_reaction_kind('⭐'), 'star')
        self.assertEqual(R.clean_reaction_kind('FIGHT'), 'fight')
        for bad in (None, '', 'trophy', 5):
            with self.assertRaises(R.WorldError):
                R.clean_reaction_kind(bad)

    def test_known_share_is_a_phrase(self):
        self.assertIn('um terço', R.known_share_phrase(3, 0, 9))
        self.assertIn('metade', R.known_share_phrase(4, 2, 10))
        self.assertIn('third', R.known_share_phrase(1, 0, 3, 'en'))
        self.assertEqual(R.known_share_phrase(0, 0, 0), '')
        for r in range(0, 11):
            self.assertNotRegex(R.known_share_phrase(r, 0, 10), r'\d')

    def test_echo_lines_threshold(self):
        lines = R.echo_lines([{'entryId': 1, 'name': 'Brumafria', 'isMap': True,
                               'people': [{'name': 'Thalion', 'kinds': [], 'views': 1},
                                          {'name': 'Bia', 'kinds': [], 'views': 12}]}])
        self.assertEqual([ln['text'] for ln in lines],
                         ['Bia voltou muitas vezes ao mapa de Brumafria'])

    def test_fog_hint(self):
        self.assertEqual([R.fog_hint(n) for n in (0, 2, 8, 40)], ['none', 'few', 'some', 'many'])
