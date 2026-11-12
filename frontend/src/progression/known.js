/**
 * Fonte única do "já tem" para TODOS os seletores de magia e perícia da ficha:
 * criação (truques/magias), subida de nível, aba Magias (adicionar e grimório),
 * talentos (Iniciado em Magia…), espécie (truque da linhagem) e opções de classe.
 *
 * Uma magia conta como conhecida se vier de qualquer lugar: lista da ficha
 * (inclui as automáticas), talentos, espécie ou opção de classe. Os seletores
 * escondem as conhecidas, menos as marcadas no próprio seletor (`keep`), para
 * que continuem desmarcáveis. Assim a mesma magia nunca é escolhida duas vezes.
 */
import Utils from '../../utils.js';
import { featGrants } from './feat-rules.js';
import { speciesGrants } from './species.js';

const list = (v) => (Array.isArray(v) ? v : v != null && v !== '' ? [v] : []);
const idOf = (s) => (typeof s === 'string' ? s : s?.id);

/** Ids de magias (truques incluídos) que a ficha já tem, de qualquer fonte. */
export function knownSpellIds(char) {
  const out = new Set();
  for (const s of char?.spells || []) { const id = idOf(s); if (id) out.add(id); }
  try { const f = featGrants(char); [...f.cantrips, ...f.spells].forEach(id => out.add(id)); } catch { /* ficha parcial */ }
  try { const g = speciesGrants(char); [...g.cantrips, ...g.spells].forEach(id => out.add(id)); } catch { /* idem */ }
  list(char?.speciesChoices?.cantrip).forEach(id => out.add(id));
  // Opções de classe que são magias (ex.: truques do Pacto do Tomo, magias de opções dinâmicas).
  let catalog = [];
  try { catalog = Utils.spellCatalog(char) || []; } catch { catalog = []; }
  const ids = new Set(catalog.map(s => s.id));
  for (const p of Array.isArray(char?.classOptions) ? char.classOptions : []) {
    if (p?.id && ids.has(p.id)) out.add(p.id);
    for (const d of list(p?.detail)) if (ids.has(d)) out.add(d);
  }
  return out;
}

/**
 * Filtra uma lista de magias (objetos com `id` ou ids) tirando as já conhecidas.
 * `keep`: ids marcados neste seletor agora (ficam visíveis para desmarcar).
 */
export function unknownSpells(char, spells, keep = []) {
  const known = knownSpellIds(char);
  const kept = new Set(list(keep));
  return (spells || []).filter(s => { const id = idOf(s); return kept.has(id) || !known.has(id); });
}

/** A perícia é nova para a ficha (não tem proficiência por nenhum caminho)? */
export function isNewSkill(char, id, keep = []) {
  if (list(keep).includes(id)) return true;
  try { return !Utils.hasSkillProf(char, id); } catch { return !(char?.skillProfs || []).includes(id); }
}
