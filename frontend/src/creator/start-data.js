/*
 * Dados de início da criação de personagem, por regra (ver README.md).
 *
 * 2024: SRD 5.2.1 (tabelas "Core <Classe> Traits" e "Background Descriptions");
 *       os 12 antecedentes 2024 fora do SRD e o Artífice (Eberron: Forge of the
 *       Artificer, 2025) seguem o PHB 2024 / EFotA, só como dados (sem texto copiado).
 * 2014: SRD 5.1 / PHB 2014 (+ TCE para o Artífice, SCAG para Vigia da Cidade,
 *       Viajante Distante e Herdeiro). As escolhas (a)/(b) de equipamento foram
 *       achatadas em pacotes completos A/B/C; a última opção é sempre a riqueza
 *       inicial em ouro (média dos dados), que substitui também o equipamento
 *       do antecedente.
 *
 * Itens de equipamento:
 *   { kind: 'armor', id }            id de SRD.ARMOR
 *   { kind: 'shield' }
 *   { kind: 'weapon', id, qty? }     id de SRD.weaponsFor(regra)
 *   { kind: 'item', name: {pt,en}, qty }
 *        + opcional tool: 'thievesTools'   (ferramenta concreta, id de TOOLS)
 *        + opcional toolChoice: 'class' | 'background' (a mesma ferramenta escolhida na proficiência)
 *        + opcional pack: 'explorer' | 'dungeoneer' | … (chave de SRD.PACKS)
 *   note: {pt,en} opcional em qualquer item (ex.: "foco druídico").
 *
 * Funções puras exportadas: classStart, backgroundStart, toolName, startingSpells,
 * startingTools, startingGold, packFor, packProficiencyIssues, weaponTraining,
 * armorTraining, isWeaponProficient, isArmorProficient.
 */
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';
import { findFeat } from '../../data/feats.js';

const b = (pt, en) => ({ pt, en });
const rv = (char) => (char?.rulesVersion === '2014' ? '2014' : '2024');

// ---------------------------------------------------------------------------
// Ferramentas
// ---------------------------------------------------------------------------
export const ARTISAN_TOOLS = [
  'alchemistsSupplies', 'brewersSupplies', 'calligraphersSupplies', 'carpentersTools', 'cartographersTools',
  'cobblersTools', 'cooksUtensils', 'glassblowersTools', 'jewelersTools', 'leatherworkersTools', 'masonsTools',
  'paintersSupplies', 'pottersTools', 'smithsTools', 'tinkersTools', 'weaversTools', 'woodcarversTools',
];
export const INSTRUMENTS = ['bagpipes', 'drum', 'dulcimer', 'flute', 'horn', 'lute', 'lyre', 'panFlute', 'shawm', 'viol'];
export const GAMING_SETS = ['diceSet', 'dragonchessSet', 'playingCardSet', 'threeDragonAnteSet'];

export const TOOLS = {
  alchemistsSupplies: b('Suprimentos de Alquimista', "Alchemist's Supplies"),
  brewersSupplies: b('Suprimentos de Cervejeiro', "Brewer's Supplies"),
  calligraphersSupplies: b('Suprimentos de Calígrafo', "Calligrapher's Supplies"),
  carpentersTools: b('Ferramentas de Carpinteiro', "Carpenter's Tools"),
  cartographersTools: b('Ferramentas de Cartógrafo', "Cartographer's Tools"),
  cobblersTools: b('Ferramentas de Sapateiro', "Cobbler's Tools"),
  cooksUtensils: b('Utensílios de Cozinheiro', "Cook's Utensils"),
  glassblowersTools: b('Ferramentas de Vidreiro', "Glassblower's Tools"),
  jewelersTools: b('Ferramentas de Joalheiro', "Jeweler's Tools"),
  leatherworkersTools: b('Ferramentas de Coureiro', "Leatherworker's Tools"),
  masonsTools: b('Ferramentas de Pedreiro', "Mason's Tools"),
  paintersSupplies: b('Suprimentos de Pintor', "Painter's Supplies"),
  pottersTools: b('Ferramentas de Oleiro', "Potter's Tools"),
  smithsTools: b('Ferramentas de Ferreiro', "Smith's Tools"),
  tinkersTools: b('Ferramentas de Funileiro', "Tinker's Tools"),
  weaversTools: b('Ferramentas de Tecelão', "Weaver's Tools"),
  woodcarversTools: b('Ferramentas de Entalhador', "Woodcarver's Tools"),
  bagpipes: b('Gaita de Foles', 'Bagpipes'),
  drum: b('Tambor', 'Drum'),
  dulcimer: b('Saltério', 'Dulcimer'),
  flute: b('Flauta', 'Flute'),
  horn: b('Trompa', 'Horn'),
  lute: b('Alaúde', 'Lute'),
  lyre: b('Lira', 'Lyre'),
  panFlute: b('Flauta de Pã', 'Pan Flute'),
  shawm: b('Charamela', 'Shawm'),
  viol: b('Viola', 'Viol'),
  diceSet: b('Dados', 'Dice'),
  dragonchessSet: b('Xadrez de Dragão', 'Dragonchess'),
  playingCardSet: b('Cartas de Baralho', 'Playing Cards'),
  threeDragonAnteSet: b('Ante dos Três Dragões', 'Three-Dragon Ante'),
  disguiseKit: b('Kit de Disfarce', 'Disguise Kit'),
  forgeryKit: b('Kit de Falsificação', 'Forgery Kit'),
  herbalismKit: b('Kit de Herbalismo', 'Herbalism Kit'),
  navigatorsTools: b('Ferramentas de Navegador', "Navigator's Tools"),
  poisonersKit: b('Kit de Envenenador', "Poisoner's Kit"),
  thievesTools: b('Ferramentas de Ladrão', "Thieves' Tools"),
  vehiclesLand: b('Veículos Terrestres', 'Vehicles (Land)'),
  vehiclesWater: b('Veículos Aquáticos', 'Vehicles (Water)'),
};
/** Nome da categoria de ferramenta (para "escolha 1 …"). */
export const TOOL_CATEGORIES = {
  artisan: b('ferramenta de artesão', "artisan's tools"),
  instrument: b('instrumento musical', 'musical instrument'),
  gaming: b('jogo', 'gaming set'),
};
export const toolName = (id, lang = 'pt') => TOOLS[id]?.[lang === 'pt' ? 'pt' : 'en'] || id;

const tools = (fixed = [], choose = 0, from = [], category = null) =>
  ({ fixed, choose, from, ...(category ? { category } : {}) });

