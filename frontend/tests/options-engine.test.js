import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_OPTIONS } from '../data/class-options/index.js';
import {
  computeProgression, validateClassOptions, applyClassOptions, applyLevelUpChoices, revertLastLevel,
} from '../src/progression/engine.js';
import { optionSlots } from '../src/progression/options.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';
import Utils from '../utils.js';

// Motor genérico de opções de classe, com uma classe de teste isolada.
const b = (pt, en) => ({ pt, en });
const opt = (id, extra = {}) => ({ id, name: b(id, id), desc: b(id, id), source: 'TEST', ...extra });
CLASS_OPTIONS.testclass = {
  classId: 'testclass',
  pools: {
    trick: { name: b('Truques', 'Tricks'), swapOnLevelUp: 1, swapLevels: [3], options: [
      opt('a'), opt('b', { prereq: { level: 2 } }), opt('c', { prereq: { options: ['a'] } }),
      opt('opener', { choices: { bonus: 1 } }), opt('old', { rules: '2014' }),
      opt('perceptive', { grants: { expertise: ['perception'], saves: ['wis'], languages: ['Elvish'] } }),
    ] },
    bonus: { name: b('Bônus', 'Bonus'), kind: 'skill', grantAs: 'skill' },
    kit: { name: b('Kit', 'Kit'), startingClassOnly: true, options: [opt('k1'), opt('k2')] },
    style: { name: b('Estilo', 'Style'), freeSwap: true, options: [opt('s1'), opt('s2')] },
    sub: { name: b('Sub', 'Sub'), options: [opt('x'), opt('y')] },
  },
  choices: { 1: { trick: 1, kit: 1, style: 1 }, 2: { trick: 1 } },
  legacyChoices: { 1: { trick: 1 } },
  subclassChoices: { alpha: { 3: { sub: 1 } } },
  legacySubclassChoices: { alpha: { 1: { sub: 1 } } },
};
PROGRESSION_RULES_2024.testclass = { classId: 'testclass', perLevel: {}, subclassPerLevel: {} };
const ch = (extra = {}) => ({ rulesVersion: '2024', className: 'testclass', level: 1, maxHp: 10, currentHp: 10, ...extra });
const add = (pool, id, detail) => ({ adds: [{ pool, id, ...(detail ? { detail } : {}) }] });

test('vagas por versão de regras e por subclasse', () => {
  assert.deepEqual(Object.keys(optionSlots(ch({ level: 3, subclass: 'alpha' }))).sort(), ['kit', 'style', 'sub', 'trick']);
  assert.equal(optionSlots(ch({ level: 3, subclass: 'alpha' })).trick.total, 2);
  const legacy = optionSlots(ch({ rulesVersion: undefined, level: 1, subclass: 'alpha' }));
  assert.deepEqual(Object.keys(legacy).sort(), ['sub', 'trick']);
  assert.ok(!validateClassOptions(ch({ level: 2 }), 'testclass', add('trick', 'old')).valid, 'opção só-2014');
});

test('pré-requisitos, limite de vagas e opção que abre vagas', () => {
  const c = ch({ level: 2 });
  assert.ok(!validateClassOptions(ch(), 'testclass', add('trick', 'b')).valid, 'nível');
  assert.ok(!validateClassOptions(c, 'testclass', add('trick', 'c')).valid, 'requer a');
  assert.ok(validateClassOptions(c, 'testclass', { adds: [{ pool: 'trick', id: 'a' }, { pool: 'trick', id: 'c' }] }).valid);
  assert.ok(!validateClassOptions(c, 'testclass', { adds: [{ pool: 'trick', id: 'a' }, { pool: 'trick', id: 'b' }, { pool: 'trick', id: 'c' }] }).valid, 'só 2 vagas');
  // `opener` abre 1 vaga no pool dinâmico de perícia, na mesma submissão.
  assert.ok(validateClassOptions(c, 'testclass', { adds: [{ pool: 'trick', id: 'opener' }, { pool: 'bonus', id: 'stealth' }] }).valid);
  assert.ok(!validateClassOptions(c, 'testclass', add('bonus', 'stealth')).valid, 'sem opener não há vaga');
});

test('pendências somem ao escolher; concessões entram na ficha', () => {
  let c = ch({ level: 2, abilities: { wis: 14 } });
  assert.ok(computeProgression(c).pendingChoices.some(p => p.pool === 'trick' && p.missing === 2));
  c = applyClassOptions(c, 'testclass', { adds: [{ pool: 'trick', id: 'perceptive' }, { pool: 'trick', id: 'a' }] });
  assert.ok(!computeProgression(c).pendingChoices.some(p => p.pool === 'trick'));
  assert.ok(Utils.hasExpertise(c, 'perception') && Utils.hasSkillProf(c, 'perception'));
  assert.ok(Utils.hasSaveProf(c, 'wis'));
  assert.ok(Utils.languagesFor(c).includes('Elvish'));
});

test('troca: só ao subir nos níveis permitidos; troca livre a qualquer momento', () => {
  let c = applyClassOptions(ch({ level: 2 }), 'testclass', { adds: [{ pool: 'trick', id: 'a' }, { pool: 'style', id: 's1' }] });
  const swap = { swaps: [{ pool: 'trick', from: 'a', to: 'b' }] };
  assert.ok(!validateClassOptions(c, 'testclass', swap).valid, 'fora da subida');
  assert.ok(!validateClassOptions(c, 'testclass', swap, { levelUp: true }).valid, 'nível 2 não está em swapLevels');
  assert.ok(validateClassOptions({ ...c, level: 3 }, 'testclass', swap, { levelUp: true }).valid);
  assert.ok(validateClassOptions(c, 'testclass', { swaps: [{ pool: 'style', from: 's1', to: 's2' }] }).valid, 'freeSwap');
});

test('subir e voltar nível desfaz escolhas e trocas daquele nível', () => {
  let c = applyClassOptions(ch({ level: 2 }), 'testclass', add('trick', 'a'));
  c = applyLevelUpChoices(c, { toLevel: 3, hpGain: 5, options: { adds: [{ pool: 'trick', id: 'b' }], swaps: [{ pool: 'trick', from: 'a', to: 'perceptive' }] } });
  assert.deepEqual(c.classOptions.map(p => p.id).sort(), ['b', 'perceptive']);
  c = revertLastLevel(c);
  assert.equal(c.level, 2);
  assert.deepEqual(c.classOptions.map(p => p.id), ['a']);
});

test('multiclasse: pools startingClassOnly não dão vagas a quem entra depois', () => {
  const mc = { rulesVersion: '2024', className: 'fighter', level: 2, multiclass: [{ id: 'testclass' }], classSequence: ['fighter', 'testclass'] };
  const p = computeProgression(mc);
  const mine = p.pendingChoices.filter(c => c.classId === 'testclass').map(c => c.pool);
  assert.ok(mine.includes('trick') && !mine.includes('kit'));
});

test('grants fixos nos níveis de subclasse entram em prog.grants', () => {
  const p = computeProgression({ rulesVersion: '2024', className: 'fighter', subclass: 'runeknight', level: 3 });
  assert.ok(Object.values(p.grants).flat().length > 0);
});
