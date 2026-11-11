# System Map & Component Directory — Forja de Heróis

> **Repository Structure:** Monorepo with Vite/React Frontend (`frontend/`) and Django Backend (`backend/`)  
> **Total Files:** 350+ source files across 30+ domain modules

---

## 1. Root Directory

| File / Folder | Role & Purpose |
|---|---|
| `README.md` | Quick start guide (30s setup), feature overview, stack summary, test execution commands. |
| `PRODUCT.md` | Product strategy, user personas, value proposition, core principles, brand commitments. |
| `ARCHITECTURE.md` | Master architectural blueprint, C4 context/container diagrams, domain engine specifications. |
| `DESIGN.md` | Design system, visual world ("Dark Fantasy Forged Parchment"), color tokens, typography scales. |
| `ADR.md` | Architectural Decision Records (ADR-0001 through ADR-0036) in MADR format. |
| `ROADMAP.md` | Forward technical and design roadmap across Waves 1, 2, and 3. |
| `TECH_DEBT.md` | Technical debt audit, 92 legacy references analysis, bundle chunking roadmap. |
| `DATA_ENGINEERING.md` | Data pipelines, SRD 5.2.1 monster ingestion, Portuguese translations, rule synchronization. |
| `AUDIT.md` | Technical and UX audit (health score 11/20, P1/P2/P3 findings). |
| `CRITIQUE.md` | Strategic design critique (health score 29/40, heuristic evaluations). |
| `DECISIONS.md` | Historical architecture decisions from v2 initial pivot (Node $\rightarrow$ Django). |
| `DEPLOY.md` | Step-by-step production deployment manual for PythonAnywhere and Vercel. |
| `HANDOFF.md` | Engineering handoff documentation covering combat, VTT grid, and progression engine. |
| `PLANO-MESA-E-METRICAS.md` | Specification for Frente A (Party Metrics & Radar) and Frente B (Mesa Table Rework). |
| `RULES.md` | D&D 5e 2024 / SRD 5.2.1 vs 2014 rules coverage, sources, and open-game licenses. |
| `SPEC_BELT_HIVE_STATS_HANDOFF.md` | Continuation specification for the 3-4-3 Honeycomb Belt Hive stat grid. |
| `API.md` | Comprehensive HTTP REST endpoint contract reference. |
| `vercel.json` | Vercel deployment configuration routing build outputs to `frontend/dist`. |

---

## 2. Frontend Subsystems (`frontend/src/`)

### 2.1 Core Shell & Navigation (`frontend/src/shell/`)
- `shell-logic.js`: Pure navigational engine; defines `DM_AREAS` (World, Prepare, Play, Party) and `PLAYER_AREAS` (Table, World, Chronicle, Party). Contains `LEGACY_TAB_TO_AREA` mapping.
- `CampaignHeader.jsx`: Top persistent navigation bar with area chips, table mode indicators, and fast actions.
- `SettingsMenu.jsx`: DM campaign settings drawer (cover image, invite codes, screen token rotation, sound, closed table management).
- `NextStepCard.jsx`: Adaptive suggestion cards guiding the DM on what to prepare next.
- `QuickSearch.jsx`: Modal spotlight search across monsters, spells, items, and world entries.
- `AdvancedDice.jsx`: DM Prepared Dice manager for inspecting and reordering the dice rig queue.
- `CoverPicker.jsx`: Campaign cover image upload and presets.
- `ToneAccentFields.jsx`: Visual theme tone and accent color picker for the campaign header.

### 2.2 Character Sheet Subsystem (`frontend/src/sheet/` & `frontend/components/Sheet.jsx`)
- `components/Sheet.jsx`: Master character sheet orchestrator (4,093 lines; queued for decomposition in Epic 5); handles ability scores, vitals, Belt v2 Hive Stats, skills groups, features, death saves, rest dialogs, and actions.
- `components/SheetTabs.jsx`: Character sheet secondary tabs (1,785 lines; queued for decomposition in Epic 5); handles `UnifiedSpellsHUD`, `SlotMatrix`, `SpellRow`, inventory, story, and species traits.
- `ficha.css`: Complete styling specification for the "Ficha Forjada" (6,549 lines of custom CSS; queued for domain modularization in Epic 5).
- `FhChecks.jsx`: Ability checks and saving throw rows with proficiency diamonds and advantage toggles.
- `FhAttack.jsx`: Action cards for weapon attacks, cantrip attacks, and spell DC abilities.
- `FhFeatures.jsx`: Class and species trait accordions with level tags.
- `FhConditions.jsx`: Active condition pills (Blinded, Charmed, Poisoned, Exhaustion, etc.).
- `FhMedal.jsx`: Character header badge displaying class, level, species, background, and alignment.
- `FhTitle.jsx`: Forged title bar with gold leaf rule and contextual action buttons.
- `FhExport.jsx`: Print, share, and PDF export dialogs.
- `campaign-link.js` & `CampaignLinkModal.jsx`: Modal assigning a character to an active campaign.

