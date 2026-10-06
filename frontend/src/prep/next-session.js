/**
 * Próxima sessão — lógica pura do plano do "Mestre Preguiçoso".
 * Sem React; testável em node (tests/next-session.test.js).
 *
 * Plano (Campaign.dm_settings.sessionPlan, merge por chave no servidor):
 * { strongStart, scenes: [{id, text, nodeRef: {adventureId, nodeId}|null, done}],
 *   secrets: [{id, text, ref: {entryId, secretId}|null, discovered}],
 *   npcIds: [id], placeIds: [id], monsters, rewards }
 */

export const PLAN_KEYS = ['strongStart', 'scenes', 'secrets', 'npcIds', 'placeIds', 'monsters', 'rewards'];
export const PLAN_LIMITS = { scenes: 30, secrets: 30, ids: 60, text: 1000, long: 4000 };
/** Quantas pistas o checklist sugere (os "10 segredos e pistas"). */
export const SECRET_GOAL = 10;

export function emptyPlan() {
  return { strongStart: '', scenes: [], secrets: [], npcIds: [], placeIds: [], monsters: '', rewards: '' };
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const idList = (raw) => {
  const out = [];
  for (const x of Array.isArray(raw) ? raw : []) {
    const n = Number(x);
    if (Number.isInteger(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out.slice(0, PLAN_LIMITS.ids);
};
const nodeRef = (r) => (r && r.adventureId && r.nodeId ? { adventureId: Number(r.adventureId), nodeId: String(r.nodeId) } : null);
const entryRef = (r) => (r && r.entryId ? { entryId: Number(r.entryId), secretId: r.secretId ? String(r.secretId) : null } : null);

/** Normaliza o que vier do servidor (ou nada) para um plano completo. */
export function normalizePlan(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  return {
    strongStart: str(p.strongStart, PLAN_LIMITS.long),
    scenes: (Array.isArray(p.scenes) ? p.scenes : []).filter(s => s && typeof s === 'object').slice(0, PLAN_LIMITS.scenes)
      .map((s, i) => ({ id: s.id ? String(s.id) : `c${i + 1}`, text: str(s.text, PLAN_LIMITS.text), nodeRef: nodeRef(s.nodeRef), done: !!s.done })),
    secrets: (Array.isArray(p.secrets) ? p.secrets : []).filter(s => s && typeof s === 'object').slice(0, PLAN_LIMITS.secrets)
      .map((s, i) => ({ id: s.id ? String(s.id) : `p${i + 1}`, text: str(s.text, PLAN_LIMITS.text), ref: entryRef(s.ref), discovered: !!s.discovered })),
    npcIds: idList(p.npcIds),
    placeIds: idList(p.placeIds),
    monsters: str(p.monsters, PLAN_LIMITS.long),
    rewards: str(p.rewards, PLAN_LIMITS.long),
  };
}

/** Id curto que não colide com os já usados na lista (c1, c2… / p1, p2…). */
export function nextId(list, prefix) {
  const used = new Set((list || []).map(x => x.id));
  let i = (list || []).length + 1;
  while (used.has(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}

export function addScene(plan, text = '', ref = null) {
  if (plan.scenes.length >= PLAN_LIMITS.scenes) return plan;
  return { ...plan, scenes: [...plan.scenes, { id: nextId(plan.scenes, 'c'), text, nodeRef: nodeRef(ref), done: false }] };
}

export function addSecret(plan, text = '', ref = null) {
  if (plan.secrets.length >= PLAN_LIMITS.secrets) return plan;
  return { ...plan, secrets: [...plan.secrets, { id: nextId(plan.secrets, 'p'), text, ref: entryRef(ref), discovered: false }] };
}

export function updateItem(plan, key, id, patch) {
  return { ...plan, [key]: plan[key].map(x => (x.id === id ? { ...x, ...patch } : x)) };
}

export function removeItem(plan, key, id) {
  return { ...plan, [key]: plan[key].filter(x => x.id !== id) };
}

export function moveItem(plan, key, id, dir) {
  const list = [...plan[key]];
  const i = list.findIndex(x => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return plan;
  [list[i], list[j]] = [list[j], list[i]];
  return { ...plan, [key]: list };
}

/** Liga/desliga um id numa lista (npcIds/placeIds). */
export function toggleId(plan, key, id) {
  const n = Number(id);
  const has = plan[key].includes(n);
  if (!has && plan[key].length >= PLAN_LIMITS.ids) return plan;
  return { ...plan, [key]: has ? plan[key].filter(x => x !== n) : [...plan[key], n] };
}

/**
 * Garante ao menos `goal` linhas de pista para o checklist (linhas vazias não
 * são problema: o servidor guarda e o mestre preenche aos poucos).
 */
export function padSecrets(plan, goal = SECRET_GOAL) {
  let p = plan;
  while (p.secrets.length < goal && p.secrets.length < PLAN_LIMITS.secrets) p = addSecret(p);
  return p;
}

/**
 * Marca/desmarca uma pista como descoberta. NUNCA revela nada no Mundo: devolve
 * `ask` quando a pista está ligada a um segredo de cartão e acabou de ser
 * descoberta — o front então PERGUNTA "Revelar também no cartão?".
 */
export function toggleDiscovered(plan, id) {
  const item = plan.secrets.find(s => s.id === id);
  if (!item) return { plan, ask: null };
  const discovered = !item.discovered;
  const next = updateItem(plan, 'secrets', id, { discovered });
  const ask = discovered && item.ref?.entryId ? { secretItemId: id, entryId: item.ref.entryId, secretId: item.ref.secretId || null } : null;
  return { plan: next, ask };
}

/** Corpo do POST /world/:pk/reveal para a pergunta aceita. */
export function revealBodyFor(ask, { logDiary = true, lang = 'pt' } = {}) {
  if (!ask) return null;
  if (ask.secretId) return { secrets: { [ask.secretId]: true }, logDiary, lang };
  return { visibility: 'revealed', logDiary, lang };
}

/** Quais chaves mudaram entre dois planos (o PUT só manda essas). */
export function planDiff(prev, next) {
  const out = {};
  for (const k of PLAN_KEYS) {
    if (JSON.stringify(prev?.[k]) !== JSON.stringify(next?.[k])) out[k] = next[k];
  }
  return out;
}

const filled = (s) => typeof s === 'string' && s.trim().length > 0;

/**
 * Progresso do checklist: cada passo conta como feito quando tem conteúdo.
 * Pistas contam pelas preenchidas (meta = 10).
 */
export function planProgress(plan) {
  const secretsFilled = plan.secrets.filter(s => filled(s.text) || s.ref).length;
  const steps = [
    { id: 'strongStart', done: filled(plan.strongStart) },
    { id: 'scenes', done: plan.scenes.some(s => filled(s.text) || s.nodeRef) },
    { id: 'secrets', done: secretsFilled >= SECRET_GOAL, count: secretsFilled, goal: SECRET_GOAL },
    { id: 'places', done: plan.placeIds.length > 0 },
    { id: 'npcs', done: plan.npcIds.length > 0 },
    { id: 'monsters', done: filled(plan.monsters) },
    { id: 'rewards', done: filled(plan.rewards) },
  ];
  return { steps, done: steps.filter(s => s.done).length, total: steps.length };
}

/**
 * "Preparar a próxima": esvazia o plano, mas leva adiante as pistas que os
 * jogadores ainda NÃO descobriram (regra do Mestre Preguiçoso) e os NPCs/lugares.
 */
export function carryOver(plan) {
  const keep = plan.secrets.filter(s => !s.discovered && (filled(s.text) || s.ref))
    .map((s, i) => ({ ...s, id: `p${i + 1}` }));
  return { ...emptyPlan(), secrets: keep, npcIds: [...plan.npcIds], placeIds: [...plan.placeIds] };
}

/** Ids do plano que não existem mais no Mundo (cartão apagado). */
export function missingIds(ids, entries) {
  const known = new Set((entries || []).map(e => e.id));
  return (ids || []).filter(id => !known.has(id));
}

/** Rótulo de uma referência de sala: "Aventura › Sala". */
export function nodeRefLabel(ref, adventures) {
  if (!ref) return '';
  const adv = (adventures || []).find(a => a.id === ref.adventureId);
  if (!adv) return '';
  const node = (adv.data?.nodes || adv.nodes || []).find(n => n.id === ref.nodeId);
  return node ? `${adv.name} › ${node.name}` : adv.name;
}

/** Texto padrão de uma pista ao ligar a um segredo de cartão (só se vazia). */
export function textForRef(current, entry, secret) {
  if (filled(current)) return current;
  if (secret?.text) return secret.text.slice(0, PLAN_LIMITS.text);
  return entry?.name ? entry.name.slice(0, PLAN_LIMITS.text) : current || '';
}

/** Cartões do Mundo de um tipo, ordenados por nome (pt-BR). */
export function entriesOfKind(entries, kind) {
  return (entries || []).filter(e => e.kind === kind).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
