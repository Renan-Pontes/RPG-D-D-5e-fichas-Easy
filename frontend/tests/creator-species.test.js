import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import {
  CORE_SPECIES_2024, CORE_GROUPS_2014, HIDDEN_2024, coreIds, moreSpecies, findSpecies, darkvisionOf, speedOf, formatFeet,
  sizeLabel, splitTraits, raceBonusText, speciesLanguagesText, selectSpecies, speciesIssues, hasSpeciesChoices,
  speciesChoicesIssues, repeatedSpeciesSkills, repeatedSpeciesFeat, languagesApply, languagesIssues, chosenLanguages,
  fixedLanguageReasons, languageSlotReasons, recommendedSpellAbility,
  recommendedSpeciesFeat, repeatedSpeciesFeatSkills, syncSpeciesTools, missingSpeciesToolsPatch, speciesToolIds,
} from '../src/creator/species-helpers.js';
import { speciesGrants, speciesChoiceSpecs } from '../src/progression/species.js';
import { languageSuggestions } from '../components/language-hints.js';
import SRD from '../data/srd.js';
import { SPECIES_2024_REVISED } from '../data/species-2024.js';

const c24 = (extra = {}) => ({ rulesVersion: '2024', className: 'fighter', background: 'soldier', level: 1, feats: [], skillProfs: [], ...extra });
const c14 = (extra = {}) => ({ rulesVersion: '2014', className: 'fighter', background: 'soldier', level: 1, feats: [], skillProfs: [], ...extra });

// ---------- Lista ----------

test('2024: lista curta = 9 do SRD 5.2.1 + Aasimar, todas existem', () => {
  assert.equal(CORE_SPECIES_2024.length, 10);
  for (const id of CORE_SPECIES_2024) assert.ok(findSpecies(c24(), id), id);
  assert.deepEqual(coreIds(c24()), CORE_SPECIES_2024);
});

test('2014: grupos com sub-raças existentes; nenhuma repetida', () => {
  const ids = CORE_GROUPS_2014.flatMap(g => g.members);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(findSpecies(c14(), id), id);
  assert.deepEqual(CORE_GROUPS_2014.find(g => g.id === 'elf').members, ['elf-high', 'elf-wood', 'drow']);
});

test('"Mais espécies" exclui a lista curta, esconde legados sem sentido em 2024 e filtra pela busca', () => {
  const more24 = moreSpecies(c24()).map(r => r.id);
  for (const id of [...CORE_SPECIES_2024, ...HIDDEN_2024]) assert.ok(!more24.includes(id), id);
  assert.ok(more24.includes('dwarf-hill'));
  const more14 = moreSpecies(c14()).map(r => r.id);
  assert.ok(more14.includes('human-variant'));
  assert.ok(!more14.includes('dwarf-hill'));
  const elves = moreSpecies(c14(), 'elfo').map(r => r.id);
  assert.ok(elves.length > 0 && elves.every(id => /elf/.test(id)));
  assert.ok(moreSpecies(c24(), 'PALIDO').some(r => r.id === 'elf-pallid')); // sem acento e maiúsculas
});

// ---------- Cartão ----------

test('deslocamento em metros e pés', () => {
  assert.equal(formatFeet(30, 'pt'), '9 m (30 pés)');
  assert.equal(formatFeet(25, 'pt'), '7,5 m (25 pés)');
  assert.equal(formatFeet(35, 'en'), '35 ft (10.5 m)');
  assert.equal(speedOf(c24(), 'goliath'), 35);
  assert.equal(speedOf(c14(), 'elf-wood'), 35);
  assert.equal(speedOf(c14(), 'dwarf-hill'), 25);
});

test('visão no escuro nas duas regras', () => {
  assert.equal(darkvisionOf(c24(), 'dwarf'), 120);
  assert.equal(darkvisionOf(c24(), 'orc'), 120);
  assert.equal(darkvisionOf(c24(), 'elf'), 60);
  assert.equal(darkvisionOf(c24(), 'human'), 0);
  assert.equal(darkvisionOf(c14(), 'drow'), 120);
  assert.equal(darkvisionOf(c14(), 'half-orc'), 60);
  assert.equal(darkvisionOf(c14(), 'halfling-light'), 0);
});

test('tamanho traduzido e "você escolhe" quando a espécie deixa escolher', () => {
  assert.equal(sizeLabel(c24(), 'gnome', 'pt'), 'Pequeno');
  assert.equal(sizeLabel(c24(), 'dwarf', 'pt'), 'Médio');
  assert.match(sizeLabel(c24(), 'human', 'pt'), /você escolhe/);
  assert.equal(sizeLabel(c14(), 'halfling-stout', 'en'), 'Small');
});

