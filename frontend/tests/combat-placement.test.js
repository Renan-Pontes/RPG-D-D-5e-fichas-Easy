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

test('encaixe ao soltar: o token fica na casa onde foi solto (nada de uma casa ao lado)', async () => {
  const { snapToGrid } = await import('../src/combat/placement.js');
  // 1 casa: meio da casa sob o centro
  assert.equal(snapToGrid(74, 50), 75);
  assert.equal(snapToGrid(76, 50), 75);
  assert.equal(snapToGrid(99, 50), 75);
  assert.equal(snapToGrid(101, 50), 125);
  assert.equal(snapToGrid(725, 50), 725); // antes: 775
  // 2 casas (Grande): cruzamento das linhas, como no freePositions
  assert.equal(snapToGrid(190, 50, 2), 200);
  assert.equal(snapToGrid(224, 50, 2), 200);
  // Miúdo também vai para o meio da casa
  assert.equal(snapToGrid(60, 50, 0.5), 75);
  // não sai do mapa (1200 de largura)
  assert.equal(snapToGrid(1200, 50, 1, 1200), 1175);
  assert.equal(snapToGrid(-30, 50, 1, 1200), 25);
  assert.equal(snapToGrid(1199, 50, 2, 1200), 1150);
  assert.equal(snapToGrid(5, 50, 3, 1200), 75);
  // casa estranha (55): continua no meio de uma casa inteira dentro do mapa
  const s = snapToGrid(1190, 55, 1, 1200);
  assert.ok(s + 27.5 <= 1200 && (s - 27.5) % 55 === 0, String(s));
});
