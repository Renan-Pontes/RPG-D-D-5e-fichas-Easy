// Ladino — traços 2024 (SRD 5.2.1, CC-BY 4.0), escolhas e subclasses.
// Formato em README.md. Textos de fora do SRD (PHB 2024, SCAG/XGE, TCE) são
// resumos originais, nunca o texto dos livros.
import { SHARED } from './shared.js';

const b = (pt, en) => ({ pt, en });
const f = (id, pt, en, descPt, descEn) => ({ id, name: b(pt, en), desc: b(descPt, descEn) });

const ASI = f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
  'Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique. Este traço se repete nos níveis de Ladino 8, 10, 12 e 16.',
  'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Rogue levels 8, 10, 12, and 16.');

// ---------------------------------------------------------------------------
// Traços da classe base (2024)
const features = {
  1: [
    f('expertise', 'Especialização', 'Expertise',
      'Você ganha Especialização em duas perícias em que já é proficiente, à sua escolha (o bônus de proficiência é dobrado nelas). Prestidigitação e Furtividade são recomendadas, se você for proficiente nelas. No nível de Ladino 6, ganha Especialização em mais duas perícias proficientes.',
      'You gain Expertise in two of your skill proficiencies of your choice (your Proficiency Bonus is doubled for them). Sleight of Hand and Stealth are recommended if you have proficiency in them. At Rogue level 6, you gain Expertise in two more of your skill proficiencies.'),
    f('sneakAttack', 'Ataque Furtivo', 'Sneak Attack',
      'Uma vez por turno, você pode causar 1d6 de dano extra a uma criatura que atingir com uma jogada de ataque, se tiver Vantagem na jogada e o ataque usar uma arma de Acuidade ou à Distância. O dano extra é do mesmo tipo do da arma. Você não precisa de Vantagem se pelo menos um aliado seu estiver a até 1,5 m do alvo, esse aliado não estiver Incapacitado e você não tiver Desvantagem na jogada. O dano extra aumenta com o nível de Ladino (coluna Ataque Furtivo): 1d6 a cada dois níveis, até 10d6 no nível 19.',
      "Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack roll if you have Advantage on the roll and the attack uses a Finesse or a Ranged weapon. The extra damage's type is the same as the weapon's type. You don't need Advantage if at least one of your allies is within 5 feet of the target, the ally doesn't have the Incapacitated condition, and you don't have Disadvantage on the attack roll. The extra damage increases as you gain Rogue levels (Sneak Attack column): 1d6 every two levels, up to 10d6 at level 19."),
    f('thievesCant', 'Gíria de Ladrão', "Thieves' Cant",
      'Você conhece a Gíria de Ladrão e mais um idioma à sua escolha, tirado das tabelas de idiomas da criação de personagem.',
      "You know Thieves' Cant and one other language of your choice, chosen from the language tables in character creation."),
    f('weaponMastery', 'Maestria em Armas', 'Weapon Mastery',
      'Você pode usar as propriedades de maestria de dois tipos de arma em que é proficiente, à sua escolha (por exemplo, Adagas e Arcos Curtos). Ao terminar um Descanso Longo, pode trocar os tipos escolhidos.',
      'You can use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Daggers and Shortbows. Whenever you finish a Long Rest, you can change the kinds of weapons you chose.'),
  ],
  2: [
    f('cunningAction', 'Ação Astuta', 'Cunning Action',
      'No seu turno, você pode realizar uma destas ações como Ação Bônus: Disparada, Desengajar ou Esconder.',
      'On your turn, you can take one of the following actions as a Bonus Action: Dash, Disengage, or Hide.'),
  ],
  3: [
    f('rogueSubclass', 'Subclasse de Ladino', 'Rogue Subclass',
      'Você escolhe uma subclasse de Ladino. Ela concede traços nos níveis de Ladino 3, 9, 13 e 17.',
      'You gain a Rogue subclass of your choice. It grants features at Rogue levels 3, 9, 13, and 17.'),
    f('steadyAim', 'Mira Estável', 'Steady Aim',
      'Como Ação Bônus, você se dá Vantagem na próxima jogada de ataque neste turno. Só pode usar se não tiver se movido neste turno e, depois de usar, seu Deslocamento fica 0 até o fim do turno.',
      "As a Bonus Action, you give yourself Advantage on your next attack roll on the current turn. You can use this feature only if you haven't moved during this turn, and after you use it, your Speed is 0 until the end of the current turn."),
  ],
  4: [ASI],
  5: [
    f('cunningStrike', 'Golpe Astuto', 'Cunning Strike',
      'Ao causar dano de Ataque Furtivo, você pode adicionar um efeito de Golpe Astuto. Cada efeito tem um custo em dados de Ataque Furtivo, removidos antes da rolagem; o efeito acontece logo após o dano. CD das salvaguardas = 8 + mod. de Destreza + bônus de proficiência. Efeitos: • Envenenar (1d6): o alvo faz salvaguarda de Constituição ou fica Envenenado por 1 minuto, repetindo a salvaguarda no fim de cada turno dele; exige um Kit de Envenenador com você. • Derrubar (1d6): alvo Grande ou menor faz salvaguarda de Destreza ou fica Caído. • Recuar (1d6): logo após o ataque, você se move até metade do Deslocamento sem provocar Ataques de Oportunidade.',
      'When you deal Sneak Attack damage, you can add one Cunning Strike effect. Each effect has a die cost: Sneak Attack dice you forgo, removed before rolling; the effect occurs right after the damage. Save DC = 8 + your Dexterity modifier + Proficiency Bonus. Effects: • Poison (1d6): the target makes a Constitution save or is Poisoned for 1 minute, repeating the save at the end of each of its turns; you must have a Poisoner\'s Kit on your person. • Trip (1d6): a Large or smaller target makes a Dexterity save or has the Prone condition. • Withdraw (1d6): immediately after the attack, you move up to half your Speed without provoking Opportunity Attacks.'),
    f('uncannyDodge', 'Esquiva Sobrenatural', 'Uncanny Dodge',
      'Quando um atacante que você consegue ver o atinge com uma jogada de ataque, você pode usar sua Reação para reduzir à metade o dano desse ataque (arredondado para baixo).',
      "When an attacker that you can see hits you with an attack roll, you can take a Reaction to halve the attack's damage against you (round down)."),
  ],
  6: [
    f('expertise', 'Especialização', 'Expertise',
      'Você ganha Especialização em mais duas perícias em que é proficiente, à sua escolha.',
      'You gain Expertise in two more of your skill proficiencies of your choice.'),
  ],
  7: [
    f('evasion', 'Evasão', 'Evasion',
      'Quando um efeito permite uma salvaguarda de Destreza para sofrer só metade do dano, você não sofre dano se passar e sofre só metade se falhar. Não funciona se você estiver Incapacitado.',
      "When you're subjected to an effect that allows a Dexterity saving throw to take only half damage, you take no damage on a success and only half damage on a failure. You can't use this feature while Incapacitated."),
    f('reliableTalent', 'Talento Confiável', 'Reliable Talent',
      'Em testes de atributo que usam uma perícia ou ferramenta em que você é proficiente, você pode tratar um resultado de 9 ou menos no d20 como 10.',
      'Whenever you make an ability check that uses one of your skill or tool proficiencies, you can treat a d20 roll of 9 or lower as a 10.'),
  ],
  8: [ASI],
  10: [ASI],
  11: [
    f('improvedCunningStrike', 'Golpe Astuto Aprimorado', 'Improved Cunning Strike',
      'Você pode usar até dois efeitos de Golpe Astuto ao causar dano de Ataque Furtivo, pagando o custo em dados de cada um.',
      'You can use up to two Cunning Strike effects when you deal Sneak Attack damage, paying the die cost for each effect.'),
  ],
  12: [ASI],
  14: [
    f('deviousStrikes', 'Golpes Ardilosos', 'Devious Strikes',
      'Novos efeitos de Golpe Astuto: • Atordoar (2d6): o alvo faz salvaguarda de Constituição ou, no próximo turno dele, só pode fazer uma destas coisas: mover-se, realizar uma ação ou uma Ação Bônus. • Nocautear (6d6): o alvo faz salvaguarda de Constituição ou fica Inconsciente por 1 minuto ou até sofrer qualquer dano, repetindo a salvaguarda no fim de cada turno dele. • Obscurecer (3d6): o alvo faz salvaguarda de Destreza ou fica Cego até o fim do próximo turno dele.',
      'New Cunning Strike effects: • Daze (2d6): the target makes a Constitution save or, on its next turn, it can do only one of the following: move or take an action or a Bonus Action. • Knock Out (6d6): the target makes a Constitution save or has the Unconscious condition for 1 minute or until it takes any damage, repeating the save at the end of each of its turns. • Obscure (3d6): the target makes a Dexterity save or has the Blinded condition until the end of its next turn.'),
  ],
  15: [
    f('slipperyMind', 'Mente Escorregadia', 'Slippery Mind',
      'Você ganha proficiência em salvaguardas de Sabedoria e de Carisma.',
      'You gain proficiency in Wisdom and Charisma saving throws.'),
  ],
  16: [ASI],
  18: [
    f('elusive', 'Esquivo', 'Elusive',
      'Nenhuma jogada de ataque pode ter Vantagem contra você, a menos que você esteja Incapacitado.',
      'No attack roll can have Advantage against you unless you have the Incapacitated condition.'),
  ],
  19: [
    f('epicBoon', 'Dádiva Épica', 'Epic Boon',
      'Você ganha um talento de Dádiva Épica ou outro talento para o qual se qualifique. Dádiva do Espírito Noturno é recomendada.',
      'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of the Night Spirit is recommended.'),
  ],
  20: [
    f('strokeOfLuck', 'Golpe de Sorte', 'Stroke of Luck',
      'Se falhar num Teste de d20, você pode transformar a rolagem em 20. Depois de usar, só pode usar de novo ao terminar um Descanso Curto ou Longo.',
      'If you fail a D20 Test, you can turn the roll into a 20. Once you use this feature, you can\'t use it again until you finish a Short or Long Rest.'),
  ],
};

