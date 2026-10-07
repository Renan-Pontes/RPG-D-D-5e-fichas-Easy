"""
WP2 · PATCH de state com merge no servidor, PUT depreciado, sessões do diário,
cena da aventura no telão e identidade da campanha (capa, frase, cor, tom).
"""
import base64

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.campaign_state import merge_state
from api.models import Adventure, Campaign, DiaryEntry, Membership, Profile, Character, Approval

User = get_user_model()
PNG = 'data:image/png;base64,' + base64.b64encode(b'\x89PNG\r\n\x1a\nfake').decode()


def make_user(email, name='User'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestre')
        self.p1 = make_user('p1@x.com', 'Ana')
        self.out = make_user('out@x.com', 'Fora')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p1 = APIClient(); self.c_p1.force_login(self.p1)
        self.c_out = APIClient(); self.c_out.force_login(self.out)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c', state={
            'session': '3', 'nudges': {'off': ['x']}, 'diarySessions': {'3': {'title': 'T', 'startedAt': None}},
            'concentration': {'pc1': {'spell': 'Bless'}}})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.char = Character.objects.create(owner=self.p1, name='Thal', data={'name': 'Thal', 'level': 1, 'className': 'druid'})
        Membership.objects.create(campaign=self.camp, user=self.p1, character=self.char, role='player')

    def patch(self, client, patch):
        return client.patch(f'/api/campaigns/{self.camp.id}/state', {'patch': patch}, format='json')


class StatePatchTests(Base):
    def test_patch_merges_keys(self):
        r = self.patch(self.c_dm, {'scene': 'Taverna', 'live': True})
        self.assertEqual(r.status_code, 200, r.content)
        st = r.json()['state']
        self.assertEqual(st['scene'], 'Taverna')
        self.assertTrue(st['live'])
        # O resto do estado não some.
        self.assertEqual(st['session'], '3')
        self.assertIn('diarySessions', st)

    def test_two_patches_with_stale_clients_preserve_both(self):
        # (b) dois PATCH "concorrentes" com chaves diferentes preservam as duas.
        self.patch(self.c_dm, {'scene': 'Ponte'})
        self.patch(self.c_dm, {'weather': 'Chuva'})
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['scene'], 'Ponte')
        self.assertEqual(self.camp.state['weather'], 'Chuva')

    def test_merge_state_rereads_db_even_with_stale_object(self):
        stale = Campaign.objects.get(pk=self.camp.pk)        # cópia velha em memória
        merge_state(Campaign.objects.get(pk=self.camp.pk), {'scene': 'A'})   # outro "aparelho"
        merge_state(stale, {'weather': 'Sol'})
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['scene'], 'A')
        self.assertEqual(self.camp.state['weather'], 'Sol')

    def test_null_removes_key(self):
        self.patch(self.c_dm, {'sceneText': 'Leia isto'})
        r = self.patch(self.c_dm, {'sceneText': None})
        self.assertNotIn('sceneText', r.json()['state'])

    def test_rejects_unknown_and_server_keys(self):
        for key in ('diarySessions', 'screenCard', 'hack'):
            r = self.patch(self.c_dm, {key: {}})
            self.assertEqual(r.status_code, 400, key)
        self.assertEqual(self.patch(self.c_dm, {'levelingMode': 'lol'}).status_code, 400)
        self.assertEqual(self.patch(self.c_dm, {'live': 'yes'}).status_code, 400)
        self.assertEqual(self.patch(self.c_dm, {'scene': 'x' * 201}).status_code, 400)
        r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}/state', {'patch': {}}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_only_dm(self):
        self.assertEqual(self.patch(self.c_p1, {'scene': 'x'}).status_code, 403)
        self.assertEqual(self.patch(self.c_out, {'scene': 'x'}).status_code, 403)
        self.assertEqual(self.patch(APIClient(), {'scene': 'x'}).status_code, 403)

    def test_deprecated_put_is_merge_and_keeps_server_keys(self):
        # Cliente velho manda o state inteiro de uma cópia antiga, sem diarySessions.
        self.patch(self.c_dm, {'weather': 'Neve'})   # escrito por outro aparelho
        r = self.c_dm.put(f'/api/campaigns/{self.camp.id}',
                          {'state': {'session': '3', 'scene': 'Novo', 'diarySessions': {}}}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r['Deprecation'], 'true')
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['scene'], 'Novo')
        self.assertEqual(self.camp.state['weather'], 'Neve')
        self.assertEqual(self.camp.state['diarySessions']['3']['title'], 'T')

    def test_deprecated_put_still_validates_leveling(self):
        r = self.c_dm.put(f'/api/campaigns/{self.camp.id}', {'state': {'levelingMode': 'nope'}}, format='json')
        self.assertEqual(r.status_code, 400)


