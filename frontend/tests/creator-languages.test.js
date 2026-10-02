import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import SRD from '../data/srd.js';
import { speciesChoiceSpecs, speciesChoiceIssues, speciesAsi } from '../src/progression/species.js';

const c24 = (extra = {}) => ({ rulesVersion: '2024', className: 'fighter', race: 'human', background: 'soldier', level: 1, ...extra });
const c14 = (extra = {}) => ({ rulesVersion: '2014', className: 'fighter', race: 'human', background: 'soldier', level: 1, ...extra });
const race = (id) => SRD.RACES.find(r => r.id === id);
const traitNames = (id) => race(id).traits.map(t => t.name.en);

// ---------- 2014 ----------

test('2014: Meio-Elfo ganha +1 idioma à escolha (SRD 5.1)', () => {
  const c = c14({ race: 'half-elf' });
  assert.deepEqual(Utils.fixedLanguages(c).sort(), ['Common', 'Elvish']);
  assert.equal(Utils.languageChoiceCount(c), 1); // Soldado não dá idioma
  assert.deepEqual(Utils.languageChoiceSources(c).map(s => s.source), ['race']);
});

test('2014: Alto Elfo tem Idioma Extra; com Sábio escolhe 3', () => {
  const c = c14({ race: 'elf-high', background: 'sage' });
  assert.equal(Utils.languageChoiceCount(c), 3);
  assert.ok(traitNames('elf-high').includes('Extra Language'));
  assert.ok(traitNames('elf-high').includes('Elf Weapon Training'));
});

test('2014: traços do SRD 5.1 que faltavam', () => {
  for (const id of ['dwarf-hill', 'dwarf-mountain']) {
    const t = traitNames(id);
    assert.ok(t.includes('Dwarven Combat Training'), id);
    assert.ok(t.includes('Tool Proficiency'), id);
    assert.ok(t.includes('Stonecunning'), id);
    assert.deepEqual(race(id).weapons, ['battleaxe', 'handaxe', 'lightHammer', 'warhammer']);
    assert.equal(race(id).tools.choose, 1);
  }
  assert.ok(!JSON.stringify(race('dwarf-hill').traits).includes('maul'), 'martelo de guerra, não maul');
  assert.deepEqual(race('dwarf-mountain').armor, ['light', 'medium']);
  for (const t of ['Keen Senses', 'Fey Ancestry', 'Trance', 'Elf Weapon Training', 'Mask of the Wild', 'Fleet of Foot']) {
    assert.ok(traitNames('elf-wood').includes(t), t);
  }
  assert.ok(traitNames('gnome-rock').includes('Tinker'));
  assert.deepEqual(race('gnome-rock').tools.fixed, ['tinkersTools']);
  assert.ok(traitNames('halfling-stout').includes('Halfling Nimbleness'));
  assert.deepEqual(race('drow').weapons, ['rapier', 'shortsword', 'crossbowHand']);
  assert.equal(race('drow').darkvision, 120);
  // Ids de arma existem no catálogo.
  const weaponIds = new Set(SRD.WEAPONS.map(w => w.id));
  for (const r of SRD.RACES) for (const w of r.weapons || []) assert.ok(weaponIds.has(w), `${r.id}: ${w}`);
  // Marca da Proteção (anão) herda o treinamento anão.
  assert.deepEqual(race('dwarf-mark-warding').weapons, ['battleaxe', 'handaxe', 'lightHammer', 'warhammer']);
});

test('2014: catálogo sem Língua de Sinais Comum e com Dracônico exótico', () => {
  const cat = Utils.languageCatalog(c14());
  assert.ok(!cat.some(l => l.id === 'Common Sign Language'));
  assert.equal(cat.find(l => l.id === 'Draconic').rare, true);
  assert.equal(cat.find(l => l.id === 'Dwarvish').rare, false);
  const cat24 = Utils.languageCatalog(c24());
  assert.ok(cat24.some(l => l.id === 'Common Sign Language'));
  assert.equal(cat24.find(l => l.id === 'Draconic').rare, false);
});

