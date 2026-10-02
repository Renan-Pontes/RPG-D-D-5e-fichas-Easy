/*
 * Lógica pura das etapas de classe da criação (class, classChoices, skills).
 * Sem React: testada em tests/creator-class.test.js. Ver README.md.
 *
 * - Classe: dados de start-data.js (por regra), subclasse só quando a regra
 *   pede no nível 1 (2014: Clérigo, Feiticeiro, Bruxo).
 * - Escolhas da classe: vagas de options.js (optionSlots) gravadas em
 *   char.classOptions. A Especialização (depende das perícias) é feita na
 *   etapa Antecedente, depois que todas as perícias (classe + antecedente) já
 *   são conhecidas; o idioma extra do Ladino 2024 fica na etapa de idiomas
 *   (utils.js languageChoiceSources já conta essa vaga).
 * - Perícias: exatamente N da lista da classe; as que vêm de outra fonte
 *   (antecedente, espécie, talento, opção de classe) ficam travadas.
 */
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import { subclassesFor } from '../progression/subclasses.js';
import { computeProgression } from '../progression/engine.js';
import {
  optionSlots, optionPool, picksOf, applyOptionPicks, validateOptionPicks, findOption,
} from '../progression/options.js';
import { poolOptions } from '../progression/options-catalog.js';
import { classStart, backgroundStart, packFor, toolName, TOOL_CATEGORIES, startingSpells } from './start-data.js';
import { originFeatSkills } from './creation.js';
import { dropPack } from './equipment-helpers.js';

const b = (pt, en) => ({ pt, en });
const rv = (char) => (char?.rulesVersion === '2014' ? '2014' : '2024');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const uniq = (xs) => [...new Set(xs)];

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------
/** Classes do livro básico (SRD) e de outros livros (confirme com o mestre). */
export const CORE_CLASSES = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
export const OTHER_BOOK_CLASSES = ['artificer'];

export const COMPLEXITY = {
  low: b('Baixa', 'Low'),
  average: b('Média', 'Average'),
  high: b('Alta', 'High'),
};

/** Selo "Bom para começar": complexidade baixa na tabela Class Overview do SRD 5.2.1. */
export const isBeginnerClass = (char, classId) => classStart(char, classId)?.complexity === 'low';

const ABILITY = {
  str: b('Força', 'Strength'), dex: b('Destreza', 'Dexterity'), con: b('Constituição', 'Constitution'),
  int: b('Inteligência', 'Intelligence'), wis: b('Sabedoria', 'Wisdom'), cha: b('Carisma', 'Charisma'),
};
export const abilityName = (id, lang) => ABILITY[id]?.[lang === 'pt' ? 'pt' : 'en'] || id;
export const abilityList = (ids, lang) => (ids || []).map(id => abilityName(id, lang)).join(lang === 'pt' ? ' ou ' : ' or ');

