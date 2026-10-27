import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNewEntry, newEntryIds, cardKey, shouldToastCard, revealedSince, toastTitle,
  paragraphs, atlasEntries, kindCounts, charLine, healthLabel, screenMode, absUrl, handoutStyle,
  secretSessionLabel, combatStrip, turnJustStarted, myCombatTurn,
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
  // a TV mostra a faixa e a condição lado a lado: 0 PV não pode se chamar "Caído" (prone)
  assert.equal(healthLabel('down', 'pt'), 'Derrotado');
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

test('faixa do combate da Mesa (V13): vez, rodada, depois e SUA VEZ', () => {
  assert.equal(combatStrip(null), null);
  assert.equal(combatStrip({ active: false, round: 2 }), null, 'montado ou encerrado: sem faixa');
  const other = { active: true, round: 2, turnName: 'Goblin #2', nextName: 'Dagna', isMine: false, nextIsMine: true };
  assert.deepEqual(combatStrip(other), { mine: false, title: 'Vez de Goblin #2', sub: 'Rodada 2 · depois: você' });
  assert.deepEqual(combatStrip(other, 'en'), { mine: false, title: "Goblin #2's turn", sub: 'Round 2 · next: you' });
  const mine = { active: true, round: 3, turnName: 'Dagna', nextName: 'Elarion', isMine: true, nextIsMine: false };
  assert.deepEqual(combatStrip(mine), { mine: true, title: 'SUA VEZ', sub: 'Rodada 3 · depois: Elarion' });
  assert.deepEqual(combatStrip(mine, 'en'), { mine: true, title: 'YOUR TURN', sub: 'Round 3 · next: Elarion' });
  // só ela de pé: na vez dela não diz "depois: você"
  assert.equal(combatStrip({ ...mine, nextName: 'Dagna', nextIsMine: true }).sub, 'Rodada 3');
  // sem nome de quem age (vez fora da lista) e sem próximo
  assert.deepEqual(combatStrip({ active: true, round: 1, turnName: '', nextName: '' }),
    { mine: false, title: 'Combate', sub: 'Rodada 1' });
});

test('a vez chegou: vibra 1 vez, nunca ao abrir a Mesa', () => {
  const mine = { active: true, isMine: true };
  const theirs = { active: true, isMine: false };
  assert.equal(turnJustStarted(undefined, mine), false, 'abriu a Mesa já na vez dela');
  assert.equal(turnJustStarted(theirs, mine), true);
  assert.equal(turnJustStarted(null, mine), true, 'o combate começou na vez dela');
  assert.equal(turnJustStarted(mine, mine), false, 'a mesma vez não vibra de novo');
  assert.equal(turnJustStarted(mine, theirs), false);
  assert.equal(turnJustStarted(theirs, null), false);
});

test('painel de combate da ficha: o combatente dela e a vez', () => {
  const combat = { active: true, turnIndex: 1, combatants: [
    { id: 'g', type: 'monster', name: 'Goblin' },
    { id: 'd', type: 'pc', character_id: 7, name: 'Dagna' },
    { id: 'e', type: 'pc', character_id: 8, name: 'Elarion' },
  ] };
  assert.deepEqual(myCombatTurn(combat, 7), { me: combat.combatants[1], isMyTurn: true });
  assert.deepEqual(myCombatTurn(combat, 8), { me: combat.combatants[2], isMyTurn: false });
  assert.deepEqual(myCombatTurn(combat, '7'), { me: combat.combatants[1], isMyTurn: true }, 'id em texto');
  assert.deepEqual(myCombatTurn(combat, 9), { me: null, isMyTurn: false }, 'fora do combate');
  assert.deepEqual(myCombatTurn({ ...combat, active: false }, 7), { me: null, isMyTurn: false });
  assert.deepEqual(myCombatTurn(combat, null), { me: null, isMyTurn: false });
  assert.deepEqual(myCombatTurn(null, 7), { me: null, isMyTurn: false });
});
