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

export const DICE_FACES = {
  4: 'M50 5 L95 90 L5 90 Z',
  6: 'M15 15 H85 V85 H15 Z',
  8: 'M50 5 L90 50 L50 95 L10 50 Z',
  10: 'M50 5 L88 35 L75 92 L25 92 L12 35 Z',
  12: 'M50 5 L93 36 L76 89 L24 89 L7 36 Z',
  20: 'M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z',
  100: 'M50 5 L88 35 L75 92 L25 92 L12 35 Z',
};

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
 * Calibrated to exact SVG path 'M15 15 H85 V85 H15 Z' (70% visible fill of viewBox 0..100):
 * 12 perimeter slots (4 corners + 8 edge slots) around a central 2x2 hero square with uniform ~4.5px gutters.
 */
function getD6Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const visiblePetal = petalSize * 0.70; // SVG square spans 15..85 (70% of box)
  const step = visiblePetal + 4.5 * scale;
  const cInner = Math.round(step * 0.5); // 20px at heroSize=104
  const cOuter = Math.round(step * 1.5); // 61px at heroSize=104

  // 12 Master Perimeter Slots (Image 2: 4x4 block grid)
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
 * Calibrated to exact SVG path 'M50 5 L90 50 L50 95 L10 50 Z' (80% width x 90% height of viewBox):
 * 12 perimeter slots (4 apex corners + 8 diagonal facet diamonds) on an exact rhombic lattice.
 */
