// Jogar › Agora (V7, especificação §4.4) — lógica pura da mesa ao vivo, sem React.
// Testada em tests/play-model.test.js.
//
// - A "cena agora": a cena do plano em `state.sceneId` (▶ Começar esta cena grava o id;
//   só o mestre o lê). Servidor antigo ou campanha de antes da V7 (sem o id): a cena do
//   plano cujo nome é o `state.scene` de agora.
// - As cenas do plano em chips (✓ feita · ▶ agora · ○ falta), a próxima e a posição.
// - O painel do momento (altura fixa): os contadores (testes, pedidos de rolagem,
//   aprovações, perigos) e o que vai no corpo — com a regra anti-surpresa: o que chega só
//   muda o NÚMERO; o corpo só troca por toque do mestre ou quando o item dele acaba.
// - O selo de Testes só desta sessão (criados depois de diarySessions[n].startedAt) e os
//   de sessões passadas à parte ("De sessões passadas").
// - O relógio da sessão ("1h05", calculado no aparelho, 0 byte no servidor).
import { realScene, sceneParts } from '../prep/next-session.js';
import { summarize } from '../checks/check-logic.js';

const tt = (lang, pt, en) => (lang === 'en' ? en : pt);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** O nome da cena (a 1ª linha do texto; o resto são anotações do mestre). */
export const sceneName = (scene) => sceneParts(scene?.text).name.trim();

/** As cenas de verdade do plano, na ordem dele. */
export const realScenes = (plan) => (plan?.scenes || []).filter(realScene);

/**
 * A cena agora: pelo id gravado (`sceneId`) ou, sem ele, pelo nome em `state.scene`.
 * `names` = {sceneId: nome} das cenas ligadas sem texto (o nome da sala). → cena | null
 */
export function currentScene(plan, { sceneId = null, scene = '' } = {}, names = {}) {
  const list = realScenes(plan);
  if (sceneId) {
    const hit = list.find(s => s.id === sceneId);
    if (hit) return hit;
  }
  const want = norm(scene);
  if (!want) return null;
  return list.find(s => norm(sceneName(s) || names[s.id]) === want) || null;
}

/** "2 de 4": a posição entre as cenas de verdade. */
export function scenePosition(plan, id) {
  const list = realScenes(plan);
  const i = list.findIndex(s => s.id === id);
  return { pos: i + 1, total: list.length };
}

/** A 1ª cena que ainda não foi feita (J4, "Comece pela primeira cena"). */
export const firstOpenScene = (plan) => realScenes(plan).find(s => !s.done) || null;

/**
 * A próxima cena depois da `id`: a 1ª não feita que vem depois dela no plano; se não houver,
 * a 1ª não feita antes dela. Nunca a própria. → cena | null
 */
export function nextSceneAfter(plan, id) {
  const list = realScenes(plan);
  const i = list.findIndex(s => s.id === id);
  const open = (s) => s.id !== id && !s.done;
  return list.slice(i + 1).find(open) || list.slice(0, Math.max(0, i)).find(open) || null;
}

/** Os chips de "Cenas do plano": [{id, name, status: 'done'|'now'|'open', icon}]. */
export function planChips(plan, nowId, names = {}) {
  return realScenes(plan).map(s => {
    const status = s.id === nowId ? 'now' : s.done ? 'done' : 'open';
    return { id: s.id, name: sceneName(s) || names[s.id] || '?', status, icon: { now: '▶', done: '✓', open: '○' }[status] };
  });
}

// ---------------------------------------------------------------- testes desta sessão

const at = (x) => Date.parse(x?.createdAt || x?.created_at || '') || 0;

/**
 * O que está esperando, só desta sessão (criado a partir de `since`, o startedAt da sessão
 * atual) e o que ficou de sessões passadas. Sem `since` (nenhuma sessão começou), tudo é
 * "desta sessão" (é o que há).
 * → {checks: abertos desta sessão, rolls: pedidos de rolagem desta sessão, old: {checks, rolls}}
 */
