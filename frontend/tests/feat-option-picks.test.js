import test from 'node:test';
import assert from 'node:assert/strict';
import { featGrants } from '../src/progression/feat-rules.js';
import { activeFightingStyles, acBonusTotal } from '../src/progression/fighting-styles.js';
import { isWeaponProficient } from '../src/creator/start-data.js';
import { featPicksText } from '../src/sheet/sheet-text.js';

const base = { rulesVersion: '2014', className: 'wizard', level: 8, abilities: { str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 10 } };

test('Fighting Initiate: the picked style applies (Defense +1 AC in armor)', () => {
  const c = { ...base, className: 'rogue', armor: 'leather', feats: [{ id: 'fightingInitiate', level: 4, picks: { fightingStyle: ['defense'] } }] };
  assert.ok(activeFightingStyles(c).some(s => s.id === 'defense'));
  assert.equal(acBonusTotal(c), 1);
});

test('Weapon Master 2014: the four picked weapons become proficient', () => {
  const c = { ...base, feats: [{ id: 'weaponMaster2014', level: 4, picks: { weapon: ['longsword', 'longbow', 'rapier', 'handCrossbow'] } }] };
  assert.equal(isWeaponProficient(c, 'longsword'), true);
  assert.equal(isWeaponProficient(c, 'greataxe'), false);
});

test('Eldritch Adept: an invocation that grants a spell reaches the spell list', () => {
  const g = featGrants({ ...base, feats: [{ id: 'eldritchAdept', level: 4, picks: { invocation: ['armorOfShadows'] } }] });
  assert.deepEqual(g.options.map(o => [o.classId, o.pool, o.id]), [['warlock', 'invocation', 'armorOfShadows']]);
  assert.ok(g.spells.includes('mageArmor'));
});

test('Boon of Energy Resistance: picked damage types become resistances', () => {
  const g = featGrants({ ...base, rulesVersion: '2024', feats: [{ id: 'boonOfEnergyResistance', level: 19, picks: { damageType: ['fire', 'cold'] } }] });
  assert.deepEqual(g.resistances, ['fire', 'cold']);
});

test('timeline text names feat-picked class options instead of raw ids', () => {
  const txt = featPicksText({ invocation: ['armorOfShadows'], metamagic: ['quickenedSpell'] }, 'pt');
  assert.match(txt, /Invocação Mística: /);
  assert.doesNotMatch(txt, /Armor Of Shadows/);
});
