/**
 * Recursos com usos (Fúria, Canalizar Divindade, pontos de feitiçaria…).
 * Dados em data/class-options/<classe>.js (`resources`, e `resource` em opções
 * de pool). Formato no README de lá. Espelhado em backend/api/progression/resources.py.
 *
 * Gasto guardado em character.resourcesUsed = { '<classId>.<id>': n }.
 * Sem modo trapaça só se gasta; a recuperação vem do descanso (ou do mestre).
 */
import { CLASS_OPTIONS } from '../../data/class-options/index.js';
import { classEntries, classView } from './multiclass.js';
import { findOption, picksOf } from './options.js';
import { profBonus } from './rules.js';

const score = (c, k) => ((c.abilities || {})[k] || 10) + ((c.raceBonus || {})[k] || 0);
const mod = (c, k) => Math.floor((score(c, k) - 10) / 2);

/** Valor de uma tabela { nível: valor } para o nível dado (maior chave ≤ nível). */
function byLevel(table, level) {
  let out;
  for (const [lv, v] of Object.entries(table || {}).sort((a, b) => a[0] - b[0])) if (level >= +lv) out = v;
  return out;
}

function usesMax(uses = {}, character, classLevel) {
  let n = 0;
  if (uses.byLevel) n = byLevel(uses.byLevel, classLevel) || 0;
  else if (uses.fixed != null) n = uses.fixed;
  else if (uses.ability) n = mod(character, uses.ability) * (uses.multiplier || 1);
  else if (uses.profBonus) n = profBonus(character.level || 1) * (uses.multiplier || 1);
  else if (uses.perClassLevel) n = uses.perClassLevel * classLevel;
  else if (uses.classLevel) n = classLevel * (uses.multiplier || 1);
  n += uses.add || 0;
  if (uses.min != null) n = Math.max(uses.min, n);
  return Math.max(0, n);
}

function minLevelOf(r) {
  if (r.minLevel != null) return r.minLevel;
  const keys = Object.keys(r.uses?.byLevel || {}).map(Number);
  return keys.length ? Math.min(...keys) : 1;
}

function build(character, classId, r, key, classLevel) {
  const max = usesMax(r.uses, character, classLevel);
  if (max <= 0) return null;
  const used = Math.min(max, Math.max(0, (character.resourcesUsed || {})[key] || 0));
  const shortRest = r.recharge === 'short' || (r.shortRestFromLevel != null && classLevel >= r.shortRestFromLevel);
  return {
    key, classId, id: r.id, name: r.name, desc: r.desc || null, max, used,
    recharge: shortRest ? 'short' : 'long',
    shortRestRegain: r.shortRestRegain || null,
    die: r.die ? byLevel(r.die.byLevel, classLevel) : null,
  };
}

