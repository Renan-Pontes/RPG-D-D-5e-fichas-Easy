/**
 * dice-rollup.js
 *
 * Pure mathematical choreography for the 3-phase juicy dice roll:
 * - Phase 1 (0ms -> 750ms, Anticipation Roll-Up): Starts calm with ZERO initial
 *   wobble, then builds anticipation via an accelerating numeric roll-up with
 *   strictly increasing shaking frequency (6Hz -> 56Hz), increasing shaking
 *   strength (amplitude), and increasing directional motion blur.
 * - Multi-Dice Random Catch-Up: When multiple dice are stacked (e.g. 10d10, 10d8),
 *   neighboring constituent dice roll up faster in a randomized spatial order,
 *   unravelling their individual rolled numbers along the central roll-up as the
 *   central sum catches up and finishes in exact sync at 750ms.
 * - Unified Climax at 750ms + Single Powerful Glowing Ripple (1050ms):
 *   At the exact peak of the roll-off (750ms), motion blur cuts to 0, the final
 *   rolled number unravels immediately, the Final Punch impacts (220ms), and a
 *   SINGLE powerful glowing ripple (plus radial pulse & ease-out roll upscale)
 *   outstretches and smoothly fades away.
 */

export const FADEIN_DURATION_MS = 500;
export const ROLLUP_DURATION_MS = 750;
export const LAND_HOLD_MS = 0;
export const PUMP_DURATION_MS = 220;
export const FALLOFF_DURATION_MS = 1050;

export const MIN_SHAKE_FREQ_HZ = 6;
export const MAX_SHAKE_FREQ_HZ = 56;
export const MAX_SHAKE_PX = 9.0;
export const MAX_SHAKE_ROT_DEG = 6.5;
export const MAX_DIE_BLUR_PX = 3.0;
export const MAX_NUMBER_BLUR_PX = 3.6;

export const FALLOFF_MAX_ROLL_SCALE = 1.12;
export const FALLOFF_MAX_RING_SCALE = 2.75;
export const FALLOFF_MAX_PULSE_SCALE = 2.50;

export const NEIGHBOR_MIN_FINISH_P = 0.35;
export const NEIGHBOR_MAX_FINISH_P = 1.0;

/**
 * Accelerating anticipation curve for the roll-up:
 * Starts with a steady initial slope (0.25) so numbers begin ticking immediately
 * without wobbling the die, then accelerates steeply (0.75 * p^2.6) as shaking
 * frequency, strength, and motion blur build toward the 750ms climax.
 * @param {number} p - Normalized progress in [0, 1]
 * @returns {number} Eased progress in [0, 1]
 */
export function easeInAnticipation(p) {
  const clamped = Math.max(0, Math.min(1, Number(p) || 0));
  return 0.25 * clamped + 0.75 * Math.pow(clamped, 2.6);
}

/**
 * Smooth ease-out ripple curve for the post-reveal follow-through and falloff:
 * Launches at maximum outward velocity at the exact moment of the punch/reveal (p = 0)
 * and decelerates smoothly like a ripple across water.
 * @param {number} p - Normalized progress in [0, 1]
 * @returns {number} Eased progress in [0, 1]
 */
export function easeOutRipple(p) {
  const clamped = Math.max(0, Math.min(1, Number(p) || 0));
  return 1 - Math.pow(1 - clamped, 3.4);
}

/**
 * Legacy alias kept for compatibility.
 */
export const easeOutQuart = (p) => {
  const clamped = Math.max(0, Math.min(1, Number(p) || 0));
  return 1 - Math.pow(1 - clamped, 4);
};

/**
 * Computes the smooth 0.5-second (500ms) fade-in profile for the entire roll-up
 * interface so it never abruptly pops onto the screen.
 *
 * @param {number} elapsedMs - Elapsed time in milliseconds since roll start (0 -> 500ms)
 * @returns {{ progress: number, opacity: number, entranceScale: number }}
 */
