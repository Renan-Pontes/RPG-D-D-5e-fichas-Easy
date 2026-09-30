// Patrulheiro — opções de classe, traços revisados e subclasses (formato em README.md).
// Classe base e Caçador: SRD 5.2.1 (CC-BY 4.0), texto revisado/resumido.
// Demais subclasses (PHB 2024, XGE, TCE, FTD): resumos ORIGINAIS, não o texto dos livros.
import { SHARED } from './shared.js';

const b = (pt, en) => ({ pt, en });
const f = (id, namePt, nameEn, descPt, descEn) => ({ id, name: b(namePt, nameEn), desc: b(descPt, descEn) });

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------

const druidicWarrior = {
  id: 'druidicWarrior', name: b('Guerreiro Druídico', 'Druidic Warrior'), source: 'SRD',
  desc: b(
    'Em vez de um talento de Estilo de Luta: aprende dois truques de druida (Orientação e Lampejo Estelar são recomendados). Eles contam como magias de patrulheiro e usam Sabedoria. Sempre que ganhar um nível de patrulheiro, pode trocar um deles por outro truque de druida.',
    'Instead of a Fighting Style feat: learn two Druid cantrips (Guidance and Starry Wisp are recommended). They count as Ranger spells and use Wisdom. Whenever you gain a Ranger level, you can replace one of them with another Druid cantrip.',
  ),
  prereq: { level: 2 },
  choices: { druidicWarriorCantrip: 2 },
};

// Inimigo Favorito 2014 (PHB/SRD 5.1): tipos de criatura.
const ENEMY_TYPES = [
  ['aberrations', 'Aberrações', 'Aberrations'], ['beasts', 'Bestas', 'Beasts'],
  ['celestials', 'Celestiais', 'Celestials'], ['constructs', 'Constructos', 'Constructs'],
  ['dragons', 'Dragões', 'Dragons'], ['elementals', 'Elementais', 'Elementals'],
  ['fey', 'Fadas', 'Fey'], ['fiends', 'Ínferos', 'Fiends'], ['giants', 'Gigantes', 'Giants'],
  ['monstrosities', 'Monstruosidades', 'Monstrosities'], ['oozes', 'Limos', 'Oozes'],
  ['plants', 'Plantas', 'Plants'], ['undead', 'Mortos-vivos', 'Undead'],
];
const favoredEnemyOptions = [
  ...ENEMY_TYPES.map(([id, pt, en]) => ({
    id, name: b(pt, en), source: 'SRD', rules: '2014',
    desc: b(
      `Inimigo favorito: ${pt}. Vantagem em testes de Sabedoria (Sobrevivência) para rastreá-los e de Inteligência para lembrar informações sobre eles. Aprende um idioma (de preferência um que eles falem).`,
      `Favored enemy: ${en}. Advantage on Wisdom (Survival) checks to track them and Intelligence checks to recall information about them. Learn one language (ideally one they speak).`,
    ),
    choices: { languages: 1 },
  })),
  {
    id: 'humanoids', name: b('Duas raças de humanoides', 'Two humanoid races'), source: 'SRD', rules: '2014',
    desc: b(
      'Em vez de um tipo, escolha duas raças de humanoides (ex.: gnolls e orcs) como inimigos favoritos, com os mesmos benefícios. Aprende um idioma.',
      'Instead of a creature type, choose two races of humanoid (e.g., gnolls and orcs) as favored enemies, with the same benefits. Learn one language.',
    ),
    repeatable: true, detail: b('Quais duas raças?', 'Which two races?'),
    choices: { languages: 1 },
  },
];

const TERRAINS = [
  ['arctic', 'Ártico', 'Arctic'], ['coast', 'Costa', 'Coast'], ['desert', 'Deserto', 'Desert'],
  ['forest', 'Floresta', 'Forest'], ['grassland', 'Planície', 'Grassland'], ['mountain', 'Montanha', 'Mountain'],
  ['swamp', 'Pântano', 'Swamp'], ['underdark', 'Subterrâneo (Underdark)', 'Underdark'],
];
const favoredTerrainOptions = TERRAINS.map(([id, pt, en]) => ({
  id, name: b(pt, en), source: 'SRD', rules: '2014',
  desc: b(
    `Terreno favorito: ${pt}. Nele, dobra o bônus de proficiência em testes de Inteligência ou Sabedoria relacionados ao terreno; terreno difícil não atrasa o grupo; não se perde (exceto por magia); fica alerta ao perigo mesmo em outra atividade; furtivo viajando sozinho; forrageia o dobro; ao rastrear, sabe número, tamanho e há quanto tempo passaram.`,
    `Favored terrain: ${en}. There, you double your proficiency bonus on related Intelligence or Wisdom checks; difficult terrain doesn't slow your group; you can't become lost except by magic; you stay alert to danger while doing other things; you move stealthily alone; you find twice as much food; when tracking, you learn the creatures' number, size, and how long ago they passed.`,
  ),
}));

const hunterSubclass = { subclass: ['hunter'] };