test('traços principais sem a visão no escuro (ela aparece à parte)', () => {
  const { main, rest } = splitTraits(c24(), 'elf', 3);
  assert.equal(main.length, 3);
  assert.ok([...main, ...rest].every(t => !/darkvision/i.test(t.name.en)));
});

test('2014 mostra bônus racial; 2024 não', () => {
  assert.equal(raceBonusText(c14(), 'dwarf-hill', 'pt'), '+2 CON, +1 SAB');
  assert.equal(raceBonusText(c14(), 'human', 'pt'), '+1 em todos os atributos');
  assert.match(raceBonusText(c14(), 'half-elf', 'pt'), /\+2 CAR, \+1 em 2 outros atributos/);
  assert.equal(raceBonusText(c24(), 'dwarf', 'pt'), '');
});

test('idiomas no cartão: 2014 da raça; 2024 aviso de origem', () => {
  assert.equal(speciesLanguagesText(c14(), 'dwarf-hill', 'pt'), 'Comum, Anão');
  assert.match(speciesLanguagesText(c24(), 'dwarf', 'pt'), /Comum \+ 2/);
});

// ---------- Trocar de espécie ----------

test('trocar de espécie limpa escolhas, idiomas, talento da espécie e (2014) bônus racial', () => {
  const feats = [{ id: 'alert', name: 'Alert', origin: 'background' }, { id: 'tough', name: 'Tough', origin: 'species' }];
  const p24 = selectSpecies(c24({ race: 'human', speciesChoices: { size: 'Medium' }, languages: ['Elvish'], feats, raceBonus: { str: 2 } }), 'elf');
  assert.equal(p24.race, 'elf');
  assert.deepEqual(p24.speciesChoices, {});
  assert.deepEqual(p24.languages, ['Elvish'], '2024: a espécie não dá idiomas; o escolhido continua válido');
  assert.deepEqual(p24.feats.map(f => f.id), ['alert']);
  assert.ok(!('raceBonus' in p24), '2024: raceBonus é do antecedente, não mexe');
  const p14 = selectSpecies(c14({ race: 'human', raceBonus: { str: 1 } }), 'dwarf-hill');
  assert.deepEqual(p14.raceBonus, {});
  assert.deepEqual(selectSpecies(c24({ race: 'elf' }), 'elf'), {});
});

test('issues da espécie', () => {
  assert.equal(speciesIssues(c24()).length, 1);
  assert.equal(speciesIssues(c24({ race: 'nope' })).length, 1);
  assert.deepEqual(speciesIssues(c24({ race: 'elf' })), []);
  assert.deepEqual(speciesIssues(c14({ race: 'drow' })), []);
});

// ---------- Escolhas da espécie ----------

test('etapa de escolhas só aparece se a espécie tem escolhas', () => {
  assert.equal(hasSpeciesChoices(c24({ race: 'human' })), true);
  assert.equal(hasSpeciesChoices(c24({ race: 'dwarf' })), false);
  assert.equal(hasSpeciesChoices(c14({ race: 'elf-high' })), true);
  assert.equal(hasSpeciesChoices(c14({ race: 'dwarf-hill' })), true, 'anão 2014 escolhe a ferramenta de artesão');
  assert.equal(hasSpeciesChoices(c14({ race: 'gnome-rock' })), false);
  assert.equal(hasSpeciesChoices(c14({ race: 'halfling-light' })), false);
  // 2024 não pede o +1/+1 do Humano Variante (seria ignorado).
  const hv = speciesChoicesIssues(c24({ race: 'human-variant', speciesChoices: { skill: 'arcana' }, feats: [{ id: 'alert', name: 'Alert', origin: 'species' }] }));
  assert.ok(hv.every(i => !/atributo/i.test(i.pt)), JSON.stringify(hv));
});

test('escolhas pendentes em linguagem simples', () => {
  const issues = speciesChoicesIssues(c24({ race: 'elf' }));
  assert.ok(issues.length >= 2);
  assert.ok(issues.every(i => i.pt && i.en));
  assert.ok(issues.some(i => /Linhagem/i.test(i.pt)));
});

