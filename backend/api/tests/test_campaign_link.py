"""Modal "Campanha" da ficha: atrelar, desatrelar e trocar a ficha de mesa.

Regra garantida no servidor: uma ficha fica em UMA campanha por vez. Atrelar
numa mesa com a ficha já em outra → 409 character_in_other_campaign (sem mudar
nada); `move: true` (só o dono) tira de lá e põe aqui numa transação.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from api import plans as P
from api.models import Campaign, Character, Membership, Profile

User = get_user_model()


def mk(email):
    # sem senha: os testes só usam force_login (e o hash de senha é lento)
    u = User.objects.create_user(username=email.split('@')[0], email=email)
    Profile.objects.create(user=u, display_name=email.split('@')[0].title())
    return u


def client(u):
    c = APIClient()
    c.force_login(u)
    return c


class LinkBase(TestCase):
    def setUp(self):
        cache.clear()
        self.ana = mk('ana@x.com')
        self.bob = mk('bob@x.com')
        self.dm1 = mk('dm1@x.com')
        self.dm2 = mk('dm2@x.com')
        self.c_ana, self.c_bob = client(self.ana), client(self.bob)
        self.c_dm1, self.c_dm2 = client(self.dm1), client(self.dm2)
        self.a = Campaign.objects.create(dm=self.dm1, name='Mesa A', slug='mesa-a')
        self.b = Campaign.objects.create(dm=self.dm2, name='Mesa B', slug='mesa-b')
        self.velna = Character.objects.create(owner=self.ana, name='Velna', data={})
        self.toco = Character.objects.create(owner=self.ana, name='Toco', data={})
        self.ma = Membership.objects.create(campaign=self.a, user=self.ana, role='player')
        self.mb = Membership.objects.create(campaign=self.b, user=self.ana, role='player')

    def put(self, c, camp, m, char_id, **extra):
        return c.put(f'/api/campaigns/{camp.id}/members/{m.id}', {'characterId': char_id, **extra}, format='json')

    def seats_of(self, char):
        return list(Membership.objects.filter(character=char).values_list('campaign_id', flat=True))


class AttachDetachTests(LinkBase):
    def test_attach_free_character(self):
        r = self.put(self.c_ana, self.a, self.ma, self.velna.id)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['membership']['characterId'], self.velna.id)
        self.assertEqual(self.seats_of(self.velna), [self.a.id])
        r = self.c_ana.get(f'/api/characters/{self.velna.id}')
        self.assertTrue(r.json()['character']['inCampaign'])

    def test_detach_keeps_the_seat(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        r = self.put(self.c_ana, self.a, self.ma, None)
        self.assertEqual(r.status_code, 200, r.content)
        self.ma.refresh_from_db()
        self.assertIsNone(self.ma.character_id)  # continua na mesa, sem personagem
        self.assertFalse(self.c_ana.get(f'/api/characters/{self.velna.id}').json()['character']['inCampaign'])

    def test_attach_replaces_other_character_on_same_seat(self):
        self.put(self.c_ana, self.a, self.ma, self.toco.id)
        r = self.put(self.c_ana, self.a, self.ma, self.velna.id)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.seats_of(self.toco), [])
        self.assertEqual(self.seats_of(self.velna), [self.a.id])

    def test_same_character_same_seat_is_noop(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        r = self.put(self.c_ana, self.a, self.ma, self.velna.id)
        self.assertEqual(r.status_code, 200, r.content)


class OneCampaignAtATimeTests(LinkBase):
    def test_attach_in_other_campaign_is_409_and_changes_nothing(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        r = self.put(self.c_ana, self.b, self.mb, self.velna.id)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json(), {'error': 'character_in_other_campaign',
                                    'campaignId': self.a.id, 'campaignName': 'Mesa A'})
        self.assertEqual(self.seats_of(self.velna), [self.a.id])
        self.mb.refresh_from_db()
        self.assertIsNone(self.mb.character_id)

    def test_switch_with_move(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        r = self.put(self.c_ana, self.b, self.mb, self.velna.id, move=True)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.seats_of(self.velna), [self.b.id])
        self.ma.refresh_from_db()
        self.assertIsNone(self.ma.character_id)  # saiu da ficha, não da campanha
        self.assertTrue(Membership.objects.filter(pk=self.ma.pk).exists())

    def test_move_releases_borrowed_seat(self):
        Membership.objects.filter(pk=self.ma.pk).update(character=self.velna, sponsored=True)
        r = self.put(self.c_ana, self.b, self.mb, self.velna.id, move=True)
        self.assertEqual(r.status_code, 200, r.content)
        self.ma.refresh_from_db()
        self.assertFalse(self.ma.sponsored)
        self.assertFalse(r.json()['membership']['sponsored'])  # cabe no plano da Ana

    def test_join_with_code_409_then_move(self):
        Membership.objects.filter(pk=self.mb.pk).delete()
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        body = {'inviteCode': self.b.invite_code, 'characterId': self.velna.id}
        r = self.c_ana.post('/api/campaigns/join', body, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['campaignName'], 'Mesa A')
        self.assertFalse(Membership.objects.filter(campaign=self.b, user=self.ana).exists())
        r = self.c_ana.post('/api/campaigns/join', {**body, 'move': True}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.seats_of(self.velna), [self.b.id])
        self.assertTrue(Membership.objects.filter(pk=self.ma.pk, character=None).exists())

    def test_old_sheet_in_two_campaigns_still_reads_and_can_be_fixed(self):
        Membership.objects.filter(pk__in=[self.ma.pk, self.mb.pk]).update(character=self.velna)
        r = self.c_ana.get(f'/api/characters/{self.velna.id}')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['character']['inCampaign'])
        r = self.c_ana.get(f'/api/characters/{self.velna.id}/campaigns')
        self.assertEqual([c['id'] for c in r.json()['campaigns']], [self.a.id, self.b.id])
        # reatribuir a mesma ficha na mesma vaga não quebra
        self.assertEqual(self.put(self.c_ana, self.a, self.ma, self.velna.id).status_code, 200)
        # trocar resolve: fica só na nova
        dm3 = mk('dm3@x.com')
        c = Campaign.objects.create(dm=dm3, name='Mesa C', slug='mesa-c')
        mc = Membership.objects.create(campaign=c, user=self.ana, role='player')
        self.assertEqual(self.put(self.c_ana, c, mc, self.velna.id).status_code, 409)
        self.assertEqual(self.put(self.c_ana, c, mc, self.velna.id, move=True).status_code, 200)
        self.assertEqual(self.seats_of(self.velna), [c.id])


class PermissionTests(LinkBase):
    def test_other_user_cannot_touch_my_seat_or_sheet(self):
        mbob = Membership.objects.create(campaign=self.a, user=self.bob, role='player')
        self.assertEqual(self.put(self.c_bob, self.a, self.ma, None).status_code, 403)
        self.assertEqual(self.put(self.c_bob, self.a, mbob, self.velna.id).status_code, 403)
        r = self.c_bob.post('/api/campaigns/join', {'inviteCode': self.b.invite_code,
                                                     'characterId': self.velna.id}, format='json')
        self.assertEqual((r.status_code, r.json()['error']), (403, 'character_forbidden'))
        self.assertEqual(self.seats_of(self.velna), [])

    def test_dm_of_one_table_cannot_pull_sheet_from_another(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        r = self.put(self.c_dm2, self.b, self.mb, self.velna.id, move=True)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(self.seats_of(self.velna), [self.a.id])

    def test_dm_cannot_attach_self_as_player(self):
        sheet = Character.objects.create(owner=self.dm1, name='Mestre', data={})
        r = self.c_dm1.post('/api/campaigns/join', {'inviteCode': self.a.invite_code,
                                                     'characterId': sheet.id}, format='json')
        self.assertEqual((r.status_code, r.json()['error']), (400, 'dm_cannot_be_player'))
        self.assertEqual(self.seats_of(sheet), [])
        m_dm = Membership.objects.create(campaign=self.a, user=self.dm1, role='dm')
        r = self.put(self.c_dm1, self.a, m_dm, sheet.id)
        self.assertEqual((r.status_code, r.json()['error']), (400, 'dm_cannot_be_player'))
        r = self.c_dm1.post('/api/characters', {'name': 'N', 'data': {}, 'inviteCode': self.a.invite_code},
                            format='json')
        self.assertEqual((r.status_code, r.json()['error']), (400, 'dm_cannot_be_player'))
        self.assertFalse(Character.objects.filter(owner=self.dm1, name='N').exists())
        # ...mas pode jogar na mesa de outro mestre
        self.assertEqual(self.c_dm1.post('/api/campaigns/join', {'inviteCode': self.b.invite_code,
                                                                  'characterId': sheet.id},
                                         format='json').status_code, 200)


class ClosedCampaignTests(LinkBase):
    def test_closed_campaign_is_423(self):
        P.close_campaign(self.a)
        r = self.put(self.c_ana, self.a, self.ma, self.velna.id)
        self.assertEqual((r.status_code, r.json()['error']), (423, 'campaign_closed'))
        r = self.c_ana.post('/api/campaigns/join', {'inviteCode': self.a.invite_code,
                                                     'characterId': self.velna.id}, format='json')
        self.assertEqual(r.status_code, 423)
        self.assertEqual(self.seats_of(self.velna), [])

    def test_cannot_move_out_of_closed_campaign(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        P.close_campaign(self.a)
        r = self.put(self.c_ana, self.b, self.mb, self.velna.id, move=True)
        self.assertEqual((r.status_code, r.json()['error']), (423, 'campaign_closed'))
        self.assertEqual(r.json()['campaignId'], self.a.id)
        self.assertEqual(self.seats_of(self.velna), [self.a.id])  # nada mudou


class ListingTests(LinkBase):
    def test_campaign_list_brings_my_seat(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        camps = {c['id']: c for c in self.c_ana.get('/api/campaigns').json()['campaigns']}
        self.assertEqual(camps[self.a.id]['role'], 'player')
        self.assertEqual(camps[self.a.id]['myMembership'], {'id': self.ma.id, 'characterId': self.velna.id,
                                                            'characterName': 'Velna', 'sponsored': False})
        self.assertEqual(camps[self.b.id]['myMembership']['characterId'], None)
        # o mestre (sem vaga própria) não recebe myMembership
        dm_camps = self.c_dm1.get('/api/campaigns').json()['campaigns']
        self.assertEqual(dm_camps[0]['role'], 'dm')
        self.assertNotIn('myMembership', dm_camps[0])

    def test_character_campaigns_has_status_and_seat(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        P.close_campaign(self.a)
        c = self.c_ana.get(f'/api/characters/{self.velna.id}/campaigns').json()['campaigns'][0]
        self.assertEqual((c['id'], c['membershipId'], c['status'], c['sponsored']),
                         (self.a.id, self.ma.id, 'closed', False))
        self.assertTrue(c['purgeAt'])

    def test_invite_preview_says_when_you_are_the_dm(self):
        self.assertTrue(self.c_dm1.get(f'/api/campaigns/invite/{self.a.invite_code}').json()['isDm'])
        self.assertFalse(self.c_ana.get(f'/api/campaigns/invite/{self.a.invite_code}').json()['isDm'])
