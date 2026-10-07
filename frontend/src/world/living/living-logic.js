// Mundo vivo — lógica pura (sem React, sem DOM) da imersão do Mundo do mestre:
//   · carta celeste (skyLayout): cada cartão é uma estrela, ligações viram traços;
//   · páginas em branco (blankPages): perguntas do cronista sobre lacunas do mundo;
//   · o quanto a mesa conhece (knownPhrase): uma frase, nunca um número;
//   · ecos da mesa (normalizeEchoes / echoLines / entryWhispers): reações dos
//     jogadores contadas como narrador;
//   · rumor do dia (rumorOfDay).
// Nada aqui decide nada pelo mestre: só sugere.
import { makeRng, personName, factionName } from '../generators.js';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

/** Hash FNV-1a de 32 bits → inteiro sem sinal (determinístico). */
export function hashStr(s) {
  let h = 0x811c9dc5;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
const unit = (s) => hashStr(s) / 4294967296;

/** Imersão ligada? (Ajustes › Mundo vivo; padrão: ligada.) */
export function immersionOn(campaign) {
  if (!campaign) return true;
  if (campaign.immersion === false) return false;
  if (campaign.dmSettings && campaign.dmSettings.immersion === false) return false;
  return true;
}

// ------------------------------------------------------------ português
const ART = /^(o|a|os|as)\s+/i;
// Substantivos comuns no começo de nomes de lugar/grupo: dão o gênero quando o
// nome não traz artigo ("Taverna do Javali" → "na Taverna do Javali").
const FEM = new Set(['taverna', 'estalagem', 'torre', 'vila', 'cidade', 'floresta', 'montanha', 'serra', 'ilha', 'ponte', 'mina',
  'caverna', 'gruta', 'fortaleza', 'capela', 'igreja', 'catedral', 'praça', 'rua', 'estrada', 'baía', 'costa', 'aldeia', 'abadia',
  'biblioteca', 'academia', 'guilda', 'ordem', 'irmandade', 'liga', 'companhia', 'casa', 'corte', 'cripta', 'colina', 'planície',
  'pousada', 'hospedaria', 'muralha', 'ruína', 'ruínas', 'lagoa', 'enseada', 'clareira', 'fazenda', 'feira', 'taberna']);
const MASC = new Set(['vale', 'castelo', 'porto', 'bosque', 'templo', 'mosteiro', 'forte', 'lago', 'rio', 'mar', 'pântano', 'deserto',
  'monte', 'pico', 'reino', 'império', 'ducado', 'condado', 'farol', 'moinho', 'mercado', 'santuário', 'covil', 'círculo', 'conselho',
  'culto', 'clã', 'bando', 'colégio', 'palácio', 'salão', 'bairro', 'cemitério', 'acampamento', 'posto', 'desfiladeiro', 'abismo']);
const CONTRACT = {
  em: { o: 'no', a: 'na', os: 'nos', as: 'nas' },
  de: { o: 'do', a: 'da', os: 'dos', as: 'das' },
  a: { o: 'ao', a: 'à', os: 'aos', as: 'às' },
};
function contract(prep, name) {
  const str = String(name || '');
  const m = ART.exec(str);
  if (m) return `${CONTRACT[prep][m[1].toLowerCase()]} ${str.slice(m[0].length)}`;
  const first = str.split(/\s+/)[0].toLowerCase();
  if (FEM.has(first)) return `${CONTRACT[prep].a} ${str}`;
  if (MASC.has(first)) return `${CONTRACT[prep].o} ${str}`;
  return `${prep} ${str}`;
}
/** "em" + nome: "em O Vale" → "no Vale"; "Taverna do Javali" → "na Taverna do Javali"; nome próprio fica "em". */
export const emPt = (name) => contract('em', name);
/** "de" + nome: "de O Círculo" → "do Círculo". */
export const dePt = (name) => contract('de', name);
/** "a" + nome: "a A Torre" → "à Torre", "a O Vale" → "ao Vale". */
export const aPt = (name) => contract('a', name);
/** Nome com a inicial do artigo em minúscula no meio da frase ("O Vale" → "o Vale"). */
export function midName(name) {
  const m = ART.exec(name || '');
  return m ? m[1].toLowerCase() + name.slice(m[1].length) : name;
}

const PT_NUM = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
const EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** Número por extenso até dez (narrador não fala "3"), dígitos depois. */
export function numWord(n, lang = 'pt', fem = false) {
  if (lang !== 'en' && fem && (n === 1 || n === 2)) return n === 1 ? 'uma' : 'duas';
  const arr = lang === 'en' ? EN_NUM : PT_NUM;
  return n >= 0 && n <= 10 ? arr[n] : String(n);
}

// ------------------------------------------------------------ reações
export const REACTIONS = [
  { id: 'shiver', icon: '😱', pt: 'Arrepio', en: 'Chills' },
  { id: 'love', icon: '❤️', pt: 'Afeto', en: 'Fondness' },
  { id: 'doubt', icon: '🤔', pt: 'Desconfiança', en: 'Distrust' },
  { id: 'fight', icon: '⚔️', pt: 'Quero enfrentar', en: 'Want to face it' },
];
export const STAR = { id: 'star', icon: '⭐', pt: 'Quero voltar aqui', en: 'Want to return' };
const ALIASES = {
  shiver: ['shiver', 'chills', 'chill', 'fear', 'scared', 'scary', 'shock', 'arrepio', '😱'],
  love: ['love', 'heart', 'affection', 'fondness', 'like', 'afeto', '❤️', '❤'],
  doubt: ['doubt', 'suspicion', 'suspect', 'distrust', 'think', 'thinking', 'desconfianca', 'desconfiança', '🤔'],
  fight: ['fight', 'confront', 'challenge', 'battle', 'swords', 'enfrentar', '⚔️', '⚔'],
  star: ['star', 'favorite', 'favourite', 'fav', 'return', 'bookmark', 'favorito', '⭐'],
};
const ALIAS_MAP = Object.fromEntries(Object.entries(ALIASES).flatMap(([k, list]) => list.map(a => [a, k])));
/** Tipo de reação canônico ('shiver'|'love'|'doubt'|'fight'|'star') ou null. */
export function reactionKey(raw) {
  if (raw == null) return null;
  return ALIAS_MAP[String(raw).trim().toLowerCase()] || ALIAS_MAP[String(raw).trim()] || null;
}

const emptyCounts = () => ({ shiver: 0, love: 0, doubt: 0, fight: 0, star: 0 });
const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);

