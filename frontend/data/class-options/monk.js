// Monge — traços 2024 (SRD 5.2.1, CC-BY 4.0), escolhas e tradições.
// Textos da classe base e do Guerreiro da Mão Aberta seguem o SRD 5.2.1; as demais
// tradições (PHB 2024 e suplementos) são RESUMOS ORIGINAIS, não o texto dos livros.
// Tradições de suplemento aparecem aqui já em termos de 2024: ki → Pontos de Foco (PF),
// CD de ki → CD de Foco (8 + BP + SAB). Recursos com usos (PF, dado de Artes Marciais,
// deslocamento) estão só no texto por enquanto.
const b = (pt, en) => ({ pt, en });
const f = (id, name, desc) => ({ id, name, desc });

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------

// Nível 1: um tipo de Ferramentas de Artesão ou um Instrumento Musical (SRD).
const tool = (id, pt, en, kind) => ({
  id, name: b(pt, en), source: 'SRD',
  desc: kind === 'artisan'
    ? b('Proficiência com este tipo de Ferramentas de Artesão.', 'Proficiency with this type of Artisan\'s Tools.')
    : b('Proficiência com este Instrumento Musical.', 'Proficiency with this Musical Instrument.'),
  grants: { tools: [id] },
});
const tools = [
  tool('alchemistsSupplies', 'Suprimentos de Alquimista', "Alchemist's Supplies", 'artisan'),
  tool('brewersSupplies', 'Suprimentos de Cervejeiro', "Brewer's Supplies", 'artisan'),
  tool('calligraphersSupplies', 'Suprimentos de Calígrafo', "Calligrapher's Supplies", 'artisan'),
  tool('carpentersTools', 'Ferramentas de Carpinteiro', "Carpenter's Tools", 'artisan'),
  tool('cartographersTools', 'Ferramentas de Cartógrafo', "Cartographer's Tools", 'artisan'),
  tool('cobblersTools', 'Ferramentas de Sapateiro', "Cobbler's Tools", 'artisan'),
  tool('cooksUtensils', 'Utensílios de Cozinheiro', "Cook's Utensils", 'artisan'),
  tool('glassblowersTools', 'Ferramentas de Vidreiro', "Glassblower's Tools", 'artisan'),
  tool('jewelersTools', 'Ferramentas de Joalheiro', "Jeweler's Tools", 'artisan'),
  tool('leatherworkersTools', 'Ferramentas de Coureiro', "Leatherworker's Tools", 'artisan'),
  tool('masonsTools', 'Ferramentas de Pedreiro', "Mason's Tools", 'artisan'),
  tool('paintersSupplies', 'Suprimentos de Pintor', "Painter's Supplies", 'artisan'),
  tool('pottersTools', 'Ferramentas de Oleiro', "Potter's Tools", 'artisan'),
  tool('smithsTools', 'Ferramentas de Ferreiro', "Smith's Tools", 'artisan'),
  tool('tinkersTools', 'Ferramentas de Funileiro', "Tinker's Tools", 'artisan'),
  tool('weaversTools', 'Ferramentas de Tecelão', "Weaver's Tools", 'artisan'),
  tool('woodcarversTools', 'Ferramentas de Entalhador', "Woodcarver's Tools", 'artisan'),
  tool('bagpipes', 'Gaita de Foles', 'Bagpipes', 'instrument'),
  tool('drum', 'Tambor', 'Drum', 'instrument'),
  tool('dulcimer', 'Saltério', 'Dulcimer', 'instrument'),
  tool('flute', 'Flauta', 'Flute', 'instrument'),
  tool('horn', 'Trompa', 'Horn', 'instrument'),
  tool('lute', 'Alaúde', 'Lute', 'instrument'),
  tool('lyre', 'Lira', 'Lyre', 'instrument'),
  tool('panFlute', 'Flauta de Pã', 'Pan Flute', 'instrument'),
  tool('shawm', 'Charamela', 'Shawm', 'instrument'),
  tool('viol', 'Viola', 'Viol', 'instrument'),
];

// Caminho dos Quatro Elementos (PHB 2014): Disciplinas Elementais. A Sintonia
// Elemental é automática (texto do traço) e não entra no pool.
const disc = (id, pt, en, level, descPt, descEn, spells) => ({
  id, name: b(pt, en), source: 'PHB', desc: b(descPt, descEn),
  ...(level > 3 ? { prereq: { level } } : {}),
  ...(spells ? { grants: { spells } } : {}),
});
const disciplines = [
  disc('fangsOfTheFireSnake', 'Presas da Serpente de Fogo', 'Fangs of the Fire Snake', 3,
    "Quando você usa a ação de Ataque em seu turno, você pode gastar 1 ponto de ki para fazer com que gavinhas de chamas se estendam de seus punhos e pernas. Seu alcance com seus ataques desarmados aumenta em 3 metros para essa ação, bem como pelo restante do turno. Um acerto com tal ataque causa dano ígneo em vez de dano contundente e, se você gastar 1 ponto de ki quando o ataque acertar, ele também causará 1d10 de dano ígneo adicional.",
    "When you use the Attack action on your turn, you can spend 1 ki point to cause tendrils of flame to stretch out from your fists and feet. Your reach with your unarmed strikes increases by 10 feet for that action, as well as the rest of the turn. A hit with such an attack deals fire damage instead of bludgeoning damage, and if you spend 1 ki point when the attack hits, it also deals an extra 1d10 fire damage."),
  disc('fistOfFourThunders', 'Punho dos Quatro Trovões', 'Fist of Four Thunders', 3,
    "Você pode gastar 2 pontos de ki para conjurar onda trovejante.", "You can spend 2 ki points to cast thunderwave", ['thunderwave']),
  disc('fistOfUnbrokenAir', 'Punho do Ar Inquebrável', 'Fist of Unbroken Air', 3,
    "Você pode criar uma explosão de ar comprimido que atinge como um punho poderoso. Com uma ação, você pode gastar 2 pontos de ki e escolher uma criatura a até 9 metros de você. Essa criatura deve realizar uma salvaguarda de Força. Se fracassar na salvaguarda, a criatura sofre 3d10 de dano contundente, mais 1d10 de dano contundente adicional para cada ponto de ki adicional gasto por você, e você pode empurrar a criatura em até 6 metros para longe de você e deixá-la caída. Se obtiver sucesso na salvaguarda, a criatura sofre metade desse dano, e você não a empurra nem a deixa caída.",
    "You can create a blast of compressed air that strikes like a mighty fist. As an action, you can spend 2 ki points and choose a creature within 30 feet of you. That creature must make a Strength saving throw. On a failed save, the creature takes 3d10 bludgeoning damage, plus an extra 1d10 bludgeoning damage for each additional ki point you spend, and you can push the creature up to 20 feet away from you and knock it prone. On a successful save, the creature takes half as much damage, and you don’t push it or knock it prone."),
  disc('rushOfTheGaleSpirits', 'Investida dos Espíritos do Vendaval', 'Rush of the Gale Spirits', 3,
    "Você pode gastar 2 pontos de ki para conjurar lufada de vento.", "You can spend 2 ki points to cast gust of wind.", ['gustOfWind']),
  disc('shapeTheFlowingRiver', 'Moldar o Rio Corrente', 'Shape the Flowing River', 3,
    "Com uma ação, você pode gastar 1 ponto de ki para escolher uma área de gelo ou água de no máximo 9 metros de lado dentro de 36 metros de você. Você pode transformar água em gelo dentro da área e vice-versa, e pode remodelar o gelo na área de qualquer maneira que escolher. Você pode elevar ou abaixar a elevação do gelo, criar ou preencher uma trincheira, erguer ou aplanar uma parede, ou formar um pilar. A extensão de tais alterações não pode exceder metade da maior dimensão da área. Por exemplo, se afetar um quadrado de 9 metros, você pode criar um pilar de até 4,5 metros de altura, elevar ou rebaixar a elevação do quadrado em até 4,5 metros, cavar uma trincheira de até 4,5 metros de profundidade, e assim por diante. Você não pode moldar o gelo para prender ou ferir uma criatura na área.",
    "As an action, you can spend 1 ki point to choose an area of ice or water no larger than 30 feet on a side within 120 feet of you. You can change water to ice within the area and vice versa, and you can reshape ice in the area in any manner you choose. You can raise or lower the ice’s elevation, create or fill in a trench, erect or flatten a wall, or form a pillar. The extent of any such changes can’t exceed half the area’s largest dimension. For example, if you affect a 30-foot square, you can create a pillar up to 15 feet high, raise or lower the square’s elevation by up to 15 feet, dig a trench up to 15 feet deep, and so on. You can’t shape the ice to trap or injure a creature in the area."),
  disc('sweepingCinderStrike', 'Golpe de Cinzas Arrebatador', 'Sweeping Cinder Strike', 3,
    "Você pode gastar 2 pontos de ki para conjurar mãos flamejantes.", "You can spend 2 ki points to cast burning hands.", ['burningHands']),
  disc('waterWhip', 'Chicote d\'Água', 'Water Whip', 3,
    'Ação, 2 PF: chicote d\'água contra uma criatura a até 9 m. Salvaguarda de DES ou sofre 3d10 contundente (+1d10 por PF extra) e, à sua escolha, cai Caída ou é puxada até 7,5 m; metade do dano se passar.',
    "Action, 2 FP: a whip of water at a creature within 9 m. DEX save or take 3d10 bludgeoning (+1d10 per extra FP) and be knocked Prone or pulled up to 7,5 m (your choice); half damage on a success."),
  disc('clenchOfTheNorthWind', 'Aperto do Vento Norte', 'Clench of the North Wind', 6,
    "Pré-requisito: 6º nível\n\nVocê pode gastar 3 pontos de ki para conjurar imobilizar pessoa.", "Prerequisite: 6th level\n\nYou can spend 3 ki points to cast hold person.", ['holdPerson']),
  disc('gongOfTheSummit', 'Gongo do Cume', 'Gong of the Summit', 6,
    "Pré-requisito: 6º nível\n\nVocê pode gastar 3 pontos de ki para conjurar despedaçar.", "Prerequisite: 6th level\n\nYou can spend 3 ki points to cast shatter.", ['shatter']),
  disc('flamesOfThePhoenix', 'Chamas da Fênix', 'Flames of the Phoenix', 11,
    "Pré-requisito: 11º nível\n\nVocê pode gastar 4 pontos de ki para conjurar bola de fogo.", "Prerequisite: 11th level\n\nYou can spend 4 ki points to cast fireball.", ['fireball']),
  disc('mistStance', 'Postura da Névoa', 'Mist Stance', 11,
    "Pré-requisito: 11º nível\n\nVocê pode gastar 4 pontos de ki para conjurar forma gasosa, tendo a si mesmo como alvo.", "Prerequisite: 11th level\n\nYou can spend 4 ki points to cast gaseous form, targeting yourself.", ['gaseousForm']),
  disc('rideTheWind', 'Cavalgar o Vento', 'Ride the Wind', 11,
    "Pré-requisito: 11º nível\n\nVocê pode gastar 4 pontos de ki para conjurar voo, tendo a si mesmo como alvo.", "Prerequisite: 11th level\n\nYou can spend 4 ki points to cast fly, targeting yourself.", ['fly']),
  disc('breathOfWinter', 'Sopro do Inverno', 'Breath of Winter', 17,
    "Pré-requisito: 17º nível\n\nVocê pode gastar 6 pontos de ki para conjurar cone de frio.", "Prerequisite: 17th level\n\nYou can spend 6 ki points to cast cone of cold.", ['coneOfCold']),
  disc('eternalMountainDefense', 'Defesa da Montanha Eterna', 'Eternal Mountain Defense', 17,
    "Pré-requisito: 17º nível\n\nVocê pode gastar 5 pontos de ki para conjurar pele de pedra, tendo a si mesmo como alvo.", "Prerequisite: 17th level\n\nYou can spend 5 ki points to cast stoneskin, targeting yourself.", ['stoneskin']),
  disc('riverOfHungryFlame', 'Rio de Chamas Famintas', 'River of Hungry Flame', 17,
    "Pré-requisito: 17º nível\n\nVocê pode gastar 5 pontos de ki para conjurar muralha de fogo.", "Prerequisite: 17th level\n\nYou can spend 5 ki points to cast wall of fire.", ['wallOfFire']),
  disc('waveOfRollingEarth', 'Onda de Terra Rolante', 'Wave of Rolling Earth', 17,
    "Pré-requisito: 17º nível\n\nVocê pode gastar 6 pontos de ki para conjurar muralha de pedra.", "Prerequisite: 17th level\n\nYou can spend 6 ki points to cast wall of stone.", ['wallOfStone']),
];

