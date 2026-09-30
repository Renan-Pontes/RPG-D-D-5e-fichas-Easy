/**
 * Preparação do mestre — lógica pura do mapa de nós (salas/cenas) e caminhos.
 * Sem React; testável em node (tests/prep-graph.test.js).
 *
 * data = { version: 1, nodes: [Node], edges: [Edge] }
 * Node = { id, name, kind, x, y, readAloud, notes, tags, image,
 *          encounter: [{ monsterId, name, crNum, count, snapshot? }],
 *          hazards: [{ name, dc, effect, damage }], checks: [{ skill, dc, note }],
 *          treasure: { items: [instância], coins: {cp,sp,ep,gp,pp} } }
 * Edge = { id, from, to|null, kind, label, condition, oneWay, toAdventureId?, toAdventureName? }
 *   Arestas valem nos dois sentidos, salvo `oneWay`. kind 'adventure' leva a outra
 *   aventura (to pode ser null).
 * play = { current, visited: [nodeId], unlocked: [edgeId] }
 */
import { encounterDifficulty } from '../combat/encounter.js';
import { xpForCr, crToNumber, estimateCr } from '../combat/cr-estimate.js';

export const NODE_W = 184;
export const NODE_H = 64;

export const NODE_KINDS = [
  { id: 'room',        icon: '🚪', pt: 'Sala',          en: 'Room' },
  { id: 'combat',      icon: '⚔', pt: 'Combate',       en: 'Combat' },
  { id: 'social',      icon: '💬', pt: 'Cena social',   en: 'Social scene' },
  { id: 'exploration', icon: '🧭', pt: 'Exploração',    en: 'Exploration' },
  { id: 'puzzle',      icon: '🧩', pt: 'Enigma',        en: 'Puzzle' },
  { id: 'trap',        icon: '⚠', pt: 'Armadilha',     en: 'Trap' },
  { id: 'rest',        icon: '🔥', pt: 'Descanso',      en: 'Rest' },
  { id: 'travel',      icon: '🐎', pt: 'Viagem',        en: 'Travel' },
  { id: 'boss',        icon: '💀', pt: 'Chefe',         en: 'Boss' },
  { id: 'other',       icon: '✦', pt: 'Outro',         en: 'Other' },
];
export const NODE_KIND = Object.fromEntries(NODE_KINDS.map(k => [k.id, k]));

export const EDGE_KINDS = [
  { id: 'door',      icon: '🚪', pt: 'Porta',                  en: 'Door' },
  { id: 'locked',    icon: '🔒', pt: 'Porta trancada',         en: 'Locked door' },
  { id: 'secret',    icon: '👁', pt: 'Passagem secreta',       en: 'Secret passage' },
  { id: 'path',      icon: '👣', pt: 'Caminho',                en: 'Path' },
  { id: 'stairs',    icon: '⇅', pt: 'Escada',                 en: 'Stairs' },
  { id: 'adventure', icon: '↗', pt: 'Vai para outra aventura', en: 'Goes to another adventure' },
];
export const EDGE_KIND = Object.fromEntries(EDGE_KINDS.map(k => [k.id, k]));

/** Arestas que só ficam "abertas" depois que o mestre libera. */
export const GATED_KINDS = new Set(['locked', 'secret']);

export const COINS = ['pp', 'gp', 'ep', 'sp', 'cp'];
export const COIN_LABEL = { pp: { pt: 'pl', en: 'pp' }, gp: { pt: 'po', en: 'gp' }, ep: { pt: 'pe', en: 'ep' }, sp: { pt: 'pp', en: 'sp' }, cp: { pt: 'pc', en: 'cp' } };

export const LIMITS = { nodes: 200, edges: 600, imageChars: 450_000, dataBytes: 2_000_000 };

const tr = (lang, pt, en) => (lang === 'pt' ? pt : en);

export function newId(prefix = 'n') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyData() {
  return { version: 1, nodes: [], edges: [] };
}

