export const BUNDLE_FORMAT = 'forja-homebrew-bundle';
export const BUNDLE_VERSION = 1;

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function hasUnsafeKey(obj) {
  if (!obj || typeof obj !== 'object') return false;
  for (const k of Object.keys(obj)) {
    if (UNSAFE_KEYS.has(k)) return true;
    if (typeof obj[k] === 'object' && hasUnsafeKey(obj[k])) return true;
  }
  return false;
}

function checkEntries(list, kind, errors, warnings) {
  if (list == null) return [];
  if (!Array.isArray(list)) {
    errors.push(`${kind}: must be an array`);
    return [];
  }
  if (list.length > 500) errors.push(`${kind}: exceeds max 500 entries`);
  const valid = [];
  list.forEach((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${kind}[${idx}]: must be an object`);
      return;
    }
    if (hasUnsafeKey(item)) {
      errors.push(`${kind}[${idx}]: unsafe key detected`);
      return;
    }
    const id = String(item.id || '').trim();
    const name = typeof item.name === 'string' ? item.name.trim() : (item.name?.pt || item.name?.en || '').trim();
    if (!id) errors.push(`${kind}[${idx}]: missing id`);
    if (!name) errors.push(`${kind}[${idx}]: missing name`);
    if (!item.source && !item.homebrew) warnings.push(`${kind}[${idx}]: missing source tag`);
    if (id && name) valid.push({ ...item, id, homebrew: true });
  });
  return valid;
}

export function validateHomebrewBundle(raw) {
  const errors = [];
  const warnings = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['bundle must be a JSON object'], warnings, normalized: null };
  }
  if (hasUnsafeKey(raw)) {
    return { ok: false, errors: ['unsafe prototype key rejected'], warnings, normalized: null };
  }
  if (raw.format !== BUNDLE_FORMAT) errors.push(`format must be "${BUNDLE_FORMAT}"`);
  if (Number(raw.version) !== BUNDLE_VERSION) errors.push(`version must be ${BUNDLE_VERSION}`);
  const rulesVersion = raw.rulesVersion === '2014' ? '2014' : raw.rulesVersion === '2024' ? '2024' : null;
  if (raw.rulesVersion && !rulesVersion) errors.push('rulesVersion must be "2024" or "2014"');

  const monsters = checkEntries(raw.monsters, 'monsters', errors, warnings);
  const spells = checkEntries(raw.spells, 'spells', errors, warnings);
  const items = checkEntries(raw.items, 'items', errors, warnings);
  if (!monsters.length && !spells.length && !items.length && !errors.length) {
    warnings.push('bundle contains zero entries');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalized: errors.length === 0 ? {
      format: BUNDLE_FORMAT,
      version: BUNDLE_VERSION,
      name: String(raw.name || 'Homebrew Pack').slice(0, 120),
      author: String(raw.author || '').slice(0, 80),
      rulesVersion: rulesVersion || '2024',
      exportedAt: raw.exportedAt || new Date().toISOString(),
      monsters,
      spells,
      items,
    } : null,
  };
}

export function exportHomebrewBundle({ name = 'Homebrew Pack', author = '', rulesVersion = '2024', monsters = [], spells = [], items = [] } = {}) {
  const payload = {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    name: String(name || 'Homebrew Pack').slice(0, 120),
    author: String(author || '').slice(0, 80),
    rulesVersion: rulesVersion === '2014' ? '2014' : '2024',
    exportedAt: new Date().toISOString(),
    monsters,
    spells,
    items,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseHomebrewBundleJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text || ''));
  } catch (err) {
    return { ok: false, errors: [`invalid JSON: ${err.message}`], warnings: [], bundle: null };
  }
  const { ok, errors, warnings, normalized } = validateHomebrewBundle(parsed);
  return { ok, errors, warnings, bundle: normalized };
}

export function mergeHomebrewItems(existing = [], incoming = []) {
  const map = new Map();
  for (const item of existing) {
    if (item?.id) map.set(String(item.id), item);
  }
  let added = 0;
  let updated = 0;
  for (const item of incoming) {
    if (!item?.id) continue;
    const key = String(item.id);
    if (map.has(key)) updated += 1;
    else added += 1;
    map.set(key, item);
  }
  return { merged: Array.from(map.values()), added, updated };
}