// Caminho do Kensei (XGE): armas simples ou marciais sem Pesada/Especial; o arco
// longo é exceção permitida. No nível 3: 1 corpo a corpo + 1 à distância.
const MELEE = b('corpo a corpo', 'melee');
const RANGED = b('à distância', 'ranged');
const kw = (id, pt, en, kind) => ({
  id, name: b(`${pt} (${kind.pt})`, `${en} (${kind.en})`), source: 'XGE',
  desc: b(`Arma kensei ${kind.pt}: proficiência (se ainda não tiver) e conta como arma de monge.`,
    `${kind.en === 'melee' ? 'Melee' : 'Ranged'} kensei weapon: proficiency (if you lack it) and it counts as a monk weapon.`),
  grants: { weapons: [id] },
  melee: kind === MELEE, // usado no filtro dos pools de nível 3 (1 corpo a corpo + 1 à distância)
});
const kenseiWeapons = [
  kw('club', 'Clava', 'Club', MELEE), kw('dagger', 'Adaga', 'Dagger', MELEE),
  kw('greatclub', 'Clava Grande', 'Greatclub', MELEE), kw('handaxe', 'Machadinha', 'Handaxe', MELEE),
  kw('javelin', 'Azagaia', 'Javelin', MELEE), kw('lightHammer', 'Martelo Leve', 'Light Hammer', MELEE),
  kw('mace', 'Maça', 'Mace', MELEE), kw('quarterstaff', 'Bordão', 'Quarterstaff', MELEE),
  kw('sickle', 'Foice Curta', 'Sickle', MELEE), kw('spear', 'Lança', 'Spear', MELEE),
  kw('battleaxe', 'Machado de Batalha', 'Battleaxe', MELEE), kw('flail', 'Mangual', 'Flail', MELEE),
  kw('longsword', 'Espada Longa', 'Longsword', MELEE), kw('morningstar', 'Maça Estrela', 'Morningstar', MELEE),
  kw('rapier', 'Rapieira', 'Rapier', MELEE), kw('scimitar', 'Cimitarra', 'Scimitar', MELEE),
  kw('shortsword', 'Espada Curta', 'Shortsword', MELEE), kw('trident', 'Tridente', 'Trident', MELEE),
  kw('warPick', 'Picareta de Guerra', 'War Pick', MELEE), kw('warhammer', 'Martelo de Guerra', 'Warhammer', MELEE),
  kw('whip', 'Chicote', 'Whip', MELEE),
  kw('crossbowLight', 'Besta Leve', 'Light Crossbow', RANGED), kw('dart', 'Dardo', 'Dart', RANGED),
  kw('shortbow', 'Arco Curto', 'Shortbow', RANGED), kw('sling', 'Funda', 'Sling', RANGED),
  kw('blowgun', 'Zarabatana', 'Blowgun', RANGED), kw('crossbowHand', 'Besta de Mão', 'Hand Crossbow', RANGED),
  kw('longbow', 'Arco Longo', 'Longbow', RANGED),
  { ...kw('pistol', 'Pistola', 'Pistol', RANGED), rules: '2024' },
  { ...kw('musket', 'Mosquete', 'Musket', RANGED), rules: '2024' },
];

// ---------------------------------------------------------------------------
// Tradições
// ---------------------------------------------------------------------------

