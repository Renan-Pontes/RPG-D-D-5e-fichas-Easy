// V9: as ações dos stat blocks vêm por ref (?sets=1) e voltam para stats.actions no app.
import test from 'node:test';
import assert from 'node:assert/strict';
import { combatCampaignId, withSetsParam, missingRefs, withActions, remember } from '../src/api/combat-sets.js';

const GOB = [{ name: { pt: 'Cimitarra', en: 'Scimitar' }, atk: 4, damage: '1d6+2', desc: { pt: '…', en: '…' } }];
const DRG = [{ name: { pt: 'Dilacerar', en: 'Rend' }, atk: 14, damage: '1d10+8' }];
const lean = () => ({
  active: true, round: 2, turnIndex: 1,
  combatants: [
    { id: 'k1', type: 'pc', name: 'Kaelor', stats: { ac: 18, max_hp: 28, actions: [] } },
    { id: 'g1', type: 'monster', name: 'Goblin #1', stats: { ac: 15, max_hp: 7, actionsRef: 'aaa' } },
    { id: 'g2', type: 'monster', name: 'Goblin #2', stats: { ac: 15, max_hp: 9, actionsRef: 'aaa' } },
    { id: 'd1', type: 'monster', name: 'Dragão', stats: { ac: 19, max_hp: 256, cr: '17', actionsRef: 'bbb' } },
  ],
});

test('combatCampaignId: só as rotas JSON do combate', () => {
  assert.equal(combatCampaignId('/api/combat/campaign/1'), '1');
  assert.equal(combatCampaignId('/api/combat/campaign/brumafria/next-turn'), 'brumafria');
  assert.equal(combatCampaignId('/api/combat/campaign/1/combatants/g1'), '1');
  assert.equal(combatCampaignId('/api/combat/campaign/1?x=2'), '1');
  assert.equal(combatCampaignId('/api/combat/campaign/1/actions/aaa'), null);
  assert.equal(combatCampaignId('/api/combat/campaign/1/map-image?v=1'), null);
  assert.equal(combatCampaignId('/api/combat/campaign/1/token/g1?v=1'), null);
  assert.equal(combatCampaignId('/api/campaigns/1'), null);
  assert.equal(combatCampaignId(''), null);
});

test('withSetsParam põe sets=1 uma vez', () => {
  assert.equal(withSetsParam('/api/combat/campaign/1'), '/api/combat/campaign/1?sets=1');
  assert.equal(withSetsParam('/api/combat/campaign/1?a=b'), '/api/combat/campaign/1?a=b&sets=1');
  assert.equal(withSetsParam('/api/combat/campaign/1?sets=1'), '/api/combat/campaign/1?sets=1');
});

test('missingRefs: cada ref uma vez, só os que faltam', () => {
  const sets = new Map();
  assert.deepEqual(missingRefs(lean(), sets), ['aaa', 'bbb']);
  sets.set('aaa', GOB);
  assert.deepEqual(missingRefs(lean(), sets), ['bbb']);
  assert.deepEqual(missingRefs(null, sets), []);
});

test('withActions devolve stats.actions e não mexe na entrada', () => {
  const sets = new Map([['aaa', GOB], ['bbb', DRG]]);
  const input = lean();
  const out = withActions(input, sets);
  const by = Object.fromEntries(out.combatants.map(c => [c.id, c]));
  assert.deepEqual(by.g1.stats, { ac: 15, max_hp: 7, actions: GOB });
  assert.deepEqual(by.g2.stats, { ac: 15, max_hp: 9, actions: GOB });
  assert.deepEqual(by.d1.stats, { ac: 19, max_hp: 256, cr: '17', actions: DRG });
  assert.equal(by.k1, input.combatants[0]);                       // sem ref: o mesmo objeto
  assert.equal(input.combatants[1].stats.actionsRef, 'aaa');       // a entrada continua igual
  assert.equal(out.round, 2);
});

test('withActions: falta um ref → null; sem refs → o combate como veio', () => {
  assert.equal(withActions(lean(), new Map([['aaa', GOB]])), null);
  const old = { combatants: [{ id: 'g1', stats: { actions: GOB } }] };   // servidor de antes
  assert.equal(withActions(old, new Map()), old);
  const player = { combatants: [{ id: 'g1', health: 'hurt' }] };
  assert.equal(withActions(player, new Map()), player);
  assert.equal(withActions(null, new Map()), null);
});

test('remember guarda listas e esquece o mais antigo', () => {
  const sets = new Map();
  remember(sets, 'a', GOB, 2); remember(sets, 'b', DRG, 2); remember(sets, 'c', GOB, 2);
  assert.deepEqual([...sets.keys()], ['b', 'c']);
  remember(sets, 'x', null, 2);
  remember(sets, '', GOB, 2);
  assert.deepEqual([...sets.keys()], ['b', 'c']);
});
