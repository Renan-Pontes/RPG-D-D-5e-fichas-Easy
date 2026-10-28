// Lógica pura da casca da campanha (sem React) — testada em tests/shell-logic.test.js.
import { planHeading, planIsBlank, realScene, stateSession } from '../prep/next-session.js';

export const t = (lang, pt, en) => (lang === 'en' ? en : pt);

/** Áreas do mestre, na ordem das teclas 1–4. `subs[0]` é a subvista padrão. */
export const DM_AREAS = [
  { id: 'world',   icon: '🗺️', pt: 'Mundo',    en: 'World',   subs: ['atlas', 'map', 'timeline'] },
  { id: 'prepare', icon: '📜', pt: 'Preparar', en: 'Prepare', subs: ['next', 'adventures', 'items'] },
  { id: 'play',    icon: '⚔️', pt: 'Jogar',    en: 'Play',    subs: ['scene', 'combat', 'checks', 'screen'] },
  { id: 'group',   icon: '🛡️', pt: 'Grupo',    en: 'Party',   subs: ['players', 'requests', 'insights', 'chronicle'] },
];

/** Abas do jogador. */
export const PLAYER_AREAS = [
  { id: 'table',     icon: '🎲', pt: 'Mesa',    en: 'Table',     subs: [] },
  { id: 'world',     icon: '🗺️', pt: 'Mundo',   en: 'World',     subs: ['atlas', 'map', 'timeline', 'documents'] },
  { id: 'chronicle', icon: '📖', pt: 'Crônica', en: 'Chronicle', subs: [] },
  { id: 'group',     icon: '🛡️', pt: 'Grupo',   en: 'Party',     subs: [] },
];

// Mundo: Cartões · Mapas · Tempo (§9.1; "Atlas" saiu do app: o que mora lá é "cartão").
export const SUB_LABELS = {
  atlas: ['Cartões', 'Cards'],
  map: ['Mapas', 'Maps'],
  timeline: ['Tempo', 'Timeline'],
  documents: ['Documentos', 'Documents'],
  next: ['Plano', 'Plan'],
  adventures: ['Aventuras', 'Adventures'],
  items: ['Itens', 'Items'],
  scene: ['Agora', 'Now'],
  combat: ['Combate', 'Combat'],
  checks: ['Testes', 'Checks'],
  screen: ['Tela', 'Screen'],
  players: ['Jogadores', 'Players'],
  requests: ['Pedidos', 'Requests'],
  insights: ['Raio-X', 'X-ray'],
  chronicle: ['Crônica', 'Chronicle'],
};

/**
 * Rótulo curto (celular ≤ 480 px): o segmentado mostra todas as subvistas numa
 * fileira só, com colunas iguais (4 em 320 px). O longo fica para o leitor de tela.
 */
export const SUB_SHORT = {
  timeline: ['Tempo', 'Timeline'],
  documents: ['Docs', 'Docs'],
  screen: ['Tela', 'Screen'],
  requests: ['Pedidos', 'Requests'],
};

/** Ícone de cada subvista — o mesmo em todas as áreas. */
export const SUB_ICONS = {
  atlas: '📚', map: '🗺', timeline: '⌛', documents: '📄',
  next: '📋', adventures: '🧭', items: '💎',
  scene: '🎭', combat: '⚔', checks: '🎲', screen: '📺',
  players: '🛡', requests: '📨', insights: '✦', chronicle: '📜',
};

export const subShortLabel = (sub, lang) => {
  const l = SUB_SHORT[sub];
  return l ? (lang === 'en' ? l[1] : l[0]) : subLabel(sub, lang);
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
  approvals: ['group', 'requests'],
  diary: ['group', 'chronicle'],
  world: ['world', 'atlas'],
};

export function legacyTabToArea(tab) {
  return LEGACY_TAB_TO_AREA[tab] || null;
}

/**
 * Subvista ao tocar numa área (aba do desktop, casa da barra do celular ou
 * tecla 1–4): o contador vermelho do Grupo do mestre (pedidos esperando) leva
 * direto a Grupo › Pedidos. Sem contador, null (a subvista padrão da área).
 */
