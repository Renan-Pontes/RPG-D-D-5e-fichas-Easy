// Mago — traços da classe 2024 (SRD 5.2.1, CC-BY 4.0), escolhas e subclasses.
// Formato em README.md. Resumos originais; texto integral só do SRD.
// Maestria de Magia e Magias Assinatura escolhem magias do grimório
// (filter.inBook). O Sábio (Savant) das escolas 2024 filtra pela lista de Mago:
// as magias dele são grátis e entram no livro, não saem dele.
const b = (pt, en) => ({ pt, en });
const f = (id, namePt, nameEn, descPt, descEn) => ({ id, name: b(namePt, nameEn), desc: b(descPt, descEn) });

// ---------------------------------------------------------------------------
// Traços da classe base 2024 (SRD 5.2.1, págs. 77–78)
// ---------------------------------------------------------------------------
const ASI = f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
  'Ganhe o talento Aumento no Valor de Atributo ou outro talento para o qual você se qualifique. Você ganha este traço de novo nos níveis de Mago 8, 12 e 16.',
  'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Wizard levels 8, 12, and 16.');

const features = {
  1: [
    f('spellcasting', 'Conjuração', 'Spellcasting',
      'Você conjura magias de Mago usando Inteligência (CD = 8 + INT + bônus de proficiência). Truques: conhece 3 truques de Mago (4 no nível 4, 5 no nível 10) e, ao fim de cada descanso longo, pode trocar um deles por outro. Grimório: começa com seis magias de Mago de nível 1 e, a cada nível de Mago após o 1º, adiciona duas magias de um nível para o qual tenha espaços; magias achadas em aventuras podem ser copiadas (2 horas e 50 PO por nível da magia). Magias preparadas: escolhe do grimório o número indicado na tabela (4 no nível 1), de níveis para os quais tenha espaços, e pode trocar a lista ao fim de cada descanso longo. Magias que outros traços de Mago deixam sempre preparadas não contam nesse limite. Foco: um foco arcano ou o próprio grimório.',
      'You cast Wizard spells using Intelligence (DC = 8 + INT + proficiency bonus). Cantrips: you know 3 Wizard cantrips (4 at level 4, 5 at level 10) and can replace one of them after each Long Rest. Spellbook: it starts with six level 1 Wizard spells and, each Wizard level after 1st, you add two Wizard spells of a level for which you have slots; spells found while adventuring can be copied in (2 hours and 50 GP per spell level). Prepared spells: choose from your spellbook the number shown in the table (4 at level 1), of levels for which you have slots, and change the list after each Long Rest. Spells other Wizard features keep always prepared don\'t count against that number. Focus: an Arcane Focus or your spellbook.'),
    f('ritualAdept', 'Adepto de Rituais', 'Ritual Adept',
      "Você pode conjurar qualquer magia como um Ritual se ela tiver o marcador Ritual e estiver no seu grimório. Você não precisa ter a magia preparada, mas deve ler do livro para conjurar uma magia dessa forma.",
      "You can cast any spell as a Ritual if that spell has the Ritual tag and the spell is in your spellbook. You needn't have the spell prepared, but you must read from the book to cast a spell in this way."),
    f('arcaneRecovery', 'Recuperação Arcana', 'Arcane Recovery',
      'Ao terminar um descanso curto, você pode recuperar espaços de magia gastos cuja soma de níveis seja no máximo metade do seu nível de Mago (arredondado para cima); nenhum deles pode ser de nível 6 ou mais. Ex.: no nível 4, recupera um espaço de nível 2 ou dois de nível 1. Uma vez por descanso longo.',
      'When you finish a Short Rest, you can recover expended spell slots with a combined level of up to half your Wizard level (round up); none can be level 6 or higher. E.g., at level 4 you recover one level 2 slot or two level 1 slots. Once per Long Rest.'),
  ],
  2: [
    f('scholar', 'Estudioso', 'Scholar',
      "Ao estudar magia, você também se especializou em outro campo de estudo. Escolha uma das seguintes perícias nas quais você tenha proficiência: Arcanismo, História, Investigação, Medicina, Natureza ou Religião. Você tem Especialização na perícia escolhida.",
      "While studying magic, you also specialized in another field of study. Choose one of the following skills in which you have proficiency: Arcana, History, Investigation, Medicine, Nature, or Religion. You have Expertise in the chosen skill."),
  ],
  3: [
    f('wizardSubclass', 'Subclasse de Mago', 'Wizard Subclass',
      "Você ganha uma subclasse de Mago de sua escolha. A subclasse Evocador é detalhada após a descrição desta classe. Uma subclasse é uma especialização que concede a você características em certos níveis de Mago. Pelo restante",
      "You gain a Wizard subclass of your choice. The Evoker subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Wizard levels. For the rest"),
  ],
  4: [ASI],
  5: [
    f('memorizeSpell', 'Memorizar Magia', 'Memorize Spell',
      "Sempre que terminar um Descanso Curto, você pode estudar seu grimório e substituir uma das magias de Mago de 1º círculo ou superior que você preparou para sua característica Conjuração por outra magia de 1º círculo ou superior do grimório.",
      "Whenever you finish a Short Rest, you can study your spellbook and replace one of the level 1+ Wizard spells you have prepared for your Spellcasting feature with another level 1+ spell from the book."),
  ],
  8: [ASI],
  12: [ASI],
  16: [ASI],
  18: [
    f('spellMastery', 'Maestria em Magia', 'Spell Mastery',
      'Escolha uma magia de nível 1 e uma de nível 2 do grimório com tempo de conjuração de uma Ação. Elas ficam sempre preparadas e podem ser conjuradas no nível mínimo sem gastar espaço (em nível maior, gasta espaço). Ao terminar um descanso longo, pode trocar uma delas por outra elegível do mesmo nível.',
      'Choose a level 1 and a level 2 spell in your spellbook that have a casting time of an action. You always have them prepared and can cast them at their lowest level without expending a slot (a higher level costs a slot). After a Long Rest, you can replace one of them with an eligible spell of the same level.'),
  ],
  19: [
    f('epicBoon', 'Dádiva Épica', 'Epic Boon',
      "Você ganha um talento de Dádiva Épica (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Dádiva da Recuperação de Magia é recomendada.",
      "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Spell Recall is recommended."),
  ],
  20: [
    f('signatureSpells', 'Magias Assinatura', 'Signature Spells',
      'Escolha duas magias de nível 3 do grimório. Elas ficam sempre preparadas e você pode conjurar cada uma delas uma vez no nível 3 sem gastar espaço; esse uso volta num descanso curto ou longo. Em nível maior, gasta espaço.',
      'Choose two level 3 spells in your spellbook as your signature spells. You always have them prepared and can cast each once at level 3 without expending a slot; that use returns after a Short or Long Rest. A higher level costs a slot.'),
  ],
};

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------
// Chaves de filtro extras (implementadas na UI, options-catalog.js):
//   minLevel: 1       → só magias de nível ≥ minLevel (exclui truques).
//   castingTime: 'Action' → só magias cujo castingTime começa com esse texto.
//   maxSlot: true     → só magias de nível ≤ maior espaço de Mago do personagem.
//   inBook: true      → só magias que já estão no grimório (spellbook.js).
const savant = (school, pt, en) => ({
  name: b(`Sábio da ${pt} (magias grátis)`, `${en} Savant (free spells)`),
  // As magias grátis vão para o grimório (não ficam preparadas sozinhas).
  kind: 'spell', grantAs: 'spellbook',
  // minLevel 1: sem truques; maxSlot: nível ≤ maior espaço de Mago (≤2 no nível 3).
  filter: { classes: ['wizard'], school: [school], minLevel: 1, maxSlot: true },
});

// Treinamento em Guerra e Canção: a arma escolhida + armadura leve + Atuação.
const weapon = (id, pt, en, rules) => ({
  id, name: b(pt, en), source: 'TCE', ...(rules ? { rules } : {}),
  grants: { weapons: [id], armor: ['light'], skills: ['performance'] },
  desc: b(`Proficiência com ${pt.toLowerCase()} (arma corpo a corpo de uma mão).`, `Proficiency with the ${en.toLowerCase()} (one-handed melee weapon).`),
});

const stone = (id, pt, en, descPt, descEn, grants) => ({ id, name: b(pt, en), source: 'PHB', desc: b(descPt, descEn), ...(grants ? { grants } : {}) });