const pools = {
  // Estilo de Luta (nv 2): talentos compartilhados + opção exclusiva do patrulheiro.
  fightingStyle: { ...SHARED.fightingStyle, options: [...SHARED.fightingStyle.options, druidicWarrior] },
  druidicWarriorCantrip: {
    name: b('Truques de Druida (Guerreiro Druídico)', 'Druid Cantrips (Druidic Warrior)'),
    kind: 'spell', filter: { classes: ['druid'], level: 0 }, grantAs: 'cantrip',
    swapOnLevelUp: 1,
  },
  weaponMastery: SHARED.weaponMastery,
  // Explorador Hábil (nv 2) e Especialização (nv 9).
  expertise: {
    name: b('Especialização', 'Expertise'),
    kind: 'skill', grantAs: 'expertise', filter: { proficient: true },
  },
  // Explorador Hábil (nv 2: 2), Dádiva Dracônica (1), Inimigo Favorito 2014 (1 por escolha).
  languages: {
    name: b('Idiomas', 'Languages'),
    kind: 'language', grantAs: 'language',
  },

  // --- 2014 (fichas antigas) ---
  // Recursos opcionais do Tasha (TCE): com o mestre de acordo, o Explorador Hábil
  // substitui o Explorador Natural (Terreno Favorito). Escolha "PHB" para manter a regra-base.
  tceOptional: {
    name: b('Explorador Natural ou Explorador Hábil (TCE)', 'Natural Explorer or Deft Explorer (TCE)'),
    options: [
      { id: 'naturalExplorer', name: b('Explorador Natural (PHB)', 'Natural Explorer (PHB)'), source: 'SRD', rules: '2014',
        desc: b('Regra-base: mantém o Terreno Favorito nos níveis 1, 6 e 10.', 'Base rule: keep Favored Terrain at levels 1, 6, and 10.') },
      { id: 'deftExplorer', name: b('Explorador Hábil (TCE)', 'Deft Explorer (TCE)'), source: 'TCE', rules: '2014',
        desc: b('Opcional, substitui o Explorador Natural. Nível 1 (Astuto): Especialização em 1 perícia proficiente e 2 idiomas. Nível 6 (Andarilho): +1,5 m de deslocamento e deslocamentos de escalada e natação iguais ao seu. Nível 10 (Incansável): ação para ganhar PV temporários de 1d8 + SAB (usos = bônus de proficiência por descanso longo) e o descanso curto reduz a exaustão em 1. Ignore as vagas de Terreno Favorito.',
          'Optional, replaces Natural Explorer. Level 1 (Canny): Expertise in 1 proficient skill and 2 languages. Level 6 (Roving): +5 ft speed and climbing and swimming speeds equal to your speed. Level 10 (Tireless): action to gain 1d8 + WIS temporary HP (uses = proficiency bonus per long rest), and a short rest reduces exhaustion by 1. Ignore the Favored Terrain slots.'),
        choices: { expertise: 1, languages: 2 },
        resource: { uses: { profBonus: true }, recharge: 'long', minLevel: 10 } },
    ],
  },
  favoredEnemy: { name: b('Inimigo Favorito', 'Favored Enemy'), options: favoredEnemyOptions },
  favoredTerrain: { name: b('Terreno Favorito', 'Favored Terrain'), options: favoredTerrainOptions },

  // --- Subclasses ---
  huntersPrey: {
    name: b('Presa do Caçador', "Hunter's Prey"),
    freeSwap: true, // 2024: troca ao terminar Descanso Curto ou Longo
    options: [
      { id: 'colossusSlayer', name: b('Matador de Colossos', 'Colossus Slayer'), source: 'SRD', prereq: hunterSubclass,
        desc: b('Quando você atinge uma criatura com uma arma, ela sofre 1d8 de dano extra se já tiver perdido algum Ponto de Vida. Só uma vez por turno.',
          'When you hit a creature with a weapon, it takes an extra 1d8 damage if it is missing any of its Hit Points. Once per turn.') },
      { id: 'hordeBreaker', name: b('Destruidor de Hordas', 'Horde Breaker'), source: 'SRD', prereq: hunterSubclass,
        desc: b('Uma vez em cada um dos seus turnos, ao atacar com uma arma, pode fazer outro ataque com a mesma arma contra uma criatura diferente a até 1,5 m do alvo original, dentro do alcance da arma, que você ainda não atacou neste turno.',
          "Once on each of your turns when you attack with a weapon, you can make another attack with the same weapon against a different creature within 5 feet of the original target, within the weapon's range, that you haven't attacked this turn.") },
      { id: 'giantKiller', name: b('Matador de Gigantes', 'Giant Killer'), source: 'PHB', rules: '2014', prereq: hunterSubclass,
        desc: b('Reação: quando uma criatura Grande ou maior a até 1,5 m atinge ou erra você com um ataque, você a ataca logo em seguida, se puder vê-la.',
          'Reaction: when a Large or larger creature within 5 feet hits or misses you with an attack, you can attack it right after, if you can see it.') },
    ],
  },
  defensiveTactics: {
    name: b('Táticas Defensivas', 'Defensive Tactics'),
    freeSwap: true, // 2024: troca ao terminar Descanso Curto ou Longo
    options: [
      { id: 'escapeTheHorde', name: b('Fuga da Horda', 'Escape the Horde'), source: 'SRD', prereq: { ...hunterSubclass, level: 7 },
        desc: b('Ataques de Oportunidade contra você têm Desvantagem.', 'Opportunity Attacks have Disadvantage against you.') },
      { id: 'multiattackDefense', name: b('Defesa contra Ataques Múltiplos', 'Multiattack Defense'), source: 'SRD', prereq: { ...hunterSubclass, level: 7 },
        desc: b('Quando uma criatura atinge você com uma jogada de ataque, ela tem Desvantagem nas demais jogadas de ataque contra você neste turno. (Regras de 2014: em vez disso, +4 de CA contra os ataques seguintes dela no turno.)',
          'When a creature hits you with an attack roll, it has Disadvantage on all other attack rolls against you this turn. (2014 rules: instead, +4 AC against its later attacks that turn.)') },
      { id: 'steelWill', name: b('Vontade de Ferro', 'Steel Will'), source: 'PHB', rules: '2014', prereq: { ...hunterSubclass, level: 7 },
        desc: b('Vantagem em salvaguardas contra ficar amedrontado.', 'Advantage on saving throws against being frightened.') },
    ],
  },
  // Caçador 2014 (PHB): Ataque Múltiplo (nv 11) e Defesa Superior do Caçador (nv 15).
  hunterMultiattack: {
    name: b('Ataque Múltiplo', 'Multiattack'),
    options: [
      { id: 'volley', name: b('Saraivada', 'Volley'), source: 'PHB', rules: '2014', prereq: { ...hunterSubclass, level: 11 },
        desc: b('Com sua ação, faz um ataque à distância contra qualquer número de criaturas visíveis a até 3 m de um ponto dentro do alcance da arma (uma munição e uma jogada de ataque para cada).',
          'As your action, make a ranged attack against any number of visible creatures within 10 feet of a point within your weapon\'s range (one piece of ammunition and a separate attack roll for each).') },
      { id: 'whirlwindAttack', name: b('Ataque Giratório', 'Whirlwind Attack'), source: 'PHB', rules: '2014', prereq: { ...hunterSubclass, level: 11 },
        desc: b('Com sua ação, faz um ataque corpo a corpo contra cada criatura a até 1,5 m (uma jogada de ataque para cada).',
          'As your action, make a melee attack against every creature within 5 feet of you (a separate attack roll for each).') },
    ],
  },
  superiorHuntersDefense: {
    name: b('Defesa Superior do Caçador', "Superior Hunter's Defense"),
    options: [
      { id: 'evasion', name: b('Evasão', 'Evasion'), source: 'PHB', rules: '2014', prereq: { ...hunterSubclass, level: 15 },
        desc: b('Em efeitos que pedem salvaguarda de Destreza para sofrer metade do dano, você não sofre dano no sucesso e só metade na falha.',
          'When an effect allows a Dexterity save for half damage, you take no damage on a success and only half on a failure.') },
      { id: 'standAgainstTheTide', name: b('Firme Contra a Maré', 'Stand Against the Tide'), source: 'PHB', rules: '2014', prereq: { ...hunterSubclass, level: 15 },
        desc: b('Reação: quando uma criatura hostil erra você com um ataque corpo a corpo, você a força a repetir o mesmo ataque contra outra criatura (que não ela mesma) à sua escolha.',
          'Reaction: when a hostile creature misses you with a melee attack, you force it to repeat that attack against another creature (other than itself) of your choice.') },
      { id: 'uncannyDodge', name: b('Esquiva Sobrenatural', 'Uncanny Dodge'), source: 'PHB', rules: '2014', prereq: { ...hunterSubclass, level: 15 },
        desc: b('Reação: quando um atacante que você pode ver o atinge, reduz o dano desse ataque à metade.',
          'Reaction: when an attacker you can see hits you, halve the attack\'s damage against you.') },
    ],
  },
  primalCompanion: {
    name: b('Companheiro Primal', 'Primal Companion'),
    freeSwap: true, // pode invocar outra fera ao terminar um Descanso Longo
    options: [
      { id: 'beastOfTheLand', name: b('Fera da Terra', 'Beast of the Land'), source: 'PHB24', prereq: { subclass: ['beastmaster'] },
        desc: b('Fera Média. CA 13 + seu mod. de SAB; PV 5 + 5 × nível de patrulheiro; desl. 12 m e escalada 12 m; visão no escuro 18 m. Golpe da Fera: ataque corpo a corpo com o seu bônus de ataque de magia, 1d8 + 2 + SAB (contundente, perfurante ou cortante, definido ao invocar). Investida: se avançou 6 m em linha reta antes de acertar, +1d6 e derruba um alvo Grande ou menor. (Tasha/2014: usa o bônus de proficiência no lugar da SAB.)',
          'Medium beast. AC 13 + your WIS modifier; HP 5 + 5 × Ranger level; 40 ft speed and 40 ft climb; darkvision 60 ft. Beast\'s Strike: melee attack using your spell attack bonus, 1d8 + 2 + WIS (bludgeoning, piercing, or slashing, set when summoned). Charge: if it moved 20 ft straight before hitting, +1d6 and a Large or smaller target falls Prone. (Tasha/2014: uses proficiency bonus instead of WIS.)'),
        detail: b('Que animal e que tipo de dano?', 'Which animal and damage type?') },
      { id: 'beastOfTheSea', name: b('Fera do Mar', 'Beast of the Sea'), source: 'PHB24', prereq: { subclass: ['beastmaster'] },
        desc: b('Fera Média, anfíbia. CA 13 + SAB; PV 5 + 5 × nível de patrulheiro; desl. 1,5 m e natação 18 m; visão no escuro 27 m. Golpe da Fera: 1d6 + 2 + SAB (contundente ou perfurante) e o alvo fica Agarrado (CD de fuga = sua CD de magia) se for Grande ou menor. (Tasha/2014: bônus de proficiência no lugar da SAB.)',
          'Medium amphibious beast. AC 13 + WIS; HP 5 + 5 × Ranger level; 5 ft speed and 60 ft swim; darkvision 90 ft. Beast\'s Strike: 1d6 + 2 + WIS (bludgeoning or piercing) and a Large or smaller target is Grappled (escape DC = your spell save DC). (Tasha/2014: proficiency bonus instead of WIS.)'),
        detail: b('Que animal e que tipo de dano?', 'Which animal and damage type?') },
      { id: 'beastOfTheSky', name: b('Fera do Céu', 'Beast of the Sky'), source: 'PHB24', prereq: { subclass: ['beastmaster'] },
        desc: b('Fera Pequena. CA 13 + SAB; PV 4 + 4 × nível de patrulheiro; desl. 3 m e voo 18 m; não provoca Ataques de Oportunidade ao sair do alcance em voo. Golpe da Fera: 1d4 + 3 + SAB de dano cortante. (Tasha/2014: bônus de proficiência no lugar da SAB.)',
          'Small beast. AC 13 + WIS; HP 4 + 4 × Ranger level; 10 ft speed and 60 ft fly; doesn\'t provoke Opportunity Attacks when it flies out of reach. Beast\'s Strike: 1d4 + 3 + WIS slashing. (Tasha/2014: proficiency bonus instead of WIS.)'),
        detail: b('Que animal?', 'Which animal?') },
      { id: 'rangersCompanion', name: b('Companheiro do Patrulheiro (besta)', "Ranger's Companion (beast)"), source: 'PHB', rules: '2014', prereq: { subclass: ['beastmaster'] },
        desc: b('Regras de 2014: uma besta Média ou menor de ND 1/4 ou menor (ex.: lobo, pantera, falcão-sangrento). Soma seu bônus de proficiência à CA, ataques, dano e perícias/salvaguardas em que for proficiente; PV máximos = os normais ou 4 × nível de patrulheiro, o que for maior. Você usa sua ação para mandá-la atacar.',
          '2014 rules: a Medium or smaller beast of CR 1/4 or lower (e.g., wolf, panther, blood hawk). Add your proficiency bonus to its AC, attacks, damage, and proficient skills/saves; its HP maximum is its normal value or 4 × Ranger level, whichever is higher. You use your action to command it to attack.'),
        detail: b('Qual besta?', 'Which beast?') },
    ],
  },
  ironMind: {
    name: b('Mente de Ferro', 'Iron Mind'),
    options: [
      { id: 'wisdomSave', name: b('Salvaguarda de Sabedoria', 'Wisdom saving throw'), source: 'PHB24', prereq: { subclass: ['gloomstalker'] },
        desc: b('Ganha proficiência em salvaguardas de Sabedoria.', 'Gain proficiency in Wisdom saving throws.'), grants: { saves: ['wis'] } },
      { id: 'intelligenceSave', name: b('Salvaguarda de Inteligência', 'Intelligence saving throw'), source: 'PHB24', prereq: { subclass: ['gloomstalker'], text: b('Só se já tiver proficiência em salvaguardas de Sabedoria', 'Only if already proficient in Wisdom saves') },
        desc: b('Se já for proficiente em salvaguardas de Sabedoria, ganha proficiência em salvaguardas de Inteligência.', 'If already proficient in Wisdom saves, gain proficiency in Intelligence saving throws.'), grants: { saves: ['int'] } },
      { id: 'charismaSave', name: b('Salvaguarda de Carisma', 'Charisma saving throw'), source: 'PHB24', prereq: { subclass: ['gloomstalker'], text: b('Só se já tiver proficiência em salvaguardas de Sabedoria', 'Only if already proficient in Wisdom saves') },
        desc: b('Se já for proficiente em salvaguardas de Sabedoria, ganha proficiência em salvaguardas de Carisma.', 'If already proficient in Wisdom saves, gain proficiency in Charisma saving throws.'), grants: { saves: ['cha'] } },
    ],
  },
  otherworldlyGlamour: {
    name: b('Glamour Sobrenatural (perícia)', 'Otherworldly Glamour (skill)'),
    kind: 'skill', grantAs: 'skill', filter: { from: ['deception', 'performance', 'persuasion'] },
  },
  feywildGift: {
    name: b('Dádiva Feérica', 'Feywild Gift'),
    options: [
      ['illusoryButterflies', 'Borboletas ilusórias', 'Illusory butterflies', 'Borboletas ilusórias esvoaçam ao seu redor enquanto você descansa.', 'Illusory butterflies flutter around you while you rest.'],
      ['flowerHair', 'Flores no cabelo', 'Flowers in your hair', 'Flores frescas brotam no seu cabelo a cada amanhecer.', 'Fresh flowers sprout in your hair each dawn.'],
      ['herbalScent', 'Aroma de ervas', 'Herbal scent', 'Você exala um leve aroma de ervas, flores ou especiarias.', 'You give off a faint scent of herbs, flowers, or spices.'],
      ['dancingShadow', 'Sombra dançante', 'Dancing shadow', 'Sua sombra dança quando ninguém está olhando diretamente para ela.', 'Your shadow dances when no one is looking straight at it.'],
      ['hornsOrAntlers', 'Chifres ou galhadas', 'Horns or antlers', 'Chifres ou galhadas brotam da sua cabeça.', 'Horns or antlers sprout from your head.'],
      ['shiftingColors', 'Cores mutáveis', 'Shifting colors', 'Sua pele e seu cabelo mudam de cor a cada amanhecer.', 'Your skin and hair change color each dawn.'],
    ].map(([id, pt, en, dpt, den]) => ({ id, name: b(pt, en), source: 'PHB24', prereq: { subclass: ['feywanderer'] }, desc: b(`${dpt} Sem efeito mecânico.`, `${den} No mechanical effect.`) })),
  },
  swarmAppearance: {
    name: b('Aparência do Enxame', 'Swarm Appearance'),
    options: [
      ['insects', 'Insetos', 'Insects', 'Um enxame de insetos zumbidores.', 'A swarm of buzzing insects.'],
      ['twigBlights', 'Arbustos-praga', 'Twig blights', 'Arbustos-praga em miniatura, feitos de galhos.', 'Miniature twig blights.'],
      ['birds', 'Pássaros', 'Birds', 'Pequenos pássaros esvoaçantes.', 'Fluttering little birds.'],
      ['pixies', 'Pixies', 'Pixies', 'Pixies brincalhonas.', 'Playful pixies.'],
    ].map(([id, pt, en, dpt, den]) => ({ id, name: b(pt, en), source: 'TCE', prereq: { subclass: ['swarmkeeper'] }, desc: b(`${dpt} Aparência apenas; sem efeito mecânico.`, `${den} Cosmetic only.`) })),
  },
  draconicEssence: {
    name: b('Essência Dracônica', 'Draconic Essence'),
    freeSwap: true, // escolhida a cada vez que o draco é invocado
    options: [
      ['acid', 'Ácido', 'Acid'], ['cold', 'Frio', 'Cold'], ['fire', 'Fogo', 'Fire'],
      ['lightning', 'Elétrico', 'Lightning'], ['poison', 'Veneno', 'Poison'],
    ].map(([id, pt, en]) => ({
      id, name: b(pt, en), source: 'FTD', prereq: { subclass: ['drakewarden'] },
      desc: b(`O draco é imune a dano de ${pt.toLowerCase()} e seus Golpes Infundidos (e, no nv 7, a mordida) causam esse tipo; no nv 7 você ganha resistência a ele. Pode mudar a cada invocação.`,
        `The drake is immune to ${en.toLowerCase()} damage and its Infused Strikes (and, at level 7, its bite) deal that type; at level 7 you gain resistance to it. May change each time you summon it.`),
    })),
  },
};