test('perícia da espécie repetida com a do antecedente é bloqueada', () => {
  // Soldado 2024: Atletismo e Intimidação.
  const ch = c24({ race: 'elf', speciesChoices: { lineage: 'high', spellAbility: 'int', skill: 'perception' } });
  assert.deepEqual(repeatedSpeciesSkills(ch), []);
  const dupBg = c24({ race: 'human', speciesChoices: { size: 'Medium', skill: 'athletics' } });
  assert.deepEqual(repeatedSpeciesSkills(dupBg), ['athletics']);
  assert.ok(speciesChoicesIssues(dupBg).some(i => /Atletismo/.test(i.pt)));
  const dupClass = c24({ race: 'human', skillProfs: ['history'], speciesChoices: { size: 'Medium', skill: 'history' } });
  assert.deepEqual(repeatedSpeciesSkills(dupClass), ['history']);
});

test('2014: Meio-Elfo com perícia repetida da classe', () => {
  const ch = c14({ race: 'half-elf', skillProfs: ['perception'], speciesChoices: { skill: ['perception', 'stealth'] } });
  assert.deepEqual(repeatedSpeciesSkills(ch), ['perception']);
});

test('talento do Humano repetindo o de origem (Alerta) é bloqueado; Habilidoso pode repetir', () => {
  const feats = [{ id: 'alert', name: 'Alert', origin: 'background', level: 1 }, { id: 'alert', name: 'Alert', origin: 'species', level: 1 }];
  const ch = c24({ race: 'human', background: 'guard', speciesChoices: { size: 'Medium', skill: 'stealth' }, feats });
  assert.ok(repeatedSpeciesFeat(ch));
  assert.ok(speciesChoicesIssues(ch).some(i => /já tem o talento/.test(i.pt)));
  const other = c24({ race: 'human', background: 'guard', speciesChoices: { size: 'Medium', skill: 'stealth' }, feats: [feats[0], { id: 'tough', name: 'Tough', origin: 'species', level: 1 }] });
  assert.equal(repeatedSpeciesFeat(other), null);
});

test('atributo de conjuração recomendado segue a classe', () => {
  assert.equal(recommendedSpellAbility(c24({ className: 'wizard' })), 'int');
  assert.equal(recommendedSpellAbility(c24({ className: 'cleric' })), 'wis');
  assert.equal(recommendedSpellAbility(c24({ className: 'fighter', abilities: { int: 8, wis: 14, cha: 10 } })), 'wis');
});

// ---------- Idiomas ----------

test('2024: Comum fixo, +2 da origem, exatamente 2', () => {
  const ch = c24({ race: 'dwarf' });
  assert.equal(languagesApply(ch), true);
  assert.deepEqual(fixedLanguageReasons(ch).map(f => f.id), ['Common']);
  assert.deepEqual(languageSlotReasons(ch).map(s => [s.source, s.n]), [['origin', 2]]);
  assert.equal(languagesIssues(ch).length, 1);
  assert.deepEqual(languagesIssues({ ...ch, languages: ['Dwarvish', 'Elvish'] }), []);
  assert.ok(languagesIssues({ ...ch, languages: ['Dwarvish', 'Elvish', 'Giant'] }).length > 0, 'a mais também trava');
});

test('2024: Ladino ganha +1 (Gíria de Ladrão) e o idioma fixo vem explicado', () => {
  const ch = c24({ race: 'human', className: 'rogue', background: 'criminal' });
  assert.equal(Utils.languageChoiceCount(ch), 3);
  const reasons = fixedLanguageReasons(ch);
  assert.ok(reasons.find(r => r.id === "Thieves' Cant").why.pt.includes('classe'));
  assert.ok(languageSlotReasons(ch).some(s => s.source === 'class' && s.n === 1));
});

test('2014: vagas da raça e do antecedente (Alto Elfo Sábio = 3)', () => {
  const ch = c14({ race: 'elf-high', background: 'sage' });
  assert.deepEqual(languageSlotReasons(ch).map(s => [s.source, s.n]), [['race', 1], ['background', 2]]);
  assert.ok(fixedLanguageReasons(ch).find(f => f.id === 'Elvish').why.pt.includes('raça'));
  assert.equal(languagesIssues({ ...ch, languages: ['Dwarvish', 'Giant'] }).length, 1);
  assert.deepEqual(languagesIssues({ ...ch, languages: ['Dwarvish', 'Giant', 'Orc'] }), []);
});