/** Contagens de {kind: n} | [{kind, count}] | [kind] → {shiver, love, doubt, fight, star}. */
export function normalizeCounts(raw) {
  const out = emptyCounts();
  if (!raw) return out;
  if (Array.isArray(raw)) {
    for (const r of raw) {
      if (typeof r === 'string') { const k = reactionKey(r); if (k) out[k] += 1; continue; }
      const k = reactionKey(r?.kind ?? r?.type ?? r?.reaction);
      if (k) out[k] += r?.count != null ? num(r.count) : 1;
    }
    return out;
  }
  if (typeof raw === 'object') {
    for (const [key, v] of Object.entries(raw)) {
      const k = reactionKey(key);
      if (k) out[k] += Array.isArray(v) ? v.length : num(v);
    }
  }
  return out;
}

const personOf = (r) => {
  if (!r) return '';
  if (typeof r === 'string') return r;
  return r.characterName || r.character?.name || r.name || r.memberName || r.displayName
    || r.member?.characterName || r.member?.name || r.user?.displayName || r.user?.name || '';
};

/**
 * Normaliza a resposta de GET /campaigns/:id/world/echoes (mestre) em
 * { [entryId]: { counts, views, reactors: {kind: [nomes]}, readers: [{name, count, lastAt}] } }.
 * Aceita tanto o formato por cartão ({entries: [...]}) quanto listas soltas
 * ({reactions: [...], views: [...]}). Resposta ausente → {}.
 */
