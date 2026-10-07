/* Filtro e paginação do seletor de itens (lógica pura, testável em node). */

export const PAGE_SIZE = 60;

/** Categorias de itens mágicos do SRD 5.2.1 (data/magic-items-srd.js). */
export const MAGIC_CATEGORIES = ['armor', 'potion', 'ring', 'rod', 'scroll', 'staff', 'wand', 'weapon', 'wondrous'];
const CATEGORY_LABEL = {
  armor: ['Armadura', 'Armor'], potion: ['Poção', 'Potion'], ring: ['Anel', 'Ring'], rod: ['Bastão', 'Rod'],
  scroll: ['Pergaminho', 'Scroll'], staff: ['Cajado', 'Staff'], wand: ['Varinha', 'Wand'], weapon: ['Arma', 'Weapon'],
  wondrous: ['Item maravilhoso', 'Wondrous item'],
};
export const magicCategoryLabel = (c, lang) => (CATEGORY_LABEL[c] || [c, c])[lang === 'pt' ? 0 : 1];

const text = (v) => (typeof v === 'string' ? v : `${v?.pt || ''} ${v?.en || ''}`);
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const rarityOf = (it) => String(it?.magic?.rarity || '').replace(/-/g, ' ').toLowerCase();

/**
 * Filtra a lista (sem cortar): busca no nome pt/en (sem acentos), tipo, categoria
 * mágica e raridade ('mundane' = itens sem magia).
 */
export function filterItems(list, { query = '', type = '', category = '', rarity = '' } = {}) {
  const q = norm(query.trim());
  return (list || []).filter((it) => {
    if (!it) return false;
    if (type && it.type !== type) return false;
    if (category && it.magic?.category !== category) return false;
    if (rarity === 'mundane' ? !!it.magic : (rarity && rarityOf(it) !== rarity)) return false;
    if (q && !norm(text(it.name)).includes(q)) return false;
    return true;
  });
}
