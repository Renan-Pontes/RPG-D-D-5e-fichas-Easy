import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from 'three';
import {
  parseFormula, rollFormula, splitD100, physicalDice, breakdown, checkOutcome,
  physicalEntry, resolveAnimMode, faceLabelFor,
} from '../src/dice/dice-math.js';
import { buildDie, orientationFor, labelFacing } from '../src/dice/dice-geometry.js';

test('fórmula rápida: aceita as formas comuns', () => {
  assert.deepEqual(parseFormula('2d6+3'), { terms: [{ count: 2, sides: 6, sign: 1 }], mod: 3, text: '2d6+3' });
  assert.equal(parseFormula('d20').text, '1d20');
  assert.equal(parseFormula(' 1d8 + 1d6 - 1 ').text, '1d8+1d6-1');
  assert.equal(parseFormula('4D6').text, '4d6');
  assert.equal(parseFormula('d100').terms[0].sides, 100);
});

test('fórmula rápida: rejeita lixo e dados inexistentes', () => {
  for (const bad of ['', 'abc', '2d7', '2d6d8', '0d6', '1d20++2', '+5', '99d6', 'd']) {
    assert.equal(parseFormula(bad), null, bad);
  }
});

test('rolagem com valores predeterminados respeita o preset', () => {
  const r = rollFormula(parseFormula('2d6+3'), { preset: [4, 5] });
  assert.equal(r.total, 12);
  assert.equal(breakdown(r), '[4, 5] +3');
  const sub = rollFormula(parseFormula('1d8-1d4'), { preset: [6, 3] });
  assert.equal(sub.total, 3);
});

test('vantagem/desvantagem: dois d20, mantém o maior/menor, crítico pelo mantido', () => {
  const adv = rollFormula(parseFormula('1d20+2'), { adv: 'adv', preset: [20, 3] });
  assert.equal(adv.total, 22);
  assert.equal(adv.isCrit, true);
  assert.deepEqual(adv.groups[0].rolls.map(r => r.kept), [true, false]);
  const dis = rollFormula(parseFormula('1d20'), { adv: 'dis', preset: [20, 1] });
  assert.equal(dis.total, 1);
  assert.equal(dis.isFumble, true);
  assert.equal(dis.isCrit, false);
  // vantagem só vale para um único d20
  const many = rollFormula(parseFormula('2d20'), { adv: 'adv', preset: [5, 6] });
  assert.equal(many.adv, 'normal');
  assert.equal(many.total, 11);
});

test('rolagem local fica no intervalo do dado', () => {
  for (let i = 0; i < 200; i++) {
    const r = rollFormula(parseFormula('1d4'));
    assert.ok(r.total >= 1 && r.total <= 4);
  }
});

test('d100 vira dezenas + unidades (100 = 00 + 0)', () => {
  assert.deepEqual(splitD100(57), { tens: 50, units: 7 });
  assert.deepEqual(splitD100(100), { tens: 0, units: 0 });
  assert.deepEqual(splitD100(10), { tens: 10, units: 0 });
  assert.deepEqual(splitD100(1), { tens: 0, units: 1 });
  const phys = physicalDice(100, [57]);
  assert.deepEqual(phys.map(d => [d.kind, d.label]), [['d100', '50'], ['d10', '7']]);
  assert.equal(faceLabelFor('d10', 10), '0');
});

test('dados físicos a desenhar marcam o d20 descartado', () => {
  const phys = physicalDice(20, [{ value: 15, kept: true }, { value: 4, kept: false }]);
  assert.deepEqual(phys.map(d => [d.kind, d.label, !!d.dimmed]), [['d20', '15', false], ['d20', '4', true]]);
});

test('geometria 3D: toda face de todo dado termina virada para a câmera e em pé', () => {
  const expected = { d4: 4, d6: 6, d8: 8, d10: 10, d100: 10, d12: 12, d20: 20 };
  for (const [kind, n] of Object.entries(expected)) {
    const die = buildDie(kind);
    assert.equal(die.faces.length, n, `${kind} faces`);
    const labels = new Set(die.faces.map(f => f.label));
    assert.equal(labels.size, n, `${kind} rótulos únicos`);
    for (const f of die.faces) {
      const q = orientationFor(die, f.label);
      assert.ok(q instanceof Quaternion);
      assert.equal(labelFacing(die, q), f.label, `${kind} ${f.label}`);
      const up = f.up.clone().applyQuaternion(q);
      assert.ok(up.dot(new Vector3(0, 1, 0)) > 0.999, `${kind} ${f.label} em pé`);
    }
  }
});

test('geometria 3D: faces opostas somam n+1 (como dado de verdade)', () => {
  for (const [kind, n] of [['d6', 6], ['d8', 8], ['d12', 12], ['d20', 20]]) {
    const die = buildDie(kind);
    for (const f of die.faces) {
      const opp = die.faces.find(g => g.normal.dot(f.normal) < -0.95);
      assert.equal(+f.label + +opp.label, n + 1, `${kind} ${f.label}`);
    }
  }
});

test('valor inexistente no dado não gera orientação', () => {
  assert.equal(orientationFor(buildDie('d6'), '7'), null);
});

test('resultado contra CD e entrada de dado físico', () => {
  assert.equal(checkOutcome(15, 15), 'pass');
  assert.equal(checkOutcome(14, 15), 'fail');
  assert.equal(checkOutcome(14, null), null);
  assert.deepEqual(physicalEntry('12', { mode: 'natural', modifier: 3 }), { natural: 12, modifier: 3, total: 15 });
  assert.deepEqual(physicalEntry('17', { mode: 'total' }), { natural: null, modifier: null, total: 17 });
  assert.equal(physicalEntry('21', { mode: 'natural' }).error, 'range');
  assert.equal(physicalEntry('', { mode: 'natural' }).error, 'empty');
});

test('modo de animação: movimento reduzido e sem WebGL caem no 2D/estático', () => {
  assert.equal(resolveAnimMode('3d', { webgl: true }), '3d');
  assert.equal(resolveAnimMode('3d', { webgl: false }), '2d');
  assert.equal(resolveAnimMode('3d', { reducedMotion: true }), 'static');
  assert.equal(resolveAnimMode('2d', {}), '2d');
  assert.equal(resolveAnimMode('off', { reducedMotion: true }), 'off');
});
