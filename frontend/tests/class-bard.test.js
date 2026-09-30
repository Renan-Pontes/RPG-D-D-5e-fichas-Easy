import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';
import { allOptionGrants } from '../src/progression/options.js';
import { CLASS_OPTIONS } from '../data/class-options/index.js';

const bard = (extra = {}) => ({ className: 'bard', rulesVersion: '2024', level: 1, classOptions: [], ...extra });
const pools = (prog) => prog.pendingChoices.filter(c => c.type === 'classOption').map(c => `${c.pool}:${c.missing}`).sort();

test('bardo 2024: traços revisados com PT/EN, sem "Contramagia"', () => {
  const rule = PROGRESSION_RULES_2024.bard;
  assert.equal(rule.perLevel[7].features[0].name, 'Contraencanto');
  assert.equal(rule.perLevel[7].features[0].nameEn, 'Countercharm');
  assert.ok(rule.perLevel[1].features.every(f => f.descEn && f.desc));
  assert.deepEqual(rule.perLevel[20].autoSpells, ['powerWordHeal', 'powerWordKill']);
  const json = JSON.stringify(rule);
  assert.ok(!json.includes('Contramagia'));
  assert.ok(!json.includes('SRD 5.2.1, Bard, page'));
});

test('bardo 2024: instrumentos no 1, Especialização no 2 e no 9', () => {
  assert.deepEqual(pools(computeProgression(bard())), ['musicalInstrument:1', 'musicalInstrumentStart:2']);
  assert.deepEqual(pools(computeProgression(bard({ level: 2 }))), ['expertise:2', 'musicalInstrument:1', 'musicalInstrumentStart:2']);
  const p9 = computeProgression(bard({ level: 9, subclass: 'valor' }));
  assert.ok(pools(p9).includes('expertise:4'));
  assert.ok(!p9.pendingChoices.some(c => c.type === 'expertise'), 'pendência genérica de expertise sai');
});

test('bardo por multiclasse: só 1 instrumento', () => {
  // classView (multiclass.js) marca startingClass com a classe inicial da ficha.
  assert.deepEqual(pools(computeProgression(bard({ startingClass: 'fighter' }))), ['musicalInstrument:1']);
  assert.deepEqual(pools(computeProgression(bard({ startingClass: 'bard' }))), ['musicalInstrument:1', 'musicalInstrumentStart:2']);
});

test('bardo 2014: Especialização nos níveis 3 e 10', () => {
  const p = computeProgression(bard({ rulesVersion: '2014', level: 10, subclass: 'valor' }));
  assert.ok(pools(p).includes('expertise:4'));
});

test('bardo: Saber abre perícias e Descobertas Mágicas; Espadas abre Estilo de Luta', () => {
  const lore = pools(computeProgression(bard({ level: 6, subclass: 'lore' })));
  assert.ok(lore.includes('loreSkill:3') && lore.includes('magicalDiscoveries:2'));
  const swords = computeProgression(bard({ level: 6, subclass: 'swords' }));
  assert.ok(pools(swords).includes('fightingStyle:1'));
  assert.equal(swords.extraAttacks, 1);
  assert.ok(validateClassOptions(bard({ level: 3, subclass: 'swords' }), 'bard', { adds: [{ pool: 'fightingStyle', id: 'dueling' }] }).valid);
  assert.ok(!validateClassOptions(bard({ level: 3, subclass: 'swords' }), 'bard', { adds: [{ pool: 'fightingStyle', id: 'archery' }] }).valid);
});

test('bardo: expertise e instrumentos concedidos', () => {
  const ch = bard({ level: 2, classOptions: [
    { classId: 'bard', pool: 'expertise', id: 'performance', level: 2 },
    { classId: 'bard', pool: 'musicalInstrument', id: 'lute', level: 1 },
  ] });
  assert.ok(validateClassOptions(ch, 'bard', { adds: [{ pool: 'expertise', id: 'persuasion' }] }).valid);
  assert.ok(!validateClassOptions(ch, 'bard', { adds: [{ pool: 'expertise', id: 'persuasion' }, { pool: 'expertise', id: 'stealth' }] }).valid);
  assert.ok(!validateClassOptions(ch, 'bard', { adds: [{ pool: 'musicalInstrument', id: 'lute' }] }).valid);
  const prog = computeProgression(ch);
  assert.ok(prog.classOptions.some(p => p.id === 'lute'));
});

test('bardo: instrumento concede proficiência em ferramenta', () => {
  const lute = CLASS_OPTIONS.bard.pools.musicalInstrument.options.find(o => o.id === 'lute');
  assert.deepEqual(lute.grants.tools, ['lute']);
  const g = allOptionGrants({ classOptions: [{ classId: 'bard', pool: 'musicalInstrumentStart', id: 'lute', level: 1 }] });
  assert.deepEqual(g.tools, ['lute']);
});

