/**
 * Ponte entre a Preparação e o Mundo: rótulos/ícones dos tipos de cartão,
 * arte padrão e filtros. Puro (testável em node). O dono do modelo do Mundo é o
 * WP4 (src/world/world-model.js); aqui só o mínimo que a Preparação precisa.
 */

export const WORLD_KINDS = [
  { id: 'npc',     icon: '👤', pt: 'NPC',       en: 'NPC',      ptPl: 'NPCs',       enPl: 'NPCs' },
  { id: 'place',   icon: '🏰', pt: 'Lugar',     en: 'Place',    ptPl: 'Lugares',    enPl: 'Places' },
  { id: 'faction', icon: '⚑',  pt: 'Facção',    en: 'Faction',  ptPl: 'Facções',    enPl: 'Factions' },
  { id: 'item',    icon: '✦',  pt: 'Item',      en: 'Item',     ptPl: 'Itens',      enPl: 'Items' },
  { id: 'lore',    icon: '📖', pt: 'Lore',      en: 'Lore',     ptPl: 'Lore',       enPl: 'Lore' },
  { id: 'handout', icon: '📜', pt: 'Documento', en: 'Handout',  ptPl: 'Documentos', enPl: 'Handouts' },
];
export const WORLD_KIND = Object.fromEntries(WORLD_KINDS.map(k => [k.id, k]));

export const VISIBILITY = {
  hidden:   { icon: '🔒', pt: 'Oculto',            en: 'Hidden' },
  partial:  { icon: '◐',  pt: 'Conhecido de nome', en: 'Known by name' },
  revealed: { icon: '👁', pt: 'Revelado',          en: 'Revealed' },
};

/** Arte padrão (ilustrações do próprio app) quando o cartão não tem imagem. */
const KIND_ART = {
  npc: '/art/backgrounds/guildArtisan.webp',
  place: '/art/backgrounds/wayfarer.webp',
  faction: '/art/backgrounds/knight.webp',
  item: '/art/backgrounds/artisan.webp',
  lore: '/art/backgrounds/sage.webp',
  handout: '/art/backgrounds/scribe.webp',
};
export const kindArt = (kind) => KIND_ART[kind] || '/art/hero-forge.webp';
/** Imagem do cartão (servida pela API; `base` = API_BASE em produção) ou a arte padrão do tipo. */
export function entryImage(e, base = '') {
  const own = e?.imageUrl || (e?.imageVer ? `/api/world/${e.id}/image?v=${e.imageVer}` : '');
  return own ? `${base}${own}` : kindArt(e?.kind);
}

export const kindLabel = (kind, lang, plural = false) => {
  const k = WORLD_KIND[kind];
  if (!k) return kind || '';
  return lang === 'pt' ? (plural ? k.ptPl : k.pt) : (plural ? k.enPl : k.en);
};
export const kindIcon = (kind) => WORLD_KIND[kind]?.icon || '✦';
export const visLabel = (vis, lang) => {
  const v = VISIBILITY[vis] || VISIBILITY.hidden;
  return lang === 'pt' ? v.pt : v.en;
};

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca simples (sem acento, sem caixa) por nome, frase ou tag. */
export function searchEntries(entries, query, kinds = null) {
  const q = fold(query).trim();
  return (entries || [])
    .filter(e => !kinds || kinds.includes(e.kind))
    .filter(e => !q || fold(e.name).includes(q) || fold(e.summary).includes(q) || (e.tags || []).some(tg => fold(tg).includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** Resolve ids → cartões (ignora apagados), na ordem dos ids. */
export function pickEntries(ids, entries) {
  const byId = new Map((entries || []).map(e => [e.id, e]));
  return (ids || []).map(id => byId.get(id)).filter(Boolean);
}
