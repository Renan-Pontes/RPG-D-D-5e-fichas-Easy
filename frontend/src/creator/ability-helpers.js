/* Lógica pura das etapas de atributos (abilities + abilityBonus). Sem React.
 *
 * Dados da criação em char.creation:
 *   abilityMethod: 'standard' | 'pointbuy' | 'roll'          (padrão: 'standard')
 *   abilityRolls:  [{ dice: [4 dados], total }] × 6            (só na rolagem)
 *   abilityAssign: { str: índice no conjunto, … }             (padrão e rolagem)
 *   abilityBonus:  { key, pattern, picks: { str: 2, … } }     (escolhas do bônus;
 *                  key = 'bg:<antecedente>' (2024) ou 'race:<raça>' (2014): se o
 *                  antecedente/raça mudar, as escolhas antigas deixam de valer)
 * char.abilities guarda os valores-base; char.raceBonus o bônus total
 * (2024: antecedente; 2014: raça fixa + escolhas da espécie + escolhas daqui).
 */
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';
import { speciesChoiceSpecs, speciesAsi, speciesFeatEntry } from '../progression/species.js';
import { classStart } from './start-data.js';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const b = (pt, en) => ({ pt, en });

export const ABILITY_NAMES = {
  str: b('Força', 'Strength'), dex: b('Destreza', 'Dexterity'), con: b('Constituição', 'Constitution'),
  int: b('Inteligência', 'Intelligence'), wis: b('Sabedoria', 'Wisdom'), cha: b('Carisma', 'Charisma'),
};

/** Uma linha por atributo, para quem nunca jogou (texto próprio). */
export const ABILITY_BLURBS = {
  str: b('Bater forte com armas corpo a corpo, levantar peso, escalar e nadar.', 'Hitting hard in melee, lifting, climbing and swimming.'),
  dex: b('Agilidade e pontaria: arcos, esquivar de golpes, furtividade e agir primeiro.', 'Agility and aim: bows, dodging blows, stealth and acting first.'),
  con: b('Vigor e saúde: quanto maior, mais Pontos de Vida.', 'Stamina and health: the higher, the more Hit Points.'),
  int: b('Memória e raciocínio: conhecimento, investigação e a magia do mago.', 'Memory and reasoning: knowledge, investigation and wizard magic.'),
  wis: b('Percepção e intuição: notar perigos; magia de clérigo, druida e patrulheiro.', 'Perception and intuition: noticing danger; cleric, druid and ranger magic.'),
  cha: b('Presença e lábia: convencer e enganar; magia de bardo, bruxo, feiticeiro e paladino.', 'Presence and charm: persuading and deceiving; bard, warlock, sorcerer and paladin magic.'),
};

const nameList = (keys, lang) => {
  const names = keys.map(k => ABILITY_NAMES[k][lang]);
  if (names.length <= 1) return names.join('');
  const and = lang === 'pt' ? ' e ' : ' and ';
  return `${names.slice(0, -1).join(', ')}${and}${names[names.length - 1]}`;
};

// === Gerar os valores ===

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const POINT_BUY_TOTAL = 27;
export const POINT_MIN = 8;
export const POINT_MAX = 15;
export const SCORE_CAP = 20;

/** Tabela "Standard Array by Class" do SRD 5.2.1 (p. 21). Artífice: sugestão própria (não está no SRD). */
const row = (str, dex, con, int, wis, cha) => ({ str, dex, con, int, wis, cha });
export const STANDARD_ARRAY_BY_CLASS = {
  barbarian: row(15, 13, 14, 10, 12, 8),
  bard: row(8, 14, 12, 13, 10, 15),
  cleric: row(14, 8, 13, 10, 15, 12),
  druid: row(8, 12, 14, 13, 15, 10),
  fighter: row(15, 14, 13, 8, 10, 12),
  monk: row(12, 15, 13, 10, 14, 8),
  paladin: row(15, 10, 13, 8, 12, 14),
  ranger: row(12, 15, 13, 8, 14, 10),
  rogue: row(12, 15, 13, 14, 10, 8),
  sorcerer: row(10, 13, 14, 8, 12, 15),
  warlock: row(8, 14, 13, 12, 10, 15),
  wizard: row(8, 12, 13, 15, 14, 10),
  artificer: row(8, 14, 13, 15, 12, 10),
};

