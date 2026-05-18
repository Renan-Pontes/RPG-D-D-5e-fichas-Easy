"""
Testes do Wild Shape: engine puro + endpoints REST.
"""
from django.test import TestCase, SimpleTestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership
from api import wild_shape as ws

User = get_user_model()


def make_user(email, name='User', password='senha-forte-2026'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password=password)
    Profile.objects.create(user=u, display_name=name)
    return u


# ============================================================
# Engine puro
# ============================================================
class WildShapeEngineTests(SimpleTestCase):
    def _druid(self, level=4, subclass='moon', current_hp=20):
        return {'className': 'druid', 'level': level, 'subclass': subclass,
                'currentHp': current_hp, 'tempHp': 0, 'wildShapeUses': 0}

    def _wolf(self):
        return {'id': 'wolf', 'name': 'Wolf', 'crNum': 0.25, 'hp': 11, 'ac': 13,
                'str': 12, 'dex': 15, 'con': 12, 'int': 3, 'wis': 12, 'cha': 6,
                'speed': 40, 'size': 'Medium', 'actions': []}

    def test_max_cr_moon(self):
        self.assertEqual(ws.max_cr_for(2, 'moon'), 1)
        self.assertEqual(ws.max_cr_for(5, 'moon'), 1)
        self.assertEqual(ws.max_cr_for(6, 'moon'), 2)
        self.assertEqual(ws.max_cr_for(9, 'moon'), 3)

    def test_max_cr_standard(self):
        self.assertEqual(ws.max_cr_for(2, 'land'), 0.25)
        self.assertEqual(ws.max_cr_for(4, 'land'), 0.5)
        self.assertEqual(ws.max_cr_for(8, 'land'), 1.0)

    def test_eligibility_blocks_fly_below_8_for_non_moon(self):
        eagle = {'crNum': 0.25, 'fly': 60, 'hp': 1}
        ok, reason = ws.beast_eligible(4, 'land', eagle)
        self.assertFalse(ok)
        self.assertEqual(reason, 'no_fly_below_8')

    def test_eligibility_allows_fly_for_moon(self):
        eagle = {'crNum': 0.25, 'fly': 60, 'hp': 1}
        ok, _ = ws.beast_eligible(2, 'moon', eagle)
        self.assertTrue(ok)

    def test_transform_consumes_use_and_swaps_hp(self):
        c = self._druid(current_hp=20)
        wolf = self._wolf()
        result, err = ws.transform(c, wolf)
        self.assertIsNone(err)
        self.assertEqual(result['wildShapeUses'], 1)
        self.assertTrue(result['wildShape']['active'])
        self.assertEqual(result['wildShape']['preTransformHp'], 20)
        self.assertEqual(result['wildShape']['beastCurrentHp'], 11)
        self.assertEqual(result['currentHp'], 11)  # HP visível = fera

    def test_transform_already_active_blocked(self):
        c = self._druid()
        c['wildShape'] = {'active': True}
        _, err = ws.transform(c, self._wolf())
        self.assertEqual(err, 'already_transformed')

    def test_end_transform_restores_pre_hp(self):
        c = self._druid(current_hp=20)
        c, _ = ws.transform(c, self._wolf())
        # Saída voluntária: zero excedente
        c, _ = ws.end_transform(c, excess_damage=0)
        self.assertFalse((c.get('wildShape') or {}).get('active'))
        self.assertEqual(c['currentHp'], 20)  # restaurado

    def test_end_transform_with_excess_damage(self):
        c = self._druid(current_hp=20)
        c, _ = ws.transform(c, self._wolf())
        # Excedente de 5 ao sair (fera caiu e dano sobrou)
        c, _ = ws.end_transform(c, excess_damage=5)
        self.assertEqual(c['currentHp'], 15)  # 20 - 5

    def test_damage_in_wild_shape_hits_beast(self):
        c = self._druid(current_hp=20)
        c, _ = ws.transform(c, self._wolf())  # fera 11 HP
        next_c, taken, ended = ws.apply_damage_in_wild_shape(c, 8)
        self.assertEqual(taken, 8)
        self.assertFalse(ended)
        self.assertEqual(next_c['wildShape']['beastCurrentHp'], 3)

    def test_damage_overflows_to_druid_and_ends_form(self):
        c = self._druid(current_hp=20)
        c, _ = ws.transform(c, self._wolf())  # fera 11 HP
        next_c, taken, ended = ws.apply_damage_in_wild_shape(c, 15)  # 11 + 4 excedente
        self.assertTrue(ended)
        self.assertFalse((next_c.get('wildShape') or {}).get('active'))
        self.assertEqual(next_c['currentHp'], 16)  # 20 - 4


