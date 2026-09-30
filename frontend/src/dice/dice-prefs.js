// Preferências por aparelho (conveniência local; nunca estado importante).
const KEY_ANIM = 'forja.dice.anim';
const KEY_HISTORY = 'forja.dice.history';
const KEY_RECENT = 'forja.dice.recentFormulas';

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function write(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo privado etc. */ }
}

/** '3d' (padrão) | '2d' | 'off' */
export const getAnimPref = () => {
  const v = read(KEY_ANIM, '3d');
  return ['3d', '2d', 'off'].includes(v) ? v : '3d';
};
export const setAnimPref = (v) => write(KEY_ANIM, v);

export const loadHistory = () => {
  const v = read(KEY_HISTORY, []);
  return Array.isArray(v) ? v.slice(0, 30) : [];
};
export const saveHistory = (list) => write(KEY_HISTORY, (list || []).slice(0, 30));

export const loadRecentFormulas = () => {
  const v = read(KEY_RECENT, []);
  return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 6) : [];
};
export const saveRecentFormulas = (list) => write(KEY_RECENT, (list || []).slice(0, 6));

export function prefersReducedMotion() {
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
