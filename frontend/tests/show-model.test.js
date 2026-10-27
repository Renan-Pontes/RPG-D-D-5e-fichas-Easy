import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageRows, sceneRows, mapRows, planSceneName } from '../src/stage/show-model.js';

const entries = [
  { id: 1, name: 'Vale de Brumafria', kind: 'place', visibility: 'revealed', imageVer: 'a', isMap: true },
  { id: 2, name: 'Borin Pé-de-Malte', kind: 'npc', visibility: 'revealed', imageVer: '' },
  { id: 12, name: 'Cripta sob a capela', kind: 'place', visibility: 'hidden', imageVer: 'c' },
  { id: 4, name: 'Morvane', kind: 'npc', visibility: 'hidden', imageVer: '' },
];
const adventure = { id: 7, name: 'O Sino Afogado', data: { nodes: [
  { id: 'n1', name: 'Taverna', image: 'data:image/png;base64,x', refs: [2, 12] },
  { id: 'n2', name: 'Ponte velha', image: 'data:image/png;base64,y' },
  { id: 'n3', name: 'Lago' },
] } };

test('Imagens: da cena agora primeiro, depois todos (ocultos também) e as outras salas', () => {
  const r = imageRows({ entries, adventure, node: adventure.data.nodes[0] });
  assert.deepEqual(r.now.map(x => x.key), ['room-n1', 'e-2', 'e-12']);
  assert.deepEqual(r.all.map(x => x.key), ['e-1', 'e-4', 'room-n2']);
  assert.equal(r.more, 0);
});

test('Imagens: busca sem acento e limite com "mais"', () => {
  assert.deepEqual(imageRows({ entries, adventure, query: 'cripta' }).all.map(x => x.key), ['e-12']);
  assert.deepEqual(imageRows({ entries, query: 'PE-DE' }).all.map(x => x.key), ['e-2']);
  const many = Array.from({ length: 70 }, (_, i) => ({ id: 100 + i, name: `C${i}`, visibility: 'revealed' }));
  const r = imageRows({ entries: many, limit: 60 });
  assert.equal(r.all.length, 60);
  assert.equal(r.more, 10);
});

test('Cenas: a sala em jogo primeiro, sem repetir a mesma sala do plano', () => {
  const plan = { scenes: [
    { id: 'c1', text: 'Briga na taverna\nos pescadores', nodeRef: { adventureId: 7, nodeId: 'n1' }, done: true },
    { id: 'c2', text: 'Descer até o lago', nodeRef: null, done: false },
    { id: 'c3', text: '   ', done: false },
  ] };
  const rows = sceneRows({ plan, adventure, node: adventure.data.nodes[0] });
  assert.deepEqual(rows.map(x => x.key), ['room-n1', 'plan-c2']);
  assert.deepEqual(rows[0].target, { kind: 'scene', advId: 7, nodeId: 'n1' });
  assert.deepEqual(rows[1].target, { kind: 'scene', sceneId: 'c2' });
  assert.equal(sceneRows({ plan }).length, 2);
  assert.equal(planSceneName({ text: 'Emboscada\nGoblins' }), 'Emboscada');
});

test('Mapa: só lugares com mapa e imagem', () => {
  assert.deepEqual(mapRows(entries).map(x => x.key), ['map-1']);
});
