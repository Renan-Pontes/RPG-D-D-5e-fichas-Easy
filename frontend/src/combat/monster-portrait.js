/* Retrato de monstro para tokens e telão. O mestre tem o monster_id; jogador e
 * telão só recebem o nome, então o retrato vem do nome do bestiário ("Goblin #2"
 * → "Goblin"). Se o mestre renomear o monstro ("Vulto encapuzado"), não aparece
 * retrato nenhum — o disfarce continua valendo. */
import { monsterArt } from '../art.js';

/** "Goblin #2" → "goblin". */
export const baseName = (name) => String(name || '').replace(/\s*#\d+\s*$/, '').trim().toLowerCase();

/** Monta nome (pt/en, minúsculo) → caminho do retrato, só para monstros com arte. */
export function buildNameIndex(bestiary) {
  const index = new Map();
  for (const m of bestiary || []) {
    const src = monsterArt(m.id);
    if (!src) continue;
    for (const n of [m.name?.pt, m.name?.en, typeof m.name === 'string' ? m.name : null]) {
      const key = n && String(n).trim().toLowerCase();
      if (key && !index.has(key)) index.set(key, src);
    }
  }
  return index;
}

let indexPromise = null;
/** Carrega o bestiário sob demanda (fica em outro pedaço do bundle) e indexa. */
export function loadNameIndex() {
  if (!indexPromise) {
    indexPromise = import('../../data/bestiary.js')
      .then((m) => buildNameIndex(m.BESTIARY))
      .catch(() => { indexPromise = null; return new Map(); });
  }
  return indexPromise;
}

/** Retrato do combatente (null para PCs ou sem arte). `index` vem de loadNameIndex(). */
export function portraitFor(c, index) {
  if (!c || c.type === 'pc') return null;
  return monsterArt(c.monster_id) || index?.get(baseName(c.name)) || null;
}

/** Algum monstro precisa do índice por nome (sem monster_id e sem imagem própria)? */
export const needsNameIndex = (combatants) => (combatants || [])
  .some((c) => c && c.type !== 'pc' && !c.sprite && !monsterArt(c.monster_id));
