/* ============================================
   Utilities: storage, math, share, defaults
   ============================================ */

import SRD from './data/srd.js';

const Utils = (() => {

const STORAGE_KEY = 'dnd5e-forge:characters:v1';

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
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

function skillBonus(char, skillId) {
  const skill = SRD.SKILLS.find(s => s.id === skillId);
  if (!skill) return 0;
  const m = abilityMod(char, skill.stat);
  const isProf = (char.skillProfs || []).includes(skillId);
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
    hp += Math.ceil((cls.hitDie + 1) / 2) + con;
  }
  return hp;
}

function speed(char) {
  if (char.speedOverride) return char.speedOverride;
  const race = SRD.RACES.find(r => r.id === char.race);
  return race ? race.speed : 30;
}

function spellcastingAbility(char) {
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
  return SRD.getSpellSlots(char.className, char.level);
}

// === Race ASI helpers ===
function applyRaceBonus(char, raceId) {
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
  uid, mod, fmtMod,
  loadAll, saveAll, loadChar, saveChar, deleteChar,
  makeNew,
  abilityWithRace, abilityMod, profBonus, saveBonus, skillBonus, passivePerception,
  computeAc, maxHpDefault, speed,
  spellcastingAbility, spellSaveDc, spellAttackBonus, spellSlots,
  applyRaceBonus,
  encodeChar, decodeChar,
  rollDie, rollDice,
};
})();

export default Utils;
