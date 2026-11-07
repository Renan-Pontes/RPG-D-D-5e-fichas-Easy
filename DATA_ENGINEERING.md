# Data Engineering & Pipeline Specification — Forja de Heróis

> **Corpus Version:** D&D 5e SRD 5.2.1 (2024 Revision) & SRD 5.1 (2014 Baseline)  
> **Primary Scripts:** `scripts/import-open5e-monsters.mjs`, `scripts/monster-names-pt.mjs`, `scripts/sync-rules.mjs`, `scripts/build-spell-tags.mjs`, `scripts/extract_dnd5e_sheet_layout.py`

---

## 1. Data Ecosystem Overview

The data tier powers character creation, progression calculations, tactical VTT combat, and PDF compilation. All data operations strictly adhere to Open Game License / Creative Commons CC-BY 4.0 boundaries.

```
                  ┌──────────────────────────────────────┐
                  │          UPSTREAM SOURCES            │
                  │  • Open5e API v2 (srd-2024 document) │
                  │  • SRD 5.2.1 & SRD 5.1 CC-BY-4.0     │
                  │  • Official D&D 5e Form-Fillable PDF │
                  └──────────────────┬───────────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
       ┌───────────────────────────┐   ┌───────────────────────────┐
       │   SCRIPTS & INGESTION     │   │   PDF FORM REVERSE-ENG    │
       │ import-open5e-monsters.mjs│   │extract_dnd5e_sheet_layout │
       │ monster-names-pt.mjs      │   └─────────────┬─────────────┘
       │ sync-rules.mjs            │                 │
       └─────────────┬─────────────┘                 │
                     │                               │
                     ▼                               ▼
       ┌───────────────────────────┐   ┌───────────────────────────┐
       │    FRONTEND DATA ASSETS   │   │    PDF LAYOUT RUNTIME     │
       │ • monsters-srd521.js      │   │ • dnd5e-layout.js         │
       │ • srd2024-spells.json     │   │ • export-pdf.js           │
       │ • class-options/*.js      │   │ • import-pdf.js           │
       │ • magic-items-srd.js      │   └───────────────────────────┘
       └─────────────┬─────────────┘
                     │ (Automated Sync)
                     ▼
       ┌───────────────────────────┐
       │     BACKEND MIRROR        │
       │ • api/progression/rules.py│
       │ • api/progression/data/   │
       └───────────────────────────┘
```

---

## 2. Ingestion & Transformation Pipelines

### 2.1 The Open5e SRD 5.2.1 Monster Ingestion Pipeline
- **Script:** `scripts/import-open5e-monsters.mjs`
- **Execution:**
  ```bash
  node scripts/import-open5e-monsters.mjs --cache /tmp/open5e          # Ingest & generate
  node scripts/import-open5e-monsters.mjs --cache /tmp/open5e --check  # Verify up-to-date
  ```
- **Rules & Filters:**
  - Strictly filters by `document__key=srd-2024`. Non-SRD third-party OGL content from Open5e is strictly rejected.
  - Normalizes 331 creatures ranging from CR 0 to CR 30.
  - Parses unstructured text into discrete mechanical models:
    - Attack types: `Melee Weapon Attack`, `Ranged Spell Attack`.
    - Reach / Range: parsed into numeric feet / meters.
    - Hit dice and bonus calculations.
    - Standardized Legendary Actions (3 per round, 4 in lair per SRD 5.2.1).
    - Recharge dice expressions (`Recharge 5–6`, `Recharge 6`).

### 2.2 Portuguese Localization Engine
- **Script:** `scripts/monster-names-pt.mjs` & `data/monsters-pt-engine.js`
- **Output:** `frontend/data/monsters-pt.js`
- Translates monster names, action headers, and rules terms into idiomatic Brazilian Portuguese following official D&D terminology (e.g. *Adult Red Dragon* $\rightarrow$ *Dragão Vermelho Adulto*, *Multiattack* $\rightarrow$ *Ataque Múltiplo*, *Breath Weapon* $\rightarrow$ *Arma de Sopro*).
- Preserves the English text in parallel (`name.en` / `name.pt`) to guarantee accurate rules lookups across international tables.

### 2.3 Rules Synchronization Engine (Frontend $\leftrightarrow$ Backend)
- **Script:** `scripts/sync-rules.mjs`
- **Execution:**
  ```bash
  node scripts/sync-rules.mjs          # Syncs JS descriptors to Python
  node scripts/sync-rules.mjs --check  # CI verification step
  ```
- Reads the declarative class options pools from `frontend/data/class-options/` (Artificer, Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard).
- Compiles the schema into Python data modules in `backend/api/progression/`.
- Guarantees that server-side validation during level-up approval uses bit-identical rules to the client-side UI.

### 2.4 PDF Form Coordinate Extraction Engine
- **Script:** `scripts/extract_dnd5e_sheet_layout.py`
- Parses the official fillable 3-page D&D 5e PDF form dictionary.
- Extracts bounding boxes `[x, y, width, height]`, font metrics, and field naming keys (`CharacterName`, `ClassLevel`, `AC`, `HPMax`, `Spellcasting Class`).
- Outputs the coordinate dictionary `dnd5e-layout.js` used by `export-pdf.js` to draw form fields and calculate auto-shrink font sizes down to 6pt.

