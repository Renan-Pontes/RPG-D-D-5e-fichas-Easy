// V14: "⋯ › Mover para cima/baixo" no Atlas (sem arrastar) — moveStepPatches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPatches, filterEntries, moveStepPatches, sortEntries } from '../src/world/world-model.js';

const E = (id, sort, kind = 'npc', name = `C${id}`) => ({ id, sort, kind, name });
const order = (list) => sortEntries(list).map(e => e.id);

test('sobe e desce uma casa entre os cartões à vista, com o mínimo de PATCH', () => {
  const list = [E(1, 10), E(2, 20), E(3, 30), E(4, 40)];
  const sorted = sortEntries(list);
  // sobe o 3: cabe entre o 1 e o 2 → 1 PATCH
  const up = moveStepPatches(sorted, sorted, 3, -1);
  assert.equal(up.length, 1);
  assert.deepEqual(order(applyPatches(list, up)), [1, 3, 2, 4]);
  // desce o 1: passa o 2
  const down = moveStepPatches(sorted, sorted, 1, 1);
  assert.deepEqual(order(applyPatches(list, down)), [2, 1, 3, 4]);
  // no topo e no fim: nada
  assert.deepEqual(moveStepPatches(sorted, sorted, 1, -1), []);
  assert.deepEqual(moveStepPatches(sorted, sorted, 4, 1), []);
  // id fora da vista: nada
  assert.deepEqual(moveStepPatches(sorted, sorted, 99, 1), []);
});

test('com filtro, passa o vizinho VISÍVEL (o arrastar faz o mesmo)', () => {
  const list = [E(1, 10, 'npc'), E(2, 20, 'place'), E(3, 30, 'npc'), E(4, 40, 'place'), E(5, 50, 'npc')];
  const sorted = sortEntries(list);
  const shown = filterEntries(sorted, { kind: 'npc' });       // 1, 3, 5
  const p = moveStepPatches(sorted, shown, 5, -1);            // o 5 passa o 3
  const next = filterEntries(sortEntries(applyPatches(list, p)), { kind: 'npc' }).map(e => e.id);
  assert.deepEqual(next, [1, 5, 3]);
});

test('sem espaço entre os vizinhos: troca os dois valores (2 PATCH), não renumera tudo', () => {
  const list = [E(1, 1), E(2, 2), E(3, 3), E(4, 4), E(5, 5), E(6, 6)];
  const sorted = sortEntries(list);
  const p = moveStepPatches(sorted, sorted, 4, -1);
  assert.equal(p.length, 2);
  assert.deepEqual(order(applyPatches(list, p)), [1, 2, 4, 3, 5, 6]);
});

test('sort repetido: renumera, para a ordem à vista sair a esperada', () => {
  const list = [E(1, 10, 'npc', 'A'), E(2, 10, 'npc', 'B'), E(3, 10, 'npc', 'C')];
  const sorted = sortEntries(list);                            // A, B, C (desempate por nome)
  const p = moveStepPatches(sorted, sorted, 3, -1);
  assert.deepEqual(order(applyPatches(list, p)), [1, 3, 2]);
});
