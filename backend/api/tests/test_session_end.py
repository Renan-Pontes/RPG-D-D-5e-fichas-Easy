"""Encerrar a sessão (V12): POST …/diary/sessions/:n/end numa chamada só, o plano arquivado
na Crônica (oculto, sem o `data.plan` na lista), "Começar o plano da Sessão N+1" e Restaurar."""
import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from api import world_rules as R
from api.models import Campaign, Character, CheckRequest, CombatInstance, DiaryEntry, Membership, Profile

User = get_user_model()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


PLAN = {
    'forSession': 4, '_rev': 7, 'strongStart': 'O sino toca embaixo d’água.',
    'scenes': [
        {'id': 'c1', 'text': 'Taverna', 'nodeRef': None, 'done': True},
        {'id': 'c2', 'text': 'Ponte velha', 'nodeRef': None, 'done': False, 'read': 'A ponte range.',
         'check': {'kind': 'skill', 'key': 'perception', 'dc': 15}},
        {'id': 'c3', 'text': 'Capela', 'nodeRef': None, 'done': False},
        {'id': 'c4', 'text': '', 'nodeRef': None, 'done': False},
    ],
    'secrets': [
        {'id': 'p1', 'text': 'O taverneiro era o padrinho', 'ref': None, 'discovered': True},
        {'id': 'p2', 'text': 'O sino só para com o sangue do noivo', 'ref': None, 'discovered': False},
    ],
    'npcIds': [2, 3], 'placeIds': [1], 'monsters': '2 goblins', 'rewards': '120 po',
}


class EndBase(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.player = make_user('p@x.com', 'Ana')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        started = (timezone.now() - timedelta(hours=2, minutes=10, seconds=5)).isoformat()
        self.camp = Campaign.objects.create(
            dm=self.dm, name='C', slug='c',
            state={'session': '4', 'live': True, 'scene': 'Ponte velha', 'sceneId': 'c2',
                   'diarySessions': {'4': {'title': '', 'startedAt': started, 'shown': [{'t': 'Borin', 'k': 'card'}]}},
                   'stage': {'v': 1, 'bg': 'auto', 'front': {'kind': 'text', 'text': 'Oi', 'label': 'Oi'}, 'focus': True,
                             'prev': None, 'prefs': {}}},
            dm_settings={'sessionPlan': json.loads(json.dumps(PLAN))})
        self.char = Character.objects.create(owner=self.player, name='Pipo', data={'name': 'Pipo', 'level': 1})
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char)
        self.end_url = f'/api/campaigns/{self.camp.slug}/diary/sessions/4/end'
        self.diary = f'/api/campaigns/{self.camp.slug}/diary'

    def end(self, client=None, **body):
        return (client or self.c_dm).post(self.end_url, body, format='json')

    def fresh(self):
        self.camp.refresh_from_db()
        return self.camp


