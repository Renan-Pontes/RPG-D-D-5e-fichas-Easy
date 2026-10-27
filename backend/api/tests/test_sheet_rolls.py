"""
V15 · Rolagens da ficha na Tela (decisão D-1 do dono: SIM).

A ficha rola no aparelho, na hora, e depois manda o resultado pronto para a fila
de rolagens da Tela da V10 (`POST /api/characters/:id/table-roll`):
- só quem joga ESTE personagem na campanha (nem outro jogador, nem o mestre);
- valida tamanho e formato: até 20 dados, lados conhecidos, valor dentro do dado,
  vantagem coerente e total = dados que contam + modificador;
- 1 por segundo por usuário, em média: uma rajada de 3 em 3 s passa (a rede junta
  ataque e dano na chegada), a 4ª dá 429;
- campanha encerrada → 423; sem sessão ao vivo ou com "Rolagens das fichas"
  desligada pelo mestre → 204 sem gravar;
- vai à mesma janela da TV (nome do personagem, rótulo, dados, total) e à mesma
  arrumação das rolagens `@mesa:`; nada no DiceLog nem no Diário.
"""
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Campaign, Character, DiaryEntry, DiceLog, Membership, Profile, RollRequest
from api import table_rolls

User = get_user_model()


def make_user(email, name):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


def percepcao(value=15, mod=3, **extra):
    return {'label': 'Percepção', 'dice': [{'die': 'd20', 'value': value, 'kept': True}],
            'modifier': mod, 'total': value + mod, **extra}


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Renan')
        self.ana = make_user('ana@x.com', 'Ana')
        self.bruno = make_user('bruno@x.com', 'Bruno')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_ana = APIClient(); self.c_ana.force_login(self.ana)
        self.c_bruno = APIClient(); self.c_bruno.force_login(self.bruno)
        self.camp = Campaign.objects.create(dm=self.dm, name='Brumafria', slug='brumafria',
                                            state={'session': '4', 'live': True})
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        self.dagna = Character.objects.create(owner=self.ana, name='Dagna', data={'name': 'Dagna'})
        self.pipo = Character.objects.create(owner=self.bruno, name='Pipo', data={'name': 'Pipo'})
        Membership.objects.create(campaign=self.camp, user=self.ana, character=self.dagna, role='player')
        Membership.objects.create(campaign=self.camp, user=self.bruno, character=self.pipo, role='player')

    def post(self, body, client=None, char=None, fresh=True):
        if fresh:
            cache.clear()   # o limite de 1/s vale por usuário; cada caso aqui é uma rolagem nova
        return (client or self.c_ana).post(f'/api/characters/{(char or self.dagna).id}/table-roll', body, format='json')

    def screen(self):
        r = APIClient().get(f'/api/screen/{self.camp.screen_token}')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def prefs(self, **prefs):
        return self.c_dm.post(f'/api/campaigns/{self.camp.id}/stage', {'op': 'prefs', 'prefs': prefs}, format='json')


