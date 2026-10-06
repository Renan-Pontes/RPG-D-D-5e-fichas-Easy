import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBody, critDice, draftFromPreview, evaluateDraft, isAdjusted, resultLine } from '../src/play/attack-model.js';
import { activeScene, sceneEntries, testsBadge, unifyTests } from '../src/play/scene-model.js';

// Prévia como o servidor devolve (AttackPreview, contrato C2).
const PREVIEW = {
  attackerId: 'm1', targetId: 'p1', actionIndex: 0, actionName: 'Cimitarra', attackBonus: 4,
  attackRoll: 12, rolls: [12], total: 16, targetAC: 12, hit: true, crit: false, naturalOne: false,
  damage: [{ dice: '1d6+2', rolled: 6, type: 'slashing', rolls: [4] }], damageTotal: 6,
  effectiveDamage: 6, newHp: 9, note: null, available: true, unavailableReason: null, rigged: false,
};

test('prévia vira rascunho e o resultado bate com o servidor', () => {
  const d = draftFromPreview(PREVIEW);
  const r = evaluateDraft(d);
  assert.equal(r.total, 16);
  assert.equal(r.hit, true);
  assert.equal(r.crit, false);
  assert.equal(r.damageTotal, 6);
  assert.equal(isAdjusted(d), false);
  assert.equal(resultLine(d, { lang: 'pt', damageLabel: () => 'cortante' }), '16 vs CA 12 — acerta, 6 cortante');
});

test('Aplicar manda EXATAMENTE os valores da tela (dado físico: d20 18, dano 7)', () => {
  const d = { ...draftFromPreview(PREVIEW), d20: '18' };
  d.parts = d.parts.map(p => ({ ...p, amount: '7' }));
  assert.equal(isAdjusted(d), true);
  const body = applyBody(d);
  assert.deepEqual(body, {
    attackerId: 'm1', targetId: 'p1', actionIndex: 0, attackRoll: 18, hit: true, crit: false, force: false,
    damage: [{ amount: 7, type: 'slashing' }],
  });
});

test('regras do d20: 20 é crítico, 1 erra sempre, override do mestre manda', () => {
  const base = draftFromPreview(PREVIEW);
  assert.deepEqual(
    (({ hit, crit }) => ({ hit, crit }))(evaluateDraft({ ...base, d20: '20' })), { hit: true, crit: true });
  const one = evaluateDraft({ ...base, d20: '1', bonus: 30 });
  assert.equal(one.hit, false);
  assert.equal(one.natOne, true);
  const miss = { ...base, d20: '5' };            // 5+4 = 9 < 12
  assert.equal(evaluateDraft(miss).hit, false);
  const missBody = applyBody(miss);
  assert.equal(missBody.hit, false);
  assert.deepEqual(missBody.damage, [{ amount: 0, type: 'slashing' }]);
  // O mestre decide que acertou mesmo assim.
  const forced = applyBody({ ...miss, hitOverride: true });
  assert.equal(forced.hit, true);
  assert.deepEqual(forced.damage, [{ amount: 6, type: 'slashing' }]);
});

test('valores inválidos não geram corpo (nada é aplicado)', () => {
  const base = draftFromPreview(PREVIEW);
  assert.equal(applyBody({ ...base, d20: '' }), null);
  assert.equal(applyBody({ ...base, d20: '21' }), null);
  assert.equal(applyBody({ ...base, parts: [{ ...base.parts[0], amount: 'abc' }] }), null);
  assert.equal(applyBody(null), null);
});

test('ação indisponível vai com force; valor preparado só é gasto se o d20 não mudou', () => {
  const tired = draftFromPreview({ ...PREVIEW, available: false, unavailableReason: 'recharging' });
  assert.equal(applyBody(tired).force, true);
  const rig = draftFromPreview({ ...PREVIEW, rigged: true });
  assert.equal(applyBody(rig).consumeRig, true);
  assert.equal(applyBody({ ...rig, d20: '3' }).consumeRig, undefined);
  assert.equal(critDice('1d6+2'), '2d6+2');
  assert.equal(critDice('7'), '7');
});

test('sala ativa: aventura "em jogo" mais recente com sala marcada', () => {
  assert.equal(activeScene([]), null);
  const advs = [
    { id: 1, status: 'playing', currentNodeId: 'n1', updatedAt: '2026-10-01' },
    { id: 2, status: 'playing', currentNodeId: 'n9', updatedAt: '2026-10-05' },
    { id: 3, status: 'draft', currentNodeId: null, updatedAt: '2026-10-06' },
    { id: 4, status: 'done', currentNodeId: 'n2', updatedAt: '2026-10-07' },
  ];
  assert.equal(activeScene(advs).id, 2);
  assert.equal(activeScene([advs[3]]), null);
  assert.equal(activeScene([{ id: 5, status: 'draft', currentNodeId: 'x', updatedAt: '1' }]).id, 5);
});

