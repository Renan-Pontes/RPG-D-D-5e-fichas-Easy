/**
 * Estimador de Nível de Desafio (ND/CR) pelo método do DMG 2014
 * ("Creating a Monster": ND ofensivo × ND defensivo, média dos dois).
 *
 * Portado de 5e Monster Maker (github.com/ebshimizu/5e-monster-maker):
 * src/data/CR.ts (tabela) e src/components/cr/useCr.ts (lógica).
 * Copyright (c) 2024 Evan Shimizu — MIT
 * (texto completo da licença MIT: https://opensource.org/license/mit)
 *
 * Adaptação: função pura sobre o NOSSO formato de monstro (frontend/data/monsters.js),
 * sem anotações manuais por ação. Tudo aqui é ESTIMATIVA — a tabela é a de
 * referência do DMG 2014; os NDs oficiais de 2024 podem divergir.
 *
 * Limites conhecidos (documentados no teste):
 *  - Magias listadas só em texto não entram no dano (conjuradores ficam subestimados).
 *  - Traços que causam dano (ex.: Sneak Attack) e efeitos sem dano (paralisia,
 *    dreno de vida, controle) não são contados; só Magic Resistance vira +2 CA efetiva.
 *  - Multiataque é lido do campo estruturado `multiattack` ou, sem ele, do texto em
 *    inglês ("Two scimitar attacks and one dagger attack", "Bite + two Claws").
 *  - Diferença do 5emm: resistência/imunidade só aplica o multiplicador de PV se for
 *    a dano físico ou a 3+ tipos (critério do DMG), e as duas não se multiplicam.
 *  - CD/bônus de magia são lidos do traço de conjuração ("DC 14. +6 spell attack").
 */

export const CR_TABLE_NOTE = {
  pt: 'Referência DMG 2014 — estimativa',
  en: 'DMG 2014 reference — estimate',
};

// cr, proficiência, CA, PV mín/máx, bônus de ataque, dano/rodada mín/máx, CD, numérico, XP
const RAW = [
  ['0', 2, 13, 1, 6, 3, 0, 1, 13, 0, 10],
  ['1/8', 2, 13, 7, 35, 3, 2, 3, 13, 0.125, 25],
  ['1/4', 2, 13, 36, 49, 3, 4, 5, 13, 0.25, 50],
  ['1/2', 2, 13, 50, 70, 3, 6, 8, 13, 0.5, 100],
  ['1', 2, 13, 71, 85, 3, 9, 14, 13, 1, 200],
  ['2', 2, 13, 86, 100, 3, 15, 20, 13, 2, 450],
  ['3', 2, 13, 101, 115, 4, 21, 26, 13, 3, 700],
  ['4', 2, 14, 116, 130, 5, 27, 32, 14, 4, 1100],
  ['5', 3, 15, 131, 145, 6, 33, 38, 15, 5, 1800],
  ['6', 3, 15, 146, 160, 6, 39, 44, 15, 6, 2300],
  ['7', 3, 15, 161, 175, 6, 45, 50, 15, 7, 2900],
  ['8', 3, 16, 176, 190, 7, 51, 56, 16, 8, 3900],
  ['9', 4, 16, 191, 205, 7, 57, 62, 16, 9, 5000],
  ['10', 4, 17, 206, 220, 7, 63, 68, 16, 10, 5900],
  ['11', 4, 17, 221, 235, 8, 69, 74, 17, 11, 7200],
  ['12', 4, 17, 236, 250, 8, 75, 80, 18, 12, 8400],
  ['13', 5, 18, 251, 265, 8, 81, 86, 18, 13, 10000],
  ['14', 5, 18, 266, 280, 8, 87, 92, 18, 14, 11500],
  ['15', 5, 18, 281, 295, 8, 93, 98, 18, 15, 13000],
  ['16', 5, 18, 296, 310, 9, 99, 104, 18, 16, 15000],
  ['17', 6, 19, 311, 325, 10, 105, 110, 19, 17, 18000],
  ['18', 6, 19, 326, 340, 10, 111, 116, 19, 18, 20000],
  ['19', 6, 19, 341, 355, 10, 117, 122, 19, 19, 22000],
  ['20', 6, 19, 356, 400, 10, 123, 140, 19, 20, 25000],
  ['21', 7, 19, 401, 445, 11, 141, 158, 20, 21, 33000],
  ['22', 7, 19, 446, 490, 11, 159, 176, 20, 22, 41000],
  ['23', 7, 19, 491, 535, 11, 177, 194, 20, 23, 50000],
  ['24', 7, 19, 536, 580, 12, 195, 212, 21, 24, 62000],
  ['25', 8, 19, 581, 625, 12, 213, 230, 21, 25, 75000],
  ['26', 8, 19, 626, 670, 12, 231, 248, 21, 26, 90000],
  ['27', 8, 19, 671, 715, 13, 249, 266, 22, 27, 105000],
  ['28', 8, 19, 716, 760, 13, 267, 284, 22, 28, 120000],
  ['29', 9, 19, 760, 805, 13, 285, 302, 22, 29, 135000],
  ['30', 9, 19, 805, 850, 14, 303, 320, 23, 30, 155000],
];

