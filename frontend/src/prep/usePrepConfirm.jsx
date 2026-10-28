import { useCallback } from 'react';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import './next-session.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

/**
 * Confirmação da Preparação e dos Itens (substitui o window.confirm).
 * Uso: const [confirm, confirmEl] = usePrepConfirm(lang);
 *      if (!(await confirm({ title, text, ok, cancel, danger }))) return;  … render {confirmEl}
 * V14: um sistema só de confirmação no app — este hook é o `confirmDialog` compartilhado
 * (components/ConfirmDialog.jsx), com a mesma aparência de folha pequena da mesa e os
 * mesmos textos de antes ("Tem certeza?" quando não há título). `confirmEl` fica null
 * (quem chama ainda o desenha; não atrapalha).
 */
export default function usePrepConfirm(lang) {
  const confirm = useCallback((opts) => {
    const o = typeof opts === 'string' ? { text: opts } : (opts || {});
    return confirmDialog({
      lang,
      title: o.title || t(lang, 'Tem certeza?', 'Are you sure?'),
      message: o.text,
      confirmLabel: o.ok,
      cancelLabel: o.cancel,
      danger: !!o.danger,
    });
  }, [lang]);
  return [confirm, null];
}
