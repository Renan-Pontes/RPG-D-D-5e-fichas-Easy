# Forja de Heróis — Design System & Visual Specification

<!-- impeccable:design-schema 1 -->

> **Visual World:** Dark Fantasy Forged Parchment & Worn Leather  
> **Brand Identity:** Diegetic, tactile, medieval craftsmanship meeting high-precision modern TTRPG ergonomics  
> **Primary Authority:** `frontend/styles.css`, `frontend/src/sheet/ficha.css`, `frontend/src/shell/shell.css`

---

## 1. The Visual World: Forged Parchment & Leather

Forja de Heróis avoids sterile flat digital aesthetics and gaudy fantasy clutter alike. The design is grounded in **physicality and craftsmanship**:
- **Materials:** Worn dark leather bindings (`--fh-leather`), burnished antique gold foils (`--fh-gilt`), illuminated manuscripts, subtle tactile fractal noise (`--fh-noise`), and crisp parchment callouts.
- **Atmosphere:** Evokes a dimly lit tavern table or a wizard's study, illuminated by warm candlelight.
- **Balance:** Pure decorative elements never impede table speed. Tactical scanability and legibility in high-pressure combat situations always take precedence over ornament.

---

## 2. Color System & Semantic Tokens

### 2.1 Core Surfaces & Elevation

| Token | Hex Value | Purpose |
|---|---|---|
| `--bg-deep` | `#0e0a07` | Deepest root canvas; viewport background behind modals and screens. |
| `--bg-base` | `#14100c` | Primary application surface; default page backdrop. |
| `--bg-raised` | `#1b150f` | Second-level elevation; sidebar navigation, sub-headers, table headers. |
| `--bg-card` | `#221a13` | Interactive cards, list containers, unselected tabs. |
| `--bg-elevated`| `#2d2319` | Top-level interactive cards, hover highlights, active popovers. |

### 2.2 Forged Leather Panel Tokens

| Token | CSS Definition / Gradient | Application |
|---|---|---|
| `--fh-leather-hi` | `#251a14` | Top gradient stop of `.fh-panel` and `.combat-box`. |
| `--fh-leather` | `#1b1310` | Midpoint gradient stop representing oiled leather grain. |
| `--fh-leather-lo` | `#140e0b` | Base gradient stop of leather panels. |
| `--fh-gilt` | `linear-gradient(135deg, #f7dc93 0%, #8c6427 28%, #ecc777 50%, #7b5721 74%, #f2d38a 100%)` | Border-box gradient rendering forged brass and gold metallic edging. |
| `--fh-foil` | `linear-gradient(180deg, #fff3cc 0%, #f1cf7c 38%, #b07f33 52%, #f6d98f 72%, #c99645 100%)` | Shimmering text fill and medal badge headers. |

### 2.3 Ink & Typography Contrast

All ink tokens are calibrated for strict WCAG AA (and AAA where noted) contrast against dark leather backgrounds:

| Token | Hex Value | Contrast Ratio | Usage Rule |
|---|---|---|---|
| `--ink-primary` | `#f3e6cb` | $\ge 12.8:1$ (AAA) | Primary headings, values, stat numbers, critical body text. |
| `--ink-secondary` | `#d9c9a6` | $\ge 9.4:1$ (AAA) | Subheadings, descriptions, labels, button text. |
| `--ink-muted` | `#ab9a7e` | $\ge 5.2:1$ (AA) | Helper text, secondary badges, passive notes. |
| `--ink-faint` | `#7d6d57` | $< 4.5:1$ (Decorative) | Strictly for decorative dividers, subtle borders; never for readable text. |

### 2.4 Semantic Accent Spectrum

