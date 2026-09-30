"""
Recarga, usos por dia, ações/resistências lendárias, dano adicional e saves
estruturados do bestiário SRD 5.2.1 no motor de combate.
"""
import json
import re
from pathlib import Path
from unittest import mock

from django.core.cache import cache
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from api import combat as engine
from api.models import Campaign
from api.tests.test_combat import make_user

ROOT = Path(__file__).resolve().parents[3]
CATALOG = ROOT / 'frontend' / 'data' / 'monsters-srd521.js'

BREATH = {
    'name': {'pt': 'Sopro de Fogo', 'en': 'Fire Breath'}, 'type': 'save', 'kind': 'action',
    'save': {'ability': 'DEX', 'dc': 21, 'halfOnSave': True, 'area': True},
    'damage': '17d6', 'damageType': 'fire', 'recharge': 5,
}
REND = {
    'name': {'pt': 'Dilacerar', 'en': 'Rend'}, 'type': 'melee', 'kind': 'action', 'atk': 14,
    'damage': '1d10+8', 'damageType': 'slashing', 'extraDamage': [{'damage': '2d4', 'damageType': 'fire'}],
}
DOMINATE = {
    'name': {'en': 'Dominate'}, 'type': 'save', 'kind': 'action', 'uses': 2, 'usesPer': 'day',
    'save': {'ability': 'WIS', 'dc': 16, 'halfOnSave': False, 'conditions': ['charmed']},
}
POUNCE = {'name': {'en': 'Pounce'}, 'type': 'special', 'kind': 'legendary', 'cost': 1}
BIG = {'name': {'en': 'Big'}, 'type': 'special', 'kind': 'legendary', 'cost': 2}


def dragon(**extra):
    c = {
        'id': 'd', 'name': 'Dragão', 'type': 'monster', 'current_hp': 256, 'temp_hp': 0,
        'stats': {'ac': 19, 'max_hp': 256, 'abilities': {'dex': 10}, 'saves': {},
                  'actions': [REND, BREATH, DOMINATE, POUNCE, BIG],
                  'legendary': {'uses': 3, 'lairUses': 4},
                  'legendary_resistance': {'uses': 3, 'lairUses': 4}},
    }
    c.update(extra)
    return engine.init_resources(c)


def target(tid='t', hp=100, **stats):
    return {'id': tid, 'name': tid, 'type': 'monster', 'current_hp': hp, 'temp_hp': 0,
            'stats': {'ac': 10, 'max_hp': hp, 'abilities': {'dex': 10, 'wis': 10}, 'saves': {}, **stats}}


