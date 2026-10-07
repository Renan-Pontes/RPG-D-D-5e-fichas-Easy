// Chamadas do "Mundo vivo" do jogador (ecos da mesa e registro de leitura).
// Usa o `request` compartilhado (sessão + CSRF), sem editar client.js.
import { request } from '../../api/client.js';

/** POST /api/world/:pk/react {kind} — marca uma reação (ou a estrela). */
export function addReaction(entryId, kind) {
  return request(`/api/world/${entryId}/react`, { method: 'POST', body: { kind } });
}

/** DELETE /api/world/:pk/react {kind} — desmarca (kind também na query, por garantia). */
export function removeReaction(entryId, kind) {
  return request(`/api/world/${entryId}/react?kind=${encodeURIComponent(kind)}`, { method: 'DELETE', body: { kind } });
}

/** POST /api/world/:pk/view — "li este cartão" (o servidor limita a 1/min). */
export function registerView(entryId) {
  return request(`/api/world/${entryId}/view`, { method: 'POST', body: {} });
}