/** Atributos da classe do maior para o menor (pela tabela acima). */
export function classAbilityRank(className) {
  const t = STANDARD_ARRAY_BY_CLASS[className];
  if (!t) return [...ABILITIES];
  return [...ABILITIES].sort((a, c) => t[c] - t[a]);
}

/** Atributo(s) principal(is) da classe (start-data), ou o maior da tabela. */
export function primaryAbilities(char) {
  const p = classStart(char)?.primary;
  if (p?.length) return p;
  const rank = classAbilityRank(char.className);
  return char.className && STANDARD_ARRAY_BY_CLASS[char.className] ? [rank[0]] : [];
}

export const abilityMethod = (char) => {
  const m = char?.creation?.abilityMethod;
  return m === 'pointbuy' || m === 'roll' ? m : 'standard';
};

export const pointBuyCost = (abilities) =>
  ABILITIES.reduce((s, k) => s + (POINT_BUY_COST[abilities?.[k]] ?? 0), 0);

/** Quanto custa subir este valor em 1 (null = já está no máximo). */
export const nextPointCost = (v) => (v >= POINT_MAX || POINT_BUY_COST[v] == null ? null : POINT_BUY_COST[v + 1] - POINT_BUY_COST[v]);

/** 4d6 descartando o menor. rng() → [0,1). */
export function roll4d6(rng = Math.random) {
  const dice = Array.from({ length: 4 }, () => Math.floor(rng() * 6) + 1);
  const sorted = [...dice].sort((a, c) => a - c);
  return { dice, total: sorted[1] + sorted[2] + sorted[3] };
}

/** Valores disponíveis para distribuir (padrão: o conjunto; rolagem: os totais rolados). */
export function abilityPool(char) {
  const m = abilityMethod(char);
  if (m === 'standard') return STANDARD_ARRAY;
  if (m === 'roll') return (char.creation?.abilityRolls || []).map(r => r.total);
  return [];
}

/** { str: índice } só com índices válidos e sem repetição. */
export function abilityAssign(char) {
  const pool = abilityPool(char);
  const raw = char?.creation?.abilityAssign || {};
  const out = {};
  const used = new Set();
  for (const k of ABILITIES) {
    const i = raw[k];
    if (Number.isInteger(i) && i >= 0 && i < pool.length && !used.has(i)) { out[k] = i; used.add(i); }
  }
  return out;
}

const abilitiesFrom = (pool, assign) =>
  Object.fromEntries(ABILITIES.map(k => [k, assign[k] != null ? pool[assign[k]] : POINT_MIN]));

/** Patch para trocar de método, aproveitando o que já dá (ex.: conjunto padrão vale 27 pontos). */
export function setMethodPatch(char, method) {
  const creation = { ...(char.creation || {}), abilityMethod: method };
  const cur = char.abilities || {};
  if (method === 'pointbuy') {
    const ok = ABILITIES.every(k => cur[k] >= POINT_MIN && cur[k] <= POINT_MAX) && pointBuyCost(cur) <= POINT_BUY_TOTAL;
    return { creation: { ...creation, abilityAssign: {} }, abilities: ok ? { ...cur } : abilitiesFrom([], {}) };
  }
  const pool = method === 'standard' ? STANDARD_ARRAY : (creation.abilityRolls || []).map(r => r.total);
  // Se os valores atuais já são uma distribuição deste conjunto, mantém.
  const assign = {};
  const used = new Set();
  for (const k of ABILITIES) {
    const i = pool.findIndex((v, idx) => v === cur[k] && !used.has(idx));
    if (i < 0) break;
    assign[k] = i; used.add(i);
  }
  const keep = Object.keys(assign).length === 6 && method === 'standard';
  const finalAssign = keep ? assign : {};
  return { creation: { ...creation, abilityAssign: finalAssign }, abilities: abilitiesFrom(pool, finalAssign) };
}

/** Coloca o valor de índice `index` (ou null para tirar) no atributo `k`; se o valor estava em outro, troca. */
export function assignPatch(char, k, index) {
  const pool = abilityPool(char);
  const assign = { ...abilityAssign(char) };
  const prev = assign[k];
  if (index == null || index === '') delete assign[k];
  else {
    const other = ABILITIES.find(a => a !== k && assign[a] === index);
    if (other) { if (prev != null) assign[other] = prev; else delete assign[other]; }
    assign[k] = index;
  }
  return { creation: { ...(char.creation || {}), abilityAssign: assign }, abilities: abilitiesFrom(pool, assign) };
}

