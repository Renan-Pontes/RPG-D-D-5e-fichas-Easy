// Tabela leve de nomes da Tela (V9): espécie e classe em pt/en para a linha do
// personagem ("Elfo da Floresta · Druida 2"), sem a TV baixar o SRD e a
// progressão inteiros (data/i18n.js puxa os catálogos). Gerada a partir do
// tName; o teste tests/tv-logic.test.js confere que ela não ficou velha.
//   node scripts/tv-names.mjs
import { writeFileSync } from 'node:fs';
import { nameIds, tName } from '../frontend/data/i18n.js';

const table = Object.fromEntries(['race', 'class'].map(kind => [kind, Object.fromEntries(
  nameIds(kind).sort().map(id => [id, [tName(kind, id, 'pt'), tName(kind, id, 'en')]]),
)]));
const out = new URL('../frontend/src/screen/tv-names.json', import.meta.url);
writeFileSync(out, JSON.stringify(table) + '\n');
console.log(`tv-names.json: ${Object.keys(table.race).length} espécies, ${Object.keys(table.class).length} classes`);
