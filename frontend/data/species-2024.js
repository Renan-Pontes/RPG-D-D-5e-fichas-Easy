/* Espécies: traços revisados (2024) e escolhas de espécie (2024 e 2014).
 *
 * Os traços de 2024 substituem o texto extraído do PDF em srd2024-species.json
 * (aplicados em rules2024.js). São resumos próprios do SRD 5.2.1 (CC-BY 4.0);
 * o Aasimar vem do Player's Handbook (2024) e é um resumo original, não texto do livro.
 *
 * Escolhas (`choices`) ficam em char.speciesChoices; o motor é
 * src/progression/species.js. Formato de uma escolha:
 *   { key, label, options?: [{ id, name, desc?, ...efeitos }], from?: [ids], count?, when?: { chave: valor } }
 * Efeitos de espécie/opção: { darkvision, speed, resist: [], cantrips: [], spells: { nível: [ids] }, skills: [] }.
 * Chaves especiais: 'feat' (talento em char.feats com origin: 'species'),
 * 'asi' (bônus de atributo da espécie, `pattern`), 'cantrip' (truque de uma lista).
 */
const b = (pt, en) => ({ pt, en });
const T = (pt, en, dpt, den, extra = {}) => ({ name: b(pt, en), desc: b(dpt, den), ...extra });

const SPELL_ABILITY = { key: 'spellAbility', label: b('Atributo de conjuração', 'Spellcasting ability'), from: ['int', 'wis', 'cha'] };
const SIZE = { key: 'size', label: b('Tamanho', 'Size'), options: [
  { id: 'Medium', name: b('Médio', 'Medium') }, { id: 'Small', name: b('Pequeno', 'Small') },
] };
const DARKVISION = (ft) => T('Visão no Escuro', 'Darkvision', `Você enxerga na penumbra a até ${ft} pés como se fosse luz plena, e no escuro como se fosse penumbra (sem cores).`, `You see in dim light within ${ft} feet as if it were bright light, and in darkness as if it were dim light (no colors).`);

const DRAGONS = [
  ['black', 'Preto', 'Black', 'acid'], ['blue', 'Azul', 'Blue', 'lightning'], ['brass', 'Latão', 'Brass', 'fire'],
  ['bronze', 'Bronze', 'Bronze', 'lightning'], ['copper', 'Cobre', 'Copper', 'acid'], ['gold', 'Ouro', 'Gold', 'fire'],
  ['green', 'Verde', 'Green', 'poison'], ['red', 'Vermelho', 'Red', 'fire'], ['silver', 'Prata', 'Silver', 'cold'],
  ['white', 'Branco', 'White', 'cold'],
];
export const DAMAGE_NAMES = {
  acid: b('Ácido', 'Acid'), cold: b('Frio', 'Cold'), fire: b('Fogo', 'Fire'), lightning: b('Elétrico', 'Lightning'),
  poison: b('Veneno', 'Poison'), necrotic: b('Necrótico', 'Necrotic'), radiant: b('Radiante', 'Radiant'), thunder: b('Trovejante', 'Thunder'),
};
const DRACONIC_ANCESTRY = {
  key: 'ancestry', label: b('Ancestral dracônico', 'Draconic ancestor'),
  options: DRAGONS.map(([id, pt, en, dmg]) => ({ id, name: b(pt, en), damage: dmg, resist: [dmg],
    desc: b(`Dano ${DAMAGE_NAMES[dmg].pt.toLowerCase()}.`, `${DAMAGE_NAMES[dmg].en} damage.`) })),
};

