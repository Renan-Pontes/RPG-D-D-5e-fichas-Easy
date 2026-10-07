/* Ilustrações do site (geradas para a Forja; ficam em public/art/). */
import SPECIES_WITH_ART from './art-species.json' with { type: 'json' };
import OPTIONS_WITH_ART from './art-options.json' with { type: 'json' };
import SUBCLASSES_WITH_ART from './art-subclasses.json' with { type: 'json' };
import COVERS_WITH_ART from './art-covers.json' with { type: 'json' };
import ITEMS_WITH_ART from './art-items.json' with { type: 'json' };
import MONSTERS_WITH_ART from './art-monsters.json' with { type: 'json' };
import ICONS_WITH_ART from './art-icons.json' with { type: 'json' };
const CLASS_ART = new Set(['artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']);
const SPECIES_ART = ['aasimar', 'dragonborn', 'dwarf', 'elf', 'gnome', 'goliath', 'halfling', 'human', 'orc', 'tiefling'];
// Raças 2014 / sub-raças → ilustração da espécie mais próxima.
const SPECIES_ALIAS = { 'half-orc': 'orc', 'half-elf': 'elf', drow: 'elf' };

export const classArt = (id) => (CLASS_ART.has(id) ? `/art/classes/${id}.webp` : null);

// Espécies e sub-raças com retrato próprio (gerado por scripts; ver public/art/species).
const SPECIES_OWN = new Set(SPECIES_WITH_ART);

export function speciesArt(id) {
  if (!id) return null;
  const s = String(id).toLowerCase();
  if (SPECIES_OWN.has(s)) return `/art/species/${s}.webp`;
  if (SPECIES_ALIAS[s]) return `/art/species/${SPECIES_ALIAS[s]}.webp`;
  const base = SPECIES_ART.find((b) => s === b || s.startsWith(`${b}-`));
  return base ? `/art/species/${base}.webp` : null;
}

const BACKGROUND_ART = new Set(['acolyte', 'artisan', 'charlatan', 'criminal', 'entertainer', 'farmer', 'guard', 'guide', 'hermit', 'merchant', 'noble', 'sage', 'sailor', 'scribe', 'soldier', 'wayfarer', 'folkHero', 'guildArtisan', 'outlander', 'urchin', 'gladiator', 'knight', 'pirate', 'spy', 'cityWatch', 'farTraveler', 'inheritor']);
export const backgroundArt = (id) => (BACKGROUND_ART.has(id) ? `/art/backgrounds/${id}.webp` : null);

// Escolhas de classe (instrumentos, armas da maestria, invocações…) e subclasses.
const OPTION_OWN = new Set(OPTIONS_WITH_ART);
const SUBCLASS_OWN = new Set(SUBCLASSES_WITH_ART);
const safeId = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '_');
export const optionArt = (id) => (id && OPTION_OWN.has(safeId(id)) ? `/art/options/${safeId(id)}.webp` : null);
export const subclassArt = (classId, id) => (SUBCLASS_OWN.has(`${classId}-${id}`) ? `/art/subclasses/${classId}-${id}.webp` : null);

// ---------------------------------------------------------------------------
// Itens, armas, monstros e ícones. Os manifestos (src/art-*.json) dizem quais
// ilustrações já existem; quando chegarem mais, só o manifesto muda. Sem imagem,
// as funções devolvem null e o <ArtThumb> mostra a moldura "Ilustração em breve".

const ITEM_OWN = new Set(ITEMS_WITH_ART);
const MONSTER_OWN = new Set(MONSTERS_WITH_ART);
const ICON_OWN = new Set(ICONS_WITH_ART);

/** Ilustração de um id do catálogo de itens (armaduras/itens mágicos) ou de uma arma. */
function itemArtById(id) {
  if (!id || typeof id !== 'string') return null;
  const s = safeId(id);
  // Ids do manifesto são nomes de arquivo seguros (ex.: weapon+1); o '+' vai cru:
  // %2B não acha o arquivo no servidor estático e o Vite devolveria o index.html.
  if (ITEM_OWN.has(id) && /^[A-Za-z0-9_+-]+$/.test(id)) return `/art/items/${id}.webp`;
  if (ITEM_OWN.has(s)) return `/art/items/${s}.webp`;
  // Armas comuns têm a arte nas escolhas de classe (maestria), pelo id da arma.
  if (OPTION_OWN.has(s)) return `/art/options/${s}.webp`;
  return null;
}

/**
 * Ilustração de um item: aceita o objeto (instância da ficha, item do catálogo
 * ou da campanha), o sourceId ou o id da arma. Tenta a arte própria do item e,
 * se não houver, a da arma/armadura comum em que ele se baseia (`base`).
 */
export function itemArt(item) {
  if (!item) return null;
  if (typeof item === 'string') return itemArtById(item);
  if (typeof item !== 'object') return null;
  for (const id of [item.artId, item.sourceId, item.id, item.base]) {
    const src = itemArtById(id);
    if (src) return src;
  }
  return null;
}

