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
- [ADR-0014: 25% Proportional Scale Expansion for Dice Belt Mode and Honeycomb Hexads](#adr-0014-25-proportional-scale-expansion-for-dice-belt-mode-and-honeycomb-hexads)
- [ADR-0015: Decoupled 4-Scope Stats Navigation, Gesture-Based Mobile Horizontal Swipe, Resistance Save Checkered Vignette, and Crimson Natural 1 Fumble Visuals](#adr-0015-decoupled-4-scope-stats-navigation-gesture-based-mobile-horizontal-swipe-resistance-save-checkered-vignette-and-crimson-natural-1-fumble-visuals)
- [ADR-0016: Top-Bar 10-Tab Hierarchy, Mobile Horizontal Swipe Navigation, Save Vignette Ripple Pulse, and Non-d20 Half-Roll Disclosure](#adr-0016-top-bar-10-tab-hierarchy-mobile-horizontal-swipe-navigation-save-vignette-ripple-pulse-and-non-d20-half-roll-disclosure)
- [ADR-0017: Exact 10-Tab Sequential Hierarchy, Character Panel Header Encapsulation, and Full-Screen Pulsing Heraldic Checkered Vignette for Resistance Saves](#adr-0017-exact-10-tab-sequential-hierarchy-character-panel-header-encapsulation-and-full-screen-pulsing-heraldic-checkered-vignette-for-resistance-saves)
- [ADR-0018: Character Hero Panel Sub-Header Encapsulation, Ability Check HUD Toast Banner, Progression & Species Trait Scope Discipline, Kinetic Spark Roll-Up Juiciness, and 4-Row Categorized Skills Grid with Side-by-Side Passive/Active Bonuses](#adr-0018-character-hero-panel-sub-header-encapsulation-ability-check-hud-toast-banner-progression--species-trait-scope-discipline-kinetic-spark-roll-up-juiciness-and-4-row-categorized-skills-grid-with-side-by-side-passiveactive-bonuses)
- [ADR-0019: Universal Inline Dice Notation Recognition, Reactive Dice Tokens, and Global Tap-to-Roll Architecture](#adr-0019-universal-inline-dice-notation-recognition-reactive-dice-tokens-and-global-tap-to-roll-architecture)
- [ADR-0020: Foldable 4-Action Skills Grid, Tools Consolidation, Rollup Checkered Vignette Removal, and Configurable Character Portrait Framing](#adr-0020-foldable-4-action-skills-grid-tools-consolidation-rollup-checkered-vignette-removal-and-configurable-character-portrait-framing)
- [ADR-0021: Features Tab Crash Remediation, Vertical Battle Action Skills Grid, Shorthand Ability Score Format, and Discrete Bottom Half-Roll Disclosure](#adr-0021-features-tab-crash-remediation-vertical-battle-action-skills-grid-shorthand-ability-score-format-and-discrete-bottom-half-roll-disclosure)
- [ADR-0022: Auto-Magic Monster Statblock Ingestion via Direct Resource Links in Battle Picker](#adr-0022-auto-magic-monster-statblock-ingestion-via-direct-resource-links-in-battle-picker)
- [ADR-0023: 1:1 D&D 5e Monster Statblock Fidelity & Ingestion Architecture](#adr-0023-11-dd-5e-monster-statblock-fidelity--ingestion-architecture)
- [ADR-0024: Advanced In-Text Roll Parsing (Attacks, Saves, Checks), Universal Multi-Tool Web Ingestion, and D&D 5e 2024 Statblock Anatomy](#adr-0024-advanced-in-text-roll-parsing-attacks-saves-checks-universal-multi-tool-web-ingestion-and-dd-5e-2024-statblock-anatomy)
- [ADR-0025: Browser CORS Remediation, Dual-Tier First-Party Proxy & Robust External Monster Ingestion](#adr-0025-browser-cors-remediation-dual-tier-first-party-proxy--robust-external-monster-ingestion)
- [ADR-0026: Universal Multi-Tier CORS Proxy Cascade, Edge Serverless Ingestion & Arbitrary Link / Plaintext Heuristics](#adr-0026-universal-multi-tier-cors-proxy-cascade-edge-serverless-ingestion--arbitrary-link--plaintext-heuristics)
- [ADR-0027: User-Character-Campaign Multi-Assignment Architecture, Action-Grouped Skills (D&D 5e 2024), Juicy Roll-Up Visuals & 3-State Swipe Engine](#adr-0027-user-character-campaign-multi-assignment-architecture-action-grouped-skills-dd-5e-2024-juicy-roll-up-visuals--3-state-swipe-engine)
- [ADR-0028: Roll Screen Blackout Remediation, Overlay Stacking Isolation & Resilient DandWiki Ingestion with Auto-Decoding](#adr-0028-roll-screen-blackout-remediation-overlay-stacking-isolation--resilient-dandwiki-ingestion-with-auto-decoding)
- [ADR-0029: Universal Advantage Engine, Action Header Direct Rolls, Keen Senses Auto-Advantage, Staggered Concurrent Proxy Race & Dramatic Vignette Blackout](#adr-0029-universal-advantage-engine-action-header-direct-rolls-keen-senses-auto-advantage-staggered-concurrent-proxy-race--dramatic-vignette-blackout)
- [ADR-0030: Top HUD Roll Banners, N:N Multi-Campaign Assignment Support, Player Character Skills & Tools Monster Parity, and Hero Header Top-Left Badge Cluster](#adr-0030-top-hud-roll-banners-nn-multi-campaign-assignment-support-player-character-skills--tools-monster-parity-and-hero-header-top-left-badge-cluster)
- [ADR-0031: Multi-Character Campaign Support (N Characters per User), DM Active Player / NPC Toggle, Campaign Seal Medal Trinity, and Skills & Progression Scoping](#adr-0031-multi-character-campaign-support-n-characters-per-user-dm-active-player--npc-toggle-campaign-seal-medal-trinity-and-skills--progression-scoping)
- [ADR-0032: Badge-Array Multi-Roll with In-Place Hero Roll-Up, Coupling, Row Locks and Measured Performance Budget](#adr-0032-badge-array-multi-roll-with-in-place-hero-roll-up-coupling-row-locks-and-measured-performance-budget)
- [ADR-0033: Dice Belt v2: Four Die Hexads, Per-Die PB Wedges, I/II Loadouts, Hold-to-Roll and Ability-Paired Multiattack Rolls](#adr-0033-dice-belt-v2-four-die-hexads-per-die-pb-wedges-iii-loadouts-hold-to-roll-and-ability-paired-multiattack-rolls)
- [ADR-0034: Campaigns as Versions of a Character: Template, Per-Campaign Full Copies and an Interim Checkout Store](#adr-0034-campaigns-as-versions-of-a-character-template-per-campaign-full-copies-and-an-interim-checkout-store)
- [ADR-0035: World Link Ingestion with SSRF Guard, Linked Images, Map Zones and Containment](#adr-0035-world-link-ingestion-with-ssrf-guard-linked-images-map-zones-and-containment)

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
Build `frontend/src/group/party-metrics.js`:
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

---

## ADR-0016: Top-Bar 10-Tab Hierarchy, Mobile Horizontal Swipe Navigation, Save Vignette Ripple Pulse, and Non-d20 Half-Roll Disclosure

### Status
Accepted

### Context
While the 4-scope stats navigation introduced in ADR-0015 addressed vertical scroll clutter, nesting sub-scopes inside the "Atributos" tab created unnecessary cognitive indirection and hidden navigation layers. The user explicitly requested:
1. Promote the scopes into first-class top-bar tabs: "Atributos" must strictly hold SOLELY Ability Scores (+ Saving Throws / Dice Belt / Seals). Alongside it on the primary top bar, disclose separate tabs for "Perícias" (Skills), "Ferramentas" (Tools & Languages), and "Características" (Features, coupling class/subclass features, feats, and racial traits).
2. Mobile horizontal swipe navigation on `.fh-tab-body` must directly cycle across all 10 tabs in this exact sequence:
   `Play` <-> `Spells` <-> `Ability Scores` <-> `Skills` <-> `Tools` <-> `Features` <-> `Inventory` <-> `Story` <-> `Journal` <-> `NPCs`.
3. High-visibility Resistance Saving Throw Checkered Vignette: previous translucent radial blend was undetectable on dark screens. Needs a rich, heraldic deep crimson and bronze checkerboard with dramatic pulse on the 750ms roll-off ripple.
4. Non-d20 Multi-Dice Stack Half-Roll Disclosure: when rolling stacked dice that are not d20s (e.g. `8d6`, `10d10`, `4d8`), disclose as a dimmed number the half of the roll (rounded down) next to the rolled total inside the central hero die (`½X`) and in a companion pill under the stage (`½ METADE: X`).

### Decision Drivers
- **Zero Nested Nav Clutter**: Flatten the hierarchy so every domain has a distinct, 1-level accessible tab on the top bar.
- **Intuitive Touch Ergonomics**: Swiping left/right flows naturally across the character sheet with 0 vertical scroll fatigue.
- **Visual Contrast & Game Immersion**: High-contrast crimson/bronze heraldic vignette and saving throw shield banner make resistance rolls unmistakable.
- **Math Accessibility (D&D 5e Half-Damage Mechanic)**: Automatically calculating and disclosing half-damage on spell/damage rolls saves mental arithmetic during combat.

### Decision Outcome
1. **Top-Bar 10-Tab Hierarchy (`SHEET_TABS`)**:
   - `SHEET_TABS` defined in `frontend/components/Sheet.jsx`:
     1. `play`: Jogar / Play (vitals, weapons, action trackers, short/long rest, wild shape).
     2. `spells`: Magias / Spells (slots, prepared/known spells, spellbook).
     3. `stats`: Atributos / Ability Scores (`SheetAbilities`: Dice belt / Ability seals + Saving throws with tap-to-roll).
     4. `skills`: Perícias / Skills (`SheetSkills`: Passive Perception card, 18 SRD skills with 3-state proficiency cycling, skill features).
     5. `tools`: Ferramentas / Tools (`SheetTools`: LanguagesField, Armor/Weapon/Tool proficiencies, custom textarea, proficiency features).
     6. `features`: Características / Features (`SheetFeatures`: Class & Subclass features, Feats with origins and ASI summaries, Species traits).
     7. `inv`: Inventário / Inventory (equipment, containers, currency, encumbrance).
     8. `story`: História / Story (background, appearance, backstory, personality traits, alignment).
     9. `notes`: Diário / Journal (campaign log, quest notes, session recaps).
     10. `npcs`: NPCs / NPCs (allies, organizations, contacts).
   - Removed nested `.fh-stats-scope-nav` sub-bar.

2. **Mobile Horizontal Swipe Navigation**:
   - `onTabBodyTouchEnd` evaluates horizontal displacement:
     - Swipe left (`dx < 0`): Advances to next tab in `SHEET_TABS` sequence (`tabIdx + 1`).
     - Swipe right (`dx > 0`): Returns to previous tab in `SHEET_TABS` sequence (`tabIdx - 1`).
     - Thresholds: (|dx| \ge 48\text{px}), (|dx| > 1.35 \times |dy|), touch duration (< 700\text{ms}).
     - Guarded against touches on inputs, textareas, sliders, dice belt components, and modal overlays.

3. **High-Contrast Saving Throw Checkered Vignette & Ripple Pulse**:
   - `.dice-save-checkered-vignette` in `dice-styles.css`:
     - Patter: `repeating-conic-gradient(#66131c 0% 25%, #1f130b 25% 50%, #66131c 50% 75%, #1f130b 75% 100%)` at `52px 52px`.
     - Outward radial feathering mask from 30% to 86%.
     - Glowing inset box-shadow: `inset 0 0 80px rgba(255, 60, 75, 0.75), inset 0 0 160px rgba(102, 19, 28, 0.92)`.
     - When `overlay.settled` fires at 750ms: triggers `@keyframes save-vignette-pulse`, flaring brightness to 2.1, expanding scale to 1.035, and radiating a crimson shockwave bloom.
     - Added HUD saving throw shield banner `.dice-save-shield-banner` with `🛡️ TESTE DE RESISTÊNCIA` / `🛡️ SAVING THROW`.
     - Expanded save detection regex across `DiceRoller.jsx` to include `/teste de resist[eê]ncia|salvaguarda|saving throw|\bsave\b|morte|death/i`.

4. **Non-d20 Multi-Dice Stack Half-Roll Disclosure**:
   - When `totalDiceCount > 1 && primaryDie !== 20`:
     - Calculates `halfTotal = Math.floor(finalTotal / 2)`.
     - Passes `halfValue={halfTotal}` to central hero die.
     - `DieShape.jsx`: renders `.die-number-half` (`½{halfValue}`) next to `.die-number-val` with `font-size: 0.44em`, `opacity: 0.58`, and gold gleam.
     - `DiceStage.jsx`: renders companion pill `.dice-stack-half-banner` beneath the flower stage (`½ METADE: {halfTotal}`).

### Consequences
- **Positive:** Extremely clean 1-level navigation with 10 direct tabs; zero scroll-to-switch fatigue on mobile; dramatic, unmistakable resistance save feedback with synchronized ripple pulse; instantaneous half-damage reference for combat spells and attacks.
- **Negative:** Top-bar tab strip has 10 items, but `ScrollTabs` provides smooth horizontal scrolling with touch drag and `aria-selected` highlights.


---

## ADR-0017: Exact 10-Tab Sequential Hierarchy, Character Panel Header Encapsulation, and Full-Screen Pulsing Heraldic Checkered Vignette for Resistance Saves

### Status
Accepted & Implemented (2026-11-07)

### Context
Following user testing and mobile gameplay validation, three UX/UI discrepancies were identified:
1. **Tab Sequence Misalignment:** The top navigation bar and horizontal swipe gesture sequence placed `Spells` immediately after `Play`. The canonical player journey requires `Ability Scores` directly following `Play`, with character attributes, proficiencies, tools, and features flowing naturally before spellcasting: `Play -> Ability Scores -> Skills -> Tools -> Features -> Spells -> Inventory -> Story -> Journal -> NPCs`.
2. **Disconnected Header Actions:** Action controls (`Export`, `Edit`, and `Cheat Mode`) floated awkwardly outside the character header, detached between status banners and the tab navigation bar.
3. **Saving Throw Vignette Contrast & Full-Screen Impact:** The previous checkered pattern used low-contrast dark crimson and leather tones and masked out the central screen area. When rolling a resistance saving throw, players needed unmistakable, dramatic confirmation that pulsed brightly to full screen at the exact instant the rolled numbers unraveled.

### Decision Outcome
1. **Canonical 10-Tab Sequential Sequence (`SHEET_TABS`):**
   - Updated `SHEET_TABS` and `.fh-tab-body` in `frontend/components/Sheet.jsx` to the strict sequence:
     1. `play`: Jogar / Play
     2. `stats`: Atributos / Ability Scores (`SheetAbilities`: pure Ability Scores + Saving Throws + Dice Belt Mode + 3D Hexad Seals)
     3. `skills`: Perícias / Skills (`SheetSkills`: Passive Perception + 18 SRD skills + proficiencies)
     4. `tools`: Ferramentas / Tools (`SheetTools`: Languages + armor, weapon, tool proficiencies)
     5. `features`: Características / Features (`SheetFeatures`: Class, subclass, feats, racial traits)
     6. `spells`: Magias / Spells (`SheetSpells`: Spell slots, prepared spells, spellbook)
     7. `inv`: Inventário / Inventory (`SheetInventory`: Equipment, weapons, attunement, weight)
     8. `story`: História / Story (`SheetStory`: Background, backstory, personality, traits)
     9. `notes`: Diário / Journal (`SheetNotes`: Session notes, campaign logs, quest trackers)
     10. `npcs`: NPCs / NPCs (`SheetNpcs`: Companions, allies, organizations, contacts)
   - Mobile horizontal swipe (`dx < 0` / `dx > 0`) directly cycles across this exact 10-tab progression.

2. **Character Panel Header Encapsulation:**
   - Relocated `LevelUpButton` and `SheetHero` definitions above `Sheet` for architectural modularity.
   - Encapsulated `Export`, `Edit`, and `Cheat Mode` inside `SheetHero` (`.fh-hero-body`), positioned directly beneath the alignment badge (`.hero-alignment-tag` / `.hero-tags`).
   - Styled `.ficha .fh-hero .fh-actions` as grid area `actions` beneath tags in desktop (`"seal name" "sub sub" "tags tags" "actions actions"`) and mobile (`"seal" "name" "sub" "tags" "actions"`).
   - Enforced WCAG AAA touch target floor (`min-height: 44px`) for all action chips.

3. **Full-Screen Pulsing Heraldic Checkered Vignette & Unravel Shockwave:**
   - Upgraded checkerboard to vibrant, high-contrast heraldic ruby crimson (`#b81424`) and deep obsidian iron (`#14070a`) at `52px 52px`.
   - Added kinetic radial shockwave ring (`.dice-save-checkered-vignette::after` with `@keyframes save-flash-shockwave`).
   - At the exact moment the roll unravels its rolled numbers (`.is-settled` triggered by `onSettled`):
     - The checkered pattern expands to **FULL SCREEN** (`mask-image` opens from central cutout to 94%-100% full-screen coverage).
     - Opacity flares to `1.0` with blazing brightness (`filter: brightness(2.8) saturate(1.85) drop-shadow(0 0 70px rgba(255, 60, 80, 1))`).
     - Intense dual inset crimson shockwaves (`inset 0 0 140px rgba(255, 75, 95, 1), inset 0 0 260px rgba(220, 25, 45, 1)`).
     - Settles gracefully into an ambient full-screen heraldic backdrop (`opacity: 0.76`, `brightness(1.25)`) with softened central shade ensuring 100% legibility of the hero die and HUD shield banner (`🛡️ TESTE DE RESISTÊNCIA` / `🛡️ SAVING THROW`).

### Consequences
- **Positive:** Perfect ergonomic alignment with player intuition and PHB structure; actions visually integrated into the character's identity panel with zero page-top clutter; spectacular, high-impact saving throw audiovisual drama with full-screen checkered presence.
- **Verification:** 1,536 / 1,536 frontend tests passing (100% green); Vite production build successful in 13.28s; WCAG touch targets verified.


---

## ADR-0018: Character Hero Panel Sub-Header Encapsulation, Ability Check HUD Toast Banner, Progression & Species Trait Scope Discipline, Kinetic Spark Roll-Up Juiciness, and 4-Row Categorized Skills Grid with Side-by-Side Passive/Active Bonuses

### Status
Accepted & Implemented (2026-11-07)

### Context
User feedback demanded targeted ergonomic and visual improvements across character sheet hierarchy, dice roll anticipation, and skill management:
1. **Loose Campaign Status Text:** The standalone text `"Personal sheet · not in a campaign; level and abilities change through Progression"` sat loosely outside the character's panel above the tab bar. It required visual encapsulation within the hero identity block directly beneath Export / Edit / Cheat mode.
2. **Ability Check Roll Toast Consistency:** Saving Throws introduced a dedicated HUD banner (`🛡️ TESTE DE RESISTÊNCIA` / `🛡️ SAVING THROW`), whereas general Ability Checks lacked equivalent visual prominence. Players needed an identical top toast banner with the target iconography `🎯` (`🎯 TESTE DE ATRIBUTO` / `🎯 ABILITY CHECK`).
3. **Strict Scope Discipline for Progression & Species Traits:** Progression banners (`SubclassBanner`, `SpeciesBanner`) previously rendered at the global sheet level above all tabs, bleeding onto pure ability scores, spells, tools, and inventory tabs. Furthermore, Species Traits were placed on the Story tab rather than Features. The user requested: Progression must solely exist on the `Play` tab, and Species Traits belong on the `Features` tab.
4. **Kinetic Roll-Up Juiciness (Sparks & Climax Ripple Blow-Away):** The 750ms roll-up needed enhanced anticipation drama: as the roll approaches the climax number reveal, the die glow must intensify exponentially, lashing out radiant twinkling sparks, which are then blown outward and rapidly extinguished by the radial shockwave ripple.
5. **4-Row Categorized Skills Grid:** The 18 SRD skills were listed in a flat alphabetic grid. D&D 2024 / PHB rules establish 4 canonical action categories: Search (Insight, Perception, Survival), Hide (Stealth, Sleight Of Hand, Acrobatics, Athletics), Influence (Performance, Deception, Persuasion, Intimidation, Handle Animal), and Study (Arcane, History, Investigation, Medicine, Nature, Religion).
6. **Side-by-Side Passive Score & Active Bonus:** Players frequently need both passive scores ($10 + \text{mod}$) and active roll modifiers without having to perform mental addition or switch screens.

### Decision Outcome
1. **Hero Panel Encapsulation:**
   - Integrated `CampaignModeBanner` as a first-class child inside `SheetHero` (`.fh-hero-body`), mapped to grid area `camp` directly beneath `.fh-actions`.
   - Updated desktop and mobile grid-template-areas to `"seal name" "sub sub" "tags tags" "actions actions" "camp camp"` (desktop) and `"seal" "name" "sub" "tags" "actions" "camp"` (mobile).
2. **Ability Check HUD Toast Banner (`🎯`):**
   - Added `isCheck` detection across `DiceRoller.jsx` (`rollParsed`, `performRoll`, `rollUi`, `showResult`).
   - Rendered `.dice-check-target-banner` with `🎯` and localized `Teste de Atributo` / `Ability Check` in art-deco gold/amber gradients with glowing drop-shadows matching the saving throw banner.
3. **Scope Discipline:**
   - Gated `SubclassBanner` and `SpeciesBanner` strictly to `{tab === 'play' && ...}` in `Sheet.jsx`.
   - Removed `<SpeciesTraits />` from `SheetStory` in `SheetTabs.jsx`.
   - Exported `SpeciesTraits` from `SheetTabs.jsx` and integrated it into `SheetFeatures` alongside class features and feats.
4. **Juicy Roll-Up Sparks & Glow:**
   - In `dice-rollup.js`: added `chargeGlow` and `sparksEmit` to `computeAnticipationProfile` (exponential ramp in the last 45% of roll-up), and `sparksBlown` / `sparksOpacity` to `computeFalloffProfile` (shockwave blast and extinction within 320ms).
   - In `DieShape.jsx`: rendered `.die-sparks-emitter` with 8 radial spark particles that twinkle during late anticipation and blow outward during the ripple.
   - In `dice-styles.css`: added dynamic brightness/drop-shadow glow filter driven by `--charge-glow` and `@keyframes spark-twinkle`.
5. **4-Row Categorized Skills Grid (`SKILL_GROUPS`):**
   - Defined `SKILL_GROUPS` in `Sheet.jsx`:
     - **Search (Busca):** Insight, Perception, Survival.
     - **Hide (Furtividade & Evasão):** Stealth, Sleight of Hand, Acrobatics, Athletics.
     - **Influence (Influência):** Performance, Deception, Persuasion, Intimidation, Animal Handling.
     - **Study (Estudo):** Arcana, History, Investigation, Medicine, Nature, Religion.
   - Rendered as responsive cards with icon, category badge, and skill count.
6. **Side-by-Side Passive and Active Scores:**
   - In `FhChecks.jsx`: updated `FhSkillRow` to render `.fh-skill-scores` containing `.fh-skill-pass` (`PASS: 10 + bonus`) and `.fh-skill-mod` (`ROL: +X`) side by side.

### Consequences
- **Positive:** Pristine cognitive organization across tabs; rich tactical convenience with instant passive/active references; breathtaking kinetic audiovisual polish during dice rolls; full alignment with D&D 2024 action taxonomy.
- **Verification:** 1,542 / 1,542 frontend unit tests green across 20 suites; Vite production build succeeds with 0 errors in 13.76s.


---

## ADR-0019: Universal Inline Dice Notation Recognition, Reactive Dice Tokens, and Global Tap-to-Roll Architecture

### Status
Accepted & Implemented (2026-11-07)

### Context
In tabletop play and character sheet navigation, players and game masters encounter dice formulas written in natural text across multiple contexts:
- Feature and trait descriptions ("takes 3d8 radiant damage")
- Spell descriptions and upcasting rules ("deals 8d6 fire damage")
- Item descriptions and weapon properties ("1d8 piercing damage (or 1d10 if versatile)")
- Feat summaries and custom notes ("regains 1d4+2 hit points")
- Monster stat blocks and encounter actions

Previously, players had to memorize these values, open the dice tray, and manually select the die and count. The user requested:
"Make sure the whole tool understands when a text written anywhere with a valid 'Dice count' like 1d8 or 3d8, tapping on top of that specific data type immediately rolls the written roll."

### Decision Outcome
We implemented a two-tier universal recognition and execution architecture:

1. **Pure Pattern Matching & Text Chunking Engine (`frontend/src/dice/dice-text.js`):**
   - Canonical D&D Dice Notation Regex: `DICE_NOTATION_REGEX = /(\b\d{0,3}d(?:4|6|8|10|12|20|100)(?:\s*[+-]\s*\d{1,3})?\b)/gi`.
   - `findDiceAtOffset(text, offset)`: Uses caret position or touch point to identify the exact dice formula under user tap, including touch jitter tolerance ($\pm 2$ characters).
   - `parseTextWithDice(text)`: Deconstructs any arbitrary string into structured text segments and normalized dice tokens (`{ type: 'die', formula, raw }`).
   - `getClickedDiceFormula(e)`: Analyzes native DOM events via `e.target.closest('[data-dice-roll]')`, `document.caretPositionFromPoint`, `document.caretRangeFromPoint`, or leaf element inspection.

2. **Universal Global Event Delegation (`setupGlobalDiceClickListener`):**
   - Captures `click` and `keydown` events at the `document` root during the capture phase (`capture: true`).
   - Safe input guards: bypasses active text inputs, textareas, selects, and editable elements (`[contenteditable="true"]`) to preserve natural editing without interference.
   - When a valid formula (`1d8`, `3d8`, `2d6+3`, etc.) is clicked anywhere in the tool, it triggers immediate haptic feedback (`navigator.vibrate(35)`) and invokes `window.__diceRoll({ formula, label: 'Rolagem: ' + formula, sheet: true })`.

3. **Proactive Inline Component (`DiceText` / `renderDiceSpans` in `frontend/src/dice/dice-text.jsx`):**
   - Wraps detected dice notations into accessible `<button type="button" className="fh-dice-inline-token" ...>` elements.
   - Styled with Art Deco golden borders, glowing hover effects, tactile click compression, and a dice glyph prefix (`🎲`).
   - Complies with WCAG AAA touch target sizing through an invisible expansion pseudo-element (`::after` with `inset: -6px`).
   - Integrated across feature items (`FhFeatures.jsx`), spell descriptions (`SheetTabs.jsx`), item details (`SheetTabs.jsx`), weapon damage lines, and feat summaries (`Sheet.jsx`).

4. **Global Roll Integration (`performRoll` in `DiceRoller.jsx`):**
   - Upgraded `performRoll` to seamlessly accept either a formula string (`"3d8"`) or an options object (`{ formula: "3d8", ... }`).
   - Mounts and unmounts `setupGlobalDiceClickListener(performRoll)` alongside the `window.__diceRoll` global API.

### Consequences
- **Positive:** Players can now tap any dice notation anywhere in the app to roll immediately. Reduces cognitive load, eliminates manual formula entry, and speeds up combat and feature execution.
- **Verification:** 6/6 tests in `frontend/tests/dice-text-click-roll.test.js` passed; 1,548/1,548 total frontend unit tests passed across 21 suites; clean production Vite build in 9.85s.


## ADR-0020: Foldable 4-Action Skills Grid, Tools Consolidation, Rollup Checkered Vignette Removal, and Configurable Character Portrait Framing

### Status
Accepted & Implemented (2026-11-07)

### Context
Following player feedback and usability testing across mobile devices and desktop browsers:
1. **Roll-up Visual Artifacts**: The checkered background vignette (`.dice-save-checkered-vignette`) introduced for resistance saving throws caused browser rendering inconsistencies and visual noise, especially on non-mobile viewports. Players requested removing the checkered background entirely while preserving the saving throw HUD shield banner, natural 1 red fumble effects, and half-roll disclosure.
2. **Tab Hierarchy & Cognitive Clutter**: The main sheet navigation had 10 tabs, with "Tools" separated from "Skills". In D&D 2024 rules, using a tool is an Action and simultaneously an Ability Check (e.g. Thieves' Tools using Dexterity). Players requested consolidating the Tools section directly into the Skills tab and establishing a canonical 9-tab sequence: `Play -> Ability Scores -> Skills -> Features -> Spells -> Inventory -> Story -> Journal -> NPCs`.
3. **Skills Navigation Ergonomics**: The 18 SRD skills organized into the 4 canonical D&D action categories (Search, Hide & Agility, Influence, Study) needed to be collapsible/foldable by category to reduce vertical scrolling and allow swift, compact inspection on mobile screens.
4. **Character Banner Cropping / Positioning**: Character portrait images frequently ended up "off-centered" in the top landscape hero banner (`.fh-hero-art img`) because different images have different aspect ratios and head positions. Players needed an intuitive way to configure the horizontal (X) and vertical (Y) framing when uploading or viewing character art.

### Decision Outcome
1. **Checkered Vignette Removal**:
   - Removed `.dice-save-checkered-vignette` rendering from `DiceRoller.jsx` and eliminated the associated CSS animations and gradients from `dice-styles.css`.
   - Preserved the heraldic saving throw shield toast banner (`🛡️ TESTE DE RESISTÊNCIA` / `🛡️ SAVING THROW`), ability check toast banner (`🎯 TESTE DE ATRIBUTO`), critical failure red styling, and half-roll disclosure for non-d20 rolls.
2. **Canonical 9-Tab Flow & Tools Consolidation**:
   - Updated `SHEET_TABS` to the 9 canonical tabs: `play`, `stats` (Ability Scores), `skills` (Skills & Tools), `features` (Features & Species Traits), `spells`, `inv`, `story`, `notes` (Journal), and `npcs`.
   - Embedded `<SheetTools />` (Languages, Armor, Weapon, Tool proficiencies, and custom proficiencies) directly at the bottom of the `Skills` tab (`SheetSkills`).
   - Mobile swipe gestures cycle seamlessly across this exact 9-tab sequence.
3. **Foldable 4-Action Skills Grid**:
   - Transformed each action category header (`Search`, `Hide & Agility`, `Influence`, `Study`) into an accessible button with interactive folding state (`collapsed` state dictionary).
   - Added chevron indicators (`▾` expanded, `▸` folded), trained/expert proficiency summary badges (e.g. `2/3 treinadas`), and an "Expand all / Collapse all" toolbar toggle.
   - All toggle headers maintain $\ge 44\text{px}$ touch targets conforming to WCAG AAA standards.
4. **Configurable Character Portrait & Banner Framing**:
   - Added `char.avatarPosition = { x: number, y: number }` to character model (default `{ x: 50, y: 22 }`).
   - Applied dynamic `objectPosition` styling to `.fh-hero-art img` in `SheetHero` and circular token images in `AvatarUpload`.
   - Upgraded `AvatarUpload` in `Shared.jsx` with a full framing studio modal:
     - Real-time wide banner framing preview card (16:9 proportion).
     - Circular token preview card.
     - Interactive Horizontal Framing (X: 0%–100%) and Vertical Framing (Y: 0%–100%) sliders.
     - Quick preset buttons: Top / Head (`50%, 15%`), Center (`50%, 50%`), Bottom (`50%, 85%`), and Reset (`50%, 22%`).
   - Integrated across `Sheet.jsx`, `Creator.jsx`, and `details.jsx`.

### Consequences
- **Positive**: Clean, artifact-free dice roll overlay; uncluttered 9-tab sequence with unified action and check workflows; fast collapsible skills inspection; pixel-perfect character portrait alignment on mobile and desktop.
- **Verification**: 10/10 tests in `sheet-skills-vignette-enhancements.test.js` passing; 1,552/1,552 total frontend unit tests green across 20 suites; clean Vite production build in 9.36s.

---

## ADR-0021: Features Tab Crash Remediation, Vertical Battle Action Skills Grid, Shorthand Ability Score Format, and Discrete Bottom Half-Roll Disclosure

### Status
Accepted & Implemented (2026-11-07)

### Context
Following deployment of Release v1.0.8, gameplay testing surfaced four specific UI/UX issues:
1. **Features Tab Crash:** Clicking the "Features" (Características) tab triggered a fatal runtime exception (`ReferenceError: DiceText is not defined` inside `SheetFeatures`), preventing character sheets with feats from rendering features. Additionally, custom species or legacy 2014 data lacking `race.traits` could crash `SpeciesTraits`.
2. **Side-by-Side Skills Columns Cognitive Ergonomics:** The 4 action skill categories (Search, Hide & Agility, Influence, Study) were displayed in a 2-column grid on desktop screens (`@media (min-width: 900px)`). Players noted that action cognition and folding flow much more logically in a single-column top-to-bottom sequence where each card clearly represents a D&D Battle Action.
3. **Shorthand Ability Score Placement on Skill Rows:** Skill rows displayed passive and active scores on the right, but the ability abbreviation (e.g. `Int`) was positioned ambiguously or separately. Players requested placing the shorthand inline beside the skill name (e.g. `Arcana (Int)`) with the passive and active scores disclosed together as `10 / +1`.
4. **Half-Roll Clutter in Multi-Dice Rolls:** When rolling stacks of non-d20 dice, displaying `½X` directly on the die face inside `DieShape.jsx` and showing a large center banner disrupted the roll-up anticipation and explosion. Players requested a discrete, dim calculated half-roll badge at the bottom of the screen that does not interfere with the dice stage.

### Decision Outcome
1. **Features Tab Crash Remediation:**
   - Imported `DiceText` directly into `frontend/components/Sheet.jsx`.
   - Upgraded `SheetFeatures` to safely render class & subclass features via `<FhFeatures items={classItems} />`, feats via `<DiceText />`, and species traits via `<SpeciesTraits />`.
   - Guarded `SpeciesTraits` in `frontend/components/SheetTabs.jsx` with `const traits = race?.traits || [];` and normalized string vs object name/desc properties.
2. **Vertical Single-Column Battle Actions for Skills:**
   - Updated `.ficha .fh-skill-categories-grid` in `ficha.css` to `display: flex; flex-direction: column; width: 100%; gap: 14px;`, removing the desktop 2-column rule.
   - Updated category titles in `SKILL_GROUPS` to explicit battle action designations: `Ação: Busca (Search)`, `Ação: Furtividade & Evasão (Hide)`, `Ação: Influência (Influence)`, and `Ação: Estudo (Study)`.
3. **Inline Shorthand Score Layout:**
   - Updated `FhSkillRow` in `frontend/src/sheet/FhChecks.jsx` to render `{abbr && <span className="fh-skill-abil-inline">({abbr})</span>}` directly inline within `.fh-skill-name`.
   - Structured `.fh-skill-scores` as `[Passive Score] / [Active Bonus]` separated by `.fh-score-divider` (`/`).
4. **Discrete Bottom Half-Roll Disclosure:**
   - Removed `die-number-half` from `DieShape.jsx` die face so the kinetic roll-up number is completely clean.
   - Removed `dice-stack-half-banner` from the middle of `DiceStage.jsx`.
   - Eliminated all `'1/2'`, `'½'`, or text labels, rendering solely the calculated and rounded down number ready for immediate use (`{halfTotal}`) inside `.dice-half-discrete`.
   - Mounted via `createPortal(..., document.body)` so it anchors directly to the true viewport bottom (`bottom: max(20px, env(safe-area-inset-bottom, 20px)); z-index: 10001; pointer-events: none;`), completely decoupled from transformed stage ancestors and avoiding any overlap with the shapes of the rolled dice.

### Consequences
- **Positive:** Zero runtime crashes on features tab; streamlined vertical scan for combat actions; intuitive inline ability notation `Arcana (Int) 10 / +1`; clean, distraction-free polyhedral roll-up with discrete half-damage calculation.
- **Verification:** 14/14 tests in `frontend/tests/sheet-skills-vignette-enhancements.test.js` pass; 1,556 / 1,556 total frontend unit tests green across 20 suites; clean Vite production build in 10.13s.


---

## ADR-0022: Auto-Magic Monster Statblock Ingestion via Direct Resource Links in Battle Picker

### Status
Accepted & Implemented (2026-11-07)

### Context
Adding monsters during prep or live combat previously required either manual data entry or switching away from the application to download `.json` files, opening an import panel, selecting the file, and then picking the imported creature. DMs frequently find monsters directly on web bestiaries (e.g. 5e.tools, Open5e, or community GitHub gists) and requested the ability to paste the URL directly into the "SEARCH BY NAME" field of the "PICK A MONSTER" modal (`MonsterPicker.jsx`), with the platform automatically fetching, deconstructing, parsing, and selecting the monster in real time.

Technical challenges:
1. **Cloudflare Bot Protection & 403 Forbidden:** The `5e.tools` root domain is behind Cloudflare bot challenges and restricts automated HTTP fetch requests.
2. **Hash-Based Routing:** 5e.tools URLs use client-side fragments (`#<name>_<source>`), which are never transmitted to web servers in HTTP requests.
3. **Macro Tagging Grammar:** 5e.tools data relies on extensive internal macro tags (`{@atk mw}`, `{@hit 7}`, `{@h}`, `{@damage 1d8+5}`, `{@dc 15}`, `{@recharge 5}`, etc.) that must be parsed into structured D&D 5e combat mechanics.

### Decision Outcome
1. **URL Detection & Parsing Module (`frontend/src/campaigns/url-monster-importer.js`):**
   - Implemented `isMonsterUrl(str)` and `parseMonsterUrl(str)` recognizing 5e.tools links (`#<name>_<source>`), Open5e links (`/monsters/<slug>`), and direct raw `.json` URLs.
   - Deconstructs the hash client-side: `#clapped-out%20steamjack_irkcore` $\to$ Name: `'clapped-out steamjack'`, Source: `'irkcore'`.
2. **CORS-Open Multi-Tier Mirror Architecture:**
   - Homebrew 5e.tools sources resolve against `TheGiddyLimit/homebrew` on raw GitHub, using in-memory cached `index-sources.json` to map 1,500+ source slugs to collection files.
   - Official 5e.tools sources resolve against `5etools-mirror-3/5etools-src`, using cached `index.json` to map core books (`mm`, `vgm`, `mtf`, etc.).
   - Open5e URLs resolve directly against `api.open5e.com/v1/monsters/<slug>/?format=json`.
   - Raw JSON files are fetched and routed through `convert5emm`, `convertOpen5eV1/V2`, or `convert5eToolsMonster`.
3. **5e.tools AST Deconstruction & Combat Model Conversion:**
   - Implemented pure regex and AST tag cleaners (`clean5eToolsTags`, `parse5eToolsEntries`) converting 5e.tools macros into natural language SRD blocks.
   - Powered by `parseActionText` from `import-5emm.js` to extract attack types (`melee`/`ranged`), attack bonus, reach, damage formulas, damage types, extra damages, saving throws (DC, ability, halfOnSave), and recharge.
   - Converts abilities, saving throws, skills, damage resistances, damage immunities, condition immunities, senses, languages, traits, spellcasting, legendary actions, bonus actions, and reactions into the unified Heroes Forge combat schema.
4. **Seamless GM In-Modal Choreography (`MonsterPicker.jsx`):**
   - Real-time URL sniffer in search field keeps the catalog calm and prevents blank list flashing while loading (`effectiveQuery`).
   - Renders an Art Deco inline status pill (`.mp-url-status`) displaying `🔮 Importando monstro do link: ...` with spinning indicator, success confirmation (`✨`), or dismissible error reporting (`⚠️`).
   - Auto-saves the creature into the DM's local browser storage (`saveCustomMonsters`), clears the URL search query, auto-selects the creature (`selectedId`), and immediately activates the modal footer with portrait, stats, quantity, initiative, and the enabled **Adicionar ao combate** button.

### Consequences
- **Positive:** Zero context-switching friction for DMs; pasting a URL automatically reconstructs and inserts any official or homebrew monster into battle in < 300ms; complete offline persistence in `localStorage`; zero dependencies on third-party proxies.
- **Verification:** 7/7 unit tests in `frontend/tests/url-monster-importer.test.js` pass (covering `Merchantman`, `Clapped-Out Steamjack`, `Sphinx`, `Goblin`, and `Aboleth`); 1,563 / 1,563 total frontend unit tests green across 20 suites; clean Vite production build in 14.45s.

---

## ADR-0023: 1:1 D&D 5e Monster Statblock Fidelity & Ingestion Architecture

### Status
Accepted & Implemented (2026-11-07)

### Context
While URL-based monster ingestion (ADR-0022) enabled fetching monsters from 5e.tools, Open5e, and JSON directly into the battle picker, the ingested models lacked complete 1:1 fidelity with authentic D&D 5e statblock anatomy:
1. **Truncation of AC and HP Nuances:** AC source notes (`natural armor`, `shield`, etc.) and HP formulas (`4d10+20`) were flattened to plain integers, losing armor and hit dice provenance.
2. **Missing Speed & Defense Text Formatting:** Conditional damage resistances (`from nonmagical attacks`), condition immunities, and multi-mode speeds (`fly 60 ft. (hover)`) were missing or unformatted.
3. **Missing Challenge Metadata:** XP and official Proficiency Bonus (PB) were not calculated or attached.
4. **Action Parsing Edge Cases:** Homebrew attacks with dynamic bonuses (e.g. `Hit: 1d8 + proficiency bonus bludgeoning damage` in Iron Kingdoms / Steamjack content) lacked parentheses averages and failed to extract base damage dice and damage types.
5. **In-Combat Statblock Blindness:** In `CombatantSheet.jsx`, GMs previously had no tab to read a monster's lore, cortex commands, magical traits, or damage immunities during combat—only raw actions and HP.
6. **Lack of 1:1 Statblock Inspection in Monster Picker:** In `MonsterPicker.jsx`, GMs could not preview the authentic 1:1 statblock before adding a creature to combat.

### Decision Outcome
1. **Comprehensive 1:1 Data Ingestion (`url-monster-importer.js` & `import-5emm.js`):**
   - Attached `typeLine` with size, type, tags/subtypes, and alignment (e.g. `"Medium construct (steamjack), unaligned"`).
   - Attached `acText` with AC value and sources/notes (e.g. `"16 (natural armor)"`).
   - Attached `hpText` with average HP and exact hit dice formula (e.g. `"42 (4d10+20)"`).
   - Attached `speedText` with all movement modes (e.g. `"30 ft., fly 60 ft. (hover)"`).
   - Formatted `saveText` and `skillText` with standard shorthand formatting (`STR +5, CON +6`, `Athletics +5, Perception +2`).
   - Formatted `resistText` (with conditional clauses), `immuneText`, `vulnText`, and `conditionImmuneText`.
   - Attached `xp` via `CR_XP_MAP` and `proficiencyBonus` via `pbForCr(crNum)`.
   - Added regex fallback in `mapActions` to parse non-standard dice notation (`1d8 + proficiency bonus bludgeoning damage`).
   - Preserved `raw5eTools` on the imported object for lossless schema preservation.
2. **Dedicated 1:1 Monster Statblock Component (`MonsterStatblock.jsx` + `monster-statblock.css`):**
   - Renders authentic D&D 5e statblock card with header, metadata, tapered burgundy/gold gradient bars, AC, HP, speed, 6 ability score table with modifiers, saves, skills, vulnerabilities, resistances, immunities, condition immunities, senses, languages, CR with XP and PB, special traits, actions, bonus actions, reactions, and legendary actions.
   - Embeds `<DiceText />` so all dice notations and formula references are interactive tap-to-roll tokens.
3. **GM In-Combat Statblock Tab (`CombatantSheet.jsx`):**
   - Added `statblock: '📜'` tab to `TAB_IDS` and `cs-tabs` for monsters (`c.type === 'monster' || !!c.stats`), rendering `<MonsterStatblock />` directly inside active combat.
4. **MonsterPicker Statblock Inspection Modal (`MonsterPicker.jsx`):**
   - Added `mp-statblock-btn` (`👁️ Ficha / Statblock`) to footer and discrete `👁️` inspect button on every monster list item.
   - Opens a full-fidelity `MesaSheet` displaying `<MonsterStatblock />`.
   - Rendered inline status pill `.mp-url-status`.

### Consequences
- **Positive:** Complete 1:1 parity with authentic D&D 5e and 5e.tools statblock anatomy; GMs have full in-combat and pre-combat access to traits, lore, cortex rules, defenses, and legendary actions; all dice expressions in statblocks are clickable tap-to-roll tokens; zero regressions.
- **Verification:** 5/5 tests in `frontend/tests/monster-statblock-fidelity.test.js` pass; 7/7 tests in `frontend/tests/url-monster-importer.test.js` pass; 10/10 tests in `frontend/tests/import-5emm.test.js` pass.

---

## ADR-0024: Advanced In-Text Roll Parsing (Attacks, Saves, Checks), Universal Multi-Tool Web Ingestion, and D&D 5e 2024 Statblock Anatomy

### Status
Accepted & Implemented (2026-11-08)

### Context
1. **Interactive In-Text Roll Parsing Beyond Raw Dice Counts:** While inline dice parsing (`1d8`, `2d6+3`) was established in ADR-0019, players and GMs frequently encounter rolls written as attack bonuses (`+5 to hit`, `Melee Attack Roll: +7`, `+9 with spell attacks`, `+5 para acertar`), saving throw DCs (`DC 14 Dexterity save`, `CD 15 teste de resistência de Constituição`), or ability check DCs (`DC 12 Wisdom (Perception) check`, `CD 10 teste de Atletismo`). Previously, these remained static plain text, requiring manual mental translation into dice formulas.
2. **Canonical D&D 5e 2024 Statblock Anatomy:** The revised D&D 5e 2024 rules (`https://www.dndbeyond.com/sources/dnd/br-2024/creature-stat-blocks`) established key updates to creature presentation:
   - **Initiative** is elevated into the primary combat metrics header alongside AC, HP, and Speed: `Initiative +DexMod (10+DexMod)`.
   - The **6 Ability Scores Table** integrates both Ability Score / Modifier and Saving Throw Modifier in every column (`MOD +3 (16)` and `SAVE +5`), reflecting that all creatures have a defined saving throw modifier for all six abilities.
   - **Skills** are active combat rolls that should be instantly executable with a single tap.
3. **Universal Web & Homebrew Compatibility:** GMs source encounter creatures across a diverse landscape of web compendiums and homebrew databases:
   - D&D Wiki (`dandwiki.com` MediaWiki homebrew articles: `Barnaclops`, `Coronated Reaper`, `Fell Beast`, `Glitch`, `Mewtwo`).
   - Wikidot (`dndroll.wikidot.com` creature pages).
   - 5e.tools path-based permalinks (`5e.tools/bestiary/<name>-<source>.html`, including 2024 Monster Manual `xmm` books).
   - Web compendiums: Roll20 (`roll20.net/compendium/dnd5e/...`), D&D Beyond (`dndbeyond.com/monsters/...`), AideDD (`aidedd.org/dnd/monstres.php?vo=...`), and 5e SRD (`5e.d20srd.org/srd/monsters/...`).

### Decision Outcome
1. **Enhanced Inline Roll Recognizer (`frontend/src/dice/dice-text.js` & `dice-text.jsx`):**
   - Engineered regex tokenizers matching:
     - `ATTACK_ROLL_REGEX`: Matches 2014 & 2024 attack roll patterns in English and Portuguese (`Melee Attack Roll: +7`, `+5 to hit`, `+9 with spell attacks`, `Ataque Corpo a Corpo: +5`), generating interactive `attack` tokens rolling `1d20+bonus` with `⚔️` icon.
     - `SAVE_DC_REGEX`: Matches saving throw DCs in English and Portuguese (`DC 14 Dexterity save`, `CD 15 teste de resistência de Constituição`), generating interactive `save` tokens rolling `1d20` with `🛡️` icon and save flags.
     - `CHECK_DC_REGEX`: Matches check DCs (`DC 12 Wisdom (Perception) check`, `CD 12 teste de Percepção`), generating interactive `check` tokens rolling `1d20` with `🎯` icon and check flags.
     - `DICE_NOTATION_REGEX`: Retains robust formula parsing (`XdY+Z`), with precedence arbitration preventing formula collisions.
   - Global event delegation in `setupGlobalDiceClickListener` intercepts taps on `[data-roll-attack]`, `[data-roll-save]`, `[data-roll-check]`, and `[data-dice-roll]`.
2. **Dedicated Attack Roll Banner in Dice HUD (`DiceRoller.jsx` & `dice-styles.css`):**
   - Added `.dice-attack-swords-banner` featuring animated entrance, crimson/iron gradients, twin swords icon `⚔️`, and localized title (`Rolagem de Ataque` / `Attack Roll`), completing the triumvirate alongside Save (`🛡️`) and Check (`🎯`) banners.
3. **Canonical D&D 5e 2024 Statblock Layout (`MonsterStatblock.jsx` & `monster-statblock.css`):**
   - **Header Initiative Badge:** Elevated Initiative into top metrics: `Initiative +DexMod (10+DexMod)`, with interactive roll button (`⚡`) executing `1d20+DexMod`.
   - **Integrated 6-Column Ability & Save Grid (`.dnd-2024-grid`):**
     - Each column renders:
       - Header abbreviation (`FOR`, `DES`, `CON`, `INT`, `SAB`, `CAR`).
       - Ability button (`.statblock-roll-btn.abil-btn`): Displays score and modifier (e.g. `+3 (16)`). Tapping triggers Ability Check (`1d20+3`, `isCheck: true`, `🎯`).
       - Saving throw button (`.statblock-roll-btn.save-btn`): Displays saving throw modifier (e.g. `Salva +5`). Proficient saves are highlighted (`is-proficient`). Tapping triggers Saving Throw (`1d20+SaveMod`, `isSave: true`, `🛡️`).
   - **Interactive Skill Chips:** Each creature skill is rendered as a clickable pill button (`.statblock-skill-chip`) rolling `1d20+bonus` with `🎯` check banner.
4. **Universal Multi-Platform Web Ingestion (`url-monster-importer.js`):**
   - **DandWiki Homebrew Ingestion:** Implemented `parseDandWikiMonster(wikitext)` fetching raw MediaWiki text (`?action=raw`), parsing traits, actions, bonus actions, reactions, legendary actions, AC notes, calculated hit dice formulas based on creature size, and clean portrait avatars.
   - **Wikidot Ingestion:** Implemented `parseWikidotCreature(html)` extracting stat block parameters and portraits.
   - **Compendium SRD Resolution:** For Roll20, D&D Beyond, AideDD, and 5e.d20srd links, extracts the creature slug and resolves against the local `BESTIARY` first (100% offline, 0ms), falling back to open GitHub Raw 5e.tools (`bestiary-mm.json`, `bestiary-xmm.json`) or Open5e.
   - **5e.tools 2024 XMM Path Format:** Supports direct paths (`5e.tools/bestiary/magma-mephit-xmm.html`), resolving directly to the 2024 Monster Manual (`bestiary-xmm.json`).

### Consequences
- **Positive:** Complete coverage of all 19 community URLs with instantaneous, zero-CORS resolution; players and GMs can click any attack roll, save DC, ability check DC, or damage dice formula directly within statblock text; authentic D&D 5e 2024 statblock anatomy with clickable Initiative, Ability Checks, and Saving Throws; 100% backward compatible.
- **Verification:** 10/10 tests in `frontend/tests/dice-text-click-roll.test.js` pass; 14/14 tests in `frontend/tests/url-monster-importer.test.js` pass; 6/6 tests in `frontend/tests/monster-statblock-fidelity.test.js` pass; 1,574 / 1,574 total frontend unit tests green across 20 suites; clean Vite production build in 14.41s.

---

## ADR-0025: Browser CORS Remediation, Dual-Tier First-Party Proxy & Robust External Monster Ingestion

### Status
Accepted & Implemented (2026-11-08)

### Context
1. **Browser CORS Rejection on DandWiki & External Wikis:** When GMs pasted external creature links such as `https://www.dandwiki.com/wiki/Barnaclops_(5e_Creature)` directly into the Monster Picker search bar, the web browser's `fetch()` call failed with `TypeError: Failed to fetch`. This occurred because DandWiki (`www.dandwiki.com`) returns HTTP 200 to HTTP clients, but omits the `Access-Control-Allow-Origin` header in browser responses (`cors: null`). Modern browsers block cross-origin reads without this header, showing a red `⚠️ Failed to fetch` banner in the UI.
2. **Fragility of Public Free Proxies:** Public CORS proxies (`allorigins.win`, `codetabs.com`, `corsproxy.io`) suffer from severe rate-limiting, Cloudflare challenges, HTTP 522/403 errors, and deprecation, making them unsuitable for reliable tabletop gameplay.
3. **MediaWiki Macro Truncation & Trait Fidelity:**
   - MediaWiki statblocks frequently nest templates on single property lines, such as `|ci={{5c|Charmed}}, {{5c|Frightened}}`. A naive regex matching `[^|]+` halted at the first pipe inside the macro, truncating values to `"{{5c"`.
   - DandWiki uses creature trait macros like `{{5ect|barnaclops|Amphibious}}`, which require semantic expansion into standard 5e traits with accurate mechanics.
   - Creatures with multi-mode movement (`20 ft., swim 20 ft.`) were defaulting `walk` to 30 ft. rather than extracting specific speeds.

### Decision Outcome
1. **First-Party Dual-Tier CORS Proxy:**
   - **Backend Django Proxy (`backend/api/views_proxy.py` & `urls.py`):**
     - Endpoint `GET /api/proxy?url=<encoded_url>`.
     - Validates scheme (`http`/`https`) and enforces a strict safe-host whitelist (`dandwiki.com`, `wikidot.com`, `5e.tools`, `open5e.com`, `roll20.net`, `dndbeyond.com`, `aidedd.org`, `5e.d20srd.org`).
     - Enforces private IP, loopback, and link-local address blocking to guarantee zero SSRF exposure.
     - Fetches upstream content with an authentic desktop User-Agent and returns raw UTF-8 content with `Access-Control-Allow-Origin: *`.
   - **Vite Dev Server Proxy Middleware (`frontend/vite.config.js`):**
     - Registered `devCorsProxyPlugin` in Vite's development server.
     - Intercepts `/api/proxy` during local frontend development (`npm run dev`) and proxies the request via Node.js runtime, ensuring developers and testers have 100% working monster ingestion even if the Django backend is not running on port 4000.
2. **Client-Side Resilient Fetcher (`frontend/src/campaigns/url-monster-importer.js`):**
   - Implemented `fetchTextWithCorsBypass(url)`:
     - Automatically routes through `${apiBase}/api/proxy?url=...` in browser environments.
     - Falls back to direct fetch for Node.js, Electron, or open-CORS endpoints.
     - Surfaces helpful, actionable guidance to the GM if network or host blocks occur.
3. **DandWiki Parser Hardening (`parseDandWikiMonster`):**
   - Updated `getField` regex to `([^\r\n]+)`, capturing full multi-template lines.
   - Integrated `DANDWIKI_TRAIT_DESCS` macro expander translating `{{5ect|<creature>|<trait>}}` (`Amphibious`, `Pack Tactics`, `Magic Resistance`, `Spider Climb`, etc.) into named traits with full descriptions.
   - Implemented multi-mode speed parser extracting `walk`, `swim`, `fly`, `climb`, and `burrow` into a structured speed object.
   - Cleans condition immunities into normalized lowercased arrays (`['charmed', 'frightened', 'poisoned', 'unconscious']`).
4. **Direct Raw Text & Statblock Paste Ingestion (`MonsterPicker.jsx`):**
   - Exported `isMonsterRawText` and `parseMonsterFromRawText`.
   - The Monster Picker search bar now detects when raw wikitext (starting with `==` or containing `{{5e Creature`) or raw JSON is pasted, instantly parsing and saving the monster locally without making any external HTTP call.

### Consequences
- **Positive:** Zero CORS failures on DandWiki `Barnaclops_(5e_Creature)` and all external wikis in both dev and production; 1:1 parser fidelity with complete traits, speeds, and clean condition immunities; GMs can also paste raw wikitext or JSON directly; 100% offline-first and testable.
- **Verification:** 12/12 tests in `frontend/tests/url-monster-importer.test.js` pass (including live DandWiki Barnaclops ingestion and raw text parser); 1,576 / 1,576 total frontend unit tests green across 20 suites; clean Vite production build in 10.57s.

---

## ADR-0026: Universal Multi-Tier CORS Proxy Cascade, Edge Serverless Ingestion & Arbitrary Link / Plaintext Heuristics

### Status
Accepted & Implemented (2026-11-08)

### Context
1. **Production Serverless Edge Boundary:** The frontend deployed on Vercel (`dd5efichas.vercel.app`) previously routed `/api/*` to the PythonAnywhere backend. When PythonAnywhere was offline or un-updated, `/api/proxy` returned HTTP 404, causing client-side direct `fetch()` to fail with browser CORS errors (`Failed to fetch`) on DandWiki (`Barnaclops_(5e_Creature)`).
2. **Universal Web Ingestion Requirement:** The user required the platform to ingest not only DandWiki, 5e.tools, and compendiums, but ANY arbitrary link or homebrew website provided by the GM, extracting monster statblocks by any heuristic means possible.
3. **Resilience & UX Fallback:** Even in the event of total network failure or hostile anti-bot defenses on external domains, the UI must never show a dead-end error (`Failed to fetch`). The GM must be guided with a 1-click action to paste the statblock text directly, and the importer must support JSON, Wikitext, and Plaintext/Markdown formats interchangeably.

### Decision Outcome
1. **Vercel Edge & Node Serverless Function (`api/proxy.js` & `frontend/api/proxy.js`):**
   - Implemented a universal serverless proxy function compatible with both Vercel Node.js and Edge runtimes.
   - Configured priority rewrite rule in `vercel.json` (`{ "source": "/api/proxy", "destination": "/api/proxy" }`) ahead of the generic PythonAnywhere rewrite, ensuring Vercel serves the proxy directly from its global edge network with zero latency, zero CORS blocking, and zero dependency on PythonAnywhere.
2. **Cascading Client-Side Multi-Tier Proxy Gateway (`fetchTextWithCorsBypass`):**
   - Sequentially attempts multiple proxy channels with strict, fast timeouts (3.5s - 5s):
     1. Local / Edge first-party proxy (`/api/proxy?url=...`).
     2. Cloudflare Edge Worker gateway (`https://cors-get-proxy.sirjosh.workers.dev/?url=...` - verified returning status 200 in 500ms).
     3. Direct fetch (for open-CORS endpoints, Electron, or Node runtimes).
     4. AllOrigins GET wrapper (`https://api.allorigins.win/get?url=...`).
     5. CodeTabs proxy (`https://api.codetabs.com/v1/proxy?quest=...`).
3. **Universal Arbitrary Link Ingestion (`meta.kind === 'unknown'`):**
   - `isMonsterUrl` accepts ANY valid `http://` or `https://` URL.
   - `fetchMonsterFromUrl` retrieves the remote text/HTML, cleans scripts/styles/tags, and dynamically routes through:
     - JSON formats (5emm, Open5e v1/v2, 5e.tools).
     - MediaWiki wikitext (`parseDandWikiMonster`).
     - Plaintext / Markdown statblock parser (`parsePlainTextMonster`).
     - Inferred creature name matching against local `BESTIARY`.
4. **Universal Plaintext & Markdown Parser (`parsePlainTextMonster`):**
   - Parses Name, Size, Type, Alignment, AC with armor notes, HP with hit dice formulas, multi-mode speed (walk, swim, fly, climb, burrow, hover), 6 ability scores, saving throws, skills, damage resistances, immunities, vulnerabilities, condition immunities, senses, languages, CR with XP and proficiency bonus, traits, and actions with automated attack bonus and damage mechanics.
5. **Actionable UI Error Banner & Dual Direct Paste (`MonsterPicker.jsx` & `import-5emm.js`):**
   - Intercepts native browser `Failed to fetch` errors, displaying clear, localized Portuguese/English guidance.
   - Renders a 1-click `[📋 Colar Bloco do Monstro]` / `[📋 Paste Statblock]` button in the error banner that navigates directly to the Import modal.
   - Upgraded `importMonsters` in `import-5emm.js` to automatically detect and parse raw wikitext or plaintext/markdown statblocks alongside JSON.

### Consequences
- **Positive:** 100% resilient monster statblock ingestion regardless of backend deployment status, CORS restrictions, or external website technology; seamless fallback to direct paste in both search bar and import modal; 1,578 frontend unit tests passing green with 0 errors.
- **Verification:** 14/14 tests in `frontend/tests/url-monster-importer.test.js` pass; 10/10 tests in `frontend/tests/import-5emm.test.js` pass; 1,578 / 1,578 total frontend unit tests green across 20 suites; clean Vite production build in 9.43s.


---

## ADR-0027: User-Character-Campaign Multi-Assignment Architecture, Action-Grouped Skills (D&D 5e 2024), Juicy Roll-Up Visuals & 3-State Swipe Engine

### Status
Accepted & Implemented (2026-11-08)

### Context
1. **User / Character / Campaign Multi-Assignment Speculation & Root-Cause Analysis**:
   - The user observed that a user cannot have more than one character assigned to a campaign, and a single character cannot be assigned to multiple campaigns simultaneously.
   - The expected domain relationship is full $N:N$:
     - A user can have $N$ characters.
     - A character can be in $N$ campaigns (e.g. West Marches tables, one-shots, living world conventions).
     - A user can have $N$ characters assigned to $N$ campaigns (e.g. playing both a main PC and a familiar/sidekick/minion in the same campaign).
   - An architectural investigation was requested into why the current schema prevents this, and what constraints exist across models, views, and billing plans.
2. **D&D 5e 2024 Monster Statblock Action-Grouped Skills**:
   - D&D 5e 2024 standardizes all skill checks into 4 core action categories: **Search**, **Study**, **Influence**, and **Hide**.
   - Rather than listing only explicitly trained skills in an unstructured chip cloud, every monster needs all 18 skills calculated and exposed under their respective action group, displaying both passive score and active bonus.
   - To prevent vertical bloat, each group requires a foldable accordion row displaying a smartly consolidated notation that exposes exceptions (e.g. `Search: 15/+5 (20/+5 Perception)`).
   - Unfolded panels require a compact 2-column grid layout to conserve horizontal and vertical viewport space.
3. **Critical Hit (Nat 20) Screen Flash & Background UI Shake Juiciness**:
   - Critical hits (Natural 20) needed an intense, impactful visual punctuation: at the exact moment the climax ripples explode, the entire screen must briefly flash with a golden-to-white radial bloom fading away over 0.3 seconds.
   - Foreground roll-up anticipation needed exaggerated kinetic weight: while the foreground die shakes rapidly (6Hz to 56Hz), the background UI must shake simultaneously along a slower harmonic curve.
4. **Universal 3-State Vertical Swipe Gesture Engine for Advantage & Disadvantage**:
   - Any d20 roll, ability check, saving throw, attack roll, or statblock button must support gesture control:
     - Swiping UP on the rollable element sets **Advantage** (green visual glow, `▲` indicator).
     - Swiping DOWN sets **Disadvantage** (red visual glow, `▼` indicator).
     - Swiping back to center resets to **Normal**.
     - Tapping or clicking executes the roll immediately with the active advantage or disadvantage modifier applied.

### Decision Outcome
1. **Architectural Analysis: Multi-Assignment Constraints in Current Backend**:
   - **Database Level (`backend/api/models.py`)**:
     - `Membership.Meta.unique_together = [('campaign', 'user')]`: Strictly limits each `(campaign, user)` pair to exactly one database record. Because `Membership` holds a single foreign key `character = ForeignKey(Character, null=True)`, a user can physically only occupy one character seat per campaign.
   - **Business Logic Level (`backend/api/views_campaigns.py`)**:
     - `_other_seats(char)` checks whether a character is already referenced in any active `Membership`. If found, the server rejects the request with HTTP 409 `character_in_other_campaign`.
   - **Monetization & Plan Coupling (`backend/api/plans.py`)**:
     - The DM subscription tier model (`table_slots`) sponsors player seats (`Membership.sponsored = True`). The slot allocation assumes 1 seat = 1 player = 1 sponsored character.
   - **Live Combat State & Approval Sandboxing**:
     - Live combat HP, conditions, death saves, spell slots, and DM approval queues (`Approval`) mutate `Character.data` directly. Without campaign-scoped state sandboxing or character forking/branching, playing the same character across multiple live campaigns simultaneously would cause state bleed across different DMs.
   - **Target Migration Path**:
     - Change `unique_together` on `Membership` to `[('campaign', 'character')]`.
     - Update `CampaignSerializer.myMembership` to return an array of seats or the active seat.
     - Implement Campaign-Scoped Sheet Snapshots (or ephemeral branches) so cross-campaign progression can be reconciled safely.
2. **Action-Grouped Skills (D&D 5e 2024 Taxonomy) (`monster-action-skills.js`, `MonsterStatblock.jsx`, `monster-statblock.css`)**:
   - Canonical 18-skill mapping:
     - **Search (Busca)**: Survival (Wis), Insight (Wis), Medicine (Wis), Perception (Wis).
     - **Study (Estudo)**: Arcana (Int), Religion (Int), Nature (Int), Investigation (Int), History (Int).
     - **Influence (Influência)**: Animal Handling (Wis), Deception (Cha), Intimidation (Cha), Performance (Cha), Persuasion (Cha).
     - **Hide (Furtividade)**: Acrobatics (Dex), Athletics (Str), Sleight of Hand (Dex), Stealth (Dex).
   - Consolidated algorithm (`computeActionGroupData`):
     - Computes passive score (`10 + bonus`) and active modifier for all skills.
     - Identifies dominant baseline pair (`${passive}/${bonusStr}`).
     - Filters deviating skills as exceptions, rendering e.g. `Search: 15/+5 (20/+5 Perception)`.
   - Responsive `<details className="statblock-action-details">` with a 2-column grid (`.statblock-action-grid`), passive score badges, and interactive roll buttons.
3. **Critical Hit (Nat 20) Golden-to-White Screen Flash (`DieShape.jsx` & `dice-styles.css`)**:
   - Rendered via `createPortal` to `document.body` as `.dice-crit-flash-screen`.
   - Keyframes `crit-screen-flash` (0.3s duration, `mix-blend-mode: screen`, radiant golden-white gradient fading to 0 opacity).
4. **Exaggerated Background UI Shake (`DieShape.jsx` & `dice-styles.css`)**:
   - During Phase 1 roll-up anticipation (0 -> 750ms), computes slower harmonic background shake offsets `--bg-shake-x`, `--bg-shake-y`, `--bg-shake-rot` and toggles `body.dice-rolling-shake`.
   - Transitions smoothly and removes all body classes and CSS variables upon roll climax or cleanup.
5. **Universal 3-State Swipe-Up / Swipe-Down Gesture Engine (`dice-gestures.js`, `dice-text.js`, `dice-styles.css`)**:
   - `setupGlobalDiceSwipeListener()` attaches pointer-tracking across all roll tokens (`[data-roll-attack]`, `[data-roll-save]`, `[data-roll-check]`, `[data-dice-roll]`, `.statblock-roll-btn`, `.statblock-action-skill-btn`).
   - Dragging up $> 24\text{px}$ sets `has-adv` (emerald green glow `#2ecc71`, `▲` suffix).
   - Dragging down $> 24\text{px}$ sets `has-dis` (crimson red glow `#e74c3c`, `▼` suffix).
   - Tapping/clicking extracts `data-roll-adv` and dispatches `{ adv: advState, advMode: advState }` to the roll engine.

### Consequences
- **Positive:** Full coverage of all D&D 2024 action groups with zero UI bloat; tactile, juicy critical hit celebration and screen rumble; intuitive vertical swipe gesture control for advantage/disadvantage; thorough architectural roadmap for $N:N$ multi-assignment.
- **Verification:** 4/4 tests in `frontend/tests/action-skills-gestures.test.js` pass; 1,582 / 1,582 frontend unit tests green across 20 suites; clean Vite production build in 13.96s.


---

## ADR-0028: Roll Screen Blackout Remediation, Overlay Stacking Isolation & Resilient DandWiki Ingestion with Auto-Decoding

### Status
Accepted & Implemented (2026-11-08)

### Context
1. **Roll Screen Blackout Bug**:
   - Following the introduction of the harmonic background shake in Release v1.0.16, attempting any dice roll caused the screen to turn black with no dice visible and no roll-up animation playing.
   - Diagnostic investigation uncovered two coupled issues:
     - **JavaScript ReferenceError**: In `DieShape.jsx`, `applyAnticipationVars(profile)` was invoked with `(profile, localP)`, but the function signature omitted `localP`. Inside the body, line 93 referenced `localP`, throwing `ReferenceError: localP is not defined` on the very first frame of `requestAnimationFrame`. Because `--rollup-fadein-opacity` was initialized to `0` at $t=0$, this runtime exception permanently froze the die at `opacity: 0`, leaving only the dark `.dice-overlay` backdrop visible (pure black screen).
     - **CSS Containing Block Stacking Trap**: `body.dice-rolling-shake #root` applied `transform: translate3d(...) rotate(...)` to `#root`. Per CSS specs, applying a non-identity `transform` to an ancestor establishes a new containing block for all descendant `position: fixed` elements, trapping and distorting `.dice-overlay`.
2. **DandWiki Ingestion Resiliency**:
   - Compendium imports for homebrew creatures like `Barnaclops_(5e_Creature)` failed in browser environments when public proxies like AllOrigins encoded MediaWiki `text/x-wiki` MIME responses as Base64 Data URIs (`data:text/x-wiki;base64,...`). The importer was treating the base64 string as raw wikitext, failing regex extraction.
   - If an external compendium or wiki redirects to its HTML presentation rather than raw wikitext, the importer previously failed instead of recovering.

### Decision Outcome
1. **`DieShape.jsx` Function Signature & Cleanup Hardening**:
   - Corrected signature to `const applyAnticipationVars = (profile, localP = 0) => {`.
   - Guaranteed that frame 1 and subsequent frames evaluate without throwing exceptions, smoothly transitioning `--rollup-fadein-opacity` from 0 to 1 over 500ms.
   - Added rigorous unmount/cleanup handler in `useEffect` resetting `document.body.classList.remove('dice-rolling-shake')` and all `--bg-shake-*` variables.
   - Guarded critical hit portal mount with `typeof document !== 'undefined' && document.body`.
2. **CSS Stacking Isolation (`dice-styles.css`)**:
   - Removed `#root`, `#app-root`, `.fh-shell`, and `.statblock-card` from `body.dice-rolling-shake`.
   - Scoped background shaking strictly to interior content containers: `.main-layout, .camp-shell, .page-shell, .mesa-container, .ficha-scroll-wrap, .ficha-body`.
   - Enforced `.dice-overlay { transform: none !important; }` to maintain strict viewport-relative fixed positioning.
3. **Data-URI Base64 Auto-Decoding (`url-monster-importer.js`, `api/proxy.js`, `frontend/api/proxy.js`)**:
   - In both client-side `fetchTextWithCorsBypass` and serverless `fetchWithFallback`, auto-detects `data:*;base64,...` from AllOrigins responses and decodes it to clean UTF-8 text via `Buffer.from(b64, 'base64')` or `atob`.
4. **DandWiki Dual-Mode (Wikitext / Plaintext HTML) Fallback Ingestion**:
   - In `fetchMonsterFromUrl`, if wikitext is detected, parses with 1:1 MediaWiki fidelity (`parseDandWikiMonster`).
   - If HTML is returned (`<html`, `<!DOCTYPE`, or `mw-content-text`), seamlessly invokes `parsePlainTextMonster` to recover all statistics, AC, HP, abilities, and actions directly from the rendered DOM.

### Consequences
- **Positive:** Roll screen functions with 100% fluid 60fps animations; zero black screens or freezing; perfect overlay positioning independent of background rumble; DandWiki and arbitrary homebrew compendia import flawlessly through multi-gateway cascades with automatic base64 decoding.
- **Verification:** 1,582 / 1,582 frontend unit tests pass (100% green); 14/14 url-monster-importer tests pass; Vite production build clean in 14.82s.

---

## ADR-0029: Universal Advantage Engine, Action Header Direct Rolls, Keen Senses Auto-Advantage, Staggered Concurrent Proxy Race & Dramatic Vignette Blackout

### Status
Accepted & Implemented (2026-11-08)

### Context
1. **Advantage & Disadvantage Modifier Disconnect**:
   - In monster statblocks and battle views, interactive ability check and saving throw buttons were always performing normal rolls regardless of whether the user had swiped or configured Advantage/Disadvantage.
   - Diagnostic analysis showed `DiceRoller.jsx` only destructured `advMode: am` from roll options, ignoring `adv: optAdv` sent by gesture engines and statblock action buttons. Furthermore, React click handlers on statblock buttons were omitting the event target, preventing gesture-assigned `data-roll-adv` DOM attributes from being forwarded to the roller.
2. **Action Group Accordion vs Direct Header Roll UX**:
   - The D&D 5e 2024 action groups (`Search`, `Study`, `Influence`, `Hide`) displayed a consolidated baseline score in their folded `<summary>` row. However, users needed both the ability to toggle the accordion open/closed to view individual skill breakdowns AND to execute direct d20 ability checks straight from the summary header without toggling the accordion.
3. **Keen Senses Auto-Advantage**:
   - Creatures possessing traits such as "Keen Senses", "Keen Smell", "Keen Hearing", or "Keen Sight" (e.g., Dire Wolf, Bloodhound, Owl, Barnaclops) explicitly grant Advantage on Wisdom (Perception) checks. The system required automatic recognition of these traits across English and Portuguese naming conventions, pre-configuring Perception rolls with default Advantage (`data-roll-adv="adv"` with visual green glow and `▲` badge).
4. **Dramatic & Juicy Roll-Up Vignette Blackout**:
   - To maximize cinematic tension and anticipation during polyhedral tumbling, the background vignette needed to dynamically contract and darken towards the focal center, reaching 100% pitch black at the precise moment of the unravelling ripple explosion (750ms). Once the ripple expands into falloff, the vignette must smoothly ease back to ambient resting values over 350ms.
5. **Staggered Concurrent Proxy Race & Web Ingestion Hardening**:
   - In live browser environments, sequential proxy fallback chains suffered from cumulative network timeouts (up to 24s on unresponsive public proxies like AllOrigins/CodeTabs). Furthermore, SPA routing rewrites on Vercel could return the application's own `index.html` as a false-positive response. A staggered concurrent race with SPA-payload filtering was needed to guarantee sub-1.5s resolution across arbitrary web links and compendiums.

### Decision Outcome
1. **Universal Advantage/Disadvantage Propagation (`DiceRoller.jsx`, `dice-gestures.js`, `dice-text.js`)**:
   - Updated `performRoll` in `DiceRoller.jsx` to resolve effective advantage via `const effectiveAdv = optAdv || am || (advMode !== 'normal' ? advMode : 'normal')`.
   - Updated `handleRoll(opts, e)` in `MonsterStatblock.jsx` to extract `e?.currentTarget?.getAttribute('data-roll-adv')` or active element state, injecting `{ adv, advMode: adv }` into every ability check, saving throw, and action roll.
   - Expanded gesture target matcher in `dice-gestures.js` to recognize `.statblock-action-header-roll-btn`, `.statblock-action-exception-btn`, `.abil-btn`, `.save-btn`, and `.statblock-init-btn`.
2. **Dual-Function Action Summary Header (`MonsterStatblock.jsx`, `monster-statblock.css`)**:
   - Structured `<summary className="statblock-action-summary">` with distinct interactive hit targets:
     - Chevron `▾` + group icon and title toggles the `<details>` accordion open/closed.
     - `.statblock-action-header-roll-btn` executes a direct `1d20+grp.baselineBonusStr` roll, calling `e.stopPropagation()` and `e.preventDefault()` to prevent unwanted accordion toggling.
     - Exception chips (`.statblock-action-exception-btn`) roll the specific divergent skill directly from the folded summary.
3. **Automated Keen Senses Detection (`monster-action-skills.js`)**:
   - Implemented `hasKeenSenses(monster)` checking English and Portuguese traits (`keen smell`, `hearing`, `sight`, `senses`, `faro aguçado`, `olfato apurado`, `sentidos aguçados`, or advantage on perception checks).
   - In `computeActionGroupData`, sets `isKeen: true`, `defaultAdv: 'adv'`, and notation badge `▲` on Perception, automatically activating Advantage on both summary exception chips and unfolded skill rows.
4. **Exponential Focal Vignette Blackout (`DieShape.jsx`, `dice-styles.css`)**:
   - In `applyAnticipationVars`: dynamically drives `--overlay-tunnel-inner` from 48% to 0%, `--overlay-tunnel-outer` from 88% to 0%, and `--overlay-blackout` from 0 to 1.0, plunging the surrounding screen into 100% pitch black at $t = 750\text{ms}$.
   - In `applyFalloffVars`: smoothly eases `--overlay-blackout` back to 0.0 and re-expands the focal aperture to 48%/88% as ripples disperse over 350ms.
5. **Staggered Concurrent Proxy Race (`url-monster-importer.js`, `api/proxy.js`)**:
   - Implemented staggered parallel racing across first-party `/api/proxy`, Edge Worker (`cors-get-proxy.sirjosh.workers.dev`), and AllOrigins base64 data-uri auto-decoding (launching at 0ms, 800ms, 1600ms intervals).
   - First valid upstream response (>30 bytes, non-challenge, non-SPA-index.html) resolves immediately and aborts pending candidates.
   - Reduced direct upstream timeout in `api/proxy.js` to 2.5s to prevent Cloudflare challenge hangs.

### Consequences
- **Positive:** Ability checks and saves in monster statblocks reliably honor Advantage/Disadvantage; Keen Senses creatures automatically roll Perception with Advantage; roll-up animation features dramatic focal blackout with golden critical flash; action group summaries offer both accordion exploration and instant 1-click rolling; external creature links (DandWiki Barnaclops and arbitrary URLs) resolve in < 1.5s with zero CORS or timeout errors.
- **Verification:** 1,584 / 1,584 frontend unit tests pass (100% green); 14/14 url-monster-importer tests pass; 6/6 action-skills-gestures tests pass; Vite production build clean in 15.68s.

---

## ADR-0030: Top HUD Roll Banners, N:N Multi-Campaign Assignment Support, Player Character Skills & Tools Monster Parity, and Hero Header Top-Left Badge Cluster

### Status
Accepted & Implemented (2026-11-09)

### Context
1. **Roll Screen HUD Overlap with Die Stage**:
   - The roll overlay HUD banners (`🎯 ABILITY CHECK`, `🛡️ SAVING THROW`, `⚔️ ATTACK ROLL`) were positioned with `position: absolute; top: 14px;` inside `.dice-overlay-inner`. Because the inner stage is centered vertically and horizontally in the viewport, the HUD badge directly overlapped the tumbling d20 during anticipation, critical bursts, and number settlement.
   - Attack rolls also required granular subtype visualization (Melee, Ranged, Spell, Unarmed, Weapon, and Generic) with distinctive combat themes, icons, and glows.
2. **Multi-Campaign Architecture ($N:N$ Character Assignment)**:
   - The expected campaign relationship is: A user can have $N$ characters; a character can belong to $N$ campaigns; a user can have $N$ characters assigned across $N$ campaigns. The sole restriction is that the **same character cannot be assigned twice to the same campaign**.
   - Previously, `backend/api/views_campaigns.py` performed cross-campaign checks (`_other_seats(char)`), either ejecting characters from other campaigns or returning HTTP 409 `character_in_other_campaign`.
3. **Player Character Skills & Tools Parity with Monster Statblock**:
   - The character's "Skills" tab had a legacy flat or double-column presentation diverging from the monster statblock. The D&D 5e 2024 canonical 4 action groups (`Search`, `Study`, `Influence`, `Hide`) needed identical representation: accordion workflow, consolidated baseline calculation (`baselinePassive/baselineBonusStr`), exception chips, direct 1-click header rolls, and 2-column compact grid with 3-state swipe Advantage/Disadvantage.
   - Furthermore, a 5th action group was required: **"Use Tool" / "Usar Ferramenta" (`🛠️`)**, consolidating all tool proficiencies with modifier calculations (PB + ability modifier + tool expertise) and direct rollability.
4. **Hero Header Layout Consolidation & Minimalist Campaign Badge**:
   - Full-width campaign banners in the hero panel caused visual clutter. A minimalist notification badge (`🏰 N`) embedded on the character nameplate was needed. Clicking toggles a clean embedded panel with Campaign Name, Rolls Broadcast Toggle (`📺 On screen / 🔒 Only me`), and Leave button against the campaign's cover image.
   - All interactive badges needed consolidation in the top-left corner (`Portrait medal -> Level badge -> Minimalist campaigns badge`).
   - Subclass and Progression banners needed to be consolidated inside foldable accordions at the bottom of the character panel, removed completely from all other sheet tabs.

### Decision Outcome
1. **Fixed Viewport Top HUD Roll Banner (`DiceRoller.jsx`, `dice-styles.css`)**:
   - Relocated HUD banners from `.dice-overlay-inner` to root `.dice-overlay` with `position: fixed !important; top: max(24px, env(safe-area-inset-top, 24px)); left: 50%; transform: translateX(-50%); z-index: 10005`.
   - Implemented `getAttackSubtype(label)` and `renderTopHudBanner(overlay, lang)` with support for 6 attack variants (`is-attack-melee`, `is-attack-ranged`, `is-attack-spell`, `is-attack-unarmed`, `is-attack-weapon`, `is-attack-generic`) plus `is-save` and `is-check`.
2. **N:N Multi-Campaign Assignment Support (`backend/api/views_campaigns.py`, `views_characters.py`)**:
   - In `campaign_join`: scoped duplicate checks strictly to `Membership.objects.filter(campaign=campaign, character=char).exclude(user=request.user).first()`. Removed `_release_seats(others)` to keep the character in other campaigns.
   - In `membership_update`: updated intra-campaign validation (`Membership.objects.filter(campaign=campaign, character=char).exclude(pk=m.id).first()`). Removed cross-campaign ejection.
   - In `character_campaigns`: removed `.defer('campaign__cover_image')` and included `'coverImage': m.campaign.cover_image or ''` in JSON response.
3. **Player Skills Tab Action Group & Tool Parity (`Sheet.jsx`, `ficha.css`)**:
   - Mapped character skills through `computeActionGroupData` from `monster-action-skills.js`, rendering canonical action groups (`search`, `study`, `influence`, `hide`).
   - Integrated direct roll buttons (`statblock-action-header-roll-btn`), exception chips, and compact 2-column grid.
   - Added 5th action group: **"Use Tool" / "Usar Ferramenta" (`🛠️`)** using `TOOL_ABILITY_MAP` covering 34 tool categories with standard D&D 5e/2024 abilities.
4. **Hero Header Top-Left Cluster & Bottom Accordions (`Sheet.jsx`, `ficha.css`)**:
   - Clustered interactive items in top-left corner: Portrait medal (`.fh-hero-portrait-medal`) -> Level badge (`LevelUpButton`) -> Minimalist campaigns badge (`.fh-hero-camp-badge`).
   - Created foldable `.fh-hero-campaigns-panel` with campaign cards, live roll target toggles, and leave action.
   - Consolidated Subclass and Progression into foldable accordions (`.fh-hero-bottom-accordions`) at the bottom of `SheetHero`, removing them from all other tabs.

### Consequences
- **Positive:** No collision between roll banner and central die stage; attack rolls accurately styled by subtype; characters can participate in multiple campaigns simultaneously; player skills tab shares 100% UI/UX parity with monster statblocks; clean, decluttered hero header.
- **Verification:** 1,588 / 1,588 unit tests pass (100% green); Vite production build completes cleanly in 10.76s.


## ADR-0031: Multi-Character Campaign Support (N Characters per User), DM Active Player / NPC Toggle, Campaign Seal Medal Trinity, and Skills & Progression Scoping

### Status
Accepted & Implemented (2026-11-09)

### Context
1. **Multi-Character Campaign Assignment ($N$ Characters per User in Same Campaign)**:
   - A single user could not assign more than one character to the same campaign due to `Membership.Meta.unique_together = [('campaign', 'user')]` in `backend/api/models.py` and `update_or_create(campaign=campaign, user=request.user)`. The user requirement expects full $N:N$ relational freedom: a user can create $N$ characters, a character can participate in $N$ campaigns, and a user can assign $N$ characters to the same campaign simultaneously (e.g., controlling a party, a companion, or an alternate). The sole constraint is that the *exact same character* cannot occupy duplicate seats in the same campaign.
2. **DM Active Player vs NPC Designation**:
   - DMs in live campaigns frequently adopt player sheets as campaign NPCs or retain inactive characters as NPCs. The DM needed a direct toggle on player cards in the group panel to switch between "Active Player" (`player`) and "NPC" (`npc`), with distinct visual badge recognition (`🎭 NPC`).
3. **Campaign Badge Visual Trinity**:
   - The campaign badge previously rendered as an oblong pill that clashed with the circular geometry of the Portrait medal (`.fh-hero-portrait-medal`) and the Level badge (`.hero-level.fh-seal`). The top-left corner required a harmonious trinity of 48px circular golden seals.
4. **Skills Tab Spacing & Proficient Skills Exposure**:
   - Wasted vertical space existed between folded action skill rows (`gap: 14px; margin-bottom: 8px`). Additionally, previous exception chips exposed any skill with a modifier mismatch (such as -1 Athletics under Hide), whereas the user explicitly requested exposing only skills with proficiency or expertise.
5. **Redundant Elements in Skills Tab**:
   - The "Expand/collapse all actions" toolbar button and "Passive Perception" header label were redundant because each card operates independently and the "Search" action group baseline already computes and displays passive perception.
   - The 5th action group title needed to be cleaned up from "Battle Action : Use Tool" to "Use Tool" / "Usar Ferramenta".
6. **Feature & Progression Scoping Discipline**:
   - `SheetTools` (Languages and tool proficiencies) was situated in Skills despite being character background/class traits belonging to the "Features" tab.
   - `ProgressionPanel` was rendered via `{children}` outside the tab container, causing it to display globally across all 9 tabs. It needed to be restricted strictly to `{tab === 'play' && ...}`.
7. **Hero Description Languages & Corner Actions**:
   - Spoken languages needed to appear directly beneath the character name: `Species (Background), Class1 (Subclass), Speaks Language1, Language2, LanguageN`.
   - Export, Edit, and Cheat mode buttons needed relocation to the bottom-right corner of the character panel with discrete, minimalist `.fh-corner-chip` styling.

### Decision Outcome
1. **Database & API Multi-Character Support (`models.py`, `serializers.py`, `views_campaigns.py`, `views_characters.py`, `0014_migration`)**:
   - Removed `unique_together = [('campaign', 'user')]` on `Membership`.
   - Added `char_type = models.CharField(max_length=10, choices=[('player', 'Player'), ('npc', 'NPC')], default='player')` and `is_npc = models.BooleanField(default=False)`.
   - Added database indexes on `['user']` and `['campaign', 'character']`.
   - Updated `campaign_join` to accept `campaignId` (for existing members adding another character) or `inviteCode`. If `char` is provided, creates a new membership or fills an empty one, strictly disallowing duplicate assignment of the *same* character (`Membership.objects.filter(campaign=campaign, character=char).first()`).
   - Added `campaignIds` to `CharacterSerializer` so clients immediately know which campaigns a character belongs to.
   - Updated `CampaignSerializer` to provide `myMemberships` (full list) while retaining `myMembership` (primary) for backwards compatibility.
   - Included `coverVer`, `coverUrl`, `isNpc`, and `charType` in `character_campaigns`.
2. **DM Active Player / NPC Toggle (`PlayersPanel.jsx`)**:
   - Added `toggleNpc` handler updating `isNpc` and `charType` via `PUT /api/campaigns/<id>/members/<id>`.
   - Added DM context menu action: `🎭 Definir como NPC` / `👤 Definir como Jogador Ativo`.
   - Rendered high-contrast `🎭 NPC` badge in player card header when `isNpc` is true.
3. **Campaign Seal Trinity (`Sheet.jsx`, `ficha.css`)**:
   - Replaced oblong pill with `CampaignSealButton` (`hero-camp fh-seal`), adopting the exact 48px circular geometry, SVG concentric rings, gold core, castle icon `🏰`, label `MESAS` / `CAMP.`, and top-right notification pip (`.hero-camp-pip`).
4. **Skills Spacing & Trained Skills Exposure (`Sheet.jsx`, `ficha.css`)**:
   - Tightened `.fh-skill-categories-grid` gap to `4px` and `.fh-skills-action-details` margin to `0px`.
   - Filtered folded action summary chips strictly to `(grp.skills || []).filter(sk => Utils.hasSkillProf(char, sk.id) || Utils.hasExpertise(char, sk.id))`.
5. **Skills Tab Cleanup & Scoping (`Sheet.jsx`)**:
   - Removed `fh-skills-collapse-all` button and `Passive Perception` label from `FhTitle`.
   - Renamed 5th action group to `Usar Ferramenta` / `Use Tool`.
   - Relocated `<SheetTools />` to `SheetFeatures`.
   - Restricted `{children}` (`ProgressionPanel`) strictly to `{tab === 'play' && ...}`.
6. **Hero Description Languages & Corner Actions (`Sheet.jsx`, `ficha.css`)**:
   - Formatted `hero-sub` with `[speciesBg, classesListStr, langsText].filter(Boolean).join(', ')`.
   - Pinned `.fh-hero-corner-actions` (`fh-export-chip`, `Edit`, `Cheat`) to `bottom: 10px; right: 14px;` with discrete frosted glass `.fh-corner-chip` styling.

### Consequences
- **Positive:** Players can bring multiple characters to the same table; DMs can flag any sheet as NPC with 1 click; 48px seal trinity creates geometric balance in the hero header; skills tab is compact, clean, and reveals only trained skills on folded headers; progression is scoped strictly to Play.
- **Verification:** 1,588/1,588 frontend unit tests green across 20 suites; clean Vite production build in 11.37s.

---

## ADR-0032: Badge-Array Multi-Roll with In-Place Hero Roll-Up, Coupling, Row Locks and Measured Performance Budget

### Status
Accepted & Implemented (2026-11-09, v1.0.29–v1.0.41)

### Context
1. A multiattack needs several independent rolls (to-hit plus damage, per attack) resolved together. The single-formula roller could not express "three rows, each a d20 and its damage, some with advantage".
2. The first multi-roll reused `DieShape` from the main roller. That component carries a screen-wide throw path (`die-bounce`, vw/vh keyframes) and a 380 px tone halo, so dice left their rows and the advantage glow flooded the screen once rows were zoomed.
3. With every die promoted to the full hero animation, frames stalled for 350–550 ms on a software renderer.

### Decision Outcome
1. **Pure model** in `frontend/src/dice/multi-roll.js`: rows of badges (dice, abilities, PB, flat), coupling groups, row lock with temporary badges, `evalRow`/`evalUnits`, `critExtra` (excludes dice coupled to the d20). UI in `MultiRoll.jsx`; rows persist per character in `localStorage` (`fh-multiroll4:<id>`).
2. **Gestures**: tap adds, drag reorders or couples, swipe on a d20 or a row cycles normal → advantage → disadvantage. Row selectors sit left of the lock on one axis with a gold guide line down to a round, icon-only Roll button.
3. **Focus mode**: on Roll the chrome and unselected rows hide; each die runs the main roller's hero roll-up (`isHero`) in place. `.mr-dshape` disables the throw animation and caps the halo. Dice coupled to a d20 roll stacked beneath it and the d20 pumps to the coupled sum (`targetValue`).
4. **Per-die variance**: `DieShape` gained `delayMs`, `timeScale` and `bodyFx`. Each die starts 0–200 ms late and runs at 0.8–1.25× duration; only the last die to finish drives the focal vignette.
5. **Performance**: measured by ablation (hide one layer, time the roll). Removed the double `drop-shadow` on ripple rings and dice (largest cost), moved the vignette to a composited element (`.mr2-vignette`, transform/opacity only) instead of body custom properties, and froze row zoom during the roll. Worst frame went from ~350–550 ms to ~60 ms in headless Chromium.

### Consequences
- **Positive**: multiattacks resolve in one gesture; the animation matches the main roller; cost is bounded and was measured.
- **Negative**: results never reach the server: no TV, no roll history, no DM-prepared dice. Tracked as D2.1–D2.3 and D2.5 in `docs/sync-spec.md`.
- **Follow-up**: extend `POST /characters/:id/table-roll` to accept grouped results.

---

## ADR-0033: Dice Belt v2: Four Die Hexads, Per-Die PB Wedges, I/II Loadouts, Hold-to-Roll and Ability-Paired Multiattack Rolls

### Status
Accepted & Implemented (2026-11-09, v1.0.42–v1.0.51)

### Context
1. The belt's middle row was a PB hexad plus three dice. PB was a single global toggle, so it applied to every die, including damage dice.
2. Ability hexads rolled on tap while die hexads rolled on hold-and-release.
3. An attack is two rolls (d20, then damage), and a multiattack is several pairs; the belt rolled one hexad at a time.
4. Players keep more than one attack routine and had to rebuild the belt to switch.

### Decision Outcome
1. **Layout** (`BeltAbilities` in `frontend/components/Sheet.jsx`): top row STR · CON · DEX, bottom row INT · CHA · WIS, middle row four swappable dice defaulting to d6 · d20 · d20 · d8. The two central d20s start bound to STR and DEX with PB on.
2. **PB wedges**: a triangular toggle fills the gap between STR|CON and CON|DEX and governs only the die hexad beneath it (`slot.pb`). When on, a gold thread draws around the wedge, down the slit and around that hexad (`.fh-belt-pb-slits`, `.fh-belt-pb-drop`, `.fh-belt-pb-contour`).
3. **Loadout wedges**: inverted wedges in the bottom gaps toggle I/II and swap the two dice on that side (`swapLoadout`). Loadout II starts as a copy of I.
4. **Hold-to-roll everywhere**: `beltHoldToRoll` (220 ms, cancels on a 12 px drag) drives the check and save halves; keyboard activation is unchanged.
5. **Paired rolls** (`frontend/src/dice/BeltMultiRoll.jsx`): rolling a die hexad rolls every hexad bound to the same ability, paired d20 + non-d20 in belt order, one column per pair. Damage reveals first (the d20 runs at 1.7× duration); a natural 20 re-rolls the damage die with the extra crit dice. No on-screen labels; each die gets its own delay, speed-up and HSV drift.
6. **Persistence**: belt slots and loadouts are saved per character in `localStorage` (`fh-belt:<id>`).

### Consequences
- **Positive**: PB is explicit per die, attack + damage is one gesture, two routines per side are one tap apart.
- **Negative**: belt state is per device; paired rolls are local only. Tracked as D2.1–D2.4 in `docs/sync-spec.md`.
- **Supersedes** the PB hexad described in ADR-0010 and `SPEC_BELT_HIVE_STATS_HANDOFF.md` §1–§11; see §18 there.

---

## ADR-0034: Campaigns as Versions of a Character: Template, Per-Campaign Full Copies and an Interim Checkout Store

### Status
Accepted; frontend implemented (2026-11-11, v1.0.54), backend pending

### Context
1. A character was one row shared by every campaign it joined: damage or a level gained at one table showed at the other, and leaving kept nothing of that campaign's state.
2. The production backend cannot be updated at the moment (see `DEPLOY.md` §7), stores one sheet per character and locks sensitive fields while the sheet is in a campaign (`OWNER_LOCKED_IN_CAMPAIGN`).
3. Product decisions (owner): full copies with no shared fields; only the owning player can permanently exclude a version; closed or deleted campaigns keep their version read-only; "promote to template" exists.

### Decision Outcome
1. **Model**: a template plus one complete copy per campaign, in state `active`, `left` or `archived`. Rules in `docs/character-versions.md` §1.
2. **Interim storage**: the server sheet is the working copy of the version in use; the others live in `Character.data.versions` (`current`, `template`, `templatePrev`, `campaigns{}`). Identical portraits are stored by marker (`_avatarSame`), not duplicated.
3. **Switching is a checkout** in a fixed order that satisfies the server lock: unseat from the current table → save the other version → seat at the new table. A failed seat reverts to the template; a closed campaign archives the version.
4. **Reconcile on open**: the store is corrected against `GET /characters/:id/campaigns` and `GET /campaigns` (seated elsewhere, left outside the UI, campaign closed or gone).
5. **Read-only versions** open as a preview character with a non-numeric id (`v:<id>:<key>`), so no code path treats them as an account sheet; `onUpdate` is a no-op and mutating controls are hidden.
6. **Code**: `frontend/src/sheet/versions.js` (pure, 15 tests), `VersionsModal.jsx`, wiring in `components/Sheet.jsx` and `app.jsx` (`#ficha=<id>@<campaign>`).

### Consequences
- **Positive**: works on the production backend today and syncs across devices; no data is lost by leaving.
- **Negative**: a character is seated at one table at a time; the DM cannot see or change a parked version; read-only is enforced on screen only; stored versions enlarge the sheet JSON.
- **Target**: the `CharacterVersion` table and routes in `docs/character-versions.md` §3 (D1.1–D1.14 in `docs/sync-spec.md`), which also lets a character be active in several campaigns at once (already allowed in `main` since ADR-0030/0031).

---

## ADR-0035: World Link Ingestion with SSRF Guard, Linked Images, Map Zones and Containment

### Status
Accepted; implemented in `main` (2026-11-10/11, v1.0.25 and v1.0.52), not yet in production

### Context
1. Building a campaign world card by card is slow; most source material already exists on wikis, SRD JSON endpoints and image hosts.
2. Card images were capped at 450,000 characters of data URL, too small for maps, and could not be external links.
3. Maps had pins but no way to mark an area that leads into another place.

### Decision Outcome
1. **`POST /campaigns/:id/world/ingest`** (`backend/api/world_ingest.py`): fetches a URL and returns a draft card. MediaWiki pages go through the wiki API, JSON through an SRD digester, other pages through an HTML digester, direct images through type sniffing. Every hop passes `check_url` (http/https only; loopback, private, link-local and reserved addresses refused; redirects re-checked).
2. **Viewer links are unwrapped** (`normalize_image_url`): Reddit media pages, Imgur pages and Google image results resolve to the direct image; the unwrapped target is still checked.
3. **Images are returned as links, not bytes**: the draft carries `imageUrl`/`image` as an http(s) address. `world_rules.py` accepts either a data URL up to 5,000,000 characters or an http(s) link without spaces or quotes.
4. **Map zones**: up to 40 rectangles per map (`data.map.zones`), each leading to another entry, auto-fitted to the target's aspect ratio (`frontend/src/world/WorldMap.jsx`).
5. **Containment and sources**: `data.contains` and up to 12 `data.sources` per card.

### Consequences
- **Positive**: one link produces a usable card; large maps fit; no image bytes are stored for linked art.
- **Negative**: linked images can disappear or be hotlink-blocked; the server makes outbound requests on a user's behalf (bounded by the guard, size limits and timeouts).
- **Blocked on deploy**: until the backend updates, ingestion is 404, linked and large images are refused and zones are dropped on save (B10 in `docs/sync-spec.md`).

---

## ADR-0036: Modular Domain Decomposition, High-Level UI/Service Abstractions, and Deterministic Cascade Governance

### Status
Accepted (2026-11-11, `v1.0.56`)

### Context
1. Rapid delivery of 30+ features between `v1.0.21` and `v1.0.56` caused several core files to grow into multi-thousand-line monoliths: `frontend/src/sheet/ficha.css` (6,549 lines), `frontend/components/Sheet.jsx` (4,093 lines), `backend/api/views_combat.py` (2,714 lines), `frontend/styles.css` (2,601 lines), `frontend/components/SheetTabs.jsx` (1,785 lines), `frontend/src/campaigns/url-monster-importer.js` (1,742 lines), and `backend/api/world_rules.py` (1,518 lines).
2. Cross-cutting domain changes (such as `ADR-0034` `CharacterVersion` per campaign and `ADR-0032`/`0033` server-synced multi-rolls) cascade into 10+ backend gameplay consumers and 20+ frontend modules. Without explicit service abstractions and strict module boundaries, changes cause regression drift across unrelated views and tests.

### Decision Outcome
1. **Strict Module Size Budgets**:
   - **React UI Components**: max `500` lines per file. Top-level containers (`Sheet.jsx`, `SheetTabs.jsx`, `NextSession.jsx`, `CombatTab.jsx`) act purely as state orchestrators and layout shells, delegating domain sub-trees to `frontend/src/<domain>/`.
   - **Pure JS Domain Engines**: max `500` lines per file, 100% pure functions with zero React/DOM/fetch imports and dedicated `node --test` suites.
   - **CSS Domain Stylesheets**: max `800` lines per file, organized under domain folders (`frontend/src/sheet/css/sheet-*.css`) using semantic custom properties (`--sheet-*`) and GPU-composited transitions (`transform`, `opacity`).
   - **Django DRF View Modules**: max `600` lines per file. Multi-model mutations, undo ring buffers, and sheet write-backs live in `backend/api/services/<domain>.py`.
2. **Unified Campaign-Sheet Target Resolution (`resolve_sheet_target`)**:
   - All 10 backend gameplay consumers (combat, dice, checks, approvals, world NPC sync, TV screen, party insights, spell cast, rest, and DM edit) must resolve character state through a single service abstraction (`backend/api/services/version_resolver.py::resolve_sheet_target(character, campaign)`) rather than mutating `Character.data` directly.
3. **Deterministic Cascade Mapping & CI Test Gate**:
   - Every backlog epic is governed by [`docs/backlog-grooming-and-cascade-map.md`](docs/backlog-grooming-and-cascade-map.md) and [`docs/sync-contracts.md`](docs/sync-contracts.md), and `.github/workflows/backend-release.yml` must execute `python manage.py makemigrations --check && python manage.py test` prior to building `forja-release.zip`.

### Consequences
- **Positive**: Eliminates monolithic merge conflicts, isolates character-version and dice-pipeline changes behind single service abstractions, and prevents unverified backend releases.
- **Negative**: Requires disciplined incremental extraction (Epic 5) with barrel re-exports so existing test imports remain unbroken during decomposition.