function getD8Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;

  const apexY = Math.round(80 * scale);
  const apexX = Math.round(71 * scale);
  const fX1 = Math.round(24 * scale);
  const fY1 = Math.round(54 * scale);
  const fX2 = Math.round(48 * scale);
  const fY2 = Math.round(27 * scale);

  const masterSlots = [
    // 4 Apex Corners
    { id: 'top-apex', x: 0, y: -apexY, rot: 0 },
    { id: 'right-apex', x: +apexX, y: 0, rot: 0 },
    { id: 'bottom-apex', x: 0, y: +apexY, rot: 0 },
    { id: 'left-apex', x: -apexX, y: 0, rot: 0 },

    // 8 Facet Slots (2 per diagonal facet, strictly parallel to central diamond edges)
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
 * Calibrated to exact SVG path 'M50 5 L95 90 L5 90 Z' and (50, 50) rotation pivot:
 * 9 triangles alternating upright (rot: 0) and inverted (rot: 180),
 * stacked edge-to-edge seamlessly framing the base, flanks, and upper V-valleys.
 */
function getD4Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;

  const masterSlots = [
    // 0 & 1: Bottom base (2 inverted triangles whose top horizontal edge sits at y - 0.20*H, flush below hero base at +0.40*H)
    { id: 'bot-inv-left', x: Math.round(-28 * scale), y: Math.round(67 * scale), rot: 180 },
    { id: 'bot-inv-right', x: Math.round(+28 * scale), y: Math.round(67 * scale), rot: 180 },

    // 2: Bottom apex (1 upright triangle nestled between the two inverted base triangles, bottom edge flush at +91px)
    { id: 'bot-apex-up', x: 0, y: Math.round(71 * scale), rot: 0 },

    // 3 & 4: Left flank (lower inverted triangle + upper upright triangle flush with left hero facet)
    { id: 'left-flank-lower', x: Math.round(-52 * scale), y: Math.round(18 * scale), rot: 180 },
    { id: 'left-flank-upper', x: Math.round(-52 * scale), y: Math.round(-28 * scale), rot: 0 },

    // 5 & 6: Right flank (lower inverted triangle + upper upright triangle flush with right hero facet)
    { id: 'right-flank-lower', x: Math.round(+52 * scale), y: Math.round(18 * scale), rot: 180 },
    { id: 'right-flank-upper', x: Math.round(+52 * scale), y: Math.round(-28 * scale), rot: 0 },

    // 7 & 8: Top horizontal roof (2 inverted triangles tucked into the upper V-valleys above hero & upper flanks)
    { id: 'top-inv-left', x: Math.round(-27 * scale), y: Math.round(-36 * scale), rot: 180 },
    { id: 'top-inv-right', x: Math.round(+27 * scale), y: Math.round(-36 * scale), rot: 180 },
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
  const stageSize = Math.round(70 * scale * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D20 Tessellation: Pointy-Topped Hexagonal Honeycomb (Image 5)
 * Calibrated to exact SVG path 'M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z' (80% width x 90% height):
 * 12 perimeter regular hexagons at every 30 degrees (rot: 0) with uniform ~5px facet gutters.
 */
function getD20Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;

  const x0 = Math.round(68 * scale); // Flank distance (0° & 180°)
  const y0 = Math.round(93 * scale); // Apex distance (90° & 270°)
  const x1 = Math.round(82 * scale); // Facet-outer X (30°, 150°, 210°, 330°)
  const y1 = Math.round(47 * scale); // Facet-outer Y
  const x2 = Math.round(35 * scale); // Facet-inner X (60°, 120°, 240°, 300°)
  const y2 = Math.round(57 * scale); // Facet-inner Y

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
 * D12 Tessellation: Dodecahedral Regular Pentagon Rosette (10 Slots, Image 4)
 * Calibrated to exact SVG path 'M50 5 L93 36 L76 89 L24 89 L7 36 Z' and (50, 50) pivot:
 * - 5 Inner Facet Pentagons are inverted (rot: 180) so their 5 edges are 100% parallel and flush
 *   with the 5 edges of the upright central hero pentagon (C_inner = 1.5 * M_k + g * n_k).
 * - 5 Outer Valley Pentagons are upright (rot: 0), nestled seamlessly into the 5 V-valleys
 *   between adjacent inverted inner pentagons with parallel edges on both sides.
 */
function getD12Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;

  const masterSlots = [
    // 5 Inner Facet docking slots (rot: 180 -> flat edges flush against the 5 hero edges)
    { id: 'facet-bottom', x: 0, y: Math.round(65 * scale), rot: 180 },
    { id: 'facet-lower-right', x: Math.round(+58 * scale), y: Math.round(+21 * scale), rot: 180 },
    { id: 'facet-upper-right', x: Math.round(+36 * scale), y: Math.round(-50 * scale), rot: 180 },
    { id: 'facet-upper-left', x: Math.round(-36 * scale), y: Math.round(-50 * scale), rot: 180 },
    { id: 'facet-lower-left', x: Math.round(-58 * scale), y: Math.round(+21 * scale), rot: 180 },

    // 5 Outer Valley docking slots (rot: 0 -> nestled in the 5 valleys between the inner pentagons)
    { id: 'vert-top-apex', x: 0, y: Math.round(-76 * scale), rot: 0 },
    { id: 'vert-upper-right', x: Math.round(+73 * scale), y: Math.round(-24 * scale), rot: 0 },
    { id: 'vert-lower-right', x: Math.round(+44 * scale), y: Math.round(+63 * scale), rot: 0 },
    { id: 'vert-lower-left', x: Math.round(-44 * scale), y: Math.round(+63 * scale), rot: 0 },
    { id: 'vert-upper-left', x: Math.round(-73 * scale), y: Math.round(-24 * scale), rot: 0 },
  ];

  const pickOrders = {
    2: [3, 2], // Upper-left & Upper-right facets
    3: [0, 3, 2], // Bottom, Upper-left, Upper-right facets
    4: [1, 2, 3, 4], // 4 side facets
    5: [0, 1, 2, 3, 4], // All 5 inner inverted facets!
    6: [0, 1, 2, 3, 4, 5], // 5 inner facets + Top outer valley
    7: [0, 1, 2, 3, 4, 7, 8], // 5 inner facets + 2 bottom outer valleys
    8: [0, 1, 2, 3, 4, 5, 7, 8],
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // Complete 10-pentagon Image 4 rosette
  };

  const indices = pickOrders[Math.min(count, 10)] || Array.from({ length: Math.min(count, 10) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(76 * scale * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D10 / D100 Tessellation: Pentagonal Trapezohedron Kite Rosette (10 Slots)
 * Calibrated to exact SVG path 'M50 5 L88 38 L72 92 L28 92 L12 38 Z' and (50, 50) pivot:
 * - 5 Inner Facet Kites at rot: 180 (edges 100% parallel and flush with the 5 hero kite edges).
 * - 5 Outer Valley Kites at rot: 0 (nestled in the 5 valleys between the inner kites).
 */
function getD10Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;

  const masterSlots = [
    // 5 Inner Facet docking slots (rot: 180 -> parallel to the 5 hero kite edges)
    { id: 'facet-bottom', x: 0, y: Math.round(70 * scale), rot: 180 },
    { id: 'facet-lower-right', x: Math.round(+54 * scale), y: Math.round(+22 * scale), rot: 180 },
    { id: 'facet-upper-right', x: Math.round(+32 * scale), y: Math.round(-50 * scale), rot: 180 },
    { id: 'facet-upper-left', x: Math.round(-32 * scale), y: Math.round(-50 * scale), rot: 180 },
    { id: 'facet-lower-left', x: Math.round(-54 * scale), y: Math.round(+22 * scale), rot: 180 },

    // 5 Outer Valley docking slots (rot: 0 -> nestled between the inner kites)
    { id: 'vert-top-apex', x: 0, y: Math.round(-86 * scale), rot: 0 },
    { id: 'vert-upper-right', x: Math.round(+68 * scale), y: Math.round(-26 * scale), rot: 0 },
    { id: 'vert-lower-right', x: Math.round(+39 * scale), y: Math.round(+63 * scale), rot: 0 },
    { id: 'vert-lower-left', x: Math.round(-39 * scale), y: Math.round(+63 * scale), rot: 0 },
    { id: 'vert-upper-left', x: Math.round(-68 * scale), y: Math.round(-26 * scale), rot: 0 },
  ];

  const pickOrders = {
    2: [3, 2], // Upper-left & Upper-right facets
    3: [0, 3, 2], // Bottom + 2 upper facets
    4: [1, 2, 3, 4], // 4 side facets
    5: [0, 1, 2, 3, 4], // All 5 inner inverted facets!
    6: [0, 1, 2, 3, 4, 5], // 5 inner facets + Top apex
    7: [0, 1, 2, 3, 4, 7, 8], // 5 inner facets + 2 bottom outer valleys
    8: [0, 1, 2, 3, 4, 5, 7, 8],
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // All 10 slots
  };

  const indices = pickOrders[Math.min(count, 10)] || Array.from({ length: Math.min(count, 10) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(86 * scale * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}
