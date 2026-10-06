// Cartão de SUGESTÃO do ataque de monstro (Jogar › Combate).
//
// O servidor rolou a prévia, mas NADA foi aplicado. O mestre vê o resultado,
// pode ajustar o d20 e o dano (dado físico da mesa) e decide:
//   Aplicar   → manda exatamente os valores da tela
//   Ajustar   → abre os campos editáveis
//   Descartar → some sem deixar rastro
import { useMemo, useState } from 'react';
import { errorMessage } from '../api/errors.js';
import { applyAttack, attackPreview } from './play-api.js';
import { applyBody, critDice, draftFromPreview, evaluateDraft, isAdjusted, serverTotalsValid } from './attack-model.js';
import { damageTypeLabel, DAMAGE_TYPES } from '../combat/monster-i18n.js';
import { damagePartConditions, reasonLabel } from '../campaigns/monster-actions.js';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function AttackResultCard({ preview, campaignId, attacker, target, lang = 'pt', onApplied, onDiscard }) {
  // Dano extra condicional ("se o ataque teve Vantagem") começa desligado: o mestre marca.
  const conditions = useMemo(
    () => damagePartConditions(attacker?.stats?.actions?.[preview?.actionIndex ?? 0]),
    [attacker, preview?.actionIndex],
  );
  const [draft, setDraft] = useState(() => draftFromPreview(preview, { conditions }));
  const [adjusting, setAdjusting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const r = useMemo(() => evaluateDraft(draft), [draft]);
  if (!draft || !r) return null;

  const adjusted = isAdjusted(draft);
  const set = (patch) => setDraft(d => ({ ...d, ...patch }));
  const setPart = (i, patch) => setDraft(d => ({ ...d, parts: d.parts.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  const curHp = target?.current_hp;
  const maxHp = target?.stats?.max_hp;
  // Sem ajuste: o servidor já calculou resistências/imunidades. Com ajuste: conta simples.
  const serverOk = serverTotalsValid(draft);
  const dmgShown = !r.hit ? 0 : (serverOk && draft.effectiveDamage != null ? draft.effectiveDamage : r.damageTotal);
  const newHp = curHp == null ? null
    : (serverOk && r.hit && draft.newHp != null ? draft.newHp : Math.max(0, curHp - dmgShown));

  const apply = async () => {
    const body = applyBody(draft);
    if (!body) { setError(L(lang, 'Confira o d20 (1 a 20) e o dano.', 'Check the d20 (1 to 20) and the damage.')); return; }
    setBusy(true); setError('');
    try {
      const res = await applyAttack(campaignId, body);
      onApplied?.(res, { hit: r.hit, damage: dmgShown, targetName: target?.name });
    } catch (e) {
      setError(errorMessage(e, lang));
    } finally { setBusy(false); }
  };

  // Rola o dano de novo no servidor (sem aplicar), mantendo o d20 da tela —
  // útil quando o mestre trocou o d20 para 20 e quer os dados do crítico.
  const reroll = async () => {
    setBusy(true); setError('');
    try {
      const p = await attackPreview(campaignId, {
        attackerId: draft.attackerId, targetId: draft.targetId, actionIndex: draft.actionIndex,
        attackRoll: r.nat ?? undefined,
      });
      const next = draftFromPreview(p, { conditions });
      // Mantém a marcação das condições que o mestre já fez.
      setDraft(d => ({
        ...next, hitOverride: d.hitOverride,
        parts: next.parts.map((pt, i) => (pt.conditional ? { ...pt, on: !!d.parts[i]?.on } : pt)),
      }));
    } catch (e) {
      setError(errorMessage(e, lang));
    } finally { setBusy(false); }
  };

  const verdict = !r.valid && r.nat == null ? '—'
    : r.hit ? (r.crit ? L(lang, 'CRÍTICO!', 'CRITICAL!') : L(lang, 'Acerta', 'Hit'))
      : (r.natOne ? L(lang, '1 natural — erra', 'Natural 1 — miss') : L(lang, 'Erra', 'Miss'));
  const tone = !r.valid ? 'idle' : r.hit ? (r.crit ? 'crit' : 'hit') : 'miss';

  return (
    <section className={`arc tone-${tone}`} aria-live="polite" aria-label={L(lang, 'Resultado do ataque (sugestão)', 'Attack result (suggestion)')}>
      <header className="arc-head">
        <span className="arc-eyebrow">{L(lang, 'Sugestão — nada foi aplicado ainda', 'Suggestion — nothing applied yet')}</span>
        <div className="arc-title">
          <strong>{attacker?.name || '?'}</strong>
          <span className="arc-arrow" aria-hidden="true">→</span>
          <strong>{target?.name || '?'}</strong>
          {draft.actionName && <span className="arc-action">· {draft.actionName}</span>}
        </div>
      </header>

      {!draft.available && (
        <p className="arc-warn">⚠ {reasonLabel(draft.unavailableReason, lang)} {L(lang, 'Se aplicar, o mestre usa mesmo assim.', 'If you apply, it is used anyway.')}</p>
      )}

      <div className="arc-roll">
        <div className="arc-d20" title={L(lang, 'd20 natural', 'natural d20')}>
          <span className="arc-d20-label">d20</span>
          {adjusting ? (
            <input className="input arc-d20-input" type="number" inputMode="numeric" min={1} max={20} value={draft.d20}
              onChange={e => set({ d20: e.target.value })} aria-label={L(lang, 'Resultado do d20 (dado físico)', 'd20 result (physical die)')} autoFocus />
          ) : (
            <span className="arc-d20-val">{draft.d20 || '—'}</span>
          )}
          {draft.rolls.length > 1 && !adjusting && (
            <span className="arc-rolls muted small">({draft.rolls.join(' · ')})</span>
          )}
        </div>
        <div className="arc-math">
          <span>{draft.bonus >= 0 ? '+' : '−'}{Math.abs(draft.bonus)}</span>
          <span className="arc-eq">=</span>
          <strong className="arc-total">{r.total ?? '—'}</strong>
          <span className="muted">{L(lang, 'vs CA', 'vs AC')} {draft.ac}</span>
        </div>
        <div className={`arc-verdict tone-${tone}`}>{verdict}</div>
      </div>

      {adjusting && (
        <div className="arc-hitchips" role="group" aria-label={L(lang, 'Acertou?', 'Hit?')}>
          {[[null, L(lang, 'Pela regra', 'By the rules')], [true, L(lang, 'Acertou', 'Hit')], [false, L(lang, 'Errou', 'Missed')]].map(([v, lbl]) => (
            <button key={String(v)} type="button" className={`gc-chip ${draft.hitOverride === v ? 'active' : ''}`}
              aria-pressed={draft.hitOverride === v} onClick={() => set({ hitOverride: v })}>{lbl}</button>
          ))}
        </div>
      )}

      {(r.hit || adjusting) && draft.parts.length > 0 && (
        <div className={`arc-damage ${r.hit ? '' : 'is-off'}`}>
          <span className="arc-eyebrow">{L(lang, 'Dano', 'Damage')}</span>
          <ul>
            {draft.parts.map((p, i) => (
              <li key={i} className={`arc-part ${p.conditional ? 'is-conditional' : ''} ${p.conditional && !p.on ? 'is-off' : ''}`}>
                {p.conditional && (
                  <label className="arc-cond" title={p.conditional.text}>
                    <input type="checkbox" checked={!!p.on} onChange={e => setPart(i, { on: e.target.checked })} />
                    <span>{L(lang, p.conditional.pt, p.conditional.en)}?</span>
                  </label>
                )}
                {adjusting ? (
                  <>
                    <input className="input arc-dmg-input" type="number" inputMode="numeric" min={0} max={9999} value={p.amount}
                      onChange={e => setPart(i, { amount: e.target.value })}
                      aria-label={L(lang, `Dano ${i + 1} (dado físico)`, `Damage ${i + 1} (physical dice)`)} />
                    <select className="input arc-type" value={p.type} onChange={e => setPart(i, { type: e.target.value })}
                      aria-label={L(lang, 'Tipo de dano', 'Damage type')}>
                      {[...new Set([...DAMAGE_TYPES, p.type].filter(Boolean))].map(ty => (
                        <option key={ty} value={ty}>{damageTypeLabel(ty, lang)}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <strong className="arc-dmg-val">{p.amount}</strong>
                    <span>{damageTypeLabel(p.type, lang)}</span>
                  </>
                )}
                {p.dice && <span className="muted small arc-dice">({r.crit && !draft.previewCrit ? critDice(p.dice) : p.dice})</span>}
              </li>
            ))}
          </ul>
          {r.hit && curHp != null && (
            <p className="arc-hp">
              {L(lang, 'PV de', 'HP of')} {target?.name}: <strong>{curHp}</strong> → <strong className={newHp <= 0 ? 'arc-down' : ''}>{newHp}</strong>
              {maxHp ? <span className="muted small"> / {maxHp}</span> : null}
              {!serverOk && <span className="muted small"> · {L(lang, 'resistências contam ao aplicar', 'resistances apply on Apply')}</span>}
              {serverOk && draft.note && <span className="muted small"> · {draft.note}</span>}
            </p>
          )}
        </div>
      )}

      {draft.rigged && !adjusted && (
        <p className="muted small arc-note">★ {L(lang, 'd20 veio de um valor preparado (Ferramentas avançadas).', 'd20 came from a prepared value (Advanced tools).')}</p>
      )}
      {adjusted && <p className="muted small arc-note">✍ {L(lang, 'Valores ajustados pelo mestre.', 'Values adjusted by the DM.')}</p>}
      {error && <p className="arc-error" role="alert">{error}</p>}

      <div className="arc-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !r.valid} onClick={apply}>
          ✓ {L(lang, 'Aplicar', 'Apply')}
        </button>
        <button type="button" className={`btn btn-sm btn-ghost ${adjusting ? 'arc-on' : ''}`} aria-pressed={adjusting}
          disabled={busy} onClick={() => setAdjusting(v => !v)}>
          ✍ {adjusting ? L(lang, 'Pronto', 'Done') : L(lang, 'Ajustar', 'Adjust')}
        </button>
        {adjusting && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !r.valid} onClick={reroll}
            title={L(lang, 'Rola o dano de novo com este d20 (nada é aplicado)', 'Re-rolls damage with this d20 (nothing applied)')}>
            🎲 {L(lang, 'Rolar dano de novo', 'Re-roll damage')}
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm arc-discard" disabled={busy} onClick={onDiscard}>
          ✕ {L(lang, 'Descartar', 'Discard')}
        </button>
      </div>
    </section>
  );
}
