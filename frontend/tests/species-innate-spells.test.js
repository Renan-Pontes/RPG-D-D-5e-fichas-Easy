/* Auditoria: toda espécie/raça/sub-raça (2014 e 2024, inclusive de outros livros)
 * cujo traço fala de magia ou truque inato concede de fato essas magias
 * (speciesGrants → aba Magias, seção "Magias de talento e espécie"). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import SRD from '../data/srd.js';
import { SPECIES_2024, SPELLS_2024 } from '../data/rules2024.js';
import Utils from '../utils.js';
import { applyAutosToCharacter } from '../src/progression/engine.js';
import { EXTRA_RACES } from '../data/expanded-catalog.js';
import { speciesGrants, speciesChoiceSpecs, speciesChoiceIssues, SPECIES_TABLE } from '../src/progression/species.js';
import { grantedSpells } from '../src/creator/spell-helpers.js';

// Traço que cita magia/truque/conjuração (pt ou en).
const SPELL_TEXT = /\btruques?\b|\bcantrips?\b|conjur|\bcast\b|\bmagias?\b|\bspells?\b|\bmagic\b|1×\/dia|1\/day/i;

// Citam magia sem conceder magia inata (justificadas):
const NO_INNATE = {
  'elf-wood': 'Ancestral Feérico: só imunidade a sono mágico.',
  'gnome-rock': 'Astúcia Gnômica: só vantagem contra magia (Funileiro não é magia).',
  satyr: 'Resistência Mágica: só vantagem contra magias.',
  // Linhagem/descendência que só às vezes dá magia: a opção com magia é testada abaixo.
};
// Estas dão magia só por uma escolha (testada com a escolha feita).
const BY_CHOICE = new Set(['elf', 'gnome', 'tiefling', 'elf-high', 'half-elf-variant', 'tiefling-feral', 'kobold', 'astral-elf']);

const citesSpells = (r) => (r.traits || []).some(t => SPELL_TEXT.test(`${t.name?.pt} ${t.name?.en} ${t.desc?.pt} ${t.desc?.en}`));

/** Faz as escolhas da espécie preferindo as que dão magia (linhagem, legado, truque…). */
function withSpellChoices(char) {
  let c = { ...char, speciesChoices: {} };
  for (let i = 0; i < 6; i++) {
    const sc = { ...c.speciesChoices };
    for (const spec of speciesChoiceSpecs(c)) {
      if (sc[spec.key] != null) continue;
      if (spec.options) {
        const spelled = spec.options.find(o => o.cantrips?.length || Object.keys(o.spells || {}).length || o.fixedSpellAbility)
          || spec.options.find(o => o.id === 'sorcery' || o.id === 'cantrip') || spec.options[0];
        sc[spec.key] = spelled.id;
      } else if (spec.key === 'cantrip') {
        sc.cantrip = spec.default || Utils.spellCatalog(c).find(s => s.level === 0 && s.classes.includes(spec.list))?.id;
      } else if (spec.key === 'spellAbility') sc.spellAbility = 'wis';
      else if (spec.key === 'skill') {
        const pool = spec.from || ['perception', 'insight', 'stealth'];
        sc.skill = (spec.count || 1) > 1 ? pool.slice(0, spec.count) : pool[0];
      }
    }
    c = { ...c, speciesChoices: sc };
  }
  return c;
}

const sheets = () => [
  ...SRD.RACES.map(r => ({ rv: '2014', r })),
  ...SPECIES_2024.map(r => ({ rv: '2024', r })),
  // Raças 2014 também valem em fichas 2024 (compatibilidade): mesmo resultado, ids 2024.
  ...Utils.races({ rulesVersion: '2024' }).filter(r => r.legacyCompatibility).map(r => ({ rv: '2024', r })),
];
const grantsAt = (rv, race, level = 20, extra = {}) => {
  const c = withSpellChoices({ rulesVersion: rv, race, level, className: 'fighter', abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, spells: [], feats: [], ...extra });
  return { c, g: speciesGrants(c) };
};

test('toda espécie cujo traço cita magia/truque inato concede pelo menos uma magia ou truque', () => {
  const missing = [];
  for (const { rv, r } of sheets()) {
    if (!citesSpells(r) || NO_INNATE[r.id]) continue;
    const { g } = grantsAt(rv, r.id);
    if (!g.cantrips.length && !g.spells.length) missing.push(`${rv}:${r.id}`);
  }
  assert.deepEqual(missing, []);
  // As exceções continuam válidas: citam magia, mas não concedem nenhuma.
  for (const id of Object.keys(NO_INNATE)) {
    const r = SRD.RACES.find(x => x.id === id);
    assert.ok(r && citesSpells(r), `${id}: exceção ainda cita magia`);
    const { g } = grantsAt('2014', id);
    assert.equal(g.cantrips.length + g.spells.length, 0, `${id}: exceção sem magia`);
  }
});

