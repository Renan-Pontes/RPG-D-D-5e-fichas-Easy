// Gera data/srd2024-spells-core.json: as magias do SRD 5.2.1 sem o texto integral, só com
// um resumo (primeira frase, até 160 caracteres) em EN e PT. É o que entra no carregamento
// inicial; o texto completo continua vindo sob demanda em src/sheet/spell-text.js.
// Rodar depois de atualizar srd2024-spells.json ou srd2024-spells-pt.json:
//   node scripts/slim-spells.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../data/', import.meta.url);

export const summary = (t) => {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  const first = (s.match(/^.+?[.!?](?=\s|$)/) || [s])[0];
  return first.length <= 160 ? first : `${first.slice(0, 157).replace(/\s+\S*$/, '')}…`;
};
export function buildSlimSpells() {
  const en = JSON.parse(readFileSync(new URL('srd2024-spells.json', dir), 'utf8'));
  const pt = JSON.parse(readFileSync(new URL('srd2024-spells-pt.json', dir), 'utf8'));
  const core = en.map(({ desc, ...rest }) => ({ ...rest, desc: { en: summary(desc?.en) } }));
  const ptCore = Object.fromEntries(Object.entries(pt).map(([id, p]) => [id, { ...p, desc: summary(p.desc) }]));
  return { core, ptCore };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[/\\]/).pop())) {
  const { core, ptCore } = buildSlimSpells();
  writeFileSync(new URL('srd2024-spells-core.json', dir), JSON.stringify(core));
  writeFileSync(new URL('srd2024-spells-pt-core.json', dir), JSON.stringify(ptCore));
  console.log('core', JSON.stringify(core).length, 'pt', JSON.stringify(ptCore).length);
}
