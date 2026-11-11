# Technical Debt & Legacy Modernization Register — Forja de Heróis

> **Audit Date:** 2026-11-06  
> **Health Score:** 11/20 (Acceptable — Significant work required)  
> **Source Documents:** `AUDIT.md`, `CRITIQUE.md`, `DECISIONS.md`, `ARCHITECTURE.md`

---

## 1. Technical Debt Inventory Summary

| Category | Priority | Item Count | Primary Risk | Remediation Target |
|---|---|---|---|---|
| **Architecture / Legacy** | P1 | 92 references | High maintenance cost, regression risk during feature additions | Deprecation & shim isolation |
| **Performance / Chunks** | P1 | 5 large chunks | Slow initial page load, high TTI on low-end mobile devices | Dynamic `import()` & manualChunks |
| **Animation / Layout** | P1 | 12 selectors | UI jank & frame drops during intense combat/TV updates | `transform`/`opacity` refactor |
| **Accessibility / Mobile**| P1 | 18 controls | Touch inaccuracy and player frustration during live play | $\ge 44\times 44\text{px}$ touch targets |
| **Theming / CSS Tokens** | P2 | 411 hex literals | High friction for theme modifications and dark/light shifts | Token consolidation to CSS vars |
| **Network / Polling** | P2 | 1 module | Silent failure loops when server is degraded or restarting | Exponential backoff & status UI |

---

## 2. Legacy Codebase Modernization (92 `legacy` References)

During the migration from the original v1/v2 tab-based interface to the unified 4-Area Shell (`world`, `prepare`, `play`, `group`), several compatibility shims were introduced. These references fall into three distinct classifications:

### Classification A: Intentional 2014 Rules Compatibility (MUST PRESERVE)
*Do NOT remove these references; they provide official D&D 2014 SRD 5.1 rule adherence:*
- `frontend/data/subraces-2014.js`: Legacy subraces (Hill Dwarf, High Elf, Lightfoor Halfling, etc.).
- `frontend/data/spells-legacy-classes.js`: 2014 spell list assignments.
- `frontend/data/class-options/shared.js` (`legacyChoices`, `legacySubclassChoices`): 2014 class option progression slots.
- `frontend/tests/legacy-rules.test.js` & `spells-legacy.test.js`: Regression test suites guaranteeing 2014 characters do not break.

### Classification B: Navigational & Shell Adapters (SCHEDULED FOR ISOLATION)
*These map legacy tab identifiers to new 4-area coordinates:*
- `frontend/src/shell/shell-logic.js` (`LEGACY_TAB_TO_AREA`):
  ```js
  LEGACY_TAB_TO_AREA = {
    now: ['play', 'scene'],
    overview: ['play', 'scene'],
    combat: ['play', 'combat'],
    rolls: ['play', 'checks'],
    screen: ['play', 'screen'],
    prep: ['prepare', 'adventures'],
    items: ['prepare', 'items'],
    members: ['group', 'players'],
    approvals: ['group', 'requests'],
  };
  ```
- **Remediation Plan:** Update all legacy dispatchers (`onNavigate`, `onOpenTab`) in `TableNow.jsx`, `CombatTab.jsx`, and `PrepTab.jsx` to dispatch `{ area, sub }` directly. Once call sites are migrated, deprecate `LEGACY_TAB_TO_AREA`.

### Classification C: Deprecated Code & API Shims (REMOVAL BACKLOG)
- `frontend/src/shell/legacy/`: Contains unmaintained legacy fallback components.
- `frontend/src/stage/stage-api.js` (legacy screen endpoints): Superseded by `views_campaigns.campaign_stage`.
- `frontend/src/play/combat-actions.js`: Partially duplicates logic now unified in `combat-sets.js` and `views_combat.py`.
- `frontend/src/shell/useArea.js` (legacy query string synchronization).

---

## 3. Frontend Bundle Splitting & Performance Debt

### 3.1 Current Build Chunk Breakdown
Production build currently yields oversized bundles:
- `dist/assets/app-*.js`: **1,701 kB** (508 kB gzip)
- `dist/assets/srd-*.js`: **1,493 kB** (321 kB gzip)
- `dist/assets/progression-*.js`: **869 kB** (263 kB gzip)
- `dist/assets/bestiary-*.js`: **748 kB** (139 kB gzip)
- `dist/assets/dice-scene-*.js`: **534 kB** (135 kB gzip)
- `dist/assets/sheet-data-*.js`: **484 kB** (191 kB gzip)

