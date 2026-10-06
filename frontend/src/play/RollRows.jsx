// Linhas de pedido de rolagem (RollRequest) usadas na lista única de Testes
// e no painel do jogador. O mestre decide: mostrar no telão, privado, ou
// anotar o valor do dado físico que saiu na mesa.
import { useState } from 'react';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

function diceText(r, lang) {
  return `${r.count > 1 ? r.count : ''}${r.diceType}${r.modifier ? `${r.modifier >= 0 ? '+' : ''}${r.modifier}` : ''}`
    + (r.hasAdvantage ? ` · ${t(lang, 'vantagem', 'advantage')}` : '')
    + (r.hasDisadvantage ? ` · ${t(lang, 'desvantagem', 'disadvantage')}` : '');
}

export function PendingPlayerRow({ r, lang }) {
  return (
    <div className="roll-row">
      <div>
        <strong>{r.requestedBy?.displayName}</strong>
        <span style={{ marginLeft: 6 }}>{r.label || r.diceType}</span>
        <span className="muted small" style={{ marginLeft: 6 }}>{diceText(r, lang)}</span>
      </div>
      <div className="row gap-2">
        <span className="muted small">{t(lang, 'aguardando o mestre…', 'waiting for the DM…')}</span>
      </div>
    </div>
  );
}

export function PendingDMRow({ r, lang, onResolve, onCancel }) {
  const sides = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100 }[r.diceType] || 20;
  const [override, setOverride] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const handleShowOverride = (e) => {
    e?.preventDefault?.();
    const n = parseInt(override, 10);
    if (!override || Number.isNaN(n) || n < 1 || n > sides) {
      setError(t(lang, `Digite um valor entre 1 e ${sides}.`, `Enter a value between 1 and ${sides}.`));
      return;
    }
    setError('');
    onResolve(r.id, 'public', { overrideValue: n });
  };

  return (
    <div className="roll-row tl-roll" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span className="tl-kind">🎲 {t(lang, 'Rolagem pedida', 'Roll request')}</span>
          <strong>{r.requestedBy?.displayName}</strong>
          <span style={{ marginLeft: 6 }}>{r.label || r.diceType}</span>
          <span className="muted small" style={{ marginLeft: 6 }}>{diceText(r, lang)}</span>
        </div>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onResolve(r.id, 'public')}>
            📺 {t(lang, 'Rolar e mostrar', 'Roll and show')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={show} onClick={() => setShow(v => !v)}
            title={t(lang, 'Anotar o valor do dado físico que saiu na mesa', 'Enter the physical die value rolled at the table')}>
            ✍ {t(lang, 'Dado físico', 'Physical die')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onResolve(r.id, 'private')}>
            🔒 {t(lang, 'Rolar em segredo', 'Roll privately')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--blood-bright)' }}
            aria-label={t(lang, 'Cancelar pedido', 'Cancel request')} onClick={() => onCancel(r.id)}>×</button>
        </div>
      </div>
      {show && (
        <form className="row gap-2 tl-physical" onSubmit={handleShowOverride}>
          <span className="muted small">{t(lang, 'Valor que saiu', 'Value rolled')}:</span>
          <input aria-label={`1-${sides}`} type="number" inputMode="numeric" className="input" min={1} max={sides}
            value={override} onChange={e => setOverride(e.target.value)} style={{ width: 80 }} placeholder={`1-${sides}`} autoFocus />
          <span className="muted small">
            {r.modifier ? `${r.modifier >= 0 ? '+' : ''}${r.modifier} = ${(parseInt(override, 10) || 0) + r.modifier}` : ''}
          </span>
          <button type="submit" className="btn btn-primary btn-sm">📺 {t(lang, 'Mostrar este valor', 'Show this value')}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShow(false); setOverride(''); setError(''); }}>
            {t(lang, 'Cancelar', 'Cancel')}
          </button>
          {error && <span className="check-card-error" role="alert">{error}</span>}
        </form>
      )}
    </div>
  );
}

export function RollHistoryRow({ r, lang }) {
  return (
    <div className={`roll-row history ${r.status} ${r.isCritical ? 'critical' : ''} ${r.isCriticalFail ? 'critfail' : ''}`}>
      <div>
        <strong>{r.requestedBy?.displayName}</strong>
        <span style={{ marginLeft: 6 }}>{r.label || r.diceType}</span>
        {r.status === 'public' && <span className="pill pill-pending" style={{ marginLeft: 8 }} title={t(lang, 'Mostrado no telão', 'Shown on screen')}>📺</span>}
        {r.status === 'private' && <span className="muted small" style={{ marginLeft: 8 }} title={t(lang, 'Em segredo', 'Private')}>🔒</span>}
        {r.status === 'cancelled' && <span className="muted small" style={{ marginLeft: 8 }}>{t(lang, 'cancelado', 'cancelled')}</span>}
      </div>
      {r.status !== 'cancelled' && (
        <div className="roll-result">
          <span className="muted small">
            [{(r.rolls || []).filter(x => x.kept).map(x => x.value).join(', ')}]
            {r.modifier ? ` ${r.modifier >= 0 ? '+' : ''}${r.modifier}` : ''}
          </span>
          <span className="roll-total">{r.total}</span>
          {r.isCritical && <span className="crit-tag">{t(lang, 'CRÍTICO', 'CRIT')}</span>}
          {r.isCriticalFail && <span className="critfail-tag">{t(lang, 'FALHA', 'FUMBLE')}</span>}
        </div>
      )}
    </div>
  );
}