export function emptyPlay() {
  return { current: null, visited: [], unlocked: [] };
}

export function makeNode({ id, name = '', kind = 'room', x = 0, y = 0, ...rest } = {}) {
  return {
    id: id || newId('n'), name, kind, x, y,
    readAloud: '', notes: '', tags: [], image: '',
    encounter: [], hazards: [], checks: [], treasure: { items: [], coins: {} },
    ...rest,
  };
}

export function makeEdge(from, to, kind = 'door', extra = {}) {
  return { id: newId('e'), from, to: to ?? null, kind, label: '', condition: '', oneWay: false, ...extra };
}

// ------------------------------------------------------------------ edição
export function nodeMap(data) {
  return new Map((data?.nodes || []).map(n => [n.id, n]));
}

export function addNode(data, node) {
  return { ...data, nodes: [...(data.nodes || []), node] };
}

export function updateNode(data, id, patch) {
  return { ...data, nodes: (data.nodes || []).map(n => (n.id === id ? { ...n, ...patch } : n)) };
}

/** Remove o nó e as conexões que tocam nele. */
export function removeNode(data, id) {
  return {
    ...data,
    nodes: (data.nodes || []).filter(n => n.id !== id),
    edges: (data.edges || []).filter(e => e.from !== id && e.to !== id),
  };
}

/** Já existe conexão entre a e b (em qualquer sentido)? */
export function findEdgeBetween(data, a, b) {
  return (data.edges || []).find(e => (e.from === a && e.to === b) || (e.from === b && e.to === a)) || null;
}

/**
 * Adiciona a aresta se fizer sentido (sem laço, sem duplicar o mesmo par, alvo
 * existente). Devolve { data, edge } — edge null quando nada mudou.
 */
export function addEdge(data, edge) {
  const nodes = nodeMap(data);
  if (!nodes.has(edge.from)) return { data, edge: null };
  if (edge.kind !== 'adventure' || edge.to) {
    if (!edge.to || edge.to === edge.from || !nodes.has(edge.to)) return { data, edge: null };
    if (findEdgeBetween(data, edge.from, edge.to)) return { data, edge: null };
  }
  if ((data.edges || []).length >= LIMITS.edges) return { data, edge: null };
  return { data: { ...data, edges: [...(data.edges || []), edge] }, edge };
}

export function updateEdge(data, id, patch) {
  return { ...data, edges: (data.edges || []).map(e => (e.id === id ? { ...e, ...patch } : e)) };
}

export function removeEdge(data, id) {
  return { ...data, edges: (data.edges || []).filter(e => e.id !== id) };
}

export function reverseEdge(data, id) {
  return {
    ...data,
    edges: (data.edges || []).map(e => (e.id === id && e.to ? { ...e, from: e.to, to: e.from } : e)),
  };
}

// ------------------------------------------------------------------ caminhos
/**
 * Conexões que saem de `nodeId` (considerando sentido único) com o estado na mesa.
 * status: 'open' | 'locked' (trancada, ainda não liberada) | 'secret' (não
 * descoberta) | 'external' (outra aventura). `unlocked` indica porta liberada.
 */
export function pathsFrom(data, play, nodeId) {
  if (!nodeId) return [];
  const nodes = nodeMap(data);
  const unlocked = new Set(play?.unlocked || []);
  const out = [];
  for (const e of data?.edges || []) {
    let targetId = null;
    if (e.from === nodeId) targetId = e.to;
    else if (e.to === nodeId && !e.oneWay) targetId = e.from;
    else continue;
    let status = targetId ? 'open' : 'external';
    if (status === 'open' && GATED_KINDS.has(e.kind) && !unlocked.has(e.id)) status = e.kind;
    out.push({
      edge: e, targetId, target: targetId ? nodes.get(targetId) || null : null,
      status, unlocked: GATED_KINDS.has(e.kind) && unlocked.has(e.id),
      visited: !!targetId && (play?.visited || []).includes(targetId),
    });
  }
  const rank = { open: 0, locked: 1, secret: 2, external: 3 };
  return out.sort((a, b) => rank[a.status] - rank[b.status]);
}

