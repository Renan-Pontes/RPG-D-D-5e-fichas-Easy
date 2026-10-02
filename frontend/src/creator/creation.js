/* Funções puras da criação de personagem (sem React). Ver README.md. */
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import * as FS from '../progression/fighting-styles.js';
import { findFeat } from '../../data/feats.js';
import { findOption, optionPool } from '../progression/options.js';
import { classStart, startingTools, toolName, TOOLS, isWeaponProficient, isArmorProficient } from './start-data.js';
import { grantedSpells } from './spell-helpers.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

export const newCharacter = (rulesVersion = '2024') => ({
  ...Utils.makeNew(),
  rulesVersion,
  level: 1,
  xp: 0,
  levelingMode: 'milestone',
  creation: {},
});

// ---------------------------------------------------------------------------
// Começo: regra (2024 x 2014)
// ---------------------------------------------------------------------------
/** Campos que sobrevivem à troca de regra (identidade, não regras). */
export const RULES_SWITCH_KEEP = ['id', 'createdAt', 'name', 'avatar', 'player', 'levelingMode', 'symbol'];

/** true se o jogador já escolheu algo que depende da regra (classe, espécie, perícias…). */
export function hasRulesChoices(char) {
  if (!char) return false;
  if (char.className || char.race || char.background || char.subclass) return true;
  for (const k of ['skillProfs', 'skillExpertise', 'spells', 'feats', 'languages', 'classOptions', 'weapons', 'equipment', 'toolProfs']) {
    if (Array.isArray(char[k]) && char[k].length) return true;
  }
  if (char.armor || char.hasShield) return true;
  if (char.raceBonus && Object.values(char.raceBonus).some(Boolean)) return true;
  if (char.speciesChoices && Object.keys(char.speciesChoices).length) return true;
  if (char.abilities && Object.values(char.abilities).some(v => v !== 8)) return true;
  if (char.creation && Object.keys(char.creation).length) return true;
  return false;
}

/**
 * Patch para o `set` do assistente (merge raso) que reinicia a ficha na regra nova,
 * mantendo nome/foto/jogador. Campos que não existem numa ficha nova viram undefined
 * para não sobrar escolha da regra antiga (feats, speciesChoices, classOptions…).
 */
export function rulesSwitchPatch(char, rulesVersion) {
  const fresh = newCharacter(rulesVersion === '2014' ? '2014' : '2024');
  const patch = {};
  for (const k of Object.keys(char || {})) patch[k] = undefined;
  Object.assign(patch, fresh);
  for (const k of RULES_SWITCH_KEEP) if (char && char[k] !== undefined && char[k] !== '') patch[k] = char[k];
  return patch;
}

// ---------------------------------------------------------------------------
// Detalhes
// ---------------------------------------------------------------------------
/** Limite do nome no servidor (backend/api/models.py: name max_length=120). */
export const NAME_MAX = 120;

export function detailsIssues(char) {
  const name = String(char?.name || '').trim();
  if (!name) {
    return [{ pt: 'Escreva o nome do seu personagem (campo "Nome", no topo desta etapa).', en: 'Write your character\'s name (the "Name" field at the top of this step).' }];
  }
  if (name.length > NAME_MAX) {
    return [{
      pt: `O nome tem ${name.length} letras; o máximo é ${NAME_MAX}. Encurte o nome.`,
      en: `The name has ${name.length} characters; the maximum is ${NAME_MAX}. Shorten it.`,
    }];
  }
  return [];
}

