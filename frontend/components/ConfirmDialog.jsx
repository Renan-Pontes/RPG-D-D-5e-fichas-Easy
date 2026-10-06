/* Diálogo de confirmação no estilo do app — substitui window.confirm().
 *
 * Uso (não precisa de provider):
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title, message, confirmLabel, cancelLabel, danger: true }))) return;
 *
 * Também aceita só uma string: `await confirm('Apagar sala?')`.
 * Fora de componentes: `import { confirmDialog } from '…/ConfirmDialog.jsx'`.
 * Resolve `true` em Confirmar e `false` em Cancelar / Esc / clique fora.
 */
import { useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

function langNow() {
  try { return localStorage.getItem('dnd5e-forge:lang') || 'pt'; } catch { return 'pt'; }
}

export function ConfirmDialogView({ title, message, confirmLabel, cancelLabel, danger = false, lang, onAnswer }) {
  const L = lang || langNow();
  const okRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    okRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onAnswer(false); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      try { prev?.focus?.(); } catch { /* ok */ }
    };
  }, [onAnswer]);
  return (
    <div className="modal-backdrop confirm-backdrop" onClick={() => onAnswer(false)}>
      <div
        className={`modal confirm-dialog ${danger ? 'is-danger' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? 'confirm-dialog-title' : undefined}
        aria-describedby="confirm-dialog-msg"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 id="confirm-dialog-title" className="confirm-dialog-title">{title}</h2>}
        {message && <p id="confirm-dialog-msg" className="confirm-dialog-msg">{message}</p>}
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={() => onAnswer(false)}>
            {cancelLabel || (L === 'en' ? 'Cancel' : 'Cancelar')}
          </button>
          <button type="button" ref={okRef} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => onAnswer(true)}>
            {confirmLabel || (L === 'en' ? 'Confirm' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Abre o diálogo e devolve uma Promise<boolean>. */
export function confirmDialog(opts) {
  const o = typeof opts === 'string' ? { message: opts } : (opts || {});
  if (typeof document === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.className = 'confirm-dialog-host';
    document.body.appendChild(host);
    const root = createRoot(host);
    let done = false;
    const answer = (v) => {
      if (done) return;
      done = true;
      resolve(!!v);
      // desmonta fora do ciclo de render atual
      setTimeout(() => { root.unmount(); host.remove(); }, 0);
    };
    root.render(<ConfirmDialogView {...o} onAnswer={answer} />);
  });
}

/** Hook: devolve a função `confirm(opts) → Promise<boolean>`. */
export function useConfirm(defaults) {
  return useCallback((opts) => {
    const o = typeof opts === 'string' ? { message: opts } : (opts || {});
    return confirmDialog({ ...(defaults || {}), ...o });
  }, [defaults]);
}

export default useConfirm;
