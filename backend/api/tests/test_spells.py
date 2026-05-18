"""
Testes pra spells.py + endpoints cast / rest / long-rest-all.
"""
from django.test import TestCase, SimpleTestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership
from api import spells as se

User = get_user_model()


def make_user(email, name='User', password='senha-forte-2026'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password=password)
    Profile.objects.create(user=u, display_name=name)
    return u


# ============================================================
# Engine puro
# ============================================================
class SpellSlotsTableTests(SimpleTestCase):
    def test_full_caster(self):
        # Mago nv 1: 2 slots de 1° nível.
        self.assertEqual(se.spell_slots_max('wizard', 1), [2,0,0,0,0,0,0,0,0])
        # Druida nv 5: 4/3/2/0... (full caster)
        self.assertEqual(se.spell_slots_max('druid', 5)[:3], [4, 3, 2])

    def test_half_caster(self):
        # Paladino nv 1: zero
        self.assertEqual(se.spell_slots_max('paladin', 1)[:3], [0, 0, 0])
        # Paladino nv 2: 2 de 1°
        self.assertEqual(se.spell_slots_max('paladin', 2)[:3], [2, 0, 0])

    def test_warlock(self):
        # Bruxo nv 1: 1 de 1°
        self.assertEqual(se.spell_slots_max('warlock', 1)[:3], [1, 0, 0])
        # Bruxo nv 5: 2 de 3° (todos os slots viram nível 3)
        self.assertEqual(se.spell_slots_max('warlock', 5)[:5], [0, 0, 2, 0, 0])

    def test_non_caster(self):
        self.assertEqual(se.spell_slots_max('fighter', 5), [0]*9)
        self.assertEqual(se.spell_slots_max('rogue', 1), [0]*9)

    def test_override_via_data(self):
        c = {'className': 'wizard', 'level': 1, 'spellSlotsMax': [5,0,0,0,0,0,0,0,0]}
        self.assertEqual(se.slots_max_for(c)[0], 5)


class CastEngineTests(SimpleTestCase):
    def _wizard5(self):
        # Mago nv 5: 4/3/2/0... — slots usados todos zero
        return {'className': 'wizard', 'level': 5, 'spellSlotsUsed': [0]*9}

    def test_cantrip_no_cost(self):
        c = self._wizard5()
        nxt, err = se.cast(c, 0)
        self.assertIsNone(err)
        self.assertEqual(nxt.get('spellSlotsUsed', [0]*9)[0], 0)

    def test_cast_decrements_correct_level(self):
        c = self._wizard5()
        nxt, err = se.cast(c, 2)  # 2° nível
        self.assertIsNone(err)
        self.assertEqual(nxt['spellSlotsUsed'][1], 1)
        # Outros níveis intactos
        self.assertEqual(nxt['spellSlotsUsed'][0], 0)
        self.assertEqual(nxt['spellSlotsUsed'][2], 0)

    def test_cast_no_slot(self):
        c = self._wizard5()
        c['spellSlotsUsed'] = [0, 0, 2, 0, 0, 0, 0, 0, 0]  # 3° nível esgotado (max=2)
        _, err = se.cast(c, 3)
        self.assertEqual(err, 'no_slot_available')

    def test_upcast_decrements_higher_slot(self):
        c = self._wizard5()  # tem 3 de 2° e 2 de 3°
        # Conjura magia de 1° usando slot de 3°
        nxt, _ = se.cast(c, 3)
        self.assertEqual(nxt['spellSlotsUsed'][2], 1)
        self.assertEqual(nxt['spellSlotsUsed'][0], 0)

    def test_invalid_slot_level(self):
        c = self._wizard5()
        _, err = se.cast(c, 10)
        self.assertEqual(err, 'invalid_slot_level')


class RestEngineTests(SimpleTestCase):
    def test_long_rest_restores_everything(self):
        c = {
            'className': 'druid', 'level': 4,
            'spellSlotsUsed': [3, 2, 0, 0, 0, 0, 0, 0, 0],
            'wildShapeUses': 2,
            'currentHp': 5, 'maxHp': 30, 'tempHp': 4,
            'hitDiceUsed': 3,
            'conditions': ['unconscious', 'poisoned'],
            'deathSaves': {'success': 1, 'fail': 2},
        }
        n = se.long_rest(c)
        self.assertEqual(n['spellSlotsUsed'], [0]*9)
        self.assertEqual(n['wildShapeUses'], 0)
        self.assertEqual(n['currentHp'], 30)
        self.assertEqual(n['tempHp'], 0)
        self.assertNotIn('unconscious', n['conditions'])
        self.assertIn('poisoned', n['conditions'])  # poisoned NÃO sai
        self.assertEqual(n['deathSaves'], {'success': 0, 'fail': 0})
        # Recupera ceil(level/2) = 2 hit dice
        self.assertEqual(n['hitDiceUsed'], 1)

    def test_short_rest_warlock_restores_slots(self):
        c = {'className': 'warlock', 'level': 3, 'spellSlotsUsed': [0,2,0,0,0,0,0,0,0]}
        n = se.short_rest(c)
        self.assertEqual(n['spellSlotsUsed'], [0]*9)

    def test_short_rest_druid_restores_wild_shape(self):
        c = {'className': 'druid', 'level': 4, 'wildShapeUses': 2}
        n = se.short_rest(c)
        self.assertEqual(n['wildShapeUses'], 0)

    def test_short_rest_wizard_does_nothing_automatic(self):
        c = {'className': 'wizard', 'level': 5, 'spellSlotsUsed': [2,1,0,0,0,0,0,0,0]}
        n = se.short_rest(c)
        # Não restaura automático (Arcane Recovery é manual)
        self.assertEqual(n.get('spellSlotsUsed', [0]*9), [2,1,0,0,0,0,0,0,0])


