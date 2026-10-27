import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyPlan, normalizePlan, addScene, addSecret, updateItem, removeItem, moveItem, toggleId, padSecrets,
  toggleDiscovered, revealBodyFor, planDiff, carryOver, missingIds, textForRef, nextId, freshSceneId,
  planHeading, stepSummary, initialStep, nextStepId, readyChecklist, clueCount, planExport, stateSession,
  planIsBlank, linkedAdventureIds, sceneFights, SECRET_ROWS, PLAN_LIMITS,
} from '../src/prep/next-session.js';
import { searchEntries, pickEntries, entryImage, kindArt, kindLabel } from '../src/prep/prep-world.js';
import { freeSpotIn, panToShow, makeNode, addNode, emptyData, NODE_W, NODE_H } from '../src/prep/prep-graph.js';

test('normalizePlan completa o plano e descarta lixo', () => {
  assert.deepEqual(normalizePlan(null), emptyPlan());
  // os bolsos da cena, o nº da sessão e o _rev voltam como vieram (a folha da Cena os edita)
  const k = normalizePlan({ forSession: 5, _rev: 7, scenes: [{ id: 'c1', text: 'Ponte', read: 'A ponte range.', fight: [{ monsterId: 'goblin', count: 2 }], junk: 1 }] });
  assert.equal(k.forSession, 5);
  assert.equal(k._rev, 7);
  assert.equal(k.scenes[0].read, 'A ponte range.');
  assert.deepEqual(k.scenes[0].fight, [{ monsterId: 'goblin', count: 2 }]);
  assert.equal('junk' in k.scenes[0], false);
  assert.equal(normalizePlan({ forSession: 'x' }).forSession, null);
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
  p = addScene(p, 'Chegada', null, 'c1');
  p = addScene(p, 'Templo', null, 'c2');
  p = removeItem(p, 'scenes', 'c1');
  p = addScene(p, 'Fuga', null, 'c3');
  assert.deepEqual(p.scenes.map(s => s.id), ['c2', 'c3']);
  p = updateItem(p, 'scenes', 'c3', { done: true });
  assert.equal(p.scenes[1].done, true);
  p = moveItem(p, 'scenes', 'c3', -1);
  assert.deepEqual(p.scenes.map(s => s.text), ['Fuga', 'Templo']);
  assert.equal(moveItem(p, 'scenes', 'c3', -1), p, 'não sai da lista');
  assert.equal(nextId([{ id: 'p1' }, { id: 'p3' }], 'p'), 'p4');
});

test('id de cena nova nunca volta (o servidor junta as cenas pelo id)', () => {
  // apagar a c2 e criar outra no mesmo segundo não pode dar "c2" de novo: herdaria os bolsos
  const a = freshSceneId([], 1000, () => 0);
  const b = freshSceneId([{ id: a }], 1000, () => 0);
  assert.notEqual(a, b);
  assert.match(a, /^c[0-9a-z]+$/);
  assert.ok(a.length <= 24, 'cabe no id curto do servidor');
  let p = addScene(emptyPlan(), 'Ponte');
  const first = p.scenes[0].id;
  p = removeItem(p, 'scenes', first);
  p = addScene(p, 'Lago');
  assert.notEqual(p.scenes[0].id, first);
});

test('limites do servidor são respeitados no cliente', () => {
  let p = emptyPlan();
  for (let i = 0; i < 40; i++) p = addSecret(p, `s${i}`);
  assert.equal(p.secrets.length, PLAN_LIMITS.secrets);
  let q = emptyPlan();
  for (let i = 1; i <= 70; i++) q = toggleId(q, 'npcIds', i);
  assert.equal(q.npcIds.length, PLAN_LIMITS.ids);
});

