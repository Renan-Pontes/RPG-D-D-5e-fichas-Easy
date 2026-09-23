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
  const out = {
    classId: character.className || null,
    level: character.level || 1,
    subclass: character.subclass || null,
    profBonus: profBonus(character.level || 1),
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

  // ASI/talento já escolhidos (character.levelChoices[nível]) deixam de ser pendência.
  const done = character.levelChoices || {};
  out.pendingChoices = out.pendingChoices.filter(c => !((c.type === 'asiOrFeat' || c.type === 'epicBoon') && done[c.level]));

  // Dedup autoCantrips/autoSpells
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
  const prog = computeProgression(character);
  const next = { ...character };
  const spells = Array.isArray(next.spells) ? [...next.spells] : [];

  // Normaliza estrutura: pode vir como string ou objeto
  const norm = spells.map(s => typeof s === 'string' ? { id: s, prepared: false } : { ...s });

  // Remove autos antigos que não fazem mais parte do prog
  const validAutoIds = new Set([...prog.autoCantrips, ...prog.autoSpells]);
  const filtered = norm.filter(s => !s.auto || validAutoIds.has(s.id));

  // Adiciona autos novos
  const existing = new Set(filtered.map(s => s.id));
  for (const id of prog.autoCantrips) {
    if (!existing.has(id)) filtered.push({ id, prepared: true, auto: true });
  }
  for (const id of prog.autoSpells) {
    if (!existing.has(id)) filtered.push({ id, prepared: true, auto: true });
  }

  next.spells = filtered;
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
  const prog = computeProgression({ ...character, level: Math.max(level, character.level || 1), levelChoices: {} });
  if (prog.pendingChoices.some(c => c.type === 'epicBoon' && c.level === level)) return 'epic';
  return prog.asiLevels.includes(level) ? 'asi' : null;
}

/**
 * Valida a escolha de ASI/talento de um nível. Espelha
 * backend/api/progression/engine.py:validate_level_choice.
 * choice: { type: 'asi', asi: {str: 1, dex: 1} } | { type: 'feat', feat: 'Nome', note?: '' }
 */
export function validateLevelChoice(character, level, choice) {
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
  }
  return { valid: issues.length === 0, issues };
}

/** Aplica uma escolha já validada: soma ASI nos atributos-base ou registra o talento. */
export function applyLevelChoice(character, level, choice) {
  const next = { ...character, levelChoices: { ...(character.levelChoices || {}), [level]: choice } };
  if (choice.type === 'asi') {
    next.abilities = { ...(character.abilities || {}) };
    for (const [k, v] of Object.entries(choice.asi || {})) next.abilities[k] = (next.abilities[k] || 10) + v;
  } else {
    next.feats = [...(character.feats || []), { name: choice.feat.trim(), note: choice.note || '', level }];
  }
  return next;
}

/**
 * Aplica uma subida de nível completa (fichas locais / fora de campanha).
 * choices: { toLevel, hpGain, choice?, spellsAdded? }
 */
export function applyLevelUpChoices(character, choices) {
  let next = { ...character, level: choices.toLevel };
  const maxHp = (character.maxHp || 0) + choices.hpGain;
  next.maxHp = maxHp;
  next.currentHp = Math.min((character.currentHp ?? maxHp) + choices.hpGain, maxHp);
  if (choices.choice) next = applyLevelChoice(next, choices.toLevel, choices.choice);
  let spellsAdded = [];
  if (choices.spellsAdded?.length) {
    const have = new Set((next.spells || []).map(s => typeof s === 'string' ? s : s.id));
    spellsAdded = choices.spellsAdded.filter(id => !have.has(id));
    next.spells = [...(next.spells || []), ...spellsAdded.map(id => ({ id, prepared: true }))];
  }
  // Registro para poder desfazer a subida (revertLastLevel).
  next.levelHistory = [
    ...(character.levelHistory || []).filter(h => h.toLevel < choices.toLevel),
    { toLevel: choices.toLevel, hpGain: choices.hpGain, spellsAdded },
  ];
  return applyAutosToCharacter(next);
}

/** Desfaz a escolha de ASI/talento registrada num nível. */
function revertLevelChoice(character, level) {
  const choice = (character.levelChoices || {})[level];
  if (!choice) return character;
  const levelChoices = { ...character.levelChoices };
  delete levelChoices[level];
  const next = { ...character, levelChoices };
  if (choice.type === 'asi') {
    next.abilities = { ...(character.abilities || {}) };
    for (const [k, v] of Object.entries(choice.asi || {})) next.abilities[k] = (next.abilities[k] || 10) - v;
  } else {
    const feats = [...(character.feats || [])];
    const i = feats.findIndex(f => f.level === level);
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
  const conMod = Math.floor((scoreWithBonus(character, 'con') - 10) / 2);
  const hpLoss = entry ? entry.hpGain : Math.max(1, Math.floor((HIT_DIE[character.className] || 8) / 2) + 1 + conMod);

  let next = revertLevelChoice(character, level);
  next.level = level - 1;
  next.maxHp = Math.max(1, (character.maxHp || 1) - hpLoss);
  next.currentHp = Math.min(character.currentHp ?? next.maxHp, next.maxHp);
  next.hitDiceUsed = Math.min(character.hitDiceUsed || 0, next.level);
  if (entry?.spellsAdded?.length) {
    const drop = new Set(entry.spellsAdded);
    next.spells = (next.spells || []).filter(s => !drop.has(typeof s === 'string' ? s : s.id));
  }
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
