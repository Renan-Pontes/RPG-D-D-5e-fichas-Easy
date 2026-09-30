"""Diário da campanha: permissões, CRUD, sessões e eventos automáticos."""
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.diary import log_combat_end, log_combat_start, log_diary, current_session
from api.models import Approval, Campaign, Character, DiaryEntry, Membership, Profile

User = get_user_model()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class DiaryBase(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.player = make_user('p@x.com', 'Ana')
        self.player2 = make_user('p2@x.com', 'Bia')
        self.outsider = make_user('o@x.com', 'Fora')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.c_p2 = APIClient(); self.c_p2.force_login(self.player2)
        self.c_o = APIClient(); self.c_o.force_login(self.outsider)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c', state={'session': '3'})
        self.char = Character.objects.create(owner=self.player, name='Thal', data={
            'name': 'Thal', 'level': 2, 'className': 'druid', 'currentHp': 15, 'maxHp': 15, 'xp': 0,
            'abilities': {'str': 8, 'dex': 14, 'con': 12, 'int': 13, 'wis': 16, 'cha': 10}})
        self.char2 = Character.objects.create(owner=self.player2, name='Kor', data={'name': 'Kor', 'level': 1, 'className': 'fighter'})
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char)
        Membership.objects.create(campaign=self.camp, user=self.player2, character=self.char2)
        self.url = f'/api/campaigns/{self.camp.slug}/diary'

    def note(self, client, **body):
        return client.post(self.url, {'body': 'texto', **body}, format='json')