export function areaTapSub(isDM, area, badges = {}) {
  if (isDM && area === 'group' && Number(badges?.group) > 0) return 'requests';
  return null;
}

/**
 * Contador do Grupo na barra (e o que areaTapSub e a tecla 4 leem). Dentro do
 * Grupo vale a conta viva da área (a lista de pedidos, a 6 s); fora dele, a do
 * GET da campanha (que a casca do mestre busca quando o pulso muda; o jogador, a 2,5 s). A conta da área é só dela: a última
 * que ela mandou antes de desmontar não pode esconder um pedido novo.
 */
export function groupBadgeCount(area, groupPending, campaignPending) {
  const n = area === 'group' && groupPending != null ? groupPending : campaignPending;
  return Math.max(0, Number(n) || 0);
}

// ---------------------------------------------------------------------------
// Primeiros passos (onboarding do mestre)
// ---------------------------------------------------------------------------

export const ONBOARDING_STEPS = ['cover', 'firstEntry', 'invite', 'prepare', 'tv'];

/**
 * Situação de cada passo. Os passos se marcam sozinhos a partir dos dados
 * (capa existe, mundo tem entrada, há jogador…) ou da flag gravada em
 * `campaign.onboarding` (ex.: o mestre copiou o convite / abriu a Tela).
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

/**
 * O que a casca guarda do plano (1 GET ao abrir a campanha, de novo quando o `planRev` do
 * pulso muda fora do Plano; o Plano aberto avisa a cada mudança): `has` para os Primeiros
 * passos e `blank` para o selo de Preparar. Sem plano (não lido, servidor sem a rota): null.
 */
export function planFlags(plan) {
  if (!plan || typeof plan !== 'object') return null;
  return { has: planHasContent(plan), blank: planIsBlank(plan) };
}

/**
 * Selos de Preparar (§2.1): "!" quando o plano está em branco (sem começo e sem cena, as 3
 * portas do Plano) e a sessão não está ao vivo. Campanha encerrada ou plano ainda não
 * lido: nenhum.
 */
export function prepareMarks({ flags, live = false, closed = false, lang = 'pt' } = {}) {
  if (!flags?.blank || live || closed) return [];
  return [{ k: 'empty', icon: '!', label: t(lang, 'plano vazio', 'empty plan') }];
}

// ---------------------------------------------------------------------------
// Área inicial e memória da última área
// ---------------------------------------------------------------------------

/**
 * Primeira tela que o mestre vê (especificação §2.4):
 *  - combate ativo → Jogar › Combate; sessão ao vivo → Jogar › Agora (sub `scene`);
 *  - senão, a última área lembrada;
 *  - senão (campanha nova, outro aparelho) → Preparar › Plano, com as 3 portas.
 * Jogador: lembrada ou Mesa.
 * `fromUrl` ({area, sub} lido da URL) vem antes de tudo, para o F5 voltar à mesma tela.
 */