export function normalizeEchoes(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  const slot = (id) => {
    const key = Number(id);
    if (!Number.isFinite(key)) return null;
    if (!out[key]) out[key] = { counts: emptyCounts(), views: 0, reactors: {}, readers: [] };
    return out[key];
  };
  const addReactor = (s, k, name) => {
    if (!name) return;
    const list = s.reactors[k] || (s.reactors[k] = []);
    if (!list.includes(name)) list.push(name);
  };
  const addReader = (s, r) => {
    const name = personOf(r);
    const count = num(r?.count ?? r?.views ?? r?.viewCount ?? 1);
    const lastAt = r?.lastAt || r?.last_at || null;
    if (!name) { s.views += count; return; }
    const cur = s.readers.find(x => x.name === name);
    if (cur) { cur.count += count; if (lastAt && (!cur.lastAt || lastAt > cur.lastAt)) cur.lastAt = lastAt; }
    else s.readers.push({ name, count, lastAt });
  };

  const entries = Array.isArray(raw.entries) ? raw.entries : Array.isArray(raw.echoes) ? raw.echoes : null;
  if (entries) {
    for (const e of entries) {
      const s = slot(e?.entryId ?? e?.entry_id ?? e?.id);
      if (!s) continue;
      const rc = e.reactionCounts || e.counts || (e.reactions && !Array.isArray(e.reactions) ? e.reactions : null);
      if (rc) {
        const c = normalizeCounts(rc);
        for (const k of Object.keys(c)) s.counts[k] += c[k];
        // {shiver: ['Thalion', 'Mira']} também traz os nomes
        if (!Array.isArray(rc)) for (const [key, v] of Object.entries(rc)) {
          const k = reactionKey(key); if (k && Array.isArray(v)) v.forEach(n => addReactor(s, k, personOf(n)));
        }
      }
      if (Array.isArray(e.reactions)) {
        for (const r of e.reactions) {
          const k = reactionKey(r?.kind ?? r?.type);
          if (!k) continue;
          if (!rc) s.counts[k] += 1;
          addReactor(s, k, personOf(r));
        }
      }
      if (e.reactors && typeof e.reactors === 'object') {
        for (const [key, v] of Object.entries(e.reactors)) {
          const k = reactionKey(key); if (k && Array.isArray(v)) v.forEach(n => addReactor(s, k, personOf(n)));
        }
      }
      const fav = e.favoriteCount ?? e.favorites ?? e.stars ?? e.starCount;
      if (fav != null && !(rc && normalizeCounts(rc).star)) s.counts.star += Array.isArray(fav) ? fav.length : num(fav);
      if (Array.isArray(e.favorites)) e.favorites.forEach(n => addReactor(s, 'star', personOf(n)));
      // formato do servidor: people: [{name, kinds, views, lastAt}]
      if (Array.isArray(e.people)) {
        for (const p of e.people) {
          const who = personOf(p);
          for (const kk of p?.kinds || []) {
            const k = reactionKey(kk);
            if (!k) continue;
            addReactor(s, k, who);
            // sem contagens agregadas no eco: conta pelas pessoas
            if (!rc && (k !== 'star' || fav == null)) s.counts[k] += 1;
          }
          if (num(p?.views) > 0) addReader(s, { name: who, count: p.views, lastAt: p.lastAt });
        }
      }
      const readers = e.readers || e.viewers || (Array.isArray(e.views) ? e.views : null);
      if (Array.isArray(readers)) readers.forEach(r => addReader(s, r));
      else if (!Array.isArray(e.people) && (e.viewCount != null || typeof e.views === 'number')) s.views += num(e.viewCount ?? e.views);
    }
  }
  if (Array.isArray(raw.reactions)) {
    for (const r of raw.reactions) {
      const s = slot(r?.entryId ?? r?.entry_id ?? r?.entry);
      const k = reactionKey(r?.kind ?? r?.type);
      if (!s || !k) continue;
      s.counts[k] += 1;
      addReactor(s, k, personOf(r));
    }
  }
  if (Array.isArray(raw.views)) {
    for (const v of raw.views) {
      const s = slot(v?.entryId ?? v?.entry_id ?? v?.entry);
      if (s) addReader(s, v);
    }
  }
  for (const s of Object.values(out)) {
    s.views += s.readers.reduce((a, r) => a + r.count, 0);
    s.readers.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
  return out;
}

/** Sussurros de um cartão (mestre): contagens já agregadas que vêm na lista ou no eco. */
export function entryWhispers(entry, echo) {
  const counts = emptyCounts();
  let views = 0;
  if (echo) {
    for (const k of Object.keys(counts)) counts[k] = echo.counts?.[k] || 0;
    views = echo.views || 0;
  } else if (entry) {
    const c = normalizeCounts(entry.reactionCounts || entry.reactions);
    for (const k of Object.keys(counts)) counts[k] = c[k];
    const fav = entry.favoriteCount ?? entry.favorites ?? entry.starCount;
    if (!counts.star && fav != null) counts.star = Array.isArray(fav) ? fav.length : num(fav);
    views = num(entry.viewCount ?? (typeof entry.views === 'number' ? entry.views : 0));
  }
  const icons = [...REACTIONS, STAR].filter(r => counts[r.id] > 0).map(r => ({ id: r.id, icon: r.icon, n: counts[r.id] }));
  return { counts, views, icons, any: icons.length > 0 };
}

const VERB = {
  shiver: {
    one: (lang, who, e) => t(lang, `${e} arrepiou ${who}.`, `${e} gave ${who} chills.`),
    many: (lang, n, e) => t(lang, `${e} arrepiou ${numWord(n)} jogadores.`, `${e} gave ${numWord(n, 'en')} players chills.`),
  },
  love: {
    one: (lang, who, e) => t(lang, `${who} se afeiçoou ${aPt(midName(e))}.`, `${who} grew fond of ${e}.`),
    many: (lang, n, e) => t(lang, `${e} conquistou o afeto de ${numWord(n)} jogadores.`, `${e} won the fondness of ${numWord(n, 'en')} players.`),
  },
  doubt: {
    one: (lang, who, e) => t(lang, `${who} desconfia ${dePt(midName(e))}.`, `${who} does not trust ${e}.`),
    many: (lang, n, e) => t(lang, `${numWord(n).replace(/^./, c => c.toUpperCase())} jogadores desconfiam ${dePt(midName(e))}.`, `${numWord(n, 'en').replace(/^./, c => c.toUpperCase())} players do not trust ${e}.`),
  },
  fight: {
    one: (lang, who, e) => t(lang, `${who} quer enfrentar ${midName(e)}.`, `${who} wants to face ${e}.`),
    many: (lang, n, e) => t(lang, `${numWord(n).replace(/^./, c => c.toUpperCase())} jogadores querem enfrentar ${midName(e)}.`, `${numWord(n, 'en').replace(/^./, c => c.toUpperCase())} players want to face ${e}.`),
  },
  star: {
    one: (lang, who, e, kind) => (kind === 'place'
      ? t(lang, `${who} quer voltar ${aPt(midName(e))}.`, `${who} wants to return to ${e}.`)
      : kind === 'npc'
        ? t(lang, `${who} quer reencontrar ${midName(e)}.`, `${who} wants to meet ${e} again.`)
        : t(lang, `${who} quer saber mais ${dePt(midName(e))}.`, `${who} wants to know more about ${e}.`)),
    many: (lang, n, e, kind) => {
      const N = (l) => numWord(n, l).replace(/^./, c => c.toUpperCase());
      return kind === 'place'
        ? t(lang, `${N('pt')} jogadores querem voltar ${aPt(midName(e))}.`, `${N('en')} players want to return to ${e}.`)
        : kind === 'npc'
          ? t(lang, `${N('pt')} jogadores querem reencontrar ${midName(e)}.`, `${N('en')} players want to meet ${e} again.`)
          : t(lang, `${N('pt')} jogadores querem saber mais ${dePt(midName(e))}.`, `${N('en')} players want to know more about ${e}.`);
    },
  },
};
const ICON = Object.fromEntries([...REACTIONS, STAR].map(r => [r.id, r.icon]));

/**
 * Frases do painel "Ecos da mesa", da mais forte para a mais fraca.
 * → [{key, entryId, icon, text, weight}]
 */
export function echoLines(echoes, entries, lang = 'pt', max = 6) {
  const byId = new Map((entries || []).map(e => [Number(e.id), e]));
  const lines = [];
  for (const [idRaw, s] of Object.entries(echoes || {})) {
    const id = Number(idRaw);
    const entry = byId.get(id);
    if (!entry) continue; // cartão apagado ou desconhecido: silêncio
    const name = entry.name;
    for (const r of s.readers || []) {
      if (r.count < 2) continue;
      const times = t(lang, `${numWord(r.count, 'pt', true)} vezes`, r.count === 2 ? 'twice' : `${numWord(r.count, 'en')} times`);
      const text = entry.isMap
        ? t(lang, `${r.name} voltou ao mapa ${dePt(midName(name))} ${times}.`, `${r.name} returned to the map of ${name} ${times}.`)
        : entry.kind === 'place'
          ? t(lang, `${r.name} voltou ${times} ${aPt(midName(name))}.`, `${r.name} went back to ${name} ${times}.`)
          : t(lang, `${r.name} voltou ${times} a pensar ${emPt(midName(name))}.`, `${r.name} thought back on ${name} ${times}.`);
      lines.push({ key: `v:${id}:${r.name}`, entryId: id, icon: entry.isMap ? '🗺' : '👁', text, weight: r.count + 1 });
    }
    for (const k of ['shiver', 'fight', 'doubt', 'love', 'star']) {
      const n = s.counts?.[k] || 0;
      if (!n) continue;
      const who = s.reactors?.[k] || [];
      const text = n === 1 && who.length === 1 ? VERB[k].one(lang, who[0], name, entry.kind)
        : n === 1 ? VERB[k].one(lang, t(lang, 'Alguém da mesa', 'Someone at the table'), name, entry.kind)
          : VERB[k].many(lang, n, name, entry.kind);
      lines.push({ key: `${k}:${id}`, entryId: id, icon: ICON[k], text, weight: n * 2 + (k === 'shiver' || k === 'fight' ? 0.5 : 0) });
    }
  }
  lines.sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key));
  return lines.slice(0, max);
}

