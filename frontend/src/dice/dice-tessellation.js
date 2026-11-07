/**
 * dice-tessellation.js
 *
 * Geometric Tessellation Layout Engine for Multi-Dice Rolls.
 *
 * Each polyhedral dice type (D4, D6, D8, D10, D12, D20, D100) has an authentic geometric
 * tessellation pattern where constituent dice are reduced to exactly 50% scale
 * and stacked side-to-side along the facets and corners of the central hero die.
 *
 * - D4: Alternating equilateral triangles (upright and inverted) framing the facets and base.
 * - D6: 4x4 perimeter square grid (8 edge squares + 4 corner squares) around a 2x2 central square.
 * - D8: 4x4 diamond/rhombus grid (4 apex corners + 8 facet diamonds) around a 2x2 central diamond.
 * - D20: Regular hexagonal honeycomb (2 small hexagons per facet along all 6 facets).
 * - D12: Dodecahedral pentagonal cluster (docked edge-to-edge along pentagon facets and vertices).
 * - D10/D100: Kite trapezohedron perimeter (docked flush along slant flanks and base).
 */

/**
 * Returns the exact geometric tessellation layout for a die type and count.
 * @param {number} die - Die face count (4, 6, 8, 10, 12, 20, 100)
 * @param {number} count - Total constituent dice count (N >= 2)
 * @param {object} [options]
 * @param {number} [options.heroSize=104] - Central hero die scale (1.0)
 * @param {number} [options.gutter=6] - Breathing gutter between adjacent shapes
 * @returns {{ heroSize: number, petalSize: number, stageWidth: number, stageHeight: number, slots: Array<{ id: string, x: number, y: number, rot: number }> }}
 */
export function getTessellationLayout(die, count, options = {}) {
  const heroSize = options.heroSize || 104;
  const petalSize = Math.round(heroSize * 0.5); // Strictly 50% scale
  const gutter = options.gutter != null ? options.gutter : 6;

  switch (Number(die)) {
    case 4:
      return getD4Tessellation(count, heroSize, petalSize, gutter);
    case 6:
      return getD6Tessellation(count, heroSize, petalSize, gutter);
    case 8:
      return getD8Tessellation(count, heroSize, petalSize, gutter);
    case 10:
    case 100:
      return getD10Tessellation(count, heroSize, petalSize, gutter);
    case 12:
      return getD12Tessellation(count, heroSize, petalSize, gutter);
    case 20:
    default:
      return getD20Tessellation(count, heroSize, petalSize, gutter);
  }
}

/**
 * D6 Tessellation: 4x4 Square Grid (Image 2)
 * Exactly matches screenshot 2:
 * 12 perimeter slots (4 corners + 8 edge slots) around a central 2x2 square.
 */