/** Perguntas-guia da história (SRD 5.2.1 "Imagine Your Past and Present", em resumo próprio). */
export const STORY_PROMPTS = [
  { id: 'raised', q: { pt: 'Quem te criou?', en: 'Who raised you?' }, hint: { pt: 'Pais, avós, um mosteiro, as ruas…', en: 'Parents, grandparents, a monastery, the streets…' } },
  { id: 'friend', q: { pt: 'Quem é (ou foi) importante para você?', en: 'Who is (or was) important to you?' }, hint: { pt: 'Um amigo de infância, um mentor, um bicho de estimação, um amor…', en: 'A childhood friend, a mentor, a pet, a love…' } },
  { id: 'group', q: { pt: 'Você fez parte de algum grupo?', en: 'Did you belong to any group?' }, hint: { pt: 'Uma guilda, um templo, o exército, uma família de circo… Ainda faz parte?', en: 'A guild, a temple, the army, a circus family… Still a member?' } },
  { id: 'why', q: { pt: 'Por que você saiu em aventura?', en: 'Why did you start adventuring?' }, hint: { pt: 'Vingança, curiosidade, dinheiro, proteger alguém…', en: 'Revenge, curiosity, money, protecting someone…' } },
];

/** Junta as respostas das perguntas-guia (char.creation.story) ao texto da história. */
export function composeBackstory(char, lang = 'pt') {
  const answers = char?.creation?.story || {};
  const lines = STORY_PROMPTS
    .filter(p => String(answers[p.id] || '').trim())
    .map(p => `${p.q[lang === 'pt' ? 'pt' : 'en']} ${String(answers[p.id]).trim()}`);
  const base = String(char?.backstory || '').trim();
  return [base, ...lines].filter(Boolean).join('\n\n');
}

// ---------------------------------------------------------------------------
// Talento de origem
// ---------------------------------------------------------------------------
/** Talento de origem (2024) gravado em char.feats com origin: 'background'. */
export const originFeatEntry = (char) => (char.feats || []).find(f => f?.origin === 'background') || null;

/** Perícias escolhidas no talento de origem (ex.: Habilidoso). */
export const originFeatSkills = (char) => {
  const p = originFeatEntry(char)?.picks || {};
  return [...(p.skillOrTool || []), ...(p.skill || [])].filter(id => SRD.SKILLS.some(s => s.id === id));
};

// ---------------------------------------------------------------------------
// Revisão: pendências de todas as etapas
// ---------------------------------------------------------------------------
/**
 * Pendências de cada etapa que se aplica (menos a própria revisão):
 * [{ id, title: {pt,en}, issues: [{pt,en}] }] só com as etapas que têm pendência.
 */
export function collectIssues(steps, char, { exclude = ['review'] } = {}) {
  const out = [];
  for (const s of steps || []) {
    if (!s || exclude.includes(s.id)) continue;
    let applies = true;
    try { applies = !s.applies || !!s.applies(char); } catch { applies = true; }
    if (!applies || !s.issues) continue;
    let issues;
    try { issues = s.issues(char) || []; } catch {
      issues = [{ pt: 'Revise esta etapa.', en: 'Review this step.' }];
    }
    if (issues.length) out.push({ id: s.id, title: s.title, issues });
  }
  return out;
}

/** Mesmas pendências numa lista simples, cada uma com o nome da etapa na frente. */
export const flatIssues = (groups) => groups.flatMap(g => g.issues.map(i => ({
  pt: `${g.title?.pt || g.id}: ${i.pt}`,
  en: `${g.title?.en || g.id}: ${i.en || i.pt}`,
  stepId: g.id,
})));

// ---------------------------------------------------------------------------
// Ficha final
// ---------------------------------------------------------------------------
const uniq = (arr) => [...new Set(arr.filter(Boolean))];

/** Todas as ferramentas treinadas (escolhidas + fixas da classe/antecedente + talento/opções de classe). */
export function allToolProfs(char) {
  let fixed = [];
  try { fixed = startingTools(char).fixed; } catch { fixed = []; }
  let granted = [];
  try { granted = Utils.classGrants(char).tools || []; } catch { granted = []; }
  return uniq([...(char.toolProfs || []), ...fixed, ...granted]);
}

/** Texto legível das ferramentas para o campo "Outras proficiências" da ficha. */
export function toolProfsText(toolIds, lang = 'pt') {
  if (!toolIds.length) return '';
  return `${L(lang, 'Ferramentas', 'Tools')}: ${toolIds.map(id => (TOOLS[id] ? toolName(id, lang) : id)).join(', ')}`;
}

