import { useCallback, useEffect } from 'react';
import { t } from './group-model.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';

/**
 * Confirmação do Grupo e da Crônica (substitui window.confirm).
 * Uso: const [ask, confirmUi] = useGroupConfirm(lang);
 *      if (await ask({ title, text, okLabel, danger })) …
 *      … e renderize {confirmUi}.
 * V14: um sistema só de confirmação no app — o `confirmDialog` compartilhado
 * (components/ConfirmDialog.jsx), na mesma aparência de folha pequena da mesa, com os
 * mesmos textos ("Tem certeza?" quando não há título). `confirmUi` fica null.
 */
export function useGroupConfirm(lang) {
  const ask = useCallback((opts = {}) => confirmDialog({
    lang,
    title: opts.title || t(lang, 'Tem certeza?', 'Are you sure?'),
    message: opts.text,
    confirmLabel: opts.okLabel,
    cancelLabel: opts.cancelLabel,
    danger: !!opts.danger,
  }), [lang]);
  return [ask, null];
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
