import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_SKILL_GROUPS,
  computeActionGroupData,
  hasKeenSenses,
} from '../src/combat/monster-action-skills.js';
import {
  setElementAdvState,
  getElementAdvState,
} from '../src/dice/dice-gestures.js';

test('Action Skills - 4 Action Groups cover all 18 SRD skills', () => {
  assert.equal(ACTION_SKILL_GROUPS.length, 4);
  const keys = ACTION_SKILL_GROUPS.map(g => g.key);
  assert.deepEqual(keys, ['search', 'study', 'influence', 'hide']);

  const allSkills = ACTION_SKILL_GROUPS.flatMap(g => g.skills);
  assert.equal(allSkills.length, 18);

  const searchGroup = ACTION_SKILL_GROUPS.find(g => g.key === 'search');
  const searchSkillIds = searchGroup.skills.map(s => s.id);
  assert.deepEqual(searchSkillIds, ['survival', 'insight', 'medicine', 'perception']);

  const studyGroup = ACTION_SKILL_GROUPS.find(g => g.key === 'study');
  const studySkillIds = studyGroup.skills.map(s => s.id);
  assert.deepEqual(studySkillIds, ['arcana', 'religion', 'nature', 'investigation', 'history']);

  const influenceGroup = ACTION_SKILL_GROUPS.find(g => g.key === 'influence');
  const influenceSkillIds = influenceGroup.skills.map(s => s.id);
  assert.deepEqual(influenceSkillIds, ['animalHandling', 'deception', 'intimidation', 'performance', 'persuasion']);

  const hideGroup = ACTION_SKILL_GROUPS.find(g => g.key === 'hide');
  const hideSkillIds = hideGroup.skills.map(s => s.id);
  assert.deepEqual(hideSkillIds, ['acrobatics', 'athletics', 'sleightOfHand', 'stealth']);
});

test('Action Skills - Smartly consolidated calculation with exceptions exposed', () => {
  // Monster with WIS 20 (+5), explicit Perception +10 (passive 20)
  const abils = { str: 10, dex: 10, con: 10, int: 10, wis: 20, cha: 10 };
  const explicitMap = new Map([['perception', 10]]);

  const searchGroup = ACTION_SKILL_GROUPS.find(g => g.key === 'search');
  const data = computeActionGroupData(searchGroup, abils, explicitMap, 'en');

  // Baseline is 15/+5 (Survival, Insight, Medicine)
  assert.equal(data.baseline, '15/+5');
  // Exception is Perception: 20/+10
  assert.equal(data.exceptions.length, 1);
  assert.equal(data.exceptions[0].id, 'perception');
  assert.equal(data.exceptions[0].notationPair, '20/+10');

  // Consolidated string: Search: 15/+5 (20/+10 Perception)
  assert.equal(data.consolidatedText, 'Search: 15/+5 (20/+10 Perception)');
});

test('Action Skills - Clean baseline with zero exceptions when all skills match', () => {
  const abils = { str: 14, dex: 16, con: 12, int: 10, wis: 10, cha: 10 };
  const explicitMap = new Map(); // no trained skills in study

  const studyGroup = ACTION_SKILL_GROUPS.find(g => g.key === 'study');
  const data = computeActionGroupData(studyGroup, abils, explicitMap, 'pt');

  // INT is 10 (+0), so all 5 study skills have passive 10, mod +0
  assert.equal(data.baseline, '10/+0');
  assert.equal(data.exceptions.length, 0);
  assert.equal(data.consolidatedText, 'Estudo: 10/+0');
});

test('Dice Gestures - 3-state toggle (adv, dis, neutral)', () => {
  // DOM-like mock element
  const el = {
    attrs: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); },
    },
    title: 'Ataque +5',
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; },
    getAttribute(k) { return this.attrs[k] || null; },
  };

  // Initially null
  assert.equal(getElementAdvState(el), null);

  // Set Advantage
  setElementAdvState(el, 'adv');
  assert.equal(getElementAdvState(el), 'adv');
  assert.ok(el.classList.contains('has-adv'));
  assert.ok(!el.classList.contains('has-dis'));

  // Set Disadvantage
  setElementAdvState(el, 'dis');
  assert.equal(getElementAdvState(el), 'dis');
  assert.ok(el.classList.contains('has-dis'));
  assert.ok(!el.classList.contains('has-adv'));

  // Reset to neutral
  setElementAdvState(el, null);
  assert.equal(getElementAdvState(el), null);
  assert.ok(!el.classList.contains('has-adv'));
  assert.ok(!el.classList.contains('has-dis'));
});

test('Keen Senses - Detection across English and Portuguese traits', () => {
  assert.equal(hasKeenSenses(null), false);
  assert.equal(hasKeenSenses({}), false);

  // English Keen Smell
  const wolf = {
    traits: [{ name: 'Keen Hearing and Smell', desc: 'The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.' }]
  };
  assert.equal(hasKeenSenses(wolf), true);

  // Portuguese Sentidos Aguçados
  const coruja = {
    features: [{ name: 'Visão e Audição Aguçadas', desc: 'A coruja tem vantagem em testes de Sabedoria (Percepção).' }]
  };
  assert.equal(hasKeenSenses(coruja), true);

  // Trait with perception advantage description
  const hound = {
    special_abilities: [{ name: 'Bloodhound Instinct', desc: 'The hound has advantage on Wisdom (Perception) checks.' }]
  };
  assert.equal(hasKeenSenses(hound), true);

  // Normal creature without keen senses
  const goblin = {
    traits: [{ name: 'Nimble Escape', desc: 'The goblin can take the Disengage or Hide action as a bonus action.' }]
  };
  assert.equal(hasKeenSenses(goblin), false);
});

test('Keen Senses - Automatically sets Perception default advantage and notation', () => {
  const abils = { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }; // WIS mod +1
  const searchGroup = ACTION_SKILL_GROUPS.find(g => g.key === 'search');

  // Without Keen Senses
  const normalData = computeActionGroupData(searchGroup, abils, new Map(), 'en', { hasKeen: false });
  const normalPercep = normalData.skills.find(s => s.id === 'perception');
  assert.equal(normalPercep.isKeen, false);
  assert.equal(normalPercep.defaultAdv, undefined);
  assert.equal(normalPercep.notationPair, '11/+1');

  // With Keen Senses
  const keenData = computeActionGroupData(searchGroup, abils, new Map(), 'en', { hasKeen: true });
  const keenPercep = keenData.skills.find(s => s.id === 'perception');
  assert.equal(keenPercep.isKeen, true);
  assert.equal(keenPercep.defaultAdv, 'adv');
  assert.equal(keenPercep.notationPair, '11/+1 ▲');
  assert.equal(keenData.baselineBonus, 1);
  assert.equal(keenData.baselineBonusStr, '+1');
  assert.equal(keenData.baselinePassive, 11);

  // Exception list includes Perception with notation badge
  assert.ok(keenData.exceptions.some(e => e.id === 'perception'));
  assert.ok(keenData.consolidatedText.includes('11/+1 ▲ Perception'));
});
