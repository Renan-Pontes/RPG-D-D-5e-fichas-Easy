// Painel de PV condensado (src/sheet/hp-logic.js tem as regras):
//   barra de PV temporários (em cima) · barra de PV em 10 fatias · embaixo, na mesma
//   largura, Exaustão (6) e Testes contra a Morte (3 + 3) · arrastar para dano/cura e
//   para PV temporários, com uma lente sobre o botão mostrando o valor · Dados de Vida
//   por tipo, que se gastam deslizando (ou tocando) com o descanso ligado.
import { useRef, useState } from 'react';
import {
  SLICES, EXHAUSTION_MAX, filledSlices, hitDicePools, spendHitDie, exhaustionLevel,
  setExhaustion, toggleTo, hpSliderRange, deltaLabel,
} from './hp-logic.js';
import { useRestMode } from './rest-mode.jsx';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const pctOf = (v, min, max) => (max === min ? 50 : ((v - min) / (max - min)) * 100);

/**
 * Controle de arrastar com lente. `value` é o valor em repouso; o arrasto só vale ao
 * soltar (ou Enter no teclado; Esc desfaz). `tone(v)` dá 'hurt' | 'heal' | ''.
 */
function DragLens({ min, max, rest, label, lens, tone, onCommit, disabled }) {
  const [v, setV] = useState(null);           // null = parado
  const cur = v ?? rest;
  const moving = v != null && v !== rest;
  const commit = () => { if (v != null && v !== rest) onCommit(v); setV(null); };
  const t = moving ? tone(cur) : '';
  return (
    <div className={`fh-drag${t ? ` is-${t}` : ''}${moving ? ' is-moving' : ''}`}>
      <input type="range" min={min} max={max} step="1" value={cur} disabled={disabled || min === max}
        aria-label={label} aria-valuetext={moving ? lens(cur) : String(rest)}
        onChange={e => setV(+e.target.value)}
        onPointerUp={commit} onTouchEnd={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setV(null); }}
        onBlur={() => setV(null)} />
      <span className="fh-drag-zero" style={{ left: `${pctOf(rest, min, max)}%` }} aria-hidden="true" />
      {moving && <span className="fh-drag-lens" style={{ left: `${pctOf(cur, min, max)}%` }} aria-hidden="true">{lens(cur)}</span>}
    </div>
  );
}

/** Fileira de fatias clicáveis (exaustão, sucessos, falhas). */
function Pips({ n, on, kind, label, onPick, disabled }) {
  return (
    <span className={`fh-pips is-${kind}`} role="group" aria-label={label}>
      {Array.from({ length: n }, (_, i) => (
        <button key={i} type="button" className={`fh-pip${i < on ? ' is-on' : ''}`} disabled={disabled}
          aria-pressed={i < on} aria-label={`${label}: ${i + 1}`} onClick={() => onPick(toggleTo(on, i))} />
      ))}
    </span>
  );
}

