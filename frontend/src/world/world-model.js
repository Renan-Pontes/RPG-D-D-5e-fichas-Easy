// Mundo da campanha — modelo puro (sem React, sem rede).
// Tipos, ícones, rótulos pt/en, arte padrão, menções @[Nome](id), backlinks,
// ordenação da linha do tempo e filtros do Atlas.

export const t = (lang, pt, en) => (lang === 'en' ? en : pt);

// ------------------------------------------------------------------ tipos
export const KINDS = ['place', 'npc', 'faction', 'item', 'lore', 'handout'];

export const KIND_META = {
  place: { icon: '🏰', pt: 'Lugar', en: 'Place', ptPl: 'Lugares', enPl: 'Places', color: '#6f9a6a',
    art: ['/art/backgrounds/wayfarer.webp', '/art/backgrounds/farTraveler.webp', '/art/backgrounds/outlander.webp', '/art/backgrounds/sailor.webp'] },
  npc: { icon: '🧑', pt: 'NPC', en: 'NPC', ptPl: 'NPCs', enPl: 'NPCs', color: '#c79a4b',
    art: ['/art/backgrounds/merchant.webp', '/art/backgrounds/noble.webp', '/art/backgrounds/hermit.webp', '/art/backgrounds/acolyte.webp', '/art/backgrounds/sage.webp', '/art/backgrounds/folkHero.webp'] },
  faction: { icon: '⚜️', pt: 'Facção', en: 'Faction', ptPl: 'Facções', enPl: 'Factions', color: '#9b5f5f',
    art: ['/art/backgrounds/knight.webp', '/art/backgrounds/spy.webp', '/art/backgrounds/soldier.webp'] },
  item: { icon: '🗝️', pt: 'Item', en: 'Item', ptPl: 'Itens', enPl: 'Items', color: '#b8862b',
    art: ['/art/backgrounds/guildArtisan.webp', '/art/backgrounds/artisan.webp'] },
  lore: { icon: '📜', pt: 'História', en: 'Lore', ptPl: 'Histórias', enPl: 'Lore', color: '#7a7fb0',
    art: ['/art/grimoire-book.webp', '/art/backgrounds/scribe.webp'] },
  handout: { icon: '✉️', pt: 'Documento', en: 'Handout', ptPl: 'Documentos', enPl: 'Handouts', color: '#a88a62',
    art: ['/art/backgrounds/scribe.webp'] },
};

export const MAP_ART = '/art/backgrounds/guide.webp';

export const kindLabel = (kind, lang, plural = false) => {
  const m = KIND_META[kind];
  if (!m) return kind || '';
  return plural ? t(lang, m.ptPl, m.enPl) : t(lang, m.pt, m.en);
};
export const kindIcon = (kind) => KIND_META[kind]?.icon || '✦';

