// Guerreiro — traços 2024 (SRD 5.2.1, CC-BY 4.0), manobras, tiros arcanos,
// runas e subclasses. Formato em README.md. Textos de suplementos são resumos
// originais, nunca o texto dos livros.
import { SHARED } from './shared.js';

const b = (pt, en) => ({ pt, en });
const f = (id, pt, en, descPt, descEn) => ({ id, name: b(pt, en), desc: b(descPt, descEn) });

// Perícias da lista do Guerreiro 2024 (Persuasão é nova em 2024).
const FIGHTER_SKILLS = ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'];

const SKILL_NAMES = {
  intimidation: b('Intimidação', 'Intimidation'),
  animalHandling: b('Lidar com Animais', 'Animal Handling'),
  history: b('História', 'History'),
  insight: b('Intuição', 'Insight'),
  performance: b('Atuação', 'Performance'),
  persuasion: b('Persuasão', 'Persuasion'),
};
const skillOption = (id, source) => ({
  id, name: SKILL_NAMES[id], source,
  desc: b(`Proficiência em ${SKILL_NAMES[id].pt}.`, `Proficiency in ${SKILL_NAMES[id].en}.`),
  grants: { skills: [id] },
});
// Escolher "um idioma" abre uma vaga no pool dinâmico de idiomas indicado.
const languageOption = (source, pool) => ({
  id: 'language', name: b('Um idioma', 'One language'), source,
  desc: b('Aprende um idioma à sua escolha em vez de uma perícia.', 'Learn one language of your choice instead of a skill.'),
  choices: { [pool]: 1 },
});
const languagePool = (pt, en) => ({ name: b(pt, en), kind: 'language', grantAs: 'language' });

// Ferramentas de Artesão (SRD 5.2.1) — mesmos ids usados em monk.js.
const artisanTool = (id, pt, en) => ({
  id, name: b(pt, en), source: 'SRD',
  desc: b('Proficiência com este tipo de Ferramentas de Artesão.', "Proficiency with this type of Artisan's Tools."),
  grants: { tools: [id] },
});
const ARTISAN_TOOLS = [
  artisanTool('alchemistsSupplies', 'Suprimentos de Alquimista', "Alchemist's Supplies"),
  artisanTool('brewersSupplies', 'Suprimentos de Cervejeiro', "Brewer's Supplies"),
  artisanTool('calligraphersSupplies', 'Suprimentos de Calígrafo', "Calligrapher's Supplies"),
  artisanTool('carpentersTools', 'Ferramentas de Carpinteiro', "Carpenter's Tools"),
  artisanTool('cartographersTools', 'Ferramentas de Cartógrafo', "Cartographer's Tools"),
  artisanTool('cobblersTools', 'Ferramentas de Sapateiro', "Cobbler's Tools"),
  artisanTool('cooksUtensils', 'Utensílios de Cozinheiro', "Cook's Utensils"),
  artisanTool('glassblowersTools', 'Ferramentas de Vidreiro', "Glassblower's Tools"),
  artisanTool('jewelersTools', 'Ferramentas de Joalheiro', "Jeweler's Tools"),
  artisanTool('leatherworkersTools', 'Ferramentas de Coureiro', "Leatherworker's Tools"),
  artisanTool('masonsTools', 'Ferramentas de Pedreiro', "Mason's Tools"),
  artisanTool('paintersSupplies', 'Suprimentos de Pintor', "Painter's Supplies"),
  artisanTool('pottersTools', 'Ferramentas de Oleiro', "Potter's Tools"),
  artisanTool('smithsTools', 'Ferramentas de Ferreiro', "Smith's Tools"),
  artisanTool('tinkersTools', 'Ferramentas de Funileiro', "Tinker's Tools"),
  artisanTool('weaversTools', 'Ferramentas de Tecelão', "Weaver's Tools"),
  artisanTool('woodcarversTools', 'Ferramentas de Entalhador', "Woodcarver's Tools"),
];

// ---------------------------------------------------------------------------
// Manobras do Mestre de Batalha. Texto das regras de 2024 (PHB24); onde a
// versão de 2014 é diferente, a diferença aparece no fim da descrição. Brace,
// Grappling Strike e Quick Toss só existem no Tasha (2014).
// "DS" = dado de superioridade. Todas gastam 1 DS; no máximo 1 manobra por ataque.
const maneuvers = [
  { id: 'ambush', name: b('Emboscada', 'Ambush'), source: 'PHB24',
    desc: b("Quando você realizar um teste de Destreza (Furtividade) ou uma jogada de iniciativa, você pode gastar um dado de superioridade e adicionar o dado à rolagem, desde que não esteja incapacitado.",
      "When you make a Dexterity (Stealth) check or an initiative roll, you can expend one superiority die and add the die to the roll, provided you aren’t incapacitated.") },
  { id: 'baitAndSwitch', name: b('Isca e Troca', 'Bait and Switch'), source: 'PHB24',
    desc: b('No seu turno, gaste 1 DS e 1,5 m de movimento para trocar de lugar com uma criatura voluntária a até 1,5 m, sem provocar Ataques de Oportunidade. Você ou ela soma o DS à CA até o início do seu próximo turno.',
      'On your turn, expend one die and 5 feet of movement to swap places with a willing creature within 5 feet, without provoking Opportunity Attacks. You or that creature adds the die to AC until the start of your next turn.') },
  { id: 'brace', name: b('Postura Firme', 'Brace'), source: 'TCE', rules: '2014',
    desc: b("Quando uma criatura que você possa ver entrar no alcance que você possui com a arma corpo a corpo que está empunhando, você pode usar sua reação para gastar um dado de superioridade e realizar um ataque contra a criatura, usando essa arma. Se o ataque acertar, adicione o dado de superioridade à jogada de dano da arma.",
      "When a creature you can see moves into the reach you have with the melee weapon you’re wielding, you can use your reaction to expend one superiority die and make one attack against the creature, using that weapon. If the attack hits, add the superiority die to the weapon’s damage roll.") },
  { id: 'commandersStrike', name: b('Golpe do Comandante', "Commander's Strike"), source: 'PHB24',
    desc: b('Ao usar a ação Atacar, abra mão de um ataque e gaste 1 DS: um aliado que veja ou ouça você usa a Reação para fazer um ataque e soma o DS ao dano. (2014: também custa sua ação bônus.)',
      'When you take the Attack action, forgo one attack and expend one die: an ally who can see or hear you uses its Reaction to make one attack, adding the die to the damage. (2014: also costs your Bonus Action.)') },
  { id: 'commandingPresence', name: b('Presença de Comando', 'Commanding Presence'), source: 'PHB24',
    desc: b("Quando você realizar um teste de Carisma (Intimidação), Carisma (Atuação) ou Carisma (Persuasão), você pode gastar um dado de superioridade e adicionar o dado de superioridade ao teste de atributo.",
      "When you make a Charisma (Intimidation), a Charisma (Performance), or a Charisma (Persuasion) check, you can expend one superiority die and add the superiority die to the ability check.") },
  { id: 'disarmingAttack', name: b('Ataque Desarmante', 'Disarming Attack'), source: 'PHB24',
    desc: b('Ao acertar com um ataque, gaste 1 DS e some-o ao dano. O alvo faz uma salvaguarda de Força; se falhar, larga um objeto que esteja segurando (à sua escolha), que cai no espaço dele.',
      "When you hit with an attack, expend one die and add it to the damage. The target makes a Strength save; on a failure, it drops one object of your choice that it's holding, in its space.") },
  { id: 'distractingStrike', name: b('Golpe Distrativo', 'Distracting Strike'), source: 'PHB24',
    desc: b('Ao acertar com um ataque, gaste 1 DS e some-o ao dano. A próxima jogada de ataque contra o alvo, feita por outra criatura, tem Vantagem se ocorrer antes do início do seu próximo turno.',
      'When you hit with an attack, expend one die and add it to the damage. The next attack roll against the target by someone other than you has Advantage if made before the start of your next turn.') },
  { id: 'evasiveFootwork', name: b('Passo Evasivo', 'Evasive Footwork'), source: 'PHB24',
    desc: b('Ação bônus: gaste 1 DS, faça a ação Desengajar e some o DS à sua CA até o início do seu próximo turno. (2014: ao se mover, soma o DS à CA até parar, sem ação bônus.)',
      'Bonus Action: expend one die, take the Disengage action, and add the die to your AC until the start of your next turn. (2014: when you move, add the die to AC until you stop moving, no Bonus Action.)') },
  { id: 'feintingAttack', name: b('Finta', 'Feinting Attack'), source: 'PHB24',
    desc: b("Você pode gastar um dado de superioridade e usar uma ação bônus em seu turno para fintar, escolhendo uma criatura a até 1,5 metro de você como seu alvo. Você tem vantagem em sua próxima jogada de ataque contra aquela criatura neste turno. Se esse ataque acertar, adicione o dado de superioridade à jogada de dano do ataque.",
      "You can expend one superiority die and use a bonus action on your turn to feint, choosing one creature within 5 feet of you as your target. You have advantage on your next attack roll against that creature this turn. If that attack hits, add the superiority die to the attack’s damage roll.") },
  { id: 'goadingAttack', name: b('Ataque Provocador', 'Goading Attack'), source: 'PHB24',
    desc: b('Ao acertar com um ataque, gaste 1 DS e some-o ao dano. O alvo faz uma salvaguarda de Sabedoria; se falhar, tem Desvantagem em ataques contra outros alvos que não você até o fim do seu próximo turno.',
      'When you hit with an attack, expend one die and add it to the damage. The target makes a Wisdom save; on a failure, it has Disadvantage on attack rolls against targets other than you until the end of your next turn.') },
  { id: 'grapplingStrike', name: b('Golpe Agarrador', 'Grappling Strike'), source: 'TCE', rules: '2014',
    desc: b("Imediatamente após acertar uma criatura com um ataque corpo a corpo em seu turno, você pode gastar um dado de superioridade e então tentar agarrar o alvo como uma ação bônus (veja o Livro do Jogador para regras sobre agarrar). Adicione o dado de superioridade ao seu teste de Força (Atletismo).",
      "Immediately after you hit a creature with a melee attack on your turn, you can expend one superiority die and then try to grapple the target as a bonus action (see the Player’s Handbook for rules on grappling). Add the superiority die to your Strength (Athletics) check.") },
  { id: 'lungingAttack', name: b('Estocada', 'Lunging Attack'), source: 'PHB24',
    desc: b('Ação bônus: gaste 1 DS e faça a ação Disparada. Se você se mover ao menos 1,5 m em linha reta logo antes de acertar um ataque corpo a corpo neste turno, some o DS ao dano. (2014: +1,5 m de alcance num ataque corpo a corpo e +DS no dano, sem ação bônus.)',
      'Bonus Action: expend one die and take the Dash action. If you move at least 5 feet in a straight line right before hitting with a melee attack this turn, add the die to the damage. (2014: +5 ft reach on one melee attack and +die damage, no Bonus Action.)') },
  { id: 'maneuveringAttack', name: b('Ataque de Manobra', 'Maneuvering Attack'), source: 'PHB24',
    desc: b('Ao acertar com um ataque, gaste 1 DS e some-o ao dano. Um aliado que veja ou ouça você pode usar a Reação para se mover até metade do deslocamento dele sem provocar Ataque de Oportunidade do alvo.',
      "When you hit with an attack, expend one die and add it to the damage. An ally who can see or hear you can use its Reaction to move up to half its Speed without provoking an Opportunity Attack from the target.") },
  { id: 'menacingAttack', name: b('Ataque Ameaçador', 'Menacing Attack'), source: 'PHB24',
    desc: b('Ao acertar com um ataque, gaste 1 DS e some-o ao dano. O alvo faz uma salvaguarda de Sabedoria; se falhar, fica Amedrontado por você até o fim do seu próximo turno.',
      'When you hit with an attack, expend one die and add it to the damage. The target makes a Wisdom save; on a failure, it has the Frightened condition until the end of your next turn.') },
  { id: 'parry', name: b('Aparar', 'Parry'), source: 'PHB24',
    desc: b('Reação: quando outra criatura causa dano a você com um ataque corpo a corpo, gaste 1 DS e reduza o dano em DS + modificador de Força ou Destreza. (2014: DS + mod. de Destreza.)',
      'Reaction: when another creature damages you with a melee attack, expend one die and reduce the damage by the die roll plus your Strength or Dexterity modifier. (2014: die + Dexterity modifier only.)') },
  { id: 'precisionAttack', name: b('Ataque Preciso', 'Precision Attack'), source: 'PHB24',
    desc: b("Quando você realizar uma jogada de ataque com arma contra uma criatura, você pode gastar um dado de superioridade para adicioná-lo à rolagem. Você pode usar esta manobra antes ou depois de realizar a jogada de ataque, mas antes que quaisquer efeitos do ataque sejam aplicados.",
      "When you make a weapon attack roll against a creature, you can expend one superiority die to add it to the roll. You can use this maneuver before or after making the attack roll, but before any effects of the attack are applied.") },
  { id: 'pushingAttack', name: b('Ataque Empurrão', 'Pushing Attack'), source: 'PHB24',
    desc: b('Ao acertar com um ataque, gaste 1 DS e some-o ao dano. Se o alvo for Grande ou menor, faz uma salvaguarda de Força; se falhar, é empurrado até 4,5 m para longe de você.',
      'When you hit with an attack, expend one die and add it to the damage. If the target is Large or smaller, it makes a Strength save; on a failure, you push it up to 15 feet straight away from you.') },
  { id: 'quickToss', name: b('Arremesso Rápido', 'Quick Toss'), source: 'TCE', rules: '2014',
    desc: b("Como uma ação bônus, você pode gastar um dado de superioridade e realizar um ataque à distância com uma arma que possua a propriedade arremesso. Você pode sacar a arma como parte da realização deste ataque. Se acertar, adicione o dado de superioridade à jogada de dano da arma.",
      "As a bonus action, you can expend one superiority die and make a ranged attack with a weapon that has the thrown property. You can draw the weapon as part of making this attack. If you hit, add the superiority die to the weapon’s damage roll.") },
  { id: 'rally', name: b('Reunir', 'Rally'), source: 'PHB24',
    desc: b('Ação bônus: gaste 1 DS; um aliado a até 9 m que veja ou ouça você ganha PV temporários iguais ao DS + metade do seu nível de Guerreiro (arred. para baixo). (2014: DS + mod. de Carisma.)',
      'Bonus Action: expend one die; an ally within 30 feet who can see or hear you gains Temporary Hit Points equal to the die roll plus half your Fighter level (round down). (2014: die + Charisma modifier.)') },
  { id: 'riposte', name: b('Contra-ataque', 'Riposte'), source: 'PHB24',
    desc: b("Quando uma criatura errar você com um ataque corpo a corpo, você pode usar sua reação e gastar um dado de superioridade para realizar um ataque corpo a corpo com arma contra a criatura. Se acertar, você adiciona o dado de superioridade à jogada de dano do ataque.",
      "When a creature misses you with a melee attack, you can use your reaction and expend one superiority die to make a melee weapon attack against the creature. If you hit, you add the superiority die to the attack's damage roll.") },
  { id: 'sweepingAttack', name: b('Ataque Amplo', 'Sweeping Attack'), source: 'PHB24',
    desc: b('Ao acertar um ataque corpo a corpo, gaste 1 DS e escolha outra criatura a até 1,5 m do alvo e dentro do seu alcance. Se a jogada original atingiria essa criatura, ela sofre dano igual ao DS, do mesmo tipo do ataque.',
      'When you hit with a melee attack, expend one die and choose another creature within 5 feet of the target and within your reach. If the original roll would hit it, it takes damage equal to the die, of the same type as the attack.') },
  { id: 'tacticalAssessment', name: b('Avaliação Tática', 'Tactical Assessment'), source: 'PHB24',
    desc: b("Quando você realizar um teste de Inteligência (Investigação), Inteligência (História) ou Sabedoria (Intuição), você pode gastar um dado de superioridade e adicionar o dado de superioridade ao teste de atributo.",
      "When you make an Intelligence (Investigation), an Intelligence (History), or a Wisdom (Insight) check, you can expend one superiority die and add the superiority die to the ability check.") },
  { id: 'tripAttack', name: b('Ataque Derrubador', 'Trip Attack'), source: 'PHB24',
    desc: b("Quando você acertar uma criatura com um ataque com arma, você pode gastar um dado de superioridade para tentar derrubar o alvo. Você adiciona o dado de superioridade à jogada de dano do ataque e, se o alvo for Grande ou menor, ele deve realizar uma salvaguarda de Força. Se fracassar na salvaguarda, você derruba o alvo, deixando-o caído.",
      "When you hit a creature with a weapon attack, you can expend one superiority die to attempt to knock the target down. You add the superiority die to the attack’s damage roll, and if the target is Large or smaller, it must make a Strength saving throw. On a failed save, you knock the target prone.") },
];

