import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMonster, monsterForCombat } from '../data/bestiary.js';
import {
  makeNode, makeEdge, addNode, addEdge, removeNode, updateEdge, reverseEdge, emptyData,
  pathsFrom, availableTargets, reachableFrom, startNode, listOrder, validateAdventure,
  encounterEntry, nodeEncounter, encounterCombatants, partyLevels, treasureSummary, addCoins,
  exportAdventure, parseAdventureImport, fitView, borderPoint, nodeAt, freeSpot, NODE_W, NODE_H,
} from '../src/prep/prep-graph.js';

// Entrada — porta → Corredor — trancada → Cripta ; Corredor — secreta → Tesouro ;
// Cripta — só ida → Saída ; Saída ↗ outra aventura
function dungeon() {
  let d = emptyData();
  for (const [id, name, x] of [['a', 'Entrada', 0], ['b', 'Corredor', 250], ['c', 'Cripta', 500], ['d', 'Tesouro', 250], ['e', 'Saída', 750]]) {
    d = addNode(d, makeNode({ id, name, x, y: id === 'd' ? 200 : 0 }));
  }
  const edges = [
    { ...makeEdge('a', 'b', 'door'), id: 'ab' },
    { ...makeEdge('b', 'c', 'locked'), id: 'bc', condition: 'precisa da chave' },
    { ...makeEdge('b', 'd', 'secret'), id: 'bd' },
    { ...makeEdge('c', 'e', 'path'), id: 'ce', oneWay: true },
    { ...makeEdge('e', null, 'adventure'), id: 'ex', toAdventureId: 7, toAdventureName: 'Parte 2' },
  ];
  for (const e of edges) d = addEdge(d, e).data;
  return d;
}

test('caminhos a partir do nó atual respeitam trancas, segredos e sentido único', () => {
  const d = dungeon();
  const play = { current: 'b', visited: ['a', 'b'], unlocked: [] };
  const paths = pathsFrom(d, play, 'b');
  const byTarget = Object.fromEntries(paths.map(p => [p.targetId, p.status]));
  assert.deepEqual(byTarget, { a: 'open', c: 'locked', d: 'secret' });
  assert.equal(paths[0].status, 'open'); // abertos primeiro
  assert.equal(paths.find(p => p.targetId === 'a').visited, true);
  assert.deepEqual([...availableTargets(d, play)], ['a']);

  const unlocked = { ...play, unlocked: ['bc'] };
  assert.deepEqual([...availableTargets(d, unlocked)].sort(), ['a', 'c']);
  assert.equal(pathsFrom(d, unlocked, 'b').find(p => p.targetId === 'c').unlocked, true);

  // sentido único: da Cripta vai à Saída, mas da Saída não volta
  assert.ok(pathsFrom(d, play, 'c').some(p => p.targetId === 'e'));
  const fromExit = pathsFrom(d, play, 'e');
  assert.equal(fromExit.some(p => p.targetId === 'c'), false);
  assert.equal(fromExit[0].status, 'external');
  assert.equal(fromExit[0].edge.toAdventureName, 'Parte 2');

  assert.deepEqual(pathsFrom(d, play, null), []);
});

test('alcance com e sem trancas; nó inicial e ordem da lista', () => {
  const d = dungeon();
  assert.deepEqual([...reachableFrom(d, 'a', { unlocked: [] })].sort(), ['a', 'b']);
  assert.deepEqual([...reachableFrom(d, 'a', null, { ignoreGates: true })].sort(), ['a', 'b', 'c', 'd', 'e']);
  assert.equal(startNode(d).id, 'a');
  const tagged = { ...d, nodes: d.nodes.map(n => (n.id === 'c' ? { ...n, tags: ['início'] } : n)) };
  assert.equal(startNode(tagged).id, 'c');
  assert.deepEqual(listOrder(d).map(n => n.id), ['a', 'b', 'c', 'd', 'e']);
  // nó solto entra no fim
  const loose = addNode(d, makeNode({ id: 'z', name: 'Solto' }));
  assert.equal(listOrder(loose).at(-1).id, 'z');
});

