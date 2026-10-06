/**
 * Helpers puros para as ações de monstro no combate (UI do mestre).
 * Espelham as regras de backend/api/combat.py (action_availability etc.):
 * a validação real é do servidor; aqui é só para mostrar o estado.
 */

export const KIND_ORDER = ['action', 'bonus', 'reaction', 'legendary'];

export const KIND_LABEL = {
  action: { pt: 'Ações', en: 'Actions' },
  bonus: { pt: 'Ações bônus', en: 'Bonus actions' },
  reaction: { pt: 'Reações', en: 'Reactions' },
  legendary: { pt: 'Ações lendárias', en: 'Legendary actions' },
};

import { abilityLabel, conditionLabel, damageTypeLabel, rangeLabel } from '../combat/monster-i18n.js';

const pick = (lang, pt, en) => (lang === 'pt' ? pt : en);

export function actionName(a, lang) {
  if (!a) return '';
  if (typeof a.name === 'object' && a.name) return a.name[lang] || a.name.en || a.name.pt || '';
  return a.name || '';
}

export const isAttack = (a) => a?.type === 'melee' || a?.type === 'ranged';
export const isSave = (a) => !!(a?.save && a.save.ability && a.save.dc != null);

/** Agrupa stats.actions (lista única do snapshot) por tipo, preservando o índice. */
export function groupCombatActions(actions) {
  const groups = { action: [], bonus: [], reaction: [], legendary: [] };
  (actions || []).forEach((a, index) => {
    const kind = KIND_ORDER.includes(a?.kind) ? a.kind : 'action';
    groups[kind].push({ action: a, index });
  });
  return groups;
}

function legendaryMax(c) {
  const leg = c?.legendary;
  if (!leg) return 0;
  return c.in_lair && leg.lair_max ? leg.lair_max : leg.max || 0;
}

/** { available, reason } — reason: 'recharging' | 'no_uses_left' | 'no_legendary_actions' | null */
export function actionStatus(combatant, index) {
  const a = combatant?.stats?.actions?.[index];
  if (!a) return { available: false, reason: 'invalid_action_index' };
  const st = combatant.action_state?.[String(index)] || {};
  if (a.kind === 'legendary' && combatant.legendary) {
    const cost = a.cost || 1;
    if ((combatant.legendary.remaining ?? legendaryMax(combatant)) < cost) return { available: false, reason: 'no_legendary_actions' };
  }
  if (a.recharge && st.charged === false) return { available: false, reason: 'recharging' };
  if (a.uses && (st.uses_left ?? a.uses) <= 0) return { available: false, reason: 'no_uses_left' };
  return { available: true, reason: null };
}

/** Rótulo do limite de uso: "Recarga 5–6", "2/dia (1 restante)", "Custo 2". */
export function limitLabel(combatant, index, lang) {
  const a = combatant?.stats?.actions?.[index];
  if (!a) return '';
  const st = combatant.action_state?.[String(index)] || {};
  const out = [];
  if (a.recharge) {
    const range = a.recharge >= 6 ? '6' : `${a.recharge}–6`;
    const state = st.charged === false ? pick(lang, 'gasta', 'spent') : pick(lang, 'pronta', 'ready');
    out.push(`${pick(lang, 'Recarga', 'Recharge')} ${range} · ${state}`);
  }
  if (a.uses) {
    const left = st.uses_left ?? a.uses;
    const per = a.usesPer === 'rest' ? pick(lang, 'descanso', 'rest') : pick(lang, 'dia', 'day');
    out.push(`${left}/${a.uses} ${pick(lang, 'por', 'per')} ${per}`);
  }
  if (a.kind === 'legendary' && (a.cost || 1) > 1) out.push(`${pick(lang, 'Custo', 'Cost')} ${a.cost}`);
  return out.join(' · ');
}

/** Resumo mecânico: "+14 · 3 m · 1d10+8 cortante + 2d4 fogo" / "DES CD 21 · 17d6 fogo (metade no sucesso)". */
export function actionSummary(a, lang) {
  if (!a) return '';
  const dmgOf = (d, ty) => `${d} ${ty ? damageTypeLabel(ty, lang) : ''}`.trim();
  const dmg = [a.damage && dmgOf(a.damage, a.damageType),
    ...(a.extraDamage || []).map(e => dmgOf(e.damage, e.damageType))].filter(Boolean).join(' + ');
  if (isAttack(a)) {
    const atk = a.atk != null ? `${a.atk >= 0 ? '+' : ''}${a.atk}` : '';
    return [atk, rangeLabel(a.range, lang), dmg].filter(Boolean).join(' · ');
  }
  if (isSave(a)) {
    const parts = [`${abilityLabel(a.save.ability, lang)} ${pick(lang, 'CD', 'DC')} ${a.save.dc}`];
    if (dmg) parts.push(dmg + (a.save.halfOnSave ? pick(lang, ' (metade no sucesso)', ' (half on success)') : ''));
    if (a.save.conditions?.length) parts.push(a.save.conditions.map(c => conditionLabel(c, lang)).join(', '));
    return parts.join(' · ');
  }
  return '';
}

