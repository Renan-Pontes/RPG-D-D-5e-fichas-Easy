// API do Mundo da campanha (contrato C4/C5 do rework do mestre).
//
// Usa o `request` de src/api/client.js (sessão + CSRF). Todas as funções
// devolvem o JSON do backend já "desembrulhado" quando faz sentido
// (ex.: getEntry → entry). Erros chegam como ApiError (status, data).
//
// Outros pacotes importam daqui — mantenha os nomes estáveis.
import { request, API_BASE } from '../api/client.js';

const cid = (id) => encodeURIComponent(id);

/** URL absoluta de uma imagem do Mundo (o backend devolve '/api/world/…'). */
export function worldImageUrl(entryOrUrl) {
  const url = typeof entryOrUrl === 'string' ? entryOrUrl : entryOrUrl?.imageUrl;
  if (!url) return null;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${API_BASE || ''}${url}`;
}

/** Lista leve. Mestre: {entries, count, max}; jogador: {entries, seenAt}. */
export function listWorld(campaignId) {
  return request(`/api/campaigns/${cid(campaignId)}/world`);
}

/** Cria uma entrada. Só `kind` e `name` são obrigatórios. → entry (WorldEntryFull) */
export async function createEntry(campaignId, fields) {
  const r = await request(`/api/campaigns/${cid(campaignId)}/world`, { method: 'POST', body: fields });
  return r.entry;
}

/** Detalhe (filtrado por papel no servidor). → entry */
export async function getEntry(id) {
  const r = await request(`/api/world/${id}`);
  return r.entry;
}

/**
 * Atualiza campos. Passe `version` para checagem otimista: se divergir, o
 * servidor responde 409 e esta função lança ApiError com
 * `e.status === 409` e `e.data.entry` (a versão atual). Use isConflict(e).
 */
export async function updateEntry(id, fields) {
  const r = await request(`/api/world/${id}`, { method: 'PATCH', body: fields });
  return r.entry;
}

export function deleteEntry(id) {
  return request(`/api/world/${id}`, { method: 'DELETE' });
}

/** Sobe a imagem (dataURL jpeg/png/webp ≤ 450k chars). → {imageVer, imageUrl} */
export function putEntryImage(id, dataUrl) {
  return request(`/api/world/${id}/image`, { method: 'PUT', body: { image: dataUrl } });
}

export function deleteEntryImage(id) {
  return request(`/api/world/${id}/image`, { method: 'DELETE' });
}

/**
 * Revela/oculta (ação do mestre).
 * opts: {visibility?, secrets?: {s1: true}, pins?: {p1: true}, logDiary = true, lang}
 * → entry (versão nova)
 */
export async function revealEntry(id, { visibility, secrets, pins, logDiary = true, lang = 'pt' } = {}) {
  const body = { logDiary, lang };
  if (visibility) body.visibility = visibility;
  if (secrets) body.secrets = secrets;
  if (pins) body.pins = pins;
  const r = await request(`/api/world/${id}/reveal`, { method: 'POST', body });
  return r.entry;
}

/** Cria a vila de exemplo. → {entries, adventureId}. 409 world_not_empty se já houver mundo. */
export function createSampleWorld(campaignId, lang = 'pt') {
  return request(`/api/campaigns/${cid(campaignId)}/world/sample`, { method: 'POST', body: { lang } });
}

/** Jogador abriu a aba Mundo (zera o "Novo!"). → {seenAt} */
export function markWorldSeen(campaignId) {
  return request(`/api/campaigns/${cid(campaignId)}/world/seen`, { method: 'POST', body: {} });
}

/** Plano da próxima sessão (mestre). → plan */
export async function getSessionPlan(campaignId) {
  const r = await request(`/api/campaigns/${cid(campaignId)}/session-plan`);
  return r.plan;
}

/** Merge por chave no servidor. → plan */
export async function saveSessionPlan(campaignId, patch) {
  const r = await request(`/api/campaigns/${cid(campaignId)}/session-plan`, { method: 'PUT', body: { plan: patch } });
  return r.plan;
}

/**
 * "Mostrar no telão". card: {type:'entry', entryId, secretIds?} | {type:'recap', title, text}
 * | {type:'scene', adventureId, nodeId} | null (limpa). → {card}
 * Entrada oculta → 400 entry_hidden (mostrar não revela).
 */
export function showOnScreen(campaignId, card) {
  return request(`/api/campaigns/${cid(campaignId)}/screen-card`, { method: 'POST', body: card === null ? { card: null } : card });
}

/** Atalho: mostra um cartão do Mundo no telão. */
export function showEntryOnScreen(campaignId, entryId, secretIds) {
  return showOnScreen(campaignId, { type: 'entry', entryId, ...(secretIds?.length ? { secretIds } : {}) });
}

export const isConflict = (e) => e?.status === 409 && e?.data?.error === 'version_conflict';

const WORLD_ERRORS = {
  version_conflict: ['Alguém alterou este cartão em outra aba.', 'Someone changed this card in another tab.'],
  image_too_large: ['Imagem grande demais. Tente uma menor.', 'Image too large. Try a smaller one.'],
  invalid_image: ['Formato de imagem não aceito (use JPG, PNG ou WebP).', 'Image format not accepted (use JPG, PNG or WebP).'],
  not_image: ['Esse arquivo não é uma imagem.', 'That file is not an image.'],
  read_failed: ['Não consegui ler o arquivo.', 'Could not read the file.'],
  too_many_entries: ['O mundo chegou ao limite de 500 cartões.', 'The world reached the 500-card limit.'],
  world_not_empty: ['O exemplo só pode ser criado num mundo vazio.', 'The sample can only be created in an empty world.'],
  missing_name: ['Dê um nome ao cartão.', 'Give the card a name.'],
  entry_hidden: ['Revele o cartão antes de mostrar no telão.', 'Reveal the card before showing it on screen.'],
  too_many_secrets: ['No máximo 20 segredos por cartão.', 'At most 20 secrets per card.'],
  too_many_pins: ['No máximo 100 marcadores por mapa.', 'At most 100 pins per map.'],
  too_many_links: ['No máximo 40 ligações por cartão.', 'At most 40 links per card.'],
  body_too_long: ['Texto longo demais (máx. 20 mil caracteres).', 'Text too long (max 20k characters).'],
  notes_too_long: ['Notas longas demais (máx. 20 mil caracteres).', 'Notes too long (max 20k characters).'],
};

/** Mensagem legível para erros do Mundo; cai no `fallback(e, lang)` (ex.: errorMessage). */
export function worldErrorText(e, lang = 'pt', fallback) {
  const code = e?.data?.error || e?.message;
  const pair = WORLD_ERRORS[code];
  if (pair) return lang === 'pt' ? pair[0] : pair[1];
  if (fallback) return fallback(e, lang);
  return lang === 'pt' ? 'Algo deu errado. Tente de novo.' : 'Something went wrong. Try again.';
}
