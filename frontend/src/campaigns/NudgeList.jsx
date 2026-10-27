// Avisos da mesa (UI). A lógica fica em nudges.js; aqui só mostramos e, quando o
// mestre clica em "Aplicar", chamamos a API já existente. Nada é automático.
import { errorMessage } from '../api/errors.js';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import Utils from '../../utils.js';
import {
  NUDGE_TYPES, buildNudges, nudgePrefs, pruneDismissed, stateWithConcentration, stateWithNudgePref, visibleNudges,
} from './nudges.js';
import { patchState } from '../play/play-api.js';
import MesaSheet, { mesaLayer } from '../shell/MesaSheet.jsx';
import './table-now.css';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

const safeSlots = (data) => { try { return Utils.spellSlots(data) || []; } catch { return []; } };

// "Dispensar" é por aparelho e por evento: guardado por campanha e podado
// quando o evento some (ver pruneDismissed).
const lsKey = (id) => `forja:nudges-dismissed:${id}`;
function readDismissed(id) {
  try { const v = JSON.parse(localStorage.getItem(lsKey(id)) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function writeDismissed(id, list) {
  try { localStorage.setItem(lsKey(id), JSON.stringify(list.slice(-200))); } catch { /* modo privado */ }
}

/** Executa a ação descrita por um aviso (só depois do clique do mestre). */
export async function runNudgeOp(op, campaign) {
  if (!op) return;
  switch (op.kind) {
    case 'combat': return api.combatAction(campaign.id, op.body);
    case 'updateCombatant': return api.updateCombatant(campaign.id, op.combatantId, op.body);
    case 'check': return api.createCheck(campaign.id, op.body);
    case 'clearConcentration':
      // PATCH por chave: não atropela o que outra aba mudou no state.
      await patchState(campaign.id, { concentration: stateWithConcentration(campaign.state, op.key, '').concentration });
      if (op.characterId) await api.dmEditCharacter(op.characterId, { data: { concentration: null } });
      return null;
    default: return null;
  }
}

/**
 * Estado dos avisos para uma tela. `combat === undefined` = ainda carregando
 * (não poda os dispensados, senão um piscar do polling traria tudo de volta).
 */
export function useNudges({ campaign, combat, lang, onChange }) {
  const [dismissed, setDismissed] = useState(() => readDismissed(campaign.id));
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const prefs = useMemo(() => nudgePrefs(campaign.state), [campaign.state]);
  const all = useMemo(
    () => buildNudges({ campaign, combat: combat || null, lang, prefs, slotsMax: safeSlots }),
    [campaign, combat, lang, prefs],
  );

  useEffect(() => {
    if (combat === undefined) return;
    setDismissed(prev => {
      const next = pruneDismissed(prev, all);
      if (next.length === prev.length) return prev;
      writeDismissed(campaign.id, next);
      return next;
    });
  }, [all, combat, campaign.id]);

  const dismiss = useCallback((id) => {
    setDismissed(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeDismissed(campaign.id, next);
      return next;
    });
  }, [campaign.id]);

  const setPref = useCallback(async (type, on) => {
    setError('');
    try {
      await patchState(campaign.id, { nudges: stateWithNudgePref(campaign.state, type, on).nudges });
      onChange?.();
    } catch (e) { setError(errorMessage(e)); }
  }, [campaign.id, campaign.state, onChange]);

  const run = useCallback(async (nudge, action) => {
    setBusy(`${nudge.id}:${action.id}`); setError('');
    try {
      await runNudgeOp(action.op, campaign);
      dismiss(nudge.id);
      onChange?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally { setBusy(null); }
  }, [campaign, dismiss, onChange]);

  const visible = useMemo(() => visibleNudges(all, dismissed), [all, dismissed]);
  return { all, visible, prefs, dismiss, setPref, run, busy, error };
}

const SEV_ICON = { danger: '⚠', warn: '◆', info: '•' };

/** Lista discreta de avisos com Aplicar / Dispensar / Não avisar mais. */
export function NudgeList({ nudges, lang, compact = false }) {
  const { visible, dismiss, setPref, run, busy, error } = nudges;
  if (!visible.length) {
    return <p className="nudge-empty muted small">{L(lang, 'Nenhum aviso agora.', 'No notices right now.')}</p>;
  }
  return (
    <>
      {error && <div className="nudge-error" role="alert">{error}</div>}
      <ul className={`nudge-list ${compact ? 'is-compact' : ''}`}>
        {visible.map(n => (
          <li key={n.id} className={`nudge sev-${n.severity}`}>
            <span className="nudge-icon" aria-hidden="true">{SEV_ICON[n.severity]}</span>
            <div className="nudge-body">
              <p className="nudge-text">{n.text}</p>
              <div className="nudge-actions">
                {n.actions.map(a => (
                  <button key={a.id} type="button" className={`btn btn-sm ${a.id === 'apply' ? 'btn-primary' : 'btn-ghost'}`}
                    disabled={!!busy} onClick={() => run(n, a)}>
                    {busy === `${n.id}:${a.id}` ? '…' : a.label}
                  </button>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => dismiss(n.id)}
                  title={L(lang, 'Some só para este evento', 'Hides it for this event only')}>
                  {L(lang, 'Dispensar', 'Dismiss')}
                </button>
                <button type="button" className="nudge-mute" onClick={() => setPref(n.type, false)}
                  title={L(lang, 'Desliga este tipo de aviso em todos os seus aparelhos', 'Turns this kind of notice off on all your devices')}>
                  {L(lang, 'Não avisar mais isto', "Don't warn about this")}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Painel de configuração: quais tipos avisar. */
export function NudgeSettings({ nudges, lang }) {
  const { prefs, setPref } = nudges;
  return (
    <div className="nudge-settings">
      <p className="muted small" style={{ margin: '0 0 6px' }}>
        {L(lang,
          'Os avisos só sugerem: nada é aplicado sem o seu clique. Vale em todos os seus aparelhos.',
          'Notices only suggest: nothing is applied without your click. Applies on all your devices.')}
      </p>
      {NUDGE_TYPES.map(t => (
        <label key={t.id} className="nudge-pref">
          <input type="checkbox" checked={!!prefs[t.id]} onChange={e => setPref(t.id, e.target.checked)} />
          <span>
            <strong>{L(lang, t.pt, t.en)}</strong>
            {!t.default && <span className="nudge-default-off"> {L(lang, '(desligado por padrão)', '(off by default)')}</span>}
            <span className="muted small nudge-hint">{L(lang, t.hintPt, t.hintEn)}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function useNarrow(q = '(max-width: 767px)') {
  const [on, setOn] = useState(() => { try { return window.matchMedia(q).matches; } catch { return false; } });
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(q); } catch { return undefined; }
    const upd = () => setOn(mq.matches);
    upd();
    mq.addEventListener?.('change', upd);
    return () => mq.removeEventListener?.('change', upd);
  }, [q]);
  return on;
}

/**
 * Contador leve para a aba de combate: sino com número, toast discreto quando
 * surge um aviso novo e a lista dos avisos.
 * - Celular (≤ 767): a lista abre numa folha da mesa (MesaSheet), sempre
 *   inteira dentro da tela, com os botões de 44 px.
 * - Tablet/desktop: lista suspensa ancorada no sino, empurrada para dentro da
 *   tela se passar da borda; Esc e toque fora fecham.
 * - compact: só 🔔 + número (a palavra "avisos" fica para o leitor de tela) —
 *   usado na faixa do turno, onde o espaço é curto.
 * O toast vai para a camada da mesa (portal), fora da faixa presa.
 */
export function NudgeBell({ campaign, combat, lang, onChange, compact = false }) {
  const nudges = useNudges({ campaign, combat, lang, onChange });
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const seen = useRef(null);
  const wrapRef = useRef(null);
  const popRef = useRef(null);
  const narrow = useNarrow();
  const count = nudges.visible.length;

  useEffect(() => {
    const ids = nudges.visible.map(n => n.id);
    if (seen.current === null) { seen.current = new Set(ids); return undefined; }
    const fresh = nudges.visible.find(n => !seen.current.has(n.id));
    ids.forEach(id => seen.current.add(id));
    if (fresh && !open) setToast(fresh);
    return undefined;
  }, [nudges.visible, open]);

  useEffect(() => {
    if (!toast) return undefined;
    const tm = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(tm);
  }, [toast]);

  // Lista suspensa (desktop): dentro da tela, Esc e toque fora fecham.
  useLayoutEffect(() => {
    const el = popRef.current;
    if (!open || narrow || !el) return;
    el.style.left = ''; el.style.right = '';
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const wrap = wrapRef.current?.getBoundingClientRect();
    if (!wrap) return;
    if (r.left < 8) { el.style.right = 'auto'; el.style.left = `${8 - wrap.left}px`; }
    else if (r.right > vw - 8) { el.style.right = `${wrap.right - (vw - 8)}px`; }
    // A lista abre para baixo: não passa do fim da janela (rola por dentro, .nudge-pop tem overflow:auto).
    el.style.maxHeight = `${Math.max(220, window.innerHeight - r.top - 8)}px`;
  }, [open, narrow, count]);
  useEffect(() => {
    if (!open || narrow) return undefined;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDoc); window.removeEventListener('keydown', onKey); };
  }, [open, narrow]);

  const word = L(lang, count === 1 ? 'aviso' : 'avisos', count === 1 ? 'notice' : 'notices');
  const layer = typeof document !== 'undefined' ? mesaLayer() : null;
  const toastEl = (
    <div className="nudge-toast-slot" aria-live="polite">
      {toast && !open && (
        <button type="button" className={`nudge-toast sev-${toast.severity}`} onClick={() => { setOpen(true); setToast(null); }}>
          <span aria-hidden="true">{SEV_ICON[toast.severity]}</span> {toast.text}
        </button>
      )}
    </div>
  );

  return (
    <div className={`nudge-bell-wrap ${compact ? 'is-compact' : ''}`} ref={wrapRef}>
      <button type="button" className={`nudge-bell ${count ? 'has-items' : ''}`} aria-expanded={open}
        aria-haspopup={narrow ? 'dialog' : undefined}
        aria-label={`${count} ${word}`}
        onClick={() => { setOpen(v => !v); setToast(null); }}
        title={L(lang, 'Avisos da mesa (só sugestões)', 'Table notices (suggestions only)')}>
        <span aria-hidden="true">🔔</span>
        <span className="nudge-bell-count" aria-hidden="true">{count}</span>
        <span className="nudge-bell-word" aria-hidden="true">{word}</span>
      </button>
      {open && !narrow && (
        <div className="nudge-pop" role="region" aria-label={L(lang, 'Avisos', 'Notices')} ref={popRef}>
          <div className="nudge-pop-head">
            <strong>{L(lang, 'Avisos', 'Notices')}</strong>
            <button type="button" className="mesa-icon-btn" onClick={() => setOpen(false)} aria-label={L(lang, 'Fechar', 'Close')}>✕</button>
          </div>
          <p className="nudge-pop-hint">{L(lang, 'Só sugestões: nada é aplicado sem o seu toque.', 'Suggestions only: nothing is applied without your tap.')}</p>
          <NudgeList nudges={nudges} lang={lang} compact />
        </div>
      )}
      {open && narrow && (
        <MesaSheet title={L(lang, 'Avisos', 'Notices')} icon="🔔" size="auto" width="sm" lang={lang} dock="play"
          onClose={() => setOpen(false)} className="nudge-sheet">
          <p className="mesa-sheet-text">{L(lang, 'Só sugestões: nada é aplicado sem o seu toque.', 'Suggestions only: nothing is applied without your tap.')}</p>
          <NudgeList nudges={nudges} lang={lang} />
        </MesaSheet>
      )}
      {layer ? createPortal(toastEl, layer) : toastEl}
    </div>
  );
}
