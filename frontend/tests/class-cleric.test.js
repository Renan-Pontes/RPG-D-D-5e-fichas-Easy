import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';
import cleric from '../data/class-options/cleric.js';

const make = (level, extra = {}) => ({
  rulesVersion: '2024', className: 'cleric', subclass: '', level, race: 'human', background: 'acolyte',
  maxHp: 20, currentHp: 20, classOptions: [], ...extra,
});
const pendingPools = (prog) => prog.pendingChoices.filter(p => p.type === 'classOption').map(p => `${p.pool}:${p.missing}`);

const DOMAINS = ['life', 'light', 'trickery', 'war', 'knowledge', 'nature', 'tempest', 'death', 'arcana', 'forge', 'grave', 'order', 'peace', 'twilight'];

test('clérigo 2024: Ordem Divina no 1 e Golpes Abençoados no 7', () => {
  assert.deepEqual(pendingPools(computeProgression(make(1))), ['divineOrder:1']);
  const c7 = make(7, { subclass: 'life', classOptions: [{ classId: 'cleric', pool: 'divineOrder', id: 'protector', level: 1 }] });
  assert.deepEqual(pendingPools(computeProgression(c7)), ['blessedStrikes:1']);
});

test('clérigo 2024: Taumaturgo abre vaga de truque de clérigo', () => {
  const c = make(1, { classOptions: [{ classId: 'cleric', pool: 'divineOrder', id: 'thaumaturge', level: 1 }] });
  assert.deepEqual(pendingPools(computeProgression(c)), ['thaumaturgeCantrip:1']);
  assert.equal(validateClassOptions(c, 'cleric', { adds: [{ pool: 'thaumaturgeCantrip', id: 'guidance' }] }).valid, true);
  assert.equal(validateClassOptions(c, 'cleric', { adds: [{ pool: 'thaumaturgeCantrip', id: 'guidance' }, { pool: 'thaumaturgeCantrip', id: 'light' }] }).valid, false);
  const done = { ...c, classOptions: [...c.classOptions, { classId: 'cleric', pool: 'thaumaturgeCantrip', id: 'guidance', level: 1 }] };
  const prog = computeProgression(done);
  assert.ok(prog.autoCantrips.includes('guidance'));
  assert.deepEqual(pendingPools(prog), []);
});

test('clérigo 2024: não pode escolher as duas ordens', () => {
  const r = validateClassOptions(make(1), 'cleric', { adds: [{ pool: 'divineOrder', id: 'protector' }, { pool: 'divineOrder', id: 'thaumaturge' }] });
  assert.equal(r.valid, false);
});

test('clérigo 2024: traços revisados substituem o texto do PDF', () => {
  const lv = PROGRESSION_RULES_2024.cleric.perLevel;
  for (const [n, list] of Object.entries(cleric.features)) {
    assert.deepEqual(lv[n].features.map(f => f.id), list.map(f => f.id), `nível ${n}`);
  }
  assert.ok(!lv[5].features.some(f => /Blessed Strikes/.test(f.descEn)) || lv[5].features.length === 1);
  assert.ok(lv[1].features.every(f => f.name && f.nameEn && !/- /.test(f.descEn)));
  // Contadores intactos.
  assert.equal(lv[1].cantripsKnown, 3);
  assert.ok(lv[3].subclassChoice);
});

test('clérigo 2024: todos os domínios têm traços em 3, 6 e 17 e magias em 3/5/7/9, sem traço no 8', () => {
  const subs = PROGRESSION_RULES_2024.cleric.subclassPerLevel;
  for (const id of DOMAINS) {
    const s = subs[id];
    assert.ok(s, id);
    assert.ok(!s.legacyCompatibility, `${id}: não deve usar a conversão 2014`);
    for (const lv of [3, 6, 17]) assert.ok(s[lv]?.features?.length, `${id}: traço no ${lv}`);
    assert.equal(s[3].autoSpells.length, 4, `${id}: 4 magias no 3`);
    for (const lv of [5, 7, 9]) assert.equal(s[lv]?.autoSpells?.length, 2, `${id}: 2 magias no ${lv}`);
    assert.ok(!s[8], `${id}: sem traço no 8`);
    assert.ok(!Object.keys(s).some(k => /^\d+$/.test(k) && +k < 3), `${id}: nada antes do 3`);
  }
});

test('clérigo 2024: Vida acumula magias e traços até o 17', () => {
  const prog = computeProgression(make(17, { subclass: 'life' }));
  for (const s of ['aid', 'bless', 'cureWounds', 'lesserRestoration', 'massHealingWord', 'revivify', 'auraOfLife', 'deathWard', 'greaterRestoration', 'massCureWounds']) {
    assert.ok(prog.autoSpells.includes(s), s);
  }
  const ids = prog.features.map(f => f.id);
  for (const f of ['discipleOfLife', 'preserveLife', 'blessedHealer', 'supremeHealing']) assert.ok(ids.includes(f), f);
});

