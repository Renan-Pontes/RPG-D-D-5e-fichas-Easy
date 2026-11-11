# Forja de Heróis — Master Engineering & Product Roadmap

> **Current Engine State:** `v1.0.56` (`507d8b3` on `main`, 2026-11-11)  
> **Frontend Test Baseline:** 1,627+ Unit Tests Passing (100% Green across 59 test suites)  
> **Backend Test Baseline:** 990 / 1,005 Passing on `main` (15 items queued in Epic 1 / `sync-spec` Block C)  
> **Build Status:** Vite v6.4.3 Production Build Clean (0 errors)  
> **Master Specifications:** [`docs/backlog-grooming-and-cascade-map.md`](docs/backlog-grooming-and-cascade-map.md) · [`docs/sync-spec.md`](docs/sync-spec.md) · [`docs/sync-contracts.md`](docs/sync-contracts.md) · [`docs/character-versions.md`](docs/character-versions.md) · [`PLANO-MESA-E-METRICAS.md`](PLANO-MESA-E-METRICAS.md) · [`SPEC_BELT_HIVE_STATS_HANDOFF.md`](SPEC_BELT_HIVE_STATS_HANDOFF.md) · [`TECH_DEBT.md`](TECH_DEBT.md) · [`ADR.md`](ADR.md)

---

## 1. Roadmap Horizon Overview

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

### Track 1.2: Bundle Chunking & Performance Optimization (`AUDIT.md` P1, Epic 6)
- [ ] **Dynamic SRD & Vendor Splitting (`Task 6.1`):** Configure `manualChunks` in `frontend/vite.config.js` (`srd-core`, `srd-spells`, `srd-bestiary`, `vendor-three`, `vendor-pdf`) to reduce initial entry chunk from `1,843 kB` (`528 kB` gzip) to `< 300 kB` gzip.
- [ ] **Species & Stage Import Unification (`Task 6.1`):** Resolve static/dynamic import collisions in `frontend/src/progression/SpeciesChoices.jsx` and `frontend/src/stage/LiveScreenSheet.jsx`.
- [ ] **Layout Transition Jank Remediation (`Task 6.2`):** Replace CSS `transition: width/height/margin/all` with GPU-composited `transform` and `opacity` in `styles.css`, `creator.css`, `tv-styles.css`, `shell.css`, and `mesa.css`.
- [ ] **Dependency SCA Hardening:** Resolve `source-map-js` / toolchain advisories via `npm audit`.

### Track 1.3: User Experience, Sheet Consolidation & Design Polish (`CRITIQUE.md` P1)
- [x] **DM Fast-Track Onboarding (`GmGuide.jsx`, `NextStepCard.jsx`):** Actionable setup guide (`guide-model.js`, `next-step.js`) and `WhatsNew.jsx` release walkthrough.
- [x] **Universal Confirmation Dialogs (`ConfirmDialog.jsx`):** Standardized `confirmDialog` across Prepare, Items, and Group tabs.
- [x] **Prepared Dice Per-Player Cards & Jump-Queue (`AdvancedDice.jsx`):** Promoted Prepared Dice to per-player cards with 1 queue per die size (`d4`–`d100`), `before` insertion, and `⚡` jump-queue (`prepared-dice.js`, `views_dice.py`).
- [x] **Character Sheet Hero, Skills & Spells Consolidation (`2f22e00`):** Removed intrusive alignment/player/milestone tags from hero banner; discrete top-right `Cheat -> Edit -> Export` toolbar; universal `RestButtons` beneath spoken languages; consolidated `(Abil) Spell Save DC` & `(Abil) Spell Attack Bonus`; restored `SlotMatrix` (Long Rest vs Short Rest Pact Magic); casting time on folded spell rows; SRD 5.2.1 spell descriptions (`spell-text.js`, `spell-mechanics.json`); collapsible Skills action groups (`Search`, `Study`, `Influence`, `Hide`, `Use Tool`).
- [ ] **Touch Target Sizing (`Task 6.2`):** Expand undersized interactive targets ($< 44\times 44\text{px}$) in `frontend/src/creator/join-table.css` (`.fh-join-code-actions .btn`) and `frontend/src/app-extra-styles.css` (`.camp-char-Inspect`).

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
- [ ] **Diegetic Soundscapes & Ambience (`Task 7.4`):** Integrated WebAudio ambient loop controller (`stage.audio` + CC0 loops).
- [ ] **Resilient Polling Exponential Backoff (`Task 7.5`):** Upgrade `frontend/src/api/polling.js` with `2.5s → 5s → 10s → 30s` backoff, `visibilitychange` wake-up, and offline status indicator.

---

## 4. Wave 3: Scalability, Infrastructure & Ecosystem Expansion (Epic 8)

### Track 3.1: Database & Cloud Infrastructure
- [ ] **MySQL Production Migration (`Task 8.1`):** Transition PythonAnywhere deployment from single-file SQLite to pooled MySQL (`CONN_MAX_AGE = 60`, `STRICT_TRANS_TABLES`).
- [x] **Automated Pre-Migration Backup Snapshots:** já existe — `scripts/self_update.py::backup_database` copia o SQLite para `data/backups/pre-update-*.sqlite3` antes do `migrate`, guarda os últimos e `restore_database` volta o banco se a atualização falha.
- [ ] **Image Storage Offload — Cloudflare R2 / S3 (`Task 8.2`):** Presigned object storage for world maps, portraits, and combat tokens (`backend/api/storage_r2.py`). *(a criar)*

