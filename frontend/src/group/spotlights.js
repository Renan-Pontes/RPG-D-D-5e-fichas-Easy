// Raio-X do grupo: lacunas (G7), os 4 quadros (G0), as 3 ideias de cena e as
// sugestões de "brilhar" — sem React, testado em tests/party-gaps.test.js.
// Regras fixas no navegador (§6.3.6 e §6.3.7); nada aqui é gravado: o que o mestre
// aceita vai para partyInsights pelo PUT (os momentos completos entram na V2).
import {
  ABILS, abilShort, AXES, axisLabel, chance, DAMAGE_TYPES, damageLabel, firstName, fmt, mainDamage,
  partyLevel, pct, bRef, SKILLS, skillLabel, t,
} from './party-metrics.js';

export const SOCIAL_SKILLS = ['persuasion', 'deception', 'intimidation', 'performance', 'insight'];
export const EXPLORE_SKILLS = ['perception', 'survival', 'stealth', 'investigation', 'nature', 'athletics'];
const PHYSICAL = ['bludgeoning', 'piercing', 'slashing'];

// Gravidade (ordem da lista): ponto único > perícia > salvaguarda > eixo baixo > dano > sentido.
const SEVERITY = { spof: 0, skill: 1, save: 2, axis: 3, damage: 4, sense: 5, tool: 5 };
export const GAP_GROUPS = [
  { id: 'skill', kinds: ['skill'], label: ['Perícias', 'Skills'] },
  { id: 'damage', kinds: ['damage'], label: ['Dano', 'Damage'] },
  { id: 'save', kinds: ['save'], label: ['Salvaguardas', 'Saving throws'] },
  { id: 'role', kinds: ['spof', 'axis'], label: ['Papel', 'Role'] },
  { id: 'sense', kinds: ['sense', 'tool'], label: ['Sentidos e ferramentas', 'Senses and tools'] },
];

// "se Elarion cair, ninguém controla" / ideia "o grupo precisa de outro jeito de controlar"
const AXIS_NOBODY = {
  dmg: ['ninguém causa dano de verdade', 'nobody deals real damage'], mit: ['ninguém aguenta pancada', 'nobody can take a hit'],
  magic: ['ninguém tem magia de sobra', 'nobody has magic to spare'], heal: ['ninguém cura', 'nobody heals'],
  ranged: ['ninguém ataca de longe', 'nobody attacks from range'], melee: ['ninguém segura a linha de frente', 'nobody holds the front line'],
  control: ['ninguém controla', 'nobody controls the fight'], utility: ['ninguém resolve os problemas', 'nobody solves problems'],
  mobility: ['ninguém se move rápido', 'nobody moves fast'], social: ['ninguém fala pelo grupo', 'nobody speaks for the party'],
  explore: ['ninguém guia a exploração', 'nobody leads exploration'],
};
const AXIS_VERB = {
  dmg: ['causar dano', 'deal damage'], mit: ['aguentar a pancada', 'take the hits'], magic: ['resolver com magia', 'solve it with magic'],
  heal: ['se curar', 'heal'], ranged: ['atacar de longe', 'attack from range'], melee: ['segurar a linha de frente', 'hold the front line'],
  control: ['controlar a luta', 'control the fight'], utility: ['resolver o problema', 'solve the problem'], mobility: ['se mover', 'move around'],
  social: ['conversar', 'talk their way through'], explore: ['explorar', 'explore'],
};
const SAVE_DANGER = {
  str: ['empurrões e agarrões', 'shoves and grapples'], dex: ['bola de fogo e armadilhas', 'fireballs and traps'],
  con: ['veneno e doença', 'poison and disease'], int: ['ilusões e ataques à mente', 'illusions and mind attacks'],
  wis: ['medo e enfeitiçar', 'fear and charm'], cha: ['banir e possuir', 'banishment and possession'],
};
const L2 = (pair, lang) => pair[lang === 'en' ? 1 : 0];
const signed = (v, lang) => `${v >= 0 ? '+' : '−'}${fmt(Math.abs(v), lang)}`;
const joinAnd = (list, lang) => (list.length <= 1 ? list.join('')
  : `${list.slice(0, -1).join(', ')} ${t(lang, 'e', 'and')} ${list[list.length - 1]}`);
