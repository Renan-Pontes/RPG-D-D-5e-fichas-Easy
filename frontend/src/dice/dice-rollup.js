/**
 * dice-rollup.js
 *
 * Pure mathematical choreography for the 3-phase juicy dice roll:
 * - Phase 1 (0ms -> 1500ms, Anticipation Roll-Up): Starts calm with ZERO initial
 *   wobble, then builds anticipation via an accelerating numeric roll-up with
 *   strictly increasing shaking frequency (4Hz -> 42Hz), increasing shaking
 *   strength (amplitude), and increasing directional motion blur.
 * - Phase 2 (1500ms+, Final Punch): Motion blur snaps to 0 and a visceral Final Punch
 *   (with elastic upward/downward pump for +bonus/-penalty) unravels the rolled number.
 * - Phase 3 (Falloff — Follow-Through & Overlapping Action): As soon as the final
 *   number of the roll is unravelled, the glowing ring and glowing pulse outstretch
 *   and smoothly fade away while both the size of the roll and the glowing elements
 *   slowly upscale in ease-out like a ripple.
 */

export const ROLLUP_DURATION_MS = 1500;
export const LAND_HOLD_MS = 85;
export const PUMP_DURATION_MS = 320;
export const FALLOFF_DURATION_MS = 2100;

export const MIN_SHAKE_FREQ_HZ = 4;
export const MAX_SHAKE_FREQ_HZ = 42;
export const MAX_SHAKE_PX = 9.0;
export const MAX_SHAKE_ROT_DEG = 6.5;
export const MAX_DIE_BLUR_PX = 3.0;
export const MAX_NUMBER_BLUR_PX = 3.6;

export const FALLOFF_MAX_ROLL_SCALE = 1.12;
export const FALLOFF_MAX_RING_SCALE = 2.85;
export const FALLOFF_MAX_SECONDARY_RING_SCALE = 3.30;
export const FALLOFF_MAX_PULSE_SCALE = 2.60;

/**
 * Accelerating anticipation curve for the roll-up:
 * Starts with a steady initial slope (0.25) so numbers begin ticking immediately
 * without wobbling the die, then accelerates steeply (0.75 * p^2.6) as shaking
 * frequency, strength, and motion blur build toward the 1.5s climax.
 * @param {number} p - Normalized progress in [0, 1]
 * @returns {number} Eased progress in [0, 1]
 */
export function easeInAnticipation(p) {
  const clamped = Math.max(0, Math.min(1, Number(p) || 0));
  return 0.25 * clamped + 0.75 * Math.pow(clamped, 2.6);
}

/**
 * Smooth ease-out ripple curve for the post-reveal follow-through and falloff:
 * Expands rapidly right as the final number is unravelled, then decelerates
 * smoothly and asymptotically like a ripple across water.
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
 * Computes the instantaneous shaking frequency, shaking strength, 2D tremor offsets,
 * tension scale, and directional motion blur at normalized progress p in [0, 1].
 *
 * Guarantees:
 * - At p = 0: strength = 0, shakeX = 0, shakeY = 0, shakeRot = 0, motionBlurPx = 0
 *   (the animation NEVER starts by wobbling the die).
 * - For 0 < p < 1: frequencyHz, strength, motionBlurPx, and numberBlurPx all
 *   strictly increase as p approaches 1.0.
 * - At p >= 1: all shake and motion blur snap back to 0 for the final punch reveal.
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

  // Instantaneous shaking frequency (Hz): ramps from 4 Hz to 42 Hz
  const frequencyHz = MIN_SHAKE_FREQ_HZ + (MAX_SHAKE_FREQ_HZ - MIN_SHAKE_FREQ_HZ) * Math.pow(clamped, 2);

  // Exact integrated phase of the chirp signal over T = 1.5s
  const durationSec = ROLLUP_DURATION_MS / 1000;
  const phase = 2 * Math.PI * durationSec * (
    MIN_SHAKE_FREQ_HZ * clamped + ((MAX_SHAKE_FREQ_HZ - MIN_SHAKE_FREQ_HZ) / 3) * Math.pow(clamped, 3)
  );

  const shakeX = +(Math.sin(phase) * MAX_SHAKE_PX * strength).toFixed(2);
  const shakeY = +(Math.cos(phase * 1.37) * MAX_SHAKE_PX * 0.78 * strength).toFixed(2);
  const shakeRot = +(Math.sin(phase * 0.83) * MAX_SHAKE_ROT_DEG * strength).toFixed(2);

  // Motion blur builds with shaking velocity and strength before the final punch
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
 * during the 1.5s anticipation roll-up, unravelling naturalVal at p = 1.0.
 *
 * @param {number} naturalVal - The natural rolled value (or sum of natural rolls) unravelled at 1.5s
 * @param {number} p - Normalized time progress in [0, 1] (elapsed / 1500)
 * @param {number} [die=20] - Die face count (4, 6, 8, 10, 12, 20, 100)
 * @returns {{ value: number, stepIndex: number, totalSteps: number }}
 */
