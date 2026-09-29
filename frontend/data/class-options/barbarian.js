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
      'Sem armadura, sua CA base é 10 + modificador de Destreza + modificador de Constituição. Pode usar Escudo e manter o benefício.',
      'While wearing no armor, your base AC equals 10 + your Dexterity and Constitution modifiers. You can use a Shield and keep this benefit.')),
    f('weaponMastery', b('Maestria em Armas', 'Weapon Mastery'), b(
      'Use a propriedade de maestria de 2 tipos de armas corpo a corpo simples ou marciais à sua escolha (3 no 4º nível, 4 no 10º). Ao terminar um Descanso Longo, pode trocar uma dessas escolhas.',
      'Use the mastery property of 2 kinds of Simple or Martial Melee weapons of your choice (3 at level 4, 4 at level 10). After a Long Rest, you can change one of those choices.')),
  ],
  2: [
    f('dangerSense', b('Sentido de Perigo', 'Danger Sense'), b(
      'Vantagem em salvaguardas de Destreza, a menos que esteja Incapacitado.',
      'Advantage on Dexterity saving throws unless you have the Incapacitated condition.')),
    f('recklessAttack', b('Ataque Imprudente', 'Reckless Attack'), b(
      'Ao fazer a primeira jogada de ataque do seu turno, pode atacar de forma imprudente: vantagem em jogadas de ataque de Força até o início do seu próximo turno, mas jogadas de ataque contra você também têm vantagem nesse período.',
      'When you make your first attack roll on your turn, you can attack recklessly: Advantage on Strength attack rolls until the start of your next turn, but attack rolls against you have Advantage during that time.')),
  ],
  3: [
    f('barbarianSubclass', b('Subclasse de Bárbaro', 'Barbarian Subclass'), b(
      'Escolha um Caminho Primal. Ele concede traços nos níveis de Bárbaro 3, 6, 10 e 14.',
      'Choose a Primal Path. It grants features at Barbarian levels 3, 6, 10, and 14.')),
    f('primalKnowledge', b('Conhecimento Primal', 'Primal Knowledge'), b(
      'Ganhe proficiência em mais uma perícia da lista de Bárbaro. Além disso, com a Fúria ativa, testes de Acrobacia, Intimidação, Percepção, Furtividade e Sobrevivência podem ser feitos como testes de Força.',
      'Gain proficiency in one more skill from the Barbarian skill list. While your Rage is active, you can make Acrobatics, Intimidation, Perception, Stealth, and Survival checks as Strength checks.')),
  ],
  4: [
    f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
      'Ganhe o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique. Também nos níveis 8, 12 e 16. Neste nível você também passa a ter 3 maestrias em armas.',
      'Gain the Ability Score Improvement feat or another feat you qualify for. Again at levels 8, 12, and 16. At this level you also reach 3 weapon masteries.')),
  ],
  5: [
    f('extraAttack', b('Ataque Extra', 'Extra Attack'), b(
      'Ataque duas vezes, em vez de uma, ao usar a ação de Ataque no seu turno.',
      'Attack twice instead of once whenever you take the Attack action on your turn.')),
    f('fastMovement', b('Movimento Rápido', 'Fast Movement'), b(
      'Seu deslocamento aumenta em 3 m (10 pés) enquanto não estiver usando armadura pesada.',
      'Your Speed increases by 10 feet while you aren\'t wearing Heavy armor.')),
  ],
  7: [
    f('feralInstinct', b('Instinto Selvagem', 'Feral Instinct'), b(
      'Vantagem nas jogadas de Iniciativa.',
      'Advantage on Initiative rolls.')),
    f('instinctivePounce', b('Bote Instintivo', 'Instinctive Pounce'), b(
      'Como parte da Ação Bônus para entrar em Fúria, você pode se mover até metade do seu deslocamento.',
      'As part of the Bonus Action you take to enter your Rage, you can move up to half your Speed.')),
  ],
  8: [
    f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
      'Ganhe o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
      'Gain the Ability Score Improvement feat or another feat you qualify for.')),
  ],
  9: [
    f('brutalStrike', b('Golpe Brutal', 'Brutal Strike'), b(
      'Ao usar Ataque Imprudente, pode abrir mão da vantagem em um ataque de Força seu no turno (que não pode ter desvantagem). Se acertar, o alvo sofre +1d10 de dano do mesmo tipo e você aplica um efeito à escolha: Golpe Contundente (o alvo é empurrado 4,5 m/15 pés para longe; você pode avançar até metade do deslocamento em linha reta até ele sem provocar ataques de oportunidade) ou Golpe no Jarrete (o deslocamento do alvo cai 4,5 m/15 pés até o início do seu próximo turno; não acumula).',
      'When you use Reckless Attack, you can forgo Advantage on one Strength attack roll on your turn (it can\'t have Disadvantage). On a hit, the target takes an extra 1d10 damage of the same type and you apply one effect: Forceful Blow (push the target 15 ft away; you may then move up to half your Speed straight toward it without provoking Opportunity Attacks) or Hamstring Blow (the target\'s Speed drops by 15 ft until the start of your next turn; only the most recent applies).')),
  ],
  11: [
    f('relentlessRage', b('Fúria Implacável', 'Relentless Rage'), b(
      'Se cair a 0 PV com a Fúria ativa sem morrer de imediato, faça uma salvaguarda de Constituição CD 10. Se passar, seus PV passam a ser o dobro do seu nível de Bárbaro. A CD aumenta em 5 a cada uso e volta a 10 ao terminar um Descanso Curto ou Longo.',
      'If you drop to 0 HP while raging and don\'t die outright, make a DC 10 Constitution saving throw. On a success, your HP become twice your Barbarian level. The DC rises by 5 per use and resets to 10 after a Short or Long Rest.')),
  ],
  12: [
    f('abilityScoreImprovement', b('Aumento no Valor de Atributo', 'Ability Score Improvement'), b(
      'Ganhe o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
      'Gain the Ability Score Improvement feat or another feat you qualify for.')),
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
      'Ganhe o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique.',
      'Gain the Ability Score Improvement feat or another feat you qualify for.')),
  ],
  17: [
    f('improvedBrutalStrike17', b('Golpe Brutal Aprimorado', 'Improved Brutal Strike'), b(
      'O dano extra do Golpe Brutal passa a 2d10, e você pode aplicar dois efeitos de Golpe Brutal diferentes a cada uso.',
      'Brutal Strike\'s extra damage becomes 2d10, and you can apply two different Brutal Strike effects each time.')),
  ],
  18: [
    f('indomitableMight', b('Poder Indomável', 'Indomitable Might'), b(
      'Se o total de um teste ou salvaguarda de Força for menor que seu valor de Força, use o valor no lugar do total.',
      'If the total of a Strength check or Strength saving throw is less than your Strength score, you can use the score instead.')),
  ],
  19: [
    f('epicBoon', b('Dádiva Épica', 'Epic Boon'), b(
      'Ganhe um talento de Dádiva Épica ou outro talento para o qual se qualifique. Recomendado: Dádiva da Ofensiva Irresistível.',
      'Gain an Epic Boon feat or another feat you qualify for. Boon of Irresistible Offense is recommended.')),
  ],
  20: [
    f('primalChampion', b('Campeão Primal', 'Primal Champion'), b(
      'Seus valores de Força e Constituição aumentam em 4, até o máximo de 25.',
      'Your Strength and Constitution scores increase by 4, to a maximum of 25.')),
  ],
};

