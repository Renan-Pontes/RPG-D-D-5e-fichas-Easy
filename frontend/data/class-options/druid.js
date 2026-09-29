// Druida — opções, traços e círculos (regras 2024). Formato em README.md.
// Classe base e Círculo da Terra: SRD 5.2.1 (CC-BY 4.0), texto adaptado.
// Lua, Mar e Estrelas (PHB 2024) e círculos de suplemento (XGE/TCE): resumos
// ORIGINAIS — nada copiado de livros pagos.
// Círculos de 2014 ajustados às regras de 2024: traços do nível 2 vão para o 3;
// magias de círculo continuam nos níveis 3/5/7/9 (as do nível 2 entram no 3).
// Escolhas feitas na hora do uso (constelação da Forma Estelar, espírito do
// Totem Espiritual, tipo de dano do Golpe Primal) ficam só no texto.
const b = (pt, en) => ({ pt, en });
const f = (id, pt, en, dpt, den) => ({ id, name: b(pt, en), desc: b(dpt, den) });

// Nomes das magias citadas nas tabelas de círculo.
const SPELL = {
  blur: b('Nublar', 'Blur'), burningHands: b('Mãos Flamejantes', 'Burning Hands'), fireBolt: b('Raio de Fogo', 'Fire Bolt'),
  fireball: b('Bola de Fogo', 'Fireball'), blight: b('Definhar', 'Blight'), wallOfStone: b('Muralha de Pedra', 'Wall of Stone'),
  fogCloud: b('Nuvem de Névoa', 'Fog Cloud'), holdPerson: b('Imobilizar Pessoa', 'Hold Person'), rayOfFrost: b('Raio de Gelo', 'Ray of Frost'),
  sleetStorm: b('Tempestade de Granizo', 'Sleet Storm'), iceStorm: b('Tempestade de Gelo', 'Ice Storm'), coneOfCold: b('Cone de Frio', 'Cone of Cold'),
  mistyStep: b('Passo Nebuloso', 'Misty Step'), shockingGrasp: b('Toque Chocante', 'Shocking Grasp'), sleep: b('Sono', 'Sleep'),
  lightningBolt: b('Relâmpago', 'Lightning Bolt'), freedomOfMovement: b('Liberdade de Movimento', 'Freedom of Movement'),
  treeStride: b('Caminhar em Árvores', 'Tree Stride'), acidSplash: b('Respingo Ácido', 'Acid Splash'),
  rayOfSickness: b('Raio da Doença', 'Ray of Sickness'), web: b('Teia', 'Web'), stinkingCloud: b('Névoa Fétida', 'Stinking Cloud'),
  polymorph: b('Metamorfose', 'Polymorph'), insectPlague: b('Praga de Insetos', 'Insect Plague'),
  cureWounds: b('Curar Ferimentos', 'Cure Wounds'), moonbeam: b('Raio Lunar', 'Moonbeam'), starryWisp: b('Centelha Estelar', 'Starry Wisp'),
  conjureAnimals: b('Conjurar Animais', 'Conjure Animals'), fountOfMoonlight: b('Fonte de Luar', 'Fount of Moonlight'),
  massCureWounds: b('Curar Ferimentos em Massa', 'Mass Cure Wounds'), gustOfWind: b('Lufada de Vento', 'Gust of Wind'),
  shatter: b('Despedaçar', 'Shatter'), thunderwave: b('Onda Trovejante', 'Thunderwave'), waterBreathing: b('Respirar na Água', 'Water Breathing'),
  controlWater: b('Controlar a Água', 'Control Water'), conjureElemental: b('Conjurar Elemental', 'Conjure Elemental'),
  holdMonster: b('Imobilizar Monstro', 'Hold Monster'), chillTouch: b('Toque Arrepiante', 'Chill Touch'),
  blindnessDeafness: b('Cegueira/Surdez', 'Blindness/Deafness'), gentleRepose: b('Repouso Tranquilo', 'Gentle Repose'),
  animateDead: b('Animar Mortos', 'Animate Dead'), gaseousForm: b('Forma Gasosa', 'Gaseous Form'), confusion: b('Confusão', 'Confusion'),
  cloudkill: b('Névoa Mortal', 'Cloudkill'), contagion: b('Contágio', 'Contagion'), flamingSphere: b('Esfera Flamejante', 'Flaming Sphere'),
  scorchingRay: b('Raio Ardente', 'Scorching Ray'), plantGrowth: b('Crescimento de Plantas', 'Plant Growth'), revivify: b('Revivificar', 'Revivify'),
  auraOfLife: b('Aura de Vida', 'Aura of Life'), fireShield: b('Escudo de Fogo', 'Fire Shield'), flameStrike: b('Coluna de Chamas', 'Flame Strike'),
};

const table = (spells, lang) => Object.entries(spells)
  .map(([lv, ids]) => `${lv}: ${ids.map(id => SPELL[id]?.[lang] || id).join(', ')}`).join('; ');

/**
 * Monta os níveis de um círculo: `spells` = { nível: [ids] } (sempre preparadas;
 * truques vão em `cantrips`), `feats` = { nível: [traços] }. Gera o traço
 * "Magias do Círculo" no nível 3 com a tabela no texto.
 */
function circle(key, circleName, feats, spells = null, cantrips = {}) {
  const levels = {};
  const at = (lv) => (levels[lv] ||= {});
  for (const [lv, list] of Object.entries(feats)) at(lv).features = [...list];
  if (spells) {
    const all = { ...spells };
    for (const [lv, ids] of Object.entries(cantrips)) all[lv] = [...ids, ...(all[lv] || [])];
    const spellFeature = f(`${key}CircleSpells`, `Magias do ${circleName.pt}`, `${circleName.en} Spells`,
      `Ao alcançar os níveis de druida indicados, você passa a ter sempre preparadas estas magias (não contam no limite de preparadas). Nível ${table(all, 'pt')}.`,
      `When you reach the listed Druid levels, you always have these spells prepared (they don't count against your prepared spells). Level ${table(all, 'en')}.`);
    at(3).features = [spellFeature, ...(at(3).features || [])];
    for (const [lv, ids] of Object.entries(spells)) at(lv).autoSpells = ids;
  }
  for (const [lv, ids] of Object.entries(cantrips)) at(lv).autoCantrips = ids;
  return levels;
}

const ASI = (lv) => f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement',
  `Você ganha o talento Aumento no Valor de Atributo ou outro talento para o qual se qualifique${lv === 4 ? '. Você recebe este traço de novo nos níveis de druida 8, 12 e 16' : ''}.`,
  `You gain the Ability Score Improvement feat or another feat of your choice for which you qualify${lv === 4 ? '. You gain this feature again at Druid levels 8, 12, and 16' : ''}.`);