class SheetRollTests(Base):
    def test_member_roll_reaches_the_tv_with_name_label_dice_and_total(self):
        logs, diary = DiceLog.objects.count(), DiaryEntry.objects.count()
        r = self.post(percepcao(15, 3))
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()['shown'])
        rr = RollRequest.objects.get(pk=r.json()['rollId'])
        self.assertEqual((rr.status, rr.note, rr.character_id, rr.requested_by_id),
                         ('public', '@mesa:sheet', self.dagna.id, self.ana.id))
        self.assertIsNotNone(rr.resolved_at)
        roll = self.screen()['rolls'][-1]
        self.assertEqual((roll['kind'], roll['who'], roll['label'], roll['total'], roll['modifier']),
                         ('sheet', 'Dagna', 'Percepção', 18, 3))
        self.assertEqual(roll['rolls'], [{'value': 15, 'kept': True}])
        self.assertFalse(roll['crit'] or roll['fail'])
        # a ficha não passa pelo registro do mestre nem pelo Diário (nenhuma escrita a mais)
        self.assertEqual((DiceLog.objects.count(), DiaryEntry.objects.count()), (logs, diary))

    def test_mixed_damage_and_advantage(self):
        dmg = {'label': 'Maça · dano', 'modifier': 2, 'total': 4 + 6 + 2,
               'dice': [{'die': 'd6', 'value': 4}, {'die': 'd8', 'value': 6}]}
        r = self.post(dmg)
        self.assertEqual(r.status_code, 201, r.content)
        rr = RollRequest.objects.get(pk=r.json()['rollId'])
        self.assertEqual((rr.dice_type, rr.count, rr.total), ('mixed', 2, 12))
        adv = {'label': 'Furtividade', 'adv': 'adv', 'modifier': 1, 'total': 21,
               'dice': [{'die': 'd20', 'value': 3, 'kept': False}, {'die': 'd20', 'value': 20, 'kept': True}]}
        r = self.post(adv)
        self.assertEqual(r.status_code, 201, r.content)
        rr = RollRequest.objects.get(pk=r.json()['rollId'])
        self.assertEqual((rr.dice_type, rr.count, rr.is_critical, rr.is_critical_fail), ('d20', 1, True, False))
        roll = self.screen()['rolls'][-1]
        self.assertTrue(roll['crit'])                     # 20 natural: a TV faz o dado grande
        self.assertEqual(roll['rolls'], [{'value': 3, 'kept': False}, {'value': 20, 'kept': True}])

    def test_natural_one_alone_is_a_fumble_but_not_inside_a_damage_roll(self):
        r = self.post(percepcao(1, 3))
        self.assertTrue(RollRequest.objects.get(pk=r.json()['rollId']).is_critical_fail)
        r = self.post({'label': 'Dano', 'modifier': 0, 'total': 21,
                       'dice': [{'die': 'd20', 'value': 20}, {'die': 'd4', 'value': 1}]})
        rr = RollRequest.objects.get(pk=r.json()['rollId'])
        self.assertFalse(rr.is_critical or rr.is_critical_fail)

    def test_only_the_member_who_plays_the_character(self):
        self.assertEqual(self.post(percepcao(), client=self.c_bruno).status_code, 403)   # outro jogador
        self.assertEqual(self.post(percepcao(), client=self.c_dm).status_code, 403)      # o mestre usa o 🎲 dele
        self.assertIn(self.post(percepcao(), client=APIClient()).status_code, (401, 403))
        loose = Character.objects.create(owner=self.ana, name='Sem mesa', data={})
        self.assertEqual(self.post(percepcao(), char=loose).status_code, 403)            # ficha fora da campanha
        self.assertEqual(self.post(percepcao(), char=self.pipo, client=self.c_bruno).status_code, 201)
        self.assertEqual(RollRequest.objects.filter(note__startswith='@mesa:sheet').count(), 1)

    def test_validation_of_size_and_format(self):
        cases = {
            'too_many_dice': {'label': 'x', 'modifier': 0, 'total': 21, 'dice': [{'die': 'd6', 'value': 1}] * 21},
            'invalid_dice_type': {'label': 'x', 'modifier': 0, 'total': 3, 'dice': [{'die': 'd7', 'value': 3}]},
            'invalid_value': {'label': 'x', 'modifier': 0, 'total': 21, 'dice': [{'die': 'd20', 'value': 21}]},
            'incoherent_total': percepcao(15, 3, total=25),
            'invalid_modifier': percepcao(15, 60),
            'label_too_long': percepcao(15, 3, label='x' * 121),
            'invalid_dice': {'label': 'x', 'modifier': 0, 'total': 0, 'dice': []},
            'incoherent_advantage': {'label': 'x', 'adv': 'adv', 'modifier': 0, 'total': 3,
                                     'dice': [{'die': 'd20', 'value': 3}, {'die': 'd20', 'value': 9, 'kept': False}]},
        }
        for code, body in cases.items():
            with self.subTest(code=code):
                r = self.post(body)
                self.assertEqual(r.status_code, 400, r.content)
                self.assertEqual(r.json().get('error'), code)
        # valor booleano não passa por número; dado descartado sem vantagem também não
        self.assertEqual(self.post({'label': 'x', 'modifier': 0, 'total': 1, 'dice': [{'die': 'd20', 'value': True}]}).status_code, 400)
        self.assertEqual(self.post({'label': 'x', 'modifier': 0, 'total': 9, 'dice': [
            {'die': 'd20', 'value': 3, 'kept': False}, {'die': 'd20', 'value': 9}]}).status_code, 400)
        self.assertFalse(RollRequest.objects.exists())
        # 20 dados é o teto e passa
        twenty = {'label': '20d6', 'modifier': 0, 'total': 20, 'dice': [{'die': 'd6', 'value': 1}] * 20}
        self.assertEqual(self.post(twenty).status_code, 201)

    def test_one_per_second_per_user(self):
        # ataque e dano saem 1,2 s um do outro, mas a variação da rede os junta na chegada:
        # a rajada de 3 passa; a 4ª nos mesmos 3 s dá 429
        with mock.patch('api.rate_limit.time.time', return_value=1000.0):
            self.assertEqual(self.post(percepcao(10)).status_code, 201)
        with mock.patch('api.rate_limit.time.time', return_value=1000.3):
            self.assertEqual(self.post(percepcao(11), fresh=False).status_code, 201)
            self.assertEqual(self.post(percepcao(12), fresh=False).status_code, 201)
            r = self.post(percepcao(13), fresh=False)
            self.assertEqual(r.status_code, 429)
            self.assertEqual(r.json()['error'], 'rate_limited')
            # outro usuário tem o próprio limite
            self.assertEqual(self.post(percepcao(14), char=self.pipo, client=self.c_bruno, fresh=False).status_code, 201)
        # 3 s depois da 1ª, cabe uma de novo (média de 1 por segundo)
        with mock.patch('api.rate_limit.time.time', return_value=1003.1):
            self.assertEqual(self.post(percepcao(15), fresh=False).status_code, 201)
            self.assertEqual(self.post(percepcao(16), fresh=False).status_code, 429)
        self.assertEqual(RollRequest.objects.filter(note='@mesa:sheet').count(), 5)

    def test_closed_campaign_is_423(self):
        Campaign.objects.filter(pk=self.camp.pk).update(status='closed')
        r = self.post(percepcao())
        self.assertEqual(r.status_code, 423, r.content)
        self.assertFalse(RollRequest.objects.exists())

    def test_without_live_session_204_and_nothing_written(self):
        url = f'/api/characters/{self.dagna.id}/campaigns'
        self.assertIs(self.c_ana.get(url).json()['campaigns'][0]['live'], True)
        Campaign.objects.filter(pk=self.camp.pk).update(state={'session': '4', 'live': False})
        r = self.post(percepcao())
        self.assertEqual(r.status_code, 204)
        self.assertFalse(RollRequest.objects.exists())
        # a ficha sabe pela faixa da campanha e nem manda (src/dice/sheet-roll.js)
        self.assertIs(self.c_ana.get(url).json()['campaigns'][0]['live'], False)

    def test_dm_turns_sheet_rolls_off_and_on(self):
        self.assertTrue(self.c_ana.get(f'/api/characters/{self.dagna.id}/campaigns').json()['campaigns'][0]['sheetRolls'])
        self.assertEqual(self.prefs(sheets='sim').status_code, 400)      # liga/desliga é booleano
        self.assertEqual(self.prefs(sheets=False).status_code, 200)
        dm = self.c_dm.get(f'/api/campaigns/{self.camp.id}').json()['campaign']
        self.assertIs(dm['stage']['prefs']['sheets'], False)
        self.assertFalse(self.c_ana.get(f'/api/characters/{self.dagna.id}/campaigns').json()['campaigns'][0]['sheetRolls'])
        self.assertEqual(self.post(percepcao()).status_code, 204)
        self.assertFalse(RollRequest.objects.exists())
        self.assertEqual(self.screen()['rolls'], [])
        # o resto das regras continua onde estava
        self.assertEqual(dm['stage']['prefs']['players'], 'crits')
        self.assertEqual(self.prefs(sheets=True).status_code, 200)
        self.assertEqual(self.post(percepcao()).status_code, 201)

    def test_sheet_rolls_enter_the_same_prune(self):
        RollRequest.objects.bulk_create([
            RollRequest(campaign=self.camp, requested_by=self.dm, status='public', note='@mesa:dm', total=i)
            for i in range(table_rolls.KEEP)])
        ask = RollRequest.objects.create(campaign=self.camp, requested_by=self.ana, status='pending', label='Pedido')
        self.assertEqual(self.post(percepcao()).status_code, 201)
        mesa = RollRequest.objects.filter(campaign=self.camp, note__startswith='@mesa:')
        self.assertEqual(mesa.count(), table_rolls.KEEP)
        self.assertTrue(mesa.filter(note='@mesa:sheet').exists())
        self.assertTrue(RollRequest.objects.filter(pk=ask.pk).exists())   # pedido não é tocado

    def test_dm_lists_it_with_the_table_rolls_and_the_pulse_sees_it(self):
        self.post(percepcao(17, 3))
        rows = self.c_dm.get(f'/api/rolls/campaign/{self.camp.id}/recent?table=1').json()['rolls']
        self.assertEqual((rows[0]['kind'], rows[0]['who'], rows[0]['total']), ('sheet', 'Dagna', 20))
        pulse = self.c_dm.get(f'/api/campaigns/{self.camp.id}/pulse').json()
        self.assertEqual(pulse['screen']['roll']['who'], 'Dagna')
