// Bruxo — traços 2024, Invocações Místicas, Dádiva do Pacto (2014), Arcana
// Mística e subclasses. Formato em README.md.
// Classe base, invocações 2024 e Patrono Ínfero: resumo do SRD 5.2.1 (CC-BY 4.0).
// Demais subclasses e opções de suplemento: resumos originais (nomes, níveis e números apenas).
const b = (pt, en) => ({ pt, en });
const f = (id, name, desc) => ({ id, name, desc });

const DAMAGE_CANTRIP = b('um truque de bruxo que causa dano', 'a Warlock cantrip that deals damage');
const WHICH_CANTRIP = b('Qual truque?', 'Which cantrip?');
const ELDRITCH_BLAST = b('truque Rajada Mística', 'Eldritch Blast cantrip');
const HEX_OR_CURSE = b('magia Bruxaria ou um traço de bruxo que amaldiçoa (ex.: Maldição da Lâmina)', 'the Hex spell or a Warlock feature that curses (e.g., Hexblade\'s Curse)');

// === Invocações Místicas 2024 (SRD 5.2.1) ===
// `rules: '2024'` marca as que têm versão diferente nas regras de 2014 (ver abaixo).
// Sem `rules`: texto igual nas duas versões.
const invocations2024 = [
  { id: 'agonizingBlast', name: b('Rajada Agonizante', 'Agonizing Blast'), source: 'SRD', rules: '2024',
    desc: b('Some o modificador de Carisma ao dano de um truque de bruxo que causa dano. Repetível: escolha um truque diferente a cada vez.', 'Add your Charisma modifier to the damage rolls of one damaging Warlock cantrip. Repeatable: choose a different cantrip each time.'),
    prereq: { level: 2, text: DAMAGE_CANTRIP }, repeatable: true, detail: WHICH_CANTRIP },
  { id: 'armorOfShadows', name: b('Armadura das Sombras', 'Armor of Shadows'), source: 'SRD',
    desc: b('Conjure Armadura Arcana em si mesmo sem gastar espaço de magia.', 'Cast Mage Armor on yourself without expending a spell slot.'),
    grants: { spells: ['mageArmor'] } },
  { id: 'ascendantStep', name: b('Passo Ascendente', 'Ascendant Step'), source: 'SRD', rules: '2024',
    desc: b('Conjure Levitação em si mesmo sem gastar espaço de magia.', 'Cast Levitate on yourself without expending a spell slot.'),
    prereq: { level: 5 }, grants: { spells: ['levitate'] } },
  { id: 'devilsSight', name: b('Visão Diabólica', "Devil's Sight"), source: 'SRD',
    desc: b('Enxerga normalmente na penumbra e na escuridão, mágica ou não, até 36 m (120 pés).', 'See normally in dim light and darkness, magical or not, within 120 feet.'),
    prereq: { level: 2 } },
  { id: 'devouringBlade', name: b('Lâmina Devoradora', 'Devouring Blade'), source: 'SRD', rules: '2024',
    desc: b('O Ataque Extra da Lâmina Sedenta passa a conceder dois ataques extras.', 'Thirsting Blade grants two extra attacks instead of one.'),
    prereq: { level: 12, options: ['thirstingBlade'] } },
  { id: 'eldritchMind', name: b('Mente Mística', 'Eldritch Mind'), source: 'SRD',
    desc: b('Vantagem em salvaguardas de Constituição para manter Concentração.', 'Advantage on Constitution saves to maintain Concentration.') },
  { id: 'eldritchSmite', name: b('Golpe Místico', 'Eldritch Smite'), source: 'SRD',
    desc: b('1×/turno ao acertar com a arma do pacto: gaste um espaço do Pacto para +1d8 de dano de Força, +1d8 por nível do espaço, e derrube o alvo (Enorme ou menor).', 'Once per turn on a pact weapon hit: spend a Pact Magic slot for +1d8 Force damage plus 1d8 per slot level, and knock the target Prone (Huge or smaller).'),
    prereq: { level: 5, options: ['pactOfTheBlade'] } },
  { id: 'eldritchSpear', name: b('Lança Mística', 'Eldritch Spear'), source: 'SRD', rules: '2024',
    desc: b('Um truque de bruxo que causa dano (alcance 3 m+) ganha +9 m de alcance por nível de bruxo (30 pés por nível). Repetível: truque diferente a cada vez.', 'One damaging Warlock cantrip with 10+ ft range gains 30 ft of range per Warlock level. Repeatable: a different cantrip each time.'),
    prereq: { level: 2, text: b('um truque de bruxo que causa dano e tem alcance de 3 m+', 'a damaging Warlock cantrip with a range of 10+ feet') }, repeatable: true, detail: WHICH_CANTRIP },
  { id: 'fiendishVigor', name: b('Vigor Demoníaco', 'Fiendish Vigor'), source: 'SRD', rules: '2024',
    desc: b('Conjure Vitalidade Falsa em si mesmo sem gastar espaço; os PV temporários usam o valor máximo do dado.', 'Cast False Life on yourself without a slot; the temporary HP die is maximized.'),
    prereq: { level: 2 }, grants: { spells: ['falseLife'] } },
  { id: 'gazeOfTwoMinds', name: b('Olhar de Duas Mentes', 'Gaze of Two Minds'), source: 'SRD', rules: '2024',
    desc: b('Ação bônus: toque uma criatura voluntária e perceba pelos sentidos dela; pode conjurar magias a partir do espaço dela (até 18 m).', 'Bonus Action: touch a willing creature to perceive through its senses; you can cast spells from its space (within 60 ft).'),
    prereq: { level: 5 } },
  { id: 'giftOfTheDepths', name: b('Dádiva das Profundezas', 'Gift of the Depths'), source: 'SRD',
    desc: b('Respira debaixo d\'água e ganha deslocamento de natação igual ao seu. Respirar na Água 1×/descanso longo sem espaço.', 'Breathe underwater and gain a Swim Speed equal to your Speed. Water Breathing once per Long Rest without a slot.'),
    prereq: { level: 5 }, grants: { spells: ['waterBreathing'] } },
  { id: 'giftOfTheProtectors', name: b('Dádiva dos Protetores', 'Gift of the Protectors'), source: 'SRD', rules: '2024',
    desc: b('Criaturas escritas no Livro das Sombras (até mod. de CAR) caem a 1 PV em vez de 0; 1×/descanso longo.', 'Creatures named in your Book of Shadows (up to CHA mod) drop to 1 HP instead of 0; once per Long Rest.'),
    prereq: { level: 9, options: ['pactOfTheTome'] } },
  { id: 'investmentOfTheChainMaster', name: b('Investimento do Mestre da Corrente', 'Investment of the Chain Master'), source: 'SRD', rules: '2024',
    desc: b('O familiar ganha voo ou natação 12 m, ataca com sua ação bônus, pode causar dano necrótico/radiante, usa sua CD e recebe resistência por reação.', 'Your familiar gains 40 ft fly or swim, attacks on your Bonus Action, may deal necrotic/radiant damage, uses your save DC, and can gain resistance via your Reaction.'),
    prereq: { level: 5, options: ['pactOfTheChain'] } },
  { id: 'lessonsOfTheFirstOnes', name: b('Lições dos Primordiais', 'Lessons of the First Ones'), source: 'SRD', rules: '2024',
    desc: b('Ganhe um talento de Origem à sua escolha. Repetível: talento diferente a cada vez.', 'Gain one Origin feat of your choice. Repeatable: a different feat each time.'),
    prereq: { level: 2 }, repeatable: true, detail: b('Qual talento de Origem?', 'Which Origin feat?') },
  { id: 'lifedrinker', name: b('Bebedor de Vida', 'Lifedrinker'), source: 'SRD', rules: '2024',
    desc: b('1×/turno ao acertar com a arma do pacto: +1d6 de dano necrótico, psíquico ou radiante; pode gastar um Dado de Vida para se curar.', 'Once per turn on a pact weapon hit: +1d6 necrotic, psychic, or radiant damage; you may spend a Hit Die to heal.'),
    prereq: { level: 9, options: ['pactOfTheBlade'] } },
  { id: 'maskOfManyFaces', name: b('Máscara de Muitas Faces', 'Mask of Many Faces'), source: 'SRD',
    desc: b('Conjure Disfarçar-se sem gastar espaço de magia.', 'Cast Disguise Self without expending a spell slot.'),
    prereq: { level: 2 }, grants: { spells: ['disguiseSelf'] } },
  { id: 'masterOfMyriadForms', name: b('Mestre das Miríades de Formas', 'Master of Myriad Forms'), source: 'SRD', rules: '2024',
    desc: b('Conjure Alterar-se sem gastar espaço de magia.', 'Cast Alter Self without expending a spell slot.'),
    prereq: { level: 5 }, grants: { spells: ['alterSelf'] } },
  { id: 'mistyVisions', name: b('Visões Nebulosas', 'Misty Visions'), source: 'SRD',
    desc: b('Conjure Imagem Silenciosa sem gastar espaço de magia.', 'Cast Silent Image without expending a spell slot.'),
    prereq: { level: 2 }, grants: { spells: ['silentImage'] } },
  { id: 'oneWithShadows', name: b('Um com as Sombras', 'One with Shadows'), source: 'SRD', rules: '2024',
    desc: b('Na penumbra ou escuridão, conjure Invisibilidade em si mesmo sem gastar espaço.', 'In dim light or darkness, cast Invisibility on yourself without a slot.'),
    prereq: { level: 5 }, grants: { spells: ['invisibility'] } },
  { id: 'otherworldlyLeap', name: b('Salto Transcendental', 'Otherworldly Leap'), source: 'SRD', rules: '2024',
    desc: b('Conjure Salto em si mesmo sem gastar espaço de magia.', 'Cast Jump on yourself without expending a spell slot.'),
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
    desc: b('Ao acertar um truque de bruxo com ataque, empurre a criatura (Grande ou menor) até 3 m. Repetível: truque diferente a cada vez.', 'When you hit with an attack-roll Warlock cantrip, push a Large or smaller creature up to 10 ft. Repeatable: a different cantrip each time.'),
    prereq: { level: 2, text: b('um truque de bruxo com jogada de ataque que causa dano', 'a damaging Warlock cantrip with an attack roll') }, repeatable: true, detail: WHICH_CANTRIP },
  { id: 'thirstingBlade', name: b('Lâmina Sedenta', 'Thirsting Blade'), source: 'SRD',
    desc: b('Ataque Extra com a arma do pacto: dois ataques na ação de Ataque.', 'Extra Attack with your pact weapon: attack twice with the Attack action.'),
    prereq: { level: 5, options: ['pactOfTheBlade'] } },
  { id: 'visionsOfDistantRealms', name: b('Visões de Reinos Distantes', 'Visions of Distant Realms'), source: 'SRD', rules: '2024',
    desc: b('Conjure Olho Arcano sem gastar espaço de magia.', 'Cast Arcane Eye without expending a spell slot.'),
    prereq: { level: 9 }, grants: { spells: ['arcaneEye'] } },
  { id: 'whispersOfTheGrave', name: b('Sussurros do Túmulo', 'Whispers of the Grave'), source: 'SRD', rules: '2024',
    desc: b('Conjure Falar com os Mortos sem gastar espaço de magia.', 'Cast Speak with Dead without expending a spell slot.'),
    prereq: { level: 7 }, grants: { spells: ['speakWithDead'] } },
  { id: 'witchSight', name: b('Visão da Bruxa', 'Witch Sight'), source: 'SRD', rules: '2024',
    desc: b('Visão verdadeira de 9 m (30 pés).', 'Truesight with a range of 30 feet.'),
    prereq: { level: 15 } },
];

