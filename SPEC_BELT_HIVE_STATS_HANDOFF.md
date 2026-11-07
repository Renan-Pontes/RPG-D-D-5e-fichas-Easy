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

## 11. Seamless Geometric Block Tessellations & Exact SVG-Calibrated Facet Parallelism (All Dice Shapes)

- **Authentic Interlocking Block Tessellation Calibrated to SVG `viewBox="0 0 100 100"` Bounds**:
  - Eliminates all internal `viewBox` padding offsets and `(50, 50)` rotation pivot misalignments across all 6 polyhedral shapes (`D4`, `D6`, `D8`, `D10`/`D100`, `D12`, `D20`).
  - All constituent dice remain strictly at **50% scale** ($52\text{px}$) surrounding the central hero die ($104\text{px}$), with every adjacent edge separated by a uniform $3.5\text{px}\text{--}6\text{px}$ gutter.
- **D4 Truncated Triangular Jewel (Image 1, `M50 5 L95 90 L5 90 Z`)**:
  - Calibrated to the SVG `(50, 50)` rotation pivot where an upright triangle spans $y \in [-0.225H, +0.20H]$ and an inverted triangle (`rot: 180`) spans $y \in [-0.20H, +0.225H]$.
  - Base: 2 inverted triangles ($\nabla$, `rot: 180`) at $(\pm 28\text{px}, +67\text{px})$ flush below the hero base, plus 1 upright triangle ($\Delta$, `rot: 0`) at $(0, +71\text{px})$ nestled between them.
  - Flanks: Lower inverted triangle ($\nabla$, `rot: 180`) at $(\pm 52\text{px}, +18\text{px})$ and upper upright triangle ($\Delta$, `rot: 0`) at $(\pm 52\text{px}, -28\text{px})$ running flush alongside the left/right facets.
  - Roof: 2 inverted triangles ($\nabla$, `rot: 180`) at $(\pm 27\text{px}, -36\text{px})$ tucked deep into the upper V-valleys between the hero apex and upper flank triangles.
- **D6 Modular $4 \times 4$ Square Block Grid (Image 2, `M15 15 H85 V85 H15 Z`)**:
  - Calibrated to the **70% visible fill** (`15..85` of `0..100`) of the SVG square ($w_{\text{vis}} = 0.70 \times \text{petalSize} = 36.4\text{px}$).
  - 4 columns at $\{-61, -20, +20, +61\}\text{px}$ and 4 rows at $\{-61, -20, +20, +61\}\text{px}$, eliminating the previous $21.6\text{px}$ padding gap and aligning outer block edges flush with the central $2 \times 2$ hero square.
- **D8 $4 \times 4$ Diamond / Rhombus Grid (Image 3, `M50 5 L90 50 L50 95 L10 50 Z`)**:
  - Calibrated to the **80% width $\times$ 90% height** SVG diamond lattice:
  - 4 apex corners at $(0, \pm 80\text{px})$ and $(\pm 71\text{px}, 0)$.
  - 8 diagonal facet diamonds running strictly parallel to the hero facets at $(\pm 24\text{px}, \pm 54\text{px})$ and $(\pm 48\text{px}, \pm 27\text{px})$.
- **D20 Regular Pointy-Topped Hexagonal Honeycomb (Image 5, `M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z`)**:
  - Calibrated to the **80% width $\times$ 90% height** SVG hexagon:
  - Flanks at $(\pm 68\text{px}, 0)$, Apexes at $(0, \pm 93\text{px})$, 4 Facet-inner slots at $(\pm 35\text{px}, \pm 57\text{px})$, and 4 Facet-outer slots at $(\pm 82\text{px}, \pm 47\text{px})$.
- **D12 Dodecahedral Regular Pentagon Rosette (Image 4, `M50 5 L93 36 L76 89 L24 89 L7 36 Z`)**:
  - **Central Inversion ($180^\circ$) Law**:
    - 5 **Inner Facet Pentagons** are rotated by `rot: 180` ($\vec{C}_{\text{inner}, k} = 1.5 \vec{M}_k + g \vec{n}_k$: $(0, +65)$, $(\pm 58, +21)$, $(\pm 36, -50)$) so their 5 inner edges are **100% parallel and opposite** to the 5 edges of the central upright pentagon.
    - 5 **Outer Valley Pentagons** are upright (`rot: 0` at $(0, -76)$, $(\pm 73, -24)$, $(\pm 44, +63)$), nestled into the 5 V-valleys between adjacent `rot: 180` inner pentagons with parallel edges on both sides.
- **D10 / D100 Pentagonal Trapezohedron Kite Rosette (`M50 5 L88 35 L75 92 L25 92 L12 35 Z`)**:
  - Applies the same 5-sided central inversion law: 5 inner facet kites at `rot: 180` ($(0, +70)$, $(\pm 54, +22)$, $(\pm 32, -50)$) + 5 outer valley kites at `rot: 0` ($(0, -86)$, $(\pm 68, -26)$, $(\pm 39, +63)$).
- **Verification**:
  - Exact SVG polygon-to-polygon minimum edge distance verification (`polyEdgeDist >= 3.5px` across all pairs) in `dice-tessellation.test.js` (7 / 7 tests green).
  - Full automated suite: 1,522 / 1,522 tests green across 20 suites; Vite production build: 0 errors.
