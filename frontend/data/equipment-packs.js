/*
 * Pacotes de equipamento (Explorer's Pack, Dungeoneer's Pack…): o que vem
 * dentro de cada um, pela regra da ficha. Só os dados (sem texto copiado):
 *   2014 = SRD 5.1 (CC-BY-4.0), capítulo Equipment, "Equipment Packs";
 *   2024 = SRD 5.2.1 (CC-BY-4.0), capítulo Equipment, tabela "Adventuring
 *          Gear" (verbetes Burglar's Pack … Scholar's Pack).
 * Os conteúdos mudaram entre as edições (2024 tira o kit de refeição do
 * Explorador e o martelo/pítons da Masmorra, põe óleo, estrepes, lamparina…).
 * O texto corrido dos mesmos pacotes, mostrado na criação, fica em
 * src/creator/equipment-helpers.js (PACK_CONTENTS); tests/packs.test.js
 * confere que os dois batem (quantidade de itens e números).
 *
 * PACK_GEAR — cada coisa que aparece num pacote:
 *   id       sourceId de data/items.js (nome traduzido, tipo, descrição e arte
 *            vêm do catálogo); sem id → item de texto com `name` {pt,en};
 *   weight   libras por unidade (tabela Adventuring Gear do SRD; "—" no livro
 *            = sem peso); { '2014': n, '2024': n } quando muda de edição;
 *   artId    arte emprestada de outro item do catálogo (lanterna, livro…);
 *   aliases  outros nomes do mesmo item na ficha (os da criação, plurais),
 *            para somar com o que o personagem já tem.
 *
 * PACKS — chave = a de SRD.PACKS / start-data.js (explorer, dungeoneer…):
 *   name       nome mostrado (o mesmo da criação, start-data.js);
 *   catalogId  sourceId do pacote em data/items.js, quando existe;
 *   words      palavras que reconhecem o pacote por nome em pt ("pacote/kit/
 *              mochila de|do <palavra>"); `en` idem em inglês;
 *   contents   { regra: [[chave de PACK_GEAR, quantidade?], …] } na ordem do SRD.
 */
const b = (pt, en) => ({ pt, en });

export const PACK_GEAR = {
  // Itens que o catálogo (data/items.js) já conhece.
  backpack: { id: 'backpack', weight: 5 },
  bedroll: { id: 'bedroll', weight: 7 },
  blanket: { id: 'blanket', weight: 3 },
  rope: { id: 'rope50ft', weight: { '2014': 10, '2024': 5 }, aliases: ['Corda', 'Rope', 'Corda (15 m)', 'Corda de Cânhamo (15 m)', 'Hempen Rope (50 feet)'] },
  torch: { id: 'torch', weight: 1, aliases: ['Tochas', 'Torches'] },
  rations: { id: 'rations', weight: 2, aliases: ['Rações', 'Rations', 'Ração'] },
  waterskin: { id: 'waterskin', weight: 5, aliases: ['Odre'] },
  tinderbox: { id: 'tinderbox', weight: 1, aliases: ['Pederneira'] },
  oil: { id: 'oilFlask', weight: 1, aliases: ['Óleo (frascos)', 'Oil (flasks)', 'Óleo', 'Oil', 'Frascos de Óleo', 'Flask of Oil'] },
  candle: { id: 'candle', aliases: ['Velas', 'Candles'] },
  crowbar: { id: 'crowbar', weight: 5 },
  hammer: { id: 'hammer', weight: 3 },
  piton: { id: 'piton', weight: 0.25, aliases: ['Píton', 'Pítons', 'Pitons'] },
  holyWater: { id: 'holyWater', weight: 1, aliases: ['Água Benta (frasco)', 'Holy Water (flask)'] },
  // Itens de texto (o catálogo não tem): nomes como os da criação quando existem lá.
  ballBearings: { name: b('Rolamentos (bolsa com 1.000)', 'Ball Bearings (bag of 1,000)'), weight: 2, aliases: ['Rolamentos', 'Ball Bearings'] },
  string: { name: b('Barbante (3 m)', 'String (10 feet)') },
  bell: { name: b('Sino', 'Bell') },
  hoodedLantern: { name: b('Lanterna Coberta', 'Hooded Lantern'), weight: 2, artId: 'lantern' },
  bullseyeLantern: { name: b('Lanterna Furta-fogo', 'Bullseye Lantern'), weight: 2, artId: 'lantern' },
  lamp: { name: b('Lamparina', 'Lamp'), weight: 1, artId: 'lantern' },
  chest: { name: b('Baú', 'Chest'), weight: 25 },
  mapCase: { name: b('Estojo de Mapas ou Pergaminhos', 'Map or Scroll Case'), weight: 1 },
  fineClothes: { name: b('Roupas Finas', 'Fine Clothes'), weight: 6 },
  ink: { name: b('Tinta (frasco)', 'Ink (bottle)'), aliases: ['Tinta', 'Ink'] },
  inkPen: { name: b('Pena de Escrever', 'Ink Pen'), aliases: ['Quill'] },
  paper: { name: b('Papel (folhas)', 'Paper (sheets)') },
  parchment: { name: b('Pergaminho (folhas)', 'Parchment (sheets)'), artId: 'spellScroll0' },
  perfume: { name: b('Perfume', 'Perfume') },
  sealingWax: { name: b('Lacre', 'Sealing Wax') },
  soap: { name: b('Sabão', 'Soap') },
  costume: { name: b('Fantasia', 'Costume'), weight: 4 },
  disguiseKit: { name: b('Kit de Disfarce', 'Disguise Kit'), weight: 3 },
  messKit: { name: b('Kit de Refeição', 'Mess Kit'), weight: 1 },
  almsBox: { name: b('Caixa de Esmolas', 'Alms Box') },
  incense: { name: b('Incenso (blocos)', 'Incense (blocks)') },
  censer: { name: b('Incensário', 'Censer'), artId: 'censerControllingAirElementals' },
  vestments: { name: b('Vestes Cerimoniais', 'Vestments') },
  book: { name: b('Livro', 'Book'), weight: 5, artId: 'spellbook' },
  bookOfLore: { name: b('Livro de Estudo', 'Book of Lore'), weight: 5, artId: 'spellbook' },
  bagOfSand: { name: b('Saquinho de Areia', 'Little Bag of Sand') },
  smallKnife: { name: b('Faca Pequena', 'Small Knife') },
  caltrops: { name: b('Estrepes (bolsa com 20)', 'Caltrops (pouch of 20)'), weight: 2, aliases: ['Estrepes', 'Caltrops'] },
  mirror: { name: b('Espelho', 'Mirror'), weight: 0.5 },
  robe: { name: b('Túnica', 'Robe'), weight: 4 },
};

