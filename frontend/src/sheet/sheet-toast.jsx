/* Aviso da ficha com uma ação (quase sempre "Desfazer"): o que o jogador acabou de mudar
 * (PV, uso de recurso) e um jeito de voltar atrás por alguns segundos. Fica fixo no pé da
 * tela, do lado oposto ao botão de dados, e não bloqueia nada (role="status").
 *
 *   const toast = useSheetToast();            // null fora da ficha (editor do mestre)
 *   toast?.show({ text: '−7 PV', actionLabel: 'Desfazer', onAction: () => ..., ms: 6000 });
 *
 * A ficha (components/Sheet.jsx) é quem guarda o estado (useSheetToastState) e desenha o
 * <FhToast/>; os componentes de dentro só chamam show(). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const SheetToastContext = createContext(null);
export const useSheetToast = () => useContext(SheetToastContext);

export function useSheetToastState() {
  const [toast, setToast] = useState(null);
  const show = useCallback((t) => setToast({ id: Date.now() + Math.random(), ms: 6000, ...t }), []);
  const hide = useCallback(() => setToast(null), []);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(hide, toast.ms);
    return () => clearTimeout(id);
  }, [toast, hide]);
  const api = useMemo(() => ({ show, hide }), [show, hide]);
  return { toast, api };
}

export function FhToast({ toast, onClose, lang = 'pt' }) {
  if (!toast) return null;
  return (
    <div key={toast.id} className={`fh-toast no-print${toast.tone ? ` is-${toast.tone}` : ''}`} role="status" aria-live="polite">
      <span className="fh-toast-text">{toast.text}</span>
      {toast.onAction && (
        <button type="button" className="fh-toast-act" onClick={() => { toast.onAction(); onClose(); }}>
          {toast.actionLabel || (lang === 'pt' ? 'Desfazer' : 'Undo')}
        </button>
      )}
      <button type="button" className="fh-toast-x" onClick={onClose} aria-label={lang === 'pt' ? 'Fechar aviso' : 'Dismiss'}>✕</button>
    </div>
  );
}