export function legendaryInfo(combatant) {
  if (!combatant?.legendary) return null;
  const max = legendaryMax(combatant);
  return { remaining: Math.min(combatant.legendary.remaining ?? max, max), max };
}

export function legendaryResistanceInfo(combatant) {
  const lr = combatant?.legendary_resistance;
  if (!lr) return null;
  const max = combatant.in_lair && lr.lair_max ? lr.lair_max : lr.max || 0;
  return { remaining: Math.min(lr.remaining ?? max, max), max };
}

export const hasLair = (c) => !!(c?.legendary?.lair_max || c?.legendary_resistance?.lair_max);

export function reasonLabel(reason, lang) {
  switch (reason) {
    case 'recharging': return pick(lang, 'Recarregando — role d6 no início do turno.', 'Recharging — rolls d6 at the start of its turn.');
    case 'no_uses_left': return pick(lang, 'Sem usos restantes.', 'No uses left.');
    case 'no_legendary_actions': return pick(lang, 'Ações lendárias insuficientes nesta rodada.', 'Not enough legendary actions this round.');
    case 'missing_targets': return pick(lang, 'Escolha ao menos um alvo.', 'Pick at least one target.');
    default: return reason || '';
  }
}

/** Texto curto de uma entrada do log de combate (para o painel do mestre). */
export function logLine(e, lang) {
  if (!e) return '';
  const name = e.action_name ? ` (${e.action_name})` : '';
  switch (e.type) {
    case 'attack': {
      const dmg = e.hit && e.damage ? ` — ${[e.damage, ...(e.extra_damage || [])].map(d => `${d.total} ${damageTypeLabel(d.type, lang)}`).join(' + ')}` : '';
      const res = e.crit ? pick(lang, 'CRÍTICO', 'CRIT') : e.hit ? pick(lang, 'acertou', 'hit') : pick(lang, 'errou', 'miss');
      const manual = e.manual ? pick(lang, ' (valores do mestre)', ' (DM values)') : '';
      return `${e.attacker} → ${e.target}${name}: ${e.total} ${pick(lang, 'vs CA', 'vs AC')} ${e.ac}, ${res}${dmg}${manual}`;
    }
    case 'save_aoe':
      return `${e.attacker}${name}: ${abilityLabel(e.ability, lang)} ${pick(lang, 'CD', 'DC')} ${e.dc} — ` + (e.per_target || []).map(p =>
        `${p.target_name} ${p.save?.success ? '✓' : '✗'}${p.damage_taken ? ` ${p.damage_taken}` : ''}${p.conditions_applied?.length ? ` [${p.conditions_applied.map(c => conditionLabel(c, lang)).join(', ')}]` : ''}`).join('; ');
    case 'use_action':
      return `${e.attacker}: ${pick(lang, 'usou', 'used')}${name || ''}`;
    case 'recharge':
      return `${e.target}: ` + (e.rolls || []).map(r => `${r.name} d6=${r.roll} ${r.recharged ? pick(lang, 'recarregou', 'recharged') : pick(lang, 'não recarregou', 'not recharged')}`).join('; ');
    case 'next_turn':
      return `${pick(lang, 'Rodada', 'Round')} ${e.round} — ${pick(lang, 'vez de', 'turn of')} ${e.whose}`;
    case 'damage':
      return `${e.target}: −${e.amount}`;
    case 'heal':
      return `${e.target}: +${e.healed}`;
    case 'add_condition':
      return `${e.target}: + ${conditionLabel(e.condition, lang)}`;
    case 'remove_condition':
      return `${e.target}: − ${conditionLabel(e.condition, lang)}`;
    case 'player_attack': {
      const atk = e.attack_name ? ` (${e.attack_name})` : '';
      const res = e.hit === false ? pick(lang, 'errou', 'miss') : e.hit ? pick(lang, 'acertou', 'hit') : '';
      const dmg = e.damage_taken ? ` — ${e.damage_taken}` : '';
      return `${e.attacker} → ${e.target}${atk}${res ? `: ${res}` : ''}${dmg}`;
    }
    case 'start':
      return pick(lang, 'Combate iniciado', 'Combat started');
    case 'end':
      return pick(lang, 'Combate encerrado', 'Combat ended');
    default:
      return '';
  }
}
