import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLLUP_DURATION_MS,
  LAND_HOLD_MS,
  PUMP_DURATION_MS,
  easeOutQuart,
  computeRollupFrame,
  resolvePumpDirection,
  computePumpFrame,
} from '../src/dice/dice-rollup.js';

test('ROLLUP_DURATION_MS stops at 1.5s (1500ms) before the snap/shake and elastic pump', () => {
  assert.equal(ROLLUP_DURATION_MS, 1500);
  assert.ok(LAND_HOLD_MS > 0 && LAND_HOLD_MS <= 200);
  assert.ok(PUMP_DURATION_MS >= 300 && PUMP_DURATION_MS <= 600);
});

test('easeOutQuart starts fast and progressively decelerates toward 1.0', () => {
  assert.equal(easeOutQuart(0), 0);
  assert.equal(easeOutQuart(1), 1);

  // Over 75% of the step progression happens in the first 35% of the 1.5s window (fast initial rollup)
  const earlyProgress = easeOutQuart(0.35);
  assert.ok(earlyProgress > 0.80, `Expected fast initial rollup > 0.80 at p=0.35, got ${earlyProgress}`);

  // In the final 25% of time (p=0.75 -> 1.0), less than 1% of steps remain (slow deceleration to stop)
  const lateDelta = easeOutQuart(1.0) - easeOutQuart(0.75);
  assert.ok(lateDelta < 0.01, `Expected slow final deceleration < 0.01 in last quarter, got ${lateDelta}`);
});

test('computeRollupFrame rolls through valid integers and lands exactly on naturalVal at 1.5s (p=1)', () => {
  for (const [die, naturalVal] of [[20, 17], [20, 1], [20, 20], [12, 11], [6, 4], [8, 8], [100, 74]]) {
    const startFrame = computeRollupFrame(naturalVal, 0, die);
    assert.ok(Number.isInteger(startFrame.value) && startFrame.value >= 1);

    // Sample across the 1.5s timeline and verify monotonic stepIndex progression
    let prevStep = -1;
    for (let ms = 0; ms <= ROLLUP_DURATION_MS; ms += 50) {
      const frame = computeRollupFrame(naturalVal, ms / ROLLUP_DURATION_MS, die);
      assert.ok(
        frame.stepIndex >= prevStep,
        `stepIndex must be non-decreasing: ${frame.stepIndex} < ${prevStep} at ${ms}ms`,
      );
      assert.ok(Number.isInteger(frame.value) && frame.value >= 1);
      prevStep = frame.stepIndex;
    }

    const endFrame = computeRollupFrame(naturalVal, 1, die);
    assert.equal(endFrame.value, naturalVal);
    assert.equal(endFrame.stepIndex, endFrame.totalSteps);
  }
});

test('computeRollupFrame handles large multi-dice sums (e.g. 49, 113, 305) smoothly', () => {
  for (const naturalSum of [49, 113, 305]) {
    const start = computeRollupFrame(naturalSum, 0, 12);
    const mid = computeRollupFrame(naturalSum, 0.25, 12);
    const end = computeRollupFrame(naturalSum, 1.0, 12);

    assert.equal(start.value, 1);
    assert.ok(mid.value > start.value && mid.value < naturalSum);
    assert.equal(end.value, naturalSum);
  }
});

test('resolvePumpDirection distinguishes +bonus (pump-up), -penalty (pump-down), and 0 mod (snap-shake)', () => {
  assert.equal(resolvePumpDirection(15, 19), 'pump-up');
  assert.equal(resolvePumpDirection(15, 12), 'pump-down');
  assert.equal(resolvePumpDirection(15, 15), 'snap-shake');
  assert.equal(resolvePumpDirection(15, null), 'snap-shake');
});

test('computePumpFrame elastically pumps naturalVal up or down to finalVal', () => {
  // Positive bonus (+4: 14 -> 18)
  assert.equal(computePumpFrame(14, 18, 0), 14);
  const midUp = computePumpFrame(14, 18, 0.25);
  assert.ok(midUp > 14 && midUp <= 18);
  assert.equal(computePumpFrame(14, 18, 0.6), 18);
  assert.equal(computePumpFrame(14, 18, 1.0), 18);

  // Negative penalty (-3: 14 -> 11)
  assert.equal(computePumpFrame(14, 11, 0), 14);
  const midDown = computePumpFrame(14, 11, 0.25);
  assert.ok(midDown < 14 && midDown >= 11);
  assert.equal(computePumpFrame(14, 11, 0.6), 11);
  assert.equal(computePumpFrame(14, 11, 1.0), 11);
});
