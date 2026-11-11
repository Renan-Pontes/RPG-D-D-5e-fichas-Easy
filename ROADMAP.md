# Forja de Heróis — Master Engineering & Product Roadmap

> **Current Engine State:** v2.8+ Release Candidate  
> **Test Baseline:** 1,515 / 1,515 Unit Tests Passing (100% Green across 20 suites)  
> **Build Status:** Vite v6.4.3 Production Build Clean (19.97s, 0 errors)  
> **Source Documents:** `PLANO-MESA-E-METRICAS.md`, `SPEC_BELT_HIVE_STATS_HANDOFF.md`, `AUDIT.md`, `CRITIQUE.md`, `PRODUCT.md`

---

## 1. Roadmap Horizon Overview

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │ WAVE 1: Ergonomics, Performance & Integrity (Immediate Sprint)         │
   │ • 3-4-3 Honeycomb Belt Hive Stats Parity (SPEC_BELT_HIVE_STATS_HANDOFF)│
   │ • Bundle Chunking & Lazy Split for SRD & Progression Data (AUDIT.md P1)│
   │ • Layout Transition Jank Removal & Mobile Touch Targets (AUDIT.md P1)  │
   │ • First-Time DM 5-Minute Onboarding Flow (CRITIQUE.md P1)              │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ WAVE 2: The Unified Mesa & Tactical Intelligence (Frente A & B)        │
   │ • Frente A: Party Insights Radar & Automated Spell Effect Taggers      │
   │ • Frente B: Interactive Fog of War, Player Token Drag, Map Pings       │
   │ • Ambient Audio & Diegetic Soundscapes on TV Screen                     │
   │ • Resilient Polling with Exponential Backoff & UI Offline Alerts       │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ WAVE 3: Scalability, Infrastructure & Ecosystem Expansion              │
   │ • Database Evolution: SQLite to MySQL on PythonAnywhere Production     │
   │ • Homebrew Bestiary & Magic Item Community Sharing                      │
   │ • Multi-Campaign Table Switcher & Shared Universe Lore Links           │
   │ • Progressive Web App (PWA) Offline Service Worker Pack                │
   └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Wave 1: Ergonomics, Performance & Integrity (Immediate Sprint)

### Track 1.1: Honeycomb Belt Hive Stats Refinement (`SPEC_BELT_HIVE_STATS_HANDOFF.md`)
- [ ] **Geometry Alignment:** Lock regular hex ratio ($H = W \times 1.1547$) in `frontend/src/sheet/ficha.css` with deterministic 3–4–3 staggered rows (`is-top`, `is-mid`, `is-bottom`).
- [ ] **Clear-Zone Guaranteed Center Belt:** Ensure the Quick Dice Belt in the middle lane occupies a reserved vertical footprint with zero overlap over stat values or modifiers.
- [ ] **Gesture Reliability:** Calibrate swipe thresholds ($\Delta y \le -18\text{px}$ for advantage, $\Delta y \ge +18\text{px}$ for disadvantage) and hold-to-bind ($\ge 340\text{ms}$, $< 12\text{px}$ drift) with explicit visual feedback.
- [ ] **Keyboard Accessibility:** Wire Arrow Left/Right to die type, Arrow Up/Down to dice count, Enter/Space to roll.
- [ ] **Visual Parity:** Verify side-by-side rendering against reference specifications in both desktop and 320px mobile viewports.

### Track 1.2: Bundle Chunking & Performance Optimization (`AUDIT.md` P1)
- [ ] **Dynamic SRD Splitting:** Decouple static imports of `srd.js` (1.49 MB) and `progression.js` (869 KB) from the root entry chunk (`app.js` 1.70 MB) using dynamic `import()` boundaries.
- [ ] **Species & Stage Chunks:** Resolve static/dynamic import collisions flagged by Vite reporter in `SpeciesChoices.jsx` and `LiveScreenSheet.jsx`.
- [ ] **Layout Transition Jank Remediation:** Replace all CSS `transition: width/height/margin` with hardware-accelerated `transform` and `opacity` properties in `styles.css:898`, `creator.css:13`, `tv-styles.css:279`, and `shell.css:391`.
- [ ] **Dependency SCA Hardening:** Upgrade Vite toolchain past 6.4.3 and resolve `source-map-js` advisories via `npm audit fix`.

