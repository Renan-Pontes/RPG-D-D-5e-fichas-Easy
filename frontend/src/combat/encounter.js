/**
 * Dificuldade de encontro pelo SRD 5.2.1 ("Combat Encounter Difficulty",
 * tabela "XP Budget per Character", p. 201) e XP por ND
 * ("Experience Points by Challenge Rating", p. 256).
 */
import { xpForCr, estimateCr, crToNumber } from './cr-estimate.js';

// nível → [Low, Moderate, High] por personagem
export const XP_BUDGET_PER_CHARACTER = {
  1: [50, 75, 100], 2: [100, 150, 200], 3: [150, 225, 400], 4: [250, 375, 500],
  5: [500, 750, 1100], 6: [600, 1000, 1400], 7: [750, 1300, 1700], 8: [1000, 1700, 2100],
  9: [1300, 2000, 2600], 10: [1600, 2300, 3100], 11: [1900, 2900, 4100], 12: [2200, 3700, 4700],
  13: [2600, 4200, 5400], 14: [2900, 4900, 6200], 15: [3300, 5400, 7800], 16: [3800, 6100, 9800],
  17: [4500, 7200, 11700], 18: [5000, 8700, 14200], 19: [5500, 10700, 17200], 20: [6400, 13200, 22000],
};

export function partyBudget(levels) {
  const out = { low: 0, moderate: 0, high: 0 };
  for (const raw of levels || []) {
    const lvl = Math.max(1, Math.min(20, parseInt(raw, 10) || 1));
    const [l, m, h] = XP_BUDGET_PER_CHARACTER[lvl];
    out.low += l; out.moderate += m; out.high += h;
  }
  return out;
}

/**
 * Classifica o XP total contra o orçamento do grupo.
 * 'none' (sem XP) | 'low' (≤ Baixa) | 'moderate' (≤ Moderada) | 'high' (≤ Alta) | 'extreme' (acima de Alta).
 */
export function encounterDifficulty(totalXp, levels) {
  const budget = partyBudget(levels);
  let rating = 'none';
  if (totalXp > 0 && (levels || []).length) {
    if (totalXp <= budget.low) rating = 'low';
    else if (totalXp <= budget.moderate) rating = 'moderate';
    else if (totalXp <= budget.high) rating = 'high';
    else rating = 'extreme';
  }
  return { totalXp, budget, rating };
}

export const DIFFICULTY_LABEL = {
  none: { pt: '—', en: '—' },
  low: { pt: 'Baixa', en: 'Low' },
  moderate: { pt: 'Moderada', en: 'Moderate' },
  high: { pt: 'Alta', en: 'High' },
  extreme: { pt: 'Acima de Alta', en: 'Beyond High' },
};

/**
 * XP de um combatente-monstro. Procura o ND pelo id no catálogo/lista local;
 * sem isso, estima pelos números do snapshot (marcado estimated: true).
 */
export function combatantXp(c, lookup) {
  const src = lookup ? lookup(c.monster_id) : null;
  const known = src ? crToNumber(src.crNum ?? src.cr) : null;
  if (known != null) return { crNum: known, xp: xpForCr(known), estimated: false };
  const st = c.stats || {};
  const est = estimateCr({
    ac: st.ac, hp: st.max_hp, abilities: st.abilities, saves: st.saves,
    actions: st.actions || [],
    damageResistances: st.damage_resistances, damageImmunities: st.damage_immunities,
    damageVulnerabilities: st.damage_vulnerabilities,
  });
  return { crNum: est.crNum, xp: est.xp, estimated: true };
}