/**
 * Tabela ND (DMG 2014, estimativa). O XP é o do SRD 5.2.1
 * ("Experience Points by Challenge Rating"; ND 0 = "0 or 10", usamos 10).
 */
export const CR_TABLE = RAW.map(([cr, proficiency, ac, hpMin, hpMax, attack, dprMin, dprMax, saveDc, numeric, xp], index) => ({
  index, cr, proficiency, ac, hpMin, hpMax, attack, dprMin, dprMax, saveDc, numeric, xp,
}));

/** Mesma busca do 5emm: última linha cuja faixa [linha, próxima) contém o valor. */
export function crByRange(value, field) {
  for (let i = 0; i < CR_TABLE.length - 1; i++) {
    if (CR_TABLE[i][field] <= value && value < CR_TABLE[i + 1][field]) return CR_TABLE[i];
  }
  if (value <= CR_TABLE[0][field]) return CR_TABLE[0];
  return CR_TABLE[CR_TABLE.length - 1];
}

export function crRow(cr) {
  if (cr == null || cr === '') return null;
  if (typeof cr === 'number') return CR_TABLE.find(r => r.numeric === cr) || null;
  const s = String(cr).trim();
  return CR_TABLE.find(r => r.cr === s) || CR_TABLE.find(r => r.numeric === parseFloat(s)) || null;
}

/** Converte "1/4" | 0.25 | "2" em número (ou null). */
export function crToNumber(cr) {
  if (typeof cr === 'number') return Number.isFinite(cr) ? cr : null;
  const s = String(cr ?? '').trim();
  if (!s) return null;
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function crLabel(num) {
  const row = crRow(num);
  if (row) return row.cr;
  if (num > 0 && num < 1) return `1/${Math.round(1 / num)}`;
  return String(num);
}

/** XP por ND (SRD 5.2.1). */
export function xpForCr(cr) {
  const row = crRow(typeof cr === 'number' ? cr : crToNumber(cr));
  return row ? row.xp : 0;
}

/**
 * Média de uma expressão de dados, como o 5emm: floor(n × (lados+1)/2) por termo,
 * mais os modificadores. Aceita "2d6+3", "1d10 + 1d6 + 4", "7", "2d8-1".
 */
export function averageDamage(expr) {
  if (expr == null) return 0;
  if (Array.isArray(expr)) return expr.reduce((sum, x) => sum + averageDamage(x?.damage ?? x), 0);
  if (typeof expr === 'number') return Math.max(0, expr);
  const s = String(expr).replace(/\s+/g, '').toLowerCase();
  if (!s) return 0;
  let total = 0;
  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g;
  let m;
  let matched = false;
  while ((m = re.exec(s))) {
    matched = true;
    if (m[3]) {
      const sign = m[1] === '-' ? -1 : 1;
      const count = m[2] === '' ? 1 : parseInt(m[2], 10);
      const sides = parseInt(m[3], 10);
      total += sign * (sides === 1 ? count : Math.floor(count * ((sides + 1) / 2)));
    } else if (m[5]) {
      total += (m[4] === '-' ? -1 : 1) * parseInt(m[5], 10);
    }
  }
  return matched ? Math.max(0, total) : 0;
}

const WORD_NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, twice: 2, thrice: 3 };
const en = (v) => (v && typeof v === 'object' ? (v.en || v.pt || '') : (v || ''));

function isAttack(a) {
  return (a.type === 'melee' || a.type === 'ranged') && !!a.damage;
}

/** Recarga ou usos limitados → quantos usos entram nas 3 rodadas (null = à vontade). */
function limitedUses(a) {
  if (a.recharge) return 1; // 5emm: recarga conta como 1 uso
  if (Number(a.uses) > 0) return Number(a.uses);
  if (/recharge|\d\s*\/\s*day/i.test(`${en(a.desc)} ${en(a.name)}`)) return 1;
  return null;
}

