// Bardo — traços 2024, escolhas e subclasses. Formato em README.md.
// Classe base e Colégio do Saber: SRD 5.2.1 (CC-BY 4.0), texto adaptado.
// Demais subclasses (PHB 2024, XGE, TCE, VRGR): resumos originais, não o texto do livro.
const b = (pt, en) => ({ pt, en });
const f = (id, name, desc) => ({ id, name, desc });

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------
const INSTRUMENT_DESC = b('Proficiência com este instrumento; serve de foco de conjuração de Bardo.', 'Proficiency with this instrument; it can be used as a Bard spellcasting focus.');
const instrument = (id, pt, en, source, extraPt = '', extraEn = '') => ({
  id, name: b(pt, en), source, grants: { tools: [id] },
  desc: extraPt ? b(`${extraPt} ${INSTRUMENT_DESC.pt}`, `${extraEn} ${INSTRUMENT_DESC.en}`) : INSTRUMENT_DESC,
});

const instruments = [
  instrument('bagpipes', 'Gaita de Foles', 'Bagpipes', 'SRD', 'Sopro com fole e bordões.', 'Reed pipes with a bag and drones.'),
  instrument('drum', 'Tambor', 'Drum', 'SRD', 'Percussão.', 'Percussion.'),
  instrument('dulcimer', 'Saltério', 'Dulcimer', 'SRD', 'Cordas percutidas com baquetas.', 'Strings struck with hammers.'),
  instrument('flute', 'Flauta', 'Flute', 'SRD', 'Sopro.', 'Wind instrument.'),
  instrument('horn', 'Trompa', 'Horn', 'SRD', 'Metal de sopro.', 'Brass wind instrument.'),
  instrument('lute', 'Alaúde', 'Lute', 'SRD', 'Cordas dedilhadas.', 'Plucked strings.'),
  instrument('lyre', 'Lira', 'Lyre', 'SRD', 'Cordas dedilhadas em moldura.', 'Plucked strings on a frame.'),
  instrument('panFlute', 'Flauta de Pã', 'Pan Flute', 'SRD', 'Tubos de sopro lado a lado.', 'Row of wind pipes.'),
  instrument('shawm', 'Charamela', 'Shawm', 'SRD', 'Sopro de palheta dupla.', 'Double-reed wind instrument.'),
  instrument('viol', 'Viola de Gamba', 'Viol', 'SRD', 'Cordas friccionadas com arco.', 'Bowed strings.'),
  instrument('birdpipes', 'Flauta-de-Pássaro', 'Birdpipes', 'SCAG', 'Flauta de Pã sagrada dos elfos e sátiros.', 'Pan pipes sacred to elves and satyrs.'),
  instrument('glaur', 'Glaur', 'Glaur', 'SCAG', 'Corneta curva de chifre.', 'Short curved horn.'),
  instrument('handDrum', 'Tambor de Mão', 'Hand Drum', 'SCAG', 'Tambor de duas peles tocado com as mãos.', 'Double-headed drum played by hand.'),
  instrument('longhorn', 'Trompa Longa', 'Longhorn', 'SCAG', 'Flauta longa dos elfos.', 'Long elven flute.'),
  instrument('songhorn', 'Trompa-Canção', 'Songhorn', 'SCAG', 'Flauta doce de madeira.', 'Wooden recorder.'),
  instrument('tantan', 'Tantan', 'Tantan', 'SCAG', 'Tamborim de metal.', 'Metal tambourine.'),
  instrument('thelarr', 'Thelarr', 'Thelarr', 'SCAG', 'Apito de sopro simples.', 'Simple whistle-reed.'),
  instrument('tocken', 'Tocken', 'Tocken', 'SCAG', 'Conjunto de sinos ocos.', 'Set of hollow bells.'),
  instrument('wargong', 'Gongo de Guerra', 'Wargong', 'SCAG', 'Gongo de metal usado em batalha.', 'Metal gong used in battle.'),
  instrument('yarting', 'Yarting', 'Yarting', 'SCAG', 'Instrumento de cordas parecido com violão.', 'Guitar-like stringed instrument.'),
  instrument('zulkoon', 'Zulkoon', 'Zulkoon', 'SCAG', 'Órgão portátil de fole.', 'Portable bellows organ.'),
];

// Colégio das Espadas: só estas duas opções (em 2024 equivalem aos talentos de Estilo de Luta).
const swordsStyles = [
  { id: 'dueling', name: b('Duelismo', 'Dueling'), source: 'XGE',
    desc: b('Empunhando uma arma corpo a corpo em uma mão e nenhuma outra arma, +2 nas jogadas de dano com ela.', 'While wielding a melee weapon in one hand and no other weapons, +2 to damage rolls with it.') },
  { id: 'twoWeaponFighting', name: b('Combate com Duas Armas', 'Two-Weapon Fighting'), source: 'XGE',
    desc: b('Ao atacar com a segunda arma (o ataque extra de uma arma Leve), some o modificador de atributo ao dano desse ataque.', 'When you attack with your second weapon (the extra attack of a Light weapon), add your ability modifier to its damage.') },
];

// ---------------------------------------------------------------------------
// Traços da classe base (SRD 5.2.1)
// ---------------------------------------------------------------------------
const ASI = f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'),
  b('Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique. Este traço se repete nos níveis 8, 12 e 16 de Bardo.',
    'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Bard levels 8, 12, and 16.'));

