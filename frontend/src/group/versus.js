// Monstro × grupo (Raio-X › Contra quem? e a linha "× grupo" do Escolher monstro): sem React —
// testado em tests/versus.test.js. Cruza o monstro (data/bestiary.js ou "meus
// monstros") com os fatos do grupo (party-metrics.sheetFacts):
//  - o dano principal de cada um × resistência / imunidade / vulnerabilidade (e quem tem o
//    dano a que ele é vulnerável);
//  - as salvaguardas que o monstro cobra ("X Saving Throw: DC N") × a chance de cada um;
//  - as condições a que ele é imune × o controle de quem mais controla;
//  - a dificuldade dele contra este grupo, com a conta do montador de combate (encounter.js).
// A linha "× grupo" só aparece quando há algo que o mestre precisa saber.
import { abilShort, chance, damageLabel, DAMAGE_TYPES, firstName, mainDamage, partyLevel, pct, t } from './party-metrics.js';
import { encounterDifficulty, DIFFICULTY_LABEL } from '../combat/encounter.js';
import { xpForCr } from '../combat/cr-estimate.js';

const ABILITY_EN = { Strength: 'str', Dexterity: 'dex', Constitution: 'con', Intelligence: 'int', Wisdom: 'wis', Charisma: 'cha' };
const CONTROL_CONDITIONS = ['charmed', 'frightened', 'paralyzed', 'prone', 'restrained', 'stunned', 'incapacitated', 'grappled'];
const CONDITION_LABELS = {
  charmed: ['enfeitiçado', 'charmed'], frightened: ['amedrontado', 'frightened'], paralyzed: ['paralisado', 'paralyzed'],
  prone: ['derrubado', 'prone'], restrained: ['contido', 'restrained'], stunned: ['atordoado', 'stunned'],
  incapacitated: ['incapacitado', 'incapacitated'], grappled: ['agarrado', 'grappled'],
};

/** Lista de tipos de dano de um campo do monstro (ids do bestiário ou texto importado). */
function typeSet(v) {
  const out = new Set();
  const add = (s) => { for (const k of DAMAGE_TYPES) if (new RegExp(`\\b${k}\\b`, 'i').test(String(s))) out.add(k); };
  for (const x of Array.isArray(v) ? v : v ? [v] : []) add(typeof x === 'string' ? x : JSON.stringify(x));
  return out;
}

const DEFENSE_KEYS = ['damageResistances', 'damageImmunities', 'damageVulnerabilities'];
/**
 * O app sabe as defesas do monstro? As do SRD 5.2.1 (data/monsters-srd521.js, com as
 * vulnerabilidades) e as de quem traz os campos ("meus monstros", importados): sim. As do
 * catálogo antigo, sem nenhum campo: não — aí "sem resistência conhecida", nunca "normal".
 */
export function defensesKnown(m) {
  return m?.source === 'SRD 5.2.1' || DEFENSE_KEYS.some(k => m && k in m);
}

/** Fator do dano do tipo `k` contra o monstro: 0 imune · 0,5 resiste · 2 vulnerável · 1. */
export function damageFactor(m, k) {
  if (typeSet(m?.damageImmunities).has(k)) return 0;
  if (typeSet(m?.damageResistances).has(k)) return 0.5;
  if (typeSet(m?.damageVulnerabilities).has(k)) return 2;
  return 1;
}

/** Salvaguardas que o monstro cobra nas ações e traços: [{ab, dc}], sem repetir. */
export function monsterSaves(m) {
  const out = [];
  const lists = ['traits', 'actions', 'bonusActions', 'reactions', 'legendaryActions'].map(k => m?.[k] || []);
  for (const list of lists) {
    for (const a of list) {
      const text = typeof a?.desc === 'string' ? a.desc : (a?.desc?.en || '');
      for (const x of text.matchAll(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+)/g)) {
        const s = { ab: ABILITY_EN[x[1]], dc: +x[2] };
        if (!out.some(o => o.ab === s.ab && o.dc === s.dc)) out.push(s);
      }
    }
  }
  return out;
}

const monsterName = (m, lang) => (typeof m?.name === 'string' ? m.name : (m?.name?.[lang === 'en' ? 'en' : 'pt'] || m?.name?.en || m?.id || '?'));

