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

import { PROGRESSION_RULES, profBonus } from './rules.js';

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
  const halfMap = { 'wis+halfLevel': 'wis', 'cha+halfLevel': 'cha' };
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

  const rule = PROGRESSION_RULES[character.className];
  if (!rule) return out;

  for (let lv = 1; lv <= (character.level || 1); lv++) {
    const node = rule.perLevel?.[lv];
    if (node) applyNode(out, node, lv, 'class');
    if (character.subclass) {
      const subNode = rule.subclassPerLevel?.[character.subclass]?.[lv];
      if (subNode) applyNode(out, subNode, lv, 'subclass');
    } else if (rule.perLevel?.[lv]?.subclassChoice) {
      out.pendingChoices.push({ level: lv, type: 'subclass', reason: 'Escolha sua subclasse' });
    }
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
