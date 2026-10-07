// Planos: chamadas à API + "barramento" de eventos para o aviso de limite.
//
// Endpoints (backend, P1):
//   GET   /api/plans                      → catálogo {plans, addons, contactEmail?}
//   GET   /api/me/plan                    → plano, extras, limites e uso da conta
//   POST  /api/me/plan/checkout           → {plan|addon, quantity} (pagamento: ainda "em breve")
//   GET/PATCH /api/admin/users/<id>/plan  → (admin) {plan, addons:{slug:qtd}, validUntil}
//   POST  /api/campaigns/<id>/close       → encerra (30 dias somente leitura)
//   POST  /api/campaigns/<id>/reopen      → reabre (se couber no plano)
//   POST  /api/characters {..., inviteCode} → {character, join:{sponsored, dmName, slug…}}
//
// Erro de limite: {error:'plan_limit', limit, used, max, plan} → showPlanLimit(e)
// abre o LimitDialog (montado uma vez em app.jsx).
import { request } from '../api/client.js';
import { normalizeCatalog, normalizeMyPlan, planLimitFrom } from './plans-logic.js';

export const plansApi = {
  catalog: () => request('/api/plans'),
  me: () => request('/api/me/plan'),
  checkout: (body) => request('/api/me/plan/checkout', { method: 'POST', body }),
  adminSetPlan: (userId, body) => request(`/api/admin/users/${userId}/plan`, { method: 'PATCH', body }),
  adminGetPlan: (userId) => request(`/api/admin/users/${userId}/plan`),
  closeCampaign: (id) => request(`/api/campaigns/${id}/close`, { method: 'POST' }),
  reopenCampaign: (id) => request(`/api/campaigns/${id}/reopen`, { method: 'POST' }),
  /** Cria o personagem já dentro da mesa (usa vaga do mestre se o jogador estiver no limite). */
  createCharacterAtTable: (body, inviteCode) => request('/api/characters', { method: 'POST', body: { ...body, inviteCode } }),
};

// ---------------------------------------------------------------- cache leve

let catalogCache = null;
let catalogPromise = null;
/** Catálogo normalizado (cacheado; cai no padrão se a API falhar). */
export function loadCatalog({ force = false } = {}) {
  if (catalogCache && !force) return Promise.resolve(catalogCache);
  if (!catalogPromise) {
    catalogPromise = plansApi.catalog()
      .then(r => { catalogCache = normalizeCatalog(r); return catalogCache; })
      .catch(() => normalizeCatalog(null))
      .finally(() => { catalogPromise = null; });
  }
  return catalogPromise;
}

/** Plano da conta normalizado (sem cache: o uso muda o tempo todo). */
export async function loadMyPlan() {
  const [cat, me] = await Promise.all([loadCatalog(), plansApi.me()]);
  return normalizeMyPlan(me, cat);
}

// ---------------------------------------------------------------- pagamento

/** Contato para "Pagamento em breve" (VITE_CONTACT_EMAIL ou o que a API mandar). */
export const CONTACT_EMAIL = import.meta.env?.VITE_CONTACT_EMAIL || '';

/**
 * PONTO DE INTEGRAÇÃO DO PAGAMENTO (Mercado Pago, depois).
 * Chama POST /api/me/plan/checkout {plan|addon, quantity}. Hoje o backend
 * responde {available:false, contact} e a tela mostra "Pagamento em breve — fale
 * com a gente". Quando houver checkout, ele responde {available:true, checkoutUrl}
 * e o navegador vai para lá; o webhook grava UserPlan(origin='payment').
 * → {status:'redirect'} | {status:'soon', email}
 */
export async function startCheckout({ kind, slug, qty = 1 } = {}) {
  try {
    const r = await plansApi.checkout({ [kind === 'addon' ? 'addon' : 'plan']: slug, quantity: qty });
    if (r?.available && r.checkoutUrl) {
      window.location.assign(r.checkoutUrl);
      return { status: 'redirect' };
    }
    return { status: 'soon', email: r?.contact?.email || '' };
  } catch {
    return { status: 'soon', email: '' };
  }
}

// ---------------------------------------------------------------- eventos

const LIMIT_EVENT = 'forja:plan-limit';
const OPEN_PLAN_EVENT = 'forja:open-plan';

/**
 * Se `e` for erro de limite do plano, abre o aviso amigável e devolve true.
 * Uso: `catch (e) { if (showPlanLimit(e)) return; setError(errorMessage(e)); }`
 * `extra` (opcional): {dmName, campaignName} para o texto das vagas.
 */
export function showPlanLimit(e, extra = {}) {
  const info = planLimitFrom(e);
  if (!info) return false;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LIMIT_EVENT, { detail: { ...info, ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v)) } }));
  }
  return true;
}

export function onPlanLimit(fn) {
  const h = (ev) => fn(ev.detail);
  window.addEventListener(LIMIT_EVENT, h);
  return () => window.removeEventListener(LIMIT_EVENT, h);
}

/** Abre a tela "Meu plano" de qualquer lugar (app.jsx escuta). */
export function openMyPlan() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(OPEN_PLAN_EVENT));
}

export function onOpenMyPlan(fn) {
  window.addEventListener(OPEN_PLAN_EVENT, fn);
  return () => window.removeEventListener(OPEN_PLAN_EVENT, fn);
}
