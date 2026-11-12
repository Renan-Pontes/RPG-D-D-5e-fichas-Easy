import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESSION_RULES } from '../src/progression/rules.js';

const feat = (levels, id) => Object.values(levels).flatMap(n => n?.features || []).find(f => f.id === id);

test('2014 base features carry SRD 5.1 English text', () => {
  const rage = feat(PROGRESSION_RULES.barbarian.perLevel, 'rage');
  assert.equal(rage.nameEn, 'Rage');
  assert.match(rage.descEn, /bonus action/);
  assert.equal(rage.srd51, true);
});

test('SRD subclass features carry SRD 5.1 text; paid ones do not', () => {
  const f = feat(PROGRESSION_RULES.warlock.subclassPerLevel.fiend, 'darkOnesBlessing');
  assert.match(f.descEn, /temporary hit points/);
  const sw = feat(PROGRESSION_RULES.paladin.subclassPerLevel.devotion, 'sacredWeapon');
  assert.match(sw.descEn, /positive energy/);
  const moon = Object.values(PROGRESSION_RULES.druid.subclassPerLevel.moon).flatMap(n => n?.features || []);
  assert.ok(moon.every(f => !f.srd51));
});