// ---------------------------------------------------------------------------
// Traços da classe base (SRD 5.2.1)
// ---------------------------------------------------------------------------
const features = {
  1: [
    f('spellcasting', 'Conjuração', 'Spellcasting',
      'Você conjura magias de druida usando Sabedoria; um foco druídico serve de foco de conjuração. Truques: conhece 2 da lista de druida (Arte Druídica e Produzir Chama são recomendados) e aprende mais nos níveis 4 e 10; sempre que ganhar um nível de druida, pode trocar um truque por outro da lista. Magias preparadas: comece com 4 magias de nível 1; o número cresce conforme a tabela, e as magias devem ser de um nível para o qual você tenha espaços. Ao terminar um descanso longo, pode trocar qualquer magia preparada por outra de druida. Magias sempre preparadas concedidas por outros traços não contam no limite. Você recupera todos os espaços gastos num descanso longo.',
      'You cast Druid spells using Wisdom; a Druidic Focus serves as your spellcasting focus. Cantrips: you know 2 from the Druid list (Druidcraft and Produce Flame are recommended) and learn more at levels 4 and 10; whenever you gain a Druid level, you can replace one cantrip with another from the list. Prepared spells: start with 4 level 1 spells; the number grows per the table, and they must be of a level for which you have slots. When you finish a Long Rest, you can swap any prepared spell for another Druid spell. Always-prepared spells from other features don\'t count against the limit. You regain all expended slots on a Long Rest.'),
    f('druidic', 'Druídico', 'Druidic',
      'Você conhece o Druídico, a língua secreta dos druidas, e sempre tem a magia Falar com Animais preparada. Pode deixar mensagens ocultas em Druídico: quem conhece o idioma as percebe automaticamente; os demais notam a mensagem com um teste de Inteligência (Investigação) CD 15, mas não a decifram sem magia.',
      'You know Druidic, the secret language of Druids, and you always have Speak with Animals prepared. You can leave hidden messages in Druidic: those who know it spot them automatically; others notice the message with a DC 15 Intelligence (Investigation) check but can\'t decipher it without magic.'),
    f('primalOrder', 'Ordem Primal', 'Primal Order',
      'Escolha um papel sagrado. Mago: conhece um truque extra da lista de druida e soma o modificador de Sabedoria (mínimo +1) aos testes de Inteligência (Arcanismo ou Natureza). Guardião: proficiência com armas marciais e treino com armadura média.',
      'Choose a sacred role. Magician: you know one extra Druid cantrip and add your Wisdom modifier (minimum +1) to Intelligence (Arcana or Nature) checks. Warden: proficiency with Martial weapons and training with Medium armor.'),
  ],
  2: [
    f('wildShape', 'Forma Selvagem', 'Wild Shape',
      'Como Ação Bônus, você assume uma forma de Fera que conheça. Dura metade do seu nível de druida em horas, ou até usar Forma Selvagem de novo, ficar Incapacitado ou morrer; pode sair antes como Ação Bônus. Usos: 2 (3 no nível 6, 4 no 17); recupera 1 uso num descanso curto e todos num descanso longo. Formas conhecidas: 4 feras de ND até 1/4 sem deslocamento de voo (Rato, Cavalo de Montaria, Aranha e Lobo são recomendados); 6 formas de ND até 1/2 no nível 4; 8 formas de ND até 1 no nível 8, quando formas com voo são liberadas. Ao terminar um descanso longo, pode trocar uma forma conhecida. Na forma: ganha PV temporários iguais ao seu nível de druida; usa as estatísticas da Fera, mas mantém tipo de criatura, PV, Dados de Vida, INT, SAB, CAR, traços de classe, idiomas, talentos e proficiências (use o maior modificador); não pode conjurar magias, mas não perde a Concentração; o equipamento cai, funde-se à forma ou é vestido por ela, a critério do Mestre.',
      'As a Bonus Action, you assume a Beast form you know. It lasts half your Druid level in hours, or until you use Wild Shape again, are Incapacitated, or die; you can leave early as a Bonus Action. Uses: 2 (3 at level 6, 4 at 17); regain 1 use on a Short Rest and all on a Long Rest. Known forms: 4 Beasts of CR 1/4 or lower without a Fly Speed (Rat, Riding Horse, Spider, and Wolf are recommended); 6 forms up to CR 1/2 at level 4; 8 forms up to CR 1 at level 8, when forms with a Fly Speed become available. When you finish a Long Rest, you can replace one known form. In form: gain Temporary HP equal to your Druid level; use the Beast\'s statistics but keep your creature type, HP, Hit Dice, INT, WIS, CHA, class features, languages, feats, and proficiencies (use the higher modifier); you can\'t cast spells, but shape-shifting doesn\'t break Concentration; your equipment falls, merges, or is worn, as the GM decides.'),
    f('wildCompanion', 'Companheiro Selvagem', 'Wild Companion',
      'Como ação de Magia, gaste um espaço de magia ou um uso de Forma Selvagem para conjurar Encontrar Familiar sem componentes materiais. O familiar é um Feérico e desaparece quando você termina um descanso longo.',
      'As a Magic action, expend a spell slot or a use of Wild Shape to cast Find Familiar without Material components. The familiar is Fey and disappears when you finish a Long Rest.'),
  ],
  3: [
    f('druidSubclass', 'Subclasse de Druida', 'Druid Subclass',
      'Você escolhe um Círculo Druídico e recebe os traços dele nos níveis de druida indicados.',
      'You choose a Druid Circle and gain its features at the listed Druid levels.'),
  ],
  4: [ASI(4)],
  5: [
    f('wildResurgence', 'Ressurgência Selvagem', 'Wild Resurgence',
      'Uma vez em cada um dos seus turnos, se não tiver usos de Forma Selvagem, pode gastar um espaço de magia para recuperar 1 uso (sem ação). Além disso, pode gastar 1 uso de Forma Selvagem para ganhar um espaço de magia de nível 1 (sem ação); só pode fazer isso de novo após um descanso longo.',
      'Once on each of your turns, if you have no Wild Shape uses left, you can expend a spell slot to regain 1 use (no action required). You can also expend 1 Wild Shape use to gain a level 1 spell slot (no action required); you can\'t do so again until you finish a Long Rest.'),
  ],
  7: [
    f('elementalFury', 'Fúria Elemental', 'Elemental Fury',
      'Escolha uma opção. Conjuração Potente: some o modificador de Sabedoria ao dano de qualquer truque de druida. Golpe Primal: uma vez em cada um dos seus turnos, ao acertar uma criatura com arma ou com ataque de forma de Fera, cause 1d8 de dano extra de Frio, Fogo, Elétrico ou Trovejante (escolha ao acertar).',
      'Choose one option. Potent Spellcasting: add your Wisdom modifier to the damage of any Druid cantrip. Primal Strike: once on each of your turns when you hit a creature with a weapon or a Beast form\'s attack, deal an extra 1d8 Cold, Fire, Lightning, or Thunder damage (choose on hit).'),
  ],
  8: [ASI(8)],
  12: [ASI(12)],
  15: [
    f('improvedElementalFury', 'Fúria Elemental Aprimorada', 'Improved Elemental Fury',
      'A opção da Fúria Elemental melhora. Conjuração Potente: truques de druida com alcance de 3 m (10 pés) ou mais ganham +90 m (300 pés) de alcance. Golpe Primal: o dano extra passa a 2d8.',
      'Your Elemental Fury option improves. Potent Spellcasting: Druid cantrips with a range of 10 feet or more gain +300 feet of range. Primal Strike: the extra damage becomes 2d8.'),
  ],
  16: [ASI(16)],
  18: [
    f('beastSpells', 'Magias Bestiais', 'Beast Spells',
      'Em Forma Selvagem, você pode conjurar magias, exceto as que tenham componente material com custo indicado ou que seja consumido.',
      'While in Wild Shape, you can cast spells, except those with a Material component that has a specified cost or is consumed.'),
  ],
  19: [
    f('epicBoon', 'Dádiva Épica', 'Epic Boon',
      'Você ganha um talento de Dádiva Épica ou outro talento para o qual se qualifique. Dádiva da Viagem Dimensional é recomendada.',
      'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended.'),
  ],
  20: [
    f('archdruid', 'Arquidruida', 'Archdruid',
      'Forma Selvagem Perene: ao rolar Iniciativa sem usos de Forma Selvagem, recupera 1 uso. Mago da Natureza: converta usos de Forma Selvagem não gastos num único espaço de magia, cada uso valendo 2 níveis (ex.: 2 usos = espaço de nível 4); 1×/descanso longo. Longevidade: a cada dez anos, seu corpo envelhece só um.',
      'Evergreen Wild Shape: when you roll Initiative with no Wild Shape uses left, you regain 1 use. Nature Magician: convert unexpended Wild Shape uses into a single spell slot, each use worth 2 spell levels (e.g., 2 uses = a level 4 slot); once per Long Rest. Longevity: for every ten years that pass, your body ages only one.'),
  ],
};

