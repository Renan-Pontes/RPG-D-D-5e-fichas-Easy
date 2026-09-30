"""
Opções selecionáveis de classe (invocações do bruxo como caso de referência).
"""
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import Profile, Character, Campaign, Membership, Approval
from api.progression import validate_class_options, compute_progression
from api.progression.options import apply_option_picks

User = get_user_model()


def make_user(email, name='U'):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=name)
    return u


def warlock(level, **extra):
    return {'rulesVersion': '2024', 'level': level, 'className': 'warlock', 'subclass': 'fiend' if level >= 3 else '',
            'currentHp': 20, 'maxHp': 20, 'abilities': {'con': 14, 'cha': 16}, **extra}


def inv(*ids):
    return {'adds': [{'pool': 'invocation', 'id': i} for i in ids]}


class ClassOptionEngineTests(TestCase):
    def test_prereq_count_and_repeat(self):
        w = warlock(5)
        self.assertFalse(validate_class_options(w, 'warlock', inv('thirstingBlade'))['valid'])
        self.assertTrue(validate_class_options(w, 'warlock', inv('pactOfTheBlade', 'thirstingBlade'))['valid'])
        self.assertFalse(validate_class_options(w, 'warlock', inv('witchSight'))['valid'], 'nível 15+')
        too_many = inv('pactOfTheBlade', 'thirstingBlade', 'armorOfShadows', 'devilsSight', 'eldritchMind', 'mistyVisions')
        self.assertFalse(validate_class_options(w, 'warlock', too_many)['valid'])
        self.assertFalse(validate_class_options(w, 'warlock', inv('armorOfShadows', 'armorOfShadows'))['valid'])
        rep = {'adds': [{'pool': 'invocation', 'id': 'agonizingBlast', 'detail': 'eldritchBlast'},
                        {'pool': 'invocation', 'id': 'agonizingBlast', 'detail': 'eldritchBlast'}]}
        self.assertFalse(validate_class_options(w, 'warlock', rep)['valid'], 'repetível exige alvo diferente')

    def test_grants_become_auto_spells(self):
        w = apply_option_picks(warlock(2), 'warlock', inv('armorOfShadows'), 2)
        self.assertIn('mageArmor', compute_progression(w)['auto_spells'])

    def test_swap_only_on_level_up(self):
        w = apply_option_picks(warlock(2), 'warlock', inv('devilsSight'), 2)
        swap = {'swaps': [{'pool': 'invocation', 'from': 'devilsSight', 'to': 'eldritchMind'}]}
        self.assertFalse(validate_class_options(w, 'warlock', swap)['valid'])
        self.assertTrue(validate_class_options(w, 'warlock', swap, level_up=True)['valid'])


class LegacyChoiceMirrorTests(TestCase):
    """Escolhas 2014 da auditoria Aurora (espelho de options.js)."""

    def test_rogue_2014_expertise_accepts_thieves_tools(self):
        c = {'rulesVersion': '2014', 'className': 'rogue', 'level': 1, 'classOptions': []}
        adds = {'adds': [{'pool': 'expertise2014', 'id': 'stealth'}, {'pool': 'expertise2014', 'id': 'thievesTools'}]}
        self.assertTrue(validate_class_options(c, 'rogue', adds)['valid'])
        adds['adds'].append({'pool': 'expertise2014', 'id': 'perception'})
        self.assertFalse(validate_class_options(c, 'rogue', adds)['valid'])
        self.assertEqual(compute_progression({**c, 'level': 6})['option_slots']['expertise2014']['total'], 4)

    def test_fighting_style_2014_respects_class_list(self):
        r = {'rulesVersion': '2014', 'className': 'ranger', 'level': 2, 'classOptions': []}
        self.assertTrue(validate_class_options(r, 'ranger', {'adds': [{'pool': 'fightingStyle', 'id': 'archery'}]})['valid'])
        self.assertFalse(validate_class_options(r, 'ranger', {'adds': [{'pool': 'fightingStyle', 'id': 'superiorTechnique'}]})['valid'])
        f = {'rulesVersion': '2014', 'className': 'fighter', 'level': 1, 'classOptions': []}
        st = {'adds': [{'pool': 'fightingStyle', 'id': 'superiorTechnique'}, {'pool': 'maneuver', 'id': 'riposte'}]}
        self.assertTrue(validate_class_options(f, 'fighter', st)['valid'])

    def test_repeatable_without_detail(self):
        inf = [{'classId': 'artificer', 'pool': 'infusion', 'id': 'replicateMagicItem', 'level': 2},
               {'classId': 'artificer', 'pool': 'replicateItem', 'id': 'bagOfHolding', 'level': 2}]
        a = {'rulesVersion': '2014', 'className': 'artificer', 'level': 2, 'classOptions': inf}
        adds = {'adds': [{'pool': 'infusion', 'id': 'replicateMagicItem'}, {'pool': 'replicateItem', 'id': 'wandOfSecrets'}]}
        self.assertTrue(validate_class_options(a, 'artificer', adds)['valid'])
        high = {'adds': [{'pool': 'infusion', 'id': 'replicateMagicItem'}, {'pool': 'replicateItem', 'id': 'bootsOfSpeed'}]}
        self.assertFalse(validate_class_options(a, 'artificer', high)['valid'])

    def test_bard_magical_secrets_and_barbarian_primal_knowledge(self):
        b = {'rulesVersion': '2014', 'className': 'bard', 'level': 14, 'classOptions': []}
        self.assertEqual(compute_progression(b)['option_slots']['magicalSecrets2014']['total'], 4)
        bb = {'rulesVersion': '2014', 'className': 'barbarian', 'level': 3,
              'classOptions': [{'classId': 'barbarian', 'pool': 'tceOptional', 'id': 'primalKnowledge', 'level': 3}]}
        self.assertTrue(validate_class_options(bb, 'barbarian', {'adds': [{'pool': 'primalKnowledge', 'id': 'athletics'}]})['valid'])
        self.assertFalse(validate_class_options(bb, 'barbarian', {'adds': [{'pool': 'primalKnowledge', 'id': 'arcana'}]})['valid'])


class ClassOptionApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = make_user('dm@x.com', 'DM')
        self.player = make_user('p@x.com', 'P')
        self.c_p = APIClient(); self.c_p.force_login(self.player)
        self.camp = Campaign.objects.create(dm=self.dm, name='C', slug='c')
        self.char = Character.objects.create(owner=self.player, name='Morg', data=warlock(1))
        Membership.objects.create(campaign=self.camp, user=self.player, character=self.char, role='player')

    def test_endpoint_registers_pending_options(self):
        r = self.c_p.post(f'/api/characters/{self.char.id}/class-options', {'classId': 'warlock', **inv('armorOfShadows')}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        self.assertEqual([p['id'] for p in self.char.data['classOptions']], ['armorOfShadows'])
        self.assertIn('mageArmor', [s['id'] for s in self.char.data['spells']])
        r = self.c_p.post(f'/api/characters/{self.char.id}/class-options', {'classId': 'warlock', **inv('eldritchMind')}, format='json')
        self.assertEqual(r.status_code, 400, 'nível 1 só tem 1 invocação')

    def test_put_cannot_change_options_in_campaign(self):
        data = {**self.char.data, 'classOptions': [{'classId': 'warlock', 'pool': 'invocation', 'id': 'witchSight', 'level': 1}]}
        r = self.c_p.put(f'/api/characters/{self.char.id}', {'name': 'Morg', 'data': data}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_consume_level_up_with_options(self):
        apr = Approval.objects.create(campaign=self.camp, character=self.char, requested_by=self.player,
                                      type='levelup', payload={'toLevel': 2}, status='approved')
        r = self.c_p.post(f'/api/approvals/{apr.id}/consume', {'hpGain': 5, **{'options': inv('armorOfShadows', 'devilsSight', 'witchSight')}}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.c_p.post(f'/api/approvals/{apr.id}/consume', {'hpGain': 5, 'options': inv('armorOfShadows', 'devilsSight', 'eldritchMind')}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.char.refresh_from_db()
        self.assertEqual(self.char.data['level'], 2)
        self.assertEqual({p['level'] for p in self.char.data['classOptions']}, {2})


class KenseiMigrationTests(TestCase):
    def test_old_kensei_picks_move_to_melee_and_ranged_pools(self):
        from api.progression.options import migrate_class_options, validate_option_picks
        old = {
            'rulesVersion': '2014', 'className': 'monk', 'subclass': 'kensei', 'level': 4,
            'classOptions': [
                {'classId': 'monk', 'pool': 'kenseiWeapon', 'id': 'longbow', 'level': 3},
                {'classId': 'monk', 'pool': 'kenseiWeapon', 'id': 'longsword', 'level': 3},
            ],
        }
        m = migrate_class_options(old)
        pools = sorted((p['pool'], p['id']) for p in m['classOptions'])
        self.assertEqual(pools, [('kenseiWeaponMelee', 'longsword'), ('kenseiWeaponRanged', 'longbow')])
        self.assertTrue(validate_option_picks(old, 'monk', {}, 4)['valid'])
