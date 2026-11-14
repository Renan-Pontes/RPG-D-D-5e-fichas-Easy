// Druida — opções, traços e círculos (regras 2024). Formato em README.md.
// Classe base e Círculo da Terra: SRD 5.2.1 (CC-BY 4.0), texto adaptado.
// Lua, Mar e Estrelas (PHB 2024) e círculos de suplemento (XGE/TCE): resumos
// ORIGINAIS — nada copiado de livros pagos. Círculo do Titã: playtest
// (Unearthed Arcana 2026), também em resumo original.
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
  thaumaturgy: b('Taumaturgia', 'Thaumaturgy'), enlargeReduce: b('Aumentar/Reduzir', 'Enlarge/Reduce'), fear: b('Medo', 'Fear'),
  destructiveWave: b('Onda Destrutiva', 'Destructive Wave'),
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

const ASI = (lv) => f('abilityScoreImprovement', 'Aumento no Valor de Atributo', 'Ability Score Improvement', "Você recebe o talento Aumento no Valor de Atributo (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Você recebe esta característica novamente nos níveis de Druida 8, 12 e 16.", "You gain the Ability Score Improvement feat (see \"Feats\") or another feat of your choice for which you qualify. You gain this feature again at Druid levels 8, 12, and 16.");

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
      'Escolha um papel sagrado. Mágico: conhece um truque extra da lista de druida e soma o modificador de Sabedoria (mínimo +1) aos testes de Inteligência (Arcanismo ou Natureza). Guardião: proficiência com armas marciais e treino com armadura média.',
      'Choose a sacred role. Magician: you know one extra Druid cantrip and add your Wisdom modifier (minimum +1) to Intelligence (Arcana or Nature) checks. Warden: proficiency with Martial weapons and training with Medium armor.'),
  ],
  2: [
    f('wildShape', 'Forma Selvagem', 'Wild Shape',
      'Como Ação Bônus, você assume uma forma de Fera que conheça. Dura metade do seu nível de druida em horas, ou até usar Forma Selvagem de novo, ficar Incapacitado ou morrer; pode sair antes como Ação Bônus. Usos: 2 (3 no nível 6, 4 no 17); recupera 1 uso num descanso curto e todos num descanso longo. Formas conhecidas: 4 feras de ND até 1/4 sem deslocamento de voo (Rato, Cavalo de Montaria, Aranha e Lobo são recomendados); 6 formas de ND até 1/2 no nível 4; 8 formas de ND até 1 no nível 8, quando formas com voo são liberadas. Ao terminar um descanso longo, pode trocar uma forma conhecida. Na forma: ganha PV temporários iguais ao seu nível de druida; usa as estatísticas da Fera, mas mantém tipo de criatura, PV, Dados de Vida, INT, SAB, CAR, traços de classe, idiomas, talentos e proficiências (use o maior modificador); não pode conjurar magias, mas não perde a Concentração; o equipamento cai, funde-se à forma ou é vestido por ela, a critério do Mestre.',
      'As a Bonus Action, you assume a Beast form you know. It lasts half your Druid level in hours, or until you use Wild Shape again, are Incapacitated, or die; you can leave early as a Bonus Action. Uses: 2 (3 at level 6, 4 at 17); regain 1 use on a Short Rest and all on a Long Rest. Known forms: 4 Beasts of CR 1/4 or lower without a Fly Speed (Rat, Riding Horse, Spider, and Wolf are recommended); 6 forms up to CR 1/2 at level 4; 8 forms up to CR 1 at level 8, when forms with a Fly Speed become available. When you finish a Long Rest, you can replace one known form. In form: gain Temporary HP equal to your Druid level; use the Beast\'s statistics but keep your creature type, HP, Hit Dice, INT, WIS, CHA, class features, languages, feats, and proficiencies (use the higher modifier); you can\'t cast spells, but shape-shifting doesn\'t break Concentration; your equipment falls, merges, or is worn, as the GM decides.'),
    f('wildCompanion', 'Companheiro Selvagem', 'Wild Companion',
      "Você pode invocar um espírito da natureza que assume uma forma animal para ajudá-lo. Como uma ação Mágica, você pode gastar um espaço de magia ou um uso de Forma Selvagem para conjurar a magia Encontrar Familiar sem componentes Materiais.\n\nQuando você conjura a magia dessa forma, o familiar é Feérico e desaparece quando você termina um Descanso Longo.",
      "You can summon a nature spirit that assumes an animal form to aid you. As a Magic action, you can expend a spell slot or a use of Wild Shape to cast the Find Familiar spell without Material components.\n\nWhen you cast the spell in this way, the familiar is Fey and disappears when you finish a Long Rest."),
  ],
  3: [
    f('druidSubclass', 'Subclasse de Druida', 'Druid Subclass',
      "Você ganha uma subclasse de Druida à sua escolha. A subclasse Círculo da Terra é detalhada após a descrição desta classe. Uma subclasse é uma especialização que concede características a você em determinados níveis de Druida. Pelo restante da sua carreira, você ganha cada uma das características da sua subclasse que sejam de seu nível de Druida ou inferior.",
      "You gain a Druid subclass of your choice. The Circle of the Land subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Druid levels. For the rest of your career, you gain each of your subclass's features that are of your Druid level or lower."),
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
      "A opção que você escolheu para Fúria Elemental torna-se mais poderosa, conforme detalhado abaixo.\n\nConjuração Potente. Quando você conjura um truque de Druida com alcance de 3 metros ou superior, o alcance da magia aumenta em 90 metros.\n\nGolpe Primal. O dano extra do seu Golpe Primal aumenta para 2d8.",
      "The option you chose for Elemental Fury grows more powerful, as detailed below.\n\nPotent Spellcasting. When you cast a Druid cantrip with a range of 10 feet or greater, the spell's range increases by 300 feet.\n\nPrimal Strike. The extra damage of your Primal Strike increases to 2d8."),
  ],
  16: [ASI(16)],
  18: [
    f('beastSpells', 'Magias Bestiais', 'Beast Spells',
      "Enquanto estiver usando a Forma Selvagem, você pode conjurar magias na forma de Besta, exceto por qualquer magia que tenha um componente Material com custo especificado ou que consuma seu componente Material.",
      "While using Wild Shape, you can cast spells in Beast form, except for any spell that has a Material component with a cost specified or that consumes its Material component."),
  ],
  19: [
    f('epicBoon', 'Dádiva Épica', 'Epic Boon',
      "Você ganha um talento de Dádiva Épica (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Dádiva da Viagem Dimensional é recomendada.",
      "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Dimensional Travel is recommended."),
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
    { id: 'magician', name: b('Mágico', 'Magician'), source: 'SRD',
      desc: b("Mago. Você conhece um truque adicional da lista de magias de Druida. Além disso, sua conexão mística com a natureza concede a você um bônus em seus testes de Inteligência (Arcanismo ou Natureza). O bônus é igual ao seu modificador de Sabedoria (bônus mínimo de +1).",
        "Magician. You know one extra cantrip from the Druid spell list. In addition, your mystical connection to nature gives you a bonus to your Intelligence (Arcana or Nature) checks. The bonus equals your Wisdom modifier (minimum bonus of +1)."),
      choices: { magicianCantrip: 1 } },
    { id: 'warden', name: b('Guardião', 'Warden'), source: 'SRD',
      desc: b("Guardião. Treinado para a batalha, você recebe proficiência com armas Marciais e treinamento com armaduras Médias.",
        "Warden. Trained for battle, you gain proficiency with Martial weapons and training with Medium armor."),
      grants: { weapons: ['Martial'], armor: ['Medium'] } },
  ],
};

