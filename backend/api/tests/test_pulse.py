"""
V4 · Pulso do mestre (GET /campaigns/:id/pulse, api/views_pulse.py).

O pulso substitui o GET completo no polling do mestre: a casca só busca o GET
completo quando o `rev` muda. Por isso o teste de COBERTURA abaixo confere,
campo a campo do GET completo do mestre, que uma mudança daquele campo muda o
`rev` (um campo novo no serializer sem fonte de `rev` quebra o teste).

Também: só o mestre (jogador 403, sem login 401/403), 304 parado, "TV
conectada" pelo cache em memória (a prévia do mestre não conta), o resumo do
combate da barra da mesa, `checksRev`, `tableRollsRev`, `planRev`, `worldRev` e `advRev`.
"""
import time
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection, transaction
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import (Adventure, Approval, Campaign, CheckRequest, CheckResponse, Character, CombatInstance,
                        Membership, Plan, Profile, RollRequest, UserPlan, WorldEntry, WorldImage)
from api import table_rolls, views_pulse

User = get_user_model()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.p2 = make_user('p2@x.com', 'Bruno')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p1 = APIClient(); self.c_p1.force_login(self.p1)
        self.anon = APIClient()
        self.camp = Campaign.objects.create(dm=self.dm, name='Brumafria', slug='b',
                                            state={'session': '3', 'scene': 'Taverna', 'live': True})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.dagna = Character.objects.create(owner=self.p1, name='Dagna', data={'name': 'Dagna', 'level': 3})
        self.pipo = Character.objects.create(owner=self.p1, name='Pipo', data={'name': 'Pipo', 'level': 3})
        self.elarion = Character.objects.create(owner=self.p2, name='Elarion', data={'name': 'Elarion', 'level': 3})
        self.m1 = Membership.objects.create(campaign=self.camp, user=self.p1, character=self.dagna, role='player')
        self.m2 = Membership.objects.create(campaign=self.camp, user=self.p2, character=self.elarion, role='player')
        self.velna = WorldEntry.objects.create(campaign=self.camp, kind='npc', name='Irmã Velna', visibility='revealed')

    def pulse(self, client=None, **headers):
        return (client or self.c_dm).get(f'/api/campaigns/{self.camp.id}/pulse', **headers)

    def rev(self):
        r = self.pulse()
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['rev']

    def full(self):
        r = self.c_dm.get(f'/api/campaigns/{self.camp.id}')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['campaign']

    def touch(self, obj):
        """Garante um `updated_at` diferente (o relógio pode repetir no mesmo µs)."""
        time.sleep(0.002)
        obj.save()