// ---------------------------------------------------------------------------
// Listas de opções
// ---------------------------------------------------------------------------
const primalOrder = {
  name: b('Ordem Primal', 'Primal Order'),
  options: [
    { id: 'magician', name: b('Mago', 'Magician'), source: 'SRD',
      desc: b('Conhece um truque extra da lista de druida e soma o modificador de Sabedoria (mínimo +1) aos testes de Inteligência (Arcanismo ou Natureza).',
        'Know one extra Druid cantrip and add your Wisdom modifier (minimum +1) to Intelligence (Arcana or Nature) checks.'),
      choices: { magicianCantrip: 1 } },
    { id: 'warden', name: b('Guardião', 'Warden'), source: 'SRD',
      desc: b('Treinado para a batalha: proficiência com armas marciais e treino com armadura média.',
        'Trained for battle: proficiency with Martial weapons and training with Medium armor.'),
      grants: { weapons: ['Martial'], armor: ['Medium'] } },
  ],
};

const elementalFury = {
  name: b('Fúria Elemental', 'Elemental Fury'),
  options: [
    { id: 'potentSpellcasting', name: b('Conjuração Potente', 'Potent Spellcasting'), source: 'SRD',
      desc: b('Some o modificador de Sabedoria ao dano dos truques de druida. No nível 15: truques de druida com alcance de 3 m ou mais ganham +90 m (300 pés).',
        'Add your Wisdom modifier to Druid cantrip damage. At level 15: Druid cantrips with a range of 10+ feet gain +300 feet of range.') },
    { id: 'primalStrike', name: b('Golpe Primal', 'Primal Strike'), source: 'SRD',
      desc: b('1×/turno, ao acertar com arma ou ataque de forma de Fera: +1d8 de dano de Frio, Fogo, Elétrico ou Trovejante (escolha ao acertar). No nível 15: 2d8.',
        'Once per turn on a weapon or Beast-form hit: +1d8 Cold, Fire, Lightning, or Thunder damage (choose on hit). At level 15: 2d8.') },
  ],
};

const pools = {
  primalOrder,
  elementalFury,
  // Mago: +1 truque de druida (não conta no limite da tabela). Troca junto com os
  // truques da classe, a cada nível de druida.
  magicianCantrip: {
    name: b('Truque do Mago', 'Magician Cantrip'),
    kind: 'spell', filter: { classes: ['druid'], level: 0 }, grantAs: 'cantrip', swapOnLevelUp: 1,
  },
  // Círculo da Terra (2014): Truque Bônus.
  landBonusCantrip: {
    name: b('Truque Bônus (Círculo da Terra)', 'Bonus Cantrip (Circle of the Land)'),
    kind: 'spell', filter: { classes: ['druid'], level: 0 }, grantAs: 'cantrip',
  },
};

// ---------------------------------------------------------------------------
// Círculos
// ---------------------------------------------------------------------------
const LAND_SPELLS = {
  arid: { 3: ['blur', 'burningHands', 'fireBolt'], 5: ['fireball'], 7: ['blight'], 9: ['wallOfStone'] },
  polar: { 3: ['fogCloud', 'holdPerson', 'rayOfFrost'], 5: ['sleetStorm'], 7: ['iceStorm'], 9: ['coneOfCold'] },
  temperate: { 3: ['mistyStep', 'shockingGrasp', 'sleep'], 5: ['lightningBolt'], 7: ['freedomOfMovement'], 9: ['treeStride'] },
  tropical: { 3: ['acidSplash', 'rayOfSickness', 'web'], 5: ['stinkingCloud'], 7: ['polymorph'], 9: ['insectPlague'] },
};
const LAND_TYPES = [
  { id: 'arid', name: b('Árido', 'Arid'), resistance: 'fire' },
  { id: 'polar', name: b('Polar', 'Polar'), resistance: 'cold' },
  { id: 'temperate', name: b('Temperado', 'Temperate'), resistance: 'lightning' },
  { id: 'tropical', name: b('Tropical', 'Tropical'), resistance: 'poison' },
];
const landTables = (lang) => LAND_TYPES.map(t => `${t.name[lang]} — ${table(LAND_SPELLS[t.id], lang)}`).join('. ');

