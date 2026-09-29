import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateClassOptions, computeProgression } from '../src/progression/engine.js';
import { CLASS_OPTIONS } from '../data/class-options/index.js';
import { SPELLS_2024 } from '../data/rules2024.js';

const art = CLASS_OPTIONS.artificer;
const sheet = (level, extra = {}) => ({
  className: 'artificer', level, rulesVersion: '2024',
  abilities: { str: 10, dex: 14, con: 14, int: 16, wis: 12, cha: 8 }, ...extra,
});
const picks = (pool, ids, level = 2) => ids.map(id => ({ classId: 'artificer', pool, id, level }));
const add = (pool, ...ids) => ({ adds: ids.map(id => ({ pool, id })) });

test('artífice 2024: 4 planos no nível 2, 8 no 18', () => {
  const four = ['bagOfHolding', 'weaponPlus1', 'shieldPlus1', 'sendingStones'];
  assert.ok(validateClassOptions(sheet(2), 'artificer', add('plan', ...four)).valid);
  assert.ok(!validateClassOptions(sheet(2), 'artificer', add('plan', ...four, 'gogglesOfNight')).valid);
  const total = Object.values(art.choices).reduce((n, g) => n + (g.plan || 0), 0);
  assert.equal(total, 8);
  const pending = computeProgression(sheet(2)).pendingChoices.find(p => p.pool === 'plan');
  assert.equal(pending?.missing, 4);
});

test('artífice 2024: plano exige nível; genérico repete com item diferente', () => {
  assert.ok(!validateClassOptions(sheet(2), 'artificer', add('plan', 'armorPlus1')).valid);
  assert.ok(validateClassOptions(sheet(6), 'artificer', add('plan', 'armorPlus1')).valid);
  const c = sheet(2, { classOptions: picks('plan', ['commonMagicItem']) });
  c.classOptions[0].detail = 'Moon-Touched Sword';
  assert.ok(validateClassOptions(c, 'artificer', { adds: [{ pool: 'plan', id: 'commonMagicItem', detail: 'Clockwork Amulet' }] }).valid);
  assert.ok(!validateClassOptions(c, 'artificer', { adds: [{ pool: 'plan', id: 'commonMagicItem', detail: 'Moon-Touched Sword' }] }).valid);
});

test('artífice 2014: infusões 4/6/8/10/12; não usa planos', () => {
  const legacy = (level) => ({ ...sheet(level), rulesVersion: '2014' });
  const total = Object.values(art.legacyChoices).reduce((n, g) => n + (g.infusion || 0), 0);
  assert.equal(total, 12);
  assert.ok(validateClassOptions(legacy(2), 'artificer', add('infusion', 'enhancedWeapon', 'enhancedDefense', 'homunculusServant', 'returningWeapon')).valid);
  assert.ok(!validateClassOptions(legacy(2), 'artificer', add('infusion', 'radiantWeapon')).valid);
  assert.ok(!validateClassOptions(legacy(2), 'artificer', add('plan', 'bagOfHolding')).valid);
  assert.ok(!validateClassOptions(sheet(2), 'artificer', add('infusion', 'enhancedWeapon')).valid);
});

test('Armeiro: modelo de armadura; Couraçado só no 2024', () => {
  const armorer = (rulesVersion) => ({ ...sheet(3, { subclass: 'armorer' }), rulesVersion });
  assert.ok(validateClassOptions(armorer('2024'), 'artificer', add('armorModel', 'dreadnaught')).valid);
  assert.ok(!validateClassOptions(armorer('2014'), 'artificer', add('armorModel', 'dreadnaught')).valid);
  assert.ok(validateClassOptions(armorer('2014'), 'artificer', add('armorModel', 'guardian')).valid);
  assert.ok(!validateClassOptions(sheet(3, { subclass: 'alchemist' }), 'artificer', add('armorModel', 'guardian')).valid);
});

