// Pools usados por mais de uma classe. Formato em README.md.
// Uma classe usa com `pools: { fightingStyle: SHARED.fightingStyle }` ou compõe
// `{ ...SHARED.fightingStyle, options: [...SHARED.fightingStyle.options, extra] }`.
//
// Campos extras (além do contrato do README), ignorados por options.js:
//
// fightingStyle.options[]:
//   classes2014: ['fighter', ...]  classes que têm o estilo na lista de 2014
//                                  (em 2024 todo estilo vale para quem tem a
//                                  característica Estilo de Luta: F/P/R).
//   source2014: 'TCE'              fonte da versão 2014 quando difere de `source`.
//   effect: { ... }                efeito estruturado para cálculo futuro. Chaves:
//     acBonusArmored: n            +n na CA usando armadura leve/média/pesada
//     rangedAttackBonus: n         +n no ataque com arma à distância
//     oneHandedDamageBonus: n      +n no dano de arma corpo a corpo em uma mão, sem outra arma
//     thrownDamageBonus: n         +n no dano de ataque à distância com arma de Arremesso
//     thrownDrawFree: true         (2014) saca a arma de arremesso como parte do ataque
//     damageDieFloor: n            dados de dano abaixo de n contam como n (arma de duas
//                                  mãos/versátil empunhada com as duas mãos, corpo a corpo)
//     damageRerollBelow: n         (2014) rola de novo dados de dano < n uma vez (idem)
//     lightExtraAttackAbilityMod: true  soma o mod. de atributo ao dano do ataque extra Leve
//     blindsight: ft               percepção às cegas
//     unarmedDie: '1d6', unarmedDieFree: '1d8', grappleDamage: '1d4'
//                                  golpe desarmado (dado com as mãos livres) e dano no agarrado
//     reaction: 'interception' | 'protection' | 'protection2014'   só lembrete na ficha
//     maneuvers: n, superiorityDice: { count, die, recharge }       (Técnica Superior)
//
// weaponMastery.options[]: uma opção por arma (id = id da arma em srd.js/items.js).
//   mastery: 'topple' …            id da propriedade (ver SHARED.masteryProperties)
//   category: 'simple' | 'martial'; melee: true | false
//   props: [...]                   propriedades 2024 (ids como em items.js)
//   damage, dmgType, range         números 2024 (referência; srd.js/items.js têm os de 2014)
//   firearm: true                  armas de fogo
//
// Os efeitos de estilo e a maestria são aplicados na ficha por
// src/progression/fighting-styles.js.
const b = (pt, en) => ({ pt, en });