/** Ficha pronta para salvar: perícias, idiomas, ferramentas e salvaguardas consolidados, PV cheios, sem os rascunhos da criação. */
export function finalizeCharacter(char, lang = 'pt') {
  const { creation, ...rest } = char;
  let speciesSkills = [];
  try { speciesSkills = Utils.speciesGrants(char).skills || []; } catch { speciesSkills = []; }
  let featSkills = [];
  try { featSkills = (Utils.classGrants(char).skills || []); } catch { featSkills = []; }
  const tools = allToolProfs(char);
  const toolsLine = toolProfsText(tools, lang);
  const prevOther = String(char.otherProfs || '').trim();
  const otherProfs = !toolsLine || prevOther.includes(toolsLine) ? prevOther : [prevOther, toolsLine].filter(Boolean).join('\n');
  const normalized = {
    ...rest,
    name: String(char.name || '').trim(),
    level: char.level || 1,
    languages: uniq([...Utils.fixedLanguages(char), ...Utils.trimLanguages(char)]),
    skillProfs: uniq([...(char.skillProfs || []), ...Utils.backgroundSkills(char), ...originFeatSkills(char), ...speciesSkills, ...featSkills])
      .filter(id => SRD.SKILLS.some(s => s.id === id)),
    saveProfs: uniq([...(classStart(char)?.saves || []), ...(char.saveProfs || [])]),
    toolProfs: tools,
    otherProfs,
    backstory: composeBackstory(char, lang),
    hitDiceUsed: 0,
    tempHp: 0,
    deathSaves: { success: 0, fail: 0 },
  };
  const maxHp = Utils.maxHpDefault(normalized);
  return { ...normalized, maxHp, currentHp: maxHp };
}