// ---------------------------------------------------------------------------
// Traços da classe base 2024 (SRD 5.2.1, revisados)
// ---------------------------------------------------------------------------

const ASI = f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
  'Ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique. Também nos níveis de patrulheiro 4, 8, 12 e 16.',
  'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. Also at Ranger levels 4, 8, 12, and 16.');

const features = {
  1: [
    f('spellcasting', 'Conjuração', 'Spellcasting',
      'Você conjura magias de patrulheiro usando Sabedoria e pode usar um Foco Druídico. Os espaços de magia aparecem na tabela da classe e voltam num Descanso Longo. Prepare 2 magias de 1º círculo (Curar Ferimentos e Golpe Enredante são recomendadas); o número aumenta conforme a tabela, sempre com magias de círculos para os quais tenha espaços. Ao terminar um Descanso Longo, pode trocar uma magia preparada por outra de patrulheiro.',
      'You cast Ranger spells using Wisdom and can use a Druidic Focus. Spell slots are shown on the class table and return on a Long Rest. Prepare 2 level 1 spells (Cure Wounds and Ensnaring Strike are recommended); the number grows per the table, always with spells of levels for which you have slots. When you finish a Long Rest, you can replace one prepared spell with another Ranger spell.'),
    f('favoredEnemy', 'Inimigo Favorito', 'Favored Enemy',
      'Você sempre tem Marca do Caçador preparada e pode conjurá-la sem gastar espaço de magia 2 vezes; recupera os usos num Descanso Longo. Os usos aumentam: 3 no nível 5, 4 no 9, 5 no 13 e 6 no 17.',
      "You always have Hunter's Mark prepared and can cast it without expending a spell slot twice; you regain the uses on a Long Rest. Uses increase to 3 at level 5, 4 at 9, 5 at 13, and 6 at 17."),
    f('weaponMastery', 'Maestria em Armas', 'Weapon Mastery',
      'Você usa as propriedades de maestria de dois tipos de arma com que tem proficiência (ex.: Arco Longo e Espada Curta). Ao terminar um Descanso Longo, pode trocar os tipos escolhidos.',
      'You can use the mastery properties of two kinds of weapons you are proficient with (e.g., Longbow and Shortsword). When you finish a Long Rest, you can change the kinds you chose.'),
  ],
  2: [
    f('deftExplorer', 'Explorador Hábil', 'Deft Explorer',
      'Especialização: escolha uma perícia em que tenha proficiência e ainda não tenha Especialização; ganha Especialização nela. Idiomas: aprende dois idiomas à sua escolha.',
      'Expertise: choose one skill you are proficient in and lack Expertise in; you gain Expertise in it. Languages: you learn two languages of your choice.'),
    f('fightingStyle', 'Estilo de Luta', 'Fighting Style',
      'Ganha um talento de Estilo de Luta à sua escolha ou, no lugar dele, a opção Guerreiro Druídico: aprende dois truques de druida (Orientação e Lampejo Estelar são recomendados), que contam como magias de patrulheiro e usam Sabedoria. Sempre que ganhar um nível de patrulheiro, pode trocar um desses truques por outro truque de druida.',
      'You gain a Fighting Style feat of your choice or, instead, the Druidic Warrior option: learn two Druid cantrips (Guidance and Starry Wisp are recommended) that count as Ranger spells and use Wisdom. Whenever you gain a Ranger level, you can replace one of these cantrips with another Druid cantrip.'),
  ],
  3: [
    f('rangerSubclass', 'Subclasse de Patrulheiro', 'Ranger Subclass',
      'Você escolhe uma subclasse de patrulheiro e ganha os traços dela nos níveis de patrulheiro 3, 7, 11 e 15.',
      'You gain a Ranger subclass of your choice and its features at Ranger levels 3, 7, 11, and 15.'),
  ],
  4: [ASI],
  5: [f('extraAttack', 'Ataque Extra', 'Extra Attack',
    'Você ataca duas vezes, em vez de uma, sempre que usa a ação Atacar no seu turno.',
    'You can attack twice instead of once whenever you take the Attack action on your turn.')],
  6: [f('roving', 'Andarilho', 'Roving',
    'Seu Deslocamento aumenta em 3 m (10 pés) enquanto não estiver usando armadura Pesada. Você também tem Deslocamento de Escalada e de Natação iguais ao seu Deslocamento.',
    "Your Speed increases by 10 feet while you aren't wearing Heavy armor. You also have a Climb Speed and a Swim Speed equal to your Speed.")],
  8: [ASI],
  9: [f('expertise', 'Especialização', 'Expertise',
    'Escolha duas perícias em que tenha proficiência e ainda não tenha Especialização. Você ganha Especialização nelas.',
    'Choose two of your skill proficiencies with which you lack Expertise. You gain Expertise in those skills.')],
  10: [f('tireless', 'Incansável', 'Tireless',
    'PV Temporários: como ação Mágica, ganha 1d8 + mod. de Sabedoria (mínimo 1) Pontos de Vida Temporários; usos iguais ao mod. de Sabedoria (mínimo 1), recuperados num Descanso Longo. Reduzir Exaustão: ao terminar um Descanso Curto, seu nível de Exaustão, se houver, diminui em 1.',
    'Temporary Hit Points: as a Magic action, gain 1d8 + your Wisdom modifier (minimum 1) Temporary Hit Points; uses equal your Wisdom modifier (minimum once), regained on a Long Rest. Decrease Exhaustion: whenever you finish a Short Rest, your Exhaustion level, if any, decreases by 1.')],
  12: [ASI],
  13: [f('relentlessHunter', 'Caçador Implacável', 'Relentless Hunter',
    'Sofrer dano não pode quebrar sua Concentração em Marca do Caçador.',
    "Taking damage can't break your Concentration on Hunter's Mark.")],
  14: [f('naturesVeil', 'Véu da Natureza', "Nature's Veil",
    'Como Ação Bônus, você recebe a condição Invisível até o fim do seu próximo turno. Usos iguais ao mod. de Sabedoria (mínimo 1), recuperados num Descanso Longo.',
    'As a Bonus Action, you give yourself the Invisible condition until the end of your next turn. Uses equal your Wisdom modifier (minimum once), regained on a Long Rest.')],
  16: [ASI],
  17: [f('preciseHunter', 'Caçador Preciso', 'Precise Hunter',
    'Você tem Vantagem nas jogadas de ataque contra a criatura marcada pela sua Marca do Caçador.',
    "You have Advantage on attack rolls against the creature currently marked by your Hunter's Mark.")],
  18: [f('feralSenses', 'Sentidos Selvagens', 'Feral Senses',
    'Sua ligação com as forças da natureza lhe dá Percepção às Cegas com alcance de 9 m (30 pés).',
    'Your connection to the forces of nature grants you Blindsight with a range of 30 feet.')],
  19: [f('epicBoon', 'Dádiva Épica', 'Epic Boon',
    'Ganha um talento de Dádiva Épica ou outro talento para o qual se qualifique. Dádiva da Viagem Dimensional é recomendada.',
    'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended.')],
  20: [f('foeSlayer', 'Matador de Inimigos', 'Foe Slayer',
    'O dado de dano da sua Marca do Caçador passa a ser d10 em vez de d6.',
    "The damage die of your Hunter's Mark is a d10 rather than a d6.")],
};