/** Hash estável e pequeno (para escolher a arte padrão de cada cartão). */
export function smallHash(s) {
  let h = 2166136261;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Arte padrão de um cartão sem imagem própria (estável por id). */
export function defaultArt(entry) {
  if (!entry) return KIND_META.lore.art[0];
  if (entry.isMap) return MAP_ART;
  const pool = KIND_META[entry.kind]?.art || KIND_META.lore.art;
  return pool[smallHash(entry.id ?? entry.name) % pool.length];
}

// ------------------------------------------------------------------ visibilidade
export const VISIBILITIES = ['hidden', 'partial', 'revealed'];
export const VIS_META = {
  hidden: { icon: '🔒', pt: 'Oculto', en: 'Hidden', hintPt: 'Só você vê.', hintEn: 'Only you can see it.' },
  partial: { icon: '◐', pt: 'Conhecido de nome', en: 'Known by name', hintPt: 'Jogadores veem nome, frase e imagem.', hintEn: 'Players see name, tagline and image.' },
  revealed: { icon: '👁', pt: 'Revelado', en: 'Revealed', hintPt: 'Jogadores veem o texto e os segredos que você revelar.', hintEn: 'Players see the text and the secrets you reveal.' },
};
export const visLabel = (v, lang) => t(lang, VIS_META[v]?.pt || v, VIS_META[v]?.en || v);
export const visRank = (v) => Math.max(0, VISIBILITIES.indexOf(v));
export function nextVisibility(v) {
  const i = VISIBILITIES.indexOf(v);
  return VISIBILITIES[(i + 1) % VISIBILITIES.length];
}

// ------------------------------------------------------------------ campos por tipo
export const RELS = ['ally', 'enemy', 'family', 'member', 'employer', 'owes', 'located_in', 'other'];
export const REL_META = {
  ally: ['Aliado de', 'Ally of'], enemy: ['Inimigo de', 'Enemy of'], family: ['Família de', 'Family of'],
  member: ['Membro de', 'Member of'], employer: ['Trabalha para', 'Works for'], owes: ['Deve a', 'Owes'],
  located_in: ['Fica em', 'Located in'], other: ['Ligado a', 'Linked to'],
};
export const relLabel = (rel, lang) => { const r = REL_META[rel] || REL_META.other; return t(lang, r[0], r[1]); };

export const PLACE_TYPES = ['region', 'city', 'village', 'dungeon', 'building', 'landmark'];
const PLACE_TYPE_LABELS = { region: ['Região', 'Region'], city: ['Cidade', 'City'], village: ['Vila', 'Village'],
  dungeon: ['Masmorra', 'Dungeon'], building: ['Construção', 'Building'], landmark: ['Marco', 'Landmark'] };
export const placeTypeLabel = (v, lang) => { const r = PLACE_TYPE_LABELS[v]; return r ? t(lang, r[0], r[1]) : ''; };

export const HANDOUT_STYLES = ['scroll', 'letter', 'wanted', 'note'];
const HANDOUT_LABELS = { scroll: ['Pergaminho', 'Scroll'], letter: ['Carta', 'Letter'], wanted: ['Cartaz de procurado', 'Wanted poster'], note: ['Bilhete', 'Note'] };
export const handoutStyleLabel = (v, lang) => { const r = HANDOUT_LABELS[v]; return r ? t(lang, r[0], r[1]) : ''; };

export const RARITIES = ['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact'];
const RARITY_LABELS = { common: ['Comum', 'Common'], uncommon: ['Incomum', 'Uncommon'], rare: ['Raro', 'Rare'],
  very_rare: ['Muito raro', 'Very rare'], legendary: ['Lendário', 'Legendary'], artifact: ['Artefato', 'Artifact'] };
export const rarityLabel = (v, lang) => { const r = RARITY_LABELS[v]; return r ? t(lang, r[0], r[1]) : (v || ''); };

/** Linha curta abaixo do nome (ex.: "Taverneiro", "Vila", "Raro"). */
export function subtitleOf(entry, lang) {
  const d = entry?.data || {};
  if (entry?.kind === 'npc' && d.role) return d.role;
  if (entry?.kind === 'place' && d.placeType) return placeTypeLabel(d.placeType, lang);
  if (entry?.kind === 'item' && d.rarity) return rarityLabel(d.rarity, lang);
  if (entry?.kind === 'handout' && d.style) return handoutStyleLabel(d.style, lang);
  return '';
}

// ------------------------------------------------------------------ menções @[Nome](id)
export const MENTION_RE = /@\[([^\]\n]{1,120})\]\((\d{1,10})\)/g;

/** Quebra um texto em pedaços: {type:'text', text} | {type:'mention', name, id}. */
export function parseMentions(text) {
  const out = [];
  const s = String(text ?? '');
  let last = 0;
  for (const m of s.matchAll(MENTION_RE)) {
    if (m.index > last) out.push({ type: 'text', text: s.slice(last, m.index) });
    out.push({ type: 'mention', name: m[1], id: Number(m[2]) });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ type: 'text', text: s.slice(last) });
  return out;
}

/** Ids mencionados (sem repetição, na ordem). */
export function mentionIds(text) {
  const ids = [];
  for (const p of parseMentions(text)) if (p.type === 'mention' && !ids.includes(p.id)) ids.push(p.id);
  return ids;
}

/** Texto do jeito que o leitor vê (menções viram só o nome). */
export const plainText = (text) => parseMentions(text).map(p => (p.type === 'mention' ? p.name : p.text)).join('');

/** Markup de uma menção; colchetes no nome são trocados para não quebrar o formato. */
export const mentionMarkup = (name, id) => `@[${String(name).replace(/[[\]\n]/g, ' ').slice(0, 120)}](${id})`;

/**
 * Se o cursor está logo depois de "@algo", devolve {start, query} para o
 * autocompletar. Só considera @ no começo ou depois de espaço.
 */
