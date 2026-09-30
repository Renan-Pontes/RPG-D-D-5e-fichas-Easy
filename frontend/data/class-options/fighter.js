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
    desc: b('Ao fazer um teste de Destreza (Furtividade) ou uma jogada de Iniciativa, gaste 1 DS e some-o ao resultado, desde que não esteja Incapacitado.',
      'When you make a Dexterity (Stealth) check or an Initiative roll, expend one die and add it to the roll, unless you have the Incapacitated condition.') },
  { id: 'baitAndSwitch', name: b('Isca e Troca', 'Bait and Switch'), source: 'PHB24',
    desc: b('No seu turno, gaste 1 DS e 1,5 m de movimento para trocar de lugar com uma criatura voluntária a até 1,5 m, sem provocar Ataques de Oportunidade. Você ou ela soma o DS à CA até o início do seu próximo turno.',
      'On your turn, expend one die and 5 feet of movement to swap places with a willing creature within 5 feet, without provoking Opportunity Attacks. You or that creature adds the die to AC until the start of your next turn.') },
  { id: 'brace', name: b('Postura Firme', 'Brace'), source: 'TCE', rules: '2014',
    desc: b('Reação: quando uma criatura que você vê entra no seu alcance corpo a corpo, gaste 1 DS para atacá-la com uma arma e some o DS ao dano.',
      'Reaction: when a creature you can see moves into your melee reach, expend one die to make one weapon attack against it, adding the die to the damage.') },
  { id: 'commandersStrike', name: b('Golpe do Comandante', "Commander's Strike"), source: 'PHB24',
    desc: b('Ao usar a ação Atacar, abra mão de um ataque e gaste 1 DS: um aliado que veja ou ouça você usa a Reação para fazer um ataque e soma o DS ao dano. (2014: também custa sua ação bônus.)',
      'When you take the Attack action, forgo one attack and expend one die: an ally who can see or hear you uses its Reaction to make one attack, adding the die to the damage. (2014: also costs your Bonus Action.)') },
  { id: 'commandingPresence', name: b('Presença de Comando', 'Commanding Presence'), source: 'PHB24',
    desc: b('Ao fazer um teste de Carisma (Intimidação, Atuação ou Persuasão), gaste 1 DS e some-o ao teste.',
      'When you make a Charisma (Intimidation, Performance, or Persuasion) check, expend one die and add it to the check.') },
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
    desc: b('Ação bônus: gaste 1 DS e escolha uma criatura a até 1,5 m. Você tem Vantagem no próximo ataque contra ela neste turno; se acertar, some o DS ao dano.',
      'Bonus Action: expend one die and choose a creature within 5 feet. You have Advantage on your next attack roll against it this turn; if it hits, add the die to the damage.') },
  { id: 'goadingAttack', name: b('Ataque Provocador', 'Goading Attack'), source: 'PHB24',
    desc: b('Ao acertar com um ataque, gaste 1 DS e some-o ao dano. O alvo faz uma salvaguarda de Sabedoria; se falhar, tem Desvantagem em ataques contra outros alvos que não você até o fim do seu próximo turno.',
      'When you hit with an attack, expend one die and add it to the damage. The target makes a Wisdom save; on a failure, it has Disadvantage on attack rolls against targets other than you until the end of your next turn.') },
  { id: 'grapplingStrike', name: b('Golpe Agarrador', 'Grappling Strike'), source: 'TCE', rules: '2014',
    desc: b('Logo após acertar um ataque corpo a corpo no seu turno, gaste 1 DS para tentar agarrar o alvo com uma ação bônus, somando o DS ao teste de Força (Atletismo).',
      'Immediately after you hit with a melee attack on your turn, expend one die to try to grapple the target as a Bonus Action, adding the die to your Strength (Athletics) check.') },
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
    desc: b('Ao errar uma jogada de ataque, gaste 1 DS e some-o à jogada, podendo transformá-la em acerto. (2014: decide antes ou depois de rolar, mas antes de saber o resultado.)',
      'When you miss with an attack roll, expend one die and add it to the roll, possibly turning it into a hit. (2014: decide before or after rolling, but before knowing the result.)') },
  { id: 'pushingAttack', name: b('Ataque Empurrão', 'Pushing Attack'), source: 'PHB24',
    desc: b('Ao acertar com um ataque, gaste 1 DS e some-o ao dano. Se o alvo for Grande ou menor, faz uma salvaguarda de Força; se falhar, é empurrado até 4,5 m para longe de você.',
      'When you hit with an attack, expend one die and add it to the damage. If the target is Large or smaller, it makes a Strength save; on a failure, you push it up to 15 feet straight away from you.') },
  { id: 'quickToss', name: b('Arremesso Rápido', 'Quick Toss'), source: 'TCE', rules: '2014',
    desc: b('Ação bônus: gaste 1 DS e faça um ataque à distância com uma arma de arremesso (pode sacá-la no ato). Se acertar, some o DS ao dano.',
      'Bonus Action: expend one die and make a ranged attack with a thrown weapon (you can draw it as part of the attack). On a hit, add the die to the damage.') },
  { id: 'rally', name: b('Reunir', 'Rally'), source: 'PHB24',
    desc: b('Ação bônus: gaste 1 DS; um aliado a até 9 m que veja ou ouça você ganha PV temporários iguais ao DS + metade do seu nível de Guerreiro (arred. para baixo). (2014: DS + mod. de Carisma.)',
      'Bonus Action: expend one die; an ally within 30 feet who can see or hear you gains Temporary Hit Points equal to the die roll plus half your Fighter level (round down). (2014: die + Charisma modifier.)') },
  { id: 'riposte', name: b('Contra-ataque', 'Riposte'), source: 'PHB24',
    desc: b('Reação: quando uma criatura erra você com um ataque corpo a corpo, gaste 1 DS e faça um ataque corpo a corpo contra ela; se acertar, some o DS ao dano.',
      'Reaction: when a creature misses you with a melee attack, expend one die and make a melee attack against it; on a hit, add the die to the damage.') },
  { id: 'sweepingAttack', name: b('Ataque Amplo', 'Sweeping Attack'), source: 'PHB24',
    desc: b('Ao acertar um ataque corpo a corpo, gaste 1 DS e escolha outra criatura a até 1,5 m do alvo e dentro do seu alcance. Se a jogada original atingiria essa criatura, ela sofre dano igual ao DS, do mesmo tipo do ataque.',
      'When you hit with a melee attack, expend one die and choose another creature within 5 feet of the target and within your reach. If the original roll would hit it, it takes damage equal to the die, of the same type as the attack.') },
  { id: 'tacticalAssessment', name: b('Avaliação Tática', 'Tactical Assessment'), source: 'PHB24',
    desc: b('Ao fazer um teste de Inteligência (História ou Investigação) ou de Sabedoria (Intuição), gaste 1 DS e some-o ao teste.',
      'When you make an Intelligence (History or Investigation) or Wisdom (Insight) check, expend one die and add it to the check.') },
  { id: 'tripAttack', name: b('Ataque Derrubador', 'Trip Attack'), source: 'PHB24',
    desc: b('Ao acertar com um ataque, gaste 1 DS e some-o ao dano. Se o alvo for Grande ou menor, faz uma salvaguarda de Força; se falhar, fica Caído.',
      'When you hit with an attack, expend one die and add it to the damage. If the target is Large or smaller, it makes a Strength save; on a failure, it has the Prone condition.') },
];