// Ids antigos / camelCase de feras → id do bestiário 5.2.1 (cópia leve de data/bestiary.js,
// para não carregar o bestiário inteiro só para achar um retrato).
const MONSTER_ALIAS = {
  thug: 'tough', 'cult-fanatic': 'cultist-fanatic', acolyte: 'priest-acolyte', veteran: 'warrior-veteran',
  goblin: 'goblin-warrior', hobgoblin: 'hobgoblin-warrior', bugbear: 'bugbear-warrior',
  kobold: 'kobold-warrior', gnoll: 'gnoll-warrior', minotaur: 'minotaur-of-baphomet',
  poisonousSnake: 'venomous-snake', giantPoisonousSnake: 'giant-venomous-snake',
};
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Retrato de um monstro do bestiário (aceita ids antigos e camelCase). */
export function monsterArt(id) {
  if (!id || typeof id !== 'string') return null;
  for (const k of [id, MONSTER_ALIAS[id], kebab(id), MONSTER_ALIAS[kebab(id)]]) {
    if (k && MONSTER_OWN.has(k)) return `/art/monsters/${k}.webp`;
  }
  return null;
}

const iconArt = (prefix, id) => {
  if (!id || typeof id !== 'string') return null;
  const key = `${prefix}-${safeId(id)}`;
  return ICON_OWN.has(key) ? `/art/icons/${key}.webp` : null;
};
// Exaustão aparece como 'exhausted' (ficha) e 'exhaustion' (combate).
const COND_ALIAS = { exhausted: 'exhaustion', exhaustion: 'exhausted' };
/** Ícone de condição ('cond-<id>'). */
export const conditionIcon = (id) => iconArt('cond', id) || iconArt('cond', COND_ALIAS[id]);
/** Ícone de tipo de dano ('dmg-<tipo>'), ex.: damageIcon('fire'). */
export const damageIcon = (type) => iconArt('dmg', String(type || '').toLowerCase());
/** Emblema de escola de magia ('school-<escola>'), ex.: schoolIcon('evocation'). */
export const schoolIcon = (school) => iconArt('school', String(school || '').toLowerCase());

// Emojis temáticos para a moldura sem imagem.
const ITEM_EMOJI = {
  weapon: '⚔️', armor: '🛡️', shield: '🛡️', potion: '🧪', ring: '💍', rod: '🪄', staff: '🪄', wand: '🪄',
  scroll: '📜', wondrous: '✨', magic: '✨', gear: '🎒',
};
/** Emoji do item pela categoria mágica ou pelo tipo. */
export const itemEmoji = (item) => ITEM_EMOJI[item?.magic?.category] && item?.magic?.category !== 'armor'
  ? ITEM_EMOJI[item.magic.category]
  : (ITEM_EMOJI[item?.type] || '🎒');

