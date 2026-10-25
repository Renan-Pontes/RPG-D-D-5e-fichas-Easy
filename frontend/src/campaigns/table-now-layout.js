/* Jogar › Cena no desktop (≥ 1024, src/campaigns/table-now.css): 2 colunas — à esquerda
 * turno, cena, avisos e personagens; à direita pendências, ações rápidas e Nesta cena; o
 * plano embaixo, nas 2. Só layout, nada de regra.
 * Quando uma coluna fica bem mais comprida que a outra (ex.: sem combate em 1280 a direita
 * passava 300 px da esquerda, e com combate em 1024 a esquerda passava 300 px da direita),
 * Avisos e Ações rápidas trocam de coluna. Com folga, para nenhum bloco pular de coluna a
 * cada aviso que chega: só troca se a diferença passa de SWAP_LIMIT e a troca a deixa ao
 * menos SWAP_GAIN menor. */

export const SWAP_LIMIT = 200;
export const SWAP_GAIN = 100;

/**
 * main/side: altura das colunas (px); nudges/actions: altura dos blocos Avisos e Ações
 * rápidas; swapped: se já estão trocados (Ações à esquerda, Avisos à direita).
 * Devolve true quando vale trocar (ou destrocar).
 */
export function shouldSwapColumns({ main, side, nudges, actions, swapped }) {
  const diff = main - side;
  if (!(Math.abs(diff) > SWAP_LIMIT) || !(nudges > 0) || !(actions > 0)) return false;
  const leftGains = swapped ? nudges - actions : actions - nudges; // a troca muda a esquerda nisso
  const after = diff + 2 * leftGains;                               // e a direita no contrário
  return Math.abs(after) <= Math.abs(diff) - SWAP_GAIN;
}
