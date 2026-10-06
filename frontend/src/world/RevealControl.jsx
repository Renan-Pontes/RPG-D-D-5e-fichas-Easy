// Controle de revelação do mestre: olho com três estados (Oculto ·
// Conhecido de nome · Revelado), segredos um a um e a caixa "registrar na
// Crônica". NADA é revelado sem um clique do mestre.
//
//   <RevealControl entry={full} lang onChange={(entry) => …} beforeReveal={async () => flush()} />
//
// `entry` precisa ser WorldEntryFull do mestre (com `secrets`).
// `beforeReveal` (opcional) roda antes de chamar o servidor — o editor usa
// para gravar o texto pendente primeiro.
import { useState } from 'react';
import { revealEntry, worldErrorText } from './world-api.js';
import { VISIBILITIES, VIS_META, t, visLabel } from './world-model.js';

const LOG_KEY = 'forja.world.logDiary';
function readLogPref() {
  try { return localStorage.getItem(LOG_KEY) !== '0'; } catch { return true; }
}
function writeLogPref(v) {
  try { localStorage.setItem(LOG_KEY, v ? '1' : '0'); } catch { /* ok */ }
}

/** Estado e ações de revelação reaproveitáveis (editor, mapa, painéis). */
export function useReveal(entry, lang, onChange, beforeReveal) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [logDiary, setLog] = useState(readLogPref);
  const setLogDiary = (v) => { setLog(v); writeLogPref(v); };

  const run = async (opts) => {
    if (!entry?.id || busy) return null;
    setBusy(true); setError('');
    try {
      if (beforeReveal) await beforeReveal();
      const next = await revealEntry(entry.id, { ...opts, logDiary, lang });
      onChange?.(next);
      return next;
    } catch (e) {
      setError(worldErrorText(e, lang));
      return null;
    } finally {
      setBusy(false);
    }
  };

  return {
    busy, error, logDiary, setLogDiary,
    setVisibility: (visibility) => (visibility === entry?.visibility ? null : run({ visibility })),
    toggleSecret: (id, on) => run({ secrets: { [id]: on } }),
    togglePin: (id, on) => run({ pins: { [id]: on } }),
    run,
  };
}

export function LogDiaryCheck({ value, onChange, lang }) {
  return (
    <label className="wl-logcheck">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      <span title={t(lang, 'Cada revelação (do cartão ou de um segredo) vira uma linha na Crônica da campanha.', 'Each reveal (card or secret) becomes a line in the campaign Chronicle.')}>{t(lang, 'Registrar na Crônica', 'Log in the Chronicle')}</span>
    </label>
  );
}

export function VisibilitySwitch({ value, onPick, busy, lang, compact = false }) {
  return (
    <div className={`wl-vis-switch${compact ? ' is-compact' : ''}`} role="radiogroup" aria-label={t(lang, 'Quem vê', 'Who sees it')}>
      {VISIBILITIES.map(v => (
        <button key={v} type="button" role="radio" aria-checked={value === v} disabled={busy}
          className={`wl-vis-opt wl-vis-opt-${v}${value === v ? ' is-on' : ''}`} onClick={() => onPick(v)}
          title={t(lang, VIS_META[v].hintPt, VIS_META[v].hintEn)}>
          <span aria-hidden="true" className="wl-vis-ico">{VIS_META[v].icon}</span>
          <span className="wl-vis-name">{visLabel(v, lang)}</span>
        </button>
      ))}
    </div>
  );
}

// `reveal` (opcional): o resultado de useReveal() de quem chama, para que o
// painel e o resto da tela compartilhem o mesmo estado (uma caixa "Crônica" só).
export default function RevealControl({ entry, lang = 'pt', onChange, beforeReveal, showSecrets = false, compact = false, reveal = null }) {
  const own = useReveal(entry, lang, onChange, beforeReveal);
  const r = reveal || own;
  if (!entry) return null;
  const vis = entry.visibility || 'hidden';
  const secrets = (entry.secrets || []).filter(s => s && s.id);
  return (
    <div className={`wl-reveal${compact ? ' is-compact' : ''}`}>
      <div className="wl-reveal-head">
        <span className="wl-reveal-title">{t(lang, 'Quem vê este cartão', 'Who sees this card')}</span>
        <LogDiaryCheck value={r.logDiary} onChange={r.setLogDiary} lang={lang} />
      </div>
      <VisibilitySwitch value={vis} onPick={r.setVisibility} busy={r.busy} lang={lang} compact={compact} />
      <p className="wl-reveal-hint">{t(lang, VIS_META[vis].hintPt, VIS_META[vis].hintEn)}</p>
      {showSecrets && secrets.length > 0 && (
        <ul className="wl-reveal-secrets">
          {secrets.map(s => (
            <li key={s.id} className={s.revealed ? 'is-revealed' : ''}>
              <span className="wl-reveal-secret-text">{s.text}</span>
              <button type="button" className={`btn btn-sm ${s.revealed ? 'btn-ghost' : 'btn-primary'}`} disabled={r.busy}
                onClick={() => r.toggleSecret(s.id, !s.revealed)}>
                {s.revealed ? t(lang, 'Ocultar', 'Hide') : t(lang, '🗝 Revelar', '🗝 Reveal')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {showSecrets && secrets.some(s => s.revealed) && vis !== 'revealed' && (
        <p className="wl-reveal-hint">{t(lang, 'Segredos revelados só aparecem quando o cartão estiver "Revelado".', 'Revealed secrets only show once the card is "Revealed".')}</p>
      )}
      {r.error && <p className="wl-error" role="alert">{r.error}</p>}
    </div>
  );
}
