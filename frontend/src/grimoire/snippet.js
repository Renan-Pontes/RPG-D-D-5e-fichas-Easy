/* Trecho e destaque dos resultados do Grimório: funções puras (testadas em
 * tests/grimoire.test.js). O trecho mostra ONDE o termo buscado aparece, e o
 * destaque marca todos os termos com 2+ letras, sem ligar para acento/maiúsculas. */
import { normalize } from './search.js';

const MAX = 110;

// Mesmo plural simples da busca ("vantagens" ~ "vantagem", "attacks" ~ "attack").
const stem = (w) => (w.length > 4
  ? w.replace(/(oes|aes)$/, 'ao').replace(/ns$/, 'm').replace(/([^s])s$/, '$1')
  : w);

/* Versão "dobrada" do texto (sem acento, minúscula), letra a letra, com o mapa
 * de volta para a posição no texto original. */
function fold(text) {
  let out = '';
  const map = [];
  for (let i = 0; i < text.length; i++) {
    const f = text[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const ch of f) { out += ch; map.push(i); }
  }
  return { out, map };
}

// Palavras de ligação não ganham destaque numa busca com outras palavras ("bola de fogo").
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'com', 'por', 'para', 'ao', 'as', 'os',
  'the', 'of', 'an', 'in', 'on', 'to', 'and', 'or', 'at', 'by', 'for', 'with']);

/* Termos da busca: as palavras com 2+ letras e, quando o plural muda a palavra,
 * também a forma no singular. Os mais longos primeiro. */
export function queryTerms(query) {
  const all = normalize(query).split(' ').filter((w) => w.length >= 2);
  const useful = all.filter((w) => !STOP.has(w));
  const set = new Set();
  for (const w of (useful.length ? useful : all)) {
    set.add(w);
    const s = stem(w);
    if (s.length >= 2) set.add(s);
  }
  return [...set].sort((a, b) => b.length - a.length);
}

const isWord = (c) => !!c && /[a-z0-9]/.test(c);

/* Faixas [início, fim) no texto original onde algum termo começa uma palavra. */
export function markRanges(text, query) {
  const plain = String(text || '');
  const terms = queryTerms(query);
  if (!terms.length || !plain) return [];
  const { out, map } = fold(plain);
  const hits = [];
  for (const t of terms) {
    let from = 0;
    for (;;) {
      const i = out.indexOf(t, from);
      if (i < 0) break;
      if (!isWord(out[i - 1])) hits.push([i, i + t.length]);
      from = i + 1;
    }
  }
  if (!hits.length) return [];
  hits.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged = [];
  for (const h of hits) {
    const last = merged[merged.length - 1];
    if (last && h[0] <= last[1]) last[1] = Math.max(last[1], h[1]);
    else merged.push([...h]);
  }
  // Volta às posições do texto original (o fim aponta para depois da última letra).
  return merged.map(([s, e]) => [map[s], map[e - 1] + 1]);
}

const sentences = (s) => String(s || '').replace(/\*\*/g, '').split(/(?<=[.!?])\s+/).filter(Boolean);

function cut(sentence, at) {
  if (sentence.length <= MAX) return sentence;
  if (at == null || at < 60) return `${sentence.slice(0, MAX - 3).trimEnd()}…`;
  // Abre a janela um pouco antes do termo, no começo de uma palavra.
  let start = Math.max(0, at - 36);
  const sp = sentence.lastIndexOf(' ', start);
  start = sp > 0 && start - sp < 16 ? sp + 1 : start;
  let body = sentence.slice(start, start + MAX - 2);
  const tail = start + body.length < sentence.length;
  if (tail) body = `${body.trimEnd()}…`;
  return `…${body}`;
}

/* Trecho de um artigo para a lista: a 1ª frase da explicação (ou do exemplo)
 * que contém algum termo da busca, cortada em até 110 caracteres em volta dele.
 * Sem busca (ou sem achar), a 1ª frase da explicação, como antes. */
export function snippetFor(article, query, lang = 'pt') {
  const terms = queryTerms(query);
  if (terms.length) {
    // A frase com mais termos diferentes ganha; no empate, a que vem antes.
    let best = null;
    for (const field of [article?.simple?.[lang], article?.example?.[lang]]) {
      for (const s of sentences(field)) {
        const r = markRanges(s, query);
        if (!r.length) continue;
        const seen = new Set(r.map(([a, b]) => normalize(s.slice(a, b))));
        if (!best || seen.size > best.n) best = { s, at: r[0][0], n: seen.size };
      }
    }
    if (best) return cut(best.s, best.at);
  }
  return cut(sentences(article?.simple?.[lang])[0] || '', null);
}
