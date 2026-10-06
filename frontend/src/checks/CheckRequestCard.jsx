// Cartão do jogador para um pedido de teste do mestre.
// Duas saídas, ambas com um toque: rolar no app (o servidor rola) ou digitar
// o dado físico. Não é modal — não interrompe a ficha.
import { errorMessage } from '../api/errors.js';
import { useState } from 'react';
import { api } from '../api/client.js';
import { modifierFor, responseDiceGroups } from './check-logic.js';
import { formatMod, physicalEntry } from '../dice/dice-math.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

const ERRORS = {
  already_rolled: ['Você já rolou este teste.', 'You already rolled this check.'],
  already_answered: ['Você já respondeu este teste.', 'You already answered this check.'],
  check_closed: ['O mestre já encerrou este teste.', 'The DM closed this check.'],
};

export default function CheckRequestCard({ check, char, lang = 'pt', onAnswered, onDismiss, compact = false }) {
  const sheetMod = modifierFor(char, check);
  const [mode, setMode] = useState(sheetMod == null ? 'total' : 'natural');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const resp = check.myResponse;
  const advLabel = check.advantage === 'adv' ? L(lang, 'com vantagem', 'with advantage')
    : check.advantage === 'dis' ? L(lang, 'com desvantagem', 'with disadvantage') : '';

  const fail = (e) => {
    const code = e?.data?.error || e?.message;
    const msg = ERRORS[code];
    setError(msg ? L(lang, msg[0], msg[1]) : errorMessage(e, lang, L(lang, 'Não deu para enviar. Tente de novo.', 'Could not send. Try again.')));
  };

  const rollInApp = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.respondCheck(check.id, { mode: 'app', modifier: sheetMod ?? 0 });
      const res = r.response;
      window.__diceShow?.({
        label: check.label,
        groups: responseDiceGroups(res),
        mod: res.modifier || 0,
        total: res.total,
        isCrit: res.natural === 20,
        isFumble: res.natural === 1,
        adv: check.advantage,
      });
      onAnswered?.(r.check);
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const sendPhysical = async (e) => {
    e?.preventDefault?.();
    const entry = physicalEntry(value, { mode, modifier: sheetMod ?? 0 });
    if (entry.error) {
      setError(mode === 'natural'
        ? L(lang, 'Digite o número do d20 (1 a 20).', 'Enter the d20 number (1 to 20).')
        : L(lang, 'Digite o total.', 'Enter the total.'));
      return;
    }
    setBusy(true); setError('');
    try {
      const body = mode === 'natural'
        ? { mode: 'physical', natural: entry.natural, modifier: sheetMod ?? 0 }
        : { mode: 'physical', total: entry.total };
      const r = await api.respondCheck(check.id, body);
      setValue(''); setEditing(false);
      onAnswered?.(r.check);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const dcText = check.dc != null ? `CD ${check.dc}` : check.dcHidden ? L(lang, 'CD secreta', 'Secret DC') : '';
  const preview = (() => {
    const n = parseInt(value, 10);
    if (mode !== 'natural' || Number.isNaN(n) || sheetMod == null) return null;
    return n + sheetMod;
  })();

  return (
    <article className={`check-card ${resp ? 'is-answered' : 'is-open'} ${compact ? 'is-compact' : ''}`} aria-live="polite">
      <header className="check-card-head">
        <span className="check-card-eyebrow">🎯 {L(lang, 'O mestre pede', 'The DM asks for')}</span>
        {onDismiss && !resp && (
          <button type="button" className="check-card-later" onClick={onDismiss}>{L(lang, 'Depois', 'Later')}</button>
        )}
      </header>
      <div className="check-card-title">
        <strong>{check.label}</strong>
        {dcText && <span className="check-card-dc">{dcText}</span>}
        {advLabel && <span className="check-card-adv">{advLabel}</span>}
      </div>

      {resp && !editing ? (
        <div className="check-card-result">
          <span className="check-card-total">{resp.total}</span>
          <span className="check-card-detail">
            {resp.natural != null ? `d20: ${resp.natural}${resp.modifier ? ` ${formatMod(resp.modifier)}` : ''}` : L(lang, 'total informado', 'total entered')}
            {' · '}{resp.mode === 'app' ? L(lang, 'rolado no app', 'rolled in app') : resp.mode === 'dm' ? L(lang, 'anotado pelo mestre', 'entered by DM') : L(lang, 'dado físico', 'physical die')}
          </span>
          {check.outcome && (
            <span className={`check-outcome ${check.outcome}`}>{check.outcome === 'pass' ? L(lang, '✓ Passou', '✓ Pass') : L(lang, '✗ Falhou', '✗ Fail')}</span>
          )}
          {!check.outcome && <span className="muted small">{L(lang, 'Enviado ao mestre', 'Sent to the DM')}</span>}
          {resp.mode === 'physical' && check.status === 'open' && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(true); setError(''); }}>
              {L(lang, 'Corrigir', 'Fix')}
            </button>
          )}
        </div>
      ) : (
        <>
          {sheetMod != null && (
            <div className="check-card-mod muted small">
              {L(lang, 'Seu bônus na ficha', 'Your sheet bonus')}: <strong>{formatMod(sheetMod) || '+0'}</strong>
            </div>
          )}
          <div className="check-card-actions">
            {!editing && (
              <button type="button" className="btn btn-primary check-btn-roll" onClick={rollInApp} disabled={busy}>
                🎲 {L(lang, 'Rolar no app', 'Roll in app')}
              </button>
            )}
            <form className="check-physical" onSubmit={sendPhysical}>
              <div className="check-physical-mode" role="group" aria-label={L(lang, 'O que você vai digitar', 'What you will enter')}>
                {sheetMod != null && (
                  <button type="button" className={mode === 'natural' ? 'active' : ''} aria-pressed={mode === 'natural'} onClick={() => setMode('natural')}>
                    {L(lang, 'Dado', 'Die')}
                  </button>
                )}
                <button type="button" className={mode === 'total' ? 'active' : ''} aria-pressed={mode === 'total'} onClick={() => setMode('total')}>
                  {L(lang, 'Total', 'Total')}
                </button>
              </div>
              <input
                className="input check-physical-input"
                type="number"
                inputMode="numeric"
                min={mode === 'natural' ? 1 : -20}
                max={mode === 'natural' ? 20 : 99}
                value={value}
                onChange={e => { setValue(e.target.value); setError(''); }}
                placeholder={mode === 'natural' ? 'd20' : L(lang, 'total', 'total')}
                aria-label={mode === 'natural' ? L(lang, 'Número que saiu no d20 físico', 'Number rolled on the physical d20') : L(lang, 'Total já somado', 'Total already added')}
              />
              <button type="submit" className={`btn ${value === '' ? 'btn-ghost' : 'btn-primary'} check-physical-send`} disabled={busy || value === ''}>
                {preview != null ? L(lang, `Enviar ${preview}`, `Send ${preview}`) : L(lang, 'Enviar', 'Send')}
              </button>
            </form>
            {editing && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>{L(lang, 'Cancelar', 'Cancel')}</button>
            )}
          </div>
        </>
      )}
      {error && <div className="check-card-error" role="alert">{error}</div>}
    </article>
  );
}
