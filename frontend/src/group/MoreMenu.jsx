import { useEffect, useId, useRef, useState } from 'react';

/**
 * Menu "⋯" com as ações secundárias de um item (editar, ocultar, excluir…).
 * items: [{ id, label, onSelect, danger?, hidden? }]
 */
export default function MoreMenu({ items, label = 'Mais ações', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const menuId = useId();
  const list = (items || []).filter(it => it && !it.hidden);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
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
  return (
    <div className={`grp-more ${className}`} ref={ref}>
      <button type="button" className="grp-more-btn" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
        aria-label={label} title={label} onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>⋯</button>
      {open && (
        <div className="grp-more-menu" role="menu" id={menuId} onKeyDown={onMenuKey}>
          {list.map(it => (
            <button key={it.id} type="button" role="menuitem" className={`grp-more-item ${it.danger ? 'danger' : ''}`}
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onSelect?.(); }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
