// Rótulo do token no grid (mestre e telão): curto o bastante para não
// encostar no vizinho. Sem React/canvas; testado em tests/token-label.test.js.

/**
 * Largura livre para o rótulo de cada token: a distância horizontal até o
 * vizinho mais próximo na mesma "linha" de rótulos (|dy| pequeno), nunca
 * menos que o próprio token. Devolve um Map id → largura.
 */
export function labelWidths(tokens, { rowTolerance = 28, gap = 6 } = {}) {
  const out = new Map();
  for (const a of tokens || []) {
    let free = Infinity;
    for (const b of tokens || []) {
      if (a === b) continue;
      if (Math.abs((b.y ?? 0) - (a.y ?? 0)) > rowTolerance) continue;
      free = Math.min(free, Math.abs((b.x ?? 0) - (a.x ?? 0)) - gap);
    }
    const min = a.size || 40;
    out.set(a.id, Math.max(min, Number.isFinite(free) ? free : min * 3));
  }
  return out;
}

/**
 * Encurta o nome para caber em `maxWidth` (px), usando `measure(text)`:
 *   "Goblin Guerreiro #2" → "Goblin #2" → "Gobl… #2".
 * O número (#2) fica sempre, para o mestre saber qual é qual.
 */
export function tokenLabel(name, maxWidth, measure) {
  const full = String(name || '').trim();
  if (!full) return '';
  const fits = (s) => measure(s) <= maxWidth;
  if (fits(full)) return full;
  const m = full.match(/^(.*?)(\s*#\d+)$/);
  const base = (m ? m[1] : full).trim();
  const suffix = m ? m[2].trim() : '';
  const join = (b) => (suffix ? `${b} ${suffix}` : b);
  const first = base.split(/\s+/)[0];
  if (first !== base && fits(join(first))) return join(first);
  // até 2 letras do nome ainda dizem algo ("Go… #2"); com 1 só ("G… #1G… #2", ilegível com
  // três tokens encostados) vale mais o código curto, sem reticências: "G1", "G2", "Lo"
  for (let n = first.length - 1; n >= 2; n--) {
    const s = join(`${first.slice(0, n)}…`);
    if (fits(s)) return s;
  }
  return tokenCode(full);
}

/**
 * O código curto de um token: a inicial + o número ("Goblin Guerreiro #2" → "G2"); sem
 * número, as 2 primeiras letras ("Lobo" → "Lo"). Cabe sob qualquer token e não encosta no
 * vizinho; o nome inteiro continua na plaquinha do token selecionado.
 */
export function tokenCode(name) {
  const full = String(name || '').trim();
  if (!full) return '';
  const m = full.match(/^(.*?)\s*#(\d+)$/);
  const base = (m ? m[1] : full).trim();
  const first = base.split(/\s+/)[0] || '';
  if (m) return `${first.charAt(0).toUpperCase()}${m[2]}`;
  return first.length <= 2 ? first : `${first.charAt(0).toUpperCase()}${first.charAt(1)}`;
}

// Onda 3 (E2.4): na TV o canvas (1200×800) é reduzido pelo CSS até caber; com o rótulo de
// 12 px do mapa, o nome chegava a ~8 px na tela. O rótulo da TV mede em px DE TELA: 15 px
// (≥ 14 numa TV 1280×720), com a linha e o espaço entre vizinhos também em px de tela.
export const TV_LABEL_PX = 15;

/**
 * Os tamanhos do rótulo da TV em unidades do mapa, para a escala `scale` (px de tela por
 * unidade do mapa, o `contain` do canvas): {font, rowTolerance, gap}.
 */
export function tvLabelSize(scale) {
  const k = scale > 0 && Number.isFinite(scale) ? scale : 1;
  return { font: TV_LABEL_PX / k, rowTolerance: (TV_LABEL_PX + 6) / k, gap: 8 / k };
}