/**
 * Linhas do painel a partir da resposta crua do servidor: monta aqui (com as
 * contrações do português e o ícone de cada eco); se não der para montar,
 * usa as frases de cronista que o servidor já manda (`lines`).
 */
export function echoLinesFrom(raw, entries, lang = 'pt', max = 6) {
  const known = new Set((entries || []).map(e => Number(e.id)));
  const byId = new Map((entries || []).map(e => [Number(e.id), e]));
  const local = echoLines(normalizeEchoes(raw), entries, lang, max);
  if (local.length) return local;
  if (raw && Array.isArray(raw.lines) && raw.lines.length) {
    return raw.lines
      .filter(l => l && l.text && known.has(Number(l.entryId)))
      .slice(0, max)
      .map((l, i) => {
        const k = l.kind === 'read' ? null : reactionKey(l.kind);
        const icon = k ? ICON[k] : (byId.get(Number(l.entryId))?.isMap ? '🗺' : '👁');
        const text = /[.!?…]$/.test(l.text) ? l.text : `${l.text}.`;
        return { key: `s${i}:${l.entryId}:${l.kind}`, entryId: Number(l.entryId), icon, text, weight: max - i };
      });
  }
  return local;
}

// ------------------------------------------------------------ o que a mesa conhece
/**
 * Uma frase sobre quanto do mundo os jogadores já conhecem (só para o mestre).
 * Nunca um número: "cerca de um terço". null quando o mundo é pequeno demais.
 */
