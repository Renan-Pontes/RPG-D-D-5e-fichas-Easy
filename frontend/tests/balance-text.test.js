import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balanceSplit } from '../src/sheet/balance-text.js';

test('balanceSplit corta no separador mais forte, em metades parecidas', () => {
  assert.deepEqual(balanceSplit('Warlock 8 (The Archfey) · Bard 4 (College of Lore)'), ['Warlock 8 (The Archfey) ·', 'Bard 4 (College of Lore)']);
  assert.deepEqual(balanceSplit('A 1 · B 2 · Cccccccccccc 3'), ['A 1 · B 2 ·', 'Cccccccccccc 3']);
  assert.deepEqual(balanceSplit('Stormwreck Isles - Unhinged Ones'), ['Stormwreck Isles -', 'Unhinged Ones']);
  assert.deepEqual(balanceSplit('Margarida De La Vega'), ['Margarida', 'De La Vega']);
  assert.deepEqual(balanceSplit('Thalion'), ['Thalion']);
});
