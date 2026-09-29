import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Book from '../src/progression/spellbook.js';
import { applyLevelUpChoices, revertLastLevel } from '../src/progression/engine.js';
import { poolOptions } from '../src/progression/options-catalog.js';
import wizard from '../data/class-options/wizard.js';
import Utils from '../utils.js';

const mage = (level, spells = [], extra = {}) => ({
  className: 'wizard', level, rulesVersion: '2024', race: 'human',
  abilities: { str: 8, dex: 14, con: 14, int: 17, wis: 12, cha: 10 },
  skillProfs: ['arcana', 'history'], classOptions: [], spells, maxHp: 8, currentHp: 8, ...extra,
});
const START = ['burningHands', 'magicMissile', 'shield', 'detectMagic', 'sleep', 'mageArmor'];

test('grimório: tamanho, ganho por nível e custo de cópia', () => {
  assert.equal(Book.spellbookSize(1), 6);
  assert.equal(Book.spellbookSize(5), 14);
  assert.equal(Book.spellbookGain(1), 6);
  assert.equal(Book.spellbookGain(7), 2);
  assert.deepEqual(Book.copyCost(3), { hours: 6, gp: 150 });
});

test('grimório: ficha antiga sem inBook trata magias de nível 1+ como no livro (truques e autos fora)', () => {
  const c = mage(3, [{ id: 'fireBolt', prepared: true }, { id: 'shield', prepared: true }, { id: 'sleep', prepared: true }, { id: 'mistyStep', prepared: true, auto: true }]);
  assert.deepEqual(Book.spellbookIds(c).sort(), ['shield', 'sleep']);
  const norm = Book.normalizeSpellbook(c);
  assert.equal(norm.find(s => s.id === 'shield').inBook, true);
  assert.equal(norm.find(s => s.id === 'fireBolt').inBook, undefined);
  // Outras classes não têm grimório.
  assert.deepEqual(Book.spellbookIds({ ...c, className: 'cleric' }), []);
});

test('grimório: preparar respeita o limite; trapaça (Infinity) libera', () => {
  let c = mage(1, [{ id: 'fireBolt', prepared: true }]);
  c = { ...c, spells: Book.addToSpellbook(c, START) };
  assert.equal(Book.spellbookIds(c).length, 6);
  assert.equal(Book.preparedFromBook(c).length, 0);
  const limit = Utils.preparedSpellsLimit(c);
  assert.equal(limit, 4);
  for (const id of START.slice(0, 4)) c = { ...c, spells: Book.togglePreparedInBook(c, id, limit) };
  assert.equal(Book.preparedFromBook(c).length, 4);
  assert.equal(Book.togglePreparedInBook(c, 'sleep', limit), null);
  assert.ok(Book.togglePreparedInBook(c, 'sleep', Infinity));
  // Desmarcar mantém a magia no livro.
  c = { ...c, spells: Book.togglePreparedInBook(c, 'shield', limit) };
  assert.ok(Book.spellbookIds(c).includes('shield'));
  assert.ok(!Book.preparedFromBook(c).includes('shield'));
  // Rascunho do modal: livro só muda `prepared`; truque desmarcado sai.
  const next = Book.applyPreparedDraft(c, ['sleep'], new Set(['fireBolt', ...START]));
  assert.deepEqual(Book.spellbookIds({ ...c, spells: next }).sort(), [...START].sort());
  assert.deepEqual(Book.preparedFromBook({ ...c, spells: next }), ['sleep']);
  assert.ok(!next.some(s => s.id === 'fireBolt'));
  // Tirar do livro.
  assert.ok(!Book.spellbookIds({ ...c, spells: Book.removeFromSpellbook(c, 'sleep') }).includes('sleep'));
});

test('grimório: candidatos para copiar/aprender são magias de Mago fora do livro', () => {
  const c = mage(1, Book.addToSpellbook(mage(1), START));
  const lvl1 = Book.spellbookCandidates(c, { maxLevel: 1 });
  assert.ok(lvl1.length > 0 && lvl1.every(s => s.level === 1 && s.classes.includes('wizard')));
  assert.ok(!lvl1.some(s => START.includes(s.id)));
  assert.ok(Book.spellbookCandidates(c, { maxLevel: 9, anyList: true }).some(s => !s.classes.includes('wizard')));
});

test('grimório: subir de mago acrescenta 2 magias ao livro (não preparadas) e voltar remove', () => {
  const c1 = mage(1, [{ id: 'fireBolt', prepared: true }, ...START.map(id => ({ id, prepared: true }))]); // ficha antiga
  const c2 = applyLevelUpChoices(c1, { toLevel: 2, hpGain: 5, classId: 'wizard', spellsAdded: [{ id: 'charmPerson', inBook: true }, { id: 'colorSpray', inBook: true }] });
  const ids = Book.spellbookIds(c2);
  assert.equal(ids.length, 8);
  assert.ok(ids.includes('charmPerson') && ids.includes('shield'));
  assert.equal(c2.spells.find(s => s.id === 'charmPerson').prepared, false);
  assert.equal(c2.spells.find(s => s.id === 'fireBolt').inBook, undefined);
  assert.deepEqual(c2.levelHistory.at(-1).spellsAdded, ['charmPerson', 'colorSpray']);
  const back = revertLastLevel(c2);
  assert.deepEqual(Book.spellbookIds(back).sort(), [...START].sort());
  // Outras classes: itens em string continuam iguais (preparadas).
  const druid = applyLevelUpChoices({ ...c1, className: 'druid', spells: [] }, { toLevel: 2, hpGain: 5, classId: 'druid', spellsAdded: ['produceFlame'] });
  assert.equal(druid.spells.find(s => s.id === 'produceFlame').prepared, true);
});

test('grimório: Maestria e Assinatura filtram pelo livro (filter.inBook)', () => {
  for (const p of ['spellMastery1', 'spellMastery2', 'legacySpellMastery1', 'legacySpellMastery2', 'signatureSpells']) {
    assert.equal(wizard.pools[p].filter.inBook, true, p);
  }
  assert.ok(!wizard.pools.evocationSavant.filter.inBook);
  const c = mage(18, Book.addToSpellbook(mage(18), ['magicMissile', 'shield', 'mistyStep', 'scorchingRay', 'fireball']));
  assert.deepEqual(poolOptions(c, 'wizard', 'spellMastery1').map(o => o.id), ['magicMissile']); // shield é Reação
  assert.deepEqual(poolOptions(c, 'wizard', 'spellMastery2').map(o => o.id), ['scorchingRay']); // Passo Nebuloso é Ação Bônus
  assert.deepEqual(poolOptions({ ...c, level: 20 }, 'wizard', 'signatureSpells').map(o => o.id), ['fireball']);
});

test('Sábio: magias grátis entram no grimório sem preparar e saem se a escolha sair', async () => {
  const { applyClassOptions, applyAutosToCharacter } = await import('../src/progression/engine.js');
  const base = { rulesVersion: '2024', className: 'wizard', subclass: 'evocation', level: 3, abilities: { int: 16 }, spells: [] };
  const c = applyClassOptions(base, 'wizard', { adds: [{ pool: 'evocationSavant', id: 'magicMissile' }, { pool: 'evocationSavant', id: 'shatter' }] });
  const mm = c.spells.find(s => s.id === 'magicMissile');
  assert.ok(mm && mm.inBook && mm.prepared === false && !mm.auto);
  const undone = applyAutosToCharacter({ ...c, classOptions: [] });
  assert.ok(!undone.spells.some(s => s.id === 'magicMissile'));
});
