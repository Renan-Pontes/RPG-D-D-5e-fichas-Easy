import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';
import sorcerer from '../data/class-options/sorcerer.js';

const base = (extra = {}) => ({ className: 'sorcerer', rulesVersion: '2024', level: 1, classOptions: [], abilities: { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 16 }, ...extra });
const pending = (c) => computeProgression(c).pendingChoices.filter(p => p.type === 'classOption').map(p => [p.pool, p.missing]);
const pick = (pool, id, level) => ({ classId: 'sorcerer', pool, id, level });

test('feiticeiro 2024: metamagia 2/4/6', () => {
  assert.deepEqual(pending(base()), []);
  assert.deepEqual(pending(base({ level: 2 })), [['metamagic', 2]]);
  assert.deepEqual(pending(base({ level: 10 })), [['metamagic', 4]]);
  assert.deepEqual(pending(base({ level: 20 })), [['metamagic', 6]]);
});

test('feiticeiro 2014: metamagia 2/3/4 a partir do nível 3', () => {
  assert.deepEqual(pending(base({ rulesVersion: '2014', level: 2 })), []);
  assert.deepEqual(pending(base({ rulesVersion: '2014', level: 3 })), [['metamagic2014', 2]]);
  assert.deepEqual(pending(base({ rulesVersion: '2014', level: 17 })), [['metamagic2014', 4]]);
});

test('metamagia: versão de regras, repetição e troca', () => {
  const ch = base({ level: 2 });
  assert.ok(validateClassOptions(ch, 'sorcerer', { adds: [{ pool: 'metamagic', id: 'quickenedSpell' }, { pool: 'metamagic', id: 'twinnedSpell' }] }).valid);
  assert.ok(!validateClassOptions(ch, 'sorcerer', { adds: [{ pool: 'metamagic2014', id: 'heightenedSpell' }] }).valid);
  assert.ok(!validateClassOptions(ch, 'sorcerer', { adds: [{ pool: 'metamagic', id: 'subtleSpell' }, { pool: 'metamagic', id: 'subtleSpell' }] }).valid);
  assert.ok(!validateClassOptions(ch, 'sorcerer', { adds: ['carefulSpell', 'distantSpell', 'empoweredSpell'].map(id => ({ pool: 'metamagic', id })) }).valid);
  const old = base({ level: 3, rulesVersion: '2014' });
  assert.ok(!validateClassOptions(old, 'sorcerer', { adds: [{ pool: 'metamagic', id: 'heightenedSpell' }] }).valid);
  assert.ok(validateClassOptions(old, 'sorcerer', { adds: [{ pool: 'metamagic2014', id: 'heightenedSpell' }, { pool: 'metamagic2014', id: 'seekingSpell' }] }).valid);
  // 2014: sem troca de Metamagia ao subir de nível.
  const old4 = base({ level: 4, rulesVersion: '2014', classOptions: [pick('metamagic2014', 'quickenedSpell', 3), pick('metamagic2014', 'twinnedSpell', 3)] });
  assert.ok(!validateClassOptions(old4, 'sorcerer', { swaps: [{ pool: 'metamagic2014', from: 'twinnedSpell', to: 'subtleSpell' }] }, { levelUp: true }).valid);
  const lv3 = base({ level: 3, classOptions: [pick('metamagic', 'quickenedSpell', 2), pick('metamagic', 'twinnedSpell', 2)] });
  assert.ok(validateClassOptions(lv3, 'sorcerer', { swaps: [{ pool: 'metamagic', from: 'twinnedSpell', to: 'heightenedSpell' }] }, { levelUp: true }).valid);
});

test('dracônica: afinidade elemental no nível 6 e magias', () => {
  assert.deepEqual(pending(base({ level: 5, subclass: 'draconic', classOptions: [pick('metamagic', 'quickenedSpell', 2), pick('metamagic', 'twinnedSpell', 2)] })), []);
  const ch = base({ level: 6, subclass: 'draconic', classOptions: [pick('metamagic', 'quickenedSpell', 2), pick('metamagic', 'twinnedSpell', 2)] });
  assert.deepEqual(pending(ch), [['elementalAffinity', 1]]);
  assert.ok(validateClassOptions(ch, 'sorcerer', { adds: [{ pool: 'elementalAffinity', id: 'fire' }] }).valid);
  assert.ok(!validateClassOptions(ch, 'sorcerer', { adds: [{ pool: 'dragonAncestor', id: 'redDragon' }] }).valid);
  const p = computeProgression({ ...ch, level: 9 });
  for (const s of ['alterSelf', 'chromaticOrb', 'command', 'dragonsBreath', 'fear', 'fly', 'arcaneEye', 'charmMonster', 'legendLore', 'summonDragon']) assert.ok(p.autoSpells.includes(s), s);
});

