// Paladino — traços 2024 (SRD 5.2.1, CC-BY 4.0), estilo de luta, maestria e
// Juramentos Sagrados. Formato em README.md. Todos os textos são resumos
// originais (ou baseados no SRD); nada copiado de livros pagos.
import { SHARED } from './shared.js';

const b = (pt, en) => ({ pt, en });
const f = (id, name, desc) => ({ id, name, desc });
const oathSpells = (id, pt, en) => f(id, b(`Magias do ${pt}`, `${en} Spells`),
  b(`Nos níveis de paladino 3, 5, 9, 13 e 17 você passa a ter sempre preparadas as magias do ${pt}. Elas não contam no limite de magias preparadas e contam como magias de paladino.`,
    `At Paladin levels 3, 5, 9, 13, and 17 you always have the ${en} spells prepared. They don't count against your prepared spells and count as Paladin spells for you.`));
// Nota comum aos juramentos de suplemento (escritos para as regras de 2014).
const LEGACY_NOTE = b(
  'Juramento escrito para as regras de 2014, usado nas fichas 2024 sem mudança de níveis. As opções de Canalizar Divindade gastam os usos do Canalizar Divindade da classe.',
  'Oath written for the 2014 rules, used on 2024 sheets with no level changes. Its Channel Divinity options spend the class Channel Divinity uses.');

// Opção exclusiva do paladino no Estilo de Luta (SRD 5.2.1).
const blessedWarrior = {
  id: 'blessedWarrior',
  name: b('Guerreiro Abençoado', 'Blessed Warrior'),
  source: 'SRD',
  desc: b('Em vez de um talento de Estilo de Luta, aprende 2 truques de clérigo (Orientação e Chama Sagrada são recomendados). Eles contam como magias de paladino e usam Carisma. Ao ganhar um nível de paladino, pode trocar um deles por outro truque de clérigo.',
    'Instead of a Fighting Style feat, learn 2 Cleric cantrips (Guidance and Sacred Flame are recommended). They count as Paladin spells and use Charisma. Whenever you gain a Paladin level, you can replace one of them with another Cleric cantrip.'),
  choices: { blessedWarriorCantrip: 2 },
};

