import test from 'node:test';
import assert from 'node:assert/strict';
import { hitDicePools, hitDieHeal, spendHitDie, usedByAfterRest, hpFormula, filledSlices, exhaustionLevel, setExhaustion, toggleTo, hpSliderRange, deltaLabel } from '../src/sheet/hp-logic.js';

const by = { 8: 7, 10: 1 };

test('pools: ficha antiga gasta primeiro o dado maior; com mapa, vale o mapa', () => {
  assert.deepEqual(hitDicePools(by, { hitDiceUsed: 2 }), [{ die: 10, total: 1, used: 1, left: 0 }, { die: 8, total: 7, used: 1, left: 6 }]);
  assert.deepEqual(hitDicePools(by, { hitDiceUsed: 2, hitDiceUsedBy: { 8: 2 } }).map(p => p.used), [0, 2]);
  assert.deepEqual(hitDicePools({}, {}), []);
});

test('gastar um Dado de Vida cura rolagem + CON, sem passar do máximo', () => {
  const c = { currentHp: 40, maxHp: 51, hitDiceUsed: 0 };
  const p = spendHitDie(c, by, 8, 5, 2);
  assert.deepEqual(p, { currentHp: 47, hitDiceUsed: 1, hitDiceUsedBy: { 10: 0, 8: 1 }, gained: 7 });
  assert.equal(spendHitDie({ ...c, currentHp: 50 }, by, 8, 8, 3).currentHp, 51);
  assert.equal(spendHitDie({ ...c, hitDiceUsedBy: { 10: 1 } }, by, 10, 5, 0), null);
  assert.equal(spendHitDie(c, by, 12, 5, 0), null);
  assert.equal(hitDieHeal(1, -3), 0);
});

test('descanso longo: devolve primeiro os dados maiores', () => {
  assert.deepEqual(usedByAfterRest({ hitDiceUsedBy: { 10: 1, 8: 3 } }, by, 1), { 10: 0, 8: 1 });
  assert.deepEqual(usedByAfterRest({ hitDiceUsed: 3 }, by, 3), { 10: 1, 8: 2 });
});

test('fórmula dos PV no jeito do livro', () => {
  assert.equal(hpFormula({ 8: 8 }, 2, 8), '8d8 + 16');
  assert.equal(hpFormula(by, -1, 8), '1d10 + 7d8 − 8');
  assert.equal(hpFormula({ 6: 1 }, 0, 1), '1d6');
});

test('fatias acesas', () => {
  assert.equal(filledSlices(51, 51), 10);
  assert.equal(filledSlices(1, 51), 1);
  assert.equal(filledSlices(0, 51), 0);
  assert.equal(filledSlices(26, 51), 6);
});

test('exaustão: nível e condição em sincronia', () => {
  assert.equal(exhaustionLevel({ conditions: ['exhausted'] }), 1);
  assert.equal(exhaustionLevel({ exhaustionLevel: 3, conditions: [] }), 3);
  assert.deepEqual(setExhaustion({ conditions: ['prone'] }, 2), { exhaustionLevel: 2, conditions: ['prone', 'exhausted'] });
  assert.deepEqual(setExhaustion({ conditions: ['exhausted'] }, 0), { exhaustionLevel: 0, conditions: [] });
  assert.equal(setExhaustion({}, 9).exhaustionLevel, 6);
  assert.equal(toggleTo(2, 1), 1);
  assert.equal(toggleTo(2, 3), 4);
});

test('faixa do controle e texto da lente', () => {
  assert.deepEqual(hpSliderRange({ currentHp: 30, maxHp: 51, tempHp: 5 }), { min: -35, max: 21 });
  assert.equal(deltaLabel(-7), '−7');
  assert.equal(deltaLabel(4), '+4');
  assert.equal(deltaLabel(0), '0');
});