const features = {
  1: [
    f('bardicInspiration', b('Inspiração de Bardo', 'Bardic Inspiration'),
      b('Como Ação Bônus, inspire outra criatura a até 18 m (60 pés) que possa ver ou ouvir você: ela ganha um Dado de Inspiração de Bardo (só pode ter um por vez). Uma vez na próxima hora, quando falhar num Teste de d20, pode rolar o dado e somá-lo ao d20, possivelmente transformando a falha em sucesso; o dado é gasto ao ser rolado. Usos: modificador de Carisma (mínimo 1), recuperados num Descanso Longo. O dado é d6 e passa a d8 no nível 5, d10 no nível 10 e d12 no nível 15.',
        'As a Bonus Action, inspire another creature within 60 feet who can see or hear you: it gains one Bardic Inspiration die (only one at a time). Once within the next hour, when it fails a D20 Test, it can roll the die and add it to the d20, potentially turning the failure into a success; the die is expended when rolled. Uses: your Charisma modifier (minimum 1), regained on a Long Rest. The die is a d6, becoming a d8 at level 5, a d10 at level 10, and a d12 at level 15.')),
    f('spellcasting', b('Conjuração', 'Spellcasting'),
      b('Você conjura magias de Bardo usando Carisma; um Instrumento Musical serve de foco. Truques: 2 da lista de Bardo (3 no nível 4, 4 no nível 10); a cada nível de Bardo pode trocar um truque. Magias preparadas: comece com 4 de 1º círculo; o número cresce conforme a tabela e as novas devem ser de um círculo para o qual tenha espaços. A cada nível de Bardo pode trocar uma magia preparada. Magias que um traço de Bardo deixa sempre preparadas não contam no limite. Espaços voltam num Descanso Longo.',
        'You cast Bard spells using Charisma; a Musical Instrument is your focus. Cantrips: 2 from the Bard list (3 at level 4, 4 at level 10); whenever you gain a Bard level you can replace one. Prepared spells: start with four level 1 spells; the number grows per the table, and new spells must be of a level for which you have slots. Whenever you gain a Bard level you can replace one prepared spell. Spells a Bard feature keeps always prepared don\'t count against the limit. Slots return on a Long Rest.')),
  ],
  2: [
    f('expertise', b('Especialização', 'Expertise'),
      b('Ganhe Especialização (dobra a proficiência) em duas perícias em que você já é proficiente. Atuação e Persuasão são recomendadas. No nível 9 de Bardo, ganhe Especialização em mais duas.',
        'You gain Expertise (double proficiency) in two skills you are proficient in. Performance and Persuasion are recommended. At Bard level 9, you gain Expertise in two more.')),
    f('jackOfAllTrades', b('Pau para Toda Obra', 'Jack of All Trades'),
      b('Some metade do seu Bônus de Proficiência (arredondado para baixo) a qualquer teste de atributo que use uma perícia em que você não é proficiente e que não use o Bônus de Proficiência de outra forma.',
        'Add half your Proficiency Bonus (round down) to any ability check that uses a skill you lack proficiency in and that doesn\'t otherwise use your Proficiency Bonus.')),
  ],
  3: [
    f('bardSubclass', b('Subclasse de Bardo', 'Bard Subclass'),
      b('Escolha um Colégio de Bardo. Ele concede traços nos níveis 3, 6 e 14 de Bardo.',
        'Choose a Bard College. It grants features at Bard levels 3, 6, and 14.')),
  ],
  4: [ASI],
  5: [
    f('fontOfInspiration', b('Fonte de Inspiração', 'Font of Inspiration'),
      b('Você recupera todos os usos gastos de Inspiração de Bardo ao terminar um Descanso Curto ou Longo. Além disso, pode gastar um espaço de magia (sem ação) para recuperar um uso. Seu dado de Inspiração passa a d8.',
        'You regain all expended uses of Bardic Inspiration when you finish a Short or Long Rest. You can also expend a spell slot (no action required) to regain one use. Your Bardic Inspiration die becomes a d8.')),
  ],
  7: [
    f('countercharm', b('Contraencanto', 'Countercharm'),
      b('Se você ou uma criatura a até 9 m (30 pés) falhar numa salvaguarda contra um efeito que causa a condição Enfeitiçado ou Amedrontado, você pode usar sua Reação para fazer a salvaguarda ser rolada de novo, com Vantagem.',
        'If you or a creature within 30 feet of you fails a saving throw against an effect that applies the Charmed or Frightened condition, you can take a Reaction to cause the save to be rerolled with Advantage.')),
  ],
  8: [ASI],
  9: [
    f('expertise', b('Especialização', 'Expertise'),
      b('Ganhe Especialização em mais duas perícias em que você é proficiente.',
        'You gain Expertise in two more skills you are proficient in.')),
  ],
  10: [
    f('magicalSecrets', b('Segredos Mágicos', 'Magical Secrets'),
      b('A partir deste nível, sempre que o número de Magias Preparadas aumentar, as novas magias podem vir das listas de Bardo, Clérigo, Druida e Mago, e contam como magias de Bardo para você. Ao trocar uma magia preparada, a substituta também pode vir dessas listas. Seu dado de Inspiração passa a d10.',
        'From this level on, whenever your number of Prepared Spells increases, the new spells can come from the Bard, Cleric, Druid, and Wizard lists, and they count as Bard spells for you. When you replace a prepared spell, the replacement can also come from those lists. Your Bardic Inspiration die becomes a d10.')),
  ],
  12: [ASI],
  15: [
    f('bardicDieD12', b('Inspiração de Bardo (d12)', 'Bardic Inspiration (d12)'),
      b('Seu Dado de Inspiração de Bardo passa a ser um d12.', 'Your Bardic Inspiration die becomes a d12.')),
  ],
  16: [ASI],
  18: [
    f('superiorInspiration', b('Inspiração Superior', 'Superior Inspiration'),
      b('Ao rolar Iniciativa, se tiver menos de dois usos de Inspiração de Bardo, você recupera usos até ficar com dois.',
        'When you roll Initiative, you regain expended uses of Bardic Inspiration until you have two if you have fewer than that.')),
  ],
  19: [
    f('epicBoon', b('Dádiva Épica', 'Epic Boon'),
      b('Ganhe um talento de Dádiva Épica ou outro talento para o qual se qualifique. Dádiva da Recuperação de Magia é recomendada.',
        'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Spell Recall is recommended.')),
  ],
  20: [
    f('wordsOfCreation', b('Palavras da Criação', 'Words of Creation'),
      b('Você sempre tem Palavra de Poder: Curar e Palavra de Poder: Matar preparadas. Ao conjurar qualquer uma delas, pode escolher uma segunda criatura como alvo, se ela estiver a até 3 m (10 pés) do primeiro alvo.',
        'You always have Power Word Heal and Power Word Kill prepared. When you cast either spell, you can target a second creature with it if that creature is within 10 feet of the first target.')),
  ],
};

