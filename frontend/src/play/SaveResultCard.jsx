// Cartão de SUGESTÃO para efeito com teste de resistência (sopro, magia em área).
// O app sugere dano e resultados; cada alvo pode ter o total digitado (dado
// físico) e o mestre pode virar "passou/falhou". Só "Aplicar" muda a ficha.
import { useMemo, useState } from 'react';
import { errorMessage } from '../api/errors.js';
import { parseFormula, rollFormula } from '../dice/dice-math.js';
import { combatAction } from './play-api.js';
import { evaluateSave, saveApplyOps, saveDraft } from './attack-model.js';
import { abilityLabel, conditionLabel, damageTypeLabel } from '../combat/monster-i18n.js';
import { actionName, reasonLabel } from '../campaigns/monster-actions.js';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const rollExpr = (expr) => {
  const p = parseFormula(expr);
  if (p) return rollFormula(p).total;
  const n = parseInt(expr, 10);
  return Number.isFinite(n) ? n : 0;
};
const d20 = () => 1 + Math.floor(Math.random() * 20);

export default function SaveResultCard({ campaignId, attacker, action, actionIndex, targets, status, lang = 'pt', onApplied, onDiscard }) {
  const [draft, setDraft] = useState(() => saveDraft(action, targets, { roll: rollExpr, d20 }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const results = useMemo(() => evaluateSave(draft), [draft]);
  const limited = !!(action?.recharge || action?.uses || action?.kind === 'legendary');
  const unavailable = status && !status.available;

  const setTarget = (i, patch) => setDraft(d => ({ ...d, targets: d.targets.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const setPart = (i, amount) => setDraft(d => ({ ...d, parts: d.parts.map((p, j) => (j === i ? { ...p, amount } : p)) }));

  const apply = async () => {
    if (draft.targets.some((t, i) => t.override == null && results[i].total == null)) {
      setError(L(lang, 'Digite o total de cada alvo ou marque se passou.', "Type each target's total or mark whether it passed."));
      return;
    }
    setBusy(true); setError('');
    try {
      const ops = saveApplyOps(draft, { attackerId: attacker.id, actionIndex, consume: limited, force: unavailable });
      for (const body of ops) {
        // eslint-disable-next-line no-await-in-loop
        await combatAction(campaignId, body);
      }
      onApplied?.(results);
    } catch (e) {
      setError(errorMessage(e, lang));
    } finally { setBusy(false); }
  };

  return (
    <section className="arc tone-hit" aria-label={L(lang, 'Resultado do efeito (sugestão)', 'Effect result (suggestion)')}>
      <header className="arc-head">
        <span className="arc-eyebrow">{L(lang, 'Sugestão — nada foi aplicado ainda', 'Suggestion — nothing applied yet')}</span>
        <div className="arc-title">
          <strong>{attacker?.name}</strong><span className="arc-action">· {actionName(action, lang)}</span>
          <span className="muted">{abilityLabel(draft.ability, lang)} {L(lang, 'CD', 'DC')} {draft.dc}</span>
        </div>
      </header>
      {unavailable && <p className="arc-warn">⚠ {reasonLabel(status.reason, lang)} {L(lang, 'Se aplicar, o mestre usa mesmo assim.', 'If you apply, it is used anyway.')}</p>}

      {draft.parts.length > 0 && (
        <div className="arc-damage" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
          <span className="arc-eyebrow">{L(lang, 'Dano (quem falha)', 'Damage (on a failed save)')}{draft.half ? L(lang, ' · metade no sucesso', ' · half on success') : ''}</span>
          <ul>
            {draft.parts.map((p, i) => (
              <li key={i} className="arc-part">
                <input className="input arc-dmg-input" type="number" inputMode="numeric" min={0} value={p.amount}
                  onChange={e => setPart(i, e.target.value)} aria-label={L(lang, `Dano ${i + 1}`, `Damage ${i + 1}`)} />
                <span>{damageTypeLabel(p.type, lang)}</span>
                <span className="muted small arc-dice">({p.dice})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="src-targets">
        {draft.targets.map((t, i) => {
          const r = results[i];
          return (
            <li key={t.id} className={`src-target ${r.success ? 'is-pass' : 'is-fail'}`}>
              <strong className="src-name">{t.name}</strong>
              <input className="input src-total" type="number" inputMode="numeric" value={t.total} placeholder={L(lang, 'total', 'total')}
                onChange={e => setTarget(i, { total: e.target.value, override: null })}
                aria-label={L(lang, `Total da resistência de ${t.name}`, `${t.name} save total`)} />
              <span className="muted small">{t.mod != null ? `(${t.mod >= 0 ? '+' : ''}${t.mod})` : ''}</span>
              <button type="button" className={`gc-chip ${r.success ? 'active' : ''}`} aria-pressed={r.success}
                onClick={() => setTarget(i, { override: !r.success })}>
                {r.success ? L(lang, '✓ passou', '✓ saved') : L(lang, '✗ falhou', '✗ failed')}
              </button>
              <span className="src-out">
                {r.damage.length ? `−${r.damage.reduce((a, p) => a + p.amount, 0)}` : '0'}
                {r.conditions.length > 0 && ` · ${r.conditions.map(c => conditionLabel(c, lang)).join(', ')}`}
              </span>
            </li>
          );
        })}
      </ul>

      {error && <p className="arc-error" role="alert">{error}</p>}
      <div className="arc-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={apply}>✓ {L(lang, 'Aplicar', 'Apply')}</button>
        <button type="button" className="btn btn-ghost btn-sm arc-discard" disabled={busy} onClick={onDiscard}>✕ {L(lang, 'Descartar', 'Discard')}</button>
      </div>
    </section>
  );
}
