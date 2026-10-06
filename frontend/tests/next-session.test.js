import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyPlan, normalizePlan, addScene, addSecret, updateItem, removeItem, moveItem, toggleId, padSecrets,
  toggleDiscovered, revealBodyFor, planDiff, planProgress, carryOver, missingIds, textForRef, nextId,
  SECRET_GOAL, PLAN_LIMITS,
} from '../src/prep/next-session.js';
import { searchEntries, pickEntries, entryImage, kindArt, kindLabel } from '../src/prep/prep-world.js';
import { freeSpotIn, panToShow, makeNode, addNode, emptyData, NODE_W, NODE_H } from '../src/prep/prep-graph.js';

test('normalizePlan completa o plano e descarta lixo', () => {
  assert.deepEqual(normalizePlan(null), emptyPlan());
  const p = normalizePlan({
    strongStart: 'Sino', scenes: [{ text: 'a', nodeRef: { adventureId: '3', nodeId: 'n1' } }, 'x', { id: 'c9', text: 'b', nodeRef: { adventureId: 1 } }],
    secrets: [{ text: 's', ref: { entryId: '5', secretId: 's2' }, discovered: 1 }], npcIds: [5, '9', 5, -1, 'x'], placeIds: 'no', extra: 1,
  });
  assert.equal(p.strongStart, 'Sino');
  assert.deepEqual(p.scenes.map(s => s.id), ['c1', 'c9']);
  assert.deepEqual(p.scenes[0].nodeRef, { adventureId: 3, nodeId: 'n1' });
  assert.equal(p.scenes[1].nodeRef, null, 'ref de sala sem nodeId vira null');
  assert.deepEqual(p.secrets[0].ref, { entryId: 5, secretId: 's2' });
  assert.equal(p.secrets[0].discovered, true);
  assert.deepEqual(p.npcIds, [5, 9]);
  assert.deepEqual(p.placeIds, []);
  assert.equal('extra' in p, false);
});

test('cenas e pistas: adicionar, editar, mover, remover — ids sem colisão', () => {
  let p = emptyPlan();
  p = addScene(p, 'Chegada');
  p = addScene(p, 'Templo');
  p = removeItem(p, 'scenes', 'c1');
  p = addScene(p, 'Fuga');
  assert.deepEqual(p.scenes.map(s => s.id), ['c2', 'c3']);
  p = updateItem(p, 'scenes', 'c3', { done: true });
  assert.equal(p.scenes[1].done, true);
  p = moveItem(p, 'scenes', 'c3', -1);
  assert.deepEqual(p.scenes.map(s => s.text), ['Fuga', 'Templo']);
  assert.equal(moveItem(p, 'scenes', 'c3', -1), p, 'não sai da lista');
  assert.equal(nextId([{ id: 'p1' }, { id: 'p3' }], 'p'), 'p4');
});

test('limites do servidor são respeitados no cliente', () => {
  let p = emptyPlan();
  for (let i = 0; i < 40; i++) p = addSecret(p, `s${i}`);
  assert.equal(p.secrets.length, PLAN_LIMITS.secrets);
  let q = emptyPlan();
  for (let i = 1; i <= 70; i++) q = toggleId(q, 'npcIds', i);
  assert.equal(q.npcIds.length, PLAN_LIMITS.ids);
});

test('padSecrets garante as 10 linhas de pista sem apagar as existentes', () => {
  const p = padSecrets(addSecret(emptyPlan(), 'O taverneiro deve ao culto'));
  assert.equal(p.secrets.length, SECRET_GOAL);
  assert.equal(p.secrets[0].text, 'O taverneiro deve ao culto');
  assert.equal(new Set(p.secrets.map(s => s.id)).size, SECRET_GOAL);
  assert.equal(padSecrets(p), p, 'já completo → mesmo objeto');
});