// ---------------------------------------------------------------------------
// 2024 (SRD 5.2.1 + Aasimar do PHB 2024)
// ---------------------------------------------------------------------------
export const SPECIES_2024_REVISED = {
  dragonborn: {
    size: 'Medium', speed: 30, darkvision: 60,
    traits: [
      T('Ancestralidade Dracônica', 'Draconic Ancestry', 'Escolha um dragão ancestral. Ele define o tipo de dano do seu Sopro e da sua resistência, além de influenciar sua aparência.', 'Choose a dragon ancestor. It sets the damage type of your Breath Weapon and your resistance, and colors your appearance.'),
      T('Sopro', 'Breath Weapon', 'Ao usar a ação Atacar, troque um dos ataques por um sopro em cone de 15 pés ou em linha de 30 × 5 pés. Quem estiver na área faz salvaguarda de Destreza (CD 8 + mod. de Constituição + bônus de proficiência): sofre 1d10 do tipo do seu ancestral, ou metade se passar. O dano sobe para 2d10 no nível 5, 3d10 no 11 e 4d10 no 17. Usos iguais ao bônus de proficiência; recupera no descanso longo.', 'When you take the Attack action, replace one attack with a breath in a 15-foot cone or a 30 × 5-foot line. Creatures in the area make a Dexterity save (DC 8 + Constitution modifier + Proficiency Bonus): 1d10 of your ancestor\'s damage type, half on a success. The damage becomes 2d10 at level 5, 3d10 at 11 and 4d10 at 17. Uses equal your Proficiency Bonus; regain them on a Long Rest.'),
      T('Resistência a Dano', 'Damage Resistance', 'Você tem resistência ao tipo de dano do seu ancestral dracônico.', 'You have Resistance to your draconic ancestor\'s damage type.'),
      DARKVISION(60),
      T('Voo Dracônico', 'Draconic Flight', 'A partir do nível 5, com uma ação bônus, asas espectrais surgem por 10 minutos (ou até você recolhê-las ou ficar incapacitado) e dão deslocamento de voo igual ao seu deslocamento. Uma vez por descanso longo.', 'From level 5, as a Bonus Action you sprout spectral wings for 10 minutes (or until you dismiss them or are Incapacitated), gaining a Fly Speed equal to your Speed. Once per Long Rest.', { level: 5 }),
    ],
    choices: [DRACONIC_ANCESTRY],
  },
  dwarf: {
    size: 'Medium', speed: 30, darkvision: 120, resist: ['poison'],
    traits: [
      DARKVISION(120),
      T('Resiliência Anã', 'Dwarven Resilience', 'Resistência a dano de veneno e vantagem nas salvaguardas para evitar ou encerrar a condição Envenenado.', 'Resistance to Poison damage and Advantage on saving throws to avoid or end the Poisoned condition.'),
      T('Robustez Anã', 'Dwarven Toughness', 'Seus pontos de vida máximos aumentam em 1 por nível de personagem (já somado na ficha).', 'Your Hit Point maximum increases by 1 per character level (already added on the sheet).'),
      T('Conhecimento da Pedra', 'Stonecunning', 'Com uma ação bônus, ganhe sentido sísmico de 60 pés por 10 minutos, desde que esteja sobre pedra ou tocando-a (natural ou trabalhada). Usos iguais ao bônus de proficiência; recupera no descanso longo.', 'As a Bonus Action, gain Tremorsense out to 60 feet for 10 minutes while standing on or touching stone (natural or worked). Uses equal your Proficiency Bonus; regain them on a Long Rest.'),
    ],
  },
  elf: {
    size: 'Medium', speed: 30, darkvision: 60,
    traits: [
      DARKVISION(60),
      T('Linhagem Élfica', 'Elven Lineage', 'Escolha Drow, Alto Elfo ou Elfo da Floresta e ganhe o benefício de nível 1 da linhagem. Nos níveis 3 e 5 você aprende uma magia da linhagem: fica sempre preparada, pode ser conjurada uma vez sem espaço de magia por descanso longo e também com seus espaços. Escolha Inteligência, Sabedoria ou Carisma como atributo dessas magias.', 'Choose Drow, High Elf or Wood Elf and gain that lineage\'s level 1 benefit. At levels 3 and 5 you learn a lineage spell: always prepared, castable once without a slot per Long Rest and also with your slots. Choose Intelligence, Wisdom or Charisma as the ability for these spells.'),
      T('Ancestralidade Feérica', 'Fey Ancestry', 'Vantagem nas salvaguardas para evitar ou encerrar a condição Enfeitiçado.', 'Advantage on saving throws to avoid or end the Charmed condition.'),
      T('Sentidos Aguçados', 'Keen Senses', 'Proficiência em Intuição, Percepção ou Sobrevivência (à escolha).', 'Proficiency in Insight, Perception or Survival (your choice).'),
      T('Transe', 'Trance', 'Você não precisa dormir e magia não o faz dormir. Um descanso longo leva 4 horas de meditação consciente.', 'You don\'t need to sleep and magic can\'t put you to sleep. A Long Rest takes 4 hours of conscious meditation.'),
    ],
    choices: [
      { key: 'lineage', label: b('Linhagem élfica', 'Elven lineage'), options: [
        { id: 'drow', name: b('Drow', 'Drow'), darkvision: 120, cantrips: ['dancingLights'], spells: { 3: ['faerieFire'], 5: ['darkness'] },
          desc: b('Visão no escuro sobe para 120 pés.', 'Darkvision increases to 120 feet.') },
        { id: 'high', name: b('Alto Elfo', 'High Elf'), cantrips: [], spells: { 3: ['detectMagic'], 5: ['mistyStep'] },
          desc: b('Um truque de Mago (Prestidigitação por padrão), que pode ser trocado por outro truque de Mago a cada descanso longo.', 'One Wizard cantrip (Prestidigitation by default), which you can swap for another Wizard cantrip on each Long Rest.') },
        { id: 'wood', name: b('Elfo da Floresta', 'Wood Elf'), speed: 35, cantrips: ['druidcraft'], spells: { 3: ['longstrider'], 5: ['passWithoutTrace'] },
          desc: b('Deslocamento sobe para 35 pés.', 'Speed increases to 35 feet.') },
      ] },
      { key: 'cantrip', label: b('Truque de Mago', 'Wizard cantrip'), list: 'wizard', default: 'prestidigitation', when: { lineage: 'high' } },
      SPELL_ABILITY,
      { key: 'skill', label: b('Sentidos Aguçados', 'Keen Senses'), from: ['insight', 'perception', 'survival'] },
    ],
  },
  gnome: {
    size: 'Small', speed: 30, darkvision: 60,
    traits: [
      DARKVISION(60),
      T('Astúcia Gnômica', 'Gnomish Cunning', 'Vantagem nas salvaguardas de Inteligência, Sabedoria e Carisma.', 'Advantage on Intelligence, Wisdom and Charisma saving throws.'),
      T('Linhagem Gnômica', 'Gnomish Lineage', 'Escolha Gnomo da Floresta ou Gnomo das Rochas e o atributo das magias desse traço (Inteligência, Sabedoria ou Carisma).', 'Choose Forest Gnome or Rock Gnome, and the ability for this trait\'s spells (Intelligence, Wisdom or Charisma).'),
    ],
    choices: [
      { key: 'lineage', label: b('Linhagem gnômica', 'Gnomish lineage'), options: [
        { id: 'forest', name: b('Gnomo da Floresta', 'Forest Gnome'), cantrips: ['minorIllusion'], spells: { 1: ['speakWithAnimals'] },
          desc: b('Falar com Animais fica sempre preparada; conjure-a sem espaço um número de vezes igual ao bônus de proficiência por descanso longo (ou com seus espaços).', 'Speak with Animals is always prepared; cast it without a slot a number of times equal to your Proficiency Bonus per Long Rest (or with your slots).') },
        { id: 'rock', name: b('Gnomo das Rochas', 'Rock Gnome'), cantrips: ['mending', 'prestidigitation'],
          desc: b('Gastando 10 minutos com Prestidigitação, crie um dispositivo mecânico Miúdo (CA 5, 1 PV) com um efeito dessa magia, ativado por ação bônus com um toque. Até três ao mesmo tempo; cada um dura 8 horas.', 'Spending 10 minutes casting Prestidigitation, build a Tiny clockwork device (AC 5, 1 HP) holding one of that spell\'s effects, activated with a touch as a Bonus Action. Up to three at a time; each lasts 8 hours.') },
      ] },
      SPELL_ABILITY,
    ],
  },
  goliath: {
    size: 'Medium', speed: 35,
    traits: [
      T('Ancestralidade Gigante', 'Giant Ancestry', 'Escolha uma dádiva do seu ancestral gigante. Usos iguais ao bônus de proficiência; recupera no descanso longo.', 'Choose a boon from your giant ancestor. Uses equal your Proficiency Bonus; regain them on a Long Rest.'),
      T('Forma Grande', 'Large Form', 'A partir do nível 5, com uma ação bônus e espaço suficiente, fique Grande por 10 minutos: vantagem em testes de Força e +10 pés de deslocamento. Uma vez por descanso longo.', 'From level 5, as a Bonus Action with enough room, become Large for 10 minutes: Advantage on Strength checks and +10 feet of Speed. Once per Long Rest.', { level: 5 }),
      T('Constituição Poderosa', 'Powerful Build', 'Vantagem em testes para encerrar a condição Agarrado; conta como um tamanho maior para capacidade de carga.', 'Advantage on checks to end the Grappled condition; you count as one size larger for carrying capacity.'),
    ],
    choices: [
      { key: 'ancestry', label: b('Ancestral gigante', 'Giant ancestor'), options: [
        { id: 'cloud', name: b('Salto das Nuvens (Gigante das Nuvens)', "Cloud's Jaunt (Cloud Giant)"), desc: b('Ação bônus: teleporte-se até 30 pés para um espaço desocupado que você veja.', 'Bonus Action: teleport up to 30 feet to an unoccupied space you can see.') },
        { id: 'fire', name: b('Queimadura do Fogo (Gigante do Fogo)', "Fire's Burn (Fire Giant)"), desc: b('Ao acertar um ataque e causar dano, cause também 1d10 de dano de fogo.', 'When you hit with an attack and deal damage, also deal 1d10 Fire damage.') },
        { id: 'frost', name: b('Frio do Gelo (Gigante do Gelo)', "Frost's Chill (Frost Giant)"), desc: b('Ao acertar um ataque e causar dano, cause também 1d6 de frio e reduza o deslocamento do alvo em 10 pés até o início do seu próximo turno.', 'When you hit with an attack and deal damage, also deal 1d6 Cold damage and reduce the target\'s Speed by 10 feet until the start of your next turn.') },
        { id: 'hill', name: b('Tombo da Colina (Gigante da Colina)', "Hill's Tumble (Hill Giant)"), desc: b('Ao acertar um ataque numa criatura Grande ou menor e causar dano, deixe-a Caída.', 'When you hit a Large or smaller creature with an attack and deal damage, knock it Prone.') },
        { id: 'stone', name: b('Resistência da Pedra (Gigante da Pedra)', "Stone's Endurance (Stone Giant)"), desc: b('Reação ao sofrer dano: role 1d12 + mod. de Constituição e reduza o dano nesse total.', 'Reaction when you take damage: roll 1d12 + Constitution modifier and reduce the damage by that total.') },
        { id: 'storm', name: b('Trovão da Tempestade (Gigante da Tempestade)', "Storm's Thunder (Storm Giant)"), desc: b('Reação ao sofrer dano de uma criatura a até 60 pés: cause 1d8 de dano trovejante nela.', 'Reaction when a creature within 60 feet damages you: deal 1d8 Thunder damage to it.') },
      ] },
    ],
  },
  halfling: {
    size: 'Small', speed: 30,
    traits: [
      T('Corajoso', 'Brave', 'Vantagem nas salvaguardas para evitar ou encerrar a condição Amedrontado.', 'Advantage on saving throws to avoid or end the Frightened condition.'),
      T('Agilidade Halfling', 'Halfling Nimbleness', 'Você atravessa o espaço de criaturas de tamanho maior que o seu, mas não pode parar nele.', 'You can move through the space of any creature larger than you, but can\'t stop there.'),
      T('Sorte', 'Luck', 'Ao tirar 1 no d20 de um Teste de D20, role de novo e use o novo resultado.', 'When you roll a 1 on the d20 of a D20 Test, reroll it and use the new roll.'),
      T('Furtividade Natural', 'Naturally Stealthy', 'Você pode usar a ação Esconder mesmo quando encoberto só por uma criatura pelo menos um tamanho maior.', 'You can take the Hide action even when obscured only by a creature at least one size larger than you.'),
    ],
  },
  human: {
    size: 'Medium', speed: 30,
    traits: [
      T('Engenhoso', 'Resourceful', 'Você ganha Inspiração Heroica sempre que termina um descanso longo.', 'You gain Heroic Inspiration whenever you finish a Long Rest.'),
      T('Habilidoso', 'Skillful', 'Proficiência em uma perícia à sua escolha.', 'Proficiency in one skill of your choice.'),
      T('Versátil', 'Versatile', 'Você ganha um talento de Origem à sua escolha (Habilidoso é o recomendado).', 'You gain an Origin feat of your choice (Skilled is recommended).'),
    ],
    choices: [
      SIZE,
      { key: 'skill', label: b('Habilidoso: perícia', 'Skillful: skill') },
      { key: 'feat', label: b('Versátil: talento de Origem', 'Versatile: Origin feat'), kind: 'origin' },
    ],
  },
  orc: {
    size: 'Medium', speed: 30, darkvision: 120,
    traits: [
      T('Ímpeto de Adrenalina', 'Adrenaline Rush', 'Use a ação Disparada como ação bônus e ganhe pontos de vida temporários iguais ao bônus de proficiência. Usos iguais ao bônus de proficiência; recupera no descanso curto ou longo.', 'Take the Dash action as a Bonus Action and gain Temporary Hit Points equal to your Proficiency Bonus. Uses equal your Proficiency Bonus; regain them on a Short or Long Rest.'),
      DARKVISION(120),
      T('Resistência Implacável', 'Relentless Endurance', 'Ao cair a 0 pontos de vida sem morrer na hora, fique com 1 PV em vez disso. Uma vez por descanso longo.', 'When reduced to 0 Hit Points but not killed outright, drop to 1 Hit Point instead. Once per Long Rest.'),
    ],
  },
  tiefling: {
    size: 'Medium', speed: 30, darkvision: 60, cantrips: ['thaumaturgy'],
    traits: [
      DARKVISION(60),
      T('Legado Ínfero', 'Fiendish Legacy', 'Escolha o legado Abissal, Ctônico ou Infernal: ele dá uma resistência e um truque no nível 1 e uma magia nova nos níveis 3 e 5 (sempre preparada, uma conjuração grátis por descanso longo, e também com seus espaços). Escolha Inteligência, Sabedoria ou Carisma como atributo dessas magias.', 'Choose the Abyssal, Chthonic or Infernal legacy: it grants a resistance and a cantrip at level 1 and a new spell at levels 3 and 5 (always prepared, one free casting per Long Rest, and also with your slots). Choose Intelligence, Wisdom or Charisma as the ability for these spells.'),
      T('Presença Sobrenatural', 'Otherworldly Presence', 'Você conhece o truque Taumaturgia, conjurado com o mesmo atributo do seu Legado Ínfero.', 'You know the Thaumaturgy cantrip, cast with the same ability as your Fiendish Legacy.'),
    ],
    choices: [
      SIZE,
      { key: 'lineage', label: b('Legado ínfero', 'Fiendish legacy'), options: [
        { id: 'abyssal', name: b('Abissal', 'Abyssal'), resist: ['poison'], cantrips: ['poisonSpray'], spells: { 3: ['rayOfSickness'], 5: ['holdPerson'] }, desc: b('Resistência a veneno.', 'Poison resistance.') },
        { id: 'chthonic', name: b('Ctônico', 'Chthonic'), resist: ['necrotic'], cantrips: ['chillTouch'], spells: { 3: ['falseLife'], 5: ['rayOfEnfeeblement'] }, desc: b('Resistência a dano necrótico.', 'Necrotic resistance.') },
        { id: 'infernal', name: b('Infernal', 'Infernal'), resist: ['fire'], cantrips: ['fireBolt'], spells: { 3: ['hellishRebuke'], 5: ['darkness'] }, desc: b('Resistência a fogo.', 'Fire resistance.') },
      ] },
      SPELL_ABILITY,
    ],
  },
};

