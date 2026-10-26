import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldSwapColumns, SWAP_LIMIT } from '../src/campaigns/table-now-layout.js';

// Alturas medidas na Cena (seed jogo-e-combate): Avisos 220–440, Ações rápidas ~340–360.
test('1280 sem combate: direita 300 px mais comprida → Avisos e Ações trocam de coluna', () => {
  // esquerda (com Avisos 220) 871, direita (com Ações 358) 1175 → depois da troca 1009 × 1037
  assert.equal(shouldSwapColumns({ main: 871, side: 1175, nudges: 220, actions: 358, swapped: false }), true);
  // se os Avisos fossem os maiores, trocar deixaria a esquerda ainda mais curta
  assert.equal(shouldSwapColumns({ main: 871, side: 1175, nudges: 358, actions: 220, swapped: false }), false);
});

test('troca quando a coluna dos Avisos é a curta e as Ações são maiores', () => {
  // esquerda (com Avisos 220) termina 300 antes; Ações (340) à direita → trocar: diferença 300 − 2×120 = 60
  assert.equal(shouldSwapColumns({ main: 870, side: 1170, nudges: 220, actions: 340, swapped: false }), true);
  // 1024 com combate: esquerda (Avisos 440) 300 mais comprida, Ações 358 → 300 − 2×82 = 136
  assert.equal(shouldSwapColumns({ main: 1535, side: 1232, nudges: 440, actions: 358, swapped: false }), true);
});

test('destroca quando o combate volta e a diferença passa do limite do outro lado', () => {
  // trocados (Ações à esquerda, Avisos à direita); a direita ficou 300 mais comprida com Avisos 440
  assert.equal(shouldSwapColumns({ main: 1100, side: 1400, nudges: 440, actions: 340, swapped: true }), true);
  // mesma coisa sem trocar de volta se a esquerda é a comprida
  assert.equal(shouldSwapColumns({ main: 1400, side: 1100, nudges: 440, actions: 340, swapped: true }), false);
});

test('com folga: não troca abaixo do limite nem por ganho pequeno', () => {
  assert.equal(shouldSwapColumns({ main: 1000, side: 1000 + SWAP_LIMIT, nudges: 200, actions: 400, swapped: false }), false);
  // 260 de diferença, troca deixaria 260 − 2×60 = 140: ganho de 120 (≥ 100) → troca
  assert.equal(shouldSwapColumns({ main: 1000, side: 1260, nudges: 280, actions: 340, swapped: false }), true);
  // 260 de diferença, troca deixaria 260 − 2×40 = 180: ganho de 80 → fica
  assert.equal(shouldSwapColumns({ main: 1000, side: 1260, nudges: 300, actions: 340, swapped: false }), false);
  // a troca pode passar do ponto: 260 − 2×200 = −140 (ganho 120) troca; 260 − 2×250 = −240 (ganho 20) fica
  assert.equal(shouldSwapColumns({ main: 1000, side: 1260, nudges: 100, actions: 300, swapped: false }), true);
  assert.equal(shouldSwapColumns({ main: 1000, side: 1260, nudges: 100, actions: 350, swapped: false }), false);
});

test('bloco sem altura (não montado ou celular) não troca', () => {
  assert.equal(shouldSwapColumns({ main: 0, side: 900, nudges: 0, actions: 340, swapped: false }), false);
  assert.equal(shouldSwapColumns({ main: 600, side: 1200, nudges: 200, actions: 0, swapped: false }), false);
  assert.equal(shouldSwapColumns({ main: NaN, side: 1200, nudges: 200, actions: 300, swapped: false }), false);
});
