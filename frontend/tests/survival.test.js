import test from 'node:test';
import assert from 'node:assert/strict';
import { foodDays, breath, frigidMinutes, survivalStatus, stepDays, breathLabel } from '../src/sheet/survival.js';

test('comida: 3 + CON dias, mínimo 1', () => {
  assert.equal(foodDays(2), 5);
  assert.equal(foodDays(-4), 1);
});
test('fôlego: 1 + CON minutos (mín. 30 s), depois CON rodadas (mín. 1)', () => {
  assert.deepEqual(breath(2), { minutes: 3, rounds: 30, suffocating: 2 });
  assert.deepEqual(breath(-1), { minutes: 0.5, rounds: 5, suffocating: 1 });
  assert.equal(breathLabel(-2, 'en'), '30 s (5 rounds), then 1 round');
});
test('água gélida: minutos = valor de CON', () => {
  assert.equal(frigidMinutes(14), 14);
  assert.equal(frigidMinutes(14, true), Infinity);
});
test('estado e dias', () => {
  const c = { survival: { food: 6, water: 1 } };
  assert.deepEqual(survivalStatus(c, 2), { nourished: false, foodLimit: 5, foodLeft: 0, foodOver: 1, waterOver: 1 });
  assert.equal(survivalStatus({}, 0).nourished, true);
  assert.deepEqual(stepDays({}, 'food', 0.5).survival, { food: 0.5, water: 0 });
  assert.deepEqual(stepDays({ survival: { food: 0, water: 0 } }, 'water', -1).survival, { food: 0, water: 0 });
});