const land = {
  name: b('Círculo da Terra', 'Circle of the Land'),
  source: 'SRD',
  desc: b('Místicos e sábios que guardam conhecimentos antigos e ritos da terra, reunidos em círculos de árvores ou pedras.',
    'Mystics and sages who safeguard ancient knowledge and rites, gathering in sacred circles of trees or standing stones.'),
  levels: {
    3: { features: [
      f('circleOfTheLandSpells', 'Magias do Círculo da Terra', 'Circle of the Land Spells',
        `Ao terminar um descanso longo, escolha um tipo de terreno: árido, polar, temperado ou tropical. Você tem preparadas as magias desse terreno até o seu nível de druida (não contam no limite). Nível ${landTables('pt')}.`,
        `When you finish a Long Rest, choose a land type: arid, polar, temperate, or tropical. You have that land's spells for your Druid level and lower prepared (they don't count against your limit). Level ${landTables('en')}.`),
      f('landsAid', 'Auxílio da Terra', "Land's Aid",
        'Como ação de Magia, gaste um uso de Forma Selvagem e escolha um ponto a até 18 m (60 pés). Flores e espinhos surgem numa esfera de 3 m (10 pés) de raio: cada criatura escolhida faz uma salvaguarda de Constituição contra sua CD, sofrendo 2d6 de dano Necrótico (metade se passar), e uma criatura escolhida na área recupera 2d6 PV. Dano e cura sobem para 3d6 no nível 10 e 4d6 no 14.',
        'As a Magic action, expend a Wild Shape use and choose a point within 60 feet. Flowers and thorns fill a 10-foot-radius Sphere: each creature you choose makes a Constitution save against your spell save DC, taking 2d6 Necrotic damage (half on success), and one creature of your choice there regains 2d6 HP. Damage and healing become 3d6 at level 10 and 4d6 at 14.'),
    ] },
    6: { features: [
      f('naturalRecovery', 'Recuperação Natural', 'Natural Recovery',
        'Pode conjurar uma magia de nível 1+ preparada pelas Magias do Círculo sem gastar espaço, 1×/descanso longo. Além disso, ao terminar um descanso curto, recupere espaços de magia gastos cujo nível somado seja até metade do seu nível de druida (arredondado para cima), nenhum de nível 6+; 1×/descanso longo.',
        'You can cast one level 1+ spell prepared by your Circle Spells without a slot, once per Long Rest. Also, when you finish a Short Rest, recover expended spell slots with a combined level up to half your Druid level (round up), none of level 6+; once per Long Rest.'),
    ] },
    10: { features: [
      f('naturesWard', 'Proteção da Natureza', "Nature's Ward",
        'Você é imune à condição Envenenado e tem Resistência ao tipo de dano ligado ao terreno atual: Árido = Fogo, Polar = Frio, Temperado = Elétrico, Tropical = Veneno.',
        'You are immune to the Poisoned condition and have Resistance to the damage type tied to your current land: Arid = Fire, Polar = Cold, Temperate = Lightning, Tropical = Poison.'),
    ] },
    14: { features: [
      f('naturesSanctuary', 'Santuário da Natureza', "Nature's Sanctuary",
        'Como ação de Magia, gaste um uso de Forma Selvagem: árvores e vinhas espectrais ocupam um cubo de 4,5 m (15 pés) no chão a até 36 m (120 pés), por 1 minuto ou até você ficar Incapacitado ou morrer. Você e seus aliados têm Meia Cobertura na área, e os aliados recebem a Resistência da sua Proteção da Natureza. Como Ação Bônus, mova o cubo até 18 m (60 pés).',
        'As a Magic action, expend a Wild Shape use: spectral trees and vines fill a 15-foot Cube on the ground within 120 feet for 1 minute or until you are Incapacitated or die. You and your allies have Half Cover there, and allies gain your Nature\'s Ward Resistance. As a Bonus Action, move the Cube up to 60 feet.'),
    ] },
  },
  // Lidos pelo motor (subRule.landTypeSpells[landType][nível]) e pela UI de terreno.
  // Fora de `levels`: o merge do rules.js precisa copiar essas chaves.
  landTypes: LAND_TYPES,
  landTypeSpells: LAND_SPELLS,
};

const moon = {
  name: b('Círculo da Lua', 'Circle of the Moon'),
  source: 'PHB24',
  desc: b('Druidas que seguem as fases da lua e se transformam em feras poderosas, banhadas por luz lunar.',
    'Druids who follow the phases of the moon and take on mighty beast forms suffused with lunar light.'),
  levels: circle('moon', b('Círculo da Lua', 'Circle of the Moon'), {
    3: [
      f('circleForms', 'Formas do Círculo', 'Circle Forms',
        'Em Forma Selvagem: o ND máximo da forma passa a ser seu nível de druida dividido por 3 (arredondado para baixo); sua CA é 13 + modificador de Sabedoria, se for maior que a da Fera; e os PV temporários ao assumir a forma são o triplo do seu nível de druida. As magias do círculo podem ser conjuradas mesmo em Forma Selvagem.',
        'While in Wild Shape: the form\'s maximum CR becomes your Druid level divided by 3 (round down); your AC is 13 + your Wisdom modifier if higher than the Beast\'s; and the Temporary HP you gain equals three times your Druid level. You can cast your circle spells even while in Wild Shape.'),
    ],
    6: [
      f('improvedCircleForms', 'Formas do Círculo Aprimoradas', 'Improved Circle Forms',
        'Em Forma Selvagem: cada ataque da forma pode causar dano Radiante em vez do tipo normal (escolha ao acertar), e você soma o modificador de Sabedoria às salvaguardas de Constituição.',
        'While in Wild Shape: each of the form\'s attacks can deal Radiant damage instead of its normal type (choose on hit), and you add your Wisdom modifier to Constitution saving throws.'),
    ],
    10: [
      f('moonlightStep', 'Passo do Luar', 'Moonlight Step',
        'Como Ação Bônus, teleporte-se até 9 m (30 pés) para um espaço visível e tenha Vantagem no próximo ataque neste turno. Usos: modificador de Sabedoria (mínimo 1) por descanso longo; também recupera um uso gastando um espaço de nível 2+ (sem ação).',
        'As a Bonus Action, teleport up to 30 feet to a space you can see and gain Advantage on your next attack this turn. Uses: Wisdom modifier (minimum 1) per Long Rest; you can also regain a use by expending a level 2+ slot (no action required).'),
    ],
    14: [
      f('lunarForm', 'Forma Lunar', 'Lunar Form',
        'Uma vez por turno, ao acertar com um ataque de forma de Forma Selvagem, cause +2d10 de dano Radiante. Ao usar o Passo do Luar, pode levar junto uma criatura voluntária a até 3 m (10 pés), que chega a até 3 m do seu destino.',
        'Once per turn when you hit with a Wild Shape form\'s attack, deal an extra 2d10 Radiant damage. When you use Moonlight Step, you can also teleport one willing creature within 10 feet of you to a space within 10 feet of your destination.'),
    ],
  }, { 3: ['cureWounds', 'moonbeam'], 5: ['conjureAnimals'], 7: ['fountOfMoonlight'], 9: ['massCureWounds'] }, { 3: ['starryWisp'] }),
};

