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
        { id: 'combatWildShape', name: 'Forma Selvagem de Combate', desc: 'Forma Selvagem como ação bônus. Em forma, ação bônus + espaço de magia: cure 1d8 por nível do espaço.' },
        { id: 'circleForms', name: 'Formas do Círculo', desc: 'ND máximo da Forma Selvagem = 1; a partir do nível 6, nível de druida ÷ 3 (arred. para baixo).' },
      ] },
      6: { features: [{ id: 'moonPrimalStrike', name: 'Golpe Primal', desc: 'Ataques em forma de fera contam como mágicos para superar resistência e imunidade.' }] },
      10: { features: [{ id: 'elementalWildShape', name: 'Forma Selvagem Elemental', desc: 'Gaste 2 usos de Forma Selvagem para virar elemental do ar, da terra, do fogo ou da água.' }] },
      14: { features: [{ id: 'thousandForms', name: 'Mil Formas', desc: 'Conjure Alterar-se (Alter Self) à vontade.' }] },
    },
    land: {
      // Círculo da Terra: spells de domínio são SEMPRE preparados.
      // Depende do landType escolhido (forest, mountain, arctic, etc.).
      // O engine consulta landTypeSpells abaixo e expande conforme char.landType.
      2: { features: [
        { id: 'bonusCantrip', name: 'Truque Bônus', desc: '+1 truque de druida à sua escolha.' },
        { id: 'naturalRecovery', name: 'Recuperação Natural', desc: '1×/descanso longo, em descanso curto: recupere espaços somando até metade do nível de druida (arred. para cima), nenhum de 6º+.' },
      ] },
      3: { features: [{ id: 'circleSpells', name: 'Magias de Círculo', desc: 'Terreno escolhido no nível 2: 2 magias sempre preparadas nos níveis 3, 5, 7 e 9.' }] },
      6: { features: [{ id: 'landsStride', name: "Passos da Terra", desc: 'Terreno difícil não mágico não custa movimento extra; vantagem em salvaguardas contra plantas mágicas que impedem movimento.' }] },
      10: { features: [{ id: 'naturesWard', name: 'Proteção da Natureza', desc: 'Não pode ser enfeitiçado nem amedrontado por elementais ou feéricos; imune a veneno e doença.' }] },
      14: { features: [{ id: 'naturesSanctuary', name: 'Santuário da Natureza', desc: 'Fera ou planta que o ataque faz SAL SAB ou escolhe outro alvo.' }] },
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
          { id: 'starMap', name: 'Mapa Estelar', desc: 'Foco de druida. Conhece Orientação e tem Flecha Guiada sempre preparado; conjure Flecha Guiada sem espaço PB vezes por descanso longo.' },
          { id: 'starryForm', name: 'Forma Estelar', desc: 'Ação bônus + 1 uso de Forma Selvagem: forma luminosa por 10 min (Arqueiro, Cálice ou Dragão).' },
        ],
      },
      6: { features: [{ id: 'cosmicOmen', name: 'Presságio Cósmico', desc: 'Após descanso longo, role um dado: par = Bonança (+1d6), ímpar = Infortúnio (−1d6) como reação a 30 pés. PB usos por descanso longo.' }] },
      10: { features: [{ id: 'twinklingConstellations', name: 'Constelações Cintilantes', desc: 'Arqueiro e Cálice passam a 2d8; Dragão ganha voo de 20 pés (pairar); troque de constelação no início de cada turno.' }] },
      14: { features: [{ id: 'fullOfStars', name: 'Cheio de Estrelas', desc: 'Em Forma Estelar: resistência a dano contundente, perfurante e cortante.' }] },
    },
    spores: {
      2: { autoCantrips: ['chillTouch'], features: [
        { id: 'haloOfSpores', name: 'Halo de Esporos', desc: 'Reação: criatura que entra ou começa o turno a 10 pés faz SAL CON ou sofre 1d4 necrótico (1d6 no 6, 1d8 no 10, 1d10 no 14).' },
        { id: 'symbioticEntity', name: 'Entidade Simbiótica', desc: 'Ação + 1 uso de Forma Selvagem: 4 PV temp. por nível de druida, Halo em dobro e +1d6 necrótico em ataques corpo a corpo com arma, por 10 min.' },
      ] },
      3: { autoSpells: ['blindnessDeafness', 'gentleRepose'] },
      5: { autoSpells: ['animateDead', 'gaseousForm'] },
      6: { features: [{ id: 'fungalInfestation', name: 'Infestação Fúngica', desc: 'Reação: fera ou humanoide Pequeno/Médio que morre a 10 pés se ergue como zumbi com 1 PV por 1 h. SAB usos (mín. 1) por descanso longo.' }] },
      7: { autoSpells: ['blight', 'confusion'] },
      9: { autoSpells: ['cloudkill', 'contagion'] },
      10: { features: [{ id: 'spreadingSpores', name: 'Esporos Disseminados', desc: 'Com a Entidade ativa, ação bônus: cubo de 10 pés a até 30 pés por 1 min que aplica o Halo; enquanto isso, você não usa o Halo em si.' }] },
      14: { features: [{ id: 'fungalBody', name: 'Corpo Fúngico', desc: 'Não pode ficar cego, surdo, amedrontado nem envenenado; críticos contra você viram acertos normais, salvo se incapacitado.' }] },
    },
    wildfire: {
      2: { autoSpells: ['burningHands', 'cureWounds'], features: [{ id: 'wildfireSpirit', name: 'Invocar Espírito do Fogo Selvagem', desc: 'Ação + 1 uso de Forma Selvagem: espírito a 30 pés por 1 h (CA 13, PV 5 + 5×nível de druida, voo 30); na chegada, 2d6 fogo (SAL DES) a 10 pés.' }] },
      3: { autoSpells: ['flamingSphere', 'scorchingRay'] },
      5: { autoSpells: ['plantGrowth', 'revivify'] },
      6: { features: [{ id: 'enhancedBond', name: 'Vínculo Aprimorado', desc: 'Com o espírito presente: +1d8 em uma rolagem de dano de fogo ou de cura da magia; suas magias podem partir do espírito.' }] },
      7: { autoSpells: ['auraOfLife', 'fireShield'] },
      9: { autoSpells: ['flameStrike', 'massCureWounds'] },
      10: { features: [{ id: 'cauterizingFlames', name: 'Chamas Cauterizantes', desc: 'Criatura Pequena+ que morre a 30 pés deixa chama por 1 min; reação quando alguém entra nela: cura ou causa 2d10 + SAB de fogo. PB usos por descanso longo.' }] },
      14: { features: [{ id: 'blazingRevival', name: 'Renascimento Ardente', desc: '1×/desc longo: ao cair a 0 PV com o espírito a 120 pés, ele cai a 0 e você recupera metade dos PV e se levanta.' }] },
    },
    dreams: {
      2: { features: [{ id: 'balmOfSummer', name: 'Bálsamo da Corte de Verão', desc: 'Reserva de d6 = nível de druida (descanso longo). Ação bônus: gaste até metade do nível em dados numa criatura a 120 pés; ela cura o total e ganha 1 PV temp. por dado.' }] },
      6: { features: [{ id: 'hearthOfMoonlight', name: 'Lar de Luar e Sombra', desc: 'No início de um descanso curto ou longo: esfera de 30 pés com +5 em Furtividade e Percepção, escondendo a luz interna.' }] },
      10: { features: [{ id: 'hiddenPaths', name: 'Caminhos Ocultos', desc: 'Ação bônus: teleporte de 60 pés; ou Ação: teleporte criatura voluntária tocada 30 pés. SAB usos (mín. 1) por descanso longo.' }] },
      14: { features: [{ id: 'walkerInDreams', name: 'Andarilho dos Sonhos', desc: '1×/desc longo, ao terminar descanso curto: Sonho, Vidência ou Círculo de Teletransporte (para o último descanso longo) sem espaço nem material.' }] },
    },
  },
};

