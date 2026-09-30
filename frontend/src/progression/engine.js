/**
 * Engine de progressão.
 *
 * Aplica as regras declarativas em PROGRESSION_RULES a uma ficha de personagem.
 * O resultado é uma estrutura `progressionState` separada do `character.data`
 * para que possa ser recomputada (idempotente) sem destruir escolhas do jogador.
 *
 * Princípios:
 *   - O engine NÃO sobrescreve campos que o jogador editou manualmente
 *     (truques aprendidos, magias preparadas). Ele preenche autos e expõe
 *     o que falta escolher.
 *   - É puro: mesma entrada → mesma saída. Sem efeitos colaterais.
 *   - Pode rodar tanto no frontend (preview ao subir de nível) quanto no
 *     backend (validar aprovações).
 */

import { PROGRESSION_RULES, profBonus, rulesFor } from './rules.js';
import {
  isMulticlass, classEntries, classView, classAt, totalLevelFor, withClassLevel, withoutLastClassLevel,
} from './multiclass.js';
import { featGrants } from './feat-rules.js';
import { speciesGrants } from './species.js';
import { classOptionState, validateOptionPicks, applyOptionPicks, revertOptionPicks, optionPool, migrateClassOptions } from './options.js';
import { validateFeatChoice, progHasFightingStyle, featEntry, withFeatAsi } from './feat-rules.js';
import SRD from '../../data/srd.js';
import { SPELLS_2024 } from '../../data/rules2024.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function abilityMod(score) {
  return Math.floor(((score || 10) - 10) / 2);
}

function getAbilityScore(character, ability) {
  const base = character?.abilities?.[ability] || 10;
  const bonus = character?.raceBonus?.[ability] || 0;
  return base + bonus;
}

function computeSpellsPrepared(formula, character) {
  if (typeof formula === 'number') return formula;
  if (typeof formula !== 'string') return 0;
  const level = character.level || 1;
  const map = { 'wis+level': 'wis', 'int+level': 'int', 'cha+level': 'cha' };
  const halfMap = { 'wis+halfLevel': 'wis', 'cha+halfLevel': 'cha', 'int+halfLevel': 'int' };
  if (map[formula]) {
    const mod = abilityMod(getAbilityScore(character, map[formula]));
    return Math.max(1, mod + level);
  }
  if (halfMap[formula]) {
    const mod = abilityMod(getAbilityScore(character, halfMap[formula]));
    return Math.max(1, mod + Math.floor(level / 2));
  }
  return 0;
}

/**
 * Compõe o estado de progressão do personagem.
 *
 * Retorna:
 *   {
 *     classId, level, subclass?,
 *     profBonus,
 *     features: [{level, source: 'class'|'subclass', id, name, desc}],
 *     autoCantrips: [string],         // truques que SEMPRE entram (sobrepostos a escolhidos)
 *     autoSpells: [string],           // sempre preparadas
 *     cantripsKnown: number,          // total esperado
 *     spellsKnown: number?,           // total esperado (classes "known")
 *     spellsPrepared: number?,        // total esperado (classes "prepared")
 *     extraAttacks: number,
 *     fightingStyles: number,         // total acumulado de estilos a escolher
 *     expertiseSlots: number,         // total acumulado
 *     asiLevels: number[],            // níveis em que tem ASI/feat
 *     pendingChoices: [{level, type, reason}],   // o que o jogador precisa decidir
 *   }
 */