class DiaryPermissionTests(DiaryBase):
    def test_outsider_cannot_read_or_write(self):
        self.assertEqual(self.c_o.get(self.url).status_code, 403)
        self.assertEqual(self.note(self.c_o).status_code, 403)

    def test_player_note_goes_to_current_session(self):
        r = self.note(self.c_p, title='Pista')
        self.assertEqual(r.status_code, 201, r.content)
        e = r.json()['entry']
        self.assertEqual((e['session'], e['kind'], e['subtype'], e['canEdit']), (3, 'note', 'note', True))

    def test_player_cannot_hide_or_write_summary(self):
        self.assertEqual(self.note(self.c_p, hidden=True).status_code, 403)
        self.assertEqual(self.note(self.c_p, subtype='summary').status_code, 403)
        self.assertEqual(self.note(self.c_p, session=1).status_code, 403)

    def test_empty_note_rejected(self):
        r = self.c_p.post(self.url, {'body': '  '}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'empty_note')

    def test_hidden_entries_invisible_to_players(self):
        self.note(self.c_dm, body='segredo', hidden=True)
        self.note(self.c_dm, body='aberto')
        self.assertEqual(len(self.c_dm.get(self.url).json()['entries']), 2)
        bodies = [e['body'] for e in self.c_p.get(self.url).json()['entries']]
        self.assertEqual(bodies, ['aberto'])

    def test_player_edits_only_own_notes(self):
        mine = self.note(self.c_p).json()['entry']['id']
        other = self.note(self.c_p2).json()['entry']['id']
        r = self.c_p.patch(f'{self.url}/{mine}', {'body': 'novo'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['entry']['body'], 'novo')
        self.assertIsNotNone(r.json()['entry']['editedAt'])
        self.assertEqual(self.c_p.patch(f'{self.url}/{other}', {'body': 'x'}, format='json').status_code, 403)
        self.assertEqual(self.c_p.delete(f'{self.url}/{other}').status_code, 403)
        self.assertEqual(self.c_p.patch(f'{self.url}/{mine}', {'hidden': True}, format='json').status_code, 403)
        self.assertEqual(self.c_p.delete(f'{self.url}/{mine}').status_code, 200)
        self.assertFalse(DiaryEntry.objects.filter(pk=mine).exists())

    def test_player_cannot_touch_events(self):
        e = log_diary(self.camp, 'custom', 'Evento')
        self.assertEqual(self.c_p.patch(f'{self.url}/{e.id}', {'title': 'x'}, format='json').status_code, 403)
        self.assertEqual(self.c_p.delete(f'{self.url}/{e.id}').status_code, 403)

    def test_dm_edits_hides_and_deletes_anything(self):
        pid = self.note(self.c_p).json()['entry']['id']
        ev = log_diary(self.camp, 'custom', 'Evento')
        r = self.c_dm.patch(f'{self.url}/{pid}', {'hidden': True, 'title': 'Editado'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['entry']['hidden'])
        # oculta some para o jogador (inclusive para editar)
        self.assertEqual(self.c_p.patch(f'{self.url}/{pid}', {'body': 'x'}, format='json').status_code, 404)
        self.assertEqual(self.c_dm.patch(f'{self.url}/{ev.id}', {'body': 'detalhe'}, format='json').status_code, 200)
        self.assertEqual(self.c_dm.delete(f'{self.url}/{ev.id}').status_code, 200)

    def test_entry_from_other_campaign_is_404(self):
        other = Campaign.objects.create(dm=self.dm, name='D', slug='d')
        e = log_diary(other, 'custom', 'Outra')
        self.assertEqual(self.c_dm.delete(f'{self.url}/{e.id}').status_code, 404)


class DiaryListAndSessionTests(DiaryBase):
    def test_filters_and_pagination(self):
        for i in range(5):
            self.note(self.c_dm, body=f'n{i}')
        log_diary(self.camp, 'xp', '+100 XP')
        r = self.c_dm.get(self.url + '?limit=2')
        self.assertEqual(len(r.json()['entries']), 2)
        self.assertTrue(r.json()['hasMore'])
        r = self.c_dm.get(self.url + '?subtype=xp').json()
        self.assertEqual([e['subtype'] for e in r['entries']], ['xp'])
        self.assertEqual(len(self.c_dm.get(self.url + '?kind=note').json()['entries']), 5)
        self.assertEqual(len(self.c_dm.get(self.url + '?session=3').json()['entries']), 6)
        self.assertEqual(len(self.c_dm.get(self.url + '?session=4').json()['entries']), 0)

    def test_start_session_updates_state_and_logs(self):
        self.assertEqual(self.c_p.post(self.url + '/sessions', {}, format='json').status_code, 403)
        r = self.c_dm.post(self.url + '/sessions', {'title': 'A cripta'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['currentSession'], 4)
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['session'], '4')
        self.assertEqual(current_session(self.camp), 4)
        ev = DiaryEntry.objects.get(subtype='session')
        self.assertEqual(ev.session, 4)
        n = self.note(self.c_p).json()['entry']
        self.assertEqual(n['session'], 4)
        # renomear
        r = self.c_dm.patch(self.url + '/sessions/4', {'title': 'A cripta, parte 1'}, format='json')
        self.assertEqual(r.status_code, 200)
        data = self.c_p.get(self.url).json()
        self.assertEqual(data['currentSession'], 4)
        s4 = next(s for s in data['sessions'] if s['number'] == 4)
        self.assertEqual(s4['title'], 'A cripta, parte 1')

    def test_session_from_free_text(self):
        self.camp.state = {'session': 'Sessão 12'}
        self.assertEqual(current_session(self.camp), 12)
        self.camp.state = {'session': ''}
        self.assertIsNone(current_session(self.camp))


class DiaryAutoEventTests(DiaryBase):
    def entries(self, subtype):
        return list(DiaryEntry.objects.filter(campaign=self.camp, subtype=subtype))

    def test_levelup_consume_logs(self):
        apr = Approval.objects.create(campaign=self.camp, character=self.char, requested_by=self.player,
                                      type='levelup', payload={'toLevel': 3}, status='approved')
        r = self.c_p.post(f'/api/approvals/{apr.id}/consume', {}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        [e] = self.entries('levelup')
        self.assertEqual(e.data['level'], 3)
        self.assertIn('Thal', e.title)
        self.assertEqual(e.session, 3)

    def test_award_xp_logs(self):
        self.camp.state = {**self.camp.state, 'levelingMode': 'xp'}
        self.camp.save()
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/award-xp', {'amount': 300}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        [e] = self.entries('xp')
        self.assertEqual(e.data['each'], 300)
        self.assertEqual({c['name'] for c in e.data['characters']}, {'Thal', 'Kor'})
        self.assertEqual(set(e.data['levelReady']), {'Kor'})  # Kor nível 1 → 300 XP basta

    def test_item_given_logs_and_groups(self):
        for name in ('Espada', 'Poção'):
            r = self.c_dm.post(f'/api/characters/{self.char.id}/inventory', {'item': {'name': name, 'type': 'gear'}}, format='json')
            self.assertEqual(r.status_code, 200, r.content)
        [e] = self.entries('item')
        self.assertEqual([i['itemName'] for i in e.data['items']], ['Espada', 'Poção'])
        self.assertIn('Poção → Thal', e.body)

    def test_standalone_item_not_logged(self):
        solo = Character.objects.create(owner=self.player, name='Solo', data={'name': 'Solo'})
        self.c_p.post(f'/api/characters/{solo.id}/inventory', {'item': {'name': 'X'}}, format='json')
        self.assertEqual(self.entries('item'), [])

    def test_long_rest_logs(self):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/long-rest-all')
        self.assertEqual(r.status_code, 200, r.content)
        [e] = self.entries('rest')
        self.assertEqual(set(e.data['characters']), {'Thal', 'Kor'})

    def test_only_natural_crits_logged_and_grouped(self):
        seq = iter([7, 20, 1, 12])
        with mock.patch('api.views_dice.roll_fair', side_effect=lambda _d: next(seq)):
            for _ in range(4):
                r = self.c_p.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id, 'label': 'Ataque'}, format='json')
                self.assertEqual(r.status_code, 200, r.content)
        [e] = self.entries('roll')
        self.assertEqual([x['crit'] for x in e.data['rolls']], ['crit', 'fail'])
        self.assertIn('1 crítico', e.title)
        with mock.patch('api.views_dice.roll_fair', return_value=6):
            self.c_p.post('/api/dice/roll', {'diceType': 'd6', 'campaignId': self.camp.id}, format='json')
        self.assertEqual(len(self.entries('roll')), 1)

    def test_combat_helpers(self):
        log_combat_start(self.camp, [{'name': 'Thal'}, {'name': 'Goblin'}], self.dm)
        log_combat_end(self.camp, 4, [{'name': 'Thal', 'current_hp': 5}, {'name': 'Goblin', 'current_hp': 0}], self.dm)
        start, end = sorted(self.entries('combat'), key=lambda e: e.id)
        self.assertEqual(start.data['phase'], 'start')
        self.assertEqual(end.data['defeated'], ['Goblin'])

    def test_log_diary_never_raises(self):
        with mock.patch('api.models.DiaryEntry.objects.create', side_effect=RuntimeError('boom')), \
                self.assertLogs('api.diary', level='ERROR'):
            self.assertIsNone(log_diary(self.camp, 'custom', 'x'))


class DiaryCombatHookTests(TestCase):
    def test_combat_start_and_end_are_logged(self):
        from api.tests.test_multiclass import make_user
        from api.models import Campaign, DiaryEntry
        from rest_framework.test import APIClient
        dm = make_user('dmc@x.com', 'DM')
        c = APIClient(); c.force_login(dm)
        camp = Campaign.objects.create(dm=dm, name='C', slug='cc')
        self.assertEqual(c.post(f'/api/combat/campaign/{camp.id}/start', {}, format='json').status_code, 200)
        self.assertEqual(c.post(f'/api/combat/campaign/{camp.id}/end', {}, format='json').status_code, 200)
        phases = [e.data.get('phase') for e in DiaryEntry.objects.filter(campaign=camp, subtype='combat').order_by('occurred_at', 'id')]
        self.assertEqual(phases, ['start', 'end'])
