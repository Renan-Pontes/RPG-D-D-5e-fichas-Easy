// O cartão "O que fazer agora" do Plano (especificação §1.2 e §3.1): uma linha por regra
// N1–N9 com os dados mínimos que a disparam, só 1 cartão por vez e o "Pular" lembrado no
// aparelho até os dados da regra mudarem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinNames, nextStep, PLAN_RULES, prepSession, readSkips, reminderText, writeSkip } from '../src/shell/next-step.js';
import { addScene, addSecret, emptyPlan, normalizePlan, planHeading, sceneFights } from '../src/prep/next-session.js';

const ana = { id: 11, role: 'player', user: { displayName: 'Ana' }, character: { id: 1, name: 'Pipo Gorgulho' } };
const bruno = { id: 12, role: 'player', user: { displayName: 'Bruno' }, character: null };
const dm = { id: 10, role: 'dm', user: { displayName: 'Mestre' } };

// Um plano que passa por N2–N6 (começo, 2 cenas, 1 pista)
const ready = () => {
  let p = { ...emptyPlan(), strongStart: 'O sino toca' };
  p = addScene(addScene(p, 'Taverna', null, 'c1'), 'Ponte', null, 'c2');
  return addSecret(p, 'O taverneiro deve ao culto');
};
const camp = (over = {}) => ({ id: 7, name: 'Mesa', status: 'active', state: { session: '4' }, members: [dm, ana], onboarding: { tv: true }, ...over });
const chars = (moments) => ({ chars: [{ id: 1, name: 'Pipo Gorgulho', moments, style: ['🤐 fala pouco'],
  ideas: [{ kind: 'shine', auto: 'tool:thievesTools', text: 'único com Ferramentas de Ladrão' }, { kind: 'push', auto: 'push:save:wis', text: 'salvaguarda de SAB +0' }] }] });

// [regra, contexto mínimo que a dispara]
const ROWS = [
  ['N1', { campaign: camp({ members: [dm] }), plan: emptyPlan() }],
  ['N2', { campaign: camp(), plan: emptyPlan(), adventures: 0 }],
  ['N3', { campaign: camp(), plan: emptyPlan(), adventures: 1 }],
  ['N4', { campaign: camp(), plan: { ...emptyPlan(), strongStart: 'Boom' } }],
  ['N5', { campaign: camp({ members: [dm, ana, bruno] }), plan: ready(), fights: ['c2'] }],
  ['N6', { campaign: camp(), plan: { ...ready(), secrets: [] } }],
  ['N7', { campaign: camp(), plan: ready(), insights: chars(0) }],
  ['N8', { campaign: camp({ onboarding: {} }), plan: ready() }],
  ['N9', { campaign: camp(), plan: ready() }],
];

test('uma linha por regra: os dados mínimos disparam a regra certa', () => {
  assert.deepEqual(ROWS.map(r => r[0]), PLAN_RULES);
  for (const [id, ctx] of ROWS) {
    const step = nextStep({ lang: 'pt', ...ctx });
    assert.equal(step?.id, id, `${id}: veio ${step?.id}`);
    assert.ok(step.text && step.why, `${id}: frase e motivo`);
    assert.ok(step.text.length <= 110, `${id}: frase curta (${step.text.length})`);
    assert.ok(step.help, `${id}: tem "?"`);
    assert.ok(step.sig, `${id}: assinatura para o Pular`);
    assert.ok(step.action?.id, `${id}: um botão`);
  }
});

test('textos e botões de cada regra (pt e en)', () => {
  const at = (i, lang = 'pt') => nextStep({ lang, ...ROWS[i][1] });
  assert.equal(at(0).action.label, '🔗 Copiar link de convite');
  assert.equal(at(0).secondary.id, 'share');
  assert.equal(at(1).text, 'Escolha como preparar a Sessão 5.');
  assert.equal(at(1).doors, true);
  assert.equal(at(1).canSkip, false, 'N2 nunca é pulado');
  assert.equal(at(1, 'en').text, 'Choose how to prepare session 5.');
  assert.equal(at(2).action.label, 'Escrever o começo');
  assert.equal(at(3).action.label, '＋ Cena');
  assert.equal(at(4).text, 'O combate da cena 2 precisa dos personagens: Bruno ainda não tem ficha.');
  assert.deepEqual(at(4).payload.names, ['Bruno']);
  assert.equal(at(5).action.label, '＋ Pista');
  assert.equal(at(6).text, 'Pipo ainda não tem um momento. Ideia: ★ único com Ferramentas de Ladrão');
  assert.equal(at(6).why, '(Pipo: 🤐 fala pouco)', 'respeita o estilo do jogador');
  assert.equal(at(6).action.label, '★ Usar a ideia');
  assert.equal(at(6).secondary.label, 'Outra ideia');
  assert.equal(at(7).action.label, 'Copiar link da Tela');
  assert.equal(at(8).action.label, '▶ Começar a Sessão 5');
  assert.equal(at(8, 'en').action.label, '▶ Start session 5');
});

