/**
 * Regras de progressão por classe e subclasse — declarativo.
 *
 * Cada entrada descreve o que o personagem ganha em cada nível, separando:
 *   - "autos": ganhos automáticos (truques de origem, magias bônus, traços
 *     que não envolvem escolha) — aplicados pelo engine ao subir de nível.
 *   - "choices": opções que o jogador precisa escolher (estilo de combate,
 *     subclasse, ASI). Sinalizadas mas não aplicadas automaticamente.
 *
 * Formato do nó por nível:
 *   {
 *     cantripsKnown?: number,            // total no nível (não delta)
 *     spellsKnown?: number,              // total no nível (classes "known")
 *     spellsPrepared?: { formula: 'wis+level' | 'int+level' | 'cha+level' | number },
 *     proficiencyBonus?: number,         // total (computado se omitido pela tabela)
 *     extraAttacks?: number,             // total
 *     features?: Array<{ id, name, desc }>,
 *     autoCantrips?: string[],           // ids de truques que entram automáticos
 *     autoSpells?: string[],             // ids de magias sempre preparadas
 *     expandedSpells?: string[],         // 2014: Lista Expandida do patrono do bruxo — só AMPLIA
 *                                        // a lista de escolha (não são aprendidas de graça; PHB 2014)
 *     subclassChoice?: boolean,          // sinaliza que é a hora de escolher
 *     fightingStyleChoice?: number,      // qtd de estilos a escolher
 *     asiOrFeat?: boolean,               // ASI ou feat
 *     expertiseChoice?: number,          // qtd de perícias para expertise
 *     subclassFeatures?: boolean,        // marca que ganhos vêm de subclasse
 *     notes?: string,                    // dica pro jogador
 *   }
 *
 * O SRD em data/srd.js já define muito do conteúdo das features.
 * As features definidas aqui são as que entram automaticamente, com texto curto.
 */

import SRD from '../../data/srd.js';
import { ARTIFICER_RULES } from './artificer.js';
import { RULES_2024 } from '../../data/rules2024.js';
import { CLASS_OPTIONS } from '../../data/class-options/index.js';
import SRD51_FEATURES from '../../data/srd51-class-features.json' with { type: 'json' };

