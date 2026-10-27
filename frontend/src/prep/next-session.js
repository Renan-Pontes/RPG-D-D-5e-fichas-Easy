/**
 * Preparar › Plano — lógica pura do Plano da Sessão N (o checklist do "Mestre Preguiçoso"
 * em 5 passos). Sem React; testável em node (tests/next-session.test.js).
 *
 * Plano (Campaign.dm_settings.sessionPlan, merge por chave no servidor; as cenas, por id):
 * { forSession, _rev, strongStart,
 *   scenes: [{id, text, nodeRef: {adventureId, nodeId}|null, done, …bolsos da cena (§3.7)}],
 *   secrets: [{id, text, ref: {entryId, secretId}|null, discovered}],
 *   npcIds: [id], placeIds: [id], monsters, rewards }
 * `_rev` é do servidor (sobe a cada PUT); `forSession` é o nº da sessão do plano.
 * Pistas vazias são só linhas na tela: nunca vão ao servidor (planDiff).
 */

export const PLAN_KEYS = ['strongStart', 'scenes', 'secrets', 'npcIds', 'placeIds', 'monsters', 'rewards', 'forSession'];
export const PLAN_LIMITS = { scenes: 30, secrets: 30, ids: 60, text: 1000, long: 4000 };
/** O ideal de pistas (os "10 segredos e pistas"); 3 já servem. */
export const SECRET_GOAL = 10;
/** Linhas de pista à vista num plano novo (só na tela). */
export const SECRET_ROWS = 3;
/** Os bolsos da cena que o app guarda e devolve como vieram (a folha da Cena os edita). */
export const SCENE_POCKETS = ['what', 'read', 'show', 'showOnStart', 'showOff', 'refs', 'fight', 'check', 'spots', 'notes'];

export function emptyPlan() {
  return { strongStart: '', scenes: [], secrets: [], npcIds: [], placeIds: [], monsters: '', rewards: '', forSession: null, _rev: 0 };
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
const posInt = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);
const pockets = (s) => Object.fromEntries(SCENE_POCKETS.filter(k => k in s).map(k => [k, s[k]]));

/** Normaliza o que vier do servidor (ou nada) para um plano completo. */
export function normalizePlan(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  return {
    strongStart: str(p.strongStart, PLAN_LIMITS.long),
    scenes: (Array.isArray(p.scenes) ? p.scenes : []).filter(s => s && typeof s === 'object').slice(0, PLAN_LIMITS.scenes)
      .map((s, i) => ({ ...pockets(s), id: s.id ? String(s.id) : `c${i + 1}`, text: str(s.text, PLAN_LIMITS.text), nodeRef: nodeRef(s.nodeRef), done: !!s.done })),
    secrets: (Array.isArray(p.secrets) ? p.secrets : []).filter(s => s && typeof s === 'object').slice(0, PLAN_LIMITS.secrets)
      .map((s, i) => ({ id: s.id ? String(s.id) : `p${i + 1}`, text: str(s.text, PLAN_LIMITS.text), ref: entryRef(s.ref), discovered: !!s.discovered })),
    npcIds: idList(p.npcIds),
    placeIds: idList(p.placeIds),
    monsters: str(p.monsters, PLAN_LIMITS.long),
    rewards: str(p.rewards, PLAN_LIMITS.long),
    forSession: posInt(p.forSession),
    _rev: Number.isInteger(p._rev) ? p._rev : 0,
  };
}

