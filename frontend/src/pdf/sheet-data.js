/**
 * Ponte entre a ficha da Forja e a ficha preenchível oficial de D&D 5e.
 *
 * - buildSheetData(char, lang): valores por nome de campo da ficha oficial,
 *   páginas de magia (quantas forem precisas) e seções de texto longo.
 * - sheetValuesToChar(values): o caminho inverso, a partir dos campos lidos de
 *   um PDF (nossa exportação, a ficha oficial preenchida, D&D Beyond etc.).
 *
 * Funções puras: o desenho e a leitura do PDF ficam em export-pdf.js e import-pdf.js.
 */
import SRD from '../../data/srd.js';
import Utils from '../../utils.js';
import { subclassesFor, subclassName } from '../progression/subclasses.js';
import { tName } from '../../data/i18n.js';
import LAYOUT from './dnd5e-layout.js';
import { trainingLines, backgroundFeature, featName, featDesc, featPicksText, classFeatureList } from '../sheet/sheet-text.js';

export { LAYOUT };

const SKILL_FIELDS = {
  acrobatics: 'Acrobatics', animalHandling: 'Animal', arcana: 'Arcana', athletics: 'Athletics',
  deception: 'Deception ', history: 'History ', insight: 'Insight', intimidation: 'Intimidation',
  investigation: 'Investigation ', medicine: 'Medicine', nature: 'Nature', perception: 'Perception ',
  performance: 'Performance', persuasion: 'Persuasion', religion: 'Religion',
  sleightOfHand: 'SleightofHand', stealth: 'Stealth ', survival: 'Survival',
};
const ABILITY_FIELDS = {
  str: ['STR', 'STRmod', 'ST Strength'], dex: ['DEX', 'DEXmod ', 'ST Dexterity'],
  con: ['CON', 'CONmod', 'ST Constitution'], int: ['INT', 'INTmod', 'ST Intelligence'],
  wis: ['WIS', 'WISmod', 'ST Wisdom'], cha: ['CHA', 'CHamod', 'ST Charisma'],
};
const WEAPON_FIELDS = [
  ['Wpn Name', 'Wpn1 AtkBonus', 'Wpn1 Damage'],
  ['Wpn Name 2', 'Wpn2 AtkBonus ', 'Wpn2 Damage '],
  ['Wpn Name 3', 'Wpn3 AtkBonus  ', 'Wpn3 Damage '],
];
const ALIGNMENT_NAMES = {
  LG: ['lawful good', 'leal e bom', 'leal bom', 'ordeiro e bom'], NG: ['neutral good', 'neutro e bom', 'neutro bom'],
  CG: ['chaotic good', 'caotico e bom', 'caotico bom'], LN: ['lawful neutral', 'leal e neutro', 'leal neutro'],
  N: ['neutral', 'neutro', 'true neutral', 'neutro verdadeiro'], CN: ['chaotic neutral', 'caotico e neutro', 'caotico neutro'],
  LE: ['lawful evil', 'leal e mau', 'leal mau'], NE: ['neutral evil', 'neutro e mau', 'neutro mau'],
  CE: ['chaotic evil', 'caotico e mau', 'caotico mau'],
};
const ALIGNMENT_LABEL = {
  en: { LG: 'Lawful Good', NG: 'Neutral Good', CG: 'Chaotic Good', LN: 'Lawful Neutral', N: 'Neutral', CN: 'Chaotic Neutral', LE: 'Lawful Evil', NE: 'Neutral Evil', CE: 'Chaotic Evil' },
  pt: { LG: 'Leal e Bom', NG: 'Neutro e Bom', CG: 'Caótico e Bom', LN: 'Leal e Neutro', N: 'Neutro', CN: 'Caótico e Neutro', LE: 'Leal e Mau', NE: 'Neutro e Mau', CE: 'Caótico e Mau' },
};

