/*
 * A crônica vira história: leva o texto da crônica (chronicle.js) para o campo
 * "história livre" (char.backstory) sem apagar o que o jogador já escreveu.
 * Funções puras (testadas em tests/creator-chronicle-story.test.js).
 */

const clean = (s) => String(s || '').trim();

/** A história já contém este texto da crônica? (ignora espaços nas pontas) */
export const hasChronicle = (backstory, chronicle) => {
  const c = clean(chronicle);
  return !!c && String(backstory || '').includes(c);
};

/**
 * História com a crônica ACRESCENTADA no fim: se já houver texto, junta com uma
 * linha em branco; se a crônica já estiver lá (ou estiver vazia), não muda nada.
 */
export function withChronicle(backstory, chronicle) {
  const cur = String(backstory || '');
  const c = clean(chronicle);
  if (!c || hasChronicle(cur, c)) return cur;
  const base = cur.replace(/\s+$/, '');
  return base ? `${base}\n\n${c}` : c;
}

/** Prévia curta (corta numa palavra e põe "…"). */
export function chroniclePreview(text, max = 220) {
  const t = clean(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:]+$/, '')}…`;
}
