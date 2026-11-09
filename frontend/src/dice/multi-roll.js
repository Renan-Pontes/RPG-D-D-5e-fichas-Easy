// Rolagem múltipla por linhas de "emblemas" (puro, testável).
// Linha = { id, name, adv, badges: [...] }; emblema:
//   { kind: 'die', die, count, sign }   dado (sign +1 soma, -1 subtrai)
//   { kind: 'abil', abil, count, sign } modificador de atributo da ficha
//   { kind: 'pb', count, sign }         bônus de proficiência
//   { kind: 'flat', value }             número fixo (positivo ou negativo)
// Leitura de uma linha com d20 (ataque/teste): o d20 + modificadores dão o TESTE; os
// outros dados + atributo + fixo dão o DANO (proficiência só no teste, como em 5e).
// Sem d20, a linha é uma soma só. No 20 natural, o dano rola de novo os seus dados.

export const DICE = [4, 6, 8, 10, 12, 20, 100];
export const ABILS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ADV_NEXT = { normal: 'adv', adv: 'dis', dis: 'normal' };

let seq = 0;
export const newId = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;
export const newRow = (over = {}) => ({ id: newId(), name: '', adv: 'normal', badges: [], ...over });
export const duplicateRow = (row) => ({ ...row, id: newId(), badges: row.badges.map(b => ({ ...b })) });

export const badgeKey = (b) => (b.kind === 'die' ? `d${b.die}:${b.sign}` : b.kind === 'abil' ? `a:${b.abil}:${b.sign}` : b.kind === 'pb' ? `pb:${b.sign}` : 'flat');

/** Acrescenta um emblema; iguais empilham (count++), o fixo soma no valor. */
export function addBadge(row, badge) {
  const b = badge.kind === 'flat' ? { kind: 'flat', value: Number(badge.value) || 0 } : { count: 1, sign: 1, ...badge };
  if (b.kind === 'flat' && !b.value) return row;
  const key = badgeKey(b);
  const i = row.badges.findIndex(x => badgeKey(x) === key);
  if (i < 0) return { ...row, badges: [...row.badges, b] };
  const badges = row.badges.map((x, j) => (j !== i ? x : x.kind === 'flat' ? { ...x, value: x.value + b.value } : { ...x, count: x.count + (b.count || 1) }));
  return { ...row, badges: badges.filter(x => x.kind !== 'flat' || x.value) };
}

/** Tira um da pilha (ou o emblema inteiro). */
export function removeOne(row, idx) {
  const b = row.badges[idx];
  if (!b) return row;
  if (b.kind !== 'flat' && b.count > 1) return { ...row, badges: row.badges.map((x, j) => (j === idx ? { ...x, count: x.count - 1 } : x)) };
  return { ...row, badges: row.badges.filter((_, j) => j !== idx) };
}

const sgn = (n) => (n >= 0 ? `+${n}` : `${n}`);
const roll1 = (sides, rand) => 1 + Math.floor(rand() * sides);

/** Valor fixo de um emblema não-dado com a ficha (`mods` = { str, …, pb }). */
export const staticValue = (b, mods = {}) => (b.kind === 'flat' ? b.value
  : b.kind === 'abil' ? (mods[b.abil] || 0) * b.count * b.sign
    : b.kind === 'pb' ? (mods.pb || 0) * b.count * b.sign : 0);

export const hasD20 = (row) => row.badges.some(b => b.kind === 'die' && b.die === 20 && b.sign > 0);

/** Rola os dados da linha → { [idx]: [valores] }. O d20 com vantagem/desvantagem rola 2. */
export function rollDice(row, rand = Math.random) {
  const out = {};
  let firstD20 = true;
  row.badges.forEach((b, i) => {
    if (b.kind !== 'die') return;
    let n = b.count;
    if (b.die === 20 && b.sign > 0 && firstD20) { firstD20 = false; if (row.adv !== 'normal') n += 1; }
    out[i] = Array.from({ length: n }, () => roll1(b.die, rand));
  });
  return out;
}