class DiarySessionTests(Base):
    def test_start_session_sets_live_and_keeps_state(self):
        self.patch(self.c_dm, {'scene': 'Porto'})
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/diary/sessions', {'title': 'Chegada'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.camp.refresh_from_db()
        st = self.camp.state
        self.assertEqual(st['session'], '4')
        self.assertTrue(st['live'])
        self.assertEqual(st['scene'], 'Porto')
        self.assertEqual(st['diarySessions']['4']['title'], 'Chegada')
        self.assertIn('3', st['diarySessions'])
        self.assertTrue(DiaryEntry.objects.filter(campaign=self.camp, subtype='session', session=4).exists())

    def test_start_session_live_false(self):
        self.c_dm.post(f'/api/campaigns/{self.camp.id}/diary/sessions', {'live': False}, format='json')
        self.camp.refresh_from_db()
        self.assertFalse(self.camp.state['live'])

    def test_rename_session_merges(self):
        self.patch(self.c_dm, {'weather': 'Vento'})
        r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}/diary/sessions/3', {'title': 'Novo'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.state['diarySessions']['3']['title'], 'Novo')
        self.assertEqual(self.camp.state['weather'], 'Vento')


class AdventureSceneTests(Base):
    def setUp(self):
        super().setUp()
        self.adv = Adventure.objects.create(campaign=self.camp, name='Cripta', data={'version': 1, 'nodes': [
            {'id': 'n1', 'name': 'Portão', 'readAloud': 'Um vento frio…'}], 'edges': []})

    def test_screen_scene_writes_card_and_merges(self):
        self.patch(self.c_dm, {'weather': 'Névoa'})
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/adventures/{self.adv.id}/screen',
                           {'nodeId': 'n1', 'text': True}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.camp.refresh_from_db()
        st = self.camp.state
        self.assertEqual(st['scene'], 'Portão')
        self.assertEqual(st['sceneText'], 'Um vento frio…')
        self.assertEqual(st['weather'], 'Névoa')
        self.assertEqual(st['screenCard']['type'], 'scene')
        self.assertEqual(st['screenCard']['nodeId'], 'n1')
        # tirar a cena tira o cartão de cena
        self.c_dm.post(f'/api/campaigns/{self.camp.id}/adventures/{self.adv.id}/screen', {'nodeId': None}, format='json')
        self.camp.refresh_from_db()
        self.assertNotIn('screenCard', self.camp.state)
        self.assertNotIn('sceneText', self.camp.state)

    def test_node_refs_are_cleaned(self):
        data = {'nodes': [{'id': 'n1', 'name': 'Sala', 'refs': [5, 5, 9]}], 'edges': []}
        r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}/adventures/{self.adv.id}', {'data': data}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['adventure']['data']['nodes'][0]['refs'], [5, 9])
        for bad in (['x'], [True], [-1], list(range(1, 30))):
            data['nodes'][0]['refs'] = bad
            r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}/adventures/{self.adv.id}', {'data': data}, format='json')
            self.assertEqual(r.status_code, 400, bad)


