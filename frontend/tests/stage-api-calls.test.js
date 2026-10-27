// V3 · Um 📺 só: nenhuma chamada ao `screen-card` (o cartão antigo da Tela)
// fora de src/stage/stage-api.js. Os 9 lugares de "mostrar" passam pelo palco.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export function codeFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...codeFiles(p));
    else if (/\.(js|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

/** O código sem os comentários (o texto de um comentário pode falar do que quiser). */
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

test('screen-card só em src/stage/stage-api.js', () => {
  const files = [...codeFiles(join(ROOT, 'src')), ...codeFiles(join(ROOT, 'components')),
    join(ROOT, 'app.jsx'), join(ROOT, 'main.jsx')];
  const hits = files
    .filter(f => !f.endsWith(join('stage', 'stage-api.js')))
    .filter(f => /\/screen-card/.test(stripComments(readFileSync(f, 'utf8'))))
    .map(f => relative(ROOT, f));
  assert.deepEqual(hits, []);
  assert.match(readFileSync(join(ROOT, 'src/stage/stage-api.js'), 'utf8'), /\/screen-card/);
});
