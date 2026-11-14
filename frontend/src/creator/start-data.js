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
  shelter: [b('Abrigo dos Fiéis', 'Shelter of the Faithful'), b("Como um acólito, você inspira o respeito daqueles que compartilham da sua fé e pode realizar cerimônias religiosas da sua divindade. Você e seus companheiros de aventura podem esperar receber cura e cuidados gratuitos em um templo, santuário ou outra presença estabelecida da sua fé, embora deva fornecer quaisquer componentes materiais necessários para as magias. Aqueles que compartilham da sua religião sustentarão você (mas apenas você) em um estilo de vida modesto.\n\nVocê também pode ter vínculos com um templo específico dedicado à sua divindade ou panteão escolhido, e possuir uma residência lá. Este pode ser o templo onde você costumava servir, se mantiver boas relações com ele, ou um templo onde encontrou um novo lar. Enquanto estiver perto do seu templo, você pode pedir assistência aos sacerdotes, desde que a ajuda solicitada não seja perigosa e você permaneça em boas relações com o seu templo.", "As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith, though you must provide any material components needed for spells. Those who share your religion will support you (but only you) at a modest lifestyle.\nYou might also have ties to a specific temple dedicated to your chosen deity or pantheon, and you have a residence there. This could be the temple where you used to serve, if you remain on good terms with it, or a temple where you have found a new home. While near your temple, you can call upon the priests for assistance, provided the assistance you ask for is not hazardous and you remain in good standing with your temple.")],
  contact: [b('Contato Criminoso', 'Criminal Contact'), b("Você tem um contato confiável que atua como seu intermediário para uma rede de outros criminosos. Você sabe como enviar e receber mensagens de seu contato, mesmo a grandes distâncias; especificamente, conhece os mensageiros locais, mestres de caravana corruptos e marinheiros desonestos que podem entregar mensagens para você.", "You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.")],
  rustic: [b('Hospitalidade Rústica', 'Rustic Hospitality'), b("Como você vem das fileiras do povo comum, você se enturma entre eles com facilidade. Você pode encontrar um lugar para se esconder, descansar ou se recuperar entre outros plebeus, a menos que tenha demonstrado ser um perigo para eles. Eles o protegerão da lei ou de qualquer outra pessoa que o procure, embora não arrisquem suas vidas por você.", "Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.")],
  privilege: [b('Posição de Privilégio', 'Position of Privilege'), b("Graças ao seu nascimento nobre, as pessoas tendem a pensar o melhor de você. Você é bem-vindo na alta sociedade, e as pessoas presumem que você tem o direito de estar onde quer que esteja. O povo comum faz todo o esforço para acomodá-lo e evitar seu desagrado, e outras pessoas de berço nobre o tratam como membro da mesma esfera social. Você pode conseguir uma audiência com um nobre local se precisar.", "Thanks to your noble birth, people are inclined to think the best of you. You are welcome in high society, and people assume you have the right to be wherever you are. The common folk make every effort to accommodate you and avoid your displeasure, and other people of high birth treat you as a member of the same social sphere. You can secure an audience with a local noble if you need to.")],
  retainers: [b('Criados', 'Retainers'), b("Se seu personagem tiver o antecedente nobre, você pode selecionar esta característica de antecedente em vez de Posição de Privilégio. Você tem ao seu dispor o serviço de três serviçais leais à sua família. Esses serviçais podem ser assistentes ou mensageiros, e um pode ser um mordomo. Seus serviçais são plebeus que podem realizar tarefas mundanas para você, mas não lutam por você, não o seguirão em áreas obviamente perigosas (como masmorras) e irão embora se forem frequentemente colocados em perigo ou maltratados.", "If your character has a noble background, you may select this background feature instead of Position of Privilege. You have the service of three retainers loyal to your family. These retainers can be attendants or messengers, and one might be a majordomo. Your retainers are commoners who can perform mundane tasks for you, but they do not fight for you, will not follow you into obviously dangerous areas (such as dungeons), and will leave if they are frequently endangered or abused.")],
  researcher: [b('Pesquisador', 'Researcher'), b("Quando tenta aprender ou recordar um conhecimento, se você não souber essa informação, frequentemente sabe onde descobrir essa informação e de quem obtê-la. Normalmente, essa informação vem de uma biblioteca, scriptorium, universidade, ou de um sábio ou outra pessoa ou criatura instruída. Seu Mestre pode determinar que o conhecimento que você busca está escondido em um local quase inacessível, ou que simplesmente não pode ser encontrado. Desenterrar os segredos mais profundos do multiverso pode exigir uma aventura ou até mesmo uma campanha inteira.", "When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, or a sage or other learned person or creature. Your DM might rule that the knowledge you seek is secreted away in an almost inaccessible place, or that it simply cannot be found. Unearthing the deepest secrets of the multiverse can require an adventure or even a whole campaign.")],
  rank: [b('Patente Militar', 'Military Rank'), b("Você possui uma patente militar de sua carreira como soldado. Soldados leais à sua antiga organização militar ainda reconhecem sua autoridade e influência, prestando-lhe deferência se forem de patente inferior. Você pode invocar sua patente para exercer influência sobre outros soldados e requisitar equipamentos simples ou cavalos para uso temporário. Você também geralmente consegue acesso a acampamentos militares e fortalezas amigáveis onde sua patente seja reconhecida.", "You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence, and they defer to you if they are of a lower rank. You can invoke your rank to exert influence over other soldiers and requisition simple equipment or horses for temporary use. You can also usually gain access to friendly military encampments and fortresses where your rank is recognized.")],
  discovery: [b('Descoberta', 'Discovery'), b("O isolamento tranquilo de seu prolongado eremitério lhe deu acesso a uma descoberta única e poderosa. A natureza exata dessa revelação depende da natureza de seu isolamento. Pode ser uma grande verdade sobre o cosmos, as divindades, os seres poderosos dos planos exteriores ou as forças da natureza. Pode ser um local que ninguém mais jamais viu. Você pode ter desvendado um fato há muito esquecido ou desenterrado alguma relíquia do passado que poderia reescrever a história. Pode ser uma informação prejudicial às pessoas que o condenaram ao exílio, e daí a razão para seu retorno à sociedade.\nTrabalhe com seu Mestre para determinar os detalhes de sua descoberta e o impacto dela na campanha.", "The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery. The exact nature of this revelation depends on the nature of your seclusion. It might be a great truth about the cosmos, the deities, the powerful beings of the outer planes, or the forces of nature. It could be a site that no one else has ever seen. You might have uncovered a fact that has long been forgotten, or unearthed some relic of the past that could rewrite history. It might be information that would be damaging to the people who consigned you to exile, and hence the reason for your return to society.\nWork with your DM to determine the details of your discovery and its impact on the campaign.")],
  demand: [b('Por Demanda Popular', 'By Popular Demand'), b("Você sempre pode encontrar um lugar para se apresentar, geralmente em uma estalagem ou taverna, mas possivelmente em um circo, teatro ou até mesmo na corte de um nobre. Em tal lugar, você recebe hospedagem e alimentação gratuitas de padrão modesto ou confortável (dependendo da qualidade do estabelecimento), desde que se apresente todas as noites. Além disso, suas apresentações tornam você uma figura local conhecida. Quando estranhos reconhecem você em uma cidade onde você já se apresentou, eles normalmente simpatizam com você.", "You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble's court. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night. In addition, your performance makes you something of a local figure. When strangers recognize you in a town where you have performed, they typically take a liking to you.")],
  guild: [b('Membro de Guilda', 'Guild Membership'), b("Como um membro estabelecido e respeitado de uma guilda, você pode contar com certos benefícios proporcionados por essa filiação. Seus companheiros de guilda fornecerão hospedagem e alimentação se necessário, e pagarão pelo seu funeral se preciso. Em algumas cidades e vilas, a sede da guilda oferece um local central para se reunir com outros membros da sua profissão, o que pode ser um bom lugar para encontrar possíveis patronos, aliados ou contratados.\nAs guildas costumam exercer um tremendo poder político. Se você for acusado de um crime, sua guilda lhe dará suporte se houver uma boa justificativa para sua inocência ou se o crime for justificável. Você também pode obter acesso a figuras políticas poderosas por meio da guilda, caso seja um membro com situação regular. Tais conexões podem exigir a doação de dinheiro ou itens mágicos aos cofres da guilda.\nVocê deve pagar mensalidades de 5 PO por mês para a guilda. Se você atrasar os pagamentos, deverá quitar as dívidas pendentes para permanecer nas boas graças da guilda.", "As an established and respected member of a guild, you can rely on certain benefits that membership provides. Your fellow guild members will provide you with lodging and food if necessary, and pay for your funeral if needed. In some cities and towns, a guildhall offers a central place to meet other members of your profession, which can be a good place to meet potential patrons, allies, or hirelings.\nGuilds often wield tremendous political power. If you are accused of a crime, your guild will support you if a good case can be made for your innocence or the crime is justifiable. You can also gain access to powerful political figures through the guild, if you are a member in good standing. Such connections might require the donation of money or magic items to the guild's coffers.\nYou must pay dues of 5 gp per month to the guild. If you miss payments, you must make up back dues to remain in the guild's good graces.")],
  wanderer: [b('Andarilho', 'Wanderer'), b("Você tem uma memória excelente para mapas e geografia, e pode sempre se lembrar do arranjo geral do terreno, assentamentos e outros elementos ao seu redor. Além disso, você pode encontrar comida e água fresca para si mesmo e para até cinco outras pessoas a cada dia, desde que a terra ofereça bagas, caça pequena, água e assim por diante.", "You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you. In addition, you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.")],
  passage: [b('Passagem de Navio', "Ship's Passage"), b("Quando precisar, você pode conseguir passagem gratuita em um navio veleiro para você e seus companheiros de aventura. Você pode navegar no navio em que serviu ou em outro navio com o qual mantenha boas relações (talvez um capitaneado por um antigo colega de tripulação). Por estar pedindo um favor, você não pode ter certeza de um cronograma ou rota que atenda a todas as suas necessidades. O Mestre determinará quanto tempo leva para chegar aonde você precisa ir. Em troca de sua passagem gratuita, espera-se que você e seus companheiros ajudem a tripulação durante a viagem.", "When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions. You might sail on the ship you served on, or another ship you have good relations with (perhaps one captained by a former crewmate). Because you're calling in a favor, you can't be certain of a schedule or route that will meet your every need. Your Dungeon Master will determine how long it takes to get where you need to go. In return for your free passage, you and your companions are expected to assist the crew during the voyage.")],
  reputation: [b('Má Reputação', 'Bad Reputation'), b("Se o seu personagem tem o antecedente marinheiro, você pode selecionar esta característica de antecedente em vez de Passagem de Navio.\nNão importa aonde você vá, as pessoas têm medo de você devido à sua reputação. Quando você está em um assentamento civilizado, pode se safar de infrações criminais menores, como se recusar a pagar por comida em uma taverna ou arrombar portas em uma loja local, já que a maioria das pessoas não denunciará sua atividade às autoridades.", "If your character has a sailor background, you may select this background feature instead of Ship's Passage.\nNo matter where you go, people are afraid of you due to your reputation. When you are in a civilized settlement, you can get away with minor criminal offenses, such as refusing to pay for food at a tavern or breaking down doors at a local shop, since most people will not report your activity to the authorities.")],
  secrets: [b('Segredos da Cidade', 'City Secrets'), b("Você conhece os padrões e o fluxo secretos das cidades e pode encontrar passagens pela malha urbana que outros perderiam. Quando não estiver em combate, você (e os companheiros que você lidera) podem viajar entre quaisquer dois locais na cidade com o dobro da velocidade que seu deslocamento normalmente permitiria.", "You know the secret patterns and flow to cities and can find passages through the urban sprawl that others would miss. When you are not in combat, you (and companions you lead) can travel between any two locations in the city twice as fast as your speed would normally allow.")],
  identity: [b('Identidade Falsa', 'False Identity'), b("Você criou uma segunda identidade que inclui documentação, conhecidos estabelecidos e disfarces que permitem a você assumir essa persona. Além disso, você pode falsificar documentos, incluindo papéis oficiais e cartas pessoais, desde que tenha visto um exemplo do tipo de documento ou da caligrafia que está tentando copiar.", "You have created a second identity that includes documentation, established acquaintances, and disguises that allow you to assume that persona. Additionally, you can forge documents including official papers and personal letters, as long as you have seen an example of the kind of document or the handwriting you are trying to copy.")],
  watcher: [b('Olho do Vigia', "Watcher's Eye"), b("Sua experiência em aplicar a lei e lidar com criminosos dá a você uma percepção das leis e dos criminosos locais. Você pode facilmente encontrar o posto avançado local da patrulha ou de uma organização similar, e com a mesma facilidade identificar os antros de atividade criminosa em uma comunidade, embora seja mais provável que você seja bem-vindo nos primeiros locais do que nos últimos.", "Your experience in enforcing the law, and dealing with lawbreakers, gives you a feel for local laws and criminals. You can easily find the local outpost of the watch or a similar organization, and just as easily pick out the dens of criminal activity in a community, although you're more likely to be welcome in the former locations rather than the latter.")],
  allEyes: [b('Todos os Olhos em Você', 'All Eyes on You'), b("Seu sotaque, maneirismos, figuras de linguagem e talvez até sua aparência o marcam como estrangeiro. Olhares curiosos são direcionados a você onde quer que vá, o que pode ser um incômodo, mas você também ganha o interesse amigável de eruditos e outros intrigados por terras distantes, sem falar das pessoas comuns que estão ansiosas para ouvir histórias de sua terra natal.\nVocê pode transformar essa atenção em acesso a pessoas e lugares que de outra forma não teria, para você e seus companheiros de viagem. Nobres lordes, eruditos e príncipes mercadores, para citar alguns, podem estar interessados em ouvir sobre sua distante terra natal e seu povo.", "Your accent, mannerisms, figures of speech, and perhaps even your appearance all mark you as foreign. Curious glances are directed your way wherever you go, which can be a nuisance, but you also gain the friendly interest of scholars and others intrigued by far-off lands, to say nothing of everyday folk who are eager to hear stories of your homeland.\nYou can parley this attention into access to people and places you might not otherwise have, for you and your traveling companions. Noble lords, scholars, and merchant princes, to name a few, might be interested in hearing about your distant homeland and people.")],
  inheritance: [b('Herança', 'Inheritance'), b("Escolha ou determine aleatoriamente sua herança dentre as possibilidades na tabela abaixo. Trabalhe com seu Mestre do Calabouço para criar os detalhes: por que sua herança é tão importante e qual é a história completa dela? Você pode preferir que o Mestre invente esses detalhes como parte do jogo, permitindo que você descubra mais sobre sua herança conforme seu personagem o faz.\nO Mestre do Calabouço tem a liberdade de usar sua herança como um gancho de história, enviando você em missões para aprender mais sobre sua história ou verdadeira natureza, ou confrontando você com inimigos que desejam reivindicá-la para si ou impedi-lo de aprender o que busca. O Mestre também determina as propriedades de sua herança e como elas se inserem na história e importância do item. Por exemplo, o objeto pode ser um item mágico menor, ou um que começa com uma habilidade modesta e aumenta de potência com a passagem do tempo. Ou a verdadeira natureza de sua herança pode não ser aparente no início e ser revelada apenas quando certas condições forem atendidas.\nAo iniciar sua carreira de aventureiro, você pode decidir se quer contar aos seus companheiros sobre sua herança imediatamente. Em vez de atrair atenção para si mesmo, você pode preferir manter sua herança em segredo até aprender mais sobre o que ela significa para você e o que ela pode fazer por você.\nHerança (Objeto ou Item d8): 1: Um documento como um mapa, uma carta ou um diário; 2-3: Uma bugiganga; 4: Uma peça de vestuário; 5: Uma joia; 6: Um livro ou formulário arcano; 7: Uma história, canção, poema ou segredo escrito; 8: Uma tatuagem ou outra marca corporal.", "Choose or randomly determine your inheritance from among the possibilities in the table below. Work with your Dungeon Master to come up with details: Why is your inheritance so important, and what is its full story? You might prefer for the DM to invent these details as part of the game, allowing you to learn more about your inheritance as your character does.\nThe Dungeon Master is free to use your inheritance as a story hook, sending you on quests to learn more about its history or true nature, or confronting you with foes who want to claim it for themselves or prevent you from learning what you seek. The DM also determines the properties of your inheritance and how they figure into the item's history and importance. For instance, the object might be a minor magic item, or one that begins with a modest ability and increases in potency with the passage of time. Or, the true nature of your inheritance might not be apparent at first and is revealed only when certain conditions are met.\nWhen you begin your adventuring career, you can decide whether to tell your companions about your inheritance right away. Rather than attracting attention to yourself, you might want to keep your inheritance a secret until you learn more about what it means to you and what it can do for you.\nInheritance (d8 Object or Item): 1: A document such as a map, a letter, or a journal; 2-3: A trinket; 4: An article of clothing; 5: A piece of jewelry; 6: An arcane book or formulary; 7: A written story, song, poem, or secret; 8: A tattoo or other body marking.")],
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