class CampaignIdentityTests(Base):
    def test_create_with_identity(self):
        from api.plans import assign_plan
        assign_plan(self.dm, plan_slug='dm')  # Grátis = 1 campanha, e o Base já criou uma
        r = self.c_dm.post('/api/campaigns', {'name': 'Brumafria', 'tagline': 'Onde a névoa guarda segredos…',
                                              'accent': '#b8862b', 'tone': 'mystery'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        c = r.json()['campaign']
        self.assertEqual((c['tagline'], c['accent'], c['tone']), ('Onde a névoa guarda segredos…', '#b8862b', 'mystery'))
        self.assertEqual(c['onboarding'], {})
        self.assertFalse(c['advancedDice'])

    def test_invalid_identity(self):
        for body in ({'accent': 'red'}, {'tone': 'sad'}, {'tagline': 'x' * 161}):
            r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}', body, format='json')
            self.assertEqual(r.status_code, 400, body)

    def test_dm_settings_only_for_dm(self):
        r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}',
                            {'onboarding': {'cover': True}, 'advancedDice': True}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.c_dm.patch(f'/api/campaigns/{self.camp.id}', {'onboarding': {'invite': True}}, format='json')
        c = self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertEqual(c['onboarding'], {'cover': True, 'invite': True})
        self.assertTrue(c['advancedDice'])
        self.assertIn('pendingApprovals', c)
        p = self.c_p1.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        for k in ('onboarding', 'advancedDice', 'pendingApprovals', 'inviteCode', 'screenToken'):
            self.assertNotIn(k, p)
        self.assertEqual(self.c_p1.patch(f'/api/campaigns/{self.camp.id}', {'advancedDice': True}, format='json').status_code, 403)

    def test_cover_put_get_delete(self):
        url = f'/api/campaigns/{self.camp.id}/cover'
        self.assertEqual(self.c_dm.get(url).status_code, 404)
        r = self.c_dm.put(url, {'image': PNG}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        ver = r.json()['coverVer']
        self.assertTrue(ver)
        g = self.c_p1.get(f'{url}?v={ver}')
        self.assertEqual(g.status_code, 200)
        self.assertEqual(g['Content-Type'], 'image/png')
        self.assertEqual(g['ETag'], f'"{ver}"')
        self.assertIn('max-age=31536000', g['Cache-Control'])
        self.assertEqual(self.c_p1.get(url, HTTP_IF_NONE_MATCH=f'"{ver}"').status_code, 304)
        self.assertEqual(self.c_out.get(url).status_code, 403)
        # capa nunca vai na lista nem no GET da campanha (só coverVer)
        lst = self.c_dm.get('/api/campaigns').json()['campaigns'][0]
        self.assertEqual(lst['coverVer'], ver)
        self.assertNotIn('cover_image', str(lst))
        self.assertEqual(self.c_p1.put(url, {'image': PNG}, format='json').status_code, 403)
        self.assertEqual(self.c_dm.delete(url).json()['coverVer'], '')
        self.assertEqual(self.c_dm.get(url).status_code, 404)

    def test_cover_validation(self):
        url = f'/api/campaigns/{self.camp.id}/cover'
        self.assertEqual(self.c_dm.put(url, {'image': 'data:text/html;base64,PHA+'}, format='json').status_code, 400)
        big = 'data:image/jpeg;base64,' + 'A' * 450_001
        self.assertEqual(self.c_dm.put(url, {'image': big}, format='json').status_code, 400)


class LevelGrantDiaryTests(Base):
    def test_grant_levelup_logs_chronicle(self):
        r = self.c_dm.post(f'/api/approvals/campaign/{self.camp.id}/grant-levelup', {'characterIds': 'all'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        e = DiaryEntry.objects.get(campaign=self.camp, subtype='levelgrant')
        self.assertEqual(e.data['phase'], 'granted')
        self.assertEqual(e.data['grants'][0]['characterName'], 'Thal')
        self.assertIn('Thal', e.title)

    def test_review_approve_logs_once(self):
        a = Approval.objects.create(campaign=self.camp, character=self.char, requested_by=self.p1,
                                    type='levelup', payload={'toLevel': 2})
        r = self.c_dm.post(f'/api/approvals/{a.id}/review', {'status': 'approved'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        a.refresh_from_db(); a.note = 'x'; a.save()     # salvar de novo não duplica
        self.assertEqual(DiaryEntry.objects.filter(campaign=self.camp, subtype='levelgrant').count(), 1)
