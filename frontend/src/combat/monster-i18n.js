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

// ---------------------------------------------------------------------------
// Ficha do monstro (MonsterStatblock): linha de tipo, deslocamento, sentidos e
// idiomas. Em inglês o texto do SRD volta como veio; em português nada fica com
// "ft", "darkvision" ou "Common" na tela. Texto que a tabela não conhece passa
// como está (nunca inventamos dado).
// ---------------------------------------------------------------------------

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/** Nome de condição para chip/título: "prone" → "Caído" (a mesma tabela, com inicial maiúscula). */
export const conditionName = (cond, lang = 'pt') => cap(conditionLabel(cond, lang));

export const ALIGNMENT_LABEL = {
  'unaligned': 'sem alinhamento',
  'any alignment': 'qualquer alinhamento',
  'any': 'qualquer alinhamento',
  'lawful good': 'leal e bom', 'neutral good': 'neutro e bom', 'chaotic good': 'caótico e bom',
  'lawful neutral': 'leal e neutro', 'neutral': 'neutro', 'true neutral': 'neutro', 'chaotic neutral': 'caótico e neutro',
  'lawful evil': 'leal e mau', 'neutral evil': 'neutro e mau', 'chaotic evil': 'caótico e mau',
};
const ALIGNMENT_ABBR = {
  lg: 'lawful good', ng: 'neutral good', cg: 'chaotic good', ln: 'lawful neutral', n: 'neutral',
  cn: 'chaotic neutral', le: 'lawful evil', ne: 'neutral evil', ce: 'chaotic evil', u: 'unaligned',
};

/** "chaotic neutral" / "CN" → "caótico e neutro". */
export function alignmentLabel(alignment, lang = 'pt') {
  if (!alignment) return '';
  const k = key(alignment);
  const full = ALIGNMENT_ABBR[k] || k;
  if (lang === 'en') return ALIGNMENT_ABBR[k] || String(alignment);
  return ALIGNMENT_LABEL[full] || String(alignment);
}

/**
 * Linha abaixo do nome. Só com o que o monstro tem: sem tipo, tamanho e alinhamento a
 * linha some (antes a ficha escrevia "Medium monstrosity, unaligned" para qualquer um).
 *   pt: "Fada · Pequeno · caótico e neutro"      en: "Small fey, chaotic neutral"
 */
export function monsterMetaLine(m, lang = 'pt') {
  if (!m) return '';
  const { size, type, alignment } = m;
  if (!size && !type && !alignment) return m.typeLine ? String(m.typeLine) : '';
  if (lang === 'en') {
    if (m.typeLine) return String(m.typeLine);
    const head = [size, type].filter(Boolean).join(' ');
    return [head, alignmentLabel(alignment, 'en')].filter(Boolean).join(', ');
  }
  return [cap(monsterTypeLabel(type, 'pt')), size ? sizeLabel(size, 'pt') : '', alignmentLabel(alignment, 'pt')]
    .filter(Boolean).join(' · ');
}

const SPEED_MODE = {
  walk: ['', ''], fly: ['voo', 'fly'], swim: ['natação', 'swim'], climb: ['escalada', 'climb'], burrow: ['escavação', 'burrow'],
};

/** Texto livre com pés ("fly 60 ft., swim 30 ft.") → metros em pt. */
export function feetText(text, lang = 'pt') {
  if (text == null) return '';
  const s = String(text);
  if (lang === 'en') return s;
  return s
    .replace(/(\d+(?:\.\d+)?)\s*(?:ft\.?|feet|foot)(?![a-z])/gi, (_, n) => `${feetToMeters(n)} m`)
    .replace(/\bfly\b/gi, 'voo').replace(/\bswim\b/gi, 'natação').replace(/\bclimb\b/gi, 'escalada')
    .replace(/\bburrow\b/gi, 'escavação').replace(/\bhover\b/gi, 'pairar').replace(/\bwalk\s*/gi, '');
}

/** Deslocamento: número (30), objeto ({walk: 30, fly: 60, hover: true}) ou texto pronto. */
export function speedLabel(speed, lang = 'pt') {
  if (speed == null || speed === '') return '';
  const unit = (n) => (lang === 'en' ? `${n} ft.` : `${feetToMeters(n)} m`);
  if (typeof speed === 'number') return unit(speed);
  if (typeof speed === 'string') return /^\d+$/.test(speed.trim()) ? unit(Number(speed)) : feetText(speed, lang);
  if (typeof speed !== 'object') return '';
  const hover = speed.hover === true;
  return Object.entries(speed)
    .filter(([k, v]) => k !== 'hover' && typeof v === 'number')
    .map(([k, v]) => {
      const mode = SPEED_MODE[k] ? pick(lang, SPEED_MODE[k][0], SPEED_MODE[k][1]) : k;
      const tail = k === 'fly' && hover ? pick(lang, ' (pairar)', ' (hover)') : '';
      return `${mode ? `${mode} ` : ''}${unit(v)}${tail}`;
    })
    .join(', ');
}

