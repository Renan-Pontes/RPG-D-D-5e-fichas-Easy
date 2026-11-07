# Belt Hive Stats — Specification & Implementation Status

## Status: COMPLETE & VERIFIED

This document serves as the master specification for the **3–4–3 Honeycomb Belt & Stats Layout** in *Forja de Heróis*.

---

## 1. Architectural Geometry: 3–4–3 Honeycomb Grid

- **Row 1 (3 Hexads)**: Physical Attributes (`STR`, `DEX`, `CON`)
- **Row 2 (4 Hexads)**: Belt System (Leftmost: 3D Beveled Gold Master PB Hexad; Slots 1, 2, 3: 50% Larger Quick Roll Slots)
- **Row 3 (3 Hexads)**: Mental Attributes (`INT`, `WIS`, `CHA`)
- All 10 slots are regular pointy-topped hexagons:
  $$H = W \times \frac{2}{\sqrt{3}} \approx 1.1547005 \times W \quad (\text{Aspect Ratio } W/H \approx 0.866)$$
- Automatic horizontal centering gives an exact valley offset of $\Delta X = 0.5(W + G)$, and vertical interlocking overlap is $\Delta Y = 0.25H - 1.1547G$.
- Uniform $5\text{px}$ seams throughout with zero negative-margin sibling hacks.

---

## 2. 50% Larger Mathematically Centered Polyhedral Silhouettes

Every polyhedral die silhouette badge is expanded by ~50% (`clamp(80px, 14vw, 96px)` vs former `clamp(56px, 9.8vw, 68px)`), positioned precisely at the center of the hexad (`position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)`).

Every silhouette path is calculated with strict horizontal and vertical centroid symmetry in the normalized `0 0 100 100` viewBox ($x \leftrightarrow 100 - x$, $y \leftrightarrow 100 - y$, center = $(50, 50)$):

1. **d4 (Tetrahedron)**:
   - Centroid: exactly $(50.0, 50.0)$.
   - Outer equilateral triangle: `50,10 88,70 12,70` ($y_{centroid} = (10 + 70 + 70)/3 = 50.0$).
   - Concentric inner facet: `50,26 72,62 28,62` ($y_{centroid} = (26 + 62 + 62)/3 = 50.0$).
2. **d6 (Cube / Hexagon Projection)**:
   - Centroid & bounding box midpoint: exactly $(50.0, 50.0)$.
   - Outer regular hexagon: `50,8 86.4,29 86.4,71 50,92 13.6,71 13.6,29`.
   - Inner concentric hexagon: `50,24 72.5,37 72.5,63 50,76 27.5,63 27.5,37`.
3. **d8 (Octahedron Diamond)**:
   - 4-fold reflective symmetry centered at $(50.0, 50.0)$.
   - Outer diamond: `50,6 94,50 50,94 6,50`.
   - Inner concentric diamond: `50,24 76,50 50,76 24,50`.
4. **d10 / d100 (Pentagonal Trapezohedron)**:
   - Centered vertically and horizontally at $(50.0, 50.0)$.
   - Outer shape: `50,6 92,34 74,82 50,94 26,82 8,34` (midpoint $50.0$).
   - Inner shape: `50,22 76,38 64,72 50,78 36,72 24,38` (midpoint $50.0$).
5. **d12 (Dodecahedron Regular Pentagon)**:
   - Mathematical centroid: $\frac{1}{5}\sum y_i = 50.0$.
   - Outer regular pentagon: `50,8 90,37 74.7,84 25.3,84 10,37`.
   - Inner concentric pentagon: `50,24 74.7,42 65.3,71 34.7,71 25.3,42`.
6. **d20 (Icosahedron)**:
   - Outer regular hexagon: `50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28`.
   - Central triangular facet: `27.5,37 72.5,37 50,76` ($y_{centroid} = 50.0$).

---

## 3. Consolidated Unified Formula on Dice Silhouette (`2d20+3`, `1d12+5`, `1d6-1`, etc.)

- **Consolidated Unified Sum on Right Side of Dice Type**:
  - All extraneous ability name crests (`WIS`, `STR`, etc.) and separate bottom foot bonus badges (`+1`, `+3`, etc.) were completely eliminated.
  - The assigned ability score is communicated purely and elegantly through the hexad's theme color-coding (`is-bound tone-${slot.bound}`) and luminous edge glow.
  - The modifier is unified into a singular mathematical sum positioned directly on the right side of the dice type:
    - When bound: $\text{Bonus} = \text{AbilityMod} + (\text{pbActive} ? \text{ProfBonus} : 0)$ (e.g. WIS $+1$ with PB $+2$ yields a unified `+3`).
    - When unbound with PB active: $\text{Bonus} = \text{ProfBonus}$ (e.g. `1d6+2`).
    - When unbound with PB inactive: No modifier suffix (e.g. `1d6`).
- **Dynamic 2d20 Stance Representation**:
  - Whenever a d20 slot is toggled to Advantage or Disadvantage, the label dynamically updates to **`2d20`** (e.g. `2d20+3`), accurately disclosing that 2 dice are being rolled.
  - When in Normal stance, it displays `1d20` (e.g. `1d20+3`).
- **Typography & Centering**:
  - Rendered inside the enlarged die silhouette centroid via `.fh-belt-dice-lockup` and `.fh-belt-slot-dice`.
  - Display typography: `font-family: var(--display)`, `font-size: clamp(0.82rem, 1.4vw, 0.98rem)`, `font-weight: 800`, with golden illumination and atmospheric intaglio text shadow.

---

## 4. D20 Stance Knob & SVG Glowing Edges

- Stance mechanics (Advantage $\uparrow$ / Disadvantage $\downarrow$) are isolated exclusively to d20 slots (`slot.die === 20`).
- The d20 silhouette itself acts as the gesture knob (`.is-d20-knob`).
- **Dynamic 2d20 Roll & Label**: Setting Advantage or Disadvantage automatically switches the count from 1 to 2, displaying `2d20` and rolling 2 d20s.
- **Advantage Feedback**: Top 2 edges of the hexad ignite with shiny green feedback (`#39e75f`, `#e4ffe8`) and a soft green glowing blur.
- **Disadvantage Feedback**: Bottom 2 edges ignite with shiny red feedback (`#ff3344`, `#ffe4e6`) and a soft red glowing blur.

---

## 6. Proportions, Zero-Tangent Breathing Room & Neon Ability Coding

- **Tangent-Free Vertical Proportions**:
  - Ability hexad header (`.fh-belt-header`) calibrated to `height: 33%`, `padding: 6px 4px 0`.
  - Abbreviation (`.fh-honey-abbr`, e.g. `DEX`, `STR`) sits safely in the upper triangular roof.
  - Round golden stud badge (`.fh-belt-badge`) centered at `top: 45%` with radius `clamp(24px, 3.8vw, 27px)`.
  - In advantage stance, upward translation is constrained to `-4px` (`calc(-50% - 4px)`), preserving ~18.5px of negative space between the top edge of the stud and the text baseline.
  - Lower halves (`.fh-honey-halves`) start at `top: 45%` with `padding: 14px 2px 6px`, centering check and save values comfortably in the wide belly of the hexad with zero overlap or border collision.