// ---------------------------------------------------------------------------
// Pools
const mastermindOnly = { subclass: ['mastermind'] };
const gamingSet = (id, pt, en) => ({
  id, name: b(pt, en), source: 'XGE', prereq: mastermindOnly,
  desc: b(`Proficiência com ${pt}.`, `Proficiency with ${en}.`),
});

const pools = {
  // Especialização (nv 1: 2; nv 6: 2) — só perícias em que já é proficiente.
  expertise: {
    name: b('Especialização', 'Expertise'),
    kind: 'skill', grantAs: 'expertise', filter: { proficient: true },
  },
  // Especialização 2014 (PHB/SRD 5.1; nv 1: 2; nv 6: 2): perícias proficientes ou
  // Ferramentas de Ladrão.
  expertise2014: {
    name: b('Especialização', 'Expertise'),
    kind: 'skill', grantAs: 'expertise', filter: { proficient: true, tools: ['thievesTools'] },
  },
  // Gíria de Ladrão: o idioma extra do nível 1.
  language: {
    name: b('Idioma (Gíria de Ladrão)', "Language (Thieves' Cant)"),
    kind: 'language', grantAs: 'language',
  },
  weaponMastery: SHARED.weaponMastery,

  // --- Subclasses ---
  // Mentor (Mestre da Intriga): dois idiomas e um jogo.
  mastermindLanguage: {
    name: b('Idiomas do Mentor', 'Mastermind Languages'),
    kind: 'language', grantAs: 'language',
  },
  mastermindGamingSet: {
    name: b('Jogo do Mentor', 'Mastermind Gaming Set'),
    options: [
      gamingSet('diceSet', 'Dados', 'Dice'),
      gamingSet('dragonchessSet', 'Xadrez de Dragão', 'Dragonchess'),
      gamingSet('playingCardSet', 'Cartas de Baralho', 'Playing Cards'),
      gamingSet('threeDragonAnteSet', 'Ante dos Três Dragões', 'Three-Dragon Ante'),
    ],
  },
  // Fantasma (Sussurros dos Mortos): 1 perícia que muda a cada descanso.
  phantomWhispers: {
    name: b('Sussurros dos Mortos', 'Whispers of the Dead'),
    kind: 'skill', grantAs: 'skill',
    freeSwap: true, // troca ao terminar Descanso Curto ou Longo
  },
};

