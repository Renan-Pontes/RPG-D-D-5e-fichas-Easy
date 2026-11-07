# Architecture Decision Records (ADRs) — Forja de Heróis

> **Repository Baseline:** D&D 5e Character Forge & Table Operating System  
> **Status:** Current & Maintained  
> **Format:** MADR (Markdown Architectural Decision Records)

---

## Index of Architectural Decisions

- [ADR-0001: Pivot from Express/Socket.io to Django/DRF for PythonAnywhere Deployment](#adr-0001-pivot-from-expresssocketio-to-djangodrf-for-pythonanywhere-deployment)
- [ADR-0002: Dual-Rules Progression Engine (D&D 2024 / SRD 5.2.1 and D&D 2014 / SRD 5.1)](#adr-0002-dual-rules-progression-engine-dd-2024--srd-521-and-dd-2014--srd-51)
- [ADR-0003: ETag Pulse & Conditional HTTP Polling Architecture in Lieu of WebSockets](#adr-0003-etag-pulse--conditional-http-polling-architecture-in-lieu-of-websockets)
- [ADR-0004: Server-Side Gated Dice Rigging FIFO Queue with Invisible Substitution](#adr-0004-server-side-gated-dice-rigging-fifo-queue-with-invisible-substitution)
- [ADR-0005: Unified Mesa Stage Event Bus Consolidating Disparate Screen Handlers](#adr-0005-unified-mesa-stage-event-bus-consolidating-disparate-screen-handlers)
- [ADR-0006: Open5e SRD 5.2.1 Ingestion Pipeline with Deterministic Portuguese Translation](#adr-0006-open5e-srd-521-ingestion-pipeline-with-deterministic-portuguese-translation)
- [ADR-0007: GM Party Insights SWOT & 11-Dimensional Tactical Role Radar Engine](#adr-0007-gm-party-insights-swot--11-dimensional-tactical-role-radar-engine)
- [ADR-0008: Canvas VTT Coordinate Grid, Fog of War, and Dynamic Token Positioning](#adr-0008-canvas-vtt-coordinate-grid-fog-of-war-and-dynamic-token-positioning)
- [ADR-0009: 3-Page Official Form-Fillable PDF Roundtrip Import/Export Engine](#adr-0009-3-page-official-form-fillable-pdf-roundtrip-importexport-engine)
- [ADR-0010: Hexagonal 3-4-3 Honeycomb Stat Grid with Directional Swipe Advantage](#adr-0010-hexagonal-3-4-3-honeycomb-stat-grid-with-directional-swipe-advantage)
- [ADR-0011: Geometric Polyhedral Tessellation & Synchronized 3-Phase Juicy Roll Choreography](#adr-0011-geometric-polyhedral-tessellation--synchronized-3-phase-juicy-roll-choreography)
- [ADR-0012: 20-Dice Multi-Ring Tessellation Lattices, Bilateral Mirror Symmetry, and Decoupled Hood-Gesture Ability Drag](#adr-0012-20-dice-multi-ring-tessellation-lattices-bilateral-mirror-symmetry-and-decoupled-hood-gesture-ability-drag)
- [ADR-0013: Zero-Collision Geometric Calibration via Separating Axis Theorem (SAT) Across All Dice Types (N = 2..20)](#adr-0013-zero-collision-geometric-calibration-via-separating-axis-theorem-sat-across-all-dice-types-n--220)

---

## ADR-0001: Pivot from Express/Socket.io to Django/DRF for PythonAnywhere Deployment

### Status
Accepted (Supersedes initial Node prototype)

### Context
The initial v2 backend prototype was implemented in Node.js (Express, Prisma, SQLite, Socket.io). However, operational deployment requirements explicitly specified PythonAnywhere as the primary zero-cost production hosting platform alongside Vercel for the frontend. PythonAnywhere's WSGI hosting environment does not natively run long-lived Node.js servers.

### Decision Drivers
- Zero-cost, low-maintenance deployment target (PythonAnywhere free/hacker tier).
- Strong relational ORM and built-in administrative dashboard for table management.
- Robust security foundations (cookie-based sessions, CSRF protection, password hashing).

### Decision Outcome
Replace the Express server entirely with Django 5 and Django REST Framework (DRF), retaining the declarative progression logic in JavaScript on the frontend and creating an identical validation mirror in Python on the backend.

### Consequences
- **Positive:** Seamless deployment to PythonAnywhere via WSGI; native Django admin interface for campaign moderation and user support; zero external Node infrastructure costs.
- **Negative:** Real-time WebSockets from Socket.io had to be re-architected into an HTTP polling pattern (see ADR-0003).

---

## ADR-0002: Dual-Rules Progression Engine (D&D 2024 / SRD 5.2.1 and D&D 2014 / SRD 5.1)

### Status
Accepted

### Context
With the release of the 2024 revised 5th Edition rules (SRD 5.2.1), character creation and advancement diverged significantly: subclasses moved to level 3 across all classes, ability score increases derive from Backgrounds rather than Species, Origin Feats were introduced, and weapon masteries were standardized. Existing user characters created under 2014 rules could not be forcibly converted without breaking character sheets.

### Decision Drivers
- Support cutting-edge D&D 2024 rules out-of-the-box for all new characters.
- Guarantee 100% backward compatibility for legacy 2014 characters without corruption.
- Single codebase maintaining both progression tracks with zero duplication of UI components.

### Decision Outcome
Introduce an explicit `rulesVersion: '2024' | '2014'` field on the Character schema. Create parallel progression rule descriptors (`PROGRESSION_RULES_2024` and legacy rules) with a unified, idempotent engine (`applyAutosToCharacter`). Class options pools in `data/class-options/` define version filters (`rules: '2024' | '2014'`).

### Consequences
- **Positive:** Complete fidelity to official rules; existing campaigns continue uninterrupted; new players enjoy modern 2024 character creation.
- **Negative:** Engine complexity increases with dual validation checks; test suite must cover both rule paths across all 12 classes (1515+ tests).

---

## ADR-0003: ETag Pulse & Conditional HTTP Polling Architecture in Lieu of WebSockets

### Status
Accepted

### Context
PythonAnywhere free and standard plans do not support WebSocket connections or asynchronous ASGI event loops (Django Channels). The application requires real-time coordination for live combat turns, DM dice reveals, and TV screen updates.

### Decision Drivers
- Absolute compliance with hosting constraints.
- Responsive experience during live combat ($\le 2.5\text{s}$ latency).
- Avoid server CPU quota exhaustion caused by continuous polling requests.

### Decision Outcome
Implement a hybrid polling architecture:
1. Standard polling interval of 2.5 seconds, paused when the browser tab is hidden (`document.visibilityState === 'hidden'`).
2. Introduction of the `/api/campaigns/:slug/pulse` endpoint: returns an ETag / Last-Modified hash of the campaign state. If no state change occurred, the server immediately returns `304 Not Modified` with an empty payload, bypassing database serialization.

### Consequences
- **Positive:** Production stability on PythonAnywhere without hitting CPU tarpits; reliable updates across players and TV screens.
- **Negative:** Up to 2.5s propagation delay for non-critical events; higher request count than native persistent sockets.

---

## ADR-0004: Server-Side Gated Dice Rigging FIFO Queue with Invisible Substitution

### Status
Accepted

### Context
DMs frequently require dramatic control over live dice outcomes for narrative pacing (e.g., ensuring a villain's hit lands or giving a struggling player an epic moment). However, players must never feel their rolls are manipulated or suspect unfair intervention.

### Decision Drivers
- Complete narrative empowerment for the DM.
- Absolute secrecy from the player client (zero client-side rigging indicators).
- Transparent logging and auditability for the DM.

### Decision Outcome
Create the `DiceRig` model storing a FIFO queue of pre-arranged roll results linked to a `target_user` and `dice_type`. When a player rolls through the application, the roll endpoint consumes from the queue server-side. The player receives normal roll JSON, while the `rigged: true` flag and audit trail are logged strictly in `DiceLog`, queryable only by the DM.

### Consequences
- **Positive:** Smooth narrative flow; zero client-side trace of tampering; full DM visibility and control.
- **Negative:** Players must roll via app-integrated dice actions rather than external physical dice for rigging to take effect.

---

## ADR-0005: Unified Mesa Stage Event Bus Consolidating Disparate Screen Handlers

### Status
Accepted

### Context
Historically, at least 11 different screens and modals (combat, checks, handouts, map, world cards, dramatic rolls) dispatched content to the TV screen via separate endpoints and distinct data structures. This created inconsistent layouts, race conditions, and heavy cognitive load on the DM.

### Decision Drivers
- Single, predictable source of truth for what appears on the table screen.
- Fast, one-click DM controls to project cards, maps, combat, or atmosphere.
- Clean separation between DM workspace and public screen projection.

### Decision Outcome
Introduce the **Stage & Mesa Architecture** (`views_campaigns.campaign_stage` and `frontend/src/stage/`):
- A unified stage state: `{ foreground, background, history, sceneId, mode }`.
- Universal DM controls: "Show on Screen" (▶), "Clear" (🧹), "Undo" (↶), and "Contrast Toggle" (◐).
- `/tv/<token>` screen acts as a pure reactive receiver of the Stage bus.

### Consequences
- **Positive:** Unified operational mental model for the DM; instantaneous screen updates; clean decoupling between private DM prep and public player display.
- **Negative:** Migration required refactoring legacy tab-based handlers into the new unified Stage schema.

---

## ADR-0006: Open5e SRD 5.2.1 Ingestion Pipeline with Deterministic Portuguese Translation

### Status
Accepted

### Context
Manual entry of 300+ monster statblocks is error-prone. The project required the complete SRD 5.2.1 bestiary (CR 0–30) with structured actions, recharge mechanics, and legendary actions, localized into Brazilian Portuguese without violating copyright or presenting unverified machine translations as official text.

### Decision Drivers
- High-integrity automated ingestion from authoritative open data sources.
- Structured mechanics (attacks, damage types, saving throws, DCs) that drive automated VTT rolls.
- Clear distinction between official English rules text and original Portuguese localization.

### Decision Outcome
Develop `scripts/import-open5e-monsters.mjs` restricted strictly to `document__key=srd-2024`. Synthesize Portuguese names and ability terms through `scripts/monster-names-pt.mjs` using official glossary conventions, outputting `frontend/data/monsters-srd521.js` with 331 structured creatures.

### Consequences
- **Positive:** Instant access to 331 official 2024 creatures; zero manual data-entry errors; fully runnable attacks in combat.
- **Negative:** Supplement non-SRD creatures must still be entered manually with user-provided numbers.

---

## ADR-0007: GM Party Insights SWOT & 11-Dimensional Tactical Role Radar Engine

### Status
Accepted

### Context
Preparing balanced, engaging sessions requires DMs to understand party composition, weaknesses, damage types, and skill gaps. DMs lacked a real-time analytical overview of party capabilities.

### Decision Drivers
- Zero-cost client-side evaluation (runs in browser without expensive backend analytics).
- Grounded in official D&D math (bounded accuracy, spell slots, saving throw proficiencies).
- Actionable GM output (tailored challenge suggestions, spotlight recommendations).

### Decision Outcome
Build `frontend/src/metrics/party-metrics.js`:
- Maps characters against 11 core roles (Damage, Mitigation, Magic, Healing, Ranged, Melee, Control, Utility, Mobility, Social, Exploration) with base ratings adjusted by actual character attributes, feats, and spells.
- Cross-references party damage types with the SRD bestiary to calculate monster vulnerability and resistance matching.
- Generates algorithmic SWOT analysis and spotlight prompts ("Give Floyd a social scene: Persuasion +7").

### Consequences
- **Positive:** Dramatically accelerates session prep; highlights character strengths; prevents accidental party wipes from overlooked damage immunities.
- **Negative:** Spells without structured damage tags require manual classification via `spell-effects.js`.

---

## ADR-0008: Canvas VTT Coordinate Grid, Fog of War, and Dynamic Token Positioning

### Status
Accepted

### Context
Combat in D&D requires spatial visualization. Third-party VTTs require heavy configuration and separate accounts. Forja de Heróis needed a low-overhead, built-in tactical grid supporting map backgrounds, token movement, and fog of war directly visible on the table TV.

### Decision Drivers
- Ultra-low latency on mobile devices and 1080p TV screens.
- Zero complex WebGL dependencies; lightweight HTML5 Canvas / SVG rendering.
- DM-controlled fog of war and player token self-positioning.

### Decision Outcome
Implement `CombatGrid.jsx` utilizing responsive 2D canvas with panning, zooming, snap-to-grid, and coordinate conversion (`worldToCanvas` / `canvasToWorld`). Maps and tokens are stored as lightweight URLs rather than heavy inline base64 strings in the combat payload.

### Consequences
- **Positive:** High performance across all devices; seamless integration with the initiative tracker and HP management.
- **Negative:** Advanced dynamic lighting and 3D line-of-sight are out of scope to maintain simplicity and mobile performance.

---

## ADR-0009: 3-Page Official Form-Fillable PDF Roundtrip Import/Export Engine

### Status
Accepted

### Context
Players frequently need physical printouts or want to import character sheets created in D&D Beyond or official fillable PDFs. Proprietary formats create vendor lock-in.

### Decision Drivers
- Strict compatibility with the official 3-page fillable D&D 5e character sheet.
- Lossless roundtrip import and export.
- Graceful overflow handling for spell-heavy and high-feature characters.

### Decision Outcome
Implement `frontend/src/pdf/export-pdf.js` and `import-pdf.js` using `pdf-lib`. Field coordinate mappings are extracted from the official PDF via `scripts/extract_dnd5e_sheet_layout.py`. When content overflows standard lines, the engine automatically synthesizes continuation sheets matching the official typography and styling.

### Consequences
- **Positive:** Total data sovereignty; print-ready official PDFs; instant onboarding from existing PDF sheets.
- **Negative:** Flattened or scanned PDFs without interactive form fields cannot be parsed.

---

## ADR-0010: Hexagonal 3-4-3 Honeycomb Stat Grid with Directional Swipe Advantage

### Status
Accepted (In Active Refinement)

### Context
Standard vertical or horizontal ability score blocks consume excessive vertical viewport space on mobile devices and require multiple modal taps to configure advantage or disadvantage.

### Decision Drivers
- Optimal mobile ergonomics with tactile, intuitive gestures.
- Distinct split affordances for Ability Checks vs Saving Throws.
- Direct integration with the Quick Dice Belt.

### Decision Outcome
Adopt a regular hexagonal lattice ($H = W \times 1.1547$) in a 3–4–3 staggered geometry (`SPEC_BELT_HIVE_STATS_HANDOFF.md`):
- Row 1: Physical stats (`Str`, `Dex`, `Con`).
- Row 2: 4 empty hex slots reserving a guaranteed clear-zone for the Quick Dice Belt.
- Row 3: Mental stats (`Int`, `Wis`, `Cha`).
- Left half = Ability Check; Right half = Saving Throw.
- Swipe $\uparrow$ = Advantage; Swipe $\downarrow$ = Disadvantage; Hold crest = Bind modifier to belt.

### Consequences
- **Positive:** Compact footprint; one-gesture rolling with advantage/disadvantage; zero modal clutter.
- **Negative:** Requires precise CSS clip-path alignment and touch gesture cancellation to prevent mobile scroll interference.

---

## ADR-0011: Geometric Polyhedral Tessellation & Synchronized 3-Phase Juicy Roll Choreography

### Status
Accepted

### Context
Multi-dice rolls (e.g. `10d10`, `10d8`, `5d6`, `7d12`) and modifier-enhanced d20 rolls previously rendered as flat horizontal rows that popped onto the screen abruptly, lacked tactile anticipation, and used inconsistent per-die color palettes.

### Decision Drivers
- Authentic geometric block tessellations where 50% scale constituent dice dock side-to-side around the central hero die with uniform symmetric gutters on both X and Y axes and zero non-uniform polygon warping.
- Consistent UI/UX color language across all polyhedral shapes: Golden by default, Emerald Green for Advantage (`tone-adv`), and Crimson Red for Disadvantage (`tone-dis`).
- Visceral, well-timed animation choreography: smooth 0.5s fade-in, calm zero-wobble start, accelerating shake frequency/strength and motion blur, randomized faster catch-up on neighboring dice, and an instant 750ms climax punch with a single powerful glowing ripple.

### Decision Outcome
Implement two pure, unit-tested mathematical modules (`frontend/src/dice/dice-tessellation.js` and `frontend/src/dice/dice-rollup.js`) driving `DiceStage.jsx` and `DieShape.jsx`:
1. **Regular Polygon Geometry & Symmetric Block Tessellation (`dice-tessellation.js`)**: Exact regular polygons (`D4` equilateral triangle, `D6` square, `D8` 45° diamond, `D10/D12/D100` regular pentagon, `D20` pointy-topped regular hexagon) with 50% constituent scale and verified polygon-to-polygon minimum edge distances.
2. **Smooth 0.5s Roll-Up Interface Fade-In (`FADEIN_DURATION_MS = 500`, `computeFadeInProfile`)**: Fades in both the overlay and the stage container from `opacity: 0, scale: 0.94` to `opacity: 1, scale: 1` over `500ms`.
3. **Randomized Neighboring Catch-Up (`computeNeighborRollupSchedule`)**: Shuffles completion order across neighboring dice (`finishP in [0.35, 1.00]`) so nested dice unravel their individual numbers along the central roll-up and finish in exact sync at `750ms`.
4. **Synchronized Climax & Single Powerful Glowing Ripple (`ROLLUP_DURATION_MS = 750`, `LAND_HOLD_MS = 0`, `computeFalloffProfile`)**: At `750ms`, motion blur cuts to `0`, the final rolled number reveals, the elastic punch (`220ms`) fires, and a single powerful glowing ripple (`1050ms`) outstretches in `easeOutRipple` and smoothly fades away.

### Consequences
- **Positive:** Cohesive, high-craft tabletop feel; zero visual noise from extra rings; deterministic unit-testable math in Node without DOM dependencies.
- **Negative:** Requires keeping CSS custom properties (`--rollup-fadein-*`, `--shake-*`, `--falloff-*`) synchronized with the `requestAnimationFrame` loop in `DieShape.jsx`.

---

## ADR-0012: 20-Dice Multi-Ring Tessellation Lattices, Bilateral Mirror Symmetry, and Decoupled Hood-Gesture Ability Drag

### Status
Accepted

### Context
When rolling high quantities of dice simultaneously (up to 20 dice, e.g. `20d6` sneak attacks, `10d10`, `9d12`), prior tessellation engines clamped slots at 9–12 dice, causing overflow to stack at `(0, 0)`. Furthermore, outer rings in pentagonal rosettes had insufficient clearance ($D_{\text{outer}} = 82\text{px}$), causing visual overlap, and odd-count pick orders (e.g. $N = 9$ on D12 or D6) produced asymmetric "missing-tooth" or single-corner defects. Separately, ability-to-belt assignment dragging was tangled with the vertical stance slider on the brass spherical badge, causing trailing guide rings to render offset.

### Decision Drivers
- Full geometric compatibility scaling smoothly from $N = 2$ up to $N = 20$ across all 7 dice types (`D4`, `D6`, `D8`, `D10`, `D12`, `D20`, `D100`).
- Generous, balanced breathing gutters ($g \approx 9.5\text{px}$) with identical repeating edge-to-edge distances between hero and Ring 1, and between Ring 1 and Ring 2.
- Strict bilateral mirror symmetry ($X \leftrightarrow -X$) across the vertical axis for all odd counts (e.g. $N = 9$), eliminating lonely corner defects.
- Complete separation of tactile concerns: the spherical brass head (`.fh-belt-badge`) is exclusively the vertical stance slider; "the hood" (`.fh-belt-header`) is the trigger for ability-to-belt drag tracking.
- Live-locked concentric contour ring with zero pixel offset.

### Decision Outcome
1. **20-Slot Multi-Ring Lattice Engine (`dice-tessellation.js`)**:
   - `heroSize = count > 12 ? 86 : 104`, `petalSize = Math.round(heroSize * 0.5)` (strictly 50% scale), `gutter = count > 12 ? 8.0 : 9.5`.
   - **D12 / D10 / D100**: Outer valley pentagons calibrated to $D_{\text{outer}} = \text{round}(D_{\text{inner}} \times 1.312) \approx 86.95\text{px}$ with radially stepped rotations (`innerRots = [180, 108, 36, 324, 252]`, `outerRots = [0, 72, 144, 216, 288]`), giving uniform $g = 9.5\text{px}$ gaps everywhere and ensuring facet pentagons align parallel to the central edges. Ring 3 adds 10 second-tier pentagons for $N = 11..20$.
   - **D6**: 20 slots forming an interlocking Greek-cross perimeter frame with identical horizontal and vertical $g$ gutters.
   - **D8**: 20 slots forming a 4-fold diagonal diamond lattice ($d_1 .. d_4$).
   - **D4**: 20 slots forming an equilateral triangular lattice with 3-axis perpendicular distance $g$.
   - **D20**: 20 slots forming a 3-tier hexagonal honeycomb with facet distance $D_1 + 2 A_P + g$ and apex distance $D_2 + 2 R_P + g$.
2. **Bilateral Mirror Symmetry for Odd Counts**:
   - For $N = 9$, D12 selects 5 inner facets + 2 Upper Flank valleys + 2 Lower Flank valleys (`sumX = 0.00`). D6 selects 8 edges + 1 centered top crown at $X = 0$ (`sumX = 0.00`). Left and right sides are 100% mirror images.
3. **Decoupled Hood-Gesture & Live-Locked Contour Ring**:
   - In `Sheet.jsx`: `.fh-belt-header` handles pointer hold ($\ge 110\text{ms}$) and drag ($> 4\text{px}$) for belt assignment, while quick tap toggles active bind.
   - The brass badge (`.fh-belt-badge`) is purely the Advantage/Disadvantage slider.
   - In `.fh-belt-drag-overlay`: reads `document.querySelector('.fh-belt-badge[data-ability-badge="..."]').getBoundingClientRect()` live on every frame, mathematically locking `(cx, cy, r)` to the live spherical head with 0px offset.
   - In `BeltAbilities`: quick slots count上限 expanded from 9 to 20 (`count: Math.min(20, s.count + delta)`), and roll label updated to `${rollCount}d${s.die}`.

### Consequences
- **Positive:** Uncompromised aesthetic harmony up to 20 dice; zero collision or cramping; tactile gestures are completely disambiguated; 100% unit-tested math.
- **Negative:** Viewport scale drops slightly from 104px to 86px when rolling $> 12$ dice to maintain safe stage bounds.

---

## ADR-0013: Zero-Collision Geometric Calibration via Separating Axis Theorem (SAT) Across All Dice Types (N = 2..20)

### Status
Accepted

### Context
When testing multi-dice tessellation scaling up to 20 dice across real SVG polyhedral paths, visual inspection of high-dice rolls revealed edge collisions in 3 specific dice types:
1. **D20 Pointy-Topped Hexagonal Honeycomb (total = 151)**: Corner valley hexagons at $30^\circ$ were placed at $D_{\text{outer}} = 82.8\text{px}$, which was inside the clearance radius of the adjacent facet hexagons at $0^\circ$ and $60^\circ$ ($41.4\text{px} < 2 A_P = 40.53\text{px}$), resulting in 118 polygon-level collision warnings.
2. **D6 Modular Square Grid (total = 74)**: On odd counts $N \in \{11, 15, 17\}$, slot 20 (`top-crown-center` at $X = 0, Y = -cTier2$) was placed on the exact same row as slot 12 ($X = -cInner$) and slot 13 ($X = +cInner$), crowding three $36.4\text{px}$ squares into a $46\text{px}$ span and causing dark overlapping bands.
3. **D4 Equilateral Triangular Jewel (total = 50)**: Ring 2 flank and roof coordinates placed inverted triangles directly over adjacent upright flank triangles, generating 56 polygon intersections.

### Decision Drivers
- **Zero Collision Guarantee**: Every shape within the composition must respect all adjacent shapes' tangents and bounding contours without intersection.
- **Strict Minimum Breathing Clearance**: All adjacent shapes must maintain a positive breathing distance $d \ge 5.0\text{px}$ (calibrated to $9.5\text{px}$ for $N \le 12$ and $6.6\text{px}$ for $N > 12$).
- **Bilateral Mirror Symmetry**: Every count $N \in [2, 20]$ must maintain $\sum X = 0$ with equal numbers of left and right slots.

### Decision Outcome
1. **Separating Axis Theorem (SAT) Automated Audit**:
   - Implemented an exact convex polygon SAT intersection algorithm alongside segment-to-point edge distance measuring in [`frontend/tests/dice-tessellation.test.js`](file:///f:/AI_Resources/DND_HeroesForge/frontend/tests/dice-tessellation.test.js), verifying all $7 \times 19 = 133$ layouts across all dice types and counts.
2. **D20 Honeycomb Expansion Calibration**:
   - $D_{\text{outer}} = \text{round}(D_{\text{inner}} \times 1.394) = 98.0\text{px}$ (at $S_H = 104$).
   - $D_{\text{tier3Facet}} = \text{round}(D_{\text{inner}} + 2 A_P + 2 g) = 129.8\text{px}$.
   - $D_{\text{tier3Apex}} = \text{round}(D_{\text{outer}} + 2 R_P + 2 g) = 163.8\text{px}$.
   - Distance to both adjacent facet hexagons is exactly $9.2\text{px}$; distance to central hero is $27.8\text{px}$. Total collisions: `0`.
3. **D6 Odd-Count Perimeter Pick Order Resolution**:
   - For odd counts $N \in \{11, 15, 17, 19\}$, picking slot 20 (`top-crown-center` at $X = 0$) pairs exclusively with bottom outer slots (`bot-out-left` and `bot-out-right` at $Y = +cTier2$) and outer flank slots at $X = \pm cTier2$. Slots 12 and 13 on row $Y = -cTier2$ are strictly omitted whenever slot 20 is present. Total collisions: `0`.
4. **D4 Equilateral Triangular Jewel Horizontal Baseline Lattice**:
   - Formulated all 20 slots on a horizontal baseline triangular lattice:
     - Ring 1: 9-triangle jewel (2 base inverted, 1 base apex, 4 side flanks, 2 top roof).
     - Ring 2: 3 top crown at $Y = -1.6 h_2$, 4 outer flanks, 2 bottom wings, 2 bottom tier-2 pedestal uprights at $Y = y_{\text{bot}} + h_2$.
   - Symmetrical pick orders guarantee $\sum X = 0$ for all counts $N \in [2, 20]$ with zero collisions and $d = 9.50\text{px}$ (scaled to $6.61\text{px}$). Total collisions: `0`.

### Consequences
- **Positive:**
  - 100% clean SAT audit: `TOTAL COLLISIONS DETECTED: 0` across all 7 dice types and all counts $N \in [2, 20]$.
  - Global minimum edge distance across all 133 layouts is $d \ge 6.22\text{px}$ (and up to $9.50\text{px}$).
  - All 1,536 frontend unit tests pass; production build transforms cleanly in 16s.
- **Negative:**
  - Outer bounds for D20 and D4 expand slightly, safely accommodated by dynamic stage sizing (`stageWidth`, `stageHeight`).

---

## ADR-0014: 25% Larger Dice Belt Mode for Prominent Screen Utilization

### Status
Accepted

### Context
User requested making the dice belt mode 25% larger to better utilize available screen size across desktop, tablet, and mobile viewports. The interactive belt (`.ficha .fh-belt`) houses 6 ability score hexads with Advantage/Disadvantage sliders, 1 solid gold Proficiency Bonus master medal, and 3 quick roll polyhedral slots with drag-to-bind assignments.

### Decision Drivers
- **Strict 25% Visual & Structural Growth**: Increase dimensions by exactly 25% without distorting proportions or breaking the 30/60 degree hexagonal geometry.
- **Flawless Touch & Drag Alignment**: Ensure the live-locked green contour ring and trailing guide overlay scale synchronously with 0px offset.
- **Zero Overflow & Full Responsive Preservation**: Ensure comfortable breathing space in desktop panels and mobile viewport clamps (`@media (max-width: 520px)`).

### Decision Outcome
1. **Core Honeycomb Grid Expansion**:
   - `--belt-w`: `clamp(70px, 13.5vw, 94px)` $\to$ `clamp(88px, 16.9vw, 118px)`.
   - `--belt-gap`: `5px` $\to$ `6px`.
   - Trigonometric derived variables `--belt-h` and `--belt-row-overlap` recalculate automatically.
2. **Mobile Clamping (`@media (max-width: 520px)`)**:
   - `--belt-w`: `clamp(62px, 18.2vw, 76px)` $\to$ `clamp(78px, 22.8vw, 95px)`.
   - `--belt-gap`: `3px` $\to$ `4px`.
   - Bonus numerals `.fh-honey-val`: `clamp(1.22rem, 4.0vw, 1.44rem)`.
   - Die silhouette `.fh-belt-die-badge`: `clamp(80px, 21.2vw, 95px)`.
   - Dice formula `.fh-belt-slot-dice`: `clamp(0.92rem, 2.9vw, 1.10rem)`.
3. **Internal Components & Typography (+25%)**:
   - Ability stud knob `.fh-belt-badge`: `clamp(30px, 4.8vw, 34px)`.
   - Slider guide track `.fh-belt-badge-track`: `5px` width, `32px` height, `top: calc(45% - 16px)`.
   - Stance displacement: shifted from $\pm 4\text{px}$ to $\pm 5\text{px}$.
   - Polyhedral silhouette `.fh-belt-die-badge`: `clamp(98px, 16.9vw, 115px)`.
   - Drag beacon halo/core: scaled to radii $r = 30$ and $r = 19$, with fallback anchor radius $17\text{px}$.
   - All typography (`.fh-honey-abbr`, `.fh-honey-score`, `.fh-honey-val`, `.fh-belt-pb-etched`, `.fh-belt-slot-dice`, `.fh-drag-beacon-text`) scaled up by 25%.

### Consequences
- **Positive:** Striking visual presence, enhanced legibility of dice formulas and score numbers, more comfortable thumb/mouse hit targets.
- **Negative:** Takes up 25% more vertical screen space in the stats panel, within acceptable margins on desktop and mobile.

## ADR-0015: Decoupled 4-Scope Stats Navigation, Gesture-Based Mobile Horizontal Swipe, Resistance Save Checkered Vignette, and Crimson Natural 1 Fumble Visuals

### Status
Accepted

### Context
The character panel's "Stats" (Atributos) tab historically combined multiple heterogeneous scopes (ability seals/belt mode, saving throws, skills, passive senses, weapon/armor/tool proficiencies, languages, class features, subclass features, feats, and racial traits) into a single vertically scrolling column. This created excessive cognitive load and required extensive vertical scrolling on mobile viewports.
Additionally:
1. Users requested a dedicated scope for each area: Ability Scores, Skills, Tools, and Features (unifying class features, feats, and racial traits).
2. Mobile navigation needed a fluid swipe gesture system allowing players to swipe left/right between scopes and sheet tabs instead of relying on vertical scrolling.
3. Resistance saving throws needed a dramatic heraldic checkered vignette effect during the roll-up animation.
4. Natural 1 ("Critical Failure") rolls needed visual parity with Critical Hits (Art Deco frame, stepped rim, chevrons, cartouche plaque, sparks, and ripple), executed in a crimson/blood-red palette.

### Decision Outcome
1. **Decoupled 4-Scope Stats Navigation (`STAT_SCOPES`)**:
   - `abilities`: Dice Belt mode, Ability Seals (Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma), and Saving Throws (Testes de Resistência) with proficiencies and tap-to-roll.
   - `skills`: Passive Perception, full 18-skill list with 3-state proficiency cycling (untrained, proficient, expertise), modifier rolls, and skill features (`placed.by.skills`).
   - `tools`: Languages (`LanguagesField`), Armor, Weapon, and Tool proficiencies, custom proficiencies textarea (`char.otherProfs`), and proficiency features (`placed.by.proficiencies`).
   - `features`: Unified scope coupling Class & Subclass features (`placed.by.other` + SRD level 1 + background feature), Feats (`char.feats`), and Species / Racial traits (`race.traits`).
   - Segmented navigation bar (`.fh-stats-scope-nav`) with accessible touch targets ($\ge 44\text{px}$), Art Deco glow states, and keyboard accessibility.
2. **Horizontal Swipe Navigation Gesture System**:
   - Enabled horizontal swipe gesture recognition on `.fh-tab-body` via `onTouchStart` and `onTouchEnd` with displacement thresholds ($|dx| \ge 48\text{px}$, $|dx| > 1.35 \times |dy|$).
   - In `stats` tab: horizontal swipes transition between the 4 scopes (`abilities` $\leftrightarrow$ `skills` $\leftrightarrow$ `tools` $\leftrightarrow$ `features`).
   - In root sheet tabs: horizontal swipes transition between tabs (`play` $\leftrightarrow$ `stats` $\leftrightarrow$ `spells` $\leftrightarrow$ `inv` $\leftrightarrow$ `story` $\leftrightarrow$ `notes` $\leftrightarrow$ `npcs`).
   - Native vertical scrolling preserved seamlessly via `touch-action: pan-y`, filtering out touches originating on inputs, sliders, dice knobs, and belt slots.
3. **Checkered Heraldic Vignette Effect for Resistance Saving Throws**:
   - Saving throw rolls automatically detected via regex `isSave = /teste de resist[eê]ncia|salvaguarda|saving throw|\bsave\b/i.test(label)`.
   - Rendered via `.dice-save-checkered-vignette` with a `repeating-conic-gradient` checkered pattern, radial vignette alpha mask, and glowing amber backdrop that fades in over 0.5s during the roll-up animation and settles smoothly.
4. **Crimson Art Deco Frame for Critical Failure (Natural 1)**:
   - Polyhedral d20 Natural 1 renders `.dice-artdeco-crit-frame.is-fumble`, `.artdeco-crit-text.is-fumble` ("FALHA CRÍTICA" / "CRITICAL FAIL"), `.dice-sparks.is-fumble`, and crimson ripple pulses using a blood-red palette (`#ffd1d5`, `#ff4d5a`, `#b30018`, `#5c000a`).
   - Haptic vibration feedback (`[60, 40, 100]ms`) dispatched for both crits and fumbles on supported mobile hardware.

### Consequences
- **Positive:** Greatly simplified cognitive hierarchy, zero vertical scroll fatigue on mobile, rich visual reinforcement for dramatic saving throws and fumble rolls, intuitive touch navigation.
- **Negative:** Users must switch between scopes to view skills while on ability scores; mitigated by quick swipe gestures and persistent quick belt slots.
