// Bruxo: dados de data/class-options/warlock.js aplicados pelo motor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import warlock from '../data/class-options/warlock.js';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { optionSlots } from '../src/progression/options.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';

const ABIL = { str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 16 };
const char = (level, extra = {}) => ({ className: 'warlock', level, rulesVersion: '2024', abilities: ABIL, classOptions: [], ...extra });
const legacy = (level, extra = {}) => ({ ...char(level, extra), rulesVersion: '2014' });
const picks = (list, level = 1) => list.map(([pool, id, detail]) => ({ classId: 'warlock', pool, id, level, ...(detail ? { detail } : {}) }));

test('invocações 2024 batem com a tabela (1,3,3,3,5,5,6,6,7,7,7,8,8,8,9,9,9,10,10,10)', () => {
  const table = [1, 3, 3, 3, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10];
  table.forEach((n, i) => {
    assert.equal(optionSlots(char(i + 1)).invocation?.total, n, `nível ${i + 1}`);
    assert.equal(PROGRESSION_RULES_2024.warlock.perLevel[i + 1].invocations, n, `json nível ${i + 1}`);
  });
});

test('invocações 2014: 0,2,2,2,3,3,4,4,5,5,5,6,6,6,7,7,7,8,8,8 e Dádiva do Pacto no 3', () => {
  const table = [0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8];
  table.forEach((n, i) => assert.equal(optionSlots(legacy(i + 1)).invocation?.total || 0, n, `nível ${i + 1}`));
  assert.equal(optionSlots(legacy(2)).pactBoon, undefined);
  assert.equal(optionSlots(legacy(3)).pactBoon.total, 1);
});

test('Arcana Mística: uma vaga por círculo nos níveis 11/13/15/17', () => {
  const s = optionSlots(char(17));
  for (const lv of [6, 7, 8, 9]) assert.equal(s[`mysticArcanum${lv}`].total, 1);
  assert.equal(optionSlots(char(10)).mysticArcanum6, undefined);
  assert.equal(optionSlots(char(12)).mysticArcanum7, undefined);
  const p = computeProgression(char(11, { classOptions: picks([['invocation', 'agonizingBlast', 'eldritchBlast'], ['mysticArcanum6', 'eyebite']], 11) }));
  assert.ok(p.autoSpells.includes('eyebite'));
});

test('traços 2024 revisados substituem os do PDF em todos os níveis com traço', () => {
  const rules = PROGRESSION_RULES_2024.warlock;
  for (const lv of [1, 2, 3, 4, 8, 9, 11, 12, 13, 15, 16, 17, 19, 20]) {
    const feats = rules.perLevel[lv].features;
    assert.ok(feats.length && feats.every(f => f.descEn && !/SRD 5\.2\.1|Wizard$/.test(f.descEn)), `nível ${lv}`);
  }
  assert.deepEqual(rules.perLevel[1].features.map(f => f.id), ['eldritchInvocations', 'pactMagic']);
});

test('subclasses: traços nos níveis 3/6/10/14 e magias por nível', () => {
  const ids = ['fiend', 'archfey', 'celestial', 'greatoldone', 'hexblade', 'undying', 'fathomless', 'genie', 'undead'];
  assert.deepEqual(Object.keys(warlock.subclasses).sort(), [...ids].sort());
  for (const id of ids) {
    const levels = PROGRESSION_RULES_2024.warlock.subclassPerLevel[id];
    for (const lv of [3, 6, 10, 14]) assert.ok(levels[lv]?.features?.length, `${id} nível ${lv}`);
    for (const lv of [3, 5, 7, 9]) assert.ok(levels[lv]?.autoSpells?.length, `${id} magias nível ${lv}`);
  }
  const goo = computeProgression(char(10, { subclass: 'greatoldone' }));
  assert.ok(goo.autoSpells.includes('hex') && goo.autoSpells.includes('clairvoyance'));
  assert.ok(goo.features.some(f => f.id === 'psychicSpells' && f.level === 3));
  const cel = computeProgression(char(3, { subclass: 'celestial' }));
  assert.ok(cel.autoCantrips.includes('light') && cel.autoCantrips.includes('sacredFlame'));
  const fiend = computeProgression(char(9, { subclass: 'fiend' }));
  assert.ok(['burningHands', 'fireball', 'wallOfFire', 'geas'].every(s => fiend.autoSpells.includes(s)));
  const hex = computeProgression(char(3, { subclass: 'hexblade' }));
  assert.ok(hex.features.some(f => f.id === 'hexbladesCurse' && f.level === 3));
});

test('Gênio: escolha de tipo só com a subclasse', () => {
  assert.equal(optionSlots(char(3, { subclass: 'genie' })).genieKind.total, 1);
  assert.equal(optionSlots(char(3, { subclass: 'fiend' })).genieKind, undefined);
  const c = char(3, { subclass: 'genie', classOptions: picks([['invocation', 'pactOfTheTome'], ['invocation', 'agonizingBlast', 'eldritchBlast'], ['invocation', 'devilsSight']]) });
  assert.equal(validateClassOptions(c, 'warlock', { adds: [{ pool: 'genieKind', id: 'efreeti' }] }).valid, true);
});

