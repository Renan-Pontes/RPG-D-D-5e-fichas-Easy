import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLLUP_DURATION_MS,
  LAND_HOLD_MS,
  PUMP_DURATION_MS,
  FALLOFF_DURATION_MS,
  MIN_SHAKE_FREQ_HZ,
  MAX_SHAKE_FREQ_HZ,
  FALLOFF_MAX_ROLL_SCALE,
  FALLOFF_MAX_RING_SCALE,
  FALLOFF_MAX_PULSE_SCALE,
  NEIGHBOR_MIN_FINISH_P,
  NEIGHBOR_MAX_FINISH_P,
  easeInAnticipation,
  easeOutRipple,
  computeNeighborRollupSchedule,
  computeAnticipationProfile,
  computeRollupFrame,
  resolvePumpDirection,
  computePumpFrame,
  computeFalloffProfile,
} from '../src/dice/dice-rollup.js';

test('50% speed-up and zero-lag climax synchronization at ROLLUP_DURATION_MS = 750ms', () => {
  assert.equal(ROLLUP_DURATION_MS, 750, 'Roll-up duration must be 750ms (50% speed-up from 1500ms)');
  assert.equal(LAND_HOLD_MS, 0, 'Zero hold delay so peak of roll-off, punch, number reveal, and ripple happen at the exact same instant');
  assert.equal(PUMP_DURATION_MS, 220, 'Punch duration must be 220ms (50% speed-up)');
  assert.equal(FALLOFF_DURATION_MS, 1050, 'Falloff ripple duration must be 1050ms (50% speed-up from 2100ms)');
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

test('computeNeighborRollupSchedule randomly accelerates neighboring dice (10d10, 10d8, 5d6) to unravel along the central roll-up and finish in exact sync', () => {
  for (const count of [10, 8, 5, 7]) {
    const schedules = Array.from({ length: count }, (_, i) => computeNeighborRollupSchedule(i, count, 42));

    // 1. Every neighboring die rolls up faster (speedMultiplier >= 1.0) with finishP in [NEIGHBOR_MIN_FINISH_P, NEIGHBOR_MAX_FINISH_P]
    for (const s of schedules) {
      assert.ok(
        s.finishP >= NEIGHBOR_MIN_FINISH_P && s.finishP <= NEIGHBOR_MAX_FINISH_P,
        `finishP (${s.finishP}) must be within [${NEIGHBOR_MIN_FINISH_P}, ${NEIGHBOR_MAX_FINISH_P}]`,
      );
      assert.ok(
        s.speedMultiplier >= 1.0,
        `Neighboring die must roll up faster or equal to central roll-up: speedMultiplier=${s.speedMultiplier}`,
      );
    }

    // 2. The last neighboring die finishes at exactly finishP = 1.00 in sync with the central sum roll-up
    const maxFinishP = Math.max(...schedules.map((s) => s.finishP));
    const minFinishP = Math.min(...schedules.map((s) => s.finishP));
    assert.equal(maxFinishP, 1.0, 'Final neighboring die must finish at finishP = 1.00 in exact sync with central roll-up');
    assert.ok(minFinishP < 0.5, `Earliest neighboring die must unravel early along the central roll-up (got ${minFinishP})`);

    // 3. Ranks are a permutation of [0 .. count - 1] and NOT in sequential spatial order [0, 1, 2, ...]
    const ranks = schedules.map((s) => s.rank);
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    assert.deepEqual(sortedRanks, Array.from({ length: count }, (_, i) => i));
    const isSequential = ranks.every((r, idx) => r === idx);
    assert.equal(isSequential, false, `Neighboring dice completion order must be randomized, not sequential: ${ranks.join(',')}`);
  }
});

test('computeFalloffProfile drives a SINGLE powerful and glowing ripple (plus radial pulse & ease-out roll upscale) that smoothly fades away', () => {
  assert.equal(easeOutRipple(0), 0);
  assert.equal(easeOutRipple(1), 1);

  // Ease-out property: first half expansion is much larger than second half expansion
  const firstHalfRipple = easeOutRipple(0.5) - easeOutRipple(0.0);
  const secondHalfRipple = easeOutRipple(1.0) - easeOutRipple(0.5);
  assert.ok(
    firstHalfRipple > secondHalfRipple * 4,
    `Expected strong ease-out deceleration like a ripple: ${firstHalfRipple} vs ${secondHalfRipple}`,
  );

  const start = computeFalloffProfile(0);
  assert.equal(start.rollScale, 1);
  assert.equal(start.numberScale, 1);
  assert.equal(start.ringOpacity, 1, 'Single powerful glowing ripple starts at full power (opacity = 1) at the exact punch moment');
  assert.ok(start.pulseOpacity > 0.90);
  assert.equal('secondaryRingScale' in start, false, 'Must not include noisy secondary ripple rings');
  assert.equal('secondaryRingOpacity' in start, false, 'Must not include noisy secondary ripple rings');

  let prev = start;
  for (const p of [0.15, 0.3, 0.5, 0.7, 0.85, 1.0]) {
    const cur = computeFalloffProfile(p);
    // Roll size, inner number, and single glowing ripple/pulse all upscale monotonically in ease-out
    assert.ok(cur.rollScale > prev.rollScale, `rollScale must upscale at p=${p}`);
    assert.ok(cur.numberScale > prev.numberScale, `numberScale must upscale at p=${p}`);
    assert.ok(cur.pulseScale > prev.pulseScale, `pulseScale must outstretch at p=${p}`);
    assert.ok(cur.ringScale > prev.ringScale, `ringScale must outstretch at p=${p}`);

    // Single glowing ring and glowing pulse smoothly fade away
    assert.ok(cur.pulseOpacity < prev.pulseOpacity, `pulseOpacity must fade at p=${p}`);
    assert.ok(cur.ringOpacity < prev.ringOpacity, `ringOpacity must fade at p=${p}`);
    prev = cur;
  }

  const end = computeFalloffProfile(1);
  assert.equal(end.rollScale, FALLOFF_MAX_ROLL_SCALE);
  assert.equal(end.ringScale, FALLOFF_MAX_RING_SCALE);
  assert.equal(end.pulseScale, FALLOFF_MAX_PULSE_SCALE);
  assert.equal(end.ringOpacity, 0, 'Single glowing ripple must completely fade away by p=1');
  assert.equal(end.pulseOpacity, 0, 'Glowing pulse must completely fade away by p=1');
});
