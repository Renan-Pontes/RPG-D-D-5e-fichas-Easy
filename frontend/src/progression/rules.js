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
      { id: 'wildShape', name: 'Forma Selvagem', desc: 'Ação: transforme-se em besta (CR limitado pelo nível). 2 usos/descanso.' },
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
    18: { features: [{ id: 'beastSpells', name: 'Magias de Besta', desc: 'Pode lançar magias em Forma Selvagem.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'archdruid', name: 'Arquidruida', desc: 'Forma Selvagem ilimitada; componentes V/S/M opcionais.' }] },
  },
  subclassPerLevel: {
    moon: {
      2: { features: [
        { id: 'combatWildShape', name: 'Forma Selvagem de Combate', desc: 'Forma Selvagem como ação bônus. CR máx = 1.' },
      ] },
      6: { features: [{ id: 'elementalWildShape', name: 'Transformação Elementar', desc: '2 usos de Forma Selvagem → elemental.' }] },
      10: { features: [{ id: 'thousandForms', name: 'Mil Formas', desc: 'Lance Alterar Aparência à vontade.' }] },
    },
    land: {
      // Círculo da Terra: spells de domínio são SEMPRE preparados.
      // Depende do landType escolhido (forest, mountain, arctic, etc.).
      // O engine consulta landTypeSpells abaixo e expande conforme char.landType.
      2: { features: [{ id: 'naturalRecovery', name: 'Recuperação Natural', desc: 'Recupere espaços de magia em descanso curto.' }] },
      6: { features: [{ id: 'landsStride', name: "Passos da Terra", desc: 'Terreno difícil natural não custa extra.' }] },
      10: { features: [{ id: 'naturesWard', name: 'Proteção da Natureza', desc: 'Imune a veneno, doença, encantamento/medo de elementais/fadas.' }] },
      14: { features: [{ id: 'naturesSanctuary', name: 'Santuário da Natureza', desc: 'Bestas/plantas SAL SAB ou não te atacam.' }] },
      // landTypeSpells: { <landType>: { <druidLevel>: [spellIds] } }
      // O engine acumula os spells até o nível atual conforme landType.
      landTypeSpells: {
        arctic:    { 3: ['hold_person', 'spikeGrowth'], 5: ['sleet_storm', 'slow'],         7: ['freedomOfMovement', 'iceStorm'], 9: ['commune_with_nature', 'coneOfCold'] },
        coast:     { 3: ['mirrorImage', 'misty_step'],   5: ['waterBreathing', 'waterWalk'], 7: ['controlWater', 'freedomOfMovement'], 9: ['conjureElemental', 'scrying'] },
        desert:    { 3: ['blur', 'silence'],             5: ['createFood', 'protectionFromEnergy'], 7: ['blight', 'hallucinatoryTerrain'], 9: ['insectPlague', 'wallOfStone'] },
        forest:    { 3: ['barkskin', 'spiderClimb'],     5: ['callLightning', 'plantGrowth'], 7: ['divination', 'freedomOfMovement'], 9: ['commune_with_nature', 'treeStride'] },
        grassland: { 3: ['invisibility', 'pass_without_trace'], 5: ['daylight', 'haste'],    7: ['divination', 'freedomOfMovement'], 9: ['dream', 'insectPlague'] },
        mountain:  { 3: ['spiderClimb', 'spikeGrowth'],  5: ['lightning_bolt', 'meld_into_stone'], 7: ['stoneShape', 'stoneskin'], 9: ['passwall', 'wallOfStone'] },
        swamp:     { 3: ['acidArrow', 'darkness'],       5: ['waterWalk', 'stinkingCloud'],  7: ['freedomOfMovement', 'locateCreature'], 9: ['insectPlague', 'scrying'] },
        underdark: { 3: ['spiderClimb', 'webSpell'],     5: ['gaseousForm', 'stinkingCloud'], 7: ['greaterInvisibility', 'stoneShape'], 9: ['cloudkill', 'insectPlague'] },
      },
    },
    stars: {
      // EXEMPLO DO USUÁRIO: Estrelas dá Guidance automático no nível 2 (via Mapa Estelar)
      2: {
        autoCantrips: ['guidance'],
        features: [
          { id: 'starMap', name: 'Mapa Estelar', desc: '1×/desc longo: Guidance sem slot. Bônus: Augury e Divination.' },
          { id: 'starryForm', name: 'Forma Estelar', desc: 'Use Forma Selvagem para assumir constelação (Taça, Arqueiro ou Dragão).' },
        ],
      },
      6: { features: [{ id: 'cosmicOmen', name: 'Presságio Cósmico', desc: 'Adicionar/subtrair 1d6 de rolagens.' }] },
      10: { features: [{ id: 'fullOfStars', name: 'Cheio de Estrelas', desc: 'Em Forma Estelar: resistência a B/P/S.' }] },
      14: { features: [{ id: 'starFlare', name: 'Flare Estelar', desc: 'Ação bônus: cega criaturas em 10 pés e teletransporta aliados.' }] },
    },
    spores: {
      2: { features: [
        { id: 'haloOfSpores', name: 'Halo de Esporos', desc: 'Reação: 1d4 necrótico em criatura a 10 pés.' },
        { id: 'symbioticEntity', name: 'Simbiose com Esporos', desc: 'Forma Selvagem → HP temp e ataques +1d6 necrótico.' },
      ] },
      6: { features: [{ id: 'fungalInfestation', name: 'Infecção Fúngica', desc: 'Reanime besta/humanoide morto como zumbi.' }] },
      10: { features: [{ id: 'spreadingSpores', name: 'Propagação de Esporos', desc: 'Halo em cubo de 10 pés por 1 min.' }] },
      14: { features: [{ id: 'fungalBody', name: 'Forma do Morto-Vivo', desc: 'Imune a veneno; +1d6 necrótico em magias.' }] },
    },
    wildfire: {
      2: { features: [{ id: 'wildfireSpirit', name: 'Espírito de Chama', desc: 'Forma Selvagem → invoca espírito flamejante.' }] },
      6: { features: [{ id: 'enhancedBond', name: 'Vínculo Ardente', desc: '+1d8 em cura/fogo via espírito; +30 pés em curas.' }] },
      10: { features: [{ id: 'cauterizingFlames', name: 'Despertar da Chama', desc: 'Aliado pode curar 2d10+SAB quando alguém morre perto.' }] },
      14: { features: [{ id: 'blazingRevival', name: 'Chamas da Vida', desc: '1×/desc longo: ao cair a 0 HP, recupere metade do máximo.' }] },
    },
    dreams: {
      2: { features: [{ id: 'balmOfSummer', name: 'Bálsamo da Terra', desc: 'Pool de d6 para cura à distância.' }] },
      6: { features: [{ id: 'hearthOfMoonlight', name: 'Abrigo Feérico', desc: 'Santuário oculto em descanso longo.' }] },
      10: { features: [{ id: 'hiddenPaths', name: 'Olho do Portal', desc: 'Teleporte curto SAB/desc longo.' }] },
      14: { features: [{ id: 'walkerInDreams', name: 'Passeio Onírico', desc: 'Dream/Haste/Scrying grátis 1×/desc longo.' }] },
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
    9: { features: [{ id: 'indomitable', name: 'Indomável', desc: 'Refaça um teste de salvamento falho 1×/descanso longo.' }] },
    10: { subclassFeatures: true },
    11: { extraAttacks: 2 },
    12: { asiOrFeat: true },
    13: {},
    14: { asiOrFeat: true },
    15: { subclassFeatures: true },
    16: { asiOrFeat: true },
    17: {},
    18: { subclassFeatures: true },
    19: { asiOrFeat: true },
    20: { extraAttacks: 3 },
  },
  subclassPerLevel: {
    champion: {
      3: { features: [{ id: 'improvedCritical', name: 'Crítico Aprimorado', desc: 'Crítico em 19-20.' }] },
      7: { features: [{ id: 'remarkableAthlete', name: 'Atleta Notável', desc: '+metade prof em STR/DEX/CON sem prof.' }] },
      10: { fightingStyleChoice: 1 },
      15: { features: [{ id: 'superiorCritical', name: 'Crítico Superior', desc: 'Crítico em 17-20.' }] },
      18: { features: [{ id: 'survivor', name: 'Sobrevivente', desc: 'Recupere 5+CON HP/turno se ≤ ½ máximo.' }] },
    },
    battlemaster: {
      3: { features: [
        { id: 'combatSuperiority', name: 'Superioridade de Combate', desc: '4 dados d8 + 3 manobras.' },
        { id: 'studentOfWar', name: 'Estudante da Guerra', desc: 'Proficiência com ferramentas de artesão.' },
      ] },
      7: { features: [{ id: 'knowYourEnemy', name: 'Conheça Seu Inimigo', desc: 'Avalie força relativa em 1 min de observação.' }] },
      10: {},
      15: { features: [{ id: 'relentless', name: 'Implacável', desc: 'Inicia combate com 1 dado de superioridade.' }] },
      18: {},
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
        { id: 'spellbook', name: 'Livro de Magias', desc: '6 magias de 1° nível. Aprenda 2/nível.' },
        { id: 'arcaneRecovery', name: 'Recuperação Arcana', desc: 'Recupere slots em descanso curto (1×/dia).' },
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
    18: { features: [{ id: 'spellMastery', name: 'Mestria em Magia', desc: 'Escolha 1ª/2ª nível: lance sem slot.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'signatureSpells', name: 'Magias Características', desc: 'Escolha 2 magias de 3° nível: 1×/desc curto grátis.' }] },
  },
  subclassPerLevel: {
    evocation: {
      2: { features: [
        { id: 'evocationSavant', name: 'Sábio de Evocação', desc: 'Custo dobrado para copiar evocação no livro.' },
        { id: 'sculptSpells', name: 'Esculpir Magias', desc: 'Aliados em área de evocação sofrem dano mínimo.' },
      ] },
      6: { features: [{ id: 'potentCantrip', name: 'Truque Potente', desc: 'Metade do dano mesmo se SAL passar.' }] },
      10: { features: [{ id: 'empoweredEvocation', name: 'Evocação Aprimorada', desc: '+INT no dano de evocação 1×/turno.' }] },
      14: { features: [{ id: 'overchannel', name: 'Sobrecarga', desc: 'Maximize dano de magia 1-5 (dano necrótico após).' }] },
    },
    divination: {
      2: { features: [
        { id: 'divinationSavant', name: 'Sábio de Adivinhação', desc: 'Custo dobrado para copiar adivinhação.' },
        { id: 'portent', name: 'Presságio', desc: '2 dados d20 rolados; use para substituir rolagem.' },
      ] },
      6: { features: [{ id: 'expertDivination', name: 'Adivinhação Especialista', desc: 'Lance adivinhação 2°+: recupere slot menor.' }] },
      10: { features: [{ id: 'theThirdEye', name: 'O Terceiro Olho', desc: 'Ação: visão no escuro/etereal/línguas/superior por 1 min.' }] },
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
    5: { features: [{ id: 'destroyUndead', name: 'Destruir Mortos-Vivos', desc: 'Turn Undead destrói CR ≤ ½ (sobe com nível).' }] },
    6: { features: [{ id: 'channelDivinity2', name: 'Canalizar Divindade (2 usos)', desc: '2 usos/descanso curto.' }], subclassFeatures: true },
    7: {},
    8: { asiOrFeat: true, subclassFeatures: true },
    9: {},
    10: { cantripsKnown: 5, features: [{ id: 'divineIntervention', name: 'Intervenção Divina', desc: 'Pedido divino: chance = nível%.' }] },
    11: {},
    12: { asiOrFeat: true },
    13: {},
    14: {},
    15: {},
    16: { asiOrFeat: true },
    17: { subclassFeatures: true, features: [{ id: 'channelDivinity3', name: 'Canalizar Divindade (3 usos)', desc: '3 usos/descanso curto.' }] },
    18: {},
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
      2: { features: [{ id: 'radianceOfDawn', name: 'Radiance do Amanhecer', desc: 'CD: 2d10+nível radiante em 30 pés.' }] },
      3: { autoSpells: ['flamingSphere', 'scorchingRay'] },
      5: { autoSpells: ['daylight', 'fireball'] },
      6: { features: [{ id: 'improvedFlare', name: 'Chama Aprimorada', desc: 'Chama de Proteção protege aliados.' }] },
      7: { autoSpells: ['guardianOfFaith', 'wallOfFire'] },
      8: { features: [{ id: 'potentSpellcasting', name: 'Conjuração Potente', desc: '+SAB no dano de truques.' }] },
      9: { autoSpells: ['flameStrike', 'scrying'] },
      17: { features: [{ id: 'coronaOfLight', name: 'Corona de Luz', desc: 'Luz 60 pés; desvantagem em SAL fogo/radiante.' }] },
    },
    knowledge: {
      1: {
        autoSpells: ['commandSpell', 'identify'],
        features: [{ id: 'blessingsOfKnowledge', name: 'Bênçãos do Conhecimento', desc: '+2 idiomas e 2 perícias INT (com expertise).' }],
      },
      2: { features: [{ id: 'knowledgeOfAges', name: 'Conhecimento das Eras', desc: 'CD: proficiência em qualquer perícia/ferramenta por 10 min.' }] },
      3: { autoSpells: ['augury', 'suggestion'] },
      5: { autoSpells: ['nondetection', 'speakWithDead'] },
      6: { features: [{ id: 'readThoughts', name: 'Ler Pensamentos', desc: 'CD: leia mente de criatura.' }] },
      7: { autoSpells: ['arcaneEye', 'confusion'] },
      8: { features: [{ id: 'potentSpellcasting', name: 'Conjuração Potente', desc: '+SAB no dano de truques.' }] },
      9: { autoSpells: ['legendLore', 'scrying'] },
      17: { features: [{ id: 'visionsOfPast', name: 'Visões do Passado', desc: 'CD: veja história de objeto/local.' }] },
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
        { id: 'sneakAttack', name: 'Ataque Furtivo', desc: '+1d6 dano 1×/turno (cresce com nível).' },
        { id: 'thievesCant', name: 'Gíria de Ladrões', desc: 'Jargão secreto.' },
      ],
    },
    2: { features: [{ id: 'cunningAction', name: 'Ação Astuta', desc: 'Ação bônus: Disparar, Desengajar ou Esconder.' }] },
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
    14: { features: [{ id: 'blindsense', name: 'Sentido Cego', desc: 'Sentido criaturas em 10 pés.' }] },
    15: { features: [{ id: 'slipperyMind', name: 'Mente Esquiva', desc: 'Proficiência em SAL SAB.' }] },
    16: { asiOrFeat: true },
    17: { subclassFeatures: true },
    18: { features: [{ id: 'elusive', name: 'Esquivo', desc: 'Ataques contra você não têm vantagem se não incapacitado.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'strokeOfLuck', name: 'Golpe de Sorte', desc: 'Substitua um teste/ataque falho por sucesso 1×/desc curto.' }] },
  },
  subclassPerLevel: {
    thief: {
      3: { features: [
        { id: 'fastHands', name: 'Mãos Rápidas', desc: 'Ação Astuta: usar item, Tools, abrir fechadura.' },
        { id: 'secondStoryWork', name: 'Trabalho de Andar', desc: 'Escalar não custa extra; salto longo +DEX.' },
      ] },
      9: { features: [{ id: 'supremeSneak', name: 'Furtividade Suprema', desc: 'Vantagem em Furtividade se mover ≤ metade.' }] },
      13: { features: [{ id: 'useMagicDevice', name: 'Usar Item Mágico', desc: 'Ignore requisitos de classe/raça/nível para itens.' }] },
      17: { features: [{ id: 'thiefsReflexes', name: 'Reflexos de Ladrão', desc: '2 turnos no 1° round; o 2° tem desvantagem.' }] },
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
      { id: 'rage', name: 'Fúria', desc: '+2 dano corpo a corpo, resistência a B/P/S. 2 usos.' },
      { id: 'unarmoredDefense', name: 'Defesa sem Armadura', desc: 'CA = 10 + DEX + CON.' },
    ] },
    2: { features: [
      { id: 'recklessAttack', name: 'Ataque Imprudente', desc: 'Vantagem em ataques FOR; ataques contra você têm vantagem.' },
      { id: 'dangerSense', name: 'Sentido de Perigo', desc: 'Vantagem em SAL DEX se vê o perigo.' },
    ] },
    3: { subclassChoice: true },
    4: { asiOrFeat: true },
    5: { extraAttacks: 1, features: [{ id: 'fastMovement', name: 'Movimento Rápido', desc: '+10 pés deslocamento sem armadura pesada.' }] },
    6: { subclassFeatures: true },
    7: { features: [{ id: 'feralInstinct', name: 'Instinto Feral', desc: 'Vantagem em iniciativa.' }] },
    8: { asiOrFeat: true },
    9: { features: [{ id: 'brutalCritical', name: 'Crítico Brutal', desc: '+1 dado de dano em críticos (cresce).' }] },
    10: { subclassFeatures: true },
    11: { features: [{ id: 'relentlessRage', name: 'Fúria Implacável', desc: 'Ficar a 1 HP em vez de 0 em Fúria (CD CON crescente).' }] },
    12: { asiOrFeat: true },
    13: {},
    14: { subclassFeatures: true },
    15: { features: [{ id: 'persistentRage', name: 'Fúria Persistente', desc: 'Fúria não termina enquanto consciente.' }] },
    16: { asiOrFeat: true },
    17: {},
    18: { features: [{ id: 'indomitableMight', name: 'Poderio Indomável', desc: 'Testes FOR ≤ FOR viram FOR.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'primalChampion', name: 'Campeão Primitivo', desc: '+4 FOR e CON (máx 24).' }] },
  },
  subclassPerLevel: {
    berserker: {
      3: { features: [{ id: 'frenzy', name: 'Frenesi', desc: 'Em Fúria: ataque bônus/turno. Custo: 1 nível de exaustão.' }] },
      6: { features: [{ id: 'mindlessRage', name: 'Fúria Insensata', desc: 'Em Fúria: imune a encantamento e medo.' }] },
      10: { features: [{ id: 'intimidatingPresence', name: 'Presença Intimidadora', desc: 'Ação: assustar criatura em 30 pés.' }] },
      14: { features: [{ id: 'retaliation', name: 'Retaliação', desc: 'Reação: ataque ao sofrer dano em 5 pés.' }] },
    },
  },
};

// === Paladino ===
const PALADIN = {
  classId: 'paladin',
  perLevel: {
    1: { features: [
      { id: 'divineSense', name: 'Sentido Divino', desc: 'Ação: detecte celestiais/mortos-vivos/demônios.' },
      { id: 'layOnHands', name: 'Imposição de Mãos', desc: 'Pool 5×nível HP. Cure veneno/doença por 5 HP.' },
    ] },
    2: { fightingStyleChoice: 1, spellsPrepared: { formula: 'cha+halfLevel' }, features: [
      { id: 'spellcasting', name: 'Conjuração', desc: 'Prepare CHA + ½ nível magias.' },
      { id: 'divineSmite', name: 'Golpe Divino', desc: 'Após acerto: gaste slot para +2d8 radiante (1° nível, +1d8 por nível adicional).' },
    ] },
    3: { subclassChoice: true, features: [{ id: 'divineHealth', name: 'Saúde Divina', desc: 'Imune a doenças.' }] },
    4: { asiOrFeat: true },
    5: { extraAttacks: 1 },
    6: { features: [{ id: 'auraOfProtection', name: 'Aura de Proteção', desc: 'Aliados em 10 pés +CHA em SAL.' }] },
    7: { subclassFeatures: true },
    8: { asiOrFeat: true },
    9: {},
    10: { features: [{ id: 'auraOfCourage', name: 'Aura da Coragem', desc: 'Aliados em 10 pés imunes a medo.' }] },
    11: { features: [{ id: 'improvedDivineSmite', name: 'Golpe Divino Aprimorado', desc: '+1d8 radiante em todo ataque corpo a corpo.' }] },
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
      // Paladino do Juramento da Devoção: Oath Spells sempre preparados.
      3: {
        autoSpells: ['protectionFromEvilAndGood', 'sanctuary'],
        features: [
          { id: 'sacredWeapon', name: 'Arma Sagrada', desc: 'CD: arma +CHA em ataque, radiante, luz 20 pés.' },
          { id: 'turnUnholy', name: 'Repelir Profanos', desc: 'CD: SAL SAB ou amedrontados (celestiais/mortos-vivos).' },
        ],
      },
      5: { autoSpells: ['lesserRestoration', 'zoneOfTruth'] },
      7: {
        autoSpells: ['beaconOfHope', 'dispelMagic'],
        features: [{ id: 'auraOfDevotion', name: 'Aura da Devoção', desc: 'Aliados em 10 pés imunes a encantamento.' }],
      },
      9: { autoSpells: ['freedomOfMovement', 'guardianOfFaith'] },
      13: { autoSpells: ['commune', 'flameStrike'] },
      15: { features: [{ id: 'purityOfSpirit', name: 'Pureza de Espírito', desc: 'Protection from Evil and Good sempre ativa.' }] },
      17: { autoSpells: ['holyAura'] },
      20: { features: [{ id: 'holyNimbus', name: 'Nimbo Sagrado', desc: 'Aura solar 30 pés: 10 radiante/turno em inimigos; vantagem em SAL vs magia.' }] },
    },
  },
};

// === Ranger / Bard / Sorcerer / Monk / Warlock — esqueleto, completar conforme necessidade ===
const RANGER = {
  classId: 'ranger',
  perLevel: {
    1: { features: [
      { id: 'favoredEnemy', name: 'Inimigo Favorito', desc: 'Escolha um tipo. Vantagem em Survival/INT para info.' },
      { id: 'naturalExplorer', name: 'Explorador Natural', desc: 'Bônus em terreno escolhido.' },
    ] },
    2: { fightingStyleChoice: 1, spellsPrepared: { formula: 'wis+halfLevel' }, features: [
      { id: 'spellcasting', name: 'Conjuração', desc: 'Prepare WIS + ½ nível magias.' },
    ] },
    3: { subclassChoice: true, features: [{ id: 'primevalAwareness', name: 'Consciência Primitiva', desc: 'Gaste slot para sentir criaturas em 1 mi (6 mi em terreno favorecido).' }] },
    4: { asiOrFeat: true },
    5: { extraAttacks: 1 },
    6: {},
    7: { subclassFeatures: true },
    8: { asiOrFeat: true, features: [{ id: 'landsStride', name: "Passos da Terra", desc: 'Terreno difícil natural não custa extra.' }] },
    9: {},
    10: { features: [{ id: 'hideInPlainSight', name: 'Esconder à Vista', desc: 'Camuflagem: +10 em testes Stealth.' }] },
    11: { subclassFeatures: true },
    12: { asiOrFeat: true },
    13: {},
    14: { features: [{ id: 'vanish', name: 'Desaparecer', desc: 'Esconder como bônus.' }] },
    15: { subclassFeatures: true },
    16: { asiOrFeat: true },
    17: {},
    18: { features: [{ id: 'feralSenses', name: 'Sentidos Feros', desc: 'Sentido invisíveis em 30 pés.' }] },
    19: { asiOrFeat: true },
    20: { features: [{ id: 'foeSlayer', name: 'Matador de Inimigo', desc: '+WIS em ataque ou dano contra Favored Enemy.' }] },
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
        { id: 'bardicInspiration', name: 'Inspiração Bárdica', desc: 'Ação bônus: dê d6 a aliado. CHA usos/desc longo.' },
      ],
    },
    2: { features: [
      { id: 'jackOfAllTrades', name: 'Pau pra Toda Obra', desc: '+½ prof em testes sem prof.' },
      { id: 'songOfRest', name: 'Canção do Descanso', desc: 'Aliados curam +1d6 em desc curto (cresce).' },
    ] },
    3: { subclassChoice: true, expertiseChoice: 2 },
    4: { asiOrFeat: true, cantripsKnown: 3 },
    5: { features: [{ id: 'bardicInspirationD8', name: 'Inspiração Bárdica (d8)', desc: 'Aumenta para d8. Recarrega em desc curto.' }] },
    6: { subclassFeatures: true, features: [{ id: 'countercharm', name: 'Contramagia', desc: 'Ação: aliados em 30 pés têm vantagem vs medo/encantamento.' }] },
    7: {},
    8: { asiOrFeat: true },
    9: {},
    10: { cantripsKnown: 4, expertiseChoice: 2, features: [{ id: 'magicalSecrets', name: 'Segredos Mágicos', desc: 'Aprenda 2 magias de qualquer classe.' }] },
    11: {},
    12: { asiOrFeat: true },
    13: {},
    14: { subclassFeatures: true, features: [{ id: 'magicalSecrets', name: 'Segredos Mágicos (mais 2)', desc: '+2 magias.' }] },
    15: { features: [{ id: 'bardicInspirationD10', name: 'Inspiração Bárdica (d10)', desc: 'Aumenta para d10.' }] },
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
        { id: 'cuttingWords', name: 'Palavras Cortantes', desc: 'Reação: -1d6 em ataque/teste/dano inimigo.' },
      ] },
      6: { features: [{ id: 'additionalMagicalSecrets', name: 'Segredos Mágicos Adicionais', desc: '+2 magias de qualquer classe.' }] },
      14: { features: [{ id: 'peerlessSkill', name: 'Habilidade sem Par', desc: 'Use Inspiração em seu próprio teste.' }] },
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
    3: { features: [{ id: 'metamagic', name: 'Metamagia', desc: '2 opções: Quickened, Twin, Subtle, etc.' }] },
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
        { id: 'dragonAncestor', name: 'Ancestral Dracônico', desc: 'Escolha um tipo. Dobre prof em CHA com dragões.' },
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
      { id: 'ki', name: 'Ki', desc: 'Pontos de Ki = nível. Flurry, Patient Defense, Step of Wind.' },
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
      17: { features: [{ id: 'quiveringPalm', name: 'Palma Trêmula', desc: '3 Ki: vibração letal (SAL CON ou 10d10).' }] },
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
    3: { features: [{ id: 'pactBoon', name: 'Dádiva do Pacto', desc: 'Chain, Blade ou Tome.' }] },
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
    20: { features: [{ id: 'eldritchMaster', name: 'Mestre Místico', desc: 'Recupere todos slots em 1 min de súplica.' }] },
  },
  subclassPerLevel: {
    fiend: {
      1: {
        autoSpells: ['burningHands', 'commandSpell'],
        features: [{ id: 'darkOnesBlessing', name: 'Bênção do Tenebroso', desc: 'Ao matar criatura: CHA + nível HP temp.' }],
      },
      3: { autoSpells: ['blindnessDeafness', 'scorchingRay'] },
      5: { autoSpells: ['fireball', 'stinkingCloud'] },
      6: { features: [{ id: 'darkOnesOwnLuck', name: 'Sorte do Tenebroso', desc: '+1d10 em teste/SAL após ver o dado. 1×/desc curto.' }] },
      7: { autoSpells: ['fireShield', 'wallOfFire'] },
      9: { autoSpells: ['flameStrike', 'hallow'] },
      10: { features: [{ id: 'fiendishResilience', name: 'Resiliência Demoníaca', desc: 'Escolha tipo de dano: resistência. Pode mudar em desc.' }] },
      14: { features: [{ id: 'hurlThroughHell', name: 'Lançar Através do Inferno', desc: 'Após acerto: SAL CHA ou banido por 1 turno + 10d10 psíquico.' }] },
    },
    // Hexblade — patrono "espada"; o jogador escolhe Pacto da Lâmina como Pact Boon no nv 3
    // (decisão de Pact Boon ainda é manual — não é auto)
    hexblade: {
      1: {
        autoSpells: ['shield', 'wrathfulSmite'],
        features: [
          { id: 'hexblade_curse', name: "Maldição da Lâmina", desc: 'Ação bônus: amaldiçoe uma criatura em 30 pés (CR≤PROF). +PROF dano contra ela, crit em 19-20, recuperação de HP ao matá-la.' },
          { id: 'hexWarrior', name: 'Hex Warrior', desc: 'Use CHA em vez de FOR/DEX em uma arma de sua escolha após desc longo. Proficiência com armaduras médias, escudos e armas marciais.' },
        ],
      },
      3: { autoSpells: ['brandingSmite', 'magicWeapon'] },
      5: { autoSpells: ['blinkSpell', 'elemental_weapon'] },
      6: { features: [{ id: 'accursedSpecter', name: 'Espectro Amaldiçoado', desc: 'Ao matar humanoide: erga como espectro até desc longo. 1×/desc longo.' }] },
      7: { autoSpells: ['phantasmal_killer', 'staggering_smite'] },
      9: { autoSpells: ['banishingSmite', 'cone_of_cold'] },
      10: { features: [{ id: 'armorOfHexes', name: 'Armadura de Maldições', desc: 'Alvo da maldição que te acerta: 50% chance do ataque errar.' }] },
      14: { features: [{ id: 'masterOfHexes', name: 'Mestre das Maldições', desc: 'Ao matar alvo da maldição: transfira para nova criatura sem gastar uso.' }] },
    },
  },
};

export const PROGRESSION_RULES = {
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

// Tabela canônica do bônus de proficiência por nível.
export function profBonus(level) {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}