export function computeProgression(character) {
  if (isMulticlass(character)) return computeMulticlassProgression(character);
  const out = {
    classId: character.className || null,
    level: character.level || 1,
    subclass: character.subclass || null,
    profBonus: profBonus(character.totalLevel || character.level || 1),
    features: [],
    autoCantrips: [],
    autoSpells: [],
    cantripsKnown: 0,
    spellsKnown: 0,
    spellsPrepared: 0,
    extraAttacks: 0,
    fightingStyles: 0,
    expertiseSlots: 0,
    asiLevels: [],
    pendingChoices: [],
    grants: {},
    classOptions: [],
    optionSlots: {},
  };

  const rule = rulesFor(character);
  if (!rule) return out;

  for (let lv = 1; lv <= (character.level || 1); lv++) {
    const node = rule.perLevel?.[lv];
    if (node) applyNode(out, node, lv, 'class');
    if (character.subclass) {
      const subRule = rule.subclassPerLevel?.[character.subclass];
      const subNode = subRule?.[lv];
      if (subNode) applyNode(out, subNode, lv, 'subclass');
      // Druid Land: domain spells dependentes do landType escolhido.
      if (subRule?.landTypeSpells && character.landType) {
        const landSpells = subRule.landTypeSpells[character.landType]?.[lv];
        if (Array.isArray(landSpells)) out.autoSpells.push(...landSpells);
      }
    } else if (rule.perLevel?.[lv]?.subclassChoice) {
      out.pendingChoices.push({ level: lv, type: 'subclass', reason: 'Escolha sua subclasse' });
    }
  }
  // Avisa se for Land sem landType escolhido
  if (character.className === 'druid' && character.subclass === 'land' && !character.landType && (character.level || 0) >= 3) {
    out.pendingChoices.push({ level: 3, type: 'landType', reason: 'Escolha um terreno (Círculo da Terra)' });
  }

  // Resolve fórmulas com base no nível final
  const finalLevel = character.level || 1;
  const finalNodeClass = rule.perLevel?.[finalLevel];
  if (finalNodeClass?.spellsPrepared) {
    out.spellsPrepared = computeSpellsPrepared(finalNodeClass.spellsPrepared.formula, character);
  } else {
    // pega o último node que define spellsPrepared
    for (let lv = finalLevel; lv >= 1; lv--) {
      const n = rule.perLevel?.[lv];
      if (n?.spellsPrepared) {
        out.spellsPrepared = computeSpellsPrepared(n.spellsPrepared.formula, character);
        break;
      }
    }
  }

  // Opções selecionáveis (invocações, metamagia…): pendências e magias concedidas.
  const opts = classOptionState(character);
  out.classOptions = opts.picks.map(({ option, ...p }) => p);
  out.optionSlots = opts.slots;
  // Com pool próprio de estilo de luta/expertise, a pendência genérica antiga sai.
  // (Qualquer pool que conceda expertise conta, ex.: `expertise2014` do ladino.)
  const expertisePool = Object.keys(opts.slots).some(p => p === 'expertise' || optionPool(character.className, p)?.grantAs === 'expertise');
  out.pendingChoices = out.pendingChoices.filter(c => !((c.type === 'fightingStyle' && opts.slots.fightingStyle) || (c.type === 'expertise' && expertisePool)));
  out.pendingChoices.push(...opts.pending);
  // Pools `countsAsKnown` (Segredos Mágicos do bardo 2014): as magias escolhidas entram
  // como automáticas, mas já estão somadas na tabela de magias conhecidas — descontam.
  const known = opts.picks.filter(p => optionPool(character.className, p.pool)?.countsAsKnown).length;
  if (known) out.spellsKnown = Math.max(0, out.spellsKnown - known);
  out.autoSpells.push(...opts.grants.spells);
  out.autoCantrips.push(...opts.grants.cantrips);
  for (const [k, v] of Object.entries(opts.grants)) {
    if (k !== 'spells' && k !== 'cantrips' && v.length) (out.grants[k] ||= []).push(...v);
  }

  // ASI/talento já escolhidos (character.levelChoices[nível]) deixam de ser pendência.
  const done = character.levelChoices || {};
  out.pendingChoices = out.pendingChoices.filter(c => !((c.type === 'asiOrFeat' || c.type === 'epicBoon') && done[c.level]));

  // Dedup autoCantrips/autoSpells
  out.autoCantrips = [...new Set(out.autoCantrips)];
  out.autoSpells = [...new Set(out.autoSpells)];

  return out;
}