function isAreaEffect(a) {
  return !!(a.multitarget || a.save?.area || /cone|line|radius|sphere|cube|emanation|each creature|creatures in|within \d+ (ft|feet)|em \d+ ft/i.test(`${en(a.desc)} ${a.save?.targets || ''}`));
}

/** Separa ações comuns, bônus e lendárias (aceita o formato do catálogo e o snapshot de combate com `kind`). */
function splitActions(m) {
  const all = m.actions || [];
  const kinded = all.some(a => a && a.kind);
  const regular = kinded ? all.filter(a => !a.kind || a.kind === 'action') : all;
  const bonus = [...(m.bonusActions || []), ...(kinded ? all.filter(a => a.kind === 'bonus') : [])];
  const legendary = [
    ...(m.legendary?.actions || []),
    ...(Array.isArray(m.legendaryActions) ? m.legendaryActions : []),
    ...(kinded ? all.filter(a => a.kind === 'legendary') : []),
  ];
  const count = parseInt(m.legendary?.uses ?? m.legendaryActionCount ?? (legendary.length ? 3 : 0), 10) || 0;
  return { regular, bonus, legendary, legendaryCount: count };
}

/** Dano médio de uma ação (ataque ou efeito com salvaguarda), incluindo dano extra. */
export function actionDamage(a) {
  let dmg = averageDamage(a.damage) + averageDamage(a.extraDamage);
  if (!a.damage && Number(a.avgDamage) > 0) dmg = Number(a.avgDamage);
  const targets = Math.max(1, parseInt(a.targets, 10) || 1);
  dmg *= targets;
  if ((a.save || a.type === 'save') && !isAttack(a) && isAreaEffect(a)) dmg *= 2; // 5emm: multitarget = ×2
  return dmg;
}