| Role | Token | Bright (Foreground) | Deep (Surface/Glow) | Usage |
|---|---|---|---|---|
| **Gold** | `--gold` (`#d6b064`) | `--gold-bright` (`#edcb7a`) | `--gold-deep` (`#a8894a`) | Primary brand accent, active state, critical highlights. |
| **Danger / HP** | `--blood` (`#9e3322`) | `--blood-bright` (`#e0604f`) | `--blood-deep` (`#5c1a10`) | Health loss, damage, natural 1 failure, death saves. |
| **Heal / Success** | `--moss` (`#5f7340`) | `--moss-bright` (`#9cc065`) | `--moss-deep` (`#34401f`) | Hit points recovered, success conditions, natural 20 critical. |
| **Arcane** | `--arcane` (`#5b6cb8`) | `--arcane-bright` (`#9fb0f0`) | `--arcane-deep` (`#262d52`) | Spells, spell slots, magical items, astral effects. |
| **Warning** | `--amber` (`#e3a445`) | `#f5be67` | `--amber-deep` (`#5a3d12`) | Pending approvals, temporary conditions, cautions. |
| **Verdigris** | `--fh-verdigris` (`#74d6b4`) | `#a2ebd2` | `--fh-verdigris-deep` (`#123f34`) | Stable health markers and heroic inspiration. |

---

## 3. Typography & Hierarchy

### 3.1 Font Stacks
1. **Display Font (`--display`):** `"Cinzel", "Trajan Pro", "Cormorant Garamond", serif;`
   - Majestic, classical Roman capital letterforms for titles, hero names, and modal headlines.
2. **Body Font (`--body`):** `"EB Garamond", "Garamond", "Hoefler Text", Georgia, serif;`
   - High-readability literary serif for trait descriptions, rule blocks, and story chronicles.
3. **Monospace / Numerical Font (`--mono`):** `"JetBrains Mono", "Menlo", monospace;`
   - Tabular numerals, dice notations (`1d20 + 5`), coordinate readouts, and modifiers.

### 3.2 Typographic Hierarchy Scale

| Level | Font Stack | Size (rem / px) | Weight | Line Height | Letter Spacing | Transform |
|---|---|---|---|---|---|---|
| **Display Hero** | `--display` | `2.25rem` (36px) | 700 | 1.15 | `0.08em` | Uppercase |
| **Section Title** | `--display` | `1.4rem` (22px) | 600 | 1.25 | `0.12em` | Uppercase |
| **Panel Header (`.fh-title`)** | `--display` | `1.05rem` (17px) | 600 | 1.25 | `0.14em` | Uppercase |
| **Stat Numbers** | `--display` | `2.0rem` (32px) | 700 | 1.0 | `0.02em` | None |
| **Body Large** | `--body` | `1.15rem` (18px) | 400 | 1.45 | Normal | None |
| **Body Standard** | `--body` | `1.0rem` (16px) | 400 | 1.40 | Normal | None |
| **Small / Badges** | `--body` | `0.85rem` (13.6px) | 600 | 1.20 | `0.04em` | None |
| **Micro Kicker** | `--display` | `0.65rem` (10.4px) | 700 | 1.0 | `0.18em` | Uppercase |

---

## 4. Spacing Scale & Rhythm

All dimensions conform to an 8-point base rhythm with a 4-point micro-step:

```
--s-1: 4px   (Tightest gap, icon padding, badge padding)
--s-2: 8px   (Button internal gap, chip spacing, compact margins)
--s-3: 12px  (Form field gap, card padding on mobile)
--s-4: 16px  (Standard component gap, desktop input padding)
--s-5: 24px  (Panel padding, section separation)
--s-6: 32px  (Major module padding, grid row gap)
--s-7: 48px  (Screen section breaks, landing page gutters)
--s-8: 64px  (Hero section margins)
```

---

## 5. Surface Modes (Impeccable Guidelines)

The user experience adapts its density and aesthetic balance across four distinct operating modes:

### 5.1 Persuade (Welcome & Authentication)
- **Goal:** Intrigue the player, welcome new adventurers, communicate the Forge's unique value.
- **Key Elements:** Dramatic dark fantasy cover art, illuminated parchment borders, streamlined single-click demo logins (`mestre@forja.local`, `renan@forja.local`).

### 5.2 Operate (Character Sheet, DM Cockpit, Combat VTT)
- **Goal:** Instant task execution with minimum cognitive friction under live session pressure.
- **Key Elements:** 
  - Forged leather cards (`.fh-panel`) with high-contrast text.
  - One-tap rolling on all skills, saves, and weapon attacks.
  - Quick-switch tabs and segmented sub-views.
  - Zero decorative animation delay on tactical inputs.