### 2.3 Character Creator Wizard (`frontend/src/creator/`)
- `CreatorWizard.jsx`: 17-step guided journey wizard for first-time players.
- `steps.js`: Step registry importing each step from `steps/*.jsx`.
- `steps/welcome.jsx`: Rules edition selection (2024 vs 2014) and progression overview.
- `steps/class.jsx`: Class selection with role tags and feature previews.
- `steps/background.jsx`: Background selection with +2/+1 attribute modifiers and Origin Feats.
- `steps/species.jsx`: Species selection with traits and line options.
- `steps/abilities.jsx`: Ability score generation (Standard Array, Point Buy, 4d6 Roll).
- `steps/equipment.jsx`: Class and background starting equipment bundles.
- `steps/spells.jsx` & `cantrips.jsx`: Spell selection filtered by class and level.
- `steps/details.jsx`: Name, portrait avatar, physical appearance, and backstory notes.
- `steps/review.jsx`: Final validation pass listing all pending issues before character forge.
- `decision.js` & `journey-ui.jsx`: "Hold to Seal" button interaction and decision preview panel.
- `chronicle.js`: Narrative backstory synthesizer generated from wizard choices.

### 2.4 Tactical VTT Combat Engine (`frontend/src/combat/` & `frontend/src/campaigns/CombatTab.jsx`)
- `CombatTab.jsx`: Master DM combat management view; tracks initiative order, turns, and rounds.
- `CombatGrid.jsx`: 2D Canvas tactical battlemap; handles background images, grid lines, token rendering, zoom/pan.
- `MonsterPicker.jsx`: Tactical monster drawer searching 331 SRD 5.2.1 creatures by CR, type, and name.
- `EndOfEncounterPanel.jsx`: Victory and defeat summary; awards XP and distributes loot to players.
- `combat-sets.js` & `combat-placement.js`: Monster token placement math and statblock normalization.

### 2.5 DM Preparation & Adventure Graph (`frontend/src/prep/`)
- `PrepTab.jsx`: DM preparation cockpit; switches between Session Plan, Adventure Graph, and Items.
- `AdventureNow.jsx`: Interactive directed graph editor for dungeon rooms and encounter scenes.
- `prep-graph.js`: Graph layout algorithms converting node/edge structures into interactive canvases.
- `next-session.js`: Session notes, recap editor, and scene progression checklist.
- `StartSessionSheet.jsx` & `EndSessionSheet.jsx`: Session start/end modals recording diary history.

### 2.6 Living World & Atlas (`frontend/src/world/`)
- `WorldArea.jsx`: Master world overview; renders cards by category (Places, NPCs, Factions, Lore, Handouts).
- `EntryEditor.jsx`: Rich card editor with secrets list, DM private notes, and visibility toggles.
- `LivingWorld.jsx` & `PlayerWorld.jsx`: Filtered player-facing view showing only discovered lore.
- `living-logic.js`: Visibility state machine (Hidden $\rightarrow$ Partial $\rightarrow$ Revealed).

### 2.7 Party Insights & Radar Intelligence (`frontend/src/metrics/` & `frontend/src/group/`)
- `party-metrics.js`: 11-role tactical scoring engine, SWOT generator, and spotlight prompts.
- `PartyInsights.jsx`: Visual dashboard displaying tactical radar charts and party composition tables.
- `GroupArea.jsx`: Member list, character sheet assignment, and approvals manager.

### 2.8 The Living Stage & Public TV Screen (`frontend/src/screen/` & `frontend/src/stage/`)
- `TVScreen.jsx`: Fullscreen 1080p+ public display accessible without authentication via `/tv/<token>`.
- `StagePanel.jsx`: DM control deck for pushing scenes, cards, and maps to the live screen.
- `ScreenWindow.jsx`: Floating preview window of the public TV screen inside the DM interface.
- `tv-logic.js`: Screen state machine handling battlemap transitions and turn announcements.