function getD6Tessellation(count, heroSize, petalSize, gutter) {
  const p = petalSize + gutter;
  const cInner = Math.round(p * 0.5); // ~28px
  const cOuter = Math.round(p * 1.5); // ~84px

  // 12 Master Perimeter Slots (Image 2)
  const masterSlots = [
    // Top row
    { id: 'top-left-mid', x: -cInner, y: -cOuter, rot: 0 },
    { id: 'top-right-mid', x: +cInner, y: -cOuter, rot: 0 },
    { id: 'top-right-corner', x: +cOuter, y: -cOuter, rot: 0 },
    // Right column
    { id: 'right-upper', x: +cOuter, y: -cInner, rot: 0 },
    { id: 'right-lower', x: +cOuter, y: +cInner, rot: 0 },
    { id: 'bottom-right-corner', x: +cOuter, y: +cOuter, rot: 0 },
    // Bottom row
    { id: 'bottom-right-mid', x: +cInner, y: +cOuter, rot: 0 },
    { id: 'bottom-left-mid', x: -cInner, y: +cOuter, rot: 0 },
    { id: 'bottom-left-corner', x: -cOuter, y: +cOuter, rot: 0 },
    // Left column
    { id: 'left-lower', x: -cOuter, y: +cInner, rot: 0 },
    { id: 'left-upper', x: -cOuter, y: -cInner, rot: 0 },
    { id: 'top-left-corner', x: -cOuter, y: -cOuter, rot: 0 },
  ];

  // Symmetrical placement priority for N = 2..12
  const pickOrders = {
    2: [0, 6], // Top & Bottom
    3: [0, 4, 9], // Triangular triad
    4: [0, 1, 6, 7], // 2 Top, 2 Bottom
    5: [0, 1, 6, 7, 3], // 2 Top, 2 Bottom, 1 Right
    6: [0, 1, 6, 7, 3, 10], // 2 Top, 2 Bottom, 1 Right, 1 Left
    7: [0, 1, 6, 7, 3, 4, 10], // 2 Top, 2 Bottom, 2 Right, 1 Left
    8: [0, 1, 3, 4, 6, 7, 9, 10], // All 8 edge slots!
    9: [0, 1, 3, 4, 6, 7, 9, 10, 2], // 8 edges + 1 corner
    10: [0, 1, 3, 4, 6, 7, 9, 10, 2, 8], // 8 edges + 2 diagonal corners
    11: [0, 1, 3, 4, 6, 7, 9, 10, 2, 5, 8], // 8 edges + 3 corners
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Complete 12-slot Image 2 grid
  };

  const indices = pickOrders[Math.min(count, 12)] || Array.from({ length: Math.min(count, 12) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(cOuter * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D8 Tessellation: 4x4 Diamond/Rhombus Grid (Image 3)
 * Exactly matches screenshot 3:
 * 12 perimeter slots (4 apex corners + 8 diagonal facet diamonds).
 */
function getD8Tessellation(count, heroSize, petalSize, gutter) {
  const p = petalSize + gutter;
  const sqrt2 = Math.SQRT2;

  // Exact geometric coordinates matching screenshot 3
  const apexY = Math.round(heroSize * 0.76); // ~79px
  const apexX = Math.round(heroSize * 0.78); // ~81px
  const fX1 = Math.round(heroSize * 0.26); // ~27px
  const fY1 = Math.round(heroSize * 0.52); // ~54px
  const fX2 = Math.round(heroSize * 0.53); // ~55px
  const fY2 = Math.round(heroSize * 0.26); // ~27px

  const masterSlots = [
    // 4 Apex Corners
    { id: 'top-apex', x: 0, y: -apexY, rot: 0 },
    { id: 'right-apex', x: +apexX, y: 0, rot: 0 },
    { id: 'bottom-apex', x: 0, y: +apexY, rot: 0 },
    { id: 'left-apex', x: -apexX, y: 0, rot: 0 },

    // 8 Facet Slots (2 per diagonal facet, parallel to central diamond edges)
    // Top-Right facet
    { id: 'tr-1', x: +fX1, y: -fY1, rot: 0 },
    { id: 'tr-2', x: +fX2, y: -fY2, rot: 0 },
    // Bottom-Right facet
    { id: 'br-1', x: +fX2, y: +fY2, rot: 0 },
    { id: 'br-2', x: +fX1, y: +fY1, rot: 0 },
    // Bottom-Left facet
    { id: 'bl-1', x: -fX1, y: +fY1, rot: 0 },
    { id: 'bl-2', x: -fX2, y: +fY2, rot: 0 },
    // Top-Left facet
    { id: 'tl-1', x: -fX2, y: -fY2, rot: 0 },
    { id: 'tl-2', x: -fX1, y: -fY1, rot: 0 },
  ];

  const pickOrders = {
    2: [0, 2], // Top & Bottom apex
    3: [0, 6, 8], // 3-point diamond balance
    4: [0, 1, 2, 3], // 4 Apex corners
    5: [0, 1, 2, 3, 4],
    6: [0, 2, 4, 5, 8, 9], // Top/Bottom apex + 4 balanced facet slots
    7: [0, 1, 2, 3, 4, 6, 8],
    8: [4, 5, 6, 7, 8, 9, 10, 11], // All 8 diagonal facet slots!
    9: [4, 5, 6, 7, 8, 9, 10, 11, 0], // 8 facets + top apex
    10: [4, 5, 6, 7, 8, 9, 10, 11, 0, 2], // 8 facets + top/bottom apex
    11: [4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2],
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Complete 12-slot Image 3 diamond grid
  };

  const indices = pickOrders[Math.min(count, 12)] || Array.from({ length: Math.min(count, 12) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(apexX * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D4 Tessellation: Equilateral Triangle Tessellation (Image 1)
 * Exactly matches screenshot 1:
 * Alternating upright (rot: 0) and inverted (rot: 180) triangles stacked edge-to-edge.
 */
function getD4Tessellation(count, heroSize, petalSize, gutter) {
  // Ground-truth empirical coordinates from screenshot 1
  const scale = heroSize / 125;

  const masterSlots = [
    // Bottom row: 2 inverted triangles flush with base (rot: 180)
    { id: 'bot-inv-left', x: Math.round(-42 * scale), y: Math.round(70 * scale), rot: 180 },
    { id: 'bot-inv-right', x: Math.round(48 * scale), y: Math.round(71 * scale), rot: 180 },

    // Left flank: inverted triangle touching left facet + upright corner
    { id: 'left-flank-down', x: Math.round(-81 * scale), y: Math.round(-3 * scale), rot: 180 },
    { id: 'top-left-up', x: Math.round(-83 * scale), y: Math.round(-55 * scale), rot: 0 },

    // Right flank: inverted triangle touching right facet + upright corner
    { id: 'right-flank-down', x: Math.round(86 * scale), y: Math.round(-1 * scale), rot: 180 },
    { id: 'top-right-up', x: Math.round(86 * scale), y: Math.round(-54 * scale), rot: 0 },

    // Top grouping: 2 inverted triangles above top apex
    { id: 'top-inv-left', x: Math.round(-37 * scale), y: Math.round(-80 * scale), rot: 180 },
    { id: 'top-inv-right', x: Math.round(40 * scale), y: Math.round(-80 * scale), rot: 180 },

    // Bottom apex upright triangle
    { id: 'bottom-apex-up', x: Math.round(2 * scale), y: Math.round(102 * scale), rot: 0 },
  ];

  const pickOrders = {
    2: [0, 1], // 2 base inverted triangles
    3: [0, 2, 4], // Base, Left, Right
    4: [0, 1, 2, 4], // 2 Base, 1 Left, 1 Right
    5: [0, 1, 2, 4, 8], // 2 Base, 1 Left, 1 Right, 1 Bottom Apex
    6: [0, 1, 2, 3, 4, 5], // 2 Base, 2 Left, 2 Right
    7: [0, 1, 2, 3, 4, 5, 8], // 2 Base, 2 Left, 2 Right, 1 Bottom Apex
    8: [0, 1, 2, 3, 4, 5, 6, 7], // Base, Left, Right, Top
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Complete 9-slot Image 1 triangular composition
  };

  const indices = pickOrders[Math.min(count, 9)] || Array.from({ length: Math.min(count, 9) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(102 * scale * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D20 Tessellation: Pointy-Topped Hexagonal Honeycomb (6 Facets x 2 = 12 Slots)
 * Symmetrical honeycomb packing where 50% regular hexagons tile edge-to-edge
 * along all 6 facets of the central hero hexagon.
 */
function getD20Tessellation(count, heroSize, petalSize, gutter) {
  const W = heroSize;
  const H = Math.round(W * (2 / Math.sqrt(3))); // ~120px
  const w = petalSize;
  const h = Math.round(w * (2 / Math.sqrt(3))); // ~60px

  const xFar = Math.round(W / 2 + gutter + w / 2); // ~81px
  const yMid = Math.round(h * 0.28); // ~17px
  const xDiag1 = Math.round(W * 0.38); // ~40px
  const yDiag1 = Math.round(H * 0.62); // ~74px
  const xDiag2 = Math.round(W * 0.66); // ~69px
  const yDiag2 = Math.round(H * 0.35); // ~42px

  const masterSlots = [
    // Right vertical facet (2 slots)
    { id: 'r-upper', x: +xFar, y: -yMid, rot: 0 },
    { id: 'r-lower', x: +xFar, y: +yMid, rot: 0 },
    // Bottom-Right diagonal facet (2 slots)
    { id: 'br-1', x: +xDiag2, y: +yDiag2, rot: 0 },
    { id: 'br-2', x: +xDiag1, y: +yDiag1, rot: 0 },
    // Bottom-Left diagonal facet (2 slots)
    { id: 'bl-1', x: -xDiag1, y: +yDiag1, rot: 0 },
    { id: 'bl-2', x: -xDiag2, y: +yDiag2, rot: 0 },
    // Left vertical facet (2 slots)
    { id: 'l-lower', x: -xFar, y: +yMid, rot: 0 },
    { id: 'l-upper', x: -xFar, y: -yMid, rot: 0 },
    // Top-Left diagonal facet (2 slots)
    { id: 'tl-1', x: -xDiag2, y: -yDiag2, rot: 0 },
    { id: 'tl-2', x: -xDiag1, y: -yDiag1, rot: 0 },
    // Top-Right diagonal facet (2 slots)
    { id: 'tr-1', x: +xDiag1, y: -yDiag1, rot: 0 },
    { id: 'tr-2', x: +xDiag2, y: -yDiag2, rot: 0 },
  ];

  const pickOrders = {
    2: [0, 6], // Left & Right vertical flanks
    3: [0, 4, 8], // 120-degree honeycomb triad
    4: [2, 5, 8, 11], // 4 diagonal facets
    5: [0, 3, 5, 8, 10],
    6: [0, 2, 4, 6, 8, 10], // 1 small hexagon centered on each of the 6 facets
    7: [0, 2, 4, 6, 8, 10, 1],
    8: [2, 3, 4, 5, 8, 9, 10, 11], // 2 on each diagonal facet
    9: [0, 2, 3, 4, 5, 6, 8, 9, 10],
    10: [0, 1, 2, 4, 5, 6, 7, 8, 10, 11],
    11: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11],
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All 12 honeycomb facet slots
  };

  const indices = pickOrders[Math.min(count, 12)] || Array.from({ length: Math.min(count, 12) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(yDiag1 * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D12 Tessellation: Dodecahedral Regular Pentagon Cluster (10 Slots)
 * 5 facet docking slots + 5 vertex docking slots.
 */
function getD12Tessellation(count, heroSize, petalSize, gutter) {
  const R_facet = Math.round(heroSize * 0.72 + gutter); // ~81px
  const R_vertex = Math.round(heroSize * 0.92 + gutter); // ~102px

  const masterSlots = [];
  // 5 Facet midpoints
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / 5 + Math.PI / 5;
    masterSlots.push({
      id: `facet-${i}`,
      x: Math.round(R_facet * Math.cos(angle)),
      y: Math.round(R_facet * Math.sin(angle)),
      rot: 0,
    });
  }
  // 5 Vertices
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / 5;
    masterSlots.push({
      id: `vert-${i}`,
      x: Math.round(R_vertex * Math.cos(angle)),
      y: Math.round(R_vertex * Math.sin(angle)),
      rot: 0,
    });
  }

  const pickOrders = {
    2: [0, 2],
    3: [0, 2, 3],
    4: [0, 1, 2, 3],
    5: [0, 1, 2, 3, 4], // All 5 facets!
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 7], // 5 facets + 2 vertices (e.g. 7d12)
    8: [0, 1, 2, 3, 4, 5, 6, 7],
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // All 10 pentagonal slots
  };

  const indices = pickOrders[Math.min(count, 10)] || Array.from({ length: Math.min(count, 10) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(R_vertex * 2 + petalSize + gutter * 2);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D10 / D100 Tessellation: Pentagonal Trapezohedron Kite (10 Slots)
 * Perimeter docking slots along the 4 diagonal facets + bottom base + vertices.
 */
function getD10Tessellation(count, heroSize, petalSize, gutter) {
  const w = petalSize;
  const xSpan = Math.round(heroSize * 0.65 + gutter); // ~73px
  const yTop = Math.round(-heroSize * 0.45); // ~ -47px
  const yMid = Math.round(-heroSize * 0.1); // ~ -10px
  const yLow = Math.round(heroSize * 0.35); // ~ +36px
  const yBot = Math.round(heroSize * 0.68 + gutter); // ~ +77px

  const masterSlots = [
    // Top-Right & Right Flank
    { id: 'tr-upper', x: +Math.round(xSpan * 0.6), y: yTop, rot: 0 },
    { id: 'r-mid', x: +xSpan, y: yMid, rot: 0 },
    { id: 'r-lower', x: +Math.round(xSpan * 0.8), y: yLow, rot: 0 },
    // Bottom Base (2 slots)
    { id: 'bot-right', x: +Math.round(w * 0.55), y: yBot, rot: 0 },
    { id: 'bot-left', x: -Math.round(w * 0.55), y: yBot, rot: 0 },
    // Bottom-Left & Left Flank
    { id: 'l-lower', x: -Math.round(xSpan * 0.8), y: yLow, rot: 0 },
    { id: 'l-mid', x: -xSpan, y: yMid, rot: 0 },
    { id: 'tl-upper', x: -Math.round(xSpan * 0.6), y: yTop, rot: 0 },
    // Top Apex & Bottom Apex
    { id: 'top-apex', x: 0, y: Math.round(-heroSize * 0.8 - gutter), rot: 0 },
    { id: 'bot-apex', x: 0, y: Math.round(yBot + w * 0.5), rot: 0 },
  ];

  const pickOrders = {
    2: [1, 6], // Left & Right flanks
    3: [1, 6, 8], // Left, Right, Top Apex
    4: [0, 2, 5, 7], // 4 diagonal shoulder/flank slots
    5: [0, 2, 3, 5, 7],
    6: [0, 1, 2, 5, 6, 7], // 3 on Left, 3 on Right
    7: [0, 1, 2, 3, 5, 6, 7],
    8: [0, 1, 2, 3, 4, 5, 6, 7], // 8 perimeter slots
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // All 10 slots
  };

  const indices = pickOrders[Math.min(count, 10)] || Array.from({ length: Math.min(count, 10) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(xSpan * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}
