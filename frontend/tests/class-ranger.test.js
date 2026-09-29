import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';
import { CLASS_OPTIONS } from '../data/class-options/index.js';

const ranger = (level, extra = {}) => ({
  rulesVersion: '2024', className: 'ranger', level, abilities: { wis: 14 }, classOptions: [], ...extra,
});
const pendingPools = (p) => p.pendingChoices.filter(c => c.type === 'classOption').map(c => `${c.pool}:${c.missing}`).sort();

test('patrulheiro 2024: escolhas da classe base', () => {
  const lv1 = computeProgression(ranger(1));
  assert.deepEqual(pendingPools(lv1), ['weaponMastery:2']);
  const lv2 = computeProgression(ranger(2));
  assert.deepEqual(pendingPools(lv2), ['expertise:1', 'fightingStyle:1', 'languages:2', 'weaponMastery:2']);
  // Pendências genéricas antigas saem.
  assert.ok(!lv2.pendingChoices.some(c => c.type === 'fightingStyle' || c.type === 'expertise'));
  const lv9 = computeProgression(ranger(9, { subclass: 'hunter' }));
  assert.ok(pendingPools(lv9).includes('expertise:3'));
  assert.ok(!lv9.pendingChoices.some(c => c.type === 'expertise'));
});

test('patrulheiro 2024: Guerreiro Druídico abre 2 truques de druida', () => {
  const c = ranger(2, { classOptions: [{ classId: 'ranger', pool: 'fightingStyle', id: 'druidicWarrior', level: 2 }] });
  assert.ok(pendingPools(computeProgression(c)).includes('druidicWarriorCantrip:2'));
  const picks = { adds: [{ pool: 'druidicWarriorCantrip', id: 'guidance' }, { pool: 'druidicWarriorCantrip', id: 'starryWisp' }] };
  assert.equal(validateClassOptions(c, 'ranger', picks).valid, true);
  const done = { ...c, classOptions: [...c.classOptions, ...picks.adds.map(a => ({ classId: 'ranger', level: 2, ...a }))] };
  const prog = computeProgression(done);
  assert.ok(prog.autoCantrips.includes('guidance') && prog.autoCantrips.includes('starryWisp'));
});

test('patrulheiro 2024: textos e subclasses', () => {
  const rules = PROGRESSION_RULES_2024.ranger;
  assert.ok(rules.perLevel[1].features.some(f => f.id === 'favoredEnemy' && f.nameEn === 'Favored Enemy'));
  assert.ok(!/Ranger Spell Lis/.test(rules.perLevel[20].features[0].descEn));
  for (const id of ['hunter', 'beastmaster', 'gloomstalker', 'feywanderer', 'horizonwalker', 'monsterslayer', 'swarmkeeper', 'drakewarden']) {
    const sub = rules.subclassPerLevel[id];
    assert.ok(!sub.legacyCompatibility, `${id}: não deve ser conversão 2014`);
    for (const lv of [3, 7, 11, 15]) assert.ok(sub[lv]?.features?.length, `${id}: traços no nível ${lv}`);
  }
  const gloom = computeProgression(ranger(17, { subclass: 'gloomstalker' }));
  for (const s of ['disguiseSelf', 'ropeTrick', 'fear', 'greaterInvisibility', 'seeming']) assert.ok(gloom.autoSpells.includes(s), s);
  assert.ok(computeProgression(ranger(3, { subclass: 'swarmkeeper' })).autoCantrips.includes('mageHand'));
  assert.ok(computeProgression(ranger(3, { subclass: 'drakewarden' })).autoCantrips.includes('thaumaturgy'));
});

test('patrulheiro: escolhas de subclasse', () => {
  const hunter = computeProgression(ranger(7, { subclass: 'hunter' }));
  assert.ok(pendingPools(hunter).includes('huntersPrey:1') && pendingPools(hunter).includes('defensiveTactics:1'));
  const c = ranger(3, { subclass: 'hunter' });
  assert.equal(validateClassOptions(c, 'ranger', { adds: [{ pool: 'huntersPrey', id: 'giantKiller' }] }).valid, false, 'Matador de Gigantes é só 2014');
  assert.equal(validateClassOptions(c, 'ranger', { adds: [{ pool: 'huntersPrey', id: 'colossusSlayer' }] }).valid, true);
  const drake = computeProgression(ranger(3, { subclass: 'drakewarden' }));
  assert.ok(pendingPools(drake).includes('draconicEssence:1'));
  assert.ok(pendingPools(drake).includes('languages:3'));
});

test('patrulheiro 2014: Inimigo e Terreno Favoritos', () => {
  const c = { className: 'ranger', level: 6, classOptions: [] };
  const pools = pendingPools(computeProgression(c));
  assert.ok(pools.includes('favoredEnemy:2') && pools.includes('favoredTerrain:2'));
  const picked = { ...c, classOptions: [{ classId: 'ranger', pool: 'favoredEnemy', id: 'humanoids', detail: 'gnolls, orcs', level: 1 }] };
  assert.ok(pendingPools(computeProgression(picked)).includes('languages:1'));
});

test('patrulheiro 2014: Caçador com escolhas nos níveis 3/7/11/15', () => {
  const c = { className: 'ranger', level: 15, subclass: 'hunter', classOptions: [] };
  const pools = pendingPools(computeProgression(c));
  for (const p of ['huntersPrey:1', 'defensiveTactics:1', 'hunterMultiattack:1', 'superiorHuntersDefense:1']) assert.ok(pools.includes(p), p);
  assert.equal(validateClassOptions(c, 'ranger', { adds: [{ pool: 'huntersPrey', id: 'giantKiller' }] }).valid, true);
  // Fichas 2024 não recebem as escolhas de 2014.
  const p24 = pendingPools(computeProgression(ranger(15, { subclass: 'hunter' })));
  assert.ok(!p24.some(p => p.startsWith('hunterMultiattack') || p.startsWith('superiorHuntersDefense')));
});

test('patrulheiro: Mente de Ferro concede salvaguarda', () => {
  const c = ranger(7, { subclass: 'gloomstalker' });
  assert.equal(validateClassOptions(c, 'ranger', { adds: [{ pool: 'ironMind', id: 'wisdomSave' }] }).valid, true);
  const ranger15 = CLASS_OPTIONS.ranger.pools.ironMind.options.find(o => o.id === 'wisdomSave');
  assert.deepEqual(ranger15.grants.saves, ['wis']);
});

test('patrulheiro: recursos com usos', () => {
  const res = CLASS_OPTIONS.ranger.resources;
  const ids = new Set();
  for (const r of res) {
    assert.match(r.id, /^[a-z][A-Za-z0-9]*$/);
    assert.ok(!ids.has(r.id), `${r.id} repetido`);
    ids.add(r.id);
    assert.ok(r.name?.pt && r.name?.en && r.uses && ['long', 'short'].includes(r.recharge), r.id);
    for (const sub of r.subclass || []) assert.ok(CLASS_OPTIONS.ranger.subclasses[sub], `${r.id}: subclasse ${sub}`);
  }
  assert.deepEqual(res.find(r => r.id === 'favoredEnemy').uses.byLevel, { 1: 2, 5: 3, 9: 4, 13: 5, 17: 6 });
  for (const id of ['tireless', 'naturesVeil', 'dreadfulStrike']) assert.equal(res.find(r => r.id === id).rules, '2024');
});
