/**
 * dice-rollup.js
 *
 * Pure mathematical choreography for the 2-phase juicy dice roll animation:
 * - Phase 1 (0ms -> 1500ms): Fast numeric roll-up that progressively decelerates
 *   via a quartic ease-out curve (1 - (1 - p)^4) and stops at ~1.5s on the natural roll.
 * - Phase 2 (1500ms+): Crisp "snap & shake" when the bonus (+mod) or penalty (-mod)
 *   elastically pumps the value up or down to its final total.
 */

export const ROLLUP_DURATION_MS = 1500;
export const LAND_HOLD_MS = 130;
export const PUMP_DURATION_MS = 380;

/**
 * Quartic ease-out: starts fast (80% of progress in the first 33% of time)
 * and slowly decelerates to a stop at p = 1.0 (1.5s).
 * @param {number} p - Normalized progress in [0, 1]
 * @returns {number} Eased progress in [0, 1]
 */
export function easeOutQuart(p) {
  const clamped = Math.max(0, Math.min(1, Number(p) || 0));
  return 1 - Math.pow(1 - clamped, 4);
}

/**
 * Computes the displayed integer value at normalized progress p in [0, 1]
 * during the 1.5s fast-to-slow roll-up toward naturalVal.
 *
 * @param {number} naturalVal - The natural rolled value (or sum of natural rolls) to stop at around 1.5s
 * @param {number} p - Normalized time progress in [0, 1] (elapsed / 1500)
 * @param {number} [die=20] - Die face count (4, 6, 8, 10, 12, 20, 100)
 * @returns {{ value: number, stepIndex: number, totalSteps: number }}
 */
export function computeRollupFrame(naturalVal, p, die = 20) {
  const target = Math.round(Number(naturalVal) || 0);
  const clampedP = Math.max(0, Math.min(1, Number(p) || 0));

  if (clampedP >= 1) {
    const totalSteps = Math.max(16, Math.min(36, Math.abs(target) + 12));
    return { value: target, stepIndex: totalSteps, totalSteps };
  }

  const totalSteps = Math.max(16, Math.min(36, Math.abs(target) + 12));
  const eased = easeOutQuart(clampedP);
  const stepIndex = Math.min(totalSteps, Math.floor(eased * totalSteps));
  const remaining = totalSteps - stepIndex;

  if (remaining <= 0) {
    return { value: target, stepIndex: totalSteps, totalSteps };
  }

  // Large multi-dice sums (e.g. 49, 113, 305): smooth decelerating climb from 1 to target
  if (target > totalSteps) {
    const val = Math.max(1, Math.min(target - 1, Math.round(1 + (target - 1) * (stepIndex / totalSteps))));
    return { value: val, stepIndex, totalSteps };
  }

  // Single die or modest sum: ascending modulo cycle that smoothly steps N-3 -> N-2 -> N-1 -> N
  const maxFace = Math.max(Number(die) || 20, target, 6);
  const raw = target - remaining;
  const wrapped = (((raw - 1) % maxFace) + maxFace) % maxFace + 1;
  return { value: wrapped, stepIndex, totalSteps };
}

/**
 * Resolves the elastic pump direction after the 1.5s roll-up stops on naturalVal.
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
 * Computes the displayed integer value during the elastic bonus/penalty pump phase.
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
  // Fast elastic snap into the final value within the first 55% of the pump animation
  const snapP = Math.min(1, p / 0.55);
  const ease = 1 - Math.pow(1 - snapP, 3);
  return Math.round(fromVal + (toVal - fromVal) * ease);
}
