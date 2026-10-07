// Chamadas do Grupo/Crônica que ainda não estão no api client (contrato C5:
// cada pacote usa `request` direto, sem editar client.js).
import { request } from '../api/client.js';

export const groupApi = {
  /** PATCH /campaigns/:id/state {patch} → {state}. Merge por chave no servidor. */
  patchState: (campaignId, patch) =>
    request(`/api/campaigns/${campaignId}/state`, { method: 'PATCH', body: { patch } }),
  /** POST /campaigns/:id/screen-card → {card}. card = null tira o cartão do telão. */
  showOnScreen: (campaignId, card) =>
    request(`/api/campaigns/${campaignId}/screen-card`, { method: 'POST', body: card ?? { card: null } }),
  /** POST /campaigns/:id/leave — o jogador sai da mesa (a ficha fica com ele). */
  leaveCampaign: (campaignId) =>
    request(`/api/campaigns/${campaignId}/leave`, { method: 'POST', body: {} }),
  /** Eventos de XP do diário (para o histórico de pedidos). */
  xpEvents: (campaignId) =>
    request(`/api/campaigns/${campaignId}/diary?subtype=xp&limit=30`),
};
