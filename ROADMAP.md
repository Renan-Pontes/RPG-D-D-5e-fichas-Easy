# Forja de Heróis — Master Engineering & Product Roadmap

> **Current Engine State:** `v1.0.145` on `main` (2026-11-28)  
> **Frontend Test Baseline:** 100% Green across 159 test files (`1,752` assertions)  
> **Backend Test Baseline:** 100% Green (`1,009` test cases on `main`, Epic 1 `C1`–`C9` resolved in `v1.0.136`)  
> **Build Status:** Vite v6.4.6 Production Build Clean (`app` entry `<= 250 kB` gzip, Workbox PWA, Biome correctness + bundle budget enforced in CI)  
> **Master Specifications:** [`docs/frontend-backend-split-and-oss-blueprint.md`](docs/frontend-backend-split-and-oss-blueprint.md) · [`docs/backlog-grooming-and-cascade-map.md`](docs/backlog-grooming-and-cascade-map.md) · [`docs/sync-spec.md`](docs/sync-spec.md) · [`docs/sync-contracts.md`](docs/sync-contracts.md) · [`docs/character-versions.md`](docs/character-versions.md) · [`docs/ux-audit-table-speed.md`](docs/ux-audit-table-speed.md) · [`PLANO-MESA-E-METRICAS.md`](PLANO-MESA-E-METRICAS.md) · [`SPEC_BELT_HIVE_STATS_HANDOFF.md`](SPEC_BELT_HIVE_STATS_HANDOFF.md) · [`TECH_DEBT.md`](TECH_DEBT.md) · [`ADR.md`](ADR.md)

---

## 1. Roadmap Horizon Overview

> **72-Item Nano Backlog & OSS Architecture:** [`docs/frontend-backend-split-and-oss-blueprint.md`](docs/frontend-backend-split-and-oss-blueprint.md) defines the 12-domain Frontend/Backend ownership boundary, Debate-Council-verified OSS stack (`immer`, `idb`, `vite-plugin-pwa`, dual-canvas `destination-out` Fog + `simplify-js`, shared Dice AST, `HackSoftware` `services/`/`selectors/` *(a criar)*), and ordered `NANO-001`–`NANO-072` tasks — including newly discovered P0 items (`FEAT_RESOURCES` parity, `respec` approvals, `LevelUpModal.jsx` single-RNG fix, `combat_player_attack` save `DiceRig` fix, `vite.config.js` SSRF guard, and PythonAnywhere NFS-safe SQLite `timeout: 20`).

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │ WAVE 0 (IMMEDIATE): Backend Sync, Version Engine & Monolith Split      │
   │ • Epic 1: Repair main Backend Tests & Migration 0015 (sync-spec C1–C9) │
   │ • Epic 2: Server CharacterVersion Model & 10 Consumers (D1.1–D1.14)    │
   │ • Epic 3: Server Multi-Roll & Belt v2 Persistence (D2.1–D2.5)          │
   │ • Epic 4: Production Deploy & Legacy Fallback Removals (Block A & B)       │
   │ • Epic 5: Decompose Sheet.jsx, SheetTabs.jsx, ficha.css, views_combat  │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ WAVE 1: Ergonomics, Performance & Integrity                            │
   │ • [SHIPPED] 3–4–3 Belt v2 Hive Stats, PB Wedges, Loadouts I/II         │
   │ • [SHIPPED] Sheet Hero/Spells Consolidation, Rest Bar, SRD Spell Text  │
   │ • [SHIPPED] DM Guide, Next-Step Onboarding & Per-Die Prepared Queues   │
   │ • [REMAINING] Epic 6: Vite manualChunks, Compositor CSS & 44px Targets │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ WAVE 2: The Unified Mesa, World Cartography & Tactical Intelligence    │
   │ • [SHIPPED] Frente A: 11-Axis Party Radar, Spell Tags, Versus & Moments│
   │ • [SHIPPED] Stage, ETag Pulse, Combat Undo, Multi-Char Seats, World Map│
   │ • [REMAINING] Epic 7: Fog Brush, Player Token Drag, Pings, Soundscapes │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ WAVE 3: Scalability, Infrastructure & Ecosystem Expansion (Epic 8)     │
   │ • Database Evolution: SQLite to Pooled MySQL on PythonAnywhere         │
   │ • Media Offload: Cloudflare R2 / S3 Presigned Object Storage           │
   │ • Progressive Web App (PWA) Offline Service Worker Pack                │
   └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Wave 1: Ergonomics, Performance & Integrity

