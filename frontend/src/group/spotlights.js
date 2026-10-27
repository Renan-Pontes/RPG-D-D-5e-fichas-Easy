// Raio-X do grupo: lacunas (G7), os 4 quadros (G0), as 3 ideias de cena, os Momentos
// (G8: sugerir, aceitar, escrever, dispensar, aconteceu), o estilo do jogador e o
// Equilíbrio na mesa (G9) — sem React, testado em tests/party-gaps.test.js e
// tests/spotlights.test.js. Regras fixas no navegador (§6.3.6, §6.3.7, §6.5 e §6.6);
// nada aqui é gravado: o que o mestre aceita vai para partyInsights pelo PUT.
import {
  ABILS, abilShort, AXES, axisLabel, axisScores, chance, DAMAGE_TYPES, damageLabel, firstName, fmt, fmtMod, mainDamage,
  partyAxes, partyLevel, pct, bRef, SKILLS, skillLabel, t,
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

// ---------------------------------------------------------------- momentos (G8) e estilo
// Os 3 tipos de momento (ícone E palavra) e as 6 marcas do estilo do jogador (§6.5).
export const MOMENT_KINDS = ['shine', 'push', 'hook'];
const KIND_INFO = {
  shine: { icon: '★', label: ['Brilha', 'Shines'] },
  push: { icon: '↗', label: ['Desafia', 'Challenges'] },
  hook: { icon: '✎', label: ['Gancho', 'Hook'] },
};
export const kindIcon = (k) => KIND_INFO[k]?.icon || '★';
export const kindLabel = (k, lang) => L2(KIND_INFO[k]?.label || KIND_INFO.shine.label, lang);
export const STYLES = [
  { id: 'talk', icon: '🗣', label: ['gosta de conversar', 'likes to talk'] },
  { id: 'quiet', icon: '🤐', label: ['fala pouco', 'quiet'] },
  { id: 'combat', icon: '⚔', label: ['gosta de luta', 'likes combat'] },
  { id: 'puzzle', icon: '🧩', label: ['gosta de enigma', 'likes puzzles'] },
  { id: 'explore', icon: '🧭', label: ['gosta de explorar', 'likes exploring'] },
  { id: 'story', icon: '📖', label: ['gosta de história', 'likes story'] },
];
export const styleLabel = (id, lang) => { const s = STYLES.find(x => x.id === id); return s ? `${s.icon} ${L2(s.label, lang)}` : id; };
// Os mesmos limites do servidor (world_rules.py: MAX_SPOTLIGHTS, MAX_SPOTLIGHT_TEXT, MAX_DISMISSED).
export const MAX_MOMENTS = 12;
export const MAX_MOMENT_TEXT = 160;
export const MAX_DISMISSED = 40;
// Falar em público: o que o "fala pouco" nunca recebe como desafio e não ganha como 1º ★.
export const PUBLIC_SKILLS = ['persuasion', 'deception', 'intimidation', 'performance'];
const PUSH_SKILLS = ['perception', 'insight', 'athletics', 'persuasion', 'stealth'];
const PUSH_SAVES = ['dex', 'con', 'wis'];
const INT_SKILLS = ['arcana', 'history', 'investigation', 'nature', 'religion'];

// As perícias de cada estilo (Investigação e Natureza são de INT e de explorar: valem nos dois).
const TOPIC_SKILLS = { puzzle: INT_SKILLS, explore: EXPLORE_SKILLS, talk: SOCIAL_SKILLS };

/** De que assunto é uma sugestão (o estilo do jogador puxa as do assunto dele para cima). */
function topicOf(auto) {
  const [kind, key = ''] = String(auto).split(':');
  if (kind === 'skill') {
    if (SOCIAL_SKILLS.includes(key)) return 'talk';
    if (INT_SKILLS.includes(key) && !EXPLORE_SKILLS.includes(key)) return 'puzzle';
    if (EXPLORE_SKILLS.includes(key)) return 'explore';
    return null;
  }
  if (kind === 'tool' || kind === 'sense') return 'explore';
  if (kind === 'dmg' || auto === 'role:control' || auto === 'axis:melee' || auto === 'axis:dmg' || auto === 'axis:mit') return 'combat';
  return null;
}

/** A sugestão é do assunto do estilo? Perícia: pela lista do estilo (Investigação é enigma E explorar). */
function inTopic(auto, topic) {
  const [kind, key = ''] = String(auto).split(':');
  if (kind === 'skill' && TOPIC_SKILLS[topic]) return TOPIC_SKILLS[topic].includes(key);
  return topicOf(auto) === topic;
}

/**
 * Sugestões de momento por personagem (calculadas aqui, NÃO gravadas): ★ Brilha, ↗ Desafia
 * e ✎ Gancho (§6.6), já com o estilo do jogador (§6.5). `auto` é a chave estável da
 * sugestão (Aceitar grava junto; Dispensar grava só ela). `style` = partyInsights.style;
 * `axisOpts` = {w, base} do Ajustar (o "papel mais forte" usa as mesmas notas do G1).
 */
export function momentSuggestions(facts, { lang = 'pt', dc = 15, style = {}, axisOpts = {} } = {}) {
  const res = {};
  const party = facts.length > 1 ? partyAxes(facts, axisOpts).axes : null;
  for (const f of facts) {
    const st = style?.[String(f.id)] || [];
    const quiet = st.includes('quiet');
    const others = facts.filter(o => o !== f);
    const me = firstName(f.name);
    const second = (k) => (others.length ? Math.max(...others.map(o => o.skills[k])) : -5);
    const skillShine = (k, extra = '') => ({ kind: 'shine', auto: `skill:${k}`, text: t(lang,
      `${skillLabel(k, lang)} ${pct(chance(f.skills[k], dc))}%${extra && ` · ${extra}`}`,
      `${skillLabel(k, lang)} ${pct(chance(f.skills[k], dc))}%${extra && ` · ${extra}`}`) });
    let shines = [];
    const lead = SKILLS.map(k => ({ k, b: f.skills[k], second: second(k) }))
      .filter(x => x.b - x.second >= 2).sort((a, b) => (b.b - b.second) - (a.b - a.second) || b.b - a.b).slice(0, 2);
    for (const x of lead) {
      shines.push({ kind: 'shine', auto: `skill:${x.k}`, text: t(lang,
        `${skillLabel(x.k, lang)} ${pct(chance(x.b, dc))}% (2º ${pct(chance(x.second, dc))}%)`,
        `${skillLabel(x.k, lang)} ${pct(chance(x.b, dc))}% (2nd ${pct(chance(x.second, dc))}%)`) });
    }
    if (f.healDay > 0 && !others.some(o => o.healDay > 0)) {
      shines.push({ kind: 'shine', auto: 'role:heal', text: t(lang, `único que cura (${f.healWhy.slice(0, 2).join(', ')})`, `the only healer (${f.healWhy.slice(0, 2).join(', ')})`) });
    }
    const solo = Object.keys(f.dmgTypes).filter(k => !PHYSICAL.includes(k) && !others.some(o => o.dmgTypes[k]));
    if (solo.length) {
      // a chave cabe nos 60 caracteres do servidor (world_rules._clean_spotlights)
      shines.push({ kind: 'shine', auto: `dmg:${solo.join(',')}`.slice(0, 60), text: t(lang,
        `único com dano ${joinAnd(solo.map(k => damageLabel(k, lang)), lang)}`, `the only one with ${joinAnd(solo, lang)} damage`) });
    }
    if (f.control > 0 && !others.some(o => o.control >= f.control)) {
      shines.push({ kind: 'shine', auto: 'role:control', text: t(lang, `maior controle (${f.ctlWhy.slice(0, 3).join(', ')})`, `most control (${f.ctlWhy.slice(0, 3).join(', ')})`) });
    }
    if (f.thieves && !others.some(o => o.thieves)) {
      shines.push({ kind: 'shine', auto: 'tool:thievesTools', text: t(lang, 'único com Ferramentas de Ladrão', "the only one with Thieves' Tools") });
    }
    if (f.darkvision > 0 && others.length && others.every(o => !o.darkvision)) {
      shines.push({ kind: 'shine', auto: 'sense:darkvision', text: t(lang, `único que enxerga no escuro (${f.darkvision} pés)`, `the only one with darkvision (${f.darkvision} ft)`) });
    }
    const bestOf = (keys) => keys.slice().sort((a, b) => f.skills[b] - f.skills[a] || SKILLS.indexOf(a) - SKILLS.indexOf(b))[0];
    const scores = axisScores(f, axisOpts);
    if (!shines.length) {
      // nada único: a melhor perícia dele (mesmo empatada) — dê a cena a ele — e o eixo mais forte
      const k = bestOf(quiet ? SKILLS.filter(x => !PUBLIC_SKILLS.includes(x)) : SKILLS);
      const tie = others.filter(o => o.skills[k] >= f.skills[k]).map(o => firstName(o.name));
      shines.push({ kind: 'shine', auto: `skill:${k}`, text: t(lang,
        `${skillLabel(k, lang)} ${pct(chance(f.skills[k], dc))}%${tie.length ? ` (divide com ${joinAnd(tie, lang)}: dê a cena a ${me})` : ''}`,
        `${skillLabel(k, lang)} ${pct(chance(f.skills[k], dc))}%${tie.length ? ` (shared with ${joinAnd(tie, lang)}: give ${me} the scene)` : ''}`) });
      const ax = AXES.slice().sort((a, b) => scores[b].final - scores[a].final)[0];
      shines.push({ kind: 'shine', auto: `axis:${ax}`, text: t(lang, `papel mais forte: ${axisLabel(ax, lang)} ${fmt(scores[ax].final, lang)}`, `strongest role: ${axisLabel(ax, lang)} ${fmt(scores[ax].final, lang)}`) });
    }
    // o estilo puxa as sugestões do assunto dele: enigma → INT, explorar, conversar
    // (a perícia nova nunca repete a chave de uma sugestão que já está na lista)
    for (const topic of ['puzzle', 'explore', 'talk']) {
      if (!st.includes(topic) || (topic === 'talk' && quiet)) continue;
      if (shines.some(x => inTopic(x.auto, topic))) continue;
      const k = bestOf(TOPIC_SKILLS[topic].filter(x => !shines.some(s => s.auto === `skill:${x}`)));
      if (k) shines.push(skillShine(k, styleLabel(topic, lang)));
    }
    if (st.includes('combat') && party) {
      // linha de frente ou o maior dano do grupo, quando é dele
      for (const ax of ['melee', 'dmg']) {
        if (shines.some(x => topicOf(x.auto) === 'combat')) break;
        if (party[ax]?.bestIds.includes(f.id)) {
          shines.push({ kind: 'shine', auto: `axis:${ax}`, text: ax === 'melee'
            ? t(lang, `linha de frente (${axisLabel(ax, lang)} ${fmt(scores[ax].final, lang)})`, `front line (${axisLabel(ax, lang)} ${fmt(scores[ax].final, lang)})`)
            : t(lang, `maior dano do grupo (${fmt(scores[ax].final, lang)})`, `the party's top damage (${fmt(scores[ax].final, lang)})`) });
        }
      }
    }
    if (quiet) {
      // fala pouco: o 1º ★ é de uma perícia que ele já domina e que não pede falar em público
      if (!shines.some(x => x.auto.startsWith('skill:') && !PUBLIC_SKILLS.includes(x.auto.slice(6)))) {
        shines.unshift(skillShine(bestOf(SKILLS.filter(x => !PUBLIC_SKILLS.includes(x)))));
      }
      const isPublic = (x) => x.auto.startsWith('skill:') && PUBLIC_SKILLS.includes(x.auto.slice(6));
      const firstSkill = shines.findIndex(x => x.auto.startsWith('skill:') && !isPublic(x));
      shines = [shines[firstSkill], ...shines.filter((x, i) => i !== firstSkill && !isPublic(x)), ...shines.filter(isPublic)];
    }
    const wanted = st.filter(x => ['combat', 'puzzle', 'explore', 'talk'].includes(x) && !(x === 'talk' && quiet));
    if (wanted.length) {
      const rank = (x) => { const i = wanted.findIndex(w => inTopic(x.auto, w)); return i < 0 ? wanted.length : i; };
      const head = quiet ? shines.slice(0, 1) : [];
      shines = [...head, ...shines.slice(head.length).map((x, i) => ({ x, i })).sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i).map(o => o.x)];
    }

    // ↗ Desafia: a pior salvaguarda entre DES, CON e SAB e a pior perícia "de todo mundo"
    const pushes = [];
    const sv = PUSH_SAVES.slice().sort((a, b) => f.saves[a] - f.saves[b])[0];
    pushes.push({ kind: 'push', auto: `push:save:${sv}`, text: t(lang,
      `salvaguarda de ${abilShort(sv, lang)} ${fmtMod(f.saves[sv])} · CD 13 passa ${pct(chance(f.saves[sv], 13))}%`,
      `${abilShort(sv, lang)} save ${fmtMod(f.saves[sv])} · DC 13 passes ${pct(chance(f.saves[sv], 13))}%`) });
    const sk = PUSH_SKILLS.filter(k => !(quiet && PUBLIC_SKILLS.includes(k))).sort((a, b) => f.skills[a] - f.skills[b])[0];
    pushes.push({ kind: 'push', auto: `push:skill:${sk}`, text: t(lang,
      `${skillLabel(sk, lang)} ${fmtMod(f.skills[sk])} · tentar sem o especialista do grupo`,
      `${skillLabel(sk, lang)} ${fmtMod(f.skills[sk])} · try it without the party's expert`) });

    // ✎ Gancho: o 1º texto que o jogador escreveu na ficha
    const hooks = [];
    for (const k of ['bonds', 'ideals', 'flaws', 'personality']) {
      const v = String(f.story?.[k] || '').trim();
      if (v) { hooks.push({ kind: 'hook', auto: `text:${k}`, text: `“${v.length > 110 ? `${v.slice(0, 110)}…` : v}”` }); break; }
    }
    res[f.id] = st.includes('story') ? [...hooks, ...shines, ...pushes] : [...shines, ...pushes, ...hooks];
  }
  return res;
}