class ResourceEngineTests(SimpleTestCase):
    def test_init_resources(self):
        d = dragon()
        self.assertEqual(d['action_state'], {'1': {'charged': True}, '2': {'uses_left': 2}})
        self.assertEqual(d['legendary'], {'max': 3, 'remaining': 3, 'lair_max': 4})
        self.assertEqual(d['legendary_resistance']['remaining'], 3)
        # idempotente
        self.assertEqual(engine.init_resources(d), d)

    def test_recharge_spent_then_rolled_at_start_of_turn(self):
        d = engine.consume_action(dragon(), 1)
        self.assertEqual(engine.action_availability(d, 1), (False, 'recharging'))
        low = engine.start_turn(d, roll=lambda: 4)
        self.assertFalse(low['combatant']['action_state']['1']['charged'])
        self.assertEqual(low['recharge_rolls'][0]['need'], 5)
        self.assertFalse(low['recharge_rolls'][0]['recharged'])
        high = engine.start_turn(low['combatant'], roll=lambda: 5)
        self.assertTrue(high['combatant']['action_state']['1']['charged'])
        self.assertEqual(engine.action_availability(high['combatant'], 1), (True, None))

    def test_charged_actions_do_not_roll(self):
        rolls = []
        r = engine.start_turn(dragon(), roll=lambda: rolls.append(1) or 6)
        self.assertEqual(r['recharge_rolls'], [])
        self.assertEqual(rolls, [])

    def test_uses_per_day(self):
        d = engine.consume_action(engine.consume_action(dragon(), 2), 2)
        self.assertEqual(d['action_state']['2']['uses_left'], 0)
        self.assertEqual(engine.action_availability(d, 2), (False, 'no_uses_left'))
        # início de turno não devolve usos diários
        d = engine.start_turn(d, roll=lambda: 6)['combatant']
        self.assertEqual(d['action_state']['2']['uses_left'], 0)

    def test_legendary_cost_and_reset(self):
        d = engine.consume_action(dragon(), 4)  # custo 2
        self.assertEqual(d['legendary']['remaining'], 1)
        self.assertEqual(engine.action_availability(d, 4), (False, 'no_legendary_actions'))
        self.assertEqual(engine.action_availability(d, 3), (True, None))
        d = engine.consume_action(d, 3)
        self.assertEqual(d['legendary']['remaining'], 0)
        r = engine.start_turn(d)
        self.assertTrue(r['legendary_reset'])
        self.assertEqual(r['combatant']['legendary']['remaining'], 3)

    def test_lair_gives_extra_uses(self):
        d = engine.set_resources(dragon(), {'inLair': True})
        self.assertEqual(d['legendary']['remaining'], 4)
        self.assertEqual(d['legendary_resistance']['remaining'], 4)
        self.assertEqual(engine.start_turn(engine.consume_action(d, 3))['combatant']['legendary']['remaining'], 4)
        d = engine.set_resources(d, {'inLair': False})
        self.assertEqual(d['legendary']['remaining'], 3)

    def test_manual_adjustments(self):
        d = engine.consume_action(dragon(), 1)
        d = engine.set_resources(d, {'actionIndex': 1, 'charged': True})
        self.assertTrue(d['action_state']['1']['charged'])
        d = engine.set_resources(d, {'actionIndex': 2, 'usesLeft': 99})
        self.assertEqual(d['action_state']['2']['uses_left'], 2)
        d = engine.set_resources(d, {'legendaryResistanceRemaining': 1, 'legendaryRemaining': -3})
        self.assertEqual(d['legendary_resistance']['remaining'], 1)
        self.assertEqual(d['legendary']['remaining'], 0)
        d = engine.set_resources(engine.consume_action(d, 2), {'restoreAll': True})
        self.assertEqual(d['action_state']['2']['uses_left'], 2)
        self.assertEqual(d['legendary']['remaining'], 3)
        self.assertEqual(d['legendary_resistance']['remaining'], 3)

    def test_legacy_combatant_without_state_is_migrated(self):
        old = {'id': 'x', 'type': 'monster', 'stats': {'actions': [BREATH]}}
        self.assertEqual(engine.action_availability(old, 0), (True, None))
        self.assertFalse(engine.consume_action(old, 0)['action_state']['0']['charged'])


class DamageAndSaveTests(SimpleTestCase):
    def test_fixed_damage(self):
        self.assertEqual(engine.roll_dice('1')['total'], 1)
        self.assertEqual(engine.roll_dice('0')['total'], 0)

    def test_extra_damage_rolled_and_doubled_on_crit(self):
        r = engine.resolve_attack(dragon(), target(), REND, forced_d20=20)
        self.assertTrue(r['crit'])
        self.assertEqual(len(r['damage']['rolls']), 2)
        self.assertEqual(len(r['extra_damage'][0]['rolls']), 4)
        self.assertEqual(r['extra_damage'][0]['type'], 'fire')
        parts = engine.attack_damage_parts(r)
        self.assertEqual([p['type'] for p in parts], ['slashing', 'fire'])

    def test_extra_damage_respects_its_own_immunity(self):
        t = target(damage_immunities=['fire'])
        r = engine.resolve_attack(dragon(), t, REND, forced_d20=19)
        applied = engine.apply_damage_parts(t, engine.attack_damage_parts(r))
        self.assertEqual(applied['damage_taken'], r['damage']['total'])
        self.assertEqual(applied['note'], 'immune')

    def test_miss_has_no_parts(self):
        r = engine.resolve_attack(dragon(), target(), REND, forced_d20=1)
        self.assertEqual(engine.attack_damage_parts(r), [])

    def test_save_conditions_applied_on_failure_only(self):
        a, b = target('a'), target('b', condition_immunities=['charmed'])
        res = engine.resolve_save_effect(DOMINATE, [a, b], forced_d20s={'a': 1, 'b': 1})
        cs, changed = engine.apply_save_results([a, b], res)
        self.assertEqual(engine.find_combatant(cs, 'a')['conditions'], ['charmed'])
        self.assertNotIn('charmed', engine.find_combatant(cs, 'b').get('conditions') or [])
        self.assertEqual(res['per_target'][1]['conditions_applied'], [])
        ok = engine.resolve_save_effect(DOMINATE, [target('c')], forced_d20s={'c': 20})
        self.assertEqual(ok['per_target'][0]['conditions'], [])

    def test_save_half_damage_with_extra(self):
        action = {**BREATH, 'save': {**BREATH['save'], 'dc': 15}, 'damage': '10', 'extraDamage': [{'damage': '4', 'damageType': 'cold'}]}
        t_fail, t_ok = target('f'), target('s')
        res = engine.resolve_save_effect(action, [t_fail, t_ok], forced_d20s={'f': 1, 's': 20})
        fail, ok = res['per_target']
        self.assertEqual(fail['damage_taken'], 14)
        self.assertEqual(ok['damage_parts'], [{'amount': 5, 'type': 'fire'}, {'amount': 2, 'type': 'cold'}])
        cs, _ = engine.apply_save_results([t_fail, t_ok], res)
        self.assertEqual(engine.find_combatant(cs, 'f')['current_hp'], 86)
        self.assertEqual(engine.find_combatant(cs, 's')['current_hp'], 93)


