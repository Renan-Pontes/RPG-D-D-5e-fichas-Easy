// Rolagens da FICHA na Tela (V15, decisão D-1 do dono: SIM).
//
// A ficha rola no aparelho, na hora, como sempre (crítico/falha, histórico e
// vantagem do DiceRoller; os dados preparados do mestre NÃO valem aqui). Depois,
// sem bloquear nada, o resultado já rolado vai para a fila de rolagens da Tela da
// V10 — a mesma linha do servidor, a mesma janela da TV pelo relógio dele:
//   POST /api/characters/:id/table-roll {label, dice:[{die, value, kept?, sign?}], modifier, total, adv?}
//   · 201 {shown} → foi à Tela ("📺 Na Tela ✓");
//   · 204 → sem sessão ao vivo ou o mestre desligou "Rolagens das fichas": nada;
//   · erro de rede, 429 ou 5xx → não insiste; no máximo o aviso discreto
//     "não foi para a Tela" (no tempo limite, sem aviso: pode ter chegado, e a Tela
//     nunca mente);
//   · 403/423 (a ficha não é mais desta mesa, campanha encerrada) → para de mandar.
//
// Quem diz que a ficha está numa campanha é o Sheet.jsx (`setSheetRolls`): o
// rolador (components/DiceRoller.jsx) é um só para o app e não sabe de ficha. O
// "🔒 Só eu" do jogador fica lembrado POR PERSONAGEM no aparelho
// (`forja:sheet-roll-secret:<id>`) e rolagem secreta nunca sai do aparelho.
// Um envio de cada vez, na ordem dos toques: 1,2 s depois da saída do anterior e
// 1 s depois da resposta dele (o servidor aceita 1 por segundo por usuário, em média,
// contado pela hora em que o pedido CHEGA; esperar a resposta garante a folga mesmo
// quando a rede atrasa um e não o outro). Ataque e dano tocados em seguida vão os
// dois; o que esperou demais (a Tela já passou dele) fica só no aparelho.
// Lógica pura aqui (sem React); testada em tests/sheet-roll.test.js.

export const GAP_MS = 1200;
export const RESP_GAP_MS = 1000;
export const STALE_MS = 6000;
export const MAX_WAITING = 3;
export const MAX_DICE = 20;
export const MAX_MOD = 50;
export const MAX_LABEL = 120;
const SIDES = [4, 6, 8, 10, 12, 20, 100];

const local = () => (typeof localStorage !== 'undefined' ? localStorage : null);
export const secretKey = (characterId) => `forja:sheet-roll-secret:${characterId}`;

export function readSecret(characterId, storage = local()) {
  try { return storage?.getItem(secretKey(characterId)) === '1'; } catch { return false; }
}
export function writeSecret(characterId, on, storage = local()) {
  try {
    if (on) storage?.setItem(secretKey(characterId), '1');
    else storage?.removeItem(secretKey(characterId));
  } catch { /* sem armazenamento: vale até fechar a ficha */ }
}

// ---------------------------------------------------------------- a ficha aberta
// {characterId, name, secret, allowed (a regra do mestre, se a ficha já soube), blocked}
let current = null;
const subs = new Set();
function emit(next) {
  current = next;
  subs.forEach(fn => { try { fn(current); } catch { /* ok */ } });
}

