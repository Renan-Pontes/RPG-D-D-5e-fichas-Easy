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