const ARMOR_LABEL = {
  light: b('leves', 'light'), medium: b('médias', 'medium'), heavy: b('pesadas', 'heavy'), shield: b('escudo', 'shields'),
};
/** "Armaduras leves e médias; escudo" / "Nenhuma". */
export function armorText(start, lang) {
  const pt = lang === 'pt';
  const k = pt ? 'pt' : 'en';
  const kinds = (start?.armor || []).filter(x => x !== 'shield').map(x => ARMOR_LABEL[x]?.[k] || x);
  const join = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')}${pt ? ' e ' : ' and '}${xs[xs.length - 1]}` : xs[0]);
  const parts = [];
  if (kinds.length) parts.push(pt ? `Armaduras ${join(kinds)}` : `${join(kinds).replace(/^./, c => c.toUpperCase())} armor`);
  if ((start?.armor || []).includes('shield')) parts.push(pt ? 'escudo' : 'shields');
  if (!parts.length) return pt ? 'Nenhuma' : 'None';
  const s = parts.join('; ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Armas simples e marciais" / "Armas simples + espada curta". */
export function weaponText(start, lang) {
  const pt = lang === 'pt';
  const w = start?.weapons || {};
  const parts = [];
  const cats = w.categories || [];
  if (cats.includes('simple') && cats.includes('martial')) parts.push(pt ? 'Armas simples e marciais' : 'Simple and martial weapons');
  else if (cats.includes('simple')) parts.push(pt ? 'Armas simples' : 'Simple weapons');
  else if (cats.includes('martial')) parts.push(pt ? 'Armas marciais' : 'Martial weapons');
  if (w.martialProps?.length) {
    const props = w.martialProps.map(p => ({ light: b('Leve', 'Light'), finesse: b('Acuidade', 'Finesse') }[p]?.[pt ? 'pt' : 'en'] || p));
    parts.push(pt ? `armas marciais com ${props.join(' ou ')}` : `martial weapons with ${props.join(' or ')}`);
  }
  if (w.ids?.length) parts.push(w.ids.map(id => tName('weapon', id, pt ? 'pt' : 'en')).join(', '));
  if (!parts.length) return pt ? 'Nenhuma' : 'None';
  return parts.join('; ');
}

const TOOL_CHOICE = {
  instrument: b('instrumento musical', 'musical instrument'),
  artisan: b('ferramenta de artesão', "artisan's tool"),
  artisanOrInstrument: b('ferramenta de artesão ou instrumento musical', "artisan's tool or musical instrument"),
};
/** Plural das categorias ("3 instrumentos musicais"). */
const TOOL_CHOICE_PLURAL = {
  instrument: b('instrumentos musicais', 'musical instruments'),
  artisan: b('ferramentas de artesão', "artisan's tools"),
  artisanOrInstrument: b('ferramentas de artesão ou instrumentos musicais', "artisan's tools or musical instruments"),
};
/** "Ferramentas de Ladrão; escolha 1 ferramenta de artesão" / "Nenhuma". */
export function toolText(start, lang) {
  const pt = lang === 'pt';
  const t = start?.tools || {};
  const parts = [];
  if (t.fixed?.length) parts.push(t.fixed.map(id => toolName(id, lang)).join(', '));
  if (t.choose) {
    const table = t.choose > 1 ? TOOL_CHOICE_PLURAL : TOOL_CHOICE;
    const cat = (table[t.category] || TOOL_CATEGORIES[t.category] || b(t.choose > 1 ? 'ferramentas' : 'ferramenta', t.choose > 1 ? 'tools' : 'tool'))[pt ? 'pt' : 'en'];
    parts.push(pt ? `escolha ${t.choose} ${cat}` : `choose ${t.choose} ${cat}`);
  }
  if (!parts.length) return pt ? 'Nenhuma' : 'None';
  const s = parts.join('; ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Resumo da magia da classe no nível 1 para o cartão de detalhes: { pt, en } ou null.
 * Classes de 2014 que preparam pelo atributo (Clérigo, Druida, Mago, Artífice)
 * mostram a regra ("depende do atributo"), não um número calculado com os
 * atributos ainda vazios.
 */
export function classSpellSummary(char, classId = char?.className) {
  const s = classStart(char, classId)?.spells;
  if (!s) return null;
  if (s.note) return s.note;
  const sp = startingSpells(char, classId);
  if (sp.mode === 'none' && !sp.cantrips && !sp.prepared) return null;
  const pt = [];
  const en = [];
  if (sp.cantrips) { pt.push(plural(sp.cantrips, 'truque', 'truques')); en.push(plural(sp.cantrips, 'cantrip', 'cantrips')); }
  const f = s.preparedFormula;
  if (f) {
    const add = Math.floor((char?.level || 1) * f.levelMult);
    const ab = abilityName(f.ability, 'pt');
    const abEn = abilityName(f.ability, 'en');
    const plus = add ? ` + ${add}` : '';
    pt.push(`magias de 1º círculo preparadas: depende do atributo (modificador de ${ab}${plus}, mínimo 1; normalmente ${add + 2} ou ${add + 3})`);
    en.push(`prepared level 1 spells: depends on your ability (${abEn} modifier${plus}, minimum 1; usually ${add + 2} or ${add + 3})`);
  } else if (sp.prepared) {
    pt.push(plural(sp.prepared, 'magia de 1º círculo', 'magias de 1º círculo'));
    en.push(plural(sp.prepared, 'level 1 spell', 'level 1 spells'));
  }
  if (sp.spellbook) { pt.push(`grimório com ${sp.spellbook}`); en.push(`spellbook with ${sp.spellbook}`); }
  return b(pt.join(', '), en.join(', '));
}

/** PV no nível 1 = dado de vida máximo + modificador de Constituição. */
export const level1Hp = (start) => start?.hitDie || 0;

/** Traços de nível 1 da classe na regra da ficha: [{ name: {pt,en}, desc: {pt,en} }]. */
export function classFeaturesL1(char, classId) {
  if (rv(char) === '2014') {
    const c = (SRD.CLASSES || []).find(x => x.id === classId);
    if (c?.features?.length) return c.features.map(f => ({ name: f.name, desc: f.desc }));
  }
  try {
    const p = computeProgression({
      rulesVersion: rv(char), className: classId, level: 1, subclass: '', classOptions: [], feats: [], spells: [],
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    });
    return (p.features || []).filter(f => f.level === 1 && f.source === 'class')
      .map(f => ({ name: b(f.name, f.nameEn || f.name), desc: b(f.desc, f.descEn || f.desc) }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Subclasse (só quando a regra pede no nível 1)
// ---------------------------------------------------------------------------
export const SUBCLASS_LABEL = {
  barbarian: b('Caminho Primitivo', 'Primal Path'),
  bard: b('Colégio de Bardo', 'Bard College'),
  cleric: b('Domínio Divino', 'Divine Domain'),
  druid: b('Círculo Druídico', 'Druid Circle'),
  fighter: b('Arquétipo Marcial', 'Martial Archetype'),
  monk: b('Tradição Monástica', 'Monastic Tradition'),
  paladin: b('Juramento Sagrado', 'Sacred Oath'),
  ranger: b('Arquétipo de Patrulheiro', 'Ranger Archetype'),
  rogue: b('Arquétipo de Ladino', 'Roguish Archetype'),
  sorcerer: b('Origem Feiticeira', 'Sorcerous Origin'),
  warlock: b('Patrono Sobrenatural', 'Otherworldly Patron'),
  wizard: b('Tradição Arcana', 'Arcane Tradition'),
  artificer: b('Especialização de Artífice', 'Artificer Specialist'),
};
/** Uma frase do que a subclasse significa para quem está começando. */
export const SUBCLASS_INTRO = {
  cleric: b('Clérigos de 2014 escolhem já no nível 1 o aspecto do deus que servem. Ele dá magias extras e, às vezes, treino com armaduras.',
    'In 2014, clerics pick the aspect of their god at level 1. It grants extra spells and sometimes armor training.'),
  sorcerer: b('Feiticeiros de 2014 escolhem já no nível 1 de onde vem sua magia. Isso dá poderes extras desde o começo.',
    'In 2014, sorcerers pick the source of their magic at level 1. It grants extra powers from the start.'),
  warlock: b('Bruxos de 2014 escolhem já no nível 1 o ser com quem fizeram o pacto. Ele dá poderes e magias extras.',
    'In 2014, warlocks pick the being they made a pact with at level 1. It grants extra powers and spells.'),
};
/** Subclasses sugeridas para iniciantes (livro básico, fáceis de usar). */
export const RECOMMENDED_SUBCLASS = { cleric: 'life', sorcerer: 'draconic', warlock: 'fiend' };

const CORE_SOURCES = new Set([undefined, null, '', 'SRD', 'PHB', 'PHB24']);
export const isCoreSubclass = (sub) => CORE_SOURCES.has(sub?.source);

/** A subclasse é escolhida no nível atual (só 2014: Clérigo, Feiticeiro, Bruxo no nível 1)? */
export function needsSubclass(char, classId = char?.className) {
  if (!classId) return false;
  const view = { ...char, className: classId };
  if ((char.level || 1) < Utils.subclassLevel(view)) return false;
  return subclassesFor(view, classId).length > 0;
}

export const subclassList = (char, classId = char?.className) => (classId ? subclassesFor({ ...char, className: classId }, classId) : []);

/** Pendências da etapa Classe. */
export function classIssues(char) {
  if (!char?.className) return [b('Escolha uma classe para continuar.', 'Pick a class to continue.')];
  const start = classStart(char);
  if (!start) return [b('Essa classe não existe nesta regra. Escolha outra.', "That class doesn't exist in these rules. Pick another one.")];
  if (needsSubclass(char)) {
    const label = SUBCLASS_LABEL[char.className] || b('Subclasse', 'Subclass');
    const subs = subclassList(char);
    if (!char.subclass) {
      return [b(`Escolha seu ${label.pt} (a subclasse). Nas regras de 2014, essa escolha é feita já no nível 1.`,
        `Pick your ${label.en} (subclass). In the 2014 rules this choice happens at level 1.`)];
    }
    if (!subs.some(s => s.id === char.subclass)) return [b(`Escolha de novo seu ${label.pt}.`, `Pick your ${label.en} again.`)];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Trocar de classe / subclasse: limpar o que depende delas
// ---------------------------------------------------------------------------

/** Tira armas, armadura, escudo, itens e ouro do pacote da classe (mesma conta da etapa Equipamento). */
export const stripClassPack = (char) => dropPack(char, 'classPack');

/** Magias que vieram de outra fonte (talento, espécie) e sobrevivem à troca de classe. */
const keepsSpell = (s) => s && typeof s === 'object' && ['feat', 'species', 'race', 'background', 'origin'].includes(s.source || s.origin || s.from);

/** Patch completo ao escolher a classe `classId` (limpa o que dependia da anterior). */
export function selectClass(char, classId) {
  if (char.className === classId) return {};
  const start = classStart(char, classId);
  const others = otherSkillSources(char);
  const oldTools = classStart(char)?.tools || {};
  const bgTools = backgroundStart(char)?.tool?.fixed || [];
  const oldClassTools = new Set([...(oldTools.fixed || []), ...(oldTools.from || [])]);
  const patch = {
    className: classId,
    subclass: '', landType: '', starFormType: '',
    classOptions: [],
    skillProfs: (char.skillProfs || []).filter(id => others[id]),
    skillExpertise: [],
    spells: (char.spells || []).filter(keepsSpell),
    saveProfs: [...(start?.saves || [])],
    ...stripClassPack(char),
  };
  // Troca de classe depois de já ter mexido nos atributos: avisa que eles eram para a classe anterior.
  const c0 = char.creation || {};
  const touchedAbilities = !!(c0.abilityMethod || (c0.abilityAssign && Object.keys(c0.abilityAssign).length)
    || c0.abilityBonus || c0.abilityRolls);
  const creation = { ...(patch.creation || c0) };
  if (char.className && touchedAbilities) creation.classChangedFrom = creation.classChangedFrom || char.className;
  if (creation.classChangedFrom === classId) delete creation.classChangedFrom;
  patch.creation = creation;
  if (Array.isArray(char.toolProfs)) patch.toolProfs = char.toolProfs.filter(t => !oldClassTools.has(t) || bgTools.includes(t));
  // Idioma extra do Ladino 2024 (Gíria de Ladrão): sai junto com a classe.
  if (char.className === 'rogue' || classId === 'rogue') {
    const next = { ...char, ...patch };
    if (Array.isArray(char.languages)) patch.languages = Utils.trimLanguages(next);
  }
  return withAutoPicks({ ...char, ...patch }, patch);
}

/** Patch ao escolher a subclasse: zera escolhas que dependiam da anterior. */
/**
 * Classe anterior quando o jogador trocou de classe depois de já ter definido
 * atributos (os valores foram pensados para ela). null se não houver aviso.
 */
export function classChangeNotice(char) {
  const from = char?.creation?.classChangedFrom;
  return from && from !== char.className ? from : null;
}

/** Patch que dispensa o aviso de troca de classe. */
export function dismissClassChange(char) {
  const creation = { ...(char.creation || {}) };
  delete creation.classChangedFrom;
  return { creation };
}

export function selectSubclass(char, subId) {
  if (char.subclass === subId) return {};
  const next = { ...char, subclass: subId, landType: '', starFormType: '' };
  const classOptions = pruneClassOptions(next);
  return withAutoPicks({ ...next, classOptions }, { subclass: subId, landType: '', starFormType: '', classOptions });
}

// ---------------------------------------------------------------------------
// Escolhas da classe (classOptions)
// ---------------------------------------------------------------------------
/** Pools mostrados juntos (mesmas opções, sem repetir): instrumentos do Bardo. */
const GROUPS = [['musicalInstrument', 'musicalInstrumentStart']];

/** Para onde vai uma vaga: 'skills' (Especialização), 'languages' (idioma do Ladino 2024) ou null (aqui). */
export function poolStep(classId, pool) {
  const def = optionPool(classId, pool);
  if (def?.kind === 'skill' && def.filter?.proficient) return 'skills';
  if (classId === 'rogue' && pool === 'language') return 'languages';
  return null;
}

const level = (char) => char.level || 1;
const slotsOf = (char) => (char.className ? optionSlots({ ...char, classOptions: char.classOptions || [] }, char.className, level(char)) : {});

/**
 * Grupos de escolha da classe neste nível:
 * [{ key, pools: [ids], name, total, picks: [pick], step }]
 */
export function choiceGroups(char) {
  const cls = char?.className;
  if (!cls) return [];
  const slots = slotsOf(char);
  const seen = new Set();
  const out = [];
  for (const pool of Object.keys(slots)) {
    if (seen.has(pool)) continue;
    const group = GROUPS.find(g => g.includes(pool))?.filter(p => slots[p]) || [pool];
    group.forEach(p => seen.add(p));
    const def = optionPool(cls, group[0]);
    out.push({
      key: group.join('+'),
      pools: group,
      name: def?.name || b(pool, pool),
      total: group.reduce((n, p) => n + (slots[p]?.total || 0), 0),
      picks: group.flatMap(p => picksOf(char, cls, p)),
      step: poolStep(cls, group[0]),
    });
  }
  return out;
}

/** Opções escolhíveis de um grupo (com eligible/taken; esconde armas de fogo do DMG). */
export function groupOptions(char, group) {
  const cls = char.className;
  const base = { ...char, classOptions: (char.classOptions || []).filter(p => !(p.classId === cls && group.pools.includes(p.pool))) };
  const pending = group.picks.map(p => ({ pool: group.pools[0], id: p.id, classId: cls }));
  const list = poolOptions(base, cls, group.pools[0], pending, level(char));
  const mine = new Set(group.picks.map(p => p.id));
  return list
    .filter(o => mine.has(o.id) || o.source !== 'DMG24')
    .map(o => ({ ...o, chosen: mine.has(o.id), eligible: mine.has(o.id) || o.eligible }));
}

/** Grava as escolhas `ids` de um grupo (distribuídas pelos pools do grupo). Retorna { classOptions }. */
export function setGroupPicks(char, group, ids) {
  const cls = char.className;
  const old = new Map(group.picks.map(p => [p.id, p]));
  const keep = (char.classOptions || []).filter(p => !(p.classId === cls && group.pools.includes(p.pool)));
  const slots = optionSlots({ ...char, classOptions: keep }, cls, level(char));
  const adds = [];
  let i = 0;
  for (const pool of group.pools) {
    const cap = slots[pool]?.total || 0;
    for (const id of uniq(ids).slice(i, i + cap)) adds.push({ pool, id, ...(old.get(id)?.detail ? { detail: old.get(id).detail } : {}) });
    i += cap;
  }
  const next = applyOptionPicks({ ...char, classOptions: keep }, cls, { adds }, level(char));
  return { classOptions: pruneClassOptions(next) };
}

/** Liga/desliga uma opção num grupo. Não passa do limite. */
export function toggleGroupPick(char, group, id) {
  const ids = group.picks.map(p => p.id);
  if (ids.includes(id)) return setGroupPicks(char, group, ids.filter(x => x !== id));
  if (ids.length >= group.total) {
    // Vaga única: troca direto (mais simples para quem está começando).
    if (group.total === 1) return setGroupPicks(char, group, [id]);
    return {};
  }
  return setGroupPicks(char, group, [...ids, id]);
}

/** Texto curto (detail) de uma escolha, ex.: as duas raças do Inimigo Favorito "Humanoides". */
export function setPickDetail(char, pool, id, detail) {
  return {
    classOptions: (char.classOptions || []).map(p => (p.classId === char.className && p.pool === pool && p.id === id
      ? { ...p, detail: String(detail || '').slice(0, 120) } : p)),
  };
}

/** Tira escolhas de outras classes e as que passaram do número de vagas. */
export function pruneClassOptions(char) {
  const cls = char.className;
  let list = (char.classOptions || []).filter(p => p && p.classId === cls);
  for (let guard = 0; guard < 5; guard++) {
    const slots = optionSlots({ ...char, classOptions: list }, cls, level(char));
    const count = {};
    const next = list.filter(p => {
      count[p.pool] = (count[p.pool] || 0) + 1;
      return count[p.pool] <= (slots[p.pool]?.total || 0);
    });
    if (next.length === list.length) break;
    list = next;
  }
  return list;
}

/** Preenche sozinho grupos sem escolha real (ex.: proficiências do domínio 2014: uma só opção). */
export function withAutoPicks(char, patch = {}) {
  let cur = { ...char, ...patch };
  for (const g of choiceGroups(cur)) {
    if (g.step || g.picks.length >= g.total) continue;
    const eligible = groupOptions(cur, g).filter(o => o.eligible && !o.chosen && !o.detail);
    const room = g.total - g.picks.length;
    const kind = optionPool(cur.className, g.pools[0])?.kind;
    if (!kind && eligible.length > 0 && eligible.length <= room) {
      cur = { ...cur, ...setGroupPicks(cur, g, [...g.picks.map(p => p.id), ...eligible.map(o => o.id)]) };
    }
  }
  return cur.classOptions === char.classOptions ? patch : { ...patch, classOptions: cur.classOptions };
}

/** Uma frase simples sobre cada tipo de escolha. */
export const POOL_INTRO = {
  weaponMastery: b('Escolha tipos de arma em que você é mestre: ao atacar com elas, você ganha um efeito extra (derrubar, empurrar, atrasar…). Dá para trocar depois de um descanso longo.',
    'Pick weapon kinds you have mastered: attacking with them adds an extra effect (topple, push, slow…). You can swap after a long rest.'),
  fightingStyle: b('Um jeito de lutar em que você é melhor. Se estiver em dúvida, Defesa (+1 na CA) funciona com qualquer arma.',
    'A way of fighting you excel at. If unsure, Defense (+1 AC) works with any weapon.'),
  divineOrder: b('Que tipo de clérigo você é: um guerreiro protetor de armadura pesada ou um estudioso com um truque a mais.',
    'What kind of cleric you are: a heavily armored protector or a scholar with an extra cantrip.'),
  primalOrder: b('Que tipo de druida você é: um guardião que luta de armadura ou um mágico com um truque a mais.',
    'What kind of druid you are: an armored warden or a magician with an extra cantrip.'),
  invocation: b('Um poder estranho que o seu patrono te deu. Algumas só podem ser escolhidas em níveis maiores.',
    'A strange power granted by your patron. Some can only be picked at higher levels.'),
  tool: b('Seu monge ganha treino (proficiência) numa ferramenta de ofício ou num instrumento musical. Escolha o que combina com a história do personagem.',
    'Your monk gains proficiency with one trade tool or musical instrument. Pick what fits your character\'s story.'),
  musicalInstrument: b('Instrumentos que seu bardo sabe tocar (você ganha proficiência neles). Escolha os que combinam com o personagem.',
    'Instruments your bard can play (you gain proficiency with them). Pick the ones that fit your character.'),
  artisanTool: b('Além das Ferramentas de Ladrão e de Funileiro, escolha mais uma ferramenta de ofício.',
    "Besides Thieves' and Tinker's Tools, pick one more trade tool."),
  favoredEnemy: b('Um tipo de criatura que você caçou muito: você a rastreia melhor e aprende um idioma dela.',
    'A kind of creature you hunted a lot: you track it better and learn one of its languages.'),
  favoredTerrain: b('O tipo de lugar que você conhece bem: lá você viaja e explora com facilidade.',
    'The kind of place you know well: you travel and explore there with ease.'),
  tceOptional: b('Regra opcional (livro Tasha): o Explorador Hábil troca o Terreno Favorito por especialização e idiomas. Na dúvida, fique com a regra-base.',
    'Optional rule (Tasha): Deft Explorer swaps Favored Terrain for expertise and languages. If unsure, keep the base rule.'),
  dragonAncestor: b('A cor do dragão de quem vem seu poder. Ela decide o tipo de dano dos seus poderes de dragão.',
    'The color of the dragon your power comes from. It sets the damage type of your draconic powers.'),
  legacyDomainProficiencies: b('Treinos que seu domínio dá. Escolhido automaticamente.', 'Training your domain grants. Picked automatically.'),
  expertise: b('Escolha perícias em que você já é treinado: nelas o bônus de proficiência conta em dobro.',
    'Pick skills you are already trained in: your proficiency bonus is doubled for them.'),
  expertise2014: b('Escolha perícias em que você já é treinado (ou Ferramentas de Ladrão): nelas o bônus de proficiência conta em dobro.',
    "Pick skills you are already trained in (or Thieves' Tools): your proficiency bonus is doubled for them."),
};

/** Opções sugeridas a iniciantes, por pool (as primeiras disponíveis). */
const RECOMMENDED = {
  fightingStyle: ['defense'],
  divineOrder: ['protector'],
  primalOrder: ['warden'],
  invocation: ['armorOfShadows'],
  musicalInstrument: ['lute', 'flute', 'lyre'],
  tool: ['flute', 'calligraphersSupplies'],
  artisanTool: ['smithsTools'],
  dragonAncestor: ['redDragon'],
  favoredTerrain: ['forest'],
  favoredEnemy: ['undead'],
  tceOptional: ['naturalExplorer'],
  expertise: ['stealth', 'sleightOfHand', 'perception'],
  expertise2014: ['stealth', 'thievesTools', 'perception'],
};

/** Armas dos pacotes de equipamento da classe: o escolhido (se já houver) ou o primeiro que tem armas. */
export function masteryPack(char) {
  const packs = classStart(char)?.equipment || [];
  const hasWeapons = (p) => (p?.items || []).some(i => i.kind === 'weapon');
  const chosen = packFor(classStart(char), char?.creation?.classPack);
  if (chosen) return chosen;
  return packs.find(hasWeapons) || null;
}

/**
 * Ids recomendados num grupo. Maestria: as armas do pacote de equipamento da
 * classe (o escolhido na etapa Equipamento, ou o primeiro pacote com armas).
 * Escolhas sem recomendação própria recomendam a primeira opção disponível,
 * para o "Na dúvida, fique com as marcadas" sempre ter uma marcada.
 */
export function recommendedIds(char, group) {
  const pool = group.pools[0];
  let ids;
  if (pool === 'weaponMastery') {
    ids = uniq((masteryPack(char)?.items || []).filter(i => i.kind === 'weapon').map(i => i.id));
  } else {
    ids = RECOMMENDED[pool] || [];
  }
  if (group.step) return ids;
  let opts = [];
  try { opts = groupOptions(char, group); } catch { opts = []; }
  if (!opts.length) return ids;
  const ok = new Set(opts.filter(o => o.eligible || o.chosen).map(o => o.id));
  const valid = ids.filter(id => ok.has(id));
  if (valid.length) return valid;
  const first = opts.find(o => o.eligible && !o.detail) || opts.find(o => o.eligible);
  return first ? [first.id] : [];
}

/**
 * Maestrias escolhidas em armas que não estão no pacote de equipamento da
 * classe escolhido (ex.: maestria em Machado Grande e pacote "só ouro").
 * Para a etapa Equipamento/Revisão avisar. [] se não houver pacote escolhido.
 */
export function masteryMismatch(char) {
  const cls = char?.className;
  if (!cls || !char?.creation?.classPack) return [];
  const pack = packFor(classStart(char), char.creation.classPack);
  if (!pack) return [];
  const have = new Set([
    ...(pack.items || []).filter(i => i.kind === 'weapon').map(i => i.id),
    ...(char.weapons || []).map(w => w?.id || w?.weaponId).filter(Boolean),
  ]);
  return (char.classOptions || []).filter(p => p.classId === cls && p.pool === 'weaponMastery' && !have.has(p.id)).map(p => p.id);
}

/** Pendências de escolhas da classe feitas numa etapa (null = classChoices, 'skills'). */
function groupIssues(char, step) {
  const out = [];
  const cls = char.className;
  for (const g of choiceGroups(char).filter(x => x.step === step)) {
    const name = g.name;
    const missing = g.total - g.picks.length;
    if (missing > 0) {
      out.push(b(`Escolha mais ${missing} em "${name.pt}".`, `Pick ${missing} more in "${name.en}".`));
    }
    for (const p of g.picks) {
      const def = optionPool(cls, p.pool);
      const o = !def?.kind ? findOption(cls, p.pool, p.id) : null;
      if (o?.detail && !String(p.detail || '').trim()) {
        out.push(b(`Escreva o detalhe de "${o.name.pt}" (${o.detail.pt}).`, `Fill in the detail for "${o.name.en}" (${o.detail.en}).`));
      }
    }
  }
  return out;
}

/** Pendências da etapa Escolhas da classe. */
export function classChoiceIssues(char) {
  if (!char?.className) return [];
  const out = groupIssues(char, null);
  const mine = (char.classOptions || []).filter(p => p.classId === char.className && !poolStep(char.className, p.pool));
  if (mine.length) {
    const check = validateOptionPicks({ ...char, classOptions: [] }, char.className, { adds: mine.map(p => ({ pool: p.pool, id: p.id, detail: p.detail })) }, level(char));
    if (!check.valid) {
      out.push(b(`Alguma escolha não vale mais: ${check.issues.join('; ')}. Troque-a.`, 'Some choice is no longer valid. Please swap it.'));
    }
  }
  return out;
}

/** Grupo sem escolha real (uma só opção possível por vaga): preenchido sozinho. */
export function isAutoGroup(char, group) {
  if (group.step || optionPool(char.className, group.pools[0])?.kind) return false;
  return groupOptions(char, group).filter(o => o.eligible).length <= group.total;
}

/** A etapa Escolhas da classe aparece? (só se houver algo a escolher nela). */
export const hasClassChoices = (char) => choiceGroups(char).some(g => !g.step && !isAutoGroup(char, g));

// ---------------------------------------------------------------------------
// Perícias
// ---------------------------------------------------------------------------
/** O que cada perícia é, em uma linha (resumo próprio). */
export const SKILL_HINTS = {
  acrobatics: b('Equilíbrio, cambalhotas e manobras ágeis.', 'Balance, flips and nimble moves.'),
  animalHandling: b('Acalmar, guiar e montar animais.', 'Calm, guide and ride animals.'),
  arcana: b('Saber sobre magia e objetos mágicos.', 'Knowledge of magic and magic items.'),
  athletics: b('Escalar, nadar, saltar e empurrar com força.', 'Climb, swim, jump and shove.'),
  deception: b('Mentir e enganar de forma convincente.', 'Lie and trick convincingly.'),
  history: b('Lembrar fatos de reinos, guerras e lendas.', 'Recall kingdoms, wars and legends.'),
  insight: b('Perceber se alguém mente ou o que sente.', 'Tell if someone lies or how they feel.'),
  intimidation: b('Assustar ou pressionar alguém.', 'Scare or pressure someone.'),
  investigation: b('Procurar pistas e deduzir como algo funciona.', 'Search for clues and figure things out.'),
  medicine: b('Socorrer feridos e entender doenças.', 'Tend the wounded and understand illness.'),
  nature: b('Conhecer plantas, animais e clima.', 'Know plants, animals and weather.'),
  perception: b('Notar coisas: passos, emboscadas, detalhes. Uma das mais usadas.', 'Notice things: footsteps, ambushes, details. One of the most used.'),
  performance: b('Cantar, dançar, atuar e entreter.', 'Sing, dance, act and entertain.'),
  persuasion: b('Convencer com gentileza e bons argumentos.', 'Convince with tact and good arguments.'),
  religion: b('Saber sobre deuses, cultos e o sagrado.', 'Knowledge of gods, cults and the holy.'),
  sleightOfHand: b('Mãos leves: bater carteiras, esconder objetos.', 'Light fingers: pick pockets, hide objects.'),
  stealth: b('Passar sem ser visto nem ouvido.', 'Move without being seen or heard.'),
  survival: b('Rastrear, caçar e se orientar na natureza.', 'Track, hunt and find your way in the wild.'),
};

/** Sugestões de perícias por classe (para iniciante). */
// Em ordem de preferência; as do fim são substitutas quando o antecedente já dá
// uma das primeiras (a lista evita as perícias dos antecedentes mais comuns da classe).
const RECOMMENDED_SKILLS = {
  barbarian: ['perception', 'survival', 'athletics', 'intimidation', 'nature', 'animalHandling'],
  bard: ['persuasion', 'perception', 'insight', 'deception', 'performance', 'stealth'],
  cleric: ['medicine', 'persuasion', 'history', 'insight', 'religion'],
  druid: ['perception', 'medicine', 'nature', 'survival', 'insight', 'animalHandling'],
  fighter: ['acrobatics', 'perception', 'insight', 'survival', 'athletics', 'intimidation'],
  monk: ['acrobatics', 'insight', 'athletics', 'stealth', 'religion', 'history'],
  paladin: ['athletics', 'insight', 'medicine', 'intimidation', 'persuasion', 'religion'],
  ranger: ['perception', 'survival', 'athletics', 'insight', 'stealth', 'nature', 'investigation', 'animalHandling'],
  rogue: ['perception', 'acrobatics', 'investigation', 'insight', 'stealth', 'sleightOfHand', 'persuasion', 'athletics'],
  sorcerer: ['persuasion', 'insight', 'arcana', 'deception', 'intimidation', 'religion'],
  warlock: ['deception', 'intimidation', 'arcana', 'investigation', 'history', 'nature'],
  wizard: ['investigation', 'insight', 'arcana', 'medicine', 'history', 'religion'],
  artificer: ['investigation', 'perception', 'arcana', 'medicine', 'history', 'sleightOfHand'],
};
/**
 * Perícias sugeridas (já na quantidade da classe), sem as que vêm de outra
 * fonte (antecedente, espécie…): ao voltar depois de escolher o antecedente,
 * as substitutas aparecem como "Recomendado". As já escolhidas e válidas contam
 * primeiro, para a sugestão completar o que falta.
 */
export const recommendedSkills = (char) => {
  const from = classSkillList(char);
  const others = otherSkillSources(char);
  const ok = (id) => from.includes(id) && !others[id];
  const base = (RECOMMENDED_SKILLS[char?.className] || []).filter(ok);
  const rest = from.filter(id => ok(id) && !base.includes(id));
  return [...base, ...rest].slice(0, classSkillCount(char));
};

/** Lista e quantidade de perícias da classe na regra da ficha (start-data). */
export const classSkillList = (char) => classStart(char)?.skills?.from || [];
export const classSkillCount = (char) => classStart(char)?.skills?.count || 0;

export const SKILL_SOURCE = {
  background: b('do antecedente', 'from background'),
  species: b('da espécie', 'from species'),
  feat: b('do talento', 'from feat'),
  classOption: b('de uma escolha de classe', 'from a class choice'),
};

/** Perícias que já vêm de outra fonte: { [skillId]: 'background'|'species'|'feat'|'classOption' }. */
export function otherSkillSources(char) {
  const out = {};
  const put = (ids, src) => (ids || []).forEach(id => { if (!out[id]) out[id] = src; });
  put(Utils.backgroundSkills(char), 'background');
  let species = [];
  try { species = Utils.speciesGrants(char)?.skills || []; } catch { species = []; }
  put(species, 'species');
  put(originFeatSkills(char), 'feat');
  let grants = [];
  try { grants = char.className ? (Utils.classGrants(char)?.skills || []) : []; } catch { grants = []; }
  put(grants.filter(id => !out[id]), 'classOption');
  return out;
}

/** Perícias escolhidas pela classe (da lista dela e que não vêm de outra fonte). */
export function classSkillPicks(char) {
  const from = classSkillList(char);
  const others = otherSkillSources(char);
  return uniq((char.skillProfs || []).filter(id => from.includes(id) && !others[id]));
}

/**
 * Perícias que o próprio jogador marcou em skillProfs (sem as que o
 * antecedente acrescentou: creation.bgSkillsAdded).
 */
function playerSkillMarks(char) {
  const added = Array.isArray(char?.creation?.bgSkillsAdded) ? char.creation.bgSkillsAdded : [];
  return (char?.skillProfs || []).filter(id => !added.includes(id));
}

/** Marcadas na classe, mas que agora vêm de outra fonte (ex.: o antecedente dá a mesma). */
export function overlappingSkills(char) {
  const from = classSkillList(char);
  const others = otherSkillSources(char);
  return uniq(playerSkillMarks(char).filter(id => from.includes(id) && others[id]));
}

/** "Atletismo" / "Atletismo e Percepção" / "A, B e C". */
export function joinNames(names, lang) {
  const and = lang === 'pt' ? ' e ' : ' and ';
  return names.length > 1 ? `${names.slice(0, -1).join(', ')}${and}${names[names.length - 1]}` : (names[0] || '');
}

/**
 * Frase sobre perícias repetidas, agrupadas por fonte, com concordância:
 * "Atletismo e Percepção já vêm do antecedente." Retorna { pt, en } ou null.
 */
export function overlapSentence(char, ids = overlappingSkills(char)) {
  if (!ids.length) return null;
  const others = otherSkillSources(char);
  const bySrc = {};
  for (const id of ids) (bySrc[others[id] || 'other'] ||= []).push(id);
  const part = (lang) => Object.entries(bySrc).map(([src, list]) => {
    const names = joinNames(list.map(id => tName('skill', id, lang)), lang);
    const from = SKILL_SOURCE[src]?.[lang] || (lang === 'pt' ? 'de outra fonte' : 'from another source');
    return lang === 'pt' ? `${names} já ${list.length > 1 ? 'vêm' : 'vem'} ${from}` : `${names} already ${list.length > 1 ? 'come' : 'comes'} ${from}`;
  }).join('; ');
  return b(`${part('pt')}.`, `${part('en')}.`);
}

/** Liga/desliga uma perícia de classe. Retorna o patch (também limpa Especialização inválida). */
export function toggleClassSkill(char, id) {
  const from = classSkillList(char);
  const others = otherSkillSources(char);
  if (!from.includes(id) || others[id]) return {};
  // Limpa marcas antigas do jogador que agora vêm de outra fonte (não contam mais).
  // As que o antecedente acrescentou ficam (são dele).
  const overlap = overlappingSkills(char);
  const base = (char.skillProfs || []).filter(s => !overlap.includes(s));
  const picks = classSkillPicks(char);
  let skillProfs;
  if (picks.includes(id)) skillProfs = base.filter(s => s !== id);
  else if (picks.length < classSkillCount(char)) skillProfs = [...base, id];
  else return {};
  const next = { ...char, skillProfs };
  const classOptions = pruneExpertise(next);
  return classOptions === char.classOptions ? { skillProfs } : { skillProfs, classOptions };
}

/** Perícias em que a ficha é treinada (sem contar as que vêm da própria Especialização). */
export function proficientSkills(char) {
  return uniq([...classSkillPicks(char), ...Object.keys(otherSkillSources(char))]);
}

/** Tira Especialização em perícias em que a ficha não é mais treinada. */
export function pruneExpertise(char) {
  const cls = char.className;
  const prof = new Set(proficientSkills(char));
  const list = char.classOptions || [];
  const next = list.filter(p => {
    if (p.classId !== cls || poolStep(cls, p.pool) !== 'skills') return true;
    const def = optionPool(cls, p.pool);
    return prof.has(p.id) || (def?.filter?.tools || []).includes(p.id);
  });
  return next.length === list.length ? list : next;
}

/** Grupos de Especialização feitos na etapa de perícias. */
export const expertiseGroups = (char) => choiceGroups(char).filter(g => g.step === 'skills');

/** Opções de Especialização: perícias treinadas (+ ferramentas permitidas). */
export function expertiseOptions(char, group) {
  const def = optionPool(char.className, group.pools[0]);
  const prof = proficientSkills(char);
  const chosen = new Set(group.picks.map(p => p.id));
  const skills = SRD.SKILLS.map(s => s.id).filter(id => prof.includes(id) || chosen.has(id))
    .map(id => ({ id, name: b(tName('skill', id, 'pt'), tName('skill', id, 'en')), tool: false }));
  const tools = (def?.filter?.tools || []).map(id => ({ id, name: b(toolName(id, 'pt'), toolName(id, 'en')), tool: true }));
  return [...skills, ...tools].map(o => ({ ...o, chosen: chosen.has(o.id) }));
}

/** Pendências da etapa Perícias. */
export function skillsIssues(char) {
  if (!char?.className || !classStart(char)) return [];
  const out = [];
  const need = classSkillCount(char);
  const picks = classSkillPicks(char);
  const overlap = overlappingSkills(char);
  const others = otherSkillSources(char);
  const from = classSkillList(char);
  const stray = (char.skillProfs || []).filter(id => !from.includes(id) && !others[id]);
  for (const id of stray) {
    out.push(b(`${tName('skill', id, 'pt')} não está na lista da sua classe. Desmarque essa perícia.`,
      `${tName('skill', id, 'en')} is not on your class list. Unselect that skill.`));
  }
  if (picks.length < need) {
    const n = need - picks.length;
    const s = overlapSentence(char, overlap);
    const many = overlap.length > 1;
    const dup = s
      ? b(` (${s.pt.slice(0, -1)}; troque por ${many ? 'outras' : 'outra'})`, ` (${s.en.slice(0, -1)}; pick ${many ? 'others' : 'another'})`)
      : b('', '');
    out.push(b(`Escolha mais ${plural(n, 'perícia', 'perícias')} da lista da classe${dup.pt}.`,
      `Pick ${plural(n, 'more skill', 'more skills')} from your class list${dup.en}.`));
  } else if (picks.length > need) {
    const n = picks.length - need;
    out.push(b(`Você marcou ${plural(n, 'perícia', 'perícias')} a mais. Desmarque ${n} (o limite é ${need}).`,
      `You picked ${plural(n, 'skill', 'skills')} too many. Unselect ${n} (the limit is ${need}).`));
  }
  return out;
}

/**
 * Pendências da Especialização (Ladino). Ela é escolhida na etapa Antecedente,
 * depois que as perícias do antecedente já existem (qualquer perícia treinada vale).
 */
export function expertiseIssues(char) {
  if (!char?.className || !classStart(char)) return [];
  const out = [];
  for (const g of expertiseGroups(char)) {
    const def = optionPool(char.className, g.pools[0]);
    const valid = new Set([...proficientSkills(char), ...(def?.filter?.tools || [])]);
    const bad = g.picks.filter(p => !valid.has(p.id));
    if (bad.length) {
      out.push(b(`Especialização só vale em perícia treinada: desmarque ${bad.map(p => tName('skill', p.id, 'pt')).join(', ')}.`,
        `Expertise only works on a trained skill: unselect ${bad.map(p => tName('skill', p.id, 'en')).join(', ')}.`));
    }
    const missing = g.total - g.picks.length;
    if (missing > 0) {
      out.push(b(`Escolha mais ${missing} em "Especialização" (abaixo do antecedente).`, `Pick ${missing} more in "Expertise" (below the background).`));
    }
  }
  return out;
}

/**
 * Ferramentas/instrumentos escolhidos nas escolhas da classe (Bardo, Monge,
 * Artífice): ids de TOOLS. Para a etapa de equipamento resolver itens com
 * `toolChoice: 'class'` e para quem precisar listar char.toolProfs.
 */
export function classToolPicks(char) {
  const cls = char?.className;
  if (!cls) return [];
  return uniq((char.classOptions || []).filter(p => p.classId === cls).flatMap(p => {
    const o = !optionPool(cls, p.pool)?.kind ? findOption(cls, p.pool, p.id) : null;
    return o?.grants?.tools || [];
  }));
}
