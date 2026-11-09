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
  const out = {};
  row.badges.forEach((b, i) => {
    if (b.kind === 'die' && b.die !== 20) out[i] = Array.from({ length: b.count }, () => roll1(b.die, rand));
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
