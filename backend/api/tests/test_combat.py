"""
Testes do engine de combate + endpoints REST de combat + RollRequest.

Cobre: ataque, crítico dobra dano, save aplica metade, dano respeita
resistência/imunidade/vulnerabilidade, HP zero marca defeated/unconscious,
condições aplicadas/expiram, death saves, RollRequest workflow.
"""
from django.test import TestCase, SimpleTestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership, CombatInstance, RollRequest, DiceRig
from api import combat as engine

User = get_user_model()


def make_user(email, name='User', password='senha-forte-2026'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password=password)
    Profile.objects.create(user=u, display_name=name)
    return u


# ============================================================
# Engine puro (sem DB)
# ============================================================
class DiceTests(SimpleTestCase):
    def test_parse_dice(self):
        self.assertEqual(engine.parse_dice('1d6+2'), (1, 6, 2))
        self.assertEqual(engine.parse_dice('2d8'), (2, 8, 0))
        self.assertEqual(engine.parse_dice('3d10-1'), (3, 10, -1))
        self.assertEqual(engine.parse_dice('bad'), (0, 0, 0))

    def test_roll_dice_normal(self):
        for _ in range(20):
            r = engine.roll_dice('2d6+3')
            self.assertEqual(len(r['rolls']), 2)
            self.assertGreaterEqual(r['total'], 5)   # 1+1+3
            self.assertLessEqual(r['total'], 15)     # 6+6+3

    def test_roll_dice_double_for_crit(self):
        for _ in range(20):
            r = engine.roll_dice('1d4', double_dice=True)
            self.assertEqual(len(r['rolls']), 2)  # 1d4 dobra para 2d4

    def test_roll_d20_forced(self):
        r = engine.roll_d20(forced=15)
        self.assertEqual(r['value'], 15)
        self.assertTrue(r.get('forced'))


class AttackTests(SimpleTestCase):
    def _setup(self):
        attacker = {
            'name': 'Goblin',
            'stats': {
                'actions': [{'name': 'Scimitar', 'type': 'melee', 'atk': 4, 'damage': '1d6+2', 'damageType': 'slashing'}]
            },
        }
        target = {'name': 'Thalion', 'stats': {'ac': 15, 'max_hp': 20}, 'current_hp': 20, 'temp_hp': 0, 'type': 'pc'}
        return attacker, target

    def test_natural_one_always_miss(self):
        att, tgt = self._setup()
        r = engine.resolve_attack(att, tgt, att['stats']['actions'][0], forced_d20=1)
        self.assertFalse(r['hit'])
        self.assertTrue(r['natural_one'])

    def test_natural_twenty_always_crit(self):
        att, tgt = self._setup()
        r = engine.resolve_attack(att, tgt, att['stats']['actions'][0], forced_d20=20)
        self.assertTrue(r['hit'])
        self.assertTrue(r['crit'])
        # Crítico dobra dados: 2d6+2 → entre 4 e 14
        self.assertGreaterEqual(r['damage']['total'], 4)
        self.assertLessEqual(r['damage']['total'], 14)
        self.assertEqual(len(r['damage']['rolls']), 2)

    def test_hit_above_ac(self):
        att, tgt = self._setup()
        r = engine.resolve_attack(att, tgt, att['stats']['actions'][0], forced_d20=15)
        # 15 + 4 = 19 vs CA 15 = acerta
        self.assertTrue(r['hit'])
        self.assertFalse(r['crit'])

    def test_miss_below_ac(self):
        att, tgt = self._setup()
        r = engine.resolve_attack(att, tgt, att['stats']['actions'][0], forced_d20=10)
        # 10 + 4 = 14 vs CA 15 = erra
        self.assertFalse(r['hit'])


