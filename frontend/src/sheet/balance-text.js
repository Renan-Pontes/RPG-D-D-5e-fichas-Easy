/**
 * Quebra equilibrada: divide um texto em duas metades de tamanho parecido, cortando no
 * separador mais forte que exista (" · ", " — ", " - ", ", ", depois espaço). Cada metade
 * vira um bloco que só quebra por dentro se não couber, então numa tela estreita o texto
 * sai em duas linhas parecidas e nunca no meio de "Bardo 4 (Colégio do Saber)".
 */
const SEPS = [' · ', ' — ', ' – ', ' - ', ', ', ' '];

/** → [primeira, segunda] ou [texto] quando não há onde cortar. */
export function balanceSplit(text) {
  const s = String(text || '').trim();
  for (const sep of SEPS) {
    const parts = s.split(sep);
    if (parts.length < 2) continue;
    let best = null;
    for (let k = 1; k < parts.length; k++) {
      const a = parts.slice(0, k).join(sep), b = parts.slice(k).join(sep);
      // o separador fica no fim da 1ª linha (" ·"), menos o espaço puro
      const head = sep.trim() ? `${a}${sep.trimEnd()}` : a;
      const d = Math.abs(head.length - b.length);
      if (!best || d < best.d) best = { d, out: [head, b] };
    }
    return best.out;
  }
  return [s];
}
