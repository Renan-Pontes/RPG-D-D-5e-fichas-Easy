// Painel de PV condensado (regras em src/sheet/hp-logic.js):
//   barra de PV temporários e barra de PV (10 fatias), cada uma com o próprio botão de
//   arrastar na ponta do preenchimento · uma linha para Exaustão (6) · uma linha para os
//   Testes contra a Morte: falhas à esquerda, o d20 no meio (só a 0 PV), sucessos à direita.
// Arrastar: o número cresce exponencialmente com a distância, aparece numa lente sobre o
// botão e entra ao soltar; o botão volta para a ponta. Com o descanso curto ligado, puxar a
// barra de PV para a direita gasta Dados de Vida (rolagens) em vez de números fixos.
import { useRef, useState } from 'react';
import {
  SLICES, EXHAUSTION_MAX, filledSlices, hitDicePools, exhaustionLevel, setExhaustion, toggleTo,
  hpSliderRange, deltaLabel, dragAmount, diceForDrag, pickDice, diceLabel, spendHitDiceRolls, deathSaveResult,
} from './hp-logic.js';
import { useRestMode } from './rest-mode.jsx';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const d = (n) => 1 + Math.floor(Math.random() * n);

/**
 * Barra arrastável. `pct` = onde o botão mora (fim do preenchimento). `read(dx)` devolve
 * { label, tone } para a lente (ou null = nada); `commit(dx)` aplica ao soltar.
 * Teclado: setas acumulam o arrasto em passos, Enter aplica, Esc desfaz.
 */
function DragBar({ className, pct, label, valueText, read, commit, disabled, children }) {
  const ref = useRef(null);
  const start = useRef(null);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const info = dx ? read(dx) : null;
  // perto das bordas a lente encosta para dentro (não some cortada pelo painel)
  const w = ref.current?.clientWidth || 300;
  const at = (pct / 100) * w + dx;
  const edge = at > w - 70 ? 'right' : at < 70 ? 'left' : '';
  const end = (apply) => {
    if (apply && dx) commit(dx);
    start.current = null; setDrag(false); setDx(0);
  };
  return (
    <div ref={ref} className={`fh-dragbar ${className}${drag ? ' is-dragging' : ''}${info?.tone ? ` is-${info.tone}` : ''}`}
      onPointerDown={e => {
        if (disabled) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start.current = e.clientX; setDrag(true); setDx(0);
      }}
      onPointerMove={e => { if (start.current != null) setDx(e.clientX - start.current); }}
      onPointerUp={() => end(true)}
      onPointerCancel={() => end(false)}>
      {children}
      <span className="fh-knob" role="slider" tabIndex={disabled ? -1 : 0} aria-label={label}
        aria-valuetext={info ? info.label : valueText} aria-disabled={disabled || undefined}
        style={{ left: `${pct}%`, transform: `translateX(calc(-50% + ${dx}px))` }}
        onKeyDown={e => {
          if (disabled) return;
          const step = e.shiftKey ? 40 : 14;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setDx(v => v + step); }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setDx(v => v - step); }
          else if (e.key === 'Enter') { e.preventDefault(); end(true); }
          else if (e.key === 'Escape') end(false);
        }}
        onBlur={() => { if (!drag) setDx(0); }}>
        {info && <span className={`fh-lens${edge ? ` is-${edge}` : ''}`} aria-hidden="true">{info.label}</span>}
      </span>
    </div>
  );
}

/** Fileira de fatias clicáveis. `reverse`: acende da direita para a esquerda (falhas). */
function Pips({ n, on, kind, label, onPick, reverse }) {
  return (
    <span className={`fh-pips is-${kind}${reverse ? ' is-reverse' : ''}`} role="group" aria-label={label}>
      {Array.from({ length: n }, (_, i) => (
        <button key={i} type="button" className={`fh-pip${i < on ? ' is-on' : ''}`}
          aria-pressed={i < on} aria-label={`${label}: ${i + 1}`} onClick={() => onPick(toggleTo(on, i))} />
      ))}
    </span>
  );
}