// ---------------------------------------------------------------------------
// Propriedades de maestria (SRD 5.2.1)
// ---------------------------------------------------------------------------
const MASTERY = {
  cleave: {
    name: b('Trespassar', 'Cleave'),
    desc: b('Ao acertar um ataque corpo a corpo, pode fazer outro ataque com a mesma arma contra uma segunda criatura a até 1,5 m da primeira e ao seu alcance; esse dano não soma o modificador de atributo (a menos que seja negativo). 1×/turno.',
      'On a melee hit, you can make another attack with the same weapon against a second creature within 5 feet of the first and within your reach; that damage adds no ability modifier unless it is negative. Once per turn.'),
  },
  graze: {
    name: b('Raspar', 'Graze'),
    desc: b('Se errar o ataque, causa dano igual ao modificador de atributo usado no ataque, do mesmo tipo da arma (só aumenta aumentando o modificador).',
      'If your attack misses, deal damage equal to the ability modifier used for the attack, of the weapon\'s damage type (increased only by raising that modifier).'),
  },
  nick: {
    name: b('Talho', 'Nick'),
    desc: b('O ataque extra da propriedade Leve pode ser feito como parte da ação de Ataque, em vez de gastar a Ação Bônus. 1×/turno.',
      'You can make the Light property\'s extra attack as part of the Attack action instead of as a Bonus Action. Once per turn.'),
  },
  push: {
    name: b('Empurrar', 'Push'),
    desc: b('Ao acertar, pode empurrar a criatura (Grande ou menor) até 3 m em linha reta para longe de você.',
      'On a hit, you can push the creature (Large or smaller) up to 10 feet straight away from you.'),
  },
  sap: {
    name: b('Enfraquecer', 'Sap'),
    desc: b('Ao acertar, a criatura tem Desvantagem na próxima jogada de ataque dela antes do início do seu próximo turno.',
      'On a hit, the creature has Disadvantage on its next attack roll before the start of your next turn.'),
  },
  slow: {
    name: b('Lentidão', 'Slow'),
    desc: b('Ao acertar e causar dano, reduz o Deslocamento da criatura em 3 m até o início do seu próximo turno (não passa de 3 m, mesmo com vários acertos).',
      'On a hit that deals damage, reduce the creature\'s Speed by 10 feet until the start of your next turn (no more than 10 feet in total).'),
  },
  topple: {
    name: b('Derrubar', 'Topple'),
    desc: b('Ao acertar, pode forçar uma salvaguarda de Constituição (CD 8 + mod. usado no ataque + BP); se falhar, a criatura fica Caída.',
      'On a hit, you can force a Constitution saving throw (DC 8 + the attack\'s ability modifier + PB); on a failure the creature has the Prone condition.'),
  },
  vex: {
    name: b('Irritar', 'Vex'),
    desc: b('Ao acertar e causar dano, você tem Vantagem na sua próxima jogada de ataque contra essa criatura antes do fim do seu próximo turno.',
      'On a hit that deals damage, you have Advantage on your next attack roll against that creature before the end of your next turn.'),
  },
};