/** Dados extras do crítico: os dados de dano (não-d20) rolam de novo. */
export function critExtra(row, rand = Math.random) {
  // dados acoplados ao d20 (Inspiração de Bardo d8, Bênção d4…) somam no teste e não dobram
  const d20 = row.badges.findIndex(b => b.kind === 'die' && b.die === 20 && b.sign > 0);
  const d20Group = d20 >= 0 ? row.badges[d20].group : null;
  const out = {};
  row.badges.forEach((b, i) => {
    if (b.kind !== 'die' || b.die === 20) return;
    if (d20Group && b.group === d20Group) return;
    out[i] = Array.from({ length: b.count }, () => roll1(b.die, rand));
  });
  return out;
}

const sum = (a) => (a || []).reduce((s, v) => s + v, 0);

/** Lê a linha rolada → { kept, d20Index, crit, fumble, check, damage, total } */
export function evalRow(row, mods = {}, rolls = {}, extra = {}) {
  const d20Index = row.badges.findIndex(b => b.kind === 'die' && b.die === 20 && b.sign > 0);
  let kept = null;
  if (d20Index >= 0) {
    const r = rolls[d20Index] || [];
    const b = row.badges[d20Index];
    if (row.adv === 'adv') kept = Math.max(r[0] || 0, r[1] || 0);
    else if (row.adv === 'dis') kept = Math.min(r[0] || 0, r[1] ?? r[0] ?? 0);
    else kept = r[0] ?? null;
    // d20 empilhado (2×d20 sem vantagem) soma os demais
    if (row.adv === 'normal' && b.count > 1) kept = sum(r);
  }
  const crit = d20Index >= 0 && (row.adv === 'normal' ? (rolls[d20Index] || [])[0] === 20 : kept === 20);
  const fumble = d20Index >= 0 && kept === 1;
  let check = d20Index >= 0 ? kept : 0;
  let damage = 0;
  let hasDamage = false;
  row.badges.forEach((b, i) => {
    if (i === d20Index) return;
    if (b.kind === 'die') {
      const v = (sum(rolls[i]) + sum(extra[i])) * b.sign;
      if (d20Index >= 0 && b.die !== 20) { damage += v; hasDamage = true; } else check += v;
      return;
    }
    const v = staticValue(b, mods);
    if (d20Index < 0) { check += v; return; }
    check += v;
    if (b.kind !== 'pb') damage += v;
  });
  if (d20Index < 0) return { kept: null, d20Index, crit: false, fumble: false, check: null, damage: null, total: check };
  return { kept, d20Index, crit, fumble, check, damage: hasDamage ? Math.max(0, damage) : null, total: check };
}

/** Texto curto da linha: "d20 +STR +PB +3 | 1d12". */
export function rowText(row) {
  return row.badges.map(b => {
    const s = b.kind === 'flat' ? sgn(b.value) : (b.sign < 0 ? '−' : '+');
    if (b.kind === 'die') return `${s}${b.count > 1 ? b.count : ''}d${b.die}`;
    if (b.kind === 'abil') return `${s}${b.count > 1 ? `${b.count}×` : ''}${b.abil.toUpperCase()}`;
    if (b.kind === 'pb') return `${s}${b.count > 1 ? `${b.count}×` : ''}PB`;
    return s;
  }).join(' ').replace(/^\+/, '');
}

export function modsFromChar(char, Utils) {
  if (!char || !Utils) return {};
  const out = {};
  for (const k of ABILS) { try { out[k] = Utils.abilityMod(char, k); } catch { out[k] = 0; } }
  try { out.pb = Utils.profBonus(char); } catch { out.pb = 0; }
  return out;
}