/** Só os ★ e ✎ (o quadro Oportunidades não usa os desafios). */
export function shineSuggestions(facts, opts = {}) {
  const all = momentSuggestions(facts, opts);
  return Object.fromEntries(Object.entries(all).map(([id, list]) => [id, list.filter(s => s.kind !== 'push')]));
}

/** Sugestões que ainda valem: nem aceitas (mesma chave) nem dispensadas. */
export function openSuggestions(suggestions = [], moments = [], dismissed = []) {
  const used = new Set((moments || []).map(m => m.auto).filter(Boolean));
  return (suggestions || []).filter(s => !used.has(s.auto) && !(dismissed || []).includes(s.auto));
}

/** Na lista do cartão, primeiro um de cada tipo (★, ↗, ✎), depois o resto, na ordem. */
export function spreadKinds(list) {
  const seen = new Set();
  const head = [];
  const rest = [];
  for (const s of list || []) {
    if (seen.has(s.kind)) rest.push(s);
    else { seen.add(s.kind); head.push(s); }
  }
  return [...head, ...rest];
}

/** Texto do momento no limite do servidor (160): `cut` avisa que o resto foi cortado. */
export function clipMomentText(text) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  return { text: [...clean].slice(0, MAX_MOMENT_TEXT).join(''), cut: [...clean].length > MAX_MOMENT_TEXT };
}

