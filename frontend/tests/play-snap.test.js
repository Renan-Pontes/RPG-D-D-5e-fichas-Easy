import test from 'node:test';
import assert from 'node:assert/strict';
import { snapDelta } from '../src/sheet/play-snap.js';
const R = (top, h) => ({ top, bottom: top + h });
test('encaixa no topo do painel mais próximo', () => {
  assert.equal(snapDelta([R(-300, 400), R(112, 300)], 800), 100);
  assert.equal(snapDelta([R(-50, 400), R(362, 300)], 800), -62);
});
test('não prende dentro de painel mais alto que a tela', () => {
  assert.equal(snapDelta([R(-200, 1400)], 800), 0);
});
test('perto do fim de painel alto encaixa o fim ou o próximo', () => {
  assert.equal(snapDelta([R(-700, 1400), R(716, 300)], 800), -88);
  assert.equal(snapDelta([R(12, 300)], 800), 0);   // já encaixado
});