test('pré-requisitos: nível, pacto e cadeia de invocações', () => {
  const v = (c, adds) => validateClassOptions(c, 'warlock', { adds }).valid;
  assert.equal(v(char(1), [{ pool: 'invocation', id: 'devilsSight' }]), false);           // nível 2+
  assert.equal(v(char(1), [{ pool: 'invocation', id: 'pactOfTheBlade' }]), true);
  assert.equal(v(char(5), [{ pool: 'invocation', id: 'pactOfTheBlade' }, { pool: 'invocation', id: 'thirstingBlade' }]), true);
  assert.equal(v(char(5), [{ pool: 'invocation', id: 'thirstingBlade' }]), false);         // sem Pacto da Lâmina
  assert.equal(v(char(5), [{ pool: 'invocation', id: 'beastSpeech' }]), false);            // só 2014
  assert.equal(v(legacy(3), [{ pool: 'pactBoon', id: 'pactOfTheBlade' }]), true);
  assert.equal(v(legacy(3), [{ pool: 'invocation', id: 'pactOfTheBlade' }]), false);       // invocação só 2024
  // 2014: Arma do Pacto Aprimorada exige a Dádiva da Lâmina (pool pactBoon)
  const blade14 = legacy(3, { classOptions: picks([['invocation', 'beastSpeech'], ['invocation', 'eldritchSight'], ['pactBoon', 'pactOfTheBlade']]) });
  assert.equal(validateClassOptions(legacy(5, { classOptions: blade14.classOptions }), 'warlock', { adds: [{ pool: 'invocation', id: 'improvedPactWeapon' }] }).valid, true);
});

test('Pacto do Tomo abre 3 truques e 2 rituais', () => {
  const c = char(1, { classOptions: picks([['invocation', 'pactOfTheTome']]) });
  const s = optionSlots(c);
  assert.equal(s.tomeCantrip.total, 3);
  assert.equal(s.tomeRitual.total, 2);
  const p = computeProgression({ ...c, classOptions: [...c.classOptions, ...picks([['tomeCantrip', 'guidance'], ['tomeRitual', 'detectMagic']])] });
  assert.ok(p.autoCantrips.includes('guidance') && p.autoSpells.includes('detectMagic'));
});

test('repetíveis exigem alvos diferentes', () => {
  const c = char(2, { classOptions: picks([['invocation', 'pactOfTheBlade']]) });
  const r = validateClassOptions(c, 'warlock', { adds: [
    { pool: 'invocation', id: 'agonizingBlast', detail: 'eldritchBlast' },
    { pool: 'invocation', id: 'agonizingBlast', detail: 'eldritchBlast' },
  ] });
  assert.equal(r.valid, false);
});

test('rodada 2: Contatar Patrono, Guerreiro Amaldiçoado e tipo de gênio por versão', () => {
  assert.ok(computeProgression(char(9)).autoSpells.includes('contactOtherPlane'));
  assert.ok(!computeProgression(char(8)).autoSpells.includes('contactOtherPlane'));
  assert.deepEqual(PROGRESSION_RULES_2024.warlock.subclassPerLevel.hexblade[3].grants.weapons, ['Martial']);
  assert.equal(optionSlots(legacy(1, { subclass: 'genie' })).genieKind.total, 1);
  assert.equal(optionSlots(char(1, { subclass: 'genie' })).genieKind, undefined);
});

test('rodada 4: recursos com usos', () => {
  const rs = warlock.resources;
  const ids = rs.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length, 'ids únicos');
  const USES = ['byLevel', 'fixed', 'ability', 'profBonus', 'perClassLevel', 'classLevel'];
  for (const r of rs) {
    assert.match(r.id, /^[a-z][A-Za-z0-9]*$/);
    assert.ok(r.name.pt && r.name.en, `${r.id}: nome`);
    assert.ok(Object.keys(r.uses).some(k => USES.includes(k)), `${r.id}: uses`);
    assert.ok(['long', 'short'].includes(r.recharge), `${r.id}: recharge`);
    if (r.rules) assert.ok(['2014', '2024'].includes(r.rules));
    for (const sub of r.subclass || []) assert.ok(PROGRESSION_RULES_2024.warlock.subclassPerLevel[sub], `${r.id}: subclasse ${sub}`);
  }
  const get = id => rs.find(r => r.id === id);
  assert.deepEqual([6, 7, 8, 9].map(lv => get(`mysticArcanum${lv}`).minLevel), [11, 13, 15, 17]);
  assert.equal(get('magicalCunning').minLevel, 2);
  assert.equal(get('contactPatron').minLevel, 9);
  assert.equal(get('healingLight').uses.byLevel[3], 4);                  // 1 + nível
  assert.equal(get('hexbladesCurse').minLevel, 3);
  assert.equal(get('hexbladesCurse2014').minLevel, 1);
  assert.ok(!rs.some(r => /slot/i.test(r.id)), 'sem espaços do Pacto');
  const opt = id => warlock.pools.invocation.options.find(o => o.id === id);
  assert.deepEqual(opt('giftOfTheDepths').resource, { uses: { fixed: 1 }, recharge: 'long' });
  assert.equal(opt('tombOfLevistus').resource.recharge, 'short');
  assert.equal(opt('armorOfShadows').resource, undefined);
});
