import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  DICE_NOTATION_REGEX,
  ATTACK_ROLL_REGEX,
  SAVE_DC_REGEX,
  CHECK_DC_REGEX,
  findDiceAtOffset,
  parseTextWithDice,
  getClickedDiceFormula,
} from '../src/dice/dice-text.js';
import { parseFormula } from '../src/dice/dice-math.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('dice-text: DICE_NOTATION_REGEX matches canonical D&D dice notation across varied contexts', () => {
  const cases = [
    { input: '1d8', expected: ['1d8'] },
    { input: '3d8', expected: ['3d8'] },
    { input: 'd8', expected: ['d8'] },
    { input: '2d6+3', expected: ['2d6+3'] },
    { input: '3d8 + 4', expected: ['3d8 + 4'] },
    { input: '1d20-2', expected: ['1d20-2'] },
    { input: '10d6', expected: ['10d6'] },
    { input: '1d12', expected: ['1d12'] },
    { input: '1d100', expected: ['1d100'] },
    { input: 'Causa 3d8 de dano radiante (ou 1d8+2 se versátil).', expected: ['3d8', '1d8+2'] },
    { input: 'Recupera 2d4+2 pontos de vida.', expected: ['2d4+2'] },
    { input: 'Não deve casar 3d, 5d5, 1d30 ou abc2d6xyz.', expected: null },
  ];

  for (const { input, expected } of cases) {
    const matches = input.match(DICE_NOTATION_REGEX);
    if (expected === null) {
      assert.equal(matches, null, `Expected "${input}" to yield no matches`);
    } else {
      assert.ok(matches, `Expected "${input}" to yield matches`);
      assert.deepEqual(matches, expected, `Matches for "${input}" do not match expected`);
    }
  }
});

test('dice-text: findDiceAtOffset identifies dice formula at caret offset with touch jitter tolerance', () => {
  const sentence = 'O guerreiro desfere um golpe causando 3d8 de dano adicional e 1d6 de fogo.';
  // '3d8' starts at index 38 and ends at index 41

  // Directly inside '3d8'
  assert.equal(findDiceAtOffset(sentence, 38), '3d8');
  assert.equal(findDiceAtOffset(sentence, 39), '3d8');
  assert.equal(findDiceAtOffset(sentence, 40), '3d8');
  assert.equal(findDiceAtOffset(sentence, 41), '3d8');

  // 1-2 chars touch tolerance
  assert.equal(findDiceAtOffset(sentence, 37), '3d8');
  assert.equal(findDiceAtOffset(sentence, 42), '3d8');

  // Far outside '3d8'
  assert.equal(findDiceAtOffset(sentence, 10), null);
  assert.equal(findDiceAtOffset(sentence, 20), null);

  // '1d6' at index 62
  assert.equal(findDiceAtOffset(sentence, 62), '1d6');
  assert.equal(findDiceAtOffset(sentence, 64), '1d6');
});

test('dice-text: parseTextWithDice splits text into tokens and text chunks with whitespace normalization', () => {
  const text = 'Ataca com 3d8 + 2 de força e depois 1d10.';
  const parts = parseTextWithDice(text);

  assert.equal(parts.length, 5);
  assert.deepEqual(parts[0], { type: 'text', value: 'Ataca com ' });
  assert.deepEqual(parts[1], { type: 'die', formula: '3d8+2', raw: '3d8 + 2' });
  assert.deepEqual(parts[2], { type: 'text', value: ' de força e depois ' });
  assert.deepEqual(parts[3], { type: 'die', formula: '1d10', raw: '1d10' });
  assert.deepEqual(parts[4], { type: 'text', value: '.' });
});

test('dice-text: getClickedDiceFormula resolves formula from tokens, text nodes, and leaf elements safely', () => {
  // 1. Element with data-dice-roll
  const tokenEl = {
    closest: (selector) => (selector === '[data-dice-roll]' ? { getAttribute: () => '3d8' } : null),
    matches: () => false,
  };
  assert.equal(getClickedDiceFormula({ target: tokenEl }), '3d8');

  // 2. Form input element (must be protected from interception)
  const inputEl = {
    closest: () => null,
    matches: (selector) => selector.includes('input'),
  };
  assert.equal(getClickedDiceFormula({ target: inputEl }), null);

  // 3. Leaf text element matching a pure formula
  const leafEl = {
    closest: () => null,
    matches: () => false,
    children: [],
    textContent: '  1d8+3  ',
  };
  assert.equal(getClickedDiceFormula({ target: leafEl }), '1d8+3');

  // 4. Regular button / non-dice text
  const normalBtn = {
    closest: (selector) => (selector === 'button, a, summary' ? {} : null),
    matches: () => false,
    children: [],
    textContent: 'Fechar Janela',
  };
  assert.equal(getClickedDiceFormula({ target: normalBtn }), null);
});