export function knownPhrase(entries, lang = 'pt') {
  const list = entries || [];
  if (list.length < 4) return null;
  let known = 0;
  for (const e of list) known += e.visibility === 'revealed' ? 1 : e.visibility === 'partial' ? 0.5 : 0;
  const f = known / list.length;
  const P = (pt, en) => t(lang, pt, en);
  if (f === 0) return P('Seus jogadores ainda não pisaram no seu mundo — tudo o que você escreveu ainda é só seu.', 'Your players have not yet set foot in your world — everything you wrote is still yours alone.');
  if (f < 0.12) return P('Seus jogadores mal arranharam a superfície do seu mundo.', 'Your players have barely scratched the surface of your world.');
  if (f < 0.2) return P('Seus jogadores conhecem só um punhado do seu mundo.', 'Your players know only a handful of your world.');
  if (f < 0.29) return P('Seus jogadores já conhecem cerca de um quarto do seu mundo.', 'Your players already know about a quarter of your world.');
  if (f < 0.42) return P('Seus jogadores já conhecem cerca de um terço do seu mundo.', 'Your players already know about a third of your world.');
  if (f < 0.58) return P('Seus jogadores já conhecem cerca de metade do seu mundo.', 'Your players already know about half of your world.');
  if (f < 0.75) return P('Seus jogadores já conhecem cerca de dois terços do seu mundo.', 'Your players already know about two thirds of your world.');
  if (f < 0.97) return P('Seus jogadores já conhecem quase todo o seu mundo — talvez ele peça segredos novos.', 'Your players know almost all of your world — perhaps it is asking for new secrets.');
  return P('Seus jogadores conhecem tudo o que você escreveu. O mundo pede páginas novas.', 'Your players know everything you wrote. The world asks for new pages.');
}

// ------------------------------------------------------------ carta celeste
export const SKY_W = 1000;
export const SKY_H = 420;
const KIND_CENTER = {
  place: [230, 215], npc: [480, 120], faction: [770, 135],
  item: [800, 305], lore: [520, 315], handout: [270, 340],
};