const sea = {
  name: b('Círculo do Mar', 'Circle of the Sea'),
  source: 'PHB24',
  desc: b('Druidas ligados às marés e tempestades, que carregam a fúria do oceano em volta de si.',
    'Druids bound to tides and storms, who carry the ocean\'s fury around them.'),
  levels: circle('sea', b('Círculo do Mar', 'Circle of the Sea'), {
    3: [
      f('wrathOfTheSea', 'Ira do Mar', 'Wrath of the Sea',
        'Como Ação Bônus, gaste um uso de Forma Selvagem: uma emanação de maresia de 1,5 m (5 pés) surge em volta de você por 10 minutos (termina se ficar Incapacitado ou usar de novo). Ao criá-la e como Ação Bônus nos turnos seguintes, escolha uma criatura na emanação: ela faz salvaguarda de Constituição contra sua CD ou sofre dano de Frio igual a um número de d6 igual ao seu modificador de Sabedoria (mínimo 1) e, se for Grande ou menor, é empurrada até 4,5 m (15 pés).',
        'As a Bonus Action, expend a Wild Shape use: a 5-foot emanation of sea spray surrounds you for 10 minutes (ends if you\'re Incapacitated or use it again). When you create it and as a Bonus Action on later turns, choose a creature in the emanation: it makes a Constitution save against your DC or takes Cold damage equal to a number of d6 equal to your Wisdom modifier (minimum 1) and, if Large or smaller, is pushed up to 15 feet.'),
    ],
    6: [
      f('aquaticAffinity', 'Afinidade Aquática', 'Aquatic Affinity',
        'A emanação da Ira do Mar passa a 3 m (10 pés), e você ganha deslocamento de natação igual ao seu deslocamento.',
        'Your Wrath of the Sea emanation becomes 10 feet, and you gain a Swim Speed equal to your Speed.'),
    ],
    10: [
      f('stormborn', 'Nascido da Tempestade', 'Stormborn',
        'Com a Ira do Mar ativa: deslocamento de voo igual ao seu deslocamento e Resistência a dano de Frio, Elétrico e Trovejante.',
        'While Wrath of the Sea is active: you have a Fly Speed equal to your Speed and Resistance to Cold, Lightning, and Thunder damage.'),
    ],
    14: [
      f('oceanicGift', 'Dádiva Oceânica', 'Oceanic Gift',
        'Ao ativar a Ira do Mar, pode criá-la em volta de uma criatura voluntária a até 18 m (60 pés), que recebe os benefícios e usa sua CD e seu modificador de Sabedoria. Gastando 2 usos de Forma Selvagem, cria em volta de vocês dois.',
        'When you use Wrath of the Sea, you can center it on a willing creature within 60 feet, which gains its benefits and uses your save DC and Wisdom modifier. By expending 2 Wild Shape uses, you create it around both of you.'),
    ],
  }, { 3: ['fogCloud', 'gustOfWind', 'shatter', 'thunderwave'], 5: ['lightningBolt', 'waterBreathing'], 7: ['controlWater', 'iceStorm'], 9: ['conjureElemental', 'holdMonster'] }, { 3: ['rayOfFrost'] }),
};

const stars = {
  name: b('Círculo das Estrelas', 'Circle of the Stars'),
  source: 'PHB24',
  desc: b('Druidas que leem as constelações e canalizam a luz das estrelas.',
    'Druids who read the constellations and channel starlight.'),
  levels: {
    3: {
      features: [
        f('starMap', 'Mapa Estelar', 'Star Map',
          'Você cria um mapa estelar Minúsculo (pergaminho, tábua, pedra etc.) que serve de foco de conjuração; se perdê-lo, refaz em 1 hora de ritual durante um descanso. Com ele, conhece o truque Orientação e tem Raio Guia sempre preparado, e pode conjurar Raio Guia sem gastar espaço um número de vezes igual ao modificador de Sabedoria (mínimo 1) por descanso longo.',
          'You create a Tiny star map (scroll, tablet, stone, etc.) that serves as a spellcasting focus; if lost, you remake it in a 1-hour ritual during a rest. With it you know the Guidance cantrip and always have Guiding Bolt prepared, and you can cast Guiding Bolt without a slot a number of times equal to your Wisdom modifier (minimum 1) per Long Rest.'),
        f('starryForm', 'Forma Estelar', 'Starry Form',
          'Como Ação Bônus, gaste um uso de Forma Selvagem (sem se transformar): por 10 minutos seu corpo brilha (luz plena 3 m, penumbra mais 3 m) e você escolhe uma constelação. Arqueiro: ao ativar e como Ação Bônus nos turnos seguintes, ataque mágico à distância a até 18 m (60 pés), 1d8 + SAB de dano Radiante. Cálice: ao conjurar magia com espaço que restaure PV, você ou outra criatura a até 9 m (30 pés) recupera 1d8 + SAB. Dragão: em testes de INT e SAB e em salvaguardas de CON para manter Concentração, um 9 ou menos no d20 conta como 10.',
          'As a Bonus Action, expend a Wild Shape use (without transforming): for 10 minutes your body glows (bright light 10 ft, dim 10 ft more) and you choose a constellation. Archer: on activation and as a Bonus Action on later turns, make a ranged spell attack within 60 feet for 1d8 + WIS Radiant damage. Chalice: when you cast a slot spell that restores HP, you or another creature within 30 feet regains 1d8 + WIS. Dragon: on INT and WIS checks and CON saves to maintain Concentration, treat a d20 roll of 9 or lower as 10.'),
      ],
      autoCantrips: ['guidance'],
      autoSpells: ['guidingBolt'],
    },
    6: { features: [
      f('cosmicOmen', 'Presságio Cósmico', 'Cosmic Omen',
        'Ao terminar um descanso longo, role um dado. Par (Bonança): como Reação, quando uma criatura visível a até 9 m (30 pés) fizer um Teste de D20, some 1d6. Ímpar (Infortúnio): subtraia 1d6. Usos: modificador de Sabedoria (mínimo 1) por descanso longo.',
        'When you finish a Long Rest, roll a die. Even (Weal): as a Reaction when a creature you can see within 30 feet makes a D20 Test, add 1d6. Odd (Woe): subtract 1d6. Uses: Wisdom modifier (minimum 1) per Long Rest.'),
    ] },
    10: { features: [
      f('twinklingConstellations', 'Constelações Cintilantes', 'Twinkling Constellations',
        'Na Forma Estelar: Arqueiro e Cálice passam a 2d8; Dragão concede deslocamento de voo de 6 m (20 pés) com pairar; e você pode trocar de constelação no início de cada turno.',
        'In Starry Form: Archer and Chalice become 2d8; Dragon grants a 20-foot Fly Speed with hover; and you can change constellations at the start of each of your turns.'),
    ] },
    14: { features: [
      f('fullOfStars', 'Repleto de Estrelas', 'Full of Stars',
        'Na Forma Estelar, você fica parcialmente incorpóreo: Resistência a dano Contundente, Cortante e Perfurante.',
        'While in Starry Form, you become partly incorporeal: Resistance to Bludgeoning, Piercing, and Slashing damage.'),
    ] },
  },
};