export function sessionTests({ checks = [], pendingRolls = [], since = null } = {}) {
  const t0 = Date.parse(since || '') || 0;
  const mine = (x) => !t0 || at(x) >= t0;
  const open = (checks || []).filter(c => c && c.status === 'open');
  const rolls = (pendingRolls || []).filter(Boolean);
  return {
    checks: open.filter(mine),
    rolls: rolls.filter(mine),
    old: { checks: open.filter(x => !mine(x)), rolls: rolls.filter(x => !mine(x)) },
  };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** O selo de Testes: "1·2" na sub-aba; o texto inteiro ("1 teste · 2 rolagens") ao lado. */
export function testsBadge(counts, lang = 'pt') {
  const c = counts?.checks ?? 0;
  const r = counts?.rolls ?? 0;
  return {
    short: c || r ? `${c}·${r}` : '',
    long: tt(lang, `${plural(c, 'teste', 'testes')} · ${plural(r, 'rolagem', 'rolagens')}`,
      `${plural(c, 'check', 'checks')} · ${plural(r, 'roll', 'rolls')}`),
  };
}

// ---------------------------------------------------------------- o painel do momento

/**
 * Os contadores do cabeçalho (sempre na mesma linha): [{id, n, icon, label}] só dos que
 * têm algo; vazio = "Nada esperando ✓".
 *   checks: testes abertos desta sessão · rolls: pedidos de rolagem · approvals: pedidos de
 *   aprovação (subida de nível, item…) · dangers: avisos de perigo
 * `levelups` = quantos dos pedidos de aprovação são de nível (o rótulo diz "nível" quando todos são).
 */
export function momentCounters({ checks = 0, rolls = 0, approvals = 0, levelups = null, dangers = 0 } = {}, lang = 'pt') {
  const out = [];
  if (checks) out.push({ id: 'checks', n: checks, icon: '🎯', label: tt(lang, checks === 1 ? 'teste' : 'testes', checks === 1 ? 'check' : 'checks') });
  if (rolls) out.push({ id: 'rolls', n: rolls, icon: '🎲', label: tt(lang, rolls === 1 ? 'pedido' : 'pedidos', rolls === 1 ? 'request' : 'requests') });
  if (approvals) {
    const level = levelups != null && levelups === approvals;
    out.push({ id: 'approvals', n: approvals, icon: '⬆',
      label: level ? tt(lang, approvals === 1 ? 'nível' : 'níveis', approvals === 1 ? 'level-up' : 'level-ups')
        : tt(lang, approvals === 1 ? 'aprovação' : 'aprovações', approvals === 1 ? 'approval' : 'approvals') });
  }
  if (dangers) out.push({ id: 'dangers', n: dangers, icon: '⚠', label: tt(lang, dangers === 1 ? 'perigo' : 'perigos', dangers === 1 ? 'danger' : 'dangers') });
  return out;
}

/**
 * O que vai no corpo do painel. `pick` = o que está no corpo agora ({kind, id?}: o último
 * toque do mestre, o teste que ele acabou de pedir ou a escolha de antes) e continua lá
 * enquanto existir (regra anti-surpresa: um teste novo, um pedido novo ou um perigo novo só
 * mudam o NÚMERO do cabeçalho; a lista curta também fica). Sem escolha (a 1ª vez, com os
 * dados já chegados) ou quando o item dela acabou (teste encerrado, perigo resolvido): o
 * teste aberto mais novo; sem teste, o 1º perigo; sem nada, a lista curta.
 *   checks  testes abertos desta sessão (com createdAt) · dangers  avisos de perigo [{id}]
 *   rolls / approvals  quantos pedidos esperam
 * → {kind: 'check'|'danger'|'rolls'|'approvals'|'list', id?}
 */
export function momentBody(pick, { checks = [], dangers = [], rolls = 0, approvals = 0 } = {}) {
  const alive = (p) => {
    if (p.kind === 'check') return checks.some(c => c.id === p.id);
    if (p.kind === 'danger') return dangers.some(d => d.id === p.id);
    if (p.kind === 'rolls') return rolls > 0;
    if (p.kind === 'approvals') return approvals > 0;
    return p.kind === 'list';
  };
  if (pick && alive(pick)) return { kind: pick.kind, ...(pick.id != null ? { id: pick.id } : {}) };
  const newest = [...checks].sort((a, b) => at(b) - at(a))[0];
  if (newest) return { kind: 'check', id: newest.id };
  if (dangers[0]) return { kind: 'danger', id: dangers[0].id };
  return { kind: 'list' };
}

/** O toque num contador: o corpo passa a mostrar aquele item (o mais novo daquele tipo). */
export function pickCounter(id, { checks = [], dangers = [] } = {}) {
  if (id === 'checks') {
    const newest = [...checks].sort((a, b) => at(b) - at(a))[0];
    return newest ? { kind: 'check', id: newest.id } : { kind: 'list' };
  }
  if (id === 'dangers') return dangers[0] ? { kind: 'danger', id: dangers[0].id } : { kind: 'list' };
  if (id === 'rolls' || id === 'approvals') return { kind: id };
  return { kind: 'list' };
}

/**
 * A linha do teste no painel e no cartão: "Percepção CD 13 · 3 de 4" e as respostas
 * ("Elarion 16 ✓ · Dagna 14 ✓ · Kaelor 7 ✗ · Pipo…"). CD secreta: o mestre vê ✓/✗ igual.
 * → {head, answers: [{name, text, outcome}]}
 */
export function checkLine(check, lang = 'pt') {
  if (!check) return null;
  const s = summarize(check);
  const dc = check.dc != null ? ` ${tt(lang, 'CD', 'DC')} ${check.dc}${check.dcHidden ? ' 🔒' : ''}` : '';
  const head = `${check.label || ''}${dc} · ${tt(lang, `${s.answered} de ${s.total}`, `${s.answered} of ${s.total}`)}`;
  const answers = (check.targets || []).map(t => {
    const name = String(t.characterName || t.displayName || '?').split(/\s+/)[0];
    if (!t.response) return { name, text: `${name}…`, outcome: 'waiting' };
    const mark = t.outcome === 'pass' ? ' ✓' : t.outcome === 'fail' ? ' ✗' : '';
    return { name, text: `${name} ${t.response.total}${mark}`, outcome: t.outcome || 'answered' };
  });
  return { head, answers };
}

// ---------------------------------------------------------------- relógio da sessão

/** "1h05" de um intervalo em ms (nunca negativo). */
export function clockText(ms) {
  const min = Math.max(0, Math.floor((Number(ms) || 0) / 60000));
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

/** O relógio da sessão ao vivo desde o startedAt (null sem a hora de começo). */
export function sessionClock(startedAt, now = Date.now()) {
  const t0 = Date.parse(startedAt || '');
  return Number.isFinite(t0) ? clockText(now - t0) : null;
}

/** A duração de uma sessão encerrada ("2h10"); sem o endedAt (servidor antigo), null. */
export function sessionLength(startedAt, endedAt) {
  const a = Date.parse(startedAt || '');
  const b = Date.parse(endedAt || '');
  return Number.isFinite(a) && Number.isFinite(b) && b >= a ? clockText(b - a) : null;
}

// ---------------------------------------------------------------- dados do estado

/** Nº da sessão do estado ("Sessão 3" → 3), ou null. */
export function stateSessionNumber(state) {
  const m = /\d+/.exec(String(state?.session ?? ''));
  return m && +m[0] > 0 ? +m[0] : null;
}

/** Os dados da sessão atual do diário: {startedAt, endedAt, shown}. */
export function sessionMeta(state) {
  const n = stateSessionNumber(state);
  const meta = n ? state?.diarySessions?.[String(n)] : null;
  return meta && typeof meta === 'object' ? meta : {};
}

/** O "Anteriormente em…" já foi à Tela nesta sessão? (o `shown` que o palco grava) */
export const recapShown = (state) => (sessionMeta(state).shown || []).some(x => x?.k === 'recap');

// ---------------------------------------------------------------- ensaio e "começar por"

const rehearseKey = (id) => `forja:rehearse:${id}`;
const startKey = (id) => `forja:start-scene:${id}`;
const store = (s) => s || (typeof localStorage !== 'undefined' ? localStorage : null);
function read(key, storage) { try { return store(storage)?.getItem(key) || null; } catch { return null; } }
function write(key, v, storage) { try { if (v) store(storage)?.setItem(key, String(v)); else store(storage)?.removeItem(key); } catch { /* ok */ } }

/** A cena em ensaio (sessão parada): só no aparelho, nada vai ao servidor. */
export const readRehearsal = (campaignId, storage) => read(rehearseKey(campaignId), storage);
export const writeRehearsal = (campaignId, sceneId, storage) => write(rehearseKey(campaignId), sceneId, storage);
/** A cena escolhida na folha Começar quando o "Anteriormente em…" vai antes (J4 começa por ela). */
export const readStartScene = (campaignId, storage) => read(startKey(campaignId), storage);
export const writeStartScene = (campaignId, sceneId, storage) => write(startKey(campaignId), sceneId, storage);

// ---------------------------------------------------------------- a folha Começar a sessão

/**
 * As opções de "Onde começa?" (§4.3): a 1ª cena não jogada (marcada), continuar de onde
 * parou (se havia uma cena), outra (nome livre) e "ainda não sei".
 * → [{id: 'scene'|'continue'|'other'|'unsure', sceneId?, label, sub?}]
 */
export function startChoices(plan, state, lang = 'pt') {
  const out = [];
  const first = firstOpenScene(plan);
  if (first) out.push({ id: 'scene', sceneId: first.id, label: sceneName(first) || '?', sub: tt(lang, '1ª cena não jogada', '1st scene not played') });
  const last = String(state?.scene || '').trim();
  if (last) {
    const same = state?.sceneId && state.sceneId === first?.id;
    if (!same) out.push({ id: 'continue', sceneId: state?.sceneId || null, label: tt(lang, `Continuar de onde paramos: ${last}`, `Pick up where we left off: ${last}`) });
  }
  out.push({ id: 'other', label: tt(lang, 'Outra…', 'Other…') });
  out.push({ id: 'unsure', label: tt(lang, 'Ainda não sei', 'Not sure yet') });
  return out;
}
