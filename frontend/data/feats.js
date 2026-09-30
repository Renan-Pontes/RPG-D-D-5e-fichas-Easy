/**
 * Catálogo de talentos (feats) — regras 2024 (PHB 2024 / SRD 5.2.1) e 2014
 * (PHB 2014 e suplementos). Substitui o talento em texto livre da subida de nível.
 *
 * Conteúdo: só texto do SRD (CC-BY) ou resumos ORIGINAIS curtos. Nada copiado
 * de livro pago nem do Aurora Builder.
 *
 * Formato de cada talento:
 * {
 *   id: 'magicInitiate',               // camelCase, ÚNICO no catálogo. Talentos de 2014 que
 *                                      // também existem em 2024 recebem o sufixo `2014`
 *   base: 'magicInitiate',             // (só 2014 com sufixo) id "sem versão" do talento
 *   name: { pt, en },
 *   source: 'SRD' | 'PHB24' | 'PHB' | 'XGE' | 'TCE' | …,
 *   category: 'origin' | 'general' | 'fightingStyle' | 'epicBoon'   (2024)  |  'feat'  (2014),
 *   rules: '2024' | '2014',
 *   desc: { pt, en },
 *   prereq: {                          // tudo opcional; as condições valem juntas
 *     level: 4,                        // nível de PERSONAGEM mínimo
 *     abilities: { str: 13 },          // TODOS estes valores mínimos
 *     anyAbility: { str: 13, dex: 13 },// PELO MENOS UM destes
 *     proficiency: 'lightArmor' | 'mediumArmor' | 'heavyArmor' | 'shield' | 'martialWeapon',
 *     spellcasting: true,              // 2024: característica Conjuração ou Magia de Pacto;
 *                                      // 2014: capaz de lançar ao menos uma magia
 *     feature: 'fightingStyle',        // tem a característica Estilo de Luta (qualquer classe)
 *     species: ['elf-high', …],        // ids de espécie/raça de srd.js RACES (ou SPECIES_2024)
 *     feats: ['squireOfSolamnia'],     // exige estes talentos
 *     text: { pt, en },                // parte não verificável, só exibida
 *   },
 *   repeatable: true,                  // pode pegar mais de uma vez
 *   repeatKey: 'spellList',            // …desde que esta sub-escolha seja diferente
 *   asi: {                             // aumento de atributo embutido
 *     choose: ['str', 'dex'],          // atributos permitidos (escolher 1)
 *     amount: 1,                       // +1 (ASI: 2)
 *     split: true,                     // (só ASI) pode dividir: +1 em dois atributos
 *     max: 20,                         // teto (Dádivas Épicas: 30)
 *     excludeProficientSaves: true,    // (Resiliente) só atributo sem salvaguarda proficiente
 *   },
 *   grants: {                          // o que concede de forma FIXA (ids do app)
 *     spells: [], cantrips: [],        // ids de magia do catálogo
 *     skills: [], expertise: [], languages: [], tools: [],
 *     proficiencies: ['heavyArmor' | 'mediumArmor' | 'lightArmor' | 'shield' |
 *                     'martialWeapons' | 'improvisedWeapons' | 'firearms'],
 *     savingThrow: 'asi',              // proficiência na salvaguarda do atributo aumentado
 *     allSkills: true,                 // proficiência em todas as perícias (Dádiva da Perícia)
 *     // efeitos numéricos para cálculo futuro:
 *     initiative: 'pb' | 5, hpPerLevel: 2, hpMax: 40, speed: 10, ac: 1 (condicional, ver desc),
 *     senses: { blindsight: 10, truesight: 60, darkvision: 60 }, climbSpeed: 'speed',
 *     mediumArmorDexCap: 3, passiveBonus: { perception: 5, investigation: 5 },
 *     resistances: ['fire'], unarmedDie: '1d4', unarmoredAc: 13, telepathy: 60,
 *   },
 *   choices: {                         // sub-escolhas pedidas ao pegar o talento
 *     skill: 1 | { count, from: [...] },         // proficiência em perícia
 *     skillOrTool: 3,                            // perícias ou ferramentas, qualquer mistura
 *     skillProfOrExpertise: { count, from },     // proficiência; especialização se já tiver
 *     expertise: 1,                              // especialização em perícia já proficiente
 *     tool: { count, from? }, instrument: 3, language: 3,
 *     weapon: { count },                         // proficiência em armas (2014 Mestre de Armas)
 *     weaponMastery: 1,                          // vaga extra em SHARED.weaponMastery
 *     spellList: ['cleric', 'druid', 'wizard'],  // escolher UMA lista de classe
 *     spellAbility: ['int', 'wis', 'cha'] | 'asi', // atributo de conjuração ('asi' = o aumentado)
 *     cantrip: { count, list?: 'spellList' | '<classId>', attack?: true },
 *     spell:   { count: n | 'pb', level, list?, schools?: [...], ritual?: true },
 *     damageType: ['acid', …] | { count, from },
 *     maneuver: n, metamagic: n, invocation: n, fightingStyle: n, // vagas nesses pools
 *     variant: [{ id, name: { pt, en } }],       // sub-opção nomeada (tipo de gigante, plano…)
 *   },
 *   styleId: 'archery',                // (category 'fightingStyle') opção de SHARED.fightingStyle
 * }
 *
 * Estilos de Luta 2024: as entradas de FEATS com category 'fightingStyle' são
 * geradas a partir de SHARED.fightingStyle (mesmo id, `styleId`, desc copiada),
 * para não duplicar texto. A escolha pela classe continua no pool da classe;
 * aqui eles aparecem porque podem ser pegos em qualquer vaga de talento por quem
 * tem a característica Estilo de Luta.
 */
import { SHARED } from './class-options/shared.js';

const b = (pt, en) => ({ pt, en });
const ALL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const MENTAL = ['int', 'wis', 'cha'];
const plus1 = (choose, max = 20) => ({ choose, amount: 1, max });
const DAMAGE_ELEMENTAL = ['acid', 'cold', 'fire', 'lightning', 'thunder'];
const ARTISAN_FAST = ['carpentersTools', 'leatherworkersTools', 'masonsTools', 'pottersTools', 'smithsTools', 'tinkersTools', 'weaversTools', 'woodcarversTools'];
const CASTER_LISTS_2014 = ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'];

const SRD_2024 = new Set([
  'alert', 'magicInitiate', 'savageAttacker', 'skilled', 'abilityScoreImprovement', 'grappler',
  'archery', 'defense', 'greatWeaponFighting', 'twoWeaponFighting',
  'boonOfCombatProwess', 'boonOfDimensionalTravel', 'boonOfFate', 'boonOfIrresistibleOffense',
  'boonOfSpellRecall', 'boonOfTheNightSpirit', 'boonOfTruesight',
]);
const src24 = (id) => (SRD_2024.has(id) ? 'SRD' : 'PHB24');

// ---------------------------------------------------------------------------
// 2024 — Origem (10): sem pré-requisito, sem ASI
// ---------------------------------------------------------------------------
const origin = (id, pt, en, dpt, den, extra = {}) =>
  ({ id, name: b(pt, en), source: src24(id), category: 'origin', rules: '2024', desc: b(dpt, den), ...extra });

const ORIGIN_2024 = [
  origin('alert', 'Alerta', 'Alert',
    'Soma seu Bônus de Proficiência à Iniciativa. Logo após rolar Iniciativa, pode trocar a sua com a de um aliado disposto (nenhum dos dois Incapacitado).',
    'Add your Proficiency Bonus to Initiative. Immediately after rolling Initiative, you can swap yours with a willing ally\'s (neither of you Incapacitated).',
    { grants: { initiative: 'pb' } }),
  origin('crafter', 'Artesão', 'Crafter',
    'Proficiência em 3 ferramentas de artesão; 20% de desconto em itens não mágicos; ao fim de um Descanso Longo, fabrica com a ferramenta um item simples que dura até o próximo Descanso Longo.',
    'Proficiency with 3 artisan\'s tools; 20% discount on nonmagical items; after a Long Rest you can craft a simple item with a tool that lasts until your next Long Rest.',
    { choices: { tool: { count: 3, from: ARTISAN_FAST } } }),
  origin('healer', 'Curandeiro', 'Healer',
    'Com um Kit de Curandeiro, usa a ação Utilizar para deixar uma criatura gastar um Dado de Vida e curar o resultado + seu BP. Rola de novo os 1 nos dados de cura.',
    'With a Healer\'s Kit, take the Utilize action to let a creature spend a Hit Point Die and heal the roll + your PB. Reroll 1s on healing dice.'),
  origin('lucky', 'Sortudo', 'Lucky',
    'Pontos de Sorte iguais ao seu BP (voltam no Descanso Longo). Gaste 1 para ter Vantagem num Teste de d20 ou impor Desvantagem num ataque contra você.',
    'Luck Points equal to your PB (regained on a Long Rest). Spend 1 to gain Advantage on a D20 Test or to impose Disadvantage on an attack roll against you.'),
  origin('magicInitiate', 'Iniciado em Magia', 'Magic Initiate',
    'Escolha a lista de Clérigo, Druida ou Mago: aprende 2 truques e 1 magia de 1º nível dela, sempre preparada; lança essa magia 1× por Descanso Longo sem espaço (ou com espaços). Pode trocar uma das magias ao subir de nível. Repetível com outra lista.',
    'Choose the Cleric, Druid, or Wizard list: learn 2 cantrips and 1 level 1 spell from it, always prepared; cast that spell once per Long Rest without a slot (or with slots). Swap one of them on level-up. Repeatable with a different list.',
    {
      repeatable: true, repeatKey: 'spellList',
      choices: { spellList: ['cleric', 'druid', 'wizard'], spellAbility: MENTAL, cantrip: { count: 2, list: 'spellList' }, spell: { count: 1, level: 1, list: 'spellList' } },
    }),
  origin('musician', 'Músico', 'Musician',
    'Proficiência em 3 instrumentos musicais. Ao terminar um Descanso Curto ou Longo, toca uma música e dá Inspiração Heroica a até BP aliados que a ouçam.',
    'Proficiency with 3 musical instruments. After a Short or Long Rest, play a song and give Heroic Inspiration to up to PB allies who hear it.',
    { choices: { instrument: 3 } }),
  origin('savageAttacker', 'Atacante Selvagem', 'Savage Attacker',
    '1× por turno, ao acertar com uma arma, rola os dados de dano da arma duas vezes e usa qualquer um dos resultados.',
    'Once per turn when you hit with a weapon, roll its damage dice twice and use either roll.'),
  origin('skilled', 'Habilidoso', 'Skilled',
    'Proficiência em qualquer combinação de 3 perícias ou ferramentas. Repetível.',
    'Proficiency in any combination of 3 skills or tools. Repeatable.',
    { repeatable: true, choices: { skillOrTool: 3 } }),
  origin('tavernBrawler', 'Brigão de Taverna', 'Tavern Brawler',
    'Golpe Desarmado causa 1d4 + FOR; rola de novo os 1 no dano desarmado; proficiência com armas improvisadas; 1× por turno, ao acertar desarmado, pode empurrar o alvo 1,5 m.',
    'Unarmed Strike deals 1d4 + STR; reroll 1s on its damage; proficiency with improvised weapons; once per turn, an unarmed hit can push the target 5 feet.',
    { grants: { proficiencies: ['improvisedWeapons'], unarmedDie: '1d4' } }),
  origin('tough', 'Vigoroso', 'Tough',
    'Seus Pontos de Vida máximos aumentam em 2 × seu nível de personagem, e mais 2 a cada nível ganho.',
    'Your Hit Point maximum increases by twice your character level, and by 2 more each level.',
    { grants: { hpPerLevel: 2 } }),
];

