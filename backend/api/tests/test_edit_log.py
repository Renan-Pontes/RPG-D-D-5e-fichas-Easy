"""
Registro de edições para o mestre (data.editLog, api/edit_log.py):
- PUT do dono numa ficha em campanha que muda 'languages' anota {at, by, field, added, removed}.
- Fora de campanha não anota.
- O dono não apaga nem altera o registro (o PUT ignora o editLog do corpo, sem 403).
- `data` que não é objeto (lista, texto, número, nulo) é recusado com 400: não apaga a ficha nem o registro.
- O mestre vê o registro (ficha e detalhe da campanha); outro jogador, não.
- Teto de 100 entradas; reordenar não é edição; ficha nova nasce sem registro.
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api import edit_log
from api.models import Profile, Character, Campaign, Membership

User = get_user_model()


def make_user(email, name='User', password='senha-forte-2026'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password=password)
    Profile.objects.create(user=u, display_name=name)
    return u


def client_for(user):
    c = APIClient()
    c.force_login(user)
    return c


BASE = {'level': 1, 'className': 'fighter', 'race': 'human', 'background': 'soldier',
        'rulesVersion': '2024', 'currentHp': 12, 'maxHp': 12, 'languages': ['Common', 'Dwarvish']}


class EditLogTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'Mestra')
        self.owner = make_user('o@x.com', 'Renan')
        self.mate = make_user('m@x.com', 'Colega')
        self.c_dm, self.c_owner, self.c_mate = client_for(self.dm), client_for(self.owner), client_for(self.mate)
        self.camp = Campaign.objects.create(dm=self.dm, name='Reino', slug='reino')
        self.char = Character.objects.create(owner=self.owner, name='Thal', data=dict(BASE))
        Membership.objects.create(campaign=self.camp, user=self.dm, role='dm')
        Membership.objects.create(campaign=self.camp, user=self.owner, character=self.char, role='player')
        mate_char = Character.objects.create(owner=self.mate, name='Bri', data=dict(BASE))
        Membership.objects.create(campaign=self.camp, user=self.mate, character=mate_char, role='player')

    def put(self, data, char=None, client=None):
        char = char or self.char
        return (client or self.c_owner).put(f'/api/characters/{char.id}', {'name': char.name, 'data': data}, format='json')

    def test_registra_idiomas_em_campanha(self):
        r = self.put({**BASE, 'languages': ['Common', 'Elvish', 'Féerico']})
        self.assertEqual(r.status_code, 200, r.content)
        log = r.json()['character']['data']['editLog']
        self.assertEqual(len(log), 1)
        e = log[0]
        self.assertEqual(e['field'], 'languages')
        self.assertEqual(e['added'], ['Elvish', 'Féerico'])
        self.assertEqual(e['removed'], ['Dwarvish'])
        self.assertEqual(e['by'], 'Renan')
        self.assertEqual(e['byId'], self.owner.id)
        self.assertTrue(e['at'])
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['languages'], ['Common', 'Elvish', 'Féerico'])
        # Nova edição soma no fim.
        self.put({**BASE, 'languages': ['Common', 'Elvish']})
        self.char.refresh_from_db()
        log = self.char.data['editLog']
        self.assertEqual(len(log), 2)
        self.assertEqual((log[1]['added'], log[1]['removed']), ([], ['Féerico']))

    def test_sem_mudanca_de_idioma_nao_registra(self):
        # Outro campo mudou; idiomas só reordenados.
        r = self.put({**BASE, 'currentHp': 3, 'languages': ['Dwarvish', 'Common']})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertNotIn('editLog', r.json()['character']['data'])

    def test_idiomas_apagados_do_corpo_entram_como_removidos(self):
        body = {k: v for k, v in BASE.items() if k != 'languages'}
        self.put(body)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['editLog'][0]['removed'], ['Common', 'Dwarvish'])

    def test_fora_de_campanha_nao_registra(self):
        solo = Character.objects.create(owner=self.owner, name='Solo', data=dict(BASE))
        r = self.put({**BASE, 'languages': ['Common', 'Giant']}, char=solo)
        self.assertEqual(r.status_code, 200, r.content)
        solo.refresh_from_db()
        self.assertEqual(solo.data['languages'], ['Common', 'Giant'])
        self.assertNotIn('editLog', solo.data)

    def test_dono_nao_apaga_nem_altera_o_registro(self):
        self.put({**BASE, 'languages': ['Common', 'Elvish']})
        self.char.refresh_from_db()
        original = self.char.data['editLog']
        # Apagar (lista vazia), forjar e omitir: o servidor mantém o que tinha, sem 403.
        fake = [{'at': '2000-01-01T00:00:00Z', 'by': 'Mestra', 'field': 'languages', 'added': ['Celestial'], 'removed': []}]
        for log in ([], fake, None):
            body = {**BASE, 'languages': ['Common', 'Elvish'], 'currentHp': 5}
            if log is not None:
                body['editLog'] = log
            r = self.put(body)
            self.assertEqual(r.status_code, 200, r.content)
            self.char.refresh_from_db()
            self.assertEqual(self.char.data['editLog'], original)
            self.assertEqual(self.char.data['currentHp'], 5)

    def test_dono_nao_apaga_o_registro_com_data_que_nao_e_objeto(self):
        self.put({**BASE, 'languages': ['Common', 'Elvish']})
        self.char.refresh_from_db()
        before = self.char.data
        # Lista, texto, número ou nulo no lugar da ficha: 400 e nada muda.
        for bad in ([], [1], '', 'x', 0, None):
            r = self.put(bad)
            self.assertEqual(r.status_code, 400, (bad, r.content))
            self.assertEqual(r.json().get('error'), 'invalid_data')
            self.char.refresh_from_db()
            self.assertEqual(self.char.data, before)
        # Fora da campanha também: sair, zerar e voltar não apagaria o registro.
        Membership.objects.filter(character=self.char).delete()
        self.assertEqual(self.put([]).status_code, 400)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['editLog'], before['editLog'])
        # Criação também só aceita objeto.
        r = self.c_owner.post('/api/characters', {'name': 'Nova', 'data': [1]}, format='json')
        self.assertEqual(r.status_code, 400, r.content)
        self.assertFalse(Character.objects.filter(name='Nova').exists())

    def test_dono_nao_escreve_registro_fora_de_campanha(self):
        solo = Character.objects.create(owner=self.owner, name='Solo', data=dict(BASE))
        self.put({**BASE, 'editLog': [{'field': 'languages', 'added': ['Celestial']}]}, char=solo)
        solo.refresh_from_db()
        self.assertNotIn('editLog', solo.data)

    def test_ficha_nova_nasce_sem_registro(self):
        r = self.c_owner.post('/api/characters', {'name': 'Nova', 'data': {**BASE, 'editLog': [{'field': 'languages'}]}}, format='json')
        self.assertIn(r.status_code, (200, 201), r.content)
        self.assertNotIn('editLog', Character.objects.get(pk=r.json()['character']['id']).data)

    def test_mestre_ve_o_registro(self):
        self.put({**BASE, 'languages': ['Common', 'Aquan']})
        r = self.c_dm.get(f'/api/characters/{self.char.id}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['character']['data']['editLog'][0]['added'], ['Aquan'])
        r = self.c_dm.get(f'/api/campaigns/{self.camp.id}')
        self.assertEqual(r.status_code, 200, r.content)
        member = next(m for m in r.json()['campaign']['members'] if (m.get('character') or {}).get('id') == self.char.id)
        self.assertEqual(member['character']['data']['editLog'][0]['added'], ['Aquan'])

    def test_outro_jogador_nao_ve_o_registro(self):
        self.put({**BASE, 'languages': ['Common', 'Aquan']})
        r = self.c_mate.get(f'/api/campaigns/{self.camp.id}')
        self.assertEqual(r.status_code, 200, r.content)
        member = next(m for m in r.json()['campaign']['members'] if (m.get('character') or {}).get('id') == self.char.id)
        self.assertNotIn('data', member['character'])
        self.assertNotIn('editLog', str(member['character']))
        self.assertEqual(self.c_mate.get(f'/api/characters/{self.char.id}').status_code, 403)

    def test_dm_edit_nao_sobrescreve_o_registro(self):
        self.put({**BASE, 'languages': ['Common', 'Elvish']})
        # Editor do mestre aberto antes da edição: manda a ficha velha, sem o registro novo.
        r = self.c_dm.patch(f'/api/characters/{self.char.id}/dm-edit',
                            {'data': {'currentHp': 1, 'editLog': []}}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        self.assertEqual(len(self.char.data['editLog']), 1)
        self.assertEqual(self.char.data['currentHp'], 1)

    def test_teto_de_entradas(self):
        seed = [{'at': f'2026-01-01T00:00:{i % 60:02d}Z', 'by': 'Renan', 'byId': self.owner.id,
                 'field': 'languages', 'added': [f'L{i}'], 'removed': []} for i in range(edit_log.MAX_ENTRIES)]
        self.char.data = {**BASE, 'editLog': seed}
        self.char.save()
        self.put({**BASE, 'languages': ['Common', 'Dwarvish', 'Giant']})
        self.char.refresh_from_db()
        log = self.char.data['editLog']
        self.assertEqual(len(log), edit_log.MAX_ENTRIES)
        self.assertEqual(log[0]['added'], ['L1'])         # a mais antiga saiu
        self.assertEqual(log[-1]['added'], ['Giant'])

    def test_campos_fora_da_lista_nao_registram(self):
        self.put({**BASE, 'notes': 'diário novo', 'currentHp': 4})
        self.char.refresh_from_db()
        self.assertNotIn('editLog', self.char.data)


class EditLogDiffTests(TestCase):
    def test_diff_lista(self):
        self.assertEqual(edit_log.diff_entry('languages', ['A', 'B'], ['B', 'C']), {'added': ['C'], 'removed': ['A']})
        self.assertIsNone(edit_log.diff_entry('languages', ['A', 'B'], ['B', 'A', 'A']))
        self.assertEqual(edit_log.diff_entry('languages', None, ['A']), {'added': ['A'], 'removed': []})

    def test_diff_simples_e_textos_curtos(self):
        self.assertEqual(edit_log.diff_entry('x', 1, 2), {'from': 1, 'to': 2})
        self.assertIsNone(edit_log.diff_entry('x', 'a', 'a'))
        d = edit_log.diff_entry('languages', [], ['x' * 500] + [f'L{i}' for i in range(100)])
        self.assertEqual(len(d['added']), edit_log.MAX_ITEMS)
        self.assertEqual(len(d['added'][0]), edit_log.MAX_TEXT)
