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

test('folha de decisão: "Guardar para depois do combate" nunca revela', async () => {
  const { decideActions } = await import('../src/stage/show-model.js');
  for (const mode of ['show', 'image', 'name']) {
    for (const fighting of [false, true]) {
      for (const keep of [false, true]) {
        const r = decideActions(mode, { fighting, keep });
        const k = r.buttons.find(b => b.id === 'keep');
        if (k) assert.notEqual(k.op, 'reveal', `${mode} ${fighting} ${keep}`);
        // só os botões com nome de revelar chamam o reveal
        for (const b of r.buttons.filter(x => x.op === 'reveal')) assert.ok(['name', 'reveal'].includes(b.id));
      }
    }
  }
  // oculto sem imagem no combate: não há link solto; a caixa só muda o "quando"
  const name = decideActions('name', { fighting: true });
  assert.equal(name.keep, 'toggle');
  assert.equal(name.buttons.some(b => b.id === 'keep'), false);
  assert.deepEqual(name.buttons.map(b => [b.id, b.focus]), [['name', true], ['reveal', true]]);
  const kept = decideActions('name', { fighting: true, keep: true });
  assert.deepEqual(kept.buttons.map(b => [b.id, b.op, b.visibility, b.focus]),
    [['name', 'reveal', 'partial', false], ['reveal', 'reveal', 'revealed', false]]);
  // oculto com imagem: "só a imagem" guardada continua sem revelar
  const img = decideActions('image', { fighting: true, keep: true });
  assert.deepEqual(img.buttons[0], { id: 'image', op: 'image', focus: false, primary: true });
  // revelado no combate: mostrar por cima ou o link "Guardar" (mostra sem foco)
  const show = decideActions('show', { fighting: true });
  assert.equal(show.keep, 'link');
  assert.deepEqual(show.buttons.map(b => [b.id, b.op, b.focus]), [['show', 'show', true], ['keep', 'show', false]]);
  // fora do combate a caixa não existe e nada fica guardado
  const calm = decideActions('name', { fighting: false, keep: true });
  assert.equal(calm.keep, null);
  assert.equal(calm.buttons.every(b => b.focus), true);
});

// V7: a cena agora do plano abre o "Da cena agora" e as Cenas
import { imageRows as imgRowsV7, sceneRows as sceneRowsV7 } from '../src/stage/show-model.js';
test('a cena agora do plano vem primeiro nas Imagens e nas Cenas', () => {
  const entries = [{ id: 1, name: 'Vale', imageVer: 'v' }, { id: 3, name: 'Irmã Velna' }, { id: 9, name: 'Lâmina', imageVer: 'x' }];
  const r = imgRowsV7({ entries, sceneRefs: [1, 3] });
  assert.deepEqual(r.now.map(x => x.name), ['Vale', 'Irmã Velna']);
  assert.ok(!r.all.some(x => x.name === 'Vale'));
  const plan = { scenes: [{ id: 'c1', text: 'Taverna' }, { id: 'c2', text: 'Ponte', nodeRef: { adventureId: 1, nodeId: 'n2' } }] };
  const rows = sceneRowsV7({ plan, adventure: { id: 1, name: 'A' }, node: { id: 'n2', name: 'Sala' }, nowSceneId: 'c2' });
  assert.deepEqual(rows.map(x => [x.name, !!x.now]), [['Ponte', true], ['Taverna', false]]);
  assert.deepEqual(rows[0].target, { kind: 'scene', sceneId: 'c2' });
});

import { roomIsNow } from '../src/stage/show-model.js';
test('"Da cena agora": a sala em jogo só conta quando ela é a cena agora (a solta do plano não traz a sala)', () => {
  const node = adventure.data.nodes[0];
  // sem cena do plano agora: a sala em jogo é a cena agora (como antes)
  assert.equal(roomIsNow(null, adventure, node), true);
  // cena solta agora (imagem dela: o cartão 1): a sala marcada e os cartões dela vão para Todas
  const loose = { id: 'c9', refs: [], show: { kind: 'entry', id: 1 }, nodeRef: null };
  assert.equal(roomIsNow(loose, adventure, node), false);
  const r = imageRows({ entries, adventure, node, sceneRefs: [1], roomNow: roomIsNow(loose, adventure, node) });
  assert.deepEqual(r.now.map(x => x.key), ['e-1']);
  assert.deepEqual(r.all.map(x => x.key), ['e-12', 'e-2', 'e-4', 'room-n1', 'room-n2']);
  // cena ligada a essa mesma sala: a sala continua sendo a cena agora; ligada a outra, não
  assert.equal(roomIsNow({ id: 'c2', nodeRef: { adventureId: 7, nodeId: 'n1' } }, adventure, node), true);
  assert.equal(roomIsNow({ id: 'c2', nodeRef: { adventureId: 7, nodeId: 'n2' } }, adventure, node), false);
});