const joinOr = (list, lang) => (list.length <= 1 ? list.join('')
  : `${list.slice(0, -1).join(', ')} ${t(lang, 'ou', 'or')} ${list[list.length - 1]}`);

/** Eixo a que a lacuna pertence (para a importância do Ajustar). */
export function gapAxis(g) {
  if (g.kind === 'spof' || g.kind === 'axis') return g.key;
  if (g.kind === 'damage') return 'dmg';
  if (g.kind === 'save') return 'mit';
  if (g.kind === 'sense' || g.kind === 'tool') return 'explore';
  if (g.kind === 'skill') return SOCIAL_SKILLS.includes(g.key) ? 'social' : EXPLORE_SKILLS.includes(g.key) ? 'explore' : null;
  return null;
}

/**
 * Lacunas do grupo (§6.3.6), já em ordem: primeiro as dos eixos marcados Importante,
 * depois por gravidade. Eixos escondidos não geram lacuna. Cada tipo de dano que
 * ninguém causa é uma lacuna (a lista mostra todos juntos numa linha só).
 */
export function partyGaps(facts, party, { lang = 'pt', dc = 15, focus = {}, hidden = [] } = {}) {
  if (!facts.length) return [];
  const L = partyLevel(facts);
  const ref = bRef(L);
  const out = [];
  for (const k of SKILLS) {
    const best = Math.max(...facts.map(f => f.skills[k]));
    if (best <= ref - 2) {
      out.push({ kind: 'skill', key: k, value: best, text: t(lang,
        `Ninguém é bom em ${skillLabel(k, lang)} (melhor ${signed(best, lang)}; CD ${dc} passa ${pct(chance(best, dc))}%)`,
        `Nobody is good at ${skillLabel(k, lang)} (best ${signed(best, lang)}; DC ${dc} passes ${pct(chance(best, dc))}%)`) });
    }
  }
  for (const k of DAMAGE_TYPES) {
    if (!facts.some(f => f.dmgTypes[k])) out.push({ kind: 'damage', key: k, text: t(lang, `Nenhum dano ${damageLabel(k, lang)}`, `No ${k} damage`) });
  }
  for (const a of ABILS) {
    const vals = facts.map(f => f.saves[a]);
    const avg = vals.reduce((x, y) => x + y, 0) / vals.length;
    const low = facts.filter(f => f.saves[a] <= 0).map(f => firstName(f.name));
    if (avg < 1 || low.length * 2 >= vals.length) {
      out.push({ kind: 'save', key: a, value: avg, text: t(lang,
        `${abilShort(a, lang)} fraca (média ${signed(avg, lang)}; ${low.length ? `${joinAnd(low, lang)} em +0 ou menos` : 'ninguém em +0 ou menos'})`,
        `Weak ${abilShort(a, lang)} (average ${signed(avg, lang)}; ${low.length ? `${joinAnd(low, lang)} at +0 or less` : 'nobody at +0 or less'})`) });
    }
  }
  for (const k of AXES) {
    if (hidden.includes(k)) continue;
    const a = party.axes[k];
    if (!a) continue;
    if (a.best >= 4 && a.second <= 2.5 && facts.length > 1) {
      const who = joinAnd(a.bestWho.map(firstName), lang);
      out.push({ kind: 'spof', key: k, who: a.bestIds, text: t(lang,
        `Só ${who} segura ${axisLabel(k, lang)} (${fmt(a.best, lang)}; o 2º tem ${fmt(a.second, lang)}): se ${who} cair, ${L2(AXIS_NOBODY[k], lang)}`,
        `Only ${who} covers ${axisLabel(k, lang)} (${fmt(a.best, lang)}; 2nd has ${fmt(a.second, lang)}): if ${who} goes down, ${L2(AXIS_NOBODY[k], lang)}`) });
    }
    if (a.best < 3) {
      out.push({ kind: 'axis', key: k, value: a.best, text: t(lang,
        `${axisLabel(k, lang)} baixa no grupo inteiro (melhor ${fmt(a.best, lang)})`,
        `Low ${axisLabel(k, lang)} across the party (best ${fmt(a.best, lang)})`) });
    }
  }
  if (!facts.some(f => f.darkvision > 0)) out.push({ kind: 'sense', key: 'darkvision', text: t(lang, 'Ninguém enxerga no escuro', 'Nobody sees in the dark') });
  if (!facts.some(f => f.thieves)) out.push({ kind: 'tool', key: 'thievesTools', text: t(lang, 'Ninguém tem Ferramentas de Ladrão', "Nobody has Thieves' Tools") });
  return out
    .map((g, i) => ({ ...g, axis: gapAxis(g), important: focus[gapAxis(g)] === 2, i }))
    .sort((a, b) => (b.important - a.important) || (SEVERITY[a.kind] - SEVERITY[b.kind]) || (a.i - b.i))
    .map(({ i, ...g }) => g);
}