// === Druida ===
const DRUID = {
  classId: 'druid',
  perLevel: {
    1: {
      cantripsKnown: 2,
      spellsPrepared: { formula: 'wis+level' },
      features: [
        { id: 'druidic', name: 'Druídico', desc: 'Você conhece o idioma secreto dos druidas.' },
        { id: 'spellcasting', name: 'Conjuração', desc: '2 truques. Prepare WIS + nível magias.' },
      ],
    },
    2: { subclassChoice: true, features: [
      { id: 'wildShape', name: 'Forma Selvagem', desc: 'Ação: transforme-se em fera. 2 usos por descanso curto. ND ¼ sem voo nem natação; ½ sem voo no 4; 1 no 8.' },
    ] },
    3: { spellsPrepared: { formula: 'wis+level' } },
    4: { asiOrFeat: true, cantripsKnown: 3 },
    5: {},
    6: { subclassFeatures: true },
    7: {},
    8: { asiOrFeat: true },
    9: {},
    10: { cantripsKnown: 4, subclassFeatures: true },
    11: {},
    12: { asiOrFeat: true },
    13: {},
    14: { subclassFeatures: true },
    15: {},
    16: { asiOrFeat: true },
    17: {},
    18: { features: [
      { id: 'timelessBody', name: 'Corpo Atemporal', desc: 'Envelhece 1 ano a cada 10.' },
      { id: 'beastSpells', name: 'Magias de Besta', desc: 'Pode lançar magias em Forma Selvagem (componentes V/S; sem material).' },
    ] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'archdruid', name: 'Arquidruida', desc: 'Forma Selvagem ilimitada; ignore componentes V/S e materiais sem custo das magias de druida.' }] },
  },
  subclassPerLevel: {
    moon: {
      2: { features: [
        { id: 'combatWildShape', name: 'Forma Selvagem de Combate', desc: "Ao escolher este círculo no 2º nível, você adquire a capacidade de usar a Forma Selvagem em seu turno como uma ação bônus, em vez de uma ação.\n\nAlém disso, enquanto estiver transformado pela Forma Selvagem, você pode usar uma ação bônus para gastar um espaço de magia para recuperar 1d8 pontos de vida por círculo do espaço de magia gasto.", descEn: "When you choose this circle at 2nd level, you gain the ability to use Wild Shape on your turn as a bonus action, rather than as an action.\n\nAdditionally, while you are transformed by Wild Shape, you can use a bonus action to expend one spell slot to regain 1d8 hit points per level of the spell slot expended." },
        { id: 'circleForms', name: 'Formas do Círculo', desc: "Os ritos do seu círculo concedem a você a capacidade de se transformar em formas animais mais perigosas. A partir do 2º nível, você pode usar sua Forma Selvagem para se transformar em uma besta com nível de desafio até 1 (você ignora a coluna ND Máx. da tabela Formas de Besta, mas deve obedecer às outras limitações nela).\n\nA partir do 6º nível, você pode se transformar em uma besta com nível de desafio até o seu nível de druida dividido por 3, arredondado para baixo.", descEn: "The rites of your circle grant you the ability to transform into more dangerous animal forms. Starting at 2nd level, you can use your Wild Shape to transform into a beast with a challenge rating as high as 1 (you ignore the Max. CR column of the Beast Shapes table, but must abide by the other limitations there).\n\nStarting at 6th level, you can transform into a beast with a challenge rating as high as your druid level divided by 3, rounded down." },
      ] },
      6: { features: [{ id: 'moonPrimalStrike', name: 'Golpe Primal', desc: 'Ataques em forma de fera contam como mágicos para superar resistência e imunidade.' }] },
      10: { features: [{ id: 'elementalWildShape', name: 'Forma Selvagem Elemental', desc: "No 10º nível, você pode gastar dois usos da Forma Selvagem ao mesmo tempo para se transformar em um elemental do ar, um elemental da terra, um elemental do fogo ou um elemental da água.", descEn: "At 10th level, you can expend two uses of Wild Shape at the same time to transform into an air elemental, an earth elemental, a fire elemental, or a water elemental." }] },
      14: { features: [{ id: 'thousandForms', name: 'Mil Formas', desc: "No 14º nível, você aprendeu a usar magia para alterar sua forma física de maneiras mais sutis. Você pode conjurar a magia alterar-se à vontade.", descEn: "By 14th level, you have learned to use magic to alter your physical form in more subtle ways. You can cast the alter self spell at will." }] },
    },
    land: {
      // Círculo da Terra: spells de domínio são SEMPRE preparados.
      // Depende do landType escolhido (forest, mountain, arctic, etc.).
      // O engine consulta landTypeSpells abaixo e expande conforme char.landType.
      2: { features: [
        { id: 'bonusCantrip', name: 'Truque Bônus', desc: "Quando você escolhe este círculo no 2º nível, você aprende um truque de druida adicional à sua escolha.", descEn: "When you choose this circle at 2nd level, you learn one additional druid cantrip of your choice." },
        { id: 'naturalRecovery', name: 'Recuperação Natural', desc: '1×/descanso longo, em descanso curto: recupere espaços somando até metade do nível de druida (arred. para cima), nenhum de 6º+.' },
      ] },
      3: { features: [{ id: 'circleSpells', name: 'Magias de Círculo', desc: 'Terreno escolhido no nível 2: 2 magias sempre preparadas nos níveis 3, 5, 7 e 9.' }] },
      6: { features: [{ id: 'landsStride', name: "Passos da Terra", desc: 'Terreno difícil não mágico não custa movimento extra; vantagem em salvaguardas contra plantas mágicas que impedem movimento.' }] },
      10: { features: [{ id: 'naturesWard', name: 'Proteção da Natureza', desc: 'Não pode ser enfeitiçado nem amedrontado por elementais ou feéricos; imune a veneno e doença.' }] },
      14: { features: [{ id: 'naturesSanctuary', name: 'Santuário da Natureza', desc: "Fera ou planta que o ataque faz salvaguarda SAB ou escolhe outro alvo." }] },
      // landTypeSpells: { <landType>: { <druidLevel>: [spellIds] } }
      // O engine acumula os spells até o nível atual conforme landType.
      landTypeSpells: {
        arctic:    { 3: ['holdPerson', 'spikeGrowth'],  5: ['sleetStorm', 'slowSpell'],     7: ['freedomOfMovement', 'iceStorm'], 9: ['communeWithNature', 'coneOfCold'] },
        coast:     { 3: ['mirrorImage', 'mistyStep'],    5: ['waterBreathing', 'waterWalk'], 7: ['controlWater', 'freedomOfMovement'], 9: ['conjureElemental', 'scrying'] },
        desert:    { 3: ['blur', 'silence'],             5: ['createFoodAndWater', 'protectionFromEnergy'], 7: ['blight', 'hallucinatoryTerrain'], 9: ['insectPlague', 'wallOfStone'] },
        forest:    { 3: ['barkskin', 'spiderClimb'],     5: ['callLightning', 'plantGrowth'], 7: ['divination', 'freedomOfMovement'], 9: ['communeWithNature', 'treeStride'] },
        grassland: { 3: ['invisibility', 'passWithoutTrace'], 5: ['daylight', 'haste'],      7: ['divination', 'freedomOfMovement'], 9: ['dream', 'insectPlague'] },
        mountain:  { 3: ['spiderClimb', 'spikeGrowth'],  5: ['lightningBolt', 'meldIntoStone'], 7: ['stoneShape', 'stoneskin'], 9: ['passwall', 'wallOfStone'] },
        swamp:     { 3: ['acidArrow', 'darkness'],       5: ['waterWalk', 'stinkingCloud'],  7: ['freedomOfMovement', 'locateCreature'], 9: ['insectPlague', 'scrying'] },
        underdark: { 3: ['spiderClimb', 'web'],          5: ['gaseousForm', 'stinkingCloud'], 7: ['greaterInvisibility', 'stoneShape'], 9: ['cloudkill', 'insectPlague'] },
      },
    },
    stars: {
      // EXEMPLO DO USUÁRIO: Estrelas dá Guidance automático no nível 2 (via Mapa Estelar)
      2: {
        autoCantrips: ['guidance'],
        autoSpells: ['guidingBolt'],
        features: [
          { id: 'starMap', name: 'Mapa Estelar', desc: "Característica de 2º nível do Círculo das Estrelas\n\nVocê criou uma carta estelar como parte de seus estudos celestiais. Trata-se de um objeto Miúdo e pode servir como foco de conjuração para suas magias de druida. Você determina sua forma rolando na tabela Mapa Estelar ou escolhendo uma opção.\n\nEnquanto estiver segurando este mapa, você recebe os seguintes benefícios:\n\n• Você conhece o truque orientação.\n\n• Você tem a magia raio guiado preparada. Ela conta como uma magia de druida para você e não conta no número de magias que você pode ter preparadas.\n\n• Você pode conjurar raio guiado sem gastar um espaço de magia. Você pode fazer isso um número de vezes igual ao seu bônus de proficiência e recupera todos os usos gastos ao terminar um descanso longo.\nraio guiado preparada. Ela conta como uma magia de druida para você e não conta no número de magias que você pode ter preparadas.\n\n• Você pode conjurar raio guiado sem gastar um espaço de magia. Você pode fazer isso um número de vezes igual ao seu bônus de proficiência e recupera todos os usos gastos ao terminar um descanso longo.\n\nSe você perder o mapa, poderá realizar uma cerimônia de 1 hora para criar magicamente um substituto. Esta cerimônia pode ser realizada durante um descanso curto ou longo e destrói o mapa anterior.\n\nMapa Estelar\n\nd6 | Forma do Mapa\n\n1 | Um pergaminho coberto de representações de constelações\n\n2 | Uma placa de pedra com furos finos perfurados nela\n\n3 | Uma pele salpicada de coruja-urso, trabalhada com marcas em relevo\n\n4 | Uma coleção de mapas encadernados em uma capa de ébano\n\n5 | Um cristal que projeta padrões estrelados quando colocado diante de uma luz\n\n6 | Discos de vidro que retratam constelações", descEn: "2nd-level Circle of Stars feature\n\nYou’ve created a star chart as part of your heavenly studies. It is a Tiny object and can serve as a spellcasting focus for your druid spells. You determine its form by rolling on the Star Map table or by choosing one.\n\nWhile holding this map, you have these benefits:\n\n• You know the guidance cantrip.\n\n• You have the guiding bolt spell prepared. It counts as a druid spell for you, and it doesn’t count against the number of spells you can have prepared.\n\n• You can cast guiding bolt without expending a spell slot. You can do so a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\n\nIf you lose the map, you can perform a 1-hour ceremony to magically create a replacement. This ceremony can be performed during a short or long rest, and it destroys the previous map.\n\nStar Map\n\n| d6 | Map Form |\n\n| 1 | A scroll covered with depictions of constellations |\n\n| 2 | A stone tablet with fine holes drilled through it |\n\n| 3 | A speckled owlbear hide, tooled with raised marks |\n\n| 4 | A collection of maps bound in an ebony cover |\n\n| 5 | A crystal that projects starry patterns when placed before a light |\n\n| 6 | Glass disks that depict constellations |" },
          { id: 'starryForm', name: 'Forma Estelar', desc: "Característica de 2º nível do Círculo das Estrelas\n\nCom uma ação bônus, você pode gastar um uso de sua característica Forma Selvagem para assumir uma forma estrelada, em vez de se transformar em uma fera.\n\nEnquanto estiver em uma forma estrelada, você mantém suas estatísticas de jogo, mas seu corpo se torna luminoso; suas articulações brilham como estrelas, e linhas incandescentes as conectam como em uma carta estelar. Essa forma emite luz plena em um raio de 3 metros e penumbra por mais 3 metros adicionais. A forma dura por 10 minutos. Ela termina mais cedo se você a dispensar (nenhuma ação necessária), ficar incapacitado, morrer ou usar essa característica novamente.\n\nSempre que assumir sua forma estrelada, escolha qual das seguintes constelações brilha em seu corpo; sua escolha concede certos benefícios enquanto você estiver na forma:\n\nArqueiro. Uma constelação de um arqueiro aparece em você. Ao ativar essa forma, e como uma ação bônus em seus turnos subsequentes enquanto ela durar, você pode fazer um ataque à distância com magia, disparando uma flecha luminosa que tem como alvo uma criatura a até 18 metros de você. Em um acerto, o ataque causa dano radiante igual a 1d8 + seu modificador de Sabedoria.\nrqueiro. Uma constelação de um arqueiro aparece em você. Ao ativar essa forma, e como uma ação bônus em seus turnos subsequentes enquanto ela durar, você pode fazer um ataque à distância com magia, disparando uma flecha luminosa que tem como alvo uma criatura a até 18 metros de você. Em um acerto, o ataque causa dano radiante igual a 1d8 + seu modificador de Sabedoria.\n\nCálice. A constelação de um cálice doador de vida aparece em você. Sempre que você conjurar uma magia usando um espaço de magia que recupere pontos de vida de uma criatura, você ou outra criatura a até 9 metros de você pode recuperar pontos de vida iguais a 1d8 + seu modificador de Sabedoria.\n\nDragão. Uma constelação de um dragão sábio aparece em você. Quando fizer um teste de Inteligência ou de Sabedoria ou uma salvaguarda de Constituição para manter a concentração em uma magia, você pode tratar um resultado de 9 ou menor no d20 como um 10.", descEn: "2nd-level Circle of Stars feature\n\nAs a bonus action, you can expend a use of your Wild Shape feature to take on a starry form, rather than transforming into a beast.\n\nWhile in a starry form, you retain your game statistics, but your body becomes luminous; your joints glimmer like stars, and glowing lines connect them as on a star chart. This form sheds bright light in a 10-foot radius and dim light for an additional 10 feet. The form lasts for 10 minutes. It ends early if you dismiss it (no action required), are incapacitated, die, or use this feature again.\n\nWhenever you assume your starry form, choose which of the following constellations glimmers on your body; your choice gives you certain benefits while in the form:\n\nArcher. A constellation of an archer appears on you. When you activate this form, and as a bonus action on your subsequent turns while it lasts, you can make a ranged spell attack, hurling a luminous arrow that targets one creature within 60 feet of you. On a hit, the attack deals radiant damage equal to 1d8 + your Wisdom modifier.\n\nChalice. A constellation of a life-giving goblet appears on you. Whenever you cast a spell using a spell slot that restores hit points to a creature, you or another creature within 30 feet of you can regain hit points equal to 1d8 + your Wisdom modifier.\n\nDragon. A constellation of a wise dragon appears on you. When you make an Intelligence or a Wisdom check or a Constitution saving throw to maintain concentration on a spell, you can treat a roll of 9 or lower on the d20 as a 10." },
        ],
      },
      6: { features: [{ id: 'cosmicOmen', name: 'Presságio Cósmico', desc: "Característica de 6º nível do Círculo das Estrelas\n\nSempre que terminar um descanso longo, você pode consultar seu Mapa Estelar em busca de presságios. Ao fazer isso, role um dado. Até você terminar seu próximo descanso longo, você ganha acesso a uma reação especial baseada em ter rolado um número par ou ímpar no dado:\n\nVentura (par). Sempre que uma criatura que você possa ver a até 9 metros de você estiver prestes a fazer uma jogada de ataque, uma salvaguarda ou um teste de atributo, você pode usar sua reação para rolar um d6 e adicionar o número rolado ao total.\n\nDesventura (ímpar). Sempre que uma criatura que você possa ver a até 9 metros de você estiver prestes a fazer uma jogada de ataque, uma salvaguarda ou um teste de atributo, você pode usar sua reação para rolar um d6 e subtrair o número rolado do total.\n\nVocê pode usar sua reação um número de vezes igual ao seu bônus de proficiência e recupera todos os usos gastos ao terminar um descanso longo.", descEn: "6th-level Circle of Stars feature\n\nWhenever you finish a long rest, you can consult your Star Map for omens. When you do so, roll a die. Until you finish your next long rest, you gain access to a special reaction based on whether you rolled an even or an odd number on the die:\n\nWeal (even). Whenever a creature you can see within 30 feet of you is about to make an attack roll, a saving throw, or an ability check, you can use your reaction to roll a d6 and add the number rolled to the total.\n\nWoe (odd). Whenever a creature you can see within 30 feet of you is about to make an attack roll, a saving throw, or an ability check, you can use your reaction to roll a d6 and subtract the number rolled to the total.\n\nYou can use your reaction a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest." }] },
      10: { features: [{ id: 'twinklingConstellations', name: 'Constelações Cintilantes', desc: "Característica de 10º nível do Círculo das Estrelas\n\nAs constelações da sua Forma Estrelada melhoram. O 1d8 do Arqueiro e do Cálice torna-se 2d8, e enquanto o Dragão estiver ativo, você tem um deslocamento de voo de 6 metros e pode pairar.\n\nAlém disso, no início de cada um dos seus turnos enquanto estiver na Forma Estrelada, você pode mudar qual constelação brilha em seu corpo.", descEn: "10th-level Circle of Stars feature\n\nThe constellations of your Starry Form improve. The 1d8 of the Archer and the Chalice becomes 2d8, and while the Dragon is active, you have a flying speed of 20 feet and can hover.\n\nMoreover, at the start of each of your turns while in Starry Form, you can change which constellation glimmers on your body." }] },
      14: { features: [{ id: 'fullOfStars', name: 'Cheio de Estrelas', desc: "Característica de 14º nível do Círculo das Estrelas\n\nEnquanto estiver na sua Forma Estrelada, você se torna parcialmente incorpóreo, o que lhe concede resistência a dano contundente, perfurante e cortante.", descEn: "14th-level Circle of Stars feature\n\nWhile in your Starry Form, you become partially incorporeal, giving you resistance to bludgeoning, piercing, and slashing damage." }] },
    },
    spores: {
      2: { autoCantrips: ['chillTouch'], features: [
        { id: 'haloOfSpores', name: 'Halo de Esporos', desc: "Característica de 2º nível do Círculo dos Esporos\n\nVocê é cercado por esporos necróticos invisíveis que são inofensivos até você liberá-los sobre uma criatura próxima. Quando uma criatura que você possa ver entrar em um espaço a até 3 metros de você ou iniciar o turno dela ali, você pode usar sua reação para causar 1d4 de dano necrótico àquela criatura, a menos que ela seja bem-sucedida em uma salvaguarda de Constituição contra a CD de salvaguarda de suas magias. O dano necrótico aumenta para 1d6 no 6º nível, 1d8 no 10º nível e 1d10 no 14º nível.", descEn: "2nd-level Circle of Spores feature\n\nYou are surrounded by invisible, necrotic spores that are harmless until you unleash them on a creature nearby. When a creature you can see moves into a space within 10 feet of you or starts its turn there, you can use your reaction to deal 1d4 necrotic damage to that creature unless it succeeds on a Constitution saving throw against your spell save DC. The necrotic damage increases to 1d6 at 6th level, 1d8 at 10th level, and 1d10 at 14th level." },
        { id: 'symbioticEntity', name: 'Entidade Simbiótica', desc: "No 2º nível, você adquire a habilidade de canalizar magia em seus esporos. Com uma ação, você pode gastar um uso de sua característica Forma Selvagem para despertar esses esporos, em vez de se transformar em uma forma de besta, e você ganha 4 pontos de vida temporários para cada nível que tiver nesta classe. Enquanto esta característica estiver ativa, você recebe os seguintes benefícios:\n\n• Quando você causar o dano da sua Auréola de Esporos, role o dado de dano uma segunda vez e adicione ao total.\n\n• Seus ataques corpo a corpo com arma causam 1d6 de dano de veneno extra a qualquer alvo que atingirem.\n\nEsses benefícios duram por 10 minutos, até você perder todos esses pontos de vida temporários ou até você usar sua Forma Selvagem novamente.", descEn: "At 2nd level, you gain the ability to channel magic into your spores. As an action, you can expend a use of your Wild Shape feature to awaken those spores, rather than transforming into a beast form, and you gain 4 temporary hit points for each level you have in this class. While this feature is active, you gain the following benefits:\n\n• When you deal your Halo of Spores damage, roll the damage die a second time and add it to the total.\n\n• Your melee weapon attacks deal an extra 1d6 poison damage to any target they hit.\n\nThese benefits last for 10 minutes. until you lose all these temporary hit points, or until you use your Wild Shape again." },
      ] },
      3: { autoSpells: ['blindnessDeafness', 'gentleRepose'] },
      5: { autoSpells: ['animateDead', 'gaseousForm'] },
      6: { features: [{ id: 'fungalInfestation', name: 'Infestação Fúngica', desc: "Característica de 6º nível do Círculo dos Esporos\n\nSeus esporos adquirem a habilidade de infestar um cadáver e animá-lo. Se uma fera ou humanoide Pequeno ou Médio morrer a até 3 metros de você, você pode usar sua reação para animá-lo, fazendo com que ele se levante imediatamente com 1 ponto de vida. A criatura usa o bloco de estatísticas do Zumbi no Manual dos Monstros. Ela permanece animada por 1 hora, após a qual cai e morre.\n\nEm combate, o turno do zumbi ocorre imediatamente após o seu. Ele obedece aos seus comandos mentais, e a única ação que ele pode realizar é a ação de Atacar, fazendo um único ataque corpo a corpo.\n\nVocê pode usar essa característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez), e recupera todos os usos gastos dela ao terminar um descanso longo.", descEn: "6th-level Circle of Spores feature\n\nYour spores gain the ability to infest a corpse and animate it. If a beast or a humanoid that is Small or Medium dies within 10 feet of you, you can use your reaction to animate it, causing it to stand up immediately with 1 hit point. The creature uses the Zombie stat block in the Monster Manual. It remains animate for 1 hour, after which time it collapses and dies.\n\nIn combat, the zombie’s turn comes immediately after yours. It obeys your mental commands, and the only action it can take is the Attack action, making one melee attack.\n\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses of it when you finish a long rest." }] },
      7: { autoSpells: ['blight', 'confusion'] },
      9: { autoSpells: ['cloudkill', 'contagion'] },
      10: { features: [{ id: 'spreadingSpores', name: 'Esporos Disseminados', desc: "Característica de 10º nível do Círculo dos Esporos\n\nVocê ganha a habilidade de semear uma área com esporos mortais. Como uma ação bônus enquanto sua característica Entidade Simbiótica estiver ativa, você pode arremessar esporos a até 9 metros de distância, onde eles giram em um cubo de 3 metros por 1 minuto. Os esporos desaparecem mais cedo se você usar essa característica novamente, se os dispensar com uma ação bônus ou se sua característica Entidade Simbiótica não estiver mais ativa.\n\nSempre que uma criatura se mover para dentro do cubo ou iniciar o turno dela ali, essa criatura sofre o dano da sua Auréola de Esporos, a menos que a criatura seja bem-sucedida em uma salvaguarda de Constituição contra a CD de salvaguarda de suas magias. Uma criatura pode sofrer esse dano no máximo uma vez por turno.\n\nEnquanto o cubo de esporos persistir, você não pode usar sua reação da Auréola de Esporos.", descEn: "10th-level Circle of Spores feature\n\nYou gain the ability to seed an area with deadly spores. As a bonus action while your Symbiotic Entity feature is active, you can hurl spores up to 30 feet away, where they swirl in a 10-foot cube for 1 minute. The spores disappear early if you use this feature again, if you dismiss them as a bonus action, or if your Symbiotic Entity feature is no longer active.\n\nWhenever a creature moves into the cube or starts its turn there, that creature takes your Halo of Spores damage, unless the creature succeeds on a Constitution saving throw against your spell save DC. A creature can take this damage no more than once per turn.\n\nWhile the cube of spores persists, you can’t use your Halo of Spores reaction." }] },
      14: { features: [{ id: 'fungalBody', name: 'Corpo Fúngico', desc: "Característica de 14º nível do Círculo dos Esporos\n\nOs esporos fúngicos em seu corpo alteram você: você não pode ficar cego, surdo, amedrontado ou envenenado, e qualquer acerto crítico contra você conta como um acerto normal, a menos que você esteja incapacitado.", descEn: "14th-level Circle of Spores feature\n\nThe fungal spores in your body alter you: you can’t be blinded, deafened, frightened, or poisoned, and any critical hit against you counts as a normal hit instead, unless you’re incapacitated." }] },
    },
    wildfire: {
      2: { autoSpells: ['burningHands', 'cureWounds'], features: [{ id: 'wildfireSpirit', name: 'Invocar Espírito do Fogo Selvagem', desc: "Elemental Pequeno\n\n• Classe de Armadura 13 (armadura natural)\n\n• Pontos de Vida 5 + cinco vezes seu nível nesta classe\n\n• Deslocamento 9 m, voo 9 m (planar)\n\nFOR | DES | CON | INT | SAB | CAR\n\n10 (+0) | 14 (+2) | 14 (+2) | 13 (+1) | 15 (+2) | 11 (+0)\n\nDeslocamento 9 m, voo 9 m (planar)\n\n• Imunidades a Dano fogo\n\n• Imunidades a Condição agarrado, amedrontado, caído, enfeitiçado, impedido\n\n• Sentidos visão no escuro 18 m, Percepção passiva 12\n\n• Idiomas compreende os idiomas que você fala\n\n• Nível de Desafio —\n\n• Bônus de Proficiência (PB) igual ao seu bônus\n\nAções\n\n• Semente Flamejante. Ataque com Arma à Distância: seu modificador de ataque mágico para acertar, alcance 18 m, um alvo que você possa ver. Acerto: 1d6 + PB de dano de fogo.\n\n• Teletransporte Ígneo. O espírito e cada criatura voluntária à sua escolha a até 1,5 metro dele se teletransportam em até 4,5 metros para espaços desocupados que você possa ver. Em seguida, cada criatura a até 1,5 metro do espaço que o espírito deixou deve ser bem-sucedida em uma salvaguarda de Destreza contra a CD de suas magias ou sofrer 1d6 + PB de dano de fogo.", descEn: "Small elemental\n\n• Armor Class 13 (natural armor)\n\n• Hit Points 5 + five times your level in this class\n\n• Speed 30 ft., fly 30 ft. (hover)\n\nSTR | DEX | CON | INT | WIS | CHA\n\n10 (+0) | 14 (+2) | 14 (+2) | 13 (+1) | 15 (+2) | 11 (+0)\n\nSpeed 30 ft., fly 30 ft. (hover)\n\n• Damage Immunities fire\n\n• Condition Immunities charmed, frightened, grappled, prone, restrained\n\n• Senses darkvision 60 ft., passive Perception 12\n\n• Languages understands the languages you speak\n\n• Challenge —\n\n• Proficiency Bonus (PB) equals your bonus\n\nActions\n\n• Flame Seed. Ranged Weapon Attack: your spell attack modifier to hit, range 60 ft., one target you can see. Hit: 1d6 + PB fire damage.\n\n• Fiery Teleportation. The spirit and each willing creature of your choice within 5 feet of it teleport up to 15 feet to unoccupied spaces you can see. Then each creature within 5 feet of the space that the spirit left must succeed on a Dexterity saving throw against your spell save DC or take 1d6 + PB fire damage." }] },
      3: { autoSpells: ['flamingSphere', 'scorchingRay'] },
      5: { autoSpells: ['plantGrowth', 'revivify'] },
      6: { features: [{ id: 'enhancedBond', name: 'Vínculo Aprimorado', desc: "Característica de 6º nível do Círculo do Fogo Selvagem\n\nO vínculo com seu espírito do fogo selvagem aprimora suas magias destrutivas e restauradoras. Sempre que você conjurar uma magia que cause dano de fogo ou recupere pontos de vida enquanto seu espírito do fogo selvagem estiver invocado, role um d8, e você ganha um bônus igual ao número rolado em uma rolagem de dano ou de cura da magia.\n\nAlém disso, quando você conjurar uma magia com alcance diferente de si mesmo, a magia pode se originar de você ou do seu espírito do fogo selvagem.", descEn: "6th-level Circle of Wildfire feature\n\nThe bond with your wildfire spirit enhances your destructive and restorative spells. Whenever you cast a spell that deals fire damage or restores hit points while your wildfire spirit is summoned, roll a d8, and you gain a bonus equal to the number rolled to one damage or healing roll of the spell.\n\nIn addition, when you cast a spell with a range other than self, the spell can originate from you or your wildfire spirit." }] },
      7: { autoSpells: ['auraOfLife', 'fireShield'] },
      9: { autoSpells: ['flameStrike', 'massCureWounds'] },
      10: { features: [{ id: 'cauterizingFlames', name: 'Chamas Cauterizantes', desc: "Característica de 10º nível do Círculo do Fogo Selvagem\nnt>\n\n!ID_INTERNAL_FEATURE_REPLACEMENT_DRUID_WILDFIRE_CAUTERIZING_FLAMES\n\nCaracterística de 10º nível do Círculo do Fogo Selvagem\n\nVocê ganha a habilidade de transformar a morte em chamas mágicas que podem curar ou incinerar. Quando uma criatura Pequena ou maior morre a até 9 metros de você ou do seu espírito do fogo selvagem, uma chama espectral inofensiva surge no espaço da criatura morta e tremula ali por 1 minuto. Quando uma criatura que você possa ver entra nesse espaço, você pode usar sua reação para extinguir a chama espectral ali e curar a criatura ou causar dano de fogo a ela. A cura ou dano é igual a 2d10 + seu modificador de Sabedoria.\n\nVocê pode usar essa reação um número de vezes igual ao seu bônus de proficiência, e você recupera todos os usos gastos ao terminar um descanso longo.", descEn: "10th-level Circle of Wildfire feature\nnt>\n\n!ID_INTERNAL_FEATURE_REPLACEMENT_DRUID_WILDFIRE_CAUTERIZING_FLAMES\n\n10th-level Circle of Wildfire feature\n\nYou gain the ability to turn death into magical flames that can heal or incinerate. When a Small or larger creature dies within 30 feet of you or your wildfire spirit, a harmless spectral flame springs forth in the dead creature’s space and flickers there for 1 minute. When a creature you can see enters that space, you can use your reaction to extinguish the spectral flame there and either heal the creature or deal fire damage to it. The healing or damage equals 2d10 + your Wisdom modifier.\n\nYou can use this reaction a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest." }] },
      14: { features: [{ id: 'blazingRevival', name: 'Renascimento Ardente', desc: "Característica de 14º nível do Círculo do Fogo Selvagem\n\nO vínculo com seu espírito do fogo selvagem pode salvá-lo da morte. Se o espírito estiver a até 36 metros de você quando você for reduzido a 0 pontos de vida e consequentemente cair inconsciente, você pode fazer com que o espírito caia para 0 pontos de vida. Você então recupera metade dos seus pontos de vida e imediatamente se levanta.\n\nAssim que usar esta característica, você não pode usá-la novamente até terminar um descanso longo.", descEn: "14th-level Circle of Wildfire feature\n\nThe bond with your wildfire spirit can save you from death. If the spirit is within 120 feet of you when you are reduced to 0 hit points and thereby fall unconscious, you can cause the spirit to drop to 0 hit points. You then regain half your hit points and immediately rise to your feet.\n\nOnce you use this feature, you can’t use it again until you finish a long rest." }] },
    },
    dreams: {
      2: { features: [{ id: 'balmOfSummer', name: 'Bálsamo da Corte de Verão', desc: "Reserva de d6 = nível de druida (descanso longo). Ação bônus: gaste até metade do nível em dados numa criatura a 36 m; ela cura o total e ganha 1 PV temp. por dado." }] },
      6: { features: [{ id: 'hearthOfMoonlight', name: 'Lar de Luar e Sombra', desc: "No início de um descanso curto ou longo: esfera de 9 m com +5 em Furtividade e Percepção, escondendo a luz interna." }] },
      10: { features: [{ id: 'hiddenPaths', name: 'Caminhos Ocultos', desc: "A partir do 10º nível, você pode usar os caminhos mágicos ocultos que algumas fadas usam para atravessar o espaço em um piscar de olhos. Como uma ação bônus no seu turno, você pode se teletransportar até 18 metros para um espaço desocupado que possa ver. Alternativamente, você pode usar sua ação para teletransportar uma criatura voluntária que você tocar até 9 metros para um espaço desocupado que possa ver.\n\nVocê pode usar essa característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez), e recupera todos os usos gastos dela ao terminar um descanso longo.", descEn: "Starting at 10th level, you can use the hidden, magical pathways that some fey use to traverse space in the blink of an eye. As a bonus action on your turn, you can teleport up to 60 feet to an unoccupied space you can see. Alternatively, you can use your action to teleport one willing creature you touch up to 30 feet to an unoccupied space you can see.\n\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses of it when you finish a long rest." }] },
      14: { features: [{ id: 'walkerInDreams', name: 'Andarilho dos Sonhos', desc: "No 14º nível, a magia de Faéria concede a você a habilidade de viajar mental ou fisicamente pelas terras dos sonhos.\n\nQuando você termina um descanso curto, pode conjurar uma das seguintes magias, sem gastar um espaço de magia ou exigir componentes materiais: sonho (tendo você como mensageiro), vidência ou círculo de teletransporte.\n\nEsse uso de círculo de teletransporte é especial. Em vez de abrir um portal para um círculo de teletransporte permanente, ele abre um portal para o último local onde você concluiu um descanso longo em seu plano de existência atual. Se você não tiver realizado um descanso longo em seu plano atual, a magia falha, mas não é gasta.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um descanso longo.", descEn: "At 14th level, the magic of the Feywild grants you the ability to travel mentally or physically through dreamlands.\n\nWhen you finish a short rest, you can cast one of the following spells, without expending a spell slot or requiring material components: dream (with you as the messenger), scrying, or teleportation circle.\n\nThis use of teleportation circle is special. Rather than opening a portal to a permanent teleportation circle, it opens a portal to the last location where you finished a long rest on your current plane of existence. If you haven't taken a long rest on your current plane, the spell fails but isn’t wasted.\n\nOnce you use this feature, you can’t use it again until you finish a long rest." }] },
    },
  },
};

