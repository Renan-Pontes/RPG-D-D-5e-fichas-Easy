/* ============================================
   Utilities: storage, math, share, defaults
   ============================================ */

import SRD from './data/srd.js';
import { computeProgression } from './src/progression/engine.js';
import { rulesFor } from './src/progression/rules.js';
import { SPELLS_2024, BACKGROUNDS_2024, SPECIES_2024 } from './data/rules2024.js';

const Utils = (() => {

const STORAGE_KEY = 'dnd5e-forge:characters:v1';

function uid() {
  return `local-${crypto.randomUUID()}`;
}

function mod(score) {
  return Math.floor((score - 10) / 2);
}

function fmtMod(n) {
  return (n >= 0 ? '+' : '') + n;
}

// === Storage ===
function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAll(chars) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}

function loadChar(id) {
  return loadAll().find(c => c.id === id) || null;
}

function saveChar(char) {
  const all = loadAll();
  const idx = all.findIndex(c => c.id === char.id);
  char.updatedAt = Date.now();
  if (idx >= 0) all[idx] = char;
  else all.push(char);
  saveAll(all);
}

function deleteChar(id) {
  saveAll(loadAll().filter(c => c.id !== id));
}

// === Defaults ===
function makeNew() {
  return {
    id: uid(),
    rulesVersion: '2024',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    // Identity
    name: '',
    player: '',
    race: '',
    className: '',
    level: 1,
    background: '',
    alignment: '',
    xp: 0,
    levelingMode: 'milestone',
    // Abilities (point buy default array 8s)
    abilities: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
    // Race ASI applied (computed at calc time but store as bonus map for clarity)
    raceBonus: {},
    // Proficiencies
    skillProfs: [], // skill ids
    skillExpertise: [], // doubled prof
    saveProfs: [], // ability ids — derived from class but mutable
    languages: [],
    otherProfs: '',
    // Combat
    currentHp: 0,
    maxHp: 0,
    tempHp: 0,
    hitDiceUsed: 0,
    deathSaves: { success: 0, fail: 0 },
    inspiration: false,
    armor: null,         // {id, ac, type, equipped}
    hasShield: false,
    extraAcBonus: 0,
    speedOverride: 0,
    // Inventory
    weapons: [],         // {id?, name, bonus, dmg, dmgType, note}
    equipment: [],       // {name, qty}
    treasure: '',
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    // Spells
    spells: [],          // {id, prepared}
    spellSlotsUsed: [],  // array per level (1..9), entries are integers
    // Story
    personality: '',
    ideals: '',
    bonds: '',
    flaws: '',
    backstory: '',
    appearance: '',
    age: '',
    height: '',
    weight: '',
    eyes: '',
    skin: '',
    hair: '',
    allies: '',
    notes: '',          // journal
    // Visual
    avatar: '',         // base64 data URL
    symbol: '',         // text or emoji
    // Subclass
    subclass: '',       // e.g. 'moon', 'land'
    landType: '',       // land circle terrain type
    starFormType: '',   // stars circle constellation form
    wildShapeUses: 0,   // uses spent (max 2, recharge on short/long rest)
    // Conditions & temp effects
    conditions: [],     // active condition ids (blinded, charmed, etc.)
    tempEffects: [],    // custom [{id, name, desc, duration}]
    // NPCs encountered
    npcs: [],           // [{id, name, race, role, notes, relationship}]
    // Features (extra) — user-added
    customFeatures: [], // {name, desc}
  };
}

// === Computed values ===
function abilityWithRace(char, key) {
  const base = char.abilities[key] || 0;
  const bonus = (char.raceBonus && char.raceBonus[key]) || 0;
  return base + bonus;
}

function abilityMod(char, key) {
  return mod(abilityWithRace(char, key));
}

function profBonus(char) {
  return SRD.profBonus(char.level || 1);
}

function saveBonus(char, key) {
  const m = abilityMod(char, key);
  const p = (char.saveProfs || []).includes(key) ? profBonus(char) : 0;
  return m + p;
}

// === Languages ===
// Ids em inglês (formato já salvo nas fichas); rótulos pt/en para exibição.
const LANGUAGES = [
  { id: 'Common', pt: 'Comum', rare: false },
  { id: 'Common Sign Language', pt: 'Língua de Sinais Comum', rare: false },
  { id: 'Draconic', pt: 'Dracônico', rare: false },
  { id: 'Dwarvish', pt: 'Anão', rare: false },
  { id: 'Elvish', pt: 'Élfico', rare: false },
  { id: 'Giant', pt: 'Gigante', rare: false },
  { id: 'Gnomish', pt: 'Gnômico', rare: false },
  { id: 'Goblin', pt: 'Goblin', rare: false },
  { id: 'Halfling', pt: 'Halfling', rare: false },
  { id: 'Orc', pt: 'Orc', rare: false },
  { id: 'Abyssal', pt: 'Abissal', rare: true },
  { id: 'Celestial', pt: 'Celestial', rare: true },
  { id: 'Deep Speech', pt: 'Dialeto Subterrâneo', rare: true },
  { id: 'Infernal', pt: 'Infernal', rare: true },
  { id: 'Primordial', pt: 'Primordial', rare: true },
  { id: 'Sylvan', pt: 'Silvestre', rare: true },
  { id: 'Undercommon', pt: 'Subcomum', rare: true },
  { id: 'Druidic', pt: 'Druídico', rare: true, secret: true },
  { id: "Thieves' Cant", pt: 'Gíria de Ladrão', rare: true, secret: true },
];

// Idiomas secretos que a classe concede no nível 1.
const CLASS_LANGUAGES = { druid: ['Druidic'], rogue: ["Thieves' Cant"] };

const CHOICE_RE = /^\+(\d+)/;

function languageLabel(id, lang) {
  if (lang !== 'pt') return id;
  return LANGUAGES.find(l => l.id === id)?.pt || id;
}

// Idiomas fixos (espécie + classe), sem os marcadores "+N of choice".
function fixedLanguages(char) {
  const race = racesFor(char).find(r => r.id === char.race);
  const fromRace = (race?.languages || []).filter(l => !CHOICE_RE.test(l));
  return [...new Set([...(fromRace.length ? fromRace : ['Common']), ...(CLASS_LANGUAGES[char.className] || [])])];
}

// De onde vêm os idiomas à escolha: [{ source: 'race'|'background'|'origin', n }].
function languageChoiceSources(char) {
  const race = racesFor(char).find(r => r.id === char.race);
  const fromRace = (race?.languages || []).reduce((n, l) => n + (+(CHOICE_RE.exec(l)?.[1]) || 0), 0);
  // Regras de 2024: todo personagem sabe Comum + 2 idiomas à escolha (a origem substitui a espécie).
  if (char.rulesVersion === '2024') return [{ source: 'origin', n: Math.max(2, fromRace) }];
  const bg = SRD.BACKGROUNDS.find(b => b.id === char.background);
  return [
    { source: 'race', n: fromRace },
    { source: 'background', n: +(bg?.languages) || 0 },
  ].filter(x => x.n > 0);
}

// Quantos idiomas o jogador escolhe livremente.
function languageChoiceCount(char) {
  return languageChoiceSources(char).reduce((n, x) => n + x.n, 0);
}

// Lista final exibida na ficha: fixos + escolhidos (tolerante a fichas antigas).
function languagesFor(char) {
  const chosen = (char.languages || []).filter(l => !CHOICE_RE.test(l));
  return [...new Set([...fixedLanguages(char), ...chosen])];
}

// === Skills ===
function backgroundSkills(char) {
  const bg = (char.rulesVersion === '2024' ? BACKGROUNDS_2024 : SRD.BACKGROUNDS).find(b => b.id === char.background);
  return bg?.skills || [];
}

// Perícias do antecedente sempre contam, mesmo em fichas criadas antes do ajuste.
function hasSkillProf(char, skillId) {
  return (char.skillProfs || []).includes(skillId) || backgroundSkills(char).includes(skillId);
}

function skillBonus(char, skillId) {
  const skill = SRD.SKILLS.find(s => s.id === skillId);
  if (!skill) return 0;
  const m = abilityMod(char, skill.stat);
  const isProf = hasSkillProf(char, skillId);
  const isExpert = (char.skillExpertise || []).includes(skillId);
  if (isExpert) return m + profBonus(char) * 2;
  if (isProf) return m + profBonus(char);
  return m;
}

function passivePerception(char) {
  return 10 + skillBonus(char, 'perception');
}

function computeAc(char) {
  const dex = abilityMod(char, 'dex');
  let ac = 10 + dex;
  if (!char.armor) {
    if (char.className === 'barbarian') ac += abilityMod(char, 'con');
    if (char.className === 'monk' && !char.hasShield) ac += abilityMod(char, 'wis');
    if (char.className === 'sorcerer' && char.subclass === 'draconic') {
      if (char.rulesVersion !== '2024') ac = 13 + dex;
      else if (char.level >= 3) ac = 10 + dex + abilityMod(char, 'cha');
    }
  }
  if (char.armor) {
    const a = SRD.ARMOR.find(x => x.id === char.armor);
    if (a) {
      if (a.type === 'light') ac = a.ac + dex;
      else if (a.type === 'medium') ac = a.ac + Math.min(dex, 2);
      else if (a.type === 'heavy') ac = a.ac;
    }
  }
  if (char.hasShield) ac += 2;
  ac += +(char.extraAcBonus || 0);
  return ac;
}

function maxHpDefault(char) {
  const cls = SRD.CLASSES.find(c => c.id === char.className);
  if (!cls) return 0;
  const con = abilityMod(char, 'con');
  // Lvl 1 = max hit die + con; later levels = avg
  let hp = cls.hitDie + con;
  for (let i = 2; i <= char.level; i++) {
    hp += Math.max(1, Math.ceil((cls.hitDie + 1) / 2) + con);
  }
  if (char.race === 'dwarf-hill') hp += char.level || 1;
  if (char.rulesVersion === '2024' && char.race === 'dwarf') hp += char.level || 1;
  if (char.originFeat === 'Tough') hp += 2 * (char.level || 1);
  if (char.className === 'sorcerer' && char.subclass === 'draconic' && (char.rulesVersion !== '2024' || char.level >= 3)) hp += char.level || 1;
  return hp;
}

function speed(char) {
  if (char.speedOverride) return char.speedOverride;
  const race = racesFor(char).find(r => r.id === char.race);
  return race ? race.speed : 30;
}

function racesFor(char) {
  if (char.rulesVersion !== '2024') return SRD.RACES;
  return [...SPECIES_2024, ...SRD.RACES.filter(r => !SPECIES_2024.some(s => s.id === r.id)).map(r => ({ ...r, legacyCompatibility: true }))];
}

function spellcastingAbility(char) {
  if (spellListClass(char) === 'wizard' && char.className !== 'wizard') return (char.level || 1) >= 3 ? 'int' : null;
  const cls = SRD.CLASSES.find(c => c.id === char.className);
  return cls && cls.spellAbility ? cls.spellAbility : null;
}

function spellSaveDc(char) {
  const ab = spellcastingAbility(char);
  if (!ab) return null;
  return 8 + profBonus(char) + abilityMod(char, ab);
}

function spellAttackBonus(char) {
  const ab = spellcastingAbility(char);
  if (!ab) return null;
  return profBonus(char) + abilityMod(char, ab);
}

function spellSlots(char) {
  if (Array.isArray(char.spellSlotsMax) && char.spellSlotsMax.length === 9) {
    const slots = char.spellSlotsMax.map(v => Math.max(0, Number(v) || 0));
    while (slots.length && !slots.at(-1)) slots.pop();
    return slots;
  }
  if (char.rulesVersion === '2024') {
    const row = rulesFor(char)?.perLevel?.[char.level || 1]?.spellSlots;
    if (row) {
      const slots = [...row];
      while (slots.length && !slots.at(-1)) slots.pop();
      return slots;
    }
  }
  return SRD.getSpellSlots(char.className, char.level, char.subclass || '');
}

function spellListClass(char) {
  const sub = (char.subclass || '').toLowerCase();
  return ((char.className === 'fighter' && sub === 'eldritchknight') || (char.className === 'rogue' && sub === 'arcanetrickster')) ? 'wizard' : char.className;
}

// === Prepared-caster logic ===
const PREPARED_CASTERS = ['cleric', 'druid', 'paladin', 'wizard', 'artificer'];

function isPreparedCaster(char) {
  return PREPARED_CASTERS.includes(char.className);
}

// Cantrips known by class per character level (5e SRD).
// Some classes / subclasses grant extras — those are handled via cantripBonus().
const CANTRIPS_BY_CLASS = {
  bard:     [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  cleric:   [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
  druid:    [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  sorcerer: [4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6],
  warlock:  [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  wizard:   [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
  paladin:  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ranger:   [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
};

// Some races grant a bonus cantrip from a specific class' list.
// (high-elf, drow get a wizard cantrip; etc.) Returns extra count for the
// character's *own* class — keep simple for now.
function cantripBonus(char) {
  let bonus = 0;
  // Druid Circle of the Land grants an extra cantrip (in 2024 rules) — none in 5e SRD.
  // Reserved hook for future subclass-driven cantrip grants.
  if (char.className === 'druid' && char.subclass === 'land') {
    // Not strictly RAW in 2014, but common house rule and tracked by some Circles.
    // Keep 0 unless explicitly granted.
  }
  return bonus;
}

function cantripsKnown(char) {
  return computeProgression(char).cantripsKnown;
}

// Prepared spell limit:
//  - Cleric / Druid / Wizard: ability mod + class level (min 1)
//  - Paladin: CHA mod + ⌊level/2⌋ (min 1)
function preparedSpellsLimit(char) {
  if (!isPreparedCaster(char)) return Infinity;
  if (!spellSlots(char).some(Boolean)) return 0;
  if (char.rulesVersion === '2024') return computeProgression(char).spellsPrepared;
  const ab = spellcastingAbility(char);
  if (!ab) return 0;
  const m = abilityMod(char, ab);
  let limit;
  if (['paladin', 'artificer'].includes(char.className)) {
    limit = m + Math.floor((char.level || 1) / 2);
  } else {
    limit = m + (char.level || 1);
  }
  return Math.max(1, limit);
}

// Max castable spell level (from slots; paladin/ranger get spells from L2).
function maxSpellLevel(char) {
  const slots = spellSlots(char);
  return slots.length;
}

// === Race ASI helpers ===
function applyRaceBonus(char, raceId) {
  if (char.rulesVersion === '2024') return char.raceBonus || {};
  const race = SRD.RACES.find(r => r.id === raceId);
  if (!race) return {};
  const bonus = {};
  Object.entries(race.asi || {}).forEach(([k, v]) => {
    if (k === 'all') {
      SRD.ABILITIES.forEach(a => bonus[a] = (bonus[a] || 0) + v);
    } else if (k === 'other') {
      // user picks two abilities. Default: spread on int/wis
      // We'll let UI handle this via raceBonus override
    } else {
      bonus[k] = (bonus[k] || 0) + v;
    }
  });
  return bonus;
}

// === Share via URL ===
function encodeChar(char) {
  const json = JSON.stringify(char);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeChar(str) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  } catch { return null; }
}

// === Dice ===
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(count, sides) {
  const rolls = [];
  for (let i = 0; i < count; i++) rolls.push(rollDie(sides));
  return rolls;
}

return {
  races: racesFor,
  spellCatalog: char => char.rulesVersion === '2024' ? SPELLS_2024 : SRD.SPELLS,
  backgrounds: char => char.rulesVersion === '2024' ? BACKGROUNDS_2024 : SRD.BACKGROUNDS,
  subclassLevel: char => char.rulesVersion === '2024' ? 3 : ({ cleric:1, sorcerer:1, warlock:1, druid:2, wizard:2 }[char.className] || 3),
  knownSpellLimit: char => { const p = computeProgression(char); return char.rulesVersion === '2024' ? p.spellsPrepared || p.spellsKnown : p.spellsKnown; },
  uid, mod, fmtMod,
  loadAll, saveAll, loadChar, saveChar, deleteChar,
  makeNew,
  abilityWithRace, abilityMod, profBonus, saveBonus, skillBonus, passivePerception,
  computeAc, maxHpDefault, speed,
  spellcastingAbility, spellSaveDc, spellAttackBonus, spellSlots, spellListClass,
  isPreparedCaster, cantripsKnown, preparedSpellsLimit, maxSpellLevel,
  applyRaceBonus,
  LANGUAGES, CLASS_LANGUAGES, languageLabel, fixedLanguages, languageChoiceCount, languageChoiceSources, languagesFor,
  backgroundSkills, hasSkillProf,
  encodeChar, decodeChar,
  rollDie, rollDice,
};
})();

export default Utils;
