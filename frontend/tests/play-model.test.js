import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBody, critDice, draftFromPreview, evaluateDraft, isAdjusted, resultLine, serverTotalsValid } from '../src/play/attack-model.js';
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
  assert.equal(testsBadge(g), 2); // só os abertos (#37): respondido não segura o selo
  assert.deepEqual(unifyTests(), { open: [], answered: [], history: [] });
});

import { evaluateSave, saveApplyBody, saveApplyOps, saveDraft, saveDraftFromPreview, saveModifier, savePortion, sheetSaveMods } from '../src/play/attack-model.js';

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

// V10-fix — a salvaguarda do PJ pela ficha (proficiência e espécie), não pelo atributo-base do combatente.
test('salvaguarda do PJ: o modificador vem da ficha da vaga (Utils.saveBonus)', async () => {
  const { default: Utils } = await import('../utils.js');
  const { modifierFor } = await import('../src/checks/check-logic.js');
  const rogue = { ...Utils.makeNew(), className: 'rogue', level: 1, race: 'human', saveProfs: ['dex', 'int'],
    abilities: { str: 8, dex: 15, con: 12, int: 10, wis: 14, cha: 10 } };
  const halfling = { ...rogue, race: 'halfling', rulesVersion: '2014', raceBonus: { dex: 2 } };
  const members = [{ character: { id: 7, data: rogue } }, { character: { id: 8, data: halfling } }, { character: null }];
  const targets = [
    { id: 'p1', type: 'pc', character_id: 7, stats: { abilities: { dex: 15 } } },   // o combatente: só o atributo-base
    { id: 'p2', type: 'pc', character_id: 8, stats: { abilities: { dex: 15 } } },
    { id: 'p3', type: 'pc', character_id: 8, wild_shape: true, stats: { abilities: { dex: 16 } } },
    { id: 'g', type: 'monster', stats: { saves: { dex: 2 } } },
    { id: 'p4', type: 'pc', character_id: 99, stats: {} },
  ];
  const mods = sheetSaveMods(targets, members, 'DEX', modifierFor);
  assert.deepEqual(mods, { p1: 4, p2: 5 });          // Ladino nível 1, DES 15 → +4; halfling 2014 → +5
  assert.equal(saveModifier(targets[0], 'dex'), 2);   // o que o servidor usaria sem a ficha
  assert.equal(sheetSaveMods(targets, members, 'wis', modifierFor).p1, 2);   // sem proficiência em SAB
  // sem rede: o rascunho local usa os mesmos números
  const d = saveDraft({ save: { ability: 'dex', dc: 13 } }, targets.slice(0, 4), { d20: () => 9, mods });
  assert.deepEqual(d.targets.map(t => t.total), ['13', '14', '12', '11']);
});

// V10 — a salvaguarda em área rolada no servidor e aplicada numa chamada (+ 📺 a linha-resumo).
test('salvaguarda do servidor: rascunho com o d20 de cada alvo e save_apply numa chamada', () => {
  const breath = { name: 'Sopro de Fogo', damage: '6d6', damageType: 'fire',
    save: { ability: 'DEX', dc: 13, halfOnSave: true, conditions: ['prone'] } };
  const preview = { ability: 'dex', dc: 13, half: true, conditions: ['prone'],
    damage: [{ dice: '6d6', type: 'fire', rolled: 20, rolls: [3, 3, 3, 3, 4, 4] }],
    targets: [{ id: 'd1', name: 'Dagna', d20: 9, modifier: 0, total: 9, success: false },
      { id: 'p1', name: 'Pipo', d20: 12, modifier: 5, total: 17, success: true },
      { id: 'x', name: 'Sombra', d20: 4, modifier: null, total: null, success: false }] };
  const d = saveDraftFromPreview(preview, breath);
  assert.equal(d.server, true);
  assert.deepEqual(d.targets.map(t => [t.d20, t.total]), [[9, '9'], [12, '17'], [4, '']]);
  d.targets[2].total = '15';            // o mestre digita o dado físico da Sombra
  const body = saveApplyBody(d, { attackerId: 'dr', actionIndex: 0, consume: true, show: true });
  assert.equal(body.action, 'save_apply');
  assert.equal(body.show, true);
  assert.deepEqual(body.targets.map(t => [t.id, t.total, t.success, t.d20]),
    [['d1', 9, false, 9], ['p1', 17, true, 12], ['x', 15, true, null]]);
  assert.deepEqual(body.targets[0].damage, [{ amount: 20, type: 'fire' }]);
  assert.deepEqual(body.targets[0].conditions, ['prone']);
  assert.deepEqual(body.targets[1].damage, [{ amount: 10, type: 'fire' }]);
  // o local (sem rede) também guarda o d20
  assert.equal(saveDraft(breath, [{ id: 'g', name: 'G', stats: { saves: { dex: 1 } } }], { d20: () => 7 }).targets[0].d20, 7);
});