// === Pools ===
const BARBARIAN_SKILLS = ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'];

// Guerreiro Totêmico: um animal por nível (3º, 6º, 14º), independentes e permanentes.
const totemOption = (id, pt, en, source, desc, extra = {}) => ({ id, name: b(pt, en), source, desc, ...extra });
const totemSpirit = [
  totemOption('bear', 'Urso', 'Bear', 'PHB', b(
    'Em Fúria, resistência a todo dano, exceto psíquico.',
    'While raging, Resistance to all damage except psychic.')),
  totemOption('eagle', 'Águia', 'Eagle', 'PHB', b(
    'Em Fúria e sem armadura pesada, ataques de oportunidade contra você têm desvantagem, e você pode usar Disparada como Ação Bônus.',
    'While raging and not in heavy armor, Opportunity Attacks against you have Disadvantage, and you can Dash as a Bonus Action.')),
  totemOption('wolf', 'Lobo', 'Wolf', 'PHB', b(
    'Em Fúria, seus aliados têm vantagem em ataques corpo a corpo contra inimigos a até 1,5 m (5 pés) de você.',
    'While raging, your allies have Advantage on melee attacks against enemies within 5 ft of you.')),
  totemOption('elk', 'Alce', 'Elk', 'SCAG', b(
    'Em Fúria e sem armadura pesada, seu deslocamento aumenta em 4,5 m (15 pés).',
    'While raging and not in heavy armor, your Speed increases by 15 ft.')),
  totemOption('tiger', 'Tigre', 'Tiger', 'SCAG', b(
    'Em Fúria, seu salto em distância aumenta 3 m (10 pés) e o salto em altura, 90 cm (3 pés).',
    'While raging, add 10 ft to your long jump and 3 ft to your high jump.')),
];
const totemAspect = [
  totemOption('bear', 'Urso', 'Bear', 'PHB', b(
    'Capacidade de carga dobrada e vantagem em testes de Força para empurrar, puxar, erguer ou quebrar objetos.',
    'Double carrying capacity and Advantage on Strength checks to push, pull, lift, or break objects.')),
  totemOption('eagle', 'Águia', 'Eagle', 'PHB', b(
    'Enxerga com detalhes até 1,6 km (1 milha) como se estivesse a 30 m; penumbra não impõe desvantagem em Percepção.',
    'See up to 1 mile away in detail as if it were 100 ft away; dim light doesn\'t impose Disadvantage on Perception checks.')),
  totemOption('wolf', 'Lobo', 'Wolf', 'PHB', b(
    'Rastreia criaturas em ritmo rápido e se move furtivamente em ritmo normal durante viagens.',
    'Track creatures at a fast pace and move stealthily at a normal pace while traveling.')),
  totemOption('elk', 'Alce', 'Elk', 'SCAG', b(
    'Seu ritmo de viagem dobra, e o de até 10 companheiros perto de você também.',
    'Your travel pace doubles, as does that of up to 10 companions near you.')),
  totemOption('tiger', 'Tigre', 'Tiger', 'SCAG', b(
    'Proficiência em 2 perícias entre Atletismo, Acrobacia, Furtividade e Sobrevivência.',
    'Proficiency in 2 skills from Athletics, Acrobatics, Stealth, and Survival.'),
  { choices: { tigerAspectSkill: 2 } }),
];
const totemAttunement = [
  totemOption('bear', 'Urso', 'Bear', 'PHB', b(
    'Em Fúria, inimigos a até 1,5 m que possam ver ou ouvir você têm desvantagem em ataques contra alvos que não sejam você (a menos que não possam ser amedrontados).',
    'While raging, enemies within 5 ft that can see or hear you have Disadvantage on attacks against targets other than you (unless they can\'t be frightened).')),
  totemOption('eagle', 'Águia', 'Eagle', 'PHB', b(
    'Em Fúria, deslocamento de voo igual ao seu deslocamento, mas você cai se terminar o turno no ar.',
    'While raging, Fly Speed equal to your Speed, but you fall if you end your turn in the air.')),
  totemOption('wolf', 'Lobo', 'Wolf', 'PHB', b(
    'Em Fúria, ao acertar um ataque corpo a corpo numa criatura Grande ou menor, use uma Ação Bônus para derrubá-la (Caído).',
    'While raging, when you hit a Large or smaller creature with a melee attack, you can use a Bonus Action to knock it Prone.')),
  totemOption('elk', 'Alce', 'Elk', 'SCAG', b(
    'Em Fúria, Ação Bônus: atravesse o espaço de uma criatura Grande ou menor; ela faz salvaguarda de Força (CD 8 + PB + FOR) ou cai (Caída) e sofre 1d12 + FOR de concussão.',
    'While raging, Bonus Action: move through a Large or smaller creature\'s space; it makes a Strength save (DC 8 + PB + STR) or is knocked Prone and takes 1d12 + STR bludgeoning damage.')),
  totemOption('tiger', 'Tigre', 'Tiger', 'SCAG', b(
    'Em Fúria, se mover pelo menos 6 m (20 pés) em linha reta até um alvo antes de atacá-lo, pode fazer um ataque corpo a corpo extra como Ação Bônus.',
    'While raging, if you move at least 20 ft in a straight line toward a target before attacking it, you can make one extra melee attack as a Bonus Action.')),
];

