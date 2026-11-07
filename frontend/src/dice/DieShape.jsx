import React, { useState, useEffect, useRef } from 'react';
import { DICE_FACES } from './dice-tessellation.js';
import {
  ROLLUP_DURATION_MS,
  LAND_HOLD_MS,
  PUMP_DURATION_MS,
  computeRollupFrame,
  computeAnticipationProfile,
  resolvePumpDirection,
  computePumpFrame,
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

  // Anticipation-Driven 2-Phase Juicy Roll Choreography:
  // Phase 1 (0 -> 1.5s): Starts calm with ZERO initial wobble, then accelerates
  //   with increasing shaking frequency (4Hz -> 42Hz), increasing shaking strength,
  //   and increasing directional motion blur.
  // Phase 2 (1.5s+): Motion blur snaps to 0 and a visceral Final Punch
  //   unravels the rolled number (with elastic upward/downward pump for +bonus/-penalty).
  useEffect(() => {
    const el = dieRef.current;
    const applyAnticipationVars = (profile) => {
      if (!el) return;
      // Scale down shake amplitude slightly on 50% constituent petals so the hero die dominates
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

    if (!shouldAnimateRoll) {
      resetAnticipationVars();
      setDisplayVal(isHero && targetValue != null ? targetValue : value);
      setAnimPhase('idle');
      return undefined;
    }

    let animId = null;
    let pulseTimer = null;
    let settleTimer = null;
    let startTime = null;
    let lastStepIndex = -1;
    let currentPhase = 'rollup';
    const pumpDir = resolvePumpDirection(naturalVal, finalVal);
    const hasModifierPump = isHero && pumpDir !== 'snap-shake';

    resetAnticipationVars();
    setAnimPhase('rollup');
    setDisplayVal(computeRollupFrame(naturalVal, 0, die).value);

    const step = (now) => {
      if (startTime == null) startTime = now;
      const elapsed = now - startTime;

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

      // Climax at 1.5s: cut motion blur & shake to 0 and unleash the Final Punch!
      resetAnticipationVars();

      if (!hasModifierPump) {
        setDisplayVal(finalVal);
        setTickPulse(false);
        if (isHero) {
          setAnimPhase('snap-shake');
          settleTimer = setTimeout(() => setAnimPhase('settled'), 480);
        } else {
          setAnimPhase('settled');
        }
        return;
      }

      // Phase 2A (1500ms -> 1595ms): brief compression coil on naturalVal right before the punch
      const afterRollup = elapsed - ROLLUP_DURATION_MS;
      if (afterRollup < LAND_HOLD_MS) {
        if (currentPhase !== 'landed') {
          currentPhase = 'landed';
          setDisplayVal(naturalVal);
          setTickPulse(false);
          setAnimPhase('landed');
        }
        animId = requestAnimationFrame(step);
        return;
      }

      // Phase 2B (1595ms -> 2015ms): Final Punch & elastic pump up/down unravelling finalVal
      const pumpElapsed = afterRollup - LAND_HOLD_MS;
      if (pumpElapsed < PUMP_DURATION_MS) {
        if (currentPhase !== pumpDir) {
          currentPhase = pumpDir;
          setAnimPhase(pumpDir);
        }
        const pumpP = pumpElapsed / PUMP_DURATION_MS;
        setDisplayVal(computePumpFrame(naturalVal, finalVal, pumpP));
        animId = requestAnimationFrame(step);
        return;
      }

      // Final settled state
      setDisplayVal(finalVal);
      setAnimPhase('settled');
    };

    animId = requestAnimationFrame(step);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      clearTimeout(pulseTimer);
      clearTimeout(settleTimer);
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
  const isPunchPhase = isHero && (animPhase === 'pump-up' || animPhase === 'pump-down' || animPhase === 'snap-shake');

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

  return (
    <div
      ref={dieRef}
      className={`die-shape die-d${die} ${rolling ? 'rolling' : ''}${animPhase !== 'idle' ? ` is-phase-${animPhase}` : ''}${tone ? ` tone-${tone}` : ''}${dimmed ? ' is-unpicked' : ''}${isHero ? ' is-hero' : ''}${isPetal ? ' is-petal-die' : ''}${isInvertedPetal ? ' is-inverted-petal' : ''}${isCrit && !rolling ? ' is-crit-artdeco' : ''}`}
      style={style}
      aria-hidden="true"
    >
      {isPunchPhase && <span className="die-punch-shockwave" aria-hidden="true" />}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="die-main-svg"
        style={petalAngle != null ? { transform: `rotate(${petalAngle}deg)`, transformOrigin: 'center' } : undefined}
      >
        <path d={DICE_FACES[die] || DICE_FACES[20]} className="die-poly" />
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