const MONSTER_EMOJI = {
  aberration: '🐙', beast: '🐺', celestial: '👼', construct: '🗿', dragon: '🐉', elemental: '🌪️', fey: '🧚',
  fiend: '😈', giant: '🗻', humanoid: '🗡️', monstrosity: '👹', ooze: '🫧', plant: '🌿', undead: '💀', swarm: '🐀',
};
export const monsterEmoji = (type) => MONSTER_EMOJI[String(type || '').toLowerCase().split(/[ (]/)[0]] || '👹';

export const CONDITION_EMOJI = {
  blinded: '🙈', charmed: '💞', deafened: '🔇', exhausted: '😩', exhaustion: '😩', frightened: '😱',
  grappled: '✊', incapacitated: '💫', invisible: '👻', paralyzed: '⚡', petrified: '🗿', poisoned: '🤢',
  prone: '🛌', restrained: '⛓️', stunned: '💫', unconscious: '💤',
};
export const SCHOOL_EMOJI = {
  abjuration: '🛡️', conjuration: '🌀', divination: '👁️', enchantment: '💫', evocation: '🔥',
  illusion: '🎭', necromancy: '💀', transmutation: '⚗️',
};
export const DAMAGE_EMOJI = {
  acid: '🧪', bludgeoning: '🔨', cold: '❄️', fire: '🔥', force: '✴️', lightning: '⚡', necrotic: '💀',
  piercing: '🏹', poison: '☠️', psychic: '🧠', radiant: '☀️', slashing: '🗡️', thunder: '💥',
};

export const HERO_ART = '/art/hero-forge.webp';
export const GRIMOIRE_ART = '/art/grimoire-book.webp';

/** Esconde a imagem se o arquivo não existir (evita ícone de imagem quebrada). */
export const hideOnError = (e) => { e.currentTarget.style.display = 'none'; };

// ---------------------------------------------------------------------------
// Capas de campanha (16:9). As capas próprias ficam em public/art/covers/<id>.webp
// e são listadas no manifesto src/art-covers.json (array de ids). Enquanto houver
// poucas, a galeria completa com artes que já existem no site (reserva).

/** Nome do clima de cada capa: [pt, en]. Ids podem vir com ou sem o prefixo "cover-". */
export const CAMPAIGN_COVER_NAMES = {
  'dark-forest': ['Floresta sombria', 'Dark forest'],
  'mountain-kingdom': ['Reino nas montanhas', 'Mountain kingdom'],
  'port-city': ['Cidade portuária', 'Port city'],
  desert: ['Ruínas no deserto', 'Desert ruins'],
  underdark: ['Reinos subterrâneos', 'The Underdark'],
  'frozen-north': ['Norte congelado', 'Frozen north'],
  'haunted-castle': ['Castelo assombrado', 'Haunted castle'],
  'high-seas': ['Alto-mar em tormenta', 'Stormy high seas'],
  'jungle-ruins': ['Ruínas na selva', 'Jungle ruins'],
  'sky-islands': ['Ilhas no céu', 'Sky islands'],
  'gothic-city': ['Cidade gótica', 'Gothic city'],
  'cozy-tavern': ['Taverna acolhedora', 'Cozy tavern'],
};

/** Artes já existentes usadas como reserva (todas 16:9), com nome de clima. */
export const CAMPAIGN_COVER_RESERVE = [
  { id: 'hero-forge', src: '/art/hero-forge.webp', name: ['Forja dos heróis', "Heroes' forge"] },
  { id: 'bg-wayfarer', src: '/art/backgrounds/wayfarer.webp', name: ['Estrada para o reino', 'Road to the realm'] },
  { id: 'bg-hermit', src: '/art/backgrounds/hermit.webp', name: ['Montanhas sob as estrelas', 'Mountains under the stars'] },
  { id: 'bg-guide', src: '/art/backgrounds/guide.webp', name: ['Floresta gelada', 'Frozen forest'] },
  { id: 'bg-farTraveler', src: '/art/backgrounds/farTraveler.webp', name: ['Porto dos viajantes', "Travelers' harbor"] },
  { id: 'bg-pirate', src: '/art/backgrounds/pirate.webp', name: ['Mar em tormenta', 'Stormy sea'] },
  { id: 'bg-guard', src: '/art/backgrounds/guard.webp', name: ['Cidade à noite', 'City by night'] },
  { id: 'bg-folkHero', src: '/art/backgrounds/folkHero.webp', name: ['Vila em chamas', 'Village in flames'] },
  { id: 'bg-outlander', src: '/art/backgrounds/outlander.webp', name: ['Ermos congelados', 'Frozen wilds'] },
  { id: 'bg-noble', src: '/art/backgrounds/noble.webp', name: ['Intrigas da corte', 'Court intrigue'] },
  { id: 'bg-sage', src: '/art/backgrounds/sage.webp', name: ['Biblioteca arcana', 'Arcane library'] },
  { id: 'bg-farmer', src: '/art/backgrounds/farmer.webp', name: ['Campos ao entardecer', 'Fields at dusk'] },
  { id: 'bg-merchant', src: '/art/backgrounds/merchant.webp', name: ['Bazar exótico', 'Exotic bazaar'] },
  { id: 'bg-gladiator', src: '/art/backgrounds/gladiator.webp', name: ['A arena', 'The arena'] },
  { id: 'bg-urchin', src: '/art/backgrounds/urchin.webp', name: ['Telhados da cidade', 'City rooftops'] },
  { id: 'grimoire', src: '/art/grimoire-book.webp', name: ['Grimório proibido', 'Forbidden grimoire'] },
];

const COVER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const humanize = (id) => {
  const s = id.replace(/^cover-/, '').replace(/[-_]+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : id;
};

/**
 * Monta a galeria: capas do manifesto primeiro (na ordem dele, sem repetir e só
 * com ids seguros), depois a reserva até chegar a `min` opções. Puro.
 * → [{id, src, name: [pt, en]}]
 */
export function buildCampaignCovers(manifest = [], min = 12) {
  const seen = new Set();
  const own = [];
  for (const raw of Array.isArray(manifest) ? manifest : []) {
    const id = typeof raw === 'string' ? raw.trim() : '';
    if (!COVER_ID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    const key = id.replace(/^cover-/, '');
    const h = humanize(id);
    own.push({ id, src: `/art/covers/${id}.webp`, name: CAMPAIGN_COVER_NAMES[key] || [h, h] });
  }
  const reserve = CAMPAIGN_COVER_RESERVE.filter((c) => !seen.has(c.id)).slice(0, Math.max(0, min - own.length));
  return [...own, ...reserve];
}

export const CAMPAIGN_COVERS = buildCampaignCovers(COVERS_WITH_ART);

export const campaignCoverName = (cover, lang) => (cover ? (lang === 'en' ? cover.name[1] : cover.name[0]) : '');
