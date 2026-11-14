# UX audit: the sheet at the table (v1.0.132)

**Goal:** at the table the app should cost seconds, not attention. Each change below should cut taps, reading or waiting during play, or move work the player does by hand into the app.

**How this was measured:** a phone screen (390×844) and desktop, with dev characters Magdalene (warlock/sorcerer, multiclass) and Angel (artificer). I measured element positions, tap-target sizes and the production build. Numbers are from the v1.0.132 build.

---

## 1. What the numbers say

| Measurement (phone, 390×844) | Value | Why it matters at the table |
|---|---|---|
| Where the HP and Vitality panel starts | **1,167 px down** (screen height 844) | The first screen shows only the hero banner. Checking or changing HP always needs a scroll. |
| Where the tab bar starts | 1,093 px down | Moving between tabs means scrolling back up past the hero every time. |
| Play tab length | 5,432 px (about 6.5 screens) | Finding the right panel means scrolling. |
| Tap targets smaller than 32 px | **44 of 131** on screen | Below the 44 px recommended by Apple and WCAG 2.5.5. Mis-taps mid-combat. |
| Smallest text on screen | 10.5 px | Hard to read at arm's length or in dim light. |
| JavaScript before the sheet shows (gzip) | about **1.1 MB** (app 571 KB + SRD data 564 KB) + 121 KB CSS | Slow first open on table wifi or 4G. |
| Offline support (PWA manifest / service worker) | **none** | A bad connection at the table means no sheet at all. |
| Undo for HP, slots or resources | **none** | A wrong tap has to be fixed by hand, and the player has to remember the old value. |
| Tabs | 9, the bar scrolls sideways on a phone | Features, Inventory and Notes are hidden off-screen. |

## 2. Ranked findings

Severity: **S1** blocks or slows a common table action · **S2** friction on a frequent action · **S3** polish.

