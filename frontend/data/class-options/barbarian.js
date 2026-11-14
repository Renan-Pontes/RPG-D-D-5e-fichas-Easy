// Bárbaro — traços 2024, escolhas e subclasses. Formato em README.md.
// Texto da classe base e do Caminho do Berserker: resumo do SRD 5.2.1 (CC-BY 4.0).
// Demais subclasses: resumos originais (nomes, níveis e números apenas).
import { SHARED } from './shared.js';

const b = (pt, en) => ({ pt, en });
const f = (id, name, desc) => ({ id, name, desc });

// === Classe base (2024) ===
const features = {
  1: [
    f('rage', b('Fúria', 'Rage'), b(
      'Ação Bônus, sem armadura pesada. Usos por nível na tabela (2 no 1º, 3 no 3º, 4 no 6º, 5 no 12º, 6 no 17º); recupera 1 uso no Descanso Curto e todos no Longo. Enquanto ativa: resistência a dano de concussão, perfuração e corte; bônus de Dano de Fúria (+2, +3 no 9º, +4 no 16º) em ataques de Força (arma ou desarmado) que causem dano; vantagem em testes e salvaguardas de Força; não pode conjurar magias nem manter Concentração. Dura até o fim do seu próximo turno e termina antes se vestir armadura pesada ou ficar Incapacitado. Para estendê-la por mais uma rodada: ataque um inimigo, force um inimigo a fazer uma salvaguarda ou use uma Ação Bônus. Máximo de 10 minutos.',
      'Bonus Action, not wearing Heavy armor. Uses per the table (2 at 1st, 3 at 3rd, 4 at 6th, 5 at 12th, 6 at 17th); regain 1 use on a Short Rest and all on a Long Rest. While active: Resistance to Bludgeoning, Piercing, and Slashing damage; Rage Damage bonus (+2, +3 at 9th, +4 at 16th) to damaging Strength attacks (weapon or Unarmed Strike); Advantage on Strength checks and saving throws; you can\'t cast spells or maintain Concentration. Lasts until the end of your next turn and ends early if you don Heavy armor or are Incapacitated. Extend it another round by attacking an enemy, forcing an enemy to make a saving throw, or taking a Bonus Action. Up to 10 minutes.')),
    f('unarmoredDefense', b('Defesa sem Armadura', 'Unarmored Defense'), b(
      "Enquanto não estiver usando nenhuma armadura, sua Classe de Armadura básica é igual a 10 mais seus modificadores de Destreza e de Constituição. Você pode usar um Escudo e ainda obter esse benefício.",
      "While you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Constitution modifiers. You can use a Shield and still gain this benefit.")),
    f('weaponMastery', b('Maestria em Armas', 'Weapon Mastery'), b(
      "Seu treinamento com armas permite que você use as propriedades de maestria de dois tipos de armas Simples ou Marciais Corpo a Corpo à sua escolha, como Machados Grandes e Machadinhas. Sempre que terminar um Descanso Longo, você pode praticar exercícios com armas e trocar uma dessas escolhas de arma.\n\nAo atingir determinados níveis de Bárbaro, você adquire a habilidade de usar as propriedades de maestria de mais tipos de armas, conforme mostrado na coluna Maestria em Armas da tabela Características de Bárbaro.",
      "Your training with weapons allows you to use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice, such as Greataxes and Handaxes. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices.\n\nWhen you reach certain Barbarian levels, you gain the ability to use the mastery properties of more kinds of weapons, as shown in the Weapon Mastery column of the Barbarian Features table.")),
  ],
  2: [
    f('dangerSense', b('Sentido de Perigo', 'Danger Sense'), b(
      "Você adquire um sentido aguçado de quando as coisas não estão como deveriam, dando a você uma vantagem ao se esquivar de perigos. Você tem Vantagem em salvaguardas de Destreza, a menos que tenha a condição Incapacitado.",
      "You gain an uncanny sense of when things aren't as they should be, giving you an edge when you dodge perils. You have Advantage on Dexterity saving throws unless you have the Incapacitated condition.")),
    f('recklessAttack', b('Ataque Imprudente', 'Reckless Attack'), b(
      "Você pode deixar de lado qualquer preocupação com defesa para atacar com ferocidade ampliada. Ao fazer sua primeira jogada de ataque no seu turno, você pode decidir atacar imprudentemente. Fazer isso concede Vantagem em jogadas de ataque usando Força até o início do seu próximo turno, mas jogadas de ataque contra você têm Vantagem durante esse período.",
      "You can throw aside all concern for defense to attack with increased ferocity. When you make your first attack roll on your turn, you can decide to attack recklessly. Doing so gives you Advantage on attack rolls using Strength until the start of your next turn, but attack rolls against you have Advantage during that time.")),
  ],
  3: [
    f('barbarianSubclass', b('Subclasse de Bárbaro', 'Barbarian Subclass'), b(
      "Você ganha uma subclasse de Bárbaro à sua escolha. A subclasse Caminho do Furioso é detalhada após a descrição desta classe. Uma subclasse é uma especialização que concede características em determinados níveis de Bárbaro. Pelo restante da sua carreira, você ganha cada uma das características da sua subclasse que sejam de seu nível de Bárbaro ou inferior.",
      "You gain a Barbarian subclass of your choice. The Path of the Berserker subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Barbarian levels. For the rest of your career, you gain each of your subclass's features that are of your Barbarian level or lower.")),
    f('primalKnowledge', b('Conhecimento Primal', 'Primal Knowledge'), b(
      "Você ganha proficiência em outra perícia à sua escolha da lista de perícias disponível para Bárbaros no nível 1.\n\nAlém disso, enquanto sua Fúria estiver ativa, você pode canalizar poder primal ao tentar certas tarefas; sempre que fizer um teste de atributo usando uma das seguintes perícias, você pode fazê-lo como um teste de Força, mesmo que ele normalmente use um atributo diferente: Acrobacia, Intimidação, Percepção, Furtividade ou Sobrevivência. Ao usar esta habilidade, sua Força representa o poder primal correndo por você, aprimorando sua agilidade, compostura e sentidos.",
      "You gain proficiency in another skill of your choice from the skill list available to Barbarians at level 1.\n\nIn addition, while your Rage is active, you can channel primal power when you attempt certain tasks; whenever you make an ability check using one of the following skills, you can make it as a Strength check even if it normally uses a different ability: Acrobatics, Intimidation, Perception, Stealth, or Survival. When you use this ability, your Strength represents primal power coursing through you, honing your agility, bearing, and senses.")),
  ],
  4: [
    f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
      "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Bárbaro 8, 12 e 16.",
      "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16.")),
  ],
  5: [
    f('extraAttack', b('Ataque Extra', 'Extra Attack'), b(
      "Você pode atacar duas vezes em vez de uma sempre que realizar a ação Atacar no seu turno.",
      "You can attack twice instead of once whenever you take the Attack action on your turn.")),
    f('fastMovement', b('Movimento Rápido', 'Fast Movement'), b(
      "Seu deslocamento aumenta em 3 m enquanto não estiver usando armadura pesada.",
      'Your Speed increases by 10 feet while you aren\'t wearing Heavy armor.')),
  ],
  7: [
    f('feralInstinct', b('Instinto Selvagem', 'Feral Instinct'), b(
      "Seus instintos são tão aguçados que você tem Vantagem em jogadas de Iniciativa.",
      "Your instincts are so honed that you have Advantage on Initiative rolls.")),
    f('instinctivePounce', b('Bote Instintivo', 'Instinctive Pounce'), b(
      'Como parte da Ação Bônus para entrar em Fúria, você pode se mover até metade do seu deslocamento.',
      'As part of the Bonus Action you take to enter your Rage, you can move up to half your Speed.')),
  ],
  8: [
    f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
      "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Bárbaro 8, 12 e 16.",
      "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16.")),
  ],
  9: [
    f('brutalStrike', b('Golpe Brutal', 'Brutal Strike'), b(
      "Se usar o Ataque Imprudente, você pode abrir mão de qualquer Vantagem em uma jogada de ataque baseada em Força à sua escolha no seu turno. A jogada de ataque escolhida não pode ter Desvantagem. Se a jogada de ataque escolhida acertar, o alvo sofre 1d10 de dano extra do mesmo tipo causado pela arma ou Golpe Desarmado, e você pode causar um efeito de Golpe Brutal à sua escolha. Você tem as seguintes opções de efeitos.\n\nGolpe Poderoso. O alvo é empurrado 4,5 metros em linha reta para longe de você. Você pode então se mover até metade do seu Deslocamento em linha reta em direção ao alvo sem provocar Ataques de Oportunidade.\n\nGolpe Desestabilizador. O Deslocamento do alvo é reduzido em 4,5 metros até o início do seu próximo turno. Um alvo só pode ser afetado por um Golpe Desestabilizador por vez — o mais recente.",
      "If you use Reckless Attack, you can forgo any Advantage on one Strength-based attack roll of your choice on your turn. The chosen attack roll mustn't have Disadvantage. If the chosen attack roll hits, the target takes an extra 1d10 damage of the same type dealt by the weapon or Unarmed Strike, and you can cause one Brutal Strike effect of your choice. You have the following effect options.\n\nForceful Blow. The target is pushed 15 feet straight away from you. You can then move up to half your Speed straight toward the target without provoking Opportunity Attacks.\n\nHamstring Blow. The target's Speed is reduced by 15 feet until the start of your next turn. A target can be affected by only one Hamstring Blow at a time-- the most recent one.")),
  ],
  11: [
    f('relentlessRage', b('Fúria Implacável', 'Relentless Rage'), b(
      'Se cair a 0 PV com a Fúria ativa sem morrer de imediato, faça uma salvaguarda de Constituição CD 10. Se passar, seus PV passam a ser o dobro do seu nível de Bárbaro. A CD aumenta em 5 a cada uso e volta a 10 ao terminar um Descanso Curto ou Longo.',
      'If you drop to 0 HP while raging and don\'t die outright, make a DC 10 Constitution saving throw. On a success, your HP become twice your Barbarian level. The DC rises by 5 per use and resets to 10 after a Short or Long Rest.')),
  ],
  12: [
    f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
      "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Bárbaro 8, 12 e 16.",
      "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16.")),
  ],
  13: [
    f('improvedBrutalStrike13', b('Golpe Brutal Aprimorado', 'Improved Brutal Strike'), b(
      'Novos efeitos de Golpe Brutal: Golpe Cambaleante (o alvo tem desvantagem na próxima salvaguarda e não pode fazer ataques de oportunidade até o início do seu próximo turno) e Golpe Demolidor (antes do início do seu próximo turno, o próximo ataque de outra criatura contra o alvo ganha +5; não acumula).',
      'New Brutal Strike effects: Staggering Blow (the target has Disadvantage on its next saving throw and can\'t make Opportunity Attacks until the start of your next turn) and Sundering Blow (before the start of your next turn, the next attack roll by another creature against the target gains +5; doesn\'t stack).')),
  ],
  15: [
    f('persistentRage', b('Fúria Persistente', 'Persistent Rage'), b(
      'Ao rolar Iniciativa, pode recuperar todos os usos gastos de Fúria; depois disso, só de novo após um Descanso Longo. Além disso, sua Fúria dura 10 minutos sem precisar ser estendida e só termina antes se você ficar Inconsciente (não basta Incapacitado) ou vestir armadura pesada.',
      'When you roll Initiative, you can regain all expended uses of Rage; you can\'t do so again until you finish a Long Rest. Your Rage also lasts 10 minutes without needing to be extended, ending early only if you have the Unconscious condition (not just Incapacitated) or don Heavy armor.')),
  ],
  16: [
    f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
      "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Bárbaro 8, 12 e 16.",
      "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Barbarian levels 8, 12, and 16.")),
  ],
  17: [
    f('improvedBrutalStrike17', b('Golpe Brutal Aprimorado', 'Improved Brutal Strike'), b(
      "Você aprimorou novas maneiras de atacar furiosamente. Os seguintes efeitos agora estão entre suas opções de Golpe Brutal.\n\nGolpe Atordoante. O alvo tem Desvantagem na próxima salvaguarda que realizar e não pode fazer Ataques de Oportunidade até o início do seu próximo turno.\n\nGolpe Dilacerante. Antes do início do seu próximo turno, a próxima jogada de ataque feita por outra criatura contra o alvo ganha um bônus de +5 na jogada. Uma jogada de ataque só pode receber um bônus de Golpe Dilacerante.",
      "You have honed new ways to attack furiously. The following effects are now among your Brutal Strike options.\n\nStaggering Blow. The target has Disadvantage on the next saving throw it makes, and it can't make Opportunity Attacks until the start of your next turn.\n\nSundering Blow. Before the start of your next turn, the next attack roll made by another creature against the target gains a +5 bonus to the roll. An attack roll can gain only one Sundering Blow bonus.")),
  ],
  18: [
    f('indomitableMight', b('Poder Indomável', 'Indomitable Might'), b(
      "Se o total de um teste de Força ou salvaguarda de Força for menor que seu valor de Força, você pode usar esse valor em vez do total.",
      "If your total for a Strength check or Strength saving throw is less than your Strength score, you can use that score in place of the total.")),
  ],
  19: [
    f('epicBoon', b('Dádiva Épica', 'Epic Boon'), b(
      "Você ganha um talento de Dádiva Épica (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Dádiva da Ofensiva Irresistível é recomendada.",
      "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Irresistible Offense is recommended.")),
  ],
  20: [
    f('primalChampion', b('Campeão Primal', 'Primal Champion'), b(
      "Você personifica o poder primal. Seus valores de Força e Constituição aumentam em 4, até um máximo de 25.",
      "You embody primal power. Your Strength and Constitution scores increase by 4, to a maximum of 25.")),
  ],
};

