import test from 'node:test';
import assert from 'node:assert/strict';
import { newRow, rollRow, rowFormula, rowMods, duplicateRow } from '../src/dice/multi-roll.js';

// gerador determinístico: devolve a sequência de valores de dado pedida
const seqRand = (sides, vals) => { let i = 0; return () => (vals[i++ % vals.length] - 1) / sides + 1e-9; };

const axe = newRow({ name: 'Axe', abil: 'str', pb: true, flat: 3, dice: [{ count: 1, die: 12, role: 'damage' }, { count: 1, die: 8, role: 'bonus' }] });
const mods = { str: 3, dex: 2, pb: 2 };

test('vínculos: ataque soma atributo+BP+fixo; dano soma atributo+fixo', () => {
  assert.deepEqual(rowMods(axe, mods), { atk: 8, dmg: 6 });
  assert.equal(rowFormula(axe, mods), '1d20+8 +1d8 | 1d12+6');
  assert.equal(rowFormula({ ...axe, adv: 'adv' }, mods), '2d20+8 +1d8 | 1d12+6');
});

test('crítico dobra só os dados de dano (não o modificador nem o bônus)', () => {
  // d20 = 20 → depois d8 bônus = 4 → depois 2× d12 = 5, 7
  const vals = [20, 4, 5, 7];
  let i = 0; const sidesOrder = [20, 8, 12, 12];
  const rand = () => { const v = vals[i]; const s = sidesOrder[i]; i++; return (v - 1) / s + 1e-9; };
  const r = rollRow(axe, mods, rand);
  assert.equal(r.crit, true);
  assert.equal(r.damage[0].rolls.length, 2);
  assert.equal(r.bonus[0].rolls.length, 1);
  assert.equal(r.atk, 20 + 8 + 4);
  assert.equal(r.dmg, 5 + 7 + 6);
});

test('vantagem mantém o maior, desvantagem o menor', () => {
  const a = rollRow({ ...axe, adv: 'adv', dice: [] }, mods, seqRand(20, [5, 15]));
  assert.equal(a.kept, 15);
  const d = rollRow({ ...axe, adv: 'dis', dice: [] }, mods, seqRand(20, [5, 15]));
  assert.equal(d.kept, 5);
  assert.equal(d.dmg, null);
});

test('duplicar cria outra linha independente', () => {
  const c = duplicateRow(axe);
  assert.notEqual(c.id, axe.id);
  c.dice[0].count = 3;
  assert.equal(axe.dice[0].count, 1);
});
