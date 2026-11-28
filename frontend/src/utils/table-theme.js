const KEY = 'forja:table-theme';

export function getTableTheme() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'table';
  } catch {
    return false;
  }
}

export function setTableTheme(enabled) {
  const on = !!enabled;
  try {
    if (typeof localStorage !== 'undefined') {
      if (on) localStorage.setItem(KEY, 'table');
      else localStorage.removeItem(KEY);
    }
  } catch { /* ignore */ }
  if (typeof document !== 'undefined') {
    if (on) document.documentElement.dataset.theme = 'table';
    else delete document.documentElement.dataset.theme;
  }
  return on;
}

export function initTableTheme() {
  const on = getTableTheme();
  if (typeof document !== 'undefined' && on) {
    document.documentElement.dataset.theme = 'table';
  }
  return on;
}