// ---------------------------------------------------------------------------
// Resumo para a revisão
// ---------------------------------------------------------------------------
const ABBR = {
  pt: { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' },
  en: { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' },
};
export const abilityAbbr = (id, lang = 'pt') => ABBR[lang === 'pt' ? 'pt' : 'en'][id] || id;

const txt = (v, lang) => (v && typeof v === 'object' ? (v[lang] || v.pt || v.en || '') : (v || ''));

/** Linha de ataque de uma arma (bônus só soma proficiência se a classe for treinada nela). */
export function weaponAttack(char, w, lang = 'pt') {
  const def = w?.id ? SRD.weaponFor(w.id, char.rulesVersion) : null;
  const name = txt(w?.name, lang) || (w?.id ? tName('weapon', w.id, lang) : '?');
  if (!def) return { name, atk: Number(w?.bonus) || 0, dmg: w?.dmg || '', ability: null, proficient: true, known: false };
  // Mesma conta da ficha (Utils.attackFor: Artes Marciais do Monge, Estilo de Luta…).
  if (typeof Utils.attackFor === 'function') {
    try {
      const a = Utils.attackFor(char, w);
      return { name, atk: a.bonus, dmg: a.damage, dmgType: a.dmgType || def.dmgType || '', ability: a.ability, proficient: a.proficient, known: true, monk: !!a.monk };
    } catch { /* cai na conta local */ }
  }
  const ranged = (def.type || '').includes('ranged');
  const finesse = (def.props || []).includes('finesse');
  const useDex = ranged || (finesse && Utils.abilityMod(char, 'dex') > Utils.abilityMod(char, 'str'));
  const ability = useDex ? 'dex' : 'str';
  const mod = Utils.abilityMod(char, ability);
  let proficient = true;
  try { proficient = isWeaponProficient(char, w.id); } catch { proficient = true; }
  let fs = { attack: 0, damage: 0 };
  try { fs = FS.weaponStyleBonuses(char, w) || fs; } catch { /* sem estilo */ }
  const atk = mod + (proficient ? Utils.profBonus(char) : 0) + (fs.attack || 0);
  const dmgBonus = mod + (fs.damage || 0);
  const dice = w.dmg || def.damage || '';
  const dmg = dice ? `${dice}${dmgBonus ? (dmgBonus > 0 ? `+${dmgBonus}` : dmgBonus) : ''}` : '';
  return { name, atk, dmg, dmgType: def.dmgType || '', ability, proficient, known: true };
}

/** Golpe Desarmado na revisão: só quando ele é um ataque de verdade (Monge ou Estilo de Luta Desarmado). */
export function unarmedAttack(char, lang = 'pt') {
  if (typeof Utils.unarmedStrike !== 'function') return null;
  let u = null;
  try { u = Utils.unarmedStrike(char); } catch { return null; }
  if (!u || !(u.monk || u.style)) return null;
  return { name: txt(u.name, lang) || L(lang, 'Golpe Desarmado', 'Unarmed Strike'), atk: u.bonus, dmg: u.damage, dmgType: u.dmgType, ability: u.ability, proficient: true, known: true, unarmed: true, qty: 1 };
}

const spellNameOf = (id, sp, lang) => {
  const n = tName('spellName', id, lang);
  return n && n !== id ? n : (txt(sp?.name, lang) || n || id);
};

/**
 * Todas as magias que vão para a ficha, de todas as fontes:
 *  - escolhidas na classe (char.spells sem `auto`);
 *  - automáticas da classe/subclasse e de escolhas de classe (Ordem Primal Mago,
 *    Pacto do Tomo, Marca do Caçador, Remendar do Artífice…), de talentos e da espécie
 *    (mesma lista do spell-helpers grantedSpells, a que o app grava ao salvar).
 * Cada item: { id, name, level, source: 'class'|'feat'|'species', from: {pt,en}|null,
 *   auto, prepared, bookOnly }. `prepared` = pode lançar hoje; `bookOnly` = Mago: só no grimório.
 */
export function knownSpells(char, lang = 'pt') {
  const catalog = Utils.spellCatalog(char) || [];
  const byId = new Map(catalog.map(s => [s.id, s]));
  const out = new Map();
  const add = (id, info) => {
    if (!id || out.has(id)) return;
    const sp = byId.get(id);
    if (!sp) return;
    const level = sp.level || 0;
    out.set(id, {
      id, name: spellNameOf(id, sp, lang), level,
      source: info.source, from: info.from || null, auto: !!info.auto,
      prepared: level === 0 || info.prepared !== false, bookOnly: level > 0 && info.prepared === false,
    });
  };
  let granted = [];
  try { granted = grantedSpells(char) || []; } catch { granted = []; }
  for (const g of granted) add(g.id, { source: g.source, from: g.from, auto: true, prepared: true });
  for (const s of char.spells || []) {
    const e = typeof s === 'string' ? { id: s } : s;
    if (!e?.id) continue;
    if (e.auto) add(e.id, { source: e.feat ? 'feat' : e.species ? 'species' : 'class', auto: true, prepared: true });
    else add(e.id, { source: 'class', prepared: e.prepared !== false });
  }
  // Talentos sem `grants` conhecidos (fichas antigas): picks soltos que são magias.
  for (const f of char.feats || []) {
    for (const v of Object.values(f?.picks || {})) {
      (Array.isArray(v) ? v : [v]).forEach(id => typeof id === 'string' && add(id, { source: 'feat', auto: true, prepared: true }));
    }
  }
  return [...out.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

/** A classe conjura no nível atual? (Paladino/Patrulheiro 2014 só a partir do nível 2.) */
export function classCastsNow(char) {
  if (!char?.className) return false;
  try { return Utils.casterViews(char).length > 0; } catch { return false; }
}

const nameOfTrait = (char, en, fallback) => {
  try {
    const race = Utils.races(char).find(r => r.id === char.race);
    const t = (race?.traits || []).find(x => (x?.name?.en || x?.name) === en);
    if (t?.name) return typeof t.name === 'string' ? { pt: t.name, en: t.name } : t.name;
  } catch { /* sem espécie */ }
  return fallback;
};

/**
 * Pontos de Vida máximos explicados em partes que somam o total de Utils.maxHpDefault:
 * [{ amount, label: {pt,en} }]. Nível 1: dado máximo da classe + CON, + Robustez Anã,
 * + Vigoroso (Tough), + Resiliência Dracônica (Feiticeiro Dracônico 2014).
 */
export function hpBreakdown(char) {
  const total = Utils.maxHpDefault(char);
  const cls = SRD.CLASSES.find(k => k.id === char.className);
  if (!cls) return { total, parts: [] };
  const lv = char.level || 1;
  const con = Utils.abilityMod(char, 'con');
  const parts = [{ amount: cls.hitDie, label: { pt: `do dado da classe (d${cls.hitDie}, valor máximo)`, en: `class die (d${cls.hitDie}, maximum)` }, kind: 'die' }];
  parts.push({ amount: con * (lv === 1 ? 1 : lv), label: { pt: 'de Constituição', en: 'Constitution' }, kind: 'con' });
  if (char.race === 'dwarf-hill' || (char.rulesVersion === '2024' && char.race === 'dwarf')) {
    const n = nameOfTrait(char, 'Dwarven Toughness', { pt: 'Robustez Anã', en: 'Dwarven Toughness' });
    parts.push({ amount: lv, label: { pt: `da ${n.pt} (anão)`, en: `${n.en} (dwarf)` }, kind: 'dwarf' });
  }
  if (char.originFeat === 'Tough' || (char.feats || []).some(f => f?.id === 'tough' || f?.id === 'tough2014')) {
    parts.push({ amount: 2 * lv, label: { pt: 'do talento Vigoroso', en: 'Tough feat' }, kind: 'tough' });
  }
  const used = parts.reduce((n, p) => n + p.amount, 0);
  if (used !== total) {
    const draconic = char.className === 'sorcerer' && char.subclass === 'draconic';
    parts.push({ amount: total - used, label: draconic
      ? { pt: 'da Resiliência Dracônica', en: 'Draconic Resilience' }
      : { pt: 'de outros bônus', en: 'other bonuses' }, kind: draconic ? 'draconic' : 'other' });
  }
  return { total, parts: parts.filter(p => p.amount !== 0 || p.kind === 'die') };
}

/** "10 do dado… +2 de Constituição +2 do talento Vigoroso = 14" */
export function hpExplain(char, lang = 'pt') {
  const { total, parts } = hpBreakdown(char);
  if (!parts.length) return '';
  const k = lang === 'pt' ? 'pt' : 'en';
  const [first, ...rest] = parts;
  const body = [`${first.amount} ${first.label[k]}`, ...rest.map(p => `${Utils.fmtMod(p.amount)} ${p.label[k]}`)].join(' ');
  return `${body} = ${total}`;
}

/**
 * Iniciativa (Utils.initiative) explicada: DES + Alerta (2024: + Bônus de Proficiência; 2014: +5).
 * { total, dex, alert: null | { amount, kind: 'pb'|'flat' } }
 */
export function initiativeBreakdown(char) {
  const total = Utils.initiative(char);
  const dex = Utils.abilityMod(char, 'dex');
  const extra = total - dex;
  return { total, dex, alert: extra ? { amount: extra, kind: char.rulesVersion === '2024' ? 'pb' : 'flat' } : null };
}

/** "DES +2 + Bônus de Proficiência +2 (talento Alerta) = +4" */
export function initiativeExplain(char, lang = 'pt') {
  const b = initiativeBreakdown(char);
  const dex = `${L(lang, 'Destreza', 'Dexterity')} ${Utils.fmtMod(b.dex)}`;
  if (!b.alert) return dex;
  const extra = b.alert.kind === 'pb'
    ? L(lang, `Bônus de Proficiência ${Utils.fmtMod(b.alert.amount)} (talento Alerta)`, `Proficiency Bonus ${Utils.fmtMod(b.alert.amount)} (Alert feat)`)
    : L(lang, `${b.alert.amount} do talento Alerta`, `${b.alert.amount} from the Alert feat`);
  return `${dex} + ${extra} = ${Utils.fmtMod(b.total)}`;
}

/** Nome legível de uma escolha de classe (opção fixa, magia, perícia, idioma ou arma). */
function optionLabel(classId, pick, lang) {
  const def = optionPool(classId, pick.pool);
  const k = lang === 'pt' ? 'pt' : 'en';
  if (def?.kind === 'spell') return tName('spellName', pick.id, lang);
  if (def?.kind === 'skill') return tName('skill', pick.id, lang);
  if (def?.kind === 'language') return Utils.languageLabel(pick.id, lang);
  const o = findOption(classId, pick.pool, pick.id);
  const n = o?.name;
  return (n && typeof n === 'object' ? n[k] || n.pt : n) || pick.id;
}

/**
 * Talentos e habilidades para conferir: talentos, escolhas da classe (Estilo de Luta,
 * Maestria, Ordem Divina…) e traços da espécie. [{ kind, title: {pt,en}, items: [string] }]
 */
export function featuresSummary(char, lang = 'pt') {
  const k = lang === 'pt' ? 'pt' : 'en';
  const out = [];
  const feats = (char.feats || []).map(f => {
    const def = f?.id ? findFeat(f.id) : null;
    const n = def?.name || f?.name;
    return (n && typeof n === 'object' ? n[k] || n.pt : n) || f?.id;
  }).filter(Boolean);
  if (feats.length) out.push({ kind: 'feats', title: { pt: 'Talentos', en: 'Feats' }, items: uniq(feats) });
  const groups = new Map();
  for (const p of char.classOptions || []) {
    if (!p?.pool || !p?.id) continue;
    const cls = p.classId || char.className;
    const def = optionPool(cls, p.pool);
    const t = def?.name ? (typeof def.name === 'object' ? def.name : { pt: def.name, en: def.name }) : { pt: p.pool, en: p.pool };
    const key = `${cls}:${p.pool}`;
    if (!groups.has(key)) groups.set(key, { kind: 'class', title: t, items: [] });
    groups.get(key).items.push(optionLabel(cls, p, lang));
  }
  out.push(...groups.values());
  try {
    const race = Utils.races(char).find(r => r.id === char.race);
    const traits = (race?.traits || []).filter(t => !(t?.level > (char.level || 1)))
      .map(t => (t?.name && typeof t.name === 'object' ? t.name[k] || t.name.pt : t?.name)).filter(Boolean);
    if (traits.length) {
      const rn = { pt: tName('race', char.race, 'pt'), en: tName('race', char.race, 'en') };
      out.push({ kind: 'species', title: { pt: `Traços da espécie (${rn.pt})`, en: `${rn.en} traits` }, items: traits });
    }
  } catch { /* sem espécie */ }
  return out;
}

/** Junta armas repetidas (mesmo id/nome) somando a quantidade. */
export function groupWeapons(weapons = []) {
  const out = [];
  for (const w of weapons) {
    if (!w) continue;
    const key = w.id || JSON.stringify(w.name || '');
    const prev = out.find(x => (x.id || JSON.stringify(x.name || '')) === key && !x.magicBonus === !w.magicBonus);
    if (prev) prev.qty = (prev.qty || 1) + (w.qty || 1);
    else out.push({ ...w, qty: w.qty || 1 });
  }
  return out;
}

/** Números da ficha para a revisão, calculados sobre a ficha já consolidada. */
export function characterSummary(char, lang = 'pt') {
  const c = finalizeCharacter(char, lang);
  const pb = Utils.profBonus(c);
  const dex = Utils.abilityMod(c, 'dex');
  const ini = initiativeBreakdown(c);
  const armorDef = c.armor ? SRD.ARMOR.find(a => a.id === c.armor) : null;
  let untrained = [];
  try {
    if (armorDef && !isArmorProficient(c, armorDef.id)) untrained.push(tName('armor', armorDef.id, lang));
    if (c.hasShield && !isArmorProficient(c, 'shield')) untrained.push(L(lang, 'Escudo', 'Shield'));
  } catch { untrained = []; }
  const ft = Utils.speed(c);
  const castsNow = classCastsNow(c);
  let spellAbility = null;
  try { spellAbility = castsNow ? Utils.spellcastingAbility(c) : null; } catch { spellAbility = null; }
  // Paladino/Patrulheiro 2014: a classe tem magia, mas só a partir do nível 2.
  let classSpellsFrom = null;
  if (!castsNow && c.className) {
    try {
      const ab = Utils.spellcastingAbilityOfClass(c);
      if (ab) classSpellsFrom = 2;
    } catch { classSpellsFrom = null; }
  }
  const weapons = groupWeapons(c.weapons || []);
  const attackOf = (w) => {
    const base = weaponAttack(c, w, lang);
    return { ...base, qty: w.qty || 1 };
  };
  const hp = hpBreakdown(c);
  return {
    char: c,
    hp: c.maxHp,
    hpParts: hp.parts,
    hitDie: SRD.CLASSES.find(k => k.id === c.className)?.hitDie || null,
    conMod: Utils.abilityMod(c, 'con'),
    ac: Utils.computeAc(c),
    armorName: armorDef ? tName('armor', armorDef.id, lang) : null,
    shield: !!c.hasShield,
    untrainedArmor: untrained,
    initiative: ini.total,
    initiativeAlert: !!ini.alert,
    initiativeAlertKind: ini.alert?.kind || null,
    initiativeAlertBonus: ini.alert?.amount || 0,
    dexMod: dex,
    speedFt: ft,
    speedM: Math.round(ft * 0.3 * 10) / 10,
    profBonus: pb,
    passivePerception: Utils.passivePerception(c),
    abilities: SRD.ABILITIES.map(a => {
      const id = typeof a === 'string' ? a : a.id;
      return { id, score: Utils.abilityWithRace(c, id), mod: Utils.abilityMod(c, id) };
    }),
    saves: c.saveProfs.map(id => ({ id, bonus: Utils.saveBonus(c, id) })),
    skills: SRD.SKILLS.filter(s => Utils.hasSkillProf(c, s.id)).map(s => ({ id: s.id, ability: s.stat, bonus: Utils.skillBonus(c, s.id), expertise: Utils.hasExpertise(c, s.id) })),
    attacks: [...weapons.map(attackOf), unarmedAttack(c, lang)].filter(Boolean),
    languages: (c.languages || []).map(id => Utils.languageLabel(id, lang)),
    tools: (c.toolProfs || []).map(id => (TOOLS[id] ? toolName(id, lang) : id)),
    spells: knownSpells(c, lang),
    spellAbility,
    spellDc: spellAbility ? Utils.spellSaveDc(c) : null,
    spellAttack: spellAbility ? Utils.spellAttackBonus(c) : null,
    classSpellsFrom,
    usesSpellbook: c.className === 'wizard',
    features: featuresSummary(c, lang),
    equipment: (c.equipment || []).map(e => ({ name: txt(e?.name, lang) || String(e || ''), qty: e?.qty || 1 })).filter(e => e.name),
    coins: c.coins || {},
  };
}

// ---------------------------------------------------------------------------
// Tendência (resumo próprio do SRD 5.2.1 "The Nine Alignments")
// ---------------------------------------------------------------------------
export const ALIGNMENT_INFO = [
  { id: 'LG', name: { pt: 'Leal e Bom', en: 'Lawful Good' }, desc: { pt: 'Faz o que é certo seguindo regras e promessas; protege os inocentes.', en: 'Does the right thing by following rules and promises; protects the innocent.' } },
  { id: 'NG', name: { pt: 'Neutro e Bom', en: 'Neutral Good' }, desc: { pt: 'Ajuda quem precisa, usando ou não as regras.', en: 'Helps those in need, with or without the rules.' } },
  { id: 'CG', name: { pt: 'Caótico e Bom', en: 'Chaotic Good' }, desc: { pt: 'Segue o próprio coração, mesmo que isso irrite as autoridades.', en: 'Follows their heart, even if it upsets the authorities.' } },
  { id: 'LN', name: { pt: 'Leal e Neutro', en: 'Lawful Neutral' }, desc: { pt: 'Vive por um código, uma lei ou uma tradição acima de tudo.', en: 'Lives by a code, law or tradition above all else.' } },
  { id: 'N', name: { pt: 'Neutro', en: 'Neutral' }, desc: { pt: 'Evita tomar lados e faz o que parece melhor na hora.', en: 'Avoids taking sides and does what seems best at the moment.' } },
  { id: 'CN', name: { pt: 'Caótico e Neutro', en: 'Chaotic Neutral' }, desc: { pt: 'Valoriza a própria liberdade acima de regras e de outras pessoas.', en: 'Values their own freedom above rules and other people.' } },
  { id: 'LE', name: { pt: 'Leal e Mau', en: 'Lawful Evil' }, desc: { pt: 'Usa regras e hierarquias para conseguir o que quer, sem piedade.', en: 'Uses rules and hierarchies to get what they want, without mercy.' } },
  { id: 'NE', name: { pt: 'Neutro e Mau', en: 'Neutral Evil' }, desc: { pt: 'Faz o que for preciso para se dar bem, sem culpa.', en: 'Does whatever it takes to get ahead, without guilt.' } },
  { id: 'CE', name: { pt: 'Caótico e Mau', en: 'Chaotic Evil' }, desc: { pt: 'Age por raiva ou capricho, sem se importar com quem sai ferido.', en: 'Acts out of anger or whim, not caring who gets hurt.' } },
];
export const EVIL_ALIGNMENTS = ['LE', 'NE', 'CE'];
export const isEvilAlignment = (id) => EVIL_ALIGNMENTS.includes(id);

// ---------------------------------------------------------------------------
// Rascunho (F5 no meio do assistente): localStorage, sem quebrar se não houver
// ---------------------------------------------------------------------------
export const DRAFT_KEY = 'forja:creator-draft';
const defaultStore = () => { try { return globalThis.localStorage || null; } catch { return null; } };

/** Grava { char, stepId, visited }. Se a foto estourar a cota, tenta de novo sem ela. */
export function saveDraft(draft, store = defaultStore()) {
  if (!store || !draft?.char) return false;
  const payload = { v: 1, savedAt: Date.now(), stepId: draft.stepId || null, visited: draft.visited || [], char: draft.char };
  try { store.setItem(DRAFT_KEY, JSON.stringify(payload)); return true; } catch { /* cota cheia? */ }
  try { store.setItem(DRAFT_KEY, JSON.stringify({ ...payload, char: { ...payload.char, avatar: '' } })); return true; } catch { return false; }
}

/** Rascunho válido (com alguma escolha feita) ou null. */
export function loadDraft(store = defaultStore()) {
  if (!store) return null;
  try {
    const raw = store.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || !d.char || typeof d.char !== 'object') return null;
    if (!hasRulesChoices(d.char) && !String(d.char.name || '').trim()) return null;
    return { stepId: typeof d.stepId === 'string' ? d.stepId : null, visited: Array.isArray(d.visited) ? d.visited.filter(x => typeof x === 'string') : [], char: d.char, savedAt: d.savedAt || null };
  } catch { return null; }
}

export function clearDraft(store = defaultStore()) {
  if (!store) return;
  try { store.removeItem(DRAFT_KEY); } catch { /* ignora */ }
}

/** Mensagem clara para um erro ao salvar (ex.: 400 do servidor com nome longo demais). */
export function saveErrorMessage(err, char) {
  const name = String(char?.name || '').trim();
  const data = err?.data;
  const nameErr = (data && typeof data === 'object' && (data.name || data.errors?.name)) || (err?.status === 400 && name.length > NAME_MAX);
  if (nameErr) {
    return { pt: `O servidor recusou o nome: use no máximo ${NAME_MAX} letras (o seu tem ${name.length}). Volte em "Detalhes" e encurte.`,
      en: `The server rejected the name: use at most ${NAME_MAX} characters (yours has ${name.length}). Go back to "Details" and shorten it.` };
  }
  if (err?.status === 400) {
    return { pt: 'O servidor recusou a ficha (dados inválidos). Confira as etapas e tente de novo.', en: 'The server rejected the sheet (invalid data). Check the steps and try again.' };
  }
  return { pt: 'Não foi possível salvar agora. Confira sua conexão e toque em "Criar personagem" de novo; suas escolhas continuam aqui.',
    en: 'Could not save right now. Check your connection and tap "Create character" again; your choices are still here.' };
}
