/* Tela inicial (lista de heróis): funções puras de busca, ordem, PV e retrato.
 * Sem React, para os testes (tests/home.test.js) e para o CharacterList. */
import { t, tName } from '../../data/i18n.js';
import Utils from '../../utils.js';
import { classArt, speciesArt } from '../art.js';

export const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

/** Minúsculas e sem acento ("Campeão" → "campeao"), para comparar buscas. */
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Nome traduzido da subclasse, ou '' quando não há tradução (id cru tipo "pathOfX"). */
export function subclassName(c, lang) {
  if (!c?.subclass) return '';
  const n = tName('subclass', c.subclass, lang);
  return n && n !== c.subclass ? n : '';
}

/** Texto em que a busca procura: o de hoje (nome, espécie, classe, id da subclasse,
 * "Nível N", tendência) + subclasse traduzida e rótulo da multiclasse. */
export function searchText(c, lang) {
  return fold([
    c.name,
    c.race ? tName('race', c.race, lang) : '',
    c.className ? tName('class', c.className, lang) : '',
    c.className && Utils.isMulticlass(c) ? Utils.classLabel(c, lang, tName) : '',
    c.subclass,
    subclassName(c, lang),
    `${t('level', lang)} ${c.level || 1}`,
    c.alignment ? tName('alignment', c.alignment, lang) : '',
  ].join(' '));
}

/** Filtro da busca: "trecho contido", sem diferenciar maiúsculas nem acentos. */
export function filterCharacters(characters, query, lang) {
  const q = fold(query).trim();
  if (!q) return characters;
  return characters.filter(c => searchText(c, lang).includes(q));
}

const stamp = (v) => {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : new Date(v).getTime();
  return Number.isFinite(n) ? n : 0;
};

/** "Recentes": updatedAt decrescente (número local ou texto ISO do servidor).
 * Empate (ou sem data) fica na ordem do armazenamento, como hoje. */
export function sortRecent(characters) {
  return characters
    .map((c, i) => ({ c, i, s: stamp(c.updatedAt) }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map(x => x.c);
}

/** Estado do PV (limites do plano da ficha): ok > 50%, warn > 25%, crit > 0, down = 0.
 * Sem currentHp conta como cheio. Sem maxHp → null. */
export function hpState(currentHp, maxHp) {
  const max = Number(maxHp) || 0;
  if (max <= 0) return null;
  const cur = currentHp == null || currentHp === '' ? max : Number(currentHp) || 0;
  if (cur <= 0) return 'down';
  const pct = cur / max;
  if (pct > 0.5) return 'ok';
  if (pct > 0.25) return 'warn';
  return 'crit';
}

export const HP_STATE_LABEL = {
  ok: ['Firme', 'Steady'],
  warn: ['Ferido', 'Wounded'],
  crit: ['Muito ferido', 'Badly hurt'],
  down: ['Caído', 'Down'],
};
export const hpStateLabel = (state, lang) => (HP_STATE_LABEL[state] ? HP_STATE_LABEL[state][lang === 'pt' ? 0 : 1] : '');

/** Retrato: foto do jogador; senão espécie; senão classe (cópia de portraitOf do
 * criador, para não puxar o chunk dele). */
export function portraitOf(char) {
  return char?.avatar || speciesArt(char?.race) || classArt(char?.className) || null;
}

/** "Guerreiro (Campeão)", "Guerreiro 3 / Mago 2" ou "—"; + " · Espécie". */
export function heroLine(c, lang) {
  let cls = '—';
  if (c.className) {
    if (Utils.isMulticlass(c)) cls = Utils.classLabel(c, lang, tName);
    else {
      const sub = subclassName(c, lang);
      cls = tName('class', c.className, lang) + (sub ? ` (${sub})` : '');
    }
  }
  return cls + (c.race ? ' · ' + tName('race', c.race, lang) : '');
}

/** Lê uma preferência booleana salva ('1'/'0'); sem valor → fallback. */
export function readFlag(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : v === '1'; } catch { return fallback; }
}
export function writeFlag(key, on) {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch { /* ok */ }
}