test('espécies com magia por escolha só concedem com a escolha feita', () => {
  for (const id of BY_CHOICE) {
    const rv = SPECIES_TABLE['2024'][id] ? '2024' : '2014';
    const c0 = { rulesVersion: rv, race: id, level: 20, speciesChoices: {} };
    assert.ok(speciesChoiceIssues(c0).length > 0, `${id}: escolha pendente`);
    const { c, g } = grantsAt(rv, id);
    assert.ok(g.cantrips.length + g.spells.length > 0, `${id}: magia com a escolha`);
    assert.deepEqual(speciesChoiceIssues(c), [], `${id}: escolhas completas`);
  }
});

test('toda magia concedida por espécie existe no catálogo da ficha (2014 e 2024)', () => {
  for (const { rv, r } of sheets()) {
    const { c, g } = grantsAt(rv, r.id);
    const catalog = Utils.spellCatalog(c);
    for (const id of [...g.cantrips, ...g.spells]) assert.ok(catalog.some(s => s.id === id), `${rv}:${r.id}: ${id}`);
  }
});

test('Firbolg 2014 nível 1: Detectar Magia e Disfarçar-se (SAB), 1× por descanso curto', () => {
  const firbolg = { rulesVersion: '2014', race: 'firbolg', className: 'fighter', level: 1, abilities: { str: 14, dex: 10, con: 12, int: 10, wis: 15, cha: 8 }, spells: [], feats: [] };
  const g = speciesGrants(firbolg);
  assert.deepEqual(g.spells.sort(), ['detectMagic', 'disguiseSelf']);
  assert.equal(g.spellAbility, 'wis');
  assert.deepEqual(g.spellUses, { detectMagic: 'short', disguiseSelf: 'short' });
  assert.deepEqual(speciesChoiceIssues(firbolg), []);
  const saved = applyAutosToCharacter(firbolg).spells.filter(s => s.species).map(s => s.id).sort();
  assert.deepEqual(saved, ['detectMagic', 'disguiseSelf']);
  const from = grantedSpells(firbolg).filter(x => x.source === 'species');
  assert.ok(from.every(x => x.ability === 'wis' && x.from.pt === 'Firbolg'));
});

test('raças de 2014 com magia por nível, atributo fixo ou à escolha', () => {
  const ids = (rv, race, level, sc = {}) => { const g = speciesGrants({ rulesVersion: rv, race, level, speciesChoices: sc }); return [...g.cantrips, ...g.spells].sort(); };
  assert.deepEqual(ids('2014', 'genasi-fire', 1), ['produceFlame']);
  assert.deepEqual(ids('2014', 'genasi-fire', 3), ['burningHands', 'produceFlame']);
  assert.equal(speciesGrants({ rulesVersion: '2014', race: 'genasi-air', level: 1 }).spellAbility, 'con');
  // Genasi do EEPC (o registro de srd.js): Ar e Terra só têm a magia, desde o nível 1.
  assert.deepEqual(ids('2014', 'genasi-air', 1), ['levitate']);
  assert.deepEqual(ids('2014', 'genasi-air', 20), ['levitate']);
  assert.deepEqual(ids('2014', 'genasi-earth', 1), ['passWithoutTrace']);
  assert.deepEqual(ids('2014', 'genasi-earth', 20), ['passWithoutTrace']);
  assert.equal(speciesGrants({ rulesVersion: '2014', race: 'genasi-earth', level: 1 }).spellAbility, 'con');
  assert.deepEqual(ids('2024', 'genasi-air', 1), ['levitate']);
  // Marca de Cura (ERLW, Toque Curativo): Curar Ferimentos; no 3, Restauração Menor (SAB).
  assert.deepEqual(ids('2014', 'halfling-mark-healing', 1), ['cureWounds']);
  assert.deepEqual(ids('2014', 'halfling-mark-healing', 3), ['cureWounds', 'lesserRestoration']);
  assert.equal(speciesGrants({ rulesVersion: '2014', race: 'halfling-mark-healing', level: 3 }).spellAbility, 'wis');
  assert.deepEqual(ids('2014', 'triton', 5), ['fogCloud', 'gustOfWind', 'wallOfWater']);
  assert.deepEqual(ids('2014', 'fairy', 5, { spellAbility: 'cha' }), ['druidcraft', 'enlargeReduce', 'faerieFire']);
  assert.equal(speciesGrants({ rulesVersion: '2014', race: 'fairy', level: 1, speciesChoices: { spellAbility: 'int' } }).spellAbility, 'int');
  const yt = speciesGrants({ rulesVersion: '2014', race: 'yuan-ti', level: 3 });
  assert.deepEqual([...yt.cantrips, ...yt.spells].sort(), ['animalFriendship', 'poisonSpray', 'suggestion']);
  assert.equal(yt.spellUses.animalFriendship, 'atWill');
  // MPMM/VRGR: atributo à escolha (pendente até escolher).
  assert.deepEqual(speciesChoiceIssues({ rulesVersion: '2014', race: 'githyanki', level: 1 }).map(i => i.key), ['spellAbility']);
  assert.deepEqual(ids('2014', 'githyanki', 5, { spellAbility: 'int' }), ['jump', 'mageHand', 'mistyStep']);
  assert.deepEqual(ids('2014', 'hexblood', 1, { spellAbility: 'cha' }), ['disguiseSelf', 'hex']);
  assert.deepEqual(ids('2014', 'duergar', 2), []);
  assert.deepEqual(ids('2014', 'duergar', 5), ['enlargeReduce', 'invisibility']);
  assert.deepEqual(ids('2014', 'astral-elf', 1, { astralFire: 'sacredFlame', spellAbility: 'wis' }), ['sacredFlame']);
});