test('toggleId liga e desliga NPCs/lugares do Mundo', () => {
  let p = toggleId(emptyPlan(), 'npcIds', '5');
  p = toggleId(p, 'npcIds', 9);
  assert.deepEqual(p.npcIds, [5, 9]);
  p = toggleId(p, 'npcIds', 5);
  assert.deepEqual(p.npcIds, [9]);
});

test('descobrir pista ligada só PERGUNTA (nunca revela sozinho)', () => {
  let p = addSecret(emptyPlan(), 'Velna é a irmã do vilão', { entryId: 7, secretId: 's2' });
  p = addSecret(p, 'Pista solta');
  const r1 = toggleDiscovered(p, 'p1');
  assert.equal(r1.plan.secrets[0].discovered, true);
  assert.deepEqual(r1.ask, { secretItemId: 'p1', entryId: 7, secretId: 's2' });
  // desmarcar não pergunta nada (e não esconde nada no Mundo)
  const r2 = toggleDiscovered(r1.plan, 'p1');
  assert.equal(r2.plan.secrets[0].discovered, false);
  assert.equal(r2.ask, null);
  // pista sem ligação: marca e pronto
  const r3 = toggleDiscovered(p, 'p2');
  assert.equal(r3.plan.secrets[1].discovered, true);
  assert.equal(r3.ask, null);
  // id desconhecido
  assert.equal(toggleDiscovered(p, 'zz').plan, p);
});

test('revealBodyFor monta o corpo do /reveal só quando o mestre aceita', () => {
  assert.equal(revealBodyFor(null), null);
  assert.deepEqual(revealBodyFor({ entryId: 7, secretId: 's2' }, { logDiary: false, lang: 'en' }), { secrets: { s2: true }, logDiary: false, lang: 'en' });
  assert.deepEqual(revealBodyFor({ entryId: 7, secretId: null }), { visibility: 'revealed', logDiary: true, lang: 'pt' });
});

test('planDiff manda só as chaves que mudaram', () => {
  const a = padSecrets(emptyPlan());
  const b = { ...updateItem(a, 'secrets', 'p3', { text: 'x' }), strongStart: 'Boom' };
  const d = planDiff(a, b);
  assert.deepEqual(Object.keys(d).sort(), ['secrets', 'strongStart']);
  assert.deepEqual(planDiff(a, a), {});
});

test('planProgress conta os passos prontos (pistas pela meta de 10)', () => {
  let p = padSecrets(emptyPlan());
  assert.equal(planProgress(p).done, 0);
  p = { ...p, strongStart: 'Boom', monsters: '4 goblins' };
  p = toggleId(p, 'npcIds', 1);
  for (let i = 1; i <= 9; i++) p = updateItem(p, 'secrets', `p${i}`, { text: `s${i}` });
  let pr = planProgress(p);
  assert.equal(pr.done, 3);
  assert.equal(pr.steps.find(s => s.id === 'secrets').count, 9);
  p = updateItem(p, 'secrets', 'p10', { ref: { entryId: 3, secretId: null } });
  pr = planProgress(p);
  assert.equal(pr.steps.find(s => s.id === 'secrets').done, true);
  assert.equal(pr.total, 7);
});

test('carryOver leva adiante só as pistas não descobertas, NPCs e lugares', () => {
  let p = { ...emptyPlan(), strongStart: 'x', rewards: 'ouro', npcIds: [1], placeIds: [2] };
  p = addSecret(p, 'achada');
  p = addSecret(p, 'pendente', { entryId: 4, secretId: 's1' });
  p = addSecret(p, '');
  p = updateItem(p, 'secrets', 'p1', { discovered: true });
  p = addScene(p, 'cena');
  const n = carryOver(p);
  assert.equal(n.strongStart, '');
  assert.equal(n.rewards, '');
  assert.deepEqual(n.scenes, []);
  assert.deepEqual(n.secrets.map(s => [s.id, s.text]), [['p1', 'pendente']]);
  assert.deepEqual(n.secrets[0].ref, { entryId: 4, secretId: 's1' });
  assert.deepEqual(n.npcIds, [1]);
  assert.deepEqual(n.placeIds, [2]);
});