export function initialArea({ isDM, live = false, combatActive = false, remembered = null, fromUrl = null }) {
  // A URL (#c/<slug>/<área>/<sub>, ex.: depois de um F5) manda em tudo.
  const url = fromUrl && fromUrl.area ? normalizeArea(isDM, fromUrl.area, fromUrl.sub) : null;
  if (url) return url;
  if (!isDM) {
    return normalizeArea(false, remembered?.area, remembered?.sub) || { area: 'table', sub: null };
  }
  if (live || combatActive) return { area: 'play', sub: combatActive ? 'combat' : 'scene' };
  const rem = remembered && normalizeArea(true, remembered.area, remembered.sub);
  if (rem) return rem;
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
 * Os lugares do app na busca do mestre (§2.6): cada um com as palavras de antes como
 * sinônimo — "telão" acha a Tela, "próxima sessão" acha o Plano, "encontro" acha o
 * Combate, "recap" acha o Resumo. `go` = [área, sub, params] (o que a casca navega);
 * `guide` = o cartão do Guia do mestre que abre. `was` = o nome antigo, escrito no
 * resultado ("antes: Telão").
 */
export const NAV_PLACES = [
  { id: 'plan', icon: '📋', pt: 'Plano', en: 'Plan', where: ['Preparar', 'Prepare'], go: ['prepare', 'next'], was: ['Próxima sessão', 'Next session'],
    kw: 'próxima sessão plano da sessão preparar a sessão começo forte pistas next session session plan prep strong start clues' },
  { id: 'adventures', icon: '🧭', pt: 'Aventuras', en: 'Adventures', where: ['Preparar', 'Prepare'], go: ['prepare', 'adventures'],
    kw: 'masmorra salas mapa da aventura conduzir na mesa aventura pronta dungeon rooms adventure map run at the table ready adventure' },
  { id: 'items', icon: '💎', pt: 'Itens', en: 'Items', where: ['Preparar', 'Prepare'], go: ['prepare', 'items'],
    kw: 'itens da campanha tesouro catálogo campaign items treasure catalog' },
  { id: 'now', icon: '🎭', pt: 'Agora', en: 'Now', where: ['Jogar', 'Play'], go: ['play', 'scene'], was: ['Cena', 'Scene'],
    kw: 'cena agora cena mesa ao vivo ensaio scene current scene live table rehearsal' },
  { id: 'combat', icon: '⚔', pt: 'Combate', en: 'Combat', where: ['Jogar', 'Play'], go: ['play', 'combat'], was: ['Encontro', 'Encounter'],
    kw: 'encontro luta iniciativa turno monstros encounter fight initiative turn monsters' },
  { id: 'checks', icon: '🎲', pt: 'Testes', en: 'Checks', where: ['Jogar', 'Play'], go: ['play', 'checks'],
    kw: 'pedir teste rolagens perícia salvaguarda ask for a check rolls skill saving throw' },
  { id: 'screen', icon: '📺', pt: 'Tela', en: 'Screen', where: ['Jogar', 'Play'], go: ['play', 'screen'], was: ['Telão', 'TV screen'],
    kw: 'telão tv link da tv mostrar na tela escurecer limpar a tela tv screen big screen tv link show on screen black out clear screen' },
  { id: 'players', icon: '🛡', pt: 'Jogadores', en: 'Players', where: ['Grupo', 'Party'], go: ['group', 'players'],
    kw: 'convite grupo fichas personagens invite party sheets characters' },
  { id: 'requests', icon: '📨', pt: 'Pedidos', en: 'Requests', where: ['Grupo', 'Party'], go: ['group', 'requests'],
    kw: 'aprovações subir de nível xp aprovar approvals level up' },
  { id: 'insights', icon: '✦', pt: 'Raio-X', en: 'X-ray', where: ['Grupo', 'Party'], go: ['group', 'insights'],
    kw: 'métricas gráficos forças fraquezas momentos holofote metrics charts strengths weaknesses moments spotlight' },
  { id: 'chronicle', icon: '📜', pt: 'Crônica', en: 'Chronicle', where: ['Grupo', 'Party'], go: ['group', 'chronicle'],
    kw: 'diário notas sessões diary notes sessions' },
  { id: 'recap', icon: '📜', pt: 'Resumo da sessão', en: 'Session recap', where: ['Grupo › Crônica', 'Party › Chronicle'], go: ['group', 'chronicle', { recap: true }], was: ['recap', 'recap'],
    kw: 'recap montar recap anteriormente em encerrar draft recap previously on end session' },
  { id: 'cards', icon: '📚', pt: 'Cartões', en: 'Cards', where: ['Mundo', 'World'], go: ['world', 'atlas'], was: ['Atlas', 'Atlas'],
    kw: 'atlas npcs lugares facções itens documentos npc places factions handouts' },
  { id: 'maps', icon: '🗺', pt: 'Mapas', en: 'Maps', where: ['Mundo', 'World'], go: ['world', 'map'],
    kw: 'mapa do mundo marcadores world map pins' },
  { id: 'timeline', icon: '⌛', pt: 'Tempo', en: 'Timeline', where: ['Mundo', 'World'], go: ['world', 'timeline'], was: ['Linha do tempo', 'Timeline'],
    kw: 'linha do tempo eventos quando timeline events when' },
  { id: 'guide', icon: '📘', pt: 'Guia do mestre', en: 'GM guide', where: ['Ajuda', 'Help'], guide: 0,
    kw: 'ajuda como usar tutorial quero vou a help how to tutorial' },
];

/** Os lugares do app como itens da busca (`kind: 'nav'`), no idioma de quem busca. */
export function navSearchItems(lang) {
  return NAV_PLACES.map(p => {
    const was = p.was ? (lang === 'en' ? p.was[1] : p.was[0]) : null;
    const label = lang === 'en' ? p.en : p.pt;
    return {
      id: `nav-${p.id}`, kind: 'nav', label, icon: p.icon,
      keywords: `${p.pt} ${p.en} ${p.kw}`,
      sub: [lang === 'en' ? p.where[1] : p.where[0], was && was !== label ? t(lang, `antes: ${was}`, `was: ${was}`) : null].filter(Boolean).join(' · '),
      ...(p.go ? { go: p.go } : {}),
      ...(p.guide != null ? { guide: p.guide } : {}),
    };
  });
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

/** Nome legível de cada cor de destaque (leitor de tela e dica). */
export const ACCENT_NAMES = {
  '#d6b064': ['Dourado', 'Gold'],
  '#b8862b': ['Bronze', 'Bronze'],
  '#8e2c2c': ['Vermelho-sangue', 'Blood red'],
  '#6b5ca5': ['Violeta', 'Violet'],
  '#3f7fae': ['Azul', 'Blue'],
  '#4c8a5b': ['Verde-musgo', 'Moss green'],
  '#d2833a': ['Laranja', 'Orange'],
  '#a0a4ad': ['Prata', 'Silver'],
};

export function accentName(hex, lang) {
  const n = ACCENT_NAMES[String(hex || '').toLowerCase()];
  if (n) return lang === 'en' ? n[1] : n[0];
  return lang === 'en' ? 'Custom color' : 'Cor personalizada';
}

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

/** Nome de cada arte de capa (rótulo das opções da galeria). */
export const COVER_ART_NAMES = {
  '/art/hero-forge.webp': ['Forja dos heróis', "Heroes' forge"],
  '/art/backgrounds/wayfarer.webp': ['Viajante', 'Wayfarer'],
  '/art/backgrounds/outlander.webp': ['Forasteiro', 'Outlander'],
  '/art/backgrounds/sage.webp': ['Sábio', 'Sage'],
  '/art/backgrounds/knight.webp': ['Cavaleiro', 'Knight'],
  '/art/backgrounds/sailor.webp': ['Marinheiro', 'Sailor'],
  '/art/backgrounds/hermit.webp': ['Eremita', 'Hermit'],
  '/art/backgrounds/noble.webp': ['Nobre', 'Noble'],
  '/art/backgrounds/acolyte.webp': ['Acólito', 'Acolyte'],
  '/art/grimoire-book.webp': ['Grimório', 'Grimoire'],
};

export function coverArtName(path, lang) {
  const n = COVER_ART_NAMES[path];
  const name = n ? (lang === 'en' ? n[1] : n[0]) : (lang === 'en' ? 'Art' : 'Arte');
  return lang === 'en' ? `Cover: ${name}` : `Capa: ${name}`;
}

export function defaultCoverArt(campaign) {
  const n = Number(campaign?.id) || 0;
  return COVER_ART[Math.abs(n) % COVER_ART.length];
}

// ---------------------------------------------------------------------------
// Ajustes: seções (as mesmas 6 do ⚙ e das linhas da folha "Mais")
// ---------------------------------------------------------------------------

/** As 6 seções dos Ajustes, na ordem do menu. */
export const SETTINGS_SECTIONS = [
  { id: 'identity', icon: '🎨', pt: 'Identidade e capa',     en: 'Identity & cover' },
  { id: 'table',    icon: '🔗', pt: 'Convite e Tela',        en: 'Invite & screen' },
  { id: 'rules',    icon: '📏', pt: 'Regras da mesa',        en: 'Table rules' },
  { id: 'world',    icon: '✨', pt: 'Mundo vivo',            en: 'Living world' },
  { id: 'advanced', icon: '🧰', pt: 'Ferramentas avançadas', en: 'Advanced tools' },
  { id: 'danger',   icon: '⚠️', pt: 'Zona de perigo',        en: 'Danger zone' },
];

/** Rótulo de uma seção dos Ajustes (id desconhecido → o próprio id). */
export function settingsSectionLabel(id, lang) {
  const s = SETTINGS_SECTIONS.find(x => x.id === id);
  return s ? (lang === 'en' ? s.en : s.pt) : id;
}

/**
 * Resumo de uma linha de cada seção dos Ajustes (folha "Mais", plano §5.J):
 * "Capa própria · Mistério · Violeta", "Código 6T79AF · link da Tela"…
 * `opts.immersion` (Mundo vivo ligado?) vem de quem chama (living-logic).
 */
export function settingsSummary(section, campaign, lang, { immersion = true, worldCount = null, worldMax = 500 } = {}) {
  const c = campaign || {};
  const st = c.state || {};
  const tt = (pt, en) => (lang === 'en' ? en : pt);
  if (section === 'identity') {
    const tone = TONES.find(x => x.id === c.tone);
    return [
      c.coverVer ? tt('Capa própria', 'Own cover') : tt('Arte padrão', 'Default art'),
      tone ? (lang === 'en' ? tone.en : tone.pt) : tt('sem tom', 'no tone'),
      isHexColor(c.accent) ? accentName(c.accent, lang) : null,
    ].filter(Boolean).join(' · ');
  }
  if (section === 'table') {
    return [c.inviteCode ? tt(`Código ${c.inviteCode}`, `Code ${c.inviteCode}`) : null, tt('link da Tela', 'screen link')].filter(Boolean).join(' · ');
  }
  if (section === 'rules') {
    const xp = st.levelingMode === 'xp';
    const multi = st.allowMulticlass !== false;
    return `${xp ? 'XP' : tt('Marcos', 'Milestones')} · ${multi ? tt('multiclasse permitida', 'multiclass allowed') : tt('sem multiclasse', 'no multiclass')}`;
  }
  if (section === 'world') return immersion ? tt('Mundo vivo ligado', 'Living world on') : tt('Mundo vivo desligado', 'Living world off');
  if (section === 'advanced') {
    const dice = c.advancedDice ? tt('Dados preparados ligados', 'Prepared dice on') : tt('Dados preparados desligados', 'Prepared dice off');
    return worldCount != null ? `${dice} · ${worldCount}/${worldMax} ${tt('cartões', 'cards')}` : dice;
  }
  if (section === 'danger') {
    return c.status === 'closed'
      ? tt('Campanha encerrada · Reabrir', 'Campaign closed · Reopen')
      : tt('Esvaziar o Mundo · Encerrar campanha', 'Clear the World · Close campaign');
  }
  return '';
}

// ---------------------------------------------------------------------------
// A linha de próximo passo no cartão da campanha (lista de campanhas, §7.8)
// ---------------------------------------------------------------------------

/**
 * O resumo do plano que o cartão da campanha mostra ("Plano da Sessão 5: 2 cenas"). A lista
 * de campanhas não traz o plano (e não vai trazer: 0 pedido novo), então a casca guarda
 * este resumo NO APARELHO toda vez que lê o plano; o cartão confere se ele ainda é da mesma
 * situação (sessão e ao vivo) antes de usar. → {n, scenes, blank, stale, live, session}
 */
export function planCardSummary(plan, state) {
  if (!plan || typeof plan !== 'object') return null;
  const h = planHeading(plan, state);
  return {
    n: h.n, scenes: (plan.scenes || []).filter(realScene).length, blank: planIsBlank(plan), stale: !!h.stale,
    live: !!state?.live, session: stateSession(state),
  };
}

const planCardKey = (id) => `forja:plan-card:${id}`;
export function savePlanCard(campaignId, summary, storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (summary) s?.setItem(planCardKey(campaignId), JSON.stringify(summary));
  } catch { /* modo privado: o cartão mostra a linha sem o plano */ }
}
export function loadPlanCard(campaignId, storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const v = JSON.parse(s?.getItem(planCardKey(campaignId)) || 'null');
    return v && typeof v === 'object' ? v : null;
  } catch { return null; }
}

