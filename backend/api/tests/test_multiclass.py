"""
Multiclasse: subida em classe nova via aprovação, regras da mesa, liberação
direta pelo mestre e espaços de magia combinados.
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership, Approval
from api.progression import compute_progression, class_entries, validate_level_choice
from api.spells import slots_max_for

User = get_user_model()


def make_user(email, name='U'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


def druid_data(level, **extra):
    return {'rulesVersion': '2014', 'level': level, 'className': 'druid', 'subclass': 'moon',
            'currentHp': 20, 'maxHp': 20, 'skillProfs': [],
            'abilities': {'str': 13, 'dex': 14, 'con': 14, 'int': 10, 'wis': 16, 'cha': 10}, **extra}


def multi(level_druid, other, level_other, **extra):
    seq = ['druid'] * level_druid + [other] * level_other
    return druid_data(len(seq), multiclass=[{'id': other, 'subclass': ''}], classSequence=seq, **extra)


class MulticlassEngineTests(TestCase):
    def test_entries_and_asi_by_class_level(self):
        data = multi(4, 'fighter', 4)
        self.assertEqual([(e['id'], e['level']) for e in class_entries(data)], [('druid', 4), ('fighter', 4)])
        prog = compute_progression(data)
        self.assertEqual(prog['asi_levels'], [4, 8])
        self.assertEqual(prog['prof_bonus'], 3)
        self.assertTrue(validate_level_choice(data, 8, {'type': 'asi', 'asi': {'str': 2}})['valid'])
        self.assertFalse(validate_level_choice(data, 6, {'type': 'asi', 'asi': {'str': 2}})['valid'])

    def test_slots_follow_multiclass_table(self):
        self.assertEqual(slots_max_for(multi(3, 'fighter', 1))[:3], [4, 2, 0])      # só o druida conjura
        self.assertEqual(slots_max_for(multi(3, 'wizard', 2))[:3], [4, 3, 2])       # 3 + 2 = conjurador 5
        self.assertEqual(slots_max_for(multi(3, 'warlock', 2))[:2], [6, 2])         # Pacto somado


class MulticlassApprovalTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'P')
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.char = Character.objects.create(owner=self.player, name='Thal', data=druid_data(3))
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char, role='player')

    def _unlock(self, **payload):
        return Approval.objects.create(campaign=self.camp, character=self.char, requested_by=self.player,
                                       type='levelup', payload={'toLevel': 4, **payload}, status='approved').id

    def test_consume_into_new_class(self):
        apr = self._unlock()
        r = self.c_p.post(f'/api/approvals/{apr}/consume', {'classId': 'rogue', 'hpGain': 7, 'skillAdded': 'stealth'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        d = self.char.data
        self.assertEqual(d['level'], 4)
        self.assertEqual(d['classSequence'], ['druid', 'druid', 'druid', 'rogue'])
        self.assertEqual(d['multiclass'][0]['id'], 'rogue')
        self.assertIn('stealth', d['skillProfs'])
        self.assertEqual(d['maxHp'], 27)
        payload = Approval.objects.get(pk=apr).payload  # histórico do mestre
        self.assertEqual((payload['classId'], payload['hpGain'], payload['skillAdded']), ('rogue', 7, 'stealth'))

    def test_hp_cap_uses_new_class_die(self):
        apr = self._unlock()
        r = self.c_p.post(f'/api/approvals/{apr}/consume', {'classId': 'barbarian', 'hpGain': 14}, format='json')
        self.assertEqual(r.status_code, 200, r.content)  # d12 + CON 2
        apr2 = Approval.objects.create(campaign=self.camp, character=self.char, requested_by=self.player,
                                       type='levelup', payload={'toLevel': 5}, status='approved').id
        r = self.c_p.post(f'/api/approvals/{apr2}/consume', {'classId': 'druid', 'hpGain': 14}, format='json')
        self.assertEqual(r.status_code, 400)  # d8 + 2 = 10 no máximo

    def test_prereq_and_table_rule_block_new_class(self):
        apr = self._unlock()
        r = self.c_p.post(f'/api/approvals/{apr}/consume', {'classId': 'sorcerer', 'hpGain': 5}, format='json')
        self.assertEqual(r.status_code, 400)  # CAR 10
        self.assertEqual(r.json()['error'], 'multiclass_prereq')
        apr2 = self._unlock(allowMulticlass=False)
        Approval.objects.filter(pk=apr).delete()
        r = self.c_p.post(f'/api/approvals/{apr2}/consume', {'classId': 'fighter', 'hpGain': 5}, format='json')
        self.assertEqual(r.json()['error'], 'multiclass_not_allowed')
        r = self.c_p.post(f'/api/approvals/{apr2}/consume', {'classId': 'druid', 'hpGain': 5}, format='json')
        self.assertEqual(r.status_code, 200, r.content)

    def test_skill_only_for_new_skill_classes(self):
        apr = self._unlock()
        r = self.c_p.post(f'/api/approvals/{apr}/consume', {'classId': 'fighter', 'hpGain': 5, 'skillAdded': 'stealth'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_dm_review_records_table_rule(self):
        self.camp.state = {'allowMulticlass': False}
        self.camp.save()
        apr = Approval.objects.create(campaign=self.camp, character=self.char, requested_by=self.player,
                                      type='levelup', payload={'toLevel': 4})
        self.c_dm.post(f'/api/approvals/{apr.id}/review', {'status': 'approved'}, format='json')
        apr.refresh_from_db()
        self.assertIs(apr.payload['allowMulticlass'], False)
        self.c_dm.post(f'/api/approvals/{apr.id}/review', {'status': 'approved', 'allowMulticlass': True}, format='json')
        apr.refresh_from_db()
        self.assertIs(apr.payload['allowMulticlass'], True)

    def test_dm_grants_levelup_to_whole_table(self):
        other = make_user('q@x.com', 'Q')
        char2 = Character.objects.create(owner=other, name='Bor', data=druid_data(19))
        Membership.objects.create(campaign=self.camp, user=other, character=char2, role='player')
        pending = Approval.objects.create(campaign=self.camp, character=self.char, requested_by=self.player,
                                          type='levelup', payload={'toLevel': 4})
        r = self.c_dm.post(f'/api/approvals/campaign/{self.camp.id}/grant-levelup', {'characterIds': 'all'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(len(r.json()['granted']), 2)
        pending.refresh_from_db()
        self.assertEqual(pending.status, 'approved')  # pedido pendente reaproveitado
        self.assertEqual(Approval.objects.filter(character=self.char, type='levelup').count(), 1)
        # De novo: já liberado, nada muda
        r = self.c_dm.post(f'/api/approvals/campaign/{self.camp.id}/grant-levelup', {'characterIds': [self.char.id]}, format='json')
        self.assertEqual(r.json()['skipped'], [self.char.id])
        # Jogador enxerga a liberação feita pelo mestre
        r = self.c_p.get(f'/api/approvals/campaign/{self.camp.id}')
        self.assertTrue(any(a['status'] == 'approved' for a in r.json()['approvals']))

    def test_only_dm_grants(self):
        r = self.c_p.post(f'/api/approvals/campaign/{self.camp.id}/grant-levelup', {'characterIds': 'all'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_wild_shape_uses_druid_level(self):
        self.char.data = {**multi(2, 'fighter', 3), 'wildShapeUses': 0}
        self.char.save()
        wolf = {'id': 'wolf', 'hp': 11, 'ac': 13, 'cr': 0.25, 'speed': 40}
        r = self.c_p.post(f'/api/characters/{self.char.id}/wild-shape/transform', {'beast': wolf}, format='json')
        self.assertIn(r.status_code, (200, 400))
        if r.status_code == 400:
            self.assertNotEqual(r.json().get('error'), 'not_druid')
