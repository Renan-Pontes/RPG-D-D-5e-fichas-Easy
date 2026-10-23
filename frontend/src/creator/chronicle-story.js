/*
 * A crônica vira história: leva o texto da crônica (chronicle.js) para o campo
 * "história livre" (char.backstory) sem apagar o que o jogador já escreveu.
 * Aceita a crônica como texto ou como as frases de chronicleLines.
 * Funções puras (testadas em tests/creator-chronicle-story.test.js).
 */

const clean = (s) => String(s || '').trim();
const asLines = (c) => (Array.isArray(c) ? c : [c]).map(clean).filter(Boolean);

/** A história já contém a crônica inteira? (ignora espaços nas pontas) */
export const hasChronicle = (backstory, chronicle) => {
  const lines = asLines(chronicle);
  return lines.length > 0 && String(backstory || '').includes(lines.join(' '));
};

/**
 * História com a crônica ACRESCENTADA no fim: se já houver texto, junta com uma
 * linha em branco; se a crônica já estiver lá (ou estiver vazia), não muda nada.
 * Se só o começo da crônica já estiver lá (ex.: o nome foi escrito depois e a
 * crônica ganhou "Assim nasceu…"), acrescenta só as frases que faltam.
 */
export function withChronicle(backstory, chronicle) {
  const lines = asLines(chronicle);
  const cur = String(backstory || '');
  if (!lines.length || hasChronicle(cur, lines)) return cur;
  let k = lines.length - 1;
  while (k > 0 && !cur.includes(lines.slice(0, k).join(' '))) k--;
  const rest = lines.slice(k).join(' ');
  const base = cur.replace(/\s+$/, '');
  if (!base) return rest;
  // A parte que já estava fecha o texto: continua no mesmo parágrafo.
  return k > 0 && base.endsWith(lines.slice(0, k).join(' ')) ? `${base} ${rest}` : `${base}\n\n${rest}`;
}

/** Prévia curta (corta numa palavra e põe "…"). */
export function chroniclePreview(text, max = 220) {
  const t = clean(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:]+$/, '')}…`;
}
