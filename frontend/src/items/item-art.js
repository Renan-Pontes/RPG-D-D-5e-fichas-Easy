/* Ilustração de um item da ficha. Itens do catálogo têm sourceId; os que vieram
 * dos pacotes da criação de personagem só têm o nome ("Flechas", "Kit de
 * Curandeiro"), então caímos num índice por nome (pt/en, sem acento e sem
 * quantidade). O catálogo já está no pedaço da ficha (seletor de itens). */
import { ITEMS } from '../../data/items.js';
import { itemArt } from '../art.js';

export const normName = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\(\s*\d+[^)]*\)/g, ' ')    // "(20)", "(50 ft)"
  .replace(/[×x]\s*\d+\s*$/g, ' ')      // "×8"
  .replace(/['’]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// Pacotes da criação (src/creator/start-data.js) → arte do pacote/mochila.
const PACK_ALIAS = {
  'pacote de aventureiro': 'explorersPack', 'explorers pack': 'explorersPack',
  'pacote de explorador de masmorras': 'dungeoneersPack', 'dungeoneers pack': 'dungeoneersPack',
  'pacote de sacerdote': 'priestPack', 'priests pack': 'priestPack',
  'pacote de erudito': 'scholarPack', 'scholars pack': 'scholarPack',
  'aljava': 'arrows20', quiver: 'arrows20', virotes: 'boltsXbow20', bolts: 'boltsXbow20',
  bolsa: 'component', pouch: 'component',
};

let index = null;
function nameIndex() {
  if (index) return index;
  index = new Map();
  for (const it of ITEMS) {
    const src = itemArt(it);
    if (!src) continue;
    for (const n of [it.name?.pt, it.name?.en]) {
      const k = normName(n);
      if (k && !index.has(k)) index.set(k, src);
    }
  }
  for (const [k, id] of Object.entries(PACK_ALIAS)) {
    const src = itemArt(id);
    if (src && !index.has(k)) index.set(k, src);
  }
  return index;
}

/** Arte do item: pelo id/sourceId/base; senão pelo nome; senão null. */
export function itemArtFor(item) {
  if (!item) return null;
  const direct = itemArt(item);
  if (direct) return direct;
  const name = typeof item === 'string' ? item : (typeof item.name === 'string' ? item.name : item.name?.pt || item.name?.en);
  const k = normName(name);
  if (!k) return null;
  const ix = nameIndex();
  return ix.get(k) || (k.startsWith('pacote de ') ? itemArt('backpack') : null);
}