// === Pools ===
const BARBARIAN_SKILLS = ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'];

// Guerreiro Totêmico: um animal por nível (3º, 6º, 14º), independentes e permanentes.
const totemOption = (id, pt, en, source, desc, extra = {}) => ({ id, name: b(pt, en), source, desc, ...extra });
const totemSpirit = [
  totemOption('bear', 'Urso', 'Bear', 'PHB', b(
    "Enquanto estiver em fúria, você tem resistência a todos os tipos de dano, exceto dano psíquico. O espírito do urso torna você resistente o suficiente para aguentar qualquer punição.",
    "While raging, you have resistance to all damage except psychic damage. The spirit of the bear makes you tough enough to stand up to any punishment.")),
  totemOption('eagle', 'Águia', 'Eagle', 'PHB', b(
    "Enquanto você estiver em fúria e não estiver usando nenhuma armadura, outras criaturas têm desvantagem em jogadas de ataque de oportunidade contra você, e você pode usar a Ação de Disparada como uma ação bônus em seu turno. O espírito da águia transforma você em um predador capaz de se esgueirar pelo combate com facilidade.",
    "While you're raging and aren't wearing any armor, other creatures have disadvantage on opportunity attack rolls against you, and you can use the Dash Action as a bonus action on your turn. The spirit of the eagle makes you into a predator who can weave through the fray with ease.")),
  totemOption('wolf', 'Lobo', 'Wolf', 'PHB', b(
    "Enquanto você estiver em fúria, seus amigos têm vantagem em jogadas de ataque corpo a corpo contra qualquer criatura a até 1,5 metro de você que seja hostil a você. O espírito do lobo faz de você um líder de caçadores.",
    "While you're raging, your friends have advantage on melee attack rolls against any creature within 5 feet of you that is hostile to you. The spirit of the wold makes you a leader of hunters.")),
  totemOption('elk', 'Alce', 'Elk', 'SCAG', b(
    "Enquanto você estiver em fúria e não estiver usando armadura pesada, seu deslocamento de caminhada aumenta em 4,5 metros. O espírito do alce torna você extraordinariamente veloz.",
    "While you’re raging and aren’t wearing heavy armor, your walking speed increases by 15 feet. The spirit of the elk makes you extraordinarily swift.")),
  totemOption('tiger', 'Tigre', 'Tiger', 'SCAG', b(
    "Enquanto estiver em fúria, você pode adicionar 3 metros à distância do seu salto em distância e 1 metro à altura do seu salto em altura. O espírito do tigre fortalece seus saltos.",
    "While raging, you can add 10 feet to your long jump distance and 3 feet to your high jump distance. The spirit of the tiger empowers your leaps.")),
];
const totemAspect = [
  totemOption('bear', 'Urso', 'Bear', 'PHB', b(
    "Você ganha o poder de um urso. Sua capacidade de carga (incluindo carga máxima e elevação máxima) é dobrada, e você tem vantagem em testes de Força feitos para empurrar, puxar, erguer ou quebrar objetos.",
    "You gain the might of a bear. Your carrying capacity (including maximum load and maximum lift) is doubled, and you have advantage on Strength checks made to push, pull, lift, or break objects.")),
  totemOption('eagle', 'Águia', 'Eagle', 'PHB', b(
    "Você ganha a visão de uma águia. Você consegue enxergar a até 1,5 quilômetro de distância sem nenhuma dificuldade, sendo capaz de discernir até mesmo detalhes minuciosos como se estivesse olhando para algo a não mais de 30 metros de você. Além disso, a penumbra não impõe desvantagem em seus testes de Sabedoria (Percepção).",
    "You gain the eyesight of an eagle. You can see up to 1 mile away with no difficulty, able to discern even fine details as though looking at something no more than 100 feet away from you. Additionally, dim light doesn't impose disadvantage on your Wisdom (Perception) checks.")),
  totemOption('wolf', 'Lobo', 'Wolf', 'PHB', b(
    "Você ganha a sensibilidade de caça de um lobo. Você pode rastrear outras criaturas enquanto viaja em ritmo rápido, e pode se mover furtivamente enquanto viaja em ritmo normal (consulte o capítulo 8 para as regras sobre ritmo de viagem).",
    "You gain the hunting sensibilities of a wolf. You can track other creatures while traveling at a fast pace, and you can move stealthily while traveling at a normal pace (see chapter 8 for rules on travel pace).")),
  totemOption('elk', 'Alce', 'Elk', 'SCAG', b(
    "Seja montado ou a pé, seu ritmo de viagem é dobrado, assim como o ritmo de viagem de até dez companheiros enquanto eles estiverem a até 18 metros de você e você não estiver incapacitado (consulte o capítulo 8 do Livro do Jogador para obter mais informações sobre ritmo de viagem). O espírito do alce ajuda você a viajar para longe e rapidamente.",
    "Whether mounted or on foot, your travel pace is doubled, as is the travel pace of up to ten companions while they’re within 60 feet of you and you’re not incapacitated (see chapter 8 in the Player’s Handbook for more information about travel pace). The elk spirit helps you roam far and fast.")),
  totemOption('tiger', 'Tigre', 'Tiger', 'SCAG', b(
    "Você ganha proficiência em duas perícias da lista a seguir: Atletismo, Acrobacia, Furtividade e Sobrevivência. O espírito do felino aprimora seus instintos de sobrevivência.",
    "You gain proficiency in two skills from the following list: Athletics, Acrobatics, Stealth, and Survival. The cat spirit hones your survival instincts."),
  { choices: { tigerAspectSkill: 2 } }),
];
const totemAttunement = [
  totemOption('bear', 'Urso', 'Bear', 'PHB', b(
    "Enquanto você estiver em fúria, qualquer criatura a até 1,5 metro de você que seja hostil a você tem desvantagem em jogadas de ataque contra outros alvos que não sejam você ou outro personagem com este recurso. Um inimigo é imune a este efeito se não puder ver ou ouvir você ou se não puder ser amedrontado.",
    "While you’re raging, any creature within 5 feet of you that’s hostile to you has disadvantage on attack rolls against targets other than you or another character with this feature. An enemy is immune to this effect if it can’t see or hear you or if it can’t be frightened.")),
  totemOption('eagle', 'Águia', 'Eagle', 'PHB', b(
    "Enquanto estiver em fúria, você tem um deslocamento de voo igual ao seu deslocamento de caminhada atual. Este benefício funciona apenas em impulsos curtos; você cai se terminar o seu turno no ar e nada mais estiver mantendo você suspenso.",
    "While raging, you have a flying speed equal to your current walking speed. This benefit works only in short bursts; you fall if you end your turn in the air and nothing else is holding you aloft.")),
  totemOption('wolf', 'Lobo', 'Wolf', 'PHB', b(
    'Em Fúria, ao acertar um ataque corpo a corpo numa criatura Grande ou menor, use uma Ação Bônus para derrubá-la (Caído).',
    'While raging, when you hit a Large or smaller creature with a melee attack, you can use a Bonus Action to knock it Prone.')),
  totemOption('elk', 'Alce', 'Elk', 'SCAG', b(
    'Em Fúria, Ação Bônus: atravesse o espaço de uma criatura Grande ou menor; ela faz salvaguarda de Força (CD 8 + PB + FOR) ou cai (Caída) e sofre 1d12 + FOR de concussão.',
    'While raging, Bonus Action: move through a Large or smaller creature\'s space; it makes a Strength save (DC 8 + PB + STR) or is knocked Prone and takes 1d12 + STR bludgeoning damage.')),
  totemOption('tiger', 'Tigre', 'Tiger', 'SCAG', b(
    "Enquanto estiver em fúria, se você se mover pelo menos 6 metros em linha reta em direção a um alvo Grande ou menor imediatamente antes de realizar um ataque corpo a corpo com arma contra ele, você pode usar uma ação bônus para realizar um ataque corpo a corpo com arma adicional contra ele.",
    "While you’re raging, if you move at least 20 feet in a straight line toward a Large or smaller target right before making a melee weapon attack against it, you can use a bonus action to make an additional melee weapon attack against it.")),
];

