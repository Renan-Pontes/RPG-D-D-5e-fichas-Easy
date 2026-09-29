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
      'Você pode conjurar como Ritual qualquer magia com o marcador Ritual que esteja no seu grimório, mesmo sem tê-la preparada. É preciso ler o grimório para conjurá-la assim.',
      'You can cast any spell with the Ritual tag that is in your spellbook as a Ritual, even if it isn\'t prepared. You must read from the book to cast it this way.'),
    f('arcaneRecovery', 'Recuperação Arcana', 'Arcane Recovery',
      'Ao terminar um descanso curto, você pode recuperar espaços de magia gastos cuja soma de níveis seja no máximo metade do seu nível de Mago (arredondado para cima); nenhum deles pode ser de nível 6 ou mais. Ex.: no nível 4, recupera um espaço de nível 2 ou dois de nível 1. Uma vez por descanso longo.',
      'When you finish a Short Rest, you can recover expended spell slots with a combined level of up to half your Wizard level (round up); none can be level 6 or higher. E.g., at level 4 you recover one level 2 slot or two level 1 slots. Once per Long Rest.'),
  ],
  2: [
    f('scholar', 'Estudioso', 'Scholar',
      'Escolha uma destas perícias em que você tenha proficiência: Arcanismo, História, Investigação, Medicina, Natureza ou Religião. Você ganha Especialização nela.',
      'Choose one of these skills in which you have proficiency: Arcana, History, Investigation, Medicine, Nature, or Religion. You have Expertise in the chosen skill.'),
  ],
  3: [
    f('wizardSubclass', 'Subclasse de Mago', 'Wizard Subclass',
      'Você escolhe uma subclasse de Mago (uma tradição ou escola arcana) e ganha os traços dela no nível 3 e nos níveis indicados (6, 10 e 14).',
      'You gain a Wizard subclass of your choice (an arcane tradition or school) and its features at level 3 and at the levels it lists (6, 10, and 14).'),
  ],
  4: [ASI],
  5: [
    f('memorizeSpell', 'Memorizar Magia', 'Memorize Spell',
      'Ao terminar um descanso curto, você pode estudar o grimório e trocar uma magia de nível 1+ preparada por outra magia de nível 1+ do grimório.',
      'When you finish a Short Rest, you can study your spellbook and replace one level 1+ Wizard spell you have prepared with another level 1+ spell from the book.'),
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
      'Ganhe um talento de Dádiva Épica ou outro talento para o qual você se qualifique. Recomenda-se Dádiva da Recordação de Magia (Boon of Spell Recall).',
      'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Spell Recall is recommended.'),
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
        'Quem carrega a pedra ganha Visão no Escuro de 18 m (60 pés).', 'The bearer gains darkvision out to 60 feet.'),
      stone('speed', 'Deslocamento', 'Speed',
        'Quem carrega a pedra ganha +3 m (10 pés) de deslocamento enquanto não estiver sobrecarregado.', 'The bearer\'s speed increases by 10 feet while unencumbered.'),
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
            'Quando uma criatura que você vê a até 9 m (30 pés) sofrer dano, você pode usar sua Reação para que a sua Proteção Arcana absorva esse dano.',
            'When a creature you can see within 30 feet takes damage, you can take a Reaction to have your Arcane Ward absorb that damage.'),
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
            'Você tem Vantagem em salvaguardas contra magias e Resistência ao dano de magias.',
            'You have Advantage on saving throws against spells and Resistance to the damage of spells.'),
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
            'Ao conjurar uma magia de adivinhação com espaço de nível 2 ou mais, você recupera um espaço gasto de nível menor que o usado e não maior que 5.',
            'When you cast a Divination spell using a level 2+ spell slot, you regain one expended spell slot of a level lower than the one used and no higher than 5.'),
        ],
      },
      10: {
        features: [
          f('theThirdEye', 'O Terceiro Olho', 'The Third Eye',
            'Com uma Ação Bônus, escolha um benefício que dura até o próximo descanso curto ou longo: Visão no Escuro de 36 m (120 pés); ler qualquer idioma; ou conjurar Ver o Invisível sem gastar espaço. Uma vez por descanso curto ou longo.',
            'As a Bonus Action, choose one benefit that lasts until your next Short or Long Rest: Darkvision out to 120 feet; read any language; or cast See Invisibility without a spell slot. Once per Short or Long Rest.'),
        ],
      },
      14: {
        features: [
          f('greaterPortent', 'Presságio Maior', 'Greater Portent',
            'Seu Presságio passa a rolar três d20 em vez de dois.',
            'Your Portent now rolls three d20s instead of two.'),
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
            'Quando você conjura um truque contra uma criatura e erra o ataque, ou ela passa na salvaguarda, ela ainda sofre metade do dano do truque (se houver), mas nenhum efeito adicional.',
            'When you cast a cantrip at a creature and miss with the attack roll or the target succeeds on its saving throw, it still takes half the cantrip\'s damage (if any) but suffers no additional effect.'),
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
            'Suas magias de ilusão dispensam componentes verbais e, se tiverem alcance de 3 m (10 pés) ou mais, ganham +18 m (60 pés) de alcance. Você aprende Ilusão Menor (ou outro truque de Mago, se já a conhece), que não conta no seu limite de truques; com ela, cria som e imagem na mesma conjuração e pode conjurá-la como Ação Bônus.',
            'Your Illusion spells need no Verbal components and, if their range is 10+ feet, gain 60 feet of range. You learn Minor Illusion (or another Wizard cantrip if you already know it), which doesn\'t count against your cantrips; with it you can create both a sound and an image in one casting and cast it as a Bonus Action.'),
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
            'Ao conjurar uma magia de ilusão com espaço de magia, você pode, com uma Ação Bônus, tornar real um objeto inanimado e não mágico que faça parte da ilusão, por 1 minuto. O objeto não pode causar dano nem impor condições.',
            'When you cast an Illusion spell with a spell slot, you can take a Bonus Action to make one inanimate, nonmagical object in the illusion real for 1 minute. The object can\'t deal damage or impose conditions.'),
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
          SAVANT_2014('conjuration', 'Conjuração', 'Conjuration'),
          f('minorConjuration', 'Conjuração Menor', 'Minor Conjuration',
            'Com uma Ação, você cria na mão ou no chão a até 3 m (10 pés) um objeto não mágico que já viu, de até 90 cm (3 pés) de lado e até 4,5 kg (10 lb). Ele brilha levemente (luz fraca de 1,5 m) e some após 1 hora, se sofrer dano ou se você usar o traço de novo.',
            'As an Action, you conjure in your hand or on the ground within 10 feet a nonmagical object you have seen, no larger than 3 feet on a side and up to 10 pounds. It sheds dim light in a 5-foot radius and vanishes after 1 hour, when it takes damage, or when you use this feature again.'),
        ],
      },
      6: {
        features: [
          f('benignTransposition', 'Transposição Benigna', 'Benign Transposition',
            'Com uma Ação, teleporte-se até 9 m (30 pés) para um espaço desocupado que você vê, ou troque de lugar com uma criatura voluntária Pequena ou Média nesse alcance. Uma vez por descanso longo; o uso também volta quando você conjura uma magia de conjuração de nível 1+.',
            'As an Action, teleport up to 30 feet to an unoccupied space you can see, or swap places with a willing Small or Medium creature within that range. Once per Long Rest; the use also returns when you cast a level 1+ Conjuration spell.'),
        ],
      },
      10: {
        features: [
          f('focusedConjuration', 'Conjuração Focada', 'Focused Conjuration',
            'Enquanto se concentra numa magia de conjuração, sofrer dano não quebra sua Concentração.',
            'While you are concentrating on a Conjuration spell, your concentration can\'t be broken by taking damage.'),
        ],
      },
      14: {
        features: [
          f('durableSummons', 'Invocações Duráveis', 'Durable Summons',
            'Criaturas que você invoca ou cria com magias de conjuração ganham 30 PV temporários.',
            'Any creature you summon or create with a Conjuration spell has 30 temporary Hit Points.'),
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
          SAVANT_2014('enchantment', 'Encantamento', 'Enchantment', 'do'),
          f('hypnoticGaze', 'Olhar Hipnótico', 'Hypnotic Gaze',
            'Com uma Ação, escolha uma criatura que você vê a até 1,5 m (5 pés): ela faz uma salvaguarda de Sabedoria contra sua CD de magia. Se falhar, fica Enfeitiçada, Incapacitada e com deslocamento 0 até o fim do seu próximo turno; você pode estender o efeito com uma Ação a cada turno. O efeito acaba se você se afastar mais de 1,5 m, se ela não puder vê-lo ou se sofrer dano. Se ela passar ou o efeito acabar, você não pode usá-lo nela de novo até um descanso longo.',
            'As an Action, choose a creature you can see within 5 feet: it makes a Wisdom save against your spell DC. On a failure it is Charmed, Incapacitated, and has speed 0 until the end of your next turn; you can extend it with your Action each turn. It ends if you move more than 5 feet away, it can\'t see you, or it takes damage. If it succeeds or the effect ends, you can\'t use this on it again until a Long Rest.'),
        ],
      },
      6: {
        features: [
          f('instinctiveCharm', 'Encanto Instintivo', 'Instinctive Charm',
            'Quando uma criatura que você vê a até 9 m (30 pés) faz uma jogada de ataque contra você, use sua Reação para desviá-lo: ela faz uma salvaguarda de Sabedoria e, se falhar, ataca a criatura mais próxima dela (exceto você e ela mesma). Se passar, fica imune a este traço até o seu descanso longo. Criaturas imunes a Enfeitiçado não são afetadas.',
            'When a creature you can see within 30 feet makes an attack roll against you, use your Reaction to divert it: it makes a Wisdom save and, on a failure, attacks the creature closest to it (other than you or itself). On a success it is immune to this feature until your Long Rest. Creatures immune to being Charmed are unaffected.'),
        ],
      },
      10: {
        features: [
          f('splitEnchantment', 'Encantamento Dividido', 'Split Enchantment',
            'Ao conjurar uma magia de encantamento de nível 1+ que tenha só uma criatura como alvo, você pode escolher uma segunda criatura como alvo.',
            'When you cast a level 1+ Enchantment spell that targets only one creature, you can have it target a second creature.'),
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
          SAVANT_2014('necromancy', 'Necromancia', 'Necromancy'),
          f('grimHarvest', 'Colheita Sinistra', 'Grim Harvest',
            'Uma vez por turno, ao matar uma ou mais criaturas com uma magia de nível 1+, você recupera PV iguais a 2 × o nível da magia (3 × se for de necromancia). Não funciona contra constructos nem mortos-vivos.',
            'Once per turn, when you kill one or more creatures with a level 1+ spell, you regain Hit Points equal to 2 × the spell\'s level (3 × if it is a Necromancy spell). It doesn\'t work on constructs or undead.'),
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
            'Você tem Resistência a dano necrótico, e seus PV máximos não podem ser reduzidos.',
            'You have Resistance to Necrotic damage, and your Hit Point maximum can\'t be reduced.'),
        ],
      },
      14: {
        features: [
          f('commandUndead', 'Comandar Mortos-Vivos', 'Command Undead',
            'Com uma Ação, escolha um morto-vivo que você vê a até 18 m (60 pés): ele faz uma salvaguarda de Carisma e, se falhar, passa a ser seu aliado e obedece. Mortos-vivos com INT 8+ têm Vantagem; com INT 12+ repetem a salvaguarda a cada hora. Se passar, fica imune a este traço.',
            'As an Action, choose an undead you can see within 60 feet: it makes a Charisma save and, on a failure, becomes friendly and obeys you. Undead with INT 8+ have Advantage; with INT 12+ they repeat the save every hour. On a success it is immune to this feature.'),
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
          SAVANT_2014('transmutation', 'Transmutação', 'Transmutation'),
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
            'Metamorfose entra de graça no seu grimório. Você pode conjurá-la sem gastar espaço, só em si mesmo, transformando-se numa besta de ND 1 ou menor. Uma vez por descanso curto ou longo.',
            'Polymorph is added to your spellbook for free. You can cast it without expending a slot, targeting only yourself and becoming a beast of CR 1 or lower. Once per Short or Long Rest.'),
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
            'Você ganha proficiência com armadura leve, com uma arma corpo a corpo de uma mão à sua escolha e na perícia Atuação.',
            'You gain proficiency with light armor, with one one-handed melee weapon of your choice, and in the Performance skill.'),
          f('bladesong', 'Canção da Lâmina', 'Bladesong',
            'Com uma Ação Bônus, sem armadura média ou pesada nem escudo, você ativa a Canção por 1 minuto: soma seu mod. de INT à CA (mín. +1), ganha +3 m (10 pés) de deslocamento, Vantagem em testes de Acrobacia e soma o mod. de INT às salvaguardas de Constituição para manter Concentração. Acaba se ficar Incapacitado, vestir armadura média/pesada ou escudo, ou usar as duas mãos para atacar com uma arma. Usos: bônus de proficiência por descanso longo.',
            'As a Bonus Action, wearing no medium or heavy armor or shield, you start the Bladesong for 1 minute: add your INT modifier to AC (min +1), gain +10 feet of speed, Advantage on Acrobatics checks, and add your INT modifier to Constitution saves to maintain Concentration. It ends if you are Incapacitated, don medium/heavy armor or a shield, or use two hands to attack with a weapon. Uses: Proficiency Bonus per Long Rest.'),
        ],
      },
      6: {
        features: [
          f('extraAttack', 'Ataque Extra', 'Extra Attack',
            'Você ataca duas vezes ao usar a ação de Ataque. Pode trocar um desses ataques pela conjuração de um truque.',
            'You can attack twice when you take the Attack action. You can replace one of those attacks with casting a cantrip.'),
        ],
        extraAttacks: 1,
      },
      10: {
        features: [
          f('songOfDefense', 'Canção da Defesa', 'Song of Defense',
            'Quando sofrer dano com a Canção ativa, use sua Reação e gaste um espaço de magia para reduzir esse dano em 5 × o nível do espaço.',
            'When you take damage while your Bladesong is active, you can use your Reaction and expend a spell slot to reduce that damage by 5 × the slot\'s level.'),
        ],
      },
      14: {
        features: [
          f('songOfVictory', 'Canção da Vitória', 'Song of Victory',
            'Com a Canção ativa, você soma seu mod. de INT (mín. +1) ao dano dos seus ataques corpo a corpo com arma.',
            'While your Bladesong is active, you add your INT modifier (min +1) to the damage of your melee weapon attacks.'),
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
            'Quando for atingido por um ataque ou falhar numa salvaguarda, use sua Reação para ganhar +2 na CA contra esse ataque ou +4 nessa salvaguarda. Depois disso, até o fim do seu próximo turno, só pode conjurar truques.',
            'When you are hit by an attack or fail a saving throw, you can use your Reaction to gain +2 AC against that attack or +4 to that save. Afterward, until the end of your next turn, you can cast only cantrips.'),
          f('tacticalWit', 'Perspicácia Tática', 'Tactical Wit',
            'Você soma seu modificador de Inteligência às jogadas de iniciativa.',
            'You add your Intelligence modifier to your initiative rolls.'),
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
            'Enquanto mantém Concentração numa magia, você tem +2 na CA e em todas as salvaguardas.',
            'While you maintain Concentration on a spell, you have +2 to AC and all saving throws.'),
        ],
      },
      14: {
        features: [
          f('deflectingShroud', 'Mortalha Defletora', 'Deflecting Shroud',
            'Ao usar a Deflexão Arcana, até três criaturas à sua escolha a até 18 m (60 pés) sofrem dano de energia igual a metade do seu nível de Mago.',
            'When you use Arcane Deflection, up to three creatures of your choice within 60 feet take Force damage equal to half your Wizard level.'),
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
            'Com uma Ação Bônus, você cria uma pena mágica que escreve sem tinta, na cor que quiser, e apaga o que escreveu. Com ela, copiar uma magia para o grimório leva 2 minutos por nível da magia.',
            'As a Bonus Action, you create a magical quill that writes without ink, in any color, and can erase what it wrote. With it, copying a spell into your spellbook takes 2 minutes per spell level.'),
          f('awakenedSpellbook', 'Grimório Desperto', 'Awakened Spellbook',
            'O grimório serve de foco de conjuração. Ao conjurar uma magia de Mago com espaço, você pode trocar o tipo de dano dela pelo de outra magia do grimório do mesmo nível. Uma vez por descanso longo, pode conjurar um ritual no tempo normal de conjuração em vez do tempo de ritual.',
            'Your spellbook is a spellcasting focus. When you cast a Wizard spell with a slot, you can swap its damage type for that of another spell of the same level in the book. Once per Long Rest, you can cast a ritual at its normal casting time instead of the ritual time.'),
        ],
      },
      6: {
        features: [
          f('manifestMind', 'Mente Manifesta', 'Manifest Mind',
            'Com uma Ação Bônus, você manifesta o espírito do grimório num ponto a até 18 m (60 pés): um objeto espectral Miúdo que emite luz fraca e tem Visão no Escuro de 18 m. Você pode ver e ouvir por ele e conjurar magias de Mago como se estivesse no espaço dele, um número de vezes igual ao bônus de proficiência por descanso longo. Manifestar: 1 vez por descanso longo, ou gastando um espaço de magia.',
            'As a Bonus Action, you manifest your spellbook\'s spirit at a point within 60 feet: a Tiny spectral object that sheds dim light and has 60 ft darkvision. You can see and hear through it and cast Wizard spells as if from its space, Proficiency Bonus times per Long Rest. Manifesting: once per Long Rest, or by expending a spell slot.'),
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
            'Depois de ver o resultado de uma jogada de ataque, teste de atributo ou salvaguarda sua ou de uma criatura que você vê a até 9 m (30 pés), use sua Reação para forçar uma nova rolagem; vale o novo resultado. Duas vezes por descanso longo.',
            'After you see the result of an attack roll, ability check, or saving throw made by you or a creature you can see within 30 feet, you can use your Reaction to force a reroll; the new roll is used. Twice per Long Rest.'),
          f('temporalAwareness', 'Consciência Temporal', 'Temporal Awareness',
            'Você soma seu modificador de Inteligência às jogadas de iniciativa.',
            'You add your Intelligence modifier to your initiative rolls.'),
        ],
      },
      6: {
        features: [
          f('momentaryStasis', 'Estase Momentânea', 'Momentary Stasis',
            'Com uma Ação, uma criatura Grande ou menor que você vê a até 18 m (60 pés) faz uma salvaguarda de Constituição; se falhar, fica Incapacitada e com deslocamento 0 até o fim do seu próximo turno, ou até sofrer dano. Usos: mod. de INT (mín. 1) por descanso longo.',
            'As an Action, a Large or smaller creature you can see within 60 feet makes a Constitution save; on a failure it is Incapacitated and has speed 0 until the end of your next turn, or until it takes damage. Uses: INT modifier (min 1) per Long Rest.'),
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
            'Quando você ou uma criatura que você vê a até 18 m (60 pés) fizer uma jogada de ataque, teste de atributo ou salvaguarda, use sua Reação para ignorar o dado e decidir se ela passa pelo número mínimo ou falha por um. Cada uso lhe dá 1 nível de Exaustão, que só sai com descanso longo.',
            'When you or a creature you can see within 60 feet makes an attack roll, ability check, or saving throw, you can use your Reaction to ignore the die and decide whether it succeeds by exactly the minimum or fails by one. Each use gives you 1 Exhaustion level, removable only by a Long Rest.'),
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
            'Com uma Ação, escolha uma criatura ou objeto Grande ou menor a até 9 m (30 pés) e dobre ou reduza à metade o peso dele por até 1 minuto (Concentração). Com o dobro: −3 m de deslocamento, Vantagem em testes e salvaguardas de Força. Com a metade: +3 m de deslocamento, salto dobrado e Desvantagem em testes e salvaguardas de Força. Criatura não voluntária faz salvaguarda de Constituição. No nível 10, afeta alvos Enormes.',
            'As an Action, choose a Large or smaller creature or object within 30 feet and double or halve its weight for up to 1 minute (Concentration). Doubled: −10 ft speed, Advantage on Strength checks and saves. Halved: +10 ft speed, doubled jump distance, and Disadvantage on Strength checks and saves. An unwilling creature makes a Constitution save. At level 10 it can affect Huge targets.'),
        ],
      },
      6: {
        features: [
          f('gravityWell', 'Poço Gravitacional', 'Gravity Well',
            'Quando você conjura uma magia sobre uma criatura e ela é acertada, falha na salvaguarda ou é voluntária, você pode movê-la 1,5 m (5 pés) para um espaço desocupado à sua escolha.',
            'When you cast a spell on a creature and it is hit, fails its save, or is willing, you can move it 5 feet to an unoccupied space of your choice.'),
        ],
      },
      10: {
        features: [
          f('violentAttraction', 'Atração Violenta', 'Violent Attraction',
            'Quando outra criatura que você vê a até 18 m (60 pés) acertar um ataque com arma, use sua Reação para somar 1d10 ao dano; ou, quando uma criatura nesse alcance sofrer dano de queda, some 2d10 a esse dano. Usos: mod. de INT (mín. 1) por descanso longo.',
            'When another creature you can see within 60 feet hits with a weapon attack, you can use your Reaction to add 1d10 to the damage; or, when a creature within that range takes falling damage, add 2d10 to it. Uses: INT modifier (min 1) per Long Rest.'),
        ],
      },
      14: {
        features: [
          f('eventHorizon', 'Horizonte de Eventos', 'Event Horizon',
            'Com uma Ação, você emana um campo gravitacional de 9 m (30 pés) por 1 minuto (Concentração). Inimigos que começam o turno nele fazem salvaguarda de Força: se falharem, sofrem 2d10 de dano de energia e ficam com deslocamento 0 até o próximo turno; se passarem, sofrem metade e cada 30 cm de movimento custa 90 cm. Uma vez por descanso longo, ou gastando um espaço de nível 3+.',
            'As an Action, you emanate a 30-foot gravity field for 1 minute (Concentration). Hostile creatures that start their turn in it make a Strength save: on a failure they take 2d10 Force damage and their speed is 0 until their next turn; on a success they take half and each foot of movement costs 3 feet. Once per Long Rest, or by expending a level 3+ slot.'),
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
  res('arcaneWardHp', 'Proteção Arcana (PV)', 'Arcane Ward (HP)', { perClassLevel: 2 }, 'long', 2, {
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
