/* Busca do Grimório: client-side, tolerante a acento/maiúsculas, com ranking
 * título > palavra-chave > texto. Funções puras (testadas em tests/grimoire.test.js). */

export const normalize = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Plural simples (pt/en): "poções" ~ "poção", "vantagens" ~ "vantagem", "attacks" ~ "attack".
const stem = (w) => (w.length > 4
  ? w.replace(/(oes|aes)$/, 'ao').replace(/ns$/, 'm').replace(/([^s])s$/, '$1')
  : w);

const words = (s) => normalize(s).split(' ').filter(Boolean).map(stem);

const other = (lang) => (lang === 'pt' ? 'en' : 'pt');

/* Pré-processa os artigos para o idioma atual. O outro idioma também entra
 * (com peso menor) para quem busca "grapple" com a interface em PT. */
export function buildIndex(articles, lang = 'pt') {
  const o = other(lang);
  return articles.map((a) => {
    const titleMain = words(a.title?.[lang]);
    const titleAlt = words(a.title?.[o]);
    const keys = words([a.keywords, a.id.replace(/-/g, ' '), ...(a.aliases || []).map((x) => x.replace(/-/g, ' '))].join(' '));
    const text = normalize([a.simple?.[lang], a.example?.[lang], a.sheet?.[lang], a.versions?.[lang]].join(' '));
    const textAlt = normalize([a.simple?.[o], a.example?.[o]].join(' '));
    return {
      a,
      titleMain, titleAlt, keys,
      titleStr: titleMain.join(' '),
      titleAltStr: titleAlt.join(' '),
      text: ` ${text} `,
      textAlt: ` ${textAlt} `,
    };
  });
}

const hitWords = (list, tok) => {
  let best = 0;
  for (const w of list) {
    if (w === tok) return 3;
    if (w.startsWith(tok)) best = Math.max(best, 2);
    else if (tok.length >= 4 && w.includes(tok)) best = Math.max(best, 1);
  }
  return best;
};

function scoreEntry(e, tokens, phrase) {
  let total = 0;
  for (const raw of tokens) {
    const tok = stem(raw);
    let s = 0;
    const t1 = hitWords(e.titleMain, tok);
    if (t1) s = Math.max(s, 60 + t1 * 10);
    const k = hitWords(e.keys, tok);
    if (k) s = Math.max(s, 25 + k * 5);
    const t2 = hitWords(e.titleAlt, tok);
    if (t2) s = Math.max(s, 45 + t2 * 5);
    if (!s) {
      if (e.text.includes(` ${tok}`)) s = 8;
      else if (tok.length >= 3 && e.text.includes(tok)) s = 5;
      else if (e.textAlt.includes(` ${tok}`)) s = 3;
    }
    if (!s) return 0; // todas as palavras precisam aparecer em algum lugar
    total += s;
  }
  if (e.titleStr === phrase) total += 200;
  else if (e.titleStr.startsWith(phrase)) total += 80;
  else if (phrase.includes(' ') && e.titleStr.includes(phrase)) total += 40;
  if (e.titleAltStr === phrase) total += 60;
  return total;
}

/* Retorna os artigos ordenados. Sem busca: ordem natural (por categoria). */
export function search(index, query, { cat = null } = {}) {
  const pool = cat ? index.filter((e) => e.a.cat === cat) : index;
  const phrase = normalize(query);
  if (!phrase) return pool.map((e) => e.a);
  const tokens = phrase.split(' ');
  return pool
    .map((e) => ({ e, s: scoreEntry(e, tokens, phrase) }))
    .filter((r) => r.s > 0)
    .sort((x, y) => y.s - x.s || x.e.titleStr.localeCompare(y.e.titleStr))
    .map((r) => r.e.a);
}

/* Acha um artigo por id ou alias (sem acento/maiúsculas). */
export function findArticle(articles, slug) {
  if (!slug) return null;
  const key = normalize(decodeURIComponent(String(slug))).replace(/ /g, '-');
  return articles.find((a) => a.id === key)
    || articles.find((a) => (a.aliases || []).some((al) => normalize(al).replace(/ /g, '-') === key))
    || null;
}

/* "#grimorio", "#grimorio/agarrado", "#grimoire/grappled", "#grimorio?q=vantagem" */
export function parseGrimoireHash(hash) {
  const m = /^#(?:grimorio|grimoire)(?:\/([^?]*))?(?:\?q=(.*))?$/i.exec(hash || '');
  if (!m) return null;
  return { id: m[1] ? decodeURIComponent(m[1]) : null, q: m[2] ? decodeURIComponent(m[2]) : '' };
}

export const grimoireHash = (id) => `#grimorio${id ? `/${id}` : ''}`;
