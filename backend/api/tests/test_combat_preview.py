"""
WP2 · Combate sugerido: prévia de ataque que não aplica nada, aplicação de
valores digitados (dado físico), mapa validado e narração do combate na Crônica.
"""
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.diary import combat_summary, combat_narration_pt
from api.models import Campaign, CombatInstance, DiaryEntry, DiceRig, Membership, Profile

User = get_user_model()


def make_user(email, name='User'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


def goblin(cid='g1', hp=7, **extra):
    return {'id': cid, 'type': 'monster', 'name': f'Goblin #{cid[-1]}', 'initiative': 12, 'current_hp': hp,
            'conditions': [], 'effects': [], 'temp_hp': 0, 'defeated': False,
            'stats': {'ac': 12, 'max_hp': 7, 'abilities': {}, 'saves': {},
                      'actions': [{'name': 'Cimitarra', 'atk': 4, 'damage': '1d6+2', 'damageType': 'slashing'}],
                      **extra}}


def hero(cid='h1', name='Thalion', hp=20):
    return {'id': cid, 'type': 'pc', 'name': name, 'initiative': 15, 'current_hp': hp, 'conditions': [],
            'effects': [], 'temp_hp': 0, 'defeated': False,
            'stats': {'ac': 14, 'max_hp': 20, 'abilities': {}, 'saves': {},
                      'actions': [{'name': 'Espada', 'atk': 5, 'damage': '1d8+3', 'damageType': 'slashing'}]}}


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p1 = APIClient(); self.c_p1.force_login(self.p1)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        Membership.objects.create(campaign=self.camp, user=self.p1, role='player')
        self.combat = CombatInstance.objects.create(campaign=self.camp, active=True,
                                                    combatants=[hero(), goblin('g1'), goblin('g2')])

    def url(self, tail):
        return f'/api/combat/campaign/{self.camp.id}/{tail}'

    def hp(self, cid):
        self.combat.refresh_from_db()
        return next(c for c in self.combat.combatants if c['id'] == cid)['current_hp']


class PreviewTests(Base):
    def preview(self, **body):
        return self.c_dm.post(self.url('attack-preview'),
                              {'attackerId': 'h1', 'targetId': 'g1', 'actionIndex': 0, **body}, format='json')

    def test_preview_does_not_change_hp(self):
        # (c) a prévia não muda o PV (nem o log).
        for _ in range(10):
            r = self.preview()
            self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.hp('g1'), 7)
        self.combat.refresh_from_db()
        self.assertEqual(self.combat.action_log, [])

    def test_preview_shape_and_typed_roll(self):
        p = self.preview(attackRoll=11).json()
        for k in ('attackRoll', 'total', 'targetAC', 'hit', 'crit', 'damage', 'damageTotal'):
            self.assertIn(k, p)
        self.assertEqual((p['attackRoll'], p['total'], p['targetAC']), (11, 16, 12))
        self.assertTrue(p['hit'])
        self.assertFalse(p['crit'])
        self.assertEqual(p['damage'][0]['dice'], '1d8+3')
        self.assertEqual(p['damage'][0]['type'], 'slashing')
        self.assertTrue(4 <= p['damageTotal'] <= 11)
        self.assertEqual(p['newHp'], max(0, 7 - p['effectiveDamage']))
        crit = self.preview(attackRoll=20).json()
        self.assertTrue(crit['crit'])
        self.assertEqual(crit['damage'][0]['dice'], '2d8+3')
        miss = self.preview(attackRoll=1).json()
        self.assertFalse(miss['hit'])
        self.assertEqual(miss['effectiveDamage'], 0)

    def test_preview_peeks_rig_without_consuming(self):
        DiceRig.objects.create(campaign=self.camp, target_user=self.dm, dice_type='d20', values=[{'value': 17}])
        p = self.preview().json()
        self.assertEqual(p['attackRoll'], 17)
        self.assertTrue(p['rigged'])
        rig = DiceRig.objects.get(campaign=self.camp)
        self.assertFalse(rig.values[0].get('consumed'))

    def test_preview_only_dm_and_errors(self):
        self.assertEqual(self.c_p1.post(self.url('attack-preview'), {'attackerId': 'h1', 'targetId': 'g1'},
                                        format='json').status_code, 403)
        self.assertEqual(self.preview(targetId='nope').status_code, 404)
        self.assertEqual(self.preview(actionIndex=9).status_code, 400)
        self.assertEqual(self.preview(attackRoll=21).status_code, 400)

    def test_preview_reports_unavailable_without_consuming(self):
        g = goblin('g3')
        g['stats']['actions'][0]['recharge'] = '5-6'
        g['action_state'] = {'0': {'charged': False}}
        self.combat.combatants = self.combat.combatants + [g]
        self.combat.save()
        r = self.c_dm.post(self.url('attack-preview'), {'attackerId': 'g3', 'targetId': 'h1', 'actionIndex': 0},
                           format='json').json()
        self.assertIn('available', r)


