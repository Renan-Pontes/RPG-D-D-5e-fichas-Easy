/**
 * Grimório do Mago (2014 e 2024).
 *
 * Modelo: as magias do grimório ficam em `character.spells` com `inBook: true`
 * e `prepared` indicando se estão preparadas hoje. Truques não vão no livro.
 * Fichas antigas de mago (nenhuma entrada com a chave `inBook`) tratam todas
 * as magias de nível 1+ não automáticas do mago como no grimório; a primeira
 * gravação normaliza (normalizeSpellbook).
 *
 * Regras: 6 magias de Mago de nível 1 no nível 1; +2 a cada nível de Mago, de
 * círculo que ele possa conjurar; cópias de magias achadas custam 2 h e 50 PO
 * por círculo (só informativo). Preparadas saem do grimório.
 */
import Utils from '../../utils.js';

export const SPELLBOOK_CLASS = 'wizard';

const idOf = (s) => (typeof s === 'string' ? s : s?.id);
const asEntry = (s) => (typeof s === 'string' ? { id: s, prepared: false } : s);
const ownerOf = (char, s) => (s && typeof s === 'object' && s.cls) || char?.className;
const levelOf = (char, id) => Utils.spellCatalog(char).find(x => x.id === id)?.level;

/** A ficha (ou a visão da classe) usa grimório? */
export const usesSpellbook = (char) => char?.className === SPELLBOOK_CLASS;

/** A ficha tem o mago como alguma das classes (multiclasse incluída)? */
export const hasWizardClass = (char) => usesSpellbook(char) || Utils.classEntries(char).some(e => e.id === SPELLBOOK_CLASS);

/** Alguma entrada do mago já traz a chave `inBook` (ficha no formato novo)? */
export function hasBookFlags(char) {
  return (char?.spells || []).some(s => s && typeof s === 'object' && 'inBook' in s && ownerOf(char, s) === SPELLBOOK_CLASS);
}

/** A entrada está no grimório? (retrocompatível com fichas sem `inBook`). */
export function isInBook(char, s) {
  const e = asEntry(s);
  if (!e || ownerOf(char, e) !== SPELLBOOK_CLASS || !((levelOf(char, e.id) || 0) > 0)) return false;
  if (hasBookFlags(char)) return e.inBook === true;
  return !e.auto;
}

/** Preparada hoje? Magias automáticas estão sempre preparadas. */
export const isPreparedEntry = (s) => !!s && typeof s === 'object' && (s.auto || s.prepared !== false);

/** Ids das magias do grimório do mago. */
export const spellbookIds = (char) => (char?.spells || []).filter(s => isInBook(char, s)).map(idOf);

/** Tamanho esperado do grimório sem cópias: 6 + 2 × (nível de Mago − 1). */
export const spellbookSize = (wizardLevel) => (wizardLevel >= 1 ? 6 + 2 * (wizardLevel - 1) : 0);

/** Magias ganhas no grimório ao chegar a este nível de Mago. */
export const spellbookGain = (wizardLevel) => (wizardLevel === 1 ? 6 : wizardLevel > 1 ? 2 : 0);

/** Custo de copiar uma magia achada (2014 e 2024): 2 h e 50 PO por círculo. */
export const copyCost = (spellLevel) => ({ hours: 2 * spellLevel, gp: 50 * spellLevel });

/**
 * Ficha antiga → formato novo: marca `inBook: true` nas magias do mago que
 * contavam como grimório. Devolve a lista de magias (nova só se mudou).
 */
export function normalizeSpellbook(char) {
  const spells = char?.spells || [];
  if (!hasWizardClass(char) || hasBookFlags(char)) return spells;
  return spells.map(s => (isInBook(char, s) ? { ...asEntry(s), inBook: true } : s));
}

/**
 * Magias de Mago que podem entrar no grimório: nível 1..maxLevel, fora do
 * livro. `anyList` (modo trapaça) libera qualquer lista.
 */
export function spellbookCandidates(char, { maxLevel = 9, minLevel = 1, anyList = false } = {}) {
  const have = new Set(spellbookIds(char));
  return Utils.spellCatalog(char).filter(s => s.level >= minLevel && s.level <= maxLevel && !have.has(s.id)
    && (anyList || s.classes.includes(SPELLBOOK_CLASS)));
}

/** Acrescenta magias ao grimório (não preparadas). `tag` = { cls } na multiclasse. */
export function addToSpellbook(char, ids, tag = {}) {
  const spells = normalizeSpellbook(char);
  const byId = new Map(spells.map((s, i) => [idOf(s), i]));
  const next = [...spells];
  for (const id of ids) {
    const i = byId.get(id);
    if (i == null) { byId.set(id, next.length); next.push({ id, prepared: false, inBook: true, ...tag }); }
    else next[i] = { ...asEntry(next[i]), inBook: true };
  }
  return next;
}

/** Tira uma magia do grimório (e da lista de preparadas). */
export function removeFromSpellbook(char, id) {
  const spells = normalizeSpellbook(char);
  const view = { ...char, spells };
  return spells.filter(s => !(idOf(s) === id && isInBook(view, s)));
}

/** Magias do grimório preparadas agora (sem as automáticas). */
export const preparedFromBook = (char) => (char?.spells || []).filter(s => isInBook(char, s) && isPreparedEntry(s)).map(idOf);

/**
 * Marca/desmarca uma magia do grimório como preparada. Devolve a nova lista
 * ou null se passar do limite (`limit` = Infinity no modo trapaça).
 */
export function togglePreparedInBook(char, id, limit = Infinity) {
  const spells = normalizeSpellbook(char);
  const view = { ...char, spells };
  const entry = spells.find(s => idOf(s) === id);
  if (!entry || !isInBook(view, entry)) return null;
  const on = isPreparedEntry(entry);
  if (!on && preparedFromBook(view).length >= limit) return null;
  return spells.map(s => (idOf(s) === id ? { ...asEntry(s), prepared: !on } : s));
}

/**
 * Aplica o rascunho do modal "Preparar magias" ao mago: magias do livro ficam
 * no livro (só mudam `prepared`); truques da lista seguem a regra antiga
 * (entram/saem). `listIds`: ids exibidos no modal; `autoIds`: automáticas.
 */
export function applyPreparedDraft(char, draft, listIds, autoIds = new Set()) {
  const spells = normalizeSpellbook(char);
  const view = { ...char, spells };
  const want = new Set(draft);
  const out = [];
  for (const s of spells) {
    const id = idOf(s);
    if (autoIds.has(id)) { out.push(s); continue; }
    if (isInBook(view, s)) { out.push({ ...asEntry(s), prepared: want.has(id) }); continue; }
    if (listIds.has(id) && !want.has(id)) continue;
    out.push(s);
  }
  const have = new Set(out.map(idOf));
  for (const id of draft) if (!have.has(id)) out.push({ id, prepared: true });
  return out;
}
