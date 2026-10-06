/**
 * Bestiário unificado do combate.
 *
 * Fontes:
 *   - monsters-srd521.js: 331 criaturas do SRD 5.2.1 (gerado por
 *     scripts/import-open5e-monsters.mjs a partir do Open5e, document srd-2024).
 *   - monsters.js: catálogo antigo (SRD 5.1 + 4 criaturas fora do SRD em resumo
 *     próprio). Só entram as que não existem no 5.2.1.
 *   - monsters-pt.js: tradução pt-BR dos nomes e textos de traços/ações
 *     (aplicada aqui, por localizeMonster).
 *   - SRD.BEASTS (srd.js) continua sendo o catálogo da Forma Selvagem; no combate
 *     os animais vêm do 5.2.1, com ataques reais.
 *
 * API estável:
 *   BESTIARY                 lista unificada (formato abaixo), ordenada por ND e nome
 *   BESTIARY_BY_ID           { id: monstro }
 *   findMonster(id)          aceita ids antigos (monsters.js, SRD.BEASTS) e devolve o do 5.2.1
 *   monsterForCombat(m)      snapshot pronto para api.addCombatant({ type: 'monster', monster })
 *   MONSTER_TYPES, crLabel(crNum)
 *
 * Formato do monstro (compatível com monsters.js, com extensões):
 *   id, name {pt,en}, cr '1/4', crNum 0.25, xp?, type, size, alignment,
 *   speed {walk, fly?, swim?, climb?, burrow?, hover?}, ac, hp, hitDice, initiative?,
 *   abilities {str..cha}, saves {..}, skills {..},
 *   damageResistances/damageImmunities/damageVulnerabilities/conditionImmunities: [string],
 *   senses, languages, traits [{name{pt,en}, desc{pt?,en}}],
 *   actions / bonusActions / reactions: [Action],
 *   legendary?: { uses: 3, lairUses?: 4, actions: [Action & {cost}] },
 *   legendaryResistance?: { uses: 3, lairUses?: 4 },
 *   source: 'SRD 5.2.1' | 'SRD 5.1' | 'Fora do SRD (resumo próprio)'
 *
 * Action:
 *   name {pt,en}, type 'melee'|'ranged'|'save'|'special',
 *   atk?, range?, damage? '2d6+5', damageType?, extraDamage? [{damage, damageType}],
 *   save? { ability 'DEX', dc, halfOnSave, area?, targets?, conditions? ['prone'] }
 *     (em ações de save, damage/damageType/extraDamage são o dano na falha),
 *   recharge? 5  (recarrega com d6 ≥ 5 no início do turno),
 *   uses? 3, usesPer? 'day'|'rest',
 *   cost? (ações lendárias), desc {pt?, en}
 *
 * Snapshot de combate (monsterForCombat): mesmo formato, mas `actions` é uma lista
 * única com `kind: 'action'|'bonus'|'reaction'|'legendary'` (o índice nela é o
 * actionIndex do backend) e `legendary` fica só { uses, lairUses? }.
 */
import { MONSTERS } from './monsters.js';
import { MONSTERS_SRD521 } from './monsters-srd521.js';
import { localizeMonster } from './monsters-pt.js';

export const MONSTER_TYPES = ['aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey',
  'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'];

// ids de monsters.js que mudaram de nome no SRD 5.2.1
export const LEGACY_IDS = {
  thug: 'tough', 'cult-fanatic': 'cultist-fanatic', acolyte: 'priest-acolyte', veteran: 'warrior-veteran',
  goblin: 'goblin-warrior', hobgoblin: 'hobgoblin-warrior', bugbear: 'bugbear-warrior',
  kobold: 'kobold-warrior', gnoll: 'gnoll-warrior', minotaur: 'minotaur-of-baphomet',
};

// ids de SRD.BEASTS (camelCase) → 5.2.1
export const BEAST_IDS = {
  poisonousSnake: 'venomous-snake', giantPoisonousSnake: 'giant-venomous-snake',
};
const kebab = (s) => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

const NON_SRD = new Set(['orog', 'troglodyte', 'displacer-beast', 'banshee']);

const SRD_IDS = new Set(MONSTERS_SRD521.map(m => m.id));

const legacyExtras = MONSTERS
  .filter(m => !SRD_IDS.has(LEGACY_IDS[m.id] || m.id))
  .map(m => ({ ...m, source: m.source || (NON_SRD.has(m.id) ? 'Fora do SRD (resumo próprio)' : 'SRD 5.1') }));

// Nomes e textos de traços/ações em pt-BR (monsters-pt.js); o texto em
// inglês continua em desc.en (usado pelo estimador de ND).
export const BESTIARY = [...MONSTERS_SRD521, ...legacyExtras]
  .map(localizeMonster)
  .sort((a, b) => a.crNum - b.crNum || a.name.en.localeCompare(b.name.en));

export const BESTIARY_BY_ID = Object.fromEntries(BESTIARY.map(m => [m.id, m]));

export function findMonster(id) {
  if (!id) return null;
  return BESTIARY_BY_ID[id]
    || BESTIARY_BY_ID[LEGACY_IDS[id]]
    || BESTIARY_BY_ID[BEAST_IDS[id]]
    || BESTIARY_BY_ID[kebab(String(id))]
    || null;
}

export function crLabel(crNum) {
  if (crNum === 0.125) return '1/8';
  if (crNum === 0.25) return '1/4';
  if (crNum === 0.5) return '1/2';
  return String(crNum);
}

const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

export function monsterForCombat(m) {
  if (!m) return null;
  if (m.combatReady) return clone(m);
  const snap = clone(m);
  const tag = (list, kind) => (list || []).map(a => ({ ...clone(a), kind }));
  snap.actions = [
    ...tag(m.actions, 'action'),
    ...tag(m.bonusActions, 'bonus'),
    ...tag(m.reactions, 'reaction'),
    ...tag(m.legendary?.actions, 'legendary').map(a => ({ ...a, cost: a.cost || 1 })),
  ];
  delete snap.bonusActions;
  delete snap.reactions;
  if (m.legendary) {
    snap.legendary = { uses: m.legendary.uses || 3 };
    if (m.legendary.lairUses) snap.legendary.lairUses = m.legendary.lairUses;
  }
  snap.combatReady = true;
  return snap;
}

export default BESTIARY;
