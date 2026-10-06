import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshReveals, revealKey } from '../src/player/reveal-toast-model.js';

const e = (id, at, name = `E${id}`) => ({ id, name, revealedAt: at });

test('revelar um segredo de um cartão já avisado gera toast de novo (#17)', () => {
  const toasted = new Set();
  const first = freshReveals([e(81, '2026-10-06T20:00:00Z')], '2026-10-06T19:00:00Z', 1, toasted);
  assert.deepEqual(first.map(x => x.id), [81]);
  first.forEach(x => toasted.add(revealKey(x)));
  // mesma revelação de novo (poll repetido): nada
  assert.deepEqual(freshReveals([e(81, '2026-10-06T20:00:00Z')], '2026-10-06T19:00:00Z', 1, toasted), []);
  // o segredo s1 foi revelado: o servidor renova revealedAt → toast novo
  const again = freshReveals([e(81, '2026-10-06T20:05:00Z')], '2026-10-06T19:00:00Z', 1, toasted);
  assert.deepEqual(again.map(x => x.id), [81]);
});

test('filtra antes de cortar: duas revelações na mesma janela não somem', () => {
  const toasted = new Set([revealKey(e(1, '2026-10-06T20:10:00Z'))]);
  const list = [e(1, '2026-10-06T20:10:00Z'), e(2, '2026-10-06T20:09:00Z'), e(3, '2026-10-06T18:00:00Z')];
  assert.deepEqual(freshReveals(list, '2026-10-06T19:00:00Z', 1, toasted).map(x => x.id), [2]);
});

test('telão cobre só o que foi revelado até o instante do telão', () => {
  const shown = new Map([[7, '2026-10-06T20:01:00Z']]);
  const seen = '2026-10-06T19:00:00Z';
  assert.deepEqual(freshReveals([e(7, '2026-10-06T20:00:30Z')], seen, 1, new Set(), shown), []);
  assert.deepEqual(freshReveals([e(7, '2026-10-06T20:02:00Z')], seen, 1, new Set(), shown).map(x => x.id), [7]);
});

test('sem aumento no contador, sem toast', () => {
  assert.deepEqual(freshReveals([e(1, '2026-10-06T20:00:00Z')], null, 0), []);
});