// ── Acoplar, travar e ler por grupos ──────────────────────────────────────────
// Emblemas acoplados compartilham `group` (ex.: FOR solto sobre 2d6 → o dano dos 2d6
// soma a FOR). Com a linha travada (row.locked), o que entra depois ganha `temp: true`
// e some depois da rolagem.
const gid = () => `g${Date.now().toString(36)}${(seq++).toString(36)}`;
const stackKey = (b) => `${badgeKey(b)}|${b.group || ''}|${b.temp ? 't' : ''}`;

/** Acrescenta respeitando trava (temporário) e grupo; iguais do mesmo grupo empilham. */
export function addBadgeTo(row, badge, { group = null } = {}) {
  const b = badge.kind === 'flat' ? { kind: 'flat', value: Number(badge.value) || 0 } : { count: 1, sign: 1, ...badge };
  if (b.kind === 'flat' && !b.value) return row;
  if (row.locked) b.temp = true;
  if (group) b.group = group;
  const i = row.badges.findIndex(x => stackKey(x) === stackKey(b));
  if (i >= 0) {
    const badges = row.badges.map((x, j) => (j !== i ? x : x.kind === 'flat' ? { ...x, value: x.value + b.value } : { ...x, count: x.count + (b.count || 1) }));
    return { ...row, badges: badges.filter(x => x.kind !== 'flat' || x.value) };
  }
  const badges = [...row.badges];
  // entra logo depois do último membro do grupo (fica junto, visualmente)
  const last = group ? badges.map(x => x.group).lastIndexOf(group) : -1;
  if (last >= 0) badges.splice(last + 1, 0, b); else badges.push(b);
  return { ...row, badges };
}

/** Solta `badge` sobre o emblema `toIdx` da linha: acopla os dois. */
export function dropOnBadge(row, toIdx, badge) {
  const target = row.badges[toIdx];
  if (!target) return addBadgeTo(row, badge);
  const group = target.group || gid();
  const withGroup = { ...row, badges: row.badges.map((x, j) => (j === toIdx ? { ...x, group } : x)) };
  return addBadgeTo(withGroup, badge, { group });
}

/** Acopla dois emblemas que já estão na linha (arrasta `fromIdx` sobre `toIdx`). */
export function coupleBadges(row, fromIdx, toIdx) {
  if (fromIdx === toIdx || !row.badges[fromIdx] || !row.badges[toIdx]) return row;
  const group = row.badges[toIdx].group || gid();
  const moving = { ...row.badges[fromIdx], group };
  const rest = row.badges.filter((_, j) => j !== fromIdx).map(x => (x === row.badges[toIdx] ? { ...x, group } : x));
  const last = rest.map(x => x.group).lastIndexOf(group);
  rest.splice(last + 1, 0, moving);
  return { ...row, badges: rest };
}

export const uncouple = (row, idx) => ({ ...row, badges: row.badges.map((x, j) => (j === idx ? { ...x, group: undefined } : x)) });

export const toggleLock = (row) => (row.locked ? { ...row, locked: false } : { ...row, locked: true });

/** Depois de rolar: os temporários somem. */
export const dropTemps = (row) => ({ ...row, badges: row.badges.filter(b => !b.temp) });

/**
 * Unidades de leitura da linha rolada (na ordem dos emblemas):
 *   check  → o d20 (+ seu grupo + estáticos soltos)
 *   damage → cada dado (ou grupo com dados) fora do d20 + estáticos acoplados; o 1º
 *            sem acoplados recebe atributo/fixo soltos (BP só vai ao teste)
 *   sum    → linha sem d20: cada grupo de dados; estáticos soltos vão no 1º
 * → [{ kind, value, die, idxs: [..], nat? }]
 */