function nextMomentId(list) {
  const n = Math.max(0, ...(list || []).map(m => +(/^m(\d+)$/.exec(m.id || '') || [])[1] || 0));
  return `m${n + 1}`;
}

/** Aceitar uma sugestão: vira momento gravado (com a chave dela). */
export function acceptMoment(list, sug) {
  const cur = list || [];
  if (cur.length >= MAX_MOMENTS) return cur;
  return [...cur, { id: nextMomentId(cur), kind: sug.kind, text: clipMomentText(sug.text).text, auto: sug.auto || null, done: null, plan: null }];
}

/** "Escrever o meu": momento sem chave de sugestão. */
export function writeMoment(list, kind, text) {
  const cur = list || [];
  const c = clipMomentText(text);
  if (!c.text || cur.length >= MAX_MOMENTS) return { list: cur, cut: c.cut };
  return { list: [...cur, { id: nextMomentId(cur), kind: MOMENT_KINDS.includes(kind) ? kind : 'shine', text: c.text, auto: null, done: null, plan: null }], cut: c.cut };
}

export const updateMoment = (list, id, patch) => (list || []).map(m => (m.id === id ? { ...m, ...patch } : m));
export const removeMoment = (list, id) => (list || []).filter(m => m.id !== id);

/** "Aconteceu": grava o nº da sessão (tocar de novo desmarca). */
export const toggleDone = (list, id, session) => updateMoment(list, id, {
  done: (list || []).find(m => m.id === id)?.done != null ? null : (Number.isInteger(session) ? session : 0),
});

