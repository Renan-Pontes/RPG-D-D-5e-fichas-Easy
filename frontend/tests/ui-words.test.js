// Uma palavra, um sentido (especificação §1.3 e §9): as palavras que saíram do
// app não podem voltar a botões, títulos e avisos. Procura nos textos do código
// (sem os comentários). Cada fatia acrescenta as suas: V3 → "Telão" virou "Tela".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeFiles, stripComments } from './stage-api-calls.test.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GONE = [
  { word: /tel[ãa]o/i, now: 'Tela' },   // V3
  // V5: a subvista e o título "Próxima sessão" viraram "Plano" / "Plano da Sessão N" (o "até a
  // próxima sessão" da barra da mesa continua: é a próxima sessão mesmo, não o nome do plano)
  { word: /Pr[óo]xima sess[ãa]o|\bNext session\b/, now: 'Plano' },
];

test('palavras que saíram do app não voltam', () => {
  const files = [...codeFiles(join(ROOT, 'src')), ...codeFiles(join(ROOT, 'components')),
    join(ROOT, 'app.jsx'), join(ROOT, 'main.jsx')];
  const hits = [];
  for (const f of files) {
    const lines = stripComments(readFileSync(f, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      for (const g of GONE) if (g.word.test(line)) hits.push(`${relative(ROOT, f)}:${i + 1} (${g.now}) ${line.trim().slice(0, 90)}`);
    });
  }
  assert.deepEqual(hits, []);
});
