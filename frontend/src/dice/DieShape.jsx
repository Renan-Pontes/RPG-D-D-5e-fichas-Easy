import React, { useState, useEffect, useRef } from 'react';
import { DICE_FACES } from './dice-tessellation.js';
import {
  ROLLUP_DURATION_MS,
  LAND_HOLD_MS,
  PUMP_DURATION_MS,
  FALLOFF_DURATION_MS,
  computeRollupFrame,
  computeAnticipationProfile,
  resolvePumpDirection,
  computePumpFrame,
  computeFalloffProfile,
} from './dice-rollup.js';

const SPARKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export default function DieShape({
  die,
  value,
  targetValue = null,
  rolling = false,
  animated = true,
  size = 56,
  seed = 0,
  dimmed = false,
  tone = null,
  isHero = false,
  isCrit = false,
  lang = 'pt',
  petalAngle = null,
}) {
  const dieRef = useRef(null);
  const isNumericRoll = value !== '' && value != null && Number.isFinite(Number(value));
  const shouldAnimateRoll = animated && isNumericRoll && (isHero || dimmed || rolling);
  const naturalVal = isNumericRoll ? Math.round(Number(value)) : value;
  const finalVal = (isHero && targetValue != null && Number.isFinite(Number(targetValue)))
    ? Math.round(Number(targetValue))
    : naturalVal;

  const [displayVal, setDisplayVal] = useState(() => {
    if (shouldAnimateRoll) {
      return computeRollupFrame(naturalVal, 0, die).value;
    }
    return isHero && targetValue != null ? targetValue : value;
  });
  const [animPhase, setAnimPhase] = useState(() => (shouldAnimateRoll ? 'rollup' : 'idle'));
  const [tickPulse, setTickPulse] = useState(false);

  // 3-Phase Juicy Roll Choreography:
  // Phase 1 (0 -> 1.5s, Anticipation): Zero initial wobble, then increasing shake
  //   frequency (4Hz -> 42Hz), increasing shake strength, and directional motion blur.
  // Phase 2 (1.5s+, Final Punch): Motion blur cuts to 0 and a visceral punch
  //   unravels the final rolled number (with elastic upward/downward pump for +bonus/-penalty).
  // Phase 3 (Falloff — Follow-Through & Overlapping Action): As soon as the final
  //   number is unravelled, the glowing ring and glowing pulse outstretch and smoothly
  //   fade away while both the size of the roll and the glowing elements upscale
  //   slowly in ease-out like a ripple.
  useEffect(() => {
    const el = dieRef.current;
    const stageWrap = isHero && el ? el.closest('.dice-hero-stage-wrap, .dice-flower-stage') : null;

    const applyAnticipationVars = (profile) => {
      if (!el) return;
      const k = dimmed ? 0.45 : 1.0;
      el.style.setProperty('--shake-x', `${(profile.shakeX * k).toFixed(2)}px`);
      el.style.setProperty('--shake-y', `${(profile.shakeY * k).toFixed(2)}px`);
      el.style.setProperty('--shake-rot', `${(profile.shakeRot * k).toFixed(2)}deg`);
      el.style.setProperty('--charge-scale', `${1 + (profile.chargeScale - 1) * k}`);
      el.style.setProperty('--die-blur', `${(profile.motionBlurPx * k).toFixed(2)}px`);
      el.style.setProperty('--ghost-x', `${(-profile.shakeX * 0.9 * k).toFixed(2)}px`);
      el.style.setProperty('--ghost-y', `${(-profile.shakeY * 0.9 * k).toFixed(2)}px`);
      el.style.setProperty('--num-blur', `${profile.numberBlurPx.toFixed(2)}px`);
      el.style.setProperty('--num-trail', `${profile.numberTrailPx.toFixed(2)}px`);
      el.style.setProperty('--num-stretch', `${profile.numberStretch}`);
    };

    const resetAnticipationVars = () => {
      if (!el) return;
      el.style.setProperty('--shake-x', '0px');
      el.style.setProperty('--shake-y', '0px');
      el.style.setProperty('--shake-rot', '0deg');
      el.style.setProperty('--charge-scale', '1');
      el.style.setProperty('--die-blur', '0px');
      el.style.setProperty('--ghost-x', '0px');
      el.style.setProperty('--ghost-y', '0px');
      el.style.setProperty('--num-blur', '0px');
      el.style.setProperty('--num-trail', '0px');
      el.style.setProperty('--num-stretch', '1');
    };

    const applyFalloffVars = (falloffProfile) => {
      if (!el) return;
      el.style.setProperty('--falloff-roll-scale', `${falloffProfile.rollScale}`);
      el.style.setProperty('--falloff-num-scale', `${falloffProfile.numberScale}`);
      el.style.setProperty('--falloff-ring-scale', `${falloffProfile.ringScale}`);
      el.style.setProperty('--falloff-ring-opacity', `${falloffProfile.ringOpacity}`);
      el.style.setProperty('--falloff-sec-ring-scale', `${falloffProfile.secondaryRingScale}`);
      el.style.setProperty('--falloff-sec-ring-opacity', `${falloffProfile.secondaryRingOpacity}`);
      el.style.setProperty('--falloff-pulse-scale', `${falloffProfile.pulseScale}`);
      el.style.setProperty('--falloff-pulse-opacity', `${falloffProfile.pulseOpacity}`);
      if (stageWrap) {
        stageWrap.style.setProperty('--falloff-roll-scale', `${falloffProfile.rollScale}`);
      }
    };

    const resetFalloffVars = () => {
      if (!el) return;
      el.style.setProperty('--falloff-roll-scale', '1');
      el.style.setProperty('--falloff-num-scale', '1');
      el.style.setProperty('--falloff-ring-scale', '0.92');
      el.style.setProperty('--falloff-ring-opacity', '0');
      el.style.setProperty('--falloff-sec-ring-scale', '0.86');
      el.style.setProperty('--falloff-sec-ring-opacity', '0');
      el.style.setProperty('--falloff-pulse-scale', '0.82');
      el.style.setProperty('--falloff-pulse-opacity', '0');
      if (stageWrap) {
        stageWrap.style.setProperty('--falloff-roll-scale', '1');
      }
    };

    if (!shouldAnimateRoll) {
      resetAnticipationVars();
      resetFalloffVars();
      setDisplayVal(isHero && targetValue != null ? targetValue : value);
      setAnimPhase('idle');
      return undefined;
    }

    let animId = null;
    let pulseTimer = null;
    let startTime = null;
    let lastStepIndex = -1;
    let currentPhase = 'rollup';
    const pumpDir = resolvePumpDirection(naturalVal, finalVal);
    const hasModifierPump = isHero && pumpDir !== 'snap-shake';

    resetAnticipationVars();
    resetFalloffVars();
    setAnimPhase('rollup');
    setDisplayVal(computeRollupFrame(naturalVal, 0, die).value);

    const step = (now) => {
      if (startTime == null) startTime = now;
      const elapsed = now - startTime;

      // Phase 1 (0 -> 1500ms): Anticipation Roll-Up (increasing shake freq/strength + motion blur)
      if (elapsed < ROLLUP_DURATION_MS) {
        const p = elapsed / ROLLUP_DURATION_MS;
        const profile = computeAnticipationProfile(p);
        applyAnticipationVars(profile);

        const frame = computeRollupFrame(naturalVal, p, die);
        if (frame.stepIndex !== lastStepIndex) {
          lastStepIndex = frame.stepIndex;
          setDisplayVal(frame.value);
          setTickPulse(true);
          clearTimeout(pulseTimer);
          pulseTimer = setTimeout(() => setTickPulse(false), 38);
        }
        animId = requestAnimationFrame(step);
        return;
      }

      // Climax at 1.5s: cut motion blur & shake to 0
      resetAnticipationVars();

      // Non-hero constituent/satellite dice settle cleanly at 1.5s
      if (!isHero) {
        setDisplayVal(finalVal);
        setTickPulse(false);
        setAnimPhase('settled');
        return;
      }

      // Optional brief compression coil on naturalVal when a +bonus/-penalty modifier is present
      const afterRollup = elapsed - ROLLUP_DURATION_MS;
      const holdMs = hasModifierPump ? LAND_HOLD_MS : 0;

      if (afterRollup < holdMs) {
        if (currentPhase !== 'landed') {
          currentPhase = 'landed';
          setDisplayVal(naturalVal);
          setTickPulse(false);
          setAnimPhase('landed');
        }
        animId = requestAnimationFrame(step);
        return;
      }

      // Phase 2 (Final Punch) + Overlapping Phase 3 (Falloff Ripple):
      // As soon as the final number is unravelled, the glowing ring & glowing pulse
      // outstretch and smoothly fade away while the roll & glowing elements upscale in ease-out!
      const afterHold = afterRollup - holdMs;
      const punchPhaseName = hasModifierPump ? pumpDir : 'snap-shake';

      // During the initial punch window (0 .. PUMP_DURATION_MS), snap displayVal to finalVal
      if (afterHold < PUMP_DURATION_MS) {
        if (currentPhase !== punchPhaseName) {
          currentPhase = punchPhaseName;
          setTickPulse(false);
          setAnimPhase(punchPhaseName);
        }
        const pumpP = afterHold / PUMP_DURATION_MS;
        const nextVal = hasModifierPump
          ? computePumpFrame(naturalVal, finalVal, pumpP)
          : finalVal;
        setDisplayVal(nextVal);

        // Start overlapping the glowing ring & pulse expansion as soon as finalVal is reached
        const unravelOriginMs = hasModifierPump ? PUMP_DURATION_MS * 0.35 : 0;
        if (afterHold >= unravelOriginMs) {
          const falloffElapsed = afterHold - unravelOriginMs;
          const falloffP = Math.min(1, falloffElapsed / FALLOFF_DURATION_MS);
          applyFalloffVars(computeFalloffProfile(falloffP));
        }
        animId = requestAnimationFrame(step);
        return;
      }

      // Pure Phase 3 Falloff (Follow-Through & Overlapping Action ease-out ripple)
      const unravelOriginMs = hasModifierPump ? PUMP_DURATION_MS * 0.35 : 0;
      const falloffElapsed = afterHold - unravelOriginMs;

      if (falloffElapsed < FALLOFF_DURATION_MS) {
        if (currentPhase !== 'falloff') {
          currentPhase = 'falloff';
          setDisplayVal(finalVal);
          setAnimPhase('falloff');
        }
        const falloffP = falloffElapsed / FALLOFF_DURATION_MS;
        applyFalloffVars(computeFalloffProfile(falloffP));
        animId = requestAnimationFrame(step);
        return;
      }

      // Final settled state at full ease-out ripple completion
      setDisplayVal(finalVal);
      applyFalloffVars(computeFalloffProfile(1));
      setAnimPhase('settled');
    };

    animId = requestAnimationFrame(step);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      clearTimeout(pulseTimer);
    };
  }, [shouldAnimateRoll, naturalVal, finalVal, isHero, dimmed, die, value, targetValue]);

  const rand = (n) => {
    const x = Math.sin(seed * 9999 + n) * 10000;
    return x - Math.floor(x);
  };

  const isPt = lang === 'pt' || !lang;
  const isPetal = petalAngle != null;
  const isInvertedPetal = petalAngle === 180;
  const isStageComposed = isHero || isPetal || dimmed;
  const showFalloffLayers = isHero && (
    animPhase === 'pump-up' ||
    animPhase === 'pump-down' ||
    animPhase === 'snap-shake' ||
    animPhase === 'falloff' ||
    animPhase === 'settled'
  );

  const style = (rolling && !isStageComposed) ? {
    width: size,
    height: size,
    '--sx': `${(rand(1) - 0.5) * 120}vw`,
    '--sy': `${(rand(2) - 0.5) * 80}vh`,
    '--mx1': `${(rand(3) - 0.5) * 60}vw`,
    '--my1': `${-30 - rand(4) * 30}vh`,
    '--mx2': `${(rand(5) - 0.5) * 40}vw`,
    '--my2': `${-15 - rand(6) * 25}vh`,
    '--mx3': `${(rand(7) - 0.5) * 20}vw`,
    '--my3': `${-5 - rand(8) * 15}vh`,
    '--rot': `${1440 + Math.floor(rand(9) * 720)}deg`,
    '--dur': `${1.2 + rand(10) * 0.4}s`,
  } : { width: size, height: size, opacity: dimmed ? (petalAngle != null ? 0.38 : 0.32) : 1 };

  const polyPath = DICE_FACES[die] || DICE_FACES[20];

  return (
    <div
      ref={dieRef}
      className={`die-shape die-d${die} ${rolling ? 'rolling' : ''}${animPhase !== 'idle' ? ` is-phase-${animPhase}` : ''}${tone ? ` tone-${tone}` : ''}${dimmed ? ' is-unpicked' : ''}${isHero ? ' is-hero' : ''}${isPetal ? ' is-petal-die' : ''}${isInvertedPetal ? ' is-inverted-petal' : ''}${isCrit && !rolling ? ' is-crit-artdeco' : ''}`}
      style={style}
      aria-hidden="true"
    >
      {/* Follow-Through & Overlapping Action Falloff Layers:
          Glowing Pulse Halo + Primary Outstretching Glowing Ring + Secondary Ripple Ring */}
      {showFalloffLayers && (
        <>
          <span className="die-falloff-pulse" aria-hidden="true" />
          <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            className="die-falloff-ring is-primary-ripple"
            aria-hidden="true"
          >
            <circle cx="50" cy="50" r="46" className="die-falloff-ring-circle" />
            <path d={polyPath} className="die-falloff-ring-poly" />
          </svg>
          <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            className="die-falloff-ring is-secondary-ripple"
            aria-hidden="true"
          >
            <circle cx="50" cy="50" r="46" className="die-falloff-ring-circle" />
            <path d={polyPath} className="die-falloff-ring-poly" />
          </svg>
        </>
      )}

      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="die-main-svg"
        style={petalAngle != null ? { transform: `rotate(${petalAngle}deg)`, transformOrigin: 'center' } : undefined}
      >
        <path d={polyPath} className="die-poly" />
      </svg>
      <span className="die-number" style={{ fontSize: size * 0.38 }}>
        <span className={`die-number-val${tickPulse ? ' is-tick-pulse' : ''}`}>
          {displayVal ?? '?'}
        </span>
      </span>

      {/* Art Deco Critical Hit Overlay Layer */}
      {isCrit && !rolling && isHero && (
        <div className="dice-artdeco-crit-frame">
          <svg viewBox="0 0 140 140" className="dice-artdeco-svg">
            <defs>
              <linearGradient id="artdeco-gilt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff8cf" />
                <stop offset="26%" stopColor="#efc762" />
                <stop offset="52%" stopColor="#a37324" />
                <stop offset="78%" stopColor="#fedc8c" />
                <stop offset="100%" stopColor="#81510e" />
              </linearGradient>
            </defs>
            {/* Outer Art Deco Hexagonal Silhouette with Chamfered Corners */}
            <polygon
              points="70,4 128,37 128,103 70,136 12,103 12,37"
              fill="none"
              stroke="url(#artdeco-gilt-grad)"
              strokeWidth="2.5"
            />
            {/* Stepped Inner Art Deco Rim */}
            <polygon
              points="70,10 122,40 122,100 70,130 18,100 18,40"
              fill="none"
              stroke="url(#artdeco-gilt-grad)"
              strokeWidth="1.2"
              strokeDasharray="4 2"
              opacity="0.9"
            />
            {/* Stepped Corner Chevron Accents */}
            <polyline points="64,2 70,7 76,2" fill="none" stroke="url(#artdeco-gilt-grad)" strokeWidth="2.2" />
            <polyline points="64,138 70,133 76,138" fill="none" stroke="url(#artdeco-gilt-grad)" strokeWidth="2.2" />
            <polyline points="7,40 12,37 17,40" fill="none" stroke="url(#artdeco-gilt-grad)" strokeWidth="2.2" />
            <polyline points="123,40 128,37 133,40" fill="none" stroke="url(#artdeco-gilt-grad)" strokeWidth="2.2" />
            {/* Art Deco Cartouche Plaque for "CRÍTICO" */}
            <rect
              x="26"
              y="102"
              width="88"
              height="20"
              rx="3"
              fill="#180f08"
              stroke="url(#artdeco-gilt-grad)"
              strokeWidth="1.4"
            />
            <text
              x="70"
              y="113"
              textAnchor="middle"
              dominantBaseline="central"
              className="artdeco-crit-text"
            >
              {isPt ? 'CRÍTICO' : 'CRITICAL'}
            </text>
          </svg>
          <span className="dice-sparks" aria-hidden="true">
            {SPARKS.map((i) => (
              <i key={i} style={{ '--i': i }} />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