class ApplyTypedTests(Base):
    def attack(self, **body):
        return self.c_dm.post(self.url('action'), {'action': 'attack', 'attackerId': 'h1', 'targetId': 'g1',
                                                   'actionIndex': 0, **body}, format='json')

    def test_apply_exact_typed_values(self):
        # WP6 (b): d20 = 18 e dano = 7 aplicam exatamente esses valores.
        r = self.attack(attackRoll=18, damage=7)
        self.assertEqual(r.status_code, 200, r.content)
        res = r.json()['result']
        self.assertEqual(res['attack_total'], 23)
        self.assertTrue(res['hit'])
        self.assertEqual(res['damage']['total'], 7)
        self.assertEqual(self.hp('g1'), 0)
        log = self.combat.action_log[-1]
        self.assertTrue(log['manual'])
        self.assertEqual(log['damage_taken'], 7)
        self.assertEqual(log['downed'], 'Goblin #1')

    def test_typed_miss_applies_nothing_and_hit_override(self):
        self.attack(attackRoll=2, damage=5)
        self.assertEqual(self.hp('g1'), 7)
        self.attack(attackRoll=2, damage=5, hit=True)   # mestre decide que acertou
        self.assertEqual(self.hp('g1'), 2)

    def test_damage_parts_and_resistance(self):
        self.combat.combatants = [hero(), goblin('g1', damage_resistances=['fire'])]
        self.combat.save()
        r = self.attack(attackRoll=15, damage=[{'amount': 4, 'type': 'slashing'}, {'amount': 4, 'type': 'fire'}])
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.hp('g1'), 1)   # 4 + 4/2

    def test_invalid_typed_values(self):
        self.assertEqual(self.attack(attackRoll=0).status_code, 400)
        self.assertEqual(self.attack(attackRoll=10, damage=-1).status_code, 400)
        self.assertEqual(self.attack(attackRoll=10, damage='muito').status_code, 400)
        self.assertEqual(self.hp('g1'), 7)

    def test_without_values_still_rolls(self):
        with mock.patch('api.combat.roll_die', return_value=6):
            r = self.attack()
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()['result']['hit'])   # d20=6 → 6+5=11 vs CA 12 → erra
        self.assertEqual(self.hp('g1'), 7)

    def test_consume_rig_only_when_asked(self):
        DiceRig.objects.create(campaign=self.camp, target_user=self.dm, dice_type='d20', values=[{'value': 17}])
        self.attack(attackRoll=17, damage=1)
        self.assertFalse(DiceRig.objects.get().values[0].get('consumed'))
        self.attack(attackRoll=17, damage=1, consumeRig=True)
        self.assertTrue(DiceRig.objects.get().values[0].get('consumed'))


class MapValidationTests(Base):
    def test_background_must_be_image_data_url(self):
        url = self.url('map')
        self.assertEqual(self.c_dm.post(url, {'background_image': 'javascript:alert(1)'}, format='json').status_code, 400)
        self.assertEqual(self.c_dm.post(url, {'background_image': 'https://x/y.png'}, format='json').status_code, 400)
        ok = self.c_dm.post(url, {'background_image': 'data:image/jpeg;base64,AAAA', 'grid_size_px': 99999,
                                  'grid_visible': 1}, format='json')
        self.assertEqual(ok.status_code, 200, ok.content)
        m = ok.json()['combat']['map']
        self.assertEqual(m['grid_size_px'], 400)
        self.assertIs(m['grid_visible'], True)
        self.assertEqual(self.c_dm.post(url, {'background_image': None}, format='json').json()['combat']['map']['background_image'], None)
        big = 'data:image/jpeg;base64,' + 'A' * 2_000_001
        self.assertEqual(self.c_dm.post(url, {'background_image': big}, format='json').status_code, 400)


class CombatChronicleTests(Base):
    def test_end_narrates_participants_downs_and_winner(self):
        self.c_dm.post(self.url('start'))
        self.c_dm.post(self.url('action'), {'action': 'damage', 'targetId': 'h1', 'amount': 25}, format='json')
        self.c_dm.post(self.url('action'), {'action': 'heal', 'targetId': 'h1', 'amount': 5}, format='json')
        for g in ('g1', 'g2'):
            self.c_dm.post(self.url('action'), {'action': 'attack', 'attackerId': 'h1', 'targetId': g,
                                                'actionIndex': 0, 'attackRoll': 15, 'damage': 9}, format='json')
        self.c_dm.post(self.url('end'))
        e = DiaryEntry.objects.filter(campaign=self.camp, subtype='combat').order_by('-id').first()
        self.assertEqual(e.data['winner'], 'party')
        self.assertEqual(e.data['downs'], {'Thalion': 1})
        self.assertEqual(e.data['pcs'], ['Thalion'])
        self.assertEqual(e.data['monsters'], [{'name': 'Goblin', 'count': 2, 'defeated': 2}])
        self.assertEqual(e.body, 'Thalion venceu 2 inimigos (Goblin ×2) em 1 rodada; Thalion caiu uma vez.')

    def test_narration_pt_variants(self):
        s = combat_summary(4, [hero('a', 'Thalion'), hero('b', 'Mira'), goblin('g1', 0), goblin('g2', 0), goblin('g3', 0)],
                           [{'type': 'start'}, {'type': 'damage', 'downed': 'Mira'}])
        self.assertEqual(combat_narration_pt(s),
                         'Thalion e Mira venceram 3 inimigos (Goblin ×3) em 4 rodadas; Mira caiu uma vez.')
        s = combat_summary(2, [hero('a', 'Thalion', 0), goblin('g1')], [])
        self.assertEqual(s['winner'], 'monsters')
        s = combat_summary(3, [hero(), goblin('g1')], [])
        self.assertIsNone(s['winner'])
        self.assertTrue(combat_narration_pt(s).startswith('Combate encerrado em 3 rodadas'))
        # quedas antes do último "start" não contam
        s = combat_summary(1, [hero()], [{'type': 'damage', 'downed': 'Thalion'}, {'type': 'start'}])
        self.assertEqual(s['downs'], {})