test('2014: Anão da Colina Soldado não tem idioma a escolher (etapa pulada)', () => {
  const ch = c14({ race: 'dwarf-hill' });
  assert.equal(languagesApply(ch), false);
  assert.deepEqual(languagesIssues(ch), []);
  const extra = { ...ch, languages: ['Elvish'] };
  assert.equal(languagesApply(extra), true, 'idioma sobrando: mostra a etapa para desmarcar');
  assert.equal(languagesIssues(extra).length, 1);
  assert.deepEqual(chosenLanguages(extra), ['Elvish']);
});

// ---------- Correções do teste de navegador (grupo espécie) ----------

test('bug 24/61/73: Anão 2014 escolhe 1 ferramenta de artesão e ela vai para toolProfs sem apagar as outras', () => {
  const base = c14({ className: 'cleric', background: 'acolyte', toolProfs: ['herbalismKit'], creation: { toolChoices: { class: ['herbalismKit'] } } });
  const ch = { ...base, ...selectSpecies(base, 'dwarf-hill') };
  const spec = speciesChoiceSpecs(ch).find(c => c.key === 'tool');
  assert.ok(spec, 'pede a ferramenta');
  assert.deepEqual(spec.options.map(o => o.id), ['smithsTools', 'brewersSupplies', 'masonsTools']);
  assert.ok(speciesChoicesIssues(ch).some(i => /Ferramenta de artesão/.test(i.pt)));
  const next = { ...ch, speciesChoices: { tool: 'smithsTools' } };
  const p = syncSpeciesTools(ch, next);
  assert.deepEqual(p.toolProfs.sort(), ['herbalismKit', 'smithsTools']);
  assert.deepEqual(p.creation.toolChoices.species, ['smithsTools']);
  assert.equal(p.creation.toolChoices.class[0], 'herbalismKit');
  const done = { ...next, ...p };
  assert.deepEqual(speciesChoicesIssues(done), []);
  assert.equal(missingSpeciesToolsPatch(done), null);
  // Trocar a ferramenta tira a anterior.
  const p2 = syncSpeciesTools(done, { ...done, speciesChoices: { tool: 'masonsTools' } });
  assert.deepEqual(p2.toolProfs.sort(), ['herbalismKit', 'masonsTools']);
  // Trocar de raça tira a ferramenta do anão e mantém a da classe.
  const elf = selectSpecies(done, 'elf-high');
  assert.deepEqual(elf.toolProfs, ['herbalismKit']);
  // Se outra etapa limpou toolProfs, o patch devolve a ferramenta.
  const lost = { ...done, toolProfs: ['herbalismKit'] };
  assert.deepEqual(missingSpeciesToolsPatch(lost).toolProfs.sort(), ['herbalismKit', 'smithsTools']);
  assert.equal(speciesGrants(done).options.tool.name.pt, 'Ferramentas de Ferreiro');
});

test('bug 61: Gnomo das Rochas ganha Ferramentas de Funileiro sozinho; visão no escuro 2014 em speciesGrants', () => {
  const p = selectSpecies(c14({ toolProfs: [] }), 'gnome-rock');
  assert.deepEqual(p.toolProfs, ['tinkersTools']);
  assert.deepEqual(p.creation.toolChoices.species, ['tinkersTools']);
  assert.deepEqual(speciesToolIds(c14({ race: 'gnome-rock' })), ['tinkersTools']);
  assert.equal(speciesGrants(c14({ race: 'dwarf-hill' })).darkvision, 60);
  assert.equal(speciesGrants(c14({ race: 'drow' })).darkvision, 120);
  assert.equal(speciesGrants(c14({ race: 'human' })).darkvision, 0);
  assert.deepEqual(speciesGrants(c24({ race: 'dwarf' })).tools, [], '2024 não usa ferramentas de raça');
});

test('bug 36: Humano 2024 vem com Médio marcado e recomenda talento pela classe', () => {
  const p = selectSpecies(c24(), 'human');
  assert.deepEqual(p.speciesChoices, { size: 'Medium' });
  const ch = { ...c24(), ...p };
  assert.equal(recommendedSpeciesFeat({ ...ch, className: 'fighter' }).id, 'tough');
  assert.equal(recommendedSpeciesFeat({ ...ch, className: 'rogue' }).id, 'skilled');
  assert.equal(recommendedSpeciesFeat({ ...ch, className: 'wizard' }).id, 'alert');
  // Alerta já veio do antecedente: cai para Habilidoso (repetível).
  const guard = { ...ch, className: 'wizard', feats: [{ id: 'alert', name: 'Alert', origin: 'background' }] };
  assert.equal(recommendedSpeciesFeat(guard).id, 'skilled');
  assert.ok(recommendedSpeciesFeat(ch).why.pt);
  assert.equal(recommendedSpeciesFeat(c24({ race: 'elf' })), null);
  assert.ok(!/recomendado\)/.test(SPECIES_2024_REVISED.human.traits[2].desc.pt));
});