function normName(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function singular(w) {
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && /(ch|sh|x|s)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/**
 * Lê o multiataque. Prioridade: campo estruturado `m.multiattack = [{ name|index, count }]`
 * ou `options: [[...], [...]]` (alternativas); senão o texto em inglês da ação "Multiattack".
 * Retorna a MELHOR sequência como [{ action, count }] ou null.
 */
export function parseMultiattack(monster) {
  const actions = splitActions(monster).regular;
  const attacks = actions.filter(isAttack);
  if (!attacks.length) return null;
  const findAttack = (ref) => {
    if (typeof ref === 'number') return actions[ref] && isAttack(actions[ref]) ? actions[ref] : null;
    const n = normName(ref);
    return attacks.find(a => normName(en(a.name)) === n || normName(a.name?.pt) === n) || null;
  };
  const score = (seq) => seq.reduce((s, x) => s + actionDamage(x.action) * x.count, 0);

  if (Array.isArray(monster.multiattack) && monster.multiattack.length) {
    const opts = Array.isArray(monster.multiattack[0]) ? monster.multiattack : [monster.multiattack];
    let best = null;
    for (const opt of opts) {
      const seq = opt.map(x => ({ action: findAttack(x.index ?? x.name), count: Math.max(1, parseInt(x.count, 10) || 1) }))
        .filter(x => x.action);
      if (seq.length && (!best || score(seq) > score(best))) best = seq;
    }
    if (best) return best;
  }

  const ma = actions.find(a => /multiattack|multiataque/i.test(en(a.name)) || /multiataque/i.test(a.name?.pt || ''));
  if (!ma) return null;
  // "May replace one with X" / "instead of" descrevem trocas, não ataques extras.
  const text = normName(en(ma.desc).split(/\b(?:may|can) replace\b|\binstead of\b|\bin place of\b/i)[0]);
  if (!text) return null;

  // Alternativas separadas por " or " no nível da frase ("Bite and Claws OR two Heavy Clubs").
  const variants = text.split(/\bor\b(?! (?:ranged|melee)\b)/).map(s => s.trim()).filter(Boolean);
  let best = null;
  for (const v of variants) {
    let seq = parseMultiattackText(v, attacks);
    // "makes two attacks, using Scimitar and Pistol in any combination": total manda
    const total = v.match(/\b(one|two|three|four|five|six|\d+)\s+attacks\b/);
    const n = total ? (WORD_NUM[total[1]] ?? parseInt(total[1], 10)) : 0;
    if (n > 0 && seq.reduce((sum, x) => sum + x.count, 0) > n) {
      const top = [...seq].sort((a, b) => actionDamage(b.action) - actionDamage(a.action))[0];
      seq = [{ action: top.action, count: n }];
    }
    if (seq.length && (!best || score(seq) > score(best))) best = seq;
  }
  if (best) return best;

  // "makes two attacks" genérico: N × melhor ataque
  const generic = text.match(/\b(one|two|three|four|five|six|\d+)\s+(?:\w+\s+){0,2}attacks?\b/);
  if (generic) {
    const n = WORD_NUM[generic[1]] ?? parseInt(generic[1], 10);
    const top = [...attacks].sort((a, b) => actionDamage(b) - actionDamage(a))[0];
    if (n > 0 && top) return [{ action: top, count: n }];
  }
  return null;
}

function parseMultiattackText(text, attacks) {
  const words = text.split(' ');
  const out = new Map();
  // Nomes dos ataques (en), do mais longo ao mais curto; aceita plural.
  const names = attacks.map(a => ({ a, toks: normName(en(a.name)).split(' ').map(singular) }))
    .sort((x, y) => y.toks.length - x.toks.length);
  const used = new Array(words.length).fill(false);
  for (let i = 0; i < words.length; i++) {
    if (used[i]) continue;
    for (const { a, toks } of names) {
      const slice = words.slice(i, i + toks.length).map(singular);
      if (toks.length && slice.join(' ') === toks.join(' ')) {
        // conta: número logo antes (até 3 palavras: "two with its claws", "one battleaxe")
        let count = 1;
        for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
          const w = words[k];
          if (WORD_NUM[w] != null) { count = WORD_NUM[w]; break; }
          if (/^\d+$/.test(w)) { count = parseInt(w, 10); break; }
          if (used[k] || w === 'and' || w === 'then' || w === 'plus') break;
        }
        // "attack with its bite twice"
        const after = words[i + toks.length];
        if (after === 'twice') count = 2;
        out.set(a, (out.get(a) || 0) + count);
        for (let k = i; k < i + toks.length; k++) used[k] = true;
        break;
      }
    }
  }
  return [...out.entries()].map(([action, count]) => ({ action, count }));
}

function collectLegendary(monster) {
  const { legendary: list, legendaryCount: count, regular: actions } = splitActions(monster);
  const items = list.map(la => {
    let ref = la;
    if (!la.damage && (la.actionName || la.action)) {
      const n = normName(en(la.actionName || la.action));
      ref = actions.find(a => normName(en(a.name)) === n) || la;
    } else if (!la.damage && !la.avgDamage) {
      // "Tail Attack: The dragon makes a tail attack." → usa o ataque citado
      const text = ` ${normName(`${en(la.name)} ${en(la.desc)}`)} `;
      ref = actions.filter(isAttack).find(a => text.includes(` ${normName(en(a.name))} `)) || la;
    }
    return {
      name: en(la.name) || en(ref.name),
      cost: Math.max(1, parseInt(la.cost, 10) || 1),
      damage: actionDamage(ref),
      toHit: isAttack(ref) ? (Number(ref.atk) || 0) : 0,
      save: ref.save?.dc ? Number(ref.save.dc) : 0,
      // 2024: "can't take this action again until the start of its next turn"
      oncePerRound: /can.?t take this action again/i.test(en(la.desc)),
    };
  });
  return { items, count };
}

/** Melhor combinação de ações lendárias por rodada (5emm legendaryCombo). */
function legendaryCombo(la, count) {
  const out = { totalDamage: 0, actions: [] };
  let current = [...la];
  while (count > 0 && current.length > 0) {
    let highestCost = 1;
    for (const a of current) highestCost = Math.max(highestCost, a.cost);
    const adjusted = current.map(a => ({ ...a, adjustedDamage: a.damage * Math.floor(highestCost / a.cost), addCount: Math.floor(highestCost / a.cost) }))
      .sort((x, y) => y.adjustedDamage - x.adjustedDamage);
    const pick = adjusted[0];
    const times = pick.oncePerRound ? 1 : pick.addCount;
    for (let i = 0; i < times; i++) {
      out.totalDamage += pick.damage;
      out.actions.push(pick);
      count -= pick.cost;
    }
    current = current.filter(a => a.cost <= count && !(a.oncePerRound && a.name === pick.name));
  }
  return out;
}

function towardZero(x) { return x < 0 ? Math.ceil(x) : Math.floor(x); }
function clampIdx(i) { return Math.max(0, Math.min(CR_TABLE.length - 1, i)); }

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function hasList(v) {
  return Array.isArray(v) ? v.filter(Boolean).length > 0 : !!(v && String(v).trim());
}

const DAMAGE_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];

