"""
Raio-X do grupo: GET/PUT /api/campaigns/:id/party-insights (só o mestre), em
dm_settings.partyInsights — merge por chave, limites, campanha encerrada e o PATCH
da campanha que não apaga o Raio-X nem o plano da sessão gravados no meio do pedido.
E o histórico do Equilíbrio na mesa (GET /party-insights/history): contagens por
sessão, só números, com cache de 60 s.
"""
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from api import world_rules as R
from api.models import Campaign, Character, CheckRequest, CheckResponse, DiaryEntry, Membership, Profile

User = get_user_model()
IVAN_WIZARD = [5, 2, 5, 1, 5, 1, 5, 4, 2, 1, 2]


def make_user(email):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=email.split('@')[0].title())
    return u


class PartyInsightsBase(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com')
        self.ana = make_user('ana@x.com')
        self.out = make_user('out@x.com')
        self.camp = Campaign.objects.create(dm=self.dm, name='Mesa', slug='mesa', state={'session': '3'})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.char = Character.objects.create(owner=self.ana, name='Pipo', data={'level': 1, 'className': 'rogue'})
        Membership.objects.create(campaign=self.camp, user=self.ana, character=self.char, role='player')
        self.c_dm, self.c_ana, self.c_out, self.anon = APIClient(), APIClient(), APIClient(), APIClient()
        self.c_dm.force_login(self.dm)
        self.c_ana.force_login(self.ana)
        self.c_out.force_login(self.out)
        self.url = f'/api/campaigns/{self.camp.id}/party-insights'

    def put(self, body, client=None):
        return (client or self.c_dm).put(self.url, body, format='json')

    def stored(self):
        self.camp.refresh_from_db()
        return self.camp.dm_settings.get('partyInsights')


class AccessTests(PartyInsightsBase):
    def test_only_the_dm(self):
        self.assertEqual(self.c_dm.get(self.url).status_code, 200)
        for client in (self.c_ana, self.c_out):
            self.assertEqual(client.get(self.url).status_code, 403)
            self.assertEqual(self.put({'dc': 12}, client).status_code, 403)
        self.assertIn(self.anon.get(self.url).status_code, (401, 403))
        self.assertIsNone(self.stored())

    def test_slug_works_and_not_in_campaign_payload(self):
        self.put({'dc': 12})
        self.assertEqual(self.c_dm.get('/api/campaigns/mesa/party-insights').json()['insights']['dc'], 12)
        # fora do GET da campanha (polling) para o mestre e para o jogador
        for client in (self.c_dm, self.c_ana):
            body = client.get(f'/api/campaigns/{self.camp.id}').content.decode()
            self.assertNotIn('partyInsights', body)
            self.assertNotIn('"dc"', body)


class MergeTests(PartyInsightsBase):
    def test_defaults(self):
        ins = self.c_dm.get(self.url).json()['insights']
        self.assertEqual(ins, {'v': 1, 'include': None, 'exclude': [], 'w': 0.5, 'hidden': [], 'focus': {}, 'rep': 'best',
                               'dc': 15, 'base': {}, 'style': {}, 'spotlights': {}, 'dismissed': {}})

    def test_merge_by_key(self):
        self.put({'w': 0, 'dc': 12})
        r = self.put({'insights': {'rep': 'top2', 'hidden': ['social', 'dmg', 'dmg'], 'focus': {'social': 2}}})
        ins = r.json()['insights']
        self.assertEqual((ins['w'], ins['dc'], ins['rep']), (0, 12, 'top2'))
        self.assertEqual(ins['hidden'], ['dmg', 'social'])      # na ordem dos eixos, sem repetir
        self.assertEqual(ins['focus'], {'social': 2})
        self.assertEqual(self.stored()['dc'], 12)
        # w em 5 passos (Tabela · · · Ficha)
        self.assertEqual(self.put({'w': 0.7}).json()['insights']['w'], 0.75)

    def test_maps_merge_one_level_and_null_removes(self):
        self.put({'base': {'wizard': IVAN_WIZARD}})
        ins = self.put({'base': {'cleric': [2, 2, 5, 5, 2, 1, 4, 3, 1, 4, 2]}}).json()['insights']
        self.assertEqual(set(ins['base']), {'wizard', 'cleric'})
        ins = self.put({'base': {'wizard': None}}).json()['insights']
        self.assertEqual(set(ins['base']), {'cleric'})
        # "Restaurar a do Ivan": a chave inteira volta ao padrão
        self.assertEqual(self.put({'base': None}).json()['insights']['base'], {})
        self.put({'style': {'14': ['quiet']}, 'focus': {'social': 2, 'explore': 2}})
        ins = self.put({'style': {'15': ['combat', 'talk']}, 'focus': {'social': None}}).json()['insights']
        self.assertEqual(ins['style'], {'14': ['quiet'], '15': ['talk', 'combat']})
        self.assertEqual(ins['focus'], {'explore': 2})

    def test_include_and_spotlights(self):
        ins = self.put({'include': [11, '12', 'x', 11]}).json()['insights']
        self.assertEqual(ins['include'], [11, 12])
        self.assertIsNone(self.put({'include': None}).json()['insights']['include'])   # null = todos
        # quem sai fica gravado (quem chega à mesa entra sozinho)
        ins = self.put({'exclude': [self.char.id, str(self.char.id), 'x'], 'include': None}).json()['insights']
        self.assertEqual((ins['exclude'], ins['include']), ([self.char.id], None))
        self.assertEqual(self.put({'exclude': None}).json()['insights']['exclude'], [])
        sp = [{'id': 's1', 'kind': 'shine', 'text': 'x' * 200, 'auto': 'tool:thievesTools', 'done': 3, 'plan': 'c7'},
              {'kind': 'hook', 'text': ' Porta trancada '}]
        ins = self.put({'spotlights': {str(self.char.id): sp}, 'dismissed': {str(self.char.id): ['skill:stealth'] * 3}}).json()['insights']
        got = ins['spotlights'][str(self.char.id)]
        self.assertEqual(len(got[0]['text']), R.MAX_SPOTLIGHT_TEXT)            # o 161º é cortado
        self.assertEqual((got[0]['done'], got[0]['plan'], got[0]['auto']), (3, 'c7', 'tool:thievesTools'))
        self.assertEqual((got[1]['id'], got[1]['text'], got[1]['done']), ('s2', 'Porta trancada', None))
        self.assertEqual(ins['dismissed'][str(self.char.id)], ['skill:stealth'])

    def test_keeps_other_dm_settings(self):
        self.camp.dm_settings = {'onboarding': {'cover': True}, 'sessionPlan': {'monsters': 'goblins'}}
        self.camp.save()
        self.put({'dc': 18})
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.dm_settings['onboarding'], {'cover': True})
        self.assertEqual(self.camp.dm_settings['sessionPlan'], {'monsters': 'goblins'})
        self.assertEqual(self.camp.dm_settings['partyInsights']['dc'], 18)


