// API da área Jogar (contrato C5): usa o `request` de src/api/client.js,
// sem editar client.js. Endpoints do WP2 (prévia de ataque, PATCH de state,
// cartão do telão) e leitura de aventuras para o painel "Nesta cena".
import { request } from '../api/client.js';

const cid = (id) => encodeURIComponent(id);

/**
 * Prévia de ataque de monstro (AttackPreview, C2). Rola e calcula SEM aplicar
 * nada (nem PV, nem recarga, nem dado preparado).
 * body: {attackerId, targetId, actionIndex, advantage?, disadvantage?, attackRoll?}
 */
export function attackPreview(campaignId, body) {
  return request(`/api/combat/campaign/${cid(campaignId)}/attack-preview`, { method: 'POST', body });
}

/**
 * Aplica um ataque com os valores que o mestre aprovou (prévia ou dado físico).
 * body: {attackerId, targetId, actionIndex, attackRoll, damage: [{amount, type}], hit, crit, force?, consumeRig?}
 */
export function applyAttack(campaignId, body) {
  return request(`/api/combat/campaign/${cid(campaignId)}/action`, { method: 'POST', body: { action: 'attack', ...body } });
}

/** Ação de combate genérica (dano, cura, condição…). */
export function combatAction(campaignId, body) {
  return request(`/api/combat/campaign/${cid(campaignId)}/action`, { method: 'POST', body });
}

/** PATCH de state por chave (merge no servidor). → {state} */
export function patchState(campaignId, patch) {
  return request(`/api/campaigns/${cid(campaignId)}/state`, { method: 'PATCH', body: { patch } });
}

/** "Mostrar agora" no telão. card: {type:'entry'|'recap'|'scene', …} ou null (tira). → {card} */
export function setScreenCard(campaignId, card) {
  return request(`/api/campaigns/${cid(campaignId)}/screen-card`, { method: 'POST', body: card ? card : { card: null } });
}

/** O que o telão está mostrando agora (rota pública, filtrada). */
export function getScreen(token) {
  return request(`/api/screen/${encodeURIComponent(token)}`);
}

export function rotateScreenToken(campaignId) {
  return request(`/api/campaigns/${cid(campaignId)}/rotate-screen-token`, { method: 'POST' });
}

export function listAdventures(campaignId) {
  return request(`/api/campaigns/${cid(campaignId)}/adventures`);
}

export function getAdventure(campaignId, advId) {
  return request(`/api/campaigns/${cid(campaignId)}/adventures/${advId}`);
}
