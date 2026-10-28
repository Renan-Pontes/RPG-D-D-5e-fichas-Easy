import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionSummary, groupEntries, matchesFilter, entryIcon, combatNarration, entryTitle, entryBody, buildRecap, pickRecapGroup } from '../src/campaigns/diary-summary.js';

let n = 0;
const ev = (subtype, data = {}, extra = {}) => ({
  id: ++n, kind: 'event', subtype, title: '', body: '', data, hidden: false,
  session: 12, occurredAt: `2026-09-30T20:${String(n).padStart(2, '0')}:00Z`, ...extra,
});

const entries = [
  ev('session', { session: 12, title: 'A cripta' }),
  ev('combat', { phase: 'start', combatants: ['Thal', 'Goblin'] }),
  ev('combat', { phase: 'end', rounds: 3, defeated: ['Goblin', 'Orc'] }),
  ev('xp', { each: 150, characters: [{ id: 1, name: 'Thal' }, { id: 2, name: 'Kor' }] }),
  ev('xp', { each: 150, characters: [{ id: 1, name: 'Thal' }, { id: 2, name: 'Kor' }] }),
  ev('levelup', { characterName: 'Kor', level: 2 }),
  ev('levelup', { characterName: 'Kor', level: 3 }),
  ev('item', { items: [{ characterName: 'Thal', itemName: 'Espada +1', qty: 1 }, { characterName: 'Kor', itemName: 'Poção', qty: 2 }] }),
  ev('rest', { characters: ['Thal', 'Kor'] }),
  ev('roll', { rolls: [{ who: 'Thal', label: 'Ataque', crit: 'crit' }, { who: 'Kor', crit: 'fail' }] }),
  ev('note', {}, { kind: 'note', title: 'O anel do barão', body: 'Ele mentiu.' }),
  ev('note', {}, { kind: 'note', body: 'Segredo do mestre', hidden: true }),
  ev('summary', {}, { kind: 'note', body: 'resumo antigo' }),
];

test('resumo da sessão junta os eventos num texto legível', () => {
  const text = buildSessionSummary(entries, { lang: 'pt', session: 12, title: 'A cripta' });
  const lines = text.split('\n');
  assert.equal(lines[0], 'No último episódio… (Sessão 12 — A cripta)');
  assert.ok(text.includes('• Subiram de nível: Kor (nível 3)'), text);
  assert.ok(text.includes('• XP: +300 para Thal e Kor'), text);
  assert.ok(text.includes('• Itens obtidos: Espada +1 (Thal); Poção ×2 (Kor)'), text);
  assert.ok(text.includes('• Combates: 1 — derrotados: Goblin e Orc'), text);
  assert.ok(text.includes('• Descansos longos: 1'), text);
  assert.ok(text.includes('20 natural — Thal (Ataque)'), text);
  assert.ok(text.includes('• O anel do barão'), text);
  assert.ok(!text.includes('Segredo'), 'entrada oculta não entra no resumo');
  assert.ok(!text.includes('resumo antigo'), 'resumo anterior não entra');
});

test('resumo em inglês e sessão vazia', () => {
  const en = buildSessionSummary(entries, { lang: 'en', session: 12 });
  assert.ok(en.startsWith('Previously on… (Session 12)'));
  assert.ok(en.includes('Leveled up: Kor (level 3)'));
  assert.match(buildSessionSummary([], { lang: 'pt', session: 1 }), /Nada registrado/);
});

test('XP diferente por personagem é listado individualmente', () => {
  const text = buildSessionSummary([
    ev('xp', { each: 100, characters: [{ name: 'Thal' }, { name: 'Kor' }] }),
    ev('xp', { each: 50, characters: [{ name: 'Thal' }] }),
  ]);
  assert.ok(text.includes('XP: Thal +150, Kor +100'), text);
});

test('agrupa por sessão e, sem sessão, por dia', () => {
  const groups = groupEntries([
    { id: 1, session: 13, occurredAt: '2026-10-01T20:00:00' },
    { id: 2, session: 12, occurredAt: '2026-09-30T20:00:00' },
    { id: 3, session: 12, occurredAt: '2026-09-30T19:00:00' },
    { id: 4, session: null, occurredAt: '2026-09-20T19:00:00' },
    { id: 5, session: null, occurredAt: '2026-09-19T19:00:00' },
  ]);
  assert.deepEqual(groups.map(g => g.key), ['s13', 's12', 'd2026-09-20', 'd2026-09-19']);
  assert.deepEqual(groups[1].entries.map(e => e.id), [2, 3]);
});

