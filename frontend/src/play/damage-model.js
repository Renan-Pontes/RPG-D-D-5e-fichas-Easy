// Teclado de dano do combate (V8, especificação §4.6) — lógica pura, sem React.
// Testada em tests/damage-model.test.js.
//
// - padPress: as teclas do teclado próprio (0–9, ½, ⌫): nenhum <input>, o teclado
//   do sistema nunca abre. Até 4 algarismos (9999, o teto do servidor).
// - O tipo de dano vem do ÚLTIMO usado naquele alvo; os 3 últimos viram chips
//   (lembrados no aparelho, por campanha).
// - "Vários alvos" (bola de fogo): cada alvo marcado com "½ passou" leva a metade
//   (arredonda para baixo, 5e).
// - O aviso depois de aplicar: "Goblin #1 −7 (0/10, derrotado)".
// - Marcas de vez da lista: ✓ agiu · ▶ agora · † caiu, do turnIndex sobre a lista
//   já ordenada por iniciativa (nenhum dado novo).
// - A lista só rola até quem age se ele estiver fora da vista, e nunca nos 600 ms
//   depois de um toque (princípio 8: nada mexe debaixo do dedo).

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export const PAD_MAX_DIGITS = 4;
export const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'half', '0', 'back'];
export const DEFAULT_TYPES = ['slashing', 'piercing', 'bludgeoning'];
export const TOUCH_QUIET_MS = 600;

/** Texto do visor depois de uma tecla. `half` divide o número (para baixo). */
export function padPress(text, key) {
  const cur = String(text || '').replace(/\D/g, '');
  if (key === 'back') return cur.slice(0, -1);
  if (key === 'clear') return '';
  if (key === 'half') {
    const n = parseInt(cur, 10);
    return Number.isFinite(n) && n > 0 ? String(Math.floor(n / 2)) : cur;
  }
  if (!/^\d$/.test(String(key))) return cur;
  const next = (cur === '0' ? '' : cur) + key;
  return next.length > PAD_MAX_DIGITS ? cur : next;
}

/** O número do visor (0 quando vazio). */
export function padValue(text) {
  const n = parseInt(String(text || ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ------------------------------------------------------------------ tipos de dano
export const typeMemoryKey = (campaignId) => `forja:dmg-types:${campaignId}`;

/** Lembra o tipo usado no alvo: {byTarget: {id: [tipo…]}, recent: [tipo…]} (até 3 cada). */
export function rememberType(memory, targetId, type, max = 3) {
  if (!type) return memory || { byTarget: {}, recent: [] };
  const m = memory && typeof memory === 'object' ? memory : {};
  const push = (list) => [type, ...(Array.isArray(list) ? list : []).filter(x => x !== type)].slice(0, max);
  const byTarget = { ...(m.byTarget || {}) };
  if (targetId != null) byTarget[targetId] = push(byTarget[targetId]);
  // não guarda alvos para sempre: os 40 mais recentes bastam
  const ids = Object.keys(byTarget);
  if (ids.length > 40) for (const id of ids.slice(0, ids.length - 40)) delete byTarget[id];
  return { byTarget, recent: push(m.recent) };
}

/**
 * O tipo inicial e os 3 chips do alvo: os últimos daquele alvo, depois os últimos da
 * mesa, depois os de sempre (cortante, perfurante, contundente). `fallback`: o tipo
 * do ataque principal do monstro, quando ninguém usou nada nele ainda.
 */
export function typeChips(memory, targetId, fallback = null) {
  const m = memory && typeof memory === 'object' ? memory : {};
  const mine = (m.byTarget && targetId != null && m.byTarget[targetId]) || [];
  const order = [...mine, ...(fallback ? [fallback] : []), ...(m.recent || []), ...DEFAULT_TYPES];
  const chips = [...new Set(order.filter(Boolean))].slice(0, 3);
  return { type: chips[0], chips };
}

export function readTypeMemory(campaignId, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(typeMemoryKey(campaignId));
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? v : { byTarget: {}, recent: [] };
  } catch { return { byTarget: {}, recent: [] }; }
}

export function writeTypeMemory(campaignId, memory, storage = globalThis.localStorage) {
  try { storage?.setItem(typeMemoryKey(campaignId), JSON.stringify(memory)); } catch { /* modo privado */ }
}

// ------------------------------------------------------------------ vários alvos
/**
 * Os alvos marcados → corpo do hp_many: [{id, amount}]. `marks`: {id: {half: bool}}.
 * Na ordem da lista do combate (`order`, ids), para o aviso sair na ordem da mesa.
 */
export function multiTargets(marks, amount, order = null) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  const ids = Object.keys(marks || {}).filter(id => marks[id]);
  const sorted = Array.isArray(order) ? [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b)) : ids;
  return sorted.map(id => ({ id, amount: marks[id]?.half ? Math.floor(n / 2) : n }));
}

