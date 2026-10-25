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

  const who = r.requestedBy?.displayName;
  return (
    <div className="roll-row tl-roll">
      <div className="tl-roll-head">
        <div className="tl-roll-what">
          <span className="tl-kind">🎲 {t(lang, 'Rolagem pedida', 'Roll request')}</span>
          <strong>{who}</strong>
          <span className="tl-roll-label">{r.label || r.diceType}</span>
          <span className="tl-roll-dice">{diceText(r, lang)}</span>
        </div>
        <button type="button" className="mesa-icon-btn tl-roll-cancel"
          aria-label={t(lang, `Cancelar pedido de ${who || ''}`, `Cancel ${who || ''}'s request`)}
          title={t(lang, 'Cancelar pedido', 'Cancel request')} onClick={() => onCancel(r.id)}>✕</button>
      </div>
      <div className="tl-roll-actions">
        <button type="button" className="mesa-btn is-primary tl-roll-show" onClick={() => onResolve(r.id, 'public')}>
          📺 {t(lang, 'Rolar e mostrar', 'Roll and show')}
        </button>
        <button type="button" className={`mesa-btn ${show ? 'is-on' : ''}`} aria-expanded={show} onClick={() => setShow(v => !v)}
          title={t(lang, 'Anotar o valor do dado físico que saiu na mesa', 'Enter the physical die value rolled at the table')}>
          ✍ {t(lang, 'Dado físico', 'Physical die')}
        </button>
        <button type="button" className="mesa-btn" onClick={() => onResolve(r.id, 'private')}>
          🔒 {t(lang, 'Rolar em segredo', 'Roll privately')}
        </button>
      </div>
      {show && (
        <form className="tl-physical" onSubmit={handleShowOverride}>
          <label className="tl-physical-field">
            <span>{t(lang, 'Valor que saiu', 'Value rolled')}</span>
            <input aria-label={t(lang, `Valor que saiu (1 a ${sides})`, `Value rolled (1 to ${sides})`)} type="number" inputMode="numeric" className="input" min={1} max={sides}
              value={override} onChange={e => setOverride(e.target.value)} placeholder={`1-${sides}`} autoFocus />
          </label>
          {r.modifier ? (
            <span className="tl-physical-sum">
              {`${r.modifier >= 0 ? '+' : ''}${r.modifier} = ${(parseInt(override, 10) || 0) + r.modifier}`}
            </span>
          ) : null}
          <div className="tl-physical-btns">
            <button type="submit" className="mesa-btn is-primary">📺 {t(lang, 'Mostrar este valor', 'Show this value')}</button>
            <button type="button" className="mesa-btn is-quiet" onClick={() => { setShow(false); setOverride(''); setError(''); }}>
              {t(lang, 'Cancelar', 'Cancel')}
            </button>
          </div>
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
        {r.status === 'public' && <span className="tl-hist-tag" title={t(lang, 'Mostrado no telão', 'Shown on screen')}>📺 {t(lang, 'telão', 'screen')}</span>}
        {r.status === 'private' && <span className="tl-hist-tag" title={t(lang, 'Em segredo', 'Private')}>🔒 {t(lang, 'segredo', 'private')}</span>}
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
