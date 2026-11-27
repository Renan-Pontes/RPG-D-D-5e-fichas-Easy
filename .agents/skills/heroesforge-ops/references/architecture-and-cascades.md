# HeroesForge Architecture, Contracts & Cascade Reference

## Table of Contents
1. [Dual-Stack Runtime & Entry Points](#1-dual-stack-runtime--entry-points)
2. [Rules & Generated Artifact Sync Chains](#2-rules--generated-artifact-sync-chains)
3. [Backend Domain Views & Security Invariants](#3-backend-domain-views--security-invariants)
4. [High-Risk Cascade Paths](#4-high-risk-cascade-paths)

---

## 1. Dual-Stack Runtime & Entry Points

- **Frontend (`frontend/`)**: Vite 6 + React 18 SPA, bilingual (`lang: 'pt' | 'en'`), dual D&D 5e rules (`rulesVersion: '2024' | '2014'`).
  - Root router & state shell: `frontend/app.jsx` (with `React.lazy` routes, `VitePWA` SW, and `pickChunk` splitting checked by `scripts/check_bundle_budget.mjs`).
  - Character Sheet (`frontend/components/Sheet.jsx`, `frontend/components/SheetTabs.jsx` barrel): modularized under `frontend/src/sheet/{hero,belt,tabs,spells,inventory,story}/` (`SheetHero.jsx`, `BeltHive.jsx`, `SheetPlay.jsx`, `SheetSkillsSection.jsx`, `SheetFeaturesSection.jsx`, `SheetCompanionsAndNotes.jsx`, `UnifiedSpellsHUD.jsx`, `SlotMatrix.jsx`, `SpellRow.jsx`, `SheetInventoryTab.jsx`, `SheetStoryTab.jsx`).
  - Sheet domain & infra modules: `frontend/src/sheet/` (`undo-history.js`, `MobileSheetNav.jsx`, `MyTurnView.jsx`, `HpDeltaPopover.jsx`, `feature-timeline.js`, `feature-placement.js`, `species-trait-choices.js`, `rich-text.{js,jsx}`, `condition-rules.js`, `FhStatus.jsx`, `versions.js`, `VersionsModal.jsx`, `css/*.css` imported by `ficha.css`).
  - Progression engine: `frontend/src/progression/` (`engine.js`, `rules.js`, `options.js`, `species.js`, `feat-rules.js`, `respec.js`, `LevelUpModal.jsx`, `ProgressionPanel.jsx`).
  - Campaign & DM Mesa 4-area shell: `frontend/src/shell/` (`world`, `prepare`, `play`, `group`), `frontend/src/campaigns/`, `frontend/src/play/`, `frontend/src/prep/`, `frontend/src/world/`, `frontend/src/group/`, `frontend/src/stage/`, `frontend/src/screen/`, `frontend/src/player/`.
- **Backend (`backend/`)**: Python 3.11/3.12 + Django 5.2 + DRF (`backend/forja/settings.py`, `backend/api/urls.py`).
  - Models: `backend/api/models.py` (`Character`, `Campaign`, `Membership`, `Approval`, `CombatInstance`, `DiceRig`, `DiceLog`, `RollRequest`, `WorldEntry`, `Adventure`, `DiaryEntry`, `Plan`, `UserPlan`).
  - Progression validator mirror: `backend/api/progression/` reading generated `backend/api/progression/catalog.json`.

---

## 2. Rules & Generated Artifact Sync Chains

Whenever you edit an upstream rule source, run the corresponding generator BEFORE running tests or committing (CI rejects stale snapshots in `.github/workflows/backend-release.yml`):

| Upstream Editable Source | Generator Command | Generated Artifact |
|---|---|---|
| `frontend/src/progression/rules.js`, `resources.js`, `species.js`, `frontend/data/class-options/**`, `frontend/data/feats.js`, `frontend/src/items/packs.js` | `node scripts/sync-rules.mjs` (check: `npm --prefix frontend run check:rules`) | `backend/api/progression/catalog.json` |
| `frontend/data/srd2024-spells.json`, `srd2024-spells-pt.json` | `node frontend/scripts/slim-spells.mjs` | `frontend/data/srd2024-spells-core.json`, `srd2024-spells-pt-core.json` |
| `frontend/data/srd2024-spells*.json`, `spells-2014-text.json` | `node scripts/build-spell-tags.mjs` | `frontend/data/spell-tags.json`, `frontend/data/spell-mechanics.json` |
| Root `*.md` & `docs/*.md` file/symbol citations | `python scripts/check_doc_refs.py` | Exit 0 (mark unbuilt planned paths with `*(a criar)*` on the same line) |

Shortcut: `python .agents/skills/heroesforge-ops/scripts/hf_ops.py verify --sync` runs the generators and verifies parity in one call.

---

## 3. Backend Domain Views & Security Invariants

- **Campaign Membership (`views_campaigns.py`, `serializers.py`)**:
  - N:N seat rule (`v1.0.136+`): A character can sit in $N$ campaigns concurrently, never twice in the *same* campaign (`409 character_already_in_campaign`). Both players and the DM can link multiple characters/NPCs (`isNpc` / `charType: 'npc'`).
  - `inviteCode` and `screenToken` are strictly DM-only in `CampaignSerializer`; existing members join additional sheets by `campaignId`.
  - Closed campaigns (`status == 'closed'`) enforce HTTP `423 Locked` (`campaign_closed`) via `plans.py::require_open` / `closed_guard`, while still allowing players to detach their own character.
- **Pulse ETag (`views_pulse.py`)**:
  - Any new mutation affecting what players or the DM see in live play MUST bump or feed into the `pulse` revision so `GET /api/campaigns/:id/pulse` invalidates `304 Not Modified`.
- **Dice Rigging (`views_dice.py`, `table_rolls.py`)**:
  - `DiceRig` queues are consumed FIFO server-side; `rigged: true` is recorded in `DiceLog` for the DM and NEVER leaked in player payloads.
- **World SSRF & Visibility (`views_world.py`, `world_rules.py`, `world_ingest.py`, `views_proxy.py`)**:
  - Outbound URL fetches must pass `check_url` (blocks private/loopback/link-local IPs on every redirect hop).
  - Non-DM world reads strip `dm_notes`, `secrets`, and hidden entries via `toLight` / `world_rules`.

---

## 4. High-Risk Cascade Paths

1. **Character JSON Schema (`Character.data`)**:
   - Touches: `CreatorWizard.jsx` -> `progression/engine.js` (`applyAutosToCharacter`) -> `Sheet.jsx` / `SheetTabs.jsx` -> `pdf/export-pdf.js` & `import-pdf.js` -> `sheet/versions.js` -> `backend/api/views_characters.py` & `backend/api/progression/`.
   - Always preserve backward compatibility for existing saved sheets and `rulesVersion: '2014'` characters.
2. **Regex-Asserted Frontend Source Tests**:
   - Several tests in `frontend/tests/` (e.g., `sheet-skills-vignette-enhancements.test.js`, `multi-char-inspiration-skills.test.js`, `top-hud-campaigns-tools.test.js`, `sheet-export.test.js`) read unified sheet/CSS sources via `frontend/tests/_sheet-source.js` across `Sheet.jsx`, `SheetTabs.jsx`, and the `src/sheet/` + `src/sheet/css/` modules.
   - Always run `hf_ops.py impact` and `hf_ops.py verify` after editing `Sheet.jsx`, `SheetTabs.jsx`, or `src/sheet/` modules.
