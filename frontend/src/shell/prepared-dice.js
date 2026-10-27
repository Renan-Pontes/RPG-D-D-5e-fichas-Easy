// Dados preparados pelo mestre ("dados viciados"): a lógica dos cartões por
// jogador (⚙ Ajustes › Ferramentas avançadas e Mais › 🎲), sem React.
//
// O servidor (api/views_dice.py) guarda as filas: cada DiceRig tem o alvo, o tipo
// de dado ('d20'… ou 'any' = qualquer dado) e os valores {value, consumed, label}.
// Quando o jogador rola pelo app dentro da campanha, o servidor usa o primeiro
// valor não usado do dado certo (ou de 'any') e marca "usado". O jogador nunca vê.
// Aqui ficam só as contas da tela: ler o campo "15, 12, 18", agrupar por jogador,
// mover/tirar um valor da fila e montar o histórico.

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