test('filtro por tipo e ícones', () => {
  assert.ok(matchesFilter({ kind: 'note', subtype: 'summary' }, 'note'));
  assert.ok(!matchesFilter({ kind: 'event', subtype: 'xp' }, 'note'));
  assert.ok(matchesFilter({ kind: 'event', subtype: 'xp' }, 'all'));
  assert.equal(entryIcon({ kind: 'event', subtype: 'combat' }), '⚔');
  assert.equal(entryIcon({ kind: 'note', subtype: 'summary' }), '📜');
});


const combatEnd = {
  phase: 'end', rounds: 4, pcs: ['Thalion', 'Mira'],
  monsters: [{ name: 'Goblin', count: 3, defeated: 3 }], downs: { Mira: 1 }, winner: 'party',
};

test('combate narrado em pt e en a partir dos dados do servidor', () => {
  assert.equal(combatNarration(combatEnd, 'pt'), 'Thalion e Mira venceram 3 inimigos (Goblin ×3) em 4 rodadas; Mira caiu uma vez.');
  assert.equal(combatNarration(combatEnd, 'en'), 'Thalion and Mira defeated 3 foes (Goblin ×3) in 4 rounds; Mira went down once.');
  assert.equal(combatNarration({ ...combatEnd, pcs: ['Kor'], downs: {}, rounds: 1 }, 'pt'), 'Kor venceu 3 inimigos (Goblin ×3) em 1 rodada.');
  assert.match(combatNarration({ ...combatEnd, winner: null, downs: {} }, 'pt'), /^Combate encerrado em 4 rodadas contra Goblin ×3\.$/);
  assert.match(combatNarration({ ...combatEnd, winner: 'monsters', downs: {} }, 'pt'), /caíram diante de Goblin ×3/);
  assert.equal(combatNarration({ phase: 'end', rounds: 2, defeated: ['Orc'] }, 'pt'), '', 'evento antigo sem resumo estruturado');
  assert.equal(combatNarration({ phase: 'start' }, 'pt'), '');
});

test('título e texto da entrada no idioma da tela', () => {
  const end = { kind: 'event', subtype: 'combat', title: 'Combate encerrado', body: 'texto pt', data: combatEnd };
  assert.equal(entryTitle(end, 'pt'), 'Combate encerrado');
  assert.equal(entryTitle(end, 'en'), 'Combat ended');
  assert.match(entryBody(end, 'en'), /^Thalion and Mira defeated/);
  assert.equal(entryBody({ ...end, editedAt: '2026-10-01' }, 'en'), 'texto pt', 'texto editado à mão é respeitado');
  const grant = { kind: 'event', subtype: 'levelgrant', title: 'Nível liberado para Kor (nível 3)', data: { grants: [{ characterName: 'Kor', toLevel: 3 }] } };
  assert.equal(entryTitle(grant, 'pt'), 'Nível liberado para Kor (nível 3)');
  assert.equal(entryTitle(grant, 'en'), 'Level up unlocked for Kor (level 3)');
  assert.equal(entryTitle({ kind: 'note', title: 'Minha nota' }, 'en'), 'Minha nota', 'nota do usuário não é traduzida');
  assert.equal(entryTitle({ kind: 'event', subtype: 'reveal', title: 'Revelado: Velna', data: { entryName: 'Velna', visibility: 'revealed', secretIds: [] } }, 'en'), 'Revealed: Velna');
  assert.equal(entryIcon({ kind: 'event', subtype: 'levelgrant' }), '✨');
  assert.ok(matchesFilter({ kind: 'event', subtype: 'levelgrant' }, 'levelup'), 'liberação conta como Níveis');
  assert.ok(matchesFilter({ kind: 'event', subtype: 'reveal' }, 'reveal'));
});

test('"Anteriormente em…" monta um rascunho em prosa sem o que é oculto', () => {
  const list = [
    ev('session', { session: 12 }),
    ev('combat', combatEnd),
    ev('reveal', { entryName: 'Irmã Velna', visibility: 'revealed' }),
    ev('item', { items: [{ characterName: 'Thal', itemName: 'Espada +1', qty: 1 }] }),
    ev('levelup', { characterName: 'Kor', level: 3 }),
    ev('note', {}, { kind: 'note', title: 'O anel', body: 'Ele mentiu.' }),
    ev('note', {}, { kind: 'note', body: 'Segredo do mestre', hidden: true }),
  ];
  const r = buildRecap(list, { lang: 'pt', session: 12, title: 'A cripta', campaignName: 'Reino Esquecido' });
  assert.equal(r.title, 'Anteriormente em Reino Esquecido…');
  assert.ok(r.text.startsWith('Sessão 12 — A cripta'), r.text);
  assert.ok(r.text.includes('Thalion e Mira venceram 3 inimigos'), r.text);
  assert.ok(r.text.includes('Descobriram Irmã Velna.'), r.text);
  assert.ok(r.text.includes('Thal ficou com Espada +1.'), r.text);
  assert.ok(r.text.includes('Kor (nível 3)'), r.text);
  assert.ok(r.text.includes('• O anel: Ele mentiu.'), r.text);
  assert.ok(!r.text.includes('Segredo'), 'oculto fica de fora');
  assert.ok(r.text.length <= 5000);
  const en = buildRecap([], { lang: 'en' });
  assert.equal(en.title, 'Previously…');
  assert.match(en.text, /Write here/);
});