/** Ids dos nós a um passo do nó atual por caminhos abertos. */
export function availableTargets(data, play) {
  return new Set(pathsFrom(data, play, play?.current).filter(p => p.status === 'open' && p.targetId).map(p => p.targetId));
}

/** Arestas destacadas no mapa (todas que saem do nó atual). */
export function highlightedEdges(data, play) {
  return new Set(pathsFrom(data, play, play?.current).map(p => p.edge.id));
}

/** Nós alcançáveis a partir de `start` (BFS). ignoreGates: trata trancadas/secretas como abertas. */
export function reachableFrom(data, start, play = null, { ignoreGates = false } = {}) {
  const seen = new Set();
  if (!start || !nodeMap(data).has(start)) return seen;
  const queue = [start];
  seen.add(start);
  const p = ignoreGates ? { ...(play || emptyPlay()), unlocked: (data.edges || []).map(e => e.id) } : play;
  while (queue.length) {
    const id = queue.shift();
    for (const path of pathsFrom(data, p, id)) {
      if (path.status !== 'open' || !path.targetId || seen.has(path.targetId)) continue;
      seen.add(path.targetId);
      queue.push(path.targetId);
    }
  }
  return seen;
}

/** Nó inicial: o marcado com a tag "início"/"start", senão o primeiro conectado sem setas chegando, senão o primeiro. */
export function startNode(data) {
  const nodes = data?.nodes || [];
  if (!nodes.length) return null;
  const tagged = nodes.find(n => (n.tags || []).some(t => /^(in[ií]cio|start|entrada)$/i.test(t)));
  if (tagged) return tagged;
  const incoming = new Set((data.edges || []).filter(e => e.to).map(e => e.to));
  const linked = new Set((data.edges || []).flatMap(e => [e.from, e.to]).filter(Boolean));
  return nodes.find(n => linked.has(n.id) && !incoming.has(n.id)) || nodes[0];
}

/**
 * Ordem de leitura para a visão em lista: BFS a partir do nó inicial (ignorando
 * trancas — é a planta do mestre), depois os nós soltos na ordem de criação.
 */
export function listOrder(data) {
  const start = startNode(data);
  const order = [];
  const seen = new Set();
  const visit = (id) => {
    const reach = reachableFrom(data, id, null, { ignoreGates: true });
    // BFS preserva ordem de inserção no Set
    for (const n of reach) if (!seen.has(n)) { seen.add(n); order.push(n); }
  };
  if (start) visit(start.id);
  for (const n of data?.nodes || []) if (!seen.has(n.id)) visit(n.id);
  const nodes = nodeMap(data);
  return order.map(id => nodes.get(id)).filter(Boolean);
}

// ------------------------------------------------------------------ validação
/**
 * Avisos para o mestre (nunca bloqueiam o salvar, exceto 'error').
 * [{ level: 'error'|'warn'|'info', code, nodeId?, edgeId?, pt, en }]
 */