test('só 1 cartão por vez: a primeira regra que vale ganha', () => {
  // campanha nova e vazia: N1 (ninguém) vence N2…N8, que também valeriam
  const step = nextStep({ campaign: camp({ members: [dm], onboarding: {} }), plan: emptyPlan(), lang: 'pt' });
  assert.equal(step.id, 'N1');
  assert.equal(typeof step, 'object');
  assert.ok(!Array.isArray(step));
  // com jogador: as 3 portas
  assert.equal(nextStep({ campaign: camp({ onboarding: {} }), plan: emptyPlan(), lang: 'pt' }).id, 'N2');
  // N7 sem o Raio-X (insights null) é pulada
  assert.equal(nextStep({ campaign: camp(), plan: ready(), insights: null, lang: 'pt' }).id, 'N9');
  // todos com momento → N9
  assert.equal(nextStep({ campaign: camp(), plan: ready(), insights: chars(2), lang: 'pt' }).id, 'N9');
  // ao vivo, tudo resolvido: nenhum cartão (a sessão já começou)
  assert.equal(nextStep({ campaign: camp({ state: { session: '4', live: true } }), plan: ready(), lang: 'pt' }), null);
  // encerrada: nada a fazer
  assert.equal(nextStep({ campaign: camp({ status: 'closed', members: [dm] }), plan: emptyPlan(), lang: 'pt' }), null);
  // sem plano carregado
  assert.equal(nextStep({ campaign: camp(), plan: null }), null);
});

test('N5: cena feita não pede ficha; vários sem ficha no plural', () => {
  const carla = { id: 13, role: 'player', user: { displayName: 'Carla' }, character: null };
  const ctx = { campaign: camp({ members: [dm, ana, bruno, carla] }), plan: ready(), fights: ['c2'], lang: 'pt' };
  assert.equal(nextStep(ctx).text, 'O combate da cena 2 precisa dos personagens: Bruno e Carla ainda não têm ficha.');
  const done = { ...ctx, plan: { ...ctx.plan, scenes: ctx.plan.scenes.map(s => (s.id === 'c2' ? { ...s, done: true } : s)) } };
  assert.equal(nextStep(done).id, 'N9');
  assert.equal(joinNames(['Ana', 'Bruno', 'Carla'], 'en'), 'Ana, Bruno and Carla');
  assert.match(reminderText({ names: ['Bruno'], campaign: 'Mesa', session: 5, link: 'https://x/join/AB', lang: 'pt' }),
    /^Oi, Bruno! Antes da Sessão 5 de “Mesa”, crie o seu personagem.*https:\/\/x\/join\/AB$/);
});

test('N5: o combate da sala ligada conta sem o passo ③ aberto (sceneFights com as salas do plano)', () => {
  // aventura pronta: a cena 1 é a sala n1 (sem combate) e a cena 2 é a sala n2 (2 goblins)
  let plan = { ...emptyPlan(), strongStart: 'O moinho range' };
  plan = addScene(plan, 'Portão do moinho', { adventureId: 9, nodeId: 'n1' }, 'c1');
  plan = addScene(plan, 'Porão', { adventureId: 9, nodeId: 'n2' }, 'c2');
  plan = addSecret(plan, 'O moleiro mente');
  const nodes = { 9: [{ id: 'n1', encounter: [] }, { id: 'n2', encounter: [{ monsterId: 'goblin', count: 2 }] }] };
  const ctx = { campaign: camp({ members: [dm, ana, bruno] }), plan, lang: 'pt' };
  assert.equal(nextStep({ ...ctx, fights: sceneFights(plan, nodes) }).text,
    'O combate da cena 2 precisa dos personagens: Bruno ainda não tem ficha.');
  // as salas ainda não chegaram: o N5 não vale (por isso o Plano as lê junto com o plano)
  assert.equal(nextStep({ ...ctx, fights: sceneFights(plan, {}) }).id, 'N9');
});

