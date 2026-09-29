import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHARED } from '../data/class-options/shared.js';
import { FEATS, featsFor, findFeat } from '../data/feats.js';
import { SPELLS_2024 } from '../data/rules2024.js';
import SRD from '../data/srd.js';

// Valida os pools compartilhados (Estilo de Luta, Maestria em Armas) e o catálogo de talentos.
const bilingual = (v) => v && typeof v.pt === 'string' && v.pt.trim() && typeof v.en === 'string' && v.en.trim();
const RULES = ['2014', '2024'];
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const MASTERIES = ['cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex'];
const spellIds = new Set([...SPELLS_2024, ...SRD.SPELLS].map(s => s.id));
const skillIds = new Set(SRD.SKILLS.map(s => s.id));
const speciesIds = new Set(SRD.RACES.map(r => r.id));

// As 38 armas do SRD 5.2.1.
const SRD_2024_WEAPONS = [
  'club', 'dagger', 'greatclub', 'handaxe', 'javelin', 'lightHammer', 'mace', 'quarterstaff', 'sickle', 'spear',
  'dart', 'crossbowLight', 'shortbow', 'sling',
  'battleaxe', 'flail', 'glaive', 'greataxe', 'greatsword', 'halberd', 'lance', 'longsword', 'maul', 'morningstar',
  'pike', 'rapier', 'scimitar', 'shortsword', 'trident', 'warhammer', 'warPick', 'whip',
  'blowgun', 'crossbowHand', 'crossbowHeavy', 'longbow', 'musket', 'pistol',
];

function checkPoolOptions(pool, where) {
  assert.ok(bilingual(pool.name), `${where}: name`);
  const seen = new Set();
  for (const o of pool.options) {
    const at = `${where}.${o.id}`;
    assert.match(o.id, /^[a-z][A-Za-z0-9]*$/, `${at}: id camelCase`);
    assert.ok(!seen.has(o.id), `${at}: id repetido`);
    seen.add(o.id);
    assert.ok(bilingual(o.name), `${at}: name pt/en`);
    assert.ok(bilingual(o.desc), `${at}: desc pt/en`);
    assert.ok(typeof o.source === 'string' && o.source, `${at}: source`);
    if (o.rules) assert.ok(RULES.includes(o.rules), `${at}: rules`);
  }
}

test('Estilo de Luta: formato e contagens', () => {
  const pool = SHARED.fightingStyle;
  checkPoolOptions(pool, 'fightingStyle');
  const v2024 = pool.options.filter(o => o.rules !== '2014');
  const v2014 = pool.options.filter(o => o.rules !== '2024');
  assert.equal(v2024.length, 10, 'estilos 2024');
  assert.equal(v2014.length, 11, 'estilos 2014 (PHB + TCE, sem Guerreiro Abençoado/Druídico)');
  assert.ok(!pool.options.some(o => ['blessedWarrior', 'druidicWarrior'].includes(o.id)), 'opções exclusivas ficam nas classes');
  for (const o of v2014) {
    assert.ok(Array.isArray(o.classes2014) && o.classes2014.length, `${o.id}: classes2014`);
    for (const c of o.classes2014) assert.ok(['fighter', 'paladin', 'ranger'].includes(c), `${o.id}: classe ${c}`);
  }
  for (const o of pool.options) assert.ok(o.effect && typeof o.effect === 'object', `${o.id}: effect`);
});

test('Maestria em Armas: toda arma do SRD 2024 tem maestria', () => {
  const pool = SHARED.weaponMastery;
  checkPoolOptions(pool, 'weaponMastery');
  assert.equal(pool.freeSwap, true);
  const ids = new Set(pool.options.map(o => o.id));
  for (const w of SRD_2024_WEAPONS) assert.ok(ids.has(w), `arma sem maestria: ${w}`);
  assert.equal(pool.options.filter(o => o.source === 'SRD').length, 38);
  for (const o of pool.options) {
    assert.ok(MASTERIES.includes(o.mastery), `${o.id}: mastery`);
    assert.ok(['simple', 'martial'].includes(o.category), `${o.id}: category`);
    assert.equal(typeof o.melee, 'boolean', `${o.id}: melee`);
    assert.ok(Array.isArray(o.props), `${o.id}: props`);
    assert.equal(o.rules, '2024', `${o.id}: rules`);
  }
  // Armas do catálogo 2014 (srd.js) usam o mesmo id — exceto a rede, que deixou de ser arma.
  for (const w of SRD.WEAPONS) if (w.id !== 'net') assert.ok(ids.has(w.id), `srd.js: ${w.id} sem maestria`);
  assert.equal(pool.options.find(o => o.id === 'glaive').mastery, 'graze');
  assert.equal(pool.options.find(o => o.id === 'halberd').name.pt, 'Alabarda');
});

