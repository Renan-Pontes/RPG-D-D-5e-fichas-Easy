/**
 * Fim de encontro guiado — lógica pura (sem React, sem API).
 *
 * Opt-in: só aparece se o mestre ligar `campaign.state.endOfEncounterWizard`.
 * Os passos são sugestões; a interface só chama a API quando o mestre clica.
 */
import { combatantXp } from '../combat/encounter.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export const isWizardEnabled = (state) => state?.endOfEncounterWizard === true;

export const stateWithWizard = (state, on) => ({ ...(state || {}), endOfEncounterWizard: !!on });

function listJoin(items, lang) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${L(lang, 'e', 'and')} ${items[items.length - 1]}`;
}

const isDown = (c) => !!c.defeated || (Number(c.current_hp) || 0) <= 0;

/** Resumo do encontro encerrado: rodadas, derrotados, quem caiu, participantes. */
export function encounterSummary(combat) {
  const combatants = combat?.combatants || [];
  const monsters = combatants.filter(c => c.type === 'monster');
  const pcs = combatants.filter(c => c.type === 'pc');
  return {
    rounds: Math.max(1, Number(combat?.round) || 1),
    monsters: monsters.map(c => c.name),
    defeated: monsters.filter(isDown).map(c => c.name),
    standing: monsters.filter(c => !isDown(c)).map(c => c.name),
    pcs: pcs.map(c => c.name),
    fallenPcs: pcs.filter(c => (Number(c.current_hp) || 0) <= 0).map(c => c.name),
    pcCharacterIds: pcs.map(c => c.character_id).filter(id => id != null),
  };
}

/**
 * XP sugerido (mesma conta do EncounterDifficulty: XP por ND do SRD 5.2.1).
 * total = todos os monstros do encontro; defeatedXp = só os derrotados.
 * `lookup(monsterId)` devolve o monstro do catálogo (ou null → estimativa).
 */
export function suggestXp(combat, lookup) {
  let total = 0; let defeatedXp = 0; let estimated = false;
  for (const c of (combat?.combatants || []).filter(x => x.type === 'monster')) {
    const r = combatantXp(c, lookup);
    total += r.xp;
    if (isDown(c)) defeatedXp += r.xp;
    if (r.estimated) estimated = true;
  }
  return { total, defeatedXp, estimated };
}

/** Quem recebe XP: os PJs que estavam no combate; sem nenhum, a mesa toda ('all'). */
export function xpRecipients(combat, campaign) {
  const inTable = new Set((campaign?.members || []).filter(m => m.role !== 'dm' && m.character).map(m => m.character.id));
  const ids = encounterSummary(combat).pcCharacterIds.filter(id => inTable.has(id));
  return ids.length ? ids : 'all';
}

/** Texto sugerido para o Diário (o mestre edita antes de salvar). */
export function diaryDraft(combat, { lang = 'pt', scene = '' } = {}) {
  const s = encounterSummary(combat);
  const title = scene
    ? L(lang, `Combate — ${scene}`, `Combat — ${scene}`)
    : L(lang, 'Combate encerrado', 'Combat ended');
  const lines = [];
  lines.push(L(lang,
    `Combate encerrado após ${s.rounds} rodada${s.rounds > 1 ? 's' : ''}.`,
    `Combat ended after ${s.rounds} round${s.rounds > 1 ? 's' : ''}.`));
  if (s.pcs.length) lines.push(L(lang, `Heróis: ${listJoin(s.pcs, lang)}.`, `Heroes: ${listJoin(s.pcs, lang)}.`));
  if (s.defeated.length) lines.push(L(lang, `Derrotados: ${listJoin(s.defeated, lang)}.`, `Defeated: ${listJoin(s.defeated, lang)}.`));
  if (s.standing.length) lines.push(L(lang, `Ainda de pé (fugiram/renderam-se?): ${listJoin(s.standing, lang)}.`, `Still standing (fled/surrendered?): ${listJoin(s.standing, lang)}.`));
  if (s.fallenPcs.length) lines.push(L(lang, `Caíram durante a luta: ${listJoin(s.fallenPcs, lang)}.`, `Fell during the fight: ${listJoin(s.fallenPcs, lang)}.`));
  return { title, body: lines.join('\n') };
}

/**
 * Passos do painel. XP só em campanha por XP; o resto é sempre oferecido.
 * Retorna [{ id: 'xp'|'shortRest'|'treasure'|'diary' }].
 */
export function wizardSteps(state) {
  const steps = [];
  if (state?.levelingMode === 'xp') steps.push({ id: 'xp' });
  steps.push({ id: 'shortRest' }, { id: 'treasure' }, { id: 'diary' });
  return steps;
}