const subclasses = {
  // SRD 5.2.1 — texto do SRD (CC-BY). O app também tem o alias `openHand` (rules.js).
  openhand: {
    name: b('Guerreiro da Mão Aberta', 'Warrior of the Open Hand'),
    source: 'SRD',
    desc: b('Mestres do combate desarmado, que empurram, derrubam e desestabilizam os oponentes e usam a própria energia para se curar.',
      'Masters of unarmed combat who push, trip and unsettle foes and channel their own energy to heal themselves.'),
    levels: {
      3: { features: [f('openHandTechnique', b('Técnica da Mão Aberta', 'Open Hand Technique'), b(
        'Sempre que acertar uma criatura com um ataque concedido pela Rajada de Golpes, você pode impor um destes efeitos: Desnortear (o alvo não pode fazer Ataques de Oportunidade até o início do próximo turno dele); Empurrar (salvaguarda de Força ou é empurrado até 4,5 m para longe de você); Derrubar (salvaguarda de Destreza ou fica Caído).',
        'Whenever you hit a creature with an attack granted by your Flurry of Blows, you can impose one of these effects: Addle (the target can\'t make Opportunity Attacks until the start of its next turn); Push (Strength save or be pushed up to 15 feet away from you); Topple (Dexterity save or have the Prone condition).'))] },
      6: { features: [f('wholenessOfBody', b('Integridade do Corpo', 'Wholeness of Body'), b(
        "Você ganha a habilidade de curar a si mesmo. Como uma Ação Bônus, você pode rolar seu dado de Artes Marciais. Você recupera uma quantidade de Pontos de Vida igual ao número rolado mais seu modificador de Sabedoria (mínimo de 1 Ponto de Vida recuperado).\n\nVocê pode usar esta característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez), e recupera todos os usos gastos ao terminar um Descanso Longo.",
        "You gain the ability to heal yourself. As a Bonus Action, you can roll your Martial Arts die. You regain a number of Hit Points equal to the number rolled plus your Wisdom modifier (minimum of 1 Hit Point regained).\n\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."))] },
      11: { features: [f('fleetStep', b('Passo Ligeiro', 'Fleet Step'), b(
        'Quando você usa uma Ação Bônus que não seja o Passo do Vento, pode usar o Passo do Vento imediatamente depois dela.',
        'When you take a Bonus Action other than Step of the Wind, you can also use Step of the Wind immediately after that Bonus Action.'))] },
      17: { features: [f('quiveringPalm', b('Palma Vibrante', 'Quivering Palm'), b(
        'Ao acertar uma criatura com um Ataque Desarmado, gaste 4 PF para iniciar vibrações imperceptíveis que duram um número de dias igual ao seu nível de monge. Elas são inofensivas até você usar uma ação para encerrá-las (ou abrir mão de um dos ataques da ação de Ataque); vocês precisam estar no mesmo plano. Ao encerrar, o alvo faz salvaguarda de Constituição: 10d12 de dano de Força se falhar, metade se passar.',
        'When you hit a creature with an Unarmed Strike, spend 4 Focus Points to start imperceptible vibrations lasting a number of days equal to your Monk level. They are harmless until you take an action to end them (or forgo one attack of your Attack action); you must be on the same plane. When you end them, the target makes a Constitution save: 10d12 Force damage on a failure, half as much on a success.'))] },
    },
  },

  // PHB 2024 — resumos originais.
  shadow: {
    name: b('Guerreiro da Sombra', 'Warrior of Shadow'),
    source: 'PHB24',
    desc: b('Usa o Foco para manipular a escuridão, saltar entre sombras e ficar invisível.',
      'Uses Focus to shape darkness, leap between shadows and turn invisible.'),
    levels: {
      3: {
        features: [f('shadowArts', b('Artes das Sombras', 'Shadow Arts'), b(
          'Gaste 1 PF para conjurar Escuridão sem componentes; você enxerga dentro dela e, no início de cada turno, pode movê-la até 18 m. Ganha Visão no Escuro de 18 m (ou +18 m se já tiver) e conhece o truque Ilusão Menor, usando Sabedoria.',
          'Spend 1 Focus Point to cast Darkness without components; you can see within it and, at the start of each turn, move it up to 60 ft. You gain 60-ft Darkvision (or +60 ft if you already have it) and know the Minor Illusion cantrip, using Wisdom.'))],
        autoSpells: ['darkness'],
        autoCantrips: ['minorIllusion'],
      },
      6: { features: [f('shadowStep', b('Passo das Sombras', 'Shadow Step'), b(
        'Estando na penumbra ou na escuridão, use uma Ação Bônus para se teletransportar até 18 m para um espaço desocupado que você veja e que também esteja na penumbra ou escuridão. Você tem Vantagem no próximo ataque corpo a corpo antes do fim do turno.',
        'While in dim light or darkness, take a Bonus Action to teleport up to 60 ft to an unoccupied space you can see that is also in dim light or darkness. You have Advantage on your next melee attack before the end of the turn.'))] },
      11: { features: [f('improvedShadowStep', b('Passo das Sombras Aprimorado', 'Improved Shadow Step'), b(
        "Você pode recorrer à sua conexão com o Pendor das Sombras para fortalecer seu teletransporte. Quando você usa seu Passo das Sombras, pode gastar 1 Ponto de Foco para remover a exigência de começar e terminar em Meia-luz ou Escuridão para esse uso da característica. Como parte desta Ação Bônus, você pode fazer um Golpe Desarmado imediatamente após se teletransportar.",
        "You can draw on your Shadowfell connection to empower your teleportation. When you use your Shadow Step, you can expend 1 Focus Point to remove the requirement that you must start and end in Dim Light or Darkness for that use of the feature. As part of this Bonus Action, you can make an Unarmed Strike immediately after you teleport."))] },
      17: { features: [f('cloakOfShadows', b('Manto de Sombras', 'Cloak of Shadows'), b(
        'Na penumbra ou escuridão, use uma ação de Magia e gaste 3 PF para se envolver em sombras por 1 minuto (termina se ficar Incapacitado ou entrar em luz plena): você fica Invisível, pode atravessar espaços ocupados como terreno difícil (sem terminar o turno dentro deles) e usa a Rajada de Golpes sem gastar PF.',
        'In dim light or darkness, take a Magic action and spend 3 Focus Points to shroud yourself for 1 minute (ends if you are Incapacitated or enter bright light): you are Invisible, can move through occupied spaces as difficult terrain (not ending your turn there), and can use Flurry of Blows without spending Focus Points.'))] },
    },
  },

  elements: {
    name: b('Guerreiro dos Elementos', 'Warrior of the Elements'),
    source: 'PHB24',
    desc: b('Canaliza o Foco nas forças elementais: golpes de longo alcance, explosões e voo.',
      'Channels Focus into elemental forces: long-reach strikes, bursts and flight.'),
    levels: {
      3: {
        features: [
          f('elementalAttunement', b('Sintonia Elemental', 'Elemental Attunement'), b(
            'No início do seu turno, gaste 1 PF para se sintonizar por 10 minutos (ou até ficar Incapacitado). Enquanto sintonizado, seus Ataques Desarmados ganham +3 m de alcance e, ao acertar, podem causar dano ácido, de frio, de fogo, elétrico ou trovejante (escolha a cada acerto); nesse caso, o alvo faz salvaguarda de Força ou é movido até 3 m para perto ou para longe de você.',
            'At the start of your turn, spend 1 Focus Point to attune for 10 minutes (or until Incapacitated). While attuned, your Unarmed Strikes gain +10 ft reach and on a hit can deal acid, cold, fire, lightning or thunder damage (chosen per hit); if so, the target makes a Strength save or is moved up to 10 ft toward or away from you.')),
          f('manipulateElements', b('Manipular Elementos', 'Manipulate Elements'), b(
            'Você conhece o truque Elementalismo, usando Sabedoria como atributo de conjuração.',
            'You know the Elementalism cantrip, using Wisdom as your spellcasting ability.')),
        ],
        autoCantrips: ['elementalism'],
      },
      6: { features: [f('elementalBurst', b('Explosão Elemental', 'Elemental Burst'), b(
        'Ação de Magia, 2 PF: uma esfera de 6 m de raio centrada num ponto a até 36 m. Cada criatura na área faz salvaguarda de Destreza (CD de Foco) e sofre três rolagens do dado de Artes Marciais do tipo que você escolher (ácido, frio, fogo, elétrico ou trovejante); metade se passar.',
        'Magic action, 2 Focus Points: a 20-ft-radius sphere centered on a point within 120 ft. Each creature there makes a Dexterity save (Focus DC), taking three rolls of your Martial Arts die of a type you choose (acid, cold, fire, lightning or thunder); half on a success.'))] },
      11: { features: [f('strideOfTheElements', b('Passada dos Elementos', 'Stride of the Elements'), b(
        "Enquanto sua Sintonia Elemental estiver ativa, você também tem Deslocamento de Voo e Deslocamento de Natação iguais ao seu Deslocamento.",
        "While your Elemental Attunement is active, you also have a Fly Speed and a Swim Speed equal to your Speed."))] },
      17: { features: [f('elementalEpitome', b('Epítome Elemental', 'Elemental Epitome'), b(
        'Enquanto sintonizado: tem Resistência a um tipo entre ácido, frio, fogo, elétrico ou trovejante (troque no início de cada turno); ao usar o Passo do Vento, seu deslocamento aumenta 6 m e cada criatura que você passar a até 1,5 m sofre uma rolagem do dado de Artes Marciais do tipo escolhido (1×/turno por criatura); e, 1×/turno, um Ataque Desarmado que acertar causa +1 dado de Artes Marciais desse tipo.',
        'While attuned: you have Resistance to one of acid, cold, fire, lightning or thunder (change it at the start of each turn); when you use Step of the Wind your Speed increases by 20 ft and each creature you move within 5 ft of takes one roll of your Martial Arts die of a chosen type (once per turn per creature); and once per turn one Unarmed Strike hit deals an extra Martial Arts die of that type.'))] },
    },
  },

  mercy: {
    name: b('Guerreiro da Misericórdia', 'Warrior of Mercy'),
    source: 'PHB24',
    desc: b('Curandeiros mascarados que usam o mesmo toque para curar aliados ou ferir inimigos.',
      'Masked healers who use the same touch to mend allies or harm foes.'),
    levels: {
      3: { features: [
        f('handOfHarm', b('Mão do Dano', 'Hand of Harm'), b(
          "Uma vez por turno, quando você atingir uma criatura com um Golpe Desarmado e causar dano, você pode gastar 1 Ponto de Foco para causar dano Necrótico adicional igual a uma rolagem do seu dado de Artes Marciais mais seu modificador de Sabedoria.",
          "Once per turn when you hit a creature with an Unarmed Strike and deal damage, you can expend 1 Focus Point to deal extra Necrotic damage equal to one roll of your Martial Arts die plus your Wisdom modifier.")),
        f('handOfHealing', b('Mão da Cura', 'Hand of Healing'), b(
          'Ação de Magia, 1 PF: toque uma criatura; ela recupera PV iguais a uma rolagem do dado de Artes Marciais + modificador de Sabedoria. Ao usar a Rajada de Golpes, pode trocar um dos Ataques Desarmados por uma Mão da Cura sem gastar PF para a cura.',
          'Magic action, 1 Focus Point: touch a creature; it regains HP equal to one roll of your Martial Arts die plus your Wisdom modifier. When you use Flurry of Blows, you can replace one of its Unarmed Strikes with a Hand of Healing that costs no Focus Point for the healing.')),
        f('implementsOfMercy', b('Instrumentos da Misericórdia', 'Implements of Mercy'), b(
          "Característica de 3º nível do Caminho da Misericórdia\n\nVocê ganha proficiência nas perícias Intuição e Medicina, e ganha proficiência com o kit de herborismo.\n\nVocê também recebe uma máscara especial, a qual costuma usar ao utilizar as características desta subclasse. Você determina a aparência dela ou a gera aleatoriamente rolando na tabela Máscara Misericordiosa.\n\nMáscara Misericordiosa\n\n| d6 | Aparência da Máscara |\n\n| 1 | Corvo |\n\n| 2 | Branca e lisa |\n\n| 3 | Rosto chorando |\n\n| 4 | Rosto sorrindo |\n\n| 5 | Crânio |\n\n| 6 | Borboleta |",
          "3rd-level Way of Mercy feature\n\nYou gain proficiency in the Insight and Medicine skills, and you gain proficiency with the herbalism kit.\n\nYou also gain a special mask, which you often wear when using the feature of this subclass. You determine its appearance, or generate it randomly by rolling on the Merciful Mask table.\n\nMerciful Mask\n\n| d6 | Mask Appearance |\n\n| 1 | Raven |\n\n| 2 | Blank and white |\n\n| 3 | Crying visage |\n\n| 4 | Laughing visage |\n\n| 5 | Skull |\n\n| 6 | Butterfly |")),
      ], grants: { skills: ['insight', 'medicine'], tools: ['herbalismKit'] } },
      6: { features: [f('physiciansTouch', b('Toque do Médico', "Physician's Touch"), b(
        "Característica de 6º nível do Caminho da Misericórdia\n\nVocê pode ministrar curas ainda maiores com um toque e, se achar necessário, pode usar seu conhecimento para causar dano.\n\nQuando você usa Mãos da Cura em uma criatura, também pode encerrar uma doença ou uma das seguintes condições que afetam a criatura: atordoado, cego, envenenado, paralisado ou surdo.\n\nQuando você usa Mãos do Dano em uma criatura, pode sujeitar essa criatura à condição envenenado até o final do seu próximo turno.",
        "6th-level Way of Mercy feature\n\nYou can administer even greater cures with a touch, and if you feel it’s necessary, you can use your knowledge to cause harm.\n\nWhen you use Hand of Healing on a creature, you can also end one disease or one of the following conditions affecting the creature: blinded, deafened, paralyzed, poisoned, or stunned.\n\nWhen you use Hand of Harm on a creature, you can subject that creature to the poisoned condition until the end of your next turn."))] },
      11: { features: [f('flurryOfHealingAndHarm', b('Rajada de Cura e Dano', 'Flurry of Healing and Harm'), b(
        'Ao usar a Rajada de Golpes, você pode trocar cada Ataque Desarmado por uma Mão da Cura sem gastar PF, e pode aplicar a Mão do Dano num desses ataques sem gastar PF (ainda 1×/turno). Pode fazer isso um número de vezes igual ao modificador de Sabedoria (mínimo 1) por Descanso Longo.',
        'When you use Flurry of Blows, you can replace each Unarmed Strike with a Hand of Healing without spending Focus Points, and you can apply Hand of Harm to one of those strikes without spending a Focus Point (still once per turn). You can do this a number of times equal to your Wisdom modifier (minimum once) per Long Rest.'))] },
      17: { features: [f('handOfUltimateMercy', b('Mão da Misericórdia Suprema', 'Hand of Ultimate Mercy'), b(
        'Ação de Magia, 5 PF: toque o corpo de uma criatura que morreu há no máximo 24 horas. Ela volta à vida com 4d10 + modificador de Sabedoria PV e sem as condições Cego, Surdo, Paralisado, Envenenado e Atordoado. 1×/Descanso Longo.',
        'Magic action, 5 Focus Points: touch the corpse of a creature that died within the past 24 hours. It returns to life with 4d10 + your Wisdom modifier HP, free of the Blinded, Deafened, Paralyzed, Poisoned and Stunned conditions. Once per Long Rest.'))] },
    },
  },

  // PHB 2014 — mantido como opção legada nas fichas 2024 (o PHB 2024 o substitui por `elements`).
  fourelements: {
    name: b('Caminho dos Quatro Elementos', 'Way of the Four Elements'),
    source: 'PHB',
    desc: b('Usa o Foco para dobrar os elementos por meio de disciplinas elementais, várias delas equivalentes a magias.',
      'Uses Focus to bend the elements through elemental disciplines, many of them equivalent to spells.'),
    levels: {
      3: { features: [f('discipleOfTheElements', b('Discípulo dos Elementos', 'Disciple of the Elements'), b(
        'Você conhece a disciplina Sintonia Elemental (ação, sem custo: efeito sensorial inofensivo, acender ou apagar uma chama pequena, esfriar ou aquecer até 0,5 kg de material por 1 hora, ou moldar um cubo de 30 cm de terra, fogo, água ou névoa por 1 minuto, a até 9 m) e mais 1 disciplina à sua escolha; aprende outra nos níveis 6, 11 e 17 e, sempre que aprender uma, pode trocar uma já conhecida. Disciplinas que conjuram magias não pedem componentes materiais e usam a CD de Foco. A partir do nível 5, pode gastar PF extras para subir o círculo dessas magias, até um máximo de PF por magia: 2 (nív. 3–4), 3 (5–8), 4 (9–12), 5 (13–16), 6 (17–20).',
        'You know the Elemental Attunement discipline (action, no cost: a harmless sensory effect, light or snuff a small flame, chill or warm up to 1 lb of material for 1 hour, or shape a 1-ft cube of earth, fire, water or mist for 1 minute, within 30 ft) plus 1 discipline of your choice; you learn another at levels 6, 11 and 17 and, whenever you learn one, you can replace one you know. Disciplines that cast spells need no material components and use your Focus DC. From level 5 you can spend extra Focus Points to raise the spell\'s level, up to a maximum per spell: 2 (levels 3–4), 3 (5–8), 4 (9–12), 5 (13–16), 6 (17–20).'))] },
      6: { features: [f('extraElementalDiscipline6', b('Disciplina Elemental Adicional', 'Additional Elemental Discipline'), b(
        "Quando você escolhe esta tradição no 3º nível, você aprende disciplinas mágicas que canalizam o poder dos quatro elementos. Uma disciplina exige que você gaste pontos de ki a cada vez que a utiliza.\n\nVocê conhece a disciplina Sintonia Elemental e mais uma outra disciplina elemental à sua escolha, detalhadas na seção “Disciplinas Elementais” abaixo. Você aprende uma disciplina elemental adicional à sua escolha no 6º, 11º e 17º nível.\n\nSempre que você aprender uma nova disciplina elemental, você também pode substituir uma disciplina elemental que já conheça por uma disciplina diferente.\n\nConjurar Magias Elementais. Algumas disciplinas elementais permitem que você conjure magias. Para conjurar uma dessas magias, você utiliza o tempo de conjuração dela e outras regras, mas não precisa fornecer componentes materiais para ela.\n\nAo atingir o 5º nível nesta classe, você pode gastar pontos de ki adicionais para aumentar o círculo de uma magia de disciplina elemental que você conjurar, desde que a magia tenha um efeito aprimorado em um círculo superior, como mãos flamejantes tem. O círculo da magia aumenta em 1 para cada ponto de ki adicional que você gastar. Por exemplo, se você for um monge de 5º nível e usar o Golpe de Cinzas Varredor para conjurar mãos flamejantes, você pode gastar 3 pontos de ki para conjurá-la como uma magia de 2º círculo (o custo base de 2 pontos de ki da disciplina mais 1).\nmagia tem um efeito aprimorado em um círculo superior, como mãos flamejantes tem. O círculo da magia aumenta em 1 para cada ponto de ki adicional que você gastar. Por exemplo, se você for um monge de 5º nível e usar o Golpe de Cinzas Varredor para conjurar mãos flamejantes, você pode gastar 3 pontos de ki para conjurá-la como uma magia de 2º círculo (o custo base de 2 pontos de ki da disciplina mais 1).\n\nO número máximo de pontos de ki que você pode gastar para conjurar uma magia dessa forma (incluindo seu custo base em pontos de ki e quaisquer pontos de ki adicionais gastos para aumentar seu círculo) é determinado pelo seu nível de monge, conforme exibido na tabela Magias e Pontos de Ki.\n\nMAGIAS E PONTOS DE KI\n\nNíveis de Monge | Pontos de Ki Máximos para uma Magia\n\n5º—8º | 3\n\n9º—12º | 4\n\n13º—16º | 5\n\n17º—20º | 6", "When you choose this tradition at 3rd level, you learn magical disciplines that harness the power of the four elements. A discipline requires you to spend ki points each time you use it.\n\nYou know the Elemental Attunement discipline and one other elemental discipline of your choice, which are detailed in the “Elemental Disciplines” section below. You learn one additional elemental discipline of your choice at 6th, 11th, and 17th level.\n\nWhenever you learn a new elemental discipline, you can also replace one elemental discipline that you already know with a different discipline.\n\nCasting Elemental Spells. Some elemental disciplines allow you to cast spells. To cast one of these spells, you use its casting time and other rules, but you don’t need to provide material components for it.\n\nOnce you reach 5th level in this class, you can spend additional ki points to increase the level of an elemental discipline spell that you cast, provided that the spell has an enhanced effect at a higher level, as burning hands does. The spell’s level increases by 1 for each additional ki point you spend. For example, if you are a 5th-level monk and use Sweeping Cinder Strike to cast burning hands, you can spend 3 ki points to cast it as a 2nd-level spell (the discipline’s base cost of 2 ki points plus 1).\nell has an enhanced effect at a higher level, as burning hands does. The spell’s level increases by 1 for each additional ki point you spend. For example, if you are a 5th-level monk and use Sweeping Cinder Strike to cast burning hands, you can spend 3 ki points to cast it as a 2nd-level spell (the discipline’s base cost of 2 ki points plus 1).\n\nThe maximum number of ki points you can spend to cast a spell in this way (including its base ki point cost and any additional ki points you spend to increase its level) is determined by your monk level, as shown in the Spells and Ki Points table.\n\nSPELLS AND KI POINTS\n\nMonk Levels | Maximum Ki Points for a Spell\n\n5th—8th | 3\n\n9th—12th | 4\n\n13th—16th | 5\n\n17th—20th | 6"))] },
      11: { features: [f('extraElementalDiscipline11', b('Disciplina Elemental Adicional', 'Additional Elemental Discipline'), b(
        "Quando você escolhe esta tradição no 3º nível, você aprende disciplinas mágicas que canalizam o poder dos quatro elementos. Uma disciplina exige que você gaste pontos de ki a cada vez que a utiliza.\n\nVocê conhece a disciplina Sintonia Elemental e mais uma outra disciplina elemental à sua escolha, detalhadas na seção “Disciplinas Elementais” abaixo. Você aprende uma disciplina elemental adicional à sua escolha no 6º, 11º e 17º nível.\n\nSempre que você aprender uma nova disciplina elemental, você também pode substituir uma disciplina elemental que já conheça por uma disciplina diferente.\n\nConjurar Magias Elementais. Algumas disciplinas elementais permitem que você conjure magias. Para conjurar uma dessas magias, você utiliza o tempo de conjuração dela e outras regras, mas não precisa fornecer componentes materiais para ela.\n\nAo atingir o 5º nível nesta classe, você pode gastar pontos de ki adicionais para aumentar o círculo de uma magia de disciplina elemental que você conjurar, desde que a magia tenha um efeito aprimorado em um círculo superior, como mãos flamejantes tem. O círculo da magia aumenta em 1 para cada ponto de ki adicional que você gastar. Por exemplo, se você for um monge de 5º nível e usar o Golpe de Cinzas Varredor para conjurar mãos flamejantes, você pode gastar 3 pontos de ki para conjurá-la como uma magia de 2º círculo (o custo base de 2 pontos de ki da disciplina mais 1).\nmagia tem um efeito aprimorado em um círculo superior, como mãos flamejantes tem. O círculo da magia aumenta em 1 para cada ponto de ki adicional que você gastar. Por exemplo, se você for um monge de 5º nível e usar o Golpe de Cinzas Varredor para conjurar mãos flamejantes, você pode gastar 3 pontos de ki para conjurá-la como uma magia de 2º círculo (o custo base de 2 pontos de ki da disciplina mais 1).\n\nO número máximo de pontos de ki que você pode gastar para conjurar uma magia dessa forma (incluindo seu custo base em pontos de ki e quaisquer pontos de ki adicionais gastos para aumentar seu círculo) é determinado pelo seu nível de monge, conforme exibido na tabela Magias e Pontos de Ki.\n\nMAGIAS E PONTOS DE KI\n\nNíveis de Monge | Pontos de Ki Máximos para uma Magia\n\n5º—8º | 3\n\n9º—12º | 4\n\n13º—16º | 5\n\n17º—20º | 6", "When you choose this tradition at 3rd level, you learn magical disciplines that harness the power of the four elements. A discipline requires you to spend ki points each time you use it.\n\nYou know the Elemental Attunement discipline and one other elemental discipline of your choice, which are detailed in the “Elemental Disciplines” section below. You learn one additional elemental discipline of your choice at 6th, 11th, and 17th level.\n\nWhenever you learn a new elemental discipline, you can also replace one elemental discipline that you already know with a different discipline.\n\nCasting Elemental Spells. Some elemental disciplines allow you to cast spells. To cast one of these spells, you use its casting time and other rules, but you don’t need to provide material components for it.\n\nOnce you reach 5th level in this class, you can spend additional ki points to increase the level of an elemental discipline spell that you cast, provided that the spell has an enhanced effect at a higher level, as burning hands does. The spell’s level increases by 1 for each additional ki point you spend. For example, if you are a 5th-level monk and use Sweeping Cinder Strike to cast burning hands, you can spend 3 ki points to cast it as a 2nd-level spell (the discipline’s base cost of 2 ki points plus 1).\nell has an enhanced effect at a higher level, as burning hands does. The spell’s level increases by 1 for each additional ki point you spend. For example, if you are a 5th-level monk and use Sweeping Cinder Strike to cast burning hands, you can spend 3 ki points to cast it as a 2nd-level spell (the discipline’s base cost of 2 ki points plus 1).\n\nThe maximum number of ki points you can spend to cast a spell in this way (including its base ki point cost and any additional ki points you spend to increase its level) is determined by your monk level, as shown in the Spells and Ki Points table.\n\nSPELLS AND KI POINTS\n\nMonk Levels | Maximum Ki Points for a Spell\n\n5th—8th | 3\n\n9th—12th | 4\n\n13th—16th | 5\n\n17th—20th | 6"))] },
      17: { features: [f('extraElementalDiscipline17', b('Disciplina Elemental Adicional', 'Additional Elemental Discipline'), b(
        "Quando você escolhe esta tradição no 3º nível, você aprende disciplinas mágicas que canalizam o poder dos quatro elementos. Uma disciplina exige que você gaste pontos de ki a cada vez que a utiliza.\n\nVocê conhece a disciplina Sintonia Elemental e mais uma outra disciplina elemental à sua escolha, detalhadas na seção “Disciplinas Elementais” abaixo. Você aprende uma disciplina elemental adicional à sua escolha no 6º, 11º e 17º nível.\n\nSempre que você aprender uma nova disciplina elemental, você também pode substituir uma disciplina elemental que já conheça por uma disciplina diferente.\n\nConjurar Magias Elementais. Algumas disciplinas elementais permitem que você conjure magias. Para conjurar uma dessas magias, você utiliza o tempo de conjuração dela e outras regras, mas não precisa fornecer componentes materiais para ela.\n\nAo atingir o 5º nível nesta classe, você pode gastar pontos de ki adicionais para aumentar o círculo de uma magia de disciplina elemental que você conjurar, desde que a magia tenha um efeito aprimorado em um círculo superior, como mãos flamejantes tem. O círculo da magia aumenta em 1 para cada ponto de ki adicional que você gastar. Por exemplo, se você for um monge de 5º nível e usar o Golpe de Cinzas Varredor para conjurar mãos flamejantes, você pode gastar 3 pontos de ki para conjurá-la como uma magia de 2º círculo (o custo base de 2 pontos de ki da disciplina mais 1).\nmagia tem um efeito aprimorado em um círculo superior, como mãos flamejantes tem. O círculo da magia aumenta em 1 para cada ponto de ki adicional que você gastar. Por exemplo, se você for um monge de 5º nível e usar o Golpe de Cinzas Varredor para conjurar mãos flamejantes, você pode gastar 3 pontos de ki para conjurá-la como uma magia de 2º círculo (o custo base de 2 pontos de ki da disciplina mais 1).\n\nO número máximo de pontos de ki que você pode gastar para conjurar uma magia dessa forma (incluindo seu custo base em pontos de ki e quaisquer pontos de ki adicionais gastos para aumentar seu círculo) é determinado pelo seu nível de monge, conforme exibido na tabela Magias e Pontos de Ki.\n\nMAGIAS E PONTOS DE KI\n\nNíveis de Monge | Pontos de Ki Máximos para uma Magia\n\n5º—8º | 3\n\n9º—12º | 4\n\n13º—16º | 5\n\n17º—20º | 6", "When you choose this tradition at 3rd level, you learn magical disciplines that harness the power of the four elements. A discipline requires you to spend ki points each time you use it.\n\nYou know the Elemental Attunement discipline and one other elemental discipline of your choice, which are detailed in the “Elemental Disciplines” section below. You learn one additional elemental discipline of your choice at 6th, 11th, and 17th level.\n\nWhenever you learn a new elemental discipline, you can also replace one elemental discipline that you already know with a different discipline.\n\nCasting Elemental Spells. Some elemental disciplines allow you to cast spells. To cast one of these spells, you use its casting time and other rules, but you don’t need to provide material components for it.\n\nOnce you reach 5th level in this class, you can spend additional ki points to increase the level of an elemental discipline spell that you cast, provided that the spell has an enhanced effect at a higher level, as burning hands does. The spell’s level increases by 1 for each additional ki point you spend. For example, if you are a 5th-level monk and use Sweeping Cinder Strike to cast burning hands, you can spend 3 ki points to cast it as a 2nd-level spell (the discipline’s base cost of 2 ki points plus 1).\nell has an enhanced effect at a higher level, as burning hands does. The spell’s level increases by 1 for each additional ki point you spend. For example, if you are a 5th-level monk and use Sweeping Cinder Strike to cast burning hands, you can spend 3 ki points to cast it as a 2nd-level spell (the discipline’s base cost of 2 ki points plus 1).\n\nThe maximum number of ki points you can spend to cast a spell in this way (including its base ki point cost and any additional ki points you spend to increase its level) is determined by your monk level, as shown in the Spells and Ki Points table.\n\nSPELLS AND KI POINTS\n\nMonk Levels | Maximum Ki Points for a Spell\n\n5th—8th | 3\n\n9th—12th | 4\n\n13th—16th | 5\n\n17th—20th | 6"))] },
    },
  },

  // Suplementos — resumos originais, em termos de 2024 (ki → PF).
  longdeath: {
    name: b('Caminho da Morte Longa', 'Way of the Long Death'),
    source: 'SCAG',
    desc: b('Estuda a morte para drenar vitalidade dos que tomba e aterrorizar os inimigos.',
      'Studies death to draw vitality from the fallen and terrify foes.'),
    levels: {
      3: { features: [f('touchOfDeath', b('Toque da Morte', 'Touch of Death'), b(
        "A partir do momento em que escolhe esta tradição no 3º nível, seu estudo da morte permite que você extraia vitalidade de outra criatura quando ela se aproxima do seu fim. Quando você reduz uma criatura a 1,5 metro de você a 0 pontos de vida, você ganha pontos de vida temporários iguais ao seu modificador de Sabedoria + seu nível de monge (mínimo de 1 ponto de vida temporário).",
        "Starting when you choose this tradition at 3rd level, your study of death allows you to extract vitality from a nother creature as it nears its demise. When you reduce a creature within 5 feet of you to 0 hit points, you gain temporary hit points equal to your Wisdom modifier + your monk level (minimum of 1 temporary hit point)."))] },
      6: { features: [f('hourOfReaping', b('Hora da Colheita', 'Hour of Reaping'), b(
        "No 6º nível, você ganha a capacidade de perturbar ou aterrorizar aqueles ao seu redor como uma ação, pois sua alma foi tocada pela sombra da morte. Ao realizar essa ação, cada criatura a até 9 metros de você que puder vê-lo deve ser bem-sucedida em uma salvaguarda de Sabedoria ou ficará amedrontada por você até o fim do seu próximo turno.",
        "At 6th level, you gain the ability to unsettle or terrify those around you as an action, for your soul has been touched by the shadow of death. When you take this action, each creature within 30 feet of you that can see you must succeed on a Wisdom saving throw or be frightened of you until the end of your next turn."))] },
      11: { features: [f('masteryOfDeath', b('Domínio da Morte', 'Mastery of Death'), b(
        "A partir do 11º nível, você usa sua familiaridade com a morte para escapar do seu aperto. Quando você é reduzido a 0 pontos de vida, pode gastar 1 ponto de ki (nenhuma ação necessária) para, em vez disso, ficar com 1 ponto de vida.",
        "Beginning at 11th level, you use your familiarity with death to escape its grasp. When you are reduced to 0 hit points, you can expend 1 ki point (no action required) to have 1 hit point instead."))] },
      17: { features: [f('touchOfTheLongDeath', b('Toque da Morte Longa', 'Touch of the Long Death'), b(
        "A partir do 17º nível, seu toque pode canalizar a energia da morte para uma criatura. Como uma ação, você toca uma criatura a até 1,5 metro de você e gasta de 1 a 10 pontos de ki. O alvo deve fazer uma salvaguarda de Constituição e sofre 2d10 de dano necrótico por ponto de ki gasto se falhar na salvaguarda, ou metade desse dano se obtiver sucesso.",
        "Starting at 17th level, your touch can channel the energy of death into a creature. As an action, you touch one creature within 5 feet of you, and you expend 1 to 10 ki points. The target must make a Constitution saving throw, and it takes 2d10 necrotic damage per ki point spent on a failed save, or half as much damage on a successful one."))] },
    },
  },

  sunsoul: {
    name: b('Caminho da Alma Solar', 'Way of the Sun Soul'),
    source: 'XGE',
    desc: b('Transforma a energia interior em raios e explosões de luz radiante.',
      'Turns inner energy into bolts and bursts of radiant light.'),
    levels: {
      3: { features: [f('radiantSunBolt', b('Raio Solar Radiante', 'Radiant Sun Bolt'), b(
        'Você ganha um ataque à distância de magia (alcance 9 m) com proficiência, usando Destreza no ataque e dano, que causa dano radiante igual ao dado de Artes Marciais + DES. Pode usá-lo no lugar de um ataque da ação de Ataque; depois dessa ação, pode gastar 1 PF para fazer mais dois como Ação Bônus.',
        'You gain a proficient ranged spell attack (30-ft range) using Dexterity for attack and damage, dealing radiant damage equal to your Martial Arts die + DEX. You can make it in place of an attack of the Attack action; after that action, you can spend 1 Focus Point to make two more as a Bonus Action.'))] },
      6: {
        features: [f('searingArcStrike', b('Golpe do Arco Ardente', 'Searing Arc Strike'), b(
          "No 6º nível, você ganha a capacidade de canalizar seu ki em ondas abrasadoras de energia. Imediatamente após realizar a ação de Ataque em seu turno, você pode gastar 2 pontos de ki para conjurar a magia de 1º círculo mãos flamejantes como uma ação bônus.\n\nVocê pode gastar pontos de ki adicionais para conjurar mãos flamejantes como uma magia de círculo superior. Cada ponto de ki adicional que você gasta aumenta o círculo da magia em 1. O número máximo de pontos de ki (2 mais quaisquer pontos adicionais) que você pode gastar na magia é igual à metade do seu nível de monge (arredondado para baixo).",
          "At 6th level, you gain the ability to channel your ki into searing waves of energy. Immediately after you take the Attack action on your turn, you can spend 2 ki points to cast the 1st-level spell burning hands as a bonus action.\n\nYou can spend additional ki points to cast burning hands as a higher level spell. Each additional ki point you spend increases the spell's level by 1. The maximum number of ki points (2 plus any additional points) that you can spend on the spell equals half your monk level (round down)."))],
        autoSpells: ['burningHands'],
      },
      11: { features: [f('searingSunburst', b('Explosão Solar Ardente', 'Searing Sunburst'), b(
        'Ação: crie um orbe num ponto a até 45 m que explode numa esfera de 6 m de raio. Cada criatura faz salvaguarda de Constituição (CD de Foco) ou sofre 2d6 de dano radiante (sem metade). Pode gastar até 3 PF, cada um somando +2d6.',
        'Action: create an orb at a point within 150 ft that bursts in a 20-ft-radius sphere. Each creature makes a Constitution save (Focus DC) or takes 2d6 radiant damage (no half). You can spend up to 3 Focus Points, each adding +2d6.'))] },
      17: { features: [f('sunShield', b('Escudo Solar', 'Sun Shield'), b(
        'Você emite luz plena de 9 m e penumbra por mais 9 m (liga/desliga como Ação Bônus). Quando for atingido por um ataque corpo a corpo, pode usar a Reação para causar 5 + modificador de Sabedoria de dano radiante ao atacante, se a luz estiver acesa.',
        'You shed bright light in a 30-ft radius and dim light 30 ft beyond (toggle as a Bonus Action). When a melee attack hits you, you can use your Reaction to deal radiant damage equal to 5 + your Wisdom modifier to the attacker while the light is on.'))] },
    },
  },

  drunkenmaster: {
    name: b('Caminho do Mestre Bêbado', 'Way of the Drunken Master'),
    source: 'XGE',
    desc: b('Movimentos cambaleantes e imprevisíveis que confundem e redirecionam os ataques inimigos.',
      'Staggering, unpredictable moves that confuse foes and redirect their attacks.'),
    levels: {
      3: { features: [
        f('drunkenBonusProficiencies', b('Proficiências Adicionais', 'Bonus Proficiencies'), b(
          'Proficiência na perícia Atuação e com Suprimentos de Cervejeiro.',
          "Proficiency in the Performance skill and with Brewer's Supplies.")),
        f('drunkenTechnique', b('Técnica Bêbada', 'Drunken Technique'), b(
          "No 3º nível, você aprende a girar e se esquivar rapidamente como parte de sua Rajada de Golpes. Sempre que você usa Rajada de Golpes, recebe o benefício da ação de Desengajar, e seu deslocamento de caminhada aumenta em 3 metros até o final do turno atual.",
          "At 3rd level, you learn how to twist and turn quickly as part of your Flurry of Blows. Whenever you use Flurry of Blows, you gain the benefit of the Disengage action, and your walking speed increases by 10 feet until the end of the current turn.")),
      ], grants: { skills: ['performance'], tools: ['brewersSupplies'] } },
      6: { features: [f('tipsySway', b('Balanço Embriagado', 'Tipsy Sway'), b(
        'Levantar-se de Caído custa só 1,5 m de movimento. Quando uma criatura errar você com um ataque corpo a corpo, pode usar a Reação e gastar 1 PF para que o ataque atinja outra criatura a até 1,5 m do atacante, à sua escolha.',
        'Standing up from Prone costs only 5 ft of movement. When a creature misses you with a melee attack, you can use your Reaction and spend 1 Focus Point to make that attack hit another creature of your choice within 5 ft of the attacker.'))] },
      11: { features: [f('drunkardsLuck', b('Sorte do Bêbado', "Drunkard's Luck"), b(
        "A partir do 11º nível, você sempre parece dar uma guinada de sorte no momento certo. Quando fizer um teste de atributo, uma jogada de ataque ou uma salvaguarda e tiver desvantagem na jogada, você pode gastar 2 pontos de ki para cancelar a desvantagem daquela jogada.",
        "Starting at 11th level, you always seem to get a lucky bounce at the right moment. When you make an ability check, an attack roll, or a saving throw and have disadvantage on the roll, you can spend 2 ki points to cancel the disadvantage for that roll."))] },
      17: { features: [f('intoxicatedFrenzy', b('Frenesi Embriagado', 'Intoxicated Frenzy'), b(
        "No 17º nível, você ganha a capacidade de realizar uma quantidade avassaladora de ataques contra um grupo de inimigos. Quando você usa sua Rajada de Golpes, pode fazer até três ataques adicionais com ela (até um total de cinco ataques de Rajada de Golpes), desde que cada ataque da Rajada de Golpes tenha como alvo uma criatura diferente neste turno.",
        "At 17th level, you gain the ability to make an overwhelming number of attacks against a group of enemies. When you use your Flurry of Blows, you can make up to three additional attacks with it (up to a total of five Flurry of Blows attacks), provided that each Flurry of Blows attack targets a different creature this turn."))] },
    },
  },

  kensei: {
    name: b('Caminho do Kensei', 'Way of the Kensei'),
    source: 'XGE',
    desc: b('Trata algumas armas escolhidas como extensão do corpo, com precisão quase artística.',
      'Treats a few chosen weapons as extensions of the body, with near-artistic precision.'),
    levels: {
      3: { features: [f('pathOfTheKensei', b('Caminho do Kensei', 'Path of the Kensei'), b(
        'Escolha 2 armas kensei (1 corpo a corpo e 1 à distância; simples ou marciais sem Pesada nem Especial, arco longo permitido): você ganha proficiência nelas e elas contam como armas de monge. Aparar Ágil: ao fazer um Ataque Desarmado segurando uma arma kensei corpo a corpo, ganha +2 de CA até o início do próximo turno. Tiro do Kensei: Ação Bônus para que seus ataques à distância com armas kensei causem +1d4 de dano neste turno. Caminho do Pincel: proficiência com Suprimentos de Calígrafo ou de Pintor.',
        "Choose 2 kensei weapons (1 melee and 1 ranged; simple or martial without Heavy or Special, longbow allowed): you gain proficiency and they count as monk weapons. Agile Parry: when you make an Unarmed Strike while holding a melee kensei weapon, gain +2 AC until the start of your next turn. Kensei's Shot: Bonus Action to make your ranged kensei weapon attacks deal +1d4 damage this turn. Way of the Brush: proficiency with Calligrapher's or Painter's Supplies."))] },
      6: { features: [f('oneWithTheBlade', b('Um com a Lâmina', 'One with the Blade'), b(
        'Suas armas kensei contam como mágicas para superar resistências. Golpe Hábil: 1×/turno, ao acertar com uma arma kensei, gaste 1 PF para causar dano extra igual a uma rolagem do dado de Artes Marciais. Você escolhe mais 1 arma kensei.',
        'Your kensei weapons count as magical for overcoming resistance. Deft Strike: once per turn when you hit with a kensei weapon, spend 1 Focus Point to deal extra damage equal to one roll of your Martial Arts die. You choose 1 more kensei weapon.'))] },
      11: { features: [f('sharpenTheBlade', b('Afiar a Lâmina', 'Sharpen the Blade'), b(
        'Ação Bônus: gaste até 3 PF para dar a uma arma kensei que você segura bônus igual aos PF gastos em ataque e dano por 1 minuto (não funciona em arma mágica que já tenha bônus). Você escolhe mais 1 arma kensei.',
        'Bonus Action: spend up to 3 Focus Points to give a kensei weapon you hold a bonus to attack and damage equal to the points spent for 1 minute (not on a magic weapon that already has a bonus). You choose 1 more kensei weapon.'))] },
      17: { features: [f('unerringAccuracy', b('Precisão Infalível', 'Unerring Accuracy'), b(
        "No 17º nível, seu domínio das armas concede a você uma precisão extraordinária. Se errar uma jogada de ataque usando uma arma de monge em seu turno, você pode rolá-la novamente. Você pode usar esta característica apenas uma vez em cada um de seus turnos.",
        "At 17th level, your mastery of weapons grants you extraordinary accuracy. If you miss with an attack roll using a monk weapon on your turn, you can reroll it. You can use this feature only once on each of your turns."))] },
    },
  },

  astralself: {
    name: b('Caminho do Eu Astral', 'Way of the Astral Self'),
    source: 'TCE',
    desc: b('Manifesta partes de uma forma astral — braços, rosto e corpo — feitas da própria energia.',
      'Manifests parts of an astral form — arms, visage and body — made of inner energy.'),
    levels: {
      3: { features: [f('armsOfTheAstralSelf', b('Braços do Eu Astral', 'Arms of the Astral Self'), b(
        'Ação Bônus, 1 PF: invoca braços astrais por 10 minutos (terminam se ficar Incapacitado ou morrer). Ao surgirem, cada criatura escolhida a até 3 m faz salvaguarda de Destreza (CD de Foco) ou sofre dano de Força igual a duas rolagens do dado de Artes Marciais. Enquanto ativos: usa Sabedoria no lugar de Força em testes e salvaguardas de Força, e os braços podem fazer Ataques Desarmados com +1,5 m de alcance, usando Sabedoria no ataque e dano, causando dano de Força.',
        'Bonus Action, 1 Focus Point: summon astral arms for 10 minutes (they end if you are Incapacitated or die). When they appear, each chosen creature within 10 ft makes a Dexterity save (Focus DC) or takes Force damage equal to two rolls of your Martial Arts die. While active: use Wisdom instead of Strength for Strength checks and saves, and the arms can make Unarmed Strikes with +5 ft reach, using Wisdom for attack and damage and dealing Force damage.'))] },
      6: { features: [f('visageOfTheAstralSelf', b('Semblante do Eu Astral', 'Visage of the Astral Self'), b(
        'Ação Bônus, 1 PF: invoca um rosto astral por 10 minutos. Enquanto ativo: enxerga normalmente até 36 m em qualquer escuridão, mágica ou não; tem Vantagem em testes de Intuição e Intimidação; e pode fazer sua voz ser ouvida só por uma criatura a até 18 m ou amplificá-la para ser ouvida a até 180 m.',
        'Bonus Action, 1 Focus Point: summon an astral visage for 10 minutes. While active: see normally within 120 ft through any darkness, magical or not; Advantage on Insight and Intimidation checks; and you can make your voice heard only by one creature within 60 ft or amplify it to be heard up to 600 ft away.'))] },
      11: { features: [f('bodyOfTheAstralSelf', b('Corpo do Eu Astral', 'Body of the Astral Self'), b(
        'Com os braços e o semblante ativos: ao sofrer dano ácido, de frio, de fogo, de Força, elétrico ou trovejante, use a Reação para reduzi-lo em 1d10 + modificador de Sabedoria; e, 1×/turno, um acerto com os braços astrais causa +1 dado de Artes Marciais.',
        'With both arms and visage active: when you take acid, cold, fire, Force, lightning or thunder damage, use your Reaction to reduce it by 1d10 + your Wisdom modifier; and once per turn an astral-arm hit deals an extra Martial Arts die.'))] },
      17: { features: [f('awakenedAstralSelf', b('Eu Astral Desperto', 'Awakened Astral Self'), b(
        "Característica de 17º nível do Caminho do Eu Astral\n\nSua conexão com seu eu astral está completa, permitindo que você libere todo o potencial dele. Como uma ação bônus, você pode gastar 5 pontos de ki para invocar os braços, semblante e corpo do seu eu astral e despertá-lo por 10 minutos. Este despertar termina mais cedo se você ficar incapacitado ou morrer.\n\nEnquanto seu eu astral estiver desperto, você recebe os seguintes benefícios:\n\nArmadura do Espírito. Você ganha um bônus de +2 na Classe de Armadura.\n\nBarragem Astral. Sempre que você usar a característica Ataque Extra para atacar duas vezes, pode, em vez disso, atacar três vezes se todos os ataques forem feitos com seus braços astrais.",
        "17th-level Way of the Astral Self feature\n\nYour connection to your astral self is complete, allowing you to unleash its full potential. As a bonus action, you can spend 5 ki points to summon the arms, visage, adn body of your astral self and awaken it for 10 minutes. This awakening ends early if you are incapacitated or die.\n\nWhile your astral self is awakened, you gain the following benefits:\n\nArmor of the Spirit. You gain a +2 bonus to Armor Class.\n\nAstral Barrage. Whenever you use the Extra Attack feature to attack twice, you can instead attack three times if all the attacks are made with your astral arms."))] },
    },
  },

  ascendantdragon: {
    name: b('Caminho do Dragão Ascendente', 'Way of the Ascendant Dragon'),
    source: 'FTD',
    desc: b('Imita os dragões: golpes elementais, sopro, asas espectrais e uma aura aterradora.',
      'Emulates dragons: elemental strikes, breath, spectral wings and a fearsome aura.'),
    levels: {
      3: { features: [
        f('draconicDisciple', b('Discípulo Dracônico', 'Draconic Disciple'), b(
          'Ao acertar um Ataque Desarmado, pode trocar o tipo de dano para ácido, frio, fogo, elétrico ou venenoso. Presença Dracônica: ao falhar num teste de Intimidação ou Persuasão, use a Reação para rolar de novo; se passar, não pode repetir até um Descanso Longo. Você aprende Dracônico ou outro idioma à sua escolha.',
          'When you hit with an Unarmed Strike, you can change its damage type to acid, cold, fire, lightning or poison. Draconic Presence: when you fail an Intimidation or Persuasion check, use your Reaction to reroll it; if it then succeeds, you can\'t do so again until a Long Rest. You learn Draconic or another language of your choice.')),
        f('breathOfTheDragon', b('Sopro do Dragão', 'Breath of the Dragon'), b(
          'Troque um ataque da ação de Ataque por um sopro em cone de 6 m ou linha de 9 m × 1,5 m, do tipo ácido, frio, fogo, elétrico ou venenoso. Cada criatura faz salvaguarda de Destreza (CD de Foco) e sofre duas rolagens do dado de Artes Marciais (três a partir do nível 11); metade se passar. Usos grátis = Bônus de Proficiência por Descanso Longo; depois, 2 PF por uso.',
          'Replace one attack of the Attack action with a 20-ft cone or 30-ft-by-5-ft line breath of acid, cold, fire, lightning or poison. Each creature makes a Dexterity save (Focus DC), taking two rolls of your Martial Arts die (three from level 11); half on a success. Free uses equal your Proficiency Bonus per Long Rest; after that, 2 Focus Points per use.')),
      ] },
      6: { features: [f('wingsUnfurled', b('Asas Desdobradas', 'Wings Unfurled'), b(
        "Característica de 6º Nível do Caminho do Dragão Ascendente\n\nQuando você usa seu Passo do Vento, pode desdobrar asas dracônicas espectrais de suas costas que desaparecem no final do seu turno. Enquanto as asas existirem, você tem um deslocamento de voo igual ao seu deslocamento de caminhada.\n\nVocê pode usar esta característica um número de vezes igual ao seu bônus de proficiência e recupera todos os usos gastos ao terminar um descanso longo.",
        "6th-Level Way of the Ascendant Dragon Feature\n\nWhen you use your Step of the Wind, you can unfurl spectral draconic wings from your back that vanish at the end of your turn. While the wings exist, you have a flying speed equal to your walking speed.\n\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."))] },
      11: { features: [f('aspectOfTheWyrm', b('Aspecto do Wyrm', 'Aspect of the Wyrm'), b(
        'Ação Bônus: cria uma aura de 3 m por 1 minuto com um destes efeitos: Presença Amedrontadora (ao criar a aura e depois como Ação Bônus, uma criatura na aura faz salvaguarda de Sabedoria ou fica Amedrontada por 1 minuto, repetindo no fim de cada turno) ou Resistência (você e aliados na aura resistem a um tipo entre ácido, frio, fogo, elétrico ou venenoso). 1×/Descanso Longo, ou 3 PF para usar de novo.',
        'Bonus Action: create a 10-ft aura for 1 minute with one effect: Frightful Presence (when created and later as a Bonus Action, one creature in the aura makes a Wisdom save or is Frightened for 1 minute, repeating at the end of each turn) or Resistance (you and allies in the aura resist one of acid, cold, fire, lightning or poison). Once per Long Rest, or 3 Focus Points to use again.'))] },
      17: { features: [f('ascendantAspect', b('Aspecto Ascendente', 'Ascendant Aspect'), b(
        'Sopro Aumentado: ao usar o Sopro do Dragão, gaste 1 PF para um cone de 18 m ou linha de 27 m × 1,5 m com quatro rolagens do dado de Artes Marciais. Percepção às cegas de 3 m. Fúria Explosiva: ao ativar o Aspecto do Wyrm, criaturas escolhidas na aura fazem salvaguarda de Destreza ou sofrem 3d10 de dano do tipo escolhido.',
        'Augment Breath: when you use Breath of the Dragon, spend 1 Focus Point for a 60-ft cone or 90-ft-by-5-ft line dealing four rolls of your Martial Arts die. 10-ft Blindsight. Explosive Fury: when you activate Aspect of the Wyrm, chosen creatures in the aura make a Dexterity save or take 3d10 damage of a chosen type.'))] },
    },
  },
};