// ---------------------------------------------------------------------------
// Subclasses
// ---------------------------------------------------------------------------
const subclasses = {
  // --- PHB 2024 -------------------------------------------------------------
  dance: {
    name: b('Colégio da Dança', 'College of Dance'),
    source: 'PHB24',
    desc: b('Bardos que canalizam a magia pelo movimento: esquiva, golpes desarmados e deslocamento em grupo.', 'Bards who channel magic through movement: evasion, unarmed strikes, and moving as a group.'),
    levels: {
      3: { features: [
        f('dazzlingFootwork', b('Passos Deslumbrantes', 'Dazzling Footwork'),
          b('Sem armadura e sem escudo, você ganha: Vantagem em testes de Atuação que envolvam dança; CA = 10 + DES + CAR (Defesa sem Armadura); ao gastar Inspiração de Bardo como parte de uma ação, Ação Bônus ou Reação, pode fazer um Ataque Desarmado como parte dela; seus Ataques Desarmados podem usar Destreza e causar dano Contundente igual a uma rolagem do dado de Inspiração + mod. de DES (essa rolagem não gasta o dado).',
            'While wearing no armor and wielding no Shield, you gain: Advantage on Performance checks involving dance; AC = 10 + DEX + CHA (Unarmored Defense); when you expend Bardic Inspiration as part of an action, Bonus Action, or Reaction, you can make one Unarmed Strike as part of it; your Unarmed Strikes can use Dexterity and deal Bludgeoning damage equal to a roll of your Bardic Inspiration die + DEX modifier (this roll doesn\'t expend the die).')),
      ] },
      6: { features: [
        f('inspiringMovement', b('Movimento Inspirador', 'Inspiring Movement'),
          b('Quando um inimigo que você vê termina o turno a até 1,5 m (5 pés), use sua Reação e gaste um uso de Inspiração para se mover até metade do seu Deslocamento; depois, um aliado a até 9 m (30 pés) pode usar a Reação dele para fazer o mesmo. Esses movimentos não provocam Ataques de Oportunidade.',
            'When an enemy you can see ends its turn within 5 feet of you, take a Reaction and expend one Bardic Inspiration to move up to half your Speed; then one ally within 30 feet can use its Reaction to do the same. This movement doesn\'t provoke Opportunity Attacks.')),
        f('tandemFootwork', b('Passos em Conjunto', 'Tandem Footwork'),
          b('Ao rolar Iniciativa (sem estar Incapacitado), gaste um uso de Inspiração e role o dado: você e cada aliado a até 9 m (30 pés) que possa ver ou ouvir você somam o resultado à Iniciativa.',
            'When you roll Initiative (and aren\'t Incapacitated), expend one Bardic Inspiration and roll the die: you and each ally within 30 feet who can see or hear you add the roll to Initiative.')),
      ] },
      14: { features: [
        f('leadingEvasion', b('Evasão Conduzida', 'Leading Evasion'),
          b('Em salvaguardas de Destreza para sofrer metade do dano, você não sofre dano no sucesso e só metade na falha. Criaturas a até 1,5 m (5 pés) fazendo a mesma salvaguarda podem receber esse benefício. Não funciona se estiver Incapacitado.',
            'On Dexterity saves for half damage, you take no damage on a success and only half on a failure. Creatures within 5 feet making the same save can share this benefit. Doesn\'t work while you are Incapacitated.')),
      ] },
    },
  },

  glamour: {
    name: b('Colégio do Glamour', 'College of Glamour'),
    source: 'PHB24',
    desc: b('Magia feérica de encanto e majestade que inspira aliados e domina inimigos.', 'Fey magic of charm and majesty that inspires allies and overwhelms foes.'),
    levels: {
      3: {
        features: [
          f('beguilingMagic', b('Magia Sedutora', 'Beguiling Magic'),
            b('Você sempre tem Enfeitiçar Pessoa e Imagem Espelhada preparadas. Logo após conjurar uma magia de Encantamento ou Ilusão com espaço de magia, pode forçar uma criatura que você vê a até 18 m (60 pés) a fazer uma salvaguarda de Sabedoria contra sua CD; na falha, fica Enfeitiçada ou Amedrontada (à sua escolha) por 1 minuto, repetindo a salvaguarda no fim de cada turno dela. 1×/Descanso Longo; pode recuperar gastando um uso de Inspiração de Bardo.',
              'You always have Charm Person and Mirror Image prepared. Right after casting an Enchantment or Illusion spell with a spell slot, you can force a creature you can see within 60 feet to make a Wisdom save against your DC; on a failure it is Charmed or Frightened (your choice) for 1 minute, repeating the save at the end of each of its turns. Once per Long Rest; you can restore it by expending one Bardic Inspiration.')),
          f('mantleOfInspiration', b('Manto de Inspiração', 'Mantle of Inspiration'),
            b('Ação Bônus: gaste um uso de Inspiração e role o dado. Até um número de outras criaturas a até 18 m (60 pés) igual ao seu mod. de Carisma (mínimo 1) ganham PV temporários iguais ao dobro do resultado, e cada uma pode usar a Reação para se mover até seu Deslocamento sem provocar Ataques de Oportunidade.',
              'Bonus Action: expend one Bardic Inspiration and roll the die. Up to a number of other creatures within 60 feet equal to your Charisma modifier (minimum 1) gain temporary HP equal to twice the roll, and each can use its Reaction to move up to its Speed without provoking Opportunity Attacks.')),
        ],
        autoSpells: ['charmPerson', 'mirrorImage'],
      },
      6: {
        features: [
          f('mantleOfMajesty', b('Manto de Majestade', 'Mantle of Majesty'),
            b('Você sempre tem Comando preparada. Ação Bônus: conjure Comando sem gastar espaço e assuma uma aparência majestosa por 1 minuto (Concentração). Nesse tempo, pode conjurar Comando como Ação Bônus sem gastar espaço, e criaturas Enfeitiçadas por você falham automaticamente na salvaguarda. 1×/Descanso Longo; pode recuperar gastando um espaço de 3º círculo ou maior.',
              'You always have Command prepared. Bonus Action: cast Command without a slot and take on a majestic appearance for 1 minute (Concentration). During that time you can cast Command as a Bonus Action without a slot, and creatures Charmed by you automatically fail the save. Once per Long Rest; you can restore it by expending a level 3+ spell slot.')),
        ],
        autoSpells: ['command'],
      },
      14: { features: [
        f('unbreakableMajesty', b('Majestade Inquebrável', 'Unbreakable Majesty'),
          b('Ação Bônus: por 1 minuto (ou até ficar Incapacitado), a primeira vez em cada turno que uma criatura acertar você com uma jogada de ataque, ela faz uma salvaguarda de Carisma contra sua CD; na falha, o ataque erra. 1×/Descanso Curto ou Longo.',
            'Bonus Action: for 1 minute (or until you are Incapacitated), the first time each turn a creature hits you with an attack roll, it makes a Charisma save against your DC; on a failure, the attack misses instead. Once per Short or Long Rest.')),
      ] },
    },
  },

  lore: {
    name: b('Colégio do Saber', 'College of Lore'),
    source: 'SRD',
    desc: b('Colecionadores de magias e segredos de tomos, ritos e contos populares; expõem mentiras e zombam dos poderosos.', 'Collectors of spells and secrets from tomes, rites, and folk tales; they expose lies and mock the powerful.'),
    levels: {
      3: { features: [
        f('bonusProficiencies', b('Proficiências Adicionais', 'Bonus Proficiencies'),
          b('Você ganha proficiência em três perícias à sua escolha.', 'You gain proficiency with three skills of your choice.')),
        f('cuttingWords', b('Palavras Cortantes', 'Cutting Words'),
          b('Quando uma criatura que você vê a até 18 m (60 pés) fizer uma jogada de dano ou tiver sucesso num teste de atributo ou jogada de ataque, você pode usar sua Reação e gastar um uso de Inspiração de Bardo: role o dado e subtraia o resultado da jogada dela, reduzindo o dano ou possivelmente transformando o sucesso em falha.',
            'When a creature you can see within 60 feet makes a damage roll or succeeds on an ability check or attack roll, you can take a Reaction to expend one Bardic Inspiration: roll the die and subtract the number from the creature\'s roll, reducing the damage or potentially turning the success into a failure.')),
      ] },
      6: { features: [
        f('magicalDiscoveries', b('Descobertas Mágicas', 'Magical Discoveries'),
          b('Aprenda duas magias das listas de Clérigo, Druida ou Mago (em qualquer combinação); cada uma deve ser um truque ou de um círculo para o qual você tenha espaços. Elas ficam sempre preparadas e, a cada nível de Bardo, você pode trocar uma delas por outra que cumpra esses requisitos.',
            'Learn two spells from the Cleric, Druid, or Wizard lists (any combination); each must be a cantrip or of a level for which you have spell slots. They are always prepared, and whenever you gain a Bard level you can replace one of them with another that meets these requirements.')),
      ] },
      14: { features: [
        f('peerlessSkill', b('Perícia Inigualável', 'Peerless Skill'),
          b('Ao falhar num teste de atributo ou jogada de ataque, você pode gastar um uso de Inspiração de Bardo: role o dado e some ao d20, possivelmente transformando a falha em sucesso. Se ainda assim falhar, a Inspiração não é gasta.',
            'When you fail an ability check or attack roll, you can expend one Bardic Inspiration: roll the die and add it to the d20, potentially turning the failure into a success. If it still fails, the Inspiration isn\'t expended.')),
      ] },
    },
  },

  valor: {
    name: b('Colégio do Valor', 'College of Valor'),
    source: 'PHB24',
    desc: b('Bardos guerreiros que cantam os feitos dos heróis e lutam na linha de frente.', 'Warrior bards who sing of heroes\' deeds and fight on the front line.'),
    levels: {
      3: { features: [
        f('combatInspiration', b('Inspiração de Combate', 'Combat Inspiration'),
          b('Uma criatura com seu Dado de Inspiração também pode usá-lo assim: Defesa — ao ser atingida por uma jogada de ataque, usa a Reação para rolar o dado e somá-lo à CA contra esse ataque, possivelmente fazendo-o errar; Ataque — logo após acertar uma jogada de ataque, rola o dado e soma ao dano.',
            'A creature with your Bardic Inspiration die can also use it this way: Defense — when hit by an attack roll, it uses its Reaction to roll the die and add it to its AC against that attack, potentially causing a miss; Offense — right after hitting with an attack roll, it rolls the die and adds it to the damage.')),
        f('martialTraining', b('Treinamento Marcial', 'Martial Training'),
          b('Você ganha proficiência com armas Marciais e treinamento com armaduras Médias e Escudos. Pode usar uma arma Simples ou Marcial como foco de conjuração de Bardo.',
            'You gain proficiency with Martial weapons and training with Medium armor and Shields. You can use a Simple or Martial weapon as a Bard spellcasting focus.')),
      ] },
      6: {
        features: [
          f('extraAttack', b('Ataque Extra', 'Extra Attack'),
            b('Você ataca duas vezes ao usar a ação Atacar. Pode substituir um desses ataques pela conjuração de um truque seu com tempo de conjuração de uma ação.',
              'You attack twice when you take the Attack action. You can replace one of those attacks with casting one of your cantrips that has a casting time of an action.')),
        ],
        extraAttacks: 1,
      },
      14: { features: [
        f('battleMagic', b('Magia de Batalha', 'Battle Magic'),
          b('Depois de conjurar uma magia com tempo de conjuração de uma ação, você pode fazer um ataque com arma como Ação Bônus.',
            'After you cast a spell that has a casting time of an action, you can make one attack with a weapon as a Bonus Action.')),
      ] },
    },
  },

  // --- Suplementos (regras 2014; já começam no nível 3) ----------------------
  swords: {
    name: b('Colégio das Espadas', 'College of Swords'),
    source: 'XGE',
    desc: b('Lâminas artistas que misturam acrobacia e esgrima em floreios de combate.', 'Blade performers who blend acrobatics and swordplay into combat flourishes.'),
    levels: {
      3: { features: [
        f('swordsProficiencies', b('Proficiências Adicionais', 'Bonus Proficiencies'),
          b('Proficiência com armadura média e cimitarra. Uma arma corpo a corpo simples ou marcial em que você é proficiente pode servir de foco de conjuração de Bardo.',
            'Proficiency with medium armor and the scimitar. A simple or martial melee weapon you are proficient with can serve as your Bard spellcasting focus.')),
        f('swordsFightingStyle', b('Estilo de Luta', 'Fighting Style'),
          b('Escolha Duelismo ou Combate com Duas Armas.', 'Choose Dueling or Two-Weapon Fighting.')),
        f('bladeFlourish', b('Floreio de Lâmina', 'Blade Flourish'),
          b('Ao usar a ação Atacar, seu deslocamento aumenta em 3 m (10 pés) até o fim do turno. Se um ataque com arma dessa ação acertar, você pode gastar um uso de Inspiração de Bardo num floreio (um por turno), somando o dado rolado ao dano: Defensivo — some também o resultado à sua CA até o início do seu próximo turno; Cortante — o dado também causa dano a outra criatura à sua escolha a até 1,5 m (5 pés) de você; Móvel — empurre o alvo até 1,5 m (5 pés) mais um número de pés igual ao resultado, e você pode usar sua Reação para se mover até seu deslocamento para ficar a 1,5 m dele.',
            'When you take the Attack action, your speed increases by 10 feet until the end of the turn. If a weapon attack from that action hits, you can expend one Bardic Inspiration on a flourish (one per turn), adding the die roll to the damage: Defensive — also add the roll to your AC until the start of your next turn; Slashing — the die also damages another creature of your choice within 5 feet of you; Mobile — push the target 5 feet plus the roll in feet, and you can use your reaction to move up to your speed to a space within 5 feet of it.')),
      ] },
      6: {
        features: [
          f('extraAttack', b('Ataque Extra', 'Extra Attack'),
            b('Você ataca duas vezes ao usar a ação Atacar.', 'You attack twice when you take the Attack action.')),
        ],
        extraAttacks: 1,
      },
      14: { features: [
        f('mastersFlourish', b('Floreio de Mestre', "Master's Flourish"),
          b('Ao usar um Floreio de Lâmina, você pode rolar um d6 e usá-lo no lugar de gastar um uso de Inspiração de Bardo.',
            'When you use a Blade Flourish, you can roll a d6 and use it instead of expending a Bardic Inspiration die.')),
      ] },
    },
  },

  whispers: {
    name: b('Colégio dos Sussurros', 'College of Whispers'),
    source: 'XGE',
    desc: b('Bardos que negociam segredos e medo, roubando identidades e ferindo mentes.', 'Bards who trade in secrets and fear, stealing identities and wounding minds.'),
    levels: {
      3: { features: [
        f('psychicBlades', b('Lâminas Psíquicas', 'Psychic Blades'),
          b('Ao acertar uma criatura com um ataque com arma, você pode gastar um uso de Inspiração de Bardo para causar 2d6 de dano psíquico extra (3d6 no nível 5, 5d6 no nível 10, 8d6 no nível 15). Uma vez por turno.',
            'When you hit a creature with a weapon attack, you can expend one Bardic Inspiration to deal an extra 2d6 psychic damage (3d6 at level 5, 5d6 at level 10, 8d6 at level 15). Once per turn.')),
        f('wordsOfTerror', b('Palavras de Terror', 'Words of Terror'),
          b('Depois de conversar a sós por 1 minuto com um humanoide, ele faz uma salvaguarda de Sabedoria contra sua CD; na falha, fica amedrontado de você ou de outra criatura que você escolher por 1 hora (termina se for atacado ou ferido, ou vir aliados sendo atacados). No sucesso, não percebe a tentativa. 1×/Descanso Curto ou Longo.',
            'After speaking alone with a humanoid for 1 minute, it makes a Wisdom save against your DC; on a failure it is frightened of you or another creature you choose for 1 hour (ends if it is attacked or damaged, or sees its allies attacked). On a success it has no hint of the attempt. Once per Short or Long Rest.')),
      ] },
      6: { features: [
        f('mantleOfWhispers', b('Manto de Sussurros', 'Mantle of Whispers'),
          b('Quando um humanoide morre a até 9 m (30 pés), use sua Reação para capturar a sombra dele. Com uma ação, use a sombra como disfarce mágico por 1 hora, parecendo aquela pessoa e sabendo informações superficiais dela; quem desconfiar faz Intuição contra sua Enganação +5. 1×/Descanso Curto ou Longo.',
            'When a humanoid dies within 30 feet, use your reaction to capture its shadow. As an action, use the shadow as a magical disguise for 1 hour, looking like that person and knowing surface details about it; a suspicious creature makes an Insight check against your Deception +5. Once per Short or Long Rest.')),
      ] },
      14: { features: [
        f('shadowLore', b('Saber das Sombras', 'Shadow Lore'),
          b('Ação: sussurre para uma criatura a até 9 m (30 pés) que entenda um idioma. Ela faz uma salvaguarda de Sabedoria contra sua CD; na falha, fica enfeitiçada por 8 horas (ou até sofrer dano de você ou aliados), acreditando que você conhece seu segredo mais sombrio e obedecendo a ordens que não sejam suicidas. 1×/Descanso Longo.',
            'Action: whisper to a creature within 30 feet that understands a language. It makes a Wisdom save against your DC; on a failure it is charmed for 8 hours (or until you or your allies damage it), believing you know its darkest secret and obeying non-suicidal commands. Once per Long Rest.')),
      ] },
    },
  },

  creation: {
    name: b('Colégio da Criação', 'College of Creation'),
    source: 'TCE',
    desc: b('Bardos que ecoam a Canção da Criação para dar forma e movimento à matéria.', 'Bards who echo the Song of Creation to give matter shape and motion.'),
    levels: {
      3: { features: [
        f('moteOfPotential', b('Partícula de Potencial', 'Mote of Potential'),
          b('Ao dar Inspiração de Bardo, você pode criar uma partícula que acompanha a criatura. Quando ela usar o dado: teste de atributo — rola o dado duas vezes e escolhe; jogada de ataque — a partícula explode: o alvo e criaturas à sua escolha a até 1,5 m (5 pés) dele fazem salvaguarda de Constituição contra sua CD ou sofrem dano trovejante igual ao dado; salvaguarda — a criatura ganha PV temporários iguais ao dado + seu mod. de Carisma (mínimo 1).',
            'When you give Bardic Inspiration, you can create a mote that follows the creature. When it uses the die: ability check — it rolls the die twice and chooses; attack roll — the mote bursts: the target and creatures of your choice within 5 feet of it make a Constitution save against your DC or take thunder damage equal to the die; saving throw — the creature gains temporary HP equal to the die + your Charisma modifier (minimum 1).')),
        f('performanceOfCreation', b('Performance da Criação', 'Performance of Creation'),
          b('Ação: crie um item não mágico num espaço a até 3 m (10 pés), valendo até 20 × seu nível de Bardo em PO e de tamanho Médio ou menor (Grande no nível 6, Enorme no nível 14). Ele dura um número de horas igual ao seu Bônus de Proficiência; só um por vez. 1×/Descanso Longo, ou gaste um espaço de 2º círculo ou maior para usar de novo.',
            'Action: create a nonmagical item in a space within 10 feet, worth up to 20 × your Bard level in GP and Medium or smaller (Large at level 6, Huge at level 14). It lasts a number of hours equal to your Proficiency Bonus; only one at a time. Once per Long Rest, or expend a level 2+ spell slot to use it again.')),
      ] },
      6: { features: [
        f('animatingPerformance', b('Performance Animadora', 'Animating Performance'),
          b('Ação: anime um objeto não mágico Grande ou menor a até 9 m (30 pés), que vira um Item Dançante (bloco de estatísticas próprio, que escala com seu nível de Bardo e Bônus de Proficiência) por 1 hora. Ele age no seu turno e você o comanda com Ação Bônus. 1×/Descanso Longo, ou gaste um espaço de 3º círculo ou maior para usar de novo.',
            'Action: animate a Large or smaller nonmagical object within 30 feet, which becomes a Dancing Item (its own stat block, scaling with your Bard level and Proficiency Bonus) for 1 hour. It acts on your turn and you command it with a bonus action. Once per Long Rest, or expend a level 3+ spell slot to use it again.')),
      ] },
      14: { features: [
        f('creativeCrescendo', b('Crescendo Criativo', 'Creative Crescendo'),
          b('Performance da Criação passa a criar vários itens de uma vez: um número igual ao seu mod. de Carisma (mínimo 2). Só um pode ter o tamanho máximo; os demais são Pequenos ou menores. Não há mais limite de valor em PO.',
            'Performance of Creation now creates several items at once: a number equal to your Charisma modifier (minimum 2). Only one can be of the maximum size; the rest are Small or smaller. There is no longer a GP value limit.')),
      ] },
    },
  },

  eloquence: {
    name: b('Colégio da Eloquência', 'College of Eloquence'),
    source: 'TCE',
    desc: b('Oradores que dobram corações e mentes com a palavra (também em Mythic Odysseys of Theros).', 'Orators who sway hearts and minds with words (also in Mythic Odysseys of Theros).'),
    levels: {
      3: { features: [
        f('silverTongue', b('Língua de Prata', 'Silver Tongue'),
          b('Em testes de Carisma (Persuasão) ou (Enganação), trate um resultado de 9 ou menos no d20 como 10.',
            'On Charisma (Persuasion) or (Deception) checks, treat a d20 roll of 9 or lower as a 10.')),
        f('unsettlingWords', b('Palavras Perturbadoras', 'Unsettling Words'),
          b('Ação Bônus: gaste um uso de Inspiração de Bardo e escolha uma criatura que você vê a até 18 m (60 pés). Role o dado; ela subtrai o resultado da próxima salvaguarda que fizer antes do início do seu próximo turno.',
            'Bonus action: expend one Bardic Inspiration and choose a creature you can see within 60 feet. Roll the die; the creature subtracts the number from the next saving throw it makes before the start of your next turn.')),
      ] },
      6: { features: [
        f('unfailingInspiration', b('Inspiração Infalível', 'Unfailing Inspiration'),
          b('Quando uma criatura soma seu Dado de Inspiração a uma rolagem e ainda assim falha, ela mantém o dado.',
            'When a creature adds your Bardic Inspiration die to a roll and the roll still fails, it keeps the die.')),
        f('universalSpeech', b('Fala Universal', 'Universal Speech'),
          b('Ação: até um número de criaturas a até 18 m (60 pés) igual ao seu mod. de Carisma (mínimo 1) passam a entender você por 1 hora, qualquer que seja o idioma. 1×/Descanso Longo, ou gaste um espaço de magia para usar de novo.',
            'Action: up to a number of creatures within 60 feet equal to your Charisma modifier (minimum 1) can understand you for 1 hour, regardless of language. Once per Long Rest, or expend a spell slot to use it again.')),
      ] },
      14: { features: [
        f('infectiousInspiration', b('Inspiração Contagiante', 'Infectious Inspiration'),
          b('Quando uma criatura a até 18 m (60 pés) tem sucesso num teste, ataque ou salvaguarda graças ao seu Dado de Inspiração, você pode usar sua Reação para dar Inspiração de Bardo a outra criatura a até 18 m que possa ouvir você, sem gastar usos. Usos: mod. de Carisma (mínimo 1) por Descanso Longo.',
            'When a creature within 60 feet succeeds on a check, attack, or save thanks to your Bardic Inspiration die, you can use your reaction to give Bardic Inspiration to another creature within 60 feet that can hear you, without expending a use. Uses: Charisma modifier (minimum 1) per Long Rest.')),
      ] },
    },
  },

  spirits: {
    name: b('Colégio dos Espíritos', 'College of Spirits'),
    source: 'VRGR',
    desc: b('Contadores de histórias que chamam os espíritos para narrar contos com poder mágico.', 'Storytellers who call on spirits to tell tales with magical power.'),
    levels: {
      3: {
        features: [
          f('guidingWhispers', b('Sussurros Guiadores', 'Guiding Whispers'),
            b('Você aprende o truque Orientação, que conta como magia de Bardo sem ocupar vaga de truque, e o alcance dele passa a 18 m (60 pés).',
              'You learn the Guidance cantrip, which counts as a Bard spell without using a cantrip slot, and its range becomes 60 feet.')),
          f('spiritualFocus', b('Foco Espiritual', 'Spiritual Focus'),
            b('Uma vela, bola de cristal, crânio, tábua espiritual ou baralho tarokka pode servir de foco de conjuração de Bardo. A partir do nível 6, ao conjurar por ele uma magia de Bardo que cause dano ou cure, role um d6 e some a uma jogada de dano ou cura.',
              'A candle, crystal ball, skull, spirit board, or tarokka deck can serve as your Bard spellcasting focus. From level 6, when you cast a Bard spell that deals damage or restores hit points through it, roll a d6 and add it to one damage or healing roll.')),
          f('talesFromBeyond', b('Contos do Além', 'Tales from Beyond'),
            b('Ação Bônus: gaste um uso de Inspiração de Bardo e role seu dado de Inspiração para saber qual conto os espíritos contam: 1 Animal Esperto (dado extra em testes de INT/SAB/CAR por 10 min), 2 Duelista Renomado (ataque mágico corpo a corpo: 2 dados + CAR de energia), 3 Amigos Queridos (alvo e um aliado ganham PV temp.), 4 Fugitivo (teleporte de 9 m com a Reação, levando aliados), 5 Vingador (quem acerta o alvo corpo a corpo sofre energia por 1 min), 6 Viajante (PV temp., +3 m de deslocamento e +1 CA), 7 Sedutor (SAB ou dano psíquico e incapacitado), 8 Fantasma (invisível até o próximo turno; ao acertar, dano necrótico e amedrontado), 9 Bruto (FOR em área ou dano trovejante e caído), 10 Dragão (cone de fogo de 9 m, DES), 11 Anjo (cura e encerra uma condição), 12 Dobra-Mentes (INT ou dano psíquico e atordoado). Você guarda o conto até usá-lo ou terminar um descanso; com uma ação, aplica-o a uma criatura a até 9 m (30 pés), inclusive você. Só um conto por vez.',
              'Bonus Action: expend one Bardic Inspiration and roll your Bardic Inspiration die to see which tale the spirits tell: 1 Clever Animal (extra die on INT/WIS/CHA checks for 10 min), 2 Renowned Duelist (melee spell attack: 2 dice + CHA force), 3 Beloved Friends (target and an ally gain temp HP), 4 Runaway (30-ft teleport as a reaction, bringing allies), 5 Avenger (melee attackers of the target take force damage for 1 min), 6 Traveler (temp HP, +10 ft speed and +1 AC), 7 Beguiler (WIS or psychic damage and incapacitated), 8 Phantom (invisible until your next turn; on a hit, necrotic damage and frightened), 9 Brute (area STR save or thunder damage and prone), 10 Dragon (30-ft fire cone, DEX), 11 Angel (healing and ends a condition), 12 Mind-Bender (INT or psychic damage and stunned). You keep the tale until you use it or finish a rest; as an action, you bestow it on a creature within 30 feet, including yourself. Only one tale at a time.')),
        ],
        autoCantrips: ['guidance'],
      },
      6: { features: [
        f('spiritSession', b('Sessão Espiritual', 'Spirit Session'),
          b('Ritual de 1 hora com até um número de criaturas voluntárias igual ao seu Bônus de Proficiência (incluindo você). Ao final, aprende temporariamente uma magia de Adivinhação ou Necromancia de qualquer classe, de círculo não maior que o número de participantes e para o qual tenha espaços. Ela conta como magia de Bardo, não ocupa vaga e some ao terminar um Descanso Longo. 1×/Descanso Longo.',
            '1-hour ritual with up to a number of willing creatures equal to your Proficiency Bonus (including you). At the end, you temporarily learn one Divination or Necromancy spell from any class, of a level no higher than the number of participants and for which you have slots. It counts as a Bard spell, takes no slot, and is lost when you finish a Long Rest. Once per Long Rest.')),
      ] },
      14: { features: [
        f('mysticalConnection', b('Conexão Mística', 'Mystical Connection'),
          b('Ao usar Contos do Além, role o dado duas vezes e escolha qual conto usar. Se os dois resultados forem iguais, escolha qualquer conto da tabela.',
            'When you use Tales from Beyond, roll the die twice and choose which tale to use. If both rolls are the same, you can choose any tale on the table.')),
      ] },
    },
  },
};


