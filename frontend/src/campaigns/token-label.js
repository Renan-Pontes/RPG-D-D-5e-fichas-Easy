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
  for (let n = first.length - 1; n >= 1; n--) {
    const s = join(`${first.slice(0, n)}…`);
    if (fits(s)) return s;
  }
  return suffix || `${first.charAt(0)}…`;
}