class GeneratedCatalogTests(SimpleTestCase):
    """O bestiário gerado (frontend/data/monsters-srd521.js) só usa o que o motor entende."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        lines = CATALOG.read_text(encoding='utf-8').splitlines()
        cls.monsters = [json.loads(l.strip().rstrip(',')) for l in lines if l.startswith('  {')]

    def _all_actions(self, m):
        return [*m['actions'], *m.get('bonusActions', []), *m.get('reactions', []),
                *(m.get('legendary') or {}).get('actions', [])]

    def test_count_and_cr_range(self):
        self.assertEqual(len(self.monsters), 331)
        crs = [m['crNum'] for m in self.monsters]
        self.assertEqual((min(crs), max(crs)), (0, 30))

    def test_every_damage_expression_is_rollable(self):
        dice = re.compile(r'^(\d+d\d+([+-]\d+)?|\d+)$')
        for m in self.monsters:
            for a in self._all_actions(m):
                for expr in [a.get('damage'), *[e['damage'] for e in a.get('extraDamage', [])]]:
                    if expr is None:
                        continue
                    self.assertRegex(expr, dice, f"{m['id']}: {a['name']['en']}")
                    if 'd' in expr:
                        self.assertNotEqual(engine.parse_dice(expr), (0, 0, 0), expr)

    def test_saves_and_limits_are_structured(self):
        for m in self.monsters:
            for a in self._all_actions(m):
                if a['type'] == 'save':
                    self.assertIn(a['save']['ability'], {'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'})
                    self.assertIsInstance(a['save']['dc'], int)
                    for c in a['save'].get('conditions', []):
                        self.assertIn(c, engine.ALL_CONDITIONS)
                if 'recharge' in a:
                    self.assertIn(a['recharge'], (4, 5, 6))


class CombatResourceEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'Player')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.url = f'/api/combat/campaign/{self.camp.id}'
        self.c_dm.post(f'{self.url}/start')
        r = self.c_dm.post(f'{self.url}/combatants', {'type': 'monster', 'initiative': 20, 'monster': {
            'id': 'adult-red-dragon', 'name': {'pt': 'Dragão Vermelho Adulto', 'en': 'Adult Red Dragon'},
            'ac': 19, 'hp': 256, 'cr': '17', 'xp': 18000, 'abilities': {'dex': 10},
            'actions': [REND, BREATH, DOMINATE, POUNCE, BIG],
            'legendary': {'uses': 3, 'lairUses': 4}, 'legendaryResistance': {'uses': 3, 'lairUses': 4},
        }}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.c_dm.post(f'{self.url}/combatants', {'type': 'monster', 'initiative': 5, 'monster': {
            'id': 'goblin-warrior', 'name': 'Goblin', 'ac': 15, 'hp': 10, 'abilities': {'dex': 14},
            'actions': [],
        }}, format='json')
        cs = self._combat()['combatants']
        self.drg = next(c for c in cs if c['monster_id'] == 'adult-red-dragon')
        self.gob = next(c for c in cs if c['monster_id'] == 'goblin-warrior')

    def _combat(self):
        return self.c_dm.get(self.url).json()['combat']

    def _act(self, client=None, **body):
        return (client or self.c_dm).post(f'{self.url}/action', body, format='json')

    def _me(self, cid):
        return next(c for c in self._combat()['combatants'] if c['id'] == cid)

    def test_add_snapshot_initializes_resources(self):
        self.assertEqual(self.drg['name'], 'Dragão Vermelho Adulto')
        self.assertEqual(self.drg['stats']['cr'], '17')
        self.assertEqual(self.drg['legendary']['remaining'], 3)
        self.assertEqual(self.drg['legendary_resistance']['max'], 3)
        self.assertTrue(self.drg['action_state']['1']['charged'])

    def test_breath_recharge_cycle(self):
        r = self._act(action='save_aoe', attackerId=self.drg['id'], actionIndex=1, targetIds=[self.gob['id']])
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(self._me(self.drg['id'])['action_state']['1']['charged'])
        r = self._act(action='save_aoe', attackerId=self.drg['id'], actionIndex=1, targetIds=[self.gob['id']])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'recharging')
        # mestre pode forçar
        r = self._act(action='save_aoe', attackerId=self.drg['id'], actionIndex=1,
                      targetIds=[self.gob['id']], force=True)
        self.assertEqual(r.status_code, 200)
        # volta ao turno do dragão: rola recarga
        self.c_dm.post(f'{self.url}/next-turn')  # goblin
        with mock.patch('api.combat.roll_die', return_value=6):
            r = self.c_dm.post(f'{self.url}/next-turn')  # dragão (nova rodada)
        combat = r.json()['combat']
        drg = next(c for c in combat['combatants'] if c['id'] == self.drg['id'])
        self.assertTrue(drg['action_state']['1']['charged'])
        rec = [e for e in combat['log'] if e['type'] == 'recharge']
        self.assertEqual(rec[-1]['rolls'][0]['roll'], 6)

    def test_failed_recharge_roll_keeps_unavailable(self):
        self._act(action='save_aoe', attackerId=self.drg['id'], actionIndex=1, targetIds=[self.gob['id']])
        self.c_dm.post(f'{self.url}/next-turn')
        with mock.patch('api.combat.roll_die', return_value=4):
            self.c_dm.post(f'{self.url}/next-turn')
        self.assertFalse(self._me(self.drg['id'])['action_state']['1']['charged'])

    def test_legendary_actions_out_of_turn_and_reset(self):
        self.c_dm.post(f'{self.url}/next-turn')  # vez do goblin
        r = self._act(action='use_action', attackerId=self.drg['id'], actionIndex=4)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['result']['legendary']['remaining'], 1)
        r = self._act(action='use_action', attackerId=self.drg['id'], actionIndex=4)
        self.assertEqual(r.json()['error'], 'no_legendary_actions')
        self._act(action='use_action', attackerId=self.drg['id'], actionIndex=3)
        self.assertEqual(self._me(self.drg['id'])['legendary']['remaining'], 0)
        self.c_dm.post(f'{self.url}/next-turn')  # dragão
        self.assertEqual(self._me(self.drg['id'])['legendary']['remaining'], 3)

    def test_attack_with_extra_damage_applies_both_types(self):
        r = self._act(action='attack', attackerId=self.drg['id'], targetId=self.gob['id'], actionIndex=0)
        self.assertEqual(r.status_code, 200, r.content)
        res = r.json()['result']
        if res['hit']:
            self.assertEqual(res['extra_damage'][0]['type'], 'fire')

    def test_uses_per_day_counter(self):
        for _ in range(2):
            r = self._act(action='save_aoe', attackerId=self.drg['id'], actionIndex=2, targetIds=[self.gob['id']])
            self.assertEqual(r.status_code, 200, r.content)
        r = self._act(action='save_aoe', attackerId=self.drg['id'], actionIndex=2, targetIds=[self.gob['id']])
        self.assertEqual(r.json()['error'], 'no_uses_left')

    def test_set_resources_and_lair(self):
        r = self._act(action='set_resources', targetId=self.drg['id'], inLair=True)
        self.assertEqual(r.status_code, 200, r.content)
        me = self._me(self.drg['id'])
        self.assertTrue(me['in_lair'])
        self.assertEqual(me['legendary']['remaining'], 4)
        self._act(action='set_resources', targetId=self.drg['id'], legendaryResistanceRemaining=2)
        self.assertEqual(self._me(self.drg['id'])['legendary_resistance']['remaining'], 2)

    def test_save_aoe_requires_targets(self):
        r = self._act(action='save_aoe', attackerId=self.drg['id'], actionIndex=1, targetIds=[])
        self.assertEqual(r.status_code, 400)
        # não gastou a recarga
        self.assertTrue(self._me(self.drg['id'])['action_state']['1']['charged'])

    def test_player_cannot_use_monster_resources(self):
        r = self._act(self.c_p, action='use_action', attackerId=self.drg['id'], actionIndex=3)
        self.assertEqual(r.status_code, 403)
