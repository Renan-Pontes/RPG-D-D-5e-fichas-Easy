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
      "Você aprendeu vários idiomas nas comunidades onde exerceu seus talentos ladinos. Você conhece Gíria de Ladrão e outro idioma de sua escolha, o qual você escolhe das tabelas de idiomas em \"Criação de Personagem\".",
      "You picked up various languages in the communities where you plied your roguish talents. You know Thieves' Cant and one other language of your choice, which you choose from the language tables in \"Character Creation.\""),
    f('weaponMastery', 'Maestria em Armas', 'Weapon Mastery',
      "Seu treinamento com armas permite que você use as propriedades de maestria de dois tipos de armas de sua escolha com as quais você tenha proficiência, como Adagas e Arcos Curtos.\n\nSempre que terminar um Descanso Longo, você pode trocar os tipos de armas escolhidos. Por exemplo, você poderia mudar para usar as propriedades de maestria de Cimitarras e Espadas Curtas.",
      "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Daggers and Shortbows.\n\nWhenever you finish a Long Rest, you can change the kinds of weapons you chose. For example, you could switch to using the mastery properties of Scimitars and Shortswords."),
  ],
  2: [
    f('cunningAction', 'Ação Astuta', 'Cunning Action',
      "Seu raciocínio rápido e agilidade permitem que você se mova e aja rapidamente. No seu turno, você pode realizar uma das seguintes ações como uma Ação Bônus: Disparada, Desengajar ou Esconder-se.",
      "Your quick thinking and agility allow you to move and act quickly. On your turn, you can take one of the following actions as a Bonus Action: Dash, Disengage, or Hide."),
  ],
  3: [
    f('rogueSubclass', 'Subclasse de Ladino', 'Rogue Subclass',
      "Você ganha uma subclasse de Ladino de sua escolha. A subclasse Ladrão é detalhada após a descrição desta classe. Uma subclasse é uma especialização que concede a você características em certos níveis de Ladino. Pelo restante da sua carreira, você ganha cada uma das características da sua subclasse que sejam do seu nível de Ladino ou inferior.",
      "You gain a Rogue subclass of your choice. The Thief subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Rogue levels. For the rest of your career, you gain each of your subclass's features that are of your Rogue level or lower."),
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
      "Você ganha Especialização em duas de suas perícias com as quais seja proficiente à sua escolha. Prestidigitação e Furtividade são recomendadas se você tiver proficiência nelas.\n\nNo nível 6 de Ladino, você ganha Especialização em mais duas perícias com as quais seja proficiente à sua escolha.",
      "You gain Expertise in two of your skill proficiencies of your choice. Sleight of Hand and Stealth are recommended if you have proficiency in them.\n\nAt Rogue level 6, you gain Expertise in two more of your skill proficiencies of your choice."),
  ],
  7: [
    f('evasion', 'Evasão', 'Evasion',
      "Você pode se esquivar agilmente de certos perigos. Quando for sujeito a um efeito que permite que você faça uma salvaguarda de Destreza para sofrer apenas metade do dano, em vez disso você não sofre nenhum dano se for bem-sucedido na salvaguarda e apenas metade do dano se falhar. Você não pode usar esta característica se estiver sob a condição Incapacitado.",
      "You can nimbly dodge out of the way of certain dangers. When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. You can't use this feature if you have the Incapacitated condition."),
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
      "Sua mente astuta é excepcionalmente difícil de controlar. Você ganha proficiência nas salvaguardas de Sabedoria e Carisma.",
      "Your cunning mind is exceptionally difficult to control. You gain proficiency in Wisdom and Charisma saving throws."),
  ],
  16: [ASI],
  18: [
    f('elusive', 'Esquivo', 'Elusive',
      "Você é tão evasivo que os atacantes raramente conseguem vantagem contra você. Nenhuma jogada de ataque pode ter Vantagem contra você a menos que você esteja sob a condição Incapacitado.",
      "You're so evasive that attackers rarely gain the upper hand against you. No attack roll can have Advantage against you unless you have the Incapacitated condition."),
  ],
  19: [
    f('epicBoon', 'Dádiva Épica', 'Epic Boon',
      "Você ganha um talento de Dádiva Épica (consulte \"Talentos\") ou outro talento de sua escolha para o qual você se qualifique. Dádiva do Espírito Noturno é recomendada.",
      "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of the Night Spirit is recommended."),
  ],
  20: [
    f('strokeOfLuck', 'Golpe de Sorte', 'Stroke of Luck',
      "Você tem um talento maravilhoso para ser bem-sucedido quando precisa. Se falhar em um Teste de D20, você pode transformar a rolagem em um 20.\n\nUma vez que usar esta característica, você não pode usá-la novamente até terminar um Descanso Curto ou Longo.",
      "You have a marvelous knack for succeeding when you need to. If you fail a D20 Test, you can turn the roll into a 20.\n\nOnce you use this feature, you can't use it again until you finish a Short or Long Rest."),
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
          "Você treinou para alcançar lugares especialmente difíceis de atingir, recebendo estes benefícios.\n\nEscalador. Você ganha um Deslocamento de Escalada igual ao seu Deslocamento.\n\nSaltador. Você pode determinar a distância do seu salto usando sua Destreza em vez da sua Força.",
          "You've trained to get into especially hard-to-reach places, granting you these benefits.\n\nClimber. You gain a Climb Speed equal to your Speed.\n\nJumper. You can determine your jump distance using your Dexterity rather than your Strength."),
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
          "Você é especialista em preparar emboscadas e escapar rapidamente do perigo. Você pode realizar dois turnos durante a primeira rodada de qualquer combate. Você realiza seu primeiro turno na sua Iniciativa normal e seu segundo turno na sua Iniciativa menos 10.",
          "You are adept at laying ambushes and quickly escaping danger. You can take two turns during the first round of any combat. You take your first turn at your normal Initiative and your second turn at your Initiative minus 10."),
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
          "A partir do 9º nível, você pode criar identidades falsas infalíveis para si mesmo. Você deve gastar sete dias e 25 po para estabelecer o histórico, a profissão e as afiliações para uma identidade. Você não pode estabelecer uma identidade que pertença a outra pessoa. Por exemplo, você pode adquirir roupas apropriadas, cartas de apresentação e certificações de aparência oficial para se estabelecer como membro de uma casa comercial de uma cidade remota, para que possa se insinuar na companhia de outros mercadores abastados.\n\nA partir de então, se adotar a nova identidade como um disfarce, outras criaturas acreditarão que você é aquela pessoa até terem um motivo óbvio para não acreditar.",
          "Starting at 9th level, you can unfailingly create false identities for yourself. You must spend seven days and 25 gp to establish the history, profession, and affiliations for an identity. You can’t establish an identity that belongs to someone else. For example, you might acquire appropriate clothing, letters of introduction, and officiallooking certification to establish yourself as a member of a trading house from a remote city so you can insinuate yourself into the company of other wealthy merchants.\n\nThereafter, if you adopt the new identity as a disguise, other creatures believe you to be that person until given an obvious reason not to."),
      ] },
      13: { features: [
        f('envenomWeapons', 'Armas Envenenadas', 'Envenom Weapons',
          "Quando você usa a opção Veneno do seu Golpe Astuto, o alvo também sofre 2d6 de dano de Veneno sempre que falhar na salvaguarda. Este dano ignora Resistência a dano de Veneno.",
          "When you use the Poison option of your Cunning Strike, the target also takes 2d6 Poison damage whenever it fails the saving throw. This damage ignores Resistance to Poison damage."),
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
          "Quando você conjura Mãos Mágicas, você pode conjurá-la como uma Ação Bônus, e você pode fazer a mão espectral",
          "When you cast Mage Hand, you can cast it as a Bonus Action, and you can make the spectral hand"),
      ] },
      4: { spellsKnown: 4 },
      7: { spellsKnown: 5 },
      8: { spellsKnown: 6 },
      9: { features: [
        f('magicalAmbush', 'Emboscada Mágica', 'Magical Ambush',
          "A partir do 9º nível, se você estiver escondido de uma criatura quando conjurar uma magia nela, a criatura tem desvantagem em qualquer salvaguarda que fizer contra a magia neste turno.",
          "Starting at 9th level, if you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any saving throw it makes against the spell this turn."),
      ] },
      10: { spellsKnown: 7, cantripsKnown: 4 },
      11: { spellsKnown: 8 },
      13: { spellsKnown: 9, features: [
        f('versatileTrickster', 'Trapaceiro Versátil', 'Versatile Trickster',
          "No 13º nível, você ganha a habilidade de distrair alvos com suas mãos mágicas. Como uma ação bônus no seu turno, você pode designar uma criatura a até 1,5 metro da mão espectral criada pela magia. Fazer isso concede a você vantagem nas jogadas de ataque contra essa criatura até o final do turno.",
          "At 13th level, you gain the ability to distract targets with your mage hand. As a bonus action on your turn, you can designate a creature within 5 feet of the spectral hand created by the spell. Doing so gives you advantage on attack rolls against that creature until the end of the turn."),
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
          "Você agora pode usar os seguintes poderes com suas Lâminas Psíquicas.\n\nAtaques Teleguiados. Se você fizer uma jogada de ataque com sua Lâmina Psíquica e errar o alvo, você pode rolar um Dado de Energia Psiônica e adicionar o número rolado\n\nDado de Energia e rolá-lo, e arremessar a lâmina em um espaço desocupado que você possa ver a uma distância de até 3 metros vezes o número rolado. Você então se teletransporta para aquele espaço, e a lâmina desaparece.",
          "You can now use the following powers with your Psychic Blades.\n\nHoming Strikes. If you make an attack roll with your Psychic Blade and miss the target, you can roll one Psionic Energy Die and add the number rolled\n\nergy Die and roll it, and throw t h e bla de at a n unoccupied space you can see up to a number o f fe et away equal to 10 times the numb e r rolled . You then teleport to that space, and the bl a de vani s h es."),
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
          "Quando você escolhe este arquétipo no 3º nível, você ganha proficiência com o kit de disfarce, o kit de falsificação e um conjunto de jogos à sua escolha. Você também aprende dois idiomas à sua escolha.\n\nAlém disso, você pode imitar infalivelmente os padrões de fala e o sotaque de uma criatura que você ouvir falar por pelo menos 1 minuto, permitindo que você se passe por um falante nativo de uma terra em particular, desde que conheça o idioma.",
          "When you choose this archetype at 3rd level, you gain proficiency with the disguise kit, the forgery kit, and one gaming set of your choice. You also learn two languages of your choice.\n\nAdditionally, you can unerringly mimic the speech patterns and accent of a creature that you hear speak for at least 1 minute, allowing you to pass yourself off as a native speaker of a particular land, provided that you know the language."),
        f('masterOfTactics', 'Mestre das Táticas', 'Master of Tactics',
          "A partir do 3º nível, você pode usar a ação de Ajudar como uma ação bônus. Além disso, quando você usa a ação de Ajudar para auxiliar um aliado a atacar uma criatura, o alvo daquele ataque pode estar a até 9 metros de você, em vez de 1,5 metro de você, se o alvo puder ver ou ouvir você.",
          "Starting at 3rd level, you can use the Help action as a bonus action. Additionally, when you use the Help action to aid an ally in attacking a creature, the target of that attack can be within 30 feet of you, rather than 5 feet of you, if the target can see or hear you."),
      ] },
      9: { features: [
        f('insightfulManipulator', 'Manipulador Perspicaz', 'Insightful Manipulator',
          'Observando e conversando com uma criatura por 1 minuto fora de combate, você descobre se ela é igual, superior ou inferior a você em duas destas características, à sua escolha: Inteligência, Sabedoria, Carisma ou níveis de classe. Você pode também intuir algo da história ou personalidade dela, a critério do Mestre.',
          'By observing and talking with a creature for 1 minute outside combat, you learn whether it is your equal, superior, or inferior in two of the following, your choice: Intelligence, Wisdom, Charisma, or class levels. You may also glean something of its history or personality, at the GM\'s discretion.'),
      ] },
      13: { features: [
        f('misdirection', 'Desvio', 'Misdirection',
          "A partir do 13º nível, você às vezes pode fazer com que outra criatura sofra um ataque direcionado a você. Quando você for alvo de um ataque enquanto uma criatura a até 1,5 metro de você estiver concedendo cobertura contra aquele ataque, você pode usar sua reação para fazer com que o ataque tenha aquela criatura como alvo em vez de você.",
          "Beginning at 13th level, you can sometimes cause another creature to suffer an attack meant for you. When you are targeted by an attack while a creature within 5 feet of you is granting you cover against that attack, you can use your reaction to have the attack target that creature instead of you."),
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
          "Quando você escolhe este arquétipo no 3º nível, você aprende a desferir um golpe e depois escapar sem represálias. Durante o seu turno, se você fizer um ataque corpo a corpo contra uma criatura, essa criatura não pode fazer ataques de oportunidade contra você pelo resto do seu turno.",
          "When you choose this archetype at 3rd level, you learn how to land a strike and then slip away without reprisal. During your turn, if you make a melee attack against a creature, that creature can't make opportunity attacks against you for the rest of your turn."),
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
          "A partir do 13º nível, você pode usar uma ação bônus no seu turno para ganhar vantagem no próximo teste de Destreza (Acrobacia) ou Força (Atletismo) que fizer durante o mesmo turno.",
          "Starting at 13th level, you can use a bonus action on your turn to gain advantage on the next Dexterity (Acrobatics) or Strength (Athletics) check you make during the same turn."),
      ] },
      17: { features: [
        f('masterDuelist', 'Duelista Mestre', 'Master Duelist',
          "A partir do 17º nível, sua maestria com a lâmina permite que você transforme o fracasso em sucesso em combate. Se você errar uma jogada de ataque, pode rolá-la novamente com vantagem. Depois de fazer isso, você não pode usar esta característica novamente até terminar um descanso curto ou longo.",
          "Beginning at 17th level, your mastery of the blade lets you turn failure into success in combat. If you miss with an attack roll, you can roll it again with advantage. Once you do so, you can't use this feature again until you finish a short or long rest."),
      ] },
    },
  },

  inquisitive: {
    name: b('Inquisitivo', 'Inquisitive'), source: 'XGE',
    desc: b('Investigador atento que desmascara mentiras e explora as fraquezas que descobre.', 'A keen investigator who sees through lies and exploits the weaknesses they uncover.'),
    levels: {
      3: { features: [
        f('earForDeceit', 'Ouvido para Mentiras', 'Ear for Deceit',
          "Quando você escolhe este arquétipo no 3º nível, desenvolve um talento para identificar mentiras. Sempre que fizer um teste de Sabedoria (Intuição) para determinar se uma criatura está mentindo, trate uma rolagem de 7 ou menos no d20 como um 8.",
          "When you choose this archetype at 3rd level, you develop a talent for picking out lies. Whenever you make a Wisdom (Insight) check to determine whether a creature is lying, treat a roll of 7 or lower on the d20 as an 8."),
        f('eyeForDetail', 'Olho para Detalhes', 'Eye for Detail',
          "A partir do 3º nível, você pode usar uma ação bônus para fazer um teste de Sabedoria (Percepção) para avistar uma criatura ou objeto escondido ou para fazer um teste de Inteligência (Investigação) para descobrir ou decifrar pistas.",
          "Starting at 3rd level, you can use a bonus action to make a Wisdom (Perception) check to spot a hidden creature or object or to make an Intelligence (Investigation) check to uncover or decipher clues."),
        f('insightfulFighting', 'Luta Perspicaz', 'Insightful Fighting',
          'Como Ação Bônus, faça um teste de Sabedoria (Intuição) contra Carisma (Enganação) de uma criatura que você veja e que não esteja Incapacitada. Se vencer, pode usar Ataque Furtivo contra ela mesmo sem Vantagem (desde que não tenha Desvantagem) por 1 minuto ou até usar este traço em outro alvo.',
          "As a Bonus Action, make a Wisdom (Insight) check against the Charisma (Deception) of a creature you can see that isn't Incapacitated. If you win, you can use Sneak Attack against it even without Advantage (as long as you don't have Disadvantage) for 1 minute or until you use this feature on another target."),
      ] },
      9: { features: [
        f('steadyEye', 'Olhar Firme', 'Steady Eye',
          "A partir do 9º nível, você tem vantagem em qualquer teste de Sabedoria (Percepção) ou Inteligência (Investigação) se não se mover mais do que a metade do seu deslocamento no mesmo turno.",
          "Starting at 9th level, you have advantage on any Wisdom (Perception) or Intelligence (Investigation) check if you move no more than half your speed on the same turn."),
      ] },
      13: { features: [
        f('unerringEye', 'Olho Infalível', 'Unerring Eye',
          'Como ação, você sente a presença de ilusões, metamorfos que não estejam na forma original e outras magias feitas para enganar os sentidos a até 9 m de você (sem saber exatamente o que as causa). Usos por Descanso Longo = seu modificador de Sabedoria (mínimo 1).',
          "As an action, you sense the presence of illusions, shapechangers not in their original form, and other magic meant to deceive the senses within 30 feet of you (without learning exactly what causes them). Uses per Long Rest = your Wisdom modifier (minimum 1)."),
      ] },
      17: { features: [
        f('eyeForWeakness', 'Olho para Fraquezas', 'Eye for Weakness',
          "No 17º nível, você aprende a explorar as fraquezas de uma criatura ao estudar cuidadosamente suas táticas e movimentos. Enquanto sua característica Luta Perspicaz se aplicar a uma criatura, o dano do seu Ataque Furtivo contra aquela criatura aumenta em 3d6.",
          "At 17th level, you learn to exploit a creature’s weaknesses by carefully studying its tactics and movement. While your Insightful Fighting feature applies to a creature, your Sneak Attack damage against that creature increases by 3d6."),
      ] },
    },
  },

  scout: {
    name: b('Batedor', 'Scout'), source: 'XGE',
    desc: b('Explorador ágil dos ermos, mestre de emboscadas e escaramuças.', 'An agile wilderness explorer, master of ambushes and skirmishes.'),
    levels: {
      3: { grants: { skills: ['nature', 'survival'], expertise: ['nature', 'survival'] }, features: [
        f('skirmisher', 'Escaramuçador', 'Skirmisher',
          "A partir do 3º nível, você é difícil de encurralar durante uma luta. Você pode se mover até metade do seu deslocamento como uma reação quando um inimigo termina o turno dele a até 1,5 metro de você. Esse movimento não provoca ataques de oportunidade.",
          "Starting at 3rd level, you are difficult to pin down during a fight. You can move up to half your speed as a reaction when an enemy ends its turn within 5 feet of you. This movement doesn’t provoke opportunity attacks."),
        f('survivalist', 'Sobrevivente', 'Survivalist',
          "Quando você escolhe este arquétipo no 3º nível, você ganha proficiência nas perícias Natureza e Sobrevivência se ainda não as tiver. Seu bônus de proficiência é dobrado em qualquer teste de habilidade que você fizer que use qualquer uma dessas proficiências.",
          "When you choose this archetype at 3rd level, you gain proficiency in the Nature and Survival skills if you don’t already have it. Your proficiency bonus is doubled for any ability check you make that uses either of those proficiencies."),
      ] },
      9: { features: [
        f('superiorMobility', 'Mobilidade Superior', 'Superior Mobility',
          "No 9º nível, seu deslocamento de caminhada aumenta em 3 metros. Se você tiver um deslocamento de escalada ou de natação, este aumento também se aplica a esse deslocamento.",
          "At 9th level, your walking speed increases by 10 feet. If you have a climbing or swimming speed, this increase applies to that speed as well."),
      ] },
      13: { features: [
        f('ambushMaster', 'Mestre da Emboscada', 'Ambush Master',
          "A partir do 13º nível, você se destaca em liderar emboscadas e agir primeiro em uma luta.\n\nVocê tem vantagem em jogadas de iniciativa. Além disso, a primeira criatura que você acertar durante a primeira rodada de um combate se torna mais fácil de ser atingida por você e por outros; jogadas de ataque contra aquele alvo têm vantagem até o início do seu próximo turno.",
          "Starting at 13th level, you excel at leading ambushes and acting first in a fight.\n\nYou have advantage on initiative rolls. In addition, the first creature you hit during the first round of a combat becomes easier for you and others to strike; attack rolls against that target have advantage until the start of your next turn."),
      ] },
      17: { features: [
        f('suddenStrike', 'Golpe Súbito', 'Sudden Strike',
          "A partir do 17º nível, você pode atacar com velocidade mortal. Se você realizar a ação de Ataque no seu turno, pode fazer um ataque adicional como uma ação bônus. Este ataque pode se beneficiar do seu Ataque Furtivo mesmo se você já o tiver usado neste turno, mas você não pode usar seu Ataque Furtivo contra o mesmo alvo mais de uma vez em um turno.",
          "Starting at 17th level, you can strike with deadly speed. If you take the Attack action on your turn, you can make one additional attack as a bonus action. This attack can benefit from your Sneak Attack even if you have already used it this turn, but you can’t use your Sneak Attack against the same target more than once in a turn."),
      ] },
    },
  },

  phantom: {
    name: b('Fantasma', 'Phantom'), source: 'TCE',
    desc: b('Ladino ligado à morte, que colhe memórias dos falecidos e fere com lamentos necróticos.', 'A rogue bound to death who draws on the memories of the departed and wounds with necrotic wails.'),
    levels: {
      3: { features: [
        f('whispersOfTheDead', 'Sussurros dos Mortos', 'Whispers of the Dead',
          "Característica de Fantasma de 3º nível\n\nEcos daqueles que morreram se apegam a você. Sempre que terminar um descanso curto ou longo, você pode escolher uma proficiência em perícia ou ferramenta que não possua e ganhá-la, enquanto uma presença fantasmagórica compartilha seu conhecimento com você. Você perde essa proficiência quando usar esta característica para escolher uma proficiência diferente que não possua.",
          "3rd-level Phantom feature\n\nEchoes of those who have died cling to you. Whenever you finish a short or long rest, you can choose one skill or tool proficiency that you lack and gain it, as a ghostly presence shares its knowledge with you. You lose this proficiency when you use this feature to choose a different proficiency that you lack."),
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
          "Característica de Fantasma de 17º nível\n\nSua associação com a morte se tornou tão próxima que você recebe os seguintes benefícios:\n\n• Quando você usa seus Lamentos do Túmulo, pode causar o dano necrótico tanto à primeira quanto à segunda criatura.\n\n• Ao final de um descanso longo, uma bugiganga de alma aparece na sua mão se você não tiver nenhuma bugiganga de alma, conforme os espíritos dos mortos são atraídos para você.",
          "17th-level Phantom feature\n\nYour association with death has become so close that you gain the following benefits:\n\n• When you use your Wails from the Grave, you can deal the necrotic damage to both the first and second creature.\n\n• At the end of the long rest, a soul trinket appears in your hand if you don’t have any soul trinkets, as the spirits of the dead are drawn to you."),
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
  // Especialização (1: 2; 6: 2) e Maestria em Armas (1: 2). O idioma extra da Gíria de Ladrão
  // é escolhido junto dos outros idiomas (Utils.languageChoiceSources, fonte 'class').
  // Golpe Astuto é escolhido na hora do ataque — não é pool.
  choices: {
    1: { expertise: 2, weaponMastery: 2 },
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