export function validateAdventure(data) {
  const issues = [];
  const push = (level, code, pt, en, ref = {}) => issues.push({ level, code, pt, en, ...ref });
  const nodes = data?.nodes || [];
  const edges = data?.edges || [];
  const ids = new Set();
  for (const n of nodes) {
    if (ids.has(n.id)) push('error', 'duplicate_node', `Nó repetido (${n.id})`, `Duplicate node (${n.id})`, { nodeId: n.id });
    ids.add(n.id);
    if (!String(n.name || '').trim()) push('warn', 'unnamed', 'Nó sem nome', 'Unnamed node', { nodeId: n.id });
    if ((n.image || '').length > LIMITS.imageChars) push('error', 'image_too_large', `Imagem grande demais em "${n.name}"`, `Image too large in "${n.name}"`, { nodeId: n.id });
    for (const h of n.hazards || []) {
      if (h.name && h.dc == null) push('info', 'hazard_no_dc', `Perigo "${h.name}" sem CD (${n.name})`, `Hazard "${h.name}" without DC (${n.name})`, { nodeId: n.id });
    }
  }
  if (nodes.length > LIMITS.nodes) push('error', 'too_many_nodes', `Máximo de ${LIMITS.nodes} nós`, `At most ${LIMITS.nodes} nodes`);
  if (edges.length > LIMITS.edges) push('error', 'too_many_edges', `Máximo de ${LIMITS.edges} conexões`, `At most ${LIMITS.edges} connections`);
  const byName = nodeMap(data);
  for (const e of edges) {
    const a = byName.get(e.from);
    if (!a || (e.to && !byName.has(e.to)) || (!e.to && e.kind !== 'adventure')) {
      push('error', 'dangling_edge', 'Conexão aponta para um nó que não existe', 'Connection points to a missing node', { edgeId: e.id });
      continue;
    }
    if (e.kind === 'locked' && !String(e.condition || '').trim()) {
      push('info', 'locked_no_condition', `Porta trancada sem condição (${a.name})`, `Locked door without a condition (${a.name})`, { edgeId: e.id });
    }
    if (e.kind === 'adventure' && !e.toAdventureId && !e.to) {
      push('warn', 'adventure_no_target', `"Vai para outra aventura" sem aventura escolhida (${a.name})`, `"Goes to another adventure" without a target (${a.name})`, { edgeId: e.id });
    }
  }
  if (nodes.length > 1) {
    const touched = new Set(edges.flatMap(e => [e.from, e.to]).filter(Boolean));
    for (const n of nodes) {
      if (!touched.has(n.id)) push('warn', 'isolated', `"${n.name || '?'}" não tem conexões`, `"${n.name || '?'}" has no connections`, { nodeId: n.id });
    }
    const start = startNode(data);
    const reach = reachableFrom(data, start?.id, null, { ignoreGates: true });
    for (const n of nodes) {
      if (touched.has(n.id) && !reach.has(n.id)) {
        push('warn', 'unreachable', `"${n.name || '?'}" não é alcançável a partir de "${start?.name}"`, `"${n.name || '?'}" can't be reached from "${start?.name}"`, { nodeId: n.id });
      }
    }
  }
  return issues;
}

// ------------------------------------------------------------------ encontro
/** Entrada de encontro a partir de um monstro do bestiário (ou do mestre). */
export function encounterEntry(monster, count = 1, lang = 'pt') {
  const name = typeof monster.name === 'object' ? (monster.name?.[lang] || monster.name?.en || monster.id) : monster.name;
  const entry = {
    monsterId: monster.id || '', name: name || 'Monstro',
    crNum: crToNumber(monster.crNum ?? monster.cr) ?? undefined,
    count: Math.max(1, Math.min(50, parseInt(count, 10) || 1)),
  };
  if (entry.crNum === undefined) delete entry.crNum;
  if (monster.custom) entry.snapshot = monster;
  return entry;
}

/** XP de uma entrada: ND do catálogo (lookup) > ND salvo > estimado pelo snapshot. */
export function entryXp(entry, lookup) {
  const src = lookup ? lookup(entry.monsterId) : null;
  let cr = src ? crToNumber(src.crNum ?? src.cr) : null;
  let estimated = false;
  if (cr == null && entry.crNum != null) cr = crToNumber(entry.crNum);
  if (cr == null && entry.snapshot) {
    try { cr = estimateCr(entry.snapshot).crNum; estimated = true; } catch { cr = null; }
  }
  if (cr == null) return { crNum: null, xp: 0, estimated: true };
  return { crNum: cr, xp: xpForCr(cr), estimated };
}

/** Dificuldade prevista do encontro do nó contra os níveis do grupo. */
export function nodeEncounter(node, levels, lookup) {
  let total = 0; let estimated = false; let monsters = 0;
  for (const e of node?.encounter || []) {
    const r = entryXp(e, lookup);
    const n = Math.max(1, parseInt(e.count, 10) || 1);
    total += r.xp * n;
    monsters += n;
    if (r.estimated) estimated = true;
  }
  return { monsters, estimated, ...encounterDifficulty(total, levels) };
}

