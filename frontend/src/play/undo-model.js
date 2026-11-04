// O ↶ que não some (onda 3, E1.4), sem React: o "↶ Voltar turno" fica à mão enquanto há
// turno anterior e a ÚLTIMA ação de PV/condição tem "↶ Desfazer" até a próxima ação — numa
// linha fixa do Combate, não num aviso de 6 s. Tudo sai do registro curto que o combate do
// mestre já traz (nenhum pedido novo): o servidor marca `undo: true` na entrada que o
// POST …/undo ainda sabe desfazer (a foto fica só no servidor). Servidor de antes (sem a
// marca): nada a oferecer aqui — o aviso de 6 s de antes continua.
// Testado em tests/undo-model.test.js.
import { conditionLabel } from '../combat/monster-i18n.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const TURN = new Set(['start', 'next_turn', 'prev_turn', 'end']);
// o que não é "uma ação" do mestre: os marcadores de turno, o próprio ↶ e o que o servidor
// escreve sozinho (efeito que venceu, recarga, a entrada do combate rápido)
const NOT_ACTION = new Set([...TURN, 'undo', 'effects_expired', 'recharge', 'encounter', 'add_combatant']);

/**
 * Dá para voltar o turno? O servidor desta versão diz (`canPrev`, a mesma conferência do
 * prev-turn, no registro inteiro). Servidor de antes: o último Próximo turno que não foi
 * desfeito precisa ter deixado a vez onde ela está agora (é a foto dele que o ↶ restaura);
 * antes dele, o começo do combate: não há turno anterior. Registro curto sem nenhum Próximo
 * à vista: o servidor decide — vale quando a vez não é a 1ª da rodada 1.
 */
export function canPrevTurn(combat) {
  if (!combat?.active) return false;
  if (typeof combat.canPrev === 'boolean') return combat.canPrev;
  const log = Array.isArray(combat.log) ? combat.log : [];
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (!e || typeof e !== 'object') continue;
    if (e.type === 'next_turn' && !e.undone) return e.round === combat.round && e.index === combat.turnIndex;
    if (e.type === 'start') return false;
  }
  return (combat.round ?? 1) > 1 || (combat.turnIndex ?? 0) > 0;
}

/** Quem tinha a vez antes (o ↶ volta para ele): o anterior na ordem. */
export function prevTurnName(combat) {
  const list = combat?.combatants || [];
  if (!combat?.active || !list.length) return '';
  const i = ((combat.turnIndex ?? 0) - 1 + list.length) % list.length;
  return list[i]?.name || '';
}

/** "Goblin #2 −7" · "Dagna +5" · "Kaelor +5 temp" · "Pipo: + envenenado" · "Goblin → Dagna". */
export function undoText(entries, lang = 'pt') {
  const list = (entries || []).filter(Boolean);
  if (!list.length) return '';
  const one = (e) => {
    switch (e.type) {
      case 'damage': return `${e.target} −${e.amount ?? 0}`;
      case 'heal': return `${e.target} +${e.healed ?? 0}`;
      case 'temp_hp': return `${e.target} +${e.temp ?? 0} ${L(lang, 'temp', 'temp')}`;
      case 'add_condition': return `${e.target}: + ${conditionLabel(e.condition, lang)}`;
      case 'remove_condition': return `${e.target}: − ${conditionLabel(e.condition, lang)}`;
      case 'attack': return `${e.attacker} → ${e.target}${e.hit && e.damage_taken ? ` −${e.damage_taken}` : ''}`;
      case 'save_aoe': return `${e.attacker}${e.action_name ? ` (${e.action_name})` : ''}`;
      default: return e.target || e.attacker || L(lang, 'a última ação', 'the last action');
    }
  };
  if (list.length === 1) return one(list[0]);
  // "Vários alvos" (uma chamada, uma entrada por alvo, o mesmo opId)
  const sign = list[0].type === 'damage' ? '−' : list[0].type === 'heal' ? '+' : '';
  return L(lang, `${list.length} alvos${sign ? ` (${sign})` : ''}`, `${list.length} targets${sign ? ` (${sign})` : ''}`);
}

/**
 * A última ação de PV/condição, se o ↶ ainda sabe desfazê-la: a entrada mais nova que é
 * uma ação (pula os marcadores de turno, o próprio ↶ e o que já foi desfeito). Se ela não
 * tem a marca `undo` (sem opId, de um servidor de antes, ou mexeram depois), nada — o ↶ é
 * sempre da ÚLTIMA ação, nunca de uma lá de trás.
 * → {opId, text, entries} | null
 */
export function lastUndo(combat, lang = 'pt') {
  const log = Array.isArray(combat?.log) ? combat.log : [];
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (!e || typeof e !== 'object' || NOT_ACTION.has(e.type) || e.undone) continue;
    if (!e.undo || !e.opId) return null;
    const entries = log.filter(x => x && x.opId === e.opId && x.undo);
    return { opId: e.opId, text: undoText(entries, lang), entries };
  }
  return null;
}

/**
 * As linhas do Registro recente (as 8 mais novas, a mais nova em cima), cada uma com o
 * opId quando o servidor ainda sabe desfazê-la (o ↶ da linha). As entradas do mesmo opId
 * ("Vários alvos") levam o ↶ só na primeira linha que aparece.
 * `line(e)` = o texto da entrada (monster-actions.logLine); '' some.
 * → [{text, opId|null}]
 */
export function logRows(combat, line, max = 8) {
  const log = Array.isArray(combat?.log) ? combat.log : [];
  const rows = log.map(e => ({ e, text: line(e) })).filter(r => r.text).slice(-max).reverse();
  const seen = new Set();
  return rows.map(({ e, text }) => {
    const can = !!(e && e.undo && e.opId && !seen.has(e.opId));
    if (can) seen.add(e.opId);
    return { text, opId: can ? e.opId : null };
  });
}
