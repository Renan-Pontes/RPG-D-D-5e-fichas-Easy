import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSlimSpells, summary } from '../scripts/slim-spells.mjs';

test('srd2024-spells-core.json / -pt-core.json estão em dia com scripts/slim-spells.mjs', () => {
  const { core, ptCore } = buildSlimSpells();
  assert.deepEqual(JSON.parse(readFileSync(new URL('../data/srd2024-spells-core.json', import.meta.url), 'utf8')), core);
  assert.deepEqual(JSON.parse(readFileSync(new URL('../data/srd2024-spells-pt-core.json', import.meta.url), 'utf8')), ptCore);
});

test('resumo: primeira frase, no máximo 160 caracteres', () => {
  assert.equal(summary('A bright streak flashes. Then it explodes.'), 'A bright streak flashes.');
  assert.ok(summary('x '.repeat(200)).length <= 160);
  assert.equal(summary(''), '');
});