# ============================================================
# REST endpoints
# ============================================================
class CastEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.other = make_user('z@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.c_other = APIClient(); self.c_other.force_login(self.other)
        self.char = Character.objects.create(owner=self.owner, name='Wiz', data={
            'className': 'wizard', 'level': 5, 'spellSlotsUsed': [0]*9,
        })

    def test_owner_can_cast(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/cast',
                              {'spellId': 'fireball', 'slotLevel': 3}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['spellSlotsUsed'][2], 1)

    def test_other_cannot_cast(self):
        r = self.c_other.post(f'/api/characters/{self.char.id}/cast',
                              {'spellId': 'fireball', 'slotLevel': 3}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_cantrip_no_cost(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/cast',
                              {'spellId': 'fireBolt', 'slotLevel': 0}, format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['spellSlotsUsed'], [0]*9)

    def test_no_slot_returns_400(self):
        self.char.data['spellSlotsUsed'] = [0, 0, 2, 0, 0, 0, 0, 0, 0]
        self.char.save()
        r = self.c_owner.post(f'/api/characters/{self.char.id}/cast',
                              {'spellId': 'fireball', 'slotLevel': 3}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'no_slot_available')

    def test_invalid_slot_level_returns_400(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/cast',
                              {'spellId': 'fireball', 'slotLevel': 99}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_upcast_decrements_higher(self):
        # Magic Missile (nv 1) lançada com slot de 3
        r = self.c_owner.post(f'/api/characters/{self.char.id}/cast',
                              {'spellId': 'magicMissile', 'slotLevel': 3}, format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['spellSlotsUsed'][0], 0)
        self.assertEqual(self.char.data['spellSlotsUsed'][2], 1)


class RestEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.dm = make_user('dm@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.char = Character.objects.create(owner=self.owner, name='C', data={
            'className': 'wizard', 'level': 5,
            'spellSlotsUsed': [3, 2, 1, 0, 0, 0, 0, 0, 0],
            'currentHp': 10, 'maxHp': 30, 'tempHp': 0,
        })

    def test_long_rest_owner(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/rest', {'type': 'long'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['spellSlotsUsed'], [0]*9)
        self.assertEqual(self.char.data['currentHp'], 30)

    def test_dm_can_long_rest_in_campaign(self):
        camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=camp, user=self.owner, character=self.char, role='player')
        r = self.c_dm.post(f'/api/characters/{self.char.id}/rest', {'type': 'long'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['currentHp'], 30)

    def test_dm_not_in_campaign_cannot_rest(self):
        r = self.c_dm.post(f'/api/characters/{self.char.id}/rest', {'type': 'long'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_invalid_rest_type(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/rest', {'type': 'medium'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_long_rest_all_party(self):
        camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=camp, user=self.owner, character=self.char, role='player')
        other = make_user('o2@x.com')
        char2 = Character.objects.create(owner=other, name='C2', data={
            'className': 'druid', 'level': 3,
            'spellSlotsUsed': [2, 0, 0, 0, 0, 0, 0, 0, 0],
            'wildShapeUses': 2,
            'currentHp': 5, 'maxHp': 24,
        })
        Membership.objects.create(campaign=camp, user=other, character=char2, role='player')
        r = self.c_dm.post(f'/api/campaigns/{camp.id}/long-rest-all')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()['restedCharacters']), 2)
        char2.refresh_from_db()
        self.assertEqual(char2.data['wildShapeUses'], 0)
        self.assertEqual(char2.data['currentHp'], 24)

    def test_long_rest_all_requires_dm(self):
        camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=camp, user=self.owner, character=self.char, role='player')
        r = self.c_owner.post(f'/api/campaigns/{camp.id}/long-rest-all')
        self.assertEqual(r.status_code, 403)


class SerializerInCampaignTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com')
        self.dm = make_user('dm@x.com')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.char_standalone = Character.objects.create(owner=self.owner, name='Lonely', data={})
        self.char_in_camp = Character.objects.create(owner=self.owner, name='Camp', data={})
        camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=camp, user=self.owner, character=self.char_in_camp, role='player')

    def test_standalone_returns_false(self):
        r = self.c_owner.get(f'/api/characters/{self.char_standalone.id}')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()['character']['inCampaign'])

    def test_in_campaign_returns_true(self):
        r = self.c_owner.get(f'/api/characters/{self.char_in_camp.id}')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['character']['inCampaign'])