/**
 * Multiclasse: roda a progressão de cada classe no nível dela (classView) e
 * junta tudo. Níveis de traços/escolhas voltam a ser o nível TOTAL (chave de
 * levelChoices); `classId`/`classLevel` dizem de onde vieram. Os totais de
 * truques/magias do topo são os da classe inicial; `byClass` tem os de cada uma.
 */
function computeMulticlassProgression(character) {
  const total = character.level || 1;
  const per = classEntries(character).map(entry => ({ entry, prog: computeProgression(classView(character, entry)) }));
  const primary = per[0].prog;
  const toTotal = (id, lv) => totalLevelFor(character, id, lv) || lv;
  const out = {
    ...primary,
    classId: character.className || null,
    level: total,
    subclass: character.subclass || null,
    profBonus: profBonus(total),
    features: [],
    autoCantrips: [],
    autoSpells: [],
    extraAttacks: 0,
    fightingStyles: 0,
    expertiseSlots: 0,
    asiLevels: [],
    pendingChoices: [],
    classOptions: [],
    optionSlots: {},
    grants: {},
    classes: per.map(({ entry }) => entry),
    byClass: Object.fromEntries(per.map(({ entry, prog }) => [entry.id, prog])),
  };
  for (const { entry, prog } of per) {
    const id = entry.id;
    out.features.push(...prog.features.map(f => ({ ...f, classId: id, classLevel: f.level, level: toTotal(id, f.level) })));
    out.autoCantrips.push(...prog.autoCantrips);
    out.autoSpells.push(...prog.autoSpells);
    out.extraAttacks = Math.max(out.extraAttacks, prog.extraAttacks);
    out.fightingStyles += prog.fightingStyles;
    out.expertiseSlots += prog.expertiseSlots;
    out.asiLevels.push(...prog.asiLevels.map(lv => toTotal(id, lv)));
    out.pendingChoices.push(...prog.pendingChoices.map(c => ({ ...c, classId: id, classLevel: c.level, level: toTotal(id, c.level) })));
    out.classOptions.push(...prog.classOptions);
    for (const [k, v] of Object.entries(prog.grants)) (out.grants[k] ||= []).push(...v);
    out.optionSlots[id] = prog.optionSlots;
  }
  out.features.sort((a, b) => a.level - b.level);
  out.asiLevels.sort((a, b) => a - b);
  out.pendingChoices.sort((a, b) => a.level - b.level);
  out.autoCantrips = [...new Set(out.autoCantrips)];
  out.autoSpells = [...new Set(out.autoSpells)];
  return out;
}

function applyNode(out, node, level, source) {
  if (node.features) {
    for (const f of node.features) {
      out.features.push({ level, source, ...f });
    }
  }
  if (node.autoCantrips) out.autoCantrips.push(...node.autoCantrips);
  // Proficiências fixas do nível (armaduras, armas, ferramentas, perícias, idiomas, salvaguardas).
  if (node.grants) for (const [k, v] of Object.entries(node.grants)) (out.grants[k] ||= []).push(...v);
  if (node.autoSpells) out.autoSpells.push(...node.autoSpells);
  if (typeof node.cantripsKnown === 'number') out.cantripsKnown = Math.max(out.cantripsKnown, node.cantripsKnown);
  if (typeof node.spellsKnown === 'number') out.spellsKnown = Math.max(out.spellsKnown, node.spellsKnown);
  if (typeof node.extraAttacks === 'number') out.extraAttacks = Math.max(out.extraAttacks, node.extraAttacks);
  if (typeof node.fightingStyleChoice === 'number') {
    out.fightingStyles += node.fightingStyleChoice;
    out.pendingChoices.push({ level, type: 'fightingStyle', reason: 'Escolha um Estilo de Combate' });
  }
  if (typeof node.expertiseChoice === 'number') {
    out.expertiseSlots += node.expertiseChoice;
    out.pendingChoices.push({ level, type: 'expertise', reason: 'Escolha perícias para Expertise' });
  }
  if (node.asiOrFeat) {
    out.asiLevels.push(level);
    out.pendingChoices.push({ level, type: 'asiOrFeat', reason: 'ASI (+2 ou +1+1) ou Feat' });
  }
  if (node.epicBoon) out.pendingChoices.push({ level, type: 'epicBoon', reason: 'Escolha uma Dádiva Épica ou outro talento elegível' });
}

