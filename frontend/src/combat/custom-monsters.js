/**
 * Monstros importados/personalizados do mestre. Ficam só neste navegador
 * (localStorage); no combate vão como snapshot inline (api.addCombatant com
 * `monster: {...}`), então não entram no catálogo público nem no servidor.
 */
const KEY = 'forja.customMonsters.v1';

function storage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function loadCustomMonsters() {
  const s = storage();
  if (!s) return [];
  try {
    const list = JSON.parse(s.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter(m => m && m.id && m.name) : [];
  } catch { return []; }
}

function persist(list) {
  const s = storage();
  if (!s) return false;
  try { s.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
}

/** Salva (substitui pelo id). Retorna a lista nova. */
export function saveCustomMonsters(monsters) {
  const list = loadCustomMonsters();
  for (const m of monsters) {
    const i = list.findIndex(x => x.id === m.id);
    const entry = { ...m, custom: true };
    if (i >= 0) list[i] = entry; else list.unshift(entry);
  }
  persist(list);
  return list;
}

export function deleteCustomMonster(id) {
  const list = loadCustomMonsters().filter(m => m.id !== id);
  persist(list);
  return list;
}

export function newCustomId(base = 'custom') {
  const slug = String(base).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'custom';
  return `custom-${slug}-${Date.now().toString(36)}`;
}