export function computeFadeInProfile(elapsedMs) {
  const ms = Math.max(0, Number(elapsedMs) || 0);
  const progress = Math.max(0, Math.min(1, ms / FADEIN_DURATION_MS));
  const eased = 1 - Math.pow(1 - progress, 2.2);
  const opacity = +eased.toFixed(4);
  const entranceScale = +(0.94 + 0.06 * (1 - Math.pow(1 - progress, 2.4))).toFixed(4);
  return {
    progress: +progress.toFixed(4),
    opacity,
    entranceScale,
  };
}

/**
 * Deterministic pseudo-random number in [0, 1) from an integer seed.
 */
function seededUnit(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Computes the randomized faster roll-up schedule for a neighboring/nested die
 * in a multi-dice roll (e.g. 10d10, 10d8, 5d6):
 * - Shuffles the completion order across the N neighboring dice so they unravel
 *   at random positions around the central hero die rather than sequentially.
 * - Every neighboring die rolls up faster (`speedMultiplier >= 1.0`) across
 *   `finishP in [0.35, 1.00]`, with the final neighboring die finishing at
 *   `finishP = 1.00` in exact sync with the central sum roll-up!
 *
 * @param {number} petalIndex - Index of the neighboring die in [0, petalCount - 1]
 * @param {number} petalCount - Total number of neighboring dice
 * @param {number} [rollSeed=0] - Optional seed to vary random order per roll
 * @returns {{
 *   rank: number,
 *   finishP: number,
 *   speedMultiplier: number,
 *   stepOffset: number
 * }}
 */
export function computeNeighborRollupSchedule(petalIndex = 0, petalCount = 1, rollSeed = 0) {
  const count = Math.max(1, Math.floor(Number(petalCount) || 1));
  const idx = Math.max(0, Math.min(count - 1, Math.floor(Number(petalIndex) || 0)));
  const seedBase = Math.round(Number(rollSeed) || 0) * 131 + count * 37;

  if (count === 1) {
    const finishP = 0.76;
    return {
      rank: 0,
      finishP,
      speedMultiplier: +(1 / finishP).toFixed(3),
      stepOffset: 5,
    };
  }

  // Deterministic Fisher-Yates shuffle of [0 .. count - 1]
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i -= 1) {
    const r = seededUnit(seedBase + i * 97 + 13);
    const j = Math.floor(r * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }

  const rank = order.indexOf(idx);
  const span = NEIGHBOR_MAX_FINISH_P - NEIGHBOR_MIN_FINISH_P;

  // Last rank finishes at exactly 1.00 to lock in sync with the central hero die;
  // earlier ranks are distributed across [0.35, 0.96] with subtle organic jitter.
  let finishP;
  if (rank === count - 1) {
    finishP = 1.0;
  } else {
    const baseT = rank / (count - 1);
    const jitter = (seededUnit(seedBase + idx * 53 + 7) - 0.5) * (0.45 / count);
    const clampedT = Math.max(0, Math.min(0.95, baseT + jitter));
    finishP = +(NEIGHBOR_MIN_FINISH_P + span * clampedT).toFixed(4);
  }

  const speedMultiplier = +(1 / finishP).toFixed(3);
  const stepOffset = ((rank * 7 + idx * 5 + Math.abs(seedBase)) % 19) + 1;

  return {
    rank,
    finishP,
    speedMultiplier,
    stepOffset,
  };
}

/**
 * Computes the instantaneous shaking frequency, shaking strength, 2D tremor offsets,
 * tension scale, and directional motion blur at normalized progress p in [0, 1].
 *
 * Guarantees:
 * - At p = 0: strength = 0, shakeX = 0, shakeY = 0, shakeRot = 0, motionBlurPx = 0
 *   (the animation NEVER starts by wobbling the die).
 * - For 0 < p < 1: frequencyHz, strength, motionBlurPx, and numberBlurPx all
 *   strictly increase to their peak right as p -> 1.0 (750ms).
 * - At p >= 1: all shake and motion blur snap back to 0 at the exact moment of the punch.
 *
 * @param {number} p - Normalized progress in [0, 1]
 */
export function computeAnticipationProfile(p) {
  const clamped = Math.max(0, Math.min(1, Number(p) || 0));

  if (clamped <= 0 || clamped >= 1) {
    return {
      frequencyHz: clamped >= 1 ? MAX_SHAKE_FREQ_HZ : MIN_SHAKE_FREQ_HZ,
      strength: 0,
      shakeX: 0,
      shakeY: 0,
      shakeRot: 0,
      motionBlurPx: 0,
      numberBlurPx: 0,
      numberTrailPx: 0,
      numberStretch: 1,
      chargeScale: 1,
    };
  }

  // Smoothly increasing shaking strength envelope (0 at start -> 1 at climax)
  const strength = Math.pow(clamped, 2.2);

  // Instantaneous shaking frequency (Hz): ramps from 6 Hz to 56 Hz
  const frequencyHz = MIN_SHAKE_FREQ_HZ + (MAX_SHAKE_FREQ_HZ - MIN_SHAKE_FREQ_HZ) * Math.pow(clamped, 2);

  // Exact integrated phase of the chirp signal over T = 0.75s
  const durationSec = ROLLUP_DURATION_MS / 1000;
  const phase = 2 * Math.PI * durationSec * (
    MIN_SHAKE_FREQ_HZ * clamped + ((MAX_SHAKE_FREQ_HZ - MIN_SHAKE_FREQ_HZ) / 3) * Math.pow(clamped, 3)
  );

  const shakeX = +(Math.sin(phase) * MAX_SHAKE_PX * strength).toFixed(2);
  const shakeY = +(Math.cos(phase * 1.37) * MAX_SHAKE_PX * 0.78 * strength).toFixed(2);
  const shakeRot = +(Math.sin(phase * 0.83) * MAX_SHAKE_ROT_DEG * strength).toFixed(2);

  // Motion blur builds with shaking velocity and strength right up to the punch
  const motionBlurPx = +(MAX_DIE_BLUR_PX * Math.pow(clamped, 2.4)).toFixed(2);
  const numberBlurPx = +(MAX_NUMBER_BLUR_PX * Math.pow(clamped, 2.1)).toFixed(2);
  const numberTrailPx = +(10.0 * Math.pow(clamped, 2.0)).toFixed(2);
  const numberStretch = +(1 + 0.24 * Math.pow(clamped, 2.0)).toFixed(3);
  const chargeScale = +(1 + 0.08 * Math.pow(clamped, 2.0)).toFixed(3);

  return {
    frequencyHz: +frequencyHz.toFixed(2),
    strength: +strength.toFixed(4),
    shakeX,
    shakeY,
    shakeRot,
    motionBlurPx,
    numberBlurPx,
    numberTrailPx,
    numberStretch,
    chargeScale,
  };
}

/**
 * Computes the displayed integer value at normalized progress p in [0, 1]
 * during the 750ms anticipation roll-up, unravelling finalTarget at p = 1.0.
 *
 * @param {number} finalTarget - The rolled value unravelled at p = 1.0
 * @param {number} p - Normalized time progress in [0, 1]
 * @param {number} [die=20] - Die face count (4, 6, 8, 10, 12, 20, 100)
 * @param {number} [stepOffset=0] - Optional step offset so neighboring dice show distinct faces while rolling
 * @returns {{ value: number, stepIndex: number, totalSteps: number, locked: boolean }}
 */
export function computeRollupFrame(finalTarget, p, die = 20, stepOffset = 0) {
  const target = Math.round(Number(finalTarget) || 0);
  const clampedP = Math.max(0, Math.min(1, Number(p) || 0));
  const totalSteps = Math.max(20, Math.min(36, Math.abs(target) + 14));

  if (clampedP >= 1) {
    return { value: target, stepIndex: totalSteps, totalSteps, locked: true };
  }

  const eased = easeInAnticipation(clampedP);
  const stepIndex = Math.min(totalSteps - 1, Math.floor(eased * totalSteps));
  const remaining = totalSteps - stepIndex;

  // Large multi-dice sums (e.g. 49, 113, 305): accelerating climb toward target
  if (target > totalSteps) {
    const val = Math.max(1, Math.min(target - 1, Math.round(1 + (target - 1) * (stepIndex / totalSteps))));
    return { value: val, stepIndex, totalSteps, locked: false };
  }

  // Single die or modest sum: cycling faces that unravel target only at p = 1.0
  const maxFace = Math.max(Number(die) || 20, target, 6);
  const offset = Math.max(0, Math.round(Number(stepOffset) || 0));
  const raw = target - remaining - offset;
  const wrapped = (((raw - 1) % maxFace) + maxFace) % maxFace + 1;
  // Avoid accidentally sitting on target on the penultimate step right before unravelling
  const value = (remaining === 1 && wrapped === target)
    ? ((target % maxFace) + 1)
    : wrapped;
  return { value, stepIndex, totalSteps, locked: false };
}

/**
 * Resolves the final punch / elastic pump direction at the climax.
 * @param {number} naturalVal - Natural rolled value
 * @param {number|null|undefined} targetValue - Final total including bonus or penalty
 * @returns {'pump-up' | 'pump-down' | 'snap-shake'}
 */
export function resolvePumpDirection(naturalVal, targetValue) {
  const fromVal = Math.round(Number(naturalVal) || 0);
  const toVal = targetValue != null && Number.isFinite(Number(targetValue))
    ? Math.round(Number(targetValue))
    : fromVal;
  const delta = toVal - fromVal;
  if (delta > 0) return 'pump-up';
  if (delta < 0) return 'pump-down';
  return 'snap-shake';
}

/**
 * Computes the displayed integer value during the punch / elastic pump phase.
 * @param {number} naturalVal - Natural rolled value
 * @param {number} finalVal - Final total after bonus/penalty
 * @param {number} pumpProgress - Progress of the pump phase in [0, 1]
 * @returns {number}
 */
export function computePumpFrame(naturalVal, finalVal, pumpProgress) {
  const fromVal = Math.round(Number(naturalVal) || 0);
  const toVal = Math.round(Number(finalVal) ?? fromVal);
  if (fromVal === toVal || pumpProgress >= 1) return toVal;
  const p = Math.max(0, Math.min(1, Number(pumpProgress) || 0));
  const snapP = Math.min(1, p / 0.45);
  const ease = 1 - Math.pow(1 - snapP, 3);
  return Math.round(fromVal + (toVal - fromVal) * ease);
}

/**
 * Computes the Phase 3 Falloff (Follow-Through & Overlapping Action) profile
 * featuring a SINGLE powerful and glowing ripple that outstretches and smoothly
 * fades away as both the size of the roll and the glowing elements upscale in ease-out.
 *
 * @param {number} falloffProgress - Progress of the falloff phase in [0, 1]
 * @returns {{
 *   rollScale: number,
 *   numberScale: number,
 *   ringScale: number,
 *   ringOpacity: number,
 *   pulseScale: number,
 *   pulseOpacity: number
 * }}
 */
export function computeFalloffProfile(falloffProgress) {
  const p = Math.max(0, Math.min(1, Number(falloffProgress) || 0));
  const eased = easeOutRipple(p);

  // 1. Slow ease-out upscale of the roll size and inner number starting immediately at p = 0
  const rollScale = +(1 + (FALLOFF_MAX_ROLL_SCALE - 1) * eased).toFixed(4);
  const numberScale = +(1 + 0.06 * eased).toFixed(4);

  // 2. Single powerful glowing ripple ring: launches at p = 0 at full power (opacity = 1)
  //    and smoothly outstretches and fades away to 0
  const ringScale = +(0.96 + (FALLOFF_MAX_RING_SCALE - 0.96) * eased).toFixed(4);
  const ringOpacity = +(Math.pow(1 - eased, 1.45)).toFixed(4);

  // 3. Unified glowing pulse bloom: outstretches in ease-out and smoothly fades away
  const pulseScale = +(0.88 + (FALLOFF_MAX_PULSE_SCALE - 0.88) * eased).toFixed(4);
  const pulseOpacity = +(0.92 * Math.pow(1 - eased, 1.35)).toFixed(4);

  return {
    rollScale,
    numberScale,
    ringScale,
    ringOpacity,
    pulseScale,
    pulseOpacity,
  };
}
