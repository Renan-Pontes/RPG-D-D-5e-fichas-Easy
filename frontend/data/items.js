/**
 * Catálogo de itens SRD 5.1 — armas, armaduras, gear, poções, itens mágicos básicos.
 *
 * Cada item tem um `sourceId` único pro catálogo. Quando o DM "dá" o item ao
 * jogador, criamos uma INSTÂNCIA em `data.equipment` com um `id` UUID próprio
 * (item-instance), copiando os stats do catálogo.
 *
 * Formato:
 *  { sourceId, name {pt,en}, type, weight?, cost?,
 *    weapon? : {damage, dmgType, props[], range?},
 *    armor?  : {ac, type, stealth?, strReq?},
 *    magic?  : {rarity, attunement: bool, effect{pt,en}},
 *    description? {pt,en} }
 *
 * `type`: 'weapon' | 'armor' | 'shield' | 'gear' | 'potion' | 'magic'
 */

const I = (sourceId, name, type, extra = {}) => ({ sourceId, name, type, ...extra });

const ITEMS = [
  // ============================================================
  // ARMAS SIMPLES — CORPO A CORPO
  // ============================================================
  I('club',          { pt: 'Clava',           en: 'Club' },          'weapon', { weapon: { damage: '1d4',  dmgType: 'bludgeoning', props: ['light'] } }),
  I('dagger',        { pt: 'Adaga',           en: 'Dagger' },        'weapon', { weapon: { damage: '1d4',  dmgType: 'piercing',    props: ['finesse','light','thrown'] } }),
  I('greatclub',     { pt: 'Clava Grande',    en: 'Greatclub' },     'weapon', { weapon: { damage: '1d8',  dmgType: 'bludgeoning', props: ['two-handed'] } }),
  I('handaxe',       { pt: 'Machadinha',      en: 'Handaxe' },       'weapon', { weapon: { damage: '1d6',  dmgType: 'slashing',    props: ['light','thrown'] } }),
  I('javelin',       { pt: 'Azagaia',         en: 'Javelin' },       'weapon', { weapon: { damage: '1d6',  dmgType: 'piercing',    props: ['thrown'] } }),
  I('lightHammer',   { pt: 'Martelo Leve',    en: 'Light Hammer' },  'weapon', { weapon: { damage: '1d4',  dmgType: 'bludgeoning', props: ['light','thrown'] } }),
  I('mace',          { pt: 'Maça',            en: 'Mace' },          'weapon', { weapon: { damage: '1d6',  dmgType: 'bludgeoning', props: [] } }),
  I('quarterstaff',  { pt: 'Bordão',          en: 'Quarterstaff' },  'weapon', { weapon: { damage: '1d6',  dmgType: 'bludgeoning', props: ['versatile'] } }),
  I('sickle',        { pt: 'Foice',           en: 'Sickle' },        'weapon', { weapon: { damage: '1d4',  dmgType: 'slashing',    props: ['light'] } }),
  I('spear',         { pt: 'Lança',           en: 'Spear' },         'weapon', { weapon: { damage: '1d6',  dmgType: 'piercing',    props: ['thrown','versatile'] } }),

  // ARMAS SIMPLES — DISTÂNCIA
  I('crossbowLight', { pt: 'Besta Leve',      en: 'Light Crossbow' }, 'weapon', { weapon: { damage: '1d8', dmgType: 'piercing',   props: ['ammo','loading','two-handed'], range: '80/320' } }),
  I('dart',          { pt: 'Dardo',           en: 'Dart' },          'weapon', { weapon: { damage: '1d4',  dmgType: 'piercing',   props: ['finesse','thrown'], range: '20/60' } }),
  I('shortbow',      { pt: 'Arco Curto',      en: 'Shortbow' },      'weapon', { weapon: { damage: '1d6',  dmgType: 'piercing',   props: ['ammo','two-handed'], range: '80/320' } }),
  I('sling',         { pt: 'Funda',           en: 'Sling' },         'weapon', { weapon: { damage: '1d4',  dmgType: 'bludgeoning', props: ['ammo'], range: '30/120' } }),

  // ARMAS MARCIAIS — CORPO A CORPO
  I('battleaxe',     { pt: 'Machado de Batalha', en: 'Battleaxe' },   'weapon', { weapon: { damage: '1d8',  dmgType: 'slashing',    props: ['versatile'] } }),
  I('flail',         { pt: 'Mangual',         en: 'Flail' },          'weapon', { weapon: { damage: '1d8',  dmgType: 'bludgeoning', props: [] } }),
  I('glaive',        { pt: 'Alabarda',        en: 'Glaive' },         'weapon', { weapon: { damage: '1d10', dmgType: 'slashing',    props: ['heavy','reach','two-handed'] } }),
  I('greataxe',      { pt: 'Machado Grande',  en: 'Greataxe' },       'weapon', { weapon: { damage: '1d12', dmgType: 'slashing',    props: ['heavy','two-handed'] } }),
  I('greatsword',    { pt: 'Espada Grande',   en: 'Greatsword' },     'weapon', { weapon: { damage: '2d6',  dmgType: 'slashing',    props: ['heavy','two-handed'] } }),
  I('halberd',       { pt: 'Halberda',        en: 'Halberd' },        'weapon', { weapon: { damage: '1d10', dmgType: 'slashing',    props: ['heavy','reach','two-handed'] } }),
  I('lance',         { pt: 'Lança Montada',   en: 'Lance' },          'weapon', { weapon: { damage: '1d12', dmgType: 'piercing',    props: ['reach','special'] } }),
  I('longsword',     { pt: 'Espada Longa',    en: 'Longsword' },      'weapon', { weapon: { damage: '1d8',  dmgType: 'slashing',    props: ['versatile'] } }),
  I('maul',          { pt: 'Marreta',         en: 'Maul' },           'weapon', { weapon: { damage: '2d6',  dmgType: 'bludgeoning', props: ['heavy','two-handed'] } }),
  I('morningstar',   { pt: 'Mangrenata',      en: 'Morningstar' },    'weapon', { weapon: { damage: '1d8',  dmgType: 'piercing',    props: [] } }),
  I('pike',          { pt: 'Pique',           en: 'Pike' },           'weapon', { weapon: { damage: '1d10', dmgType: 'piercing',    props: ['heavy','reach','two-handed'] } }),
  I('rapier',        { pt: 'Florete',         en: 'Rapier' },         'weapon', { weapon: { damage: '1d8',  dmgType: 'piercing',    props: ['finesse'] } }),
  I('scimitar',      { pt: 'Cimitarra',       en: 'Scimitar' },       'weapon', { weapon: { damage: '1d6',  dmgType: 'slashing',    props: ['finesse','light'] } }),
  I('shortsword',    { pt: 'Espada Curta',    en: 'Shortsword' },     'weapon', { weapon: { damage: '1d6',  dmgType: 'piercing',    props: ['finesse','light'] } }),
  I('trident',       { pt: 'Tridente',        en: 'Trident' },        'weapon', { weapon: { damage: '1d6',  dmgType: 'piercing',    props: ['thrown','versatile'] } }),
  I('warhammer',     { pt: 'Martelo de Guerra', en: 'Warhammer' },    'weapon', { weapon: { damage: '1d8',  dmgType: 'bludgeoning', props: ['versatile'] } }),
  I('whip',          { pt: 'Chicote',         en: 'Whip' },           'weapon', { weapon: { damage: '1d4',  dmgType: 'slashing',    props: ['finesse','reach'] } }),

  // ARMAS MARCIAIS — DISTÂNCIA
  I('crossbowHand',  { pt: 'Besta de Mão',    en: 'Hand Crossbow' },  'weapon', { weapon: { damage: '1d6',  dmgType: 'piercing',    props: ['ammo','light','loading'], range: '30/120' } }),
  I('crossbowHeavy', { pt: 'Besta Pesada',    en: 'Heavy Crossbow' }, 'weapon', { weapon: { damage: '1d10', dmgType: 'piercing',    props: ['ammo','heavy','loading','two-handed'], range: '100/400' } }),
  I('longbow',       { pt: 'Arco Longo',      en: 'Longbow' },        'weapon', { weapon: { damage: '1d8',  dmgType: 'piercing',    props: ['ammo','heavy','two-handed'], range: '150/600' } }),

  // ============================================================
  // ARMADURAS
  // ============================================================
  I('padded',         { pt: 'Acolchoada',         en: 'Padded' },         'armor', { armor: { ac: 11, type: 'light',  stealth: 'disadv' } }),
  I('leather',        { pt: 'Couro',              en: 'Leather' },        'armor', { armor: { ac: 11, type: 'light'  } }),
  I('studdedLeather', { pt: 'Couro Batido',       en: 'Studded Leather' },'armor', { armor: { ac: 12, type: 'light'  } }),
  I('hide',           { pt: 'Couro Cru',          en: 'Hide' },           'armor', { armor: { ac: 12, type: 'medium' } }),
  I('chainShirt',     { pt: 'Cota de Cordames',   en: 'Chain Shirt' },    'armor', { armor: { ac: 13, type: 'medium' } }),
  I('scaleMail',      { pt: 'Cota de Escamas',    en: 'Scale Mail' },     'armor', { armor: { ac: 14, type: 'medium', stealth: 'disadv' } }),
  I('breastplate',    { pt: 'Peitoral',           en: 'Breastplate' },    'armor', { armor: { ac: 14, type: 'medium' } }),
  I('halfPlate',      { pt: 'Meio-Placa',         en: 'Half Plate' },     'armor', { armor: { ac: 15, type: 'medium', stealth: 'disadv' } }),
  I('ringMail',       { pt: 'Cota de Anéis',      en: 'Ring Mail' },      'armor', { armor: { ac: 14, type: 'heavy',  stealth: 'disadv' } }),
  I('chainMail',      { pt: 'Cota de Malha',      en: 'Chain Mail' },     'armor', { armor: { ac: 16, type: 'heavy',  stealth: 'disadv', strReq: 13 } }),
  I('splint',         { pt: 'Talas',              en: 'Splint' },         'armor', { armor: { ac: 17, type: 'heavy',  stealth: 'disadv', strReq: 15 } }),
  I('plate',          { pt: 'Placas Completas',   en: 'Plate' },          'armor', { armor: { ac: 18, type: 'heavy',  stealth: 'disadv', strReq: 15 } }),
  I('shield',         { pt: 'Escudo',             en: 'Shield' },         'shield', { armor: { ac: 2,  type: 'shield' } }),

  // ============================================================
  // ADVENTURING GEAR
  // ============================================================
  I('backpack',     { pt: 'Mochila',          en: 'Backpack' },         'gear'),
  I('bedroll',      { pt: 'Saco de Dormir',   en: 'Bedroll' },          'gear'),
  I('blanket',      { pt: 'Cobertor',         en: 'Blanket' },          'gear'),
  I('rope50ft',     { pt: 'Corda 50 pés',     en: 'Rope (50 ft)' },     'gear'),
  I('torch',        { pt: 'Tocha',            en: 'Torch' },            'gear'),
  I('rations',      { pt: 'Rações (1 dia)',   en: 'Rations (1 day)' },  'gear'),
  I('waterskin',    { pt: 'Cantil',           en: 'Waterskin' },        'gear'),
  I('tinderbox',    { pt: 'Isqueiro',         en: 'Tinderbox' },        'gear'),
  I('lantern',      { pt: 'Lanterna',         en: 'Lantern' },          'gear'),
  I('oilFlask',     { pt: 'Frasco de Óleo',   en: 'Oil Flask' },        'gear'),
  I('candle',       { pt: 'Vela',             en: 'Candle' },           'gear'),
  I('crowbar',      { pt: 'Pé-de-cabra',      en: 'Crowbar' },          'gear'),
  I('hammer',       { pt: 'Martelo',          en: 'Hammer' },           'gear'),
  I('piton',        { pt: 'Estaca',           en: 'Piton' },            'gear'),
  I('grappling',    { pt: 'Gancho',           en: 'Grappling Hook' },   'gear'),
  I('chain10ft',    { pt: 'Corrente 10 pés',  en: 'Chain (10 ft)' },    'gear'),
  I('manaclesIron', { pt: 'Manilhas de Ferro', en: 'Iron Manacles' },   'gear'),
  I('lockSimple',   { pt: 'Cadeado Simples',  en: 'Lock' },             'gear'),
  I('thievesTools', { pt: 'Ferramentas de Ladrão', en: 'Thieves\' Tools' }, 'gear'),
  I('healersKit',   { pt: 'Kit de Curandeiro', en: "Healer's Kit" },    'gear'),
  I('explorersPack', { pt: 'Mochila do Explorador', en: 'Explorer\'s Pack' }, 'gear'),
  I('dungeoneersPack', { pt: 'Mochila de Aventureiro', en: 'Dungeoneer\'s Pack' }, 'gear'),
  I('priestPack',   { pt: 'Mochila do Sacerdote', en: 'Priest\'s Pack' }, 'gear'),
  I('scholarPack',  { pt: 'Mochila do Estudioso', en: 'Scholar\'s Pack' }, 'gear'),
  I('arrows20',     { pt: 'Flechas (20)',    en: 'Arrows (20)' },       'gear'),
  I('boltsXbow20',  { pt: 'Virotes (20)',    en: 'Crossbow Bolts (20)' }, 'gear'),
  I('slingBullets20', { pt: 'Balas de Funda (20)', en: 'Sling Bullets (20)' }, 'gear'),
  I('component',    { pt: 'Bolsa de Componentes', en: 'Component Pouch' }, 'gear'),
  I('holySymbol',   { pt: 'Símbolo Sagrado', en: 'Holy Symbol' },        'gear'),
  I('focus',        { pt: 'Foco Arcano',     en: 'Arcane Focus' },       'gear'),
  I('druidFocus',   { pt: 'Foco Druídico',   en: 'Druidic Focus' },      'gear'),
  I('spellbook',    { pt: 'Livro de Magias', en: 'Spellbook' },          'gear'),

  // ============================================================
  // POÇÕES E CONSUMÍVEIS
  // ============================================================
  I('potionHealing',     { pt: 'Poção de Cura',         en: 'Potion of Healing' },        'potion', { description: { pt: 'Recupera 2d4+2 HP.', en: 'Regain 2d4+2 HP.' } }),
  I('potionHealingGreater', { pt: 'Poção de Cura Maior', en: 'Potion of Greater Healing' }, 'potion', { description: { pt: 'Recupera 4d4+4 HP.', en: 'Regain 4d4+4 HP.' } }),
  I('potionHealingSuperior', { pt: 'Poção de Cura Superior', en: 'Potion of Superior Healing' }, 'potion', { description: { pt: 'Recupera 8d4+8 HP.', en: 'Regain 8d4+8 HP.' } }),
  I('potionHealingSupreme',  { pt: 'Poção de Cura Suprema',  en: 'Potion of Supreme Healing' },  'potion', { description: { pt: 'Recupera 10d4+20 HP.', en: 'Regain 10d4+20 HP.' } }),
  I('antitoxin',         { pt: 'Antitoxina',           en: 'Antitoxin' },               'potion', { description: { pt: 'Vantagem em SAL CON contra veneno por 1h.', en: 'Advantage on CON saves vs poison for 1h.' } }),
  I('holyWater',         { pt: 'Água Benta',           en: 'Holy Water' },              'potion', { description: { pt: 'Arremesse: 2d6 radiante a celestiais/mortos-vivos.', en: 'Thrown: 2d6 radiant to fiends/undead.' } }),
  I('alchemistFire',     { pt: 'Fogo Alquímico',       en: 'Alchemist\'s Fire' },       'potion', { description: { pt: 'Arremesse: 1d4 fogo/turno até apagar (ação).', en: 'Thrown: 1d4 fire per turn until extinguished.' } }),
  I('acidVial',          { pt: 'Frasco de Ácido',      en: 'Vial of Acid' },            'potion', { description: { pt: 'Arremesse: 2d6 ácido.', en: 'Thrown: 2d6 acid.' } }),
  I('potionResistance',  { pt: 'Poção de Resistência', en: 'Potion of Resistance' },    'potion', { description: { pt: 'Resistência a um tipo de dano por 1h.', en: 'Resistance to one damage type for 1h.' } }),
  I('potionClimbing',    { pt: 'Poção de Escalada',    en: 'Potion of Climbing' },      'potion', { description: { pt: 'Velocidade de escalada igual à de caminhar por 1h.', en: 'Climb speed = walking speed for 1h.' } }),
  I('potionWaterBreath', { pt: 'Poção de Respiração Aquática', en: 'Potion of Water Breathing' }, 'potion', { description: { pt: 'Respira em água por 1h.', en: 'Breathe water for 1h.' } }),

  // ============================================================
  // ITENS MÁGICOS BÁSICOS (com attunement quando aplicável)
  // ============================================================
  I('weapon+1',    { pt: 'Arma +1',         en: 'Weapon +1' },         'magic', { magic: { rarity: 'uncommon', attunement: false, effect: { pt: '+1 em ataque e dano com esta arma.', en: '+1 to attack and damage with this weapon.' } } }),
  I('weapon+2',    { pt: 'Arma +2',         en: 'Weapon +2' },         'magic', { magic: { rarity: 'rare', attunement: false, effect: { pt: '+2 em ataque e dano.', en: '+2 to attack and damage.' } } }),
  I('weapon+3',    { pt: 'Arma +3',         en: 'Weapon +3' },         'magic', { magic: { rarity: 'very-rare', attunement: false, effect: { pt: '+3 em ataque e dano.', en: '+3 to attack and damage.' } } }),
  I('armor+1',     { pt: 'Armadura +1',     en: 'Armor +1' },          'magic', { magic: { rarity: 'rare', attunement: false, effect: { pt: '+1 CA.', en: '+1 AC.' } } }),
  I('armor+2',     { pt: 'Armadura +2',     en: 'Armor +2' },          'magic', { magic: { rarity: 'very-rare', attunement: false, effect: { pt: '+2 CA.', en: '+2 AC.' } } }),
  I('shield+1',    { pt: 'Escudo +1',       en: 'Shield +1' },         'magic', { magic: { rarity: 'uncommon', attunement: false, effect: { pt: '+1 CA além do escudo normal.', en: '+1 AC on top of regular shield.' } } }),
  I('bagHolding',  { pt: 'Bolsa de Conter', en: 'Bag of Holding' },    'magic', { magic: { rarity: 'uncommon', attunement: false, effect: { pt: 'Carrega até 500 lb em espaço extradimensional.', en: 'Holds up to 500 lb in extradimensional space.' } } }),
  I('bootsElven',  { pt: 'Botas Élficas',   en: 'Boots of Elvenkind' }, 'magic', { magic: { rarity: 'uncommon', attunement: false, effect: { pt: 'Passos silenciosos. Vantagem em Furtividade (mover).', en: 'Silent steps. Advantage on Stealth (movement).' } } }),
  I('cloakElven',  { pt: 'Capa Élfica',     en: 'Cloak of Elvenkind' },'magic', { magic: { rarity: 'uncommon', attunement: true, effect: { pt: 'Vantagem em Furtividade; desvantagem em Percepção contra você.', en: 'Advantage on Stealth; disadvantage on Perception to find you.' } } }),
  I('ringProt',    { pt: 'Anel de Proteção', en: 'Ring of Protection' }, 'magic', { magic: { rarity: 'rare', attunement: true, effect: { pt: '+1 CA e em todos os SAL.', en: '+1 AC and to all saves.' } } }),
  I('ringFire',    { pt: 'Anel de Resistência ao Fogo', en: 'Ring of Fire Resistance' }, 'magic', { magic: { rarity: 'rare', attunement: true, effect: { pt: 'Resistência a fogo.', en: 'Resistance to fire damage.' } } }),
  I('amuletProt',  { pt: 'Amuleto de Proteção', en: 'Amulet of Health' }, 'magic', { magic: { rarity: 'rare', attunement: true, effect: { pt: 'CON 19 (mín).', en: 'CON becomes 19 (min).' } } }),
  I('wandWeb',     { pt: 'Varinha da Teia', en: 'Wand of Web' },        'magic', { magic: { rarity: 'uncommon', attunement: true, effect: { pt: '7 cargas. Lança Teia (DC 13).', en: '7 charges. Cast Web (DC 13).' } } }),
  I('scrollFireball', { pt: 'Pergaminho de Bola de Fogo', en: 'Scroll of Fireball' }, 'magic', { magic: { rarity: 'uncommon', attunement: false, effect: { pt: 'Lança Fireball uma vez.', en: 'Cast Fireball once.' } } }),
  I('immovableRod', { pt: 'Bastão Imóvel',  en: 'Immovable Rod' },      'magic', { magic: { rarity: 'uncommon', attunement: false, effect: { pt: 'Botão prende no ar; aguenta 8000 lb.', en: 'Button locks in air, holds 8000 lb.' } } }),
  I('handyHaversack', { pt: 'Mochila Útil', en: 'Handy Haversack' },    'magic', { magic: { rarity: 'rare', attunement: false, effect: { pt: '3 compartimentos extradimensionais.', en: '3 extradimensional compartments.' } } }),
];

const ITEMS_BY_ID = Object.fromEntries(ITEMS.map(it => [it.sourceId, it]));

// Tipos pra filtro
const ITEM_TYPES = ['weapon', 'armor', 'shield', 'gear', 'potion', 'magic'];

/** Cria uma INSTÂNCIA do item pra colocar em data.equipment do personagem. */
function instantiate(sourceItem, overrides = {}) {
  const baseName = typeof sourceItem.name === 'string' ? sourceItem.name : (sourceItem.name?.pt || sourceItem.name?.en || 'item');
  return {
    id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    sourceId: sourceItem.sourceId,
    name: baseName,
    type: sourceItem.type,
    qty: 1,
    equipped: false,
    broken: false,
    attunement: !!(sourceItem.magic && sourceItem.magic.attunement),
    attuned: false,
    notes: '',
    // Stats inline (pra não depender do catálogo client-side se importar/exportar)
    weapon: sourceItem.weapon,
    armor: sourceItem.armor,
    magic: sourceItem.magic,
    description: sourceItem.description,
    ...overrides,
  };
}

export { ITEMS, ITEMS_BY_ID, ITEM_TYPES, instantiate };
export default ITEMS;
