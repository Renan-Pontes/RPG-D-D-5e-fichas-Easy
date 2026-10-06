import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNewEntry, newEntryIds, cardKey, shouldToastCard, revealedSince, toastTitle,
  paragraphs, atlasEntries, kindCounts, charLine, healthLabel, screenMode, absUrl, handoutStyle,
  secretSessionLabel,
} from '../src/player/player-model.js';

const NOW = Date.parse('2026-10-06T20:00:00Z');
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

test('selo Novo!: revelado depois da última visita', () => {
  assert.equal(isNewEntry({ revealedAt: iso(1000) }, iso(5000)), true);
  assert.equal(isNewEntry({ revealedAt: iso(9000) }, iso(5000)), false);
  assert.equal(isNewEntry({ revealedAt: iso(9000) }, null), true, 'nunca abriu a aba: tudo é novo');
  assert.equal(isNewEntry({ revealedAt: null }, null), false);
  const ids = newEntryIds([{ id: 1, revealedAt: iso(1000) }, { id: 2, revealedAt: iso(9000) }], iso(5000));
  assert.deepEqual([...ids], [1]);
});

test('toast do cartão: só entrada, só quando muda, só se recente', () => {
  const card = { type: 'entry', entryId: 5, title: 'Irmã Velna', at: iso(2000) };
  assert.equal(shouldToastCard(card, '', NOW), true);
  assert.equal(shouldToastCard(card, cardKey(card), NOW), false, 'mesmo cartão não repete');
  assert.equal(shouldToastCard({ ...card, at: iso(10 * 60 * 1000) }, '', NOW), false, 'velho demais');
  assert.equal(shouldToastCard({ type: 'recap', title: 'x', at: iso(1000) }, '', NOW), false);
  assert.equal(shouldToastCard(null, '', NOW), false);
  assert.notEqual(cardKey(card), cardKey({ ...card, at: iso(1) }), 'mostrar de novo gera outra chave');
});

test('revealedSince ordena do mais novo e respeita o corte', () => {
  const list = [
    { id: 1, name: 'A', revealedAt: iso(30000) },
    { id: 2, name: 'B', revealedAt: iso(1000) },
    { id: 3, name: 'C', revealedAt: iso(5000) },
    { id: 4, name: 'D', revealedAt: null },
  ];
  assert.deepEqual(revealedSince(list, iso(10000)).map(e => e.id), [2, 3]);
  assert.equal(revealedSince(list, null).length, 3);
});

test('título do toast em pt e en', () => {
  assert.equal(toastTitle(['Irmã Velna'], 'pt'), 'O mestre revelou: Irmã Velna');
  assert.equal(toastTitle(['Velna', 'Brumafria', 'X'], 'pt'), 'O mestre revelou: Velna e mais 2');
  assert.equal(toastTitle(['Velna'], 'en'), 'The DM revealed: Velna');
  assert.match(toastTitle([], 'pt'), /revelou algo novo/);
});

test('parágrafos separados por linha em branco', () => {
  assert.deepEqual(paragraphs('a\n\n\n b \n\n'), ['a', 'b']);
  assert.deepEqual(paragraphs(''), []);
});

test('atlas: novos primeiro, documentos fora do "tudo"', () => {
  const list = [
    { id: 1, kind: 'npc', name: 'B', sort: 1 },
    { id: 2, kind: 'place', name: 'A', sort: 2 },
    { id: 3, kind: 'handout', name: 'Carta', sort: 3 },
  ];
  assert.deepEqual(atlasEntries(list, { newIds: new Set([2]) }).map(e => e.id), [2, 1]);
  assert.deepEqual(atlasEntries(list, { kind: 'handout' }).map(e => e.id), [3]);
  assert.deepEqual(atlasEntries(list, { kind: 'npc' }).map(e => e.id), [1]);
  assert.deepEqual(kindCounts(list), { npc: 1, place: 1, handout: 1 });
});

test('linha do personagem traduzida (nada de "elf-wood druid 2")', () => {
  const line = charLine({ race: 'elf-wood', className: 'druid', level: 2, classes: [{ id: 'druid', level: 2 }] }, 'pt');
  assert.equal(line, 'Elfo da Floresta · Druida 2');
  assert.equal(charLine({ race: 'human', className: 'fighter', level: 3 }, 'pt'), 'Humano · Guerreiro 3');
  assert.equal(charLine(null, 'pt'), '');
});

test('rótulos pt/en', () => {
  assert.equal(healthLabel('bloodied', 'pt'), 'Sangrando');
  assert.equal(healthLabel('down', 'en'), 'Down');
  assert.equal(handoutStyle('wanted'), 'wanted');
  assert.equal(handoutStyle('zzz'), 'scroll');
  assert.equal(secretSessionLabel({ session: 3 }, 'pt'), 'Descoberto na sessão 3');
});

test('modo do telão: combate > recap > cartão > capa', () => {
  assert.equal(screenMode({}), 'rest');
  assert.equal(screenMode({ card: { type: 'entry' } }), 'card');
  assert.equal(screenMode({ card: { type: 'scene' } }), 'card');
  assert.equal(screenMode({ card: { type: 'recap' } }), 'recap');
  assert.equal(screenMode({ card: { type: 'entry' }, combat: { active: true } }), 'combat');
  assert.equal(screenMode({ combat: { active: false } }), 'rest');
});

test('absUrl junta a base só em caminhos relativos', () => {
  assert.equal(absUrl('https://x.com', '/api/a'), 'https://x.com/api/a');
  assert.equal(absUrl('', '/api/a'), '/api/a');
  assert.equal(absUrl('https://x.com', 'data:image/png;base64,AA'), 'data:image/png;base64,AA');
  assert.equal(absUrl('x', null), null);
});