// Tiros Arcanos (XGE). Dano extra dobra no nível 18 de Guerreiro. CD = 8 + PB + INT.
const arcaneShots = [
  { id: 'banishingArrow', name: b('Flecha Banidora', 'Banishing Arrow'), source: 'XGE',
    desc: b("Você usa magia de abjuração para tentar banir temporariamente seu alvo para um local inofensivo na Agrestia das Fadas. A criatura atingida pela flecha também deve ser bem-sucedida em uma salvaguarda de Carisma ou será banida. Enquanto estiver banida dessa forma, o deslocamento do alvo é 0 e ele fica incapacitado. No final do próximo turno dele, o alvo reaparece no espaço que desocupou ou no espaço desocupado mais próximo, se aquele espaço estiver ocupado.\n\nDepois que você alcançar o 18º nível nesta classe, um alvo também sofre 2d6 de dano de energia quando a flecha o atingir.",
      "You use abjuration magic to try to temporarily banish your target to a harmless location in the Feywild. The creature hit by the arrow must also succeed on a Charisma saving throw or be banished. While banished in this way, the target’s speed is 0, and it is incapacitated. At the end of its next turn, the target reappears in the space it vacated or in the nearest unoccupied space if that space is occupied.\n\nAfter you reach 18th level in this class, a target also takes 2d6 force damage when the arrow hits it.") },
  { id: 'beguilingArrow', name: b('Flecha Encantadora', 'Beguiling Arrow'), source: 'XGE',
    desc: b("Sua magia de encantamento faz com que esta flecha seduza temporariamente seu alvo. A criatura atingida pela flecha sofre 2d6 de dano psíquico extra, e você escolhe um de seus aliados a até 9 metros do alvo. O alvo deve ser bem-sucedido em uma salvaguarda de Sabedoria ou ficará enfeitiçado pelo aliado escolhido até o início do seu próximo turno. Este efeito termina antecipadamente se o aliado escolhido atacar o alvo enfeitiçado, causar dano a ele ou forçá-lo a realizar uma salvaguarda.\n\nO dano psíquico aumenta para 4d6 quando você alcançar o 18º nível nesta classe.",
      "Your enchantment magic causes this arrow to temporarily beguile its target. The creature hit by the arrow takes an extra 2d6 psychic damage, and choose one of your allies within 30 feet of the target. The target must succeed on a Wisdom saving throw, or it is charmed by the chosen ally until the start of your next turn. This effect ends early if the chosen ally attacks the charmed target, deals damage to it, or forces it to make a saving throw.\n\nThe psychic damage increases to 4d6 when you reach 18th level in this class.") },
  { id: 'burstingArrow', name: b('Flecha Explosiva', 'Bursting Arrow'), source: 'XGE',
    desc: b("Você imbui sua flecha com energia de força extraída da escola de evocação. A energia detona após o seu ataque. Imediatamente após a flecha atingir a criatura, o alvo e todas as outras criaturas a até 3 metros dele sofrem 2d6 de dano de energia cada.\n\nO dano de energia aumenta para 4d6 quando você alcançar o 18º nível nesta classe.",
      "You imbue your arrow with force energy drawn from the school of evocation. The energy detonates after your attack. Immediately after the arrow hits the creature, the target and all other creatures within 10 feet of it take 2d6 force damage each.\n\nThe force damage increases to 4d6 when you reach 18th level in this class.") },
  { id: 'enfeeblingArrow', name: b('Flecha Debilitante', 'Enfeebling Arrow'), source: 'XGE',
    desc: b("Você tece magia necromântica em sua flecha. A criatura atingida pela flecha sofre 2d6 de dano necrótico extra. O alvo também deve ser bem-sucedido em uma salvaguarda de Constituição, ou o dano causado pelos ataques com arma dele é reduzido pela metade até o início do seu próximo turno.\n\nO dano necrótico aumenta para 4d6 quando você alcançar o 18º nível nesta classe.",
      "You weave necromantic magic into your arrow. The creature hit by the arrow takes an extra 2d6 necrotic damage. The target must also succeed on a Constitution saving throw, or the damage dealt by its weapon attacks is halved until the start of your next turn.\n\nThe necrotic damage increases to 4d6 when you reach 18th level in this class.") },
  { id: 'graspingArrow', name: b('Flecha Constritora', 'Grasping Arrow'), source: 'XGE',
    desc: b('Ao acertar, +2d6 de dano de veneno e espinhos envolvem o alvo por 1 minuto: deslocamento −3 m e 2d6 de dano cortante na primeira vez que se mover em cada turno. Sai com teste de Atletismo contra sua CD. 4d6 no nível 18.',
      'On a hit, +2d6 poison damage and brambles wrap the target for 1 minute: Speed −10 feet and 2d6 slashing damage the first time it moves each turn. An Athletics check against your DC removes them. 4d6 at level 18.') },
  { id: 'piercingArrow', name: b('Flecha Perfurante', 'Piercing Arrow'), source: 'XGE',
    desc: b('Sem jogada de ataque: a flecha atravessa uma linha de 9 m × 30 cm, ignorando cobertura. Cada criatura na linha faz salvaguarda de Destreza: dano da flecha +1d6 perfurante, ou metade se passar. 2d6 no nível 18.',
      'No attack roll: the arrow flies in a 30-foot-long, 1-foot-wide line, passing through cover. Each creature in the line makes a Dexterity save: arrow damage +1d6 piercing, or half on a success. 2d6 at level 18.') },
  { id: 'seekingArrow', name: b('Flecha Buscadora', 'Seeking Arrow'), source: 'XGE',
    desc: b('Sem jogada de ataque: escolha uma criatura vista no último minuto; a flecha contorna obstáculos até ela. Salvaguarda de Destreza: dano da flecha +1d6 de energia, ou metade se passar; você descobre onde ela está. 2d6 no nível 18.',
      'No attack roll: choose a creature you have seen in the past minute; the arrow curves around obstacles toward it. Dexterity save: arrow damage +1d6 force, or half on a success; you learn its location. 2d6 at level 18.') },
  { id: 'shadowArrow', name: b('Flecha Sombria', 'Shadow Arrow'), source: 'XGE',
    desc: b("Você tece magia de ilusão em sua flecha, fazendo com que ela oclua a visão do seu inimigo com sombras. A criatura atingida pela flecha sofre 2d6 de dano psíquico extra e deve ser bem-sucedida em uma salvaguarda de Sabedoria ou ficará incapaz de ver qualquer coisa a mais de 1,5 metro de distância até o início do seu próximo turno.\n\nO dano psíquico aumenta para 4d6 quando você alcançar o 18º nível nesta classe.",
      "You weave illusion magic into your arrow, causing it to occlude your foe's vision with shadows. The creature hit by the arrow takes an extra 2d6 psychic damage, and it must succeed on a Wisdom saving throw or be unable to see anything farther than 5 feet away until the start of your next turn.\n\nThe psychic damage increases to 4d6 when you reach 18th level in this class.") },
];

// Runas do Cavaleiro das Runas (TCE). Cada runa conhecida fica num objeto
// diferente; invocar: 1×/descanso curto (2× a partir do nível 15). CD = 8 + PB + CON.
// Cada runa conhecida: 1 invocação por descanso curto (2 a partir do nível 15).
const RUNE_USES = { uses: { byLevel: { 3: 1, 15: 2 } }, recharge: 'short' };
const runes = [
  { id: 'cloudRune', name: b('Runa das Nuvens', 'Cloud Rune'), source: 'TCE',
    desc: b('Passivo: Vantagem em Prestidigitação e Enganação. Invocar (Reação): quando você ou uma criatura a até 9 m é atingida, desvie o ataque para outra criatura a até 9 m (exceto o atacante), usando a mesma jogada.',
      'Passive: Advantage on Sleight of Hand and Deception checks. Invoke (Reaction): when you or a creature within 30 feet is hit, redirect the attack to another creature within 30 feet (not the attacker), using the same roll.') },
  { id: 'fireRune', name: b('Runa do Fogo', 'Fire Rune'), source: 'TCE',
    desc: b('Passivo: dobra o bônus de proficiência em testes com ferramentas. Invocar (ao acertar com arma): +2d6 de fogo e o alvo faz salvaguarda de Força ou fica Impedido por 1 minuto, sofrendo 2d6 de fogo no início de cada turno dele.',
      'Passive: double your proficiency bonus on tool checks. Invoke (on a weapon hit): +2d6 fire damage and the target makes a Strength save or is Restrained for 1 minute, taking 2d6 fire damage at the start of each of its turns.') },
  { id: 'frostRune', name: b('Runa do Gelo', 'Frost Rune'), source: 'TCE',
    desc: b("A magia desta runa evoca o poder daqueles que sobrevivem na natureza invernal, como os gigantes do gelo. Enquanto estiver vestindo ou carregando um objeto inscrito com esta runa, você tem vantagem em testes de Sabedoria (Adestrar Animais) e testes de Carisma (Intimidação).\n\nAlém disso, você pode invocar a runa como uma ação bônus para aumentar sua firmeza. Durante 10 minutos, você ganha um bônus de +2 em todos os testes de atributo e salvaguardas que utilizem Força ou Constituição. Uma vez que invocar esta runa, não poderá fazê-lo novamente até terminar um descanso curto ou longo.",
      "This rune’s magic evokes the might of those who survive in the wintry wilderness, such as frost giants. While wearing or carrying an object inscribed with this rune, you have advantage on Wisdom (Animal Handling) checks and Charisma (Intimidation) checks.\n\nIn addition, you can invoke the rune as a bonus action to increase your sturdiness. For 10 minutes, you gain a +2 bonus to all ability checks and saving throws that use Strength or Constitution. Once you invoke this rune, you can’t do so again until you finish a short or long rest.") },
  { id: 'stoneRune', name: b('Runa da Pedra', 'Stone Rune'), source: 'TCE',
    desc: b('Passivo: Vantagem em Intuição e visão no escuro de 36 m. Invocar (Reação): uma criatura que termina o turno a até 9 m faz salvaguarda de Sabedoria ou fica Enfeitiçada, Incapacitada e com deslocamento 0 por até 1 minuto.',
      'Passive: Advantage on Insight checks and 120-foot darkvision. Invoke (Reaction): a creature ending its turn within 30 feet makes a Wisdom save or is Charmed, Incapacitated, and has Speed 0 for up to 1 minute.') },
  { id: 'hillRune', name: b('Runa da Colina', 'Hill Rune'), source: 'TCE', prereq: { level: 7 },
    desc: b("Pré-requisito: 7º nível\n\nA magia desta runa concede uma resiliência reminiscente de um gigante das colinas. Enquanto estiver vestindo ou carregando um objeto que ostente esta runa, você tem vantagem em salvaguardas contra a condição envenenado e resistência a dano de veneno.\n\nAlém disso, você pode invocar a runa como uma ação bônus, ganhando resistência a dano contundente, perfurante e cortante por 1 minuto. Uma vez que invocar esta runa, não poderá fazê-lo novamente até terminar um descanso curto ou longo.",
      "Prerequisite: 7th level\n\nThis rune’s magic bestows a resilience reminiscent of a hill giant. While wearing or carrying an object that bears this rune, you have advantage on saving throws against being poisoned, and you have resistance against poison damage.\n\nIn addition, you can invoke the rune as a bonus action, gaining resistance to bludgeoning, piercing, and slashing damage for 1 minute. Once you invoke this rune, you can’t do so again until you finish a short or long rest.") },
  { id: 'stormRune', name: b('Runa da Tempestade', 'Storm Rune'), source: 'TCE', prereq: { level: 7 },
    desc: b('Passivo: Vantagem em Arcanismo e você não pode ser surpreendido enquanto não estiver Incapacitado. Invocar (ação bônus): por 1 minuto, com sua Reação dá Vantagem ou Desvantagem a uma jogada de ataque, teste ou salvaguarda de uma criatura a até 18 m.',
      "Passive: Advantage on Arcana checks and you can't be surprised while not Incapacitated. Invoke (Bonus Action): for 1 minute, use your Reaction to give Advantage or Disadvantage to an attack roll, check, or save of a creature within 60 feet.") },
];

// Subclasses de suplemento: mesmas escolhas em 2014 e 2024.
const SUPPLEMENT_CHOICES = {
  arcanearcher: {
    3: { arcaneShot: 2, arcaneArcherSkill: 1, arcaneArcherCantrip: 1 },
    7: { arcaneShot: 1 }, 10: { arcaneShot: 1 }, 15: { arcaneShot: 1 }, 18: { arcaneShot: 1 },
  },
  runeknight: { 3: { rune: 2 }, 7: { rune: 1 }, 10: { rune: 1 }, 15: { rune: 1 } },
  cavalier: { 3: { cavalierProficiency: 1 } },
  samurai: { 3: { samuraiProficiency: 1 }, 7: { samuraiSave: 1 } },
  banneret: { 7: { royalEnvoy: 1 } },
};

