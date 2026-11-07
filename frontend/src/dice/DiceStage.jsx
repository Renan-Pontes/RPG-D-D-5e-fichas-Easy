// Palco de dados: 3D (three.js, carregado sob demanda) com fallback 2D.
//
// Recebe resultados PRONTOS — nunca sorteia. O 3D gira e para exatamente na
// face do valor dado; o 2D usa a animação SVG antiga; 'static' só mostra.
import React, { useEffect, useRef, useState } from 'react';
import DieShape from './DieShape.jsx';
import { physicalDice, resolveAnimMode } from './dice-math.js';
import { stageTone } from './dice-tones.js';
import { getAnimPref, prefersReducedMotion } from './dice-prefs.js';
import { getTessellationLayout } from './dice-tessellation.js';
import { ROLLUP_DURATION_MS } from './dice-rollup.js';

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
      const id = setTimeout(() => { setRolling2d(false); settle(); }, ROLLUP_DURATION_MS);
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
  const isAnimatedStage = mode !== 'static' && mode !== 'off';

  // In stance mode (Advantage or Disadvantage), highlight the hero die at center
  // and nest the unpicked die at the lower-right edge of the hexagonal shape at 50% scale!
  if (isStance && groups && groups.length > 0) {
    const g = groups[0];
    const rolls = g.rolls || [];
    const heroRoll = rolls.find(r => (typeof r === 'object' && r ? r.kept !== false : true)) || rolls[0];
    const unpickedRoll = rolls.find(r => typeof r === 'object' && r && r.kept === false);
    const heroVal = typeof heroRoll === 'object' && heroRoll ? heroRoll.value : heroRoll;
    const unpickedVal = unpickedRoll ? (typeof unpickedRoll === 'object' ? unpickedRoll.value : unpickedRoll) : null;
    const effectiveTone = adv === 'adv' ? 'adv' : 'dis';

    return (
      <div className={`dice-stage dice-stage-2d ${className}`} data-dice-mode={mode} data-dice-tone={shownTone || effectiveTone}>
        <div className="dice-hero-stage-wrap">
          <DieShape
            die={g.die}
            value={heroVal}
            targetValue={total != null ? total : heroVal}
            rolling={rolling2d}
            animated={isAnimatedStage}
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
                value={unpickedVal}
                rolling={rolling2d}
                animated={isAnimatedStage}
                size={60}
                dimmed={true}
                tone={effectiveTone}
                lang={lang}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Extract all individual dice rolls across groups
  const allRolls = (groups || []).flatMap((g, gi) => (g.rolls || []).map((r, i) => {
    const v = typeof r === 'object' && r ? r.value : r;
    const kept = !(typeof r === 'object' && r && r.kept === false);
    return {
      die: g.die,
      value: v,
      kept,
      key: `${gi}-${i}`,
      sign: g.sign || 1,
    };
  }));

  const totalDiceCount = allRolls.length;

  // Single die roll (e.g. 1d20, 1d12, 1d100) — display as hero die at center
  if (totalDiceCount === 1) {
    const r = allRolls[0];
    const v = r.value;
    const effectiveTone = !rolling2d ? shownTone : null;

    return (
      <div className={`dice-stage dice-stage-2d ${className}`} data-dice-mode={mode} data-dice-tone={shownTone || undefined}>
        <div className="dice-hero-stage-wrap">
          <DieShape
            die={r.die}
            value={v}
            targetValue={total != null ? total : v}
            rolling={rolling2d}
            animated={isAnimatedStage}
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

  // When multiple dice are accumulated and rolled simultaneously (e.g. 5d6, 7d12, 4d8),
  // organize them into authentic geometric tessellations matching each dice type
  // (D4, D6, D8, D10, D12, D20, D100), where constituent dice are reduced to strictly 50% scale
  // and stacked side-to-side along the facets and corners with uniform breathing gutters!
  if (totalDiceCount > 1 && !className?.includes('cr-rr-stage')) {
    const primaryDie = groups[0]?.die || 6;
    const effectiveTone = adv === 'adv' ? 'adv' : adv === 'dis' ? 'dis' : (!rolling2d ? shownTone : null);
    const naturalSum = allRolls.reduce((sum, r) => sum + (r.kept ? Number(r.value) || 0 : 0), 0);
    const finalTotal = total != null ? total : naturalSum;

    const tessellation = getTessellationLayout(primaryDie, totalDiceCount, {
      heroSize: 104,
      gutter: 6,
    });

    return (
      <div className={`dice-stage dice-stage-2d ${className}`} data-dice-mode={mode} data-dice-tone={shownTone || undefined}>
        <div
          className="dice-flower-stage"
          style={{ width: tessellation.stageWidth, height: tessellation.stageHeight }}
        >
          {/* Central Hero Die: rolls up to naturalSum at 1.5s, then pumps elastically to finalTotal */}
          <div className="dice-flower-center">
            <DieShape
              die={primaryDie}
              value={naturalSum}
              targetValue={finalTotal}
              rolling={rolling2d}
              animated={isAnimatedStage}
              size={tessellation.heroSize}
              isHero={true}
              isCrit={isCrit}
              tone={effectiveTone}
              lang={lang}
            />
          </div>

          {/* Constituent Dice at strictly 50% scale, stacked side-to-side geometrically */}
          <div className="dice-flower-petals">
            {allRolls.map((r, i) => {
              const slot = tessellation.slots[i] || { x: 0, y: 0, rot: 0 };
              return (
                <div
                  key={r.key}
                  className="dice-flower-petal"
                  style={{
                    transform: `translate(calc(-50% + ${slot.x}px), calc(-50% + ${slot.y}px))`,
                  }}
                >
                  <DieShape
                    die={r.die}
                    value={r.value}
                    rolling={rolling2d}
                    animated={isAnimatedStage}
                    size={tessellation.petalSize}
                    dimmed={true}
                    tone={effectiveTone}
                    petalAngle={slot.rot || null}
                    lang={lang}
                  />
                </div>
              );
            })}
          </div>
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
            value={v}
            rolling={rolling2d}
            animated={isAnimatedStage}
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
