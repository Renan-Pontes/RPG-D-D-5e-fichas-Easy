// Espaços de magia: gastam da direita para a esquerda e um toque numa gema gasta devolve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slotSpent, slotTap, slotTapTitle } from '../src/sheet/gem-text.js';

test('as gemas gastas ficam na ponta direita', () => {
  // 4 espaços, 1 gasto: só a última apagada
  assert.deepEqual([0, 1, 2, 3].map(i => slotSpent(i, 4, 1)), [false, false, false, true]);
  assert.deepEqual([0, 1, 2].map(i => slotSpent(i, 3, 0)), [false, false, false]);
  assert.deepEqual([0, 1, 2].map(i => slotSpent(i, 3, 3)), [true, true, true]);
});

test('toque gasta um, toque numa gasta devolve um (desfaz o toque errado)', () => {
  assert.equal(slotTap(0, 4, false), 1);
  assert.equal(slotTap(1, 4, true), 0, 'tocar de novo desfaz');
  assert.equal(slotTap(4, 4, false), 4, 'não passa do máximo');
  assert.equal(slotTap(0, 4, true), 0, 'não fica negativo');
  assert.equal(slotTap(undefined, 2, false), 1);
});

test('dica de cada gema em pt e en', () => {
  assert.match(slotTapTitle(true, 'pt'), /devolver/);
  assert.match(slotTapTitle(false, 'en'), /spend/);
});