/**
 * Aplica autos ao objeto data do personagem, retornando uma nova ficha.
 * - Truques automáticos são adicionados a `data.spells` com flag `auto: true`.
 * - Magias auto-preparadas: idem, com `prepared: true, auto: true`.
 * - Não duplica entradas já presentes.
 * - Remove autos que sobraram de subclasses anteriores (caso troquem).
 */
export function applyAutosToCharacter(character) {
  character = migrateClassOptions(character);
  const prog = computeProgression(character);
  const next = { ...character };
  const spells = Array.isArray(next.spells) ? [...next.spells] : [];

  // Normaliza estrutura: pode vir como string ou objeto
  const norm = spells.map(s => typeof s === 'string' ? { id: s, prepared: false } : { ...s });

  // Autos esperados, com a classe de origem (só marcada fora da classe inicial).
  const wanted = [];
  if (prog.byClass) {
    for (const [cls, p] of Object.entries(prog.byClass)) {
      const tag = cls === character.className ? {} : { cls };
      for (const id of [...p.autoCantrips, ...p.autoSpells]) if (!wanted.some(w => w.id === id)) wanted.push({ id, ...tag });
    }
  } else {
    for (const id of [...prog.autoCantrips, ...prog.autoSpells]) if (!wanted.some(w => w.id === id)) wanted.push({ id });
  }

  // Magias e truques concedidos por talentos (Iniciado em Magia, Tocado por Fadas…).
  const fromFeats = featGrants(character);
  for (const id of [...fromFeats.cantrips, ...fromFeats.spells]) if (!wanted.some(w => w.id === id)) wanted.push({ id, feat: true });

  // Truques e magias da espécie/linhagem (as de nível 3 e 5 entram com o nível do personagem).
  const fromSpecies = speciesGrants(character);
  for (const id of [...fromSpecies.cantrips, ...fromSpecies.spells]) if (!wanted.some(w => w.id === id)) wanted.push({ id, species: true });

  // Remove autos antigos que não fazem mais parte do prog
  const validAutoIds = new Set(wanted.map(w => w.id));
  const filtered = norm.filter(s => !s.auto || validAutoIds.has(s.id));

  // Adiciona autos novos
  const existing = new Set(filtered.map(s => s.id));
  for (const w of wanted) {
    if (!existing.has(w.id)) filtered.push({ ...w, prepared: true, auto: true });
  }

  // Magias concedidas ao grimório por escolhas (ex.: Sábio): entram no livro
  // sem preparar e saem se a escolha for desfeita (`fromOption`).
  const bookIds = new Set(prog.grants?.spellbook || []);
  const kept = filtered.filter(s => !s.fromOption || bookIds.has(s.id));
  const have = new Set(kept.map(s => s.id));
  const wizTag = character.className === 'wizard' ? {} : { cls: 'wizard' };
  for (const id of bookIds) if (!have.has(id)) kept.push({ id, inBook: true, prepared: false, fromOption: true, ...wizTag });

  next.spells = kept;
  next.progressionState = prog;
  return next;
}

export const HIT_DIE = {
  barbarian: 12, fighter: 10, paladin: 10, ranger: 10,
  bard: 8, cleric: 8, druid: 8, monk: 8, rogue: 8, warlock: 8, artificer: 8,
  sorcerer: 6, wizard: 6,
};

const scoreWithBonus = (character, k) =>
  ((character.abilities || {})[k] || 10) + ((character.raceBonus || {})[k] || 0);