/** Compra de pontos: +1/-1 respeitando 8–15 e os 27 pontos (null = não pode). */
export function pointBuyPatch(char, k, delta) {
  const cur = { ...POINT_DEFAULTS(), ...(char.abilities || {}) };
  const v = cur[k] + delta;
  if (v < POINT_MIN || v > POINT_MAX) return null;
  const next = { ...cur, [k]: v };
  if (pointBuyCost(next) > POINT_BUY_TOTAL) return null;
  return { abilities: next };
}
const POINT_DEFAULTS = () => abilitiesFrom([], {});

/** Rola 6 vezes 4d6 (descarta o menor) e zera a distribuição. */
export function rollPatch(char, rng = Math.random) {
  const rolls = Array.from({ length: 6 }, () => roll4d6(rng));
  return { creation: { ...(char.creation || {}), abilityMethod: 'roll', abilityRolls: rolls, abilityAssign: {} }, abilities: abilitiesFrom([], {}) };
}

/** "Sugestão para minha classe": tabela do SRD; na rolagem, maiores valores nos atributos principais. */
export function suggestionPatch(char) {
  const table = STANDARD_ARRAY_BY_CLASS[char.className];
  if (!table) return null;
  const m = abilityMethod(char);
  if (m === 'pointbuy') return { abilities: { ...table } };
  const pool = abilityPool(char);
  if (pool.length !== 6) return null;
  const rank = classAbilityRank(char.className);
  const order = pool.map((v, i) => i).sort((a, c) => pool[c] - pool[a]);
  const assign = {};
  if (m === 'standard') ABILITIES.forEach(k => { assign[k] = STANDARD_ARRAY.indexOf(table[k]); });
  else rank.forEach((k, n) => { assign[k] = order[n]; });
  return { creation: { ...(char.creation || {}), abilityAssign: assign }, abilities: abilitiesFrom(pool, assign) };
}

/** Pendências da etapa "Atributos". */
export function abilitiesIssues(char) {
  const m = abilityMethod(char);
  if (m === 'pointbuy') {
    const a = char.abilities || {};
    const bad = ABILITIES.filter(k => !(a[k] >= POINT_MIN && a[k] <= POINT_MAX));
    if (bad.length) return [b(`Na compra de pontos cada valor vai de 8 a 15 (ajuste ${nameList(bad, 'pt')}).`, `With point buy each score goes from 8 to 15 (fix ${nameList(bad, 'en')}).`)];
    const left = POINT_BUY_TOTAL - pointBuyCost(a);
    if (left > 0) return [b(`Você ainda tem ${left} ${left === 1 ? 'ponto' : 'pontos'} para gastar. Use os botões + nos atributos.`, `You still have ${left} point${left === 1 ? '' : 's'} to spend. Use the + buttons.`)];
    if (left < 0) return [b(`Você gastou ${-left} ${left === -1 ? 'ponto' : 'pontos'} a mais. Diminua algum atributo.`, `You spent ${-left} point${left === -1 ? '' : 's'} too many. Lower an ability.`)];
    return [];
  }
  if (m === 'roll' && (char.creation?.abilityRolls || []).length !== 6) {
    return [b('Toque em "Rolar os dados" para gerar seus 6 valores.', 'Tap "Roll the dice" to generate your 6 scores.')];
  }
  const assign = abilityAssign(char);
  const missing = ABILITIES.filter(k => assign[k] == null);
  if (missing.length) {
    return [b(`Falta dar um valor para: ${nameList(missing, 'pt')}.`, `Still needs a score: ${nameList(missing, 'en')}.`)];
  }
  return [];
}

// === Bônus de atributo (2024: antecedente; 2014: raça) ===

const PATTERNS = { '2-1': [2, 1], '1-1-1': [1, 1, 1] };
const raceOf = (char) => SRD.RACES.find(r => r.id === char.race) || null;
const backgroundOf = (char) => Utils.backgrounds(char).find(x => x.id === char.background) || null;

/**
 * Como funciona o bônus desta ficha:
 *   { kind: 'background', key, from, patterns }  2024: +2/+1 ou +1/+1/+1 entre os 3 do antecedente
 *   { kind: 'flex', key, from, patterns }         2014 raças flexíveis: +2/+1 ou +1/+1/+1 em quaisquer
 *   { kind: 'other', key, from, count }           2014 Meio-Elfo: +1 em N atributos diferentes (fora os fixos)
 *   { kind: 'fixed' }                              2014: só bônus fixos (ou escolhidos na etapa da espécie)
 *   { kind: 'needBackground' } / { kind: 'needRace' }
 */
