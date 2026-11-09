// Rolagem múltipla por linhas (puro, testável): cada linha é um ataque/teste com d20,
// vínculos (atributo, proficiência), bônus fixo e uma corrente de dados com papel:
//   damage → rolagem de dano (dobra os DADOS no 20 natural)
//   bonus  → soma no d20 (Inspiração de Bardo, Bênção…)
// Uma bandeja rola todas as linhas juntas e devolve um resultado por linha.

export const ABILITIES = ['none', 'str', 'dex', 'con', 'int', 'wis', 'cha'];
export const DICE = [4, 6, 8, 10, 12, 20, 100];

let seq = 0;
export const newId = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;

export const newRow = (over = {}) => ({
  id: newId(), name: '', abil: 'str', pb: true, flat: 0, abilToDamage: true, adv: 'normal',
  dice: [{ count: 1, die: 8, role: 'damage' }],
  ...over,
});

export const duplicateRow = (row) => ({ ...row, id: newId(), dice: row.dice.map(d => ({ ...d })) });

export const ADV_NEXT = { normal: 'adv', adv: 'dis', dis: 'normal' };

/** Modificadores resolvidos com a ficha: { atk, dmg }. `mods` = { str: +3, ..., pb: +2 }. */
export function rowMods(row, mods = {}) {
  const ab = row.abil && row.abil !== 'none' ? (mods[row.abil] || 0) : 0;
  const pb = row.pb ? (mods.pb || 0) : 0;
  const flat = Number(row.flat) || 0;
  return { atk: ab + pb + flat, dmg: (row.abilToDamage ? ab : 0) + flat };
}

const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);
const diceText = (list) => list.map(d => `${d.count}d${d.die}`).join('+');

/** "1d20+7 (+1d8) | 1d12+5". */
export function rowFormula(row, mods = {}) {
  const m = rowMods(row, mods);
  const bonus = row.dice.filter(d => d.role === 'bonus');
  const dmg = row.dice.filter(d => d.role === 'damage');
  const atk = `${row.adv === 'normal' ? '1d20' : '2d20'}${m.atk ? fmt(m.atk) : ''}${bonus.length ? ` +${diceText(bonus)}` : ''}`;
  const dmgTxt = dmg.length ? `${diceText(dmg)}${m.dmg ? fmt(m.dmg) : ''}` : '';
  return dmgTxt ? `${atk} | ${dmgTxt}` : atk;
}

const rollN = (n, sides, rand) => Array.from({ length: Math.max(0, n) }, () => 1 + Math.floor(rand() * sides));

/** Rola uma linha. → { id, name, adv, d20: [a,b?], kept, bonus: [{die, rolls}], atk, crit, fumble, damage: [{die, rolls}], dmg } */
export function rollRow(row, mods = {}, rand = Math.random) {
  const m = rowMods(row, mods);
  const d20 = rollN(row.adv === 'normal' ? 1 : 2, 20, rand);
  const kept = row.adv === 'adv' ? Math.max(...d20) : row.adv === 'dis' ? Math.min(...d20) : d20[0];
  const crit = kept === 20;
  const fumble = kept === 1;
  const bonus = row.dice.filter(d => d.role === 'bonus').map(d => ({ die: d.die, rolls: rollN(d.count, d.die, rand) }));
  // 5e: no crítico, só os dados de dano rolam em dobro (o modificador não dobra)
  const damage = row.dice.filter(d => d.role === 'damage').map(d => ({ die: d.die, rolls: rollN(d.count * (crit ? 2 : 1), d.die, rand) }));
  const sum = (gs) => gs.reduce((s, g) => s + g.rolls.reduce((a, b) => a + b, 0), 0);
  const atk = kept + m.atk + sum(bonus);
  const dmg = damage.length ? Math.max(0, sum(damage) + m.dmg) : null;
  return { id: row.id, name: row.name, adv: row.adv, d20, kept, bonus, atk, crit, fumble, damage, dmg, mods: m };
}

export const rollTray = (rows, mods, rand) => rows.map(r => rollRow(r, mods, rand));

/** Modificadores da ficha aberta (Utils injetado para manter o módulo puro). */
export function modsFromChar(char, Utils) {
  if (!char || !Utils) return {};
  const out = {};
  for (const k of ABILITIES.slice(1)) { try { out[k] = Utils.abilityMod(char, k); } catch { out[k] = 0; } }
  try { out.pb = Utils.profBonus(char); } catch { out.pb = 0; }
  return out;
}
