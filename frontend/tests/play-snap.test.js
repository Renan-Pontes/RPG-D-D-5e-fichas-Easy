import test from 'node:test';
import assert from 'node:assert/strict';
import { flickDir, flickDelta } from '../src/sheet/play-snap.js';
const R = (top, h) => ({ top, bottom: top + h });
test('arrasto lento não encaixa; arremesso sim', () => {
  assert.equal(flickDir([{ y: 500, t: 0 }, { y: 480, t: 100 }, { y: 460, t: 200 }]), 0);
  assert.equal(flickDir([{ y: 500, t: 0 }, { y: 430, t: 50 }, { y: 360, t: 90 }]), 1);
  assert.equal(flickDir([{ y: 300, t: 0 }, { y: 400, t: 60 }]), -1);
});
test('arremesso leva ao próximo/anterior painel', () => {
  assert.equal(flickDelta([R(12, 300), R(332, 300)], 800, 1), 320);
  assert.equal(flickDelta([R(-400, 300), R(-80, 300)], 800, -1), -92);
});
test('painel alto anda uma tela, sem pular conteúdo', () => {
  assert.equal(flickDelta([R(12, 3000), R(3032, 300)], 800, 1), 680);
});