// Suplementos (regras de 2014 ajustadas: traços do nível 2 → 3).
const dreams = {
  name: b('Círculo dos Sonhos', 'Circle of Dreams'),
  source: 'XGE',
  desc: b('Druidas ligados à Agrestia das Fadas e aos sonhos, que curam e protegem viajantes.',
    'Druids tied to the Feywild and to dreams, who heal and shelter travelers.'),
  levels: circle('dreams', b('Círculo dos Sonhos', 'Circle of Dreams'), {
    3: [
      f('balmOfSummer', 'Bálsamo da Corte de Verão', 'Balm of the Summer Court',
        'Você tem uma reserva de d6 igual ao seu nível de druida, renovada no descanso longo. Como Ação Bônus, gaste dados (até metade do seu nível de druida) numa criatura visível a até 36 m (120 pés): ela recupera PV iguais ao total e ganha 1 PV temporário por dado gasto.',
        'You have a pool of d6s equal to your Druid level, restored on a Long Rest. As a Bonus Action, spend dice (up to half your Druid level) on a creature you can see within 120 feet: it regains HP equal to the total and gains 1 Temporary HP per die spent.'),
    ],
    6: [
      f('hearthOfMoonlight', 'Lar de Luar e Sombra', 'Hearth of Moonlight and Shadow',
        'No início de um descanso curto ou longo, você protege uma esfera de 9 m (30 pés): quem está dentro ganha +5 em testes de Furtividade e Percepção, e a luz de fogueiras e afins dentro dela não é vista de fora.',
        'At the start of a Short or Long Rest, you ward a 30-foot sphere: those inside gain +5 to Stealth and Perception checks, and light from fires and the like inside it can\'t be seen from outside.'),
    ],
    10: [
      f('hiddenPaths', 'Caminhos Ocultos', 'Hidden Paths',
        'Como Ação Bônus, teleporte-se até 18 m (60 pés) para um espaço visível; ou, como ação, teleporte uma criatura voluntária que tocar até 9 m (30 pés). Usos: modificador de Sabedoria (mínimo 1) por descanso longo.',
        'As a Bonus Action, teleport up to 60 feet to a space you can see; or, as an action, teleport a willing creature you touch up to 30 feet. Uses: Wisdom modifier (minimum 1) per Long Rest.'),
    ],
    14: [
      f('walkerInDreams', 'Andarilho dos Sonhos', 'Walker in Dreams',
        'Ao terminar um descanso curto, conjure uma destas sem espaço nem componente material: Sonho (você como mensageiro), Vidência ou Círculo de Teletransporte (o portal leva ao local do seu último descanso longo, no mesmo plano). 1×/descanso longo.',
        'When you finish a Short Rest, cast one of these without a slot or Material components: Dream (with you as the messenger), Scrying, or Teleportation Circle (the portal leads to where you last finished a Long Rest, on the same plane). Once per Long Rest.'),
    ],
  }),
};

const shepherd = {
  name: b('Círculo do Pastor', 'Circle of the Shepherd'),
  source: 'XGE',
  desc: b('Druidas protetores das feras e dos espíritos da natureza, que invocam aliados selvagens.',
    'Druids who protect beasts and nature spirits and call on wild allies.'),
  levels: circle('shepherd', b('Círculo do Pastor', 'Circle of the Shepherd'), {
    3: [
      f('speechOfTheWoods', 'Fala da Floresta', 'Speech of the Woods',
        'Você aprende o idioma Silvestre. Feras entendem o que você fala, e você entende o sentido geral dos sons e gestos delas.',
        'You learn Sylvan. Beasts understand your speech, and you grasp the gist of their noises and motions.'),
      f('spiritTotem', 'Totem Espiritual', 'Spirit Totem',
        'Como Ação Bônus, invoque um espírito num ponto a até 18 m (60 pés): ele cria uma aura de 9 m (30 pés) por 1 minuto (ou até você ficar Incapacitado); mova-o até 18 m como Ação Bônus. 1×/descanso curto ou longo. Escolha o espírito a cada invocação. Urso: criaturas escolhidas na aura ganham 5 + nível de druida de PV temporários e têm Vantagem em testes e salvaguardas de Força na aura. Falcão: como Reação, dê Vantagem a um ataque de uma criatura na aura contra alvo na aura; você e aliados têm Vantagem em Percepção na aura. Unicórnio: Vantagem em testes para detectar criaturas na aura; ao curar com magia de espaço, cada criatura escolhida na aura também recupera PV iguais ao seu nível de druida.',
        'As a Bonus Action, summon a spirit at a point within 60 feet: it creates a 30-foot aura for 1 minute (or until you\'re Incapacitated); move it up to 60 feet as a Bonus Action. Once per Short or Long Rest. Choose the spirit each time. Bear: chosen creatures in the aura gain 5 + Druid level Temporary HP and have Advantage on Strength checks and saves there. Hawk: as a Reaction, give Advantage to an attack by a creature in the aura against a target in the aura; you and allies have Advantage on Perception in the aura. Unicorn: Advantage on checks to detect creatures in the aura; when you heal with a slot spell, each chosen creature in the aura also regains HP equal to your Druid level.'),
    ],
    6: [
      f('mightySummoner', 'Invocador Poderoso', 'Mighty Summoner',
        'Feras e Feéricos que você invoca ou cria com magias ganham +2 PV por Dado de Vida, e as armas naturais deles contam como mágicas.',
        'Beasts and Fey you summon or create with spells gain +2 HP per Hit Die, and their natural weapons count as magical.'),
    ],
    10: [
      f('guardianSpirit', 'Espírito Guardião', 'Guardian Spirit',
        'Feras e Feéricos invocados por suas magias que terminam o turno na aura do Totem Espiritual recuperam PV iguais à metade do seu nível de druida.',
        'Beasts and Fey summoned by your spells that end their turn in your Spirit Totem aura regain HP equal to half your Druid level.'),
    ],
    14: [
      f('faithfulSummons', 'Invocações Fiéis', 'Faithful Summons',
        'Ao cair a 0 PV ou ficar Incapacitado contra sua vontade, você recebe o efeito de Conjurar Animais como magia de nível 9: quatro feras de ND 2 ou menor surgem a até 6 m (20 pés) e o protegem por 1 hora, sem Concentração. 1×/descanso longo.',
        'When you drop to 0 HP or are Incapacitated against your will, you gain the effect of Conjure Animals as a level 9 spell: four Beasts of CR 2 or lower appear within 20 feet and protect you for 1 hour, without Concentration. Once per Long Rest.'),
    ],
  }),
};