/** Resistências/imunidades que pesam no ND: dano físico (B/P/S) ou 3+ tipos. */
function significantDefenses(v) {
  if (!hasList(v)) return false;
  const text = (Array.isArray(v) ? v.join(', ') : String(v)).toLowerCase();
  if (/bludgeoning|piercing|slashing|nonmagical|non-magical|damage from spells/.test(text)) return true;
  return DAMAGE_TYPES.filter(t => text.includes(t)).length >= 3;
}

/** CD / bônus de magia citados em traços de conjuração ("DC 14. +6 spell attack"). */
function spellcastingNumbers(m) {
  let dc = Number(m.spellSaveDc) || 0;
  let atk = Number(m.spellAttack) || 0;
  for (const t of [...(m.traits || []), ...(m.actions || [])]) {
    const text = `${en(t.name)} ${en(t.desc)}`;
    if (!/spellcasting|conjura|innate spell/i.test(en(t.name)) && !/spell save dc|spell attack/i.test(text)) continue;
    const d = text.match(/\bDC\s*(\d+)/i);
    if (d) dc = Math.max(dc, parseInt(d[1], 10));
    const a = text.match(/\+(\d+)\s*(?:spell attack|to hit)/i);
    if (a) atk = Math.max(atk, parseInt(a[1], 10));
  }
  return { dc, atk };
}

/**
 * Estima o ND de um monstro no nosso formato.
 * Retorna { cr, crNum, xp, offensive: {...}, defensive: {...} } com o detalhamento.
 */