// ---------------------------------------------------------------------------
// Itens comuns
// ---------------------------------------------------------------------------
const A = (id) => ({ kind: 'armor', id });
const SH = { kind: 'shield' };
const W = (id, qty = 1, note) => ({ kind: 'weapon', id, ...(qty > 1 ? { qty } : {}), ...(note ? { note } : {}) });
const I = (pt, en, qty = 1, extra = {}) => ({ kind: 'item', name: b(pt, en), qty, ...extra });
const T = (id, qty = 1) => ({ kind: 'item', name: TOOLS[id], qty, tool: id });
const CHOSEN = (source, pt, en) => ({ kind: 'item', name: b(pt, en), qty: 1, toolChoice: source });

const PACK = {
  explorer: I('Pacote de Aventureiro', "Explorer's Pack", 1, { pack: 'explorer' }),
  dungeoneer: I('Pacote de Explorador de Masmorras', "Dungeoneer's Pack", 1, { pack: 'dungeoneer' }),
  priest: I('Pacote de Sacerdote', "Priest's Pack", 1, { pack: 'priest' }),
  entertainer: I('Pacote de Artista', "Entertainer's Pack", 1, { pack: 'entertainer' }),
  burglar: I('Pacote de Assaltante', "Burglar's Pack", 1, { pack: 'burglar' }),
  scholar: I('Pacote de Erudito', "Scholar's Pack", 1, { pack: 'scholar' }),
  diplomat: I('Pacote de Diplomata', "Diplomat's Pack", 1, { pack: 'diplomat' }),
};
const arrows = (n = 20) => I('Flechas', 'Arrows', n);
const bolts = (n = 20) => I('Virotes', 'Bolts', n);
const quiver = I('Aljava', 'Quiver');
const holySymbol = I('Símbolo Sagrado', 'Holy Symbol');
const travelers = I('Roupas de Viajante', "Traveler's Clothes");
const common = I('Roupas Comuns', 'Common Clothes');
const fine = I('Roupas Finas', 'Fine Clothes');
const pouch = (n = 1) => I('Bolsa', 'Pouch', n);
const robe = I('Túnica', 'Robe');
const componentPouch = I('Bolsa de Componentes', 'Component Pouch');
const arcaneFocus = (pt, en) => I(`Foco Arcano (${pt})`, `Arcane Focus (${en})`);
const FOCUS_DRUID = b('Foco druídico', 'Druidic focus');
const FOCUS_ARCANE = b('Foco arcano', 'Arcane focus');

/** Pacote só de ouro (2014: riqueza inicial, troca também o equipamento do antecedente). */
const gold = (id, gp, roll) => ({ id, items: [], gp, ...(roll ? { roll, replacesBackground: true } : {}) });

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------
const ALL_SKILLS = SRD.SKILLS.map(s => s.id);
const sk = (count, from) => ({ count, from });
const spells = (cantrips = 0, prepared = 0, extra = {}) => ({ cantrips, prepared, spellbook: 0, ...extra });

const ROLES = {
  barbarian: b('Guerreiro feroz que entra em fúria, aguenta muito dano e bate forte de perto.', 'A fierce warrior who rages, shrugs off damage and hits hard up close.'),
  bard: b('Artista mágico que ajuda o grupo com música, palavras e magias; bom em quase tudo.', 'A magical performer who helps the party with music, words and spells; good at almost everything.'),
  cleric: b('Servo de um deus que cura os amigos, protege o grupo e também luta.', 'A servant of a god who heals friends, protects the party and can fight too.'),
  druid: b('Guardião da natureza que lança magias de plantas, animais e clima.', 'A guardian of nature who casts spells of plants, animals and weather.'),
  fighter: b('Especialista em armas e armaduras: simples de jogar e muito resistente.', 'A weapons and armor expert: simple to play and very sturdy.'),
  monk: b('Lutador ágil que combate com socos e chutes, sem armadura.', 'An agile fighter who battles with punches and kicks, no armor needed.'),
  paladin: b('Cavaleiro sagrado com armadura pesada, golpes poderosos e um pouco de cura.', 'A holy knight with heavy armor, mighty strikes and some healing.'),
  ranger: b('Caçador e explorador, ótimo com arco e em terrenos selvagens.', 'A hunter and explorer, great with a bow and in the wild.'),
  rogue: b('Furtivo e esperto: abre fechaduras, desarma armadilhas e acerta pontos fracos.', 'Sneaky and clever: picks locks, disarms traps and hits weak spots.'),
  sorcerer: b('Nasceu com magia no sangue; lança poucas magias, mas pode moldá-las.', 'Born with magic in the blood; knows few spells but can bend them.'),
  warlock: b('Fez um pacto com um ser poderoso e recebe magias e poderes estranhos.', 'Made a pact with a powerful being for spells and strange powers.'),
  wizard: b('Estudioso da magia com um livro cheio de feitiços; frágil, mas muito versátil.', 'A scholar of magic with a book full of spells; fragile but very versatile.'),
  artificer: b('Inventor que coloca magia em objetos e ferramentas.', 'An inventor who puts magic into items and tools.'),
};

