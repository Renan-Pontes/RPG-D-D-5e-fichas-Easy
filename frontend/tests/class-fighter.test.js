import { test } from 'node:test';
import assert from 'node:assert/strict';
import fighter from '../data/class-options/fighter.js';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';

const base = (extra = {}) => ({ rulesVersion: '2024', className: 'fighter', level: 1, classOptions: [], ...extra });
const pendingPools = (prog) => prog.pendingChoices.filter(c => c.type === 'classOption').map(c => [c.pool, c.missing]);

test('guerreiro 2024: estilo de luta e maestria no nível 1', () => {
  const prog = computeProgression(base());
  assert.ok(!prog.pendingChoices.some(c => c.type === 'fightingStyle'), 'pendência genérica de estilo removida');
  const pend = Object.fromEntries(pendingPools(prog));
  assert.equal(pend.fightingStyle, 1);
  assert.equal(pend.weaponMastery, 3);
});

test('guerreiro 2024: maestria soma 6 no nível 16', () => {
  const prog = computeProgression(base({ level: 16 }));
  assert.equal(Object.fromEntries(pendingPools(prog)).weaponMastery, 6);
});

test('guerreiro 2024: traços revisados substituem o texto do PDF', () => {
  const lv2 = PROGRESSION_RULES_2024.fighter.perLevel[2].features;
  assert.ok(lv2.every(f => f.nameEn && !/SRD 5\.2\.1, Fighter/.test(f.descEn)));
  for (const [lv, list] of Object.entries(fighter.features)) {
    assert.equal(PROGRESSION_RULES_2024.fighter.perLevel[lv].features.length, list.length);
  }
});

test('mestre de batalha: 3 manobras no 3, 9 no 15, com troca', () => {
  const at3 = computeProgression(base({ level: 3, subclass: 'battlemaster' }));
  assert.equal(Object.fromEntries(pendingPools(at3)).maneuver, 3);
  const at15 = computeProgression(base({ level: 15, subclass: 'battlemaster' }));
  assert.equal(Object.fromEntries(pendingPools(at15)).maneuver, 9);

  const ch = base({ level: 3, subclass: 'battlemaster' });
  assert.ok(validateClassOptions(ch, 'fighter', { adds: ['tripAttack', 'riposte', 'parry'].map(id => ({ pool: 'maneuver', id })) }).valid);
  assert.ok(!validateClassOptions(ch, 'fighter', { adds: [{ pool: 'maneuver', id: 'brace' }] }).valid, 'Brace só em 2014');
  assert.ok(!validateClassOptions(ch, 'fighter', { adds: ['tripAttack', 'riposte', 'parry', 'rally'].map(id => ({ pool: 'maneuver', id })) }).valid, 'excede vagas');
});

test('manobras 2024: 20 opções sem regra de versão', () => {
  const list = fighter.pools.maneuver.options;
  assert.equal(list.filter(o => !o.rules).length, 20);
  assert.equal(list.filter(o => o.rules === '2014').length, 3);
});

test('cavaleiro das runas: colina e tempestade exigem nível 7', () => {
  const ch = base({ level: 3, subclass: 'runeknight' });
  assert.ok(!validateClassOptions(ch, 'fighter', { adds: [{ pool: 'rune', id: 'hillRune' }] }).valid);
  assert.ok(validateClassOptions(ch, 'fighter', { adds: [{ pool: 'rune', id: 'fireRune' }, { pool: 'rune', id: 'stoneRune' }] }).valid);
  assert.ok(validateClassOptions({ ...ch, level: 7 }, 'fighter', { adds: [{ pool: 'rune', id: 'hillRune' }] }).valid);
});

test('campeão 2024: estilo adicional no nível 7 sem pendência genérica', () => {
  const prog = computeProgression(base({ level: 7, subclass: 'champion' }));
  assert.ok(!prog.pendingChoices.some(c => c.type === 'fightingStyle'));
  assert.equal(Object.fromEntries(pendingPools(prog)).fightingStyle, 2);
});

test('arqueiro arcano: tiros, perícia e truque', () => {
  const prog = computeProgression(base({ level: 18, subclass: 'arcanearcher' }));
  const pend = Object.fromEntries(pendingPools(prog));
  assert.equal(pend.arcaneShot, 6);
  assert.equal(pend.arcaneArcherSkill, 1);
  assert.equal(pend.arcaneArcherCantrip, 1);
});

