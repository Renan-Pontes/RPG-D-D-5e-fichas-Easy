"""Planos: limites por conta (personagens, campanhas, imagens, cartões), vagas de
mesa, uso de imagens medido, catálogo e atribuição pelo admin."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api import plans as P
from api.models import (AddOn, Adventure, Campaign, Character, CombatInstance, Membership, Plan, Profile,
                        UserPlan, WorldEntry, WorldImage)

User = get_user_model()


def mk(email, staff=False):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026',
                                 is_staff=staff)
    Profile.objects.create(user=u, display_name=email.split('@')[0].title())
    return u


def client(u):
    c = APIClient()
    c.force_login(u)
    return c


def img(n_chars):
    """data URL jpeg válida com ~n_chars de tamanho."""
    head = 'data:image/jpeg;base64,'
    return head + 'A' * max(4, (n_chars - len(head)) // 4 * 4)


def give(user, slug, addons=None):
    return P.assign_plan(user, plan_slug=slug, addons=addons)


class PlanBase(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = mk('mestra@x.com')
        self.ana = mk('ana@x.com')
        self.c_dm = client(self.dm)
        self.c_ana = client(self.ana)


class CatalogTests(PlanBase):
    def test_migration_seeds_plans_and_addons(self):
        plans = {p.slug: p for p in Plan.objects.all()}
        self.assertEqual(set(plans), {'free', 'player', 'dm', 'legend'})
        self.assertEqual((plans['free'].max_characters, plans['free'].max_campaigns,
                          plans['free'].table_slots, plans['free'].storage_mb), (3, 1, 0, 25))
        self.assertEqual((plans['player'].price_cents, plans['player'].max_characters, plans['player'].storage_mb),
                         (490, 30, 50))
        self.assertEqual((plans['dm'].price_cents, plans['dm'].max_characters, plans['dm'].max_campaigns,
                          plans['dm'].table_slots, plans['dm'].storage_mb), (1490, 5, 3, 6, 400))
        self.assertEqual((plans['legend'].price_cents, plans['legend'].max_characters, plans['legend'].max_campaigns,
                          plans['legend'].table_slots, plans['legend'].storage_mb), (2990, 10, 8, 8, 1500))
        addons = {a.slug: (a.kind, a.amount, a.price_cents) for a in AddOn.objects.all()}
        self.assertEqual(addons, {'campaign': ('campaigns', 1, 290), 'storage': ('storage_mb', 250, 390),
                                  'characters': ('characters', 20, 190), 'slots': ('table_slots', 2, 190)})

    def test_public_catalog(self):
        r = APIClient().get('/api/plans')
        self.assertEqual(r.status_code, 200)
        self.assertEqual([p['slug'] for p in r.data['plans']], ['free', 'player', 'dm', 'legend'])
        self.assertEqual(len(r.data['addons']), 4)
        self.assertFalse(r.data['paymentsEnabled'])
        self.assertEqual(r.data['cardsPerCampaign'], 2000)

    def test_me_plan_defaults_to_free(self):
        r = self.c_ana.get('/api/me/plan')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['plan']['slug'], 'free')
        self.assertEqual(r.data['limits']['characters'], 3)
        self.assertEqual(r.data['limits']['storageBytes'], 25 * P.MB)
        self.assertEqual(r.data['usage']['characters'], 0)
        self.assertEqual(APIClient().get('/api/me/plan').status_code in (401, 403), True)

    def test_addons_add_up_per_account(self):
        give(self.dm, 'dm', {'campaign': 2, 'storage': 1, 'characters': 1, 'slots': 1})
        lim = P.limits(self.dm)
        self.assertEqual(lim['campaigns'], 5)
        self.assertEqual(lim['storageMb'], 650)
        self.assertEqual(lim['characters'], 25)
        self.assertEqual(lim['slotsPerCampaign'], 8)

    def test_expired_plan_falls_back_to_free(self):
        from datetime import timedelta
        from django.utils import timezone
        P.assign_plan(self.dm, plan_slug='legend', valid_until=timezone.now() - timedelta(days=1))
        self.assertEqual(P.limits(self.dm)['campaigns'], 1)
        r = self.c_dm.get('/api/me/plan')
        self.assertTrue(r.data['expired'])
        self.assertEqual(r.data['plan']['slug'], 'free')

    def test_checkout_is_coming_soon(self):
        r = self.c_ana.post('/api/me/plan/checkout', {'plan': 'dm'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['available'])
        self.assertIn('contact', r.data)
        self.assertEqual(self.c_ana.post('/api/me/plan/checkout', {'plan': 'nope'}, format='json').status_code, 400)


class CharacterLimitTests(PlanBase):
    def test_free_blocks_fourth_character_with_structured_error(self):
        for i in range(3):
            self.assertEqual(self.c_ana.post('/api/characters', {'name': f'P{i}', 'data': {}}, format='json').status_code, 200)
        r = self.c_ana.post('/api/characters', {'name': 'P4', 'data': {}}, format='json')
        self.assertEqual(r.status_code, 402)
        self.assertEqual(r.data['error'], 'plan_limit')
        self.assertEqual(r.data['limit'], 'characters')
        self.assertEqual((r.data['used'], r.data['max'], r.data['plan']), (3, 3, 'free'))
        self.assertEqual(r.data['next']['plan']['slug'], 'player')
        self.assertEqual(r.data['next']['plan']['value'], 30)
        self.assertEqual(r.data['next']['addon']['slug'], 'characters')
        self.assertEqual(Character.objects.filter(owner=self.ana).count(), 3)

    def test_over_limit_keeps_everything(self):
        give(self.ana, 'player')
        for i in range(5):
            Character.objects.create(owner=self.ana, name=f'P{i}')
        give(self.ana, 'free')  # rebaixada: nada some, só não cria mais
        self.assertEqual(Character.objects.filter(owner=self.ana).count(), 5)
        self.assertEqual(self.c_ana.get('/api/characters').status_code, 200)
        self.assertEqual(len(self.c_ana.get('/api/characters').data['characters']), 5)
        self.assertEqual(self.c_ana.post('/api/characters', {'name': 'X', 'data': {}}, format='json').status_code, 402)
        ch = Character.objects.filter(owner=self.ana).first()
        r = self.c_ana.put(f'/api/characters/{ch.id}', {'name': 'Renomeada', 'data': {}}, format='json')
        self.assertEqual(r.status_code, 200)


    def test_upgrade_hint_considers_current_usage(self):
        give(self.ana, 'player')
        for i in range(25):
            Character.objects.create(owner=self.ana, name=f'P{i}')
        give(self.ana, 'free')  # rebaixada: 25 de 3
        r = self.c_ana.post('/api/characters', {'name': 'X', 'data': {}}, format='json')
        self.assertEqual(r.status_code, 402)
        self.assertEqual(r.data['next']['plan']['slug'], 'player')  # 30 > 25
        self.assertEqual(r.data['next']['addon']['needed'], 2)  # 3 + 2×20 = 43 ≥ 26
        for i in range(25, 35):
            Character.objects.create(owner=self.ana, name=f'P{i}')
        r = self.c_ana.post('/api/characters', {'name': 'X', 'data': {}}, format='json')
        self.assertIsNone(r.data['next']['plan'])  # nenhum plano passa de 35
        self.assertEqual(r.data['next']['addon']['needed'], 2)  # 3 + 40 = 43 ≥ 36


class CampaignLimitTests(PlanBase):
    def test_free_one_campaign(self):
        self.assertEqual(self.c_dm.post('/api/campaigns', {'name': 'A'}, format='json').status_code, 200)
        r = self.c_dm.post('/api/campaigns', {'name': 'B'}, format='json')
        self.assertEqual(r.status_code, 402)
        self.assertEqual((r.data['limit'], r.data['used'], r.data['max']), ('campaigns', 1, 1))
        self.assertEqual(r.data['next']['plan']['slug'], 'dm')

    def test_closed_campaign_still_counts(self):
        camp = Campaign.objects.create(dm=self.dm, name='A')
        self.c_dm.delete(f'/api/campaigns/{camp.id}')
        self.assertEqual(self.c_dm.post('/api/campaigns', {'name': 'B'}, format='json').status_code, 402)

    def test_dm_plan_three_campaigns_plus_addon(self):
        give(self.dm, 'dm')
        for i in range(3):
            self.assertEqual(self.c_dm.post('/api/campaigns', {'name': f'C{i}'}, format='json').status_code, 200)
        self.assertEqual(self.c_dm.post('/api/campaigns', {'name': 'C4'}, format='json').status_code, 402)
        give(self.dm, 'dm', {'campaign': 1})
        self.assertEqual(self.c_dm.post('/api/campaigns', {'name': 'C4'}, format='json').status_code, 200)


class ImageUsageTests(PlanBase):
    def setUp(self):
        super().setUp()
        self.camp = Campaign.objects.create(dm=self.dm, name='Mesa')

    def test_usage_measures_every_kind(self):
        e = WorldEntry.objects.create(campaign=self.camp, kind='place', name='Vila')
        WorldImage.objects.create(entry=e, data=img(1000))
        Campaign.objects.filter(pk=self.camp.pk).update(cover_image=img(2000))
        CombatInstance.objects.create(campaign=self.camp, map_data={'background_image': img(3000)})
        Adventure.objects.create(campaign=self.camp, name='Cripta',
                                 data={'nodes': [{'id': 'n1', 'image': img(4000)}, {'id': 'n2', 'image': ''}]})
        Character.objects.create(owner=self.dm, name='Ret', data={'avatar': img(500)})
        Character.objects.create(owner=self.dm, name='Pronta', data={'avatar': '/art/pregens/elfa.webp'})
        u = P.image_usage(self.dm)
        self.assertEqual(u['world'], len(img(1000)))
        self.assertEqual(u['covers'], len(img(2000)))
        self.assertEqual(u['combatMaps'], len(img(3000)))
        self.assertEqual(u['adventureMaps'], len(img(4000)))
        self.assertEqual(u['avatars'], len(img(500)))
        self.assertEqual(u['total'], sum(len(img(n)) for n in (1000, 2000, 3000, 4000, 500)))
        self.assertEqual(u['byCampaign'][self.camp.id], u['total'] - u['avatars'])
        r = self.c_dm.get('/api/me/plan')
        self.assertEqual(r.data['usage']['storageBytes'], u['total'])
        self.assertEqual(r.data['usage']['byCampaign'][0]['imageBytes'], u['total'] - u['avatars'])

    def test_sample_world_art_does_not_count(self):
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/world/sample', {}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(P.image_usage(self.dm)['world'], 0)

    def _shrink_to(self, total_bytes):
        Plan.objects.filter(slug='free').update(storage_mb=1)
        return P.MB

    def test_world_image_blocked_when_bag_is_full(self):
        cap = self._shrink_to(1)
        e = WorldEntry.objects.create(campaign=self.camp, kind='place', name='Vila')
        e2 = WorldEntry.objects.create(campaign=self.camp, kind='place', name='Forte')
        # 3 imagens grandes de outra campanha ocupam quase tudo
        other = Campaign.objects.create(dm=self.dm, name='Outra')
        for i in range(3):
            x = WorldEntry.objects.create(campaign=other, kind='lore', name=f'L{i}')
            WorldImage.objects.create(entry=x, data=img(330_000))
        r = self.c_dm.put(f'/api/world/{e.id}/image', {'image': img(100_000)}, format='json')
        self.assertEqual(r.status_code, 402, r.content)
        self.assertEqual(r.data['limit'], 'images')
        self.assertEqual(r.data['max'], cap)
        self.assertEqual(r.data['next']['addon']['slug'], 'storage')
        self.assertFalse(WorldImage.objects.filter(entry=e).exists())
        # imagem pequena cabe
        self.assertEqual(self.c_dm.put(f'/api/world/{e2.id}/image', {'image': img(20_000)}, format='json').status_code, 200)

    def test_replacing_with_smaller_always_allowed(self):
        self._shrink_to(1)
        e = WorldEntry.objects.create(campaign=self.camp, kind='place', name='Vila')
        WorldImage.objects.create(entry=e, data=img(400_000))
        for i in range(2):
            x = WorldEntry.objects.create(campaign=self.camp, kind='lore', name=f'L{i}')
            WorldImage.objects.create(entry=x, data=img(400_000))
        self.assertGreater(P.image_usage(self.dm)['total'], P.MB)  # já acima (rebaixado)
        r = self.c_dm.put(f'/api/world/{e.id}/image', {'image': img(10_000)}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.c_dm.delete(f'/api/world/{e.id}/image').status_code, 200)

    def test_cover_combat_adventure_and_avatar_are_checked(self):
        self._shrink_to(1)
        x = WorldEntry.objects.create(campaign=self.camp, kind='lore', name='L')
        WorldImage.objects.create(entry=x, data=img(440_000))
        x2 = WorldEntry.objects.create(campaign=self.camp, kind='lore', name='L2')
        WorldImage.objects.create(entry=x2, data=img(440_000))
        big = img(200_000)
        r = self.c_dm.put(f'/api/campaigns/{self.camp.id}/cover', {'image': big}, format='json')
        self.assertEqual((r.status_code, r.data['limit']), (402, 'images'))
        r = self.c_dm.post(f'/api/combat/campaign/{self.camp.id}/map', {'background_image': big}, format='json')
        self.assertEqual((r.status_code, r.data['limit']), (402, 'images'))
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/adventures',
                           {'name': 'A', 'data': {'nodes': [{'id': 'n1', 'name': 'Sala', 'image': big}]}},
                           format='json')
        self.assertEqual((r.status_code, r.data['limit']), (402, 'images'))
        r = self.c_dm.post('/api/characters', {'name': 'Ret', 'data': {'avatar': big}}, format='json')
        self.assertEqual((r.status_code, r.data['limit']), (402, 'images'))
        # arte do site não conta
        r = self.c_dm.post('/api/characters', {'name': 'Pronta', 'data': {'avatar': '/art/pregens/x.webp'}},
                           format='json')
        self.assertEqual(r.status_code, 200)

    def test_bag_is_shared_between_campaigns(self):
        give(self.dm, 'dm')
        Plan.objects.filter(slug='dm').update(storage_mb=1)
        other = Campaign.objects.create(dm=self.dm, name='Outra')
        e1 = WorldEntry.objects.create(campaign=self.camp, kind='place', name='A')
        e2 = WorldEntry.objects.create(campaign=other, kind='place', name='B')
        self.assertEqual(self.c_dm.put(f'/api/world/{e1.id}/image', {'image': img(440_000)}, format='json').status_code, 200)
        self.assertEqual(self.c_dm.put(f'/api/world/{e2.id}/image', {'image': img(440_000)}, format='json').status_code, 200)
        e3 = WorldEntry.objects.create(campaign=other, kind='place', name='C')
        self.assertEqual(self.c_dm.put(f'/api/world/{e3.id}/image', {'image': img(440_000)}, format='json').status_code, 402)


class CardsLimitTests(PlanBase):
    def test_technical_cap_per_campaign(self):
        camp = Campaign.objects.create(dm=self.dm, name='Mesa')
        WorldEntry.objects.bulk_create([WorldEntry(campaign=camp, kind='lore', name=f'E{i}')
                                        for i in range(P.MAX_CARDS_PER_CAMPAIGN)])
        r = self.c_dm.post(f'/api/campaigns/{camp.id}/world', {'kind': 'lore', 'name': 'Mais'}, format='json')
        self.assertEqual(r.status_code, 402)
        self.assertEqual((r.data['error'], r.data['limit'], r.data['max']), ('plan_limit', 'cards', 2000))
        self.assertIsNone(r.data['next'])

    def test_more_than_old_500_is_fine(self):
        camp = Campaign.objects.create(dm=self.dm, name='Mesa')
        WorldEntry.objects.bulk_create([WorldEntry(campaign=camp, kind='lore', name=f'E{i}') for i in range(600)])
        r = self.c_dm.post(f'/api/campaigns/{camp.id}/world', {'kind': 'lore', 'name': 'Mais'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)


class TableSlotTests(PlanBase):
    def setUp(self):
        super().setUp()
        give(self.dm, 'dm')  # 6 vagas por campanha
        self.camp = Campaign.objects.create(dm=self.dm, name='Mesa da Mestra')
        self.mine = [Character.objects.create(owner=self.ana, name=f'P{i}') for i in range(3)]

    def join(self, char_id=None, c=None):
        return (c or self.c_ana).post('/api/campaigns/join',
                                      {'inviteCode': self.camp.invite_code, 'characterId': char_id}, format='json')

    def test_player_at_limit_uses_dm_slot_and_frees_own_count(self):
        r = self.join(self.mine[0].id)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.data['sponsored'])
        self.assertEqual(r.data['dmName'], 'Mestra')
        self.assertTrue(Membership.objects.get(campaign=self.camp, user=self.ana).sponsored)
        self.assertEqual(P.counted_characters(self.ana).count(), 2)
        # agora cabe mais uma ficha própria
        self.assertEqual(self.c_ana.post('/api/characters', {'name': 'Nova', 'data': {}}, format='json').status_code, 200)
        ch = self.c_ana.get(f'/api/characters/{self.mine[0].id}').data['character']
        self.assertEqual(ch['tableSlot']['dmName'], 'Mestra')
        camp = self.c_dm.get(f'/api/campaigns/{self.camp.id}').data['campaign']
        self.assertEqual(camp['tableSlots'], {'used': 1, 'max': 6})
        self.assertTrue([m for m in camp['members'] if m['user']['id'] == self.ana.id][0]['sponsored'])

    def test_player_below_limit_does_not_use_slot(self):
        self.mine[2].delete()
        r = self.join(self.mine[0].id)
        self.assertFalse(r.data['sponsored'])
        self.assertEqual(P.slots_info(self.camp)['used'], 0)

    def test_free_dm_has_no_slots(self):
        give(self.dm, 'free')
        r = self.join(self.mine[0].id)
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['sponsored'])

    def test_slots_run_out(self):
        Plan.objects.filter(slug='dm').update(table_slots=1)
        bia = mk('bia@x.com')
        c_bia = client(bia)
        bia_chars = [Character.objects.create(owner=bia, name=f'B{i}') for i in range(3)]
        self.assertTrue(self.join(self.mine[0].id).data['sponsored'])
        r = self.join(bia_chars[0].id, c_bia)
        self.assertEqual(r.status_code, 200)  # entrar nunca é bloqueado (a ficha já existe)
        self.assertFalse(r.data['sponsored'])
        # mas criar ficha nova com o código, no limite e sem vaga → 402
        r = c_bia.post('/api/characters', {'name': 'Nova', 'data': {}, 'inviteCode': self.camp.invite_code},
                       format='json')
        self.assertEqual(r.status_code, 402)
        self.assertEqual(r.data['limit'], 'characters')
        self.assertEqual(r.data['slots'], {'used': 1, 'max': 1})

    def test_slot_addon(self):
        Plan.objects.filter(slug='dm').update(table_slots=0)
        give(self.dm, 'dm', {'slots': 1})
        self.assertEqual(P.slots_info(self.camp)['max'], 2)

    def test_create_character_with_invite_code_at_limit(self):
        r = self.c_ana.post('/api/characters', {'name': 'Convidada', 'data': {}, 'inviteCode': self.camp.invite_code},
                            format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.data['join']['sponsored'])
        self.assertEqual(r.data['join']['dmName'], 'Mestra')
        m = Membership.objects.get(campaign=self.camp, user=self.ana)
        self.assertEqual(m.character_id, r.data['character']['id'])
        self.assertTrue(m.sponsored)
        self.assertEqual(P.counted_characters(self.ana).count(), 3)

    def test_create_with_invite_below_limit_joins_normally(self):
        self.mine[2].delete()
        r = self.c_ana.post('/api/characters', {'name': 'Convidada', 'data': {}, 'inviteCode': self.camp.invite_code},
                            format='json')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['join']['sponsored'])
        self.assertEqual(self.c_ana.post('/api/characters', {'name': 'X', 'data': {},
                                                             'inviteCode': 'ZZZZZZ'}, format='json').status_code, 404)

    def test_leaving_returns_character_to_own_count(self):
        self.join(self.mine[0].id)
        self.assertEqual(P.counted_characters(self.ana).count(), 2)
        self.c_ana.post(f'/api/campaigns/{self.camp.id}/leave')
        self.assertEqual(P.counted_characters(self.ana).count(), 3)
        self.assertTrue(Character.objects.filter(pk=self.mine[0].pk).exists())

    def test_invite_preview_shows_slots(self):
        r = self.c_ana.get(f'/api/campaigns/invite/{self.camp.invite_code}')
        self.assertEqual(r.data['slots'], {'used': 0, 'max': 6})
        self.assertEqual(r.data['status'], 'active')


class AdminAssignTests(PlanBase):
    def setUp(self):
        super().setUp()
        self.admin = mk('chefe@x.com', staff=True)
        self.c_admin = client(self.admin)

    def test_only_staff(self):
        url = f'/api/admin/users/{self.ana.id}/plan'
        self.assertEqual(self.c_ana.get(url).status_code, 403)
        self.assertEqual(self.c_ana.patch(url, {'plan': 'legend'}, format='json').status_code, 403)
        self.assertFalse(UserPlan.objects.filter(user=self.ana).exists())

    def test_admin_assigns_plan_and_addons(self):
        url = f'/api/admin/users/{self.ana.id}/plan'
        r = self.c_admin.patch(url, {'plan': 'dm', 'addons': {'storage': 2}, 'validUntil': '2030-01-31'},
                               format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data['plan']['slug'], 'dm')
        self.assertEqual(r.data['limits']['storageMb'], 900)
        self.assertEqual(r.data['source'], 'admin')
        self.assertTrue(r.data['validUntil'].startswith('2030-01-31'))
        self.assertEqual(self.c_ana.get('/api/me/plan').data['plan']['slug'], 'dm')
        # só extras, mantendo o plano
        r = self.c_admin.patch(url, {'addons': {'campaign': 1}}, format='json')
        self.assertEqual((r.data['plan']['slug'], r.data['limits']['campaigns']), ('dm', 4))
        self.assertEqual(self.c_admin.patch(url, {'plan': 'nada'}, format='json').status_code, 400)
        self.assertEqual(self.c_admin.patch(url, {'addons': {'xyz': 1}}, format='json').status_code, 400)

    def test_django_admin_lists_plans(self):
        from django.test import Client
        self.admin.is_superuser = True
        self.admin.save()
        c = Client()
        c.force_login(self.admin)
        for url in ('/admin/api/plan/', '/admin/api/addon/', '/admin/api/userplan/'):
            self.assertEqual(c.get(url).status_code, 200, url)
