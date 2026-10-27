"""
V4 · Pulso do mestre (GET /campaigns/:id/pulse, api/views_pulse.py).

O pulso substitui o GET completo no polling do mestre: a casca só busca o GET
completo quando o `rev` muda. Por isso o teste de COBERTURA abaixo confere,
campo a campo do GET completo do mestre, que uma mudança daquele campo muda o
`rev` (um campo novo no serializer sem fonte de `rev` quebra o teste).

Também: só o mestre (jogador 403, sem login 401/403), 304 parado, "TV
conectada" pelo cache em memória (a prévia do mestre não conta), o resumo do
combate da barra da mesa, `checksRev`, `planRev`, `worldRev` e `advRev`.
"""
import time
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import (Adventure, Approval, Campaign, CheckRequest, CheckResponse, Character, CombatInstance,
                        Membership, Plan, Profile, RollRequest, UserPlan, WorldEntry)
from api import views_pulse

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
    def test_only_the_dm(self):
        self.assertEqual(self.pulse().status_code, 200)
        self.assertEqual(self.pulse(self.c_p1).status_code, 403)
        self.assertIn(self.pulse(self.anon).status_code, (401, 403))

    def test_by_slug_and_404(self):
        self.assertEqual(self.c_dm.get('/api/campaigns/b/pulse').status_code, 200)
        self.assertEqual(self.c_dm.get('/api/campaigns/9999/pulse').status_code, 404)

    def test_304_when_nothing_changed_and_200_when_it_did(self):
        r = self.pulse()
        etag = r['ETag']
        self.assertIn('no-cache', r['Cache-Control'])
        r2 = self.pulse(HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(r2.status_code, 304)
        self.assertEqual(r2.content, b'')
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
