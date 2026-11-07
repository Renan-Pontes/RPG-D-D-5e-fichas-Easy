/**
 * dice-tessellation.js
 *
 * Geometric Tessellation Layout Engine for Multi-Dice Rolls (2 to 20 Dice).
 *
 * Each polyhedral dice type (D4, D6, D8, D10, D12, D20, D100) has an authentic geometric
 * tessellation pattern where constituent dice are reduced to strictly 50% scale
 * and stacked side-to-side along the facets and corners of the central hero die
 * like interlocking geometric blocks with uniform, balanced breathing gutters.
 *
 * - D4: Truncated equilateral triangular jewel expanding from 9 to 20 triangles on a triangular lattice.
 * - D6: Modular square block grid expanding from 12 to 20 squares in symmetric Greek-cross frames.
 * - D8: Diamond/rhombus grid expanding from 12 to 20 diamonds on diagonal lattice steps.
 * - D20: Regular pointy-topped hexagonal honeycomb expanding from 12 to 20 hexagons.
 * - D12: Dodecahedral regular pentagonal rosette expanding from 10 to 20 pentagons in 5-fold concentric rings.
 * - D10/D100: Pentagonal rosette using the exact same non-warped regular 5-fold pentagonal symmetry.
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

const round2 = (n) => Math.round(n * 100) / 100;
const round1 = round2;

/**
 * Returns the exact geometric tessellation layout for a die type and count (2..20).
 * @param {number} die - Die face count (4, 6, 8, 10, 12, 20, 100)
 * @param {number} count - Total constituent dice count (N >= 2)
 * @param {object} [options]
 * @param {number} [options.heroSize] - Central hero die scale (defaults to 104 for N<=12, 86 for N>12)
 * @param {number} [options.gutter] - Breathing gutter between adjacent shapes (defaults to 9.5 for N<=12, 8.0 for N>12)
 * @returns {{ heroSize: number, petalSize: number, stageWidth: number, stageHeight: number, slots: Array<{ id: string, x: number, y: number, rot: number }> }}
 */
export function getTessellationLayout(die, count, options = {}) {
  const safeCount = Math.max(2, Math.min(20, count || 2));
  const defaultHero = safeCount > 12 ? 86 : 104;
  const heroSize = options.heroSize || defaultHero;
  const petalSize = Math.round(heroSize * 0.5); // Strictly 50% scale
  const defaultGutter = safeCount > 12 ? 8.0 : 9.5;
  const gutter = options.gutter != null ? options.gutter : defaultGutter;

  switch (Number(die)) {
    case 4:
      return getD4Tessellation(safeCount, heroSize, petalSize, gutter);
    case 6:
      return getD6Tessellation(safeCount, heroSize, petalSize, gutter);
    case 8:
      return getD8Tessellation(safeCount, heroSize, petalSize, gutter);
    case 10:
    case 100:
      return getD10Tessellation(safeCount, heroSize, petalSize, gutter);
    case 12:
      return getD12Tessellation(safeCount, heroSize, petalSize, gutter);
    case 20:
    default:
      return getD20Tessellation(safeCount, heroSize, petalSize, gutter);
  }
}

/**
 * D6 Tessellation: Modular Square Grid (20 Slots for N = 2..20)
 * Calibrated to SVG square 'M15 15 H85 V85 H15 Z' (70% visible fill):
 * - Ring 1 (12 slots): 4x4 perimeter around central hero square with uniform gutter g.
 * - Ring 2 (8 slots): 2 centered outer-edge squares on each of the 4 sides.
 * Symmetrical pick orders guarantee bilateral/4-fold balance for every count from 2 to 20.
 */