const spores = {
  name: b('Círculo dos Esporos', 'Circle of Spores'),
  source: 'TCE',
  desc: b('Druidas que veem beleza na decomposição e comandam fungos e a vida que brota da morte.',
    'Druids who find beauty in decay and command fungi and the life that springs from death.'),
  levels: circle('spores', b('Círculo dos Esporos', 'Circle of Spores'), {
    3: [
      f('haloOfSpores', 'Halo de Esporos', 'Halo of Spores',
        'Como Reação, quando uma criatura visível entrar ou começar o turno a até 3 m (10 pés), ela faz salvaguarda de Constituição contra sua CD ou sofre 1d4 de dano Necrótico. O dano sobe para 1d6 no nível 6, 1d8 no 10 e 1d10 no 14.',
        'As a Reaction, when a creature you can see moves into or starts its turn within 10 feet, it makes a Constitution save against your DC or takes 1d4 Necrotic damage. The damage becomes 1d6 at level 6, 1d8 at 10, and 1d10 at 14.'),
      f('symbioticEntity', 'Entidade Simbiótica', 'Symbiotic Entity',
        'Como ação, gaste um uso de Forma Selvagem (sem se transformar): ganhe 4 PV temporários por nível de druida; enquanto durarem, o dano do Halo de Esporos é rolado duas vezes e seus ataques corpo a corpo com arma causam +1d6 de dano Necrótico. Dura 10 minutos, até perder esses PV temporários ou até usar Forma Selvagem de novo.',
        'As an action, expend a Wild Shape use (without transforming): gain 4 Temporary HP per Druid level; while they last, Halo of Spores damage is rolled twice and your melee weapon hits deal an extra 1d6 Necrotic damage. Lasts 10 minutes, until those Temporary HP are gone, or until you use Wild Shape again.'),
    ],
    6: [
      f('fungalInfestation', 'Infestação Fúngica', 'Fungal Infestation',
        'Como Reação, quando uma Fera ou Humanoide Pequeno ou Médio morrer a até 3 m (10 pés), ele se ergue como zumbi com 1 PV, obedece seus comandos mentais e cai após 1 hora. Usos: modificador de Sabedoria (mínimo 1) por descanso longo.',
        'As a Reaction, when a Small or Medium Beast or Humanoid dies within 10 feet, it rises as a zombie with 1 HP that obeys your mental commands and collapses after 1 hour. Uses: Wisdom modifier (minimum 1) per Long Rest.'),
    ],
    10: [
      f('spreadingSpores', 'Esporos Disseminados', 'Spreading Spores',
        'Com a Entidade Simbiótica ativa, como Ação Bônus, lance esporos num cubo de 3 m (10 pés) a até 9 m (30 pés) por 1 minuto: quem entrar ou terminar o turno nele faz a salvaguarda do Halo de Esporos. Enquanto o cubo existir, você não usa o Halo em volta de si.',
        'While Symbiotic Entity is active, as a Bonus Action, hurl spores into a 10-foot cube within 30 feet for 1 minute: creatures that enter or end their turn there face your Halo of Spores save. While the cube exists, you can\'t use your own Halo.'),
    ],
    14: [
      f('fungalBody', 'Corpo Fúngico', 'Fungal Body',
        'Você não pode ficar Cego, Surdo, Amedrontado nem Envenenado, e acertos críticos contra você viram acertos normais, a menos que esteja Incapacitado.',
        'You can\'t be Blinded, Deafened, Frightened, or Poisoned, and critical hits against you count as normal hits unless you\'re Incapacitated.'),
    ],
  }, { 3: ['blindnessDeafness', 'gentleRepose'], 5: ['animateDead', 'gaseousForm'], 7: ['blight', 'confusion'], 9: ['cloudkill', 'contagion'] }, { 3: ['chillTouch'] }),
};

const wildfire = {
  name: b('Círculo do Fogo Selvagem', 'Circle of Wildfire'),
  source: 'TCE',
  desc: b('Druidas que entendem o fogo como destruição e renascimento, acompanhados por um espírito de chamas.',
    'Druids who see fire as destruction and rebirth, accompanied by a spirit of flame.'),
  levels: circle('wildfire', b('Círculo do Fogo Selvagem', 'Circle of Wildfire'), {
    3: [
      f('wildfireSpirit', 'Invocar Espírito do Fogo Selvagem', 'Summon Wildfire Spirit',
        'Como ação, gaste um uso de Forma Selvagem para invocar um espírito elemental Pequeno a até 9 m (30 pés), por 1 hora (ou até cair a 0 PV ou você invocá-lo de novo). Ao chegar, cada criatura a até 3 m dele (exceto você) faz salvaguarda de Destreza ou sofre 2d6 de dano de Fogo. O espírito age na sua iniciativa, logo após você, e obedece seus comandos (Ação Bônus). Ficha: CA 13; PV 5 + 5× nível de druida; voo 9 m (30 pés); Semente de Chama (ataque mágico à distância, 1d6 + BP de Fogo); Teleporte Flamejante (leva a si e um aliado voluntário até 4,5 m; criaturas perto do ponto de saída fazem salvaguarda de Destreza ou sofrem 1d6 + BP de Fogo).',
        'As an action, expend a Wild Shape use to summon a Small elemental spirit within 30 feet for 1 hour (or until it drops to 0 HP or you summon it again). On arrival, each creature within 10 feet of it (other than you) makes a Dexterity save or takes 2d6 Fire damage. The spirit acts on your initiative right after you and obeys your commands (Bonus Action). Stats: AC 13; HP 5 + 5× Druid level; fly 30 ft; Flame Seed (ranged spell attack, 1d6 + PB Fire); Fiery Teleportation (it and a willing ally teleport up to 15 ft; creatures near where it left make a Dexterity save or take 1d6 + PB Fire).'),
    ],
    6: [
      f('enhancedBond', 'Vínculo Aprimorado', 'Enhanced Bond',
        'Com o espírito invocado, ao conjurar uma magia que cause dano de Fogo ou restaure PV, role 1d8 e some a uma das rolagens de dano ou cura. Magias com alcance diferente de pessoal podem partir do espírito.',
        'While your spirit is summoned, when you cast a spell that deals Fire damage or restores HP, roll 1d8 and add it to one damage or healing roll. Spells with a range other than self can originate from the spirit.'),
    ],
    10: [
      f('cauterizingFlames', 'Chamas Cauterizantes', 'Cauterizing Flames',
        'Quando uma criatura Pequena ou maior morrer a até 9 m (30 pés) de você ou do espírito, uma chama espectral surge no espaço dela por 1 minuto. Quando uma criatura visível entrar nesse espaço, você pode usar a Reação para apagar a chama e curá-la ou causar-lhe dano de Fogo de 2d10 + SAB. Usos: bônus de proficiência por descanso longo.',
        'When a Small or larger creature dies within 30 feet of you or your spirit, a spectral flame appears in its space for 1 minute. When a creature you can see enters that space, you can use your Reaction to extinguish the flame and either heal it or deal it 2d10 + WIS Fire damage. Uses: proficiency bonus per Long Rest.'),
    ],
    14: [
      f('blazingRevival', 'Renascimento Ardente', 'Blazing Revival',
        'Se você cair a 0 PV com o espírito a até 36 m (120 pés), pode fazer o espírito cair a 0 PV; você recupera metade dos seus PV máximos e se levanta. 1×/descanso longo.',
        'If you drop to 0 HP with your spirit within 120 feet, you can have the spirit drop to 0 HP; you regain half your maximum HP and stand up. Once per Long Rest.'),
    ],
  }, { 3: ['burningHands', 'cureWounds', 'flamingSphere', 'scorchingRay'], 5: ['plantGrowth', 'revivify'], 7: ['auraOfLife', 'fireShield'], 9: ['flameStrike', 'massCureWounds'] }),
};

