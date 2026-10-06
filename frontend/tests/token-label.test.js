import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelWidths, tokenLabel } from '../src/campaigns/token-label.js';

const measure = (s) => s.length * 6; // 6px por letra

test('#42: nome longo vira "Goblin #2" quando o vizinho está perto', () => {
  const w = labelWidths([{ id: 'a', x: 100, y: 100, size: 40 }, { id: 'b', x: 160, y: 100, size: 40 }]);
  assert.equal(w.get('a'), 54);
  assert.equal(tokenLabel('Goblin Guerreiro #2', w.get('b'), measure), 'Goblin #2');
  assert.equal(tokenLabel('Goblin Guerreiro #2', 200, measure), 'Goblin Guerreiro #2');
  assert.equal(tokenLabel('Goblin Guerreiro #2', 40, measure), 'Go… #2');
  assert.equal(tokenLabel('Borin', 40, measure), 'Borin');
});

test('token sozinho ou em outra linha tem espaço folgado', () => {
  const w = labelWidths([{ id: 'a', x: 100, y: 100, size: 40 }, { id: 'b', x: 120, y: 200, size: 40 }]);
  assert.equal(w.get('a'), 120);
});
