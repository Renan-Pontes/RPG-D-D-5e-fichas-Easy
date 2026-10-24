/* Aba Jogar no desktop (src/sheet/ficha.css, F14): onde as duas colunas se dividem.
 * Só layout, nada de regra. Os painéis seguem a ordem do celular (que é também a do
 * teclado e do leitor de tela): a 1ª coluna leva os k primeiros e a 2ª o resto, com k
 * escolhido para as duas terminarem perto uma da outra (a página fica mais curta).
 * As alturas são estimativas (px, coluna de ~480–600px) feitas só com o que NÃO muda no
 * meio do jogo (armas, estilos, espaços, recursos, druida): ligar uma condição, abrir uma
 * lista ou levar dano não muda a divisão, então nenhum painel pula de coluna durante o uso. */

export const PLAY_H = {
  hp: 450,                                  // PV, PV temp e os 6 medalhões
  attacks: 70, attackRow: 80, attackNote: 50, // título; uma linha por arma (+ Golpe Desarmado); cada aviso/maestria
  styles: 70, style: 60, styleExtra: 40,    // título; por estilo; sentidos e reações
  slots: 70, slotRow: 65,                   // título; por círculo com espaços
  resources: 90, resourceRow: 68,           // título e aviso; por recurso
  conditions: 160,                          // fixo: as condições ligadas não mudam a divisão
  wild: 330, starry: 180,                   // Forma Selvagem; Forma Estelar (Círculo das Estrelas)
  abilities: 210,
  rest: 115,
};

// heights: altura estimada de cada painel, na ordem da página (0 = painel que não aparece).
// Devolve quantos painéis vão para a 1ª coluna (de 1 a n−1; com menos de 2, todos).
export function splitColumns(heights, gap = 16) {
  const h = heights.map(x => (x > 0 ? x + gap : 0));
  const n = h.length;
  if (n < 2) return n;
  const total = h.reduce((s, x) => s + x, 0);
  let best = 1;
  let bestMax = Infinity;
  let left = 0;
  for (let k = 1; k < n; k++) {
    left += h[k - 1];
    const tallest = Math.max(left, total - left);
    if (tallest < bestMax) { bestMax = tallest; best = k; }
  }
  return best;
}