// === Invocações 2014 (PHB/XGE/TCE) — só fichas de regras 2014 ===
// Versões 2014 das que foram reeditadas em 2024 usam o sufixo `2014` no id.
// Em 2014 nenhuma é repetível. Ids de magia do catálogo 2014 quando diferem (slowSpell, sendingSpell).
const L = (o) => ({ rules: '2014', ...o });
const invocations2014 = [
  // PHB 2014 — versões antigas das reeditadas
  L({ id: 'agonizingBlast2014', name: b('Rajada Agonizante', 'Agonizing Blast'), source: 'PHB',
    desc: b('Some o modificador de Carisma ao dano de cada raio da Rajada Mística.', 'Add your Charisma modifier to the damage of each Eldritch Blast beam.'),
    prereq: { text: ELDRITCH_BLAST } }),
  L({ id: 'ascendantStep2014', name: b('Passo Ascendente', 'Ascendant Step'), source: 'PHB',
    desc: b('Conjure Levitação em si mesmo à vontade, sem espaço nem componentes materiais.', 'Cast Levitate on yourself at will, without a slot or material components.'),
    prereq: { level: 9 }, grants: { spells: ['levitate'] } }),
  L({ id: 'eldritchSpear2014', name: b('Lança Mística', 'Eldritch Spear'), source: 'PHB',
    desc: b('O alcance da Rajada Mística passa a 90 m (300 pés).', 'Eldritch Blast\'s range becomes 300 feet.'),
    prereq: { text: ELDRITCH_BLAST } }),
  L({ id: 'fiendishVigor2014', name: b('Vigor Demoníaco', 'Fiendish Vigor'), source: 'PHB',
    desc: b('Conjure Vitalidade Falsa em si mesmo à vontade como magia de 1º círculo, sem espaço nem componentes materiais.', 'Cast False Life on yourself at will as a 1st-level spell, without a slot or material components.'),
    grants: { spells: ['falseLife'] } }),
  L({ id: 'gazeOfTwoMinds2014', name: b('Olhar de Duas Mentes', 'Gaze of Two Minds'), source: 'PHB',
    desc: b('Ação: toque um humanoide voluntário e use os sentidos dele até o fim do seu próximo turno (pode manter com uma ação a cada turno); fica cego e surdo para o próprio corpo nesse tempo.', 'Action: touch a willing humanoid and use its senses until the end of your next turn (extend with an action each turn); you are blind and deaf to your own surroundings meanwhile.') }),
  L({ id: 'lifedrinker2014', name: b('Bebedor de Vida', 'Lifedrinker'), source: 'PHB',
    desc: b('Ao acertar com a arma do pacto, causa dano necrótico extra igual ao seu mod. de CAR (mín. 1).', 'When you hit with your pact weapon, deal extra necrotic damage equal to your CHA modifier (minimum 1).'),
    prereq: { level: 12, options: ['pactOfTheBlade'] } }),
  L({ id: 'masterOfMyriadForms2014', name: b('Mestre das Miríades de Formas', 'Master of Myriad Forms'), source: 'PHB',
    desc: b('Conjure Alterar-se à vontade, sem gastar espaço de magia.', 'Cast Alter Self at will, without expending a spell slot.'),
    prereq: { level: 15 }, grants: { spells: ['alterSelf'] } }),
  L({ id: 'oneWithShadows2014', name: b('Um com as Sombras', 'One with Shadows'), source: 'PHB',
    desc: b('Em penumbra ou escuridão, use uma ação para ficar invisível até se mover ou fazer uma ação ou reação.', 'In dim light or darkness, use an action to become invisible until you move or take an action or reaction.'),
    prereq: { level: 5 } }),
  L({ id: 'otherworldlyLeap2014', name: b('Salto Transcendental', 'Otherworldly Leap'), source: 'PHB',
    desc: b('Conjure Salto em si mesmo à vontade, sem espaço nem componentes materiais.', 'Cast Jump on yourself at will, without a slot or material components.'),
    prereq: { level: 9 }, grants: { spells: ['jump'] } }),
  L({ id: 'repellingBlast2014', name: b('Rajada Repulsora', 'Repelling Blast'), source: 'PHB',
    desc: b('Cada raio da Rajada Mística que acertar empurra a criatura até 3 m (10 pés) para longe de você.', 'Each Eldritch Blast beam that hits pushes the creature up to 10 feet away from you.'),
    prereq: { text: ELDRITCH_BLAST } }),
  L({ id: 'visionsOfDistantRealms2014', name: b('Visões de Reinos Distantes', 'Visions of Distant Realms'), source: 'PHB',
    desc: b('Conjure Olho Arcano à vontade, sem gastar espaço de magia.', 'Cast Arcane Eye at will, without expending a spell slot.'),
    prereq: { level: 15 }, grants: { spells: ['arcaneEye'] } }),
  L({ id: 'whispersOfTheGrave2014', name: b('Sussurros do Túmulo', 'Whispers of the Grave'), source: 'PHB',
    desc: b('Conjure Falar com os Mortos à vontade, sem gastar espaço de magia.', 'Cast Speak with Dead at will, without expending a spell slot.'),
    prereq: { level: 9 }, grants: { spells: ['speakWithDead'] } }),
  L({ id: 'witchSight2014', name: b('Visão da Bruxa', 'Witch Sight'), source: 'PHB',
    desc: b('Enxerga a forma verdadeira de metamorfos e criaturas ocultas por ilusão ou transmutação a até 9 m (30 pés), se estiverem na sua linha de visão.', 'See the true form of shapechangers and creatures concealed by illusion or transmutation magic within 30 feet and in line of sight.'),
    prereq: { level: 15 } }),
  // PHB 2014 — só legado
  L({ id: 'beastSpeech', name: b('Fala Bestial', 'Beast Speech'), source: 'PHB',
    desc: b('Conjure Falar com Animais à vontade, sem gastar espaço.', 'Cast Speak with Animals at will, without expending a spell slot.'),
    grants: { spells: ['speakWithAnimals'] } }),
  L({ id: 'beguilingInfluence', name: b('Influência Enganadora', 'Beguiling Influence'), source: 'PHB',
    desc: b('Proficiência em Enganação e Persuasão.', 'Proficiency in Deception and Persuasion.'),
    grants: { skills: ['deception', 'persuasion'] } }),
  L({ id: 'bewitchingWhispers', name: b('Sussurros Sedutores', 'Bewitching Whispers'), source: 'PHB',
    desc: b('Conjure Compulsão 1×/descanso longo usando um espaço do Pacto.', 'Cast Compulsion once per long rest using a Pact Magic slot.'),
    prereq: { level: 7 }, grants: { spells: ['compulsion'] } }),
  L({ id: 'bookOfAncientSecrets', name: b('Livro de Segredos Antigos', 'Book of Ancient Secrets'), source: 'PHB',
    desc: b('Anote 2 magias de 1º círculo com o marcador ritual, de qualquer lista, no Livro das Sombras; conjura-as só como ritual. Pode copiar outros rituais que encontrar (nível até metade do seu nível de bruxo, arredondado para cima).', 'Inscribe two 1st-level ritual spells from any class list in your Book of Shadows; cast them only as rituals. You can copy other rituals you find (spell level up to half your warlock level, rounded up).'),
    prereq: { options: ['pactOfTheTome'] }, choices: { tomeRitual: 2 } }),
  L({ id: 'chainsOfCarceri', name: b('Correntes de Carceri', 'Chains of Carceri'), source: 'PHB',
    desc: b('Conjure Imobilizar Monstro à vontade contra celestiais, infernais ou elementais, sem espaço; o mesmo alvo só uma vez por descanso longo.', 'Cast Hold Monster at will on a celestial, fiend, or elemental without a slot; each target only once per long rest.'),
    prereq: { level: 15, options: ['pactOfTheChain'] }, grants: { spells: ['holdMonster'] } }),
  L({ id: 'dreadfulWord', name: b('Palavra Terrível', 'Dreadful Word'), source: 'PHB',
    desc: b('Conjure Confusão 1×/descanso longo usando um espaço do Pacto.', 'Cast Confusion once per long rest using a Pact Magic slot.'),
    prereq: { level: 7 }, grants: { spells: ['confusion'] } }),
  L({ id: 'eldritchSight', name: b('Visão Mística', 'Eldritch Sight'), source: 'PHB',
    desc: b('Conjure Detectar Magia à vontade, sem gastar espaço.', 'Cast Detect Magic at will, without expending a spell slot.'),
    grants: { spells: ['detectMagic'] } }),
  L({ id: 'eyesOfTheRuneKeeper', name: b('Olhos do Guardião das Runas', 'Eyes of the Rune Keeper'), source: 'PHB',
    desc: b('Você consegue ler qualquer escrita.', 'You can read all writing.') }),
  L({ id: 'minionsOfChaos', name: b('Lacaios do Caos', 'Minions of Chaos'), source: 'PHB',
    desc: b('Conjure Conjurar Elemental 1×/descanso longo usando um espaço do Pacto.', 'Cast Conjure Elemental once per long rest using a Pact Magic slot.'),
    prereq: { level: 9 }, grants: { spells: ['conjureElemental'] } }),
  L({ id: 'mireTheMind', name: b('Lodo Mental', 'Mire the Mind'), source: 'PHB',
    desc: b('Conjure Lentidão 1×/descanso longo usando um espaço do Pacto.', 'Cast Slow once per long rest using a Pact Magic slot.'),
    prereq: { level: 5 }, grants: { spells: ['slowSpell'] } }),
  L({ id: 'sculptorOfFlesh', name: b('Escultor de Carne', 'Sculptor of Flesh'), source: 'PHB',
    desc: b('Conjure Metamorfose 1×/descanso longo usando um espaço do Pacto.', 'Cast Polymorph once per long rest using a Pact Magic slot.'),
    prereq: { level: 7 }, grants: { spells: ['polymorph'] } }),
  L({ id: 'signOfIllOmen', name: b('Sinal de Mau Agouro', 'Sign of Ill Omen'), source: 'PHB',
    desc: b('Conjure Rogar Maldição 1×/descanso longo usando um espaço do Pacto.', 'Cast Bestow Curse once per long rest using a Pact Magic slot.'),
    prereq: { level: 5 }, grants: { spells: ['bestowCurse'] } }),
  L({ id: 'thiefOfFiveFates', name: b('Ladrão dos Cinco Destinos', 'Thief of Five Fates'), source: 'PHB',
    desc: b('Conjure Perdição 1×/descanso longo usando um espaço do Pacto.', 'Cast Bane once per long rest using a Pact Magic slot.'),
    grants: { spells: ['bane'] } }),
  L({ id: 'voiceOfTheChainMaster', name: b('Voz do Mestre da Corrente', 'Voice of the Chain Master'), source: 'PHB',
    desc: b('Comunica-se telepaticamente com o familiar e usa os sentidos dele à distância (mesmo plano); pode falar pela voz dele.', 'Communicate telepathically with your familiar and perceive through its senses at any distance on the same plane; you can speak through it.'),
    prereq: { options: ['pactOfTheChain'] } }),
  // XGE
  L({ id: 'aspectOfTheMoon', name: b('Aspecto da Lua', 'Aspect of the Moon'), source: 'XGE',
    desc: b('Não precisa dormir nem pode ser posto para dormir por magia; pode passar o descanso longo em atividade leve.', 'You no longer need to sleep and can\'t be magically put to sleep; you can spend a long rest on light activity.'),
    prereq: { options: ['pactOfTheTome'] } }),
  L({ id: 'cloakOfFlies', name: b('Manto de Moscas', 'Cloak of Flies'), source: 'XGE',
    desc: b('Ação bônus: aura de moscas de 1,5 m até ficar incapacitado ou dispensá-la. Vantagem em Intimidação e desvantagem nos demais testes de CAR; quem começa o turno na aura sofre dano venenoso igual ao mod. de CAR (mín. 0). 1×/descanso curto.', 'Bonus action: a 5-foot aura of flies until you are incapacitated or dismiss it. Advantage on Intimidation, disadvantage on other CHA checks; creatures starting their turn in it take poison damage equal to your CHA modifier (minimum 0). Once per short rest.'),
    prereq: { level: 5 } }),
  L({ id: 'ghostlyGaze', name: b('Olhar Fantasmagórico', 'Ghostly Gaze'), source: 'XGE',
    desc: b('Ação: por até 1 minuto (concentração), vê através de objetos sólidos a até 9 m e ganha visão no escuro nesse alcance. 1×/descanso curto.', 'Action: for up to 1 minute (concentration), see through solid objects within 30 feet and gain darkvision in that range. Once per short rest.'),
    prereq: { level: 7 } }),
  L({ id: 'giftOfTheEverLivingOnes', name: b('Dádiva dos Eternos', 'Gift of the Ever-Living Ones'), source: 'XGE',
    desc: b('Com o familiar a até 30 m, dados rolados para recuperar PV sempre dão o valor máximo.', 'While your familiar is within 100 feet, dice you roll to regain hit points always count as their maximum.'),
    prereq: { options: ['pactOfTheChain'] } }),
  L({ id: 'graspOfHadar', name: b('Agarrão de Hadar', 'Grasp of Hadar'), source: 'XGE',
    desc: b('1×/turno, ao acertar a Rajada Mística, puxa a criatura até 3 m (10 pés) em linha reta na sua direção.', 'Once per turn when Eldritch Blast hits, pull the creature up to 10 feet in a straight line toward you.'),
    prereq: { text: ELDRITCH_BLAST } }),
  L({ id: 'improvedPactWeapon', name: b('Arma do Pacto Aprimorada', 'Improved Pact Weapon'), source: 'XGE',
    desc: b('A arma do pacto serve de foco; se não for mágica, ganha +1 no ataque e no dano; pode ser também arco curto, arco longo, besta leve ou pesada.', 'Your pact weapon is a spellcasting focus; if not magical it gains +1 to attack and damage; it can also be a shortbow, longbow, light or heavy crossbow.'),
    prereq: { options: ['pactOfTheBlade'] } }),
  L({ id: 'lanceOfLethargy', name: b('Lança da Letargia', 'Lance of Lethargy'), source: 'XGE',
    desc: b('1×/turno, ao acertar a Rajada Mística, reduz o deslocamento do alvo em 3 m até o fim do seu próximo turno.', 'Once per turn when Eldritch Blast hits, reduce the target\'s speed by 10 feet until the end of your next turn.'),
    prereq: { text: ELDRITCH_BLAST } }),
  L({ id: 'maddeningHex', name: b('Maldição Enlouquecedora', 'Maddening Hex'), source: 'XGE',
    desc: b('Ação bônus: o alvo amaldiçoado (a até 9 m) e criaturas escolhidas a 1,5 m dele sofrem dano psíquico igual ao seu mod. de CAR (mín. 1).', 'Bonus action: your cursed target (within 30 feet) and chosen creatures within 5 feet of it take psychic damage equal to your CHA modifier (minimum 1).'),
    prereq: { level: 5, text: HEX_OR_CURSE } }),
  L({ id: 'relentlessHex', name: b('Maldição Implacável', 'Relentless Hex'), source: 'XGE',
    desc: b('Ação bônus: teletransporte-se até 9 m para um espaço a 1,5 m do alvo amaldiçoado que você consiga ver.', 'Bonus action: teleport up to 30 feet to a space within 5 feet of your cursed target that you can see.'),
    prereq: { level: 7, text: HEX_OR_CURSE } }),
  L({ id: 'shroudOfShadow', name: b('Mortalha de Sombras', 'Shroud of Shadow'), source: 'XGE',
    desc: b('Conjure Invisibilidade à vontade, sem gastar espaço.', 'Cast Invisibility at will, without expending a spell slot.'),
    prereq: { level: 15 }, grants: { spells: ['invisibility'] } }),
  L({ id: 'tombOfLevistus', name: b('Tumba de Levistus', 'Tomb of Levistus'), source: 'XGE',
    desc: b('Reação ao sofrer dano: fica envolto em gelo, ganha 10 PV temporários por nível de bruxo contra esse dano; até o fim do seu próximo turno fica vulnerável a fogo, deslocamento 0 e incapacitado. 1×/descanso curto.', 'Reaction when you take damage: encase yourself in ice, gaining 10 temporary HP per warlock level against it; until the end of your next turn you have vulnerability to fire, speed 0, and are incapacitated. Once per short rest.'),
    prereq: { level: 5 } }),
  L({ id: 'tricksterEscape', name: b('Fuga do Trapaceiro', "Trickster's Escape"), source: 'XGE',
    desc: b('Conjure Liberdade de Movimento em si mesmo 1×/descanso longo, sem gastar espaço.', 'Cast Freedom of Movement on yourself once per long rest without expending a spell slot.'),
    prereq: { level: 7 }, grants: { spells: ['freedomOfMovement'] } }),
  // TCE
  L({ id: 'giftOfTheProtectors2014', name: b('Dádiva dos Protetores', 'Gift of the Protectors'), source: 'TCE',
    desc: b('Página do Livro das Sombras com até (bônus de proficiência) nomes: o primeiro deles a cair a 0 PV fica com 1 PV. 1×/descanso longo.', 'A page in your Book of Shadows holds up to (proficiency bonus) names: the first of them to drop to 0 HP drops to 1 HP instead. Once per long rest.'),
    prereq: { level: 9, options: ['pactOfTheTome'] } }),
  L({ id: 'investmentOfTheChainMaster2014', name: b('Investimento do Mestre da Corrente', 'Investment of the Chain Master'), source: 'TCE',
    desc: b('O familiar ganha voo ou natação 12 m, ataca com sua ação bônus, seus ataques contam como mágicos, usa sua CD e recebe resistência por sua reação.', 'Your familiar gains 40 ft fly or swim, attacks on your bonus action, its attacks count as magical, uses your save DC, and can gain resistance via your reaction.'),
    prereq: { options: ['pactOfTheChain'] } }),
  L({ id: 'bondOfTheTalisman', name: b('Vínculo do Talismã', 'Bond of the Talisman'), source: 'TCE',
    desc: b('Ação: você teleporta para um espaço livre perto de quem usa seu talismã, ou quem o usa teleporta para perto de você (mesmo plano). Usos = bônus de proficiência por descanso longo.', 'Action: teleport to an unoccupied space near whoever wears your talisman, or they teleport to you (same plane). Uses equal to your proficiency bonus per long rest.'),
    prereq: { level: 12, options: ['pactOfTheTalisman'] } }),
  L({ id: 'farScribe', name: b('Escriba Distante', 'Far Scribe'), source: 'TCE',
    desc: b('Página do Livro das Sombras com até (bônus de proficiência) nomes; conjure Enviar Mensagem para eles sem espaço nem componentes materiais.', 'A page in your Book of Shadows holds up to (proficiency bonus) names; cast Sending to them without a slot or material components.'),
    prereq: { level: 5, options: ['pactOfTheTome'] }, grants: { spells: ['sendingSpell'] } }),
  L({ id: 'protectionOfTheTalisman', name: b('Proteção do Talismã', 'Protection of the Talisman'), source: 'TCE',
    desc: b('Quem usa o talismã soma 1d4 a uma salvaguarda que falhar. Usos = bônus de proficiência por descanso longo.', 'The talisman\'s wearer adds 1d4 to a failed saving throw. Uses equal to your proficiency bonus per long rest.'),
    prereq: { level: 7, options: ['pactOfTheTalisman'] } }),
  L({ id: 'rebukeOfTheTalisman', name: b('Repreensão do Talismã', 'Rebuke of the Talisman'), source: 'TCE',
    desc: b('Reação quando quem usa o talismã é atingido por um atacante a até 9 m: o atacante sofre dano psíquico igual ao seu bônus de proficiência e é empurrado 3 m.', 'Reaction when the talisman\'s wearer is hit by an attacker within 30 feet: the attacker takes psychic damage equal to your proficiency bonus and is pushed 10 feet.'),
    prereq: { options: ['pactOfTheTalisman'] } }),
  L({ id: 'undyingServitude', name: b('Servidão Imortal', 'Undying Servitude'), source: 'TCE',
    desc: b('Conjure Animar os Mortos 1×/descanso longo sem gastar espaço.', 'Cast Animate Dead once per long rest without expending a spell slot.'),
    prereq: { level: 5 }, grants: { spells: ['animateDead'] } }),
];