// ---------------------------------------------------------------------------
// Subclasses (níveis 3, 7, 11 e 15; magias de conclave nos níveis 3/5/9/13/17)
// ---------------------------------------------------------------------------

const conclaveSpells = (ids) => ({ 3: ids[0], 5: ids[1], 9: ids[2], 13: ids[3], 17: ids[4] });
function withSpells(levels, spells, cantrips3 = []) {
  const out = { ...levels };
  for (const [lv, id] of Object.entries(conclaveSpells(spells))) {
    out[lv] = { ...(out[lv] || {}), autoSpells: [id] };
  }
  if (cantrips3.length) out[3] = { ...out[3], autoCantrips: cantrips3 };
  return out;
}

const subclasses = {
  hunter: {
    name: b('Caçador', 'Hunter'), source: 'SRD',
    desc: b('Protetor da fronteira entre a civilização e os perigos do ermo, especializado em abater presas temíveis.', 'A guardian of the border between civilization and the wild, specialized in bringing down dreadful prey.'),
    levels: {
      3: { features: [
        f('huntersLore', 'Conhecimento do Caçador', "Hunter's Lore",
          'Enquanto uma criatura estiver marcada pela sua Marca do Caçador, você sabe se ela tem Imunidades, Resistências ou Vulnerabilidades, e quais são.',
          "While a creature is marked by your Hunter's Mark, you know whether it has any Immunities, Resistances, or Vulnerabilities, and what they are."),
        f('huntersPrey', 'Presa do Caçador', "Hunter's Prey",
          'Escolha Matador de Colossos (1×/turno, +1d8 de dano com arma contra alvo que já perdeu PV) ou Destruidor de Hordas (1×/turno, um ataque extra com a mesma arma contra outra criatura a até 1,5 m do alvo). Ao terminar um Descanso Curto ou Longo, pode trocar pela outra opção.',
          'Choose Colossus Slayer (once per turn, +1d8 weapon damage against a target missing Hit Points) or Horde Breaker (once per turn, an extra attack with the same weapon against another creature within 5 feet of the target). When you finish a Short or Long Rest, you can switch to the other option.'),
      ] },
      7: { features: [
        f('defensiveTactics', 'Táticas Defensivas', 'Defensive Tactics',
          'Escolha Fuga da Horda (Ataques de Oportunidade contra você têm Desvantagem) ou Defesa contra Ataques Múltiplos (quem atinge você com um ataque tem Desvantagem nos demais ataques contra você neste turno). Ao terminar um Descanso Curto ou Longo, pode trocar pela outra opção.',
          'Choose Escape the Horde (Opportunity Attacks against you have Disadvantage) or Multiattack Defense (a creature that hits you has Disadvantage on its other attacks against you this turn). When you finish a Short or Long Rest, you can switch to the other option.'),
      ] },
      11: { features: [
        f('superiorHuntersPrey', 'Presa Superior do Caçador', "Superior Hunter's Prey",
          'Uma vez por turno, ao causar dano a uma criatura marcada pela Marca do Caçador, você também pode causar o dano extra da magia a outra criatura que possa ver a até 9 m da primeira.',
          "Once per turn when you deal damage to a creature marked by your Hunter's Mark, you can also deal that spell's extra damage to a different creature you can see within 30 feet of the first."),
      ] },
      15: { features: [
        f('superiorHuntersDefense', 'Defesa Superior do Caçador', "Superior Hunter's Defense",
          'Ao sofrer dano, pode usar sua Reação para ganhar Resistência a esse dano e a qualquer outro do mesmo tipo até o fim do turno atual.',
          'When you take damage, you can take a Reaction to gain Resistance to that damage and any other damage of the same type until the end of the current turn.'),
      ] },
    },
  },

  beastmaster: {
    name: b('Mestre das Bestas', 'Beast Master'), source: 'PHB24',
    desc: b('Laço místico com uma fera primal que luta ao seu lado.', 'A mystical bond with a primal beast that fights at your side.'),
    levels: {
      3: { features: [
        f('primalCompanion', 'Companheiro Primal', 'Primal Companion',
          'Você invoca uma fera primal (da Terra, do Mar ou do Céu), cuja ficha usa o seu nível, Sabedoria e bônus de ataque de magia; ela soma seu bônus de proficiência a testes e salvaguardas. Age no seu turno: move-se e reage sozinha, mas só usa Esquivar a menos que você gaste uma Ação Bônus para comandá-la — ou troque um dos seus ataques da ação Atacar pelo Golpe da Fera. Se você estiver Incapacitado, ela age livremente. Se morreu há até 1 hora, você a traz de volta com uma ação Mágica e um espaço de magia. Ao terminar um Descanso Longo, pode invocar uma fera diferente.',
          'You summon a primal beast (of the Land, Sea, or Sky) whose stat block uses your level, Wisdom, and spell attack bonus; it adds your proficiency bonus to its checks and saves. It acts on your turn: it moves and reacts on its own but only Dodges unless you spend a Bonus Action to command it — or give up one of your Attack-action attacks for its Beast\'s Strike. If you are Incapacitated, it acts freely. If it died within the last hour, a Magic action and a spell slot bring it back. When you finish a Long Rest, you can summon a different beast.'),
      ] },
      7: { features: [
        f('exceptionalTraining', 'Treinamento Excepcional', 'Exceptional Training',
          'Quando você usa a Ação Bônus para comandar a fera, ela também pode usar Disparada, Desengajar, Esquivar ou Ajudar como Ação Bônus. Quando ela acerta, pode causar dano de Energia no lugar do tipo normal.',
          'When you use your Bonus Action to command the beast, it can also take the Dash, Disengage, Dodge, or Help action as a Bonus Action. When it hits, it can deal Force damage instead of its normal type.'),
      ] },
      11: { features: [
        f('bestialFury', 'Fúria Bestial', 'Bestial Fury',
          'Ao comandar o Golpe da Fera, ela o usa duas vezes. A primeira vez em cada turno que acerta uma criatura marcada pela sua Marca do Caçador, causa o dano extra da magia como dano de Energia.',
          "When you command the Beast's Strike, it uses it twice. The first time each turn it hits a creature marked by your Hunter's Mark, it deals the spell's extra damage as Force damage."),
      ] },
      15: { features: [
        f('shareSpells', 'Compartilhar Magias', 'Share Spells',
          'Quando conjura uma magia que tem só você como alvo, pode fazer com que ela também afete sua fera, se ela estiver a até 9 m.',
          'When you cast a spell that targets only yourself, you can have it also affect your beast if it is within 30 feet.'),
      ] },
    },
  },

  gloomstalker: {
    name: b('Andarilho das Sombras', 'Gloom Stalker'), source: 'PHB24',
    desc: b('Caçador das trevas, que ataca de emboscada onde outros não enxergam.', 'A hunter of the dark who strikes from ambush where others cannot see.'),
    levels: withSpells({
      3: { features: [
        f('dreadAmbusher', 'Emboscador Temível', 'Dread Ambusher',
          'Iniciativa: soma o mod. de Sabedoria. Salto do Emboscador: no início do seu primeiro turno de cada combate, +3 m de Deslocamento até o fim do turno. Golpe Temível: 1×/turno, ao atingir uma criatura com uma arma, +2d6 de dano Psíquico; usos iguais ao mod. de Sabedoria (mín. 1) por Descanso Longo.',
          'Initiative: add your Wisdom modifier. Ambusher\'s Leap: at the start of your first turn of each combat, +10 ft Speed until the end of that turn. Dreadful Strike: once per turn when you hit a creature with a weapon, +2d6 Psychic damage; uses equal your Wisdom modifier (min 1) per Long Rest.'),
        f('gloomStalkerSpells', 'Magias do Andarilho das Sombras', 'Gloom Stalker Spells',
          'Sempre preparadas (não contam no limite): Disfarçar-se (3), Truque da Corda (5), Medo (9), Invisibilidade Maior (13), Aparência (17).',
          'Always prepared (don\'t count against your limit): Disguise Self (3), Rope Trick (5), Fear (9), Greater Invisibility (13), Seeming (17).'),
        f('umbralSight', 'Visão Umbral', 'Umbral Sight',
          'Ganha Visão no Escuro de 18 m (ou +18 m se já tiver). Enquanto estiver totalmente na escuridão, fica Invisível para criaturas que dependem de Visão no Escuro para vê-lo.',
          'You gain Darkvision 60 ft (or +60 ft if you already have it). While entirely in darkness, you are Invisible to creatures relying on Darkvision to see you.'),
      ] },
      7: { features: [
        f('ironMind', 'Mente de Ferro', 'Iron Mind',
          'Ganha proficiência em salvaguardas de Sabedoria; se já a tiver, escolha salvaguardas de Inteligência ou de Carisma.',
          'You gain proficiency in Wisdom saving throws; if you already have it, choose Intelligence or Charisma saving throws instead.'),
      ] },
      11: { features: [
        f('stalkersFlurry', 'Rajada do Espreitador', "Stalker's Flurry",
          'O Golpe Temível passa a causar 2d8. Ao usá-lo, pode somar um efeito: Golpe Súbito (outro ataque com a mesma arma contra uma criatura diferente a até 1,5 m do alvo) ou Medo em Massa (o alvo e cada criatura a até 3 m dele fazem salvaguarda de Sabedoria contra sua CD de magia ou ficam Amedrontados até o início do seu próximo turno).',
          'Dreadful Strike now deals 2d8. When you use it, you can add one effect: Sudden Strike (another attack with the same weapon against a different creature within 5 ft of the target) or Mass Fear (the target and each creature within 10 ft of it make a Wisdom save against your spell save DC or are Frightened until the start of your next turn).'),
      ] },
      15: { features: [
        f('shadowyDodge', 'Esquiva Sombria', 'Shadowy Dodge',
          'Quando uma criatura faz uma jogada de ataque contra você, pode usar sua Reação para impor Desvantagem a ela. Acertando ou errando, você pode então se teletransportar até 9 m para um espaço desocupado que possa ver.',
          'When a creature makes an attack roll against you, you can take a Reaction to impose Disadvantage on it. Hit or miss, you can then teleport up to 30 feet to an unoccupied space you can see.'),
      ] },
    }, ['disguiseSelf', 'ropeTrick', 'fear', 'greaterInvisibility', 'seeming']),
  },

  feywanderer: {
    name: b('Andarilho Feérico', 'Fey Wanderer'), source: 'PHB24',
    desc: b('Tocado pela Agrestia das Fadas, mistura encanto sobrenatural e golpes que abalam a mente.', 'Touched by the Feywild, blending otherworldly charm with strikes that rattle the mind.'),
    levels: withSpells({
      3: { features: [
        f('dreadfulStrikes', 'Golpes Temíveis', 'Dreadful Strikes',
          'Ao atingir uma criatura com uma arma, causa +1d4 de dano Psíquico (no máximo uma vez por turno em cada criatura). O dado vira 1d6 no nível 11.',
          'When you hit a creature with a weapon, deal +1d4 Psychic damage (at most once per turn to each creature). The die becomes 1d6 at level 11.'),
        f('feyWandererSpells', 'Magias do Andarilho Feérico', 'Fey Wanderer Spells',
          'Sempre preparadas (não contam no limite): Enfeitiçar Pessoa (3), Passo Nebuloso (5), Invocar Fada (9), Porta Dimensional (13), Despistar (17). Você também recebe uma Dádiva Feérica (efeito cosmético).',
          'Always prepared (don\'t count against your limit): Charm Person (3), Misty Step (5), Summon Fey (9), Dimension Door (13), Mislead (17). You also gain a Feywild Gift (cosmetic effect).'),
        f('otherworldlyGlamour', 'Glamour Sobrenatural', 'Otherworldly Glamour',
          'Soma o mod. de Sabedoria (mínimo +1) aos testes de Carisma. Ganha proficiência em uma perícia: Enganação, Atuação ou Persuasão.',
          'Add your Wisdom modifier (minimum +1) to Charisma checks. Gain proficiency in one skill: Deception, Performance, or Persuasion.'),
      ] },
      7: { features: [
        f('beguilingTwist', 'Reviravolta Sedutora', 'Beguiling Twist',
          'Vantagem em salvaguardas para evitar ou encerrar Enfeitiçado e Amedrontado. Quando você ou uma criatura a até 36 m tem sucesso numa salvaguarda contra essas condições, pode usar sua Reação para forçar outra criatura visível a até 36 m a fazer salvaguarda de Sabedoria contra sua CD de magia: se falhar, fica Enfeitiçada ou Amedrontada (à sua escolha) por 1 minuto, repetindo a salvaguarda ao fim de cada turno dela.',
          'Advantage on saves to avoid or end Charmed and Frightened. When you or a creature within 120 ft succeeds on a save against those conditions, you can take a Reaction to force another visible creature within 120 ft to make a Wisdom save against your spell save DC: on a failure it is Charmed or Frightened (your choice) for 1 minute, repeating the save at the end of each of its turns.'),
      ] },
      11: { features: [
        f('feyReinforcements', 'Reforços Feéricos', 'Fey Reinforcements',
          'Conjura Invocar Fada sem componente Material e uma vez sem gastar espaço de magia por Descanso Longo. Ao conjurá-la, pode dispensar a Concentração; nesse caso ela dura 1 minuto.',
          'You can cast Summon Fey without a Material component, and once without a spell slot per Long Rest. When you cast it, you can make it not require Concentration; it then lasts 1 minute.'),
      ] },
      15: { features: [
        f('mistyWanderer', 'Andarilho Nebuloso', 'Misty Wanderer',
          'Conjura Passo Nebuloso sem gastar espaço um número de vezes igual ao mod. de Sabedoria (mínimo 1) por Descanso Longo. Ao conjurá-lo, pode levar junto uma criatura voluntária a até 1,5 m, que aparece a até 1,5 m do seu destino.',
          'You can cast Misty Step without a spell slot a number of times equal to your Wisdom modifier (minimum once) per Long Rest. When you cast it, you can bring one willing creature within 5 ft, which appears within 5 ft of your destination.'),
      ] },
    }, ['charmPerson', 'mistyStep', 'summonFey', 'dimensionDoor', 'mislead']),
  },

  horizonwalker: {
    name: b('Andarilho do Horizonte', 'Horizon Walker'), source: 'XGE',
    desc: b('Guardião dos portais entre os planos, que golpeia com energia planar e cruza distâncias num piscar.', 'A guardian of the gateways between planes who strikes with planar energy and crosses distance in a blink.'),
    levels: withSpells({
      3: { features: [
        f('horizonWalkerMagic', 'Magias do Andarilho do Horizonte', 'Horizon Walker Magic',
          'Sempre preparadas (não contam no limite): Proteção contra o Bem e o Mal (3), Passo Nebuloso (5), Velocidade (9), Banimento (13), Círculo de Teletransporte (17).',
          'Always prepared (don\'t count against your limit): Protection from Evil and Good (3), Misty Step (5), Haste (9), Banishment (13), Teleportation Circle (17).'),
        f('detectPortal', 'Detectar Portal', 'Detect Portal',
          'Como ação Mágica, sente a direção e a distância do portal planar mais próximo a até 1,5 km. Uma vez por Descanso Curto ou Longo.',
          'As a Magic action, you sense the direction and distance of the nearest planar portal within 1 mile. Once per Short or Long Rest.'),
        f('planarWarrior', 'Guerreiro Planar', 'Planar Warrior',
          'Como Ação Bônus, escolha uma criatura a até 9 m: o próximo acerto seu contra ela neste turno causa dano de Energia e +1d8 (2d8 a partir do nível 11).',
          'As a Bonus Action, choose a creature within 30 ft: your next hit against it this turn deals Force damage and +1d8 (2d8 from level 11).'),
      ] },
      7: { features: [
        f('etherealStep', 'Passo Etéreo', 'Ethereal Step',
          'Como Ação Bônus, conjura Forma Etérea sem espaço de magia, mas o efeito acaba no fim do turno. Uma vez por Descanso Curto ou Longo.',
          'As a Bonus Action, you cast Etherealness without a spell slot, but the effect ends at the end of the turn. Once per Short or Long Rest.'),
      ] },
      11: { features: [
        f('distantStrike', 'Golpe Distante', 'Distant Strike',
          'Na ação Atacar, pode se teletransportar até 3 m antes de cada ataque. Se atacar pelo menos duas criaturas diferentes nessa ação, pode fazer um ataque extra contra uma terceira.',
          'With the Attack action, you can teleport up to 10 ft before each attack. If you attack at least two different creatures with that action, you can make one extra attack against a third.'),
      ] },
      15: { features: [
        f('spectralDefense', 'Defesa Espectral', 'Spectral Defense',
          'Quando um ataque causa dano a você, pode usar sua Reação para ganhar Resistência a todo o dano desse ataque.',
          'When an attack damages you, you can take a Reaction to gain Resistance to all of that attack\'s damage.'),
      ] },
    }, ['protectionFromEvilAndGood', 'mistyStep', 'haste', 'banishment', 'teleportationCircle']),
  },

  monsterslayer: {
    name: b('Matador de Monstros', 'Monster Slayer'), source: 'XGE',
    desc: b('Especialista em caçar criaturas sobrenaturais e frustrar sua magia.', 'A specialist in hunting supernatural creatures and thwarting their magic.'),
    levels: withSpells({
      3: { features: [
        f('monsterSlayerMagic', 'Magias do Matador de Monstros', 'Monster Slayer Magic',
          'Sempre preparadas (não contam no limite): Proteção contra o Bem e o Mal (3), Zona da Verdade (5), Círculo Mágico (9), Banimento (13), Imobilizar Monstro (17).',
          'Always prepared (don\'t count against your limit): Protection from Evil and Good (3), Zone of Truth (5), Magic Circle (9), Banishment (13), Hold Monster (17).'),
        f('huntersSense', 'Sentido do Caçador', "Hunter's Sense",
          'Como ação, escolha uma criatura visível a até 18 m: descobre suas Imunidades, Resistências e Vulnerabilidades (a menos que ela esteja protegida contra adivinhação). Usos iguais ao mod. de Sabedoria (mínimo 1) por Descanso Longo.',
          'As an action, choose a visible creature within 60 ft: you learn its Immunities, Resistances, and Vulnerabilities (unless it is shielded from divination). Uses equal your Wisdom modifier (minimum once) per Long Rest.'),
        f('slayersPrey', 'Presa do Matador', "Slayer's Prey",
          'Como Ação Bônus, marca uma criatura visível a até 18 m. A primeira vez em cada turno que a atingir com uma arma, causa +1d6. Dura até você terminar um Descanso Curto ou Longo ou marcar outra criatura.',
          'As a Bonus Action, mark a visible creature within 60 ft. The first time each turn you hit it with a weapon, deal +1d6. It lasts until you finish a Short or Long Rest or mark another creature.'),
      ] },
      7: { features: [
        f('supernaturalDefense', 'Defesa Sobrenatural', 'Supernatural Defense',
          'Soma 1d6 às salvaguardas que a sua presa o obrigar a fazer e aos testes para escapar de um agarrão dela.',
          'Add 1d6 to saving throws your prey forces you to make and to checks to escape its grapple.'),
      ] },
      11: { features: [
        f('magicUsersNemesis', 'Nêmesis dos Conjuradores', "Magic-User's Nemesis",
          'Quando vê uma criatura a até 18 m conjurar uma magia ou se teletransportar, pode usar sua Reação para forçá-la a uma salvaguarda de Sabedoria contra sua CD de magia; se falhar, a magia ou o teletransporte fracassa e é desperdiçado. Uma vez por Descanso Curto ou Longo.',
          'When you see a creature within 60 ft cast a spell or teleport, you can take a Reaction to force a Wisdom save against your spell save DC; on a failure the spell or teleport fails and is wasted. Once per Short or Long Rest.'),
      ] },
      15: { features: [
        f('slayersCounter', 'Contra-ataque do Matador', "Slayer's Counter",
          'Quando a sua presa o força a uma salvaguarda, pode usar sua Reação para fazer um ataque com arma contra ela antes da salvaguarda. Se acertar, você também tem sucesso automático na salvaguarda.',
          'When your prey forces you to make a saving throw, you can take a Reaction to make one weapon attack against it before the save. On a hit, you also automatically succeed on the save.'),
      ] },
    }, ['protectionFromEvilAndGood', 'zoneOfTruth', 'magicCircle', 'banishment', 'holdMonster']),
  },

  swarmkeeper: {
    name: b('Guardião do Enxame', 'Swarmkeeper'), source: 'TCE',
    desc: b('Abriga um enxame de espíritos da natureza que ajuda a ferir, empurrar e mover.', 'Hosts a swarm of nature spirits that helps you harm, push, and move.'),
    levels: withSpells({
      3: { features: [
        f('gatheredSwarm', 'Enxame Reunido', 'Gathered Swarm',
          'Um enxame de espíritos da natureza ocupa o seu espaço. Uma vez em cada um dos seus turnos, após atingir uma criatura com um ataque, escolha: o alvo sofre +1d6 de dano Perfurante; ou o alvo faz salvaguarda de Força contra sua CD de magia ou é empurrado até 4,5 m na horizontal; ou você se move 1,5 m na horizontal sem provocar Ataques de Oportunidade.',
          'A swarm of nature spirits shares your space. Once on each of your turns, after you hit a creature with an attack, choose: the target takes +1d6 Piercing damage; or the target makes a Strength save against your spell save DC or is pushed up to 15 ft horizontally; or you move 5 ft horizontally without provoking Opportunity Attacks.'),
        f('swarmkeeperMagic', 'Magias do Guardião do Enxame', 'Swarmkeeper Magic',
          'Aprende o truque Mão Mágica (a mão tem a forma do enxame). Sempre preparadas (não contam no limite): Fogo das Fadas (3), Teia (5), Forma Gasosa (9), Olho Arcano (13), Praga de Insetos (17).',
          'You learn the Mage Hand cantrip (the hand looks like your swarm). Always prepared (don\'t count against your limit): Faerie Fire (3), Web (5), Gaseous Form (9), Arcane Eye (13), Insect Plague (17).'),
      ] },
      7: { features: [
        f('writhingTide', 'Maré Serpenteante', 'Writhing Tide',
          'Como Ação Bônus, o enxame o ergue: ganha Deslocamento de Voo de 3 m e pode pairar por 1 minuto. Usos iguais ao bônus de proficiência por Descanso Longo; sem usos, pode gastar um espaço de 2º círculo ou maior.',
          'As a Bonus Action, the swarm lifts you: gain a 10-ft Fly Speed and hover for 1 minute. Uses equal your proficiency bonus per Long Rest; without uses, you can expend a level 2+ spell slot.'),
      ] },
      11: { features: [
        f('mightySwarm', 'Enxame Poderoso', 'Mighty Swarm',
          'O dano do Enxame Reunido passa a 1d8. Uma criatura que falhar na salvaguarda contra o empurrão também pode ser derrubada (Caída). Ao se mover com o enxame, você ganha Meia Cobertura até o início do seu próximo turno.',
          'Gathered Swarm damage becomes 1d8. A creature that fails the save against the push can also be knocked Prone. When the swarm moves you, you gain Half Cover until the start of your next turn.'),
      ] },
      15: { features: [
        f('swarmingDispersal', 'Dispersão do Enxame', 'Swarming Dispersal',
          'Ao sofrer dano, pode usar sua Reação para ganhar Resistência a ele e se dissolver no enxame, teletransportando-se até 9 m para um espaço desocupado que possa ver. Usos iguais ao bônus de proficiência por Descanso Longo; sem usos, pode gastar um espaço de 3º círculo ou maior.',
          'When you take damage, you can take a Reaction to gain Resistance to it and dissolve into your swarm, teleporting up to 30 ft to an unoccupied space you can see. Uses equal your proficiency bonus per Long Rest; without uses, you can expend a level 3+ spell slot.'),
      ] },
    }, ['faerieFire', 'web', 'gaseousForm', 'arcaneEye', 'insectPlague'], ['mageHand']),
  },

  drakewarden: {
    name: b('Guardião do Draco', 'Drakewarden'), source: 'FTD',
    desc: b('Ligado a um draco que cresce com você até se tornar montaria e arma de sopro.', 'Bonded to a drake that grows with you into a mount and a breath weapon.'),
    levels: {
      3: {
        autoCantrips: ['thaumaturgy'],
        features: [
          f('draconicGift', 'Dádiva Dracônica', 'Draconic Gift',
            'Aprende o truque Taumaturgia e um idioma à sua escolha.',
            'You learn the Thaumaturgy cantrip and one language of your choice.'),
          f('drakeCompanion', 'Companheiro Draco', 'Drake Companion',
            'Como ação Mágica, invoca um draco Pequeno (uma vez por Descanso Longo sem custo, ou gastando um espaço de 1º círculo ou maior). Escolha a Essência Dracônica (ácido, frio, fogo, elétrico ou veneno) a cada invocação: o draco é imune a ela. Ficha: CA 14 + bônus de proficiência; PV 5 + 5 × nível de patrulheiro; desl. 12 m; mordida com +PB, 1d6 + PB perfurante. Reação Golpes Infundidos: quando outra criatura a até 9 m que ele veja atinge um alvo, +1d6 do tipo da essência. Age no seu turno; comande-o com Ação Bônus (senão só usa Esquivar).',
            'As a Magic action, summon a Small drake (once per Long Rest for free, or by expending a level 1+ spell slot). Choose its Draconic Essence (acid, cold, fire, lightning, or poison) each time: the drake is immune to it. Stats: AC 14 + proficiency bonus; HP 5 + 5 × Ranger level; 40 ft speed; bite +PB to hit, 1d6 + PB piercing. Infused Strikes reaction: when another creature it can see within 30 ft hits a target, +1d6 of the essence type. It acts on your turn; command it with a Bonus Action (otherwise it only Dodges).'),
        ],
      },
      7: { features: [
        f('bondOfFangAndScale', 'Laço de Presa e Escama', 'Bond of Fang and Scale',
          'O draco fica Médio, ganha Deslocamento de Voo igual ao terrestre e pode servir de montaria para uma criatura Média ou menor (você, se quiser). A mordida causa +1d6 do tipo da essência. Você ganha Resistência ao tipo de dano da essência escolhida.',
          'The drake becomes Medium, gains a Fly Speed equal to its walking speed, and can be ridden by a Medium or smaller creature (you, if you like). Its bite deals +1d6 of the essence type. You gain Resistance to the chosen essence\'s damage type.'),
      ] },
      11: { features: [
        f('drakesBreath', 'Sopro do Draco', "Drake's Breath",
          'Como ação, você ou o draco exalam um cone de 9 m: cada criatura faz salvaguarda de Destreza contra sua CD de magia, sofrendo 8d6 de ácido, frio, fogo, elétrico ou veneno (à sua escolha) se falhar, ou metade se tiver sucesso. Uma vez por Descanso Longo; depois, gastando um espaço de 3º círculo ou maior.',
          'As an action, you or the drake exhale a 30-ft cone: each creature makes a Dexterity save against your spell save DC, taking 8d6 acid, cold, fire, lightning, or poison (your choice) on a failure, or half on a success. Once per Long Rest; afterward, by expending a level 3+ spell slot.'),
      ] },
      15: { features: [
        f('perfectedBond', 'Laço Aperfeiçoado', 'Perfected Bond',
          'O draco fica Grande; montado nele, você usa o voo dele. A mordida passa a causar +2d6 do tipo da essência e o Sopro do Draco, 10d6. Resistência Reflexa: quando você ou o draco sofrem dano estando a até 9 m um do outro, pode usar sua Reação para dar Resistência a esse dano; usos iguais ao bônus de proficiência por Descanso Longo.',
          'The drake becomes Large; while riding it you use its flight. Its bite deals +2d6 of the essence type and Drake\'s Breath deals 10d6. Reflexive Resistance: when you or the drake take damage while within 30 ft of each other, you can take a Reaction to grant Resistance to that damage; uses equal your proficiency bonus per Long Rest.'),
      ] },
    },
  },
};