/** A ficha de um personagem em campanha abriu (Sheet.jsx). */
export function setSheetRolls({ characterId, name = '' } = {}, storage = local()) {
  if (characterId == null) { emit(null); return; }
  if (current && current.characterId === characterId && current.name === name) return;
  emit({ characterId, name, secret: readSecret(characterId, storage), allowed: current?.characterId === characterId ? current.allowed : null, blocked: false });
}
/** A ficha fechou (só limpa se ainda é ela). */
export function clearSheetRolls(characterId) {
  if (current && current.characterId === characterId) emit(null);
}
export const getSheetRolls = () => current;
export function subscribeSheetRolls(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
/** 🔒 Só eu (true) · 📺 Na Tela (false), lembrado para este personagem. */
export function setSheetSecret(on, storage = local()) {
  if (!current) return;
  writeSecret(current.characterId, !!on, storage);
  emit({ ...current, secret: !!on });
}
/** O que a ficha sabe da regra do mestre (GET /characters/:id/campaigns → sheetRolls). */
export function setSheetAllowed(characterId, allowed) {
  if (!current || current.characterId !== characterId || current.allowed === allowed) return;
  emit({ ...current, allowed });
}
function block(characterId) {
  if (current && current.characterId === characterId && !current.blocked) emit({ ...current, blocked: true });
}

// ---------------------------------------------------------------- o que vai
const cleanLabel = (s) => String(s || '').split(/\s+/).filter(Boolean).join(' ').slice(0, MAX_LABEL);

/**
 * O corpo do POST a partir do resultado que o rolador acabou de mostrar
 * ({label, formula, groups:[{die, sign, rolls:[{value, kept}]}], mod, total, adv}).
 * null quando o servidor não aceitaria (mais de 20 dados, dado fora da lista, bônus
 * acima de 50, total que não fecha): a rolagem fica só no aparelho, como sempre.
 */
export function sheetRollBody(entry) {
  if (!entry || !Array.isArray(entry.groups)) return null;
  const dice = [];
  for (const g of entry.groups) {
    const sides = Number(g?.die);
    if (!SIDES.includes(sides)) return null;
    for (const r of g.rolls || []) {
      const value = Number(r && typeof r === 'object' ? r.value : r);
      if (!Number.isInteger(value) || value < 1 || value > sides) return null;
      const d = { die: `d${sides}`, value };
      if (r && typeof r === 'object' && r.kept === false) d.kept = false;
      if (g.sign < 0) d.sign = -1;
      dice.push(d);
    }
  }
  if (!dice.length || dice.length > MAX_DICE) return null;
  const modifier = Number(entry.mod || 0);
  if (!Number.isInteger(modifier) || Math.abs(modifier) > MAX_MOD) return null;
  const total = dice.filter(d => d.kept !== false).reduce((s, d) => s + d.value * (d.sign || 1), modifier);
  if (total !== entry.total) return null;
  const body = { label: cleanLabel(entry.label || entry.formula), dice, modifier, total };
  if ((entry.adv === 'adv' || entry.adv === 'dis') && dice.some(d => d.kept === false)) body.adv = entry.adv;
  return body;
}

/**
 * Manda ou não? → {body} ou {skip}: 'none' (a ficha não está numa campanha),
 * 'secret' (🔒 Só eu: nada sai do aparelho), 'blocked' (403/423 antes) e 'local'
 * (o servidor não aceitaria; fica só no aparelho).
 */
export function planSheetRoll(ctx, entry) {
  if (!ctx || ctx.characterId == null) return { skip: 'none' };
  if (ctx.secret) return { skip: 'secret' };
  if (ctx.blocked) return { skip: 'blocked' };
  const body = sheetRollBody(entry);
  return body ? { body } : { skip: 'local' };
}

/** A resposta (ou o erro) do POST → 'shown' | 'skipped' | 'blocked' | 'failed' | 'unknown'. */
export function outcomeOf(res, err) {
  if (err) {
    const s = err.status;
    if (s === 403 || s === 404 || s === 423) return 'blocked';
    // tempo limite: o servidor pode ter gravado e a TV mostrado — não dá para dizer que não foi
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return 'unknown';
    return 'failed';
  }
  return res && res.shown ? 'shown' : 'skipped';
}

/** O aviso que vai junto do resultado no rolador (null = nada a dizer). */
export function noteFor(outcome) {
  return { shown: 'sheet-shown', failed: 'sheet-failed', busy: 'sheet-failed', secret: 'sheet-secret' }[outcome] || null;
}

const deviceOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * O envio, fora do caminho da ficha: um POST de cada vez, na ordem, GAP_MS depois da
 * saída do anterior e RESP_GAP_MS depois da resposta dele; não guarda mais de
 * MAX_WAITING na fila (o resto → 'busy', fica só no aparelho), não manda o que
 * esperou mais de STALE_MS (servidor lento: → 'failed') e nunca tenta de novo.
 * `post(characterId, body)` devolve a resposta do servidor (null no 204).
 */
export function createSender({
  post, now = () => Date.now(), wait = (ms) => new Promise(r => setTimeout(r, ms)),
  gapMs = GAP_MS, respGapMs = RESP_GAP_MS, staleMs = STALE_MS, maxWaiting = MAX_WAITING, offline = deviceOffline,
} = {}) {
  let turn = Promise.resolve();   // a vez de cada envio
  let sentAt = -Infinity;
  let doneAt = -Infinity;
  let waiting = 0;
  return function send(characterId, body) {
    if (offline()) return Promise.resolve('failed');
    if (waiting >= maxWaiting) return Promise.resolve('busy');
    waiting += 1;
    const calledAt = now();
    const run = turn.then(async () => {
      const t = now();
      const at = Math.max(t, sentAt + gapMs, doneAt + respGapMs);
      if (at > t) await wait(at - t);
      if (now() - calledAt > staleMs) return 'failed';           // a Tela já passou desta
      if (current && current.characterId === characterId && current.blocked) return 'blocked';
      sentAt = now();
      let outcome;
      try { outcome = outcomeOf(await post(characterId, body)); } catch (err) { outcome = outcomeOf(null, err); }
      doneAt = now();
      if (outcome === 'blocked') block(characterId);
      if (outcome === 'shown') setSheetAllowed(characterId, true);
      return outcome;
    }).finally(() => { waiting -= 1; });
    turn = run.catch(() => {});
    return run;
  };
}