// ---------------------------------------------------------------------------

const SUBCLASS_CHOICES = {
  fourelements: { 3: { elementalDiscipline: 1 }, 6: { elementalDiscipline: 1 }, 11: { elementalDiscipline: 1 }, 17: { elementalDiscipline: 1 } },
  // Nível 3: 1 arma corpo a corpo + 1 à distância (pools filtrados); depois, qualquer uma.
  kensei: { 3: { kenseiWeaponMelee: 1, kenseiWeaponRanged: 1, kenseiBrush: 1 }, 6: { kenseiWeapon: 1 }, 11: { kenseiWeapon: 1 }, 17: { kenseiWeapon: 1 } },
  ascendantdragon: { 3: { dragonLanguage: 1 } },
};
const LEGACY_SUBCLASS_CHOICES = {
  ...SUBCLASS_CHOICES,
  mercy: { 3: { subclassProficiencies: 1 } },
  drunkenmaster: { 3: { subclassProficiencies: 1 } },
};

// Recursos com usos (formato em README.md). O dado de Artes Marciais vai em `die`
// dos Pontos de Foco (2024) / Ki (2014); no nível 1 ele só aparece no texto do traço.
const r = (id, pt, en, descPt, descEn, extra) => ({ id, name: b(pt, en), desc: b(descPt, descEn), ...extra });
const resources = [
  r('focusPoints', 'Pontos de Foco', 'Focus Points',
    'PF = nível de monge; CD de Foco = 8 + BP + SAB. Dado = dado de Artes Marciais.',
    'FP = Monk level; Focus DC = 8 + PB + WIS. Die = Martial Arts die.',
    { uses: { classLevel: true }, recharge: 'short', minLevel: 2, rules: '2024', die: { byLevel: { 1: 'd6', 5: 'd8', 11: 'd10', 17: 'd12' } } }),
  r('ki', 'Pontos de Ki', 'Ki Points',
    'Ki = nível de monge; CD de ki = 8 + BP + SAB. Dado = dado de Artes Marciais.',
    'Ki = Monk level; ki save DC = 8 + PB + WIS. Die = Martial Arts die.',
    { uses: { classLevel: true }, recharge: 'short', minLevel: 2, rules: '2014', die: { byLevel: { 1: 'd4', 5: 'd6', 11: 'd8', 17: 'd10' } } }),
  r('uncannyMetabolism', 'Metabolismo Incomum', 'Uncanny Metabolism',
    'Ao rolar Iniciativa: recupera todos os PF e cura dado marcial + nível.', 'On Initiative: regain all FP and heal Martial Arts die + level.',
    { uses: { fixed: 1 }, recharge: 'long', minLevel: 2, rules: '2024' }),
  r('wholenessOfBody', 'Integridade do Corpo', 'Wholeness of Body',
    'Ação Bônus: cura dado marcial + SAB.', 'Bonus Action: heal Martial Arts die + WIS.',
    { uses: { ability: 'wis', min: 1 }, recharge: 'long', minLevel: 6, subclass: ['openhand', 'openHand'], rules: '2024' }),
  r('wholenessOfBody2014', 'Integridade do Corpo', 'Wholeness of Body',
    'Ação: cura 3 × nível de monge.', 'Action: heal 3 × Monk level.',
    { uses: { fixed: 1 }, recharge: 'long', minLevel: 6, subclass: ['openhand', 'openHand'], rules: '2014' }),
  r('flurryOfHealingAndHarm', 'Rajada de Cura e Dano', 'Flurry of Healing and Harm',
    'Rajada com curas e Mão do Dano sem gastar PF.', 'Flurry with free heals and Hand of Harm.',
    { uses: { ability: 'wis', min: 1 }, recharge: 'long', minLevel: 11, subclass: ['mercy'], rules: '2024' }),
  r('handOfUltimateMercy', 'Mão da Misericórdia Suprema', 'Hand of Ultimate Mercy',
    'Revive uma criatura morta há até 24 h (5 PF/ki).', 'Revive a creature dead up to 24 h (5 FP/ki).',
    { uses: { fixed: 1 }, recharge: 'long', minLevel: 17, subclass: ['mercy'] }),
  r('draconicPresence', 'Presença Dracônica', 'Draconic Presence',
    'Rola de novo Intimidação/Persuasão; só gasta se virar sucesso.', 'Reroll Intimidation/Persuasion; spent only if it succeeds.',
    { uses: { fixed: 1 }, recharge: 'long', minLevel: 3, subclass: ['ascendantdragon'] }),
  r('breathOfTheDragon', 'Sopro do Dragão', 'Breath of the Dragon',
    'Usos grátis; depois, 2 PF/ki por uso.', 'Free uses; after that, 2 FP/ki per use.',
    { uses: { profBonus: true }, recharge: 'long', minLevel: 3, subclass: ['ascendantdragon'] }),
  r('wingsUnfurled', 'Asas Desdobradas', 'Wings Unfurled',
    'Voo ao usar o Passo do Vento.', 'Fly when using Step of the Wind.',
    { uses: { profBonus: true }, recharge: 'long', minLevel: 6, subclass: ['ascendantdragon'] }),
  r('aspectOfTheWyrm', 'Aspecto do Wyrm', 'Aspect of the Wyrm',
    'Aura de 1 minuto; usos extras custam 3 PF/ki.', '1-minute aura; extra uses cost 3 FP/ki.',
    { uses: { fixed: 1 }, recharge: 'long', minLevel: 11, subclass: ['ascendantdragon'] }),
];

