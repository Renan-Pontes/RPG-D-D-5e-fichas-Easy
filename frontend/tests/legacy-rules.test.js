// Dados legados (regras 2014): ids de magia válidos e contadores corrigidos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import SRD from '../data/srd.js';
import { PROGRESSION_RULES } from '../src/progression/rules.js';
import { computeProgression } from '../src/progression/index.js';

const legacyIds = new Set(SRD.SPELLS.map(s => s.id));
const build = (className, level, subclass = null, extra = {}) => ({ className, level, subclass, abilities: {}, ...extra });
const featureAt = (p, id, level) => p.features.find(f => f.id === id && f.level === level);

function spellRefs(node, path, out) {
  if (Array.isArray(node)) node.forEach((x, i) => spellRefs(x, `${path}[${i}]`, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (['autoSpells', 'autoCantrips', 'expandedSpells'].includes(k)) v.forEach(id => out.push([`${path}.${k}`, id]));
      else if (k === 'landTypeSpells') for (const [land, lv] of Object.entries(v)) for (const [l, ids] of Object.entries(lv)) ids.forEach(id => out.push([`${path}.${land}.${l}`, id]));
      else spellRefs(v, `${path}.${k}`, out);
    }
  }
  return out;
}

test('toda magia das regras 2014 existe no catálogo legado (SRD.SPELLS)', () => {
  const missing = spellRefs(PROGRESSION_RULES, 'PR', []).filter(([, id]) => !legacyIds.has(id));
  assert.deepEqual(missing, []);
});

test('lista do artífice 2014 sem ids quebrados', () => {
  const art = SRD.SPELLS.filter(s => s.classes.includes('artificer')).map(s => s.id);
  for (const id of ['web', 'blink', 'elementalWeapon', 'createFoodAndWater', 'secretChest', 'arcaneHand', 'identifySpell', 'spareDying'])
    assert.ok(art.includes(id), id);
});

test('grafias antigas de subclasse apontam para os mesmos dados', () => {
  assert.equal(PROGRESSION_RULES.monk.subclassPerLevel.openHand, PROGRESSION_RULES.monk.subclassPerLevel.openhand);
  assert.equal(PROGRESSION_RULES.rogue.subclassPerLevel.arcaneTrickster, PROGRESSION_RULES.rogue.subclassPerLevel.arcanetrickster);
});

test('Devoção 2014: magias de juramento nos níveis 3/5/9/13/17, sem Aura Sagrada', () => {
  const p = lv => computeProgression(build('paladin', lv, 'devotion')).autoSpells;
  assert.ok(!p(8).includes('beaconOfHope'));
  assert.ok(p(9).includes('beaconOfHope') && p(9).includes('dispelMagic'));
  assert.ok(!p(12).includes('freedomOfMovement') && p(13).includes('guardianOfFaith'));
  assert.ok(!p(16).includes('commune') && p(17).includes('flameStrike'));
  assert.ok(!p(20).includes('holyAura'));
});

test('Hexblade 2014: Borrão (não Arma Mágica) e ids em camelCase', () => {
  // Lista Expandida (só amplia a lista de escolha; não entra em autoSpells).
  const p = Object.entries(PROGRESSION_RULES.warlock.subclassPerLevel.hexblade).filter(([lv]) => Number(lv) <= 9).flatMap(([, n]) => n.expandedSpells || []);
  assert.deepEqual(computeProgression(build('warlock', 9, 'hexblade')).autoSpells, []);
  for (const id of ['blur', 'blink', 'elementalWeapon', 'phantasmalKiller', 'staggeringSmite', 'coneOfCold']) assert.ok(p.includes(id), id);
  assert.ok(!p.includes('magicWeapon'));
});

test('contadores 2014: Canalizar Divindade 3 no 18, Crítico Brutal escala, Superior 18–20', () => {
  assert.ok(featureAt(computeProgression(build('cleric', 18, 'life')), 'channelDivinity3', 18));
  assert.ok(!computeProgression(build('cleric', 17, 'life')).features.some(f => f.id === 'channelDivinity3'));
  const barb = computeProgression(build('barbarian', 17));
  assert.ok(featureAt(barb, 'brutalCritical2', 13) && featureAt(barb, 'brutalCritical3', 17));
  assert.match(featureAt(computeProgression(build('fighter', 15, 'champion')), 'superiorCritical', 15).desc, /18-20/);
});

test('artífice 2014: truques 2/3/4 nos níveis 1/10/14', () => {
  assert.equal(computeProgression(build('artificer', 9)).cantripsKnown, 2);
  assert.equal(computeProgression(build('artificer', 10)).cantripsKnown, 3);
  assert.equal(computeProgression(build('artificer', 14)).cantripsKnown, 4);
});

test('Lua e Estrelas 2014 nos níveis certos', () => {
  const moon = computeProgression(build('druid', 14, 'moon'));
  assert.ok(featureAt(moon, 'elementalWildShape', 10) && featureAt(moon, 'thousandForms', 14));
  const stars = computeProgression(build('druid', 14, 'stars'));
  assert.ok(featureAt(stars, 'fullOfStars', 14) && featureAt(stars, 'twinklingConstellations', 10));
  assert.ok(!stars.features.some(f => f.id === 'starFlare'));
});