test('N9: plano de uma sessão já jogada aponta o plano da próxima (o número certo)', () => {
  // jogo-e-combate: o plano é da Sessão 3, que foi jogada e encerrada
  const plan = { ...ready(), forSession: 3 };
  const ctx = { campaign: camp({ state: { session: '3', live: false } }), plan, lang: 'pt' };
  const step = nextStep(ctx);
  assert.equal(step.id, 'N9');
  assert.equal(step.text, 'A Sessão 3 já foi jogada: comece o plano da Sessão 4.');
  assert.equal(step.action.id, 'newPlan');
  assert.equal(step.action.label, '↻ Começar o plano da Sessão 4');
  assert.ok(step.help && !('helpId' in step));
  assert.equal(nextStep({ ...ctx, lang: 'en' }).action.label, '↻ Start the session 4 plan');
  // o lembrete do N5 fala da Sessão 4, não da 3 que já foi
  const n5 = nextStep({ ...ctx, campaign: camp({ state: { session: '3' }, members: [dm, ana, bruno] }), fights: ['c2'] });
  assert.equal(n5.id, 'N5');
  assert.equal(n5.payload.session, 4);
  assert.equal(prepSession(planHeading(plan, { session: '3' })), 4);
  // plano em branco de uma sessão jogada: as portas são da próxima
  assert.equal(nextStep({ ...ctx, plan: { ...emptyPlan(), forSession: 3 } }).text, 'Escolha como preparar a Sessão 4.');
  // plano da próxima (não velho): o de sempre
  assert.equal(nextStep({ ...ctx, plan: { ...ready(), forSession: 4 } }).action.label, '▶ Começar a Sessão 4');
  // ao vivo, o plano de hoje: N5 lembra a sessão de hoje
  assert.equal(prepSession(planHeading({ ...emptyPlan(), forSession: 3 }, { session: '3', live: true })), 3);
});

test('N2: um plano só com pistas ainda mostra as 3 portas (o servidor o preenche)', () => {
  const plan = addSecret(emptyPlan(), 'O moleiro mente');
  assert.equal(nextStep({ campaign: camp(), plan, lang: 'pt' }).id, 'N2');
});

test('N7: "Outra ideia" passa para a próxima; sem ideia, ver os momentos', () => {
  const base = { campaign: camp(), plan: ready(), insights: chars(0), lang: 'pt' };
  assert.match(nextStep({ ...base, idea: 1 }).text, /Ideia: ↗ salvaguarda de SAB \+0$/);
  assert.match(nextStep({ ...base, idea: 2 }).text, /Ferramentas de Ladrão$/, 'volta à primeira');
  const none = { ...base, insights: { chars: [{ id: 1, name: 'Pipo', moments: 0, ideas: [], style: [] }] } };
  assert.equal(nextStep(none).action.id, 'moments');
  assert.equal(nextStep(none).secondary, null);
});

test('"Pular" lembrado no aparelho até os dados da regra mudarem', () => {
  const mem = new Map();
  const storage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
  const ctx = { campaign: camp(), plan: { ...emptyPlan(), strongStart: 'Boom' }, lang: 'pt' };
  const first = nextStep(ctx);
  assert.equal(first.id, 'N4');
  const skips = writeSkip(7, first.id, first.sig, storage);
  assert.equal(mem.get('forja:next-skip:7:N4'), 'scenes:0');
  // pulado: a próxima regra que vale (N6, sem pistas)
  assert.equal(nextStep({ ...ctx, skips }).id, 'N6');
  assert.deepEqual(readSkips(7, storage), { N4: 'scenes:0' });
  // os dados mudaram (1 cena): o N4 volta
  const one = { ...ctx, plan: addScene(ctx.plan, 'Taverna', null, 'c1'), skips: readSkips(7, storage) };
  assert.equal(nextStep(one).id, 'N4');
  assert.equal(nextStep(one).why, 'O plano tem 1 cena.');
  // outra campanha não herda o pulo
  assert.deepEqual(readSkips(8, storage), {});
  // storage quebrado: nada lembrado, nada quebra
  const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
  assert.deepEqual(readSkips(7, broken), {});
  assert.doesNotThrow(() => writeSkip(7, 'N4', 'x', broken));
  // N7 pulado volta quando outro personagem fica sem momento
  const n7 = { campaign: camp(), plan: ready(), insights: chars(0), lang: 'pt' };
  const s7 = nextStep(n7);
  const skip7 = { [s7.id]: s7.sig };
  assert.equal(nextStep({ ...n7, skips: skip7 }).id, 'N9');
  const two = { chars: [...chars(0).chars, { id: 2, name: 'Dagna', moments: 0, ideas: [], style: [] }] };
  assert.equal(nextStep({ ...n7, insights: two, skips: skip7 }).id, 'N7');
});