// ---------------------------------------------------------------------------
// 2024 — Geral (43): nível 4+, quase todos dão +1 em atributo (teto 20)
// ---------------------------------------------------------------------------
const general = (id, pt, en, choose, dpt, den, extra = {}) => ({
  id, name: b(pt, en), source: src24(id), category: 'general', rules: '2024', desc: b(dpt, den),
  ...extra,
  prereq: { level: 4, ...(extra.prereq || {}) },
  ...(choose ? { asi: plus1(choose) } : {}),
});
const any13 = (...abs) => ({ anyAbility: Object.fromEntries(abs.map(a => [a, 13])) });
const all13 = (...abs) => ({ abilities: Object.fromEntries(abs.map(a => [a, 13])) });

const GENERAL_2024 = [
  general('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement', null,
    '+2 em um atributo ou +1 em dois atributos (máximo 20). Repetível.',
    '+2 to one ability score or +1 to two (maximum 20). Repeatable.',
    { repeatable: true, asi: { choose: ALL, amount: 2, split: true, max: 20 } }),
  general('actor', 'Ator', 'Actor', ['cha'],
    'Vantagem em Enganação e Atuação para se passar por outra pessoa disfarçado; imita a fala de alguém ou sons de criaturas (Intuição CD 8 + CAR + BP para perceber).',
    'Advantage on Deception and Performance to pass as someone else while disguised; mimic a person\'s speech or creature sounds (Insight DC 8 + CHA + PB to notice).',
    { prereq: all13('cha') }),
  general('athlete', 'Atleta', 'Athlete', ['str', 'dex'],
    'Deslocamento de Escalada igual ao Deslocamento; levantar-se de Caído custa só 1,5 m; salto com corrida após mover apenas 1,5 m.',
    'Climb Speed equal to your Speed; standing up from Prone costs only 5 feet; running jumps after moving only 5 feet.',
    { prereq: any13('str', 'dex'), grants: { climbSpeed: 'speed' } }),
  general('charger', 'Investida', 'Charger', ['str', 'dex'],
    'Disparada dá +3 m de deslocamento. Se mover 3 m em linha reta até o alvo e acertar um ataque corpo a corpo, causa +1d8 de dano ou empurra 3 m (1× por turno).',
    'Dash grants +10 feet of movement. If you move 10 feet straight toward a target and hit with a melee attack, deal +1d8 damage or push it 10 feet (once per turn).',
    { prereq: any13('str', 'dex') }),
  general('chef', 'Chef de Cozinha', 'Chef', ['con', 'wis'],
    'Proficiência com utensílios de cozinheiro. No Descanso Curto, até 4 + BP criaturas curam 1d8 extra ao gastar Dados de Vida; após um Descanso Longo, prepara BP petiscos que dão PV temporários iguais ao BP.',
    'Proficiency with Cook\'s Utensils. On a Short Rest, up to 4 + PB creatures heal an extra 1d8 when spending Hit Dice; after a Long Rest, make PB treats that grant Temporary HP equal to your PB.',
    { grants: { tools: ['cooksUtensils'] } }),
  general('crossbowExpert', 'Especialista em Besta', 'Crossbow Expert', ['dex'],
    'Ignora a propriedade Recarga de bestas; atacar com besta a 1,5 m de um inimigo não impõe Desvantagem; soma o modificador ao dano do ataque extra Leve feito com besta.',
    'Ignore the Loading property of crossbows; no Disadvantage for firing within 5 feet of an enemy; add your modifier to the damage of a crossbow\'s Light extra attack.',
    { prereq: all13('dex') }),
  general('crusher', 'Esmagador', 'Crusher', ['str', 'con'],
    '1× por turno, ao acertar com dano contundente, move o alvo 1,5 m. Num crítico contundente, ataques contra o alvo têm Vantagem até o início do seu próximo turno.',
    'Once per turn, a bludgeoning hit moves the target 5 feet. On a bludgeoning critical hit, attacks against the target have Advantage until the start of your next turn.'),
  general('defensiveDuelist', 'Duelista Defensivo', 'Defensive Duelist', ['dex'],
    'Reação, empunhando arma de Acuidade: soma o BP à CA contra ataques corpo a corpo até o início do seu próximo turno.',
    'Reaction while holding a Finesse weapon: add your PB to AC against melee attacks until the start of your next turn.',
    { prereq: all13('dex') }),
  general('dualWielder', 'Combatente com Duas Armas', 'Dual Wielder', ['str', 'dex'],
    'Depois de atacar com uma arma Leve, pode atacar com Ação Bônus usando outra arma que não seja de Duas Mãos; saca ou guarda duas armas de uma vez.',
    'After attacking with a Light weapon, you can make a Bonus Action attack with a different weapon that lacks Two-Handed; draw or stow two weapons at once.',
    { prereq: any13('str', 'dex') }),
  general('durable', 'Durável', 'Durable', ['con'],
    'Vantagem em salvaguardas contra a morte; com uma Ação Bônus, gasta um Dado de Vida para recuperar PV.',
    'Advantage on Death Saving Throws; as a Bonus Action, spend a Hit Point Die to regain HP.'),
  general('elementalAdept', 'Adepto Elemental', 'Elemental Adept', MENTAL,
    'Escolha ácido, frio, fogo, elétrico ou trovejante: suas magias ignoram resistência a esse tipo, e 1 nos dados de dano desse tipo conta como 2. Repetível com outro tipo.',
    'Choose acid, cold, fire, lightning, or thunder: your spells ignore Resistance to that type, and 1s on its damage dice count as 2s. Repeatable with a different type.',
    { prereq: { spellcasting: true }, repeatable: true, repeatKey: 'damageType', choices: { damageType: DAMAGE_ELEMENTAL } }),
  general('feyTouched', 'Tocado pelas Fadas', 'Fey-Touched', MENTAL,
    'Aprende Passo Nebuloso e uma magia de 1º nível de Adivinhação ou Encantamento; ambas sempre preparadas e lançáveis 1× por Descanso Longo sem espaço. Usa o atributo aumentado.',
    'Learn Misty Step and one level 1 Divination or Enchantment spell; both always prepared and castable once per Long Rest without a slot. Uses the increased ability.',
    { grants: { spells: ['mistyStep'] }, choices: { spell: { count: 1, level: 1, schools: ['divination', 'enchantment'] }, spellAbility: 'asi' } }),
  general('grappler', 'Agarrador', 'Grappler', ['str', 'dex'],
    'Ao acertar um Golpe Desarmado na ação de Ataque, pode causar dano e agarrar ao mesmo tempo (1× por turno); Vantagem nos ataques contra quem você agarra; mover o agarrado não custa deslocamento extra se ele for do seu tamanho ou menor.',
    'When you hit with an Unarmed Strike as part of the Attack action, you can both deal damage and grapple (once per turn); Advantage on attacks against a creature you grapple; moving a grappled creature your size or smaller costs no extra movement.',
    { prereq: any13('str', 'dex') }),
  general('greatWeaponMaster', 'Mestre de Armas Grandes', 'Great Weapon Master', ['str'],
    'Ao acertar com arma Pesada como parte da ação de Ataque, soma o BP ao dano. Depois de um crítico corpo a corpo ou de reduzir uma criatura a 0 PV, faz um ataque com Ação Bônus.',
    'When you hit with a Heavy weapon as part of the Attack action, add your PB to the damage. After a melee critical hit or dropping a creature to 0 HP, make one Bonus Action attack.',
    { prereq: all13('str') }),
  general('heavilyArmored', 'Treinado em Armadura Pesada', 'Heavily Armored', ['str', 'con'],
    'Ganha treinamento com armaduras pesadas.', 'You gain Heavy armor training.',
    { prereq: { proficiency: 'mediumArmor' }, grants: { proficiencies: ['heavyArmor'] } }),
  general('heavyArmorMaster', 'Mestre em Armadura Pesada', 'Heavy Armor Master', ['str', 'con'],
    'Usando armadura pesada, reduz em BP o dano contundente, perfurante e cortante que sofre.',
    'While wearing Heavy armor, reduce Bludgeoning, Piercing, and Slashing damage you take by your PB.',
    { prereq: { proficiency: 'heavyArmor' } }),
  general('inspiringLeader', 'Líder Inspirador', 'Inspiring Leader', ['wis', 'cha'],
    'Ao terminar um Descanso Curto ou Longo, até 6 criaturas a 9 m ganham PV temporários iguais ao seu nível + mod. de SAB ou CAR.',
    'After a Short or Long Rest, up to 6 creatures within 30 feet gain Temporary HP equal to your level + your WIS or CHA modifier.',
    { prereq: any13('wis', 'cha') }),
  general('keenMind', 'Mente Afiada', 'Keen Mind', ['int'],
    'Proficiência (ou Especialização, se já tiver) em Arcanismo, História, Investigação, Natureza ou Religião; pode Estudar com uma Ação Bônus.',
    'Proficiency (or Expertise, if already proficient) in Arcana, History, Investigation, Nature, or Religion; take the Study action as a Bonus Action.',
    { prereq: all13('int'), choices: { skillProfOrExpertise: { count: 1, from: ['arcana', 'history', 'investigation', 'nature', 'religion'] } } }),
  general('lightlyArmored', 'Treinado em Armadura Leve', 'Lightly Armored', ['str', 'dex'],
    'Ganha treinamento com armaduras leves e escudos.', 'You gain Light armor and Shield training.',
    { grants: { proficiencies: ['lightArmor', 'shield'] } }),
  general('mageSlayer', 'Matador de Magos', 'Mage Slayer', ['str', 'dex'],
    'Criaturas que você fere têm Desvantagem para manter Concentração; 1× por Descanso Curto ou Longo, transforma uma falha sua em salvaguarda de INT, SAB ou CAR em sucesso.',
    'Creatures you damage have Disadvantage to maintain Concentration; once per Short or Long Rest, turn a failed INT, WIS, or CHA save of yours into a success.'),
  general('martialWeaponTraining', 'Treinamento com Armas Marciais', 'Martial Weapon Training', ['str', 'dex'],
    'Ganha proficiência com armas marciais.', 'You gain proficiency with Martial weapons.',
    { grants: { proficiencies: ['martialWeapons'] } }),
  general('mediumArmorMaster', 'Mestre em Armadura Média', 'Medium Armor Master', ['str', 'dex'],
    'Com armadura média, soma até +3 de DES na CA (em vez de +2) se tiver DES 16+.',
    'In Medium armor, add up to +3 of your DEX modifier to AC (instead of +2) if your DEX is 16+.',
    { prereq: { proficiency: 'mediumArmor' }, grants: { mediumArmorDexCap: 3 } }),
  general('moderatelyArmored', 'Treinado em Armadura Média', 'Moderately Armored', ['str', 'dex'],
    'Ganha treinamento com armaduras médias.', 'You gain Medium armor training.',
    { prereq: { proficiency: 'lightArmor' }, grants: { proficiencies: ['mediumArmor'] } }),
  general('mountedCombatant', 'Combatente Montado', 'Mounted Combatant', ['str', 'dex', 'wis'],
    'Montado, tem Vantagem contra criaturas desmontadas perto da montaria; a montaria sofre dano só em falha (e nenhum em sucesso) em salvaguardas de DES; pode desviar para si ataques contra a montaria.',
    'While mounted, Advantage against unmounted creatures near your mount; your mount takes no damage on successful DEX saves (half on failures); you can redirect attacks from your mount to yourself.'),
  general('observant', 'Observador', 'Observant', ['int', 'wis'],
    'Proficiência (ou Especialização, se já tiver) em Intuição, Investigação ou Percepção; pode Procurar com uma Ação Bônus.',
    'Proficiency (or Expertise, if already proficient) in Insight, Investigation, or Perception; take the Search action as a Bonus Action.',
    { prereq: any13('int', 'wis'), choices: { skillProfOrExpertise: { count: 1, from: ['insight', 'investigation', 'perception'] } } }),
  general('piercer', 'Perfurador', 'Piercer', ['str', 'dex'],
    '1× por turno, rola de novo um dado de dano perfurante; num crítico perfurante, rola um dado de dano extra.',
    'Once per turn, reroll one piercing damage die; on a piercing critical hit, roll one extra damage die.'),
  general('poisoner', 'Envenenador', 'Poisoner', ['dex', 'int'],
    'Seu dano de veneno ignora resistência. Com o kit de envenenador (proficiência concedida) prepara BP doses; quem é atingido faz salvaguarda de CON (CD 8 + mod. + BP) ou sofre 2d8 de veneno e fica Envenenado.',
    'Your poison damage ignores Resistance. With a Poisoner\'s Kit (proficiency granted) brew PB doses; a creature hit makes a CON save (DC 8 + mod + PB) or takes 2d8 poison and is Poisoned.',
    { grants: { tools: ['poisonersKit'] } }),
  general('polearmMaster', 'Mestre em Armas de Haste', 'Polearm Master', ['str', 'dex'],
    'Com bordão, lança ou arma Pesada de Alcance, ataca com a outra ponta usando a Ação Bônus (1d4 contundente) e faz ataque de Reação quando uma criatura entra no seu alcance.',
    'With a Quarterstaff, Spear, or Heavy Reach weapon, make a Bonus Action butt-end attack (1d4 bludgeoning) and a Reaction attack when a creature enters your reach.',
    { prereq: any13('str', 'dex') }),
  general('resilient', 'Resiliente', 'Resilient', null,
    '+1 em um atributo em que você não tem proficiência de salvaguarda, e ganha proficiência nessa salvaguarda.',
    '+1 to an ability in which you lack saving throw proficiency, and gain proficiency in that saving throw.',
    { asi: { choose: ALL, amount: 1, max: 20, excludeProficientSaves: true }, grants: { savingThrow: 'asi' } }),
  general('ritualCaster', 'Conjurador de Rituais', 'Ritual Caster', MENTAL,
    'Escolha magias de 1º nível com a marca Ritual em número igual ao BP (mais uma quando o BP subir); ficam sempre preparadas. 1× por Descanso Longo, lança uma delas no tempo normal sem gastar espaço.',
    'Choose level 1 Ritual spells equal to your PB (one more whenever it rises); they are always prepared. Once per Long Rest, cast one at its normal time without a slot.',
    { prereq: any13('int', 'wis', 'cha'), choices: { spell: { count: 'pb', level: 1, ritual: true }, spellAbility: 'asi' } }),
  general('sentinel', 'Sentinela', 'Sentinel', ['str', 'dex'],
    'Faz Ataque de Oportunidade quando um inimigo a 1,5 m se Desengaja ou ataca outro alvo; acertar um Ataque de Oportunidade zera o Deslocamento do alvo neste turno.',
    'Make an Opportunity Attack when an enemy within 5 feet Disengages or attacks someone else; an Opportunity Attack hit reduces the target\'s Speed to 0 this turn.',
    { prereq: any13('str', 'dex') }),
  general('shadowTouched', 'Tocado pelas Sombras', 'Shadow-Touched', MENTAL,
    'Aprende Invisibilidade e uma magia de 1º nível de Ilusão ou Necromancia; ambas sempre preparadas e lançáveis 1× por Descanso Longo sem espaço. Usa o atributo aumentado.',
    'Learn Invisibility and one level 1 Illusion or Necromancy spell; both always prepared and castable once per Long Rest without a slot. Uses the increased ability.',
    { grants: { spells: ['invisibility'] }, choices: { spell: { count: 1, level: 1, schools: ['illusion', 'necromancy'] }, spellAbility: 'asi' } }),
  general('sharpshooter', 'Atirador de Elite', 'Sharpshooter', ['dex'],
    'Ataques com arma à distância ignoram meia cobertura e três quartos de cobertura; sem Desvantagem por atirar a 1,5 m de um inimigo nem no alcance longo.',
    'Ranged weapon attacks ignore Half and Three-Quarters Cover; no Disadvantage for firing within 5 feet of an enemy or at long range.',
    { prereq: all13('dex') }),
  general('shieldMaster', 'Mestre em Escudo', 'Shield Master', ['str'],
    'Ao acertar corpo a corpo segurando um Escudo, o alvo faz salvaguarda de FOR (CD 8 + FOR + BP) ou é empurrado 1,5 m ou derrubado (1× por turno). Reação: se passar numa salvaguarda de DES que causa meio dano, não sofre dano.',
    'When you hit in melee while holding a Shield, the target makes a STR save (DC 8 + STR + PB) or is pushed 5 feet or knocked Prone (once per turn). Reaction: on a successful DEX save for half damage, take none.',
    { prereq: { proficiency: 'shield' } }),
  general('skillExpert', 'Especialista em Perícia', 'Skill Expert', ALL,
    'Proficiência em uma perícia à escolha e Especialização em uma perícia na qual você tem proficiência.',
    'Proficiency in one skill of your choice and Expertise in one skill you are proficient in.',
    { choices: { skill: 1, expertise: 1 } }),
  general('skulker', 'Espreitador', 'Skulker', ['dex'],
    'Percepção às Cegas de 3 m; Vantagem em Furtividade para Esconder-se durante o combate; errar um ataque estando escondido não revela sua posição.',
    'Blindsight 10 feet; Advantage on Stealth checks to Hide during combat; missing an attack while hidden doesn\'t reveal you.',
    { prereq: all13('dex'), grants: { senses: { blindsight: 10 } } }),
  general('slasher', 'Retalhador', 'Slasher', ['str', 'dex'],
    '1× por turno, acertar com dano cortante reduz o Deslocamento do alvo em 3 m até seu próximo turno; num crítico cortante, o alvo tem Desvantagem nos ataques até seu próximo turno.',
    'Once per turn, a slashing hit reduces the target\'s Speed by 10 feet until your next turn; on a slashing critical hit, the target has Disadvantage on attacks until your next turn.'),
  general('speedy', 'Veloz', 'Speedy', ['dex', 'con'],
    '+3 m de Deslocamento; ao Disparar, terreno difícil não custa extra neste turno; Ataques de Oportunidade contra você têm Desvantagem.',
    '+10 feet Speed; when you Dash, Difficult Terrain costs no extra movement this turn; Opportunity Attacks against you have Disadvantage.',
    { prereq: any13('dex', 'con'), grants: { speed: 10 } }),
  general('spellSniper', 'Atirador Arcano', 'Spell Sniper', MENTAL,
    'Suas jogadas de ataque mágico não sofrem Desvantagem a 1,5 m de inimigos e ignoram meia cobertura e três quartos de cobertura; magias de ataque com alcance de 3 m+ ganham +18 m.',
    'Your spell attack rolls have no Disadvantage within 5 feet of enemies and ignore Half and Three-Quarters Cover; attack spells with a range of 10+ feet gain +60 feet.',
    { prereq: { spellcasting: true } }),
  general('telekinetic', 'Telecinético', 'Telekinetic', MENTAL,
    'Aprende Mão Mágica (invisível, sem componentes, +9 m de alcance). Ação Bônus: empurra ou puxa uma criatura a 9 m em 1,5 m (salvaguarda de FOR, CD 8 + mod. + BP).',
    'Learn Mage Hand (invisible, no components, +30 feet range). Bonus Action: shove a creature within 30 feet 5 feet toward or away from you (STR save, DC 8 + mod + PB).',
    { grants: { cantrips: ['mageHand'] }, choices: { spellAbility: 'asi' } }),
  general('telepathic', 'Telepático', 'Telepathic', MENTAL,
    'Fala telepaticamente com criaturas a até 18 m. Aprende Detectar Pensamentos, sempre preparada e lançável 1× por Descanso Longo sem espaço.',
    'Speak telepathically to creatures within 60 feet. Learn Detect Thoughts, always prepared and castable once per Long Rest without a slot.',
    { grants: { spells: ['detectThoughts'], telepathy: 60 }, choices: { spellAbility: 'asi' } }),
  general('warCaster', 'Conjurador de Guerra', 'War Caster', MENTAL,
    'Vantagem nas salvaguardas de CON para manter Concentração; pode lançar uma magia de 1 ação como Ataque de Oportunidade; faz componentes somáticos com armas ou escudo nas mãos.',
    'Advantage on CON saves to maintain Concentration; cast a one-action spell as an Opportunity Attack; perform Somatic components with weapons or a Shield in hand.',
    { prereq: { spellcasting: true } }),
  general('weaponMaster', 'Mestre de Armas', 'Weapon Master', ['str', 'dex'],
    'Pode usar a propriedade de maestria de mais um tipo de arma simples ou marcial com a qual tenha proficiência (trocável após um Descanso Longo).',
    'You can use the mastery property of one more kind of Simple or Martial weapon you are proficient with (changeable after a Long Rest).',
    { choices: { weaponMastery: 1 } }),
];

