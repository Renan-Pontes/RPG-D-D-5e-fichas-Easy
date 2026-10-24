// Cores dos dados e o tom de crítico/falha (lógica pura, testável em node).
//
// O dado SEMPRE rola com a cor do tipo dele (PALETTE): o tom de crítico (dourado)
// ou de falha (vermelho) só chega depois que ele para — senão a cor entrega o
// resultado antes da hora. A revelação é uma transição curta (TONE_REVEAL_MS) do
// normal para o tom; com movimento reduzido, troca direto.

export const PALETTE = {
  d4:   { body: '#6b5a30', ink: '#f3e6cb', edge: '#edcb7a' },
  d6:   { body: '#2d2319', ink: '#edcb7a', edge: '#d6b064' },
  d8:   { body: '#262d52', ink: '#f3e6cb', edge: '#9fb0f0' },
  d10:  { body: '#34401f', ink: '#f3e6cb', edge: '#9cc065' },
  d100: { body: '#34401f', ink: '#edcb7a', edge: '#9cc065' },
  d12:  { body: '#5a3d12', ink: '#f3e6cb', edge: '#e3a445' },
  d20:  { body: '#5c1a10', ink: '#f3e6cb', edge: '#e0604f' },
};
export const TONES = {
  crit:   { body: '#a8894a', ink: '#1a120a', edge: '#edcb7a', glow: '#6b5a30' },
  fumble: { body: '#3a0f09', ink: '#e0604f', edge: '#e0604f', glow: '#5c1a10' },
};
/** Duração da passagem para o tom, depois que o dado para. */
export const TONE_REVEAL_MS = 380;
/** Brilho (emissive) do tom já revelado. */
export const TONE_GLOW = 0.6;

const hex2 = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
const rgb = (hex) => {
  const h = String(hex || '#000000').replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) || 0);
};

/** Mistura linear de duas cores '#rrggbb' (t = 0 → a, t = 1 → b). */
export function mixHex(a, b, t) {
  const k = Math.max(0, Math.min(1, +t || 0));
  const [ra, ga, ba] = rgb(a);
  const [rb, gb, bb] = rgb(b);
  return `#${hex2(ra + (rb - ra) * k)}${hex2(ga + (gb - ga) * k)}${hex2(ba + (bb - ba) * k)}`;
}

/**
 * Cores de um dado durante a revelação: t = 0 é a cor normal do tipo, t = 1 é o
 * tom ('crit' | 'fumble'). Sem tom (ou dado esmaecido, descartado), fica no normal.
 * → { body, ink, edge, glow, glowIntensity }
 */
export function dieColors(kind, tone = null, t = 1, { dimmed = false } = {}) {
  const base = PALETTE[kind] || PALETTE.d20;
  const to = !dimmed && TONES[tone];
  if (!to) return { ...base, glow: '#000000', glowIntensity: 0 };
  const k = Math.max(0, Math.min(1, +t || 0));
  return {
    body: mixHex(base.body, to.body, k),
    ink: mixHex(base.ink, to.ink, k),
    edge: mixHex(base.edge, to.edge, k),
    glow: to.glow,
    glowIntensity: TONE_GLOW * k,
  };
}

/** Tom a mostrar no palco: nenhum enquanto o dado rola; o pedido depois que ele para. */
export const stageTone = (tone, settled) => (settled && TONES[tone] ? tone : null);