const elementalFury = {
  name: b('Fúria Elemental', 'Elemental Fury'),
  options: [
    { id: 'potentSpellcasting', name: b('Conjuração Potente', 'Potent Spellcasting'), source: 'SRD',
      desc: b("Some o modificador de Sabedoria ao dano dos truques de druida. No nível 15: truques de druida com alcance de 3 m ou mais ganham +90 m.",
        'Add your Wisdom modifier to Druid cantrip damage. At level 15: Druid cantrips with a range of 10+ feet gain +300 feet of range.') },
    { id: 'primalStrike', name: b('Golpe Primal', 'Primal Strike'), source: 'SRD',
      desc: b('1×/turno, ao acertar com arma ou ataque de forma de Fera: +1d8 de dano de Frio, Fogo, Elétrico ou Trovejante (escolha ao acertar). No nível 15: 2d8.',
        'Once per turn on a weapon or Beast-form hit: +1d8 Cold, Fire, Lightning, or Thunder damage (choose on hit). At level 15: 2d8.') },
  ],
};

const pools = {
  primalOrder,
  elementalFury,
  // Mágico: +1 truque de druida (não conta no limite da tabela). Troca junto com os
  // truques da classe, a cada nível de druida.
  magicianCantrip: {
    name: b('Truque do Mágico', 'Magician Cantrip'),
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
        "Como uma ação de Magia, você pode gastar um uso de sua Forma Selvagem e escolher um ponto a até 18 metros de você. Flores doadoras de vitalidade e espinhos drenadores de vida aparecem por um momento em uma Esfera de 3 metros de raio centrada naquele ponto. Cada criatura à sua escolha na Esfera deve fazer uma salvaguarda de Constituição contra a CD de salvaguarda de suas magias, sofrendo 2d6 de dano Necrótico em caso de falha ou metade desse dano em caso de sucesso. Uma criatura à sua escolha naquela área recupera 2d6 Pontos de Vida.\n\nO dano e a cura aumentam em 1d6 quando você alcança os níveis 10 (3d6) e 14 (4d6) de Druida.",
        "As a Magic action, you can expend a use of your Wild Shape and choose a point within 60 feet of yourself. Vitality-giving flowers and life-draining thorns appear for a moment in a 10-foot-radius Sphere centered on that point. Each creature of your choice in the Sphere must make a Constitution saving throw against your spell save DC, taking 2d6 Necrotic damage on a failed save or half as much damage on a successful one. One creature of your choice in that area regains 2d6 Hit Points.\n\nThe damage and healing increase by 1d6 when you reach Druid levels 10 (3d6) and 14 (4d6)."),
    ] },
    6: { features: [
      f('naturalRecovery', 'Recuperação Natural', 'Natural Recovery',
        'Pode conjurar uma magia de nível 1+ preparada pelas Magias do Círculo sem gastar espaço, 1×/descanso longo. Além disso, ao terminar um descanso curto, recupere espaços de magia gastos cujo nível somado seja até metade do seu nível de druida (arredondado para cima), nenhum de nível 6+; 1×/descanso longo.',
        'You can cast one level 1+ spell prepared by your Circle Spells without a slot, once per Long Rest. Also, when you finish a Short Rest, recover expended spell slots with a combined level up to half your Druid level (round up), none of level 6+; once per Long Rest.'),
    ] },
    10: { features: [
      f('naturesWard', 'Proteção da Natureza', "Nature's Ward",
        "Você é imune à condição Envenenado, e tem Resistência a um tipo de dano associado à sua escolha atual de terreno na característica Magias do Círculo, conforme mostrado na tabela Proteção da Natureza.\n\nProteção da Natureza\n\nTipo de Terreno | Resistência\nÁrido | Fogo\nPolar | Frio\nTemperado | Elétrico\nTropical | Veneno",
        "You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature, as shown in the Nature's Ward table.\n\nNature's Ward\n\nLand Type | Resistance\nArid | Fire\nPolar | Cold\nTemperate | Lightning\nTropical | Poison"),
    ] },
    14: { features: [
      f('naturesSanctuary', 'Santuário da Natureza', "Nature's Sanctuary",
        "Como uma ação de Magia, você pode gastar um uso de sua Forma Selvagem e fazer com que árvores e videiras espectrais apareçam em um Cubo de 4,5 metros no chão a até 36 metros de você. Elas duram ali por 1 minuto ou até você ter a condição Incapacitado ou morrer. Você e seus aliados têm Meia Cobertura enquanto estiverem nessa área, e seus aliados ganham a Resistência atual da sua Proteção da Natureza enquanto estiverem ali.\n\nCom uma Ação Bônus, você pode mover o Cubo até 18 metros para um chão a até 36 metros de você.",
        "As a Magic action, you can expend a use of your Wild Shape and cause spectral trees and vines to appear in a 15-foot Cube on the ground within 120 feet of yourself. They last there for 1 minute or until you have the Incapacitated condition or die. You and your allies have Half Cover while in that area, and your allies gain the current Resistance of your Nature's Ward while there.\n\nAs a Bonus Action, you can move the Cube up to 60 feet to ground within 120 feet of yourself."),
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
        "Enquanto estiver em uma forma de Forma Selvagem, você ganha os seguintes benefícios.\nRadiância Lunar. Cada um de seus ataques em uma forma de Forma Selvagem pode causar seu tipo de dano normal ou dano Radiante. Você faz essa escolha cada vez que acertar com esses ataques.\nResistência Aumentada. Você pode adicionar seu modificador de Sabedoria às suas salvaguardas de Constituição.",
        "While in a Wild Shape form, you gain the following benefits.\nLunar Radiance. Each of your attacks in a Wild Shape form can deal its normal damage type or Radiant damage. You make this choice each time you hit with those attacks.\nIncreased Toughness. You can add your Wisdom modifier to your Constitution saving throws."),
    ],
    10: [
      f('moonlightStep', 'Passo do Luar', 'Moonlight Step',
        "Você se transporta magicamente, reaparecendo em meio a uma explosão de luz do luar. Como uma Ação Bônus, você se teletransporta até 9 metros para um espaço desocupado que possa ver, e tem Vantagem na próxima jogada de ataque que fizer antes do fim deste turno. Você pode usar essa característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez), e recupera todos os usos gastos ao terminar um\nDescanso Longo. Você também pode recuperar usos gastando um espaço de magia de 2º círculo ou superior para cada uso que quiser recuperar do Mar aumenta para 3 metros. (nenhuma ação necessária). NÍVEL 14: FORMA LUNAR\n\nO poder da lua envolve você, concedendo-lhe\n\nos sussurros e rugidos inescrutáveis dos ventos. NÍVEL 3: MAGIAS DO CÍRCULO DO MAR Quando você alcança um nível de Druida especificado na tabela Magias do Círculo do Mar, a partir de então você sempre tem as magias listadas preparadas. MAGIAS DO CÍRCULO DO MAR Nível de Druida Magias Preparadas 3 Névoa Obscurecente, Rajada de Vento, Raio de Gelo, Despedaçar, Onda Trovejante 5 Relâmpago, Respirar na Água 7 Controlar Água, Tempestade de Gelo 9 Conjurar Elemental, Imobilizar Monstro",
        "You magically transport yourself, reappearing amid a burst of moonlight. As a Bonus Action, you teleport up to 30 feet to an unoccupied space you can see, and you have Advantage on the next attack roll you make before the end of this turn. You can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a\nLong Rest. You can also regain uses by expending a level 2+ spell slot for each use you want to restore the Sea increases to 10 feet. (no action required). LEVEL14:LUNARFORM\n\nThe power of the moon suffuses you, granting you\n\nthe inscrutable whispers and roars of the winds. LEVEL 3 : CIRCLE OF THE SEA SPELLS When you reach a Druid level specified in the Circle of the Sea Spells table, you thereafter always have the listed spells prepared. CIRCLE OF THE SEA SPELLS Druid Level Prepared Spells 3 Fog Cloud, Gust ofWind, Ray of Frost, Shatter, Thunderwave 5 Lightning Bolt, Water Breathing 7 Control Water, Ice Storm 9 Conjure Elemental, Hold Monster"),
    ],
    14: [
      f('lunarForm', 'Forma Lunar', 'Lunar Form',
        "O poder da lua envolve você, concedendo-lhe os seguintes benefícios.\n\nRadiância Lunar Aprimorada. Uma vez por turno, você pode causar 2d10 de dano Radiante extra a um alvo que atingir com o ataque de uma forma de Forma Selvagem.\n\nLuar Compartilhado. Sempre que usar Passo do Luar, você também pode teletransportar uma criatura voluntária. Essa criatura deve estar a até 3 metros de você, e você a teletransporta para um espaço desocupado que possa ver a até 3 metros do seu espaço de destino.",
        "The power of the moon suffuses you, granting you the following benefits.\n\nImproved Lunar Radiance. Once per turn, you can deal an extra 2d10 Radiant damage to a target you hit with a Wild Shape form's attack.\n\nShared Moonlight. Whenever you use Moonlight Step, you can also teleport one willing creature. That creature must be within 10 feet of you, and you teleport it to an unoccupied space you can see within 10 feet of your destination space."),
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
        "Como uma Ação Bônus, você pode gastar um uso de sua Forma Selvagem para manifestar uma Emanação de 1,5 metro que assume a forma de uma maresia que o cerca por 10 minutos. Ela termina mais cedo se você a dispensar (nenhuma ação necessária), manifestá-la novamente ou tiver a condição Incapacitado. Quando você manifesta a Emanação e como uma Ação Bônus nos seus turnos subsequentes, você pode escolher outra criatura que você possa ver na Emanação. O alvo deve ser bem-sucedido em uma salvaguarda de Constituição contra a CD de salvaguarda de suas magias ou sofrer dano de Frio e, se a criatura for Grande ou menor, ser empurrada até 4,5 metros para longe de você. Para determinar esse dano, role um número de d6s igual ao seu modificador de Sabedoria (mínimo de um dado).",
        "As a Bonus Action, you can expend a use of your Wild Shape to manifest a 5-foot Emanation that takes the form of ocean spray that surrounds you for 10 minutes. It ends early if you dismiss it (no action required), manifest it again, or have the Incapacitated condition. When you manifest the Emanation and as a Bonus Action on your subsequent turns, you can choose another creature you can see in the Emanation. The target must succeed on a Constitution saving throw against your spell save DC or take Cold damage and, if the creature is Large or smaller, be pushed up to 15 feet away from you. To determine this damage, roll a number of d6s equal to your Wisdom modifier (minimum of one die)."),
    ],
    6: [
      f('aquaticAffinity', 'Afinidade Aquática', 'Aquatic Affinity',
        "O tamanho da Emanação criada pela sua Fúria do Além disso, você ganha um Deslocamento de Natação igual ao seu Deslocamento.",
        "The size of the Emanation created by your Wrath of In addition, you gain a Swim Speed equal to your Speed."),
    ],
    10: [
      f('stormborn', 'Nascido da Tempestade', 'Stormborn',
        "espaço de magia de 2º círculo ou superior para cada uso que quiser recuperar do Mar aumenta para 3 metros. (nenhuma ação necessária). NÍVEL 14: FORMA LUNAR\n\nO poder da lua envolve você, concedendo-lhe os seguintes benefícios.\nRadiância Lunar Aprimorada. Uma vez por turno, você pode causar 2d10 de dano Radiante extra a um alvo que atingir com o ataque de uma forma de Forma Selvagem.\nLuar Compartilhado. Sempre que usar Passo do Luar, você também pode teletransportar uma criatura voluntária. Essa criatura deve estar a até 3 metros de você, e você a teletransporta para um espaço desocupado que possa ver a até 3 metros do seu espaço de destino.",
        "vel 2+ spell slot for each use you want to restore the Sea increases to 10 feet. (no action required). LEVEL14:LUNARFORM\n\nThe power of the moon suffuses you, granting you the following benefits.\nImproved Lunar Radiance. Once per turn, you can deal an extra 2d10 Radiant damage to a target you hit with a Wild Shape form's attack.\nSha red Moonlight. Whenever you use Moonlight Step, you can also teleport one willing creature. That crea ture must be within 10 feet of you, and you teleport it to an unoccupied space you can see within 10 fe et of your destination space."),
    ],
    14: [
      f('oceanicGift', 'Dádiva Oceânica', 'Oceanic Gift',
        "Em vez de manifestar a Emanação de Fúria do Mar ao redor de si mesmo, você pode manifestá-la ao redor de uma criatura voluntária a até 18 metros de você. Essa criatura ganha todos os benefícios da Emanação e usa a sua CD de salvaguarda de magia e o seu modificador de Sabedoria para ela.\n\nAlém disso, você pode manifestar a Emanação ao redor de ambas, a outra criatura e você mesmo, se gastar dois usos da sua Forma Selvagem em vez de um ao manifestá-la.",
        "Instead of manifesting the Emanation of W rath of the Sea around yourself, you ca n m a ni fe s t it a round one willing creature within 60 fe e t of you r self. That creature gains all the benefits of the Emana tion and uses your spell save DC and Wis dom modifie r for it.\n\nIn addition, you can manifest the Emanation around both the other creature and yourself if you expend two uses of your Wild Shape instead of one when manifesting it."),
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
          'Você cria um mapa estelar Minúsculo (pergaminho, tábua, pedra etc.) que serve de foco de conjuração; se perdê-lo, refaz em 1 hora de ritual durante um descanso. Com ele, conhece o truque Orientação e tem Flecha Guiada sempre preparado, e pode conjurar Flecha Guiada sem gastar espaço um número de vezes igual ao modificador de Sabedoria (mínimo 1) por descanso longo.',
          'You create a Tiny star map (scroll, tablet, stone, etc.) that serves as a spellcasting focus; if lost, you remake it in a 1-hour ritual during a rest. With it you know the Guidance cantrip and always have Guiding Bolt prepared, and you can cast Guiding Bolt without a slot a number of times equal to your Wisdom modifier (minimum 1) per Long Rest.'),
        f('starryForm', 'Forma Estelar', 'Starry Form',
          "Característica de 2º nível do Círculo das Estrelas\n\nCom uma ação bônus, você pode gastar um uso de sua característica Forma Selvagem para assumir uma forma estrelada, em vez de se transformar em uma fera.\n\nEnquanto estiver em uma forma estrelada, você mantém suas estatísticas de jogo, mas seu corpo se torna luminoso; suas articulações brilham como estrelas, e linhas incandescentes as conectam como em uma carta estelar. Essa forma emite luz plena em um raio de 3 metros e penumbra por mais 3 metros adicionais. A forma dura por 10 minutos. Ela termina mais cedo se você a dispensar (nenhuma ação necessária), ficar incapacitado, morrer ou usar essa característica novamente.\n\nSempre que assumir sua forma estrelada, escolha qual das seguintes constelações brilha em seu corpo; sua escolha concede certos benefícios enquanto você estiver na forma:\n\nArqueiro. Uma constelação de um arqueiro aparece em você. Ao ativar essa forma, e como uma ação bônus em seus turnos subsequentes enquanto ela durar, você pode fazer um ataque à distância com magia, disparando uma flecha luminosa que tem como alvo uma criatura a até 18 metros de você. Em um acerto, o ataque causa dano radiante igual a 1d8 + seu modificador de Sabedoria.\nrqueiro. Uma constelação de um arqueiro aparece em você. Ao ativar essa forma, e como uma ação bônus em seus turnos subsequentes enquanto ela durar, você pode fazer um ataque à distância com magia, disparando uma flecha luminosa que tem como alvo uma criatura a até 18 metros de você. Em um acerto, o ataque causa dano radiante igual a 1d8 + seu modificador de Sabedoria.\n\nCálice. A constelação de um cálice doador de vida aparece em você. Sempre que você conjurar uma magia usando um espaço de magia que recupere pontos de vida de uma criatura, você ou outra criatura a até 9 metros de você pode recuperar pontos de vida iguais a 1d8 + seu modificador de Sabedoria.\n\nDragão. Uma constelação de um dragão sábio aparece em você. Quando fizer um teste de Inteligência ou de Sabedoria ou uma salvaguarda de Constituição para manter a concentração em uma magia, você pode tratar um resultado de 9 ou menor no d20 como um 10.",
          "2nd-level Circle of Stars feature\n\nAs a bonus action, you can expend a use of your Wild Shape feature to take on a starry form, rather than transforming into a beast.\n\nWhile in a starry form, you retain your game statistics, but your body becomes luminous; your joints glimmer like stars, and glowing lines connect them as on a star chart. This form sheds bright light in a 10-foot radius and dim light for an additional 10 feet. The form lasts for 10 minutes. It ends early if you dismiss it (no action required), are incapacitated, die, or use this feature again.\n\nWhenever you assume your starry form, choose which of the following constellations glimmers on your body; your choice gives you certain benefits while in the form:\n\nArcher. A constellation of an archer appears on you. When you activate this form, and as a bonus action on your subsequent turns while it lasts, you can make a ranged spell attack, hurling a luminous arrow that targets one creature within 60 feet of you. On a hit, the attack deals radiant damage equal to 1d8 + your Wisdom modifier.\n\nChalice. A constellation of a life-giving goblet appears on you. Whenever you cast a spell using a spell slot that restores hit points to a creature, you or another creature within 30 feet of you can regain hit points equal to 1d8 + your Wisdom modifier.\n\nDragon. A constellation of a wise dragon appears on you. When you make an Intelligence or a Wisdom check or a Constitution saving throw to maintain concentration on a spell, you can treat a roll of 9 or lower on the d20 as a 10."),
      ],
      autoCantrips: ['guidance'],
      autoSpells: ['guidingBolt'],
    },
    6: { features: [
      f('cosmicOmen', 'Presságio Cósmico', 'Cosmic Omen',
        "Sempre que terminar um Descanso Longo, você pode consultar seu Mapa Estelar em busca de presságios e rolar um dado. Até terminar seu próximo Descanso Longo, você ganha acesso a uma Reação especial com base em ter rolado um número par ou ímpar no dado:\n\nProsperidade (Par). Sempre que uma criatura que você possa ver a até 9 metros de você estiver prestes a fazer um Teste de D20, você pode usar uma Reação para rolar 1d6 e adicionar o número rolado ao total.\n\nAdversidade (Ímpar). Sempre que uma criatura que você possa ver a até 9 metros de você estiver prestes a fazer um Teste de D20, você pode usar uma Reação para rolar 1d6 e subtrair o número rolado do total.\n\nVocê pode usar essa Reação um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez), e recupera todos os usos gastos ao terminar um Descanso Longo.\n\nNÍVEL 10: CONSTELAÇÕES CINTILANTES\n\nAs constelações da sua Forma Estrelada melhoram. O 1d8 do Arqueiro e do Cálice torna-se 2d8, e enquanto o Dragão estiver ativo, você tem um Deslocamento de Voo de 6 metros e pode pairar.\n\nAlém disso, no início de cada um dos seus turnos enquanto estiver na sua Forma Estrelada, você pode mudar qual constelação brilha em seu corpo.",
        "Whenever you finish a Long Rest, you can consult your Star Map for omens and roll a die. Until you finish your next Long Rest, you gain access to a special Reaction based on whether you rolled an even or an odd number on the die:\n\nWeal (Even). Whenever a creature you can see within 30 feet of you is about to make a D20 Test, you can take a Reaction to roll 1d6 and add the number rolled to the total.\n\nWoe (Odd). Whenever a creature you can see within 30 feet of you is about to make a D20 Test, you can take a Reaction to roll 1d6 and subtract the number rolled from the total.\n\nYou can use this Reaction a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest.\n\nL EV EL 10: TwINKLING CONSTELLATIONS\n\nThe constellations of your Starry Form improve. The 1d8 of the Archer and the Chalice becomes 2d8, and while the Dragon is active, you have a Fly Speed of 20 fe et and can hover.\n\nMoreover, at the start of each of your turns while in your Starry Form, you can change which constellat ion glimmers on your body."),
    ] },
    10: { features: [
      f('twinklingConstellations', 'Constelações Cintilantes', 'Twinkling Constellations',
        "Característica de 10º nível do Círculo das Estrelas\n\nAs constelações da sua Forma Estrelada melhoram. O 1d8 do Arqueiro e do Cálice torna-se 2d8, e enquanto o Dragão estiver ativo, você tem um deslocamento de voo de 6 metros e pode pairar.\n\nAlém disso, no início de cada um dos seus turnos enquanto estiver na Forma Estrelada, você pode mudar qual constelação brilha em seu corpo.",
        "10th-level Circle of Stars feature\n\nThe constellations of your Starry Form improve. The 1d8 of the Archer and the Chalice becomes 2d8, and while the Dragon is active, you have a flying speed of 20 feet and can hover.\n\nMoreover, at the start of each of your turns while in Starry Form, you can change which constellation glimmers on your body."),
    ] },
    14: { features: [
      f('fullOfStars', 'Repleto de Estrelas', 'Full of Stars',
        "Característica de 14º nível do Círculo das Estrelas\n\nEnquanto estiver na sua Forma Estrelada, você se torna parcialmente incorpóreo, o que lhe concede resistência a dano contundente, perfurante e cortante.",
        "14th-level Circle of Stars feature\n\nWhile in your Starry Form, you become partially incorporeal, giving you resistance to bludgeoning, piercing, and slashing damage."),
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
        "No 2º nível, você fica imbuído das bênçãos da Corte do Verão. Você é uma fonte de energia que oferece alívio contra ferimentos. Você tem uma reserva de energia feérica representada por um número de d6s igual ao seu nível de druida.\n\nCom uma ação bônus, você pode escolher uma criatura que possa ver a até 36 metros de você e gastar uma quantidade desses dados igual à metade do seu nível de druida ou menos. Role os dados gastos e some-os. O alvo recupera uma quantidade de pontos de vida igual ao total. O alvo também ganha 1 ponto de vida temporário por dado gasto.\n\nVocê recupera todos os dados gastos ao terminar um descanso longo.",
        "At 2nd level, you become imbued with the blessings of the Summer Court. You are a font of energy that offers respite from injuries. You have a pool of fey energy represented by a number of d6s equal to your druid level.\n\nAs a bonus action, you can choose one creature you can see within 120 feet of you and spend a number of those dice equal to half your druid level or less. Roll the spent dice and add them together. The target regains a number of hit points equal to the total. The target also gains 1 temporary hit point per die spent.\n\nYou regain all expended dice when you finish a long rest."),
    ],
    6: [
      f('hearthOfMoonlight', 'Lar de Luar e Sombra', 'Hearth of Moonlight and Shadow',
        "No 6º nível, o lar pode ser onde quer que você esteja. Durante um descanso curto ou longo, você pode invocar o poder sombrio da Corte Resplandecente para ajudar a guardar seu repouso. No início do descanso, você toca um ponto no espaço, e uma esfera de magia invisível de 9 metros de raio surge, centrada naquele ponto. Cobertura total bloqueia a esfera.\n\nEnquanto estiverem dentro da esfera, você e seus aliados ganham um bônus de +5 em testes de Destreza (Furtividade) e Sabedoria (Percepção), e qualquer luz de chamas abertas na esfera (uma fogueira, tochas ou similares) não é visível do lado de fora.\n\nA esfera desaparece ao final do descanso ou quando você sai da esfera.",
        "At 6th level, home can be wherever you are. During a short or long rest, you can invoke the shadowy power of the Gleaming Court to help guard your respite. At the start of the rest, you touch a point in space, and an invisible, 30-foot—radius sphere of magic appears, centered on that point. Total cover blocks the sphere.\n\nWhile within the sphere, you and your allies gain a +5 bonus to Dexterity (Stealth) and Wisdom (Perception) checks, and any light from open flames in the sphere (a campfire, torches, or the like) isn’t visible outside it.\n\nThe sphere vanishes at the end of the rest or when you leave the sphere."),
    ],
    10: [
      f('hiddenPaths', 'Caminhos Ocultos', 'Hidden Paths',
        "A partir do 10º nível, você pode usar os caminhos mágicos ocultos que algumas fadas usam para atravessar o espaço em um piscar de olhos. Como uma ação bônus no seu turno, você pode se teletransportar até 18 metros para um espaço desocupado que possa ver. Alternativamente, você pode usar sua ação para teletransportar uma criatura voluntária que você tocar até 9 metros para um espaço desocupado que possa ver.\n\nVocê pode usar essa característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez), e recupera todos os usos gastos dela ao terminar um descanso longo.",
        "Starting at 10th level, you can use the hidden, magical pathways that some fey use to traverse space in the blink of an eye. As a bonus action on your turn, you can teleport up to 60 feet to an unoccupied space you can see. Alternatively, you can use your action to teleport one willing creature you touch up to 30 feet to an unoccupied space you can see.\n\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses of it when you finish a long rest."),
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
        "No 2º nível, você adquire a habilidade de conversar com feras e muitas fadas.\n\nVocê aprende a falar, ler e escrever Silvestre. Além disso, as feras podem entender sua fala, e você adquire a habilidade de decifrar seus ruídos e movimentos. A maioria das feras carece de inteligência para transmitir ou compreender conceitos sofisticados, mas uma fera amistosa pode relatar o que viu ou ouviu em um passado recente. Essa habilidade não lhe concede amizade com as feras, embora você possa combinar essa habilidade com presentes para obter favores delas, assim como faria com qualquer personagem do mestre.",
        "At 2nd level, you gain the ability to converse with beasts and many fey.\n\nYou learn to speak, read, and write Sylvan. In addition, beasts can understand your speech, and you gain the ability to decipher their noises and motions. Most beasts lack the intelligence to convey or understand sophisticated concepts, but a friendly beast could relay what it has seen or heard in the recent past. This ability doesn’t grant you friendship with beasts, though you can combine this ability with gifts to curry favor with them as you would with any nonplayer character."),
      f('spiritTotem', 'Totem Espiritual', 'Spirit Totem',
        "A partir do 2º nível, você pode convocar espíritos da natureza para influenciar o mundo ao seu redor. Como uma ação bônus, você pode invocar magicamente um espírito incorpóreo para um ponto que você possa ver a até 18 metros de você. O espírito cria uma aura em um raio de 9 metros ao redor daquele ponto. Ele não conta como criatura nem como objeto, embora tenha a aparência espectral da criatura que representa.\n\nComo uma ação bônus, você pode mover o espírito até 18 metros para um ponto que você possa ver.\n\nO espírito permanece por 1 minuto ou até você ficar incapacitado. Depois de usar essa característica, você não pode usá-la novamente até terminar um descanso curto ou longo.\n\nO efeito da aura do espírito depende do tipo de espírito que você invocar entre as opções abaixo.\n\nEspírito do Urso. O espírito do urso concede a você e aos seus aliados seu vigor e resistência. Cada criatura à sua escolha na aura quando o espírito aparece ganha pontos de vida temporários iguais a 5 + seu nível de druida. Além disso, você e seus aliados ganham vantagem em testes de Força e salvaguardas de Força enquanto estiverem na aura.\n\nEspírito do Falcão. O espírito do falcão é um caçador consumado, ajudando você e seus aliados com sua visão aguçada. Quando uma criatura fizer uma jogada de ataque contra um alvo na aura do espírito, você pode usar sua reação para conceder vantagem àquela jogada de ataque. Além disso, você e seus aliados têm vantagem em testes de Sabedoria (Percepção) enquanto estiverem na aura.\n\nEspírito do Unicórnio. O espírito do unicórnio concede sua proteção àqueles que estão por perto. Você e seus aliados ganham vantagem em todos os testes de habilidade feitos para detectar criaturas na aura do espírito. Além disso, se você conjurar uma magia usando um espaço de magia que recupere pontos de vida de qualquer criatura dentro ou fora da aura, cada criatura à sua escolha na aura também recupera pontos de vida iguais ao seu nível de druida.",
        "Starting at 2nd level, you can call forth nature spirits to influence the world around you. As a bonus action, you can magically summon an incorporeal spirit to a point you can see within 60 feet of you. The spirit creates an aura in a 30-foot radius around that point. It counts as neither a creature nor an object, though it has the spectral appearance of the creature it represents.\n\nAs a bonus action, you can move the spirit up to 60 feet to a point you can see.\n\nThe spirit persists for 1 minute or until you’re incapacitated. Once you use this feature, you can’t use it again until you finish a short or long rest.\n\nThe effect of the spirit’s aura depends on the type of spirit you summon from the options below.\n\nBear Spirit. The bear spirit grants you and your allies its might and endurance. Each creature of your choice in the aura when the spirit appears gains temporary hit points equal to 5 + your druid level. In addition, you and your allies gain advantage on Strength checks and Strength saving throws while in the aura.\n\nHawk Spirit.The hawk spirit is a consummate hunter, aiding you and your allies with its keen sight. When a creature makes an attack roll against a target in the spirit’s aura, you can use your reaction to grant advantage to that attack roll. In addition, you and your allies have advantage on Wisdom (Perception) checks while in the aura.\n\nUnicorn Spirit.The unicorn spirit lends its protection to those nearby. You and your allies gain advantage on all ability checks made to detect creatures in the spirit’s aura. In addition, if you cast a spell using a spell slot that restores hit points to any creature inside or outside the aura, each creature of your choice in the aura also regains hit points equal to your druid level."),
    ],
    6: [
      f('mightySummoner', 'Invocador Poderoso', 'Mighty Summoner',
        "A partir do 6º nível, as feras e fadas que você conjura são mais resistentes que o normal. Qualquer fera ou fada invocada ou criada por uma magia que você conjurar ganha os seguintes benefícios:\n\n• A criatura surge com mais pontos de vida que o normal: 2 pontos de vida adicionais por Dado de Vida que ela possuir.\n\n• O dano de suas armas naturais é considerado mágico com o propósito de superar imunidade e resistência a ataques e danos não mágicos.",
        "Starting at 6th level, beasts and fey that you conjure are more resilient than normal. Any beast or fey summoned or created by a spell that you cast gains the following benefits:\n\n• The creature appears with more hit points than normal: 2 extra hit points per Hit Die it has.\n\n• The damage from its natural weapons is considered magical for the purpose of overcoming immunity and resistance to nonmagical attacks and damage."),
    ],
    10: [
      f('guardianSpirit', 'Espírito Guardião', 'Guardian Spirit',
        "A partir do 10º nível, seu Totem Espiritual protege as feras e fadas que você evoca com sua magia. Quando uma fera ou fada que você invocou ou criou com uma magia terminar o turno dela na aura do seu Totem Espiritual, essa criatura recupera uma quantidade de pontos de vida igual à metade do seu nível de druida.",
        "Beginning at 10th level, your Spirit Totem safeguards the beasts and fey that you call forth with your magic. When a beast or fey that you summoned or created with a spell ends its turn in your Spirit Totem aura, that creature regains a number of hit points equal to half your druid level."),
    ],
    14: [
      f('faithfulSummons', 'Invocações Fiéis', 'Faithful Summons',
        "A partir do 14º nível, os espíritos da natureza com os quais você comunga protegem você quando estiver mais indefeso. Se você for reduzido a 0 pontos de vida ou ficar incapacitado contra a sua vontade, você pode imediatamente obter os benefícios de conjurar animais como se tivesse sido conjurada usando um espaço de magia de 9º círculo. Ela invoca quatro feras de sua escolha que possuam nível de desafio 2 ou menor. As feras conjuradas aparecem a até 6 metros de você. Se elas não receberem comandos seus, protegerão você de perigos e atacarão seus inimigos. A magia dura por 1 hora, não exigindo concentração, ou até você dispensá-la (nenhuma ação necessária).\n\nDepois de usar essa característica, você não pode usá-la novamente até terminar um descanso longo.",
        "Starting at 14th level, the nature spirits you commune with protect you when you are the most defenseless. If you are reduced to 0 hit points or are incapacitated against your will, you can immediately gain the benefits of conjure animals as if it were cast using a 9th-level spell slot. It summons four beasts of your choice that are challenge rating 2 or lower. The conjured beasts appear within 20 feet of you. If they receive no commands from you, they protect you from harm and attack your foes. The spell lasts for 1 hour, requiring no concentration, or until you dismiss it (no action required).\n\nOnce you use this feature, you can’t use it again until you finish a long rest."),
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
        "Característica de 2º nível do Círculo dos Esporos\n\nVocê é cercado por esporos necróticos invisíveis que são inofensivos até você liberá-los sobre uma criatura próxima. Quando uma criatura que você possa ver entrar em um espaço a até 3 metros de você ou iniciar o turno dela ali, você pode usar sua reação para causar 1d4 de dano necrótico àquela criatura, a menos que ela seja bem-sucedida em uma salvaguarda de Constituição contra a CD de salvaguarda de suas magias. O dano necrótico aumenta para 1d6 no 6º nível, 1d8 no 10º nível e 1d10 no 14º nível.",
        "2nd-level Circle of Spores feature\n\nYou are surrounded by invisible, necrotic spores that are harmless until you unleash them on a creature nearby. When a creature you can see moves into a space within 10 feet of you or starts its turn there, you can use your reaction to deal 1d4 necrotic damage to that creature unless it succeeds on a Constitution saving throw against your spell save DC. The necrotic damage increases to 1d6 at 6th level, 1d8 at 10th level, and 1d10 at 14th level."),
      f('symbioticEntity', 'Entidade Simbiótica', 'Symbiotic Entity',
        'Como ação, gaste um uso de Forma Selvagem (sem se transformar): ganhe 4 PV temporários por nível de druida; enquanto durarem, o dano do Halo de Esporos é rolado duas vezes e seus ataques corpo a corpo com arma causam +1d6 de dano Necrótico. Dura 10 minutos, até perder esses PV temporários ou até usar Forma Selvagem de novo.',
        'As an action, expend a Wild Shape use (without transforming): gain 4 Temporary HP per Druid level; while they last, Halo of Spores damage is rolled twice and your melee weapon hits deal an extra 1d6 Necrotic damage. Lasts 10 minutes, until those Temporary HP are gone, or until you use Wild Shape again.'),
    ],
    6: [
      f('fungalInfestation', 'Infestação Fúngica', 'Fungal Infestation',
        "Característica de 6º nível do Círculo dos Esporos\n\nSeus esporos adquirem a habilidade de infestar um cadáver e animá-lo. Se uma fera ou humanoide Pequeno ou Médio morrer a até 3 metros de você, você pode usar sua reação para animá-lo, fazendo com que ele se levante imediatamente com 1 ponto de vida. A criatura usa o bloco de estatísticas do Zumbi no Manual dos Monstros. Ela permanece animada por 1 hora, após a qual cai e morre.\n\nEm combate, o turno do zumbi ocorre imediatamente após o seu. Ele obedece aos seus comandos mentais, e a única ação que ele pode realizar é a ação de Atacar, fazendo um único ataque corpo a corpo.\n\nVocê pode usar essa característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez), e recupera todos os usos gastos dela ao terminar um descanso longo.",
        "6th-level Circle of Spores feature\n\nYour spores gain the ability to infest a corpse and animate it. If a beast or a humanoid that is Small or Medium dies within 10 feet of you, you can use your reaction to animate it, causing it to stand up immediately with 1 hit point. The creature uses the Zombie stat block in the Monster Manual. It remains animate for 1 hour, after which time it collapses and dies.\n\nIn combat, the zombie’s turn comes immediately after yours. It obeys your mental commands, and the only action it can take is the Attack action, making one melee attack.\n\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses of it when you finish a long rest."),
    ],
    10: [
      f('spreadingSpores', 'Esporos Disseminados', 'Spreading Spores',
        "Característica de 10º nível do Círculo dos Esporos\n\nVocê ganha a habilidade de semear uma área com esporos mortais. Como uma ação bônus enquanto sua característica Entidade Simbiótica estiver ativa, você pode arremessar esporos a até 9 metros de distância, onde eles giram em um cubo de 3 metros por 1 minuto. Os esporos desaparecem mais cedo se você usar essa característica novamente, se os dispensar com uma ação bônus ou se sua característica Entidade Simbiótica não estiver mais ativa.\n\nSempre que uma criatura se mover para dentro do cubo ou iniciar o turno dela ali, essa criatura sofre o dano da sua Auréola de Esporos, a menos que a criatura seja bem-sucedida em uma salvaguarda de Constituição contra a CD de salvaguarda de suas magias. Uma criatura pode sofrer esse dano no máximo uma vez por turno.\n\nEnquanto o cubo de esporos persistir, você não pode usar sua reação da Auréola de Esporos.",
        "10th-level Circle of Spores feature\n\nYou gain the ability to seed an area with deadly spores. As a bonus action while your Symbiotic Entity feature is active, you can hurl spores up to 30 feet away, where they swirl in a 10-foot cube for 1 minute. The spores disappear early if you use this feature again, if you dismiss them as a bonus action, or if your Symbiotic Entity feature is no longer active.\n\nWhenever a creature moves into the cube or starts its turn there, that creature takes your Halo of Spores damage, unless the creature succeeds on a Constitution saving throw against your spell save DC. A creature can take this damage no more than once per turn.\n\nWhile the cube of spores persists, you can’t use your Halo of Spores reaction."),
    ],
    14: [
      f('fungalBody', 'Corpo Fúngico', 'Fungal Body',
        "Característica de 14º nível do Círculo dos Esporos\n\nOs esporos fúngicos em seu corpo alteram você: você não pode ficar cego, surdo, amedrontado ou envenenado, e qualquer acerto crítico contra você conta como um acerto normal, a menos que você esteja incapacitado.",
        "14th-level Circle of Spores feature\n\nThe fungal spores in your body alter you: you can’t be blinded, deafened, frightened, or poisoned, and any critical hit against you counts as a normal hit instead, unless you’re incapacitated."),
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
        "Característica de 2º nível do Círculo do Fogo Selvagem\n\nVocê pode invocar o espírito primordial vinculado à sua alma. Como uma ação, você pode gastar um uso da sua característica Forma Selvagem para invocar seu espírito do fogo selvagem, em vez de assumir uma forma de besta.\n\nO espírito aparece em um espaço desocupado à sua escolha que você possa ver a até 9 metros de você. Cada criatura a até 3 metros do espírito (exceto você) quando ele aparece deve ser bem-sucedida em uma salvaguarda de Destreza contra a CD de resistência das suas magias ou sofrerá 2d6 de dano de fogo.\n\nO espírito é amistoso a você e aos seus companheiros e obedece aos seus comandos. Veja as estatísticas de jogo desta criatura no bloco de estatísticas do Espírito do Fogo Selvagem, que usa seu bônus de proficiência (BP) em vários lugares. Você determina a aparência do espírito. Alguns espíritos assumem a forma de uma figura humanoide feita de galhos nodosos cobertos de chamas, enquanto outros parecem bestas envoltas em fogo.\n\nEm combate, o espírito compartilha sua contagem de iniciativa, mas realiza seu turno imediatamente após o seu. A única ação que ele realiza em seu turno é a ação de Desviar, a menos que você use uma ação bônus em seu turno para comandá-lo a realizar outra ação. Essa ação pode ser uma de seu bloco de estatísticas ou alguma outra ação. Se você estiver incapacitado, o espírito pode realizar qualquer ação à escolha dele, não apenas Desviar.\ne iniciativa, mas realiza seu turno imediatamente após o seu. A única ação que ele realiza em seu turno é a ação de Desviar, a menos que você use uma ação bônus em seu turno para comandá-lo a realizar outra ação. Essa ação pode ser uma de seu bloco de estatísticas ou alguma outra ação. Se você estiver incapacitado, o espírito pode realizar qualquer ação à escolha dele, não apenas Desviar.\n\nO espírito se manifesta por 1 hora, até ser reduzido a 0 pontos de vida, até você usar esta característica para invocar o espírito novamente, ou até você morrer.",
        "2nd-level Circle of Wildfire feature\n\nYou can summon the primal spirit bound to your soul. As an action, you can expend one use of your Wild Shape feature to summon your wildfire spirit, rather than assuming a beast form.\n\nThe spirit appears in an unoccupied space of your choice that you can see within 30 feet of you. Each creature within 10 feet of the spirit (other than you) when it appears must succeed on a Dexterity saving throw against your spell save DC or take 2d6 fire damage.\n\nThe spirit is friendly to you and your companions and obeys your commands. See this creature’s game statistics in the Wildfire Spirit stat block, which uses your proficiency bonus (PB) in several places. You determine the spirit’s appearance. Some spirits take the form of a humanoid figure made of gnarled branches covered in flame, while others look like beasts wreathed in fire.\n\nIn combat, the spirit shares your initiative count, but it takes its turn immediately after yours. The only action it takes on its turn is the Dodge action, unless you take a bonus action on your turn to command it to take another action. That action can be one in its stat block or some other action. If you are incapacitated, the spirit can take any action of its choice, not just Dodge.\n\nThe spirit manifests for 1 hour, until it is reduced to 0 hit points, until you use this feature to summon the spirit again, or until you die."),
    ],
    6: [
      f('enhancedBond', 'Vínculo Aprimorado', 'Enhanced Bond',
        "Característica de 6º nível do Círculo do Fogo Selvagem\n\nO vínculo com seu espírito do fogo selvagem aprimora suas magias destrutivas e restauradoras. Sempre que você conjurar uma magia que cause dano de fogo ou recupere pontos de vida enquanto seu espírito do fogo selvagem estiver invocado, role um d8, e você ganha um bônus igual ao número rolado em uma rolagem de dano ou de cura da magia.\n\nAlém disso, quando você conjurar uma magia com alcance diferente de si mesmo, a magia pode se originar de você ou do seu espírito do fogo selvagem.",
        "6th-level Circle of Wildfire feature\n\nThe bond with your wildfire spirit enhances your destructive and restorative spells. Whenever you cast a spell that deals fire damage or restores hit points while your wildfire spirit is summoned, roll a d8, and you gain a bonus equal to the number rolled to one damage or healing roll of the spell.\n\nIn addition, when you cast a spell with a range other than self, the spell can originate from you or your wildfire spirit."),
    ],
    10: [
      f('cauterizingFlames', 'Chamas Cauterizantes', 'Cauterizing Flames',
        "Característica de 10º nível do Círculo do Fogo Selvagem\nnt>\n\n!ID_INTERNAL_FEATURE_REPLACEMENT_DRUID_WILDFIRE_CAUTERIZING_FLAMES\n\nCaracterística de 10º nível do Círculo do Fogo Selvagem\n\nVocê ganha a habilidade de transformar a morte em chamas mágicas que podem curar ou incinerar. Quando uma criatura Pequena ou maior morre a até 9 metros de você ou do seu espírito do fogo selvagem, uma chama espectral inofensiva surge no espaço da criatura morta e tremula ali por 1 minuto. Quando uma criatura que você possa ver entra nesse espaço, você pode usar sua reação para extinguir a chama espectral ali e curar a criatura ou causar dano de fogo a ela. A cura ou dano é igual a 2d10 + seu modificador de Sabedoria.\n\nVocê pode usar essa reação um número de vezes igual ao seu bônus de proficiência, e você recupera todos os usos gastos ao terminar um descanso longo.",
        "10th-level Circle of Wildfire feature\nnt>\n\n!ID_INTERNAL_FEATURE_REPLACEMENT_DRUID_WILDFIRE_CAUTERIZING_FLAMES\n\n10th-level Circle of Wildfire feature\n\nYou gain the ability to turn death into magical flames that can heal or incinerate. When a Small or larger creature dies within 30 feet of you or your wildfire spirit, a harmless spectral flame springs forth in the dead creature’s space and flickers there for 1 minute. When a creature you can see enters that space, you can use your reaction to extinguish the spectral flame there and either heal the creature or deal fire damage to it. The healing or damage equals 2d10 + your Wisdom modifier.\n\nYou can use this reaction a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."),
    ],
    14: [
      f('blazingRevival', 'Renascimento Ardente', 'Blazing Revival',
        "Característica de 14º nível do Círculo do Fogo Selvagem\n\nO vínculo com seu espírito do fogo selvagem pode salvá-lo da morte. Se o espírito estiver a até 36 metros de você quando você for reduzido a 0 pontos de vida e consequentemente cair inconsciente, você pode fazer com que o espírito caia para 0 pontos de vida. Você então recupera metade dos seus pontos de vida e imediatamente se levanta.\n\nAssim que usar esta característica, você não pode usá-la novamente até terminar um descanso longo.",
        "14th-level Circle of Wildfire feature\n\nThe bond with your wildfire spirit can save you from death. If the spirit is within 120 feet of you when you are reduced to 0 hit points and thereby fall unconscious, you can cause the spirit to drop to 0 hit points. You then regain half your hit points and immediately rise to your feet.\n\nOnce you use this feature, you can’t use it again until you finish a long rest."),
    ],
  }, { 3: ['burningHands', 'cureWounds', 'flamingSphere', 'scorchingRay'], 5: ['plantGrowth', 'revivify'], 7: ['auraOfLife', 'fireShield'], 9: ['flameStrike', 'massCureWounds'] }),
};

