import { test } from 'node:test';
import assert from 'node:assert/strict';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { tName } from '../data/i18n.js';
import { findFeat } from '../data/feats.js';
import { SUBRACES_2014, SUBRACE_EFFECTS_2014 } from '../data/subraces-2014.js';
import { applyAutosToCharacter } from '../src/progression/engine.js';
import { computeResources } from '../src/progression/resources.js';
import { speciesGrants, speciesChoiceIssues, speciesChoiceSpecs, speciesAsi, speciesSpellTable } from '../src/progression/species.js';
import { featPrereqIssues } from '../src/progression/feat-rules.js';

const char = (race, level = 1, speciesChoices = {}, extra = {}) => ({
  rulesVersion: '2014', race, className: 'fighter', level, abilities: { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 },
  raceBonus: Utils.applyRaceBonus({ rulesVersion: '2014' }, race), skillProfs: [], spells: [], feats: [], speciesChoices, ...extra,
});
const autoIds = (c) => (applyAutosToCharacter(c).spells || []).filter(s => s.auto).map(s => s.id).sort();
const race = (id) => SRD.RACES.find(r => r.id === id);
const speciesRes = (c) => computeResources(c).filter(r => r.classId === 'species');

const EXPECTED = [
  ...['baalzebul', 'dispater', 'fierna', 'glasya', 'levistus', 'mammon', 'mephistopheles', 'zariel', 'feral'].map(l => `tiefling-${l}`),
  'aasimar-protector', 'aasimar-scourge', 'aasimar-fallen',
  'shifter-beasthide', 'shifter-longtooth', 'shifter-swiftstride', 'shifter-wildhunt',
  'half-elf-mark-detection', 'human-mark-finding', 'half-orc-mark-finding', 'human-mark-handling', 'halfling-mark-healing',
  'halfling-mark-hospitality', 'human-mark-making', 'human-mark-passage', 'gnome-mark-scribing', 'human-mark-sentinel',
  'elf-mark-shadow', 'half-elf-mark-storm', 'dwarf-mark-warding',
  'halfling-ghostwise', 'halfling-lotusden', 'elf-pallid', 'dragonborn-draconblood', 'dragonborn-ravenite', 'half-elf-variant',
];

test('sub-raças de suplementos entram no catálogo 2014, com nome, fonte e traços bilíngues', () => {
  assert.equal(SUBRACES_2014.length, EXPECTED.length);
  for (const id of EXPECTED) {
    const r = race(id);
    assert.ok(r, `${id} em SRD.RACES`);
    assert.ok(r.source && SRD.SOURCES[r.source], `${id}: fonte conhecida`);
    assert.notEqual(tName('race', id, 'pt'), id, `${id}: nome PT`);
    assert.notEqual(tName('race', id, 'en'), id, `${id}: nome EN`);
    assert.ok(Array.isArray(r.languages) && r.languages.includes('Common'), `${id}: idiomas`);
    assert.ok(r.traits.length >= 2);
    for (const t of r.traits) assert.ok(t.name.pt && t.name.en && t.desc.pt && t.desc.en, `${id}/${t.name.en}: bilíngue`);
    assert.equal('base' in r, false, 'campo interno removido');
  }
  // Aparecem logo depois da raça-base.
  const ids = SRD.RACES.map(r => r.id);
  assert.equal(ids.indexOf('tiefling-zariel'), ids.indexOf('tiefling') + 8);
  assert.equal(ids.indexOf('aasimar-protector'), ids.indexOf('aasimar') + 1);
  // Também ficam disponíveis em fichas 2024, como raças antigas compatíveis.
  assert.ok(Utils.races({ rulesVersion: '2024' }).find(r => r.id === 'shifter-wildhunt')?.legacyCompatibility);
});

test('todas as magias das sub-raças existem no catálogo 2014', () => {
  const t = speciesSpellTable()['2014'];
  const ids = (row) => [...(row.cantrips || []), ...Object.values(row.spells || {}).flat(),
    ...Object.values(row.options || {}).flatMap(o => Object.values(o).flatMap(ids))];
  for (const id of Object.keys(SUBRACE_EFFECTS_2014)) {
    for (const s of ids(t[id] || {})) assert.ok(SRD.SPELLS.some(x => x.id === s), `${id}: ${s}`);
  }
});

