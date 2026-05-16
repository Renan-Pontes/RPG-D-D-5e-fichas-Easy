"""
Matriz de autorização — testes cross-user, cross-campanha e anônimos.

Estrutura: 3 personas + 2 campanhas + N recursos. Cada teste verifica
que o endpoint retorna o status esperado pra cada combinação.

Personas:
- ALICE: dona do char_a, DM da camp_a, char_a está atribuído à camp_a.
- BOB: dono do char_b, jogador da camp_a (com char_b), DM da camp_b.
- CARLA: dona do char_c (standalone), sem relação com nenhuma campanha.

Recursos em camp_a:
- Combat ativo, dice rig pro BOB, approval pendente, roll request pendente.
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import (
    Profile, Character, Campaign, Membership, Approval,
    CombatInstance, RollRequest, DiceRig, DiceLog,
)

User = get_user_model()


def _u(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class AuthzMatrixBase(TestCase):
    def setUp(self):
        cache.clear()
        # Personas
        self.alice = _u('a@x.com', 'Alice')
        self.bob = _u('b@x.com', 'Bob')
        self.carla = _u('c@x.com', 'Carla')
        # Clientes
        self.anon = APIClient()
        self.c_a = APIClient(); self.c_a.force_login(self.alice)
        self.c_b = APIClient(); self.c_b.force_login(self.bob)
        self.c_c = APIClient(); self.c_c.force_login(self.carla)
        # Personagens
        self.char_a = Character.objects.create(owner=self.alice, name='Alice Char', data={'className': 'wizard', 'level': 5, 'maxHp': 30, 'currentHp': 30})
        self.char_b = Character.objects.create(owner=self.bob, name='Bob Char', data={'className': 'fighter', 'level': 3, 'maxHp': 28, 'currentHp': 28})
        self.char_c = Character.objects.create(owner=self.carla, name='Carla Standalone', data={'className': 'rogue', 'level': 4})
        # Campanhas
        self.camp_a = Campaign.objects.create(dm=self.alice, name='A', slug='ax')
        self.camp_b = Campaign.objects.create(dm=self.bob, name='B', slug='bx')
        # Alice atribui char_a na sua camp_a
        self.m_a = Membership.objects.create(campaign=self.camp_a, user=self.alice, character=self.char_a, role='dm')
        # Bob é jogador na camp_a com char_b
        self.m_b = Membership.objects.create(campaign=self.camp_a, user=self.bob, character=self.char_b, role='player')


# ============================================================
# Anônimo: rotas autenticadas viram 401/403; públicas 200
# ============================================================
class AnonymousAccessTests(AuthzMatrixBase):
    def _is_unauth(self, r):
        return r.status_code in (401, 403)

    def test_anon_blocked_on_characters(self):
        self.assertTrue(self._is_unauth(self.anon.get('/api/characters')))
        self.assertTrue(self._is_unauth(self.anon.get(f'/api/characters/{self.char_a.id}')))

    def test_anon_blocked_on_campaigns(self):
        self.assertTrue(self._is_unauth(self.anon.get('/api/campaigns')))
        self.assertTrue(self._is_unauth(self.anon.get(f'/api/campaigns/{self.camp_a.id}')))

    def test_anon_blocked_on_combat(self):
        self.assertTrue(self._is_unauth(self.anon.get(f'/api/combat/campaign/{self.camp_a.id}')))

    def test_anon_blocked_on_rolls(self):
        self.assertTrue(self._is_unauth(self.anon.get(f'/api/rolls/campaign/{self.camp_a.id}/pending')))

    def test_anon_blocked_on_auth_me(self):
        self.assertTrue(self._is_unauth(self.anon.get('/api/auth/me')))

    def test_anon_can_access_screen_public(self):
        r = self.anon.get(f'/api/screen/{self.camp_a.screen_token}')
        self.assertEqual(r.status_code, 200)

    def test_anon_can_access_health(self):
        r = self.anon.get('/api/health')
        self.assertEqual(r.status_code, 200)

    def test_anon_can_access_auth_csrf(self):
        r = self.anon.get('/api/auth/csrf')
        self.assertEqual(r.status_code, 200)


# ============================================================
# Cross-user: B não toca char de A em endpoints diversos
# ============================================================
class CrossUserCharacterTests(AuthzMatrixBase):
    def test_bob_cannot_read_alice_character_unless_dm(self):
        # Bob NÃO é DM da campanha onde char_a está (a Alice é o DM)
        # MAS char_a está na camp_a onde Bob é jogador.
        # Regra atual: can_read_character → dono OR DM da campanha em que
        # o char está. Bob não é DM, então 403.
        r = self.c_b.get(f'/api/characters/{self.char_a.id}')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_put_alice_character(self):
        r = self.c_b.put(f'/api/characters/{self.char_a.id}', {'name': 'X', 'data': {}}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_delete_alice_character(self):
        r = self.c_b.delete(f'/api/characters/{self.char_a.id}')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_cast_with_alice_character(self):
        r = self.c_b.post(f'/api/characters/{self.char_a.id}/cast',
            {'spellId': 'fireball', 'slotLevel': 3}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_rest_alice_character(self):
        # Bob não é dono, e também não é DM da campanha onde char_a está
        r = self.c_b.post(f'/api/characters/{self.char_a.id}/rest', {'type': 'long'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_wild_shape_transform_alice_char(self):
        r = self.c_b.post(f'/api/characters/{self.char_a.id}/wild-shape/transform',
            {'beast': {'id': 'wolf', 'crNum': 0.25, 'hp': 11, 'ac': 13}}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_wild_shape_force_end_alice_char(self):
        # Bob NÃO é DM da campanha do char_a (Alice é)
        r = self.c_b.post(f'/api/characters/{self.char_a.id}/wild-shape/force-end', {}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_dm_edit_alice_char_being_player(self):
        # Bob é jogador na camp_a (não DM); char_a é da Alice
        r = self.c_b.patch(f'/api/characters/{self.char_a.id}/dm-edit', {'data': {'maxHp': 999}}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_give_item_to_alice_char_being_player(self):
        r = self.c_b.post(f'/api/characters/{self.char_a.id}/inventory',
            {'item': {'name': 'Cursed Sword'}}, format='json')
        # Char_a está em campanha; só DM (Alice) pode dar. Bob é jogador → 403.
        self.assertEqual(r.status_code, 403)


# ============================================================
# Cross-campaign: DM da B não toca recursos da A
# ============================================================
class CrossCampaignDMTests(AuthzMatrixBase):
    def test_bob_dm_of_b_cannot_edit_campaign_a(self):
        # Bob é DM da camp_b mas só jogador na camp_a
        r = self.c_b.put(f'/api/campaigns/{self.camp_a.id}', {'name': 'Hacked'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_rotate_invite_in_camp_a(self):
        r = self.c_b.post(f'/api/campaigns/{self.camp_a.id}/rotate-invite-code')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_start_combat_in_camp_a(self):
        r = self.c_b.post(f'/api/combat/campaign/{self.camp_a.id}/start')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_create_rigs_in_camp_a(self):
        r = self.c_b.post(f'/api/dice/campaign/{self.camp_a.id}/rigs',
            {'targetUserId': self.bob.id, 'diceType': 'd20', 'values': [{'value': 20}]},
            format='json')
        self.assertEqual(r.status_code, 403)

    def test_bob_cannot_list_dice_log_in_camp_a(self):
        r = self.c_b.get(f'/api/dice/campaign/{self.camp_a.id}/log')
        self.assertEqual(r.status_code, 403)

    def test_carla_cannot_access_camp_a_combat(self):
        # Carla nem é membro
        r = self.c_c.get(f'/api/combat/campaign/{self.camp_a.id}')
        self.assertEqual(r.status_code, 403)


# ============================================================
# Recursos aninhados: DiceRig / Approval / RollRequest / Combatant
# ============================================================
class NestedResourceAuthzTests(AuthzMatrixBase):
    def test_dm_of_b_cannot_patch_rig_of_a(self):
        rig = DiceRig.objects.create(campaign=self.camp_a, target_user=self.bob,
                                      dice_type='d20', values=[{'value': 20}])
        r = self.c_b.put(f'/api/dice/rigs/{rig.id}',
            {'values': [{'value': 1}]}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_dm_of_b_cannot_delete_rig_of_a(self):
        rig = DiceRig.objects.create(campaign=self.camp_a, target_user=self.bob,
                                      dice_type='d20', values=[])
        r = self.c_b.delete(f'/api/dice/rigs/{rig.id}')
        self.assertEqual(r.status_code, 403)

    def test_dm_of_b_cannot_review_approval_in_a(self):
        appr = Approval.objects.create(
            campaign=self.camp_a, character=self.char_b,
            requested_by=self.bob, type='levelup', payload={'toLevel': 4},
        )
        r = self.c_b.post(f'/api/approvals/{appr.id}/review',
            {'status': 'approved'}, format='json')
        # Bob é jogador na camp_a, NÃO DM. DM é Alice. 403.
        self.assertEqual(r.status_code, 403)

    def test_player_cannot_resolve_own_roll(self):
        # Bob cria pedido próprio em camp_a
        rr = RollRequest.objects.create(
            campaign=self.camp_a, requested_by=self.bob, dice_type='d20',
        )
        r = self.c_b.post(f'/api/rolls/{rr.id}/resolve',
            {'visibility': 'public'}, format='json')
        # Resolve é só DM da campanha. Bob não é. 403.
        self.assertEqual(r.status_code, 403)

    def test_player_can_cancel_own_roll(self):
        rr = RollRequest.objects.create(
            campaign=self.camp_a, requested_by=self.bob, dice_type='d20',
        )
        r = self.c_b.post(f'/api/rolls/{rr.id}/cancel')
        self.assertEqual(r.status_code, 200)

    def test_dm_can_cancel_player_roll(self):
        rr = RollRequest.objects.create(
            campaign=self.camp_a, requested_by=self.bob, dice_type='d20',
        )
        r = self.c_a.post(f'/api/rolls/{rr.id}/cancel')
        self.assertEqual(r.status_code, 200)

    def test_carla_cannot_cancel_any_roll(self):
        rr = RollRequest.objects.create(
            campaign=self.camp_a, requested_by=self.bob, dice_type='d20',
        )
        r = self.c_c.post(f'/api/rolls/{rr.id}/cancel')
        self.assertEqual(r.status_code, 403)

    def test_dm_b_cannot_resolve_roll_a(self):
        rr = RollRequest.objects.create(
            campaign=self.camp_a, requested_by=self.bob, dice_type='d20',
        )
        # Bob é jogador na A, DM da B — mas o roll é da A
        r = self.c_b.post(f'/api/rolls/{rr.id}/resolve',
            {'visibility': 'public'}, format='json')
        self.assertEqual(r.status_code, 403)


# ============================================================
# Dice roll com campaignId que não é membro — agora 403 explícito
# ============================================================
class DiceRollCampaignAuthzTests(AuthzMatrixBase):
    def test_member_can_roll_in_own_campaign(self):
        # Bob é jogador na A → pode rolar
        r = self.c_b.post('/api/dice/roll',
            {'diceType': 'd20', 'campaignId': self.camp_a.id}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_non_member_blocked_403(self):
        # Carla não é membro de nenhuma; tentar rolar em camp_a → 403
        r = self.c_c.post('/api/dice/roll',
            {'diceType': 'd20', 'campaignId': self.camp_a.id}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_invalid_campaign_id_404(self):
        r = self.c_a.post('/api/dice/roll',
            {'diceType': 'd20', 'campaignId': 999999}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_solo_roll_without_campaign_ok(self):
        # Sem campaignId continua funcionando (solo)
        r = self.c_c.post('/api/dice/roll', {'diceType': 'd20'}, format='json')
        self.assertEqual(r.status_code, 200)


# ============================================================
# Combat resource membership
# ============================================================
class CombatMembershipTests(AuthzMatrixBase):
    def test_player_can_view_combat_in_own_campaign(self):
        r = self.c_b.get(f'/api/combat/campaign/{self.camp_a.id}')
        self.assertEqual(r.status_code, 200)

    def test_non_member_cannot_view_combat(self):
        r = self.c_c.get(f'/api/combat/campaign/{self.camp_a.id}')
        self.assertEqual(r.status_code, 403)

    def test_player_cannot_call_combat_action(self):
        # Bob é jogador, não DM, tenta uma action de combate
        self.c_a.post(f'/api/combat/campaign/{self.camp_a.id}/start')
        r = self.c_b.post(f'/api/combat/campaign/{self.camp_a.id}/action',
            {'action': 'damage', 'targetId': 'xxx', 'amount': 1}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_dm_b_cannot_act_in_combat_a(self):
        self.c_a.post(f'/api/combat/campaign/{self.camp_a.id}/start')
        r = self.c_b.post(f'/api/combat/campaign/{self.camp_a.id}/next-turn')
        self.assertEqual(r.status_code, 403)
