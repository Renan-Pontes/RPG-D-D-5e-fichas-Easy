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
        b("Seu treinamento com armas permite que você use as propriedades de maestria de dois tipos de armas de sua escolha com as quais você tenha proficiência, como Espadas Longas e Azagaias.\n\nSempre que terminar um Descanso Longo, você pode trocar os tipos de armas escolhidos. Por exemplo, você poderia mudar para usar as propriedades de maestria de Alabardas e Manguais.",
          "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Longswords and Javelins.\n\nWhenever you finish a Long Rest, you can change the kinds of weapons you chose. For example, you could switch to using the mastery properties of Halberds and Flails.")),
    ],
    2: [
      f('fightingStyle', b('Estilo de Luta', 'Fighting Style'),
        b("Você ganha um talento de Estilo de Luta de sua escolha (consulte \"Talentos\" para talentos). Em vez de escolher um desses talentos, você pode escolher a opção abaixo.\n\nGuerreiro Abençoado. Você aprende dois truques de Clérigo de sua escolha (consulte a seção da classe Clérigo para uma lista de magias de Clérigo). Orientação e Chama Sagrada são recomendados. Os truques escolhidos contam como magias de Paladino para você, e Carisma é a sua habilidade de conjuração para eles. Sempre que você ganha um nível de Paladino, você pode substituir um desses truques por outro truque de Clérigo.",
          "You gain a Fighting Style feat of your choice (see \"Feats\" for feats). Instead of choosing one of those feats, you can choose the option below.\n\nBlessed Warrior. You learn two Cleric cantrips of your choice (see the Cleric class's section for a list of Cleric spells). Guidance and Sacred Flame are recommended. The chosen cantrips count as Paladin spells for you, and Charisma is your spellcasting ability for them. Whenever you gain a Paladin level, you can replace one of these cantrips with another Cleric cantrip.")),
      f('paladinsSmite', b('Golpe do Paladino', "Paladin's Smite"),
        b("Você sempre tem a magia Destruição Divina preparada. Além disso, você pode conjurá-la sem gastar um espaço de magia, mas deve terminar um Descanso Longo antes de poder conjurá-la dessa forma novamente.",
          "You always have the Divine Smite spell prepared. In addition, you can cast it without expending a spell slot, but you must finish a Long Rest before you can cast it in this way again.")),
    ],
    3: [
      f('channelDivinity', b('Canalizar Divindade', 'Channel Divinity'),
        b('Você canaliza energia divina para criar efeitos. Tem 2 usos (3 a partir do nível 11); recupera 1 uso no descanso curto e todos no longo. Cada uso cria um efeito à sua escolha entre os da classe (Sentido Divino, e Abjurar Inimigos no nível 9) e os da subclasse. A CD é a da sua magia.',
          'You channel divine energy to create effects. You have 2 uses (3 from level 11); you regain 1 use on a Short Rest and all on a Long Rest. Each use creates an effect of your choice among the class options (Divine Sense, plus Abjure Foes at level 9) and your subclass options. The DC is your spell save DC.')),
      f('divineSense', b('Sentido Divino', 'Divine Sense'),
        b('Canalizar Divindade, Ação Bônus: por 10 minutos (ou até ficar Incapacitado) você sabe a localização e o tipo de Celestiais, Corruptores e Mortos-vivos a até 18 m, e percebe lugares ou objetos consagrados ou profanados nesse raio.',
          'Channel Divinity, Bonus Action: for 10 minutes (or until Incapacitated) you know the location and type of Celestials, Fiends, and Undead within 60 feet, and sense consecrated or desecrated places or objects in that radius.')),
      f('paladinSubclass', b('Subclasse de Paladino', 'Paladin Subclass'),
        b("Você ganha uma subclasse de Paladino de sua escolha. A subclasse Juramento de Devoção é detalhada após a descrição desta classe. Uma subclasse é uma especialização que concede a você características em certos níveis de Paladino. Pelo restante da sua carreira, você ganha cada uma das características da sua subclasse que sejam do seu nível de Paladino ou inferior.",
          "You gain a Paladin subclass of your choice. The Oath of Devotion subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Paladin levels. For the rest of your career, you gain each of your subclass's features that are of your Paladin level or lower.")),
    ],
    4: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'),
        b("Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Paladino 8, 12 e 16.",
          "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Paladin levels 8, 12, and 16.")),
    ],
    5: [
      f('extraAttack', b('Ataque Extra', 'Extra Attack'),
        b('Você ataca duas vezes, em vez de uma, sempre que usa a ação Atacar no seu turno.',
          'You can attack twice, instead of once, whenever you take the Attack action on your turn.')),
      f('faithfulSteed', b('Corcel Fiel', 'Faithful Steed'),
        b("Você pode invocar a ajuda de uma montaria de outro mundo. Você sempre tem a magia Convocar Montaria preparada.\n\nVocê também pode conjurar a magia uma vez sem gastar um espaço de magia, e recupera a capacidade de fazê-lo quando termina um Descanso Longo.",
          "You can call on the aid of an otherworldly steed. You always have the Find Steed spell prepared.\n\nYou can also cast the spell once without expending a spell slot, and you regain the ability to do so when you finish a Long Rest.")),
    ],
    6: [
      f('auraOfProtection', b('Aura de Proteção', 'Aura of Protection'),
        b("Você irradia uma aura protetora e invisível em uma Emanação de 3 metros que se origina de você. A aura fica inativa enquanto você estiver sob a condição Incapacitado.\n\nVocê e seus aliados dentro da aura ganham um bônus nas salvaguardas igual ao seu modificador de Carisma (bônus mínimo de +1).\n\nSe outro Paladino estiver presente, uma criatura pode se beneficiar de apenas uma Aura de Proteção por vez; a criatura escolhe qual aura enquanto estiver nelas.",
          "You radiate a protective, unseeable aura in a 10-foot Emanation that originates from you. The aura is inactive while you have the Incapacitated condition.\n\nYou and your allies in the aura gain a bonus to saving throws equal to your Charisma modifier (minimum bonus of +1).\n\nIf another Paladin is present, a creature can benefit from only one Aura of Protection at a time; the creature chooses which aura while in them.")),
    ],
    8: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'),
        b("Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Paladino 8, 12 e 16.",
          "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Paladin levels 8, 12, and 16.")),
    ],
    9: [
      f('abjureFoes', b('Abjurar Inimigos', 'Abjure Foes'),
        b('Canalizar Divindade, ação Mágica: escolha até um número de criaturas igual ao seu modificador de Carisma (mínimo 1) que você veja a até 18 m. Cada uma faz uma salvaguarda de Sabedoria ou fica Amedrontada por 1 minuto ou até sofrer dano. Assim amedrontada, em cada turno só pode se mover, usar uma ação ou usar uma Ação Bônus.',
          'Channel Divinity, Magic action: target up to your Charisma modifier (minimum 1) creatures you can see within 60 feet. Each makes a Wisdom saving throw or is Frightened for 1 minute or until it takes damage. While Frightened this way, on its turns it can only move, take an action, or take a Bonus Action.')),
    ],
    10: [
      f('auraOfCourage', b('Aura de Coragem', 'Aura of Courage'),
        b("Você e seus aliados têm Imunidade à condição Amedrontado enquanto estiverem em sua Aura de Proteção. Se um aliado Amedrontado entrar na aura, essa condição não terá efeito sobre esse aliado enquanto ele estiver ali.",
          "You and your allies have Immunity to the Frightened condition while in your Aura of Protection. If a Frightened ally enters the aura, that condition has no effect on that ally while there.")),
    ],
    11: [
      f('radiantStrikes', b('Golpes Radiantes', 'Radiant Strikes'),
        b("Seus golpes agora carregam poder sobrenatural. Quando você atinge um alvo com uma jogada de ataque usando uma arma Corpo a Corpo ou um Golpe Desarmado, o alvo sofre 1d8 de dano Radiante adicional.",
          "Your strikes now carry supernatural power. When you hit a target with an attack roll using a Melee weapon or an Unarmed Strike, the target takes an extra 1d8 Radiant damage.")),
    ],
    12: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'),
        b("Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Paladino 8, 12 e 16.",
          "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Paladin levels 8, 12, and 16.")),
    ],
    14: [
      f('restoringTouch', b('Toque Restaurador', 'Restoring Touch'),
        b("Quando você usa Cura pelas Mãos em uma criatura, também pode remover uma ou mais das seguintes condições da criatura: Amedrontado, Atordoado, Cego, Enfeitiçado, Paralisado ou Surdo. Você deve gastar 5 Pontos de Vida da reserva de cura de Cura pelas Mãos para cada uma dessas condições que remover; esses pontos não restauram Pontos de Vida para a criatura.",
          "When you use Lay On Hands on a creature, you can also remove one or more of the following conditions from the creature: Blinded, Charmed, Deafened, Frightened, Paralyzed, or Stunned. You must expend 5 Hit Points from the healing pool of Lay On Hands for each of these conditions you remove; those points don't also restore Hit Points to the creature.")),
    ],
    16: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'),
        b("Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Paladino 8, 12 e 16.",
          "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Paladin levels 8, 12, and 16.")),
    ],
    18: [
      f('auraExpansion', b('Expansão da Aura', 'Aura Expansion'),
        b("Sua Aura de Proteção passa a ser uma Emanação de 9 m.",
          'Your Aura of Protection is now a 30-foot Emanation.')),
    ],
    19: [
      f('epicBoon', b('Dádiva Épica', 'Epic Boon'),
        b("Você ganha um talento de Dádiva Épica (consulte \"Talentos\") ou outro talento de sua escolha para o qual você se qualifique. Dádiva da Visão Verdadeira é recomendada.",
          "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Truesight is recommended.")),
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
            f("oathOfDevotionSpells", b("Magias do Juramento de Devoção", "Oath of Devotion Spells"), b("A magia do seu juramento garante que você sempre tenha certas magias preparadas; ao alcançar um nível de Paladino especificado na tabela Magias do Juramento de Devoção, a partir de então você sempre terá as magias listadas preparadas.\n\nMagias do Juramento de Devoção\n\nNível de Paladino | Magias\n3 | Proteção contra o Bem e Mal, Escudo da Fé\n5 | Ajuda, Zona da Verdade\n9 | Farol de Esperança, Dissipar Magia\n13 | Movimentação Livre, Guardião da Fé\n17 | Comunhão, Coluna de Chamas", "The magic of your oath ensures you always have certain spells ready; when you reach a Paladin level specified in the Oath of Devotion Spells table, you thereafter always have the listed spells prepared.\n\nOath of Devotion Spells\n\nPaladin Level | Spells\n3 | Protection from Evil and Good, Shield of Faith\n5 | Aid, Zone of Truth\n9 | Beacon of Hope, Dispel Magic\n13 | Freedom of Movement, Guardian of Faith\n17 | Commune, Flame Strike")),
            f('sacredWeapon', b('Arma Sagrada', 'Sacred Weapon'),
              b('Canalizar Divindade, ao usar a ação Atacar: por 10 minutos, uma arma corpo a corpo que você empunha soma seu modificador de Carisma (mínimo +1) às jogadas de ataque, pode causar dano Radiante em vez do normal e emite luz plena em 6 m e penumbra por mais 6 m. Termina se você soltar a arma ou usar o traço de novo.',
                'Channel Divinity, when you take the Attack action: for 10 minutes, a Melee weapon you hold adds your Charisma modifier (minimum +1) to attack rolls, can deal Radiant damage instead of its normal type, and sheds Bright Light in 20 feet and Dim Light 20 feet beyond. Ends if you stop carrying it or use this again.')),
          ],
          autoSpells: ['protectionFromEvilAndGood', 'shieldOfFaith'],
        },
        5: { autoSpells: ['aid', 'zoneOfTruth'] },
        7: {
          features: [f('auraOfDevotion', b('Aura de Devoção', 'Aura of Devotion'),
            b("Você e seus aliados têm Imunidade à condição Enfeitiçado enquanto estiverem em sua Aura de Proteção. Se um aliado Enfeitiçado entrar na aura, essa condição não terá efeito sobre ele enquanto estiver ali.",
              "You and your allies have Immunity to the Charmed condition while in your Aura of Protection. If a Charmed ally enters the aura, that condition has no effect on that ally while there."))],
        },
        9: { autoSpells: ['beaconOfHope', 'dispelMagic'] },
        13: { autoSpells: ['freedomOfMovement', 'guardianOfFaith'] },
        15: {
          features: [f('smiteOfProtection', b('Golpe de Proteção', 'Smite of Protection'),
            b("Sua punição mágica agora irradia energia protetora. Sempre que você conjurar Destruição Divina, você e seus aliados terão Meia Cobertura enquanto estiverem em sua Aura de Proteção.\n\nA aura mantém esse benefício até o início do seu próximo turno.",
              "Your magical smite now radiates protective energy. Whenever you cast Divine Smite , you and your allies have Half Cover while in your Aura of Protection.\n\nThe aura has this benefit until the start of your next turn."))],
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
            f("oathOfTheAncientsSpells", b("Magias do Juramento dos Anciões", "Oath of the Ancients Spells"), b("A magia do seu juramento garante que você sempre tenha certas magias prontas; ao alcançar um nível de Paladino especificado na tabela Magias do Juramento dos Anciões, a partir de então você sempre terá as magias listadas preparadas.\n\nMagias do Juramento dos Anciões\n\nNível de Paladino | Magias\n3 | Golpe Constritor, Falar com Animais\n5 | Passo Nebuloso, Raio Lunar\n9 | Crescimento Vegetal, Proteção contra Energia\n13 | Tempestade Glacial, Pele de Pedra\n17 | Comunhão com a Natureza, Caminhar em Árvores", "The magic of your oath ensures you always have certain spells ready; when you reach a Paladin level specified in the Oath of the Ancients Spells table, you thereafter always have the listed spells prepared.\n\nOath of the Ancients Spells\n\nPaladin Level | Spells\n3 | Ensnaring Strike, Speak with Animals\n5 | Misty Step, Moonbeam\n9 | Plant Growth, Protection from Energy\n13 | Ice Storm, Stoneskin\n17 | Commune with Nature, Tree Stride")),
            f('naturesWrath', b('Ira da Natureza', "Nature's Wrath"),
              b('Canalizar Divindade, ação Mágica: vinhas espectrais surgem ao seu redor. Cada criatura que você escolher a até 4,5 m faz uma salvaguarda de Força ou fica Contida por 1 minuto, repetindo a salvaguarda ao fim de cada turno dela.',
                'Channel Divinity, Magic action: spectral vines spring up around you. Each creature of your choice within 15 feet makes a Strength saving throw or is Restrained for 1 minute, repeating the save at the end of each of its turns.')),
          ],
          autoSpells: ['ensnaringStrike', 'speakWithAnimals'],
        },
        5: { autoSpells: ['mistyStep', 'moonbeam'] },
        7: {
          features: [f('auraOfWarding', b('Aura de Resguardo', 'Aura of Warding'),
            b("A magia ancestral repousa tão intensamente sobre você que forma uma proteção mística, atenuando energias vindas de além do Plano Material; você e seus aliados têm Resistência a dano Necrótico, Psíquico e Radiante enquanto estiverem em sua Aura de Proteção.",
              "Ancient magic lies so heavily upon you th at it forms an eldritch ward, blunting energy from beyond the Material Plane; you and your allies have Resis tance to Necrotic, Psychic, and Radiant damage while in your Aura of Protection."))],
        },
        9: { autoSpells: ['plantGrowth', 'protectionFromEnergy'] },
        13: { autoSpells: ['iceStorm', 'stoneskin'] },
        15: {
          features: [f('undyingSentinel', b('Sentinela Imortal', 'Undying Sentinel'),
            b("Quando você é reduzido a 0 Pontos de Vida e não for morto instantaneamente, pode cair para 1 Ponto de Vida em vez disso, e recupera um número de Pontos de Vida igual a três vezes o seu nível de Paladino. Uma vez que use esta característica,\n\n• Acenda a luz da esperança.\n• Abrigue a vida.\n• Deleite-se na arte e no riso.",
              "When you are reduced to 0 Hit Points and not killed outright, you can drop to 1 Hit Point instead, and you regain a number of Hit Points equal to three times your Paladin level. Once you use this feature,\n\n• Kindle the light of hope.\n• Shelter life.\n• Delight in art and laughter."))],
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
            f("oathOfGlorySpells", b("Magias do Juramento da Glória", "Oath of Glory Spells"), b("A magia do seu juramento garante que você sempre tenha certas magias prontas; ao alcançar um nível de Paladino especificado na tabela Magias do Juramento da Glória, a partir de então você sempre terá as magias listadas preparadas.\n\nMagias do Juramento da Glória\n\nNível de Paladino | Magias\n3 | Raio Guiador, Heroísmo\n5 | Aprimorar Habilidade, Arma Mágica\n9 | Velocidade, Proteção contra Energia\n13 | Compulsão, Movimentação Livre\n17 | Conhecimento Lendário, Presença Régia de Yolande", "The magic of your oath ensures you always have certain spells ready; when you reach a Paladin level specified in the Oath of Glory Spells table, you thereafter always have the listed spells prepared.\n\nOath of Glory Spells\n\nPaladin Level | Spells\n3 | Guiding Bolt, Heroism\n5 | Enhance Ability, Magic Weapon\n9 | Haste, Protection from Energy\n13 | Compulsion, Freedom of Movement\n17 | Legend Lore, Yolande's Regal Presence")),
            f('inspiringSmite', b('Golpe Inspirador', 'Inspiring Smite'),
              b("Imediatamente após causar dano a uma criatura com sua característica Destruição Divina, você pode usar sua Canalizar Divindade como uma ação bônus e distribuir pontos de vida temporários para criaturas à sua escolha a até 9 metros de você, podendo incluir você mesmo. O número total de pontos de vida temporários é igual a 2d8 + seu nível nesta classe, dividido entre as criaturas escolhidas da forma que preferir.",
                "Immediately after you deal damage to a creature with your Divine Smite feature, you can use your Channel Divinity as a bonus action and distribute temporary hit points to creatures of your choice within 30 feet of you, which can include you. The total number of temporary hit points equals 2d8 + your level in this class, divided among the chosen creatures however you like.")),
            f('peerlessAthlete', b('Atleta Sem Igual', 'Peerless Athlete'),
              b("Como uma Ação Bônus, você pode gastar um uso da sua Canalizar Divindade para aprimorar seu atletismo. Por 1 hora, você tem Vantagem em testes de Força (Atletismo) e Destreza (Acrobacia), e a distância de seus Saltos em Distância e em Altura aumenta em 3 metros (essa distância adicional consome movimento normalmente).\n\n-lo novamente até terminar um Descanso Longo. Você também pode recuperar o uso dele gastando um espaço de magia de 5º círculo (nenhuma ação necessária).\nCarismático. Você é abençoado com uma presença sobrenatural e tem Vantagem em todos os testes de Carisma.\nNova Rolagem de Salvaguarda. Se falhar em uma salvaguarda, você pode usar uma Reação para jogá-la novamente. Você deve usar\nGolpe Infalível. Uma vez em cada um de seus turnos, quando você fizer uma jogada de ataque com uma arma e errar, pode fazer com que o ataque acerte em vez de errar.",
                "As a Bonus Action, you can expend one use of your\nChannel Divinity to augment your athleticism. For 1 hour, you have Advantage on Strength (Athletics) and Dexterity (Acrobatics) checks, and the distance of your Long and High Jumps increases by 10 feet (this extra distance costs movement as normal).\n\nit again until you finish a Long Rest. You can also restore your use of it by expending a level 5 spell slot (no action required).\nCharismatic. You are blessed with an otherworldly presence and have Advantage on all Charisma checks.\nSaving Throw Reroll. If you fail a saving throw, you can take a Reaction to reroll it. You must use\nUnerring Strike. Once on each of your turns when you make an attack roll with a weapon and miss, you can cause that attack to hit instead.")),
          ],
          autoSpells: ['guidingBolt', 'heroism'],
        },
        5: { autoSpells: ['enhanceAbility', 'magicWeapon'] },
        7: {
          features: [f('auraOfAlacrity', b('Aura de Prontidão', 'Aura of Alacrity'),
            b("Seu Deslocamento aumenta em 3 metros. Além disso, sempre que um aliado entrar em sua Aura de Proteção pela primeira vez em um turno ou começar seu que você possa ver a até 4,5 metros de si mesmo deve ser bem-sucedido turno lá, o Deslocamento do aliado aumenta em 3 metros até em uma salvaguarda de Força ou sofrerá a condição Impedido o final do próximo turno dele.",
              "Your Speed increases by 10 feet. In addition, whenever an ally enters your Aura of Protection for the first time on a turn or starts their you can see within 15 feet of yourself must succeed turn there, the ally's Speed increases by 10 feet until on a Strength saving throw or have the Restrained the end of their next turn."))],
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
            f("oathOfVengeanceSpells", b("Magias do Juramento de Vingança", "Oath of Vengeance Spells"), b("A magia do seu juramento garante que você sempre tenha certas magias prontas; ao alcançar um nível de Paladino especificado na tabela Magias do Juramento de Vingança, a partir de então você sempre terá as magias listadas preparadas.\n\nMagias do Juramento de Vingança\n\nNível de Paladino | Magias\n3 | Perdição, Marca do Caçador\n5 | Imobilizar Pessoa, Passo Nebuloso\n9 | Velocidade, Proteção contra Energia\n13 | Banimento, Porta Dimensional\n17 | Imobilizar Monstro, Vidência", "The magic of your oath ensures you always have certain spells ready; when you reach a Paladin level specified in the Oath of Vengeance Spells table, you thereafter always have the listed spells prepared.\n\nOath of Vengeance Spells\n\nPaladin Level | Spells\n3 | Bane, Hunter's Mark\n5 | Hold Person, Misty Step\n9 | Haste, Protection from Energy\n13 | Banishment, Dimension Door\n17 | Hold Monster, Scrying")),
            f('vowOfEnmity', b('Voto de Inimizade', 'Vow of Enmity'),
              b('Canalizar Divindade, ao usar a ação Atacar: escolha uma criatura que você veja a até 9 m. Por 1 minuto você tem Vantagem nas jogadas de ataque contra ela. Se ela cair a 0 PV antes disso, você pode transferir o voto para outra criatura a até 9 m no seu próximo turno.',
                'Channel Divinity, when you take the Attack action: choose a creature you can see within 30 feet. For 1 minute you have Advantage on attack rolls against it. If it drops to 0 HP before then, you can move the vow to another creature within 30 feet on your next turn.')),
          ],
          autoSpells: ['bane', 'huntersMark'],
        },
        5: { autoSpells: ['holdPerson', 'mistyStep'] },
        7: {
          features: [f('relentlessAvenger', b('Vingador Implacável', 'Relentless Avenger'),
            b("Seu foco sobrenatural ajuda a bloquear o recuo de um inimigo. Quando você atinge uma criatura com um Ataque de Oportunidade, pode reduzir o Deslocamento da criatura para\n0 até o final do turno atual. Você pode então se mover até metade do seu Deslocamento como parte da mesma\nReação. Esse movimento não provoca Ataques de Oportunidade.",
              "Your supernatural focus helps you close off a foe's retreat. When you hit a creature with an Opportunity Attack, you can reduce the creature's Speed to\nO until the end of the current turn. You can then move up to half your Speed as part of the same\nReaction. This movement doesn't provoke Opportunity Attacks."))],
        },
        9: { autoSpells: ['haste', 'protectionFromEnergy'] },
        13: { autoSpells: ['banishment', 'dimensionDoor'] },
        15: {
          features: [f('soulOfVengeance', b('Alma da Vingança', 'Soul of Vengeance'),
            b("Imediatamente após uma criatura sob o efeito do seu Voto de Inimizade acertar ou errar uma jogada de ataque, você pode usar uma Reação para fazer um ataque corpo a corpo contra aquela criatura se ela estiver ao alcance.",
              "Immediately after a creature under the effect of your Vow of Enmity hits or misses with an attack roll, you can take a Reaction to make a melee attack against that creature if it's within range."))],
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
            f("oathbreakerSpells", b("Magias do Quebrador de Juramento", "Oathbreaker Spells"), b("Um quebrador de juramento perde as magias de juramento obtidas anteriormente e, em vez disso, ganha as seguintes magias de Quebrador de Juramento nos níveis de paladino listados.\n\nMAGIAS DE QUEBRADOR DE JURAMENTO\n\nNível de Paladino | Magias\n\n3º | repreensão infernal, infligir ferimentos\n\n5º | coroa da loucura, escuridão\n\n9º | animar mortos, rogar maldição\n\n13º | definhar, confusão\n\n17º | contágio, dominar pessoa", "An oathbreaker loses previously gained oath spells and instead gain the following Oathbreaker spells at the paladin levels listed.\n\nOATHBREAKER SPELLS\n\nPaladin Level | Spells\n\n3rd | hellish rebuke, inflict wounds\n\n5th | crown of madness, darkness\n\n9th | animate dead, bestow curse\n\n13th | blight, confusion\n\n17th | contagion, dominate person")),
            f('controlUndead', b('Controlar Mortos-vivos', 'Control Undead'),
              b('Canalizar Divindade, Ação: um Morto-vivo que você veja a até 9 m faz uma salvaguarda de Sabedoria. Se falhar, obedece a você por 24 horas ou até você usar este traço de novo. Mortos-vivos com ND igual ou maior que seu nível de paladino são imunes.',
                'Channel Divinity, Action: one Undead you can see within 30 feet makes a Wisdom save. On a failure it obeys you for 24 hours or until you use this again. Undead with a CR equal to or higher than your Paladin level are immune.')),
            f('dreadfulAspect', b('Aspecto Terrível', 'Dreadful Aspect'),
              b("Como uma ação, o paladino canaliza as emoções mais sombrias e as concentra em uma explosão de ameaça mágica. Cada criatura à escolha do paladino a até 9 metros do paladino deve fazer uma salvaguarda de Sabedoria se puder ver o paladino. Em uma falha na salvaguarda, o alvo fica amedrontado pelo paladino por 1 minuto. Se uma criatura amedrontada por este efeito terminar seu turno a mais de 9 metros de distância do paladino, ela pode tentar outra salvaguarda de Sabedoria para encerrar o efeito sobre si.",
                "As an action, the paladin channels the darkest emotions and focuses them into a burst of magical menace. Each creature of the paladin's choice within 30 feet of the paladin must make a Wisdom saving throw if it can see the paladin. On a failed save, the target is frightened of the paladin for 1 minute. If a creature frightened by this effect ends its turn more than 30 feet away from the paladin, it can attempt another Wisdom saving throw to end the effect on it.")),
          ],
          autoSpells: ['hellishRebuke', 'inflictWounds'],
        },
        5: { autoSpells: ['crownOfMadness', 'darkness'] },
        7: {
          features: [f('auraOfHate', b('Aura de Ódio', 'Aura of Hate'),
            b("A partir do 7º nível, o paladino, bem como quaisquer corruptores e mortos-vivos a até 3 metros do paladino, ganham um bônus nas jogadas de dano de armas corpo a corpo igual ao modificador de Carisma do paladino (mínimo de +1). Uma criatura pode se beneficiar desta característica de apenas um paladino por vez.\n\nNo 18º nível, o alcance desta aura aumenta para 9 metros.",
              "Starting at 7th level, the paladin, as well any fiends and undead within 10 feet of the paladin, gains a bonus to melee weapon damage rolls equal to the paladin's Charisma modifier (minimum of +1). A creature can benefit from this feature from only one paladin at a time.\n\nAt 18th level, the range of this aura increases to 30 feet."))],
        },
        9: { autoSpells: ['animateDead', 'bestowCurse'] },
        13: { autoSpells: ['blight', 'confusion'] },
        15: {
          features: [f('supernaturalResistance', b('Resistência Sobrenatural', 'Supernatural Resistance'),
            b("No 15º nível, o paladino ganha resistência a dano contundente, perfurante e cortante de armas não mágicas.",
              "At 15th level, the paladin gains resistance to bludgeoning, piercing, and slashing damage from nonmagical weapons."))],
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
            f("oathOfTheCrownSpells", b("Magias do Juramento da Coroa", "Oath of the Crown Spells"), b("Você recebe as magias de juramento nos níveis de paladino listados.\n\nMagias do Juramento da Coroa\n\nNível de Paladino | Magias\n3º | Comando, Duelo Compelido\n5º | Vínculo Protetor, Zona da Verdade\n9º | Aura de Vitalidade, Guardiões Espirituais\n13º | Banimento, Guardião da Fé\n17º | Círculo de Poder, Missão", "You gain oath spells at the paladin levels listed.\n\nOath of the Crown Spells\n\nPaladin Level | Spells\n3rd | Command, Compelled Duel\n5th | Warding Bond, Zone of Truth\n9th | Aura of Vitality, Spirit Guardians\n13th | Banishment, Guardian of Faith\n17th | Circle of Power, Geas")),
            f('championChallenge', b('Desafio do Campeão', "Champion's Challenge"),
              b('Canalizar Divindade, Ação Bônus: cada criatura à sua escolha que você veja a até 9 m faz uma salvaguarda de Sabedoria. Se falhar, não pode se afastar voluntariamente a mais de 9 m de você. O efeito acaba se você ficar Incapacitado, morrer ou se a criatura ficar a mais de 9 m de você.',
                "Channel Divinity, Bonus Action: each creature of your choice you can see within 30 feet makes a Wisdom save. On a failure it can't willingly move more than 30 feet away from you. The effect ends if you are Incapacitated or die, or if the creature ends up more than 30 feet from you.")),
            f('turnTheTide', b('Virar a Maré', 'Turn the Tide'),
              b("Como uma ação bônus, você pode revigorar criaturas feridas com sua Canalizar Divindade. Cada criatura à sua escolha que possa ouvi-lo a até 9 metros de você recupera pontos de vida iguais a 1d6 + seu modificador de Carisma (mínimo de 1) se ela não tiver mais do que metade dos seus pontos de vida.",
                "As a bonus action, you can bolster injured creatures with your Channel Divinity. Each creature of your choice that can hear you within 30 feet of you regains hit points equal to 1d6 + your Charisma modifier (minimum of 1) if it has no more than half of its hit points.")),
          ],
          autoSpells: ['command', 'compelledDuel'],
        },
        5: { autoSpells: ['wardingBond', 'zoneOfTruth'] },
        7: {
          features: [f('divineAllegiance', b('Lealdade Divina', 'Divine Allegiance'),
            b("A partir do 7º nível, quando uma criatura a até 1,5 metro de você sofrer dano, você pode usar sua reação para substituir magicamente a sua própria saúde pela da criatura alvo, fazendo com que aquela criatura não sofra o dano. Em vez disso, você sofre o dano. Este dano causado a você não pode ser reduzido nem prevenido de nenhuma forma.",
              "Starting at 7th level, when a creature within 5 feet of you takes damage, you can use your reaction to magically substitute your own health for that of the target creature, causing that creature not to take the damage. Instead, you take the damage. This damage to you can't be reduced or prevented in any way."))],
        },
        9: { autoSpells: ['auraOfVitality', 'spiritGuardians'] },
        13: { autoSpells: ['banishment', 'guardianOfFaith'] },
        15: {
          features: [f('unyieldingSpirit', b('Espírito Inquebrável', 'Unyielding Spirit'),
            b("A partir do 15º nível, você tem vantagem em salvaguardas para evitar ficar paralisado ou atordoado.",
              "Starting at 15th level, you have advantage on saving throws to avoid becoming paralyzed or stunned."))],
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
            f("oathOfConquestSpells", b("Magias do Juramento da Conquista", "Oath of Conquest Spells"), b("Você recebe as magias de juramento nos níveis de paladino listados na tabela Magias do Juramento da Conquista. Veja a característica de classe Juramento Sagrado para saber como as magias de juramento funcionam.\n\nMagias do Juramento da Conquista\n\nNível de Paladino | Magias\n3º | Armadura de Agathys, Comando\n5º | Imobilizar Pessoa, Arma Espiritual\n9º | Rogar Maldição, Medo\n13º | Dominar Fera, Pele de Pedra\n17º | Névoa Mortal, Dominar Pessoa", "You gain oath spells at the paladin levels listed in the Oath of Conquest Spells table. See the Sacred Oath class feature for how oath spells work.\n\nOath of Conquest Spells\n\nPaladin Level | Spells\n3rd | Armor of Agathys, Command\n5th | Hold Person, Spiritual Weapon\n9th | Bestow Curse, Fear\n13th | Dominate Beast, Stoneskin\n17th | Cloudkill, Dominate Person")),
            f('conqueringPresence', b('Presença Conquistadora', 'Conquering Presence'),
              b("Você pode usar sua Canalizar Divindade para exalar uma presença aterrorizante. Como uma ação, você força cada criatura à sua escolha que possa ver a até 9 metros de você a fazer uma salvaguarda de Sabedoria. Em uma falha na salvaguarda, a criatura fica amedrontada por você durante 1 minuto. A criatura amedrontada pode repetir essa salvaguarda no final de cada um de seus turnos, encerrando o efeito sobre si com um sucesso.",
                "You can use your Channel Divinity to exude a terrifying presence. As an action, you force each creature of your choice that you can see within 30 feet of you to make a Wisdom saving throw. On a failed save, a creature becomes frightened of you for 1 minute. The frightened creature can repeat this saving throw at the end of each of its turns, ending the effect on itself on a success.")),
            f('guidedStrike', b('Golpe Guiado', 'Guided Strike'),
              b("Você pode usar sua Canalizar Divindade para desferir um golpe com precisão sobrenatural. Ao fazer uma jogada de ataque, você pode usar sua Canalizar Divindade para ganhar um bônus de +10 na jogada. Você faz essa escolha após ver a jogada, mas antes do Mestre dizer se o ataque acertou ou errou.",
                "You can use your Channel Divinity to strike with supernatural accuracy. When you make an attack roll, you can use your Channel Divinity to gain a +10 bonus to the roll. You make this choice after you see the roll, but before the DM says whether the attack hits or misses.")),
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
            b("A partir do 15º nível, aqueles que ousam golpeá-lo são punidos psiquicamente por sua audácia. Sempre que uma criatura acertar você com um ataque, ela sofrerá dano psíquico igual ao seu modificador de Carisma (mínimo de 1) se você não estiver incapacitado.",
              "Starting at 15th level, those who dare to strike you are psychically punished for their audacity. Whenever a creature hits you with an attack, that creature takes psychic damage equal to your Charisma modifier (minimum of 1) if you’re not incapacitated."))],
        },
        17: { autoSpells: ['cloudkill', 'dominatePerson'] },
        20: {
          features: [f('invincibleConqueror', b('Conquistador Invencível', 'Invincible Conqueror'),
            b("No 20º nível, você adquire a capacidade de canalizar uma proeza marcial extraordinária. >Como uma ação, você pode se transformar magicamente em um avatar da conquista, recebendo os seguintes benefícios por 1 minuto:\n\n• Você tem resistência a todo dano causado por outras criaturas (seus ataques, magias e outros efeitos).\n\n• Ao realizar a ação de Ataque em seu turno, você pode fazer um ataque adicional como parte dessa ação.\n\n• Seus ataques corpo a corpo com arma desferem um acerto crítico com um resultado de 19 ou 20 no d20.\n\nUma vez usada essa característica, você não pode usá-la novamente até terminar um descanso longo.",
              "At 20th level, you gain the ability to harness extraordinary martial prowess. >As an action, you can magically become an avatar of conquest, gaining the following benefits for 1 minute:\n\n• You have resistance to all damage dealt by other creatures (their attacks, spells, and other effects).\n\n• When you take the Attack action on your turn, you can make one additional attack as part of that action.\n\n• Your melee weapon attacks score a critical hit on a roll of 19 or 20 on the d20.\n\nOnce you use this feature, you can’t use it again until you finish a long rest."))],
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
            f("oathOfRedemptionSpells", b("Magias do Juramento da Redenção", "Oath of Redemption Spells"), b("Você recebe as magias de juramento nos níveis de paladino listados na tabela Magias do Juramento da Redenção. Veja a característica de classe Juramento Sagrado para saber como as magias de juramento funcionam.\n\nMagias do Juramento da Redenção\n\nNível de Paladino | Magias\n3º | Santuário, Sono\n5º | Acalmar Emoções, Imobilizar Pessoa\n9º | Contramágica, Padrão Hipnótico\n13º | Esfera Resiliente de Otiluke, Pele de Pedra\n17º | Imobilizar Monstro, Muralha de Energia", "You gain oath spells at the paladin levels listed in the Oath of Redemption Spells table. See the Sacred Oath class feature for how oath spells work.\n\nOath of Redemption Spells\n\nPaladin Level | Spells\n3rd | Sanctuary, Sleep\n5th | Calm Emotions, Hold Person\n9th | Counterspell, Hypnotic Pattern\n13th | Otiluke's Resilient Sphere, Stoneskin\n17th | Hold Monster, Wall of Force")),
            f('emissaryOfPeace', b('Emissário da Paz', 'Emissary of Peace'),
              b("Você pode usar sua Canalizar Divindade para aprimorar sua presença com poder divino. Como uma ação bônus, você concede a si mesmo um bônus de +5 em testes de Carisma (Persuasão) pelos próximos 10 minutos.",
                "You can use your Channel Divinity to augment your presence with divine power. As a bonus action, you grant yourself a +5 bonus to Charisma (Persuasion) checks for the next 10 minutes.")),
            f('rebukeTheViolent', b('Repreender o Violento', 'Rebuke the Violent'),
              b('Canalizar Divindade, Reação: logo após um atacante a até 9 m causar dano com um ataque a outra criatura que não você, ele faz uma salvaguarda de Sabedoria e sofre dano Radiante igual ao dano que causou (metade se passar).',
                'Channel Divinity, Reaction: right after an attacker within 30 feet deals damage with an attack to a creature other than you, it makes a Wisdom save, taking Radiant damage equal to the damage it dealt (half on a success).')),
          ],
          autoSpells: ['sanctuary', 'sleep'],
        },
        5: { autoSpells: ['calmEmotions', 'holdPerson'] },
        7: {
          features: [f('auraOfTheGuardian', b('Aura do Guardião', 'Aura of the Guardian'),
            b("A partir do 7º nível, você pode proteger outros contra danos ao custo de sua própria integridade física. Quando uma criatura a até 3 metros de você sofre dano, você pode usar sua reação para assumir magicamente esse dano, em vez de a criatura sofrê-lo. Esta característica não transfere nenhum outro efeito que possa acompanhar o dano, e esse dano não pode ser reduzido de forma alguma.\n\nNo 18º nível, o alcance desta aura aumenta para 9 metros.",
              "Starting at 7th level, you can shield others from harm at the cost of your own health. When a creature within 10 feet of you takes damage, you can use your reaction to magically take that damage, instead of that creature taking it. This feature doesn't transfer any other effects that might accompany the damage, and this damage can't be reduced in any way.\n\nAt 18th level, the range of this aura increases to 30 feet."))],
        },
        9: { autoSpells: ['counterspell', 'hypnoticPattern'] },
        13: { autoSpells: ['resilientSphere', 'stoneskin'] },
        15: {
          features: [f('protectiveSpirit', b('Espírito Protetor', 'Protective Spirit'),
            b("A partir do 15º nível, uma presença sagrada sara suas feridas em batalha. Você recupera pontos de vida iguais a 1d6 + metade do seu nível de paladino se terminar o seu turno em combate com menos da metade dos seus pontos de vida restantes e não estiver incapacitado.",
              "Starting at 15th level, a holy presence mends your wounds in battle. You regain hit points equal to 1d6 + half your paladin level if you end your turn in combat with fewer than half of your hit points remaining and you aren't incapacitated."))],
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
            f("oathOfTheWatchersSpells", b("Magias do Juramento dos Vigilantes", "Oath of the Watchers Spells"), b("Você recebe as magias de juramento nos níveis de paladino listados na tabela Juramento dos Vigilantes. Veja a característica de classe Juramento Sagrado para saber como as magias de juramento funcionam.\n\nMagias do Juramento dos Vigilantes\n\nNível de Paladino | Magias\n3º | Alarme, Detectar Magia\n5º | Raio Lunar, Ver o Invisível\n9º | Contramágica, Dificultar Detecção\n13º | Aura de Pureza, Banimento\n17º | Imobilizar Monstro, Vidência", "You gain oath spells at the paladin levels listed in the Oath of the Watchers table. See the Sacred Oath class feature for how oath spells work.\n\nOath of the Watchers Spells\n\nPaladin Level | Spells\n3rd | Alarm, Detect Magic\n5th | Moonbeam, See Invisibility\n9th | Counterspell, Nondetection\n13th | Aura of Purity, Banishment\n17th | Hold Monster, Scrying")),
            f('watchersWill', b('Vontade do Vigilante', "Watcher's Will"),
              b("Você pode usar sua Canalizar Divindade para imbuir sua presença com o poder de proteção de sua fé. Como uma ação, você pode escolher um número de criaturas que possa ver a até 9 metros de você, até um número igual ao seu modificador de Carisma (mínimo de uma criatura). Durante 2 minutos, você e as criaturas escolhidas têm vantagem em salvaguardas de Inteligência, Sabedoria e Carisma.",
                "You can use your Channel Divinity to invest your presence with the warding power of your faith. As an action, you can choose a number of creatures you can see within 30 feet of you, up to a number equal to your Charisma modifier (minimum of one creature). For 2 minutes, you and the chosen creatures have advantage on Intelligence, Wisdom, and Charisma saving throws.")),
            f('abjureTheExtraplanar', b('Abjurar o Extraplanar', 'Abjure the Extraplanar'),
              b('Canalizar Divindade, Ação: cada Aberração, Celestial, Elemental, Fada ou Corruptor a até 9 m que possa ouvi-lo faz uma salvaguarda de Sabedoria. Se falhar, é repelida por 1 minuto ou até sofrer dano: precisa se afastar de você e não pode usar Reações.',
                "Channel Divinity, Action: each Aberration, Celestial, Elemental, Fey, or Fiend within 30 feet that can hear you makes a Wisdom save. On a failure it is turned for 1 minute or until it takes damage: it must move away from you and can't take Reactions.")),
          ],
          autoSpells: ['alarm', 'detectMagic'],
        },
        5: { autoSpells: ['moonbeam', 'seeInvisibility'] },
        7: {
          features: [f('auraOfTheSentinel', b('Aura da Sentinela', 'Aura of the Sentinel'),
            b("Característica de 7º nível do Juramento dos Vigilantes\n\nVocê emite uma aura de alerta enquanto não estiver incapacitado. Quando você e quaisquer criaturas à sua escolha a até 3 metros de você rolarem iniciativa, todos vocês recebem um bônus na iniciativa igual ao seu bônus de proficiência.\n\nNo 18º nível, o alcance desta aura aumenta para 9 metros.",
              "7th-level Oath of the Watchers feature\n\nYou emit an aura of alertness while you aren’t incapacitated. When you and any creatures of your choice within 10 feet of you roll initiative, you all gain a bonus to initiative equal to your proficiency bonus.\n\nAt 18th level, the range of this aura increases to 30 feet."))],
        },
        9: { autoSpells: ['counterspell', 'nondetection'] },
        13: { autoSpells: ['auraOfPurity', 'banishment'] },
        15: {
          features: [f('vigilantRebuke', b('Repreensão Vigilante', 'Vigilant Rebuke'),
            b("Característica de 15º nível do Juramento dos Vigilantes\n\nVocê aprendeu como castigar qualquer um que ouse empunhar ilusões e artimanhas contra você e seus protegidos. Sempre que uma criatura que você possa ver a até 9 metros de você obtiver sucesso em uma salvaguarda de Inteligência, Sabedoria ou Carisma, você pode usar sua reação para causar 2d8 + seu modificador de Carisma de dano de energia à criatura que exigiu a salvaguarda.",
              "15th-level Oath of the Watchers feature\n\nYou’ve learned how to chastise anyone who dares wield beguilements against you and your wards. Whenever a creature you can see within 30 feet of you succeeds on an Intelligence, a Wisdom, or a Charisma saving throw, you can use your reaction to deal 2d8 + your Charisma modifier force damage to the creature that forced the saving throw."))],
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