### Track 3.2: Community & Offline Resilience
- [ ] **Homebrew Bestiary Exporter/Importer:** Shareable JSON bundle format for custom monster statblocks, spells, and magic items.
- [ ] **Progressive Web App (PWA) Service Worker (`Task 8.3`):** Offline-capable service worker (`CacheFirst` for SRD catalogs/assets, `NetworkFirst` for character sheets).

---

## 5. Backend Sync & Character Version Architecture (Wave 0 Immediate Priority)

> **Fichas em várias mesas / versões / one-shot**: cobertura e plano dividido (F1–F19 no frontend — todos entregues até a v1.0.61, menos F7/F8/F15 que esperam o deploy do backend, B1–B8 no backend) em [`docs/character-versions.md`](docs/character-versions.md) §7. O caminho "versão = ficha própria" entrega o objetivo no backend de produção atual.

Full specifications: [`docs/sync-spec.md`](docs/sync-spec.md), [`docs/character-versions.md`](docs/character-versions.md), and [`docs/backlog-grooming-and-cascade-map.md`](docs/backlog-grooming-and-cascade-map.md) (Epics 1–4).

- [ ] **Epic 1 (`sync-spec` Block C + A4):** ~~migration `0015` (`C1`)~~ done in v1.0.57; decide the one-sheet-many-tables rule (`C2`–`C5`, Task 1.2) and, reconcile multi-campaign/multi-character membership tests (`C2`–`C5`), wire missing Pulse `rev` sources (`C6`), enforce `dm_settings` write guard (`C7`) & secret redaction (`C8`), add `manage.py test` gate to `.github/workflows/backend-release.yml` (`C9`), and fix `scripts/self_update.py` `VERSION.json` write (`A4`).
- [ ] **Epic 2 (`sync-spec` Block D1 & D3, `ADR-0034`):** Implement `CharacterVersion` model (`D1.1`), `Membership.version` FK (`D1.2`), `views_versions.py` routes (`D1.3`–`D1.8`), `423 Locked` server guard on `left`/`archived` (`D1.9`), campaign archival hook (`D1.10`), re-route all 10 gameplay consumers (`D1.11`), two-phase data migration unpacking `Character.data.versions` (`D1.12`), and avatar ETag deduplication (`D3.1`–`D3.2`).
- [ ] **Epic 3 (`sync-spec` Block D2, `ADR-0032`, `ADR-0033`):** Extend `POST /api/characters/:pk/table-roll` for multi-group & crit extra rolls (`D2.1`), `DiceLog`/`DiaryEntry` audit (`D2.2`), server `DiceRig` consumption (`D2.3`), and server persistence for `beltConfig` & `multiRollConfig` (`D2.4`–`D2.5`).
- [ ] **Epic 4 (`sync-spec` Block A & B):** Configure `FORJA_UPDATE_KEY_SHA256`, deploy `main` to PythonAnywhere (`A1`–`A6`), verify all 26 new routes, and delete the `"servidor antigo"` fallbacks (47 mentions in 30 files) across 22 frontend files (`B1`–`B5`).

---

## 6. Monolith Decomposition & High-Level Component/Service Abstractions (Epic 5)

Full blueprint and file-size budgets: [`docs/backlog-grooming-and-cascade-map.md`](docs/backlog-grooming-and-cascade-map.md) (Epic 5) and [`TECH_DEBT.md`](TECH_DEBT.md) §8.

- [ ] **Task 5.1 — Decompose `frontend/components/Sheet.jsx` (`4,093` lines $\to$ `< 500` lines):** Delete dead `BeltPbSlot`; extract `SheetHero.jsx`, `BeltHive.jsx`, `SheetSkillsSection.jsx`, `SheetFeaturesSection.jsx`, and `SheetCompanionsAndNotes.jsx`.
- [ ] **Task 5.2 — Decompose `frontend/components/SheetTabs.jsx` (`1,785` lines $\to$ `< 400` lines):** Extract `UnifiedSpellsHUD.jsx`, `SlotMatrix.jsx`, `SpellRow.jsx`, `SheetInventoryTab.jsx`, and `SheetStoryTab.jsx`.
- [ ] **Task 5.3 — Split `frontend/src/sheet/ficha.css` (`6,549` lines) & Tokenize Colors:** Modularize into `sheet-tokens.css`, `sheet-hero.css`, `sheet-belt.css`, `sheet-skills-features.css`, `sheet-spells.css`, and `sheet-inventory-modals.css`.
- [ ] **Task 5.4 — Decompose `backend/api/views_combat.py` (`2,714` lines) & `world_rules.py` (`1,518` lines):** Extract `combat_setup.py`, `combat_undo.py`, `combat_actions.py`, and `combat_media.py` under `backend/api/services/`. *(a criar)*
