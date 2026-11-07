// Palco de dados: 3D (three.js, carregado sob demanda) com fallback 2D.
//
// Recebe resultados PRONTOS — nunca sorteia. O 3D gira e para exatamente na
// face do valor dado; o 2D usa a animação SVG antiga; 'static' só mostra.
import React, { useEffect, useRef, useState } from 'react';
import DieShape from './DieShape.jsx';
import { physicalDice, resolveAnimMode } from './dice-math.js';
import { stageTone } from './dice-tones.js';
import { getAnimPref, prefersReducedMotion } from './dice-prefs.js';

let webglCache = null;
function hasWebGL() {
  if (webglCache != null) return webglCache;
  try {
    const c = document.createElement('canvas');
    webglCache = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { webglCache = false; }
  return webglCache;
}

// Pré-carrega o chunk 3D (ex.: ao abrir o rolador) sem bloquear nada.
let scenePromise = null;
export function preloadDice3D() {
  if (!scenePromise) scenePromise = import('./dice-scene.js');
  return scenePromise;
}

export function effectiveAnimMode(pref = getAnimPref()) {
  return resolveAnimMode(pref, { reducedMotion: prefersReducedMotion(), webgl: hasWebGL() });
}

const MAX_3D_DICE = 12;

/**
 * groups: [{ die: 20, rolls: [{ value, kept }] | number[] }]
 * tone: 'crit' | 'fumble' | 'adv' | 'dis' | null
 * total: final calculated result
 * isCrit: boolean
 * onSettled(): chamado quando os dados param (ou imediatamente no modo estático)
 */
export default function DiceStage({
  groups,
  tone = null,
  adv = 'normal',
  total = null,
  isCrit = false,
  lang = 'pt',
  onSettled,
  mode: forced,
  size2d = 88,
  className = '',
}) {
  const canvasRef = useRef(null);
  const settledRef = useRef(false);
  const physical = (groups || []).flatMap(g => physicalDice(g.die, g.rolls));
  const [mode, setMode] = useState(() => {
    const m = forced || effectiveAnimMode();
    return m === '3d' && physical.length > MAX_3D_DICE ? '2d' : m;
  });
  const [rolling2d, setRolling2d] = useState(mode === '2d');
  const [settled, setSettled] = useState(false);
  const shownTone = stageTone(tone, settled);

  const settle = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    setSettled(true);
    onSettled?.();
  };

  useEffect(() => {
    if (mode === 'static' || mode === 'off') { settle(); return undefined; }
    if (mode === '2d') {
      setRolling2d(true);
      const id = setTimeout(() => { setRolling2d(false); settle(); }, 1500);
      return () => clearTimeout(id);
    }
    // 3D
    let stage = null;
    let cancelled = false;
    preloadDice3D()
      .then((mod) => {
        if (cancelled || !canvasRef.current) return null;
        stage = mod.createDiceStage(canvasRef.current);
        return stage.play(physical, { tone });
      })
      .then(() => { if (!cancelled) settle(); })
      .catch((err) => {
        console.warn('[dice3d] fallback 2D:', err?.message || err);
        if (!cancelled) { setRolling2d(true); setMode('2d'); }
      });
    return () => { cancelled = true; stage?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (mode === '3d') {
    return (
      <div className={`dice-stage dice-stage-3d ${className}`} data-dice-mode="3d" data-dice-tone={shownTone || undefined}>
        <canvas ref={canvasRef} className="dice-stage-canvas" aria-hidden="true" />
      </div>
    );
  }

  const isStance = adv === 'adv' || adv === 'dis';

  // In stance mode (Advantage or Disadvantage), highlight the hero die at center
  // and nest the unpicked die at the lower-right edge of the hexagonal shape!
  if (isStance && groups && groups.length > 0) {
    const g = groups[0];
    const rolls = g.rolls || [];
    const heroRoll = rolls.find(r => (typeof r === 'object' && r ? r.kept !== false : true)) || rolls[0];
    const unpickedRoll = rolls.find(r => typeof r === 'object' && r && r.kept === false);
    const heroVal = typeof heroRoll === 'object' && heroRoll ? heroRoll.value : heroRoll;
    const unpickedVal = unpickedRoll ? (typeof unpickedRoll === 'object' ? unpickedRoll.value : unpickedRoll) : null;
    const effectiveTone = !rolling2d ? (shownTone || (adv === 'adv' ? 'adv' : 'dis')) : null;

    return (
      <div className={`dice-stage dice-stage-2d ${className}`} data-dice-mode={mode} data-dice-tone={shownTone || undefined}>
        <div className="dice-hero-stage-wrap">
          <DieShape
            die={g.die}
            value={rolling2d ? '' : heroVal}
            targetValue={total != null ? total : heroVal}
            rolling={rolling2d}
            size={120}
            isHero={true}
            isCrit={isCrit}
            tone={effectiveTone}
            lang={lang}
          />
          {unpickedRoll && (
            <div className="dice-satellite-unpicked">
              <DieShape
                die={g.die}
                value={rolling2d ? '' : unpickedVal}
                rolling={rolling2d}
                size={48}
                dimmed={true}
                lang={lang}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Single die roll (e.g. 1d20, 1d12, 1d100) — display as hero die at center
  const isSingleDie = groups && groups.length === 1 && (groups[0].rolls || []).length === 1;
  if (isSingleDie) {
    const g = groups[0];
    const r = g.rolls[0];
    const v = typeof r === 'object' && r ? r.value : r;
    const effectiveTone = !rolling2d ? shownTone : null;

    return (
      <div className={`dice-stage dice-stage-2d ${className}`} data-dice-mode={mode} data-dice-tone={shownTone || undefined}>
        <div className="dice-hero-stage-wrap">
          <DieShape
            die={g.die}
            value={rolling2d ? '' : v}
            targetValue={total != null ? total : v}
            rolling={rolling2d}
            size={120}
            isHero={true}
            isCrit={isCrit}
            tone={effectiveTone}
            lang={lang}
          />
        </div>
      </div>
    );
  }

  let seed = 0;
  return (
    <div className={`dice-stage dice-stage-2d ${className}`} data-dice-mode={mode} data-dice-tone={shownTone || undefined}>
      {(groups || []).flatMap((g, gi) => (g.rolls || []).map((r, i) => {
        const v = typeof r === 'object' && r ? r.value : r;
        const kept = !(typeof r === 'object' && r && r.kept === false);
        seed += 1;
        const effectiveTone = kept && !rolling2d ? shownTone : null;
        return (
          <DieShape
            key={`${gi}-${i}`}
            die={g.die}
            value={rolling2d ? '' : v}
            rolling={rolling2d}
            size={size2d}
            seed={seed}
            dimmed={!kept}
            tone={effectiveTone}
            lang={lang}
          />
        );
      }))}
    </div>
  );
}