/** Dispensar grava só a chave; passa do limite → esquece as mais antigas. */
export function dismissKey(list, auto) {
  const cur = (list || []).filter(k => k !== auto);
  return [...cur, auto].slice(-MAX_DISMISSED);
}

/**
 * Nº da sessão atual, a mesma regra do servidor (diary.current_session: os dígitos de
 * state.session); sem número, a maior chave de diarySessions; sem nada, null.
 */
export function currentSession(state) {
  const raw = state?.session;
  if (Number.isInteger(raw)) return raw >= 0 ? raw : null;
  const m = /\d+/.exec(String(raw ?? ''));
  if (m) return +m[0];
  const keys = Object.keys(state?.diarySessions || {}).filter(k => /^\d+$/.test(k)).map(Number);
  return keys.length ? Math.max(...keys) : null;
}

/** Filtro da lista: Desta sessão (os que faltam + os de hoje) · Todos · Aconteceram. */
export function filterMoments(list, filter, session) {
  const cur = list || [];
  if (filter === 'done') return cur.filter(m => m.done != null);
  if (filter === 'all') return cur;
  return cur.filter(m => m.done == null || m.done === session);
}

/**
 * Texto da cena nova que o "→ Cena" põe no plano. A 1ª linha é o nome da cena e é a que
 * "Usar como cena" leva à Tela e ao jogador (plan-model.sceneFieldText): fica neutra. O
 * momento (★/↗, o nome, %, CD) vai da 2ª linha em diante, que só o mestre vê (§6.8).
 */
