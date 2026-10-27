// Monstro × grupo (Raio-X › Contra quem? e, depois, o Escolher monstro): sem React —
// testado em tests/versus.test.js. Cruza o monstro (data/bestiary.js ou "meus
// monstros") com os fatos do grupo (party-metrics.sheetFacts):
//  - o dano principal de cada um × resistência / imunidade / vulnerabilidade;
//  - as salvaguardas que o monstro cobra ("X Saving Throw: DC N") × a chance de cada um;
//  - as condições a que ele é imune × o controle de quem mais controla.
// A linha "× grupo" só aparece quando há algo que o mestre precisa saber.
import { abilShort, chance, damageLabel, DAMAGE_TYPES, firstName, mainDamage, partyLevel, pct, t } from './party-metrics.js';

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
  const rows = facts.map(f => {
    const opts = mainDamage(f);
    const main = opts[0] || null;
    const k = main ? damageFactor(m, main.type) : 1;
    const alt = main && k < 1 ? opts.map(o => ({ ...o, eff: o.exp * damageFactor(m, o.type) })).sort((a, b) => b.eff - a.eff)[0] : null;
    return { id: f.id, name: f.name, main, k, alt: alt && alt.type !== main.type && alt.eff > 0 ? alt : null };
  });
  const saves = monsterSaves(m).map(s => ({
    ...s, chances: facts.map(f => ({ id: f.id, name: f.name, p: pct(chance(f.saves[s.ab] ?? 0, s.dc)) })).sort((a, b) => a.p - b.p),
  }));
  const imm = (m?.conditionImmunities || []).map(c => String(c).toLowerCase());
  const condImm = CONTROL_CONDITIONS.filter(c => imm.includes(c));
  const controller = facts.filter(f => f.control >= 1.5).sort((a, b) => b.control - a.control)[0] || null;
  const ctlBlocked = controller && condImm.length >= 3 ? controller : null;

  const parts = [];
  for (const r of rows) {
    if (!r.main || r.k >= 1) continue;
    const who = firstName(r.name);
    parts.push(r.k === 0
      ? tx(`imune ao melhor dano de ${who} (${damageLabel(r.main.type, lang)})`, `immune to ${who}'s best damage (${r.main.type})`)
      : tx(`resiste ao melhor dano de ${who} (${damageLabel(r.main.type, lang)})`, `resists ${who}'s best damage (${r.main.type})`));
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
  return { name: monsterName(m, lang), cr: m?.cr ?? '', rows, saves, condImm, ctlBlocked: ctlBlocked ? { id: ctlBlocked.id, name: ctlBlocked.name } : null, parts, line: parts.join(' · ') };
}

const crOf = (m) => {
  if (Number.isFinite(m?.crNum)) return m.crNum;
  const s = String(m?.cr ?? '');
  if (/^\d+\/\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return a / b; }
  return Number.isFinite(+s) ? +s : null;
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

/** Procura no bestiário (nome pt ou en, sem acento). */
export function searchMonsters(monsters, query, limit = 8) {
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = fold(query).trim();
  if (!q) return [];
  return (monsters || []).filter(m => fold(monsterName(m, 'pt')).includes(q) || fold(monsterName(m, 'en')).includes(q)).slice(0, limit);
}

/** Monstros citados no texto "Monstros" do plano da sessão (nome pt ou en). */
export function planMonsters(monsters, text) {
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const body = fold(text);
  if (!body.trim()) return [];
  const hit = (n) => n.length >= 3 && new RegExp(`(^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?([^a-z]|$)`).test(body);
  return (monsters || []).filter(m => hit(fold(monsterName(m, 'pt'))) || hit(fold(monsterName(m, 'en'))));
}