// ---------------------------------------------------------------------------
// Recursos com usos (sem espaços de magia)
// ---------------------------------------------------------------------------
const WIS = { ability: 'wis', min: 1 };
const resources = [
  { id: 'favoredEnemy', name: b('Marca do Caçador grátis', "Free Hunter's Mark"), rules: '2024',
    desc: b('Inimigo Favorito: conjura Marca do Caçador sem espaço de magia.', "Favored Enemy: cast Hunter's Mark without a spell slot."),
    uses: { byLevel: { 1: 2, 5: 3, 9: 4, 13: 5, 17: 6 } }, recharge: 'long' },
  { id: 'tireless', name: b('Incansável', 'Tireless'), rules: '2024', minLevel: 10,
    desc: b('Ação Mágica: 1d8 + SAB PV temporários.', 'Magic action: 1d8 + WIS temporary HP.'),
    uses: WIS, recharge: 'long' },
  { id: 'naturesVeil', name: b('Véu da Natureza', "Nature's Veil"), rules: '2024', minLevel: 14,
    desc: b('Ação Bônus: Invisível até o fim do próximo turno.', 'Bonus Action: Invisible until the end of your next turn.'),
    uses: WIS, recharge: 'long' },
  // Subclasses
  { id: 'dreadfulStrike', name: b('Golpe Temível', 'Dreadful Strike'), rules: '2024', subclass: ['gloomstalker'], minLevel: 3,
    desc: b('1×/turno, dano Psíquico extra ao acertar com arma.', 'Once per turn, extra Psychic damage on a weapon hit.'),
    uses: WIS, recharge: 'long', die: { byLevel: { 3: '2d6', 11: '2d8' } } },
  { id: 'feyReinforcements', name: b('Reforços Feéricos', 'Fey Reinforcements'), subclass: ['feywanderer'], minLevel: 11,
    desc: b('Invocar Fada sem espaço de magia.', 'Summon Fey without a spell slot.'),
    uses: { fixed: 1 }, recharge: 'long' },
  { id: 'mistyWanderer', name: b('Andarilho Nebuloso', 'Misty Wanderer'), subclass: ['feywanderer'], minLevel: 15,
    desc: b('Passo Nebuloso sem espaço de magia.', 'Misty Step without a spell slot.'),
    uses: WIS, recharge: 'long' },
  { id: 'detectPortal', name: b('Detectar Portal', 'Detect Portal'), subclass: ['horizonwalker'], minLevel: 3,
    uses: { fixed: 1 }, recharge: 'short' },
  { id: 'etherealStep', name: b('Passo Etéreo', 'Ethereal Step'), subclass: ['horizonwalker'], minLevel: 7,
    uses: { fixed: 1 }, recharge: 'short' },
  { id: 'huntersSense', name: b('Sentido do Caçador', "Hunter's Sense"), subclass: ['monsterslayer'], minLevel: 3,
    uses: WIS, recharge: 'long' },
  { id: 'magicUsersNemesis', name: b('Nêmesis dos Conjuradores', "Magic-User's Nemesis"), subclass: ['monsterslayer'], minLevel: 11,
    uses: { fixed: 1 }, recharge: 'short' },
  { id: 'writhingTide', name: b('Maré Serpenteante', 'Writhing Tide'), subclass: ['swarmkeeper'], minLevel: 7,
    desc: b('Sem usos, pode gastar um espaço de 2º círculo+.', 'Without uses, you can expend a level 2+ spell slot.'),
    uses: { profBonus: true }, recharge: 'long' },
  { id: 'swarmingDispersal', name: b('Dispersão do Enxame', 'Swarming Dispersal'), subclass: ['swarmkeeper'], minLevel: 15,
    desc: b('Sem usos, pode gastar um espaço de 3º círculo+.', 'Without uses, you can expend a level 3+ spell slot.'),
    uses: { profBonus: true }, recharge: 'long' },
  { id: 'drakeCompanion', name: b('Invocar Draco', 'Summon Drake'), subclass: ['drakewarden'], minLevel: 3,
    desc: b('Sem usos, pode gastar um espaço de 1º círculo+.', 'Without uses, you can expend a level 1+ spell slot.'),
    uses: { fixed: 1 }, recharge: 'long' },
  { id: 'drakesBreath', name: b('Sopro do Draco', "Drake's Breath"), subclass: ['drakewarden'], minLevel: 11,
    desc: b('Sem usos, pode gastar um espaço de 3º círculo+.', 'Without uses, you can expend a level 3+ spell slot.'),
    uses: { fixed: 1 }, recharge: 'long', die: { byLevel: { 11: '8d6', 15: '10d6' } } },
  { id: 'reflexiveResistance', name: b('Resistência Reflexa', 'Reflexive Resistance'), subclass: ['drakewarden'], minLevel: 15,
    uses: { profBonus: true }, recharge: 'long' },
];