test('subclasses do guerreiro cobrem os níveis 3/7/10/15/18', () => {
  for (const [id, sub] of Object.entries(fighter.subclasses)) {
    for (const lv of [3, 7, 10, 15, 18]) {
      if (id === 'arcanearcher' && lv === 10) continue; // só ganha um tiro novo
      assert.ok(sub.levels[lv]?.features?.length, `${id} nível ${lv}`);
    }
    assert.ok(!PROGRESSION_RULES_2024.fighter.subclassPerLevel[id].legacyCompatibility, `${id} não é mais conversão`);
  }
  const ek = PROGRESSION_RULES_2024.fighter.subclassPerLevel.eldritchknight;
  assert.equal(ek[3].spellsKnown, 3);
  assert.equal(ek[10].cantripsKnown, 3);
  assert.deepEqual(PROGRESSION_RULES_2024.fighter.subclassPerLevel.psiwarrior[18].autoSpells, ['telekinesis']);
});

test('guerreiro 2014: escolhas de subclasse legadas', () => {
  const champ9 = computeProgression(base({ rulesVersion: '2014', level: 9, subclass: 'champion' }));
  assert.equal(Object.fromEntries(pendingPools(champ9)).fightingStyle, 1, 'Campeão 2014 ainda sem estilo extra no 9');
  const champ10 = computeProgression(base({ rulesVersion: '2014', level: 10, subclass: 'champion' }));
  assert.equal(Object.fromEntries(pendingPools(champ10)).fightingStyle, 2);
  const bm = Object.fromEntries(pendingPools(computeProgression(base({ rulesVersion: '2014', level: 3, subclass: 'battlemaster' }))));
  assert.equal(bm.maneuver, 3);
  assert.equal(bm.studentOfWarTool, 1);
  assert.equal(bm.studentOfWarSkill, undefined, 'sem perícia em 2014');
  const bm24 = Object.fromEntries(pendingPools(computeProgression(base({ level: 3, subclass: 'battlemaster' }))));
  assert.equal(bm24.studentOfWarSkill, 1);
  assert.equal(bm24.studentOfWarTool, 1);
});

test('manobras: troca só nos níveis 3/7/10/15', () => {
  assert.deepEqual(fighter.pools.maneuver.swapLevels, [3, 7, 10, 15]);
});

test('samurai: idioma via pool dinâmico e salvaguarda no 7', () => {
  const ch = base({ level: 7, subclass: 'samurai' });
  assert.ok(validateClassOptions(ch, 'fighter', { adds: [
    { pool: 'samuraiProficiency', id: 'language' }, { pool: 'samuraiLanguage', id: 'Elvish' }, { pool: 'samuraiSave', id: 'wis' },
  ] }).valid);
  assert.ok(!validateClassOptions(ch, 'fighter', { adds: [{ pool: 'samuraiProficiency', id: 'history' }, { pool: 'samuraiLanguage', id: 'Elvish' }] }).valid,
    'idioma só com a opção "um idioma"');
});

test('cavaleiro das runas: ferreiro e Gigante automáticos no nível 3', () => {
  const g = computeProgression(base({ level: 3, subclass: 'runeknight' })).grants;
  assert.ok(g.tools.includes('smithsTools'));
  assert.ok(g.languages.includes('Giant'));
  assert.equal(fighter.pools.runeKnightProficiencies, undefined);
});

test('recursos do guerreiro: formato e cobertura', () => {
  const ids = new Set();
  const subs = new Set(Object.keys(PROGRESSION_RULES_2024.fighter.subclassPerLevel));
  for (const r of fighter.resources) {
    assert.match(r.id, /^[a-z][A-Za-z0-9]*$/);
    assert.ok(!ids.has(r.id), `${r.id} repetido`);
    ids.add(r.id);
    assert.ok(r.name.pt && r.name.en);
    assert.ok(['long', 'short'].includes(r.recharge));
    assert.equal(Object.keys(r.uses).length > 0, true);
    for (const s of r.subclass || []) assert.ok(subs.has(s), `${r.id}: subclasse ${s}`);
    if (r.rules) assert.ok(['2014', '2024'].includes(r.rules));
  }
  for (const id of ['secondWind', 'actionSurge', 'indomitable', 'superiorityDice', 'psionicEnergy', 'giantsMight', 'arcaneShot'])
    assert.ok(ids.has(id), id);
  const sw = fighter.resources.find(r => r.id === 'secondWind');
  assert.deepEqual(sw.uses.byLevel, { 1: 2, 4: 3, 10: 4 });
  assert.equal(sw.shortRestRegain, 1);
  assert.ok(fighter.pools.rune.options.every(o => o.resource?.recharge === 'short'));
});
