// O cartão "O que fazer agora" do Plano (especificação §1.2 e §3.1): uma linha por regra
// N1–N9 com os dados mínimos que a disparam, só 1 cartão por vez e o "Pular" lembrado no
// aparelho até os dados da regra mudarem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinNames, nextStep, PLAN_RULES, readSkips, reminderText, writeSkip } from '../src/shell/next-step.js';
import { addScene, addSecret, emptyPlan, normalizePlan } from '../src/prep/next-session.js';

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
});
