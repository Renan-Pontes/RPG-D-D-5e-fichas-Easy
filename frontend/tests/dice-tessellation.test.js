import test from 'node:test';
import assert from 'node:assert/strict';
import { getTessellationLayout } from '../src/dice/dice-tessellation.js';

test('dice-tessellation: calculates exact 50% scale for all dice types', () => {
  const diceTypes = [4, 6, 8, 10, 12, 20, 100];
  for (const die of diceTypes) {
    const layout = getTessellationLayout(die, 5, { heroSize: 104 });
    assert.equal(layout.heroSize, 104, `heroSize should be 104 for die d${die}`);
    assert.equal(layout.petalSize, 52, `petalSize should be exactly 50% (52) for die d${die}`);
    assert.equal(layout.slots.length, 5, `should return 5 slots for count=5 on die d${die}`);
  }
});

test('dice-tessellation: D6 matches 4x4 square perimeter grid (Image 2)', () => {
  const layout = getTessellationLayout(6, 12, { heroSize: 100, gutter: 6 });
  assert.equal(layout.petalSize, 50);
  assert.equal(layout.slots.length, 12);

  // All 12 small squares must be upright (rot === 0)
  for (const slot of layout.slots) {
    assert.equal(slot.rot, 0, 'all D6 small squares must be upright');
  }

  // Check that no two slots collide
  for (let i = 0; i < layout.slots.length; i++) {
    for (let j = i + 1; j < layout.slots.length; j++) {
      const dist = Math.hypot(layout.slots[i].x - layout.slots[j].x, layout.slots[i].y - layout.slots[j].y);
      assert.ok(dist >= 50, `D6 slots ${i} and ${j} must not overlap: dist=${dist}`);
    }
  }

  // Check that all slots sit outside the central hero die
  for (const slot of layout.slots) {
    const dist = Math.hypot(slot.x, slot.y);
    assert.ok(dist >= 55, `D6 slot must sit outside center: dist=${dist}`);
  }
});

test('dice-tessellation: D8 matches 4x4 diamond perimeter grid (Image 3)', () => {
  const layout = getTessellationLayout(8, 12, { heroSize: 100, gutter: 6 });
  assert.equal(layout.petalSize, 50);
  assert.equal(layout.slots.length, 12);

  // All 12 diamonds must be oriented at rot === 0
  for (const slot of layout.slots) {
    assert.equal(slot.rot, 0, 'all D8 small diamonds must be upright');
  }

  // Check non-overlapping distances
  for (let i = 0; i < layout.slots.length; i++) {
    for (let j = i + 1; j < layout.slots.length; j++) {
      const dist = Math.hypot(layout.slots[i].x - layout.slots[j].x, layout.slots[i].y - layout.slots[j].y);
      assert.ok(dist >= 32, `D8 slots ${i} and ${j} must not overlap: dist=${dist}`);
    }
  }
});

test('dice-tessellation: D4 uses alternating upright and inverted triangles (Image 1)', () => {
  const layout = getTessellationLayout(4, 9, { heroSize: 100, gutter: 6 });
  assert.equal(layout.petalSize, 50);
  assert.equal(layout.slots.length, 9);

  // Bottom 2 triangles must be inverted (rot === 180) to tile against the base
  assert.equal(layout.slots[0].rot, 180, 'D4 bottom left triangle must be inverted (180deg)');
  assert.equal(layout.slots[1].rot, 180, 'D4 bottom right triangle must be inverted (180deg)');

  // Top inverted triangles must have rot === 180
  const topInvLeft = layout.slots.find(s => s.id === 'top-inv-left');
  assert.ok(topInvLeft, 'must have top inverted left triangle');
  assert.equal(topInvLeft.rot, 180);

  // Check that all slots are separated
  for (let i = 0; i < layout.slots.length; i++) {
    for (let j = i + 1; j < layout.slots.length; j++) {
      const dist = Math.hypot(layout.slots[i].x - layout.slots[j].x, layout.slots[i].y - layout.slots[j].y);
      assert.ok(dist >= 25, `D4 slots ${i} and ${j} must not collide: dist=${dist}`);
    }
  }
});

test('dice-tessellation: D20 honeycomb tessellation supports 2d20, 5d20, 7d20 (Image 5)', () => {
  for (const count of [2, 5, 7, 12]) {
    const layout = getTessellationLayout(20, count, { heroSize: 104 });
    assert.equal(layout.petalSize, 52);
    assert.equal(layout.slots.length, count);
    for (const slot of layout.slots) {
      assert.equal(slot.rot, 0, 'D20 hexagons must be oriented at rot === 0');
    }
    // Check that no two slots collide
    for (let i = 0; i < layout.slots.length; i++) {
      for (let j = i + 1; j < layout.slots.length; j++) {
        const dist = Math.hypot(layout.slots[i].x - layout.slots[j].x, layout.slots[i].y - layout.slots[j].y);
        assert.ok(dist >= 40, `D20 slots ${i} and ${j} must not collide: dist=${dist}`);
      }
    }
  }
});

test('dice-tessellation: D12 pentagonal rosette supports 2d12 to 10d12', () => {
  for (const count of [2, 5, 7, 10]) {
    const layout = getTessellationLayout(12, count, { heroSize: 104 });
    assert.equal(layout.petalSize, 52);
    assert.equal(layout.slots.length, count);
    for (const slot of layout.slots) {
      assert.equal(slot.rot, 0, 'D12 pentagons must be oriented at rot === 0');
    }
    for (let i = 0; i < layout.slots.length; i++) {
      for (let j = i + 1; j < layout.slots.length; j++) {
        const dist = Math.hypot(layout.slots[i].x - layout.slots[j].x, layout.slots[i].y - layout.slots[j].y);
        assert.ok(dist >= 35, `D12 slots ${i} and ${j} must not collide: dist=${dist}`);
      }
    }
  }
});

test('dice-tessellation: D10 kite perimeter supports 2d10 to 10d10', () => {
  for (const count of [2, 5, 8, 10]) {
    const layout = getTessellationLayout(10, count, { heroSize: 104 });
    assert.equal(layout.petalSize, 52);
    assert.equal(layout.slots.length, count);
    for (const slot of layout.slots) {
      assert.equal(slot.rot, 0, 'D10 kites must be oriented at rot === 0');
    }
    for (let i = 0; i < layout.slots.length; i++) {
      for (let j = i + 1; j < layout.slots.length; j++) {
        const dist = Math.hypot(layout.slots[i].x - layout.slots[j].x, layout.slots[i].y - layout.slots[j].y);
        assert.ok(dist >= 35, `D10 slots ${i} and ${j} must not collide: dist=${dist}`);
      }
    }
  }
});