test('kobold: Feitiçaria Dracônica dá um truque de Feiticeiro; Manhoso dá perícia', () => {
  const k = (sc) => ({ rulesVersion: '2014', race: 'kobold', level: 1, speciesChoices: sc });
  assert.deepEqual(speciesChoiceIssues(k({})).map(i => i.key), ['legacy']);
  assert.deepEqual(speciesChoiceIssues(k({ legacy: 'sorcery' })).map(i => i.key).sort(), ['cantrip', 'spellAbility']);
  const sorcery = k({ legacy: 'sorcery', cantrip: 'fireBolt', spellAbility: 'cha' });
  assert.deepEqual(speciesChoiceIssues(sorcery), []);
  assert.deepEqual(speciesGrants(sorcery).cantrips, ['fireBolt']);
  assert.equal(speciesGrants(sorcery).spellAbility, 'cha');
  const crafty = k({ legacy: 'craftiness', skill: 'arcana' });
  assert.deepEqual(speciesChoiceIssues(crafty), []);
  assert.deepEqual(speciesGrants(crafty).cantrips, []);
  assert.ok(Utils.hasSkillProf(crafty, 'arcana'));
  assert.deepEqual(speciesChoiceIssues(k({ legacy: 'craftiness', skill: 'stealth' })).map(i => i.key), ['skill']);
});

test('genasi da água em ficha 2024 usa o id 2024 de Criar ou Destruir Água', () => {
  const g14 = speciesGrants({ rulesVersion: '2014', race: 'genasi-water', level: 3 });
  assert.ok(g14.spells.includes('createDestroyWater'));
  const g24 = speciesGrants({ rulesVersion: '2024', race: 'genasi-water', level: 3 });
  assert.ok(g24.spells.includes('createOrDestroyWater') && !g24.spells.includes('createDestroyWater'));
  assert.ok(SPELLS_2024.some(s => s.id === 'createOrDestroyWater'));
  assert.ok(SRD.SPELLS.some(s => s.id === 'createDestroyWater'));
});

test('usos fora do padrão: Gnomo da Floresta 2024 usa o bônus de proficiência', () => {
  const g = speciesGrants({ rulesVersion: '2024', race: 'gnome', level: 1, speciesChoices: { lineage: 'forest', spellAbility: 'int' } });
  assert.deepEqual(g.spellUses, { speakWithAnimals: 'profBonus' });
  // Drow e tiferino seguem o padrão (1× por descanso longo): sem marca.
  assert.deepEqual(speciesGrants({ rulesVersion: '2014', race: 'drow', level: 5 }).spellUses, {});
});

test('textos dos traços batem com o livro do registro (Genasi do EEPC, Marca de Cura, Duergar do MPMM)', () => {
  const trait = (list, id, en) => list.find(r => r.id === id).traits.find(t => t.name.en === en).desc;
  const air = trait(SRD.RACES, 'genasi-air', 'Mingle with the Wind');
  assert.match(air.pt, /Levitar/); assert.match(air.en, /Levitate/);
  assert.doesNotMatch(`${air.pt} ${air.en}`, /Toque Chocante|Shocking Grasp|Queda de Pena|Feather Fall/);
  const earth = trait(SRD.RACES, 'genasi-earth', 'Merge with Stone');
  assert.match(earth.pt, /Passar sem Rastros/); assert.match(earth.en, /Pass without Trace/);
  assert.doesNotMatch(`${earth.pt} ${earth.en}`, /Proteção de Lâmina|Blade Ward/);
  const healing = trait(SRD.RACES, 'halfling-mark-healing', 'Healing Touch');
  assert.match(healing.pt, /Restauração Menor/); assert.match(healing.en, /Lesser Restoration/);
  // MPMM: Aumentar/Reduzir em você, sem limitar a Aumentar (isso era do MToF).
  const duergar = trait(EXTRA_RACES, 'duergar', 'Duergar Magic');
  assert.doesNotMatch(`${duergar.pt} ${duergar.en}`, /só Aumentar|Enlarge only/);
  assert.match(duergar.pt, /Aumentar\/Reduzir em você/); assert.match(duergar.en, /Enlarge\/Reduce on yourself/);
});
