import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import { PDFDocument } from 'pdf-lib';
import { buildSheetData, buildCoverData, spellbookSection, sheetValuesToChar, SPELL_CAPACITY, LAYOUT } from '../src/pdf/sheet-data.js';
import { exportDnd5ePdf } from '../src/pdf/export-pdf.js';
import { importDnd5ePdf, readPdfFields } from '../src/pdf/import-pdf.js';

const wizard = (extra = {}) => {
  const c = {
    ...Utils.makeNew(), name: 'Élara Ventoluz', player: 'Renan', className: 'wizard', level: 9, race: 'elf', background: 'sage',
    alignment: 'NG', abilities: { str: 8, dex: 14, con: 14, int: 18, wis: 12, cha: 10 }, maxHp: 58, currentHp: 40, tempHp: 5,
    skillProfs: ['arcana', 'history', 'investigation'], skillExpertise: [], saveProfs: ['int', 'wis'],
    coins: { cp: 3, sp: 10, ep: 0, gp: 125, pp: 2 }, equipment: [{ name: 'Grimório', qty: 1 }, { name: 'Tocha', qty: 5 }],
    weapons: [{ id: 'dagger', name: 'Adaga' }, { id: 'quarterstaff', name: 'Bordão' }, { id: 'lightCrossbow', name: 'Besta leve' }, { name: 'Pedra', bonus: 1, dmg: '1d2' }],
    personality: 'Curiosa demais.', deathSaves: { success: 2, fail: 1 }, ...extra,
  };
  const catalog = Utils.spellCatalog(c).filter(s => s.classes?.includes('wizard'));
  // Mais magias de 1º círculo do que as 12 linhas da ficha: precisa de outra página.
  const l1 = catalog.filter(s => s.level === 1).slice(0, 16);
  const cantrips = catalog.filter(s => s.level === 0).slice(0, 4);
  const l3 = catalog.filter(s => s.level === 3).slice(0, 3);
  c.spells = [...cantrips, ...l1, ...l3].map((s, i) => ({ id: s.id, prepared: i % 2 === 0 }));
  return c;
};

test('campos principais saem com os nomes da ficha oficial', () => {
  const d = buildSheetData(wizard(), 'pt');
  assert.equal(d.fields.CharacterName, 'Élara Ventoluz');
  assert.match(d.fields.ClassLevel, /Mago 9/);
  assert.equal(d.fields.INT, '18');
  assert.equal(d.fields.INTmod, '+4');
  assert.equal(d.fields.ProfBonus, '+4');
  assert.equal(d.fields['ST Intelligence'], '+8');
  assert.equal(d.checks['Check Box 21'], true); // salvaguarda de Sabedoria
  assert.equal(d.checks[LAYOUT.skillChecks[2]], true); // Arcanismo
  assert.equal(d.checks['Check Box 12'] && d.checks['Check Box 13'] && !d.checks['Check Box 14'], true);
  assert.equal(d.fields['Wpn Name 3'], 'Besta leve');
  assert.match(d.fields.AttacksSpellcasting, /Pedra/); // a 4ª arma vai para o quadro de ataques
});

test('magias além da capacidade da ficha abrem páginas extras sem perder nenhuma', () => {
  const c = wizard();
  const d = buildSheetData(c, 'pt');
  assert.equal(d.spellPages.length, 2);
  const total = d.spellPages.reduce((n, p) => n + Object.values(p.levels).reduce((m, l) => m + l.length, 0), 0);
  assert.equal(total, c.spells.length);
  assert.equal(d.spellPages[0].levels[1].length, SPELL_CAPACITY[1]);
  assert.equal(d.spellPages[1].levels[1].length, 16 - SPELL_CAPACITY[1]);
  assert.equal(d.spellPages[1].continued, true);
  assert.equal(Object.keys(d.spellPages[1].slots).length, 0); // espaços só na primeira página
});

test('não conjurador não gera página de magias', () => {
  const c = { ...wizard(), className: 'fighter', spells: [] };
  assert.equal(buildSheetData(c, 'en').spellPages.length, 0);
});