// Traços de espécie com usos (nível = nível total do personagem). Espelho em resources.py.
const b = (pt, en) => ({ pt, en });
export const SPECIES_RESOURCES = {
  '2024': {
    dragonborn: [
      { id: 'breathWeapon', name: b('Arma de Sopro', 'Breath Weapon'), uses: { profBonus: true }, recharge: 'long' },
      { id: 'draconicFlight', name: b('Voo Dracônico', 'Draconic Flight'), uses: { fixed: 1 }, recharge: 'long', minLevel: 5 },
    ],
    dwarf: [{ id: 'stonecunning', name: b('Senso de Pedra', 'Stonecunning'), uses: { profBonus: true }, recharge: 'long' }],
    goliath: [
      { id: 'giantAncestry', name: b('Ancestralidade Gigante', 'Giant Ancestry'), uses: { profBonus: true }, recharge: 'long' },
      { id: 'largeForm', name: b('Forma Grande', 'Large Form'), uses: { fixed: 1 }, recharge: 'long', minLevel: 5 },
    ],
    orc: [
      { id: 'adrenalineRush', name: b('Ímpeto de Adrenalina', 'Adrenaline Rush'), uses: { profBonus: true }, recharge: 'short' },
      { id: 'relentlessEndurance', name: b('Resistência Implacável', 'Relentless Endurance'), uses: { fixed: 1 }, recharge: 'long' },
    ],
    aasimar: [
      { id: 'healingHands', name: b('Mãos Curativas', 'Healing Hands'), uses: { fixed: 1 }, recharge: 'long' },
      { id: 'celestialRevelation', name: b('Revelação Celestial', 'Celestial Revelation'), uses: { fixed: 1 }, recharge: 'long', minLevel: 3 },
    ],
  },
  '2014': {
    dragonborn: [{ id: 'breathWeapon', name: b('Arma de Sopro', 'Breath Weapon'), uses: { fixed: 1 }, recharge: 'short' }],
    'half-orc': [{ id: 'relentlessEndurance', name: b('Resistência Implacável', 'Relentless Endurance'), uses: { fixed: 1 }, recharge: 'long' }],
    orc: [{ id: 'relentlessEndurance', name: b('Resistência Implacável', 'Relentless Endurance'), uses: { fixed: 1 }, recharge: 'long' }],
    aasimar: [{ id: 'healingHands', name: b('Mãos Curativas', 'Healing Hands'), uses: { fixed: 1 }, recharge: 'long' }],
    goliath: [{ id: 'stonesEndurance', name: b('Resistência da Pedra', "Stone's Endurance"), uses: { fixed: 1 }, recharge: 'short' }],
  },
};

/** Recursos ativos da ficha (todas as classes), com máximo e gasto atuais. */
export function computeResources(character) {
  const rules = character.rulesVersion === '2024' ? '2024' : '2014';
  const out = [];
  const total = character.level || 1;
  for (const r of SPECIES_RESOURCES[rules][character.race] || []) {
    if (total < (r.minLevel || 1)) continue;
    const res = build(character, 'species', r, `species.${r.id}`, total);
    if (res) out.push(res);
  }
  for (const entry of classEntries(character)) {
    const data = CLASS_OPTIONS[entry.id];
    if (!data) continue;
    const view = classView(character, entry);
    const lv = view.level || 1;
    const sub = String(view.subclass || '').toLowerCase();
    for (const r of data.resources || []) {
      if (r.rules && r.rules !== rules) continue;
      if (r.subclass && !r.subclass.some(s => s.toLowerCase() === sub)) continue;
      if (lv < minLevelOf(r)) continue;
      const res = build(character, entry.id, r, `${entry.id}.${r.id}`, lv);
      if (res) out.push(res);
    }
    // Recursos de opções escolhidas (ex.: invocação 1× por descanso longo).
    for (const p of picksOf(character, entry.id)) {
      const option = findOption(entry.id, p.pool, p.id);
      if (!option?.resource) continue;
      const res = build(character, entry.id, { id: `${p.pool}.${p.id}`, name: option.name, desc: option.desc, ...option.resource }, `${entry.id}.${p.pool}.${p.id}`, lv);
      if (res && !out.some(x => x.key === res.key)) out.push(res);
    }
  }
  return out;
}

/** Gasta (`delta` > 0) ou recupera (`delta` < 0) usos de um recurso. */
export function spendResource(character, key, delta = 1) {
  const res = computeResources(character).find(r => r.key === key);
  if (!res) return character;
  const used = Math.min(res.max, Math.max(0, res.used + delta));
  return { ...character, resourcesUsed: { ...(character.resourcesUsed || {}), [key]: used } };
}

/** Efeito do descanso nos recursos: longo zera tudo; curto recupera os de recarga curta. */
export function restResources(character, type) {
  if (type === 'long') return { ...character, resourcesUsed: {} };
  const next = { ...(character.resourcesUsed || {}) };
  for (const r of computeResources(character)) {
    if (!r.used) continue;
    if (r.shortRestRegain) next[r.key] = Math.max(0, r.used - r.shortRestRegain);
    else if (r.recharge === 'short') next[r.key] = 0;
  }
  return { ...character, resourcesUsed: next };
}