const pools = {
  weaponMastery: SHARED.weaponMastery,
  primalKnowledge: {
    name: b('Conhecimento Primal (perícia)', 'Primal Knowledge (skill)'),
    kind: 'skill', grantAs: 'skill',
    filter: { from: BARBARIAN_SKILLS },
  },
  // Fichas 2014: recurso opcional do Tasha (TCE), decidido nos níveis 3 e 10.
  tceOptional: {
    name: b('Conhecimento Primal (TCE, opcional)', 'Primal Knowledge (TCE, optional)'),
    options: [
      { id: 'primalKnowledge', name: b('Conhecimento Primal (TCE)', 'Primal Knowledge (TCE)'), source: 'TCE', rules: '2014',
        prereq: { level: 3 },
        desc: b('Opcional: ganha proficiência em 1 perícia da lista do bárbaro (outra no nível 10).', 'Optional: gain proficiency in 1 skill from the barbarian list (another at level 10).'),
        choices: { primalKnowledge: 1 } },
      { id: 'primalKnowledge10', name: b('Conhecimento Primal, 2ª perícia (TCE)', 'Primal Knowledge, 2nd skill (TCE)'), source: 'TCE', rules: '2014',
        prereq: { level: 10, options: ['primalKnowledge'] },
        desc: b('Mais 1 perícia da lista do bárbaro.', 'One more skill from the barbarian list.'),
        choices: { primalKnowledge: 1 } },
      { id: 'baseRules', name: b('Não usar (regra-base)', "Don't use (base rules)"), source: 'SRD', rules: '2014', repeatable: true,
        desc: b('Mantém só a regra-base do PHB neste nível.', 'Keep only the PHB base rule at this level.') },
    ],
  },

  // Coração Selvagem, 6º: escolha persistente, troca após Descanso Longo.
  wildHeartAspect: {
    name: b('Aspecto da Natureza', 'Aspect of the Wilds'),
    freeSwap: true,
    options: [
      { id: 'owl', name: b('Coruja', 'Owl'), source: 'PHB24', desc: b(
        "Aspecto das Terras Ermas (Coruja): Você tem Visão no Escuro com alcance de 18 metros. Se você já tiver Visão no Escuro, o alcance dela aumenta em 18 metros. Sempre que concluir um Descanso Longo, você pode mudar sua escolha do Aspecto das Terras Ermas.",
        "Aspect of the Wilds (Owl): You have Darkvision with a range of 60 feet. If you already have Darkvision, its range increases by 60 feet. Whenever you finish a Long Rest, you can change your Aspect of the Wilds choice.") },
      { id: 'panther', name: b('Pantera', 'Panther'), source: 'PHB24', desc: b(
        "Ataque com Arma Corpo a Corpo: +3 para acertar, alcance 1,5 m, um alvo. Acerto: 1 de dano cortante.",
        "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 1 slashing damage.") },
      { id: 'salmon', name: b('Salmão', 'Salmon'), source: 'PHB24', desc: b(
        "Aspecto das Terras Ermas (Salmão): Você tem um Deslocamento de Natação igual ao seu Deslocamento. Sempre que você concluir um Descanso Longo, você pode mudar sua escolha do Aspecto das Terras Ermas.",
        "Aspect of the Wilds (Salmon): You have a Swim Speed equal to your Speed. Whenever you finish a Long Rest, you can change your Aspect of the Wilds choice.") },
    ],
  },

  // Guerreiro Totêmico.
  totemSpirit: { name: b('Espírito Totêmico', 'Totem Spirit'), options: totemSpirit },
  totemAspect: { name: b('Aspecto da Besta', 'Aspect of the Beast'), options: totemAspect },
  totemAttunement: { name: b('Sintonia Totêmica', 'Totemic Attunement'), options: totemAttunement },
  tigerAspectSkill: {
    name: b('Perícias do Tigre', 'Tiger Skills'),
    kind: 'skill', grantAs: 'skill',
    filter: { from: ['athletics', 'acrobatics', 'stealth', 'survival'] },
  },

  // Arauto da Tempestade: 1 ambiente no 3º, trocável ao ganhar nível de Bárbaro.
  stormEnvironment: {
    name: b('Ambiente da Tempestade', 'Storm Environment'),
    swapOnLevelUp: 1,
    options: [
      { id: 'desert', name: b('Deserto', 'Desert'), source: 'XGE', desc: b(
        'Aura: outras criaturas na aura sofrem dano de fogo (2 no 3º, 3 no 5º, 4 no 10º, 5 no 15º, 6 no 20º). 6º: resistência a fogo, ignora calor extremo e pode incendiar com uma Ação um objeto inflamável tocado. 10º: aliados escolhidos na aura ganham resistência a fogo. 14º: Reação quando alguém na aura te acerta: salvaguarda de Destreza ou sofre fogo igual à metade do seu nível de Bárbaro.',
        'Aura: other creatures in it take fire damage (2 at 3rd, 3 at 5th, 4 at 10th, 5 at 15th, 6 at 20th). 6th: fire resistance, ignore extreme heat, and set a touched flammable object alight as an Action. 10th: chosen allies in the aura gain fire resistance. 14th: Reaction when a creature in the aura hits you: Dexterity save or it takes fire damage equal to half your Barbarian level.') },
      { id: 'sea', name: b('Mar', 'Sea'), source: 'XGE', desc: b(
        "Quando este efeito for ativado, você pode escolher uma outra criatura que possa ver em sua aura. O alvo deve realizar uma salvaguarda de Destreza. O alvo sofre 1d6 de dano elétrico se fracassar na salvaguarda, ou metade desse dano se obtiver sucesso. O dano aumenta quando você alcança certos níveis nesta classe, aumentando para 2d6 no 10º nível, 3d6 no 15º nível e 4d6 no 20º nível.",
        "When this effect is activated, you can choose one other creature you can see in your aura. The target must make a Dexterity saving throw. The target takes 1d6 lightning damage on a failed save, or half as much damage on a successful one. The damage increases when you reach certain levels in this class, increasing to 2d6 at 10th level, 3d6 at 15th level, and 4d6 at 20th level.") },
      { id: 'tundra', name: b('Tundra', 'Tundra'), source: 'XGE', desc: b(
        'Aura: criaturas escolhidas na aura ganham PV temporários (2 no 3º, 3 no 5º, 4 no 10º, 5 no 15º, 6 no 20º). 6º: resistência a frio, ignora frio extremo e pode, com uma Ação, congelar um cubo de 1,5 m de água por 1 minuto. 10º: aliados escolhidos na aura ganham resistência a frio. 14º: ao ativar a aura, uma criatura nela faz salvaguarda de Força ou fica com deslocamento 0 até o início do seu próximo turno.',
        'Aura: chosen creatures in it gain temporary HP (2 at 3rd, 3 at 5th, 4 at 10th, 5 at 15th, 6 at 20th). 6th: cold resistance, ignore extreme cold, and freeze a 5-ft cube of water for 1 minute as an Action. 10th: chosen allies in the aura gain cold resistance. 14th: when the aura activates, one creature in it makes a Strength save or its Speed is 0 until the start of your next turn.') },
    ],
  },

  // Fanático (XGE, só fichas 2014): tipo de dano da Fúria Divina, fixo. Em 2024 escolhe-se a cada acerto.
  divineFuryType: {
    name: b('Tipo da Fúria Divina', 'Divine Fury Type'),
    options: [
      { id: 'necrotic', name: b('Necrótico', 'Necrotic'), source: 'XGE', rules: '2014', desc: b(
        'O dano extra da Fúria Divina é necrótico.', 'Divine Fury\'s extra damage is necrotic.') },
      { id: 'radiant', name: b('Radiante', 'Radiant'), source: 'XGE', rules: '2014', desc: b(
        'O dano extra da Fúria Divina é radiante.', 'Divine Fury\'s extra damage is radiant.') },
    ],
  },

  // Caminho do Gigante, 3º.
  giantCantrip: {
    name: b('Truque do Poder Gigante', 'Giant Power Cantrip'),
    options: [
      { id: 'druidcraft', name: b('Arte Druídica', 'Druidcraft'), source: 'BGG',
        desc: b("Sussurrando para os espíritos da natureza, você cria um dos seguintes efeitos dentro do alcance:\n\n• Você cria um efeito sensorial minúsculo e inofensivo que prevê como estará o clima em sua localização nas próximas 24 horas. O efeito pode se manifestar como uma orbe dourada para céu limpo, uma nuvem para chuva, flocos de neve caindo para neve, e assim por diante. Esse efeito persiste por 1 rodada.\n\n• Você faz instantaneamente uma flor desabrochar, uma vagem de sementes se abrir ou um broto foliar florescer.\n\n• Você cria um efeito sensorial instantâneo e inofensivo, como folhas caindo, uma lufada de vento, o som de um pequeno animal ou o odor suave de um gambá. O efeito deve caber em um cubo de 1,5 metro.\n\n• Você acende ou apaga instantaneamente uma vela, uma tocha ou uma pequena fogueira.", "Whispering to the spirits of nature, you create one of the following effects within range:\n\n• You create a tiny, harmless sensory effect that predicts what the weather will be at your location for the next 24 hours. The effect might manifest as a golden orb for clear skies, a cloud for rain, falling snowflakes for snow, and so on. This effect persists for 1 round.\n\n• You instantly make a flower blossom, a seed pod open, or a leaf bud bloom.\n\n• You create an instantaneous, harmless sensory effect, such as falling leaves, a puff of wind, the sound of a small animal, or the faint odor of skunk. The effect must fit in a 5-foot cube.\n\n• You instantly light or snuff out a candle, a torch, or a small campfire."),
        grants: { cantrips: ['druidcraft'] } },
      { id: 'thaumaturgy', name: b('Taumaturgia', 'Thaumaturgy'), source: 'BGG',
        desc: b("Você manifesta uma pequena maravilha, um sinal de poder sobrenatural, dentro do alcance. Você cria um dos seguintes efeitos mágicos dentro do alcance:\n\n• Sua voz ressoa até três vezes mais alto que o normal por 1 minuto.\n\n• Você faz chamas tremeluzirem, brilharem com mais intensidade, enfraquecerem ou mudarem de cor por 1 minuto.\n\n• Você causa tremores inofensivos no solo por 1 minuto.\n\n• Você cria um som instantâneo que se origina de um ponto à sua escolha dentro do alcance, como um estrondo de trovão, o grasnado de um corvo ou sussurros sinistros.\n\n• Você faz instantaneamente com que uma porta ou janela destrancada se escancare ou se feche com violência.\n\n• Você altera a aparência de seus olhos por 1 minuto. Se conjurar esta magia várias vezes, você pode ter até três de seus efeitos de 1 minuto ativos simultaneamente, e pode dissipar tal efeito com uma ação.", "You manifest a minor wonder, a sign of supernatural power, within range. You create one of the following magical effects within range:\n\n• Your voice booms up to three times as loud as normal for 1 minute.\n\n• You cause flames to flicker, brighten, dim, or change color for 1 minute.\n\n• You cause harmless tremors in the ground for 1 minute.\n\n• You create an instantaneous sound that originates from a point of your choice within range, such as a rumble of thunder, the cry of a raven, or ominous whispers.\n\n• You instantaneously cause an unlocked door or window to fly open or slam shut.\n\n• You alter the appearance of your eyes for 1 minute. If you cast this spell multiple times, you can have up to three of its 1-minute effects active at a time, and you can dismiss such an effect as an action."),
        grants: { cantrips: ['thaumaturgy'] } },
    ],
  },
  giantLanguage: {
    name: b('Idioma do Poder Gigante (Gigante, ou outro se já souber)', 'Giant Power Language (Giant, or another if you know it)'),
    kind: 'language', grantAs: 'language',
  },
};

// === Subclasses ===
const RITUAL_NOTE = b(' Só como ritual; Sabedoria é o atributo de conjuração.', ' Ritual only; Wisdom is your spellcasting ability.');
const withNote = (d) => b(d.pt + RITUAL_NOTE.pt, d.en + RITUAL_NOTE.en);

