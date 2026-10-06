// Lógica pura da casca da campanha (sem React) — testada em tests/shell-logic.test.js.

export const t = (lang, pt, en) => (lang === 'en' ? en : pt);

/** Áreas do mestre, na ordem das teclas 1–4. `subs[0]` é a subvista padrão. */
export const DM_AREAS = [
  { id: 'world',   icon: '🗺️', pt: 'Mundo',    en: 'World',   subs: ['atlas', 'map', 'timeline'] },
  { id: 'prepare', icon: '📜', pt: 'Preparar', en: 'Prepare', subs: ['next', 'adventures', 'items'] },
  { id: 'play',    icon: '⚔️', pt: 'Jogar',    en: 'Play',    subs: ['scene', 'combat', 'checks', 'screen'] },
  { id: 'group',   icon: '🛡️', pt: 'Grupo',    en: 'Party',   subs: ['players', 'chronicle'] },
];

/** Abas do jogador. */
export const PLAYER_AREAS = [
  { id: 'table',     icon: '🎲', pt: 'Mesa',    en: 'Table',     subs: [] },
  { id: 'world',     icon: '🗺️', pt: 'Mundo',   en: 'World',     subs: ['atlas', 'map', 'timeline', 'documents'] },
  { id: 'chronicle', icon: '📖', pt: 'Crônica', en: 'Chronicle', subs: [] },
  { id: 'group',     icon: '🛡️', pt: 'Grupo',   en: 'Party',     subs: [] },
];

export const SUB_LABELS = {
  atlas: ['Atlas', 'Atlas'],
  map: ['Mapa', 'Map'],
  timeline: ['Linha do tempo', 'Timeline'],
  documents: ['Documentos', 'Documents'],
  next: ['Próxima sessão', 'Next session'],
  adventures: ['Aventuras', 'Adventures'],
  items: ['Itens da campanha', 'Campaign items'],
  scene: ['Cena', 'Scene'],
  combat: ['Combate', 'Combat'],
  checks: ['Testes', 'Checks'],
  screen: ['Telão', 'TV screen'],
  players: ['Jogadores', 'Players'],
  chronicle: ['Crônica', 'Chronicle'],
};

export const subLabel = (sub, lang) => {
  const l = SUB_LABELS[sub];
  return l ? (lang === 'en' ? l[1] : l[0]) : sub;
};

export function areasFor(isDM) {
  return isDM ? DM_AREAS : PLAYER_AREAS;
}

export function areaLabel(area, lang) {
  return lang === 'en' ? area.en : area.pt;
}

/** Normaliza {area, sub} para valores válidos do papel. */
export function normalizeArea(isDM, area, sub) {
  const list = areasFor(isDM);
  const a = list.find(x => x.id === area) || null;
  if (!a) return null;
  const s = a.subs.length ? (a.subs.includes(sub) ? sub : a.subs[0]) : null;
  return { area: a.id, sub: s };
}

/**
 * Abas antigas (onNavigate/onOpenTab dos componentes legados) → área nova.
 * Mantém TableNow/CombatTab/PrepTab funcionando dentro da casca.
 */
export const LEGACY_TAB_TO_AREA = {
  now: ['play', 'scene'],
  overview: ['play', 'scene'],
  combat: ['play', 'combat'],
  rolls: ['play', 'checks'],
  screen: ['play', 'screen'],
  prep: ['prepare', 'adventures'],
  items: ['prepare', 'items'],
  members: ['group', 'players'],
  approvals: ['group', 'players'],
  diary: ['group', 'chronicle'],
  world: ['world', 'atlas'],
};

export function legacyTabToArea(tab) {
  return LEGACY_TAB_TO_AREA[tab] || null;
}

// ---------------------------------------------------------------------------
// Primeiros passos (onboarding do mestre)
// ---------------------------------------------------------------------------

export const ONBOARDING_STEPS = ['cover', 'firstEntry', 'invite', 'prepare', 'tv'];

/**
 * Situação de cada passo. Os passos se marcam sozinhos a partir dos dados
 * (capa existe, mundo tem entrada, há jogador…) ou da flag gravada em
 * `campaign.onboarding` (ex.: o mestre copiou o convite / abriu o telão).
 */
export function onboardingStatus(campaign, { worldCount = 0, planHasContent = false } = {}) {
  const ob = (campaign && campaign.onboarding) || {};
  const players = (campaign?.members || []).filter(m => m.role !== 'dm').length;
  const session = parseInt(campaign?.state?.session, 10);
  const done = {
    cover: !!(campaign?.coverVer || ob.cover),
    firstEntry: worldCount > 0 || !!ob.firstEntry,
    invite: players > 0 || !!ob.invite,
    prepare: !!(planHasContent || ob.prepare || (Number.isFinite(session) && session > 0)),
    tv: !!ob.tv,
  };
  const count = ONBOARDING_STEPS.filter(k => done[k]).length;
  return {
    done,
    count,
    total: ONBOARDING_STEPS.length,
    complete: count === ONBOARDING_STEPS.length,
    dismissed: !!ob.dismissed,
  };
}

/** O cartão "Primeiros passos" aparece? */
export function onboardingVisible(status) {
  return !!status && !status.dismissed && !status.complete;
}