// === Dádiva do Pacto (só 2014, nível 3) ===
const pactBoons2014 = [
  L({ id: 'pactOfTheChain', name: b('Pacto da Corrente', 'Pact of the Chain'), source: 'PHB',
    desc: b('Aprende Encontrar Familiar (ritual, fora do limite) com formas extras: diabrete, pseudodragão, quasit ou sprite. Ao atacar, pode abrir mão de um ataque para o familiar atacar com a reação dele.', 'Learn Find Familiar (as a ritual, not counted against known spells) with extra forms: imp, pseudodragon, quasit, or sprite. When you attack, you can forgo one attack so your familiar attacks with its reaction.'),
    grants: { spells: ['findFamiliar'] } }),
  L({ id: 'pactOfTheBlade', name: b('Pacto da Lâmina', 'Pact of the Blade'), source: 'PHB',
    desc: b('Ação: cria uma arma corpo a corpo à escolha na mão (proficiente, conta como mágica). Pode vincular uma arma mágica com ritual de 1 hora.', 'Action: create a melee weapon of your choice in your hand (you are proficient; it counts as magical). You can bond a magic weapon with a 1-hour ritual.') }),
  L({ id: 'pactOfTheTome', name: b('Pacto do Tomo', 'Pact of the Tome'), source: 'PHB',
    desc: b('Livro das Sombras com 3 truques de qualquer lista, que contam como truques de bruxo e ficam fora do limite de truques.', 'A Book of Shadows with 3 cantrips from any class list; they count as warlock cantrips and don\'t count against cantrips known.'),
    choices: { tomeCantrip: 3 } }),
  L({ id: 'pactOfTheTalisman', name: b('Pacto do Talismã', 'Pact of the Talisman'), source: 'TCE',
    desc: b('Amuleto que serve de foco; quem o usa soma 1d4 a um teste de atributo que falhar. Usos = bônus de proficiência por descanso longo.', 'An amulet that is a spellcasting focus; its wearer adds 1d4 to a failed ability check. Uses equal to your proficiency bonus per long rest.') }),
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
      'Por um ritual oculto, você firmou um pacto com uma entidade misteriosa que lhe dá a capacidade de conjurar magias. Truques: conhece 2 truques de bruxo (sugeridos Rajada Mística e Prestidigitação), 3 no 4º nível e 4 no 10º; ao ganhar um nível de bruxo, pode trocar um deles. Espaços de magia: a tabela mostra quantos espaços você tem e o círculo deles — todos do mesmo círculo — e você recupera todos ao terminar um Descanso Curto ou Longo. Magias preparadas: comece com 2 magias de bruxo de 1º círculo (sugeridas Enfeitiçar Pessoa e Bruxaria); a quantidade cresce conforme a tabela, sempre de círculo até o dos seus espaços. Magias que outros traços deixam sempre preparadas não contam nesse limite. Ao ganhar um nível de bruxo, pode trocar uma magia preparada por outra elegível. Carisma é seu atributo de conjuração, e você pode usar um Foco Arcano.',
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
      'Você ganha um talento de Dádiva Épica ou outro talento para o qual se qualifique. Sugestão: Dádiva do Destino.',
      'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Fate is recommended.')),
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
            'Quando você reduz um inimigo a 0 PV, ganha PV temporários iguais ao seu modificador de Carisma + seu nível de bruxo (mínimo 1). Também ganha esse benefício se outra criatura reduzir a 0 PV um inimigo a até 3 m (10 pés) de você.',
            'When you reduce an enemy to 0 Hit Points, you gain Temporary Hit Points equal to your Charisma modifier plus your Warlock level (minimum 1). You also gain this benefit if someone else reduces an enemy within 10 feet of you to 0 Hit Points.')),
          f('fiendSpells', b('Magias do Ínfero', 'Fiend Spells'), b(
            'Sempre preparadas: nível 3 — Mãos Flamejantes, Comando, Raio Ardente, Sugestão; nível 5 — Bola de Fogo, Névoa Fétida; nível 7 — Escudo de Fogo, Muralha de Fogo; nível 9 — Missão, Praga de Insetos.',
            'Always prepared: level 3 — Burning Hands, Command, Scorching Ray, Suggestion; level 5 — Fireball, Stinking Cloud; level 7 — Fire Shield, Wall of Fire; level 9 — Geas, Insect Plague.')),
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
            'Ao terminar um Descanso Curto ou Longo, escolha um tipo de dano que não seja Força. Você tem Resistência a ele até escolher outro com este traço.',
            'Whenever you finish a Short or Long Rest, choose one damage type other than Force. You have Resistance to it until you choose a different one with this feature.')),
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
            'Sempre preparadas: nível 3 — Acalmar Emoções, Fogo das Fadas, Passo Nebuloso, Força Fantasmagórica, Sono; nível 5 — Piscar, Crescimento de Plantas; nível 7 — Dominar Besta, Invisibilidade Maior; nível 9 — Dominar Pessoa, Semelhança.',
            'Always prepared: level 3 — Calm Emotions, Faerie Fire, Misty Step, Phantasmal Force, Sleep; level 5 — Blink, Plant Growth; level 7 — Dominate Beast, Greater Invisibility; level 9 — Dominate Person, Seeming.')),
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
            'Logo após conjurar uma magia de Encantamento ou Ilusão usando uma ação e um espaço de magia, você pode conjurar Passo Nebuloso como parte da mesma ação, sem gastar espaço.',
            'Right after you cast an Enchantment or Illusion spell using an action and a spell slot, you can cast Misty Step as part of the same action without expending a spell slot.')),
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
            'Sempre preparadas: nível 3 — Auxílio, Curar Ferimentos, Raio Guia, Restauração Menor, Luz, Chama Sagrada; nível 5 — Luz do Dia, Revivificar; nível 7 — Guardião da Fé, Muralha de Fogo; nível 9 — Restauração Maior, Invocar Celestial.',
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
            'Você tem Resistência a dano radiante. 1×/turno, quando uma magia sua causa dano radiante ou de fogo, soma seu modificador de Carisma ao dano contra um dos alvos.',
            'You have Resistance to Radiant damage. Once per turn, when a spell you cast deals Radiant or Fire damage, add your Charisma modifier to that spell\'s damage against one of its targets.')),
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
            'Quando conjura uma magia de bruxo que causa dano, pode mudar o tipo do dano para psíquico. Magias de bruxo de Encantamento ou Ilusão podem ser conjuradas sem componentes Verbais ou Somáticos.',
            'When you cast a Warlock spell that deals damage, you can change its damage type to Psychic. You can cast Warlock Enchantment or Illusion spells without Verbal or Somatic components.')),
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
            'Você sempre tem a magia Bruxaria preparada. Quando a conjura e escolhe um atributo, o alvo também tem Desvantagem em salvaguardas desse atributo enquanto a magia durar.',
            'You always have the Hex spell prepared. When you cast it and choose an ability, the target also has Disadvantage on saving throws of that ability for the spell\'s duration.')),
          f('thoughtShield', b('Escudo de Pensamentos', 'Thought Shield'), b(
            'Seus pensamentos não podem ser lidos por telepatia ou outros meios, a menos que você permita. Você tem Resistência a dano psíquico, e quem lhe causar dano psíquico sofre a mesma quantidade de dano que você sofreu.',
            'Your thoughts can\'t be read by telepathy or other means unless you allow it. You have Resistance to Psychic damage, and a creature that deals Psychic damage to you takes the same amount of damage you take.')),
        ],
        autoSpells: ['hex'],
      },
      14: {
        features: [
          f('createThrall', b('Criar Servo', 'Create Thrall'), b(
            'Ao conjurar Invocar Aberração, pode fazê-la sem Concentração (duração de 1 minuto nesse caso). A Aberração surge com PV temporários iguais ao seu nível de bruxo + modificador de Carisma e, na primeira vez em cada turno que acertar uma criatura sob sua Bruxaria, causa dano psíquico extra igual ao bônus de dano da Bruxaria.',
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
          spellsFeature('hexbladeSpells', 'da Lâmina Maldita', 'Hexblade',
            '3 — Escudo Arcano, Destruição Colérica, Nublar, Destruição Marcante; 5 — Piscar, Arma Elemental; 7 — Assassino Fantasmagórico, Destruição Atordoante; 9 — Destruição Banidora, Cone de Frio.',
            '3 — Shield, Wrathful Smite, Blur, Branding Smite; 5 — Blink, Elemental Weapon; 7 — Phantasmal Killer, Staggering Smite; 9 — Banishing Smite, Cone of Cold.'),
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
            'Quando o alvo da sua Maldição da Lâmina o acerta com um ataque, você pode usar a Reação para rolar 1d6: com 4 ou mais, o ataque erra.',
            'When the target of your Hexblade\'s Curse hits you with an attack, you can use your Reaction to roll a d6: on a 4 or higher, the attack misses.')),
        ],
      },
      14: {
        features: [
          f('masterOfHexes', b('Mestre das Maldições', 'Master of Hexes'), b(
            'Quando a criatura amaldiçoada pela Maldição da Lâmina morre, você pode transferir a maldição para outra criatura que veja a até 9 m, sem gastar uso (mas sem recuperar PV pela morte da primeira).',
            'When the creature cursed by your Hexblade\'s Curse dies, you can move the curse to another creature you can see within 30 feet without expending a use (but without regaining HP from the first one\'s death).')),
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
          spellsFeature('undyingSpells', 'do Imortal', 'Undying',
            '3 — Vitalidade Falsa, Raio Adoecente, Cegueira/Surdez, Silêncio; 5 — Fingir-se de Morto, Falar com os Mortos; 7 — Aura de Vida, Proteção contra a Morte; 9 — Contágio, Lenda.',
            '3 — False Life, Ray of Sickness, Blindness/Deafness, Silence; 5 — Feign Death, Speak with Dead; 7 — Aura of Life, Death Ward; 9 — Contagion, Legend Lore.'),
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
            'Quando você tem sucesso numa salvaguarda contra a morte ou estabiliza uma criatura com Poupar os Moribundos, recupera 1d8 + mod. de Constituição PV (mín. 1). 1×/Descanso Longo.',
            'When you succeed on a Death Saving Throw or stabilize a creature with Spare the Dying, you regain 1d8 + your Constitution modifier HP (minimum 1). Once per Long Rest.')),
        ],
      },
      7: { autoSpells: ['auraOfLife', 'deathWard'] },
      9: { autoSpells: ['contagion', 'legendLore'] },
      10: {
        features: [
          f('undyingNature', b('Natureza Imortal', 'Undying Nature'), b(
            'Você pode prender a respiração indefinidamente e não precisa comer, beber nem dormir (ainda precisa descansar). Envelhece 10 vezes mais devagar e é imune a envelhecimento mágico.',
            'You can hold your breath indefinitely and don\'t need food, water, or sleep (you still need rest). You age ten times more slowly and are immune to magical aging.')),
        ],
      },
      14: {
        features: [
          f('indestructibleLife', b('Vida Indestrutível', 'Indestructible Life'), b(
            'Ação Bônus: recupere 1d8 + seu nível de bruxo PV; se colocar uma parte do corpo decepada no lugar, ela se reconecta. 1×/Descanso Curto ou Longo.',
            'Bonus Action: regain 1d8 + your Warlock level HP; a severed body part you hold in place reattaches. Once per Short or Long Rest.')),
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
            'Você ganha deslocamento de natação de 12 m (40 pés) e pode respirar debaixo d\'água.',
            'You gain a Swim Speed of 40 feet and can breathe underwater.')),
        ],
        autoSpells: ['createOrDestroyWater', 'thunderwave', 'gustOfWind', 'silence'],
      },
      5: { autoSpells: ['lightningBolt', 'sleetStorm'] },
      6: {
        features: [
          f('oceanicSoul', b('Alma Oceânica', 'Oceanic Soul'), b(
            'Você tem Resistência a dano de frio. Enquanto estiver totalmente submerso, qualquer criatura também submersa entende sua fala e você entende a dela.',
            'You have Resistance to Cold damage. While fully submerged, any creature that is also submerged understands your speech, and you understand its.')),
          f('guardianCoil', b('Espiral Guardiã', 'Guardian Coil'), b(
            'Quando você ou uma criatura que você vê sofre dano a até 3 m do seu tentáculo, pode usar a Reação para reduzir esse dano em 1d8 (2d8 no nível 10).',
            'When you or a creature you can see takes damage within 10 feet of your tentacle, you can use your Reaction to reduce that damage by 1d8 (2d8 at level 10).')),
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
            'Ação: você e até cinco criaturas voluntárias a até 9 m se teleportam para um corpo d\'água (do tamanho de uma lagoa ou maior) que você já viu, a até 1,6 km (1 milha). 1×/Descanso Curto ou Longo.',
            'Action: you and up to five willing creatures within 30 feet teleport to a body of water (pond-sized or larger) you have seen, within 1 mile. Once per Short or Long Rest.')),
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
            'Você tem Resistência ao tipo de dano do seu gênio. Como Ação Bônus, ganha deslocamento de voo de 9 m (pode pairar) por 10 minutos; usos iguais ao bônus de proficiência por Descanso Longo.',
            'You have Resistance to your genie\'s damage type. As a Bonus Action, you gain a Fly Speed of 30 feet (you can hover) for 10 minutes; uses equal to your proficiency bonus per Long Rest.')),
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
          spellsFeature('undeadSpells', 'do Morto-Vivo', 'Undead',
            '3 — Perdição, Vitalidade Falsa, Cegueira/Surdez, Força Fantasmagórica; 5 — Corcel Fantasma, Falar com os Mortos; 7 — Proteção contra a Morte, Invisibilidade Maior; 9 — Concha Antivida, Névoa Mortal.',
            '3 — Bane, False Life, Blindness/Deafness, Phantasmal Force; 5 — Phantom Steed, Speak with Dead; 7 — Death Ward, Greater Invisibility; 9 — Antilife Shell, Cloudkill.'),
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
            'Você não precisa comer, beber nem respirar. 1×/turno, ao acertar um ataque e causar dano, pode trocar o tipo do dano por necrótico; na Forma do Pavor, role um dado de dano extra.',
            'You don\'t need to eat, drink, or breathe. Once per turn when you hit with an attack and deal damage, you can change its type to Necrotic; while in Form of Dread, roll one additional damage die.')),
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
