// Tema visual: 'taverna' (escuro, padrão) ou 'grimorio' (papel e tinta).
// Fica em <html data-theme> para que os tokens de styles.css sejam
// sobrescritos no próprio :root. O telão (/tv) não usa: sempre escuro.
export const THEMES = ['taverna', 'grimorio'];
const KEY = 'dnd5e-forge:theme';
const META_COLOR = { taverna: '#1a1410', grimorio: '#f3e8c8' };

export function loadTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (THEMES.includes(saved)) return saved;
  } catch { /* storage bloqueado: usa o padrão */ }
  return 'taverna';
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'grimorio') root.dataset.theme = 'grimorio';
  else delete root.dataset.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', META_COLOR[theme] || META_COLOR.taverna);
}

export function saveTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* ignora */ }
  applyTheme(theme);
}