test('recap escolhe a última sessão com algo além da abertura', () => {
  const groups = groupEntries([
    { id: 9, session: 13, subtype: 'session', kind: 'event', occurredAt: '2026-10-02T20:00:00' },
    { id: 8, session: 12, subtype: 'xp', kind: 'event', occurredAt: '2026-09-30T21:00:00' },
    { id: 7, session: 12, subtype: 'session', kind: 'event', occurredAt: '2026-09-30T20:00:00' },
  ]);
  assert.equal(pickRecapGroup(groups), 's12');
  assert.equal(pickRecapGroup([]), null);
});

// ------------------------------------------------------------------ V12: o rascunho rico e os momentos da noite
import { playedScenes, sessionChecks, checkResultLine, shownNames, nightMoments, nightMomentLine } from '../src/campaigns/diary-summary.js';

const plan = {
  scenes: [
    { id: 'c1', text: 'Briga na taverna', done: true },
    { id: 'c2', text: 'Ponte velha sobre o Rio Brumoso\nnotas do mestre', done: false },
    { id: 'c3', text: 'Capela', done: false },
    { id: 'c4', text: '', done: true },
  ],
};
const perception = {
  id: 1, label: 'Percepção', dc: 15, dcHidden: false, createdAt: '2026-10-24T19:00:00Z',
  targets: [
    { characterId: 1, response: { total: 17 }, outcome: 'pass' }, { characterId: 2, response: { total: 16 }, outcome: 'pass' },
    { characterId: 3, response: { total: 18 }, outcome: 'pass' }, { characterId: 4, response: null, outcome: null },
  ],
};

test('V12: cenas jogadas são as feitas e a de "agora", com o nome (1ª linha)', () => {
  assert.deepEqual(playedScenes(plan, 'c2').map(s => s.id), ['c1', 'c2']);
  assert.deepEqual(playedScenes(plan).map(s => s.id), ['c1']);
  assert.deepEqual(playedScenes(null), []);
  // a feita numa sessão anterior (doneBefore) não foi jogada hoje
  assert.deepEqual(playedScenes(plan, 'c2', ['c1', 'c4']).map(s => s.id), ['c2']);
});

test('V12: testes da sessão com o resultado; CD secreta não aparece', () => {
  assert.deepEqual(sessionChecks([perception, { ...perception, id: 2, createdAt: '2026-10-20T19:00:00Z' }], '2026-10-24T18:00:00Z', '2026-10-24T21:00:00Z').map(c => c.id), [1]);
  assert.equal(checkResultLine(perception, 'pt'), 'Percepção CD 15: 3 de 4 passaram');
  assert.equal(checkResultLine(perception, 'en'), 'Percepção DC 15: 3 of 4 passed');
  // CD secreta: só quantos responderam (quantos passaram entregaria a CD na Tela e na Crônica)
  assert.equal(checkResultLine({ ...perception, dcHidden: true }, 'pt'), 'Percepção: 3 responderam');
  assert.equal(checkResultLine({ ...perception, dcHidden: true }, 'en'), 'Percepção: 3 answered');
  const secret = buildRecap([], { lang: 'pt', checks: [{ ...perception, dcHidden: true, dc: 25 }] }).text;
  assert.ok(!/passou|passaram|25/.test(secret), secret);
  assert.equal(checkResultLine({ ...perception, dc: null }, 'pt'), 'Percepção: 3 responderam');
  assert.equal(checkResultLine({ ...perception, targets: [{ response: null }] }, 'pt'), '');
  assert.deepEqual(shownNames([{ t: 'B'.repeat(60), k: 'card' }]), [`${'B'.repeat(59)}…`]);
  assert.deepEqual(shownNames([{ t: 'Borin', k: 'card' }, { t: 'Imagem', k: 'image', h: true }, { t: 'Ponte', k: 'scene' }, { t: 'Borin', k: 'card' }, { t: 'x', k: 'recap' }]), ['Borin', 'uma imagem']);
  // "Só a imagem" de oculto sem legenda: "uma imagem" na língua do rascunho; com legenda, a legenda
  assert.deepEqual(shownNames([{ t: '', k: 'image', h: true }], 'en'), ['an image']);
  assert.deepEqual(shownNames([{ t: '', k: 'image', h: true }, { t: 'Imagem', k: 'image', h: true }, { t: 'Uma porta', k: 'image', h: true }], 'pt'), ['Uma porta', '2 imagens']);
  const en = buildRecap([], { lang: 'en', shown: [{ t: '', k: 'image', h: true }] }).text;
  assert.ok(en.includes('On screen: an image.') && !en.includes('Imagem'), en);
});