export function estimateCr(monster) {
  const m = monster || {};
  const split = splitActions(m);
  const actions = split.regular;

  // ---- dados de ataque (equivalente ao attackInfo do 5emm) ----
  const attacks = []; // sempre disponíveis
  const limited = []; // recarga / usos por dia
  for (const a of actions) {
    const dmg = actionDamage(a);
    if (/multiattack|multiataque/i.test(en(a.name))) continue;
    const info = {
      name: en(a.name) || 'Action',
      damage: dmg,
      toHit: isAttack(a) ? (Number(a.atk) || 0) : 0,
      save: a.save?.dc ? Number(a.save.dc) : 0,
      kind: isAttack(a) ? 'attack' : 'action',
    };
    if (!isAttack(a) && dmg <= 0 && !info.save) continue;
    const uses = limitedUses(a);
    if (uses != null) limited.push({ ...info, uses, limited: true });
    else attacks.push(info);
  }
  // Ação bônus: soma a de maior dano à vontade em cada rodada (o DMG conta dano de ação bônus).
  const bonusBest = split.bonus.filter(a => limitedUses(a) == null)
    .reduce((best, a) => Math.max(best, actionDamage(a)), 0);
  const multi = parseMultiattack(m);
  if (multi) {
    attacks.push({
      name: 'Multiattack: ' + multi.map(x => `${x.count}× ${en(x.action.name)}`).join(', '),
      damage: multi.reduce((s, x) => s + actionDamage(x.action) * x.count, 0),
      toHit: 0, save: 0, kind: 'multiattack',
    });
  }
  const legendary = collectLegendary(m);

  // ---- sequência de 3 rodadas (5emm actionSequence) ----
  const pool = { attacks: [...attacks].sort((a, b) => b.damage - a.damage), limited: limited.map(x => ({ ...x })).sort((a, b) => b.damage - a.damage) };
  const legRound = legendaryCombo(legendary.items, legendary.count);
  const rounds = [];
  for (let i = 0; i < 3; i++) {
    const round = { totalDamage: 0, actions: [] };
    const cands = [...pool.attacks, ...pool.limited].sort((a, b) => b.damage - a.damage);
    const pick = cands[0];
    if (pick) {
      round.actions.push(pick.name);
      round.totalDamage += pick.damage;
      if (pick.limited) {
        pick.uses -= 1;
        if (pick.uses <= 0) pool.limited = pool.limited.filter(x => x !== pick);
      }
    }
    if (bonusBest > 0) { round.totalDamage += bonusBest; round.actions.push('bonus'); }
    round.totalDamage += legRound.totalDamage;
    round.actions.push(...legRound.actions.map(a => a.name));
    rounds.push(round);
  }
  const dpr = rounds.reduce((s, r) => s + r.totalDamage, 0) / 3;
  const damageCr = crByRange(dpr, 'dprMin');

  // ---- bônus de ataque / CD (maior valor) ----
  const allInfo = [...attacks, ...limited, ...legendary.items];
  const saveDcs = allInfo.map(x => x.save || 0);
  for (const a of actions) if (a.save?.dc) saveDcs.push(Number(a.save.dc) || 0);
  const spell = spellcastingNumbers(m);
  saveDcs.push(spell.dc);
  const maxDc = Math.max(0, ...saveDcs);
  const toHits = allInfo.map(x => x.toHit || 0);
  toHits.push(spell.atk);
  const maxAttack = Math.max(0, ...toHits);
  const dcCr = crByRange(maxDc, 'saveDc');
  const attackCr = crByRange(maxAttack, 'attack');
  const useDc = maxDc > 0 && (maxAttack <= 0 || dcCr.numeric >= attackCr.numeric);
  let stepDelta = 0;
  if (useDc) stepDelta = maxDc - damageCr.saveDc;
  else if (maxAttack > 0) stepDelta = maxAttack - damageCr.attack;
  const offensiveCr = CR_TABLE[clampIdx(damageCr.index + towardZero(stepDelta / 2))];

  // ---- defesa ----
  const hp = Math.max(0, Number(m.hp) || averageDamage(m.hitDice));
  const estNum = offensiveCr.numeric;
  const multipliers = [];
  let ehp = hp;
  // DMG 2014: o multiplicador só vale para defesas relevantes (várias, ou dano físico);
  // resistência e imunidade não se multiplicam entre si — vale a maior.
  const resist = significantDefenses(m.damageResistances);
  const immune = significantDefenses(m.damageImmunities);
  const resMult = resist ? (estNum <= 4 ? 2 : estNum <= 10 ? 1.5 : estNum <= 16 ? 1.25 : 1) : 1;
  const immMult = immune ? (estNum <= 10 ? 2 : estNum <= 16 ? 1.5 : 1.25) : 1;
  if (immMult >= resMult && immMult > 1) multipliers.push({ key: 'immunities', value: immMult });
  else if (resMult > 1) multipliers.push({ key: 'resistances', value: resMult });
  ehp *= Math.max(resMult, immMult);
  if (hasList(m.damageVulnerabilities)) {
    ehp *= 0.5; multipliers.push({ key: 'vulnerabilities', value: 0.5 });
  }

  const saves = m.saves || {};
  const abil = m.abilities || {};
  const saveCount = ABILITIES.filter(k => {
    if (saves[k] == null) return false;
    const base = Math.floor(((Number(abil[k]) || 10) - 10) / 2);
    return Number(saves[k]) > base; // proficiente (bônus acima do modificador puro)
  }).length;
  const saveAcBonus = saveCount < 3 ? 0 : saveCount < 5 ? 2 : 4;
  const traitNames = (m.traits || []).map(t => en(t.name).toLowerCase());
  const magicResistance = traitNames.some(n => n.includes('magic resistance'));
  const ac = Number(m.ac) || 10;
  const eac = Math.max(12, ac + saveAcBonus + (magicResistance ? 2 : 0));
  const hpCr = crByRange(ehp, 'hpMin');
  const defensiveCr = CR_TABLE[clampIdx(hpCr.index + towardZero((eac - hpCr.ac) / 2))];

  const avg = (offensiveCr.numeric + defensiveCr.numeric) / 2;
  const final = crByRange(avg, 'numeric');

  return {
    cr: final.cr,
    crNum: final.numeric,
    xp: final.xp,
    offensive: {
      cr: offensiveCr.cr, crNum: offensiveCr.numeric,
      dpr: Math.round(dpr * 10) / 10,
      damageCr: damageCr.cr,
      maxAttack, maxDc, useDc,
      attackCr: attackCr.cr, dcCr: dcCr.cr,
      stepDelta,
      rounds,
      multiattack: multi ? multi.map(x => ({ name: en(x.action.name), count: x.count })) : null,
      legendaryPerRound: legRound.totalDamage,
      bonusPerRound: bonusBest,
    },
    defensive: {
      cr: defensiveCr.cr, crNum: defensiveCr.numeric,
      hp, ehp: Math.round(ehp), hpCr: hpCr.cr,
      ac, eac, saveCount, saveAcBonus, magicResistance,
      multipliers,
    },
  };
}

export default estimateCr;
