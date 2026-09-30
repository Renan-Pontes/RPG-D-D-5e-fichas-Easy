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
    '1 PF na ação de Ataque: até o fim do turno, seus golpes desarmados ganham +3 m de alcance e causam dano de fogo; ao acertar, +1 PF adiciona 1d10 de fogo.',
    '1 FP on the Attack action: until the end of the turn, your unarmed strikes gain +10 ft reach and deal fire damage; on a hit, +1 FP adds 1d10 fire.'),
  disc('fistOfFourThunders', 'Punho dos Quatro Trovões', 'Fist of Four Thunders', 3,
    '2 PF: conjura Onda Trovejante.', '2 FP: cast Thunderwave.', ['thunderwave']),
  disc('fistOfUnbrokenAir', 'Punho do Ar Inquebrável', 'Fist of Unbroken Air', 3,
    'Ação, 2 PF: rajada de ar contra uma criatura a até 9 m. Salvaguarda de FOR ou sofre 3d10 contundente (+1d10 por PF extra), é empurrada 6 m e cai Caída; metade do dano se passar.',
    'Action, 2 FP: a blast of air at a creature within 30 ft. STR save or take 3d10 bludgeoning (+1d10 per extra FP), be pushed 20 ft and knocked Prone; half damage on a success.'),
  disc('rushOfTheGaleSpirits', 'Investida dos Espíritos do Vendaval', 'Rush of the Gale Spirits', 3,
    '2 PF: conjura Lufada de Vento.', '2 FP: cast Gust of Wind.', ['gustOfWind']),
  disc('shapeTheFlowingRiver', 'Moldar o Rio Corrente', 'Shape the Flowing River', 3,
    'Ação, 1 PF: remodela água e gelo num cubo de até 9 m de lado a até 36 m (congela, derrete, abre valas, ergue colunas). Não serve para prender nem ferir criaturas.',
    'Action, 1 FP: reshape water and ice in an area up to 30 ft on a side within 120 ft (freeze, thaw, dig trenches, raise columns). Cannot trap or harm creatures.'),
  disc('sweepingCinderStrike', 'Golpe de Cinzas Arrebatador', 'Sweeping Cinder Strike', 3,
    '2 PF: conjura Mãos Flamejantes.', '2 FP: cast Burning Hands.', ['burningHands']),
  disc('waterWhip', 'Chicote d\'Água', 'Water Whip', 3,
    'Ação, 2 PF: chicote d\'água contra uma criatura a até 9 m. Salvaguarda de DES ou sofre 3d10 contundente (+1d10 por PF extra) e, à sua escolha, cai Caída ou é puxada até 7,5 m; metade do dano se passar.',
    'Action, 2 FP: a whip of water at a creature within 30 ft. DEX save or take 3d10 bludgeoning (+1d10 per extra FP) and be knocked Prone or pulled up to 25 ft (your choice); half damage on a success.'),
  disc('clenchOfTheNorthWind', 'Aperto do Vento Norte', 'Clench of the North Wind', 6,
    '3 PF: conjura Imobilizar Pessoa.', '3 FP: cast Hold Person.', ['holdPerson']),
  disc('gongOfTheSummit', 'Gongo do Cume', 'Gong of the Summit', 6,
    '3 PF: conjura Despedaçar.', '3 FP: cast Shatter.', ['shatter']),
  disc('flamesOfThePhoenix', 'Chamas da Fênix', 'Flames of the Phoenix', 11,
    '4 PF: conjura Bola de Fogo.', '4 FP: cast Fireball.', ['fireball']),
  disc('mistStance', 'Postura da Névoa', 'Mist Stance', 11,
    '4 PF: conjura Forma Gasosa, só em você.', '4 FP: cast Gaseous Form, targeting only yourself.', ['gaseousForm']),
  disc('rideTheWind', 'Cavalgar o Vento', 'Ride the Wind', 11,
    '4 PF: conjura Voo, só em você.', '4 FP: cast Fly, targeting only yourself.', ['fly']),
  disc('breathOfWinter', 'Sopro do Inverno', 'Breath of Winter', 17,
    '6 PF: conjura Cone de Frio.', '6 FP: cast Cone of Cold.', ['coneOfCold']),
  disc('eternalMountainDefense', 'Defesa da Montanha Eterna', 'Eternal Mountain Defense', 17,
    '5 PF: conjura Pele de Pedra, só em você.', '5 FP: cast Stoneskin, targeting only yourself.', ['stoneskin']),
  disc('riverOfHungryFlame', 'Rio de Chamas Famintas', 'River of Hungry Flame', 17,
    '5 PF: conjura Muralha de Fogo.', '5 FP: cast Wall of Fire.', ['wallOfFire']),
  disc('waveOfRollingEarth', 'Onda de Terra Rolante', 'Wave of Rolling Earth', 17,
    '6 PF: conjura Muralha de Pedra.', '6 FP: cast Wall of Stone.', ['wallOfStone']),
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
        'Ação Bônus: role seu dado de Artes Marciais e recupere PV iguais ao resultado + seu modificador de Sabedoria (mínimo 1). Usos = modificador de Sabedoria (mínimo 1); recupera todos num Descanso Longo.',
        'Bonus Action: roll your Martial Arts die and regain Hit Points equal to the roll plus your Wisdom modifier (minimum 1). Uses equal your Wisdom modifier (minimum once); regain all on a Long Rest.'))] },
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
        'Ao usar o Passo das Sombras você pode gastar 1 PF para ignorar a exigência de penumbra/escuridão (na origem e no destino) e, logo após teleportar, fazer um Ataque Desarmado como parte dessa Ação Bônus.',
        'When you use Shadow Step, you can spend 1 Focus Point to ignore the dim light/darkness requirement for both spaces and make an Unarmed Strike right after teleporting as part of that Bonus Action.'))] },
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
        'Enquanto a Sintonia Elemental estiver ativa, você tem deslocamento de voo e de natação iguais ao seu deslocamento.',
        'While your Elemental Attunement is active, you have a Fly Speed and a Swim Speed equal to your Speed.'))] },
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
          '1×/turno, ao acertar uma criatura com um Ataque Desarmado e causar dano, gaste 1 PF para causar dano necrótico extra igual a uma rolagem do dado de Artes Marciais + modificador de Sabedoria.',
          'Once per turn when you hit a creature with an Unarmed Strike and deal damage, spend 1 Focus Point to deal extra necrotic damage equal to one roll of your Martial Arts die plus your Wisdom modifier.')),
        f('handOfHealing', b('Mão da Cura', 'Hand of Healing'), b(
          'Ação de Magia, 1 PF: toque uma criatura; ela recupera PV iguais a uma rolagem do dado de Artes Marciais + modificador de Sabedoria. Ao usar a Rajada de Golpes, pode trocar um dos Ataques Desarmados por uma Mão da Cura sem gastar PF para a cura.',
          'Magic action, 1 Focus Point: touch a creature; it regains HP equal to one roll of your Martial Arts die plus your Wisdom modifier. When you use Flurry of Blows, you can replace one of its Unarmed Strikes with a Hand of Healing that costs no Focus Point for the healing.')),
        f('implementsOfMercy', b('Instrumentos da Misericórdia', 'Implements of Mercy'), b(
          'Proficiência nas perícias Intuição e Medicina e com o Kit de Herbalismo.',
          'Proficiency in the Insight and Medicine skills and with the Herbalism Kit.')),
      ], grants: { skills: ['insight', 'medicine'], tools: ['herbalismKit'] } },
      6: { features: [f('physiciansTouch', b('Toque do Médico', "Physician's Touch"), b(
        'A Mão do Dano também deixa o alvo Envenenado até o fim do seu próximo turno. A Mão da Cura também pode encerrar uma destas condições no alvo: Cego, Surdo, Paralisado, Envenenado ou Atordoado.',
        'Hand of Harm also gives the target the Poisoned condition until the end of your next turn. Hand of Healing can also end one of these conditions on the target: Blinded, Deafened, Paralyzed, Poisoned or Stunned.'))] },
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
        'Aprenda mais 1 Disciplina Elemental (e, se quiser, troque 1 que já conhece).', 'Learn 1 more Elemental Discipline (and optionally replace 1 you know).'))] },
      11: { features: [f('extraElementalDiscipline11', b('Disciplina Elemental Adicional', 'Additional Elemental Discipline'), b(
        'Aprenda mais 1 Disciplina Elemental (e, se quiser, troque 1 que já conhece).', 'Learn 1 more Elemental Discipline (and optionally replace 1 you know).'))] },
      17: { features: [f('extraElementalDiscipline17', b('Disciplina Elemental Adicional', 'Additional Elemental Discipline'), b(
        'Aprenda mais 1 Disciplina Elemental (e, se quiser, troque 1 que já conhece).', 'Learn 1 more Elemental Discipline (and optionally replace 1 you know).'))] },
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
        'Quando você reduz a 0 PV uma criatura a até 1,5 m, ganha PV temporários iguais ao modificador de Sabedoria + nível de monge (mínimo 1).',
        'When you reduce a creature within 5 ft to 0 HP, you gain temporary HP equal to your Wisdom modifier + Monk level (minimum 1).'))] },
      6: { features: [f('hourOfReaping', b('Hora da Colheita', 'Hour of Reaping'), b(
        'Ação: cada criatura a até 9 m que possa ver você faz salvaguarda de Sabedoria (CD de Foco) ou fica Amedrontada por você até o fim do seu próximo turno.',
        'Action: each creature within 30 ft that can see you makes a Wisdom save (Focus DC) or is Frightened of you until the end of your next turn.'))] },
      11: { features: [f('masteryOfDeath', b('Domínio da Morte', 'Mastery of Death'), b(
        'Quando cair a 0 PV, pode gastar 1 PF para ficar com 1 PV.',
        'When you are reduced to 0 HP, you can spend 1 Focus Point to drop to 1 HP instead.'))] },
      17: { features: [f('touchOfTheLongDeath', b('Toque da Morte Longa', 'Touch of the Long Death'), b(
        'Ação: toque uma criatura a até 1,5 m e gaste de 1 a 10 PF. Ela faz salvaguarda de Constituição e sofre 2d10 de dano necrótico por PF gasto; metade se passar.',
        'Action: touch a creature within 5 ft and spend 1 to 10 Focus Points. It makes a Constitution save, taking 2d10 necrotic damage per point spent; half on a success.'))] },
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
          'Logo após a ação de Ataque, gaste 2 PF para conjurar Mãos Flamejantes como Ação Bônus; cada PF extra sobe o círculo em 1 (total de PF máximo = metade do nível de monge).',
          'Immediately after the Attack action, spend 2 Focus Points to cast Burning Hands as a Bonus Action; each extra point raises its level by 1 (maximum total points = half your Monk level).'))],
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
          'Sempre que usar a Rajada de Golpes, você ganha o benefício da ação Desengajar e seu deslocamento aumenta 3 m até o fim do turno.',
          'Whenever you use Flurry of Blows, you gain the benefit of the Disengage action and your Speed increases by 10 ft until the end of the turn.')),
      ], grants: { skills: ['performance'], tools: ['brewersSupplies'] } },
      6: { features: [f('tipsySway', b('Balanço Embriagado', 'Tipsy Sway'), b(
        'Levantar-se de Caído custa só 1,5 m de movimento. Quando uma criatura errar você com um ataque corpo a corpo, pode usar a Reação e gastar 1 PF para que o ataque atinja outra criatura a até 1,5 m do atacante, à sua escolha.',
        'Standing up from Prone costs only 5 ft of movement. When a creature misses you with a melee attack, you can use your Reaction and spend 1 Focus Point to make that attack hit another creature of your choice within 5 ft of the attacker.'))] },
      11: { features: [f('drunkardsLuck', b('Sorte do Bêbado', "Drunkard's Luck"), b(
        'Ao fazer um teste de atributo, jogada de ataque ou salvaguarda com Desvantagem, gaste 2 PF para cancelar a Desvantagem.',
        'When you make an ability check, attack roll or saving throw with Disadvantage, spend 2 Focus Points to cancel the Disadvantage.'))] },
      17: { features: [f('intoxicatedFrenzy', b('Frenesi Embriagado', 'Intoxicated Frenzy'), b(
        'Ao usar a Rajada de Golpes, pode fazer até 3 ataques adicionais (até 5 no total), desde que cada ataque mire uma criatura diferente.',
        'When you use Flurry of Blows, you can make up to 3 additional attacks (up to 5 in total), provided each attack targets a different creature.'))] },
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
        '1×/turno, ao errar um ataque com uma arma de monge, você pode rolar o ataque de novo. Você escolhe mais 1 arma kensei.',
        'Once per turn, when you miss with a monk weapon attack, you can reroll it. You choose 1 more kensei weapon.'))] },
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
        'Ação Bônus, 5 PF: invoca braços, semblante e corpo astrais por 10 minutos. Enquanto ativos: +2 de CA e, ao usar o Ataque Extra, pode atacar três vezes se todos os ataques forem com os braços astrais.',
        'Bonus Action, 5 Focus Points: summon your arms, visage and body for 10 minutes. While active: +2 AC and, when you use Extra Attack, you can attack three times if all attacks are made with your astral arms.'))] },
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
        'Ao usar o Passo do Vento, asas dracônicas surgem e você ganha deslocamento de voo igual ao seu deslocamento até o fim do turno. Usos = Bônus de Proficiência por Descanso Longo.',
        'When you use Step of the Wind, draconic wings appear and you gain a Fly Speed equal to your Speed until the end of the turn. Uses equal your Proficiency Bonus per Long Rest.'))] },
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
          desc: b('Proficiência em Intuição, Medicina e Kit de Herbalismo.', 'Proficiency in Insight, Medicine and the Herbalism Kit.'),
          prereq: { subclass: ['mercy'] }, grants: { skills: ['insight', 'medicine'], tools: ['herbalismKit'] } },
        { id: 'drunkenBonusProficiencies', name: b('Proficiências do Mestre Bêbado', 'Drunken Master Proficiencies'), source: 'XGE',
          desc: b('Proficiência em Atuação e Suprimentos de Cervejeiro.', "Proficiency in Performance and Brewer's Supplies."),
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
        'Sem armadura e sem Escudo, seu deslocamento aumenta 3 m (10 pés). O bônus sobe para 4,5 m no nível 6, 6 m no 10, 7,5 m no 14 e 9 m no 18.',
        "While you aren't wearing armor or wielding a Shield, your Speed increases by 10 ft. The bonus becomes 15 ft at level 6, 20 ft at 10, 25 ft at 14 and 30 ft at 18.")),
      f('uncannyMetabolism', b('Metabolismo Incomum', 'Uncanny Metabolism'), b(
        'Ao rolar Iniciativa, você pode recuperar todos os PF gastos; se fizer isso, role o dado de Artes Marciais e recupere PV iguais ao seu nível de monge + o resultado. 1×/Descanso Longo.',
        'When you roll Initiative, you can regain all expended Focus Points; when you do, roll your Martial Arts die and regain Hit Points equal to your Monk level plus the roll. Once per Long Rest.')),
    ],
    3: [
      f('deflectAttacks', b('Desviar Ataques', 'Deflect Attacks'), b(
        'Quando uma jogada de ataque atinge você e o dano inclui Contundente, Perfurante ou Cortante, use a Reação para reduzir o dano total em 1d10 + modificador de Destreza + nível de monge. Se reduzir a 0, pode gastar 1 PF para redirecionar a força: uma criatura que você veja a até 1,5 m (ataque corpo a corpo) ou a até 18 m e sem Cobertura Total (ataque à distância) faz salvaguarda de Destreza ou sofre duas rolagens do dado de Artes Marciais + modificador de Destreza, do mesmo tipo do ataque.',
        'When an attack roll hits you and its damage includes Bludgeoning, Piercing or Slashing, take a Reaction to reduce the total damage by 1d10 + your Dexterity modifier + Monk level. If you reduce it to 0, you can spend 1 Focus Point to redirect the force: a creature you can see within 5 ft (melee attack) or within 60 ft and not behind Total Cover (ranged attack) makes a Dexterity save or takes two rolls of your Martial Arts die + your Dexterity modifier, of the same type as the attack.')),
      f('monkSubclass', b('Subclasse de Monge', 'Monk Subclass'), b(
        'Escolha uma subclasse de monge. Ela concede traços nos níveis de monge 3, 6, 11 e 17.',
        'Choose a Monk subclass. It grants features at Monk levels 3, 6, 11 and 17.')),
    ],
    4: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique. Ganha este traço de novo nos níveis de monge 8, 12 e 16.',
        'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Monk levels 8, 12 and 16.')),
      f('slowFall', b('Queda Lenta', 'Slow Fall'), b(
        'Ao cair, use a Reação para reduzir o dano da queda em 5 × seu nível de monge.',
        'When you fall, take a Reaction to reduce the falling damage by five times your Monk level.')),
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
        'Seus Ataques Desarmados podem causar dano de Força ou o tipo de dano normal, à sua escolha.',
        'Your Unarmed Strikes can deal your choice of Force damage or their normal damage type.')),
    ],
    7: [
      f('evasion', b('Evasão', 'Evasion'), b(
        'Quando um efeito permite salvaguarda de Destreza para sofrer só metade do dano, você não sofre dano se passar e só metade se falhar. Não funciona se estiver Incapacitado.',
        'When an effect lets you make a Dexterity save to take only half damage, you take no damage on a success and only half on a failure. Not while Incapacitated.')),
    ],
    8: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
        'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.')),
    ],
    9: [
      f('acrobaticMovement', b('Movimento Acrobático', 'Acrobatic Movement'), b(
        'Sem armadura e sem Escudo, você pode se mover por superfícies verticais e sobre líquidos no seu turno sem cair durante o movimento.',
        "While you aren't wearing armor or wielding a Shield, you can move along vertical surfaces and across liquids on your turn without falling during the movement.")),
    ],
    10: [
      f('heightenedFocus', b('Foco Elevado', 'Heightened Focus'), b(
        'Rajada de Golpes: com 1 PF faz três Ataques Desarmados em vez de dois. Defesa Paciente: ao gastar 1 PF, ganha PV temporários iguais a duas rolagens do dado de Artes Marciais. Passo do Vento: ao gastar 1 PF, pode levar consigo uma criatura voluntária Grande ou menor a até 1,5 m até o fim do turno, sem provocar Ataques de Oportunidade.',
        'Flurry of Blows: for 1 FP make three Unarmed Strikes instead of two. Patient Defense: when you spend 1 FP, gain Temporary HP equal to two rolls of your Martial Arts die. Step of the Wind: when you spend 1 FP, you can carry a willing Large or smaller creature within 5 ft with you until the end of your turn without provoking Opportunity Attacks.')),
      f('selfRestoration', b('Autorrestauração', 'Self-Restoration'), b(
        'No fim de cada um dos seus turnos, você pode remover de si uma destas condições: Enfeitiçado, Amedrontado ou Envenenado. Além disso, ficar sem comer e beber não lhe dá níveis de Exaustão.',
        'At the end of each of your turns, you can remove one of these conditions from yourself: Charmed, Frightened or Poisoned. In addition, forgoing food and drink doesn\'t give you levels of Exhaustion.')),
    ],
    12: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
        'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.')),
    ],
    13: [
      f('deflectEnergy', b('Desviar Energia', 'Deflect Energy'), b(
        'Desviar Ataques passa a funcionar contra ataques de qualquer tipo de dano, não só Contundente, Perfurante ou Cortante.',
        'You can now use Deflect Attacks against attacks that deal any damage type, not just Bludgeoning, Piercing or Slashing.')),
    ],
    14: [
      f('disciplinedSurvivor', b('Sobrevivente Disciplinado', 'Disciplined Survivor'), b(
        'Você tem proficiência em todas as salvaguardas. Ao falhar numa salvaguarda, pode gastar 1 PF para rolar de novo, ficando com o novo resultado.',
        'You gain proficiency in all saving throws. Whenever you fail a saving throw, you can spend 1 Focus Point to reroll it, and you must use the new roll.')),
    ],
    15: [
      f('perfectFocus', b('Foco Perfeito', 'Perfect Focus'), b(
        'Ao rolar Iniciativa sem usar o Metabolismo Incomum, se tiver 3 PF ou menos, recupera PF até ficar com 4.',
        "When you roll Initiative and don't use Uncanny Metabolism, you regain expended Focus Points until you have 4 if you have 3 or fewer.")),
    ],
    16: [
      f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
        'Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
        'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify.')),
    ],
    18: [
      f('superiorDefense', b('Defesa Superior', 'Superior Defense'), b(
        'No início do seu turno, gaste 3 PF para ter Resistência a todo dano, exceto de Força, por 1 minuto ou até ficar Incapacitado.',
        'At the start of your turn, you can spend 3 Focus Points to gain Resistance to all damage except Force for 1 minute or until you have the Incapacitated condition.')),
    ],
    19: [
      f('epicBoon', b('Dádiva Épica', 'Epic Boon'), b(
        'Você ganha um talento de Dádiva Épica ou outro talento para o qual se qualifique. Recomendado: Dádiva da Ofensiva Irresistível.',
        'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Irresistible Offense is recommended.')),
    ],
    20: [
      f('bodyAndMind', b('Corpo e Mente', 'Body and Mind'), b(
        'Seus valores de Destreza e Sabedoria aumentam em 4 cada, até o máximo de 25.',
        'Your Dexterity and Wisdom scores increase by 4, to a maximum of 25.')),
    ],
  },

  subclasses,
};