export function momentSceneText(moment, name, lang = 'pt') {
  return `${t(lang, 'Cena nova', 'New scene')}\n${kindIcon(moment.kind)} ${firstName(name)} · ${kindLabel(moment.kind, lang)}: ${moment.text}`.slice(0, 1000);
}

/**
 * Equilíbrio na mesa (G9): por personagem, momentos que aconteceram nas últimas 5
 * sessões, testes pedidos nas últimas 3 (do histórico do servidor) e há quantas sessões
 * seguidas ele está sem momento. O alerta sai com 3 sessões, ou com 2 para quem "fala pouco".
 * Sem o histórico, as sessões vêm do próprio estado (a atual e as do diário).
 */
export function tableBalance({ facts, spotlights = {}, style = {}, history = null, state = null }) {
  let sessions = (history?.sessions || []).map(s => s.number);
  if (!history) {
    const cur = currentSession(state);
    const keys = Object.keys(state?.diarySessions || {}).filter(k => /^\d+$/.test(k)).map(Number);
    sessions = [...new Set([...(cur != null ? [cur] : []), ...keys])].sort((a, b) => b - a);
  }
  const last5 = sessions.slice(0, 5);
  const last3 = new Set(sessions.slice(0, 3));
  const rows = facts.map(f => {
    const id = String(f.id);
    const done = (spotlights[id] || []).filter(m => m.done != null).map(m => m.done);
    const moments = done.filter(n => last5.includes(n)).length;
    const checks = { asked: 0, answered: 0, passed: 0 };
    for (const s of history?.sessions || []) {
      if (!last3.has(s.number)) continue;
      const c = s.checks?.[id];
      if (c) for (const k of Object.keys(checks)) checks[k] += c[k] || 0;
    }
    let drought = 0;
    for (const n of last5) { if (done.includes(n)) break; drought += 1; }
    const quiet = (style[id] || []).includes('quiet');
    return { id: f.id, name: f.name, color: f.color, moments, checks, drought, quiet, warn: drought >= (quiet ? 2 : 3) };
  });
  return {
    sessions: last5, rows,
    maxMoments: Math.max(1, ...rows.map(r => r.moments)), maxAsked: Math.max(1, ...rows.map(r => r.checks.asked)),
  };
}

