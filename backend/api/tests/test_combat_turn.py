"""
V4 · Próximo turno protegido e ↶ Voltar turno (api/views_combat.py).

- `expect: {round, turnIndex}`: 2 toques (ou 2 aparelhos) com a mesma vez avançam
  EXATAMENTE 1 vez; o 2º recebe 409 `stale_turn` com o combate atual e nada muda.
- Outra escrita no combate entre a leitura e a gravação não se perde (CAS por
  `updated_at`) e não faz o turno pular.
- ↶ Voltar turno restaura a foto do fim do turno: turn_index, round, efeitos e
  condições com duração (tick_effects), recargas e ações lendárias (start_turn);
  campo mexido depois do Próximo fica como está.
"""
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Campaign, CombatInstance, Membership, Profile
from api import views_combat

User = get_user_model()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


DRAGON_ACTIONS = [
    {'name': 'Mordida', 'type': 'melee', 'atk': 7, 'damage': '2d10+4', 'damageType': 'piercing'},
    {'name': 'Sopro de Fogo', 'kind': 'action', 'recharge': 5, 'save': {'ability': 'dex', 'dc': 15},
     'damage': '12d6', 'damageType': 'fire'},
    {'name': 'Cauda', 'kind': 'legendary', 'cost': 1, 'type': 'melee', 'atk': 7, 'damage': '2d8', 'damageType': 'bludgeoning'},
]


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p1 = APIClient(); self.c_p1.force_login(self.p1)
        self.camp = Campaign.objects.create(dm=self.dm, name='Brumafria', slug='b')
        Membership.objects.create(campaign=self.camp, user=self.p1, role='player')
        self.combat = CombatInstance.objects.create(campaign=self.camp, active=True, round_number=1, turn_index=0, combatants=[
            {'id': 'p', 'name': 'Pipo', 'type': 'pc', 'current_hp': 9, 'stats': {'max_hp': 9},
             'conditions': ['poisoned'], 'effects': [{'name': 'poisoned', 'rounds_left': 1}]},
            {'id': 'dr', 'name': 'Dragão', 'type': 'monster', 'current_hp': 200, 'stats': {
                'max_hp': 200, 'actions': DRAGON_ACTIONS, 'legendary': {'uses': 3}},
             'action_state': {'1': {'charged': False}}, 'legendary': {'max': 3, 'remaining': 1}},
            {'id': 'd', 'name': 'Dagna', 'type': 'pc', 'current_hp': 10, 'stats': {'max_hp': 10}},
        ])

    def url(self, what):
        return f'/api/combat/campaign/{self.camp.id}/{what}'

    def next(self, expect=None, client=None):
        body = {'expect': expect} if expect is not None else {}
        return (client or self.c_dm).post(self.url('next-turn'), body, format='json')

    def prev(self, expect=None):
        body = {'expect': expect} if expect is not None else {}
        return self.c_dm.post(self.url('prev-turn'), body, format='json')

    def db(self):
        self.combat.refresh_from_db()
        return self.combat


