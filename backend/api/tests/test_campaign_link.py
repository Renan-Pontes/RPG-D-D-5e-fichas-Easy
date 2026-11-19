"""Modal "Campanha" da ficha: atrelar, desatrelar e trocar a ficha de mesa.

Regra garantida no servidor (desde 09/11): uma ficha fica em N campanhas, mas
nunca duas vezes na MESMA (409 character_already_in_campaign). Atrelar numa mesa
não tira a ficha das outras; `move` não é mais lido.
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


class ManyCampaignsTests(LinkBase):
    def test_attach_in_other_campaign_keeps_the_first(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        r = self.put(self.c_ana, self.b, self.mb, self.velna.id)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.seats_of(self.velna), [self.a.id, self.b.id])
        self.ma.refresh_from_db()
        self.assertEqual(self.ma.character_id, self.velna.id)

    def test_same_sheet_twice_in_the_same_campaign_is_409(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        m2 = Membership.objects.create(campaign=self.a, user=self.ana, role='player')
        r = self.put(self.c_ana, self.a, m2, self.velna.id)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json(), {'error': 'character_already_in_campaign',
                                    'campaignId': self.a.id, 'campaignName': 'Mesa A'})
        r = self.c_ana.post('/api/campaigns/join', {'inviteCode': self.a.invite_code,
                                                     'characterId': self.velna.id}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(self.seats_of(self.velna), [self.a.id])

    def test_borrowed_seat_elsewhere_stays_borrowed(self):
        Membership.objects.filter(pk=self.ma.pk).update(character=self.velna, sponsored=True)
        r = self.put(self.c_ana, self.b, self.mb, self.velna.id)
        self.assertEqual(r.status_code, 200, r.content)
        self.ma.refresh_from_db()
        self.assertTrue(self.ma.sponsored)
        self.assertEqual(self.ma.character_id, self.velna.id)

    def test_join_with_code_while_in_another_campaign(self):
        Membership.objects.filter(pk=self.mb.pk).delete()
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        r = self.c_ana.post('/api/campaigns/join', {'inviteCode': self.b.invite_code,
                                                     'characterId': self.velna.id}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.seats_of(self.velna), [self.a.id, self.b.id])

    def test_sheet_in_two_campaigns_reads_and_reattaches(self):
        Membership.objects.filter(pk__in=[self.ma.pk, self.mb.pk]).update(character=self.velna)
        r = self.c_ana.get(f'/api/characters/{self.velna.id}')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['character']['inCampaign'])
        r = self.c_ana.get(f'/api/characters/{self.velna.id}/campaigns')
        self.assertEqual([c['id'] for c in r.json()['campaigns']], [self.a.id, self.b.id])
        # reatribuir a mesma ficha na mesma vaga não quebra
        self.assertEqual(self.put(self.c_ana, self.a, self.ma, self.velna.id).status_code, 200)


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
        """O mestre da B põe a ficha da Ana na vaga dela na B; a vaga da A fica intacta."""
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        r = self.put(self.c_dm2, self.b, self.mb, self.velna.id, move=True)
        self.assertEqual(r.status_code, 200, r.content)
        self.ma.refresh_from_db()
        self.assertEqual(self.ma.character_id, self.velna.id)
        self.assertEqual(self.seats_of(self.velna), [self.a.id, self.b.id])
        # e não mexe na vaga da mesa A
        self.assertEqual(self.put(self.c_dm2, self.a, self.ma, None).status_code, 403)

    def test_dm_seats_own_sheet_at_own_table_without_losing_the_dm_seat(self):
        """Mesas com vários personagens (09/11): o mestre põe ficha dele na própria mesa
        (jogador ou NPC) numa vaga à parte; continua mestre."""
        m_dm = Membership.objects.create(campaign=self.a, user=self.dm1, role='dm')
        sheet = Character.objects.create(owner=self.dm1, name='Mestre', data={})
        npc = Character.objects.create(owner=self.dm1, name='Taverneiro', data={})
        r = self.c_dm1.post('/api/campaigns/join', {'campaignId': self.a.id, 'characterId': sheet.id}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        r = self.c_dm1.post('/api/campaigns/join', {'campaignId': self.a.id, 'characterId': npc.id,
                                                     'isNpc': True}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        m_dm.refresh_from_db()
        self.assertEqual((m_dm.role, m_dm.character_id), ('dm', None))
        seats = Membership.objects.filter(campaign=self.a, user=self.dm1).exclude(pk=m_dm.pk)
        self.assertEqual(sorted((s.character_id, s.is_npc) for s in seats), [(sheet.id, False), (npc.id, True)])
        self.assertEqual(self.c_dm1.get(f'/api/campaigns/{self.a.id}').json()['campaign']['role'], 'dm')
        # e joga na mesa de outro mestre
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

    def test_can_unlink_own_sheet_from_closed_campaign(self):
        # a ficha é da pessoa: não fica presa na encerrada até a purga
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        P.close_campaign(self.a)
        r = self.put(self.c_ana, self.a, self.ma, None)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.seats_of(self.velna), [])
        self.assertTrue(Membership.objects.filter(pk=self.ma.pk).exists())  # continua na mesa
        r = self.c_ana.get(f'/api/characters/{self.velna.id}')
        self.assertFalse(r.json()['character']['inCampaign'])
        # ...mas não volta a atrelar nela
        r = self.put(self.c_ana, self.a, self.ma, self.velna.id)
        self.assertEqual((r.status_code, r.json()['error']), (423, 'campaign_closed'))

    def test_closed_campaign_other_writes_on_seat_still_423(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        P.close_campaign(self.a)
        # o mestre não mexe na vaga de ninguém na encerrada
        r = self.put(self.c_dm1, self.a, self.ma, None)
        self.assertEqual((r.status_code, r.json()['error']), (423, 'campaign_closed'))
        self.assertEqual(self.seats_of(self.velna), [self.a.id])
        # trocar por outra ficha também não
        r = self.put(self.c_ana, self.a, self.ma, self.toco.id)
        self.assertEqual(r.status_code, 423)
        # quem não é da mesa continua 403; sair da mesa e expulsar continuam 423
        self.assertEqual(self.put(self.c_bob, self.a, self.ma, None).status_code, 403)
        self.assertEqual(self.c_ana.post(f'/api/campaigns/{self.a.id}/leave').status_code, 423)
        self.assertEqual(self.c_dm1.delete(f'/api/campaigns/{self.a.id}/members/{self.ma.id}').status_code, 423)
        self.assertEqual(self.seats_of(self.velna), [self.a.id])

    def test_sheet_in_closed_campaign_can_join_another(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        P.close_campaign(self.a)
        r = self.put(self.c_ana, self.b, self.mb, self.velna.id)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.seats_of(self.velna), [self.a.id, self.b.id])
        Membership.objects.filter(pk=self.mb.pk).delete()
        Membership.objects.filter(pk=self.ma.pk).update(character=self.toco)
        r = self.c_ana.post('/api/campaigns/join', {'inviteCode': self.b.invite_code,
                                                     'characterId': self.toco.id}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.seats_of(self.toco), [self.a.id, self.b.id])


class ListingTests(LinkBase):
    def test_campaign_list_brings_my_seat(self):
        self.put(self.c_ana, self.a, self.ma, self.velna.id)
        camps = {c['id']: c for c in self.c_ana.get('/api/campaigns').json()['campaigns']}
        self.assertEqual(camps[self.a.id]['role'], 'player')
        seat = {'id': self.ma.id, 'characterId': self.velna.id, 'characterName': 'Velna', 'sponsored': False,
                'isNpc': False, 'charType': 'player', 'role': 'player'}
        self.assertEqual(camps[self.a.id]['myMembership'], seat)
        self.assertEqual(camps[self.a.id]['myMemberships'], [seat])
        self.assertEqual(camps[self.b.id]['myMembership']['characterId'], None)
        # o mestre recebe a vaga 'dm' dele (as fichas que ele põe na mesa entram em myMemberships)
        Membership.objects.create(campaign=self.a, user=self.dm1, role='dm')
        dm_camps = self.c_dm1.get('/api/campaigns').json()['campaigns']
        self.assertEqual(dm_camps[0]['role'], 'dm')
        self.assertEqual([m['role'] for m in dm_camps[0]['myMemberships']], ['dm'])

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
