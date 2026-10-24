import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from './group-model.js';
import { mesaLayer } from '../shell/MesaSheet.jsx';

/**
 * Confirmação no estilo do app (substitui window.confirm no Grupo e na Crônica).
 * Uso: const [ask, confirmUi] = useGroupConfirm(lang);
 *      if (await ask({ title, text, okLabel, danger })) …
 *      … e renderize {confirmUi}.
 * Quando o useConfirm() compartilhado (components/ConfirmDialog.jsx, WP3)
 * existir, dá para trocar este hook por ele sem mudar quem chama.
 * Desenhada na camada da mesa (portal, src/shell/MesaSheet.jsx › mesaLayer), por
 * cima de uma folha aberta; no celular vira folha da altura do conteúdo
 * (src/shell/mesa.css). O foco volta a quem abriu.
 */
export function useGroupConfirm(lang) {
  const [req, setReq] = useState(null);
  const resolver = useRef(null);

  const ask = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setReq(opts || {});
  }), []);

  const close = useCallback((value) => {
    resolver.current?.(value);
    resolver.current = null;
    setReq(null);
  }, []);

  const modal = req ? <ConfirmModal lang={lang} {...req} onAnswer={close} /> : null;
  const layer = modal ? mesaLayer() : null;
  const ui = modal && layer ? createPortal(modal, layer) : modal;
  return [ask, ui];
}

function ConfirmModal({ lang, title, text, okLabel, cancelLabel, danger, onAnswer }) {
  const okRef = useRef(null);
  const [opener] = useState(() => (typeof document !== 'undefined' ? document.activeElement : null));
  useEffect(() => () => {
    if (opener && opener !== document.body && opener.isConnected) { try { opener.focus({ preventScroll: true }); } catch { /* ok */ } }
  }, [opener]);
  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onAnswer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAnswer]);
  return (
    <div className="modal-backdrop grp-confirm-backdrop" onClick={(e) => { e.stopPropagation(); onAnswer(false); }}>
      <div className="modal grp-confirm" role="alertdialog" aria-modal="true" aria-labelledby="grp-confirm-title"
        onClick={e => e.stopPropagation()}>
        <h3 id="grp-confirm-title">{title || t(lang, 'Tem certeza?', 'Are you sure?')}</h3>
        {text && <p className="muted">{text}</p>}
        <div className="grp-confirm-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onAnswer(false)}>
            {cancelLabel || t(lang, 'Cancelar', 'Cancel')}
          </button>
          <button type="button" ref={okRef} className={`btn btn-sm ${danger ? 'btn-danger grp-danger' : 'btn-primary'}`} onClick={() => onAnswer(true)}>
            {okLabel || t(lang, 'Confirmar', 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Toast curto do Grupo (aviso de confirmação, ex.: "Thalion recebeu Poção de Cura"). */
export function GroupToast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(onDone, toast.ms || 3500);
    return () => clearTimeout(id);
  }, [toast, onDone]);
  if (!toast) return null;
  return (
    <div className={`grp-toast ${toast.kind === 'error' ? 'is-error' : ''}`} role={toast.kind === 'error' ? 'alert' : 'status'} aria-live="polite">
      <span>{toast.text}</span>
      {toast.action && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { toast.action.run(); onDone(); }}>{toast.action.label}</button>}
    </div>
  );
}