export default function HpTracker({ char, lang, update, applyHp, byDie, conMod, hpPct, roll, hints = {} }) {
  const rest = useRestMode();
  const resting = rest?.mode || null;
  const max = Math.max(1, char.maxHp || 1);
  const temp = Math.max(0, char.tempHp || 0);
  const on = filledSlices(char.currentHp, max);
  const exh = exhaustionLevel(char);
  const ds = char.deathSaves || { success: 0, fail: 0 };
  const range = hpSliderRange(char);
  const pools = hitDicePools(byDie, char);
  const [last, setLast] = useState(null);     // { die, rolled, gain } da última cura por dado
  const swipe = useRef(null);

  const spend = (die) => {
    if (!resting) return;
    const rolled = 1 + Math.floor(Math.random() * die);
    const p = spendHitDie(char, byDie, die, rolled, conMod);
    if (!p) return;
    const { gained, ...patch } = p;
    update(patch);
    setLast({ die, rolled, gain: gained, key: Date.now() });
  };
  const swipeStart = (e) => { swipe.current = { x: e.clientX, y: e.clientY }; };
  const swipeEnd = (die) => (e) => {
    const s = swipe.current; swipe.current = null;
    if (!s) return;
    if (Math.abs(e.clientX - s.x) > 24 || Math.abs(e.clientY - s.y) > 24) spend(die);
  };

  return (
    <div className={`fh-hpt${resting ? ` is-resting is-${resting}` : ''}`}>
      {/* PV temporários: barra fina em cima (fração do máximo) */}
      <div className={`fh-hpt-temp${temp ? ' has-temp' : ''}`} aria-hidden="true">
        <div className="fh-hpt-temp-fill" style={{ width: `${Math.min(100, (temp / max) * 100)}%` }} />
      </div>
      {/* PV: 10 fatias + barra-fantasma atrás */}
      <div className="hp-bar fh-hpt-bar" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={char.currentHp}
        aria-label={L(lang, 'Pontos de Vida', 'Hit Points')}>
        <div className="fh-hp-ghost" style={{ width: `${hpPct}%` }} />
        <div className="hp-bar-fill" style={{ width: `${hpPct}%` }} />
        <div className="fh-hpt-slices" aria-hidden="true">
          {Array.from({ length: SLICES }, (_, i) => <span key={i} className={i < on ? 'is-on' : ''} />)}
        </div>
      </div>
      {/* embaixo, na mesma largura: exaustão e testes contra a morte */}
      <div className="fh-hpt-tracks">
        <div className="fh-hpt-track is-exh">
          <span className="fh-hpt-cap">{L(lang, 'Exaustão', 'Exhaustion')}{hints.exhaustion}</span>
          <Pips n={EXHAUSTION_MAX} on={exh} kind="exh" label={L(lang, 'Exaustão', 'Exhaustion')}
            onPick={lv => update(setExhaustion(char, lv))} />
        </div>
        <div className={`fh-hpt-track is-death${char.currentHp === 0 ? ' is-down' : ''}`}>
          <span className="fh-hpt-cap">{L(lang, 'Morte', 'Death')}{hints.death}</span>
          <Pips n={3} on={ds.success} kind="ok" label={L(lang, 'Sucessos', 'Successes')}
            onPick={n => update({ deathSaves: { ...ds, success: n } })} />
          <Pips n={3} on={ds.fail} kind="ko" label={L(lang, 'Falhas', 'Failures')}
            onPick={n => update({ deathSaves: { ...ds, fail: n } })} />
          {char.currentHp === 0 && (
            <button type="button" className="btn btn-sm btn-ghost fh-hpt-deathroll" onClick={() => roll({ die: 20, label: L(lang, 'Teste contra a morte', 'Death save') })}>
              🎲
            </button>
          )}
        </div>
      </div>
      {/* arrastar: ← dano · cura → ; PV temporários de 0 ao máximo */}
      <div className="fh-hpt-drags">
        <div className="fh-hpt-drag-row">
          <span className="fh-hpt-cap">{L(lang, 'Dano/Cura', 'Dmg/Heal')}</span>
          <DragLens min={range.min} max={range.max} rest={0}
            label={L(lang, 'Arraste para a esquerda para dano, para a direita para cura', 'Drag left for damage, right for healing')}
            lens={deltaLabel} tone={v => (v < 0 ? 'hurt' : v > 0 ? 'heal' : '')} onCommit={applyHp} />
          <span className="fh-hpt-ends" aria-hidden="true"><b className="is-hurt">−</b><b className="is-heal">+</b></span>
        </div>
        <div className="fh-hpt-drag-row is-temp">
          <span className="fh-hpt-cap">{L(lang, 'PV temp.', 'Temp HP')}{hints.temp}</span>
          <DragLens min={0} max={max} rest={temp}
            label={L(lang, 'PV temporários', 'Temporary hit points')}
            lens={v => `${v}`} tone={v => (v < temp ? 'hurt' : v > temp ? 'heal' : '')}
            onCommit={v => update({ tempHp: v })} />
          <span className="fh-hpt-temp-num mono">{temp}</span>
        </div>
      </div>
      {/* Dados de Vida: deslize (ou toque) com o descanso ligado */}
      <div className="fh-hpt-hd" role="group" aria-label={L(lang, 'Dados de Vida', 'Hit Dice')}>
        <span className="fh-hpt-cap">{L(lang, 'Dados de Vida', 'Hit Dice')}{hints.hitDice}</span>
        <div className="fh-hpt-dice">
          {pools.map(p => Array.from({ length: p.total }, (_, i) => {
            const spent = i >= p.left;
            return (
              <button key={`${p.die}-${i}`} type="button" className={`fh-hd${spent ? ' is-spent' : ''}`}
                disabled={spent || !resting}
                title={resting ? L(lang, `Deslize para gastar 1d${p.die}`, `Swipe to spend 1d${p.die}`) : L(lang, 'Ligue um descanso para gastar', 'Turn on a rest to spend')}
                aria-label={`d${p.die} ${spent ? L(lang, 'gasto', 'spent') : L(lang, 'disponível', 'available')}`}
                onPointerDown={swipeStart} onPointerUp={swipeEnd(p.die)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spend(p.die); } }}>
                d{p.die}
              </button>
            );
          }))}
        </div>
        {last && (
          <span key={last.key} className="fh-hpt-gain" role="status">
            d{last.die}: {last.rolled}{conMod ? ` ${conMod > 0 ? '+' : '−'} ${Math.abs(conMod)}` : ''} → +{last.gain}
          </span>
        )}
        {resting && !last && <span className="fh-hpt-hint">{L(lang, 'Deslize um dado para gastar e recuperar PV.', 'Swipe a die to spend it and regain HP.')}</span>}
      </div>
    </div>
  );
}