export function computeRollupFrame(naturalVal, p, die = 20) {
  const target = Math.round(Number(naturalVal) || 0);
  const clampedP = Math.max(0, Math.min(1, Number(p) || 0));
  const totalSteps = Math.max(24, Math.min(44, Math.abs(target) + 18));

  if (clampedP >= 1) {
    return { value: target, stepIndex: totalSteps, totalSteps };
  }

  const eased = easeInAnticipation(clampedP);
  const stepIndex = Math.min(totalSteps - 1, Math.floor(eased * totalSteps));
  const remaining = totalSteps - stepIndex;

  // Large multi-dice sums (e.g. 49, 113, 305): accelerating climb toward target
  if (target > totalSteps) {
    const val = Math.max(1, Math.min(target - 1, Math.round(1 + (target - 1) * (stepIndex / totalSteps))));
    return { value: val, stepIndex, totalSteps };
  }

  // Single die or modest sum: cycling faces that unravel target only at p = 1.0
  const maxFace = Math.max(Number(die) || 20, target, 6);
  const raw = target - remaining;
  const wrapped = (((raw - 1) % maxFace) + maxFace) % maxFace + 1;
  // Avoid accidentally sitting on target on the penultimate step right before the final punch
  const value = (remaining === 1 && wrapped === target)
    ? ((target % maxFace) + 1)
    : wrapped;
  return { value, stepIndex, totalSteps };
}

/**
 * Resolves the final punch / elastic pump direction after the 1.5s roll-up climax.
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
 * Computes the displayed integer value during the final punch / elastic pump phase.
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
  // Fast punch snap into the final value within the first 45% of the punch animation
  const snapP = Math.min(1, p / 0.45);
  const ease = 1 - Math.pow(1 - snapP, 3);
  return Math.round(fromVal + (toVal - fromVal) * ease);
}

/**
 * Computes the Phase 3 Falloff (Follow-Through & Overlapping Action) ripple profile
 * as soon as the final number of the roll is unravelled:
 * - Both the size of the roll (`rollScale`) and the glowing elements (`ringScale`,
 *   `secondaryRingScale`, `pulseScale`) slowly upscale in ease-out like a ripple.
 * - The glowing ring (`ringOpacity`, `secondaryRingOpacity`) and glowing pulse
 *   (`pulseOpacity`) outstretch and smoothly fade away to 0 with overlapping timing.
 *
 * @param {number} falloffProgress - Progress of the falloff phase in [0, 1]
 * @returns {{
 *   rollScale: number,
 *   numberScale: number,
 *   ringScale: number,
 *   ringOpacity: number,
 *   secondaryRingScale: number,
 *   secondaryRingOpacity: number,
 *   pulseScale: number,
 *   pulseOpacity: number
 * }}
 */
export function computeFalloffProfile(falloffProgress) {
  const p = Math.max(0, Math.min(1, Number(falloffProgress) || 0));

  // 1. Slow ease-out upscale of the roll size and inner number
  const rollEased = easeOutRipple(p);
  const rollScale = +(1 + (FALLOFF_MAX_ROLL_SCALE - 1) * rollEased).toFixed(4);
  const numberScale = +(1 + 0.06 * rollEased).toFixed(4);

  // 2. Primary glowing ring: leads the ripple wave (completes over first 85% of falloff)
  const ringP = Math.min(1, p / 0.85);
  const ringEased = easeOutRipple(ringP);
  const ringScale = +(0.92 + (FALLOFF_MAX_RING_SCALE - 0.92) * ringEased).toFixed(4);
  const ringOpacity = +(0.92 * Math.pow(1 - ringEased, 1.35)).toFixed(4);

  // 3. Overlapping secondary ripple ring: lags by 8% for authentic overlapping action
  const secP = p <= 0.08 ? 0 : Math.min(1, (p - 0.08) / 0.92);
  const secEased = easeOutRipple(secP);
  const secondaryRingScale = +(0.86 + (FALLOFF_MAX_SECONDARY_RING_SCALE - 0.86) * secEased).toFixed(4);
  const secondaryRingOpacity = p <= 0.08
    ? 0
    : +(0.68 * Math.pow(1 - secEased, 1.4)).toFixed(4);

  // 4. Glowing pulse bloom: outstretches across the full falloff window and smoothly fades away
  const pulseEased = easeOutRipple(p);
  const pulseScale = +(0.82 + (FALLOFF_MAX_PULSE_SCALE - 0.82) * pulseEased).toFixed(4);
  const pulseOpacity = +(0.88 * Math.pow(1 - pulseEased, 1.25)).toFixed(4);

  return {
    rollScale,
    numberScale,
    ringScale,
    ringOpacity,
    secondaryRingScale,
    secondaryRingOpacity,
    pulseScale,
    pulseOpacity,
  };
}