/**
 * O cartão "monstro × grupo": por personagem, o dano principal e o fator; as
 * salvaguardas com a chance de cada um; e a linha curta (vazia se nada importa).
 */
export function versus(m, facts, lang = 'pt', { lowChance = 40 } = {}) {
  const tx = (pt, en) => t(lang, pt, en);
  const known = defensesKnown(m);
  const rows = facts.map(f => {
    const opts = mainDamage(f);
    const main = opts[0] || null;
    const k = main ? damageFactor(m, main.type) : 1;
    // o melhor dele contra o monstro: outro tipo que rende mais (fugir da resistência ou
    // aproveitar a vulnerabilidade)
    const best = main ? opts.map(o => ({ ...o, eff: o.exp * damageFactor(m, o.type) })).sort((a, b) => b.eff - a.eff)[0] : null;
    const alt = best && best.type !== main.type && best.eff > 0 && best.eff > main.exp * k ? best : null;
    return { id: f.id, name: f.name, main, k, alt };
  });
  // vulnerável a quê, e quem do grupo causa esse dano (e com o quê)
  const vulns = DAMAGE_TYPES.filter(k => damageFactor(m, k) === 2).map(k => ({
    type: k,
    who: facts.filter(f => f.dmgTypes?.[k]).map(f => ({ id: f.id, name: f.name, via: f.dmgTypes[k].slice().sort((a, b) => b.exp - a.exp)[0]?.src || '' })),
  }));
  const saves = monsterSaves(m).map(s => ({
    ...s, chances: facts.map(f => ({ id: f.id, name: f.name, p: pct(chance(f.saves[s.ab] ?? 0, s.dc)) })).sort((a, b) => a.p - b.p),
  }));
  const imm = (m?.conditionImmunities || []).map(c => String(c).toLowerCase());
  const condImm = CONTROL_CONDITIONS.filter(c => imm.includes(c));
  const controller = facts.filter(f => f.control >= 1.5).sort((a, b) => b.control - a.control)[0] || null;
  const ctlBlocked = controller && condImm.length >= 3 ? controller : null;

  const parts = [];
  for (const v of vulns) {
    const label = damageLabel(v.type, lang);
    const names = v.who.map(w => `${firstName(w.name)}${w.via ? ` (${w.via})` : ''}`).join(', ');
    parts.push(v.who.length
      ? tx(`vulnerável a ${label}: ${names} ${v.who.length === 1 ? 'causa' : 'causam'} o dobro`, `vulnerable to ${v.type}: ${names} deal${v.who.length === 1 ? 's' : ''} double`)
      : tx(`vulnerável a ${label} (ninguém do grupo causa)`, `vulnerable to ${v.type} (nobody in the party deals it)`));
  }
  for (const r of rows) {
    if (!r.main || r.k >= 1) continue;
    const who = firstName(r.name);
    // "resiste a trovejante (o melhor dano de Elarion)": o tipo primeiro, quem perde depois
    parts.push(r.k === 0
      ? tx(`imune a ${damageLabel(r.main.type, lang)} (o melhor dano de ${who})`, `immune to ${r.main.type} (${who}'s best damage)`)
      : tx(`resiste a ${damageLabel(r.main.type, lang)} (o melhor dano de ${who})`, `resists ${r.main.type} (${who}'s best damage)`));
  }
  for (const s of saves) {
    const weak = s.chances.filter(c => c.p <= lowChance);
    if (!weak.length) continue;
    parts.push(tx(`cobra ${abilShort(s.ab, lang)} CD ${s.dc}: ${weak.map(c => `${firstName(c.name)} ${c.p}%`).join(', ')}`,
      `calls for ${abilShort(s.ab, lang)} DC ${s.dc}: ${weak.map(c => `${firstName(c.name)} ${c.p}%`).join(', ')}`));
  }
  if (ctlBlocked) {
    const names = condImm.slice(0, 3).map(c => CONDITION_LABELS[c]?.[lang === 'en' ? 1 : 0] || c).join(', ');
    parts.push(tx(`imune a ${names}: o controle de ${firstName(ctlBlocked.name)} perde força`, `immune to ${names}: ${firstName(ctlBlocked.name)}'s control loses its bite`));
  }
  return {
    name: monsterName(m, lang), cr: m?.cr ?? '', known, rows, vulns, saves, condImm,
    ctlBlocked: ctlBlocked ? { id: ctlBlocked.id, name: ctlBlocked.name } : null, parts, line: parts.join(' · '),
    difficulty: versusDifficulty(m, facts),
  };
}