// Recursos com usos (sem Forma Selvagem nem espaços de magia, que a ficha já controla).
// Círculos de suplemento usam minLevel 2 (nível 2014); em 2024 a subclasse só existe a partir do 3.
const WIS = { ability: 'wis', min: 1 };
const resources = [
  { id: 'wildResurgence', name: b('Ressurgência Selvagem (uso → espaço)', 'Wild Resurgence (use → slot)'),
    desc: b('Gaste 1 uso de Forma Selvagem para ganhar um espaço de nível 1.', 'Expend a Wild Shape use to gain a level 1 slot.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 5, rules: '2024' },
  { id: 'natureMagician', name: b('Mago da Natureza', 'Nature Magician'),
    desc: b('Converta usos de Forma Selvagem num espaço (2 níveis por uso).', 'Convert Wild Shape uses into one slot (2 levels per use).'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 20, rules: '2024' },
  // Círculo da Terra
  { id: 'naturalRecoverySpell', name: b('Recuperação Natural (magia grátis)', 'Natural Recovery (free spell)'),
    desc: b('Conjure uma magia de círculo de nível 1+ sem espaço.', 'Cast a level 1+ circle spell without a slot.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 6, subclass: ['land'], rules: '2024' },
  { id: 'naturalRecovery', name: b('Recuperação Natural (espaços)', 'Natural Recovery (slots)'),
    desc: b('Após descanso curto, recupere espaços somando até metade do nível de druida.', 'After a Short Rest, recover slots totaling up to half your Druid level.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 6, subclass: ['land'], rules: '2024' },
  { id: 'naturalRecoveryLegacy', name: b('Recuperação Natural', 'Natural Recovery'),
    desc: b('Em descanso curto, recupere espaços somando até metade do nível de druida.', 'During a Short Rest, recover slots totaling up to half your Druid level.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 2, subclass: ['land'], rules: '2014' },
  // Círculo da Lua (2024)
  { id: 'moonlightStep', name: b('Passo do Luar', 'Moonlight Step'),
    desc: b('Também recupera 1 uso gastando um espaço de nível 2+.', 'Also regain 1 use by expending a level 2+ slot.'),
    uses: WIS, recharge: 'long', minLevel: 10, subclass: ['moon'], rules: '2024' },
  // Círculo das Estrelas
  { id: 'starMapGuidingBolt', name: b('Mapa Estelar (Raio Guia grátis)', 'Star Map (free Guiding Bolt)'),
    uses: WIS, recharge: 'long', minLevel: 3, subclass: ['stars'], rules: '2024' },
  { id: 'starMapGuidingBoltLegacy', name: b('Mapa Estelar (Raio Guia grátis)', 'Star Map (free Guiding Bolt)'),
    uses: { profBonus: true }, recharge: 'long', minLevel: 2, subclass: ['stars'], rules: '2014' },
  { id: 'cosmicOmen', name: b('Presságio Cósmico', 'Cosmic Omen'),
    uses: WIS, recharge: 'long', minLevel: 6, subclass: ['stars'], rules: '2024' },
  { id: 'cosmicOmenLegacy', name: b('Presságio Cósmico', 'Cosmic Omen'),
    uses: { profBonus: true }, recharge: 'long', minLevel: 6, subclass: ['stars'], rules: '2014' },
  // Círculo dos Sonhos
  { id: 'balmOfSummer', name: b('Bálsamo da Corte de Verão (d6)', 'Balm of the Summer Court (d6)'),
    desc: b('Reserva de d6; gaste até metade do nível de druida por vez.', 'Pool of d6s; spend up to half your Druid level at a time.'),
    uses: { classLevel: true }, recharge: 'long', minLevel: 2, subclass: ['dreams'], die: { byLevel: { 2: 'd6' } } },
  { id: 'hiddenPaths', name: b('Caminhos Ocultos', 'Hidden Paths'),
    uses: WIS, recharge: 'long', minLevel: 10, subclass: ['dreams'] },
  { id: 'walkerInDreams', name: b('Andarilho dos Sonhos', 'Walker in Dreams'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 14, subclass: ['dreams'] },
  // Círculo do Pastor
  { id: 'spiritTotem', name: b('Totem Espiritual', 'Spirit Totem'),
    uses: { fixed: 1 }, recharge: 'short', minLevel: 2, subclass: ['shepherd'] },
  { id: 'faithfulSummons', name: b('Invocações Fiéis', 'Faithful Summons'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 14, subclass: ['shepherd'] },
  // Círculo dos Esporos
  { id: 'fungalInfestation', name: b('Infestação Fúngica', 'Fungal Infestation'),
    uses: WIS, recharge: 'long', minLevel: 6, subclass: ['spores'] },
  // Círculo do Fogo Selvagem
  { id: 'cauterizingFlames', name: b('Chamas Cauterizantes', 'Cauterizing Flames'),
    uses: { profBonus: true }, recharge: 'long', minLevel: 10, subclass: ['wildfire'] },
  { id: 'blazingRevival', name: b('Renascimento Ardente', 'Blazing Revival'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 14, subclass: ['wildfire'] },
];

export default {
  classId: 'druid',
  pools,
  choices: { 1: { primalOrder: 1 }, 7: { elementalFury: 1 } },
  // Druídico: Falar com Animais sempre preparada.
  classLevels: { 1: { autoSpells: ['speakWithAnimals'] } },
  // 2014: Círculo da Terra ganha um truque de druida extra no nível 2.
  legacySubclassChoices: { land: { 2: { landBonusCantrip: 1 } } },
  features,
  resources,
  subclasses: { land, moon, sea, stars, dreams, shepherd, spores, wildfire },
};
