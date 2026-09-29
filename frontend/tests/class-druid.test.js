import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';
import druid from '../data/class-options/druid.js';

const make = (level, extra = {}) => ({
  rulesVersion: '2024', className: 'druid', subclass: '', level, race: 'human', background: 'guide',
  maxHp: 20, currentHp: 20, classOptions: [], ...extra,
});
const pendingPools = (prog) => prog.pendingChoices.filter(p => p.type === 'classOption').map(p => `${p.pool}:${p.missing}`);
const order = (id) => ({ classId: 'druid', pool: 'primalOrder', id, level: 1 });

test('druida 2024: Ordem Primal no 1 e Fúria Elemental no 7', () => {
  assert.deepEqual(pendingPools(computeProgression(make(1))), ['primalOrder:1']);
  const c7 = make(7, { subclass: 'moon', classOptions: [order('warden')] });
  assert.deepEqual(pendingPools(computeProgression(c7)), ['elementalFury:1']);
});

test('druida 2024: Mago abre um truque de druida extra', () => {
  const c = make(1, { classOptions: [order('magician')] });
  assert.deepEqual(pendingPools(computeProgression(c)), ['magicianCantrip:1']);
  assert.equal(validateClassOptions(c, 'druid', { adds: [{ pool: 'magicianCantrip', id: 'thornWhip' }] }).valid, true);
  assert.equal(validateClassOptions(c, 'druid', { adds: [{ pool: 'magicianCantrip', id: 'thornWhip' }, { pool: 'magicianCantrip', id: 'guidance' }] }).valid, false);
  const done = { ...c, classOptions: [...c.classOptions, { classId: 'druid', pool: 'magicianCantrip', id: 'thornWhip', level: 1 }] };
  const prog = computeProgression(done);
  assert.ok(prog.autoCantrips.includes('thornWhip'));
  assert.deepEqual(pendingPools(prog), []);
});

test('druida 2024: não pode escolher as duas ordens', () => {
  const r = validateClassOptions(make(1), 'druid', { adds: [{ pool: 'primalOrder', id: 'magician' }, { pool: 'primalOrder', id: 'warden' }] });
  assert.equal(r.valid, false);
});

test('druida 2024: traços revisados substituem o texto do PDF', () => {
  const lv = PROGRESSION_RULES_2024.druid.perLevel;
  for (const [n, list] of Object.entries(druid.features)) {
    assert.deepEqual(lv[n].features.map(f => f.id), list.map(f => f.id), `nível ${n}`);
  }
  assert.ok(lv[20].features[0].descEn.includes('Evergreen'));
});

test('druida 2024: círculos com traços nos níveis 3/6/10/14', () => {
  for (const id of ['land', 'moon', 'sea', 'stars', 'dreams', 'shepherd', 'spores', 'wildfire']) {
    const p = computeProgression(make(14, { subclass: id }));
    for (const lv of [3, 6, 10, 14]) {
      assert.ok(p.features.some(f => f.level === lv && f.source === 'subclass'), `${id} nível ${lv}`);
    }
  }
});

test('druida 2024: magias e truques de círculo', () => {
  const stars = computeProgression(make(3, { subclass: 'stars' }));
  assert.ok(stars.autoCantrips.includes('guidance') && stars.autoSpells.includes('guidingBolt'));
  const moon = computeProgression(make(9, { subclass: 'moon' }));
  assert.ok(moon.autoCantrips.includes('starryWisp'));
  ['cureWounds', 'moonbeam', 'conjureAnimals', 'fountOfMoonlight', 'massCureWounds'].forEach(s => assert.ok(moon.autoSpells.includes(s), s));
  const sea = computeProgression(make(5, { subclass: 'sea' }));
  assert.ok(sea.autoCantrips.includes('rayOfFrost') && sea.autoSpells.includes('waterBreathing'));
  const spores = computeProgression(make(3, { subclass: 'spores' }));
  assert.ok(spores.autoCantrips.includes('chillTouch') && spores.autoSpells.includes('gentleRepose'));
  const wildfire = computeProgression(make(3, { subclass: 'wildfire' }));
  ['burningHands', 'cureWounds', 'flamingSphere', 'scorchingRay'].forEach(s => assert.ok(wildfire.autoSpells.includes(s), s));
});

test('druida 2024: Círculo da Terra traz os 4 terrenos do SRD', () => {
  const land = druid.subclasses.land;
  assert.deepEqual(land.landTypes.map(t => t.id), ['arid', 'polar', 'temperate', 'tropical']);
  assert.deepEqual(land.landTypeSpells.polar[9], ['coneOfCold']);
  assert.ok(land.levels[3].features.some(f => f.id === 'landsAid'));
});

test('druida 2014: Terra ganha Truque Bônus no nível 2', () => {
  const c = { ...make(2, { subclass: 'land' }), rulesVersion: '2014' };
  assert.deepEqual(pendingPools(computeProgression(c)), ['landBonusCantrip:1']);
  assert.deepEqual(pendingPools(computeProgression({ ...c, rulesVersion: '2024', level: 3 })).filter(p => p.startsWith('land')), []);
});

test('druida: recursos com usos bem formados', () => {
  const ids = druid.resources.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.some(id => /wildShape/i.test(id)), 'Forma Selvagem fica fora');
  const subs = new Set([...Object.keys(druid.subclasses), 'land']);
  for (const r of druid.resources) {
    assert.ok(r.name.pt && r.name.en && r.uses && ['long', 'short'].includes(r.recharge), r.id);
    for (const s of r.subclass || []) assert.ok(subs.has(s), `${r.id}: ${s}`);
  }
  const omen = druid.resources.filter(r => r.id.startsWith('cosmicOmen'));
  assert.deepEqual(omen.map(r => [r.rules, Object.keys(r.uses)[0]]), [['2024', 'ability'], ['2014', 'profBonus']]);
});
