// Cliente HTTP para a API Django.
//
// Auth: sessão via cookie (sessionid). Toda requisição mutante envia
// X-CSRFToken. Em cross-origin (Vercel→PA), o browser bloqueia
// document.cookie pra cookies de outro domínio, então NÃO conseguimos ler
// 'csrftoken' do cookie. Solução: /api/auth/csrf devolve o token no body
// JSON, guardamos em module cache e usamos no header. Fallback p/ cookie
// preserva same-origin/dev local.
//
// API_BASE vem de VITE_API_URL em produção; em dev cai pra localhost:4000.

const DEFAULT_BASE = import.meta.env?.VITE_API_URL || '';
const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__) || DEFAULT_BASE;

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map(s => s.trim());
  for (const p of parts) {
    if (p.startsWith(name + '=')) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

let csrfTokenCache = null;
let csrfPromise = null;

async function ensureCsrf(force = false) {
  if (!force && csrfTokenCache) return csrfTokenCache;
  if (!csrfPromise) {
    csrfPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: 'include', signal: AbortSignal.timeout(15000) });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.csrfToken) {
            csrfTokenCache = data.csrfToken;
            return csrfTokenCache;
          }
        }
      } catch { /* network — cai pro fallback */ }
      // Fallback p/ same-origin / dev local: cookie acessível via document.cookie.
      const fromCookie = getCookie('csrftoken');
      if (fromCookie) csrfTokenCache = fromCookie;
      return csrfTokenCache;
    })().finally(() => { csrfPromise = null; });
  }
  return csrfPromise;
}

function currentLang() {
  try { return localStorage.getItem('dnd5e-forge:lang') || 'pt'; } catch { return 'pt'; }
}

// Erro claro para CSRF de origem não confiável (ex.: Vite numa porta que o
// Django não conhece). `code` = 'csrf_origin' para quem quiser tratar.
function csrfOriginError(status, data) {
  const msg = currentLang() === 'en'
    ? 'Origin not authorized by the server. Open the app at the official address (or add this address to CSRF_TRUSTED_ORIGINS).'
    : 'Origem não autorizada pelo servidor. Abra o app pelo endereço oficial (ou adicione este endereço em CSRF_TRUSTED_ORIGINS).';
  // `issues` faz o errorMessage() (api/errors.js) mostrar este texto mesmo
  // quando a tela passa uma mensagem genérica de fallback.
  return new ApiError(msg, status, { error: 'csrf_origin', code: 'csrf_origin', detail: msg, issues: [msg], raw: data });
}

/** Esquece o token CSRF guardado e busca outro (o Django gira o token no login). */
export async function refreshCsrf() {
  csrfTokenCache = null;
  return ensureCsrf(true);
}

