import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES_2024, SPELLS_2024 } from '../data/rules2024.js';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { applyAutosToCharacter } from '../src/progression/engine.js';
import {
  speciesGrants, speciesChoiceIssues, speciesChoiceSpecs, withSpeciesFeat, speciesAsi, speciesSpellTable, SPECIES_TABLE,
} from '../src/progression/species.js';
import { featEntry } from '../src/progression/feat-rules.js';
import { findFeat } from '../data/feats.js';

const char = (race, level = 1, speciesChoices = {}, extra = {}) => ({
  rulesVersion: '2024', race, className: 'fighter', level, abilities: { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 },
  raceBonus: {}, skillProfs: [], spells: [], feats: [], speciesChoices, ...extra,
});
const autoIds = (c) => (applyAutosToCharacter(c).spells || []).filter(s => s.auto).map(s => s.id);

test('traços 2024 limpos, em PT e EN, sem mistura entre espécies', () => {
  const human = SPECIES_2024.find(s => s.id === 'human');
  const all = JSON.stringify(human.traits);
  assert.ok(!/Fiendish|Legacies|Abyssal|Infernal/i.test(all), 'Humano não traz texto do Tiferino');
  for (const s of SPECIES_2024) {
    assert.ok(s.traits.length >= 3, `${s.id} tem traços`);
    for (const t of s.traits) {
      assert.ok(t.name.pt && t.name.en && t.desc.pt && t.desc.en, `${s.id}: traço bilíngue`);
      assert.notEqual(t.desc.pt, t.desc.en, `${s.id}/${t.name.en}: PT de verdade`);
      assert.ok(!/\t|\s{2,}|Creature Type:|System Reference/.test(t.desc.pt + t.desc.en), `${s.id}/${t.name.en}: sem lixo do PDF`);
      assert.ok(!/(Traços atuais|texto SRD)/.test(t.name.pt), `${s.id}: trait revisado`);
    }
  }
  assert.ok(SPECIES_2024.some(s => s.id === 'aasimar'), 'Aasimar 2024 presente');
});

test('todas as magias das espécies existem no catálogo da versão', () => {
  const t = speciesSpellTable();
  const ids = (row) => [...(row.cantrips || []), ...Object.values(row.spells || {}).flat(), ...(row.cantrip?.default ? [row.cantrip.default] : []),
    ...Object.values(row.options || {}).flatMap(o => Object.values(o).flatMap(ids))];
  for (const row of Object.values(t['2024'])) for (const id of ids(row)) assert.ok(SPELLS_2024.some(s => s.id === id), `2024: ${id}`);
  for (const row of Object.values(t['2014'])) for (const id of ids(row)) assert.ok(SRD.SPELLS.some(s => s.id === id), `2014: ${id}`);
});

test('linhagem drow: truque no 1, Fogo das Fadas no 3, Escuridão no 5', () => {
  const sc = { lineage: 'drow', spellAbility: 'wis', skill: 'perception' };
  assert.deepEqual(autoIds(char('elf', 1, sc)), ['dancingLights']);
  assert.deepEqual(autoIds(char('elf', 2, sc)), ['dancingLights']);
  assert.deepEqual(autoIds(char('elf', 3, sc)), ['dancingLights', 'faerieFire']);
  assert.deepEqual(autoIds(char('elf', 5, sc)), ['dancingLights', 'faerieFire', 'darkness']);
  const g = speciesGrants(char('elf', 1, sc));
  assert.equal(g.darkvision, 120);
  assert.equal(g.spellAbility, 'wis');
  assert.ok(Utils.hasSkillProf(char('elf', 1, sc), 'perception'), 'Sentidos Aguçados vira proficiência');
});

test('trocar a linhagem troca as magias automáticas; escolhas do jogador ficam', () => {
  let c = applyAutosToCharacter(char('elf', 5, { lineage: 'drow', spellAbility: 'int', skill: 'insight' }, { spells: [{ id: 'fireBolt', prepared: true }] }));
  c = applyAutosToCharacter({ ...c, speciesChoices: { ...c.speciesChoices, lineage: 'wood' } });
  const ids = c.spells.map(s => s.id);
  assert.ok(ids.includes('fireBolt'));
  assert.ok(ids.includes('druidcraft') && ids.includes('passWithoutTrace'));
  assert.ok(!ids.includes('dancingLights') && !ids.includes('darkness'));
  assert.equal(Utils.speed(c), 35, 'Elfo da Floresta anda 35');
});

test('alto elfo: Prestidigitação por padrão, ou outro truque de Mago', () => {
  assert.ok(autoIds(char('elf', 1, { lineage: 'high' })).includes('prestidigitation'));
  const other = autoIds(char('elf', 1, { lineage: 'high', cantrip: 'fireBolt' }));
  assert.ok(other.includes('fireBolt') && !other.includes('prestidigitation'));
});

test('tiferino: Taumaturgia sempre, legado infernal com resistência e magias', () => {
  const sc = { lineage: 'infernal', spellAbility: 'cha', size: 'Small' };
  assert.deepEqual(autoIds(char('tiefling', 5, sc)).sort(), ['darkness', 'fireBolt', 'hellishRebuke', 'thaumaturgy']);
  const g = speciesGrants(char('tiefling', 1, sc));
  assert.deepEqual(g.resist, ['fire']);
  assert.equal(Utils.sizeOf(char('tiefling', 1, sc)), 'Small');
  assert.deepEqual(speciesChoiceIssues(char('tiefling', 1, sc)), []);
  assert.ok(speciesChoiceIssues(char('tiefling', 1, {})).length >= 3);
});

