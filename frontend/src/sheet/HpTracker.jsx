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
import { survivalStatus, stepDays, breathLabel, frigidMinutes } from './survival.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const d = (n) => 1 + Math.floor(Math.random() * n);

/**
 * Barra arrastável. `pct` = onde o botão mora (fim do preenchimento). `read(dx)` devolve
 * { label, tone } para a lente (ou null = nada); `commit(dx)` aplica ao soltar.
 * Teclado: setas acumulam o arrasto em passos, Enter aplica, Esc desfaz.
 */
function DragBar({ className, pct, label, valueText, read, commit, disabled, children, knob = 18 }) {
  const ref = useRef(null);
  const start = useRef(null);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  // o botão nunca sai da barra: o arrasto é preso entre as duas pontas
  // o botão mora DENTRO da barra: o centro anda de r até (largura − r), r = metade do botão
  const r = knob / 2;
  const w = Math.max(40, (ref.current?.clientWidth || 322) - knob);
  const home = (pct / 100) * w;
  const clamp = (v) => Math.max(-home, Math.min(w - home, v));
  const info = dx ? read(dx) : null;
  const edge = home + dx > w - 70 ? 'right' : home + dx < 70 ? 'left' : '';
  // durante o arrasto o preenchimento acompanha o botão; ao soltar, os dois deslizam
  // (transição do CSS) até o valor que entrou
  const now = Math.max(0, Math.min(100, ((home + dx) / w) * 100));
  const end = (apply) => {
    if (apply && dx) commit(dx);
    start.current = null; setDrag(false); setDx(0);
  };
  return (
    <div ref={ref} className={`fh-dragbar ${className}${drag ? ' is-dragging' : ''}${info?.tone ? ` is-${info.tone}` : ''}`}>
      {typeof children === 'function' ? children(drag ? now : pct, drag) : children}
      {/* só o botão pega o arrasto (a barra em volta não) */}
      <span className="fh-knob" role="slider" tabIndex={disabled ? -1 : 0} aria-label={label}
        aria-valuetext={info ? info.label : valueText} aria-disabled={disabled || undefined}
        style={{ width: knob, height: knob, marginTop: -r, left: `calc(${r}px + (100% - ${knob}px) * ${(drag ? now : Math.max(0, Math.min(100, pct))) / 100})` }}
        onPointerDown={e => {
          if (disabled) return;
          e.preventDefault(); e.stopPropagation();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          start.current = e.clientX; setDrag(true); setDx(0);
        }}
        onPointerMove={e => { if (start.current != null) setDx(clamp(e.clientX - start.current)); }}
        onPointerUp={() => end(true)}
        onPointerCancel={() => end(false)}
        onLostPointerCapture={() => { if (start.current != null) end(true); }}
        onKeyDown={e => {
          if (disabled) return;
          const step = e.shiftKey ? 40 : 14;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setDx(v => clamp(v + step)); }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setDx(v => clamp(v - step)); }
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
function Pips({ n, on, kind, label, onPick, reverse, inside }) {
  return (
    <span className={`fh-pips is-${kind}${reverse ? ' is-reverse' : ''}`} role="group" aria-label={label} data-label={inside || undefined}>
      {Array.from({ length: n }, (_, i) => (
        <button key={i} type="button" className={`fh-pip${i < on ? ' is-on' : ''}`}
          aria-pressed={i < on} aria-label={`${label}: ${i + 1}`} onClick={() => onPick(toggleTo(on, i))} />
      ))}
    </span>
  );
}

export default function HpTracker({ char, lang, update, applyHp, byDie, conMod, conScore = 10, hpPct, hints = {} }) {
  const rest = useRestMode();
  const short = rest?.mode === 'short';
  const max = Math.max(1, char.maxHp || 1);
  const temp = Math.max(0, char.tempHp || 0);
  const on = filledSlices(char.currentHp, max);
  const exh = exhaustionLevel(char);
  const ds = char.deathSaves || { success: 0, fail: 0 };
  const down = char.currentHp === 0;
  const bloodied = !down && char.currentHp <= max / 2;   // Sangrando: metade dos PV ou menos
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
    if (down && dx < 0) return dragAmount(dx) ? { label: L(lang, '+1 falha', '+1 failure'), tone: 'hurt' } : null;
    const v = dragAmount(dx, range);
    return v ? { label: deltaLabel(v), tone: v < 0 ? 'hurt' : 'heal' } : null;
  };
  const commitHp = (dx) => {
    if (short && dx > 0) {
      const picks = pickDice(pools, diceForDrag(dx, hdLeft));
      if (!picks.length) return;
      // os dados rolam no rolador da ficha (com a animação); a cura usa os números dele
      const nDice = picks.reduce((a, p) => a + p.count, 0);
      const formula = picks.map(p => `${p.count}d${p.die}`).join('+') + (conMod ? `${conMod > 0 ? '+' : '-'}${Math.abs(conMod * nDice)}` : '');
      const entry = typeof window !== 'undefined' && window.__diceRoll
        ? window.__diceRoll({ formula, label: L(lang, 'Dados de Vida', 'Hit Dice'), sheet: true })
        : null;
      const rolls = picks.map((p, i) => {
        const g = entry?.groups?.filter(x => x.die === p.die)?.[0] || entry?.groups?.[i];
        // o rolador devolve { value, kept } por dado
        const got = (g?.rolls || []).map(x => (typeof x === 'object' ? x.value : x)).filter(Number.isFinite).slice(0, p.count);
        return got.length === p.count ? got : Array.from({ length: p.count }, () => d(p.die));
      });
      const apply = () => { const r = spendHitDiceRolls(char, byDie, picks, rolls, conMod); if (r) update(r.patch); };
      if (entry) setTimeout(apply, 1900); else apply();
      return;
    }
    if (down && dx < 0) {
      // dano a 0 PV: uma falha no Teste contra a Morte (e deixa de estar estável)
      if (dragAmount(dx) < 0) update({ deathSaves: { ...ds, fail: Math.min(3, ds.fail + 1) }, stabilized: null });
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

  // Teste contra a morte: o d20 do rolador da ficha (com a animação de sempre); o
  // resultado entra quando o dado termina de girar.
  const [rolling, setRolling] = useState(false);
  const deathRoll = () => {
    if (!down || rolling) return;
    const entry = typeof window !== 'undefined' && window.__diceRoll
      ? window.__diceRoll({ die: 20, label: L(lang, 'Teste contra a morte', 'Death save'), sheet: true, isSave: true, adv: 'normal' })
      : null;
    const n = entry?.total ?? d(20);   // d20 sem modificador: o total é o número do dado
    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      const r = deathSaveResult(char, n);
      update(r.patch);
      let text;
      if (r.kind === 'stable') {
        // estável: logo depois do d20, rola o d4 de horas até recuperar 1 PV (com animação)
        const e4 = window.__diceRoll?.({ die: 4, label: L(lang, 'Estabilizado: horas para 1 PV', 'Stabilized: hours to 1 HP'), sheet: true });
        const h = e4?.total ?? d(4);
        setRolling(true);
        setTimeout(() => { setRolling(false); update({ ...r.patch, stabilized: { hours: h, at: new Date().toISOString() } }); }, e4 ? 1900 : 0);
        text = L(lang, `d20: ${n} · estável`, `d20: ${n} · stable`);
        setNote({ key: Date.now(), text, death: r.kind });
        return;
      } else {
        const say = {
          crit: L(lang, 'volta com 1 PV', 'back with 1 HP'), dead: L(lang, 'morto', 'dead'),
          fumble: L(lang, 'duas falhas', 'two failures'), success: L(lang, 'sucesso', 'success'), fail: L(lang, 'falha', 'failure'),
        }[r.kind];
        text = `d20: ${n} · ${say}`;
      }
      setNote({ key: Date.now(), text, death: r.kind });
    }, entry ? 1900 : 0);
  };

  return (
    <div className={`fh-hpt${short ? ' is-short-rest' : ''}`}>
      <DragBar className="is-temp" knob={12} pct={Math.min(100, (temp / max) * 100)}
        label={L(lang, 'PV temporários: arraste para mudar', 'Temporary HP: drag to change')} valueText={String(temp)}
        read={readTemp} commit={commitTemp}>
        {(fill) => (
          <>
            <div className="fh-hpt-temp" aria-hidden="true">
              <div className="fh-hpt-temp-fill" style={{ width: `${fill}%` }} />
            </div>
            <span className="fh-hpt-temp-tag" aria-hidden="true">{temp ? `+${temp} ${L(lang, 'temp', 'temp')}` : L(lang, 'temp', 'temp')}{hints.temp}</span>
          </>
        )}
      </DragBar>

      <DragBar className="is-hp" pct={hpPct}
        label={short
          ? L(lang, 'Pontos de Vida: arraste para a direita para gastar Dados de Vida, para a esquerda para dano', 'Hit points: drag right to spend Hit Dice, left for damage')
          : L(lang, 'Pontos de Vida: arraste para a esquerda para dano, para a direita para cura', 'Hit points: drag left for damage, right for healing')}
        valueText={`${char.currentHp}`} read={readHp} commit={commitHp}>
        {(fill) => (
          <div className={`hp-bar fh-hpt-bar${bloodied ? ' is-bloodied' : ''}`} aria-hidden="true">
            <div className="fh-hp-ghost" style={{ width: `${hpPct}%` }} />
            <div className="hp-bar-fill" style={{ width: `${fill}%` }} />
            <div className="fh-hpt-slices">
              {Array.from({ length: SLICES }, (_, i) => <span key={i} className={i < on ? 'is-on' : ''} />)}
            </div>
            {down && char.stabilized?.hours && (
              <span className="fh-hpt-bar-text">{L(lang, `Estabilizado · ${char.stabilized.hours} h para recuperar 1 PV`, `Stabilized · ${char.stabilized.hours} h to regain 1 HP`)}</span>
            )}
          </div>
        )}
      </DragBar>
      {short && (
        <div className="fh-hpt-rest" role="status">
          ☕ {hdLeft
            ? L(lang, `Puxe a barra para a direita para gastar Dados de Vida (${hdLeft} livres)`, `Pull the bar right to spend Hit Dice (${hdLeft} left)`)
            : L(lang, 'Sem Dados de Vida livres', 'No Hit Dice left')}{hints.hitDice}
        </div>
      )}

      <div className="fh-hpt-row is-exh">
        <Pips n={EXHAUSTION_MAX} on={exh} kind="exh" label={L(lang, 'Exaustão', 'Exhaustion')}
          inside={exh ? `${L(lang, 'Exaustão', 'Exhaustion')} ${exh}` : L(lang, 'Exaustão', 'Exhaustion')}
          onPick={lv => update(setExhaustion(char, lv))} />
      </div>

      <div className={`fh-hpt-row is-death${down ? ' is-down' : ''}`}>
        <Pips n={3} on={ds.fail} kind="ko" reverse label={L(lang, 'Falhas', 'Failures')} inside={L(lang, 'Falhas', 'Failures')} onPick={n => update({ deathSaves: { ...ds, fail: n } })} />
        <button type="button" className={`fh-death-die${rolling ? ' is-rolling' : ''}`} disabled={!down || rolling} onClick={deathRoll}
          aria-label={down ? L(lang, 'Rolar teste contra a morte', 'Roll death save') : L(lang, 'Teste contra a morte (só a 0 PV)', 'Death save (only at 0 HP)')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 21 7v10l-9 5-9-5V7z" /><path d="M12 2v20M3 7l9 5 9-5" /></svg>
        </button>
        <Pips n={3} on={ds.success} kind="ok" label={L(lang, 'Sucessos', 'Successes')} inside={L(lang, 'Sucessos', 'Successes')} onPick={n => update({ deathSaves: { ...ds, success: n } })} />

      </div>

      {/* Sobrevivência (src/sheet/survival.js): dias sem comida/água, fôlego, água gélida */}
      {(() => {
        const st = survivalStatus(char, conMod);
        const s = char.survival || {};
        const step = (key, dlt) => update(stepDays(char, key, dlt));
        const counter = (key, n, over, title, sub) => (
          <div className={`fh-surv-tile${over ? ' is-over' : n ? ' is-warn' : ''}`}>
            <span className="fh-surv-k">{title}</span>
            <span className="fh-surv-v">
              <button type="button" aria-label={L(lang, `${title}: menos um dia`, `${title}: one day less`)} onClick={() => step(key, -1)} disabled={!n}>−</button>
              <b className="mono">{n}</b>
              <button type="button" aria-label={L(lang, `${title}: mais um dia`, `${title}: one day more`)} onClick={() => step(key, 1)}>+</button>
            </span>
            <span className="fh-surv-s">{sub}</span>
          </div>
        );
        return (
          <div className="fh-surv" role="group" aria-label={L(lang, 'Sobrevivência', 'Survival')}>
            <div className={`fh-surv-tile is-state${st.nourished ? ' is-ok' : ' is-over'}`}>
              <span className="fh-surv-k">{L(lang, 'Nutrido', 'Nourished')}</span>
              <b className="fh-surv-big">{st.nourished ? '✓' : '✗'}</b>
              <span className="fh-surv-s">{st.nourished ? L(lang, 'comida e água em dia', 'food and water on track') : L(lang, 'faltando comida ou água', 'short of food or water')}</span>
            </div>
            {counter('food', s.food || 0, st.foodOver,
              L(lang, 'Sem comida', 'No food'),
              st.foodOver ? L(lang, `+1 exaustão/dia (limite ${st.foodLimit})`, `+1 exhaustion/day (limit ${st.foodLimit})`) : L(lang, `aguenta ${st.foodLimit} dias`, `lasts ${st.foodLimit} days`))}
            {counter('water', s.water || 0, st.waterOver,
              L(lang, 'Sem água', 'No water'),
              st.waterOver ? L(lang, '+1 exaustão ao fim do dia', '+1 exhaustion at day end') : L(lang, '1 galão/dia · ½: CD 15 CON', '1 gal/day · ½: DC 15 CON'))}
            <div className="fh-surv-tile">
              <span className="fh-surv-k">{L(lang, 'Fôlego', 'Breath')}</span>
              <b className="fh-surv-big">{1 + conMod < 1 ? '30 s' : `${1 + conMod} min`}</b>
              <span className="fh-surv-s">{breathLabel(conMod, lang)}</span>
            </div>
            <div className="fh-surv-tile">
              <span className="fh-surv-k">{L(lang, 'Água gélida', 'Frigid water')}</span>
              <b className="fh-surv-big">{`${frigidMinutes(conScore)} min`}</b>
              <span className="fh-surv-s">{L(lang, 'depois CD 10 CON/min', 'then DC 10 CON/min')}</span>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
