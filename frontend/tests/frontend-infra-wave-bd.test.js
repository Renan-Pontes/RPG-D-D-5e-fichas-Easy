import test from 'node:test';
import assert from 'node:assert/strict';
import { createUndoHistory } from '../src/sheet/undo-history.js';
import { computeBackoffMs } from '../src/api/polling.js';
import { migrateSpellAliases, charCardSummary } from '../src/api/char-card-summary.js';
import { triggerHaptic } from '../src/utils/wake-lock.js';
import { SOUNDSCAPES, findSoundscape } from '../src/stage/soundscape-engine.js';

test('Immer 20-step undo history records, bounds, undoes, and redoes patches cleanly', () => {
  const hist = createUndoHistory(20);
  let state = { currentHp: 30, maxHp: 30, slotsUsed: { 1: 0 } };

  for (let i = 1; i <= 25; i++) {
    const next = { ...state, currentHp: 30 - i };
    const res = hist.record(state, next, 'hp');
    assert.equal(res.changed, true);
    state = res.state;
  }
  assert.equal(state.currentHp, 5);
  assert.equal(hist.size(), 20);
  assert.equal(hist.canUndo(), true);

  const u1 = hist.undo(state);
  assert.equal(u1.state.currentHp, 6);
  assert.equal(hist.canRedo(), true);

  const r1 = hist.redo(u1.state);
  assert.equal(r1.state.currentHp, 5);
});

test('Polling backoff doubles exponentially up to maxMs with jitter', () => {
  assert.equal(computeBackoffMs(0, 2500, 30_000, () => 0.5), 2500);
  assert.equal(computeBackoffMs(1, 2500, 30_000, () => 0.5), 5000);
  assert.equal(computeBackoffMs(2, 2500, 30_000, () => 0.5), 10_000);
  assert.equal(computeBackoffMs(3, 2500, 30_000, () => 0.5), 20_000);
  assert.equal(computeBackoffMs(4, 2500, 30_000, () => 0.5), 30_000);
  assert.equal(computeBackoffMs(9, 2500, 30_000, () => 0), 25_500);
  assert.equal(computeBackoffMs(9, 2500, 30_000, () => 1), 30_000);
});

test('char-card-summary migrates spell aliases without importing SRD', () => {
  const raw = {
    id: 7, name: 'Lyra', level: 5, className: 'ranger', maxHp: 42, currentHp: 31,
    spells: ['huntersMarkUp', { id: 'feign death', prepared: true }],
  };
  const mig = migrateSpellAliases(raw);
  assert.deepEqual(mig.spells, ['thunderousSmite', { id: 'feignDeath', prepared: true }]);
  const summary = charCardSummary(mig);
  assert.deepEqual(summary, {
    id: 7, name: 'Lyra', level: 5, className: 'ranger', subclass: '', race: '',
    rulesVersion: '2014', hp: 31, maxHp: 42, ac: null, avatar: null, updatedAt: null,
  });
});

test('Wake Lock haptics no-op safely in Node and Soundscapes include all 6 presets', () => {
  assert.equal(triggerHaptic('nat20'), false);
  assert.equal(SOUNDSCAPES.length, 6);
  assert.equal(findSoundscape('dungeon')?.id, 'dungeon');
  assert.equal(findSoundscape('unknown'), null);
});
