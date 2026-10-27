"""
V10 · Rolagens na Tela ("as roladas acontecem nela", especificação §5.4).

- A TV lê uma JANELA pelo relógio do servidor (`rolls` + `now` no GET da Tela):
  pedido antigo resolvido depois de um novo aparece (em ordem), 2 rolagens em
  menos de 2 s aparecem as 2, a idade não depende do relógio da TV; o nome é o do
  personagem; parada, a Tela continua 304 (o ETag não leva o `now`).
- 🎲 do mestre: 📺 Na tela → linha pública `@mesa:dm` ("Mestre"); 🔒 Só eu → só o
  registro dele (DiceLog + linha privada), nada na TV.
- Ataque de monstro aplicado com `show` → 1 linha sem o bônus; salvaguarda em área
  rolada no servidor (save-preview, nada aplicado) e aplicada numa chamada
  (save_apply) com 1 linha-resumo.
- Política "Dos jogadores" no rolador da Mesa (Todas · Só críticos · Nenhuma) e
  respostas de teste com 20/1 natural.
- Arrumação: só as 300 rolagens `@mesa:` mais novas ficam; pedidos e o Histórico
  de rolagens de Testes não mudam. O `GET /screen/<t>/rolls` não existe mais.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import (Campaign, CheckResponse, CombatInstance, DiceLog, DiceRig, Membership, Profile,
                        Character, RollRequest)
from api import table_rolls

User = get_user_model()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Renan')
        self.ana = make_user('ana@x.com', 'Ana')
        self.bruno = make_user('bruno@x.com', 'Bruno')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_ana = APIClient(); self.c_ana.force_login(self.ana)
        self.c_bruno = APIClient(); self.c_bruno.force_login(self.bruno)
        self.anon = APIClient()
        self.camp = Campaign.objects.create(dm=self.dm, name='Brumafria', slug='brumafria',
                                            state={'session': '4', 'live': True})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.dagna = Character.objects.create(owner=self.ana, name='Dagna', data={'name': 'Dagna'})
        self.pipo = Character.objects.create(owner=self.bruno, name='Pipo', data={'name': 'Pipo'})
        Membership.objects.create(campaign=self.camp, user=self.ana, character=self.dagna, role='player')
        Membership.objects.create(campaign=self.camp, user=self.bruno, character=self.pipo, role='player')

    def screen(self, **headers):
        r = self.anon.get(f'/api/screen/{self.camp.screen_token}', **headers)
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def rig(self, user, value, dice_type='d20'):
        return DiceRig.objects.create(campaign=self.camp, target_user=user, dice_type=dice_type,
                                      values=[{'value': value, 'consumed': False}])

    def prefs(self, **prefs):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/stage', {'op': 'prefs', 'prefs': prefs}, format='json')
        self.assertEqual(r.status_code, 200, r.content)

    def ask(self, client, label):
        r = client.post(f'/api/rolls/campaign/{self.camp.id}', {'label': label, 'diceType': 'd20'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['roll']['id']

    def resolve(self, rid):
        r = self.c_dm.post(f'/api/rolls/{rid}/resolve', {'visibility': 'public'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)


class ScreenWindowTests(Base):
    def test_old_request_resolved_after_new_shows_both_in_order(self):
        a = self.ask(self.c_ana, 'Pedido A (antigo)')
        b = self.ask(self.c_bruno, 'Pedido B (novo)')
        self.resolve(b)
        self.resolve(a)
        d = self.screen()
        self.assertEqual([r['id'] for r in d['rolls']], [b, a])        # ordem por resolved_at
        self.assertEqual([r['who'] for r in d['rolls']], ['Pipo', 'Dagna'])   # o personagem, não o usuário
        self.assertEqual({r['kind'] for r in d['rolls']}, {'request'})
        self.assertIn('now', d)
        # a TV de antes: a mais nova da janela
        self.assertEqual(d['campaign']['publicRolls'][0]['id'], a)

    def test_two_rolls_within_two_seconds_both_arrive(self):
        a, b = self.ask(self.c_ana, 'Furtividade (A)'), self.ask(self.c_ana, 'Furtividade (B)')
        self.resolve(a)
        self.resolve(b)
        self.assertEqual([r['id'] for r in self.screen()['rolls']], [a, b])

    def test_window_is_the_servers_clock_and_old_rolls_leave(self):
        a = self.ask(self.c_ana, 'Velha')
        self.resolve(a)
        RollRequest.objects.filter(pk=a).update(resolved_at=timezone.now() - timedelta(seconds=120))
        b = self.ask(self.c_ana, 'Nova')
        self.resolve(b)
        d = self.screen()
        self.assertEqual([r['id'] for r in d['rolls']], [b])
        # a idade sai da conta now − at, os dois do servidor
        from datetime import datetime
        age = datetime.fromisoformat(d['now']) - datetime.fromisoformat(d['rolls'][0]['at'])
        self.assertLess(age.total_seconds(), 10)

    def test_at_most_six_and_private_never(self):
        for i in range(8):
            table_rolls.record(self.camp, self.dm, 'dm', label=f'r{i}', rolls=[{'value': 5, 'kept': True}], total=5)
        table_rolls.record(self.camp, self.dm, 'dm', label='segredo', rolls=[{'value': 5}], total=5, public=False)
        d = self.screen()
        self.assertEqual([r['label'] for r in d['rolls']], [f'r{i}' for i in range(2, 8)])

    def test_unchanged_screen_is_still_304_and_a_new_roll_changes_it(self):
        r = self.anon.get(f'/api/screen/{self.camp.screen_token}')
        self.assertEqual(self.anon.get(f'/api/screen/{self.camp.screen_token}',
                                       HTTP_IF_NONE_MATCH=r['ETag']).status_code, 304)
        self.c_dm.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id, 'table': True}, format='json')
        self.assertEqual(self.anon.get(f'/api/screen/{self.camp.screen_token}',
                                       HTTP_IF_NONE_MATCH=r['ETag']).status_code, 200)

    def test_dead_screen_rolls_route_is_gone(self):
        self.assertEqual(self.anon.get(f'/api/screen/{self.camp.screen_token}/rolls').status_code, 404)


class DmDiceTests(Base):
    def test_on_screen_shows_gm(self):
        n0 = DiceLog.objects.count()
        r = self.c_dm.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id, 'modifier': 3,
                                              'label': 'Sorte', 'table': True}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.json()['shown'])
        self.assertEqual(DiceLog.objects.count(), n0 + 1)
        row = self.screen()['rolls'][-1]
        self.assertEqual((row['kind'], row['who'], row['label'], row['modifier']), ('dm', '', 'Sorte', 3))
        self.assertEqual(row['total'], r.json()['total'] + 3)

    def test_only_me_logs_but_never_reaches_the_tv(self):
        n0 = DiceLog.objects.count()
        r = self.c_dm.post('/api/dice/roll', {'diceType': 'd6', 'count': 2, 'campaignId': self.camp.id,
                                              'table': False}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(r.json()['shown'])
        self.assertEqual(DiceLog.objects.count(), n0 + 2)
        self.assertEqual(self.screen()['rolls'], [])
        rr = RollRequest.objects.get(pk=r.json()['rollId'])
        self.assertEqual((rr.status, rr.note), ('private', '@mesa:dm'))

    def test_old_roller_without_table_writes_nothing_new(self):
        self.c_dm.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id}, format='json')
        self.assertFalse(RollRequest.objects.exists())

    def test_mixed_formula_and_advantage(self):
        r = self.c_dm.post('/api/dice/roll', {'campaignId': self.camp.id, 'table': True, 'groups': [
            {'diceType': 'd8', 'count': 1}, {'diceType': 'd6', 'count': 2}]}, format='json').json()
        self.assertEqual([x['die'] for x in r['results']], ['d8', 'd6', 'd6'])
        self.assertEqual(r['total'], sum(x['value'] for x in r['results']))
        self.assertEqual(self.screen()['rolls'][-1]['diceType'], 'mixed')
        r = self.c_dm.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id, 'adv': 'adv',
                                              'table': True}, format='json').json()
        self.assertEqual(len(r['results']), 2)
        self.assertEqual(r['total'], max(x['value'] for x in r['results']))
        self.assertEqual(sum(1 for x in r['results'] if x['kept']), 1)

    def test_prepared_die_counts_on_screen(self):
        self.rig(self.dm, 20)
        r = self.c_dm.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id, 'table': True},
                           format='json').json()
        self.assertEqual(r['total'], 20)
        row = self.screen()['rolls'][-1]
        self.assertTrue(row['crit'])
        self.assertNotIn('rigged', str(row))


class PlayerTableRollerTests(Base):
    def roll(self, client=None):
        r = (client or self.c_ana).post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id,
                                                          'label': 'Percepção', 'modifier': 2}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_crits_only_by_default(self):
        self.rig(self.ana, 7)
        self.assertFalse(self.roll()['shown'])
        self.assertEqual(self.screen()['rolls'], [])
        self.rig(self.ana, 20)   # 20 natural (dado preparado) vai, com o personagem
        self.assertTrue(self.roll()['shown'])
        row = self.screen()['rolls'][-1]
        self.assertEqual((row['kind'], row['who'], row['total'], row['crit']), ('player', 'Dagna', 22, True))
        self.assertNotIn('rigged', str(self.screen()))

    def test_all_and_none(self):
        self.prefs(players='all')
        self.rig(self.ana, 7)
        self.assertTrue(self.roll()['shown'])
        self.prefs(players='off')
        self.rig(self.ana, 20)
        self.assertFalse(self.roll()['shown'])
        self.assertEqual(len(self.screen()['rolls']), 1)

    def test_check_response_with_natural_20_becomes_a_roll(self):
        cr = self.c_dm.post(f'/api/checks/campaign/{self.camp.id}', {'label': 'Percepção', 'dc': 15},
                            format='json').json()['check']
        r = self.c_ana.post(f'/api/checks/{cr["id"]}/respond', {'mode': 'physical', 'natural': 20, 'modifier': 3},
                            format='json')
        self.assertEqual(r.status_code, 200, r.content)
        r = self.c_bruno.post(f'/api/checks/{cr["id"]}/respond', {'mode': 'physical', 'natural': 11, 'modifier': 3},
                              format='json')
        self.assertEqual(r.status_code, 200, r.content)
        rows = self.screen()['rolls']
        self.assertEqual([(x['kind'], x['who'], x['total'], x['crit']) for x in rows], [('check', 'Dagna', 23, True)])
        # o mestre corrige para o mesmo natural: não grava de novo
        self.c_dm.post(f'/api/checks/{cr["id"]}/respond', {'mode': 'physical', 'natural': 20, 'userId': self.ana.id},
                       format='json')
        self.assertEqual(len(self.screen()['rolls']), 1)
        self.assertEqual(CheckResponse.objects.count(), 2)

    def test_check_crit_respects_none(self):
        self.prefs(players='off')
        cr = self.c_dm.post(f'/api/checks/campaign/{self.camp.id}', {'label': 'Percepção'}, format='json').json()['check']
        self.c_ana.post(f'/api/checks/{cr["id"]}/respond', {'mode': 'physical', 'natural': 1}, format='json')
        self.assertEqual(self.screen()['rolls'], [])


class CombatRollTests(Base):
    def setUp(self):
        super().setUp()
        self.combat = CombatInstance.objects.create(campaign=self.camp, active=True, combatants=[
            {'id': 'g2', 'type': 'monster', 'name': 'Goblin #2', 'initiative': 14, 'current_hp': 7,
             'stats': {'ac': 15, 'max_hp': 7, 'abilities': {'dex': 14},
                       'actions': [{'name': 'Cimitarra', 'atk': 4, 'damage': '1d6+2', 'damageType': 'slashing'}]}},
            {'id': 'dr', 'type': 'monster', 'name': 'Dragão', 'initiative': 20, 'current_hp': 100,
             'stats': {'ac': 18, 'max_hp': 100, 'actions': [
                 {'name': {'pt': 'Sopro de Fogo', 'en': 'Fire Breath'}, 'damage': '6d6', 'damageType': 'fire',
                  'save': {'ability': 'DEX', 'dc': 13, 'halfOnSave': True, 'conditions': ['prone']},
                  'recharge': '5-6'}]}},
            {'id': 'd1', 'type': 'pc', 'name': 'Dagna', 'character_id': self.dagna.id, 'initiative': 12,
             'current_hp': 30, 'stats': {'ac': 16, 'max_hp': 30, 'abilities': {'dex': 10}}},
            {'id': 'p1', 'type': 'pc', 'name': 'Pipo', 'character_id': self.pipo.id, 'initiative': 10,
             'current_hp': 20, 'stats': {'ac': 14, 'max_hp': 20, 'saves': {'dex': 5}}},
        ])
        self.url = f'/api/combat/campaign/{self.camp.id}'

    def attack(self, **extra):
        r = self.c_dm.post(f'{self.url}/action', {'action': 'attack', 'attackerId': 'g2', 'targetId': 'd1',
                                                  'actionIndex': 0, 'attackRoll': 11, 'hit': True, 'crit': False,
                                                  'damage': [{'amount': 6, 'type': 'slashing'}], **extra},
                           format='json')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_monster_attack_on_screen_without_the_bonus(self):
        self.assertNotIn('shown', self.attack())
        self.assertEqual(self.screen()['rolls'], [])
        body = self.attack(show=True)
        self.assertIn('shown', body)
        row = self.screen()['rolls'][-1]
        self.assertEqual((row['kind'], row['who'], row['label'], row['total'], row['hit']),
                         ('monster', 'Goblin #2', 'Dagna', 11, True))
        self.assertEqual(row['damage'], [{'amount': 6, 'type': 'slashing'}])
        self.assertEqual(row['rolls'], [{'value': 11, 'kept': True}])
        self.assertEqual(row['modifier'], 0)
        self.assertNotIn(15, [row['total']])   # 11 + 4 (o bônus) nunca vai

    def test_save_preview_rolls_on_server_and_applies_nothing(self):
        before = CombatInstance.objects.get(pk=self.combat.pk).combatants
        r = self.c_dm.post(f'{self.url}/save-preview', {'attackerId': 'dr', 'actionIndex': 0,
                                                        'targetIds': ['d1', 'p1']}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        p = r.json()
        self.assertEqual((p['ability'], p['dc'], p['half'], p['conditions']), ('dex', 13, True, ['prone']))
        self.assertEqual([t['id'] for t in p['targets']], ['d1', 'p1'])
        for t in p['targets']:
            self.assertTrue(1 <= t['d20'] <= 20)
        self.assertEqual(p['targets'][0]['total'], p['targets'][0]['d20'] + 0)   # DES 10 → +0
        self.assertEqual(p['targets'][1]['total'], p['targets'][1]['d20'] + 5)   # saves.dex
        self.assertEqual(p['damage'][0]['dice'], '6d6')
        self.assertEqual(CombatInstance.objects.get(pk=self.combat.pk).combatants, before)

    def test_save_apply_in_one_call_with_summary_line(self):
        r = self.c_dm.post(f'{self.url}/action', {
            'action': 'save_apply', 'attackerId': 'dr', 'actionIndex': 0, 'consume': True, 'show': True,
            'targets': [
                {'id': 'd1', 'total': 9, 'success': False, 'd20': 9, 'damage': [{'amount': 20, 'type': 'fire'}],
                 'conditions': ['prone']},
                {'id': 'p1', 'total': 17, 'success': True, 'd20': 12, 'damage': [{'amount': 10, 'type': 'fire'}]},
            ]}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        cs = {c['id']: c for c in CombatInstance.objects.get(pk=self.combat.pk).combatants}
        self.assertEqual((cs['d1']['current_hp'], cs['p1']['current_hp']), (10, 10))
        self.assertIn('prone', cs['d1'].get('conditions') or [])
        log = CombatInstance.objects.get(pk=self.combat.pk).action_log[-1]
        self.assertEqual(log['type'], 'save_aoe')
        self.assertEqual([p['damage_taken'] for p in log['per_target']], [20, 10])
        row = self.screen()['rolls'][-1]
        self.assertEqual((row['kind'], row['who'], row['label'], row['ability'], row['dc']),
                         ('save', 'Dragão', 'Sopro de Fogo', 'dex', 13))
        self.assertEqual(row['targets'], [{'who': 'Dagna', 'total': 9, 'ok': False}, {'who': 'Pipo', 'total': 17, 'ok': True}])
        self.assertEqual(row['rolls'], [])          # o d20 com o total entregaria o bônus
        dm = self.c_dm.get(f'/api/rolls/campaign/{self.camp.id}/recent?table=1').json()['rolls'][0]
        self.assertEqual([t['d20'] for t in dm['targets']], [9, 12])   # o mestre vê o d20

    def test_save_apply_rejects_unknown_target(self):
        r = self.c_dm.post(f'{self.url}/action', {'action': 'save_apply', 'attackerId': 'dr', 'actionIndex': 0,
                                                  'targets': [{'id': 'zz', 'success': True}]}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_player_cannot_preview(self):
        r = self.c_ana.post(f'{self.url}/save-preview', {'attackerId': 'dr', 'actionIndex': 0,
                                                         'targetIds': ['d1']}, format='json')
        self.assertEqual(r.status_code, 403)


class PruneAndHistoryTests(Base):
    def test_keeps_300_table_rolls_and_every_request(self):
        now = timezone.now()
        RollRequest.objects.bulk_create([
            RollRequest(campaign=self.camp, requested_by=self.ana, label=f'pedido {i}', status='public',
                        rolls=[{'value': 3, 'kept': True}], total=3, resolved_at=now) for i in range(20)])
        RollRequest.objects.bulk_create([
            RollRequest(campaign=self.camp, requested_by=self.dm, label=f'mesa {i}', status='public',
                        note='@mesa:dm', rolls=[{'value': 3}], total=3, resolved_at=now) for i in range(310)])
        hist_before = self.c_dm.get(f'/api/rolls/campaign/{self.camp.id}/recent').json()['rolls']
        self.c_dm.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id, 'table': True}, format='json')
        mesa = RollRequest.objects.filter(campaign=self.camp, note__startswith='@mesa:')
        self.assertEqual(mesa.count(), 300)
        self.assertTrue(mesa.filter(label='mesa 309').exists())
        self.assertFalse(mesa.filter(label='mesa 10').exists())
        self.assertEqual(RollRequest.objects.filter(campaign=self.camp).exclude(note__startswith='@mesa:').count(), 20)
        # o Histórico de rolagens de Testes continua igual (só pedidos)
        self.assertEqual(self.c_dm.get(f'/api/rolls/campaign/{self.camp.id}/recent').json()['rolls'], hist_before)
        self.assertEqual(len(hist_before), 20)

    def test_table_filter_is_the_dms(self):
        self.c_dm.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id, 'table': False}, format='json')
        rows = self.c_dm.get(f'/api/rolls/campaign/{self.camp.id}/recent?table=1').json()['rolls']
        self.assertEqual([(r['kind'], r['status']) for r in rows], [('dm', 'private')])
        self.assertEqual(self.c_ana.get(f'/api/rolls/campaign/{self.camp.id}/recent?table=1').json()['rolls'], [])

    def test_other_campaign_is_untouched(self):
        other = Campaign.objects.create(dm=self.dm, name='Outra', slug='outra')
        RollRequest.objects.create(campaign=other, requested_by=self.dm, note='@mesa:dm', status='public',
                                   resolved_at=timezone.now())
        table_rolls.prune(self.camp.id, keep=0)
        self.assertEqual(RollRequest.objects.filter(campaign=other).count(), 1)

    def test_pulse_names_the_gm(self):
        self.c_dm.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id, 'table': True}, format='json')
        roll = self.c_dm.get(f'/api/campaigns/{self.camp.id}/pulse').json()['screen']['roll']
        self.assertEqual((roll['kind'], roll['who']), ('dm', ''))