// === Guerreiro ===
const FIGHTER = {
  classId: 'fighter',
  perLevel: {
    1: { fightingStyleChoice: 1, features: [
      { id: 'secondWind', name: 'Segundo Fôlego', desc: 'Ação bônus: 1d10+nível HP. 1×/descanso curto.' },
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
      3: { features: [{ id: 'improvedCritical', name: 'Crítico Aprimorado', desc: 'Crítico em 19-20.' }] },
      7: { features: [{ id: 'remarkableAthlete', name: 'Atleta Notável', desc: '+metade prof em STR/DEX/CON sem prof.' }] },
      10: { fightingStyleChoice: 1 },
      15: { features: [{ id: 'superiorCritical', name: 'Crítico Superior', desc: 'Crítico em 18-20.' }] },
      18: { features: [{ id: 'survivor', name: 'Sobrevivente', desc: 'Recupere 5+CON HP/turno se ≤ ½ máximo.' }] },
    },
    battlemaster: {
      3: { features: [
        { id: 'combatSuperiority', name: 'Superioridade de Combate', desc: '4 dados d8 (recuperam em descanso curto) + 3 manobras (+2 no 7, 10 e 15).' },
        { id: 'studentOfWar', name: 'Estudante da Guerra', desc: 'Proficiência com um tipo de ferramenta de artesão.' },
      ] },
      7: { features: [
        { id: 'knowYourEnemy', name: 'Conheça Seu Inimigo', desc: 'Após 1 min observando: saiba se a criatura é igual, superior ou inferior em 2 características.' },
        { id: 'superiorityDice5', name: 'Superioridade (5 dados)', desc: '5 dados de superioridade; +2 manobras.' },
      ] },
      10: { features: [{ id: 'improvedSuperiority10', name: 'Superioridade Aprimorada (d10)', desc: 'Dados de superioridade viram d10; +2 manobras.' }] },
      15: { features: [
        { id: 'relentless', name: 'Implacável', desc: 'Ao rolar iniciativa sem dados de superioridade, recupere 1.' },
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
        { id: 'sculptSpells', name: 'Esculpir Magias', desc: 'Evocação em área: 1 + nível da magia criaturas escolhidas passam automaticamente na SAL e sofrem 0 de dano em vez de metade.' },
      ] },
      6: { features: [{ id: 'potentCantrip', name: 'Truque Potente', desc: 'Metade do dano mesmo se SAL passar.' }] },
      10: { features: [{ id: 'empoweredEvocation', name: 'Evocação Aprimorada', desc: '+INT em uma rolagem de dano de magia de evocação de mago.' }] },
      14: { features: [{ id: 'overchannel', name: 'Sobrecarga', desc: 'Maximize o dano de magia de 1º a 5º. Usos extras antes do descanso longo: 2d12 necrótico por nível da magia, +1d12 por nível a cada uso seguinte.' }] },
    },
    divination: {
      2: { features: [
        { id: 'divinationSavant', name: 'Sábio de Adivinhação', desc: 'Metade do ouro e do tempo para copiar adivinhação.' },
        { id: 'portent', name: 'Presságio', desc: 'Após descanso longo, role 2d20; substitua um ataque, teste ou SAL visível por um deles, antes da rolagem.' },
      ] },
      6: { features: [{ id: 'expertDivination', name: 'Adivinhação Especialista', desc: 'Lance adivinhação 2°+: recupere slot menor.' }] },
      10: { features: [{ id: 'theThirdEye', name: 'O Terceiro Olho', desc: 'Ação: visão no escuro 60 pés, ver o Etéreo 60 pés, ler qualquer idioma ou ver invisível 10 pés, até ficar incapacitado ou descansar. 1×/descanso curto.' }] },
      14: { features: [{ id: 'greaterPortent', name: 'Maior Presságio', desc: '3 dados de Presságio.' }] },
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
          { id: 'discipleOfLife', name: 'Discípulo da Vida', desc: 'Magias de cura: +2+nível HP.' },
          { id: 'heavyArmorProficiency', name: 'Proficiência com Armadura Pesada', desc: 'Você ganha proficiência com armaduras pesadas.' },
        ],
      },
      2: { features: [{ id: 'preserveLife', name: 'Preservar a Vida', desc: 'CD: cure 5×nível HP em 30 pés.' }] },
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
        features: [{ id: 'wardingFlare', name: 'Chama de Proteção', desc: 'Reação: desvantagem em atacante.' }],
      },
      2: { features: [{ id: 'radianceOfDawn', name: 'Radiância do Amanhecer', desc: 'Canalizar Divindade: dissipa escuridão mágica; SAL CON ou 2d10+nível radiante em 30 pés.' }] },
      3: { autoSpells: ['flamingSphere', 'scorchingRay'] },
      5: { autoSpells: ['daylight', 'fireball'] },
      6: { features: [{ id: 'improvedFlare', name: 'Chama Aprimorada', desc: 'Chama de Proteção protege aliados.' }] },
      7: { autoSpells: ['guardianOfFaith', 'wallOfFire'] },
      8: { features: [{ id: 'potentSpellcasting', name: 'Conjuração Potente', desc: '+SAB no dano de truques.' }] },
      9: { autoSpells: ['flameStrike', 'scrying'] },
      17: { features: [{ id: 'coronaOfLight', name: 'Corona de Luz', desc: 'Ação, 1 min: luz plena 60 pés e penumbra +30 pés; inimigos na luz plena têm desvantagem em SAL contra magias de fogo/radiante.' }] },
    },
    knowledge: {
      1: {
        autoSpells: ['commandSpell', 'identifySpell'],
        features: [{ id: 'blessingsOfKnowledge', name: 'Bênçãos do Conhecimento', desc: '+2 idiomas e proficiência em 2 entre Arcanismo, História, Natureza e Religião, com bônus de proficiência dobrado.' }],
      },
      2: { features: [{ id: 'knowledgeOfAges', name: 'Conhecimento das Eras', desc: 'CD: proficiência em qualquer perícia/ferramenta por 10 min.' }] },
      3: { autoSpells: ['augury', 'suggestion'] },
      5: { autoSpells: ['nondetection', 'speakWithDead'] },
      6: { features: [{ id: 'readThoughts', name: 'Ler Pensamentos', desc: 'CD: leia mente de criatura.' }] },
      7: { autoSpells: ['arcaneEye', 'confusion'] },
      8: { features: [{ id: 'potentSpellcasting', name: 'Conjuração Potente', desc: '+SAB no dano de truques.' }] },
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
    7: { features: [{ id: 'evasion', name: 'Evasão', desc: 'SAL DEST passar → 0 dano (metade se falhar).' }] },
    8: { asiOrFeat: true },
    9: { subclassFeatures: true },
    10: { asiOrFeat: true },
    11: { features: [{ id: 'reliableTalent', name: 'Talento Confiável', desc: 'Rolagens proficientes ≤9 viram 10.' }] },
    12: { asiOrFeat: true },
    13: { subclassFeatures: true },
    14: { features: [{ id: 'blindsense', name: 'Sentido Cego', desc: 'Se puder ouvir, sabe a posição de criaturas escondidas ou invisíveis a 10 pés.' }] },
    15: { features: [{ id: 'slipperyMind', name: 'Mente Esquiva', desc: 'Proficiência em SAL SAB.' }] },
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
        { id: 'secondStoryWork', name: 'Trabalho de Segundo Andar', desc: 'Escalar não custa extra; salto com corrida +DEX pés.' },
      ] },
      9: { features: [{ id: 'supremeSneak', name: 'Furtividade Suprema', desc: 'Vantagem em Furtividade se mover ≤ metade.' }] },
      13: { features: [{ id: 'useMagicDevice', name: 'Usar Item Mágico', desc: 'Ignore requisitos de classe/raça/nível para itens.' }] },
      17: { features: [{ id: 'thiefsReflexes', name: 'Reflexos de Ladrão', desc: 'Na 1ª rodada de combate, 2 turnos: o normal e outro na iniciativa −10. Não funciona se surpreendido.' }] },
    },
    assassin: {
      3: { features: [
        { id: 'bonusProficiencies', name: 'Proficiências Bônus', desc: 'Kit de disfarce e venenos.' },
        { id: 'assassinate', name: 'Assassinar', desc: 'Vantagem em alvos não agiram; crítico em surpresos.' },
      ] },
      9: { features: [{ id: 'infiltrationExpertise', name: 'Perícia em Infiltração', desc: 'Crie identidade falsa (25 po, 7 dias).' }] },
      13: { features: [{ id: 'impostor', name: 'Impostor', desc: 'Imitação perfeita após 3h de observação.' }] },
      17: { features: [{ id: 'deathStrike', name: 'Golpe da Morte', desc: 'Surpresa + acerto: SAL CON ou dobre o dano.' }] },
    },
    arcaneTrickster: {
      3: { cantripsKnown: 3, spellsKnown: 3, features: [
        { id: 'spellcasting', name: 'Conjuração', desc: '3 truques + 3 magias (Mage Hand obrigatório).' },
        { id: 'mageHandLegerdemain', name: 'Mão Mágica Hábil', desc: 'Mão Mágica invisível; truques manuais à distância.' },
      ] },
      9: { features: [{ id: 'magicalAmbush', name: 'Emboscada Mágica', desc: 'Magias têm desvantagem em SAL se você invisível.' }] },
      13: { features: [{ id: 'versatileTrickster', name: 'Trapaceiro Versátil', desc: 'Mão Mágica dá vantagem em ataque.' }] },
      17: { features: [{ id: 'spellThief', name: 'Ladrão de Magias', desc: 'Reação: roube magia de criatura conjuradora.' }] },
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
      { id: 'dangerSense', name: 'Sentido de Perigo', desc: 'Vantagem em SAL DES contra efeitos que você vê; não funciona cego, surdo ou incapacitado.' },
    ] },
    3: { subclassChoice: true },
    4: { asiOrFeat: true },
    5: { extraAttacks: 1, features: [{ id: 'fastMovement', name: 'Movimento Rápido', desc: '+10 pés deslocamento sem armadura pesada.' }] },
    6: { subclassFeatures: true },
    7: { features: [{ id: 'feralInstinct', name: 'Instinto Feral', desc: 'Vantagem em iniciativa; se surpreendido, pode agir no 1º turno se entrar em Fúria.' }] },
    8: { asiOrFeat: true },
    9: { features: [{ id: 'brutalCritical', name: 'Crítico Brutal', desc: '+1 dado de dano da arma em críticos corpo a corpo (2 no 13, 3 no 17).' }] },
    10: { subclassFeatures: true },
    11: { features: [{ id: 'relentlessRage', name: 'Fúria Implacável', desc: 'Em Fúria, ao cair a 0 PV: SAL CON CD 10 (+5 por uso, volta a 10 no descanso) para ficar com 1 PV.' }] },
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
      10: { features: [{ id: 'intimidatingPresence', name: 'Presença Intimidadora', desc: 'Ação: criatura a 30 pés faz SAL SAB (CD 8+PB+CAR) ou fica amedrontada até o fim do seu próximo turno; ação para estender.' }] },
      14: { features: [{ id: 'retaliation', name: 'Retaliação', desc: 'Reação: ataque ao sofrer dano em 5 pés.' }] },
    },
  },
};