class NextTurnTests(Base):
    def test_expect_advances_once_and_the_second_gets_409(self):
        r1 = self.next({'round': 1, 'turnIndex': 0})
        self.assertEqual(r1.status_code, 200, r1.content)
        self.assertEqual(r1.json()['combat']['turnIndex'], 1)
        r2 = self.next({'round': 1, 'turnIndex': 0})       # o 2º toque com a mesma vez
        self.assertEqual(r2.status_code, 409)
        self.assertEqual(r2.json()['error'], 'stale_turn')
        self.assertEqual(r2.json()['combat']['turnIndex'], 1)   # o combate atual, para o "agora é de X"
        c = self.db()
        self.assertEqual((c.round_number, c.turn_index), (1, 1))
        self.assertEqual(sum(1 for e in c.action_log if e['type'] == 'next_turn'), 1)

    def test_without_expect_keeps_working(self):
        self.assertEqual(self.next().status_code, 200)
        self.assertEqual(self.next().status_code, 200)
        self.assertEqual((self.db().round_number, self.db().turn_index), (1, 2))

    def test_wraps_the_round(self):
        self.combat.turn_index = 2; self.combat.save()
        r = self.next({'round': 1, 'turnIndex': 2})
        self.assertEqual((r.json()['combat']['round'], r.json()['combat']['turnIndex']), (2, 0))

    def test_invalid_expect_400_and_player_403(self):
        self.assertEqual(self.next({'round': 'x', 'turnIndex': 0}).status_code, 400)
        self.assertEqual(self.next({'round': 1, 'turnIndex': 0}, client=self.c_p1).status_code, 403)
        self.assertEqual(self.db().turn_index, 0)

    def test_a_write_in_between_is_not_lost_and_does_not_skip(self):
        """Outra escrita entra entre a leitura e a gravação: relê e grava em cima dela."""
        real = views_combat._swap_turn
        calls = {'n': 0}

        def racing(c, *args):
            if calls['n'] == 0:
                calls['n'] += 1
                other = CombatInstance.objects.get(pk=c.pk)
                other.combatants = [{**other.combatants[0], 'current_hp': 4}] + other.combatants[1:]
                other.save()                                   # o dano do outro pedido
            return real(c, *args)

        with mock.patch.object(views_combat, '_swap_turn', side_effect=racing):
            r = self.next({'round': 1, 'turnIndex': 0})
        self.assertEqual(r.status_code, 200, r.content)
        c = self.db()
        self.assertEqual(c.turn_index, 1)
        self.assertEqual(c.combatants[0]['current_hp'], 4)

    def test_a_concurrent_next_turn_makes_the_other_stale(self):
        real = views_combat._swap_turn
        calls = {'n': 0}

        def racing(c, *args):
            if calls['n'] == 0:
                calls['n'] += 1
                CombatInstance.objects.filter(pk=c.pk).update(turn_index=1, updated_at=c.updated_at.replace(year=2030))
            return real(c, *args)

        with mock.patch.object(views_combat, '_swap_turn', side_effect=racing):
            r = self.next()                                    # sem expect: vale a vez que leu
        self.assertEqual(r.status_code, 409)
        self.assertEqual(self.db().turn_index, 1)