/**
 * Os 4 quadros (G0) em frases curtas, cada um com a lista inteira (a tela mostra 2 e
 * "+N"): Forças, Fraquezas, Oportunidades e Ameaças (§6.3.7).
 */
export function quadrants({ facts, party, skills, gaps, lang = 'pt', focus = {}, hidden = [], suggestions = {}, dismissed = {}, spotlights = {}, threats = [] }) {
  const strengths = AXES.filter(k => !hidden.includes(k) && party.axes[k]?.best >= 4)
    .sort((a, b) => ((focus[b] === 2) - (focus[a] === 2)) || (party.axes[b].best - party.axes[a].best) || (party.axes[a].bestWho.length - party.axes[b].bestWho.length))
    .slice(0, 2)
    .map(k => ({ key: `axis:${k}`, text: `${axisLabel(k, lang)} ${fmt(party.axes[k].best, lang)} · ${joinAnd(party.axes[k].bestWho.map(firstName), lang)}` }));
  const topSkill = skills.slice().sort((a, b) => b.chanceGroup - a.chanceGroup || b.best - a.best)[0];
  if (topSkill) strengths.push({ key: `skill:${topSkill.skill}`, text: t(lang, `${skillLabel(topSkill.skill, lang)}: grupo ${topSkill.chanceGroup}%`, `${skillLabel(topSkill.skill, lang)}: party ${topSkill.chanceGroup}%`) });

  const weaknesses = readableGaps(gaps, lang).map(g => ({ key: `${g.kind}:${g.key}`, text: g.text }));

  // uma de cada personagem por vez (o holofote se espalha): primeiro os momentos aceitos que
  // ainda não aconteceram, depois as sugestões que ainda valem (nem aceitas nem dispensadas)
  const lists = facts.map(f => {
    const mine = spotlights[String(f.id)] || [];
    const kept = mine.filter(m => m.kind !== 'push' && m.done == null)
      .map(m => ({ key: `${f.id}:${m.id}`, id: f.id, text: `${firstName(f.name)}: ${m.text}` }));
    const open = openSuggestions(suggestions[f.id], mine, dismissed[String(f.id)]).filter(s => s.kind !== 'push')
      .map(s => ({ key: `${f.id}:${s.auto}`, id: f.id, text: `${firstName(f.name)}: ${s.text}` }));
    return [...kept, ...open];
  });
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

/**
 * A linha do grupo na Próxima sessão (passo 1): "brilha em Prestidigitação e Furtividade ·
 * fraco em salvaguarda de SAB (+0)" — as perícias em que é o melhor por ≥ 2 (senão a
 * melhor dele) e a pior salvaguarda entre DES, CON e SAB.
 */
export function partyLine(f, facts, lang = 'pt') {
  const others = facts.filter(o => o.id !== f.id);
  const second = (k) => (others.length ? Math.max(...others.map(o => o.skills[k])) : -5);
  let lead = SKILLS.filter(k => f.skills[k] - second(k) >= 2).sort((a, b) => (f.skills[b] - second(b)) - (f.skills[a] - second(a)) || f.skills[b] - f.skills[a]).slice(0, 2);
  if (!lead.length) lead = [SKILLS.slice().sort((a, b) => f.skills[b] - f.skills[a])[0]];
  const sv = PUSH_SAVES.slice().sort((a, b) => f.saves[a] - f.saves[b])[0];
  return t(lang,
    `brilha em ${joinAnd(lead.map(k => skillLabel(k, lang)), lang)} · fraco em salvaguarda de ${abilShort(sv, lang)} (${fmtMod(f.saves[sv])})`,
    `shines at ${joinAnd(lead.map(k => skillLabel(k, lang)), lang)} · weak at ${abilShort(sv, lang)} saves (${fmtMod(f.saves[sv])})`);
}
