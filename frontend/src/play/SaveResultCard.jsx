// Cartão de SUGESTÃO para efeito com teste de resistência (sopro, magia em área).
// O app sugere dano e resultados; cada alvo pode ter o total digitado (dado
// físico) e o mestre pode virar "passou/falhou". Só "Aplicar" muda a ficha.
// V10: os d20 de cada alvo e o dano são rolados NO SERVIDOR (POST …/save-preview,
// nada aplicado); sem rede, rola no aparelho como antes (e diz). "Aplicar" vai numa
// chamada só (save_apply) e, com "📺 Vai à Tela" (a regra "Dos monstros" do palco),
// a Tela ganha 1 linha-resumo: "Sopro de Fogo · DES CD 13 · Dagna 9 ✗ · Pipo 17 ✓".
import { useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '../api/errors.js';
import { parseFormula, rollFormula } from '../dice/dice-math.js';
import { combatAction, savePreview } from './play-api.js';
import { evaluateSave, saveApplyBody, saveDraft, saveDraftFromPreview } from './attack-model.js';
import { useArea } from '../shell/useArea.js';
import useStage from '../stage/useStage.js';
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

// pinned: "✓ Aplicar · ✕ Descartar" presos embaixo enquanto o cartão está à vista.
export default function SaveResultCard({ campaignId, attacker, action, actionIndex, targets, status, lang = 'pt', onApplied, onDiscard, pinned = false }) {
  // null enquanto o servidor rola; sem resposta, o rascunho local de antes
  const [draft, setDraft] = useState(null);
  const [local, setLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { campaign } = useArea();
  const stage = useStage(campaign);
  const canShow = !!campaign && attacker?.type !== 'pc';
  const [show, setShow] = useState(() => canShow && (stage?.prefs?.monsters || 'shown') === 'shown');
  // Uma sugestão = uma rolagem no servidor (o cartão é montado de novo a cada sugestão;
  // o pedido fica guardado para a 2ª montagem do StrictMode não rolar outra vez).
  const req = useRef(null);
  useEffect(() => {
    let alive = true;
    if (!req.current) req.current = savePreview(campaignId, { attackerId: attacker?.id, actionIndex, targetIds: (targets || []).map(t => t.id) });
    req.current
      .then(p => { if (alive) setDraft(saveDraftFromPreview(p, action)); })
      .catch(() => { if (alive) { setLocal(true); setDraft(saveDraft(action, targets, { roll: rollExpr, d20 })); } });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const results = useMemo(() => (draft ? evaluateSave(draft) : []), [draft]);
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
      const res = await combatAction(campaignId, saveApplyBody(draft, {
        attackerId: attacker.id, actionIndex, consume: limited, force: unavailable, show: canShow && show,
      }));
      onApplied?.(results, { shown: res?.shown != null });
    } catch (e) {
      setError(errorMessage(e, lang));
    } finally { setBusy(false); }
  };

  if (!draft) {
    return (
      <section className={`arc tone-hit ${pinned ? 'is-pinned' : ''}`} aria-busy="true" aria-label={L(lang, 'Resultado do efeito (sugestão)', 'Effect result (suggestion)')}>
        <header className="arc-head">
          <span className="arc-eyebrow">{L(lang, 'Sugestão — nada foi aplicado ainda', 'Suggestion — nothing applied yet')}</span>
          <div className="arc-title"><strong>{attacker?.name}</strong><span className="arc-action">· {actionName(action, lang)}</span></div>
        </header>
        <p className="src-source" role="status">🎲 {L(lang, 'Rolando as salvaguardas no servidor…', 'Rolling the saves on the server…')}</p>
        <div className="arc-actions">
          <button type="button" className="mesa-btn mesa-btn-lg is-primary arc-apply" disabled>✓ {L(lang, 'Aplicar', 'Apply')}</button>
          <button type="button" className="mesa-btn mesa-btn-lg is-quiet arc-discard" onClick={onDiscard}>✕ {L(lang, 'Descartar', 'Discard')}</button>
        </div>
      </section>
    );
  }

  return (
    <section className={`arc tone-hit ${pinned ? 'is-pinned' : ''}`} aria-label={L(lang, 'Resultado do efeito (sugestão)', 'Effect result (suggestion)')}>
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
              <button type="button" className={`mesa-chip src-chip ${r.success ? 'is-pass' : 'is-fail'}`} aria-pressed={r.success}
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

      <p className="src-source">{local
        ? `⚠ ${L(lang, 'Sem conexão: os d20 foram rolados no aparelho.', 'Offline: the d20s were rolled on this device.')}`
        : `🎲 ${L(lang, 'd20 rolados no servidor', 'd20s rolled on the server')}: ${draft.targets.map(t => `${t.name} ${t.d20 ?? '—'}`).join(' · ')}`}</p>
      {canShow && (
        <button type="button" className={`mesa-chip arc-show ${show ? 'active' : ''}`} aria-pressed={show}
          disabled={busy} onClick={() => setShow(v => !v)}>
          {show ? `📺 ${L(lang, 'Vai à Tela (1 linha-resumo)', 'Goes on screen (1 summary line)')}` : `🔒 ${L(lang, 'Fica com você', 'Stays with you')}`}
        </button>
      )}
      {error && <p className="arc-error" role="alert">{error}</p>}
      <div className="arc-actions">
        <button type="button" className="mesa-btn mesa-btn-lg is-primary arc-apply" disabled={busy} onClick={apply}>✓ {L(lang, 'Aplicar', 'Apply')}{draft.targets.length > 1 ? ` (${draft.targets.length})` : ''}</button>
        <button type="button" className="mesa-btn mesa-btn-lg is-quiet arc-discard" disabled={busy} onClick={onDiscard}>✕ {L(lang, 'Descartar', 'Discard')}</button>
      </div>
    </section>
  );
}
