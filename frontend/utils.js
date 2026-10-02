/* ============================================
   Utilities: storage, math, share, defaults
   ============================================ */

import SRD from './data/srd.js';
import { computeProgression } from './src/progression/engine.js';
import { featGrants } from './src/progression/feat-rules.js';
import { rulesFor } from './src/progression/rules.js';
import * as MC from './src/progression/multiclass.js';
import * as FS from './src/progression/fighting-styles.js';
import * as Species from './src/progression/species.js';
import { SPELLS_2024, BACKGROUNDS_2024, SPECIES_2024 } from './data/rules2024.js';
// Ciclo utils ↔ start-data é seguro: nenhum dos dois usa o outro no carregamento.
import { isWeaponProficient } from './src/creator/start-data.js';

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
  const p = hasSaveProf(char, key) ? profBonus(char) : 0;
  return m + p;
}

// === Languages ===
// Ids em inglês (formato já salvo nas fichas); rótulos pt/en para exibição.
// `rare` = tabela de Idiomas Raros do SRD 5.2.1 (2024). Em 2014 (PHB) a divisão
// é Padrão × Exóticos: `rare2014` sobrescreve `rare` e `only2024` some do
// catálogo 2014 (a Língua de Sinais Comum não existe lá). Use languageCatalog(char).
const LANGUAGES = [
  { id: 'Common', pt: 'Comum', rare: false },
  { id: 'Common Sign Language', pt: 'Língua de Sinais Comum', rare: false, only2024: true },
  { id: 'Draconic', pt: 'Dracônico', rare: false, rare2014: true },
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

// Concessões da progressão (escolhas de classe e subclasses): perícias, expertise,
// idiomas, salvaguardas, ferramentas, armas e armaduras. Em cache por ficha.
const grantsCache = new WeakMap();
function classGrants(char) {
  if (!char || typeof char !== 'object') return {};
  if (!grantsCache.has(char)) {
    const g = { ...(char.className ? computeProgression(char).grants || {} : {}) };
    // Talentos (fixos e sub-escolhas): perícias, expertise, idiomas, ferramentas, salvaguardas.
    const f = featGrants(char, SRD.SKILLS.map(k => k.id));
    for (const k of ['skills', 'expertise', 'languages', 'tools', 'saves']) if (f[k].length) g[k] = [...(g[k] || []), ...f[k]];
    // Espécie: perícias escolhidas (Humano Habilidoso, Sentidos Aguçados…) e fixas.
    const s = Species.speciesGrants(char);
    if (s.skills.length) g.skills = [...(g.skills || []), ...s.skills];
    grantsCache.set(char, g);
  }
  return grantsCache.get(char);
}

const is2024 = (char) => char?.rulesVersion === '2024';

// Catálogo de idiomas da regra da ficha: [{ id, pt, rare, secret? }].
// 2024: Padrão (rare false) × Raros. 2014: Padrão × Exóticos (rare = exótico).
function languageCatalog(char) {
  if (is2024(char)) return LANGUAGES;
  return LANGUAGES.filter(l => !l.only2024).map(l => ('rare2014' in l ? { ...l, rare: l.rare2014 } : l));
}

// O id é raro (2024) / exótico (2014)? Ids fora do catálogo (fichas antigas) contam como comuns.
function isRareLanguage(char, id) {
  return !!languageCatalog(char).find(l => l.id === id)?.rare;
}

// Idiomas fixos (espécie + classe + talentos), sem os marcadores "+N of choice".
// 2024: a espécie não concede idiomas (SRD 5.2.1, "Choose Languages": Comum + 2
// da tabela Padrão), nem mesmo as raças legadas; sobra Comum + classe/talento.
function fixedLanguages(char) {
  const race = is2024(char) ? null : racesFor(char).find(r => r.id === char.race);
  const fromRace = (race?.languages || []).filter(l => !CHOICE_RE.test(l));
  return [...new Set([...(fromRace.length ? fromRace : ['Common']), ...(CLASS_LANGUAGES[char.className] || []), ...(classGrants(char).languages || [])])];
}

// Ladino 2024 (Gíria de Ladrão, SRD 5.2.1): +1 idioma de qualquer tabela. Fichas
// que já escolheram esse idioma pela opção de classe (pool 'language' em
// data/class-options/rogue.js) não ganham a vaga de novo — o idioma já está em fixos.
function rogueExtraLanguage(char) {
  if (!is2024(char)) return 0;
  if (char.className !== 'rogue' && !MC.hasClass(char, 'rogue')) return 0;
  const picked = (Array.isArray(char.classOptions) ? char.classOptions : []).filter(p => p?.classId === 'rogue' && p.pool === 'language').length;
  return Math.max(0, 1 - picked);
}

// De onde vêm os idiomas à escolha:
//   [{ source: 'race'|'background'|'origin'|'class', n, rare: bool }]
// `rare: true` = a vaga aceita idioma raro (2024) — só o idioma extra do Ladino.
// Em 2014 os exóticos ficam liberados com aval do mestre (PHB cap. 4), sem limite.
function languageChoiceSources(char) {
  // Regras de 2024: todo personagem sabe Comum + 2 idiomas da tabela Padrão
  // (a origem substitui a espécie; '+N of choice' de raças legadas não soma).
  if (is2024(char)) {
    const cls = rogueExtraLanguage(char);
    return [{ source: 'origin', n: 2, rare: false }, ...(cls ? [{ source: 'class', n: cls, rare: true }] : [])];
  }
  const race = racesFor(char).find(r => r.id === char.race);
  const fromRace = (race?.languages || []).reduce((n, l) => n + (+(CHOICE_RE.exec(l)?.[1]) || 0), 0);
  const bg = SRD.BACKGROUNDS.find(b => b.id === char.background);
  return [
    { source: 'race', n: fromRace, rare: true },
    { source: 'background', n: +(bg?.languages) || 0, rare: true },
  ].filter(x => x.n > 0);
}

// Quantos idiomas o jogador escolhe livremente.
function languageChoiceCount(char) {
  return languageChoiceSources(char).reduce((n, x) => n + x.n, 0);
}

// Quantos dos escolhidos podem ser raros. 2014: sem limite (exóticos com aval do mestre).
function rareLanguageAllowance(char) {
  if (!is2024(char)) return Infinity;
  return languageChoiceSources(char).filter(x => x.rare).reduce((n, x) => n + x.n, 0);
}

// Idiomas escolhidos pelo jogador (char.languages sem fixos e sem marcadores "+N").
function chosenLanguageIds(char) {
  const fixed = fixedLanguages(char);
  return [...new Set((char.languages || []).filter(l => typeof l === 'string' && l && !CHOICE_RE.test(l) && !fixed.includes(l)))];
}

// Escolha que não existe nesta regra (ex.: Língua de Sinais Comum numa ficha 2014).
const invalidLanguage = (char, id) => !is2024(char) && !!LANGUAGES.find(l => l.id === id)?.only2024;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// O que falta/sobra na escolha de idiomas: [{ pt, en }] ([] = tudo certo).
function languageIssues(char) {
  const out = [];
  const chosen = chosenLanguageIds(char);
  const bad = chosen.filter(id => invalidLanguage(char, id));
  for (const id of bad) {
    out.push({
      pt: `${languageLabel(id, 'pt')} só existe nas regras 2024. Desmarque esse idioma.`,
      en: `${id} only exists in the 2024 rules. Unselect that language.`,
    });
  }
  const valid = chosen.filter(id => !bad.includes(id));
  const need = languageChoiceCount(char);
  if (valid.length < need) {
    const n = need - valid.length;
    out.push({
      pt: `Escolha mais ${plural(n, 'idioma', 'idiomas')}.`,
      en: `Pick ${plural(n, 'more language', 'more languages')}.`,
    });
  } else if (valid.length > need) {
    const n = valid.length - need;
    out.push({
      pt: need === 0
        ? `Você não tem idiomas à escolha. Desmarque ${plural(n, 'idioma', 'idiomas')}.`
        : `Você marcou ${plural(n, 'idioma', 'idiomas')} a mais. Desmarque ${n} (o limite é ${need}).`,
      en: need === 0
        ? `You have no languages to choose. Unselect ${plural(n, 'language', 'languages')}.`
        : `You picked ${plural(n, 'language', 'languages')} too many. Unselect ${n} (the limit is ${need}).`,
    });
  }
  const allow = rareLanguageAllowance(char);
  const rares = valid.filter(id => isRareLanguage(char, id));
  if (rares.length > allow) {
    const names = (l) => rares.map(id => languageLabel(id, l)).join(', ');
    out.push(allow === 0
      ? {
        pt: `Idiomas raros (${names('pt')}) não entram nos 2 idiomas da origem. Troque por um idioma da lista Padrão.`,
        en: `Rare languages (${names('en')}) can't be your 2 origin languages. Swap them for Standard languages.`,
      }
      : {
        pt: `Só ${plural(allow, 'idioma raro é permitido', 'idiomas raros são permitidos')} (${names('pt')} marcados). Troque o excesso por um idioma da lista Padrão.`,
        en: `Only ${plural(allow, 'rare language is', 'rare languages are')} allowed (${names('en')} picked). Swap the extra for Standard languages.`,
      });
  }
  return out;
}

// Corta escolhas inválidas ou a mais (ex.: depois de trocar antecedente/classe/espécie).
// Devolve a NOVA lista de idiomas escolhidos (sem os fixos e sem marcadores); uso:
// set({ languages: Utils.trimLanguages(char) }). Mantém a ordem: os primeiros ficam.
function trimLanguages(char) {
  const valid = chosenLanguageIds(char).filter(id => !invalidLanguage(char, id));
  let allow = rareLanguageAllowance(char);
  const kept = valid.filter(id => !isRareLanguage(char, id) || allow-- > 0);
  return kept.slice(0, languageChoiceCount(char));
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
  const g = classGrants(char);
  return (char.skillProfs || []).includes(skillId) || backgroundSkills(char).includes(skillId)
    || (g.skills || []).includes(skillId) || (g.expertise || []).includes(skillId);
}

// Expertise marcada na ficha ou concedida por escolha de classe (implica proficiência).
function hasExpertise(char, skillId) {
  return (char.skillExpertise || []).includes(skillId) || (classGrants(char).expertise || []).includes(skillId);
}

function hasSaveProf(char, ability) {
  return (char.saveProfs || []).includes(ability) || (classGrants(char).saves || []).includes(ability);
}

// Ordem Divina: Taumaturgo (Clérigo 2024) e Ordem Primal: Mago (Druida 2024), SRD 5.2.1:
// somam o modificador de Sabedoria (mínimo +1) aos testes de Inteligência
// (Arcanismo ou Religião / Arcanismo ou Natureza).
const WIS_TO_INT_SKILLS = [
  { classId: 'cleric', pool: 'divineOrder', id: 'thaumaturge', skills: ['arcana', 'religion'] },
  { classId: 'druid', pool: 'primalOrder', id: 'magician', skills: ['arcana', 'nature'] },
];
function wisdomSkillBonus(char, skillId) {
  if (!is2024(char)) return 0;
  const picks = Array.isArray(char.classOptions) ? char.classOptions : [];
  const hit = WIS_TO_INT_SKILLS.some(r => r.skills.includes(skillId) && MC.hasClass(char, r.classId)
    && picks.some(p => p && p.pool === r.pool && p.id === r.id && (!p.classId || p.classId === r.classId)));
  return hit ? Math.max(1, abilityMod(char, 'wis')) : 0;
}

function skillBonus(char, skillId) {
  const skill = SRD.SKILLS.find(s => s.id === skillId);
  if (!skill) return 0;
  const m = abilityMod(char, skill.stat) + wisdomSkillBonus(char, skillId);
  const isProf = hasSkillProf(char, skillId);
  const isExpert = hasExpertise(char, skillId);
  if (isExpert) return m + profBonus(char) * 2;
  if (isProf) return m + profBonus(char);
  return m;
}

// === Ataques ===
const DAMAGE_LABEL = {
  acid: ['ácido', 'acid'], bludgeoning: ['concussão', 'bludgeoning'], cold: ['frio', 'cold'], fire: ['fogo', 'fire'],
  force: ['energia', 'force'], lightning: ['elétrico', 'lightning'], necrotic: ['necrótico', 'necrotic'],
  piercing: ['perfurante', 'piercing'], poison: ['veneno', 'poison'], psychic: ['psíquico', 'psychic'],
  radiant: ['radiante', 'radiant'], slashing: ['cortante', 'slashing'], thunder: ['trovejante', 'thunder'],
};
/** Tipo de dano no idioma da tela (aceita o id em inglês; texto livre passa como está). */
function damageLabel(type, lang) {
  const key = String(type || '').trim().toLowerCase();
  const row = DAMAGE_LABEL[key] || Object.values(DAMAGE_LABEL).find(r => r.includes(key));
  return row ? row[lang === 'pt' ? 0 : 1] : (type || '');
}

/** Deslocamento em pés → texto da tela: '9 m' (pt) ou '30 ft'. */
function speedLabel(feet, lang) {
  if (lang !== 'pt') return `${feet} ft`;
  return `${(feet * 0.3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m`;
}

const dieSides = (dice) => { const m = /^(\d+)d(\d+)$/.exec(String(dice || '').trim()); return m ? { count: +m[1], sides: +m[2] } : null; };

// Artes Marciais do Monge. 2024 (SRD 5.2.1): d6 no 1º, d8 no 5º, d10 no 11º, d12 no 17º.
// 2014 (SRD 5.1): d4, d6, d8, d10 nos mesmos níveis.
function martialArtsDie(char) {
  if (!MC.hasClass(char, 'monk')) return null;
  const lv = MC.classLevel(char, 'monk') || (char.className === 'monk' ? char.level || 1 : 0);
  if (!lv) return null;
  const steps = is2024(char) ? [6, 8, 10, 12] : [4, 6, 8, 10];
  return `1d${steps[lv >= 17 ? 3 : lv >= 11 ? 2 : lv >= 5 ? 1 : 0]}`;
}

// Artes Marciais só valem sem armadura e sem escudo.
const martialArtsActive = (char) => !!martialArtsDie(char) && !char.armor && !char.hasShield;

/** Arma de Monge: 2024 = simples corpo a corpo e marciais corpo a corpo Leves; 2014 = espada curta e simples corpo a corpo sem Duas Mãos/Pesada. */
function isMonkWeapon(char, def) {
  if (!def) return false;
  const props = def.props || [];
  if (is2024(char)) return def.type === 'simple-melee' || (def.type === 'martial-melee' && props.includes('light'));
  return def.id === 'shortsword' || (def.type === 'simple-melee' && !props.includes('two-handed') && !props.includes('heavy'));
}

const withMod = (dice, mod) => (dice ? `${dice}${mod ? fmtMod(mod) : ''}` : String(Math.max(0, mod)));

/**
 * Ataque com uma arma da ficha (char.weapons[i]) pela regra da ficha:
 * { bonus, damage, dice, dmgMod, dmgType, ability, proficient, monk, fs }.
 * `damage` é o texto ('1d6+2'); `dice` + `dmgMod` servem para rolar.
 */
function attackFor(char, weapon) {
  const w = weapon || {};
  const def = w.id ? SRD.weaponFor(w.id, char.rulesVersion) : null;
  const props = def?.props || w.props || [];
  const ranged = (def?.type || '').includes('ranged');
  const str = abilityMod(char, 'str');
  const dex = abilityMod(char, 'dex');
  const monk = !!def && martialArtsActive(char) && isMonkWeapon(char, def);
  const useDex = ranged || ((props.includes('finesse') || monk) && dex > str);
  const ability = useDex ? 'dex' : 'str';
  const abMod = useDex ? dex : str;
  const proficient = !def || isWeaponProficient(char, def.id);
  const fs = FS.weaponStyleBonuses(char, w);
  let dice = w.damage || w.dmg || def?.damage || '';
  if (monk) {
    const ma = martialArtsDie(char);
    const a = dieSides(dice); const b = dieSides(ma);
    if (!a || (b && a.count === 1 && b.sides > a.sides)) dice = ma;
  }
  // Arma personalizada (sem id): vale o bônus anotado na ficha.
  const bonus = def ? abMod + (proficient ? profBonus(char) : 0) + (fs.attack || 0) : (Number(w.bonus) || 0);
  const dmgMod = def ? abMod + (fs.damage || 0) : 0;
  return { bonus, damage: withMod(dice, dmgMod), dice, dmgMod, dmgType: w.dmgType || def?.dmgType || '', ability, proficient, monk, fs };
}

/**
 * Golpe Desarmado (todo mundo é proficiente): 1 + FOR de concussão. Monge com
 * Artes Marciais usa o dado marcial e DES ou FOR; o Estilo de Luta Desarmado
 * troca o 1 pelo dado do estilo. { name, bonus, damage, dice, dmgMod, dmgType, ability, proficient, monk, style }.
 */
function unarmedStrike(char) {
  const str = abilityMod(char, 'str');
  const dex = abilityMod(char, 'dex');
  const monk = martialArtsActive(char);
  const style = FS.unarmedStrike(char);
  const useDex = monk && dex > str;
  const abMod = useDex ? dex : str;
  let dice = '';
  if (style) dice = style.die;
  if (monk) {
    const ma = martialArtsDie(char);
    if (!dice || dieSides(ma).sides > (dieSides(dice)?.sides || 0)) dice = ma;
  }
  // Sem dado: dano fixo de 1 + modificador.
  const dmgMod = dice ? abMod : 1 + abMod;
  return {
    name: { pt: 'Golpe Desarmado', en: 'Unarmed Strike' },
    bonus: abMod + profBonus(char),
    damage: dice ? withMod(dice, abMod) : String(Math.max(1, dmgMod)),
    dice, dmgMod: dice ? abMod : Math.max(1, dmgMod),
    dmgType: 'bludgeoning', ability: useDex ? 'dex' : 'str', proficient: true, monk, style,
  };
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
  ac += FS.acBonusTotal(char); // Estilo de Luta: Defesa (+1 usando armadura)
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
  if (char.originFeat === 'Tough' || (char.feats || []).some(f => f?.id === 'tough' || f?.id === 'tough2014')) hp += 2 * (char.level || 1);
  const sorc = MC.classEntries(char).find(e => e.id === 'sorcerer' && e.subclass === 'draconic');
  if (sorc && (char.rulesVersion !== '2024' || sorc.level >= 3)) hp += sorc.level;
  return hp;
}

function speed(char) {
  if (char.speedOverride) return char.speedOverride;
  const race = racesFor(char).find(r => r.id === char.race);
  const fromSpecies = Species.speciesGrants(char).speed; // Elfo da Floresta: 35
  const base = fromSpecies || (race ? race.speed : 30);
  // Armadura pesada sem a Força mínima: −10 pés (anão 2014 ignora).
  const armor = char.armor && SRD.ARMOR.find(a => a.id === char.armor);
  const dwarf2014 = char.rulesVersion !== '2024' && String(char.race || '').startsWith('dwarf');
  if (armor?.strReq && abilityWithRace(char, 'str') < armor.strReq && !dwarf2014) return Math.max(0, base - 10);
  return base;
}

// Iniciativa: DES + Alerta (2024: + Bônus de Proficiência; 2014: +5).
function initiative(char) {
  const dex = abilityMod(char, 'dex');
  const alert = (char.feats || []).some(f => f?.id === 'alert' || f?.id === 'alert2014' || /^(alert|alerta)$/i.test(String(f?.name || '').trim()));
  if (!alert) return dex;
  return dex + (char.rulesVersion === '2024' ? profBonus(char) : 5);
}

// Tamanho efetivo: escolha da espécie (Humano/Tiferino/Aasimar…) ou o da espécie.
function sizeOf(char) {
  const race = racesFor(char).find(r => r.id === char.race);
  return Species.speciesGrants(char).size || race?.size || 'Medium';
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

// Listas de magia de onde a classe (vista isoladamente) escolhe. Alma Divina
// (Magia Divina): feiticeiro + clérigo, em 2014 e 2024.
function spellListClasses(char) {
  const sub = (char.subclass || '').toLowerCase();
  const main = spellListClass(char);
  return char.className === 'sorcerer' && sub === 'divine' ? [main, 'cleric'] : [main];
}

// A magia está numa das listas da classe?
function inSpellList(char, spell) {
  return spellListClasses(char).some(c => (spell?.classes || []).includes(c));
}

// === Prepared-caster logic ===
// 2014: só Clérigo, Druida, Paladino, Mago e Artífice preparam; os demais "conhecem".
// 2024 (SRD 5.2.1): toda classe conjuradora tem a coluna Prepared Spells — Bardo,
// Feiticeiro, Bruxo e Patrulheiro também preparam (Cavaleiro Místico e Trapaceiro
// Arcano seguem com magias conhecidas nos dados de progressão).
const PREPARED_CASTERS = ['cleric', 'druid', 'paladin', 'wizard', 'artificer'];
const PREPARED_CASTERS_2024 = [...PREPARED_CASTERS, 'bard', 'sorcerer', 'warlock', 'ranger'];

function isPreparedCaster(char) {
  return (char?.rulesVersion === '2024' ? PREPARED_CASTERS_2024 : PREPARED_CASTERS).includes(char?.className);
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

// === Tempo/alcance/duração em pt (magias sem metaPt) ===
const UNIT_PT = [
  [/\bbonus actions?\b/gi, 'ação bônus'], [/\bactions?\b/gi, 'ação'], [/\breactions?\b/gi, 'reação'],
  [/\b(\d+) minutes?\b|\b(\d+) min\b/gi, (m, a, b) => `${a || b} ${+(a || b) === 1 ? 'minuto' : 'minutos'}`],
  [/\b(\d+) hours?\b|\b(\d+)h\b/gi, (m, a, b) => `${a || b} ${+(a || b) === 1 ? 'hora' : 'horas'}`],
  [/\b(\d+) rounds?\b/gi, (m, a) => `${a} ${+a === 1 ? 'rodada' : 'rodadas'}`],
  [/\b(\d+) days?\b/gi, (m, a) => `${a} ${+a === 1 ? 'dia' : 'dias'}`],
  [/\bor Ritual\b/g, 'ou Ritual'], [/\bRitual\b/g, 'Ritual'], [/\bor\b/g, 'ou'],
];
const ftToM = (n) => (Math.round(+String(n).replace(/,/g, '') * 0.3 * 10) / 10).toLocaleString('pt-BR');
const SHAPE_PT = { cone: 'cone', cube: 'cubo', line: 'linha', radius: 'raio', emanation: 'emanação', sphere: 'esfera', cylinder: 'cilindro' };
function metaPt(text, kind) {
  if (!text || typeof text !== 'string') return text;
  let s = text.trim();
  if (kind === 'time') {
    // "Reaction, which you take when…": o gatilho fica na descrição da magia.
    const trigger = /,\s*which you take/i.test(s);
    s = s.replace(/,\s*which you take.*$/i, '');
    s = s.replace(/^Action\b/, '1 ação').replace(/^Bonus Action\b/, '1 ação bônus').replace(/^Reaction\b/, '1 reação');
    for (const [re, to] of UNIT_PT) s = s.replace(re, to);
    return trigger ? `${s} (gatilho na descrição)` : s;
  }
  if (kind === 'range') {
    s = s.replace(/\b(\d[\d,]*)[- ](?:ft|feet|foot)\b\.?/gi, (m, n) => `${ftToM(n)} m`)
      .replace(/\b(\d+)[- ]miles?\b/gi, (m, n) => `${(Math.round(n * 1.5 * 10) / 10).toLocaleString('pt-BR')} km`)
      .replace(/\b(cone|cube|line|radius|emanation|sphere|cylinder)\b/gi, (m) => SHAPE_PT[m.toLowerCase()])
      .replace(/^Self\b/, 'Pessoal').replace(/^Touch\b/, 'Toque').replace(/^Sight\b/, 'Visão')
      .replace(/^Unlimited\b/, 'Ilimitado').replace(/^Special\b/, 'Especial');
    // "Pessoal (9 m cone)" → "Pessoal (cone de 9 m)"
    return s.replace(/\((\S+ (?:m|km)) (cone|cubo|linha|raio|emanação|esfera|cilindro)\)/, '($2 de $1)');
  }
  if (kind === 'duration') {
    s = s.replace(/^Instantaneous or (.*)\(see below\)$/i, 'Instantânea ou $1(veja a descrição)')
      .replace(/^(Instantaneous|Instant|Inst\.)$/i, 'Instantânea')
      .replace(/^Concentration, up to /i, 'Concentração, até ').replace(/^Conc\. /i, 'Concentração, até ')
      .replace(/^(.*), conc$/i, 'Concentração, até $1')
      .replace(/^Until dispelled$/i, 'Até ser dissipada').replace(/^Until triggered$/i, 'Até ser ativada')
      .replace(/^Up to /i, 'Até ').replace(/^Permanent$/i, 'Permanente').replace(/^Special$/i, 'Especial');
    for (const [re, to] of UNIT_PT) s = s.replace(re, to);
    return s;
  }
  return s;
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
  // Tempo/alcance/componentes/duração no idioma da tela (texto em pt das magias do SRD 5.2.1).
  // Sem metaPt (magias fora do SRD 5.2.1 em pt): tradução das expressões comuns.
  spellMeta: (sp, lang) => (lang === 'pt' && sp?.metaPt)
    || (lang === 'pt' ? { castingTime: metaPt(sp?.castingTime, 'time'), range: metaPt(sp?.range, 'range'), components: sp?.components, duration: metaPt(sp?.duration, 'duration') } : null)
    || { castingTime: sp?.castingTime, range: sp?.range, components: sp?.components, duration: sp?.duration },
  metaPt,
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
  // Modo de progressão: a campanha manda (Marcos ou XP); fora dela vale o da ficha.
  levelingMode: char => char.campaignLeveling || char.levelingMode || 'xp',
  knownSpellLimit: char => { const p = computeProgression(char); return char.rulesVersion === '2024' ? p.spellsPrepared || p.spellsKnown : p.spellsKnown; },
  uid, mod, fmtMod,
  loadAll, saveAll, loadChar, saveChar, deleteChar,
  makeNew,
  abilityWithRace, abilityMod, profBonus, saveBonus, skillBonus, wisdomSkillBonus, passivePerception,
  attackFor, unarmedStrike, martialArtsDie, isMonkWeapon, damageLabel, speedLabel,
  computeAc, maxHpDefault, speed, initiative, sizeOf,
  speciesGrants: Species.speciesGrants, speciesChoiceIssues: Species.speciesChoiceIssues,
  spellcastingAbility, spellSaveDc, spellAttackBonus, spellSlots, spellListClass, spellListClasses, inSpellList,
  isPreparedCaster, cantripsKnown, preparedSpellsLimit, maxSpellLevel,
  applyRaceBonus,
  LANGUAGES, CLASS_LANGUAGES, languageLabel, fixedLanguages, languageChoiceCount, languageChoiceSources, languagesFor,
  languageCatalog, isRareLanguage, rareLanguageAllowance, chosenLanguageIds, languageIssues, trimLanguages,
  backgroundSkills, hasSkillProf, hasExpertise, hasSaveProf, classGrants,
  encodeChar, decodeChar,
  rollDie, rollDice,
};
})();

export default Utils;