### S1: the first screen is all banner (P1)
On a phone the portrait banner, campaign bar, class panel, badges, name and details fill the whole first screen. HP, AC, the abilities and the dice are all below it. During combat this is the screen people open most, and it shows the least useful thing.
- **Fix:** once the page scrolls, shrink the hero to a 56 px sticky strip: portrait, name, HP bar, AC, the Inspiration and rest badges. Keep the tab bar stuck right under it. *(Common pattern: Apple Music, D&D Beyond's mobile sheet header.)*
- **Fix:** open straight on the Play tab with the hero already collapsed when the sheet was opened from a campaign or the last session was a game.

### S1: no offline mode (P2)
Table wifi is often weak and there's no service worker. A dropped connection mid-session can blank the sheet, or lose a change without saying so (v1.0.120 now at least shows a message when a save is refused).
- **Fix:** make the app installable (Vite PWA plugin). Cache the app and the rules data, and keep the active character in IndexedDB.
- **Fix:** queue edits while offline and send them when back online, with a small "offline · 3 changes waiting" dot by the name.

### S1: no undo (P3)
HP, spell slots, resource pips, rests and conditions apply instantly with nothing to take them back. A wrong tap on a long rest wipes the record of what was spent.
- **Fix:** after every change to play state, show a toast for 6 seconds: "−7 HP · Undo". Keep the last 20 changes so they can be undone one by one.
- **Fix:** long rest and short rest show a one-screen summary before applying ("restores 3 slots, 2 Hit Dice, Lucky 3/3"). They apply without asking if the player turns that off.

### S2: hidden roll gesture (P4)
Hexes, skills and attacks roll on press-and-hold (220 ms). A plain tap does nothing, and nothing on screen says to hold. New players tap, see nothing happen, and give up.
- **Fix:** a plain tap rolls straight away. Hold opens the menu (advantage, disadvantage, a bonus die). This is the usual pattern in most VTTs.
- **Fix:** if the setting stays hold-to-roll, a plain tap shows a short pulse with "hold to roll" the first three times.

### S2: small tap targets (P5)
44 of 131 tap targets are under 32 px: resource pips, slot gems, the arrows on folded items, the small level badges and the inline "?" icons.
- **Fix:** every target at least 44×44 px. Keep the visible icon small and enlarge the hit area with padding or `::before`.

### S2: long Play tab and no way to jump (P6)
The Play tab is 6.5 screens long. Attacks, spells and resources are far down.
- **Fix:** a "Jump to" strip under the tabs: HP · Attacks · Spells · Resources · Conditions. Each scrolls smoothly to its panel and keeps it in view.
- **Fix:** remember where each tab was scrolled to (per tab, per character).

### S2: the turn isn't the main view (P7)
Combat runs turn by turn, but the sheet is laid out by section.
- **Fix:** a **My Turn** view (a button on the tab bar, or a swipe) with one card: action, bonus action, reaction and movement. Under each, what the character can use right now: attacks with ready-made to-hit and damage, cantrips, bonus-action features, spells within the remaining slots. Each line is one tap to roll and use. It resets when the DM's tracker moves to the next turn.

### S2: no reminders for rules the app already knows (P8)
The app already knows concentration, conditions, temporary HP, Hit Dice and attunement. It doesn't act on them.
- **Concentration:** when HP drops while concentrating, offer the CON save automatically. The DC is max(10, half the damage).
- **Conditions:** show their effects on the rolls themselves, e.g. a red dot on attacks "disadvantage: Poisoned". The roll applies them.
- **Death saves:** at 0 HP, the HP panel becomes the death-save tracker with one "roll death save" button.
- **Rests:** a short rest offers to spend Hit Dice as a stepper showing the healing.
- **Prepared spells:** "you prepared 9 of 10" on the Spells tab.

### S2: 9 tabs that scroll sideways (P9)
- **Fix:** on phones, a bottom tab bar with 5 items: Play · Spells (or Features for non-casters) · Inventory · Character · More. History, Journal and NPCs go under More, and Ability Scores and Skills merge into Character. A bottom bar is standard and easier to reach on big phones.

### S3: first open loads too much (P10)
1.1 MB of gzipped JavaScript before the sheet shows. Most of it is SRD data and text the Play tab doesn't need.
- **Fix:** load the full spell and feat text only when a card is unfolded (it's already a separate file; check it's lazy everywhere). Load the bestiary and the 3D dice only when opened. Keep only the character's own rules in the main bundle.
- **Fix:** add `<link rel=preload>` for the active character's data, and draw the sheet from the IndexedDB copy before the network replies.

### S3: smallest text and contrast (P11)
- The 10.5 px labels (on the hexes, tags, "passive") should be at least 12 px. Check the gold-on-dark tags for 4.5:1 contrast.
- Reading the sheet in a dark room: a high-contrast "Table" theme with brighter text and no textures.

### S3: the screen sleeps (P12)
- **Fix:** turn on the Screen Wake Lock API while a sheet is open in Play, with an option in settings. Otherwise the phone locks between turns.

### S3: feedback without looking (P13)
- **Fix:** a short vibration (navigator.vibrate) on a roll result, a critical, damage taken and a concentration check. The player feels it without looking down.
- **Fix:** for natural 20s and 1s, a short sound with a mute option.

## 3. Automations that save time at the table

| What players do by hand today | What the app can do | Time saved |
|---|---|---|
| Add up the to-hit and damage for each weapon | Weapon cards with ready-made to-hit and damage (Finesse picks the better of STR/DEX, magic bonus, fighting style). Tap = attack + damage | about 10 s per attack |
| Work out the concentration DC | Automatic prompt when taking damage (P8) | about 5 s and no missed saves |
| Track temporary HP separately | The damage pad subtracts temporary HP first | about 5 s |
| Spend Hit Dice one at a time | Short-rest stepper (P8) | about 20 s per rest |
| Check whether a feature recharged | Rests already reset resources; add "Lucky 3/3 restored" to the rest summary | — |
| Ask the DM "is it my turn?" | Show the DM tracker's current turn on the sheet (a pulse on the hero strip) | — |
| Read the full rules text mid-turn | One-line summary on each card ("Bonus action · 1/short rest · +1d8 to ally"); full text when unfolded | about 15 s per lookup |

## 4. Industry standards to adopt

- **WCAG 2.2 AA:** 24 px minimum targets (44 px recommended), 4.5:1 text contrast, visible focus, `prefers-reduced-motion` (already partly in place).
- **Installable web app:** manifest, service worker, offline-first data; installs to the phone's home screen without an app store.
- **Optimistic UI with undo:** apply the change immediately and make it reversible (Gmail's "Undo send" pattern). No confirmation dialogs for actions that can be undone.
- **Thumb-reach layout:** bottom tab bar on phones; main actions in the bottom half of the screen.
- **Progressive disclosure:** summary first, details on unfold. The hex panel and folded feature cards already do this; extend it to spells and inventory.

## 5. Suggested order

| Wave | Items | Effort | What it does at the table |
|---|---|---|---|
| 1 (quick wins) | P3 undo toasts · P12 wake lock · P5 tap targets · P4 tap-to-roll | S–M | Fewer mistakes, no screen locking, rolls that work on first try |
| 2 | P1 sticky compact hero · P6 jump strip · P9 bottom tab bar | M | Everything for a turn within one scroll |
| 3 | P8 rules reminders · weapon cards with ready-made numbers · P13 haptics | M–L | The app does the arithmetic and reminders |
| 4 | P2 offline · P10 bundle split · P7 My Turn view | L | Works on bad wifi, opens fast, a turn becomes one card |

Backend work only needed for: syncing offline edits (P2), and the DM tracker's current turn appearing on the sheet (§3). Everything else is frontend only.
