import test from 'node:test';
import assert from 'node:assert/strict';
import { knownSpellIds, unknownSpells } from '../src/progression/known.js';
import { availableSpells, availableCantrips } from '../src/creator/spell-helpers.js';

const wiz = {
  rulesVersion: '2024', className: 'wizard', level: 3, race: 'human', abilities: { int: 16 },
  spells: [{ id: 'magicMissile', prepared: true }, { id: 'light', prepared: true }],
  feats: [{ id: 'magicInitiate', origin: 'background', level: 1, picks: { spellList: 'cleric', cantrip: ['guidance', 'sacredFlame'], spell: ['bless'] } }],
};

test('one source knows spells from the sheet, feats and species', () => {
  const k = knownSpellIds(wiz);
  for (const id of ['magicMissile', 'light', 'guidance', 'sacredFlame', 'bless']) assert.ok(k.has(id), id);
});

test('pickers drop known spells but keep the ones marked in the same picker', () => {
  const out = unknownSpells(wiz, ['magicMissile', 'shield', 'bless'], ['bless']).map(x => x);
  assert.deepEqual(out, ['shield', 'bless']);
});

test('creator lists: a feat cantrip never shows again as a class cantrip', () => {
  assert.ok(!availableCantrips(wiz).some(s => s.id === 'sacredFlame'));
  // a magia já marcada na própria etapa continua visível para desmarcar
  assert.ok(availableSpells(wiz).some(s => s.id === 'magicMissile'));
});
