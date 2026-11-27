import { SPELL_ID_ALIASES } from '../../data/spell-id-aliases.js';

export function migrateSpellAliases(char) {
  if (!char || !Array.isArray(char.spells)) return char;
  const hit = char.spells.some(s => SPELL_ID_ALIASES[typeof s === 'string' ? s : s?.id]);
  if (!hit) return char;
  const spells = char.spells.map(s => (typeof s === 'string'
    ? (SPELL_ID_ALIASES[s] || s)
    : (SPELL_ID_ALIASES[s?.id] ? { ...s, id: SPELL_ID_ALIASES[s.id] } : s)));
  return { ...char, spells };
}

export function charCardSummary(char) {
  if (!char) return null;
  const maxHp = Number(char.maxHp) || 0;
  const curHp = char.currentHp == null ? maxHp : Number(char.currentHp);
  return {
    id: char.id,
    name: char.name || '',
    level: Number(char.level) || 1,
    className: char.className || '',
    subclass: char.subclass || '',
    race: char.race || '',
    rulesVersion: char.rulesVersion === '2024' ? '2024' : '2014',
    hp: curHp,
    maxHp,
    ac: char.ac ?? null,
    avatar: char.avatar || null,
    updatedAt: char.updatedAt ?? null,
  };
}