class DamageTests(SimpleTestCase):
    def test_apply_basic_damage(self):
        c = {'current_hp': 20, 'temp_hp': 0, 'stats': {'max_hp': 20}, 'type': 'pc'}
        r = engine.apply_damage(c, 8, 'slashing')
        self.assertEqual(r['combatant']['current_hp'], 12)

    def test_resistance_halves(self):
        c = {'current_hp': 20, 'temp_hp': 0, 'stats': {'max_hp': 20, 'damage_resistances': ['fire']}, 'type': 'monster'}
        r = engine.apply_damage(c, 10, 'fire')
        self.assertEqual(r['combatant']['current_hp'], 15)

    def test_immunity_zero(self):
        c = {'current_hp': 20, 'temp_hp': 0, 'stats': {'max_hp': 20, 'damage_immunities': ['poison']}, 'type': 'monster'}
        r = engine.apply_damage(c, 10, 'poison')
        self.assertEqual(r['combatant']['current_hp'], 20)

    def test_vulnerability_doubles(self):
        c = {'current_hp': 20, 'temp_hp': 0, 'stats': {'max_hp': 20, 'damage_vulnerabilities': ['cold']}, 'type': 'monster'}
        r = engine.apply_damage(c, 5, 'cold')
        self.assertEqual(r['combatant']['current_hp'], 10)

    def test_temp_hp_absorbed_first(self):
        c = {'current_hp': 20, 'temp_hp': 5, 'stats': {'max_hp': 20}, 'type': 'pc'}
        r = engine.apply_damage(c, 8, 'slashing')
        self.assertEqual(r['combatant']['temp_hp'], 0)
        self.assertEqual(r['combatant']['current_hp'], 17)  # absorveu 5, sobraram 3

    def test_pc_zero_hp_marks_unconscious(self):
        c = {'current_hp': 5, 'temp_hp': 0, 'stats': {'max_hp': 20}, 'type': 'pc', 'conditions': []}
        r = engine.apply_damage(c, 10, 'slashing')
        self.assertEqual(r['combatant']['current_hp'], 0)
        self.assertIn('unconscious', r['combatant']['conditions'])
        self.assertEqual(r['combatant']['death_saves'], {'success': 0, 'fail': 0})

    def test_monster_zero_hp_marks_defeated(self):
        c = {'current_hp': 5, 'temp_hp': 0, 'stats': {'max_hp': 20}, 'type': 'monster'}
        r = engine.apply_damage(c, 10, 'slashing')
        self.assertTrue(r['combatant']['defeated'])

    def test_healing_revives_unconscious(self):
        c = {'current_hp': 0, 'temp_hp': 0, 'stats': {'max_hp': 20}, 'type': 'pc',
             'conditions': ['unconscious'], 'death_saves': {'success': 1, 'fail': 0}}
        r = engine.apply_healing(c, 5)
        self.assertEqual(r['combatant']['current_hp'], 5)
        self.assertNotIn('unconscious', r['combatant']['conditions'])
        self.assertEqual(r['combatant']['death_saves'], {'success': 0, 'fail': 0})


