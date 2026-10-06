import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextScene, playPlanView, sceneFieldText } from '../src/play/plan-model.js';
import { toggleDiscovered, normalizePlan } from '../src/prep/next-session.js';

const PLAN = {
  strongStart: '  O sino da Malte Dourado toca e dois goblins entram.  ',
  scenes: [
    { id: 'c1', text: 'Briga na taverna', nodeRef: { adventureId: 3, nodeId: 'n1' }, done: true },
    { id: 'c2', text: 'Perseguição na ponte\nchuva forte', nodeRef: null, done: false },
    { id: 'c3', text: '', nodeRef: null, done: false },
  ],
  secrets: [
    { id: 'p1', text: 'O taverneiro deve ao chefe goblin', ref: { entryId: 7, secretId: 's1' }, discovered: false },
    { id: 'p2', text: '', ref: null, discovered: false },
  ],
  npcIds: [7, 99], placeIds: [], monsters: 'goblins ×2', rewards: '',
};

test('#26: Jogar mostra começo forte, cenas preenchidas e pistas (sem linhas vazias)', () => {
  const v = playPlanView(PLAN, {
    entries: [{ id: 7, name: 'Borin, o taverneiro', kind: 'npc' }],
    nodeName: (a, n) => (a === 3 && n === 'n1' ? 'Taverna Malte Dourado' : null),
  });
  assert.equal(v.strongStart, 'O sino da Malte Dourado toca e dois goblins entram.');
  assert.deepEqual(v.scenes.map(s => s.id), ['c1', 'c2']);
  assert.equal(v.scenes[0].room, 'Taverna Malte Dourado');
  assert.deepEqual(v.clues, [{ id: 'p1', text: 'O taverneiro deve ao chefe goblin', discovered: false, entryName: 'Borin, o taverneiro', linked: true }]);
  assert.deepEqual(v.npcs.map(n => n.name), ['Borin, o taverneiro']);
  assert.equal(v.monsters, 'goblins ×2');
  assert.equal(v.hasContent, true);
  assert.deepEqual(v.progress, { scenesDone: 1, scenes: 2, cluesFound: 0, clues: 1 });
  assert.equal(nextScene(v).id, 'c2');
  assert.equal(sceneFieldText(nextScene(v)), 'Perseguição na ponte');
  assert.equal(sceneFieldText(v.scenes[0]), 'Taverna Malte Dourado');
});

test('plano vazio não tem conteúdo; marcar pista só PERGUNTA sobre revelar', () => {
  assert.equal(playPlanView(null).hasContent, false);
  const { plan, ask } = toggleDiscovered(normalizePlan(PLAN), 'p1');
  assert.equal(plan.secrets[0].discovered, true);
  assert.deepEqual(ask, { secretItemId: 'p1', entryId: 7, secretId: 's1' });
});