export default function HpTracker({ char, lang, update, applyHp, byDie, conMod, hpPct, hints = {} }) {
  const rest = useRestMode();
  const short = rest?.mode === 'short';
  const max = Math.max(1, char.maxHp || 1);
  const temp = Math.max(0, char.tempHp || 0);
  const on = filledSlices(char.currentHp, max);
  const exh = exhaustionLevel(char);
  const ds = char.deathSaves || { success: 0, fail: 0 };
  const down = char.currentHp === 0;
  const range = hpSliderRange(char);
  const pools = hitDicePools(byDie, char);
  const hdLeft = pools.reduce((a, p) => a + p.left, 0);
  const [note, setNote] = useState(null);     // última rolagem (dados de vida / morte)

  // PV: dano à esquerda; à direita cura — ou, no descanso curto, Dados de Vida
  const readHp = (dx) => {
    if (short && dx > 0) {
      const n = diceForDrag(dx, hdLeft);
      return n ? { label: diceLabel(pickDice(pools, n), conMod), tone: 'dice' } : { label: L(lang, 'sem DV', 'no HD'), tone: '' };
    }
    const v = dragAmount(dx, range);
    return v ? { label: deltaLabel(v), tone: v < 0 ? 'hurt' : 'heal' } : null;
  };
  const commitHp = (dx) => {
    if (short && dx > 0) {
      const picks = pickDice(pools, diceForDrag(dx, hdLeft));
      if (!picks.length) return;
      const rolls = picks.map(p => Array.from({ length: p.count }, () => d(p.die)));
      const r = spendHitDiceRolls(char, byDie, picks, rolls, conMod);
      if (!r) return;
      update(r.patch);
      setNote({ key: Date.now(), text: `${diceLabel(picks, conMod)}: ${r.detail.join(' + ')}${conMod ? ` ${conMod > 0 ? '+' : '−'} ${Math.abs(conMod * r.detail.length)}` : ''} → +${r.gained}` });
      return;
    }
    const v = dragAmount(dx, range);
    if (v) applyHp(v);
  };
  // PV temporários: o arrasto soma/tira do valor atual (nunca abaixo de 0)
  const readTemp = (dx) => {
    const v = dragAmount(dx, { min: -temp, max: max * 2 });
    return v ? { label: `${temp + v}`, tone: v < 0 ? 'hurt' : 'temp' } : null;
  };
  const commitTemp = (dx) => { const v = dragAmount(dx, { min: -temp, max: max * 2 }); if (v) update({ tempHp: temp + v }); };

  const deathRoll = () => {
    if (!down) return;
    const n = d(20);
    const r = deathSaveResult(char, n);
    update(r.patch);
    const say = {
      crit: L(lang, '20! Volta com 1 PV', '20! Back with 1 HP'), stable: L(lang, 'estável', 'stable'),
      dead: L(lang, 'morto', 'dead'), fumble: L(lang, '1: duas falhas', '1: two failures'),
      success: L(lang, 'sucesso', 'success'), fail: L(lang, 'falha', 'failure'),
    }[r.kind];
    setNote({ key: Date.now(), text: `d20: ${n} · ${say}`, death: r.kind });
  };

  return (
    <div className={`fh-hpt${short ? ' is-short-rest' : ''}`}>
      <DragBar className="is-temp" pct={Math.min(100, (temp / max) * 100)}
        label={L(lang, 'PV temporários: arraste para mudar', 'Temporary HP: drag to change')} valueText={String(temp)}
        read={readTemp} commit={commitTemp}>
        <div className="fh-hpt-temp" aria-hidden="true">
          <div className="fh-hpt-temp-fill" style={{ width: `${Math.min(100, (temp / max) * 100)}%` }} />
        </div>
        <span className="fh-hpt-temp-tag" aria-hidden="true">{temp ? `+${temp} ${L(lang, 'temp', 'temp')}` : L(lang, 'temp', 'temp')}{hints.temp}</span>
      </DragBar>

      <DragBar className="is-hp" pct={hpPct}
        label={short
          ? L(lang, 'Pontos de Vida: arraste para a direita para gastar Dados de Vida, para a esquerda para dano', 'Hit points: drag right to spend Hit Dice, left for damage')
          : L(lang, 'Pontos de Vida: arraste para a esquerda para dano, para a direita para cura', 'Hit points: drag left for damage, right for healing')}
        valueText={`${char.currentHp}`} read={readHp} commit={commitHp}>
        <div className="hp-bar fh-hpt-bar" aria-hidden="true">
          <div className="fh-hp-ghost" style={{ width: `${hpPct}%` }} />
          <div className="hp-bar-fill" style={{ width: `${hpPct}%` }} />
          <div className="fh-hpt-slices">
            {Array.from({ length: SLICES }, (_, i) => <span key={i} className={i < on ? 'is-on' : ''} />)}
          </div>
        </div>
      </DragBar>
      {short && (
        <div className="fh-hpt-rest" role="status">
          ☕ {hdLeft
            ? L(lang, `Puxe a barra para a direita para gastar Dados de Vida (${hdLeft} livres)`, `Pull the bar right to spend Hit Dice (${hdLeft} left)`)
            : L(lang, 'Sem Dados de Vida livres', 'No Hit Dice left')}{hints.hitDice}
        </div>
      )}

      <div className="fh-hpt-row is-exh">
        <span className="fh-hpt-cap">{L(lang, 'Exaustão', 'Exhaustion')}{hints.exhaustion}</span>
        <Pips n={EXHAUSTION_MAX} on={exh} kind="exh" label={L(lang, 'Exaustão', 'Exhaustion')} onPick={lv => update(setExhaustion(char, lv))} />
      </div>

      <div className={`fh-hpt-row is-death${down ? ' is-down' : ''}`}>
        <span className="fh-ds-mark is-ko" aria-hidden="true">✗</span>
        <Pips n={3} on={ds.fail} kind="ko" reverse label={L(lang, 'Falhas', 'Failures')} onPick={n => update({ deathSaves: { ...ds, fail: n } })} />
        <button type="button" className="fh-death-die" disabled={!down} onClick={deathRoll}
          aria-label={down ? L(lang, 'Rolar teste contra a morte', 'Roll death save') : L(lang, 'Teste contra a morte (só a 0 PV)', 'Death save (only at 0 HP)')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 21 7v10l-9 5-9-5V7z" /><path d="M12 2v20M3 7l9 5 9-5" /></svg>
        </button>
        <Pips n={3} on={ds.success} kind="ok" label={L(lang, 'Sucessos', 'Successes')} onPick={n => update({ deathSaves: { ...ds, success: n } })} />
        <span className="fh-ds-mark is-ok" aria-hidden="true">✓</span>
        {hints.death}
      </div>

      {note && <div key={note.key} className={`fh-hpt-note${note.death ? ` is-${note.death}` : ''}`} role="status">{note.text}</div>}
    </div>
  );
}