const SENSE_PT = [
  [/\bdarkvision\b/gi, 'visão no escuro'],
  [/\bblindsight\b/gi, 'visão às cegas'],
  [/\btruesight\b/gi, 'visão verdadeira'],
  [/\btremorsense\b/gi, 'sentido sísmico'],
  [/\bpassive perception\b/gi, 'Percepção passiva'],
  [/\(blind beyond this radius\)/gi, '(cego além desse raio)'],
];

/** "darkvision 60 ft, passive Perception 9" → "visão no escuro 18 m, Percepção passiva 9". "" quando não há. */
export function sensesLabel(senses, lang = 'pt') {
  const s = String(senses ?? '').trim();
  if (!s || s === '—' || s === '-') return '';
  if (lang === 'en') return s;
  return SENSE_PT.reduce((acc, [re, pt]) => acc.replace(re, pt), feetText(s, 'pt'));
}

const FORM_PT = { rat: 'rato', wolf: 'lobo', boar: 'javali', tiger: 'tigre', bear: 'urso' };
const LANGUAGE_PT = [
  [/\bCommon\b/g, 'Comum'], [/\bDraconic\b/g, 'Dracônico'], [/\bAbyssal\b/g, 'Abissal'], [/\bElvish\b/g, 'Élfico'],
  [/\bDwarvish\b/g, 'Anão'], [/\bGiant\b/g, 'Gigante'], [/\bSylvan\b/g, 'Silvestre'], [/\bDruidic\b/g, 'Druídico'],
  [/\bUndercommon\b/g, 'Subcomum'], [/\bGnomish\b/g, 'Gnômico'],
  [/\bThieves' cant\b/gi, 'gíria dos ladrões'],
  [/\btelepathy\b/gi, 'telepatia'],
  [/\bAll\b/g, 'Todos'],
  [/\bplus one other language\b/gi, 'mais um idioma'], [/\bplus two other languages\b/gi, 'mais dois idiomas'],
  [/\bplus three other languages\b/gi, 'mais três idiomas'], [/\bplus five other languages\b/gi, 'mais cinco idiomas'],
  [/\band any three languages\b/gi, 'e três idiomas à escolha'],
  [/\bbut can't speak them\b/gi, 'mas não fala'], [/\bbut can't speak\b/gi, 'mas não fala'],
  [/\bcan't speak in (\w+) form\b/gi, (_, f) => `não fala na forma de ${FORM_PT[f.toLowerCase()] || f}`],
  [/\bunderstands commands given in any language\b/gi, 'entende ordens em qualquer idioma'],
  [/\bUnderstands\b/g, 'Entende'], [/\bunderstands\b/g, 'entende'],
  [/\bAnd\b/g, 'e'], [/\band\b/g, 'e'],
];

/** "Common, Goblin" → "Comum, Goblin". "" quando o monstro não fala nenhum ("—"). */
export function languagesLabel(languages, lang = 'pt') {
  const s = String(languages ?? '').trim();
  if (!s || s === '—' || s === '-') return '';
  if (lang === 'en') return s;
  return LANGUAGE_PT.reduce((acc, [re, pt]) => acc.replace(re, pt), feetText(s, 'pt'));
}

/** Lista de tipos de dano ("fire", "nonmagical bludgeoning/piercing/slashing") em pt. */
export function damageListLabel(list, lang = 'pt') {
  const arr = Array.isArray(list) ? list : (list ? [list] : []);
  return arr.map(x => {
    const s = String(x);
    if (lang === 'en') return s;
    const direct = damageTypeLabel(s, 'pt');
    if (direct !== s) return direct;
    return s.replace(/\bnonmagical\b/gi, 'não mágico:')
      .replace(/[a-z]+/gi, (w) => (DAMAGE_TYPE_LABEL[w.toLowerCase()] ? DAMAGE_TYPE_LABEL[w.toLowerCase()][0] : w));
  }).join(', ');
}

/** Lista de condições (imunidades) em pt. */
export const conditionListLabel = (list, lang = 'pt') =>
  (Array.isArray(list) ? list : (list ? [list] : [])).map(c => conditionLabel(c, lang)).join(', ');