/**
 * A linha de próximo passo do cartão do MESTRE (o jogador e a campanha encerrada: null).
 *  - ao vivo: "Sessão 4 ao vivo · Plano de hoje: 3 cenas" (ou "… · volte para Jogar › Agora");
 *  - fora: "Plano da Sessão 5: 2 cenas" ou, sem plano ou com o plano de uma sessão já jogada,
 *    "Próximo passo: preparar o Plano da Sessão 5".
 * `saved` (planCardSummary guardado no aparelho) só vale se for da mesma sessão e do mesmo
 * "ao vivo" da campanha de agora; senão a linha sai sem a contagem.
 */
export function campaignNextLine(c, saved, lang = 'pt') {
  if (!c || c.role !== 'dm' || c.status === 'closed') return null;
  const st = c.state || {};
  const cur = stateSession(st);
  const live = !!st.live;
  const fresh = saved && saved.session === cur && !!saved.live === live ? saved : null;
  const scenes = (k) => t(lang, `${k} ${k === 1 ? 'cena' : 'cenas'}`, `${k} ${k === 1 ? 'scene' : 'scenes'}`);
  if (live && cur) {
    if (fresh && fresh.scenes > 0) return t(lang, `Sessão ${cur} ao vivo · Plano de hoje: ${scenes(fresh.scenes)}`, `Session ${cur} live · Today's plan: ${scenes(fresh.scenes)}`);
    return t(lang, `Sessão ${cur} ao vivo · volte para Jogar › Agora`, `Session ${cur} live · back to Play › Now`);
  }
  const next = (cur || 0) + 1;
  if (fresh && !fresh.blank && !fresh.stale && fresh.n) {
    if (fresh.scenes > 0) return t(lang, `Plano da Sessão ${fresh.n}: ${scenes(fresh.scenes)}`, `Session ${fresh.n} plan: ${scenes(fresh.scenes)}`);
    return t(lang, `Plano da Sessão ${fresh.n}: só o começo, sem cenas`, `Session ${fresh.n} plan: just the opening, no scenes`);
  }
  return t(lang, `Próximo passo: preparar o Plano da Sessão ${next}`, `Next step: prepare the session ${next} plan`);
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

// ---------------------------------------------------------------------------
// Rota da campanha na URL: #c/<slug>/<área>/<subvista>
// (recarregar a página volta para a mesma campanha e a mesma tela)
// ---------------------------------------------------------------------------

const ROUTE_SAFE = /^[A-Za-z0-9_-]{1,80}$/;

/**
 * Monta o hash `#c/<slug>/<área>[/<sub>]`. Sem campanha → ''.
 * `fallbackId`: quando o slug não serve na URL (nome com acento, como
 * "a-maldição-de-brumafria"), usa o id da campanha (`#c/1/play/combat`), que
 * o servidor e o app também aceitam — assim o F5 volta à mesma tela.
 */
export function campaignRoute(slug, area = null, sub = null, fallbackId = null) {
  let s = String(slug ?? '').trim();
  if (!ROUTE_SAFE.test(s)) s = String(fallbackId ?? '').trim();
  if (!ROUTE_SAFE.test(s)) return '';
  let h = `#c/${encodeURIComponent(s)}`;
  if (area && ROUTE_SAFE.test(area)) {
    h += `/${area}`;
    if (sub && ROUTE_SAFE.test(sub)) h += `/${sub}`;
  }
  return h;
}

/** Lê `#c/<slug>/<área>/<sub>` → {slug, area, sub} (área/sub podem vir null). */
export function parseCampaignRoute(hash) {
  const m = /^#c\/([^/?#]+)(?:\/([^/?#]+))?(?:\/([^/?#]+))?\/?$/.exec(String(hash || ''));
  if (!m) return null;
  let slug;
  try { slug = decodeURIComponent(m[1]); } catch { return null; }
  if (!ROUTE_SAFE.test(slug)) return null;
  const area = m[2] && ROUTE_SAFE.test(m[2]) ? m[2] : null;
  const sub = area && m[3] && ROUTE_SAFE.test(m[3]) ? m[3] : null;
  return { slug, area, sub };
}