test('bardo: Saber 2024 usa Descobertas Mágicas; Saber 2014 usa Segredos Mágicos Adicionais', () => {
  const p24 = pools(computeProgression(bard({ level: 6, subclass: 'lore' })));
  assert.ok(p24.includes('magicalDiscoveries:2') && !p24.some(x => x.startsWith('additionalMagicalSecrets')));
  const p14 = pools(computeProgression(bard({ rulesVersion: '2014', level: 6, subclass: 'lore' })));
  assert.ok(p14.includes('additionalMagicalSecrets:2') && p14.includes('loreSkill:3') && !p14.some(x => x.startsWith('magicalDiscoveries')));
  assert.equal(CLASS_OPTIONS.bard.pools.additionalMagicalSecrets.filter.classes, undefined);
});

test('bardo: subclasses 2024 e de suplemento com traços em 3, 6 e 14', () => {
  const subs = PROGRESSION_RULES_2024.bard.subclassPerLevel;
  for (const id of ['dance', 'glamour', 'lore', 'valor', 'swords', 'whispers', 'creation', 'eloquence', 'spirits']) {
    for (const lv of [3, 6, 14]) assert.ok(subs[id]?.[lv]?.features?.length, `${id} nível ${lv}`);
    assert.ok(!subs[id].legacyCompatibility, `${id} não é mais conversão 2014`);
  }
  const glamour = computeProgression(bard({ level: 6, subclass: 'glamour' }));
  for (const s of ['charmPerson', 'mirrorImage', 'command']) assert.ok(glamour.autoSpells.includes(s));
  assert.ok(computeProgression(bard({ level: 3, subclass: 'spirits' })).autoCantrips.includes('guidance'));
  assert.equal(computeProgression(bard({ level: 6, subclass: 'valor' })).extraAttacks, 1);
  assert.equal(computeProgression(bard({ level: 6, subclass: 'dance' })).extraAttacks, 0);
});

test('bardo: recursos com usos', () => {
  const res = CLASS_OPTIONS.bard.resources;
  const ids = res.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length, 'ids únicos');
  const insp = res.find(r => r.id === 'bardicInspiration');
  assert.deepEqual(insp.uses, { ability: 'cha', min: 1 });
  assert.equal(insp.recharge, 'long');
  assert.equal(insp.shortRestFromLevel, 5);
  assert.deepEqual(insp.die.byLevel, { 1: 'd6', 5: 'd8', 10: 'd10', 15: 'd12' });
  const subs = Object.keys(PROGRESSION_RULES_2024.bard.subclassPerLevel);
  for (const r of res) {
    assert.match(r.id, /^[a-z][A-Za-z0-9]*$/);
    assert.ok(r.name.pt && r.name.en, `${r.id}: nome`);
    assert.ok(['long', 'short'].includes(r.recharge), `${r.id}: recharge`);
    assert.ok(r.uses && Object.keys(r.uses).length === 1 || r.uses.ability, `${r.id}: uses`);
    for (const s of r.subclass || []) assert.ok(subs.includes(s), `${r.id}: subclasse ${s}`);
    if (r.rules) assert.ok(['2014', '2024'].includes(r.rules));
  }
  assert.equal(res.find(r => r.id === 'beguilingMagic').rules, '2024');
  assert.equal(res.find(r => r.id === 'enthrallingPerformance').rules, '2014');
  assert.ok(!ids.some(id => /slot/i.test(id)), 'sem espaços de magia');
});

test('bardo 2014: Segredos Mágicos 2 nos níveis 10, 14 e 18 (qualquer lista, até o maior círculo)', () => {
  const at = (level, classOptions = []) => bard({ rulesVersion: '2014', level, classOptions });
  assert.ok(!pools(computeProgression(at(9))).some(x => x.startsWith('magicalSecrets2014')));
  assert.ok(pools(computeProgression(at(10))).includes('magicalSecrets2014:2'));
  assert.ok(pools(computeProgression(at(18))).includes('magicalSecrets2014:6'));
  const def = CLASS_OPTIONS.bard.pools.magicalSecrets2014;
  assert.equal(def.kind, 'spell');
  assert.equal(def.filter.maxSlot, true);
  assert.ok(!def.filter.classes, 'qualquer lista');
  assert.ok(validateClassOptions(at(10), 'bard', { adds: [{ pool: 'magicalSecrets2014', id: 'fireball' }, { pool: 'magicalSecrets2014', id: 'counterspell' }] }).valid);
  // As escolhidas entram como magias automáticas e descontam das conhecidas (já estão na tabela).
  const known = computeProgression(at(10)).spellsKnown;
  const picked = computeProgression(at(10, [{ classId: 'bard', pool: 'magicalSecrets2014', id: 'fireball', level: 10 }]));
  assert.ok(picked.autoSpells.includes('fireball'));
  assert.equal(picked.spellsKnown, known - 1);
  // 2024 não tem o pool.
  assert.ok(!pools(computeProgression(bard({ level: 10 }))).some(x => x.startsWith('magicalSecrets2014')));
});

test('bardo 2014 do Saber: Segredos Mágicos Adicionais (2 no nível 6) limitados ao maior círculo', () => {
  const p = computeProgression(bard({ rulesVersion: '2014', level: 6, subclass: 'lore' }));
  assert.ok(pools(p).includes('additionalMagicalSecrets:2'));
  assert.equal(CLASS_OPTIONS.bard.pools.additionalMagicalSecrets.filter.maxSlot, true);
  assert.ok(!CLASS_OPTIONS.bard.pools.additionalMagicalSecrets.countsAsKnown, 'não contam nas conhecidas');
});