/** Plano de sessão tem algo escrito? (usado no passo "Prepare a 1ª sessão") */
export function planHasContent(plan) {
  if (!plan || typeof plan !== 'object') return false;
  if ((plan.strongStart || '').trim()) return true;
  if ((plan.monsters || '').trim() || (plan.rewards || '').trim()) return true;
  for (const k of ['scenes', 'secrets']) {
    if (Array.isArray(plan[k]) && plan[k].some(x => (x?.text || '').trim())) return true;
  }
  return (plan.npcIds?.length || 0) + (plan.placeIds?.length || 0) > 0;
}

// ---------------------------------------------------------------------------
// Área inicial e memória da última área
// ---------------------------------------------------------------------------

/**
 * Primeira tela que o mestre vê (DESIGN 1.4):
 *  - sessão ao vivo ou combate ativo → Jogar › Cena;
 *  - senão, a última área lembrada;
 *  - senão, primeiros passos pendentes → Mundo;
 *  - senão → Preparar › Próxima sessão.
 * Jogador: lembrada ou Mesa.
 */
export function initialArea({ isDM, live = false, combatActive = false, onboardingPending = false, remembered = null }) {
  if (!isDM) {
    return normalizeArea(false, remembered?.area, remembered?.sub) || { area: 'table', sub: null };
  }
  if (live || combatActive) return { area: 'play', sub: combatActive ? 'combat' : 'scene' };
  const rem = remembered && normalizeArea(true, remembered.area, remembered.sub);
  if (rem) return rem;
  if (onboardingPending) return { area: 'world', sub: 'atlas' };
  return { area: 'prepare', sub: 'next' };
}

const memKey = (campaignId) => `forja:campaign-area:${campaignId}`;

export function loadRememberedArea(campaignId, storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const raw = s?.getItem(memKey(campaignId));
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v.area === 'string' ? { area: v.area, sub: typeof v.sub === 'string' ? v.sub : null } : null;
  } catch { return null; }
}

export function saveRememberedArea(campaignId, value, storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    s?.setItem(memKey(campaignId), JSON.stringify({ area: value.area, sub: value.sub || null }));
  } catch { /* modo privado / bloqueado: tudo bem */ }
}

// ---------------------------------------------------------------------------
// Busca rápida (Ctrl+K)
// ---------------------------------------------------------------------------

export function fold(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Pontuação de `text` para a busca `q` (já dobrada). 0 = não casa. */
export function matchScore(text, q) {
  const f = fold(text);
  if (!q || !f) return 0;
  if (f === q) return 100;
  if (f.startsWith(q)) return 80;
  if (f.split(/[\s\-–—,.'()]+/).some(w => w.startsWith(q))) return 60;
  if (f.includes(q)) return 40;
  return 0;
}

/**
 * Busca em itens `{id, kind, label, sub?, keywords?}`. Ordena por pontuação,
 * depois por prioridade do tipo (`kindOrder`), depois por nome.
 */
export function searchItems(items, query, { limit = 30, kindOrder = [] } = {}) {
  const q = fold(query);
  if (!q) return [];
  const rank = (k) => { const i = kindOrder.indexOf(k); return i < 0 ? 99 : i; };
  const out = [];
  for (const it of items || []) {
    let s = matchScore(it.label, q);
    if (!s && it.keywords) s = Math.max(0, matchScore(it.keywords, q) - 20);
    if (s > 0) out.push({ it, s });
  }
  out.sort((a, b) => (b.s - a.s) || (rank(a.it.kind) - rank(b.it.kind)) || String(a.it.label).localeCompare(String(b.it.label)));
  return out.slice(0, limit).map(x => x.it);
}

// ---------------------------------------------------------------------------
// Tom / cor
// ---------------------------------------------------------------------------

export const TONES = [
  { id: 'heroic',  pt: 'Heroico', en: 'Heroic',  accent: '#d6b064' },
  { id: 'dark',    pt: 'Sombrio', en: 'Dark',    accent: '#8e2c2c' },
  { id: 'mystery', pt: 'Mistério', en: 'Mystery', accent: '#6b5ca5' },
  { id: 'comic',   pt: 'Cômico',  en: 'Comic',   accent: '#d2833a' },
  { id: 'epic',    pt: 'Épico',   en: 'Epic',    accent: '#3f7fae' },
];

export const ACCENTS = ['#d6b064', '#b8862b', '#8e2c2c', '#6b5ca5', '#3f7fae', '#4c8a5b', '#d2833a', '#a0a4ad'];

export function isHexColor(v) {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
}

/** Arte padrão de capa: escolhida de forma estável pelo id da campanha. */
export const COVER_ART = [
  '/art/hero-forge.webp',
  '/art/backgrounds/wayfarer.webp',
  '/art/backgrounds/outlander.webp',
  '/art/backgrounds/sage.webp',
  '/art/backgrounds/knight.webp',
  '/art/backgrounds/sailor.webp',
  '/art/backgrounds/hermit.webp',
  '/art/backgrounds/noble.webp',
  '/art/backgrounds/acolyte.webp',
  '/art/grimoire-book.webp',
];

export function defaultCoverArt(campaign) {
  const n = Number(campaign?.id) || 0;
  return COVER_ART[Math.abs(n) % COVER_ART.length];
}

/** Próximo número de sessão para o botão "▶ Começar sessão N". */
export function nextSessionNumber(state) {
  const n = parseInt(state?.session, 10);
  return Number.isFinite(n) && n > 0 ? n + 1 : 1;
}

/** Link de convite: `<origin>/join/<code>` (DESIGN WP8 d). */
export function inviteLink(origin, code) {
  return code ? `${origin}/join/${code}` : '';
}

export function screenLink(origin, token) {
  return token ? `${origin}/tv/${token}` : '';
}
