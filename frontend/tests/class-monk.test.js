import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';
import monk from '../data/class-options/monk.js';
import { poolOptions } from '../src/progression/options-catalog.js';

const sheet = (level, extra = {}) => ({
  rulesVersion: '2024', className: 'monk', subclass: '', level, race: 'human', background: 'sage', maxHp: 30, currentHp: 30,
  abilities: { str: 10, dex: 16, con: 14, int: 10, wis: 15, cha: 8 }, raceBonus: {}, spells: [], skillProfs: [], classOptions: [], ...extra,
});
const pick = (pool, id, level = 1) => ({ classId: 'monk', pool, id, level });

test('monge 2024: traços revisados substituem os do SRD em todos os níveis com traços', () => {
  const rule = PROGRESSION_RULES_2024.monk;
  for (const [lv, list] of Object.entries(monk.features)) {
    assert.deepEqual(rule.perLevel[lv].features.map(x => x.id), list.map(x => x.id), `nível ${lv}`);
    assert.ok(rule.perLevel[lv].features.every(x => x.nameEn && x.descEn));
  }
  assert.equal(rule.perLevel[3].subclassChoice, true);
  assert.equal(rule.perLevel[4].asiOrFeat, true);
  assert.equal(rule.perLevel[5].extraAttacks, 1);
});

test('monge 2024: todas as tradições com traços em 3/6/11/17', () => {
  const rule = PROGRESSION_RULES_2024.monk;
  for (const id of ['openhand', 'shadow', 'elements', 'mercy', 'fourelements', 'longdeath', 'sunsoul', 'drunkenmaster', 'kensei', 'astralself', 'ascendantdragon']) {
    for (const lv of [3, 6, 11, 17]) assert.ok(rule.subclassPerLevel[id]?.[lv]?.features?.length, `${id} ${lv}`);
    assert.ok(!rule.subclassPerLevel[id].legacyCompatibility, id);
  }
  // alias mantido por rules.js
  assert.equal(rule.subclassPerLevel.openHand, rule.subclassPerLevel.openhand);
});

test('monge: ferramenta no nível 1 fica pendente e aceita 1 escolha', () => {
  const c = sheet(1);
  assert.ok(computeProgression(c).pendingChoices.some(p => p.pool === 'tool'));
  assert.equal(validateClassOptions(c, 'monk', { adds: [{ pool: 'tool', id: 'lute' }] }).valid, true);
  assert.equal(validateClassOptions(c, 'monk', { adds: [{ pool: 'tool', id: 'lute' }, { pool: 'tool', id: 'drum' }] }).valid, false);
  assert.equal(computeProgression({ ...c, classOptions: [pick('tool', 'lute')] }).pendingChoices.some(p => p.pool === 'tool'), false);
});

test('Guerreiro da Sombra e dos Elementos concedem magias/truques', () => {
  const shadow = computeProgression(sheet(3, { subclass: 'shadow', classOptions: [pick('tool', 'flute')] }));
  assert.ok(shadow.autoSpells.includes('darkness'));
  assert.ok(shadow.autoCantrips.includes('minorIllusion'));
  const elements = computeProgression(sheet(3, { subclass: 'elements', classOptions: [pick('tool', 'flute')] }));
  assert.ok(elements.autoCantrips.includes('elementalism'));
});

test('Quatro Elementos: disciplinas com nível mínimo, magias concedidas e troca', () => {
  const c = sheet(3, { subclass: 'fourelements', classOptions: [pick('tool', 'flute')] });
  assert.ok(computeProgression(c).pendingChoices.some(p => p.pool === 'elementalDiscipline'));
  assert.equal(validateClassOptions(c, 'monk', { adds: [{ pool: 'elementalDiscipline', id: 'flamesOfThePhoenix' }] }).valid, false);
  assert.equal(validateClassOptions(c, 'monk', { adds: [{ pool: 'elementalDiscipline', id: 'fistOfFourThunders' }] }).valid, true);
  const c6 = sheet(6, { subclass: 'fourelements', classOptions: [pick('tool', 'flute'), pick('elementalDiscipline', 'fistOfFourThunders', 3)] });
  assert.ok(computeProgression(c6).autoSpells.includes('thunderwave'));
  assert.equal(validateClassOptions(c6, 'monk', {
    adds: [{ pool: 'elementalDiscipline', id: 'gongOfTheSummit' }],
    swaps: [{ pool: 'elementalDiscipline', from: 'fistOfFourThunders', to: 'waterWhip' }],
  }, { levelUp: true }).valid, true);
});

