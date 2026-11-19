/* Aba Jogar no desktop (src/sheet/ficha.css, F14): onde as duas colunas se dividem.
 * Só layout, nada de regra. Os painéis seguem a ordem do celular (que é também a do
 * teclado e do leitor de tela): a 1ª coluna leva os k primeiros e a 2ª o resto, com k
 * escolhido para as duas terminarem perto uma da outra (a página fica mais curta).
 * As alturas são estimativas (px, coluna de ~480–600px) feitas só com o que NÃO muda no
 * meio do jogo (armas, estilos, espaços, recursos, druida, traços de classe fechados): ligar
 * uma condição, abrir uma lista ou um traço ou levar dano não muda a divisão, então nenhum
 * painel pula de coluna durante o uso. */

export const PLAY_H = {
  hp: 540,                                  // 8 medalhões, condições, PV temp, PV, exaustão, morte e a dobra de Sobrevivência
  attacks: 70, attackRow: 80, attackNote: 50, // título; uma linha por arma (+ Golpe Desarmado); cada aviso/maestria
  styles: 70, style: 60, styleExtra: 40,    // título; por estilo; sentidos e reações
  slots: 190, slotRow: 65,                  // título; por círculo com espaços
  resources: 90, resourceRow: 68,           // título e aviso; por recurso
  conditions: 160,                          // fixo: as condições ligadas não mudam a divisão
  wild: 330, starry: 180,                   // Forma Selvagem; Forma Estelar (Círculo das Estrelas)
  abilities: 420,
  rest: 115,
  progression: 300, progressionLevel: 46,   // painel Progressão: título e botões; cada nível dobrado da linha do tempo
  traitHead: 30, trait: 45,                 // traços de classe de um painel: rótulo; por traço (fechado)
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

// Desktop (duas colunas): em qual coluna vai cada painel. `panels` vem na ordem do celular
// (Vitalidade, Ataques, Atributos…), cada um { h, col? }. Quem pede coluna fica nela —
// Vitalidade e Atributos à esquerda, Ataques no topo da direita, à vista sem rolar a página;
// os demais vão, em ordem, para a coluna que estiver mais curta. Devolve ['a' | 'b', …].
// Só layout: no celular a ordem é a da lista e esta função nem é usada.
export function assignColumns(panels, gap = 16) {
  const out = panels.map(p => (p.col === 'a' || p.col === 'b' ? p.col : null));
  let a = 0;
  let b = 0;
  const add = (col, h) => { if (h > 0) { if (col === 'a') a += h + gap; else b += h + gap; } };
  panels.forEach((p, i) => { if (out[i]) add(out[i], p.h); });
  panels.forEach((p, i) => {
    if (out[i]) return;
    out[i] = a <= b ? 'a' : 'b';
    add(out[i], p.h);
  });
  return out;
}
