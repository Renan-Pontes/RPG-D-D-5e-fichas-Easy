// Ajustes do Raio-X do grupo no servidor (GET/PUT /api/campaigns/:id/party-insights,
// só o mestre) e o merge local que espelha o do servidor (world_rules.merged_party_insights):
// a tela muda na hora e o PUT sai 800 ms depois do último toque, com o que mudou.
import { request } from '../api/client.js';

export const DEFAULT_INSIGHTS = {
  v: 1, include: null, w: 0.5, hidden: [], focus: {}, rep: 'best', dc: 15,
  base: {}, style: {}, spotlights: {}, dismissed: {},
};
export const MAP_KEYS = ['focus', 'base', 'style', 'spotlights', 'dismissed'];
export const SAVE_DELAY = 800;

export const insightsApi = {
  get: (campaignId) => request(`/api/campaigns/${campaignId}/party-insights`).then(r => r.insights),
  put: (campaignId, patch) =>
    request(`/api/campaigns/${campaignId}/party-insights`, { method: 'PUT', body: { insights: patch } }).then(r => r.insights),
  // Equilíbrio na mesa (G9): contagens por sessão, sob demanda (cache de 60 s no servidor)
  history: (campaignId) => request(`/api/campaigns/${campaignId}/party-insights/history`),
};

// O último Raio-X lido ou gravado neste aparelho, por campanha: os ganchos fora do Raio-X
// (cartão de Grupo › Jogadores, Próxima sessão) usam os mesmos ajustes, estilos e momentos
// com 1 GET por campanha enquanto o app está aberto (o Raio-X sempre lê de novo ao abrir).
const memo = new Map();
export function rememberInsights(campaignId, value) {
  memo.set(String(campaignId), { value: withDefaults(value) });
}
export function cachedInsights(campaignId) {
  return memo.get(String(campaignId))?.value || null;
}
export function loadInsightsOnce(campaignId) {
  const key = String(campaignId);
  const hit = memo.get(key);
  if (hit?.value) return Promise.resolve(hit.value);
  if (hit?.promise) return hit.promise;
  const promise = insightsApi.get(campaignId)
    .then(v => { rememberInsights(campaignId, v); return cachedInsights(campaignId); })
    .catch(e => { memo.delete(key); throw e; });
  memo.set(key, { promise });
  return promise;
}

/** O gravado com os padrões (o que vier faltando ou torto volta ao padrão). */
export function withDefaults(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = { ...DEFAULT_INSIGHTS };
  for (const k of Object.keys(DEFAULT_INSIGHTS)) {
    const d = DEFAULT_INSIGHTS[k];
    const v = r[k];
    if (v === undefined) continue;
    if (MAP_KEYS.includes(k)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...v } : {};
    else if (Array.isArray(d)) out[k] = Array.isArray(v) ? v : d;
    else out[k] = v;
  }
  return out;
}

/** Aplica um patch como o servidor: null volta ao padrão; nos mapas, null apaga o item. */
export function mergeInsights(current, patch) {
  const out = withDefaults(current);
  for (const [k, v] of Object.entries(patch || {})) {
    if (!(k in DEFAULT_INSIGHTS) || k === 'v') continue;
    if (v === null) { out[k] = withDefaults({})[k]; continue; }
    if (MAP_KEYS.includes(k)) {
      const m = { ...out[k] };
      for (const [ik, iv] of Object.entries(v || {})) { if (iv === null) delete m[ik]; else m[ik] = iv; }
      out[k] = m;
    } else out[k] = v;
  }
  return out;
}

/** Junta dois patches pendentes (o 2º manda; nos mapas, item por item). */
export function joinPatches(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) {
    if (MAP_KEYS.includes(k) && v && out[k] && typeof out[k] === 'object') out[k] = { ...out[k], ...v };
    else out[k] = v;
  }
  return out;
}

/** "Restaurar padrão" do Ajustar: os ajustes de leitura (não mexe em quem entra nem nos momentos). */
export const RESET_PATCH = { w: null, hidden: null, focus: null, rep: null, dc: null, base: null };
