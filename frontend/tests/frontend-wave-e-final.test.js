import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseDiceAst, evalDiceAst, formatAstBreakdown } from '../src/dice/dice-ast.js';
import { parseSlashQuery } from '../src/shell/quick-actions.js';
import { validateHomebrewBundle, exportHomebrewBundle, parseHomebrewBundleJson, mergeHomebrewItems } from '../src/homebrew/bundle-io.js';
import { buildRestSummary } from '../src/sheet/rest-summary.js';
import { fitSize, supportsWebp } from '../src/world/image.js';
import { getSoundPref, setSoundPref } from '../src/dice/dice-prefs.js';
import { getTableTheme, setTableTheme } from '../src/utils/table-theme.js';

const VECTORS = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'data', 'dice-ast-vectors.json'), 'utf8'));

test('NANO-023: parseDiceAst + evalDiceAst pass all 20 deterministic vectors', () => {
  assert.equal(VECTORS.length, 20);
  for (const v of VECTORS) {
    const parsed = parseDiceAst(v.expr);
    assert.equal(parsed.ok, true, `Failed parsing ${v.expr}: ${parsed.error}`);
    let i = 0;
    const res = evalDiceAst(parsed.ast, { rng: () => v.rolls[i++], crit: !!v.crit });
    assert.equal(res.total, v.expectedTotal, `Vector ${v.expr} expected ${v.expectedTotal}, got ${res.total}`);
    assert.ok(formatAstBreakdown(res).length > 0);
  }
  assert.equal(parseDiceAst('').ok, false);
  assert.equal(parseDiceAst('2d6+*3').ok, false);
});

test('NANO-059: parseSlashQuery handles /r, /cond, /cast and root hints', () => {
  const hints = parseSlashQuery('/', { lang: 'en' });
  assert.equal(hints.length, 3);

  const rollItems = parseSlashQuery('/r 2d6+3', { lang: 'en', dispatch: {} });
  assert.equal(rollItems.length, 1);
  const out = rollItems[0].run();
  assert.ok(out.total >= 5 && out.total <= 15);

  const patches = [];
  const fakeChar = { name: 'Lyra', conditions: ['poisoned'], spells: [{ id: 'fireball', name: 'Fireball' }] };
  const condItems = parseSlashQuery('/cond pois', {
    lang: 'en',
    activeChar: fakeChar,
    dispatch: { updateChar: (p) => patches.push(p) },
  });
  assert.equal(condItems.length, 1);
  condItems[0].run();
  assert.deepEqual(patches[0], { conditions: [] });

  let rolledSpell = null;
  const castItems = parseSlashQuery('/cast fire', {
    lang: 'en',
    activeChar: fakeChar,
    dispatch: { diceRoll: (r) => { rolledSpell = r; } },
  });
  assert.equal(castItems.length, 1);
  castItems[0].run();
  assert.equal(rolledSpell.label, 'Fireball');
});

test('NANO-071: Homebrew bundle validation, export/import & merge reject unsafe keys', () => {
  const json = exportHomebrewBundle({
    name: 'Test Pack',
    author: 'DM',
    rulesVersion: '2024',
    monsters: [{ id: 'm1', name: 'Ash Drake', source: 'HB' }],
    spells: [{ id: 's1', name: 'Spark' }],
    items: [{ id: 'i1', name: 'Iron Flask' }],
  });
  const parsed = parseHomebrewBundleJson(json);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.bundle.monsters.length, 1);
  assert.equal(parsed.bundle.monsters[0].homebrew, true);

  const bad = validateHomebrewBundle(JSON.parse('{"format":"forja-homebrew-bundle","version":1,"monsters":[{"id":"x","name":"X","__proto__":{"evil":1}}]}'));
  assert.equal(bad.ok, false);

  const merged = mergeHomebrewItems([{ id: 'm1', name: 'Old' }], [{ id: 'm1', name: 'New' }, { id: 'm2', name: 'Two' }]);
  assert.equal(merged.added, 1);
  assert.equal(merged.updated, 1);
  assert.equal(merged.merged.length, 2);
});

test('UX P3/P8/P11/P13: Rest summary, image helpers, sound & table theme prefs work cleanly', () => {
  const char2024 = {
    rulesVersion: '2024',
    level: 5,
    className: 'warlock',
    maxHp: 38,
    currentHp: 21,
    hitDiceUsed: 2,
    spellSlotsUsed: [0, 0, 2, 0, 0, 0, 0, 0, 0],
    resourcesUsed: {},
    freeCastsShort: { detectMagic: 1 },
  };
  const longSum = buildRestSummary(char2024, 'long', 'en');
  assert.equal(longSum.hpHeal, 17);
  assert.equal(longSum.hitDiceRestored, 2);
  assert.equal(longSum.slotsRestored, 2);
  assert.ok(longSum.lines.length >= 3);

  const shortSum = buildRestSummary(char2024, 'short', 'en');
  assert.equal(shortSum.hpHeal, 0);
  assert.equal(shortSum.slotsRestored, 2);

  assert.deepEqual(fitSize(4000, 2000, 2000), { w: 2000, h: 1000 });
  assert.equal(typeof supportsWebp(), 'boolean');
  assert.equal(setSoundPref(false), undefined);
  assert.equal(getSoundPref(), true); // no localStorage in node -> default true
  assert.equal(setTableTheme(true), true);
  assert.equal(getTableTheme(), false); // no localStorage in node
});