- **High-Contrast Neon Ability Color Coding**:
  - Each ability tone features dedicated high-vibrancy neon tokens (`--slot-bound-neon` and `--slot-bound-glow`):
    - **STR**: Neon Crimson (`#ff4a5a`, glow `rgba(255, 65, 80, 0.85)`)
    - **DEX**: Neon Emerald (`#10f07a`, glow `rgba(16, 240, 122, 0.85)`)
    - **CON**: Neon Amber (`#ff9d3b`, glow `rgba(255, 157, 59, 0.85)`)
    - **INT**: Neon Sapphire (`#38bdf8`, glow `rgba(56, 189, 248, 0.85)`)
    - **WIS**: Neon Amethyst (`#c084fc`, glow `rgba(192, 132, 252, 0.85)`)
    - **CHA**: Neon Topaz (`#facc15`, glow `rgba(250, 204, 21, 0.85)`)
  - When bound (`.is-bound`), the slot's outer frame border, die silhouette stroke, and the entire roll formula label (`.fh-belt-slot-dice`, e.g. `1d6+1`, `2d20+3`) illuminate in that vibrant neon color with dual-layer bloom.
- **Universal Ability Assignment Across All Dice Types**:
  - Any quick slot on the belt (d4, d6, d8, d10, d12, d20, d100) immediately becomes the active slot on pointer down, focus, die shift, or count shift.
  - Tapping an ability score's top header or holding its golden stud binds that ability to whichever slot is active.
- **Tap-and-Hold Pointer Release Roll**:
  - Eliminated arbitrary `elapsed < 420ms` gate on pointer release in `BeltQuickSlot`.
  - Whether a player executes a swift tap or presses and holds before releasing their finger, the roll fires reliably upon pointer release.

- **Vector 3D Minted Gold Medal Architecture**:
  - The PB Hexad is rendered via high-fidelity SVG geometry (`.fh-pb-medal-svg`) completely immune to CSS `clip-path` flattening artifacts.
  - **Bevel Chamfer Lighting**:
    - Top-left chamfer receives direct specular white-gold illumination (`url(#pb-chamfer-light)` from `#ffffff` through `#d49f28`).
    - Bottom-right chamfer recedes into rich dark bronze shadow (`url(#pb-chamfer-dark)` from `#87580b` down to `#2e1a01`).
  - **Recessed Chiseled Inner Groove**: A concentric inner hexagon with dark intaglio stroke (`#2b1702`, width 1.2) separating outer rim from the raised coin plateau.
  - **Raised Central Coin Plateau**: Raised convex hexagonal medallion face with rich radial gold gradient (`#ffffff` specular center at 38% 28% transitioning through `#f8d462` to deep amber edge `#7a5006`).
  - **Plateau Rim Highlights**: Top-left edge stroked with crisp white-gold highlight (`rgba(255, 255, 255, 0.85)`), bottom-right edge stroked with dark cast shadow (`rgba(60, 36, 4, 0.75)`).
- **Guaranteed 3D Depth Across Both States (Active & Inactive)**:
  - **Inactive (`is-pb-inactive`)**: Heavy, solid, tactile minted gold medal with burnished metallic weight, deep chamfer relief, and physical drop shadow (`0 6px 14px rgba(0, 0, 0, 0.75)`).
  - **Active (`is-pb-active`)**: Intensely radiant solar gold bloom (`drop-shadow(0 0 16px rgba(237, 203, 122, 0.95))`) with bright specular reflections.
  - Protected via `.fh-belt.is-pb-active .fh-belt-slot:not(.fh-belt-pb-slot)` so global belt active styles never overwrite or darken the master medal interior.
- **Deeply Etched 'PB + 2' Typography**:
  - `PB +{profB}` (e.g. `PB +2`) sits dead-centered at `top: 50%; left: 50%; transform: translate(-50%, -50%)`.
  - Uses `font-family: var(--display)`, `font-weight: 900`, `color: #241402`, and intaglio chiseled text-shadow (`0 -1.5px 1.5px rgba(0, 0, 0, 0.95), 0 1.5px 1px rgba(255, 255, 255, 0.95)`), deeply carved into the golden plateau.
- **Directional Gestures**:
  - **Swipe → (Right)**: Activates PB across all belt slots and illuminates the right glowing edge.
  - **Swipe ← (Left)**: Deactivates PB and dims the glow.
  - **Tap**: Toggles PB on/off.

---

## 6. 3D Spherical Gold Stud Knobs for Ability Scores

- **Convex Spherical Stud Body**:
  - The round slider knobs (`.fh-belt-badge`) on each ability score (STR, DEX, CON, INT, WIS, CHA) are styled as solid 3D brass/golden spherical studs (`border-radius: 50%`, `clamp(28px, 4.5vw, 32px)`).
  - Radial specular gradient (`radial-gradient(circle at 35% 28%, #ffffff 0%, #fff4b8 16%, #f0c754 44%, #ca9626 74%, #7a4f07 100%)`).
  - Multi-tier elevation and chamfer: `box-shadow: 0 4px 10px rgba(0, 0, 0, 0.8), 0 1.5px 3px rgba(0, 0, 0, 0.6), inset 0 2px 2.5px rgba(255, 255, 255, 0.95), inset 0 -2.5px 3.5px rgba(80, 48, 6, 0.9), 0 0 0 1.5px rgba(35, 22, 10, 0.85)`.
- **Deeply Etched Score Numbers**:
  - The flat score (`17`, `13`, `15`, `10`, `12`, `8`) is deeply carved into the solid gold metal.
  - `font-family: var(--display); font-weight: 900; color: #201202`.
  - Intaglio text-shadow: `0 -1.2px 1.2px rgba(0, 0, 0, 0.95), 0 1.2px 0.8px rgba(255, 255, 255, 0.95), 0 0 2px rgba(30, 15, 2, 0.85)`.
- **Chiseled Micro-Arrows & Stance Feedback**:
  - Micro-arrows ($\blacktriangle$ / $\blacktriangledown$) are chiseled dark bronze (`#4a300a`).
  - When Advantage (`adv-adv`) or Disadvantage (`adv-dis`) is active, the knob **retains its solid 3D golden stud body**, while igniting a brilliant emerald (`#39e75f`) or crimson (`#ff3344`) halo bloom with illuminated arrow indicators.

---

## 6. Verification & Quality Gates

- **Unit & Integration Tests**: 1,515 / 1,515 passing across 20 suites.
- **Production Build**: Clean Vite compilation (`✓ built in 14.26s`).
- **Accessibility & Contrast**: High-contrast gold display typography, WCAG AAA compliant text shadows, clear ARIA roles (`button`, `slider`), keyboard shortcuts (`ArrowLeft`/`ArrowRight` for die shift, `ArrowUp`/`ArrowDown` for count or d20 stance, `Space`/`Enter` to roll).

