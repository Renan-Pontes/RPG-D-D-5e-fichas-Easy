/* Liga termos em **negrito** dos textos do Grimório aos artigos deles
 * ("desvantagem" → Vantagem e desvantagem). Funções puras (tests/grimoire.test.js). */
import { normalize } from './search.js';

// Variantes simples de um termo (singular/plural, sem artigo).
const variants = (s) => {
  const n = normalize(s).replace(/^(o|a|os|as|um|uma|the|a|an) /, '');
  if (!n) return [];
  const out = new Set([n]);
  if (n.endsWith('s') && n.length > 4) out.add(n.slice(0, -1));
  if (n.endsWith('oes')) out.add(`${n.slice(0, -3)}ao`);
  if (n.endsWith('ns')) out.add(`${n.slice(0, -2)}m`);
  return [...out];
};

/** Map(termo normalizado → id do artigo) no idioma da tela. */
export function buildTermMap(articles, lang = 'pt') {
  const map = new Map();
  const put = (term, id) => { for (const v of variants(term)) if (v.length >= 3 && !map.has(v)) map.set(v, id); };
  // 1º títulos completos (mais confiáveis), depois partes de título e aliases.
  for (const a of articles) put(a.title?.[lang], a.id);
  for (const a of articles) {
    const title = String(a.title?.[lang] || '');
    for (const part of title.split(/\s*(?::|\/|\(|\)|,| e | and | ou | or | × )\s*/)) put(part, a.id);
    for (const al of a.aliases || []) put(al.replace(/-/g, ' '), a.id);
  }
  return map;
}

/** Id do artigo para um termo em negrito, ou null (nunca o próprio artigo). */
export function termTarget(map, term, selfId) {
  for (const v of variants(term)) {
    const id = map.get(v);
    if (id && id !== selfId) return id;
  }
  return null;
}
