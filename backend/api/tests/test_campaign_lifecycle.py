"""Ciclo da campanha: encerrar (somente leitura por 30 dias), reabrir e purga
preguiçosa com a OPÇÃO A para fichas em vaga de mesa."""
from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from api import plans as P
from api.models import (Adventure, Campaign, Character, DiaryEntry, Membership, Plan, Profile, WorldEntry)

User = get_user_model()


def mk(email):
    u = User.objects.create_user(username=email.split('@')[0], email=email, password='senha-forte-2026')
    Profile.objects.create(user=u, display_name=email.split('@')[0].title())
    return u


def client(u):
    c = APIClient()
    c.force_login(u)
    return c


class LifecycleBase(TestCase):
    def setUp(self):
        cache.clear()
        self.dm = mk('mestra@x.com')
        P.assign_plan(self.dm, plan_slug='dm')
        self.ana = mk('ana@x.com')
        self.c_dm, self.c_ana = client(self.dm), client(self.ana)
        self.camp = Campaign.objects.create(dm=self.dm, name='Mesa')
        self.char = Character.objects.create(owner=self.ana, name='Velna')
        self.m = Membership.objects.create(campaign=self.camp, user=self.ana, character=self.char)
        self.entry = WorldEntry.objects.create(campaign=self.camp, kind='place', name='Vila', visibility='revealed')

    def close(self):
        r = self.c_dm.delete(f'/api/campaigns/{self.camp.id}')
        self.assertEqual(r.status_code, 200, r.content)
        self.camp.refresh_from_db()
        return r

    def age(self, days):
        Campaign.objects.filter(pk=self.camp.pk).update(closed_at=timezone.now() - timedelta(days=days))