test('V12: o rascunho cita a cena jogada, o teste com resultado, a imagem mostrada e o combate', () => {
  const list = [
    ev('session', { session: 4 }),
    ev('combat', { phase: 'end', rounds: 2, pcs: ['Pipo', 'Dagna'], monsters: [{ name: 'Goblin', count: 2, defeated: 2 }], downs: {}, winner: 'party', defeated: ['Goblin #1', 'Goblin #2'] }),
    ev('plan', { session: 4 }, { hidden: true, title: 'Plano da Sessão 4' }),
    ev('session', { session: 4, phase: 'end', length: '2h10' }, { title: 'Sessão 4 terminou · 2h10' }),
  ];
  const r = buildRecap(list, { lang: 'pt', session: 4, campaignName: 'Brumafria', plan, sceneId: 'c2', checks: [perception],
    shown: [{ t: 'Bartolomeu', k: 'card' }, { t: 'Ponte velha sobre o Rio Brumoso', k: 'scene' }] });
  assert.ok(r.text.startsWith('Sessão 4\n\n✓ Briga na taverna\n✓ Ponte velha sobre o Rio Brumoso\n\n'), r.text);
  assert.ok(r.text.includes('Pipo e Dagna venceram 2 inimigos (Goblin ×2) em 2 rodadas.'), r.text);
  assert.ok(r.text.includes('Testes: Percepção CD 15: 3 de 4 passaram.'), r.text);
  assert.ok(r.text.includes('Na Tela: Bartolomeu.'), r.text);
  assert.ok(!r.text.includes('notas do mestre'), 'as notas da cena (2ª linha em diante) são só do mestre');
  assert.ok(!r.text.includes('terminou'), 'o fim da sessão não entra no texto');
  // combate encerrado antes do fim: as rodadas e quem caiu (só os monstros)
  const cut = buildRecap([ev('combat', { phase: 'end', rounds: 1, pcs: ['Pipo'], monsters: [{ name: 'Goblin', count: 2, defeated: 1 }], downs: {}, winner: null, defeated: ['Goblin #1', 'Pipo'] })], { lang: 'pt' });
  assert.ok(cut.text.includes('Combate encerrado em 1 rodada contra Goblin ×2. Derrotados: 1 de 2 Goblin.'), cut.text);
  const en = buildRecap([], { lang: 'en', plan, sceneId: 'c2', checks: [perception], shown: [{ t: 'Borin', k: 'card' }] });
  assert.ok(en.text.includes('Checks: Percepção DC 15: 3 of 4 passed.') && en.text.includes('On screen: Borin.'), en.text);
});

test('V12: "Momentos da noite" por personagem (só o mestre vê)', () => {
  const rows = nightMoments({
    party: [{ id: 1, name: 'Pipo Mão-Leve' }, { id: 3, name: 'Kaelor Escama-de-Ouro' }],
    spotlights: { 1: [{ id: 'm1', kind: 'shine', text: 'fechadura', done: 4 }, { id: 'm2', kind: 'push', text: 'velho', done: 2 }],
      3: [{ id: 'm1', kind: 'hook', text: 'o irmão', done: null }] },
    checks: [perception], session: 4,
  });
  assert.deepEqual(rows.map(r => [r.id, r.tests, r.warn]), [[1, 1, false], [3, 1, true]]);
  assert.equal(nightMomentLine(rows[0], 'pt'), 'Pipo · 1 teste · ★ fechadura ✓');
  assert.equal(nightMomentLine(rows[1], 'pt'), 'Kaelor · 1 teste · ✎ o irmão · ⚠ sem momento hoje');
  assert.equal(nightMomentLine({ ...rows[1], tests: 0, moments: [] }, 'en'), 'Kaelor · 0 checks · ⚠ no moment tonight');
});

test('V12: título do fim da sessão e do plano arquivado em inglês; ícone do plano', () => {
  const end = { kind: 'event', subtype: 'session', title: 'Sessão 4 terminou · 2h10', data: { session: 4, phase: 'end', length: '2h10' } };
  assert.equal(entryTitle(end, 'pt'), 'Sessão 4 terminou · 2h10');
  assert.equal(entryTitle(end, 'en'), 'Session 4 ended · 2h10');
  assert.equal(entryTitle({ ...end, data: { session: 4, phase: 'end', length: null } }, 'en'), 'Session 4 ended');
  assert.equal(entryTitle({ kind: 'event', subtype: 'plan', title: 'Plano da Sessão 4', data: { session: 4 } }, 'en'), 'Session 4 plan');
  assert.equal(entryIcon({ kind: 'event', subtype: 'plan' }), '📋');
});