export default {
  classId: 'monk',
  resources,

  pools: {
    tool: {
      name: b('Ferramenta ou Instrumento do Monge', 'Monk Tool or Instrument'),
      startingClassOnly: true,
      options: tools,
    },
    elementalDiscipline: {
      name: b('Disciplinas Elementais', 'Elemental Disciplines'),
      swapOnLevelUp: 1,
      swapLevels: [6, 11, 17],
      options: disciplines,
    },
    kenseiWeapon: {
      name: b('Armas Kensei', 'Kensei Weapons'),
      options: kenseiWeapons,
    },
    kenseiWeaponMelee: {
      name: b('Arma Kensei (corpo a corpo)', 'Kensei Weapon (melee)'),
      options: kenseiWeapons, filter: { melee: true },
    },
    kenseiWeaponRanged: {
      name: b('Arma Kensei (à distância)', 'Kensei Weapon (ranged)'),
      options: kenseiWeapons, filter: { melee: false },
    },
    kenseiBrush: {
      name: b('Caminho do Pincel', 'Way of the Brush'),
      options: [
        { id: 'calligraphersSupplies', name: b('Suprimentos de Calígrafo', "Calligrapher's Supplies"), source: 'XGE',
          desc: b('Proficiência com Suprimentos de Calígrafo.', "Proficiency with Calligrapher's Supplies."),
          grants: { tools: ['calligraphersSupplies'] } },
        { id: 'paintersSupplies', name: b('Suprimentos de Pintor', "Painter's Supplies"), source: 'XGE',
          desc: b('Proficiência com Suprimentos de Pintor.', "Proficiency with Painter's Supplies."),
          grants: { tools: ['paintersSupplies'] } },
      ],
    },
    // Só fichas 2014: lá as tradições vêm do catálogo legado (sem `grants`), então as
    // proficiências fixas ficam como escolha única. Em 2024 vêm de `grants` nos níveis.
    subclassProficiencies: {
      name: b('Proficiências da Tradição', 'Tradition Proficiencies'),
      options: [
        { id: 'implementsOfMercy', name: b('Instrumentos da Misericórdia', 'Implements of Mercy'), source: 'PHB24',
          desc: b("Característica de 3º nível do Caminho da Misericórdia\n\nVocê ganha proficiência nas perícias Intuição e Medicina, e ganha proficiência com o kit de herborismo.\n\nVocê também recebe uma máscara especial, a qual costuma usar ao utilizar as características desta subclasse. Você determina a aparência dela ou a gera aleatoriamente rolando na tabela Máscara Misericordiosa.\n\nMáscara Misericordiosa\n\n| d6 | Aparência da Máscara |\n\n| 1 | Corvo |\n\n| 2 | Branca e lisa |\n\n| 3 | Rosto chorando |\n\n| 4 | Rosto sorrindo |\n\n| 5 | Crânio |\n\n| 6 | Borboleta |", "3rd-level Way of Mercy feature\n\nYou gain proficiency in the Insight and Medicine skills, and you gain proficiency with the herbalism kit.\n\nYou also gain a special mask, which you often wear when using the feature of this subclass. You determine its appearance, or generate it randomly by rolling on the Merciful Mask table.\n\nMerciful Mask\n\n| d6 | Mask Appearance |\n\n| 1 | Raven |\n\n| 2 | Blank and white |\n\n| 3 | Crying visage |\n\n| 4 | Laughing visage |\n\n| 5 | Skull |\n\n| 6 | Butterfly |"),
          prereq: { subclass: ['mercy'] }, grants: { skills: ['insight', 'medicine'], tools: ['herbalismKit'] } },
        { id: 'drunkenBonusProficiencies', name: b('Proficiências do Mestre Bêbado', 'Drunken Master Proficiencies'), source: 'XGE',
          desc: b("Quando você escolhe esta tradição no 3º nível, ganha proficiência na perícia Atuação se ainda não a possuir. Sua técnica de artes marciais combina treinamento de combate com a precisão de um dançarino e as palhaçadas de um bufão. Você também ganha proficiência com suprimentos de cervejeiro se ainda não a possuir.", "When you choose this tradition at 3rd level, you gain proficiency in the Performance skill if you don’t already have it. Your martial arts technique mixes combat training with the precision of a dancer and the antics of a jester. You also gain proficiency with brewer’s supplies if you don’t already have it."),
          prereq: { subclass: ['drunkenmaster'] }, grants: { skills: ['performance'], tools: ['brewersSupplies'] } },
      ],
    },
    dragonLanguage: {
      name: b('Idioma do Discípulo Dracônico', 'Draconic Disciple Language'),
      kind: 'language',
      grantAs: 'language',
    },
  },

  // Nível 1: 1 ferramenta de artesão ou instrumento (só na classe inicial).
  choices: { 1: { tool: 1 } },
  legacyChoices: { 1: { tool: 1 } },
  subclassChoices: SUBCLASS_CHOICES,
  legacySubclassChoices: LEGACY_SUBCLASS_CHOICES,

  // Classe base 2024 — SRD 5.2.1 (CC-BY), texto revisado.
  features: {
    1: [
      f('martialArts', b('Artes Marciais', 'Martial Arts'), b(
        'Armas de monge: armas corpo a corpo Simples e armas corpo a corpo Marciais com a propriedade Leve. Enquanto estiver desarmado ou empunhando só armas de monge, sem armadura e sem Escudo: Ataque Desarmado Bônus (faça um Ataque Desarmado como Ação Bônus); Dado de Artes Marciais (role 1d6 no lugar do dano normal do Ataque Desarmado ou da arma de monge — vira 1d8 no nível 5, 1d10 no 11 e 1d12 no 17); Ataques Destros (use Destreza no lugar de Força no ataque e dano desses ataques e na CD de Agarrar ou Empurrar do Ataque Desarmado).',
        'Monk weapons: Simple Melee weapons and Martial Melee weapons with the Light property. While unarmed or wielding only Monk weapons and not wearing armor or wielding a Shield: Bonus Unarmed Strike (make an Unarmed Strike as a Bonus Action); Martial Arts Die (roll 1d6 in place of the normal damage of your Unarmed Strike or Monk weapons — it becomes 1d8 at level 5, 1d10 at 11 and 1d12 at 17); Dexterous Attacks (use Dexterity instead of Strength for the attack and damage rolls of those attacks and for the save DC of your Grapple or Shove).')),
      f('unarmoredDefense', b('Defesa sem Armadura', 'Unarmored Defense'), b(
        'Sem armadura e sem Escudo, sua CA base é 10 + modificador de Destreza + modificador de Sabedoria.',
        "While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers.")),
    ],
    2: [
      f('monksFocus', b('Foco do Monge', "Monk's Focus"), b(
        'Você tem Pontos de Foco (PF) iguais ao seu nível de monge e recupera todos ao terminar um Descanso Curto ou Longo. CD de Foco = 8 + modificador de Sabedoria + Bônus de Proficiência. Rajada de Golpes: 1 PF para fazer dois Ataques Desarmados como Ação Bônus. Defesa Paciente: Desengajar como Ação Bônus; ou 1 PF para Desengajar e Esquivar como Ação Bônus. Passo do Vento: Disparada como Ação Bônus; ou 1 PF para Desengajar e Disparada como Ação Bônus, com a distância de salto dobrada no turno.',
        'You have Focus Points equal to your Monk level and regain all of them when you finish a Short or Long Rest. Focus save DC = 8 + your Wisdom modifier + Proficiency Bonus. Flurry of Blows: 1 FP to make two Unarmed Strikes as a Bonus Action. Patient Defense: Disengage as a Bonus Action; or 1 FP to Disengage and Dodge as a Bonus Action. Step of the Wind: Dash as a Bonus Action; or 1 FP to Disengage and Dash as a Bonus Action, with your jump distance doubled for the turn.')),
      f('unarmoredMovement', b('Movimento sem Armadura', 'Unarmored Movement'), b(
        "Seu deslocamento aumenta em 3 metros enquanto você não estiver vestindo armadura nem empunhando um Escudo. Esse bônus aumenta quando você alcança determinados níveis de Monge, conforme mostrado na tabela Características de Monge.",
        "Your speed increases by 10 feet while you aren't wearing armor or wielding a Shield. This bonus increases when you reach certain Monk levels, as shown on the Monk Features table.")),
      f('uncannyMetabolism', b('Metabolismo Incomum', 'Uncanny Metabolism'), b(
        "Ao rolar Iniciativa, você pode recuperar todos os Pontos de Foco gastos. Ao fazer isso, role seu dado de Artes Marciais e recupere um número de Pontos de Vida igual ao seu nível de Monge mais o número rolado.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.",
        "When you roll Initiative, you can regain all expended Focus Points. When you do so, roll your Martial Arts die, and regain a number of Hit Points equal to your Monk level plus the number rolled.\n\nOnce you use this feature, you can't use it again until you finish a Long Rest.")),
    ],
    3: [
      f('deflectAttacks', b('Desviar Ataques', 'Deflect Attacks'), b(
        'Quando uma jogada de ataque atinge você e o dano inclui Contundente, Perfurante ou Cortante, use a Reação para reduzir o dano total em 1d10 + modificador de Destreza + nível de monge. Se reduzir a 0, pode gastar 1 PF para redirecionar a força: uma criatura que você veja a até 1,5 m (ataque corpo a corpo) ou a até 18 m e sem Cobertura Total (ataque à distância) faz salvaguarda de Destreza ou sofre duas rolagens do dado de Artes Marciais + modificador de Destreza, do mesmo tipo do ataque.',
        'When an attack roll hits you and its damage includes Bludgeoning, Piercing or Slashing, take a Reaction to reduce the total damage by 1d10 + your Dexterity modifier + Monk level. If you reduce it to 0, you can spend 1 Focus Point to redirect the force: a creature you can see within 5 ft (melee attack) or within 60 ft and not behind Total Cover (ranged attack) makes a Dexterity save or takes two rolls of your Martial Arts die + your Dexterity modifier, of the same type as the attack.')),
      f('monkSubclass', b('Subclasse de Monge', 'Monk Subclass'), b(
        "Você ganha uma subclasse de Monge à sua escolha. A subclasse Guerreiro da Mão Aberta é detalhada após a descrição desta classe. Uma subclasse é uma especialização que concede características a você em determinados níveis de Monge. Pelo restante da sua carreira, você ganha cada uma das características da sua subclasse que sejam de seu nível de Monge ou inferior.",
        "You gain a Monk subclass of your choice. The Warrior of the Open Hand subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Monk levels. For the rest of your career, you gain each of your subclass's features that are of your Monk level or lower.")),
    ],
    4: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
        "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Monge 8, 12 e 16.",
        "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Monk levels 8, 12, and 16.")),
      f('slowFall', b('Queda Lenta', 'Slow Fall'), b(
        "Você pode realizar uma Reação ao cair para reduzir qualquer dano que sofrer da queda em uma quantidade igual a cinco vezes o seu nível de Monge.",
        "You can take a Reaction when you fall to reduce any damage you take from the fall by an amount equal to five times your Monk level.")),
    ],
    5: [
      f('extraAttack', b('Ataque Extra', 'Extra Attack'), b(
        'Você ataca duas vezes, em vez de uma, sempre que usa a ação de Ataque no seu turno.',
        'You can attack twice instead of once whenever you take the Attack action on your turn.')),
      f('stunningStrike', b('Golpe Atordoante', 'Stunning Strike'), b(
        '1×/turno, ao acertar uma criatura com uma arma de monge ou Ataque Desarmado, gaste 1 PF: o alvo faz salvaguarda de Constituição. Se falhar, fica Atordoado até o início do seu próximo turno. Se passar, seu deslocamento cai pela metade e o próximo ataque contra ele antes disso tem Vantagem.',
        'Once per turn when you hit a creature with a Monk weapon or Unarmed Strike, spend 1 Focus Point: the target makes a Constitution save. On a failure it is Stunned until the start of your next turn. On a success its Speed is halved and the next attack roll against it before then has Advantage.')),
    ],
    6: [
      f('empoweredStrikes', b('Golpes Fortalecidos', 'Empowered Strikes'), b(
        "Sempre que você causar dano com seu Golpe Desarmado, ele poderá causar o tipo de dano normal ou dano de Energia, à sua escolha.",
        "Whenever you deal damage with your Unarmed Strike, it can deal your choice of Force damage or its normal damage type.")),
    ],
    7: [
      f('evasion', b('Evasão', 'Evasion'), b(
        "Quando você for alvo de um efeito que permita fazer uma salvaguarda de Destreza para sofrer apenas metade do dano, em vez disso, você não sofrerá dano se obtiver sucesso na salvaguarda e sofrerá apenas metade do dano se falhar.\n\nVocê não se beneficia desta característica se tiver a condição Incapacitado.",
        "When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail.\n\nYou don't benefit from this feature if you have the Incapacitated condition.")),
    ],
    8: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
        "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Monge 8, 12 e 16.",
        "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Monk levels 8, 12, and 16.")),
    ],
    9: [
      f('acrobaticMovement', b('Movimento Acrobático', 'Acrobatic Movement'), b(
        "Enquanto não estiver vestindo armadura nem empunhando um Escudo, você adquire a habilidade de se mover por superfícies verticais e através de líquidos no seu turno sem cair durante o movimento.",
        "While you aren't wearing armor or wielding a Shield, you gain the ability to move along vertical surfaces and across liquids on your turn without falling during the movement.")),
    ],
    10: [
      f('heightenedFocus', b('Foco Elevado', 'Heightened Focus'), b(
        'Rajada de Golpes: com 1 PF faz três Ataques Desarmados em vez de dois. Defesa Paciente: ao gastar 1 PF, ganha PV temporários iguais a duas rolagens do dado de Artes Marciais. Passo do Vento: ao gastar 1 PF, pode levar consigo uma criatura voluntária Grande ou menor a até 1,5 m até o fim do turno, sem provocar Ataques de Oportunidade.',
        'Flurry of Blows: for 1 FP make three Unarmed Strikes instead of two. Patient Defense: when you spend 1 FP, gain Temporary HP equal to two rolls of your Martial Arts die. Step of the Wind: when you spend 1 FP, you can carry a willing Large or smaller creature within 5 ft with you until the end of your turn without provoking Opportunity Attacks.')),
      f('selfRestoration', b('Autorrestauração', 'Self-Restoration'), b(
        "Pela pura força de vontade, você pode remover uma das seguintes condições de si mesmo no final de cada um dos seus turnos: Enfeitiçado, Amedrontado ou Envenenado.\n\nAlém disso, privar-se de comida e bebida não causa a você níveis de Exaustão.",
        "Through sheer force of will, you can remove one of the following conditions from yourself at the end of each of your turns: Charmed, Frightened, or Poisoned.\n\nIn addition, forgoing food and drink doesn't give you levels of Exhaustion.")),
    ],
    12: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
        "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Monge 8, 12 e 16.",
        "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Monk levels 8, 12, and 16.")),
    ],
    13: [
      f('deflectEnergy', b('Desviar Energia', 'Deflect Energy'), b(
        "Agora você pode usar sua característica Defletir Ataques contra ataques que causem qualquer tipo de dano, não apenas Contundente, Perfurante ou Cortante.",
        "You can now use your Deflect Attacks feature against attacks that deal any damage type, not just Bludgeoning, Piercing, or Slashing.")),
    ],
    14: [
      f('disciplinedSurvivor', b('Sobrevivente Disciplinado', 'Disciplined Survivor'), b(
        "Sua disciplina física e mental concede a você proficiência em todas as salvaguardas.\n\nAdicionalmente, sempre que fizer uma salvaguarda e falhar, você pode gastar 1 Ponto de Foco para jogá-la novamente, e você deve usar a nova jogada.",
        "Your physical and mental discipline grant you proficiency in all saving throws.\n\nAdditionally, whenever you make a saving throw and fail, you can expend 1 Focus Point to reroll it, and you must use the new roll.")),
    ],
    15: [
      f('perfectFocus', b('Foco Perfeito', 'Perfect Focus'), b(
        'Ao rolar Iniciativa sem usar o Metabolismo Incomum, se tiver 3 PF ou menos, recupera PF até ficar com 4.',
        "When you roll Initiative and don't use Uncanny Metabolism, you regain expended Focus Points until you have 4 if you have 3 or fewer.")),
    ],
    16: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
        "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Monge 8, 12 e 16.",
        "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Monk levels 8, 12, and 16.")),
    ],
    18: [
      f('superiorDefense', b('Defesa Superior', 'Superior Defense'), b(
        "No início do seu turno, você pode gastar 3 Pontos de Foco para proteger a si mesmo contra danos por 1 minuto ou até ter a condição Incapacitado. Durante esse tempo, você tem Resistência a todo dano, exceto dano de Energia.",
        "At the start of your turn, you can expend 3 Focus Points to bolster yourself against harm for 1 minute or until you have the Incapacitated condition. During that time, you have Resistance to all damage except Force damage.")),
    ],
    19: [
      f('epicBoon', b('Dádiva Épica', 'Epic Boon'), b(
        "Você ganha um talento de Dádiva Épica (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Dádiva da Ofensiva Irresistível é recomendada.",
        "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Irresistible Offense is recommended.")),
    ],
    20: [
      f('bodyAndMind', b('Corpo e Mente', 'Body and Mind'), b(
        "Você desenvolveu seu corpo e sua mente a novos patamares. Seus valores de Destreza e Sabedoria aumentam em 4, até um máximo de 25.",
        "You have developed your body and mind to new heights. Your Dexterity and Wisdom scores increase by 4, to a maximum of 25.")),
    ],
  },

  subclasses,
};