class EndSessionTests(EndBase):
    def test_one_call_tidies_the_table_and_records_the_end(self):
        CombatInstance.objects.create(campaign=self.camp, active=True, round_number=3, combatants=[
            {'id': 'a', 'name': 'Goblin #1', 'type': 'monster', 'current_hp': 0, 'max_hp': 7, 'defeated': True},
            {'id': 'b', 'name': 'Goblin #2', 'type': 'monster', 'current_hp': 7, 'max_hp': 7},
            {'id': 'c', 'name': 'Pipo', 'type': 'pc', 'current_hp': 9, 'max_hp': 9}])
        shown = CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Percepção', key='perception',
                                            dc=15, show_on_screen=True, screen_at=timezone.now())
        CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Furtividade', status='closed',
                                    show_on_screen=False)
        r = self.end()
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        self.assertEqual(body['ended'], {'combat': True, 'checks': 1, 'stage': True, 'moments': 0})
        self.assertEqual(body['session']['length'], '2h10')
        camp = self.fresh()
        self.assertFalse(camp.state['live'])
        self.assertTrue(camp.state['diarySessions']['4']['endedAt'])
        self.assertEqual(camp.state['diarySessions']['4']['shown'], [{'t': 'Borin', 'k': 'card'}])
        self.assertIsNone(camp.state['stage']['front'])
        self.assertEqual(camp.state['stage']['bg'], 'auto')
        self.assertEqual(camp.state['stage']['prev']['front']['kind'], 'text')   # ↶ Desfazer volta ao de antes
        self.assertEqual(camp.state['scene'], 'Ponte velha')                     # "Continuar de onde paramos"
        self.assertFalse(CombatInstance.objects.get(campaign=camp).active)
        shown.refresh_from_db()
        self.assertEqual((shown.status, shown.show_on_screen), ('closed', False))
        titles = list(DiaryEntry.objects.filter(campaign=camp).order_by('occurred_at', 'id').values_list('subtype', 'title'))
        self.assertEqual(titles[-1], ('session', 'Sessão 4 terminou · 2h10'))
        self.assertIn(('combat', 'Combate encerrado'), titles)
        last = DiaryEntry.objects.filter(campaign=camp, subtype='session').latest('id')
        self.assertEqual((last.session, last.data['phase'], last.data['length']), (4, 'end', '2h10'))
        # a TV pública volta à capa sem o painel do teste
        scr = APIClient().get(f'/api/screen/{camp.screen_token}').json()
        self.assertIsNone(scr['stage']['overlays']['test'])
        self.assertIsNone(scr['stage']['front'])
        self.assertIsNone(scr['card'])
        self.assertFalse(scr['combat']['active'])

    def test_twice_does_nothing_new(self):
        self.assertEqual(self.end().status_code, 200)
        n = DiaryEntry.objects.filter(campaign=self.camp).count()
        r = self.end()
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['already'])
        self.assertEqual(DiaryEntry.objects.filter(campaign=self.camp).count(), n)

    def test_only_the_current_session(self):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.slug}/diary/sessions/3/end', {}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json(), {'error': 'not_current_session', 'currentSession': 4})

    def test_player_and_closed_campaign(self):
        self.assertEqual(self.end(self.c_p).status_code, 403)
        Campaign.objects.filter(pk=self.camp.pk).update(status='closed')
        self.assertEqual(self.end().status_code, 423)

    def test_bad_flags(self):
        self.assertEqual(self.end(carry='sim').status_code, 400)
        self.assertEqual(self.end(moments=[{'charId': 'x'}]).status_code, 400)
        self.assertTrue(self.fresh().state['live'])

    def test_flags_off_keep_things(self):
        CombatInstance.objects.create(campaign=self.camp, active=True, round_number=2, combatants=[])
        CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Percepção')
        r = self.end(endCombat=False, clearStage=False, closeChecks=False)
        self.assertEqual(r.json()['ended'], {'combat': False, 'checks': 0, 'stage': False, 'moments': 0})
        camp = self.fresh()
        self.assertTrue(CombatInstance.objects.get(campaign=camp).active)
        self.assertEqual(camp.state['stage']['front']['kind'], 'text')
        self.assertEqual(CheckRequest.objects.filter(campaign=camp, status='open').count(), 1)
        self.assertEqual(camp.dm_settings['sessionPlan']['forSession'], 4)   # sem "Levar", o plano fica

    def test_carry_archives_the_plan_and_carries_what_is_left(self):
        r = self.end(carry=True)
        body = r.json()
        self.assertEqual(body['archived']['session'], 4)
        plan = self.fresh().dm_settings['sessionPlan']
        self.assertEqual(plan['forSession'], 5)
        self.assertEqual(plan['_rev'], 8)
        self.assertEqual([s['id'] for s in plan['scenes']], ['c2', 'c3'])   # a cena "agora" (c2) não foi feita
        self.assertEqual(plan['scenes'][0]['check'], {'kind': 'skill', 'key': 'perception', 'dc': 15})
        self.assertEqual([s['id'] for s in plan['secrets']], ['p2'])
        self.assertEqual((plan['npcIds'], plan['placeIds'], plan['strongStart'], plan['rewards']), ([2, 3], [1], '', ''))
        self.assertEqual(body['plan']['forSession'], 5)
        entry = DiaryEntry.objects.get(campaign=self.camp, subtype='plan')
        self.assertTrue(entry.hidden)
        self.assertEqual((entry.session, entry.kind), (4, 'event'))
        self.assertEqual(entry.data['plan']['strongStart'], PLAN['strongStart'])
        self.assertEqual(entry.data['sceneId'], 'c2')
        self.assertEqual(entry.data['counts'], {'scenes': 3, 'played': 2, 'clues': 2, 'found': 1})

    def test_carry_keeps_a_plan_already_for_the_next_session(self):
        Campaign.objects.filter(pk=self.camp.pk).update(dm_settings={'sessionPlan': {**PLAN, 'forSession': 5}})
        self.camp.refresh_from_db()
        r = self.end(carry=True)
        self.assertIsNone(r.json()['archived'])
        self.assertEqual(len(self.fresh().dm_settings['sessionPlan']['scenes']), 4)
        self.assertFalse(DiaryEntry.objects.filter(campaign=self.camp, subtype='plan').exists())

    def test_moments_happened_tonight(self):
        other = Character.objects.create(owner=self.dm, name='Fora', data={'name': 'Fora'})
        self.camp.dm_settings = {**self.camp.dm_settings, 'partyInsights': {'spotlights': {str(self.char.id): [
            {'id': 'm1', 'kind': 'shine', 'text': 'Abrir a fechadura', 'auto': None, 'done': None, 'plan': 'c2'}]}}}
        self.camp.save()
        r = self.end(moments=[{'charId': self.char.id, 'id': 'm1'}, {'charId': other.id, 'text': 'x'}])
        self.assertEqual(r.json()['ended']['moments'], 1)
        sp = self.fresh().dm_settings['partyInsights']['spotlights'][str(self.char.id)]
        self.assertEqual(sp[0]['done'], 4)
        self.assertNotIn(str(other.id), self.camp.dm_settings['partyInsights']['spotlights'])

    def test_moment_for_someone_without_one(self):
        r = self.end(moments=[{'charId': self.char.id, 'text': 'Teve um momento na Sessão 4'}])
        self.assertEqual(r.json()['ended']['moments'], 1)
        sp = self.fresh().dm_settings['partyInsights']['spotlights'][str(self.char.id)]
        self.assertEqual((sp[0]['kind'], sp[0]['text'], sp[0]['done']), ('shine', 'Teve um momento na Sessão 4', 4))