# ============================================================
# Endpoints REST
# ============================================================
class WildShapeEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('o@x.com', 'Owner')
        self.other = make_user('z@x.com', 'Other')
        self.dm = make_user('dm@x.com', 'DM')
        self.c_owner = APIClient(); self.c_owner.force_login(self.owner)
        self.c_other = APIClient(); self.c_other.force_login(self.other)
        self.c_dm = APIClient(); self.c_dm.force_login(self.dm)
        self.char = Character.objects.create(owner=self.owner, name='Druid', data={
            'className': 'druid', 'level': 4, 'subclass': 'moon',
            'currentHp': 30, 'tempHp': 0, 'maxHp': 30, 'wildShapeUses': 0,
            'abilities': {'str': 10, 'dex': 12, 'con': 14, 'int': 13, 'wis': 16, 'cha': 10},
        })

    def _wolf_payload(self):
        return {'beast': {'id': 'wolf', 'name': 'Wolf', 'crNum': 0.25, 'hp': 11, 'ac': 13,
                          'str': 12, 'dex': 15, 'con': 12, 'int': 3, 'wis': 12, 'cha': 6,
                          'speed': 40, 'size': 'Medium', 'actions': []}}

    def test_owner_can_transform(self):
        r = self.c_owner.post(f'/api/characters/{self.char.id}/wild-shape/transform',
                              self._wolf_payload(), format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertTrue(self.char.data['wildShape']['active'])
        self.assertEqual(self.char.data['wildShapeUses'], 1)

    def test_other_user_cannot_transform(self):
        r = self.c_other.post(f'/api/characters/{self.char.id}/wild-shape/transform',
                              self._wolf_payload(), format='json')
        self.assertEqual(r.status_code, 403)

    def test_non_druid_cannot_transform(self):
        self.char.data['className'] = 'wizard'
        self.char.save()
        r = self.c_owner.post(f'/api/characters/{self.char.id}/wild-shape/transform',
                              self._wolf_payload(), format='json')
        self.assertEqual(r.status_code, 400)

    def test_no_uses_remaining(self):
        self.char.data['wildShapeUses'] = 2
        self.char.save()
        r = self.c_owner.post(f'/api/characters/{self.char.id}/wild-shape/transform',
                              self._wolf_payload(), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json().get('error'), 'no_uses_remaining')

    def test_owner_can_end_transform(self):
        self.c_owner.post(f'/api/characters/{self.char.id}/wild-shape/transform',
                          self._wolf_payload(), format='json')
        r = self.c_owner.post(f'/api/characters/{self.char.id}/wild-shape/end')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertFalse((self.char.data.get('wildShape') or {}).get('active'))

    def test_dm_can_force_end_in_their_campaign(self):
        camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        Membership.objects.create(campaign=camp, user=self.owner, character=self.char, role='player')
        self.c_owner.post(f'/api/characters/{self.char.id}/wild-shape/transform',
                          self._wolf_payload(), format='json')
        r = self.c_dm.post(f'/api/characters/{self.char.id}/wild-shape/force-end',
                          {'excessDamage': 5}, format='json')
        self.assertEqual(r.status_code, 200)
        self.char.refresh_from_db()
        self.assertFalse((self.char.data.get('wildShape') or {}).get('active'))
        # HP humanoide caiu 5
        self.assertEqual(self.char.data['currentHp'], 25)

    def test_dm_of_other_campaign_cannot_force_end(self):
        # Druida NÃO está em campanha do dm
        self.c_owner.post(f'/api/characters/{self.char.id}/wild-shape/transform',
                          self._wolf_payload(), format='json')
        r = self.c_dm.post(f'/api/characters/{self.char.id}/wild-shape/force-end', {}, format='json')
        self.assertEqual(r.status_code, 403)