const subclasses = {
  berserker: {
    name: b('Caminho do Berserker', 'Path of the Berserker'),
    source: 'SRD',
    desc: b('Canaliza a Fúria em violência desenfreada.', 'Channels Rage into violent fury.'),
    levels: {
      3: { features: [f('frenzy', b('Frenesi', 'Frenzy'), b(
        'Se usar Ataque Imprudente com a Fúria ativa, o primeiro alvo que você acertar no turno com um ataque de Força sofre dano extra: role um número de d6 igual ao seu bônus de Dano de Fúria (mesmo tipo da arma ou do ataque desarmado).',
        'If you use Reckless Attack while raging, the first target you hit on your turn with a Strength-based attack takes extra damage: roll a number of d6s equal to your Rage Damage bonus (same type as the weapon or Unarmed Strike).'))] },
      6: { features: [f('mindlessRage', b('Fúria Irracional', 'Mindless Rage'), b(
        "Você tem Imunidade às condições Enfeitiçado e Amedrontado enquanto sua Fúria estiver ativa. Se estiver Enfeitiçado ou Amedrontado quando entrar em Fúria, a condição se encerra em você.",
        "You have Immunity to the Charmed and Frightened conditions while your Rage is active. If you're Charmed or Frightened when you enter your Rage, the condition ends on you."))] },
      10: { features: [f('retaliation', b('Retaliação', 'Retaliation'), b(
        "Quando sofrer dano de uma criatura que esteja a até 1,5 metro de você, você pode usar uma Reação para fazer um ataque corpo a corpo contra aquela criatura, usando uma arma ou um Golpe Desarmado.",
        "When you take damage from a creature that is within 5 feet of you, you can take a Reaction to make one melee attack against that creature, using a weapon or an Unarmed Strike."))] },
      14: { features: [f('intimidatingPresence', b('Presença Intimidadora', 'Intimidating Presence'), b(
        "Como uma Ação Bônus, você pode incutir terror nos outros com sua presença ameaçadora e poder primal.\n\nQuando fizer isso, cada criatura de sua escolha em uma Emanação de 9 metros originada de você deve fazer uma salvaguarda de Sabedoria (CD 8 mais seu modificador de Força e Bônus de Proficiência). Se falhar na salvaguarda, a criatura fica sob a condição Amedrontado por 1 minuto. No final de cada um dos turnos da criatura Amedrontada, ela repete a salvaguarda, encerrando o efeito sobre si mesma em caso de sucesso.\n\nUma vez que usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo, a menos que gaste um uso de sua Fúria (nenhuma ação necessária) para restaurar seu uso.",
        "As a Bonus Action, you can strike terror into others with your menacing presence and primal power.\n\nWhen you do so, each creature of your choice in a 30-foot Emanation originating from you must make a Wisdom saving throw (DC 8 plus your Strength modifier and Proficiency Bonus). On a failed save, a creature has the Frightened condition for 1 minute. At the end of each of the Frightened creature's turns, the creature repeats the save, ending the effect on itself on a success.\n\nOnce you use this feature, you can't use it again until you finish a Long Rest unless you expend a use of your Rage (no action required) to restore your use of it."))] },
    },
  },

  wildHeart: {
    name: b('Caminho do Coração Selvagem', 'Path of the Wild Heart'),
    source: 'PHB24',
    desc: b('Parentesco com os animais guia a sua Fúria (reedição do Guerreiro Totêmico).', 'Kinship with beasts shapes your Rage (successor to the Totem Warrior).'),
    levels: {
      3: {
        features: [
          f('animalSpeaker', b('Voz dos Animais', 'Animal Speaker'), b("Você pode conjurar as magias Sentido Bestial e Falar com Animais, mas apenas como Rituais. Sabedoria é a sua habilidade de conjuração para elas.", "You can cast the Beast Sense and Speak with Animals spells but only as Rituals. Wisdom is your spellcasting ability for them.")),
          f('rageOfTheWilds', b('Fúria da Natureza', 'Rage of the Wilds'), b(
            "Sua Fúria canaliza o poder primal dos animais. Sempre que ativar sua Fúria, você ganha uma das seguintes opções à sua escolha.\n\nUrso. Enquanto sua Fúria estiver ativa, você tem Resistência a todos os tipos de dano, exceto Força, Necrótico, Psíquico e Radiante.\n\nÁguia. Quando você ativa sua Fúria, pode realizar as ações Desengajar e Disparada como parte dessa Ação Bônus. Enquanto sua Fúria estiver ativa, você pode realizar uma Ação Bônus para realizar ambas as ações.\n\nLobo. Enquanto sua Fúria estiver ativa, seus aliados têm Vantagem nas jogadas de ataque contra qualquer inimigo seu a até 1,5 metro de você.",
            "Your Rage taps into the primal power of animals. Whenever you activate your Rage, you gain one of the following options of your choice.\n\nBear. While your Rage is active, you have Resistance to every damage type except Force, Necrotic, Psychic, and Radiant.\n\nEagle. When you activate your Rage, you can take the Disengage and Dash actions as part of that Bonus Action. While your Rage is active, you can take a Bonus Action to take both of those actions.\n\nWolf. While your Rage is active, your allies have Advantage on attack rolls against any enemy of yours within 5 feet of you.")),
        ],
        autoSpells: ['beastSense', 'speakWithAnimals'],
      },
      6: { features: [f('aspectOfTheWilds', b('Aspecto da Natureza', 'Aspect of the Wilds'), b(
        "Você ganha uma das seguintes opções à sua escolha. Sempre que terminar um Descanso Longo, você pode mudar sua escolha.\n\nCoruja. Você tem Visão no Escuro com alcance de 18 metros. Se você já possuir Visão no Escuro, o alcance dela aumenta em 18 metros.\n\nPantera. Você tem um Deslocamento de Escalada igual ao seu Deslocamento.\n\nSalmão. Você tem um Deslocamento de Natação igual ao seu Deslocamento.",
        "You gain one of the following options of your choice. Whenever you finish a Long Rest, you can change your choice.\n\nOwl. You have Darkvision with a range of 60 feet. If you already have Darkvision, its range increases by 60 feet.\n\nPanther. You have a Climb Speed equal to your Speed.\n\nSalmon. You have a Swim Speed equal to your Speed."))] },
      10: {
        features: [f('natureSpeaker', b('Voz da Natureza', 'Nature Speaker'), b("Você pode conjurar a magia Comunhão com a Natureza, mas apenas como um Ritual. Sabedoria é a sua habilidade de conjuração para ela.", "You can cast the Commune with Nature spell but only as a Ritual. Wisdom is your spellcasting ability for it."))],
        autoSpells: ['communeWithNature'],
      },
      14: { features: [f('powerOfTheWilds', b('Poder da Natureza', 'Power of the Wilds'), b(
        'Ao entrar em Fúria, escolha também um destes (vale até a Fúria terminar). Falcão: sem armadura, deslocamento de voo igual ao seu deslocamento. Leão: inimigos a até 1,5 m têm desvantagem em ataques contra alvos que não sejam você ou outro Bárbaro com esta opção. Carneiro: ao acertar uma criatura Grande ou menor com ataque corpo a corpo, pode deixá-la Caída.',
        'When you enter Rage, also choose one of these (lasts until the Rage ends). Falcon: while wearing no armor, Fly Speed equal to your Speed. Lion: enemies within 5 ft have Disadvantage on attacks against targets other than you or another Barbarian with this option. Ram: when you hit a Large or smaller creature with a melee attack, you can knock it Prone.'))] },
    },
  },

  worldTree: {
    name: b('Caminho da Árvore do Mundo', 'Path of the World Tree'),
    source: 'PHB24',
    desc: b('Liga-se a Yggdrasil para dar vida aos aliados e cruzar distâncias.', 'Connects to Yggdrasil to bolster allies and cross distances.'),
    levels: {
      3: { features: [f('vitalityOfTheTree', b('Vitalidade da Árvore', 'Vitality of the Tree'), b(
        "Sua Fúria se conecta à força vital da Árvore do Mundo. Você ganha os seguintes benefícios.\n\nSurto de Vitalidade. Quando você ativa sua Fúria, ganha uma quantidade de Pontos de Vida Temporários igual ao seu nível de Bárbaro.\n\nForça Doadora de Vida. No início de cada um dos seus turnos enquanto sua Fúria estiver ativa, você pode escolher outra criatura a até 3 metros de você para ganhar Pontos de Vida Temporários. Para determinar a quantidade de Pontos de Vida Temporários, role uma quantidade de d6s igual ao seu bônus de Dano de Fúria e some-os. Se algum desses Pontos de Vida Temporários restar quando sua Fúria terminar, ele desaparece.",
        "Your Rage taps into the life force of the World Tree. You gain the following benefits.\n\nVitality Surge. When you activate you r Rage, you gain a number of Temporary Hit Points equal to your Barbarian level.\n\nLife-Giving Force. At the start of each of your turns while your Rage is active, you can choose another creature within 10 feet of yourself to gain\nTemporary Hit Points. To determine the number of Temporary Hit Points, roll a number of d6s equal to your Rage Damage bonus, and add them together. If any of these Temporary Hit Points remain when your Rage ends, they vanish."))] },
      6: { features: [f('branchesOfTheTree', b('Galhos da Árvore', 'Branches of the Tree'), b(
        "Sempre que uma criatura que você possa ver começar o turno dela a até 9 metros de você enquanto sua Fúria estiver ativa, você pode usar uma Reação para invocar galhos espectrais da Árvore do Mundo ao redor dela. O alvo deve ter suc-\n\nbônus de Dano de Fúria e some-os. Se algum desses Pontos de Vida Temporários restar quando sua Fúria terminar, ele desaparece.",
        "Whenever a creature you can see starts its turn within 30 feet of you while your Rage is active, you can take a Reaction to summon spectral branches of the World Tree around it. The target must suc-\n\nRage Damage bonus, and add them together. If any of these Temporary Hit Points remain when your Rage ends, they vanish."))] },
      10: { features: [f('batteringRoots', b('Raízes Aríetes', 'Battering Roots'), b(
        "Durante o seu turno, seu alcance é 3 metros maior com qualquer arma Corpo a Corpo que possua a propriedade Pesada ou Versátil, conforme tentáculos da Árvore do Mundo se estendem de você. Quando você atinge com tal arma no seu turno, você pode ativar a propriedade de maestria Empurrão ou Derrubar além de uma propriedade de maestria diferente que esteja usando com aquela arma.",
        "During your turn, your reach is 10 feet greater with any Melee weapon that has the Heavy or Versatile property, as tendrils of the World Tree extend from you. When you hit with such a weapon on your turn, you can activate the Push or Topple mastery property in addition to a different mastery property you're using with that weapon."))] },
      14: { features: [f('travelAlongTheTree', b('Viagem pela Árvore', 'Travel Along the Tree'), b(
        "Quando você ativa sua Fúria e como uma Ação Bônus enquanto sua Fúria estiver ativa, você pode se teletransportar até 18 m para um espaço desocupado que possa ver.\n\nAlém disso, uma vez por Fúria, você pode aumentar o alcance desse teletransporte para 45 m. Quando fizer isso, também pode levar até seis criaturas voluntárias que estejam a até 3 m de você. Cada criatura se teletransporta para um espaço desocupado à sua escolha a até 3 m do seu espaço de destino.",
        "When you activate your Rage and as a Bonus Action while your Rage is active, you can teleport up to 60 feet to an unoccupied space you can see.\n\nIn addition, once per Rage, you can increase the range of that teleport to 150 feet. When you do so, you can also bring up to six willing creatures who are within 10 feet of you. Each creature teleports to an unoccupied space of your choice within 10 feet of your destination space."))] },
    },
  },

  zealot: {
    name: b('Caminho do Fanático', 'Path of the Zealot'),
    source: 'PHB24',
    desc: b('Fúria abastecida por um deus, que cura e protege seus fiéis.', 'Rage fueled by a god that heals and shields the faithful.'),
    levels: {
      3: { features: [
        f('divineFury', b('Fúria Divina', 'Divine Fury'), b(
          "Você pode canalizar poder divino em seus golpes. Em cada um dos seus turnos enquanto sua Fúria estiver ativa, a primeira criatura que você atingir com uma arma ou um Golpe Desarmado sofre dano adicional igual a 1d6 mais a metade do seu nível de Bárbaro (arredondado para baixo). O dano adicional é Necrótico ou Radiante; você escolhe o tipo cada vez que causar o dano.",
          "You can channel divine power into your strikes. On each of your turns while your Rage is active, the first creature you hit with a weapon or an Unarmed Strike takes extra damage equal to 1d6 plus half your Barbarian level (round down). The extra damage is Necrotic or Radiant; you choose the type each time you deal the damage.")),
        f('warriorOfTheGods', b('Guerreiro dos Deuses', 'Warrior of the Gods'), b(
          "Uma entidade divina ajuda a garantir que você continue na luta. Você possui uma reserva de quatro d12s que pode gastar para se curar. Como uma Ação Bônus, você pode gastar dados da reserva, rolá-los e recuperar um número de Pontos de Vida igual ao total da rolagem.\n\nSua reserva recupera todos os dados gastos ao terminar um Descanso Longo.\n\nO número máximo de dados da reserva aumenta em um quando você alcança os níveis 6 (5 dados), 12 (6 dados) e 17 (7 dados) de Bárbaro.",
          "A divine entity helps ensure you can continue the fight. You have a pool of four dl2s that you can spend to heal yourself. As a Bonus Action, you can expend dice from the pool, roll them, and regain a number of Hit Points equal to the roll's total.\n\nYour pool regains all expended dice when you finish a Long Rest.\n\nThe pool's maximum number of dice increases by one when you reach Barbarian levels 6 (5 dice), 12 (6 dice), and 17 (7 dice).")),
      ] },
      6: { features: [f('fanaticalFocus', b('Foco Fanático', 'Fanatical Focus'), b(
        "Uma vez por Fúria ativa, se você falhar em uma salvaguarda, pode rolá-la novamente com um bônus igual ao seu bônus de Dano de Fúria, e deve usar a nova rolagem.",
        "Once per active Rage, if you fail a saving throw, you can reroll it with a bonus equal to your Rage Damage bonus, and you must use the new roll."))] },
      10: { features: [f('zealousPresence', b('Presença Zelosa', 'Zealous Presence'), b(
        "Como uma Ação Bônus, você solta um brado de batalha imbuído de energia divina. Até dez outras criaturas de sua escolha a até 18 metros de você ganham Vantagem\n\nResistência. Você tem Resistência a dano Necrótico, Psíquico e Radiante.\nRevivificação. Quando uma criatura a até 9 metros de você cair a 0 Pontos de Vida, você pode usar uma Reação para gastar um uso de sua Fúria para, em vez disso, mudar os Pontos de Vida do alvo para um número igual ao seu nível de Bárbaro.\n\nNÍVEL 6: FOCO FANÁTICO\n\nUma vez por Fúria ativa, se você falhar em uma salvaguarda, pode rolá-la novamente com um bônus igual ao seu bônus de Dano de Fúria, e deve usar a nova rolagem.",
        "As a Bonus Action, you unleash a battle cry infused with divine energy. Up to ten other creatures of your choice within 60 feet of you gain Advantage\n\nResistance. You have Resistance to Necrotic, Psychic, and Radiant damage.\nRevivification. When a creature within 30 feet of you would drop to 0 Hit Points, you can take a Reaction to expend a use of your Rage to instead change the target's Hit Points to a number equal to your Barbarian level.\n\nEVEL 6: FANATICAL Focus\n\nOnce per active Rage, if you fail a saving throw, you can reroll it with a bonus equal to your Rage Damage bonus, and you must use the new roll."))] },
      14: { features: [f('rageOfTheGods', b('Fúria dos Deuses', 'Rage of the Gods'), b(
        "Quando você ativa sua Fúria, pode assumir a forma de um guerreiro divino. Essa forma dura 1 minuto ou até você cair a 0 Pontos de Vida. Depois de usar esta característica, você não pode usá-la novamente até terminar um Descanso Longo.\n\nEnquanto estiver nessa forma, você recebe os benefícios abaixo.\n\nVoo. Você tem um Deslocamento de Voo igual ao seu Deslocamento e pode pairar.\n\nResistência. Você tem Resistência a dano Necrótico, Psíquico e Radiante.\n\nRevivificação. Quando uma criatura a até 9 m de você cair a 0 Pontos de Vida, você pode usar uma Reação para gastar um uso de sua Fúria e, em vez disso, alterar os Pontos de Vida do alvo para um número igual ao seu nível de Bárbaro.",
        "When you activate your Rage, you can assume the form of a divine warrior. This form lasts for 1 minute or until you drop to 0 Hit Points. Once you use this feature, you can't do so again until you finish a Long Rest.\n\nWhile in this form, you gain the benefits below.\n\nFlight. You have a Fly Speed equal to your Speed and can hover.\n\nResistance. You have Resistance to Necrotic, Psychic, and Radiant damage.\n\nRevivification. When a creature within 30 feet of you would drop to 0 Hit Points, you can take a Reaction to expend a use of your Rage to instead change the target's Hit Points to a number equal to your Barbarian level."))] },
    },
  },

  totem: {
    name: b('Caminho do Guerreiro Totêmico', 'Path of the Totem Warrior'),
    source: 'PHB',
    desc: b('Espíritos animais guiam o bárbaro; um animal por nível (Alce e Tigre vêm do SCAG).', 'Animal spirits guide the barbarian; one animal per tier (Elk and Tiger from SCAG).'),
    levels: {
      3: {
        features: [
          f('spiritSeeker', b('Buscador Espiritual', 'Spirit Seeker'), b("O seu é um caminho que busca sintonia com o mundo natural, proporcionando-lhe uma afinidade com as feras. No 3º nível, quando adotar este caminho, você adquire a habilidade de conjurar as magias sentido bestial e falar com animais, mas apenas como rituais.", "Yours is a path that seeks attunement with the natural world, giving you a kinship with beasts. At 3rd level when you adopt this path, you gain the ability to cast the beast sense and speak with animals spells, but only as rituals.")),
          f('totemSpirit', b('Espírito Totêmico', 'Totem Spirit'), b(
            "No 3º nível, quando adotar este caminho, você escolhe um espírito totêmico e adquire sua característica. Você deve criar ou adquirir um objeto totêmico físico — um amuleto ou adorno semelhante — que incorpore pelo ou penas, garras, dentes ou ossos do animal totêmico. À sua escolha, você também adquire atributos físicos menores que lembram o seu espírito totêmico. Por exemplo, se você tiver um espírito totêmico de urso, pode ser incomumente peludo e ter a pele grossa, ou se o seu totem for a águia, seus olhos adquirem uma cor amarela brilhante.\n\nSeu animal totêmico pode ser um animal relacionado aos listados aqui, mas mais apropriado à sua terra natal. Por exemplo, você pode escolher um falcão ou abutre no lugar de uma águia.",
            "At 3rd level, when you adopt this path, you choose a totem spirit and gain its feature. You must make or acquire a physical totem object- an amulet or similar adornment—that incorporates fur or feathers, claws, teeth, or bones of the totem animal. At your option, you also gain minor physical attributes that are reminiscent of your totem spirit. For example, if you have a bear totem spirit, you might be unusually hairy and thickskinned, or if your totem is the eagle, your eyes turn bright yellow.\n\nYour totem animal might be an animal related to those listed here but more appropriate to your homeland. For example, you could choose a hawk or vulture in place of an eagle.")),
        ],
        autoSpells: ['beastSense', 'speakWithAnimals'],
      },
      6: { features: [f('aspectOfTheBeast', b('Aspecto da Besta', 'Aspect of the Beast'), b(
        "Seja montado ou a pé, seu ritmo de viagem é dobrado, assim como o ritmo de viagem de até dez companheiros enquanto eles estiverem a até 18 metros de você e você não estiver incapacitado (consulte o capítulo 8 do Livro do Jogador para obter mais informações sobre ritmo de viagem). O espírito do alce ajuda você a viajar para longe e rapidamente.",
        "Whether mounted or on foot, your travel pace is doubled, as is the travel pace of up to ten companions while they’re within 60 feet of you and you’re not incapacitated (see chapter 8 in the Player’s Handbook for more information about travel pace). The elk spirit helps you roam far and fast."))] },
      10: {
        features: [f('spiritWalker', b('Andarilho Espiritual', 'Spirit Walker'), b("No 10º nível, você pode conjurar a magia comunhão com a natureza, mas apenas como um ritual. Ao fazer isso, uma versão espiritual de um dos animais que você escolheu para Espírito Totêmico ou Aspecto da Fera aparece para você para transmitir as informações que você busca.", "At 10th level, you can cast the commune with nature spell, but only as a ritual. When you do so, a spiritual version of one of the animals you chose for Totem Spirit or Aspect of the Beast appears to you to convey the information you seek."))],
        autoSpells: ['communeWithNature'],
      },
      14: { features: [f('totemicAttunement', b('Sintonia Totêmica', 'Totemic Attunement'), b(
        "Enquanto estiver em fúria, você pode usar uma ação bônus durante o seu movimento para atravessar o espaço de uma criatura Grande ou menor. Essa criatura deve ser bem-sucedida em uma salvaguarda de Força (CD 8 + seu bônus de Força + seu bônus de proficiência) ou ficará caída e sofrerá dano contundente igual a 1d12 + seu modificador de Força.",
        "While raging, you can use a bonus action during your move to pass through the space of a Large or smaller creature. That creature must succeed on a Strength saving throw (DC 8 + your Strength bonus + your proficiency bonus) or be knocked prone and take bludgeoning damage equal to 1d12 + your Strength modifier."))] },
    },
  },

  battlerager: {
    name: b('Caminho do Furioso de Batalha', 'Path of the Battlerager'),
    source: 'SCAG',
    desc: b('Guerreiros anões que lutam de armadura de espinhos (exige anão, salvo liberação do mestre).', 'Dwarven warriors who fight in spiked armor (requires a dwarf unless the DM allows otherwise).'),
    levels: {
      3: { features: [f('battleragerArmor', b('Armadura do Furioso', 'Battlerager Armor'), b(
        'Proficiência com armadura de espinhos (média, CA 14 + Des máx. 2, desvantagem em Furtividade). Vestindo-a e em Fúria: Ação Bônus para um ataque com os espinhos (1d4 perfurante + For) contra uma criatura a 1,5 m; ao agarrar com sucesso, o alvo sofre 3 de dano perfurante.',
        'Proficiency with spiked armor (medium, AC 14 + Dex max 2, Stealth disadvantage). Wearing it while raging: Bonus Action spike attack (1d4 piercing + Str) against a creature within 5 ft; a successful grapple deals 3 piercing damage.'))] },
      6: { features: [f('recklessAbandon', b('Abandono Imprudente', 'Reckless Abandon'), b(
        "A partir do 6º nível, quando você usa Ataque Descuidado enquanto está em fúria, você também ganha pontos de vida temporários iguais ao seu modificador de Constituição (mínimo de 1). Eles desaparecem se restar algum quando sua fúria terminar.",
        "Beginning at 6th level, when you use Reckless Attack while raging, you also gain temporary hit points equal to your Constitution modifier (minimum of 1). They vanish if any of them are left when your rage ends."))] },
      10: { features: [f('battleragerCharge', b('Investida do Furioso', 'Battlerager Charge'), b(
        "A partir do 10º nível, você pode realizar a ação Disparada como uma ação bônus enquanto estiver em fúria.",
        "Beginning at 10th level, you can take the Dash action as a bonus action while you are raging."))] },
      14: { features: [f('spikedRetribution', b('Retribuição Espinhosa', 'Spiked Retribution'), b(
        "A partir do 14º nível, quando uma criatura a até 1,5 metro de você o atingir com um ataque corpo a corpo, o atacante sofre 3 de dano perfurante se você estiver em fúria, não estiver incapacitado e estiver vestindo armadura com espinhos.",
        "Starting at 14th level, when a creature within 5 feet of you hits you with a melee attack, the attacker takes 3 piercing damage if you are raging, aren't incapacitated, and are wearing spiked armor."))] },
    },
  },

  ancestralguardian: {
    name: b('Caminho do Guardião Ancestral', 'Path of the Ancestral Guardian'),
    source: 'XGE',
    desc: b('Espíritos ancestrais protegem os aliados do bárbaro.', 'Ancestral spirits shield the barbarian\'s allies.'),
    levels: {
      3: { features: [f('ancestralProtectors', b('Protetores Ancestrais', 'Ancestral Protectors'), b(
        "A partir de quando você escolhe este caminho no 3º nível, guerreiros espectrais aparecem quando você entra em fúria. Enquanto estiver em fúria, a primeira criatura que você atingir com um ataque em seu turno torna-se o alvo dos guerreiros, que atrapalham os ataques dela. Até o início do seu próximo turno, aquele alvo tem desvantagem em qualquer jogada de ataque que não seja contra você e, quando o alvo atinge uma criatura que não seja você com um ataque, essa criatura tem resistência ao dano causado pelo ataque. O efeito no alvo termina mais cedo se a sua fúria terminar.",
        "Starting when you choose this path at 3rd level, spectral warriors appear when you enter your rage. While you’re raging, the first creature you hit with an attack on your turn becomes the target of the warriors, which hinder its attacks. Until the start of your next turn, that target has disadvantage on any attack roll that isn’t against you, and when the target hits a creature other than you with an attack, that creature has resistance to the damage dealt by the attack. The effect on the target ends early if your rage ends."))] },
      6: { features: [f('spiritShield', b('Escudo Espiritual', 'Spirit Shield'), b(
        "A partir do 6º nível, os espíritos guardiões que o auxiliam podem fornecer proteção sobrenatural àqueles que você defende. Se você estiver em fúria e outra criatura que possa ver a até 9 metros de você sofrer dano, você pode usar sua reação para reduzir esse dano em 2d6. Quando alcançar certos níveis nesta classe, poderá reduzir mais dano: em 3d6 no 10º nível e em 4d6 no 14º nível.",
        "Beginning at 6th level, the guardian spirits that aid you can provide supernatural protection to those you defend. If you are raging and another creature you can see within 30 feet of you takes damage, you can use your reaction to reduce that damage by 2d6. When you reach certain levels in this class. you can reduce the damage by more: by 3d6 at 10th level and by 4d6 at 14th level."))] },
      10: {
        features: [f('consultTheSpirits', b('Consultar os Espíritos', 'Consult the Spirits'), b(
          "No 10º nível, você ganha a habilidade de consultar seus espíritos ancestrais. Ao fazer isso, você conjura a magia augúrio ou clarividência, sem usar um espaço de magia ou componentes materiais. Em vez de criar um sensor esférico, esse uso de clarividência invoca invisivelmente um de seus espíritos ancestrais para o local escolhido. Sabedoria é a sua habilidade de conjuração para essas magias. Depois de conjurar qualquer uma das magias dessa forma, você não pode usar esta característica novamente até terminar um descanso curto ou longo.",
          "At 10th level, you gain the ability to consult with your ancestral spirits. When you do so, you cast the augury or clairvoyance spell, without using a spell slot or material components. Rather than creating a spherical sensor, this use of clairvoyance invisibly summons one of your ancestral spirits to the chosen location. Wisdom is your spellcasting ability for these spells. After you cast either spell in this way, you can’t use this feature again until you finish a short or long rest."))],
        autoSpells: ['augury', 'clairvoyance'],
      },
      14: { features: [f('vengefulAncestors', b('Ancestrais Vingativos', 'Vengeful Ancestors'), b(
        "No 14º nível, seus espíritos ancestrais tornam-se poderosos o suficiente para retaliar. Quando você usa seu Escudo Espiritual para reduzir o dano de um ataque, o atacante sofre uma quantidade de dano de força igual ao dano que seu Escudo Espiritual previne.",
        "At 14th level, your ancestral spirits grow powerful enough to retaliate. When you use your Spirit Shield to reduce the damage of an attack, the attacker takes an amount of force damage equal to the damage that your Spirit Shield prevents."))] },
    },
  },

  stormherald: {
    name: b('Caminho do Arauto da Tempestade', 'Path of the Storm Herald'),
    source: 'XGE',
    desc: b('A Fúria se torna uma tempestade ao redor do bárbaro; o ambiente escolhido define os efeitos.', 'Rage becomes a storm around the barbarian; the chosen environment sets its effects.'),
    levels: {
      3: { features: [f('stormAura', b('Aura da Tempestade', 'Storm Aura'), b(
        "A partir do 3º nível, você emana uma aura tempestuosa e mágica enquanto estiver em fúria. A aura se estende por 3 metros a partir de você em todas as direções, mas não através de cobertura total.\n\nSua aura tem um efeito que se ativa quando você entra em fúria, e você pode ativar o efeito novamente em cada um dos seus turnos como uma ação bônus. Escolha deserto, mar ou tundra. O efeito da sua aura depende do ambiente escolhido, conforme detalhado abaixo. Você pode mudar sua escolha de ambiente sempre que ganhar um nível nesta classe.\n\nSe os efeitos da sua aura exigirem uma salvaguarda, a CD é igual a 8 + seu bônus de proficiência + seu modificador de Constituição.\ns ação. Escolha deserto, mar ou tundra. O efeito da sua aura depende do ambiente escolhido, conforme detalhado abaixo. Você pode mudar sua escolha de ambiente sempre que ganhar um nível nesta classe.\n\nSe os efeitos da sua aura exigirem uma salvaguarda, a CD é igual a 8 + seu bônus de proficiência + seu modificador de Constituição.\n\nDeserto. Quando este efeito for ativado, todas as outras criaturas em sua aura sofrem 2 de dano de fogo cada. O dano aumenta quando você alcança certos níveis nesta classe, aumentando para 3 no 5º nível, 4 no 10º nível, 5 no 15º nível e 6 no 20º nível.\n\nMar. Quando este efeito for ativado, você pode escolher uma outra criatura que possa ver em sua aura. O alvo deve fazer uma salvaguarda de Destreza. O alvo sofre 1d6 de dano elétrico se falhar na salvaguarda, ou metade desse dano se tiver sucesso. O dano aumenta quando você alcança certos níveis nesta classe, aumentando para 2d6 no 10º nível, 3d6 no 15º nível e 4d6 no 20º nível.\n\nTundra. Quando este efeito for ativado, cada criatura de sua escolha em sua aura ganha 2 pontos de vida temporários, conforme espíritos gélidos a acostumam ao sofrimento. Os pontos de vida temporários aumentam quando você alcança certos níveis nesta classe, aumentando para 3 no 5º nível, 4 no 10º nível, 5 no 15º nível e 6 no 20º nível.",
        "Starting at 3rd level, you emanate a stormy, magical aura while you rage. The aura extends 10 feet from you in every direction, but not through total cover.\n\nYour aura has an effect that activates when you enter your rage, and you can activate the effect again on each of your turns as a bonus action. Choose desert, sea, or tundra. Your aura’s effect depends on that chosen environment, as detailed below. You can change your environment choice whenever you gain a level in this class.\n\nIf your aura's effects require a saving throw, the DC equals 8 + your proficiency bonus + your Constitution modifier.\n\nDesert. When this effect is activated, all other creatures in your aura take 2 fire damage each. The damage increases when you reach certain levels in this class, increasing to 3 at 5th level, 4 at 10th level, 5 at 15th level, and 6 at 20th level.\n\nSea. When this effect is activated, you can choose one other creature you can see in your aura. The target must make a Dexterity saving throw. The target takes 1d6 lightning damage on a failed save, or half as much damage on a successful one. The damage increases when you reach certain levels in this class, increasing to 2d6 at 10th level, 3d6 at 15th level, and 4d6 at 20th level.\n\nTundra. When this effect is activated, each creature of your choice in your aura gains 2 temporary hit points, as icy spirits inure it to suffering. The temporary hit points increase when you reach certain levels in this class, increasing to 3 at 5th level, 4 at 10th level, 5 at 15th level, and 6 at 20th level."))] },
      6: { features: [f('stormSoul', b('Alma da Tempestade', 'Storm Soul'), b(
        "No 6º nível, a tempestade concede a você benefícios mesmo quando sua aura não estiver ativa. Os benefícios são baseados no ambiente que você escolheu para sua Aura de Tempestade.\n\nDeserto. Você ganha resistência a dano de fogo e não sofre os efeitos de calor extremo, conforme descrito no Guia do Mestre. Além disso, como uma ação, você pode tocar um objeto inflamável que não esteja sendo vestido ou carregado por ninguém e incendiá-lo.\n\nMar. Você ganha resistência a dano elétrico e pode respirar sob a água. Você também ganha um deslocamento de natação de 9 metros.\n\nTundra. Você ganha resistência a dano de frio e não sofre os efeitos de frio extremo, conforme descrito no Guia do Mestre. Além disso, como uma ação, você pode tocar na água e transformar um cubo de 1,5 metro dela em gelo, que derrete após 1 minuto. Esta ação falha se houver uma criatura dentro do cubo.",
        "At 6th level, the storm grants you benefits even when your aura isn’t active. The benefits are based on the environment you chose for your Storm Aura.\n\nDesert. You gain resistance to fire damage, and you don’t suffer the effects of extreme heat, as described in the Dungeon Master’s Guide. Moreover, as an action, you can touch a flammable object that isn’t being worn or carried by anyone else and set it on fire.\n\nSea. You gain resistance to lightning damage, and you can breathe underwater. You also gain a swimming speed of 30 feet.\n\nTundra. You gain resistance to cold damage, and you don’t suffer the effects of extreme cold, as described in the Dungeon Master’s Guide. Moreover, as an action, you can touch water and turn a 5-foot cube Of it into ice, which melts after 1 minute. This action fails if a creature is in the cube."))] },
      10: { features: [f('shieldingStorm', b('Tempestade Protetora', 'Shielding Storm'), b(
        "No 10º nível, você aprende a usar seu domínio sobre a tempestade para proteger outros. Cada criatura à sua escolha tem a resistência a dano que você obteve da característica Alma da Tempestade enquanto a criatura estiver na sua Aura de Tempestade.",
        "At 10th level, you learn to use your mastery of the storm to protect others. Each creature of your choice has the damage resistance you gained from the Storm Soul feature while the creature is in your Storm Aura."))] },
      14: { features: [f('ragingStorm', b('Tempestade Furiosa', 'Raging Storm'), b(
        "No 14º nível, o poder da tempestade que você canaliza se torna ainda mais poderoso, açoitando seus inimigos. O efeito é baseado no ambiente que você escolheu para a sua Aura de Tempestade.\n\nDeserto. Imediatamente após uma criatura na sua aura acertar você com um ataque, você pode usar sua reação para forçar aquela criatura a fazer uma salvaguarda de Destreza. Se falhar na salvaguarda, a criatura sofre dano de fogo igual à metade do seu nível de bárbaro.\n\nMar. Quando você acertar uma criatura na sua aura com um ataque, você pode usar sua reação para forçar aquela criatura a fazer uma salvaguarda de Força. Se falhar na salvaguarda, a criatura é derrubada e fica caída, como se tivesse sido atingida por uma onda.\n\nTundra. Sempre que o efeito da sua Aura de Tempestade for ativado, você pode escolher uma criatura que possa ver na aura. Essa criatura deve ser bem-sucedida em uma salvaguarda de Força, ou seu deslocamento é reduzido a 0 até o início do seu próximo turno, enquanto uma geada mágica a cobre.",
        "At 14th level, the power of the storm you channel grows mightier, lashing out at your foes. The effect is based on the environment you chose for your Storm Aura.\n\nDesert. Immediately after a creature in your aura hits you with an attack, you can use your reaction to force that creature to make a Dexterity saving throw. On a failed save, the creature takes fire damage equal to half your barbarian level.\n\nSea. When you hit a creature in your aura with an attack, you can use your reaction to force that creature to make a Strength saving throw. On a failed save, the creature is knocked prone, as if struck by a wave.\n\nTundra. Whenever the effect of your Storm Aura is activated, you can choose one creature you can see in the aura. That creature must succeed on a Strength saving throw, or its speed is reduced to 0 until the start of your next turn, as magical frost covers it."))] },
    },
  },

  beast: {
    name: b('Caminho da Besta', 'Path of the Beast'),
    source: 'TCE',
    desc: b('A Fúria desperta uma forma bestial com armas naturais.', 'Rage unleashes a bestial form with natural weapons.'),
    levels: {
      3: { features: [f('formOfTheBeast', b('Forma da Besta', 'Form of the Beast'), b(
        'Ao entrar em Fúria, escolha uma arma natural (conta como arma simples corpo a corpo, usa Força): Mordida (1d8 perfurante; 1×/turno, se estiver abaixo da metade dos PV, cura PB ao acertar), Garras (1d6 cortante em cada mão; ao atacar com uma na ação de Ataque, faz um ataque extra de garra) ou Cauda (1d8 perfurante, alcance 3 m; Reação para somar 1d8 à CA contra um ataque).',
        'When you enter Rage, choose a natural weapon (a simple melee weapon using Strength): Bite (1d8 piercing; once per turn, if below half HP, heal PB on a hit), Claws (1d6 slashing each; attacking with one in the Attack action grants one extra claw attack), or Tail (1d8 piercing, 10-ft reach; Reaction to add 1d8 to AC against an attack).'))] },
      6: { features: [f('bestialSoul', b('Alma Bestial', 'Bestial Soul'), b(
        'Suas armas naturais contam como mágicas. Ao terminar um Descanso Curto ou Longo, escolha: natação igual ao deslocamento e respirar na água; escalada igual ao deslocamento (inclusive em tetos); ou, 1×/turno, estender o salto com um teste de Atletismo.',
        'Your natural weapons count as magical. After a Short or Long Rest, choose: Swim Speed equal to your Speed and water breathing; Climb Speed equal to your Speed (even on ceilings); or once per turn extend a jump with an Athletics check.'))] },
      10: { features: [f('infectiousFury', b('Fúria Infecciosa', 'Infectious Fury'), b(
        'Ao acertar com uma arma natural em Fúria, o alvo faz salvaguarda de Sabedoria (CD 8 + PB + mod. de Constituição) ou, à sua escolha, usa a Reação para atacar outra criatura que você indicar, ou sofre 2d12 psíquico. PB usos por Descanso Longo.',
        'When you hit with a natural weapon while raging, the target makes a Wisdom save (DC 8 + PB + Constitution mod) or, your choice, uses its Reaction to attack another creature you designate, or takes 2d12 psychic damage. PB uses per Long Rest.'))] },
      14: { features: [f('callTheHunt', b('Chamado da Caçada', 'Call the Hunt'), b(
        "Característica de 14º nível do Caminho da Besta\n\nA besta dentro de você se torna tão poderosa que você pode espalhar sua ferocidade para outros e obter resiliência ao se juntarem à sua caçada. Quando entra em sua fúria, você pode escolher um número de outras criaturas voluntárias que possa ver a até 9 metros de você igual ao seu modificador de Constituição (mínimo de uma criatura).\n\nVocê ganha 5 pontos de vida temporários para cada criatura que aceitar esta característica. Até a fúria terminar, as criaturas escolhidas podem usar o seguinte benefício uma vez em cada um de seus turnos: quando a criatura atingir um alvo com uma jogada de ataque e causar dano a ele, ela pode rolar um d6 e ganhar um bônus no dano igual ao número rolado.\n\nVocê pode usar esta característica um número de vezes igual ao seu bônus de proficiência e recupera todos os usos gastos ao terminar um descanso longo.",
        "14th-level Path of the Beast feature\n\nThe beast within you grows so powerful that you can spread its ferocity to others and gain resilience from them joining your hunt. When you enter your rage, you can choose a number of other willing creatures you can see within 30 feet of you equal to your Constitution modifier (minimum of one creature).\n\nYou gain 5 temporary hit points for each creature that accepts this feature. Until the rage ends, the chosen creatures can use the following benefit once on each of their turns: when the creature hits a target with an attack roll and deals damage to it, the creature can roll a d6 and gain a bonus to the damage equal to the number rolled.\n\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."))] },
    },
  },

  wildmagic: {
    name: b('Caminho da Magia Selvagem', 'Path of Wild Magic'),
    source: 'TCE',
    desc: b('A Fúria libera surtos de magia imprevisível.', 'Rage unleashes surges of unpredictable magic.'),
    levels: {
      3: { features: [
        f('magicAwareness', b('Percepção Mágica', 'Magic Awareness'), b(
          "Característica de 3º nível do Caminho da Magia Selvagem\n\nComo uma ação, você pode abrir sua percepção para a presença de magia concentrada. Até o final do seu próximo turno, você sabe a localização de qualquer magia ou item mágico a até 18 metros de você que não esteja atrás de cobertura total. Quando você pressente uma magia, você descobre a qual escola de magia ela pertence.\n\nVocê pode usar esta característica um número de vezes igual ao seu bônus de proficiência, e você recupera todos os usos gastos quando termina um descanso longo.",
          "3rd-level Path of Wild Magic feature\n\nAs an action, you can open your awareness to the presence of concentrated magic. Until the end of your next turn, you know the location of any spell or magic item within 60 feet of you that isn’t behind total cover. When you sense a spell, you learn which school of magic it belongs to.\n\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.")),
        f('wildSurge', b('Surto Selvagem', 'Wild Surge'), b(
          'Ao entrar em Fúria, role 1d8 na tabela de Magia Selvagem: 1 tentáculos necróticos; 2 teleporte de 9 m; 3 espírito explosivo; 4 arma infundida de energia; 5 retribuição de energia; 6 luzes protetoras (+1 CA); 7 flores e vinhas (terreno difícil); 8 raio de luz que cega. CD = 8 + PB + mod. de Constituição.',
          'When you enter Rage, roll 1d8 on the Wild Magic table: 1 necrotic shadow tendrils; 2 30-ft teleport; 3 exploding spirit; 4 force-infused weapon; 5 force retribution; 6 protective lights (+1 AC); 7 flowers and vines (difficult terrain); 8 blinding bolt of light. DC = 8 + PB + Constitution mod.')),
      ] },
      6: { features: [f('bolsteringMagic', b('Magia Fortalecedora', 'Bolstering Magic'), b(
        "Característica de 6º nível do Caminho da Magia Selvagem\n\nVocê pode canalizar sua magia selvagem para fortalecer a si mesmo ou a um companheiro. Como uma ação, você pode tocar uma criatura (que pode ser você mesmo) e conceder um dos seguintes benefícios à sua escolha para aquela criatura:\n\n• Por 10 minutos, a criatura pode rolar um d3 sempre que fizer uma jogada de ataque ou um teste de atributo e adicionar o número rolado à jogada do d20.\n\n• Role um d3. A criatura recupera um espaço de magia gasto, cujo círculo seja igual ou inferior ao número rolado (à escolha da criatura). Uma vez que uma criatura receba este benefício, ela não pode recebê-lo novamente até após um descanso longo.\n\nVocê pode realizar esta ação um número de vezes igual ao seu bônus de proficiência, e você recupera todos os usos gastos quando termina um descanso longo.",
        "6th-level Path of Wild Magic feature\n\nYou can harness your wild magic to bolster yourself or a companion. As an action, you can touch one creature (which can be yourself) and confer one of the following benefits of your choice to that creature:\n\n• For 10 minutes, the creature can roll a d3 whenever making an attack roll or an ability check and add the number rolled to the d20 roll.\n\n• Roll a d3. The creature regains one expended spell slot, the level of which equals the number rolled or lower (the creature’s choice). Once a creature receives this benefit, that creature can’t receive it again until after a long rest.\n\nYou can take this action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."))] },
      10: { features: [f('unstableBacklash', b('Reação Instável', 'Unstable Backlash'), b(
        "Característica de 10º nível do Caminho da Magia Selvagem\n\nQuando você estiver em perigo durante a sua fúria, a magia dentro de você pode se libertar abruptamente; imediatamente após sofrer dano ou falhar em uma salvaguarda enquanto estiver em fúria, você pode usar sua reação para rolar na tabela de Magia Selvagem e produzir imediatamente o efeito rolado. Esse efeito substitui o seu efeito atual de Magia Selvagem.",
        "10th-level Path of Wild Magic feature\n\nWhen you are imperiled during your rage, the magic within you can lash out; immediately after you take damage or fail a saving throw while raging, you can use your reaction to roll on the Wild Magic table and immediately produce the effect rolled. This effect replaces your current Wild Magic effect."))] },
      14: { features: [f('controlledSurge', b('Surto Controlado', 'Controlled Surge'), b(
        "Característica de 14º nível do Caminho da Magia Selvagem\n\nSempre que rolar na tabela de Magia Selvagem, você pode rolar o dado duas vezes e escolher qual dos dois efeitos deseja liberar. Se rolar o mesmo número em ambos os dados, você pode ignorar o número e escolher qualquer efeito na tabela.",
        "14th-level Path of Wild Magic feature\n\nWhenever you roll on the Wild Magic table, you can roll the die twice and choose which of the two effects to unleash. If you roll the same number on both dice, you can ignore the number and choose any effect on the table."))] },
    },
  },

  giant: {
    name: b('Caminho do Gigante', 'Path of the Giant'),
    source: 'BGG',
    desc: b('A Fúria desperta a força e o tamanho dos gigantes.', 'Rage awakens the might and size of giants.'),
    levels: {
      3: { features: [
        f('giantPower', b('Poder Gigante', 'Giant Power'), b(
          "Característica de 3º nível do Caminho do Gigante\n\nQuando você escolhe este caminho, você aprende a falar, ler e escrever Gigante ou outro idioma à sua escolha se já souber Gigante. Além disso, você aprende um truque à sua escolha: ou artifício druídico ou taumaturgia. Sabedoria é a sua habilidade de conjuração para esta magia.",
          "3rd-level Path of the Giant feature\n\nWhen you choose this path, you learn to speak, read, and write Giant or one other language of your choice if you already know Giant. Additionally, you learn a cantrip of your choice: either druidcraft or thaumaturgy. Wisdom is your spellcasting ability for this spell.")),
        f('giantsHavoc', b('Devastação Gigante', 'Giant\'s Havoc'), b(
          "Característica de 3º nível do Caminho do Gigante\n\nSuas fúrias extraem força do poder primordial dos gigantes, transformando você em uma força de destruição descomunal. Enquanto estiver em fúria, você ganha os seguintes benefícios:\n\nArremesso Esmagador. Quando você obtiver sucesso em um ataque à distância com uma arma de arremesso usando Força, você pode adicionar o seu bônus de Dano de Fúria à jogada de dano do ataque.\n\nEstatura de Gigante. Seu alcance aumenta em 1,5 metro e, se você for menor que Grande, você se torna Grande, juntamente com tudo o que estiver vestindo ou carregando. Se não houver espaço suficiente para você aumentar de tamanho, seu tamanho não muda.",
          "3rd-level Path of the Giant feature\n\nYour rages pull strength from the primal might of giants, transforming you into a hulking force of destruction. While raging, you gain the following benefits:\n\nCrushing Throw. When you make a successful ranged attack with a thrown weapon using Strength, you can add your Rage Damage bonus to the attack's damage roll.\n\nGiant Stature. Your reach increases by 5 feet, and if you are smaller than Large, you become Large, along with anything you are wearing. If there isn't enough room for you to increase your size, your size doesn't change.")),
      ] },
      6: { features: [f('elementalCleaver', b('Cutelo Elemental', 'Elemental Cleaver'), b(
        "Característica de 6º nível do Caminho do Gigante\n\nSeu vínculo com o poder elemental dos gigantes cresce, e você aprende a imbuir armas com energia primordial.\n\nQuando você entra em sua fúria, você pode escolher uma arma que esteja segurando e imbui-la com um dos seguintes tipos de dano: ácido, frio, fogo, trovejante ou elétrico. Enquanto você empunhar a arma imbuída durante a sua fúria, o tipo de dano da arma muda para o tipo escolhido, ela causa 1d6 de dano adicional do tipo escolhido quando atinge, e ela ganha a propriedade de arremesso, com alcance normal de 6 metros e alcance longo de 18 metros. Se você arremessar a arma, ela reaparece na sua mão no instante após acertar ou errar um alvo. Os benefícios da arma imbuída são suprimidos enquanto uma criatura diferente de você a empunhar.\n\nEnquanto estiver em fúria e segurando a arma imbuída, você pode usar uma ação bônus para mudar o tipo de dano atual da arma imbuída para outro entre as opções de tipos de dano acima.",
        "6th-level Path of the Giant feature\n\nYour bond with the elemental might of giants grows, and you learn to infuse weapons with primordial energy.\n\nWhen you enter your rage, you can choose one weapon that you are holding and infuse it with one of the following damage types: acid, cold, fire, thunder, or lightning. While you wield the infused weapon during your rage, the weapon's damage type changes to the chosen type, it deals an extra 1d6 damage of the chosen type when it hits, and it gains the thrown property, with a normal range of 20 feet and a long range of 60 feet. If you throw the weapon, it reappears in your hand the instant after it hits or misses a target. The infused weapon's benefits are suppressed while a creature other than you wields it.\n\nWhile raging and holding the infused weapon, you can use a bonus action to change the infused weapon's current damage type to another one from the damage type options above."))] },
      10: { features: [f('mightyImpel', b('Impulso Poderoso', 'Mighty Impel'), b(
        "Característica de 10º nível do Caminho do Gigante\n\nSua conexão com a força dos gigantes permite que você arremesse aliados e inimigos no campo de batalha. Como uma ação bônus enquanto estiver em fúria, você pode escolher uma criatura Média ou menor dentro do seu alcance e movê-la para um espaço desocupado que você possa ver a até 9 metros de você. Uma criatura relutante deve ser bem-sucedida em uma salvaguarda de Força (CD igual a 8 + seu bônus de proficiência + seu modificador de Força) para evitar o efeito.\n\nSe, ao final desse movimento, a criatura arremessada não estiver em uma superfície ou líquido capaz de sustentá-la, ela cai, sofrendo dano normalmente e caindo no chão.",
        "10th-level Path of the Giant feature\n\nYour connection to giant strength allows you to hurl both allies and enemies on the battlefield. As a bonus action while raging, you can choose one Medium or smaller creature within your reach and move it to an unoccupied space you can see within 30 feet of yourself. An unwilling creature must succeed on a Strength saving throw (DC equals 8 + your proficiency bonus + your Strength modifier) to avoid the effect.\n\nIf, at the end of this movement, the thrown creature isn't on a surface or liquid that can support it, the creature falls, taking damage as normal and landing prone."))] },
      14: { features: [f('demiurgicColossus', b('Colosso Demiúrgico', 'Demiurgic Colossus'), b(
        "Característica de 14º nível do Caminho do Gigante\n\nO poder primordial da sua fúria se intensifica. Quando você entra em fúria, seu alcance aumenta em 3 metros, seu tamanho pode aumentar para Grande ou Enorme (à sua escolha) e você pode usar o seu Impulso Poderoso para mover criaturas que sejam Grandes ou menores.\n\nAlém disso, o dano adicional causado pela sua característica Cutelo Elemental aumenta para 2d6.",
        "14th-level Path of the Giant feature\n\nThe primordial power of your rage intensifies. When you rage, your reach increases by 10 feet, your size can increase to Large or Huge (your choice), and you can use your Mighty Impel to move creatures that are Large or smaller.\n\nIn addition, the extra damage dealt by your Elemental Cleaver feature increases to 2d6."))] },
    },
  },
};

