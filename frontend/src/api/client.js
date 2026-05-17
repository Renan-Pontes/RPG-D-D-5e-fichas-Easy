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

const PROD_DEFAULT = 'https://mestresdd5e.pythonanywhere.com';
const DEFAULT_BASE = import.meta?.env?.VITE_API_URL
  || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? PROD_DEFAULT
      : 'http://localhost:4000');
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
        const res = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: 'include' });
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

async function request(path, { method = 'GET', body, headers = {}, _csrfRetry = false } = {}) {
  const isMutation = method !== 'GET' && method !== 'HEAD';
  if (isMutation) await ensureCsrf();
  const csrftoken = csrfTokenCache || getCookie('csrftoken');
  const res = await fetch(`${API_BASE}${path}`, {
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
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    // Retry uma vez em 403 CSRF: token rotacionou / expirou.
    if (isMutation && res.status === 403 && !_csrfRetry) {
      const msg = (data?.detail || data?.error || '').toString();
      if (/csrf/i.test(msg)) {
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

export const api = {
  base: API_BASE,
  // Auth
  csrf:   ()     => request('/api/auth/csrf'),
  signup: (body) => request('/api/auth/signup', { method: 'POST', body }),
  login:  (body) => request('/api/auth/login',  { method: 'POST', body }),
  logout: ()     => request('/api/auth/logout', { method: 'POST' }),
  me:     ()     => request('/api/auth/me'),
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
  campaignLongRestAll:(id) => request(`/api/campaigns/${id}/long-rest-all`, { method: 'POST' }),
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
  updateMembership:(campId, membId, body) => request(`/api/campaigns/${campId}/members/${membId}`, { method: 'PUT', body }),
  removeMember:    (campId, membId) => request(`/api/campaigns/${campId}/members/${membId}`, { method: 'DELETE' }),
  rotateScreenToken:(id) => request(`/api/campaigns/${id}/rotate-screen-token`, { method: 'POST' }),
  rotateInviteCode:(id) => request(`/api/campaigns/${id}/rotate-invite-code`, { method: 'POST' }),
  // Approvals
  listApprovals:  (campaignId) => request(`/api/approvals/campaign/${campaignId}`),
  createApproval: (campaignId, body) => request(`/api/approvals/campaign/${campaignId}`, { method: 'POST', body }),
  reviewApproval: (approvalId, body) => request(`/api/approvals/${approvalId}/review`, { method: 'POST', body }),
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
  combatNextTurn:   (id) => request(`/api/combat/campaign/${id}/next-turn`, { method: 'POST' }),
  setCombatMap:     (id, body) => request(`/api/combat/campaign/${id}/map`, { method: 'POST', body }),

  // RollRequest
  createRoll:       (id, body) => request(`/api/rolls/campaign/${id}`, { method: 'POST', body }),
  listPendingRolls: (id) => request(`/api/rolls/campaign/${id}/pending`),
  listRecentRolls:  (id) => request(`/api/rolls/campaign/${id}/recent`),
  resolveRoll:      (rid, body) => request(`/api/rolls/${rid}/resolve`, { method: 'POST', body }),
  cancelRoll:       (rid) => request(`/api/rolls/${rid}/cancel`, { method: 'POST' }),
};

export { ApiError, API_BASE };
