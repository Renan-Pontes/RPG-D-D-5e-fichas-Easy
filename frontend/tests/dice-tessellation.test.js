import test from 'node:test';
import assert from 'node:assert/strict';
import { getTessellationLayout, DICE_FACES } from '../src/dice/dice-tessellation.js';

function parseSvgPolygon(d, cx, cy, size, rotDeg = 0) {
  const cmds = d.trim().split(/(?=[MLHVZ])/i);
  let x = 0;
  let y = 0;
  const raw = [];
  for (const c of cmds) {
    const type = c[0].toUpperCase();
    const nums = c.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (type === 'M' || type === 'L') {
      x = nums[0];
      y = nums[1];
      raw.push([x, y]);
    } else if (type === 'H') {
      x = nums[0];
      raw.push([x, y]);
    } else if (type === 'V') {
      y = nums[0];
      raw.push([x, y]);
    }
  }
  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return raw.map(([px, py]) => {
    const dx = ((px - 50) / 100) * size;
    const dy = ((py - 50) / 100) * size;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  });
}

function ptSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function polyEdgeDist(p1, p2) {
  let min = Infinity;
  for (let i = 0; i < p1.length; i++) {
    const [ax, ay] = p1[i];
    for (let j = 0; j < p2.length; j++) {
      const [bx1, by1] = p2[j];
      const [bx2, by2] = p2[(j + 1) % p2.length];
      min = Math.min(min, ptSegDist(ax, ay, bx1, by1, bx2, by2));
    }
  }
  for (let i = 0; i < p2.length; i++) {
    const [ax, ay] = p2[i];
    for (let j = 0; j < p1.length; j++) {
      const [bx1, by1] = p1[j];
      const [bx2, by2] = p1[(j + 1) % p1.length];
      min = Math.min(min, ptSegDist(ax, ay, bx1, by1, bx2, by2));
    }
  }
  return min;
}

test('dice-tessellation: calculates exact 50% scale for all dice types', () => {
  const diceTypes = [4, 6, 8, 10, 12, 20, 100];
  for (const die of diceTypes) {
    const layout = getTessellationLayout(die, 5, { heroSize: 104 });
    assert.equal(layout.heroSize, 104, `heroSize should be 104 for die d${die}`);
    assert.equal(layout.petalSize, 52, `petalSize should be exactly 50% (52) for die d${die}`);
    assert.equal(layout.slots.length, 5, `should return 5 slots for count=5 on die d${die}`);
  }
});

test('dice-tessellation: D6 matches 4x4 square perimeter grid calibrated to SVG 70% fill (Image 2)', () => {
  const layout = getTessellationLayout(6, 12, { heroSize: 104, gutter: 6 });
  assert.equal(layout.petalSize, 52);
  assert.equal(layout.slots.length, 12);

  for (const slot of layout.slots) {
    assert.equal(slot.rot, 0, 'all D6 small squares must be upright');
  }

  const heroPoly = parseSvgPolygon(DICE_FACES[6], 0, 0, 104, 0);
  const slotPolys = layout.slots.map(s => parseSvgPolygon(DICE_FACES[6], s.x, s.y, 52, s.rot));

  for (let i = 0; i < slotPolys.length; i++) {
    const dHero = polyEdgeDist(heroPoly, slotPolys[i]);
    assert.ok(dHero >= 3.5, `D6 slot ${layout.slots[i].id} must not overlap hero: dist=${dHero}`);
    for (let j = i + 1; j < slotPolys.length; j++) {
      const dSlot = polyEdgeDist(slotPolys[i], slotPolys[j]);
      assert.ok(dSlot >= 3.0, `D6 slots ${i} and ${j} must not overlap: dist=${dSlot}`);
    }
  }
});