// ---------------------------------------------------------------------------
// Recursos com usos (sem espaços de magia)
// ---------------------------------------------------------------------------
const once = (id, pt, en, recharge, minLevel, subclass, extra = {}) =>
  ({ id, name: b(pt, en), uses: { fixed: 1 }, recharge, minLevel, subclass: [subclass], ...extra });

const resources = [
  { id: 'bardicInspiration', name: b('Inspiração de Bardo', 'Bardic Inspiration'),
    desc: b('Descanso Longo; a partir do nível 5 (Fonte de Inspiração), Curto ou Longo. Nível 5+: gastar um espaço de magia recupera 1 uso.',
      'Long Rest; from level 5 (Font of Inspiration), Short or Long Rest. Level 5+: expend a spell slot to regain 1 use.'),
    uses: { ability: 'cha', min: 1 },
    recharge: 'long',
    shortRestFromLevel: 5, // Fonte de Inspiração (2014 e 2024): a recarga passa a 'short' neste nível da classe
    minLevel: 1,
    die: { byLevel: { 1: 'd6', 5: 'd8', 10: 'd10', 15: 'd12' } } },
  // Glamour
  once('beguilingMagic', 'Magia Sedutora', 'Beguiling Magic', 'long', 3, 'glamour',
    { rules: '2024', desc: b('Pode recuperar gastando 1 Inspiração de Bardo.', 'Can be restored by expending 1 Bardic Inspiration.') }),
  once('enthrallingPerformance', 'Atuação Cativante', 'Enthralling Performance', 'short', 3, 'glamour', { rules: '2014' }),
  once('mantleOfMajesty', 'Manto de Majestade', 'Mantle of Majesty', 'long', 6, 'glamour',
    { desc: b('Regras 2024: também volta gastando um espaço de 3º círculo ou maior.', '2024 rules: also restored by expending a level 3+ spell slot.') }),
  once('unbreakableMajesty', 'Majestade Inquebrável', 'Unbreakable Majesty', 'short', 14, 'glamour'),
  // Sussurros
  once('wordsOfTerror', 'Palavras de Terror', 'Words of Terror', 'short', 3, 'whispers'),
  once('mantleOfWhispers', 'Manto de Sussurros', 'Mantle of Whispers', 'short', 6, 'whispers'),
  once('shadowLore', 'Saber das Sombras', 'Shadow Lore', 'long', 14, 'whispers'),
  // Criação
  once('performanceOfCreation', 'Performance da Criação', 'Performance of Creation', 'long', 3, 'creation',
    { desc: b('Ou gaste um espaço de 2º círculo ou maior.', 'Or expend a level 2+ spell slot.') }),
  once('animatingPerformance', 'Performance Animadora', 'Animating Performance', 'long', 6, 'creation',
    { desc: b('Ou gaste um espaço de 3º círculo ou maior.', 'Or expend a level 3+ spell slot.') }),
  // Eloquência
  once('universalSpeech', 'Fala Universal', 'Universal Speech', 'long', 6, 'eloquence',
    { desc: b('Ou gaste um espaço de magia.', 'Or expend a spell slot.') }),
  { id: 'infectiousInspiration', name: b('Inspiração Contagiante', 'Infectious Inspiration'),
    uses: { ability: 'cha', min: 1 }, recharge: 'long', minLevel: 14, subclass: ['eloquence'] },
  // Espíritos
  once('spiritSession', 'Sessão Espiritual', 'Spirit Session', 'long', 6, 'spirits'),
];