// #29 — dano extra condicional ("se o ataque teve Vantagem") nunca entra sozinho.
test('dano extra condicional começa desligado e só entra se o mestre marcar', async () => {
  const { damagePartConditions, actionSummary } = await import('../src/campaigns/monster-actions.js');
  const scimitar = {
    name: { pt: 'Cimitarra', en: 'Scimitar' }, type: 'melee', atk: 4, range: '5 ft', damage: '1d6+2', damageType: 'slashing',
    extraDamage: [{ damage: '1d4', damageType: 'slashing' }],
    desc: { en: 'Melee Attack Roll: +4, reach 5 ft. 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.' },
  };
  const conditions = damagePartConditions(scimitar);
  assert.equal(conditions[0], null);
  assert.equal(conditions[1].pt, 'se o ataque teve Vantagem');
  assert.match(actionSummary(scimitar, 'pt'), /\(1d4 cortante se o ataque teve Vantagem\)/);

  const preview = { ...PREVIEW, damage: [...PREVIEW.damage, { dice: '1d4', rolled: 3, type: 'slashing', rolls: [3] }], effectiveDamage: 9, newHp: 6 };
  const d = draftFromPreview(preview, { conditions });
  assert.equal(evaluateDraft(d).damageTotal, 6);
  assert.deepEqual(applyBody(d).damage, [{ amount: 6, type: 'slashing' }]);
  assert.equal(serverTotalsValid(d), false); // o total do servidor somou o extra
  const on = { ...d, parts: d.parts.map(p => (p.conditional ? { ...p, on: true } : p)) };
  assert.equal(evaluateDraft(on).damageTotal, 9);
  assert.deepEqual(applyBody(on).damage, [{ amount: 6, type: 'slashing' }, { amount: 3, type: 'slashing' }]);
  assert.equal(serverTotalsValid(on), true);
});

test('dano extra incondicional ("plus 2 (1d4) Cold damage.") continua somado', async () => {
  const { damagePartConditions } = await import('../src/campaigns/monster-actions.js');
  const spear = { type: 'melee', damage: '1d6', damageType: 'piercing', extraDamage: [{ damage: '1d4', damageType: 'cold' }],
    desc: { en: '3 (1d6) Piercing damage plus 2 (1d4) Cold damage. If the target is a creature, its Speed decreases.' } };
  assert.deepEqual(damagePartConditions(spear), [null, null]);
});

// #34 — cabeçalho e Jogar › Telão contam o mesmo que a TV desenha.
test('screenNow: combate com cartão do Mundo sobreposto; recap espera o combate acabar', async () => {
  const { screenNow } = await import('../src/play/screen-now.js');
  const entry = { type: 'entry', title: 'Borin', kindLabel: 'Personagem' };
  const recap = { type: 'recap', title: 'Anteriormente…' };
  const fight = { active: true, round: 2, combatants: [] };
  assert.deepEqual(screenNow({ combat: fight, card: entry }), { mode: 'combat', round: 2, card: null, overlay: entry, waiting: null });
  assert.deepEqual(screenNow({ combat: fight, card: recap }), { mode: 'combat', round: 2, card: null, overlay: null, waiting: recap });
  assert.equal(screenNow({ combat: { active: false }, card: entry }).card, entry);
  assert.equal(screenNow({}).mode, 'rest');
});