/** A lista para ler: os tipos de dano juntos numa linha ("Nenhum dano ácido, elétrico… ou psíquico"). */
export function readableGaps(gaps, lang = 'pt') {
  const out = [];
  const dmg = gaps.filter(g => g.kind === 'damage');
  for (const g of gaps) {
    if (g.kind !== 'damage') { out.push(g); continue; }
    if (g !== dmg[0]) continue;
    out.push({ ...g, keys: dmg.map(d => d.key), count: dmg.length, text: dmg.length === 1 ? g.text
      : t(lang, `Nenhum dano ${joinOr(dmg.map(d => damageLabel(d.key, lang)), lang)}`, `No ${joinOr(dmg.map(d => d.key), lang)} damage`) });
  }
  return out;
}

/** Lacunas por grupo (Perícias · Dano · Salvaguardas · Papel · Sentidos e ferramentas). */
export function gapGroups(gaps, lang = 'pt') {
  const list = readableGaps(gaps, lang);
  return GAP_GROUPS.map(g => ({ id: g.id, label: L2(g.label, lang), items: list.filter(x => g.kinds.includes(x.kind)) })).filter(g => g.items.length);
}

/**
 * Sugestões de "brilhar" (★) e o gancho da história (✎) por personagem — a semente
 * dos Momentos (V2). `auto` é a chave estável da sugestão (dispensar grava só ela).
 */
export function shineSuggestions(facts, { lang = 'pt', dc = 15 } = {}) {
  const res = {};
  for (const f of facts) {
    const others = facts.filter(o => o !== f);
    const items = [];
    const me = firstName(f.name);
    const lead = SKILLS.map(k => ({ k, b: f.skills[k], second: others.length ? Math.max(...others.map(o => o.skills[k])) : -5 }))
      .filter(x => x.b - x.second >= 2).sort((a, b) => (b.b - b.second) - (a.b - a.second) || b.b - a.b).slice(0, 2);
    for (const x of lead) {
      items.push({ kind: 'shine', auto: `skill:${x.k}`, text: t(lang,
        `${skillLabel(x.k, lang)} ${pct(chance(x.b, dc))}% (2º ${pct(chance(x.second, dc))}%)`,
        `${skillLabel(x.k, lang)} ${pct(chance(x.b, dc))}% (2nd ${pct(chance(x.second, dc))}%)`) });
    }
    if (f.healDay > 0 && !others.some(o => o.healDay > 0)) {
      items.push({ kind: 'shine', auto: 'role:heal', text: t(lang, `único que cura (${f.healWhy.slice(0, 2).join(', ')})`, `the only healer (${f.healWhy.slice(0, 2).join(', ')})`) });
    }
    const solo = Object.keys(f.dmgTypes).filter(k => !PHYSICAL.includes(k) && !others.some(o => o.dmgTypes[k]));
    if (solo.length) {
      items.push({ kind: 'shine', auto: `dmg:${solo.join(',')}`, text: t(lang,
        `único com dano ${joinAnd(solo.map(k => damageLabel(k, lang)), lang)}`, `the only one with ${joinAnd(solo, lang)} damage`) });
    }
    if (f.control > 0 && !others.some(o => o.control >= f.control)) {
      items.push({ kind: 'shine', auto: 'role:control', text: t(lang, `maior controle (${f.ctlWhy.slice(0, 3).join(', ')})`, `most control (${f.ctlWhy.slice(0, 3).join(', ')})`) });
    }
    if (f.thieves && !others.some(o => o.thieves)) {
      items.push({ kind: 'shine', auto: 'tool:thievesTools', text: t(lang, 'único com Ferramentas de Ladrão', "the only one with Thieves' Tools") });
    }
    if (f.darkvision > 0 && others.length && others.every(o => !o.darkvision)) {
      items.push({ kind: 'shine', auto: 'sense:darkvision', text: t(lang, `único que enxerga no escuro (${f.darkvision} pés)`, `the only one with darkvision (${f.darkvision} ft)`) });
    }
    if (!items.length) {
      // nada único: a melhor perícia dele (mesmo empatada) — dê a cena a ele
      const k = SKILLS.slice().sort((a, b) => f.skills[b] - f.skills[a])[0];
      const tie = others.filter(o => o.skills[k] >= f.skills[k]).map(o => firstName(o.name));
      items.push({ kind: 'shine', auto: `skill:${k}`, text: t(lang,
        `${skillLabel(k, lang)} ${pct(chance(f.skills[k], dc))}%${tie.length ? ` (divide com ${joinAnd(tie, lang)}: dê a cena a ${me})` : ''}`,
        `${skillLabel(k, lang)} ${pct(chance(f.skills[k], dc))}%${tie.length ? ` (shared with ${joinAnd(tie, lang)}: give ${me} the scene)` : ''}`) });
    }
    for (const k of ['bonds', 'ideals', 'flaws', 'personality']) {
      const v = String(f.story?.[k] || '').trim();
      if (v) { items.push({ kind: 'hook', auto: `text:${k}`, text: `“${v.length > 110 ? `${v.slice(0, 110)}…` : v}”` }); break; }
    }
    res[f.id] = items;
  }
  return res;
}