/** Níveis dos personagens da campanha (jogadores com ficha). */
export function partyLevels(campaign) {
  return (campaign?.members || [])
    .filter(m => m.role !== 'dm' && m.character)
    .map(m => parseInt(m.character?.data?.level ?? m.character?.summary?.level ?? 1, 10) || 1);
}

/**
 * Corpos de api.addCombatant para o encontro do nó (puro: `resolve(entry)`
 * devolve o monstro do catálogo/snapshot; `toCombat` = monsterForCombat).
 * `rng` injetável para teste. Nomes numerados quando há mais de um.
 */
export function encounterCombatants(node, { resolve, toCombat, lang = 'pt', rng = Math.random } = {}) {
  const out = [];
  let col = 0;
  for (const entry of node?.encounter || []) {
    const src = resolve(entry);
    if (!src) continue;
    const snap = toCombat(src);
    const base = (typeof snap.name === 'object' ? (snap.name?.[lang] || snap.name?.en) : snap.name) || entry.name || 'Monster';
    const count = Math.max(1, parseInt(entry.count, 10) || 1);
    const dexMod = Math.floor(((snap.abilities?.dex ?? 10) - 10) / 2);
    const initMod = typeof snap.initiative === 'number' ? snap.initiative : dexMod;
    const scale = { Tiny: 0.5, Large: 2, Huge: 3, Gargantuan: 4 }[snap.size] || 1;
    for (let i = 0; i < count; i++) {
      out.push({
        type: 'monster',
        monster: { ...snap, name: count > 1 ? `${base} #${i + 1}` : base },
        initiative: 1 + Math.floor(rng() * 20) + initMod,
        position: { x: 100 + (col % 8) * 60, y: 100 + Math.floor(col / 8) * 60 },
        tokenScale: scale,
      });
      col++;
    }
  }
  return out;
}

// ------------------------------------------------------------------ tesouro
export function coinsText(coins, lang = 'pt') {
  return COINS.filter(c => coins?.[c]).map(c => `${coins[c]} ${COIN_LABEL[c][lang] || c}`).join(', ');
}

export function treasureSummary(treasure, lang = 'pt') {
  const items = (treasure?.items || []).map(it => `${it.name}${it.qty > 1 ? ` ×${it.qty}` : ''}`);
  const coins = coinsText(treasure?.coins, lang);
  return [...items, coins].filter(Boolean).join(', ');
}

export function hasTreasure(node) {
  return !!((node?.treasure?.items || []).length || COINS.some(c => node?.treasure?.coins?.[c]));
}

/** Soma moedas (sem negativos). */
export function addCoins(base, extra) {
  const out = { ...(base || {}) };
  for (const c of COINS) {
    const v = (parseInt(out[c], 10) || 0) + (parseInt(extra?.[c], 10) || 0);
    if (v) out[c] = Math.max(0, v);
  }
  return out;
}

// ------------------------------------------------------------------ layout
/** Posição livre perto de (x,y) — evita empilhar nós. */
export function freeSpot(data, x = 0, y = 0) {
  const nodes = data?.nodes || [];
  // espaço generoso entre salas para caber a seta e o rótulo da conexão
  const clash = (px, py) => nodes.some(n => Math.abs(n.x - px) < NODE_W + 60 && Math.abs(n.y - py) < NODE_H + 60);
  for (let r = 0; r < 12; r++) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 1], [0, -1], [-1, 0], [1, -1], [-1, -1]]) {
      const px = x + dx * r * (NODE_W + 100);
      const py = y + dy * r * (NODE_H + 90);
      if (!clash(px, py)) return { x: Math.round(px), y: Math.round(py) };
    }
  }
  return { x: Math.round(x + 30), y: Math.round(y + 30) };
}