// ---------------------------------------------------------------------------
// Armas e suas maestrias. [id, pt, en, category, melee, damage, dmgType, props, range, mastery, source?]
// ---------------------------------------------------------------------------
const W = [
  // Simples, corpo a corpo
  ['club', 'Clava', 'Club', 'simple', true, '1d4', 'bludgeoning', ['light'], null, 'slow'],
  ['dagger', 'Adaga', 'Dagger', 'simple', true, '1d4', 'piercing', ['finesse', 'light', 'thrown'], '20/60', 'nick'],
  ['greatclub', 'Clava Grande', 'Greatclub', 'simple', true, '1d8', 'bludgeoning', ['two-handed'], null, 'push'],
  ['handaxe', 'Machadinha', 'Handaxe', 'simple', true, '1d6', 'slashing', ['light', 'thrown'], '20/60', 'vex'],
  ['javelin', 'Azagaia', 'Javelin', 'simple', true, '1d6', 'piercing', ['thrown'], '30/120', 'slow'],
  ['lightHammer', 'Martelo Leve', 'Light Hammer', 'simple', true, '1d4', 'bludgeoning', ['light', 'thrown'], '20/60', 'nick'],
  ['mace', 'Maça', 'Mace', 'simple', true, '1d6', 'bludgeoning', [], null, 'sap'],
  ['quarterstaff', 'Bordão', 'Quarterstaff', 'simple', true, '1d6', 'bludgeoning', ['versatile'], null, 'topple'],
  ['sickle', 'Foice Curta', 'Sickle', 'simple', true, '1d4', 'slashing', ['light'], null, 'nick'],
  ['spear', 'Lança', 'Spear', 'simple', true, '1d6', 'piercing', ['thrown', 'versatile'], '20/60', 'sap'],
  // Simples, à distância
  ['dart', 'Dardo', 'Dart', 'simple', false, '1d4', 'piercing', ['finesse', 'thrown'], '20/60', 'vex'],
  ['crossbowLight', 'Besta Leve', 'Light Crossbow', 'simple', false, '1d8', 'piercing', ['ammo', 'loading', 'two-handed'], '80/320', 'slow'],
  ['shortbow', 'Arco Curto', 'Shortbow', 'simple', false, '1d6', 'piercing', ['ammo', 'two-handed'], '80/320', 'vex'],
  ['sling', 'Funda', 'Sling', 'simple', false, '1d4', 'bludgeoning', ['ammo'], '30/120', 'slow'],
  // Marciais, corpo a corpo
  ['battleaxe', 'Machado de Batalha', 'Battleaxe', 'martial', true, '1d8', 'slashing', ['versatile'], null, 'topple'],
  ['flail', 'Mangual', 'Flail', 'martial', true, '1d8', 'bludgeoning', [], null, 'sap'],
  ['glaive', 'Glaive', 'Glaive', 'martial', true, '1d10', 'slashing', ['heavy', 'reach', 'two-handed'], null, 'graze'],
  ['greataxe', 'Machado Grande', 'Greataxe', 'martial', true, '1d12', 'slashing', ['heavy', 'two-handed'], null, 'cleave'],
  ['greatsword', 'Espada Grande', 'Greatsword', 'martial', true, '2d6', 'slashing', ['heavy', 'two-handed'], null, 'graze'],
  ['halberd', 'Alabarda', 'Halberd', 'martial', true, '1d10', 'slashing', ['heavy', 'reach', 'two-handed'], null, 'cleave'],
  ['lance', 'Lança de Montaria', 'Lance', 'martial', true, '1d10', 'piercing', ['heavy', 'reach', 'two-handed'], null, 'topple'],
  ['longsword', 'Espada Longa', 'Longsword', 'martial', true, '1d8', 'slashing', ['versatile'], null, 'sap'],
  ['maul', 'Marreta', 'Maul', 'martial', true, '2d6', 'bludgeoning', ['heavy', 'two-handed'], null, 'topple'],
  ['morningstar', 'Maça-estrela', 'Morningstar', 'martial', true, '1d8', 'piercing', [], null, 'sap'],
  ['pike', 'Pique', 'Pike', 'martial', true, '1d10', 'piercing', ['heavy', 'reach', 'two-handed'], null, 'push'],
  ['rapier', 'Rapieira', 'Rapier', 'martial', true, '1d8', 'piercing', ['finesse'], null, 'vex'],
  ['scimitar', 'Cimitarra', 'Scimitar', 'martial', true, '1d6', 'slashing', ['finesse', 'light'], null, 'nick'],
  ['shortsword', 'Espada Curta', 'Shortsword', 'martial', true, '1d6', 'piercing', ['finesse', 'light'], null, 'vex'],
  ['trident', 'Tridente', 'Trident', 'martial', true, '1d8', 'piercing', ['thrown', 'versatile'], '20/60', 'topple'],
  ['warhammer', 'Martelo de Guerra', 'Warhammer', 'martial', true, '1d8', 'bludgeoning', ['versatile'], null, 'push'],
  ['warPick', 'Picareta de Guerra', 'War Pick', 'martial', true, '1d8', 'piercing', ['versatile'], null, 'sap'],
  ['whip', 'Chicote', 'Whip', 'martial', true, '1d4', 'slashing', ['finesse', 'reach'], null, 'slow'],
  // Marciais, à distância
  ['blowgun', 'Zarabatana', 'Blowgun', 'martial', false, '1', 'piercing', ['ammo', 'loading'], '25/100', 'vex'],
  ['crossbowHand', 'Besta de Mão', 'Hand Crossbow', 'martial', false, '1d6', 'piercing', ['ammo', 'light', 'loading'], '30/120', 'vex'],
  ['crossbowHeavy', 'Besta Pesada', 'Heavy Crossbow', 'martial', false, '1d10', 'piercing', ['ammo', 'heavy', 'loading', 'two-handed'], '100/400', 'push'],
  ['longbow', 'Arco Longo', 'Longbow', 'martial', false, '1d8', 'piercing', ['ammo', 'heavy', 'two-handed'], '150/600', 'slow'],
  ['musket', 'Mosquete', 'Musket', 'martial', false, '1d12', 'piercing', ['ammo', 'loading', 'two-handed'], '40/120', 'slow'],
  ['pistol', 'Pistola', 'Pistol', 'martial', false, '1d10', 'piercing', ['ammo', 'loading'], '30/90', 'vex'],
  // Armas de fogo do Guia do Mestre 2024 (fora do SRD; só com o mestre liberando)
  ['revolver', 'Revólver', 'Revolver', 'martial', false, '2d8', 'piercing', ['ammo', 'reload'], '40/120', 'sap', 'DMG24'],
  ['pistolAutomatic', 'Pistola Semiautomática', 'Semiautomatic Pistol', 'martial', false, '2d6', 'piercing', ['ammo', 'reload'], '50/150', 'vex', 'DMG24'],
  ['huntingRifle', 'Rifle de Caça', 'Hunting Rifle', 'martial', false, '2d10', 'piercing', ['ammo', 'reload', 'two-handed'], '80/240', 'slow', 'DMG24'],
  ['automaticRifle', 'Rifle Automático', 'Automatic Rifle', 'martial', false, '2d8', 'piercing', ['ammo', 'burst-fire', 'reload', 'two-handed'], '80/240', 'slow', 'DMG24'],
  ['shotgun', 'Espingarda', 'Shotgun', 'martial', false, '2d8', 'piercing', ['ammo', 'reload', 'two-handed'], '30/90', 'push', 'DMG24'],
  ['laserPistol', 'Pistola Laser', 'Laser Pistol', 'martial', false, '3d6', 'radiant', ['ammo', 'reload'], '40/120', 'vex', 'DMG24'],
  ['laserRifle', 'Rifle Laser', 'Laser Rifle', 'martial', false, '3d8', 'radiant', ['ammo', 'reload', 'two-handed'], '100/300', 'slow', 'DMG24'],
  ['antimatterRifle', 'Rifle de Antimatéria', 'Antimatter Rifle', 'martial', false, '6d8', 'necrotic', ['ammo', 'reload', 'two-handed'], '120/360', 'sap', 'DMG24'],
];