export default {
  classId: 'ranger',
  pools,
  // Regras de 2024 (SRD 5.2.1). Deltas por nível de patrulheiro.
  choices: {
    1: { weaponMastery: 2 },
    2: { fightingStyle: 1, expertise: 1, languages: 2 },
    9: { expertise: 2 },
  },
  // Regras de 2014 (PHB/SRD 5.1): Inimigo Favorito (1, 6, 14) e Terreno Favorito (1, 6, 10).
  // Estilo de Luta no 2 (como o paladino 2014). Explorador Hábil (TCE, opcional) abre
  // vagas pela opção `deftExplorer` do pool `tceOptional`.
  legacyChoices: {
    1: { favoredEnemy: 1, favoredTerrain: 1, tceOptional: 1 },
    2: { fightingStyle: 1 },
    6: { favoredEnemy: 1, favoredTerrain: 1 },
    10: { favoredTerrain: 1 },
    14: { favoredEnemy: 1 },
  },
  // Fichas 2024.
  subclassChoices: {
    hunter: { 3: { huntersPrey: 1 }, 7: { defensiveTactics: 1 } },
    beastmaster: { 3: { primalCompanion: 1 } },
    gloomstalker: { 7: { ironMind: 1 } },
    feywanderer: { 3: { otherworldlyGlamour: 1, feywildGift: 1 } },
    swarmkeeper: { 3: { swarmAppearance: 1 } },
    drakewarden: { 3: { languages: 1, draconicEssence: 1 } },
  },
  // Fichas 2014 (Caçador PHB 2014 com as 4 escolhas; as demais iguais às de 2024).
  legacySubclassChoices: {
    hunter: { 3: { huntersPrey: 1 }, 7: { defensiveTactics: 1 }, 11: { hunterMultiattack: 1 }, 15: { superiorHuntersDefense: 1 } },
    beastmaster: { 3: { primalCompanion: 1 } },
    gloomstalker: { 7: { ironMind: 1 } },
    feywanderer: { 3: { otherworldlyGlamour: 1, feywildGift: 1 } },
    swarmkeeper: { 3: { swarmAppearance: 1 } },
    drakewarden: { 3: { languages: 1, draconicEssence: 1 } },
  },
  resources,
  features,
  subclasses,
};
