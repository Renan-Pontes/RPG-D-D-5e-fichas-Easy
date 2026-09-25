// Tema visual: 'classico' (o original, padrão), 'light' ou 'dark'.
// Fica em <html data-theme> para que os tokens de styles.css sejam
// sobrescritos no próprio :root. O telão (/tv) não usa: sempre Clássico.
export const THEMES = ['classico', 'light', 'dark'];
const KEY = 'dnd5e-forge:theme';
const META_COLOR = { classico: '#1a1410', light: '#f6f4f0', dark: '#131211' };

export function loadTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (THEMES.includes(saved)) return saved;
  } catch { /* storage bloqueado: usa o padrão */ }
  return 'classico';
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', META_COLOR[theme] || META_COLOR.classico);
}

export function saveTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* ignora */ }
  applyTheme(theme);
}
