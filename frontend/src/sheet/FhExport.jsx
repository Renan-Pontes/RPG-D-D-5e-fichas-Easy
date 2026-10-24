/* Modal "Exportar" da ficha (visual "Ficha Forjada", src/sheet/ficha.css: .fh-export-*).
 * Junta as saídas que eram botões soltos na barra de ações: cada uma é uma linha grande
 * com ícone, nome e o que ela faz, e a ação acontece ali mesmo (runExport chama o handler
 * de sempre, com os mesmos toasts). Lista e despacho: src/sheet/export-options.js.
 * - Enquanto uma saída trabalha, a linha mostra "Gerando…" e as outras não respondem
 *   (aria-disabled, não disabled: o foco fica onde está). Deu certo: o modal fecha. Não
 *   deu (o handler já mostrou o toast do erro): fica aberto para tentar de novo.
 * - Teclado: o foco vai para a 1ª linha ao abrir, Tab circula dentro do modal e Esc fecha
 *   (o Esc é do Modal do app). Quem abriu devolve o foco ao botão "Exportar". */
import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icons.jsx';
import { Modal } from '../../components/Shared.jsx';
import { EXPORT_OPTIONS, exportText, runExport } from './export-options.js';

export default function FhExportModal({ lang, char, handlers, onClose }) {
  const pt = lang === 'pt';
  const [busy, setBusy] = useState('');
  const listRef = useRef(null);
  const alive = useRef(true);
  // (o StrictMode monta duas vezes: o efeito religa o alive na 2ª montagem)
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    const list = listRef.current;
    list?.querySelector('.fh-export-opt')?.focus();
    const modal = list?.closest('.modal');
    if (!modal) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const els = [...modal.querySelectorAll('button:not([disabled])')];
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    };
    modal.addEventListener('keydown', onKey);
    return () => modal.removeEventListener('keydown', onKey);
  }, []);

  const choose = (id) => {
    if (busy) return;
    const done = runExport(id, handlers); // síncrono, dentro do clique (pop-up do Imprimir)
    setBusy(id);
    done.then((ok) => {
      if (!alive.current) return;
      setBusy('');
      if (ok) onClose();
    });
  };

  const busyOpt = EXPORT_OPTIONS.find(o => o.id === busy);
  const name = char?.name?.trim();
  return (
    <Modal onClose={onClose}>
      <h3 id="fh-export-title" style={{ marginBottom: 6 }}>
        {pt ? 'Exportar ficha' : 'Export sheet'}
      </h3>
      <p className="fh-export-sub">
        {pt
          ? `Escolha como levar ${name ? `a ficha de ${name}` : 'a ficha'}. Ela continua salva aqui.`
          : `Choose how to take ${name ? `${name}'s sheet` : 'the sheet'} with you. It stays saved here.`}
      </p>
      <ul ref={listRef} className="fh-export-list" aria-labelledby="fh-export-title">
        {EXPORT_OPTIONS.map((opt) => {
          const tx = exportText(opt, lang);
          const on = busy === opt.id;
          return (
            <li key={opt.id}>
              <button
                type="button"
                className={`fh-export-opt${on ? ' is-busy' : ''}`}
                aria-disabled={busy && !on ? 'true' : undefined}
                aria-busy={on || undefined}
                onClick={() => choose(opt.id)}
              >
                <span className="fh-export-ico" aria-hidden="true"><Icon name={opt.icon} size={22} /></span>
                <span className="fh-export-txt">
                  <span className="fh-export-name">{tx.name}</span>
                  <span className="fh-export-desc">{on ? tx.busy : tx.desc}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="fh-sr" aria-live="polite">{busyOpt ? exportText(busyOpt, lang).busy : ''}</p>
    </Modal>
  );
}
