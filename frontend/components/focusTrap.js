/* Foco de teclado em diálogos (Modal em Shared.jsx e ConfirmDialog.jsx).
 * aria-modal="true" promete que nada atrás do diálogo é alcançável: aqui o Tab dá a
 * volta dentro dele e o foco volta para quem abriu ao fechar. Sem dependências. */

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  'textarea:not([disabled])', 'summary', '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Elementos focáveis e visíveis dentro de `root`, na ordem do documento. */
export function focusables(root) {
  if (!root) return [];
  return [...root.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length > 0 && el.getAttribute('aria-hidden') !== 'true');
}

/** Este diálogo é o de cima? (um confirm aberto sobre um modal fica depois dele no documento) */
export function isTopDialog(root) {
  if (!root || typeof document === 'undefined') return false;
  const all = document.querySelectorAll('[aria-modal="true"]');
  return all.length === 0 || all[all.length - 1] === root || root.contains(all[all.length - 1]);
}

/** No keydown: prende o Tab dentro de `root` (dá a volta do último para o primeiro). */
export function trapTab(e, root) {
  if (e.key !== 'Tab' || !root || !isTopDialog(root)) return;
  const items = focusables(root);
  const active = document.activeElement;
  if (items.length === 0) { e.preventDefault(); root.focus?.({ preventScroll: true }); return; }
  const first = items[0];
  const last = items[items.length - 1];
  if (!root.contains(active)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
  if (e.shiftKey && (active === first || active === root)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}

/** Devolve o foco a `el` se ele ainda estiver na página (ao fechar o diálogo). */
export function restoreFocus(el) {
  try { if (el && el.isConnected && typeof el.focus === 'function') el.focus({ preventScroll: true }); } catch { /* ok */ }
}