export default {
  classId: 'fighter',

  pools: {
    // Estilo de Luta 2024: pode trocar o talento a cada nível de Guerreiro.
    // Técnica Superior (TCE): a manobra vem do pool `maneuver` (1 vaga) e o dado d6 vira recurso.
    fightingStyle: {
      ...SHARED.fightingStyle, swapOnLevelUp: 1,
      options: SHARED.fightingStyle.options.map(o => (o.id === 'superiorTechnique' ? {
        ...o, choices: { maneuver: 1 },
        resource: { uses: { fixed: 1 }, recharge: 'short', die: { byLevel: { 1: 'd6' } } },
      } : o)),
    },
    weaponMastery: SHARED.weaponMastery,
    maneuver: {
      name: b('Manobras', 'Maneuvers'),
      swapOnLevelUp: 1, swapLevels: [3, 7, 10, 15], // troca 1 ao aprender manobras novas
      options: maneuvers,
    },
    studentOfWarTool: {
      name: b('Estudante da Guerra: ferramenta', 'Student of War: tool'),
      options: ARTISAN_TOOLS,
    },
    studentOfWarSkill: {
      name: b('Estudante da Guerra: perícia', 'Student of War: skill'),
      kind: 'skill', grantAs: 'skill',
      filter: { from: FIGHTER_SKILLS },
    },
    arcaneShot: {
      name: b('Tiros Arcanos', 'Arcane Shot Options'),
      options: arcaneShots,
    },
    arcaneArcherSkill: {
      name: b('Saber do Arqueiro Arcano: perícia', 'Arcane Archer Lore: skill'),
      kind: 'skill', grantAs: 'skill',
      filter: { from: ['arcana', 'nature'] },
    },
    arcaneArcherCantrip: {
      name: b('Saber do Arqueiro Arcano: truque', 'Arcane Archer Lore: cantrip'),
      options: [
        { id: 'prestidigitation', name: b('Prestidigitação', 'Prestidigitation'), source: 'XGE',
          desc: b("Esta magia é um pequeno truque mágico que conjuradores novatos usam para praticar. Você cria um dos seguintes efeitos mágicos dentro do alcance:\n\n• Você cria um efeito sensorial instantâneo e inofensivo, como uma chuva de faíscas, uma lufada de vento, notas musicais suaves ou um odor estranho.\n\n• Você acende ou apaga instantaneamente uma vela, uma tocha ou uma pequena fogueira.\n\n• Você limpa ou suja instantaneamente um objeto que não seja maior do que um cubo de 30 centímetros.\n\n• Você resfria, aquece ou tempera até 0,03 metro cúbico de material inanimado por 1 hora.\n\n• Você faz surgir uma cor, uma pequena marca ou um símbolo em um objeto ou superfície por 1 hora.\n\n• Você cria uma bugiganga não mágica ou uma imagem ilusória que caiba na sua mão e que dura até o final do seu próximo turno.\n\nSe conjurar esta magia várias vezes, você pode ter até três dos seus efeitos não instantâneos ativos simultaneamente, e pode dissipar tal efeito com uma ação.", "This spell is a minor magical trick that novice spellcasters use for practice. You create one of the following magical effects within range:\n\n• You create an instantaneous, harmless sensory effect, such as a shower of sparks, a puff of wind, faint musical notes, or an odd odor.\n\n• You instantaneously light or snuff out a candle, a torch, or a small campfire.\n\n• You instantaneously clean or soil an object no larger than 1 cubic foot.\n\n• You chill, warm, or flavor up to 1 cubic foot of nonliving material for 1 hour.\n\n• You make a color, a small mark, or a symbol appear on an object or a surface for 1 hour.\n\n• You create a nonmagical trinket or an illusory image that can fit in your hand and that lasts until the end of your next turn.\n\nIf you cast this spell multiple times, you can have up to three of its non-instantaneous effects active at a time, and you can dismiss such an effect as an action."), grants: { cantrips: ['prestidigitation'] } },
        { id: 'druidcraft', name: b('Arte Druídica', 'Druidcraft'), source: 'XGE',
          desc: b("Sussurrando para os espíritos da natureza, você cria um dos seguintes efeitos dentro do alcance:\n\n• Você cria um efeito sensorial minúsculo e inofensivo que prevê como estará o clima em sua localização nas próximas 24 horas. O efeito pode se manifestar como uma orbe dourada para céu limpo, uma nuvem para chuva, flocos de neve caindo para neve, e assim por diante. Esse efeito persiste por 1 rodada.\n\n• Você faz instantaneamente uma flor desabrochar, uma vagem de sementes se abrir ou um broto foliar florescer.\n\n• Você cria um efeito sensorial instantâneo e inofensivo, como folhas caindo, uma lufada de vento, o som de um pequeno animal ou o odor suave de um gambá. O efeito deve caber em um cubo de 1,5 metro.\n\n• Você acende ou apaga instantaneamente uma vela, uma tocha ou uma pequena fogueira.", "Whispering to the spirits of nature, you create one of the following effects within range:\n\n• You create a tiny, harmless sensory effect that predicts what the weather will be at your location for the next 24 hours. The effect might manifest as a golden orb for clear skies, a cloud for rain, falling snowflakes for snow, and so on. This effect persists for 1 round.\n\n• You instantly make a flower blossom, a seed pod open, or a leaf bud bloom.\n\n• You create an instantaneous, harmless sensory effect, such as falling leaves, a puff of wind, the sound of a small animal, or the faint odor of skunk. The effect must fit in a 5-foot cube.\n\n• You instantly light or snuff out a candle, a torch, or a small campfire."), grants: { cantrips: ['druidcraft'] } },
      ],
    },
    rune: {
      name: b('Runas', 'Runes'),
      swapOnLevelUp: 1, // pode trocar 1 runa a cada nível de Guerreiro
      options: runes.map(r => ({ ...r, resource: RUNE_USES })),
    },
    cavalierProficiency: {
      name: b('Cavaleiro: proficiência bônus', 'Cavalier: bonus proficiency'),
      options: [...['animalHandling', 'history', 'insight', 'performance', 'persuasion'].map(id => skillOption(id, 'XGE')), languageOption('XGE', 'cavalierLanguage')],
    },
    cavalierLanguage: languagePool('Cavaleiro: idioma', 'Cavalier: language'),
    samuraiProficiency: {
      name: b('Samurai: proficiência bônus', 'Samurai: bonus proficiency'),
      options: [...['history', 'insight', 'performance', 'persuasion'].map(id => skillOption(id, 'XGE')), languageOption('XGE', 'samuraiLanguage')],
    },
    samuraiLanguage: languagePool('Samurai: idioma', 'Samurai: language'),
    samuraiSave: {
      name: b('Cortesão Elegante: salvaguarda', 'Elegant Courtier: saving throw'),
      options: [
        { id: 'wis', name: b('Sabedoria', 'Wisdom'), source: 'XGE',
          desc: b('Proficiência em salvaguardas de Sabedoria.', 'Proficiency in Wisdom saving throws.'), grants: { saves: ['wis'] } },
        ...[['int', 'Inteligência', 'Intelligence'], ['cha', 'Carisma', 'Charisma']].map(([id, pt, en]) => ({
          id, name: b(pt, en), source: 'XGE',
          desc: b(`Proficiência em salvaguardas de ${pt}, se já tiver a de Sabedoria.`, `Proficiency in ${en} saving throws, if you already have Wisdom.`),
          prereq: { text: b('Já ter proficiência em salvaguardas de Sabedoria', 'Already proficient in Wisdom saving throws') },
          grants: { saves: [id] },
        })),
      ],
    },
    royalEnvoy: {
      name: b('Enviado Real: perícia', 'Royal Envoy: skill'),
      options: [
        { id: 'persuasion', name: b('Persuasão', 'Persuasion'), source: 'SCAG',
          desc: b('Proficiência em Persuasão, com bônus de proficiência dobrado.', 'Proficiency in Persuasion, with double proficiency bonus.'),
          grants: { skills: ['persuasion'], expertise: ['persuasion'] } },
        ...['animalHandling', 'insight', 'intimidation', 'performance'].map(id => ({
          id, name: SKILL_NAMES[id], source: 'SCAG',
          desc: b(`Se já tiver Persuasão: proficiência em ${SKILL_NAMES[id].pt} e bônus dobrado em Persuasão.`, `If you already have Persuasion: proficiency in ${SKILL_NAMES[id].en} and double bonus on Persuasion.`),
          prereq: { text: b('Já ter proficiência em Persuasão', 'Already proficient in Persuasion') },
          grants: { skills: [id], expertise: ['persuasion'] },
        })),
      ],
    },
    // Cavaleiro Infernal (UA): Dádiva Diabólica dá uma destas perícias.
    hellKnightSkill: {
      name: b('Dádiva Diabólica: perícia', 'Diabolical Gift: skill'),
      kind: 'skill', grantAs: 'skill',
      filter: { from: ['deception', 'performance', 'sleightOfHand'] },
    },
  },

  // Maestria: 3 / 4 / 5 / 6 tipos de arma nos níveis 1 / 4 / 10 / 16.
  choices: {
    1: { fightingStyle: 1, weaponMastery: 3 },
    4: { weaponMastery: 1 },
    10: { weaponMastery: 1 },
    16: { weaponMastery: 1 },
  },
  // 2014: Estilo de Luta no nível 1; sem Maestria em Armas.
  legacyChoices: {
    1: { fightingStyle: 1 },
  },
  // Fichas 2024.
  subclassChoices: {
    champion: { 7: { fightingStyle: 1 } },
    battlemaster: { 3: { maneuver: 3, studentOfWarTool: 1, studentOfWarSkill: 1 }, 7: { maneuver: 2 }, 10: { maneuver: 2 }, 15: { maneuver: 2 } },
    ...SUPPLEMENT_CHOICES,
    hellknight: { 3: { hellKnightSkill: 1 } }, // UA para regras 2024: só fichas 2024
  },
  // Fichas 2014: Estilo Adicional do Campeão no nível 10; Estudante da Guerra só dá ferramenta.
  legacySubclassChoices: {
    champion: { 10: { fightingStyle: 1 } },
    battlemaster: { 3: { maneuver: 3, studentOfWarTool: 1 }, 7: { maneuver: 2 }, 10: { maneuver: 2 }, 15: { maneuver: 2 } },
    ...SUPPLEMENT_CHOICES,
  },

  // Recursos com usos (sem espaços de magia). Níveis = nível na classe.
  resources: [
    { id: 'secondWind', name: b('Retomar o Fôlego', 'Second Wind'), rules: '2024',
      desc: b('Cura 1d10 + nível de Guerreiro; também alimenta Mente Tática.', 'Heal 1d10 + Fighter level; also fuels Tactical Mind.'),
      uses: { byLevel: { 1: 2, 4: 3, 10: 4 } }, recharge: 'long', shortRestRegain: 1 },
    { id: 'secondWind2014', name: b('Retomar o Fôlego', 'Second Wind'), rules: '2014',
      desc: b('Cura 1d10 + nível de Guerreiro.', 'Heal 1d10 + Fighter level.'),
      uses: { fixed: 1 }, recharge: 'short' },
    { id: 'actionSurge', name: b('Surto de Ação', 'Action Surge'),
      desc: b('No máximo 1 por turno.', 'At most once per turn.'),
      uses: { byLevel: { 2: 1, 17: 2 } }, recharge: 'short' },
    { id: 'indomitable', name: b('Indomável', 'Indomitable'),
      uses: { byLevel: { 9: 1, 13: 2, 17: 3 } }, recharge: 'long' },

    // Mestre de Batalha
    { id: 'superiorityDice', name: b('Dados de Superioridade', 'Superiority Dice'), subclass: ['battlemaster'],
      uses: { byLevel: { 3: 4, 7: 5, 15: 6 } }, recharge: 'short', die: { byLevel: { 3: 'd8', 10: 'd10', 18: 'd12' } } },
    { id: 'knowYourEnemy', name: b('Conheça seu Inimigo', 'Know Your Enemy'), subclass: ['battlemaster'], rules: '2024',
      desc: b('Ou gaste 1 dado de superioridade para usar de novo.', 'Or expend a superiority die to use it again.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 7 },

    // Guerreiro Psiônico
    { id: 'psionicEnergy', name: b('Dados de Energia Psiônica', 'Psionic Energy Dice'), subclass: ['psiwarrior'], rules: '2024',
      uses: { byLevel: { 3: 4, 5: 6, 9: 8, 13: 10, 17: 12 } }, recharge: 'long', shortRestRegain: 1,
      die: { byLevel: { 3: 'd6', 5: 'd8', 11: 'd10', 17: 'd12' } } },
    { id: 'psionicEnergy2014', name: b('Dados de Energia Psiônica', 'Psionic Energy Dice'), subclass: ['psiwarrior'], rules: '2014',
      desc: b('2 × bônus de proficiência.', '2 × proficiency bonus.'),
      uses: { byLevel: { 3: 4, 5: 6, 9: 8, 13: 10, 17: 12 } }, recharge: 'long',
      die: { byLevel: { 3: 'd6', 5: 'd8', 11: 'd10', 17: 'd12' } } },
    { id: 'psionicRecovery', name: b('Recuperar Energia Psiônica', 'Regain Psionic Energy'), subclass: ['psiwarrior'], rules: '2014',
      desc: b('Ação bônus: recupera 1 dado psiônico.', 'Bonus Action: regain one Psionic Energy Die.'),
      uses: { fixed: 1 }, recharge: 'short' },
    { id: 'telekineticMovement', name: b('Movimento Telecinético', 'Telekinetic Movement'), subclass: ['psiwarrior'],
      desc: b('Ou gaste 1 dado psiônico.', 'Or expend a Psionic Energy Die.'), uses: { fixed: 1 }, recharge: 'short' },
    { id: 'psiPoweredLeap', name: b('Salto Psiônico', 'Psi-Powered Leap'), subclass: ['psiwarrior'],
      desc: b('Ou gaste 1 dado psiônico.', 'Or expend a Psionic Energy Die.'), uses: { fixed: 1 }, recharge: 'short', minLevel: 7 },
    { id: 'bulwarkOfForce', name: b('Baluarte de Força', 'Bulwark of Force'), subclass: ['psiwarrior'],
      desc: b('Ou gaste 1 dado psiônico.', 'Or expend a Psionic Energy Die.'), uses: { fixed: 1 }, recharge: 'long', minLevel: 15 },
    { id: 'telekineticMaster', name: b('Mestre Telecinético', 'Telekinetic Master'), subclass: ['psiwarrior'],
      desc: b('Telecinésia sem espaço; ou gaste 1 dado psiônico.', 'Telekinesis without a slot; or expend a Psionic Energy Die.'),
      uses: { fixed: 1 }, recharge: 'long', minLevel: 18 },

    // Cavaleiro das Runas (usos de cada runa ficam na própria opção do pool `rune`)
    { id: 'giantsMight', name: b('Poder dos Gigantes', "Giant's Might"), subclass: ['runeknight'],
      uses: { profBonus: true }, recharge: 'long', die: { byLevel: { 3: 'd6', 10: 'd8', 18: 'd10' } } },
    { id: 'runicShield', name: b('Escudo Rúnico', 'Runic Shield'), subclass: ['runeknight'],
      uses: { profBonus: true }, recharge: 'long', minLevel: 7 },

    // Arqueiro Arcano
    { id: 'arcaneShot', name: b('Tiro Arcano', 'Arcane Shot'), subclass: ['arcanearcher'],
      desc: b('No máximo 1 por turno.', 'At most once per turn.'), uses: { fixed: 2 }, recharge: 'short' },

    // Cavaleiro
    { id: 'unwaveringMark', name: b('Marca Inabalável (ataque bônus)', 'Unwavering Mark (bonus attack)'), subclass: ['cavalier'],
      uses: { ability: 'str', min: 1 }, recharge: 'long' },
    { id: 'wardingManeuver', name: b('Manobra de Proteção', 'Warding Maneuver'), subclass: ['cavalier'],
      uses: { ability: 'con', min: 1 }, recharge: 'long', minLevel: 7, die: { byLevel: { 7: 'd8' } } },

    // Samurai
    { id: 'fightingSpirit', name: b('Espírito de Luta', 'Fighting Spirit'), subclass: ['samurai'],
      uses: { fixed: 3 }, recharge: 'long' },
    { id: 'strengthBeforeDeath', name: b('Força Antes da Morte', 'Strength Before Death'), subclass: ['samurai'],
      uses: { fixed: 1 }, recharge: 'long', minLevel: 18 },

    // Cavaleiro do Eco
    { id: 'unleashIncarnation', name: b('Liberar Encarnação', 'Unleash Incarnation'), subclass: ['echoknight'],
      uses: { ability: 'con', min: 1 }, recharge: 'long' },
    { id: 'shadowMartyr', name: b('Mártir Sombrio', 'Shadow Martyr'), subclass: ['echoknight'],
      uses: { fixed: 1 }, recharge: 'short', minLevel: 10 },
    { id: 'reclaimPotential', name: b('Recuperar Potencial', 'Reclaim Potential'), subclass: ['echoknight'],
      uses: { ability: 'con', min: 1 }, recharge: 'long', minLevel: 15 },

    // Cavaleiro Infernal (UA, só regras 2024)
    { id: 'infernalWound', name: b('Ferida Infernal', 'Infernal Wound'), subclass: ['hellknight'], rules: '2024',
      desc: b('Dano extra + ferida que repete o dano; a partir do nível 7, um 1 no dado conta como 6.', 'Extra damage + a wound that repeats it; from level 7, a 1 on the die counts as a 6.'),
      uses: { ability: 'con', min: 1 }, recharge: 'short', minLevel: 3, die: { byLevel: { 3: 'd6' } } },
  ],

  // Traços da classe base 2024 (SRD 5.2.1).
  features: {
    1: [
      f('fightingStyle', 'Estilo de Luta', 'Fighting Style',
        "Você aprimorou sua destreza marcial e ganha um talento de Estilo de Luta à sua escolha (veja \"Talentos\"). Defesa é recomendada.\n\nSempre que você ganha um nível de Guerreiro, pode substituir o talento escolhido por um talento de Estilo de Luta diferente.",
        "You have honed your martial prowess and gain a Fighting Style feat of your choice (see \"Feats\"). Defense is recommended.\n\nWhenever you gain a Fighter level, you can replace the feat you chose with a different Fighting Style feat."),
      f('secondWind', 'Retomar o Fôlego', 'Second Wind',
        "Você tem uma reserva limitada de vigor físico e mental da qual pode se valer. Como uma Ação Bônus, você pode usá-la para recuperar Pontos de Vida iguais a 1d10 mais o seu nível de Guerreiro.\n\nVocê pode usar esta característica duas vezes. Você recupera um uso gasto ao terminar um Descanso Curto e recupera todos os usos gastos ao terminar um Descanso Longo.\n\nAo atingir determinados níveis de Guerreiro, você ganha mais usos desta característica, conforme mostrado na coluna Retomar o Fôlego da tabela Características de Guerreiro.",
        "You have a limited well of physical and mental stamina that you can draw on. As a Bonus Action, you can use it to regain Hit Points equal to 1d10 plus your Fighter level.\n\nYou can use this feature twice. You regain one expended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest.\n\nWhen you reach certain Fighter levels, you gain more uses of this feature, as shown in the Second Wind column of the Fighter Features table."),
      f('weaponMastery', 'Maestria em Armas', 'Weapon Mastery',
        "Seu treinamento com armas permite que você use as propriedades de maestria de três tipos de armas Simples ou Marciais à sua escolha. Sempre que terminar um Descanso Longo, você pode praticar exercícios com armas e trocar uma dessas escolhas de arma.\n\nAo atingir determinados níveis de Guerreiro, você adquire a habilidade de usar as propriedades de maestria de mais tipos de armas, conforme mostrado na coluna Maestria em Armas da tabela Características de Guerreiro.",
        "Your training with weapons allows you to use the mastery properties of three kinds of Simple or Martial weapons of your choice. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices.\n\nWhen you reach certain Fighter levels, you gain the ability to use the mastery properties of more kinds of weapons, as shown in the Weapon Mastery column of the Fighter Features table."),
    ],
    2: [
      f('actionSurgeOneUse', 'Surto de Ação', 'Action Surge',
        "Você pode ir além de seus limites normais por um instante. No seu turno, você pode realizar uma ação adicional, exceto a ação Mágica.\n\nDepois de usar esta característica, você não pode fazê-lo novamente até terminar um Descanso Curto ou Longo. A partir do nível 17, você pode usá-la duas vezes antes de um descanso, mas apenas uma vez por turno.",
        "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action, except the Magic action.\n\nOnce you use this feature, you can't do so again until you finish a Short or Long Rest. Starting at level 17, you can use it twice before a rest but only once on a turn."),
      f('tacticalMind', 'Mente Tática', 'Tactical Mind',
        "Você tem mente tática dentro e fora do campo de batalha. Ao falhar em um teste de atributo, você pode gastar um uso de Retomar o Fôlego para impulsionar a si mesmo em direção ao sucesso. Em vez de recuperar Pontos de Vida, você rola 1d10 e adiciona o número rolado ao teste de atributo, potencialmente transformando-o em sucesso. Se o teste ainda assim falhar, esse uso de Retomar o Fôlego não é gasto.",
        "You have a mind for tactics on and off the battlefield. When you fail an ability check, you can expend a use of your Second Wind to push yourself toward success. Rather than regaining Hit Points, you roll 1d10 and add the number rolled to the ability check, potentially turning it into a success. If the check still fails, this use of Second Wind isn't expended."),
    ],
    3: [
      f('fighterSubclass', 'Subclasse de Guerreiro', 'Fighter Subclass',
        "Você ganha uma subclasse de Guerreiro à sua escolha. A subclasse Campeão é detalhada após a descrição desta classe. Uma subclasse é uma especialização que concede características a você em determinados níveis de Guerreiro. Pelo restante da sua carreira, você ganha cada uma das características da sua subclasse que sejam de seu nível de Guerreiro ou inferior.",
        "You gain a Fighter subclass of your choice. The Champion subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Fighter levels. For the rest of your career, you gain each of your subclass's features that are of your Fighter level or lower."),
    ],
    4: [f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement', "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Guerreiro 6, 8, 12, 14 e 16.", "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Fighter levels 6, 8, 12, 14, and 16.")],
    5: [
      f('extraAttack', 'Ataque Extra', 'Extra Attack',
        'Você ataca duas vezes, em vez de uma, sempre que realiza a ação Atacar no seu turno.',
        'You can attack twice instead of once whenever you take the Attack action on your turn.'),
      f('tacticalShift', 'Deslocamento Tático', 'Tactical Shift',
        "Sempre que ativar seu Retomar o Fôlego com uma Ação Bônus, você pode se mover até metade do seu Deslocamento sem provocar Ataques de Oportunidade.",
        "Whenever you activate your Second Wind with a Bonus Action, you can move up to half your Speed without provoking Opportunity Attacks."),
    ],
    6: [f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement', "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Guerreiro 6, 8, 12, 14 e 16.", "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Fighter levels 6, 8, 12, 14, and 16.")],
    8: [f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement', "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Guerreiro 6, 8, 12, 14 e 16.", "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Fighter levels 6, 8, 12, 14, and 16.")],
    9: [
      f('indomitableOneUse', 'Indomável', 'Indomitable',
        "Se falhar em uma salvaguarda, você pode jogá-la novamente com um bônus igual ao seu nível de Guerreiro. Você deve usar a nova jogada, e não pode usar esta característica novamente até terminar um Descanso Longo.\n\nVocê pode usar esta característica duas vezes antes de um Descanso Longo a partir do nível 13 e três vezes antes de um Descanso Longo a partir do nível 17.",
        "If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll, and you can't use this feature again until you finish a Long Rest.\n\nYou can use this feature twice before a Long Rest starting at level 13 and three times before a Long Rest starting at level 17."),
      f('tacticalMaster', 'Mestre Tático', 'Tactical Master',
        'Ao atacar com uma arma cuja propriedade de maestria você pode usar, pode trocá-la por Empurrar, Minar ou Lentidão (Push, Sap ou Slow) naquele ataque.',
        'When you attack with a weapon whose mastery property you can use, you can replace that property with the Push, Sap, or Slow property for that attack.'),
    ],
    11: [
      f('twoExtraAttacks', 'Dois Ataques Extras', 'Two Extra Attacks',
        'Você ataca três vezes, em vez de uma, sempre que realiza a ação Atacar no seu turno.',
        'You can attack three times instead of once whenever you take the Attack action on your turn.'),
    ],
    12: [f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement', "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Guerreiro 6, 8, 12, 14 e 16.", "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Fighter levels 6, 8, 12, 14, and 16.")],
    13: [
      f('indomitableTwoUses', 'Indomável (2 usos)', 'Indomitable (two uses)',
        "Se falhar em uma salvaguarda, você pode jogá-la novamente com um bônus igual ao seu nível de Guerreiro. Você deve usar a nova jogada, e não pode usar esta característica novamente até terminar um Descanso Longo.\n\nVocê pode usar esta característica duas vezes antes de um Descanso Longo a partir do nível 13 e três vezes antes de um Descanso Longo a partir do nível 17.",
        "If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll, and you can't use this feature again until you finish a Long Rest.\n\nYou can use this feature twice before a Long Rest starting at level 13 and three times before a Long Rest starting at level 17."),
      f('studiedAttacks', 'Ataques Estudados', 'Studied Attacks',
        "Você estuda seus oponentes e aprende com cada ataque que realiza. Se fizer uma jogada de ataque contra uma criatura e errar, você terá Vantagem na sua próxima jogada de ataque contra essa criatura antes do final do seu próximo turno.",
        "You study your opponents and learn from each attack you make. If you make an attack roll against a creature and miss, you have Advantage on your next attack roll against that creature before the end of your next turn."),
    ],
    14: [f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement', "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Guerreiro 6, 8, 12, 14 e 16.", "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Fighter levels 6, 8, 12, 14, and 16.")],
    16: [f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement', "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Guerreiro 6, 8, 12, 14 e 16.", "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Fighter levels 6, 8, 12, 14, and 16.")],
    17: [
      f('actionSurgeTwoUses', 'Surto de Ação (2 usos)', 'Action Surge (two uses)',
        "Você pode ir além de seus limites normais por um instante. No seu turno, você pode realizar uma ação adicional, exceto a ação Mágica.\n\nDepois de usar esta característica, você não pode fazê-lo novamente até terminar um Descanso Curto ou Longo. A partir do nível 17, você pode usá-la duas vezes antes de um descanso, mas apenas uma vez por turno.",
        "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action, except the Magic action.\n\nOnce you use this feature, you can't do so again until you finish a Short or Long Rest. Starting at level 17, you can use it twice before a rest but only once on a turn."),
      f('indomitableThreeUses', 'Indomável (3 usos)', 'Indomitable (three uses)',
        "Se falhar em uma salvaguarda, você pode jogá-la novamente com um bônus igual ao seu nível de Guerreiro. Você deve usar a nova jogada, e não pode usar esta característica novamente até terminar um Descanso Longo.\n\nVocê pode usar esta característica duas vezes antes de um Descanso Longo a partir do nível 13 e três vezes antes de um Descanso Longo a partir do nível 17.",
        "If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level. You must use the new roll, and you can't use this feature again until you finish a Long Rest.\n\nYou can use this feature twice before a Long Rest starting at level 13 and three times before a Long Rest starting at level 17."),
    ],
    19: [
      f('epicBoon', 'Dádiva Épica', 'Epic Boon',
        "Você ganha um talento de Dádiva Épica (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Dádiva da Proeza em Combate é recomendada.",
        "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Combat Prowess is recommended."),
    ],
    20: [
      f('threeExtraAttacks', 'Três Ataques Extras', 'Three Extra Attacks',
        'Você ataca quatro vezes, em vez de uma, sempre que realiza a ação Atacar no seu turno.',
        'You can attack four times instead of once whenever you take the Attack action on your turn.'),
    ],
  },

  subclasses: {
    // ----- PHB 2024 / SRD -----
    champion: {
      name: b('Campeão', 'Champion'), source: 'SRD',
      desc: b('Busca a excelência física em combate: críticos mais frequentes, atletismo e resistência.', 'Pursues physical excellence in combat: more critical hits, athleticism, and resilience.'),
      levels: {
        3: { features: [
          f('improvedCritical', 'Crítico Aprimorado', 'Improved Critical',
            'Suas jogadas de ataque com armas e Ataques Desarmados conseguem Acerto Crítico com 19 ou 20 no d20.',
            'Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20.'),
          f('remarkableAthlete', 'Atleta Notável', 'Remarkable Athlete',
            "Graças ao seu atletismo, você tem Vantagem em rolagens de Iniciativa e testes de Força (Atletismo).\n\nAlém disso, imediatamente após obter um Acerto Crítico, você pode mover-se até metade do seu Deslocamento sem provocar Ataques de Oportunidade.",
            "Thanks to your athleticism, you have Advantage on Initiative rolls and Strength (Athletics) checks.\n\nIn addition, immediately after you score a Critical Hit, you can move up to half your Speed without provoking Opportunity Attacks."),
        ] },
        7: { features: [
          f('additionalFightingStyle', 'Estilo de Luta Adicional', 'Additional Fighting Style',
            'Você ganha outro talento de Estilo de Luta à sua escolha.',
            'You gain another Fighting Style feat of your choice.'),
        ] },
        10: { features: [
          f('heroicWarrior', 'Guerreiro Heroico', 'Heroic Warrior',
            "A emoção da batalha impulsiona você em direção à vitória. Durante o combate, você pode conceder Inspiração Heroica a si mesmo sempre que iniciar seu turno sem ela.",
            "The thrill of battle drives you toward victory. During combat, you can give yourself Heroic Inspiration whenever you start your turn without it."),
        ] },
        15: { features: [
          f('superiorCritical', 'Crítico Superior', 'Superior Critical',
            'Suas jogadas de ataque com armas e Ataques Desarmados agora conseguem Acerto Crítico com 18–20 no d20.',
            'Your attack rolls with weapons and Unarmed Strikes can now score a Critical Hit on a roll of 18–20 on the d20.'),
        ] },
        18: { features: [
          f('survivor', 'Sobrevivente', 'Survivor',
            'Desafiar a Morte: Vantagem em salvaguardas contra a morte, e um 18–20 nelas conta como 20. Recuperação Heroica: no início de cada turno, se estiver Sangrando e com ao menos 1 PV, recupera 5 + modificador de Constituição PV.',
            'Defy Death: Advantage on Death Saving Throws, and a roll of 18–20 counts as a 20. Heroic Rally: at the start of each of your turns, regain 5 + your Constitution modifier Hit Points if you are Bloodied and have at least 1 Hit Point.'),
        ] },
      },
    },

    battlemaster: {
      name: b('Mestre de Batalha', 'Battle Master'), source: 'PHB24',
      desc: b('Estrategista que usa manobras alimentadas por dados de superioridade.', 'A tactician who fuels combat maneuvers with superiority dice.'),
      levels: {
        3: { features: [
          f('combatSuperiority', 'Superioridade em Combate', 'Combat Superiority',
            'Você aprende 3 manobras e tem 4 dados de superioridade (d8), recuperados num descanso curto ou longo. Use no máximo uma manobra por ataque. CD = 8 + PB + mod. de Força ou Destreza (à sua escolha). Mais manobras nos níveis 7, 10 e 15, trocando uma a cada vez; 5 dados no nível 7 e 6 no 15.',
            'You learn 3 maneuvers and have 4 superiority dice (d8), regained on a Short or Long Rest. Use at most one maneuver per attack. DC = 8 + PB + Strength or Dexterity modifier (your choice). More maneuvers at levels 7, 10, and 15, swapping one each time; 5 dice at level 7 and 6 at 15.'),
          f('studentOfWar', 'Estudante da Guerra', 'Student of War',
            'Você ganha proficiência com um tipo de ferramenta de artesão e em uma perícia da lista do Guerreiro, à sua escolha.',
            "You gain proficiency with one type of Artisan's Tools and in one skill of your choice from the Fighter's skill list."),
        ] },
        7: { features: [
          f('knowYourEnemy', 'Conheça seu Inimigo', 'Know Your Enemy',
            "A partir do 7º nível, se você passar pelo menos 1 minuto observando ou interagindo com outra criatura fora de combate, poderá descobrir certas informações sobre as capacidades dela em comparação com as suas. O Mestre informa se a criatura é igual, superior ou inferior a você em relação a duas das seguintes características à sua escolha:\n\n• Valor de Força\n\n• Valor de Destreza\n\n• Valor de Constituição\n\n• Classe de Armadura\n\n• Pontos de Vida atuais\n\n• Níveis totais de classe (se houver)\n\n• Níveis na classe guerreiro (se houver)",
            "Starting at 7th level, if you spend at least 1 minute observing or interacting with another creature outside combat, you can learn certain information about its capabilities compared to your own. The DM tells you if the creature is your equal, superior, or inferior in regard to two of the following characteristics of your choice:\n\n• Strength score\n\n• Dexterity score\n\n• Constitution score\n\n• Armor Class\n\n• Current hit points\n\n• Total class levels (if any)\n\n• Fighter class levels (if any)"),
        ] },
        10: { features: [
          f('improvedCombatSuperiority', 'Superioridade em Combate Aprimorada', 'Improved Combat Superiority',
            "Seu Dado de Superioridade se torna um d10.",
            "You r Superior ity Die becomes a dl 0 ."),
        ] },
        15: { features: [
          f('relentless', 'Implacável', 'Relentless',
            'Uma vez por turno, ao usar uma manobra, você pode rolar 1d8 e usar esse resultado em vez de gastar um dado de superioridade. Você passa a ter 6 dados de superioridade.',
            'Once per turn, when you use a maneuver, you can roll 1d8 and use it instead of expending a superiority die. You now have 6 superiority dice.'),
        ] },
        18: { features: [
          f('ultimateCombatSuperiority', 'Superioridade em Combate Suprema', 'Ultimate Combat Superiority',
            "Seu Dado de Superioridade torna-se 1d12.",
            "Your Superiority Die becomes a d12."),
        ] },
      },
    },

    eldritchknight: {
      name: b('Cavaleiro Arcano', 'Eldritch Knight'), source: 'PHB24',
      desc: b('Combina esgrima com magia arcana de mago, conjurando com Inteligência.', 'Blends martial skill with arcane Wizard magic, casting with Intelligence.'),
      // Contadores de conjurador 1/3 (truques e magias) mantidos da versão atual.
      levels: {
        3: { spellsKnown: 3, cantripsKnown: 2, features: [
          f('spellcasting', 'Conjuração', 'Spellcasting',
            'Você conjura magias da lista do Mago usando Inteligência, com foco arcano. Começa com 2 truques e 3 magias de 1º círculo preparadas (tabela do Cavaleiro Arcano). A cada nível de Guerreiro, pode trocar 1 truque e 1 magia preparada. Sugestões: Raio de Gelo, Toque Chocante, Mãos Flamejantes, Salto e Escudo Arcano.',
            'You cast spells from the Wizard list using Intelligence, with an Arcane Focus. You start with 2 cantrips and 3 level 1 spells prepared (Eldritch Knight table). Each Fighter level, you can swap 1 cantrip and 1 prepared spell. Suggested: Ray of Frost, Shocking Grasp, Burning Hands, Jump, and Shield.'),
          f('warBond', 'Vínculo de Guerra', 'War Bond',
            "Você aprende um ritual que cria um vínculo mágico entre você e uma arma. Você realiza o ritual ao longo de 1 hora, o que pode ser feito durante um Descanso Curto. A arma deve estar ao seu alcance durante todo o ritual, ao final do qual você toca a arma e forja o vínculo. O vínculo falha se outro Guerreiro estiver vinculado à arma ou se a arma for um item mágico ao qual outra pessoa esteja sintonizada.\n\nDepois de ter vinculado uma arma a si mesmo, você não pode ser desarmado dessa arma a menos que tenha a condição Incapacitado. Se ela estiver no mesmo plano de existência, você pode invocar essa arma como uma Ação Bônus, fazendo com que ela se teletransporte instantaneamente para a sua mão.\n\nVocê pode ter até duas armas vinculadas, mas pode invocar apenas uma por vez com uma Ação Bônus. Se tentar se vincular a uma terceira arma, você deve quebrar o vínculo com uma das outras duas.",
            "You learn a ritual that creates a magical bond between yourself and one weapon. You perform the ritual over the course of 1 hour, which can be done during a Short Rest. The weapon must be within your reach throughout the ritual, at the conclusion of which you touch the weapon and forge the bond. The bond fails if another Fighter is bonded to the weapon or if the weapon is a magic item to which someone else is attuned.\n\nOnce you have bonded a weapon to yourself, you can't be disarmed of that weapon unless you have the Incapacitated condition. If it is on the same plane of existence, you can summon that weapon as a Bonus Action, causing it to teleport instantly to your hand.\n\nYou can have up to two bonded weapons, but you can summon only one at a time with a Bonus Action. If you attempt to bond with a third weapon, you must break the bond with one of the other two."),
        ] },
        4: { spellsKnown: 4 },
        7: { spellsKnown: 5, features: [
          f('warMagic', 'Magia de Guerra', 'War Magic',
            'Ao realizar a ação Atacar, você pode substituir um dos ataques pela conjuração de um truque de Mago com tempo de conjuração de uma ação.',
            'When you take the Attack action, you can replace one of the attacks with casting a Wizard cantrip that has a casting time of an action.'),
        ] },
        8: { spellsKnown: 6 },
        10: { spellsKnown: 7, cantripsKnown: 3, features: [
          f('eldritchStrike', 'Golpe Místico', 'Eldritch Strike',
            "No 10º nível, você aprende como fazer com que seus golpes com armas enfraqueçam a resistência de uma criatura às suas magias. Quando você atinge uma criatura com um ataque com arma, essa criatura tem desvantagem na próxima salvaguarda que fizer contra uma magia que você conjurar antes do final do seu próximo turno.",
            "At 10th level, you learn how to make your weapon strikes undercut a creature’s resistance to your spells. When you hit a creature with a weapon attack, that creature has disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn."),
        ] },
        11: { spellsKnown: 8 },
        13: { spellsKnown: 9 },
        14: { spellsKnown: 10 },
        15: { features: [
          f('arcaneCharge', 'Investida Arcana', 'Arcane Charge',
            "Quando você usa seu Surto de Ação, você pode tele- força psiônica. Uma vez em cada um dos seus turnos, imediatatransporte até 9 metros para um espaço desocupado que você possa mente após atingir um alvo a até 9 metros de você ver. Você pode se teletransportar antes ou depois da com um ataque e causar dano a ele com uma arma,\n\n5 D8 8 de seus poderes gastam o Dado de Energia Psiônica, como Dados quando você termina um Descanso Curto, e você recupera tário escudo de força telecinética.\nGolpe Psiônico. Você pode impulsionar suas armas com\n\nas com Quando você usa seu Surto de Ação, você pode tele- força psiônica. Uma vez em cada um dos seus turnos, imediatatransporte até 9 metros para um espaço desocupado que você possa mente após atingir um alvo a até 9 metros de você ver. Você pode se teletransportar antes ou depois da ação adicional. você pode gastar um Dado de Energia Psiônica, rolando-o N ÍV E L 18: M AG IA D E GU E R R A A PR IM O R A DA número rolado mais seu modificador de Inteligência.\n\nQuando você realiza a ação de Ataque em seu turno, você Movimento Telecinético. Você pode mo ver um objeto pode substituir dois dos ataques pela conjuração de uma ou uma criatura com sua mente. Como uma ação de M ag ia, de suas magias de Mago de nível 1 ou nível 2 que tenha um você mesmo; o alvo deve ser um obj':'e to solto que seja tempo de conjuração de uma ação.\n\n98 C AP ÍTU L O 3 | C L A S S E S D E PE R S O N AG E M\n\nespaço desoc upado que você possa ver. Alternativamente, se o alvo for um objeto Miúdo, você pode transportá-lo para ou de sua mão.\n\nDepois de realizar esta ação, você não pode fazê-lo novamente até terminar um Descanso Curto ou Longo, a menos que gaste um Dado de Energia Psiônica (nenhuma ação necessária) para recuperar seu uso.",
            "When you use your Action Surge, you can tele- psionic force. Once on each of your turns, immediport up to 30 feet to an unoccupied space you can ately after you hit a target within 30 feet of yourself see. You can teleport before or after the additional with an attack and deal damage to it with a weapon,\n\n5 D8 8 of your powers expend the Psionic Energy Die, as Dice when you finish a Short Rest, and you regain tary shield of telekinetic force.\nPsionic Strike. You can propel your weapons with\n\nons with When you use your Action Surge, you can tele- psionic force. Once on each of your turns, immediport up to 30 feet to an unoccupied space you can ately after you hit a target within 30 feet of yourself see. You can teleport before or after the additional with an attack and deal damage to it with a weapon, action. you can expend one Psionic Energy Die, rolling it L EVE L ]8: I MPROVED W A R MAGIC number rolled plus your Intelligence modifier.\n\nWhen you take the Attack action on your turn, you Telekinetic Movement. You can mo ve an object can replace two of the attacks with a casting of one or a creature with your mind. As a M ag ic action, of your level 1 or level 2 Wizard spells that has a yourself; the target must be a loose obj':'c t that is casting time of an action.\n\n98 r; H APTE R 3 I CHARA CTER CLAS SES\n\nunocc upied space you can see. Alternatively, if the target is a Tiny object, you can transport it to or fro m your hand.\n\nOnce you take this action, you can't do so again until you finish a Short or Long Rest unless you expend a Psionic Energy Die (no action required) to restore your use of it."),
        ] },
        16: { spellsKnown: 11 },
        18: { features: [
          f('improvedWarMagic', 'Magia de Guerra Aprimorada', 'Improved War Magic',
            'Ao realizar a ação Atacar, você pode substituir dois dos ataques pela conjuração de uma magia de Mago de 1º ou 2º círculo com tempo de conjuração de uma ação.',
            'When you take the Attack action, you can replace two of the attacks with casting a level 1 or 2 Wizard spell that has a casting time of an action.'),
        ] },
        19: { spellsKnown: 12 },
        20: { spellsKnown: 13 },
      },
    },

    psiwarrior: {
      name: b('Guerreiro Psiônico', 'Psi Warrior'), source: 'PHB24',
      desc: b('Usa energia psiônica para golpes, proteção e telecinese.', 'Wields psionic energy for strikes, protection, and telekinesis.'),
      levels: {
        3: { features: [
          f('psionicPower', 'Poder Psiônico', 'Psionic Power',
            "si mesmo. É r epresentado pelos seus Dados de Energia Psiôn ica de classe. A tabela de Dados de Energia do Guerreiro Psi mostra o\n\nDADOS DE ENERGIA DO GUERREIRO PSI seu alcance durante todo o ritual, ao final do qual você toca a arma e forja o vínculo. Nível de Guerreiro Tamanho do Dado Quantidade O vínculo falha se outro Guerreiro estiver vinculado à 4 arma ou se a arma for um item mágico ao qual 3 D6 outra pessoa esteja sintonizada. 6 Depois de ter vinculado uma arma a si mesmo, você 8 não pode ser desarmado dessa arma a menos que tenha 9 D8 10 a condição Incapacitado. Se ela estiver no mesmo 12 plano de existência, você pode invocar essa arma como 11 D10 uma Ação Bônus, fazendo com que ela se teletransporte instantaneamente para a sua mão. 13 D10\n\nVocê pode ter até duas armas vinculadas, mas você 17 D12 pode invocar apenas uma por vez com uma Ação Bônus. Se tentar se vincular a uma terceira arma, Quaisquer características nesta subclasse que usem um Dado de Energia você deve quebrar o vínculo com uma das outras duas. Psiônica usam apenas os dados desta subclasse. Alguns",
            "yourself. It is r epresented by your Psion ic Energy class. The Psi War rior Energ y Dice table shows the\n\nPSI WARRIOR ENERGY DICE your reach throughout the ritual, at the conclusion of which you touch the weapon and forge the bond. Fighter Level Die Size Number The bond fails if another Fighter is bonded to the 4 weapon or if the weapon is a magic item to which 3 D6 someone else is attuned. 6 Once you have bonded a weapon to yourself, you 8 can't be disarmed of that weapon unless you have 9 D8 10 the Incapacitated condition. If it is on the same 12 plane of existence, you can summon that weapon as 11 D10 a Bonus Action, causing it to teleport instantly to your hand. 13 D10\n\nYou can have up to two bonded weapons, but you 17 D12 can summon only one at a time with a Bonus Action. If you attempt to bond with a third weapon, Any features in this subclass that use a Psionic Enyou must break the bond with one of the other two. ergy Die use only the dice from this subclass. Some"),
          f('protectiveField', 'Campo Protetor', 'Protective Field',
            "Quando você ou outra criatura que você possa ver a até 9 metros de você sofrer dano, você pode usar sua reação para gastar um dado de Energia Psiônica, rolar o dado e reduzir o dano sofrido pelo número rolado mais seu modificador de Inteligência (redução mínima de 1), ao criar um escudo momentâneo de força telecinética.",
            "When you or another creature you can see within 30 feet of you takes damage, you can use your reaction to expend one Psionic Energy die, roll the die, and reduce the damage taken by the number rolled plus your Intelligence modifier (minimum reduction of 1), as you create a momentary shield of telekinetic force."),
          f('psionicStrike', 'Golpe Psiônico', 'Psionic Strike',
            "Você pode impulsionar suas armas com força psiônica. Uma vez em cada um dos seus turnos, imediatamente após atingir um alvo a até 9 metros de você com um ataque e causar dano a ele com uma arma, você pode gastar um dado de Energia Psiônica, rolando-o e causando dano de energia ao alvo igual ao número rolado mais seu modificador de Inteligência.",
            "You can propel your weapons with psionic force. Once on each of your turns, immediately after you hit a target within 30 feet of you with an attack and deal damage to it with a weapon, you can expend one Psionic Energy die, rolling it and dealing force damage to the target equal to the number rolled plus your Intelligence modifier."),
          f('telekineticMovement', 'Movimento Telecinético', 'Telekinetic Movement',
            "Você pode mover um objeto ou uma criatura com sua mente. Como uma ação, você escolhe como alvo um objeto solto que seja Grande ou menor ou uma criatura voluntária, que não seja você mesmo. Se você puder ver o alvo e ele estiver a até 9 metros de você, você pode movê-lo até 9 metros para um espaço desocupado que possa ver. Alternativamente, se for um objeto Miúdo, você pode movê-lo para ou a partir de sua mão. De qualquer forma, você pode mover o alvo horizontalmente, verticalmente ou em ambas as direções. Depois de realizar esta ação, você não pode fazê-lo novamente até terminar um descanso curto ou longo, a menos que gaste um dado de Energia Psiônica para realizá-la novamente.",
            "You can move an object or a creature with your mind. As an action, you target one loose object that is Large or smaller or one willing creature, other than yourself. If you can see the target and it is within 30 feet of you, you can move it up to 30 feet to an unoccupied space you can see. Alternatively, if it is a Tiny object, you can move it to or from your hand. Either way, you can move the target horizontally, vertically, or both. Once you take this action, you can’t do so again until you finish a short or long rest, unless you expend a Psionic Energy die to take it again."),
        ] },
        7: { features: [
          f('telekineticAdept', 'Adepto Telecinético', 'Telekinetic Adept',
            'Salto Psiônico: ação bônus, ganha deslocamento de voo igual ao dobro do seu deslocamento até o fim do turno (1×/descanso curto ou 1 dado psiônico). Impulso Telecinético: ao causar dano com Golpe Psiônico, o alvo faz salvaguarda de Força ou fica Caído ou é empurrado até 3 m.',
            'Psi-Powered Leap: as a Bonus Action, gain a Fly Speed equal to twice your Speed until the end of the turn (once per Short Rest or 1 Psionic Energy Die). Telekinetic Thrust: when you deal damage with Psionic Strike, the target makes a Strength save or is knocked Prone or pushed up to 10 feet.'),
        ] },
        10: { features: [
          f('guardedMind', 'Mente Protegida', 'Guarded Mind',
            "Você tem Resistência a dano Psíquico. Além disso, se começar seu turno com a condição Enfeitiçado ou Amedrontado, você pode gastar um Dado de Energia Psiônica (nenhuma ação necessária) e encerrar todos os efeitos em você que estejam concedendo essas condições.",
            "You have Resistance to Psychic damage. Moreover, if you start your turn with the Charmed or Frightened condition, you can expend a Psionic Energy Die (no action required) and end every effect on yourself giving you those conditions."),
        ] },
        15: { features: [
          f('bulwarkOfForce', 'Baluarte de Força', 'Bulwark of Force',
            "Você pode proteger a si mesmo e a outros com força telecinética. Como uma Ação Bônus, você pode escolher criaturas, incluindo você mesmo, a até 9 metros de você, até um número de criaturas igual ao seu modificador de Inteligência (mínimo de uma criatura). Cada uma das criaturas escolhidas tem Meia Cobertura por 1 minuto ou até você ter a condição Incapacitado.\n\nAssim que usar esta característica, você não pode fazê-lo novamente até terminar um Descanso Longo, a menos que gaste um Dado de Energia Psiônica (nenhuma ação necessária) para recuperar seu uso.",
            "You can shield yourself and others with telekinetic force. As a Bonus Action, you can choose creatures, including yourself, within 30 feet of yourself, up to a number of creatures equal to your Intelligence modifier (minimum of one creature). Each of the chosen creatures has Half Cover for 1 minute or until you have the Incapacitated condition.\n\nOnce you use this feature, you can't do so again until you finish a Long Rest unless you expend a Psionic Energy Die (no action required) to restore your use of it."),
        ] },
        18: { autoSpells: ['telekinesis'], features: [
          f('telekineticMaster', 'Mestre Telecinético', 'Telekinetic Master',
            'Você sempre tem Telecinésia preparada e pode conjurá-la sem espaço nem componentes, usando Inteligência (1×/descanso longo, ou gaste 1 dado psiônico). Enquanto concentra nela, pode fazer um ataque com arma como ação bônus em cada turno.',
            'You always have Telekinesis prepared and can cast it without a slot or components, using Intelligence (once per Long Rest, or expend a Psionic Energy Die). While concentrating on it, you can make one weapon attack as a Bonus Action on each of your turns.'),
        ] },
      },
    },

    // ----- Suplementos 2014 (níveis iguais aos de 2024: 3/7/10/15/18) -----
    runeknight: {
      name: b('Cavaleiro das Runas', 'Rune Knight'), source: 'TCE',
      desc: b('Entalha runas de gigantes no equipamento e cresce em poder e tamanho.', 'Carves giant runes onto gear and grows in might and size.'),
      levels: {
        3: { grants: { tools: ['smithsTools'], languages: ['Giant'] }, features: [
          f('bonusProficiencies', 'Proficiências Bônus', 'Bonus Proficiencies',
            'Você ganha proficiência com ferramentas de ferreiro e aprende o idioma Gigante.',
            "You gain proficiency with Smith's Tools and learn the Giant language."),
          f('runeCarver', 'Entalhador de Runas', 'Rune Carver',
            'Você aprende 2 runas (mais nos níveis 7, 10 e 15; pode trocar 1 a cada nível de Guerreiro). Após um descanso longo, inscreve cada runa num objeto diferente que esteja usando ou segurando. Cada runa tem um efeito passivo e pode ser invocada 1× por descanso curto. CD = 8 + PB + mod. de Constituição.',
            'You learn 2 runes (more at levels 7, 10, and 15; swap 1 each Fighter level). After a Long Rest, you inscribe each rune on a different object you wear or hold. Each rune has a passive effect and can be invoked once per Short Rest. DC = 8 + PB + Constitution modifier.'),
          f('giantsMight', 'Poder dos Gigantes', "Giant's Might",
            "Característica de 3º nível do Cavaleiro Rúnico\n\nVocê aprendeu como imbuir a si mesmo com o poder dos gigantes. Como uma ação bônus, você ganha magicamente os seguintes benefícios, que duram por 1 minuto:\n\n• Se você for menor que Grande, você se torna Grande, junto com tudo o que estiver vestindo ou carregando. Se você não tiver espaço para se tornar Grande, seu tamanho não muda.\n\n• Você tem vantagem em testes de Força e salvaguardas de Força.\n\n• Uma vez em cada um dos seus turnos, um de seus ataques com uma arma ou um golpe desarmado pode causar 1d6 de dano adicional a um alvo ao acertar.\n\nVocê pode usar esta característica um número de vezes igual ao seu bônus de proficiência, e você recupera todos os usos gastos dela ao terminar um descanso longo.",
            "3rd-level Rune Knight feature\n\nYou have learned how to imbue yourself with the might of giants. As a bonus action, you magically gain the following benefits, which last for 1 minute:\n\n• If you are smaller than Large, you become Large, along with anything you are wearing. If you lack the room to become Large, your size doesn’t change.\n\n• You have advantage on Strength checks and Strength saving throws.\n\n• Once on each of your turns, one of your attacks with a weapon or an unarmed strike can deal an extra 1d6 damage to a target on a hit.\n\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses of it when you finish a long rest."),
        ] },
        7: { features: [
          f('runicShield', 'Escudo Rúnico', 'Runic Shield',
            "Característica de 7º nível do Cavaleiro Rúnico\n\nVocê aprende a invocar sua magia rúnica para proteger seus aliados. Quando outra criatura que você possa ver a até 18 metros de você for atingida por uma jogada de ataque, você pode usar sua reação para forçar o atacante a rolar novamente o d20 e usar a nova rolagem.\n\nVocê pode usar esta característica um número de vezes igual ao seu bônus de proficiência, e você recupera todos os usos gastos ao terminar um descanso longo.",
            "7th-level Rune Knight feature\n\nYou learn to invoke your rune magic to protect your allies. When another creature you can see within 60 feet of you is hit by an attack roll, you can use your reaction to force the attacker to reroll the d20 and use the new roll.\n\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."),
        ] },
        10: { features: [
          f('greatStature', 'Grande Estatura', 'Great Stature',
            "Característica de 10º nível do Cavaleiro Rúnico\n\nA magia das suas runas altera você permanentemente. Quando obtiver esta característica, role 3d4. Sua altura aumenta em um número de centímetros igual ao resultado multiplicado por 2,5 (número de polegadas igual à rolagem).\n\nAlém disso, o dano adicional que você causa com sua característica Poder dos Gigantes aumenta para 1d8.",
            "10th-level Rune Knight feature\n\nThe magic of your runes permanently alters you. When you gain this feature, roll 3d4. You grow a number of inches in height equal to the roll.\n\nMoreover, the extra damage you deal with your Giant’s Might feature increases to 1d8."),
        ] },
        15: { features: [
          f('masterOfRunes', 'Mestre das Runas', 'Master of Runes',
            "Característica de 15º nível do Cavaleiro Rúnico\n\nVocê pode invocar cada runa que conhece da sua característica Escultor de Runas duas vezes, em vez de uma, e você recupera todos os usos gastos ao terminar um descanso curto ou longo.",
            "15th-level Rune Knight feature\n\nYou can invoke each rune you know from your Rune Carver feature twice, rather than once, and you regain all expended uses when you finish a short or long rest."),
        ] },
        18: { features: [
          f('runicJuggernaut', 'Colosso Rúnico', 'Runic Juggernaut',
            "Característica de 18º nível do Cavaleiro Rúnico\n\nVocê aprende a ampliar sua transformação alimentada por runas. Como resultado, o dano adicional que você causa com a característica Poder dos Gigantes aumenta para 1d10. Além disso, quando você usa essa característica, seu tamanho pode aumentar para Enorme e, enquanto estiver desse tamanho, seu alcance aumenta em 1,5 metro.",
            "18th-level Rune Knight feature\n\nYou learn to amplify your rune-powered transformation. As a result, the extra damage you deal with the Giant’s Might feature increases to 1d10. Moreover, when you use that feature, your size can increase to Huge, and while you are that size, your reach increases by 5 feet."),
        ] },
      },
    },

    arcanearcher: {
      name: b('Arqueiro Arcano', 'Arcane Archer'), source: 'XGE',
      desc: b('Arqueiro que imbui flechas com efeitos mágicos.', 'An archer who weaves magic into arrows.'),
      levels: {
        3: { features: [
          f('arcaneArcherLore', 'Saber do Arqueiro Arcano', 'Arcane Archer Lore',
            "No 3º nível, você aprende teoria mágica ou alguns dos segredos da natureza — típico para praticantes desta tradição marcial élfica. Você escolhe ganhar proficiência na perícia Arcanismo ou Natureza, e escolhe aprender o truque prestidigitação ou o truque artesanato druídico.",
            "At 3rd level, you learn magical theory or some of the secrets of nature—typical for practitioners of this elven martial tradition. You choose to gain proficiency in either the Arcana or the Nature skill, and you choose to learn either the prestidigitation or the druidcraft cantrip."),
          f('arcaneShot', 'Tiro Arcano', 'Arcane Shot',
            'Você aprende 2 opções de Tiro Arcano (mais nos níveis 7, 10, 15 e 18). Ao disparar uma flecha de arco curto ou longo como parte da ação Atacar, aplique uma opção (em geral após acertar). 2 usos por descanso curto, no máximo 1 por turno. CD = 8 + PB + mod. de Inteligência.',
            'You learn 2 Arcane Shot options (more at levels 7, 10, 15, and 18). When you fire an arrow from a shortbow or longbow as part of the Attack action, apply one option (usually on a hit). 2 uses per Short Rest, at most once per turn. DC = 8 + PB + Intelligence modifier.'),
        ] },
        7: { features: [
          f('magicArrow', 'Flecha Mágica', 'Magic Arrow',
            "No 7º nível, você ganha a habilidade de infundir flechas com magia. Sempre que disparar uma flecha não mágica de um arco curto ou arco longo, você pode torná-la mágica com o propósito de superar resistência e imunidade a ataques e danos não mágicos. A magia desaparece da flecha imediatamente após ela atingir ou errar o alvo.",
            "At 7th level, you gain the ability to infuse arrows with magic. Whenever you fire a nonmagical arrow from a shortbow or longbow, you can make it magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage. The magic fades from the arrow immediately after it hits or misses its target."),
          f('curvingShot', 'Tiro Curvo', 'Curving Shot',
            "No 7º nível, você aprende como direcionar uma flecha desviada em direção a um novo alvo. Quando você fizer uma jogada de ataque com uma flecha mágica e errar, você pode usar uma ação bônus para rolar novamente a jogada de ataque contra um alvo diferente a até 18 metros do alvo original.",
            "At 7th level, you learn how to direct an errant arrow toward a new target. When you make an attack roll with a magic arrow and miss, you can use a bonus action to reroll the attack roll against a different target within 60 feet of the original target."),
        ] },
        15: { features: [
          f('everReadyShot', 'Tiro Sempre Pronto', 'Ever-Ready Shot',
            "A partir do 15º nível, sua arquearia mágica está disponível sempre que uma batalha começar. Se você rolar iniciativa e não tiver nenhum uso restante de Tiro Arcano, você recupera um uso dele.",
            "Starting at 15th level, your magical archery is available whenever battle starts. If you roll initiative and have no uses of Arcane Shot remaining, you regain one use of it."),
        ] },
        18: { features: [
          f('improvedShots', 'Tiros Aprimorados', 'Improved Shots',
            "A partir do 15º nível, sua arquearia mágica está disponível sempre que uma batalha começar. Se você rolar iniciativa e não tiver nenhum uso restante de Tiro Arcano, você recupera um uso dele.",
            "Starting at 15th level, your magical archery is available whenever battle starts. If you roll initiative and have no uses of Arcane Shot remaining, you regain one use of it."),
        ] },
      },
    },

    cavalier: {
      name: b('Cavaleiro', 'Cavalier'), source: 'XGE',
      desc: b('Combatente montado que protege aliados e prende inimigos.', 'A mounted warrior who protects allies and pins down foes.'),
      levels: {
        3: { features: [
          f('bonusProficiency', 'Proficiência Bônus', 'Bonus Proficiency',
            "Quando você escolhe este arquétipo no 3º nível, ganha proficiência em uma das seguintes perícias à sua escolha: Adestrar Animais, História, Intuição, Atuação ou Persuasão. Alternativamente, você aprende um idioma à sua escolha.",
            "When you choose this archetype at 3rd level, you gain proficiency in one of the following skills of your choice: Animal Handling, History, Insight, Performance, or Persuasion. Alternatively, you learn one language of your choice."),
          f('bornToTheSaddle', 'Nascido na Sela', 'Born to the Saddle',
            "A partir do 3º nível, sua maestria como cavaleiro se torna evidente. Você tem vantagem em salvaguardas feitas para evitar cair da sua montaria. Se você cair da sua montaria e descer não mais do que 3 metros, você pode aterrissar em pé se não estiver incapacitado.\n\nPor fim, montar ou desmontar de uma criatura custa apenas 1,5 metro de movimento para você, em vez de metade do seu deslocamento.",
            "Starting at 3rd level, your mastery as a rider becomes apparent. You have advantage on saving throws made to avoid falling off your mount. If you fall off your mount and descend no more than 10 feet, you can land on your feet if you’re not incapacitated.\n\nFinally, mounting or dismounting a creature costs you only 5 feet of movement, rather than half your speed."),
          f('unwaveringMark', 'Marca Inabalável', 'Unwavering Mark',
            'Ao acertar uma criatura com arma corpo a corpo, você a marca até o fim do seu próximo turno: ela tem Desvantagem em ataques contra outros que não você a até 1,5 m. Se ela causar dano a outro, no seu turno seguinte você pode fazer um ataque de ação bônus contra ela com Vantagem e dano extra igual a metade do seu nível de Guerreiro. Esse ataque tem usos = mod. de Força (mín. 1) por descanso longo.',
            'When you hit a creature with a melee weapon, you mark it until the end of your next turn: it has Disadvantage on attacks against targets other than you within 5 feet. If it deals damage to someone else, on your next turn you can make a Bonus Action attack against it with Advantage and extra damage equal to half your Fighter level. That attack has uses = Strength modifier (min. 1) per Long Rest.'),
        ] },
        7: { features: [
          f('wardingManeuver', 'Manobra de Proteção', 'Warding Maneuver',
            'Reação: quando você ou uma criatura a até 1,5 m é atingida, role 1d8 e some à CA contra esse ataque (precisa de arma corpo a corpo ou escudo). Se ainda acertar, o alvo tem resistência ao dano. Usos = mod. de Constituição (mín. 1) por descanso longo.',
            'Reaction: when you or a creature within 5 feet is hit, roll 1d8 and add it to AC against that attack (requires a melee weapon or shield). If it still hits, the target has resistance to its damage. Uses = Constitution modifier (min. 1) per Long Rest.'),
        ] },
        10: { features: [
          f('holdTheLine', 'Segurar a Linha', 'Hold the Line',
            "No 10º nível, você se torna um mestre em conter seus inimigos. As criaturas provocam um ataque de oportunidade seu quando se movem 1,5 metro ou mais enquanto estiverem dentro do seu alcance, e se você atingir uma criatura com um ataque de oportunidade, o deslocamento do alvo é reduzido a 0 até o final do turno atual.",
            "At 10th level, you become a master of locking down your enemies. Creatures provoke an opportunity attack from you when they move 5 feet or more while within your reach, and if you hit a creature with an opportunity attack, the target’s speed is reduced to 0 until the end of the current turn."),
        ] },
        15: { features: [
          f('ferociousCharger', 'Investida Feroz', 'Ferocious Charger',
            "A partir do 15º nível, você pode atropelar seus inimigos, esteja você montado ou não. Se você se mover pelo menos 3 metros em linha reta logo antes de atacar uma criatura e atingi-la com o ataque, esse alvo deve ser bem-sucedido em uma salvaguarda de Força (CD 8 + seu bônus de proficiência + seu modificador de Força) ou ficará caído. Você pode usar esta característica apenas uma vez em cada um dos seus turnos.",
            "Starting at 15th level, you can run down your foes, whether you’re mounted or not. If you move at least 10 feet in a straight line right before attacking a creature and you hit it with the attack, that target must succeed on a Strength saving throw (DC 8 + your proficiency bonus + your Strength modifier) or be knocked prone. You can use this feature only once on each of your turns."),
        ] },
        18: { features: [
          f('vigilantDefender', 'Defensor Vigilante', 'Vigilant Defender',
            "A partir do 18º nível, você responde ao perigo com vigilância extraordinária. Em combate, você ganha uma reação especial que pode realizar uma vez no turno de cada criatura, exceto no seu turno. Você pode usar esta reação especial apenas para fazer um ataque de oportunidade, e não pode usá-la no mesmo turno em que usar sua reação normal.",
            "Starting at 18th level, you respond to danger with extraordinary vigilance. In combat, you get a special reaction that you can take once on every creature’s turn, except your turn. You can use this special reaction only to make an opportunity attack, and you can’t use it on the same turn that you take your normal reaction."),
        ] },
      },
    },

    samurai: {
      name: b('Samurai', 'Samurai'), source: 'XGE',
      desc: b('Guerreiro de espírito indomável, disciplina e cortesia.', 'A warrior of unbreakable spirit, discipline, and courtesy.'),
      levels: {
        3: { features: [
          f('bonusProficiency', 'Proficiência Bônus', 'Bonus Proficiency',
            "Quando você escolhe este arquétipo no 3º nível, ganha proficiência em uma das seguintes perícias à sua escolha: História, Intuição, Atuação ou Persuasão. Alternativamente, você aprende um idioma à sua escolha.",
            "When you choose this archetype at 3rd level, you gain proficiency in one of the following skills of your choice: History, Insight, Performance, or Persuasion. Alternatively, you learn one language of your choice."),
          f('fightingSpirit', 'Espírito de Luta', 'Fighting Spirit',
            "A partir do 3º nível, sua intensidade em batalha pode protegê-lo e ajudá-lo a golpear com precisão. Como uma ação bônus em seu turno, você pode conceder a si mesmo vantagem em jogadas de ataque com armas até o final do turno atual. Ao fazer isso, você também ganha 5 pontos de vida temporários. A quantidade de pontos de vida temporários aumenta quando você atinge certos níveis nesta classe, aumentando para 10 no 10º nível e 15 no 15º nível.\n\nVocê pode usar esta característica três vezes, e recupera todos os usos gastos dela ao terminar um descanso longo.",
            "Starting at 3rd level, your intensity in battle can shield you and help you strike true. As a bonus action on your turn, you can give yourself advantage on weapon attack rolls until the end of the current turn. When you do so, you also gain 5 temporary hit points. The number of temporary hit points increases when you reach certain levels in this class, increasing to 10 at 10th level and 15 at 15th level.\n\nYou can use this feature three times, and you regain all expended uses of it when you finish a long rest."),
        ] },
        7: { features: [
          f('elegantCourtier', 'Cortesão Elegante', 'Elegant Courtier',
            "A partir do 7º nível, sua disciplina e atenção aos detalhes permitem que você se destaque em situações sociais. Sempre que fizer um teste de Carisma (Persuasão), você ganha um bônus no teste igual ao seu modificador de Sabedoria.\n\nSeu autocontrole também faz com que você ganhe proficiência em salvaguardas de Sabedoria. Se você já tiver essa proficiência, em vez disso ganha proficiência em salvaguardas de Inteligência ou Carisma (sua escolha).",
            "Starting at 7th level, your discipline and attention to detail allow you to excel in social situations. Whenever you make a Charisma (Persuasion) check, you gain a bonus to the check equal to your Wisdom modifier.\n\nYour self-control also causes you to gain proficiency in Wisdom saving throws. If you already have this proficiency, you instead gain proficiency in Intelligence or Charisma saving throws (your choice)."),
        ] },
        10: { features: [
          f('tirelessSpirit', 'Espírito Incansável', 'Tireless Spirit',
            "A partir do 10º nível, quando você rolar iniciativa e não tiver nenhum uso restante de Espírito de Luta, você recupera um uso.",
            "Starting at 10th level, when you roll initiative and have no uses of Fighting Spirit remaining, you regain one use."),
        ] },
        15: { features: [
          f('rapidStrike', 'Golpe Rápido', 'Rapid Strike',
            "A partir do 15º nível, você aprende a trocar precisão por ataques rápidos. Se você realizar a ação de Ataque em seu turno e tiver vantagem em uma jogada de ataque contra um dos alvos, você pode abrir mão da vantagem para essa jogada para fazer um ataque adicional com arma contra esse alvo, como parte da mesma ação. Você não pode fazer isso mais de uma vez por turno.",
            "Starting at 15th level, you learn to trade accuracy for swift strikes. If you take the Attack action on your turn and have advantage on an attack roll against one of the targets, you can forgo the advantage for that roll to make an additional weapon attack against that target, as part of the same action. You can do so no more than once per turn."),
        ] },
        18: { features: [
          f('strengthBeforeDeath', 'Força Antes da Morte', 'Strength Before Death',
            "A partir do 18º nível, seu espírito de luta pode adiar o abraço da morte. Se você sofrer dano que o reduza a 0 pontos de vida e não o mate instantaneamente, você pode usar sua reação para adiar cair inconsciente, e pode realizar imediatamente um turno extra, interrompendo o turno atual. Enquanto tiver 0 pontos de vida durante esse turno extra, sofrer dano causa falhas em salvaguardas contra a morte normalmente, e três falhas em salvaguardas contra a morte ainda podem matá-lo. Quando o turno extra terminar, você cai inconsciente se ainda tiver 0 pontos de vida.\n\nAssim que usar esta característica, você não pode usá-la novamente até terminar um descanso longo.",
            "Starting at 18th level, your fighting spirit can delay the grasp of death. If you take damage that reduces you to 0 hit points and doesn’t kill you outright, you can use your reaction to delay falling unconscious, and you can immediately take an extra turn, interrupting the current turn. While you have 0 hit points during that extra turn, taking damage causes death saving throw failures as normal, and three death saving throw failures can still kill you. When the extra turn ends, you fall unconscious if you still have 0 hit points.\n\nOnce you use this feature, you can’t use it again until you finish a long rest."),
        ] },
      },
    },

    echoknight: {
      name: b('Cavaleiro do Eco', 'Echo Knight'), source: 'EGW',
      desc: b('Invoca um eco de si mesmo de uma linha do tempo alternativa para lutar ao seu lado.', 'Summons an echo of itself from an alternate timeline to fight alongside.'),
      levels: {
        3: { features: [
          f('manifestEcho', 'Manifestar Eco', 'Manifest Echo',
            'Ação bônus: crie um eco seu a até 4,5 m (CA 14 + PB, 1 PV, imune a condições). Você pode atacar a partir do espaço dele e trocar de lugar com ele gastando 4,5 m de movimento. Ele some se ficar a mais de 9 m de você.',
            'Bonus Action: create an echo of yourself within 15 feet (AC 14 + PB, 1 HP, immune to conditions). You can attack from its space and swap places with it by spending 15 feet of movement. It vanishes if more than 30 feet from you.'),
          f('unleashIncarnation', 'Liberar Encarnação', 'Unleash Incarnation',
            "Característica de 3º nível do Cavaleiro do Eco\n\nVocê pode intensificar a fúria do seu eco. Sempre que realizar a ação de Ataque, você pode fazer um ataque corpo a corpo adicional a partir da posição do eco.\n\nVocê pode usar esta característica um número de vezes igual ao seu modificador de Constituição (mínimo de uma vez). Você recupera todos os usos gastos ao terminar um descanso longo.",
            "3rd-level Echo Knight feature\n\nYou can heighten your echo’s fury. Whenever you take the Attack action, you can make one additional melee attack from the echo’s position.\n\nYou can use this feature a number of times equal to your Constitution modifier (a minimum of once). You regain all expended uses when you finish a long rest."),
        ] },
        7: { features: [
          f('echoAvatar', 'Avatar do Eco', 'Echo Avatar',
            "Característica de 7º nível do Cavaleiro do Eco\n\nVocê pode transferir temporariamente sua consciência para o seu eco. Como uma ação, você pode ver através dos olhos do seu eco e ouvir através dos ouvidos dele. Durante esse período, você fica surdo e cego. Você pode manter esse efeito por até 10 minutos, e pode encerrá-lo a qualquer momento (nenhuma ação necessária). Enquanto o seu eco estiver sendo usado dessa forma, ele pode estar a até 300 metros de distância de você sem ser destruído.",
            "7th-level Echo Knight feature\n\nYou can temporary transfer your consciousness to your echo. As an action, you can see through your echo’s eyes and hear trough its ears. During this time, you are deafened and blinded. You can sustain this effect for up to 10 minutes, and you can end it at any time (requires no action). While your echo is being used in this way, it can be up to 1,000 feet away from you without being destroyed."),
        ] },
        10: { features: [
          f('shadowMartyr', 'Mártir Sombrio', 'Shadow Martyr',
            "Característica de 10º nível do Cavaleiro do Eco\n\nVocê pode fazer com que seu eco se lance na frente de um ataque direcionado a outra criatura que você possa ver. Antes de a jogada de ataque ser feita, você pode usar sua reação para teletransportar o eco para um espaço desocupado a até 1,5 metro da criatura visada. A jogada de ataque que desencadeou a reação é feita contra o seu eco em vez disso.\n\nAssim que usar esta característica, você não pode usá-la novamente até terminar um descanso curto ou longo.",
            "10th-level Echo Knight feature\n\nYou can make your echo throw itself in front of an attack directed at another creature that you can see. Before the attack roll is made, you can use your reaction to teleport the echo to an unoccupied space withing 5 feet of the targeted creature. The attack roll that triggered the reaction is instead made against your echo.\n\nOnce you use this feature, you can’t use it again until you finish a short or long rest."),
        ] },
        15: { features: [
          f('reclaimPotential', 'Recuperar Potencial', 'Reclaim Potential',
            "Característica de 15º nível do Cavaleiro do Eco\n\nVocê aprendeu a absorver a magia fugaz do seu eco. Quando um eco seu for destruído ao sofrer dano, você pode ganhar uma quantidade de pontos de vida temporários igual a 2d6 + seu modificador de Constituição, desde que já não tenha pontos de vida temporários.\n\nVocê pode usar esta característica um número de vezes igual ao seu modificador de Constituição (mínimo de uma vez). Você recupera todos os usos gastos ao terminar um descanso longo.",
            "15th-level Echo Knight feature\n\nYou’ve learned to absorb the fleeting magic of your echo. When an echo of yours is destroyed by taking damage, you can gain a number of temporary hit points equal to 2d6 + your Constitution modifier, provided you don’t already have temporary hit points.\n\nYou can use this feature a number of times equal to your Constitution modifier (a minimum of once). You regain all expended uses when you finish a long rest."),
        ] },
        18: { features: [
          f('legionOfOne', 'Legião de Um', 'Legion of One',
            "Característica de 18º nível do Cavaleiro do Eco\n\nVocê pode usar uma ação bônus para criar dois ecos com sua característica Manifestar Eco, e esses ecos podem coexistir. Se tentar criar um terceiro eco, os dois ecos anteriores são destruídos. Qualquer coisa que você possa fazer a partir da posição de um eco pode ser feita a partir da do outro.\n\nAlém disso, quando rolar iniciativa e não tiver mais usos restantes da sua característica Liberar Encarnação, você recupera um uso dessa característica.",
            "18th-level Echo Knight feature\n\nYou can use a bonus action to create two echoes with your Manifest Echo feature, and these echoes can coexist. If you try to create a third echo, the previous two echoes are destroyed. Anything you can do from one echo’s position can be done from the other’s instead.\n\nIn addition, when you roll initiative and have no uses of your Unleash Incarnation feature left, you regain one use of that feature."),
        ] },
      },
    },

    banneret: {
      name: b('Cavaleiro do Dragão Púrpura', 'Purple Dragon Knight'), source: 'SCAG',
      desc: b('Líder inspirador (Porta-Estandarte) cuja coragem fortalece os aliados.', 'An inspiring leader (Banneret) whose courage bolsters allies.'),
      levels: {
        3: { features: [
          f('rallyingCry', 'Grito de Reunião', 'Rallying Cry',
            "Quando você escolhe este arquétipo no 3º nível, você aprende a inspirar seus aliados a lutar além de seus ferimentos.\n\nQuando você usa sua característica Retomar o Fôlego, pode escolher até três criaturas a até 18 metros de você que sejam suas aliadas. Cada uma recupera pontos de vida iguais ao seu nível de guerreiro, desde que a criatura possa ver ou ouvir você.",
            "When you choose this archetype at 3rd level, you learn how to inspire your allies to fight on past their injuries.\n\nWhen you use your Second Wind feature, you can choose up to three creatures within 60 feet of you that are allied with you. Each one regains hit points equal to your fighter level, provided that the creature can see or hear you."),
        ] },
        7: { features: [
          f('royalEnvoy', 'Enviado Real', 'Royal Envoy',
            "Um cavaleiro do Dragão Púrpura serve como um enviado da coroa de Cormyr. Espera-se que cavaleiros de alta posição se portem com graça.\n\nNo 7º nível, você ganha proficiência na perícia Persuasão. Se você já for proficiente nela, ganha proficiência em uma das seguintes perícias à sua escolha: Adestrar Animais, Intuição, Intimidação ou Atuação.\n\nSeu bônus de proficiência é dobrado para qualquer teste de atributo que você fizer que use Persuasão. Você recebe este benefício independentemente da proficiência em perícia que ganhar desta característica.",
            "A Purple Dragon knight serves as an envoy of the Cormyrean crown. Knights of high standing are expected to conduct themselves with grace.\n\nAt 7th level, you gain proficiency in the Persuasion skill. If you are already proficient in it, you gain proficiency in one of the following skills of your choice: Animal Handling, Insight, Intimidation, or Performance.\n\nYour proficiency bonus is doubled for any ability check you make that uses Persuasion. You receive this benefit regardless of the skill proficiency you gain from this feature."),
        ] },
        10: { features: [
          f('inspiringSurge', 'Surto Inspirador', 'Inspiring Surge',
            "A partir do 10º nível, quando você usa sua característica Surto de Ação, você pode escolher uma criatura a até 18 metros de você que seja sua aliada. Aquela criatura pode fazer um ataque com arma corpo a corpo ou à distância com a reação dela, desde que possa vê-lo ou ouvi-lo.\n\nA partir do 18º nível, você pode escolher dois aliados a até 18 metros de você, em vez de um.",
            "Starting at 10th level, when you use your Action Surge feature, you can choose one creature within 60 feet of you that is allied with you. That creature can make one melee or ranged weapon attack with its reaction, provided that it can see or hear you.\n\nStarting at 18th level, you can choose two allies within 60 feet of you, rather than one."),
        ] },
        15: { features: [
          f('bulwark', 'Baluarte', 'Bulwark',
            "A partir do 15º nível, você pode estender o benefício da sua característica Indomável a um aliado. Quando você decidir usar Indomável para rolar novamente uma salvaguarda de Inteligência, Sabedoria ou Carisma e não estiver incapacitado, pode escolher um aliado a até 18 metros de você que também tenha falhado na salvaguarda dele contra o mesmo efeito. Se aquela criatura puder vê-lo ou ouvi-lo, ela pode rolar novamente a salvaguarda dela e deve usar a nova rolagem.",
            "Beginning at 15th level, you can extend the benefit of your Indomitable feature to an ally. When you decide to use Indomitable to reroll an Intelligence, a Wisdom, or a Charisma saving throw and you aren't incapacitated, you can choose one ally within 60 feet of you that also failed its saving throw against the same effect. If that creature can see or hear you, it can reroll its saving throw and must use the new roll."),
        ] },
        18: { features: [
          f('improvedInspiringSurge', 'Surto Inspirador Aprimorado', 'Improved Inspiring Surge',
            "A partir do 10º nível, quando você usa sua característica Surto de Ação, você pode escolher uma criatura a até 18 metros de você que seja sua aliada. Aquela criatura pode fazer um ataque com arma corpo a corpo ou à distância com a reação dela, desde que possa vê-lo ou ouvi-lo.\n\nA partir do 18º nível, você pode escolher dois aliados a até 18 metros de você, em vez de um.",
            "Starting at 10th level, when you use your Action Surge feature, you can choose one creature within 60 feet of you that is allied with you. That creature can make one melee or ranged weapon attack with its reaction, provided that it can see or hear you.\n\nStarting at 18th level, you can choose two allies within 60 feet of you, rather than one."),
        ] },
      },
    },

    // ----- Unearthed Arcana (playtest, já escrito para 2024) -----
    // Versão revisada do Villainous Options Update (18/jun/2026). Resumo original.
    hellknight: {
      name: b('Cavaleiro Infernal — UA', 'Hell Knight — UA'), source: 'UA26VOU',
      desc: b('Playtest: guerreiros que empenharam a alma aos Nove Infernos; suas armas forjadas no inferno abrem feridas que continuam queimando.',
        'Playtest: fighters who pledged their souls to the Nine Hells; their hell-forged weapons open wounds that keep burning.'),
      levels: {
        3: { grants: { languages: ['Infernal'] }, features: [
          f('diabolicalGift', 'Dádiva Diabólica', 'Diabolical Gift',
            'Você aprende o idioma Infernal, ganha Visão Diabólica (como a invocação: enxerga normalmente na penumbra e na escuridão, mágica ou não) e proficiência em uma perícia à escolha: Blefar, Atuação ou Prestidigitação.',
            'You learn the Infernal language, gain Devil\'s Sight (as the invocation: you see normally in dim light and darkness, magical or not), and gain proficiency in one skill of your choice: Deception, Performance, or Sleight of Hand.'),
          f('hellForgedWeapon', 'Arma Forjada no Inferno', 'Hell-Forged Weapon',
            "Ao realizar a ação Atacar, você pode imbuir de fogo infernal até duas armas que esteja empunhando e escolher dano de Frio, Fogo ou Necrótico: os ataques com elas podem causar esse tipo em vez do normal. Ficam assim até você usar o traço de novo, ficar Inconsciente ou passar 1 minuto ou mais a mais de 1,5 m delas.",
            'When you take the Attack action, you can imbue up to two weapons you\'re holding with hellfire and choose Cold, Fire, or Necrotic damage: attacks with them can deal that type instead of the normal one. They stay that way until you use this feature again, are Unconscious, or are more than 5 feet away from them for 1 minute or more.'),
          f('infernalWound', 'Ferida Infernal', 'Infernal Wound',
            "Ao acertar uma criatura com a Arma Forjada no Inferno, você pode causar dano extra do tipo escolhido igual a uma rolagem do seu Dado de Ferida Infernal (d6) e abrir nela uma ferida infernal: no início de cada turno dela, ela sofre de novo uma rolagem do dado. A ferida dura 1 minuto, ou até o alvo recuperar PV ou alguém a até 1,5 m dele usar uma ação para estancá-la. Usos: modificador de Constituição (mínimo 1) por Descanso Curto ou Longo.",
            'When you hit a creature with your Hell-Forged Weapon, you can deal extra damage of the chosen type equal to one roll of your Infernal Wound Die (d6) and open an infernal wound: at the start of each of its turns, it takes another roll of the die. The wound lasts 1 minute, or until the target regains HP or someone within 5 feet of it takes an action to staunch it. Uses: Constitution modifier (minimum 1) per Short or Long Rest.'),
        ] },
        7: { features: [
          f('infernalEquipment', 'Equipamento Infernal', 'Infernal Equipment',
            'Ao terminar um Descanso Curto ou Longo, escolha Frio, Fogo ou Necrótico: você tem Resistência a esse tipo enquanto usar armadura Pesada ou empunhar um Escudo. Além disso, ao rolar o Dado de Ferida Infernal, você pode tratar um 1 como 6.',
            'When you finish a Short or Long Rest, choose Cold, Fire, or Necrotic: you have Resistance to that type while wearing Heavy armor or holding a Shield. In addition, when you roll your Infernal Wound Die, you can treat a 1 as a 6.'),
          f('advancedWounds', 'Feridas Avançadas', 'Advanced Wounds',
            "Sempre que rolar o Dado de Ferida Infernal contra um alvo, aplique um destes efeitos; num 6, a Sorte do Diabo reforça o efeito. Gangrena Estígia: dano de Frio igual ao seu modificador de Constituição e o alvo não pode usar Reações até o início do próximo turno dele (6: Deslocamento dele cai à metade até o fim do próximo turno dele). Purulência de Minauros: cada inimigo numa emanação de 1,5 m do alvo sofre dano Ácido igual ao seu modificador de Constituição, e o alvo fica Envenenado até o fim do próximo turno dele (6: quem sofreu o ácido tem −1 na CA até o fim do seu próximo turno). Ruptura de Cânia: dano de Energia extra (6: penalidade nas salvaguardas do alvo; detalhes no documento do UA).",
            'Whenever you roll your Infernal Wound Die against a target, apply one of these effects; on a 6, Devil\'s Luck strengthens it. Stygian Gangrene: Cold damage equal to your Constitution modifier, and the target can\'t take Reactions until the start of its next turn (6: its Speed is halved until the end of its next turn). Purulence of Minauros: each enemy in a 5-foot emanation from the target takes Acid damage equal to your Constitution modifier, and the target is Poisoned until the end of its next turn (6: those who took the acid have −1 AC until the end of your next turn). Rupture of Cania: extra Force damage (6: a penalty to the target\'s saving throws; details in the UA document).'),
        ] },
        10: { features: [
          f('hellfireSurge', 'Surto do Fogo Infernal', 'Hellfire Surge',
            "Ao usar Surto de Ação empunhando uma Arma Forjada no Inferno, o fogo infernal irrompe numa emanação de 6 m a partir de você, até o fim do seu próximo turno. Uma criatura com ferida infernal que começar o turno nela sofre duas rolagens do Dado de Ferida Infernal em vez de uma.",
            'When you use Action Surge while holding a Hell-Forged Weapon, hellfire erupts in a 20-foot emanation from you until the end of your next turn. A creature with an infernal wound that starts its turn there takes two rolls of your Infernal Wound Die instead of one.'),
        ] },
        15: { features: [
          f('devilsMisfortune', 'Infortúnio do Diabo', "Devil's Misfortune",
            'Reação: quando uma criatura com ferida infernal acertar você com uma jogada de ataque, role o Dado de Ferida Infernal e reduza o dano pelo resultado; a cada 6, role de novo e some (até três rolagens). Um acerto crítico dela vira acerto normal.',
            'Reaction: when a creature with an infernal wound hits you with an attack roll, roll your Infernal Wound Die and reduce the damage by the result; on each 6, roll again and add it (up to three rolls). A critical hit from it becomes a normal hit.'),
        ] },
        18: { features: [
          f('infernalBargain', 'Barganha Infernal', 'Infernal Bargain',
            "Se tirar 6 no Dado de Ferida Infernal três ou mais vezes antes do início do seu próximo turno, você ganha Inspiração Heroica. Quando uma criatura que você vê a até 36 m rolar o d20 de um Teste de d20, você pode gastar essa Inspiração Heroica para obrigá-la a rolar de novo; o pacto traz efeitos extras conforme o novo resultado (detalhes no documento do UA).",
            'If you roll a 6 on your Infernal Wound Die three or more times before the start of your next turn, you gain Heroic Inspiration. When a creature you can see within 120 feet rolls the d20 for a D20 Test, you can expend that Heroic Inspiration to force it to reroll; the bargain adds extra effects depending on the new result (details in the UA document).'),
        ] },
      },
    },
  },
};

// Aumento no Valor de Atributo (níveis 4, 6, 8, 12, 14 e 16).
function asi() {
  return f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
    'Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique. Este traço se repete nos níveis 6, 8, 12, 14 e 16 de Guerreiro.',
    'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Fighter levels 6, 8, 12, 14, and 16.');
}