const ABILITY_ABBR = {
  pt: { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' },
  en: { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' },
};

/** Capacidade de cada nível na página de magias (0 = truques). */
export const SPELL_CAPACITY = Object.fromEntries(Object.entries(LAYOUT.spells).map(([lvl, rows]) => [lvl, rows.length]));

/** Nome do campo numa página de magias extra: a 1ª usa o nome oficial, as demais ganham sufixo. */
export const pageField = (name, pageIndex) => (pageIndex === 0 ? name : `${name.trim()} #${pageIndex + 1}`);

const fmt = n => Utils.fmtMod(n);
const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

// Ataque pela regra da ficha (Utils.attackFor: proficiência, Artes Marciais do Monge, Estilos de Luta).
function weaponRow(char, w, lang) {
  const a = Utils.attackFor(char, w);
  const typeLabel = a.dmgType ? Utils.damageLabel(a.dmgType, lang) : '';
  const dmg = [a.dice ? a.damage : (w.dmg || w.damage || ''), typeLabel].filter(Boolean).join(' ');
  const name = w.name || (w.id ? tName('weapon', w.id, lang) : '');
  return { name, atk: fmt(a.bonus), dmg, note: w.note || '' };
}

function unarmedRow(char, lang) {
  const u = Utils.unarmedStrike(char);
  return { name: u.name[lang === 'pt' ? 'pt' : 'en'], atk: fmt(u.bonus), dmg: `${u.damage} ${Utils.damageLabel(u.dmgType, lang)}`, note: '' };
}

function featureLines(char, lang) {
  const out = classFeatureList(char, lang);
  const bgf = backgroundFeature(char, lang);
  if (bgf) out.push({ title: `${bgf.name} (${L(lang, 'antecedente', 'background')})`, text: bgf.desc });
  return out;
}

/** Talentos: nome no idioma da tela, descrição e as escolhas feitas (lista, atributo, truques, magia). */
function featLines(char, lang) {
  const out = [];
  for (const f of char.feats || []) {
    const name = featName(char, f, lang);
    if (!name) continue;
    // A lista de magias já vai no nome ("Iniciado em Magia (Clérigo)").
    const picks = typeof f === 'object' && f.picks ? featPicksText({ ...f.picks, spellList: undefined }, lang) : '';
    out.push({ title: `${L(lang, 'Talento', 'Feat')}: ${name}`, text: [featDesc(char, f, lang), picks].filter(Boolean).join('\n'), picks });
  }
  return out;
}

/**
 * Traços da espécie: as escolhas (com o valor escolhido) e os traços que não
 * viraram escolha. `short` = linha da página 2 ("Tamanho: Médio").
 */
function speciesLines(char, lang, speciesSummary) {
  const race = Utils.races(char).find(r => r.id === char.race);
  const out = (speciesSummary ? speciesSummary(char, lang) : []).map(([k, v]) => ({ title: k, text: String(v), short: `${k}: ${v}` }));
  const head = (s) => String(s).split(':')[0].trim().toLowerCase();
  const chosen = new Set(out.map(x => head(x.title)));
  for (const tr of race?.traits || []) {
    const name = tr.name?.[lang] || tr.name?.pt || '';
    // O traço que virou escolha já aparece com o valor (evita "Habilidoso" duas vezes).
    if (chosen.has(head(name))) {
      const row = out.find(x => head(x.title) === head(name));
      if (row && tr.desc?.[lang]) row.text = `${row.text}\n${tr.desc[lang]}`;
      continue;
    }
    out.push({ title: name, text: tr.desc?.[lang] || '', short: name });
  }
  for (const f of featLines(char, lang)) out.push({ ...f, short: f.picks ? `${f.title} (${f.picks})` : f.title });
  return out;
}

function spellPages(char, lang) {
  const catalog = Utils.spellCatalog(char);
  const views = Utils.casterViews(char);
  const byClass = new Map(views.map(v => [v.className, []]));
  for (const s of char.spells || []) {
    const def = catalog.find(d => d.id === s.id);
    if (!def) continue;
    const cls = byClass.has(s.cls) ? s.cls : byClass.has(char.className) ? char.className : views[0]?.className;
    if (!cls) continue;
    byClass.get(cls).push({
      level: def.level,
      name: tName('spellName', def.id, lang) + (def.ritual ? ' (R)' : '') + (def.concentration ? ' (C)' : ''),
      prepared: def.level > 0 && (s.prepared || s.auto),
    });
  }
  const slots = Utils.spellSlots(char) || [];
  const pages = [];
  views.forEach((v, classIndex) => {
    const list = byClass.get(v.className) || [];
    const ab = Utils.spellcastingAbilityOfClass(v);
    const header = {
      className: Utils.classLabel({ ...char, className: v.className, level: v.level, multiclass: [] }, lang, tName),
      ability: ab ? ABILITY_ABBR[lang === 'pt' ? 'pt' : 'en'][ab] : '',
      dc: ab ? String(8 + Utils.profBonus(char) + Utils.abilityMod(char, ab)) : '',
      atk: ab ? fmt(Utils.profBonus(char) + Utils.abilityMod(char, ab)) : '',
    };
    const queues = {};
    for (let lvl = 0; lvl <= 9; lvl++) queues[lvl] = list.filter(s => s.level === lvl).sort((a, b) => a.name.localeCompare(b.name));
    let first = true;
    while (first || Object.values(queues).some(q => q.length)) {
      const levels = {};
      for (let lvl = 0; lvl <= 9; lvl++) levels[lvl] = queues[lvl].splice(0, SPELL_CAPACITY[lvl]);
      // Espaços são do personagem, não da classe: só na primeira página de magias.
      const pageSlots = classIndex === 0 && first ? Object.fromEntries(slots.map((n, i) => [i + 1, n || 0])) : {};
      pages.push({ header, slots: pageSlots, levels, continued: !first });
      first = false;
    }
  });
  return pages;
}

/** `speciesSummary` (de SpeciesChoices.jsx) é injetado para este módulo rodar no Node dos testes. */
export function buildSheetData(char, lang = 'pt', { speciesSummary } = {}) {
  const f = {};
  const race = Utils.races(char).find(r => r.id === char.race);
  const bg = Utils.backgrounds(char).find(b => b.id === char.background);
  const prof = Utils.profBonus(char);

  const classLevel = char.className ? Utils.classLabel(char, lang, tName) : '';
  const subclasses = Utils.classEntries(char).filter(e => e.subclass).map(e => subclassName(char, e.id, e.subclass, lang));
  f.ClassLevel = subclasses.length ? `${classLevel} (${subclasses.join(', ')})` : classLevel;
  f.Background = bg ? tName('background', bg.id, lang) : '';
  f.PlayerName = char.player || '';
  f.CharacterName = f['CharacterName 2'] = char.name || '';
  f['Race '] = race ? tName('race', race.id, lang) : '';
  f.Alignment = char.alignment ? (ALIGNMENT_LABEL[lang]?.[char.alignment] || char.alignment) : '';
  f.XP = Utils.levelingMode(char) === 'milestone' ? L(lang, 'Marcos', 'Milestones') : String(char.xp || 0);
  f.Inspiration = char.inspiration ? '★' : '';
  f.ProfBonus = fmt(prof);
  f.AC = String(Utils.computeAc(char));
  f.Initiative = fmt(Utils.initiative(char));
  const speed = Utils.speed(char);
  f.Speed = lang === 'pt' ? `${(speed * 0.3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m` : `${speed} ft`;
  f.HPMax = String(char.maxHp || '');
  f.HPCurrent = String(char.currentHp ?? '');
  f.HPTemp = char.tempHp ? String(char.tempHp) : '';
  f.HDTotal = Utils.hitDiceLabel(char);
  const hdLeft = (char.level || 1) - (char.hitDiceUsed || 0);
  f.HD = char.hitDiceUsed ? `${hdLeft}/${char.level || 1}` : '';

  const checks = {};
  SRD.ABILITIES.forEach((a, i) => {
    const [score, mod, save] = ABILITY_FIELDS[a];
    f[score] = String(Utils.abilityWithRace(char, a));
    f[mod] = fmt(Utils.abilityMod(char, a));
    f[save] = fmt(Utils.saveBonus(char, a));
    checks[LAYOUT.saveChecks[i]] = Utils.hasSaveProf(char, a);
  });
  SRD.SKILLS.forEach((s, i) => {
    f[SKILL_FIELDS[s.id]] = fmt(Utils.skillBonus(char, s.id));
    checks[LAYOUT.skillChecks[i]] = Utils.hasSkillProf(char, s.id) || Utils.hasExpertise(char, s.id);
  });
  const ds = char.deathSaves || {};
  LAYOUT.deathSuccess.forEach((n, i) => { checks[n] = i < (ds.success || 0); });
  LAYOUT.deathFail.forEach((n, i) => { checks[n] = i < (ds.fail || 0); });
  f.Passive = String(Utils.passivePerception(char));

  const weapons = [...(char.weapons || []).map(w => weaponRow(char, w, lang)), unarmedRow(char, lang)];
  weapons.slice(0, 3).forEach((w, i) => {
    const [n, a, d] = WEAPON_FIELDS[i];
    f[n] = w.name; f[a] = w.atk; f[d] = w.dmg;
  });
  const attackLines = weapons.slice(3).map(w => `${w.name}: ${w.atk}, ${w.dmg}`);
  weapons.slice(0, 3).filter(w => w.note).forEach(w => attackLines.push(`${w.name}: ${w.note}`));
  const casters = Utils.casterViews(char);
  if (casters.length) {
    const dc = Utils.spellSaveDc(char);
    const atk = Utils.spellAttackBonus(char);
    attackLines.push(`${L(lang, 'Magias', 'Spells')}: ${L(lang, 'CD', 'DC')} ${dc ?? '—'}, ${L(lang, 'ataque', 'attack')} ${atk !== null ? fmt(atk) : '—'}`);
  }
  f.AttacksSpellcasting = attackLines.join('\n');

  const langs = Utils.languagesFor(char).map(l => Utils.languageLabel(l, lang));
  const profLines = [];
  if (langs.length) profLines.push(`${L(lang, 'Idiomas', 'Languages')}: ${langs.join(', ')}`);
  for (const t of trainingLines(char, lang)) profLines.push(`${t.label}: ${t.text}`);
  if (char.otherProfs) profLines.push(`${L(lang, 'Outras', 'Other')}: ${char.otherProfs}`);
  f.ProficienciesLang = profLines.join('\n');

  ['cp', 'sp', 'ep', 'gp', 'pp'].forEach(c => { f[c.toUpperCase()] = char.coins?.[c] ? String(char.coins[c]) : ''; });
  const equip = [];
  if (char.armor) equip.push(`${tName('armor', typeof char.armor === 'object' ? char.armor.id : char.armor, lang)}${L(lang, ' (vestida)', ' (worn)')}`);
  if (char.hasShield) equip.push(L(lang, 'Escudo', 'Shield'));
  for (const e of char.equipment || []) {
    const name = e.name || e.id || '';
    if (name) equip.push(`${e.qty > 1 ? `${e.qty}× ` : ''}${name}`);
  }
  f.Equipment = equip.join('\n');

  f['PersonalityTraits '] = char.personality || '';
  f.Ideals = char.ideals || '';
  f.Bonds = char.bonds || '';
  f.Flaws = char.flaws || '';
  f.Age = char.age || ''; f.Height = char.height || ''; f.Weight = char.weight || '';
  f.Eyes = char.eyes || ''; f.Skin = char.skin || ''; f.Hair = char.hair || '';
  f.Allies = char.allies || '';
  f.Backstory = [char.appearance, char.backstory].filter(Boolean).join('\n\n');
  f.Treasure = char.treasure || '';

  const features = featureLines(char, lang);
  const traits = speciesLines(char, lang, speciesSummary);
  // Na ficha só cabem os nomes; o texto completo vai para as páginas de continuação.
  f['Features and Traits'] = features.map(x => `• ${x.title}`).join('\n');
  f['Feat+Traits'] = traits.map(x => `• ${x.short || x.title}`).join('\n');

  const sections = [];
  if (features.length) sections.push({ title: L(lang, 'Características de classe', 'Class features'), items: features });
  if (traits.length) sections.push({ title: L(lang, 'Traços de espécie e talentos', 'Species traits & feats'), items: traits });
  if (char.notes) sections.push({ title: L(lang, 'Anotações', 'Notes'), items: [{ title: '', text: char.notes }] });

  return { fields: f, checks, spellPages: spellPages(char, lang), sections };
}

/** Ficha em branco: todos os campos vazios e uma página de magias limpa, para preencher no leitor de PDF. */
export function blankSheetData() {
  const fields = Object.fromEntries(LAYOUT.fields.filter(f => f.type !== 'check' && f.type !== 'image').map(f => [f.name, '']));
  const header = { className: '', ability: '', dc: '', atk: '' };
  return { fields, checks: {}, spellPages: [{ header, slots: {}, levels: {}, continued: false }], sections: [] };
}

// ---------------------------------------------------------------------------
// Importação
// ---------------------------------------------------------------------------

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const num = s => { const m = String(s || '').replace(/[^\d+-]/g, '').match(/[+-]?\d+/); return m ? parseInt(m[0], 10) : null; };
const truthy = v => v === true || (typeof v === 'string' && v.trim() !== '' && !/^(off|no|false|0)$/i.test(v.trim()));

function matchByName(list, text, names, { exact = false } = {}) {
  const q = norm(text);
  if (!q) return null;
  let partial = null;
  for (const item of list) {
    for (const n of names(item).map(norm).filter(Boolean)) {
      if (n === q) return item;
      if (!exact && !partial && (q.includes(n) || n.includes(q)) && n.length >= 4) partial = item;
    }
  }
  return partial;
}

/** Aceita chaves com espaços sobrando, sufixo de página (#2) e maiúsculas diferentes. */
function indexValues(values) {
  const out = new Map();
  for (const [k, v] of Object.entries(values || {})) out.set(norm(k), v);
  return out;
}

function parseClassLevel(text) {
  const entries = [];
  const sub = (String(text).match(/\(([^)]*)\)/) || [])[1] || '';
  for (const part of String(text).replace(/\([^)]*\)/g, '').split(/[/,;&]+/)) {
    const m = part.trim().match(/^(.*?)\s*(\d+)?\s*$/);
    if (!m || !m[1]) continue;
    const cls = matchByName(SRD.CLASSES, m[1], c => [c.id, tName('class', c.id, 'en'), tName('class', c.id, 'pt')]);
    if (cls) entries.push({ id: cls.id, level: Math.max(1, Math.min(20, parseInt(m[2] || '1', 10))), rest: m[1] });
  }
  return { entries, subclassText: sub };
}