export function bonusMode(char) {
  if (char.rulesVersion === '2024') {
    const bg = backgroundOf(char);
    if (!bg) return { kind: 'needBackground' };
    return { kind: 'background', key: `bg:${bg.id}`, from: [...bg.abilities], patterns: ['2-1', '1-1-1'], source: bg };
  }
  const race = raceOf(char);
  if (!race) return { kind: 'needRace' };
  const speciesHasAsi = speciesChoiceSpecs(char).some(c => c.key === 'asi');
  if (race.asi?.other && !speciesHasAsi) {
    const fixed = Object.keys(race.asi).filter(k => ABILITIES.includes(k));
    return { kind: 'other', key: `race:${race.id}`, from: ABILITIES.filter(k => !fixed.includes(k)), count: race.asi.other, source: race };
  }
  if (race.flexibleAsi && !speciesHasAsi) {
    return { kind: 'flex', key: `race:${race.id}`, from: [...ABILITIES], patterns: ['2-1', '1-1-1'], source: race };
  }
  return { kind: 'fixed', source: race, speciesHasAsi };
}

const choosable = (mode) => ['background', 'flex', 'other'].includes(mode.kind);

/** Escolhas atuais (vazias se o antecedente/raça mudou). */
export function bonusChoice(char, mode = bonusMode(char)) {
  const saved = char.creation?.abilityBonus;
  if (!choosable(mode) || !saved || saved.key !== mode.key) return { pattern: null, picks: {} };
  const picks = Object.fromEntries(Object.entries(saved.picks || {})
    .filter(([k, v]) => mode.from.includes(k) && Number.isInteger(v) && v > 0 && v <= (mode.kind === 'other' ? 1 : 2)));
  const pattern = mode.kind === 'other' ? null : (PATTERNS[saved.pattern] ? saved.pattern : null);
  return { pattern, picks };
}

/** Bônus que não depende das escolhas daqui: 2014 raça fixa + escolha da espécie + talento da espécie. */
export function baseBonus(char) {
  const out = {};
  const add = (obj) => { for (const [k, v] of Object.entries(obj || {})) if (ABILITIES.includes(k) && v) out[k] = (out[k] || 0) + v; };
  if (char.rulesVersion !== '2024') {
    add(Utils.applyRaceBonus(char, char.race));
    add(speciesAsi(char));
  }
  add(speciesFeatEntry(char)?.asi);
  return out;
}

/** char.raceBonus esperado = base + escolhas daqui. */
export function expectedRaceBonus(char) {
  const out = { ...baseBonus(char) };
  for (const [k, v] of Object.entries(bonusChoice(char).picks)) out[k] = (out[k] || 0) + v;
  return out;
}

const norm = (o) => JSON.stringify(ABILITIES.map(k => (o || {})[k] || 0));
export const raceBonusInSync = (char) => norm(char.raceBonus) === norm(expectedRaceBonus(char));

/** Patch que grava as escolhas e o raceBonus resultante. */
export function bonusPatch(char, { pattern = null, picks = {} }) {
  const mode = bonusMode(char);
  const creation = { ...(char.creation || {}), abilityBonus: { key: mode.key, pattern, picks } };
  const next = { ...char, creation };
  return { creation, raceBonus: expectedRaceBonus(next) };
}

/** Patch que só alinha char.raceBonus ao esperado (ex.: depois de trocar a raça). */
export const syncRaceBonusPatch = (char) => ({ raceBonus: expectedRaceBonus(char) });

/** Valor final de um atributo com um bônus hipotético. */
const finalWith = (char, bonus, k) => ((char.abilities || {})[k] || 0) + (bonus[k] || 0);

/** Sugestão: +2 no atributo da lista mais importante para a classe e +1 no seguinte (ou +1 nos 2 melhores). */
export function recommendedBonus(char, mode = bonusMode(char)) {
  if (!choosable(mode)) return null;
  const rank = classAbilityRank(char.className);
  const from = [...mode.from].sort((a, c) => rank.indexOf(a) - rank.indexOf(c));
  if (mode.kind === 'other') return { pattern: null, picks: Object.fromEntries(from.slice(0, mode.count).map(k => [k, 1])) };
  // Não estourar 20: se o melhor não aguenta +2, tenta o próximo.
  const base = baseBonus(char);
  const fits = (k, n) => finalWith(char, base, k) + n <= SCORE_CAP;
  const plus2 = from.find(k => fits(k, 2));
  const plus1 = from.find(k => k !== plus2 && fits(k, 1));
  if (!plus2 || !plus1) return { pattern: '1-1-1', picks: Object.fromEntries(from.slice(0, 3).map(k => [k, 1])) };
  return { pattern: '2-1', picks: { [plus2]: 2, [plus1]: 1 } };
}