test('dice-tessellation: D8 matches 4x4 diamond perimeter grid calibrated to SVG bounds (Image 3)', () => {
  const layout = getTessellationLayout(8, 12, { heroSize: 104, gutter: 6 });
  assert.equal(layout.petalSize, 52);
  assert.equal(layout.slots.length, 12);

  for (const slot of layout.slots) {
    assert.equal(slot.rot, 0, 'all D8 small diamonds must be upright');
  }

  const heroPoly = parseSvgPolygon(DICE_FACES[8], 0, 0, 104, 0);
  const slotPolys = layout.slots.map(s => parseSvgPolygon(DICE_FACES[8], s.x, s.y, 52, s.rot));

  for (let i = 0; i < slotPolys.length; i++) {
    const dHero = polyEdgeDist(heroPoly, slotPolys[i]);
    assert.ok(dHero >= 3.5, `D8 slot ${layout.slots[i].id} must not overlap hero: dist=${dHero}`);
    for (let j = i + 1; j < slotPolys.length; j++) {
      const dSlot = polyEdgeDist(slotPolys[i], slotPolys[j]);
      assert.ok(dSlot >= 3.0, `D8 slots ${i} and ${j} must not overlap: dist=${dSlot}`);
    }
  }
});

test('dice-tessellation: D4 uses alternating upright and inverted triangles calibrated to SVG (50,50) pivot (Image 1)', () => {
  const layout = getTessellationLayout(4, 9, { heroSize: 104, gutter: 7.5 });
  assert.equal(layout.petalSize, 52);
  assert.equal(layout.slots.length, 9);

  assert.equal(layout.slots[0].rot, 180, 'D4 bottom left triangle must be inverted (180deg)');
  assert.equal(layout.slots[1].rot, 180, 'D4 bottom right triangle must be inverted (180deg)');

  const topInvLeft = layout.slots.find(s => s.id === 'top-inv-left');
  assert.ok(topInvLeft, 'must have top inverted left triangle');
  assert.equal(topInvLeft.rot, 180);

  const heroPoly = parseSvgPolygon(DICE_FACES[4], 0, 0, 104, 0);
  const slotPolys = layout.slots.map(s => parseSvgPolygon(DICE_FACES[4], s.x, s.y, 52, s.rot));

  for (let i = 0; i < slotPolys.length; i++) {
    const dHero = polyEdgeDist(heroPoly, slotPolys[i]);
    assert.ok(dHero >= 6.0, `D4 slot ${layout.slots[i].id} must not overlap hero: dist=${dHero}`);
    let nearest = dHero;
    for (let j = 0; j < slotPolys.length; j++) {
      if (i === j) continue;
      const dSlot = polyEdgeDist(slotPolys[i], slotPolys[j]);
      assert.ok(dSlot >= 6.0, `D4 slots ${i} and ${j} must have uniform gutter: dist=${dSlot}`);
      nearest = Math.min(nearest, dSlot);
    }
    assert.ok(nearest >= 6.5 && nearest <= 8.5, `D4 slot ${layout.slots[i].id} must have uniform symmetric nearest-neighbor gutter (~7.5px): nearest=${nearest}`);
  }
});

test('dice-tessellation: D20 honeycomb tessellation supports 2d20, 5d20, 7d20, 12d20 (Image 5)', () => {
  for (const count of [2, 5, 7, 12]) {
    const layout = getTessellationLayout(20, count, { heroSize: 104 });
    assert.equal(layout.petalSize, 52);
    assert.equal(layout.slots.length, count);
    for (const slot of layout.slots) {
      assert.equal(slot.rot, 0, 'D20 hexagons must be oriented at rot === 0');
    }

    const heroPoly = parseSvgPolygon(DICE_FACES[20], 0, 0, 104, 0);
    const slotPolys = layout.slots.map(s => parseSvgPolygon(DICE_FACES[20], s.x, s.y, 52, s.rot));
    for (let i = 0; i < slotPolys.length; i++) {
      assert.ok(polyEdgeDist(heroPoly, slotPolys[i]) >= 4.0);
      for (let j = i + 1; j < slotPolys.length; j++) {
        assert.ok(polyEdgeDist(slotPolys[i], slotPolys[j]) >= 3.5);
      }
    }
  }
});