class AccessTests(Base):
    def test_dm_player_and_outsider(self):
        self.assertEqual(self.pulse().status_code, 200)
        self.assertIn('planRev', self.pulse().json())
        # V13: o jogador recebe a projeção dele (nada do mestre); quem não é da mesa, 403
        r = self.pulse(self.c_p1)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertNotIn('planRev', r.json())
        outsider = APIClient(); outsider.force_login(make_user('z@x.com', 'Zé'))
        self.assertEqual(self.pulse(outsider).status_code, 403)
        self.assertIn(self.pulse(self.anon).status_code, (401, 403))

    def test_by_slug_and_404(self):
        self.assertEqual(self.c_dm.get('/api/campaigns/b/pulse').status_code, 200)
        self.assertEqual(self.c_dm.get('/api/campaigns/9999/pulse').status_code, 404)

    def test_304_when_nothing_changed_and_200_when_it_did(self):
        r = self.pulse()
        etag = r['ETag']
        r2 = self.pulse(HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(r2.status_code, 304)
        self.assertEqual(r2.content, b'')
        # o 304 do middleware: só ETag/Date/Vary (nem o Allow do DRF nem o X-Frame-Options)
        self.assertEqual(r2['ETag'], etag)
        for h in ('Allow', 'X-Frame-Options', 'Cache-Control'):
            self.assertNotIn(h, r2, h)
        self.c_dm.patch(f'/api/campaigns/{self.camp.id}/state', {'patch': {'scene': 'Ponte velha'}}, format='json')
        r3 = self.pulse(HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r3.json()['scene'], 'Ponte velha')

    def test_small_and_without_heavy_data(self):
        self.dagna.data = {**self.dagna.data, 'avatar': 'data:image/png;base64,' + 'A' * 50_000}
        self.dagna.save()
        CombatInstance.objects.create(campaign=self.camp, active=True, combatants=[
            {'id': 'a', 'name': 'Goblin', 'type': 'monster', 'current_hp': 7, 'stats': {'max_hp': 7},
             'sprite': 'data:image/png;base64,' + 'B' * 50_000}], map_data={'background_image': 'C' * 50_000})
        r = self.pulse()
        self.assertLess(len(r.content), 2500)
        self.assertNotIn(b'base64', r.content)

    def test_no_combat_and_empty_campaign(self):
        p = self.pulse().json()
        self.assertIsNone(p['combat'])
        self.assertEqual(p['counts'], {'openChecks': 0, 'pendingRolls': 0, 'approvals': 0, 'dangers': 0})
        self.assertTrue(p['live'])
        self.assertEqual(p['session'], '3')


class RevCoverageTests(Base):
    """Cada campo do GET completo do mestre tem uma fonte de `rev`."""

    # Campos que não mudam numa campanha existente (para o mestre dela).
    IMMUTABLE = {'id', 'dmId', 'role', 'created_at'}

    def mutations(self):
        camp = self.camp

        def patch_campaign(body):
            def go():
                r = self.c_dm.patch(f'/api/campaigns/{camp.id}', body, format='json')
                self.assertIn(r.status_code, (200, 204), r.content)
            return go

        def model(**fields):
            def go():
                camp.refresh_from_db()
                for k, v in fields.items():
                    setattr(camp, k, v)
                self.touch(camp)
            return go

        def show_card():
            r = self.c_dm.post(f'/api/campaigns/{camp.id}/stage',
                               {'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}}, format='json')
            self.assertEqual(r.status_code, 200, r.content)

        def swap_sheet():
            self.m1.character = self.pipo
            self.m1.save()

        def edit_sheet():
            self.dagna.data = {**self.dagna.data, 'currentHp': 3}
            self.touch(self.dagna)

        def rename_player():
            self.p1.profile.display_name = 'Ana Clara'
            self.p1.profile.save()

        def sponsor():
            self.m2.sponsored = True
            self.m2.save()

        def new_member():
            u = make_user('p3@x.com', 'Carla')
            Membership.objects.create(campaign=camp, user=u, role='player')

        def approval():
            Approval.objects.create(campaign=camp, character=self.dagna, requested_by=self.p1, type='levelup')

        def combat():
            CombatInstance.objects.create(campaign=camp, active=True, combatants=[])

        def plan():
            free = Plan.objects.create(slug='mesa', name_pt='Mesa', name_en='Table', table_slots=4)
            UserPlan.objects.create(user=self.dm, plan=free)

        return {
            'name': patch_campaign({'name': 'Brumafria II'}),
            'description': patch_campaign({'description': 'Uma campanha de névoa.'}),
            'tagline': patch_campaign({'tagline': 'O sino toca.'}),
            'accent': patch_campaign({'accent': '#8e2c2c'}),
            'tone': patch_campaign({'tone': 'dark'}),
            'onboarding': patch_campaign({'onboarding': {'tv': True}}),
            'advancedDice': patch_campaign({'advancedDice': True}),
            'lang': patch_campaign({'lang': 'en'}),
            'fogHint': model(dm_settings={'fogHint': True}),
            'immersion': model(dm_settings={'immersion': False}),
            'slug': model(slug='brumafria-2'),
            'state': lambda: self.c_dm.patch(f'/api/campaigns/{camp.id}/state', {'patch': {'weather': 'névoa'}}, format='json'),
            'stage': show_card,
            'screenCard': show_card,
            'inviteCode': model(invite_code='ZZ9TOP'),
            'screenToken': lambda: self.c_dm.post(f'/api/campaigns/{camp.id}/rotate-screen-token'),
            'coverVer': model(cover_ver='v2'),
            'coverUrl': model(cover_ver='v3'),
            'updated_at': model(tone='epic'),
            'status': model(status='closed', closed_at=timezone.now()),
            'closedAt': model(status='closed', closed_at=timezone.now() - timedelta(days=1)),
            'purgeAt': model(status='closed', closed_at=timezone.now() - timedelta(days=2)),
            'members': swap_sheet,
            'combatNow': combat,
            'pendingApprovals': approval,
            'tableSlots': sponsor,
            # outros jeitos de mudar `members`/`tableSlots` que não tocam a campanha:
            '+members:edit_sheet': edit_sheet,
            '+members:rename_player': rename_player,
            '+members:new_member': new_member,
            '+tableSlots:plan': plan,
        }

    def test_every_dm_field_has_a_rev_source(self):
        fields = set(self.full().keys())
        muts = self.mutations()
        covered = {k for k in muts if not k.startswith('+')} | self.IMMUTABLE
        self.assertEqual(fields - covered, set(), 'campo do GET do mestre sem fonte de rev no pulso')

    def test_each_mutation_changes_rev(self):
        for name, go in self.mutations().items():
            with self.subTest(field=name):
                sid = transaction.savepoint()   # cada campo parte da mesma campanha
                try:
                    before = self.rev()
                    go()
                    self.assertNotEqual(self.rev(), before, f'{name} não mudou o rev')
                finally:
                    transaction.savepoint_rollback(sid)
                    cache.clear()
                    for obj in (self.camp, self.m1, self.m2, self.dagna, self.velna, self.p1.profile):
                        obj.refresh_from_db()

    def test_hiding_the_card_on_screen_changes_rev(self):
        """O cartão na Tela ocultado depois (o GET completo passa a dizer `gone`)."""
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/stage',
                           {'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}}, format='json')
        self.assertEqual(r.status_code, 200)
        before = self.rev()
        self.velna.visibility = 'hidden'
        self.touch(self.velna)
        self.assertNotEqual(self.rev(), before)
        self.assertTrue(self.full()['stage']['front'].get('gone'))

    def test_a_check_or_world_edit_does_not_change_rev(self):
        """O que não está no GET completo vai nas outras versões (sem GET completo à toa)."""
        p0 = self.pulse().json()
        WorldEntry.objects.create(campaign=self.camp, kind='place', name='Vale', visibility='hidden')
        CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Percepção')
        p1 = self.pulse().json()
        self.assertEqual(p1['rev'], p0['rev'])
        self.assertNotEqual(p1['worldRev'], p0['worldRev'])
        self.assertNotEqual(p1['checksRev'], p0['checksRev'])


class OtherRevTests(Base):
    def test_checks_rev_follows_checks_responses_and_rolls(self):
        revs = [self.pulse().json()['checksRev']]
        cr = CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Percepção', dc=13)
        revs.append(self.pulse().json()['checksRev'])
        CheckResponse.objects.create(check_request=cr, user=self.p1, character=self.dagna, total=14, natural=12)
        revs.append(self.pulse().json()['checksRev'])
        rr = RollRequest.objects.create(campaign=self.camp, requested_by=self.p1, character=self.dagna, label='Atletismo')
        revs.append(self.pulse().json()['checksRev'])
        rr.status = 'public'; rr.total = 18; rr.resolved_at = timezone.now(); rr.save()
        revs.append(self.pulse().json()['checksRev'])
        cr.status = 'closed'; cr.closed_at = timezone.now(); cr.save()
        revs.append(self.pulse().json()['checksRev'])
        self.assertEqual(len(set(revs)), len(revs), revs)
        p = self.pulse().json()
        self.assertEqual(p['counts']['openChecks'], 0)
        self.assertEqual(p['screen']['roll']['who'], 'Dagna')
        self.assertEqual(p['screen']['roll']['total'], 18)

    def test_table_rolls_have_their_own_rev(self):
        """V15: as rolagens de mesa (`@mesa:`; a da ficha é o gesto mais frequente do
        jogador) não mudam o checksRev — o mestre não busca Testes de novo a cada
        rolagem — e mudam o tableRollsRev (Últimas 5 e Testes › 🎲 Na Tela)."""
        p0 = self.pulse().json()
        r = self.c_p1.post(f'/api/characters/{self.dagna.id}/table-roll', {
            'label': 'Percepção', 'dice': [{'die': 'd20', 'value': 12}], 'modifier': 3, 'total': 15}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        p1 = self.pulse().json()
        self.assertEqual(p1['checksRev'], p0['checksRev'])
        self.assertNotEqual(p1['tableRollsRev'], p0['tableRollsRev'])
        self.assertEqual((p1['screen']['roll']['kind'], p1['screen']['roll']['who']), ('sheet', 'Dagna'))
        # o 🎲 do mestre (🔒 Só eu também) e a arrumação: só o tableRollsRev
        table_rolls.record(self.camp, self.dm, 'dm', label='d20', rolls=[{'value': 4}], total=4, public=False)
        p2 = self.pulse().json()
        self.assertEqual(p2['checksRev'], p0['checksRev'])
        self.assertNotEqual(p2['tableRollsRev'], p1['tableRollsRev'])
        # um pedido de rolagem (novo, cancelado) continua no checksRev, e não no das de mesa
        rr = RollRequest.objects.create(campaign=self.camp, requested_by=self.p1, character=self.dagna, label='Atletismo')
        p3 = self.pulse().json()
        self.assertNotEqual(p3['checksRev'], p2['checksRev'])
        self.assertEqual(p3['tableRollsRev'], p2['tableRollsRev'])
        self.assertEqual(p3['counts']['pendingRolls'], 1)
        rr.status = 'cancelled'; rr.save()
        p4 = self.pulse().json()
        self.assertNotEqual(p4['checksRev'], p3['checksRev'])
        self.assertEqual(p4['tableRollsRev'], p3['tableRollsRev'])
        # a arrumação das velhas (só de mesa) muda o das de mesa e não o dos testes
        table_rolls.prune(self.camp.id, keep=1)
        p5 = self.pulse().json()
        self.assertEqual(p5['checksRev'], p4['checksRev'])
        self.assertNotEqual(p5['tableRollsRev'], p4['tableRollsRev'])
        # o SQL pronto e o ORM (outro banco) contam igual
        sql, orm = views_pulse._campaign_row(self.camp.id), views_pulse._campaign_row_orm(str(self.camp.id))
        for k in ('rolls_n', 'rolls_pending', 'mesa_n', 'mesa_max'):
            self.assertEqual(sql[k], orm[k], k)
        self.assertEqual((sql['rolls_n'], sql['mesa_n']), (2, 1))

    def test_table_rolls_rev_without_any_roll(self):
        # com o cursor de depuração (DEBUG=True, como no runserver): o `%` do LIKE escapado
        with CaptureQueriesContext(connection):
            self.assertEqual(self.pulse().status_code, 200)
        sql, orm = views_pulse._campaign_row(self.camp.id), views_pulse._campaign_row_orm(str(self.camp.id))
        self.assertEqual((sql['mesa_n'], sql['mesa_max']), (0, None))
        self.assertEqual(orm['mesa_max'], None)
        self.assertIsNone(self.pulse().json()['screen']['roll'])

    def test_plan_rev_changes_when_the_plan_is_saved(self):
        p0 = self.pulse().json()['planRev']
        r = self.c_dm.put(f'/api/campaigns/{self.camp.id}/session-plan', {'plan': {'strongStart': 'O sino toca.'}},
                          format='json')
        self.assertEqual(r.status_code, 200, r.content)
        p1 = self.pulse().json()
        self.assertNotEqual(p1['planRev'], p0)
        self.assertEqual(p1['rev'], self.pulse().json()['rev'])

    def test_adv_rev(self):
        a0 = self.pulse().json()['advRev']
        Adventure.objects.create(campaign=self.camp, name='O Sino Afogado', data={'nodes': [], 'edges': []})
        self.assertNotEqual(self.pulse().json()['advRev'], a0)

    def test_shown_test_counts_targets_and_answers(self):
        cr = CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Percepção', dc=13,
                                         show_on_screen=True, screen_at=timezone.now())
        CheckResponse.objects.create(check_request=cr, user=self.p1, character=self.dagna, total=14, natural=12)
        t = self.pulse().json()['screen']['test']
        self.assertEqual(t, {'id': cr.id, 'label': 'Percepção', 'done': 1, 'total': 2})
        cr.target_user_ids = [self.p2.id]; cr.save()
        self.assertEqual(self.pulse().json()['screen']['test']['total'], 1)


class CombatSummaryTests(Base):
    def test_turn_next_acted_and_dangers(self):
        CombatInstance.objects.create(campaign=self.camp, active=True, round_number=2, turn_index=2, combatants=[
            {'id': 'p', 'name': 'Pipo', 'type': 'pc', 'current_hp': 9, 'stats': {'max_hp': 9}},
            {'id': 'g1', 'name': 'Goblin #1', 'type': 'monster', 'current_hp': 0, 'stats': {'max_hp': 10}, 'defeated': True},
            {'id': 'g2', 'name': 'Goblin #2', 'type': 'monster', 'current_hp': 3, 'stats': {'max_hp': 10}},
            {'id': 'd', 'name': 'Dagna', 'type': 'pc', 'current_hp': 0, 'stats': {'max_hp': 10}},
        ])
        c = self.pulse().json()['combat']
        self.assertTrue(c['active'])
        self.assertEqual((c['round'], c['turnIndex'], c['turnName'], c['turnHp']), (2, 2, 'Goblin #2', '3/10'))
        self.assertEqual(c['nextName'], 'Dagna')
        self.assertEqual((c['acted'], c['count']), (2, 4))
        self.assertFalse(c['allMonstersDown'])
        self.assertEqual([o['acted'] for o in c['order']], [True, True, False, False])
        self.assertEqual([o['defeated'] for o in c['order']], [False, True, False, True])
        self.assertEqual(self.pulse().json()['counts']['dangers'], 1)

    def test_all_monsters_down(self):
        CombatInstance.objects.create(campaign=self.camp, active=True, combatants=[
            {'id': 'p', 'name': 'Pipo', 'type': 'pc', 'current_hp': 9, 'stats': {'max_hp': 9}},
            {'id': 'g1', 'name': 'Goblin', 'type': 'monster', 'current_hp': 0, 'stats': {'max_hp': 10}},
        ])
        self.assertTrue(self.pulse().json()['combat']['allMonstersDown'])

    def test_set_up_but_paused(self):
        CombatInstance.objects.create(campaign=self.camp, active=False, combatants=[
            {'id': 'g1', 'name': 'Goblin', 'type': 'monster', 'current_hp': 7, 'stats': {'max_hp': 7}}])
        c = self.pulse().json()['combat']
        self.assertFalse(c['active'])
        self.assertEqual(c['count'], 1)
        self.assertTrue(c['setup'])
        self.assertIsNone(c['turnName'] or None)
        # encerrado na rodada 3: não é "montado" (a barra não oferece ▶ Iniciar)
        CombatInstance.objects.filter(campaign=self.camp).update(round_number=3, turn_index=2)
        self.assertFalse(self.pulse().json()['combat']['setup'])

    def test_python_fallback_matches_json_each(self):
        CombatInstance.objects.create(campaign=self.camp, active=True, round_number=1, turn_index=1, combatants=[
            {'id': 'p', 'name': 'Pipo', 'type': 'pc', 'current_hp': 9, 'stats': {'max_hp': 9}},
            {'id': 'g', 'name': 'Goblin', 'type': 'monster', 'current_hp': 5, 'stats': {'max_hp': 7}}])
        sql = views_pulse._combat_rows(self.camp.id)
        with mock.patch.object(views_pulse.connection, 'vendor', 'postgresql'):
            py = views_pulse._combat_rows(self.camp.id)
        a, b = views_pulse.combat_summary(sql), views_pulse.combat_summary(py)
        a.pop('ver'); b.pop('ver')
        self.assertEqual(a, b)

    def test_combat_ver_changes_with_the_combat(self):
        c = CombatInstance.objects.create(campaign=self.camp, active=True, combatants=[
            {'id': 'g', 'name': 'Goblin', 'type': 'monster', 'current_hp': 7, 'stats': {'max_hp': 7}}])
        v0 = self.pulse().json()['combat']['ver']
        c.combatants = [{**c.combatants[0], 'current_hp': 2}]
        self.touch(c)
        self.assertNotEqual(self.pulse().json()['combat']['ver'], v0)

    def test_combat_ver_is_the_combat_updated_at(self):
        # O app compara pulse.combat.ver com o updatedAt do combate que já tem:
        # o mesmo texto nos dois (senão cada Próximo turno buscaria o combate 2× a mais).
        CombatInstance.objects.create(campaign=self.camp, active=True, combatants=[
            {'id': 'g', 'name': 'Goblin', 'type': 'monster', 'current_hp': 7, 'stats': {'max_hp': 7}}])
        full = self.c_dm.get(f'/api/combat/campaign/{self.camp.id}').json()['combat']
        self.assertEqual(self.pulse().json()['combat']['ver'], full['updatedAt'])
        with mock.patch.object(views_pulse.connection, 'vendor', 'postgresql'):   # plano B (sem json_each)
            self.assertEqual(views_pulse._combat_rows(self.camp.id)[3], full['updatedAt'])


class TvLiveTests(Base):
    def screen(self, query=''):
        return self.anon.get(f'/api/screen/{self.camp.screen_token}{query}')

    def test_the_tv_counts_and_the_preview_does_not(self):
        self.assertEqual(self.pulse().json()['screen']['tvLive'], 0)
        self.screen('?preview=1')
        self.screen('?tv=1&c=abc&preview=1')
        self.screen()                                  # sem ?tv=1 (TV antiga): não conta
        self.assertEqual(self.pulse().json()['screen']['tvLive'], 0)
        self.screen('?tv=1&c=sala-tv')
        self.screen('?tv=1&c=sala-tv')                 # a mesma aba conta uma vez
        self.screen('?tv=1&c=tablet_2')
        self.assertEqual(self.pulse().json()['screen']['tvLive'], 2)
        self.screen('?tv=1&c=<script>')                # id inválido não entra
        self.assertEqual(self.pulse().json()['screen']['tvLive'], 2)

    def test_a_closed_tv_stops_counting_after_30s(self):
        self.screen('?tv=1&c=sala')
        self.assertEqual(views_pulse.tv_count(self.camp.id), 1)
        with mock.patch.object(views_pulse.time, 'time', return_value=time.time() + views_pulse.TV_TTL + 1):
            self.assertEqual(views_pulse.tv_count(self.camp.id), 0)

    def test_no_db_write(self):
        before = Campaign.objects.get(pk=self.camp.pk).updated_at
        self.screen('?tv=1&c=sala')
        self.assertEqual(Campaign.objects.get(pk=self.camp.pk).updated_at, before)


# ------------------------------------------------------------------ V13 · pulso do jogador
class PlayerBase(Base):
    def prev(self, client=None):
        r = self.pulse(client or self.c_p1)
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def rev(self):
        return self.prev()['rev']

    def full(self):
        r = self.c_p1.get(f'/api/campaigns/{self.camp.id}')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['campaign']


class PlayerPulseTests(PlayerBase):
    """§8.3: o pulso do jogador substitui o GET completo (2,5 s) e a lista de testes (3 s)."""

    KEYS = {'rev', 'checksRev', 'rollsRev', 'now', 'live', 'session', 'scene', 'closed', 'combat', 'counts'}

    def test_never_a_dm_only_field(self):
        """Aceite 3: sem PV numérico de monstro, sem sceneId, sem plano, sem cartão oculto, sem stage.prev."""
        torre = WorldEntry.objects.create(campaign=self.camp, kind='place', name='Torre Oculta', visibility='hidden',
                                          image_ver='torre1')
        WorldImage.objects.create(entry=torre, data='data:image/png;base64,iVBORw0KGgpzdGFnZQ==')
        r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}/state', {'patch': {'nudges': {'x': 'NOTA-DO-MESTRE'}}},
                            format='json')
        self.assertEqual(r.status_code, 200, r.content)
        # `sceneId` (a cena do plano em jogo, V7): gravado direto, para valer com ou sem a V7
        self.camp.refresh_from_db()
        self.camp.state = {**self.camp.state, 'sceneId': 'cena-secreta-42'}
        self.camp.save()
        self.c_dm.put(f'/api/campaigns/{self.camp.id}/session-plan',
                      {'plan': {'strongStart': 'SEGREDO-DO-PLANO'}}, format='json')
        # a frente "só a imagem" de um cartão oculto (o nome fica no `label`, só do mestre) e um ↶ (prev)
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/stage',
                           {'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/stage',
                           {'op': 'show', 'target': {'kind': 'image', 'ref': {'entryId': torre.id}}}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']['stage']['front']['label'],
                         'Torre Oculta')
        Approval.objects.create(campaign=self.camp, character=self.dagna, requested_by=self.p1, type='levelup')
        CombatInstance.objects.create(campaign=self.camp, active=True, round_number=2, turn_index=0, combatants=[
            {'id': 'g', 'name': 'Goblin Chefe', 'type': 'monster', 'current_hp': 17, 'stats': {'max_hp': 23, 'ac': 15}},
            {'id': 'd', 'name': 'Dagna', 'type': 'pc', 'character_id': self.dagna.id, 'current_hp': 9,
             'stats': {'max_hp': 12}}])
        r = self.pulse(self.c_p1)
        p = r.json()
        self.assertEqual(set(p), self.KEYS)
        self.assertEqual(set(p['combat']), {'active', 'round', 'turnName', 'nextName', 'isMine', 'nextIsMine'})
        self.assertEqual(set(p['counts']), {'openChecks', 'pendingRolls'})
        raw = r.content.decode('utf-8')
        for secret in ('Torre Oculta', 'cena-secreta-42', 'NOTA-DO-MESTRE', 'SEGREDO-DO-PLANO', '"sceneId"', '"prev"',
                       '"label"', '"turnHp"', '"planRev"', '"approvals"', '"dangers"', '"stage"', '"screen"', '"order"',
                       '"hp"', '"current_hp"', '"ver"'):
            self.assertNotIn(secret, raw, secret)

        def numbers(v):
            if isinstance(v, dict):
                return [n for x in v.values() for n in numbers(x)]
            return [v] if isinstance(v, int) and not isinstance(v, bool) else []
        # números só a rodada e as contas dele (nem 17/23 de PV, nem 15 de CA, nem 1 aprovação)
        self.assertEqual(sorted(numbers(p)), [0, 0, 2])
        self.assertEqual((p['combat']['turnName'], p['combat']['nextName'], p['combat']['round']),
                         ('Goblin Chefe', 'Dagna', 2))
        self.assertEqual((p['combat']['isMine'], p['combat']['nextIsMine']), (False, True))
        # o mestre continua com tudo
        dm = self.pulse().json()
        self.assertEqual(dm['sceneId'], 'cena-secreta-42')
        self.assertEqual(dm['combat']['turnHp'], '17/23')

    def test_small_304_and_no_heavy_data(self):
        self.dagna.data = {**self.dagna.data, 'avatar': 'data:image/png;base64,' + 'A' * 50_000}
        self.dagna.save()
        CombatInstance.objects.create(campaign=self.camp, active=True, combatants=[
            {'id': 'a', 'name': 'Goblin', 'type': 'monster', 'current_hp': 7, 'stats': {'max_hp': 7},
             'sprite': 'data:image/png;base64,' + 'B' * 50_000}], map_data={'background_image': 'C' * 50_000})
        r = self.pulse(self.c_p1)
        self.assertLess(len(r.content), 600)
        self.assertNotIn(b'base64', r.content)
        self.assertEqual(self.pulse(self.c_p1, HTTP_IF_NONE_MATCH=r['ETag']).status_code, 304)
        # a mesma campanha: o ETag do jogador não é o do mestre
        self.assertNotEqual(self.pulse()['ETag'], r['ETag'])

    def test_whose_turn(self):
        c = CombatInstance.objects.create(campaign=self.camp, active=True, round_number=3, turn_index=1, combatants=[
            {'id': 'g', 'name': 'Goblin #2', 'type': 'monster', 'current_hp': 4, 'stats': {'max_hp': 7}},
            {'id': 'd', 'name': 'Dagna', 'type': 'pc', 'character_id': self.dagna.id, 'current_hp': 9},
            {'id': 'x', 'name': 'Goblin #1', 'type': 'monster', 'current_hp': 0, 'defeated': True},
            {'id': 'e', 'name': 'Elarion', 'type': 'pc', 'character_id': self.elarion.id, 'current_hp': 8}])
        ana, bruno = self.prev()['combat'], self.prev(self.c_p2())['combat']
        self.assertEqual(ana, {'active': True, 'round': 3, 'turnName': 'Dagna', 'nextName': 'Elarion',
                               'isMine': True, 'nextIsMine': False})
        self.assertEqual((bruno['isMine'], bruno['nextIsMine']), (False, True))
        # parado (montado ou encerrado): sem faixa
        c.active = False; self.touch(c)
        self.assertIsNone(self.prev()['combat'])
        c.delete()
        self.assertIsNone(self.prev()['combat'])

    def c_p2(self):
        c = APIClient(); c.force_login(self.p2)
        return c

    def test_checks_rev_follows_only_his_checks_and_answers(self):
        p0 = self.prev()
        self.assertEqual(p0['counts'], {'openChecks': 0, 'pendingRolls': 0})
        # um teste só para o Bruno: a Mesa da Ana não busca nada
        other = CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Furtividade',
                                            target_user_ids=[self.p2.id])
        self.assertEqual(self.prev()['checksRev'], p0['checksRev'])
        CheckResponse.objects.create(check_request=other, user=self.p2, character=self.elarion, total=9, natural=7)
        self.assertEqual(self.prev()['checksRev'], p0['checksRev'])
        # um teste para todos: muda, e conta 1 aberto sem resposta
        cr = CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Percepção', dc=13)
        p1 = self.prev()
        self.assertNotEqual(p1['checksRev'], p0['checksRev'])
        self.assertEqual(p1['counts']['openChecks'], 1)
        # a resposta do Bruno nesse teste não muda o da Ana; a dela muda
        CheckResponse.objects.create(check_request=cr, user=self.p2, character=self.elarion, total=11, natural=9)
        self.assertEqual(self.prev()['checksRev'], p1['checksRev'])
        r = self.c_p1.post(f'/api/checks/{cr.id}/respond', {'mode': 'physical', 'total': 15}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        p2 = self.prev()
        self.assertNotEqual(p2['checksRev'], p1['checksRev'])
        self.assertEqual(p2['counts']['openChecks'], 0)
        # Corrigir (o mesmo teste, outro total) e o mestre encerrar também mudam
        time.sleep(0.002)
        self.c_p1.post(f'/api/checks/{cr.id}/respond', {'mode': 'physical', 'total': 16}, format='json')
        p3 = self.prev()
        self.assertNotEqual(p3['checksRev'], p2['checksRev'])
        self.c_dm.post(f'/api/checks/{cr.id}/close')
        self.assertNotEqual(self.prev()['checksRev'], p3['checksRev'])
        # nada disso é do GET completo: o rev não mexe
        self.assertEqual(self.prev()['rev'], p0['rev'])

    def test_rolls_rev_follows_his_pending_requests(self):
        p0 = self.prev()
        RollRequest.objects.create(campaign=self.camp, requested_by=self.p2, character=self.elarion, label='Atletismo')
        self.assertEqual(self.prev()['rollsRev'], p0['rollsRev'])
        rr = RollRequest.objects.create(campaign=self.camp, requested_by=self.p1, character=self.dagna, label='Atletismo')
        p1 = self.prev()
        self.assertNotEqual(p1['rollsRev'], p0['rollsRev'])
        self.assertEqual(p1['counts']['pendingRolls'], 1)
        rr.status = 'public'; rr.total = 12; rr.resolved_at = timezone.now(); rr.save()
        p2 = self.prev()
        self.assertEqual(p2['rollsRev'], p0['rollsRev'])
        self.assertEqual(p2['counts']['pendingRolls'], 0)

    def test_light_queries(self):
        """Parado e sem testes/pedidos: 5 consultas (sessão, usuário, campanha, vagas, combate)."""
        self.prev()
        with CaptureQueriesContext(connection) as ctx:
            self.prev()
        self.assertLessEqual(len(ctx), 6, [q['sql'][:90] for q in ctx])


class PlayerRevCoverageTests(PlayerBase):
    """Cada campo do GET completo do JOGADOR tem uma fonte de `rev` (como o do mestre)."""

    IMMUTABLE = {'id', 'dmId', 'role', 'created_at'}
    DM_ONLY = {'onboarding', 'advancedDice', 'lang', 'fogHint', 'inviteCode', 'screenToken', 'pendingApprovals',
               'tableSlots', '+tableSlots:plan'}

    def mutations(self):
        muts = {k: v for k, v in RevCoverageTests.mutations(self).items() if k not in self.DM_ONLY}

        def reveal():
            WorldEntry.objects.create(campaign=self.camp, kind='npc', name='Bruxa', visibility='revealed',
                                      revealed_at=timezone.now())

        def visit():
            r = self.c_p1.post(f'/api/campaigns/{self.camp.id}/world/seen')
            self.assertEqual(r.status_code, 200, r.content)

        muts.update({'worldNewCount': reveal, '+worldNewCount:visit': visit})
        return muts

    def test_every_player_field_has_a_rev_source(self):
        fields = set(self.full().keys())
        covered = {k for k in self.mutations() if not k.startswith('+')} | self.IMMUTABLE
        self.assertEqual(fields - covered, set(), 'campo do GET do jogador sem fonte de rev no pulso')

    def test_each_mutation_changes_rev(self):
        for name, go in self.mutations().items():
            with self.subTest(field=name):
                sid = transaction.savepoint()
                try:
                    before = self.rev()
                    go()
                    self.assertNotEqual(self.rev(), before, f'{name} não mudou o rev do jogador')
                finally:
                    transaction.savepoint_rollback(sid)
                    cache.clear()
                    for obj in (self.camp, self.m1, self.m2, self.dagna, self.velna, self.p1.profile):
                        obj.refresh_from_db()

    def test_hiding_the_card_on_screen_changes_rev(self):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/stage',
                           {'op': 'show', 'target': {'kind': 'card', 'entryId': self.velna.id}}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.full()['stage']['front']['title'], 'Irmã Velna')
        before = self.rev()
        self.velna.visibility = 'hidden'
        self.touch(self.velna)
        self.assertNotEqual(self.rev(), before)
        self.assertIsNone(self.full()['stage']['front'])

    def test_what_is_not_in_his_get_does_not_change_rev(self):
        """O plano, um teste, o turno do combate e a visita de OUTRO jogador ao Mundo."""
        c = CombatInstance.objects.create(campaign=self.camp, active=True, combatants=[
            {'id': 'g', 'name': 'Goblin', 'type': 'monster', 'current_hp': 7, 'stats': {'max_hp': 7}},
            {'id': 'd', 'name': 'Dagna', 'type': 'pc', 'character_id': self.dagna.id, 'current_hp': 9}])
        p0 = self.prev()
        self.c_dm.put(f'/api/campaigns/{self.camp.id}/session-plan', {'plan': {'strongStart': 'O sino.'}}, format='json')
        CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Percepção')
        c.turn_index = 1; c.combatants = [{**c.combatants[0], 'current_hp': 3}, c.combatants[1]]; self.touch(c)
        bruno = APIClient(); bruno.force_login(self.p2)
        bruno.post(f'/api/campaigns/{self.camp.id}/world/seen')
        p1 = self.prev()
        self.assertEqual(p1['rev'], p0['rev'])
        self.assertTrue(p1['combat']['isMine'])          # a vez mudou no pulso, sem GET completo