test('alma divina: afinidade concede magia', () => {
  const ch = base({ level: 3, subclass: 'divine', classOptions: [pick('metamagic', 'quickenedSpell', 2), pick('metamagic', 'twinnedSpell', 2)] });
  assert.deepEqual(pending(ch), [['divineAffinity', 1]]);
  const p = computeProgression({ ...ch, classOptions: [...ch.classOptions, pick('divineAffinity', 'neutrality', 3)] });
  assert.ok(p.autoSpells.includes('protectionFromEvilAndGood'));
  assert.deepEqual(pending({ ...ch, classOptions: [...ch.classOptions, pick('divineAffinity', 'law', 3)] }), []);
});

test('fichas 2014: ancestral dracônico e afinidade divina no nível 1', () => {
  const old = (subclass) => base({ rulesVersion: '2014', level: 1, subclass });
  assert.deepEqual(pending(old('draconic')), [['dragonAncestor', 1]]);
  assert.deepEqual(pending(old('divine')), [['divineAffinity', 1]]);
  assert.deepEqual(pending({ ...old('draconic'), level: 6, classOptions: [pick('dragonAncestor', 'goldDragon', 1), pick('metamagic2014', 'quickenedSpell', 3), pick('metamagic2014', 'twinnedSpell', 3)] }), []);
  assert.ok(!validateClassOptions(old('draconic'), 'sorcerer', { adds: [{ pool: 'elementalAffinity', id: 'fire' }] }).valid);
  const p = computeProgression({ ...old('draconic'), classOptions: [pick('dragonAncestor', 'goldDragon', 1)] });
  assert.ok(p.pendingChoices.every(c => c.type !== 'classOption'));
});

test('tempestade: Primordial concedido no nível 3', () => {
  const ch = base({ level: 3, subclass: 'storm', classOptions: [pick('metamagic', 'quickenedSpell', 2), pick('metamagic', 'twinnedSpell', 2)] });
  assert.deepEqual(pending(ch), []);
  assert.ok(computeProgression(ch).grants.languages.includes('Primordial'));
  assert.ok(!computeProgression({ ...ch, level: 2, subclass: null }).grants?.languages?.includes('Primordial'));
});

test('subclasses: traços nos níveis 3/6/14/18 e magias sempre preparadas', () => {
  const subs = PROGRESSION_RULES_2024.sorcerer.subclassPerLevel;
  for (const id of ['draconic', 'wildmagic', 'aberrantmind', 'clockworksoul', 'divine', 'shadow', 'storm', 'lunar']) {
    for (const lv of [3, 6, 14, 18]) assert.ok(subs[id][lv]?.features?.length, `${id} ${lv}`);
    const p = computeProgression(base({ level: 20, subclass: id }));
    assert.ok(p.features.some(x => x.nameEn || x.name), id);
  }
  const ab = computeProgression(base({ level: 9, subclass: 'aberrantmind' }));
  assert.ok(ab.autoCantrips.includes('mindSliver'));
  assert.equal(ab.autoSpells.length, 10);
  assert.equal(computeProgression(base({ level: 9, subclass: 'lunar' })).autoSpells.length, 15);
  assert.ok(computeProgression(base({ level: 3, subclass: 'shadow' })).autoSpells.includes('darkness'));
  assert.ok(!JSON.stringify(subs.wildmagic).includes('spellBombardment'));
});

test('classe base: textos revisados', () => {
  const lv = PROGRESSION_RULES_2024.sorcerer.perLevel;
  assert.deepEqual(lv[1].features.map(f => f.id), ['spellcasting', 'innateSorcery']);
  assert.deepEqual(lv[2].features.map(f => f.id), ['fontOfMagic', 'metamagic']);
  for (const n of [8, 10, 12, 16, 17]) assert.ok(!lv[n].features[0].desc.includes('page 64'), `nível ${n}`);
  assert.ok(!lv[20].features[0].descEn.includes('Metamagic Options'));
});

test('feiticeiro: recursos com usos', () => {
  const res = sorcerer.resources;
  const ids = res.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  const subs = new Set(Object.keys(sorcerer.subclasses));
  for (const r of res) {
    assert.match(r.id, /^[a-z][A-Za-z0-9]*$/);
    assert.ok(r.name.pt && r.name.en, r.id);
    assert.ok(['long', 'short'].includes(r.recharge), r.id);
    assert.equal(Object.keys(r.uses).filter(k => k !== 'min').length, 1, r.id);
    if (r.rules) assert.ok(['2014', '2024'].includes(r.rules));
    for (const s of r.subclass || []) assert.ok(subs.has(s), `${r.id}: ${s}`);
  }
  const sp = res.find(r => r.id === 'sorceryPoints');
  assert.deepEqual(sp.uses, { classLevel: true });
  assert.equal(sp.minLevel, 2);
  assert.equal(sp.rules, undefined);
  assert.deepEqual(res.find(r => r.id === 'innateSorcery').uses, { fixed: 2 });
  assert.deepEqual(res.find(r => r.id === 'restoreBalance').uses, { ability: 'cha', min: 1 });
  assert.deepEqual(res.find(r => r.id === 'restoreBalance2014').uses, { profBonus: true });
});