/** Id curto que não colide com os já usados na lista (c1, c2… / p1, p2…). */
export function nextId(list, prefix) {
  const used = new Set((list || []).map(x => x.id));
  let i = (list || []).length + 1;
  while (used.has(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}

/**
 * Id de cena que nunca volta: o servidor junta as cenas pelo id (o bolso que não veio
 * fica), e um momento do Raio-X aponta a cena pelo id. "c2" de novo depois de apagar a
 * c2 herdaria os bolsos e os momentos dela. `now`/`rand` só para os testes.
 */
export function freshSceneId(list, now = Date.now(), rand = Math.random) {
  const used = new Set((list || []).map(x => x.id));
  let id;
  do { id = `c${now.toString(36)}${Math.floor(rand() * 1296).toString(36).padStart(2, '0')}`; now += 1; } while (used.has(id));
  return id;
}

/**
 * Nome e notas de uma cena, no mesmo texto: a 1ª linha é o nome (o que "Usar como cena" leva
 * à Tela e ao jogador, play/plan-model.sceneFieldText) e o resto são notas que só o mestre vê
 * (o momento do "→ Cena" e a lacuna do "Levar para o plano", do Raio-X).
 */
export function sceneParts(text) {
  const [name = '', ...rest] = String(text ?? '').split('\n');
  const notes = rest.join('\n');
  return { name, notes: notes.trim() ? notes : '' };
}

/** O campo de uma linha edita só o nome; as notas ficam (um input tiraria a quebra de linha). */
export function withSceneName(text, name) {
  const { notes } = sceneParts(text);
  const clean = String(name ?? '').replace(/[\r\n]+/g, ' ');
  return (notes ? `${clean}\n${notes}` : clean).slice(0, PLAN_LIMITS.text);
}

export function addScene(plan, text = '', ref = null, id = null) {
  if (plan.scenes.length >= PLAN_LIMITS.scenes) return plan;
  return { ...plan, scenes: [...plan.scenes, { id: id || freshSceneId(plan.scenes), text, nodeRef: nodeRef(ref), done: false }] };
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

const filled = (s) => typeof s === 'string' && s.trim().length > 0;
/** Pista de verdade: com texto ou ligada a um segredo/cartão. */
export const realSecret = (s) => !!s && (filled(s.text) || !!s.ref);
/** Cena de verdade: com nome ou ligada a uma sala. */
export const realScene = (s) => !!s && (filled(s.text) || !!s.nodeRef);

/**
 * Plano "em branco": sem começo e sem cena de verdade (as pistas não contam). É quando o
 * Plano mostra as 3 portas (N2), Preparar ganha o selo "!" e a aventura pronta e o exemplo
 * preenchem o plano (world_rules.session_plan_is_empty, no servidor).
 */
export const planIsBlank = (plan) => !filled(plan?.strongStart) && !(plan?.scenes || []).some(realScene);

/**
 * As aventuras das salas ligadas às cenas que ainda vão acontecer: o Plano lê as salas
 * delas junto com o plano, para o N5 saber do combate da sala sem depender do passo ③.
 */
export function linkedAdventureIds(plan) {
  const out = [];
  for (const s of plan?.scenes || []) {
    const id = realScene(s) && !s.done ? s.nodeRef?.adventureId : null;
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Ids das cenas com combate (N5): o bolso ⚔ da cena ou o encontro da sala ligada.
 * `nodesByAdv` = {aventura: [salas]} (as que já chegaram; as outras ainda não contam).
 */
export function sceneFights(plan, nodesByAdv = {}) {
  const roomFight = (ref) => (nodesByAdv?.[ref.adventureId] || []).find(n => n.id === ref.nodeId)?.encounter?.length > 0;
  return (plan?.scenes || []).filter(s => (s.fight || []).length > 0 || (s.nodeRef && roomFight(s.nodeRef))).map(s => s.id);
}

/**
 * Linhas de pista para escrever: completa até `rows` linhas na TELA (as vazias nunca
 * são gravadas: planDiff as ignora). Já completo → o mesmo objeto.
 */
export function padSecrets(plan, rows = SECRET_ROWS) {
  let p = plan;
  while (p.secrets.length < rows && p.secrets.length < PLAN_LIMITS.secrets) p = addSecret(p);
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

/**
 * Quais chaves mudaram entre dois planos (o PUT só manda essas). As pistas vazias não
 * contam e não vão: abrir o Plano e sair não grava nada (o defeito que impedia a aventura
 * pronta de preencher o plano).
 */
export function planDiff(prev, next) {
  const out = {};
  for (const k of PLAN_KEYS) {
    const a = k === 'secrets' ? (prev?.secrets || []).filter(realSecret) : prev?.[k];
    const b = k === 'secrets' ? (next?.secrets || []).filter(realSecret) : next?.[k];
    if (b === undefined || (k === 'forSession' && !b)) continue;   // o nº da sessão nunca volta a "nenhum"
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) out[k] = b;
  }
  return out;
}

/**
 * "Começar o plano da Sessão N": esvazia o plano, mas leva adiante as pistas que os
 * jogadores ainda NÃO descobriram (regra do Mestre Preguiçoso) e os NPCs/lugares.
 */
export function carryOver(plan, forSession = null) {
  const keep = plan.secrets.filter(s => !s.discovered && realSecret(s))
    .map((s, i) => ({ ...s, id: `p${i + 1}` }));
  return { ...emptyPlan(), _rev: plan._rev || 0, forSession: forSession || null, secrets: keep, npcIds: [...plan.npcIds], placeIds: [...plan.placeIds] };
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

// ---------------------------------------------------------------- de qual sessão é o plano

const tt = (lang, pt, en) => (lang === 'en' ? en : pt);

/**
 * Nº da sessão atual, a mesma regra do servidor (diary.current_session: os dígitos de
 * state.session); sem número, null.
 */
export function stateSession(state) {
  const raw = state?.session;
  if (Number.isInteger(raw)) return raw > 0 ? raw : null;
  const m = /\d+/.exec(String(raw ?? ''));
  return m && +m[0] > 0 ? +m[0] : null;
}

/**
 * O título do Plano e a linha que tira a dúvida "é hoje ou a próxima?" (§3.2):
 *  - ao vivo: "Plano de hoje · Sessão 4 (ao vivo)" + "O plano da Sessão 5 começa quando você encerrar esta.";
 *  - fora: "Plano da Sessão N" (N = forSession ou a próxima); se o plano é de uma sessão que
 *    já foi jogada, a linha diz e aponta o ⋯ (Começar o plano da próxima).
 * `n` é a sessão do plano; `next` é a do "▶ Começar"/"Começar o plano da Sessão N".
 */
export function planHeading(plan, state, lang = 'pt') {
  const cur = stateSession(state);
  const live = !!state?.live;
  const fs = plan?.forSession || null;
  if (live && cur && (!fs || fs <= cur)) {
    return {
      n: cur, live: true, stale: false, next: cur + 1,
      title: tt(lang, `Plano de hoje · Sessão ${cur} (ao vivo)`, `Today's plan · Session ${cur} (live)`),
      line: tt(lang, `Isto é o que está na mesa agora. O plano da Sessão ${cur + 1} começa quando você encerrar esta.`,
        `This is what's on the table now. The session ${cur + 1} plan starts when you end this one.`),
    };
  }
  const next = (cur || 0) + 1;
  if (live && cur) {
    return { n: fs, live: false, stale: false, next: fs,
      title: tt(lang, `Plano da Sessão ${fs}`, `Session ${fs} plan`),
      line: tt(lang, `A Sessão ${cur} está ao vivo; este plano é o da próxima.`, `Session ${cur} is live; this is the next one's plan.`) };
  }
  if (fs && fs < next) {
    return { n: fs, live: false, stale: true, next,
      title: tt(lang, `Plano da Sessão ${fs}`, `Session ${fs} plan`),
      line: tt(lang, `A Sessão ${fs} já foi jogada. Marque o que aconteceu ou, no ⋯, comece o plano da Sessão ${next}.`,
        `Session ${fs} has been played. Tick what happened or, in the ⋯, start the session ${next} plan.`) };
  }
  const n = fs || next;
  return { n, live: false, stale: false, next: n, title: tt(lang, `Plano da Sessão ${n}`, `Session ${n} plan`), line: '' };
}

// ---------------------------------------------------------------- a sanfona de 5 passos

export const PLAN_STEPS = [
  { id: 'party',   n: '①', pt: 'Quem joga',                  en: "Who's playing" },
  { id: 'start',   n: '②', pt: 'Como começa',                en: 'How it starts' },
  { id: 'scenes',  n: '③', pt: 'Cenas',                      en: 'Scenes' },
  { id: 'clues',   n: '④', pt: 'Pistas',                     en: 'Clues' },
  { id: 'rewards', n: '⑤', pt: 'Recompensas e anotações',    en: 'Rewards and notes' },
];
const SHORT_STEP = { rewards: ['Recompensas', 'Rewards'] };
export const stepLabel = (id, lang, short = false) => {
  const s = PLAN_STEPS.find(x => x.id === id);
  if (!s) return id;
  if (short && SHORT_STEP[id]) return tt(lang, ...SHORT_STEP[id]);
  return tt(lang, s.pt, s.en);
};

const quote = (s, max = 26) => {
  const one = String(s || '').replace(/\s+/g, ' ').trim();
  return one.length > max ? `“${one.slice(0, max).trimEnd()}…”` : `“${one}”`;
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Quantas pistas e quantas achadas (as vazias não contam). */
export function clueCount(plan) {
  const list = (plan?.secrets || []).filter(realSecret);
  return { total: list.length, found: list.filter(s => s.discovered).length };
}

/**
 * O resumo de 1 linha de cada passo fechado ("4 com ficha · 3 momentos", "“O sino toca…”",
 * "3 cenas · 1 jogada", "8 · 2 achadas", "vazio"). `party` = jogadores da mesa
 * ([{character}]), `moments` = momentos ligados às cenas deste plano (null = sem o Raio-X).
 */
export function stepSummary(id, plan, { party = [], moments = null, lang = 'pt' } = {}) {
  if (id === 'party') {
    if (!party.length) return tt(lang, 'ninguém na mesa ainda', 'nobody at the table yet');
    const sheets = party.filter(m => m.character).length;
    const head = sheets === party.length
      ? tt(lang, `${sheets} com ficha`, `${sheets} with a sheet`)
      : tt(lang, `${sheets} de ${party.length} com ficha`, `${sheets} of ${party.length} with a sheet`);
    return moments == null ? head : `${head} · ${tt(lang, plural(moments, 'momento', 'momentos'), plural(moments, 'moment', 'moments'))}`;
  }
  if (id === 'start') return filled(plan.strongStart) ? quote(plan.strongStart) : tt(lang, 'vazio', 'empty');
  if (id === 'scenes') {
    const list = plan.scenes.filter(realScene);
    if (!list.length) return tt(lang, 'nenhuma', 'none');
    const done = list.filter(s => s.done).length;
    const head = tt(lang, plural(list.length, 'cena', 'cenas'), plural(list.length, 'scene', 'scenes'));
    return done ? `${head} · ${tt(lang, plural(done, 'jogada', 'jogadas'), `${done} played`)}` : head;
  }
  if (id === 'clues') {
    const c = clueCount(plan);
    if (!c.total) return tt(lang, 'nenhuma', 'none');
    return tt(lang, `${c.total} · ${plural(c.found, 'achada', 'achadas')}`, `${c.total} · ${c.found} found`);
  }
  if (id === 'rewards') {
    if (filled(plan.rewards)) return quote(plan.rewards);
    return filled(plan.monsters) ? tt(lang, 'só anotações de monstros', 'monster notes only') : tt(lang, 'vazio', 'empty');
  }
  return '';
}

/**
 * Que passo abre sozinho ao entrar: o do cartão "O que fazer agora" (N3 → Como começa,
 * N4 → Cenas, N6 → Pistas). Nos outros casos nenhum: o plano vazio mostra as 3 portas e o
 * cheio mostra o índice dos 5 passos, cada um com o resumo de 1 linha (cabe numa tela).
 */
export function initialStep(plan, ruleId) {
  const byRule = { N3: 'start', N4: 'scenes', N6: 'clues' };
  return byRule[ruleId] || null;
}

/** O passo depois deste ("Próximo passo: Pistas →"); o último não tem. */
export function nextStepId(id) {
  const i = PLAN_STEPS.findIndex(s => s.id === id);
  return i >= 0 && i < PLAN_STEPS.length - 1 ? PLAN_STEPS[i + 1].id : null;
}

/**
 * "Pronto para jogar" (fim da sanfona, só leitura): o que já está de pé para a sessão.
 * [{id, ok, text}] — `tv` = a Tela já foi aberta numa TV. `withImage` = cenas com imagem
 * contadas por quem sabe das salas (a imagem da cena ligada mora na sala); sem ele, o
 * bolso 📺 de cada cena.
 */
export function readyChecklist(plan, { party = [], tv = false, lang = 'pt', withImage: imgCount = null } = {}) {
  const scenes = plan.scenes.filter(realScene);
  const withImage = Number.isInteger(imgCount) ? imgCount : scenes.filter(s => s.show).length;
  const sheets = party.filter(m => m.character).length;
  const clues = clueCount(plan).total;
  return [
    { id: 'scenes', ok: scenes.length > 0, text: scenes.length
      ? tt(lang, `${plural(scenes.length, 'cena', 'cenas')}${withImage ? `, ${withImage} com imagem` : ''}`, `${plural(scenes.length, 'scene', 'scenes')}${withImage ? `, ${withImage} with an image` : ''}`)
      : tt(lang, 'nenhuma cena ainda', 'no scenes yet') },
    { id: 'party', ok: party.length > 0 && sheets === party.length, text: party.length
      ? tt(lang, `${sheets} de ${party.length} jogadores com ficha`, `${sheets} of ${party.length} players with a sheet`)
      : tt(lang, 'nenhum jogador na mesa', 'no players at the table') },
    { id: 'clues', ok: clues > 0, text: clues ? tt(lang, plural(clues, 'pista', 'pistas'), plural(clues, 'clue', 'clues')) : tt(lang, 'nenhuma pista', 'no clues') },
    { id: 'tv', ok: !!tv, text: tv ? tt(lang, 'Tela testada', 'Screen tested') : tt(lang, 'Tela ainda não testada', 'Screen not tested yet') },
  ];
}

/** O plano em JSON para baixar (⋯ › Exportar o plano): sem o `_rev` do servidor. */
export function planExport(plan, { campaign = '', heading = null } = {}) {
  const { _rev, ...rest } = plan || {};
  return JSON.stringify({ kind: 'forja-session-plan', v: 1, campaign, session: heading?.n ?? rest.forSession ?? null, plan: { ...rest, secrets: (rest.secrets || []).filter(realSecret) } }, null, 2);
}