test('clérigo 2024: escolhas de domínio', () => {
  const pick = (pool, id) => ({ classId: 'cleric', pool, id, level: 1 });
  const base = [pick('divineOrder', 'protector')];
  const pend = (lv, subclass, extra = {}) => pendingPools(computeProgression(make(lv, { subclass, classOptions: base, ...extra }))).sort();
  assert.deepEqual(pend(3, 'knowledge'), ['knowledgeLanguage:2', 'knowledgeSkill:2']);
  assert.deepEqual(pend(3, 'nature'), ['natureCantrip:1', 'natureSkill:1']);
  assert.deepEqual(pend(3, 'death'), ['reaperCantrip:1']);
  assert.deepEqual(pend(3, 'order'), ['orderSkill:1']);
  assert.deepEqual(pend(3, 'peace'), ['peaceSkill:1']);
  assert.deepEqual(pend(3, 'grave'), []);
  assert.deepEqual(pend(3, 'life'), []);
  assert.deepEqual(pend(3, 'war'), []);
  assert.ok(computeProgression(make(3, { subclass: 'grave', classOptions: base })).autoCantrips.includes('spareTheDying'));

  const k = make(3, { subclass: 'knowledge', classOptions: base });
  assert.equal(validateClassOptions(k, 'cleric', { adds: [{ pool: 'knowledgeSkill', id: 'arcana' }, { pool: 'knowledgeSkill', id: 'history' }] }).valid, true);
  assert.equal(validateClassOptions(k, 'cleric', { adds: [{ pool: 'knowledgeSkill', id: 'stealth' }] }).valid, false);
  const o = make(3, { subclass: 'order', classOptions: base });
  assert.equal(validateClassOptions(o, 'cleric', { adds: [{ pool: 'orderSkill', id: 'persuasion' }] }).valid, true);
  assert.equal(validateClassOptions(o, 'cleric', { adds: [{ pool: 'orderSkill', id: 'insight' }] }).valid, false);

  const arc = make(17, { subclass: 'arcana', classOptions: [...base, pick('blessedStrikes', 'potentSpellcasting')] });
  assert.deepEqual(pendingPools(computeProgression(arc)).sort(),
    ['arcanaCantrip:2', 'arcaneMastery6:1', 'arcaneMastery7:1', 'arcaneMastery8:1', 'arcaneMastery9:1'].sort());
});

test('clérigo 2024: proficiências fixas do domínio e do Protetor entram em grants, sem escolha', () => {
  const g = (subclass, classOptions = []) => computeProgression(make(3, { subclass, classOptions })).grants;
  assert.deepEqual(g('tempest'), { weapons: ['martial'], armor: ['heavy'] });
  assert.deepEqual(g('forge'), { armor: ['heavy'], tools: ['smithsTools'] });
  assert.deepEqual(g('arcana').skills, ['arcana']);
  assert.deepEqual(g('death'), { weapons: ['martial'] });
  assert.deepEqual(g('life'), {});   // Vida 2024 não dá armadura pesada
  assert.deepEqual(g('war'), {});    // Guerra 2024 idem
  const p = g('light', [{ classId: 'cleric', pool: 'divineOrder', id: 'protector', level: 1 }]);
  assert.deepEqual(p, { weapons: ['martial'], armor: ['heavy'] });
  // O pool legado não vale em 2024.
  assert.equal(validateClassOptions(make(3, { subclass: 'life' }), 'cleric', { adds: [{ pool: 'legacyDomainProficiencies', id: 'lifeProficiency' }] }).valid, false);
});

test('clérigo 2014: proficiências do domínio via pool legado, só a opção do próprio domínio', () => {
  const legacy = (subclass) => make(1, { rulesVersion: '2014', subclass });
  assert.equal(validateClassOptions(legacy('life'), 'cleric', { adds: [{ pool: 'legacyDomainProficiencies', id: 'lifeProficiency' }] }).valid, true);
  assert.equal(validateClassOptions(legacy('tempest'), 'cleric', { adds: [{ pool: 'legacyDomainProficiencies', id: 'forgeProficiencies' }] }).valid, false);
  const c = { ...legacy('tempest'), classOptions: [{ classId: 'cleric', pool: 'legacyDomainProficiencies', id: 'tempestProficiencies', level: 1 }] };
  assert.deepEqual(computeProgression(c).grants, { weapons: ['martial'], armor: ['heavy'] });
});

test('clérigo 2014: escolhas de domínio no nível 1, sem Ordem Divina', () => {
  const pend = (subclass) => pendingPools(computeProgression(make(1, { rulesVersion: '2014', subclass }))).sort();
  assert.deepEqual(pend('knowledge'), ['knowledgeLanguage:2', 'knowledgeSkill:2']);
  assert.deepEqual(pend('nature'), ['legacyDomainProficiencies:1', 'natureCantrip:1', 'natureSkill:1']);
  assert.deepEqual(pend('light'), []);
  assert.deepEqual(pend('war'), ['legacyDomainProficiencies:1']);
});

test('clérigo: recursos com usos (formato)', () => {
  const ids = new Set();
  const subs = Object.keys(cleric.subclasses);
  for (const r of cleric.resources) {
    assert.match(r.id, /^[a-z][A-Za-z0-9]*$/, r.id);
    assert.ok(!ids.has(r.id), `${r.id} repetido`);
    ids.add(r.id);
    assert.ok(r.name.pt && r.name.en, r.id);
    assert.ok(['long', 'short'].includes(r.recharge), r.id);
    assert.ok(!r.rules || ['2014', '2024'].includes(r.rules), r.id);
    for (const s of r.subclass || []) assert.ok(subs.includes(s), `${r.id}: ${s}`);
    const u = r.uses;
    assert.ok(u.byLevel || u.fixed || u.ability || u.profBonus || u.perClassLevel || u.classLevel, `${r.id}: uses`);
  }
  const cd = cleric.resources.find(r => r.id === 'channelDivinity');
  assert.deepEqual(cd.uses.byLevel, { 2: 2, 6: 3, 18: 4 });
  assert.equal(cd.shortRestRegain, 1);
  assert.deepEqual(cleric.resources.find(r => r.id === 'channelDivinity2014').uses.byLevel, { 2: 1, 6: 2, 18: 3 });
  // Traços de domínio de 2014: nível 3 em 2024, nível 1 em 2014.
  assert.equal(cleric.resources.find(r => r.id === 'wrathOfTheStorm').minLevel, 3);
  assert.equal(cleric.resources.find(r => r.id === 'wrathOfTheStorm2014').minLevel, 1);
});