export function evalUnits(row, mods = {}, rolls = {}, extra = {}) {
  const bs = row.badges;
  const d20 = bs.findIndex(b => b.kind === 'die' && b.die === 20 && b.sign > 0);
  const units = [];
  const byGroup = new Map();
  bs.forEach((b, i) => {
    const key = b.group || `#${i}`;
    if (!byGroup.has(key)) { byGroup.set(key, []); units.push(key); }
    byGroup.get(key).push(i);
  });
  const dieVal = (i) => {
    const b = bs[i];
    const r = rolls[i] || [];
    if (i === d20) {
      if (row.adv === 'adv') return Math.max(...r);
      if (row.adv === 'dis') return Math.min(...r);
      return sum(r);
    }
    return (sum(r) + sum(extra[i])) * b.sign;
  };
  const loose = [];
  const out = [];
  for (const key of units) {
    const idxs = byGroup.get(key);
    const dice = idxs.filter(i => bs[i].kind === 'die');
    if (!dice.length) { loose.push(...idxs); continue; }
    const value = idxs.reduce((s, i) => s + (bs[i].kind === 'die' ? dieVal(i) : staticValue(bs[i], mods)), 0);
    const hasCoupledStatic = idxs.some(i => bs[i].kind !== 'die');
    const kind = d20 >= 0 ? (idxs.includes(d20) ? 'check' : 'damage') : 'sum';
    const nat = idxs.includes(d20) ? dieVal(d20) : null;
    out.push({ kind, value, die: bs[dice[0]].die, idxs, nat, hasCoupledStatic });
  }
  const looseAll = loose.reduce((s, i) => s + staticValue(bs[i], mods), 0);
  const looseDmg = loose.filter(i => bs[i].kind !== 'pb').reduce((s, i) => s + staticValue(bs[i], mods), 0);
  if (d20 >= 0) {
    const chk = out.find(u => u.kind === 'check');
    if (chk) { chk.value += looseAll; chk.idxs = [...chk.idxs, ...loose]; }
    const firstDmg = out.find(u => u.kind === 'damage' && !u.hasCoupledStatic);
    if (firstDmg) firstDmg.value += looseDmg;
    out.forEach(u => { if (u.kind === 'damage') u.value = Math.max(0, u.value); });
  } else if (out.length) {
    out[0].value += looseAll; out[0].idxs = [...out[0].idxs, ...loose];
  } else if (loose.length) {
    out.push({ kind: 'sum', value: looseAll, die: null, idxs: loose, nat: null });
  }
  return out;
}

/** Parte fixa de cada unidade (estáticos já fundidos), para mostrar antes de rolar:
 *  → { [índice do 1º dado da unidade]: +N } */
export function unitStatics(row, mods = {}) {
  const zero = {};
  row.badges.forEach((b, i) => { if (b.kind === 'die') zero[i] = [0]; });
  const out = {};
  for (const u of evalUnits(row, mods, zero)) {
    const first = u.idxs.find(i => row.badges[i]?.kind === 'die');
    if (first != null) out[first] = u.value;
  }
  return out;
}

/** Linhas iniciais a partir da ficha: corpo a corpo, à distância e ataque mágico (se conjura). */
export function defaultRows(char, Utils, lang = 'pt') {
  const L = (pt, en) => (lang === 'pt' ? pt : en);
  const weapon = (name, abil, die) => {
    let r = newRow({ name });
    r = addBadgeTo(r, { kind: 'die', die: 20 });
    r = addBadgeTo(r, { kind: 'abil', abil });
    r = addBadgeTo(r, { kind: 'pb' });
    r = addBadgeTo(r, { kind: 'die', die });
    return dropOnBadge(r, r.badges.length - 1, { kind: 'abil', abil });
  };
  const rows = [
    weapon(L('Ataque corpo a corpo', 'Melee weapon attack'), 'str', 8),
    weapon(L('Ataque à distância', 'Ranged weapon attack'), 'dex', 8),
  ];
  let ab = null;
  try { ab = char && Utils ? Utils.spellcastingAbility(char) : null; } catch { ab = null; }
  if (ab) {
    let r = newRow({ name: L('Ataque mágico', 'Spell attack') });
    r = addBadgeTo(r, { kind: 'die', die: 20 });
    r = addBadgeTo(r, { kind: 'abil', abil: ab });
    r = addBadgeTo(r, { kind: 'pb' });
    rows.push(r);
  }
  return rows;
}