// Tiros Arcanos (XGE). Dano extra dobra no nível 18 de Guerreiro. CD = 8 + PB + INT.
const arcaneShots = [
  { id: 'banishingArrow', name: b('Flecha Banidora', 'Banishing Arrow'), source: 'XGE',
    desc: b('Ao acertar, o alvo faz salvaguarda de Carisma; se falhar, some para a Agrestia das Fadas até o fim do próximo turno dele (deslocamento 0, Incapacitado). No nível 18, também sofre 2d6 de dano de energia.',
      'On a hit, the target makes a Charisma save or vanishes to the Feywild until the end of its next turn (Speed 0, Incapacitated). At level 18 it also takes 2d6 force damage.') },
  { id: 'beguilingArrow', name: b('Flecha Encantadora', 'Beguiling Arrow'), source: 'XGE',
    desc: b('Ao acertar, +2d6 de dano psíquico; o alvo faz salvaguarda de Sabedoria ou fica Enfeitiçado por um aliado seu a até 9 m até o início do seu próximo turno. 4d6 no nível 18.',
      'On a hit, +2d6 psychic damage; the target makes a Wisdom save or is Charmed by an ally of yours within 30 feet until the start of your next turn. 4d6 at level 18.') },
  { id: 'burstingArrow', name: b('Flecha Explosiva', 'Bursting Arrow'), source: 'XGE',
    desc: b('Ao acertar, a flecha explode: o alvo e cada criatura a até 3 m dele sofrem 2d6 de dano de energia. 4d6 no nível 18.',
      'On a hit, the arrow explodes: the target and each creature within 10 feet of it take 2d6 force damage. 4d6 at level 18.') },
  { id: 'enfeeblingArrow', name: b('Flecha Debilitante', 'Enfeebling Arrow'), source: 'XGE',
    desc: b('Ao acertar, +2d6 de dano necrótico; o alvo faz salvaguarda de Constituição ou causa metade do dano com armas até o início do seu próximo turno. 4d6 no nível 18.',
      'On a hit, +2d6 necrotic damage; the target makes a Constitution save or deals half damage with weapon attacks until the start of your next turn. 4d6 at level 18.') },
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
    desc: b('Ao acertar, +2d6 de dano psíquico; o alvo faz salvaguarda de Sabedoria ou não enxerga nada além de 1,5 m até o início do seu próximo turno. 4d6 no nível 18.',
      "On a hit, +2d6 psychic damage; the target makes a Wisdom save or can't see anything farther than 5 feet until the start of your next turn. 4d6 at level 18.") },
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
    desc: b('Passivo: Vantagem em Lidar com Animais e Intimidação. Invocar (ação bônus): +2 em testes e salvaguardas de Força e Constituição por 10 minutos.',
      'Passive: Advantage on Animal Handling and Intimidation checks. Invoke (Bonus Action): +2 to Strength and Constitution checks and saves for 10 minutes.') },
  { id: 'stoneRune', name: b('Runa da Pedra', 'Stone Rune'), source: 'TCE',
    desc: b('Passivo: Vantagem em Intuição e visão no escuro de 36 m. Invocar (Reação): uma criatura que termina o turno a até 9 m faz salvaguarda de Sabedoria ou fica Enfeitiçada, Incapacitada e com deslocamento 0 por até 1 minuto.',
      'Passive: Advantage on Insight checks and 120-foot darkvision. Invoke (Reaction): a creature ending its turn within 30 feet makes a Wisdom save or is Charmed, Incapacitated, and has Speed 0 for up to 1 minute.') },
  { id: 'hillRune', name: b('Runa da Colina', 'Hill Rune'), source: 'TCE', prereq: { level: 7 },
    desc: b('Passivo: Vantagem em salvaguardas contra ficar Envenenado e resistência a dano de veneno. Invocar (ação bônus): resistência a dano contundente, perfurante e cortante por 1 minuto.',
      'Passive: Advantage on saves against being Poisoned and resistance to poison damage. Invoke (Bonus Action): resistance to bludgeoning, piercing, and slashing damage for 1 minute.') },
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
          desc: b('Aprende o truque Prestidigitação.', 'You learn the Prestidigitation cantrip.'), grants: { cantrips: ['prestidigitation'] } },
        { id: 'druidcraft', name: b('Arte Druídica', 'Druidcraft'), source: 'XGE',
          desc: b('Aprende o truque Arte Druídica.', 'You learn the Druidcraft cantrip.'), grants: { cantrips: ['druidcraft'] } },
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
  ],

  // Traços da classe base 2024 (SRD 5.2.1).
  features: {
    1: [
      f('fightingStyle', 'Estilo de Luta', 'Fighting Style',
        'Você ganha um talento de Estilo de Luta à sua escolha (Defesa é recomendado). Sempre que ganhar um nível de Guerreiro, pode trocar esse talento por outro talento de Estilo de Luta.',
        'You gain a Fighting Style feat of your choice (Defense is recommended). Whenever you gain a Fighter level, you can replace that feat with a different Fighting Style feat.'),
      f('secondWind', 'Retomar o Fôlego', 'Second Wind',
        'Ação bônus: recupere PV iguais a 1d10 + seu nível de Guerreiro. Dois usos (3 no nível 4, 4 no nível 10); recupera 1 uso num descanso curto e todos num descanso longo.',
        'Bonus Action: regain Hit Points equal to 1d10 + your Fighter level. Two uses (3 at level 4, 4 at level 10); you regain one expended use on a Short Rest and all of them on a Long Rest.'),
      f('weaponMastery', 'Maestria em Armas', 'Weapon Mastery',
        'Você usa as propriedades de maestria de três tipos de armas simples ou marciais à sua escolha (4 no nível 4, 5 no 10, 6 no 16). Ao terminar um descanso longo, pode trocar um desses tipos.',
        'You can use the mastery properties of three kinds of Simple or Martial weapons of your choice (4 at level 4, 5 at 10, 6 at 16). Whenever you finish a Long Rest, you can change one of those choices.'),
    ],
    2: [
      f('actionSurgeOneUse', 'Surto de Ação', 'Action Surge',
        'No seu turno, você pode realizar uma ação adicional, exceto a ação Magia. Depois de usar, só pode usar de novo após um descanso curto ou longo.',
        "On your turn, you can take one additional action, except the Magic action. Once used, you can't use it again until you finish a Short or Long Rest."),
      f('tacticalMind', 'Mente Tática', 'Tactical Mind',
        'Ao falhar num teste de atributo, gaste um uso de Retomar o Fôlego para rolar 1d10 e somar ao teste em vez de recuperar PV. Se o teste ainda falhar, o uso não é gasto.',
        "When you fail an ability check, you can expend a use of Second Wind to roll 1d10 and add it to the check instead of regaining Hit Points. If the check still fails, the use isn't expended."),
    ],
    3: [
      f('fighterSubclass', 'Subclasse de Guerreiro', 'Fighter Subclass',
        'Você ganha uma subclasse de Guerreiro à sua escolha. Ela concede traços nos níveis 3, 7, 10, 15 e 18 de Guerreiro.',
        'You gain a Fighter subclass of your choice. It grants features at Fighter levels 3, 7, 10, 15, and 18.'),
    ],
    4: [asi()],
    5: [
      f('extraAttack', 'Ataque Extra', 'Extra Attack',
        'Você ataca duas vezes, em vez de uma, sempre que realiza a ação Atacar no seu turno.',
        'You can attack twice instead of once whenever you take the Attack action on your turn.'),
      f('tacticalShift', 'Deslocamento Tático', 'Tactical Shift',
        'Sempre que ativar Retomar o Fôlego com uma ação bônus, você pode se mover até metade do seu deslocamento sem provocar Ataques de Oportunidade.',
        'Whenever you activate Second Wind with a Bonus Action, you can move up to half your Speed without provoking Opportunity Attacks.'),
    ],
    6: [asi()],
    8: [asi()],
    9: [
      f('indomitableOneUse', 'Indomável', 'Indomitable',
        'Se falhar numa salvaguarda, você pode rolá-la de novo com um bônus igual ao seu nível de Guerreiro, e deve usar o novo resultado. Uma vez por descanso longo (2 no nível 13, 3 no nível 17).',
        'If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level; you must use the new roll. Once per Long Rest (twice at level 13, three times at level 17).'),
      f('tacticalMaster', 'Mestre Tático', 'Tactical Master',
        'Ao atacar com uma arma cuja propriedade de maestria você pode usar, pode trocá-la por Empurrar, Minar ou Lentidão (Push, Sap ou Slow) naquele ataque.',
        'When you attack with a weapon whose mastery property you can use, you can replace that property with the Push, Sap, or Slow property for that attack.'),
    ],
    11: [
      f('twoExtraAttacks', 'Dois Ataques Extras', 'Two Extra Attacks',
        'Você ataca três vezes, em vez de uma, sempre que realiza a ação Atacar no seu turno.',
        'You can attack three times instead of once whenever you take the Attack action on your turn.'),
    ],
    12: [asi()],
    13: [
      f('indomitableTwoUses', 'Indomável (2 usos)', 'Indomitable (two uses)',
        'Você pode usar Indomável duas vezes antes de um descanso longo.',
        'You can use Indomitable twice before a Long Rest.'),
      f('studiedAttacks', 'Ataques Estudados', 'Studied Attacks',
        'Se errar uma jogada de ataque contra uma criatura, você tem Vantagem no próximo ataque contra ela antes do fim do seu próximo turno.',
        'If you make an attack roll against a creature and miss, you have Advantage on your next attack roll against that creature before the end of your next turn.'),
    ],
    14: [asi()],
    16: [asi()],
    17: [
      f('actionSurgeTwoUses', 'Surto de Ação (2 usos)', 'Action Surge (two uses)',
        'Você pode usar Surto de Ação duas vezes antes de um descanso, mas só uma vez por turno.',
        'You can use Action Surge twice before a rest, but only once on a turn.'),
      f('indomitableThreeUses', 'Indomável (3 usos)', 'Indomitable (three uses)',
        'Você pode usar Indomável três vezes antes de um descanso longo.',
        'You can use Indomitable three times before a Long Rest.'),
    ],
    19: [
      f('epicBoon', 'Dádiva Épica', 'Epic Boon',
        'Você ganha um talento de Dádiva Épica ou outro talento para o qual se qualifique. Dádiva da Proeza em Combate é recomendada.',
        'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Combat Prowess is recommended.'),
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
            'Você tem Vantagem em jogadas de Iniciativa e testes de Força (Atletismo). Logo após um Acerto Crítico, pode se mover até metade do deslocamento sem provocar Ataques de Oportunidade.',
            'You have Advantage on Initiative rolls and Strength (Athletics) checks. Immediately after you score a Critical Hit, you can move up to half your Speed without provoking Opportunity Attacks.'),
        ] },
        7: { features: [
          f('additionalFightingStyle', 'Estilo de Luta Adicional', 'Additional Fighting Style',
            'Você ganha outro talento de Estilo de Luta à sua escolha.',
            'You gain another Fighting Style feat of your choice.'),
        ] },
        10: { features: [
          f('heroicWarrior', 'Guerreiro Heroico', 'Heroic Warrior',
            'Durante o combate, você pode se dar Inspiração Heroica sempre que começar o seu turno sem ela.',
            'During combat, you can give yourself Heroic Inspiration whenever you start your turn without it.'),
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
            'Ação bônus: descubra as imunidades, resistências e vulnerabilidades de uma criatura a até 9 m que você veja. Uma vez por descanso longo, ou gaste 1 dado de superioridade para usar de novo. Você passa a ter 5 dados de superioridade.',
            'Bonus Action: learn the immunities, resistances, and vulnerabilities of a creature you can see within 30 feet. Once per Long Rest, or expend a superiority die to use it again. You now have 5 superiority dice.'),
        ] },
        10: { features: [
          f('improvedCombatSuperiority', 'Superioridade em Combate Aprimorada', 'Improved Combat Superiority',
            'Seus dados de superioridade viram d10.',
            'Your superiority die becomes a d10.'),
        ] },
        15: { features: [
          f('relentless', 'Implacável', 'Relentless',
            'Uma vez por turno, ao usar uma manobra, você pode rolar 1d8 e usar esse resultado em vez de gastar um dado de superioridade. Você passa a ter 6 dados de superioridade.',
            'Once per turn, when you use a maneuver, you can roll 1d8 and use it instead of expending a superiority die. You now have 6 superiority dice.'),
        ] },
        18: { features: [
          f('ultimateCombatSuperiority', 'Superioridade em Combate Suprema', 'Ultimate Combat Superiority',
            'Seus dados de superioridade viram d12.',
            'Your superiority die becomes a d12.'),
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
            'Um ritual de 1 hora vincula você a uma arma (até duas ao mesmo tempo). Você não pode ser desarmado dela, a menos que esteja Incapacitado, e pode invocá-la para a mão com uma ação bônus, se estiver no mesmo plano.',
            "A 1-hour ritual bonds you to a weapon (up to two at once). You can't be disarmed of it unless Incapacitated, and you can summon it to your hand as a Bonus Action if it's on the same plane."),
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
            'Ao acertar uma criatura com uma arma, ela tem Desvantagem na próxima salvaguarda contra uma magia sua até o fim do seu próximo turno.',
            'When you hit a creature with a weapon, it has Disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn.'),
        ] },
        11: { spellsKnown: 8 },
        13: { spellsKnown: 9 },
        14: { spellsKnown: 10 },
        15: { features: [
          f('arcaneCharge', 'Investida Arcana', 'Arcane Charge',
            'Ao usar Surto de Ação, você pode se teletransportar até 9 m para um espaço desocupado que veja, antes ou depois da ação adicional.',
            'When you use Action Surge, you can teleport up to 30 feet to an unoccupied space you can see, before or after the additional action.'),
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
            'Você tem Dados de Energia Psiônica: 4d6 no nível 3, 6d8 no 5, 8d8 no 9, 8d10 no 11, 10d10 no 13 e 12d12 no 17. Recupera 1 dado num descanso curto e todos num descanso longo. CD = 8 + PB + mod. de Inteligência.',
            'You have Psionic Energy Dice: 4d6 at level 3, 6d8 at 5, 8d8 at 9, 8d10 at 11, 10d10 at 13, and 12d12 at 17. You regain one die on a Short Rest and all of them on a Long Rest. DC = 8 + PB + Intelligence modifier.'),
          f('protectiveField', 'Campo Protetor', 'Protective Field',
            'Reação: quando você ou uma criatura que você vê a até 9 m sofre dano, gaste 1 dado psiônico e reduza o dano em dado + mod. de Inteligência (mínimo 1).',
            'Reaction: when you or a creature you can see within 30 feet takes damage, expend one Psionic Energy Die and reduce the damage by the roll + your Intelligence modifier (minimum 1).'),
          f('psionicStrike', 'Golpe Psiônico', 'Psionic Strike',
            'Uma vez por turno, logo após acertar com uma arma um alvo a até 9 m, gaste 1 dado psiônico para causar dano de energia extra igual ao dado + mod. de Inteligência.',
            'Once per turn, right after you hit a target within 30 feet with a weapon, expend one Psionic Energy Die to deal extra Force damage equal to the roll + your Intelligence modifier.'),
          f('telekineticMovement', 'Movimento Telecinético', 'Telekinetic Movement',
            'Ação Magia: mova até 9 m um objeto solto Grande ou menor, ou uma criatura voluntária que não seja você, a até 9 m. Uma vez por descanso curto, ou gaste 1 dado psiônico para usar de novo.',
            'Magic action: move a loose Large or smaller object, or a willing creature other than you, within 30 feet up to 30 feet. Once per Short Rest, or expend a Psionic Energy Die to use it again.'),
        ] },
        7: { features: [
          f('telekineticAdept', 'Adepto Telecinético', 'Telekinetic Adept',
            'Salto Psiônico: ação bônus, ganha deslocamento de voo igual ao dobro do seu deslocamento até o fim do turno (1×/descanso curto ou 1 dado psiônico). Impulso Telecinético: ao causar dano com Golpe Psiônico, o alvo faz salvaguarda de Força ou fica Caído ou é empurrado até 3 m.',
            'Psi-Powered Leap: as a Bonus Action, gain a Fly Speed equal to twice your Speed until the end of the turn (once per Short Rest or 1 Psionic Energy Die). Telekinetic Thrust: when you deal damage with Psionic Strike, the target makes a Strength save or is knocked Prone or pushed up to 10 feet.'),
        ] },
        10: { features: [
          f('guardedMind', 'Mente Protegida', 'Guarded Mind',
            'Você tem resistência a dano psíquico. No início do seu turno, se estiver Enfeitiçado ou Amedrontado, pode gastar 1 dado psiônico para encerrar essas condições.',
            'You have Resistance to Psychic damage. At the start of your turn, if you are Charmed or Frightened, you can expend a Psionic Energy Die to end those conditions.'),
        ] },
        15: { features: [
          f('bulwarkOfForce', 'Baluarte de Força', 'Bulwark of Force',
            'Ação bônus: até um número de criaturas igual ao seu mod. de Inteligência (mínimo 1), incluindo você, a até 9 m, ganham Meia Cobertura por 1 minuto. Uma vez por descanso longo, ou gaste 1 dado psiônico.',
            'Bonus Action: a number of creatures up to your Intelligence modifier (minimum 1), you included, within 30 feet gain Half Cover for 1 minute. Once per Long Rest, or expend a Psionic Energy Die.'),
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
            'Ação bônus, por 1 minuto: você fica Grande (se houver espaço), tem Vantagem em testes e salvaguardas de Força e causa +1d6 de dano uma vez por turno com armas ou Ataques Desarmados. Usos = bônus de proficiência por descanso longo.',
            'Bonus Action, for 1 minute: you become Large (if there is room), have Advantage on Strength checks and saves, and deal +1d6 damage once per turn with weapons or Unarmed Strikes. Uses = proficiency bonus per Long Rest.'),
        ] },
        7: { features: [
          f('runicShield', 'Escudo Rúnico', 'Runic Shield',
            'Reação: quando outra criatura que você vê a até 18 m é atingida por um ataque, force o atacante a rolar o d20 de novo e usar o novo resultado. Usos = bônus de proficiência por descanso longo.',
            'Reaction: when another creature you can see within 60 feet is hit by an attack, force the attacker to reroll the d20 and use the new roll. Uses = proficiency bonus per Long Rest.'),
        ] },
        10: { features: [
          f('greatStature', 'Grande Estatura', 'Great Stature',
            'Você cresce permanentemente 3d4 polegadas, e o dano extra de Poder dos Gigantes vira 1d8.',
            "You permanently grow 3d4 inches, and the extra damage of Giant's Might becomes 1d8."),
        ] },
        15: { features: [
          f('masterOfRunes', 'Mestre das Runas', 'Master of Runes',
            'Cada runa conhecida pode ser invocada duas vezes, em vez de uma, por descanso curto ou longo.',
            'You can invoke each rune you know twice, rather than once, per Short or Long Rest.'),
        ] },
        18: { features: [
          f('runicJuggernaut', 'Colosso Rúnico', 'Runic Juggernaut',
            'O dano extra de Poder dos Gigantes vira 1d10, você pode ficar Enorme em vez de Grande e ganha +1,5 m de alcance enquanto Enorme.',
            "The extra damage of Giant's Might becomes 1d10, you can become Huge instead of Large, and your reach increases by 5 feet while Huge."),
        ] },
      },
    },

    arcanearcher: {
      name: b('Arqueiro Arcano', 'Arcane Archer'), source: 'XGE',
      desc: b('Arqueiro que imbui flechas com efeitos mágicos.', 'An archer who weaves magic into arrows.'),
      levels: {
        3: { features: [
          f('arcaneArcherLore', 'Saber do Arqueiro Arcano', 'Arcane Archer Lore',
            'Você ganha proficiência em Arcanismo ou Natureza e aprende o truque Prestidigitação ou Arte Druídica.',
            'You gain proficiency in Arcana or Nature and learn the Prestidigitation or Druidcraft cantrip.'),
          f('arcaneShot', 'Tiro Arcano', 'Arcane Shot',
            'Você aprende 2 opções de Tiro Arcano (mais nos níveis 7, 10, 15 e 18). Ao disparar uma flecha de arco curto ou longo como parte da ação Atacar, aplique uma opção (em geral após acertar). 2 usos por descanso curto, no máximo 1 por turno. CD = 8 + PB + mod. de Inteligência.',
            'You learn 2 Arcane Shot options (more at levels 7, 10, 15, and 18). When you fire an arrow from a shortbow or longbow as part of the Attack action, apply one option (usually on a hit). 2 uses per Short Rest, at most once per turn. DC = 8 + PB + Intelligence modifier.'),
        ] },
        7: { features: [
          f('magicArrow', 'Flecha Mágica', 'Magic Arrow',
            'Flechas não mágicas que você dispara de arco curto ou longo contam como mágicas para superar resistência e imunidade.',
            'Nonmagical arrows you fire from a shortbow or longbow count as magical for overcoming resistance and immunity.'),
          f('curvingShot', 'Tiro Curvo', 'Curving Shot',
            'Ação bônus: ao errar um ataque com uma flecha mágica, role o ataque de novo contra outro alvo a até 18 m do original.',
            'Bonus Action: when you miss with a magic arrow, reroll the attack against a different target within 60 feet of the original.'),
        ] },
        15: { features: [
          f('everReadyShot', 'Tiro Sempre Pronto', 'Ever-Ready Shot',
            'Ao rolar Iniciativa sem usos de Tiro Arcano, você recupera um uso.',
            'When you roll Initiative and have no uses of Arcane Shot left, you regain one use.'),
        ] },
        18: { features: [
          f('improvedShots', 'Tiros Aprimorados', 'Improved Shots',
            'O dano extra das suas opções de Tiro Arcano dobra (ex.: 2d6 vira 4d6).',
            'The extra damage of your Arcane Shot options doubles (e.g., 2d6 becomes 4d6).'),
        ] },
      },
    },

    cavalier: {
      name: b('Cavaleiro', 'Cavalier'), source: 'XGE',
      desc: b('Combatente montado que protege aliados e prende inimigos.', 'A mounted warrior who protects allies and pins down foes.'),
      levels: {
        3: { features: [
          f('bonusProficiency', 'Proficiência Bônus', 'Bonus Proficiency',
            'Você ganha proficiência em Lidar com Animais, História, Intuição, Atuação ou Persuasão, ou aprende um idioma.',
            'You gain proficiency in Animal Handling, History, Insight, Performance, or Persuasion, or learn one language.'),
          f('bornToTheSaddle', 'Nascido na Sela', 'Born to the Saddle',
            'Vantagem em salvaguardas para não cair da montaria; ao cair até 3 m, cai de pé se não estiver Incapacitado. Montar ou desmontar custa só 1,5 m de movimento.',
            "Advantage on saves to avoid falling off your mount; if you fall 10 feet or less, you land on your feet if not Incapacitated. Mounting or dismounting costs only 5 feet of movement."),
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
            'Criaturas provocam Ataque de Oportunidade seu ao se mover 1,5 m ou mais dentro do seu alcance. Se acertar esse ataque, o deslocamento do alvo vira 0 até o fim do turno.',
            "Creatures provoke an Opportunity Attack from you when they move 5 feet or more while within your reach. If that attack hits, the target's Speed becomes 0 until the end of the turn."),
        ] },
        15: { features: [
          f('ferociousCharger', 'Investida Feroz', 'Ferocious Charger',
            'Se você se mover ao menos 3 m em linha reta antes de acertar uma criatura, ela faz salvaguarda de Força (CD 8 + PB + mod. de Força) ou fica Caída. Uma vez por turno.',
            'If you move at least 10 feet in a straight line before hitting a creature, it makes a Strength save (DC 8 + PB + Strength modifier) or is knocked Prone. Once per turn.'),
        ] },
        18: { features: [
          f('vigilantDefender', 'Defensor Vigilante', 'Vigilant Defender',
            'Você ganha uma reação especial em cada turno de outra criatura, usável só para Ataques de Oportunidade (não no seu próprio turno).',
            "You get a special reaction on each other creature's turn, usable only for Opportunity Attacks (not on your own turn)."),
        ] },
      },
    },

    samurai: {
      name: b('Samurai', 'Samurai'), source: 'XGE',
      desc: b('Guerreiro de espírito indomável, disciplina e cortesia.', 'A warrior of unbreakable spirit, discipline, and courtesy.'),
      levels: {
        3: { features: [
          f('bonusProficiency', 'Proficiência Bônus', 'Bonus Proficiency',
            'Você ganha proficiência em História, Intuição, Atuação ou Persuasão, ou aprende um idioma.',
            'You gain proficiency in History, Insight, Performance, or Persuasion, or learn one language.'),
          f('fightingSpirit', 'Espírito de Luta', 'Fighting Spirit',
            'Ação bônus: Vantagem em todas as jogadas de ataque com arma até o fim do turno e 5 PV temporários (10 no nível 10, 15 no 15). 3 usos por descanso longo.',
            'Bonus Action: Advantage on all weapon attack rolls until the end of the turn and 5 Temporary Hit Points (10 at level 10, 15 at 15). 3 uses per Long Rest.'),
        ] },
        7: { features: [
          f('elegantCourtier', 'Cortesão Elegante', 'Elegant Courtier',
            'Você soma o mod. de Sabedoria aos testes de Carisma (Persuasão). Ganha proficiência em salvaguardas de Sabedoria; se já tiver, escolha Inteligência ou Carisma.',
            'You add your Wisdom modifier to Charisma (Persuasion) checks. You gain Wisdom saving throw proficiency; if you already have it, choose Intelligence or Charisma instead.'),
        ] },
        10: { features: [
          f('tirelessSpirit', 'Espírito Incansável', 'Tireless Spirit',
            'Ao rolar Iniciativa sem usos de Espírito de Luta, você recupera um uso.',
            'When you roll Initiative and have no uses of Fighting Spirit left, you regain one use.'),
        ] },
        15: { features: [
          f('rapidStrike', 'Golpe Rápido', 'Rapid Strike',
            'Uma vez por turno, ao atacar com Vantagem na ação Atacar, abra mão da Vantagem nesse ataque para fazer um ataque com arma adicional.',
            'Once per turn, when you have Advantage on an attack as part of the Attack action, you can forgo it on that attack to make an additional weapon attack.'),
        ] },
        18: { features: [
          f('strengthBeforeDeath', 'Força Antes da Morte', 'Strength Before Death',
            'Reação: ao cair a 0 PV (sem morrer), adie o desmaio e faça um turno extra imediatamente. Uma vez por descanso longo.',
            "Reaction: when you drop to 0 Hit Points and don't die, delay falling unconscious and take an extra turn immediately. Once per Long Rest."),
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
            'Ao realizar a ação Atacar, faça um ataque corpo a corpo adicional a partir da posição do eco. Usos = mod. de Constituição (mín. 1) por descanso longo.',
            "When you take the Attack action, make one additional melee attack from the echo's position. Uses = Constitution modifier (min. 1) per Long Rest."),
        ] },
        7: { features: [
          f('echoAvatar', 'Avatar do Eco', 'Echo Avatar',
            'Ação: veja e ouça pelos sentidos do eco por até 10 minutos, ficando Cego e Surdo; nesse tempo o eco pode se afastar até 300 m.',
            'Action: see and hear through your echo for up to 10 minutes, while you are Blinded and Deafened; during that time it can be up to 1,000 feet away.'),
        ] },
        10: { features: [
          f('shadowMartyr', 'Mártir Sombrio', 'Shadow Martyr',
            'Reação: quando uma criatura que você vê é atacada, teletransporte o eco para perto dela e faça dele o alvo do ataque. Uma vez por descanso curto.',
            'Reaction: when a creature you can see is attacked, teleport your echo next to it and make the echo the target of the attack. Once per Short Rest.'),
        ] },
        15: { features: [
          f('reclaimPotential', 'Recuperar Potencial', 'Reclaim Potential',
            'Quando o eco é destruído por dano, você ganha 2d6 + mod. de Constituição PV temporários. Usos = mod. de Constituição (mín. 1) por descanso longo.',
            'When your echo is destroyed by damage, gain 2d6 + Constitution modifier Temporary Hit Points. Uses = Constitution modifier (min. 1) per Long Rest.'),
        ] },
        18: { features: [
          f('legionOfOne', 'Legião de Um', 'Legion of One',
            'Você pode manter dois ecos ao mesmo tempo. Ao rolar Iniciativa sem usos de Liberar Encarnação, recupera um uso.',
            'You can have two echoes at once. When you roll Initiative with no uses of Unleash Incarnation left, you regain one use.'),
        ] },
      },
    },

    banneret: {
      name: b('Cavaleiro do Dragão Púrpura', 'Purple Dragon Knight'), source: 'SCAG',
      desc: b('Líder inspirador (Porta-Estandarte) cuja coragem fortalece os aliados.', 'An inspiring leader (Banneret) whose courage bolsters allies.'),
      levels: {
        3: { features: [
          f('rallyingCry', 'Grito de Reunião', 'Rallying Cry',
            'Ao usar Retomar o Fôlego, até três aliados a até 18 m que vejam ou ouçam você recuperam PV iguais ao seu nível de Guerreiro.',
            'When you use Second Wind, up to three allies within 60 feet who can see or hear you regain Hit Points equal to your Fighter level.'),
        ] },
        7: { features: [
          f('royalEnvoy', 'Enviado Real', 'Royal Envoy',
            'Você ganha proficiência em Persuasão (se já tiver, escolha Lidar com Animais, Intuição, Intimidação ou Atuação) e dobra o bônus de proficiência em testes de Persuasão.',
            'You gain proficiency in Persuasion (if you already have it, choose Animal Handling, Insight, Intimidation, or Performance) and double your proficiency bonus on Persuasion checks.'),
        ] },
        10: { features: [
          f('inspiringSurge', 'Surto Inspirador', 'Inspiring Surge',
            'Ao usar Surto de Ação, um aliado a até 18 m que veja ou ouça você pode usar a Reação para fazer um ataque corpo a corpo ou à distância.',
            'When you use Action Surge, one ally within 60 feet who can see or hear you can use its Reaction to make one melee or ranged attack.'),
        ] },
        15: { features: [
          f('bulwark', 'Baluarte', 'Bulwark',
            'Ao usar Indomável numa salvaguarda de Inteligência, Sabedoria ou Carisma sem estar Incapacitado, um aliado a até 18 m que falhou contra o mesmo efeito também pode rolar de novo.',
            'When you use Indomitable on an Intelligence, Wisdom, or Charisma save while not Incapacitated, one ally within 60 feet who failed against the same effect can also reroll.'),
        ] },
        18: { features: [
          f('improvedInspiringSurge', 'Surto Inspirador Aprimorado', 'Improved Inspiring Surge',
            'Surto Inspirador passa a permitir que dois aliados façam o ataque, em vez de um.',
            'Inspiring Surge now lets two allies make the attack instead of one.'),
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