class LimitTests(PartyInsightsBase):
    def bad(self, body, code='invalid_party_insights'):
        r = self.put(body)
        self.assertEqual(r.status_code, 400, (body, r.content))
        self.assertEqual(r.json()['error'], code)

    def test_invalid_values(self):
        self.bad({'w': 2})
        self.bad({'w': True})
        self.bad({'dc': 13})
        self.bad({'rep': 'all'})
        self.bad({'hidden': ['luck']})
        self.bad({'focus': {'social': 3}})
        self.bad({'style': {'14': ['shy']}})
        self.bad({'style': {'pipo': ['quiet']}})
        self.bad({'base': {'wizard': [5, 2, 5]}})
        self.bad({'base': {'wizard': [6] * 11}})
        self.bad({'base': {'bloodHunter': IVAN_WIZARD}}, 'invalid_class')      # classe desconhecida
        self.bad({'spotlights': {'14': [{'kind': 'brag', 'text': 'x'}]}}, 'invalid_spotlight_kind')
        self.bad({'spotlights': {'14': [{'kind': 'shine', 'text': 'x'}] * 13}}, 'party_insights_too_large')
        self.bad({'dismissed': {'14': [f'k{i}' for i in range(41)]}}, 'party_insights_too_large')
        self.bad({'include': list(range(1, 14))})
        self.bad({'exclude': list(range(1, 14))})
        self.bad({'exclude': 'all'})
        self.assertIsNone(self.stored())

    def test_cap_drops_sheets_that_left_first(self):
        # 12 fichas antigas (fora da mesa) com dispensas e estilo: o personagem atual ainda grava
        old = {str(100 + i): ['skill:stealth'] for i in range(12)}
        self.assertEqual(self.put({'dismissed': old, 'style': {k: ['quiet'] for k in old}}).status_code, 200)
        mine = str(self.char.id)
        r = self.put({'dismissed': {mine: ['skill:stealth']}})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['insights']['dismissed'], {mine: ['skill:stealth']})
        self.assertEqual(len(r.json()['insights']['style']), 12, 'só o mapa que passou do teto é podado')
        r = self.put({'style': {mine: ['talk']}})
        self.assertEqual(r.json()['insights']['style'], {mine: ['talk']})
        # 13 fichas que estão na mesa: aí sim, 400 (nada de quem está na mesa é apagado)
        for i in range(12):
            ch = Character.objects.create(owner=self.ana, name=f'P{i}', data={'level': 1})
            Membership.objects.create(campaign=self.camp, user=make_user(f'p{i}@x.com'), character=ch, role='player')
        here = list(Membership.objects.filter(campaign=self.camp, character__isnull=False).values_list('character_id', flat=True))
        self.assertEqual(self.put({'spotlights': {str(c): [{'kind': 'shine', 'text': 'x'}] for c in here[:12]}}).status_code, 200)
        self.bad({'spotlights': {str(here[12]): [{'kind': 'shine', 'text': 'x'}]}}, 'party_insights_too_large')

    def test_total_size_limit(self):
        # 12 personagens × 12 momentos de 160 caracteres ≈ 30 KB > 20 KB
        sp = {str(100 + i): [{'kind': 'shine', 'text': 'y' * 160, 'auto': f'skill:k{j}'} for j in range(12)]
              for i in range(12)}
        self.bad({'spotlights': sp}, 'party_insights_too_large')
        # a soma de vários PUTs também é contada
        for i in range(5):
            r = self.put({'spotlights': {str(100 + i): sp[str(100 + i)]}})
            self.assertEqual(r.status_code, 200)
        self.bad({'spotlights': {'106': sp['106'], '107': sp['107']}}, 'party_insights_too_large')
        self.assertEqual(len(self.stored()['spotlights']), 5)

    def test_closed_campaign_is_read_only(self):
        self.put({'dc': 12})
        self.assertEqual(self.c_dm.delete(f'/api/campaigns/{self.camp.id}').status_code, 200)
        r = self.put({'dc': 18})
        self.assertEqual((r.status_code, r.json()['error']), (423, 'campaign_closed'))
        self.assertEqual(self.c_dm.get(self.url).json()['insights']['dc'], 12)