### 2.9 Grimoire & Rules Encyclopedia (`frontend/src/grimoire/`)
- `GrimoireScreen.jsx`: Searchable player-facing rules manual.
- `actions.js`, `combat.js`, `conditions.js`, `magic.js`, `health.js`: Standardized rules blocks from SRD 5.2.1.

### 2.10 PDF Generation & Parsing (`frontend/src/pdf/`)
- `export-pdf.js`: Generates 3-page fillable official D&D 5e character sheets with dynamic continuation sheets.
- `import-pdf.js`: Ingests filled PDF forms, extracting character stats back into application JSON.

---

## 3. Backend Subsystems (`backend/api/`)

| Module | Core Responsibility |
|---|---|
| `models.py` | 18 relational models: `Character`, `Campaign`, `Membership`, `Approval`, `CombatInstance`, `DiceRig`, `DiceLog`, `RollRequest`, `WorldEntry`, `Adventure`, `DiaryEntry`, `Plan`, `UserPlan`. |
| `views_auth.py` | Cookie-based session authentication, signup, login, logout, password changes. |
| `views_characters.py`| Character CRUD, spell casting, resting, wild shape transformations. |
| `views_campaigns.py` | Campaign lifecycle, invite codes, screen token rotation, stage state. |
| `views_combat.py` | Tactical combat initialization, turn advancement, attacks, saving throw previews. |
| `views_world.py` | World cards, secrets, visibility filtering, player echoes. |
| `views_adventures.py`| Dungeon room node graphs, room discovery, DM play state. |
| `views_checks.py` | Table check requests and player response aggregation. |
| `views_dice.py` | Dice rolling engine with FIFO `DiceRig` consumption and audit logging. |
| `views_screen.py` | Public `/api/screen/:token` endpoint with fast, unauthenticated projection. |
| `views_pulse.py` | Lightweight ETag / 304 polling endpoint preventing server exhaustion. |
| `views_diary.py` | Campaign timeline, automated session chronicles, loot and level events. |
| `views_plans.py` | Subscription tier limits (characters, campaigns, table slots, storage). |
| `plans.py` | `closed_guard` decorator enforcing read-only state on closed campaigns. |
| `progression/` | Python port of the progression engine verifying level-up math server-side. |

---

## 4. Additions since 2026-11-07

| Path | Responsibility |
|---|---|
| `frontend/src/dice/multi-roll.js`, `MultiRoll.jsx` | Badge-array multi-roll: rows, coupling, locks, focus-mode roll-up (ADR-0032). |
| `frontend/src/dice/BeltMultiRoll.jsx` | Belt paired rolls: d20 + damage per column, crit re-roll (ADR-0033). |
| `frontend/src/dice/active-char.js` | Store the open sheet publishes itself to, for the dice panel. |
| `frontend/src/sheet/versions.js`, `VersionsModal.jsx`, `versions.css` | Campaign versions of a character: rules, switcher, read-only preview (ADR-0034). |
| `frontend/src/sheet/npc-link.js` | DM sheet ↔ World NPC card link. |
| `frontend/src/sheet/spell-text.js`, `frontend/data/spell-mechanics.json` | SRD spell text and save/attack badges. |
| `frontend/data/species-2024.js` (`SPECIES_SUPPLEMENTS`) | Species grants for 40+ species. |
| `frontend/src/world/image.js`, `WorldMap.jsx` | Full-resolution and linked images; map zones with auto-fit. |
| `backend/api/world_ingest.py` | Link → draft card, with the outbound-request guard (ADR-0035). |
| `backend/api/views_proxy.py` | First-party fetch proxy for monster and image imports. |
| `backend/api/stage.py`, `table_rolls.py`, `views_insights.py` | Server-run TV stage, sheet rolls on the TV queue, party insights. |
| `docs/sync-spec.md`, `docs/sync-ledger.md`, `docs/sync-contracts.md`, `docs/character-versions.md` | Frontend × backend × production sync plan, route/commit ledger, per-function contract ledger, and versions spec. |
| `docs/backlog-grooming-and-cascade-map.md` | Master groomed backlog (Epics 1–8), caveat/gap analysis, deterministic cascade map, and monolith decomposition blueprint. |