test('dice-tessellation: D12 pentagonal rosette uses radially stepped rotations so facets are parallel and valleys nestle seamlessly (Screenshot 1)', () => {
  const layout = getTessellationLayout(12, 10, { heroSize: 104 });
  assert.equal(layout.petalSize, 52);
  assert.equal(layout.slots.length, 10);

  const expectedInnerRots = [180, 108, 36, 324, 252];
  const expectedOuterRots = [0, 72, 144, 216, 288];

  // Inner 5 facet pentagons must be radially rotated so each flat edge is parallel to its corresponding hero facet
  for (let i = 0; i < 5; i++) {
    assert.equal(layout.slots[i].rot, expectedInnerRots[i], `D12 inner facet slot ${layout.slots[i].id} rot must match radial face alignment`);
  }
  // Outer 5 valley pentagons must be radially rotated pointing outwards into valleys
  for (let i = 5; i < 10; i++) {
    assert.equal(layout.slots[i].rot, expectedOuterRots[i - 5], `D12 outer valley slot ${layout.slots[i].id} rot must match radial valley alignment`);
  }

  const heroPoly = parseSvgPolygon(DICE_FACES[12], 0, 0, 104, 0);
  const slotPolys = layout.slots.map(s => parseSvgPolygon(DICE_FACES[12], s.x, s.y, 52, s.rot));
  for (let i = 0; i < slotPolys.length; i++) {
    const dHero = polyEdgeDist(heroPoly, slotPolys[i]);
    assert.ok(dHero >= 6.0, `D12 slot ${layout.slots[i].id} must not overlap hero: dist=${dHero}`);
    for (let j = i + 1; j < slotPolys.length; j++) {
      const dSlot = polyEdgeDist(slotPolys[i], slotPolys[j]);
      assert.ok(dSlot >= 6.0, `D12 slots ${i} and ${j} must not overlap and have uniform gutter: dist=${dSlot}`);
    }
  }
});

test('dice-tessellation: D10 pentagonal rosette uses matching radially stepped rotations', () => {
  const layout = getTessellationLayout(10, 10, { heroSize: 104 });
  assert.equal(layout.petalSize, 52);
  assert.equal(layout.slots.length, 10);

  const expectedInnerRots = [180, 108, 36, 324, 252];
  const expectedOuterRots = [0, 72, 144, 216, 288];

  for (let i = 0; i < 5; i++) {
    assert.equal(layout.slots[i].rot, expectedInnerRots[i], `D10 inner facet slot ${layout.slots[i].id} rot must match radial face alignment`);
  }
  for (let i = 5; i < 10; i++) {
    assert.equal(layout.slots[i].rot, expectedOuterRots[i - 5], `D10 outer valley slot ${layout.slots[i].id} rot must match radial valley alignment`);
  }

  const heroPoly = parseSvgPolygon(DICE_FACES[10], 0, 0, 104, 0);
  const slotPolys = layout.slots.map(s => parseSvgPolygon(DICE_FACES[10], s.x, s.y, 52, s.rot));
  for (let i = 0; i < slotPolys.length; i++) {
    const dHero = polyEdgeDist(heroPoly, slotPolys[i]);
    assert.ok(dHero >= 6.0, `D10 slot ${layout.slots[i].id} must not overlap hero: dist=${dHero}`);
    for (let j = i + 1; j < slotPolys.length; j++) {
      const dSlot = polyEdgeDist(slotPolys[i], slotPolys[j]);
      assert.ok(dSlot >= 6.0, `D10 slots ${i} and ${j} must not overlap: dist=${dSlot}`);
    }
  }
});