test('2014: exóticos são permitidos (com aval do mestre), sem limite', () => {
  const c = c14({ background: 'sage', languages: ['Abyssal', 'Infernal', 'Celestial'] });
  assert.equal(Utils.rareLanguageAllowance(c), Infinity);
  assert.deepEqual(Utils.languageIssues(c), []);
});

test('2014: Língua de Sinais Comum é inválida e sai no trim', () => {
  const c = c14({ background: 'sage', languages: ['Common Sign Language', 'Dwarvish'] });
  const issues = Utils.languageIssues(c);
  assert.ok(issues.some(i => i.pt.includes('só existe nas regras 2024')));
  assert.ok(issues.some(i => i.pt.includes('Escolha mais 2 idiomas')));
  assert.deepEqual(Utils.trimLanguages(c), ['Dwarvish']);
});

test('2014: trocar Sábio por Soldado deixa idiomas a mais; issues avisa e trim corta', () => {
  const c = c14({ background: 'soldier', languages: ['Dwarvish', 'Giant', 'Orc'] });
  // Humano 2014: +1; Soldado: 0.
  assert.equal(Utils.languageChoiceCount(c), 1);
  const [issue] = Utils.languageIssues(c);
  assert.match(issue.pt, /2 idiomas a mais/);
  assert.match(issue.en, /too many/);
  assert.deepEqual(Utils.trimLanguages(c), ['Dwarvish']);
  assert.deepEqual(Utils.languageIssues({ ...c, languages: Utils.trimLanguages(c) }), []);
});

test('issues pede exatamente o que falta (singular e plural)', () => {
  assert.deepEqual(Utils.languageIssues(c14()), [{ pt: 'Escolha mais 1 idioma.', en: 'Pick 1 more language.' }]);
  assert.deepEqual(Utils.languageIssues(c24()), [{ pt: 'Escolha mais 2 idiomas.', en: 'Pick 2 more languages.' }]);
  assert.deepEqual(Utils.languageIssues(c24({ languages: ['Elvish', 'Dwarvish'] })), []);
});

test('escolhido que virou fixo não conta (ex.: trocar para Elfo 2014)', () => {
  const c = c14({ race: 'elf-wood', background: 'sage', languages: ['Elvish', 'Dwarvish'] });
  assert.deepEqual(Utils.chosenLanguageIds(c), ['Dwarvish']);
  assert.match(Utils.languageIssues(c)[0].pt, /Escolha mais 1 idioma/);
  // Marcadores antigos e fixos salvos na ficha são ignorados.
  assert.deepEqual(Utils.chosenLanguageIds({ ...c, languages: ['Common', 'Elvish', '+2 of choice', 'Orc'] }), ['Orc']);
});

// ---------- 2024 ----------

test('2024: espécie não dá idiomas — nem as legadas (Firbolg, Alto Elfo)', () => {
  for (const id of ['firbolg', 'elf-high', 'drow', 'elf', 'dwarf']) {
    const c = c24({ race: id });
    assert.deepEqual(Utils.fixedLanguages(c), ['Common'], id);
    assert.equal(Utils.languageChoiceCount(c), 2, id);
  }
  // '+N of choice' de raça legada também não soma em 2024.
  assert.equal(Utils.languageChoiceCount(c24({ race: 'changeling' })), 2);
  assert.equal(Utils.languageChoiceCount(c24({ race: 'half-elf' })), 2);
});

