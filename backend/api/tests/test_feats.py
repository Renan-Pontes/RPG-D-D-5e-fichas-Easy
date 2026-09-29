"""
Talentos do catálogo no ASI (espelho de frontend/tests/feats.test.js).
"""
from django.test import TestCase, SimpleTestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership, Approval
from api.progression import validate_level_choice, apply_level_choice
from api.progression.rules import FEATS, FEATS_BY_ID

User = get_user_model()


def fighter(level=4, **extra):
    return {'rulesVersion': '2024', 'className': 'fighter', 'level': level, 'maxHp': 40, 'currentHp': 40,
            'abilities': {'str': 16, 'dex': 14, 'con': 14, 'int': 10, 'wis': 12, 'cha': 8}, **extra}


def feat(fid, asi=None, picks=None):
    return {'type': 'feat', 'feat': fid, 'featId': fid, 'asi': asi or {}, 'picks': picks or {}}


class FeatValidationTests(SimpleTestCase):
    def test_catalog_synced(self):
        self.assertGreaterEqual(len(FEATS), 180)
        self.assertEqual(FEATS_BY_ID['boonOfFate']['asi']['max'], 30)
        self.assertEqual(FEATS_BY_ID['athlete']['prereq']['level'], 4)

    def test_valid_feat_and_free_text(self):
        self.assertEqual(validate_level_choice(fighter(), 4, feat('athlete', {'str': 1}))['issues'], [])
        self.assertTrue(validate_level_choice(fighter(), 4, {'type': 'feat', 'feat': 'Da Casa'})['valid'])

    def test_unknown_and_other_rules(self):
        self.assertFalse(validate_level_choice(fighter(), 4, feat('naoExiste'))['valid'])
        self.assertFalse(validate_level_choice(fighter(), 4, feat('alert2014'))['valid'])

    def test_asi_rules(self):
        c = fighter()
        self.assertFalse(validate_level_choice(c, 4, feat('athlete'))['valid'])
        self.assertFalse(validate_level_choice(c, 4, feat('athlete', {'int': 1}))['valid'])
        self.assertFalse(validate_level_choice(c, 4, feat('athlete', {'str': 1, 'dex': 1}))['valid'])
        self.assertFalse(validate_level_choice(c, 4, feat('athlete', {'str': True}))['valid'])
        self.assertFalse(validate_level_choice(c, 4, feat('alert', {'dex': 1}))['valid'])
        maxed = fighter(abilities={'str': 20, 'dex': 20})
        self.assertFalse(validate_level_choice(maxed, 4, feat('athlete', {'str': 1}))['valid'])
        self.assertTrue(validate_level_choice(maxed, 4, feat('athlete'))['valid'])

    def test_epic_boon_cap_30_and_level(self):
        c = fighter(19, abilities={'str': 20})
        self.assertEqual(validate_level_choice(c, 19, feat('boonOfCombatProwess', {'str': 1}))['issues'], [])
        self.assertFalse(validate_level_choice(fighter(19, abilities={'str': 30}), 19, feat('boonOfCombatProwess', {'str': 1}))['valid'])
        self.assertFalse(validate_level_choice(fighter(), 4, feat('boonOfCombatProwess', {'str': 1}))['valid'])

    def test_prereq_and_fighting_style(self):
        weak = fighter(abilities={'str': 10, 'dex': 10})
        self.assertFalse(validate_level_choice(weak, 4, feat('athlete', {'str': 1}))['valid'])
        self.assertTrue(validate_level_choice(fighter(), 4, feat('archery'))['valid'])
        wizard = {'rulesVersion': '2024', 'className': 'wizard', 'level': 4, 'abilities': {'int': 16}}
        self.assertFalse(validate_level_choice(wizard, 4, feat('archery'))['valid'])

    def test_repeat(self):
        had = fighter(feats=[{'name': 'Atleta', 'id': 'athlete', 'level': 1}])
        self.assertIn('Talento já escolhido', validate_level_choice(had, 4, feat('athlete', {'str': 1}))['issues'])
        mi = fighter(feats=[{'name': 'MI', 'id': 'magicInitiate', 'level': 1, 'picks': {'spellList': 'cleric'}}])

        def picks(lst):
            return {'spellList': lst, 'spellAbility': 'wis', 'cantrip': ['a', 'b'], 'spell': ['c']}
        self.assertFalse(validate_level_choice(mi, 4, feat('magicInitiate', None, picks('cleric')))['valid'])
        self.assertEqual(validate_level_choice(mi, 4, feat('magicInitiate', None, picks('wizard')))['issues'], [])

    def test_picks_required(self):
        self.assertFalse(validate_level_choice(fighter(), 4, feat('skilled'))['valid'])
        self.assertFalse(validate_level_choice(fighter(), 4, feat('skilled', None, {'skillOrTool': ['a', 'a', 'b']}))['valid'])
        self.assertTrue(validate_level_choice(fighter(), 4, feat('skilled', None, {'skillOrTool': ['a', 'b', 'c']}))['valid'])

    def test_apply_adds_asi_and_records(self):
        nxt = apply_level_choice(fighter(), 4, {**feat('athlete', {'str': 1}), 'note': 'n'})
        self.assertEqual(nxt['abilities']['str'], 17)
        self.assertEqual(nxt['feats'], [{'name': 'athlete', 'id': 'athlete', 'level': 4, 'note': 'n', 'asi': {'str': 1}}])
        free = apply_level_choice(fighter(), 4, {'type': 'feat', 'feat': ' Casa ', 'note': 'x'})
        self.assertEqual(free['feats'], [{'name': 'Casa', 'level': 4, 'note': 'x'}])
        self.assertEqual(free['abilities']['str'], 16)


def make_user(email, name='U'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


class FeatApprovalTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'P')
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.char = Character.objects.create(owner=self.player, name='Brom', data=fighter(3))
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char, role='player')
        self.apr = Approval.objects.create(campaign=self.camp, character=self.char, requested_by=self.player,
                                           type='levelup', payload={'toLevel': 4}, status='approved').id

    def test_consume_with_catalog_feat(self):
        r = self.c_p.post(f'/api/approvals/{self.apr}/consume',
                          {'hpGain': 6, 'choice': feat('athlete', {'dex': 1})}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['abilities']['dex'], 15)
        self.assertEqual(self.char.data['feats'][0]['id'], 'athlete')

    def test_consume_rejects_bad_feat(self):
        r = self.c_p.post(f'/api/approvals/{self.apr}/consume',
                          {'hpGain': 6, 'choice': feat('athlete', {'int': 1})}, format='json')
        self.assertEqual(r.status_code, 400)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['level'], 3)