/** 'asi' (ASI ou talento), 'epic' (só talento/Dádiva Épica) ou null para o nível dado. */
export function levelChoiceKind(character, level) {
  // Multiclasse: o ASI vem do nível da CLASSE que ganhou esse nível total.
  const at = classAt(character, level);
  if (!at) return null;
  const view = classView(character, at.entry);
  const lv = at.classLevel;
  const prog = computeProgression({ ...view, level: Math.max(lv, view.level || 1), levelChoices: {} });
  if (prog.pendingChoices.some(c => c.type === 'epicBoon' && c.level === lv)) return 'epic';
  return prog.asiLevels.includes(lv) ? 'asi' : null;
}

/**
 * Valida a escolha de ASI/talento de um nível. Espelha
 * backend/api/progression/engine.py:validate_level_choice.
 * choice: { type: 'asi', asi: {str: 1, dex: 1} }
 *       | { type: 'feat', feat: 'Nome', featId: 'alert', asi?: {dex: 1}, picks?: {...}, note? }  (catálogo)
 *       | { type: 'feat', feat: 'Nome', note?: '' }  (texto livre / homebrew)
 * opts.ctx: checagens extras de pré-requisito que só a interface sabe fazer (feat-rules.js).
 */
export function validateLevelChoice(character, level, choice, opts = {}) {
  const issues = [];
  const prog = computeProgression({ ...character, levelChoices: {} });
  const epicLevels = prog.pendingChoices.filter(c => c.type === 'epicBoon').map(c => c.level);
  if (!prog.asiLevels.includes(level) && !epicLevels.includes(level)) issues.push('Este nível não concede ASI/talento');
  if ((character.levelChoices || {})[level]) issues.push('Escolha deste nível já registrada');
  if (!choice || !['asi', 'feat'].includes(choice.type)) {
    issues.push('Tipo de escolha inválido');
    return { valid: false, issues };
  }
  if (epicLevels.includes(level) && choice.type !== 'feat') issues.push('Este nível concede uma Dádiva Épica (talento)');
  if (choice.type === 'asi') {
    const asi = choice.asi || {};
    const keys = Object.keys(asi);
    if (keys.some(k => !ABILITIES.includes(k))) issues.push('Atributo inválido');
    const vals = keys.map(k => asi[k]);
    if (vals.some(v => !Number.isInteger(v) || v < 0 || v > 2)) issues.push('Cada atributo recebe 0, +1 ou +2');
    if (vals.reduce((a, b) => a + b, 0) !== 2) issues.push('Distribua exatamente 2 pontos');
    if (keys.some(k => scoreWithBonus(character, k) + asi[k] > 20)) issues.push('Atributo não pode passar de 20');
  } else if (typeof choice.feat !== 'string' || !choice.feat.trim() || choice.feat.length > 120) {
    issues.push('Informe o nome do talento');
  } else if (choice.featId != null) {
    const kind = epicLevels.includes(level) ? 'epic' : 'asi';
    issues.push(...validateFeatChoice(character, level, choice, { kind, hasFightingStyle: progHasFightingStyle(prog), ctx: opts.ctx, cheat: !!opts.cheat }));
  }
  return { valid: issues.length === 0, issues };
}

/**
 * Aplica uma escolha já validada: soma ASI nos atributos-base ou registra o
 * talento em character.feats (talento do catálogo também soma o +1 dele).
 */
export function applyLevelChoice(character, level, choice) {
  let next = { ...character, levelChoices: { ...(character.levelChoices || {}), [level]: choice } };
  if (choice.type === 'asi') {
    next.abilities = { ...(character.abilities || {}) };
    for (const [k, v] of Object.entries(choice.asi || {})) next.abilities[k] = (next.abilities[k] || 10) + v;
  } else {
    if (choice.featId) next = withFeatAsi(next, choice.asi, 1);
    next.feats = [...(character.feats || []), featEntry(choice, level)];
  }
  return next;
}