test('exporta PDF editável e importa de volta (ida e volta)', async () => {
  const c = wizard();
  const bytes = await exportDnd5ePdf(c, 'pt');
  const fields = await readPdfFields(bytes);
  assert.equal(fields.CharacterName, 'Élara Ventoluz');
  assert.ok('Spells 1015 #2' in fields, 'página extra de magias tem campos próprios');

  const { char, unmatched } = await importDnd5ePdf(bytes);
  assert.equal(char.name, 'Élara Ventoluz');
  assert.equal(char.className, 'wizard');
  assert.equal(char.level, 9);
  assert.equal(char.race, 'elf');
  assert.equal(char.background, 'sage');
  assert.equal(char.alignment, 'NG');
  assert.equal(char.abilities.int, 18);
  assert.equal(char.maxHp, 58);
  assert.equal(char.currentHp, 40);
  assert.deepEqual([...char.saveProfs].sort(), ['int', 'wis']);
  assert.ok(char.skillProfs.includes('arcana') && char.skillProfs.includes('investigation'));
  assert.equal(char.coins.gp, 125);
  assert.deepEqual(char.deathSaves, { success: 2, fail: 1 });
  assert.equal(char.weapons.length, 3);
  assert.equal(char.weapons[0].id, 'dagger');
  assert.deepEqual(new Set(char.spells.map(s => s.id)), new Set(c.spells.map(s => s.id)));
  const prepared = new Set(c.spells.filter(s => s.prepared && Utils.spellCatalog(c).find(d => d.id === s.id).level > 0).map(s => s.id));
  assert.deepEqual(new Set(char.spells.filter(s => s.prepared).map(s => s.id)), prepared);
  assert.deepEqual(unmatched, []);
});

test('importa valores no formato da ficha oficial (nomes com espaço sobrando, multiclasse)', () => {
  const { char, unmatched } = sheetValuesToChar({
    CharacterName: 'Thorin', ClassLevel: 'Fighter 3 / Rogue 2', 'Race ': 'Hill Dwarf', Background: 'Soldier',
    Alignment: 'Lawful Neutral', XP: '6500', STR: '16', DEX: '14', CON: '16', INT: '10', WIS: '12', CHA: '8',
    'Check Box 11': true, 'Check Box 19': true, Athletics: '+6', 'Stealth ': '+8', HPMax: '44',
    'Wpn Name': 'Longsword', 'Wpn1 AtkBonus': '+6', 'Wpn1 Damage': '1d8+3 slashing',
    ProficienciesLang: 'Languages: Common, Dwarvish\nArmor: all', Equipment: '2x Torch, Rope (50 ft)', GP: '15',
    'Spells 1014': 'Fire Bolt', 'Spells 1015': 'Unknown Homebrew Spell',
  });
  assert.equal(char.className, 'fighter');
  assert.equal(char.level, 5);
  assert.deepEqual(char.multiclass.map(m => m.id), ['rogue']);
  assert.deepEqual(char.classSequence, ['fighter', 'fighter', 'fighter', 'rogue', 'rogue']);
  assert.equal(char.race, 'dwarf-hill'); // nome exato vence o parcial "Dwarf"
  assert.equal(char.alignment, 'LN');
  assert.equal(char.xp, 6500);
  assert.deepEqual(char.saveProfs.sort(), ['con', 'str']);
  assert.ok(char.skillProfs.includes('athletics'));
  assert.ok(char.skillExpertise.includes('stealth')); // +8 com DES 14 e prof. +3
  assert.ok(char.languages.includes('Dwarvish'));
  assert.deepEqual(char.equipment[0], { name: 'Torch', qty: 2 });
  assert.equal(char.weapons[0].id, 'longsword');
  assert.ok(char.spells.some(s => s.id === 'fireBolt'));
  assert.ok(unmatched.some(u => u.includes('Unknown Homebrew Spell')));
  assert.match(char.notes, /Unknown Homebrew Spell/);
});

