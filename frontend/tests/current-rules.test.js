import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import SRD from '../data/srd.js';
import { RULES_2024, SPELLS_2024 } from '../data/rules2024.js';
import { computeProgression } from '../src/progression/engine.js';

const current = (className, level = 1, extra = {}) => ({ className, level, rulesVersion: '2024', abilities: {str:10,dex:14,con:14,int:16,wis:18,cha:16}, ...extra });
test('all 12 current SRD classes have complete level tables and subclass choice at 3', () => {
  assert.equal(Object.keys(RULES_2024).length, 12);
  for (const [id, rule] of Object.entries(RULES_2024)) {
    for (let level = 1; level <= 20; level++) assert.ok(rule.perLevel[level], `${id} ${level}`);
    assert.ok(computeProgression(current(id, 3)).pendingChoices.some(c => c.type === 'subclass'), id);
    assert.ok(!computeProgression(current(id, 1)).pendingChoices.some(c => c.type === 'subclass'), id);
  }
});
test('current half casters start at level 1; legacy sheets retain level 2 start', () => {
  for (const id of ['paladin','ranger']) {
    assert.equal(Utils.spellSlots(current(id))[0], 2);
    assert.equal(Utils.spellSlots({...current(id), rulesVersion: '2014'})[0] || 0, 0);
  }
});
test('fixed prepared counts, Artificer and Epic Boons follow the selected revision', () => {
  assert.equal(computeProgression(current('cleric')).spellsPrepared, 4);
  assert.equal(computeProgression(current('cleric', 1, {abilities:{wis:8}})).spellsPrepared, 4);
  assert.ok(computeProgression(current('artificer')).autoCantrips.includes('mending'));
  assert.equal(computeProgression(current('artificer')).spellsPrepared, 2);
  assert.ok(computeProgression(current('fighter',19)).pendingChoices.some(c => c.type === 'epicBoon'));
  assert.ok(SRD.CLASSES.some(c => c.id === 'artificer'));
});
test('339 current spells have unique IDs and structured metadata', () => {
  assert.equal(SPELLS_2024.length, 339);
  assert.equal(new Set(SPELLS_2024.map(s => s.id)).size, 339);
  for (const s of SPELLS_2024) {
    assert.ok(s.range && s.castingTime && s.name.en && s.desc.en, s.id);
    assert.ok(s.level >= 0 && s.level <= 9, s.id);
  }
});
test('Draconic AC uses CHA only from level 3 in current rules', () => {
  assert.equal(Utils.computeAc(current('sorcerer',1,{subclass:'draconic'})),12);
  assert.equal(Utils.computeAc(current('sorcerer',3,{subclass:'draconic'})),15);
  assert.equal(Utils.computeAc({...current('sorcerer',1,{subclass:'draconic'}),rulesVersion:'2014'}),15);
});
