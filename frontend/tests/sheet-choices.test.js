import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import SRD from '../data/srd.js';
import {
  computeProgression, validateLevelChoice, applyLevelChoice, applyLevelUpChoices, levelChoiceKind, revertLastLevel,
} from '../src/progression/engine.js';

const druid = (level, extra = {}) => ({
  rulesVersion: '2024', className: 'druid', subclass: level >= 3 ? 'stars' : '', level, race: 'human',
  background: 'guide', maxHp: 10, currentHp: 10,
  abilities: { str: 8, dex: 14, con: 14, int: 10, wis: 15, cha: 10 }, raceBonus: { wis: 2, con: 1 }, ...extra,
});

test('druida conhece Druídico; 2024 escolhe 2 idiomas além do Comum', () => {
  const c = druid(1);
  assert.deepEqual(Utils.fixedLanguages(c).sort(), ['Common', 'Druidic']);
  assert.equal(Utils.languageChoiceCount(c), 2);
  assert.deepEqual(Utils.languagesFor({ ...c, languages: ['Elvish', '+2 of choice'] }).sort(), ['Common', 'Druidic', 'Elvish']);
  assert.ok(Utils.fixedLanguages({ ...c, className: 'rogue' }).includes("Thieves' Cant"));
});

test('perícias do antecedente contam mesmo sem estar em skillProfs', () => {
  const c = druid(1, { skillProfs: [] });
  assert.deepEqual(Utils.backgroundSkills(c), ['stealth', 'survival']);
  assert.ok(Utils.hasSkillProf(c, 'survival'));
  assert.equal(Utils.skillBonus(c, 'survival'), Utils.abilityMod(c, 'wis') + Utils.profBonus(c));
});

test('ASI do nível 4: valida, aplica e sai das pendências', () => {
  const c = druid(4);
  assert.ok(computeProgression(c).pendingChoices.some(p => p.type === 'asiOrFeat' && p.level === 4));
  assert.equal(levelChoiceKind(c, 4), 'asi');
  assert.equal(levelChoiceKind(c, 5), null);
  assert.ok(!validateLevelChoice(c, 4, { type: 'asi', asi: { wis: 3 } }).valid);
  assert.ok(!validateLevelChoice(c, 4, { type: 'asi', asi: { wis: 1 } }).valid);
  assert.ok(!validateLevelChoice(c, 3, { type: 'asi', asi: { wis: 2 } }).valid, 'nível sem ASI');
  const choice = { type: 'asi', asi: { wis: 1, con: 1 } };
  assert.ok(validateLevelChoice(c, 4, choice).valid);
  const next = applyLevelChoice(c, 4, choice);
  assert.equal(next.abilities.wis, 16);
  assert.ok(!computeProgression(next).pendingChoices.some(p => p.type === 'asiOrFeat'));
  assert.ok(!validateLevelChoice(next, 4, choice).valid, 'não escolhe duas vezes');
});

test('ASI não passa de 20; nível 19 exige talento (Dádiva Épica)', () => {
  const capped = druid(4, { abilities: { ...druid(4).abilities, wis: 19 }, raceBonus: {} });
  assert.ok(!validateLevelChoice(capped, 4, { type: 'asi', asi: { wis: 2 } }).valid);
  const c19 = druid(19);
  assert.equal(levelChoiceKind(c19, 19), 'epic');
  assert.ok(!validateLevelChoice(c19, 19, { type: 'asi', asi: { wis: 2 } }).valid);
  assert.ok(validateLevelChoice(c19, 19, { type: 'feat', feat: 'Boon of Fate' }).valid);
});

test('subida completa aplica nível, PV, escolha e magias', () => {
  const next = applyLevelUpChoices(druid(3), { toLevel: 4, hpGain: 7, choice: { type: 'feat', feat: 'Alert' }, spellsAdded: ['produceFlame'] });
  assert.equal(next.level, 4);
  assert.equal(next.maxHp, 17);
  assert.equal(next.feats[0].name, 'Alert');
  assert.ok(next.spells.some(s => s.id === 'produceFlame'));
});

test('Círculo do Titã (UA) aparece entre as subclasses de druida', () => {
  const titan = SRD.SUBCLASSES.druid.find(s => s.id === 'titan');
  assert.ok(titan);
  assert.equal(titan.source, 'UA26VO');
  assert.ok(titan.manualFeatures);
});

test('2014: antecedente Sábio soma 2 idiomas à escolha', () => {
  const c = { rulesVersion: '2014', className: 'druid', race: 'human', background: 'sage', level: 1 };
  const fromRace = Utils.languageChoiceSources({ ...c, background: '' }).reduce((n, x) => n + x.n, 0);
  assert.equal(Utils.languageChoiceCount(c), fromRace + 2);
  assert.ok(Utils.languageChoiceSources(c).some(x => x.source === 'background' && x.n === 2));
});

test('voltar um nível desfaz PV, ASI e magias da subida', () => {
  const c3 = druid(3, { maxHp: 20, currentHp: 20, spells: [] });
  const c4 = applyLevelUpChoices(c3, { toLevel: 4, hpGain: 6, choice: { type: 'asi', asi: { wis: 2 } }, spellsAdded: ['produceFlame'] });
  assert.equal(c4.level, 4);
  assert.equal(c4.abilities.wis, 17);
  const back = revertLastLevel(c4);
  assert.equal(back.level, 3);
  assert.equal(back.maxHp, 20);
  assert.equal(back.abilities.wis, 15);
  assert.ok(!(back.levelChoices || {})[4]);
  assert.ok(!(back.spells || []).some(s => s.id === 'produceFlame'));
  assert.deepEqual(back.levelHistory, []);
});

test('voltar nível sem registro desconta a média do dado de vida e o talento', () => {
  const c = druid(4, { maxHp: 30, currentHp: 30, levelChoices: { 4: { type: 'feat', feat: 'Alert' } }, feats: [{ name: 'Alert', level: 4 }] });
  const back = revertLastLevel(c);
  const conMod = Math.floor((14 + 1 - 10) / 2);
  assert.equal(back.maxHp, 30 - (5 + conMod));
  assert.deepEqual(back.feats, []);
});