const pools = {
  weaponMastery: SHARED.weaponMastery,
  primalKnowledge: {
    name: b('Conhecimento Primal (perícia)', 'Primal Knowledge (skill)'),
    kind: 'skill', grantAs: 'skill',
    filter: { from: BARBARIAN_SKILLS },
  },

  // Coração Selvagem, 6º: escolha persistente, troca após Descanso Longo.
  wildHeartAspect: {
    name: b('Aspecto da Natureza', 'Aspect of the Wilds'),
    freeSwap: true,
    options: [
      { id: 'owl', name: b('Coruja', 'Owl'), source: 'PHB24', desc: b(
        'Visão no escuro de 18 m (60 pés); se já tiver, o alcance aumenta em 18 m.',
        'Darkvision 60 ft; if you already have it, its range increases by 60 ft.') },
      { id: 'panther', name: b('Pantera', 'Panther'), source: 'PHB24', desc: b(
        'Deslocamento de escalada igual ao seu deslocamento.',
        'Climb Speed equal to your Speed.') },
      { id: 'salmon', name: b('Salmão', 'Salmon'), source: 'PHB24', desc: b(
        'Deslocamento de natação igual ao seu deslocamento.',
        'Swim Speed equal to your Speed.') },
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
        'Aura: uma criatura na aura faz salvaguarda de Destreza ou sofre 1d6 elétrico (2d6 no 10º, 3d6 no 15º, 4d6 no 20º), metade se passar. 6º: resistência a elétrico, respira debaixo d\'água e natação 9 m (30 pés). 10º: aliados escolhidos na aura ganham resistência a elétrico. 14º: Reação ao acertar uma criatura na aura: salvaguarda de Força ou fica Caída.',
        'Aura: one creature in it makes a Dexterity save or takes 1d6 lightning (2d6 at 10th, 3d6 at 15th, 4d6 at 20th), half on success. 6th: lightning resistance, breathe underwater, 30 ft Swim Speed. 10th: chosen allies in the aura gain lightning resistance. 14th: Reaction when you hit a creature in the aura: Strength save or it falls Prone.') },
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
        desc: b('Aprende Arte Druídica (Sabedoria é o atributo de conjuração).', 'Learn Druidcraft (Wisdom is your spellcasting ability).'),
        grants: { cantrips: ['druidcraft'] } },
      { id: 'thaumaturgy', name: b('Taumaturgia', 'Thaumaturgy'), source: 'BGG',
        desc: b('Aprende Taumaturgia (Sabedoria é o atributo de conjuração).', 'Learn Thaumaturgy (Wisdom is your spellcasting ability).'),
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
        'Com a Fúria ativa, imunidade às condições Enfeitiçado e Amedrontado. Se estiver sob uma delas ao entrar em Fúria, ela termina.',
        'Immunity to the Charmed and Frightened conditions while raging. If you are Charmed or Frightened when you enter Rage, the condition ends.'))] },
      10: { features: [f('retaliation', b('Retaliação', 'Retaliation'), b(
        'Ao sofrer dano de uma criatura a até 1,5 m (5 pés), use sua Reação para fazer um ataque corpo a corpo contra ela, com arma ou desarmado.',
        'When a creature within 5 ft damages you, you can take a Reaction to make one melee attack against it with a weapon or Unarmed Strike.'))] },
      14: { features: [f('intimidatingPresence', b('Presença Intimidadora', 'Intimidating Presence'), b(
        'Ação Bônus: cada criatura à sua escolha numa emanação de 9 m (30 pés) faz salvaguarda de Sabedoria (CD 8 + mod. de Força + PB) ou fica Amedrontada por 1 minuto, repetindo a salvaguarda no fim de cada turno dela. 1×/Descanso Longo, ou gaste um uso de Fúria (sem ação) para recuperar.',
        'Bonus Action: each creature of your choice in a 30-ft Emanation makes a Wisdom save (DC 8 + Strength mod + PB) or is Frightened for 1 minute, repeating the save at the end of each of its turns. Once per Long Rest, or expend a use of Rage (no action) to restore it.'))] },
    },
  },

  wildHeart: {
    name: b('Caminho do Coração Selvagem', 'Path of the Wild Heart'),
    source: 'PHB24',
    desc: b('Parentesco com os animais guia a sua Fúria (reedição do Guerreiro Totêmico).', 'Kinship with beasts shapes your Rage (successor to the Totem Warrior).'),
    levels: {
      3: {
        features: [
          f('animalSpeaker', b('Voz dos Animais', 'Animal Speaker'), withNote(b(
            'Pode conjurar Sentido Bestial e Falar com Animais.',
            'You can cast Beast Sense and Speak with Animals.'))),
          f('rageOfTheWilds', b('Fúria da Natureza', 'Rage of the Wilds'), b(
            'A cada vez que entra em Fúria, escolha um animal (vale até a Fúria terminar). Urso: resistência a todo dano, exceto energia, necrótico, psíquico e radiante. Águia: ao entrar em Fúria, use Desengajar e Disparada na mesma Ação Bônus; durante a Fúria, uma Ação Bônus faz as duas coisas. Lobo: seus aliados têm vantagem em jogadas de ataque contra inimigos a até 1,5 m (5 pés) de você.',
            'Each time you enter Rage, choose an animal (lasts until the Rage ends). Bear: Resistance to all damage except Force, Necrotic, Psychic, and Radiant. Eagle: take Disengage and Dash as part of the Bonus Action that starts the Rage; while raging, a Bonus Action does both. Wolf: your allies have Advantage on attack rolls against enemies within 5 ft of you.')),
        ],
        autoSpells: ['beastSense', 'speakWithAnimals'],
      },
      6: { features: [f('aspectOfTheWilds', b('Aspecto da Natureza', 'Aspect of the Wilds'), b(
        'Escolha um benefício (troca ao terminar um Descanso Longo): Coruja (visão no escuro 18 m, ou +18 m se já tiver), Pantera (escalada igual ao deslocamento) ou Salmão (natação igual ao deslocamento).',
        'Choose one benefit (change it after a Long Rest): Owl (60-ft Darkvision, or +60 ft if you have it), Panther (Climb Speed equal to your Speed), or Salmon (Swim Speed equal to your Speed).'))] },
      10: {
        features: [f('natureSpeaker', b('Voz da Natureza', 'Nature Speaker'), withNote(b(
          'Pode conjurar Comunhão com a Natureza.',
          'You can cast Commune with Nature.')))],
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
        'Ao entrar em Fúria, ganhe PV temporários iguais ao seu nível de Bárbaro. No início de cada turno seu com a Fúria ativa, escolha outra criatura a até 3 m (10 pés): ela ganha PV temporários iguais a um número de d6 igual ao seu bônus de Dano de Fúria; somem quando a Fúria terminar.',
        'When you enter Rage, gain temporary HP equal to your Barbarian level. At the start of each of your turns while raging, choose another creature within 10 ft: it gains temporary HP equal to a number of d6s equal to your Rage Damage bonus, which vanish when your Rage ends.'))] },
      6: { features: [f('branchesOfTheTree', b('Galhos da Árvore', 'Branches of the Tree'), b(
        'Com a Fúria ativa, quando uma criatura que você vê começa o turno a até 9 m (30 pés), use sua Reação: ela faz salvaguarda de Força (CD 8 + mod. de Força + PB) ou é teleportada para um espaço a até 1,5 m de você (ou o mais próximo), e você pode reduzir o deslocamento dela a 0 até o fim do turno.',
        'While raging, when a creature you can see starts its turn within 30 ft, you can take a Reaction: it makes a Strength save (DC 8 + Strength mod + PB) or is teleported to a space within 5 ft of you (or the nearest), and you can reduce its Speed to 0 until the end of that turn.'))] },
      10: { features: [f('batteringRoots', b('Raízes Aríetes', 'Battering Roots'), b(
        'No seu turno, seu alcance aumenta em 3 m (10 pés) com armas corpo a corpo Pesadas ou Versáteis. Ao acertar com uma delas, pode aplicar a maestria Empurrar ou Derrubar além da maestria que já usar.',
        'During your turn, your reach increases by 10 ft with Heavy or Versatile melee weapons. When you hit with one, you can apply the Push or Topple mastery in addition to any other mastery you use.'))] },
      14: { features: [f('travelAlongTheTree', b('Viagem pela Árvore', 'Travel Along the Tree'), b(
        'Ao entrar em Fúria e como Ação Bônus durante ela, teleporte-se até 18 m (60 pés) para um espaço que veja. Uma vez por Fúria, o alcance pode ser 45 m (150 pés), levando até seis criaturas voluntárias a até 3 m de você.',
        'When you enter Rage and as a Bonus Action while raging, teleport up to 60 ft to a space you can see. Once per Rage, the range can be 150 ft and you can bring up to six willing creatures within 10 ft of you.'))] },
    },
  },

  zealot: {
    name: b('Caminho do Fanático', 'Path of the Zealot'),
    source: 'PHB24',
    desc: b('Fúria abastecida por um deus, que cura e protege seus fiéis.', 'Rage fueled by a god that heals and shields the faithful.'),
    levels: {
      3: { features: [
        f('divineFury', b('Fúria Divina', 'Divine Fury'), b(
          'Com a Fúria ativa, a primeira criatura que você acertar em cada turno com arma ou ataque desarmado sofre dano extra de 1d6 + metade do seu nível de Bárbaro, necrótico ou radiante (escolha a cada vez).',
          'While raging, the first creature you hit on each of your turns with a weapon or Unarmed Strike takes extra damage of 1d6 + half your Barbarian level, Necrotic or Radiant (your choice each time).')),
        f('warriorOfTheGods', b('Guerreiro dos Deuses', 'Warrior of the Gods'), b(
          'Você tem uma reserva de d12 para cura: 4 dados (5 no 6º, 6 no 12º, 7 no 17º). Ação Bônus: gaste dados da reserva, role-os e recupere PV igual ao total. A reserva volta toda num Descanso Longo.',
          'You have a pool of d12s for healing: 4 dice (5 at 6th, 6 at 12th, 7 at 17th). Bonus Action: expend dice from the pool, roll them, and regain HP equal to the total. The pool refills on a Long Rest.')),
      ] },
      6: { features: [f('fanaticalFocus', b('Foco Fanático', 'Fanatical Focus'), b(
        'Uma vez por Fúria, ao falhar numa salvaguarda, role de novo somando seu bônus de Dano de Fúria; use o novo resultado.',
        'Once per active Rage, when you fail a saving throw, reroll it with a bonus equal to your Rage Damage; you must use the new roll.'))] },
      10: { features: [f('zealousPresence', b('Presença Zelosa', 'Zealous Presence'), b(
        'Ação Bônus: até 10 outras criaturas a até 18 m (60 pés) ganham vantagem em jogadas de ataque e salvaguardas até o início do seu próximo turno. 1×/Descanso Longo, ou gaste um uso de Fúria (sem ação) para recuperar.',
        'Bonus Action: up to 10 other creatures within 60 ft gain Advantage on attack rolls and saving throws until the start of your next turn. Once per Long Rest, or expend a use of Rage (no action) to restore it.'))] },
      14: { features: [f('rageOfTheGods', b('Fúria dos Deuses', 'Rage of the Gods'), b(
        'Ao entrar em Fúria, pode assumir uma forma divina por 1 minuto ou até cair a 0 PV (1×/Descanso Longo): voo igual ao deslocamento (pode pairar); resistência a dano necrótico, psíquico e radiante; e, quando uma criatura a até 9 m (30 pés) for cair a 0 PV, pode usar sua Reação e gastar um uso de Fúria para que os PV dela fiquem iguais ao seu nível de Bárbaro.',
        'When you enter Rage, you can take a divine form for 1 minute or until you drop to 0 HP (once per Long Rest): Fly Speed equal to your Speed (can hover); Resistance to Necrotic, Psychic, and Radiant damage; and when a creature within 30 ft would drop to 0 HP, you can take a Reaction and expend a use of Rage to set its HP to your Barbarian level instead.'))] },
    },
  },

  totem: {
    name: b('Caminho do Guerreiro Totêmico', 'Path of the Totem Warrior'),
    source: 'PHB',
    desc: b('Espíritos animais guiam o bárbaro; um animal por nível (Alce e Tigre vêm do SCAG).', 'Animal spirits guide the barbarian; one animal per tier (Elk and Tiger from SCAG).'),
    levels: {
      3: {
        features: [
          f('spiritSeeker', b('Buscador Espiritual', 'Spirit Seeker'), withNote(b(
            'Pode conjurar Sentido Bestial e Falar com Animais.',
            'You can cast Beast Sense and Speak with Animals.'))),
          f('totemSpirit', b('Espírito Totêmico', 'Totem Spirit'), b(
            'Escolha um animal totêmico (Urso, Águia, Lobo, Alce ou Tigre); seu benefício vale com a Fúria ativa.',
            'Choose a totem animal (Bear, Eagle, Wolf, Elk, or Tiger); its benefit applies while you rage.')),
        ],
        autoSpells: ['beastSense', 'speakWithAnimals'],
      },
      6: { features: [f('aspectOfTheBeast', b('Aspecto da Besta', 'Aspect of the Beast'), b(
        'Escolha um animal (pode ser diferente do anterior) e ganhe seu benefício permanente, mesmo fora da Fúria.',
        'Choose an animal (may differ from before) and gain its permanent benefit, even outside Rage.'))] },
      10: {
        features: [f('spiritWalker', b('Andarilho Espiritual', 'Spirit Walker'), withNote(b(
          'Pode conjurar Comunhão com a Natureza.',
          'You can cast Commune with Nature.')))],
        autoSpells: ['communeWithNature'],
      },
      14: { features: [f('totemicAttunement', b('Sintonia Totêmica', 'Totemic Attunement'), b(
        'Escolha um animal (pode ser diferente dos anteriores) e ganhe seu benefício com a Fúria ativa.',
        'Choose an animal (may differ from before) and gain its benefit while raging.'))] },
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
        'Ao usar Ataque Imprudente com a Fúria ativa, ganhe PV temporários iguais ao modificador de Constituição (mínimo 1), que somem quando a Fúria acaba.',
        'When you use Reckless Attack while raging, gain temporary HP equal to your Constitution modifier (minimum 1); they vanish when the Rage ends.'))] },
      10: { features: [f('battleragerCharge', b('Investida do Furioso', 'Battlerager Charge'), b(
        'Com a Fúria ativa, pode usar Disparada como Ação Bônus.',
        'While raging, you can Dash as a Bonus Action.'))] },
      14: { features: [f('spikedRetribution', b('Retribuição Espinhosa', 'Spiked Retribution'), b(
        'Em Fúria e vestindo armadura de espinhos, uma criatura a até 1,5 m que te acerte com ataque corpo a corpo sofre 3 de dano perfurante (se você não estiver Incapacitado).',
        'While raging in spiked armor, a creature within 5 ft that hits you with a melee attack takes 3 piercing damage (if you aren\'t Incapacitated).'))] },
    },
  },

  ancestralguardian: {
    name: b('Caminho do Guardião Ancestral', 'Path of the Ancestral Guardian'),
    source: 'XGE',
    desc: b('Espíritos ancestrais protegem os aliados do bárbaro.', 'Ancestral spirits shield the barbarian\'s allies.'),
    levels: {
      3: { features: [f('ancestralProtectors', b('Protetores Ancestrais', 'Ancestral Protectors'), b(
        'Com a Fúria ativa, a primeira criatura que você acertar no turno fica marcada até o início do seu próximo turno: tem desvantagem em ataques contra alvos que não sejam você, e quem ela acertar tem resistência a esse dano.',
        'While raging, the first creature you hit on your turn is marked until the start of your next turn: it has Disadvantage on attacks against targets other than you, and those it hits have Resistance to that damage.'))] },
      6: { features: [f('spiritShield', b('Escudo Espiritual', 'Spirit Shield'), b(
        'Com a Fúria ativa, Reação quando uma criatura que você vê a até 9 m (30 pés) sofre dano: reduza esse dano em 2d6 (3d6 no 10º, 4d6 no 14º).',
        'While raging, Reaction when a creature you can see within 30 ft takes damage: reduce the damage by 2d6 (3d6 at 10th, 4d6 at 14th).'))] },
      10: {
        features: [f('consultTheSpirits', b('Consultar os Espíritos', 'Consult the Spirits'), b(
          'Conjure Augúrio ou Clarividência sem espaço de magia nem componentes materiais (Sabedoria). 1×/Descanso Curto ou Longo.',
          'Cast Augury or Clairvoyance without a spell slot or material components (Wisdom). Once per Short or Long Rest.'))],
        autoSpells: ['augury', 'clairvoyance'],
      },
      14: { features: [f('vengefulAncestors', b('Ancestrais Vingativos', 'Vengeful Ancestors'), b(
        'Quando o Escudo Espiritual reduz dano, o atacante sofre dano de energia igual ao total evitado.',
        'When Spirit Shield reduces damage, the attacker takes Force damage equal to the amount prevented.'))] },
    },
  },

  stormherald: {
    name: b('Caminho do Arauto da Tempestade', 'Path of the Storm Herald'),
    source: 'XGE',
    desc: b('A Fúria se torna uma tempestade ao redor do bárbaro; o ambiente escolhido define os efeitos.', 'Rage becomes a storm around the barbarian; the chosen environment sets its effects.'),
    levels: {
      3: { features: [f('stormAura', b('Aura da Tempestade', 'Storm Aura'), b(
        'Com a Fúria ativa, você emana uma aura de 3 m (10 pés). Escolha um ambiente (Deserto, Mar ou Tundra; pode trocar ao ganhar nível de Bárbaro). O efeito se ativa ao entrar em Fúria e, depois, como Ação Bônus a cada turno. CD = 8 + PB + mod. de Constituição.',
        'While raging, you emanate a 10-ft aura. Choose an environment (Desert, Sea, or Tundra; you can change it when you gain a Barbarian level). The effect triggers when you enter Rage and then as a Bonus Action each turn. DC = 8 + PB + Constitution mod.'))] },
      6: { features: [f('stormSoul', b('Alma da Tempestade', 'Storm Soul'), b(
        'Ganhe a resistência e o benefício utilitário do seu ambiente (ver a opção escolhida).',
        'Gain the resistance and utility benefit of your environment (see the chosen option).'))] },
      10: { features: [f('shieldingStorm', b('Tempestade Protetora', 'Shielding Storm'), b(
        'Criaturas à sua escolha na aura ganham a mesma resistência da Alma da Tempestade.',
        'Creatures of your choice in your aura gain the resistance from Storm Soul.'))] },
      14: { features: [f('ragingStorm', b('Tempestade Furiosa', 'Raging Storm'), b(
        'A aura ganha um efeito ofensivo conforme o ambiente (ver a opção escolhida).',
        'The aura gains an offensive effect based on your environment (see the chosen option).'))] },
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
        'Ao entrar em Fúria, escolha até um número de aliados a 9 m igual ao mod. de Constituição (mínimo 1): enquanto a Fúria durar, 1×/turno eles causam +1d6 de dano ao acertar, e você ganha 5 PV temporários por aliado. PB usos por Descanso Longo.',
        'When you enter Rage, choose allies within 30 ft up to your Constitution mod (minimum 1): while the Rage lasts, once per turn they deal +1d6 damage on a hit, and you gain 5 temporary HP per ally. PB uses per Long Rest.'))] },
    },
  },

  wildmagic: {
    name: b('Caminho da Magia Selvagem', 'Path of Wild Magic'),
    source: 'TCE',
    desc: b('A Fúria libera surtos de magia imprevisível.', 'Rage unleashes surges of unpredictable magic.'),
    levels: {
      3: { features: [
        f('magicAwareness', b('Percepção Mágica', 'Magic Awareness'), b(
          'Ação: até o fim do próximo turno, sente magias ativas e itens mágicos a até 18 m (60 pés) e a escola das magias. PB usos por Descanso Longo.',
          'Action: until the end of your next turn, sense active spells and magic items within 60 ft and the spells\' schools. PB uses per Long Rest.')),
        f('wildSurge', b('Surto Selvagem', 'Wild Surge'), b(
          'Ao entrar em Fúria, role 1d8 na tabela de Magia Selvagem: 1 tentáculos necróticos; 2 teleporte de 9 m; 3 espírito explosivo; 4 arma infundida de energia; 5 retribuição de energia; 6 luzes protetoras (+1 CA); 7 flores e vinhas (terreno difícil); 8 raio de luz que cega. CD = 8 + PB + mod. de Constituição.',
          'When you enter Rage, roll 1d8 on the Wild Magic table: 1 necrotic shadow tendrils; 2 30-ft teleport; 3 exploding spirit; 4 force-infused weapon; 5 force retribution; 6 protective lights (+1 AC); 7 flowers and vines (difficult terrain); 8 blinding bolt of light. DC = 8 + PB + Constitution mod.')),
      ] },
      6: { features: [f('bolsteringMagic', b('Magia Fortalecedora', 'Bolstering Magic'), b(
        'Ação, toque uma criatura: por 10 minutos ela soma 1d3 a jogadas de ataque e testes de atributo, ou recupera um espaço de magia de círculo igual a 1d3 (ou menor). PB usos por Descanso Longo.',
        'Action, touch a creature: for 10 minutes it adds 1d3 to attack rolls and ability checks, or it regains a spell slot of level 1d3 (or lower). PB uses per Long Rest.'))] },
      10: { features: [f('unstableBacklash', b('Reação Instável', 'Unstable Backlash'), b(
        'Com a Fúria ativa, ao sofrer dano ou falhar numa salvaguarda, use sua Reação para rolar um novo Surto Selvagem, que substitui o atual.',
        'While raging, when you take damage or fail a saving throw, use your Reaction to roll a new Wild Surge, replacing the current one.'))] },
      14: { features: [f('controlledSurge', b('Surto Controlado', 'Controlled Surge'), b(
        'Ao rolar na tabela de Magia Selvagem, role duas vezes e escolha o efeito; se os números forem iguais, escolha qualquer efeito da tabela.',
        'When you roll on the Wild Magic table, roll twice and choose; on matching numbers, pick any effect on the table.'))] },
    },
  },

  giant: {
    name: b('Caminho do Gigante', 'Path of the Giant'),
    source: 'BGG',
    desc: b('A Fúria desperta a força e o tamanho dos gigantes.', 'Rage awakens the might and size of giants.'),
    levels: {
      3: { features: [
        f('giantPower', b('Poder Gigante', 'Giant Power'), b(
          'Aprende o idioma Gigante (ou outro, se já souber) e um truque: Arte Druídica ou Taumaturgia (Sabedoria é o atributo de conjuração).',
          'Learn Giant (or another language if you know it) and one cantrip: Druidcraft or Thaumaturgy (Wisdom is your spellcasting ability).')),
        f('giantsHavoc', b('Devastação Gigante', 'Giant\'s Havoc'), b(
          'Com a Fúria ativa: alcance +1,5 m (5 pés); torna-se Grande se houver espaço; soma o Dano de Fúria a ataques de arremesso que usem Força.',
          'While raging: +5 ft reach; become Large if there is room; add your Rage Damage to thrown weapon attacks using Strength.')),
      ] },
      6: { features: [f('elementalCleaver', b('Cutelo Elemental', 'Elemental Cleaver'), b(
        'Ao entrar em Fúria, infunda uma arma: o dano vira ácido, frio, fogo, trovão ou elétrico (Ação Bônus para trocar), causa +1d6 e ganha Arremesso (6/18 m) e volta à sua mão após o ataque.',
        'When you enter Rage, infuse a weapon: its damage becomes acid, cold, fire, thunder, or lightning (Bonus Action to switch), it deals +1d6, gains the Thrown property (20/60 ft), and returns to your hand after the attack.'))] },
      10: { features: [f('mightyImpel', b('Impulso Poderoso', 'Mighty Impel'), b(
        'Com a Fúria ativa, Ação Bônus: arremesse uma criatura Média ou menor ao seu alcance para um espaço a até 9 m (30 pés). Se não for voluntária, faz salvaguarda de Força (CD 8 + PB + mod. de Força); se não terminar sobre uma superfície que a sustente, cai, sofre dano de queda e fica Caída.',
        'While raging, Bonus Action: hurl a Medium or smaller creature within reach to a space up to 30 ft away. An unwilling target makes a Strength save (DC 8 + PB + Strength mod); if it doesn\'t end on a surface that supports it, it falls, taking falling damage and landing Prone.'))] },
      14: { features: [f('demiurgicColossus', b('Colosso Demiúrgico', 'Demiurgic Colossus'), b(
        'Em Fúria: o alcance extra passa a 3 m (10 pés) e você pode ficar Grande ou Enorme; o dano extra do Cutelo Elemental passa a 2d6; o Impulso Poderoso passa a afetar criaturas Grandes.',
        'While raging: the extra reach becomes 10 ft and you can become Large or Huge; Elemental Cleaver\'s extra damage becomes 2d6; Mighty Impel can target Large creatures.'))] },
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