const FIREARMS = new Set(['musket', 'pistol', 'revolver', 'pistolAutomatic', 'huntingRifle', 'automaticRifle', 'shotgun', 'laserPistol', 'laserRifle', 'antimatterRifle']);
const CAT = { simple: b('Simples', 'Simple'), martial: b('Marcial', 'Martial') };
const REACH = { true: b('corpo a corpo', 'melee'), false: b('à distância', 'ranged') };

const weaponOption = ([id, pt, en, category, melee, damage, dmgType, props, range, mastery, source = 'SRD']) => {
  const m = MASTERY[mastery];
  const kind = (lang) => `${CAT[category][lang]} ${REACH[melee][lang]}, ${damage}`;
  return {
    id, name: b(pt, en), source, rules: '2024',
    desc: b(`${m.name.pt} (${m.name.en}): ${m.desc.pt} Arma: ${kind('pt')}.`, `${m.name.en}: ${m.desc.en} Weapon: ${kind('en')}.`),
    mastery, category, melee, props, damage, dmgType,
    ...(range ? { range } : {}),
    ...(FIREARMS.has(id) ? { firearm: true } : {}),
  };
};

// ---------------------------------------------------------------------------
// Estilos de Luta
// ---------------------------------------------------------------------------
const FPR = ['fighter', 'paladin', 'ranger'];
const FIGHTING_STYLES = [
  {
    id: 'archery', name: b('Arquearia', 'Archery'), source: 'SRD', classes2014: ['fighter', 'ranger'],
    desc: b('+2 nas jogadas de ataque feitas com armas de ataque à distância.', '+2 bonus to attack rolls you make with Ranged weapons.'),
    effect: { rangedAttackBonus: 2 },
  },
  {
    id: 'blindFighting', name: b('Luta às Cegas', 'Blind Fighting'), source: 'PHB24', source2014: 'TCE', classes2014: FPR,
    desc: b('Você tem Percepção às Cegas de 3 m: vê o que não estiver atrás de Cobertura Total, mesmo Cego ou no escuro, e enxerga criaturas Invisíveis nesse alcance (a menos que se escondam de você).',
      'You have Blindsight with a range of 10 feet: you see anything not behind Total Cover, even while Blinded or in Darkness, including Invisible creatures in range (unless they hide from you).'),
    effect: { blindsight: 10 },
  },
  {
    id: 'defense', name: b('Defesa', 'Defense'), source: 'SRD', classes2014: FPR,
    desc: b('+1 na CA enquanto estiver usando armadura leve, média ou pesada.', '+1 bonus to AC while you are wearing Light, Medium, or Heavy armor.'),
    effect: { acBonusArmored: 1 },
  },
  {
    id: 'dueling', name: b('Duelo', 'Dueling'), source: 'SRD', classes2014: FPR,
    desc: b('+2 nas jogadas de dano com uma arma corpo a corpo empunhada em uma mão, se você não estiver empunhando nenhuma outra arma.',
      '+2 bonus to damage rolls with a Melee weapon held in one hand while you are wielding no other weapons.'),
    effect: { oneHandedDamageBonus: 2 },
  },
  {
    id: 'greatWeaponFighting', name: b('Combate com Armas Grandes', 'Great Weapon Fighting'), source: 'SRD', rules: '2024',
    desc: b('Ao rolar dano de um ataque corpo a corpo com arma empunhada com as duas mãos (Duas Mãos ou Versátil), qualquer 1 ou 2 nos dados de dano conta como 3.',
      'When you roll damage for a melee attack with a weapon held in two hands (Two-Handed or Versatile), treat any 1 or 2 on a damage die as a 3.'),
    effect: { damageDieFloor: 3 },
  },
  {
    id: 'greatWeaponFighting2014', name: b('Combate com Armas Grandes', 'Great Weapon Fighting'), source: 'SRD', rules: '2014', classes2014: ['fighter', 'paladin'],
    desc: b('Ao rolar 1 ou 2 num dado de dano de um ataque corpo a corpo com arma empunhada com as duas mãos (Duas Mãos ou Versátil), rola esse dado de novo e fica com o novo resultado.',
      'When you roll a 1 or 2 on a damage die for a melee attack with a weapon wielded in two hands (two-handed or versatile), reroll the die and use the new roll.'),
    effect: { damageRerollBelow: 3 },
  },
  {
    id: 'interception', name: b('Interceptação', 'Interception'), source: 'PHB24', source2014: 'TCE', classes2014: ['fighter', 'paladin'],
    desc: b('Reação: quando uma criatura que você vê atinge outra criatura a até 1,5 m de você, reduz o dano em 1d10 + BP. Exige estar segurando um Escudo ou uma arma simples ou marcial.',
      'Reaction: when a creature you can see hits another creature within 5 feet of you, reduce the damage by 1d10 + PB. You must be holding a Shield or a Simple or Martial weapon.'),
    effect: { reaction: 'interception' },
  },
  {
    id: 'protection', name: b('Proteção', 'Protection'), source: 'PHB24', rules: '2024',
    desc: b('Reação, segurando um Escudo: quando uma criatura atacar outra a até 1,5 m de você, impõe Desvantagem nesse ataque e em todos os ataques contra o alvo até o início do seu próximo turno (se continuar a até 1,5 m dele).',
      'Reaction while holding a Shield: when a creature attacks a target within 5 feet of you, impose Disadvantage on that attack and on all attacks against the target until the start of your next turn (while you stay within 5 feet of it).'),
    effect: { reaction: 'protection' },
  },
  {
    id: 'protection2014', name: b('Proteção', 'Protection'), source: 'SRD', rules: '2014', classes2014: ['fighter', 'paladin'],
    desc: b('Reação, segurando um escudo: quando uma criatura que você vê ataca outro alvo a até 1,5 m de você, impõe desvantagem nessa jogada de ataque.',
      'Reaction while wielding a shield: when a creature you can see attacks a target other than you within 5 feet of you, impose disadvantage on that attack roll.'),
    effect: { reaction: 'protection2014' },
  },
  {
    id: 'thrownWeaponFighting', name: b('Combate com Armas de Arremesso', 'Thrown Weapon Fighting'), source: 'PHB24', rules: '2024',
    desc: b('+2 no dano quando acertar um ataque à distância com uma arma de Arremesso.', '+2 bonus to damage when you hit with a ranged attack using a Thrown weapon.'),
    effect: { thrownDamageBonus: 2 },
  },
  {
    id: 'thrownWeaponFighting2014', name: b('Combate com Armas de Arremesso', 'Thrown Weapon Fighting'), source: 'TCE', rules: '2014', classes2014: ['fighter', 'ranger'],
    desc: b('Você saca a arma de arremesso como parte do ataque e ganha +2 no dano ao acertar um ataque à distância com ela.',
      'You can draw a thrown weapon as part of the attack, and gain +2 damage when you hit with a ranged attack using it.'),
    effect: { thrownDamageBonus: 2, thrownDrawFree: true },
  },
  {
    id: 'twoWeaponFighting', name: b('Combate com Duas Armas', 'Two-Weapon Fighting'), source: 'SRD', classes2014: ['fighter', 'ranger'],
    desc: b('Ao fazer o ataque extra por lutar com duas armas (propriedade Leve), soma o modificador de atributo ao dano desse ataque.',
      'When you make the extra attack from two-weapon fighting (the Light property), add your ability modifier to that attack\'s damage.'),
    effect: { lightExtraAttackAbilityMod: true },
  },
  {
    id: 'unarmedFighting', name: b('Combate Desarmado', 'Unarmed Fighting'), source: 'PHB24', source2014: 'TCE', classes2014: ['fighter'],
    desc: b('Seu Golpe Desarmado causa 1d6 + FOR de dano contundente (1d8 se não estiver segurando armas nem escudo). No início do seu turno, causa 1d4 de dano contundente a uma criatura que você esteja agarrando.',
      'Your Unarmed Strike deals 1d6 + STR bludgeoning damage (1d8 if you hold no weapons or Shield). At the start of your turn, deal 1d4 bludgeoning damage to one creature you are grappling.'),
    effect: { unarmedDie: '1d6', unarmedDieFree: '1d8', grappleDamage: '1d4' },
  },
  {
    id: 'superiorTechnique', name: b('Técnica Superior', 'Superior Technique'), source: 'TCE', rules: '2014', classes2014: ['fighter'],
    desc: b('Aprende uma manobra do Mestre de Batalha e ganha um dado de superioridade (d6), recuperado em descanso curto ou longo.',
      'Learn one Battle Master maneuver and gain one superiority die (d6), regained on a short or long rest.'),
    // Só o guerreiro tem este estilo em 2014: fighter.js abre a vaga no pool `maneuver`
    // (choices) e cria o recurso do dado; paladino/patrulheiro não podem escolhê-lo.
    effect: { maneuvers: 1, superiorityDice: { count: 1, die: 'd6', recharge: 'short' } },
  },
];

export const SHARED = {
  // Talentos de Estilo de Luta (2024) / traço Estilo de Luta (2014).
  // Guerreiro Abençoado / Guerreiro Druídico ficam nos arquivos do paladino/patrulheiro.
  fightingStyle: { name: b('Estilo de Luta', 'Fighting Style'), options: FIGHTING_STYLES },
  // Maestria em Armas (2024): cada opção é uma arma com sua propriedade de maestria.
  // `filterByClass`: que armas cada classe pode dominar (seletor; ver README, "Filtros de pools estáticos").
  weaponMastery: {
    name: b('Maestria em Armas', 'Weapon Mastery'), freeSwap: true, options: W.map(weaponOption),
    filterByClass: {
      // Bárbaro: armas corpo a corpo simples ou marciais.
      barbarian: { melee: true },
      // Ladino: armas simples e marciais com Acuidade ou Leve.
      rogue: { anyOf: [{ category: ['simple'] }, { props: ['finesse', 'light'] }] },
    },
  },
  // As 8 propriedades de maestria, para a UI (não é um pool).
  masteryProperties: MASTERY,
};
