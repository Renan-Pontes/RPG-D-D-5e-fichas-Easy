/* ============================================
   Utilities: storage, math, share, defaults
   ============================================ */

import SRD from './data/srd.js';
import { computeProgression } from './src/progression/engine.js';
import { rulesFor } from './src/progression/rules.js';
import * as MC from './src/progression/multiclass.js';
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

// Proficiência sempre pelo nível total (na "visão" de uma classe, totalLevel).
function profBonus(char) {
  return SRD.profBonus(char.totalLevel || char.level || 1);
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
    // Multiclasse: só uma Defesa sem Armadura vale — fica a que der a maior CA.
    const options = [ac];
    if (MC.hasClass(char, 'barbarian')) options.push(10 + dex + abilityMod(char, 'con'));
    if (MC.hasClass(char, 'monk') && !char.hasShield) options.push(10 + dex + abilityMod(char, 'wis'));
    const sorc = MC.classEntries(char).find(e => e.id === 'sorcerer' && e.subclass === 'draconic');
    if (sorc) {
      if (char.rulesVersion !== '2024') options.push(13 + dex);
      else if (sorc.level >= 3) options.push(10 + dex + abilityMod(char, 'cha'));
    }
    ac = Math.max(...options);
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
  const die = (id) => SRD.CLASSES.find(c => c.id === id)?.hitDie || 8;
  // Nv 1 = dado máximo da classe inicial; depois a média do dado de cada nível.
  const seq = MC.classSequence(char);
  let hp = cls.hitDie + con;
  for (let i = 1; i < seq.length; i++) {
    hp += Math.max(1, Math.ceil((die(seq[i]) + 1) / 2) + con);
  }
  if (char.race === 'dwarf-hill') hp += char.level || 1;
  if (char.rulesVersion === '2024' && char.race === 'dwarf') hp += char.level || 1;
  if (char.originFeat === 'Tough') hp += 2 * (char.level || 1);
  const sorc = MC.classEntries(char).find(e => e.id === 'sorcerer' && e.subclass === 'draconic');
  if (sorc && (char.rulesVersion !== '2024' || sorc.level >= 3)) hp += sorc.level;
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
  // Multiclasse: atributo da primeira classe conjuradora (cada classe tem o seu na aba Magias).
  if (MC.isMulticlass(char)) {
    const v = casterViews(char)[0];
    return v ? spellcastingAbilityOfClass(v) : null;
  }
  return spellcastingAbilityOfClass(char);
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

const trimSlots = (slots) => { const out = [...slots]; while (out.length && !out.at(-1)) out.pop(); return out; };

// Uma "visão" por classe (ver multiclass.js) — reaproveita a lógica de classe única.
function classViews(char) {
  return MC.classEntries(char).map(e => MC.classView(char, e));
}

// Classes com Conjuração no nível atual delas (inclui Pacto do bruxo).
function casterViews(char) {
  return classViews(char).filter(v => classSlots(v).length > 0 || (cantripsKnown(v) > 0 && !!spellcastingAbilityOfClass(v)));
}

function spellcastingAbilityOfClass(v) {
  if (spellListClass(v) === 'wizard' && v.className !== 'wizard') return (v.level || 1) >= 3 ? 'int' : null;
  return SRD.CLASSES.find(c => c.id === v.className)?.spellAbility || null;
}

// Nível de conjurador para a tabela de multiclasse (PHB/SRD): meio conjurador
// arredonda para baixo em 2014 e para cima em 2024; artífice sempre para cima.
function casterLevelOf(v) {
  const lv = v.level || 0;
  const sub = (v.subclass || '').toLowerCase();
  if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(v.className)) return lv;
  if (v.className === 'artificer') return Math.ceil(lv / 2);
  if (['paladin', 'ranger'].includes(v.className)) return v.rulesVersion === '2024' ? Math.ceil(lv / 2) : Math.floor(lv / 2);
  if ((v.className === 'fighter' && sub === 'eldritchknight') || (v.className === 'rogue' && sub === 'arcanetrickster')) return Math.floor(lv / 3);
  return 0;
}

function classSlots(v) {
  if (v.rulesVersion === '2024') {
    const row = rulesFor(v)?.perLevel?.[v.level || 1]?.spellSlots;
    if (row) return trimSlots(row);
  }
  return SRD.getSpellSlots(v.className, v.level, v.subclass || '');
}

function spellSlots(char) {
  if (Array.isArray(char.spellSlotsMax) && char.spellSlotsMax.length === 9) {
    return trimSlots(char.spellSlotsMax.map(v => Math.max(0, Number(v) || 0)));
  }
  if (MC.isMulticlass(char)) {
    const views = classViews(char);
    const casters = views.filter(v => v.className !== 'warlock' && classSlots(v).length > 0);
    // Duas classes conjuradoras ou mais: tabela de multiclasse pelo nível de conjurador somado.
    let slots = casters.length >= 2
      ? SRD.getSpellSlots('wizard', Math.max(1, casters.reduce((n, v) => n + casterLevelOf(v), 0)))
      : casters.length === 1 ? classSlots(casters[0]) : [];
    // Magia de Pacto: somada aos espaços do mesmo círculo (recupera junto no descanso).
    const pact = views.find(v => v.className === 'warlock');
    if (pact) {
      slots = [...slots];
      classSlots(pact).forEach((n, i) => { slots[i] = (slots[i] || 0) + (n || 0); });
    }
    return trimSlots(slots.map(n => n || 0));
  }
  return classSlots(char);
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
  // Multiclasse
  classEntries: MC.classEntries, classLevel: MC.classLevel, hasClass: MC.hasClass, isMulticlass: MC.isMulticlass,
  classView: MC.classView, classSequence: MC.classSequence, canMulticlassInto: MC.canMulticlassInto,
  missingPrereqs: MC.missingPrereqs, multiclassProfs: MC.multiclassProfs, MULTICLASS_PREREQS: MC.MULTICLASS_PREREQS,
  classViews, casterViews, casterLevelOf,
  spellcastingAbilityOfClass,
  // "Druida 3 / Guerreiro 1" (ou "Druida 4" com uma classe só)
  classLabel: (char, lang, tn) => MC.classEntries(char).map(e => `${tn('class', e.id, lang)} ${e.level}`).join(' / '),
  hitDiceLabel: (char) => {
    const byDie = {};
    for (const id of MC.classSequence(char)) { const d = SRD.CLASSES.find(c => c.id === id)?.hitDie || 8; byDie[d] = (byDie[d] || 0) + 1; }
    return Object.entries(byDie).sort((a, b) => b[0] - a[0]).map(([d, n]) => `${n}d${d}`).join(' + ');
  },
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