/**
 * A dificuldade do monstro contra este grupo, com a mesma conta do montador de combate
 * (encounter.encounterDifficulty: orçamento de XP por personagem do SRD 5.2.1, os níveis de
 * quem entra): o que 1 dá e quantos deles chegam a Moderada e a Alta (no máximo 12).
 * → {xp, one: 'low'|…, levels, steps: [{rating, n}]} | null (sem ND ou sem grupo)
 */
export function versusDifficulty(m, facts) {
  const cr = crOf(m);
  const xp = cr == null ? 0 : xpForCr(cr);
  const levels = (facts || []).map(f => f.level || 1);
  if (!xp || !levels.length) return null;
  const one = encounterDifficulty(xp, levels).rating;
  const steps = [];
  for (const rating of ['moderate', 'high']) {
    if (one === rating || (rating === 'moderate' && ['high', 'extreme'].includes(one))) continue;
    for (let n = 2; n <= 12; n++) {
      const r = encounterDifficulty(xp * n, levels).rating;
      if (r === rating) { steps.push({ rating, n }); break; }
      if (r === 'extreme' || (rating === 'moderate' && r === 'high')) break;
    }
  }
  return { xp, one, levels, steps };
}

/** "1 Sombra: Baixa · 3: Moderada · 4: Alta" (pt) / "1 Shadow: Low · 3: Moderate · 4: High". */
export function difficultyText(d, name, lang = 'pt') {
  if (!d) return '';
  const label = (r) => DIFFICULTY_LABEL[r]?.[lang === 'en' ? 'en' : 'pt'] || r;
  return [`1 ${name}: ${label(d.one)}`, ...d.steps.map(s => `${s.n}: ${label(s.rating)}`)].join(' · ');
}

const crOf = (m) => {
  if (Number.isFinite(m?.crNum)) return m.crNum;
  const s = String(m?.cr ?? '').trim();
  if (/^\d+\/\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return a / b; }
  return s && Number.isFinite(+s) ? +s : null;   // sem ND não é ND 0
};

/**
 * Ameaças para o quadro do Raio-X: monstros de ND perto do nível do grupo (±2) que
 * resistem (ou são imunes) ao dano principal de alguém. Os que pegam mais gente vêm antes.
 */
export function threatMonsters(monsters, facts, lang = 'pt', { limit = 3 } = {}) {
  if (!facts.length) return [];
  const L = partyLevel(facts);
  const mains = facts.map(f => ({ f, main: mainDamage(f)[0] })).filter(x => x.main);
  const out = [];
  for (const m of monsters || []) {
    const cr = crOf(m);
    if (cr == null || cr < L - 2 || cr > L + 2) continue;
    const hit = mains.filter(x => damageFactor(m, x.main.type) < 1).sort((a, b) => b.main.exp - a.main.exp);
    // dano que o grupo perde contra ele (quem bate mais forte pesa mais)
    const lost = hit.reduce((n, x) => n + x.main.exp * (1 - damageFactor(m, x.main.type)), 0);
    if (hit.length) out.push({ m, hit, lost, d: Math.abs(cr - L) });
  }
  out.sort((a, b) => b.hit.length - a.hit.length || b.lost - a.lost || a.d - b.d || monsterName(a.m, lang).localeCompare(monsterName(b.m, lang)));
  return out.slice(0, limit).map(({ m, hit }) => {
    const x = hit[0];
    const k = damageFactor(m, x.main.type);
    const type = damageLabel(x.main.type, lang);
    const who = firstName(x.f.name);
    return {
      id: m.id, name: monsterName(m, lang), cr: m.cr, ids: hit.map(h => h.f.id),
      text: k === 0
        ? t(lang, `${monsterName(m, lang)} é imune a ${type}: o dano de ${who} não pega`, `${monsterName(m, lang)} is immune to ${x.main.type}: ${who}'s damage does nothing`)
        : t(lang, `${monsterName(m, lang)} resiste a ${type}: o dano de ${who} cai pela metade`, `${monsterName(m, lang)} resists ${x.main.type}: ${who}'s damage is halved`),
    };
  });
}