export function mentionQueryAt(text, caret) {
  const before = String(text ?? '').slice(0, caret);
  const m = /(^|\s)@([^\s@[\]()]{0,30})$/.exec(before);
  if (!m) return null;
  return { start: before.length - m[2].length - 1, query: m[2] };
}

/** Troca "@consulta" (de start até caret) pela menção. → {text, caret} */
export function insertMention(text, start, caret, name, id) {
  const s = String(text ?? '');
  const mk = mentionMarkup(name, id) + ' ';
  return { text: s.slice(0, start) + mk + s.slice(caret), caret: start + mk.length };
}

// ------------------------------------------------------------------ busca e filtros
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function allTags(entries) {
  const seen = new Map();
  for (const e of entries || []) for (const tag of e.tags || []) {
    const k = norm(tag);
    if (!seen.has(k)) seen.set(k, tag);
  }
  return [...seen.values()].sort((a, b) => norm(a).localeCompare(norm(b)));
}

export function countByKind(entries) {
  const out = Object.fromEntries(KINDS.map(k => [k, 0]));
  for (const e of entries || []) if (out[e.kind] !== undefined) out[e.kind]++;
  return out;
}

/** Ordem do Atlas: `sort` (arrastar) e depois nome. */
export function sortEntries(entries) {
  return [...(entries || [])].sort((a, b) => ((a.sort ?? 0) - (b.sort ?? 0)) || norm(a.name).localeCompare(norm(b.name)));
}