test('edição: sem laço, sem par duplicado, remover nó leva as conexões', () => {
  let d = dungeon();
  assert.equal(addEdge(d, makeEdge('a', 'a')).edge, null);
  assert.equal(addEdge(d, makeEdge('b', 'a')).edge, null); // par já existe (no outro sentido)
  assert.equal(addEdge(d, makeEdge('a', 'zz')).edge, null);
  assert.ok(addEdge(d, makeEdge('a', 'd', 'path')).edge);
  d = removeNode(d, 'b');
  assert.deepEqual(d.edges.map(e => e.id).sort(), ['ce', 'ex']);
  d = reverseEdge(d, 'ce');
  assert.equal(d.edges.find(e => e.id === 'ce').from, 'e');
  d = updateEdge(d, 'ce', { label: 'Túnel' });
  assert.equal(d.edges.find(e => e.id === 'ce').label, 'Túnel');
});

test('validação aponta problemas sem inventar erro', () => {
  const d = dungeon();
  const issues = validateAdventure(d);
  assert.equal(issues.filter(i => i.level === 'error').length, 0);
  assert.equal(issues.some(i => i.code === 'locked_no_condition'), false);

  const bad = {
    ...d,
    nodes: [...d.nodes, makeNode({ id: 'z', name: '' }), makeNode({ id: 'a', name: 'Dup' })],
    edges: [...d.edges, { ...makeEdge('a', 'nope'), id: 'x1' }, { ...makeEdge('a', 'c', 'locked'), id: 'x2' },
      { ...makeEdge('d', null, 'adventure'), id: 'x3' }],
  };
  const codes = validateAdventure(bad).map(i => i.code);
  for (const c of ['duplicate_node', 'unnamed', 'dangling_edge', 'locked_no_condition', 'adventure_no_target', 'isolated']) {
    assert.ok(codes.includes(c), c);
  }
});

test('nó inalcançável é avisado', () => {
  let d = dungeon();
  d = addNode(d, makeNode({ id: 'y', name: 'Ilha' }));
  d = addNode(d, makeNode({ id: 'w', name: 'Ilha 2' }));
  d = addEdge(d, { ...makeEdge('y', 'w'), id: 'yw' }).data;
  const un = validateAdventure(d).filter(i => i.code === 'unreachable').map(i => i.nodeId).sort();
  assert.deepEqual(un, ['w', 'y']);
});

test('dificuldade prevista do encontro do nó contra a mesa (SRD 5.2.1)', () => {
  const goblin = findMonster('goblin-warrior'); // ND 1/4 = 50 XP
  const ogre = findMonster('ogre');             // ND 2 = 450 XP
  const lookup = (id) => findMonster(id);
  const node = makeNode({ encounter: [encounterEntry(goblin, 4), encounterEntry(ogre, 1)] });
  assert.equal(node.encounter[0].name, 'Goblin Guerreiro');
  assert.equal(node.encounter[0].crNum, 0.25);
  const four1 = nodeEncounter(node, [1, 1, 1, 1], lookup);
  assert.equal(four1.totalXp, 4 * 50 + 450);
  assert.equal(four1.monsters, 5);
  assert.equal(four1.rating, 'extreme'); // alta p/ 4×nv1 = 400
  const four5 = nodeEncounter(node, [5, 5, 5, 5], lookup);
  assert.equal(four5.rating, 'low'); // 650 ≤ 2000
  assert.equal(nodeEncounter(makeNode(), [3, 3], lookup).rating, 'none');

  // sem catálogo: usa o ND salvo; monstro do mestre sem ND é estimado
  const saved = nodeEncounter({ encounter: [{ monsterId: 'sumiu', name: 'X', crNum: 1, count: 2 }] }, [1], () => null);
  assert.equal(saved.totalXp, 400);
  const custom = { ...goblin, id: 'meu-1', custom: true, cr: undefined, crNum: undefined };
  const est = nodeEncounter({ encounter: [encounterEntry(custom, 1)] }, [1], () => null);
  assert.equal(est.estimated, true);
  assert.ok(est.totalXp > 0);
});