---

## 3. Data Schemas & Contracts

### 3.1 Character Sheet JSON Schema (`char`)
The character payload is stored in `Character.data` (Django `JSONField`):

```typescript
interface CharacterData {
  id: string | number;               // Local UID or Backend PK
  name: string;                      // Hero name
  rulesVersion: '2024' | '2014';     // Active rules edition
  className: string;                 // e.g. 'druid', 'fighter'
  level: number;                     // 1 to 20
  subclass?: string;                 // e.g. 'stars', 'battlemaster'
  race: string;                      // Species identifier (e.g. 'elf', 'human')
  background: string;                // Background identifier (e.g. 'acolyte')
  abilities: {
    str: number; dex: number; con: number;
    int: number; wis: number; cha: number;
  };
  raceBonus?: Record<string, number>;// 2024 background ASI (+2/+1) or 2014 racial ASI
  hp: number;                        // Current HP
  maxHp: number;                     // Calculated maximum HP
  tempHp?: number;                   // Temporary HP pool
  deathSaves?: {
    successes: number;               // 0 to 3
    failures: number;                // 0 to 3
  };
  skillProfs: string[];              // ['perception', 'stealth']
  skillExpertise: string[];          // ['stealth']
  saveProfs: string[];               // ['wis', 'int']
  classOptions: Record<string, any>; // Chosen invocations, fighting styles, metamagic
  spells: {
    cantrips: string[];
    prepared: string[];
    known?: string[];
    spellbook?: string[];            // Wizard spellbook catalog
  };
  spellSlots: Record<number, { max: number; used: number }>;
  weapons: Array<{ id: string; name: string; attackBonus?: number; damage?: string }>;
  equipment: Array<{ name: string; quantity: number; weight?: number }>;
  coins: { cp: number; sp: number; ep: number; gp: number; pp: number };
  creation?: Record<string, any>;    // Wizard choices metadata
  updatedAt: number;                 // Epoch millisecond timestamp
}
```

### 3.2 Monster Statblock Schema (`bestiary.js` & `monsters-srd521.js`)

```typescript
interface MonsterStatblock {
  id: string;                        // Unique slug (e.g. 'adult-red-dragon')
  name: { pt: string; en: string };  // Bilingual name
  cr: number;                        // Challenge rating (0 to 30)
  size: 'T' | 'S' | 'M' | 'L' | 'H' | 'G';
  type: string;                      // 'dragon', 'humanoid', 'undead'
  alignment: string;
  ac: number;
  acDesc?: string;                   // 'natural armor'
  hp: number;
  hitDice: string;                   // '17d12 + 85'
  speed: Record<string, number>;     // { walk: 40, fly: 80, climb: 40 }
  abilities: Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>;
  saves?: Record<string, number>;
  skills?: Record<string, number>;
  damageVulnerabilities?: string[];  // ['cold']
  damageResistances?: string[];
  damageImmunities?: string[];       // ['fire']
  conditionImmunities?: string[];
  senses: string;
  languages: string;
  traits: Array<{ name: string; desc: string }>;
  actions: Array<{
    name: string;
    desc: string;
    attack?: { bonus: number; reach?: number; range?: string; damage: string; dmgType: string };
    saveDc?: { dc: number; ability: string; onFail: string };
    recharge?: string;               // '5-6'
  }>;
  legendaryActions?: Array<{ name: string; desc: string; cost?: number }>;
  legendaryCount?: number;           // Defaults to 3 (4 in lair)
}
```

### 3.3 Adventure Node Graph Schema (`Adventure.data`)

```typescript
interface AdventureGraph {
  version: number;
  nodes: Array<{
    id: string;                      // 'room-1', 'scene-entrance'
    title: string;                   // 'The Sunken Crypt'
    kind: 'scene' | 'combat' | 'puzzle' | 'rest';
    summary: string;
    description: string;
    monsters?: string[];             // Monster IDs present
    items?: string[];                // Items to discover
    coords: { x: number; y: number };// Position on node canvas
  }>;
  edges: Array<{
    from: string;                    // Source node ID
    to: string;                      // Target node ID
    label?: string;                  // 'North door (locked DC 15)'
    condition?: string;
  }>;
}
```

---

## 4. Data Quality, Linting & Verification

The repository enforces automated data validation via `npm test` across 1,515 assertions:
1. **Bestiary Integrity (`tests/bestiary.test.js`):** Validates all 331 monsters have non-empty HP, valid CR, structured attacks with rollable dice formulas, and complete Portuguese translations.
2. **Wild Shape Parity (`tests/bestiary.test.js:20`):** Asserts every Druid Wild Shape beast exists in the 5.2.1 catalogue with genuine attack statistics (no generic 1d4 fallback).
3. **Class Progression Contracts (`tests/classes.test.js` & `tests/class-*.test.js`):** Validates hit dice progression, spell slot formulas, and option slot unlocks for all 12 classes across levels 1 through 20.
4. **Item Catalog Schema (`tests/items.test.js`):** Verifies all weapons and armor map to standard SRD damage dice, range increments, and weight statistics.