test('bug 74: perícias do Habilidoso (Humano) repetidas após trocar o antecedente viram pendência', () => {
  const feats = [{ id: 'skilled', name: 'Habilidoso', origin: 'species', level: 1, picks: { skillOrTool: ['athletics', 'intimidation', 'stealth'] } }];
  const sage = c24({ race: 'human', background: 'sage', skillProfs: ['perception', 'survival'], speciesChoices: { size: 'Medium', skill: 'insight' }, feats });
  assert.deepEqual(repeatedSpeciesFeatSkills(sage), []);
  const soldier = { ...sage, background: 'soldier' };
  assert.deepEqual(repeatedSpeciesFeatSkills(soldier), ['athletics', 'intimidation']);
  const msg = speciesChoicesIssues(soldier).find(i => /Habilidoso/.test(i.pt));
  assert.ok(msg && /Atletismo e Intimidação já vêm/.test(msg.pt), msg?.pt);
});

test('bug 50: atributo de conjuração da espécie para classes sem magia usa o atributo mental da classe', () => {
  assert.equal(recommendedSpellAbility(c24({ className: 'monk' })), 'wis');
  assert.equal(recommendedSpellAbility(c24({ className: 'rogue' })), 'int');
  assert.equal(recommendedSpellAbility(c24({ className: 'barbarian' })), 'wis');
  assert.equal(recommendedSpellAbility(c24({ className: 'fighter' })), 'cha');
  assert.equal(recommendedSpellAbility(c24({ className: 'monk', abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } })), 'wis');
});

test('bug 82: trocar de raça 2014 mantém os idiomas que continuam valendo', () => {
  const r = c14({ className: 'rogue', background: 'sage', race: 'elf-high', languages: ['Dwarvish', 'Giant', 'Draconic'] });
  assert.deepEqual(selectSpecies(r, 'human').languages, ['Dwarvish', 'Giant', 'Draconic']);
  // Anão já fala Anão (fixo): o idioma sai da lista de escolhidos; sobram os que cabem.
  const d = selectSpecies(r, 'dwarf-hill').languages;
  assert.ok(!d.includes('Dwarvish'));
  assert.deepEqual(d, ['Giant', 'Draconic']);
  // Idioma fixo da raça antiga não vira "escolhido" na nova.
  const withFixed = c14({ background: 'acolyte', race: 'elf-high', languages: ['Common', 'Elvish', 'Giant'] });
  assert.ok(!selectSpecies(withFixed, 'human').languages.includes('Elvish'));
});

test('bug 44: dica de idioma serve para o Humano e não repete idioma que já fala', () => {
  const h = languageSuggestions(c24({ race: 'human' }));
  assert.equal(h.kind, 'recommended');
  assert.deepEqual(h.ids, ['Dwarvish', 'Elvish']);
  assert.deepEqual(languageSuggestions(c24({ race: 'dwarf' })), { ids: ['Dwarvish'], kind: 'species' });
  const dw = languageSuggestions(c14({ race: 'dwarf-hill', background: 'sage' }));
  assert.ok(!dw.ids.includes('Dwarvish') && dw.ids.length === 2, JSON.stringify(dw));
});

test('bug 40 e textos: sub-raças sem "HP", "Truque Cantado" ou "Druidcraft" em pt', () => {
  const races = SRD.RACES.filter(r => r.traits);
  const pt = races.flatMap(r => r.traits.flatMap(t => [t.name?.pt || '', t.desc?.pt || ''])).join('\n');
  assert.ok(!/\bHP\b/.test(pt), 'HP em pt');
  assert.ok(!/Truque Cantado/.test(pt));
  assert.ok(!/Druidcraft/.test(pt));
  assert.ok(!/salvamento/.test(pt));
  assert.deepEqual(speciesIssues(c14()).map(i => i.pt), ['Escolha uma raça para o seu herói.']);
  const anc = speciesChoiceSpecs(c24({ race: 'dragonborn' }))[0].options.find(o => o.id === 'red');
  assert.equal(anc.desc.pt, 'Dano de fogo.');
  const blue = speciesChoiceSpecs(c24({ race: 'dragonborn' }))[0].options.find(o => o.id === 'blue');
  assert.equal(blue.desc.pt, 'Dano elétrico.');
});