/** Enquadramento (pan/zoom) para caber todos os nós em w×h. */
export function fitView(nodes, w, h, pad = 40) {
  if (!nodes?.length || !w || !h) return { x: w / 2 || 0, y: h / 2 || 0, k: 1 };
  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxX = Math.max(...nodes.map(n => n.x + NODE_W));
  const maxY = Math.max(...nodes.map(n => n.y + NODE_H));
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const k = Math.max(0.25, Math.min(1.25, Math.min((w - pad * 2) / bw, (h - pad * 2) / bh)));
  return { k, x: (w - bw * k) / 2 - minX * k, y: (h - bh * k) / 2 - minY * k };
}

/** Ponto na borda do retângulo do nó na direção de (tx,ty). */
export function borderPoint(node, tx, ty) {
  const cx = node.x + NODE_W / 2;
  const cy = node.y + NODE_H / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const sx = (NODE_W / 2) / Math.abs(dx || 1e-9);
  const sy = (NODE_H / 2) / Math.abs(dy || 1e-9);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

/** Nó sob o ponto (coordenadas do mapa). */
export function nodeAt(data, x, y) {
  const nodes = data?.nodes || [];
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (x >= n.x && x <= n.x + NODE_W && y >= n.y && y <= n.y + NODE_H) return n;
  }
  return null;
}

// ------------------------------------------------------------------ export/import
export const EXPORT_FORMAT = 'forja-adventure';

export function exportAdventure(adv) {
  return {
    format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(),
    name: adv.name, summary: adv.summary || '',
    data: { version: 1, nodes: adv.data?.nodes || [], edges: adv.data?.edges || [] },
  };
}

/**
 * Lê um JSON exportado. Lança Error('invalid_json' | 'not_adventure' | 'dangling_edge' | ...).
 * Ids de outras aventuras (toAdventureId) não valem noutra campanha: ficam só pelo nome.
 */
export function parseAdventureImport(text) {
  let raw;
  try { raw = typeof text === 'string' ? JSON.parse(text) : text; } catch { throw new Error('invalid_json'); }
  if (!raw || typeof raw !== 'object') throw new Error('invalid_json');
  const data = raw.format === EXPORT_FORMAT ? raw.data : (Array.isArray(raw.nodes) ? raw : null);
  if (!data || !Array.isArray(data.nodes)) throw new Error('not_adventure');
  const nodes = data.nodes.filter(n => n && typeof n === 'object' && n.id).map(n => makeNode({ ...n, id: String(n.id) }));
  const edges = (Array.isArray(data.edges) ? data.edges : [])
    .filter(e => e && typeof e === 'object' && e.id)
    .map(e => ({ ...makeEdge(String(e.from), e.to == null ? null : String(e.to), e.kind), ...e, id: String(e.id), toAdventureId: null }));
  const clean = { version: 1, nodes, edges };
  if (validateAdventure(clean).some(i => i.level === 'error')) throw new Error('invalid_structure');
  if (nodes.length > LIMITS.nodes) throw new Error('too_many_nodes');
  return {
    name: String(raw.name || '').trim().slice(0, 120) || 'Aventura importada',
    summary: String(raw.summary || '').slice(0, 4000),
    data: clean,
  };
}

// ------------------------------------------------------------------ rótulos
export function nodeKindLabel(kind, lang = 'pt') {
  const k = NODE_KIND[kind] || NODE_KIND.other;
  return tr(lang, k.pt, k.en);
}

export function edgeKindLabel(kind, lang = 'pt') {
  const k = EDGE_KIND[kind] || EDGE_KIND.path;
  return tr(lang, k.pt, k.en);
}

/** "🔒 Porta trancada — Porta de ferro (precisa da chave)" */
export function edgeText(edge, lang = 'pt') {
  const k = EDGE_KIND[edge.kind] || EDGE_KIND.path;
  const parts = [`${k.icon} ${edge.label || tr(lang, k.pt, k.en)}`];
  if (edge.condition) parts.push(`(${edge.condition})`);
  return parts.join(' ');
}
