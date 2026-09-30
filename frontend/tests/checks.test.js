import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import {
  checkLabel, modifierFor, buildCheckPayload, summarize, responseDiceGroups,
} from '../src/checks/check-logic.js';

const rogue = () => ({
  ...Utils.makeNew(), className: 'rogue', level: 5, race: 'human', background: 'criminal',
  abilities: { str: 8, dex: 16, con: 12, int: 10, wis: 14, cha: 10 },
});

test('rótulos dos pedidos em pt/en', () => {
  assert.equal(checkLabel({ kind: 'skill', key: 'perception' }, 'pt'), 'Percepção');
  assert.equal(checkLabel({ kind: 'skill', key: 'perception' }, 'en'), 'Perception');
  assert.equal(checkLabel({ kind: 'save', key: 'dex' }, 'pt'), 'Resistência de DES');
  assert.equal(checkLabel({ kind: 'save', key: 'wis' }, 'en'), 'WIS save');
});

test('modificador vem da ficha (perícia, resistência, atributo)', () => {
  const c = rogue();
  assert.equal(modifierFor(c, { kind: 'skill', key: 'perception' }), Utils.skillBonus(c, 'perception'));
  assert.equal(modifierFor(c, { kind: 'save', key: 'dex' }), Utils.saveBonus(c, 'dex'));
  assert.equal(modifierFor(c, { kind: 'ability', key: 'str' }), Utils.abilityMod(c, 'str'));
  assert.equal(modifierFor(c, { kind: 'custom', key: '' }), null);
  assert.equal(modifierFor(null, { kind: 'skill', key: 'perception' }), null);
});

test('payload do pedido: CD opcional, CD secreta só com CD, todos = []', () => {
  const p = buildCheckPayload({ kind: 'skill', key: 'stealth', dc: '15', dcHidden: true, targets: [] }, 'pt');
  assert.deepEqual(p, { kind: 'skill', key: 'stealth', label: 'Furtividade', dc: 15, dcHidden: true, advantage: 'normal', targetUserIds: [] });
  const noDc = buildCheckPayload({ kind: 'save', key: 'con', dc: '', dcHidden: true, advantage: 'dis', targets: [3] }, 'en');
  assert.equal(noDc.dc, null);
  assert.equal(noDc.dcHidden, false);
  assert.deepEqual(noDc.targetUserIds, [3]);
  assert.equal(noDc.label, 'CON save');
  const custom = buildCheckPayload({ kind: 'custom', key: '', label: 'Ferramentas de ladrão' });
  assert.equal(custom.label, 'Ferramentas de ladrão');
});

test('resumo para o mestre', () => {
  const s = summarize({ targets: [
    { response: { total: 16 }, outcome: 'pass' },
    { response: { total: 9 }, outcome: 'fail' },
    { response: null, outcome: null },
  ] });
  assert.deepEqual(s, { total: 3, answered: 2, waiting: 1, passed: 1, failed: 1 });
});

test('resposta rolada no servidor vira dados para a animação 3D', () => {
  assert.deepEqual(responseDiceGroups({ rolls: [{ value: 4, kept: false }, { value: 17, kept: true }] }),
    [{ die: 20, rolls: [{ value: 4, kept: false }, { value: 17, kept: true }] }]);
  assert.deepEqual(responseDiceGroups({ rolls: [] }), []);
});
