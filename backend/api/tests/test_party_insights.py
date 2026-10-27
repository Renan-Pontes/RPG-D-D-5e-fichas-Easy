"""
Raio-X do grupo: GET/PUT /api/campaigns/:id/party-insights (só o mestre), em
dm_settings.partyInsights — merge por chave, limites, campanha encerrada e o PATCH
da campanha que não apaga o Raio-X nem o plano da sessão gravados no meio do pedido.
"""
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api import world_rules as R
from api.models import Campaign, Character, Membership, Profile

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
        self.assertEqual(ins, {'v': 1, 'include': None, 'w': 0.5, 'hidden': [], 'focus': {}, 'rep': 'best', 'dc': 15,
                               'base': {}, 'style': {}, 'spotlights': {}, 'dismissed': {}})

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
        self.assertIsNone(self.stored())

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
