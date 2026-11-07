import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLLUP_DURATION_MS,
  LAND_HOLD_MS,
  PUMP_DURATION_MS,
  MIN_SHAKE_FREQ_HZ,
  MAX_SHAKE_FREQ_HZ,
  easeInAnticipation,
  computeAnticipationProfile,
  computeRollupFrame,
  resolvePumpDirection,
  computePumpFrame,
} from '../src/dice/dice-rollup.js';

test('ROLLUP_DURATION_MS is 1500ms followed by a tight pre-punch coil and final punch', () => {
  assert.equal(ROLLUP_DURATION_MS, 1500);
  assert.ok(LAND_HOLD_MS > 0 && LAND_HOLD_MS <= 150);
  assert.ok(PUMP_DURATION_MS >= 300 && PUMP_DURATION_MS <= 600);
});

test('computeAnticipationProfile starts with ZERO wobble at p=0 and increases frequency, strength, and motion blur toward p=1', () => {
  const start = computeAnticipationProfile(0);
  assert.equal(start.strength, 0, 'Must not wobble at the start (strength = 0)');
  assert.equal(start.shakeX, 0, 'Must not wobble at the start (shakeX = 0)');
  assert.equal(start.shakeY, 0, 'Must not wobble at the start (shakeY = 0)');
  assert.equal(start.shakeRot, 0, 'Must not wobble at the start (shakeRot = 0)');
  assert.equal(start.motionBlurPx, 0, 'Motion blur must start at 0px');
  assert.equal(start.numberBlurPx, 0, 'Number motion blur must start at 0px');
  assert.equal(start.chargeScale, 1, 'Scale must start at 1.0');
  assert.equal(start.frequencyHz, MIN_SHAKE_FREQ_HZ);

  // Across (0, 1), shaking frequency, shaking strength, and motion blur strictly increase
  let prev = start;
  for (const p of [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.98]) {
    const cur = computeAnticipationProfile(p);
    assert.ok(
      cur.frequencyHz > prev.frequencyHz,
      `Shaking frequency must increase: ${cur.frequencyHz} <= ${prev.frequencyHz} at p=${p}`,
    );
    assert.ok(
      cur.strength > prev.strength,
      `Shaking strength must increase: ${cur.strength} <= ${prev.strength} at p=${p}`,
    );
    assert.ok(
      cur.motionBlurPx > prev.motionBlurPx,
      `Die motion blur must increase: ${cur.motionBlurPx} <= ${prev.motionBlurPx} at p=${p}`,
    );
    assert.ok(
      cur.numberBlurPx > prev.numberBlurPx,
      `Number motion blur must increase: ${cur.numberBlurPx} <= ${prev.numberBlurPx} at p=${p}`,
    );
    assert.ok(
      cur.chargeScale > prev.chargeScale,
      `Charge scale must increase: ${cur.chargeScale} <= ${prev.chargeScale} at p=${p}`,
    );
    prev = cur;
  }

  // At p = 1.0 (the final punch), motion blur and shake snap to 0 to unravel the rolled number crisply
  const end = computeAnticipationProfile(1);
  assert.equal(end.strength, 0);
  assert.equal(end.shakeX, 0);
  assert.equal(end.shakeY, 0);
  assert.equal(end.shakeRot, 0);
  assert.equal(end.motionBlurPx, 0);
  assert.equal(end.numberBlurPx, 0);
  assert.equal(end.frequencyHz, MAX_SHAKE_FREQ_HZ);
});

test('easeInAnticipation accelerates number roll-up velocity as shaking and motion blur build', () => {
  assert.equal(easeInAnticipation(0), 0);
  assert.equal(easeInAnticipation(1), 1);

  const firstHalfDelta = easeInAnticipation(0.5) - easeInAnticipation(0.0);
  const secondHalfDelta = easeInAnticipation(1.0) - easeInAnticipation(0.5);
  assert.ok(
    secondHalfDelta > firstHalfDelta * 2,
    `Second half roll-up velocity (${secondHalfDelta}) must accelerate past first half (${firstHalfDelta})`,
  );
});

test('computeRollupFrame cycles through valid integers and unravels naturalVal at p=1', () => {
  for (const [die, naturalVal] of [[20, 17], [20, 1], [20, 20], [12, 11], [6, 4], [8, 8], [100, 74]]) {
    let prevStep = -1;
    for (let ms = 0; ms < ROLLUP_DURATION_MS; ms += 50) {
      const frame = computeRollupFrame(naturalVal, ms / ROLLUP_DURATION_MS, die);
      assert.ok(
        frame.stepIndex >= prevStep,
        `stepIndex must be non-decreasing: ${frame.stepIndex} < ${prevStep} at ${ms}ms`,
      );
      assert.ok(Number.isInteger(frame.value) && frame.value >= 1);
      prevStep = frame.stepIndex;
    }

    // Penultimate step does not prematurely reveal naturalVal before the final punch
    const penultimate = computeRollupFrame(naturalVal, 0.995, die);
    assert.notEqual(penultimate.value, naturalVal);

    const endFrame = computeRollupFrame(naturalVal, 1, die);
    assert.equal(endFrame.value, naturalVal);
    assert.equal(endFrame.stepIndex, endFrame.totalSteps);
  }
});

test('computeRollupFrame handles large multi-dice sums (e.g. 49, 113, 305) smoothly', () => {
  for (const naturalSum of [49, 113, 305]) {
    const start = computeRollupFrame(naturalSum, 0, 12);
    const mid = computeRollupFrame(naturalSum, 0.5, 12);
    const end = computeRollupFrame(naturalSum, 1.0, 12);

    assert.equal(start.value, 1);
    assert.ok(mid.value > start.value && mid.value < naturalSum);
    assert.equal(end.value, naturalSum);
  }
});

test('resolvePumpDirection and computePumpFrame unravel finalVal on the final punch', () => {
  assert.equal(resolvePumpDirection(15, 19), 'pump-up');
  assert.equal(resolvePumpDirection(15, 12), 'pump-down');
  assert.equal(resolvePumpDirection(15, 15), 'snap-shake');
  assert.equal(resolvePumpDirection(15, null), 'snap-shake');

  // Positive bonus (+4: 14 -> 18)
  assert.equal(computePumpFrame(14, 18, 0), 14);
  const midUp = computePumpFrame(14, 18, 0.2);
  assert.ok(midUp > 14 && midUp <= 18);
  assert.equal(computePumpFrame(14, 18, 0.5), 18);
  assert.equal(computePumpFrame(14, 18, 1.0), 18);

  // Negative penalty (-3: 14 -> 11)
  assert.equal(computePumpFrame(14, 11, 0), 14);
  const midDown = computePumpFrame(14, 11, 0.2);
  assert.ok(midDown < 14 && midDown >= 11);
  assert.equal(computePumpFrame(14, 11, 0.5), 11);
  assert.equal(computePumpFrame(14, 11, 1.0), 11);
});
