// Cliente HTTP para a API Django.
//
// Auth: sessão via cookie (sessionid). Toda requisição mutante envia
// X-CSRFToken lido do cookie csrftoken — garantimos que ele existe ao
// chamar /api/auth/csrf no boot.
//
// API_BASE vem de VITE_API_URL em produção; em dev cai pra localhost:4000.

const DEFAULT_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:4000';
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

let csrfPromise = null;
async function ensureCsrf() {
  if (getCookie('csrftoken')) return;
  if (!csrfPromise) {
    csrfPromise = fetch(`${API_BASE}/api/auth/csrf`, { credentials: 'include' })
      .catch(() => null)
      .finally(() => { csrfPromise = null; });
  }
  await csrfPromise;
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const isMutation = method !== 'GET' && method !== 'HEAD';
  if (isMutation) await ensureCsrf();
  const csrftoken = getCookie('csrftoken');
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
    const msg = data?.error || data?.detail || res.statusText;
    throw new ApiError(msg, res.status, data);
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