/** Aasimar (Player's Handbook 2024): fora do SRD 5.2.1, resumo original. */
export const AASIMAR_2024 = {
  id: 'aasimar', name: b('Aasimar', 'Aasimar'), size: 'Medium', speed: 30, asi: {}, source: 'PHB 2024',
  languages: ['Common', '+2 of choice'], darkvision: 60, resist: ['necrotic', 'radiant'], cantrips: ['light'], fixedSpellAbility: 'cha',
  traits: [
    T('Resistência Celestial', 'Celestial Resistance', 'Resistência a dano necrótico e radiante.', 'Resistance to Necrotic and Radiant damage.'),
    DARKVISION(60),
    T('Mãos Curativas', 'Healing Hands', 'Com uma ação de Magia, toque uma criatura: ela recupera PV iguais a um número de d4 igual ao seu bônus de proficiência. Uma vez por descanso longo.', 'As a Magic action, touch a creature: it regains Hit Points equal to a number of d4s equal to your Proficiency Bonus. Once per Long Rest.'),
    T('Portador da Luz', 'Light Bearer', 'Você conhece o truque Luz, com Carisma como atributo de conjuração.', 'You know the Light cantrip, with Charisma as its spellcasting ability.'),
    T('Revelação Celestial', 'Celestial Revelation', 'A partir do nível 3, com uma ação bônus, transforme-se por 1 minuto (uma vez por descanso longo), escolhendo a forma a cada uso. Uma vez por turno, cause dano extra igual ao bônus de proficiência a um alvo que você ferir com ataque ou magia (necrótico no Manto Necrótico, radiante nas outras). Asas Celestiais: deslocamento de voo igual ao seu deslocamento. Radiância Interior: luz plena em 10 pés e penumbra por mais 10; no fim de cada turno seu, criaturas a até 10 pés sofrem dano radiante igual ao bônus de proficiência. Manto Necrótico: quem não for aliado a até 10 pés faz salvaguarda de Carisma (CD 8 + mod. de Carisma + proficiência) ou fica Amedrontado até o fim do seu próximo turno.', 'From level 3, as a Bonus Action, transform for 1 minute (once per Long Rest), choosing the form each time. Once per turn, deal extra damage equal to your Proficiency Bonus to a target you damage with an attack or spell (Necrotic for Necrotic Shroud, Radiant otherwise). Heavenly Wings: a Fly Speed equal to your Speed. Inner Radiance: bright light in 10 feet and dim light for 10 more; at the end of each of your turns, creatures within 10 feet take Radiant damage equal to your Proficiency Bonus. Necrotic Shroud: non-allies within 10 feet make a Charisma save (DC 8 + Charisma modifier + Proficiency Bonus) or are Frightened until the end of your next turn.', { level: 3 }),
  ],
  choices: [SIZE],
};

