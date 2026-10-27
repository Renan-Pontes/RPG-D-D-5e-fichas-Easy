/* Chamadas da área Preparar (contrato C5: usa `request` do client, sem editar client.js).
   A Tela é do src/stage/stage-api.js. */
import { api, request } from '../api/client.js';
import { isOldServer } from '../api/errors.js';
import { setScreenCard } from '../stage/stage-api.js';
import { lightNode, nodeWithoutImage } from './scene-model.js';

const cid = (c) => encodeURIComponent(c);
const advUrl = (campaignId, advId) => `/api/campaigns/${cid(campaignId)}/adventures/${encodeURIComponent(advId)}`;

export const prepApi = {
  // Plano da Sessão N (só mestre). PUT faz merge por chave no servidor (as cenas, por id).
  getSessionPlan: (campaignId) => request(`/api/campaigns/${cid(campaignId)}/session-plan`),
  saveSessionPlan: (campaignId, patch) => request(`/api/campaigns/${cid(campaignId)}/session-plan`, { method: 'PUT', body: { plan: patch } }),
  // Mundo (lista leve, detalhe, criação rápida, revelar, mostrar na Tela)
  listWorld: (campaignId) => request(`/api/campaigns/${cid(campaignId)}/world`),
  getEntry: (entryId) => request(`/api/world/${entryId}`),
  createEntry: (campaignId, body) => request(`/api/campaigns/${cid(campaignId)}/world`, { method: 'POST', body }),
  updateEntry: (entryId, body) => request(`/api/world/${entryId}`, { method: 'PATCH', body }),
  deleteEntry: (entryId) => request(`/api/world/${entryId}`, { method: 'DELETE' }),
  putEntryImage: (entryId, image) => request(`/api/world/${entryId}/image`, { method: 'PUT', body: { image } }),
  reveal: (entryId, body) => request(`/api/world/${entryId}/reveal`, { method: 'POST', body }),
  showOnScreen: (campaignId, card) => setScreenCard(campaignId, card),
};

// ---------------------------------------------------------------- uma sala por vez (V6)
// A folha da Cena ligada lê e grava só a sala (sem a imagem em base64); o Plano lê as salas
// leves das cenas ligadas. Servidor ainda não atualizado (404 em HTML): cai na aventura
// inteira, como antes (mais pesado, mas a tela funciona igual). Visto o 404 uma vez, as
// próximas chamadas já vão direto à aventura inteira (sem o 404 de novo a cada sala).
let oldServer = false;
const OLD = Symbol('old-server');

/** Salas leves de uma aventura: [{id, name, kind, refs, hasImage, hasRead, encounter, checks}]. */
export async function loadRooms(campaignId, advId) {
  try {
    if (oldServer) throw OLD;
    const r = await request(`${advUrl(campaignId, advId)}/nodes`);
    return r.nodes || [];
  } catch (e) {
    if (e !== OLD && !isOldServer(e)) throw e;
    oldServer = true;
    const r = await api.getAdventure(campaignId, advId);
    return (r.adventure?.data?.nodes || []).map(lightNode);
  }
}

/** Uma sala, sem a imagem (`hasImage`). → {adventure: {id, name}, node} */
export async function loadRoom(campaignId, advId, nodeId) {
  try {
    if (oldServer) throw OLD;
    return await request(`${advUrl(campaignId, advId)}/node/${encodeURIComponent(nodeId)}`);
  } catch (e) {
    if (e !== OLD && !isOldServer(e)) throw e;
    oldServer = true;
    const r = await api.getAdventure(campaignId, advId);
    const node = (r.adventure?.data?.nodes || []).find(n => n.id === nodeId);
    if (!node) { const err = new Error('node_not_found'); err.status = 404; err.data = { error: 'node_not_found' }; throw err; }
    return { adventure: { id: r.adventure.id, name: r.adventure.name }, node: nodeWithoutImage(node) };
  }
}

/** Grava só os campos mandados daquela sala. → {adventure, node} */
export async function saveRoom(campaignId, advId, nodeId, patch) {
  try {
    if (oldServer) throw OLD;
    return await request(`${advUrl(campaignId, advId)}/node/${encodeURIComponent(nodeId)}`, { method: 'PATCH', body: patch });
  } catch (e) {
    if (e !== OLD && !isOldServer(e)) throw e;
    oldServer = true;
    // servidor antigo: lê a aventura inteira, troca a sala e regrava (o autosave de antes)
    const r = await api.getAdventure(campaignId, advId);
    const data = r.adventure?.data || { version: 1, nodes: [], edges: [] };
    const nodes = (data.nodes || []).map(n => (n.id === nodeId ? { ...n, ...patch, id: n.id } : n));
    const w = await api.updateAdventure(campaignId, advId, { data: { ...data, nodes } });
    const node = (w.adventure?.data?.nodes || []).find(n => n.id === nodeId);
    return { adventure: { id: w.adventure.id, name: w.adventure.name }, node: nodeWithoutImage(node) };
  }
}