export default {
  classId: 'bard',
  pools: {
    // Instrumentos: a classe inicial dá 3; entrar por multiclasse dá 1. Como o formato não tem
    // "N na multiclasse", divide-se em 1 vaga para todos + 2 só para a classe inicial (mesmas opções).
    musicalInstrument: {
      name: b('Instrumentos Musicais', 'Musical Instruments'),
      options: instruments,
    },
    musicalInstrumentStart: {
      name: b('Instrumentos Musicais (classe inicial)', 'Musical Instruments (starting class)'),
      startingClassOnly: true,
      options: instruments,
    },
    expertise: {
      name: b('Especialização', 'Expertise'),
      kind: 'skill', grantAs: 'expertise',
      filter: { proficient: true },
    },
    // Colégio do Saber (nível 3): três perícias quaisquer.
    loreSkill: {
      name: b('Proficiências Adicionais (Saber)', 'Bonus Proficiencies (Lore)'),
      kind: 'skill', grantAs: 'skill',
    },
    // Colégio do Saber (nível 6): truque ou magia com espaço, das listas de Clérigo/Druida/Mago; sempre preparadas.
    magicalDiscoveries: {
      name: b('Descobertas Mágicas', 'Magical Discoveries'),
      kind: 'spell', grantAs: 'spell',
      filter: { classes: ['cleric', 'druid', 'wizard'] },
      swapOnLevelUp: 1,
    },
    // Colégio do Saber 2014 (nível 6): Segredos Mágicos Adicionais — magias de qualquer classe.
    additionalMagicalSecrets: {
      name: b('Segredos Mágicos Adicionais', 'Additional Magical Secrets'),
      kind: 'spell', grantAs: 'spell',
      filter: {},
    },
    // Colégio das Espadas (nível 3): só Duelismo ou Combate com Duas Armas.
    fightingStyle: {
      name: b('Estilo de Luta (Espadas)', 'Fighting Style (Swords)'),
      options: swordsStyles,
    },
  },
  // Tabela do Bardo (SRD 5.2.1): 3 instrumentos no nível 1 (1 na multiclasse); Especialização 2 no nível 2 e 2 no nível 9.
  choices: {
    1: { musicalInstrument: 1, musicalInstrumentStart: 2 },
    2: { expertise: 2 },
    9: { expertise: 2 },
  },
  // PHB 2014: Especialização nos níveis 3 e 10.
  legacyChoices: {
    1: { musicalInstrument: 1, musicalInstrumentStart: 2 },
    3: { expertise: 2 },
    10: { expertise: 2 },
  },
  subclassChoices: {
    lore: { 3: { loreSkill: 3 }, 6: { magicalDiscoveries: 2 } },
    swords: { 3: { fightingStyle: 1 } },
  },
  // Fichas 2014: Saber ganha 3 perícias (nv 3) e 2 magias de qualquer classe (nv 6).
  legacySubclassChoices: {
    lore: { 3: { loreSkill: 3 }, 6: { additionalMagicalSecrets: 2 } },
    swords: { 3: { fightingStyle: 1 } },
  },
  features,
  subclasses,
  resources,
};
