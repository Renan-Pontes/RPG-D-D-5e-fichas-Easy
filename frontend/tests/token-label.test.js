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

// Onda 3 (E2.4): na TV o nome mede em px de tela (≥ 14 px numa TV 1280×720).
test('tvLabelSize: 15 px de tela em unidades do mapa, para a escala do canvas', async () => {
  const { tvLabelSize, TV_LABEL_PX } = await import('../src/campaigns/token-label.js');
  assert.equal(TV_LABEL_PX >= 14, true);
  // canvas 1200×800 cabendo em 852×600 (o mapa do combate numa TV 1280×720): escala 0,71
  const k = 852 / 1200;
  const s = tvLabelSize(k);
  assert.ok(Math.abs(s.font * k - TV_LABEL_PX) < 1e-9, 'na tela, 15 px');
  assert.ok(s.rowTolerance > s.font && s.gap > 0);
  assert.deepEqual(tvLabelSize(0), tvLabelSize(1), 'escala desconhecida: 1');
});
