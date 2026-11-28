# Technical Debt & Legacy Modernization Register — Forja de Heróis

> **Audit Date:** 2026-11-27 (synced through `v1.0.143`)  
> **Health Score:** 17/20 (31 standalone FE tasks shipped in `v1.0.143`: FE monoliths decomposed, CSS split + GPU transitions, WCAG targets >=44px, bundle <110kB gz, Immer Undo, idb + PWA, exponential polling)  
> **Source Documents:** `AUDIT.md`, `CRITIQUE.md`, `DECISIONS.md`, `ARCHITECTURE.md`, `docs/ux-audit-table-speed.md`, [`docs/frontend-backend-split-and-oss-blueprint.md`](docs/frontend-backend-split-and-oss-blueprint.md) (`NANO-001`–`NANO-072`)

---

## 1. Technical Debt Inventory Summary

| Category | Priority | Item Count | Primary Risk | Remediation Target |
|---|---|---|---|---|
| **Architecture / Legacy** | P1 | 92 references | High maintenance cost, regression risk during feature additions | Deprecation & shim isolation (`NANO-015`, `NANO-050`) |
| **Performance / Chunks** | Done (`v1.0.143`) | Entry `< 108 kB` gz | Resolved via `pickChunk` + `char-card-summary.js` + `React.lazy` + `check_bundle_budget.mjs` | Enforced in CI/verify |
| **Animation / Layout** | Done (`v1.0.143`) | 12 selectors fixed | Transitioned to GPU `transform`/`opacity`/`grid-template-rows` | Closed (`NANO-056`) |
| **Accessibility / Mobile**| Done (`v1.0.143`) | 18+ controls fixed | Expanded to $\ge 44\times 44\text{px}$ hit boxes | Closed (`NANO-057`) |
| **Theming / CSS Tokens** | P2 | Modularized (`v1.0.143`) | Split into `src/sheet/css/` (14 files) & `src/styles/` (5 files) | Incremental token polish |
| **Network / Polling** | Done (`v1.0.143`) | `polling.js` + `table-store.js` | Upgraded to `2.5s -> 30s` exponential backoff + jitter + visibility wake | Closed (`NANO-036`) |

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

### 3.1 Current Build Chunk Breakdown (`v1.0.143` — Shipped)
`frontend/src/api/storage.js` `list()`/`get()` now read `frontend/src/api/char-card-summary.js` without eagerly importing `srd.js` or `utils.js`, heavy routes/modals are lazy-loaded, and `pickChunk` in `frontend/vite.config.js` splits vendors & SRD catalogs (`scripts/check_bundle_budget.mjs` enforces `<= 250 kB` gzip entry):
- `dist/assets/app-*.js`: **319.43 kB** (`107.23 kB` Vite gz / `104.7 KiB` gz — down from `2,082.09 kB` / `599.55 kB` gzip)
- `dist/assets/vendor-react-*.js`: **142.97 kB** (`45.80 kB` gz), `vendor-three-*.js`: **525.87 kB** (`131.45 kB` gz), `vendor-pdf-*.js`: **430.83 kB** (`178.21 kB` gz)
- `dist/assets/srd-*.js`: **1,052.94 kB** (`260.82 kB` gz) + split `srd-spells-2024` (`215.18 kB` gz), `srd-spells-extra` (`404.81 kB` gz), `srd-bestiary` (`139.10 kB` gz), `srd-magic-items` (`162.45 kB` gz), `srd-subclasses` (`546.83 kB` gz)
- `dist/assets/pdf.worker-*.js`: **5,417.69 kB** (`1,423.7 KiB` gz — loaded off-thread only when exporting/importing PDF)

