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
  // True equilateral triangle (side = 88, height = 88 * sqrt(3)/2 = 76.21, centered at (50, 50))
  4: 'M50 11.9 L94 88.1 L6 88.1 Z',
  // True square (side = 70, centered at (50, 50))
  6: 'M15 15 H85 V85 H15 Z',
  // True 45-degree rotated square / regular diamond (width = 88, height = 88, centered at (50, 50))
  8: 'M50 6 L94 50 L50 94 L6 50 Z',
  // True regular pentagon (circumradius R = 45, centered at (50, 50))
  10: 'M50 5 L92.8 36.1 L76.45 86.41 L23.55 86.41 L7.2 36.1 Z',
  12: 'M50 5 L92.8 36.1 L76.45 86.41 L23.55 86.41 L7.2 36.1 Z',
  // True regular pointy-topped hexagon (circumradius R = 45, centered at (50, 50))
  20: 'M50 5 L88.97 27.5 L88.97 72.5 L50 95 L11.03 72.5 L11.03 27.5 Z',
  100: 'M50 5 L92.8 36.1 L76.45 86.41 L23.55 86.41 L7.2 36.1 Z',
};

const round1 = (n) => Math.round(n * 10) / 10;

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
 * Calibrated to exact SVG square 'M15 15 H85 V85 H15 Z' (70% visible fill of viewBox 0..100):
 * 12 perimeter slots (4 corners + 8 edge slots) around a central 2x2 hero square with uniform gutters on X and Y.
 */
function getD6Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const visiblePetal = petalSize * 0.70; // 36.4px at heroSize=104
  const g = 6.5 * scale;
  const step = visiblePetal + g;
  const cInner = round1(step * 0.5); // 21.5px at heroSize=104
  const cOuter = round1(step * 1.5); // 64.4px at heroSize=104

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
 * D8 Tessellation: 4x4 Regular Diamond Grid (Image 3)
 * Calibrated to exact 88x88 regular diamond 'M50 6 L94 50 L50 94 L6 50 Z':
 * 100% symmetric on both X and Y axes (d1, d2, d3 steps identical horizontally and vertically).
 */