### Track 1.3: User Experience & Design Polish (`CRITIQUE.md` P1)
- [ ] **DM Fast-Track Onboarding ("First Session in 5 Minutes"):** Implement an actionable setup checklist for first-time DMs (Create Campaign $\rightarrow$ Invite Players $\rightarrow$ Launch First Scene) in `SettingsMenu.jsx`.
- [ ] **Consistent Save Feedback:** Standardize auto-save toasts vs explicit manual commit indicators across campaign settings, character edits, and adventure notes.
- [ ] **Prepared Dice Prominence:** Promote "Prepared Dice" from a deeply nested subpage into a prominent, directly accessible tool for the DM.
- [ ] **Touch Target Sizing:** Expand undersized interactive targets ($< 44\times 44\text{px}$) identified in `creator/join-table.css` and `app-extra-styles.css`.

---

## 3. Wave 2: The Unified Mesa & Tactical Intelligence (Frente A & B)

### Track 2.1: Frente A — Party Tactical Insights (`PLANO-MESA-E-METRICAS.md`)
- [ ] **Structured Spell Effects Catalog (`spell-effects.js`):** Scripted extraction of damage types, saving throws, healing amounts, and control conditions from SRD spell descriptions.
- [ ] **Session Comp Radar:** Multi-axis radar visualization comparing average party score vs peak party score across all 11 tactical roles.
- [ ] **Bestiary Vulnerability Matching:** Dynamic table cross-referencing party damage types against current campaign monster encounters to flag resistances, immunities, and vulnerabilities.
- [ ] **Encounter Difficulty & Spotlight Tracking:** Automatic tracking of spotlight distribution across party members to ensure equitable GM attention.

### Track 2.2: Frente B — Interactive Table TV (The Mesa)
- [ ] **Fog of War Brush Painting:** DM canvas brush tool to hide/reveal tactical map regions in real time.
- [ ] **Player Token Dragging:** Allow authenticated players to move their own tactical tokens on the table grid with instant TV screen synchronization.
- [ ] **Map Pings & Laser Indicators:** Temporary animated radial pings on the canvas triggered by player or DM tap.
- [ ] **Diegetic Soundscapes & Ambience:** Integrated background music player (tavern, dungeon, boss, travel) streaming audio directly to the table screen.
- [ ] **Resilient Polling:** Add exponential backoff and non-blocking offline alert banners to `polling.js`.

---

## 4. Wave 3: Scalability, Infrastructure & Ecosystem Expansion

### Track 3.1: Database & Cloud Infrastructure
- [ ] **MySQL Production Migration:** Transition PythonAnywhere deployment from single-file SQLite to hosted MySQL database using Django database routing.
- [ ] **Automated Backup Snapshots:** Nightly database and media export scripts saving to encrypted off-site cloud storage.
- [ ] **Image Storage Offload (Cloudflare R2 / S3):** Migrate base64 inline images in `WorldImage` and `CombatInstance.map_data` to dedicated object storage.

### Track 3.2: Community & Content Ecosystem
- [ ] **Homebrew Bestiary Exporter/Importer:** Community sharing format for custom monster statblocks, spells, and magic items.
- [ ] **Multi-Campaign Table Hub:** Unified DM overview across multiple running campaigns with shared NPC and lore references.
- [ ] **Progressive Web App (PWA):** Service worker caching and installable web manifest for full offline standalone operation on mobile devices.

---

## 5. Backend Sync (added 2026-11-11)

Production runs the backend of 2026-10-26; `main` is 328 commits ahead. Full plan: [`docs/sync-spec.md`](docs/sync-spec.md).

- [ ] **A. Unblock the deploy:** `FORJA_UPDATE_KEY_SHA256` secret, one update, fix the stale version label (A1–A4).
- [ ] **B. Verify what ships:** 26 new routes and migration `0014` (B1–B14); then remove the 35 "old server" fallbacks in the frontend.
- [ ] **C. Repair `main` first:** missing migration `0015`, 13 failing and 2 erroring backend tests, tests in the release workflow (C1–C9).
- [ ] **D1. Character versions on the server:** `CharacterVersion` table, routes, read-only enforcement, data migration (D1.1–D1.14). Frontend shipped in v1.0.54.
- [ ] **D2. Dice on the server:** grouped results in `table-roll`, history, prepared dice, belt and multi-roll persistence (D2.1–D2.5).