### 3.2 Vite Dynamic / Static Import Collision Fix (Resolved `v1.0.143`)
Both Rollup static/dynamic import collision warnings are eliminated (0 warnings):
1. **`SpeciesChoices.jsx`:** Shared summary helpers moved into `frontend/src/progression/species-summary.js`; heavy picker consumers lazy-load cleanly.
2. **`LiveScreenSheet.jsx`:** Shared primitives extracted to `frontend/src/stage/LiveScreenParts.jsx`; consumers unified cleanly.

### 3.3 Active Rollup Chunking (`frontend/vite.config.js`)
Configured via `pickChunk(id)` isolating `vendor-react`, `vendor-three`, `vendor-pdf`, `vendor-state`, `srd`, `srd-spells-2024`, `srd-spells-extra`, `srd-magic-items`, `srd-bestiary`, `srd-subclasses`, and `progression` alongside `VitePWA` (`generateSW`, 145 precache entries).

---

## 4. CSS Layout Transitions & Jank Elimination (Resolved `v1.0.143`)

All 12 P1 layout transitions (`width`, `height`, `max-height`, `margin-top`, `all`) across `frontend/src/styles/*.css`, `frontend/src/creator/creator.css`, `frontend/src/screen/tv-styles.css` (`TVScreen.jsx`), and `frontend/src/shell/shell.css` (`Onboarding.jsx`) were migrated to GPU-composited `transform`, `opacity`, and `grid-template-rows`.

---

## 5. Touch Target & Accessibility Compliance (Resolved `v1.0.143`)

WCAG 2.5.5 (Target Size AAA: $44\times 44\text{px}$) and WCAG 2.5.8 (Target Size AA: $24\times 24\text{px}$) hits expanded across `frontend/src/creator/join-table.css`, `frontend/src/app-extra-styles.css`, `frontend/src/sheet/css/sheet-skills-features.css`, `frontend/src/sheet/css/sheet-spells.css`, and `frontend/src/sheet/css/sheet-polish.css`.

---

## 6. Network Resilience & Polling Improvements (Resolved `v1.0.143`)

Upgraded `frontend/src/api/polling.js` (`computeBackoffMs`: `2.5s -> 30s` with $\pm 15\%$ jitter, `online` / `visibilitychange` instant reset) and wired failure-aware scheduling into `frontend/src/play/table-store.js`.

---

## 7. Production Drift & Client-Side Workarounds (added 2026-11-11)

Register of debt created by the frontend running ahead of the deployed backend. Plan and item numbers: [`docs/sync-spec.md`](docs/sync-spec.md).

| Debt | Where | Clears with |
|---|---|---|
| 47 "servidor antigo" mentions (fallbacks + comments) in 30 files | `frontend/src/{play,prep,stage,screen,player,campaigns,combat,sheet,checks,shell}` | deploy (block A), then delete |
| Character versions stored inside `Character.data.versions` | `frontend/src/sheet/versions.js`, `VersionsModal.jsx` | D1 |
| Read-only versions enforced on screen only | `components/Sheet.jsx` (`is-version-readonly`) | D1.9 |
| Multi-roll and paired belt rolls never reach the server | `frontend/src/dice/MultiRoll.jsx`, `BeltMultiRoll.jsx` | D2.1–D2.3 |
| Belt and multi-roll setup saved per device | `localStorage` `fh-belt:<id>`, `fh-multiroll4:<id>` | D2.4, D2.5 |
| NPC card sync done through the World API from the client | `frontend/src/sheet/npc-link.js` | deploy (B11) |
| Pact slots refunded client-side on a short rest | `components/SheetTabs.jsx` | deploy (B12) |
| Stale version label in production (`fcaa730` vs code of 2026-10-26) | `scripts/self_update.py` | A4 |
| ~~Backend suite red on `main` (13 failures, 2 errors)~~ **Resolved in `v1.0.136`** (`5de5cf5`, `606f4df`, `bc98391`, `29f6b3a`, `f22ac4c`) | `backend/api/tests/` | Done |
| ~~Release packaged without running tests~~ **Resolved in `v1.0.136`** (`d824fa2`: `check:rules`, `makemigrations --check`, `check_doc_refs.py`, `manage.py test` gate) | `.github/workflows/backend-release.yml` | Done |
| ~~Unused `BeltPbSlot` component left after the belt redesign~~ **Removed in `v1.0.143`** | `components/Sheet.jsx` | Done |