test('PDF editável mantém os campos; o "para imprimir" fixa o texto e remove o formulário', async () => {
  const c = wizard();
  const editable = await readPdfFields(await exportDnd5ePdf(c, 'pt'));
  assert.ok(Object.keys(editable).length > 300);
  const flat = await exportDnd5ePdf(c, 'pt', { flatten: true });
  assert.deepEqual(await readPdfFields(flat), {});
  assert.equal((await importDnd5ePdf(flat)).fieldCount, 0);
});

// PNG 1×1 — a Forja grava JPEG, mas fichas antigas/importadas podem ter PNG.
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('com foto, o PDF ganha uma capa e a importação continua funcionando', async () => {
  const c = wizard({
    avatar: TINY_PNG, symbol: 'Coruja de prata', conditions: ['poisoned'],
    tempEffects: [{ id: '1', name: 'Bênção', duration: '1 min' }],
    npcs: [{ id: 'n', name: 'Mestre Aldric', race: 'Humano', role: 'Mentor', relationship: 'ally', notes: 'Biblioteca de Candlekeep.' }],
  });
  const cover = buildCoverData(c, 'pt');
  assert.equal(cover.name, 'Élara Ventoluz');
  assert.match(cover.classLevel, /Mago 9/);
  assert.deepEqual(cover.facts[0], ['Símbolo', 'Coruja de prata']);
  assert.deepEqual(cover.conditions, ['Envenenado', 'Bênção (1 min)']);
  assert.equal(cover.npcs[0].title, 'Mestre Aldric — Aliado');

  const pages = async bytes => (await PDFDocument.load(bytes)).getPageCount();
  const plain = await exportDnd5ePdf(wizard(), 'pt');
  const withCover = await exportDnd5ePdf(c, 'pt');
  assert.equal(await pages(withCover), (await pages(plain)) + 1);
  const { char } = await importDnd5ePdf(withCover);
  assert.equal(char.name, 'Élara Ventoluz');
  assert.equal(char.level, 9);
});

test('foto inválida não quebra a exportação nem cria capa', async () => {
  const bytes = await exportDnd5ePdf(wizard({ avatar: 'data:image/png;base64,AAAA' }), 'pt');
  const plain = await exportDnd5ePdf(wizard(), 'pt');
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), (await PDFDocument.load(plain)).getPageCount());
});

test('ficha em branco: campos editáveis vazios, com página de magias, e volta como ficha nova', async () => {
  const bytes = await exportDnd5ePdf({}, 'pt', { blank: true });
  const fields = await readPdfFields(bytes);
  assert.ok(Object.keys(fields).length > 300);
  assert.ok('Spells 1015' in fields, 'tem página de magias');
  assert.ok(Object.values(fields).every(v => v === '' || v === false), 'nenhum campo vem preenchido');
  const empty = await importDnd5ePdf(bytes);
  assert.equal(empty.char, null, 'sem nada preenchido não cria ficha');
  assert.ok(empty.fieldCount > 0, 'mas não é confundido com PDF sem formulário');

  // Preenchida no leitor de PDF, volta como ficha.
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  form.getTextField('CharacterName').setText('Bruna Pedraforte');
  form.getTextField('ClassLevel').setText('Guerreiro 3');
  const { char } = await importDnd5ePdf(await doc.save());
  assert.equal(char.name, 'Bruna Pedraforte');
  assert.equal(char.className, 'fighter');
  assert.equal(char.level, 3);
});

test('versão de impressão traz o livro de magias com as descrições', async () => {
  const c = wizard();
  const book = spellbookSection(c, 'pt');
  assert.equal(book.items.length, c.spells.length);
  assert.match(book.items[0].title, /Truque/);
  assert.ok(book.items.every(it => it.text.length > 20), 'toda magia tem tempo/alcance e descrição');
  const pages = async bytes => (await PDFDocument.load(bytes)).getPageCount();
  const print = await exportDnd5ePdf(c, 'pt', { flatten: true, spellbook: true });
  assert.ok(await pages(print) > await pages(await exportDnd5ePdf(c, 'pt', { flatten: true })));
  assert.equal(spellbookSection({ ...wizard(), spells: [] }, 'pt'), null);
});
