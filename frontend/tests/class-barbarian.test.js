import { test } from 'node:test';
import assert from 'node:assert/strict';
import barbarian from '../data/class-options/barbarian.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { optionSlots, classOptionState } from '../src/progression/options.js';

const base = (extra = {}) => ({ className: 'barbarian', rulesVersion: '2024', level: 1, classOptions: [], ...extra });

test('bárbaro: traços da classe base cobrem todos os níveis com traços', () => {
  const levels = Object.keys(barbarian.features).map(Number);
  assert.deepEqual(levels, [1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15, 16, 17, 18, 19, 20]);
  assert.equal(barbarian.features[1].length, 3);
  const ids = Object.values(barbarian.features).flat().map(f => f.id);
  assert.ok(ids.includes('improvedBrutalStrike13') && ids.includes('improvedBrutalStrike17'));
  // rules.js incorpora o texto revisado.
  assert.equal(PROGRESSION_RULES_2024.barbarian.perLevel[1].features[0].name, 'Fúria');
});

test('bárbaro: todas as subclasses têm traços em 3/6/10/14', () => {
  const ids = Object.keys(barbarian.subclasses);
  assert.equal(ids.length, 11);
  for (const [id, sub] of Object.entries(barbarian.subclasses)) {
    assert.deepEqual(Object.keys(sub.levels).map(Number), [3, 6, 10, 14], id);
    assert.ok(PROGRESSION_RULES_2024.barbarian.subclassPerLevel[id], `${id} em rules`);
  }
});

test('bárbaro: vagas de maestria e Conhecimento Primal', () => {
  assert.equal(optionSlots(base({ level: 1 })).weaponMastery.total, 2);
  assert.equal(optionSlots(base({ level: 4 })).weaponMastery.total, 3);
  assert.equal(optionSlots(base({ level: 10 })).weaponMastery.total, 4);
  assert.equal(optionSlots(base({ level: 3 })).primalKnowledge.total, 1);
  assert.equal(optionSlots(base({ level: 2 })).primalKnowledge, undefined);
});

test('bárbaro: Totem com Tigre abre 2 perícias', () => {
  const ch = base({ level: 6, subclass: 'totem' });
  const r = validateClassOptions(ch, 'barbarian', { adds: [
    { pool: 'primalKnowledge', id: 'athletics' },
    { pool: 'totemSpirit', id: 'bear' },
    { pool: 'totemAspect', id: 'tiger' },
    { pool: 'tigerAspectSkill', id: 'stealth' },
    { pool: 'tigerAspectSkill', id: 'acrobatics' },
  ] });
  assert.ok(r.valid, r.issues.join('; '));
  const bad = validateClassOptions(ch, 'barbarian', { adds: [{ pool: 'tigerAspectSkill', id: 'arcana' }] });
  assert.equal(bad.valid, false);
});

test('bárbaro: Gigante concede truque e Coração Selvagem progride', () => {
  const giant = base({ level: 3, subclass: 'giant', classOptions: [
    { classId: 'barbarian', pool: 'giantCantrip', id: 'thaumaturgy', level: 3 },
    { classId: 'barbarian', pool: 'giantLanguage', id: 'Giant', level: 3 },
  ] });
  const state = classOptionState(giant);
  assert.deepEqual(state.grants.cantrips, ['thaumaturgy']);
  assert.deepEqual(state.grants.languages, ['Giant']);

  const wh = computeProgression(base({ level: 10, subclass: 'wildHeart' }));
  assert.ok(wh.autoSpells.includes('communeWithNature'));
  assert.ok(wh.features.some(f => f.id === 'aspectOfTheWilds'));
  assert.equal(optionSlots(base({ level: 6, subclass: 'wildHeart' })).wildHeartAspect.total, 1);
});

test('bárbaro: escolhas de subclasse por versão de regras', () => {
  const z24 = base({ level: 3, subclass: 'zealot' });
  const z14 = { ...z24, rulesVersion: '2014' };
  assert.equal(optionSlots(z24).divineFuryType, undefined);
  assert.equal(optionSlots(z14).divineFuryType.total, 1);
  assert.ok(validateClassOptions(z14, 'barbarian', { adds: [{ pool: 'divineFuryType', id: 'radiant' }] }).valid);
  assert.equal(validateClassOptions(z24, 'barbarian', { adds: [{ pool: 'divineFuryType', id: 'radiant' }] }).valid, false);
  const t14 = { ...base({ level: 14, subclass: 'totem' }), rulesVersion: '2014' };
  const slots = optionSlots(t14);
  assert.equal(slots.totemSpirit.total + slots.totemAspect.total + slots.totemAttunement.total, 3);
  assert.equal(slots.weaponMastery, undefined);
  assert.equal(optionSlots({ ...base({ level: 6, subclass: 'wildHeart' }), rulesVersion: '2014' }).wildHeartAspect, undefined);
});

test('bárbaro: recursos com usos', () => {
  const res = barbarian.resources;
  const ids = res.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  const subs = new Set(Object.keys(barbarian.subclasses));
  for (const r of res) {
    assert.match(r.id, /^[a-z][A-Za-z0-9]*$/);
    assert.ok(r.name.pt && r.name.en, r.id);
    assert.ok(['long', 'short'].includes(r.recharge), r.id);
    assert.equal(Object.keys(r.uses).length, 1, r.id);
    if (r.rules) assert.ok(['2014', '2024'].includes(r.rules));
    for (const s of r.subclass || []) assert.ok(subs.has(s), `${r.id}: ${s}`);
  }
  const rage = res.find(r => r.id === 'rage');
  assert.deepEqual(rage.uses.byLevel, { 1: 2, 3: 3, 6: 4, 12: 5, 17: 6 });
  assert.equal(rage.shortRestRegain, 1);
  assert.equal(res.find(r => r.id === 'rage2014').shortRestRegain, undefined);
});