test('Kensei: 1 arma corpo a corpo + 1 à distância + pincel no 3, +1 arma qualquer no 6', () => {
  const c = sheet(3, { subclass: 'kensei', classOptions: [pick('tool', 'flute')] });
  assert.equal(validateClassOptions(c, 'monk', { adds: [
    { pool: 'kenseiWeaponMelee', id: 'longsword' }, { pool: 'kenseiWeaponRanged', id: 'longbow' }, { pool: 'kenseiBrush', id: 'paintersSupplies' },
  ] }).valid, true);
  // Duas armas quaisquer no mesmo pool não valem mais no nível 3.
  assert.equal(validateClassOptions(c, 'monk', { adds: [
    { pool: 'kenseiWeaponMelee', id: 'longsword' }, { pool: 'kenseiWeaponMelee', id: 'rapier' },
  ] }).valid, false);
  // O seletor só mostra armas corpo a corpo num pool e à distância no outro.
  const melee = poolOptions(c, 'monk', 'kenseiWeaponMelee').map(o => o.id);
  const ranged = poolOptions(c, 'monk', 'kenseiWeaponRanged').map(o => o.id);
  assert.ok(melee.includes('longsword') && !melee.includes('longbow'));
  assert.ok(ranged.includes('longbow') && !ranged.includes('longsword'));
  assert.equal(computeProgression(sheet(6, { subclass: 'kensei', classOptions: [pick('tool', 'flute'),
    pick('kenseiWeaponMelee', 'longsword', 3), pick('kenseiWeaponRanged', 'longbow', 3), pick('kenseiBrush', 'paintersSupplies', 3)] }))
    .pendingChoices.find(p => p.pool === 'kenseiWeapon')?.missing, 1);
});

test('Dragão Ascendente: 1 idioma no nível 3', () => {
  const c = sheet(3, { subclass: 'ascendantdragon', classOptions: [pick('tool', 'flute')] });
  assert.ok(computeProgression(c).pendingChoices.some(p => p.pool === 'dragonLanguage'));
  assert.equal(validateClassOptions(c, 'monk', { adds: [{ pool: 'dragonLanguage', id: 'Draconic' }] }).valid, true);
});

// --- Rodada 2: startingClassOnly, swapLevels, grants de proficiência, escolhas 2014 ---
import { allOptionGrants } from '../src/progression/options.js';
import { withClassLevel } from '../src/progression/multiclass.js';

test('ferramenta do nível 1 não vale para quem entra no monge por multiclasse', () => {
  const mc = withClassLevel({ ...sheet(3), className: 'fighter' }, 'monk');
  assert.equal(computeProgression(mc).pendingChoices.some(p => p.pool === 'tool'), false);
  assert.equal(validateClassOptions(mc, 'monk', { adds: [{ pool: 'tool', id: 'lute' }] }).valid, false);
});

test('ferramenta, armas kensei e proficiências fixas viram grants', () => {
  const g = allOptionGrants({ classOptions: [
    pick('tool', 'lute'), pick('kenseiWeapon', 'longbow', 3), pick('kenseiBrush', 'paintersSupplies', 3),
    pick('subclassProficiencies', 'implementsOfMercy', 3),
  ] });
  assert.deepEqual(g.tools.sort(), ['herbalismKit', 'lute', 'paintersSupplies']);
  assert.deepEqual(g.weapons, ['longbow']);
  assert.deepEqual(g.skills.sort(), ['insight', 'medicine']);
  // 2014: proficiências fixas da tradição ainda são uma escolha única.
  const mercy14 = sheet(3, { rulesVersion: '2014', subclass: 'mercy', classOptions: [pick('tool', 'flute')] });
  assert.equal(validateClassOptions(mercy14, 'monk', { adds: [{ pool: 'subclassProficiencies', id: 'drunkenBonusProficiencies' }] }).valid, false);
  assert.equal(validateClassOptions(mercy14, 'monk', { adds: [{ pool: 'subclassProficiencies', id: 'implementsOfMercy' }] }).valid, true);
});

