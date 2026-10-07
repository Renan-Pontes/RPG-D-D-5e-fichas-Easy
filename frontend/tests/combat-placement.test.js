import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freePositions, occupiedCells } from '../src/combat/placement.js';

test('monstros novos nascem em células livres, sem empilhar', () => {
  const first = freePositions([], 2, { grid: 50 });
  assert.deepEqual(first, [{ x: 125, y: 125 }, { x: 175, y: 125 }]);
  const existing = first.map((position, i) => ({ id: i, position, token_scale: 1 }));
  const next = freePositions(existing, 1, { grid: 50 });
  assert.deepEqual(next, [{ x: 225, y: 125 }]);
  // posição antiga fixa (100,100) também conta como ocupada
  const old = [{ position: { x: 100, y: 100 }, token_scale: 1 }];
  assert.ok(occupiedCells(old, 50).has('1,1'));
  const p = freePositions(old, 1, { grid: 50 })[0];
  assert.notDeepEqual(p, { x: 100, y: 100 });
});

test('token grande precisa de bloco livre; mapa cheio volta ao início', () => {
  const big = freePositions([{ position: { x: 125, y: 125 }, token_scale: 1 }], 1, { grid: 50, scale: 2 })[0];
  assert.deepEqual(big, { x: 200, y: 150 });
  const full = [];
  for (let c = 0; c < 4; c++) for (let r = 0; r < 2; r++) full.push({ position: { x: c * 50 + 25, y: r * 50 + 25 } });
  assert.deepEqual(freePositions(full, 1, { grid: 50, width: 200, height: 100, start: { x: 0, y: 0 } }), [{ x: 0, y: 0 }]);
});