// === Guerreiro ===
const FIGHTER = {
  classId: 'fighter',
  perLevel: {
    1: { fightingStyleChoice: 1, features: [
      { id: 'secondWind', name: 'Segundo Fôlego', desc: "Ação bônus: 1d10+nível PV. 1×/descanso curto." },
    ] },
    2: { features: [{ id: 'actionSurge', name: 'Surto de Ação', desc: 'Ação extra. 1×/descanso curto (2× no nível 17).' }] },
    3: { subclassChoice: true },
    4: { asiOrFeat: true },
    5: { extraAttacks: 1, features: [{ id: 'extraAttack', name: 'Ataque Extra', desc: 'Ataque duas vezes na ação Atacar.' }] },
    6: { asiOrFeat: true },
    7: { subclassFeatures: true },
    8: { asiOrFeat: true },
    9: { features: [{ id: 'indomitable', name: 'Indomável', desc: 'Refaça um teste de salvamento falho 1×/descanso longo (2 usos no 13, 3 no 17).' }] },
    10: { subclassFeatures: true },
    11: { extraAttacks: 2 },
    12: { asiOrFeat: true },
    13: { features: [{ id: 'indomitable2', name: 'Indomável (2 usos)', desc: '2 usos por descanso longo.' }] },
    14: { asiOrFeat: true },
    15: { subclassFeatures: true },
    16: { asiOrFeat: true },
    17: { features: [
      { id: 'actionSurge2', name: 'Surto de Ação (2 usos)', desc: '2 usos por descanso curto, só 1 por turno.' },
      { id: 'indomitable3', name: 'Indomável (3 usos)', desc: '3 usos por descanso longo.' },
    ] },
    18: { subclassFeatures: true },
    19: { asiOrFeat: true },
    20: { extraAttacks: 3 },
  },
  subclassPerLevel: {
    champion: {
      3: { features: [{ id: 'improvedCritical', name: 'Crítico Aprimorado', desc: "A partir do momento em que escolhe este arquétipo no 3º nível, seus ataques com arma obtêm um acerto crítico com uma rolagem de 19 ou 20.", descEn: "Beginning when you choose this archetype at 3rd level, your weapon attacks score a critical hit on a roll of 19 or 20." }] },
      7: { features: [{ id: 'remarkableAthlete', name: 'Atleta Notável', desc: '+metade prof em STR/DEX/CON sem prof.' }] },
      10: { fightingStyleChoice: 1 },
      15: { features: [{ id: 'superiorCritical', name: 'Crítico Superior', desc: "A partir do 15º nível, seus ataques com arma obtêm um acerto crítico em uma rolagem de 18-20.", descEn: "Starting at 15th level, your weapon attacks score a critical hit on a roll of 18-20." }] },
      18: { features: [{ id: 'survivor', name: 'Sobrevivente', desc: "Recupere 5+CON PV/turno se ≤ ½ máximo." }] },
    },
    battlemaster: {
      3: { features: [
        { id: 'combatSuperiority', name: 'Superioridade de Combate', desc: "Ao escolher este arquétipo no 3º nível, você aprende manobras que são alimentadas por dados especiais chamados dados de superioridade.\n\nManobras. Você aprende três manobras à sua escolha, detalhadas na seção “Manobras” abaixo. Muitas manobras aprimoram um ataque de alguma forma. Você pode usar apenas uma manobra por ataque. Você aprende duas manobras adicionais à sua escolha no 7º, 10º e 15º níveis. Cada vez que aprende novas manobras, você também pode substituir uma manobra conhecida por outra diferente.\n\nDados de Superioridade. Você possui quatro dados de superioridade, que são d8s. Um dado de superioridade é gasto ao ser usado. Você recupera todos os seus dados de superioridade gastos ao terminar um descanso curto ou longo. Você ganha mais um dado de superioridade no 7º nível e mais um no 15º nível.\npor outra diferente.\n\nDados de Superioridade. Você possui quatro dados de superioridade, que são d8s. Um dado de superioridade é gasto ao ser usado. Você recupera todos os seus dados de superioridade gastos ao terminar um descanso curto ou longo. Você ganha mais um dado de superioridade no 7º nível e mais um no 15º nível.\n\nSalvaguardas. Algumas das suas manobras exigem que o alvo realize uma salvaguarda para resistir aos efeitos da manobra. A CD da salvaguarda é calculada da seguinte forma:\n\nCD de salvaguarda da manobra = 8 + seu bônus de proficiência + seu modificador de Força ou Destreza (à sua escolha).", descEn: "When you choose this archetype at 3rd level, you learn maneuvers that are fueled by special dice called superiority dice.\n\nManeuvers. You learn three maneuvers of your choice, which are detailed under “Maneuvers” below. Many maneuvers enhance an attack in some way. You can use only one maneuver per attack. You learn two additional maneuvers of your choice at 7th, 10th, and 15th level. Each time you learn new maneuvers, you can also replace one maneuver you know with a different one.\n\nSuperiority Dice. You have four superiority dice, which are d8s. A superiority die is expended when you use it. You regain all of your expended superiority dice when you finish a short or long rest. You gain another superiority die at 7th level and one more at 15th level.\n\nSaving Throws. Some of your maneuvers require your target to make a saving throw to resist the maneuver’s effects. The saving throw DC is calculated as follows:\n\nManeuver save DC = 8 + your proficiency bonus + your Strength or Dexterity modifier (your choice)." },
        { id: 'studentOfWar', name: 'Estudante da Guerra', desc: "No 3º nível, você ganha proficiência com um tipo de ferramentas de artesão à sua escolha.", descEn: "At 3rd level, you gain proficiency with one type of artisan’s tools of your choice." },
      ] },
      7: { features: [
        { id: 'knowYourEnemy', name: 'Conheça Seu Inimigo', desc: "A partir do 7º nível, se você passar pelo menos 1 minuto observando ou interagindo com outra criatura fora de combate, poderá descobrir certas informações sobre as capacidades dela em comparação com as suas. O Mestre informa se a criatura é igual, superior ou inferior a você em relação a duas das seguintes características à sua escolha:\n\n• Valor de Força\n\n• Valor de Destreza\n\n• Valor de Constituição\n\n• Classe de Armadura\n\n• Pontos de Vida atuais\n\n• Níveis totais de classe (se houver)\n\n• Níveis na classe guerreiro (se houver)", descEn: "Starting at 7th level, if you spend at least 1 minute observing or interacting with another creature outside combat, you can learn certain information about its capabilities compared to your own. The DM tells you if the creature is your equal, superior, or inferior in regard to two of the following characteristics of your choice:\n\n• Strength score\n\n• Dexterity score\n\n• Constitution score\n\n• Armor Class\n\n• Current hit points\n\n• Total class levels (if any)\n\n• Fighter class levels (if any)" },
        { id: 'superiorityDice5', name: 'Superioridade (5 dados)', desc: '5 dados de superioridade; +2 manobras.' },
      ] },
      10: { features: [{ id: 'improvedSuperiority10', name: 'Superioridade Aprimorada (d10)', desc: 'Dados de superioridade viram d10; +2 manobras.' }] },
      15: { features: [
        { id: 'relentless', name: 'Implacável', desc: "A partir do 15º nível, quando rolar iniciativa e não tiver nenhum dado de superioridade restante, você recupera 1 dado de superioridade.", descEn: "Starting at 15th level, when you roll initiative and have no superiority dice remaining, you regain 1 superiority die." },
        { id: 'superiorityDice6', name: 'Superioridade (6 dados)', desc: '6 dados de superioridade; +2 manobras.' },
      ] },
      18: { features: [{ id: 'improvedSuperiority18', name: 'Superioridade Aprimorada (d12)', desc: 'Dados de superioridade viram d12.' }] },
    },
  },
};