class PrevTurnTests(Base):
    def test_undo_restores_turn_effects_recharge_and_legendary(self):
        with mock.patch('api.combat.roll_die', return_value=6):    # a recarga do sopro volta
            r = self.next({'round': 1, 'turnIndex': 0})
        c = r.json()['combat']
        pipo, dragon = c['combatants'][0], c['combatants'][1]
        self.assertEqual(pipo['conditions'], [])                   # o efeito de 1 rodada acabou
        self.assertTrue(dragon['action_state']['1']['charged'])
        self.assertEqual(dragon['legendary']['remaining'], 3)
        r = self.prev({'round': 1, 'turnIndex': 1})
        self.assertEqual(r.status_code, 200, r.content)
        c = self.db()
        self.assertEqual((c.round_number, c.turn_index), (1, 0))
        self.assertEqual(c.combatants[0]['conditions'], ['poisoned'])
        self.assertEqual(c.combatants[0]['effects'], [{'name': 'poisoned', 'rounds_left': 1}])
        self.assertFalse(c.combatants[1]['action_state']['1']['charged'])
        self.assertEqual(c.combatants[1]['legendary']['remaining'], 1)
        self.assertEqual(c.action_log[-1]['type'], 'prev_turn')
        self.assertEqual(c.action_log[-1]['whose'], 'Pipo')

    def test_undo_across_the_round(self):
        self.combat.turn_index = 2; self.combat.save()
        self.next({'round': 1, 'turnIndex': 2})
        self.assertEqual((self.db().round_number, self.db().turn_index), (2, 0))
        self.assertEqual(self.prev({'round': 2, 'turnIndex': 0}).status_code, 200)
        self.assertEqual((self.db().round_number, self.db().turn_index), (1, 2))

    def test_two_undos_go_back_two_turns_and_then_stop(self):
        self.next({'round': 1, 'turnIndex': 0})
        self.next({'round': 1, 'turnIndex': 1})
        self.assertEqual(self.prev({'round': 1, 'turnIndex': 2}).status_code, 200)
        self.assertEqual(self.prev({'round': 1, 'turnIndex': 1}).status_code, 200)
        self.assertEqual(self.db().turn_index, 0)
        r = self.prev({'round': 1, 'turnIndex': 0})
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['error'], 'nothing_to_undo')

    def test_stale_undo_does_nothing(self):
        self.next({'round': 1, 'turnIndex': 0})
        r = self.prev({'round': 1, 'turnIndex': 0})               # o mestre via outra vez
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['error'], 'stale_turn')
        self.assertEqual(self.db().turn_index, 1)

    def test_a_field_changed_after_the_next_turn_is_kept(self):
        self.next({'round': 1, 'turnIndex': 0})
        c = self.db()
        c.combatants[0]['conditions'] = ['prone']                 # o mestre mexeu depois
        c.save()
        self.assertEqual(self.prev({'round': 1, 'turnIndex': 1}).status_code, 200)
        c = self.db()
        self.assertEqual(c.turn_index, 0)
        self.assertEqual(c.combatants[0]['conditions'], ['prone'])
        self.assertEqual(c.combatants[0]['effects'], [{'name': 'poisoned', 'rounds_left': 1}])
        self.assertIn('conditions', c.action_log[-1]['kept'])

    def test_photo_has_no_images_and_the_public_log_hides_it(self):
        self.combat.combatants[1]['sprite'] = 'data:image/png;base64,' + 'A' * 5000
        self.combat.save()
        self.next({'round': 1, 'turnIndex': 0})
        entry = next(e for e in self.db().action_log if e['type'] == 'next_turn')
        self.assertNotIn('base64', str(entry))
        r = self.c_p1.get(self.url('').rstrip('/'))
        self.assertEqual(r.status_code, 200)
        public = [e for e in r.json()['combat']['log'] if e.get('type') == 'next_turn']
        self.assertTrue(public)
        self.assertNotIn('photo', public[0])
        self.assertNotIn('from', public[0])

    def test_undo_when_who_had_the_turn_left_does_nothing(self):
        # Vez do último (Dagna) → Próximo vira a rodada → tiram a Dagna → Voltar turno.
        self.combat.turn_index = 2; self.combat.save()
        self.next({'round': 1, 'turnIndex': 2})
        self.assertEqual(self.c_dm.delete(self.url('combatants/d')).status_code, 200)
        r = self.prev({'round': 2, 'turnIndex': 0})
        self.assertEqual(r.status_code, 409, r.content)
        self.assertEqual(r.json()['error'], 'nothing_to_undo')
        c = self.db()
        self.assertEqual((c.round_number, c.turn_index, len(c.combatants)), (2, 0, 2))   # nada mudou
        # e o Próximo seguinte segue a ordem (Dragão), sem pular o Pipo nem voltar à rodada 1
        r = self.next({'round': 2, 'turnIndex': 0})
        self.assertEqual((r.json()['combat']['round'], r.json()['combat']['turnIndex']), (2, 1))

    def test_undo_finds_who_had_the_turn_by_id(self):
        # Entrou alguém antes da Dagna depois do Próximo: a vez volta para ELA, na posição nova.
        self.combat.turn_index = 2; self.combat.save()
        self.next({'round': 1, 'turnIndex': 2})                       # Dagna → (rodada 2) Pipo
        c = self.db()
        c.combatants = c.combatants[:2] + [{'id': 'n', 'name': 'Novo', 'type': 'monster', 'current_hp': 5,
                                             'stats': {'max_hp': 5}}] + c.combatants[2:]
        c.save()
        self.assertEqual(self.prev({'round': 2, 'turnIndex': 0}).status_code, 200)
        c = self.db()
        self.assertEqual((c.round_number, c.turn_index), (1, 3))
        self.assertEqual(c.combatants[3]['name'], 'Dagna')
        self.assertEqual(c.action_log[-1]['whose'], 'Dagna')

    def test_undo_of_an_old_entry_pointing_out_of_the_list_does_nothing(self):
        # Entrada gravada antes do `from.id`: a posição que já não existe não é restaurada.
        c = self.db()
        c.round_number, c.turn_index = 2, 0
        c.action_log = [{'type': 'next_turn', 'round': 2, 'index': 0, 'from': {'round': 1, 'index': 5}, 'photo': []}]
        c.save()
        r = self.prev({'round': 2, 'turnIndex': 0})
        self.assertEqual(r.status_code, 409)
        self.assertEqual((self.db().round_number, self.db().turn_index), (2, 0))

    def test_player_cannot_undo(self):
        self.next({'round': 1, 'turnIndex': 0})
        r = self.c_p1.post(self.url('prev-turn'), {'expect': {'round': 1, 'turnIndex': 1}}, format='json')
        self.assertEqual(r.status_code, 403)
