// Cliente HTTP enxuto. Usa cookies (credentials: 'include') para auth.

const DEFAULT_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:4000';
const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__) || DEFAULT_BASE;

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new ApiError(data?.error || res.statusText, res.status, data);
  }
  return data;
}

export const api = {
  base: API_BASE,
  // Auth
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
  // Screen (público)
  screen:        (token) => request(`/api/screen/${token}`),
};

export { ApiError, API_BASE };