### 3.2 Vite Dynamic / Static Import Collision Fix
The Vite build emits warnings where modules are dynamically imported in one file but statically imported in another, preventing Rollup from moving them into separate lazy chunks:
1. **`SpeciesChoices.jsx`:**
   - *Issue:* Dynamically imported in `app.jsx`, `AdminScreen.jsx`, `ClosedCampaignBanner.jsx`, but statically imported in `components/Creator.jsx`, `components/Sheet.jsx`, `components/SheetTabs.jsx`.
   - *Fix:* Convert static imports in `Creator.jsx` and `Sheet.jsx` to `React.lazy()` with `<Suspense>` wrappers.
2. **`LiveScreenSheet.jsx`:**
   - *Issue:* Dynamically imported in `CampaignDetail.jsx`, but statically imported in `MoreSheet.jsx` and `ScreenWindow.jsx`.
   - *Fix:* Align all import sites to lazy imports.

### 3.3 Target Rollup Chunking Architecture
Configure `vite.config.js` with explicit `output.manualChunks`:
```js
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-three': ['three'],
  'vendor-pdf': ['pdf-lib'],
  'srd-core': ['./frontend/data/srd.js'],
  'srd-spells': ['./frontend/data/srd2024-spells.json', './frontend/data/srd2024-spells-pt.json'],
  'srd-bestiary': ['./frontend/data/monsters-srd521.js', './frontend/data/monsters-pt.js'],
  'srd-rules': ['./frontend/data/srd2024-rules.json', './frontend/data/class-options/index.js'],
}
```

---

## 4. CSS Layout Transitions & Jank Elimination

Animating layout properties triggers expensive browser reflows (Layout $\rightarrow$ Paint $\rightarrow$ Composite). The following files contain P1 layout transitions:

| File & Line | Current Property | Refactor Target |
|---|---|---|
| `frontend/styles.css:898` | `transition: width 0.3s ease` | `transform: scaleX(...)` with `transform-origin: left` |
| `frontend/src/creator/creator.css:13` | `transition: height 0.4s` | CSS Grid `grid-template-rows: 0fr -> 1fr` |
| `frontend/src/screen/tv-styles.css:279`| `transition: margin-top 0.5s` | `transform: translateY(...)` |
| `frontend/src/shell/shell.css:391` | `transition: max-height 0.3s` | CSS Grid row expansion or opacity cross-fade |
| `frontend/src/shell/mesa.css:690` | `transition: width 0.2s` | `transform: scaleX(...)` |

---

## 5. Touch Target & Accessibility Compliance

WCAG 2.5.5 (Target Size AAA: $44\times 44\text{px}$) and WCAG 2.5.8 (Target Size AA: $24\times 24\text{px}$) remediation targets:

1. **`frontend/src/creator/join-table.css:102`:** Radio button currently sized at $18\times 18\text{px}$.
   - *Remediation:* Wrap radio input in a container label with minimum `min-height: 44px; display: flex; align-items: center;`.
2. **`frontend/src/app-extra-styles.css:1158` & `:1137`:** Miniature action icons sized at $14\times 14\text{px}$ and $22\times 22\text{px}$.
   - *Remediation:* Expand hit box using `padding: 11px; margin: -11px;` or setting container button `min-width: 44px; min-height: 44px;`.
3. **`frontend/components/Sheet.jsx` (Sub-actions and spell slots):**
   - *Remediation:* Ensure all clickable pips and small toggles enforce a transparent hit-box buffer.

---

## 6. Network Resilience & Polling Improvements

Current implementation in `frontend/src/api/polling.js`:
- Uses fixed 2,500ms interval.
- Catches network errors with empty `catch { /* swallow */ }` blocks.
- When PythonAnywhere experiences temporary maintenance or network latency, the client loops continuously without informing the user.

**Remediation Architecture:**
1. **Exponential Backoff:** Start at 2.5s; on network failure, back off to 5s, 10s, max 30s. Reset to 2.5s upon first successful 200/304 response.
2. **UI Telemetry:** Trigger an unobtrusive offline status pill in the shell when 3 consecutive polls fail, notifying the DM that real-time sync is paused.