function parseEquipment(text) {
  return String(text || '').split(/\n|;|,(?![^()]*\))/).map(s => s.replace(/^[•\-*\s]+/, '').trim()).filter(Boolean).map(line => {
    let m = line.match(/^(\d+)\s*[x×]?\s+(.+)$/i);
    if (m) return { name: m[2], qty: +m[1] };
    m = line.match(/^(.+?)\s*[x×(]\s*(\d+)\s*\)?$/i);
    if (m) return { name: m[1], qty: +m[2] };
    return { name: line, qty: 1 };
  });
}

/**
 * Converte os valores lidos dos campos de um PDF em uma ficha nova.
 * `values`: { nomeDoCampo: string | boolean }. Devolve { char, unmatched }.
 */
export function sheetValuesToChar(values) {
  const v = indexValues(values);
  const get = name => { const x = v.get(norm(name)); return typeof x === 'string' ? x.trim() : x ?? ''; };
  const all = prefix => [...v.entries()].filter(([k]) => k.startsWith(norm(prefix)));
  const char = Utils.makeNew();
  const unmatched = [];
  const notes = [];

  char.name = get('CharacterName') || get('CharacterName 2');
  char.player = get('PlayerName');

  const { entries, subclassText } = parseClassLevel(get('ClassLevel'));
  if (entries.length) {
    char.className = entries[0].id;
    char.level = Math.min(20, entries.reduce((n, e) => n + e.level, 0));
    if (entries.length > 1) {
      char.multiclass = entries.slice(1).map(e => ({ id: e.id, subclass: '', landType: '' }));
      char.classSequence = entries.flatMap(e => Array(e.level).fill(e.id)).slice(0, 20);
    }
    const subs = subclassText.split(',').map(s => s.trim()).filter(Boolean);
    entries.forEach((e, i) => {
      const hint = subs[i] || e.rest.replace(new RegExp(tName('class', e.id, 'en'), 'i'), '').trim();
      if (!hint) return;
      const found = matchByName(subclassesFor(char, e.id), hint, s => [s.id, s.name?.en, s.name?.pt]);
      if (found) { if (i === 0) char.subclass = found.id; else char.multiclass[i - 1].subclass = found.id; }
      else notes.push(`Subclasse: ${hint}`);
    });
  } else if (get('ClassLevel')) {
    unmatched.push(`Classe: ${get('ClassLevel')}`);
  }

  // Raça/antecedente: tenta o catálogo atual (2024); se só existir no antigo, a ficha vira 2014.
  const pick = (kind, text, getter) => {
    if (!text) return null;
    // Nome exato em qualquer catálogo vence o parcial ("Hill Dwarf" é do antigo, não "Dwarf" de 2024).
    for (const exact of [true, false]) {
      for (const rv of ['2024', '2014']) {
        const list = getter({ ...char, rulesVersion: rv });
        const hit = matchByName(list, text, x => [x.id, x.name?.en, x.name?.pt, tName(kind, x.id, 'en'), tName(kind, x.id, 'pt')], { exact });
        if (hit) return { id: hit.id, rv };
      }
    }
    unmatched.push(`${kind === 'race' ? 'Espécie' : 'Antecedente'}: ${text}`);
    return null;
  };
  const race = pick('race', get('Race') || get('Race '), Utils.races);
  const bg = pick('background', get('Background'), Utils.backgrounds);
  if (race?.rv === '2014' || (!race && bg?.rv === '2014')) char.rulesVersion = '2014';
  if (race) char.race = race.id;
  if (bg) char.background = bg.id;

  const al = norm(get('Alignment'));
  if (al) {
    const code = Object.keys(ALIGNMENT_NAMES).find(k => norm(k) === al || ALIGNMENT_NAMES[k].includes(al));
    if (code) char.alignment = code; else unmatched.push(`Alinhamento: ${get('Alignment')}`);
  }
  const xp = num(get('XP'));
  if (xp !== null) { char.xp = xp; if (xp > 0) char.levelingMode = 'xp'; }
  else if (/marco|milestone/i.test(get('XP'))) char.levelingMode = 'milestone';
  char.inspiration = truthy(get('Inspiration'));

  // Os valores da ficha já incluem bônus de espécie/antecedente: gravamos o total.
  SRD.ABILITIES.forEach(a => {
    const score = num(get(ABILITY_FIELDS[a][0]));
    if (score !== null && score > 0 && score <= 30) char.abilities[a] = score;
  });
  char.raceBonus = {};

  const profB = SRD.profBonus(char.level || 1);
  const modOf = a => Math.floor((char.abilities[a] - 10) / 2);
  char.saveProfs = SRD.ABILITIES.filter((a, i) => {
    if (truthy(get(LAYOUT.saveChecks[i]))) return true;
    const val = num(get(ABILITY_FIELDS[a][2]));
    return val !== null && val - modOf(a) >= profB;
  });
  char.skillProfs = [];
  char.skillExpertise = [];
  SRD.SKILLS.forEach((s, i) => {
    const val = num(get(SKILL_FIELDS[s.id]));
    const extra = val === null ? 0 : val - modOf(s.stat);
    if (truthy(get(LAYOUT.skillChecks[i])) || extra >= profB) char.skillProfs.push(s.id);
    if (extra >= profB * 2) char.skillExpertise.push(s.id);
  });

  const hpMax = num(get('HPMax'));
  if (hpMax) char.maxHp = hpMax;
  const hpCur = num(get('HPCurrent'));
  char.currentHp = hpCur ?? char.maxHp;
  char.tempHp = num(get('HPTemp')) || 0;
  char.deathSaves = {
    success: LAYOUT.deathSuccess.filter(n => truthy(get(n))).length,
    fail: LAYOUT.deathFail.filter(n => truthy(get(n))).length,
  };

  char.weapons = WEAPON_FIELDS.map(([n, a, d]) => ({ name: get(n), bonus: num(get(a)) ?? 0, dmg: get(d) }))
    .filter(w => w.name)
    .map(w => {
      const def = matchByName(SRD.WEAPONS, w.name, x => [x.id, tName('weapon', x.id, 'en'), tName('weapon', x.id, 'pt')]);
      const dice = (w.dmg.match(/\d+d\d+/i) || [])[0] || def?.damage || '';
      return { ...(def ? { id: def.id } : {}), name: w.name, bonus: w.bonus, dmg: dice, dmgType: def?.dmgType || '', note: w.dmg };
    });

  ['cp', 'sp', 'ep', 'gp', 'pp'].forEach(c => { char.coins[c] = num(get(c.toUpperCase())) || 0; });
  char.equipment = parseEquipment(get('Equipment'));

  const profText = get('ProficienciesLang');
  if (profText) {
    const langs = Utils.LANGUAGES.filter(l => [l.id, l.pt].some(n => new RegExp(`\\b${norm(n)}\\b`).test(norm(profText))));
    char.languages = langs.map(l => l.id);
    char.otherProfs = profText;
  }

  char.personality = get('PersonalityTraits');
  char.ideals = get('Ideals');
  char.bonds = get('Bonds');
  char.flaws = get('Flaws');
  ['Age', 'Height', 'Weight', 'Eyes', 'Skin', 'Hair'].forEach(k => { char[k.toLowerCase()] = get(k); });
  char.allies = [get('FactionName'), get('Allies')].filter(Boolean).join('\n');
  char.backstory = get('Backstory');
  char.treasure = get('Treasure');

  // Magias: todos os campos "Spells ..." (inclusive das páginas extras) contra o catálogo.
  const spellRows = [];
  // Página 1 de magias usa o nome oficial; as extras, "Spells 1014 #2" (normalizado: "spells 1014 2").
  const suffixes = new Set(['', ...all('Spells ').map(([k]) => (k.match(/^spells \d+ (\d+)$/) || [])[1]).filter(Boolean)]);
  for (const [lvl, rows] of Object.entries(LAYOUT.spells)) {
    for (const row of rows) {
      for (const sfx of suffixes) {
        const name = get(sfx ? `${row.field} ${sfx}` : row.field);
        if (!name) continue;
        const prepared = row.prepared ? truthy(get(sfx ? `${row.prepared} ${sfx}` : row.prepared)) : false;
        spellRows.push({ level: +lvl, name, prepared });
      }
    }
  }
  const catalog = Utils.spellCatalog(char);
  const spells = [];
  for (const r of spellRows) {
    const clean = r.name.replace(/\((R|C|Ritual|Conc\.?|Concentra\w*)\)/gi, '').replace(/[◆•*]/g, '').trim();
    const def = matchByName(catalog, clean, s => [s.id, s.name?.en, s.name?.pt, tName('spellName', s.id, 'en'), tName('spellName', s.id, 'pt')]);
    if (def && !spells.some(s => s.id === def.id)) spells.push({ id: def.id, prepared: r.level === 0 ? false : r.prepared });
    else if (!def) unmatched.push(`${r.level === 0 ? 'Truque' : `Magia ${r.level}º`}: ${clean}`);
  }
  char.spells = spells;

  const longText = [
    ['Características e traços', get('Features and Traits')],
    ['Talentos e traços', get('Feat+Traits')],
    ['Ataques e conjuração', get('AttacksSpellcasting')],
  ].filter(([, t]) => t);
  if (notes.length) longText.unshift(['Importação', notes.join('\n')]);
  if (unmatched.length) longText.push(['Não reconhecido na importação (conferir)', unmatched.join('\n')]);
  char.notes = longText.map(([title, t]) => `## ${title}\n${t}`).join('\n\n');
  char.importedFrom = 'pdf';

  return { char, unmatched };
}