test('dice-text: performRoll and parseFormula handle formula string and formula object seamlessly', () => {
  const parsed1 = parseFormula('1d8');
  assert.ok(parsed1);
  assert.equal(parsed1.terms[0].count, 1);
  assert.equal(parsed1.terms[0].sides, 8);
  assert.equal(parsed1.mod, 0);

  const parsed2 = parseFormula('3d8');
  assert.ok(parsed2);
  assert.equal(parsed2.terms[0].count, 3);
  assert.equal(parsed2.terms[0].sides, 8);
  assert.equal(parsed2.mod, 0);

  const parsed3 = parseFormula('2d6+3');
  assert.ok(parsed3);
  assert.equal(parsed3.terms[0].count, 2);
  assert.equal(parsed3.terms[0].sides, 6);
  assert.equal(parsed3.mod, 3);
});

test('dice-text: DiceRoller, FhFeatures, and Sheet components integrate dice-text mechanics', () => {
  const rollerSrc = readFileSync(resolve(__dirname, '../components/DiceRoller.jsx'), 'utf8');
  assert.ok(rollerSrc.includes('setupGlobalDiceClickListener'), 'DiceRoller imports and activates setupGlobalDiceClickListener');
  assert.ok(rollerSrc.includes('rawFormula ? parseFormula(rawFormula)'), 'performRoll supports rawFormula strings and objects');

  const featuresSrc = readFileSync(resolve(__dirname, '../src/sheet/FhFeatures.jsx'), 'utf8');
  assert.ok(/DiceText|RichText/.test(featuresSrc), 'FhFeatures wraps feature text in DiceText');

  const tabsSrc = readFileSync(resolve(__dirname, '../components/SheetTabs.jsx'), 'utf8');
  assert.ok(/DiceText|RichText/.test(tabsSrc), 'SheetTabs wraps spell and item descriptions in DiceText');

  const cssSrc = readFileSync(resolve(__dirname, '../src/dice/dice-styles.css'), 'utf8');
  assert.ok(cssSrc.includes('.fh-dice-inline-token'), 'dice-styles.css contains .fh-dice-inline-token styling');
  assert.ok(cssSrc.includes('.dice-attack-swords-banner'), 'dice-styles.css contains .dice-attack-swords-banner HUD banner');
  assert.ok(cssSrc.includes('.fh-dice-inline-token.is-attack'), 'dice-styles.css contains token attack variant');
  assert.ok(cssSrc.includes('.fh-dice-inline-token.is-save'), 'dice-styles.css contains token save variant');
  assert.ok(cssSrc.includes('.fh-dice-inline-token.is-check'), 'dice-styles.css contains token check variant');
});

test('dice-text: ATTACK_ROLL_REGEX matches attack bonuses in 2014 and 2024 notation', () => {
  const cases = [
    { text: 'Melee Weapon Attack: +5 to hit', expectedFormula: '1d20+5' },
    { text: 'Melee Attack Roll: +7, reach 5 ft.', expectedFormula: '1d20+7' },
    { text: 'Ranged Attack Roll: +9, range 120 ft.', expectedFormula: '1d20+9' },
    { text: '+8 with spell attacks', expectedFormula: '1d20+8' },
    { text: 'Ataque Corpo a Corpo: +6', expectedFormula: '1d20+6' },
  ];

  for (const { text, expectedFormula } of cases) {
    const parts = parseTextWithDice(text);
    const atk = parts.find(p => p.type === 'attack');
    assert.ok(atk, `Expected attack token for "${text}"`);
    assert.equal(atk.formula, expectedFormula);
  }
});

test('dice-text: SAVE_DC_REGEX and CHECK_DC_REGEX recognize DC checks and saving throws', () => {
  const saveText = 'Each creature must make a DC 14 Dexterity save or take 21 (6d6) fire damage.';
  const parts = parseTextWithDice(saveText);
  const saveTok = parts.find(p => p.type === 'save');
  const dieTok = parts.find(p => p.type === 'die');
  assert.ok(saveTok, 'Expected save token');
  assert.equal(saveTok.dc, 14);
  assert.equal(saveTok.formula, '1d20');
  assert.ok(dieTok, 'Expected 6d6 die token');
  assert.equal(dieTok.formula, '6d6');

  const checkText = 'DC 12 Wisdom (Perception) check to notice hidden traps.';
  const checkParts = parseTextWithDice(checkText);
  const checkTok = checkParts.find(p => p.type === 'check');
  assert.ok(checkTok, 'Expected check token');
  assert.equal(checkTok.dc, 12);
});