async function request(path, { method = 'GET', body, headers = {}, _csrfRetry = false } = {}) {
  const isMutation = method !== 'GET' && method !== 'HEAD';
  if (isMutation) await ensureCsrf();
  const csrftoken = csrfTokenCache || getCookie('csrftoken');
  const res = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(15000),
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(isMutation && csrftoken ? { 'X-CSRFToken': csrftoken } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch {
    throw new ApiError('backend_unavailable', res.status >= 400 ? res.status : 502, null);
  }
  if (!res.ok) {
    // 403 de CSRF: o exception handler do backend devolve {error: 'forbidden',
    // detail: 'CSRF Failed: …'}, então o motivo vem em `detail`.
    const csrfMsg = res.status === 403 ? `${data?.detail || ''} ${data?.error || ''}` : '';
    if (isMutation && /csrf/i.test(csrfMsg)) {
      // Origem fora de CSRF_TRUSTED_ORIGINS: repetir não adianta — explica claramente
      // em vez de "Você não tem permissão" (que faz o usuário achar que errou a senha).
      if (/origin|referer/i.test(csrfMsg)) {
        throw csrfOriginError(res.status, data);
      }
      // Token rotacionou / expirou: renova e repete uma vez.
      if (!_csrfRetry) {
        csrfTokenCache = null;
        await ensureCsrf(true);
        return request(path, { method, body, headers, _csrfRetry: true });
      }
    }
    const msg = data?.error || data?.detail || res.statusText;
    throw new ApiError(msg, res.status, data);
  }
  // Se o endpoint de CSRF foi chamado via api.csrf(), aproveita p/ atualizar cache.
  if (path === '/api/auth/csrf' && data?.csrfToken) {
    csrfTokenCache = data.csrfToken;
  }
  return data;
}

function withCsrfRefresh(data) {
  csrfTokenCache = null;
  ensureCsrf(true).catch(() => {});
  return data;
}

export const api = {
  base: API_BASE,
  // Auth
  csrf:   ()     => request('/api/auth/csrf'),
  // O Django gira o token CSRF ao autenticar: renova logo depois, senão a
  // primeira escrita após o login sempre leva 403 e precisa ser repetida.
  signup: (body) => request('/api/auth/signup', { method: 'POST', body }).then(withCsrfRefresh),
  login:  (body) => request('/api/auth/login',  { method: 'POST', body }).then(withCsrfRefresh),
  logout: ()     => request('/api/auth/logout', { method: 'POST' }).then(withCsrfRefresh),
  me:     ()     => request('/api/auth/me'),
  // Área de administração (só is_staff)
  adminOverview:   () => request('/api/admin/overview'),
  adminUsers:      (q = '', offset = 0) => request(`/api/admin/users?q=${encodeURIComponent(q)}&offset=${offset}`),
  adminUser:       (id) => request(`/api/admin/users/${id}`),
  adminCharacters: ({ q = '', className = '', rules = '', offset = 0 } = {}) =>
    request(`/api/admin/characters?q=${encodeURIComponent(q)}&className=${className}&rules=${rules}&offset=${offset}`),
  adminCharacter:  (id) => request(`/api/admin/characters/${id}`),
  adminCampaigns:  (q = '', offset = 0) => request(`/api/admin/campaigns?q=${encodeURIComponent(q)}&offset=${offset}`),
  // Link de compartilhamento (24h)
  createShare: (character) => request('/api/shares', { method: 'POST', body: { character } }),
  getShare:    (token) => request(`/api/shares/${encodeURIComponent(token)}`),
  // Characters
  listCharacters:   () => request('/api/characters'),
  getCharacter:     (id) => request(`/api/characters/${id}`),
  createCharacter:  (body) => request('/api/characters', { method: 'POST', body }),
  updateCharacter:  (id, body) => request(`/api/characters/${id}`, { method: 'PUT', body }),
  deleteCharacter:  (id) => request(`/api/characters/${id}`, { method: 'DELETE' }),
  characterCampaigns: (id) => request(`/api/characters/${id}/campaigns`),
  dmEditCharacter:    (id, body) => request(`/api/characters/${id}/dm-edit`, { method: 'PATCH', body }),
  castSpell:          (id, body) => request(`/api/characters/${id}/cast`, { method: 'POST', body }),
  rest:               (id, body) => request(`/api/characters/${id}/rest`, { method: 'POST', body }),
  levelChoice:        (id, body) => request(`/api/characters/${id}/level-choice`, { method: 'POST', body }),
  classOptions:       (id, body) => request(`/api/characters/${id}/class-options`, { method: 'POST', body }),
  resource:           (id, body) => request(`/api/characters/${id}/resource`, { method: 'POST', body }),
  campaignLongRestAll:(id) => request(`/api/campaigns/${id}/long-rest-all`, { method: 'POST' }),
  campaignShortRestAll:(id) => request(`/api/campaigns/${id}/short-rest-all`, { method: 'POST' }),
  invAdd:        (charId, body) => request(`/api/characters/${charId}/inventory`, { method: 'POST', body }),
  invPatch:      (charId, itemId, body) => request(`/api/characters/${charId}/inventory/${itemId}`, { method: 'PATCH', body }),
  invDelete:     (charId, itemId) => request(`/api/characters/${charId}/inventory/${itemId}`, { method: 'DELETE' }),
  invConsume:    (charId, itemId) => request(`/api/characters/${charId}/inventory/${itemId}/consume`, { method: 'POST' }),
  wildShapeTransform: (id, body) => request(`/api/characters/${id}/wild-shape/transform`, { method: 'POST', body }),
  wildShapeEnd:       (id) => request(`/api/characters/${id}/wild-shape/end`, { method: 'POST' }),
  wildShapeForceEnd:  (id, body) => request(`/api/characters/${id}/wild-shape/force-end`, { method: 'POST', body }),
  // Campaigns
  listCampaigns:   () => request('/api/campaigns'),
  getCampaign:     (idOrSlug) => request(`/api/campaigns/${idOrSlug}`),
  createCampaign:  (body) => request('/api/campaigns', { method: 'POST', body }),
  updateCampaign:  (id, body) => request(`/api/campaigns/${id}`, { method: 'PUT', body }),
  deleteCampaign:  (id) => request(`/api/campaigns/${id}`, { method: 'DELETE' }),
  joinCampaign:    (body) => request('/api/campaigns/join', { method: 'POST', body }),
  // Prévia de um código de convite (nome, frase, mestre) antes de entrar.
  campaignInvite:  (code) => request(`/api/campaigns/invite/${encodeURIComponent(code)}`),
  updateMembership:(campId, membId, body) => request(`/api/campaigns/${campId}/members/${membId}`, { method: 'PUT', body }),
  removeMember:    (campId, membId) => request(`/api/campaigns/${campId}/members/${membId}`, { method: 'DELETE' }),
  rotateScreenToken:(id) => request(`/api/campaigns/${id}/rotate-screen-token`, { method: 'POST' }),
  rotateInviteCode:(id) => request(`/api/campaigns/${id}/rotate-invite-code`, { method: 'POST' }),
  // Estado da mesa: merge por chave no servidor (session, scene, sceneText, weather,
  // live, nudges, concentration, endOfEncounterWizard, levelingMode, allowMulticlass).
  patchCampaignState: (id, patch) => request(`/api/campaigns/${id}/state`, { method: 'PATCH', body: { patch } }),
  // Identidade e ajustes só do mestre (merge parcial): {name, description, tagline,
  // accent, tone, onboarding: {flag: bool}, advancedDice: bool}
  patchCampaign:   (id, body) => request(`/api/campaigns/${id}`, { method: 'PATCH', body }),
  // Capa: dataURL (jpeg/png/webp ≤ 450k) ou null para remover → {coverVer}
  setCampaignCover:(id, image) => request(`/api/campaigns/${id}/cover`, { method: image ? 'PUT' : 'DELETE', body: image ? { image } : undefined }),
  campaignCoverUrl:(c) => (c?.coverVer ? `${API_BASE}/api/campaigns/${c.id}/cover?v=${encodeURIComponent(c.coverVer)}` : null),
  // "Mostrar agora" no telão: {type:'entry', entryId, secretIds?} | {type:'recap', title, text}
  // | {type:'scene', adventureId, nodeId} | null (limpa)
  setScreenCard:   (id, card) => request(`/api/campaigns/${id}/screen-card`, { method: 'POST', body: card ?? { type: null } }),
  // Approvals
  listApprovals:  (campaignId) => request(`/api/approvals/campaign/${campaignId}`),
  grantLevelup:   (campaignId, body) => request(`/api/approvals/campaign/${campaignId}/grant-levelup`, { method: 'POST', body }),
  // { amount, characterIds?: [..] | 'all', split?: bool } — só em campanha no modo XP
  awardXp:        (campaignId, body) => request(`/api/campaigns/${campaignId}/award-xp`, { method: 'POST', body }),
  campaignItems:      (campaignId) => request(`/api/campaigns/${campaignId}/items`),
  createCampaignItem: (campaignId, item) => request(`/api/campaigns/${campaignId}/items`, { method: 'POST', body: { item } }),
  updateCampaignItem: (campaignId, itemId, item) => request(`/api/campaigns/${campaignId}/items/${itemId}`, { method: 'PATCH', body: { item } }),
  deleteCampaignItem: (campaignId, itemId) => request(`/api/campaigns/${campaignId}/items/${itemId}`, { method: 'DELETE' }),
  // Diário: params { session?, subtype?, kind?, offset?, limit? }
  listDiary:          (campaignId, params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
    return request(`/api/campaigns/${campaignId}/diary${qs ? `?${qs}` : ''}`);
  },
  createDiaryNote:    (campaignId, body) => request(`/api/campaigns/${campaignId}/diary`, { method: 'POST', body }),
  updateDiaryEntry:   (campaignId, entryId, body) => request(`/api/campaigns/${campaignId}/diary/${entryId}`, { method: 'PATCH', body }),
  deleteDiaryEntry:   (campaignId, entryId) => request(`/api/campaigns/${campaignId}/diary/${entryId}`, { method: 'DELETE' }),
  startDiarySession:  (campaignId, body = {}) => request(`/api/campaigns/${campaignId}/diary/sessions`, { method: 'POST', body }),
  renameDiarySession: (campaignId, number, title) => request(`/api/campaigns/${campaignId}/diary/sessions/${number}`, { method: 'PATCH', body: { title } }),
  // Preparação do mestre (aventuras = mapa de salas/cenas). Só mestre.
  listAdventures:   (campaignId) => request(`/api/campaigns/${campaignId}/adventures`),
  getAdventure:     (campaignId, advId) => request(`/api/campaigns/${campaignId}/adventures/${advId}`),
  createAdventure:  (campaignId, body) => request(`/api/campaigns/${campaignId}/adventures`, { method: 'POST', body }),
  updateAdventure:  (campaignId, advId, body) => request(`/api/campaigns/${campaignId}/adventures/${advId}`, { method: 'PATCH', body }),
  deleteAdventure:  (campaignId, advId) => request(`/api/campaigns/${campaignId}/adventures/${advId}`, { method: 'DELETE' }),
  adventurePlay:    (campaignId, advId, body) => request(`/api/campaigns/${campaignId}/adventures/${advId}/play`, { method: 'POST', body }),
  adventureScreen:  (campaignId, advId, body) => request(`/api/campaigns/${campaignId}/adventures/${advId}/screen`, { method: 'POST', body }),
  createApproval: (campaignId, body) => request(`/api/approvals/campaign/${campaignId}`, { method: 'POST', body }),
  reviewApproval: (approvalId, body) => request(`/api/approvals/${approvalId}/review`, { method: 'POST', body }),
  consumeApproval: (approvalId, body = {}) => request(`/api/approvals/${approvalId}/consume`, { method: 'POST', body }),
  // Dice
  rollDice:      (body) => request('/api/dice/roll', { method: 'POST', body }),
  listRigs:      (campaignId) => request(`/api/dice/campaign/${campaignId}/rigs`),
  createRig:     (campaignId, body) => request(`/api/dice/campaign/${campaignId}/rigs`, { method: 'POST', body }),
  updateRig:     (rigId, body) => request(`/api/dice/rigs/${rigId}`, { method: 'PUT', body }),
  deleteRig:     (rigId) => request(`/api/dice/rigs/${rigId}`, { method: 'DELETE' }),
  diceLog:       (campaignId) => request(`/api/dice/campaign/${campaignId}/log`),
  // Screen (público — não exige CSRF/sessão)
  screen:        (token) => request(`/api/screen/${token}`),

  // Combat
  getCombat:        (id) => request(`/api/combat/campaign/${id}`),
  startCombat:      (id) => request(`/api/combat/campaign/${id}/start`, { method: 'POST' }),
  endCombat:        (id) => request(`/api/combat/campaign/${id}/end`, { method: 'POST' }),
  resetCombat:      (id) => request(`/api/combat/campaign/${id}/reset`, { method: 'POST' }),
  addCombatant:     (id, body) => request(`/api/combat/campaign/${id}/combatants`, { method: 'POST', body }),
  updateCombatant:  (id, cid, body) => request(`/api/combat/campaign/${id}/combatants/${cid}`, { method: 'PUT', body }),
  removeCombatant:  (id, cid) => request(`/api/combat/campaign/${id}/combatants/${cid}`, { method: 'DELETE' }),
  combatAction:     (id, body) => request(`/api/combat/campaign/${id}/action`, { method: 'POST', body }),
  combatPlayerAttack:(id, body) => request(`/api/combat/campaign/${id}/player-attack`, { method: 'POST', body }),
  combatNextTurn:   (id) => request(`/api/combat/campaign/${id}/next-turn`, { method: 'POST' }),
  setCombatMap:     (id, body) => request(`/api/combat/campaign/${id}/map`, { method: 'POST', body }),

  // RollRequest
  createRoll:       (id, body) => request(`/api/rolls/campaign/${id}`, { method: 'POST', body }),
  listPendingRolls: (id) => request(`/api/rolls/campaign/${id}/pending`),
  listRecentRolls:  (id) => request(`/api/rolls/campaign/${id}/recent`),
  resolveRoll:      (rid, body) => request(`/api/rolls/${rid}/resolve`, { method: 'POST', body }),
  cancelRoll:       (rid) => request(`/api/rolls/${rid}/cancel`, { method: 'POST' }),

  // Pedido de teste do mestre para a mesa
  listChecks:    (id) => request(`/api/checks/campaign/${id}`),
  createCheck:   (id, body) => request(`/api/checks/campaign/${id}`, { method: 'POST', body }),
  myChecks:      () => request('/api/checks/mine'),
  respondCheck:  (cid, body) => request(`/api/checks/${cid}/respond`, { method: 'POST', body }),
  closeCheck:    (cid, body = {}) => request(`/api/checks/${cid}/close`, { method: 'POST', body }),
  screenCheck:   (cid, show) => request(`/api/checks/${cid}/screen`, { method: 'POST', body: { show } }),
  deleteCheck:   (cid) => request(`/api/checks/${cid}`, { method: 'DELETE' }),
};

export { ApiError, API_BASE, request };