/** filtros: {kind?, tag?, q?, vis?} — q procura em nome, frase e tags. */
export function filterEntries(entries, { kind, tag, q, vis } = {}) {
  const nq = norm(q);
  const nt = tag ? norm(tag) : '';
  return (entries || []).filter(e => {
    if (kind && kind !== 'all' && e.kind !== kind) return false;
    if (vis && vis !== 'all' && e.visibility !== vis) return false;
    if (nt && !(e.tags || []).some(x => norm(x) === nt)) return false;
    if (nq) {
      const hay = norm([e.name, e.summary, ...(e.tags || [])].join(' '));
      if (!nq.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    return true;
  });
}

/**
 * Move um item de `from` para `to` numa lista ordenada e devolve só os
 * patches necessários de um campo numérico (`sort` ou `whenOrder`),
 * renumerando com passo 10 quando não há espaço. → [{id, [field]: n}]
 */
export function reorderPatches(list, from, to, field = 'sort') {
  const arr = [...(list || [])];
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return [];
  const [moved] = arr.splice(from, 1);
  arr.splice(to, 0, moved);
  const prev = arr[to - 1]?.[field];
  const next = arr[to + 1]?.[field];
  const ok = (v) => typeof v === 'number' && Number.isFinite(v);
  // Tenta encaixar só o item movido entre os vizinhos.
  if (to === 0 && ok(next)) return [{ id: moved.id, [field]: next - 10 }];
  if (to === arr.length - 1 && ok(prev)) return [{ id: moved.id, [field]: prev + 10 }];
  if (ok(prev) && ok(next) && next - prev >= 2) return [{ id: moved.id, [field]: Math.floor((prev + next) / 2) }];
  // Sem espaço (ou valores nulos): renumera tudo com passo 10.
  const out = [];
  arr.forEach((e, i) => { const v = (i + 1) * 10; if (e[field] !== v) out.push({ id: e.id, [field]: v }); });
  return out;
}

/** Aplica patches [{id, ...}] numa lista (imutável). */
export function applyPatches(entries, patches) {
  if (!patches?.length) return entries;
  const by = new Map(patches.map(p => [p.id, p]));
  return entries.map(e => (by.has(e.id) ? { ...e, ...by.get(e.id) } : e));
}

// ------------------------------------------------------------------ linha do tempo
/** Entradas com `whenLabel`, em ordem (whenOrder; sem ordem vão ao fim, por nome). */
export function timelineEntries(entries) {
  return (entries || [])
    .filter(e => (e.whenLabel || '').trim())
    .sort((a, b) => {
      const ao = a.whenOrder, bo = b.whenOrder;
      if (ao == null && bo == null) return norm(a.whenLabel).localeCompare(norm(b.whenLabel)) || norm(a.name).localeCompare(norm(b.name));
      if (ao == null) return 1;
      if (bo == null) return -1;
      return ao - bo || norm(a.name).localeCompare(norm(b.name));
    });
}

// ------------------------------------------------------------------ backlinks ("aparece em")
/**
 * Quem aponta para `id`, calculado na lista leve:
 *  - links explícitos (rel), menções @ no corpo, "fica em" (parentId), pins de mapa;
 *  - nós de aventura com refs (opcional: adventures = [{id, name, nodes:[{id,name,refs}]}]).
 * → [{entry?, adventure?, node?, via: 'link'|'mention'|'parent'|'pin'|'node', rel?}]
 */
export function backlinks(entries, id, adventures = []) {
  const out = [];
  for (const e of entries || []) {
    if (e.id === id) continue;
    for (const ln of e.links || []) if (ln.to === id) out.push({ entry: e, via: 'link', rel: ln.rel });
    if ((e.mentions || []).includes(id)) out.push({ entry: e, via: 'mention' });
    if (e.parentId === id) out.push({ entry: e, via: 'parent' });
    if ((e.pinTargets || []).includes(id)) out.push({ entry: e, via: 'pin' });
  }
  for (const adv of adventures || []) {
    for (const n of adv.nodes || adv.data?.nodes || []) {
      if ((n.refs || []).includes(id)) out.push({ adventure: adv, node: n, via: 'node' });
    }
  }
  return out;
}

/** Filhos diretos ("fica em / pertence a"). */
export const childrenOf = (entries, id) => (entries || []).filter(e => e.parentId === id);

/** "Novo!" para o jogador: revelado depois da última visita. */
export function isNewFor(entry, seenAt) {
  if (!entry?.revealedAt) return false;
  if (!seenAt) return true;
  return new Date(entry.revealedAt).getTime() > new Date(seenAt).getTime();
}

/** Entrada leve a partir da completa (para atualizar a lista sem novo GET). */
export function toLight(full) {
  if (!full) return full;
  const { body, dmNotes, secrets, data, createdAt, ...light } = full; // eslint-disable-line no-unused-vars
  const out = { ...light };
  if (Array.isArray(secrets)) {
    out.secretsCount = secrets.length;
    out.secretsRevealed = secrets.filter(s => s.revealed).length;
  }
  if (typeof body === 'string') out.mentions = mentionIds(body);
  if (data?.map?.pins) out.pinTargets = data.map.pins.map(p => p.entryId).filter(Boolean);
  if (data) out.isMap = full.kind === 'place' && !!data.map;
  // Os cartões usam `data` para o subtítulo (papel, tipo de lugar…).
  if (data) out.data = pickCardData(full.kind, data);
  return out;
}

function pickCardData(kind, data) {
  const keys = { npc: ['role'], place: ['placeType'], item: ['rarity'], handout: ['style'], faction: ['symbolColor'] }[kind] || [];
  const o = {};
  for (const k of keys) if (data[k] !== undefined) o[k] = data[k];
  return o;
}

// ------------------------------------------------------------------ segredos e pins
let _uid = 0;
/** Id curto novo que não colide com `used` (ex.: 's3', 'p7'). */
export function freshId(prefix, used) {
  const set = new Set(used || []);
  let n = set.size + 1;
  while (set.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}
export const tempKey = () => `k${Date.now().toString(36)}${(_uid++).toString(36)}`;

/** Limita x/y a 0..1 (posição relativa do pin). */
export const clampUnit = (v) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));

// ---------------------------------------------------------------- textos com plural e verbo do aparelho
/** true em telas de toque (celular/tablet); false no mouse. */
export const isTouchUi = () => {
  try { return typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches; } catch { return false; }
};
/** "Toque"/"Clique" (ou "Tap"/"Click") conforme o aparelho. */
export const tapVerb = (lang, touch) => (touch ? t(lang, 'Toque', 'Tap') : t(lang, 'Clique', 'Click'));

/** "4 marcadores · 2 visíveis aos jogadores." — plural flexionado de verdade. */
export function pinCountText(total, visible, lang = 'pt') {
  const n = Number(total) || 0; const v = Number(visible) || 0;
  if (lang === 'en') return `${n} ${n === 1 ? 'pin' : 'pins'} · ${v} visible to players.`;
  return `${n} ${n === 1 ? 'marcador' : 'marcadores'} · ${v} ${v === 1 ? 'visível' : 'visíveis'} aos jogadores.`;
}
