import { useEffect, useRef } from 'react';

const DELTAS = [-10, -5, -1, 1, 5, 10];
const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function HpDeltaPopover({ open, currentHp, maxHp, tempHp = 0, lang = 'pt', onApply, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className="fh-hp-popover no-print" role="dialog" aria-label={L(lang, 'Ajuste rápido de PV', 'Quick HP adjustment')}>
      <div className="fh-hp-popover-head">
        <strong>{currentHp} / {maxHp}{tempHp > 0 ? ` (+${tempHp})` : ''}</strong>
        <button type="button" className="fh-hp-pop-x" onClick={onClose} aria-label={L(lang, 'Fechar', 'Close')}>✕</button>
      </div>
      <div className="fh-hp-pop-grid">
        {DELTAS.map(d => (
          <button
            key={d}
            type="button"
            className={`fh-hp-pop-btn ${d < 0 ? 'is-dmg' : 'is-heal'}`}
            onClick={() => onApply(d)}
          >
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
      </div>
      <div className="fh-hp-pop-actions">
        <button type="button" className="fh-hp-pop-act" onClick={() => { onApply(maxHp - currentHp); onClose?.(); }}>
          {L(lang, 'PV Cheio', 'Full HP')}
        </button>
        <button type="button" className="fh-hp-pop-act" onClick={() => onApply(5, { temp: true })}>
          {L(lang, '+5 Temp', '+5 Temp')}
        </button>
      </div>
    </div>
  );
}