const C2024 = {
  barbarian: {
    hitDie: 12, primary: ['str'], complexity: 'average', saves: ['str', 'con'],
    skills: sk(2, ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival']),
    armor: ['light', 'medium', 'shield'], weapons: { categories: ['simple', 'martial'], ids: [] }, tools: tools(),
    equipment: [
      { id: 'A', items: [W('greataxe'), W('handaxe', 4), PACK.explorer], gp: 15 },
      gold('B', 75),
    ],
    spells: spells(),
  },
  bard: {
    hitDie: 8, primary: ['cha'], complexity: 'high', saves: ['dex', 'cha'],
    skills: sk(3, ALL_SKILLS),
    armor: ['light'], weapons: { categories: ['simple'], ids: [] }, tools: tools([], 3, INSTRUMENTS, 'instrument'),
    equipment: [
      { id: 'A', items: [A('leather'), W('dagger', 2), CHOSEN('class', 'Instrumento musical (um dos escolhidos)', 'Musical instrument (one you chose)'), PACK.entertainer], gp: 19 },
      gold('B', 90),
    ],
    spells: spells(2, 4, { mode: 'prepared' }),
  },
  cleric: {
    hitDie: 8, primary: ['wis'], complexity: 'average', saves: ['wis', 'cha'],
    skills: sk(2, ['history', 'insight', 'medicine', 'persuasion', 'religion']),
    armor: ['light', 'medium', 'shield'], weapons: { categories: ['simple'], ids: [] }, tools: tools(),
    equipment: [
      { id: 'A', items: [A('chainShirt'), SH, W('mace'), holySymbol, PACK.priest], gp: 7 },
      gold('B', 110),
    ],
    spells: spells(3, 4, { mode: 'prepared' }),
  },
  druid: {
    hitDie: 8, primary: ['wis'], complexity: 'high', saves: ['int', 'wis'],
    skills: sk(2, ['animalHandling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival']),
    armor: ['light', 'shield'], weapons: { categories: ['simple'], ids: [] }, tools: tools(['herbalismKit']),
    equipment: [
      { id: 'A', items: [A('leather'), SH, W('sickle'), W('quarterstaff', 1, FOCUS_DRUID), PACK.explorer, T('herbalismKit')], gp: 9 },
      gold('B', 50),
    ],
    spells: spells(2, 4, { mode: 'prepared' }),
  },
  fighter: {
    hitDie: 10, primary: ['str', 'dex'], complexity: 'low', saves: ['str', 'con'],
    skills: sk(2, ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival']),
    armor: ['light', 'medium', 'heavy', 'shield'], weapons: { categories: ['simple', 'martial'], ids: [] }, tools: tools(),
    equipment: [
      { id: 'A', items: [A('chainMail'), W('greatsword'), W('flail'), W('javelin', 8), PACK.dungeoneer], gp: 4 },
      { id: 'B', items: [A('studdedLeather'), W('scimitar'), W('shortsword'), W('longbow'), arrows(), quiver, PACK.dungeoneer], gp: 11 },
      gold('C', 155),
    ],
    spells: spells(),
  },
  monk: {
    hitDie: 8, primary: ['dex', 'wis'], complexity: 'high', saves: ['str', 'dex'],
    skills: sk(2, ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth']),
    armor: [], weapons: { categories: ['simple'], ids: [], martialProps: ['light'] },
    tools: tools([], 1, [...ARTISAN_TOOLS, ...INSTRUMENTS], 'artisanOrInstrument'),
    equipment: [
      { id: 'A', items: [W('spear'), W('dagger', 5), CHOSEN('class', 'Ferramenta ou instrumento escolhido', 'Chosen tool or instrument'), PACK.explorer], gp: 11 },
      gold('B', 50),
    ],
    spells: spells(),
  },
  paladin: {
    hitDie: 10, primary: ['str', 'cha'], complexity: 'average', saves: ['wis', 'cha'],
    skills: sk(2, ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion']),
    armor: ['light', 'medium', 'heavy', 'shield'], weapons: { categories: ['simple', 'martial'], ids: [] }, tools: tools(),
    equipment: [
      { id: 'A', items: [A('chainMail'), SH, W('longsword'), W('javelin', 6), holySymbol, PACK.priest], gp: 9 },
      gold('B', 150),
    ],
    spells: spells(0, 2, { mode: 'prepared' }),
  },
  ranger: {
    hitDie: 10, primary: ['dex', 'wis'], complexity: 'average', saves: ['str', 'dex'],
    skills: sk(3, ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival']),
    armor: ['light', 'medium', 'shield'], weapons: { categories: ['simple', 'martial'], ids: [] }, tools: tools(),
    equipment: [
      { id: 'A', items: [A('studdedLeather'), W('scimitar'), W('shortsword'), W('longbow'), arrows(), quiver,
        I('Foco Druídico (ramo de visco)', 'Druidic Focus (sprig of mistletoe)'), PACK.explorer], gp: 7 },
      gold('B', 150),
    ],
    spells: spells(0, 2, { mode: 'prepared' }),
  },
  rogue: {
    hitDie: 8, primary: ['dex'], complexity: 'low', saves: ['dex', 'int'],
    skills: sk(4, ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleightOfHand', 'stealth']),
    armor: ['light'], weapons: { categories: ['simple'], ids: [], martialProps: ['finesse', 'light'] }, tools: tools(['thievesTools']),
    equipment: [
      { id: 'A', items: [A('leather'), W('dagger', 2), W('shortsword'), W('shortbow'), arrows(), quiver, T('thievesTools'), PACK.burglar], gp: 8 },
      gold('B', 100),
    ],
    spells: spells(),
  },
  sorcerer: {
    hitDie: 6, primary: ['cha'], complexity: 'high', saves: ['con', 'cha'],
    skills: sk(2, ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion']),
    armor: [], weapons: { categories: ['simple'], ids: [] }, tools: tools(),
    equipment: [
      { id: 'A', items: [W('spear'), W('dagger', 2), arcaneFocus('cristal', 'crystal'), PACK.dungeoneer], gp: 28 },
      gold('B', 50),
    ],
    spells: spells(4, 2, { mode: 'prepared' }),
  },
  warlock: {
    hitDie: 8, primary: ['cha'], complexity: 'high', saves: ['wis', 'cha'],
    skills: sk(2, ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion']),
    armor: ['light'], weapons: { categories: ['simple'], ids: [] }, tools: tools(),
    equipment: [
      { id: 'A', items: [A('leather'), W('sickle'), W('dagger', 2), arcaneFocus('orbe', 'orb'), I('Livro (saber oculto)', 'Book (occult lore)'), PACK.scholar], gp: 15 },
      gold('B', 100),
    ],
    spells: spells(2, 2, { mode: 'prepared' }),
  },
  wizard: {
    hitDie: 6, primary: ['int'], complexity: 'average', saves: ['int', 'wis'],
    skills: sk(2, ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion']),
    armor: [], weapons: { categories: ['simple'], ids: [] }, tools: tools(),
    equipment: [
      { id: 'A', items: [W('dagger', 2), W('quarterstaff', 1, FOCUS_ARCANE), robe, I('Grimório', 'Spellbook'), PACK.scholar], gp: 5 },
      gold('B', 55),
    ],
    spells: spells(3, 4, { mode: 'prepared', spellbook: 6 }),
  },
  // Eberron: Forge of the Artificer (2025) — fora do SRD.
  artificer: {
    hitDie: 8, primary: ['int'], complexity: 'high', saves: ['con', 'int'],
    skills: sk(2, ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleightOfHand']),
    armor: ['light', 'medium', 'shield'], weapons: { categories: ['simple'], ids: [] },
    tools: tools(['thievesTools', 'tinkersTools'], 1, ARTISAN_TOOLS, 'artisan'),
    equipment: [
      { id: 'A', items: [A('studdedLeather'), W('dagger'), T('thievesTools'), T('tinkersTools'), PACK.dungeoneer], gp: 16 },
      gold('B', 150),
    ],
    spells: spells(2, 2, { mode: 'prepared' }),
  },
};

// 2014: mesmos atributos principais e complexidade (guia para iniciante).
const C2014 = {
  barbarian: {
    ...C2024.barbarian,
    weapons: { categories: ['simple', 'martial'], ids: [] },
    equipment: [
      { id: 'A', items: [W('greataxe'), W('handaxe', 2), PACK.explorer, W('javelin', 4)], gp: 0 },
      { id: 'B', items: [W('battleaxe'), W('handaxe', 2), PACK.explorer, W('javelin', 4)], gp: 0 },
      gold('C', 50, '2d4×10'),
    ],
    spells: spells(),
  },
  bard: {
    ...C2024.bard,
    weapons: { categories: ['simple'], ids: ['crossbowHand', 'longsword', 'rapier', 'shortsword'] },
    equipment: [
      { id: 'A', items: [W('rapier'), PACK.diplomat, T('lute'), A('leather'), W('dagger')], gp: 0 },
      { id: 'B', items: [W('longsword'), PACK.entertainer, T('lute'), A('leather'), W('dagger')], gp: 0 },
      gold('C', 125, '5d4×10'),
    ],
    spells: spells(2, 4, { mode: 'known' }),
  },
  cleric: {
    ...C2024.cleric,
    equipment: [
      { id: 'A', items: [W('mace'), A('scaleMail'), W('crossbowLight'), bolts(), PACK.priest, SH, holySymbol], gp: 0 },
      { id: 'B', items: [W('mace'), A('leather'), W('crossbowLight'), bolts(), PACK.explorer, SH, holySymbol], gp: 0 },
      // Só para domínios com armadura pesada / armas marciais (Vida, Tempestade, Guerra…).
      { id: 'C', items: [W('warhammer'), A('chainMail'), W('crossbowLight'), bolts(), PACK.priest, SH, holySymbol], gp: 0 },
      gold('D', 125, '5d4×10'),
    ],
    spells: spells(3, 0, { mode: 'prepared', preparedFormula: { ability: 'wis', levelMult: 1 } }),
  },
  druid: {
    ...C2024.druid,
    armor: ['light', 'medium', 'shield'], // não metálicas
    armorNote: b('Druidas não usam armadura nem escudo de metal.', 'Druids will not wear metal armor or shields.'),
    weapons: { categories: [], ids: ['club', 'dagger', 'dart', 'javelin', 'mace', 'quarterstaff', 'scimitar', 'sickle', 'sling', 'spear'] },
    equipment: [
      { id: 'A', items: [{ ...SH, note: b('de madeira', 'wooden') }, W('scimitar'), A('leather'), PACK.explorer, I('Foco Druídico', 'Druidic Focus')], gp: 0 },
      { id: 'B', items: [W('spear'), W('sling'), A('leather'), PACK.explorer, I('Foco Druídico', 'Druidic Focus')], gp: 0 },
      gold('C', 50, '2d4×10'),
    ],
    spells: spells(2, 0, { mode: 'prepared', preparedFormula: { ability: 'wis', levelMult: 1 } }),
  },
  fighter: {
    ...C2024.fighter,
    skills: sk(2, ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival']),
    equipment: [
      { id: 'A', items: [A('chainMail'), W('longsword'), SH, W('crossbowLight'), bolts(), PACK.dungeoneer], gp: 0 },
      { id: 'B', items: [A('chainMail'), W('greatsword'), W('flail'), W('handaxe', 2), PACK.explorer], gp: 0 },
      { id: 'C', items: [A('leather'), W('longbow'), arrows(), W('shortsword', 2), W('handaxe', 2), PACK.explorer], gp: 0 },
      gold('D', 125, '5d4×10'),
    ],
  },
  monk: {
    ...C2024.monk,
    weapons: { categories: ['simple'], ids: ['shortsword'] },
    equipment: [
      { id: 'A', items: [W('shortsword'), PACK.dungeoneer, W('dart', 10)], gp: 0 },
      { id: 'B', items: [W('spear'), PACK.explorer, W('dart', 10)], gp: 0 },
      gold('C', 12, '5d4'),
    ],
  },
  paladin: {
    ...C2024.paladin,
    equipment: [
      { id: 'A', items: [W('longsword'), SH, W('javelin', 5), PACK.priest, A('chainMail'), holySymbol], gp: 0 },
      { id: 'B', items: [W('greatsword'), W('warhammer'), W('javelin', 5), PACK.explorer, A('chainMail'), holySymbol], gp: 0 },
      gold('C', 125, '5d4×10'),
    ],
    spells: spells(0, 0, { mode: 'none', note: b('Magias só a partir do nível 2.', 'Spells start at level 2.') }),
  },
  ranger: {
    ...C2024.ranger,
    equipment: [
      { id: 'A', items: [A('scaleMail'), W('shortsword', 2), PACK.explorer, W('longbow'), arrows(), quiver], gp: 0 },
      { id: 'B', items: [A('leather'), W('shortsword', 2), PACK.dungeoneer, W('longbow'), arrows(), quiver], gp: 0 },
      gold('C', 125, '5d4×10'),
    ],
    spells: spells(0, 0, { mode: 'none', note: b('Magias só a partir do nível 2.', 'Spells start at level 2.') }),
  },
  rogue: {
    ...C2024.rogue,
    skills: sk(4, ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth']),
    weapons: { categories: ['simple'], ids: ['crossbowHand', 'longsword', 'rapier', 'shortsword'] },
    equipment: [
      { id: 'A', items: [W('rapier'), W('shortbow'), arrows(), quiver, PACK.burglar, A('leather'), W('dagger', 2), T('thievesTools')], gp: 0 },
      { id: 'B', items: [W('shortsword', 2), PACK.burglar, A('leather'), W('dagger', 2), T('thievesTools')], gp: 0 },
      gold('C', 100, '4d4×10'),
    ],
  },
  sorcerer: {
    ...C2024.sorcerer,
    weapons: { categories: [], ids: ['dagger', 'dart', 'sling', 'quarterstaff', 'crossbowLight'] },
    equipment: [
      { id: 'A', items: [W('crossbowLight'), bolts(), componentPouch, PACK.dungeoneer, W('dagger', 2)], gp: 0 },
      { id: 'B', items: [W('quarterstaff'), arcaneFocus('cristal', 'crystal'), PACK.explorer, W('dagger', 2)], gp: 0 },
      gold('C', 75, '3d4×10'),
    ],
    spells: spells(4, 2, { mode: 'known' }),
  },
  warlock: {
    ...C2024.warlock,
    equipment: [
      { id: 'A', items: [W('crossbowLight'), bolts(), componentPouch, PACK.scholar, A('leather'), W('quarterstaff'), W('dagger', 2)], gp: 0 },
      { id: 'B', items: [W('mace'), arcaneFocus('orbe', 'orb'), PACK.dungeoneer, A('leather'), W('spear'), W('dagger', 2)], gp: 0 },
      gold('C', 100, '4d4×10'),
    ],
    spells: spells(2, 2, { mode: 'known' }),
  },
  wizard: {
    ...C2024.wizard,
    skills: sk(2, ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion']),
    weapons: { categories: [], ids: ['dagger', 'dart', 'sling', 'quarterstaff', 'crossbowLight'] },
    equipment: [
      { id: 'A', items: [W('quarterstaff'), componentPouch, PACK.scholar, I('Grimório', 'Spellbook')], gp: 0 },
      { id: 'B', items: [W('dagger'), arcaneFocus('varinha', 'wand'), PACK.explorer, I('Grimório', 'Spellbook')], gp: 0 },
      gold('C', 100, '4d4×10'),
    ],
    spells: spells(3, 0, { mode: 'prepared', spellbook: 6, preparedFormula: { ability: 'int', levelMult: 1 } }),
  },
  // Tasha's Cauldron of Everything (2020).
  artificer: {
    ...C2024.artificer,
    equipment: [
      { id: 'A', items: [A('studdedLeather'), W('crossbowLight'), bolts(), W('dagger'), W('lightHammer'), T('thievesTools'), PACK.dungeoneer], gp: 0 },
      { id: 'B', items: [A('scaleMail'), W('crossbowLight'), bolts(), W('mace'), W('handaxe'), T('thievesTools'), PACK.dungeoneer], gp: 0 },
      gold('C', 125, '5d4×10'),
    ],
    spells: spells(2, 0, { mode: 'prepared', preparedFormula: { ability: 'int', levelMult: 0.5 } }),
  },
};

const withRoles = (table) => Object.fromEntries(Object.entries(table).map(([id, c]) => [id, { ...c, role: ROLES[id] }]));
export const CLASS_START = { '2024': withRoles(C2024), '2014': withRoles(C2014) };

// ---------------------------------------------------------------------------
// Antecedentes
// ---------------------------------------------------------------------------
const tool = (fixed = [], choose = 0, from = [], category = null) => tools(fixed, choose, from, category);
const fifty = gold('B', 50);
const bg24 = (t, items, gp) => ({ tool: t, equipment: [{ id: 'A', items, gp }, fifty] });

const B2024 = {
  acolyte: bg24(tool(['calligraphersSupplies']), [T('calligraphersSupplies'), I('Livro (orações)', 'Book (prayers)'), holySymbol, I('Pergaminho (folhas)', 'Parchment (sheets)', 10), robe], 8),
  artisan: bg24(tool([], 1, ARTISAN_TOOLS, 'artisan'), [CHOSEN('background', 'Ferramenta de artesão escolhida', "Chosen artisan's tools"), pouch(2), travelers], 32),
  charlatan: bg24(tool(['forgeryKit']), [T('forgeryKit'), I('Fantasia', 'Costume'), fine], 15),
  criminal: bg24(tool(['thievesTools']), [W('dagger', 2), T('thievesTools'), I('Pé de Cabra', 'Crowbar'), pouch(2), travelers], 16),
  entertainer: bg24(tool([], 1, INSTRUMENTS, 'instrument'), [CHOSEN('background', 'Instrumento musical escolhido', 'Chosen musical instrument'), I('Fantasia', 'Costume', 2), I('Espelho', 'Mirror'), I('Perfume', 'Perfume'), travelers], 11),
  farmer: bg24(tool(['carpentersTools']), [W('sickle'), T('carpentersTools'), I('Kit de Curandeiro', "Healer's Kit"), I('Panela de Ferro', 'Iron Pot'), I('Pá', 'Shovel'), travelers], 30),
  guard: bg24(tool([], 1, GAMING_SETS, 'gaming'), [W('spear'), W('crossbowLight'), bolts(), CHOSEN('background', 'Jogo escolhido', 'Chosen gaming set'), I('Lanterna Coberta', 'Hooded Lantern'), I('Algemas', 'Manacles'), quiver, travelers], 12),
  guide: bg24(tool(['cartographersTools']), [W('shortbow'), arrows(), T('cartographersTools'), I('Saco de Dormir', 'Bedroll'), quiver, I('Tenda', 'Tent'), travelers], 3),
  hermit: bg24(tool(['herbalismKit']), [W('quarterstaff'), T('herbalismKit'), I('Saco de Dormir', 'Bedroll'), I('Livro (filosofia)', 'Book (philosophy)'), I('Lamparina', 'Lamp'), I('Óleo (frascos)', 'Oil (flasks)', 3), travelers], 16),
  merchant: bg24(tool(['navigatorsTools']), [T('navigatorsTools'), pouch(2), travelers], 22),
  noble: bg24(tool([], 1, GAMING_SETS, 'gaming'), [CHOSEN('background', 'Jogo escolhido', 'Chosen gaming set'), fine, I('Perfume', 'Perfume')], 29),
  sage: bg24(tool(['calligraphersSupplies']), [W('quarterstaff'), T('calligraphersSupplies'), I('Livro (história)', 'Book (history)'), I('Pergaminho (folhas)', 'Parchment (sheets)', 8), robe], 8),
  sailor: bg24(tool(['navigatorsTools']), [W('dagger'), T('navigatorsTools'), I('Corda', 'Rope'), travelers], 20),
  scribe: bg24(tool(['calligraphersSupplies']), [T('calligraphersSupplies'), fine, I('Lamparina', 'Lamp'), I('Óleo (frascos)', 'Oil (flasks)', 3), I('Pergaminho (folhas)', 'Parchment (sheets)', 12)], 23),
  soldier: bg24(tool([], 1, GAMING_SETS, 'gaming'), [W('spear'), W('shortbow'), arrows(), CHOSEN('background', 'Jogo escolhido', 'Chosen gaming set'), I('Kit de Curandeiro', "Healer's Kit"), quiver, travelers], 14),
  wayfarer: bg24(tool(['thievesTools']), [W('dagger', 2), T('thievesTools'), I('Jogo (qualquer um)', 'Gaming Set (any)'), I('Saco de Dormir', 'Bedroll'), pouch(2), travelers], 16),
};

const bg14 = (t, languages, items, gp, feature, featureDesc, extra = {}) =>
  ({ tool: t, languages, equipment: [{ id: 'A', items, gp }], feature, featureDesc, ...extra });
const F = {
  shelter: [b('Abrigo dos Fiéis', 'Shelter of the Faithful'), b('Templos da sua fé te dão abrigo, cura e ajuda.', 'Temples of your faith give you shelter, healing and help.')],
  contact: [b('Contato Criminoso', 'Criminal Contact'), b('Você conhece alguém confiável no submundo para trocar mensagens.', 'You know a reliable underworld contact to pass messages.')],
  rustic: [b('Hospitalidade Rústica', 'Rustic Hospitality'), b('Gente simples te esconde e alimenta.', 'Common folk will hide and feed you.')],
  privilege: [b('Posição de Privilégio', 'Position of Privilege'), b('A nobreza te recebe e as pessoas comuns te tratam com respeito.', 'Nobles welcome you and commoners treat you with respect.')],
  retainers: [b('Criados', 'Retainers'), b('Três servos leais te acompanham (não lutam por você).', 'Three loyal servants follow you (they won\'t fight for you).')],
  researcher: [b('Pesquisador', 'Researcher'), b('Se não sabe algo, sabe onde ou com quem descobrir.', 'If you don\'t know something, you know where or whom to ask.')],
  rank: [b('Patente Militar', 'Military Rank'), b('Soldados do seu antigo exército respeitam sua patente.', 'Soldiers of your former army respect your rank.')],
  discovery: [b('Descoberta', 'Discovery'), b('No isolamento você descobriu um segredo importante (combine com o mestre).', 'In seclusion you found an important secret (agree on it with the DM).')],
  demand: [b('Por Demanda Popular', 'By Popular Demand'), b('Você sempre acha onde se apresentar em troca de comida e abrigo.', 'You can always find a place to perform for food and lodging.')],
  guild: [b('Membro de Guilda', 'Guild Membership'), b('Sua guilda te dá apoio, abrigo e contatos.', 'Your guild gives you support, lodging and contacts.')],
  wanderer: [b('Andarilho', 'Wanderer'), b('Você não se perde e acha comida e água para o grupo.', 'You never get lost and can find food and water for the party.')],
  passage: [b('Passagem de Navio', "Ship's Passage"), b('Você consegue viagem de barco grátis para você e o grupo.', 'You can get free passage on a ship for you and your party.')],
  reputation: [b('Má Reputação', 'Bad Reputation'), b('Sua fama de pirata faz as pessoas deixarem pequenos delitos passarem.', 'Your pirate fame lets you get away with minor crimes.')],
  secrets: [b('Segredos da Cidade', 'City Secrets'), b('Você conhece os atalhos da cidade e anda nela o dobro mais rápido.', 'You know the city\'s shortcuts and travel through it twice as fast.')],
  identity: [b('Identidade Falsa', 'False Identity'), b('Você tem uma segunda identidade, com documentos.', 'You have a second identity, with papers.')],
  watcher: [b('Olho do Vigia', "Watcher's Eye"), b('Você acha postos da guarda e pontos de crime com facilidade.', 'You easily find watch posts and dens of crime.')],
  allEyes: [b('Todos os Olhos em Você', 'All Eyes on You'), b('Seu jeito estrangeiro chama atenção e curiosidade.', 'Your foreign ways draw attention and curiosity.')],
  inheritance: [b('Herança', 'Inheritance'), b('Você guarda um objeto ou conhecimento herdado que outros cobiçam.', 'You keep an inherited item or knowledge others covet.')],
};
const feat = (k) => F[k];

const B2014 = {
  acolyte: bg14(tool(), 2, [holySymbol, I('Livro de Orações', 'Prayer Book'), I('Incenso (varetas)', 'Incense (sticks)', 5), I('Vestes Cerimoniais', 'Vestments'), common], 15, ...feat('shelter')),
  criminal: bg14(tool(['thievesTools'], 1, GAMING_SETS, 'gaming'), 0, [I('Pé de Cabra', 'Crowbar'), I('Roupas Comuns Escuras com Capuz', 'Dark Common Clothes with Hood')], 15, ...feat('contact')),
  folkHero: bg14(tool(['vehiclesLand'], 1, ARTISAN_TOOLS, 'artisan'), 0, [CHOSEN('background', 'Ferramenta de artesão escolhida', "Chosen artisan's tools"), I('Pá', 'Shovel'), I('Panela de Ferro', 'Iron Pot'), common], 10, ...feat('rustic')),
  noble: bg14(tool([], 1, GAMING_SETS, 'gaming'), 1, [fine, I('Anel de Sinete', 'Signet Ring'), I('Pergaminho de Linhagem', 'Scroll of Pedigree')], 25, ...feat('privilege')),
  sage: bg14(tool(), 2, [I('Tinta (frasco)', 'Ink (bottle)'), I('Pena de Escrever', 'Quill'), I('Faca Pequena', 'Small Knife'), I('Carta de um colega falecido', 'Letter from a dead colleague'), common], 10, ...feat('researcher')),
  soldier: bg14(tool(['vehiclesLand'], 1, GAMING_SETS, 'gaming'), 0, [I('Insígnia de Patente', 'Insignia of Rank'), I('Troféu de um inimigo', 'Trophy from a fallen enemy'), CHOSEN('background', 'Jogo escolhido (dados ou cartas)', 'Chosen gaming set (dice or cards)'), common], 10, ...feat('rank')),
  hermit: bg14(tool(['herbalismKit']), 1, [I('Estojo de pergaminhos com anotações', 'Scroll case stuffed with notes'), I('Cobertor de Inverno', 'Winter Blanket'), common, T('herbalismKit')], 5, ...feat('discovery')),
  entertainer: bg14(tool(['disguiseKit'], 1, INSTRUMENTS, 'instrument'), 0, [CHOSEN('background', 'Instrumento musical escolhido', 'Chosen musical instrument'), I('Lembrança de um admirador', 'Favor of an admirer'), I('Fantasia', 'Costume')], 15, ...feat('demand')),
  guildArtisan: bg14(tool([], 1, ARTISAN_TOOLS, 'artisan'), 1, [CHOSEN('background', 'Ferramenta de artesão escolhida', "Chosen artisan's tools"), I('Carta de apresentação da guilda', 'Letter of introduction from your guild'), travelers], 15, ...feat('guild')),
  outlander: bg14(tool([], 1, INSTRUMENTS, 'instrument'), 1, [W('quarterstaff'), I('Armadilha de Caça', 'Hunting Trap'), I('Troféu de um animal', 'Trophy from an animal'), travelers], 10, ...feat('wanderer')),
  sailor: bg14(tool(['navigatorsTools', 'vehiclesWater']), 0, [W('club', 1, b('Malagueta (pino de amarração)', 'Belaying pin')), I('Corda de Seda (15 m)', 'Silk Rope (50 ft)'), I('Amuleto da Sorte', 'Lucky Charm'), common], 10, ...feat('passage')),
  urchin: bg14(tool(['disguiseKit', 'thievesTools']), 0, [I('Faca Pequena', 'Small Knife'), I('Mapa da cidade natal', 'Map of your home city'), I('Rato de Estimação', 'Pet Mouse'), I('Lembrança dos pais', 'Token from your parents'), common], 10, ...feat('secrets')),
  charlatan: bg14(tool(['disguiseKit', 'forgeryKit']), 0, [fine, T('disguiseKit'), I('Ferramentas de trapaça (dados viciados, cartas marcadas…)', 'Tools of the con (loaded dice, marked cards…)')], 15, ...feat('identity')),
  gladiator: bg14(tool(['disguiseKit'], 1, INSTRUMENTS, 'instrument'), 0, [W('trident'), I('Lembrança de um admirador', 'Favor of an admirer'), I('Fantasia', 'Costume')], 15, ...feat('demand')),
  knight: bg14(tool([], 1, GAMING_SETS, 'gaming'), 1, [fine, I('Anel de Sinete', 'Signet Ring'), I('Pergaminho de Linhagem', 'Scroll of Pedigree')], 25, ...feat('retainers')),
  pirate: bg14(tool(['navigatorsTools', 'vehiclesWater']), 0, [W('club', 1, b('Malagueta (pino de amarração)', 'Belaying pin')), I('Corda de Seda (15 m)', 'Silk Rope (50 ft)'), I('Amuleto da Sorte', 'Lucky Charm'), common], 10, ...feat('reputation')),
  spy: bg14(tool(['thievesTools'], 1, GAMING_SETS, 'gaming'), 0, [I('Pé de Cabra', 'Crowbar'), I('Roupas Comuns Escuras com Capuz', 'Dark Common Clothes with Hood')], 15, ...feat('contact')),
  cityWatch: bg14(tool(), 2, [I('Uniforme da Guarda', 'Uniform'), I('Trompa de Sinal', 'Horn'), I('Algemas', 'Manacles')], 10, ...feat('watcher')),
  farTraveler: bg14(tool([], 1, [...INSTRUMENTS, ...GAMING_SETS], 'instrumentOrGaming'), 1, [travelers, CHOSEN('background', 'Instrumento ou jogo escolhido', 'Chosen instrument or gaming set'), I('Mapas mal desenhados da sua terra', 'Poorly wrought maps of your homeland'), I('Joia pequena (10 po)', 'Small piece of jewelry (10 gp)')], 5, ...feat('allEyes')),
  inheritor: bg14(tool([], 1, [...GAMING_SETS, ...INSTRUMENTS], 'instrumentOrGaming'), 1, [I('Herança (objeto, carta ou mapa)', 'Inheritance (item, letter or map)'), travelers, CHOSEN('background', 'Jogo ou instrumento escolhido', 'Chosen gaming set or instrument')], 15, ...feat('inheritance'),
    // SCAG: Sobrevivência + 1 entre Arcanismo, História ou Religião (srd.js fixa Arcanismo).
    { skills: { fixed: ['survival'], choose: 1, from: ['arcana', 'history', 'religion'] } }),
};

export const BACKGROUND_START = { '2024': B2024, '2014': B2014 };

export const classStart = (char, classId = char?.className) => CLASS_START[rv(char)][classId] || null;
export const backgroundStart = (char, bgId = char?.background) => BACKGROUND_START[rv(char)][bgId] || null;

/** Opção de pacote pelo id ('A' | 'B' …). */
export const packFor = (start, packId) => (start?.equipment || []).find(p => p.id === packId) || null;

// ---------------------------------------------------------------------------
// Magias, ferramentas e ouro no nível 1
// ---------------------------------------------------------------------------
/** Truques / magias de 1º círculo / grimório no nível 1, com fórmula 2014 já resolvida. */
export function startingSpells(char, classId = char?.className) {
  const s = classStart(char, classId)?.spells;
  if (!s) return { cantrips: 0, prepared: 0, spellbook: 0, mode: 'none' };
  let prepared = s.prepared || 0;
  if (s.preparedFormula) {
    const mod = Utils.abilityMod(char, s.preparedFormula.ability);
    prepared = Math.max(1, mod + Math.floor((char.level || 1) * s.preparedFormula.levelMult));
  }
  return { cantrips: s.cantrips || 0, prepared, spellbook: s.spellbook || 0, mode: s.mode || ((s.cantrips || s.prepared) ? 'prepared' : 'none') };
}

/** Ferramentas da classe e do antecedente: fixas e escolhas pendentes. */
export function startingTools(char) {
  const c = classStart(char)?.tools || tools();
  const g = backgroundStart(char)?.tool || tools();
  const choices = [];
  if (c.choose) choices.push({ source: 'class', count: c.choose, from: c.from, category: c.category || null });
  if (g.choose) choices.push({ source: 'background', count: g.choose, from: g.from, category: g.category || null });
  return { fixed: [...new Set([...(c.fixed || []), ...(g.fixed || [])])], choices };
}

/**
 * Ouro inicial: pacote da classe (char.creation.classPack) + pacote do antecedente
 * (char.creation.backgroundPack; em 2014 o único pacote 'A' é o padrão). A riqueza
 * inicial de 2014 (replacesBackground) substitui o pacote do antecedente.
 */
export function startingGold(char) {
  const cp = packFor(classStart(char), char?.creation?.classPack);
  const bs = backgroundStart(char);
  const bp = packFor(bs, char?.creation?.backgroundPack || (bs?.equipment?.length === 1 ? 'A' : null));
  const bgGp = cp?.replacesBackground ? 0 : (bp?.gp || 0);
  return (cp?.gp || 0) + bgGp;
}

// ---------------------------------------------------------------------------
// Proficiência com armas e armaduras (ficha e criação)
// ---------------------------------------------------------------------------
// Ao entrar numa classe como multiclasse só vem um subconjunto (PHB 2014 / SRD 5.2.1).
const MC_TRAINING = {
  '2014': {
    barbarian: { armor: ['shield'], weapons: ['simple', 'martial'] },
    bard: { armor: ['light'], weapons: [] },
    cleric: { armor: ['light', 'medium', 'shield'], weapons: [] },
    druid: { armor: ['light', 'medium', 'shield'], weapons: [] },
    fighter: { armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'] },
    monk: { armor: [], weapons: ['simple', 'shortsword'] },
    paladin: { armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'] },
    ranger: { armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'] },
    rogue: { armor: ['light'], weapons: [] },
    sorcerer: { armor: [], weapons: [] },
    warlock: { armor: ['light'], weapons: ['simple'] },
    wizard: { armor: [], weapons: [] },
    artificer: { armor: ['light', 'medium', 'shield'], weapons: [] },
  },
  '2024': {
    barbarian: { armor: ['shield'], weapons: ['martial'] },
    bard: { armor: ['light'], weapons: [] },
    cleric: { armor: ['light', 'medium', 'shield'], weapons: [] },
    druid: { armor: ['light', 'shield'], weapons: [] },
    fighter: { armor: ['light', 'medium', 'shield'], weapons: ['martial'] },
    monk: { armor: [], weapons: [] },
    paladin: { armor: ['light', 'medium', 'shield'], weapons: ['martial'] },
    ranger: { armor: ['light', 'medium', 'shield'], weapons: ['martial'] },
    rogue: { armor: ['light'], weapons: [] },
    sorcerer: { armor: [], weapons: [] },
    warlock: { armor: ['light'], weapons: [] },
    wizard: { armor: [], weapons: [] },
    artificer: { armor: ['light', 'medium', 'shield'], weapons: [] },
  },
};
const WEAPON_CATEGORIES = new Set(['simple', 'martial', 'simple-melee', 'simple-ranged', 'martial-melee', 'martial-ranged']);
const ARMOR_TYPES = new Set(['light', 'medium', 'heavy', 'shield']);

// Concessões vêm com grafias variadas ('Martial', 'martial ranged', 'Shields', 'heavyArmor', ids…).
const normToken = (t) => String(t || '').trim().toLowerCase().replace(/\s+weapons?$/, '').replace(/\s+/g, '-');
function addWeaponToken(out, raw) {
  const t = normToken(raw);
  if (!t) return;
  if (t === 'martialweapons' || t === 'martialweapon') return out.categories.add('martial');
  if (WEAPON_CATEGORIES.has(t)) return out.categories.add(t);
  out.ids.add(t.replace(/-/g, ''));
}
function addArmorToken(out, raw) {
  let t = normToken(raw).replace(/-?armor$/, '').replace(/^shields?.*$/, 'shield');
  if (ARMOR_TYPES.has(t)) out.add(t);
}

function safeGrants(char) {
  try { return Utils.classGrants(char) || {}; } catch { return {}; }
}
function featProficiencies(char) {
  const out = [];
  for (const f of char.feats || []) {
    const def = f?.id ? (findFeat(f.id, rv(char)) || findFeat(f.id)) : null;
    out.push(...(def?.grants?.proficiencies || []));
  }
  return out;
}
const raceDef = (char) => (rv(char) === '2014' ? (SRD.RACES || []).find(r => r.id === char.race) : null);

/** null = classe desconhecida (a ficha não deve marcar nada como sem proficiência). */
export function weaponTraining(char) {
  const entries = char?.className ? Utils.classEntries(char) : [];
  if (!entries.length || !classStart(char, entries[0].id)) return null;
  const out = { categories: new Set(), ids: new Set(), martialProps: new Set() };
  for (const e of entries) {
    const s = classStart(char, e.id);
    if (!s) continue;
    if (e.primary) {
      s.weapons.categories.forEach(c => out.categories.add(c));
      s.weapons.ids.forEach(id => out.ids.add(id.toLowerCase()));
      (s.weapons.martialProps || []).forEach(p => out.martialProps.add(p));
    } else {
      (MC_TRAINING[rv(char)][e.id]?.weapons || []).forEach(t => addWeaponToken(out, t));
    }
  }
  (safeGrants(char).weapons || []).forEach(t => addWeaponToken(out, t));
  featProficiencies(char).forEach(p => { if (/^martialWeapons?$/.test(p)) out.categories.add('martial'); });
  (raceDef(char)?.weapons || []).forEach(id => out.ids.add(String(id).toLowerCase()));
  return out;
}

export function armorTraining(char) {
  const entries = char?.className ? Utils.classEntries(char) : [];
  if (!entries.length || !classStart(char, entries[0].id)) return null;
  const out = new Set();
  for (const e of entries) {
    const s = classStart(char, e.id);
    if (!s) continue;
    (e.primary ? s.armor : (MC_TRAINING[rv(char)][e.id]?.armor || [])).forEach(a => out.add(a));
  }
  (safeGrants(char).armor || []).forEach(t => addArmorToken(out, t));
  featProficiencies(char).forEach(p => addArmorToken(out, p));
  (raceDef(char)?.armor || []).forEach(t => addArmorToken(out, t));
  return out;
}

/** weapon: id ou objeto com id. Arma sem id conhecido (personalizada) conta como proficiente. */
export function isWeaponProficient(char, weapon) {
  const id = typeof weapon === 'string' ? weapon : weapon?.id;
  const def = id ? SRD.weaponFor(id, rv(char)) : null;
  if (!def) return true;
  const tr = weaponTraining(char);
  if (!tr) return true;
  const type = def.type || '';
  if (tr.ids.has(def.id.toLowerCase())) return true;
  for (const c of tr.categories) if (type === c || type.startsWith(`${c}-`)) return true;
  if (type.startsWith('martial') && (def.props || []).some(p => tr.martialProps.has(p))) return true;
  return false;
}

/** armorType: 'light' | 'medium' | 'heavy' | 'shield' ou um id de SRD.ARMOR. */
export function isArmorProficient(char, armorType) {
  if (!armorType) return true;
  const type = ARMOR_TYPES.has(armorType) ? armorType : SRD.ARMOR.find(a => a.id === armorType)?.type;
  if (!type) return true;
  const tr = armorTraining(char);
  return !tr || tr.has(type);
}

/** Itens do pacote sem treino/proficiência (para avisar na etapa de equipamento). */
export function packProficiencyIssues(char, pack) {
  const out = [];
  for (const it of pack?.items || []) {
    if (it.kind === 'armor' && !isArmorProficient(char, it.id)) out.push(it);
    else if (it.kind === 'shield' && !isArmorProficient(char, 'shield')) out.push(it);
    else if (it.kind === 'weapon' && !isWeaponProficient(char, it.id)) out.push(it);
  }
  return out;
}
