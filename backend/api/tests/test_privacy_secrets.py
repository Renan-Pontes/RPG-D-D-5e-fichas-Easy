"""
Matriz de privacidade — o que o jogador e o telão NUNCA podem receber.

  #15 dado viciado: nada de rigged/source/forced/override em respostas a
      jogador ou telão (rolador livre, teste da mesa, pedido de rolagem,
      ataque do jogador, telão). O mestre continua vendo.
  #16/#5 Crônica: evento "Revelado" segue o estado atual do Mundo (documento
      de outro destinatário, cartão oculto de novo, segredo escondido de novo)
      e não repete quando o mesmo cartão é revelado de novo na sessão.
  #19 e-mail: jogador vê só o nome de exibição dos colegas (e do mestre).
  #30 tags do Mundo: só o mestre recebe.
  #31 telão: NPC aparece como "NPC", não "Personagem".
"""
import json

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.dice_privacy import SECRET_DICE_KEYS, scrub_dice
from api.models import Approval, Campaign, Character, DiceRig, DiaryEntry, Membership, Profile

User = get_user_model()


def _u(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


def _keys(obj):
    """Todas as chaves de um JSON, em qualquer profundidade."""
    out = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            out.add(k)
            out |= _keys(v)
    elif isinstance(obj, list):
        for v in obj:
            out |= _keys(v)
    return out


class PrivacyBase(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = _u('mestre@x.com', 'Mestre')
        self.p1 = _u('renan@x.com', 'Renan')
        self.p2 = _u('novata@x.com', 'Novata')
        self.camp = Campaign.objects.create(dm=self.dm, name='Mesa', slug='mesa', state={'session': '3'})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.char1 = Character.objects.create(owner=self.p1, name='Thal', data={
            'level': 1, 'maxHp': 15, 'currentHp': 15, 'className': 'druid'})
        self.m1 = Membership.objects.create(campaign=self.camp, user=self.p1, character=self.char1, role='player')
        self.m2 = Membership.objects.create(campaign=self.camp, user=self.p2, role='player')
        self.c_dm, self.c1, self.c2, self.anon = APIClient(), APIClient(), APIClient(), APIClient()
        self.c_dm.force_login(self.dm)
        self.c1.force_login(self.p1)
        self.c2.force_login(self.p2)

    def rig(self, *values, user=None, dice='d20'):
        return DiceRig.objects.create(campaign=self.camp, target_user=user or self.p1, dice_type=dice,
                                      values=[{'value': v, 'consumed': False} for v in values])

    def assertNoRigLeak(self, payload, where):
        leaked = _keys(payload) & SECRET_DICE_KEYS
        self.assertFalse(leaked, f'{where} vazou {leaked}: {json.dumps(payload)[:400]}')


# ============================================================ #15 dado viciado
class ScrubDiceUnitTests(TestCase):
    def test_scrub_removes_nested_keys_and_keeps_values(self):
        raw = {'value': 20, 'rigged': True, 'source': 3,
               'attack_roll': {'value': 20, 'rolls': [20], 'forced': True},
               'rolls': [{'value': 5, 'kept': True, 'rigged': True, 'override': True}]}
        out = scrub_dice(raw)
        self.assertEqual(out, {'value': 20, 'attack_roll': {'value': 20, 'rolls': [20]},
                               'rolls': [{'value': 5, 'kept': True}]})
        self.assertIn('rigged', raw)   # não altera o original


class RiggedDiceNeverReachesPlayerTests(PrivacyBase):
    def test_free_roller_hides_rig_from_player(self):
        rig = self.rig(1)
        r = self.c1.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id, 'count': 2},
                         format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['results'][0]['value'], 1)
        self.assertNoRigLeak(r.json(), '/dice/roll')
        self.assertEqual(r.json()['results'][0], {'value': 1})   # nem o id da DiceRig
        self.assertTrue(DiceRig.objects.get(pk=rig.pk).values[0]['consumed'])
        # o mestre continua vendo no histórico
        log = self.c_dm.get(f'/api/dice/campaign/{self.camp.id}/log').json()['log']
        self.assertTrue(any(e['rigged'] and e['result'] == 1 for e in log))

    def test_check_response_hides_rig_from_player(self):
        self.rig(20, 20)
        cr = self.c_dm.post(f'/api/checks/campaign/{self.camp.id}',
                            {'label': 'Furtividade', 'kind': 'skill', 'key': 'stealth', 'dc': 15,
                             'advantage': 'adv'}, format='json').json()['check']
        r = self.c1.post(f'/api/checks/{cr["id"]}/respond', {'mode': 'app', 'modifier': 3}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['response']['natural'], 20)
        self.assertNoRigLeak(r.json(), '/checks/respond')
        for url in ('/api/checks/mine', f'/api/checks/campaign/{self.camp.id}'):
            self.assertNoRigLeak(self.c1.get(url).json(), url)
        # mestre vê, telão não
        dm = self.c_dm.get(f'/api/checks/campaign/{self.camp.id}').json()['checks'][0]
        self.assertTrue(next(t for t in dm['targets'] if t['userId'] == self.p1.id)['response']['rigged'])
        self.c_dm.post(f'/api/checks/{cr["id"]}/screen', {'show': True}, format='json')
        self.assertNoRigLeak(self.anon.get(f'/api/screen/{self.camp.screen_token}').json(), 'telão (teste)')

    def test_dm_answering_for_player_keeps_rig_for_dm(self):
        self.rig(20)
        cr = self.c_dm.post(f'/api/checks/campaign/{self.camp.id}', {'label': 'Percepção'},
                            format='json').json()['check']
        r = self.c_dm.post(f'/api/checks/{cr["id"]}/respond', {'mode': 'app', 'userId': self.p1.id},
                           format='json')
        self.assertTrue(r.json()['response']['rigged'])
        self.assertNoRigLeak(self.c1.get('/api/checks/mine').json(), '/checks/mine')

    def _resolved_roll(self, **resolve):
        rr = self.c1.post(f'/api/rolls/campaign/{self.camp.id}',
                          {'diceType': 'd20', 'label': 'Atletismo'}, format='json').json()['roll']
        self.assertNoRigLeak(rr, '/rolls create')
        r = self.c_dm.post(f'/api/rolls/{rr["id"]}/resolve', {'visibility': 'public', **resolve}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.json()['roll']['rigged'])   # o mestre vê
        return rr

    def _assert_roll_views_clean(self):
        for client, who in ((self.c1, 'dono'), (self.c2, 'colega')):
            for url in (f'/api/rolls/campaign/{self.camp.id}/recent', f'/api/rolls/campaign/{self.camp.id}/pending'):
                self.assertNoRigLeak(client.get(url).json(), f'{who} {url}')
        tok = self.camp.screen_token
        self.assertNoRigLeak(self.anon.get(f'/api/screen/{tok}/rolls').json(), 'telão /rolls')
        self.assertNoRigLeak(self.anon.get(f'/api/screen/{tok}').json(), 'telão publicRolls')
        dm_recent = self.c_dm.get(f'/api/rolls/campaign/{self.camp.id}/recent').json()['rolls']
        self.assertTrue(dm_recent[0]['rigged'])

    def test_roll_request_with_rig_hidden_from_players_and_screen(self):
        self.rig(20)
        self._resolved_roll()
        self._assert_roll_views_clean()

    def test_roll_request_with_dm_override_hidden(self):
        self._resolved_roll(overrideValue=17)
        self._assert_roll_views_clean()

    def test_player_attack_hides_forced_d20(self):
        self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/start')
        cs = self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/combatants',
                            {'type': 'pc', 'characterId': self.char1.id, 'initiative': 17,
                             'position': {'x': 0, 'y': 0}}, format='json').json()['combat']['combatants']
        pc = next(c for c in cs if c['type'] == 'pc')['id']
        cs = self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/combatants',
                            {'type': 'monster', 'monster': {
                                'id': 'goblin', 'name': 'Goblin', 'ac': 13, 'hp': 7,
                                'abilities': {'str': 8, 'dex': 14, 'con': 10, 'int': 10, 'wis': 8, 'cha': 8}},
                             'initiative': 12, 'position': {'x': 1, 'y': 0}}, format='json').json()['combat']['combatants']
        gob = next(c for c in cs if c['type'] == 'monster')['id']
        self.rig(20)
        r = self.c1.post(f'/api/combat/campaign/{self.camp.id}/player-attack',
                         {'attackerCombatantId': pc, 'targetId': gob, 'attackKind': 'weapon',
                          'attackName': 'Cimitarra', 'attackBonus': 4, 'damage': '1d6+2',
                          'damageType': 'slashing'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.json()['result']['crit'])
        self.assertNoRigLeak(r.json(), '/combat/player-attack')


# ============================================================ #19 e-mail
class EmailPrivacyTests(PrivacyBase):
    def test_player_sees_only_display_names(self):
        r = self.c2.get(f'/api/campaigns/{self.camp.slug}')
        self.assertEqual(r.status_code, 200)
        text = json.dumps(r.json())
        self.assertNotIn('renan@x.com', text)
        self.assertNotIn('mestre@x.com', text)
        camp = r.json().get('campaign', r.json())
        members = {m['user']['id']: m['user'] for m in camp['members']}
        self.assertEqual(members[self.p1.id]['displayName'], 'Renan')
        self.assertNotIn('email', members[self.p1.id])
        self.assertEqual(members[self.p2.id].get('email'), 'novata@x.com')   # o próprio

    def test_dm_still_sees_emails(self):
        text = json.dumps(self.c_dm.get(f'/api/campaigns/{self.camp.slug}').json())
        self.assertIn('renan@x.com', text)
        self.assertIn('novata@x.com', text)

    def test_approvals_do_not_carry_emails(self):
        Approval.objects.create(campaign=self.camp, character=self.char1, requested_by=self.p1,
                                reviewed_by=self.dm, type='levelup', payload={'toLevel': 2}, status='approved')
        text = json.dumps(self.c1.get(f'/api/approvals/campaign/{self.camp.id}').json())
        self.assertIn('Renan', text)
        self.assertNotIn('mestre@x.com', text)


# ============================================================ #16 / #5 Crônica
class DiaryRevealPrivacyTests(PrivacyBase):
    def world(self, **body):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/world', {'kind': 'npc', 'name': 'X', **body},
                           format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()['entry']

    def reveal(self, pk, **body):
        r = self.c_dm.post(f'/api/world/{pk}/reveal', body, format='json')
        self.assertEqual(r.status_code, 200, r.content)

    def diary_text(self, client):
        r = client.get(f'/api/campaigns/{self.camp.id}/diary')
        self.assertEqual(r.status_code, 200)
        return json.dumps(r.json(), ensure_ascii=False)

    def test_private_handout_reveal_not_in_other_players_diary(self):
        doc = self.world(kind='handout', name='Mapa secreto PRIV2', data={'recipients': [self.m1.id]})
        self.reveal(doc['id'], visibility='revealed')
        self.assertIn('PRIV2', self.diary_text(self.c1))       # destinatário vê
        self.assertNotIn('PRIV2', self.diary_text(self.c2))    # outro jogador não
        self.assertIn('PRIV2', self.diary_text(self.c_dm))

    def test_hidden_again_disappears_and_rereveal_does_not_duplicate(self):
        f = self.world(kind='faction', name='Círculo do Sino Mudo')
        self.reveal(f['id'], visibility='revealed')
        self.reveal(f['id'], visibility='hidden')
        self.assertNotIn('Sino Mudo', self.diary_text(self.c1))
        self.assertIn('Sino Mudo', self.diary_text(self.c_dm))   # histórico do mestre fica
        self.reveal(f['id'], visibility='revealed')
        self.reveal(f['id'], visibility='hidden')
        self.reveal(f['id'], visibility='revealed')
        self.assertEqual(DiaryEntry.objects.filter(campaign=self.camp, subtype='reveal').count(), 1)
        self.assertEqual(self.diary_text(self.c1).count('Revelado: Círculo do Sino Mudo'), 1)

    def test_secret_hidden_again_leaves_player_diary(self):
        npc = self.world(name='Morvane', visibility='revealed',
                         secrets=[{'id': 'a', 'text': 'SEGREDO-A'}, {'id': 'b', 'text': 'SEGREDO-B'}])
        self.reveal(npc['id'], secrets={'a': True, 'b': True})
        self.assertIn('SEGREDO-B', self.diary_text(self.c1))
        self.reveal(npc['id'], secrets={'b': False})
        text = self.diary_text(self.c1)
        self.assertIn('SEGREDO-A', text)
        self.assertNotIn('SEGREDO-B', text)
        self.reveal(npc['id'], secrets={'a': False})
        self.assertNotIn('SEGREDO-A', self.diary_text(self.c1))
        self.assertIn('SEGREDO-B', self.diary_text(self.c_dm))


# ============================================================ #30 tags / #31 telão
class WorldTagsAndScreenLabelTests(PrivacyBase):
    def test_tags_only_for_dm(self):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/world',
                           {'kind': 'npc', 'name': 'Morvane', 'visibility': 'partial', 'tags': ['vilão']},
                           format='json')
        pk = r.json()['entry']['id']
        lst = self.c1.get(f'/api/campaigns/{self.camp.id}/world').json()
        self.assertNotIn('vilão', json.dumps(lst, ensure_ascii=False))
        self.assertEqual(self.c1.get(f'/api/world/{pk}').json()['entry']['tags'], [])
        self.c_dm.patch(f'/api/world/{pk}', {'visibility': 'revealed'}, format='json')
        self.assertEqual(self.c1.get(f'/api/world/{pk}').json()['entry']['tags'], [])
        self.assertEqual(self.c_dm.get(f'/api/world/{pk}').json()['entry']['tags'], ['vilão'])

    def test_npc_label_on_screen_is_npc(self):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/world',
                           {'kind': 'npc', 'name': 'Borin', 'visibility': 'revealed'}, format='json')
        pk = r.json()['entry']['id']
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/screen-card', {'type': 'entry', 'entryId': pk},
                           format='json')
        self.assertEqual(r.status_code, 200, r.content)
        card = self.anon.get(f'/api/screen/{self.camp.screen_token}').json()['card']
        self.assertEqual(card['kindLabel'], 'NPC')