/**
 * A ameaça típica do nível do grupo para cada salvaguarda (as Ameaças do quadro): um monstro do
 * bestiário (não "meus monstros") de ND entre L − 2 e L + 2 — o alcance de threatMonsters —
 * que cobra a salvaguarda, o de ND mais perto do nível; empate: a CD maior, depois o nome.
 * `typicalDc`: a CD mediana dos monstros desse alcance (para quando não há exemplo).
 * → {examples: {dex: {id, name, cr, dc}, …}, typicalDc}
 */
export function saveThreatExamples(monsters, facts, lang = 'pt') {
  const examples = {};
  const dcs = [];
  if (!facts?.length) return { examples, typicalDc: 13 };
  const L = partyLevel(facts);
  for (const m of monsters || []) {
    if (m?.custom) continue;
    const cr = crOf(m);
    if (cr == null || cr < L - 2 || cr > L + 2) continue;
    const d = Math.abs(cr - L);
    const name = monsterName(m, lang);
    for (const s of monsterSaves(m)) {
      dcs.push(s.dc);
      const cur = examples[s.ab];
      if (!cur || d < cur.d || (d === cur.d && (s.dc > cur.dc || (s.dc === cur.dc && name.localeCompare(cur.name) < 0)))) {
        examples[s.ab] = { id: m.id, name, cr: m.cr, dc: s.dc, d };
      }
    }
  }
  dcs.sort((a, b) => a - b);
  const typicalDc = dcs.length ? dcs[Math.floor(dcs.length / 2)] : 13;
  return { examples: Object.fromEntries(Object.entries(examples).map(([k, { d, ...v }]) => [k, v])), typicalDc };
}

/** Procura no bestiário (nome pt ou en, sem acento). */
export function searchMonsters(monsters, query, limit = 8) {
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = fold(query).trim();
  if (!q) return [];
  return (monsters || []).filter(m => fold(monsterName(m, 'pt')).includes(q) || fold(monsterName(m, 'en')).includes(q)).slice(0, limit);
}

// Palavras que não dizem qual é o monstro ("Goblin Guerreiro" → goblin)
const NAME_STOP = new Set(['guerreiro', 'chefe', 'jovem', 'adulto', 'anciao', 'filhote', 'gigante', 'lacaio', 'capitao', 'enxame',
  'warrior', 'young', 'adult', 'ancient', 'giant', 'swarm', 'minion', 'captain', 'wyrmling']);

/**
 * Monstros citados no texto do plano da sessão: primeiro os de nome inteiro ("esqueleto"),
 * depois os que têm uma palavra do nome ("3 goblins afogados" → Goblin Lacaio, Chefe Goblin…).
 */
export function planMonsters(monsters, text, limit = 12) {
  const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const body = fold(text);
  if (!body.trim()) return [];
  const esc = (n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // posição da 1ª menção (-1 = não citado)
  const at = (n) => { if (n.length < 3) return -1; const x = new RegExp(`(^|[^a-z])${esc(n)}(s|es)?([^a-z]|$)`).exec(body); return x ? x.index : -1; };
  const words = (n) => fold(n).split(/[^a-z]+/).filter(w => w.length >= 5 && !NAME_STOP.has(w));
  const full = [], partial = [];
  for (const m of monsters || []) {
    const pt = monsterName(m, 'pt'), en = monsterName(m, 'en');
    const f = Math.max(at(fold(pt)), at(fold(en)));
    if (f >= 0) { full.push({ m, i: f }); continue; }
    const hits = [...words(pt), ...words(en)].map(w => ({ w, i: at(w) })).filter(x => x.i >= 0).sort((a, b) => a.i - b.i);
    if (hits.length) partial.push({ m, i: hits[0].i, w: hits[0].w });
  }
  // na ordem do texto; no máximo 4 por palavra ("dragão" acharia 40 dragões)
  const per = {};
  const some = partial.sort((a, b) => a.i - b.i).filter(x => (per[x.w] = (per[x.w] || 0) + 1) <= 4);
  return [...full.sort((a, b) => a.i - b.i), ...some].map(x => x.m).slice(0, limit);
}
