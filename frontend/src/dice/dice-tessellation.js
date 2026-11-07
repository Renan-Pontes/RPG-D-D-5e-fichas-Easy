/**
 * dice-tessellation.js
 *
 * Geometric Tessellation Layout Engine for Multi-Dice Rolls.
 *
 * Each polyhedral dice type (D4, D6, D8, D10, D12, D20, D100) has an authentic geometric
 * tessellation pattern where constituent dice are reduced to strictly 50% scale
 * and stacked side-to-side along the facets and corners of the central hero die
 * like interlocking geometric blocks with uniform gutters.
 *
 * - D4: Truncated triangular jewel of 9 equilateral triangles (Image 1):
 *       alternating upright (rot: 0) and inverted (rot: 180) triangles framing the facets and base.
 * - D6: 4x4 perimeter square grid of 12 squares (Image 2) around a central 2x2 hero square.
 * - D8: 4x4 diamond/rhombus grid of 12 diamonds (Image 3) around a central 2x2 hero diamond.
 * - D20: Regular pointy-topped hexagonal honeycomb of 12 hexagons (Image 5) at every 30 degrees.
 * - D12: Dodecahedral regular pentagonal rosette of 10 pentagons (5 facet edges + 5 vertex corners).
 * - D10/D100: Pentagonal trapezohedron kite perimeter of 10 kites (shoulders, diagonals, base, apexes).
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
 * D6 Tessellation: 4x4 Modular Square Grid (Image 2)
 * Exactly matches screenshot 2:
 * 12 perimeter slots (4 corners + 8 edge slots) around a central 2x2 hero square.
 */
