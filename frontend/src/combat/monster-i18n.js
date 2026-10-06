// Tradução dos termos de monstro e combate que vêm em inglês dos dados SRD
// (tipo, tamanho, tipo de dano, alcance em pés, condições, atributos).
// Puro (sem React) — testado em tests/monster-i18n.test.js.
//
// Regra: o id em inglês continua sendo o valor guardado/enviado ao servidor;
// só o RÓTULO muda conforme o idioma da tela.

const pick = (lang, pt, en) => (lang === 'en' ? en : pt);

export const MONSTER_TYPE_LABEL = {
  aberration: ['aberração', 'aberration'],
  beast: ['fera', 'beast'],
  celestial: ['celestial', 'celestial'],
  construct: ['constructo', 'construct'],
  dragon: ['dragão', 'dragon'],
  elemental: ['elemental', 'elemental'],
  fey: ['fada', 'fey'],
  fiend: ['ínfero', 'fiend'],
  giant: ['gigante', 'giant'],
  humanoid: ['humanoide', 'humanoid'],
  monstrosity: ['monstruosidade', 'monstrosity'],
  ooze: ['limo', 'ooze'],
  plant: ['planta', 'plant'],
  undead: ['morto-vivo', 'undead'],
  swarm: ['enxame', 'swarm'],
};

export const SIZE_LABEL = {
  tiny: ['Miúdo', 'Tiny'],
  small: ['Pequeno', 'Small'],
  medium: ['Médio', 'Medium'],
  large: ['Grande', 'Large'],
  huge: ['Enorme', 'Huge'],
  gargantuan: ['Imenso', 'Gargantuan'],
};
export const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

export const DAMAGE_TYPE_LABEL = {
  acid: ['ácido', 'acid'],
  bludgeoning: ['contundente', 'bludgeoning'],
  cold: ['frio', 'cold'],
  fire: ['fogo', 'fire'],
  force: ['energia', 'force'],
  lightning: ['elétrico', 'lightning'],
  necrotic: ['necrótico', 'necrotic'],
  piercing: ['perfurante', 'piercing'],
  poison: ['veneno', 'poison'],
  psychic: ['psíquico', 'psychic'],
  radiant: ['radiante', 'radiant'],
  slashing: ['cortante', 'slashing'],
  thunder: ['trovejante', 'thunder'],
  varies: ['variável', 'varies'],
};
export const DAMAGE_TYPES = ['bludgeoning', 'piercing', 'slashing', 'fire', 'cold', 'lightning', 'thunder',
  'acid', 'poison', 'necrotic', 'radiant', 'psychic', 'force'];

export const CONDITION_LABEL = {
  blinded: ['cego', 'blinded'],
  charmed: ['enfeitiçado', 'charmed'],
  deafened: ['surdo', 'deafened'],
  frightened: ['amedrontado', 'frightened'],
  grappled: ['agarrado', 'grappled'],
  incapacitated: ['incapacitado', 'incapacitated'],
  invisible: ['invisível', 'invisible'],
  paralyzed: ['paralisado', 'paralyzed'],
  petrified: ['petrificado', 'petrified'],
  poisoned: ['envenenado', 'poisoned'],
  prone: ['caído', 'prone'],
  restrained: ['contido', 'restrained'],
  stunned: ['atordoado', 'stunned'],
  unconscious: ['inconsciente', 'unconscious'],
  exhaustion: ['exaustão', 'exhaustion'],
};
export const CONDITIONS = ['blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated',
  'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion'];

const ABILITY_ABBR = {
  str: ['FOR', 'STR'], dex: ['DES', 'DEX'], con: ['CON', 'CON'],
  int: ['INT', 'INT'], wis: ['SAB', 'WIS'], cha: ['CAR', 'CHA'],
};

const key = (v) => String(v ?? '').trim().toLowerCase();

function fromTable(table, value, lang) {
  const row = table[key(value)];
  if (row) return pick(lang, row[0], row[1]);
  // Busca reversa: aceita o rótulo já em português.
  const k = key(value);
  const rev = Object.values(table).find(r => r[0].toLowerCase() === k);
  if (rev) return pick(lang, rev[0], rev[1]);
  return value == null ? '' : String(value);
}

/** "ooze" → "limo". Tipos compostos ("humanoid (goblinoid)") traduzem a primeira palavra. */
export function monsterTypeLabel(type, lang = 'pt') {
  if (!type) return '';
  const s = String(type);
  const m = s.match(/^(\w+)(.*)$/);
  if (m && MONSTER_TYPE_LABEL[m[1].toLowerCase()]) return fromTable(MONSTER_TYPE_LABEL, m[1], lang) + m[2];
  return s;
}

/** "Medium" → "Médio". */
export const sizeLabel = (size, lang = 'pt') => fromTable(SIZE_LABEL, size, lang);

/** "piercing" → "perfurante". Texto livre passa como está. */
export const damageTypeLabel = (type, lang = 'pt') => fromTable(DAMAGE_TYPE_LABEL, type, lang);

/** "prone" → "caído". */
export const conditionLabel = (cond, lang = 'pt') => fromTable(CONDITION_LABEL, cond, lang);

/** "dex" / "DEX" → "DES". */
export function abilityLabel(ab, lang = 'pt') {
  const row = ABILITY_ABBR[key(ab)];
  return row ? pick(lang, row[0], row[1]) : String(ab || '').toUpperCase();
}

/** Pés → metros no padrão das regras em português (5 ft = 1,5 m). */
export function feetToMeters(ft) {
  const n = Number(ft);
  if (!Number.isFinite(n)) return String(ft);
  const m = Math.round(n * 0.3 * 10) / 10;
  return m.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/**
 * Alcance de ação de monstro:
 *   "5 ft"                 → "1,5 m"
 *   "150/600 ft"           → "45/180 m"
 *   "5 ft (20/60 ranged)"  → "1,5 m (à distância 6/18 m)"
 * Em inglês volta o texto original.
 */
export function rangeLabel(range, lang = 'pt') {
  if (!range) return '';
  const s = String(range);
  if (lang === 'en') return s;
  const conv = (nums) => nums.split('/').map(feetToMeters).join('/');
  return s
    .replace(/\(\s*([\d/]+)\s*(?:ft\.?\s*)?ranged\s*\)/gi, (_, n) => `(à distância ${conv(n)} m)`)
    .replace(/([\d/]+)\s*(?:ft\.?|feet|pés)/gi, (_, n) => `${conv(n)} m`)
    .replace(/\breach\b/gi, 'alcance')
    .replace(/\branged\b/gi, 'à distância');
}

/** "1d6+2 piercing" — expressão de dano + tipo traduzido. */
export function damageText(dice, type, lang = 'pt') {
  return [dice, type ? damageTypeLabel(type, lang) : ''].filter(Boolean).join(' ');
}

/** Nome de monstro/ação ({pt, en} ou texto). */
export function nameOf(name, lang = 'pt') {
  if (!name) return '';
  if (typeof name === 'object') return name[lang] || name.pt || name.en || '';
  return String(name);
}

/** Tipo de ataque: melee/ranged → corpo a corpo / à distância. */
export function attackKindLabel(type, lang = 'pt') {
  if (type === 'melee') return pick(lang, 'corpo a corpo', 'melee');
  if (type === 'ranged') return pick(lang, 'à distância', 'ranged');
  return type || '';
}