// ---------------------------------------------------------------------------
// Subclasses (2024 e suplementos com os traços revistos)
const subclasses = {
  thief: {
    name: b('Ladrão', 'Thief'), source: 'SRD',
    desc: b('Arrombador, caçador de tesouros e explorador: agilidade, furtividade e bom uso de itens mágicos.', 'Burglar, treasure hunter, and explorer: agility, stealth, and making the most of magic items.'),
    levels: {
      3: { features: [
        f('fastHands', 'Mãos Rápidas', 'Fast Hands',
          'Como Ação Bônus, você pode: • Prestidigitação: fazer um teste de Destreza (Prestidigitação) para abrir uma fechadura ou desarmar uma armadilha com Ferramentas de Ladrão, ou para bater uma carteira. • Usar um Objeto: realizar a ação Utilizar, ou a ação Mágica para usar um item mágico que a exija.',
          'As a Bonus Action, you can: • Sleight of Hand: make a Dexterity (Sleight of Hand) check to pick a lock or disarm a trap with Thieves\' Tools or to pick a pocket. • Use an Object: take the Utilize action, or take the Magic action to use a magic item that requires that action.'),
        f('secondStoryWork', 'Trabalho de Segundo Andar', 'Second-Story Work',
          'Escalador: você ganha Deslocamento de Escalada igual ao seu Deslocamento. Saltador: você determina a distância dos seus saltos usando Destreza em vez de Força.',
          'Climber: you gain a Climb Speed equal to your Speed. Jumper: you can determine your jump distance using your Dexterity rather than your Strength.'),
      ] },
      9: { features: [
        f('supremeSneak', 'Furtividade Suprema', 'Supreme Sneak',
          'Você ganha a opção de Golpe Astuto Ataque Oculto (custo 1d6): se você estiver Invisível pela ação Esconder, este ataque não encerra essa condição se você terminar o turno atrás de Cobertura de Três Quartos ou Total.',
          "You gain the Stealth Attack Cunning Strike option (cost 1d6): if you have the Hide action's Invisible condition, this attack doesn't end that condition on you if you end the turn behind Three-Quarters Cover or Total Cover."),
      ] },
      13: { features: [
        f('useMagicDevice', 'Usar Dispositivo Mágico', 'Use Magic Device',
          'Sintonia: você pode estar em sintonia com até quatro itens mágicos. Cargas: ao usar uma propriedade de item mágico que gasta cargas, role 1d6; num 6, a propriedade não gasta as cargas. Pergaminhos: você pode usar qualquer Pergaminho de Magia, usando Inteligência como atributo de conjuração. Truques e magias de 1º círculo funcionam sempre; para círculos maiores, faça um teste de Inteligência (Arcanismo) CD 10 + círculo da magia — se falhar, o pergaminho se desfaz.',
          'Attunement: you can attune to up to four magic items at once. Charges: whenever you use a magic item property that expends charges, roll 1d6; on a 6, you use it without expending the charges. Scrolls: you can use any Spell Scroll, using Intelligence as your spellcasting ability. Cantrips and level 1 spells work reliably; for higher levels, make an Intelligence (Arcana) check (DC 10 + the spell\'s level) — on a failure, the scroll disintegrates.'),
      ] },
      17: { features: [
        f('thiefsReflexes', 'Reflexos de Ladrão', "Thief's Reflexes",
          'Você pode fazer dois turnos na primeira rodada de qualquer combate: o primeiro na sua Iniciativa normal e o segundo na sua Iniciativa − 10.',
          'You can take two turns during the first round of any combat: the first at your normal Initiative and the second at your Initiative minus 10.'),
      ] },
    },
  },

  assassin: {
    name: b('Assassino', 'Assassin'), source: 'PHB24',
    desc: b('Especialista em emboscadas, venenos e disfarces para eliminar alvos com eficiência.', 'An expert in ambushes, poisons, and disguises who eliminates targets efficiently.'),
    levels: {
      3: { grants: { tools: ['disguiseKit', 'poisonersKit'] }, features: [
        f('assassinate', 'Assassinar', 'Assassinate',
          'Iniciativa: você tem Vantagem nas jogadas de Iniciativa. Golpes Surpreendentes: na primeira rodada de cada combate, você tem Vantagem nas jogadas de ataque contra qualquer criatura que ainda não tenha feito um turno; se o seu Ataque Furtivo atingir um alvo nessa rodada, ele sofre dano extra do tipo da arma igual ao seu nível de Ladino.',
          "Initiative: you have Advantage on Initiative rolls. Surprising Strikes: during the first round of each combat, you have Advantage on attack rolls against any creature that hasn't taken a turn; if your Sneak Attack hits a target during that round, it takes extra damage of the weapon's type equal to your Rogue level."),
        f('assassinsTools', 'Ferramentas do Assassino', "Assassin's Tools",
          'Você recebe um Kit de Disfarce e um Kit de Envenenador e tem proficiência com ambos.',
          "You gain a Disguise Kit and a Poisoner's Kit, and you have proficiency with them."),
      ] },
      9: { features: [
        f('infiltrationExpertise', 'Especialista em Infiltração', 'Infiltration Expertise',
          'Imitação Magistral: depois de estudar uma pessoa por pelo menos 1 hora, você imita sem falhas a fala dela, a caligrafia ou ambas. Mira Móvel: usar Mira Estável não reduz seu Deslocamento a 0.',
          "Masterful Mimicry: after studying a person for at least 1 hour, you can flawlessly mimic their speech, handwriting, or both. Roving Aim: using Steady Aim doesn't reduce your Speed to 0."),
      ] },
      13: { features: [
        f('envenomWeapons', 'Armas Envenenadas', 'Envenom Weapons',
          'Quando você usa a opção Envenenar do Golpe Astuto, o alvo também sofre 2d6 de dano de Veneno sempre que falhar na salvaguarda. Esse dano ignora Resistência a Veneno.',
          'When you use the Poison option of Cunning Strike, the target also takes 2d6 Poison damage whenever it fails the saving throw. This damage ignores Resistance to Poison damage.'),
      ] },
      17: { features: [
        f('deathStrike', 'Golpe Mortal', 'Death Strike',
          'Quando você acerta com Ataque Furtivo na primeira rodada de um combate, o alvo faz uma salvaguarda de Constituição (CD 8 + mod. de Destreza + bônus de proficiência); se falhar, o dano do ataque é dobrado contra ele.',
          "When you hit with your Sneak Attack on the first round of a combat, the target makes a Constitution saving throw (DC 8 + your Dexterity modifier + Proficiency Bonus); on a failure, the attack's damage is doubled against it."),
      ] },
    },
  },

  arcanetrickster: {
    name: b('Trapaceiro Arcano', 'Arcane Trickster'), source: 'PHB24',
    desc: b('Reforça a furtividade e a agilidade com magias de mago e truques com a Mão Mágica.', 'Enhances stealth and agility with Wizard spells and Mage Hand tricks.'),
    // Contadores de conjurador 1/3 (mesmos números da versão atual): truques e magias.
    levels: {
      3: { cantripsKnown: 3, spellsKnown: 3, autoCantrips: ['mageHand'], features: [
        f('spellcasting', 'Conjuração', 'Spellcasting',
          'Você conjura magias da lista do Mago usando Inteligência, com um Foco Arcano. Truques: Mão Mágica e mais dois truques de Mago (Farpa Mental e Ilusão Menor são recomendados); no nível de Ladino 10, aprende mais um. Magias: prepare três magias de Mago de 1º círculo (Enfeitiçar Pessoa, Disfarçar-se e Névoa Obscurecente são recomendadas); a quantidade cresce com a tabela do Trapaceiro Arcano, sempre de círculos para os quais você tenha espaços, de qualquer escola. A cada nível de Ladino, pode trocar um truque (exceto Mão Mágica) e uma magia preparada. Espaços de magia de conjurador de um terço; recupera todos num Descanso Longo.',
          'You cast spells from the Wizard list using Intelligence, with an Arcane Focus. Cantrips: Mage Hand and two other Wizard cantrips (Mind Sliver and Minor Illusion are recommended); you learn another at Rogue level 10. Spells: prepare three level 1 Wizard spells (Charm Person, Disguise Self, and Fog Cloud are recommended); the number grows per the Arcane Trickster table, always of levels for which you have slots, from any school. Each Rogue level, you can replace one cantrip (except Mage Hand) and one prepared spell. One-third caster spell slots; you regain all of them on a Long Rest.'),
        f('mageHandLegerdemain', 'Prestidigitação com a Mão Mágica', 'Mage Hand Legerdemain',
          'Ao conjurar Mão Mágica, você pode fazê-lo como Ação Bônus e tornar a mão espectral Invisível. Você controla a mão como Ação Bônus e pode fazer testes de Destreza (Prestidigitação) por meio dela.',
          'When you cast Mage Hand, you can cast it as a Bonus Action and make the spectral hand Invisible. You can control the hand as a Bonus Action and make Dexterity (Sleight of Hand) checks through it.'),
      ] },
      4: { spellsKnown: 4 },
      7: { spellsKnown: 5 },
      8: { spellsKnown: 6 },
      9: { features: [
        f('magicalAmbush', 'Emboscada Mágica', 'Magical Ambush',
          'Se você estiver Invisível ao conjurar uma magia numa criatura, ela tem Desvantagem nas salvaguardas contra essa magia no mesmo turno.',
          'If you have the Invisible condition when you cast a spell on a creature, it has Disadvantage on any saving throw it makes against the spell on the same turn.'),
      ] },
      10: { spellsKnown: 7, cantripsKnown: 4 },
      11: { spellsKnown: 8 },
      13: { spellsKnown: 9, features: [
        f('versatileTrickster', 'Trapaceiro Versátil', 'Versatile Trickster',
          'Quando você usa a opção Derrubar do Golpe Astuto numa criatura, pode aplicá-la também a outra criatura a até 1,5 m da sua Mão Mágica.',
          'When you use the Trip option of Cunning Strike on a creature, you can also use that option on another creature within 5 feet of your spectral hand.'),
      ] },
      14: { spellsKnown: 10 },
      16: { spellsKnown: 11 },
      17: { features: [
        f('spellThief', 'Ladrão de Magia', 'Spell Thief',
          'Logo após uma criatura conjurar uma magia que tenha você como alvo ou o inclua na área, você pode usar sua Reação para forçá-la a fazer uma salvaguarda de Inteligência contra a CD das suas magias. Se falhar, a magia não tem efeito sobre você e, se for de 1º círculo ou mais e de um círculo que você possa conjurar (de qualquer lista), você a tem preparada pelas próximas 8 horas — e a criatura não pode conjurá-la nesse período. Uma vez por Descanso Longo.',
          "Immediately after a creature casts a spell that targets you or includes you in its area, you can take a Reaction to force it to make an Intelligence saving throw against your spell save DC. On a failure, the spell's effect on you is negated and, if the spell is level 1+ and of a level you can cast (from any list), you have it prepared for the next 8 hours — and the creature can't cast it during that time. Once per Long Rest."),
      ] },
      19: { spellsKnown: 12 },
      20: { spellsKnown: 13 },
    },
  },

  soulknife: {
    name: b('Lâmina da Alma', 'Soulknife'), source: 'PHB24',
    desc: b('Canaliza poder psiônico em lâminas psíquicas, telepatia e teleporte.', 'Channels psionic power into psychic blades, telepathy, and teleportation.'),
    levels: {
      3: { features: [
        f('psionicPower', 'Poder Psiônico', 'Psionic Power',
          'Você tem Dados de Energia Psiônica: 4d6 no nível de Ladino 3, 6d8 no 5, 8d8 no 9, 8d10 no 11, 10d10 no 13 e 12d12 no 17. Recupera um dado gasto num Descanso Curto e todos num Descanso Longo. Poderes: • Reforço Psiônico: ao falhar num teste de atributo com perícia ou ferramenta proficiente, role um dado e some; ele só é gasto se o teste passar. • Sussurros Psíquicos: como ação Mágica, escolha até BP criaturas que você veja e role um dado; por esse número de horas, vocês se comunicam por telepatia a até 1,5 km. O primeiro uso após cada Descanso Longo não gasta o dado.',
          'You have Psionic Energy Dice: 4d6 at Rogue level 3, 6d8 at 5, 8d8 at 9, 8d10 at 11, 10d10 at 13, and 12d12 at 17. You regain one expended die on a Short Rest and all of them on a Long Rest. Powers: • Psi-Bolstered Knack: when you fail an ability check using a proficient skill or tool, roll a die and add it; it is expended only if the check then succeeds. • Psychic Whispers: as a Magic action, choose up to PB creatures you can see and roll a die; for that many hours, you can speak telepathically with each other within 1 mile. The first use after each Long Rest doesn\'t expend the die.'),
        f('psychicBlades', 'Lâminas Psíquicas', 'Psychic Blades',
          'Ao realizar a ação Atacar ou um Ataque de Oportunidade, você pode manifestar uma Lâmina Psíquica na mão livre e atacar com ela: arma corpo a corpo simples, 1d6 de dano Psíquico + o modificador usado no ataque, Acuidade, Arremesso (18/36 m) e maestria Irritar (que não conta no limite da Maestria em Armas). A lâmina some após acertar ou errar. Depois de atacar com ela, você pode fazer outro ataque com uma segunda lâmina como Ação Bônus no mesmo turno, se a outra mão estiver livre; esse dano é 1d4.',
          "When you take the Attack action or make an Opportunity Attack, you can manifest a Psychic Blade in your free hand and attack with it: a simple melee weapon, 1d6 Psychic damage + the ability modifier used for the attack, Finesse, Thrown (60/120 ft), and the Vex mastery (which doesn't count against your Weapon Mastery limit). The blade vanishes after it hits or misses. After attacking with it, you can attack with a second blade as a Bonus Action on the same turn if your other hand is free; its damage die is 1d4."),
      ] },
      9: { features: [
        f('soulBlades', 'Lâminas da Alma', 'Soul Blades',
          'Novos poderes das Lâminas Psíquicas: • Golpes Teleguiados: se errar um ataque com a Lâmina Psíquica, role um Dado de Energia Psiônica e some ao ataque; o dado só é gasto se o ataque passar a acertar. • Teleporte Psíquico: como Ação Bônus, gaste e role um dado e arremesse uma lâmina a um espaço desocupado que você veja a até 10 × o resultado em pés (3 m por ponto); você se teletransporta para lá.',
          'New Psychic Blade powers: • Homing Strikes: if you miss with a Psychic Blade, roll a Psionic Energy Die and add it to the attack roll; the die is expended only if the attack then hits. • Psychic Teleportation: as a Bonus Action, expend and roll a die and throw a blade at an unoccupied space you can see up to 10 × the roll in feet away; you teleport to that space.'),
      ] },
      13: { features: [
        f('psychicVeil', 'Véu Psíquico', 'Psychic Veil',
          'Como ação Mágica, você fica Invisível por 1 hora ou até dispensar o efeito. A invisibilidade termina logo após você causar dano a uma criatura ou forçá-la a fazer uma salvaguarda. Uma vez por Descanso Longo, ou gaste um Dado de Energia Psiônica para usar de novo.',
          'As a Magic action, you gain the Invisible condition for 1 hour or until you dismiss it. It ends early right after you deal damage to a creature or force a creature to make a saving throw. Once per Long Rest, or expend a Psionic Energy Die to use it again.'),
      ] },
      17: { features: [
        f('rendMind', 'Dilacerar Mente', 'Rend Mind',
          'Quando você causa dano de Ataque Furtivo com uma Lâmina Psíquica, pode forçar o alvo a fazer uma salvaguarda de Sabedoria (CD 8 + mod. de Destreza + bônus de proficiência). Se falhar, fica Atordoado por 1 minuto, repetindo a salvaguarda no fim de cada turno dele. Uma vez por Descanso Longo, ou gaste três Dados de Energia Psiônica para usar de novo.',
          'When you deal Sneak Attack damage with a Psychic Blade, you can force the target to make a Wisdom saving throw (DC 8 + your Dexterity modifier + Proficiency Bonus). On a failure, it is Stunned for 1 minute, repeating the save at the end of each of its turns. Once per Long Rest, or expend three Psionic Energy Dice to use it again.'),
      ] },
    },
  },

  mastermind: {
    name: b('Mentor', 'Mastermind'), source: 'XGE',
    desc: b('Mestre da intriga: disfarces, idiomas, leitura de pessoas e ajuda tática a distância.', 'A master of intrigue: disguises, languages, reading people, and tactical help from afar.'),
    levels: {
      3: { grants: { tools: ['disguiseKit', 'forgeryKit'] }, features: [
        f('masterOfIntrigue', 'Mestre da Intriga', 'Master of Intrigue',
          'Você ganha proficiência com Kit de Disfarce, Kit de Falsificação e um tipo de jogo, e aprende dois idiomas à sua escolha. Depois de ouvir alguém falar por 1 minuto, consegue imitar o sotaque e o jeito de falar dessa pessoa.',
          'You gain proficiency with the Disguise Kit, the Forgery Kit, and one gaming set, and you learn two languages of your choice. After listening to someone speak for 1 minute, you can mimic their accent and speech patterns.'),
        f('masterOfTactics', 'Mestre das Táticas', 'Master of Tactics',
          'Você pode realizar a ação Ajudar como Ação Bônus. Ao ajudar um aliado a atacar, o alvo pode estar a até 9 m de você, desde que você o veja e ele possa ver ou ouvir você.',
          'You can take the Help action as a Bonus Action. When you help an ally attack, the target can be up to 30 feet away from you, as long as you can see it and it can see or hear you.'),
      ] },
      9: { features: [
        f('insightfulManipulator', 'Manipulador Perspicaz', 'Insightful Manipulator',
          'Observando e conversando com uma criatura por 1 minuto fora de combate, você descobre se ela é igual, superior ou inferior a você em duas destas características, à sua escolha: Inteligência, Sabedoria, Carisma ou níveis de classe. Você pode também intuir algo da história ou personalidade dela, a critério do Mestre.',
          'By observing and talking with a creature for 1 minute outside combat, you learn whether it is your equal, superior, or inferior in two of the following, your choice: Intelligence, Wisdom, Charisma, or class levels. You may also glean something of its history or personality, at the GM\'s discretion.'),
      ] },
      13: { features: [
        f('misdirection', 'Desvio', 'Misdirection',
          'Quando uma criatura mira você com um ataque e outra criatura a até 1,5 m de você lhe dá cobertura contra ele, você pode usar sua Reação para que o ataque mire essa outra criatura.',
          'When a creature targets you with an attack while another creature within 5 feet of you grants you cover against it, you can take a Reaction to have the attack target that creature instead.'),
      ] },
      17: { features: [
        f('soulOfDeceit', 'Alma do Engano', 'Soul of Deceit',
          'Seus pensamentos não podem ser lidos por telepatia nem magia, a menos que você permita; você pode apresentar pensamentos falsos com um teste de Carisma (Enganação) contra Sabedoria (Intuição) de quem lê. Magias que detectam mentiras indicam que você diz a verdade, se quiser, e você não pode ser compelido magicamente a dizer a verdade.',
          "Your thoughts can't be read by telepathy or magic unless you allow it; you can present false thoughts with a Charisma (Deception) check against the reader's Wisdom (Insight). Magic that detects lies shows you as truthful if you choose, and you can't be magically compelled to tell the truth."),
      ] },
    },
  },

  swashbuckler: {
    name: b('Espadachim', 'Swashbuckler'), source: 'XGE',
    desc: b('Duelista veloz e carismático que brilha no combate corpo a corpo contra um só oponente.', 'A fast, charismatic duelist who shines in one-on-one melee.'),
    levels: {
      3: { features: [
        f('fancyFootwork', 'Passos Elegantes', 'Fancy Footwork',
          'No seu turno, uma criatura contra a qual você fizer um ataque corpo a corpo não pode fazer Ataques de Oportunidade contra você até o fim desse turno.',
          "During your turn, a creature you make a melee attack against can't make Opportunity Attacks against you for the rest of that turn."),
        f('rakishAudacity', 'Audácia Imprudente', 'Rakish Audacity',
          'Você soma seu modificador de Carisma à Iniciativa. Além disso, pode usar Ataque Furtivo sem Vantagem se o alvo estiver a até 1,5 m de você, nenhuma outra criatura estiver a até 1,5 m de você e você não tiver Desvantagem na jogada.',
          "You add your Charisma modifier to your Initiative. You can also use Sneak Attack without Advantage if the target is within 5 feet of you, no other creature is within 5 feet of you, and you don't have Disadvantage on the roll."),
      ] },
      9: { features: [
        f('panache', 'Panache', 'Panache',
          'Como ação, faça um teste de Carisma (Persuasão) contra Sabedoria (Intuição) de uma criatura que ouça e entenda você. Se vencer uma criatura hostil, ela tem Desvantagem em ataques contra outros alvos que não você e não pode fazer Ataques de Oportunidade contra outros por 1 minuto (termina se um aliado seu a atacar ou afetar com magia, ou se vocês se afastarem mais de 18 m). Se vencer uma criatura não hostil, ela fica Enfeitiçada por você por 1 minuto (termina se você ou aliados a prejudicarem).',
          "As an action, make a Charisma (Persuasion) check contested by the Wisdom (Insight) of a creature that can hear and understand you. If you win against a hostile creature, it has Disadvantage on attacks against targets other than you and can't make Opportunity Attacks against others for 1 minute (ends if your ally attacks it or affects it with a spell, or if you end up more than 60 feet apart). If you win against a non-hostile creature, it is Charmed by you for 1 minute (ends if you or your allies harm it)."),
      ] },
      13: { features: [
        f('elegantManeuver', 'Manobra Elegante', 'Elegant Maneuver',
          'Como Ação Bônus, você tem Vantagem no próximo teste de Destreza (Acrobacia) ou Força (Atletismo) que fizer neste turno.',
          'As a Bonus Action, you have Advantage on the next Dexterity (Acrobatics) or Strength (Athletics) check you make this turn.'),
      ] },
      17: { features: [
        f('masterDuelist', 'Duelista Mestre', 'Master Duelist',
          'Quando você erra uma jogada de ataque, pode rolá-la de novo com Vantagem. Uma vez por Descanso Curto ou Longo.',
          'When you miss with an attack roll, you can reroll it with Advantage. Once per Short or Long Rest.'),
      ] },
    },
  },

  inquisitive: {
    name: b('Inquisitivo', 'Inquisitive'), source: 'XGE',
    desc: b('Investigador atento que desmascara mentiras e explora as fraquezas que descobre.', 'A keen investigator who sees through lies and exploits the weaknesses they uncover.'),
    levels: {
      3: { features: [
        f('earForDeceit', 'Ouvido para Mentiras', 'Ear for Deceit',
          'Em testes de Sabedoria (Intuição) para perceber se uma criatura está mentindo, você pode tratar um resultado de 7 ou menos no d20 como 8.',
          'On Wisdom (Insight) checks to determine whether a creature is lying, you can treat a d20 roll of 7 or lower as an 8.'),
        f('eyeForDetail', 'Olho para Detalhes', 'Eye for Detail',
          'Como Ação Bônus, você pode fazer um teste de Sabedoria (Percepção) para notar uma criatura ou objeto escondido, ou de Inteligência (Investigação) para encontrar ou decifrar pistas.',
          'As a Bonus Action, you can make a Wisdom (Perception) check to spot a hidden creature or object, or an Intelligence (Investigation) check to uncover or decipher clues.'),
        f('insightfulFighting', 'Luta Perspicaz', 'Insightful Fighting',
          'Como Ação Bônus, faça um teste de Sabedoria (Intuição) contra Carisma (Enganação) de uma criatura que você veja e que não esteja Incapacitada. Se vencer, pode usar Ataque Furtivo contra ela mesmo sem Vantagem (desde que não tenha Desvantagem) por 1 minuto ou até usar este traço em outro alvo.',
          "As a Bonus Action, make a Wisdom (Insight) check against the Charisma (Deception) of a creature you can see that isn't Incapacitated. If you win, you can use Sneak Attack against it even without Advantage (as long as you don't have Disadvantage) for 1 minute or until you use this feature on another target."),
      ] },
      9: { features: [
        f('steadyEye', 'Olhar Firme', 'Steady Eye',
          'Você tem Vantagem em testes de Sabedoria (Percepção) e Inteligência (Investigação) se não se mover mais que metade do seu Deslocamento no mesmo turno.',
          "You have Advantage on Wisdom (Perception) and Intelligence (Investigation) checks if you move no more than half your Speed on the same turn."),
      ] },
      13: { features: [
        f('unerringEye', 'Olho Infalível', 'Unerring Eye',
          'Como ação, você sente a presença de ilusões, metamorfos que não estejam na forma original e outras magias feitas para enganar os sentidos a até 9 m de você (sem saber exatamente o que as causa). Usos por Descanso Longo = seu modificador de Sabedoria (mínimo 1).',
          "As an action, you sense the presence of illusions, shapechangers not in their original form, and other magic meant to deceive the senses within 30 feet of you (without learning exactly what causes them). Uses per Long Rest = your Wisdom modifier (minimum 1)."),
      ] },
      17: { features: [
        f('eyeForWeakness', 'Olho para Fraquezas', 'Eye for Weakness',
          'Enquanto sua Luta Perspicaz estiver valendo contra uma criatura, seu Ataque Furtivo causa 3d6 de dano extra a ela.',
          'While your Insightful Fighting applies to a creature, your Sneak Attack deals an extra 3d6 damage to it.'),
      ] },
    },
  },

  scout: {
    name: b('Batedor', 'Scout'), source: 'XGE',
    desc: b('Explorador ágil dos ermos, mestre de emboscadas e escaramuças.', 'An agile wilderness explorer, master of ambushes and skirmishes.'),
    levels: {
      3: { grants: { skills: ['nature', 'survival'], expertise: ['nature', 'survival'] }, features: [
        f('skirmisher', 'Escaramuçador', 'Skirmisher',
          'Quando um inimigo termina o turno a até 1,5 m de você, você pode usar sua Reação para se mover até metade do seu Deslocamento sem provocar Ataques de Oportunidade.',
          'When an enemy ends its turn within 5 feet of you, you can take a Reaction to move up to half your Speed without provoking Opportunity Attacks.'),
        f('survivalist', 'Sobrevivente', 'Survivalist',
          'Você ganha proficiência em Natureza e Sobrevivência, se ainda não tiver, e Especialização nas duas (bônus de proficiência dobrado).',
          "You gain proficiency in Nature and Survival if you don't already have it, and Expertise in both (double Proficiency Bonus)."),
      ] },
      9: { features: [
        f('superiorMobility', 'Mobilidade Superior', 'Superior Mobility',
          'Seu Deslocamento aumenta em 3 m, assim como seus Deslocamentos de Escalada e Natação, se tiver.',
          'Your Speed increases by 10 feet, as do your Climb and Swim Speeds, if you have them.'),
      ] },
      13: { features: [
        f('ambushMaster', 'Mestre da Emboscada', 'Ambush Master',
          'Você tem Vantagem nas jogadas de Iniciativa. Na primeira rodada de cada combate, a primeira criatura que você atingir fica marcada: ataques contra ela têm Vantagem até o início do seu próximo turno.',
          'You have Advantage on Initiative rolls. During the first round of each combat, the first creature you hit is marked: attack rolls against it have Advantage until the start of your next turn.'),
      ] },
      17: { features: [
        f('suddenStrike', 'Golpe Súbito', 'Sudden Strike',
          'Quando você realiza a ação Atacar, pode fazer um ataque adicional como Ação Bônus. Esse ataque pode usar Ataque Furtivo mesmo que você já o tenha usado no turno, mas não contra o mesmo alvo.',
          "When you take the Attack action, you can make one additional attack as a Bonus Action. This attack can benefit from Sneak Attack even if you've already used it this turn, but not against the same target."),
      ] },
    },
  },

  phantom: {
    name: b('Fantasma', 'Phantom'), source: 'TCE',
    desc: b('Ladino ligado à morte, que colhe memórias dos falecidos e fere com lamentos necróticos.', 'A rogue bound to death who draws on the memories of the departed and wounds with necrotic wails.'),
    levels: {
      3: { features: [
        f('whispersOfTheDead', 'Sussurros dos Mortos', 'Whispers of the Dead',
          'Ao terminar um Descanso Curto ou Longo, você ganha proficiência numa perícia ou ferramenta à sua escolha que não tenha, até trocá-la no próximo descanso.',
          "Whenever you finish a Short or Long Rest, you gain proficiency in one skill or tool of your choice that you lack, until you replace it at your next rest."),
        f('wailsFromTheGrave', 'Lamentos da Sepultura', 'Wails from the Grave',
          'Logo após causar dano de Ataque Furtivo a uma criatura no seu turno, você pode escolher outra criatura que veja a até 9 m da primeira: ela sofre dano Necrótico igual a metade dos seus dados de Ataque Furtivo (arredondado para cima). Usos por Descanso Longo = bônus de proficiência.',
          'Right after you deal Sneak Attack damage to a creature on your turn, you can pick a second creature you can see within 30 feet of the first: it takes Necrotic damage equal to half your Sneak Attack dice (round up). Uses per Long Rest = your Proficiency Bonus.'),
      ] },
      9: { features: [
        f('tokensOfTheDeparted', 'Lembranças dos Falecidos', 'Tokens of the Departed',
          'Quando uma criatura que você veja morre a até 9 m, você pode usar sua Reação para criar uma bugiganga da alma na mão livre (máximo = bônus de proficiência). Com uma delas, você tem Vantagem em salvaguardas contra a morte e de Constituição. Ao causar Ataque Furtivo, pode destruir uma para usar Lamentos da Sepultura sem gastar uso; como ação, pode destruir uma para fazer uma pergunta ao espírito ligado a ela.',
          'When a creature you can see dies within 30 feet, you can take a Reaction to form a soul trinket in your free hand (maximum = Proficiency Bonus). While you carry one, you have Advantage on death saves and Constitution saves. When you deal Sneak Attack damage, you can destroy one to use Wails from the Grave without spending a use; as an action, you can destroy one to ask its spirit a question.'),
      ] },
      13: { features: [
        f('ghostWalk', 'Andar Fantasmagórico', 'Ghost Walk',
          'Como Ação Bônus, você assume uma forma espectral por 10 minutos: Deslocamento de Voo de 3 m (pode pairar), ataques contra você têm Desvantagem e você atravessa criaturas e objetos como terreno difícil (sofre 1d10 de dano de Energia se terminar o turno dentro de um). Uma vez por Descanso Longo, ou destrua uma bugiganga da alma para usar de novo.',
          "As a Bonus Action, you take a spectral form for 10 minutes: 10-foot Fly Speed (you can hover), attack rolls against you have Disadvantage, and you can move through creatures and objects as difficult terrain (taking 1d10 Force damage if you end your turn inside one). Once per Long Rest, or destroy a soul trinket to use it again."),
      ] },
      17: { features: [
        f('deathsFriend', 'Amigo da Morte', "Death's Friend",
          'Ao usar Lamentos da Sepultura, você pode causar o dano necrótico tanto à primeira criatura quanto à segunda. Ao terminar um Descanso Longo sem nenhuma bugiganga da alma, uma aparece na sua mão.',
          'When you use Wails from the Grave, you can deal the necrotic damage to both the first and the second creature. If you finish a Long Rest with no soul trinkets, one appears in your hand.'),
      ] },
    },
  },
};