class PlanArchiveTests(EndBase):
    def test_list_leaves_the_plan_out_and_subtype_plan_brings_it(self):
        before = len(self.c_dm.get(self.diary).content)
        self.end(carry=True)
        listed = self.c_dm.get(self.diary)
        rows = listed.json()['entries']
        plan_row = next(e for e in rows if e['subtype'] == 'plan')
        self.assertNotIn('plan', plan_row['data'])
        self.assertEqual(plan_row['data']['counts']['scenes'], 3)
        self.assertNotIn('O sino toca', listed.content.decode())
        # o arquivo cresce a lista só com as linhas novas (o plano não vem)
        self.assertLess(len(listed.content) - before, 2000)
        full = self.c_dm.get(f'{self.diary}?subtype=plan&session=4').json()['entries']
        self.assertEqual(full[0]['data']['plan']['strongStart'], PLAN['strongStart'])

    def test_player_never_sees_the_plan(self):
        self.end(carry=True)
        rows = self.c_p.get(f'{self.diary}?subtype=plan').json()['entries']
        self.assertEqual(rows, [])
        self.assertNotIn('Ponte velha', json.dumps(self.c_p.get(self.diary).json()['entries']))
        entry = DiaryEntry.objects.get(campaign=self.camp, subtype='plan')
        r = self.c_dm.patch(f'{self.diary}/{entry.id}', {'hidden': False}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'plan_stays_hidden')

    def test_start_next_plan_from_the_menu(self):
        Campaign.objects.filter(pk=self.camp.pk).update(state={**self.camp.state, 'live': False})
        url = f'/api/campaigns/{self.camp.slug}/session-plan/archive'
        r = self.c_dm.post(url, {'carry': False, 'forSession': 5}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['archived']['session'], 4)
        plan = self.fresh().dm_settings['sessionPlan']
        self.assertEqual((plan['forSession'], plan['scenes'], plan['secrets'], plan['npcIds']), (5, [], [], []))
        # de novo, com o plano vazio: nada para arquivar, o arquivo da 4 fica
        r = self.c_dm.post(url, {'carry': True}, format='json')
        self.assertIsNone(r.json()['archived'])
        self.assertEqual(DiaryEntry.objects.filter(campaign=self.camp, subtype='plan').count(), 1)
        self.assertEqual(self.c_p.post(url, {}, format='json').status_code, 403)
        self.assertEqual(self.c_dm.post(url, {'carry': 'x'}, format='json').status_code, 400)

    def test_restore_brings_the_scenes_back_and_keeps_what_is_there(self):
        self.end(carry=True)
        put = self.c_dm.put(f'/api/campaigns/{self.camp.slug}/session-plan',
                            {'scenes': [*self.fresh().dm_settings['sessionPlan']['scenes'],
                                        {'id': 'c9', 'text': 'Nova', 'nodeRef': None, 'done': False}]}, format='json')
        self.assertEqual(put.status_code, 200)
        r = self.c_dm.post(f'/api/campaigns/{self.camp.slug}/session-plan/restore', {'session': 4}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        plan = self.fresh().dm_settings['sessionPlan']
        self.assertEqual([s['id'] for s in plan['scenes']], ['c1', 'c2', 'c3', 'c4', 'c9'])
        self.assertEqual(plan['forSession'], 5)
        self.assertEqual(plan['strongStart'], PLAN['strongStart'])
        self.assertEqual([s['id'] for s in r.json()['previous']['scenes']], ['c2', 'c3', 'c9'])
        self.assertNotIn('_rev', r.json()['previous'])
        missing = self.c_dm.post(f'/api/campaigns/{self.camp.slug}/session-plan/restore', {'session': 9}, format='json')
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(self.c_p.post(f'/api/campaigns/{self.camp.slug}/session-plan/restore', {'session': 4},
                                       format='json').status_code, 403)


class PlanRulesTests(TestCase):
    def test_leftovers_and_payload(self):
        left = R.plan_leftovers(PLAN)
        self.assertEqual([s['id'] for s in left['scenes']], ['c2', 'c3'])
        self.assertEqual([s['id'] for s in left['secrets']], ['p2'])
        data = R.archive_payload(PLAN, 4, 'c3')
        self.assertNotIn('_rev', data['plan'])
        self.assertEqual(data['counts']['played'], 2)
        self.assertTrue(R.plan_has_content({'npcIds': [1]}))
        self.assertFalse(R.plan_has_content({'secrets': [{'id': 'p1', 'text': ''}]}))

    def test_restore_too_large(self):
        big = {**PLAN, 'scenes': [{'id': f'c{i}', 'text': 'x' * 1000, 'done': False} for i in range(30)]}
        cur = {**PLAN, 'scenes': [], 'strongStart': 'y' * 4000, 'monsters': 'z' * 4000}
        out = R.restored_plan(cur, big)
        self.assertEqual(len(out['scenes']), 30)
        with self.assertRaises(R.WorldError):
            R.restored_plan({**cur, 'scenes': []}, {**big, 'secrets': [{'id': f'p{i}', 'text': 'w' * 1000} for i in range(30)]})