/** Liga/desliga o alvo e o "½ passou" dele (o 1º toque marca; "½" alterna a metade). */
export function toggleMark(marks, id, { half = false } = {}) {
  const m = { ...(marks || {}) };
  if (half) {
    m[id] = { half: !(m[id]?.half) };
    return m;
  }
  if (m[id]) delete m[id];
  else m[id] = { half: false };
  return m;
}

// ------------------------------------------------------------------ avisos
const hpText = (c) => `${c?.current_hp ?? '?'}/${c?.stats?.max_hp ?? '?'}`;

/**
 * O aviso depois de aplicar (com ↶ Desfazer ao lado):
 *   dano  "Goblin #1 −7 (0/10, derrotado)"   cura "Dagna +5 (8/10)"   temp "Dagna +5 temp (5 temp)"
 * `after`: o combatente como o servidor devolveu. `taken`: o dano depois das
 * resistências (o servidor diz), senão o número digitado.
 */
export function hpFlash({ op, name, amount, taken, after }, lang = 'pt') {
  const who = name || after?.name || '—';
  if (op === 'heal') return `${who} +${amount} (${hpText(after)})`;
  if (op === 'temp') return `${who} +${amount} ${L(lang, 'temp', 'temp')} (${after?.temp_hp ?? amount} ${L(lang, 'temp', 'temp')})`;
  const n = typeof taken === 'number' ? taken : amount;
  const down = after?.defeated ? L(lang, ', derrotado', ', defeated')
    : after?.type === 'pc' && (after?.current_hp ?? 1) <= 0 ? L(lang, ', caído', ', down') : '';
  return `${who} −${n} (${hpText(after)}${down})`;
}

/** Vários alvos: "Bola de fogo · Goblin #1 −8 · Goblin #2 −4 (½)" curto, para o aviso. */
export function manyFlash(results, marks, lang = 'pt') {
  const parts = (results || []).map(r => `${r.name} −${r.damage_taken ?? r.amount ?? 0}${marks?.[r.id]?.half ? ' (½)' : ''}`);
  return `${L(lang, 'Vários alvos', 'Several targets')}: ${parts.join(' · ')}`;
}

// ------------------------------------------------------------------ opId
/** O id de uma ação (o servidor guarda e não aplica 2×; o ↶ Desfazer usa o mesmo). */
export function newOpId(rand = Math.random) {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch { /* contexto sem crypto */ }
  const hex = () => Math.floor(rand() * 0x100000000).toString(16).padStart(8, '0');
  return `${hex()}-${hex()}-${hex()}`;
}

// ------------------------------------------------------------------ marcas de vez
const isDown = (c) => !!c?.defeated || (typeof c?.current_hp === 'number' && c.current_hp <= 0);

/**
 * Marca de cada linha: 'now' (▶ agora) · 'acted' (✓ agiu, esmaecida) · 'down' († caiu) ·
 * null (falta agir). Só com o combate andando.
 */
export function turnMarks(combat) {
  const list = Array.isArray(combat?.combatants) ? combat.combatants : [];
  const out = {};
  if (!combat?.active) return out;
  const idx = Number.isInteger(combat.turnIndex) ? combat.turnIndex : 0;
  list.forEach((c, i) => {
    out[c.id] = i === idx ? 'now' : isDown(c) ? 'down' : i < idx ? 'acted' : null;
  });
  return out;
}

export function markLabel(mark, lang = 'pt') {
  if (mark === 'now') return L(lang, '▶ agora', '▶ now');
  if (mark === 'acted') return L(lang, '✓ agiu', '✓ acted');
  if (mark === 'down') return L(lang, '† caiu', '† down');
  return '';
}

/**
 * A lista rola até quem age? Só se a linha estiver fora da vista (`rect` do
 * getBoundingClientRect, `top`/`bottom` da área livre entre o que é preso em cima e
 * a barra da mesa embaixo) e não houve toque nos últimos 600 ms.
 */
export function shouldScrollTo(rect, { top = 0, bottom = Infinity, lastTouchAt = 0, now = Date.now() } = {}) {
  if (!rect) return false;
  if (now - lastTouchAt < TOUCH_QUIET_MS) return false;
  return rect.top < top || rect.bottom > bottom;
}