function getD6Tessellation(count, heroSize, petalSize, gutter) {
  const S = petalSize + gutter; // Modular cell step (e.g. 58px)
  const cInner = Math.round(S * 0.5); // ~29px
  const cOuter = Math.round(S * 1.5); // ~87px

  // 12 Master Perimeter Slots (Image 2: exactly 4 columns and 4 rows)
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
    3: [0, 4, 9], // Symmetrical triangular triad
    4: [0, 1, 6, 7], // 2 Top edge, 2 Bottom edge
    5: [0, 1, 6, 7, 3], // 2 Top, 2 Bottom, 1 Right
    6: [0, 1, 6, 7, 3, 10], // 2 Top, 2 Bottom, 1 Right, 1 Left (6 flush edges)
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
  const scale = heroSize / 104;

  const apexY = Math.round(88 * scale);
  const apexX = Math.round(80 * scale);
  const fX1 = Math.round(27 * scale);
  const fY1 = Math.round(59 * scale);
  const fX2 = Math.round(54 * scale);
  const fY2 = Math.round(29 * scale);

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
    3: [0, 7, 8], // 3-point diamond balance
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
  const stageSize = Math.round(apexY * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D4 Tessellation: Truncated Triangular Jewel (Image 1)
 * Exactly matches screenshot 1:
 * 9 equilateral triangles alternating upright (rot: 0) and inverted (rot: 180),
 * stacked edge-to-edge seamlessly framing the base, flanks, and apex of the central triangle.
 */
function getD4Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;

  const masterSlots = [
    // 0 & 1: Bottom base (2 inverted triangles flush against base with uniform gutter)
    { id: 'bot-inv-left', x: Math.round(-23 * scale), y: Math.round(56 * scale), rot: 180 },
    { id: 'bot-inv-right', x: Math.round(+23 * scale), y: Math.round(56 * scale), rot: 180 },

    // 2: Bottom apex (1 upright triangle fitting nestled between the two inverted base triangles)
    { id: 'bot-apex-up', x: 0, y: Math.round(82 * scale), rot: 0 },

    // 3 & 4: Left flank (lower inverted triangle + upper upright triangle flush with left facet)
    { id: 'left-flank-lower', x: Math.round(-48 * scale), y: Math.round(16 * scale), rot: 180 },
    { id: 'left-flank-upper', x: Math.round(-51 * scale), y: Math.round(-30 * scale), rot: 0 },

    // 5 & 6: Right flank (lower inverted triangle + upper upright triangle flush with right facet)
    { id: 'right-flank-lower', x: Math.round(+48 * scale), y: Math.round(16 * scale), rot: 180 },
    { id: 'right-flank-upper', x: Math.round(+51 * scale), y: Math.round(-30 * scale), rot: 0 },

    // 7 & 8: Top horizontal roof (2 inverted triangles above top apex)
    { id: 'top-inv-left', x: Math.round(-23 * scale), y: Math.round(-56 * scale), rot: 180 },
    { id: 'top-inv-right', x: Math.round(+23 * scale), y: Math.round(-56 * scale), rot: 180 },
  ];

  // Symmetrical placement priority for N = 2..9
  const pickOrders = {
    2: [0, 1], // 2 base inverted triangles flush under the horizontal base
    3: [0, 1, 2], // 2 base inverted + bottom apex upright (solid downward triangular block)
    4: [0, 1, 3, 5], // 2 base + 1 lower-left + 1 lower-right (balanced cradle)
    5: [0, 1, 2, 3, 5], // 2 base + bottom apex + 2 lower flanks (solid cohesive block)
    6: [0, 1, 3, 4, 5, 6], // 2 base + 2 left flank + 2 right flank (full facets)
    7: [0, 1, 2, 3, 4, 5, 6], // Full facets + bottom apex
    8: [0, 1, 3, 4, 5, 6, 7, 8], // Full facets + 2 top inverted
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Complete 9-triangle Image 1 composition
  };

  const indices = pickOrders[Math.min(count, 9)] || Array.from({ length: Math.min(count, 9) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(82 * scale * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D20 Tessellation: Pointy-Topped Hexagonal Honeycomb (Image 5)
 * Exactly matches screenshot 5:
 * 12 perimeter regular hexagons at every 30 degrees (rot: 0)
 * forming the outer ring of a regular radius-2 honeycomb rosette.
 */
function getD20Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;

  const x0 = Math.round(88 * scale);  // Flank distance (0° & 180°)
  const y0 = Math.round(102 * scale); // Apex distance (90° & 270°)
  const x1 = Math.round(88 * scale);  // Facet-outer X (30°, 150°, 210°, 330°)
  const y1 = Math.round(51 * scale);  // Facet-outer Y
  const x2 = Math.round(44 * scale);  // Facet-inner X (60°, 120°, 240°, 300°)
  const y2 = Math.round(74 * scale);  // Facet-inner Y

  const masterSlots = [
    // 0°: Right flank
    { id: 'r-flank', x: +x0, y: 0, rot: 0 },
    // 30°: Bottom-Right outer
    { id: 'br-outer', x: +x1, y: +y1, rot: 0 },
    // 60°: Bottom-Right inner (touching hero facet)
    { id: 'br-inner', x: +x2, y: +y2, rot: 0 },
    // 90°: Bottom apex
    { id: 'b-apex', x: 0, y: +y0, rot: 0 },
    // 120°: Bottom-Left inner (touching hero facet)
    { id: 'bl-inner', x: -x2, y: +y2, rot: 0 },
    // 150°: Bottom-Left outer
    { id: 'bl-outer', x: -x1, y: +y1, rot: 0 },
    // 180°: Left flank
    { id: 'l-flank', x: -x0, y: 0, rot: 0 },
    // 210°: Top-Left outer
    { id: 'tl-outer', x: -x1, y: -y1, rot: 0 },
    // 240°: Top-Left inner (touching hero facet)
    { id: 'tl-inner', x: -x2, y: -y2, rot: 0 },
    // 270°: Top apex
    { id: 't-apex', x: 0, y: -y0, rot: 0 },
    // 300°: Top-Right inner (touching hero facet)
    { id: 'tr-inner', x: +x2, y: -y2, rot: 0 },
    // 330°: Top-Right outer
    { id: 'tr-outer', x: +x1, y: -y1, rot: 0 },
  ];

  // Symmetrical placement priority for N = 2..12
  const pickOrders = {
    2: [0, 6], // Left & Right flanks (horizontal axis)
    3: [9, 2, 4], // 120-degree honeycomb triad (Top apex, Bottom-Right, Bottom-Left)
    4: [2, 4, 8, 10], // 4 Facet-inner slots flush against the 4 diagonal facets
    5: [2, 4, 8, 10, 9], // 4 diagonal facets + Top apex
    6: [0, 6, 2, 4, 8, 10], // 1 small hexagon centered on each of the 6 sides
    7: [0, 6, 2, 4, 8, 10, 9], // 6 sides + Top apex
    8: [2, 4, 8, 10, 1, 5, 7, 11], // All 8 diagonal facet positions
    9: [2, 4, 8, 10, 1, 5, 7, 11, 9], // 8 diagonals + Top apex
    10: [2, 4, 8, 10, 1, 5, 7, 11, 9, 3], // 8 diagonals + Top & Bottom apexes
    11: [2, 4, 8, 10, 1, 5, 7, 11, 9, 3, 0], // 8 diagonals + Top & Bottom apexes + Right flank
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All 12 honeycomb slots (Image 5)
  };

  const indices = pickOrders[Math.min(count, 12)] || Array.from({ length: Math.min(count, 12) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(y0 * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D12 Tessellation: Dodecahedral Regular Pentagon Rosette (10 Slots)
 * 5 facet docking slots + 5 vertex docking slots.
 */
function getD12Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const rFacet = Math.round(72 * scale);
  const rVert = Math.round(94 * scale);

  const masterSlots = [
    // 5 Facet docking slots (perpendicular to the 5 edges of the central pentagon)
    { id: 'facet-bottom', x: 0, y: +rFacet, rot: 0 },
    { id: 'facet-lower-right', x: Math.round(+rFacet * 0.95), y: Math.round(+rFacet * 0.31), rot: 0 },
    { id: 'facet-upper-right', x: Math.round(+rFacet * 0.59), y: Math.round(-rFacet * 0.81), rot: 0 },
    { id: 'facet-upper-left', x: Math.round(-rFacet * 0.59), y: Math.round(-rFacet * 0.81), rot: 0 },
    { id: 'facet-lower-left', x: Math.round(-rFacet * 0.95), y: Math.round(+rFacet * 0.31), rot: 0 },

    // 5 Vertex docking slots (extending outwards from the 5 corners)
    { id: 'vert-top-apex', x: 0, y: -rVert, rot: 0 },
    { id: 'vert-upper-right', x: Math.round(+rVert * 0.95), y: Math.round(-rVert * 0.31), rot: 0 },
    { id: 'vert-lower-right', x: Math.round(+rVert * 0.59), y: Math.round(+rVert * 0.81), rot: 0 },
    { id: 'vert-lower-left', x: Math.round(-rVert * 0.59), y: Math.round(+rVert * 0.81), rot: 0 },
    { id: 'vert-upper-left', x: Math.round(-rVert * 0.95), y: Math.round(-rVert * 0.31), rot: 0 },
  ];

  const pickOrders = {
    2: [3, 2], // Upper-left & Upper-right facets
    3: [5, 4, 1], // Top vertex, Lower-left facet, Lower-right facet (triad)
    4: [1, 2, 3, 4], // 4 side facets
    5: [0, 1, 2, 3, 4], // All 5 facets! (Forms a regular 5-pointed flower)
    6: [0, 1, 2, 3, 4, 5], // 5 facets + Top apex
    7: [0, 1, 2, 3, 4, 5, 7], // 5 facets + 2 vertices (e.g. 7d12)
    8: [0, 1, 2, 3, 4, 5, 7, 8],
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // All 10 pentagonal slots
  };

  const indices = pickOrders[Math.min(count, 10)] || Array.from({ length: Math.min(count, 10) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(rVert * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D10 / D100 Tessellation: Pentagonal Trapezohedron Kite (10 Slots)
 * Perimeter docking slots along shoulders, diagonals, base, and apexes.
 */
function getD10Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const xSpan = Math.round(70 * scale);
  const yTop = Math.round(-46 * scale);
  const yMid = Math.round(-8 * scale);
  const yLow = Math.round(38 * scale);
  const yBot = Math.round(76 * scale);

  const masterSlots = [
    // Top-Right & Right Flank
    { id: 'tr-upper', x: Math.round(xSpan * 0.6), y: yTop, rot: 0 },
    { id: 'r-mid', x: +xSpan, y: yMid, rot: 0 },
    { id: 'r-lower', x: Math.round(xSpan * 0.8), y: yLow, rot: 0 },
    // Bottom Base (2 slots)
    { id: 'bot-right', x: Math.round(24 * scale), y: yBot, rot: 0 },
    { id: 'bot-left', x: Math.round(-24 * scale), y: yBot, rot: 0 },
    // Bottom-Left & Left Flank
    { id: 'l-lower', x: Math.round(-xSpan * 0.8), y: yLow, rot: 0 },
    { id: 'l-mid', x: -xSpan, y: yMid, rot: 0 },
    { id: 'tl-upper', x: Math.round(-xSpan * 0.6), y: yTop, rot: 0 },
    // Top Apex & Bottom Apex
    { id: 'top-apex', x: 0, y: Math.round(-84 * scale), rot: 0 },
    { id: 'bot-apex', x: 0, y: Math.round(104 * scale), rot: 0 },
  ];

  const pickOrders = {
    2: [1, 6], // Left & Right flanks
    3: [1, 6, 8], // Left, Right, Top Apex
    4: [0, 2, 5, 7], // 4 diagonal shoulder/flank slots
    5: [0, 2, 5, 7, 8], // 4 diagonals + Top apex
    6: [0, 1, 2, 5, 6, 7], // 3 on Left, 3 on Right
    7: [0, 1, 2, 5, 6, 7, 8], // 3 on Left, 3 on Right + Top apex
    8: [0, 1, 2, 3, 4, 5, 6, 7], // 8 perimeter slots
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // All 10 slots
  };

  const indices = pickOrders[Math.min(count, 10)] || Array.from({ length: Math.min(count, 10) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(104 * scale * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}