test('tiefling de Zariel: CAR +2/FOR +1, fogo, Taumaturgia, Destruição Abrasadora no 3 e Bênção Flamejante no 5', () => {
  assert.deepEqual(race('tiefling-zariel').asi, { cha: 2, str: 1 });
  assert.deepEqual(autoIds(char('tiefling-zariel', 1)), ['thaumaturgy']);
  assert.deepEqual(autoIds(char('tiefling-zariel', 5)), ['brandingSmite', 'searingSmite', 'thaumaturgy']);
  const g = speciesGrants(char('tiefling-zariel', 1));
  assert.deepEqual(g.resist, ['fire']);
  assert.equal(g.spellAbility, 'cha');
  assert.equal(g.darkvision, 60);
  assert.deepEqual(autoIds(char('tiefling-mammon', 5)), ['arcaneLock', 'floatingDisk', 'mageHand']);
  assert.deepEqual(autoIds(char('tiefling-fierna', 3)), ['charmPerson', 'friends']);
});

test('tiefling base (PHB = Asmodeus) ganha Repreensão Infernal no 3', () => {
  assert.deepEqual(autoIds(char('tiefling', 3)), ['hellishRebuke', 'thaumaturgy']);
});

test('tiefling feral: DES +2/INT +1 e legado variante do SCAG', () => {
  assert.deepEqual(race('tiefling-feral').asi, { dex: 2, int: 1 });
  assert.equal(speciesChoiceIssues(char('tiefling-feral', 1)).length, 1);
  assert.deepEqual(autoIds(char('tiefling-feral', 5, { lineage: 'devilsTongue' })), ['charmPerson', 'enthrall', 'viciousMockery']);
  assert.deepEqual(autoIds(char('tiefling-feral', 5, { lineage: 'hellfire' })), ['burningHands', 'darkness', 'thaumaturgy']);
  const winged = char('tiefling-feral', 5, { lineage: 'winged' });
  assert.deepEqual(autoIds(winged), []);
  assert.deepEqual(speciesChoiceIssues(winged), []);
});

test('aasimar do VGM: +1 do subtipo, Luz, resistências e recursos (transformação no 3)', () => {
  assert.deepEqual(race('aasimar-scourge').asi, { cha: 2, con: 1 });
  assert.deepEqual(race('aasimar-fallen').asi, { cha: 2, str: 1 });
  assert.deepEqual(autoIds(char('aasimar-protector', 1)), ['light']);
  assert.deepEqual(speciesGrants(char('aasimar-fallen', 1)).resist.sort(), ['necrotic', 'radiant']);
  assert.deepEqual(speciesRes(char('aasimar-protector', 2)).map(r => r.id), ['healingHands']);
  assert.deepEqual(speciesRes(char('aasimar-protector', 3)).map(r => r.id), ['healingHands', 'celestialTransformation']);
});

test('shifters do ERLW: atributos, perícia do subtipo e Transmutação por descanso curto', () => {
  assert.deepEqual(race('shifter-wildhunt').asi, { wis: 2, dex: 1 });
  assert.ok(Utils.hasSkillProf(char('shifter-wildhunt'), 'survival'));
  assert.ok(Utils.hasSkillProf(char('shifter-beasthide'), 'athletics'));
  assert.ok(Utils.hasSkillProf(char('shifter-longtooth'), 'intimidation'));
  assert.ok(Utils.hasSkillProf(char('shifter-swiftstride'), 'acrobatics'));
  const r = computeResources(char('shifter-swiftstride', 1)).find(x => x.id === 'shifting');
  assert.equal(r.recharge, 'short');
  assert.equal(r.max, 1);
});

test('marcas de dragão: magias inatas por nível, atributo fixo e +1 livre quando a marca pede', () => {
  // Detecção (meio-elfo): SAB +2 e +1 em outro atributo, escolhido no passo de espécie.
  const det = char('half-elf-mark-detection', 3);
  assert.deepEqual(race('half-elf-mark-detection').asi, { wis: 2 });
  assert.deepEqual(speciesChoiceIssues(det).map(i => i.key), ['asi']);
  assert.ok(!speciesChoiceSpecs(det)[0].from.includes('wis'), 'o +1 não pode ir para Sabedoria');
  const det2 = { ...det, speciesChoices: { asi: { int: 1 } } };
  assert.deepEqual(speciesChoiceIssues(det2), []);
  assert.deepEqual(speciesAsi(det2), { int: 1 });
  assert.deepEqual(autoIds(det2), ['detectMagic', 'detectPoisonAndDisease', 'seeInvisibility']);
  assert.equal(speciesGrants(det2).spellAbility, 'int');
  // Sombra (elfo): Ilusão Menor, Invisibilidade no 3, Percepção do elfo.
  assert.deepEqual(autoIds(char('elf-mark-shadow', 2)), ['minorIllusion']);
  assert.deepEqual(autoIds(char('elf-mark-shadow', 3)), ['invisibility', 'minorIllusion']);
  assert.ok(Utils.hasSkillProf(char('elf-mark-shadow'), 'perception'));
  // Tempestade: resistência elétrica; Passagem: deslocamento 35; Proteção: anão sem Robustez da colina.
  assert.deepEqual(speciesGrants(char('half-elf-mark-storm')).resist, ['lightning']);
  assert.equal(Utils.speed(char('human-mark-passage')), 35);
  assert.equal(Utils.speed(char('dwarf-mark-warding')), 25);
  assert.deepEqual(speciesGrants(char('dwarf-mark-warding')).resist, ['poison']);
  // Descoberta: visão no escuro e Goblin; mesma marca para humano e meio-orc.
  assert.equal(speciesGrants(char('half-orc-mark-finding')).darkvision, 60);
  assert.deepEqual(race('human-mark-finding').languages, ['Common', 'Goblin']);
  assert.deepEqual(autoIds(char('half-orc-mark-finding', 3)), ['huntersMark', 'locateObject']);
  assert.equal(computeResources(char('human-mark-sentinel')).find(r => r.id === 'vigilantGuardian')?.max, 1);
});