### Track 1.1: Honeycomb Belt Hive Stats (`SPEC_BELT_HIVE_STATS_HANDOFF.md`, `ADR-0033`)
- [x] **Belt v2 3–4–3 Geometry & Order (`v1.0.42`–`v1.0.51`):** Regular hex ratio ($H = W \times 1.1547$) in `frontend/src/sheet/ficha.css` with top row `STR · CON · DEX`, middle row 4 swappable die hexes (`d6 · d20 · d20 · d8`), bottom row `INT · CHA · WIS` (`frontend/components/Sheet.jsx` (`BeltAbilities``, `components/Sheet.jsx`).
- [x] **Triangular PB & Loadout Wedges:** Per-slot triangular proficiency bonus wedges (`.fh-belt-pb-wedge`) and inverted `I`/`II` loadout wedges (`.fh-belt-loadout-wedge`) nested cleanly in the inter-hex valleys.
- [x] **Gesture Calibration & Paired Multiattack Rolls:** `beltHoldToRoll` (`220ms`), vertical swipe Advantage/Disadvantage ($\pm 18\text{px}$), drag-to-bind ability pairing, and `BeltMultiRoll.jsx` with crit auto-reroll.
- [x] **Keyboard Accessibility & Visual Parity:** Arrow navigation, Enter/Space roll triggers, and responsive scaling down to 320px viewports.
- [ ] **Server Persistence & Table-Roll Broadcast (`sync-spec` D2.1–D2.5, Epic 3):** Move `fh-belt:<id>` from `localStorage` into `Character.data.beltConfig` / `CharacterVersion.data.beltConfig` and post paired/multiattack rolls to `POST /api/characters/:pk/table-roll`.

### Track 1.2: Bundle Chunking & Performance Optimization (`AUDIT.md` P1, Epic 6 — Shipped `v1.0.143`)
- [x] **Dynamic SRD & Vendor Splitting (`Task 6.1`, `NANO-028`/`NANO-030`/`NANO-031`):** Configured `pickChunk` in `frontend/vite.config.js` (`vendor-react`, `vendor-three`, `vendor-pdf`, `vendor-state`, `srd`, `srd-spells-2024`, `srd-spells-extra`, `srd-magic-items`, `srd-bestiary`, `srd-subclasses`, `progression`), extracted `frontend/src/api/char-card-summary.js`, lazy-loaded heavy routes + Web Worker `frontend/src/pdf/pdf.worker.js`, and enforced `scripts/check_bundle_budget.mjs` (`app` entry reduced from `2,082 kB` / `600 kB` gzip to `319.43 kB` / `107.23 kB` gzip).
- [x] **Species & Stage Import Unification (`Task 6.1`, `NANO-029`):** Resolved static/dynamic import collisions via `frontend/src/progression/species-summary.js` and `frontend/src/stage/LiveScreenParts.jsx` (0 Rollup collision warnings).
- [x] **Layout Transition Jank Remediation (`Task 6.2`, `NANO-056`):** Replaced CSS `transition: width/height/max-height/margin/all` with GPU-composited `transform`, `opacity`, and `grid-template-rows` across `src/styles/*.css`, `creator.css`, `tv-styles.css`, `shell.css`, `Onboarding.jsx`, and `TVScreen.jsx`.
- [x] **Dependency SCA Hardening (`NANO-011`):** Resolved `source-map-js` / `vite` advisories via `npm audit fix` (0 high/critical vulnerabilities).

### Track 1.3: User Experience, Sheet Consolidation & Design Polish (`CRITIQUE.md` P1)
- [x] **DM Fast-Track Onboarding (`GmGuide.jsx`, `NextStepCard.jsx`):** Actionable setup guide (`guide-model.js`, `next-step.js`) and `WhatsNew.jsx` release walkthrough.
- [x] **Universal Confirmation Dialogs (`ConfirmDialog.jsx`):** Standardized `confirmDialog` across Prepare, Items, and Group tabs.
- [x] **Prepared Dice Per-Player Cards & Jump-Queue (`AdvancedDice.jsx`):** Promoted Prepared Dice to per-player cards with 1 queue per die size (`d4`–`d100`), `before` insertion, and `⚡` jump-queue (`prepared-dice.js`, `views_dice.py`).
- [x] **Character Sheet Hero, Skills & Spells Consolidation (`2f22e00`):** Removed intrusive alignment/player/milestone tags from hero banner; discrete top-right `Cheat -> Edit -> Export` toolbar; universal `RestButtons` beneath spoken languages; consolidated `(Abil) Spell Save DC` & `(Abil) Spell Attack Bonus`; restored `SlotMatrix` (Long Rest vs Short Rest Pact Magic); casting time on folded spell rows; SRD 5.2.1 spell descriptions (`spell-text.js`, `spell-mechanics.json`); collapsible Skills action groups (`Search`, `Study`, `Influence`, `Hide`, `Use Tool`).
- [x] **1:1 Official Rules & Metric PT-BR Catalog Completion (`v1.0.133`):** Completed 1:1 EN + metric PT-BR official texts across all 2014 (`520`) & 2024 (`536`) spells, classes/subclasses/options, `180` feats, 2014/2024 species/races/subraces, 2014 & `16` 2024 backgrounds, and `90` non-pack items (`412`/`416` catalog items described, excluding the 4 equipment packs), with `backend/api/progression/catalog.json` (`scripts/sync-rules.mjs`) and `frontend/data/spell-tags.json` (`scripts/build-spell-tags.mjs`) synchronized.
- [x] **Rich Rule Blocks, Slim Spell Core, Universal Timeline Choices & Condition FX (`v1.0.133`–`v1.0.141`):** One-line 2024 spell summaries on initial load (`frontend/scripts/slim-spells.mjs`), structured paragraphs/tables/bullets + inline summon creature `MonsterStatblock.jsx` (`frontend/src/sheet/rich-text.jsx`), universal timeline choice capture/disclosure/respec across species/classes/feats/backgrounds (`v1.0.134`), Play-tab direct tap-to-roll on medals and ability hexes (`v1.0.137`), and full condition/HP/exhaustion visual + informational marker system (`FhStatus.jsx`, `condition-rules.js`, `condition-fx.css`, `v1.0.138`–`v1.0.139`).
- [x] **Touch Target Sizing (`Task 6.2`, `NANO-057`, `v1.0.143`):** Expanded undersized interactive targets ($\ge 44\times 44\text{px}$) in `frontend/src/creator/join-table.css` (`.fh-join-code-actions .btn`), `frontend/src/app-extra-styles.css` (`.camp-char-Inspect`), spell slot diamonds, and resource pips.
- [x] **Mobile Table-Speed UX, Undo, Rest Preview, Theme & Audio (`v1.0.143`–`v1.0.145`):** Added `Immer` 20-step Undo/Redo (`frontend/src/sheet/undo-history.js`), mobile 56px `MobileStickyHero` + `Jump-to` bar (`SheetHero.jsx`), 5-tab `MobileSheetNav.jsx`, `MyTurnView.jsx`, automatic Concentration DC banner, `HpDeltaPopover.jsx`, Screen Wake Lock + haptics (`wake-lock.js`), Rest Summary preview (`rest-summary.js`), Nat 20/1 WebAudio sting (`dice-audio.js`), dark-room `"Table"` theme + `>= 12px` text floor (`table-theme.js`, `sheet-polish.css`), per-tab scroll memory (`use-sheet-hooks.js`), `OffscreenCanvas` WebP resize (`world/image.js`), `QuickSearch` slash commands (`quick-actions.js`), recursive-descent FE Dice AST (`dice-ast.js`), and Homebrew JSON Bundle I/O (`bundle-io.js`).

---

## 3. Wave 2: The Unified Mesa, World Cartography & Tactical Intelligence

### Track 2.1: Frente A — Party Tactical Insights (`PLANO-MESA-E-METRICAS.md` — Shipped on `main`)
- [x] **Structured Spell Effects Catalog (`scripts/build-spell-tags.mjs`, `frontend/data/spell-tags.json`, `spell-mechanics.json`):** Automated extraction of damage types, saving throws, healing, AoE, and conditions across all 339 SRD spells.
- [x] **11-Axis Party Role & Skill Coverage Radars (`PartyInsights.jsx`, `party-metrics.js`, `Radar.jsx`):** 90% sheet-derived / 10% class baseline scoring across 11 tactical roles with average vs peak radar polygons and SWOT breakdown.
- [x] **Bestiary Vulnerability Matching (`versus.js`):** Cross-references party damage types and saving throws against SRD 5.2.1 monsters (`srd-monsters-521.json`).
- [x] **Spotlights & Moments (`spotlights.js`, `Moments.jsx`):** Automated spotlight cards with one-click `"→ Cena"` prep integration and server snapshot history (`GET/POST /api/campaigns/:id/party-insights`, `views_insights.py`).

### Track 2.2: Frente B — The Unified Mesa, Multi-Character Holster & World Cartography
- [x] **Server-Driven Stage & ETag Pulse (`stage.py`, `views_pulse.py`, `TableBar.jsx`, `ScreenWindow.jsx`):** Unified stage state (`POST /api/campaigns/:id/stage`, `/stage/scene`), `GET /api/campaigns/:id/pulse` with `If-None-Match` / `304 Not Modified`, `MiniPlayer.jsx`, and `ShowSheet.jsx`.
- [x] **Combat Undo, `opId` Deduplication & URL Media Endpoints (`views_combat.py`):** Single-call encounter setup, 20-deep snapshot undo (`POST /api/combat/campaign/:id/undo`), `prev-turn`, `save-preview`, and binary endpoints (`/map-image`, `/token/:id`, `/portrait/:id`).
- [x] **Multi-Character Party Holster & NPC World Lore Sync (`ADR-0030`, `ADR-0031`):** Players and DMs can link $N$ characters to the same campaign (`Membership.char_type` = `player` | `npc`, plus `is_npc`); NPC seats auto-sync to `WorldEntry(category='npc')` (`_sync_char_to_world_npc`).
- [x] **World Lore URL Ingestion, Dynamic Image Proxy & Hierarchical Map Rects (`fe5695b`, `0e28b59`, `0215362`):** `POST /api/campaigns/:id/world/ingest`, `GET /api/proxy` (supporting Fandom/Wikia `/revision/latest`, Reddit `/media?url=`, Imgur), lossless `maxDim=0` map uploads, `containedEntryIds` ("Contains" grouping), and child region `rects[]` on `WorldMap.jsx` with `Auto-Fit Ratio` (`fitRectToAspect`).
- [ ] **Fog of War Brush Painting (`Task 7.1`):** DM canvas brush tool (`fog.ops[]`) to reveal/hide tactical map regions in `CombatGrid.jsx` and `TVScreen.jsx`.
- [ ] **Player Self-Token Dragging (`Task 7.2`):** Allow authenticated players to drag their own token on `CombatGrid.jsx` (`PATCH /api/combat/campaign/:id/token-move`).
- [ ] **Map Pings & Laser Indicators (`Task 7.3`):** `POST /api/campaigns/:id/ping` rendering a 4s radial pulse on all connected screens.
- [x] **Diegetic Soundscapes & Ambience (`Task 7.4`, `NANO-065`, `v1.0.143`):** Built WebAudio ambient mixer `frontend/src/stage/SoundscapeBar.jsx` + `frontend/src/stage/soundscape-engine.js` with 6 cross-faded synthesized presets (`tavern`, `dungeon`, `forest`, `storm`, `boss`, `crypt`) wired to `LiveScreenSheet.jsx` and synced to `TVScreen.jsx`.
- [x] **Resilient Polling Exponential Backoff (`Task 7.5`, `NANO-036`, `v1.0.143`):** Upgraded `frontend/src/api/polling.js` & `frontend/src/play/table-store.js` with `2.5s -> 30s` ($\pm 15\%$ jitter) `computeBackoffMs`, `online`/`visibilitychange` wake-up, and status propagation.

---

## 4. Wave 3: Scalability, Infrastructure & Ecosystem Expansion (Epic 8)

### Track 3.1: Database & Cloud Infrastructure
- [ ] **MySQL Production Migration (`Task 8.1`):** Transition PythonAnywhere deployment from single-file SQLite to pooled MySQL (`CONN_MAX_AGE = 60`, `STRICT_TRANS_TABLES`).
- [x] **Automated Pre-Migration Backup Snapshots:** já existe — `scripts/self_update.py::backup_database` copia o SQLite para `data/backups/pre-update-*.sqlite3` antes do `migrate`, guarda os últimos e `restore_database` volta o banco se a atualização falha.
- [ ] **Image Storage Offload — Cloudflare R2 / S3 (`Task 8.2`):** Presigned object storage for world maps, portraits, and combat tokens (`backend/api/storage_r2.py`). *(a criar)*

### Track 3.2: Community & Offline Resilience
- [ ] **Homebrew Bestiary Exporter/Importer:** Shareable JSON bundle format for custom monster statblocks, spells, and magic items.
- [x] **Progressive Web App (PWA) Service Worker & IndexedDB (`Task 8.3`, `NANO-033`/`NANO-035`, `v1.0.143`):** Configured `vite-plugin-pwa` (`generateSW`, `145` precache entries, `CacheFirst` SRD JSONs/media, `NetworkFirst` `/api/`) plus `frontend/src/api/idb-store.js` (`idb`) with one-time `localStorage` migration (`outbox-sync.js` *(a criar)* completes offline writes).

---

## 5. Backend Sync & Character Version Architecture (Wave 0 Immediate Priority)

> **Fichas em várias mesas / versões / one-shot**: cobertura e plano dividido (F1–F19 no frontend — todos entregues até a v1.0.61, menos F7/F8/F15 que esperam o deploy do backend, B1–B8 no backend) em [`docs/character-versions.md`](docs/character-versions.md) §7. O caminho "versão = ficha própria" entrega o objetivo no backend de produção atual.

Full specifications: [`docs/sync-spec.md`](docs/sync-spec.md), [`docs/character-versions.md`](docs/character-versions.md), and [`docs/backlog-grooming-and-cascade-map.md`](docs/backlog-grooming-and-cascade-map.md) (Epics 1–4).

- [x] **Epic 1 (`sync-spec` Block C — Shipped in `v1.0.57` & `v1.0.136`):** Migration `0015` (`C1`), N:N many-campaigns-per-sheet seat rules & tests reconciled (`C2`–`C5`, `5de5cf5`), Pulse `rev` wired for NPC/seat changes (`C6`, `606f4df`), DM-only `inviteCode` redaction (`C8`, `bc98391`), 6 MB World image upload limit (`29f6b3a`), isolated `self_update.py` tests (`f22ac4c`), and full `manage.py test` + `makemigrations --check` + `check_doc_refs.py` + `check:rules` gates active in `.github/workflows/backend-release.yml` (`C9`, `d824fa2`). Remaining minor ops item `A4` (`VERSION.json` on codeload fallback) tracks with Epic 4.
- [ ] **Epic 2 (`sync-spec` Block D1 & D3, `ADR-0034`):** Implement `CharacterVersion` model (`D1.1`), `Membership.version` FK (`D1.2`), `views_versions.py` routes (`D1.3`–`D1.8`), `423 Locked` server guard on `left`/`archived` (`D1.9`), campaign archival hook (`D1.10`), re-route all 10 gameplay consumers (`D1.11`), two-phase data migration unpacking `Character.data.versions` (`D1.12`), and avatar ETag deduplication (`D3.1`–`D3.2`).
- [ ] **Epic 3 (`sync-spec` Block D2, `ADR-0032`, `ADR-0033`):** Extend `POST /api/characters/:pk/table-roll` for multi-group & crit extra rolls (`D2.1`), `DiceLog`/`DiaryEntry` audit (`D2.2`), server `DiceRig` consumption (`D2.3`), and server persistence for `beltConfig` & `multiRollConfig` (`D2.4`–`D2.5`).
- [ ] **Epic 4 (`sync-spec` Block A & B):** Configure `FORJA_UPDATE_KEY_SHA256`, deploy `main` to PythonAnywhere (`A1`–`A6`), verify all 26 new routes, and delete the `"servidor antigo"` fallbacks (47 mentions in 30 files) across 22 frontend files (`B1`–`B5`).

---

## 6. Monolith Decomposition & High-Level Component/Service Abstractions (Epic 5)

Full blueprint and file-size budgets: [`docs/backlog-grooming-and-cascade-map.md`](docs/backlog-grooming-and-cascade-map.md) (Epic 5) and [`TECH_DEBT.md`](TECH_DEBT.md) §8.

- [x] **Task 5.1 — Decompose `frontend/components/Sheet.jsx` (`5,469` $\to$ `474` lines, `v1.0.143`–`v1.0.145`):** Deleted dead `BeltPbSlot`; extracted `frontend/src/sheet/hero/SheetHero.jsx`, `frontend/src/sheet/belt/` (`BeltHive.jsx`, `BeltHex.jsx`, `BeltQuickSlot.jsx`), `frontend/src/sheet/tabs/` (`SheetSkillsSection.jsx`, `SheetFeaturesSection.jsx`, `SheetCompanionsAndNotes.jsx`, `SheetPlay.jsx`, `TimelineModals.jsx`), and `frontend/src/sheet/use-sheet-hooks.js`.
- [x] **Task 5.2 — Decompose `frontend/components/SheetTabs.jsx` (`2,647` $\to$ `8` lines barrel, `v1.0.143`):** Extracted `frontend/src/sheet/spells/` (`UnifiedSpellsHUD.jsx`, `SlotMatrix.jsx`, `SpellRow.jsx`, `RestButtons.jsx`, `SpellViews.jsx`), `frontend/src/sheet/inventory/SheetInventoryTab.jsx`, and `frontend/src/sheet/story/SheetStoryTab.jsx`.
- [x] **Task 5.3 — Split `frontend/src/sheet/ficha.css` (`7,381` $\to$ `15` lines), `frontend/styles.css` (`2,768` $\to$ `6` lines) & `frontend/src/prep/NextSession.jsx` (`1,441` $\to$ `369` lines, `v1.0.143`–`v1.0.145`):** Modularized into `frontend/src/sheet/css/` (14 ordered CSS files), `frontend/src/styles/` (5 ordered CSS files), and `frontend/src/prep/` (`SessionSummaryHeader.jsx`, `SceneChecklistDrawer.jsx`, `EncounterLauncher.jsx`, `NextSessionSteps.jsx`, `NextSessionOverlays.jsx`, `use-next-session-sync.js`).
- [ ] **Task 5.4 — Decompose `backend/api/views_combat.py` (`2,714` lines) & `world_rules.py` (`1,518` lines):** Extract `combat_setup.py`, `combat_undo.py`, `combat_actions.py`, and `combat_media.py` under `backend/api/services/`. *(a criar)*
