// Chamadas do Grupo/Crônica que ainda não estão no api client (contrato C5:
// cada pacote usa `request` direto, sem editar client.js). A Tela é do
// src/stage/stage-api.js.
import { request } from '../api/client.js';
import { setScreenCard } from '../stage/stage-api.js';

export const groupApi = {
  /** PATCH /campaigns/:id/state {patch} → {state}. Merge por chave no servidor. */
  patchState: (campaignId, patch) =>
    request(`/api/campaigns/${campaignId}/state`, { method: 'PATCH', body: { patch } }),
  /** Cartão antigo da Tela (stage-api.setScreenCard) → {card}. card = null tira da Tela. */
  showOnScreen: (campaignId, card) => setScreenCard(campaignId, card ?? null),
  /** POST /campaigns/:id/leave — o jogador sai da mesa (a ficha fica com ele). */
  leaveCampaign: (campaignId) =>
    request(`/api/campaigns/${campaignId}/leave`, { method: 'POST', body: {} }),
  /** Eventos de XP do diário (para o histórico de pedidos). */
  xpEvents: (campaignId) =>
    request(`/api/campaigns/${campaignId}/diary?subtype=xp&limit=30`),
};