test('gnomo, draconato, golias e aasimar', () => {
  assert.deepEqual(autoIds(char('gnome', 1, { lineage: 'rock', spellAbility: 'int' })).sort(), ['mending', 'prestidigitation']);
  assert.ok(autoIds(char('gnome', 1, { lineage: 'forest', spellAbility: 'int' })).includes('speakWithAnimals'));
  assert.deepEqual(speciesGrants(char('dragonborn', 1, { ancestry: 'silver' })).resist, ['cold']);
  assert.deepEqual(speciesChoiceIssues(char('goliath', 1, { ancestry: 'storm' })), []);
  assert.equal(speciesChoiceIssues(char('goliath', 1, { ancestry: 'lava' })).length, 1);
  const a = char('aasimar', 1, { size: 'Medium' });
  assert.deepEqual(autoIds(a), ['light']);
  assert.deepEqual(speciesGrants(a).resist.sort(), ['necrotic', 'radiant']);
});

test('humano 2024: perícia (Habilidoso) e talento de Origem (Versátil) com origin species', () => {
  let c = char('human', 1, { size: 'Medium', skill: 'stealth' });
  assert.deepEqual(speciesChoiceIssues(c).map(i => i.key), ['feat']);
  assert.ok(speciesChoiceSpecs(c).find(x => x.key === 'feat').kind === 'origin');
  const skilled = featEntry({ type: 'feat', featId: 'skilled', feat: 'Skilled', picks: { skillOrTool: ['arcana', 'history', 'medicine'] } }, 1);
  c = { ...c, feats: withSpeciesFeat([{ name: 'Alert', id: 'alert', level: 1, origin: 'background' }], skilled) };
  assert.deepEqual(speciesChoiceIssues(c), []);
  const e = c.feats.find(f => f.origin === 'species');
  assert.equal(e.id, 'skilled');
  assert.equal(c.feats.filter(f => f.origin === 'background').length, 1, 'talento do antecedente preservado');
  for (const s of ['stealth', 'arcana', 'history', 'medicine']) assert.ok(Utils.hasSkillProf(c, s), s);
  // Sub-escolhas incompletas continuam pendentes.
  const half = { ...c, feats: withSpeciesFeat(c.feats, featEntry({ type: 'feat', featId: 'skilled', feat: 'Skilled', picks: { skillOrTool: ['arcana'] } }, 1)) };
  assert.deepEqual(speciesChoiceIssues(half).map(i => i.key), ['feat']);
  // Iniciado em Magia pela espécie: truques entram como autos.
  const mi = { ...c, feats: withSpeciesFeat(c.feats, featEntry({ type: 'feat', featId: 'magicInitiate', feat: 'Magic Initiate', picks: { spellList: 'wizard', spellAbility: 'int', cantrip: ['light', 'mageHand'], spell: ['shield'] } }, 1)) };
  assert.ok(autoIds(mi).includes('mageHand'));
});

test('humano variante 2014: +1 em dois atributos, perícia e talento qualquer', () => {
  const base = { rulesVersion: '2014', race: 'human-variant', className: 'fighter', level: 1, abilities: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 }, raceBonus: {}, feats: [] };
  const feat = findFeat('alert2014') || findFeat('sentinel2014') || null;
  assert.ok(feat && feat.rules === '2014');
  const c = { ...base, speciesChoices: { asi: { str: 1, con: 1 }, skill: 'athletics' }, feats: withSpeciesFeat([], featEntry({ type: 'feat', featId: feat.id, feat: feat.name.en }, 1)) };
  assert.deepEqual(speciesChoiceIssues(c), []);
  assert.deepEqual(speciesAsi(c), { str: 1, con: 1 });
  assert.equal(speciesChoiceSpecs(c).find(x => x.key === 'feat').kind, 'asi');
  assert.ok(Utils.hasSkillProf(c, 'athletics'));
  assert.deepEqual(speciesChoiceIssues({ ...c, speciesChoices: { ...c.speciesChoices, asi: { str: 2 } } }).map(i => i.key), ['asi']);
});

test('linhagem personalizada 2014: +2, talento, visão no escuro ou perícia', () => {
  const base = { rulesVersion: '2014', race: 'custom-lineage', level: 1, feats: withSpeciesFeat([], { name: 'Tough', id: 'tough2014' }) };
  const dv = { ...base, speciesChoices: { size: 'Small', asi: { wis: 2 }, bonus: 'darkvision' } };
  assert.deepEqual(speciesChoiceIssues(dv), []);
  assert.equal(speciesGrants(dv).darkvision, 60);
  const sk = { ...base, speciesChoices: { size: 'Medium', asi: { wis: 2 }, bonus: 'skill' } };
  assert.deepEqual(speciesChoiceIssues(sk).map(i => i.key), ['skill']);
  assert.deepEqual(speciesChoiceIssues({ ...sk, speciesChoices: { ...sk.speciesChoices, skill: 'insight' } }), []);
});

test('raças 2014 com magias fixas e meio-elfo com duas perícias', () => {
  const drow = { rulesVersion: '2014', race: 'drow', className: 'rogue', level: 3, spells: [] };
  assert.deepEqual(autoIds(drow).sort(), ['dancingLights', 'faerieFire']);
  const he = { rulesVersion: '2014', race: 'half-elf', level: 1, speciesChoices: { skill: ['stealth', 'insight'] } };
  assert.deepEqual(speciesChoiceIssues(he), []);
  assert.ok(Utils.hasSkillProf(he, 'stealth') && Utils.hasSkillProf(he, 'insight'));
  // Espécie sem escolhas: nada pendente.
  assert.deepEqual(speciesChoiceIssues({ rulesVersion: '2024', race: 'halfling' }), []);
  assert.ok(Object.keys(SPECIES_TABLE['2024']).length === 10);
});