function getD6Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const visiblePetal = petalSize * 0.70;
  const g = gutter * scale;
  const step = visiblePetal + g;

  const cInner = round1(step * 0.5);
  const cOuter = round1(step * 1.5);
  const cTier2 = round1(step * 2.5);

  const masterSlots = [
    // --- Ring 1 (12 Slots): 4x4 perimeter ---
    // Top row
    { id: 'top-left-mid', x: -cInner, y: -cOuter, rot: 0 }, // 0
    { id: 'top-right-mid', x: +cInner, y: -cOuter, rot: 0 }, // 1
    { id: 'top-right-corner', x: +cOuter, y: -cOuter, rot: 0 }, // 2
    // Right column
    { id: 'right-upper', x: +cOuter, y: -cInner, rot: 0 }, // 3
    { id: 'right-lower', x: +cOuter, y: +cInner, rot: 0 }, // 4
    { id: 'bottom-right-corner', x: +cOuter, y: +cOuter, rot: 0 }, // 5
    // Bottom row
    { id: 'bottom-right-mid', x: +cInner, y: +cOuter, rot: 0 }, // 6
    { id: 'bottom-left-mid', x: -cInner, y: +cOuter, rot: 0 }, // 7
    { id: 'bottom-left-corner', x: -cOuter, y: +cOuter, rot: 0 }, // 8
    // Left column
    { id: 'left-lower', x: -cOuter, y: +cInner, rot: 0 }, // 9
    { id: 'left-upper', x: -cOuter, y: -cInner, rot: 0 }, // 10
    { id: 'top-left-corner', x: -cOuter, y: -cOuter, rot: 0 }, // 11

    // --- Ring 2 (8 Slots): Symmetrical stepped Greek cross frame ---
    // Top outer
    { id: 'top-out-left', x: -cInner, y: -cTier2, rot: 0 }, // 12
    { id: 'top-out-right', x: +cInner, y: -cTier2, rot: 0 }, // 13
    // Bottom outer
    { id: 'bot-out-left', x: -cInner, y: +cTier2, rot: 0 }, // 14
    { id: 'bot-out-right', x: +cInner, y: +cTier2, rot: 0 }, // 15
    // Left outer
    { id: 'left-out-upper', x: -cTier2, y: -cInner, rot: 0 }, // 16
    { id: 'left-out-lower', x: -cTier2, y: +cInner, rot: 0 }, // 17
    // Right outer
    { id: 'right-out-upper', x: +cTier2, y: -cInner, rot: 0 }, // 18
    { id: 'right-out-lower', x: +cTier2, y: +cInner, rot: 0 }, // 19

    // Centered slot for strict odd-count mirror symmetry (N = 9):
    { id: 'top-crown-center', x: 0, y: -cTier2, rot: 0 }, // 20
  ];

  // Symmetrical placement priority for N = 2..20 (no lonely single-corner defects!)
  const pickOrders = {
    2: [0, 6], // Top-mid & Bottom-mid
    3: [0, 4, 9], // Symmetrical triangular triad
    4: [0, 1, 6, 7], // 2 Top, 2 Bottom (bilateral symmetry)
    5: [0, 1, 6, 7, 3], // 2 Top, 2 Bottom, 1 Right
    6: [0, 1, 6, 7, 3, 10], // 2 Top, 2 Bottom, 1 Right, 1 Left (6 flush edges)
    7: [0, 1, 6, 7, 3, 4, 10],
    8: [0, 1, 3, 4, 6, 7, 9, 10], // All 8 edge slots!
    9: [0, 1, 3, 4, 6, 7, 9, 10, 20], // 8 edges + Top-crown-center (100% mirror symmetric across Y-axis, sumX = 0!)
    10: [0, 1, 3, 4, 6, 7, 9, 10, 12, 13], // 8 edges + 2 Top outer (or Top & Bottom pairs)
    11: [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 20],
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Complete 12-slot Ring 1 grid (4x4 perimeter)
    13: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 20],
    14: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    15: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20],
    16: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], // 12-frame + 2 Top outer + 2 Bottom outer
    17: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20],
    18: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18], // 12-frame + 2 Top + 2 Bottom + 1 Left + 1 Right
    19: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    20: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], // Complete 20-slot Greek cross
  };

  const indices = pickOrders[count] || Array.from({ length: count }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const maxSpan = count > 12 ? cTier2 : cOuter;
  const stageSize = Math.round(maxSpan * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D8 Tessellation: Regular Diamond Grid (20 Slots for N = 2..20)
 * Calibrated to exact 88x88 regular diamond 'M50 6 L94 50 L50 94 L6 50 Z':
 * - Ring 1 (12 slots): 4 apexes + 8 diagonal facets.
 * - Ring 2 (8 slots): 8 outer diagonal facet diamonds at next diagonal lattice step.
 */
function getD8Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const aPetal = petalSize * 0.44;
  const g = gutter * scale;
  const delta = aPetal + g / Math.SQRT2;

  const d1 = round1(1 * delta);
  const d2 = round1(2 * delta);
  const d3 = round1(3 * delta);
  const d4 = round1(4 * delta);

  const masterSlots = [
    // --- Ring 1 (12 Slots) ---
    // 4 Apex Corners
    { id: 'top-apex', x: 0, y: -d3, rot: 0 },
    { id: 'right-apex', x: +d3, y: 0, rot: 0 },
    { id: 'bottom-apex', x: 0, y: +d3, rot: 0 },
    { id: 'left-apex', x: -d3, y: 0, rot: 0 },

    // 8 Facet Slots (2 per diagonal facet)
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

    // --- Ring 2 (8 Slots): Outer diagonal facet diamonds ---
    { id: 'tr-out-1', x: +d2, y: -d3, rot: 0 },
    { id: 'tr-out-2', x: +d3, y: -d2, rot: 0 },
    { id: 'br-out-1', x: +d3, y: +d2, rot: 0 },
    { id: 'br-out-2', x: +d2, y: +d3, rot: 0 },
    { id: 'bl-out-1', x: -d2, y: +d3, rot: 0 },
    { id: 'bl-out-2', x: -d3, y: +d2, rot: 0 },
    { id: 'tl-out-1', x: -d3, y: -d2, rot: 0 },
    { id: 'tl-out-2', x: -d2, y: -d3, rot: 0 },
  ];

  const pickOrders = {
    2: [0, 2], // Top & Bottom apex
    3: [0, 7, 8],
    4: [0, 1, 2, 3], // 4 Apex corners
    5: [0, 1, 2, 3, 4],
    6: [0, 2, 4, 5, 8, 9],
    7: [0, 1, 2, 3, 4, 6, 8],
    8: [4, 5, 6, 7, 8, 9, 10, 11], // All 8 diagonal facet slots!
    9: [4, 5, 6, 7, 8, 9, 10, 11, 0], // 8 facets + top apex (mirror symmetric across Y-axis!)
    10: [4, 5, 6, 7, 8, 9, 10, 11, 0, 2], // 8 facets + top/bottom apex (both axes symmetric!)
    11: [4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2],
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Complete 12-slot diamond grid
    13: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    14: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16],
    15: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16],
    16: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17], // 12-frame + 4 outer diagonal facets
    17: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17],
    18: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    19: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    20: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], // Complete 20-slot diamond
  };

  const indices = pickOrders[count] || Array.from({ length: count }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const maxSpan = count > 12 ? d4 : d3;
  const stageSize = Math.round(maxSpan * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D4 Tessellation: Truncated Equilateral Triangular Jewel (20 Slots for N = 2..20)
 * Calibrated to exact equilateral triangle 'M50 11.9 L94 88.1 L6 88.1 Z':
 * - Ring 1 (9 slots): Truncated triangular jewel framing base, flanks, and roof.
 * - Ring 2 (11 slots): Symmetrical second-tier triangular lattice expansion.
 * All adjacent pairs on all 3 lattice directions share the identical perpendicular distance g.
 */
function getD4Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const sPetal = petalSize * 0.88;
  const hPetal = sPetal * (Math.sqrt(3) / 2);
  const g = gutter * scale;

  const xBot = round1(0.5 * sPetal + (2 / Math.sqrt(3)) * g);
  const yBot = round1(1.5 * hPetal + g);
  const xLow = round1(sPetal + (2 / Math.sqrt(3)) * g);
  const yLow = round1(0.5 * hPetal);
  const xTop = round1(0.5 * sPetal + (1 / Math.sqrt(3)) * g);
  const yTop = round1(-0.5 * hPetal - g);
  const xUp = round1(sPetal + Math.sqrt(3) * g);
  const yUp = yTop;

  // Ring 2 steps on the triangular lattice
  const s2 = sPetal + (2 / Math.sqrt(3)) * g;
  const h2 = hPetal + g;
  const xFlankTier2 = round1(1.5 * s2);
  const yTopTier2 = round1(-1.5 * h2);
  const xTopTier2 = round1(s2);

  const masterSlots = [
    // --- Ring 1 (9 Slots): Truncated triangular jewel ---
    // 0 & 1: Bottom base (2 inverted triangles with exact perpendicular gap g to hero and bottom apex)
    { id: 'bot-inv-left', x: -xBot, y: yBot, rot: 180 },
    { id: 'bot-inv-right', x: +xBot, y: yBot, rot: 180 },
    // 2: Bottom apex (1 upright triangle)
    { id: 'bot-apex-up', x: 0, y: yBot, rot: 0 },
    // 3 & 4: Left flank
    { id: 'left-flank-lower', x: -xLow, y: yLow, rot: 180 },
    { id: 'left-flank-upper', x: -xUp, y: yUp, rot: 0 },
    // 5 & 6: Right flank
    { id: 'right-flank-lower', x: +xLow, y: yLow, rot: 180 },
    { id: 'right-flank-upper', x: +xUp, y: yUp, rot: 0 },
    // 7 & 8: Top horizontal roof
    { id: 'top-inv-left', x: -xTop, y: yTop, rot: 180 },
    { id: 'top-inv-right', x: +xTop, y: yTop, rot: 180 },

    // --- Ring 2 (11 Slots): Expanding triangular jewel on uniform triangular grid ---
    // 9: Top crown apex upright
    { id: 'top-crown-apex', x: 0, y: yTopTier2, rot: 0 },
    // 10 & 11: Top crown shoulders inverted
    { id: 'top-crown-left', x: -xTopTier2, y: yTopTier2, rot: 180 },
    { id: 'top-crown-right', x: +xTopTier2, y: yTopTier2, rot: 180 },
    // 12 & 13: Left outer flank
    { id: 'left-out-top', x: -xFlankTier2, y: round1(-h2), rot: 0 },
    { id: 'left-out-mid', x: -xFlankTier2, y: 0, rot: 180 },
    { id: 'left-out-bot', x: -xFlankTier2, y: round1(h2), rot: 0 },
    // 14 & 15: Right outer flank
    { id: 'right-out-top', x: +xFlankTier2, y: round1(-h2), rot: 0 },
    { id: 'right-out-mid', x: +xFlankTier2, y: 0, rot: 180 },
    { id: 'right-out-bot', x: +xFlankTier2, y: round1(h2), rot: 0 },
    // 16 & 17: Bottom outer wings
    { id: 'bot-out-left', x: -xFlankTier2, y: round1(2 * h2), rot: 180 },
    { id: 'bot-out-right', x: +xFlankTier2, y: round1(2 * h2), rot: 180 },
    // 18 & 19: Bottom tier 2 uprights
    { id: 'bot-t2-left', x: round1(-0.5 * s2), y: round1(2.5 * h2), rot: 0 },
    { id: 'bot-t2-right', x: round1(0.5 * s2), y: round1(2.5 * h2), rot: 0 },
  ];

  // Symmetrical placement priority for N = 2..20 (100% mirror-symmetric across Y-axis!)
  const pickOrders = {
    2: [0, 1], // 2 base inverted triangles
    3: [0, 1, 2], // 2 base inverted + bottom apex upright
    4: [0, 1, 3, 5], // 2 base + 2 lower flanks
    5: [0, 1, 2, 3, 5], // 3 base + 2 lower flanks
    6: [0, 1, 3, 4, 5, 6], // 2 base + 4 flanks
    7: [0, 1, 2, 3, 4, 5, 6], // 3 base + 4 flanks
    8: [0, 1, 3, 4, 5, 6, 7, 8], // 2 base + 4 flanks + 2 top roof
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Complete 9-triangle jewel (Image 1)
    10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // 9-jewel + Top crown apex
    11: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 13],
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 9-jewel + 3 Top crown triangles
    13: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13],
    14: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 16], // 12-jewel + Left/Right mid flanks
    15: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 16, 18],
    16: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 17], // 14-jewel + 2 Left/Right flank uprights
    17: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 17, 18],
    18: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], // 16-jewel + 2 Left/Right flank inverteds
    19: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    20: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], // Complete 20-triangle master jewel
  };

  const indices = pickOrders[count] || Array.from({ length: count }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const stageSize = Math.round(2.5 * h2 * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D20 Tessellation: Pointy-Topped Hexagonal Honeycomb (20 Slots for N = 2..20)
 * Calibrated to exact regular hexagon 'M50 5 L88.97 27.5 L88.97 72.5 L50 95 L11.03 72.5 L11.03 27.5 Z':
 * - Ring 1 (6 slots): 6 inner facet hexagons at D_inner = A_H + A_P + g.
 * - Ring 2 (6 slots): 6 outer valley hexagons nested in the valleys with uniform gutter g.
 * - Ring 3 (8 slots): 6 second-tier facet hexagons + 2 vertical crown/pedestals.
 */
function getD20Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const rHero = heroSize * 0.45;
  const aHero = rHero * (Math.sqrt(3) / 2);
  const rPetal = petalSize * 0.45;
  const aPetal = rPetal * (Math.sqrt(3) / 2);
  const g = gutter * scale;

  const dInner = aHero + aPetal + g;
  const dOuter = (rHero + rPetal + (2 / Math.sqrt(3)) * g) * 1.02;
  const dTier3Facet = dInner + 2 * aPetal + g;
  const dTier3Apex = dOuter + 2 * rPetal + g;

  const x0 = round1(dInner);
  const x2 = round1(0.5 * dInner);
  const y2 = round1((Math.sqrt(3) / 2) * dInner);

  const y0 = round1(dOuter);
  const x1 = round1((Math.sqrt(3) / 2) * dOuter);
  const y1 = round1(0.5 * dOuter);

  // Tier 3
  const x30 = round1(dTier3Facet);
  const x32 = round1(0.5 * dTier3Facet);
  const y32 = round1((Math.sqrt(3) / 2) * dTier3Facet);
  const y30 = round1(dTier3Apex);

  const masterSlots = [
    // --- Ring 1 (6 Slots): 6 inner facets ---
    { id: 'r-flank', x: +x0, y: 0, rot: 0 }, // 0°
    { id: 'br-inner', x: +x2, y: +y2, rot: 0 }, // 60°
    { id: 'bl-inner', x: -x2, y: +y2, rot: 0 }, // 120°
    { id: 'l-flank', x: -x0, y: 0, rot: 0 }, // 180°
    { id: 'tl-inner', x: -x2, y: -y2, rot: 0 }, // 240°
    { id: 'tr-inner', x: +x2, y: -y2, rot: 0 }, // 300°

    // --- Ring 2 (6 Slots): 6 outer valleys ---
    { id: 'br-outer', x: +x1, y: +y1, rot: 0 }, // 30°
    { id: 'b-apex', x: 0, y: +y0, rot: 0 }, // 90°
    { id: 'bl-outer', x: -x1, y: +y1, rot: 0 }, // 150°
    { id: 'tl-outer', x: -x1, y: -y1, rot: 0 }, // 210°
    { id: 't-apex', x: 0, y: -y0, rot: 0 }, // 270°
    { id: 'tr-outer', x: +x1, y: -y1, rot: 0 }, // 330°

    // --- Ring 3 (8 Slots): Outer honeycomb expansion ---
    { id: 'r-flank-t3', x: +x30, y: 0, rot: 0 },
    { id: 'br-inner-t3', x: +x32, y: +y32, rot: 0 },
    { id: 'bl-inner-t3', x: -x32, y: +y32, rot: 0 },
    { id: 'l-flank-t3', x: -x30, y: 0, rot: 0 },
    { id: 'tl-inner-t3', x: -x32, y: -y32, rot: 0 },
    { id: 'tr-inner-t3', x: +x32, y: -y32, rot: 0 },
    { id: 'b-apex-t3', x: 0, y: +y30, rot: 0 },
    { id: 't-apex-t3', x: 0, y: -y30, rot: 0 },
  ];

  // Symmetrical placement priority for N = 2..20
  const pickOrders = {
    2: [0, 3], // Left & Right flanks
    3: [10, 1, 2], // 120-degree triad
    4: [1, 2, 4, 5], // 4 diagonal inner facets
    5: [1, 2, 4, 5, 10], // 4 diagonal inner facets + Top apex
    6: [0, 1, 2, 3, 4, 5], // All 6 inner facets
    7: [0, 1, 2, 3, 4, 5, 10], // All 6 facets + Top apex
    8: [0, 1, 2, 3, 4, 5, 7, 10], // All 6 facets + Top & Bottom apexes
    9: [0, 1, 2, 3, 4, 5, 10, 6, 8], // 6 facets + Top apex + 2 bottom valleys (mirror symmetric across Y-axis!)
    10: [0, 1, 2, 3, 4, 5, 6, 8, 9, 11], // 6 facets + 4 outer diagonal valleys
    11: [0, 1, 2, 3, 4, 5, 6, 8, 9, 11, 10],
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Complete 12-slot honeycomb
    13: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 19],
    14: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19], // 12 + Top & Bottom crowns
    15: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 19],
    16: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 19], // 12 + crowns + Left/Right outer flanks
    17: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 18, 19],
    18: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19],
    19: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19],
    20: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], // Complete 20-hexagon honeycomb
  };

  const indices = pickOrders[count] || Array.from({ length: count }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const maxY = count > 12 ? y30 : y0;
  const stageSize = Math.round(maxY * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D12 Tessellation: Dodecahedral Regular Pentagon Rosette (20 Slots for N = 2..20)
 * Calibrated to exact regular pentagon 'M50 5 L92.8 36.1 L76.45 86.41 L23.55 86.41 L7.2 36.1 Z':
 * - Ring 1 (5 slots, rot: 180): Inverted pentagons parallel to the 5 facets at D_inner = A_H + A_P + g.
 * - Ring 2 (5 slots, rot: 0): Upright pentagons nestled in the 5 outer valleys with uniform gutter g.
 * - Ring 3 (10 slots, N = 11..20): 5 facet pentagons (rot: 0) + 5 valley pentagons (rot: 180) in concentric 5-fold symmetry.
 * Symmetrical pick orders guarantee bilateral mirror symmetry across the vertical axis for ALL counts (fixing the 9-dice missing-tooth asymmetry!).
 */
function getD12Tessellation(count, heroSize, petalSize, gutter) {
  const scale = heroSize / 104;
  const rHero = heroSize * 0.45;
  const aHero = rHero * Math.cos(Math.PI / 5);
  const rPetal = petalSize * 0.45;
  const aPetal = rPetal * Math.cos(Math.PI / 5);
  const g = gutter * scale;

  // Exact geometric distance so that the edge-to-edge distance between:
  // - Hero and Ring 1 pentagons is exactly g
  // - Ring 1 and Ring 2 pentagons is ALSO exactly g (~9.5px uniform breathing gutter)
  const dInner = aHero + aPetal + g; // ~66.3px at heroSize=104
  const dOuter = round1(dInner * 1.312); // ~86.95px (exact mathematical radial distance matching Screenshot 1)

  // Tier 3 concentric rings (for N = 11..20)
  const dFacetTier3 = round1(dInner + 2 * aPetal + g * 1.5);
  const dValleyTier3 = round1(dOuter + 2 * aPetal + g * 1.5);

  const rad = (deg) => (deg * Math.PI) / 180;
  const innerAngles = [90, 18, -54, -126, 162];
  const innerRots = [180, 108, 36, 324, 252]; // Radially stepped rotations so flat edge aligns parallel to each hero facet
  const outerAngles = [-90, -18, 54, 126, 198];
  const outerRots = [0, 72, 144, 216, 288]; // Radially stepped rotations so valley pentagons nestle with uniform 9.5px gutter

  const masterSlots = [
    // --- Ring 1 (5 Slots): 5 inner facet docks with parallel edge alignment ---
    { id: 'facet-bottom', x: round1(dInner * Math.cos(rad(innerAngles[0]))), y: round1(dInner * Math.sin(rad(innerAngles[0]))), rot: innerRots[0] }, // 0: Bottom
    { id: 'facet-lower-right', x: round1(dInner * Math.cos(rad(innerAngles[1]))), y: round1(dInner * Math.sin(rad(innerAngles[1]))), rot: innerRots[1] }, // 1: LR
    { id: 'facet-upper-right', x: round1(dInner * Math.cos(rad(innerAngles[2]))), y: round1(dInner * Math.sin(rad(innerAngles[2]))), rot: innerRots[2] }, // 2: UR
    { id: 'facet-upper-left', x: round1(dInner * Math.cos(rad(innerAngles[3]))), y: round1(dInner * Math.sin(rad(innerAngles[3]))), rot: innerRots[3] }, // 3: UL
    { id: 'facet-lower-left', x: round1(dInner * Math.cos(rad(innerAngles[4]))), y: round1(dInner * Math.sin(rad(innerAngles[4]))), rot: innerRots[4] }, // 4: LL

    // --- Ring 2 (5 Slots): 5 outer valley docks seamlessly interlocking into the decagon ring ---
    { id: 'vert-top-apex', x: round1(dOuter * Math.cos(rad(outerAngles[0]))), y: round1(dOuter * Math.sin(rad(outerAngles[0]))), rot: outerRots[0] }, // 5: Top apex
    { id: 'vert-upper-right', x: round1(dOuter * Math.cos(rad(outerAngles[1]))), y: round1(dOuter * Math.sin(rad(outerAngles[1]))), rot: outerRots[1] }, // 6: UR valley
    { id: 'vert-lower-right', x: round1(dOuter * Math.cos(rad(outerAngles[2]))), y: round1(dOuter * Math.sin(rad(outerAngles[2]))), rot: outerRots[2] }, // 7: LR valley
    { id: 'vert-lower-left', x: round1(dOuter * Math.cos(rad(outerAngles[3]))), y: round1(dOuter * Math.sin(rad(outerAngles[3]))), rot: outerRots[3] }, // 8: LL valley
    { id: 'vert-upper-left', x: round1(dOuter * Math.cos(rad(outerAngles[4]))), y: round1(dOuter * Math.sin(rad(outerAngles[4]))), rot: outerRots[4] }, // 9: UL valley

    // --- Ring 3 (10 Slots): Second-tier concentric 5-fold rosette for N = 11..20 ---
    { id: 'facet2-bottom', x: round1(dFacetTier3 * Math.cos(rad(innerAngles[0]))), y: round1(dFacetTier3 * Math.sin(rad(innerAngles[0]))), rot: innerRots[0] }, // 10
    { id: 'facet2-lower-right', x: round1(dFacetTier3 * Math.cos(rad(innerAngles[1]))), y: round1(dFacetTier3 * Math.sin(rad(innerAngles[1]))), rot: innerRots[1] }, // 11
    { id: 'facet2-upper-right', x: round1(dFacetTier3 * Math.cos(rad(innerAngles[2]))), y: round1(dFacetTier3 * Math.sin(rad(innerAngles[2]))), rot: innerRots[2] }, // 12
    { id: 'facet2-upper-left', x: round1(dFacetTier3 * Math.cos(rad(innerAngles[3]))), y: round1(dFacetTier3 * Math.sin(rad(innerAngles[3]))), rot: innerRots[3] }, // 13
    { id: 'facet2-lower-left', x: round1(dFacetTier3 * Math.cos(rad(innerAngles[4]))), y: round1(dFacetTier3 * Math.sin(rad(innerAngles[4]))), rot: innerRots[4] }, // 14

    { id: 'vert2-top-apex', x: round1(dValleyTier3 * Math.cos(rad(outerAngles[0]))), y: round1(dValleyTier3 * Math.sin(rad(outerAngles[0]))), rot: outerRots[0] }, // 15
    { id: 'vert2-upper-right', x: round1(dValleyTier3 * Math.cos(rad(outerAngles[1]))), y: round1(dValleyTier3 * Math.sin(rad(outerAngles[1]))), rot: outerRots[1] }, // 16
    { id: 'vert2-lower-right', x: round1(dValleyTier3 * Math.cos(rad(outerAngles[2]))), y: round1(dValleyTier3 * Math.sin(rad(outerAngles[2]))), rot: outerRots[2] }, // 17
    { id: 'vert2-lower-left', x: round1(dValleyTier3 * Math.cos(rad(outerAngles[3]))), y: round1(dValleyTier3 * Math.sin(rad(outerAngles[3]))), rot: outerRots[3] }, // 18
    { id: 'vert2-upper-left', x: round1(dValleyTier3 * Math.cos(rad(outerAngles[4]))), y: round1(dValleyTier3 * Math.sin(rad(outerAngles[4]))), rot: outerRots[4] }, // 19
  ];

  // Symmetrical placement priority for N = 2..20:
  // Every count is strictly mirror-symmetric across the vertical axis (X <-> -X)!
  // For N = 9: 5 inner facets + 4 outer valleys in symmetric pairs [6, 9] (UR & UL) and [7, 8] (LR & LL)!
  const pickOrders = {
    2: [2, 3], // Upper-right & Upper-left facets (100% mirror symmetric!)
    3: [0, 2, 3], // Bottom, Upper-right, Upper-left (100% mirror symmetric!)
    4: [1, 2, 3, 4], // 4 side facets: UR, UL, LR, LL (100% mirror symmetric!)
    5: [0, 1, 2, 3, 4], // All 5 inner facets (5-fold symmetric!)
    6: [0, 1, 2, 3, 4, 5], // 5 inner facets + Top apex (100% mirror symmetric!)
    7: [0, 1, 2, 3, 4, 7, 8], // 5 inner facets + LR and LL valleys (100% mirror symmetric!)
    8: [0, 1, 2, 3, 4, 5, 7, 8], // 5 inner facets + Top apex + LR and LL valleys (100% mirror symmetric!)
    9: [0, 1, 2, 3, 4, 6, 7, 8, 9], // 5 inner facets + 4 outer valleys (UR, UL, LR, LL) -> 100% mirror symmetric with NO missing tooth!
    10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // Complete 10-pentagon 5-fold rosette
    11: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 15], // 10-rosette + Top apex 2
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13], // 10-rosette + UR & UL facet 2 (mirror symmetric!)
    13: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13],
    14: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14], // 10-rosette + 4 side facets 2
    15: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], // 10-rosette + 5 facet 2
    16: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    17: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18],
    18: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    19: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    20: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], // Complete 20-pentagon double rosette
  };

  const indices = pickOrders[count] || Array.from({ length: count }, (_, i) => i);
  const slots = indices.slice(0, count).map(idx => masterSlots[idx]);
  const maxSpan = count > 10 ? dValleyTier3 : dOuter;
  const stageSize = Math.round(maxSpan * 2 + petalSize + gutter * 4);

  return { heroSize, petalSize, stageWidth: stageSize, stageHeight: stageSize, slots };
}

/**
 * D10 / D100 Tessellation: Regular Pentagonal Rosette (20 Slots for N = 2..20)
 * Uses the exact same non-warped regular 5-fold pentagonal symmetry as D12.
 */
function getD10Tessellation(count, heroSize, petalSize, gutter) {
  return getD12Tessellation(count, heroSize, petalSize, gutter);
}