// === Recursos com usos (contadores por descanso) ===
const RAGES = { 1: 2, 3: 3, 6: 4, 12: 5, 17: 6 };
const resources = [
  { id: 'rage', name: b('Fúria', 'Rage'), rules: '2024',
    desc: b('Descanso Curto recupera 1; Longo, todas. Dano de Fúria +2/+3 (9º)/+4 (16º).', 'Short Rest regains 1; Long Rest, all. Rage Damage +2/+3 (9th)/+4 (16th).'),
    uses: { byLevel: RAGES }, recharge: 'long', shortRestRegain: 1 },
  { id: 'rage2014', name: b('Fúria', 'Rage'), rules: '2014',
    desc: b('Só volta no Descanso Longo. Ilimitada no 20º nível. Dano de Fúria +2/+3 (9º)/+4 (16º).', 'Regained only on a Long Rest. Unlimited at 20th level. Rage Damage +2/+3 (9th)/+4 (16th).'),
    uses: { byLevel: RAGES }, recharge: 'long' },
  { id: 'persistentRage', name: b('Fúria Persistente (recuperar Fúrias)', 'Persistent Rage (regain Rages)'), rules: '2024',
    desc: b('Ao rolar Iniciativa, recupera todas as Fúrias.', 'When you roll Initiative, regain all Rages.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 15 },
  { id: 'intimidatingPresence', name: b('Presença Intimidadora', 'Intimidating Presence'), rules: '2024', subclass: ['berserker'],
    desc: b('Pode recuperar gastando 1 Fúria.', 'Can be restored by expending a Rage.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 14 },
  { id: 'warriorOfTheGods', name: b('Guerreiro dos Deuses (dados de cura)', 'Warrior of the Gods (healing dice)'), rules: '2024', subclass: ['zealot'],
    uses: { byLevel: { 3: 4, 6: 5, 12: 6, 17: 7 } }, recharge: 'long', die: { byLevel: { 3: 'd12' } } },
  { id: 'zealousPresence', name: b('Presença Zelosa', 'Zealous Presence'), subclass: ['zealot'],
    desc: b('Em 2024, pode recuperar gastando 1 Fúria.', 'In 2024, can be restored by expending a Rage.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 10 },
  { id: 'rageOfTheGods', name: b('Fúria dos Deuses', 'Rage of the Gods'), rules: '2024', subclass: ['zealot'],
    uses: { fixed: 1 }, recharge: 'long', minLevel: 14 },
  { id: 'consultTheSpirits', name: b('Consultar os Espíritos', 'Consult the Spirits'), subclass: ['ancestralguardian'],
    uses: { fixed: 1 }, recharge: 'short', minLevel: 10 },
  { id: 'infectiousFury', name: b('Fúria Infecciosa', 'Infectious Fury'), subclass: ['beast'],
    uses: { profBonus: true }, recharge: 'long', minLevel: 10 },
  { id: 'callTheHunt', name: b('Chamado da Caçada', 'Call the Hunt'), subclass: ['beast'],
    uses: { profBonus: true }, recharge: 'long', minLevel: 14 },
  { id: 'magicAwareness', name: b('Percepção Mágica', 'Magic Awareness'), subclass: ['wildmagic'],
    uses: { profBonus: true }, recharge: 'long', minLevel: 3 },
  { id: 'bolsteringMagic', name: b('Magia Fortalecedora', 'Bolstering Magic'), subclass: ['wildmagic'],
    uses: { profBonus: true }, recharge: 'long', minLevel: 6 },
];

export default {
  classId: 'barbarian',
  pools,
  // Maestria: 2 no 1º, 3 no 4º, 4 no 10º. Conhecimento Primal: +1 perícia no 3º.
  choices: {
    1: { weaponMastery: 2 },
    3: { primalKnowledge: 1 },
    4: { weaponMastery: 1 },
    10: { weaponMastery: 1 },
  },
  // 2014: Conhecimento Primal (TCE) é opcional — nos níveis 3 e 10 decide-se usar ou não.
  legacyChoices: {
    3: { tceOptional: 1 },
    10: { tceOptional: 1 },
  },
  subclassChoices: {
    wildHeart: { 6: { wildHeartAspect: 1 } },
    totem: { 3: { totemSpirit: 1 }, 6: { totemAspect: 1 }, 14: { totemAttunement: 1 } },
    stormherald: { 3: { stormEnvironment: 1 } },
    giant: { 3: { giantCantrip: 1, giantLanguage: 1 } },
  },
  // Fichas 2014: as mesmas escolhas de suplemento + o tipo de dano do Fanático (XGE).
  legacySubclassChoices: {
    totem: { 3: { totemSpirit: 1 }, 6: { totemAspect: 1 }, 14: { totemAttunement: 1 } },
    stormherald: { 3: { stormEnvironment: 1 } },
    giant: { 3: { giantCantrip: 1, giantLanguage: 1 } },
    zealot: { 3: { divineFuryType: 1 } },
  },
  features,
  subclasses,
  resources,
};