const SIZE_LABEL = {
  Tiny: ['Miúdo', 'Tiny'], Small: ['Pequeno', 'Small'], Medium: ['Médio', 'Medium'],
  Large: ['Grande', 'Large'], Huge: ['Enorme', 'Huge'], Gargantuan: ['Imenso', 'Gargantuan'],
};
const RELATIONSHIP_LABEL = { ally: ['Aliado', 'Ally'], neutral: ['Neutro', 'Neutral'], enemy: ['Inimigo', 'Enemy'] };

/**
 * Capa do PDF (só quando há foto): identidade em destaque e o que não tem
 * lugar nas páginas da ficha oficial — símbolo, tamanho, condições/efeitos
 * ativos e NPCs conhecidos.
 */
export function buildCoverData(char, lang = 'pt') {
  const d = buildSheetData(char, lang);
  const f = d.fields;
  const subtitle = [f['Race '], f.Background, f.Alignment].filter(Boolean).join(' · ');
  const facts = [];
  if (char.symbol) facts.push([L(lang, 'Símbolo', 'Symbol'), char.symbol]);
  const size = Utils.sizeOf(char);
  facts.push([L(lang, 'Tamanho', 'Size'), SIZE_LABEL[size] ? L(lang, ...SIZE_LABEL[size]) : size]);
  facts.push([L(lang, 'Progressão', 'Leveling'), Utils.levelingMode(char) === 'milestone' ? L(lang, 'Por marcos', 'Milestones') : `${char.xp || 0} XP`]);
  const conditions = [
    ...(char.conditions || []).map(id => tName('condition', id, lang) || id),
    ...(char.tempEffects || []).map(e => (e.duration ? `${e.name} (${e.duration})` : e.name)),
  ].filter(Boolean);
  const npcs = (char.npcs || []).filter(n => n.name).map(n => ({
    title: [n.name, n.relationship && RELATIONSHIP_LABEL[n.relationship] ? L(lang, ...RELATIONSHIP_LABEL[n.relationship]) : n.relationship].filter(Boolean).join(' — '),
    text: [[n.race, n.role].filter(Boolean).join(' · '), n.notes || ''].filter(Boolean).join('\n'),
  }));
  return {
    name: char.name || '',
    classLevel: f.ClassLevel,
    subtitle,
    player: char.player || '',
    facts,
    conditions,
    npcs,
  };
}