test('Propriedades de maestria', () => {
  assert.deepEqual(Object.keys(SHARED.masteryProperties).sort(), MASTERIES);
  for (const [id, m] of Object.entries(SHARED.masteryProperties)) {
    assert.ok(bilingual(m.name) && bilingual(m.desc), `${id}: name/desc`);
  }
});

test('Talentos: formato', () => {
  const seen = new Set();
  const ids = new Set(FEATS.map(f => f.id));
  const CATS = { 2024: ['origin', 'general', 'fightingStyle', 'epicBoon'], 2014: ['feat'] };
  for (const f of FEATS) {
    const at = `feat ${f.id}`;
    assert.match(f.id, /^[a-z][A-Za-z0-9]*$/, `${at}: id camelCase`);
    assert.ok(!seen.has(f.id), `${at}: id repetido`);
    seen.add(f.id);
    assert.ok(bilingual(f.name), `${at}: name`);
    assert.ok(bilingual(f.desc), `${at}: desc`);
    assert.ok(typeof f.source === 'string' && f.source, `${at}: source`);
    assert.ok(RULES.includes(f.rules), `${at}: rules`);
    assert.ok(CATS[f.rules].includes(f.category), `${at}: category`);
    const req = f.prereq || {};
    if (req.level) assert.ok(Number.isInteger(req.level) && req.level >= 1 && req.level <= 20, `${at}: prereq.level`);
    for (const k of Object.keys({ ...req.abilities, ...req.anyAbility })) assert.ok(ABILITIES.includes(k), `${at}: atributo ${k}`);
    for (const s of req.species || []) assert.ok(speciesIds.has(s), `${at}: espécie ${s}`);
    for (const r of req.feats || []) assert.ok(ids.has(r), `${at}: talento ${r}`);
    if (req.text) assert.ok(bilingual(req.text), `${at}: prereq.text`);
    if (f.asi) {
      assert.ok(f.asi.choose.length && f.asi.choose.every(a => ABILITIES.includes(a)), `${at}: asi.choose`);
      assert.ok([1, 2].includes(f.asi.amount), `${at}: asi.amount`);
      assert.ok([20, 30].includes(f.asi.max), `${at}: asi.max`);
    }
    for (const s of [...(f.grants?.spells || []), ...(f.grants?.cantrips || [])]) assert.ok(spellIds.has(s), `${at}: magia ${s}`);
    for (const s of [...(f.grants?.skills || []), ...(f.grants?.expertise || [])]) assert.ok(skillIds.has(s), `${at}: perícia ${s}`);
    for (const k of ['skill', 'skillProfOrExpertise']) {
      for (const s of f.choices?.[k]?.from || []) assert.ok(skillIds.has(s), `${at}: perícia ${s}`);
    }
    if (f.repeatKey) assert.ok(f.repeatable && f.choices?.[f.repeatKey], `${at}: repeatKey`);
    if (f.category === 'fightingStyle') assert.ok(SHARED.fightingStyle.options.some(o => o.id === f.styleId), `${at}: styleId`);
    if (f.base) assert.ok(f.rules === '2014' && findFeat(f.base, '2024'), `${at}: base`);
  }
});

test('Talentos: contagens e regras de ASI', () => {
  const count = (rules, category) => FEATS.filter(f => f.rules === rules && (!category || f.category === category)).length;
  assert.equal(count('2024', 'origin'), 10);
  assert.equal(count('2024', 'general'), 43);
  assert.equal(count('2024', 'fightingStyle'), 10);
  assert.equal(count('2024', 'epicBoon'), 12);
  assert.equal(count('2014'), 105);
  assert.equal(featsFor('2024').length, 75);
  assert.equal(FEATS.filter(f => f.rules === '2024' && f.source === 'SRD').length, 17);
  for (const f of featsFor('2024')) {
    if (f.category === 'origin' || f.category === 'fightingStyle') assert.ok(!f.asi, `${f.id}: sem ASI`);
    if (f.category === 'general') {
      assert.equal(f.prereq.level, 4, `${f.id}: nível 4`);
      assert.ok(f.asi && f.asi.max === 20, `${f.id}: ASI teto 20`);
    }
    if (f.category === 'epicBoon') {
      assert.equal(f.prereq.level, 19, `${f.id}: nível 19`);
      assert.equal(f.asi.max, 30, `${f.id}: teto 30`);
    }
  }
  assert.equal(findFeat('alert', '2014').id, 'alert2014');
  assert.equal(findFeat('alert2014', '2024').id, 'alert');
  assert.equal(findFeat('mobile', '2014').id, 'mobile');
  assert.equal(findFeat('mobile', '2024'), null);
});
