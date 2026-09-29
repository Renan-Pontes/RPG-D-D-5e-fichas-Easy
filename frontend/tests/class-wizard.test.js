import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';
import wizard from '../data/class-options/wizard.js';

const mage = (level, extra = {}) => ({
  className: 'wizard', level, rulesVersion: '2024', race: 'human',
  abilities: { str: 8, dex: 14, con: 14, int: 17, wis: 12, cha: 10 },
  skillProfs: ['arcana', 'history'], classOptions: [], ...extra,
});
const pendingPools = (c) => computeProgression(c).pendingChoices.filter(p => p.type === 'classOption').map(p => [p.pool, p.missing]);

test('mago 2024: traços revisados substituem os do SRD extraído', () => {
  const rules = PROGRESSION_RULES_2024.wizard;
  assert.deepEqual(rules.perLevel[1].features.map(f => f.id), ['spellcasting', 'ritualAdept', 'arcaneRecovery']);
  assert.equal(rules.perLevel[20].features[0].id, 'signatureSpells');
  assert.equal(rules.perLevel[3].subclassChoice, true); // contadores preservados
  assert.equal(rules.perLevel[5].spellsPrepared.formula, 9);
  for (const id of ['abjuration', 'divination', 'evocation', 'illusion', 'conjuration', 'enchantment', 'necromancy',
    'transmutation', 'bladesinging', 'warmagic', 'scribes', 'chronurgy', 'graviturgy']) {
    const sub = rules.subclassPerLevel[id];
    assert.ok(sub && !sub.legacyCompatibility && !sub.manual, `${id}: dados próprios`);
    for (const lv of [3, 6, 10, 14]) assert.ok(sub[lv]?.features?.length, `${id}: traços no nível ${lv}`);
    assert.ok(!sub[2], `${id}: nada no nível 2`);
  }
});

test('mago 2024: Estudioso no nível 2 (Especialização em perícia acadêmica proficiente)', () => {
  assert.deepEqual(pendingPools(mage(2)), [['scholar', 1]]);
  assert.ok(validateClassOptions(mage(2), 'wizard', { adds: [{ pool: 'scholar', id: 'arcana' }] }).valid);
  assert.ok(!validateClassOptions(mage(2), 'wizard', { adds: [{ pool: 'scholar', id: 'insight' }] }).valid);
  const done = mage(2, { classOptions: [{ classId: 'wizard', pool: 'scholar', id: 'arcana', level: 2 }] });
  assert.deepEqual(pendingPools(done), []);
});

test('mago 2024: Sábio da escola (2 no nível 3, +1 por novo nível de espaço)', () => {
  const sub = { subclass: 'evocation', classOptions: [{ classId: 'wizard', pool: 'scholar', id: 'arcana', level: 2 }] };
  assert.deepEqual(pendingPools(mage(3, sub)), [['evocationSavant', 2]]);
  assert.deepEqual(pendingPools(mage(9, sub)), [['evocationSavant', 5]]);
  const ill = pendingPools(mage(3, { ...sub, subclass: 'illusion' }));
  assert.deepEqual(new Map(ill), new Map([['illusionSavant', 2], ['improvedIllusionsCantrip', 1]]));
  const p = computeProgression(mage(10, { ...sub, subclass: 'abjuration' }));
  assert.ok(p.autoSpells.includes('counterspell') && p.autoSpells.includes('dispelMagic'));
});

test('mago 2024: Maestria (nv 18) e Assinatura (nv 20)', () => {
  const pools = new Map(pendingPools(mage(20)));
  assert.equal(pools.get('spellMastery1'), 1);
  assert.equal(pools.get('spellMastery2'), 1);
  assert.equal(pools.get('signatureSpells'), 2);
  const adds = [{ pool: 'signatureSpells', id: 'fireball' }, { pool: 'signatureSpells', id: 'counterspell' }];
  assert.ok(validateClassOptions(mage(20), 'wizard', { adds }).valid);
  assert.ok(!validateClassOptions(mage(19), 'wizard', { adds }).valid);
});

test('mago: Canção da Lâmina e Pedra do Transmutador', () => {
  const blade = mage(6, { subclass: 'bladesinging' });
  assert.equal(computeProgression(blade).extraAttacks, 1);
  assert.ok(validateClassOptions(blade, 'wizard', { adds: [{ pool: 'bladesingerWeapon', id: 'rapier' }] }).valid);
  assert.ok(!validateClassOptions(blade, 'wizard', { adds: [{ pool: 'bladesingerWeapon', id: 'club' }] }).valid); // só 2014
  const trans = mage(6, { subclass: 'transmutation' });
  assert.ok(validateClassOptions(trans, 'wizard', { adds: [{ pool: 'transmutersStone', id: 'resistFire' }] }).valid);
  assert.ok(wizard.pools.transmutersStone.freeSwap);
});

test('mago 2014: sem Sábio de magias grátis; Ilusão e Canção da Lâmina escolhem no nível 2', () => {
  const legacy = (level, subclass) => mage(level, { rulesVersion: '2014', subclass });
  assert.deepEqual(pendingPools(legacy(3, 'evocation')), []);
  assert.deepEqual(pendingPools(legacy(2, 'illusion')), [['improvedIllusionsCantrip', 1]]);
  assert.deepEqual(pendingPools(legacy(2, 'bladesinging')), [['bladesingerWeapon', 1]]);
  assert.ok(validateClassOptions(legacy(2, 'bladesinging'), 'wizard', { adds: [{ pool: 'bladesingerWeapon', id: 'club' }] }).valid);
  assert.deepEqual(new Map(pendingPools(legacy(20))), new Map([['legacySpellMastery1', 1], ['legacySpellMastery2', 1], ['signatureSpells', 2]]));
});

test('mago: concessões de proficiência (arma do Bladesinger, pedra de CON)', () => {
  const w = wizard.pools.bladesingerWeapon.options.find(o => o.id === 'rapier');
  assert.deepEqual(w.grants, { weapons: ['rapier'], armor: ['light'], skills: ['performance'] });
  assert.deepEqual(wizard.pools.transmutersStone.options.find(o => o.id === 'conSave').grants, { saves: ['con'] });
});

test('mago: recursos com usos', () => {
  const ids = wizard.resources.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length, 'ids únicos');
  const subs = Object.keys(wizard.subclasses);
  for (const r of wizard.resources) {
    assert.match(r.id, /^[a-z][A-Za-z0-9]*$/);
    assert.ok(r.name.pt && r.name.en && ['long', 'short'].includes(r.recharge), r.id);
    assert.equal(Object.keys(r.uses).length > 0, true, r.id);
    for (const s of r.subclass || []) assert.ok(subs.includes(s), `${r.id}: subclasse ${s}`);
  }
  const get = id => wizard.resources.find(r => r.id === id);
  assert.deepEqual(get('portent').uses, { byLevel: { 2: 2, 14: 3 } });
  assert.deepEqual(get('bladesong').uses, { profBonus: true });
  assert.equal(get('signatureSpell1').recharge, 'short');
  assert.equal(get('phantasmalCreatures').rules, '2024');
});