test('a escolha de uma porta (✎ passo a passo) responde o N2 sem botão Pular', () => {
  const ctx = { campaign: camp(), plan: normalizePlan({}), lang: 'pt' };
  const n2 = nextStep(ctx);
  assert.equal(n2.id, 'N2');
  assert.equal(nextStep({ ...ctx, skips: { N2: n2.sig } }).id, 'N3');
  // a escolha no plano da Sessão 1 não esconde as portas do plano em branco da Sessão 2
  const first = { ...ctx, campaign: camp({ state: {} }) };
  const s1 = nextStep(first);
  assert.match(s1.text, /Sessão 1/);
  const second = { ...ctx, campaign: camp({ state: { session: '1' } }), plan: normalizePlan({ forSession: 2 }), skips: { N2: s1.sig } };
  const s2 = nextStep(second);
  assert.equal(s2.id, 'N2');
  assert.notEqual(s2.sig, s1.sig);
  assert.match(s2.text, /Sessão 2/);
});

// ---------------------------------------------------------------- Jogar › Agora (J1–J6, V7)
import { NOW_RULES, readyItems, sessionWasPlayed } from '../src/shell/next-step.js';

const T0 = '2026-10-24T18:00:00Z';
const live = (over = {}) => camp({ state: { session: '4', live: true, diarySessions: { 4: { startedAt: T0 } } }, ...over });
const stopped = (over = {}) => camp({ state: { session: '3', diarySessions: { 3: { startedAt: T0 } } }, ...over });
const played = () => ({ ...ready(), forSession: 3 });   // o plano da sessão que já foi jogada (stale)
const allDone = () => { const p = ready(); return { ...p, scenes: p.scenes.map(s => ({ ...s, done: true })) }; };

// [regra, contexto mínimo que a dispara]
const NOW_ROWS = [
  ['J1', { where: 'now', campaign: stopped(), plan: ready(), live: false, recap: { has: true } }],
  ['J2', { where: 'now', campaign: stopped(), plan: played(), live: false, length: '2h10', recap: { has: false } }],
  ['J3', { where: 'now', campaign: live(), plan: ready(), live: true, recap: { has: true, shown: false } }],
  ['J4', { where: 'now', campaign: live(), plan: ready(), live: true }],
  ['J5', { where: 'now', campaign: live(), plan: allDone(), live: true }],
  ['J6', { where: 'now', campaign: live(), plan: emptyPlan(), live: true }],
];

test('Agora: uma linha por regra J1–J6 com os dados mínimos', () => {
  assert.deepEqual(NOW_ROWS.map(r => r[0]), NOW_RULES);
  for (const [id, ctx] of NOW_ROWS) {
    const step = nextStep({ lang: 'pt', ...ctx });
    assert.equal(step?.id, id, `${id}: veio ${step?.id}`);
    assert.ok(step.text && step.text.length <= 90, `${id}: 1 frase curta`);
    assert.ok(step.help, `${id}: tem "?"`);
    assert.ok(step.sig && step.action?.id, `${id}: assinatura e 1 botão`);
  }
});