test('níveis da mesa vêm dos jogadores com ficha', () => {
  const campaign = { members: [
    { role: 'dm', character: null },
    { role: 'player', character: { data: { level: 3 } } },
    { role: 'player', character: { summary: { level: 5 } } },
    { role: 'player', character: null },
  ] };
  assert.deepEqual(partyLevels(campaign), [3, 5]);
});

test('combatentes do encontro: nomes numerados, snapshot de combate', () => {
  const node = makeNode({ encounter: [encounterEntry(findMonster('goblin-warrior'), 2), encounterEntry(findMonster('ogre'), 1)] });
  const bodies = encounterCombatants(node, {
    resolve: (e) => findMonster(e.monsterId) || e.snapshot, toCombat: monsterForCombat, lang: 'pt', rng: () => 0.5,
  });
  assert.equal(bodies.length, 3);
  assert.deepEqual(bodies.map(b => b.monster.name), ['Goblin Guerreiro #1', 'Goblin Guerreiro #2', 'Ogro']);
  assert.ok(bodies.every(b => b.type === 'monster' && b.monster.combatReady));
  assert.equal(bodies[2].tokenScale, 2); // Large
  assert.equal(bodies[0].initiative, 11 + 2); // d20=11, +2 do goblin
});

test('tesouro: resumo e soma de moedas', () => {
  const tr = { items: [{ name: 'Poção de Cura', qty: 2 }, { name: 'Adaga', qty: 1 }], coins: { gp: 30, sp: 5 } };
  assert.equal(treasureSummary(tr, 'pt'), 'Poção de Cura ×2, Adaga, 30 po, 5 pp');
  assert.deepEqual(addCoins({ gp: 10, cp: 3 }, { gp: 30, pp: 1 }), { pp: 1, gp: 40, cp: 3 });
});

test('exportar/importar mantém a estrutura e rejeita lixo', () => {
  const d = dungeon();
  const out = exportAdventure({ name: 'A Cripta', summary: 's', data: d, play: { current: 'a' } });
  assert.equal(out.format, 'forja-adventure');
  assert.equal('play' in out, false);
  const back = parseAdventureImport(JSON.stringify(out));
  assert.equal(back.name, 'A Cripta');
  assert.equal(back.data.nodes.length, 5);
  assert.equal(back.data.edges.find(e => e.id === 'ex').toAdventureId, null); // id de outra campanha não vale
  assert.equal(back.data.edges.find(e => e.id === 'ex').toAdventureName, 'Parte 2');
  assert.throws(() => parseAdventureImport('{'), /invalid_json/);
  assert.throws(() => parseAdventureImport('{"foo":1}'), /not_adventure/);
  const broken = { ...out, data: { nodes: d.nodes, edges: [{ id: 'q', from: 'a', to: 'zz', kind: 'door' }] } };
  assert.throws(() => parseAdventureImport(JSON.stringify(broken)), /invalid_structure/);
});

test('geometria: enquadrar, borda do nó, acerto e posição livre', () => {
  const nodes = [makeNode({ x: 0, y: 0 }), makeNode({ x: 400, y: 300 })];
  const v = fitView(nodes, 800, 600);
  assert.ok(v.k > 0.25 && v.k <= 1.25);
  const n = nodes[0];
  const p = borderPoint(n, 1000, n.y + NODE_H / 2);
  assert.equal(p.x, n.x + NODE_W);
  assert.equal(nodeAt({ nodes }, 10, 10), n);
  assert.equal(nodeAt({ nodes }, -10, -10), null);
  const spot = freeSpot({ nodes }, 0, 0);
  assert.ok(!(spot.x === 0 && spot.y === 0));
});