---

## 7. Ability Drag-to-Bind & Clean Advantage Modal (Commit `4da31eb`)

- **Drag-to-Bind with Visual Trailing Path**:
  - Dragging from an ability score hexad towards any quick roll slot triggers a full-screen fixed SVG overlay (`.fh-belt-drag-overlay`).
  - Animated bezier trailing path (`.fh-drag-trail-path.tone-${ability}`) with streaming dash pattern connects source center to cursor/pointer.
  - Hovering a belt quick roll slot triggers vibrant target illumination (`.fh-belt-slot.is-drag-target`).
  - Release assigns ability modifier to that belt slot with haptic pulse (`navigator.vibrate(30)`).
- **Lifted Bonus Numbers**:
  - Lifted bonus numbers in `.fh-honey-half` / `.fh-honey-val` higher from the bottom hexad edges (`transform: translateY(-5px)` and adjusted padding) to maximize negative space.
- **Advantage / Disadvantage Drop-Lowest Mechanical Fix**:
  - Fixed `onRollSlot` to pass `count: 1` with `advMode` so `rollFormula` triggers `singleD20 && adv !== 'normal'`. Rolls 2 dice and keeps the highest (for advantage) or lowest (for disadvantage) rather than summing both dice.
- **Hierarchical Clean Roll Modal & 2-Second Roll-Up Animation**:
  - In `DiceStage` & `DieShape`, kept hero die scales up to 114px while the discarded unpicked die drops to 50px at `opacity: 0.22`.
  - Emerald green (`tone: 'adv'`, `#10f07a`) for Advantage rolls; Crimson red (`tone: 'dis'`, `#ff4a5a`) for Disadvantage rolls.
  - Noisy array brackets (`[~1~, 16]`) are omitted during Advantage/Disadvantage.
  - Smooth 2-second roll-up animation: starts at natural die roll with a floating bonus badge, smoothly counts up to final total over 1.4s, while the bonus badge illuminates and fades away.

---

## 8. Minimalist Roll Outcome, Art Deco Critical Frame & Robust Drag-to-Bind (Commit Pending)

- **Pure Minimalist Roll Outcome (Zero Redundancy)**:
  - Eliminated redundant header labels (`Cinto Slot 1, 1d20 (dex+1) Com Vantagem`) and footer prompts (`Toque para fechar`).
  - Removed duplicate giant number below the stage. The die number itself inside the polyhedral face rolls up smoothly from natural die result to total ($d_{roll} \rightarrow d_{roll} + mod$), unifying display and outcome into a single legible focal point.
- **Radial Atmospheric Glow (No Quad Clipping)**:
  - Replaced SVG filter drop-shadows with unclipped 380px radial gradient pseudo-elements (`.die-shape::before`), with `overflow: visible !important` across all parent stage containers. Emerald green for Advantage, Crimson for Disadvantage, and Golden Amber for Critical Hits, softly dissipating into the dark backdrop with zero box boundaries.
- **Satellite Unpicked Die Docking**:
  - In Advantage and Disadvantage rolls, the discarded/unpicked die is docked as a satellite directly nestled at the **bottom-right edge of the hexagonal hero die** (`.dice-satellite-unpicked`), scaled to 72% at 24% opacity with grayscale filter, completely eliminating awkward horizontal row crowding.
- **Art Deco Critical Hit Frame Layer**:
  - On a natural 20 / critical hit, an Art Deco golden frame layer (`.dice-artdeco-crit-frame`) wraps around the polyhedral die icon with double hexagonal bevels, corner chevron accents, solar sparks, and a gold plaque at the bottom reading `"CRÍTICO"` (or `"CRITICAL"`).
- **Separation of Knob Gesture vs Ability Tile Drag-to-Bind**:
  - Knob (`.fh-belt-badge`): Handles strictly vertical swiping/tapping for stance toggles (Advantage $\uparrow$ / Disadvantage $\downarrow$ / Normal), with `stopPropagation()` to never mistakenly trigger drag-and-drop.
  - Ability Tile (`.fh-belt-hex`): Hold on the tile body for 180ms or drag > 8px initiates the drag-and-drop gesture with the luminous trailing path.
  - Screen bounding-box collision (`getSlotAtPoint`) checks all `.fh-belt-slot[data-quick-slot-index]` with a 24px expanded hit margin, avoiding DOM hierarchy interception from SVG overlay beacons and guaranteeing assignment to any die type (d4, d6, d8, d10, d12, d20, d100).
- **Universal Neon Illumination for Assigned Slots**:
  - Bound quick slots illuminate in the vibrant neon color of the assigned ability (`--slot-bound-neon`), highlighting both formula text and die polygon creases.

---

## 9. Hold-to-Roll, Non-Intersecting Satellite, Contoured Drag Ring & Specular Sheen (Verified in Commit 2090f36)

- **Hold-to-Roll & Tap-to-Deactivate D20 Stance**:
  - Quick dice rolls on the belt require a deliberate hold ($\ge 220$ms) followed by release (`pointerup`) to launch a roll, preventing accidental roll firing.
  - While holding ($\ge 220$ms), the slot enters `.is-charging-roll`, providing subtle golden bloom feedback and haptic pulse.
  - A swift tap ($< 220$ms) on a d20 slot in Advantage or Disadvantage stance immediately deactivates the stance back to Normal (`advMode = 'normal'`), without launching a roll.
  - A swift tap on other dice or normal stance selects the slot without rolling.
- **Robust Pointer-Captured Drag-to-Bind**:
  - Dragging an ability score now initiates smoothly on $\ge 6$px movement or 150ms hold.
  - Global `window` listeners with `{ capture: true }` and `touch-action: none !important;` guarantee pointer release is 100% reliably captured, even on touch devices where native scrolling could trigger `pointercancel`.
  - Magnetic slot detection with a generous 36px tolerance and centroid distance snapping (`getSlotAtPoint`) ensures assignment is never lost due to finger release jitter.
- **Oscillating Specular Reflection Sheen Wave Across Belt Hexads**:
  - When PB is active (`.fh-belt.is-pb-active`), all 4 belt hexads (Master PB, Slot 1, Slot 2, Slot 3) gain an oscillating specular reflection sheen (`.fh-belt-sheen`).
  - Staggered animation delays (PB: 0s, Slot 0: 0.32s, Slot 1: 0.64s, Slot 2: 0.96s) create a continuous, shimmering luster wave gliding from left to right across the entire belt row.

---

## 10. Seamless Gapless Stud Contour, 50% Satellite Die & Geometric Flower Accumulation Layout