test('Agora: textos e botões das regras J', () => {
  const at = (i, lang = 'pt') => nextStep({ lang, ...NOW_ROWS[i][1] });
  const j1 = at(0);
  assert.equal(j1.text, 'Pronto para a Sessão 4?');
  assert.equal(j1.action.label, '▶ Começar a Sessão 4');
  assert.equal(j1.note, 'Ensaio: dá para olhar as cenas e testar a Tela antes.');
  assert.deepEqual(j1.items.map(x => [x.id, x.ok, x.text]), [
    ['plan', true, 'plano (2 cenas)'], ['party', true, '1 com ficha'], ['tv', true, 'Tela testada'], ['recap', true, 'resumo da 3'],
  ]);
  assert.equal(at(0, 'en').text, 'Ready for session 4?');
  const j2 = at(1);
  assert.equal(j2.text, 'Sessão 3 encerrada · 2h10');
  assert.equal(j2.action.label, '📜 Escrever o resumo');
  assert.equal(j2.secondary.label, '📋 Preparar a Sessão 4');
  assert.equal(nextStep({ ...NOW_ROWS[1][1], length: null }).text, 'Sessão 3 encerrada');
  assert.equal(at(2).action.id, 'showRecap');
  assert.equal(at(2).secondary.id, 'readRecap');
  const j4 = at(3);
  assert.equal(j4.text, 'Comece pela primeira cena: Taverna.');
  // o começo forte vai INTEIRO numa linha própria (nada de cortar em 90 caracteres)
  assert.equal(j4.why, '');
  assert.equal(j4.lead, '⚡ Comece assim: O sino toca');
  const long = 'O sino toca embaixo d’água no meio do brinde — todas as velas da taverna se apagam ao mesmo tempo.';
  assert.equal(nextStep({ ...NOW_ROWS[3][1], plan: { ...ready(), strongStart: long } }).lead, `⚡ Comece assim: ${long}`);
  assert.equal(nextStep({ ...NOW_ROWS[3][1], plan: { ...ready(), strongStart: '' } }).why, 'Um toque começa a cena e mostra na Tela o que ela tem.');
  assert.equal(j4.action.label, '▶ Começar esta cena');
  assert.equal(j4.secondary, null);
  assert.deepEqual(j4.payload, { sceneId: 'c1' });
  // com um combate andando, a cena também pode esperar o combate acabar
  const fight = nextStep({ ...NOW_ROWS[3][1], pulse: { combat: { active: true, round: 2 } } });
  assert.deepEqual([fight.id, fight.secondary.id, fight.secondary.label], ['J4', 'startSceneLater', 'Guardar para depois do combate']);
  assert.equal(at(4).secondary.id, 'endSession');
  assert.equal(at(5).action.id, 'sceneNow');
  assert.equal(at(5).secondary.id, 'plan');
});

test('Agora: no máximo 1 cartão — com uma cena em andamento quem guia é a Cena agora', () => {
  const ctx = NOW_ROWS[3][1];
  assert.equal(nextStep({ ...ctx, sceneNow: ctx.plan.scenes[0] }), null);
  // sessão parada (ensaio): o J1 aparece mesmo com uma cena destacada no aparelho
  assert.equal(nextStep({ ...NOW_ROWS[0][1], sceneNow: ctx.plan.scenes[0] }).id, 'J1');
  // o "Anteriormente em…" já mostrado hoje: segue para a 1ª cena
  assert.equal(nextStep({ ...NOW_ROWS[2][1], recap: { has: true, shown: true } }).id, 'J4');
  // a cena escolhida na folha Começar vem no lugar da 1ª
  const pick = nextStep({ ...ctx, startScene: 'c2' });
  assert.equal(pick.text, 'Comece pela cena: Ponte.');
  assert.deepEqual(pick.payload, { sceneId: 'c2' });
  // campanha encerrada: nada
  assert.equal(nextStep({ ...ctx, campaign: live({ status: 'closed' }) }), null);
});

test('Agora: com a sessão parada só valem o J2 e o J1 ("Pular" não traz cartões de sessão ao vivo)', () => {
  const mem = new Map();
  const storage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
  // J2 › Pular › J1 › Pular › nada (nem "Comece pela primeira cena", nem J3/J5/J6)
  const base = { where: 'now', campaign: stopped(), plan: played(), live: false, recap: { has: false, shown: false } };
  const j2 = nextStep(base);
  assert.equal(j2.id, 'J2');
  const j1 = nextStep({ ...base, skips: writeSkip(8, j2.id, j2.sig, storage) });
  assert.equal(j1.id, 'J1');
  assert.equal(nextStep({ ...base, skips: writeSkip(8, j1.id, j1.sig, storage) }), null);
  // as mesmas regras, cada uma com os dados que a disparariam ao vivo
  for (const plan of [ready(), allDone(), emptyPlan()]) {
    const skips = { J1: nextStep({ ...base, plan }).sig };
    assert.equal(nextStep({ ...base, plan, skips, recap: { has: true, shown: false } })?.id ?? null, null, JSON.stringify(plan.scenes.map(x => x.done)));
  }
});