test('padSecrets desenha 3 linhas de pista (só na tela) sem apagar as existentes', () => {
  const p = padSecrets(addSecret(emptyPlan(), 'O taverneiro deve ao culto'));
  assert.equal(p.secrets.length, SECRET_ROWS);
  assert.equal(SECRET_ROWS, 3);
  assert.equal(p.secrets[0].text, 'O taverneiro deve ao culto');
  assert.equal(new Set(p.secrets.map(s => s.id)).size, SECRET_ROWS);
  assert.equal(padSecrets(p), p, 'já completo → mesmo objeto');
  // abrir o Plano e sair não grava nada: as linhas vazias não são diferença
  const saved = normalizePlan({});
  assert.deepEqual(planDiff(saved, padSecrets(saved)), {});
  assert.deepEqual(clueCount(padSecrets(saved)), { total: 0, found: 0 });
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

test('planDiff manda só as chaves que mudaram, sem as pistas vazias', () => {
  const a = padSecrets(emptyPlan());
  const b = { ...updateItem(a, 'secrets', 'p3', { text: 'x' }), strongStart: 'Boom' };
  const d = planDiff(a, b);
  assert.deepEqual(Object.keys(d).sort(), ['secrets', 'strongStart']);
  assert.deepEqual(d.secrets.map(s => s.id), ['p3'], 'só a pista escrita vai');
  assert.deepEqual(planDiff(a, a), {});
  // apagar o texto de uma pista é apagar a pista
  const saved = { ...emptyPlan(), secrets: [{ id: 'p1', text: 'O sino', ref: null, discovered: false }] };
  assert.deepEqual(planDiff(saved, updateItem(saved, 'secrets', 'p1', { text: '' })), { secrets: [] });
  // o nº da sessão vai quando muda, nunca volta a "nenhum"
  assert.deepEqual(planDiff({ ...emptyPlan(), forSession: 5 }, { ...emptyPlan(), forSession: 6 }), { forSession: 6 });
  assert.deepEqual(planDiff({ ...emptyPlan(), forSession: 5 }, emptyPlan()), {});
  // o _rev é do servidor: não é diferença
  assert.deepEqual(planDiff({ ...emptyPlan(), _rev: 3 }, { ...emptyPlan(), _rev: 4 }), {});
});

test('carryOver leva adiante só as pistas não descobertas, NPCs e lugares', () => {
  let p = { ...emptyPlan(), strongStart: 'x', rewards: 'ouro', npcIds: [1], placeIds: [2] };
  p = addSecret(p, 'achada');
  p = addSecret(p, 'pendente', { entryId: 4, secretId: 's1' });
  p = addSecret(p, '');
  p = updateItem(p, 'secrets', 'p1', { discovered: true });
  p = addScene(p, 'cena');
  const n = carryOver(p, 6);
  assert.equal(n.forSession, 6);
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

test('planHeading: de qual sessão é o plano (é hoje ou a próxima?)', () => {
  // ao vivo: o plano de hoje, com a linha sobre a próxima (jogo-e-combate, Sessão 3)
  const live = planHeading(emptyPlan(), { session: '3', live: true }, 'pt');
  assert.equal(live.title, 'Plano de hoje · Sessão 3 (ao vivo)');
  assert.match(live.line, /Sessão 4 começa quando você encerrar esta/);
  assert.equal(live.n, 3);
  assert.equal(planHeading({ ...emptyPlan(), forSession: 3 }, { session: 'Sessão 3', live: true }, 'en').title, "Today's plan · Session 3 (live)");
  // fora: a próxima; o forSession manda
  assert.equal(planHeading(emptyPlan(), {}, 'pt').title, 'Plano da Sessão 1');
  assert.equal(planHeading(emptyPlan(), { session: '4' }, 'pt').title, 'Plano da Sessão 5');
  assert.equal(planHeading({ ...emptyPlan(), forSession: 5 }, { session: '4' }, 'en').title, 'Session 5 plan');
  // plano de uma sessão que já foi: diz e aponta o ⋯
  const stale = planHeading({ ...emptyPlan(), forSession: 4 }, { session: '4' }, 'pt');
  assert.equal(stale.title, 'Plano da Sessão 4');
  assert.equal(stale.stale, true);
  assert.equal(stale.next, 5);
  assert.match(stale.line, /já foi jogada/);
  // preparou a próxima durante a sessão ao vivo
  const ahead = planHeading({ ...emptyPlan(), forSession: 4 }, { session: '3', live: true }, 'pt');
  assert.equal(ahead.title, 'Plano da Sessão 4');
  assert.match(ahead.line, /Sessão 3 está ao vivo/);
  assert.equal(stateSession({ session: 'Sessão 12' }), 12);
  assert.equal(stateSession({ session: null }), null);
});

test('sanfona: resumo de 1 linha por passo, passo que abre e o próximo', () => {
  const party = [{ character: { id: 1 } }, { character: null }];
  let p = emptyPlan();
  assert.equal(stepSummary('party', p, { party, lang: 'pt' }), '1 de 2 com ficha');
  assert.equal(stepSummary('party', p, { party: [party[0]], moments: 3, lang: 'pt' }), '1 com ficha · 3 momentos');
  assert.equal(stepSummary('party', p, { party: [], lang: 'en' }), 'nobody at the table yet');
  assert.equal(stepSummary('start', p, { lang: 'pt' }), 'vazio');
  p = { ...p, strongStart: 'O sino toca embaixo da água à meia-noite' };
  assert.equal(stepSummary('start', p, { lang: 'pt' }), '“O sino toca embaixo da águ…”');
  assert.equal(stepSummary('scenes', p, { lang: 'pt' }), 'nenhuma');
  p = addScene(addScene(p, 'Taverna', null, 'c1'), 'Ponte', null, 'c2');
  p = updateItem(addScene(p, '', null, 'c3'), 'scenes', 'c1', { done: true });
  assert.equal(stepSummary('scenes', p, { lang: 'pt' }), '2 cenas · 1 jogada', 'a cena sem nome não conta');
  p = updateItem(addSecret(addSecret(p, 'a'), 'b'), 'secrets', 'p1', { discovered: true });
  assert.equal(stepSummary('clues', padSecrets(p), { lang: 'pt' }), '2 · 1 achada');
  assert.equal(stepSummary('rewards', p, { lang: 'pt' }), 'vazio');
  assert.equal(stepSummary('rewards', { ...p, monsters: 'goblins' }, { lang: 'pt' }), 'só anotações de monstros');
  assert.equal(stepSummary('rewards', { ...p, rewards: 'Anel do sino, 40 po' }, { lang: 'pt' }), '“Anel do sino, 40 po”');
  // o passo que abre ao entrar segue o cartão; plano vazio → nenhum (as 3 portas); cheio → nenhum
  assert.equal(initialStep(emptyPlan(), 'N2'), null);
  assert.equal(initialStep(emptyPlan(), 'N3'), 'start');
  assert.equal(initialStep(emptyPlan(), 'N4'), 'scenes');
  assert.equal(initialStep(emptyPlan(), 'N6'), 'clues');
  assert.equal(initialStep(p, 'N8'), null, 'plano cheio: o índice dos 5 passos, todos fechados');
  assert.equal(initialStep(p, null), null);
  assert.equal(initialStep(emptyPlan(), null), null);
  assert.equal(nextStepId('scenes'), 'clues');
  assert.equal(nextStepId('rewards'), null);
});

test('Pronto para jogar e Exportar o plano', () => {
  let p = addScene(addScene(emptyPlan(), 'Taverna', null, 'c1'), 'Ponte', null, 'c2');
  p = updateItem(p, 'scenes', 'c2', { show: { kind: 'entry', id: 4 } });
  const rows = readyChecklist(padSecrets(p), { party: [{ character: { id: 1 } }], tv: false, lang: 'pt' });
  assert.deepEqual(rows.map(r => [r.id, r.ok]), [['scenes', true], ['party', true], ['clues', false], ['tv', false]]);
  assert.equal(rows[0].text, '2 cenas, 1 com imagem');
  assert.equal(rows[3].text, 'Tela ainda não testada');
  const out = JSON.parse(planExport({ ...padSecrets(p), _rev: 9, forSession: 5 }, { campaign: 'Mesa' }));
  assert.equal(out.kind, 'forja-session-plan');
  assert.equal(out.session, 5);
  assert.equal('_rev' in out.plan, false);
  assert.deepEqual(out.plan.secrets, [], 'sem as linhas vazias');
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

test('planIsBlank, linkedAdventureIds e sceneFights: o N2 e o N5 sem depender da tela', () => {
  assert.equal(planIsBlank(emptyPlan()), true);
  assert.equal(planIsBlank(null), true);
  assert.equal(planIsBlank(addSecret(emptyPlan(), 'O moleiro mente')), true, 'as pistas não contam');
  assert.equal(planIsBlank({ ...emptyPlan(), strongStart: 'Boom' }), false);
  assert.equal(planIsBlank(addScene(emptyPlan(), '', { adventureId: 3, nodeId: 'n1' }, 'c1')), false, 'cena ligada a uma sala');
  assert.equal(planIsBlank(addScene(emptyPlan(), '  ', null, 'c1')), true, 'linha vazia de cena');

  let p = addScene(emptyPlan(), 'Portão', { adventureId: 9, nodeId: 'n1' }, 'c1');
  p = addScene(p, 'Porão', { adventureId: 9, nodeId: 'n2' }, 'c2');
  p = addScene(p, 'Torre', { adventureId: 4, nodeId: 'n7' }, 'c3');
  p = addScene(p, 'Ponte', null, 'c4');
  p = updateItem(p, 'scenes', 'c3', { done: true });
  assert.deepEqual(linkedAdventureIds(p), [9], 'uma vez por aventura; a cena jogada não pede a dela');
  assert.deepEqual(linkedAdventureIds(null), []);

  p = updateItem(p, 'scenes', 'c4', { fight: [{ monsterId: 'wolf', name: 'Lobo', count: 2 }] });
  const nodes = { 9: [{ id: 'n1', encounter: [] }, { id: 'n2', encounter: [{ monsterId: 'goblin', count: 2 }] }] };
  assert.deepEqual(sceneFights(p, nodes), ['c2', 'c4'], 'o encontro da sala e o bolso ⚔ da cena');
  assert.deepEqual(sceneFights(p, {}), ['c4'], 'sala que ainda não chegou não conta');
  assert.deepEqual(sceneFights(null), []);
});