// ---------------------------------------------------------------------------
// Recursos com usos (sem espaços de magia)
const PSI_DICE = { 3: 4, 5: 6, 9: 8, 13: 10, 17: 12 };
const PSI_DIE = { byLevel: { 3: 'd6', 5: 'd8', 11: 'd10', 17: 'd12' } };
const resources = [
  { id: 'strokeOfLuck', name: b('Golpe de Sorte', 'Stroke of Luck'),
    desc: b('2024: um Teste de d20 falho vira 20. 2014: ataque errado vira acerto ou teste de atributo vira 20.', '2024: a failed D20 Test becomes a 20. 2014: a missed attack becomes a hit or an ability check becomes a 20.'),
    uses: { fixed: 1 }, recharge: 'short', minLevel: 20 },
  // Lâmina da Alma: 2024 tem tabela fixa; 2014 (TCE) usa 2 × BP, que dá os mesmos números por nível de Ladino.
  { id: 'psionicEnergyDice', name: b('Dados de Energia Psiônica', 'Psionic Energy Dice'),
    desc: b('Recupera 1 dado no descanso curto e todos no longo.', 'Regain 1 die on a Short Rest and all on a Long Rest.'),
    uses: { byLevel: PSI_DICE }, recharge: 'long', shortRestRegain: 1, subclass: ['soulknife'], rules: '2024', die: PSI_DIE },
  { id: 'psionicEnergyDice2014', name: b('Dados de Energia Psiônica', 'Psionic Energy Dice'),
    desc: b('2 × bônus de proficiência; todos voltam no descanso longo (1× por descanso curto, Ação Bônus recupera 1).', '2 × Proficiency Bonus; all return on a Long Rest (once per Short Rest, a Bonus Action regains 1).'),
    uses: { byLevel: PSI_DICE }, recharge: 'long', subclass: ['soulknife'], rules: '2014', die: PSI_DIE },
  { id: 'psychicWhispers', name: b('Sussurros Psíquicos (grátis)', 'Psychic Whispers (free)'),
    desc: b('O primeiro uso após o descanso longo não gasta dado.', "The first use after a Long Rest doesn't expend a die."),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 3, subclass: ['soulknife'] },
  { id: 'psychicVeil', name: b('Véu Psíquico', 'Psychic Veil'),
    desc: b('Ou gaste 1 Dado de Energia Psiônica para usar de novo.', 'Or expend 1 Psionic Energy Die to use it again.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 13, subclass: ['soulknife'] },
  { id: 'rendMind', name: b('Dilacerar Mente', 'Rend Mind'),
    desc: b('Ou gaste 3 Dados de Energia Psiônica para usar de novo.', 'Or expend 3 Psionic Energy Dice to use it again.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 17, subclass: ['soulknife'] },
  { id: 'spellThief', name: b('Ladrão de Magia', 'Spell Thief'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 17, subclass: ['arcanetrickster', 'arcaneTrickster'] },
  { id: 'masterDuelist', name: b('Duelista Mestre', 'Master Duelist'),
    uses: { fixed: 1 }, recharge: 'short', minLevel: 17, subclass: ['swashbuckler'] },
  { id: 'unerringEye', name: b('Olho Infalível', 'Unerring Eye'),
    uses: { ability: 'wis', min: 1 }, recharge: 'long', minLevel: 13, subclass: ['inquisitive'] },
  { id: 'wailsFromTheGrave', name: b('Lamentos da Sepultura', 'Wails from the Grave'),
    uses: { profBonus: true }, recharge: 'long', minLevel: 3, subclass: ['phantom'] },
  { id: 'ghostWalk', name: b('Andar Fantasmagórico', 'Ghost Walk'),
    desc: b('Ou destrua uma bugiganga da alma para usar de novo.', 'Or destroy a soul trinket to use it again.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 13, subclass: ['phantom'] },
];

export default {
  classId: 'rogue',
  pools,
  // Especialização (1: 2; 6: 2), idioma da Gíria de Ladrão (1) e Maestria em Armas (1: 2).
  // Golpe Astuto é escolhido na hora do ataque — não é pool.
  choices: {
    1: { expertise: 2, language: 1, weaponMastery: 2 },
    6: { expertise: 2 },
  },
  // 2014: Especialização no 1 e no 6 (2 cada; pode incluir Ferramentas de Ladrão).
  legacyChoices: {
    1: { expertise2014: 2 },
    6: { expertise2014: 2 },
  },
  subclassChoices: {
    mastermind: { 3: { mastermindLanguage: 2, mastermindGamingSet: 1 } },
    phantom: { 3: { phantomWhispers: 1 } },
  },
  // Mentor e Fantasma são iguais nas fichas 2014.
  legacySubclassChoices: {
    mastermind: { 3: { mastermindLanguage: 2, mastermindGamingSet: 1 } },
    phantom: { 3: { phantomWhispers: 1 } },
  },
  // Proficiências fixas da classe base (2024): Gíria de Ladrão (1) e Mente Escorregadia (15).
  classLevels: {
    1: { grants: { languages: ["Thieves' Cant"] } },
    15: { grants: { saves: ['wis', 'cha'] } },
  },
  resources,
  features,
  subclasses,
};
