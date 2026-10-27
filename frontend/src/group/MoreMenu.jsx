import { useEffect, useId, useRef, useState } from 'react';
import MesaSheet from '../shell/MesaSheet.jsx';

const isPhone = () => {
  try { return !!window.matchMedia?.('(max-width: 767px)').matches; } catch { return false; }
};

/**
 * Menu "⋯" com as ações secundárias de um item (editar, ocultar, excluir…).
 * items: [{ id, label, onSelect, danger?, hidden?, hint? }]
 * - Botão de 44×44.
 * - Celular (≤ 767): abre uma folha da altura do conteúdo, com as ações
 *   escritas por extenso em linhas de 56 px (e a linha de ajuda `hint`).
 * - Desktop: o menu suspenso de sempre, com itens de 44.
 * A ação roda depois que a folha/menu fecha (o foco volta ao ⋯ e uma
 * confirmação aberta pela ação devolve o foco para lá).
 * sheetTitle: título da folha (padrão: `label`).
 */
export default function MoreMenu({ items, label = 'Mais ações', className = '', sheetTitle, lang }) {
  const [open, setOpen] = useState(null); // null | 'menu' | 'sheet'
  const ref = useRef(null);
  const menuId = useId();
  const list = (items || []).filter(it => it && !it.hidden);

  useEffect(() => {
    if (open !== 'menu') return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('pointerdown', onDoc);
    window.addEventListener('keydown', onKey);
    // foca o primeiro item ao abrir (teclado)
    ref.current?.querySelector('[role="menuitem"]')?.focus();
    return () => { document.removeEventListener('pointerdown', onDoc); window.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!list.length) return null;
  const onMenuKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const els = [...ref.current.querySelectorAll('[role="menuitem"]')];
    const i = els.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
    els[next]?.focus();
  };
  const pick = (it) => {
    setOpen(null);
    // depois que a folha sai (ela devolve o foco ao ⋯)
    setTimeout(() => it.onSelect?.(), 0);
  };
  return (
    <div className={`grp-more ${className}`} ref={ref}>
      <button type="button" className="grp-more-btn" aria-haspopup={open === 'sheet' ? 'dialog' : 'menu'} aria-expanded={!!open}
        aria-controls={open === 'menu' ? menuId : undefined}
        aria-label={label} title={label} onClick={(e) => { e.stopPropagation(); setOpen(o => (o ? null : (isPhone() ? 'sheet' : 'menu'))); }}>
        <span aria-hidden="true">⋯</span>
      </button>
      {open === 'menu' && (
        <div className="grp-more-menu" role="menu" id={menuId} onKeyDown={onMenuKey}>
          {list.map(it => (
            <button key={it.id} type="button" role="menuitem" className={`grp-more-item ${it.danger ? 'danger' : ''}`}
              onClick={(e) => { e.stopPropagation(); pick(it); }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
      {open === 'sheet' && (
        <MesaSheet lang={lang} size="auto" width="sm" title={sheetTitle || label} onClose={() => setOpen(null)} className="grp-more-sheet">
          <div className="grp-more-list mesa-panel is-sunk">
            {list.map(it => (
              <button key={it.id} type="button" className={`mesa-row grp-more-row ${it.danger ? 'is-danger' : ''}`}
                onClick={(e) => { e.stopPropagation(); pick(it); }}>
                <span className="mesa-row-main">
                  <span className="mesa-row-title">{it.label}</span>
                  {it.hint && <span className="mesa-row-sub">{it.hint}</span>}
                </span>
              </button>
            ))}
          </div>
        </MesaSheet>
      )}
    </div>
  );
}
