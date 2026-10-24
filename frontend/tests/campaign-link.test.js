import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAccountSheet, playerTables, dmTableCount, seatState, seatLabel, otherCampaignFrom, linkErrorText,
  attachConfirm, detachConfirm, switchConfirm, linkToast, findMyMembership,
} from '../src/sheet/campaign-link.js';

const CAMPS = [
  { id: 1, name: 'Zéfiro', role: 'player', status: 'active', myMembership: { id: 11, characterId: null } },
  { id: 2, name: 'Minha mesa', role: 'dm', status: 'active' },
  { id: 3, name: 'Antiga', role: 'player', status: 'closed', myMembership: { id: 13, characterId: null } },
  { id: 4, name: 'Ecos', role: 'player', status: 'active', myMembership: { id: 14, characterId: 9, characterName: 'Toco' } },
];

test('só fichas da conta (id numérico) entram em campanha', () => {
  assert.equal(isAccountSheet({ id: 5 }), true);
  assert.equal(isAccountSheet({ id: 'local-abc' }), false);
  assert.equal(isAccountSheet(null), false);
});

test('playerTables: ativas em que a pessoa é jogadora, por nome; exclui a atual', () => {
  assert.deepEqual(playerTables(CAMPS).map(c => c.id), [4, 1]);
  assert.deepEqual(playerTables(CAMPS, [4]).map(c => c.id), [1]);
  assert.deepEqual(playerTables(CAMPS, ['1']).map(c => c.id), [4]);
  assert.deepEqual(playerTables(null), []);
  assert.equal(dmTableCount(CAMPS), 1);
});

test('seatState/seatLabel: vaga livre, desta ficha, de outra ou desconhecida', () => {
  assert.equal(seatState(CAMPS[0], 7).kind, 'free');
  assert.deepEqual(seatState(CAMPS[3], 7), { kind: 'other', name: 'Toco' });
  assert.equal(seatState(CAMPS[3], 9).kind, 'this');
  assert.equal(seatState({ id: 1 }, 7).kind, 'unknown');
  assert.equal(seatLabel(seatState(CAMPS[3], 7), 'pt'), 'Sua vaga tem Toco');
  assert.equal(seatLabel(seatState(CAMPS[3], 7), 'en'), 'Your seat has Toco');
  assert.equal(seatLabel(seatState(CAMPS[0], 7), 'pt'), 'Sua vaga está livre');
  assert.equal(seatLabel({ kind: 'unknown' }, 'pt'), '');
});

test('otherCampaignFrom: o 409 novo e o antigo; outros erros não', () => {
  assert.deepEqual(otherCampaignFrom({ status: 409, data: { error: 'character_in_other_campaign', campaignId: 3, campaignName: 'Ecos' } }),
    { campaignId: 3, campaignName: 'Ecos' });
  assert.deepEqual(otherCampaignFrom({ status: 409, data: { error: 'character_already_in_campaign', campaignId: 3 } }),
    { campaignId: 3, campaignName: '' });
  assert.equal(otherCampaignFrom({ status: 423, data: { error: 'campaign_closed' } }), null);
  assert.equal(otherCampaignFrom({ status: 409, data: { error: 'email_taken' } }), null);
  assert.equal(otherCampaignFrom(new TypeError('x')), null);
});

test('linkErrorText: encerrada, mestre na própria mesa, convite e rede', () => {
  assert.match(linkErrorText({ status: 423, data: { error: 'campaign_closed' } }, 'pt'), /encerrada/);
  assert.match(linkErrorText({ status: 423, data: { error: 'campaign_closed' } }, 'en'), /closed/);
  assert.match(linkErrorText({ status: 400, data: { error: 'dm_cannot_be_player' } }, 'pt'), /mestre/);
  assert.match(linkErrorText({ status: 404, data: { error: 'invite_invalid' } }, 'pt'), /convite/i);
  assert.match(linkErrorText(new TypeError('Failed to fetch'), 'pt'), /conexão/);
});

test('confirmações dizem o que acontece com a ficha e com a vaga', () => {
  const a = attachConfirm({ charName: 'Velna', table: 'Ecos', seat: { kind: 'other', name: 'Toco' }, lang: 'pt' });
  assert.equal(a.title, 'Atrelar Velna a “Ecos”?');
  assert.match(a.text, /já tem Toco\. Toco sai da mesa \(a ficha continua com você\)/);
  assert.doesNotMatch(attachConfirm({ charName: 'Velna', table: 'Ecos', seat: { kind: 'free' } }).text, /Toco/);

  const d = detachConfirm({ charName: 'Velna', from: 'Ecos', sponsored: true, lang: 'pt' });
  assert.match(d.text, /continua na campanha, sem personagem/);
  assert.match(d.text, /limite do seu plano/);
  assert.doesNotMatch(detachConfirm({ charName: 'Velna', from: 'Ecos' }).text, /plano/);

  const s = switchConfirm({ charName: 'Velna', from: 'Zéfiro', to: 'Ecos', seat: { kind: 'other', name: 'Toco' }, lang: 'pt' });
  assert.equal(s.title, 'Trocar Velna de campanha?');
  assert.match(s.text, /sai de “Zéfiro” \(você continua lá, sem personagem\) e entra em “Ecos”/);
  assert.match(s.text, /Toco sai da sua vaga/);
  assert.match(switchConfirm({ charName: '', from: '', to: 'Ecos', lang: 'en' }).text, /Unnamed leaves the current campaign/);
});

test('linkToast e findMyMembership', () => {
  assert.equal(linkToast('attach', { charName: 'Velna', table: 'Ecos' }), 'Velna agora está em Ecos.');
  assert.equal(linkToast('detach', { charName: 'Velna', table: 'Ecos', lang: 'en' }), 'Velna left Ecos. The sheet is personal again.');
  assert.equal(linkToast('switch', { charName: 'Velna', table: 'Ecos' }), 'Velna agora joga em Ecos.');
  const camp = { members: [{ id: 1, role: 'dm', user: { id: 5 } }, { id: 2, role: 'player', user: { id: 7 } }] };
  assert.equal(findMyMembership(camp, 7).id, 2);
  assert.equal(findMyMembership(camp, 5), null);
  assert.equal(findMyMembership(camp, null), null);
});
