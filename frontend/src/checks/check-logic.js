// Lógica pura dos pedidos de teste (mestre → mesa). Sem React; testável em node.
import Utils from '../../utils.js';
import { t as tr, tName } from '../../data/i18n.js';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

// Atalhos de um toque do mestre (mais usados primeiro).
export const QUICK_SKILLS = ['perception', 'stealth', 'insight', 'investigation', 'athletics', 'acrobatics', 'survival', 'persuasion', 'arcana'];
export const QUICK_SAVES = ['dex', 'con', 'wis', 'str', 'int', 'cha'];

const ABBR = {
  pt: { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' },
  en: { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' },
};

export function abilityAbbr(key, lang) {
  return (ABBR[lang] || ABBR.en)[key] || key.toUpperCase();
}

/** Rótulo legível do pedido: "Percepção", "Resistência de DES", "Força". */
export function checkLabel({ kind, key }, lang = 'pt') {
  if (kind === 'skill') return tName('skill', key, lang);
  if (kind === 'save') return lang === 'pt' ? `Resistência de ${abilityAbbr(key, lang)}` : `${abilityAbbr(key, lang)} save`;
  if (kind === 'ability') return tr(key, lang);
  return key || '';
}

/** Modificador da ficha para o teste pedido (null se não der pra calcular). */
export function modifierFor(char, { kind, key } = {}) {
  if (!char || !char.abilities) return null;
  try {
    if (kind === 'skill') return Utils.skillBonus(char, key);
    if (kind === 'save') return Utils.saveBonus(char, key);
    if (kind === 'ability') return Utils.abilityMod(char, key);
  } catch { /* ficha incompleta */ }
  return null;
}

/** Monta o corpo do POST de um pedido. */
export function buildCheckPayload({ kind, key, label, dc, dcHidden, advantage, targets }, lang = 'pt') {
  const dcNum = dc === '' || dc == null ? null : parseInt(dc, 10);
  return {
    kind,
    key: key || '',
    label: (label || checkLabel({ kind, key }, lang)).slice(0, 120),
    dc: Number.isNaN(dcNum) ? null : dcNum,
    dcHidden: !!dcHidden && dcNum != null && !Number.isNaN(dcNum),
    advantage: advantage || 'normal',
    targetUserIds: targets && targets.length ? targets : [],
  };
}

/** Resumo para o mestre: "2/3 responderam · 1 passou · 1 falhou". */
export function summarize(check) {
  const targets = check?.targets || [];
  const answered = targets.filter(t => t.response).length;
  return {
    total: targets.length,
    answered,
    waiting: targets.length - answered,
    passed: targets.filter(t => t.outcome === 'pass').length,
    failed: targets.filter(t => t.outcome === 'fail').length,
  };
}

/** Grupos para o DiceStage a partir de uma resposta rolada no servidor. */
export function responseDiceGroups(response) {
  if (!response?.rolls?.length) return [];
  return [{ die: 20, rolls: response.rolls.map(r => ({ value: r.value, kept: r.kept !== false })) }];
}
