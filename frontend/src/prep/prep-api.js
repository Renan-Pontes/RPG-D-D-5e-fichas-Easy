/* Chamadas da área Preparar (contrato C5: usa `request` do client, sem editar client.js). */
import { request } from '../api/client.js';

const cid = (c) => encodeURIComponent(c);

export const prepApi = {
  // Plano da próxima sessão (só mestre). PUT faz merge por chave no servidor.
  getSessionPlan: (campaignId) => request(`/api/campaigns/${cid(campaignId)}/session-plan`),
  saveSessionPlan: (campaignId, patch) => request(`/api/campaigns/${cid(campaignId)}/session-plan`, { method: 'PUT', body: { plan: patch } }),
  // Mundo (lista leve, detalhe, criação rápida, revelar, mostrar no telão)
  listWorld: (campaignId) => request(`/api/campaigns/${cid(campaignId)}/world`),
  getEntry: (entryId) => request(`/api/world/${entryId}`),
  createEntry: (campaignId, body) => request(`/api/campaigns/${cid(campaignId)}/world`, { method: 'POST', body }),
  reveal: (entryId, body) => request(`/api/world/${entryId}/reveal`, { method: 'POST', body }),
  showOnScreen: (campaignId, card) => request(`/api/campaigns/${cid(campaignId)}/screen-card`, { method: 'POST', body: card }),
};