test('Agora: o J1 diz o que falta (fichas, Tela, resumo) e o Pular do J2 lembrado', () => {
  const items = readyItems({ campaign: stopped({ members: [dm, ana, bruno], onboarding: {} }), plan: emptyPlan(), recap: { has: false }, lang: 'pt' });
  assert.deepEqual(items.map(x => [x.id, x.ok, x.text]), [
    ['plan', false, 'plano sem cenas'], ['party', false, '1 de 2 com ficha'], ['tv', false, 'Tela'], ['recap', false, 'sem resumo da 3'],
  ]);
  assert.equal(items[2].action.id, 'tvLink');
  // a TV conectada no pulso cru (screen.tvLive) conta como Tela testada (a Tela nunca mente)
  const raw = readyItems({ campaign: stopped({ onboarding: {} }), plan: ready(), pulse: { screen: { tvLive: 1 } }, recap: null });
  assert.deepEqual(raw.find(x => x.id === 'tv'), { id: 'tv', ok: true, text: 'Tela testada', action: null });
  assert.equal(nextStep({ where: 'now', campaign: stopped({ onboarding: {} }), plan: ready(), live: false, pulse: { screen: { tvLive: 1 } } })
    .items.find(x => x.id === 'tv').ok, true);
  assert.equal(nextStep({ campaign: camp({ onboarding: {} }), plan: ready(), pulse: { screen: { tvLive: 2 } } }).id, 'N9');
  // sem saber do resumo (ainda carregando) o item não aparece; 1ª sessão também não
  assert.equal(readyItems({ campaign: stopped(), plan: ready(), recap: null }).length, 3);
  assert.equal(readyItems({ campaign: camp({ state: {} }), plan: ready(), recap: { has: false } }).length, 3);
  const mem = new Map();
  const storage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
  const j2 = nextStep(NOW_ROWS[1][1]);
  const skips = writeSkip(7, j2.id, j2.sig, storage);
  assert.equal(nextStep({ ...NOW_ROWS[1][1], skips }).id, 'J1');
  assert.deepEqual(readSkips(7, storage), { J2: 'ended:3' });
});

test('Agora (V12): J2 depois do Encerrar, com o plano da próxima já levado, até o resumo ser salvo', () => {
  const ended = (over = {}) => camp({ state: { session: '3', diarySessions: { 3: { startedAt: T0, endedAt: '2026-10-24T20:10:00Z' } } }, ...over });
  const next = { ...ready(), forSession: 4 };   // "Levar para a Sessão 4": o plano já é o da próxima
  const j2 = nextStep({ where: 'now', campaign: ended(), plan: next, live: false, length: '2h10', recap: { has: false } });
  assert.deepEqual([j2.id, j2.text, j2.action.id, j2.secondary.id], ['J2', 'Sessão 3 encerrada · 2h10', 'recap', 'preparePlan']);
  // o endedAt do pulso também vale (a campanha completa ainda não chegou)
  assert.equal(nextStep({ where: 'now', campaign: stopped(), plan: next, live: false, pulse: { endedAt: '2026-10-24T20:10:00Z' }, recap: { has: false } }).id, 'J2');
  // resumo da 3 salvo: o J1, com "✓ resumo da 3"
  const j1 = nextStep({ where: 'now', campaign: ended(), plan: next, live: false, recap: { has: true } });
  assert.equal(j1.id, 'J1');
  assert.deepEqual(j1.items.find(x => x.id === 'recap'), { id: 'recap', ok: true, text: 'resumo da 3' });
  // sem endedAt e com o plano da próxima (encerrada à moda antiga, plano novo): J1
  assert.equal(nextStep({ where: 'now', campaign: stopped(), plan: next, live: false }).id, 'J1');
  // o resumo ainda chegando (servidor lento): nenhum cartão — nem o J2 que viraria J1, nem o J1
  for (const recap of [null, undefined, {}]) {
    assert.equal(nextStep({ where: 'now', campaign: ended(), plan: next, live: false, recap }), null, JSON.stringify(recap));
  }
  assert.equal(sessionWasPlayed({ campaign: ended(), plan: next }), true);
  assert.equal(sessionWasPlayed({ campaign: stopped(), plan: played() }), true, 'plano da sessão jogada (servidor antigo)');
  assert.equal(sessionWasPlayed({ campaign: stopped(), plan: next }), false);
  assert.equal(sessionWasPlayed({ campaign: ended(), plan: next, live: true }), false);
  // sessão que nunca começou: o J1 não espera o resumo
  assert.equal(nextStep({ where: 'now', campaign: camp({ state: {} }), plan: ready(), live: false, recap: null }).id, 'J1');
});