---

## 7. Production Drift & Client-Side Workarounds (added 2026-11-11)

Register of debt created by the frontend running ahead of the deployed backend. Plan and item numbers: [`docs/sync-spec.md`](docs/sync-spec.md).

| Debt | Where | Clears with |
|---|---|---|
| 35 "servidor antigo" fallback branches in 22 files | `frontend/src/{play,prep,stage,screen,player,campaigns,combat,sheet,checks,shell}` | deploy (block A), then delete |
| Character versions stored inside `Character.data.versions` | `frontend/src/sheet/versions.js`, `VersionsModal.jsx` | D1 |
| Read-only versions enforced on screen only | `components/Sheet.jsx` (`is-version-readonly`) | D1.9 |
| Multi-roll and paired belt rolls never reach the server | `frontend/src/dice/MultiRoll.jsx`, `BeltMultiRoll.jsx` | D2.1–D2.3 |
| Belt and multi-roll setup saved per device | `localStorage` `fh-belt:<id>`, `fh-multiroll4:<id>` | D2.4, D2.5 |
| NPC card sync done through the World API from the client | `frontend/src/sheet/npc-link.js` | deploy (B11) |
| Pact slots refunded client-side on a short rest | `components/SheetTabs.jsx` | deploy (B12) |
| Stale version label in production (`fcaa730` vs code of 2026-10-26) | `scripts/self_update.py` | A4 |
| Backend suite red on `main` (13 failures, 2 errors) and a missing migration | `backend/api/tests/`, `migrations/` | C1–C8 |
| Release packaged without running tests | `.github/workflows/backend-release.yml` | C9 |
| Unused `BeltPbSlot` component left after the belt redesign | `components/Sheet.jsx` | delete |

---

## 8. Monolithic File Decomposition & Component Abstraction Blueprint (added 2026-11-11)

Full deterministic decomposition plan and cascade maps: [`docs/backlog-grooming-and-cascade-map.md`](docs/backlog-grooming-and-cascade-map.md) (Epic 5) and [`ADR.md`](ADR.md) (`ADR-0036`).

| Monolithic File | Current Lines | Target Budget | Planned High-Level Extraction Modules |
| :--- | ---: | ---: | :--- |
| [`frontend/src/sheet/ficha.css`](frontend/src/sheet/ficha.css) | 6,549 | `< 800` / module | `sheet-tokens.css`, `sheet-hero.css`, `sheet-belt.css`, `sheet-skills-features.css`, `sheet-spells.css`, `sheet-inventory-modals.css` |
| [`frontend/components/Sheet.jsx`](frontend/components/Sheet.jsx) | 4,093 | `< 500` (orchestrator) | `SheetHero.jsx`, `BeltHive.jsx`, `SheetSkillsSection.jsx`, `SheetFeaturesSection.jsx`, `SheetCompanionsAndNotes.jsx` + delete dead `BeltPbSlot` |
| [`backend/api/views_combat.py`](backend/api/views_combat.py) | 2,714 | `< 600` / module | `services/combat_setup.py`, `services/combat_undo.py`, `services/combat_actions.py`, `services/combat_media.py` |
| [`frontend/styles.css`](frontend/styles.css) | 2,601 | `< 800` / module | Split global design tokens (`:root`), creator shell, and catalog grids; replace layout transitions with `transform`/`opacity` |
| [`frontend/components/SheetTabs.jsx`](frontend/components/SheetTabs.jsx) | 1,785 | `< 450` / module | `UnifiedSpellsHUD.jsx`, `SlotMatrix.jsx`, `SpellRow.jsx`, `SheetInventoryTab.jsx`, `SheetStoryTab.jsx` |
| [`frontend/src/campaigns/url-monster-importer.js`](frontend/src/campaigns/url-monster-importer.js) | 1,742 | `< 500` / stage | Separate HTML sanitizer/scraper, bilingual statblock regex parser, and CR normalizer |
| [`backend/api/world_rules.py`](backend/api/world_rules.py) | 1,518 | `< 550` / module | Split world consistency linter, graph relation validators, and NPC sheet extractor |
| [`frontend/src/prep/NextSession.jsx`](frontend/src/prep/NextSession.jsx) | 1,434 | `< 500` / view | Extract scene checklist drawer, encounter launcher, and session summary header |