const pools = {
  scholar: {
    name: b('Estudioso (Especialização)', 'Scholar (Expertise)'),
    kind: 'skill', grantAs: 'expertise',
    filter: { from: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'], proficient: true },
  },
  spellMastery1: {
    name: b('Maestria em Magia — nível 1', 'Spell Mastery — level 1'),
    kind: 'spell', grantAs: 'spell', freeSwap: true,
    // castingTime 'Action': só magias com tempo de conjuração de uma Ação.
    filter: { classes: ['wizard'], level: 1, castingTime: 'Action', inBook: true },
  },
  spellMastery2: {
    name: b('Maestria em Magia — nível 2', 'Spell Mastery — level 2'),
    kind: 'spell', grantAs: 'spell', freeSwap: true,
    // castingTime 'Action': só magias com tempo de conjuração de uma Ação.
    filter: { classes: ['wizard'], level: 2, castingTime: 'Action', inBook: true },
  },
  // 2014: sem a restrição de tempo de conjuração; troca com 8 horas de estudo.
  legacySpellMastery1: {
    name: b('Maestria em Magia — 1º círculo', 'Spell Mastery — 1st level'),
    kind: 'spell', grantAs: 'spell', freeSwap: true,
    filter: { classes: ['wizard'], level: 1, inBook: true },
  },
  legacySpellMastery2: {
    name: b('Maestria em Magia — 2º círculo', 'Spell Mastery — 2nd level'),
    kind: 'spell', grantAs: 'spell', freeSwap: true,
    filter: { classes: ['wizard'], level: 2, inBook: true },
  },
  signatureSpells: {
    name: b('Magias Assinatura', 'Signature Spells'),
    kind: 'spell', grantAs: 'spell',
    filter: { classes: ['wizard'], level: 3, inBook: true },
  },

  // Sábio das escolas 2024: magias grátis no grimório (sem grimório no app,
  // entram como magias concedidas). 2 no nível 3 (até nível 2) e +1 a cada
  // novo nível de espaço (5, 7, 9, 11, 13, 15, 17).
  abjurationSavant: savant('abjuration', 'Abjuração', 'Abjuration'),
  divinationSavant: savant('divination', 'Adivinhação', 'Divination'),
  evocationSavant: savant('evocation', 'Evocação', 'Evocation'),
  illusionSavant: savant('illusion', 'Ilusão', 'Illusion'),

  improvedIllusionsCantrip: {
    name: b('Ilusões Aprimoradas: Ilusão Menor (ou outro truque, se já a conhece)', 'Improved Illusions: Minor Illusion (or another cantrip if known)'),
    kind: 'spell', grantAs: 'cantrip',
    filter: { classes: ['wizard'], level: 0 },
  },

  bladesingerWeapon: {
    name: b('Treinamento em Guerra e Canção (arma)', 'Training in War and Song (weapon)'),
    options: [
      weapon('battleaxe', 'Machado de Batalha', 'Battleaxe'),
      weapon('flail', 'Mangual', 'Flail'),
      weapon('longsword', 'Espada Longa', 'Longsword'),
      weapon('morningstar', 'Maça Estrela', 'Morningstar'),
      weapon('rapier', 'Rapieira', 'Rapier'),
      weapon('scimitar', 'Cimitarra', 'Scimitar'),
      weapon('shortsword', 'Espada Curta', 'Shortsword'),
      weapon('trident', 'Tridente', 'Trident'),
      weapon('warPick', 'Picareta de Guerra', 'War Pick'),
      weapon('warhammer', 'Martelo de Guerra', 'Warhammer'),
      weapon('whip', 'Chicote', 'Whip'),
      // Nas regras 2024 o Mago já tem proficiência com armas simples.
      weapon('club', 'Clava', 'Club', '2014'),
      weapon('handaxe', 'Machadinha', 'Handaxe', '2014'),
      weapon('javelin', 'Azagaia', 'Javelin', '2014'),
      weapon('lightHammer', 'Martelo Leve', 'Light Hammer', '2014'),
      weapon('mace', 'Maça', 'Mace', '2014'),
      weapon('sickle', 'Foice Curta', 'Sickle', '2014'),
      weapon('spear', 'Lança', 'Spear', '2014'),
    ],
  },

  transmutersStone: {
    name: b('Pedra do Transmutador (benefício)', "Transmuter's Stone (benefit)"),
    freeSwap: true, // troca o benefício ao conjurar transmutação de nível 1+ com a pedra
    options: [
      stone('darkvision', 'Visão no Escuro', 'Darkvision',
        "Quem carrega a pedra ganha Visão no Escuro de 18 m.", "The bearer gains darkvision out to 18 m."),
      stone('speed', 'Deslocamento', 'Speed',
        "Quem carrega a pedra ganha +3 m de deslocamento enquanto não estiver sobrecarregado.", "The bearer's speed increases by 3 m while unencumbered."),
      stone('conSave', 'Salvaguarda de Constituição', 'Constitution Saves',
        'Quem carrega a pedra ganha proficiência em salvaguardas de Constituição.', 'The bearer gains proficiency in Constitution saving throws.', { saves: ['con'] }),
      stone('resistAcid', 'Resistência a Ácido', 'Acid Resistance',
        'Quem carrega a pedra ganha resistência a dano ácido.', 'The bearer gains resistance to acid damage.'),
      stone('resistCold', 'Resistência a Frio', 'Cold Resistance',
        'Quem carrega a pedra ganha resistência a dano de frio.', 'The bearer gains resistance to cold damage.'),
      stone('resistFire', 'Resistência a Fogo', 'Fire Resistance',
        'Quem carrega a pedra ganha resistência a dano de fogo.', 'The bearer gains resistance to fire damage.'),
      stone('resistLightning', 'Resistência a Elétrico', 'Lightning Resistance',
        'Quem carrega a pedra ganha resistência a dano elétrico.', 'The bearer gains resistance to lightning damage.'),
      stone('resistThunder', 'Resistência a Trovão', 'Thunder Resistance',
        'Quem carrega a pedra ganha resistência a dano de trovão.', 'The bearer gains resistance to thunder damage.'),
    ],
  },
};

// Savant 2024: 2 no nível 3 e 1 a cada novo nível de espaço de magia.
const savantTable = (pool) => Object.fromEntries(
  [[3, 2], [5, 1], [7, 1], [9, 1], [11, 1], [13, 1], [15, 1], [17, 1]].map(([lv, n]) => [lv, { [pool]: n }]),
);

// ---------------------------------------------------------------------------
// Subclasses
// ---------------------------------------------------------------------------
const SAVANT_2024 = (school, pt, en) => f(`${school}Savant`, `Sábio da ${pt}`, `${en} Savant`,
  `Escolha duas magias de Mago da escola de ${pt}, de nível 2 ou menor, e adicione-as de graça ao grimório. Sempre que ganhar acesso a um novo nível de espaço de magia nesta classe, adicione de graça mais uma magia de Mago dessa escola, de um nível para o qual tenha espaços.`,
  `Choose two Wizard spells from the ${en} school, each no higher than level 2, and add them to your spellbook for free. Whenever you gain access to a new level of spell slots in this class, add one more Wizard spell from that school, of a level for which you have slots, for free.`);

const SAVANT_2014 = (school, pt, en, de = 'da') => f(`${school}Savant`, `Sábio ${de} ${pt}`, `${en} Savant`,
  `O ouro e o tempo para copiar uma magia de ${pt} para o grimório caem pela metade.`,
  `The gold and time you must spend to copy ${/^[AEIOU]/.test(en) ? 'an' : 'a'} ${en} spell into your spellbook are halved.`);

const subclasses = {
  // ----- PHB 2024 / SRD -----
  abjuration: {
    name: b('Abjurador', 'Abjurer'),
    source: 'PHB24',
    desc: b('Especialista em magias de proteção, barreiras e anulação de magia.', 'A specialist in protective magic, wards, and spell negation.'),
    levels: {
      3: {
        features: [
          SAVANT_2024('abjuration', 'Abjuração', 'Abjuration'),
          f('arcaneWard', 'Proteção Arcana', 'Arcane Ward',
            'Ao conjurar uma magia de abjuração com espaço de magia, você pode criar uma proteção mágica que dura até o descanso longo. Ela tem PV máximos = 2 × nível de Mago + modificador de INT e sofre o dano no seu lugar; se chegar a 0, o dano restante passa para você. Ao conjurar abjuração com espaço, a proteção recupera 2 × o nível do espaço; com uma Ação Bônus, você pode gastar um espaço para recuperar o mesmo valor. Criar a proteção: 1 vez por descanso longo.',
            'When you cast an Abjuration spell with a spell slot, you can create a magical ward that lasts until you finish a Long Rest. It has maximum HP = 2 × Wizard level + INT modifier and takes damage in your place; if it drops to 0, you take the rest. Whenever you cast an Abjuration spell with a slot, it regains 2 × the slot level; as a Bonus Action you can expend a slot to restore the same amount. Creating the ward: once per Long Rest.'),
        ],
      },
      6: {
        features: [
          f('projectedWard', 'Proteção Projetada', 'Projected Ward',
            "A partir do 6º nível, quando uma criatura que você possa ver a até 9 metros de você sofrer dano, você pode usar sua reação para fazer com que sua Proteção Arcana absorva esse dano. Se esse dano reduzir a proteção a 0 pontos de vida, a criatura protegida sofre qualquer dano restante.",
            "Starting at 6th level, when a creature that you can see within 30 feet of you takes damage, you can use your reaction to cause your Arcane Ward to absorb that damage. If this damage reduces the ward to 0 hit points, the warded creature takes any remaining damage."),
        ],
      },
      10: {
        features: [
          f('spellBreaker', 'Quebra-Magia', 'Spell Breaker',
            'Contramágica e Dissipar Magia ficam sempre preparadas. Você pode conjurar Dissipar Magia como Ação Bônus e somar seu bônus de proficiência ao teste de atributo dela. Se usar qualquer das duas para encerrar uma magia e falhar, o espaço de magia não é gasto.',
            'You always have Counterspell and Dispel Magic prepared. You can cast Dispel Magic as a Bonus Action and add your Proficiency Bonus to its ability check. If you use either spell to end or stop a spell and fail, the spell slot isn\'t expended.'),
        ],
        autoSpells: ['counterspell', 'dispelMagic'],
      },
      14: {
        features: [
          f('spellResistance', 'Resistência a Magia', 'Spell Resistance',
            "A partir do 14º nível, você tem vantagem em salvaguardas contra magias.\n\nAlém disso, você tem resistência contra o dano de magias.",
            "Starting at 14th level, you have advantage on saving throws against spells.\n\nFurthermore, you have resistance against the damage of spells."),
        ],
      },
    },
  },

  divination: {
    name: b('Adivinho', 'Diviner'),
    source: 'PHB24',
    desc: b('Estuda o futuro e o oculto; molda o destino com presságios.', 'Studies the future and the hidden; bends fate with portents.'),
    levels: {
      3: {
        features: [
          SAVANT_2024('divination', 'Adivinhação', 'Divination'),
          f('portent', 'Presságio', 'Portent',
            'Ao terminar um descanso longo, role dois d20 e anote os resultados. Você pode substituir qualquer Teste de D20 seu ou de uma criatura que você vê por um desses valores, antes da rolagem; cada valor é usado uma vez, no máximo uma vez por turno. Os valores não usados se perdem no descanso longo seguinte.',
            'When you finish a Long Rest, roll two d20s and record the numbers. You can replace any D20 Test made by you or a creature you can see with one of them, before the roll; each number is used once, and only once per turn. Unused numbers are lost on your next Long Rest.'),
        ],
      },
      6: {
        features: [
          f('expertDivination', 'Adivinhação Especialista', 'Expert Divination',
            "A partir do 6º nível, conjurar magias de adivinhação é tão fácil para você que despende apenas uma fração dos seus esforços de conjuração. Quando você conjura uma magia de adivinhação de 2º círculo ou superior usando um espaço de magia, você recupera um espaço de magia gasto. O espaço que você recupera deve ser de um círculo inferior ao da magia conjurada e não pode ser superior ao 5º círculo.",
            "Beginning at 6th level, casting divination spells comes so easily to you that it expends only a fraction of your spellcasting efforts. When you cast a divination spell of 2nd level or higher using a spell slot, you regain one expended spell slot. The slot you regain must be of a level lower than the spell you cast and can’t be higher than 5th level."),
        ],
      },
      10: {
        features: [
          f('theThirdEye', 'O Terceiro Olho', 'The Third Eye',
            "A partir do 10º nível, você pode usar sua ação para aprimorar seus poderes de percepção. Ao fazer isso, escolha um dos seguintes benefícios, que dura até você ficar incapacitado ou realizar um descanso curto ou longo. Você não pode usar esta característica novamente até terminar um descanso.\n\nVisão no Escuro. Você ganha visão no escuro com alcance de 18 metros.\n\nVisão Etérea. Você pode enxergar no Plano Etéreo a até 18 metros de você.\n\nCompreensão Aprimorada. Você pode ler qualquer idioma.\n\nVer o Invisível. Você pode enxergar criaturas e objetos invisíveis a até 3 metros de você que estejam em sua linha de visão.",
            "Starting at 10th level, you can use your action to increase your powers of perception. When you do so, choose one of the following benefits, which lasts until you are incapacitated or you take a short or long rest. You can’t use the feature again until you finish a rest.\n\nDarkvision. You gain darkvision out to a range of 60 feet.\n\nEthereal Sight. You can see into the Ethereal Plane within 60 feet of you.\n\nGreater Comprehension. You can read any language.\n\nSee Invisibility. You can see invisible creatures and objects within 10 feet of you that are within line of sight."),
        ],
      },
      14: {
        features: [
          f('greaterPortent', 'Presságio Maior', 'Greater Portent',
            "As visões em seus sonhos se intensificam e retratam o porvir. Role três d20s para a sua característica Augúrio\n\ne não pode ser superior ao 5º nível.\n\n,.\n\n\"\n\nEVOCADOR\n\nCrie Efeitos Elementais Explosivos\n\nSeus estudos se concentram na magia que cria poderosos efeitos elementais, como frio cortante, chamas causticantes, trovões estrondosos, relâmpagos crepitantes e ácido corrosivo. Alguns Evocadores encontram emprego em forças militares, servindo como artilharia para explodir exércitos de longe. Outros usam seu poder para proteger os outros, enquanto alguns buscam seu próprio ganho.",
            "The visions in your dreams intensify and paint a come. Roll three d20s for your Portent feature\n\na nd can't be higher than level 5.\n\n,.\n\n\"\n\nEVOKER\n\nCreate Explosive Elemental Effects\n\nYour studies focus on magic that creates powerful elemental effects such as bitter cold , sea ring fl a me, rolling thunder, crackling lightning, and burning acid. Some Evokers find employment in milita ry forces, serving as artillery to blas t armies from a far. Others use their power to protect others, while some seek their own gain."),
        ],
      },
    },
  },

  evocation: {
    name: b('Evocador', 'Evoker'),
    source: 'SRD',
    desc: b('Cria efeitos elementais explosivos: frio, fogo, trovão, relâmpago e ácido.', 'Creates explosive elemental effects: cold, fire, thunder, lightning, and acid.'),
    levels: {
      3: {
        features: [
          SAVANT_2024('evocation', 'Evocação', 'Evocation'),
          f('potentCantrip', 'Truque Potente', 'Potent Cantrip',
            "Seus truques que causam dano afetam até mesmo criaturas que evitam o impacto principal do efeito. Quando você conjura um truque contra uma criatura e erra a jogada de ataque ou o alvo obtém sucesso em uma salvaguarda contra o truque, o alvo sofre metade do dano do truque (se houver), mas não sofre nenhum efeito adicional do truque.",
            "Your damaging cantrips affect even creatures that avoid the brunt of the effect. When you cast a cantrip at a creature and you miss with the attack roll or the target succeeds on a saving throw against the cantrip, the target takes half the cantrip's damage (if any) but suffers no additional effect from the cantrip."),
        ],
      },
      6: {
        features: [
          f('sculptSpells', 'Esculpir Magias', 'Sculpt Spells',
            'Ao conjurar uma magia de evocação que afete outras criaturas que você vê, escolha até 1 + o nível da magia delas. Elas passam automaticamente nas salvaguardas contra a magia e não sofrem dano se normalmente sofreriam metade.',
            'When you cast an Evocation spell that affects other creatures you can see, choose up to 1 + the spell\'s level of them. They automatically succeed on their saves against it and take no damage if they would normally take half.'),
        ],
      },
      10: {
        features: [
          f('empoweredEvocation', 'Evocação Fortalecida', 'Empowered Evocation',
            'Ao conjurar uma magia de Mago da escola de Evocação, você soma seu modificador de Inteligência a uma rolagem de dano dela.',
            'Whenever you cast a Wizard spell from the Evocation school, you can add your Intelligence modifier to one damage roll of that spell.'),
        ],
      },
      14: {
        features: [
          f('overchannel', 'Sobrecarga', 'Overchannel',
            'Ao conjurar uma magia de Mago que causa dano com espaço de nível 1 a 5, você pode causar o dano máximo no turno da conjuração. O primeiro uso não tem custo; cada uso seguinte antes de um descanso longo causa a você 2d12 de dano necrótico por nível do espaço, +1d12 por nível a cada uso extra. Esse dano ignora Resistência e Imunidade.',
            'When you cast a damaging Wizard spell with a level 1–5 slot, you can deal maximum damage with it on that turn. The first use is free; each later use before a Long Rest deals you 2d12 Necrotic damage per slot level, +1d12 per level for each further use. This damage ignores Resistance and Immunity.'),
        ],
      },
    },
  },

  illusion: {
    name: b('Ilusionista', 'Illusionist'),
    source: 'PHB24',
    desc: b('Engana os sentidos e a mente, a ponto de tornar ilusões reais.', 'Deceives senses and minds, to the point of making illusions real.'),
    levels: {
      3: {
        features: [
          SAVANT_2024('illusion', 'Ilusão', 'Illusion'),
          f('improvedIllusions', 'Ilusões Aprimoradas', 'Improved Illusions',
            "Você pode conjurar magias de Ilusão sem fornecer componentes Verbais e, se uma magia de Ilusão que você conjurar tiver um alcance de 3 metros ou mais, o alcance aumenta em 18 metros.\n\nVocê também conhece o truque Ilusão Menor. Se você já o conhece, aprende um truque de Mago diferente à sua escolha. O truque não conta contra o seu número de truques conhecidos. Você pode criar\n\nfornecer componentes Verbais e, se uma magia de Ilusão que você conjurar tiver um alcance de 3 metros ou mais, o alcance aumenta em 18 metros.\n\nVocê também conhece o truque Ilusão Menor. Se você já o conhece, aprende um truque de Mago diferente à sua escolha. O truque não conta contra o seu número de truques conhecidos. Você pode criar tanto um som quanto uma imagem com uma única conjuração de Ilusão Menor, e pode conjurá-la como uma Ação Bônus.",
            "You can cast Illusion spells without providing Verbal components, and if an Illusion spell you cast has a range of 10+ feet, the range increases by 60 feet.\n\nYou also know the Minor Illusion cantrip. If you already know it, you learn a different Wizard cantrip of your choice. The cantrip doesn't count against your number of cantrips known. You can create\n\nproviding Verbal components, and if an Illusion spell you cast has a range of 10+ feet, the range increases by 60 feet.\n\nYou also know the Minor Illusion cantrip. If you already know it, you learn a different Wizard cantrip of your choice. The cantrip doesn't count against your number of cantrips known. You can create both a sound and an image with a single casting of Minor Illusion, and you can cast it as a Bonus Action."),
        ],
      },
      6: {
        features: [
          f('phantasmalCreatures', 'Criaturas Fantasmagóricas', 'Phantasmal Creatures',
            'Invocar Besta e Invocar Fada ficam sempre preparadas. Ao conjurá-las, você pode mudar a escola para Ilusão, e a criatura surge espectral. Uma vez por descanso longo, pode conjurar a versão ilusória de uma delas sem gastar espaço; nesse caso a criatura tem metade dos PV.',
            'You always have Summon Beast and Summon Fey prepared. When you cast either, you can change its school to Illusion, making the creature look spectral. Once per Long Rest you can cast the Illusion version of one of them without a slot; the creature then has half its Hit Points.'),
        ],
        autoSpells: ['summonBeast', 'summonFey'],
      },
      10: {
        features: [
          f('illusorySelf', 'Eu Ilusório', 'Illusory Self',
            'Quando uma criatura acertar você com uma jogada de ataque, você pode usar sua Reação para interpor uma duplicata ilusória: o ataque erra automaticamente. Uma vez por descanso curto ou longo; também pode recuperar o uso gastando um espaço de magia de nível 2 ou mais.',
            'When a creature hits you with an attack roll, you can take a Reaction to interpose an illusory duplicate: the attack automatically misses. Once per Short or Long Rest; you can also restore the use by expending a level 2+ spell slot.'),
        ],
      },
      14: {
        features: [
          f('illusoryReality', 'Realidade Ilusória', 'Illusory Reality',
            "No 14º nível, você aprendeu o segredo de tecer magia das sombras em suas ilusões para dar a elas uma quase-realidade. Quando conjura uma magia de ilusão de 1º círculo ou superior, você pode escolher um objeto inanimado e não mágico que faça parte da ilusão e torná-lo real. Você pode fazer isso em seu turno como uma ação bônus enquanto a magia estiver ativa. O objeto permanece real por 1 minuto. Por exemplo, você pode criar a ilusão de uma ponte sobre um abismo e torná-la real pelo tempo suficiente para seus aliados atravessarem.\n\nO objeto não pode causar dano nem prejudicar diretamente ninguém de qualquer outra forma.",
            "By 14th level, you have learned the secret of weaving shadow magic into your illusions to give them a semireality. When you cast an illusion spell of 1st level or higher, you can choose one inanimate, nonmagical object that is part of the illusion and make that object real. You can do this on your turn as a bonus action while the spell is ongoing. The object remains real for 1 minute. For example, you can create an illusion of a bridge over a chasm and then make it real long enough for your allies to cross.\n\nThe object can’t deal damage or otherwise directly harm anyone."),
        ],
      },
    },
  },

  // ----- PHB 2014 (sem reedição em 2024): traços de nível 2 → 3 -----
  conjuration: {
    name: b('Escola de Conjuração', 'School of Conjuration'),
    source: 'PHB',
    desc: b('Cria objetos, invoca criaturas e teleporta a curta distância.', 'Creates objects, summons creatures, and teleports short distances.'),
    levels: {
      3: {
        features: [
          f("conjurationSavant", "Sábio da Conjuração", "Conjuration Savant", "A partir do momento em que escolhe esta escola no 2º nível, o ouro e o tempo que você deve gastar para copiar uma magia de conjuração para o seu grimório são reduzidos pela metade.", "Beginning when you select this school at 2nd level, the gold and time you must spend to copy a conjuration spell into your spellbook is halved."),
          f('minorConjuration', 'Conjuração Menor', 'Minor Conjuration',
            "A partir do 2º nível, quando você escolhe esta escola, você pode usar sua ação para conjurar um objeto inanimado em sua mão ou no chão em um espaço desocupado que você possa ver a até 3 metros de você. Este objeto não pode ter mais do que 90 centímetros de lado e não pode pesar mais de 4,5 kg, e sua forma deve ser a de um objeto não mágico que você já tenha visto. O objeto é visivelmente mágico, irradiando luz penumbrosa a até 1,5 metro.\n\nO objeto desaparece após 1 hora, quando você usa esta característica novamente, ou se sofrer ou causar qualquer dano.",
            "Starting at 2nd level when you select this school, you can use your action to conjure up an inanimate object in your hand or on the ground in an unoccupied space that you can see within 10 feet of you. This object can be no larger than 3 feet on a side and weigh no more than 10 pounds, and its form must be that of a nonmagical object that you have seen. The object is visibly magical, radiating dim light out to 5 feet.\n\nThe object disappears after 1 hour, when you use this feature again, or if it takes or deals any damage."),
        ],
      },
      6: {
        features: [
          f('benignTransposition', 'Transposição Benigna', 'Benign Transposition',
            "A partir do 6º nível, você pode usar sua ação para se teletransportar a até 9 metros para um espaço desocupado que você possa ver. Como alternativa, você pode escolher um espaço dentro do alcance que esteja ocupado por uma criatura Pequena ou Média. Se essa criatura for voluntária, ambos se teletransportam, trocando de lugar.\n\nDepois de usar esta característica, você não pode usá-la novamente até terminar um descanso longo ou conjurar uma magia de conjuração de 1º círculo ou superior.",
            "Starting at 6th level, you can use your action to teleport up to 30 feet to an unoccupied space that you can see. Alternatively, you can choose a space within range that is occupied by a Small or Medium creature. If that creature is willing, you both teleport, swapping places.\n\nOnce you use this feature, you can’t use it again until you finish a long rest or you cast a conjuration spell of 1st level or higher."),
        ],
      },
      10: {
        features: [
          f('focusedConjuration', 'Conjuração Focada', 'Focused Conjuration',
            "A partir do 10º nível, enquanto estiver se concentrando em uma magia de conjuração, sua concentração não pode ser interrompida em decorrência de sofrer dano.",
            "Beginning at 10th level, while you are concentrating on a conjuration spell, your concentration can’t be broken as a result of taking damage."),
        ],
      },
      14: {
        features: [
          f('durableSummons', 'Invocações Duráveis', 'Durable Summons',
            "A partir do 14º nível, qualquer criatura que você invocar ou criar com uma magia de conjuração ganha 30 pontos de vida temporários.",
            "Starting at 14th level, any creature that you summon or create with a conjuration spell has 30 temporary hit points."),
        ],
      },
    },
  },

  enchantment: {
    name: b('Escola de Encantamento', 'School of Enchantment'),
    source: 'PHB',
    desc: b('Influencia mentes e redireciona ameaças.', 'Influences minds and redirects threats.'),
    levels: {
      3: {
        features: [
          f("enchantmentSavant", "Sábio do Encantamento", "Enchantment Savant", "A partir do momento em que escolhe esta escola no 2º nível, o ouro e o tempo que você deve gastar para copiar uma magia de encantamento para o seu grimório são reduzidos pela metade.", "Beginning when you select this school at 2nd level, the gold and time you must spend to copy an enchantment spell into your spellbook is halved."),
          f('hypnoticGaze', 'Olhar Hipnótico', 'Hypnotic Gaze',
            "A partir do 2º nível, quando você escolhe esta escola, suas palavras suaves e olhar encantador podem fascinar magicamente outra criatura. Com uma ação, escolha uma criatura que você possa ver a até 1,5 metro de você. Se o alvo puder vê-lo ou ouvi-lo, ele deve ser bem-sucedido em uma salvaguarda de Sabedoria contra a CD das suas magias de mago ou ficará enfeitiçado por você até o final do seu próximo turno. O deslocamento da criatura enfeitiçada cai para 0, e a criatura fica incapacitada e visivelmente atordoada.\n\nNos turnos subsequentes, você pode usar sua ação para manter este efeito, estendendo sua duração até o final do seu próximo turno. No entanto, o efeito termina se você se mover para mais de 1,5 metro de distância da criatura, se a criatura não puder ver nem ouvir você, ou se a criatura sofrer dano.\n\nQuando o efeito terminar, ou se a criatura obtiver sucesso em sua salvaguarda inicial contra este efeito, você não poderá usar esta característica nessa criatura novamente até terminar um descanso longo.",
            "Starting at 2nd level when you choose this school, your soft words and enchanting gaze can magically enthrall another creature. As an action, choose one creature that you can see within 5 feet of you. If the target can see or hear you, it must succeed on a Wisdom saving throw against your wizard spell save DC or be charmed by you until the end of your next turn. The charmed creature’s speed drops to 0, and the creature is incapacitated and visibly dazed.\n\nOn subsequent turns, you can use your action to maintain this effect, extending its duration until the end of your next turn. However, the effect ends if you move more than 5 feet away from the creature, if the creature can neither see nor hear you, or if the creature takes damage.\n\nOnce the effect ends, or if the creature succeeds on its initial saving throw against this effect, you can’t use this feature on that creature again until you finish a long rest."),
        ],
      },
      6: {
        features: [
          f('instinctiveCharm', 'Encanto Instintivo', 'Instinctive Charm',
            "A partir do 6º nível, quando uma criatura que você possa ver a até 9 metros de você fizer uma jogada de ataque contra você, você pode usar sua reação para desviar o ataque, desde que outra criatura esteja dentro do alcance do ataque. O atacante deve fazer uma salvaguarda de Sabedoria contra a CD de suas magias de mago. Se falhar na salvaguarda, o atacante deve alvejar a criatura que estiver mais próxima dele, não incluindo você nem a si mesmo. Se várias criaturas estiverem igualmente próximas, o atacante escolhe qual alvejar. Se obtiver sucesso na salvaguarda, você não pode usar esta característica no atacante novamente até terminar um descanso longo.\n\nVocê deve escolher usar esta característica antes de saber se o ataque acerta ou erra. Criaturas que não podem ser enfeitiçadas são imunes a este efeito.",
            "Beginning at 6th level, when a creature you can see within 30 feet of you makes an attack roll against you, you can use your reaction to divert the attack, provided that another creature is within the attack’s range. The attacker must make a Wisdom saving throw against your wizard spell save DC. On a failed save, the attacker must target the creature that is closest to it, not including you or itself. If multiple creatures are closest, the attacker chooses which one to target. On a successful save, you can’t use this feature on the attacker again until you finish a long rest.\n\nYou must choose to use this feature before knowing whether the attack hits or misses. Creatures that can’t be charmed are immune to this effect."),
        ],
      },
      10: {
        features: [
          f('splitEnchantment', 'Encantamento Dividido', 'Split Enchantment',
            "A partir do 10º nível, quando você conjura uma magia de encantamento de 1º círculo ou superior que tenha apenas uma criatura como alvo, você pode fazer com que ela tenha uma segunda criatura como alvo.",
            "Starting at 10th level, when you cast an enchantment spell of 1st level or higher that targets only one creature, you can have it target a second creature."),
        ],
      },
      14: {
        features: [
          f('alterMemories', 'Alterar Memórias', 'Alter Memories',
            'Quando você conjura uma magia de encantamento para Enfeitiçar criaturas, uma delas não percebe que foi enfeitiçada. Antes de a magia acabar, com uma Ação, você pode fazê-la esquecer parte do tempo em que esteve enfeitiçada: salvaguarda de Inteligência ou perde até 1 + seu mod. de CAR horas de memória.',
            'When you cast an Enchantment spell to Charm creatures, one of them doesn\'t realize it was charmed. Before the spell ends, as an Action, you can make it forget some of that time: it makes an Intelligence save or loses up to 1 + your CHA modifier hours of memory.'),
        ],
      },
    },
  },

  necromancy: {
    name: b('Escola de Necromancia', 'School of Necromancy'),
    source: 'PHB',
    desc: b('Estuda as forças da vida e da morte e comanda mortos-vivos.', 'Studies the forces of life and death and commands undead.'),
    levels: {
      3: {
        features: [
          f("necromancySavant", "Sábio da Necromancia", "Necromancy Savant", "A partir do momento em que escolhe esta escola no 2º nível, o ouro e o tempo que você deve gastar para copiar uma magia de necromancia para o seu grimório são reduzidos pela metade.", "Beginning when you select this school at 2nd level, the gold and time you must spend to copy a necromancy spell into your spellbook is halved."),
          f('grimHarvest', 'Colheita Sinistra', 'Grim Harvest',
            "No 2º nível, você ganha a capacidade de ceifar a energia vital de criaturas que matar com suas magias. Uma vez por turno, quando você mata uma ou mais criaturas com uma magia de 1º círculo ou superior, você recupera pontos de vida iguais ao dobro do círculo da magia, ou o triplo do círculo se a magia pertencer à Escola de Necromancia. Você não ganha esse benefício por matar constructos ou mortos-vivos.",
            "At 2nd level, you gain the ability to reap life energy from creatures you kill with your spells. Once per turn when you kill one or more creatures with a spell of 1st level or higher, you regain hit points equal to twice the spell’s level, or three times its level if the spell belongs to the School of Necromancy. You don’t gain this benefit for killing constructs or undead."),
        ],
      },
      6: {
        features: [
          f('undeadThralls', 'Servos Mortos-Vivos', 'Undead Thralls',
            'Animar Mortos entra de graça no seu grimório. Ao conjurá-la, você pode animar um alvo adicional. Mortos-vivos criados por suas magias de necromancia somam seu nível de Mago aos PV máximos e seu bônus de proficiência ao dano das armas.',
            'Animate Dead is added to your spellbook for free. When you cast it, you can target one additional corpse or pile of bones. Undead you create with your Necromancy spells add your Wizard level to their Hit Point maximum and your Proficiency Bonus to weapon damage.'),
        ],
      },
      10: {
        features: [
          f('inuredToUndeath', 'Calejado contra a Morte-Vida', 'Inured to Undeath',
            "A partir do 10º nível, você tem resistência a dano necrótico, e seu ponto de vida máximo não pode ser reduzido. Você passou tanto tempo lidando com mortos-vivos e as forças que os animam que se acostumou com alguns de seus piores efeitos.",
            "Beginning at 10th level, you have resistance to necrotic damage, and your hit point maximum can't be reduced. You have spent so much time dealing with undead and the forces that animate them that you have become inured to some of their worst effects."),
        ],
      },
      14: {
        features: [
          f('commandUndead', 'Comandar Mortos-Vivos', 'Command Undead',
            "A partir do 14º nível, você pode usar magia para colocar mortos-vivos sob o seu controle, mesmo aqueles criados por outros magos. Como uma ação, você pode escolher um morto-vivo que possa ver a até 18 metros de você. Essa criatura deve fazer uma salvaguarda de Carisma contra a CD de suas magias de mago. Se obtiver sucesso, você não pode usar esta característica nela novamente. Se falhar, ela se torna amistosa a você e obedece aos seus comandos até que você use esta característica novamente.\n\nMortos-vivos inteligentes são mais difíceis de controlar dessa maneira. Se o alvo tiver Inteligência 8 ou superior, ele tem vantagem na salvaguarda. Se falhar na salvaguarda e tiver Inteligência 12 ou superior, ele pode repetir a salvaguarda ao final de cada hora até obter sucesso e se libertar.",
            "Starting at 14th level, you can use magic to bring undead under your control, even those created by other wizards. As an action, you can choose one undead that you can see within 60 feet of you. That creature must make a Charisma saving throw against your wizard spell save DC. If it succeeds, you can’t use this feature on it again. If it fails, it becomes friendly to you and obeys your commands until you use this feature again.\n\nIntelligent undead are harder to control in this way. If the target has an Intelligence of 8 or higher, it has advantage on the saving throw. If it fails the saving throw and has an Intelligence of 12 or higher, it can repeat the saving throw at the end of every hour until it succeeds and breaks free."),
        ],
      },
    },
  },

  transmutation: {
    name: b('Escola de Transmutação', 'School of Transmutation'),
    source: 'PHB',
    desc: b('Transforma matéria e forma; cria a Pedra do Transmutador.', "Transforms matter and form; crafts the Transmuter's Stone."),
    levels: {
      3: {
        features: [
          f("transmutationSavant", "Sábio da Transmutação", "Transmutation Savant", "A partir do momento em que escolhe esta escola no 2º nível, o ouro e o tempo que você deve gastar para copiar uma magia de transmutação para o seu grimório são reduzidos pela metade.", "Beginning when you select this school at 2nd level, the gold and time you must spend to copy a transmutation spell into your spellbook is halved."),
          f('minorAlchemy', 'Alquimia Menor', 'Minor Alchemy',
            'Você altera temporariamente um objeto de madeira, pedra (não preciosa), ferro, cobre ou prata para outro desses materiais. Cada 10 minutos de trabalho transforma até 30 cm³ (1 pé cúbico). A mudança dura 1 hora ou até você perder a Concentração (como numa magia).',
            'You temporarily change an object made of wood, stone (not gemstone), iron, copper, or silver into another of those materials. Each 10 minutes of work transforms up to 1 cubic foot. It lasts 1 hour or until you lose Concentration (as if on a spell).'),
        ],
      },
      6: {
        features: [
          f('transmutersStone', 'Pedra do Transmutador', "Transmuter's Stone",
            'Com 8 horas de trabalho, você cria uma pedra que concede um benefício a quem a carrega: Visão no Escuro 18 m, +3 m de deslocamento, proficiência em salvaguardas de CON, ou resistência a ácido, frio, fogo, elétrico ou trovão. Ao conjurar uma magia de transmutação de nível 1+ com a pedra, pode trocar o benefício. Criar uma nova desfaz a anterior.',
            'With 8 hours of work you craft a stone that grants its bearer one benefit: 60 ft darkvision, +10 ft speed, Constitution save proficiency, or resistance to acid, cold, fire, lightning, or thunder. When you cast a level 1+ Transmutation spell while holding it, you can change the benefit. Making a new one ends the old.'),
        ],
      },
      10: {
        features: [
          f('shapechanger', 'Metamorfo', 'Shapechanger',
            "No 10º nível, você adiciona a magia metamorfose ao seu grimório, caso ela ainda não esteja lá. Você pode conjurar metamorfose sem gastar um espaço de magia. Quando o fizer, você pode ter apenas a si mesmo como alvo e se transformar em uma besta cujo nível de desafio seja 1 ou menor.\n\nUma vez que conjure metamorfose dessa forma, você não poderá fazê-lo novamente até terminar um descanso curto ou longo, embora ainda possa conjurá-la normalmente usando um espaço de magia disponível.",
            "At 10th level, you add the polymorph spell to your spellbook, if it is not there already. You can cast polymorph without expending a spell slot. When you do so, you can target only yourself and transform into a beast whose challenge rating is 1 or lower.\n\nOnce you cast polymorph in this way, you can’t do so again until you finish a short or long rest, though you can still cast it normally using an available spell slot."),
        ],
      },
      14: {
        features: [
          f('masterTransmuter', 'Mestre Transmutador', 'Master Transmuter',
            'Com uma Ação, destrua sua Pedra do Transmutador para um destes efeitos: Grande Transformação (transforma um objeto não mágico de até 1,5 m de lado em outro de tamanho e massa parecidos, com 10 minutos de trabalho); Panaceia (uma criatura tocada perde maldições, doenças e venenos e recupera todos os PV); Restaurar Vida (conjura Reviver os Mortos sem espaço nem componente material); Restaurar Juventude (a idade aparente de uma criatura tocada cai 3d10 anos, mínimo 13). Só pode criar outra pedra após um descanso longo.',
            'As an Action, destroy your Transmuter\'s Stone for one effect: Major Transformation (turn a nonmagical object up to 5 feet on a side into another of similar size and mass, with 10 minutes of work); Panacea (a touched creature loses curses, diseases, and poisons and regains all HP); Restore Life (cast Raise Dead without a slot or material components); Restore Youth (a touched creature\'s apparent age drops by 3d10 years, minimum 13). You can make a new stone only after a Long Rest.'),
        ],
      },
    },
  },

  // ----- Suplementos (regras 2014): traços de nível 2 → 3 -----
  bladesinging: {
    name: b('Canção da Lâmina', 'Bladesinging'),
    source: 'TCE',
    desc: b('Une magia arcana e esgrima numa dança de combate ágil (TCE; reimpressão do SCAG).', 'Blends arcane magic and swordplay into an agile combat dance (TCE; reprinted from SCAG).'),
    levels: {
      3: {
        features: [
          f('trainingInWarAndSong', 'Treinamento em Guerra e Canção', 'Training in War and Song',
            "Quando você adota esta tradição no 2º nível, ganha proficiência com armaduras leves e ganha proficiência com um tipo de arma corpo a corpo de uma mão à sua escolha.\n\nVocê também ganha proficiência na perícia Atuação se ainda não a tiver.",
            "When you adopt this tradition at 2nd level, you gain proficiency with light armor, and you gain proficiency with one type of one-handed melee weapon of your choice.\n\nYou also gain proficiency in the Performance skill if you don’t already have it."),
          f('bladesong', 'Canção da Lâmina', 'Bladesong',
            "A partir do 2º nível, você pode invocar uma magia élfica secreta chamada Canção da Lâmina, desde que não esteja vestindo armadura média ou pesada nem usando um escudo. Ela agracia você com velocidade, agilidade e foco sobrenaturais.\n\nVocê pode usar uma ação bônus para iniciar a Canção da Lâmina, que dura 1 minuto. Ela termina mais cedo se você ficar incapacitado, se vestir armadura média ou pesada ou um escudo, ou se usar as duas mãos para fazer um ataque com uma arma. Você também pode encerrar a Canção da Lâmina a qualquer momento à sua escolha (nenhuma ação necessária).\n\nEnquanto sua Canção da Lâmina estiver ativa, você ganha os seguintes benefícios:\n\n• Você ganha um bônus na sua CA igual ao seu modificador de Inteligência (mínimo de +1).\n\n• Seu deslocamento de caminhada aumenta em 3 metros.\n\n• Você tem vantagem em testes de Destreza (Acrobacia).\n\n• Você ganha um bônus em qualquer salvaguarda de Constituição feita para manter sua concentração em uma magia. O bônus é igual ao seu modificador de Inteligência (mínimo de +1).\n\nVocê pode usar esta característica um número de vezes igual ao seu bônus de proficiência, e recupera todos os usos gastos ao terminar um descanso longo.",
            "Starting at 2nd level, you can invoke a secret elven magic called the Bladesong, provided that you aren’t wearing medium or heavy armor or using a shield. It graces you with supernatural speed, agility, and focus.\n\nYou can use a bonus action to start the Bladesong, which lasts for 1 minute. It ends early if you are incapacitated, if you don medium or heavy armor or a shield, or if you use two hands to make an attack with a weapon. You can also dismiss the Bladesong at any time you choose (no action required).\n\nWhile your Bladesong is active, you gain the following benefits:\n\n• You gain a bonus to your AC equal to your Intelligence modifier (minimum of +1).\n\n• Your walking speed increases by 10 feet.\n\n• You have advantage on Dexterity (Acrobatics) checks .\n\n• You gain a bonus to any Constitution saving throw you make to maintain your concentration on a spell. The bonus equals your Intelligence modifier (minimum of +l).\n\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses of it when you finish a long rest."),
        ],
      },
      6: {
        features: [
          f('extraAttack', 'Ataque Extra', 'Extra Attack',
            "Característica de 6º nível do Dançarino da Lâmina\n\nVocê pode atacar duas vezes, em vez de uma, sempre que realizar a ação Atacar em seu turno. Além disso, você pode conjurar um de seus truques no lugar de um desses ataques.",
            "6th-level Bladesinging feature\n\nYou can attack twice, instead of once, whenever you take the Attack action on your turn. Moreover, you can cast one of your cantrips in place of one of those attacks."),
        ],
        extraAttacks: 1,
      },
      10: {
        features: [
          f('songOfDefense', 'Canção da Defesa', 'Song of Defense',
            "Característica de 10º nível do Dançarino da Lâmina\n\nVocê pode direcionar sua magia para absorver dano enquanto sua Canção da Lâmina estiver ativa. Quando você sofrer dano, pode usar sua reação para gastar um espaço de magia e reduzir esse dano a você em uma quantidade igual a cinco vezes o círculo do espaço de magia.",
            "10th-level Bladesinging feature\n\nYou can direct your magic to absorb damage while your Bladesong is active. When you take damage, you can use your reaction to expend one spell slot and reduce that damage to you by an amount equal to five times the spell slot's level."),
        ],
      },
      14: {
        features: [
          f('songOfVictory', 'Canção da Vitória', 'Song of Victory',
            "Característica de 14º nível do Dançarino da Lâmina\n\nVocê pode adicionar seu modificador de Inteligência (mínimo de +1) ao dano dos seus ataques corpo a corpo com arma enquanto sua Canção da Lâmina estiver ativa.",
            "14th-level Bladesinging feature\n\nYou can add your Intelligence modifier (minimum of +1) to the damage of your melee weapon attacks while your Bladesong is active."),
        ],
      },
    },
  },

  warmagic: {
    name: b('Magia de Guerra', 'War Magic'),
    source: 'XGE',
    desc: b('Mistura abjuração e evocação para o campo de batalha.', 'Blends abjuration and evocation for the battlefield.'),
    levels: {
      3: {
        features: [
          f('arcaneDeflection', 'Deflexão Arcana', 'Arcane Deflection',
            "No 2º nível, você aprendeu a tecer sua magia para se proteger contra ferimentos. Quando for atingido por um ataque ou falhar em uma salvaguarda, você pode usar sua reação para ganhar um bônus de +2 na sua CA contra aquele ataque ou um bônus de +4 naquela salvaguarda.\n\nAo usar esta característica, você não pode conjurar magias que não sejam truques até o final do seu próximo turno.",
            "At 2nd level, you have learned to weave your magic to fortify yourself against harm. When you are hit by an attack or you fail a saving throw, you can use your reaction to gain a +2 bonus to your AC against that attack or a +4 bonus to that saving throw.\n\nWhen you use this feature, you can’t cast spells other than cantrips until the end of your next turn."),
          f('tacticalWit', 'Perspicácia Tática', 'Tactical Wit',
            "A partir do 2º nível, sua habilidade aguçada de avaliar situações táticas permite que você aja rapidamente em batalha. Você pode conceder a si mesmo um bônus em suas jogadas de iniciativa igual ao seu modificador de Inteligência.",
            "Starting at 2nd level, your keen ability to assess tactical situations allows you to act quickly in battle. You can give yourself a bonus to your initiative rolls equal to your Intelligence modifier."),
        ],
      },
      6: {
        features: [
          f('powerSurge', 'Surto de Poder', 'Power Surge',
            'Você acumula surtos de poder (máximo = mod. de INT, mín. 1); começa cada descanso longo com 1. Ganha um ao encerrar uma magia com Dissipar Magia ou Contramágica, e um ao terminar um descanso curto sem nenhum. Uma vez por turno, ao causar dano com uma magia de Mago, gaste um surto para causar dano de energia extra igual a metade do seu nível de Mago a um alvo.',
            'You store power surges (maximum = INT modifier, min 1) and start each Long Rest with 1. You gain one when you end a spell with Dispel Magic or Counterspell, and one when you finish a Short Rest with none. Once per turn, when you deal damage with a Wizard spell, spend one to deal extra Force damage equal to half your Wizard level to one target.'),
        ],
      },
      10: {
        features: [
          f('durableMagic', 'Magia Durável', 'Durable Magic',
            "A partir do 10º nível, a magia que você canaliza ajuda a afastar o perigo. Enquanto mantiver a concentração em uma magia, você tem um bônus de +2 na CA e em todas as salvaguardas.",
            "Beginning at 10th level, the magic you channel helps ward off harm. While you maintain concentration on a spell, you have a +2 bonus to AC and all saving throws."),
        ],
      },
      14: {
        features: [
          f('deflectingShroud', 'Mortalha Defletora', 'Deflecting Shroud',
            "No 14º nível, sua Deflexão Arcana fica impregnada de magia letal. Quando usa sua característica Deflexão Arcana, você pode fazer com que energia mágica se projete de você. Até três criaturas à sua escolha que você possa ver a até 18 metros de você sofrem, cada uma, dano de força igual à metade do seu nível de mago.",
            "At 14th level, your Arcane Deflection becomes infused with deadly magic. When you use your Arcane Deflection feature, you can cause magical energy to arc from you. Up to three creatures of your choice that you can see within 60 feet of you each take force damage equal to half your wizard level."),
        ],
      },
    },
  },

  scribes: {
    name: b('Ordem dos Escribas', 'Order of Scribes'),
    source: 'TCE',
    desc: b('O grimório desperta e se torna um aliado mágico.', 'Your spellbook awakens and becomes a magical ally.'),
    levels: {
      3: {
        features: [
          f('wizardlyQuill', 'Pena Mágica', 'Wizardly Quill',
            "Característica de 2º nível da Ordem dos Escribas\n\nComo uma ação bônus, você pode criar magicamente uma pena Miúda em sua mão livre. A pena mágica possui as seguintes propriedades:\n\n• A pena não precisa de tinta. Ao escrever com ela, ela produz tinta na cor de sua escolha na superfície de escrita.\n\n• O tempo necessário para copiar uma magia em seu grimório é de 2 minutos por círculo da magia se você usar a pena para a transcrição.\n\n• Você pode apagar qualquer coisa que tenha escrito com a pena se passar a pluma sobre o texto como uma ação bônus, desde que o texto esteja a até 1,5 metro de você.\n\ne na superfície de escrita.\n\nEsta pena desaparece se você criar outra ou se morrer.",
            "2nd-level Order of Scribes feature\n\nAs a bonus action, you can magically create a Tiny quill in your free hand. The magic quill has the following properties:\n\n• The quill doesn’t require ink. When you write with it, it produces ink in a color of your choice on the writing surface.\n\n• The time you must spend to copy a spell into your spellbook equals 2 minutes per spell level if you use the quill for the transcription.\n\n• You can erase anything you write with the quill if you wave the feather over the text as a bonus action, provided the text is within 5 feet of you.\n\ne on the writing surface.\n\nThis quill disappears if you create another one or if you die."),
          f('awakenedSpellbook', 'Grimório Desperto', 'Awakened Spellbook',
            'O grimório serve de foco de conjuração. Ao conjurar uma magia de Mago com espaço, você pode trocar o tipo de dano dela pelo de outra magia do grimório do mesmo nível. Uma vez por descanso longo, pode conjurar um ritual no tempo normal de conjuração em vez do tempo de ritual.',
            'Your spellbook is a spellcasting focus. When you cast a Wizard spell with a slot, you can swap its damage type for that of another spell of the same level in the book. Once per Long Rest, you can cast a ritual at its normal casting time instead of the ritual time.'),
        ],
      },
      6: {
        features: [
          f('manifestMind', 'Mente Manifesta', 'Manifest Mind',
            "Característica de 6º nível da Ordem dos Escribas\n\nVocê pode conjurar a mente do seu Grimório Desperto. Como uma ação bônus enquanto o livro estiver consigo, você pode fazer com que a mente se manifeste como um objeto espectral Miúdo, pairando em um espaço desocupado à sua escolha a até 18 metros de você. A mente espectral é intangível e não ocupa seu espaço, emitindo luz fraca em um raio de 3 metros. Ela se parece com um tomo fantasmagórico, uma cascata de texto ou um erudito do passado (à sua escolha).\n\nEnquanto manifestada, a mente espectral pode ouvir e ver, possuindo visão no escuro com alcance de 18 metros. A mente pode compartilhar telepaticamente com você o que vê e ouve (nenhuma ação necessária).\n\nSempre que você conjurar uma magia de mago em seu turno, pode conjurá-la como se estivesse no espaço da mente espectral, em vez do seu, usando os sentidos dela. Você pode fazer isso um número de vezes por dia igual ao seu bônus de proficiência, e recupera todos os usos gastos ao terminar um descanso longo.\n\nComo uma ação bônus, você pode fazer a mente espectral pairar até 9 metros para um espaço desocupado que você ou ela possam ver. Ela pode passar através de criaturas, mas não de objetos.\n\nA mente espectral deixa de se manifestar se estiver a mais de 90 metros de você, se alguém conjurar dissipar magia nela, se o Grimório Desperto for destruído, se você morrer ou se dispensar a mente espectral como uma ação bônus.\n\nDepois de conjurar a mente, você não pode fazê-lo novamente até terminar um descanso longo, a menos que gaste um espaço de magia de qualquer círculo para conjurá-la novamente.",
            "6th-level Order of Scribes feature\n\nYou can conjure forth the mind of your Awakened Spellbook. As a bonus action while the book is on your person, you can cause the mind to manifest as a Tiny spectral object, hovering in an unoccupied space of your choice within 60 feet of you. The spectral mind is intangible and doesn’t occupy its space, and it sheds dim light in a 10-foot radius. It looks like a ghostly tome, a cascade of text, or a scholar from the past (your choice).\n\nWhile manifested, the spectral mind can hear and see, and it has darkvision with a range of 60 feet. The mind can telepathically share with you what it sees and hears (no action required).\n\nWhenever you cast a wizard spell on your turn, you can cast it as if you were in the spectral mind’s space, instead of your own, using its senses. You can do so a number of times per day equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.\n\nAs a bonus action, you can cause the spectral mind to hover up to 30 feet to an unoccupied space that you or it can see. It can pass through creatures but not objects.\n\nThe spectral mind stops manifesting if it is ever more than 300 feet away from you, if someone casts dispel magic on it, if the Awakened Spellbook is destroyed, if you die, or if you dismiss the spectral mind as a bonus action.\n\nOnce you conjure the mind, you can’t do so again until you finish a long rest, unless you expend a spell slot of any level to conjure it again."),
        ],
      },
      10: {
        features: [
          f('masterScrivener', 'Escrivão Mestre', 'Master Scrivener',
            'Ao terminar um descanso longo, você pode criar um pergaminho mágico de uma magia de nível 1 ou 2 do grimório com tempo de conjuração de 1 ação; ele funciona como se a magia fosse 1 nível acima e só você pode lê-lo. Criar pergaminhos de magia comuns custa metade do tempo e do ouro.',
            'When you finish a Long Rest, you can create a magic scroll of a level 1 or 2 spell from your spellbook with a casting time of 1 action; it works as if the spell were 1 level higher, and only you can read it. Crafting ordinary spell scrolls takes half the time and gold.'),
        ],
      },
      14: {
        features: [
          f('oneWithTheWord', 'Um com a Palavra', 'One with the Word',
            'Com a Mente Manifesta ativa, você tem Vantagem em testes de Arcanismo. Quando sofrer dano, pode usar sua Reação para dissipar a Mente e anular esse dano; em troca, role 3d6 e perca temporariamente magias do grimório cujos níveis somem pelo menos esse valor (voltam após 1d6 descansos longos). Uma vez por descanso longo.',
            'While your Manifest Mind is active, you have Advantage on Arcana checks. When you take damage, you can use your Reaction to dismiss the mind and negate that damage; you then roll 3d6 and temporarily lose spells from your book whose levels total at least that much (they return after 1d6 Long Rests). Once per Long Rest.'),
        ],
      },
    },
  },

  chronurgy: {
    name: b('Cronurgia', 'Chronurgy Magic'),
    source: 'EGW',
    desc: b('Dunamancia do tempo: manipula instantes e resultados.', 'Time dunamancy: manipulates moments and outcomes.'),
    levels: {
      3: {
        features: [
          f('chronalShift', 'Desvio Cronal', 'Chronal Shift',
            "Característica de 2º nível da Magia de Cronurgia\n\nVocê pode exercer magicamente um controle limitado sobre o fluxo do tempo ao redor de uma criatura. Como uma reação, depois que você ou uma criatura que você possa ver a até 9 metros de você fizer uma jogada de ataque, um teste de atributo ou uma salvaguarda, você pode forçar a criatura a rolar novamente. Você toma essa decisão depois de ver se a jogada foi bem-sucedida ou falhou. O alvo deve usar o resultado da segunda rolagem.\n\nVocê pode usar esta habilidade duas vezes, e recupera quaisquer usos gastos ao terminar um descanso longo.",
            "2nd-level Chronurgy Magic feature\n\nYou can magically exert limited control over the flow of time around a creature. As a reaction, after you or a creature you can see withing 30 feet of you makes an attack roll, and ability check, or a saving throw, you can force the creature to reroll. You make this decision after you see whether the roll succeeds or fails. The target must use the result of the second roll.\n\nYou can use this ability twice, and you regain any expended uses when you finish a long rest."),
          f('temporalAwareness', 'Consciência Temporal', 'Temporal Awareness',
            "Característica de 2º nível da Magia de Cronurgia\n\nVocê pode adicionar seu modificador de Inteligência às suas jogadas de iniciativa.",
            "2nd-level Chronurgy Magic feature\n\nYou can add your Intelligence modifier to your initiative rolls."),
        ],
      },
      6: {
        features: [
          f('momentaryStasis', 'Estase Momentânea', 'Momentary Stasis',
            "Característica de 6º nível da Magia de Cronurgia\n\nComo uma ação, você pode forçar magicamente uma criatura Grande ou menor que possa ver a até 18 metros de você a fazer uma salvaguarda de Constituição contra a CD de suas magias. A menos que a salvaguarda seja um sucesso, a criatura fica envolta em um campo de energia mágica até o final do seu próximo turno ou até sofrer qualquer dano. Enquanto estiver envolta dessa forma, a criatura fica incapacitada e tem deslocamento 0.\n\nVocê pode usar esta característica um número de vezes igual ao seu modificador de Inteligência (mínimo de uma vez). Você recupera todos os usos gastos ao terminar um descanso longo.",
            "6th-level Chronurgy Magic feature\n\nAs an action, you can magically force a Large or smaller creature you can see within 60 feet of you to make a Constitution saving throw against your spell save DC. Unless the saving throw is a success, the creature is encased in a field of magical energy until the end of your next turn or until the creature takes any damage. While encased in this way, the creature is incapacitated and has a speed of 0.\n\nYou can use this feature a number of times equal to your Intelligence modifier (a minimum of once). You regain all expended uses when you finish a long rest."),
        ],
      },
      10: {
        features: [
          f('arcaneAbeyance', 'Suspensão Arcana', 'Arcane Abeyance',
            'Ao conjurar uma magia de nível 4 ou menor com espaço, você pode congelá-la numa conta cinzenta por 1 hora. Qualquer criatura que segure a conta pode liberá-la com uma Ação, usando suas estatísticas de conjuração. Uma vez por descanso curto ou longo.',
            'When you cast a level 4 or lower spell with a slot, you can freeze it in a gray bead for 1 hour. Any creature holding the bead can release it as an Action, using your spellcasting statistics. Once per Short or Long Rest.'),
        ],
      },
      14: {
        features: [
          f('convergentFuture', 'Futuro Convergente', 'Convergent Future',
            "Característica de 14º nível da Magia de Cronurgia\n\nVocê pode perscrutar futuros possíveis e puxar magicamente um deles para os acontecimentos ao seu redor, garantindo um resultado específico. Quando você ou uma criatura que você possa ver a até 18 metros de você fizer uma jogada de ataque, um teste de atributo ou uma salvaguarda, você pode usar sua reação para ignorar a rolagem do dado e decidir se o número rolado é o mínimo necessário para ter sucesso ou um a menos que esse número (à sua escolha).\n\nQuando você usa esta característica, ganha um nível de exaustão. Apenas ao terminar um descanso longo você pode remover um nível de exaustão ganho dessa maneira.",
            "14th-level Chronurgy Magic feature\n\nYou can peer through possible futures and magically pull one of them into events around you, ensuring a particular outcome. When you are a creature you can see within 60 feet of you makes an attack roll, an ability check, or a saving throw, you can use your reaction to ignore the die roll and decide whether the number rolled is the minimum needed to succeed or one less than that number (your choice).\n\nWhen you use this feature, you gain one level of exhaustion. Only by finishing a long rest can you remove a level of exhaustion gained in this way."),
        ],
      },
    },
  },

  graviturgy: {
    name: b('Graviturgia', 'Graviturgy Magic'),
    source: 'EGW',
    desc: b('Dunamancia da gravidade: altera peso, força e movimento.', 'Gravity dunamancy: alters weight, force, and movement.'),
    levels: {
      3: {
        features: [
          f('adjustDensity', 'Ajustar Densidade', 'Adjust Density',
            "Característica de 2º nível da Magia de Graviturgia\n\nComo uma ação, você pode alterar magicamente o peso de um objeto ou criatura que possa ver a até 9 metros de você. O objeto ou criatura deve ser Grande ou menor. O peso do alvo é reduzido pela metade ou dobrado por até 1 minuto ou até sua concentração terminar (como se estivesse se concentrando em uma magia).\n\nEnquanto o peso de uma criatura estiver reduzido pela metade por este efeito, o deslocamento da criatura aumenta em 3 metros, ela pode saltar duas vezes mais longe que o normal e tem desvantagem em testes de Força e salvaguardas de Força. Enquanto o peso de uma criatura estiver dobrado por este efeito, o deslocamento da criatura é reduzido em 3 metros e ela tem vantagem em testes de Força e salvaguardas de Força.\n\nAo atingir o 10º nível nesta classe, você pode alvejar um objeto ou uma criatura que seja Enorme ou menor.",
            "2nd-level Graviturgy Magic feature\n\nAs an action, you can magically alter the weight of one object or creature you can see within 30 feet of you. The object or creature must be Large or smaller. The target’s weight is halved or doubled for up to 1 minute or until your concentration ends (as if you were concentrating on a spell).\n\nWhile the weight of a creature is halved by this effect, the creature’s speed increases by 10 feet, it can jump twice as far as normal, and it has disadvantage on Strength checks and Strength saving throws. While the weight of a creature is doubled by this effect, the creature’s speed is reduced by 10 feet, and it has advantage on Strength checks and Strength saving throws.\n\nUpon reaching 10th level in this class, you can target an object or a creature that is Huge or smaller."),
        ],
      },
      6: {
        features: [
          f('gravityWell', 'Poço Gravitacional', 'Gravity Well',
            "Característica de 6º nível da Magia de Graviturgia\n\nVocê aprendeu como manipular a gravidade ao redor de um ser vivo: sempre que conjurar uma magia em uma criatura, você pode mover o alvo 1,5 metro para um espaço desocupado à sua escolha se o alvo estiver disposto a se mover, se a magia atingi-lo com um ataque ou se ele falhar em uma salvaguarda contra a magia.",
            "6th-level Graviturgy Magic feature\n\nYou’ve learned how to manipulate gravity around a living being: whenever you cast a spell on a creature, you can move the target 5 feet to an unoccupied space of your choice if the target is willing to move, the spell hits it with an attack, or it fails a saving throw against the spell."),
        ],
      },
      10: {
        features: [
          f('violentAttraction', 'Atração Violenta', 'Violent Attraction',
            "Característica de 10º nível da Magia de Graviturgia\n\nQuando outra criatura que você possa ver a até 18 metros de você acertar com um ataque com arma, você pode usar sua reação para aumentar a velocidade do ataque, fazendo com que o alvo do ataque sofra 1d10 de dano extra do tipo da arma.\n\nComo alternativa, se uma criatura a até 18 metros de você sofrer dano de uma queda, você pode usar sua reação para aumentar o dano da queda em 2d10.\n\nVocê pode usar esta característica um número de vezes igual ao seu modificador de Inteligência (mínimo de uma vez). Você recupera todos os usos gastos ao terminar um descanso longo.",
            "10th-level Graviturgy Magic feature\n\nWhen another creature that you can see within 60 feet of you hits with a weapon attack, you can use your reaction to increase the attack’s velocity, causing the attack’s target to take an extra 1d10 damage of the weapon’s type.\n\nAlternatively, if a creature within 60 feet of you takes damage from a fall, you can use your reaction to increase the fall’s damage by 2d10.\n\nYou can use this feature a number of times equal to your Intelligence modifier (a minimum of once). You regain all expended uses when you finish a long rest."),
        ],
      },
      14: {
        features: [
          f('eventHorizon', 'Horizonte de Eventos', 'Event Horizon',
            "Característica de 14º nível da Magia de Graviturgia\n\nComo uma ação, você pode emitir magicamente um poderoso campo de energia gravitacional que atrai outras criaturas por até 1 minuto ou até sua concentração terminar (como se estivesse se concentrando em uma magia). Durante a duração, sempre que uma criatura hostil a você iniciar o turno dela a até 9 metros de você, ela deve fazer uma salvaguarda de Força contra a CD de suas magias. Se falhar na salvaguarda, sofre 2d10 de dano de força e seu deslocamento é reduzido a 0 até o início do próximo turno dela. Se obtiver sucesso na salvaguarda, sofre metade desse dano, e cada metro que ela se mover neste turno custa 2 metros extras de movimento.\n\nDepois de usar esta característica, você não pode fazê-lo novamente até terminar um descanso longo ou até gastar um espaço de magia de 3º círculo ou superior nela.",
            "14th-level Graviturgy Magic feature\n\nAs an action, you can magically emit a powerful field of gravitation energy that tugs at other creatures for up to 1 minute or until your concentration ends (as if you were concentrating on a spell). For the duration, whenever a creature hostile to you starts its turn within 30 feet of you, it must make a Strength saving throw against your spell save DC. On a failed save, it takes 2d10 force damage, and its speed is reduced to 0 until the start of its next turn. On a successful save, it takes half as much damage, and every foot it moves this turn costs 2 extra feet of movement.\n\nOnce you use this feature, you can’t do so again until you finish a long rest or until you expend a spell slot of 3rd level or higher on it."),
        ],
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Recursos com usos (sem espaços de magia). minLevel é o nível NA CLASSE; nas
// subclasses usa-se 2 (nível da subclasse em 2014) porque em 2024 a subclasse
// só existe a partir do 3 e o filtro `subclass` já barra antes disso.
// ---------------------------------------------------------------------------
const res = (id, pt, en, uses, recharge, minLevel, extra = {}) => ({ id, name: b(pt, en), uses, recharge, minLevel, ...extra });
const ONE = { fixed: 1 };
const INT_MIN1 = { ability: 'int', min: 1 };
const resources = [
  // Classe base
  res('arcaneRecovery', 'Recuperação Arcana', 'Arcane Recovery', ONE, 'long', 1,
    { desc: b('Recupera espaços somando até metade do nível de Mago (arred. p/ cima), nenhum de nível 6+.', 'Recover slots totaling up to half your Wizard level (round up), none level 6+.') }),
  res('signatureSpell1', 'Magia Assinatura (1ª)', 'Signature Spell (1st)', ONE, 'short', 20,
    { desc: b('Conjura a 1ª magia assinatura no nível 3 sem gastar espaço.', 'Cast your first signature spell at level 3 without a slot.') }),
  res('signatureSpell2', 'Magia Assinatura (2ª)', 'Signature Spell (2nd)', ONE, 'short', 20,
    { desc: b('Conjura a 2ª magia assinatura no nível 3 sem gastar espaço.', 'Cast your second signature spell at level 3 without a slot.') }),

  // Abjuração
  res('arcaneWard', 'Proteção Arcana (criar)', 'Arcane Ward (create)', ONE, 'long', 2, { subclass: ['abjuration'] }),
  res('arcaneWardHp', 'Proteção Arcana (PV)', "Arcane Ward (PV)", { perClassLevel: 2 }, 'long', 2, {
    subclass: ['abjuration'],
    desc: b('PV máximos = 2 × nível de Mago + mod. de INT (some o INT à mão). Recupera ao conjurar abjuração.', 'Max HP = 2 × Wizard level + INT modifier (add INT manually). Regains HP when you cast Abjuration spells.'),
  }),
  // Adivinhação
  res('portent', 'Presságio (d20 guardados)', 'Portent (stored d20s)', { byLevel: { 2: 2, 14: 3 } }, 'long', 2, { subclass: ['divination'] }),
  res('theThirdEye', 'O Terceiro Olho', 'The Third Eye', ONE, 'short', 10, { subclass: ['divination'] }),
  // Ilusão
  res('phantasmalCreatures', 'Criaturas Fantasmagóricas (grátis)', 'Phantasmal Creatures (free cast)', ONE, 'long', 6,
    { subclass: ['illusion'], rules: '2024' }),
  res('illusorySelf', 'Eu Ilusório', 'Illusory Self', ONE, 'short', 10, {
    subclass: ['illusion'],
    desc: b('Em 2024 também volta gastando um espaço de nível 2+.', 'In 2024 it also returns by expending a level 2+ slot.'),
  }),
  // Conjuração, Transmutação
  res('benignTransposition', 'Transposição Benigna', 'Benign Transposition', ONE, 'long', 6, {
    subclass: ['conjuration'],
    desc: b('Também volta ao conjurar uma magia de conjuração de nível 1+.', 'Also returns when you cast a level 1+ Conjuration spell.'),
  }),
  res('shapechanger', 'Metamorfo', 'Shapechanger', ONE, 'short', 10, { subclass: ['transmutation'] }),
  // Canção da Lâmina
  res('bladesong', 'Canção da Lâmina', 'Bladesong', { profBonus: true }, 'long', 2, { subclass: ['bladesinging'] }),
  // Magia de Guerra
  res('powerSurge', 'Surto de Poder', 'Power Surge', INT_MIN1, 'long', 6, {
    subclass: ['warmagic'],
    desc: b('Máximo = mod. de INT; volta a 1 no descanso longo. Ganha 1 ao encerrar magia com Dissipar/Contramágica ou num descanso curto sem nenhum.', 'Max = INT modifier; resets to 1 on a Long Rest. Gain 1 when you end a spell with Dispel/Counterspell or finish a Short Rest with none.'),
  }),
  // Ordem dos Escribas
  res('awakenedSpellbook', 'Grimório Desperto (ritual rápido)', 'Awakened Spellbook (quick ritual)', ONE, 'long', 2, { subclass: ['scribes'] }),
  res('manifestMind', 'Mente Manifesta (manifestar)', 'Manifest Mind (manifest)', ONE, 'long', 6, {
    subclass: ['scribes'],
    desc: b('Também pode manifestar gastando um espaço de magia.', 'You can also manifest it by expending a spell slot.'),
  }),
  res('manifestMindCasting', 'Mente Manifesta (conjurar)', 'Manifest Mind (casting)', { profBonus: true }, 'long', 6, { subclass: ['scribes'] }),
  res('masterScrivener', 'Escrivão Mestre', 'Master Scrivener', ONE, 'long', 10, { subclass: ['scribes'] }),
  res('oneWithTheWord', 'Um com a Palavra', 'One with the Word', ONE, 'long', 14, { subclass: ['scribes'] }),
  // Cronurgia
  res('chronalShift', 'Desvio Cronal', 'Chronal Shift', { fixed: 2 }, 'long', 2, { subclass: ['chronurgy'] }),
  res('momentaryStasis', 'Estase Momentânea', 'Momentary Stasis', INT_MIN1, 'long', 6, { subclass: ['chronurgy'] }),
  res('arcaneAbeyance', 'Suspensão Arcana', 'Arcane Abeyance', ONE, 'short', 10, { subclass: ['chronurgy'] }),
  // Graviturgia
  res('violentAttraction', 'Atração Violenta', 'Violent Attraction', INT_MIN1, 'long', 10, { subclass: ['graviturgy'] }),
  res('eventHorizon', 'Horizonte de Eventos', 'Event Horizon', ONE, 'long', 14, {
    subclass: ['graviturgy'],
    desc: b('Também volta gastando um espaço de nível 3+.', 'Also returns by expending a level 3+ spell slot.'),
  }),
];

export default {
  classId: 'wizard',
  pools,
  // Regras 2024: Estudioso (nv 2), Maestria em Magia (nv 18), Magias Assinatura (nv 20).
  choices: {
    2: { scholar: 1 },
    18: { spellMastery1: 1, spellMastery2: 1 },
    20: { signatureSpells: 2 },
  },
  // Regras 2014 (PHB): Maestria sem restrição de tempo de conjuração.
  legacyChoices: {
    18: { legacySpellMastery1: 1, legacySpellMastery2: 1 },
    20: { signatureSpells: 2 },
  },
  // Fichas 2024 (subclasse no nível 3).
  subclassChoices: {
    abjuration: savantTable('abjurationSavant'),
    divination: savantTable('divinationSavant'),
    evocation: savantTable('evocationSavant'),
    illusion: { ...savantTable('illusionSavant'), 3: { illusionSavant: 2, improvedIllusionsCantrip: 1 } },
    bladesinging: { 3: { bladesingerWeapon: 1 } },
    transmutation: { 6: { transmutersStone: 1 } },
  },
  // Fichas 2014 (subclasse no nível 2; o Sábio 2014 só reduz custo de cópia, sem escolhas).
  legacySubclassChoices: {
    illusion: { 2: { improvedIllusionsCantrip: 1 } },
    bladesinging: { 2: { bladesingerWeapon: 1 } },
    transmutation: { 6: { transmutersStone: 1 } },
  },
  features,
  subclasses,
  resources,
};
