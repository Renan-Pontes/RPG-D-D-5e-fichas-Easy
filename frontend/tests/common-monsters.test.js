import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BESTIARY } from '../data/bestiary.js';
import { COMMON_MONSTERS, fold, matchesQuery, partyLevelOf, rankMonsters } from '../src/combat/common-monsters.js';

const search = (q, opts) => rankMonsters(BESTIARY.filter(m => matchesQuery(m, q)), q, opts);

test('"goblin": o 1º é o Goblin Guerreiro, com "o mais comum"', () => {
  const r = search('goblin', { partyLevel: 1 });
  assert.equal(r.list[0].id, 'goblin-warrior');
  assert.equal(r.commonId, 'goblin-warrior');
  // o Goblin Lacaio (que vinha primeiro pelo ND) continua na lista
  assert.ok(r.list.some(m => m.id === 'goblin-minion'));
});

test('nome exato do SRD primeiro; o resto pelo ND perto do nível do grupo', () => {
  const lobo = search('lobo', { partyLevel: 1 });
  assert.equal(lobo.list[0].id, 'wolf');
  assert.equal(lobo.commonId, 'wolf');
  const orc = search('Orc');
  assert.equal(orc.list[0].id, 'orc');
  // fora da lista dos comuns: ND mais perto do nível 5 antes
  const dragon = search('dragão vermelho', { partyLevel: 5 });
  assert.equal(dragon.commonId, null);
  assert.equal(dragon.list[0].id, 'red-dragon-wyrmling');   // ND 4 é o mais perto de 5
});

test('a busca ignora acentos e a ordem do catálogo fica sem busca', () => {
  assert.equal(fold('Dragão'), 'dragao');
  assert.ok(matchesQuery({ id: 'x', name: { pt: 'Dragão Branco', en: 'White Dragon' } }, 'dragao'));
  assert.ok(matchesQuery({ id: 'giant-rat', name: { pt: 'Rato Gigante' } }, 'giant rat'));
  const list = [{ id: 'b' }, { id: 'a' }];
  assert.deepEqual(rankMonsters(list, '  '), { list, commonId: null });
});

test('meus monstros não levam o selo e a lista fixa tem uns 30', () => {
  const mine = { id: 'goblin-warrior', custom: true, name: { pt: 'Goblin Guerreiro (meu)' } };
  const r = rankMonsters([mine, ...BESTIARY.filter(m => matchesQuery(m, 'goblin'))], 'goblin');
  assert.equal(r.commonId, 'goblin-warrior');
  assert.notEqual(r.list[0], mine);
  assert.ok(COMMON_MONSTERS.length >= 28 && COMMON_MONSTERS.length <= 40);
  for (const id of COMMON_MONSTERS) assert.ok(BESTIARY.some(m => m.id === id), id);
});

test('nível médio do grupo', () => {
  assert.equal(partyLevelOf([{ role: 'dm' }, { character: { data: { level: 3 } } }, { character: { summary: { level: 5 } } }]), 4);
  assert.equal(partyLevelOf([]), null);
});