function getD8Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const aPetal = petalSize * 0.44; // 22.88px half-diagonal on both X and Y
  const g = 6.2 * scale;
  const delta = aPetal + g / Math.SQRT2; // 27.26px uniform diagonal lattice step

  const d1 = round1(1 * delta); // 27.3px
  const d2 = round1(2 * delta); // 54.5px
  const d3 = round1(3 * delta); // 81.8px

  const masterSlots = [
    // 4 Apex Corners (symmetric on X and Y)
    { id: 'top-apex', x: 0, y: -d3, rot: 0 },
    { id: 'right-apex', x: +d3, y: 0, rot: 0 },
    { id: 'bottom-apex', x: 0, y: +d3, rot: 0 },
    { id: 'left-apex', x: -d3, y: 0, rot: 0 },

    // 8 Facet Slots (2 per diagonal facet, strictly parallel to central diamond edges)
    // Top-Right facet
    { id: 'tr-1', x: +d1, y: -d2, rot: 0 },
    { id: 'tr-2', x: +d2, y: -d1, rot: 0 },
    // Bottom-Right facet
    { id: 'br-1', x: +d2, y: +d1, rot: 0 },
    { id: 'br-2', x: +d1, y: +d2, rot: 0 },
    // Bottom-Left facet
    { id: 'bl-1', x: -d1, y: +d2, rot: 0 },
    { id: 'bl-2', x: -d2, y: +d1, rot: 0 },
    // Top-Left facet
    { id: 'tl-1', x: -d2, y: -d1, rot: 0 },
    { id: 'tl-2', x: -d1, y: -d2, rot: 0 },
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
  const stageSize = Math.round(d3 * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D4 Tessellation: Truncated Equilateral Triangular Jewel (Image 1)
 * Calibrated to exact equilateral triangle 'M50 11.9 L94 88.1 L6 88.1 Z' centered at (50, 50):
 * All 12 adjacent edge pairs (horizontal, +60°, and -60°) have the exact same perpendicular distance g.
 */
function getD4Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const sPetal = petalSize * 0.88; // 45.76px side length
  const hPetal = sPetal * (Math.sqrt(3) / 2); // 39.63px height
  const g = 7.5 * scale; // Exact perpendicular centerline gutter on all 3 edge directions

  const xBot = round1(0.5 * sPetal + (2 / Math.sqrt(3)) * g);
  const yBot = round1(1.5 * hPetal + g);
  const xLow = round1(sPetal + (2 / Math.sqrt(3)) * g);
  const yLow = round1(0.5 * hPetal);
  const xTop = round1(0.5 * sPetal + (1 / Math.sqrt(3)) * g);
  const yTop = round1(-0.5 * hPetal - g);
  const xUp = round1(sPetal + Math.sqrt(3) * g);
  const yUp = yTop;

  const masterSlots = [
    // 0 & 1: Bottom base (2 inverted triangles with perpendicular distance g below hero base)
    { id: 'bot-inv-left', x: -xBot, y: +yBot, rot: 180 },
    { id: 'bot-inv-right', x: +xBot, y: +yBot, rot: 180 },

    // 2: Bottom apex (1 upright triangle with perpendicular distance g to both bot-inv triangles)
    { id: 'bot-apex-up', x: 0, y: +yBot, rot: 0 },

    // 3 & 4: Left flank (lower inverted + upper upright with perpendicular distance g)
    { id: 'left-flank-lower', x: -xLow, y: +yLow, rot: 180 },
    { id: 'left-flank-upper', x: -xUp, y: +yUp, rot: 0 },

    // 5 & 6: Right flank (lower inverted + upper upright with perpendicular distance g)
    { id: 'right-flank-lower', x: +xLow, y: +yLow, rot: 180 },
    { id: 'right-flank-upper', x: +xUp, y: +yUp, rot: 0 },

    // 7 & 8: Top horizontal roof (2 inverted triangles tucked in the upper V-valleys with distance g)
    { id: 'top-inv-left', x: -xTop, y: +yTop, rot: 180 },
    { id: 'top-inv-right', x: +xTop, y: +yTop, rot: 180 },
  ];

  // Symmetrical placement priority for N = 2..9
  const pickOrders = {
    2: [0, 1], // 2 base inverted triangles flush under the horizontal base
    3: [0, 1, 2], // 2 base inverted + bottom apex upright (solid downward triangular block)
    4: [0, 1, 3, 5], // 2 base + 1 lower-left + 1 lower-right (balanced cradle)
    5: [0, 1, 2, 3, 5], // 3 base + 2 lower flanks (solid cohesive block)
    6: [0, 1, 3, 4, 5, 6], // 2 base + 2 left flank + 2 right flank (full facets)
    7: [0, 1, 2, 3, 4, 5, 6], // Full facets + bottom apex
    8: [0, 1, 3, 4, 5, 6, 7, 8], // Full facets + 2 top inverted
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Complete 9-triangle Image 1 composition
  };

  const indices = pickOrders[Math.min(count, 9)] || Array.from({ length: Math.min(count, 9) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(yBot * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D20 Tessellation: Regular Pointy-Topped Hexagonal Honeycomb (Image 5)
 * Calibrated to exact regular hexagon 'M50 5 L88.97 27.5 L88.97 72.5 L50 95 L11.03 72.5 L11.03 27.5 Z':
 * Exact 6-fold rotational symmetry where all 6 inner facet hexagons lie at D_inner = 1.5*A_H + g
 * and all 6 outer valley/apex hexagons lie at D_outer = 1.75*R_H + sqrt(3)*g, making every single
 * Hero-to-petal and petal-to-petal perpendicular gutter identically equal to g.
 */
function getD20Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const rHero = heroSize * 0.45; // 46.8px circumradius
  const aHero = rHero * (Math.sqrt(3) / 2); // 40.53px apothem
  const g = 7.2 * scale; // Uniform perpendicular centerline gutter across all 18 interfaces

  const dInner = 1.5 * aHero + g; // 68.0px
  const dOuter = 1.75 * rHero + Math.sqrt(3) * g; // 94.4px

  const x0 = round1(dInner); // Flanks at 0° & 180° (68.0px)
  const x2 = round1(0.5 * dInner); // Inner facets at 60°, 120°, 240°, 300° (34.0px)
  const y2 = round1((Math.sqrt(3) / 2) * dInner); // Inner facets Y (58.9px)

  const y0 = round1(dOuter); // Apexes at 90° & 270° (94.4px)
  const x1 = round1((Math.sqrt(3) / 2) * dOuter); // Outer valleys at 30°, 150°, 210°, 330° (81.7px)
  const y1 = round1(0.5 * dOuter); // Outer valleys Y (47.2px)

  const masterSlots = [
    // 0°: Right flank (inner facet)
    { id: 'r-flank', x: +x0, y: 0, rot: 0 },
    // 30°: Bottom-Right outer
    { id: 'br-outer', x: +x1, y: +y1, rot: 0 },
    // 60°: Bottom-Right inner (inner facet)
    { id: 'br-inner', x: +x2, y: +y2, rot: 0 },
    // 90°: Bottom apex
    { id: 'b-apex', x: 0, y: +y0, rot: 0 },
    // 120°: Bottom-Left inner (inner facet)
    { id: 'bl-inner', x: -x2, y: +y2, rot: 0 },
    // 150°: Bottom-Left outer
    { id: 'bl-outer', x: -x1, y: +y1, rot: 0 },
    // 180°: Left flank (inner facet)
    { id: 'l-flank', x: -x0, y: 0, rot: 0 },
    // 210°: Top-Left outer
    { id: 'tl-outer', x: -x1, y: -y1, rot: 0 },
    // 240°: Top-Left inner (inner facet)
    { id: 'tl-inner', x: -x2, y: -y2, rot: 0 },
    // 270°: Top apex
    { id: 't-apex', x: 0, y: -y0, rot: 0 },
    // 300°: Top-Right inner (inner facet)
    { id: 'tr-inner', x: +x2, y: -y2, rot: 0 },
    // 330°: Top-Right outer
    { id: 'tr-outer', x: +x1, y: -y1, rot: 0 },
  ];

  // Symmetrical placement priority for N = 2..12 (frames all 6 inner facets first for N >= 6)
  const pickOrders = {
    2: [0, 6], // Left & Right flanks (horizontal axis)
    3: [9, 2, 4], // 120-degree honeycomb triad
    4: [2, 4, 8, 10], // 4 diagonal inner facets
    5: [2, 4, 8, 10, 9], // 4 diagonal inner facets + Top apex
    6: [0, 6, 2, 4, 8, 10], // All 6 inner facets (1 on each of the 6 hexagon edges!)
    7: [0, 6, 2, 4, 8, 10, 9], // All 6 inner facets + Top apex
    8: [0, 6, 2, 4, 8, 10, 9, 3], // All 6 inner facets + Top & Bottom apexes
    9: [0, 6, 2, 4, 8, 10, 9, 1, 5], // All 6 inner facets + 3 symmetric outer valleys
    10: [0, 6, 2, 4, 8, 10, 1, 5, 7, 11], // All 6 inner facets + 4 outer diagonal valleys
    11: [0, 6, 2, 4, 8, 10, 1, 5, 7, 11, 9], // All 6 inner facets + 5 outer valleys
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Complete 12-hexagon honeycomb rosette (Image 5)
  };

  const indices = pickOrders[Math.min(count, 12)] || Array.from({ length: Math.min(count, 12) }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(y0 * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D12 Tessellation: Dodecahedral Regular Pentagon Rosette (10 Slots, Image 4)
 * Calibrated to exact regular pentagon 'M50 5 L92.8 36.1 L76.45 86.41 L23.55 86.41 L7.2 36.1 Z':
 * Exact 5-fold (72°) rotational symmetry:
 * - 5 Inner Facet Pentagons (rot: 180) on circle D_inner = 1.5*A_H + g at 90°, 18°, -54°, -126°, 162°.
 * - 5 Outer Valley Pentagons (rot: 0) on circle D_outer at -90°, -18°, 54°, 126°, -162°.
 */
function getD12Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const rHero = heroSize * 0.45; // 46.8px circumradius
  const aHero = rHero * Math.cos(Math.PI / 5); // 37.862px apothem
  const g = 7.5 * scale;

  const dInner = 1.5 * aHero + g; // 64.3px
  const dOuter = (aHero + g + dInner * Math.cos((2 * Math.PI) / 5)) / Math.cos(Math.PI / 5) + 1.4 * scale; // 82.0px

  const rad = (deg) => (deg * Math.PI) / 180;
  const innerAngles = [90, 18, -54, -126, 162];
  const outerAngles = [-90, -18, 54, 126, -162];

  const masterSlots = [
    // 5 Inner Facet docking slots (rot: 180 -> 100% parallel and equidistant to the 5 hero edges)
    { id: 'facet-bottom', x: round1(dInner * Math.cos(rad(innerAngles[0]))), y: round1(dInner * Math.sin(rad(innerAngles[0]))), rot: 180 },
    { id: 'facet-lower-right', x: round1(dInner * Math.cos(rad(innerAngles[1]))), y: round1(dInner * Math.sin(rad(innerAngles[1]))), rot: 180 },
    { id: 'facet-upper-right', x: round1(dInner * Math.cos(rad(innerAngles[2]))), y: round1(dInner * Math.sin(rad(innerAngles[2]))), rot: 180 },
    { id: 'facet-upper-left', x: round1(dInner * Math.cos(rad(innerAngles[3]))), y: round1(dInner * Math.sin(rad(innerAngles[3]))), rot: 180 },
    { id: 'facet-lower-left', x: round1(dInner * Math.cos(rad(innerAngles[4]))), y: round1(dInner * Math.sin(rad(innerAngles[4]))), rot: 180 },

    // 5 Outer Valley docking slots (rot: 0 -> nestled symmetrically in the 5 valleys)
    { id: 'vert-top-apex', x: round1(dOuter * Math.cos(rad(outerAngles[0]))), y: round1(dOuter * Math.sin(rad(outerAngles[0]))), rot: 0 },
    { id: 'vert-upper-right', x: round1(dOuter * Math.cos(rad(outerAngles[1]))), y: round1(dOuter * Math.sin(rad(outerAngles[1]))), rot: 0 },
    { id: 'vert-lower-right', x: round1(dOuter * Math.cos(rad(outerAngles[2]))), y: round1(dOuter * Math.sin(rad(outerAngles[2]))), rot: 0 },
    { id: 'vert-lower-left', x: round1(dOuter * Math.cos(rad(outerAngles[3]))), y: round1(dOuter * Math.sin(rad(outerAngles[3]))), rot: 0 },
    { id: 'vert-upper-left', x: round1(dOuter * Math.cos(rad(outerAngles[4]))), y: round1(dOuter * Math.sin(rad(outerAngles[4]))), rot: 0 },
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
  const stageSize = Math.round(dOuter * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D10 / D100 Tessellation: Regular Pentagonal Rosette (10 Slots)
 * Uses the exact same non-warped regular 5-fold pentagonal symmetry as D12.
 */
function getD10Tessellation(count, heroSize, petalSize, gutter) {
  return getD12Tessellation(count, heroSize, petalSize, gutter);
}
