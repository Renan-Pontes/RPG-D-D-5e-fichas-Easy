import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encounterGroups, encounterBody, groupsTotal, initiativeRows, legacyBodies, openInitiativeCheck, setupSteps,
  useInitiatives, useLabel,
} from '../src/combat/encounter-setup.js';
import { findMonster, monsterForCombat } from '../data/bestiary.js';

const resolve = (e) => findMonster(e.monsterId) || e.snapshot || null;

test('o combate da cena vira os grupos do POST /encounter (com o snapshot do bestiário)', () => {
  const groups = encounterGroups([
    { monsterId: 'goblin-warrior', name: 'Goblin Guerreiro', count: 2 },
    { monsterId: 'nao-existe', name: 'Sumiu', count: 1 },
    { monsterId: 'mine-1', name: 'Meu', count: 1, snapshot: { id: 'mine-1', name: 'Meu Bicho', hp: 5, size: 'Large' } },
  ], { resolve, toCombat: monsterForCombat, lang: 'pt' });
  assert.equal(groups.length, 2);
  assert.equal(groups[0].name, 'Goblin Guerreiro');
  assert.equal(groups[0].count, 2);
  assert.ok(Array.isArray(groups[0].monster.actions) && groups[0].monster.actions.length > 0);
  assert.equal(groups[1].tokenScale, 2);
  assert.equal(groupsTotal(groups), 3);
});

test('o corpo do POST: opId, Trocar/Somar, todos os personagens, iniciativa e mapa', () => {
  const groups = [{ monster: { id: 'g' }, name: 'G', count: 2, initiative: null }, { monster: { id: 'o' }, count: 1, initiative: 12, tokenScale: 2 }];
  const body = encounterBody({ opId: 'op-1234567', groups, mode: 'replace', pcs: true, askInitiative: true,
    map: { advId: 1, nodeId: 'n3' }, scene: { advId: 1, nodeId: 'n3', name: 'Ponte' }, lang: 'pt' });
  assert.deepEqual(body, {
    opId: 'op-1234567', mode: 'replace', lang: 'pt', monsterInit: 'each', start: false, askInitiative: true,
    monsters: [{ monster: { id: 'g' }, count: 2 }, { monster: { id: 'o' }, count: 1, initiative: 12, tokenScale: 2 }],
    pcs: 'all', map: { advId: 1, nodeId: 'n3' }, scene: { advId: 1, nodeId: 'n3', name: 'Ponte' },
  });
  const none = encounterBody({ opId: 'x', groups: [], pcs: false, map: 'keep' });
  assert.equal(none.pcs, undefined);
  assert.equal(none.map, undefined);
});

const combat = {
  active: false, combatants: [
    { id: 'g1', type: 'monster', name: 'Goblin #1', initiative: 14 },
    { id: 'a', type: 'pc', character_id: 1, name: 'Dagna', initiative: 10, init_guess: true },
    { id: 'b', type: 'pc', character_id: 2, name: 'Kaelor', initiative: 10, init_guess: true },
    { id: 'c', type: 'pc', character_id: 3, name: 'Elarion', initiative: 10, init_guess: true },
    { id: 'd', type: 'pc', character_id: 4, name: 'Pipo', initiative: 10, init_guess: true },
  ],
};
const check = {
  id: 9, kind: 'custom', key: 'initiative', status: 'open', createdAt: '2026-10-27T10:00:00Z', targets: [
    { characterId: 1, response: { total: 14 } }, { characterId: 2, response: { total: 4 } },
    { characterId: 3, response: { total: 18 } }, { characterId: 4, response: null },
  ],
};

test('as respostas da iniciativa entram na linha; "Usar e começar (3 de 4)" deixa 10 e ✎ para quem falta', () => {
  const rows = initiativeRows(combat, check);
  assert.deepEqual(rows.map(r => [r.name, r.total, r.answered]), [
    ['Dagna', 14, true], ['Kaelor', 4, true], ['Elarion', 18, true], ['Pipo', null, false]]);
  const use = useInitiatives(rows);
  assert.deepEqual(use.initiatives, [
    { id: 'a', initiative: 14 }, { id: 'b', initiative: 4 }, { id: 'c', initiative: 18 }, { id: 'd', initiative: 10, guess: true }]);
  assert.equal(useLabel(use, 'pt'), 'Usar e começar (3 de 4)');
  // quem já tinha a iniciativa digitada (sem ✎) e não respondeu fica como estava
  const typed = useInitiatives(rows.map(r => (r.name === 'Pipo' ? { ...r, guess: false } : r)));
  assert.deepEqual(typed.initiatives.map(x => x.id), ['a', 'b', 'c']);
  assert.equal(useLabel(typed, 'pt'), 'Usar e começar');
  assert.equal(useLabel({ answered: 4, total: 4 }, 'en'), 'Use and start');
  assert.equal(openInitiativeCheck([{ ...check, id: 1, createdAt: '2026-10-26' }, check, { kind: 'skill', status: 'open' }]).id, 9);
  assert.equal(openInitiativeCheck([{ ...check, status: 'closed' }]), null);
});

test('"Monte o combate em 3 passos": cada passo ganha ✓', () => {
  assert.deepEqual(setupSteps({ combatants: [] }).map(s => s.done), [false, false, false]);
  assert.deepEqual(setupSteps(combat).map(s => s.done), [true, true, false]);
  const typed = { combatants: combat.combatants.map(c => ({ ...c, init_guess: undefined })) };
  assert.deepEqual(setupSteps(typed).map(s => s.done), [true, true, true]);
});

test('servidor antigo: 1 POST por combatente, mas cada um numa casa livre e iniciativa por monstro', () => {
  const rolls = [0.1, 0.9];
  const bodies = legacyBodies({
    groups: [{ monster: { id: 'g', name: 'Goblin', abilities: { dex: 14 } }, name: 'Goblin', count: 2, initiative: null }],
    members: [1, 2, 3, 4].map(id => ({ character: { id } })),
    combatants: [], rng: () => rolls.shift() ?? 0.5,
  });
  assert.equal(bodies.length, 6);
  assert.deepEqual(bodies.slice(0, 2).map(b => [b.monster.name, b.initiative]), [['Goblin #1', 5], ['Goblin #2', 21]]);
  const cells = new Set(bodies.map(b => `${b.position.x},${b.position.y}`));
  assert.equal(cells.size, 6);                               // ninguém empilhado (D1)
  assert.ok(bodies.slice(2).every(b => b.type === 'pc' && b.initiative === 10));
  // Somar: continua a numeração dos que já estão
  const more = legacyBodies({ groups: [{ monster: { id: 'g' }, name: 'Goblin', count: 1, initiative: 8 }],
    combatants: [{ name: 'Goblin #1' }, { name: 'Goblin #2' }] });
  assert.equal(more[0].monster.name, 'Goblin #3');
});
