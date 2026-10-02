/* Funções puras da criação de personagem (sem React). Ver README.md. */
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import * as FS from '../progression/fighting-styles.js';
import { classStart, startingTools, toolName, TOOLS, isWeaponProficient, isArmorProficient } from './start-data.js';

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
export function detailsIssues(char) {
  if (!String(char?.name || '').trim()) {
    return [{ pt: 'Escreva o nome do seu personagem (campo "Nome", no topo desta etapa).', en: 'Write your character\'s name (the "Name" field at the top of this step).' }];
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

/** Magias que o personagem sabe ao final: da classe (char.spells), da espécie e de talentos. */
export function knownSpells(char, lang = 'pt') {
  const catalog = Utils.spellCatalog(char) || [];
  const byId = new Map(catalog.map(s => [s.id, s]));
  const out = new Map();
  const add = (id, source) => {
    const sp = byId.get(id);
    if (!sp || out.has(id)) return;
    out.set(id, { id, name: txt(sp.name, lang) || tName('spellName', id, lang), level: sp.level || 0, source });
  };
  for (const s of char.spells || []) add(typeof s === 'string' ? s : s?.id, 'class');
  try {
    const g = Utils.speciesGrants(char);
    (g.cantrips || []).forEach(id => add(id, 'species'));
    (g.spells || []).forEach(id => add(id, 'species'));
  } catch { /* sem espécie */ }
  for (const f of char.feats || []) {
    for (const v of Object.values(f?.picks || {})) {
      (Array.isArray(v) ? v : [v]).forEach(id => typeof id === 'string' && add(id, 'feat'));
    }
  }
  return [...out.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

/** Números da ficha para a revisão, calculados sobre a ficha já consolidada. */
export function characterSummary(char, lang = 'pt') {
  const c = finalizeCharacter(char, lang);
  const pb = Utils.profBonus(c);
  const dex = Utils.abilityMod(c, 'dex');
  const alert = c.rulesVersion === '2024' && (c.feats || []).some(f => f?.id === 'alert');
  const armorDef = c.armor ? SRD.ARMOR.find(a => a.id === c.armor) : null;
  let untrained = [];
  try {
    if (armorDef && !isArmorProficient(c, armorDef.id)) untrained.push(tName('armor', armorDef.id, lang));
    if (c.hasShield && !isArmorProficient(c, 'shield')) untrained.push(L(lang, 'Escudo', 'Shield'));
  } catch { untrained = []; }
  const ft = Utils.speed(c);
  let spellAbility = null;
  try { spellAbility = Utils.spellcastingAbility(c); } catch { spellAbility = null; }
  return {
    char: c,
    hp: c.maxHp,
    hitDie: SRD.CLASSES.find(k => k.id === c.className)?.hitDie || null,
    conMod: Utils.abilityMod(c, 'con'),
    ac: Utils.computeAc(c),
    armorName: armorDef ? tName('armor', armorDef.id, lang) : null,
    shield: !!c.hasShield,
    untrainedArmor: untrained,
    initiative: dex + (alert ? pb : 0),
    initiativeAlert: alert,
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
    attacks: (c.weapons || []).map(w => weaponAttack(c, w, lang)),
    languages: (c.languages || []).map(id => Utils.languageLabel(id, lang)),
    tools: (c.toolProfs || []).map(id => (TOOLS[id] ? toolName(id, lang) : id)),
    spells: knownSpells(c, lang),
    spellAbility,
    spellDc: spellAbility ? Utils.spellSaveDc(c) : null,
    spellAttack: spellAbility ? Utils.spellAttackBonus(c) : null,
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