/** Livro de magias (texto integral) para a versão de impressão: ordenado por círculo e nome. */
export function spellbookSection(char, lang = 'pt') {
  const catalog = Utils.spellCatalog(char);
  const items = (char.spells || [])
    .map(s => catalog.find(d => d.id === s.id))
    .filter(Boolean)
    .sort((a, b) => a.level - b.level || tName('spellName', a.id, lang).localeCompare(tName('spellName', b.id, lang)))
    .map(d => {
      const circle = d.level === 0 ? L(lang, 'Truque', 'Cantrip') : L(lang, `${d.level}º círculo`, `Level ${d.level}`);
      const tags = [d.ritual && L(lang, 'ritual', 'ritual'), d.concentration && L(lang, 'concentração', 'concentration')].filter(Boolean);
      const m = Utils.spellMeta(d, lang);
      const meta = [m.castingTime, m.range, m.components, m.duration].filter(Boolean).join(' · ');
      const desc = String(d.desc?.[lang] || d.desc?.en || '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
      return {
        title: `${tName('spellName', d.id, lang)} — ${circle}, ${tName('school', d.school, lang)}${tags.length ? ` (${tags.join(', ')})` : ''}`,
        text: [meta, desc].filter(Boolean).join('\n'),
      };
    });
  return items.length ? { title: L(lang, 'Livro de magias', 'Spellbook'), items } : null;
}
