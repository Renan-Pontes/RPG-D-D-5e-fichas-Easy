// Onde nasce um token novo no grid de combate: na próxima célula livre (antes
// todos os monstros nasciam em (100,100) e empilhavam). Lógica pura, testada em
// tests/combat-placement.test.js. O mestre continua arrastando para onde quiser.

const DEFAULT_W = 1200;
const DEFAULT_H = 800;

const spanOf = (scale) => Math.max(1, Math.ceil(Number(scale) || 1));

/** Células ocupadas ("col,row") pelos combatentes atuais. */
export function occupiedCells(combatants = [], grid = 50) {
  const taken = new Set();
  for (const c of combatants || []) {
    const x = Number(c?.position?.x), y = Number(c?.position?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const half = (grid * (Number(c.token_scale ?? c.tokenScale) || 1)) / 2;
    const c0 = Math.floor((x - half) / grid), c1 = Math.floor((x + half - 1) / grid);
    const r0 = Math.floor((y - half) / grid), r1 = Math.floor((y + half - 1) / grid);
    for (let col = c0; col <= Math.max(c0, c1); col++) {
      for (let row = r0; row <= Math.max(r0, r1); row++) taken.add(`${col},${row}`);
    }
  }
  return taken;
}

/**
 * `count` posições livres (centro do token), varrendo linha a linha a partir de
 * `start` ({x,y} em px). Se o mapa encher, volta a empilhar no início.
 */
export function freePositions(combatants, count = 1, { grid = 50, width = DEFAULT_W, height = DEFAULT_H, start = { x: 100, y: 100 }, scale = 1 } = {}) {
  const g = Number(grid) > 0 ? Number(grid) : 50;
  const cols = Math.max(1, Math.floor((width || DEFAULT_W) / g));
  const rows = Math.max(1, Math.floor((height || DEFAULT_H) / g));
  const span = spanOf(scale);
  const taken = occupiedCells(combatants, g);
  const startCol = Math.min(cols - span, Math.max(0, Math.floor(start.x / g)));
  const startRow = Math.min(rows - span, Math.max(0, Math.floor(start.y / g)));
  const fits = (col, row) => {
    for (let dc = 0; dc < span; dc++) for (let dr = 0; dr < span; dr++) if (taken.has(`${col + dc},${row + dr}`)) return false;
    return true;
  };
  const out = [];
  const total = rows * cols;
  for (let k = 0; k < total && out.length < count; k++) {
    const idx = (startRow * cols + startCol + k) % total;
    const row = Math.floor(idx / cols), col = idx % cols;
    if (col + span > cols || row + span > rows || !fits(col, row)) continue;
    for (let dc = 0; dc < span; dc++) for (let dr = 0; dr < span; dr++) taken.add(`${col + dc},${row + dr}`);
    out.push({ x: col * g + (span * g) / 2, y: row * g + (span * g) / 2 });
  }
  while (out.length < count) out.push({ x: start.x, y: start.y });
  return out;
}

/**
 * Encaixe na grade ao soltar o token: o centro vai para o meio da casa (token
 * de 1 ou 3 casas) ou para o cruzamento das linhas (2 ou 4 casas), sem sair do
 * mapa. Antes o centro arredondava para a linha e somava meia casa: o token
 * caía uma casa ao lado de onde o dedo/mouse soltou.
 */
export function snapToGrid(v, grid = 50, scale = 1, limit = Infinity) {
  const g = Number(grid) > 0 ? Number(grid) : 50;
  const span = spanOf(scale);
  const off = span % 2 ? g / 2 : 0;
  const half = (span * g) / 2;
  const lo = half, hi = Number.isFinite(limit) ? Math.max(half, limit - half) : Infinity;
  const raw = Math.min(hi, Math.max(lo, Number(v) || 0));
  let s = Math.round((raw - off) / g) * g + off;
  if (s > hi) s -= g;
  if (s < lo) s += g;
  return s;
}
