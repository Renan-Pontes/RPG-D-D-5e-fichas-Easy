// Dados preparados pelo mestre ("dados viciados"): a lógica dos cartões por
// jogador (⚙ Ajustes › Ferramentas avançadas e Mais › 🎲), sem React.
//
// O servidor (api/views_dice.py) guarda as filas: cada DiceRig tem o alvo, o tipo
// de dado ('d20'… ou 'any' = qualquer dado) e os valores {value, consumed, label}.
// Quando o jogador rola pelo app dentro da campanha, o servidor percorre as filas
// dele do dado certo e de 'any' pela ordem de criação e usa o primeiro valor não
// usado (marca "usado"). O jogador nunca vê.
// Aqui ficam só as contas da tela: ler o campo "15, 12, 18", agrupar por jogador,
// onde enfileirar (uma fila por dado), o ⚡ Próximo resultado, mover/tirar um valor
// da fila e montar o histórico.

export const DICE_TYPES = ['d20', 'd12', 'd10', 'd8', 'd6', 'd4', 'd100', 'any'];
/** Faces de cada dado; 'any' (qualquer dado) aceita até 100, como o "próximo resultado". */
export const DICE_FACES = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100, any: 100 };
/** O servidor recusa mais de 50 valores numa fila (too_many_values). */
export const MAX_VALUES = 50;
/** Linhas do histórico mostradas (o GET do log já vem limitado pelo servidor). */
export const HISTORY_MAX = 50;

const tt = (lang, pt, en) => (lang === 'en' ? en : pt);

/** Nome do dado para a tela ("d20"; 'any' → "Qualquer dado"). */
export function diceLabel(type, lang) {
  return type === 'any' ? tt(lang, 'Qualquer dado', 'Any die') : String(type || 'd20');
}

/**
 * Lê o campo "Valores": números separados por vírgula, ponto e vírgula, ponto ou
 * espaço (o teclado numérico do celular só tem a vírgula ou o ponto).
 * → { values: [{value}], bad: ['30', 'x'] } — `bad` = o que não é um inteiro de
 * 1 até as faces do dado (o motivo é escrito na tela; nada vai ao servidor).
 */
export function parseValues(text, diceType = 'd20') {
  const faces = DICE_FACES[diceType] || 100;
  const values = [];
  const bad = [];
  for (const part of String(text || '').split(/[,;.\s]+/).filter(Boolean)) {
    const n = /^[+]?\d+$/.test(part) ? parseInt(part, 10) : NaN;
    if (Number.isFinite(n) && n >= 1 && n <= faces) values.push({ value: n });
    else bad.push(part);
  }
  return { values, bad };
}

/** Texto do erro do campo "Valores" (ou '' quando está tudo certo). */
export function valuesError({ values, bad }, diceType, lang) {
  const faces = DICE_FACES[diceType] || 100;
  const die = diceType === 'any' ? tt(lang, 'qualquer dado', 'any die') : diceType;
  if (bad.length) {
    return tt(lang,
      `"${bad.slice(0, 3).join(', ')}" não serve: use números de 1 a ${faces} (${die}).`,
      `"${bad.slice(0, 3).join(', ')}" won't work: use numbers from 1 to ${faces} (${die}).`);
  }
  if (!values.length) return tt(lang, 'Digite pelo menos um número.', 'Type at least one number.');
  if (values.length > MAX_VALUES) return tt(lang, `No máximo ${MAX_VALUES} valores por vez.`, `At most ${MAX_VALUES} values at a time.`);
  return '';
}

/** Id do jogador alvo de uma fila (o serializer manda targetUser e targetUserId). */
export function rigUserId(rig) {
  return rig?.targetUser?.id ?? rig?.targetUserId ?? null;
}

/** Só os jogadores (o mestre não tem fila). */
export function playersOf(members) {
  return (members || []).filter(m => m && m.role !== 'dm' && m.user);
}

/** { [userId]: [rig…] } na ordem em que o servidor mandou. */
export function rigsByUser(rigs) {
  const out = {};
  for (const r of rigs || []) {
    const uid = rigUserId(r);
    if (uid == null) continue;
    (out[uid] = out[uid] || []).push(r);
  }
  return out;
}

/** Quantos valores ainda não usados há nas filas. */
export function pendingCount(rigs) {
  return (rigs || []).reduce((n, r) => n + (r.values || []).filter(v => !v.consumed).length, 0);
}

/** ↑ só para um valor não usado que não é o primeiro e não passa por cima de um usado. */
export function canMoveUp(values, i) {
  return i > 0 && i < (values || []).length && !values[i].consumed && !values[i - 1].consumed;
}

/** ↓ só para um valor não usado que não é o último. */
export function canMoveDown(values, i) {
  return i >= 0 && i < (values || []).length - 1 && !values[i].consumed && !values[i + 1].consumed;
}

/** A fila com o valor `from` levado para `to` (cópia) ou null quando o movimento não vale. */
export function moveValue(values, from, to) {
  if (!Array.isArray(values)) return null;
  const ok = (to === from - 1 && canMoveUp(values, from)) || (to === from + 1 && canMoveDown(values, from));
  if (!ok) return null;
  const v = [...values];
  const [item] = v.splice(from, 1);
  v.splice(to, 0, item);
  return v;
}

const dieOf = (rig) => rig?.diceType || 'd20';
const fresh = (value) => ({ value, consumed: false, label: null });

/**
 * A fila do jogador como aparece no cartão: as filas na ordem do servidor (a de
 * criação, a mesma em que os valores saem) em blocos por dado — um bloco novo cada
 * vez que o dado muda, com o nome do dado escrito em cima. É o motivo à vista de um
 * valor não passar para o bloco vizinho: são filas de dados diferentes.
 * → [{ die, rows: [{ key, rigId, i, entry }] }]
 */