export const PACKS = {
  explorer: {
    name: b('Pacote de Aventureiro', "Explorer's Pack"), catalogId: 'explorersPack',
    words: ['aventureiro', 'explorador'], en: 'explorer',
    contents: {
      '2014': [['backpack'], ['bedroll'], ['messKit'], ['tinderbox'], ['torch', 10], ['rations', 10], ['waterskin'], ['rope']],
      '2024': [['backpack'], ['bedroll'], ['oil', 2], ['rations', 10], ['rope'], ['tinderbox'], ['torch', 10], ['waterskin']],
    },
  },
  dungeoneer: {
    name: b('Pacote de Explorador de Masmorras', "Dungeoneer's Pack"), catalogId: 'dungeoneersPack',
    words: ['explorador de masmorras', 'masmorra', 'masmorras'], en: 'dungeoneer',
    contents: {
      '2014': [['backpack'], ['crowbar'], ['hammer'], ['piton', 10], ['torch', 10], ['tinderbox'], ['rations', 10], ['waterskin'], ['rope']],
      '2024': [['backpack'], ['caltrops'], ['crowbar'], ['oil', 2], ['rations', 10], ['rope'], ['tinderbox'], ['torch', 10], ['waterskin']],
    },
  },
  priest: {
    name: b('Pacote de Sacerdote', "Priest's Pack"), catalogId: 'priestPack',
    words: ['sacerdote'], en: 'priest',
    contents: {
      '2014': [['backpack'], ['blanket'], ['candle', 10], ['tinderbox'], ['almsBox'], ['incense', 2], ['censer'], ['vestments'], ['rations', 2], ['waterskin']],
      '2024': [['backpack'], ['blanket'], ['holyWater'], ['lamp'], ['rations', 7], ['robe'], ['tinderbox']],
    },
  },
  scholar: {
    name: b('Pacote de Erudito', "Scholar's Pack"), catalogId: 'scholarPack',
    words: ['erudito', 'estudioso'], en: 'scholar',
    contents: {
      '2014': [['backpack'], ['bookOfLore'], ['ink'], ['inkPen'], ['parchment', 10], ['bagOfSand'], ['smallKnife']],
      '2024': [['backpack'], ['book'], ['ink'], ['inkPen'], ['lamp'], ['oil', 10], ['parchment', 10], ['tinderbox']],
    },
  },
  burglar: {
    name: b('Pacote de Assaltante', "Burglar's Pack"),
    words: ['assaltante', 'ladrao'], en: 'burglar',
    contents: {
      '2014': [['backpack'], ['ballBearings'], ['string'], ['bell'], ['candle', 5], ['crowbar'], ['hammer'], ['piton', 10], ['hoodedLantern'], ['oil', 2], ['rations', 5], ['tinderbox'], ['waterskin'], ['rope']],
      '2024': [['backpack'], ['ballBearings'], ['bell'], ['candle', 10], ['crowbar'], ['hoodedLantern'], ['oil', 7], ['rations', 5], ['rope'], ['tinderbox'], ['waterskin']],
    },
  },
  diplomat: {
    name: b('Pacote de Diplomata', "Diplomat's Pack"),
    words: ['diplomata'], en: 'diplomat',
    contents: {
      '2014': [['chest'], ['mapCase', 2], ['fineClothes'], ['ink'], ['inkPen'], ['lamp'], ['oil', 2], ['paper', 5], ['perfume'], ['sealingWax'], ['soap']],
      '2024': [['chest'], ['fineClothes'], ['ink'], ['inkPen', 5], ['lamp'], ['mapCase', 2], ['oil', 4], ['paper', 5], ['parchment', 5], ['perfume'], ['tinderbox']],
    },
  },
  entertainer: {
    name: b('Pacote de Artista', "Entertainer's Pack"),
    words: ['artista', 'animador'], en: 'entertainer',
    contents: {
      '2014': [['backpack'], ['bedroll'], ['costume', 2], ['candle', 5], ['rations', 5], ['waterskin'], ['disguiseKit']],
      '2024': [['backpack'], ['bedroll'], ['bell'], ['bullseyeLantern'], ['costume', 3], ['mirror'], ['oil', 8], ['rations', 9], ['tinderbox'], ['waterskin']],
    },
  },
};