// ---------------------------------------------------------------- Jogar › Agora (V7)
import {
  checkLine, clockText, currentScene, firstOpenScene, momentBody, momentCounters, nextSceneAfter, pickCounter,
  planChips, recapShown, scenePosition, sessionClock, sessionLength, sessionTests, startChoices, testsBadge as nowBadge,
} from '../src/play/now-model.js';

const PLAN = {
  scenes: [
    { id: 'c1', text: 'Taverna do Javali\nBorin sabe', done: true },
    { id: 'c2', text: 'Ponte velha', done: false },
    { id: 'c3', text: '', nodeRef: { adventureId: 1, nodeId: 'n3' }, done: false },
    { id: 'c4', text: '', done: false },                 // sem nome: não conta
    { id: 'c5', text: 'Sino', done: false },
  ],
};

test('Agora: a cena agora pelo id gravado e, sem ele, pelo nome', () => {
  assert.equal(currentScene(PLAN, { sceneId: 'c2', scene: 'outra' }).id, 'c2');
  assert.equal(currentScene(PLAN, { scene: 'taverna do javali' }).id, 'c1');
  assert.equal(currentScene(PLAN, { scene: 'Cripta' }, { c3: 'Cripta' }).id, 'c3');
  assert.equal(currentScene(PLAN, { sceneId: 'c4' }), null);              // cena sem nome não é cena
  assert.equal(currentScene(PLAN, { scene: 'Taverna do Javali Cego — salão lotado' }), null);
  assert.equal(currentScene(null, { sceneId: 'c2' }), null);
});

test('Agora: posição, próxima cena e os chips do plano', () => {
  assert.deepEqual(scenePosition(PLAN, 'c3'), { pos: 3, total: 4 });
  assert.equal(firstOpenScene(PLAN).id, 'c2');
  assert.equal(nextSceneAfter(PLAN, 'c2').id, 'c3');
  assert.equal(nextSceneAfter(PLAN, 'c5').id, 'c2');      // depois da última, volta à 1ª que falta
  assert.equal(nextSceneAfter({ scenes: [{ id: 'a', text: 'A' }] }, 'a'), null);
  assert.deepEqual(planChips(PLAN, 'c2', { c3: 'Cripta' }).map(c => `${c.icon} ${c.name}`),
    ['✓ Taverna do Javali', '▶ Ponte velha', '○ Cripta', '○ Sino']);
});

test('Agora: selo de Testes só desta sessão; o resto em "De sessões passadas"', () => {
  const since = '2026-10-27T20:00:00Z';
  const checks = [
    { id: 1, status: 'open', createdAt: '2026-10-24T18:05:42Z' },
    { id: 2, status: 'open', createdAt: '2026-10-27T20:10:00Z' },
    { id: 3, status: 'closed', createdAt: '2026-10-27T20:11:00Z' },
  ];
  const pendingRolls = [{ id: 1, createdAt: '2026-10-24T18:05:42Z' }, { id: 2, createdAt: '2026-10-24T18:05:43Z' }];
  const t = sessionTests({ checks, pendingRolls, since });
  assert.deepEqual(t.checks.map(c => c.id), [2]);
  assert.deepEqual(t.rolls, []);
  assert.deepEqual(t.old.rolls.map(r => r.id), [1, 2]);
  assert.deepEqual(t.old.checks.map(c => c.id), [1]);
  assert.deepEqual(nowBadge({ checks: 1, rolls: 2 }), { short: '1·2', long: '1 teste · 2 rolagens' });
  assert.deepEqual(nowBadge({ checks: 0, rolls: 0 }), { short: '', long: '0 testes · 0 rolagens' });
  assert.equal(nowBadge({ checks: 1, rolls: 1 }, 'en').long, '1 check · 1 roll');
  // sem sessão começada: tudo conta
  assert.equal(sessionTests({ checks, pendingRolls }).rolls.length, 2);
});