/**
 * Os 4 quadros (G0) em frases curtas, cada um com a lista inteira (a tela mostra 2 e
 * "+N"): Forças, Fraquezas, Oportunidades e Ameaças (§6.3.7).
 */
export function quadrants({ facts, party, skills, gaps, lang = 'pt', focus = {}, hidden = [], suggestions = {}, dismissed = {}, threats = [] }) {
  const strengths = AXES.filter(k => !hidden.includes(k) && party.axes[k]?.best >= 4)
    .sort((a, b) => ((focus[b] === 2) - (focus[a] === 2)) || (party.axes[b].best - party.axes[a].best) || (party.axes[a].bestWho.length - party.axes[b].bestWho.length))
    .slice(0, 2)
    .map(k => ({ key: `axis:${k}`, text: `${axisLabel(k, lang)} ${fmt(party.axes[k].best, lang)} · ${joinAnd(party.axes[k].bestWho.map(firstName), lang)}` }));
  const topSkill = skills.slice().sort((a, b) => b.chanceGroup - a.chanceGroup || b.best - a.best)[0];
  if (topSkill) strengths.push({ key: `skill:${topSkill.skill}`, text: t(lang, `${skillLabel(topSkill.skill, lang)}: grupo ${topSkill.chanceGroup}%`, `${skillLabel(topSkill.skill, lang)}: party ${topSkill.chanceGroup}%`) });

  const weaknesses = readableGaps(gaps, lang).map(g => ({ key: `${g.kind}:${g.key}`, text: g.text }));

  // uma sugestão de cada personagem por vez (o holofote se espalha)
  const lists = facts.map(f => (suggestions[f.id] || []).filter(s => s.kind !== 'push' && !(dismissed[String(f.id)] || []).includes(s.auto))
    .map(s => ({ key: `${f.id}:${s.auto}`, id: f.id, text: `${firstName(f.name)}: ${s.text}` })));
  const opportunities = [];
  for (let i = 0; lists.some(l => l[i]); i++) for (const l of lists) if (l[i]) opportunities.push(l[i]);

  const L = partyLevel(facts);
  const saveThreats = ABILS.map(a => {
    const fail = facts.reduce((n, f) => n + (1 - chance(f.saves[a], 13)), 0) / Math.max(1, facts.length);
    const avg = facts.reduce((n, f) => n + f.saves[a], 0) / Math.max(1, facts.length);
    return { a, fail, avg };
  }).filter(x => gaps.some(g => g.kind === 'save' && g.key === x.a)).sort((a, b) => b.fail - a.fail)
    .map(x => ({ key: `save:${x.a}`, text: t(lang,
      `${abilShort(x.a, lang)} média ${signed(x.avg, lang)}: ${L2(SAVE_DANGER[x.a], lang)} pegam ${pct(x.fail)}% do grupo na CD 13`,
      `${abilShort(x.a, lang)} average ${signed(x.avg, lang)}: ${L2(SAVE_DANGER[x.a], lang)} catch ${pct(x.fail)}% of the party at DC 13`) }));
  const monsterThreats = threats.map(m => ({ key: `monster:${m.id}`, text: m.text }));
  const threatList = [];
  for (let i = 0; saveThreats[i] || monsterThreats[i]; i++) {
    if (saveThreats[i]) threatList.push(saveThreats[i]);
    if (monsterThreats[i]) threatList.push(monsterThreats[i]);
  }
  return { strengths, weaknesses, opportunities, threats: threatList, level: L };
}

