/* Rolador de dados: botão flutuante + sheet inferior + overlay com dado 3D.
 *
 * - Sheet inferior sem fundo escuro: não bloqueia a ficha (dá pra tocar numa
 *   perícia com ele aberto); o body ganha padding para rolar o conteúdo acima.
 * - Fecha por X, alça (toque/arrastar pra baixo) ou Esc.
 * - Fórmula rápida ("2d6+3"), vantagem/desvantagem, histórico recente (local).
 * - API global usada pela ficha:
 *     window.__diceRoll({ die, count, mod, label, advMode })  → rola local
 *     window.__diceShow({ label, groups, mod, total, isCrit, isFumble, who })
 *       → só MOSTRA um resultado já decidido (servidor, mestre, dado físico).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from './Icons.jsx';
import { t } from '../data/i18n.js';
import DieShape from '../src/dice/DieShape.jsx';
import DiceStage, { preloadDice3D, effectiveAnimMode } from '../src/dice/DiceStage.jsx';
import { parseFormula, rollFormula, breakdown, formatMod } from '../src/dice/dice-math.js';
import {
  getAnimPref, setAnimPref, loadHistory, saveHistory, loadRecentFormulas, saveRecentFormulas,
} from '../src/dice/dice-prefs.js';
import '../src/dice/dice-styles.css';

const DICE = [4, 6, 8, 10, 12, 20, 100];
const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const ANIM_NEXT = { '3d': '2d', '2d': 'off', off: '3d' };

function nowLabel(lang) {
  return new Date().toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

const DiceRoller = ({ lang }) => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);
  const [advMode, setAdvMode] = useState('normal');
  const [formula, setFormula] = useState('');
  const [formulaError, setFormulaError] = useState(false);
  const [log, setLog] = useState(() => loadHistory());
  const [recent, setRecent] = useState(() => loadRecentFormulas());
  const [overlay, setOverlay] = useState(null);
  const [pop, setPop] = useState(null);
  const [animPref, setAnimPrefState] = useState(() => getAnimPref());
  const [showHistory, setShowHistory] = useState(false);
  const [fabHidden, setFabHidden] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef(null);
  const draggedRef = useRef(false);
  const sheetRef = useRef(null);

  useEffect(() => { saveHistory(log); }, [log]);

  // Mostra um resultado pronto (overlay 3D/2D ou pop discreto) e registra no histórico.
  const present = useCallback((entry) => {
    const full = { id: Date.now() + Math.random(), ts: nowLabel(lang), ...entry };
    setLog(prev => [full, ...prev].slice(0, 30));
    if (navigator.vibrate) navigator.vibrate(full.isCrit ? [60, 40, 100] : 30);
    if (effectiveAnimMode(animPref) === 'off') {
      setOverlay(null);
      setPop(full);
    } else {
      setPop(null);
      setOverlay({ ...full, settled: false });
    }
    return full;
  }, [lang, animPref]);

  const rollParsed = useCallback((parsed, { label, adv = 'normal' } = {}) => {
    const r = rollFormula(parsed, { adv });
    return present({
      label: label || parsed.text,
      formula: parsed.text,
      groups: r.groups.map(g => ({ die: g.sides, sign: g.sign, rolls: g.rolls })),
      mod: r.mod, total: r.total, isCrit: r.isCrit, isFumble: r.isFumble, adv: r.adv,
    });
  }, [present]);

  // Compatível com a ficha: { die, count, mod, label, advMode }.
  const performRoll = useCallback(({ die = 20, count: cnt = 1, mod: m = 0, label = '', advMode: am } = {}) => {
    const parsed = parseFormula(`${cnt}d${die}${formatMod(m)}`);
    if (!parsed) return null;
    return rollParsed(parsed, { label, adv: am ?? advMode });
  }, [rollParsed, advMode]);

  const showResult = useCallback((res = {}) => present({
    label: res.label || '',
    who: res.who || '',
    formula: res.formula || '',
    groups: res.groups || [],
    mod: res.mod || 0,
    total: res.total,
    isCrit: !!res.isCrit,
    isFumble: !!res.isFumble,
    adv: res.adv || 'normal',
    source: res.source || 'server',
  }), [present]);

  useEffect(() => {
    window.__diceRoll = performRoll;
    window.__diceShow = showResult;
    return () => { window.__diceRoll = null; window.__diceShow = null; };
  }, [performRoll, showResult]);

  // Sheet aberto: pré-carrega o 3D e reserva espaço no fim da página.
  useEffect(() => {
    if (!open) { document.body.style.removeProperty('--dice-sheet-h'); document.body.classList.remove('dice-sheet-open'); return undefined; }
    if (effectiveAnimMode(animPref) === '3d') preloadDice3D().catch(() => {});
    document.body.classList.add('dice-sheet-open');
    const el = sheetRef.current;
    const setH = () => el && document.body.style.setProperty('--dice-sheet-h', `${el.offsetHeight}px`);
    setH();
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(setH) : null;
    ro?.observe(el);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      ro?.disconnect();
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('dice-sheet-open');
      document.body.style.removeProperty('--dice-sheet-h');
    };
  }, [open, animPref]);

  // Botão flutuante some ao rolar pra baixo (não cobre botões) e volta ao subir.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 8) return;
      setFabHidden(y > lastY && y > 120);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Com a página parada, o botão não pode ficar em cima de outro botão/campo
  // (ex.: "Descanso curto" no canto da Mesa agora): se houver algo clicável
  // embaixo dele, ele sobe o suficiente para liberar esse controle.
  const fabRef = useRef(null);
  const [fabLift, setFabLift] = useState(0);
  const liftRef = useRef(0);
  useEffect(() => {
    if (open) return undefined;
    const INTERACTIVE = 'button, a[href], input, select, textarea, summary, label, [role="button"], [role="tab"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';
    const blockerTop = (rect) => {
      let top = null;
      const xs = [rect.left + 6, rect.left + rect.width / 2, rect.right - 6];
      const ys = [rect.top + 6, rect.top + rect.height / 2, rect.bottom - 6];
      for (const x of xs) for (const y of ys) {
        for (const el of document.elementsFromPoint(x, y)) {
          if (fabRef.current && (el === fabRef.current || fabRef.current.contains(el))) continue;
          const hit = el.closest(INTERACTIVE);
          if (hit && !hit.closest('.dice-fab, .dice-sheet')) {
            const r = hit.getBoundingClientRect();
            top = top == null ? r.top : Math.min(top, r.top);
          }
          break; // só o elemento visível logo abaixo do botão
        }
      }
      return top;
    };
    const check = () => {
      const fab = fabRef.current;
      if (!fab || fab.classList.contains('is-hidden')) return;
      const cur = fab.getBoundingClientRect();
      const base = { left: cur.left, right: cur.right, top: cur.top + liftRef.current, bottom: cur.bottom + liftRef.current, width: cur.width, height: cur.height };
      let lift = 0;
      for (let i = 0; i < 3; i++) {
        const r = { ...base, top: base.top - lift, bottom: base.bottom - lift };
        const top = blockerTop(r);
        if (top == null) break;
        lift = base.bottom - top + 8;
        if (lift > window.innerHeight * 0.45) { lift = 0; break; } // não dá pra desviar: fica onde está
      }
      lift = Math.max(0, Math.round(lift));
      if (lift !== liftRef.current) { liftRef.current = lift; setFabLift(lift); }
    };
    let timer = null;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(check, 180); };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(schedule) : null;
    mo?.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      mo?.disconnect();
    };
  }, [open]);

  // Overlay: fecha sozinho alguns segundos depois de parar.
  useEffect(() => {
    if (!overlay?.settled) return undefined;
    const id = setTimeout(() => setOverlay(null), overlay.isCrit || overlay.isFumble ? 5000 : 3500);
    return () => clearTimeout(id);
  }, [overlay?.settled, overlay?.id]);

  useEffect(() => {
    if (!pop) return undefined;
    const id = setTimeout(() => setPop(null), 3500);
    return () => clearTimeout(id);
  }, [pop?.id]);

  const submitFormula = (e) => {
    e?.preventDefault?.();
    const parsed = parseFormula(formula);
    if (!parsed) { setFormulaError(true); return; }
    setFormulaError(false);
    rollParsed(parsed, { adv: advMode });
    const next = [parsed.text, ...recent.filter(f => f !== parsed.text)].slice(0, 6);
    setRecent(next);
    saveRecentFormulas(next);
  };

  const repeat = (entry) => {
    const parsed = entry.formula && parseFormula(entry.formula);
    if (parsed) rollParsed(parsed, { label: entry.label, adv: entry.adv || 'normal' });
  };

  const cycleAnim = () => {
    const next = ANIM_NEXT[animPref] || '3d';
    setAnimPrefState(next);
    setAnimPref(next);
  };

  // Arrastar a alça pra baixo fecha.
  const onDragStart = (e) => {
    dragStart.current = e.clientY;
    draggedRef.current = false;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* ok */ }
  };
  const onDragMove = (e) => {
    if (dragStart.current == null) return;
    const dy = Math.max(0, e.clientY - dragStart.current);
    if (dy > 6) draggedRef.current = true;
    setDrag(dy);
  };
  const onDragEnd = () => {
    if (dragStart.current == null) return;
    const moved = drag;
    dragStart.current = null;
    setDrag(0);
    if (moved > 70) setOpen(false);
  };

  const last = log[0];
  const animLabel = { '3d': '3D', '2d': '2D', off: L(lang, 'Sem animação', 'No animation') }[animPref];

  return (
    <>
      {!open && (
        <button
          ref={fabRef}
          className={`dice-fab no-print ${fabHidden ? 'is-hidden' : ''}`}
          style={fabLift ? { marginBottom: fabLift } : undefined}
          onClick={() => setOpen(true)}
          title={t('rollDice', lang)}
          aria-label={t('rollDice', lang)}
          aria-expanded={false}
        >
          <Icon name="dice" size={24}/>
        </button>
      )}

      {open && (
        <section
          ref={sheetRef}
          className="dice-sheet no-print"
          role="dialog"
          aria-modal="false"
          aria-label={t('rollDice', lang)}
          style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        >
          <div
            className="dice-sheet-grip"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            onClick={() => { if (!draggedRef.current) setOpen(false); draggedRef.current = false; }}
            role="button"
            tabIndex={0}
            aria-label={L(lang, 'Fechar rolador', 'Close roller')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(false); }}
          >
            <span className="dice-sheet-handle" />
          </div>

          <header className="dice-sheet-head">
            <strong className="dice-sheet-title">{t('rollDice', lang)}</strong>
            <button type="button" className="dice-sheet-anim" onClick={cycleAnim}
              title={L(lang, 'Animação dos dados (toque para trocar)', 'Dice animation (tap to change)')}>
              🎬 {animLabel}
            </button>
            <button type="button" className="dice-sheet-close" onClick={() => setOpen(false)} aria-label={L(lang, 'Fechar', 'Close')}>
              <Icon name="x" size={20}/>
            </button>
          </header>

          <div className="dice-sheet-body">
            {last && (
              <button type="button" className={`dice-last ${last.isCrit ? 'crit' : ''} ${last.isFumble ? 'fumble' : ''}`}
                onClick={() => repeat(last)} disabled={!last.formula}
                title={last.formula ? L(lang, 'Rolar de novo', 'Roll again') : undefined}>
                <span className="dice-last-text">
                  <span className="dice-last-label">{last.who ? `${last.who} · ` : ''}{last.label}</span>
                  <span className="dice-last-detail">{breakdown(last)}</span>
                </span>
                <span className="dice-last-total">{last.total}</span>
              </button>
            )}

            <form className="dice-formula" onSubmit={submitFormula}>
              <input
                className={`input dice-formula-input ${formulaError ? 'is-error' : ''}`}
                value={formula}
                onChange={e => { setFormula(e.target.value); setFormulaError(false); }}
                placeholder={L(lang, 'Fórmula: 2d6+3', 'Formula: 2d6+3')}
                aria-label={L(lang, 'Fórmula de dados', 'Dice formula')}
                autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="go"
              />
              <button type="submit" className="btn btn-primary dice-formula-go">{L(lang, 'Rolar', 'Roll')}</button>
            </form>
            {formulaError && (
              <div className="dice-formula-hint" role="alert">
                {L(lang, 'Use algo como 1d20+5, 2d6+3 ou 4d6.', 'Try 1d20+5, 2d6+3 or 4d6.')}
              </div>
            )}
            {recent.length > 0 && (
              <div className="dice-chips" aria-label={L(lang, 'Fórmulas recentes', 'Recent formulas')}>
                {recent.map(f => (
                  <button key={f} type="button" className="dice-chip" onClick={() => { const p = parseFormula(f); if (p) rollParsed(p, { adv: advMode }); }}>
                    {f}
                  </button>
                ))}
              </div>
            )}

            <div className="adv-toggle" role="group" aria-label={L(lang, 'Vantagem', 'Advantage')}>
              <button type="button" className={advMode === 'dis' ? 'active dis' : ''} aria-pressed={advMode === 'dis'}
                onClick={() => setAdvMode(advMode === 'dis' ? 'normal' : 'dis')}>
                {t('disadvantage', lang)}
              </button>
              <button type="button" className={advMode === 'normal' ? 'active' : ''} aria-pressed={advMode === 'normal'}
                onClick={() => setAdvMode('normal')}>
                {t('normal', lang)}
              </button>
              <button type="button" className={advMode === 'adv' ? 'active adv' : ''} aria-pressed={advMode === 'adv'}
                onClick={() => setAdvMode(advMode === 'adv' ? 'normal' : 'adv')}>
                {t('advantage', lang)}
              </button>
            </div>

            <div className="dice-controls">
              <div className="dice-control-group">
                <span className="dice-control-label">{L(lang, 'Qtd.', 'Count')}</span>
                <div className="dice-stepper">
                  <button type="button" onClick={() => setCount(c => Math.max(1, c - 1))} aria-label={L(lang, 'Menos dados', 'Fewer dice')}>−</button>
                  <span className="dice-stepper-val">{count}</span>
                  <button type="button" onClick={() => setCount(c => Math.min(20, c + 1))} aria-label={L(lang, 'Mais dados', 'More dice')}>+</button>
                </div>
              </div>
              <div className="dice-control-group">
                <span className="dice-control-label">{L(lang, 'Bônus', 'Modifier')}</span>
                <div className="dice-stepper">
                  <button type="button" onClick={() => setMod(m => m - 1)} aria-label={L(lang, 'Diminuir bônus', 'Decrease modifier')}>−</button>
                  <span className="dice-stepper-val">{mod >= 0 ? `+${mod}` : mod}</span>
                  <button type="button" onClick={() => setMod(m => m + 1)} aria-label={L(lang, 'Aumentar bônus', 'Increase modifier')}>+</button>
                </div>
              </div>
            </div>

            <div className="dice-picker">
              {DICE.map(d => (
                <button key={d} type="button" className={`dice-picker-btn ${d === 20 ? 'is-main' : ''}`}
                  onClick={() => performRoll({ die: d, count, mod })}
                  aria-label={`${L(lang, 'Rolar', 'Roll')} ${count}d${d}${formatMod(mod)}`}>
                  <DieShape die={d} value={`d${d}`} size={40}/>
                </button>
              ))}
            </div>
            <div className="dice-sheet-foot muted">
              {L(lang, 'Toque num dado para rolar', 'Tap a die to roll')} <code>{`${count}dX${formatMod(mod)}`}</code>
            </div>

            <div className="dice-sheet-history">
              <button type="button" className="dice-history-toggle" onClick={() => setShowHistory(v => !v)} aria-expanded={showHistory}>
                <Icon name={showHistory ? 'chevron-up' : 'chevron-down'} size={16}/>
                {L(lang, 'Histórico', 'History')} <span className="muted">({log.length})</span>
              </button>
              {showHistory && (
                <>
                  {log.length === 0 && <div className="muted text-sm dice-history-empty">{L(lang, 'Nenhuma rolagem ainda', 'No rolls yet')}</div>}
                  <ul className="dice-history-list">
                    {log.map(e => (
                      <li key={e.id} className={`dice-entry ${e.isCrit ? 'crit' : ''} ${e.isFumble ? 'fumble' : ''}`}>
                        <button type="button" className="dice-entry-btn" onClick={() => repeat(e)} disabled={!e.formula}>
                          <span className="dice-entry-label">
                            {e.who ? `${e.who} · ` : ''}{e.label}
                            {e.adv === 'adv' && <span className="badge badge-adv">VTG</span>}
                            {e.adv === 'dis' && <span className="badge badge-dis">DSV</span>}
                          </span>
                          <span className="dice-entry-detail">{breakdown(e)}</span>
                          <span className="dice-total">{e.total}</span>
                          <span className="dice-entry-ts">{e.ts}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {log.length > 0 && (
                    <button type="button" className="btn btn-sm btn-ghost dice-history-clear" onClick={() => setLog([])}>
                      {t('clearLog', lang)}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {pop && !overlay && (
        <div className={`roll-pop dice-pop no-print ${pop.isCrit ? 'crit' : ''} ${pop.isFumble ? 'fumble' : ''}`} role="status" onClick={() => setPop(null)}>
          <span className="dice-pop-label">{pop.label}</span> <strong>{pop.total}</strong>
        </div>
      )}

      {/* === Overlay da rolagem (3D com fallback 2D) === */}
      {overlay && (
        <div className="dice-overlay no-print" onClick={() => setOverlay(null)} role="status" aria-live="polite">
          <div className={`dice-overlay-inner ${overlay.settled && overlay.isCrit ? 'is-crit' : ''} ${overlay.settled && overlay.isFumble ? 'is-fumble' : ''}`}>
            <div className="dice-overlay-label">{overlay.who ? `${overlay.who} · ` : ''}{overlay.label}</div>
            <DiceStage
              key={overlay.id}
              groups={overlay.groups}
              tone={overlay.isCrit ? 'crit' : overlay.isFumble ? 'fumble' : null}
              className="dice-overlay-stage"
              onSettled={() => setOverlay(prev => (prev && prev.id === overlay.id ? { ...prev, settled: true } : prev))}
            />
            {overlay.settled && (
              <>
                <div className="dice-overlay-formula">{breakdown(overlay)}</div>
                <div className="dice-overlay-total">{overlay.total}</div>
                {overlay.isCrit && <div className="dice-overlay-flair crit-flair">★ {L(lang, 'CRÍTICO!', 'CRITICAL!')} ★</div>}
                {overlay.isFumble && <div className="dice-overlay-flair fumble-flair">{L(lang, 'FALHA CRÍTICA', 'CRITICAL MISS')}</div>}
                <span className="dice-overlay-dismiss muted">{L(lang, 'Toque para fechar', 'Tap to dismiss')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DiceRoller;