// Unearthed Arcana (playtest, já escrito para 2024): versão revisada do
// Villainous Options Update (18/jun/2026). Resumo original; as fichas completas
// das três Formas de Titã ficam no documento do UA (resolvidas na mesa).
const titan = {
  name: b('Círculo do Titã (kaiju) — UA', 'Circle of the Titan — UA'),
  source: 'UA26VOU',
  desc: b('Playtest: druidas que derrubam a civilização quando ela ameaça a natureza, virando monstros colossais no estilo kaiju.',
    'Playtest: druids who topple civilization when it threatens nature, becoming colossal kaiju-style monsters.'),
  levels: circle('titan', b('Círculo do Titã', 'Circle of the Titan'), {
    3: [
      f('titanForms', 'Formas de Titã', 'Titan Forms',
        'Ao usar Forma Selvagem, você pode assumir uma Forma de Titã Grande em vez de uma Fera: Behemoth (terrestre; Sopro Incandescente em linha, alimentado por espaços de magia, causa dano Radiante e dano dobrado a objetos e estruturas), Leviatã (anfíbio, com natação; Nuvem de Tinta como Reação ao sofrer dano) ou Insectoide (voo; Pólen Energizante cura e reposiciona aliados). Na forma, sua CA é 13 + modificador de Sabedoria, você ataca com Dilacerar e ganha PV temporários iguais a 4 × seu nível de druida. A forma dura 10 minutos (não as horas normais da Forma Selvagem), e você pode conjurar as magias do círculo nela.',
        'When you use Wild Shape, you can assume a Large Titan Form instead of a Beast: Behemoth (land; a line-shaped Incandescent Breath, fueled by spell slots, deals Radiant damage and double damage to objects and structures), Leviathan (amphibious, with a Swim Speed; Ink Cloud as a Reaction when damaged), or Insectoid (flying; Energizing Pollen heals and repositions allies). In the form, your AC is 13 + your Wisdom modifier, you attack with Rend, and you gain Temporary HP equal to 4 × your Druid level. The form lasts 10 minutes (not Wild Shape\'s usual hours), and you can cast your circle spells in it.'),
    ],
    6: [
      f('direImpact', 'Impacto Terrível', 'Dire Impact',
        "Dilacerar Elemental: ao acertar com Dilacerar da Forma de Titã, você pode causar dano Ácido, Elétrico, de Fogo, de Frio ou Trovejante. Onda de Choque: logo após assumir a Forma de Titã, ou como Ação Bônus gastando um espaço de magia de nível 1+ enquanto estiver nela, o chão treme numa emanação de 4,5 m; as criaturas na área fazem salvaguarda de Constituição contra sua CD ou ficam Caídas.",
        'Elemental Rend: when you hit with your Titan Form\'s Rend, you can make it deal Acid, Cold, Fire, Lightning, or Thunder damage. Shock Wave: right after you assume a Titan Form, or as a Bonus Action by expending a level 1+ spell slot while in it, the ground heaves in a 15-foot emanation; creatures there make a Constitution save against your DC or have the Prone condition.'),
    ],
    10: [
      f('primalHavoc', 'Devastação Primal', 'Primal Havoc',
        'Tamanho Enorme: ao assumir a Forma de Titã, você pode ficar Enorme. Couro Endurecido: logo após assumir uma Forma de Titã Enorme ou maior, gaste um espaço de magia de nível 1+ para ganhar bônus na CA igual à metade do nível do espaço (arredondado para cima) enquanto a forma durar. Cada forma ganha ainda a habilidade de nível 10 da sua ficha (como o Fedor Tóxico do Leviatã, que envenena quem começa o turno perto de você).',
        'Huge Size: when you assume a Titan Form, you can become Huge. Toughened Hide: right after you assume a Huge or larger Titan Form, expend a level 1+ spell slot to gain an AC bonus equal to half the slot\'s level (round up) for the form\'s duration. Each form also gains the level 10 ability in its stat block (such as the Leviathan\'s Toxic Stench, which poisons creatures that start their turn near you).'),
    ],
    14: [
      f('monstrousAppetite', 'Apetite Monstruoso', 'Monstrous Appetite',
        'Tamanho Imenso: ao assumir a Forma de Titã, você pode ficar Imenso. Dilacerar Agarrador: sendo Enorme ou maior, uma vez por turno, ao acertar Dilacerar, você pode deixar o alvo Agarrado. Engolir: sendo Imenso, como Ação Bônus, uma criatura Grande ou menor Agarrada por você faz salvaguarda de Força contra sua CD; se falhar, você a engole (os efeitos de estar engolido estão no documento do UA).',
        'Gargantuan Size: when you assume a Titan Form, you can become Gargantuan. Grappling Rend: while Huge or larger, once per turn when you hit with Rend, you can give the target the Grappled condition. Swallow: while Gargantuan, as a Bonus Action, a Large or smaller creature Grappled by you makes a Strength save against your DC; on a failure, you swallow it (the effects of being swallowed are in the UA document).'),
    ],
  }, { 3: ['enlargeReduce', 'thunderwave'], 5: ['fear'], 7: ['fireShield'], 9: ['destructiveWave'] }, { 3: ['thaumaturgy'] }),
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
  { id: 'starMapGuidingBolt', name: b('Mapa Estelar (Flecha Guiada grátis)', 'Star Map (free Guiding Bolt)'),
    uses: WIS, recharge: 'long', minLevel: 3, subclass: ['stars'], rules: '2024' },
  { id: 'starMapGuidingBoltLegacy', name: b('Mapa Estelar (Flecha Guiada grátis)', 'Star Map (free Guiding Bolt)'),
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
  subclasses: { land, moon, sea, stars, dreams, shepherd, spores, wildfire, titan },
};