/** Tipo de dano em que o grupo mais se apoia (soma do dano principal de cada um). */
export function partyMainDamage(facts) {
  const sum = {};
  for (const f of facts) { const m = mainDamage(f)[0]; if (m) sum[m.type] = (sum[m.type] || 0) + m.exp; }
  return Object.entries(sum).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

/** 3 ideias de cena (modelos por tipo de lacuna, sem IA), de tipos diferentes. */
export function sceneIdeas(gaps, facts, lang = 'pt', limit = 3) {
  const out = [];
  const used = new Set();
  const nameOf = (id) => firstName(facts.find(f => f.id === id)?.name || '');
  for (const g of readableGaps(gaps, lang)) {
    if (out.length >= limit) break;
    if (used.has(g.kind)) continue;
    let text = null;
    if (g.kind === 'skill') text = t(lang, `Uma cena em que só ${skillLabel(g.key, lang)} resolve (ninguém é bom nisso)`, `A scene only ${skillLabel(g.key, lang)} can solve (nobody is good at it)`);
    else if (g.kind === 'spof') {
      const who = joinAnd((g.who || []).map(nameOf), lang);
      text = t(lang, `Uma luta que ocupa ${who}: o grupo precisa de outro jeito de ${L2(AXIS_VERB[g.key], lang)}`,
        `A fight where ${who} is busy: the party needs another way to ${L2(AXIS_VERB[g.key], lang)}`);
    } else if (g.kind === 'save') text = t(lang, `Um perigo de salvaguarda de ${abilShort(g.key, lang)} com saída`, `A ${abilShort(g.key, lang)} saving throw danger with a way out`);
    else if (g.kind === 'damage') {
      const main = partyMainDamage(facts);
      if (main) text = t(lang, `Um inimigo que resiste a ${damageLabel(main, lang)}: o grupo precisa de outro plano`, `An enemy that resists ${main}: the party needs another plan`);
    } else if (g.kind === 'axis') text = t(lang, `Uma cena que pede ${axisLabel(g.key, lang)}: o grupo inteiro tem pouca`, `A scene that calls for ${axisLabel(g.key, lang)}: the whole party is short on it`);
    else if (g.kind === 'sense') text = t(lang, 'Uma cena no escuro: ninguém enxerga sem luz', 'A scene in the dark: nobody sees without light');
    else if (g.kind === 'tool') text = t(lang, 'Uma fechadura ou armadilha sem Ferramentas de Ladrão: o grupo precisa de outro jeito', "A lock or trap without Thieves' Tools: the party needs another way");
    if (!text) continue;
    used.add(g.kind);
    out.push({ key: `${g.kind}:${g.key}`, text, gap: g.text });
  }
  return out;
}

/** Texto da cena nova no plano ("＋ Levar para o plano"): a ideia e, embaixo, a lacuna. */
export function ideaSceneText(idea, lang = 'pt') {
  return `${idea.text}\n${t(lang, 'Lacuna do grupo', 'Party gap')}: ${idea.gap}`.slice(0, 1000);
}