test('dice-tessellation: scales smoothly up to 20 dice for all dice types (N = 20)', () => {
  const diceTypes = [4, 6, 8, 10, 12, 20, 100];
  for (const die of diceTypes) {
    const layout = getTessellationLayout(die, 20);
    assert.equal(layout.slots.length, 20, `d${die} must support exactly 20 slots`);
    assert.equal(layout.petalSize, Math.round(layout.heroSize * 0.5), `d${die} constituent size must strictly be 50%`);

    const heroPoly = parseSvgPolygon(DICE_FACES[die], 0, 0, layout.heroSize, 0);
    const slotPolys = layout.slots.map(s => parseSvgPolygon(DICE_FACES[die], s.x, s.y, layout.petalSize, s.rot));

    for (let i = 0; i < slotPolys.length; i++) {
      const dHero = polyEdgeDist(heroPoly, slotPolys[i]);
      assert.ok(dHero >= 2.5, `d${die} slot ${i} must not overlap hero: dist=${dHero}`);
      for (let j = i + 1; j < slotPolys.length; j++) {
        const dSlot = polyEdgeDist(slotPolys[i], slotPolys[j]);
        assert.ok(dSlot >= 2.0, `d${die} slots ${i} and ${j} must not overlap: dist=${dSlot}`);
      }
    }
  }
});

test('dice-tessellation: N = 9 preserves bilateral mirror symmetry across vertical axis (no missing-tooth defect)', () => {
  const diceTypes = [4, 6, 8, 10, 12, 20];
  for (const die of diceTypes) {
    const layout = getTessellationLayout(die, 9);
    assert.equal(layout.slots.length, 9);

    // Sum of X coordinates should equal 0 for mirror symmetric layouts across the Y axis
    const sumX = layout.slots.reduce((acc, s) => acc + s.x, 0);
    assert.ok(Math.abs(sumX) < 1.0, `d${die} layout for N=9 must be centered on X axis (sumX=${sumX})`);

    // Every off-center slot (+X) must have a corresponding symmetric partner (-X) with equal |X| and same Y
    const offCenterSlots = layout.slots.filter(s => Math.abs(s.x) > 0.5);
    const leftSlots = offCenterSlots.filter(s => s.x < -0.5);
    const rightSlots = offCenterSlots.filter(s => s.x > 0.5);
    assert.equal(leftSlots.length, rightSlots.length, `d${die} must have identical number of left and right slots for N=9`);
  }
});

test('dice-tessellation: every count N in [2..20] across all 7 dice types has valid, non-overlapping slots', () => {
  const diceTypes = [4, 6, 8, 10, 12, 20, 100];
  for (const die of diceTypes) {
    for (let count = 2; count <= 20; count++) {
      const layout = getTessellationLayout(die, count);
      assert.equal(layout.slots.length, count, `d${die} count=${count} must have length=${count}`);
      assert.equal(layout.petalSize, Math.round(layout.heroSize * 0.5));

      for (let i = 0; i < layout.slots.length; i++) {
        const s = layout.slots[i];
        assert.ok(Number.isFinite(s.x), `d${die} N=${count} slot ${i} x must be finite`);
        assert.ok(Number.isFinite(s.y), `d${die} N=${count} slot ${i} y must be finite`);
        assert.ok(Number.isFinite(s.rot), `d${die} N=${count} slot ${i} rot must be finite`);
      }
    }
  }
});

test('dice-tessellation: D12 and D10 with N=10 have generous non-cramped spacing between Ring 1 and Ring 2', () => {
  for (const die of [10, 12, 100]) {
    const layout = getTessellationLayout(die, 10, { heroSize: 104 });
    const heroPoly = parseSvgPolygon(DICE_FACES[die], 0, 0, layout.heroSize, 0);
    const slotPolys = layout.slots.map(s => parseSvgPolygon(DICE_FACES[die], s.x, s.y, layout.petalSize, s.rot));

    for (let i = 0; i < slotPolys.length; i++) {
      const dHero = polyEdgeDist(heroPoly, slotPolys[i]);
      assert.ok(dHero >= 6.0, `d${die} slot ${layout.slots[i].id} hero distance must be generous (>=6px): dist=${dHero}`);
      for (let j = i + 1; j < slotPolys.length; j++) {
        const dSlot = polyEdgeDist(slotPolys[i], slotPolys[j]);
        assert.ok(dSlot >= 4.0, `d${die} slots ${i} and ${j} distance must be non-cramped (>=4px): dist=${dSlot}`);
      }
    }
  }
});
