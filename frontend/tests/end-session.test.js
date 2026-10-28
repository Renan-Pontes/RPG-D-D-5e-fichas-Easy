// A folha "Encerrar a Sessão N" (V12): as caixas, o que "Levar" leva, os momentos e o corpo do POST.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carryCounts, carryText, combatLine, endBody, endRows, endTitle, initialChecks, momentChips, oldServerSteps } from '../src/play/end-session.js';

const plan = {
  forSession: 4,
  strongStart: 'O sino toca',
  scenes: [
    { id: 'c1', text: 'Taverna', done: true }, { id: 'c2', text: 'Ponte velha', done: false },
    { id: 'c3', text: '', nodeRef: null, done: false },
  ],
  secrets: [
    { id: 'p1', text: 'O padrinho', discovered: true }, { id: 'p2', text: 'O sino', discovered: false },
    { id: 'p3', text: '', ref: { entryId: 8 }, discovered: false }, { id: 'p4', text: '', discovered: false },
  ],
  npcIds: [2, 3, 4], placeIds: [1], monsters: '', rewards: '',
};
const combat = { active: true, round: 3, order: [
  { name: 'Goblin #1', kind: 'monster', defeated: false }, { name: 'Goblin #2', kind: 'monster', defeated: false },
  { name: 'Pipo', kind: 'pc', defeated: false }] };

test('título com a duração e a linha do combate', () => {
  assert.equal(endTitle(4, '2h10', 'pt'), 'Encerrar a Sessão 4 · 2h10');
  assert.equal(endTitle(4, null, 'en'), 'End session 4');
  assert.equal(combatLine(combat, 'pt'), 'rodada 3 · Goblin ×2 de pé');
  assert.equal(combatLine({ ...combat, order: [...combat.order, { name: 'Lobo', kind: 'monster' }] }, 'pt'), 'rodada 3 · 3 monstros de pé');
  assert.equal(combatLine({ ...combat, order: combat.order.map(o => ({ ...o, defeated: o.kind === 'monster' })) }, 'en'), 'round 3 · all monsters are down');
  assert.equal(combatLine({ active: false }), '');
});

test('"Levar para a Sessão 5": as cenas não feitas, as pistas não achadas, pessoas e lugares', () => {
  const c = carryCounts(plan, 4);
  assert.deepEqual(c, { scenes: 1, clues: 2, people: 3, places: 1 });
  assert.equal(carryText(c, 'pt'), '1 cena, 2 pistas, 3 pessoas e 1 lugar');
  assert.equal(carryText({ scenes: 0, clues: 0, people: 0, places: 0 }, 'en'), 'nothing left');
  assert.equal(carryCounts({ ...plan, forSession: 5 }, 4), null, 'o plano já é o da próxima');
  assert.equal(carryCounts({ scenes: [], secrets: [{ id: 'p1', text: '' }], npcIds: [], placeIds: [] }, 4), null, 'nada para arquivar');
  assert.equal(carryCounts(null, 4), null);
});

test('as caixas: combate e testes só quando há; todas marcadas', () => {
  const rows = endRows({ n: 4, combat, openChecks: 1, plan, lang: 'pt' });
  assert.deepEqual(rows.map(r => r.id), ['endCombat', 'clearStage', 'closeChecks', 'carry']);
  assert.equal(rows[2].label, 'Fechar os testes abertos (1)');
  assert.equal(rows[3].label, 'Levar para a Sessão 5');
  assert.match(rows[3].sub, /^1 cena, 2 pistas, 3 pessoas e 1 lugar · o plano de hoje fica guardado na Crônica$/);
  assert.deepEqual(endRows({ n: 4, combat: { active: false }, openChecks: 0, plan: null }).map(r => r.id), ['clearStage']);
  assert.equal(endRows({ n: 4, openChecks: null }).find(r => r.id === 'closeChecks').label, 'Fechar os testes abertos', 'sem o número');
  assert.deepEqual(initialChecks(rows), { endCombat: true, clearStage: true, closeChecks: true, carry: true });
});

test('"Quem teve um momento hoje?": marcado quem tem momento numa cena jogada; o de hoje fica travado', () => {
  const members = [
    { role: 'dm', user: {} },
    { role: 'player', character: { id: 1, name: 'Pipo' } }, { role: 'player', character: { id: 2, name: 'Dagna' } },
    { role: 'player', character: { id: 3, name: 'Kaelor' } }, { role: 'player', character: null },
  ];
  const spotlights = {
    1: [{ id: 'm1', kind: 'shine', text: 'fechadura', done: null, plan: 'c2' }],
    2: [{ id: 'm1', kind: 'push', text: 'o velho', done: null, plan: 'c3' }, { id: 'm2', kind: 'shine', text: 'x', done: null, plan: null }],
    3: [{ id: 'm1', kind: 'hook', text: 'irmão', done: 4, plan: null }],
  };
  const chips = momentChips({ members, spotlights, plan, sceneId: 'c2', n: 4 });
  assert.deepEqual(chips.map(c => [c.charId, c.momentId, c.on, c.locked]), [[1, 'm1', true, false], [2, 'm1', false, false], [3, 'm1', true, true]]);
  const body = endBody({ endCombat: true, clearStage: false, closeChecks: true, carry: true },
    chips.map(c => (c.charId === 2 ? { ...c, on: true, momentId: null } : c)), { n: 4, lang: 'pt' });
  assert.deepEqual(body, { endCombat: true, clearStage: false, closeChecks: true, carry: true,
    moments: [{ charId: 1, id: 'm1' }, { charId: 2, text: 'Teve um momento na Sessão 4' }] });
  // a caixa que não apareceu: sim (o servidor não tem o que fazer), menos "Levar"
  assert.deepEqual(endBody({}, [], { n: 4 }), { endCombat: true, clearStage: true, closeChecks: true, carry: false, moments: [] });
});

test('servidor antigo: só o que as rotas de antes fazem', () => {
  assert.deepEqual(oldServerSteps({ endCombat: true, clearStage: true, closeChecks: true, carry: true }, { combatActive: true }), ['combat', 'checks', 'stage', 'live']);
  assert.deepEqual(oldServerSteps({ endCombat: true, clearStage: false, closeChecks: false }, { combatActive: false }), ['live']);
});
