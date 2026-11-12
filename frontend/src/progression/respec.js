/**
 * Troca de escolhas já feitas ("respec") pela linha do tempo de traços.
 *
 * A ficha nova é calculada inteira aqui (engine: changeLevelChoice,
 * applyClassOptions…). Fora de campanha ela é salva direto. Numa campanha os
 * campos de escolha ficam travados para o jogador, então cada troca vira um
 * pedido de aprovação (type 'other', payload.kind 'respec') com o `patch`
 * pronto e a lista legível de mudanças para o mestre. Ao aprovar, o servidor
 * aplica o `patch` (docs/backend-handoff-feats.md).
 */
import Utils from '../../utils.js';
import { findFeat } from '../../data/feats.js';
import { tName } from '../../data/i18n.js';
import { featPicksText } from '../sheet/sheet-text.js';
import { knownSpellIds } from './known.js';
import { findOption } from './options.js';

/** Campos da ficha que uma troca de escolha pode mexer. */
export const RESPEC_FIELDS = ['abilities', 'feats', 'levelChoices', 'classOptions', 'speciesChoices', 'raceBonus', 'spells', 'skillProfs', 'skillExpertise'];

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABIL_NAME = { str: ['FOR', 'STR'], dex: ['DES', 'DEX'], con: ['CON', 'CON'], int: ['INT', 'INT'], wis: ['SAB', 'WIS'], cha: ['CAR', 'CHA'] };

/** Só os campos de escolha que mudaram: { campo: valorNovo }. */
export function respecPatch(before, after) {
  const out = {};
  for (const k of RESPEC_FIELDS) if (!same(before?.[k], after?.[k])) out[k] = after?.[k] ?? null;
  return out;
}

const featLabel = (f, lang) => {
  const def = f?.id ? findFeat(f.id) : null;
  const name = def?.name?.[lang] || def?.name?.en || f?.feat || f?.name || f?.id || '';
  const picks = f?.picks ? featPicksText(f.picks, lang) : '';
  return picks ? `${name} (${picks})` : name;
};
const optLabel = (p, lang) => { const o = findOption(p.classId, p.pool, p.id); return `${tName('class', p.classId, lang)}: ${o?.name?.[lang] || o?.name?.en || p.id}`; };
const diffList = (a = [], b = [], key) => {
  const ka = new Map(a.map(x => [key(x), x])), kb = new Map(b.map(x => [key(x), x]));
  return { added: [...kb].filter(([k]) => !ka.has(k)).map(([, v]) => v), removed: [...ka].filter(([k]) => !kb.has(k)).map(([, v]) => v) };
};

/** Mudanças em linhas curtas ("Talento: Alerta → Sortudo", "FOR 15 → 16"…). */
export function respecChanges(before, after, lang = 'pt') {
  const lines = [];
  const fb = before?.feats || [], fa = after?.feats || [];
  const featKey = (f) => `${f?.id || f?.feat}|${JSON.stringify(f?.picks || {})}|${JSON.stringify(f?.asi || {})}`;
  const fd = diffList(fb, fa, featKey);
  fd.removed.forEach(f => lines.push(`− ${L(lang, 'Talento', 'Feat')}: ${featLabel(f, lang)}`));
  fd.added.forEach(f => lines.push(`+ ${L(lang, 'Talento', 'Feat')}: ${featLabel(f, lang)}`));
  // Atributos finais (com bônus de espécie e de talentos)
  for (const k of ABIL) {
    let x, y;
    try { x = Utils.abilityWithRace(before, k); y = Utils.abilityWithRace(after, k); } catch { x = before?.abilities?.[k]; y = after?.abilities?.[k]; }
    if (x !== y) lines.push(`${(ABIL_NAME[k] || [k, k])[lang === 'pt' ? 0 : 1]} ${x} → ${y}`);
  }
  const od = diffList(before?.classOptions || [], after?.classOptions || [], p => `${p.classId}|${p.pool}|${p.id}`);
  od.removed.forEach(p => lines.push(`− ${optLabel(p, lang)}`));
  od.added.forEach(p => lines.push(`+ ${optLabel(p, lang)}`));
  if (!same(before?.speciesChoices, after?.speciesChoices)) lines.push(L(lang, 'Escolhas da espécie alteradas', 'Species choices changed'));
  const sb = knownSpellIds(before), sa = knownSpellIds(after);
  [...sb].filter(id => !sa.has(id)).forEach(id => lines.push(`− ${tName('spellName', id, lang)}`));
  [...sa].filter(id => !sb.has(id)).forEach(id => lines.push(`+ ${tName('spellName', id, lang)}`));
  return lines;
}

/** Corpo do pedido de aprovação (POST /api/approvals/campaign/:id). */
export function respecApprovalBody(before, after, { lang = 'pt', title } = {}) {
  const changes = respecChanges(before, after, lang);
  return {
    type: 'other',
    characterId: before.id,
    payload: {
      kind: 'respec',
      title: title || L(lang, 'Troca de escolhas', 'Changed choices'),
      changes,
      patch: respecPatch(before, after),
    },
  };
}

// Ações da linha do tempo para trocar escolhas (o app fornece; a ficha só consome).
import { createContext } from 'react';
export const RespecContext = createContext(null);