/** Pares ligados (sem repetição): links, pai/filho, marcadores de mapa e menções. */
export function skyEdges(entries) {
  const ids = new Set((entries || []).map(e => e.id));
  const seen = new Set();
  const edges = [];
  const add = (a, b, kind) => {
    if (a == null || b == null || a === b || !ids.has(a) || !ids.has(b)) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ a, b, kind });
  };
  for (const e of entries || []) {
    if (e.parentId != null) add(e.parentId, e.id, 'parent');
    for (const ln of e.links || []) add(e.id, typeof ln === 'object' ? ln?.to : ln, 'link');
    for (const p of e.pinTargets || []) add(e.id, p, 'pin');
    for (const m of e.mentions || []) add(e.id, m, 'mention');
  }
  return edges;
}

/**
 * Posições determinísticas das estrelas (mesmo mundo → mesmo céu). Cada tipo
 * forma sua constelação; filhos orbitam o pai. Um afastamento leve evita
 * estrelas sobrepostas.
 * → { stars: [{id, name, kind, vis, x, y, r, degree}], lines: [{a, b, x1, y1, x2, y2, lit}] }
 */
export function skyLayout(entries, { width = SKY_W, height = SKY_H } = {}) {
  const list = (entries || []).slice().sort((a, b) => a.id - b.id);
  const edges = skyEdges(list);
  const degree = new Map();
  for (const ed of edges) { degree.set(ed.a, (degree.get(ed.a) || 0) + 1); degree.set(ed.b, (degree.get(ed.b) || 0) + 1); }
  const byId = new Map(list.map(e => [e.id, e]));
  const sx = width / SKY_W; const sy = height / SKY_H;
  const pos = new Map();
  const place = (e, depth = 0) => {
    if (pos.has(e.id)) return pos.get(e.id);
    const parent = e.parentId != null ? byId.get(e.parentId) : null;
    let p;
    if (parent && depth < 6 && parent.id !== e.id) {
      const pp = place(parent, depth + 1);
      const ang = unit(`a${e.id}`) * Math.PI * 2;
      const d = 52 + unit(`d${e.id}`) * 34;
      p = { x: pp.x + Math.cos(ang) * d * sx, y: pp.y + Math.sin(ang) * d * sy };
    } else {
      const [cx, cy] = KIND_CENTER[e.kind] || [500, 210];
      const ang = unit(`a${e.id}`) * Math.PI * 2;
      const d = Math.sqrt(unit(`d${e.id}`)) * 118;
      p = { x: (cx + Math.cos(ang) * d * 1.25) * sx, y: (cy + Math.sin(ang) * d * 0.7) * sy };
    }
    pos.set(e.id, p);
    return p;
  };
  list.forEach(e => place(e));
  // Afastamento leve (poucas iterações, determinístico).
  const pts = list.map(e => ({ id: e.id, ...pos.get(e.id) }));
  const minD = 24 * Math.min(sx, sy);
  const iters = pts.length > 220 ? 2 : 4;
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x; const dy = pts[j].y - pts[i].y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minD * minD) continue;
        const d = Math.sqrt(d2) || 0.01;
        const push = (minD - d) / 2;
        const ux = d2 ? dx / d : Math.cos(i + j); const uy = d2 ? dy / d : Math.sin(i + j);
        pts[i].x -= ux * push; pts[i].y -= uy * push;
        pts[j].x += ux * push; pts[j].y += uy * push;
      }
    }
  }
  // Céu pequeno não fica perdido num canto: aproxima (até 2,2×) e centraliza.
  if (pts.length) {
    const xs = pts.map(p => p.x); const ys = pts.map(p => p.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const bw = Math.max(1, maxX - minX); const bh = Math.max(1, maxY - minY);
    const k = Math.max(1, Math.min(2.2, (width * 0.82) / bw, (height * 0.72) / bh));
    const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
    for (const p of pts) { p.x = width / 2 + (p.x - cx) * k; p.y = height / 2 + 6 + (p.y - cy) * k; }
  }
  const pad = 14;
  const clampX = (x) => Math.max(pad, Math.min(width - pad, x));
  const clampY = (y) => Math.max(pad, Math.min(height - pad, y));
  const stars = pts.map(p => {
    const e = byId.get(p.id);
    const deg = degree.get(p.id) || 0;
    return {
      id: p.id, name: e.name, kind: e.kind, vis: e.visibility || 'hidden',
      x: Math.round(clampX(p.x) * 10) / 10, y: Math.round(clampY(p.y) * 10) / 10,
      r: Math.round((2.6 + Math.min(4.2, Math.sqrt(deg) * 1.5)) * 10) / 10, degree: deg,
    };
  });
  const sMap = new Map(stars.map(s => [s.id, s]));
  const lines = edges.map(ed => {
    const A = sMap.get(ed.a); const B = sMap.get(ed.b);
    return { a: ed.a, b: ed.b, x1: A.x, y1: A.y, x2: B.x, y2: B.y, lit: A.vis !== 'hidden' && B.vis !== 'hidden' };
  });
  return { stars, lines };
}