test('2024: Misericórdia e Mestre Bêbado concedem proficiências automaticamente', () => {
  const mercy = computeProgression(sheet(3, { subclass: 'mercy', classOptions: [pick('tool', 'flute')] }));
  assert.equal(mercy.pendingChoices.some(p => p.pool === 'subclassProficiencies'), false);
  assert.deepEqual(mercy.grants.skills.sort(), ['insight', 'medicine']);
  assert.deepEqual(mercy.grants.tools.sort(), ['flute', 'herbalismKit']);
  const drunk = computeProgression(sheet(3, { subclass: 'drunkenmaster', classOptions: [pick('tool', 'flute')] }));
  assert.deepEqual(drunk.grants.skills, ['performance']);
  assert.ok(drunk.grants.tools.includes('brewersSupplies'));
});

test('disciplinas elementais: troca só ao chegar em 6, 11 ou 17', () => {
  const opts = (lv, extra = []) => sheet(lv, { subclass: 'fourelements', classOptions: [pick('tool', 'flute'), pick('elementalDiscipline', 'fistOfFourThunders', 3), ...extra] });
  const swap = { swaps: [{ pool: 'elementalDiscipline', from: 'fistOfFourThunders', to: 'waterWhip' }] };
  assert.equal(validateClassOptions(opts(5), 'monk', swap, { levelUp: true }).valid, false);
  assert.equal(validateClassOptions(opts(11, [pick('elementalDiscipline', 'gongOfTheSummit', 6)]), 'monk',
    { ...swap, adds: [{ pool: 'elementalDiscipline', id: 'flamesOfThePhoenix' }] }, { levelUp: true }).valid, true);
});

test('fichas 2014 também têm as escolhas de tradição (legacySubclassChoices)', () => {
  for (const [subclass, pool] of [['fourelements', 'elementalDiscipline'], ['kensei', 'kenseiWeaponMelee'], ['ascendantdragon', 'dragonLanguage'], ['mercy', 'subclassProficiencies'], ['drunkenmaster', 'subclassProficiencies']]) {
    const c = sheet(3, { rulesVersion: '2014', subclass, classOptions: [pick('tool', 'flute')] });
    assert.ok(computeProgression(c).pendingChoices.some(p => p.pool === pool), subclass);
  }
  const k = sheet(3, { rulesVersion: '2014', subclass: 'kensei', classOptions: [pick('tool', 'flute')] });
  assert.equal(validateClassOptions(k, 'monk', { adds: [{ pool: 'kenseiWeaponRanged', id: 'pistol' }] }).valid, false);
});

test('recursos do monge: forma e versões', () => {
  const ids = new Set();
  for (const res of monk.resources) {
    assert.ok(/^[a-z][A-Za-z0-9]*$/.test(res.id) && !ids.has(res.id), res.id);
    ids.add(res.id);
    assert.ok(res.name.pt && res.name.en && res.desc.pt && res.desc.en, res.id);
    assert.ok(['long', 'short'].includes(res.recharge), res.id);
    assert.equal(Object.keys(res.uses).length >= 1, true, res.id);
    for (const sub of res.subclass || []) assert.ok(PROGRESSION_RULES_2024.monk.subclassPerLevel[sub], `${res.id}: ${sub}`);
  }
  const focus = monk.resources.find(x => x.id === 'focusPoints');
  assert.deepEqual([focus.rules, focus.recharge, focus.minLevel, focus.uses.classLevel], ['2024', 'short', 2, true]);
  assert.equal(monk.resources.find(x => x.id === 'ki').rules, '2014');
});

test('Kensei antigo (2 × kenseiWeapon no nível 3) migra para os pools corpo a corpo/à distância', async () => {
  const { migrateClassOptions, validateOptionPicks } = await import('../src/progression/options.js');
  const old = {
    rulesVersion: '2014', className: 'monk', subclass: 'kensei', level: 4, abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8 },
    classOptions: [
      { classId: 'monk', pool: 'kenseiWeapon', id: 'longsword', level: 3 },
      { classId: 'monk', pool: 'kenseiWeapon', id: 'longbow', level: 3 },
      { classId: 'monk', pool: 'kenseiBrush', id: (await import('../data/class-options/monk.js')).default.pools.kenseiBrush.options[0].id, level: 3 },
    ],
  };
  const m = migrateClassOptions(old);
  assert.deepEqual(m.classOptions.filter(p => p.pool.startsWith('kenseiWeapon')).map(p => [p.pool, p.id]),
    [['kenseiWeaponMelee', 'longsword'], ['kenseiWeaponRanged', 'longbow']]);
  assert.equal(migrateClassOptions(m), m); // idempotente
  assert.equal(validateOptionPicks(old, 'monk', {}, 4).valid, true);
});