test('textForRef preenche a pista vazia com o segredo do cartão', () => {
  assert.equal(textForRef('', { name: 'Velna' }, { text: 'É a irmã do vilão' }), 'É a irmã do vilão');
  assert.equal(textForRef('', { name: 'Velna' }, null), 'Velna');
  assert.equal(textForRef('Minha pista', { name: 'Velna' }, { text: 'x' }), 'Minha pista');
  assert.deepEqual(missingIds([1, 2, 3], [{ id: 2 }]), [1, 3]);
});

test('prep-world: busca sem acento, ids → cartões, arte padrão', () => {
  const entries = [
    { id: 1, kind: 'npc', name: 'Irmã Velna', summary: 'sacerdotisa', tags: ['templo'] },
    { id: 2, kind: 'place', name: 'Vale de Brumafria', summary: '', tags: [] },
    { id: 3, kind: 'npc', name: 'Bram', summary: 'taverneiro', tags: [] },
  ];
  assert.deepEqual(searchEntries(entries, 'irma').map(e => e.id), [1]);
  assert.deepEqual(searchEntries(entries, 'TEMPLO').map(e => e.id), [1]);
  assert.deepEqual(searchEntries(entries, '', ['npc']).map(e => e.id), [3, 1], 'ordenado por nome');
  assert.deepEqual(pickEntries([3, 99, 1], entries).map(e => e.id), [3, 1]);
  assert.equal(entryImage({ id: 1, kind: 'npc', imageUrl: '/api/world/1/image?v=ab' }, 'https://x'), 'https://x/api/world/1/image?v=ab');
  assert.equal(entryImage({ id: 1, kind: 'place' }), kindArt('place'));
  assert.equal(kindLabel('place', 'pt', true), 'Lugares');
  assert.equal(kindLabel('handout', 'en'), 'Handout');
});

test('sala nova nasce inteira dentro da área visível (freeSpotIn)', () => {
  let d = emptyData();
  // centro ocupado e um vizinho à direita: o próximo deve caber na tela
  d = addNode(d, makeNode({ id: 'a', x: 0, y: 0 }));
  d = addNode(d, makeNode({ id: 'b', x: 260, y: 0 }));
  const bounds = { x0: -300, y0: -200, x1: 500, y1: 300 };
  const p = freeSpotIn(d, 0, 0, bounds);
  assert.ok(p.x >= bounds.x0 && p.x + NODE_W <= bounds.x1, `x dentro: ${p.x}`);
  assert.ok(p.y >= bounds.y0 && p.y + NODE_H <= bounds.y1, `y dentro: ${p.y}`);
  for (const n of d.nodes) {
    assert.ok(!(Math.abs(n.x - p.x) < NODE_W && Math.abs(n.y - p.y) < NODE_H), 'não sobrepõe');
  }
  // sem bounds → comportamento antigo
  assert.ok(freeSpotIn(d, 0, 0, null));
});

test('panToShow desliza a tela até a sala ficar visível', () => {
  const view = { x: 0, y: 0, k: 1 };
  assert.equal(panToShow(view, { x: 10, y: 10 }, 800, 500, 0), view, 'já visível → mesma view');
  const v2 = panToShow(view, { x: 700, y: 100 }, 800, 500, 24);
  assert.ok(700 + NODE_W + v2.x <= 800 - 24, 'borda direita visível');
  assert.equal(v2.k, 1);
  const v3 = panToShow({ x: 0, y: 0, k: 0.5 }, { x: -400, y: 900 }, 800, 500, 24);
  assert.ok(-400 * 0.5 + v3.x >= 24);
  assert.ok((900 + NODE_H) * 0.5 + v3.y <= 500 - 24);
});