// ------------------------------------------------------------ páginas em branco
const TAVERN_RE = /tavern|taverna|estalagem|\binn\b|pousada|hospedaria|bar\b|alehouse/i;
const VILLAIN_RE = /vil(ão|ã|ões|ãs|ao)|villain|antagon|cultist|cultista|necromant|tirano|tyrant|traidor|traitor|inimig|enemy|bbeg/i;

const connected = (entries) => {
  const map = new Map();
  for (const ed of skyEdges(entries)) {
    if (!map.has(ed.a)) map.set(ed.a, new Set());
    if (!map.has(ed.b)) map.set(ed.b, new Set());
    map.get(ed.a).add(ed.b); map.get(ed.b).add(ed.a);
  }
  return map;
};

/**
 * Até `max` (≤2) perguntas do cronista sobre lacunas do mundo.
 * → [{key, icon, text, cta: {type:'create', fields} | {type:'open', id}}]
 * `dismissed` = Set/array de chaves dispensadas ("Agora não").
 */
export function blankPages(entries, lang = 'pt', { dismissed = [], max = 2, seed = 0 } = {}) {
  const list = (entries || []).slice().sort((a, b) => a.id - b.id);
  if (!list.length) return [];
  const skip = new Set(dismissed instanceof Set ? [...dismissed] : dismissed || []);
  const byKind = (k) => list.filter(e => e.kind === k);
  const near = connected(list);
  const neighborsOfKind = (id, k) => [...(near.get(id) || [])].map(i => list.find(e => e.id === i)).filter(e => e && e.kind === k);
  const rng = (k) => makeRng(hashStr(`${seed}:${k}`));
  const out = [];
  const push = (q) => { if (!skip.has(q.key) && !out.some(o => o.key === q.key)) out.push(q); };

  const places = byKind('place');
  const npcs = byKind('npc');
  const factions = byKind('faction');
  const label = (e) => `${e.data?.placeType || ''} ${e.name} ${(e.tags || []).join(' ')}`;

  // 1) Taverna sem ninguém atrás do balcão.
  for (const p of places) {
    if (!TAVERN_RE.test(label(p)) || neighborsOfKind(p.id, 'npc').length) continue;
    const name = personName(lang, rng(`tav${p.id}`));
    push({
      key: `tavern:${p.id}`, icon: '🍺',
      text: t(lang, `Quem serve a cerveja ${emPt(p.name)}?`, `Who pours the ale at ${p.name}?`),
      cta: { type: 'create', fields: { kind: 'npc', name, visibility: 'hidden', parentId: p.id, links: [{ to: p.id, rel: 'located_in' }], summary: t(lang, `Serve a cerveja ${emPt(p.name)}.`, `Pours the ale at ${p.name}.`), data: { role: t(lang, 'Taverneiro', 'Innkeeper') } } },
    });
  }
  // 2) Um vilão sem segredo.
  for (const n of npcs) {
    const villain = VILLAIN_RE.test(`${n.data?.role || ''} ${(n.tags || []).join(' ')} ${n.summary || ''}`);
    if (!villain || (n.secretsCount || 0) > 0) continue;
    push({ key: `secret:${n.id}`, icon: '🗝', text: t(lang, `Que segredo ${midName(n.name)} esconde?`, `What secret does ${n.name} hide?`), cta: { type: 'open', id: n.id } });
  }
  // 3) Quem governa? (um lugar e nenhuma facção)
  if (places.length && !factions.length) {
    const p = places[0];
    push({
      key: `rule:${p.id}`, icon: '⚜️',
      text: t(lang, `Quem governa ${midName(p.name)}?`, `Who rules ${p.name}?`),
      cta: { type: 'create', fields: { kind: 'faction', visibility: 'hidden', name: factionName(lang, rng(`rule${p.id}`)), links: [{ to: p.id }], summary: t(lang, `Governa ${midName(p.name)} — por enquanto.`, `Rules ${p.name} — for now.`) } },
    });
  }
  // 4) Facção sem rosto.
  for (const f of factions) {
    if (neighborsOfKind(f.id, 'npc').length) continue;
    const name = personName(lang, rng(`lead${f.id}`));
    push({
      key: `lead:${f.id}`, icon: '👑',
      text: t(lang, `Quem lidera ${midName(f.name)}?`, `Who leads ${f.name}?`),
      cta: { type: 'create', fields: { kind: 'npc', name, visibility: 'hidden', parentId: f.id, links: [{ to: f.id, rel: 'member' }], summary: t(lang, `Lidera ${midName(f.name)}.`, `Leads ${f.name}.`), data: { role: t(lang, 'Líder', 'Leader') } } },
    });
  }
  // 5) Lugar onde ninguém mora.
  for (const p of places) {
    if (neighborsOfKind(p.id, 'npc').length || TAVERN_RE.test(label(p))) continue;
    const name = personName(lang, rng(`live${p.id}`));
    push({
      key: `live:${p.id}`, icon: '🕯',
      text: t(lang, `Quem vive ${emPt(p.name)} e não quer ser encontrado?`, `Who lives in ${p.name} and does not want to be found?`),
      cta: { type: 'create', fields: { kind: 'npc', name, visibility: 'hidden', parentId: p.id, links: [{ to: p.id, rel: 'located_in' }], summary: t(lang, `Vive ${emPt(p.name)}, longe dos olhares.`, `Lives in ${p.name}, out of sight.`) } },
    });
  }
  // 6) Nenhuma lenda ainda.
  if (!byKind('lore').length && places.length) {
    const p = places[places.length - 1];
    push({
      key: `lore:${p.id}`, icon: '📜',
      text: t(lang, `Que história os velhos contam ${emPt(p.name)}?`, `What tale do the elders tell in ${p.name}?`),
      cta: { type: 'create', fields: { kind: 'lore', visibility: 'hidden', name: t(lang, `A lenda ${dePt(midName(p.name))}`, `The legend of ${p.name}`), links: [{ to: p.id }] } },
    });
  }
  // 7) Nenhum objeto cobiçado.
  if (!byKind('item').length && (places.length || npcs.length)) {
    const anchor = places[0] || npcs[0];
    push({
      key: `item:${anchor.id}`, icon: '💎',
      text: anchor.kind === 'place'
        ? t(lang, `Que objeto todos ${emPt(anchor.name)} cobiçam?`, `What object does everyone in ${anchor.name} covet?`)
        : t(lang, `O que ${midName(anchor.name)} carrega e nunca mostra?`, `What does ${anchor.name} carry and never show?`),
      cta: { type: 'create', fields: { kind: 'item', visibility: 'hidden', name: anchor.kind === 'place' ? t(lang, `O tesouro ${dePt(midName(anchor.name))}`, `The treasure of ${anchor.name}`) : t(lang, `O fardo ${dePt(midName(anchor.name))}`, `${anchor.name}'s burden`), links: [{ to: anchor.id }] } },
    });
  }
  return out.slice(0, Math.max(0, Math.min(2, max)));
}

// ------------------------------------------------------------ rumor do dia
/** 'AAAA-MM-DD' no fuso local. */
export function dayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Índice do rumor do dia (mesmo dia + mesma campanha → mesmo rumor; `shift` pede o seguinte). */
export function rumorIndex(total, seed, date = new Date(), shift = 0) {
  if (!total) return -1;
  const base = hashStr(`${seed}|${dayKey(date)}`) % total;
  return ((base + shift) % total + total) % total;
}

/** Rumor do dia já no idioma: {k, text, name, index}. */
export function rumorOfDay(rumors, seed, lang = 'pt', date = new Date(), shift = 0) {
  const i = rumorIndex((rumors || []).length, seed, date, shift);
  if (i < 0) return null;
  const r = rumors[i];
  return { k: r.k, text: lang === 'en' ? r.en : r.pt, name: lang === 'en' ? r.n[1] : r.n[0], index: i };
}

// ------------------------------------------------------------ apagar campanha
/** A confirmação digitada bate com o nome da campanha? (ignora espaços nas pontas e maiúsculas) */
export function confirmNameMatches(typed, name) {
  const norm = (s) => String(s || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
  return !!norm(name) && norm(typed) === norm(name);
}
