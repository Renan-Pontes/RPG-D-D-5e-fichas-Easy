import { test } from 'node:test';
import assert from 'node:assert/strict';
import rogue from '../data/class-options/rogue.js';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';

const base = (extra = {}) => ({ rulesVersion: '2024', className: 'rogue', level: 1, classOptions: [], ...extra });
const pendingPools = (prog) => Object.fromEntries(prog.pendingChoices.filter(c => c.type === 'classOption').map(c => [c.pool, c.missing]));

test('ladino 2024: especialização, idioma e maestria no nível 1', () => {
  const prog = computeProgression(base());
  assert.ok(!prog.pendingChoices.some(c => c.type === 'expertise'), 'pendência genérica de expertise removida');
  const pend = pendingPools(prog);
  assert.equal(pend.expertise, 2);
  assert.equal(pend.language, 1);
  assert.equal(pend.weaponMastery, 2);
});

test('ladino 2024: 4 especializações no nível 6', () => {
  const prog = computeProgression(base({ level: 6 }));
  assert.equal(pendingPools(prog).expertise, 4);
  const ch = base({ level: 6 });
  const four = ['stealth', 'sleightOfHand', 'perception', 'acrobatics'].map(id => ({ pool: 'expertise', id }));
  assert.ok(validateClassOptions(ch, 'rogue', { adds: four }).valid);
  assert.ok(!validateClassOptions(ch, 'rogue', { adds: [...four, { pool: 'expertise', id: 'athletics' }] }).valid, 'excede vagas');
});

test('ladino 2014: sem pools novos (mantém a pendência antiga)', () => {
  const prog = computeProgression(base({ rulesVersion: '2014' }));
  assert.ok(prog.pendingChoices.some(c => c.type === 'expertise'));
  assert.ok(!pendingPools(prog).language);
});

test('ladino 2024: traços revisados substituem o texto do PDF', () => {
  for (const [lv, list] of Object.entries(rogue.features)) {
    const got = PROGRESSION_RULES_2024.rogue.perLevel[lv].features;
    assert.equal(got.length, list.length, `nível ${lv}`);
    assert.ok(got.every(f => f.nameEn && !/SRD 5\.2\.1, Rogue/.test(f.descEn)));
  }
  assert.match(PROGRESSION_RULES_2024.rogue.perLevel[5].features[0].desc, /Recuar/);
});

test('subclasses do ladino cobrem 3/9/13/17 e não são mais conversão', () => {
  const ids = ['thief', 'assassin', 'arcanetrickster', 'soulknife', 'mastermind', 'swashbuckler', 'inquisitive', 'scout', 'phantom'];
  assert.deepEqual(Object.keys(rogue.subclasses).sort(), [...ids].sort());
  for (const id of ids) {
    for (const lv of [3, 9, 13, 17]) assert.ok(rogue.subclasses[id].levels[lv]?.features?.length, `${id} nível ${lv}`);
    assert.ok(!PROGRESSION_RULES_2024.rogue.subclassPerLevel[id].legacyCompatibility, `${id}`);
  }
  const at = PROGRESSION_RULES_2024.rogue.subclassPerLevel.arcanetrickster;
  assert.equal(at[3].cantripsKnown, 3);
  assert.equal(at[10].cantripsKnown, 4);
  assert.equal(at[20].spellsKnown, 13);
});

test('mentor: 2 idiomas e 1 jogo; fantasma: 1 perícia trocável', () => {
  const mm = pendingPools(computeProgression(base({ level: 3, subclass: 'mastermind' })));
  assert.equal(mm.mastermindLanguage, 2);
  assert.equal(mm.mastermindGamingSet, 1);
  const ch = base({ level: 3, subclass: 'mastermind' });
  assert.ok(validateClassOptions(ch, 'rogue', { adds: [{ pool: 'mastermindGamingSet', id: 'dragonchessSet' }] }).valid);
  assert.ok(!validateClassOptions({ ...ch, subclass: 'thief' }, 'rogue', { adds: [{ pool: 'mastermindGamingSet', id: 'dragonchessSet' }] }).valid);
  const ph = pendingPools(computeProgression(base({ level: 3, subclass: 'phantom' })));
  assert.equal(ph.phantomWhispers, 1);
  assert.ok(rogue.pools.phantomWhispers.freeSwap);
});

test('recursos do ladino: ids únicos e subclasses conhecidas', () => {
  const ids = rogue.resources.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of rogue.resources) {
    for (const s of r.subclass || []) assert.ok(PROGRESSION_RULES_2024.rogue.subclassPerLevel[s], `${r.id}: ${s}`);
    if (r.rules) assert.ok(['2014', '2024'].includes(r.rules));
  }
  const psi = rogue.resources.filter(r => r.id.startsWith('psionicEnergyDice'));
  assert.deepEqual(psi.map(r => r.rules).sort(), ['2014', '2024']);
  assert.equal(psi[0].uses.byLevel[17], 12);
});

test('concessões fixas: Batedor, Assassino, Mentor e Mente Escorregadia', () => {
  assert.deepEqual(rogue.subclasses.scout.levels[3].grants.expertise, ['nature', 'survival']);
  assert.ok(rogue.subclasses.assassin.levels[3].grants.tools.includes('poisonersKit'));
  assert.deepEqual(rogue.classLevels[15].grants.saves, ['wis', 'cha']);
  assert.ok(rogue.legacySubclassChoices.mastermind[3].mastermindLanguage);
});