/**
 * Aplica uma subida de nível completa (fichas locais / fora de campanha).
 * choices: { toLevel, hpGain, choice?, spellsAdded? }
 */
export function applyLevelUpChoices(character, choices) {
  const classId = choices.classId || classAt(character, character.level || 1)?.entry.id || character.className;
  let next = withClassLevel(character, classId);
  next.level = choices.toLevel;
  const maxHp = (character.maxHp || 0) + choices.hpGain;
  next.maxHp = maxHp;
  next.currentHp = Math.min((character.currentHp ?? maxHp) + choices.hpGain, maxHp);
  if (choices.choice) next = applyLevelChoice(next, choices.toLevel, choices.choice);
  if (choices.options) next = applyOptionPicks(next, classId, choices.options, choices.toLevel);
  let spellsAdded = [];
  if (choices.spellsAdded?.length) {
    const have = new Set((next.spells || []).map(s => typeof s === 'string' ? s : s.id));
    const tag = classId === character.className ? {} : { cls: classId };
    // Itens: id (magia/truque aprendido) ou { id, inBook: true } (grimório do mago, não preparada).
    const items = choices.spellsAdded.map(x => (typeof x === 'string' ? { id: x } : x)).filter(x => x?.id && !have.has(x.id));
    const book = classId === 'wizard' && items.some(x => x.inBook);
    // Ficha antiga de mago: marca o grimório existente antes de acrescentar.
    if (book && !(next.spells || []).some(s => s && typeof s === 'object' && 'inBook' in s && (s.cls || next.className) === 'wizard')) {
      next.spells = (next.spells || []).map(s => {
        const e = typeof s === 'string' ? { id: s, prepared: false } : s;
        const lvl = [...SPELLS_2024, ...SRD.SPELLS].find(x => x.id === e.id)?.level || 0;
        return (e.cls || next.className) === 'wizard' && !e.auto && lvl > 0 ? { ...e, inBook: true } : s;
      });
    }
    spellsAdded = items.map(x => x.id);
    next.spells = [...(next.spells || []), ...items.map(x => (book && x.inBook ? { id: x.id, prepared: false, inBook: true, ...tag } : { id: x.id, prepared: true, ...tag }))];
  }
  // Perícia da multiclasse (bardo, ranger, ladino).
  const skillAdded = choices.skillAdded && !(character.skillProfs || []).includes(choices.skillAdded) ? choices.skillAdded : null;
  if (skillAdded) next.skillProfs = [...(character.skillProfs || []), skillAdded];
  // Registro para poder desfazer a subida (revertLastLevel).
  next.levelHistory = [
    ...(character.levelHistory || []).filter(h => h.toLevel < choices.toLevel),
    { toLevel: choices.toLevel, hpGain: choices.hpGain, spellsAdded, classId, ...(skillAdded ? { skillAdded } : {}) },
  ];
  return applyAutosToCharacter(next);
}

/** Desfaz a escolha de ASI/talento registrada num nível. */
function revertLevelChoice(character, level) {
  const choice = (character.levelChoices || {})[level];
  if (!choice) return character;
  const levelChoices = { ...character.levelChoices };
  delete levelChoices[level];
  let next = { ...character, levelChoices };
  if (choice.type === 'asi') {
    next.abilities = { ...(character.abilities || {}) };
    for (const [k, v] of Object.entries(choice.asi || {})) next.abilities[k] = (next.abilities[k] || 10) - v;
  } else {
    if (choice.featId) next = withFeatAsi(next, choice.asi, -1);
    const feats = [...(character.feats || [])];
    const i = feats.findIndex(f => f.level === level && !['background', 'species'].includes(f.origin));
    if (i >= 0) feats.splice(i, 1);
    next.feats = feats;
  }
  return next;
}

