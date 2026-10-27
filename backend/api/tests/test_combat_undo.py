"""
V8 · Ações de PV seguras (especificação §4.7 C2).

- O mesmo POST de dano com o mesmo `opId` tira PV uma vez (`duplicate: true`).
- ↶ Desfazer (POST …/undo {opId}) restaura a FOTO do combatente: PV, PV temporário,
  testes contra a morte, condições e "derrotado" — não aplica "o contrário".
- Mexeram no alvo depois → 409 `changed_since` e nada muda.
- Vários alvos (hp_many) numa chamada; um Desfazer volta todos.
- + Temp não soma (fica o maior). A ficha do personagem acompanha.
- Ataque aplicado também desfaz (o PV do alvo e a recarga gasta pelo atacante).
- O resumo do combate (diário) não conta a queda desfeita.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Campaign, Character, CombatInstance, Membership, Profile
from api.diary import combat_summary

User = get_user_model()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.ana = make_user('ana@x.com', 'Ana')
        self.camp = Campaign.objects.create(dm=self.dm, name='Brumafria', slug='b')
        self.char = Character.objects.create(owner=self.ana, name='Dagna', data={
            'level': 1, 'maxHp': 10, 'currentHp': 3, 'tempHp': 5, 'conditions': []})
        Membership.objects.create(campaign=self.camp, user=self.ana, character=self.char, role='player')
        self.combat = CombatInstance.objects.create(campaign=self.camp, active=True, round_number=1, turn_index=0, combatants=[
            {'id': 'g1', 'name': 'Goblin #1', 'type': 'monster', 'current_hp': 10, 'temp_hp': 0,
             'stats': {'max_hp': 10, 'ac': 15, 'actions': [
                 {'name': 'Sopro', 'type': 'melee', 'atk': 4, 'damage': '7', 'damageType': 'fire', 'recharge': 5}]},
             'action_state': {'0': {'charged': True}}, 'conditions': [], 'defeated': False},
            {'id': 'g2', 'name': 'Goblin #2', 'type': 'monster', 'current_hp': 10, 'temp_hp': 0,
             'stats': {'max_hp': 10, 'ac': 15}, 'conditions': [], 'defeated': False},
            {'id': 'd', 'name': 'Dagna', 'type': 'pc', 'character_id': self.char.id, 'current_hp': 3, 'temp_hp': 5,
             'stats': {'max_hp': 10, 'ac': 14}, 'conditions': [], 'death_saves': {'success': 1, 'fail': 1}},
        ])
        self.c = APIClient()
        self.c.force_login(self.dm)

    def url(self, what):
        return f'/api/combat/campaign/{self.camp.id}/{what}'

    def act(self, status=200, **body):
        r = self.c.post(self.url('action'), body, format='json')
        self.assertEqual(r.status_code, status, r.content)
        return r.json()

    def undo(self, op_id, status=200):
        r = self.c.post(self.url('undo'), {'opId': op_id}, format='json')
        self.assertEqual(r.status_code, status, r.content)
        return r.json()

    def cb(self, cid):
        self.combat.refresh_from_db()
        return next(x for x in self.combat.combatants if x['id'] == cid)


class OpIdTests(Base):
    def test_same_damage_post_twice_takes_hp_once(self):
        body = dict(action='damage', targetId='g1', amount=4, damageType='slashing', opId='dmg-0000-0001')
        first = self.act(**body)
        self.assertEqual(first['opId'], 'dmg-0000-0001')
        again = self.act(**body)
        self.assertTrue(again['duplicate'])
        self.assertEqual(self.cb('g1')['current_hp'], 6)
        # sem opId (app de antes) continua aplicando a cada POST
        self.act(action='damage', targetId='g1', amount=1)
        self.act(action='damage', targetId='g1', amount=1)
        self.assertEqual(self.cb('g1')['current_hp'], 4)

    def test_photo_does_not_travel_to_the_app(self):
        data = self.act(action='damage', targetId='g1', amount=4, opId='dmg-0000-0002')
        self.assertTrue(all('photo' not in e for e in data['combat']['log']))

    def test_bad_op_id(self):
        self.act(status=400, action='damage', targetId='g1', amount=4, opId='x')

    def test_amount_out_of_range(self):
        self.act(status=400, action='heal', targetId='g1', amount=-5)


class UndoTests(Base):
    def test_undo_restores_temp_hp_death_saves_and_conditions_of_a_pc(self):
        # Dagna: 3 PV + 5 temp → 9 de dano: temp some, cai a 0, inconsciente
        self.act(action='damage', targetId='d', amount=9, opId='dmg-pc-00001')
        down = self.cb('d')
        self.assertEqual((down['current_hp'], down['temp_hp']), (0, 0))
        self.assertIn('unconscious', down['conditions'])
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['currentHp'], 0)
        self.combat.refresh_from_db()
        self.assertEqual(combat_summary(1, self.combat.combatants, self.combat.action_log)['downs'], {'Dagna': 1})
        out = self.undo('dmg-pc-00001')
        # a queda desfeita não conta no resumo do combate (diário)
        self.combat.refresh_from_db()
        self.assertEqual(combat_summary(1, self.combat.combatants, self.combat.action_log)['downs'], {})
        back = self.cb('d')
        self.assertEqual((back['current_hp'], back['temp_hp']), (3, 5))
        self.assertEqual(back['death_saves'], {'success': 1, 'fail': 1})
        self.assertNotIn('unconscious', back['conditions'])
        self.char.refresh_from_db()                      # a ficha volta junto
        self.assertEqual((self.char.data['currentHp'], self.char.data['tempHp']), (3, 5))
        self.assertEqual(out['combat']['log'][-1]['type'], 'undo')
        # 2º Desfazer do mesmo opId: nada para desfazer
        self.assertEqual(self.undo('dmg-pc-00001', status=409)['error'], 'nothing_to_undo')
        # a cura "ao contrário" não devolveria o temporário nem os testes contra a morte

    def test_undo_restores_defeated_monster(self):
        self.act(action='damage', targetId='g2', amount=12, opId='dmg-mon-0001')
        self.assertTrue(self.cb('g2')['defeated'])
        self.undo('dmg-mon-0001')
        g2 = self.cb('g2')
        self.assertEqual((g2['current_hp'], g2['defeated']), (10, False))

    def test_changed_since_gives_409_and_changes_nothing(self):
        self.act(action='damage', targetId='g1', amount=4, opId='dmg-chg-0001')
        self.act(action='damage', targetId='g1', amount=2)                    # outro dano depois
        out = self.undo('dmg-chg-0001', status=409)
        self.assertEqual(out['error'], 'changed_since')
        self.assertEqual(out['names'], ['Goblin #1'])
        self.assertEqual(self.cb('g1')['current_hp'], 4)

    def test_many_targets_in_one_call_and_one_undo(self):
        data = self.act(action='hp_many', op='damage', damageType='fire', opId='many-000001',
                        targets=[{'id': 'g1', 'amount': 8}, {'id': 'g2', 'amount': 4}])
        self.assertEqual([t['new_hp'] for t in data['result']['targets']], [2, 6])
        self.combat.refresh_from_db()
        dmg = [e for e in self.combat.action_log if e.get('type') == 'damage']
        self.assertEqual([(e['target'], e['amount']) for e in dmg], [('Goblin #1', 8), ('Goblin #2', 4)])
        self.assertTrue(self.act(action='hp_many', op='damage', opId='many-000001',
                                 targets=[{'id': 'g1', 'amount': 8}])['duplicate'])
        self.undo('many-000001')
        self.assertEqual((self.cb('g1')['current_hp'], self.cb('g2')['current_hp']), (10, 10))

    def test_many_targets_validation(self):
        self.act(status=400, action='hp_many', op='damage', targets=[{'id': 'g1', 'amount': 2}, {'id': 'g1', 'amount': 2}])
        self.act(status=400, action='hp_many', op='zap', targets=[{'id': 'g1', 'amount': 2}])

    def test_temp_hp_keeps_the_highest_and_undoes(self):
        self.act(action='temp_hp', targetId='d', amount=3, opId='temp-000001')
        self.assertEqual(self.cb('d')['temp_hp'], 5)                         # 5 > 3: fica 5
        self.act(action='temp_hp', targetId='d', amount=8, opId='temp-000002')
        self.assertEqual(self.cb('d')['temp_hp'], 8)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['tempHp'], 8)
        self.undo('temp-000002')
        self.assertEqual(self.cb('d')['temp_hp'], 5)

    def test_heal_undo_puts_back_unconscious(self):
        self.act(action='damage', targetId='d', amount=9)
        self.act(action='heal', targetId='d', amount=4, opId='heal-000001')
        self.assertEqual(self.cb('d')['current_hp'], 4)
        self.undo('heal-000001')
        d = self.cb('d')
        self.assertEqual(d['current_hp'], 0)
        self.assertIn('unconscious', d['conditions'])

    def test_attack_undo_restores_target_and_recharge(self):
        self.act(action='attack', attackerId='g1', targetId='g2', actionIndex=0, attackRoll=15, damage=7,
                 hit=True, opId='atk-0000001')
        self.assertEqual(self.cb('g2')['current_hp'], 3)
        self.assertEqual(self.cb('g1')['action_state']['0'], {'charged': False})
        self.undo('atk-0000001')
        self.assertEqual(self.cb('g2')['current_hp'], 10)
        self.assertEqual(self.cb('g1')['action_state']['0'], {'charged': True})

    def test_only_dm(self):
        cl = APIClient(); cl.force_login(self.ana)
        r = cl.post(self.url('undo'), {'opId': 'whatever-01'}, format='json')
        self.assertEqual(r.status_code, 403)