test('artífice: subclasses EFA completas e com magias do catálogo 2024 (exceto as fora do SRD)', () => {
  const ids = new Set(SPELLS_2024.map(s => s.id));
  const outside = new Set(['auraOfVitality', 'conjureBarrage', 'auraOfPurity', 'banishingSmite']);
  for (const id of ['alchemist', 'armorer', 'artillerist', 'battlesmith', 'cartographer']) {
    const sub = art.subclasses[id];
    assert.ok(sub, id);
    for (const lv of [3, 5, 9, 15]) assert.ok(sub.levels[lv]?.features?.length, `${id} ${lv}`);
    for (const lv of [3, 5, 9, 13, 17]) {
      for (const s of sub.levels[lv].autoSpells) assert.ok(ids.has(s) || outside.has(s), `${id} ${lv}: ${s}`);
    }
  }
  assert.ok(art.subclasses.alchemist.levels[13].autoSpells.includes('vitriolicSphere'));
  assert.ok(art.subclasses.battlesmith.levels[5].autoSpells.includes('shiningSmite'));
  for (let lv = 1; lv <= 20; lv++) if (art.features[lv]) assert.ok(!/12 infus/.test(JSON.stringify(art.features[lv])), `nível ${lv}`);
});

test('artífice: ferramenta de artesão no 1 (não na multiclasse) e proficiências da subclasse no 3', () => {
  assert.ok(validateClassOptions(sheet(1), 'artificer', add('artisanTool', 'smithsTools')).valid);
  const slots = (c) => computeProgression(c).pendingChoices.filter(p => p.pool === 'artisanTool').length;
  assert.equal(slots(sheet(1)), 1);
  const multi = { ...sheet(3), className: 'wizard', level: 3,
    multiclass: [{ id: 'artificer' }], classSequence: ['wizard', 'wizard', 'artificer'] };
  const r = validateClassOptions(multi, 'artificer', add('artisanTool', 'smithsTools'));
  assert.ok(!r.valid && r.issues.some(i => /demais/.test(i)), JSON.stringify(r));
  assert.ok(validateClassOptions(multi, 'artificer', { adds: [] }).valid);
  // 2024: proficiências da subclasse automáticas (grants), sem pendência de kit.
  const p24 = computeProgression(sheet(3, { subclass: 'armorer' }));
  assert.ok(p24.grants.armor?.includes('Heavy'));
  assert.ok(p24.grants.tools?.includes("Smith's tools"));
  assert.ok(!p24.pendingChoices.some(p => p.pool === 'specialistTools'));
  assert.ok(computeProgression(sheet(3, { subclass: 'cartographer' })).grants.tools?.includes("Cartographer's tools"));
  // 2014: o kit é escolhido no pool (só versões legadas).
  const alch14 = { ...sheet(3, { subclass: 'alchemist' }), rulesVersion: '2014' };
  assert.ok(computeProgression(alch14).pendingChoices.some(p => p.pool === 'specialistTools'));
  assert.ok(validateClassOptions(alch14, 'artificer', add('specialistTools', 'alchemistKitLegacy')).valid);
  assert.ok(!validateClassOptions(alch14, 'artificer', add('specialistTools', 'armorerKit')).valid);
  assert.ok(!validateClassOptions(sheet(3, { subclass: 'alchemist' }), 'artificer', add('specialistTools', 'alchemistKitLegacy')).valid);
});

test('Armeiro 2024 ganha 1 plano extra no 9; 2014 não', () => {
  const plansAt = (rulesVersion) => {
    const c = { ...sheet(9, { subclass: 'armorer' }), rulesVersion };
    return computeProgression(c).pendingChoices.find(p => p.pool === 'plan')?.missing || 0;
  };
  assert.equal(plansAt('2024'), 6);
  assert.equal(plansAt('2014'), 0);
});

test('artífice: recursos com usos', () => {
  const res = art.resources;
  const ids = res.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of res) {
    assert.match(r.id, /^[a-z][A-Za-z0-9]*$/);
    assert.ok(r.name?.pt && r.name?.en, r.id);
    assert.ok(['long', 'short'].includes(r.recharge), r.id);
    assert.ok(!r.rules || ['2014', '2024'].includes(r.rules), r.id);
    for (const s of r.subclass || []) assert.ok(['alchemist', 'armorer', 'artillerist', 'battlesmith', 'cartographer'].includes(s), r.id);
  }
  const get = (id) => res.find(r => r.id === id);
  assert.deepEqual(get('flashOfGenius').uses, { ability: 'int', min: 1 });
  assert.equal(get('flashOfGenius').minLevel, 7);
  assert.deepEqual(get('experimentalElixir').uses.byLevel, { 3: 2, 5: 3, 9: 4, 15: 5 });
  assert.deepEqual(get('experimentalElixir2014').uses.byLevel, { 3: 1, 6: 2, 15: 3 });
  assert.equal(get('arcaneJolt').minLevel, 9);
});
