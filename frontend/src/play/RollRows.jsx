// Linhas de pedido de rolagem (RollRequest) usadas na lista única de Testes
// e no painel do jogador. O mestre decide: mostrar na Tela, privado, ou
// anotar o valor do dado físico que saiu na mesa.
// TableRollRow (V10): uma rolagem de MESA (Testes › 🎲 Rolagens na Tela e as
// "Últimas 5" de Jogar › Tela) — o mesmo texto que a TV mostra, com 📺 ou 🔒.
import { useState } from 'react';
import { rollLine } from '../screen/roll-queue.js';
import { abilityLabel, damageTypeLabel } from '../combat/monster-i18n.js';

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
  // Vários dados (ex.: 8d6): o mestre digita o total que saiu, de N a N×lados.
  const count = Math.max(1, r.count || 1);
  const lo = count, hi = count * sides;
  const [override, setOverride] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const handleShowOverride = (e) => {
    e?.preventDefault?.();
    const n = parseInt(override, 10);
    if (!override || Number.isNaN(n) || n < lo || n > hi) {
      setError(t(lang, `Digite um valor entre ${lo} e ${hi}.`, `Enter a value between ${lo} and ${hi}.`));
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
            <input aria-label={count > 1 ? t(lang, `Total que saiu (${lo} a ${hi})`, `Total rolled (${lo} to ${hi})`) : t(lang, `Valor que saiu (1 a ${sides})`, `Value rolled (1 to ${sides})`)} type="number" inputMode="numeric" className="input" min={lo} max={hi}
              value={override} onChange={e => setOverride(e.target.value)} placeholder={`${lo}-${hi}`} autoFocus />
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
        {r.status === 'public' && <span className="tl-hist-tag" title={t(lang, 'Mostrado na Tela', 'Shown on screen')}>📺 {t(lang, 'Tela', 'screen')}</span>}
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

/** Uma rolagem de mesa (📺 foi à Tela · 🔒 só o mestre). Texto de verdade; nada só por ícone. */
export function TableRollRow({ r, lang, compact = false }) {
  const row = { ...r, crit: r.isCritical, fail: r.isCriticalFail };
  const labels = { damageLabel: (ty) => damageTypeLabel(ty, lang), abilityLabel: (a) => abilityLabel(a, lang) };
  const at = r.resolvedAt ? new Date(r.resolvedAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const shown = r.status === 'public';
  return (
    <div className={`roll-row history tl-table-roll ${compact ? 'is-compact' : ''} ${r.isCritical ? 'critical' : ''} ${r.isCriticalFail ? 'critfail' : ''}`}>
      <div className="tl-table-roll-text">
        <span className="tl-hist-tag">{shown ? `📺 ${t(lang, 'Tela', 'screen')}` : `🔒 ${t(lang, 'só você', 'only you')}`}</span>
        {/* V15: rolada na ficha do jogador, no aparelho dele (os dados preparados não valem) */}
        {r.kind === 'sheet' && <span className="tl-hist-tag">📜 {t(lang, 'ficha', 'sheet')}</span>}
        <span className="tl-table-roll-line">{rollLine(row, lang, labels)}</span>
      </div>
      <div className="roll-result">
        {at && <span className="muted small">{at}</span>}
        {r.kind === 'save' && r.targets?.some(x => x.d20 != null) && (
          <span className="muted small">d20 {r.targets.map(x => x.d20 ?? '—').join(' · ')}</span>
        )}
        {r.isCritical && <span className="crit-tag">{t(lang, 'CRÍTICO', 'CRIT')}</span>}
        {r.isCriticalFail && <span className="critfail-tag">{t(lang, 'FALHA', 'FUMBLE')}</span>}
      </div>
    </div>
  );
}
