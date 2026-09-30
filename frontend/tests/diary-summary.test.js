import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionSummary, groupEntries, matchesFilter, entryIcon } from '../src/campaigns/diary-summary.js';

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