### 5.3 Read (The Grimoire & Campaign Chronicles)
- **Goal:** Deep comprehension of rules, lore, and session memories.
- **Key Elements:** Generous line spacing (1.5), serif body typography (`EB Garamond`), clear sticky table-of-contents navigation, responsive two-column reading layouts on desktop.

### 5.4 Experience (Living Stage & Public TV Screen)
- **Goal:** Shared table immersion and dramatic tension.
- **Key Elements:** Optimized for viewing from 2–3 meters away at 1080p+; high-contrast health bars (green/yellow/red); prominent active turn indicator; animated 3D/2D dice roll reveals with glowing gold critical hits and bloody critical failures.

---

## 6. Signature Component Anatomy

### 6.1 The Forged Leather Panel (`.fh-panel`)
The foundational card across the entire application:
- **Base Layer:** Two-tier background blending subtle fractal turbulence noise (`--fh-noise`) with an oiled leather gradient (`--fh-leather-hi` to `--fh-leather-lo`).
- **Border:** Dual-pass gilt border (`--fh-gilt`) in `border-box`.
- **Corner Badges:** Embedded SVG corner filigrees (`--fh-corner-tl`, `--fh-corner-tr`, `--fh-corner-bl`, `--fh-corner-br`) positioned at `inset: 5px`.
- **Light Sheen:** Subtle animated hover sheen (`linear-gradient(105deg, ...)`), disabled under `prefers-reduced-motion`.

### 6.2 Hexagonal Honeycomb Stat Grid (The Belt / Hive)
The mobile-first attribute and quick-dice interaction surface:
- **Lattice Geometry:** Standard regular hex ratio $H = W \times 1.1547$ with a clean 3–4–3 staggered structure:
  - Row 1: `Str` · `Dex` · `Con` (Physical attributes)
  - Row 2: 4 empty hex slots reserving dedicated clear-zone for the Quick Dice Belt
  - Row 3: `Int` · `Wis` · `Cha` (Mental attributes)
- **Split Hex Half Affordances:**
  - Left half: Ability Check roll (`Utils.abilityMod`).
  - Right half: Saving Throw roll (`Utils.saveBonus`).
  - Swipe $\uparrow$ ($\Delta y \le -18\text{px}$): Advantage roll.
  - Swipe $\downarrow$ ($\Delta y \ge +18\text{px}$): Disadvantage roll.
  - Tap: Standard normal d20 roll.
- **Hold-to-Bind:** Pressing and holding the attribute crest ($\ge 340\text{ms}$ with $< 12\text{px}$ drift) binds that modifier directly to the Quick Dice Belt.

### 6.3 The 17-Step Journey Wizard & "Hold to Seal"
A step-by-step character creator tailored for beginners:
- **One Concept per Screen:** Progressive disclosure following PHB 2024 order (Class $\rightarrow$ Origin $\rightarrow$ Attributes $\rightarrow$ Equipment $\rightarrow$ Details).
- **Decision Preview Panel:** Proposing a class or species displays a preview of HP, AC, traits, and consequences.
- **"Hold to Seal" CTA:** High-stakes choices require holding the primary button for $800\text{ms}$ (with instant click accessibility for assistive technologies and reduced motion).

---

## 7. Accessibility & Ergonomics Standards

1. **Touch Target Floor:** All primary interactive controls adhere to $\ge 44 \times 44\text{px}$ hit areas on mobile and touch surfaces (WCAG 2.5.5 AAA / 2.5.8 AA).
2. **Explicit Focus Styling:** High-contrast focus rings (`outline: 2px solid var(--fh-gold-hi); outline-offset: 2px;`) are enforced across all interactive elements via `:focus-visible`.
3. **Reduced Motion Conformance:** All non-essential animations, sheens, and rotations are bypassed when `prefers-reduced-motion: reduce` is detected.
4. **Skip Links:** A skip-to-content anchor (`#main`) is positioned at the top of the DOM with high-contrast accessibility styling.
5. **No Color-Alone States:** Health bars, conditions, and roll results always combine color with iconography and explicit text descriptions.