class ConcurrentCampaignPatchTests(PartyInsightsBase):
    """O PATCH da campanha leu a campanha ANTES de o Raio-X e o plano serem gravados
    (outro aparelho do mestre): gravar não pode apagar o que eles gravaram."""

    def stale_patch(self, body):
        stale = Campaign.objects.get(pk=self.camp.pk)                       # leitura do começo do pedido
        self.put({'dc': 12, 'style': {'14': ['quiet']}})                    # gravado no meio do caminho
        self.c_dm.put(f'/api/campaigns/{self.camp.id}/session-plan', {'strongStart': 'Emboscada'}, format='json')
        with mock.patch('api.views_campaigns.get_campaign_or_404', return_value=stale):
            r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}', body, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.camp.refresh_from_db()
        s = self.camp.dm_settings
        self.assertEqual(s['partyInsights']['dc'], 12)
        self.assertEqual(s['partyInsights']['style'], {'14': ['quiet']})
        self.assertEqual(s['sessionPlan']['strongStart'], 'Emboscada')
        return s

    def test_patch_name_keeps_insights_and_plan(self):
        self.stale_patch({'name': 'Mesa Nova'})
        self.assertEqual(self.camp.name, 'Mesa Nova')

    def test_patch_dm_settings_keeps_insights_and_plan(self):
        s = self.stale_patch({'onboarding': {'tv': True}, 'advancedDice': True})
        self.assertEqual(s['onboarding'], {'tv': True})
        self.assertIs(s['advancedDice'], True)

    def test_invalid_dm_setting_writes_nothing(self):
        r = self.c_dm.patch(f'/api/campaigns/{self.camp.id}', {'name': 'Outra', 'advancedDice': 'sim'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.name, 'Mesa')


class HistoryTests(PartyInsightsBase):
    """Sessões 2 (sem diarySessions: o início vem da 1ª entrada do diário) e 3 (com
    startedAt): testes pedidos/respondidos/passados por personagem e quedas no combate."""

    def setUp(self):
        super().setUp()
        self.bruno = make_user('bruno@x.com')
        self.kael = Character.objects.create(owner=self.bruno, name='Kaelor', data={'level': 1})
        Membership.objects.create(campaign=self.camp, user=self.bruno, character=self.kael, role='player')
        self.hurl = f'{self.url}/history'
        now = timezone.now()
        self.t2, self.t3 = now - timedelta(days=7), now - timedelta(hours=2)
        self.camp.state = {'session': '3', 'diarySessions': {'3': {'title': '', 'startedAt': self.t3.isoformat()}}}
        self.camp.save()
        DiaryEntry.objects.create(campaign=self.camp, session=2, subtype='note', title='Chegada', occurred_at=self.t2)
        DiaryEntry.objects.create(campaign=self.camp, session=3, subtype='combat', title='Combate encerrado',
                                  occurred_at=self.t3 + timedelta(minutes=50),
                                  data={'phase': 'end', 'downs': {'Pipo': 2, 'Fulano de fora': 1}})
        # sessão 2: Percepção CD 15 para todos (Pipo passa, Kaelor não responde)
        self.check(self.t2 + timedelta(minutes=10), dc=15, answers={self.ana: 17})
        # sessão 3: CON CD 13 só para o Kaelor (falha) e um teste sem CD para todos
        self.check(self.t3 + timedelta(minutes=5), dc=13, targets=[self.bruno.id], answers={self.bruno: 9})
        self.check(self.t3 + timedelta(minutes=20), dc=None, answers={self.ana: 12, self.bruno: 20})
        # antes de qualquer sessão: não conta
        self.check(self.t2 - timedelta(days=30), dc=10, answers={self.ana: 18})

    def check(self, when, dc, targets=(), answers=None):
        cr = CheckRequest.objects.create(campaign=self.camp, created_by=self.dm, label='Teste', kind='skill',
                                         key='perception', dc=dc, target_user_ids=list(targets))
        CheckRequest.objects.filter(pk=cr.pk).update(created_at=when)
        for user, total in (answers or {}).items():
            char = self.char if user == self.ana else self.kael
            CheckResponse.objects.create(check_request=cr, user=user, character=char, total=total)
        return cr

    def test_only_the_dm(self):
        self.assertEqual(self.c_dm.get(self.hurl).status_code, 200)
        for client in (self.c_ana, self.c_out):
            self.assertEqual(client.get(self.hurl).status_code, 403)
        self.assertIn(self.anon.get(self.hurl).status_code, (401, 403))

    def test_counts_by_session(self):
        r = self.c_dm.get(self.hurl).json()
        pipo, kael = str(self.char.id), str(self.kael.id)
        self.assertEqual(r['current'], 3)
        self.assertEqual([s['number'] for s in r['sessions']], [3, 2])      # a mais nova primeiro
        s3, s2 = r['sessions']
        self.assertEqual(s2['checks'], {pipo: {'asked': 1, 'answered': 1, 'passed': 1},
                                        kael: {'asked': 1, 'answered': 0, 'passed': 0}})
        self.assertEqual(s3['checks'], {pipo: {'asked': 1, 'answered': 1, 'passed': 0},
                                        kael: {'asked': 2, 'answered': 2, 'passed': 0}})
        self.assertEqual(s3['downs'], {pipo: 2})                           # quem não é da mesa não entra
        self.assertEqual(s2['downs'], {})
        self.assertEqual(s3['startedAt'], self.t3.isoformat())
        self.assertIsNotNone(s2['startedAt'])                              # veio da 1ª entrada do diário

    def test_only_numbers_no_other_fields(self):
        r = self.c_dm.get(self.hurl).json()
        self.assertEqual(set(r), {'current', 'sessions'})
        for s in r['sessions']:
            self.assertEqual(set(s), {'number', 'startedAt', 'checks', 'downs'})
            for row in s['checks'].values():
                self.assertEqual(set(row), {'asked', 'answered', 'passed'})
                self.assertTrue(all(isinstance(v, int) for v in row.values()))
            self.assertTrue(all(isinstance(v, int) for v in s['downs'].values()))
        body = self.c_dm.get(self.hurl).content.decode()
        for leak in ('Teste', 'perception', 'Chegada', 'Combate', 'Pipo', 'Kaelor', '"total"', 'Fulano'):
            self.assertNotIn(leak, body)

    def test_cached_for_60_seconds_and_by_session(self):
        first = self.c_dm.get(self.hurl).json()
        self.check(self.t3 + timedelta(minutes=30), dc=10, answers={self.ana: 15})
        with self.assertNumQueries(3):                     # sessão de login, usuário e campanha; nada de contagem
            again = self.c_dm.get(self.hurl).json()
        self.assertEqual(again, first)
        with mock.patch('api.views_insights.cache.get', return_value=None):
            fresh = self.c_dm.get(self.hurl).json()
        self.assertEqual(fresh['sessions'][0]['checks'][str(self.char.id)]['asked'], 2)
        # começar a sessão 4 muda a chave: não espera o cache vencer
        self.c_dm.post(f'/api/campaigns/{self.camp.id}/diary/sessions', {'number': 4}, format='json')
        r = self.c_dm.get(self.hurl).json()
        self.assertEqual((r['current'], r['sessions'][0]['number']), (4, 4))
        self.assertEqual(r['sessions'][0]['checks'], {})

    def test_last_five_sessions(self):
        for n in range(4, 10):
            DiaryEntry.objects.create(campaign=self.camp, session=n, subtype='note', title=f'S{n}',
                                      occurred_at=self.t3 + timedelta(minutes=60 + n))
        r = self.c_dm.get(self.hurl).json()
        self.assertEqual([s['number'] for s in r['sessions']], [9, 8, 7, 6, 5])

    def test_empty_campaign(self):
        self.camp.state = {}
        self.camp.save()
        DiaryEntry.objects.all().delete()
        self.assertEqual(self.c_dm.get(self.hurl).json(), {'current': None, 'sessions': []})

    def test_closed_campaign_still_reads(self):
        self.assertEqual(self.c_dm.delete(f'/api/campaigns/{self.camp.id}').status_code, 200)
        self.assertEqual(self.c_dm.get(self.hurl).status_code, 200)
