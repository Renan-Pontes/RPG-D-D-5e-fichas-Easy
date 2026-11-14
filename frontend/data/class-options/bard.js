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
      b("Você pode inspirar outros de forma sobrenatural por meio de palavras, música ou dança. Esta inspiração é representada pelo seu dado de Inspiração Bárdica, que é um d6.\n\nUsando Inspiração Bárdica. Como uma Ação Bônus, você pode inspirar outra criatura a até 18 metros de você que possa vê-lo ou ouvi-lo. Essa criatura ganha um dos seus dados de Inspiração Bárdica. Uma criatura pode ter apenas um dado de Inspiração Bárdica por vez.\n\nUma vez na hora seguinte, quando a criatura falhar em um Teste de D20, ela pode rolar o dado de Inspiração Bárdica e adicionar o número rolado ao d20, potencialmente transformando a falha em sucesso. Um dado de Inspiração Bárdica é gasto quando é rolado.\n\nNúmero de Usos. Você pode conceder um dado de Inspiração Bárdica um número de vezes igual ao seu modificador de Carisma (mínimo de uma vez) e recupera todos os usos gastos ao terminar um Descanso Longo.\n\nEm Níveis Superiores. Seu dado de Inspiração Bárdica muda quando você alcança determinados níveis de Bardo, conforme mostrado na coluna Dado Bárdico da tabela Características de Bardo. O dado se torna um d8 no nível 5, um d10 no nível 10 e um d12 no nível 15.",
        "You can supernaturally inspire others through words, music, or dance. This inspiration is represented by your Bardic Inspiration die, which is a d6.\n\nUsing Bardic Inspiration. As a Bonus Action, you can inspire another creature within 60 feet of yourself who can see or hear you. That creature gains one of your Bardic Inspiration dice. A creature can have only one Bardic Inspiration die at a time.\n\nOnce within the next hour when the creature fails a D20 Test, the creature can roll the Bardic Inspiration die and add the number rolled to the d20, potentially turning the failure into a success. A Bardic Inspiration die is expended when it's rolled.\n\nNumber of Uses. You can confer a Bardic Inspiration die a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\n\nAt Higher Levels. Your Bardic Inspiration die changes when you reach certain Bard levels, as shown in the Bardic Die column of the Bard Features table. The die becomes a d8 at level 5, a d10 at level 10, and a d12 at level 15.")),
    f('spellcasting', b('Conjuração', 'Spellcasting'),
      b('Você conjura magias de Bardo usando Carisma; um Instrumento Musical serve de foco. Truques: 2 da lista de Bardo (3 no nível 4, 4 no nível 10); a cada nível de Bardo pode trocar um truque. Magias preparadas: comece com 4 de 1º círculo; o número cresce conforme a tabela e as novas devem ser de um círculo para o qual tenha espaços. A cada nível de Bardo pode trocar uma magia preparada. Magias que um traço de Bardo deixa sempre preparadas não contam no limite. Espaços voltam num Descanso Longo.',
        'You cast Bard spells using Charisma; a Musical Instrument is your focus. Cantrips: 2 from the Bard list (3 at level 4, 4 at level 10); whenever you gain a Bard level you can replace one. Prepared spells: start with four level 1 spells; the number grows per the table, and new spells must be of a level for which you have slots. Whenever you gain a Bard level you can replace one prepared spell. Spells a Bard feature keeps always prepared don\'t count against the limit. Slots return on a Long Rest.')),
  ],
  2: [
    f('expertise', b('Especialização', 'Expertise'),
      b("Você ganha Especialização (veja \"Glossário de Regras\") em duas de suas perícias com as quais seja proficiente à sua escolha. Atuação e Persuasão são recomendadas se você tiver proficiência nelas.\n\nNo nível 9 de Bardo, você ganha Especialização em mais duas perícias com as quais seja proficiente à sua escolha.",
        "You gain Expertise (see \"Rules Glossary\") in two of your skill proficiencies of your choice. Performance and Persuasion are recommended if you have proficiency in them.\n\nAt Bard level 9, you gain Expertise in two more of your skill proficiencies of your choice.")),
    f('jackOfAllTrades', b('Pau para Toda Obra', 'Jack of All Trades'),
      b("Você pode adicionar metade do seu Bônus de Proficiência (arredondado para baixo) a qualquer teste de atributo que você fizer que use uma proficiência de perícia que você não possua e que normalmente não use o seu Bônus de Proficiência.\n\nPor exemplo, se você fizer um teste de Força (Atletismo) e não tiver proficiência em Atletismo, poderá adicionar metade do seu Bônus de Proficiência ao teste.",
        "You can add half your Proficiency Bonus (round down) to any ability check you make that uses a skill proficiency you lack and that doesn't otherwise use your Proficiency Bonus.\n\nFor example, if you make a Strength (Athletics) check and lack Athletics proficiency, you can add half your Proficiency Bonus to the check.")),
  ],
  3: [
    f('bardSubclass', b('Subclasse de Bardo', 'Bard Subclass'),
      b("Você ganha uma subclasse de Bardo à sua escolha. A subclasse Colégio do Conhecimento é detalhada após a descrição desta classe. Uma subclasse é uma especialização que concede características a você em determinados níveis de Bardo. Pelo restante da sua carreira, você ganha cada uma das características da sua subclasse que sejam de seu nível de Bardo ou inferior.",
        "You gain a Bard subclass of your choice. The College of Lore subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Bard levels. For the rest of your career, you gain each of your subclass's features that are of your Bard level or lower.")),
  ],
  4: [ASI],
  5: [
    f('fontOfInspiration', b('Fonte de Inspiração', 'Font of Inspiration'),
      b("Agora você recupera todos os seus usos gastos de Inspiração Bárdica ao terminar um Descanso Curto ou Longo.\n\nAlém disso, você pode gastar um espaço de magia (nenhuma ação necessária) para recuperar um uso gasto de Inspiração Bárdica.",
        "You now regain all your expended uses of Bardic Inspiration when you finish a Short or Long Rest.\n\nIn addition, you can expend a spell slot (no action required) to regain one expended use of Bardic Inspiration.")),
  ],
  7: [
    f('countercharm', b('Contraencanto', 'Countercharm'),
      b("Você pode usar notas musicais ou palavras de poder para perturbar efeitos que influenciem a mente. Se você ou uma criatura a até 9 metros de você falhar em uma salvaguarda contra um efeito que aplique a condição Enfeitiçado ou Amedrontado, você pode realizar uma Reação para fazer com que a salvaguarda seja rolada novamente, e a nova jogada terá Vantagem.",
        "You can use musical notes or words of power to disrupt mind-influencing effects. If you or a creature within 30 feet of you fails a saving throw against an effect that applies the Charmed or Frightened condition, you can take a Reaction to cause the save to be rerolled, and the new roll has Advantage.")),
  ],
  8: [ASI],
  9: [
    f('expertise', b('Especialização', 'Expertise'),
      b("Você ganha Especialização (veja \"Glossário de Regras\") em duas de suas perícias com as quais seja proficiente à sua escolha. Atuação e Persuasão são recomendadas se você tiver proficiência nelas.\n\nNo nível 9 de Bardo, você ganha Especialização em mais duas perícias com as quais seja proficiente à sua escolha.",
        "You gain Expertise (see \"Rules Glossary\") in two of your skill proficiencies of your choice. Performance and Persuasion are recommended if you have proficiency in them.\n\nAt Bard level 9, you gain Expertise in two more of your skill proficiencies of your choice.")),
  ],
  10: [
    f('magicalSecrets', b('Segredos Mágicos', 'Magical Secrets'),
      b('A partir deste nível, sempre que o número de Magias Preparadas aumentar, as novas magias podem vir das listas de Bardo, Clérigo, Druida e Mago, e contam como magias de Bardo para você. Ao trocar uma magia preparada, a substituta também pode vir dessas listas. Seu dado de Inspiração passa a d10.',
        'From this level on, whenever your number of Prepared Spells increases, the new spells can come from the Bard, Cleric, Druid, and Wizard lists, and they count as Bard spells for you. When you replace a prepared spell, the replacement can also come from those lists. Your Bardic Inspiration die becomes a d10.')),
  ],
  12: [ASI],
  15: [
    f('bardicDieD12', b('Inspiração de Bardo (d12)', 'Bardic Inspiration (d12)'),
      b("Você pode inspirar outros de forma sobrenatural por meio de palavras, música ou dança. Esta inspiração é representada pelo seu dado de Inspiração Bárdica, que é um d6.\n\nUsando Inspiração Bárdica. Como uma Ação Bônus, você pode inspirar outra criatura a até 18 metros de você que possa vê-lo ou ouvi-lo. Essa criatura ganha um dos seus dados de Inspiração Bárdica. Uma criatura pode ter apenas um dado de Inspiração Bárdica por vez.\n\nUma vez na hora seguinte, quando a criatura falhar em um Teste de D20, ela pode rolar o dado de Inspiração Bárdica e adicionar o número rolado ao d20, potencialmente transformando a falha em sucesso. Um dado de Inspiração Bárdica é gasto quando é rolado.\n\nNúmero de Usos. Você pode conceder um dado de Inspiração Bárdica um número de vezes igual ao seu modificador de Carisma (mínimo de uma vez) e recupera todos os usos gastos ao terminar um Descanso Longo.\n\nEm Níveis Superiores. Seu dado de Inspiração Bárdica muda quando você alcança determinados níveis de Bardo, conforme mostrado na coluna Dado Bárdico da tabela Características de Bardo. O dado se torna um d8 no nível 5, um d10 no nível 10 e um d12 no nível 15.", "You can supernaturally inspire others through words, music, or dance. This inspiration is represented by your Bardic Inspiration die, which is a d6.\n\nUsing Bardic Inspiration. As a Bonus Action, you can inspire another creature within 60 feet of yourself who can see or hear you. That creature gains one of your Bardic Inspiration dice. A creature can have only one Bardic Inspiration die at a time.\n\nOnce within the next hour when the creature fails a D20 Test, the creature can roll the Bardic Inspiration die and add the number rolled to the d20, potentially turning the failure into a success. A Bardic Inspiration die is expended when it's rolled.\n\nNumber of Uses. You can confer a Bardic Inspiration die a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\n\nAt Higher Levels. Your Bardic Inspiration die changes when you reach certain Bard levels, as shown in the Bardic Die column of the Bard Features table. The die becomes a d8 at level 5, a d10 at level 10, and a d12 at level 15.")),
  ],
  16: [ASI],
  18: [
    f('superiorInspiration', b('Inspiração Superior', 'Superior Inspiration'),
      b('Ao rolar Iniciativa, se tiver menos de dois usos de Inspiração de Bardo, você recupera usos até ficar com dois.',
        'When you roll Initiative, you regain expended uses of Bardic Inspiration until you have two if you have fewer than that.')),
  ],
  19: [
    f('epicBoon', b('Dádiva Épica', 'Epic Boon'),
      b("Você ganha um talento de Dádiva Épica (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Dádiva da Recuperação de Magia é recomendada.",
        "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Spell Recall is recommended.")),
  ],
  20: [
    f('wordsOfCreation', b('Palavras da Criação', 'Words of Creation'),
      b("Você dominou duas das Palavras da Criação: as palavras da vida e da morte. Portanto, você sempre tem as magias Palavra de Poder Curar e Palavra de Poder Matar preparadas. Quando conjurar qualquer uma dessas magias, você pode mirar em uma segunda criatura com ela se essa criatura estiver a até 3 metros do primeiro alvo.",
        "You have mastered two of the Words of Creation: the words of life and death. You therefore always have the Power Word Heal and Power Word Kill spells prepared. When you cast either spell, you can target a second creature with it if that creature is within 10 feet of the first target.")),
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
          b("Quando um inimigo que você possa ver terminar o turno dele a até 1,5 metro de você, você pode realizar uma Reação e gastar um uso da sua Inspiração de Bardo para se mover até metade do seu Deslocamento. Então, um aliado à sua escolha a até 9 metros de você também pode se mover até metade do Deslocamento dele usando a Reação dele.\n\nNenhum dos movimentos desta característica provoca Ataques de Oportunidade.",
            "When an enemy you can see ends its turn within 5 feet of you, you can take a Reaction and expend one use of your Bardic Inspiration to move up to half your Speed. Then one ally of your choice within 30 feet of you can also move up to half their Speed using their Reaction.\n\nNone of this feature's movement provokes Opportunity Attacks.")),
        f('tandemFootwork', b('Passos em Conjunto', 'Tandem Footwork'),
          b("Quando você rolar Iniciativa, você pode gastar um uso da sua Inspiração de Bardo se não tiver a condição Incapacitado. Ao fazer isso, role o seu dado de Inspiração de Bardo; você e cada aliado a até 9 metros de você que puder ver ou ouvir você ganham um bônus na Iniciativa igual ao número rolado.",
            "When you roll Initiative, you can expend one use of your Bardic Inspiration if you don't have the\nIncapacitated condition. When you do so, roll your Bardic Inspiration die; you and each ally within 30 feet of you who can see or hear you gains a bonus to Initiative equal to the number rolled.")),
      ] },
      14: { features: [
        f('leadingEvasion', b('Evasão Conduzida', 'Leading Evasion'),
          b("Quando você for submetido a um efeito que permita fazer uma salvaguarda de Destreza para sofrer apenas metade do dano, em vez disso, você não sofre dano se obtiver sucesso na salvaguarda e apenas metade do dano se falhar. Se quaisquer criaturas a até 1,5 metro de você estiverem fazendo a mesma salvaguarda de Destreza, você pode compartilhar este benefício com elas para aquela salvaguarda.\n\nVocê não pode usar esta característica se tiver a condição Incapacitado.",
            "When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. If any creatures within 5 feet of you are making the same Dexterity saving throw, you can share this benefit with them for that save.\n\nYou can't use this feature if you have the Incapacitated condition.")),
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
            b("Você sempre tem as magias Enfeitiçar Pessoa e Imagem Espelhada preparadas.\n\nAlém disso, imediatamente após conjurar uma magia de Encantamento ou Ilusão usando um espaço de magia, você pode fazer com que uma criatura que você possa ver a até 18 metros de você faça uma salvaguarda de Sabedoria contra a CD de resistência das suas magias. Se falhar na salvaguarda, o alvo fica com a condição Enfeitiçado ou Amedrontado (à sua escolha) por 1 minuto. O alvo repete a salvaguarda no final de cada um dos turnos dele, encerrando o efeito sobre si em caso de sucesso.\n\nUma vez que usar este benefício, você não pode usá-lo novamente até terminar um Descanso Longo. Você também pode recuperar o uso dele gastando um uso da sua Inspiração de Bardo (nenhuma ação necessária).",
              "You always have the Charm Person and Mirror Image spells prepared.\n\nIn addition, immediately after you cast an Enchantment or Illusion spell using a spell slot, you can cause a creature you can see within 60 feet of yourself to make a Wisdom saving throw against your spell save DC. On a failed save, the target has the Charmed or Frightened condition (your choice) for 1 minute. The target repeats the save at the end of each of its turns, ending the effect on itself on a success.\n\nOnce you use this benefit, you can't use it again until you finish a Long Rest. You can also restore your use of it by expending one use of your Bardic Inspiration (no action required).")),
          f('mantleOfInspiration', b('Manto de Inspiração', 'Mantle of Inspiration'),
            b("Você pode tecer magia feérica em uma canção ou dança para encher outros de vigor. Como uma Ação Bônus, você pode gastar um uso de Inspiração de Bardo, rolando um dado de Inspiração de Bardo. Ao fazer isso, escolha um número de outras criaturas a até 18 metros de você, até um número igual ao seu modificador de Carisma (mínimo de uma criatura). Cada uma dessas criaturas ganha uma quantidade de Pontos de Vida Temporários igual a duas vezes o número rolado no dado de Inspiração de Bardo e, em seguida, cada uma pode usar a Reação dela para se mover até o seu Deslocamento sem provocar Ataques de Oportunidade.",
              "You can weave fey magic into a song or dance to fill others with vigor. As a Bonus Action, you can expend a use of Bardic Inspiration, rolling a Bardic\nInspiration die. When you do so, choose a number of other creatures within 60 feet of yourself, up to a number equal to your Charisma modifier (minimum of one creature). Each of those creatures gains a number of Temporary Hit Points equal to two times the number rolled on the Bardic Inspiration die, and then each can use its Reaction to move up to its Speed without provoking Opportunity Attacks.")),
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
          b("Você aprende a usar sua perspicácia para distrair, confundir e drenar sobrenaturalmente a confiança e a competência dos outros. Quando uma criatura que você possa ver a até 18 metros de você fizer uma jogada de dano ou for bem-sucedida em um teste de atributo ou jogada de ataque, você pode realizar uma Reação para gastar um uso da sua Inspiração de Bardo; role o seu dado de Inspiração de Bardo e subtraia o número rolado da jogada da criatura, reduzindo o dano ou potencialmente transformando o sucesso em uma falha.",
            "You learn to use your wit to supernaturally distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of yourself makes a damage roll or succeeds on an ability check or attack roll, you can take a Reaction to expend one use of your Bardic Inspiration; roll your Bardic Inspiration die, and subtract the number rolled from the creature's roll, reducing the damage or potentially turning the success into a failure.")),
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
          b("Você ganha proficiência com armas Marciais e treinamento com armaduras Médias e Escudos.\n\nAlém disso, você pode usar uma arma Simples ou Marcial como Foco de Conjuração para conjurar magias da sua lista de magias de Bardo.",
            "You gain proficiency with Martial weapons and training with Medium armor and Shields.\n\nIn addition, you can use a Simple or Martial weapon as a Spellcasting Focus to cast spells from your Bard spell list.")),
      ] },
      6: {
        features: [
          f('extraAttack', b('Ataque Extra', 'Extra Attack'),
            b("Você pode atacar duas vezes, em vez de uma, sempre que realizar a ação de Ataque em seu turno. NÍVEL 5: MOVIMENTO RÁPIDO Seu deslocamento aumenta em 3 metros enquanto você não estiver usando armadura Pesada.",
              "You can attack twice instead of once whenever you take the Attack action on your turn. LEVEL 5 : FAST MOVEMENT You r speed increases by 10 feet while you ar en't wea ring Heavy armor.")),
        ],
        extraAttacks: 1,
      },
      14: { features: [
        f('battleMagic', b('Magia de Batalha', 'Battle Magic'),
          b("Após conjurar uma magia que tenha tempo de conjuração de uma ação, você pode realizar um ataque com uma arma como uma Ação Bônus.",
            "After you cast a spell that has a casting time of an action, you can make one attack with a weapon as a Bonus Action.")),
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
          b("No 3º nível, você adota um estilo de luta como sua especialidade. Escolha uma das seguintes opções. Você não pode escolher uma opção de Estilo de Luta mais de uma vez, mesmo se algo no jogo permitir que você escolha novamente.\n\nDUELO\n\nQuando estiver empunhando uma arma corpo a corpo em uma mão e nenhuma outra arma, você ganha um bônus de +2 nas jogadas de dano com aquela arma.\n\nCOMBATE COM DUAS ARMAS\n\nQuando você se engajar em combate com duas armas, você pode adicionar seu modificador de atributo ao dano do segundo ataque.", "At 3rd level, you adopt a style of fighting as your specialty. Choose one of the following options. You can’t take a Fighting Style option more than once, even if something in the game lets you choose again.\n\nDUELING\n\nWhen you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.\n\nTWO-WEAPON FIGHTING\n\nWhen you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.")),
        f('bladeFlourish', b('Floreio de Lâmina', 'Blade Flourish'),
          b("No 3º nível, você aprende a realizar demonstrações impressionantes de proeza marcial e velocidade.\n\nSempre que realizar a ação de Ataque em seu turno, seu deslocamento de caminhada aumenta em 3 metros até o final do turno e, se um ataque com arma que você fizer como parte dessa ação atingir uma criatura, você pode usar uma das seguintes opções de Floresio de Lâmina à sua escolha. Você pode usar apenas uma opção de Floresio de Lâmina por turno.\n\nFloresio Defensivo. Você pode gastar um uso da sua Inspiração de Bardo para fazer com que a arma cause dano adicional ao alvo atingido. O dano é igual ao número que você rolar no dado de Inspiração de Bardo. Você também adiciona o número rolado à sua CA até o início do seu próximo turno.\n\nFloresio Cortante. Você pode gastar um uso da sua Inspiração de Bardo para fazer com que a arma cause dano adicional ao alvo atingido e a qualquer outra criatura à sua escolha que você possa ver a até 1,5 metro de você. O dano é igual ao número que você rolar no dado de Inspiração de Bardo.\n\nFloresio Móvel. Você pode gastar um uso da sua Inspiração de Bardo para fazer com que a arma cause dano adicional ao alvo atingido. O dano é igual ao número que você rolar no dado de Inspiração de Bardo. Você também pode empurrar o alvo até 1,5 metro para longe de você, mais uma distância em metros igual a 1,5 vezes o número rolado naquele dado. Você pode então usar imediatamente sua reação para se mover até o seu deslocamento de caminhada para um espaço desocupado a até 1,5 metro do alvo.",
            "At 3rd level, you learn to perform impressive displays of martial prowess and speed.\n\nWhenever you take the Attack action on your turn, your walking speed increases by 10 feet until the end of the turn, and if a weapon attack that you make as part of this action hits a creature, you can use one of the following Blade Flourish options of your choice. You can use only one Blade Flourish option per turn.\n\nDefensive Flourish. You can expend one use of your Bardic Inspiration to cause the weapon to deal extra damage to the target you hit. The damage equals the number you roll on the Bardic Inspiration die. You also add the number rolled to your AC until the start of your next turn.\n\nSlashing Flourish. You can expend one use of your Bardic Inspiration to cause the weapon to deal extra damage to the target you hit and to any other creature of your choice that you can see within 5 feet of you. The damage equals the number you roll on the Bardic Inspiration die.\n\nMobile Flourish. You can expend one use of your Bardic Inspiration to cause the weapon to deal extra damage to the target you hit. The damage equals the number you roll on the Bardic Inspiration die. You can also push the target up to 5 feet away from you, plus a number of feet equal to the number you roll on that die. You can then immediately use your reaction to move up to your walking speed to an unoccupied space within 5 feet of the target.")),
      ] },
      6: {
        features: [
          f('extraAttack', b('Ataque Extra', 'Extra Attack'),
            b("A partir do 6º nível, você pode atacar duas vezes, em vez de uma, sempre que realizar a ação de Ataque em seu turno.", "Starting at 6th level, you can attack twice, instead of once, whenever you take the Attack action on your turn.")),
        ],
        extraAttacks: 1,
      },
      14: { features: [
        f('mastersFlourish', b('Floreio de Mestre', "Master's Flourish"),
          b("A partir do 14º nível, sempre que você usar uma opção de Floresio de Lâmina, você pode rolar um d6 e usá-lo em vez de gastar um dado de Inspiração de Bardo.",
            "Starting at 14th level, whenever you use a Blade Flourish option, you can roll a d6 and use it instead of expending a Bardic Inspiration die.")),
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
          b("Quando você se junta ao Colégio dos Sussurros no 3º nível, você ganha a habilidade de tornar seus ataques com arma magicamente tóxicos para a mente de uma criatura.\n\nQuando você atinge uma criatura com um ataque com arma, você pode gastar um uso da sua Inspiração de Bardo para causar 2d6 de dano psíquico adicional àquele alvo. Você pode fazer isso apenas uma vez por rodada em seu turno.\n\nO dano psíquico aumenta quando você alcança certos níveis nesta classe, aumentando para 3d6 no 5º nível, 5d6 no 10º nível e 8d6 no 15º nível.",
            "When you join the College of Whispers at 3rd level, you gain the ability to make your weapon attacks magically toxic to a creature’s mind.\n\nWhen you hit a creature with a weapon attack, you can expend one use of your Bardic Inspiration to deal an extra 2d6 psychic damage to that target. You can do so only once per round on your turn.\n\nThe psychic damage increases when you reach certain levels in this class, increasing to 3d6 at 5th level, 5d6 at 10th level, and 8d6 at 15th level.")),
        f('wordsOfTerror', b('Palavras de Terror', 'Words of Terror'),
          b('Depois de conversar a sós por 1 minuto com um humanoide, ele faz uma salvaguarda de Sabedoria contra sua CD; na falha, fica amedrontado de você ou de outra criatura que você escolher por 1 hora (termina se for atacado ou ferido, ou vir aliados sendo atacados). No sucesso, não percebe a tentativa. 1×/Descanso Curto ou Longo.',
            'After speaking alone with a humanoid for 1 minute, it makes a Wisdom save against your DC; on a failure it is frightened of you or another creature you choose for 1 hour (ends if it is attacked or damaged, or sees its allies attacked). On a success it has no hint of the attempt. Once per Short or Long Rest.')),
      ] },
      6: { features: [
        f('mantleOfWhispers', b('Manto de Sussurros', 'Mantle of Whispers'),
          b("No 6º nível, você ganha a habilidade de adotar a persona de um humanoide. Quando um humanoide morre a até 9 metros de você, você pode capturar magicamente a sombra dele usando sua reação. Você retém essa sombra até usá-la ou terminar um descanso longo.\n\nVocê pode usar a sombra como uma ação. Ao fazer isso, ela desaparece, transformando-se magicamente em um disfarce que surge sobre você. Agora você se parece com a pessoa morta, mas saudável e viva. Esse disfarce dura por 1 hora ou até você encerrá-lo como uma ação bônus.\n\nEnquanto estiver no disfarce, você ganha acesso a todas as informações que o humanoide compartilharia livremente com um conhecido casual. Tais informações incluem detalhes gerais sobre seu histórico e vida pessoal, mas não incluem segredos. A informação é suficiente para que você se passe pela pessoa recorrendo às memórias dela.\n\nOutra criatura pode ver através desse disfarce sendo bem-sucedida em um teste de Sabedoria (Intuição) contestado pelo seu teste de Carisma (Enganação). Você ganha um bônus de +5 no seu teste.\nound e vida pessoal, mas não incluem segredos. A informação é suficiente para que você se passe pela pessoa recorrendo às memórias dela.\n\nOutra criatura pode ver através desse disfarce sendo bem-sucedida em um teste de Sabedoria (Intuição) contestado pelo seu teste de Carisma (Enganação). Você ganha um bônus de +5 no seu teste.\n\nUma vez que capturar uma sombra com esta característica, você não pode capturar outra com ela até terminar um descanso curto ou longo.",
            "At 6th level, you gain the ability to adopt a humanoid’s persona. When a humanoid dies within 30 feet of you, you can magically capture its shadow using your reaction. You retain this shadow until you use it or you finish a long rest.\n\nYou can use the shadow as an action. When you do so, it vanishes, magically transforming into a disguise that appears on you. You now look like the dead person, but healthy and alive. This disguise lasts for 1 hour or until you end it as a bonus action.\n\nWhile you’re in the disguise, you gain access to all information that the humanoid would freely share with a casual acquaintance. Such information includes general details on its background and personal life, but doesn’t include secrets. The information is enough that you can pass yourself off as the person by drawing on its memories.\n\nAnother creature can see through this disguise by succeeding on a Wisdom (Insight) check contested by your Charisma (Deception) check. You gain a +5 bonus to your check.\n\nOnce you capture a shadow with this feature, you can’t capture another one with it until you finish a short or long rest.")),
      ] },
      14: { features: [
        f('shadowLore', b('Saber das Sombras', 'Shadow Lore'),
          b("No 14º nível, você ganha a habilidade de tecer magia sombria em suas palavras e explorar os medos mais profundos de uma criatura.\n\nComo uma ação, você sussurra magicamente uma frase que apenas uma criatura à sua escolha a até 9 metros de você pode ouvir. O alvo deve fazer uma salvaguarda de Sabedoria contra a CD de resistência das suas magias. Ele é automaticamente bem-sucedido se não compartilhar um idioma com você ou se não puder ouvir você. Em uma salvaguarda bem-sucedida, seu sussurro soa como um resmungo ininteligível e não tem efeito.\n\nSe falhar na salvaguarda, o alvo fica enfeitiçado por você pelas próximas 8 horas ou até que você ou seus aliados o ataquem, causem dano a ele ou o forcem a fazer uma salvaguarda. Ele interpreta os sussurros como uma descrição do seu segredo mais humilhante. Você não obtém conhecimento desse segredo, mas o alvo fica convencido de que você o conhece.\n\nA criatura enfeitiçada obedece aos seus comandos por medo de que você revele o segredo dela. Ela não arriscará a vida por você nem lutará por você, a menos que já estivesse inclinada a fazê-lo. Ela concede a você favores e presentes que ofereceria a um amigo próximo.\n\nQuando o efeito termina, a criatura não compreende por que tinha tanto medo de você.\n\nUma vez que usar esta característica, você não pode usá-la novamente até terminar um descanso longo.",
            "At 14th level, you gain the ability to weave dark magic into your words and tap into a creature’s deepest fears.\n\nAs an action, you magically whisper a phrase that only one creature of your choice within 30 feet of you can hear. The target must make a Wisdom saving throw against your spell save DC. It automatically succeeds if it doesn’t share a language with you or if it can’t hear you. On a successful saving throw, your whisper sounds like unintelligible mumbling and has no effect.\n\nOn a failed saving throw, the target is charmed by you for the next 8 hours or until you or your allies attack it, damage it, or force it to make a saving throw. It interprets the whispers as a description of its most mortifying secret. You gain no knowledge of this secret, but the target is convinced you know it.\n\nThe charmed creature obeys your commands for fear that you will reveal its secret. It won’t risk its life for you or fight for you, unless it was already inclined to do so. It grants you favors and gifts it would offer to a close friend.\n\nWhen the effect ends, the creature has no understanding of why it held you in such fear.\n\nOnce you use this feature, you can’t use it again until you finish a long rest.")),
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
          b("Característica de 3º nível do Colégio da Criação\n\nSempre que conceder um dado de Inspiração de Bardo a uma criatura, você pode entoar uma nota da Canção da Criação para criar um fragmento Minúsculo de potencial, que orbita a até 1,5 metro daquela criatura. O fragmento é intangível e invulnerável, e dura até que o dado de Inspiração de Bardo seja perdido. O fragmento se parece com uma nota musical, uma estrela, uma flor ou outro símbolo de arte ou vida à sua escolha.\n\nQuando a criatura usa o dado de Inspiração de Bardo, o fragmento fornece um efeito adicional com base em se o dado beneficia um teste de atributo, uma jogada de ataque ou uma salvaguarda, conforme detalhado abaixo:\npiração de Bardo seja perdido. O fragmento se parece com uma nota musical, uma estrela, uma flor ou outro símbolo de arte ou vida à sua escolha.\n\nQuando a criatura usa o dado de Inspiração de Bardo, o fragmento fornece um efeito adicional com base em se o dado beneficia um teste de atributo, uma jogada de ataque ou uma salvaguarda, conforme detalhado abaixo:\n\nTeste de Atributo. Quando a criatura rolar o dado de Inspiração de Bardo para adicioná-lo a um teste de atributo, ela pode rolar o dado de Inspiração de Bardo novamente e escolher qual rolagem usar, enquanto o fragmento estoura e emite faíscas coloridas e inofensivas por um instante.\n\nJogada de Ataque. Imediatamente após a criatura rolar o dado de Inspiração de Bardo para adicioná-lo a uma jogada de ataque contra um alvo, o fragmento se estilhaça estrondosamente. O alvo e cada criatura à sua escolha que você possa ver a até 1,5 metro dele devem ser bem-sucedidos em uma salvaguarda de Constituição contra a CD de resistência das suas magias ou sofrer dano trovejante igual ao número rolado no dado de Inspiração de Bardo.\n\nSalvaguarda. Imediatamente após a criatura rolar o dado de Inspiração de Bardo e adicioná-lo a uma salvaguarda, o fragmento desaparece com o som de uma música suave, fazendo com que a criatura ganhe pontos de vida temporários iguais ao número rolado no dado de Inspiração de Bardo mais o seu modificador de Carisma (mínimo de 1 ponto de vida temporário).",
            "3rd-level College of Creation feature\n\nWhenever you give a creature a Bardic Inspiration die, you can utter a note from the Song of Creation to create a Tiny mote of potential, which orbits within 5 feet of that creature. The mote is intangible and invulnerable, and it lasts until the Bardic Inspiration die is lost. The mote looks like a musical note, a star, a flower, or another symbol of art or life that you choose.\n\nWhen the creature uses the Bardic Inspiration die, the mote provides an additional effect based on whether the die benefits an ability check, an attack roll, or a saving throw, as detailed below:\n\nAbility Check. When the creature rolls the Bardic Inspiration die to add it to an ability check, the creature can roll the Bardic Inspiration die again and choose which roll to use, as the mote pops and emits colorful, harmless sparks for a moment.\n\nAttack Roll. Immediately after the creature rolls the Bardic Inspiration die to add it to an attack roll against a target, the mote thunderously shatters. The target and each creature of your choice that you can see within 5 feet of it must succeed on a Constitution saving throw against your spell save DC or take thunder damage equal to the number rolled on the Bardic Inspiration die.\n\nSaving Throw. Immediately after the creature rolls the Bardic Inspiration die and adds it to a saving throw, the mote vanishes with the sound of soft music, causing the creature to gain temporary hit points equal to the number rolled on the Bardic Inspiration die plus your Charisma modifier (minimum of 1 temporary hit point).")),
        f('performanceOfCreation', b('Performance da Criação', 'Performance of Creation'),
          b("Característica de 3º nível do Colégio da Criação\n\nComo uma ação, você pode canalizar a magia da Canção da Criação para criar um item não mágico à sua escolha em um espaço desocupado a até 3 metros de você. O item deve surgir em uma superfície ou líquido capaz de sustentá-lo. O valor em po do item não pode ultrapassar 20 vezes o seu nível de bardo, e o item deve ser Médio ou menor. O item brilha suavemente, e uma criatura pode ouvir fracamente uma música ao tocá-lo. O item criado desaparece após um número de horas igual ao seu bônus de proficiência. Para exemplos de itens que você pode criar, consulte o capítulo de equipamentos do Livro do Jogador.\n\nUma vez que criar um item com esta característica, você não pode fazê-lo novamente até terminar um descanso longo, a menos que gaste um espaço de magia de 2º círculo ou superior para usar esta característica novamente. Você só pode ter um item criado por esta característica por vez; se usar esta ação e já tiver um item desta característica, o primeiro desaparece imediatamente.\n\nO tamanho do item que você pode criar com esta característica aumenta em uma categoria de tamanho quando você alcança o 6º nível (Grande) e o 14º nível (Enorme).",
            "3rd-level College of Creation feature\n\nAs an action, you can channel the magic of the Song of Creation to create one nonmagical item of your choice in an unoccupied space within 10 feet of you. The item must appear on a surface or in a liquid that can support it. The gp value of the item can’t be more than 20 times your bard level, and the item must be Medium or smaller. The item glimmers softly, and a creature can faintly hear music when touching it. The created item disappears after a number of hours equal to your proficiency bonus. For examples of items you can create, see the equipment chapter of the Player’s Handbook.\n\nOnce you create an item with this feature, you can’t do so again until you finish a long rest, unless you expend a spell slot of 2nd level or higher to use this feature again. You can have only one item created by this feature at a time; if you use this action and already have an item from this feature, the first one immediately vanishes.\n\nThe size of the item you can create with this feature increases by one size category when you reach 6th level (Large) and 14th level (Huge).")),
      ] },
      6: { features: [
        f('animatingPerformance', b('Performance Animadora', 'Animating Performance'),
          b("Característica de 6º nível do Colégio da Criação\n\nComo uma ação, você pode animar um item não mágico Grande ou menor a até 9 metros de você que não esteja sendo vestido ou carregado. O item animado usa o bloco de estatísticas de Item Dançarino, que utiliza o seu bônus de proficiência (BP). O item é amigável a você e aos seus companheiros e obedece aos seus comandos. Ele vive por 1 hora, até ser reduzido a 0 pontos de vida, ou até você morrer.\n\nEm combate, o item compartilha a sua contagem de iniciativa, mas realiza o turno dele imediatamente após o seu. Ele pode se mover e usar a reação dele por conta própria, mas a única ação que realiza nos turnos dele é a ação de Desviar, a menos que você use uma ação bônus em seu turno para comandá-lo a realizar outra ação. Essa ação pode ser uma de seu bloco de estatísticas ou outra ação qualquer. Se você estiver incapacitado, o item pode realizar qualquer ação à escolha dele, não apenas Desviar.\n\nQuando você usa a sua característica Inspiração de Bardo, você pode comandar o item como parte da mesma ação bônus que você usa para a Inspiração de Bardo.\nara comandá-lo a realizar outra ação. Essa ação pode ser uma de seu bloco de estatísticas ou outra ação qualquer. Se você estiver incapacitado, o item pode realizar qualquer ação à escolha dele, não apenas Desviar.\n\nQuando você usa a sua característica Inspiração de Bardo, você pode comandar o item como parte da mesma ação bônus que você usa para a Inspiração de Bardo.\n\nUma vez que animar um item com esta característica, você não pode fazê-lo novamente até terminar um descanso longo, a menos que gaste um espaço de magia de 3º círculo ou superior para usar esta característica novamente. Você só pode ter um item animado por esta característica por vez; se usar esta ação e já tiver um item dançarino desta característica, o primeiro imediatamente se torna inanimado.",
            "6th-level College of Creation feature\n\nAs an action, you can animate one Large or smaller nonmagical item within 30 feet of you that isn’t being worn or carried. The animate item uses the Dancing Item stat block, which uses your proficiency bonus (PB). The item is friendly to you and your companions and obeys your commands. It lives for 1 hour, until it is reduced to 0 hit points, or until you die.\n\nIn combat, the item shares your initiative count, but it takes its turn immediately after yours. It can move and use its reaction on its own, but the only action it takes on its turns is the Dodge action, unless you take a bonus action on your turn to command it to take another action. That action can be one in its stat block or some other action. If you are incapacitated, the item can take any action of its choice, not just Dodge.\n\nWhen you use your Bardic Inspiration feature, you can command the item as part of the same bonus action you use for Bardic Inspiration.\n\nOnce you animate an item with this feature, you can’t do so again until you finish a long rest, unless you expend a spell slot of 3rd level or higher to use this feature again. You can have only one item animated by this feature at a time; if you use this action and already have a dancing item from this feature, the first one immediately becomes inanimate.")),
      ] },
      14: { features: [
        f('creativeCrescendo', b('Crescendo Criativo', 'Creative Crescendo'),
          b("Característica de 14º nível do Colégio da Criação\n\nQuando você usa sua característica Performance da Criação, você pode criar mais de um item de uma vez. O número de itens é igual ao seu modificador de Carisma (mínimo de dois itens). Se você criar um item que exceda esse número, você escolhe qual dos itens criados anteriormente desaparece. Apenas um desses itens pode ser do tamanho máximo que você pode criar; o restante deve ser Pequeno ou Minúsculo.\n\nVocê não é mais limitado pelo valor em po ao criar itens com a Performance da Criação.",
            "14th-level College of Creation feature\n\nWhen you use your Performance of Creation feature, you can create more than one item at once. The number of items equals your Charisma modifier (minimum of two items). If you create an item that would exceed that number, you choose which of the previously created items disappears. Only one of these items can be of the maximum size you can create; the rest must be Small or Tiny.\n\nYou are no longer limited by gp value when creating items with Performance of Creation.")),
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
          b("Característica de 3º nível do Colégio da Eloquência\n\nVocê é um mestre em dizer a coisa certa no momento certo. Quando fizer um teste de Carisma (Persuasão) ou Carisma (Enganação), você pode tratar uma rolagem de d20 de 9 ou menor como um 10.",
            "3rd-level College of Eloquence feature\n\nYou are a master at saying the right thing at the right time. When you make a Charisma (Persuasion) or Charisma (Deception) check, you can treat a d20 roll of 9 or lower as a 10.")),
        f('unsettlingWords', b('Palavras Perturbadoras', 'Unsettling Words'),
          b("Característica de 3º nível do Colégio da Eloquência\n\nVocê pode tecer palavras carregadas de magia que perturbam uma criatura e a fazem duvidar de si mesma. Como uma ação bônus, você pode gastar um uso da sua Inspiração de Bardo e escolher uma criatura que você possa ver a até 18 metros de você. Role o dado de Inspiração de Bardo. A criatura deve subtrair o número rolado da próxima salvaguarda que fizer antes do início do seu próximo turno.",
            "3rd-level College of Eloquence feature\n\nYou can spin words laced with magic that unsettle a creature and cause it to doubt itself. As a bonus action, you can expend one use of your Bardic Inspiration and choose one creature you can see within 60 feet of you. Roll the Bardic Inspiration die. The creature must subtract the number rolled from the next saving throw it makes before the start of your next turn.")),
      ] },
      6: { features: [
        f('unfailingInspiration', b('Inspiração Infalível', 'Unfailing Inspiration'),
          b("Característica de 6º nível do Colégio da Eloquência\n\nSuas palavras inspiradoras são tão persuasivas que outros se sentem impelidos ao sucesso. Quando uma criatura adiciona um dos seus dados de Inspiração de Bardo ao teste de atributo, jogada de ataque ou salvaguarda dela e a rolagem falha, a criatura pode guardar o dado de Inspiração de Bardo.",
            "6th-level College of Eloquence feature\n\nYour inspiring words are so persuasive that others feel driven to succeed. When a creature adds one of your Bardic Inspiration dice to its ability check, attack roll, or saving throw and the roll fails, the creature can keep the Bardic Inspiration die.")),
        f('universalSpeech', b('Fala Universal', 'Universal Speech'),
          b("Característica de 6º nível do Colégio da Eloquência\n\nVocê ganhou a habilidade de tornar a sua fala inteligível para qualquer criatura. Como uma ação, escolha uma ou mais criaturas a até 18 metros de você, até um número igual ao seu modificador de Carisma (mínimo de uma criatura). As criaturas escolhidas podem compreender você magicamente, independentemente do idioma que você fale, por 1 hora.\n\nUma vez que usar esta característica, você não pode usá-la novamente até terminar um descanso longo, a menos que gaste um espaço de magia para usá-la novamente.",
            "6th-level College of Eloquence feature\n\nYou have gained the ability to make your speech intelligible to any creature. As an action, choose one or more creatures within 60 feet of you, up to a number equal to your Charisma modifier (minimum of one creature). The chosen creatures can magically understand you, regardless of the language you speak, for 1 hour.\n\nOnce you use this feature, you can't use it again until you finish a long rest, unless you expend a spell slot to use it again.")),
      ] },
      14: { features: [
        f('infectiousInspiration', b('Inspiração Contagiante', 'Infectious Inspiration'),
          b("Característica de 14º nível do Colégio da Eloquência\n\nQuando você inspira alguém com sucesso, o poder de sua eloquência agora pode se espalhar para outra pessoa. Quando uma criatura a até 18 metros de você adiciona um dos seus dados de Inspiração Bárdica ao seu teste de atributo, jogada de ataque ou salvaguarda e a jogada for bem-sucedida, você pode usar sua reação para encorajar uma criatura diferente (que não seja você) que possa ouvi-lo a até 18 metros de você, concedendo a ela um dado de Inspiração Bárdica sem gastar nenhum dos seus usos de Inspiração Bárdica.\n\nVocê pode usar esta reação um número de vezes igual ao seu modificador de Carisma (mínimo de uma vez) e recupera todos os usos gastos ao terminar um descanso longo.",
            "14th-level College of Eloquence feature\n\nWhen you successfully inspire someone, the power of your eloquence can now spread to someone else. When a creature within 60 feet of you adds one of your Bardic Inspiration dice to its ability check, attack roll, or saving throw and the roll succeeds, you can use your reaction to encourage a different creature (other than yourself) that can hear you within 60 feet of you, giving it a Bardic Inspiration die without expending any of your Bardic Inspiration uses.\n\nYou can use this reaction a number of times equal to your Charisma modifier (minimum of once), and you regain all expended uses when you finish a long rest.")),
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
            b("Você pode estender a mão aos espíritos para guiar você e a outros. Você aprende o truque orientação, que não conta no número de truques de bardo que você conhece. Para você, ele tem um alcance de 18 metros quando você o conjura.",
              "You can reach out to spirits to guide you and others. You learn the guidance cantrip, which doesn’t count against the number of bard cantrips you know. For you, it has a range of 60 feet when you cast it.")),
          f('spiritualFocus', b('Foco Espiritual', 'Spiritual Focus'),
            b('Uma vela, bola de cristal, crânio, tábua espiritual ou baralho tarokka pode servir de foco de conjuração de Bardo. A partir do nível 6, ao conjurar por ele uma magia de Bardo que cause dano ou cure, role um d6 e some a uma jogada de dano ou cura.',
              'A candle, crystal ball, skull, spirit board, or tarokka deck can serve as your Bard spellcasting focus. From level 6, when you cast a Bard spell that deals damage or restores hit points through it, roll a d6 and add it to one damage or healing roll.')),
          f('talesFromBeyond', b('Contos do Além', 'Tales from Beyond'),
            b("Ação Bônus: gaste um uso de Inspiração de Bardo e role seu dado de Inspiração para saber qual conto os espíritos contam: 1 Animal Esperto (dado extra em testes de INT/SAB/CAR por 10 min), 2 Duelista Renomado (ataque mágico corpo a corpo: 2 dados + CAR de energia), 3 Amigos Queridos (alvo e um aliado ganham PV temp.), 4 Fugitivo (teleporte de 9 m com a Reação, levando aliados), 5 Vingador (quem acerta o alvo corpo a corpo sofre energia por 1 min), 6 Viajante (PV temp., +3 m de deslocamento e +1 CA), 7 Sedutor (SAB ou dano psíquico e incapacitado), 8 Fantasma (invisível até o próximo turno; ao acertar, dano necrótico e amedrontado), 9 Bruto (FOR em área ou dano trovejante e caído), 10 Dragão (cone de fogo de 9 m, DES), 11 Anjo (cura e encerra uma condição), 12 Dobra-Mentes (INT ou dano psíquico e atordoado). Você guarda o conto até usá-lo ou terminar um descanso; com uma ação, aplica-o a uma criatura a até 9 m, inclusive você. Só um conto por vez.",
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
          b("Você agora tem a habilidade de conduzir os espíritos de Contos do Além em direção a certos contos. Sempre que você rolar na tabela de Contos Espirituais, você pode rolar o dado duas vezes e escolher qual dos dois efeitos conceder. Se rolar o mesmo número em ambos os dados, você pode ignorar o número e escolher qualquer efeito da tabela.",
            "You now have the ability to nudge the spirits of Tales from Beyond toward certain tales. Whenever you roll on the Spirit Tales table, you can roll the die twice and choose which of the two effects to bestow. If you roll the same number on both dice, you can ignore the number and choose any effect on the table.")),
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
    // Truque ou círculo com espaço disponível; não contam nas magias conhecidas.
    additionalMagicalSecrets: {
      name: b('Segredos Mágicos Adicionais', 'Additional Magical Secrets'),
      kind: 'spell', grantAs: 'spell',
      filter: { maxSlot: true },
    },
    // Bardo 2014 (PHB/SRD 5.1), níveis 10, 14 e 18: 2 magias de qualquer classe (truque
    // ou círculo com espaço). Contam como magias de bardo conhecidas (`countsAsKnown`).
    magicalSecrets2014: {
      name: b('Segredos Mágicos', 'Magical Secrets'),
      kind: 'spell', grantAs: 'spell', countsAsKnown: true,
      filter: { maxSlot: true },
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
    10: { expertise: 2, magicalSecrets2014: 2 },
    14: { magicalSecrets2014: 2 },
    18: { magicalSecrets2014: 2 },
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