test('SCAG/EGtW: halflings, elfo pálido e draconatos de Wildemount', () => {
  assert.deepEqual(race('halfling-ghostwise').asi, { dex: 2, wis: 1 });
  assert.equal(race('halfling-lotusden').size, 'Small');
  assert.deepEqual(autoIds(char('halfling-lotusden', 5)), ['druidcraft', 'entangle', 'spikeGrowth']);
  assert.deepEqual(autoIds(char('elf-pallid', 5)), ['invisibility', 'light', 'sleep']);
  assert.equal(speciesGrants(char('elf-pallid')).spellAbility, 'wis');
  // Draconatos: ancestral obrigatório, mas sem a resistência a dano.
  const dc = char('dragonborn-draconblood', 1, { ancestry: 'red' });
  assert.deepEqual(race('dragonborn-draconblood').asi, { int: 2, cha: 1 });
  assert.deepEqual(speciesChoiceIssues(dc), []);
  assert.deepEqual(speciesGrants(dc).resist, []);
  assert.equal(speciesGrants(dc).darkvision, 60);
  assert.deepEqual(speciesRes(char('dragonborn-ravenite')).map(r => r.id), ['breathWeapon', 'vengefulAssault']);
});

test('meio-elfo com descendência (SCAG): traço condicional, truque de mago (INT) ou Magia Drow (CAR)', () => {
  const he = (sc, lv = 1) => char('half-elf-variant', lv, sc);
  assert.deepEqual(speciesChoiceIssues(he({})).map(i => i.key), ['descent']);
  assert.deepEqual(speciesChoiceIssues(he({ descent: 'high' })).map(i => i.key), ['trait']);
  assert.deepEqual(speciesChoiceIssues(he({ descent: 'high', trait: 'cantrip' })).map(i => i.key), ['cantrip']);
  const hc = he({ descent: 'high', trait: 'cantrip', cantrip: 'fireBolt' });
  assert.deepEqual(speciesChoiceIssues(hc), []);
  assert.deepEqual(autoIds(hc), ['fireBolt']);
  assert.equal(speciesGrants(hc).spellAbility, 'int');
  // Elfo da floresta: Pés Velozes muda o deslocamento; o truque some fora do alto elfo.
  const wood = he({ descent: 'wood', trait: 'fleet' });
  assert.equal(Utils.speed(wood), 35);
  assert.equal(speciesChoiceSpecs(wood).some(c => c.key === 'cantrip'), false);
  assert.deepEqual(speciesChoiceIssues(he({ descent: 'wood', trait: 'cantrip' })).map(i => i.key), ['trait']);
  const drow = he({ descent: 'drow' }, 5);
  assert.deepEqual(speciesChoiceIssues(drow), []);
  assert.deepEqual(autoIds(drow), ['dancingLights', 'darkness', 'faerieFire']);
  assert.equal(speciesGrants(drow).spellAbility, 'cha');
});

test('talentos raciais reconhecem as sub-raças', () => {
  const check = (featId, raceId) => featPrereqIssues(char(raceId, 4), findFeat(featId), 4, { checkSpecies: true }).filter(i => i.key === 'species');
  assert.deepEqual(check('infernalConstitution', 'tiefling-zariel'), []);
  assert.deepEqual(check('dragonFear', 'dragonborn-ravenite'), []);
  assert.deepEqual(check('elvenAccuracy', 'elf-pallid'), []);
  assert.deepEqual(check('bountifulLuck', 'halfling-ghostwise'), []);
  assert.equal(check('infernalConstitution', 'aasimar-fallen').length, 1);
});