test('Agora: painel do momento — contadores e a regra anti-surpresa', () => {
  assert.deepEqual(momentCounters({}), []);
  assert.deepEqual(momentCounters({ checks: 1, rolls: 2, approvals: 1, levelups: 1, dangers: 1 }).map(c => `${c.icon} ${c.n} ${c.label}`),
    ['🎯 1 teste', '🎲 2 pedidos', '⬆ 1 nível', '⚠ 1 perigo']);
  assert.equal(momentCounters({ approvals: 1, levelups: 0 })[0].label, 'aprovação');
  const a = { id: 5, createdAt: '2026-10-27T20:00:00Z' };
  const b = { id: 6, createdAt: '2026-10-27T20:05:00Z' };
  // sem escolha: o teste aberto mais novo; sem teste, o 1º perigo; sem nada, a lista
  assert.deepEqual(momentBody(null, { checks: [a, b] }), { kind: 'check', id: 6 });
  assert.deepEqual(momentBody(null, { dangers: [{ id: 'zeroHp:1' }] }), { kind: 'danger', id: 'zeroHp:1' });
  assert.deepEqual(momentBody(null, {}), { kind: 'list' });
  // o que chega só muda o número: a escolha fica enquanto existir
  assert.deepEqual(momentBody({ kind: 'check', id: 5 }, { checks: [a, b] }), { kind: 'check', id: 5 });
  assert.deepEqual(momentBody({ kind: 'list' }, { checks: [a, b] }), { kind: 'list' });
  // o item do corpo acabou (teste encerrado): volta ao padrão
  assert.deepEqual(momentBody({ kind: 'check', id: 9 }, { checks: [a] }), { kind: 'check', id: 5 });
  assert.deepEqual(momentBody({ kind: 'rolls' }, { rolls: 0 }), { kind: 'list' });
  // o toque num contador
  assert.deepEqual(pickCounter('checks', { checks: [a, b] }), { kind: 'check', id: 6 });
  assert.deepEqual(pickCounter('approvals'), { kind: 'approvals' });
});

test('Agora: a linha do teste com as respostas escritas', () => {
  const check = { label: 'Percepção', dc: 13, dcHidden: false, targets: [
    { userId: 1, characterName: 'Elarion Vento', response: { total: 16 }, outcome: 'pass' },
    { userId: 2, characterName: 'Kaelor', response: { total: 7 }, outcome: 'fail' },
    { userId: 3, characterName: 'Pipo', response: null },
  ] };
  const l = checkLine(check);
  assert.equal(l.head, 'Percepção CD 13 · 2 de 3');
  assert.deepEqual(l.answers.map(x => x.text), ['Elarion 16 ✓', 'Kaelor 7 ✗', 'Pipo…']);
  assert.equal(checkLine({ ...check, dcHidden: true }).head, 'Percepção CD 13 🔒 · 2 de 3');
});

test('Agora: relógio e duração da sessão; o resumo já mostrado; onde começa', () => {
  assert.equal(clockText(65 * 60000), '1h05');
  assert.equal(sessionClock('2026-10-27T20:00:00Z', Date.parse('2026-10-27T20:42:30Z')), '0h42');
  assert.equal(sessionClock(null), null);
  assert.equal(sessionLength('2026-10-27T18:00:00Z', '2026-10-27T20:10:00Z'), '2h10');
  assert.equal(sessionLength('2026-10-27T18:00:00Z', null), null);
  assert.equal(recapShown({ session: '4', diarySessions: { 4: { shown: [{ t: 'x', k: 'recap' }] } } }), true);
  assert.equal(recapShown({ session: '4', diarySessions: { 3: { shown: [{ k: 'recap' }] } } }), false);
  const choices = startChoices(PLAN, { scene: 'Taverna do Javali', sceneId: 'c1' });
  assert.deepEqual(choices.map(c => c.id), ['scene', 'continue', 'other', 'unsure']);
  assert.equal(choices[0].sceneId, 'c2');
  assert.equal(choices[1].label, 'Continuar de onde paramos: Taverna do Javali');
  assert.deepEqual(startChoices({ scenes: [] }, {}).map(c => c.id), ['other', 'unsure']);
});