class CloseTests(LifecycleBase):
    def test_delete_closes_instead_of_deleting(self):
        self.assertEqual(self.c_ana.delete(f'/api/campaigns/{self.camp.id}').status_code, 403)
        r = self.close()
        self.assertEqual(r.data['campaign']['status'], 'closed')
        self.assertIsNotNone(r.data['campaign']['purgeAt'])
        self.assertEqual(self.camp.status, 'closed')
        self.assertTrue(WorldEntry.objects.filter(pk=self.entry.pk).exists())
        # encerrar de novo não reinicia o prazo
        first = self.camp.closed_at
        self.c_dm.post(f'/api/campaigns/{self.camp.id}/close')
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.closed_at, first)

    def test_reads_still_work_for_everyone(self):
        self.close()
        for c in (self.c_dm, self.c_ana):
            r = c.get(f'/api/campaigns/{self.camp.id}')
            self.assertEqual(r.status_code, 200)
            camp = r.data['campaign']
            self.assertEqual(camp['status'], 'closed')
            self.assertTrue(camp['closedAt'])
            self.assertTrue(camp['purgeAt'])
            self.assertEqual(c.get(f'/api/campaigns/{self.camp.id}/world').status_code, 200)
            self.assertEqual(c.get(f'/api/campaigns/{self.camp.id}/diary').status_code, 200)
            self.assertEqual(c.get(f'/api/characters/{self.char.id}').status_code, 200)
        lst = self.c_ana.get('/api/campaigns').data['campaigns']
        self.assertEqual(lst[0]['status'], 'closed')

    def test_writes_are_refused_for_everyone(self):
        self.close()
        cid = self.camp.id
        attempts = [
            (self.c_dm, 'patch', f'/api/campaigns/{cid}', {'name': 'Novo'}),
            (self.c_dm, 'patch', f'/api/campaigns/{cid}/state', {'patch': {'scene': 'x'}}),
            (self.c_dm, 'post', f'/api/campaigns/{cid}/world', {'kind': 'lore', 'name': 'X'}),
            (self.c_dm, 'patch', f'/api/world/{self.entry.id}', {'name': 'Y'}),
            (self.c_dm, 'post', f'/api/campaigns/{cid}/adventures', {'name': 'A'}),
            (self.c_dm, 'post', f'/api/campaigns/{cid}/diary', {'title': 'n', 'body': 'b'}),
            (self.c_dm, 'post', f'/api/combat/campaign/{cid}/start', {}),
            (self.c_dm, 'patch', f'/api/characters/{self.char.id}/dm-edit', {'data': {'maxHp': 99}}),
            (self.c_ana, 'post', f'/api/world/{self.entry.id}/react', {'kind': 'love'}),
            (self.c_ana, 'post', f'/api/rolls/campaign/{cid}', {'dice_type': 'd20'}),
            (self.c_ana, 'post', f'/api/campaigns/{cid}/leave', {}),
        ]
        for c, method, url, body in attempts:
            r = getattr(c, method)(url, body, format='json')
            self.assertEqual(r.status_code, 423, f'{method} {url} → {r.status_code}')
            self.assertEqual(r.json()['error'], 'campaign_closed')
            self.assertIn('purgeAt', r.json())
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.name, 'Mesa')
        # ninguém novo entra
        bia = mk('bia@x.com')
        r = client(bia).post('/api/campaigns/join', {'inviteCode': self.camp.invite_code}, format='json')
        self.assertEqual((r.status_code, r.data['error']), (423, 'campaign_closed'))
        r = client(bia).post('/api/characters', {'name': 'N', 'data': {}, 'inviteCode': self.camp.invite_code},
                             format='json')
        self.assertEqual(r.status_code, 423)
        self.assertFalse(Character.objects.filter(owner=bia).exists())

    def test_strangers_still_get_forbidden(self):
        self.close()
        r = client(mk('zed@x.com')).patch(f'/api/campaigns/{self.camp.id}', {'name': 'x'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_player_keeps_own_sheet_editable(self):
        self.close()
        r = self.c_ana.put(f'/api/characters/{self.char.id}', {'name': 'Velna', 'data': {'notes': 'ok'}}, format='json')
        self.assertEqual(r.status_code, 200)


    def test_dice_roll_in_closed_campaign_stays_out_of_the_log(self):
        from api.models import DiceLog
        self.close()
        before = DiceLog.objects.filter(campaign=self.camp).count()
        diary = DiaryEntry.objects.filter(campaign=self.camp).count()
        for _ in range(5):
            self.c_ana.post('/api/dice/roll', {'diceType': 'd20', 'count': 20, 'campaignId': self.camp.id}, format='json')
        r = self.c_ana.post('/api/dice/roll', {'diceType': 'd20', 'campaignId': self.camp.id}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(1 <= r.data['total'] <= 20)
        self.assertEqual(DiceLog.objects.filter(campaign=self.camp).count(), before)
        self.assertEqual(DiaryEntry.objects.filter(campaign=self.camp).count(), diary)


class ReopenTests(LifecycleBase):
    def test_reopen(self):
        self.close()
        self.assertEqual(self.c_ana.post(f'/api/campaigns/{self.camp.id}/reopen').status_code, 403)
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/reopen')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['campaign']['status'], 'active')
        self.assertEqual(self.c_dm.patch(f'/api/campaigns/{self.camp.id}', {'name': 'Viva'}, format='json').status_code, 200)

    def test_reopen_allowed_even_above_limit_after_downgrade(self):
        # encerradas já contam no limite: reabrir não muda o uso, então nunca trava
        Campaign.objects.create(dm=self.dm, name='Outra')
        self.close()
        P.assign_plan(self.dm, plan_slug='free')  # 1 campanha; tem 2
        r = self.c_dm.post(f'/api/campaigns/{self.camp.id}/reopen')
        self.assertEqual(r.status_code, 200, r.content)
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.status, 'active')
        # ...mas criar outra continua bloqueado
        r = self.c_dm.post('/api/campaigns', {'name': 'Mais uma'}, format='json')
        self.assertEqual((r.status_code, r.data['used'], r.data['max']), (402, 2, 1))

    def test_reopen_at_limit_does_not_change_usage(self):
        P.assign_plan(self.dm, plan_slug='free')  # 1 campanha; tem 1 (esta)
        self.close()
        self.assertEqual(P.campaigns_used(self.dm), 1)
        self.assertEqual(self.c_dm.post(f'/api/campaigns/{self.camp.id}/reopen').status_code, 200)
        self.assertEqual(P.campaigns_used(self.dm), 1)


class PurgeTests(LifecycleBase):
    def setUp(self):
        super().setUp()
        Adventure.objects.create(campaign=self.camp, name='Cripta')
        DiaryEntry.objects.create(campaign=self.camp, kind='note', title='Nota')

    def test_not_purged_before_30_days(self):
        self.close()
        self.age(29)
        self.c_ana.get('/api/campaigns')
        self.assertTrue(Campaign.objects.filter(pk=self.camp.pk).exists())

    def test_lazy_purge_on_list_deletes_campaign_keeps_normal_sheets(self):
        self.close()
        self.age(31)
        self.c_ana.get('/api/campaigns')
        self.assertFalse(Campaign.objects.filter(pk=self.camp.pk).exists())
        self.assertFalse(WorldEntry.objects.filter(campaign_id=self.camp.id).exists())
        self.assertFalse(Adventure.objects.filter(campaign_id=self.camp.id).exists())
        self.assertFalse(DiaryEntry.objects.filter(campaign_id=self.camp.id).exists())
        self.assertTrue(Character.objects.filter(pk=self.char.pk).exists())

    def _sponsor_full_player(self):
        """Ana no limite do Grátis (3) com a 4ª ficha em vaga da mesa."""
        Character.objects.create(owner=self.ana, name='A2')
        Character.objects.create(owner=self.ana, name='A3')
        Membership.objects.filter(pk=self.m.pk).update(sponsored=True)
        Character.objects.create(owner=self.ana, name='A4')  # cabe porque Velna está na vaga
        self.assertEqual(P.counted_characters(self.ana).count(), 3)

    def test_option_a_sheet_deleted_when_player_has_no_room(self):
        self._sponsor_full_player()
        self.close()
        self.age(31)
        out = P.purge_expired()
        self.assertEqual(out[0]['deleted'], [self.char.id])
        self.assertFalse(Character.objects.filter(pk=self.char.pk).exists())
        self.assertEqual(Character.objects.filter(owner=self.ana).count(), 3)

    def test_option_a_sheet_kept_when_player_has_room(self):
        Membership.objects.filter(pk=self.m.pk).update(sponsored=True)
        self.close()
        self.age(31)
        out = P.purge_expired()
        self.assertEqual(out[0]['kept'], [self.char.id])
        self.assertTrue(Character.objects.filter(pk=self.char.pk).exists())
        self.assertEqual(P.counted_characters(self.ana).count(), 1)
        self.assertFalse(Membership.objects.filter(character=self.char).exists())

    def test_purge_on_login_and_command_are_idempotent(self):
        self.close()
        self.age(40)
        self.client.force_login(self.ana)  # sinal de login roda a purga
        self.assertFalse(Campaign.objects.filter(pk=self.camp.pk).exists())
        out = StringIO()
        call_command('purge_closed_campaigns', stdout=out)
        self.assertIn('0 campanha', out.getvalue())

    def test_command_purges(self):
        self.close()
        self.age(31)
        out = StringIO()
        call_command('purge_closed_campaigns', '--dry-run', stdout=out)
        self.assertTrue(Campaign.objects.filter(pk=self.camp.pk).exists())
        call_command('purge_closed_campaigns', stdout=out)
        self.assertFalse(Campaign.objects.filter(pk=self.camp.pk).exists())

    def test_purge_frees_campaign_count(self):
        Plan.objects.filter(slug='dm').update(max_campaigns=1)
        self.assertEqual(self.c_dm.post('/api/campaigns', {'name': 'Nova'}, format='json').status_code, 402)
        self.close()
        self.age(31)
        self.assertEqual(self.c_dm.post('/api/campaigns', {'name': 'Nova'}, format='json').status_code, 200)
