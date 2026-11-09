import test from 'node:test';
import assert from 'node:assert/strict';
import { newRow, addBadge, removeOne, rollDice, evalRow, critExtra, duplicateRow, rowText } from '../src/dice/multi-roll.js';

const mods = { str: 3, dex: 2, pb: 2 };
const build = (...bs) => bs.reduce((r, b) => addBadge(r, b), newRow());
const fixed = (vals) => { let i = 0; return () => vals[i++]; }; // rand() → valor pronto
const r01 = (v, sides) => (v - 1) / sides + 1e-9;

test('emblemas iguais empilham; o fixo soma; tirar um desempilha', () => {
  let r = build({ kind: 'die', die: 6 }, { kind: 'die', die: 6 }, { kind: 'flat', value: 2 }, { kind: 'flat', value: 1 });
  assert.equal(r.badges.length, 2);
  assert.equal(r.badges[0].count, 2);
  assert.equal(r.badges[1].value, 3);
  r = removeOne(r, 0);
  assert.equal(r.badges[0].count, 1);
  assert.equal(rowText(build({ kind: 'die', die: 20 }, { kind: 'abil', abil: 'str' }, { kind: 'pb' }, { kind: 'die', die: 12, sign: -1 })), 'd20 +STR +PB −d12');
});

test('linha com d20: teste = d20+mods; dano = outros dados + atributo + fixo (sem BP)', () => {
  const axe = build({ kind: 'die', die: 20 }, { kind: 'abil', abil: 'str' }, { kind: 'pb' }, { kind: 'flat', value: 3 }, { kind: 'die', die: 12 });
  const rolls = { 0: [14], 4: [9] };
  const ev = evalRow(axe, mods, rolls);
  assert.equal(ev.check, 14 + 3 + 2 + 3);
  assert.equal(ev.damage, 9 + 3 + 3);
  assert.equal(ev.crit, false);
});

test('20 natural: crítico; o dano soma os dados extras', () => {
  const axe = build({ kind: 'die', die: 20 }, { kind: 'abil', abil: 'str' }, { kind: 'die', die: 12 });
  const ev = evalRow(axe, mods, { 0: [20], 2: [5] }, { 2: [7] });
  assert.equal(ev.crit, true);
  assert.equal(ev.damage, 5 + 7 + 3);
  assert.deepEqual(Object.keys(critExtra(axe, () => 0)), ['2']);
});

test('vantagem rola 2 d20 e mantém o maior; desvantagem o menor', () => {
  const row = { ...build({ kind: 'die', die: 20 }), adv: 'adv' };
  const rolls = rollDice(row, fixed([r01(5, 20), r01(15, 20)]));
  assert.equal(rolls[0].length, 2);
  assert.equal(evalRow(row, mods, rolls).check, 15);
  assert.equal(evalRow({ ...row, adv: 'dis' }, mods, rolls).check, 5);
});

test('sem d20 é uma soma só; subtrair funciona', () => {
  const r = build({ kind: 'die', die: 6 }, { kind: 'die', die: 4, sign: -1 }, { kind: 'abil', abil: 'dex' });
  assert.equal(evalRow(r, mods, { 0: [6], 1: [3] }).total, 6 - 3 + 2);
  const c = duplicateRow(r); c.badges[0].count = 9;
  assert.equal(r.badges[0].count, 1);
});