---

## 8. Monolithic File Decomposition & Component Abstraction Blueprint (updated 2026-11-28, `v1.0.145`)

Full deterministic decomposition plan and cascade maps: [`docs/backlog-grooming-and-cascade-map.md`](docs/backlog-grooming-and-cascade-map.md) (Epic 5) and [`ADR.md`](ADR.md) (`ADR-0036`). Note: all targeted FE CSS & JS monoliths except `url-monster-importer.js` (`NANO-037`, backend-coupled) now meet strict `< 500L` / `< 800L` budgets.

| Monolithic File | Lines (`v1.0.145`) | Target Budget | Extracted / Planned High-Level Modules |
| :--- | ---: | ---: | :--- |
| [`frontend/src/sheet/ficha.css`](frontend/src/sheet/ficha.css) | **15** (was 7,381) | `< 800` / module | **Done (`v1.0.143`)**: 14 ordered domain stylesheets under `frontend/src/sheet/css/` (`sheet-tokens`, `sheet-hero`, `sheet-belt`, `sheet-skills-features`, `sheet-spells`, `sheet-inventory-modals`, `sheet-polish`, etc.) |
| [`frontend/components/Sheet.jsx`](frontend/components/Sheet.jsx) | **474** (was 5,469) | `< 500` (orchestrator) | **Done (`v1.0.143`–`v1.0.145`)**: `hero/SheetHero.jsx`, `belt/{BeltHive,BeltHex,BeltQuickSlot}.jsx`, `tabs/{SheetSkillsSection,SheetFeaturesSection,SheetCompanionsAndNotes,SheetPlay,TimelineModals}.jsx`, `use-sheet-hooks.js`; dead `BeltPbSlot` removed |
| [`backend/api/views_combat.py`](backend/api/views_combat.py) | 2,714 | `< 600` / module | `services/combat_setup.py`, `services/combat_undo.py`, `services/combat_actions.py`, `services/combat_media.py` *(a criar)* |
| [`frontend/styles.css`](frontend/styles.css) | **6** (was 2,768) | `< 800` / module | **Done (`v1.0.143`)**: split into `frontend/src/styles/{tokens,base,catalog,overlays,modals}.css` with GPU compositor transitions |
| [`frontend/components/SheetTabs.jsx`](frontend/components/SheetTabs.jsx) | **8** (was 2,647) | `< 450` / module | **Done (`v1.0.143`)**: `spells/{UnifiedSpellsHUD,SlotMatrix,SpellRow,RestButtons,SpellViews}.jsx`, `inventory/{InventoryList,SheetInventoryTab}.jsx`, `story/SheetStoryTab.jsx` |
| [`frontend/src/campaigns/url-monster-importer.js`](frontend/src/campaigns/url-monster-importer.js) | 1,742 | `< 500` / stage | Separate HTML scraping onto `backend/api/monster_ingest.py` *(a criar)* (`NANO-037`) |
| [`backend/api/world_rules.py`](backend/api/world_rules.py) | 1,518 | `< 550` / module | Split world consistency linter, graph relation validators, and NPC sheet extractor (`services/` *(a criar)*) |
| [`frontend/src/prep/NextSession.jsx`](frontend/src/prep/NextSession.jsx) | **369** (was 1,441) | `< 500` / view | **Done (`v1.0.143`–`v1.0.145`)**: `SessionSummaryHeader.jsx`, `SceneChecklistDrawer.jsx`, `EncounterLauncher.jsx`, `NextSessionSteps.jsx`, `NextSessionOverlays.jsx`, `use-next-session-sync.js` |