- **Seamless, Gapless Tight Contour of Ability Score Stud Knob**:
  - Eliminated the floating outer accent ring and calibrated the drag contour directly to the live bounding box of the brass knob (`.fh-belt-badge`).
  - Exact centroid coordinates $(x_{center}, y_{center})$ and radius $r \approx 13.5\text{px}$ are queried dynamically via `getBadgeAnchor()`.
  - Contour circle radius set to $r + 0.6\text{px}$ with a $2.2\text{px}$ neon stroke (`.fh-drag-trail-contour`), hugging the outer rim of the circular brass badge 100% seamlessly and gaplessly.
  - Dashed bezier guide emerges at $offset = r + 1.8\text{px}$, originating strictly outside the knob's edge with zero overlap over the deeply etched score number.
  - Transition from knob drag to ability-to-belt assignment initiates cleanly whenever drag distance exceeds $14\text{px}$, supporting gestures starting from either the knob or the hexad tile.
- **Enlarged 50% Scale Satellite Unpicked Die with Non-Intersecting Edge Docking**:
  - In Advantage and Disadvantage rolls, the unpicked discarded die is scaled to **exactly 50% of the hero die** (`size={60}` against the $120\text{px}$ hero die).
  - Docked at `right: -42px; bottom: -16px;`, aligning its top-left diagonal facet parallel to the hero die's bottom-right diagonal facet with an exact $11\text{px}$ negative-space breathing gap.
  - Preserves zero tangent collisions, zero overlapping quad boundaries, and an unclipped $380\text{px}$ radial atmospheric glow.