class SaveTests(SimpleTestCase):
    def test_save_with_modifier(self):
        c = {'stats': {'abilities': {'dex': 14}, 'saves': {'dex': 5}}}
        r = engine.resolve_save(c, 'DEX', 12, forced_d20=10)
        # forced 10 + save mod 5 = 15 >= 12
        self.assertTrue(r['success'])

    def test_save_aoe_fireball_like(self):
        att = {'name': 'Wizard'}
        targets = [
            {'id': 't1', 'name': 'A', 'stats': {'ac': 10, 'max_hp': 50, 'abilities': {'dex': 10}, 'saves': {}}, 'current_hp': 50, 'temp_hp': 0, 'type': 'monster'},
            {'id': 't2', 'name': 'B', 'stats': {'ac': 10, 'max_hp': 50, 'abilities': {'dex': 14}, 'saves': {'dex': 6}}, 'current_hp': 50, 'temp_hp': 0, 'type': 'monster'},
        ]
        action = {
            'name': 'Fireball', 'type': 'special',
            'save': {'ability': 'DEX', 'dc': 15, 'halfOnSave': True},
            'damage': '8d6', 'damageType': 'fire',
        }
        # Força save d20 = 20 pra B (passa), 1 pra A (falha)
        result = engine.resolve_save_effect(action, targets, forced_d20s={'t1': 1, 't2': 20})
        per_t = {x['target_id']: x for x in result['per_target']}
        # A falhou: dano total. B passou: metade.
        self.assertFalse(per_t['t1']['save']['success'])
        self.assertTrue(per_t['t2']['save']['success'])
        self.assertEqual(per_t['t2']['damage_taken'], per_t['t1']['damage_taken'] // 2)


class ConditionTests(SimpleTestCase):
    def test_add_condition(self):
        c = {'conditions': [], 'stats': {}}
        r = engine.add_condition(c, 'poisoned')
        self.assertTrue(r['applied'])
        self.assertIn('poisoned', r['combatant']['conditions'])

    def test_condition_immunity_blocks(self):
        c = {'conditions': [], 'stats': {'condition_immunities': ['poisoned']}}
        r = engine.add_condition(c, 'poisoned')
        self.assertFalse(r['applied'])
        self.assertNotIn('poisoned', r['combatant']['conditions'])

    def test_condition_with_duration_expires(self):
        c = {'conditions': [], 'effects': [], 'stats': {}}
        c = engine.add_condition(c, 'poisoned', rounds=2)['combatant']
        # Tick 1 → ainda 1 rodada
        c = engine.tick_effects(c)['combatant']
        self.assertIn('poisoned', c['conditions'])
        # Tick 2 → expira
        r = engine.tick_effects(c)
        self.assertIn('poisoned', r['expired'])
        self.assertNotIn('poisoned', r['combatant']['conditions'])


class DeathSaveTests(SimpleTestCase):
    def _down(self):
        return {'type': 'pc', 'current_hp': 0, 'conditions': ['unconscious'],
                'death_saves': {'success': 0, 'fail': 0}, 'stats': {'max_hp': 20}}

    def test_nat_20_revives_at_1hp(self):
        c = self._down()
        r = engine.death_save(c, forced_d20=20)
        self.assertEqual(r['combatant']['current_hp'], 1)
        self.assertNotIn('unconscious', r['combatant']['conditions'])

    def test_nat_1_counts_as_two_fails(self):
        c = self._down()
        r = engine.death_save(c, forced_d20=1)
        self.assertEqual(r['combatant']['death_saves']['fail'], 2)

    def test_three_successes_stabilize(self):
        c = self._down()
        c = engine.death_save(c, forced_d20=15)['combatant']
        c = engine.death_save(c, forced_d20=15)['combatant']
        r = engine.death_save(c, forced_d20=15)
        self.assertEqual(r['note'], 'stabilized')

    def test_three_fails_dead(self):
        c = self._down()
        c = engine.death_save(c, forced_d20=5)['combatant']
        c = engine.death_save(c, forced_d20=5)['combatant']
        r = engine.death_save(c, forced_d20=5)
        self.assertTrue(r['combatant']['defeated'])


# ============================================================
# Endpoints REST
# ============================================================
class CombatEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'Player')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.char = Character.objects.create(owner=self.player, name='Thal',
            data={'level': 1, 'maxHp': 15, 'currentHp': 15, 'abilities': {'dex': 14}})
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char, role='player')

    def test_start_combat_creates_instance(self):
        r = self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/start')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['combat']['active'])

    def test_player_cannot_start(self):
        r = self.c_p.post(f'/api/combat/campaign/{self.camp.id}/start')
        self.assertEqual(r.status_code, 403)

    def test_add_pc_and_attack(self):
        self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/start')
        # add PC
        r = self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/combatants',
            {'type': 'pc', 'characterId': self.char.id, 'initiative': 17}, format='json')
        self.assertEqual(r.status_code, 200)
        # add monstro goblin
        r = self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/combatants',
            {'type': 'monster', 'monster': {
                'id': 'goblin', 'name': 'Goblin', 'ac': 15, 'hp': 7,
                'abilities': {'str': 8, 'dex': 14},
                'actions': [{'name': 'Scimitar', 'type': 'melee', 'atk': 4,
                             'damage': '1d6+2', 'damageType': 'slashing'}],
            }, 'initiative': 12}, format='json')
        cs = r.json()['combat']['combatants']
        thal = next(c for c in cs if c['type'] == 'pc')
        gob = next(c for c in cs if c['type'] == 'monster')

        # damage manual no Thalion deve sincronizar com Character.data
        r = self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/action',
            {'action': 'damage', 'targetId': thal['id'], 'amount': 5, 'damageType': 'slashing'},
            format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['currentHp'], 10)

    def test_player_cannot_act(self):
        self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/start')
        r = self.c_p.post(f'/api/combat/campaign/{self.camp.id}/action',
            {'action': 'damage', 'targetId': 'x', 'amount': 5}, format='json')
        self.assertEqual(r.status_code, 403)


class RollRequestEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'P')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=self.camp, user=self.player, role='player')

    def test_player_creates_and_dm_resolves_public(self):
        r = self.c_p.post(f'/api/rolls/campaign/{self.camp.id}',
            {'label': 'Perception', 'diceType': 'd20', 'modifier': 3}, format='json')
        self.assertEqual(r.status_code, 200)
        roll_id = r.json()['roll']['id']

        r = self.c_dm.post(f'/api/rolls/{roll_id}/resolve', {'visibility': 'public'}, format='json')
        self.assertEqual(r.status_code, 200)
        body = r.json()['roll']
        self.assertEqual(body['status'], 'public')
        self.assertIsNotNone(body['total'])
        self.assertGreaterEqual(body['total'], 4)   # min 1 + 3
        self.assertLessEqual(body['total'], 23)     # max 20 + 3

    def test_player_cannot_resolve_own_roll(self):
        rr = RollRequest.objects.create(campaign=self.camp, requested_by=self.player, dice_type='d20')
        r = self.c_p.post(f'/api/rolls/{rr.id}/resolve', {'visibility': 'public'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_resolve_consumes_dice_rig(self):
        # DM cria rig de d20 valor 18 pro player
        DiceRig.objects.create(campaign=self.camp, target_user=self.player,
                                dice_type='d20', values=[{'value': 18, 'consumed': False}])
        r = self.c_p.post(f'/api/rolls/campaign/{self.camp.id}',
            {'label': 'rig test', 'diceType': 'd20', 'modifier': 2}, format='json')
        roll_id = r.json()['roll']['id']

        r = self.c_dm.post(f'/api/rolls/{roll_id}/resolve', {'visibility': 'private'}, format='json')
        body = r.json()['roll']
        self.assertEqual(body['total'], 20)  # 18 + 2
        self.assertTrue(body['rigged'])

    def test_screen_exposes_public_rolls_only(self):
        rr = RollRequest.objects.create(campaign=self.camp, requested_by=self.player,
                                         dice_type='d20', status='public', total=15,
                                         rolls=[{'value': 15, 'kept': True}], modifier=0)
        rr_priv = RollRequest.objects.create(campaign=self.camp, requested_by=self.player,
                                              dice_type='d20', status='private', total=8)
        c = APIClient()  # anônimo
        r = c.get(f'/api/screen/{self.camp.screen_token}')
        self.assertEqual(r.status_code, 200)
        rolls = r.json()['campaign']['publicRolls']
        ids = [x['id'] for x in rolls]
        self.assertIn(rr.id, ids)
        self.assertNotIn(rr_priv.id, ids)

    def test_critical_detected(self):
        DiceRig.objects.create(campaign=self.camp, target_user=self.player,
                                dice_type='d20', values=[{'value': 20, 'consumed': False}])
        r = self.c_p.post(f'/api/rolls/campaign/{self.camp.id}',
            {'label': 'crit', 'diceType': 'd20'}, format='json')
        rid = r.json()['roll']['id']
        r = self.c_dm.post(f'/api/rolls/{rid}/resolve', {'visibility': 'public'}, format='json')
        self.assertTrue(r.json()['roll']['isCritical'])