// ---------------------------------------------------------------------------
// 2014 (e raças antigas usadas por fichas 2024): só escolhas e efeitos.
// Os traços continuam os de data/srd.js e data/expanded-catalog.js.
// ---------------------------------------------------------------------------
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const SPECIES_2014_CHOICES = {
  dragonborn: { choices: [DRACONIC_ANCESTRY] },
  drow: { skills: ['perception'], cantrips: ['dancingLights'], spells: { 3: ['faerieFire'], 5: ['darkness'] }, fixedSpellAbility: 'cha' },
  'elf-high': { skills: ['perception'], fixedSpellAbility: 'int',
    choices: [{ key: 'cantrip', label: b('Truque de Mago', 'Wizard cantrip'), list: 'wizard' }] },
  'elf-wood': { skills: ['perception'] },
  'gnome-forest': { cantrips: ['minorIllusion'], fixedSpellAbility: 'int' },
  tiefling: { resist: ['fire'], cantrips: ['thaumaturgy'], spells: { 5: ['darkness'] }, fixedSpellAbility: 'cha' },
  aasimar: { resist: ['necrotic', 'radiant'], cantrips: ['light'], fixedSpellAbility: 'cha' },
  'half-elf': { choices: [{ key: 'skill', label: b('Versatilidade em Perícias', 'Skill Versatility'), count: 2 }] },
  'human-variant': { choices: [
    { key: 'asi', label: b('+1 em dois atributos', '+1 to two abilities'), pattern: [1, 1], from: ABILITIES },
    { key: 'skill', label: b('Perícia', 'Skill') },
    { key: 'feat', label: b('Talento', 'Feat'), kind: 'asi' },
  ] },
  'custom-lineage': { choices: [
    SIZE,
    { key: 'asi', label: b('+2 em um atributo', '+2 to one ability'), pattern: [2], from: ABILITIES },
    { key: 'feat', label: b('Talento', 'Feat'), kind: 'asi' },
    { key: 'bonus', label: b('Traço variável', 'Variable trait'), options: [
      { id: 'darkvision', name: b('Visão no escuro (60 pés)', 'Darkvision (60 feet)'), darkvision: 60 },
      { id: 'skill', name: b('Proficiência em uma perícia', 'Proficiency in one skill') },
    ] },
    { key: 'skill', label: b('Perícia', 'Skill'), when: { bonus: 'skill' } },
  ] },
};