export function queueBlocks(rigs) {
  const blocks = [];
  for (const rig of rigs || []) {
    (rig.values || []).forEach((entry, i) => {
      let b = blocks[blocks.length - 1];
      if (!b || b.die !== dieOf(rig)) { b = { die: dieOf(rig), rows: [] }; blocks.push(b); }
      b.rows.push({ key: `${rig.id}-${i}`, rigId: rig.id, i, entry });
    });
  }
  return blocks;
}

/**
 * ↑ (dir −1) ou ↓ (dir +1) de um valor: as gravações a fazer, ou null quando não dá
 * (é o primeiro/último do bloco, o vizinho já foi usado ou é de outro dado).
 * Na mesma fila: 1 PUT. Entre duas filas vizinhas do mesmo dado (as antigas criavam
 * uma fila a cada "Adicionar"): os dois valores trocam de lugar, 2 PUTs.
 * → [{ id, values }]
 */
export function planMove(rigs, rigId, i, dir) {
  if (dir !== 1 && dir !== -1) return null;
  const rows = [];
  for (const rig of rigs || []) (rig.values || []).forEach((entry, k) => rows.push({ rig, k, entry }));
  const at = rows.findIndex(r => r.rig.id === rigId && r.k === i);
  const a = rows[at];
  const b = at < 0 ? null : rows[at + dir];
  if (!a || !b || a.entry.consumed || b.entry.consumed || dieOf(a.rig) !== dieOf(b.rig)) return null;
  if (a.rig === b.rig) {
    const v = moveValue(a.rig.values, i, i + dir);
    return v ? [{ id: a.rig.id, values: v }] : null;
  }
  const va = [...a.rig.values];
  const vb = [...b.rig.values];
  va[a.k] = b.entry;
  vb[b.k] = a.entry;
  return [{ id: a.rig.id, values: va }, { id: b.rig.id, values: vb }];
}

/**
 * ➕ Adicionar à fila: no fim da fila que o jogador já tem desse dado (1 PUT; uma
 * fila por jogador e dado) ou numa fila nova (1 POST) quando não há ou ela encheria.
 * → { update: { id, values } } | { create: { diceType, values } }
 */
export function planEnqueue(rigs, die, values) {
  const same = (rigs || []).filter(r => dieOf(r) === die);
  const last = same[same.length - 1];
  const add = (values || []).map(v => fresh(v.value));
  if (last && (last.values || []).length + add.length <= MAX_VALUES) {
    return { update: { id: last.id, values: [...(last.values || []), ...add] } };
  }
  return { create: { diceType: die, values: (values || []).map(v => ({ value: v.value })) } };
}

/**
 * ⚡ Próximo resultado: o valor sai na próxima rolagem do jogador, de qualquer dado.
 * Precisa ficar numa fila 'any' antes de todo valor ainda não usado:
 * - nada na fila: no fim da fila 'any' que já existe (ou numa nova);
 * - a 1ª fila com valor não usado é 'any': entra antes desse valor;
 * - a fila logo antes dela é 'any' (toda usada): entra no fim dela;
 * - senão, uma fila 'any' nova com `before` = essa 1ª fila (o servidor a põe antes;
 *   o antigo ignora e ela entra no fim — a tela avisa).
 * → { update: { id, values } } | { create: { diceType: 'any', values }, before? }
 */
export function planNext(rigs, value) {
  const list = rigs || [];
  const room = (r) => (r.values || []).length < MAX_VALUES;
  const f = list.findIndex(r => (r.values || []).some(v => !v.consumed));
  if (f < 0) {
    const anyRig = [...list].reverse().find(r => dieOf(r) === 'any' && room(r));
    if (anyRig) return { update: { id: anyRig.id, values: [...(anyRig.values || []), fresh(value)] } };
    return { create: { diceType: 'any', values: [{ value }] } };
  }
  const first = list[f];
  if (dieOf(first) === 'any' && room(first)) {
    const v = [...first.values];
    v.splice(v.findIndex(x => !x.consumed), 0, fresh(value));
    return { update: { id: first.id, values: v } };
  }
  const prev = list[f - 1];
  if (prev && dieOf(prev) === 'any' && room(prev)) return { update: { id: prev.id, values: [...(prev.values || []), fresh(value)] } };
  return { create: { diceType: 'any', values: [{ value }] }, before: first.id };
}

/** Tira o valor `i` da fila: { values, empty } — empty = a fila ficou vazia (apagar a fila inteira). */
export function removeValueAt(values, i) {
  const v = (values || []).filter((_, k) => k !== i);
  return { values: v, empty: v.length === 0 };
}

/**
 * Linhas do histórico (as mais novas primeiro, como o servidor manda), com o nome
 * de quem rolou. `rigged` = o valor saiu da fila do mestre (★).
 */
export function historyRows(log, members, max = HISTORY_MAX) {
  const byId = new Map((members || []).filter(m => m?.user).map(m => [m.user.id, m.user.displayName]));
  return (log || []).slice(0, max).map(r => ({
    id: r.id,
    result: r.result,
    dice: r.dice_type,
    who: byId.get(r.user_id) || `#${r.user_id}`,
    label: r.label || '',
    rigged: !!r.rigged,
    at: r.created_at,
  }));
}

/** "N na fila" / "fila vazia" do cabeçalho do cartão. */
export function queueSummary(n, lang) {
  if (!n) return tt(lang, 'fila vazia', 'empty queue');
  return tt(lang, `${n} na fila`, `${n} queued`);
}