// === Mago ===
const WIZARD = {
  classId: 'wizard',
  perLevel: {
    1: {
      cantripsKnown: 3,
      spellsPrepared: { formula: 'int+level' },
      features: [
        { id: 'spellbook', name: 'Livro de Magias', desc: '6 magias de 1° nível. Aprenda 2/nível. Prepare INT + nível magias.' },
        { id: 'arcaneRecovery', name: 'Recuperação Arcana', desc: '1×/dia, em descanso curto: recupere espaços somando até metade do nível de mago (arred. para cima), nenhum de 6º+.' },
      ],
    },
    2: { subclassChoice: true },
    3: {},
    4: { asiOrFeat: true, cantripsKnown: 4 },
    5: {},
    6: { subclassFeatures: true },
    7: {},
    8: { asiOrFeat: true },
    9: {},
    10: { cantripsKnown: 5, subclassFeatures: true },
    11: {},
    12: { asiOrFeat: true },
    13: {},
    14: { subclassFeatures: true },
    15: {},
    16: { asiOrFeat: true },
    17: {},
    18: { features: [{ id: 'spellMastery', name: 'Mestria em Magia', desc: 'Escolha 1 magia de 1º e 1 de 2º nível: lance-as no menor nível sem gastar espaço.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'signatureSpells', name: 'Magias Características', desc: 'Escolha 2 magias de 3° nível: sempre preparadas; 1×/desc curto cada uma sem espaço.' }] },
  },
  subclassPerLevel: {
    evocation: {
      2: { features: [
        { id: 'evocationSavant', name: 'Sábio de Evocação', desc: 'Metade do ouro e do tempo para copiar evocação no livro.' },
        { id: 'sculptSpells', name: 'Esculpir Magias', desc: "Evocação em área: 1 + nível da magia criaturas escolhidas passam automaticamente na salvaguarda e sofrem 0 de dano em vez de metade." },
      ] },
      6: { features: [{ id: 'potentCantrip', name: 'Truque Potente', desc: "Metade do dano mesmo se salvaguarda passar." }] },
      10: { features: [{ id: 'empoweredEvocation', name: 'Evocação Aprimorada', desc: '+INT em uma rolagem de dano de magia de evocação de mago.' }] },
      14: { features: [{ id: 'overchannel', name: 'Sobrecarga', desc: 'Maximize o dano de magia de 1º a 5º. Usos extras antes do descanso longo: 2d12 necrótico por nível da magia, +1d12 por nível a cada uso seguinte.' }] },
    },
    divination: {
      2: { features: [
        { id: 'divinationSavant', name: 'Sábio de Adivinhação', desc: "A partir do momento em que escolhe esta escola no 2º nível, o ouro e o tempo que você deve gastar para copiar uma magia de adivinhação para o seu grimório são reduzidos pela metade.", descEn: "Beginning when you select this school at 2nd level, the gold and time you must spend to copy a divination spell into your spellbook is halved." },
        { id: 'portent', name: 'Presságio', desc: "A partir do 2º nível, quando você escolhe esta escola, vislumbres do futuro começam a surgir em sua percepção. Ao terminar um descanso longo, role dois d20s e anote os números obtidos. Você pode substituir qualquer jogada de ataque, salvaguarda ou teste de atributo realizado por você ou por uma criatura que você possa ver por uma dessas jogadas de presságio. Você deve escolher fazer isso antes da rolagem, e só pode substituir uma rolagem dessa forma uma vez por turno.\n\nCada jogada de presságio pode ser usada apenas uma vez. Ao terminar um descanso longo, você perde todas as jogadas de presságio não utilizadas.", descEn: "Starting at 2nd level when you choose this school, glimpses of the future begin to press in on your awareness. When you finish a long rest, roll two d20s and record the numbers rolled. You can replace any attack roll, saving throw, or ability check made by you or a creature that you can see with one of these foretelling rolls. You must choose to do so before the roll, and you can replace a roll in this way only once per turn.\n\nEach foretelling roll can be used only once. When you finish a long rest, you lose any unused foretelling rolls." },
      ] },
      6: { features: [{ id: 'expertDivination', name: 'Adivinhação Especialista', desc: "A partir do 6º nível, conjurar magias de adivinhação é tão fácil para você que despende apenas uma fração dos seus esforços de conjuração. Quando você conjura uma magia de adivinhação de 2º círculo ou superior usando um espaço de magia, você recupera um espaço de magia gasto. O espaço que você recupera deve ser de um círculo inferior ao da magia conjurada e não pode ser superior ao 5º círculo.", descEn: "Beginning at 6th level, casting divination spells comes so easily to you that it expends only a fraction of your spellcasting efforts. When you cast a divination spell of 2nd level or higher using a spell slot, you regain one expended spell slot. The slot you regain must be of a level lower than the spell you cast and can’t be higher than 5th level." }] },
      10: { features: [{ id: 'theThirdEye', name: 'O Terceiro Olho', desc: "A partir do 10º nível, você pode usar sua ação para aprimorar seus poderes de percepção. Ao fazer isso, escolha um dos seguintes benefícios, que dura até você ficar incapacitado ou realizar um descanso curto ou longo. Você não pode usar esta característica novamente até terminar um descanso.\n\nVisão no Escuro. Você ganha visão no escuro com alcance de 18 metros.\n\nVisão Etérea. Você pode enxergar no Plano Etéreo a até 18 metros de você.\n\nCompreensão Aprimorada. Você pode ler qualquer idioma.\n\nVer o Invisível. Você pode enxergar criaturas e objetos invisíveis a até 3 metros de você que estejam em sua linha de visão.", descEn: "Starting at 10th level, you can use your action to increase your powers of perception. When you do so, choose one of the following benefits, which lasts until you are incapacitated or you take a short or long rest. You can’t use the feature again until you finish a rest.\n\nDarkvision. You gain darkvision out to a range of 60 feet.\n\nEthereal Sight. You can see into the Ethereal Plane within 60 feet of you.\n\nGreater Comprehension. You can read any language.\n\nSee Invisibility. You can see invisible creatures and objects within 10 feet of you that are within line of sight." }] },
      14: { features: [{ id: 'greaterPortent', name: 'Maior Presságio', desc: "A partir do 14º nível, as visões em seus sonhos se intensificam e pintam um quadro mais preciso em sua mente sobre o que está por vir. Você joga três d20s para a sua característica Presságio, em vez de dois.", descEn: "Starting at 14th level, the visions in your dreams intensify and paint a more accurate picture in your mind of what is to come. You roll three d20s for your Portent feature, rather than two." }] },
    },
  },
};

// === Clérigo ===
const CLERIC = {
  classId: 'cleric',
  perLevel: {
    1: {
      cantripsKnown: 3,
      spellsPrepared: { formula: 'wis+level' },
      features: [{ id: 'spellcasting', name: 'Conjuração', desc: '3 truques. Prepare WIS + nível magias.' }],
      subclassChoice: true, // Domínio Divino no nível 1
    },
    2: { features: [{ id: 'channelDivinity', name: 'Canalizar Divindade', desc: '1 uso. Turn Undead + domínio.' }] },
    3: {},
    4: { asiOrFeat: true, cantripsKnown: 4 },
    5: { features: [{ id: 'destroyUndead', name: 'Destruir Mortos-Vivos', desc: 'Expulsar Mortos-Vivos destrói ND ≤ ½ (1 no 8, 2 no 11, 3 no 14, 4 no 17).' }] },
    6: { features: [{ id: 'channelDivinity2', name: 'Canalizar Divindade (2 usos)', desc: '2 usos/descanso curto.' }], subclassFeatures: true },
    7: {},
    8: { asiOrFeat: true, subclassFeatures: true },
    9: {},
    10: { cantripsKnown: 5, features: [{ id: 'divineIntervention', name: 'Intervenção Divina', desc: 'Pedido divino: sucesso se d100 ≤ nível de clérigo; após sucesso, 7 dias até tentar de novo (senão, após descanso longo).' }] },
    11: {},
    12: { asiOrFeat: true },
    13: {},
    14: {},
    15: {},
    16: { asiOrFeat: true },
    17: { subclassFeatures: true },
    18: { features: [{ id: 'channelDivinity3', name: 'Canalizar Divindade (3 usos)', desc: '3 usos/descanso curto.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'divineInterventionImproved', name: 'Intervenção Divina Aprimorada', desc: 'Intervenção sempre bem-sucedida.' }] },
  },
  subclassPerLevel: {
    life: {
      // Cleric Life Domain: magias de domínio são SEMPRE preparadas (não contam
      // contra o limite). Por nível de clérigo (não da magia).
      1: {
        autoSpells: ['bless', 'cureWounds'],
        features: [
          { id: 'discipleOfLife', name: 'Discípulo da Vida', desc: "Magias de cura: +2+nível PV." },
          { id: 'heavyArmorProficiency', name: 'Proficiência com Armadura Pesada', desc: "Quando você escolhe este domínio no 1º nível, você ganha proficiência com armaduras pesadas.", descEn: "When you choose this domain at 1st level, you gain proficiency with heavy armor." },
        ],
      },
      2: { features: [{ id: 'preserveLife', name: 'Preservar a Vida', desc: "CD: cure 5×nível PV em 9 m." }] },
      3: { autoSpells: ['lesserRestoration', 'spiritualWeapon'] },
      5: { autoSpells: ['beaconOfHope', 'revivify'] },
      6: { features: [{ id: 'blessedHealer', name: 'Curandeiro Abençoado', desc: 'Ao curar outro, cure-se 2+nível.' }] },
      7: { autoSpells: ['deathWard', 'guardianOfFaith'] },
      8: { features: [{ id: 'divineStrike', name: 'Golpe Divino', desc: '+1d8 radiante em arma (2d8 no 14).' }] },
      9: { autoSpells: ['massCureWounds', 'raiseDead'] },
      17: { features: [{ id: 'supremeHealing', name: 'Cura Suprema', desc: 'Dados de cura → valor máximo.' }] },
    },
    light: {
      1: {
        autoCantrips: ['light'],
        autoSpells: ['burningHands', 'faerieFire'],
        features: [{ id: 'wardingFlare', name: 'Chama de Proteção', desc: "Também no 1º nível, você pode interpor luz divina entre você e um inimigo que o ataca. Quando for atacado por uma criatura a até 9 metros de você que possa ver, você pode usar sua Reação para impor Desvantagem na jogada de ataque, fazendo com que a luz resplandeça diante do atacante antes que ele acerte ou erre. Um atacante que não possa ser cegado é imune a esta característica.\n\nVocê pode usar esta característica um número de vezes igual ao seu modificador de Sabedoria (no mínimo uma vez). Você recupera todos os usos gastos ao terminar um Descanso Longo.", descEn: "Also at 1st level, you can interpose divine light between yourself and an attacking enemy. When you are attacked by a creature within 30 feet of you that you can see, you can use your reaction to impose disadvantage on the attack roll, causing light to flare before the attacker before it hits or misses. An attacker that can’t be blinded is immune to this feature.\n\nYou can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest." }],
      },
      2: { features: [{ id: 'radianceOfDawn', name: 'Radiância do Amanhecer', desc: "Canalizar Divindade: dissipa escuridão mágica; salvaguarda CON ou 2d10+nível radiante em 9 m." }] },
      3: { autoSpells: ['flamingSphere', 'scorchingRay'] },
      5: { autoSpells: ['daylight', 'fireball'] },
      6: { features: [{ id: 'improvedFlare', name: 'Chama Aprimorada', desc: "A partir do 6º nível, você também pode usar sua característica Clarão Protetor quando uma criatura que você possa ver a até 9 metros de você atacar uma criatura que não seja você.", descEn: "Starting at 6th level, you can also use your Warding Flare feature when a creature that you can see within 30 feet of you attacks a creature other than you." }] },
      7: { autoSpells: ['guardianOfFaith', 'wallOfFire'] },
      8: { features: [{ id: 'potentSpellcasting', name: 'Conjuração Potente', desc: "A partir do 8º nível, você adiciona seu modificador de Sabedoria ao dano que causa com qualquer truque de clérigo.", descEn: "Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip." }] },
      9: { autoSpells: ['flameStrike', 'scrying'] },
      17: { features: [{ id: 'coronaOfLight', name: 'Corona de Luz', desc: "A partir do 17º nível, você pode usar sua Ação para ativar uma aura de luz solar que dura por 1 minuto ou até você dispensá-la usando outra Ação. Você emite luz plena em um raio de 18 metros e penumbra por mais 9 metros além disso. Seus inimigos sob a luz plena têm Desvantagem em salvaguardas contra qualquer magia que cause dano de fogo ou radiante.", descEn: "Starting at 17th level, you can use your action to activate an aura of sunlight that lasts for 1 minute or until you dismiss it using another action. You emit bright light in a 60-foot radius and dim light 30 feet beyond that. Your enemies in the bright light have disadvantage on saving throws against any spell that deals fire or radiant damage." }] },
    },
    knowledge: {
      1: {
        autoSpells: ['commandSpell', 'identifySpell'],
        features: [{ id: 'blessingsOfKnowledge', name: 'Bênçãos do Conhecimento', desc: "No 1º nível, você aprende dois idiomas à sua escolha. Você também se torna proficiente em duas das seguintes perícias à sua escolha: Arcanismo, História, Natureza ou Religião.\n\nSeu bônus de proficiência é dobrado para qualquer teste de atributo que você fizer usando qualquer uma dessas perícias.", descEn: "At 1st level, you learn two languages of your choice. You also become proficient in your choice of two of the following skills: Arcana, History, Nature, or Religion.\n\nYour proficiency bonus is doubled for any ability check you make that uses either of those skills." }],
      },
      2: { features: [{ id: 'knowledgeOfAges', name: 'Conhecimento das Eras', desc: 'CD: proficiência em qualquer perícia/ferramenta por 10 min.' }] },
      3: { autoSpells: ['augury', 'suggestion'] },
      5: { autoSpells: ['nondetection', 'speakWithDead'] },
      6: { features: [{ id: 'readThoughts', name: 'Ler Pensamentos', desc: "No 6º nível, você pode usar seu Canalizar Divindade para ler os pensamentos de uma criatura. Você pode então usar seu acesso à mente da criatura para comandá-la.\n\nComo uma ação, escolha uma criatura que você possa ver a até 18 metros de você. Aquela criatura deve fazer uma salvaguarda de Sabedoria. Se a criatura for bem-sucedida na salvaguarda, você não pode usar esta característica nela novamente até terminar um descanso longo.\n\nSe a criatura falhar na salvaguarda, você pode ler seus pensamentos superficiais (aqueles em primeiro plano em sua mente, refletindo suas emoções atuais e sobre o que ela está pensando ativamente) quando ela estiver a até 18 metros de você. Este efeito dura por 1 minuto.\n\nDurante esse período, você pode usar sua ação para encerrar este efeito e conjurar a magia sugestão na criatura sem gastar um espaço de magia. O alvo falha automaticamente na salvaguarda contra a magia.", descEn: "At 6th level, you can use your Channel Divinity to read a creature’s thoughts. You can then use your access to the creature’s mind to command it.\n\nAs an action, choose one creature that you can see within 60 feet of you. That creature must make a Wisdom saving throw. If the creature succeeds on the saving throw, you can’t use this feature on it again until you finish a long rest.\n\nIf the creature fails its save, you can read its surface thoughts (those foremost in its mind, reflecting its current emotions and what it is actively thinking about) when it is within 60 feet of you. This effect lasts for 1 minute.\n\nDuring that time, you can use your action to end this effect and cast the suggestion spell on the creature without expending a spell slot. The target automatically fails its saving throw against the spell." }] },
      7: { autoSpells: ['arcaneEye', 'confusion'] },
      8: { features: [{ id: 'potentSpellcasting', name: 'Conjuração Potente', desc: "A partir do 8º nível, você adiciona seu modificador de Sabedoria ao dano que causa com qualquer truque de clérigo.", descEn: "Starting at 8th level, you add your Wisdom modifier to the damage you deal with any cleric cantrip." }] },
      9: { autoSpells: ['legendLore', 'scrying'] },
      17: { features: [{ id: 'visionsOfPast', name: 'Visões do Passado', desc: '1×/descanso curto: medite até 1 min por SAB e veja o passado de um objeto ou local.' }] },
    },
    // Magias de domínio 2014 (PHB); os traços vêm de SRD.SUBCLASSES.
    war: {
      1: { autoSpells: ['divineFavor', 'shieldOfFaith'] }, 3: { autoSpells: ['magicWeapon', 'spiritualWeapon'] },
      5: { autoSpells: ['crusadersMantle', 'spiritGuardians'] }, 7: { autoSpells: ['freedomOfMovement', 'stoneskin'] },
      9: { autoSpells: ['flameStrike', 'holdMonster'] },
    },
    tempest: {
      1: { autoSpells: ['fogCloud', 'thunderwave'] }, 3: { autoSpells: ['gustOfWind', 'shatter'] },
      5: { autoSpells: ['callLightning', 'sleetStorm'] }, 7: { autoSpells: ['controlWater', 'iceStorm'] },
      9: { autoSpells: ['destructiveWave', 'insectPlague'] },
    },
    trickery: {
      1: { autoSpells: ['charmPerson', 'disguiseSelf'] }, 3: { autoSpells: ['mirrorImage', 'passWithoutTrace'] },
      5: { autoSpells: ['blink', 'dispelMagic'] }, 7: { autoSpells: ['dimensionDoor', 'polymorph'] },
      9: { autoSpells: ['dominatePerson', 'modifyMemory'] },
    },
  },
};

// === Ladino ===
const ROGUE = {
  classId: 'rogue',
  perLevel: {
    1: {
      expertiseChoice: 2,
      features: [
        { id: 'expertise', name: 'Especialização', desc: 'Dobre o bônus de proficiência em 2 perícias (ou 1 perícia + ferramentas de ladrão); mais 2 no nível 6.' },
        { id: 'sneakAttack', name: 'Ataque Furtivo', desc: '+1d6 dano 1×/turno (cresce com nível).' },
        { id: 'thievesCant', name: 'Gíria de Ladrões', desc: 'Jargão secreto.' },
      ],
    },
    2: { features: [{ id: 'cunningAction', name: 'Ação Astuta', desc: 'Ação bônus: Correr, Desengajar ou Esconder.' }] },
    3: { subclassChoice: true },
    4: { asiOrFeat: true },
    5: { features: [{ id: 'uncannyDodge', name: 'Esquiva Sobrenatural', desc: 'Reação: metade do dano de ataque que veja.' }] },
    6: { expertiseChoice: 2 },
    7: { features: [{ id: 'evasion', name: 'Evasão', desc: "salvaguarda DEST passar → 0 dano (metade se falhar)." }] },
    8: { asiOrFeat: true },
    9: { subclassFeatures: true },
    10: { asiOrFeat: true },
    11: { features: [{ id: 'reliableTalent', name: 'Talento Confiável', desc: 'Rolagens proficientes ≤9 viram 10.' }] },
    12: { asiOrFeat: true },
    13: { subclassFeatures: true },
    14: { features: [{ id: 'blindsense', name: 'Sentido Cego', desc: "Se puder ouvir, sabe a posição de criaturas escondidas ou invisíveis a 3 m." }] },
    15: { features: [{ id: 'slipperyMind', name: 'Mente Esquiva', desc: "Proficiência em salvaguarda SAB." }] },
    16: { asiOrFeat: true },
    17: { subclassFeatures: true },
    18: { features: [{ id: 'elusive', name: 'Esquivo', desc: 'Ataques contra você não têm vantagem se não incapacitado.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'strokeOfLuck', name: 'Golpe de Sorte', desc: '1×/desc curto: um ataque que erraria acerta, ou um teste de atributo falho vira 20 no d20.' }] },
  },
  subclassPerLevel: {
    thief: {
      3: { features: [
        { id: 'fastHands', name: 'Mãos Rápidas', desc: 'Ação Astuta: teste de Prestidigitação, usar ferramentas de ladrão (desarmar armadilha, abrir fechadura) ou Usar um Objeto.' },
        { id: 'secondStoryWork', name: 'Trabalho de Segundo Andar', desc: "Escalar não custa extra; salto com corrida +0,3 × mod. DES metros." },
      ] },
      9: { features: [{ id: 'supremeSneak', name: 'Furtividade Suprema', desc: 'Vantagem em Furtividade se mover ≤ metade.' }] },
      13: { features: [{ id: 'useMagicDevice', name: 'Usar Item Mágico', desc: 'Ignore requisitos de classe/raça/nível para itens.' }] },
      17: { features: [{ id: 'thiefsReflexes', name: 'Reflexos de Ladrão', desc: 'Na 1ª rodada de combate, 2 turnos: o normal e outro na iniciativa −10. Não funciona se surpreendido.' }] },
    },
    assassin: {
      3: { features: [
        { id: 'bonusProficiencies', name: 'Proficiências Bônus', desc: "Quando você escolhe este arquétipo no 3º nível, você ganha proficiência com o kit de disfarce e com o kit de envenenador.", descEn: "When you choose this archetype at 3rd level, you gain proficiency with the disguise kit and the poisoner’s kit." },
        { id: 'assassinate', name: 'Assassinar', desc: "A partir do 3º nível, você é mais letal quando pega seus inimigos desprevenidos. Você tem vantagem em jogadas de ataque contra qualquer criatura que ainda não tenha realizado um turno no combate. Além disso, qualquer acerto que obtiver contra uma criatura que esteja surpresa é um acerto crítico.", descEn: "Starting at 3rd level, you are at your deadliest when you get the drop on your enemies. You have advantage on attack rolls against any creature that hasn’t taken a turn in the combat yet. In addition, any hit you score against a creature that is surprised is a critical hit." },
      ] },
      9: { features: [{ id: 'infiltrationExpertise', name: 'Perícia em Infiltração', desc: "A partir do 9º nível, você pode criar identidades falsas infalíveis para si mesmo. Você deve gastar sete dias e 25 po para estabelecer o histórico, a profissão e as afiliações para uma identidade. Você não pode estabelecer uma identidade que pertença a outra pessoa. Por exemplo, você pode adquirir roupas apropriadas, cartas de apresentação e certificações de aparência oficial para se estabelecer como membro de uma casa comercial de uma cidade remota, para que possa se insinuar na companhia de outros mercadores abastados.\n\nA partir de então, se adotar a nova identidade como um disfarce, outras criaturas acreditarão que você é aquela pessoa até terem um motivo óbvio para não acreditar.", descEn: "Starting at 9th level, you can unfailingly create false identities for yourself. You must spend seven days and 25 gp to establish the history, profession, and affiliations for an identity. You can’t establish an identity that belongs to someone else. For example, you might acquire appropriate clothing, letters of introduction, and officiallooking certification to establish yourself as a member of a trading house from a remote city so you can insinuate yourself into the company of other wealthy merchants.\n\nThereafter, if you adopt the new identity as a disguise, other creatures believe you to be that person until given an obvious reason not to." }] },
      13: { features: [{ id: 'impostor', name: 'Impostor', desc: 'Imitação perfeita após 3h de observação.' }] },
      17: { features: [{ id: 'deathStrike', name: 'Golpe da Morte', desc: "A partir do 17º nível, você se torna um mestre da morte instantânea. Quando você ataca e atinge uma criatura que está surpresa, ela deve realizar uma salvaguarda de Constituição (CD 8 + seu modificador de Destreza + seu bônus de proficiência). Em caso de falha, dobre o dano do seu ataque contra a criatura.", descEn: "Starting at 17th level, you become a master of instant death. When you attack and hit a creature that is surprised, it must make a Constitution saving throw (DC 8 + your Dexterity modifier + your proficiency bonus). On a failed save, double the damage of your attack against the creature." }] },
    },
    arcaneTrickster: {
      3: { cantripsKnown: 3, spellsKnown: 3, features: [
        { id: 'spellcasting', name: 'Conjuração', desc: "Quando você alcança o 3º nível, ganha a habilidade de conjurar magias. Consulte o capítulo 10 para as regras gerais de conjuração e o capítulo 11 para a lista de magias de mago.\n\nTruques. Você aprende três truques: mãos mágicas e outros dois truques à sua escolha da lista de magias de mago. Você aprende outro truque de mago à sua escolha no 10º nível.\n\nEspaços de Magia. A tabela Conjuração do Trapaceiro Arcano mostra quantos espaços de magia você tem para conjurar suas magias de mago de 1º círculo ou superior. Para conjurar uma dessas magias, você deve gastar um espaço do círculo da magia ou superior. Você recupera todos os espaços de magia gastos ao terminar um descanso longo.\n\nPor exemplo, se você conhece a magia de 1º círculo enfeitiçar pessoa e tem espaços de magia de 1º e 2º círculos disponíveis, pode conjurar enfeitiçar pessoa usando qualquer um dos espaços.\n\nMagias Conhecidas de 1º Círculo e Superior. Você conhece três magias de mago de 1º círculo à sua escolha, duas das quais você deve escolher entre as magias de encantamento e ilusão da lista de magias de mago.\n\nA coluna Magias Conhecidas da tabela Conjuração do Trapaceiro Arcano mostra quando você aprende mais magias de mago de 1º círculo ou superior. Cada uma dessas magias deve ser uma magia de encantamento ou ilusão à sua escolha e deve ser de um círculo para o qual você tenha espaços de magia. Por exemplo, quando você alcança o 7º nível nesta classe, pode aprender uma nova magia de 1º ou 2º círculo.\n\nAs magias que você aprende nos níveis 8, 14 e 20 podem vir de qualquer escola de magia.\n\nSempre que você ganhar um nível nesta classe, pode substituir uma das magias de mago que conhece por outra magia à sua escolha da lista de magias de mago. A nova magia deve ser de um círculo para o qual você tenha espaços de magia e deve ser uma magia de encantamento ou ilusão, a menos que esteja substituindo a magia obtida no 3º, 8º, 14º ou 20º nível de qualquer escola de magia.\n\nHabilidade de Conjuração. Inteligência é a sua habilidade de conjuração para suas magias de mago, já que você aprende suas magias por meio de estudo dedicado e memorização. Você usa sua Inteligência sempre que uma magia se refere à sua habilidade de conjuração. Além disso, você usa seu modificador de Inteligência ao definir a CD de salvaguarda para uma magia de mago que você conjurar e ao fazer uma jogada de ataque com uma.\n\nCD de salvaguarda da magia = 8 + seu bônus de proficiência + seu modificador de Inteligência\n\nModificador de ataque de magia = seu bônus de proficiência + seu modificador de Inteligência\n\nCONJURAÇÃO DO TRAPACEIRO ARCANO\n\n| Nível de Ladino | Truques Conhecidos | Magias Conhecidas | 1º | 2º | 3º | 4º |\n\n| 3º | 3 | 3 | 2 | — | — | — |\n\n| 4º | 3 | 4 | 3 | — | — | — |\n\n| 5º | 3 | 4 | 3 | — | — | — |\n\n| 6º | 3 | 4 | 3 | — | — | — |\n\n| 7º | 3 | 5 | 4 | 2 | — | — |\n\n| 8º | 3 | 6 | 4 | 2 | — | — |\n\n| 9º | 3 | 6 | 4 | 2 | — | — |\n\n| 10º | 4 | 7 | 4 | 3 | — | — |\n\n| 11º | 4 | 8 | 4 | 3 | — | — |\n\n| 12º | 4 | 8 | 4 | 3 | — | — |\n\n| 13º | 4 | 9 | 4 | 3 | 2 | — |\n\n| 14º | 4 | 10 | 4 | 3 | 2 | — |\n\n| 15º | 4 | 10 | 4 | 3 | 2 | — |\n\n| 16º | 4 | 11 | 4 | 3 | 3 | — |\n\n| 17º | 4 | 11 | 4 | 3 | 3 | — |\n\n| 18º | 4 | 11 | 4 | 3 | 3 | — |\n\n| 19º | 4 | 12 | 4 | 3 | 3 | 1 |\n\n| 20º | 4 | 13 | 4 | 3 | 3 | 1 |", descEn: "When you reach 3rd level, you gain the ability to cast spells. See chapter 10 for the general rules of spellcasting and chapter 11 for the wizard spell list.\n\nCantrips. You learn three cantrips: mage hand and two other cantrips of your choice from the wizard spell list. You learn another wizard cantrip of your choice at 10th level.\n\nSpell Slots. The Arcane Trickster Spellcasting table shows how many spell slots you have to cast your wizard spells of 1st level and higher. To cast one of these spells, you must expend a slot of the spell's level or higher. You regain all expended spell slots when you finish a long rest.\n\nFor example, if you know the 1st-level spell charm person and have a 1st-level and a 2nd-level spell slot available, you can cast charm person using either slot.\n\nSpells Known of 1st-Level and Higher. You know three 1st-level wizard spells of your choice, two of which you must choose from the enchantment and illusion spells on the wizard spell list.\n\nThe Spells Known column of the Arcane Trickster Spellcasting table shows when you learn more wizard spells of 1st level or higher. Each of these spells must be an enchantment or illusion spell of your choice, and must be of a level for which you have spell slots. For instance, when you reach 7th level in this class, you can learn one new spell of 1st or 2nd level.\n\nThe spells you learn at 8th, 14th, and 20th level can come from any school of magic.\n\nWhenever you gain a level in this class, you can replace one of the wizard spells you know with another spell of your choice from the wizard spell list. The new spell must be of a level for which you have spell slots, and it must be an enchantment or illusion spell, unless you’re replacing the spell you gained at 3rd, 8th, 14th, or 20th level from any school of magic.\n\nSpellcasting Ability. Intelligence is your spellcasting ability for your wizard spells, since you learn your spells through dedicated study and memorization. You use your Intelligence whenever a spell refers to your spellcasting ability. In addition, you use your Intelligence modifier when setting the saving throw DC for a wizard spell you cast and when making an attack roll with one.\n\nSpell save DC = 8 + your proficiency bonus + your Intelligence modifier\n\nSpell attack modifier = your proficiency bonus + your Intelligence modifier\n\nARCANE TRICKSTER SPELLCASTING\n\n| Rogue Level | Cantrips Known | Spells Known | 1st | 2nd | 3rd | 4th |\n\n| 3rd | 3 | 3 | 2 | — | — | — |\n\n| 4th | 3 | 4 | 3 | — | — | — |\n\n| 5th | 3 | 4 | 3 | — | — | — |\n\n| 6th | 3 | 4 | 3 | — | — | — |\n\n| 7th | 3 | 5 | 4 | 2 | — | — |\n\n| 8th | 3 | 6 | 4 | 2 | — | — |\n\n| 9th | 3 | 6 | 4 | 2 | — | — |\n\n| 10th | 4 | 7 | 4 | 3 | — | — |\n\n| 11th | 4 | 8 | 4 | 3 | — | — |\n\n| 12th | 4 | 8 | 4 | 3 | — | — |\n\n| 13th | 4 | 9 | 4 | 3 | 2 | — |\n\n| 14th | 4 | 10 | 4 | 3 | 2 | — |\n\n| 15th | 4 | 10 | 4 | 3 | 2 | — |\n\n| 16th | 4 | 11 | 4 | 3 | 3 | — |\n\n| 17th | 4 | 11 | 4 | 3 | 3 | — |\n\n| 18th | 4 | 11 | 4 | 3 | 3 | — |\n\n| 19th | 4 | 12 | 4 | 3 | 3 | 1 |\n\n| 20th | 4 | 13 | 4 | 3 | 3 | 1 |" },
        { id: 'mageHandLegerdemain', name: 'Mão Mágica Hábil', desc: "A partir do 3º nível, quando você conjurar mãos mágicas, pode tornar a mão espectral invisível e pode realizar as seguintes tarefas adicionais com ela:\n\n• Você pode guardar um objeto que a mão esteja segurando em um recipiente vestido ou carregado por outra criatura.\n\n• Você pode retirar um objeto de um recipiente vestido ou carregado por outra criatura.\n\n• Você pode usar ferramentas de ladrão para abrir fechaduras e desarmar armadilhas à distância.\n\nVocê pode realizar uma dessas tarefas sem ser notado por uma criatura se for bem-sucedido em um teste de Destreza (Prestidigitação) resistido pelo teste de Sabedoria (Percepção) da criatura.\n\nAlém disso, você pode usar a ação bônus concedida pela sua Ação Astuta para controlar a mão.", descEn: "Starting at 3rd level, when you cast mage hand, you can make the spectral hand invisible, and you can perform the following additional tasks with it:\n\n• You can stow one object the hand is holding in a container worn or carried by another creature.\n\n• You can retrieve an object in a container worn or carried by another creature.\n\n• You can use thieves’ tools to pick locks and disarm traps at range.\n\nYou can perform one of these tasks without being noticed by a creature if you succeed on a Dexterity (Sleight of Hand) check contested by the creature’s Wisdom (Perception) check.\n\nIn addition, you can use the bonus action granted by your Cunning Action to control the hand." },
      ] },
      9: { features: [{ id: 'magicalAmbush', name: 'Emboscada Mágica', desc: "A partir do 9º nível, se você estiver escondido de uma criatura quando conjurar uma magia nela, a criatura tem desvantagem em qualquer salvaguarda que fizer contra a magia neste turno.", descEn: "Starting at 9th level, if you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any saving throw it makes against the spell this turn." }] },
      13: { features: [{ id: 'versatileTrickster', name: 'Trapaceiro Versátil', desc: "No 13º nível, você ganha a habilidade de distrair alvos com suas mãos mágicas. Como uma ação bônus no seu turno, você pode designar uma criatura a até 1,5 metro da mão espectral criada pela magia. Fazer isso concede a você vantagem nas jogadas de ataque contra essa criatura até o final do turno.", descEn: "At 13th level, you gain the ability to distract targets with your mage hand. As a bonus action on your turn, you can designate a creature within 5 feet of the spectral hand created by the spell. Doing so gives you advantage on attack rolls against that creature until the end of the turn." }] },
      17: { features: [{ id: 'spellThief', name: 'Ladrão de Magias', desc: "No 17º nível, você adquire a capacidade de roubar magicamente o conhecimento de como conjurar uma magia de outro conjurador.\n\nImediatamente após uma criatura conjurar uma magia que tenha você como alvo ou o inclua em sua área de efeito, você pode usar sua reação para forçar a criatura a realizar uma salvaguarda com o modificador de atributo de conjuração dela. A CD é igual à CD de salvaguarda das suas magias. Em caso de falha, você anula o efeito da magia contra você e rouba o conhecimento da magia se ela for de pelo menos 1º círculo e de um círculo que você possa conjurar (ela não precisa ser uma magia de mago). Pelas próximas 8 horas, você conhece a magia e pode conjurá-la usando seus espaços de magia. A criatura não pode conjurar essa magia até que as 8 horas tenham passado.\n\nAssim que usar esta característica, você não poderá usá-la novamente até terminar um descanso longo.", descEn: "At 17th level, you gain the ability to magically steal the knowledge of how to cast a spell from another spellcaster.\n\nImmediately after a creature casts a spell that targets you or includes you in its area of effect, you can use your reaction to force the creature to make a saving throw with its spellcasting ability modifier. The DC equals your spell save DC. On a failed save, you negate the spell’s effect against you, and you steal the knowledge of the spell if it is at least 1st level and of a level you can cast (it doesn’t need to be a wizard spell). For the next 8 hours, you know the spell and can cast it using your spell slots. The creature can’t cast that spell until the 8 hours have passed.\n\nOnce you use this feature, you can’t use it again until you finish a long rest." }] },
    },
  },
};

// === Bárbaro ===
const BARBARIAN = {
  classId: 'barbarian',
  perLevel: {
    1: { features: [
      { id: 'rage', name: 'Fúria', desc: 'Ação bônus, 1 min: vantagem em FOR, +2 de dano corpo a corpo com FOR (+3 no 9, +4 no 16), resistência a B/P/S. Usos por descanso longo: 2 (3 no 3, 4 no 6, 5 no 12, 6 no 17, ilimitado no 20).' },
      { id: 'unarmoredDefense', name: 'Defesa sem Armadura', desc: 'CA = 10 + DEX + CON.' },
    ] },
    2: { features: [
      { id: 'recklessAttack', name: 'Ataque Imprudente', desc: 'Vantagem em ataques FOR; ataques contra você têm vantagem.' },
      { id: 'dangerSense', name: 'Sentido de Perigo', desc: "Vantagem em salvaguarda DES contra efeitos que você vê; não funciona cego, surdo ou incapacitado." },
    ] },
    3: { subclassChoice: true },
    4: { asiOrFeat: true },
    5: { extraAttacks: 1, features: [{ id: 'fastMovement', name: 'Movimento Rápido', desc: "+3 m deslocamento sem armadura pesada." }] },
    6: { subclassFeatures: true },
    7: { features: [{ id: 'feralInstinct', name: 'Instinto Feral', desc: 'Vantagem em iniciativa; se surpreendido, pode agir no 1º turno se entrar em Fúria.' }] },
    8: { asiOrFeat: true },
    9: { features: [{ id: 'brutalCritical', name: 'Crítico Brutal', desc: '+1 dado de dano da arma em críticos corpo a corpo (2 no 13, 3 no 17).' }] },
    10: { subclassFeatures: true },
    11: { features: [{ id: 'relentlessRage', name: 'Fúria Implacável', desc: "Em Fúria, ao cair a 0 PV: salvaguarda CON CD 10 (+5 por uso, volta a 10 no descanso) para ficar com 1 PV." }] },
    12: { asiOrFeat: true },
    13: { features: [{ id: 'brutalCritical2', name: 'Crítico Brutal (2 dados)', desc: '+2 dados de dano da arma em críticos corpo a corpo.' }] },
    14: { subclassFeatures: true },
    15: { features: [{ id: 'persistentRage', name: 'Fúria Persistente', desc: 'A Fúria só termina se você ficar inconsciente ou quiser.' }] },
    16: { asiOrFeat: true },
    17: { features: [{ id: 'brutalCritical3', name: 'Crítico Brutal (3 dados)', desc: '+3 dados de dano da arma em críticos corpo a corpo.' }] },
    18: { features: [{ id: 'indomitableMight', name: 'Poderio Indomável', desc: 'Testes FOR ≤ FOR viram FOR.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'primalChampion', name: 'Campeão Primitivo', desc: '+4 FOR e CON (máx 24). Fúria ilimitada.' }] },
  },
  subclassPerLevel: {
    berserker: {
      3: { features: [{ id: 'frenzy', name: 'Frenesi', desc: 'Ao entrar em Fúria: ataque corpo a corpo como ação bônus a cada turno. Ao fim da Fúria: 1 nível de exaustão.' }] },
      6: { features: [{ id: 'mindlessRage', name: 'Fúria Insensata', desc: 'Em Fúria: imune a enfeitiçado e amedrontado (efeitos suspensos).' }] },
      10: { features: [{ id: 'intimidatingPresence', name: 'Presença Intimidadora', desc: "Ação: criatura a 9 m faz salvaguarda SAB (CD 8+PB+CAR) ou fica amedrontada até o fim do seu próximo turno; ação para estender." }] },
      14: { features: [{ id: 'retaliation', name: 'Retaliação', desc: "Reação: ataque ao sofrer dano em 1,5 m." }] },
    },
  },
};

// === Paladino ===
const PALADIN = {
  classId: 'paladin',
  perLevel: {
    1: { features: [
      { id: 'divineSense', name: 'Sentido Divino', desc: "Ação: detecte celestiais, corruptores e mortos-vivos a 18 m. 1 + CAR usos por descanso longo." },
      { id: 'layOnHands', name: 'Imposição de Mãos', desc: "Pool 5×nível PV. Cure veneno/doença por 5 PV." },
    ] },
    2: { fightingStyleChoice: 1, spellsPrepared: { formula: 'cha+halfLevel' }, features: [
      { id: 'spellcasting', name: 'Conjuração', desc: 'Prepare CHA + ½ nível magias.' },
      { id: 'divineSmite', name: 'Golpe Divino', desc: 'Após acerto corpo a corpo: gaste slot para +2d8 radiante (1° nível, +1d8 por nível adicional, máx. 5d8; +1d8 contra corruptor ou morto-vivo).' },
    ] },
    3: { subclassChoice: true, features: [{ id: 'divineHealth', name: 'Saúde Divina', desc: 'Imune a doenças.' }] },
    4: { asiOrFeat: true },
    5: { extraAttacks: 1 },
    6: { features: [{ id: 'auraOfProtection', name: 'Aura de Proteção', desc: "Aliados em 3 m +CHA em salvaguarda." }] },
    7: { subclassFeatures: true },
    8: { asiOrFeat: true },
    9: {},
    10: { features: [{ id: 'auraOfCourage', name: 'Aura da Coragem', desc: "Aliados em 3 m imunes a medo." }] },
    11: { features: [{ id: 'improvedDivineSmite', name: 'Golpe Divino Aprimorado', desc: '+1d8 radiante em todo acerto com arma corpo a corpo.' }] },
    12: { asiOrFeat: true },
    13: {},
    14: { features: [{ id: 'cleansingTouch', name: 'Toque Purificador', desc: 'Termine magia: CHA usos/desc longo.' }] },
    15: { subclassFeatures: true },
    16: { asiOrFeat: true },
    17: {},
    18: { features: [{ id: 'auraImprovements', name: "Auras de 9 m", desc: "Auras crescem para 9 m." }] },
    19: { asiOrFeat: true },
    20: { subclassFeatures: true },
  },
  subclassPerLevel: {
    devotion: {
      // Magias de Juramento 2014 (PHB): 3, 5, 9, 13 e 17.
      // Paladino do Juramento da Devoção: Oath Spells sempre preparados.
      3: {
        autoSpells: ['protectionFromEvilGood', 'sanctuary'],
        features: [
          { id: 'sacredWeapon', name: 'Arma Sagrada', desc: "CD, 1 min: arma +CAR (mín. +1) nas jogadas de ataque, conta como mágica, luz 6 m." },
          { id: 'turnUnholy', name: 'Expulsar os Profanos', desc: "CD: corruptores e mortos-vivos a 9 m fazem salvaguarda SAB ou ficam expulsos por 1 min." },
        ],
      },
      5: { autoSpells: ['lesserRestoration', 'zoneOfTruth'] },
      7: {
        features: [{ id: 'auraOfDevotion', name: 'Aura da Devoção', desc: "Você e aliados a 3 m (30 no 18) não podem ser enfeitiçados enquanto você estiver consciente." }],
      },
      9: { autoSpells: ['beaconOfHope', 'dispelMagic'] },
      13: { autoSpells: ['freedomOfMovement', 'guardianOfFaith'] },
      15: { features: [{ id: 'purityOfSpirit', name: 'Pureza de Espírito', desc: "A partir do 15º nível, você está sempre sob os efeitos da magia proteção contra o bem e mal.", descEn: "Beginning at 15th level, you are always under the effects of a protection from evil and good spell." }] },
      17: { autoSpells: ['commune', 'flameStrike'] },
      20: { features: [{ id: 'holyNimbus', name: 'Nimbo Sagrado', desc: "1×/desc longo, ação, 1 min: luz solar 9 m; inimigo que começa o turno nela sofre 10 radiante; vantagem em salvaguarda contra magias de corruptores e mortos-vivos." }] },
    },
  },
};

// === Ranger / Bard / Sorcerer / Monk / Warlock — esqueleto, completar conforme necessidade ===
const RANGER = {
  classId: 'ranger',
  perLevel: {
    1: { features: [
      { id: 'favoredEnemy', name: 'Inimigo Favorito', desc: 'Escolha um tipo (ou 2 raças humanoides) e aprenda 1 idioma dele: vantagem em Sobrevivência para rastreá-lo e em INT para lembrar informações. +1 tipo no 6 e no 14.' },
      { id: 'naturalExplorer', name: 'Explorador Natural', desc: 'Terreno favorito: proficiência dobrada em INT/SAB ligados a ele e vantagens de viagem. +1 terreno no 6 e no 10.' },
    ] },
    2: { fightingStyleChoice: 1, spellsPrepared: { formula: 'wis+halfLevel' }, features: [
      { id: 'spellcasting', name: 'Conjuração', desc: 'Magias conhecidas de patrulheiro (2 no nível 2), atributo SAB.' },
    ] },
    3: { subclassChoice: true, features: [{ id: 'primevalAwareness', name: 'Consciência Primitiva', desc: 'Gaste um espaço: por 1 min por nível do espaço, sinta aberrações, celestiais, dragões, elementais, feéricos, corruptores e mortos-vivos a 1 milha (6 em terreno favorito).' }] },
    4: { asiOrFeat: true },
    5: { extraAttacks: 1 },
    6: { features: [{ id: 'favoredEnemyImprovement', name: 'Inimigo Favorito e Explorador Natural (melhoria)', desc: '+1 inimigo favorito (com idioma) e +1 terreno favorito.' }] },
    7: { subclassFeatures: true },
    8: { asiOrFeat: true, features: [{ id: 'landsStride', name: "Passos da Terra", desc: 'Terreno difícil natural não custa extra.' }] },
    9: {},
    10: { features: [
      { id: 'hideInPlainSight', name: 'Esconder à Vista', desc: '1 min preparando camuflagem: +10 em Furtividade enquanto ficar parado encostado numa superfície sólida.' },
      { id: 'naturalExplorer3', name: 'Explorador Natural (3º terreno)', desc: '+1 terreno favorito.' },
    ] },
    11: { subclassFeatures: true },
    12: { asiOrFeat: true },
    13: {},
    14: { features: [
      { id: 'vanish', name: 'Desaparecer', desc: 'Esconder como ação bônus; não pode ser rastreado por meios não mágicos, salvo se quiser.' },
      { id: 'favoredEnemy3', name: 'Inimigo Favorito (3º tipo)', desc: '+1 inimigo favorito (com idioma).' },
    ] },
    15: { subclassFeatures: true },
    16: { asiOrFeat: true },
    17: {},
    18: { features: [{ id: 'feralSenses', name: 'Sentidos Selvagens', desc: "Sem desvantagem ao atacar criatura que não vê; percebe criaturas invisíveis a 9 m se não estiver cego nem surdo." }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'foeSlayer', name: 'Matador de Inimigos', desc: '1×/turno: +SAB no ataque ou no dano contra um inimigo favorito.' }] },
  },
  subclassPerLevel: {
    hunter: {
      3: { features: [{ id: 'huntersPrey', name: 'Presa do Caçador', desc: 'Escolha: Colossus Slayer, Giant Killer ou Horde Breaker.' }] },
      7: { features: [{ id: 'defensiveTactics', name: 'Táticas Defensivas', desc: 'Escolha: Escape the Horde, Multiattack Defense, Steel Will.' }] },
      11: { features: [{ id: 'multiattack', name: 'Multiataque', desc: 'Escolha: Volley ou Whirlwind Attack.' }] },
      15: { features: [{ id: 'superiorHuntersDefense', name: 'Defesa Superior do Caçador', desc: 'Escolha: Evasion, Stand Against the Tide ou Uncanny Dodge.' }] },
    },
  },
};

const BARD = {
  classId: 'bard',
  perLevel: {
    1: {
      cantripsKnown: 2,
      spellsKnown: 4,
      spellsPrepared: { formula: 4 },
      features: [
        { id: 'spellcasting', name: 'Conjuração', desc: '2 truques + 4 magias de 1°. CHA.' },
        { id: 'bardicInspiration', name: 'Inspiração Bárdica', desc: 'Ação bônus: dê d6 a aliado (d8 no 5, d10 no 10, d12 no 15). CAR usos (mín. 1) por descanso longo.' },
      ],
    },
    2: { features: [
      { id: 'jackOfAllTrades', name: 'Pau pra Toda Obra', desc: '+½ prof em testes sem prof.' },
      { id: 'songOfRest', name: 'Canção do Descanso', desc: 'Aliados que gastam Dados de Vida em descanso curto curam +1d6 (d8 no 9, d10 no 13, d12 no 17).' },
    ] },
    3: { subclassChoice: true, expertiseChoice: 2 },
    4: { asiOrFeat: true, cantripsKnown: 3 },
    5: { features: [
      { id: 'bardicInspirationD8', name: 'Inspiração Bárdica (d8)', desc: 'O dado de Inspiração Bárdica passa a d8.' },
      { id: 'fontOfInspiration', name: 'Fonte de Inspiração', desc: 'Inspiração Bárdica recarrega em descanso curto ou longo.' },
    ] },
    6: { subclassFeatures: true, features: [{ id: 'countercharm', name: 'Contraencanto', desc: "Ação: até o fim do seu próximo turno, você e aliados a 9 m que ouçam têm vantagem em salvaguarda contra amedrontado e enfeitiçado." }] },
    7: {},
    8: { asiOrFeat: true },
    9: {},
    10: { cantripsKnown: 4, expertiseChoice: 2, features: [
      { id: 'bardicInspirationD10', name: 'Inspiração Bárdica (d10)', desc: 'O dado de Inspiração Bárdica passa a d10.' },
      { id: 'magicalSecrets', name: 'Segredos Mágicos', desc: 'Aprenda 2 magias de qualquer classe.' },
    ] },
    11: {},
    12: { asiOrFeat: true },
    13: {},
    14: { subclassFeatures: true, features: [{ id: 'magicalSecrets', name: 'Segredos Mágicos (mais 2)', desc: '+2 magias.' }] },
    15: { features: [{ id: 'bardicInspirationD12', name: 'Inspiração Bárdica (d12)', desc: 'O dado de Inspiração Bárdica passa a d12.' }] },
    16: { asiOrFeat: true },
    17: {},
    18: { features: [{ id: 'magicalSecrets', name: 'Segredos Mágicos (mais 2)', desc: '+2 magias.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'superiorInspiration', name: 'Inspiração Superior', desc: 'Comece combate com 1 Inspiração se nenhum disponível.' }] },
  },
  subclassPerLevel: {
    lore: {
      3: { features: [
        { id: 'bonusProficiencies', name: 'Proficiências Bônus', desc: "Quando você se junta ao Colégio do Conhecimento no 3º nível, você ganha proficiência em três perícias à sua escolha.", descEn: "When you join the College of Lore at 3rd level, you gain proficiency with three skills of your choice." },
        { id: 'cuttingWords', name: 'Palavras Cortantes', desc: "Reação: gaste 1 Inspiração e subtraia o dado de Inspiração do ataque, teste de atributo ou dano de criatura a 18 m." },
      ] },
      6: { features: [{ id: 'additionalMagicalSecrets', name: 'Segredos Mágicos Adicionais', desc: '+2 magias de qualquer classe (contam como de bardo, fora do total de conhecidas).' }] },
      14: { features: [{ id: 'peerlessSkill', name: 'Perícia Inigualável', desc: 'Em um teste de atributo seu, gaste 1 Inspiração e some o dado.' }] },
    },
    valor: {
      3: { features: [
        { id: 'combatProficiencies', name: 'Proficiências de Combate', desc: 'Armadura média, escudos, armas marciais.' },
        { id: 'combatInspiration', name: 'Inspiração de Combate', desc: "Também no 3º nível, você aprende a inspirar outros em batalha. Uma criatura que tenha um dado de Inspiração de Bardo concedido por você pode rolar esse dado e adicionar o número rolado a uma rolagem de dano com arma que acabou de fazer. Como alternativa, quando uma jogada de ataque é feita contra a criatura, ela pode usar sua Reação para rolar o dado de Inspiração de Bardo e adicionar o número rolado à sua CA contra aquele ataque, após ver a rolagem, mas antes de saber se acertou ou errou.", descEn: "Also at 3rd level, you learn to inspire others in battle. A creature that has a Bardic Inspiration die from you can roll that die and add the number rolled to a weapon damage roll it just made. Alternatively, when an attack roll is made against the creature, it can use its reaction to roll the Bardic Inspiration die and add the number rolled to its AC against that attack, after seeing the roll but before knowing whether it hits or misses." },
      ] },
      6: { features: [{ id: 'extraAttack', name: 'Ataque Extra', desc: "A partir do 6º nível, você pode atacar duas vezes, em vez de uma, sempre que realizar a ação de Ataque em seu turno.", descEn: "Starting at 6th level, you can attack twice, instead of once, whenever you take the Attack action on your turn." }] },
      14: { features: [{ id: 'battleMagic', name: 'Magia de Batalha', desc: "No 14º nível, você dominou a arte de entrelaçar a conjuração de magias e o uso de armas em um único ato harmonioso. Quando você usa sua Ação para conjurar uma magia de bardo, você pode realizar um ataque com arma como uma Ação Bônus.", descEn: "At 14th level, you have mastered the art of weaving spellcasting and weapon use into a single harmonious act. When you use your action to cast a bard spell, you can make one weapon attack as a bonus action." }] },
    },
  },
};

const SORCERER = {
  classId: 'sorcerer',
  perLevel: {
    1: { cantripsKnown: 4, spellsKnown: 2, spellsPrepared: { formula: 2 }, subclassChoice: true, features: [
      { id: 'spellcasting', name: 'Conjuração', desc: '4 truques + 2 magias 1°. CHA.' },
    ] },
    2: { features: [{ id: 'fontOfMagic', name: 'Fonte de Magia', desc: 'Sorcery Points = nível. Converta SP ↔ slots.' }] },
    3: { features: [{ id: 'metamagic', name: 'Metamagia', desc: '2 opções de Metamagia (+1 no 10 e no 17); só uma por magia, salvo Magia Empoderada.' }] },
    4: { asiOrFeat: true, cantripsKnown: 5 },
    5: {},
    6: { subclassFeatures: true },
    7: {},
    8: { asiOrFeat: true },
    9: {},
    10: { cantripsKnown: 6, features: [{ id: 'metamagic', name: 'Metamagia (+1)', desc: '+1 opção.' }] },
    11: {},
    12: { asiOrFeat: true },
    13: {},
    14: { subclassFeatures: true },
    15: {},
    16: { asiOrFeat: true },
    17: { features: [{ id: 'metamagic', name: 'Metamagia (+1)', desc: '+1 opção.' }] },
    18: { subclassFeatures: true },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'sorcerousRestoration', name: 'Restauração Feiticeira', desc: '4 SP em desc curto.' }] },
  },
  subclassPerLevel: {
    draconic: {
      1: { features: [
        { id: 'dragonAncestor', name: 'Ancestral Dracônico', desc: 'Escolha um tipo de dragão. Fala, lê e escreve Dracônico; proficiência dobrada em testes de CAR com dragões.' },
        { id: 'draconicResilience', name: 'Resiliência Dracônica', desc: "+1 PV/nível; CA sem armadura = 13+DEX." },
      ] },
      6: { features: [{ id: 'elementalAffinity', name: 'Afinidade Elemental', desc: '+CHA no dano do tipo escolhido; SP: resistência por 1h.' }] },
      14: { features: [{ id: 'dragonWings', name: 'Asas Dracônicas', desc: 'Asas: voo = deslocamento.' }] },
      18: { features: [{ id: 'draconicPresence', name: 'Presença Dracônica', desc: "5 SP: aura 18 m, salvaguarda SAB ou amedrontado/encantado por 1 min." }] },
    },
  },
};

const MONK = {
  classId: 'monk',
  perLevel: {
    1: { features: [
      { id: 'unarmoredDefense', name: 'Defesa sem Armadura', desc: 'CA = 10 + DEX + WIS.' },
      { id: 'martialArts', name: 'Artes Marciais', desc: 'Dado marcial 1d4 (cresce). DEX em ataques marciais.' },
    ] },
    2: { features: [
      { id: 'ki', name: 'Ki', desc: 'Pontos de ki = nível (descanso curto). Rajada de Golpes, Defesa Paciente, Passo do Vento.' },
      { id: 'unarmoredMovement', name: 'Movimento sem Armadura', desc: "Sem armadura e sem escudo: +3 m (+15 no 6, +20 no 10, +25 no 14, +30 no 18)." },
    ] },
    3: { subclassChoice: true, features: [{ id: 'deflectMissiles', name: 'Aparar Projéteis', desc: 'Reação: reduza dano à distância.' }] },
    4: { asiOrFeat: true, features: [{ id: 'slowFall', name: 'Queda Lenta', desc: 'Reação: -5×nível dano de queda.' }] },
    5: { extraAttacks: 1, features: [{ id: 'stunningStrike', name: 'Golpe Atordoante', desc: "Após acerto: 1 Ki → salvaguarda CON ou atordoado." }] },
    6: { features: [{ id: 'kiEmpoweredStrikes', name: 'Golpes Imbuídos de Ki', desc: 'Ataques desarmados contam como mágicos.' }] },
    7: { features: [{ id: 'evasion', name: 'Evasão', desc: "salvaguarda DEX passa → 0 dano." }, { id: 'stillnessOfMind', name: 'Quietude da Mente', desc: 'Ação: termine encanto ou medo em si.' }] },
    8: { asiOrFeat: true },
    9: { features: [{ id: 'unarmoredMovementImproved', name: 'Movimento Aprimorado', desc: 'Corra em paredes e líquidos.' }] },
    10: { features: [{ id: 'purityOfBody', name: 'Pureza do Corpo', desc: 'Imune a doenças e venenos.' }] },
    11: { subclassFeatures: true },
    12: { asiOrFeat: true },
    13: { features: [{ id: 'tongueOfSunAndMoon', name: 'Língua do Sol e Lua', desc: 'Entenda todas as línguas faladas.' }] },
    14: { features: [{ id: 'diamondSoul', name: 'Alma de Diamante', desc: "Prof em todos salvaguarda. Refaça salvaguarda falho por 1 Ki." }] },
    15: { features: [{ id: 'timelessBody', name: 'Corpo Atemporal', desc: 'Não envelhece; sem comida/água.' }] },
    16: { asiOrFeat: true },
    17: { subclassFeatures: true },
    18: { features: [{ id: 'emptyBody', name: 'Corpo Vazio', desc: '4 Ki: invisível 1 min. 8 Ki: Astral Projection.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'perfectSelf', name: 'Eu Perfeito', desc: 'Inicie combate com 4 Ki se estiver com 0.' }] },
  },
  subclassPerLevel: {
    openHand: {
      3: { features: [{ id: 'openHandTechnique', name: 'Técnica da Mão Aberta', desc: 'Flurry of Blows com opções: derrubar/empurrar/negar reações.' }] },
      6: { features: [{ id: 'wholenessOfBody', name: 'Inteireza do Corpo', desc: "Ação: cure 3×nível PV. 1×/desc longo." }] },
      11: { features: [{ id: 'tranquility', name: 'Tranquilidade', desc: 'Após desc longo: efeito Sanctuary até primeiro ataque.' }] },
      17: { features: [{ id: 'quiveringPalm', name: 'Palma Trêmula', desc: "Ao acertar desarmado, 3 ki: vibrações por dias = nível de monge. Ação para encerrá-las: salvaguarda CON; falha = 0 PV, sucesso = 10d10 necrótico." }] },
    },
  },
};

const WARLOCK = {
  classId: 'warlock',
  perLevel: {
    1: {
      cantripsKnown: 2,
      spellsKnown: 2,
      spellsPrepared: { formula: 2 },
      subclassChoice: true,
      features: [{ id: 'pactMagic', name: 'Magia do Pacto', desc: '2 truques + 2 magias 1°. Slots recarregam em desc curto.' }],
    },
    2: { features: [{ id: 'eldritchInvocations', name: 'Invocações Místicas', desc: '2 invocações iniciais.' }] },
    3: { features: [{ id: 'pactBoon', name: 'Dádiva do Pacto', desc: 'Pacto da Corrente, da Lâmina ou do Tomo.' }] },
    4: { asiOrFeat: true, cantripsKnown: 3 },
    5: {},
    6: { subclassFeatures: true },
    7: {},
    8: { asiOrFeat: true },
    9: {},
    10: { cantripsKnown: 4, subclassFeatures: true },
    11: { features: [{ id: 'mysticArcanum6', name: 'Arcano Místico (6°)', desc: '1 magia de 6° 1×/desc longo.' }] },
    12: { asiOrFeat: true },
    13: { features: [{ id: 'mysticArcanum7', name: 'Arcano Místico (7°)', desc: '1 magia de 7° 1×/desc longo.' }] },
    14: { subclassFeatures: true },
    15: { features: [{ id: 'mysticArcanum8', name: 'Arcano Místico (8°)', desc: '1 magia de 8° 1×/desc longo.' }] },
    16: { asiOrFeat: true },
    17: { features: [{ id: 'mysticArcanum9', name: 'Arcano Místico (9°)', desc: '1 magia de 9° 1×/desc longo.' }] },
    18: {},
    19: { asiOrFeat: true },
    20: { features: [{ id: 'eldritchMaster', name: 'Mestre Místico', desc: '1×/desc longo: 1 min de súplica recupera todos os espaços da Magia do Pacto.' }] },
  },
  subclassPerLevel: {
    fiend: {
      1: {
        expandedSpells: ['burningHands', 'commandSpell'],
        features: [{ id: 'darkOnesBlessing', name: 'Bênção do Tenebroso', desc: 'Ao reduzir criatura hostil a 0 PV: CAR + nível de bruxo PV temp. (mín. 1).' }],
      },
      3: { expandedSpells: ['blindnessDeafness', 'scorchingRay'] },
      5: { expandedSpells: ['fireball', 'stinkingCloud'] },
      6: { features: [{ id: 'darkOnesOwnLuck', name: 'Sorte do Tenebroso', desc: "+1d10 em teste de atributo ou salvaguarda, após ver o d20 e antes do resultado. 1×/desc curto." }] },
      7: { expandedSpells: ['fireShield', 'wallOfFire'] },
      9: { expandedSpells: ['flameStrike', 'hallow'] },
      10: { features: [{ id: 'fiendishResilience', name: 'Resiliência Demoníaca', desc: 'Escolha tipo de dano: resistência. Pode mudar em desc.' }] },
      14: { features: [{ id: 'hurlThroughHell', name: 'Arremessar pelo Inferno', desc: '1×/desc longo, ao acertar um ataque: o alvo some para os planos inferiores até o fim do seu próximo turno e, se não for corruptor, sofre 10d10 psíquico ao voltar (sem salvaguarda).' }] },
    },
    // Hexblade — patrono "espada"; o jogador escolhe Pacto da Lâmina como Pact Boon no nv 3
    // (decisão de Pact Boon ainda é manual — não é auto)
    hexblade: {
      1: {
        expandedSpells: ['shield', 'wrathfulSmite'],
        features: [
          { id: 'hexblade_curse', name: "Maldição da Lâmina", desc: "Ação bônus: amaldiçoe uma criatura em 9 m (CR≤PROF). +PROF dano contra ela, crit em 19-20, recuperação de PV ao matá-la." },
          { id: 'hexWarrior', name: 'Hex Warrior', desc: "No 1º nível, você adquire o treinamento necessário para se armar eficazmente para a batalha. Você ganha proficiência com armaduras médias, escudos e armas marciais.\n\nA influência do seu patrono também permite que você canalize misticamente sua vontade através de uma arma específica. Sempre que terminar um Descanso Longo, você pode tocar em uma arma com a qual seja proficiente e que não possua a propriedade de duas mãos. Quando você ataca com essa arma, pode usar seu modificador de Carisma, em vez de Força ou Destreza, para as jogadas de ataque e de dano. Este benefício dura até você terminar um Descanso Longo. Se mais tarde você adquirir a característica Pacto da Lâmina, este benefício se estende a todas as armas de pacto que você conjurar com essa característica, independentemente do tipo da arma.", descEn: "At 1st level, you acquire the training necessary to effectively arm yourself for battle. You gain proficiency with medium armor, shields, and martial weapons.\n\nThe influence of your patron also allows you to mystically channel your will through a particular weapon. Whenever you finish a long rest, you can touch one weapon that you are proficient with and that lacks the two-handed property. When you attack with that weapon, you can use your Charisma modifier, instead of Strength or Dexterity, for the attack and damage rolls. This benefit lasts until you finish a long rest. If you later gain the Pact of the Blade feature, this benefit extends to every pact weapon you conjure with that feature, no matter the weapon’s type." },
        ],
      },
      3: { expandedSpells: ['blur', 'brandingSmite'] },
      5: { expandedSpells: ['blink', 'elementalWeapon'] },
      6: { features: [{ id: 'accursedSpecter', name: 'Espectro Amaldiçoado', desc: "A partir do 6º nível, você pode amaldiçoar a alma de uma pessoa que abater, vinculando-a temporariamente ao seu serviço. Quando você abate um humanoide, pode fazer com que o Espírito dele se erga de seu cadáver como um espectro, cujas estatísticas estão no Manual dos Monstros. Quando o espectro surge, ele ganha Pontos de Vida Temporários iguais à metade do seu nível de bruxo. Role iniciativa para o espectro, que possui seus próprios turnos. Ele obedece aos seus comandos verbais e recebe um bônus especial em suas jogadas de ataque igual ao seu modificador de Carisma (mínimo de +0).\n\nO espectro permanece a seu serviço até o fim do seu próximo Descanso Longo, momento no qual ele desaparece para o pós-vida.\n\nDepois de vincular um espectro com esta característica, você não pode usar esta característica novamente até terminar um Descanso Longo.", descEn: "Starting at 6th level, you can curse the soul of a person you slay, temporarily binding it to your service. When you slay a humanoid, you can cause its Spirit to rise from its corpse as a specter, the statistics for which are in the Monster Manual. When the specter appears, it gains temporary hit points equal to half your warlock level. Roll initiative for the specter, which has its own turns. It obeys your verbal commands, and it gains a special bonus to its attack rolls equal to your Charisma modifier (minimum of +0).\n\nThe specter remains in your service until the end of your next long rest, at which point it vanishes to the afterlife.\n\nOnce you bind a specter with this feature, you can’t use the feature again until you finish a long rest." }] },
      7: { expandedSpells: ['phantasmalKiller', 'staggeringSmite'] },
      9: { expandedSpells: ['banishingSmite', 'coneOfCold'] },
      10: { features: [{ id: 'armorOfHexes', name: 'Armadura de Maldições', desc: "No 10º nível, sua maldição se torna mais poderosa. Se o alvo amaldiçoado pela sua Maldição da Lâmina Maldita acertar você com uma jogada de ataque, você pode usar sua reação para rolar um d6. Em um 4 ou superior, o ataque erra você, independentemente da rolagem dele.", descEn: "At 10th level, your hex grows more powerful. If the target cursed by your Hexblade’s Curse hits you with an attack roll, you can use your reaction to roll a d6. On a 4 or higher, the attack instead misses you, regardless of its roll." }] },
      14: { features: [{ id: 'masterOfHexes', name: 'Mestre das Maldições', desc: "A partir do 14º nível, você pode espalhar sua Maldição da Lâmina Maldita de uma criatura abatida para outra criatura. Quando a criatura amaldiçoada pela sua Maldição da Lâmina Maldita morrer, você pode aplicar a maldição a uma criatura diferente que possa ver a até 9 metros de você, desde que você não esteja incapacitado. Quando você aplica a maldição dessa forma, não recupera pontos de vida pela morte da criatura amaldiçoada anteriormente.", descEn: "Starting at 14th level, you can spread your Hexblade’s Curse from a slain creature to another creature. When the creature cursed by your Hexblade’s Curse dies, you can apply the curse to a different creature you can see within 30 feet of you, provided you aren’t incapacitated. When you apply the curse in this way, you don’t regain hit points from the death of the previously cursed creature." }] },
    },
  },
};

export const PROGRESSION_RULES = {
  artificer: ARTIFICER_RULES,
  druid: DRUID,
  fighter: FIGHTER,
  wizard: WIZARD,
  cleric: CLERIC,
  rogue: ROGUE,
  barbarian: BARBARIAN,
  paladin: PALADIN,
  ranger: RANGER,
  bard: BARD,
  sorcerer: SORCERER,
  monk: MONK,
  warlock: WARLOCK,
};

// Keep saved IDs compatible with both historical spellings. Catalog entries
// supply the level-gated descriptions for subclasses missing from the engine.
for (const [classId, subclasses] of Object.entries(SRD.SUBCLASSES)) {
  const rule = PROGRESSION_RULES[classId];
  for (const sub of subclasses) {
    const legacyId = Object.keys(rule.subclassPerLevel).find(id => id.toLowerCase() === sub.id.toLowerCase());
    const levels = rule.subclassPerLevel[sub.id] = rule.subclassPerLevel[legacyId] || {};
    if (sub.manualFeatures && !Object.keys(levels).length) levels.manual = true;
    for (const feature of sub.features || []) {
      const node = levels[feature.level] ||= {};
      // Existing engine text and feature IDs remain authoritative.
      if (node.features?.length) continue;
      node.features = (sub.features || []).filter(f => f.level === feature.level).map((f, i) => ({
        id: `${sub.id}_${feature.level}_${i}`, name: f.name.pt, desc: f.desc.pt,
        nameEn: f.name.en, descEn: f.desc.en,
      }));
    }
  }
}
// Fichas salvas usam as duas grafias: as duas chaves apontam para o mesmo objeto.
for (const [classId, a, b] of [['monk', 'openhand', 'openHand'], ['rogue', 'arcanetrickster', 'arcaneTrickster']]) {
  const subs = PROGRESSION_RULES[classId].subclassPerLevel;
  subs[a] = subs[b] = subs[a] || subs[b];
}

// SRD 5.1 (CC-BY-4.0): nome e texto oficiais em inglês, 1:1, para as features base
// e da subclasse SRD de cada classe. Subclasses pagas seguem só com o resumo próprio.
for (const [classId, table] of Object.entries(SRD51_FEATURES)) {
  const rule = PROGRESSION_RULES[classId];
  const apply = (levels, prefix) => {
    for (const node of Object.values(levels || {})) for (const f of node?.features || []) {
      const src = table[prefix + f.id];
      if (src) { f.nameEn = src.nameEn; f.descEn = src.descEn; f.srd51 = true; }
    }
  };
  apply(rule.perLevel, '');
  for (const [sub, levels] of Object.entries(rule.subclassPerLevel || {})) {
    const key = Object.keys(table).find(k => k.split(':')[0].toLowerCase() === sub.toLowerCase());
    if (key) apply(levels, key.split(':')[0] + ':');
  }
}

// Bruxo 2014 (PHB): Lista Expandida dos patronos do livro básico. Só amplia a lista
// de onde o bruxo escolhe as magias conhecidas — não concede nada de graça.
const WARLOCK_EXPANDED_2014 = {
  archfey: { 1: ['faerieFire', 'sleep'], 3: ['calmEmotions', 'phantasmalForce'], 5: ['blink', 'plantGrowth'], 7: ['dominateBeast', 'greaterInvisibility'], 9: ['dominatePerson', 'seeming'] },
  greatoldone: { 1: ['dissonantWhispers', 'hideousLaughter'], 3: ['detectThoughts', 'phantasmalForce'], 5: ['clairvoyance', 'sendingSpell'], 7: ['dominateBeast', 'blackTentacles'], 9: ['dominatePerson', 'telekinesis'] },
};
for (const [sub, table] of Object.entries(WARLOCK_EXPANDED_2014)) {
  const levels = PROGRESSION_RULES.warlock.subclassPerLevel[sub] ||= {};
  for (const [lv, ids] of Object.entries(table)) (levels[lv] ||= {}).expandedSpells = ids;
}

const KNOWN_SPELLS = {
  bard: [4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22],
  sorcerer: [2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15],
  warlock: [2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15],
  ranger: [0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11],
};
for (const [classId, counts] of Object.entries(KNOWN_SPELLS)) {
  counts.forEach((count, index) => {
    const node = PROGRESSION_RULES[classId].perLevel[index + 1] ||= {};
    node.spellsKnown = count;
    delete node.spellsPrepared;
  });
}
PROGRESSION_RULES.bard.subclassPerLevel.valor[6].extraAttacks = 1;

// One-third spellcasters: the subclass supplies its own cantrips and spells.
for (const [classId, subclass] of [['fighter', 'eldritchknight'], ['rogue', 'arcanetrickster']]) {
  const levels = PROGRESSION_RULES[classId].subclassPerLevel[subclass];
  const known = { 3: 3, 4: 4, 7: 5, 8: 6, 10: 7, 11: 8, 13: 9, 14: 10, 16: 11, 19: 12, 20: 13 };
  for (const [lv, count] of Object.entries(known)) (levels[lv] ||= {}).spellsKnown = count;
  (levels[3] ||= {}).cantripsKnown = classId === 'rogue' ? 3 : 2;
  (levels[10] ||= {}).cantripsKnown = classId === 'rogue' ? 4 : 3;
}


export const PROGRESSION_RULES_2024 = structuredClone(RULES_2024);
// Supplemental 2014 subclasses remain available via compatibility. Early
// features move to level 3; current SRD subclasses use the current text.
for (const [classId, legacy] of Object.entries(PROGRESSION_RULES)) {
  if (!PROGRESSION_RULES_2024[classId]) continue;
  const current = PROGRESSION_RULES_2024[classId];
  for (const [id, levels] of Object.entries(legacy.subclassPerLevel)) {
    if (current.subclassPerLevel[id]) continue;
    const converted = { legacyCompatibility: true, ...(levels.manual ? { manual: true } : {}) };
    for (const [lv, node] of Object.entries(levels)) {
      if (!/^\d+$/.test(lv)) continue;
      const target = Math.max(3, Number(lv));
      converted[target] = mergeNodes(converted[target], structuredClone(node));
    }
    current.subclassPerLevel[id] = converted;
  }
}

// Traços de nível 1/2 convertidos para o 3 somam-se aos do 3 (listas concatenadas).
function mergeNodes(a = {}, b = {}) {
  const out = { ...a, ...b };
  for (const k of ['features', 'autoSpells', 'autoCantrips', 'expandedSpells']) {
    if (a[k] && b[k]) out[k] = [...a[k], ...b[k]];
  }
  return out;
}

PROGRESSION_RULES_2024.artificer = structuredClone(ARTIFICER_RULES);
const artificer2025 = PROGRESSION_RULES_2024.artificer;
artificer2025.source = 'Eberron: Forge of the Artificer (2025)';
for (let lv = 1; lv <= 20; lv++) {
  const node = artificer2025.perLevel[lv];
  node.spellsPrepared = structuredClone(PROGRESSION_RULES_2024.paladin.perLevel[lv].spellsPrepared);
  node.spellSlots = [...PROGRESSION_RULES_2024.paladin.perLevel[lv].spellSlots];
  node.cantripsKnown = lv >= 14 ? 4 : lv >= 10 ? 3 : 2;
}
const artChanges = {
  1: ['tinkersMagic', 'Magia do Inventor', 'Conhece Consertar; cria equipamento temporário com ferramentas.'],
  2: ["replicateMagicItem", "Replicar Item Mágico", "Você aprendeu planos arcanos que usa para fabricar itens mágicos.\n\nPlanos Conhecidos. Ao ganhar este recurso, escolha quatro planos na tabela Planos de Itens Mágicos (Nível 2+ de Artífice): Mochila de Carga, Touca de Respirar na Água, Pedras de Mensagem e Varinha do Mago de Guerra são recomendados. Sempre que ganhar um nível de Artífice, você pode substituir um plano conhecido por outro elegível. Você aprende planos adicionais conforme sobe de nível (5 no 6º, 6 no 10º, 7 no 14º e 8 no 18º).\n\nCriando um Item. Ao terminar um Descanso Longo com Ferramentas de Funileiro em mãos, você pode criar dois itens mágicos diferentes com base nos planos que conhece (3 no 6º nível, 4 no 10º, 5 no 14º e 6 no 18º). Se um item criado exigir Sintonia, você pode sintonizar-se a ele no instante em que o cria. Se tentar exceder seu limite máximo de itens mágicos ativos, o item mais antigo desaparece antes de o novo aparecer.\n\nDuração. Um item mágico criado por este recurso funciona normalmente, exceto pelo fato de sua magia não ser permanente; quando você morre, o item mágico desaparece após 1d4 dias. Se você substituir um plano conhecido por um novo plano, qualquer item criado com o plano substituído desaparece imediatamente.", "Replicate Magic Item", "You have learned arcane plans that you use to make magic items.\n\nPlans Known. When you gain this feature, choose four plans to learn from the Magic Item Plans (Artificer Level 2+) table (see the Dungeon Master’s Guide for the items’ descriptions). Bag of Holding, Cap of Water Breathing, Sending Stones, and Wand of the War Mage are recommended. Whenever you gain an Artificer level, you can replace one of the plans you know with a new plan for which you qualify. You learn another plan of your choice when you reach certain Artificer levels, as shown in the Plans Known column of the Artificer Features table (5 at 6th, 6 at 10th, 7 at 14th, 8 at 18th).\n\nCreating an Item. When you finish a Long Rest, you can create one or two different magic items if you have Tinker’s Tools in hand, based on the plans you know (3 items at 6th level, 4 at 10th, 5 at 14th, 6 at 18th). If a created item requires Attunement, you can attune yourself to it the instant you create it. If you try to exceed your maximum number of magic items for this feature, the oldest item vanishes, and then the new item appears.\n\nDuration. A magic item created by this feature functions as the normal magic item, except its magic isn’t permanent; when you die, the magic item vanishes after 1d4 days. If you replace a plan you know with a new plan, any magic item created with the replaced plan immediately vanishes."],
  6: ["magicItemTinker", "Manipular Item Mágico", "Sua característica Replicar Item Mágico recebe as seguintes opções.", "Magic Item Tinker", "Your Replicate Magic Item feature gains the following options."],
  7: ["flashOfGenius", "Lampejo de Genialidade", "A partir do 7º nível, você adquire a habilidade de encontrar soluções sob pressão. Quando você ou outra criatura que você possa ver a até 9 metros de você realizar um teste de atributo ou uma salvaguarda, você pode usar sua reação para adicionar seu modificador de Inteligência à jogada.\n\nVocê pode usar esta característica um número de vezes igual ao seu modificador de Inteligência (mínimo de uma vez). Você recupera todos os usos gastos ao terminar um descanso longo.", "Flash of Genius", "Starting at 7th level, you gain the ability to come up with solutions under pressure. When you or another creature you can see within 9 m of you makes an ability check or a saving throw, you can use your reaction to add your Intelligence modifier to the roll.\n\nYou can use this feature a number of times equal to your Intelligence modifier (minimum of once). You regain all expended uses when you finish a long rest."],
  10: ["magicItemAdept", "Adepto de Itens Mágicos", "Característica de artífice de 10º nível\n\nVocê alcançou uma compreensão profunda sobre como usar e criar itens mágicos:\n\n• Você pode se sintonizar com até quatro itens mágicos simultaneamente.\n\n• Se você criar um item mágico de raridade comum ou incomum, levará um quarto do tempo normal e gastará metade do ouro habitual.", "Magic Item Adept", "10th-level artificer feature\n\nYou've achieved a profound understanding of how to use and make magic items:\n\n• You can attune to up to four magic items at once.\n\n• If you craft a magic item with a rarity of common or uncommon, it takes you a quarter of the normal time, and it costs you half as much of the usual gold."],
  11: ["spellStoringItem", "Item Armazenador de Magia", "Característica de artífice de 11º nível\n\nAgora você pode armazenar uma magia em um objeto. Sempre que terminar um descanso longo, você pode tocar uma arma simples ou marcial ou um item que possa usar como foco de conjuração e armazenar uma magia nele, escolhendo uma magia de 1º ou 2º círculo da lista de magias de artífice que exija 1 ação para ser conjurada (você não precisa tê-la preparado).\n\nEnquanto estiver segurando o objeto, uma criatura pode realizar uma ação para produzir o efeito da magia a partir dele, usando seu modificador de atributo de conjuração. Se a magia exigir concentração, a criatura deve se concentrar. A magia permanece no objeto até ser usada um número de vezes igual ao dobro do seu modificador de Inteligência (mínimo de duas vezes) ou até que você use esta característica novamente para armazenar uma magia em um objeto.", "Spell-Storing Item", "11th-level artificer feature\n\nYou can now store a spell in an object. Whenever you finish a long rest, you can touch one simple or martial weapon or one item that you can use as a spellcasting focus, and you store a spell in it, choosing a 1 st- or 2nd-level spell from the artificer spell list that requires 1 action to cast (you needn't have it prepared).\n\nWhile holding the object, a creature can take an action to produce the spell’s effect from it, using your spellcasting ability modifier. If the spell requires concentration, the creature must concentrate. The spell stays in the object until it’s been used a number of times equal to twice your Intelligence modifier (minimum of twice) or until you use this feature again to store a spell in an object."],
  14: ['advancedArtifice', 'Artifício Avançado', 'Cinco sintonias; descanso curto recupera um Lampejo.'],
  20: ["soulOfArtifice", "Alma do Artífice", "Característica de artífice de 20º nível\n\nVocê desenvolveu uma conexão mística com seus itens mágicos, à qual pode recorrer para obter proteção:\n\n• Você ganha um bônus de +1 em todos os testes de resistência para cada item mágico ao qual estiver sintonizado no momento.\n\n• Se for reduzido a 0 pontos de vida, mas não for morto instantaneamente, você pode usar sua reação para encerrar uma de suas infusões de artífice, fazendo com que fique com 1 ponto de vida em vez de 0.", "Soul of Artifice", "20th-level artificer feature\n\nYou have developed a mystical connection to your magic items, which you can draw on for protection:\n\n• You gain a +1 bonus to all saving throws per magic item you are currently attuned to.\n\n• If you’re reduced to 0 hit points but not killed outright, you can use your reaction to end one of your artificer infusions, causing you to drop to 1 hit point instead of 0."],
};
for (const [lv, [id,name,desc,nameEn,descEn]] of Object.entries(artChanges)) artificer2025.perLevel[lv].features = [{id,name,desc,...(nameEn?{nameEn}:{}),...(descEn?{descEn}:{})}];
delete artificer2025.perLevel[3].features;
artificer2025.perLevel[1].autoCantrips = ['mending'];
artificer2025.perLevel[19] = {epicBoon:true, spellsPrepared:{formula:15}, cantripsKnown:4, spellSlots:[4,3,3,3,2,0,0,0,0]};

const currentSubs = PROGRESSION_RULES_2024;
function bonusSpells(classId, subId, table) {
  for (const [level, spells] of Object.entries(table)) {
    (currentSubs[classId].subclassPerLevel[subId][level] ||= {}).autoSpells = spells;
  }
}
bonusSpells('cleric','life', {3:['aid','bless','cureWounds','lesserRestoration'],5:['massHealingWord','revivify'],7:['auraOfLife','deathWard'],9:['greaterRestoration','massCureWounds']});
bonusSpells('paladin','devotion', {3:['protectionFromEvilAndGood','shieldOfFaith'],5:['aid','zoneOfTruth'],9:['beaconOfHope','dispelMagic'],13:['freedomOfMovement','guardianOfFaith'],17:['commune','flameStrike']});
bonusSpells('warlock','fiend', {3:['burningHands','command','scorchingRay','suggestion'],5:['fireball','stinkingCloud'],7:['fireShield','wallOfFire'],9:['geas','insectPlague']});
bonusSpells('sorcerer','draconic', {3:['alterSelf','chromaticOrb','command','dragonsBreath'],5:['fear','fly'],7:['arcaneEye','charmMonster'],9:['legendLore','summonDragon']});
currentSubs.ranger.perLevel[1].autoSpells = ['huntersMark'];
currentSubs.paladin.perLevel[2].autoSpells = ['divineSmite'];
currentSubs.bard.perLevel[20].autoSpells = ['powerWordHeal','powerWordKill'];
currentSubs.fighter.subclassPerLevel.champion[7].fightingStyleChoice = 1;
(currentSubs.paladin.perLevel[5] ||= {}).autoSpells = ['findSteed'];

// Dados por classe em data/class-options/ (formato no README de lá): textos
// revisados dos traços 2024 e subclasses 2024 (novas ou reeditadas), que
// substituem a conversão da versão 2014.
const toNodeFeature = f => ({ id: f.id, name: f.name.pt, desc: f.desc.pt, nameEn: f.name.en, descEn: f.desc.en });
for (const [classId, data] of Object.entries(CLASS_OPTIONS)) {
  const current = PROGRESSION_RULES_2024[classId];
  if (!current) continue;
  for (const [lv, features] of Object.entries(data.features || {})) {
    (current.perLevel[lv] ||= {}).features = features.map(toNodeFeature);
  }
  // Magias e proficiências fixas da classe base por nível (somam-se ao que já existe).
  for (const [lv, extra] of Object.entries(data.classLevels || {})) {
    const node = current.perLevel[lv] ||= {};
    for (const k of ['autoSpells', 'autoCantrips']) if (extra[k]) node[k] = [...new Set([...(node[k] || []), ...extra[k]])];
    if (extra.grants) node.grants = extra.grants;
  }
  for (const [id, sub] of Object.entries(data.subclasses || {})) {
    const levels = { source: sub.source };
    // Chaves especiais da subclasse (Círculo da Terra) seguem como estão.
    for (const k of ['landTypeSpells', 'landTypes']) if (sub[k]) levels[k] = sub[k];
    for (const [lv, node] of Object.entries(sub.levels || {})) {
      levels[lv] = { ...node, ...(node.features ? { features: node.features.map(toNodeFeature) } : {}) };
    }
    current.subclassPerLevel[id] = levels;
  }
}
// Grafias antigas que apontam para a mesma subclasse.
currentSubs.monk.subclassPerLevel.openHand = currentSubs.monk.subclassPerLevel.openhand;
currentSubs.rogue.subclassPerLevel.arcaneTrickster = currentSubs.rogue.subclassPerLevel.arcanetrickster;

export function rulesFor(character) {
  return (character.rulesVersion === '2024' ? PROGRESSION_RULES_2024 : PROGRESSION_RULES)[character.className];
}


// Tabela canônica do bônus de proficiência por nível.
export function profBonus(level) {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}
