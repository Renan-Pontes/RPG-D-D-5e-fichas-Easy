// Bruxo — traços 2024, Invocações Místicas, Dádiva do Pacto (2014), Arcana
// Mística e subclasses. Formato em README.md.
// Classe base, invocações 2024 e Patrono Ínfero: resumo do SRD 5.2.1 (CC-BY 4.0).
// Demais subclasses e opções de suplemento: resumos originais (nomes, níveis e números apenas).
const b = (pt, en) => ({ pt, en });
const f = (id, name, desc) => ({ id, name, desc });

const DAMAGE_CANTRIP = b('um truque de bruxo que causa dano', 'a Warlock cantrip that deals damage');
const WHICH_CANTRIP = b('Qual truque?', 'Which cantrip?');
const ELDRITCH_BLAST = b('truque Rajada Mística', 'Eldritch Blast cantrip');
const HEX_OR_CURSE = b('magia Maldição ou um traço de bruxo que amaldiçoa (ex.: Maldição da Lâmina)', 'the Hex spell or a Warlock feature that curses (e.g., Hexblade\'s Curse)');

// === Invocações Místicas 2024 (SRD 5.2.1) ===
// `rules: '2024'` marca as que têm versão diferente nas regras de 2014 (ver abaixo).
// Sem `rules`: texto igual nas duas versões.
const invocations2024 = [
  { id: 'agonizingBlast', name: b('Rajada Agonizante', 'Agonizing Blast'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 2+, um Truque de Bruxo Que Cause Dano\n\nEscolha um de seus truques de Bruxo conhecidos que cause dano. Você pode adicionar seu modificador de Carisma às rolagens de dano dessa magia.\n\nRepetível. Você pode obter esta invocação mais de uma vez. Cada vez que o fizer, escolha um truque elegível diferente.", "Prerequisite: Level 2+ Warlock, a Warlock Cantrip That Deals Damage\n\nChoose one of your known Warlock cantrips that deals damage. You can add your Charisma modifier to that spell's damage rolls.\n\nRepeatable. You can gain this invocation more than once. Each time you do so, choose a different eligible cantrip."),
    prereq: { level: 2, text: DAMAGE_CANTRIP }, repeatable: true, detail: WHICH_CANTRIP },
  { id: 'armorOfShadows', name: b('Armadura das Sombras', 'Armor of Shadows'), source: 'SRD',
    desc: b("Você pode conjurar armadura arcana em si mesmo à vontade, sem gastar um espaço de magia ou componentes materiais.", "You can cast mage armor on yourself at will, without expending a spell slot or material components."),
    grants: { spells: ['mageArmor'] } },
  { id: 'ascendantStep', name: b('Passo Ascendente', 'Ascendant Step'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 5+\n\nVocê pode conjurar Levitação em si mesmo sem gastar um espaço de magia.", "Prerequisite: Level 5+ Warlock\n\nYou can cast Levitate on yourself without expending a spell slot."),
    prereq: { level: 5 }, grants: { spells: ['levitate'] } },
  { id: 'devilsSight', name: b('Visão Diabólica', "Devil's Sight"), source: 'SRD',
    desc: b("Você pode ver normalmente na escuridão, tanto mágica quanto não mágica, a uma distância de até 36 metros.", "You can see normally in darkness, both magical and nonmagical, to a distance of 120 feet."),
    prereq: { level: 2 } },
  { id: 'devouringBlade', name: b('Lâmina Devoradora', 'Devouring Blade'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 12+, Invocação Lâmina Sedenta\n\nO Ataque Adicional da sua invocação Lâmina Sedenta confere dois ataques adicionais em vez de um.", "Prerequisite: Level 12+ Warlock, Thirsting Blade Invocation\n\nThe Extra Attack of your Thirsting Blade invocation confers two extra attacks rather than one."),
    prereq: { level: 12, options: ['thirstingBlade'] } },
  { id: 'eldritchMind', name: b('Mente Mística', 'Eldritch Mind'), source: 'SRD',
    desc: b("Você tem vantagem em salvaguardas de Constituição que realizar para manter sua concentração em uma magia.", "You have advantage on Constitution saving throws that you make to maintain your concentration on a spell.") },
  { id: 'eldritchSmite', name: b('Golpe Místico', 'Eldritch Smite'), source: 'SRD',
    desc: b("Pré-requisito: 5º nível, característica Pacto da Lâmina\n\nUma vez por turno, ao atingir uma criatura com sua arma do pacto, você pode gastar um espaço de magia de bruxo para causar 1d8 de dano de energia extra ao alvo, mais outro 1d8 por círculo do espaço de magia, e pode deixar o alvo caído se ele for Enorme ou menor.", "Prerequisite: 5th level, Pact of the Blade feature\n\nOnce per turn when you hit a creature with your pact weapon, you can expend a warlock spell slot to deal an extra 1d8 force damage to the target, plus another 1d8 per level of the spell slot, and you can knock the target prone if it is Huge or smaller."),
    prereq: { level: 5, options: ['pactOfTheBlade'] } },
  { id: 'eldritchSpear', name: b('Lança Mística', 'Eldritch Spear'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 2+, um Truque de Bruxo Que Cause Dano\n\nEscolha um de seus truques de Bruxo conhecidos que cause dano e tenha um alcance de 3 metros ou mais. Quando você conjurar essa magia, seu alcance aumenta em uma quantidade de metros igual a 9 vezes o seu nível de Bruxo.\n\nRepetível. Você pode obter esta invocação mais de uma vez. Cada vez que o fizer, escolha um truque elegível diferente.", "Prerequisite: Level 2+ Warlock, a Warlock Cantrip That Deals Damage\n\nChoose one of your known Warlock cantrips that deals damage and has a range of 10+ feet. When you cast that spell, its range increases by a number of feet equal to 30 times your Warlock level.\n\nRepeatable. You can gain this invocation more than once. Each time you do so, choose a different eligible cantrip."),
    prereq: { level: 2, text: b('um truque de bruxo que causa dano e tem alcance de 3 m+', 'a damaging Warlock cantrip with a range of 10+ feet') }, repeatable: true, detail: WHICH_CANTRIP },
  { id: 'fiendishVigor', name: b('Vigor Demoníaco', 'Fiendish Vigor'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 2+\n\nVocê pode conjurar Vitalidade Ilusória em si mesmo sem gastar um espaço de magia. Quando conjurar a magia com esta característica, você não rola o dado para os Pontos de Vida Temporários; você automaticamente obtém o maior número no dado.", "Prerequisite: Level 2+ Warlock\n\nYou can cast False Life on yourself without expending a spell slot. When you cast the spell with this feature, you don't roll the die for the Temporary Hit Points; you automatically get the highest number on the die."),
    prereq: { level: 2 }, grants: { spells: ['falseLife'] } },
  { id: 'gazeOfTwoMinds', name: b('Olhar de Duas Mentes', 'Gaze of Two Minds'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 5+\n\nVocê pode usar uma Ação Bônus para tocar uma criatura voluntária e perceber através dos sentidos dela até o final do seu próximo turno. Enquanto a criatura estiver no mesmo plano de existência que você, você pode realizar uma Ação Bônus em turnos subsequentes para manter esta conexão, estendendo a duração até o final do seu próximo turno. A conexão se encerra se você não a mantiver dessa forma.\n\nEnquanto percebe através dos sentidos da outra criatura, você se beneficia de quaisquer sentidos especiais possuídos por ela, e pode conjurar magias como se estivesse no seu espaço ou no espaço da outra criatura se vocês dois estiverem a até 18 metros um do outro.", "Prerequisite: Level 5+ Warlock\n\nYou can use a Bonus Action to touch a willing creature and perceive through its senses until the end of your next turn. As long as the creature is on the same plane of existence as you, you can take a Bonus Action on subsequent turns to maintain this connection, extending the duration until the end of your next turn. The connection ends if you don't maintain it in this way.\n\nWhile perceiving through the other creature's senses, you benefit from any special senses possessed by that creature, and you can cast spells as if you were in your space or the other creature's space if the two of you are within 60 feet of each other."),
    prereq: { level: 5 } },
  { id: 'giftOfTheDepths', name: b('Dádiva das Profundezas', 'Gift of the Depths'), source: 'SRD',
    desc: b("Pré-requisito: 5º nível\n\nVocê pode respirar embaixo d'água e ganha um deslocamento de natação igual ao seu deslocamento de caminhada.\n\nVocê também pode conjurar respirar na água uma vez sem gastar um espaço de magia. Você recupera a habilidade de fazê-lo ao terminar um descanso longo.", "Prerequisite: 5th level\n\nYou can breathe underwater, and you gain a swimming speed equal to your walking speed.\n\nYou can also cast water breathing once without expending a spell slot. You regain the ability to do so when you finish a long rest."),
    prereq: { level: 5 }, grants: { spells: ['waterBreathing'] } },
  { id: 'giftOfTheProtectors', name: b('Dádiva dos Protetores', 'Gift of the Protectors'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 9+, Invocação Pacto do Tomo\n\nUma nova página aparece em seu Livro das Sombras quando você o conjura. Com a sua permissão, uma criatura pode realizar uma ação para escrever seu nome nessa página, que pode conter uma quantidade de nomes igual ao seu modificador de Carisma (mínimo de um nome).\n\nQuando qualquer criatura cujo nome esteja na página for reduzida a 0 Pontos de Vida, mas não for morta instantaneamente, a criatura magicamente cai para 1 Ponto de Vida, em vez disso. Uma vez que esta magia seja ativada, nenhuma criatura pode se beneficiar dela até que você termine um Descanso Longo.\n\nComo uma ação Mágica, você pode apagar um nome na página tocando nele.", "Prerequisite: Level 9+ Warlock, Pact of the Tome Invocation\n\nA new page appears in your Book of Shadows when you conjure it. With your permission, a creature can take an action to write its name on that page, which can contain a number of names equal to your Charisma modifier (minimum of one name).\n\nWhen any creature whose name is on the page is reduced to 0 Hit Points but not killed outright, the creature magically drops to 1 Hit Point instead. Once this magic is triggered, no creature can benefit from it until you finish a Long Rest.\n\nAs a Magic action, you can erase a name on the page by touching it."),
    prereq: { level: 9, options: ['pactOfTheTome'] } },
  { id: 'investmentOfTheChainMaster', name: b('Investimento do Mestre da Corrente', 'Investment of the Chain Master'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Pacto da Corrente\n\nQuando você conjura encontrar familiar, você infunde o familiar invocado com uma medida do seu poder místico, concedendo à criatura os seguintes benefícios:\n\n• O familiar ganha um deslocamento de voo ou um deslocamento de natação (à sua escolha) de 12 metros.\n\n• Como uma ação bônus, você pode ordenar que o familiar realize a ação de Ataque.\n\n• Os ataques com arma do familiar são considerados mágicos para o propósito de superar imunidade e resistência a ataques não mágicos.\nnefícios:\n\n• Os ataques com arma do familiar são considerados mágicos para o propósito de superar imunidade e resistência a ataques não mágicos.\n\n• Se o familiar forçar uma criatura a fazer uma salvaguarda, ele usa a CD de salvaguarda da sua magia.\n\n• Quando o familiar sofre dano, você pode usar sua reação para conceder a ele resistência contra aquele dano.", "Prerequisite: Pact of the Chain\n\nWhen you cast find familiar, you infuse the summoned familiar with a measure of your eldritch power, granting the creature the following benefits:\n\n• The familiar gains either a flying speed or a swimming speed (your choice) of 40 feet.\n\n• As a bonus action, you can command the familiar to take the Attack action.\n\n• The familiar’s weapon attacks are considered magical for the purpose of overcoming immunity and resistance to nonmagical attacks.\n\n• If the familiar forces a creature to make a saving throw, it uses your spell save DC.\n\n• When the familiar takes damage, you can use your reaction to grant it resistance against that damage."),
    prereq: { level: 5, options: ['pactOfTheChain'] } },
  { id: 'lessonsOfTheFirstOnes', name: b('Lições dos Primordiais', 'Lessons of the First Ones'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 2+\n\nVocê recebeu conhecimento de uma entidade ancestral do multiverso, permitindo que você ganhe um talento de Origem à sua escolha (consulte \"Talentos\").\n\nRepetível. Você pode obter esta invocação mais de uma vez. Cada vez que o fizer, escolha um talento de Origem diferente.", "Prerequisite: Level 2+ Warlock\n\nYou have received knowledge from an elder entity of the multiverse, allowing you to gain one Origin feat of your choice (see \"Feats\").\n\nRepeatable. You can gain this invocation more than once. Each time you do so, choose a different Origin feat."),
    prereq: { level: 2 }, repeatable: true, detail: b('Qual talento de Origem?', 'Which Origin feat?') },
  { id: 'lifedrinker', name: b('Bebedor de Vida', 'Lifedrinker'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 9+, Invocação Pacto da Lâmina\n\nUma vez por turno, quando você atingir uma criatura com sua arma do pacto, você pode causar 1d6 de dano Necrótico, Psíquico ou Radiante extra (à sua escolha) à criatura, e você pode gastar um dos seus Dados de Pontos de Vida para rolá-lo e recuperar uma quantidade de Pontos de Vida igual à rolagem mais seu modificador de Constituição (mínimo de 1 Ponto de Vida).", "Prerequisite: Level 9+ Warlock, Pact of the Blade Invocation\n\nOnce per turn when you hit a creature with your pact weapon, you can deal an extra 1d6 Necrotic, Psychic, or Radiant damage (your choice) to the creature, and you can expend one of your Hit Point Dice to roll it and regain a number of Hit Points equal to the roll plus your Constitution modifier (minimum of 1 Hit Point)."),
    prereq: { level: 9, options: ['pactOfTheBlade'] } },
  { id: 'maskOfManyFaces', name: b('Máscara de Muitas Faces', 'Mask of Many Faces'), source: 'SRD',
    desc: b("Você pode conjurar disfarçar-se à vontade, sem gastar um espaço de magia.", "You can cast disguise self at will, without expending a spell slot."),
    prereq: { level: 2 }, grants: { spells: ['disguiseSelf'] } },
  { id: 'masterOfMyriadForms', name: b('Mestre das Miríades de Formas', 'Master of Myriad Forms'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 5+\n\nVocê pode conjurar Alterar-se sem gastar um espaço de magia.", "Prerequisite: Level 5+ Warlock\n\nYou can cast Alter Self without expending a spell slot."),
    prereq: { level: 5 }, grants: { spells: ['alterSelf'] } },
  { id: 'mistyVisions', name: b('Visões Nebulosas', 'Misty Visions'), source: 'SRD',
    desc: b("Você pode conjurar imagem silenciosa à vontade, sem gastar um espaço de magia ou componentes materiais.", "You can cast silent image at will, without expending a spell slot or material components."),
    prereq: { level: 2 }, grants: { spells: ['silentImage'] } },
  { id: 'oneWithShadows', name: b('Um com as Sombras', 'One with Shadows'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 5+\n\nEnquanto você estiver em uma área de Meia-Luz ou Escuridão, você pode conjurar Invisibilidade em si mesmo sem gastar um espaço de magia.", "Prerequisite: Level 5+ Warlock\n\nWhile you're in an area of Dim Light or Darkness, you can cast Invisibility on yourself without expending a spell slot."),
    prereq: { level: 5 }, grants: { spells: ['invisibility'] } },
  { id: 'otherworldlyLeap', name: b('Salto Transcendental', 'Otherworldly Leap'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 2+\n\nVocê pode conjurar Salto em si mesmo sem gastar um espaço de magia.", "Prerequisite: Level 2+ Warlock\n\nYou can cast Jump on yourself without expending a spell slot."),
    prereq: { level: 2 }, grants: { spells: ['jump'] } },
  { id: 'pactOfTheBlade', name: b('Pacto da Lâmina', 'Pact of the Blade'), source: 'SRD', rules: '2024',
    desc: b('Ação bônus: conjure uma arma corpo a corpo simples ou marcial, ou vincule uma arma mágica que tocar. Proficiente com ela, usa CAR no ataque e dano, pode trocar o dano para necrótico, psíquico ou radiante; serve de foco.', 'Bonus Action: conjure a Simple or Martial melee weapon, or bond a magic weapon you touch. You are proficient, use CHA for attack and damage, may switch its damage to necrotic, psychic, or radiant; it is a focus.') },
  { id: 'pactOfTheChain', name: b('Pacto da Corrente', 'Pact of the Chain'), source: 'SRD', rules: '2024',
    desc: b('Aprende Encontrar Familiar e a conjura como ação Mágica sem espaço, com formas especiais (diabrete, pseudodragão, quasit, esqueleto, girino de slaad, esfinge das maravilhas, sprite, cobra venenosa). Pode trocar um ataque seu por um ataque do familiar (reação dele).', 'Learn Find Familiar and cast it as a Magic action without a slot, with special forms (imp, pseudodragon, quasit, skeleton, slaad tadpole, sphinx of wonder, sprite, venomous snake). Forgo one attack to let the familiar attack with its Reaction.'),
    grants: { spells: ['findFamiliar'] } },
  { id: 'pactOfTheTome', name: b('Pacto do Tomo', 'Pact of the Tome'), source: 'SRD', rules: '2024',
    desc: b('Livro das Sombras (recriado ao fim de um descanso curto ou longo): 3 truques e 2 magias de 1º círculo com o marcador Ritual, de qualquer lista, sempre preparados enquanto estiver com ele (contam como magias de bruxo); serve de foco. As escolhas podem mudar a cada descanso.', 'Book of Shadows (recreated at the end of a Short or Long Rest): 3 cantrips and 2 level 1 Ritual spells from any class list, prepared while you carry it (they count as Warlock spells); it is a focus. The choices can change each rest.'),
    choices: { tomeCantrip: 3, tomeRitual: 2 } },
  { id: 'repellingBlast', name: b('Rajada Repulsora', 'Repelling Blast'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 2+, um Truque de Bruxo Que Cause Dano por meio de uma Jogada de Ataque\n\nEscolha um de seus truques de Bruxo conhecidos que exija uma jogada de ataque. Quando você atingir uma criatura Grande ou menor com esse truque, você pode empurrar a criatura em até 3 metros em linha reta para longe de você.\n\nRepetível. Você pode obter esta invocação mais de uma vez. Cada vez que o fizer, escolha um truque elegível diferente.", "Prerequisite: Level 2+ Warlock, a Warlock Cantrip That Deals Damage via an Attack Roll\n\nChoose one of your known Warlock cantrips that requires an attack roll. When you hit a Large or smaller creature with that cantrip, you can push the creature up to 10 feet straight away from you.\n\nRepeatable. You can gain this invocation more than once. Each time you do so, choose a different eligible cantrip."),
    prereq: { level: 2, text: b('um truque de bruxo com jogada de ataque que causa dano', 'a damaging Warlock cantrip with an attack roll') }, repeatable: true, detail: WHICH_CANTRIP },
  { id: 'thirstingBlade', name: b('Lâmina Sedenta', 'Thirsting Blade'), source: 'SRD',
    desc: b("Pré-requisito: 5º nível, característica Pacto da Lâmina\n\nVocê pode atacar com sua arma do pacto duas vezes, em vez de uma, sempre que realizar a ação de Ataque no seu turno.", "Prerequisite: 5th level, Pact of the Blade feature\n\nYou can attack with your pact weapon twice, instead of once, whenever you take the Attack action on your turn."),
    prereq: { level: 5, options: ['pactOfTheBlade'] } },
  { id: 'visionsOfDistantRealms', name: b('Visões de Reinos Distantes', 'Visions of Distant Realms'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 9+\n\nVocê pode conjurar Olho Arcano sem gastar um espaço de magia.", "Prerequisite: Level 9+ Warlock\n\nYou can cast Arcane Eye without expending a spell slot."),
    prereq: { level: 9 }, grants: { spells: ['arcaneEye'] } },
  { id: 'whispersOfTheGrave', name: b('Sussurros do Túmulo', 'Whispers of the Grave'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 7+\n\nVocê pode conjurar Falar com os Mortos sem gastar um espaço de magia.", "Prerequisite: Level 7+ Warlock\n\nYou can cast Speak with Dead without expending a spell slot."),
    prereq: { level: 7 }, grants: { spells: ['speakWithDead'] } },
  { id: 'witchSight', name: b('Visão da Bruxa', 'Witch Sight'), source: 'SRD', rules: '2024',
    desc: b("Pré-requisito: Bruxo de Nível 15+\n\nVocê tem Visão Verdadeira com um alcance de 9 metros.", "Prerequisite: Level 15+ Warlock\n\nYou have Truesight with a range of 30 feet."),
    prereq: { level: 15 } },
];

// === Invocações 2014 (PHB/XGE/TCE) — só fichas de regras 2014 ===
// Versões 2014 das que foram reeditadas em 2024 usam o sufixo `2014` no id.
// Em 2014 nenhuma é repetível. Ids de magia do catálogo 2014 quando diferem (slowSpell, sendingSpell).
const L = (o) => ({ rules: '2014', ...o });
const invocations2014 = [
  // PHB 2014 — versões antigas das reeditadas
  L({ id: 'agonizingBlast2014', name: b('Rajada Agonizante', 'Agonizing Blast'), source: 'PHB',
    desc: b("Pré-requisito: Truque rajada mística\n\nQuando você conjura rajada mística, adicione seu modificador de Carisma ao dano que ela causa ao acertar.", "Prerequisite: Eldritch Blast cantrip\n\nWhen you cast eldritch blast, add your Charisma modifier to the damage it deals on a hit."),
    prereq: { text: ELDRITCH_BLAST } }),
  L({ id: 'ascendantStep2014', name: b('Passo Ascendente', 'Ascendant Step'), source: 'PHB',
    desc: b("Pré-requisito: 9º nível\n\nVocê pode conjurar levitação em si mesmo à vontade, sem gastar um espaço de magia ou componentes materiais.", "Prerequisite: 9th level\n\nYou can cast levitate on yourself at will, without expending a spell slot or material components."),
    prereq: { level: 9 }, grants: { spells: ['levitate'] } }),
  L({ id: 'eldritchSpear2014', name: b('Lança Mística', 'Eldritch Spear'), source: 'PHB',
    desc: b("Pré-requisito: Truque rajada mística\n\nQuando você conjura rajada mística, seu alcance é de 90 metros.", "Prerequisite: Eldritch Blast cantrip\n\nWhen you cast eldritch blast, its range is 300 feet."),
    prereq: { text: ELDRITCH_BLAST } }),
  L({ id: 'fiendishVigor2014', name: b('Vigor Demoníaco', 'Fiendish Vigor'), source: 'PHB',
    desc: b("Você pode conjurar vitalidade ilusória em si mesmo à vontade como uma magia de 1º círculo, sem gastar um espaço de magia ou componentes materiais.", "You can cast false life on yourself at will as a 1st-level spell, without expending a spell slot or material components."),
    grants: { spells: ['falseLife'] } }),
  L({ id: 'gazeOfTwoMinds2014', name: b('Olhar de Duas Mentes', 'Gaze of Two Minds'), source: 'PHB',
    desc: b("Você pode usar sua ação para tocar um humanoide voluntário e perceber através dos sentidos dele até o final do seu próximo turno. Enquanto a criatura estiver no mesmo plano de existência que você, você pode usar sua ação em turnos subsequentes para manter esta conexão, estendendo a duração até o final do seu próximo turno. Enquanto percebe através dos sentidos da outra criatura, você se beneficia de quaisquer sentidos especiais possuídos por ela, e fica cego e surdo para os seus próprios arredores.", "You can use your action to touch a willing humanoid and perceive through its senses until the end of your next turn. As long as the creature is on the same plane of existence as you, you can use your action on subsequent turns to maintain this connection, extending the duration until the end of your next turn. While perceiving through the other creature's senses, you benefit from any special senses possessed by that creature, and you are blinded and deafened to your own surroundings.") }),
  L({ id: 'lifedrinker2014', name: b('Bebedor de Vida', 'Lifedrinker'), source: 'PHB',
    desc: b("Pré-requisito: 12º nível, característica Pacto da Lâmina\n\nQuando você atinge uma criatura com sua arma do pacto, a criatura sofre dano necrótico extra igual ao seu modificador de Carisma (mínimo de 1).", "Prerequisite: 12th level, Pact of the Blade feature\n\nWhen you hit a creature with your pact weapon, the creature takes extra necrotic damage equal to your Charisma modifier (minimum 1)."),
    prereq: { level: 12, options: ['pactOfTheBlade'] } }),
  L({ id: 'masterOfMyriadForms2014', name: b('Mestre das Miríades de Formas', 'Master of Myriad Forms'), source: 'PHB',
    desc: b("Pré-requisito: 15º nível\n\nVocê pode conjurar alterar-se à vontade, sem gastar um espaço de magia.", "Prerequisite: 15th level\n\nYou can cast alter self at will, without expending a spell slot."),
    prereq: { level: 15 }, grants: { spells: ['alterSelf'] } }),
  L({ id: 'oneWithShadows2014', name: b('Um com as Sombras', 'One with Shadows'), source: 'PHB',
    desc: b("Pré-requisito: 5º nível\n\nQuando você estiver em uma área de meia-luz ou escuridão, você pode usar sua ação para ficar invisível até se mover ou realizar uma ação ou uma reação.", "Prerequisite: 5th level\n\nWhen you are in an area of dim light or darkness, you can use your action to become invisible until you move or take an action or a reaction."),
    prereq: { level: 5 } }),
  L({ id: 'otherworldlyLeap2014', name: b('Salto Transcendental', 'Otherworldly Leap'), source: 'PHB',
    desc: b("Pré-requisito: 9º nível\n\nVocê pode conjurar salto em si mesmo à vontade, sem gastar um espaço de magia ou componentes materiais.", "Prerequisite: 9th level\n\nYou can cast jump on yourself at will, without expending a spell slot or material components."),
    prereq: { level: 9 }, grants: { spells: ['jump'] } }),
  L({ id: 'repellingBlast2014', name: b('Rajada Repulsora', 'Repelling Blast'), source: 'PHB',
    desc: b("Pré-requisito: Truque rajada mística\n\nQuando você atinge uma criatura com rajada mística, você pode empurrar a criatura em até 3 metros para longe de você em linha reta.", "Prerequisite: Eldritch Blast cantrip\n\nWhen you hit a creature with eldritch blast, you can push the creature up to 10 feet away from you in a straight line."),
    prereq: { text: ELDRITCH_BLAST } }),
  L({ id: 'visionsOfDistantRealms2014', name: b('Visões de Reinos Distantes', 'Visions of Distant Realms'), source: 'PHB',
    desc: b("Pré-requisito: 15º nível\n\nVocê pode conjurar olho arcano à vontade, sem gastar um espaço de magia.", "Prerequisite: 15th level\n\nYou can cast arcane eye at will, without expending a spell slot."),
    prereq: { level: 15 }, grants: { spells: ['arcaneEye'] } }),
  L({ id: 'whispersOfTheGrave2014', name: b('Sussurros do Túmulo', 'Whispers of the Grave'), source: 'PHB',
    desc: b("Pré-requisito: 9º nível\n\nmente com o seu familiar e perceber através dos sentidos do seu familiar enquanto você estiver no mesmo plano de existência. Além disso, enquanto percebe através dos sentidos do seu familiar, você também pode falar através do seu familiar com a sua própria voz, mesmo que o seu familiar seja normalmente incapaz de falar.", "Prerequisite: 9th level\n\nly with your familiar and perceive through your familiar's senses as long as you are on the same plane of existence. Additionally, while perceiving through your familiar's senses, you can also speak through your familiar in your own voice, even if your familiar is normally incapable of speech."),
    prereq: { level: 9 }, grants: { spells: ['speakWithDead'] } }),
  L({ id: 'witchSight2014', name: b('Visão da Bruxa', 'Witch Sight'), source: 'PHB',
    desc: b("Pré-requisito: 15º nível\n\nVocê pode ver a forma verdadeira de qualquer metamorfo ou criatura ocultada por magia de ilusão ou transmutação enquanto a criatura estiver a até 9 metros de você e dentro da linha de visão.", "Prerequisite: 15th level\n\nYou can see the true form of any shapechanger or creature concealed by illusion or transmutation magic while the creature is within 30 feet of you and within line of sight."),
    prereq: { level: 15 } }),
  // PHB 2014 — só legado
  L({ id: 'beastSpeech', name: b('Fala Bestial', 'Beast Speech'), source: 'PHB',
    desc: b("Você pode conjurar falar com animais à vontade, sem gastar um espaço de magia.", "You can cast speak with animals at will, without expending a spell slot."),
    grants: { spells: ['speakWithAnimals'] } }),
  L({ id: 'beguilingInfluence', name: b('Influência Enganadora', 'Beguiling Influence'), source: 'PHB',
    desc: b('Proficiência em Enganação e Persuasão.', 'Proficiency in Deception and Persuasion.'),
    grants: { skills: ['deception', 'persuasion'] } }),
  L({ id: 'bewitchingWhispers', name: b('Sussurros Sedutores', 'Bewitching Whispers'), source: 'PHB',
    desc: b("Pré-requisito: 7º nível\n\nVocê pode conjurar compulsão uma vez usando um espaço de magia de bruxo. Você não pode fazer isso novamente até terminar um descanso longo.", "Prerequisite: 7th level\n\nYou can cast compulsion once using a warlock spell slot. You can't do so again until you finish a long rest."),
    prereq: { level: 7 }, grants: { spells: ['compulsion'] } }),
  L({ id: 'bookOfAncientSecrets', name: b('Livro de Segredos Antigos', 'Book of Ancient Secrets'), source: 'PHB',
    desc: b('Anote 2 magias de 1º círculo com o marcador ritual, de qualquer lista, no Livro das Sombras; conjura-as só como ritual. Pode copiar outros rituais que encontrar (nível até metade do seu nível de bruxo, arredondado para cima).', 'Inscribe two 1st-level ritual spells from any class list in your Book of Shadows; cast them only as rituals. You can copy other rituals you find (spell level up to half your warlock level, rounded up).'),
    prereq: { options: ['pactOfTheTome'] }, choices: { tomeRitual: 2 } }),
  L({ id: 'chainsOfCarceri', name: b('Correntes de Carceri', 'Chains of Carceri'), source: 'PHB',
    desc: b("Pré-requisito: 15º nível, característica Pacto da Corrente\n\nVocê pode conjurar imobilizar monstro à vontade — tendo como alvo um celestial, corruptor ou elemental — sem gastar um espaço de magia ou componentes materiais. Você deve terminar um descanso longo antes de poder usar esta invocação na mesma criatura novamente.", "Prerequisite: 15th level, Pact of the Chain feature\n\nYou can cast hold monster at will-targeting a celestial, fiend, or elemental-without expending a spell slot or material components. You must finish a long rest before you can use this invocation on the same creature again."),
    prereq: { level: 15, options: ['pactOfTheChain'] }, grants: { spells: ['holdMonster'] } }),
  L({ id: 'dreadfulWord', name: b('Palavra Terrível', 'Dreadful Word'), source: 'PHB',
    desc: b("Pré-requisito: 7º nível\n\nVocê pode conjurar confusão uma vez usando um espaço de magia de bruxo. Você não pode fazer isso novamente até terminar um descanso longo.", "Prerequisite: 7th level\n\nYou can cast confusion once using a warlock spell slot. You can't do so again until you finish a long rest."),
    prereq: { level: 7 }, grants: { spells: ['confusion'] } }),
  L({ id: 'eldritchSight', name: b('Visão Mística', 'Eldritch Sight'), source: 'PHB',
    desc: b("Você pode conjurar detectar magia à vontade, sem gastar um espaço de magia.", "You can cast detect magic at will, without expending a spell slot."),
    grants: { spells: ['detectMagic'] } }),
  L({ id: 'eyesOfTheRuneKeeper', name: b('Olhos do Guardião das Runas', 'Eyes of the Rune Keeper'), source: 'PHB',
    desc: b('Você consegue ler qualquer escrita.', 'You can read all writing.') }),
  L({ id: 'minionsOfChaos', name: b('Lacaios do Caos', 'Minions of Chaos'), source: 'PHB',
    desc: b("Pré-requisito: 9º nível\n\nVocê pode conjurar conjurar elemental uma vez usando um espaço de magia de bruxo. Você não pode fazer isso novamente até terminar um descanso longo.", "Prerequisite: 9th level\n\nYou can cast conjure elemental once using a warlock spell slot. You can't do so again until you finish a long rest."),
    prereq: { level: 9 }, grants: { spells: ['conjureElemental'] } }),
  L({ id: 'mireTheMind', name: b('Lodo Mental', 'Mire the Mind'), source: 'PHB',
    desc: b("Pré-requisito: 5º nível\n\nVocê pode conjurar lentidão uma vez usando um espaço de magia de bruxo. Você não pode fazer isso novamente até terminar um descanso longo.", "Prerequisite: 5th level\n\nYou can cast slow once using a warlock spell slot. You can't do so again until you finish a long rest."),
    prereq: { level: 5 }, grants: { spells: ['slowSpell'] } }),
  L({ id: 'sculptorOfFlesh', name: b('Escultor de Carne', 'Sculptor of Flesh'), source: 'PHB',
    desc: b("Pré-requisito: 7º nível\n\nVocê pode conjurar metamorfose uma vez usando um espaço de magia de bruxo. Você não pode fazer isso novamente até terminar um descanso longo.", "Prerequisite: 7th level\n\nYou can cast polymorph once using a warlock spell slot. You can't do so again until you finish a long rest."),
    prereq: { level: 7 }, grants: { spells: ['polymorph'] } }),
  L({ id: 'signOfIllOmen', name: b('Sinal de Mau Agouro', 'Sign of Ill Omen'), source: 'PHB',
    desc: b("Pré-requisito: 5º nível\n\nVocê pode conjurar rogar maldição uma vez usando um espaço de magia de bruxo. Você não pode fazer isso novamente até terminar um descanso longo.", "Prerequisite: 5th level\n\nYou can cast bestow curse once using a warlock spell slot. You can't do so again until you finish a long rest."),
    prereq: { level: 5 }, grants: { spells: ['bestowCurse'] } }),
  L({ id: 'thiefOfFiveFates', name: b('Ladrão dos Cinco Destinos', 'Thief of Five Fates'), source: 'PHB',
    desc: b("Você pode conjurar perdição uma vez usando um espaço de magia de bruxo. Você não pode fazer isso novamente até terminar um descanso longo.", "You can cast bane once using a warlock spell slot. You can't do so again until you finish a long rest."),
    grants: { spells: ['bane'] } }),
  L({ id: 'voiceOfTheChainMaster', name: b('Voz do Mestre da Corrente', 'Voice of the Chain Master'), source: 'PHB',
    desc: b("Pré-requisito: característica Pacto da Corrente\n\nVocê pode se comunicar telepaticamente com seu familiar e perceber através dos sentidos dele desde que estejam no mesmo plano de existência. Além disso, enquanto estiver percebendo através dos sentidos do seu familiar, você também pode falar através dele com a sua própria voz, mesmo que seu familiar seja normalmente incapaz de falar.", "Prerequisite: Pact of the Chain feature\n\nYou can communicate telepathically with your familiar and perceive through your familiar's senses as long as you are on the same plane of existence. Additionally, while perceiving through your familiar's senses, you can also speak through your familiar in your own voice, even if your familiar is normally incapable of speech."),
    prereq: { options: ['pactOfTheChain'] } }),
  // XGE
  L({ id: 'aspectOfTheMoon', name: b('Aspecto da Lua', 'Aspect of the Moon'), source: 'XGE',
    desc: b("Pré-requisito: característica Pacto do Tomo\n\nVocê não precisa mais dormir e não pode ser forçado a dormir por meio algum. Para obter os benefícios de um descanso longo, você pode passar todas as 8 horas realizando atividades leves, como ler seu Livro das Sombras e montar guarda.", "Prerequisite: Pact of the Tome feature\n\nYou no longer need to sleep and can’t be forced to sleep by any means. To gain the benefits of a long rest, you can spend all 8 hours doing light activity, such as reading your Book of Shadows and keeping watch."),
    prereq: { options: ['pactOfTheTome'] } }),
  L({ id: 'cloakOfFlies', name: b('Manto de Moscas', 'Cloak of Flies'), source: 'XGE',
    desc: b('Ação bônus: aura de moscas de 1,5 m até ficar incapacitado ou dispensá-la. Vantagem em Intimidação e desvantagem nos demais testes de CAR; quem começa o turno na aura sofre dano venenoso igual ao mod. de CAR (mín. 0). 1×/descanso curto.', 'Bonus action: a 5-foot aura of flies until you are incapacitated or dismiss it. Advantage on Intimidation, disadvantage on other CHA checks; creatures starting their turn in it take poison damage equal to your CHA modifier (minimum 0). Once per short rest.'),
    prereq: { level: 5 } }),
  L({ id: 'ghostlyGaze', name: b('Olhar Fantasmagórico', 'Ghostly Gaze'), source: 'XGE',
    desc: b("Pré-requisito: 7º nível\n\nCom uma ação, você ganha a capacidade de ver através de objetos sólidos até um alcance de 9 metros. Dentro desse alcance, você tem visão no escuro se ainda não a possuir. Esta visão especial dura por 1 minuto ou até sua concentração terminar (como se estivesse se concentrando em uma magia). Durante esse tempo, você percebe objetos como imagens fantasmagóricas e transparentes. Depois de usar esta invocação, você não pode usá-la novamente até terminar um descanso curto ou longo.", "Prerequisite: 7th level\n\nAs an action, you gain the ability to see through solid objects to a range of 30 feet. Within that range, you have darkvision if you don’t already have it. This special sight lasts for 1 minute or until your concentration ends (as if you were concentrating on a spell). During that time, you perceive objects as ghostly, transparent images. Once you use this invocation, you can’t use it again until you finish a short or long rest."),
    prereq: { level: 7 } }),
  L({ id: 'giftOfTheEverLivingOnes', name: b('Dádiva dos Eternos', 'Gift of the Ever-Living Ones'), source: 'XGE',
    desc: b("Pré-requisito: característica Pacto da Corrente\n\nSempre que recuperar pontos de vida enquanto seu familiar estiver a até 30 metros de você, trate quaisquer dados rolados para determinar os pontos de vida recuperados como tendo obtido o valor máximo para você.", "Prerequisite: Pact of the Chain feature\n\nWhenever you regain hit points while your familiar is within 100 feet of you, treat any dice rolled to determine the hit points you regain as having rolled their maximum value for you."),
    prereq: { options: ['pactOfTheChain'] } }),
  L({ id: 'graspOfHadar', name: b('Agarrão de Hadar', 'Grasp of Hadar'), source: 'XGE',
    desc: b("Pré-requisito: truque rajada mística\n\nUma vez em cada um de seus turnos, ao atingir uma criatura com sua rajada mística, você pode mover essa criatura em linha reta 3 metros para mais perto de você.", "Prerequisite: eldritch blast cantrip\n\nOnce on each of your turns when you hit a creature with your eldritch blast, you can move that creature in a straight line 10 feet closer to you."),
    prereq: { text: ELDRITCH_BLAST } }),
  L({ id: 'improvedPactWeapon', name: b('Arma do Pacto Aprimorada', 'Improved Pact Weapon'), source: 'XGE',
    desc: b("Pré-requisito: característica Pacto da Lâmina\n\nVocê pode usar qualquer arma invocada com sua característica Pacto da Lâmina como um foco de conjuração para suas magias de bruxo.\n\nAlém disso, a arma ganha um bônus de +1 em suas jogadas de ataque e dano, a menos que seja uma arma mágica que já possua um bônus nessas jogadas.\n\nPor fim, a arma que você conjurar pode ser um arco curto, arco longo, besta leve ou besta pesada.", "Prerequisite: Pact of the Blade feature\n\nYou can use any weapon you summon with your Pact of the Blade feature as a spellcasting focus for your warlock spells.\n\nIn addition, the weapon gains a +1 bonus to its attack and damage rolls, unless it is a magic weapon that already has a bonus to those rolls.\n\nFinally, the weapon you conjure can be a shortbow, longbow, light crossbow, or heavy crossbow."),
    prereq: { options: ['pactOfTheBlade'] } }),
  L({ id: 'lanceOfLethargy', name: b('Lança da Letargia', 'Lance of Lethargy'), source: 'XGE',
    desc: b("Pré-requisito: truque rajada mística\nInvocação Mística\n\ntruque rajada mística\nID_PHB_SPELL_ELDRITCH_BLAST\n\nPré-requisito: truque rajada mística\n\nUma vez em cada um de seus turnos, ao atingir uma criatura com sua rajada mística, você pode reduzir o deslocamento dessa criatura em 3 metros até o final do seu próximo turno.", "Prerequisite: eldritch blast cantrip\n\nOnce on each of your turns when you hit a creature with your eldritch blast, you can reduce that creature’s speed by 10 feet until the end of your next turn."),
    prereq: { text: ELDRITCH_BLAST } }),
  L({ id: 'maddeningHex', name: b('Maldição Enlouquecedora', 'Maddening Hex'), source: 'XGE',
    desc: b("Pré-requisito: 5º nível, magia bruxaria ou uma característica de bruxo que amaldiçoe\n\nCom uma ação bônus, você causa uma perturbação psíquica ao redor do alvo amaldiçoado pela sua magia bruxaria ou por uma característica de bruxo sua, como a Maldição do Lâmina Maldita ou Sinal de Mau Agouro. Ao fazer isso, você causa dano psíquico ao alvo amaldiçoado e a cada criatura à sua escolha que você possa ver a até 1,5 metro dele. O dano psíquico é igual ao seu modificador de Carisma (mínimo de 1 de dano). Para usar esta invocação, você deve ser capaz de ver o alvo amaldiçoado, e ele deve estar a até 9 metros de você.", "Prerequisite: 5th level, hex spell or a warlock feature that curses\n\nAs a bonus action, you cause a psychic disturbance around the target cursed by your hex spell or by a warlock feature of yours, such as Hexblade’s Curse or Sign of Ill Omen. When you do so, you deal psychic damage to the cursed target and each creature of your choice that you can see within 5 feet of it. The psychic damage equals your Charisma modifier (minimum of 1 damage). To use this invocation, you must be able to see the cursed target, and it must be within 30 feet of you."),
    prereq: { level: 5, text: HEX_OR_CURSE } }),
  L({ id: 'relentlessHex', name: b('Maldição Implacável', 'Relentless Hex'), source: 'XGE',
    desc: b("Pré-requisito: 7º nível, magia bruxaria ou uma característica de bruxo que amaldiçoe\n\nSua maldição cria um elo temporário entre você e seu alvo. Com uma ação bônus, você pode se teletransportar magicamente até 9 metros para um espaço desocupado que você possa ver a até 1,5 metro do alvo amaldiçoado por sua magia bruxaria ou por uma característica de bruxo sua, como a Maldição do Lâmina Maldita ou Sinal de Mau Agouro. Para se teletransportar dessa forma, você deve ser capaz de ver o alvo amaldiçoado.", "Prerequisite: 7th level, hex spell or a warlock feature that curses\n\nYour curse creates a temporary bond between you and your target. As a bonus action, you can magically teler port up to 30 feet to an unoccupied space you can see within 5 feet of the target cursed by your hex spell or by a warlock feature of yours, such as Hexblade’s Curse or Sign of Ill Omen. To teleport in this way, you must be able to see the cursed target."),
    prereq: { level: 7, text: HEX_OR_CURSE } }),
  L({ id: 'shroudOfShadow', name: b('Mortalha de Sombras', 'Shroud of Shadow'), source: 'XGE',
    desc: b("Pré-requisito: 15º nível\n\nVocê pode conjurar invisibilidade à vontade, sem gastar um espaço de magia.", "Prerequisite: 15th level\n\nYou can cast invisibility at will, without expending a spell slot."),
    prereq: { level: 15 }, grants: { spells: ['invisibility'] } }),
  L({ id: 'tombOfLevistus', name: b('Tumba de Levistus', 'Tomb of Levistus'), source: 'XGE',
    desc: b('Reação ao sofrer dano: fica envolto em gelo, ganha 10 PV temporários por nível de bruxo contra esse dano; até o fim do seu próximo turno fica vulnerável a fogo, deslocamento 0 e incapacitado. 1×/descanso curto.', 'Reaction when you take damage: encase yourself in ice, gaining 10 temporary HP per warlock level against it; until the end of your next turn you have vulnerability to fire, speed 0, and are incapacitated. Once per short rest.'),
    prereq: { level: 5 } }),
  L({ id: 'tricksterEscape', name: b('Fuga do Trapaceiro', "Trickster's Escape"), source: 'XGE',
    desc: b("Pré-requisito: 7º nível\n\nVocê pode conjurar movimentação livre uma vez em si mesmo sem gastar um espaço de magia. Você recupera a capacidade de fazer isso ao terminar um descanso longo.", "Prerequisite: 7th level\n\nYou can cast freedom of movement once on yourself without expending a spell slot. You regain the ability to do so when you finish a long rest."),
    prereq: { level: 7 }, grants: { spells: ['freedomOfMovement'] } }),
  // TCE
  L({ id: 'giftOfTheProtectors2014', name: b('Dádiva dos Protetores', 'Gift of the Protectors'), source: 'TCE',
    desc: b("Pré-requisito: 9º nível, Pacto do Tomo\n\nUma nova página surge no seu Livro das Sombras. Com sua permissão, uma criatura pode usar uma ação para escrever o nome dela nessa página, a qual pode conter um número de nomes igual ao seu bônus de proficiência.\n\nQuando qualquer criatura cujo nome esteja na página for reduzida a 0 pontos de vida, mas não for morta instantaneamente, a criatura magicamente é reduzida para 1 ponto de vida em vez disso. Uma vez que essa magia seja acionada, nenhuma criatura pode se beneficiar dela até que você termine um descanso longo.\n\nCom uma ação, você pode apagar magicamente um nome na página tocando nele.", "Prerequisite: 9th level, Pact of the Tome\n\nA new page appears in your Book of Shadows. With your permission, a creature can use its action to write its name on that page, which can contain a number of names equal to your proficiency bonus.\n\nWhen any creature whose name is on the page is reduced to 0 hit points but not killed outright, the creature magically drops to 1 hit point instead. Once this magic is triggered, no creature can benefit from it until you finish a long rest.\n\nAs an action, you can magically erase a name on the page by touching it."),
    prereq: { level: 9, options: ['pactOfTheTome'] } }),
  L({ id: 'investmentOfTheChainMaster2014', name: b('Investimento do Mestre da Corrente', 'Investment of the Chain Master'), source: 'TCE',
    desc: b("Pré-requisito: Pacto da Corrente\n\nQuando você conjura encontrar familiar, você infunde o familiar invocado com uma medida do seu poder místico, concedendo à criatura os seguintes benefícios:\n\n• O familiar ganha um deslocamento de voo ou um deslocamento de natação (à sua escolha) de 12 metros.\n\n• Como uma ação bônus, você pode ordenar que o familiar realize a ação de Ataque.\n\n• Os ataques com arma do familiar são considerados mágicos para o propósito de superar imunidade e resistência a ataques não mágicos.\nnefícios:\n\n• Os ataques com arma do familiar são considerados mágicos para o propósito de superar imunidade e resistência a ataques não mágicos.\n\n• Se o familiar forçar uma criatura a fazer uma salvaguarda, ele usa a CD de salvaguarda da sua magia.\n\n• Quando o familiar sofre dano, você pode usar sua reação para conceder a ele resistência contra aquele dano.", "Prerequisite: Pact of the Chain\n\nWhen you cast find familiar, you infuse the summoned familiar with a measure of your eldritch power, granting the creature the following benefits:\n\n• The familiar gains either a flying speed or a swimming speed (your choice) of 40 feet.\n\n• As a bonus action, you can command the familiar to take the Attack action.\n\n• The familiar’s weapon attacks are considered magical for the purpose of overcoming immunity and resistance to nonmagical attacks.\n\n• If the familiar forces a creature to make a saving throw, it uses your spell save DC.\n\n• When the familiar takes damage, you can use your reaction to grant it resistance against that damage."),
    prereq: { options: ['pactOfTheChain'] } }),
  L({ id: 'bondOfTheTalisman', name: b('Vínculo do Talismã', 'Bond of the Talisman'), source: 'TCE',
    desc: b("Pré-requisito: 12º nível, Pacto do Talismã\n\nEnquanto outra pessoa estiver usando o seu talismã, você pode usar sua ação para se teletransportar para o espaço desocupado mais próximo a ela, desde que ambos estejam no mesmo plano de existência. O usuário do seu talismã pode fazer o mesmo, usando a ação dele para se teletransportar até você. Esse teletransporte pode ser usado um número de vezes igual ao seu bônus de proficiência, e todos os usos gastos são recuperados quando você termina um descanso longo.", "Prerequisite: 12th level, Pact of the Talisman\n\nWhile someone else is wearing your talisman, you can use your action to teleport to the unoccupied space closest to them, provided the two of you are on the same plane of existence. The wearer of your talisman can do the same thing, using their action to teleport to you. The teleportation can be used a number of times equal to your proficiency bonus, and all expended uses are restored when you finish a long rest."),
    prereq: { level: 12, options: ['pactOfTheTalisman'] } }),
  L({ id: 'farScribe', name: b('Escriba Distante', 'Far Scribe'), source: 'TCE',
    desc: b("Pré-requisito: 5º nível, Pacto do Tomo\n\nUma nova página surge no seu Livro das Sombras. Com sua permissão, uma criatura pode usar uma ação para escrever o nome dela nessa página, a qual pode conter um número de nomes igual ao seu bônus de proficiência.\n\nVocê pode conjurar a magia mensagem, tendo como alvo uma criatura cujo nome esteja na página, sem usar um espaço de magia e sem usar componentes materiais. Para fazê-lo, você deve escrever a mensagem na página. O alvo ouve a mensagem em sua mente e, se o alvo responder, a resposta dele surge na página, em vez de na sua mente. A escrita desaparece após 1 minuto.\n\nCom uma ação, você pode apagar magicamente um nome na página tocando nele.", "Prerequisite: 5th level, Pact of the Tome\n\nA new page appears in your Book of Shadows. With your permission, a creature can use its action to write its name on that page, which can contain a number of names equal to your proficiency bonus.\n\nYou can cast the sending spell, targeting a creature whose name is on the page, without using a spell slot and without using material components. To do so, you must write the message on the page. The target hears the message in their mind, and if the target replies, their message appears on the page, rather than in your mind. The writing disappears after 1 minute.\n\nAs an action, you can magically erase a name on the page by touching it."),
    prereq: { level: 5, options: ['pactOfTheTome'] }, grants: { spells: ['sendingSpell'] } }),
  L({ id: 'protectionOfTheTalisman', name: b('Proteção do Talismã', 'Protection of the Talisman'), source: 'TCE',
    desc: b("Pré-requisito: 7º nível, Pacto do Talismã\n\nQuando o usuário do seu talismã falhar em uma salvaguarda, ele pode adicionar um d4 à rolagem, potencialmente transformando a salvaguarda em um sucesso. Esse benefício pode ser usado um número de vezes igual ao seu bônus de proficiência, e todos os usos gastos são recuperados quando você termina um descanso longo.", "Prerequisite: 7th level, Pact of the Talisman\n\nWhen the wearer of your talisman fails a saving throw, they can add a d4 to the roll, potentially turning the save into a success. This benefit can be used a number of times equal to your proficiency bonus, and all expended uses are restored when you finish a long rest."),
    prereq: { level: 7, options: ['pactOfTheTalisman'] } }),
  L({ id: 'rebukeOfTheTalisman', name: b('Repreensão do Talismã', 'Rebuke of the Talisman'), source: 'TCE',
    desc: b("Pré-requisito: Pacto do Talismã\n\nQuando o usuário do seu talismã for atingido por um atacante que você possa ver a até 9 metros de você, você pode usar sua reação para causar dano psíquico ao atacante igual ao seu bônus de proficiência e empurrá-lo até 3 metros para longe do usuário do talismã.", "Prerequisite: Pact of the Talisman\n\nWhen the wearer of your talisman is hit by an attacker you can see within 30 feet of you, you can use your reaction to deal psychic damage to the attacker equal to your proficiency bonus and push it up to 10 feet away from the talisman’s wearer."),
    prereq: { options: ['pactOfTheTalisman'] } }),
  L({ id: 'undyingServitude', name: b('Servidão Imortal', 'Undying Servitude'), source: 'TCE',
    desc: b("Pré-requisito: 5º nível\n\nVocê pode conjurar animar mortos sem gastar um espaço de magia. Depois de fazer isso, você não pode conjurá-la dessa maneira novamente até terminar um descanso longo.", "Prerequisite: 5th level\n\nYou can cast animate dead without using a spell slot. Once you do so, you can’t cast it in this way again until you finish a long rest."),
    prereq: { level: 5 }, grants: { spells: ['animateDead'] } }),
];

// === Dádiva do Pacto (só 2014, nível 3) ===
const pactBoons2014 = [
  L({ id: 'pactOfTheChain', name: b('Pacto da Corrente', 'Pact of the Chain'), source: 'PHB',
    desc: b('Aprende Encontrar Familiar (ritual, fora do limite) com formas extras: diabrete, pseudodragão, quasit ou sprite. Ao atacar, pode abrir mão de um ataque para o familiar atacar com a reação dele.', 'Learn Find Familiar (as a ritual, not counted against known spells) with extra forms: imp, pseudodragon, quasit, or sprite. When you attack, you can forgo one attack so your familiar attacks with its reaction.'),
    grants: { spells: ['findFamiliar'] } }),
  L({ id: 'pactOfTheBlade', name: b('Pacto da Lâmina', 'Pact of the Blade'), source: 'PHB',
    desc: b("Você pode usar sua ação para criar uma arma de pacto na sua mão vazia. Você pode escolher a forma que essa arma corpo a corpo assume cada vez que a cria. Você é proficiente com ela enquanto a empunhar. Esta arma conta como mágica com o propósito de superar resistência e imunidade a ataques e dano não mágicos.\n\nSua arma de pacto desaparece se estiver a mais de 1,5 metro de você por 1 minuto ou mais. Ela também desaparece se você usar esta característica novamente, se você dispensar a arma (nenhuma ação necessária) ou se você morrer.\n\nVocê pode transformar uma arma mágica em sua arma de pacto realizando um ritual especial enquanto segura a arma. Você realiza o ritual ao longo de 1 hora, o que pode ser feito durante um descanso curto. Você pode então dispensar a arma, enviando-a para um espaço extradimensional, e ela surge sempre que você criar sua arma de pacto a partir de então. Você não pode afetar um artefato ou uma arma senciente dessa maneira. A arma deixa de ser sua arma de pacto se você morrer, se você realizar o ritual de 1 hora em uma arma diferente ou se usar um ritual de 1 hora para romper seu vínculo com ela. A arma surge no chão onde você está se estiver no espaço extradimensional quando o vínculo se romper.", "You can use your action to create a pact weapon in your empty hand. You can choose the form that this melee weapon takes each time you create it. You are proficient with it while you wield it. This weapon counts as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage.\n\nYour pact weapon disappears if it is more than 5 feet away from you for 1 minute or more. It also disappears if you use this feature again, if you dismiss the weapon (no action required), or if you die.\n\nYou can transform one magic weapon into your pact weapon by performing a special ritual while you hold the weapon. You perform the ritual over the course of 1 hour, which can be done during a short rest. You can then dismiss the weapon, shunting it into an extradimensional space, and it appears whenever you create your pact weapon thereafter. You can't affect an artifact or a sentient weapon in this way. The weapon ceases being your pact weapon if you die, if you perform the 1-hour ritual on a different weapon, or if you use a 1-hour ritual to break your bond to it. The weapon appears at your feet if it is in the extradimensional space when the bond breaks.") }),
  L({ id: 'pactOfTheTome', name: b('Pacto do Tomo', 'Pact of the Tome'), source: 'PHB',
    desc: b("Seu patrono lhe concede um grimório chamado Livro das Sombras. Ao obter esta característica, escolha três truques da lista de magias de qualquer classe (os três não precisam ser da mesma lista). Enquanto o livro estiver em sua posse, você pode conjurar esses truques à vontade. Eles não contam no seu número de truques conhecidos. Se eles não constarem na lista de magias de bruxo, ainda assim contam como magias de bruxo para você.\n\nSe você perder seu Livro das Sombras, poderá realizar uma cerimônia de 1 hora para receber um substituto do seu patrono. Essa cerimônia pode ser realizada durante um descanso curto ou longo, e destrói o livro anterior. O livro se transforma em cinzas quando você morre.", "Your patron gives you a grimoire called a Book of Shadows. When you gain this feature, choose three cantrips from any class's spell list (the three needn't be from the same list). While the book is on your person, you can cast those cantrips at will. They don't count against your number of cantrips known. If they don't appear on the warlock spell list, they are nonetheless warlock spells for you.\n\nIf you lose your Book of Shadows, you can perform a 1-hour ceremony to receive a replacement from your patron. This ceremony can be performed during a short or long rest, and it destroys the previous book. The book turns to ash when you die."),
    choices: { tomeCantrip: 3 } }),
  L({ id: 'pactOfTheTalisman', name: b('Pacto do Talismã', 'Pact of the Talisman'), source: 'TCE',
    desc: b("Seu patrono lhe concede um amuleto, um talismã que pode auxiliar o usuário quando a necessidade for grande. Quando o usuário falhar em um teste de atributo, ele pode adicionar um d4 à rolagem, potencialmente transformando a rolagem em um sucesso. Esse benefício pode ser usado um número de vezes igual ao seu bônus de proficiência, e todos os usos gastos são recuperados quando você termina um descanso longo.\n\nSe você perder o talismã, poderá realizar uma cerimônia de 1 hora para receber um substituto do seu patrono. Essa cerimônia pode ser realizada durante um descanso curto ou longo, e destrói o amuleto anterior. O talismã se transforma em cinzas quando você morre.", "Your patron gives you an amulet, a talisman that can aid the wearer when the need is great. When the wearer fails an ability check, they can add a d4 to the roll, potentially turning the roll into a success. This benefit can be used a number of times equal to your proficiency bonus, and all expended uses are restored when you finish a long rest.\n\nIf you lose the talisman, you can perform a 1-hour ceremony to receive a replacement from your patron. This ceremony can be performed during a short or long rest, and it destroys the previous amulet. The talisman turns to ash when you die.") }),
];

// === Tipo de gênio (subclasse O Gênio) ===
const genieKinds = [
  ['dao', b('Dao (terra)', 'Dao (earth)'), b('Concussão', 'Bludgeoning'), 'Santuário, Crescer Espinhos, Fundir-se às Rochas, Moldar Rochas, Muralha de Pedra', 'Sanctuary, Spike Growth, Meld into Stone, Stone Shape, Wall of Stone'],
  ['djinni', b('Djinni (ar)', 'Djinni (air)'), b('Trovão', 'Thunder'), 'Onda Trovejante, Lufada de Vento, Muralha de Vento, Invisibilidade Maior, Semelhança', 'Thunderwave, Gust of Wind, Wind Wall, Greater Invisibility, Seeming'],
  ['efreeti', b('Efreeti (fogo)', 'Efreeti (fire)'), b('Fogo', 'Fire'), 'Mãos Flamejantes, Raio Ardente, Bola de Fogo, Escudo de Fogo, Coluna de Chamas', 'Burning Hands, Scorching Ray, Fireball, Fire Shield, Flame Strike'],
  ['marid', b('Marid (água)', 'Marid (water)'), b('Frio', 'Cold'), 'Névoa, Nublar, Tempestade de Granizo, Controlar a Água, Cone de Frio', 'Fog Cloud, Blur, Sleet Storm, Control Water, Cone of Cold'],
].map(([id, name, dmg, spt, sen]) => ({
  id, name, source: 'TCE', prereq: { subclass: ['genie'] },
  desc: b(`Ira do Gênio e Dádiva Elemental usam dano/resistência de ${dmg.pt}. Magias extras (sempre preparadas, por círculo 1–5): ${spt}.`,
    `Genie's Wrath and Elemental Gift use ${dmg.en} damage/resistance. Extra spells (always prepared, levels 1–5): ${sen}.`),
}));

const arcanum = (lv) => ({
  name: b(`Arcana Mística (${lv}º círculo)`, `Mystic Arcanum (level ${lv})`),
  kind: 'spell', filter: { classes: ['warlock'], level: lv }, grantAs: 'spell', swapOnLevelUp: 1,
});

// === Classe base (2024, SRD 5.2.1) ===
const ASI = f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
  'Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique. Este traço se repete nos níveis 8, 12 e 16 de bruxo.',
  'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Warlock levels 8, 12, and 16.'));
const ARCANUM_DESC = (lv, next) => b(
  `Seu patrono lhe concede um segredo mágico: escolha uma magia de bruxo de ${lv}º círculo como arcano. Você pode conjurá-la uma vez sem gastar espaço de magia e recupera esse uso ao terminar um Descanso Longo. ${next}Sempre que ganhar um nível de bruxo, pode trocar uma magia de arcano por outra magia de bruxo do mesmo círculo.`,
  `Your patron grants you a magical secret called an arcanum: choose one level ${lv} Warlock spell. You can cast it once without expending a spell slot and regain that use when you finish a Long Rest. ${next ? 'You gain further arcana at Warlock levels 13 (level 7), 15 (level 8), and 17 (level 9). ' : ''}Whenever you gain a Warlock level, you can replace one of your arcanum spells with another Warlock spell of the same level.`);

const features = {
  1: [
    f('eldritchInvocations', b('Invocações Místicas', 'Eldritch Invocations'), b(
      'Você desenterrou fragmentos de saber proibido que lhe dão habilidades mágicas permanentes. Ganha 1 invocação à sua escolha (ex.: Pacto do Tomo) e mais conforme a coluna Invocações da tabela (3 no 2º nível, 5 no 5º, 6 no 7º, 7 no 9º, 8 no 12º, 9 no 15º e 10 no 18º). Para aprender uma invocação você precisa cumprir o pré-requisito dela (ex.: "Bruxo nível 5+"). Sempre que ganhar um nível de bruxo, pode trocar uma invocação por outra para a qual se qualifique, mas não uma que seja pré-requisito de outra invocação que você tenha. Não pode escolher a mesma invocação mais de uma vez, a não ser que a descrição dela diga que é repetível.',
      'You have unearthed forbidden lore that grants you abiding magical abilities. You gain one invocation of your choice (such as Pact of the Tome) and more as shown in the Invocations column (3 at level 2, 5 at 5, 6 at 7, 7 at 9, 8 at 12, 9 at 15, and 10 at 18). You must meet an invocation\'s prerequisite to learn it (e.g., "Level 5+ Warlock"). Whenever you gain a Warlock level, you can replace one invocation with another you qualify for, but not one that is a prerequisite for another invocation you have. You can\'t pick the same invocation more than once unless its description says it is repeatable.')),
    f('pactMagic', b('Magia de Pacto', 'Pact Magic'), b(
      'Por um ritual oculto, você firmou um pacto com uma entidade misteriosa que lhe dá a capacidade de conjurar magias. Truques: conhece 2 truques de bruxo (sugeridos Rajada Mística e Prestidigitação), 3 no 4º nível e 4 no 10º; ao ganhar um nível de bruxo, pode trocar um deles. Espaços de magia: a tabela mostra quantos espaços você tem e o círculo deles — todos do mesmo círculo — e você recupera todos ao terminar um Descanso Curto ou Longo. Magias preparadas: comece com 2 magias de bruxo de 1º círculo (sugeridas Enfeitiçar Pessoa e Maldição); a quantidade cresce conforme a tabela, sempre de círculo até o dos seus espaços. Magias que outros traços deixam sempre preparadas não contam nesse limite. Ao ganhar um nível de bruxo, pode trocar uma magia preparada por outra elegível. Carisma é seu atributo de conjuração, e você pode usar um Foco Arcano.',
      'Through occult ceremony, you have formed a pact with a mysterious entity that grants you the ability to cast spells. Cantrips: you know two Warlock cantrips (Eldritch Blast and Prestidigitation are recommended), three at level 4 and four at level 10; whenever you gain a Warlock level, you can replace one. Spell slots: the table shows how many slots you have and their level — all the same level — and you regain all of them when you finish a Short or Long Rest. Prepared spells: start with two level 1 Warlock spells (Charm Person and Hex are recommended); the number grows per the table, always of a level no higher than your slot level. Spells other features make always prepared don\'t count against it. Whenever you gain a Warlock level, you can replace one prepared spell with another eligible one. Charisma is your spellcasting ability, and you can use an Arcane Focus.')),
  ],
  2: [
    f('magicalCunning', b('Astúcia Mágica', 'Magical Cunning'), b(
      'Você pode realizar um rito esotérico de 1 minuto. Ao fim dele, recupera espaços de Magia de Pacto gastos, até metade do seu máximo (arredondado para cima). Depois de usar este traço, só pode usá-lo de novo após terminar um Descanso Longo.',
      'You can perform an esoteric rite for 1 minute. At the end of it, you regain expended Pact Magic spell slots, no more than half your maximum (round up). Once you use this feature, you can\'t do so again until you finish a Long Rest.')),
  ],
  3: [
    f('warlockSubclass', b('Subclasse de Bruxo', 'Warlock Subclass'), b(
      'Você escolhe um patrono como subclasse de bruxo (Arquifada, Celestial, Grande Antigo ou Ínfero, entre outros). A subclasse concede traços nos níveis 3, 6, 10 e 14 de bruxo; você recebe cada traço dela de nível igual ou inferior ao seu.',
      'You choose a patron as your Warlock subclass (Archfey, Celestial, Great Old One, or Fiend, among others). The subclass grants features at Warlock levels 3, 6, 10, and 14; you gain each of its features of your Warlock level or lower.')),
  ],
  4: [ASI],
  8: [ASI],
  9: [
    f('contactPatron', b('Contatar Patrono', 'Contact Patron'), b(
      'Antes você falava com seu patrono por intermediários; agora pode se comunicar diretamente. Você sempre tem a magia Contatar Outro Plano preparada. Com este traço, pode conjurá-la sem gastar espaço de magia para contatar seu patrono, e passa automaticamente na salvaguarda da magia. Depois disso, só pode conjurá-la assim de novo após terminar um Descanso Longo.',
      'You used to contact your patron through intermediaries; now you can communicate directly. You always have the Contact Other Plane spell prepared. With this feature, you can cast it without expending a spell slot to contact your patron, and you automatically succeed on the spell\'s saving throw. Once you do so, you can\'t cast it this way again until you finish a Long Rest.')),
  ],
  11: [f('mysticArcanumLevel6Spell', b('Arcana Mística (6º círculo)', 'Mystic Arcanum (Level 6 Spell)'),
    ARCANUM_DESC(6, 'Você ganha outro arcano nos níveis 13 (7º círculo), 15 (8º) e 17 (9º) de bruxo. '))],
  12: [ASI],
  13: [f('mysticArcanumLevel7Spell', b('Arcana Mística (7º círculo)', 'Mystic Arcanum (Level 7 Spell)'), ARCANUM_DESC(7, ''))],
  15: [f('mysticArcanumLevel8Spell', b('Arcana Mística (8º círculo)', 'Mystic Arcanum (Level 8 Spell)'), ARCANUM_DESC(8, ''))],
  16: [ASI],
  17: [f('mysticArcanumLevel9Spell', b('Arcana Mística (9º círculo)', 'Mystic Arcanum (Level 9 Spell)'), ARCANUM_DESC(9, ''))],
  19: [
    f('epicBoon', b('Dádiva Épica', 'Epic Boon'), b(
      "Você ganha um talento de Dádiva Épica (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Dádiva do Destino é recomendada.",
      "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Fate is recommended.")),
  ],
  20: [
    f('eldritchMaster', b('Mestre Místico', 'Eldritch Master'), b(
      'Quando usa Astúcia Mágica, você recupera todos os espaços de Magia de Pacto gastos.',
      'When you use your Magical Cunning feature, you regain all your expended Pact Magic spell slots.')),
  ],
};

// === Subclasses ===
// Suplementos 2014 (XGE, SCAG, TCE, VRGR): traços do nível 1 movidos para o 3; a lista
// expandida vira magias sempre preparadas nos níveis 3 (1º e 2º círculos), 5, 7 e 9,
// no mesmo molde dos patronos de 2024.
const spellsFeature = (id, pt, en, listPt, listEn) => f(id, b(`Magias ${pt}`, `${en} Spells`), b(
  `Sempre preparadas (não contam no limite): ${listPt}`,
  `Always prepared (they don't count against your limit): ${listEn}`));

const subclasses = {
  fiend: {
    name: b('Patrono Ínfero', 'Fiend Patron'),
    source: 'SRD',
    desc: b('Pacto com um ser dos Planos Inferiores (demônio, diabo ou similar), que concede vigor ao derrubar inimigos e o poder de arremessá-los pelo inferno.', 'A pact with a being of the Lower Planes (demon, devil, or the like) that grants vigor when foes fall and the power to hurl them through hell.'),
    levels: {
      3: {
        features: [
          f('darkOnesBlessing', b('Bênção do Sombrio', "Dark One's Blessing"), b(
            "Quando você reduz um inimigo a 0 Pontos de Vida, você ganha Pontos de Vida Temporários iguais ao seu modificador de Carisma mais o seu nível de Bruxo (mínimo de 1 Ponto de Vida Temporário). Você também ganha este benefício se outra pessoa reduzir um inimigo a até 3 metros de você a 0 Pontos de Vida.",
            "When you reduce an enemy to 0 Hit Points, you gain Temporary Hit Points equal to your Charisma modifier plus your Warlock level (minimum of 1 Temporary Hit Point). You also gain this benefit if someone else reduces an enemy within 10 feet of you to 0 Hit Points.")),
          f('fiendSpells', b('Magias do Ínfero', 'Fiend Spells'), b(
            "A magia do seu patrono garante que você sempre tenha certas magias preparadas; quando você atinge um nível de Bruxo especificado na tabela Magias do Corruptor, a partir de então você sempre tem as magias listadas preparadas.\n\nMagias do Corruptor\n\nNível de Bruxo | Magias\n3 | Mãos Flamejantes, Comando, Raio Ardente, Sugestão\n5 | Bola de Fogo, Névoa Fétida\n7 | Escudo de Fogo, Muralha de Fogo\n9 | Missão, Praga de Insetos",
            "The magic of your patron ensures you always have certain spells ready; when you reach a Warlock level specified in the Fiend Spells table, you thereafter always have the listed spells prepared.\n\nFiend Spells\n\nWarlock Level | Spells\n3 | Burning Hands, Command, Scorching Ray, Suggestion\n5 | Fireball, Stinking Cloud\n7 | Fire Shield, Wall of Fire\n9 | Geas, Insect Plague")),
        ],
        autoSpells: ['burningHands', 'command', 'scorchingRay', 'suggestion'],
      },
      5: { autoSpells: ['fireball', 'stinkingCloud'] },
      6: {
        features: [
          f('darkOnesOwnLuck', b('Sorte do Próprio Sombrio', "Dark One's Own Luck"), b(
            'Ao fazer um teste de atributo ou salvaguarda, pode somar 1d10 à rolagem, mesmo depois de vê-la e antes de os efeitos acontecerem. Usos iguais ao seu modificador de Carisma (mínimo 1), no máximo uma vez por rolagem; recupera todos ao terminar um Descanso Longo.',
            'When you make an ability check or a saving throw, you can add 1d10 to the roll, after seeing it but before its effects occur. Uses equal to your Charisma modifier (minimum 1), no more than once per roll; you regain all uses when you finish a Long Rest.')),
        ],
      },
      7: { autoSpells: ['fireShield', 'wallOfFire'] },
      9: { autoSpells: ['geas', 'insectPlague'] },
      10: {
        features: [
          f('fiendishResilience', b('Resiliência Ínfera', 'Fiendish Resilience'), b(
            "Escolha um tipo de dano, exceto Energia, sempre que terminar um Descanso Curto ou Longo. Você tem Resistência àquele tipo de dano até escolher um diferente com esta característica.",
            "Choose one damage type, other than Force, whenever you finish a Short or Long Rest. You have Resistance to that damage type until you choose a different one with this feature.")),
        ],
      },
      14: {
        features: [
          f('hurlThroughHell', b('Arremessar pelo Inferno', 'Hurl Through Hell'), b(
            '1×/turno, ao acertar uma criatura com uma jogada de ataque, pode tentar transportá-la pelos Planos Inferiores: ela faz uma salvaguarda de Carisma contra sua CD de magia. Se falhar, desaparece, sofre 8d10 de dano psíquico (se não for um Ínfero) e fica Incapacitada até o fim do seu próximo turno, quando volta ao espaço de onde saiu (ou o mais próximo livre). Depois de usar, só pode de novo após um Descanso Longo, a não ser que gaste um espaço de Magia de Pacto (sem ação) para recuperar o uso.',
            'Once per turn when you hit a creature with an attack roll, you can try to transport it through the Lower Planes: it makes a Charisma saving throw against your spell save DC. On a failure, it disappears, takes 8d10 Psychic damage (if it isn\'t a Fiend), and has the Incapacitated condition until the end of your next turn, when it returns to the space it left (or the nearest unoccupied one). Once used, you can\'t use it again until you finish a Long Rest unless you expend a Pact Magic spell slot (no action required) to restore it.')),
        ],
      },
    },
  },

  archfey: {
    name: b('Patrono Arquifada', 'Archfey Patron'),
    source: 'PHB24',
    desc: b('Pacto com um senhor ou senhora da Agrestia das Fadas, que ensina a atravessar as fronteiras entre os planos em passos enganosos.', 'A pact with a lord or lady of the Feywild that teaches you to slip between the boundaries of the planes in beguiling steps.'),
    levels: {
      3: {
        features: [
          f('archfeySpells', b('Magias da Arquifada', 'Archfey Spells'), b(
            "A magia do seu patrono garante que você sempre tenha certas magias preparadas; quando você atinge um nível de Bruxo especificado na tabela Magias da Arquifada, a partir de então você sempre tem as magias listadas preparadas.\n\nMagias da Arquifada\nNível de Bruxo | Magias\n3 | Acalmar Emoções, Fogo das Fadas, Passo Nebuloso, Força Fantasmagórica, Sono\n5 | Piscar, Crescimento Vegetal\n7 | Dominar Besta, Invisibilidade Maior\n9 | Dominar Pessoa, Semblante",
            "The magic of your patron ensures you always have certain spells ready; when you reach a Warlock level specified in the Archfey Spells table, you thereafter always have the listed spells prepared.\n\nArchfey Spells\nWarlock Level | Spells\n3 | Calm Emotions, Faerie Fire, Misty Step, Phantasmal Force, Sleep\n5 | Blink, Plant Growth\n7 | Dominate Beast, Greater Invisibility\n9 | Dominate Person, Seeming")),
          f('stepsOfTheFey', b('Passos Feéricos', 'Steps of the Fey'), b(
            'Você pode conjurar Passo Nebuloso sem gastar espaço de magia um número de vezes igual ao seu modificador de Carisma (mínimo 1), recuperando os usos num Descanso Longo. Sempre que conjurar essa magia, pode escolher um efeito extra: Passo Revigorante — logo após teleportar, você ou uma criatura a até 3 m ganha 1d10 PV temporários; Passo Provocador — criaturas a até 1,5 m do espaço que você deixou fazem salvaguarda de Sabedoria ou têm Desvantagem em ataques contra outros que não você até o início do seu próximo turno.',
            'You can cast Misty Step without expending a spell slot a number of times equal to your Charisma modifier (minimum once), regaining uses on a Long Rest. Whenever you cast that spell, you can choose one extra effect: Refreshing Step — right after teleporting, you or one creature within 10 feet gains 1d10 Temporary Hit Points; Taunting Step — creatures within 5 feet of the space you left make a Wisdom save or have Disadvantage on attacks against creatures other than you until the start of your next turn.')),
        ],
        autoSpells: ['calmEmotions', 'faerieFire', 'mistyStep', 'phantasmalForce', 'sleep'],
      },
      5: { autoSpells: ['blink', 'plantGrowth'] },
      6: {
        features: [
          f('mistyEscape', b('Fuga Nebulosa', 'Misty Escape'), b(
            'Você pode conjurar Passo Nebuloso como Reação ao sofrer dano. Além disso, ganha duas novas opções de Passos Feéricos: Passo do Desaparecimento — você fica Invisível até o início do seu próximo turno ou até logo após fazer um ataque, causar dano ou conjurar uma magia; Passo Pavoroso — criaturas a até 1,5 m do espaço que deixou ou do espaço onde surgiu (à sua escolha) fazem salvaguarda de Sabedoria ou sofrem 2d10 de dano psíquico.',
            'You can cast Misty Step as a Reaction when you take damage. You also gain two new Steps of the Fey options: Disappearing Step — you have the Invisible condition until the start of your next turn or until right after you attack, deal damage, or cast a spell; Dreadful Step — creatures within 5 feet of the space you left or the space you arrive in (your choice) make a Wisdom save or take 2d10 Psychic damage.')),
        ],
      },
      7: { autoSpells: ['dominateBeast', 'greaterInvisibility'] },
      9: { autoSpells: ['dominatePerson', 'seeming'] },
      10: {
        features: [
          f('beguilingDefenses', b('Defesas Sedutoras', 'Beguiling Defenses'), b(
            'Você é imune à condição Enfeitiçado. Além disso, logo após uma criatura que você vê acertá-lo com uma jogada de ataque, pode usar a Reação para reduzir o dano à metade (arredondado para baixo) e forçar o atacante a uma salvaguarda de Sabedoria; se falhar, ele sofre dano psíquico igual ao que você sofreu. 1×/Descanso Longo, ou recupere gastando um espaço de Magia de Pacto (sem ação).',
            'You are immune to the Charmed condition. In addition, right after a creature you can see hits you with an attack roll, you can take a Reaction to halve the damage (round down) and force the attacker to make a Wisdom save; on a failure, it takes Psychic damage equal to the damage you take. Once per Long Rest, or restore it by expending a Pact Magic slot (no action required).')),
        ],
      },
      14: {
        features: [
          f('bewitchingMagic', b('Magia Enfeitiçante', 'Bewitching Magic'), b(
            "Seu patrono concede a você a habilidade de entrelaçar sua magia com teletransporte. Imediatamente após conjurar uma magia de Encantamento ou Ilusão usando uma ação e um espaço de magia, você pode conjurar Passo Nebuloso como parte da mesma ação e sem gastar um espaço de magia.",
            "Your patron grants you the ability to weave your magic with teleportation. Immediately after you cast an Enchantment or Illusion spell using an action and a spell slot, you can cast Misty Step as part of the same action and without expending a spell slot.")),
        ],
      },
    },
  },

  celestial: {
    name: b('Patrono Celestial', 'Celestial Patron'),
    source: 'PHB24',
    desc: b('Pacto com um ser dos Planos Superiores (empíreo, couatl, esfinge, unicórnio…), que concede luz curativa e fogo sagrado.', 'A pact with a being of the Upper Planes (empyrean, couatl, sphinx, unicorn…) that grants healing light and holy fire.'),
    levels: {
      3: {
        features: [
          f('celestialSpells', b('Magias Celestiais', 'Celestial Spells'), b(
            'Sempre preparadas: nível 3 — Auxílio, Curar Ferimentos, Flecha Guiada, Restauração Menor, Luz, Chama Sagrada; nível 5 — Luz do Dia, Revivificar; nível 7 — Guardião da Fé, Muralha de Fogo; nível 9 — Restauração Maior, Invocar Celestial.',
            'Always prepared: level 3 — Aid, Cure Wounds, Guiding Bolt, Lesser Restoration, Light, Sacred Flame; level 5 — Daylight, Revivify; level 7 — Guardian of Faith, Wall of Fire; level 9 — Greater Restoration, Summon Celestial.')),
          f('healingLight', b('Luz Curativa', 'Healing Light'), b(
            'Você tem uma reserva de d6 igual a 1 + seu nível de bruxo. Como Ação Bônus, cura você ou uma criatura que veja a até 18 m gastando dados da reserva (no máximo seu modificador de Carisma de uma vez, mínimo 1) e somando o resultado. A reserva se recupera num Descanso Longo.',
            'You have a pool of d6s equal to 1 + your Warlock level. As a Bonus Action, heal yourself or a creature you can see within 60 feet by spending dice from the pool (at most your Charisma modifier at once, minimum 1) and rolling them. The pool refills on a Long Rest.')),
        ],
        autoCantrips: ['light', 'sacredFlame'],
        autoSpells: ['aid', 'cureWounds', 'guidingBolt', 'lesserRestoration'],
      },
      5: { autoSpells: ['daylight', 'revivify'] },
      6: {
        features: [
          f('radiantSoul', b('Alma Radiante', 'Radiant Soul'), b(
            "Seu vínculo com seu patrono permite que você sirva como um conduíte para energia radiante. Você tem Resistência a dano Radiante. Uma vez por turno, quando uma magia que você conjurar causar dano Radiante ou Ígneo, você pode adicionar seu modificador de Carisma ao dano daquela magia contra um dos alvos da magia.",
            "Your link to your patron allows you to serve as a conduit for radiant energy. You have Resistance to\nRadiant damage. Once per turn , when a spell you cast deals Radiant or Fire da mage, you can add your Charisma modifier to th at spell's da age against one of the spell's targets.")),
        ],
      },
      7: { autoSpells: ['guardianOfFaith', 'wallOfFire'] },
      9: { autoSpells: ['greaterRestoration', 'summonCelestial'] },
      10: {
        features: [
          f('celestialResilience', b('Resiliência Celestial', 'Celestial Resilience'), b(
            'Ao usar Astúcia Mágica ou terminar um Descanso Curto ou Longo, você ganha PV temporários iguais ao seu nível de bruxo + modificador de Carisma, e até cinco criaturas que você vê ganham metade do seu nível de bruxo + modificador de Carisma.',
            'Whenever you use Magical Cunning or finish a Short or Long Rest, you gain Temporary Hit Points equal to your Warlock level + Charisma modifier, and up to five creatures you can see gain half your Warlock level + Charisma modifier.')),
        ],
      },
      14: {
        features: [
          f('searingVengeance', b('Vingança Abrasadora', 'Searing Vengeance'), b(
            'Quando você ou um aliado a até 18 m vai fazer uma salvaguarda contra a morte, pode liberar energia radiante: a criatura recupera metade dos PV máximos e pode encerrar a condição Caído; cada criatura à sua escolha a até 9 m dela sofre 2d8 + seu modificador de Carisma de dano radiante e fica Cega até o fim do turno atual. 1×/Descanso Longo.',
            'When you or an ally within 60 feet is about to make a Death Saving Throw, you can unleash radiant energy: the creature regains half its Hit Point maximum and can end the Prone condition; each creature of your choice within 30 feet of it takes 2d8 + your Charisma modifier Radiant damage and is Blinded until the end of the current turn. Once per Long Rest.')),
        ],
      },
    },
  },

  greatoldone: {
    name: b('Patrono Grande Antigo', 'Great Old One Patron'),
    source: 'PHB24',
    desc: b('Pacto com uma entidade inescrutável do Reino Distante ou um deus ancestral, que desperta a mente para a telepatia e a magia psíquica.', 'A pact with an unknowable entity of the Far Realm or an elder god that awakens your mind to telepathy and psychic magic.'),
    levels: {
      3: {
        features: [
          f('awakenedMind', b('Mente Desperta', 'Awakened Mind'), b(
            'Ação Bônus: crie um vínculo telepático com uma criatura que você vê a até 9 m. Vocês se comunicam telepaticamente enquanto estiverem a até (modificador de Carisma, mínimo 1) milhas um do outro, desde que cada um use um idioma que o outro conheça. Dura um número de minutos igual ao seu nível de bruxo, ou até você ligar-se a outra criatura.',
            'Bonus Action: form a telepathic connection with a creature you can see within 30 feet. You can communicate telepathically while within (Charisma modifier, minimum 1) miles of each other, as long as each uses a language the other knows. It lasts a number of minutes equal to your Warlock level, or until you connect with another creature.')),
          f('greatOldOneSpells', b('Magias do Grande Antigo', 'Great Old One Spells'), b(
            'Sempre preparadas: nível 3 — Detectar Pensamentos, Sussurros Dissonantes, Força Fantasmagórica, Riso Histérico de Tasha; nível 5 — Clarividência, Fome de Hadar; nível 7 — Confusão, Invocar Aberração; nível 9 — Modificar Memória, Telecinesia.',
            'Always prepared: level 3 — Detect Thoughts, Dissonant Whispers, Phantasmal Force, Tasha\'s Hideous Laughter; level 5 — Clairvoyance, Hunger of Hadar; level 7 — Confusion, Summon Aberration; level 9 — Modify Memory, Telekinesis.')),
          f('psychicSpells', b('Magias Psíquicas', 'Psychic Spells'), b(
            "Quando você conjura uma magia de Bruxo que causa dano, você pode mudar o tipo de dano dela para Psíquico. Além disso, quando você conjura uma magia de Bruxo que seja de Encantamento ou Ilusão, pode fazê-lo sem componentes Verbais ou Somáticos.",
            "When you cast a Warlock spell that deals damage, you can change its damage type to Psychic. In addition, when you cast a Warlock spell that is an Enchantment or Illusion, you can do so without Verbal or Somatic components.")),
        ],
        autoSpells: ['detectThoughts', 'dissonantWhispers', 'phantasmalForce', 'hideousLaughter'],
      },
      5: { autoSpells: ['clairvoyance', 'hungerOfHadar'] },
      6: {
        features: [
          f('clairvoyantCombatant', b('Combatente Clarividente', 'Clairvoyant Combatant'), b(
            'Ao criar o vínculo de Mente Desperta, pode forçar a criatura a uma salvaguarda de Sabedoria contra sua CD de magia. Se falhar, enquanto durar o vínculo ela tem Desvantagem em ataques contra você e você tem Vantagem em ataques contra ela. 1×/Descanso Curto ou Longo, ou recupere gastando um espaço de Magia de Pacto (sem ação).',
            'When you form an Awakened Mind bond, you can force the creature to make a Wisdom save against your spell save DC. On a failure, for the bond\'s duration it has Disadvantage on attacks against you and you have Advantage on attacks against it. Once per Short or Long Rest, or restore it by expending a Pact Magic slot (no action required).')),
        ],
      },
      7: { autoSpells: ['confusion', 'summonAberration'] },
      9: { autoSpells: ['modifyMemory', 'telekinesis'] },
      10: {
        features: [
          f('eldritchHex', b('Maldição Mística', 'Eldritch Hex'), b(
            "Seu patrono alienígena concede a você uma maldição poderosa. Você sempre tem a magia Bruxaria preparada. Quando conjura Bruxaria e escolhe uma habilidade, o alvo também tem Desvantagem nas salvaguardas da habilidade escolhida pela duração da magia.",
            "Your alien patron grants you a powerful curse. You always have the Hex spell prepared. When you cast Hex and choose an ability, the target also has Disadvantage on saving throws of the chosen ability for the duration of the spell.")),
          f('thoughtShield', b('Escudo de Pensamentos', 'Thought Shield'), b(
            "A partir do 10º nível, seus pensamentos não podem ser lidos por telepatia ou outros meios a menos que você permita. Você também tem resistência a dano psíquico e, sempre que uma criatura causar dano psíquico a você, aquela criatura sofre a mesma quantidade de dano que você sofrer.",
            "Starting at 10th level, your thoughts can’t be read by telepathy or other means unless you allow it. You also have resistance to psychic damage, and whenever a creature deals psychic damage to you, that creature takes the same amount of damage that you do.")),
        ],
        autoSpells: ['hex'],
      },
      14: {
        features: [
          f('createThrall', b('Criar Servo', 'Create Thrall'), b(
            'Ao conjurar Invocar Aberração, pode fazê-la sem Concentração (duração de 1 minuto nesse caso). A Aberração surge com PV temporários iguais ao seu nível de bruxo + modificador de Carisma e, na primeira vez em cada turno que acertar uma criatura sob sua Maldição, causa dano psíquico extra igual ao bônus de dano da Maldição.',
            'When you cast Summon Aberration, you can make it not require Concentration (its duration becomes 1 minute). The Aberration appears with Temporary Hit Points equal to your Warlock level + Charisma modifier and, the first time each turn it hits a creature under your Hex, deals extra Psychic damage equal to Hex\'s bonus damage.')),
        ],
      },
    },
  },

  hexblade: {
    name: b('A Lâmina Maldita', 'The Hexblade'),
    source: 'XGE',
    desc: b('Pacto com uma entidade misteriosa do Pendor das Sombras que se manifesta em armas sencientes; une maldições e combate armado.', 'A pact with a mysterious entity from the Shadowfell that manifests through sentient weapons; blends curses with armed combat.'),
    levels: {
      3: {
        features: [
          f("hexbladeSpells", b("Magias da Lâmina Maldita", "Hexblade Spells"), b("A Lâmina Maldita permite que você escolha em uma lista expandida de magias quando aprende uma magia de bruxo. As seguintes magias são adicionadas à lista de magias de bruxo para você.\n\nMagias Expandidas da Lâmina Maldita\n\nCírculo de Magia | Magias\n1º | Escudo Arcano, Destruição Colérica\n2º | Nublar, Destruição Marcante\n3º | Piscar, Arma Elemental\n4º | Assassino Fantasmagórico, Destruição Estonteante\n5º | Destruição Banidora, Cone de Frio", "The Hexblade lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you.\n\nHexblade Expanded Spells\n\nSpell Level | Spells\n1st | Shield, Wrathful Smite\n2nd | Blur, Branding Smite\n3rd | Blink, Elemental Weapon\n4th | Phantasmal Killer, Staggering Smite\n5th | Banishing Smite, Cone of Cold")),
          f('hexbladesCurse', b('Maldição da Lâmina', "Hexblade's Curse"), b(
            'Ação Bônus: amaldiçoe uma criatura que você vê a até 9 m por 1 minuto (termina antes se ela morrer, se você morrer ou ficar Incapacitado). Contra ela: +bônus de proficiência no dano, crítico com 19–20 nas jogadas de ataque, e, se ela morrer, você recupera PV iguais ao nível de bruxo + mod. de Carisma (mín. 1). 1×/Descanso Curto ou Longo.',
            'Bonus Action: curse a creature you can see within 30 feet for 1 minute (ends early if it dies, you die, or you are Incapacitated). Against it: +proficiency bonus to damage, critical hits on 19–20, and when it dies you regain HP equal to your Warlock level + Charisma modifier (minimum 1). Once per Short or Long Rest.')),
          f('hexWarrior', b('Guerreiro Amaldiçoado', 'Hex Warrior'), b(
            'Proficiência com armadura média, escudos e armas marciais. Ao terminar um Descanso Longo, toque uma arma com a qual seja proficiente e que não tenha a propriedade Duas Mãos: você usa Carisma em vez de Força ou Destreza nas jogadas de ataque e de dano com ela até o próximo Descanso Longo. Com o Pacto da Lâmina, isso vale para qualquer arma do pacto.',
            'Proficiency with Medium armor, Shields, and Martial weapons. When you finish a Long Rest, touch one weapon you are proficient with that lacks the Two-Handed property: you use Charisma instead of Strength or Dexterity for its attack and damage rolls until your next Long Rest. With Pact of the Blade, this applies to any pact weapon.')),
        ],
        autoSpells: ['shield', 'wrathfulSmite', 'blur', 'brandingSmite'],
        grants: { armor: ['Medium', 'Shield'], weapons: ['Martial'] },
      },
      5: { autoSpells: ['blink', 'elementalWeapon'] },
      6: {
        features: [
          f('accursedSpecter', b('Espectro Amaldiçoado', 'Accursed Specter'), b(
            'Quando você mata um humanoide, pode erguer o espírito dele como um espectro sob seu comando até o próximo Descanso Longo. Ele ganha PV temporários iguais à metade do seu nível de bruxo e soma seu modificador de Carisma (mín. 0) às jogadas de ataque. 1×/Descanso Longo.',
            'When you slay a humanoid, you can raise its spirit as a specter under your command until your next Long Rest. It gains Temporary Hit Points equal to half your Warlock level and adds your Charisma modifier (minimum 0) to its attack rolls. Once per Long Rest.')),
        ],
      },
      7: { autoSpells: ['phantasmalKiller', 'staggeringSmite'] },
      9: { autoSpells: ['banishingSmite', 'coneOfCold'] },
      10: {
        features: [
          f('armorOfHexes', b('Armadura de Maldições', 'Armor of Hexes'), b(
            "No 10º nível, sua maldição se torna mais poderosa. Se o alvo amaldiçoado pela sua Maldição da Lâmina Maldita acertar você com uma jogada de ataque, você pode usar sua reação para rolar um d6. Em um 4 ou superior, o ataque erra você, independentemente da rolagem dele.",
            "At 10th level, your hex grows more powerful. If the target cursed by your Hexblade’s Curse hits you with an attack roll, you can use your reaction to roll a d6. On a 4 or higher, the attack instead misses you, regardless of its roll.")),
        ],
      },
      14: {
        features: [
          f('masterOfHexes', b('Mestre das Maldições', 'Master of Hexes'), b(
            "A partir do 14º nível, você pode espalhar sua Maldição da Lâmina Maldita de uma criatura abatida para outra criatura. Quando a criatura amaldiçoada pela sua Maldição da Lâmina Maldita morrer, você pode aplicar a maldição a uma criatura diferente que possa ver a até 9 metros de você, desde que você não esteja incapacitado. Quando você aplica a maldição dessa forma, não recupera pontos de vida pela morte da criatura amaldiçoada anteriormente.",
            "Starting at 14th level, you can spread your Hexblade’s Curse from a slain creature to another creature. When the creature cursed by your Hexblade’s Curse dies, you can apply the curse to a different creature you can see within 30 feet of you, provided you aren’t incapacitated. When you apply the curse in this way, you don’t regain hit points from the death of the previously cursed creature.")),
        ],
      },
    },
  },

  undying: {
    name: b('O Imortal', 'The Undying'),
    source: 'SCAG',
    desc: b('Pacto com um ser que venceu a morte (um lich poderoso, um deus esquecido), que concede resistência à própria mortalidade.', 'A pact with a being that has cheated death (a mighty lich, a forgotten god) that grants resistance to mortality itself.'),
    levels: {
      3: {
        features: [
          f("undyingSpells", b("Magias do Imortal", "Undying Spells"), b("O Imortal permite que você escolha em uma lista expandida de magias quando aprende uma magia de bruxo. As seguintes magias são adicionadas à lista de magias de bruxo para você.\n\nMagias Expandidas do Imortal\n\nCírculo de Magia | Magias\n1º | Vitalidade Falsa, Raio de Doença\n2º | Cegueira/Surdez, Silêncio\n3º | Fingir-se de Morto, Falar com os Mortos\n4º | Aura de Vida, Proteção contra a Morte\n5º | Praga, Conhecimento Lendário", "The Undying lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you.\n\nUndying Expanded Spells\n\nSpell Level | Spells\n1st | False Life, Ray of Sickness\n2nd | Blindness/Deafness, Silence\n3rd | Feign Death, Speak with Dead\n4th | Aura of Life, Death Ward\n5th | Contagion, Legend Lore")),
          f('amongTheDead', b('Entre os Mortos', 'Among the Dead'), b(
            'Você aprende o truque Poupar os Moribundos (conta como de bruxo, fora do limite). Tem Vantagem em salvaguardas contra doenças. Um morto-vivo que o escolha como alvo de ataque ou magia nociva faz salvaguarda de Sabedoria contra sua CD ou precisa escolher outro alvo; se você o atacar ou lhe lançar magia nociva, ele deixa de ser afetado.',
            'You learn the Spare the Dying cantrip (it counts as a Warlock cantrip and doesn\'t count against your cantrips). You have Advantage on saves against disease. An Undead that targets you with an attack or harmful spell makes a Wisdom save against your spell DC or must choose another target; if you attack it or cast a harmful spell on it, it is no longer affected.')),
        ],
        autoCantrips: ['spareTheDying'],
        autoSpells: ['falseLife', 'rayOfSickness', 'blindnessDeafness', 'silence'],
      },
      5: { autoSpells: ['feignDeath', 'speakWithDead'] },
      6: {
        features: [
          f('defyDeath', b('Desafiar a Morte', 'Defy Death'), b(
            "A partir do 6º nível, você pode conceder vitalidade a si mesmo quando enganar a morte ou quando ajudar outra pessoa a enganá-la. Você pode recuperar pontos de vida iguais a 1d8 + seu modificador de Constituição (mínimo de 1 ponto de vida) quando obtiver sucesso em uma salvaguarda contra a morte ou quando estabilizar uma criatura com poupar os moribundos.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um descanso longo.",
            "Starting at 6th level, you can give yourself vitality when you cheat death or when you help someone else cheat it. You can regain hit points equal to 1d8 + your Constitution modifier (minimum of 1 hit point) when you succeed on a death saving throw or when you stabilize a creature with spare the dying.\n\nOnce you use this feature, you can't use it again until you finish a long rest.")),
        ],
      },
      7: { autoSpells: ['auraOfLife', 'deathWard'] },
      9: { autoSpells: ['contagion', 'legendLore'] },
      10: {
        features: [
          f('undyingNature', b('Natureza Imortal', 'Undying Nature'), b(
            "A partir do 10º nível, você pode prender a respiração indefinidamente e não precisa de comida, água ou sono, embora ainda precise de descanso para reduzir a exaustão e ainda receba os benefícios de terminar descansos curtos e longos.\n\nAlém disso, você envelhece em um ritmo mais lento. A cada 10 anos que passam, seu corpo envelhece apenas 1 ano, e você é imune a ser envelhecido magicamente.",
            "Beginning at 10th level, you can hold your breath indefinitely, and you don't require food, water, or sleep, although you still require rest to reduce exhaustion and still benefit from finishing short and long rests.\n\nIn addition, you age at a slower rate. For every 10 years that pass, your body ages only 1 year, and you are immune to being magically aged.")),
        ],
      },
      14: {
        features: [
          f('indestructibleLife', b('Vida Indestrutível', 'Indestructible Life'), b(
            "Quando você alcança o 14º nível, você compartilha de alguns dos verdadeiros segredos do Imortal. No seu turno, você pode usar uma ação bônus para recuperar pontos de vida iguais a 1d8 + seu nível de bruxo. Além disso, se você colocar uma parte amputada do seu corpo de volta no lugar ao usar esta característica, a parte se reconecta.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um descanso curto ou longo.",
            "When you reach 14th level, you partake of some of the true secrets of the Undying. On your turn, you can use a bonus action to regain hit points equal to 1d8 + your warlock level. Additionally, if you put a severed body part of yours back in place when you use this feature, the part reattaches.\n\nOnce you use this feature, you can't use it again until you finish a short or long rest.")),
        ],
      },
    },
  },

  fathomless: {
    name: b('O Insondável', 'The Fathomless'),
    source: 'TCE',
    desc: b('Pacto com uma entidade das profundezas do oceano (kraken, espírito marinho antigo), que concede tentáculos espectrais e domínio sobre a água.', 'A pact with an entity of the ocean depths (a kraken, an ancient sea spirit) that grants spectral tentacles and mastery over water.'),
    levels: {
      3: {
        features: [
          spellsFeature('fathomlessSpells', 'do Insondável', 'Fathomless',
            '3 — Criar ou Destruir Água, Onda Trovejante, Lufada de Vento, Silêncio; 5 — Relâmpago, Tempestade de Granizo; 7 — Controlar a Água, Invocar Elemental (só água); 9 — Mão de Bigby (como tentáculo), Cone de Frio.',
            '3 — Create or Destroy Water, Thunderwave, Gust of Wind, Silence; 5 — Lightning Bolt, Sleet Storm; 7 — Control Water, Summon Elemental (water only); 9 — Bigby\'s Hand (as a tentacle), Cone of Cold.'),
          f('tentacleOfTheDeeps', b('Tentáculo das Profundezas', 'Tentacle of the Deeps'), b(
            'Ação Bônus: cria um tentáculo espectral a até 18 m por 1 minuto. Ao criá-lo, e como Ação Bônus nos turnos seguintes, pode movê-lo até 9 m e fazer um ataque corpo a corpo com magia contra uma criatura a até 3 m dele: 1d8 de dano de frio (2d8 no nível 10) e o deslocamento dela cai 3 m até o início do seu próximo turno. Usos iguais ao bônus de proficiência por Descanso Longo.',
            'Bonus Action: create a spectral tentacle within 60 feet for 1 minute. When you create it, and as a Bonus Action on later turns, you can move it up to 30 feet and make a melee spell attack against a creature within 10 feet of it: 1d8 Cold damage (2d8 at level 10) and its speed drops by 10 feet until the start of your next turn. Uses equal to your proficiency bonus per Long Rest.')),
          f('giftOfTheSea', b('Dádiva do Mar', 'Gift of the Sea'), b(
            "Característica de Profundezas de 1º nível\n\nVocê ganha um deslocamento de natação de 12 metros e pode respirar debaixo d'água.",
            "1st-level Fathomless feature\n\nYou gain a swimming speed of 40 feet, and you can breathe underwater.")),
        ],
        autoSpells: ['createOrDestroyWater', 'thunderwave', 'gustOfWind', 'silence'],
      },
      5: { autoSpells: ['lightningBolt', 'sleetStorm'] },
      6: {
        features: [
          f('oceanicSoul', b('Alma Oceânica', 'Oceanic Soul'), b(
            "Característica de 6º nível das Profundezas\n\nVocê agora se sente ainda mais em casa nas profundezas. Você ganha resistência a dano de frio. Além disso, quando estiver totalmente submerso, qualquer criatura que também estiver totalmente submersa pode entender sua fala, e você pode entender a dela.",
            "6th-level Fathomless feature\n\nYou are now even more at home in the depths. You gain resistance to cold damage. In addition, when you are fully submerged, any creature that is also fully submerged can understand your speech, and you can understand theirs.")),
          f('guardianCoil', b('Espiral Guardiã', 'Guardian Coil'), b(
            "Característica de 6º nível das Profundezas\n\nSeu Tentáculo das Profundezas pode defender você e outros, interpondo-se entre eles e o perigo. Quando você ou uma criatura que você possa ver sofrer dano enquanto estiver a até 3 metros do tentáculo, você pode usar sua reação para escolher uma dessas criaturas e reduzir o dano a essa criatura em 1d8. Quando você atingir o 10º nível nesta classe, o dano reduzido pelo tentáculo aumenta para 2d8.",
            "6th-level Fathomless feature\n\nYour Tentacle of the Deeps can defend you and others, interposing itself between them and harm. When you or a creature you can see takes damage while within 10 feet of the tentacle, you can use your reaction to choose one of those creatures and reduce the damage to that creature by 1d8. When you reach 10th level in this class, the damage reduced by the tentacle increases to 2d8.")),
        ],
      },
      7: { autoSpells: ['controlWater', 'summonElemental'] },
      9: { autoSpells: ['arcaneHand', 'coneOfCold'] },
      10: {
        features: [
          f('graspingTentacles', b('Tentáculos Agarradores', 'Grasping Tentacles'), b(
            'Você sempre tem Tentáculos Negros de Evard preparada e pode conjurá-la 1×/Descanso Longo sem gastar espaço. Ao conjurá-la, ganha PV temporários iguais ao seu nível de bruxo, e dano não interrompe sua Concentração nessa magia.',
            'You always have Evard\'s Black Tentacles prepared and can cast it once per Long Rest without a spell slot. When you cast it, you gain Temporary Hit Points equal to your Warlock level, and damage can\'t break your Concentration on it.')),
        ],
        autoSpells: ['blackTentacles'],
      },
      14: {
        features: [
          f('fathomlessPlunge', b('Mergulho Insondável', 'Fathomless Plunge'), b(
            "Característica de 14º nível das Profundezas\n\nVocê pode abrir magicamente condutos temporários para destinos aquáticos. Como uma ação, você pode se teletransportar e a até cinco outras criaturas voluntárias que você possa ver a até 9 metros de você. Em meio a um turbilhão de tentáculos, todos vocês desaparecem e reaparecem a até 1,5 quilômetro de distância em um corpo de água que você já tenha visto (do tamanho de um lago ou maior) ou a até 9 metros dele, cada um de vocês aparecendo em um espaço desocupado a até 9 metros dos outros.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um descanso curto ou longo.",
            "14th-level Fathomless feature\n\nYou can magically open temporary conduits to watery destinations. As an action, you can teleport yourself and up to five other willing creatures that you can see within 30 feet of you. Amid a whirl of tentacles, you all vanish and then reappear up to 1 mile away in a body of water you’ve seen (pond size or larger) or within 30 feet of it, each of you appearing in an unoccupied space within 30 feet of the others.\n\nOnce you use this feature, you can’t use it again until you finish a short or long rest.")),
        ],
      },
    },
  },

  genie: {
    name: b('O Gênio', 'The Genie'),
    source: 'TCE',
    desc: b('Pacto com um nobre gênio (dao, djinni, efreeti ou marid), que concede um recipiente mágico e poderes do elemento do patrono.', 'A pact with a noble genie (dao, djinni, efreeti, or marid) that grants a magic vessel and powers of your patron\'s element.'),
    levels: {
      3: {
        features: [
          spellsFeature('genieSpells', 'do Gênio', 'Genie',
            '3 — Detectar o Bem e o Mal, Força Fantasmagórica (+ 1º e 2º círculos do tipo); 5 — Criar Comida e Água (+ 3º); 7 — Assassino Fantasmagórico (+ 4º); 9 — Criação (+ 5º). Desejo pode ser escolhido como Arcana Mística de 9º círculo.',
            '3 — Detect Evil and Good, Phantasmal Force (+ the kind\'s 1st and 2nd level spells); 5 — Create Food and Water (+ 3rd); 7 — Phantasmal Killer (+ 4th); 9 — Creation (+ 5th). Wish can be chosen as your level 9 Mystic Arcanum.'),
          f('geniesVessel', b('Recipiente do Gênio', "Genie's Vessel"), b(
            'Escolha o tipo de gênio do seu patrono (dao, djinni, efreeti ou marid). Você recebe um objeto Minúsculo (lâmpada, anel, garrafa…) que serve de foco; CA igual à sua CD de magia e PV iguais ao nível de bruxo + bônus de proficiência. Refúgio Engarrafado: como ação, entra no recipiente (um espaço extradimensional confortável) por até o dobro do bônus de proficiência em horas; 1×/Descanso Longo. Ira do Gênio: 1×/turno, ao acertar um ataque, causa dano extra igual ao bônus de proficiência do tipo do seu gênio.',
            'Choose your patron\'s genie kind (dao, djinni, efreeti, or marid). You gain a Tiny object (lamp, ring, bottle…) that is your focus; AC equals your spell save DC and HP equals your Warlock level + proficiency bonus. Bottled Respite: as an action, enter the vessel (a comfortable extradimensional space) for up to twice your proficiency bonus in hours; once per Long Rest. Genie\'s Wrath: once per turn when you hit with an attack, deal extra damage of your genie\'s type equal to your proficiency bonus.')),
        ],
        autoSpells: ['detectEvilAndGood', 'phantasmalForce'],
      },
      5: { autoSpells: ['createFoodAndWater'] },
      6: {
        features: [
          f('elementalGift', b('Dádiva Elemental', 'Elemental Gift'), b(
            "Você começa a assumir características do tipo do seu patrono. Agora você tem resistência a um tipo de dano determinado pelo tipo do seu patrono: contundente (dao), trovejante (djinni), fogo (efreeti) ou frio (marid).\n\nAlém disso, com uma ação bônus, você pode conceder a si mesmo um deslocamento de voo de 9 metros que dura por 10 minutos, durante o qual você pode planar. Você pode usar esta ação bônus um número de vezes igual ao seu bônus de proficiência e recupera todos os usos gastos ao terminar um descanso longo.",
            "You begin to take on characteristics of your patron’s kind. You now have resistance to a damage type determined by your patron’s kind: bludgeoning (dao), thunder (djinni), fire (efreeti), or cold (marid).\n\nIn addition, as a bonus action, you can give yourself a flying speed of 30 feet that lasts for 10 minutes, during which you can hover. You can use this bonus action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.")),
        ],
      },
      7: { autoSpells: ['phantasmalKiller'] },
      9: { autoSpells: ['creation'] },
      10: {
        features: [
          f('sanctuaryVessel', b('Recipiente Santuário', 'Sanctuary Vessel'), b(
            'Ao entrar no recipiente, você pode levar até cinco criaturas voluntárias a até 9 m. Quem passar 10 minutos lá dentro ganha o benefício de um Descanso Curto e soma seu bônus de proficiência aos PV recuperados com Dados de Vida nesse descanso.',
            'When you enter your vessel, you can bring up to five willing creatures within 30 feet. Anyone who spends 10 minutes inside gains the benefit of a Short Rest and adds your proficiency bonus to HP regained from Hit Dice during it.')),
        ],
      },
      14: {
        features: [
          f('limitedWish', b('Desejo Limitado', 'Limited Wish'), b(
            'Ação: peça ao seu patrono o efeito de qualquer magia de até 6º círculo, de qualquer lista, cujo tempo de conjuração seja 1 ação; você a produz sem componentes. Depois disso, só pode usar de novo após 1d4 Descansos Longos.',
            'Action: ask your patron for the effect of any spell of level 6 or lower, from any class list, with a casting time of 1 action; you produce it without components. Afterward, you can\'t use this again until you finish 1d4 Long Rests.')),
        ],
      },
    },
  },

  undead: {
    name: b('O Morto-Vivo', 'The Undead'),
    source: 'VRGR',
    desc: b('Pacto com um ser que existe além da morte (um lich, um vampiro ancestral, um cavaleiro da morte), que concede uma forma apavorante.', 'A pact with a being that exists beyond death (a lich, an ancient vampire, a death knight) that grants a dreadful form.'),
    levels: {
      3: {
        features: [
          f("undeadSpells", b("Magias do Morto-Vivo", "Undead Spells"), b("O Morto-Vivo permite que você escolha em uma lista expandida de magias quando aprende uma magia de bruxo. As seguintes magias são adicionadas à lista de magias de bruxo para você.\n\nMagias Expandidas do Morto-Vivo\n\nCírculo de Magia | Magias\n1º | Perdição, Vitalidade Falsa\n2º | Cegueira/Surdez, Força Fantasmagórica\n3º | Corcel Fantasma, Falar com os Mortos\n4º | Proteção contra a Morte, Invisibilidade Maior\n5º | Cúpula Antivida, Névoa Mortal", "The Undead lets you choose from an expanded list of spells when you learn a warlock spell. The following spells are added to the warlock spell list for you.\n\nUndead Expanded Spells\n\nSpell Level | Spells\n1st | Bane, False Life\n2nd | Blindness/Deafness, Phantasmal Force\n3rd | Phantom Steed, Speak with Dead\n4th | Death Ward, Greater Invisibility\n5th | Antilife Shell, Cloudkill")),
          f('formOfDread', b('Forma do Pavor', 'Form of Dread'), b(
            'Ação Bônus: assume uma forma apavorante por 1 minuto. Nela você ganha 1d10 + nível de bruxo PV temporários, é imune a Amedrontado e, 1×/turno ao acertar um ataque, pode forçar o alvo a uma salvaguarda de Sabedoria ou ficar Amedrontado de você até o fim do seu próximo turno. Usos iguais ao bônus de proficiência por Descanso Longo.',
            'Bonus Action: take on a dreadful form for 1 minute. In it you gain 1d10 + Warlock level Temporary HP, are immune to Frightened, and once per turn when you hit with an attack you can force the target to make a Wisdom save or be Frightened of you until the end of your next turn. Uses equal to your proficiency bonus per Long Rest.')),
        ],
        autoSpells: ['bane', 'falseLife', 'blindnessDeafness', 'phantasmalForce'],
      },
      5: { autoSpells: ['phantomSteed', 'speakWithDead'] },
      6: {
        features: [
          f('graveTouched', b('Tocado pela Cova', 'Grave Touched'), b(
            "Característica de 6º nível do Insepulto\n\nOs poderes do seu patrono têm um efeito profundo em seu corpo e em sua magia. Você não precisa comer, beber ou respirar.\n\nAlém disso, uma vez durante cada um dos seus turnos, quando acertar uma criatura com uma jogada de ataque e rolar dano contra ela, você pode substituir o tipo de dano por dano necrótico. Enquanto estiver usando sua Forma de Pavor, você pode rolar um dado de dano adicional ao determinar o dano necrótico que o alvo sofre.",
            "6th-level Undead feature\n\nYour patron’s powers have a profound effect on your body and magic. You don’t need to eat, drink, or breathe.\n\nIn addition, once during each of your turns, when you hit a creature with an attack roll and roll damage against the creature, you can replace the damage type with necrotic damage. While you are using your Form of Dread, you can roll one additional damage die when determining the necrotic damage the target takes.")),
        ],
      },
      7: { autoSpells: ['deathWard', 'greaterInvisibility'] },
      9: { autoSpells: ['antilifeShell', 'cloudkill'] },
      10: {
        features: [
          f('necroticHusk', b('Casca Necrótica', 'Necrotic Husk'), b(
            'Você tem Resistência a dano necrótico (Imunidade na Forma do Pavor). Quando cai a 0 PV (sem morrer de imediato), pode ficar com 1 PV; cada criatura à sua escolha a até 9 m sofre 2d10 + nível de bruxo de dano necrótico, e você ganha 1 nível de Exaustão. Depois disso, só pode usar de novo após 1d4 Descansos Longos.',
            'You have Resistance to Necrotic damage (Immunity in Form of Dread). When you drop to 0 HP (and aren\'t killed outright), you can drop to 1 HP instead; each creature of your choice within 30 feet takes 2d10 + Warlock level Necrotic damage, and you gain 1 level of Exhaustion. Afterward, you can\'t use this again until you finish 1d4 Long Rests.')),
        ],
      },
      14: {
        features: [
          f('spiritProjection', b('Projeção Espiritual', 'Spirit Projection'), b(
            'Ação: projeta seu espírito por até 1 hora (Concentração), deixando o corpo inconsciente. O espírito tem suas estatísticas, resistência a dano de concussão, perfuração e corte, voa (pairando) com seu deslocamento, atravessa criaturas e objetos como terreno difícil e conjura magias de Necromancia e Conjuração sem componentes Verbais, Somáticos ou Materiais sem custo. Na Forma do Pavor, cura metade do dano necrótico que causar. 1×/Descanso Longo.',
            'Action: project your spirit for up to 1 hour (Concentration), leaving your body unconscious. The spirit has your statistics, resistance to bludgeoning, piercing, and slashing damage, flies (hovering) at your speed, moves through creatures and objects as difficult terrain, and casts Necromancy and Conjuration spells without Verbal, Somatic, or costless Material components. In Form of Dread, it heals for half the necrotic damage it deals. Once per Long Rest.')),
        ],
      },
    },
  },
};

// === Recursos com usos (espaços do Pacto ficam de fora: controle próprio na ficha) ===
const ONE = { fixed: 1 };
const PB = { profBonus: true };
const CHA = { ability: 'cha', min: 1 };
const res = (id, pt, en, uses, recharge, minLevel, extra = {}) => ({ id, name: b(pt, en), uses, recharge, minLevel, ...extra });
// Traço de subclasse que em 2014 vem no nível 1 e em 2024 no 3: um recurso por versão.
const early = (id, pt, en, uses, recharge, subclass, extra = {}) => [
  res(id, pt, en, uses, recharge, 3, { subclass: [subclass], rules: '2024', ...extra }),
  res(`${id}2014`, pt, en, uses, recharge, 1, { subclass: [subclass], rules: '2014', ...extra }),
];
// Luz Curativa: reserva de d6 igual a 1 + nível de bruxo.
const onePlusLevel = { byLevel: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, i + 2])) };

const resources = [
  // Classe base
  res('magicalCunning', 'Astúcia Mágica', 'Magical Cunning', ONE, 'long', 2, { rules: '2024',
    desc: b('Rito de 1 min: recupera espaços do Pacto até metade do máximo (todos no nível 20).', '1-minute rite: regain Pact slots up to half your maximum (all at level 20).') }),
  res('eldritchMaster', 'Mestre Místico', 'Eldritch Master', ONE, 'long', 20, { rules: '2014',
    desc: b('1 min de súplica ao patrono: recupera todos os espaços do Pacto.', '1 minute entreating your patron: regain all Pact slots.') }),
  res('contactPatron', 'Contatar Patrono', 'Contact Patron', ONE, 'long', 9, { rules: '2024',
    desc: b('Contatar Outro Plano sem espaço, com sucesso automático na salvaguarda.', 'Contact Other Plane without a slot, auto-succeeding on its save.') }),
  ...[6, 7, 8, 9].map((lv, i) => res(`mysticArcanum${lv}`, `Arcana Mística (${lv}º círculo)`, `Mystic Arcanum (level ${lv})`, ONE, 'long', 11 + i * 2,
    { desc: b('Conjura a magia de arcano deste círculo sem espaço.', 'Cast your arcanum spell of this level without a slot.') })),

  // Patrono Ínfero
  res('darkOnesOwnLuck', 'Sorte do Próprio Sombrio', "Dark One's Own Luck", CHA, 'long', 6, { subclass: ['fiend'], rules: '2024', die: { byLevel: { 1: 'd10' } } }),
  res('darkOnesOwnLuck2014', 'Sorte do Próprio Sombrio', "Dark One's Own Luck", ONE, 'short', 6, { subclass: ['fiend'], rules: '2014', die: { byLevel: { 1: 'd10' } } }),
  res('hurlThroughHell', 'Arremessar pelo Inferno', 'Hurl Through Hell', ONE, 'long', 14, { subclass: ['fiend'],
    desc: b('2024: pode recuperar gastando um espaço do Pacto.', '2024: can be restored by expending a Pact slot.') }),
  // Arquifada
  res('stepsOfTheFey', 'Passos Feéricos', 'Steps of the Fey', CHA, 'long', 3, { subclass: ['archfey'], rules: '2024',
    desc: b('Passo Nebuloso sem espaço.', 'Misty Step without a slot.') }),
  res('beguilingDefenses', 'Defesas Sedutoras', 'Beguiling Defenses', ONE, 'long', 10, { subclass: ['archfey'], rules: '2024',
    desc: b('Pode recuperar gastando um espaço do Pacto.', 'Can be restored by expending a Pact slot.') }),
  res('feyPresence', 'Presença Feérica', 'Fey Presence', ONE, 'short', 1, { subclass: ['archfey'], rules: '2014' }),
  res('mistyEscape2014', 'Fuga Nebulosa', 'Misty Escape', ONE, 'short', 6, { subclass: ['archfey'], rules: '2014' }),
  res('darkDelirium', 'Delírio Sombrio', 'Dark Delirium', ONE, 'short', 14, { subclass: ['archfey'], rules: '2014' }),
  // Grande Antigo
  res('clairvoyantCombatant', 'Combatente Clarividente', 'Clairvoyant Combatant', ONE, 'short', 6, { subclass: ['greatoldone'], rules: '2024',
    desc: b('Pode recuperar gastando um espaço do Pacto.', 'Can be restored by expending a Pact slot.') }),
  res('entropicWard', 'Barreira Entrópica', 'Entropic Ward', ONE, 'short', 6, { subclass: ['greatoldone'], rules: '2014' }),
  // Celestial (XGE em 2014: Luz Curativa no nível 1)
  ...early('healingLight', 'Luz Curativa', 'Healing Light', onePlusLevel, 'long', 'celestial', { die: { byLevel: { 1: 'd6' } },
    desc: b('Reserva de d6 (1 + nível de bruxo); gasta até mod. de CAR por cura.', 'Pool of d6s (1 + Warlock level); spend up to CHA mod per heal.') }),
  res('searingVengeance', 'Vingança Abrasadora', 'Searing Vengeance', ONE, 'long', 14, { subclass: ['celestial'] }),
  // Lâmina Maldita
  ...early('hexbladesCurse', 'Maldição da Lâmina', "Hexblade's Curse", ONE, 'short', 'hexblade'),
  res('accursedSpecter', 'Espectro Amaldiçoado', 'Accursed Specter', ONE, 'long', 6, { subclass: ['hexblade'] }),
  // Imortal
  res('defyDeath', 'Desafiar a Morte', 'Defy Death', ONE, 'long', 6, { subclass: ['undying'] }),
  res('indestructibleLife', 'Vida Indestrutível', 'Indestructible Life', ONE, 'short', 14, { subclass: ['undying'] }),
  // Insondável
  ...early('tentacleOfTheDeeps', 'Tentáculo das Profundezas', 'Tentacle of the Deeps', PB, 'long', 'fathomless', { die: { byLevel: { 1: 'd8', 10: '2d8' } } }),
  res('graspingTentacles', 'Tentáculos Agarradores', 'Grasping Tentacles', ONE, 'long', 10, { subclass: ['fathomless'] }),
  res('fathomlessPlunge', 'Mergulho Insondável', 'Fathomless Plunge', ONE, 'short', 14, { subclass: ['fathomless'] }),
  // Gênio
  ...early('bottledRespite', 'Refúgio Engarrafado', 'Bottled Respite', ONE, 'long', 'genie'),
  res('elementalGiftFlight', 'Dádiva Elemental (voo)', 'Elemental Gift (flight)', PB, 'long', 6, { subclass: ['genie'] }),
  res('limitedWish', 'Desejo Limitado', 'Limited Wish', ONE, 'long', 14, { subclass: ['genie'],
    desc: b('Volta só após 1d4 descansos longos.', 'Returns only after 1d4 long rests.') }),
  // Morto-Vivo
  ...early('formOfDread', 'Forma do Pavor', 'Form of Dread', PB, 'long', 'undead'),
  res('necroticHusk', 'Casca Necrótica', 'Necrotic Husk', ONE, 'long', 10, { subclass: ['undead'],
    desc: b('Volta só após 1d4 descansos longos.', 'Returns only after 1d4 long rests.') }),
  res('spiritProjection', 'Projeção Espiritual', 'Spirit Projection', ONE, 'long', 14, { subclass: ['undead'] }),
];

// Invocações / Dádivas com usos próprios (o recurso existe enquanto a opção estiver escolhida).
const OPTION_RESOURCES = {
  giftOfTheDepths: ['long', ONE], giftOfTheProtectors: ['long', ONE], giftOfTheProtectors2014: ['long', ONE],
  bewitchingWhispers: ['long', ONE], dreadfulWord: ['long', ONE], minionsOfChaos: ['long', ONE], mireTheMind: ['long', ONE],
  sculptorOfFlesh: ['long', ONE], signOfIllOmen: ['long', ONE], thiefOfFiveFates: ['long', ONE],
  cloakOfFlies: ['short', ONE], ghostlyGaze: ['short', ONE], tombOfLevistus: ['short', ONE], tricksterEscape: ['long', ONE],
  undyingServitude: ['long', ONE], bondOfTheTalisman: ['long', PB], protectionOfTheTalisman: ['long', PB], pactOfTheTalisman: ['long', PB],
};
for (const o of [...invocations2024, ...invocations2014, ...pactBoons2014]) {
  const r = OPTION_RESOURCES[o.id];
  if (r) o.resource = { uses: r[1], recharge: r[0] };
}

export default {
  classId: 'warlock',
  resources,
  pools: {
    invocation: {
      name: b('Invocações Místicas', 'Eldritch Invocations'),
      swapOnLevelUp: 1,
      options: [...invocations2024, ...invocations2014],
    },
    pactBoon: {
      name: b('Dádiva do Pacto', 'Pact Boon'),
      options: pactBoons2014,
    },
    genieKind: {
      name: b('Tipo de Gênio', 'Genie Kind'),
      options: genieKinds,
    },
    // Pools dinâmicos por último (não têm lista fixa de opções).
    tomeCantrip: {
      name: b('Truques do Livro das Sombras', 'Book of Shadows Cantrips'),
      kind: 'spell', filter: { level: 0 }, grantAs: 'cantrip', freeSwap: true,
    },
    tomeRitual: {
      name: b('Rituais do Livro das Sombras', 'Book of Shadows Rituals'),
      kind: 'spell', filter: { level: 1, ritual: true }, grantAs: 'spell', freeSwap: true,
    },
    mysticArcanum6: arcanum(6),
    mysticArcanum7: arcanum(7),
    mysticArcanum8: arcanum(8),
    mysticArcanum9: arcanum(9),
  },
  // Tabela do Bruxo (SRD 5.2.1): invocações 1, 3, 3, 3, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10.
  choices: {
    1: { invocation: 1 }, 2: { invocation: 2 }, 5: { invocation: 2 }, 7: { invocation: 1 },
    9: { invocation: 1 }, 11: { mysticArcanum6: 1 }, 12: { invocation: 1 }, 13: { mysticArcanum7: 1 },
    15: { invocation: 1, mysticArcanum8: 1 }, 17: { mysticArcanum9: 1 }, 18: { invocation: 1 },
  },
  // PHB 2014: invocações 0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8; Dádiva do Pacto no 3.
  legacyChoices: {
    2: { invocation: 2 }, 3: { pactBoon: 1 }, 5: { invocation: 1 }, 7: { invocation: 1 },
    9: { invocation: 1 }, 11: { mysticArcanum6: 1 }, 12: { invocation: 1 }, 13: { mysticArcanum7: 1 },
    15: { invocation: 1, mysticArcanum8: 1 }, 17: { mysticArcanum9: 1 }, 18: { invocation: 1 },
  },
  // Tipo de gênio: no 3 em 2024 (subclasse no 3); no 1 em fichas 2014.
  subclassChoices: { genie: { 3: { genieKind: 1 } } },
  legacySubclassChoices: { genie: { 1: { genieKind: 1 } } },
  features,
  // Contatar Patrono: Contatar Outro Plano sempre preparada.
  classLevels: { 9: { autoSpells: ['contactOtherPlane'] } },
  subclasses,
};