test('2024: Ladino ganha +1 idioma da classe, que pode ser raro', () => {
  const c = c24({ className: 'rogue', background: 'criminal' });
  assert.ok(Utils.fixedLanguages(c).includes("Thieves' Cant"));
  assert.deepEqual(Utils.languageChoiceSources(c), [{ source: 'origin', n: 2, rare: false }, { source: 'class', n: 1, rare: true }]);
  assert.equal(Utils.languageChoiceCount(c), 3);
  assert.equal(Utils.rareLanguageAllowance(c), 1);
  assert.deepEqual(Utils.languageIssues({ ...c, languages: ['Elvish', 'Dwarvish', 'Abyssal'] }), []);
  const two = { ...c, languages: ['Elvish', 'Infernal', 'Abyssal'] };
  assert.match(Utils.languageIssues(two)[0].pt, /Só 1 idioma raro/);
  assert.deepEqual(Utils.trimLanguages(two), ['Elvish', 'Infernal']);
});

test('2024: idioma do Ladino já escolhido pela opção de classe não abre vaga de novo', () => {
  const c = c24({ className: 'rogue', classOptions: [{ classId: 'rogue', pool: 'language', id: 'Elvish', level: 1 }] });
  assert.equal(Utils.languageChoiceCount(c), 2);
  assert.ok(Utils.fixedLanguages(c).includes('Elvish'));
  // 2014 o Ladino não ganha idioma extra.
  assert.equal(Utils.languageChoiceCount(c14({ className: 'rogue' })), 1);
});

test('2024: idiomas raros não valem para a origem', () => {
  const c = c24({ languages: ['Elvish', 'Abyssal'] });
  assert.equal(Utils.rareLanguageAllowance(c), 0);
  const issues = Utils.languageIssues(c);
  assert.equal(issues.length, 1);
  assert.match(issues[0].pt, /Idiomas raros \(Abissal\)/);
  assert.deepEqual(Utils.trimLanguages(c), ['Elvish']);
  // Druídico/Gíria são secretos e fixos da classe, não escolha.
  assert.ok(Utils.fixedLanguages(c24({ className: 'druid' })).includes('Druidic'));
});

test('trimLanguages: corta excesso mantendo os primeiros', () => {
  const c = c24({ languages: ['Orc', 'Giant', 'Goblin', 'Halfling'] });
  assert.deepEqual(Utils.trimLanguages(c), ['Orc', 'Giant']);
  assert.deepEqual(Utils.trimLanguages(c24({ languages: ['Orc'] })), ['Orc']);
});

test('languagesFor continua juntando fixos + escolhidos', () => {
  assert.deepEqual(Utils.languagesFor(c24({ race: 'elf', languages: ['Elvish', 'Dwarvish'] })).sort(), ['Common', 'Dwarvish', 'Elvish']);
});

// ---------- Espécies legadas em 2024 ----------

test('2024: Humano Variante / Linhagem Personalizada não pedem +1/+1 (não seria aplicado)', () => {
  for (const id of ['human-variant', 'custom-lineage', 'customLineage', 'variant-human']) {
    const c24c = c24({ race: id });
    const c14c = c14({ race: id });
    const had14 = speciesChoiceSpecs(c14c).some(s => s.key === 'asi');
    if (!had14) continue;
    assert.ok(!speciesChoiceSpecs(c24c).some(s => s.key === 'asi'), id);
    assert.ok(!speciesChoiceIssues(c24c).some(i => i.key === 'asi'), id);
    assert.ok(speciesChoiceIssues(c14c).some(i => i.key === 'asi'), `${id} (2014 continua pedindo)`);
    assert.deepEqual(speciesAsi({ ...c24c, speciesChoices: { asi: { str: 1, dex: 1 } } }), {});
  }
  // Pelo menos uma raça legada com 'asi' existe e foi testada.
  const withAsi = SRD.RACES.filter(r => speciesChoiceSpecs(c14({ race: r.id })).some(s => s.key === 'asi'));
  assert.ok(withAsi.length > 0);
  for (const r of withAsi) assert.ok(!speciesChoiceSpecs(c24({ race: r.id })).some(s => s.key === 'asi'), r.id);
});
