import test from 'node:test';
import assert from 'node:assert/strict';
import { changeLevelChoice, applyLevelChoice } from '../src/progression/engine.js';
import { respecPatch, respecChanges, respecApprovalBody } from '../src/progression/respec.js';
import { validateClassOptions } from '../src/progression/engine.js';

const base = { id: 7, rulesVersion: '2024', className: 'fighter', level: 4, race: 'human', abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, classSequence: ['fighter', 'fighter', 'fighter', 'fighter'] };

test('changing a level-4 ASI into a feat reverts the scores and records the feat', () => {
  const withAsi = applyLevelChoice(base, 4, { type: 'asi', asi: { str: 2 } });
  assert.equal(withAsi.abilities.str, 18);
  const after = changeLevelChoice(withAsi, 4, { type: 'feat', featId: 'alert', feat: 'Alert' });
  assert.equal(after.abilities.str, 16);
  assert.equal(after.levelChoices[4].type, 'feat');
  assert.ok(after.feats.some(f => f.id === 'alert' && f.level === 4));
  const patch = respecPatch(withAsi, after);
  for (const k of ['abilities', 'feats', 'levelChoices']) assert.ok(k in patch, k);
  const lines = respecChanges(withAsi, after, 'en');
  assert.ok(lines.some(l => /^\+ Feat: Alert/.test(l)));
  assert.ok(lines.includes('STR 18 → 16'));
});

test('the approval body carries the patch and the readable change list', () => {
  const withAsi = applyLevelChoice(base, 4, { type: 'asi', asi: { str: 2 } });
  const after = changeLevelChoice(withAsi, 4, { type: 'asi', asi: { con: 2 } });
  const body = respecApprovalBody(withAsi, after, { lang: 'pt', title: 'Troca' });
  assert.equal(body.type, 'other');
  assert.equal(body.characterId, 7);
  assert.equal(body.payload.kind, 'respec');
  assert.deepEqual(body.payload.patch.abilities, { ...base.abilities, con: 16 });
});

test('anySwap lets the timeline swap any class option already picked', () => {
  const c = { ...base, classOptions: [{ classId: 'fighter', pool: 'fightingStyle', id: 'defense' }] };
  const swap = { swaps: [{ pool: 'fightingStyle', from: 'defense', to: 'archery' }] };
  assert.equal(validateClassOptions(c, 'fighter', swap, { anySwap: true }).valid, true);
});

import { changeFeatEntry, pendingRespecs } from '../src/progression/respec.js';

test('origin feat: picks change in place, origin and level kept', () => {
  const c = { ...base, feats: [{ id: 'magicInitiate', name: 'Magic Initiate', level: 1, origin: 'background', picks: { spellList: 'cleric', cantrip: ['guidance', 'light'], spell: ['bless'] } }] };
  const after = changeFeatEntry(c, 0, { type: 'feat', featId: 'magicInitiate', feat: 'Magic Initiate', picks: { spellList: 'wizard', cantrip: ['light', 'mageHand'], spell: ['shield'] } });
  assert.equal(after.feats[0].origin, 'background');
  assert.equal(after.feats[0].picks.spellList, 'wizard');
  assert.ok(respecChanges(c, after, 'en').some(l => l.startsWith('+ ') && /Shield/i.test(l)));
});

test('pending respecs: only this character, only open requests', () => {
  const list = [
    { id: 1, status: 'pending', character: { id: 7 }, payload: { kind: 'respec' } },
    { id: 2, status: 'consumed', character: { id: 7 }, payload: { kind: 'respec' } },
    { id: 3, status: 'pending', character: { id: 8 }, payload: { kind: 'respec' } },
    { id: 4, status: 'pending', character: { id: 7 }, payload: { name: 'item' } },
  ];
  assert.deepEqual(pendingRespecs(list, 7).map(a => a.id), [1]);
});

test('anySwap: pools without level-up swaps (fighting style) are not capped', () => {
  const c = { ...base, classOptions: [{ classId: 'fighter', pool: 'fightingStyle', id: 'defense' }] };
  const r = validateClassOptions(c, 'fighter', { swaps: [{ pool: 'fightingStyle', from: 'defense', to: 'archery' }] }, { anySwap: true });
  assert.deepEqual(r.issues, []);
});
