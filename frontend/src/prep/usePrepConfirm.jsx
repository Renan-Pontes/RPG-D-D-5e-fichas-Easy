import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mesaLayer } from '../shell/MesaSheet.jsx';
import './next-session.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

/**
 * Confirmação em modal (substitui o window.confirm na Preparação e nos Itens).
 * Uso: const [confirm, confirmEl] = usePrepConfirm(lang);
 *      if (!(await confirm({ title, text, ok, danger }))) return;  … render {confirmEl}
 * (Quando o `useConfirm()` compartilhado do WP3 existir, dá para trocar aqui.)
 * Desenhada na camada da mesa (portal, src/shell/MesaSheet.jsx › mesaLayer), por
 * cima de uma folha aberta; no celular vira folha da altura do conteúdo
 * (src/shell/mesa.css). O foco volta a quem abriu.
 */
export default function usePrepConfirm(lang) {
  const [ask, setAsk] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setAsk(typeof opts === 'string' ? { text: opts } : opts);
  }), []);

  const close = (v) => { resolver.current?.(v); resolver.current = null; setAsk(null); };
  useEffect(() => () => resolver.current?.(false), []);

  const modal = ask ? <ConfirmModal ask={ask} lang={lang} onClose={close} /> : null;
  const layer = modal ? mesaLayer() : null;
  const el = modal && layer ? createPortal(modal, layer) : modal;
  return [confirm, el];
}

function ConfirmModal({ ask, lang, onClose }) {
  const okRef = useRef(null);
  const [opener] = useState(() => (typeof document !== 'undefined' ? document.activeElement : null));
  useEffect(() => () => {
    if (opener && opener !== document.body && opener.isConnected) { try { opener.focus({ preventScroll: true }); } catch { /* ok */ } }
  }, [opener]);
  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop prep-confirm-backdrop" onClick={(e) => { e.stopPropagation(); onClose(false); }}>
      <div className="modal prep-confirm" role="alertdialog" aria-modal="true" aria-labelledby="prep-confirm-title" onClick={e => e.stopPropagation()}>
        <h3 id="prep-confirm-title">{ask.title || t(lang, 'Tem certeza?', 'Are you sure?')}</h3>
        {ask.text && <p>{ask.text}</p>}
        <div className="prep-modal-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onClose(false)}>{ask.cancel || t(lang, 'Cancelar', 'Cancel')}</button>
          <button type="button" ref={okRef} className={`btn btn-sm ${ask.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => onClose(true)}>
            {ask.ok || t(lang, 'Confirmar', 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