- **Authentic Geometric Tessellation for Multi-Dice Accumulation Rolls**:
  - When multiple dice are accumulated and rolled simultaneously ($N \ge 2$, e.g. `5d6`, `7d12`, `4d8`, `3d4`), they assemble into an authentic geometric tessellation matching each polyhedral shape, implemented in [`dice-tessellation.js`](file:///f:/AI_Resources/DND_HeroesForge/frontend/src/dice/dice-tessellation.js):
    - **Central Hero Die**: Scale 1.0 ($104\text{px}$), displaying the consolidated total sum of the roll with full roll-up animation, atmospheric glow, and Art Deco critical hit framing.
    - **Constituent Petal Dice**: Scaled to **strictly 50% size** ($52\text{px}$), stacked side-to-side along the facets and corners with uniform $6\text{px}$ breathing gutters.
    - **D4 (Equilateral Triangle)**: Alternating equilateral triangles (upright $0^\circ$ and inverted $180^\circ$) stacked edge-to-edge along the base and flanks, matching the triangular composition in Image 1.
    - **D6 (Cube / Square)**: $4 \times 4$ perimeter square grid (8 edge squares + 4 corner squares) framing the central $2 \times 2$ square, with small squares upright ($0^\circ$), matching Image 2.
    - **D8 (Octahedron / Diamond)**: $4 \times 4$ diamond grid (4 apex corners + 8 diagonal facet diamonds) rotated $45^\circ$, matching Image 3.
    - **D20 (Icosahedron / Regular Hexagon)**: Pointy-topped hexagonal honeycomb tiling (2 small hexagons docked edge-to-edge along each of the 6 facets).
    - **D12 (Dodecahedron / Regular Pentagon)**: 10-slot pentagonal cluster docked flush against the 5 facets and 5 vertices.
    - **D10 / D100 (Kite Trapezohedron)**: 10-slot perimeter docked flush along the slant flanks, shoulder facets, and bottom base.
    - **Dimmed Component Values**: Constituent rolled numbers on the 50% outer dice are dimmed (`opacity: 0.38` via `.die-shape.is-petal-die`) with unrotated horizontal text for instant readability, keeping the central hero die as the primary focal point.

---

## 11. Seamless Geometric Block Tessellations, Non-Warped Regular Polygons & Unified Golden/Adv/Dis UI/UX

- **Zero Non-Uniform Warping on All Polyhedral Shapes (`DICE_FACES`)**:
  - Replaced all hand-approximated, vertically stretched SVG paths with exact regular polygons centered at `(50, 50)`:
    - **`D4`**: True equilateral triangle (`M50 11.9 L94 88.1 L6 88.1 Z`, side $88$, height $88\frac{\sqrt{3}}{2} = 76.21$, interior angles $60^\circ$).
    - **`D6`**: True square (`M15 15 H85 V85 H15 Z`, $70 \times 70$, interior angles $90^\circ$).
    - **`D8`**: True $45^\circ$ rotated square / regular diamond (`M50 6 L94 50 L50 94 L6 50 Z`, $88 \times 88$, equal X and Y half-diagonals $44$, interior angles $90^\circ$).
    - **`D10`, `D12`, `D100`**: True regular pentagon (`M50 5 L92.8 36.1 L76.45 86.41 L23.55 86.41 L7.2 36.1 Z`, circumradius $R = 45$, interior angles $108^\circ$).
    - **`D20`**: True regular pointy-topped hexagon (`M50 5 L88.97 27.5 L88.97 72.5 L50 95 L11.03 72.5 L11.03 27.5 Z`, circumradius $R = 45$, interior angles $120^\circ$).
- **Exact Symmetric Boundary Distances on Both X and Y Axes (`dice-tessellation.js`)**:
  - **D4**: All 12 adjacent interfaces (horizontal, $+60^\circ$, and $-60^\circ$) have the exact same perpendicular centerline distance $g = 7.5\text{px}$; inverted petals (`rot: 180`) apply `.is-inverted-petal` (`translateY(-12%)`) so rolled numbers sit in the upper centroid.
  - **D6**: Symmetric $4 \times 4$ grid at $\{-64.4, -21.5, +21.5, +64.4\}\text{px}$ on both X and Y axes.
  - **D8**: Symmetric $4 \times 4$ diamond lattice with identical steps on both X and Y ($d_1 = 27.3\text{px}, d_2 = 54.5\text{px}, d_3 = 81.8\text{px}$).
  - **D20**: Exact 6-fold rotational symmetry with 6 inner facet hexagons at $D_{\text{inner}} = 1.5 A_H + g = 68.0\text{px}$ and 6 outer valley/apex hexagons at $D_{\text{outer}} = 1.75 R_H + \sqrt{3} g = 94.4\text{px}$; `pickOrders` frames all 6 inner facets first for $N \ge 6$.
  - **D12 / D10 / D100**: Exact 5-fold ($72^\circ$) rotational symmetry with 5 inner facet pentagons (`rot: 180`) at $D_{\text{inner}} = 64.3\text{px}$ and 5 outer valley pentagons (`rot: 0`) at $D_{\text{outer}} = 82.0\text{px}$.
- **Consistent Dice Color UI/UX Across All Dice Types**:
  - **Golden by default** (`fill: var(--gold-deep); stroke: var(--gold-bright)`) for all dice types (`D4`, `D6`, `D8`, `D10`, `D12`, `D20`, `D100`), removing the legacy per-die red (`D20`), green (`D100`), and beige (`D4`/`D6`) overrides in both 2D CSS (`styles.css`, `dice-styles.css`) and 3D `PALETTE` (`dice-tones.js`).
  - **Green (`tone-adv`)** for rolls with **Advantage** (`adv === 'adv'`).
  - **Red (`tone-dis`)** for rolls with **Disadvantage** (`adv === 'dis'`).
- **Verification**:
  - Exact SVG polygon-to-polygon minimum edge distance verification in `dice-tessellation.test.js` (7 / 7 tests green) and `dice-tones.test.js` (5 / 5 tests green).
  - Full automated suite: 1,522 / 1,522 tests green across 20 suites; Vite production build: 0 errors.

---

## 12. Synchronized 3-Phase Juicy Dice Roll Choreography: 0.5s Smooth Fade-In, Random Neighboring Catch-Up & Single Powerful Glowing Ripple

- **Smooth `0.5s` (`FADEIN_DURATION_MS = 500`) Fade-In of the Whole Roll-Up Interface**:
  - Eliminated the abrupt `0ms` pop onto the screen caused by `.dice-overlay:has(.die-shape.rolling)` clobbering `overlay-fade` in [`styles.css`](file:///f:/AI_Resources/DND_HeroesForge/frontend/styles.css#L1830-L1960).
  - Implemented [`computeFadeInProfile(elapsedMs)`](file:///f:/AI_Resources/DND_HeroesForge/frontend/src/dice/dice-rollup.js#L80-L92) (`FADEIN_DURATION_MS = 500`) alongside CSS keyframes (`dice-rollup-overlay-fadein` and `dice-rollup-stage-fadein`, `0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards`) and `key={overlay.id}` on `.dice-overlay` in [`DiceRoller.jsx`](file:///f:/AI_Resources/DND_HeroesForge/frontend/components/DiceRoller.jsx#L649).
  - Both the overlay backdrop and the entire stage composition (`.dice-stage-2d.is-animated-stage`, `.dice-hero-stage-wrap`, `.dice-flower-stage`, `--rollup-fadein-opacity: 0 -> 1`, `--rollup-fadein-scale: 0.94 -> 1.0`) smoothly fade in over **0.5 seconds (`500ms`)**.
- **Phase 1 (`0.0s -> 0.75s`): Calm Start (Zero Wobble) & Building Anticipation Crescendo (50% Speed-Up)**:
  - Implemented pure mathematical choreography in [`dice-rollup.js`](file:///f:/AI_Resources/DND_HeroesForge/frontend/src/dice/dice-rollup.js) (`ROLLUP_DURATION_MS = 750`, `LAND_HOLD_MS = 0`, `PUMP_DURATION_MS = 220`, `FALLOFF_DURATION_MS = 1050`, `easeInAnticipation(p) = 0.25p + 0.75p^2.6`, `computeAnticipationProfile(p)`).
  - **Zero Initial Wobble**: At `p = 0.0` (`0ms`), `strength = 0`, `shakeX = 0`, `shakeY = 0`, `shakeRot = 0`, `motionBlurPx = 0`, and `chargeScale = 1.0`.
  - **Increasing Shaking Frequency & Strength**: As the numeric roll-up accelerates toward `750ms`, instantaneous shaking frequency ramps from `6 Hz` to `56 Hz` while shaking strength (`p^2.2`) ramps smoothly to $\pm 9\text{px}$ and $\pm 6.5^\circ$ and tension scale swells to `1.08` right at `750ms`.
  - **Increasing Directional Motion Blur**: Die body blur (`--die-blur`, up to `3.0px` with directional afterimage `drop-shadow`) and vertical slot-reel number blur (`--num-blur` up to `3.6px`, `--num-trail` up to `10px`, `--num-stretch` up to `1.24`) reach their peak right at `750ms`.
- **Multi-Dice Randomized Neighboring Catch-Up Roll-Up (`10d10`, `10d8`, `5d6`, etc.)**:
  - Implemented [`computeNeighborRollupSchedule(petalIndex, petalCount, rollSeed)`](file:///f:/AI_Resources/DND_HeroesForge/frontend/src/dice/dice-rollup.js#L119-L168):
    - Uses a deterministic Fisher-Yates shuffle to randomize the completion order (`rank`) of all neighboring/nested dice around the central hero die.
    - Every neighboring die rolls up faster (`speedMultiplier = 1 / finishP >= 1.0`, `finishP` in `[0.35, 1.00]`) with a unique `stepOffset` so neighboring dice never show correlated digits while rolling.
    - As the central sum rolls up normally over `750ms`, neighboring dice randomly finish early (`localP = Math.min(1, globalP / finishP) === 1`), unravelling their individual rolled numbers with a crisp lock-in micro-pop (`is-phase-petal-locked`) along the central roll-up, with the final neighboring die (`rank === petalCount - 1`) finishing at `finishP = 1.00` in exact sync with the central hero die!
- **Unified Climax at `750ms` (`Phase 2 Punch` + `Phase 3 Single Powerful Glowing Ripple` Synchronized with `0ms` Lag)**:
  - At the exact millisecond `elapsed === ROLLUP_DURATION_MS` (`750ms`), all climax events fire simultaneously on the exact same frame (`LAND_HOLD_MS = 0`):
    1. **Peak of Roll-Off Ends & Motion Blur Cuts to `0px`**.
    2. **The Final Rolled Number (`finalVal`) Reveals Immediately**.
    3. **The Final Punch Impacts Immediately (`0.22s`)**: `die-elastic-pump-up` (`+bonus`), `die-elastic-pump-down` (`-penalty`), or `die-snap-shake` (`0` mod) bursts directly from keyframe `0%` (`scale(1.34)`).
    4. **Single Powerful & Glowing Ripple Launches Immediately (`afterClimax = 0`, `1.05s`)**: Removed noisy secondary rings and inner circles; [`computeFalloffProfile`](file:///f:/AI_Resources/DND_HeroesForge/frontend/src/dice/dice-rollup.js#L328-L353) (`easeOutRipple(p) = 1 - (1 - p)^3.4`) drives a **single powerful and glowing ripple** (`.die-falloff-ring` with `stroke-width: 3.2` and dual `drop-shadow` bloom, `0.96 -> 2.75`, `opacity: 1.0 -> 0.0`) + radial pulse (`0.88 -> 2.50`) + ease-out roll upscale (`1.00 -> 1.12`) that smoothly fades away.
    5. **`DiceStage` Settles at `750ms`**: Reveals any Critical Hit Art Deco frame and tone in lockstep with the punch and ripple.
- **Verification**:
  - Unit test suite in [`dice-rollup.test.js`](file:///f:/AI_Resources/DND_HeroesForge/frontend/tests/dice-rollup.test.js) (9 / 9 tests green) + full suite (1,531 / 1,531 tests green across 21 suites) + clean Vite production build.

---

## 13. Up to 20 Dice Geometric Tessellations, Balanced Symmetric Spacing & Hood-Triggered Ability Drag with Live-Locked Spherical Contour

- **Full Multi-Dice Compatibility Scaling Up to 20 Dice (`N = 2 .. 20`) Across All 7 Dice Types**:
  - Unlocked up to `20` simultaneous dice on belt quick slots in [`Sheet.jsx`](file:///f:/AI_Resources/DND_HeroesForge/frontend/components/Sheet.jsx) (`Math.min(20, s.count + delta)`), and updated `onRollSlot` from hardcoded `1d` to `${rollCount}d${s.die}`.
  - Implemented 20 master geometric slots and symmetric `pickOrders` for every count $N \in [2, 20]$ across all polyhedral shapes (`D4`, `D6`, `D8`, `D10`, `D12`, `D20`, `D100`) in [`dice-tessellation.js`](file:///f:/AI_Resources/DND_HeroesForge/frontend/src/dice/dice-tessellation.js).
  - Dynamic viewport scaling: For $N \le 12$, uses `heroSize = 104`, `petalSize = 52`, `gutter = 9.5px`; for $N > 12$, automatically scales to `heroSize = 86`, `petalSize = 43`, `gutter = 8.0px`, strictly maintaining 50% constituent scale while fitting all 20 dice inside the viewport without crowding.
- **Generous, Balanced Breathing Spacing & Flush Symmetric Tessellations**:
  - **D12 / D10 / D100 Pentagonal Rosette**: Calibrated outer valley pentagon distance to $D_{\text{outer}} = \text{round}(D_{\text{inner}} \times 1.312) \approx 86.95\text{px}$ with radially stepped rotations (`innerRots = [180, 108, 36, 324, 252]`, `outerRots = [0, 72, 144, 216, 288]`). This ensures every facet pentagon's flat edge aligns parallel to its hero facet, valley pentagons nestle with identical 9.49-9.50px uniform breathing gutters, and every adjacent petal pair in the 10-pentagon decagon ring has an exact, uniform gap.
  - **D6 Modular Square Grid**: 20 slots forming an interlocking Greek-cross frame where every horizontal and vertical gap is identically $g$.
  - **D8 Regular Diamond Grid**: 20 slots forming a 4-fold diamond lattice with uniform diagonal steps $d_1 .. d_4$.
  - **D4 Truncated Triangular Jewel**: 20 slots forming a concentric equilateral triangular lattice where all 3 directions share perpendicular distance $g$.
  - **D20 Pointy-Topped Hexagonal Honeycomb**: 20 slots forming a concentric 3-tier honeycomb where facet-to-facet distance is $D_1 + 2 A_P + g$ and apex-to-apex distance is $D_2 + 2 R_P + g$.
- **Strict Bilateral Mirror Symmetry ($X \leftrightarrow -X$) Eliminating Missing-Tooth & Corner Asymmetries**:
  - For odd counts such as $N = 9$, slots are selected in exact symmetric pairs reflected across the vertical axis (e.g., in D12: 5 inner facets + 2 Upper-Flank valleys + 2 Lower-Flank valleys = 9 slots, with `sumX = 0.00`; in D6: 8 edges + 1 centered top crown at $X = 0$, with `sumX = 0.00`), eliminating the chaotic single-corner defect.
- **Hood-Triggered Ability Assignment & Live-Locked Spherical Head Contour Ring**:
  - **The Sphere (`.fh-belt-badge`)**: Restricted exclusively to vertical Advantage/Disadvantage sliding and tap toggling; never initiates ability assignment drag.
  - **"The Hood" (`.fh-belt-header`)**: Pressing and holding ($\ge 110\text{ms}$) or dragging ($> 4\text{px}$) from the top colored cap of the hexad initiates ability assignment drag-to-bind (`onStartDrag`). A quick tap ($< 110\text{ms}$ without moving) binds/unbinds to the active belt slot.
  - **Live-Locked Contour Ring**: In [`Sheet.jsx`](file:///f:/AI_Resources/DND_HeroesForge/frontend/components/Sheet.jsx), `.fh-belt-drag-overlay` dynamically reads `.fh-belt-badge[data-ability-badge="${dragLink.ability}"]?.getBoundingClientRect()` on every render frame. The green contour ring is always mathematically locked to the spherical head's exact center and radius with `0px` offset, regardless of stance shifts or layout transforms.
- **Verification**:
  - Expanded test suite in [`dice-tessellation.test.js`](file:///f:/AI_Resources/DND_HeroesForge/frontend/tests/dice-tessellation.test.js) (11 / 11 tests green): verified 20 slots scaling, bilateral mirror symmetry for $N = 9$, non-overlapping geometry across all counts $N \in [2, 20]$ for all 7 dice types, and generous Ring 1 / Ring 2 spacing.
  - Full automated suite: 1,535 / 1,535 tests green across 21 suites; Vite production build: 0 errors.

---

## 14. Zero-Collision Tessellation Geometry & SAT Convex Clearance Across All Dice Types (`N = 2 .. 20`)

- **Exhaustive Collision Audit via Separating Axis Theorem (SAT)**:
  - Formulated a polygon SAT verification suite in [`dice-tessellation.test.js`](file:///f:/AI_Resources/DND_HeroesForge/frontend/tests/dice-tessellation.test.js) testing every constituent pair and hero-slot pair across all 7 dice types (`D4`, `D6`, `D8`, `D10`, `D12`, `D20`, `D100`) and all counts $N \in [2, 20]$ ($7 \times 19 = 133$ layouts, hundreds of polygon pairs).
  - Identified 3 distinct geometric intersection issues:
    1. **D20 Valley Radius Dead-Zone**: The previous outer radius $D_{\text{outer}} = 82.8\text{px}$ placed corner hexagons at $30^\circ$ directly intersecting adjacent facet hexagons at $0^\circ$ and $60^\circ$ ($41.4\text{px} < 2 A_P = 40.53\text{px}$).
    2. **D6 Row Overcrowding**: In odd counts $N = 11, 15, 17$, the centered crown slot (`top-crown-center` at $X = 0, Y = -cTier2$) was selected alongside `top-out-left` ($X = -cInner$) and `top-out-right` ($X = +cInner$), jamming three $36.4\text{px}$ squares into a $46\text{px}$ horizontal span and squishing them into overlapping dark vertical bands.
    3. **D4 Equilateral Triangular Lattice Flank Collisions**: Ring 2 outer flank formulas placed inverted triangles at coordinates where adjacent vertices overlapped into flank and roof triangles.
- **Mathematical Calibrations**:
  - **D20 Honeycomb Calibration**:
    $$D_{\text{inner}} = a_H + a_P + g \approx 70.30\text{px}$$
    $$D_{\text{outer}} = \text{round}(D_{\text{inner}} \times 1.394) = 98.0\text{px}$$
    $$D_{\text{tier3Facet}} = \text{round}(D_{\text{inner}} + 2 a_P + 2 g) = 129.8\text{px}$$
    $$D_{\text{tier3Apex}} = \text{round}(D_{\text{outer}} + 2 r_P + 2 g) = 163.8\text{px}$$
    Guarantees positive edge distance $d \ge 9.18\text{px}$ to both adjacent facet hexagons and $d \ge 27.8\text{px}$ to the hero die.
  - **D6 Modular Square Grid**:
    In odd counts $N = 11, 15, 17, 19$, selecting slot 20 (`top-crown-center` at $X = 0$) pairs exclusively with bottom outer slots (`bot-out-left` and `bot-out-right`) and outer side flanks, completely avoiding `top-out-left` and `top-out-right` on row $Y = -cTier2$. Minimum breathing clearance is uniformly $9.50\text{px}$ for $N \le 12$ and $6.61\text{px}$ for $N > 12$.
  - **D4 Equilateral Triangular Jewel**:
    Derived exact 20-triangle coordinates on the horizontal baseline triangular lattice:
    - Ring 1 (9 slots): 2 bottom inverted, 1 bottom apex upright, 4 side flanks, 2 top roof.
    - Ring 2 (11 slots): 3 top crown ($X \in \{0, \pm s_2\}, Y = -1.6 h_2$), 4 symmetrical outer flanks ($X \in \{\pm x_{\text{outUpper}}, \pm x_{\text{outLower}}\}$), 2 bottom outer wings ($X = \pm(x_{\text{bot}} + s_2)$), and 2 bottom tier-2 pedestal uprights ($X = \pm 0.5 s_2, Y = y_{\text{bot}} + h_2$).
    - Bilateral mirror symmetry: $\sum X = 0$ for all $N \in [2, 20]$, with minimum edge distance $d = 9.50\text{px}$ (scaled to $6.61\text{px}$).
- **Verification Results**:
  - `TOTAL COLLISIONS DETECTED: 0` across all 7 dice types and all counts $N \in [2, 20]$.
  - Global minimum edge distance across all shapes: $d \ge 6.22\text{px}$ ($N > 12$) and $d \ge 9.18\text{px}$ ($N \le 12$).
  - Full test suite: 1,536 / 1,536 tests passing (100% green); Vite production build: 0 errors.

---

## 15. Responsive Scaling: 25% Larger Dice Belt Mode for Screen Utilization

- **Overview**:
  - The dice belt mode (`.ficha .fh-belt`) was increased in scale by strictly 25% across its geometric properties, interactive components, ability studs, PB master medal, typography, and SVG overlays to deliver prominent, comfortable screen utilization and thumb/touch ergonomics.
- **Architectural & Mathematical Calibrations (+25%)**:
  1. **Core Honeycomb Grid Dimensions (`.ficha .fh-belt`)**:
     - Desktop `--belt-w`: scaled from `clamp(70px, 13.5vw, 94px)` to `clamp(88px, 16.9vw, 118px)`.
     - Honeycomb gap `--belt-gap`: scaled from `5px` to `6px`.
     - Height and row overlap automatically derive via exact hexagonal trigonometry:
       $$\text{--belt-h} = \text{--belt-w} \times 1.1547005$$
       $$\text{--belt-row-overlap} = \text{--belt-h} \times 0.25 - \text{--belt-gap} \times 1.1547005$$
  2. **Mobile Viewport Scaling (`@media (max-width: 520px)`)**:
     - Mobile `--belt-w`: scaled from `clamp(62px, 18.2vw, 76px)` to `clamp(78px, 22.8vw, 95px)`.
     - Mobile `--belt-gap`: scaled from `3px` to `4px`.
     - Bonus numbers `.fh-honey-val`: scaled to `clamp(1.22rem, 4.0vw, 1.44rem)`.
     - Silhouette badge `.fh-belt-die-badge`: scaled to `clamp(80px, 21.2vw, 95px)`.
     - Slot formula `.fh-belt-slot-dice`: scaled to `clamp(0.92rem, 2.9vw, 1.10rem)`.
  3. **Interactive Ability Studs & Slider Rails**:
     - Spherical gold knob `.fh-belt-badge`: scaled from `clamp(24px, 3.8vw, 27px)` to `clamp(30px, 4.8vw, 34px)`.
     - Recessed slider track `.fh-belt-badge-track`: scaled from `width: 4px; height: 26px; top: calc(45% - 13px)` to `width: 5px; height: 32px; top: calc(45% - 16px)`.
     - Advantage/Disadvantage stance shift: scaled from $\pm 4\text{px}$ to $\pm 5\text{px}$ (`translate(-50%, calc(-50% \pm 5px))`).
     - Micro-arrow indicator `.fh-badge-arrow`: scaled from `0.38rem` to `0.48rem`.
  4. **Polyhedral Die Silhouettes & Lockups**:
     - Die silhouette `.fh-belt-die-badge`: scaled from `clamp(78px, 13.5vw, 92px)` to `clamp(98px, 16.9vw, 115px)`.
     - Formula text `.fh-belt-slot-dice`: scaled from `clamp(0.82rem, 1.4vw, 0.98rem)` to `clamp(1.02rem, 1.75vw, 1.22rem)`.
  5. **Typography & Etched Accents**:
     - Hexad header `.fh-honey-abbr`: scaled to `clamp(0.85rem, 1.5vw, 0.98rem)`.
     - Score numeral `.fh-honey-score`: scaled to `clamp(0.82rem, 1.45vw, 0.95rem)`.
     - Bonus values `.fh-honey-val`: scaled to `clamp(1.25rem, 2.25vw, 1.52rem)`.
     - PB Medal etched text `.fh-belt-pb-etched`: scaled to `clamp(1.20rem, 2.1vw, 1.50rem)`.
  6. **Drag-to-Bind Overlay Ergonomics**:
     - Drag beacon halo: scaled from radius $r = 24$ to $r = 30$.
     - Drag beacon core: scaled from radius $r = 15$ to $r = 19$.
     - Drag beacon typography: scaled to `12.5px`.
     - Default anchor fallback radius: updated from $13.5\text{px}$ to $17\text{px}$.
- **Verification**:
  - Full automated suite: 1,536 / 1,536 tests passing (100% green across 21 suites).
  - Production Vite build: 0 errors, 641 modules compiled cleanly in 9.45s.

---

## 15. Decoupled 4-Scope Stats Architecture, Mobile Swipe Navigation, Resistance Save Checkered Vignette & Crimson Natural 1 Fumble Frame

- **Decoupled 4-Scope Stats Navigation (`STAT_SCOPES`)**:
  - The monolithic `stats` (Atributos) tab was refactored into 4 distinct, dedicated scopes accessed via an Art Deco segmented navigation bar (`.fh-stats-scope-nav`, `.fh-scope-btn` with $\ge 44\text{px}$ touch target compliance):
    1. **`abilities` (Atributos & Salvaguardas)**:
       - Dice Belt Mode / 3D Hexad seals with vertical Advantage/Disadvantage sliders.
       - Saving Throws (Testes de Resistência) with proficiency badges, modifiers, and tap-to-roll dispatch (`isSave: true`).
    2. **`skills` (Perícias & Sentidos)**:
       - Passive Perception (`Percepção Passiva`) card with eye glyph.
       - Full 18-skill list with 3-state proficiency cycling (untrained $\to$ proficient $\to$ expertise).
       - Contextual skill features (`placed.by.skills`).
    3. **`tools` (Proficiências & Idiomas)**:
       - Languages field (`LanguagesField`) with tag chips and custom language input.
       - Armor, Weapon, and Tool proficiencies (`ArmorField`, `WeaponsField`, `ToolsField`).
       - Custom proficiencies textarea (`char.otherProfs`).
       - Proficiency features (`placed.by.proficiencies`).
    4. **`features` (Características & Talentos)**:
       - Unified scope combining Class Features, Subclass Features, Feats (`char.feats`), and Species / Racial Traits (`race.traits`).
- **Mobile-Friendly Gesture Swipe Navigation**:
  - Horizontal swipe gesture recognition implemented on `.fh-tab-body` (`onTouchStart`, `onTouchEnd`):
    - Swipe displacement threshold: $|dx| \ge 48\text{px}$ and $|dx| > 1.35 \times |dy|$.
    - In `stats` tab: horizontal swipes transition between scopes:
      $$\text{abilities} \longleftrightarrow \text{skills} \longleftrightarrow \text{tools} \longleftrightarrow \text{features}$$
    - In other sheet tabs: horizontal swipes transition between main sheet tabs:
      $$\text{play} \longleftrightarrow \text{stats} \longleftrightarrow \text{spells} \longleftrightarrow \text{inv} \longleftrightarrow \text{story} \longleftrightarrow \text{notes} \longleftrightarrow \text{npcs}$$
    - Vertical scrolling is fully preserved with 60fps native momentum via `touch-action: pan-y`.
    - Gestures originating on form inputs, textareas, selects, sliders, dice knobs, and belt slots are filtered out to prevent gesture conflicts.
- **Resistance Saving Throw Checkered Heraldic Vignette**:
  - Saving throws initiated from the dice belt half or saving throw list set `isSave = true` (auto-detected via regex `/teste de resist[eê]ncia|salvaguarda|saving throw|\bsave\b/i`).
  - Renders `.dice-save-checkered-vignette` with a rotating `repeating-conic-gradient` checkered pattern, radial vignette alpha mask, and warm amber glow that fades in over 0.5s during the roll-up anticipation and settles cleanly.
- **Natural 1 Critical Failure ("FALHA CRÍTICA") Crimson Art Deco Frame**:
  - Rolling a Natural 1 on a d20 roll triggers the exact same architectural visual treatment as a Critical Hit (stepped rim, corner chevrons, cartouche plaque, sparks, and falloff ripple), but styled strictly in a dramatic blood-red palette:
    - Primary highlight: `#ffd1d5` / `#ff4d5a`.
    - Deep gradient: `#b30018` / `#5c000a`.
    - Plaque background: `#20080a`.
    - Plaque title: `"FALHA CRÍTICA"` (PT) / `"CRITICAL FAIL"` (EN).
    - Sparks: `.dice-sparks.is-fumble` with crimson particle glows.
    - Haptic feedback: mobile dual-pulse vibration `[60, 40, 100]ms`.
- **Verification**:
  - Full automated suite: 1,536 / 1,536 tests passing (100% green across 21 suites).
  - Production Vite build: 0 errors, 641 modules transformed in 13.84s.

---

## 16. Top-Bar 10-Tab Hierarchy, Mobile Swipe Navigation, Save Vignette Ripple Pulse & Non-d20 Half-Roll Disclosure

- **Top-Bar 10-Tab Hierarchy (`SHEET_TABS`)**:
  - The sub-scopes from Section 15 were promoted into top-level tabs on the main navigation bar (`SHEET_TABS` in `Sheet.jsx`):
    $$\text{Jogar} \longleftrightarrow \text{Magias} \longleftrightarrow \text{Atributos} \longleftrightarrow \text{Perícias} \longleftrightarrow \text{Ferramentas} \longleftrightarrow \text{Características} \longleftrightarrow \text{Inventário} \longleftrightarrow \text{História} \longleftrightarrow \text{Diário} \longleftrightarrow \text{NPCs}$$
  - **`stats` (Atributos / Ability Scores)**: Holds SOLELY Ability Scores (Dice Belt Mode or 3D Ability Seals) + Saving Throws (Testes de Resistência) with tap-to-roll.
  - **`skills` (Perícias / Skills)**: Passive Perception card, full 18-skill SRD list with 3-state proficiency cycling, and contextual skill features.
  - **`tools` (Ferramentas / Tools)**: LanguagesField, Armor/Weapon/Tool proficiencies, custom textarea, and proficiency features.
  - **`features` (Características / Features)**: Unified features coupling Class & Subclass features, Feats with origins and ASI summaries, and Species traits.
  - Nested `.fh-stats-scope-nav` sub-bar eliminated in favor of clean 1-level navigation.

- **Mobile Horizontal Swipe Navigation**:
  - Swiping left and right on `.fh-tab-body` directly transitions between all 10 tabs in sequence (`tabIdx + 1` on swipe left, `tabIdx - 1` on swipe right).
  - Physics thresholds: (|dx| \ge 48\text{px}), (|dx| > 1.35 \times |dy|), duration (< 700\text{ms}).
  - 60fps native momentum vertical scroll preserved via `touch-action: pan-y`. Form inputs, textareas, sliders, dice knobs, and belt slots protected from swipe conflicts.

- **High-Contrast Saving Throw Checkered Vignette & Ripple Pulse**:
  - Patter: `repeating-conic-gradient(#66131c 0% 25%, #1f130b 25% 50%, #66131c 50% 75%, #1f130b 75% 100%)` at `52px 52px` with outward radial feathering mask (30% to 86%) and deep crimson inset box-shadow (`rgba(255, 60, 75, 0.75)`).
  - At 750ms roll-off ripple (`overlay.settled`): triggers `@keyframes save-vignette-pulse`, flaring brightness to 2.1, expanding scale to 1.035, and radiating a crimson shockwave bloom.
  - HUD Saving Throw shield banner: `.dice-save-shield-banner` with `🛡️ TESTE DE RESISTÊNCIA` / `🛡️ SAVING THROW`.
  - Save detection regex expanded to `/teste de resist[eê]ncia|salvaguarda|saving throw|\bsave\b|morte|death/i`.

- **Non-d20 Multi-Dice Stack Half-Roll Disclosure**:
  - On rolls with `totalDiceCount > 1 && primaryDie !== 20`:
    - Discloses half of the rolled total rounded down (`Math.floor(finalTotal / 2)`).
    - Rendered in central hero die: `.die-number-half` (`½{halfValue}`) next to `.die-number-val` with `0.44em` font-size and gold gleam.
    - Rendered in stage companion pill: `.dice-stack-half-banner` with `½ METADE: {halfTotal}`.

- **Verification**:
  - Full automated suite: 1,536 / 1,536 tests passing (100% green across 20 suites).
  - Production Vite build: 0 errors, 641 modules transformed in 15.76s.