// === Paladino ===
const PALADIN = {
  classId: 'paladin',
  perLevel: {
    1: { features: [
      { id: 'divineSense', name: 'Sentido Divino', desc: 'Ação: detecte celestiais, corruptores e mortos-vivos a 60 pés. 1 + CAR usos por descanso longo.' },
      { id: 'layOnHands', name: 'Imposição de Mãos', desc: 'Pool 5×nível HP. Cure veneno/doença por 5 HP.' },
    ] },
    2: { fightingStyleChoice: 1, spellsPrepared: { formula: 'cha+halfLevel' }, features: [
      { id: 'spellcasting', name: 'Conjuração', desc: 'Prepare CHA + ½ nível magias.' },
      { id: 'divineSmite', name: 'Golpe Divino', desc: 'Após acerto corpo a corpo: gaste slot para +2d8 radiante (1° nível, +1d8 por nível adicional, máx. 5d8; +1d8 contra corruptor ou morto-vivo).' },
    ] },
    3: { subclassChoice: true, features: [{ id: 'divineHealth', name: 'Saúde Divina', desc: 'Imune a doenças.' }] },
    4: { asiOrFeat: true },
    5: { extraAttacks: 1 },
    6: { features: [{ id: 'auraOfProtection', name: 'Aura de Proteção', desc: 'Aliados em 10 pés +CHA em SAL.' }] },
    7: { subclassFeatures: true },
    8: { asiOrFeat: true },
    9: {},
    10: { features: [{ id: 'auraOfCourage', name: 'Aura da Coragem', desc: 'Aliados em 10 pés imunes a medo.' }] },
    11: { features: [{ id: 'improvedDivineSmite', name: 'Golpe Divino Aprimorado', desc: '+1d8 radiante em todo acerto com arma corpo a corpo.' }] },
    12: { asiOrFeat: true },
    13: {},
    14: { features: [{ id: 'cleansingTouch', name: 'Toque Purificador', desc: 'Termine magia: CHA usos/desc longo.' }] },
    15: { subclassFeatures: true },
    16: { asiOrFeat: true },
    17: {},
    18: { features: [{ id: 'auraImprovements', name: 'Auras de 30 pés', desc: 'Auras crescem para 30 pés.' }] },
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
          { id: 'sacredWeapon', name: 'Arma Sagrada', desc: 'CD, 1 min: arma +CAR (mín. +1) nas jogadas de ataque, conta como mágica, luz 20 pés.' },
          { id: 'turnUnholy', name: 'Expulsar os Profanos', desc: 'CD: corruptores e mortos-vivos a 30 pés fazem SAL SAB ou ficam expulsos por 1 min.' },
        ],
      },
      5: { autoSpells: ['lesserRestoration', 'zoneOfTruth'] },
      7: {
        features: [{ id: 'auraOfDevotion', name: 'Aura da Devoção', desc: 'Você e aliados a 10 pés (30 no 18) não podem ser enfeitiçados enquanto você estiver consciente.' }],
      },
      9: { autoSpells: ['beaconOfHope', 'dispelMagic'] },
      13: { autoSpells: ['freedomOfMovement', 'guardianOfFaith'] },
      15: { features: [{ id: 'purityOfSpirit', name: 'Pureza de Espírito', desc: 'Protection from Evil and Good sempre ativa.' }] },
      17: { autoSpells: ['commune', 'flameStrike'] },
      20: { features: [{ id: 'holyNimbus', name: 'Nimbo Sagrado', desc: '1×/desc longo, ação, 1 min: luz solar 30 pés; inimigo que começa o turno nela sofre 10 radiante; vantagem em SAL contra magias de corruptores e mortos-vivos.' }] },
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
    18: { features: [{ id: 'feralSenses', name: 'Sentidos Selvagens', desc: 'Sem desvantagem ao atacar criatura que não vê; percebe criaturas invisíveis a 30 pés se não estiver cego nem surdo.' }] },
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
    6: { subclassFeatures: true, features: [{ id: 'countercharm', name: 'Contraencanto', desc: 'Ação: até o fim do seu próximo turno, você e aliados a 30 pés que ouçam têm vantagem em SAL contra amedrontado e enfeitiçado.' }] },
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
        { id: 'bonusProficiencies', name: 'Proficiências Bônus', desc: '3 perícias.' },
        { id: 'cuttingWords', name: 'Palavras Cortantes', desc: 'Reação: gaste 1 Inspiração e subtraia o dado de Inspiração do ataque, teste de atributo ou dano de criatura a 60 pés.' },
      ] },
      6: { features: [{ id: 'additionalMagicalSecrets', name: 'Segredos Mágicos Adicionais', desc: '+2 magias de qualquer classe (contam como de bardo, fora do total de conhecidas).' }] },
      14: { features: [{ id: 'peerlessSkill', name: 'Perícia Inigualável', desc: 'Em um teste de atributo seu, gaste 1 Inspiração e some o dado.' }] },
    },
    valor: {
      3: { features: [
        { id: 'combatProficiencies', name: 'Proficiências de Combate', desc: 'Armadura média, escudos, armas marciais.' },
        { id: 'combatInspiration', name: 'Inspiração de Combate', desc: 'Aliados podem usar Inspiração em dano/CA.' },
      ] },
      6: { features: [{ id: 'extraAttack', name: 'Ataque Extra', desc: 'Ataque duas vezes.' }] },
      14: { features: [{ id: 'battleMagic', name: 'Magia de Batalha', desc: 'Após magia: ataque bônus.' }] },
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
        { id: 'draconicResilience', name: 'Resiliência Dracônica', desc: '+1 HP/nível; CA sem armadura = 13+DEX.' },
      ] },
      6: { features: [{ id: 'elementalAffinity', name: 'Afinidade Elemental', desc: '+CHA no dano do tipo escolhido; SP: resistência por 1h.' }] },
      14: { features: [{ id: 'dragonWings', name: 'Asas Dracônicas', desc: 'Asas: voo = deslocamento.' }] },
      18: { features: [{ id: 'draconicPresence', name: 'Presença Dracônica', desc: '5 SP: aura 60 pés, SAL SAB ou amedrontado/encantado por 1 min.' }] },
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
      { id: 'unarmoredMovement', name: 'Movimento sem Armadura', desc: '+10 pés sem armadura.' },
    ] },
    3: { subclassChoice: true, features: [{ id: 'deflectMissiles', name: 'Aparar Projéteis', desc: 'Reação: reduza dano à distância.' }] },
    4: { asiOrFeat: true, features: [{ id: 'slowFall', name: 'Queda Lenta', desc: 'Reação: -5×nível dano de queda.' }] },
    5: { extraAttacks: 1, features: [{ id: 'stunningStrike', name: 'Golpe Atordoante', desc: 'Após acerto: 1 Ki → SAL CON ou atordoado.' }] },
    6: { features: [{ id: 'kiEmpoweredStrikes', name: 'Golpes Imbuídos de Ki', desc: 'Ataques desarmados contam como mágicos.' }] },
    7: { features: [{ id: 'evasion', name: 'Evasão', desc: 'SAL DEX passa → 0 dano.' }, { id: 'stillnessOfMind', name: 'Quietude da Mente', desc: 'Ação: termine encanto ou medo em si.' }] },
    8: { asiOrFeat: true },
    9: { features: [{ id: 'unarmoredMovementImproved', name: 'Movimento Aprimorado', desc: 'Corra em paredes e líquidos.' }] },
    10: { features: [{ id: 'purityOfBody', name: 'Pureza do Corpo', desc: 'Imune a doenças e venenos.' }] },
    11: { subclassFeatures: true },
    12: { asiOrFeat: true },
    13: { features: [{ id: 'tongueOfSunAndMoon', name: 'Língua do Sol e Lua', desc: 'Entenda todas as línguas faladas.' }] },
    14: { features: [{ id: 'diamondSoul', name: 'Alma de Diamante', desc: 'Prof em todos SAL. Refaça SAL falho por 1 Ki.' }] },
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
      6: { features: [{ id: 'wholenessOfBody', name: 'Inteireza do Corpo', desc: 'Ação: cure 3×nível HP. 1×/desc longo.' }] },
      11: { features: [{ id: 'tranquility', name: 'Tranquilidade', desc: 'Após desc longo: efeito Sanctuary até primeiro ataque.' }] },
      17: { features: [{ id: 'quiveringPalm', name: 'Palma Trêmula', desc: 'Ao acertar desarmado, 3 ki: vibrações por dias = nível de monge. Ação para encerrá-las: SAL CON; falha = 0 PV, sucesso = 10d10 necrótico.' }] },
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
      6: { features: [{ id: 'darkOnesOwnLuck', name: 'Sorte do Tenebroso', desc: '+1d10 em teste de atributo ou SAL, após ver o d20 e antes do resultado. 1×/desc curto.' }] },
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
          { id: 'hexblade_curse', name: "Maldição da Lâmina", desc: 'Ação bônus: amaldiçoe uma criatura em 30 pés (CR≤PROF). +PROF dano contra ela, crit em 19-20, recuperação de HP ao matá-la.' },
          { id: 'hexWarrior', name: 'Hex Warrior', desc: 'Use CHA em vez de FOR/DEX em uma arma de sua escolha após desc longo. Proficiência com armaduras médias, escudos e armas marciais.' },
        ],
      },
      3: { expandedSpells: ['blur', 'brandingSmite'] },
      5: { expandedSpells: ['blink', 'elementalWeapon'] },
      6: { features: [{ id: 'accursedSpecter', name: 'Espectro Amaldiçoado', desc: 'Ao matar humanoide: erga como espectro até desc longo. 1×/desc longo.' }] },
      7: { expandedSpells: ['phantasmalKiller', 'staggeringSmite'] },
      9: { expandedSpells: ['banishingSmite', 'coneOfCold'] },
      10: { features: [{ id: 'armorOfHexes', name: 'Armadura de Maldições', desc: 'Alvo da maldição que te acerta: 50% chance do ataque errar.' }] },
      14: { features: [{ id: 'masterOfHexes', name: 'Mestre das Maldições', desc: 'Ao matar alvo da maldição: transfira para nova criatura sem gastar uso.' }] },
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
  2: ['replicateMagicItem', 'Replicar Item Mágico', 'Aprenda planos e crie itens após descanso longo.'],
  6: ['magicItemTinker', 'Manipular Item Mágico', 'Recarregue, drene ou transmute itens replicados.'],
  7: ['flashOfGenius', 'Lampejo de Genialidade', 'Reação após falha em teste ou salvamento: adicione INT.'],
  10: ['magicItemAdept', 'Adepto de Itens Mágicos', 'Sintonia com quatro itens.'],
  11: ['spellStoringItem', 'Item Armazenador de Magia', 'Armazene magia até nível 3, sem componente consumido.'],
  14: ['advancedArtifice', 'Artifício Avançado', 'Cinco sintonias; descanso curto recupera um Lampejo.'],
  20: ['soulOfArtifice', 'Alma do Artífice', 'Ao cair a 0 HP, desfaça itens replicados elegíveis: 20 HP por item. Sintonia permite recuperar Lampejos no descanso curto.'],
};
for (const [lv, [id,name,desc]] of Object.entries(artChanges)) artificer2025.perLevel[lv].features = [{id,name,desc}];
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