/** Pendências da etapa "Bônus de atributo". */
export function abilityBonusIssues(char) {
  const mode = bonusMode(char);
  if (mode.kind === 'needBackground') return [b('Escolha um antecedente primeiro: é ele que diz quais atributos sobem.', 'Pick a background first: it decides which abilities go up.')];
  if (mode.kind === 'needRace') return [b('Escolha uma espécie primeiro: é ela que diz quais atributos sobem.', 'Pick a species first: it decides which abilities go up.')];
  const out = [];
  if (choosable(mode)) {
    const { pattern, picks } = bonusChoice(char, mode);
    const vals = Object.values(picks);
    if (mode.kind === 'other') {
      const n = vals.length;
      if (n < mode.count) out.push(b(`Escolha mais ${mode.count - n} ${mode.count - n === 1 ? 'atributo' : 'atributos'} para ganhar +1.`, `Pick ${mode.count - n} more ${mode.count - n === 1 ? 'ability' : 'abilities'} to get +1.`));
      if (n > mode.count) out.push(b(`Só ${mode.count} atributos ganham +1: desmarque ${n - mode.count}.`, `Only ${mode.count} abilities get +1: unmark ${n - mode.count}.`));
    } else if (!pattern) {
      out.push(b('Escolha como dividir o bônus: "+2 e +1" ou "+1, +1 e +1".', 'Choose how to split the bonus: "+2 and +1" or "+1, +1 and +1".'));
    } else if (pattern === '2-1') {
      const twos = vals.filter(v => v === 2).length;
      const ones = vals.filter(v => v === 1).length;
      if (twos !== 1) out.push(b('Escolha qual atributo ganha +2.', 'Choose which ability gets +2.'));
      if (ones !== 1) out.push(b('Escolha qual atributo (diferente) ganha +1.', 'Choose which (different) ability gets +1.'));
    } else {
      const n = vals.filter(v => v === 1).length;
      if (vals.some(v => v !== 1)) out.push(b('No "+1, +1 e +1" cada atributo ganha só +1.', 'With "+1, +1 and +1" each ability gets only +1.'));
      else if (n !== 3) out.push(b(`Escolha mais ${3 - n} ${3 - n === 1 ? 'atributo' : 'atributos'} para ganhar +1.`, `Pick ${3 - n} more ${3 - n === 1 ? 'ability' : 'abilities'} to get +1.`));
    }
  }
  const total = expectedRaceBonus(char);
  const over = ABILITIES.filter(k => finalWith(char, total, k) > SCORE_CAP);
  if (over.length) out.push(b(`Nenhum atributo pode passar de 20 (${nameList(over, 'pt')}). Ponha o bônus em outro.`, `No ability can go above 20 (${nameList(over, 'en')}). Put the bonus elsewhere.`));
  if (!out.length && !raceBonusInSync(char)) out.push(b('Os bônus mudaram com a sua origem: abra esta etapa para atualizar.', 'Your origin changed the bonuses: open this step to update them.'));
  return out;
}

// === Mini-resumo ===

/** PV no nível 1, CA sem armadura e Iniciativa com os bônus atuais. */
export function quickSummary(char) {
  const c = { ...char, raceBonus: expectedRaceBonus(char) };
  const dex = Utils.abilityMod(c, 'dex');
  const feats = c.feats || [];
  let init = dex;
  if (c.rulesVersion === '2024' && feats.some(f => f?.id === 'alert')) init += Utils.profBonus(c);
  if (c.rulesVersion !== '2024' && feats.some(f => f?.id === 'alert2014' || f?.id === 'alert')) init += 5;
  return {
    hp: c.className ? Utils.maxHpDefault(c) : null,
    ac: Utils.computeAc({ ...c, armor: '', hasShield: false }),
    initiative: init,
    final: Object.fromEntries(ABILITIES.map(k => [k, Utils.abilityWithRace(c, k)])),
  };
}