/**
 * Volta um nível (fichas fora de campanha), desfazendo PV, ASI/talento e magias
 * ganhos naquele nível. Subidas sem registro (fichas antigas / modo trapaça)
 * descontam a média do dado de vida.
 */
export function revertLastLevel(character) {
  const level = character.level || 1;
  if (level <= 1) return character;
  const entry = (character.levelHistory || []).find(h => h.toLevel === level);
  const lastClass = classAt(character, level)?.entry.id || character.className;
  const conMod = Math.floor((scoreWithBonus(character, 'con') - 10) / 2);
  const hpLoss = entry ? entry.hpGain : Math.max(1, Math.floor((HIT_DIE[lastClass] || 8) / 2) + 1 + conMod);

  let next = withoutLastClassLevel(revertOptionPicks(revertLevelChoice(character, level), level));
  next.maxHp = Math.max(1, (character.maxHp || 1) - hpLoss);
  next.currentHp = Math.min(character.currentHp ?? next.maxHp, next.maxHp);
  next.hitDiceUsed = Math.min(character.hitDiceUsed || 0, next.level);
  if (entry?.spellsAdded?.length) {
    const drop = new Set(entry.spellsAdded);
    next.spells = (next.spells || []).filter(s => !drop.has(typeof s === 'string' ? s : s.id));
  }
  if (entry?.skillAdded) next.skillProfs = (next.skillProfs || []).filter(k => k !== entry.skillAdded);
  // Magias de uma classe que deixou de existir saem junto.
  const classesLeft = new Set(classEntries(next).map(e => e.id));
  next.spells = (next.spells || []).filter(s => !s?.cls || classesLeft.has(s.cls));
  next.levelHistory = (character.levelHistory || []).filter(h => h.toLevel < level);
  return applyAutosToCharacter(next);
}

/**
 * Verifica se uma proposta de subida de nível é válida — usado pelo backend
 * antes de aprovar uma Approval do tipo 'levelup'.
 */
export function validateLevelUp(character, proposal) {
  // proposal: { toLevel, hpGain?, spellsAdded?, featuresAdded? }
  const issues = [];
  const fromLevel = character.level || 1;
  const toLevel = proposal.toLevel;
  if (typeof toLevel !== 'number' || toLevel <= fromLevel) {
    issues.push('toLevel deve ser maior que o nível atual');
  }
  if (toLevel > 20) issues.push('Nível máximo é 20');
  if (toLevel - fromLevel > 1) issues.push('Apenas 1 nível por aprovação');

  if (proposal.hpGain != null) {
    const rule = PROGRESSION_RULES[character.className];
    // dano médio máximo é hitDie+1 (de fato, no SRD do projeto, fixo)
    // O hitDie está no SRD.js do frontend; aqui não temos acesso direto, então
    // só validamos faixa plausível (1..20)
    if (proposal.hpGain < 1 || proposal.hpGain > 20) issues.push('hpGain fora da faixa esperada');
  }
  return { valid: issues.length === 0, issues };
}

/** A ficha vista como `classId` (nível e subclasse dela), ou null se não tem a classe. */
function viewOf(character, classId) {
  const entry = classEntries(character).find(e => e.id === classId);
  return entry ? classView(character, entry) : null;
}

/**
 * Valida escolhas de opções de classe (invocações, metamagia…) para a ficha
 * no nível atual. Espelha backend/api/progression/options.py.
 * picks: { adds: [{pool, id, detail?}], swaps: [{pool, from, to, detail?}] }
 */
export function validateClassOptions(character, classId, picks, { levelUp = false } = {}) {
  const view = viewOf(character, classId);
  if (!view) return { valid: false, issues: ['Classe ausente na ficha'] };
  return validateOptionPicks(view, classId, picks, view.level || 1, { levelUp });
}

/** Registra escolhas pendentes de um nível já alcançado (sem subir de nível). */
export function applyClassOptions(character, classId, picks) {
  return applyAutosToCharacter(applyOptionPicks(character, classId, picks, character.level || 1));
}