// ---------------------------------------------------------------------------
// 2024 — Estilo de Luta (10): gerados de SHARED.fightingStyle
// ---------------------------------------------------------------------------
const FIGHTING_STYLE_2024 = SHARED.fightingStyle.options
  .filter(o => o.rules !== '2014')
  .map(o => ({
    id: o.id, name: o.name, source: src24(o.id), category: 'fightingStyle', rules: '2024', desc: o.desc,
    prereq: { feature: 'fightingStyle' }, styleId: o.id,
  }));

// ---------------------------------------------------------------------------
// 2024 — Dádivas Épicas (12): nível 19+, +1 com teto 30
// ---------------------------------------------------------------------------
const boon = (id, pt, en, choose, dpt, den, extra = {}) => ({
  id, name: b(pt, en), source: src24(id), category: 'epicBoon', rules: '2024', desc: b(dpt, den),
  ...extra, prereq: { level: 19, ...(extra.prereq || {}) }, asi: plus1(choose, 30),
});

const EPIC_2024 = [
  boon('boonOfCombatProwess', 'Dádiva da Proeza em Combate', 'Boon of Combat Prowess', ALL,
    'Quando errar uma jogada de ataque, pode transformá-la em acerto; depois só volta a usar no início do seu próximo turno.',
    'When you miss with an attack roll, you can hit instead; you can\'t do so again until the start of your next turn.'),
  boon('boonOfDimensionalTravel', 'Dádiva da Viagem Dimensional', 'Boon of Dimensional Travel', ALL,
    'Logo após usar a ação de Ataque ou Magia, teleporta-se até 9 m para um espaço desocupado que consiga ver.',
    'Immediately after taking the Attack or Magic action, teleport up to 30 feet to an unoccupied space you can see.'),
  boon('boonOfEnergyResistance', 'Dádiva da Resistência a Energia', 'Boon of Energy Resistance', ALL,
    'Resistência a 2 tipos de dano entre ácido, frio, fogo, elétrico, necrótico, veneno, psíquico, radiante e trovejante (trocáveis após Descanso Longo). Reação: ao sofrer dano de um deles, força uma criatura a 18 m a uma salvaguarda de DES (CD 8 + CON + BP) ou sofrer 2d12 + CON desse tipo.',
    'Resistance to 2 damage types among acid, cold, fire, lightning, necrotic, poison, psychic, radiant, and thunder (changeable after a Long Rest). Reaction: when you take one of them, a creature within 60 feet makes a DEX save (DC 8 + CON + PB) or takes 2d12 + CON of that type.',
    { choices: { damageType: { count: 2, from: ['acid', 'cold', 'fire', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder'] } } }),
  boon('boonOfFate', 'Dádiva do Destino', 'Boon of Fate', ALL,
    'Quando você ou uma criatura a 18 m tiver sucesso ou falha num Teste de d20, rola 2d4 e soma ou subtrai do resultado; volta ao rolar Iniciativa ou após um descanso.',
    'When you or a creature within 60 feet succeeds or fails a D20 Test, roll 2d4 and add or subtract it; regained when you roll Initiative or finish a rest.'),
  boon('boonOfFortitude', 'Dádiva da Fortitude', 'Boon of Fortitude', ALL,
    '+40 PV máximos; ao recuperar PV, recupera também seu mod. de CON a mais (1× por turno).',
    '+40 Hit Point maximum; when you regain HP, regain extra equal to your CON modifier (once per turn).',
    { grants: { hpMax: 40 } }),
  boon('boonOfIrresistibleOffense', 'Dádiva da Ofensiva Irresistível', 'Boon of Irresistible Offense', ['str', 'dex'],
    'Seu dano contundente, perfurante e cortante ignora Resistência; num 20 natural, causa dano extra igual ao valor do atributo aumentado.',
    'Your Bludgeoning, Piercing, and Slashing damage ignores Resistance; on a natural 20, deal extra damage equal to the increased ability score.'),
  boon('boonOfRecovery', 'Dádiva da Recuperação', 'Boon of Recovery', ALL,
    '1× por Descanso Longo, ao cair a 0 PV fica com 1 PV e recupera metade dos PV máximos. Reserva de 10d10 (volta no Descanso Longo): Ação Bônus para gastar dados e curar.',
    'Once per Long Rest, when you drop to 0 HP you drop to 1 instead and regain half your HP maximum. A pool of 10d10 (Long Rest): Bonus Action to spend dice and heal.'),
  boon('boonOfSkill', 'Dádiva da Perícia', 'Boon of Skill', ALL,
    'Proficiência em todas as perícias e Especialização em uma delas.',
    'Proficiency in all skills and Expertise in one of them.',
    { grants: { allSkills: true }, choices: { expertise: 1 } }),
  boon('boonOfSpeed', 'Dádiva da Velocidade', 'Boon of Speed', ALL,
    '+9 m de Deslocamento; Ação Bônus para Desengajar, que também encerra a condição Agarrado em você.',
    '+30 feet Speed; Bonus Action to Disengage, which also ends the Grappled condition on you.',
    { grants: { speed: 30 } }),
  boon('boonOfSpellRecall', 'Dádiva da Recordação de Magia', 'Boon of Spell Recall', MENTAL,
    'Ao lançar uma magia com espaço de nível 1 a 4, rola 1d4; se o resultado for igual ao nível do espaço, ele não é gasto.',
    'When you cast a spell with a level 1–4 slot, roll 1d4; if the roll equals the slot\'s level, the slot isn\'t expended.',
    { prereq: { spellcasting: true } }),
  boon('boonOfTheNightSpirit', 'Dádiva do Espírito da Noite', 'Boon of the Night Spirit', ALL,
    'Em Penumbra ou Escuridão, fica Invisível com uma Ação Bônus (até agir ou sair dela) e tem Resistência a todo dano, exceto psíquico e radiante.',
    'In Dim Light or Darkness, become Invisible as a Bonus Action (until you act or leave it) and have Resistance to all damage except Psychic and Radiant.'),
  boon('boonOfTruesight', 'Dádiva da Visão Verdadeira', 'Boon of Truesight', ALL,
    'Visão Verdadeira de 18 m.', 'Truesight with a range of 60 feet.',
    { grants: { senses: { truesight: 60 } } }),
];

// ---------------------------------------------------------------------------
// 2014 — talento é regra opcional (substitui um Aumento de Atributo)
// ---------------------------------------------------------------------------
const f14 = (id, pt, en, source, dpt, den, extra = {}) =>
  ({ id, name: b(pt, en), source, category: 'feat', rules: '2014', desc: b(dpt, den), ...extra });
const a14 = (...choose) => ({ asi: plus1(choose) });

const ELVES = ['elf-high', 'elf-wood', 'drow', 'eladrin', 'sea-elf', 'shadar-kai', 'astral-elf', 'elf-pallid', 'elf-mark-shadow'];
const DWARVES = ['dwarf-hill', 'dwarf-mountain', 'duergar', 'dwarf-mark-warding'];
const GNOMES = ['gnome-forest', 'gnome-rock', 'deep-gnome', 'gnome-mark-scribing'];
const HALFLINGS = ['halfling-light', 'halfling-stout', 'halfling-ghostwise', 'halfling-lotusden', 'halfling-mark-healing', 'halfling-mark-hospitality'];
const HUMANS = ['human', 'human-variant', 'human-mark-finding', 'human-mark-handling', 'human-mark-making', 'human-mark-passage', 'human-mark-sentinel'];
const HALF_ELVES = ['half-elf', 'half-elf-variant', 'half-elf-mark-detection', 'half-elf-mark-storm'];
const HALF_ORCS = ['half-orc', 'half-orc-mark-finding'];
const DRAGONBORN = ['dragonborn', 'dragonborn-draconblood', 'dragonborn-ravenite'];
const TIEFLINGS = ['tiefling', 'tiefling-feral', ...['baalzebul', 'dispater', 'fierna', 'glasya', 'levistus', 'mammon', 'mephistopheles', 'zariel'].map(l => `tiefling-${l}`)];
const giant = (type) => ({ level: 4, feats: ['strikeOfTheGiants'], text: b(`Golpe dos Gigantes (${type.pt})`, `Strike of the Giants (${type.en})`) });
const scion = (plane) => ({ level: 4, feats: ['scionOfTheOuterPlanes'], text: b(`Descendente dos Planos Exteriores (${plane.pt})`, `Scion of the Outer Planes (${plane.en})`) });
const robes = (moon) => ({ level: 4, feats: ['initiateOfHighSorcery'], text: b(`Iniciado da Alta Feitiçaria (${moon})`, `Initiate of High Sorcery (${moon})`) });
const knight = { level: 4, feats: ['squireOfSolamnia'] };

const PHB_2014 = [
  f14('actor', 'Ator', 'Actor', 'PHB', 'Vantagem em Enganação e Atuação ao se passar por outra pessoa; imita a fala de pessoas e sons de criaturas.', 'Advantage on Deception and Performance when passing as someone else; mimic speech and creature sounds.', a14('cha')),
  f14('alert', 'Alerta', 'Alert', 'PHB', '+5 na Iniciativa; não pode ser surpreendido enquanto consciente; criaturas ocultas não ganham vantagem ao atacá-lo.', '+5 to Initiative; can\'t be surprised while conscious; hidden attackers gain no advantage against you.', { grants: { initiative: 5 } }),
  f14('athlete', 'Atleta', 'Athlete', 'PHB', 'Levantar-se custa só 1,5 m; escalar não custa movimento extra; salto com corrida após só 1,5 m.', 'Standing up costs only 5 feet; climbing costs no extra movement; running jumps after only 5 feet.', a14('str', 'dex')),
  f14('charger', 'Investida', 'Charger', 'PHB', 'Após usar Disparada, Ação Bônus para um ataque corpo a corpo (+5 de dano) ou empurrar 3 m, se moveu 3 m em linha reta.', 'After Dashing, a Bonus Action melee attack (+5 damage) or a 10-foot shove, if you moved 10 feet in a straight line.'),
  f14('crossbowExpert', 'Especialista em Besta', 'Crossbow Expert', 'PHB', 'Ignora Recarga das bestas; sem desvantagem ao atirar a 1,5 m de um inimigo; após atacar com arma de uma mão, ataque bônus com besta de mão.', 'Ignore crossbows\' loading; no disadvantage firing within 5 feet of an enemy; after a one-handed attack, bonus attack with a hand crossbow.'),
  f14('defensiveDuelist', 'Duelista Defensivo', 'Defensive Duelist', 'PHB', 'Reação com arma de acuidade: +BP na CA contra um ataque corpo a corpo.', 'Reaction while wielding a finesse weapon: +PB AC against one melee attack.', { prereq: all13('dex') }),
  f14('dualWielder', 'Combatente com Duas Armas', 'Dual Wielder', 'PHB', '+1 na CA com uma arma corpo a corpo em cada mão; luta com duas armas mesmo que não sejam leves; saca ou guarda duas armas de uma vez.', '+1 AC while wielding a melee weapon in each hand; two-weapon fighting with non-light weapons; draw or stow two weapons at once.', { grants: { ac: 1 } }),
  f14('dungeonDelver', 'Explorador de Masmorras', 'Dungeon Delver', 'PHB', 'Vantagem para detectar portas secretas e em salvaguardas contra armadilhas; resistência a dano de armadilhas; procura armadilhas em ritmo normal.', 'Advantage to find secret doors and on saves against traps; resistance to trap damage; search for traps at normal pace.'),
  f14('durable', 'Durável', 'Durable', 'PHB', 'Ao rolar Dado de Vida para curar, o mínimo recuperado é 2 × mod. de CON.', 'When rolling a Hit Die to heal, you regain at least twice your CON modifier.', a14('con')),
  f14('elementalAdept', 'Adepto Elemental', 'Elemental Adept', 'PHB', 'Escolha ácido, frio, fogo, elétrico ou trovejante: suas magias ignoram resistência a ele, e 1 nos dados de dano conta como 2. Repetível com outro tipo.', 'Choose acid, cold, fire, lightning, or thunder: your spells ignore resistance to it, and 1s on damage dice count as 2s. Repeatable with a different type.', { prereq: { spellcasting: true }, repeatable: true, repeatKey: 'damageType', choices: { damageType: DAMAGE_ELEMENTAL } }),
  f14('grappler', 'Agarrador', 'Grappler', 'SRD', 'Vantagem nas jogadas de ataque contra uma criatura que você está agarrando; pode tentar imobilizá-la (ambos ficam impedidos).', 'Advantage on attack rolls against a creature you are grappling; you can try to pin it (both of you are restrained).', { prereq: all13('str') }),
  f14('greatWeaponMaster', 'Mestre de Armas Grandes', 'Great Weapon Master', 'PHB', 'Após um crítico ou reduzir uma criatura a 0 PV corpo a corpo, ataque com Ação Bônus. Com arma pesada, pode aceitar −5 no ataque para +10 no dano.', 'After a melee crit or dropping a creature to 0 HP, make a Bonus Action attack. With a heavy weapon, take −5 to hit for +10 damage.'),
  f14('healer', 'Curandeiro', 'Healer', 'PHB', 'Estabilizar com kit de curandeiro deixa a criatura com 1 PV; uma ação com o kit cura 1d6 + 4 + nº de Dados de Vida dela (1× por criatura a cada descanso).', 'Stabilizing with a healer\'s kit leaves the creature at 1 HP; an action with the kit heals 1d6 + 4 + its number of Hit Dice (once per creature per rest).'),
  f14('heavilyArmored', 'Treinado em Armadura Pesada', 'Heavily Armored', 'PHB', 'Proficiência com armaduras pesadas.', 'Proficiency with heavy armor.', { prereq: { proficiency: 'mediumArmor' }, ...a14('str'), grants: { proficiencies: ['heavyArmor'] } }),
  f14('heavyArmorMaster', 'Mestre em Armadura Pesada', 'Heavy Armor Master', 'PHB', 'Com armadura pesada, reduz em 3 o dano contundente, perfurante e cortante de ataques não mágicos.', 'In heavy armor, reduce bludgeoning, piercing, and slashing damage from nonmagical attacks by 3.', { prereq: { proficiency: 'heavyArmor' }, ...a14('str') }),
  f14('inspiringLeader', 'Líder Inspirador', 'Inspiring Leader', 'PHB', 'Discurso de 10 minutos: até 6 criaturas ganham PV temporários iguais ao seu nível + mod. de CAR (1× por criatura a cada descanso).', 'A 10-minute speech: up to 6 creatures gain temporary HP equal to your level + CHA modifier (once per creature per rest).', { prereq: all13('cha') }),
  f14('keenMind', 'Mente Afiada', 'Keen Mind', 'PHB', 'Sempre sabe onde fica o norte e quantas horas faltam para o nascer ou pôr do sol; lembra com precisão de tudo o que viu ou ouviu no último mês.', 'Always know north and the hours until sunrise or sunset; accurately recall anything seen or heard within the past month.', a14('int')),
  f14('lightlyArmored', 'Treinado em Armadura Leve', 'Lightly Armored', 'PHB', 'Proficiência com armaduras leves.', 'Proficiency with light armor.', { ...a14('str', 'dex'), grants: { proficiencies: ['lightArmor'] } }),
  f14('linguist', 'Linguista', 'Linguist', 'PHB', 'Aprende 3 idiomas e cria cifras escritas (decifrar exige teste de INT com CD = seu valor de INT + BP, ou magia).', 'Learn 3 languages and create written ciphers (breaking one needs an INT check with DC = your INT score + PB, or magic).', { ...a14('int'), choices: { language: 3 } }),
  f14('lucky', 'Sortudo', 'Lucky', 'PHB', '3 pontos de sorte por descanso longo: gaste um para rolar um d20 extra num ataque, teste ou salvaguarda seu, ou num ataque contra você, e escolha o resultado.', '3 luck points per long rest: spend one to roll an extra d20 on your attack, check, or save, or on an attack against you, and choose which to use.'),
  f14('mageSlayer', 'Matador de Magos', 'Mage Slayer', 'PHB', 'Reação para atacar quem lança magia a 1,5 m; quem você fere tem desvantagem para manter concentração; vantagem em salvaguardas contra magias lançadas a 1,5 m.', 'Reaction attack against a creature casting within 5 feet; creatures you damage have disadvantage on concentration saves; advantage on saves against spells cast within 5 feet.'),
  f14('magicInitiate', 'Iniciado em Magia', 'Magic Initiate', 'PHB', 'Escolha uma classe (bardo, bruxo, clérigo, druida, feiticeiro ou mago): aprende 2 truques e 1 magia de 1º nível dela, lançável 1× por descanso longo, com o atributo de conjuração dessa classe.', 'Choose a class (bard, cleric, druid, sorcerer, warlock, or wizard): learn 2 cantrips and 1 level 1 spell from it, castable once per long rest, using that class\'s spellcasting ability.', { choices: { spellList: CASTER_LISTS_2014, cantrip: { count: 2, list: 'spellList' }, spell: { count: 1, level: 1, list: 'spellList' } } }),
  f14('martialAdept', 'Adepto Marcial', 'Martial Adept', 'PHB', 'Aprende 2 manobras do Mestre de Batalha e ganha um dado de superioridade (d6), recuperado em descanso curto ou longo.', 'Learn 2 Battle Master maneuvers and gain one superiority die (d6), regained on a short or long rest.', { choices: { maneuver: 2 } }),
  f14('mediumArmorMaster', 'Mestre em Armadura Média', 'Medium Armor Master', 'PHB', 'Armadura média não impõe desvantagem em Furtividade; soma até +3 de DES na CA com ela se tiver DES 16+.', 'Medium armor imposes no Stealth disadvantage; add up to +3 DEX to AC with it if your DEX is 16+.', { prereq: { proficiency: 'mediumArmor' }, grants: { mediumArmorDexCap: 3 } }),
  f14('mobile', 'Móvel', 'Mobile', 'PHB', '+3 m de deslocamento; ao usar Disparada, terreno difícil não custa extra; criaturas que você atacou corpo a corpo não fazem ataque de oportunidade contra você neste turno.', '+10 feet speed; when you Dash, difficult terrain costs no extra; creatures you attack in melee can\'t make opportunity attacks against you that turn.', { grants: { speed: 10 } }),
  f14('moderatelyArmored', 'Treinado em Armadura Média', 'Moderately Armored', 'PHB', 'Proficiência com armaduras médias e escudos.', 'Proficiency with medium armor and shields.', { prereq: { proficiency: 'lightArmor' }, ...a14('str', 'dex'), grants: { proficiencies: ['mediumArmor', 'shield'] } }),
  f14('mountedCombatant', 'Combatente Montado', 'Mounted Combatant', 'PHB', 'Montado, vantagem contra criaturas desmontadas menores que a montaria; pode desviar para si ataques contra a montaria; a montaria ganha evasão.', 'While mounted, advantage against unmounted creatures smaller than your mount; redirect attacks from your mount to yourself; your mount gains evasion.'),
  f14('observant', 'Observador', 'Observant', 'PHB', 'Lê lábios em idiomas que entende; +5 na Percepção e Investigação passivas.', 'Read lips in languages you know; +5 to passive Perception and Investigation.', { ...a14('int', 'wis'), grants: { passiveBonus: { perception: 5, investigation: 5 } } }),
  f14('polearmMaster', 'Mestre em Armas de Haste', 'Polearm Master', 'PHB', 'Com glaive, alabarda ou bordão (e lança, na errata), ataque com Ação Bônus com a outra ponta (1d4); ataque de oportunidade quando uma criatura entra no seu alcance.', 'With a glaive, halberd, or quarterstaff (and spear, per errata), a Bonus Action butt-end attack (1d4); opportunity attack when a creature enters your reach.'),
  f14('resilient', 'Resiliente', 'Resilient', 'PHB', '+1 em um atributo e proficiência nas salvaguardas dele.', '+1 to one ability and proficiency in its saving throws.', { asi: { choose: ALL, amount: 1, max: 20, excludeProficientSaves: true }, grants: { savingThrow: 'asi' } }),
  f14('ritualCaster', 'Conjurador de Rituais', 'Ritual Caster', 'PHB', 'Escolha uma classe conjuradora: ganha um livro de rituais com 2 magias rituais de 1º nível dela e pode copiar outros rituais que encontrar (até metade do seu nível).', 'Choose a spellcasting class: gain a ritual book with 2 of its level 1 ritual spells and copy other rituals you find (up to half your level).', { prereq: any13('int', 'wis'), choices: { spellList: CASTER_LISTS_2014, spell: { count: 2, level: 1, ritual: true, list: 'spellList' } } }),
  f14('savageAttacker', 'Atacante Selvagem', 'Savage Attacker', 'PHB', '1× por turno, rola de novo o dano de um ataque corpo a corpo com arma e usa qualquer um dos resultados.', 'Once per turn, reroll a melee weapon attack\'s damage and use either total.'),
  f14('sentinel', 'Sentinela', 'Sentinel', 'PHB', 'Ataque de oportunidade zera o deslocamento do alvo e funciona mesmo se ele Desengajar; reação para atacar quem, a 1,5 m, ataca outro alvo.', 'Opportunity attacks reduce speed to 0 and work even against Disengage; reaction attack against a creature within 5 feet that attacks someone else.'),
  f14('sharpshooter', 'Atirador de Elite', 'Sharpshooter', 'PHB', 'Sem desvantagem no alcance longo; ignora meia cobertura e três quartos de cobertura; com arma à distância, pode aceitar −5 no ataque para +10 no dano.', 'No disadvantage at long range; ignore half and three-quarters cover; with a ranged weapon, take −5 to hit for +10 damage.'),
  f14('shieldMaster', 'Mestre em Escudo', 'Shield Master', 'PHB', 'Empurrão com escudo como Ação Bônus após atacar; soma a CA do escudo a salvaguardas de DES contra efeitos que só miram você; reação para não sofrer dano em salvaguarda de DES bem-sucedida.', 'Bonus Action shield shove after attacking; add the shield\'s AC to DEX saves against effects that target only you; reaction to take no damage on a successful DEX save.'),
  f14('skilled', 'Habilidoso', 'Skilled', 'PHB', 'Proficiência em qualquer combinação de 3 perícias ou ferramentas.', 'Proficiency in any combination of 3 skills or tools.', { choices: { skillOrTool: 3 } }),
  f14('skulker', 'Espreitador', 'Skulker', 'PHB', 'Pode se esconder estando levemente obscurecido; errar um ataque à distância escondido não revela você; penumbra não atrapalha sua Percepção.', 'You can hide when lightly obscured; missing a ranged attack while hidden doesn\'t reveal you; dim light doesn\'t hinder your Perception.', { prereq: all13('dex') }),
  f14('spellSniper', 'Atirador Arcano', 'Spell Sniper', 'PHB', 'Dobra o alcance de magias com jogada de ataque; elas ignoram meia cobertura e três quartos de cobertura; aprende um truque de ataque de uma classe conjuradora.', 'Double the range of attack-roll spells; they ignore half and three-quarters cover; learn one attack cantrip from a spellcasting class.', { prereq: { spellcasting: true }, choices: { spellList: CASTER_LISTS_2014, cantrip: { count: 1, list: 'spellList', attack: true } } }),
  f14('tavernBrawler', 'Brigão de Taverna', 'Tavern Brawler', 'PHB', 'Proficiência com armas improvisadas; golpe desarmado causa 1d4; após acertar desarmado ou com arma improvisada, pode agarrar com Ação Bônus.', 'Proficiency with improvised weapons; unarmed strikes deal 1d4; after hitting with an unarmed strike or improvised weapon, grapple as a Bonus Action.', { ...a14('str', 'con'), grants: { proficiencies: ['improvisedWeapons'], unarmedDie: '1d4' } }),
  f14('tough', 'Vigoroso', 'Tough', 'PHB', 'PV máximos aumentam em 2 × seu nível, e mais 2 a cada nível.', 'Hit point maximum increases by twice your level, and by 2 more each level.', { grants: { hpPerLevel: 2 } }),
  f14('warCaster', 'Conjurador de Guerra', 'War Caster', 'PHB', 'Vantagem em salvaguardas de CON para manter concentração; componentes somáticos com as mãos ocupadas; lança magia como ataque de oportunidade.', 'Advantage on CON saves to maintain concentration; somatic components with full hands; cast a spell as an opportunity attack.', { prereq: { spellcasting: true } }),
  f14('weaponMaster', 'Mestre de Armas', 'Weapon Master', 'PHB', 'Proficiência com 4 armas simples ou marciais à escolha.', 'Proficiency with 4 simple or martial weapons of your choice.', { ...a14('str', 'dex'), choices: { weapon: { count: 4 } } }),
];

const XGE_2014 = [
  f14('bountifulLuck', 'Sorte Generosa', 'Bountiful Luck', 'XGE', 'Reação: quando um aliado a 9 m tira 1 no d20 de um ataque, teste ou salvaguarda, ele rola de novo.', 'Reaction: when an ally within 30 feet rolls a 1 on a d20 for an attack, check, or save, they reroll.', { prereq: { species: HALFLINGS } }),
  f14('dragonFear', 'Medo Dracônico', 'Dragon Fear', 'XGE', 'Em vez de usar o sopro, ruge: criaturas à escolha a 9 m fazem salvaguarda de SAB (CD 8 + BP + CAR) ou ficam amedrontadas por 1 minuto.', 'Instead of your breath weapon, roar: chosen creatures within 30 feet make a WIS save (DC 8 + PB + CHA) or are frightened for 1 minute.', { prereq: { species: DRAGONBORN }, ...a14('str', 'con', 'cha') }),
  f14('dragonHide', 'Pele de Dragão', 'Dragon Hide', 'XGE', 'Sem armadura, CA 13 + DES; garras retráteis que causam 1d4 + FOR de dano cortante.', 'Without armor, AC 13 + DEX; retractable claws dealing 1d4 + STR slashing.', { prereq: { species: DRAGONBORN }, ...a14('str', 'con', 'cha'), grants: { unarmoredAc: 13 } }),
  f14('drowHighMagic', 'Alta Magia Drow', 'Drow High Magic', 'XGE', 'Detectar Magia à vontade; Levitação e Dissipar Magia 1× por descanso longo cada, com CAR.', 'Detect Magic at will; Levitate and Dispel Magic once per long rest each, using CHA.', { prereq: { species: ['drow'] }, grants: { spells: ['detectMagic', 'levitate', 'dispelMagic'] } }),
  f14('dwarvenFortitude', 'Fortitude Anã', 'Dwarven Fortitude', 'XGE', 'Ao usar a ação Esquivar, pode gastar um Dado de Vida para se curar.', 'When you take the Dodge action, you can spend a Hit Die to heal.', { prereq: { species: DWARVES }, ...a14('con') }),
  f14('elvenAccuracy', 'Precisão Élfica', 'Elven Accuracy', 'XGE', 'Com vantagem num ataque de DES, INT, SAB ou CAR, rola de novo um dos dados.', 'With advantage on a DEX, INT, WIS, or CHA attack roll, reroll one of the dice.', { prereq: { species: [...ELVES, ...HALF_ELVES] }, ...a14('dex', 'int', 'wis', 'cha') }),
  f14('fadeAway', 'Desaparecer', 'Fade Away', 'XGE', 'Reação ao sofrer dano: fica invisível até o fim do seu próximo turno ou até atacar/lançar magia (1× por descanso curto).', 'Reaction when damaged: become invisible until the end of your next turn or until you attack or cast (once per short rest).', { prereq: { species: GNOMES }, ...a14('dex', 'int') }),
  f14('feyTeleportation', 'Teleporte Feérico', 'Fey Teleportation', 'XGE', 'Aprende Silvestre e lança Passo Nebuloso 1× por descanso curto sem espaço (INT).', 'Learn Sylvan and cast Misty Step once per short rest without a slot (INT).', { prereq: { species: ['elf-high'] }, ...a14('int', 'cha'), grants: { spells: ['mistyStep'], languages: ['Sylvan'] } }),
  f14('flamesOfPhlegethos', 'Chamas de Flegetos', 'Flames of Phlegethos', 'XGE', 'Rola de novo os 1 no dano de magias de fogo; ao lançar uma, fica envolto em chamas que iluminam e causam 1d4 de fogo em quem o acertar corpo a corpo.', 'Reroll 1s on fire spell damage; when you cast one, flames wreathe you, shedding light and dealing 1d4 fire to melee attackers.', { prereq: { species: TIEFLINGS }, ...a14('int', 'cha') }),
  f14('infernalConstitution', 'Constituição Infernal', 'Infernal Constitution', 'XGE', 'Resistência a frio e veneno; vantagem em salvaguardas contra ficar envenenado.', 'Resistance to cold and poison; advantage on saves against being poisoned.', { prereq: { species: TIEFLINGS }, ...a14('con'), grants: { resistances: ['cold', 'poison'] } }),
  f14('orcishFury', 'Fúria Órquica', 'Orcish Fury', 'XGE', '1× por descanso curto, rola um dado de dano extra da arma; após usar Resistência Implacável, faz um ataque com a reação.', 'Once per short rest, roll one extra weapon damage die; after using Relentless Endurance, make an attack with your reaction.', { prereq: { species: HALF_ORCS }, ...a14('str', 'con') }),
  f14('prodigy', 'Prodígio', 'Prodigy', 'XGE', 'Ganha proficiência em uma perícia, uma ferramenta e um idioma, e Especialização em uma perícia com proficiência.', 'Gain proficiency in one skill, one tool, and one language, and expertise in one proficient skill.', { prereq: { species: [...HALF_ELVES, ...HALF_ORCS, ...HUMANS] }, choices: { skill: 1, tool: { count: 1 }, language: 1, expertise: 1 } }),
  f14('secondChance', 'Segunda Chance', 'Second Chance', 'XGE', 'Reação quando um ataque o acerta: o atacante rola de novo (1× por descanso curto ou ao rolar iniciativa).', 'Reaction when hit by an attack: the attacker rerolls (once per short rest or initiative).', { prereq: { species: HALFLINGS }, ...a14('dex', 'con', 'cha') }),
  f14('squatNimbleness', 'Agilidade Atarracada', 'Squat Nimbleness', 'XGE', '+1,5 m de deslocamento; proficiência em Acrobacia ou Atletismo; vantagem para escapar de agarrões.', '+5 feet speed; proficiency in Acrobatics or Athletics; advantage to escape grapples.', { prereq: { species: DWARVES, text: b('Anão ou espécie de tamanho Pequeno', 'Dwarf or a Small race') }, ...a14('str', 'dex'), grants: { speed: 5 }, choices: { skill: { count: 1, from: ['acrobatics', 'athletics'] } } }),
  f14('woodElfMagic', 'Magia do Elfo da Floresta', 'Wood Elf Magic', 'XGE', 'Aprende um truque de druida; lança Passos Longos e Passos sem Pegadas 1× por descanso longo cada (SAB).', 'Learn one druid cantrip; cast Longstrider and Pass without Trace once per long rest each (WIS).', { prereq: { species: ['elf-wood'] }, grants: { spells: ['longstrider', 'passWithoutTrace'] }, choices: { cantrip: { count: 1, list: 'druid' } } }),
];

const TCE_2014 = [
  f14('artificerInitiate', 'Iniciado Artífice', 'Artificer Initiate', 'TCE', 'Aprende 1 truque e 1 magia de 1º nível de artífice (INT; a magia 1× por descanso longo sem espaço) e ganha proficiência com uma ferramenta de artesão.', 'Learn 1 artificer cantrip and 1 level 1 artificer spell (INT; the spell once per long rest without a slot) and gain one artisan\'s tool proficiency.', { choices: { cantrip: { count: 1, list: 'artificer' }, spell: { count: 1, level: 1, list: 'artificer' }, tool: { count: 1 } } }),
  f14('chef', 'Chef de Cozinha', 'Chef', 'TCE', 'Proficiência com utensílios de cozinheiro; no descanso curto, cura extra de 1d8 para até 4 + BP criaturas; após descanso longo, prepara BP petiscos que dão PV temporários iguais ao BP.', 'Cook\'s utensils proficiency; on a short rest, extra 1d8 healing for up to 4 + PB creatures; after a long rest, PB treats granting temporary HP equal to PB.', { ...a14('con', 'wis'), grants: { tools: ['cooksUtensils'] } }),
  f14('crusher', 'Esmagador', 'Crusher', 'TCE', '1× por turno, acerto contundente move o alvo 1,5 m; num crítico contundente, ataques contra ele têm vantagem até seu próximo turno.', 'Once per turn, a bludgeoning hit moves the target 5 feet; on a bludgeoning crit, attacks against it have advantage until your next turn.', a14('str', 'con')),
  f14('eldritchAdept', 'Adepto Místico', 'Eldritch Adept', 'TCE', 'Aprende uma Invocação Mística cujo pré-requisito você cumpra (trocável ao subir de nível).', 'Learn one Eldritch Invocation whose prerequisite you meet (swappable on level-up).', { prereq: { spellcasting: true }, choices: { invocation: 1 } }),
  f14('feyTouched', 'Tocado pelas Fadas', 'Fey Touched', 'TCE', 'Aprende Passo Nebuloso e uma magia de 1º nível de Adivinhação ou Encantamento; cada uma 1× por descanso longo sem espaço, com o atributo aumentado.', 'Learn Misty Step and one level 1 Divination or Enchantment spell; each once per long rest without a slot, using the increased ability.', { ...a14(...MENTAL), grants: { spells: ['mistyStep'] }, choices: { spell: { count: 1, level: 1, schools: ['divination', 'enchantment'] }, spellAbility: 'asi' } }),
  f14('fightingInitiate', 'Iniciado em Combate', 'Fighting Initiate', 'TCE', 'Aprende um Estilo de Luta da lista do guerreiro (sem repetir um que já tenha); pode trocá-lo quando ganhar um Aumento de Atributo.', 'Learn one Fighting Style from the fighter list (not one you already have); swap it whenever you gain an Ability Score Improvement.', { prereq: { proficiency: 'martialWeapon' }, choices: { fightingStyle: 1 } }),
  f14('gunner', 'Pistoleiro', 'Gunner', 'TCE', 'Proficiência com armas de fogo; ignora a Recarga delas; sem desvantagem ao atirar a 1,5 m de um inimigo.', 'Firearm proficiency; ignore their loading; no disadvantage firing within 5 feet of an enemy.', { ...a14('dex'), grants: { proficiencies: ['firearms'] } }),
  f14('metamagicAdept', 'Adepto Metamágico', 'Metamagic Adept', 'TCE', 'Aprende 2 opções de Metamagia e ganha 2 pontos de feitiçaria só para elas (voltam no descanso longo).', 'Learn 2 Metamagic options and gain 2 sorcery points usable only for them (regained on a long rest).', { prereq: { spellcasting: true }, choices: { metamagic: 2 } }),
  f14('piercer', 'Perfurador', 'Piercer', 'TCE', '1× por turno, rola de novo um dado de dano perfurante; num crítico perfurante, rola um dado extra.', 'Once per turn, reroll one piercing damage die; on a piercing crit, roll one extra die.', a14('str', 'dex')),
  f14('poisoner', 'Envenenador', 'Poisoner', 'TCE', 'Proficiência com kit de envenenador; seu dano de veneno ignora resistência; aplica veneno com Ação Bônus; o veneno potente causa 2d8 e envenena (CON CD 14).', 'Poisoner\'s kit proficiency; your poison damage ignores resistance; coat a weapon as a Bonus Action; potent poison deals 2d8 and poisons (CON DC 14).', { grants: { tools: ['poisonersKit'] } }),
  f14('shadowTouched', 'Tocado pelas Sombras', 'Shadow Touched', 'TCE', 'Aprende Invisibilidade e uma magia de 1º nível de Ilusão ou Necromancia; cada uma 1× por descanso longo sem espaço, com o atributo aumentado.', 'Learn Invisibility and one level 1 Illusion or Necromancy spell; each once per long rest without a slot, using the increased ability.', { ...a14(...MENTAL), grants: { spells: ['invisibility'] }, choices: { spell: { count: 1, level: 1, schools: ['illusion', 'necromancy'] }, spellAbility: 'asi' } }),
  f14('skillExpert', 'Especialista em Perícia', 'Skill Expert', 'TCE', 'Proficiência em uma perícia e Especialização em uma perícia com proficiência.', 'Proficiency in one skill and expertise in one proficient skill.', { ...a14(...ALL), choices: { skill: 1, expertise: 1 } }),
  f14('slasher', 'Retalhador', 'Slasher', 'TCE', '1× por turno, acerto cortante reduz o deslocamento do alvo em 3 m; num crítico cortante, o alvo tem desvantagem nos ataques até seu próximo turno.', 'Once per turn, a slashing hit reduces the target\'s speed by 10 feet; on a slashing crit, the target has disadvantage on attacks until your next turn.', a14('str', 'dex')),
  f14('telekinetic', 'Telecinético', 'Telekinetic', 'TCE', 'Aprende Mão Mágica (invisível, +9 m de alcance); Ação Bônus para empurrar ou puxar uma criatura 1,5 m (salvaguarda de FOR).', 'Learn Mage Hand (invisible, +30 feet range); Bonus Action to shove a creature 5 feet (STR save).', { ...a14(...MENTAL), grants: { cantrips: ['mageHand'] }, choices: { spellAbility: 'asi' } }),
  f14('telepathic', 'Telepático', 'Telepathic', 'TCE', 'Fala telepaticamente a 18 m; lança Detectar Pensamentos 1× por descanso longo sem espaço.', 'Speak telepathically within 60 feet; cast Detect Thoughts once per long rest without a slot.', { ...a14(...MENTAL), grants: { spells: ['detectThoughts'], telepathy: 60 }, choices: { spellAbility: 'asi' } }),
];

const GIANTS = [
  { id: 'cloud', name: b('Nuvem', 'Cloud') }, { id: 'fire', name: b('Fogo', 'Fire') }, { id: 'frost', name: b('Gelo', 'Frost') },
  { id: 'hill', name: b('Colina', 'Hill') }, { id: 'stone', name: b('Pedra', 'Stone') }, { id: 'storm', name: b('Tempestade', 'Storm') },
];
const PLANES = [
  { id: 'lawful', name: b('Plano Leal', 'Lawful Plane') }, { id: 'evil', name: b('Plano Maligno', 'Evil Plane') },
  { id: 'chaotic', name: b('Plano Caótico', 'Chaotic Plane') }, { id: 'good', name: b('Plano Bondoso', 'Good Plane') },
  { id: 'outlands', name: b('Terras Exteriores', 'the Outlands') },
];
const G = Object.fromEntries(GIANTS.map(g => [g.id, g.name]));
const P = Object.fromEntries(PLANES.map(p => [p.id, p.name]));

const OTHER_2014 = [
  // Eberron (ERLW)
  f14('aberrantDragonmark', 'Marca de Dragão Aberrante', 'Aberrant Dragonmark', 'ERLW', 'Aprende 1 truque e 1 magia de 1º nível de feiticeiro (CON); a magia 1× por descanso curto, gastando um Dado de Vida (que pode ferir você ou quem estiver perto).', 'Learn 1 sorcerer cantrip and 1 level 1 sorcerer spell (CON); cast the spell once per short rest by spending a Hit Die (which may harm you or those nearby).', { prereq: { text: b('Não ter outra marca de dragão', 'No other dragonmark') }, ...a14('con'), choices: { cantrip: { count: 1, list: 'sorcerer' }, spell: { count: 1, level: 1, list: 'sorcerer' } } }),
  f14('revenantBlade', 'Lâmina Retornada', 'Revenant Blade', 'ERLW', 'A cimitarra dupla ganha acuidade para você; +1 na CA empunhando-a com as duas mãos.', 'Your double-bladed scimitar gains finesse; +1 AC while wielding it with two hands.', { prereq: { species: ELVES }, ...a14('str', 'dex'), grants: { ac: 1 } }),
  // Fizban (FTD)
  f14('giftOfTheChromaticDragon', 'Dádiva do Dragão Cromático', 'Gift of the Chromatic Dragon', 'FTD', 'Ação Bônus: infunde uma arma com +1d4 de dano de ácido, frio, fogo, elétrico ou veneno por 1 minuto (1× por descanso longo); reação para ganhar resistência a um desses tipos (BP vezes por descanso longo).', 'Bonus Action: infuse a weapon with +1d4 acid, cold, fire, lightning, or poison damage for 1 minute (once per long rest); reaction to gain resistance to one of those types (PB times per long rest).'),
  f14('giftOfTheGemDragon', 'Dádiva do Dragão de Gema', 'Gift of the Gem Dragon', 'FTD', 'Reação quando uma criatura a 3 m o fere: ela faz salvaguarda de FOR ou sofre 2d8 de dano de força e é empurrada 3 m (BP vezes por descanso longo).', 'Reaction when a creature within 10 feet damages you: it makes a STR save or takes 2d8 force damage and is pushed 10 feet (PB times per long rest).', a14(...MENTAL)),
  f14('giftOfTheMetallicDragon', 'Dádiva do Dragão Metálico', 'Gift of the Metallic Dragon', 'FTD', 'Aprende Curar Ferimentos (1× por descanso longo sem espaço); reação de asas protetoras que soma 1d4 à CA sua ou de um aliado contra um ataque (BP vezes por descanso longo).', 'Learn Cure Wounds (once per long rest without a slot); protective wings reaction that adds 1d4 to your or an ally\'s AC against an attack (PB times per long rest).', { grants: { spells: ['cureWounds'] }, choices: { spellAbility: MENTAL } }),
  // Glory of the Giants (GotG)
  f14('strikeOfTheGiants', 'Golpe dos Gigantes', 'Strike of the Giants', 'GotG', 'Escolha um tipo de gigante: 1× por turno, ao acertar com arma, aplica um efeito extra ligado a ele (dano, empurrão, lentidão etc.), BP vezes por descanso longo.', 'Choose a giant type: once per turn on a weapon hit, apply an extra effect tied to it (damage, push, slow, etc.), PB times per long rest.', { prereq: { text: b('Proficiência com armas marciais', 'Proficiency with martial weapons') }, choices: { variant: GIANTS } }),
  f14('emberOfTheFireGiant', 'Brasa do Gigante de Fogo', 'Ember of the Fire Giant', 'GotG', 'Resistência a fogo; após a ação de Ataque, explosão de chamas ao seu redor (salvaguarda de DES), BP vezes por descanso longo.', 'Fire resistance; after the Attack action, a burst of flame around you (DEX save), PB times per long rest.', { prereq: giant(G.fire), ...a14('str', 'con', 'wis'), grants: { resistances: ['fire'] } }),
  f14('furyOfTheFrostGiant', 'Fúria do Gigante de Gelo', 'Fury of the Frost Giant', 'GotG', 'Resistência a frio; reação quando uma criatura a 9 m o atinge: dano de frio e redução de deslocamento (salvaguarda de CON), BP vezes por descanso longo.', 'Cold resistance; reaction when a creature within 30 feet hits you: cold damage and reduced speed (CON save), PB times per long rest.', { prereq: giant(G.frost), ...a14('str', 'con', 'wis'), grants: { resistances: ['cold'] } }),
  f14('guileOfTheCloudGiant', 'Astúcia do Gigante das Nuvens', 'Guile of the Cloud Giant', 'GotG', 'Reação ao ser atingido: reduz o dano e se teleporta para perto do atacante, BP vezes por descanso longo.', 'Reaction when hit: reduce the damage and teleport near the attacker, PB times per long rest.', { prereq: giant(G.cloud), ...a14('str', 'con', 'cha') }),
  f14('keennessOfTheStoneGiant', 'Perspicácia do Gigante de Pedra', 'Keenness of the Stone Giant', 'GotG', 'Visão no escuro de 18 m; Ação Bônus para arremessar uma pedra que causa dano e pode derrubar (salvaguarda de FOR), BP vezes por descanso longo.', 'Darkvision 60 feet; Bonus Action to hurl a rock that deals damage and may knock prone (STR save), PB times per long rest.', { prereq: giant(G.stone), ...a14('str', 'con', 'wis'), grants: { senses: { darkvision: 60 } } }),
  f14('soulOfTheStormGiant', 'Alma do Gigante da Tempestade', 'Soul of the Storm Giant', 'GotG', 'Ação Bônus: aura de tempestade por 1 minuto que dificulta o movimento dos inimigos ao redor e dá resistência a elétrico e trovejante, BP vezes por descanso longo.', 'Bonus Action: a storm aura for 1 minute that hinders nearby enemies\' movement and grants lightning and thunder resistance, PB times per long rest.', { prereq: giant(G.storm), ...a14('str', 'con', 'wis') }),
  f14('vigorOfTheHillGiant', 'Vigor do Gigante da Colina', 'Vigor of the Hill Giant', 'GotG', 'Ao gastar Dados de Vida, cura mais; resiste a ser empurrado ou derrubado.', 'Heal more when spending Hit Dice; resist being pushed or knocked prone.', { prereq: giant(G.hill), ...a14('str', 'con', 'wis') }),
  f14('runeShaper', 'Moldador de Runas', 'Rune Shaper', 'GotG', 'Aprende Compreender Idiomas e inscreve runas que concedem magias de uma lista fixa (1 runa; 2 no nível 5; 3 no nível 9), cada uma 1× por descanso longo.', 'Learn Comprehend Languages and inscribe runes that grant spells from a fixed list (1 rune; 2 at level 5; 3 at level 9), each once per long rest.', { prereq: { text: b('Conjurador, ou antecedente Entalhador de Runas', 'Spellcasting, or the Rune Carver background') }, grants: { spells: ['comprehendLanguages'] }, choices: { spellAbility: MENTAL } }),
  // Planescape (SatO)
  f14('scionOfTheOuterPlanes', 'Descendente dos Planos Exteriores', 'Scion of the Outer Planes', 'SatO', 'Escolha um plano de afinidade: ganha a resistência e o truque ligados a ele.', 'Choose an affinity plane: gain the resistance and cantrip tied to it.', { prereq: { text: b('Campanha em Planescape', 'Planescape campaign') }, choices: { variant: PLANES, spellAbility: MENTAL } }),
  f14('agentOfOrder', 'Agente da Ordem', 'Agent of Order', 'SatO', 'Golpe de estase: ao acertar, causa dano de energia extra e pode deixar o alvo impedido, BP vezes por descanso longo.', 'Stasis strike: on a hit, deal extra force damage and possibly restrain the target, PB times per long rest.', { prereq: scion(P.lawful), ...a14(...ALL) }),
  f14('balefulScion', 'Descendente Funesto', 'Baleful Scion', 'SatO', 'Ao acertar, causa dano necrótico extra e recupera PV, BP vezes por descanso longo.', 'On a hit, deal extra necrotic damage and regain HP, PB times per long rest.', { prereq: scion(P.evil), ...a14(...ALL) }),
  f14('cohortOfChaos', 'Coorte do Caos', 'Cohort of Chaos', 'SatO', 'Ao tirar 1 ou 20 numa jogada de ataque ou salvaguarda, dispara um lampejo caótico de efeito aleatório (d4) que dura até o fim do seu próximo turno.', 'When you roll a 1 or 20 on an attack roll or saving throw, a random chaotic flare (d4) triggers and lasts until the end of your next turn.', { prereq: scion(P.chaotic), ...a14(...ALL) }),
  f14('outlandsEnvoy', 'Emissário das Terras Exteriores', 'Outlands Envoy', 'SatO', 'Lança Passo Nebuloso e Idiomas 1× por descanso longo cada, sem espaço.', 'Cast Misty Step and Tongues once per long rest each, without a slot.', { prereq: scion(P.outlands), ...a14(...ALL), grants: { spells: ['mistyStep', 'tongues'] } }),
  f14('planarWanderer', 'Andarilho Planar', 'Planar Wanderer', 'SatO', 'Ao fim de cada descanso longo, escolhe resistência a ácido, frio ou fogo até o próximo; sente portais próximos e consegue forçar a abertura deles.', 'After each long rest, choose resistance to acid, cold, or fire until the next one; sense nearby portals and force them open.', { prereq: { level: 4, feats: ['scionOfTheOuterPlanes'] }, choices: { damageType: ['acid', 'cold', 'fire'] } }),
  f14('righteousHeritor', 'Herdeiro Justo', 'Righteous Heritor', 'SatO', 'Reação para reduzir em 1d10 + BP o dano sofrido por você ou uma criatura a 9 m, BP vezes por descanso longo.', 'Reaction to reduce damage taken by you or a creature within 30 feet by 1d10 + PB, PB times per long rest.', { prereq: scion(P.good), ...a14(...ALL) }),
  // Strixhaven (SCC)
  f14('strixhavenInitiate', 'Iniciado de Strixhaven', 'Strixhaven Initiate', 'SCC', 'Escolha um colégio de Strixhaven: aprende 2 truques e 1 magia de 1º nível das listas dele (magia 1× por descanso longo sem espaço).', 'Choose a Strixhaven college: learn 2 cantrips and 1 level 1 spell from its lists (spell once per long rest without a slot).', {
    choices: {
      variant: [
        { id: 'lorehold', name: b('Lorehold', 'Lorehold') }, { id: 'prismari', name: b('Prismari', 'Prismari') },
        { id: 'quandrix', name: b('Quandrix', 'Quandrix') }, { id: 'silverquill', name: b('Silverquill', 'Silverquill') },
        { id: 'witherbloom', name: b('Witherbloom', 'Witherbloom') },
      ],
      spellAbility: MENTAL, cantrip: { count: 2 }, spell: { count: 1, level: 1 },
    },
  }),
  f14('strixhavenMascot', 'Mascote de Strixhaven', 'Strixhaven Mascot', 'SCC', 'Invoca um familiar mascote do seu colégio e pode trocar de lugar com ele.', 'Summon a mascot familiar of your college and swap places with it.', { prereq: { level: 4, feats: ['strixhavenInitiate'] } }),
  // Book of Many Things (BoMT)
  f14('cartomancer', 'Cartomante', 'Cartomancer', 'BoMT', 'Aprende Prestidigitação; após um descanso longo, guarda uma magia numa carta para lançá-la depois como Ação Bônus.', 'Learn Prestidigitation; after a long rest, store a spell in a card to cast it later as a Bonus Action.', { prereq: { level: 4, spellcasting: true }, grants: { cantrips: ['prestidigitation'] } }),
  // Dragonlance (DSotDQ)
  f14('initiateOfHighSorcery', 'Iniciado da Alta Feitiçaria', 'Initiate of High Sorcery', 'DSotDQ', 'Escolha uma lua (Nuitari, Lunitari ou Solinari): aprende um truque de mago e magias ligadas à lua, lançáveis 1× por descanso longo.', 'Choose a moon (Nuitari, Lunitari, or Solinari): learn a wizard cantrip and moon-linked spells, castable once per long rest.', {
    prereq: { text: b('Campanha em Dragonlance; feiticeiro, mago ou antecedente Mago da Alta Feitiçaria', 'Dragonlance campaign; sorcerer, wizard, or Mage of High Sorcery background') },
    choices: { variant: [{ id: 'nuitari', name: b('Nuitari', 'Nuitari') }, { id: 'lunitari', name: b('Lunitari', 'Lunitari') }, { id: 'solinari', name: b('Solinari', 'Solinari') }], cantrip: { count: 1, list: 'wizard' }, spellAbility: MENTAL },
  }),
  f14('adeptOfTheBlackRobes', 'Adepto dos Mantos Negros', 'Adept of the Black Robes', 'DSotDQ', 'Magia ambiciosa: ao lançar magia com espaço, pode causar dano extra a uma criatura sacrificando PV próprios.', 'Ambitious magic: when you cast with a slot, you can deal extra damage to a creature by spending your own HP.', { prereq: robes('Nuitari'), ...a14(...MENTAL) }),
  f14('adeptOfTheRedRobes', 'Adepto dos Mantos Vermelhos', 'Adept of the Red Robes', 'DSotDQ', 'Equilíbrio mágico: pode tratar um d20 baixo em teste ou ataque como 10, BP vezes por descanso longo.', 'Magical balance: treat a low d20 on a check or attack as a 10, PB times per long rest.', { prereq: robes('Lunitari'), ...a14(...MENTAL) }),
  f14('adeptOfTheWhiteRobes', 'Adepto dos Mantos Brancos', 'Adept of the White Robes', 'DSotDQ', 'Proteção mágica: ao lançar magia com espaço, pode reduzir o dano que um aliado sofrerá.', 'Protective ward: when you cast with a slot, you can reduce damage an ally will take.', { prereq: robes('Solinari'), ...a14(...MENTAL) }),
  f14('divinelyFavored', 'Favorecido pelos Deuses', 'Divinely Favored', 'DSotDQ', 'Aprende um truque de clérigo e Augúrio, além de uma magia ligada ao seu alinhamento, cada uma 1× por descanso longo.', 'Learn a cleric cantrip and Augury, plus a spell tied to your alignment, each once per long rest.', { prereq: { text: b('Campanha em Dragonlance', 'Dragonlance campaign') }, grants: { spells: ['augury'] }, choices: { cantrip: { count: 1, list: 'cleric' }, spellAbility: MENTAL } }),
  f14('squireOfSolamnia', 'Escudeiro de Solâmnia', 'Squire of Solamnia', 'DSotDQ', 'Golpe preciso: vantagem num ataque com arma e +1d8 de dano se acertar, BP vezes por descanso longo; montar ou desmontar custa pouco movimento.', 'Precise strike: advantage on a weapon attack and +1d8 damage on a hit, PB times per long rest; mounting or dismounting costs little movement.', { prereq: { text: b('Campanha em Dragonlance; guerreiro, paladino ou antecedente Cavaleiro de Solâmnia', 'Dragonlance campaign; fighter, paladin, or Knight of Solamnia background') } }),
  f14('knightOfTheCrown', 'Cavaleiro da Coroa', 'Knight of the Crown', 'DSotDQ', 'Ação Bônus de comando: aliados podem usar a reação para atacar, BP vezes por descanso longo.', 'Bonus Action command: allies can use their reaction to attack, PB times per long rest.', { prereq: knight, ...a14('str', 'dex', 'con') }),
  f14('knightOfTheRose', 'Cavaleiro da Rosa', 'Knight of the Rose', 'DSotDQ', 'Ação Bônus para reanimar um aliado com PV temporários, BP vezes por descanso longo.', 'Bonus Action to bolster an ally with temporary HP, PB times per long rest.', { prereq: knight, ...a14('con', 'wis', 'cha') }),
  f14('knightOfTheSword', 'Cavaleiro da Espada', 'Knight of the Sword', 'DSotDQ', 'Golpe desmoralizante: ao acertar, pode deixar o alvo amedrontado, BP vezes por descanso longo.', 'Demoralizing strike: on a hit, you can frighten the target, PB times per long rest.', { prereq: knight, ...a14(...MENTAL) }),
  // Sword Coast (SCAG)
  f14('svirfneblinMagic', 'Magia Svirfneblin', 'Svirfneblin Magic', 'SCAG', 'Lança Indetectável em si à vontade; Cegueira/Surdez, Nublar e Disfarçar-se 1× por descanso longo cada (INT).', 'Cast Nondetection on yourself at will; Blindness/Deafness, Blur, and Disguise Self once per long rest each (INT).', { prereq: { species: ['deep-gnome'] }, grants: { spells: ['nondetection', 'blindnessDeafness', 'blur', 'disguiseSelf'] } }),
];

// Talentos 2014 com o mesmo nome de um talento 2024 ganham o sufixo `2014`.
const IDS_2024 = new Set([...ORIGIN_2024, ...GENERAL_2024, ...FIGHTING_STYLE_2024, ...EPIC_2024].map(f => f.id));
const FEATS_2014 = [...PHB_2014, ...XGE_2014, ...TCE_2014, ...OTHER_2014]
  .map(f => (IDS_2024.has(f.id) ? { ...f, id: `${f.id}2014`, base: f.id } : f));

export const FEATS = [...ORIGIN_2024, ...GENERAL_2024, ...FIGHTING_STYLE_2024, ...EPIC_2024, ...FEATS_2014];

const BY_ID = new Map(FEATS.map(f => [f.id, f]));

/** Talentos de uma versão de regras ('2014' | '2024'). */
export const featsFor = (rules) => FEATS.filter(f => f.rules === (rules === '2024' ? '2024' : '2014'));

/**
 * Talento pelo id. Com `rules`, aceita também o id "sem versão"
 * (findFeat('alert', '2014') → alert2014).
 */
export function findFeat(id, rules = null) {
  const direct = BY_ID.get(id);
  if (direct && (!rules || direct.rules === rules)) return direct;
  if (!rules) return null;
  const base = direct?.base || id;
  return FEATS.find(f => f.rules === rules && (f.base === base || (f.id === base && !f.base))) || null;
}