export default {
  classId: 'paladin',

  pools: {
    fightingStyle: { ...SHARED.fightingStyle, options: [...SHARED.fightingStyle.options, blessedWarrior] },
    blessedWarriorCantrip: {
      name: b('Truques de Clérigo (Guerreiro Abençoado)', 'Cleric Cantrips (Blessed Warrior)'),
      kind: 'spell',
      filter: { classes: ['cleric'], level: 0 },
      grantAs: 'cantrip',
      swapOnLevelUp: 1,
    },
    weaponMastery: SHARED.weaponMastery,
  },

  // 2024: Maestria em Armas (2 tipos) no nível 1; Estilo de Luta no 2.
  choices: { 1: { weaponMastery: 2 }, 2: { fightingStyle: 1 } },
  // 2014: Estilo de Luta no 2 (Guerreiro Abençoado é opção do TCE).
  legacyChoices: { 2: { fightingStyle: 1 } },

  // Contadores com usos (sem espaços de magia). Formato em README.md.
  resources: [
    { id: 'layOnHands', name: b('Imposição de Mãos', 'Lay On Hands'),
      desc: b('Reserva de PV de cura (5 × nível de paladino).', 'Healing pool (5 × Paladin level HP).'),
      uses: { perClassLevel: 5 }, recharge: 'long', minLevel: 1 },
    { id: 'channelDivinity', name: b('Canalizar Divindade', 'Channel Divinity'),
      desc: b('Recupera 1 uso no descanso curto e todos no longo.', 'Regain 1 use on a Short Rest, all on a Long Rest.'),
      uses: { byLevel: { 3: 2, 11: 3 } }, recharge: 'long', shortRestRegain: 1, rules: '2024' },
    { id: 'channelDivinity', name: b('Canalizar Divindade', 'Channel Divinity'),
      uses: { fixed: 1 }, recharge: 'short', minLevel: 3, rules: '2014' },
    { id: 'freeDivineSmite', name: b('Golpe Divino sem espaço', 'Free Divine Smite'),
      desc: b('Golpe do Paladino: conjura Golpe Divino sem gastar espaço.', "Paladin's Smite: cast Divine Smite without a slot."),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 2, rules: '2024' },
    { id: 'freeFindSteed', name: b('Encontrar Corcel sem espaço', 'Free Find Steed'),
      desc: b('Corcel Fiel: conjura Encontrar Corcel sem gastar espaço.', 'Faithful Steed: cast Find Steed without a slot.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 5, rules: '2024' },
    { id: 'cleansingTouch', name: b('Toque Purificador', 'Cleansing Touch'),
      uses: { ability: 'cha', min: 1 }, recharge: 'long', minLevel: 14, rules: '2014' },
    // Juramentos
    { id: 'undyingSentinel', name: b('Sentinela Imortal', 'Undying Sentinel'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 15, subclass: ['ancients'] },
    { id: 'gloriousDefense', name: b('Defesa Gloriosa', 'Glorious Defense'),
      uses: { ability: 'cha', min: 1 }, recharge: 'long', minLevel: 15, subclass: ['glory'] },
    ...[
      ['holyNimbus', 'Nimbo Sagrado', 'Holy Nimbus', 'devotion', true],
      ['elderChampion', 'Campeão Ancião', 'Elder Champion', 'ancients', true],
      ['livingLegend', 'Lenda Viva', 'Living Legend', 'glory', true],
      ['avengingAngel', 'Anjo Vingador', 'Avenging Angel', 'vengeance', true],
      ['mortalBulwark', 'Baluarte Mortal', 'Mortal Bulwark', 'watchers', true],
      ['dreadLord', 'Senhor do Pavor', 'Dread Lord', 'oathbreaker', false],
      ['exaltedChampion', 'Campeão Exaltado', 'Exalted Champion', 'crown', false],
      ['invincibleConqueror', 'Conquistador Invencível', 'Invincible Conqueror', 'conquest', false],
    ].map(([id, pt, en, sub, slot]) => ({
      id, name: b(pt, en),
      ...(slot ? { desc: b('Também pode ser recuperado gastando um espaço de 5º círculo.', 'Can also be restored by expending a level 5 spell slot.') } : {}),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 20, subclass: [sub],
    })),
  ],

  features: {
    1: [
      f('layOnHands', b('Imposição de Mãos', 'Lay On Hands'),
        b('Você tem uma reserva de cura igual a 5 × seu nível de paladino, renovada no descanso longo. Com uma Ação Bônus, toca uma criatura (você inclusive) e restaura PV gastando a reserva. Também pode gastar 5 PV da reserva para encerrar a condição Envenenado do alvo (esses pontos não curam).',
          'You have a healing pool equal to 5 × your Paladin level, restored on a Long Rest. As a Bonus Action, touch a creature (possibly yourself) and restore Hit Points from the pool. You can also spend 5 HP from the pool to remove the Poisoned condition (those points don\'t heal).')),
      f('spellcasting', b('Conjuração', 'Spellcasting'),
        b('Você prepara magias de paladino usando Carisma, com um Símbolo Sagrado como foco. Começa com 2 magias de 1º círculo (Heroísmo e Golpe Abrasador são recomendadas); o número cresce conforme a tabela da classe. Ao terminar um descanso longo, pode trocar 1 magia preparada. Magias sempre preparadas por outros traços não contam no limite.',
          'You prepare Paladin spells using Charisma, with a Holy Symbol as your focus. You start with 2 level 1 spells (Heroism and Searing Smite are recommended); the number grows per the class table. When you finish a Long Rest, you can swap 1 prepared spell. Spells always prepared by other features don\'t count against the limit.')),
      f('weaponMastery', b('Maestria em Armas', 'Weapon Mastery'),
        b('Você pode usar as propriedades de maestria de 2 tipos de arma com que é proficiente (por exemplo, Espada Longa e Azagaia). Ao terminar um descanso longo, pode trocar esses tipos.',
          'You can use the mastery properties of 2 kinds of weapons you are proficient with (for example, Longswords and Javelins). When you finish a Long Rest, you can change those kinds.')),
    ],
    2: [
      f('fightingStyle', b('Estilo de Luta', 'Fighting Style'),
        b('Você ganha um talento de Estilo de Luta à sua escolha ou, em vez disso, a opção Guerreiro Abençoado: 2 truques de clérigo que contam como magias de paladino (Carisma) e podem ser trocados, um por vez, a cada nível de paladino.',
          'You gain a Fighting Style feat of your choice or, instead, the Blessed Warrior option: 2 Cleric cantrips that count as Paladin spells (Charisma), one of which can be swapped each time you gain a Paladin level.')),
      f('paladinsSmite', b('Golpe do Paladino', "Paladin's Smite"),
        b('Você tem sempre preparada a magia Golpe Divino e pode conjurá-la uma vez sem gastar espaço de magia, recuperando esse uso no descanso longo.',
          'You always have Divine Smite prepared, and you can cast it once without expending a spell slot, regaining that use on a Long Rest.')),
    ],
    3: [
      f('channelDivinity', b('Canalizar Divindade', 'Channel Divinity'),
        b('Você canaliza energia divina para criar efeitos. Tem 2 usos (3 a partir do nível 11); recupera 1 uso no descanso curto e todos no longo. Cada uso cria um efeito à sua escolha entre os da classe (Sentido Divino, e Abjurar Inimigos no nível 9) e os da subclasse. A CD é a da sua magia.',
          'You channel divine energy to create effects. You have 2 uses (3 from level 11); you regain 1 use on a Short Rest and all on a Long Rest. Each use creates an effect of your choice among the class options (Divine Sense, plus Abjure Foes at level 9) and your subclass options. The DC is your spell save DC.')),
      f('divineSense', b('Sentido Divino', 'Divine Sense'),
        b('Canalizar Divindade, Ação Bônus: por 10 minutos (ou até ficar Incapacitado) você sabe a localização e o tipo de Celestiais, Corruptores e Mortos-vivos a até 18 m, e percebe lugares ou objetos consagrados ou profanados nesse raio.',
          'Channel Divinity, Bonus Action: for 10 minutes (or until Incapacitated) you know the location and type of Celestials, Fiends, and Undead within 60 feet, and sense consecrated or desecrated places or objects in that radius.')),
      f('paladinSubclass', b('Subclasse de Paladino', 'Paladin Subclass'),
        b('Você faz um Juramento Sagrado (subclasse) e ganha os traços dele nos níveis de paladino 3, 7, 15 e 20, além das magias de juramento nos níveis 3, 5, 9, 13 e 17.',
          'You swear a Sacred Oath (subclass) and gain its features at Paladin levels 3, 7, 15, and 20, plus oath spells at levels 3, 5, 9, 13, and 17.')),
    ],
    4: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'),
        b('Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique. Ganha este traço de novo nos níveis de paladino 8, 12 e 16.',
          'You gain the Ability Score Improvement feat or another feat you qualify for. You gain this feature again at Paladin levels 8, 12, and 16.')),
    ],
    5: [
      f('extraAttack', b('Ataque Extra', 'Extra Attack'),
        b('Você ataca duas vezes, em vez de uma, sempre que usa a ação Atacar no seu turno.',
          'You can attack twice, instead of once, whenever you take the Attack action on your turn.')),
      f('faithfulSteed', b('Corcel Fiel', 'Faithful Steed'),
        b('Você tem sempre preparada a magia Encontrar Corcel e pode conjurá-la uma vez sem gastar espaço de magia, recuperando esse uso no descanso longo.',
          'You always have Find Steed prepared, and you can cast it once without expending a spell slot, regaining that use on a Long Rest.')),
    ],
    6: [
      f('auraOfProtection', b('Aura de Proteção', 'Aura of Protection'),
        b('Você emana uma aura invisível de 3 m (Emanação de 10 pés). Você e seus aliados nela somam seu modificador de Carisma (mínimo +1) às salvaguardas. A aura fica inativa enquanto você estiver Incapacitado. Uma criatura só se beneficia de uma Aura de Proteção por vez.',
          'You radiate an unseeable 10-foot Emanation. You and your allies in it add your Charisma modifier (minimum +1) to saving throws. The aura is inactive while you are Incapacitated. A creature benefits from only one Aura of Protection at a time.')),
    ],
    8: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'),
        b('Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
          'You gain the Ability Score Improvement feat or another feat you qualify for.')),
    ],
    9: [
      f('abjureFoes', b('Abjurar Inimigos', 'Abjure Foes'),
        b('Canalizar Divindade, ação Mágica: escolha até um número de criaturas igual ao seu modificador de Carisma (mínimo 1) que você veja a até 18 m. Cada uma faz uma salvaguarda de Sabedoria ou fica Amedrontada por 1 minuto ou até sofrer dano. Assim amedrontada, em cada turno só pode se mover, usar uma ação ou usar uma Ação Bônus.',
          'Channel Divinity, Magic action: target up to your Charisma modifier (minimum 1) creatures you can see within 60 feet. Each makes a Wisdom saving throw or is Frightened for 1 minute or until it takes damage. While Frightened this way, on its turns it can only move, take an action, or take a Bonus Action.')),
    ],
    10: [
      f('auraOfCourage', b('Aura de Coragem', 'Aura of Courage'),
        b('Você e seus aliados têm Imunidade à condição Amedrontado enquanto estão na sua Aura de Proteção. Um aliado amedrontado que entra na aura não sofre os efeitos da condição enquanto estiver nela.',
          'You and your allies have Immunity to the Frightened condition while in your Aura of Protection. A Frightened ally who enters the aura ignores that condition while there.')),
    ],
    11: [
      f('radiantStrikes', b('Golpes Radiantes', 'Radiant Strikes'),
        b('Quando você acerta um alvo com uma jogada de ataque usando uma arma corpo a corpo ou um Ataque Desarmado, ele sofre 1d8 de dano Radiante extra.',
          'When you hit a target with an attack roll using a Melee weapon or an Unarmed Strike, it takes an extra 1d8 Radiant damage.')),
    ],
    12: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'),
        b('Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
          'You gain the Ability Score Improvement feat or another feat you qualify for.')),
    ],
    14: [
      f('restoringTouch', b('Toque Restaurador', 'Restoring Touch'),
        b('Ao usar Imposição de Mãos, você também pode remover do alvo as condições Cego, Enfeitiçado, Surdo, Amedrontado, Paralisado ou Atordoado, gastando 5 PV da reserva por condição (esses pontos não curam).',
          'When you use Lay On Hands, you can also remove the Blinded, Charmed, Deafened, Frightened, Paralyzed, or Stunned condition, spending 5 HP from the pool per condition (those points don\'t heal).')),
    ],
    16: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'),
        b('Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
          'You gain the Ability Score Improvement feat or another feat you qualify for.')),
    ],
    18: [
      f('auraExpansion', b('Expansão da Aura', 'Aura Expansion'),
        b('Sua Aura de Proteção passa a ser uma Emanação de 9 m (30 pés).',
          'Your Aura of Protection is now a 30-foot Emanation.')),
    ],
    19: [
      f('epicBoon', b('Dádiva Épica', 'Epic Boon'),
        b('Você ganha um talento de Dádiva Épica ou outro talento para o qual se qualifique. Dádiva da Visão Verdadeira é recomendada.',
          'You gain an Epic Boon feat or another feat you qualify for. Boon of Truesight is recommended.')),
    ],
  },

  subclasses: {
    // ===== PHB 2024 =====
    devotion: {
      name: b('Juramento de Devoção', 'Oath of Devotion'),
      source: 'SRD',
      desc: b('Defenda os ideais de justiça, virtude e ordem, como um cavaleiro de conto de fadas.',
        'Uphold the ideals of justice, virtue, and order, like a knight in shining armor.'),
      levels: {
        3: {
          features: [
            oathSpells('oathOfDevotionSpells', 'Juramento de Devoção', 'Oath of Devotion'),
            f('sacredWeapon', b('Arma Sagrada', 'Sacred Weapon'),
              b('Canalizar Divindade, ao usar a ação Atacar: por 10 minutos, uma arma corpo a corpo que você empunha soma seu modificador de Carisma (mínimo +1) às jogadas de ataque, pode causar dano Radiante em vez do normal e emite luz plena em 6 m e penumbra por mais 6 m. Termina se você soltar a arma ou usar o traço de novo.',
                'Channel Divinity, when you take the Attack action: for 10 minutes, a Melee weapon you hold adds your Charisma modifier (minimum +1) to attack rolls, can deal Radiant damage instead of its normal type, and sheds Bright Light in 20 feet and Dim Light 20 feet beyond. Ends if you stop carrying it or use this again.')),
          ],
          autoSpells: ['protectionFromEvilAndGood', 'shieldOfFaith'],
        },
        5: { autoSpells: ['aid', 'zoneOfTruth'] },
        7: {
          features: [f('auraOfDevotion', b('Aura de Devoção', 'Aura of Devotion'),
            b('Você e seus aliados têm Imunidade à condição Enfeitiçado enquanto estão na sua Aura de Proteção. Um aliado enfeitiçado que entra na aura não sofre os efeitos da condição enquanto estiver nela.',
              'You and your allies have Immunity to the Charmed condition while in your Aura of Protection. A Charmed ally who enters the aura ignores that condition while there.'))],
        },
        9: { autoSpells: ['beaconOfHope', 'dispelMagic'] },
        13: { autoSpells: ['freedomOfMovement', 'guardianOfFaith'] },
        15: {
          features: [f('smiteOfProtection', b('Golpe de Proteção', 'Smite of Protection'),
            b('Sempre que você conjura Golpe Divino, você e seus aliados na Aura de Proteção têm Meia Cobertura até o início do seu próximo turno.',
              'Whenever you cast Divine Smite, you and your allies in your Aura of Protection have Half Cover until the start of your next turn.'))],
        },
        17: { autoSpells: ['commune', 'flameStrike'] },
        20: {
          features: [f('holyNimbus', b('Nimbo Sagrado', 'Holy Nimbus'),
            b('Ação Bônus: por 10 minutos sua Aura de Proteção ganha poder sagrado. Você tem Vantagem em salvaguardas impostas por Corruptores e Mortos-vivos; todo inimigo que começa o turno na aura sofre dano Radiante igual ao seu modificador de Carisma + bônus de proficiência; a aura é preenchida por luz plena que é luz solar. 1 vez por descanso longo, ou gastando um espaço de 5º círculo.',
              'Bonus Action: for 10 minutes your Aura of Protection gains holy power. You have Advantage on saving throws forced by Fiends and Undead; each enemy that starts its turn in the aura takes Radiant damage equal to your Charisma modifier + Proficiency Bonus; the aura fills with Bright Light that is sunlight. Once per Long Rest, or by expending a level 5 spell slot.'))],
        },
      },
    },

    ancients: {
      name: b('Juramento dos Anciões', 'Oath of the Ancients'),
      source: 'PHB24',
      desc: b('Proteja a luz, a vida e a beleza do mundo contra as trevas, com magia ligada à natureza.',
        'Preserve light, life, and beauty against the darkness, with nature-tinged magic.'),
      levels: {
        3: {
          features: [
            oathSpells('oathOfTheAncientsSpells', 'Juramento dos Anciões', 'Oath of the Ancients'),
            f('naturesWrath', b('Ira da Natureza', "Nature's Wrath"),
              b('Canalizar Divindade, ação Mágica: vinhas espectrais surgem ao seu redor. Cada criatura que você escolher a até 4,5 m faz uma salvaguarda de Força ou fica Contida por 1 minuto, repetindo a salvaguarda ao fim de cada turno dela.',
                'Channel Divinity, Magic action: spectral vines spring up around you. Each creature of your choice within 15 feet makes a Strength saving throw or is Restrained for 1 minute, repeating the save at the end of each of its turns.')),
          ],
          autoSpells: ['ensnaringStrike', 'speakWithAnimals'],
        },
        5: { autoSpells: ['mistyStep', 'moonbeam'] },
        7: {
          features: [f('auraOfWarding', b('Aura de Resguardo', 'Aura of Warding'),
            b('Você e seus aliados têm Resistência a dano Necrótico, Psíquico e Radiante enquanto estão na sua Aura de Proteção.',
              'You and your allies have Resistance to Necrotic, Psychic, and Radiant damage while in your Aura of Protection.'))],
        },
        9: { autoSpells: ['plantGrowth', 'protectionFromEnergy'] },
        13: { autoSpells: ['iceStorm', 'stoneskin'] },
        15: {
          features: [f('undyingSentinel', b('Sentinela Imortal', 'Undying Sentinel'),
            b('Quando você cai a 0 PV sem morrer, pode ficar com 1 PV e recuperar PV iguais a 3 × seu nível de paladino (1 vez por descanso longo). Além disso, você não sofre os efeitos da velhice e não pode ser envelhecido magicamente.',
              'When you drop to 0 HP and don\'t die outright, you can drop to 1 HP instead and regain HP equal to 3 × your Paladin level (once per Long Rest). You also don\'t suffer the drawbacks of old age and can\'t be aged magically.'))],
        },
        17: { autoSpells: ['communeWithNature', 'treeStride'] },
        20: {
          features: [f('elderChampion', b('Campeão Ancião', 'Elder Champion'),
            b('Ação Bônus: por 1 minuto sua Aura de Proteção ganha poder primordial. Inimigos na aura têm Desvantagem nas salvaguardas contra suas magias e opções de Canalizar Divindade; você recupera 10 PV no início de cada turno seu; magias de paladino com tempo de 1 ação podem ser conjuradas como Ação Bônus. 1 vez por descanso longo, ou gastando um espaço de 5º círculo.',
              'Bonus Action: for 1 minute your Aura of Protection gains primal power. Enemies in the aura have Disadvantage on saves against your spells and Channel Divinity options; you regain 10 HP at the start of each of your turns; Paladin spells with a casting time of an action can be cast as a Bonus Action. Once per Long Rest, or by expending a level 5 spell slot.'))],
        },
      },
    },

    glory: {
      name: b('Juramento da Glória', 'Oath of Glory'),
      source: 'PHB24',
      desc: b('Busque a glória por meio de feitos heroicos, inspirando os outros com proezas atléticas e coragem.',
        'Strive for glory through heroic deeds, inspiring others with athletic prowess and courage.'),
      levels: {
        3: {
          features: [
            oathSpells('oathOfGlorySpells', 'Juramento da Glória', 'Oath of Glory'),
            f('inspiringSmite', b('Golpe Inspirador', 'Inspiring Smite'),
              b('Canalizar Divindade, logo após conjurar Golpe Divino: distribua PV temporários iguais a 2d8 + seu nível de paladino entre criaturas à sua escolha a até 9 m (você pode estar entre elas).',
                'Channel Divinity, right after you cast Divine Smite: distribute Temporary HP equal to 2d8 + your Paladin level among creatures of your choice within 30 feet (possibly including you).')),
            f('peerlessAthlete', b('Atleta Sem Igual', 'Peerless Athlete'),
              b('Canalizar Divindade, Ação Bônus: por 1 hora você tem Vantagem em testes de Força (Atletismo) e Destreza (Acrobacia), e seus saltos em distância e em altura aumentam em 3 m.',
                'Channel Divinity, Bonus Action: for 1 hour you have Advantage on Strength (Athletics) and Dexterity (Acrobatics) checks, and your long and high jump distances increase by 10 feet.')),
          ],
          autoSpells: ['guidingBolt', 'heroism'],
        },
        5: { autoSpells: ['enhanceAbility', 'magicWeapon'] },
        7: {
          features: [f('auraOfAlacrity', b('Aura de Prontidão', 'Aura of Alacrity'),
            b('Seu deslocamento aumenta em 3 m. Um aliado que entra na sua Aura de Proteção ou começa o turno nela ganha +3 m de deslocamento até o fim do próximo turno dele.',
              'Your Speed increases by 10 feet. An ally who enters your Aura of Protection or starts its turn there gains +10 feet of Speed until the end of its next turn.'))],
        },
        9: { autoSpells: ['haste', 'protectionFromEnergy'] },
        13: { autoSpells: ['compulsion', 'freedomOfMovement'] },
        15: {
          features: [f('gloriousDefense', b('Defesa Gloriosa', 'Glorious Defense'),
            b('Reação, quando você ou uma criatura que você vê a até 3 m é atingida por uma jogada de ataque: some seu modificador de Carisma (mínimo +1) à CA do alvo contra esse ataque. Se o ataque errar, você pode fazer um ataque com arma contra o atacante, se ele estiver ao alcance. Usos iguais ao modificador de Carisma (mínimo 1) por descanso longo.',
              'Reaction, when you or a creature you can see within 10 feet is hit by an attack roll: add your Charisma modifier (minimum +1) to the target\'s AC against it. If the attack then misses, you can make one weapon attack against the attacker if it\'s within reach. Uses equal to your Charisma modifier (minimum 1) per Long Rest.'))],
        },
        17: { autoSpells: ['legendLore', 'yolandesRegalPresence'] },
        20: {
          features: [f('livingLegend', b('Lenda Viva', 'Living Legend'),
            b('Ação Bônus: por 10 minutos você tem Vantagem em testes de Carisma; 1 vez por turno, quando erra um ataque com arma, pode transformá-lo em acerto; e, com sua Reação, pode rolar de novo uma salvaguarda falha. 1 vez por descanso longo, ou gastando um espaço de 5º círculo.',
              'Bonus Action: for 10 minutes you have Advantage on Charisma checks; once per turn, when you miss with a weapon attack, you can make it hit instead; and you can use your Reaction to reroll a failed saving throw. Once per Long Rest, or by expending a level 5 spell slot.'))],
        },
      },
    },

    vengeance: {
      name: b('Juramento de Vingança', 'Oath of Vengeance'),
      source: 'PHB24',
      desc: b('Jure punir quem comete crimes graves, custe o que custar.',
        'Swear to punish those who commit grievous wrongs, whatever the cost.'),
      levels: {
        3: {
          features: [
            oathSpells('oathOfVengeanceSpells', 'Juramento de Vingança', 'Oath of Vengeance'),
            f('vowOfEnmity', b('Voto de Inimizade', 'Vow of Enmity'),
              b('Canalizar Divindade, ao usar a ação Atacar: escolha uma criatura que você veja a até 9 m. Por 1 minuto você tem Vantagem nas jogadas de ataque contra ela. Se ela cair a 0 PV antes disso, você pode transferir o voto para outra criatura a até 9 m no seu próximo turno.',
                'Channel Divinity, when you take the Attack action: choose a creature you can see within 30 feet. For 1 minute you have Advantage on attack rolls against it. If it drops to 0 HP before then, you can move the vow to another creature within 30 feet on your next turn.')),
          ],
          autoSpells: ['bane', 'huntersMark'],
        },
        5: { autoSpells: ['holdPerson', 'mistyStep'] },
        7: {
          features: [f('relentlessAvenger', b('Vingador Implacável', 'Relentless Avenger'),
            b('Quando você acerta uma criatura com um Ataque de Oportunidade, o deslocamento dela vira 0 até o fim do turno atual, e você pode se mover até metade do seu deslocamento como parte da mesma Reação, sem provocar Ataques de Oportunidade.',
              'When you hit a creature with an Opportunity Attack, its Speed becomes 0 until the end of the current turn, and you can move up to half your Speed as part of the same Reaction without provoking Opportunity Attacks.'))],
        },
        9: { autoSpells: ['haste', 'protectionFromEnergy'] },
        13: { autoSpells: ['banishment', 'dimensionDoor'] },
        15: {
          features: [f('soulOfVengeance', b('Alma da Vingança', 'Soul of Vengeance'),
            b('Logo após a criatura sob seu Voto de Inimizade fazer uma jogada de ataque (acertando ou errando), você pode usar sua Reação para fazer um ataque corpo a corpo contra ela, se estiver ao alcance.',
              'Immediately after the creature under your Vow of Enmity makes an attack roll (hit or miss), you can use your Reaction to make a melee attack against it if it\'s within reach.'))],
        },
        17: { autoSpells: ['holdMonster', 'scrying'] },
        20: {
          features: [f('avengingAngel', b('Anjo Vingador', 'Avenging Angel'),
            b('Ação Bônus: por 10 minutos você ganha deslocamento de voo de 18 m e pode pairar; e todo inimigo que começa o turno na sua Aura de Proteção faz uma salvaguarda de Sabedoria ou fica Amedrontado por 1 minuto ou até sofrer dano (jogadas de ataque contra ele têm Vantagem). 1 vez por descanso longo, ou gastando um espaço de 5º círculo.',
              'Bonus Action: for 10 minutes you gain a 60-foot Fly Speed and can hover; and each enemy that starts its turn in your Aura of Protection makes a Wisdom save or is Frightened for 1 minute or until it takes damage (attack rolls against it have Advantage). Once per Long Rest, or by expending a level 5 spell slot.'))],
        },
      },
    },

    // ===== Suplementos (regras de 2014, níveis já em 3/7/15/20) =====
    oathbreaker: {
      name: b('Quebrador de Juramento', 'Oathbreaker'),
      source: 'DMG',
      desc: b(`Paladino que rompeu seus votos por ambição ou por um poder sombrio. Exige aprovação do Mestre. ${LEGACY_NOTE.pt}`,
        `A paladin who broke their vows out of ambition or for a dark power. Requires DM approval. ${LEGACY_NOTE.en}`),
      levels: {
        3: {
          features: [
            oathSpells('oathbreakerSpells', 'Quebrador de Juramento', 'Oathbreaker'),
            f('controlUndead', b('Controlar Mortos-vivos', 'Control Undead'),
              b('Canalizar Divindade, Ação: um Morto-vivo que você veja a até 9 m faz uma salvaguarda de Sabedoria. Se falhar, obedece a você por 24 horas ou até você usar este traço de novo. Mortos-vivos com ND igual ou maior que seu nível de paladino são imunes.',
                'Channel Divinity, Action: one Undead you can see within 30 feet makes a Wisdom save. On a failure it obeys you for 24 hours or until you use this again. Undead with a CR equal to or higher than your Paladin level are immune.')),
            f('dreadfulAspect', b('Aspecto Terrível', 'Dreadful Aspect'),
              b('Canalizar Divindade, Ação: cada criatura à sua escolha a até 9 m faz uma salvaguarda de Sabedoria ou fica Amedrontada por 1 minuto. Ela repete a salvaguarda quando termina o turno a mais de 9 m de você.',
                'Channel Divinity, Action: each creature of your choice within 30 feet makes a Wisdom save or is Frightened for 1 minute. It repeats the save when it ends its turn more than 30 feet from you.')),
          ],
          autoSpells: ['hellishRebuke', 'inflictWounds'],
        },
        5: { autoSpells: ['crownOfMadness', 'darkness'] },
        7: {
          features: [f('auraOfHate', b('Aura de Ódio', 'Aura of Hate'),
            b('Você e os Corruptores e Mortos-vivos a até 3 m de você (9 m a partir do nível 18) somam seu modificador de Carisma (mínimo +1) às jogadas de dano de armas corpo a corpo. Não acumula com outra Aura de Ódio.',
              'You and Fiends and Undead within 10 feet of you (30 feet from level 18) add your Charisma modifier (minimum +1) to melee weapon damage rolls. Doesn\'t stack with another Aura of Hate.'))],
        },
        9: { autoSpells: ['animateDead', 'bestowCurse'] },
        13: { autoSpells: ['blight', 'confusion'] },
        15: {
          features: [f('supernaturalResistance', b('Resistência Sobrenatural', 'Supernatural Resistance'),
            b('Você tem Resistência a dano Contundente, Perfurante e Cortante de armas não mágicas.',
              'You have Resistance to Bludgeoning, Piercing, and Slashing damage from nonmagical weapons.'))],
        },
        17: { autoSpells: ['contagion', 'dominatePerson'] },
        20: {
          features: [f('dreadLord', b('Senhor do Pavor', 'Dread Lord'),
            b('Ação: por 1 minuto uma aura de trevas de 9 m reduz a luz ao seu redor a penumbra. Inimigos Amedrontados por você que começam o turno nela sofrem 4d10 de dano Psíquico; você e criaturas escolhidas na aura ficam envoltos em sombras (ataques contra elas que dependem da visão têm Desvantagem); e com uma Ação Bônus você faz um ataque mágico corpo a corpo de sombra contra uma criatura a até 3 m, causando 3d10 + Carisma de dano Necrótico. 1 vez por descanso longo.',
              'Action: for 1 minute a 30-foot aura of gloom reduces light around you to dim. Enemies Frightened of you that start their turn in it take 4d10 Psychic damage; you and chosen creatures in the aura are shrouded (sight-reliant attacks against them have Disadvantage); and as a Bonus Action you can make a melee spell attack with the shadows against a creature within 10 feet, dealing 3d10 + Charisma Necrotic damage. Once per Long Rest.'))],
        },
      },
    },

    crown: {
      name: b('Juramento da Coroa', 'Oath of the Crown'),
      source: 'SCAG',
      desc: b(`Lealdade à soberania, à lei e à civilização, servindo à comunidade acima de si. ${LEGACY_NOTE.pt}`,
        `Loyalty to sovereignty, law, and civilization, serving the community above yourself. ${LEGACY_NOTE.en}`),
      levels: {
        3: {
          features: [
            oathSpells('oathOfTheCrownSpells', 'Juramento da Coroa', 'Oath of the Crown'),
            f('championChallenge', b('Desafio do Campeão', "Champion's Challenge"),
              b('Canalizar Divindade, Ação Bônus: cada criatura à sua escolha que você veja a até 9 m faz uma salvaguarda de Sabedoria. Se falhar, não pode se afastar voluntariamente a mais de 9 m de você. O efeito acaba se você ficar Incapacitado, morrer ou se a criatura ficar a mais de 9 m de você.',
                "Channel Divinity, Bonus Action: each creature of your choice you can see within 30 feet makes a Wisdom save. On a failure it can't willingly move more than 30 feet away from you. The effect ends if you are Incapacitated or die, or if the creature ends up more than 30 feet from you.")),
            f('turnTheTide', b('Virar a Maré', 'Turn the Tide'),
              b('Canalizar Divindade, Ação Bônus: cada criatura à sua escolha que possa ouvi-lo a até 9 m e esteja com metade dos PV ou menos recupera 1d6 + seu modificador de Carisma (mínimo 1) PV.',
                'Channel Divinity, Bonus Action: each creature of your choice that can hear you within 30 feet and has half its HP or fewer regains 1d6 + your Charisma modifier (minimum 1) HP.')),
          ],
          autoSpells: ['command', 'compelledDuel'],
        },
        5: { autoSpells: ['wardingBond', 'zoneOfTruth'] },
        7: {
          features: [f('divineAllegiance', b('Lealdade Divina', 'Divine Allegiance'),
            b('Reação, quando uma criatura a até 1,5 m de você sofre dano: você assume esse dano no lugar dela. Resistências ou imunidades da criatura não se aplicam.',
              "Reaction, when a creature within 5 feet of you takes damage: you take that damage instead. The creature's resistances or immunities don't apply."))],
        },
        9: { autoSpells: ['auraOfVitality', 'spiritGuardians'] },
        13: { autoSpells: ['banishment', 'guardianOfFaith'] },
        15: {
          features: [f('unyieldingSpirit', b('Espírito Inquebrável', 'Unyielding Spirit'),
            b('Você tem Vantagem em salvaguardas para evitar as condições Paralisado e Atordoado.',
              'You have Advantage on saving throws to avoid the Paralyzed and Stunned conditions.'))],
        },
        17: { autoSpells: ['circleOfPower', 'geas'] },
        20: {
          features: [f('exaltedChampion', b('Campeão Exaltado', 'Exalted Champion'),
            b('Ação: por 1 hora você tem Resistência a dano Contundente, Perfurante e Cortante de armas não mágicas; seus aliados a até 9 m têm Vantagem em salvaguardas contra a morte; e você e esses aliados têm Vantagem em salvaguardas de Sabedoria. 1 vez por descanso longo.',
              'Action: for 1 hour you have Resistance to Bludgeoning, Piercing, and Slashing damage from nonmagical weapons; your allies within 30 feet have Advantage on Death Saving Throws; and you and those allies have Advantage on Wisdom saving throws. Once per Long Rest.'))],
        },
      },
    },

    conquest: {
      name: b('Juramento da Conquista', 'Oath of Conquest'),
      source: 'XGE',
      desc: b(`Esmague o caos com força e medo, impondo ordem pela conquista. ${LEGACY_NOTE.pt}`,
        `Crush chaos with strength and fear, imposing order through conquest. ${LEGACY_NOTE.en}`),
      levels: {
        3: {
          features: [
            oathSpells('oathOfConquestSpells', 'Juramento da Conquista', 'Oath of Conquest'),
            f('conqueringPresence', b('Presença Conquistadora', 'Conquering Presence'),
              b('Canalizar Divindade, Ação: cada criatura à sua escolha a até 9 m faz uma salvaguarda de Sabedoria ou fica Amedrontada por 1 minuto, repetindo a salvaguarda ao fim de cada turno dela.',
                'Channel Divinity, Action: each creature of your choice within 30 feet makes a Wisdom save or is Frightened for 1 minute, repeating the save at the end of each of its turns.')),
            f('guidedStrike', b('Golpe Guiado', 'Guided Strike'),
              b('Canalizar Divindade: ao fazer uma jogada de ataque, some +10 a ela. Você decide depois de ver o dado, mas antes de saber se acertou.',
                'Channel Divinity: when you make an attack roll, add +10 to it. You decide after seeing the roll but before knowing whether it hits.')),
          ],
          autoSpells: ['armorOfAgathys', 'command'],
        },
        5: { autoSpells: ['holdPerson', 'spiritualWeapon'] },
        7: {
          features: [f('auraOfConquest', b('Aura de Conquista', 'Aura of Conquest'),
            b('Você emana uma aura de 3 m (9 m a partir do nível 18) enquanto não estiver Incapacitado. Uma criatura Amedrontada por você que esteja na aura tem deslocamento 0 e sofre dano Psíquico igual à metade do seu nível de paladino quando começa o turno nela.',
              'You emanate a 10-foot aura (30 feet from level 18) while not Incapacitated. A creature Frightened of you in the aura has a Speed of 0 and takes Psychic damage equal to half your Paladin level when it starts its turn there.'))],
        },
        9: { autoSpells: ['bestowCurse', 'fear'] },
        13: { autoSpells: ['dominateBeast', 'stoneskin'] },
        15: {
          features: [f('scornfulRebuke', b('Repreensão Desdenhosa', 'Scornful Rebuke'),
            b('Sempre que uma criatura acerta você com uma jogada de ataque, ela sofre dano Psíquico igual ao seu modificador de Carisma (mínimo 1), se você não estiver Incapacitado.',
              "Whenever a creature hits you with an attack roll, it takes Psychic damage equal to your Charisma modifier (minimum 1), if you aren't Incapacitated."))],
        },
        17: { autoSpells: ['cloudkill', 'dominatePerson'] },
        20: {
          features: [f('invincibleConqueror', b('Conquistador Invencível', 'Invincible Conqueror'),
            b('Ação: por 1 minuto você tem Resistência a todo dano, faz um ataque adicional ao usar a ação Atacar e seus ataques com arma corpo a corpo são críticos com 19 ou 20 no d20. 1 vez por descanso longo.',
              'Action: for 1 minute you have Resistance to all damage, make one additional attack when you take the Attack action, and your melee weapon attacks score a Critical Hit on a 19 or 20. Once per Long Rest.'))],
        },
      },
    },

    redemption: {
      name: b('Juramento da Redenção', 'Oath of Redemption'),
      source: 'XGE',
      desc: b(`Ofereça a paz e a redenção aos que erraram, recorrendo à violência só como último recurso. ${LEGACY_NOTE.pt}`,
        `Offer peace and redemption to the wayward, turning to violence only as a last resort. ${LEGACY_NOTE.en}`),
      levels: {
        3: {
          features: [
            oathSpells('oathOfRedemptionSpells', 'Juramento da Redenção', 'Oath of Redemption'),
            f('emissaryOfPeace', b('Emissário da Paz', 'Emissary of Peace'),
              b('Canalizar Divindade, Ação Bônus: por 10 minutos você recebe +5 em testes de Carisma (Persuasão).',
                'Channel Divinity, Bonus Action: for 10 minutes you gain +5 to Charisma (Persuasion) checks.')),
            f('rebukeTheViolent', b('Repreender o Violento', 'Rebuke the Violent'),
              b('Canalizar Divindade, Reação: logo após um atacante a até 9 m causar dano com um ataque a outra criatura que não você, ele faz uma salvaguarda de Sabedoria e sofre dano Radiante igual ao dano que causou (metade se passar).',
                'Channel Divinity, Reaction: right after an attacker within 30 feet deals damage with an attack to a creature other than you, it makes a Wisdom save, taking Radiant damage equal to the damage it dealt (half on a success).')),
          ],
          autoSpells: ['sanctuary', 'sleep'],
        },
        5: { autoSpells: ['calmEmotions', 'holdPerson'] },
        7: {
          features: [f('auraOfTheGuardian', b('Aura do Guardião', 'Aura of the Guardian'),
            b('Reação, quando uma criatura a até 3 m de você (9 m a partir do nível 18) sofre dano: você sofre esse dano no lugar dela, sem que resistências ou imunidades a reduzam.',
              "Reaction, when a creature within 10 feet of you (30 feet from level 18) takes damage: you take that damage instead, and it isn't reduced by resistances or immunities."))],
        },
        9: { autoSpells: ['counterspell', 'hypnoticPattern'] },
        13: { autoSpells: ['resilientSphere', 'stoneskin'] },
        15: {
          features: [f('protectiveSpirit', b('Espírito Protetor', 'Protective Spirit'),
            b('Se você terminar o turno em combate com menos da metade dos PV e não estiver Incapacitado, recupera 1d6 + metade do seu nível de paladino em PV.',
              "If you end your turn in combat with fewer than half your HP and aren't Incapacitated, you regain 1d6 + half your Paladin level HP."))],
        },
        17: { autoSpells: ['holdMonster', 'wallOfForce'] },
        20: {
          features: [f('emissaryOfRedemption', b('Emissário da Redenção', 'Emissary of Redemption'),
            b('Você tem Resistência a todo dano causado por outras criaturas, e quem o atinge com um ataque sofre dano Radiante igual à metade do dano causado. Você perde esses benefícios contra uma criatura que atacar, forçar a uma salvaguarda ou ferir com magia, até terminar um descanso longo.',
              'You have Resistance to all damage dealt by other creatures, and a creature that damages you with an attack takes Radiant damage equal to half the damage it dealt. You lose these benefits against a creature you attack, force to make a save, or damage with a spell, until you finish a Long Rest.'))],
        },
      },
    },

    watchers: {
      name: b('Juramento dos Vigilantes', 'Oath of the Watchers'),
      source: 'TCE',
      desc: b(`Proteja o mundo mortal das ameaças de outros planos. ${LEGACY_NOTE.pt}`,
        `Guard the mortal realms against extraplanar threats. ${LEGACY_NOTE.en}`),
      levels: {
        3: {
          features: [
            oathSpells('oathOfTheWatchersSpells', 'Juramento dos Vigilantes', 'Oath of the Watchers'),
            f('watchersWill', b('Vontade do Vigilante', "Watcher's Will"),
              b('Canalizar Divindade, Ação: você e até um número de criaturas igual ao seu modificador de Carisma (mínimo 1) que você veja a até 9 m têm Vantagem em salvaguardas de Inteligência, Sabedoria e Carisma por 1 minuto.',
                'Channel Divinity, Action: you and up to your Charisma modifier (minimum 1) creatures you can see within 30 feet have Advantage on Intelligence, Wisdom, and Charisma saves for 1 minute.')),
            f('abjureTheExtraplanar', b('Abjurar o Extraplanar', 'Abjure the Extraplanar'),
              b('Canalizar Divindade, Ação: cada Aberração, Celestial, Elemental, Fada ou Corruptor a até 9 m que possa ouvi-lo faz uma salvaguarda de Sabedoria. Se falhar, é repelida por 1 minuto ou até sofrer dano: precisa se afastar de você e não pode usar Reações.',
                "Channel Divinity, Action: each Aberration, Celestial, Elemental, Fey, or Fiend within 30 feet that can hear you makes a Wisdom save. On a failure it is turned for 1 minute or until it takes damage: it must move away from you and can't take Reactions.")),
          ],
          autoSpells: ['alarm', 'detectMagic'],
        },
        5: { autoSpells: ['moonbeam', 'seeInvisibility'] },
        7: {
          features: [f('auraOfTheSentinel', b('Aura da Sentinela', 'Aura of the Sentinel'),
            b('Você emana uma aura de 3 m (9 m a partir do nível 18) enquanto não estiver Incapacitado. Você e as criaturas à sua escolha na aura somam seu bônus de proficiência à Iniciativa.',
              'You emanate a 10-foot aura (30 feet from level 18) while not Incapacitated. You and creatures of your choice in it add your Proficiency Bonus to Initiative.'))],
        },
        9: { autoSpells: ['counterspell', 'nondetection'] },
        13: { autoSpells: ['auraOfPurity', 'banishment'] },
        15: {
          features: [f('vigilantRebuke', b('Repreensão Vigilante', 'Vigilant Rebuke'),
            b('Reação, quando você ou uma criatura que você vê a até 9 m passa numa salvaguarda de Inteligência, Sabedoria ou Carisma: a criatura que forçou a salvaguarda sofre 2d8 + seu modificador de Carisma de dano de Energia.',
              'Reaction, when you or a creature you can see within 30 feet succeeds on an Intelligence, Wisdom, or Charisma save: the creature that forced the save takes 2d8 + your Charisma modifier Force damage.'))],
        },
        17: { autoSpells: ['holdMonster', 'scrying'] },
        20: {
          features: [f('mortalBulwark', b('Baluarte Mortal', 'Mortal Bulwark'),
            b('Ação Bônus: por 1 minuto você tem Visão Verdadeira de 36 m e Vantagem em ataques contra Aberrações, Celestiais, Elementais, Fadas e Corruptores. Ao acertar uma dessas criaturas, pode forçá-la a uma salvaguarda de Carisma contra sua CD de magia; se falhar, é banida para seu plano natal. 1 vez por descanso longo, ou gastando um espaço de 5º círculo.',
              'Bonus Action: for 1 minute you have 120-foot Truesight and Advantage on attacks against Aberrations, Celestials, Elementals, Fey, and Fiends. When you hit one of them, you can force a Charisma save against your spell save DC; on a failure it is banished to its native plane. Once per Long Rest, or by expending a level 5 spell slot.'))],
        },
      },
    },
  },
};