test('"Nesta cena": refs da sala na ordem e plano sem repetir', () => {
  const entries = [{ id: 1, name: 'Velna' }, { id: 2, name: 'Taverna' }, { id: 3, name: 'Bruxo' }, { id: 4, name: 'Vila' }];
  const r = sceneEntries({ entries, node: { refs: [3, 1, 99] }, plan: { npcIds: [1, 2], placeIds: [4] } });
  assert.deepEqual(r.scene.map(e => e.id), [3, 1]);
  assert.deepEqual(r.planned.map(e => e.id), [2, 4]);
  assert.deepEqual(sceneEntries({ entries, node: null, plan: null }), { scene: [], planned: [] });
});

test('Testes: lista única com Percepção CD 15 em Abertos', () => {
  const checks = [
    { id: 1, label: 'Percepção', dc: 15, status: 'open', createdAt: '2026-10-06T10:00:00',
      targets: [{ userId: 1, response: null }, { userId: 2, response: { total: 17 } }] },
    { id: 2, label: 'Furtividade', status: 'open', createdAt: '2026-10-06T09:00:00', targets: [{ userId: 1, response: { total: 8 } }] },
    { id: 3, label: 'Atletismo', status: 'closed', createdAt: '2026-10-05T09:00:00', closedAt: '2026-10-05T09:10:00', targets: [] },
  ];
  const pendingRolls = [{ id: 7, label: 'Intuição', status: 'pending', createdAt: '2026-10-06T10:05:00' }];
  const recentRolls = [{ id: 7, status: 'pending' }, { id: 6, label: 'Dano', status: 'public', resolvedAt: '2026-10-06T08:00:00' }];
  const g = unifyTests({ checks, pendingRolls, recentRolls });
  assert.deepEqual(g.open.map(x => x.key), ['r7', 'c1']);
  assert.equal(g.open.find(x => x.key === 'c1').item.dc, 15);
  assert.equal(g.open.find(x => x.key === 'r7').pending, true);
  assert.deepEqual(g.answered.map(x => x.key), ['c2']);
  assert.deepEqual(g.history.map(x => x.key), ['r6', 'c3']);
  assert.equal(testsBadge(g), 3);
  assert.deepEqual(unifyTests(), { open: [], answered: [], history: [] });
});

import { evaluateSave, saveApplyOps, saveDraft, saveModifier, savePortion } from '../src/play/attack-model.js';

test('efeito com resistência é sugestão: rascunho, metade no sucesso e chamadas na ordem', () => {
  const breath = { name: 'Sopro de Fogo', recharge: 5, damage: '8d6', damageType: 'fire',
    save: { ability: 'DEX', dc: 13, halfOnSave: true, conditions: ['prone'] } };
  const goblin = { id: 'g', name: 'Goblin', stats: { saves: { dex: 2 } } };
  const thalion = { id: 't', name: 'Thalion', stats: { abilities: { dex: 14 } } };
  const ghost = { id: 'x', name: 'Sombra', stats: {} };
  assert.equal(saveModifier(goblin, 'DEX'), 2);
  assert.equal(saveModifier(thalion, 'dex'), 2);
  assert.equal(saveModifier(ghost, 'dex'), null);
  assert.equal(savePortion(21, true, true), 10);
  assert.equal(savePortion(21, true, false), 0);
  assert.equal(savePortion(21, false, true), 21);

  const d = saveDraft(breath, [goblin, thalion, ghost], { roll: () => 20, d20: () => 12 });
  assert.equal(d.dc, 13);
  assert.equal(d.parts[0].amount, '20');
  assert.equal(d.targets[0].total, '14');   // 12 + 2 → passa
  assert.equal(d.targets[2].total, '');     // mestre digita
  d.targets[1].total = '9';                 // dado físico do Thalion → falha
  const res = evaluateSave(d);
  assert.deepEqual(res.map(r => [r.id, r.success]), [['g', true], ['t', false], ['x', false]]);
  assert.deepEqual(res[0].damage, [{ amount: 10, type: 'fire' }]);
  assert.deepEqual(res[1].conditions, ['prone']);
  d.targets[2].override = true;             // o mestre decide que a Sombra passou
  const ops = saveApplyOps(d, { attackerId: 'dragon', actionIndex: 2, consume: true });
  assert.deepEqual(ops, [
    { action: 'use_action', attackerId: 'dragon', actionIndex: 2, force: false },
    { action: 'damage', targetId: 'g', amount: 10, damageType: 'fire' },
    { action: 'damage', targetId: 't', amount: 20, damageType: 'fire' },
    { action: 'add_condition', targetId: 't', condition: 'prone' },
    { action: 'damage', targetId: 'x', amount: 10, damageType: 'fire' },
  ]);
});
