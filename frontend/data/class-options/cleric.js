// Clérigo — opções, traços e domínios (regras 2024). Formato em README.md.
// Classe base e Domínio da Vida: SRD 5.2.1 (CC-BY 4.0), texto adaptado.
// Demais domínios: resumos ORIGINAIS (nada copiado de livros pagos).
// Domínios de livros de 2014 foram ajustados às regras de 2024: traços dos
// níveis 1 e 2 vão para o 3; magias de domínio nos níveis 3/5/7/9; o traço de
// nível 8 (Golpe Divino / Conjuração Potente) sai, pois a classe já concede
// Golpes Abençoados no nível 7.
// Domínio da Pestilência: playtest (Unearthed Arcana 2026), já escrito para 2024.
const b = (pt, en) => ({ pt, en });
const f = (id, pt, en, dpt, den) => ({ id, name: b(pt, en), desc: b(dpt, den) });

// Nomes das magias citadas nas tabelas de domínio.
const SPELL = {
  aid: b('Auxílio', 'Aid'), bless: b('Bênção', 'Bless'), cureWounds: b('Curar Ferimentos', 'Cure Wounds'),
  lesserRestoration: b('Restauração Menor', 'Lesser Restoration'), massHealingWord: b('Palavra Curativa em Massa', 'Mass Healing Word'),
  revivify: b('Revivificar', 'Revivify'), auraOfLife: b('Aura de Vida', 'Aura of Life'), deathWard: b('Proteção contra a Morte', 'Death Ward'),
  greaterRestoration: b('Restauração Maior', 'Greater Restoration'), massCureWounds: b('Curar Ferimentos em Massa', 'Mass Cure Wounds'),
  burningHands: b('Mãos Flamejantes', 'Burning Hands'), faerieFire: b('Fogo das Fadas', 'Faerie Fire'),
  scorchingRay: b('Raio Ardente', 'Scorching Ray'), seeInvisibility: b('Ver o Invisível', 'See Invisibility'),
  daylight: b('Luz do Dia', 'Daylight'), fireball: b('Bola de Fogo', 'Fireball'), arcaneEye: b('Olho Arcano', 'Arcane Eye'),
  wallOfFire: b('Muralha de Fogo', 'Wall of Fire'), flameStrike: b('Coluna de Chamas', 'Flame Strike'), scrying: b('Vidência', 'Scrying'),
  charmPerson: b('Enfeitiçar Pessoa', 'Charm Person'), disguiseSelf: b('Disfarçar-se', 'Disguise Self'),
  invisibility: b('Invisibilidade', 'Invisibility'), passWithoutTrace: b('Passos sem Pegadas', 'Pass without Trace'),
  hypnoticPattern: b('Padrão Hipnótico', 'Hypnotic Pattern'), nondetection: b('Indetectável', 'Nondetection'),
  confusion: b('Confusão', 'Confusion'), dimensionDoor: b('Porta Dimensional', 'Dimension Door'),
  dominatePerson: b('Dominar Pessoa', 'Dominate Person'), modifyMemory: b('Modificar Memória', 'Modify Memory'),
  guidingBolt: b('Flecha Guiada', 'Guiding Bolt'), magicWeapon: b('Arma Mágica', 'Magic Weapon'),
  shieldOfFaith: b('Escudo da Fé', 'Shield of Faith'), spiritualWeapon: b('Arma Espiritual', 'Spiritual Weapon'),
  crusadersMantle: b('Manto do Cruzado', "Crusader's Mantle"), spiritGuardians: b('Guardiões Espirituais', 'Spirit Guardians'),
  fireShield: b('Escudo de Fogo', 'Fire Shield'), freedomOfMovement: b('Liberdade de Movimento', 'Freedom of Movement'),
  holdMonster: b('Imobilizar Monstro', 'Hold Monster'), steelWindStrike: b('Golpe do Vento de Aço', 'Steel Wind Strike'),
  command: b('Comando', 'Command'), identify: b('Identificação', 'Identify'), augury: b('Augúrio', 'Augury'),
  suggestion: b('Sugestão', 'Suggestion'), speakWithDead: b('Falar com os Mortos', 'Speak with Dead'), legendLore: b('Lenda e Saber', 'Legend Lore'),
  animalFriendship: b('Amizade Animal', 'Animal Friendship'), speakWithAnimals: b('Falar com Animais', 'Speak with Animals'),
  barkskin: b('Pele de Árvore', 'Barkskin'), spikeGrowth: b('Crescer Espinhos', 'Spike Growth'),
  plantGrowth: b('Crescimento de Plantas', 'Plant Growth'), windWall: b('Muralha de Vento', 'Wind Wall'),
  dominateBeast: b('Dominar Fera', 'Dominate Beast'), graspingVine: b('Vinha Agarradora', 'Grasping Vine'),
  insectPlague: b('Praga de Insetos', 'Insect Plague'), treeStride: b('Caminhar em Árvores', 'Tree Stride'),
  fogCloud: b('Nuvem de Névoa', 'Fog Cloud'), thunderwave: b('Onda Trovejante', 'Thunderwave'),
  gustOfWind: b('Lufada de Vento', 'Gust of Wind'), shatter: b('Despedaçar', 'Shatter'),
  callLightning: b('Invocar Relâmpagos', 'Call Lightning'), sleetStorm: b('Tempestade de Neve', 'Sleet Storm'),
  controlWater: b('Controlar a Água', 'Control Water'), iceStorm: b('Tempestade de Gelo', 'Ice Storm'),
  destructiveWave: b('Onda Destrutiva', 'Destructive Wave'),
  falseLife: b('Vida Falsa', 'False Life'), rayOfSickness: b('Raio da Doença', 'Ray of Sickness'),
  blindnessDeafness: b('Cegueira/Surdez', 'Blindness/Deafness'), rayOfEnfeeblement: b('Raio do Enfraquecimento', 'Ray of Enfeeblement'),
  animateDead: b('Animar Mortos', 'Animate Dead'), vampiricTouch: b('Toque Vampírico', 'Vampiric Touch'),
  blight: b('Definhar', 'Blight'), antilifeShell: b('Concha Antivida', 'Antilife Shell'), cloudkill: b('Névoa Mortal', 'Cloudkill'),
  detectMagic: b('Detectar Magia', 'Detect Magic'), magicMissile: b('Míssil Mágico', 'Magic Missile'),
  arcanistsMagicAura: b('Aura Mágica do Arcanista', "Arcanist's Magic Aura"), dispelMagic: b('Dissipar Magia', 'Dispel Magic'),
  magicCircle: b('Círculo Mágico', 'Magic Circle'), secretChest: b('Baú Secreto', 'Secret Chest'),
  planarBinding: b('Ligação Planar', 'Planar Binding'), teleportationCircle: b('Círculo de Teletransporte', 'Teleportation Circle'),
  searingSmite: b('Golpe Abrasador', 'Searing Smite'), heatMetal: b('Esquentar Metal', 'Heat Metal'),
  elementalWeapon: b('Arma Elemental', 'Elemental Weapon'), protectionFromEnergy: b('Proteção contra Energia', 'Protection from Energy'),
  fabricate: b('Fabricar', 'Fabricate'), animateObjects: b('Animar Objetos', 'Animate Objects'), creation: b('Criação', 'Creation'),
  bane: b('Perdição', 'Bane'), gentleRepose: b('Repouso Tranquilo', 'Gentle Repose'), raiseDead: b('Reviver os Mortos', 'Raise Dead'),
  heroism: b('Heroísmo', 'Heroism'), holdPerson: b('Imobilizar Pessoa', 'Hold Person'), zoneOfTruth: b('Zona da Verdade', 'Zone of Truth'),
  slow: b('Lentidão', 'Slow'), compulsion: b('Compulsão', 'Compulsion'), locateCreature: b('Localizar Criatura', 'Locate Creature'),
  commune: b('Comunhão', 'Commune'), sanctuary: b('Santuário', 'Sanctuary'), wardingBond: b('Vínculo Protetor', 'Warding Bond'),
  beaconOfHope: b('Sinal de Esperança', 'Beacon of Hope'), sending: b('Enviar Mensagem', 'Sending'),
  auraOfPurity: b('Aura de Pureza', 'Aura of Purity'), resilientSphere: b('Esfera Resiliente', 'Resilient Sphere'),
  telepathicBond: b('Vínculo Telepático', 'Telepathic Bond'), sleep: b('Sono', 'Sleep'), moonbeam: b('Raio Lunar', 'Moonbeam'),
  auraOfVitality: b('Aura de Vitalidade', 'Aura of Vitality'), tinyHut: b('Cabana', 'Tiny Hut'),
  greaterInvisibility: b('Invisibilidade Maior', 'Greater Invisibility'), circleOfPower: b('Círculo de Poder', 'Circle of Power'),
  mislead: b('Despistar', 'Mislead'),
  detectPoisonAndDisease: b('Detectar Veneno e Doenças', 'Detect Poison and Disease'), protectionFromPoison: b('Proteção contra Veneno', 'Protection from Poison'),
  stinkingCloud: b('Nuvem Fedorenta', 'Stinking Cloud'), giantInsect: b('Inseto Gigante', 'Giant Insect'), contagion: b('Contágio', 'Contagion'),
};

/**
 * Monta os níveis de um domínio: `spells` = { nível: [ids] } (sempre preparadas),
 * `feats` = { nível: [traços] }, `extra` = { nível: { autoCantrips… } }.
 * Gera também o traço "Magias do Domínio" no nível 3, com a tabela no texto.
 */
function domain(key, domainName, spells, feats, extra = {}) {
  const table = (lang) => Object.entries(spells)
    .map(([lv, ids]) => `${lv}: ${ids.map(id => SPELL[id]?.[lang] || id).join(', ')}`).join('; ');
  const spellFeature = f(`${key}DomainSpells`, `Magias do ${domainName.pt}`, `${domainName.en} Spells`,
    `Ao alcançar os níveis de clérigo indicados, você passa a ter sempre preparadas estas magias (não contam no limite de preparadas). Nível ${table('pt')}.`,
    `When you reach the listed Cleric levels, you always have these spells prepared (they don't count against your prepared spells). Level ${table('en')}.`);
  const levels = {};
  const at = (lv) => (levels[lv] ||= {});
  for (const [lv, list] of Object.entries(feats)) at(lv).features = [...list];
  at(3).features = [...(at(3).features || []), spellFeature];
  for (const [lv, ids] of Object.entries(spells)) at(lv).autoSpells = [...ids];
  for (const [lv, node] of Object.entries(extra)) Object.assign(at(lv), node);
  if (DOMAIN_GRANTS_2024[key]) at(3).grants = DOMAIN_GRANTS_2024[key];
  return levels;
}

// ---------------------------------------------------------------------------
// Pools

const divineOrder = {
  name: b('Ordem Divina', 'Divine Order'),
  options: [
    { id: 'protector', name: b('Protetor', 'Protector'), source: 'SRD',
      desc: b('Treinado para a batalha: proficiência com armas marciais e treino com armadura pesada.',
        'Trained for battle: proficiency with Martial weapons and training with Heavy armor.'),
      grants: { weapons: ['martial'], armor: ['heavy'] } },
    { id: 'thaumaturge', name: b('Taumaturgo', 'Thaumaturge'), source: 'SRD',
      desc: b('Conhece um truque extra da lista de clérigo e soma o modificador de Sabedoria (mínimo +1) aos testes de Inteligência (Arcanismo ou Religião).',
        'Know one extra Cleric cantrip and add your Wisdom modifier (minimum +1) to Intelligence (Arcana or Religion) checks.'),
      choices: { thaumaturgeCantrip: 1 } },
  ],
};

const blessedStrikes = {
  name: b('Golpes Abençoados', 'Blessed Strikes'),
  options: [
    { id: 'divineStrike', name: b('Golpe Divino', 'Divine Strike'), source: 'SRD',
      desc: b('Uma vez em cada turno seu, ao acertar uma criatura com jogada de ataque usando uma arma, cause 1d8 de dano extra necrótico ou radiante (à sua escolha). No nível 14, o dano extra passa a 2d8.',
        'Once on each of your turns when you hit a creature with an attack roll using a weapon, deal an extra 1d8 Necrotic or Radiant damage (your choice). At level 14 the extra damage becomes 2d8.') },
    { id: 'potentSpellcasting', name: b('Conjuração Potente', 'Potent Spellcasting'), source: 'SRD',
      desc: b("Some o modificador de Sabedoria ao dano de qualquer truque de clérigo. No nível 14, ao causar dano com um truque de clérigo, você ou uma criatura a até 18 m recebe PV temporários iguais ao dobro do seu modificador de Sabedoria.",
        'Add your Wisdom modifier to the damage of any Cleric cantrip. At level 14, when a Cleric cantrip deals damage, you or a creature within 60 feet gains Temporary Hit Points equal to twice your Wisdom modifier.') },
  ],
};

// Proficiências fixas dos domínios. Em 2024 vêm de `grants` no nível 3 de cada
// domínio (abaixo). Fichas 2014 usam os nós de subclasse legados de rules.js,
// que este arquivo não alcança; para elas fica este pool (só `rules: '2014'`),
// aberto no nível 1 por `legacySubclassChoices` — uma vaga, só a opção do
// próprio domínio é elegível.
const HEAVY_G = { armor: ['heavy'] };
const MARTIAL_HEAVY_G = { weapons: ['martial'], armor: ['heavy'] };
const HEAVY = b('Treino com armadura pesada.', 'Heavy armor training.');
const MARTIAL_HEAVY = b('Armas marciais e treino com armadura pesada.', 'Martial weapons and Heavy armor training.');
const DOMAIN_GRANTS_2024 = {
  nature: HEAVY_G, tempest: MARTIAL_HEAVY_G, death: { weapons: ['martial'] }, arcana: { skills: ['arcana'] },
  forge: { armor: ['heavy'], tools: ['smithsTools'] }, order: HEAVY_G, twilight: MARTIAL_HEAVY_G,
};
const legacyProf = (id, sub, pt, en, desc, grants) => ({
  id, name: b(pt, en), rules: '2014', desc, prereq: { subclass: [sub] }, grants,
  source: { life: 'PHB', war: 'PHB', nature: 'PHB', tempest: 'PHB', death: 'DMG', arcana: 'SCAG', forge: 'XGE', order: 'TCE', twilight: 'TCE' }[sub],
});
const legacyDomainProficiencies = {
  name: b('Proficiências do Domínio (2014)', 'Domain Proficiencies (2014)'),
  options: [
    legacyProf('lifeProficiency', 'life', 'Vida: Proficiência Bônus', 'Life: Bonus Proficiency', HEAVY, HEAVY_G),
    legacyProf('warProficiencies', 'war', 'Guerra: Proficiências Bônus', 'War: Bonus Proficiencies', MARTIAL_HEAVY, MARTIAL_HEAVY_G),
    legacyProf('natureProficiency', 'nature', 'Natureza: Proficiência Bônus', 'Nature: Bonus Proficiency', HEAVY, DOMAIN_GRANTS_2024.nature),
    legacyProf('tempestProficiencies', 'tempest', 'Tempestade: Proficiências Bônus', 'Tempest: Bonus Proficiencies', MARTIAL_HEAVY, DOMAIN_GRANTS_2024.tempest),
    legacyProf('deathProficiency', 'death', 'Morte: Proficiência Bônus', 'Death: Bonus Proficiency', b('Armas marciais.', 'Martial weapons.'), DOMAIN_GRANTS_2024.death),
    legacyProf('arcanaProficiency', 'arcana', 'Arcano: Iniciado Arcano', 'Arcana: Arcane Initiate', b('Proficiência em Arcanismo.', 'Arcana skill proficiency.'), DOMAIN_GRANTS_2024.arcana),
    legacyProf('forgeProficiencies', 'forge', 'Forja: Proficiências Bônus', 'Forge: Bonus Proficiencies', b('Treino com armadura pesada e ferramentas de ferreiro.', "Heavy armor training and Smith's Tools."), DOMAIN_GRANTS_2024.forge),
    legacyProf('orderProficiency', 'order', 'Ordem: Proficiência Bônus', 'Order: Bonus Proficiency', HEAVY, DOMAIN_GRANTS_2024.order),
    legacyProf('twilightProficiencies', 'twilight', 'Crepúsculo: Proficiências Bônus', 'Twilight: Bonus Proficiencies', MARTIAL_HEAVY, DOMAIN_GRANTS_2024.twilight),
  ],
};

const skillPool = (pt, en, from) => ({ name: b(pt, en), kind: 'skill', grantAs: 'skill', filter: { from } });
const spellPool = (pt, en, filter, grantAs) => ({ name: b(pt, en), kind: 'spell', filter, grantAs });

const pools = {
  divineOrder,
  blessedStrikes,
  legacyDomainProficiencies,
  // Taumaturgo: +1 truque de clérigo (não conta no limite da tabela).
  thaumaturgeCantrip: spellPool('Truque do Taumaturgo', 'Thaumaturge Cantrip', { classes: ['cleric'], level: 0 }, 'cantrip'),
  // Domínio do Conhecimento — Bênçãos do Conhecimento.
  knowledgeLanguage: { name: b('Idiomas do Conhecimento', 'Knowledge Languages'), kind: 'language', grantAs: 'language' },
  knowledgeSkill: { name: b('Perícias do Conhecimento (Especialização)', 'Knowledge Skills (Expertise)'), kind: 'skill', grantAs: 'expertise',
    filter: { from: ['arcana', 'history', 'nature', 'religion'] } },
  // Domínio da Natureza — Acólito da Natureza.
  natureSkill: skillPool('Perícia do Acólito da Natureza', 'Acolyte of Nature Skill', ['animalHandling', 'nature', 'survival']),
  natureCantrip: spellPool('Truque de Druida', 'Druid Cantrip', { classes: ['druid'], level: 0 }, 'cantrip'),
  // Domínio da Morte — Ceifador (truque de necromancia de qualquer lista).
  reaperCantrip: spellPool('Truque de Necromancia', 'Necromancy Cantrip', { level: 0, school: ['necromancy'] }, 'cantrip'),
  // Domínio Arcano — Iniciado Arcano e Maestria Arcana.
  arcanaCantrip: spellPool('Truques de Mago', 'Wizard Cantrips', { classes: ['wizard'], level: 0 }, 'cantrip'),
  arcaneMastery6: spellPool('Maestria Arcana: magia de 6º círculo', 'Arcane Mastery: level 6 spell', { classes: ['wizard'], level: 6 }, 'spell'),
  arcaneMastery7: spellPool('Maestria Arcana: magia de 7º círculo', 'Arcane Mastery: level 7 spell', { classes: ['wizard'], level: 7 }, 'spell'),
  arcaneMastery8: spellPool('Maestria Arcana: magia de 8º círculo', 'Arcane Mastery: level 8 spell', { classes: ['wizard'], level: 8 }, 'spell'),
  arcaneMastery9: spellPool('Maestria Arcana: magia de 9º círculo', 'Arcane Mastery: level 9 spell', { classes: ['wizard'], level: 9 }, 'spell'),
  // Domínio da Ordem / da Paz — perícia à escolha.
  orderSkill: skillPool('Perícia da Ordem', 'Order Skill', ['intimidation', 'persuasion']),
  peaceSkill: skillPool('Instrumento da Paz', 'Implement of Peace', ['insight', 'performance', 'persuasion']),
};

// ---------------------------------------------------------------------------
// Traços da classe base (SRD 5.2.1)

const asi = (lv) => f('abilityScoreImprovement', 'Aumento de Atributo', 'Ability Score Improvement',
  'Você ganha o talento Aumento de Atributo ou outro talento para o qual se qualifique. Este traço se repete nos níveis de clérigo 4, 8, 12 e 16.' + (lv === 4 ? ' No nível 4 você também aprende um truque de clérigo a mais.' : ''),
  'You gain the Ability Score Improvement feat or another feat of your choice for which you qualify. You gain this feature again at Cleric levels 4, 8, 12, and 16.' + (lv === 4 ? ' At level 4 you also learn one more Cleric cantrip.' : ''));

const features = {
  1: [
    f('spellcasting', 'Conjuração', 'Spellcasting',
      'Você conjura magias de clérigo por meio de prece e meditação; Sabedoria é seu atributo de conjuração e um Símbolo Sagrado pode ser seu foco. Truques: conhece 3 da lista de clérigo (recomendados: Orientação, Chama Sagrada e Taumaturgia), 4 no nível 4 e 5 no nível 10; ao ganhar um nível de clérigo, pode trocar um truque por outro. Espaços de magia: conforme a tabela, recuperados num Descanso Longo. Magias preparadas: comece com 4 magias de 1º círculo (recomendadas: Bênção, Curar Ferimentos, Flecha Guiada e Escudo da Fé); o número cresce com a tabela e as magias devem ser de círculos para os quais você tem espaços. Ao terminar um Descanso Longo, pode trocar qualquer magia preparada. Magias sempre preparadas por outros traços de clérigo não contam nesse limite.',
      'You cast Cleric spells through prayer and meditation; Wisdom is your spellcasting ability and a Holy Symbol can be your focus. Cantrips: you know 3 from the Cleric list (Guidance, Sacred Flame, and Thaumaturgy are recommended), 4 at level 4 and 5 at level 10; whenever you gain a Cleric level you can replace one cantrip. Spell slots: per the table, regained on a Long Rest. Prepared spells: start with 4 level 1 spells (Bless, Cure Wounds, Guiding Bolt, and Shield of Faith are recommended); the number grows per the table and spells must be of a level for which you have slots. When you finish a Long Rest you can change any prepared spell. Spells another Cleric feature always prepares don\'t count against this number.'),
    f('divineOrder', 'Ordem Divina', 'Divine Order',
      'Dedique-se a um papel sagrado à sua escolha. Protetor: proficiência com armas marciais e treino com armadura pesada. Taumaturgo: um truque de clérigo extra e bônus igual ao modificador de Sabedoria (mínimo +1) em testes de Inteligência (Arcanismo ou Religião).',
      'Dedicate yourself to one sacred role of your choice. Protector: proficiency with Martial weapons and training with Heavy armor. Thaumaturge: one extra Cleric cantrip and a bonus equal to your Wisdom modifier (minimum +1) to Intelligence (Arcana or Religion) checks.'),
  ],
  2: [
    f('channelDivinity', 'Canalizar Divindade', 'Channel Divinity',
      'Você canaliza energia divina para criar efeitos mágicos. Começa com dois efeitos, Centelha Divina e Expulsar Mortos-Vivos, e escolhe um a cada uso; sua subclasse concede outros. Usos: 2 (3 no nível 6, 4 no nível 18). Recupera 1 uso gasto num Descanso Curto e todos num Descanso Longo. A CD de salvaguarda desses efeitos é a CD de magia de clérigo.',
      'You channel divine energy to fuel magical effects. You start with two effects, Divine Spark and Turn Undead, and choose one each time you use it; your subclass adds more. Uses: 2 (3 at level 6, 4 at level 18). You regain one expended use on a Short Rest and all of them on a Long Rest. The save DC of these effects is your Cleric spell save DC.'),
    f('divineSpark', 'Centelha Divina', 'Divine Spark',
      "Canalizar Divindade, ação Mágica: aponte o Símbolo Sagrado para outra criatura que você veja a até 9 m. Role 1d8 + modificador de Sabedoria e cure esse total, ou force uma salvaguarda de Constituição: se falhar, sofre esse total em dano necrótico ou radiante (à sua escolha); se passar, metade. Dados: 2d8 no nível 7, 3d8 no 13 e 4d8 no 18.",
      'Channel Divinity, Magic action: point your Holy Symbol at another creature you can see within 30 feet. Roll 1d8 + your Wisdom modifier and either restore that many Hit Points or force a Constitution save: on a failure it takes that much Necrotic or Radiant damage (your choice), half on a success. Dice: 2d8 at level 7, 3d8 at 13, 4d8 at 18.'),
    f('turnUndead', 'Expulsar Mortos-Vivos', 'Turn Undead',
      "Como uma ação, você apresenta seu símbolo sagrado e profere uma oração repreendendo os mortos-vivos. Cada morto-vivo que possa ver ou ouvir você a até 9 metros de você deve fazer uma salvaguarda de Sabedoria. Se a criatura falhar na salvaguarda, ela é expulsa por 1 minuto ou até sofrer qualquer dano.\n\nUma criatura expulsa deve gastar seus turnos tentando se mover o mais longe possível de você, e não pode se mover voluntariamente para um espaço a até 9 metros de você. Ela também não pode realizar reações. Como sua ação, ela só pode usar a ação Disparada ou tentar escapar de um efeito que a impeça de se mover. Se não houver para onde se mover, a criatura pode usar a ação Esquiva.",
      "As an action, you present your holy symbol and speak a prayer censuring the undead. Each undead that can see or hear you within 30 feet of you must make a Wisdom saving throw. If the creature fails its saving throw, it is turned for 1 minute or until it takes any damage.\n\nA turned creature must spend its turns trying to move as far away from you as it can, and it can't willingly move to a space within 30 feet of you. It also can't take reactions. For its action, it can use only the Dash action or try to escape from an effect that prevents it from moving. If there's nowhere to move, the creature can use the Dodge action."),
  ],
  3: [
    f('clericSubclass', 'Subclasse de Clérigo', 'Cleric Subclass',
      "Você ganha uma subclasse de Clérigo à sua escolha. A subclasse Domínio da Vida é detalhada após a descrição desta classe. Uma subclasse é uma especialização que concede características a você em determinados níveis de Clérigo. Pelo restante da sua carreira, você ganha cada uma das características da sua subclasse que sejam de seu nível de Clérigo ou inferior.",
      "You gain a Cleric subclass of your choice. The Life Domain subclass is detailed after this class's description. A subclass is a specialization that grants you features at certain Cleric levels. For the rest of your career, you gain each of your subclass's features that are of your Cleric level or lower."),
  ],
  4: [asi(4)],
  5: [
    f('searUndead', 'Abrasar Mortos-Vivos', 'Sear Undead',
      "Sempre que usar Expulsar Mortos-Vivos, você pode rolar um número de d8s igual ao seu modificador de Sabedoria (mínimo de 1d8) e somar os resultados. Cada Morto-vivo que falhar em sua salvaguarda contra esse uso de Expulsar Mortos-Vivos sofre dano Radiante igual ao total rolado. Esse dano não encerra o efeito de expulsão.",
      "Whenever you use Turn Undead, you can roll a number of d8s equal to your Wisdom modifier (minimum of 1d8) and add the rolls together. Each Undead that fails its saving throw against that use of Turn Undead takes Radiant damage equal to the roll's total. This damage doesn't end the turn effect."),
  ],
  7: [
    f('blessedStrikes', 'Golpes Abençoados', 'Blessed Strikes',
      'Escolha uma opção. Golpe Divino: uma vez por turno, ao acertar com arma, +1d8 de dano necrótico ou radiante. Conjuração Potente: some o modificador de Sabedoria ao dano dos truques de clérigo. Se um Domínio de livro antigo também conceder uma dessas opções, use apenas a escolhida aqui.',
      'Choose one option. Divine Strike: once per turn when you hit with a weapon, +1d8 Necrotic or Radiant damage. Potent Spellcasting: add your Wisdom modifier to Cleric cantrip damage. If a Domain from an older book also grants either option, use only the one chosen here.'),
  ],
  8: [asi(8)],
  10: [
    f('divineIntervention', 'Intervenção Divina', 'Divine Intervention',
      'Ação Mágica: escolha qualquer magia de clérigo de 5º círculo ou menor que não exija Reação e conjure-a sem gastar espaço de magia nem componentes materiais. Uma vez por Descanso Longo. No nível 10 você também aprende um truque de clérigo a mais.',
      'Magic action: choose any Cleric spell of level 5 or lower that doesn\'t require a Reaction and cast it without expending a spell slot or needing Material components. Once per Long Rest. At level 10 you also learn one more Cleric cantrip.'),
  ],
  12: [asi(12)],
  14: [
    f('improvedBlessedStrikes', 'Golpes Abençoados Aprimorados', 'Improved Blessed Strikes',
      "A opção que você escolheu para Golpes Abençoados torna-se mais poderosa.\n\nGolpe Divino. O dano extra do seu Golpe Divino aumenta para 2d8.\n\nConjuração Potente. Quando você conjurar um truque de Clérigo e causar dano a uma criatura com ele, você pode conceder vitalidade a si mesmo ou a outra criatura a até 18 metros de você, concedendo um número de Pontos de Vida Temporários igual ao dobro do seu modificador de Sabedoria.",
      "The option you chose for Blessed Strikes grows more powerful.\n\nDivine Strike. The extra damage of your Divine Strike increases to 2d8.\n\nPotent Spellcasting. When you cast a Cleric cantrip and deal damage to a creature with it, you can give vitality to yourself or another creature within 60 feet of yourself, granting a number of Temporary Hit Points equal to twice your Wisdom modifier."),
  ],
  16: [asi(16)],
  19: [
    f('epicBoon', 'Dádiva Épica', 'Epic Boon',
      "Você ganha um talento de Dádiva Épica (veja \"Talentos\") ou outro talento à sua escolha para o qual você se qualifique. Dádiva do Destino é recomendada.",
      "You gain an Epic Boon feat (see \"Feats\") or another feat of your choice for which you qualify. Boon of Fate is recommended."),
  ],
  20: [
    f('greaterDivineIntervention', 'Intervenção Divina Maior', 'Greater Divine Intervention',
      "Você pode recorrer a uma intervenção divina ainda mais poderosa. Ao usar sua característica Intervenção Divina, você pode escolher Desejo quando selecionar uma magia.\n\nSe fizer isso, você não poderá usar a Intervenção Divina novamente até terminar 2d4 Descansos Longos.",
      "You can call on even more powerful divine intervention. When you use your Divine Intervention feature, you can choose Wish when you select a spell.\n\nIf you do so, you can't use Divine Intervention again until you finish 2d4 Long Rests."),
  ],
};

// ---------------------------------------------------------------------------
// Domínios

const CD = b('Canalizar Divindade', 'Channel Divinity');
const cd = (lang) => CD[lang];

const subclasses = {
  // --- SRD 5.2.1 -----------------------------------------------------------
  life: {
    name: b('Domínio da Vida', 'Life Domain'), source: 'SRD',
    desc: b('Energia positiva que sustenta a vida: mestres da cura.', 'The positive energy that sustains life: masters of healing.'),
    levels: domain('life', b('Domínio da Vida', 'Life Domain'),
      { 3: ['aid', 'bless', 'cureWounds', 'lesserRestoration'], 5: ['massHealingWord', 'revivify'], 7: ['auraOfLife', 'deathWard'], 9: ['greaterRestoration', 'massCureWounds'] },
      {
        3: [
          f('discipleOfLife', 'Discípulo da Vida', 'Disciple of Life',
            "Quando uma magia que você conjurar com um espaço de magia recupera Pontos de Vida de uma criatura, aquela criatura recupera Pontos de Vida adicionais no turno em que você conjurar a magia. Os Pontos de Vida adicionais são iguais a 2 mais o círculo do espaço de magia.",
            "When a spell you cast with a spell slot restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The additional Hit Points equal 2 plus the spell slot's level."),
          f('preserveLife', 'Preservar a Vida', 'Preserve Life',
            "Como uma ação Mágica, você apresenta seu Símbolo Sagrado e gasta um uso de Canalizar Divindade para evocar energia de cura capaz de recuperar um número de Pontos de Vida igual a cinco vezes o seu nível de Clérigo. Escolha criaturas Feridas a até 9 metros de você (o que pode incluir você) e divida esses Pontos de Vida entre elas. Esta característica não pode recuperar uma criatura para mais da metade do seu máximo de Pontos de Vida.",
            "As a Magic action, you present your Holy Symbol and expend a use of your Channel Divinity to evoke healing energy that can restore a number of Hit Points equal to five times your Cleric level. Choose Bloodied creatures within 30 feet of yourself (which can include you), and divide those Hit Points among them. This feature can restore a creature to no more than half its Hit Point maximum."),
        ],
        6: [f('blessedHealer', 'Curandeiro Abençoado', 'Blessed Healer',
          "As magias de cura que você conjura nos outros curam você também. Imediatamente após conjurar uma magia com um espaço de magia que recupere Pontos de Vida de uma ou mais criaturas que não sejam você, você recupera Pontos de Vida iguais a 2 mais o círculo do espaço de magia.",
          "The healing spells you cast on others heal you as well. Immediately after you cast a spell with a spell slot that restores Hit Points to one or more creatures other than yourself, you regain Hit Points equal to 2 plus the spell slot's level.")],
        17: [f('supremeHealing', 'Cura Suprema', 'Supreme Healing',
          "Quando você normalmente rolaria um ou mais dados para recuperar Pontos de Vida de uma criatura com uma magia ou Canalizar Divindade, não role esses dados para a cura; em vez disso, use o maior número possível para cada dado. Por exemplo, em vez de recuperar 2d6 Pontos de Vida de uma criatura com uma magia, você recupera 12.",
          "When you would normally roll one or more dice to restore Hit Points to a creature with a spell or Channel Divinity, don't roll those dice for the healing; instead use the highest number possible for each die. For example, instead of restoring 2d6 Hit Points to a creature with a spell, you restore 12.")],
      }),
  },

  // --- PHB 2024 (reeditados) -----------------------------------------------
  light: {
    name: b('Domínio da Luz', 'Light Domain'), source: 'PHB24',
    desc: b('Fogo e luz sagrados que revelam e queimam as trevas.', 'Holy fire and light that reveal and burn away darkness.'),
    levels: domain('light', b('Domínio da Luz', 'Light Domain'),
      { 3: ['burningHands', 'faerieFire', 'scorchingRay', 'seeInvisibility'], 5: ['daylight', 'fireball'], 7: ['arcaneEye', 'wallOfFire'], 9: ['flameStrike', 'scrying'] },
      {
        3: [
          f('radianceOfTheDawn', 'Radiância da Alvorada', 'Radiance of the Dawn',
            "Como uma ação Mágica, você apresenta seu Símbolo Sagrado e gasta um uso de Canalizar Divindade para emitir um lampejo de luz em uma Emanação de 9 metros originada em você. Qualquer Escuridão mágica — como aquela criada pela magia Escuridão — nessa área é dissipada. Além disso, cada criatura à sua escolha nessa área deve fazer uma salvaguarda de Constituição, sofrendo dano Radiante igual a 2d10 mais o seu nível de Clérigo se falhar na salvaguarda ou metade desse dano em caso de sucesso.",
            "As a Magic action, you present your Holy Symbol and expend a use of your Channel Divinity to emit a flash of light in a 30-foot Emanation originating from yourself. Any magical Darkness-such as that created by the Darkness spell-in that area is dispelled. Additionally, each creature of your choice in that area must make a Constitution saving throw, taking Radiant damage equal to 2d10 plus your Cleric level on a failed save or half as much damage on a successful one."),
          f('wardingFlare', 'Clarão Protetor', 'Warding Flare',
            "Reação: quando uma criatura que você vê a até 9 m faz uma jogada de ataque, imponha Desvantagem a ela com um clarão de luz. Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo.",
            'Reaction: when a creature you can see within 30 feet makes an attack roll, flash light to impose Disadvantage on it. Uses: your Wisdom modifier (minimum 1) per Long Rest.'),
        ],
        6: [f('improvedWardingFlare', 'Clarão Protetor Aprimorado', 'Improved Warding Flare',
          "Você recupera todos os usos gastos do seu Lampejo Protetor quando termina um Descanso Curto ou Longo.\n\nAlém disso, sempre que usar o Lampejo Protetor, você pode conceder ao alvo do ataque desencadeador uma quantidade de Pontos de Vida Temporários igual a 2d6 mais o seu modificador de Sabedoria.",
          "·r'ou regain all expended uses of your Warding Flare , ,hen you fini sh a Short or Long Rest.\n\nIn addition, whenever you use Warding Flare, you can give the target of the triggering attack a number of Temporary Hit Points equal to 2d6 plus your Wisdom modifier.")],
        17: [f('coronaOfLight', 'Coroa de Luz', 'Corona of Light',
          'Ação Mágica: por 1 minuto você emite luz solar (luz plena em 18 m e penumbra por mais 9 m). Inimigos nessa luz têm Desvantagem nas salvaguardas contra Radiância da Alvorada e magias que causem dano de fogo ou radiante. Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo.',
          'Magic action: for 1 minute you shed sunlight (bright light in 60 feet, dim light 30 feet beyond). Enemies in that light have Disadvantage on saves against Radiance of the Dawn and spells that deal Fire or Radiant damage. Uses: your Wisdom modifier (minimum 1) per Long Rest.')],
      }),
  },

  trickery: {
    name: b('Domínio do Embuste', 'Trickery Domain'), source: 'PHB24',
    desc: b('Ilusões, travessuras e subversão a serviço dos deuses trapaceiros.', 'Illusion, mischief, and subversion in service of trickster gods.'),
    levels: domain('trickery', b('Domínio do Embuste', 'Trickery Domain'),
      { 3: ['charmPerson', 'disguiseSelf', 'invisibility', 'passWithoutTrace'], 5: ['hypnoticPattern', 'nondetection'], 7: ['confusion', 'dimensionDoor'], 9: ['dominatePerson', 'modifyMemory'] },
      {
        3: [
          f('blessingOfTheTrickster', 'Bênção do Trapaceiro', 'Blessing of the Trickster',
            "Como uma ação Mágica, você pode escolher a si mesmo ou a uma criatura voluntária a até 9 metros de você para ter Vantagem em testes de Destreza (Furtividade). Esta bênção dura até você terminar um Descanso Longo ou usar esta característica novamente.",
            "As a Magic action, you can choose yourself or a willing creature within 30 feet of yourself to have Advantage on Dexterity {Stealth) checks. This blessing lasts until you finish a Long Rest or you use this feature again."),
          f('invokeDuplicity', 'Invocar Duplicidade', 'Invoke Duplicity',
            `${cd('pt')}, ação Bônus: cria uma ilusão perfeita de você num espaço a até 9 m por 1 minuto (sem Concentração). Você pode conjurar magias como se estivesse no espaço dela, tem Vantagem em ataques contra criaturas a até 1,5 m de vocês dois, e pode movê-la 9 m com uma ação Bônus (até 36 m de você).`,
            `${cd('en')}, Bonus Action: create a perfect illusion of yourself in a space within 30 feet for 1 minute (no Concentration). You can cast spells as though you were in its space, have Advantage on attacks against creatures within 5 feet of both of you, and can move it 30 feet as a Bonus Action (staying within 120 feet of you).`),
        ],
        6: [f('trickstersTransposition', 'Transposição do Trapaceiro', 'Trickster\'s Transposition',
          "Sempre que você realizar a Ação Bônus para criar ou mover a ilusão da sua Duplicidade Invocada, você pode se teletransportar, trocando de lugar com a ilusão.",
          "Whenever you take the Bonus Action to create or move the illusion of your Invoke Duplicity, you can teleport, swapping places with the illusion.")],
        17: [f('improvedDuplicity', 'Duplicidade Aprimorada', 'Improved Duplicity',
          "A ilusão da sua Duplicidade Invocada tornou-se mais poderosa das seguintes maneiras.\n\nDistração Compartilhada. Quando você e seus aliados fizerem jogadas de ataque contra uma criatura\n\na até 1,5 metro da ilusão, as jogadas de ataque têm Vantagem.\n\nIlusão Curativa. Quando a ilusão termina, você ou uma criatura à sua escolha a até 1,5 metro dela recupera um número de Pontos de Vida igual ao seu nível de Clérigo.\n\nDOMÍNIO DA GUERRA\n\nInspirar Valor e Castigar Inimigos\n\nA guerra tem muitas manifestações. Ela pode transformar pessoas comuns em heróis. Pode ser desesperadora e horrível, com atos de crueldade e covardia eclipsando exemplos de excelência e coragem. Clérigos que aproveitam a magia do Domínio da Guerra se destacam em batalha, inspirando outros a lutar o bom combate ou oferecendo atos de violência como preces.\n\nDeuses do Domínio da Guerra vigiam os guerreiros e os recompensam por seus grandes feitos. Eles incluem campeões de honra e cavalheirismo, bem como deuses de destruição e pilhagem. Outros deuses da guerra adotam uma postura mais neutra, promovendo a guerra em todas as suas manifestações e apoiando guerreiros em qualquer circunstância.",
          "The illusion of your Invoke Duplicity has grown more powerful in the following ways.\n\nShared Distraction. When you and your allies make attack rolls against a creature\n\nwithin 5 feet of the illusion, the attack rolls have Advantage.\n\nHealing Illusion. When the illusion ends, you or a creature of your choice within 5 feet of it regains a number of Hit Points equal to your Cleric level.\n\nWAR DOMAIN\n\nInspire Valor and Smite Foes\n\nWar has many manifestations. It can make heroes of ordinary people. It can be desperate and horrific, with acts of cruelty and cowardice eclipsing instances of excellence and courage. Clerics\n\n\\•; ho ta p into t h~ m agic of th e War Domain excel in ba tt le, inspir ing others to fight the good fight or offel' ing ac ts of vio len ce as prayers.\n\nGods of the War Domain watch over warriors and reward them for their great deeds. They include champions of honor and chivalry as well as gods of destruction and pillage. Other war gods take a more neutra l st a nce, promoting wa r in all its manifestations and supporting warriors in any circumstance.")],
      }),
  },

  war: {
    name: b('Domínio da Guerra', 'War Domain'), source: 'PHB24',
    desc: b('Sacerdotes guerreiros que inspiram valor e punem os inimigos.', 'Warrior priests who inspire valor and smite foes.'),
    levels: domain('war', b('Domínio da Guerra', 'War Domain'),
      { 3: ['guidingBolt', 'magicWeapon', 'shieldOfFaith', 'spiritualWeapon'], 5: ['crusadersMantle', 'spiritGuardians'], 7: ['fireShield', 'freedomOfMovement'], 9: ['holdMonster', 'steelWindStrike'] },
      {
        3: [
          f('guidedStrike', 'Golpe Guiado', 'Guided Strike',
            "A partir do 2º nível, você pode usar seu Canalizar Divindade para desferir ataques com precisão sobrenatural. Quando fizer uma jogada de ataque, você pode usar seu Canalizar Divindade para ganhar um bônus de +10 na jogada. Você faz essa escolha depois de ver o resultado da rolagem, mas antes de o Mestre dizer se o ataque acertou ou errou.",
            "Starting at 2nd level, you can use your Channel Divinity to strike with supernatural accuracy. When you make an attack roll, you can use your Channel Divinity to gain a +10 bonus to the roll. You make this choice after you see the roll, but before the DM says whether the attack hits or misses."),
          f('warPriest', 'Sacerdote da Guerra', 'War Priest',
            "Como uma Ação Bônus, você pode realizar um ataque com uma arma ou um Golpe Desarmado. Você pode usar esta Ação Bônus um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez). Você recupera todos os usos gastos quando termina um Descanso Curto ou Longo.",
            "As a Bonus Action, you can make one attack with a weapon or an Unarmed Strike. You can use this Bonus Action a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a Short or Long Rest."),
        ],
        6: [f('warGodsBlessing', 'Bênção do Deus da Guerra', 'War God\'s Blessing',
          "No 6º nível, quando uma criatura a até 9 metros de você fizer uma jogada de ataque, você pode usar sua reação para conceder àquela criatura um bônus de +10 na jogada, usando seu Canalizar Divindade. Você faz essa escolha depois de ver o resultado da rolagem, mas antes de o Mestre dizer se o ataque acertou ou errou.",
          "At 6th level, when a creature within 30 feet of you makes an attack roll, you can use your reaction to grant that creature a +10 bonus to the roll, using your Channel Divinity. You make this choice after you see the roll, but before the DM says whether the attack hits or misses.")],
        17: [f('avatarOfBattle', 'Avatar da Batalha', 'Avatar of Battle',
          "Você recebe Resistência a dano Contundente, Perfurante e Cortante.",
          "You gain Resistance to Bludgeoning, Piercing, and Slashing damage.")],
      }),
  },

  // --- Livros de 2014, ajustados --------------------------------------------
  knowledge: {
    name: b('Domínio do Conhecimento', 'Knowledge Domain'), source: 'PHB',
    desc: b('Saber, segredos e compreensão (versão de 2014 ajustada).', 'Learning, secrets, and understanding (adjusted 2014 version).'),
    levels: domain('knowledge', b('Domínio do Conhecimento', 'Knowledge Domain'),
      { 3: ['command', 'identify', 'augury', 'suggestion'], 5: ['nondetection', 'speakWithDead'], 7: ['arcaneEye', 'confusion'], 9: ['legendLore', 'scrying'] },
      {
        3: [
          f('blessingsOfKnowledge', 'Bênçãos do Conhecimento', 'Blessings of Knowledge',
            "No 1º nível, você aprende dois idiomas à sua escolha. Você também se torna proficiente em duas das seguintes perícias à sua escolha: Arcanismo, História, Natureza ou Religião.\n\nSeu bônus de proficiência é dobrado para qualquer teste de atributo que você fizer usando qualquer uma dessas perícias.",
            "At 1st level, you learn two languages of your choice. You also become proficient in your choice of two of the following skills: Arcana, History, Nature, or Religion.\n\nYour proficiency bonus is doubled for any ability check you make that uses either of those skills."),
          f('knowledgeOfTheAges', 'Conhecimento das Eras', 'Knowledge of the Ages',
            "A partir do 2º nível, você pode usar seu Canalizar Divindade para acessar uma fonte divina de conhecimento. Como uma ação, você escolhe uma perícia ou ferramenta. Por 10 minutos, você tem proficiência com a perícia ou ferramenta escolhida.",
            "Starting at 2nd level, you can use your Channel Divinity to tap into a divine well of knowledge. As an action, you choose one skill or tool. For 10 minutes, you have proficiency with the chosen skill or tool."),
        ],
        6: [f('readThoughts', 'Ler Pensamentos', 'Read Thoughts',
          "No 6º nível, você pode usar seu Canalizar Divindade para ler os pensamentos de uma criatura. Você pode então usar seu acesso à mente da criatura para comandá-la.\n\nComo uma ação, escolha uma criatura que você possa ver a até 18 metros de você. Aquela criatura deve fazer uma salvaguarda de Sabedoria. Se a criatura for bem-sucedida na salvaguarda, você não pode usar esta característica nela novamente até terminar um descanso longo.\n\nSe a criatura falhar na salvaguarda, você pode ler seus pensamentos superficiais (aqueles em primeiro plano em sua mente, refletindo suas emoções atuais e sobre o que ela está pensando ativamente) quando ela estiver a até 18 metros de você. Este efeito dura por 1 minuto.\n\nDurante esse período, você pode usar sua ação para encerrar este efeito e conjurar a magia sugestão na criatura sem gastar um espaço de magia. O alvo falha automaticamente na salvaguarda contra a magia.",
          "At 6th level, you can use your Channel Divinity to read a creature’s thoughts. You can then use your access to the creature’s mind to command it.\n\nAs an action, choose one creature that you can see within 60 feet of you. That creature must make a Wisdom saving throw. If the creature succeeds on the saving throw, you can’t use this feature on it again until you finish a long rest.\n\nIf the creature fails its save, you can read its surface thoughts (those foremost in its mind, reflecting its current emotions and what it is actively thinking about) when it is within 60 feet of you. This effect lasts for 1 minute.\n\nDuring that time, you can use your action to end this effect and cast the suggestion spell on the creature without expending a spell slot. The target automatically fails its saving throw against the spell.")],
        17: [f('visionsOfThePast', 'Visões do Passado', 'Visions of the Past',
          "A partir do 17º nível, você pode evocar visões do passado que se relacionem a um objeto que você segura ou aos seus arredores imediatos. Você passa pelo menos 1 minuto em meditação e oração, recebendo então vislumbres oníricos e sombrios de eventos recentes. Você pode meditar dessa forma por um número de minutos igual ao seu valor de Sabedoria e deve manter concentração durante esse tempo, como se estivesse conjurando uma magia.\n\nUma vez que usar esta característica, você não pode usá-la novamente até terminar um descanso curto ou longo.\n\nLeitura de Objeto. Segurando um objeto enquanto medita, você pode ter visões do proprietário anterior do objeto. Após meditar por 1 minuto, você descobre como o proprietário adquiriu e perdeu o objeto, bem como o evento significativo mais recente envolvendo o objeto e aquele proprietário. Se o objeto pertenceu a outra criatura no passado recente (dentro de um número de dias igual ao seu valor de Sabedoria), você pode gastar 1 minuto adicional para cada proprietário para descobrir as mesmas informações sobre aquela criatura.\nprende como o proprietário adquiriu e perdeu o objeto, bem como o evento significativo mais recente envolvendo o objeto e aquele proprietário. Se o objeto pertenceu a outra criatura no passado recente (dentro de um número de dias igual ao seu valor de Sabedoria), você pode gastar 1 minuto adicional para cada proprietário para descobrir as mesmas informações sobre aquela criatura.\n\nLeitura de Área. Enquanto medita, você vê visões de eventos recentes em suas imediações (uma sala, rua, túnel, clareira ou similar, de até um cubo de 15 metros), recuando um número de dias igual ao seu valor de Sabedoria. Para cada minuto que você meditar, você aprende sobre um evento significativo, começando pelo mais recente. Eventos significativos normalmente envolvem emoções intensas, como batalhas e traições, casamentos e assassinatos, nascimentos e funerais. No entanto, eles também podem incluir eventos mais mundanos que, ainda assim, sejam importantes na sua situação atual.",
          "Starting at 17th level, you can call up visions of the past that relate to an object you hold or your immediate surroundings. You spend at least 1 minute in meditation and prayer, then receive dreamlike, shadowy glimpses of recent events. You can meditate in this way for a number of minutes equal to your Wisdom score and must maintain concentration during that time, as if you were casting a spell.\n\nOnce you use this feature, you can’t use it again until you finish a short or long rest.\n\nObject Reading. Holding an object as you meditate, you can see visions of the object’s previous owner. After meditating for 1 minute, you learn how the owner acquired and lost the object, as well as the most recent significant event involving the object and that owner. If the object was owned by another creature in the recent past (within a number of days equal to your Wisdom score), you can spend 1 additional minute for each owner to learn the same information about that creature.\n\nArea Reading. As you meditate, you see visions of recent events in your immediate vicinity (a room, street, tunnel, clearing, or the like, up to a 50-foot cube), going back a number of days equal to your Wisdom score. For each minute you meditate, you learn about one significant event, beginning with the most recent. Significant events typically involve powerful emotions, such as battles and betrayals, marriages and murders, births and funerals. However, they might also include more mundane events that are nevertheless important in your current situation.")],
      }),
  },

  nature: {
    name: b('Domínio da Natureza', 'Nature Domain'), source: 'PHB',
    desc: b('Guardiões das feras, das plantas e dos elementos (versão de 2014 ajustada).', 'Keepers of beasts, plants, and the elements (adjusted 2014 version).'),
    levels: domain('nature', b('Domínio da Natureza', 'Nature Domain'),
      { 3: ['animalFriendship', 'speakWithAnimals', 'barkskin', 'spikeGrowth'], 5: ['plantGrowth', 'windWall'], 7: ['dominateBeast', 'graspingVine'], 9: ['insectPlague', 'treeStride'] },
      {
        3: [
          f('acolyteOfNature', 'Acólito da Natureza', 'Acolyte of Nature',
            "No 1º nível, você aprende um truque de druida à sua escolha. Esse truque conta como um truque de clérigo para você, mas não conta no número de truques de clérigo que você conhece. Você também ganha proficiência em uma das seguintes perícias à sua escolha: Adestrar Animais, Natureza ou Sobrevivência.",
            "At 1st level, you learn one druid cantrip of your choice. This cantrip counts as a cleric cantrip for you, but it doesn’t count against the number of cleric cantrips you know. You also gain proficiency in one of the following skills of your choice: Animal Handling, Nature, or Survival."),
          f('natureBonusProficiency', 'Proficiência Bônus', 'Bonus Proficiency',
            "Quando você escolhe este domínio no 1º nível, você ganha proficiência com armaduras pesadas.", "When you choose this domain at 1st level, you gain proficiency with heavy armor."),
          f('charmAnimalsAndPlants', 'Encantar Animais e Plantas', 'Charm Animals and Plants',
            "A partir do 2º nível, você pode usar seu Canalizar Divindade para enfeitiçar animais e plantas.\n\nCom uma ação, você ergue seu símbolo sagrado e invoca o nome de sua divindade. Cada fera ou criatura vegetal a até 9 metros de você que puder vê-lo deve realizar uma salvaguarda de Sabedoria. Se a criatura falhar na salvaguarda, ela estará enfeitiçada por você por 1 minuto ou até sofrer dano. Enquanto estiver enfeitiçada por você, ela é amistosa com você e com as outras criaturas que você designar.",
            "Starting at 2nd level, you can use your Channel Divinity to charm animals and plants.\n\nAs an action, you present your holy symbol and invoke the name of your deity. Each beast or plant creature that can see you within 30 feet of you must make a Wisdom saving throw. If the creature fails its saving throw, it is charmed by you for 1 minute or until it takes damage. While it is charmed by you, it is friendly to you and other creatures you designate."),
        ],
        6: [f('dampenElements', 'Atenuar Elementos', 'Dampen Elements',
          "A partir do 6º nível, quando você ou uma criatura a até 9 metros de você sofrer dano de ácido, frio, fogo, elétrico ou trovejante, você pode usar sua reação para conceder resistência à criatura contra essa instância de dano.",
          "Starting at 6th level, when you or a creature within 30 feet of you takes acid, cold, fire, lightning, or thunder damage, you can use your reaction to grant resistance to the creature against that instance of the damage.")],
        17: [f('masterOfNature', 'Mestre da Natureza', 'Master of Nature',
          "No 17º nível, você adquire a habilidade de comandar animais e criaturas vegetais. Enquanto criaturas estiverem enfeitiçadas pela sua característica Enfeitiçar Animais e Plantas, você pode usar uma ação bônus no seu turno para comandar verbalmente o que cada uma dessas criaturas fará no próximo turno dela.",
          "At 17th level, you gain the ability to command animals and plant creatures. While creatures are charmed by your Charm Animals and Plants feature, you can take a bonus action on your turn to verbally command what each of those creatures will do on its next turn.")],
      }),
  },

  tempest: {
    name: b('Domínio da Tempestade', 'Tempest Domain'), source: 'PHB',
    desc: b('Trovões, raios e a fúria do mar (versão de 2014 ajustada).', 'Thunder, lightning, and the fury of the sea (adjusted 2014 version).'),
    levels: domain('tempest', b('Domínio da Tempestade', 'Tempest Domain'),
      { 3: ['fogCloud', 'thunderwave', 'gustOfWind', 'shatter'], 5: ['callLightning', 'sleetStorm'], 7: ['controlWater', 'iceStorm'], 9: ['destructiveWave', 'insectPlague'] },
      {
        3: [
          f('tempestBonusProficiencies', 'Proficiências Bônus', 'Bonus Proficiencies',
            "No 1º nível, você ganha proficiência com armas marciais e armaduras pesadas.", "At 1st level, you gain proficiency with martial weapons and heavy armor."),
          f('wrathOfTheStorm', 'Ira da Tempestade', 'Wrath of the Storm',
            "Também no 1º nível, você pode repreender atacantes de forma trovejante. Quando uma criatura a até 1,5 metro de você que você possa ver atingir você com um ataque, você pode usar sua reação para forçar a criatura a fazer uma salvaguarda de Destreza. A criatura sofre 2d8 de dano elétrico ou trovejante (sua escolha) se falhar na salvaguarda, ou metade desse dano em caso de sucesso.\n\nVocê pode usar essa característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez). Você recupera todos os usos gastos ao terminar um descanso longo.",
            "Also at 1st level, you can thunderously rebuke attackers. When a creature within 5 feet of you that you can see hits you with an attack, you can use your reaction to cause the creature to make a Dexterity saving throw. The creature takes 2d8 lightning or thunder damage (your choice) on a failed saving throw, and half as much damage on a successful one.\n\nYou can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest."),
          f('destructiveWrath', 'Ira Destrutiva', 'Destructive Wrath',
            "A partir do 2º nível, você pode usar seu Canalizar Divindade para brandir o poder da tempestade com ferocidade desenfreada.\n\nQuando você rolar dano elétrico ou trovejante, você pode usar seu Canalizar Divindade para causar o dano máximo, em vez de rolar os dados.",
            "Starting at 2nd level, you can use your Channel Divinity to wield the power of the storm with unchecked ferocity.\n\nWhen you roll lightning or thunder damage, you can use your Channel Divinity to deal maximum damage, instead of rolling."),
        ],
        6: [f('thunderboltStrike', 'Golpe Trovejante', 'Thunderbolt Strike',
          "No 6º nível, quando você causar dano elétrico a uma criatura Grande ou menor, você também pode empurrá-la até 3 metros para longe de você.",
          "At 6th level, when you deal lightning damage to a Large or smaller creature, you can also push it up to 10 feet away from you.")],
        17: [f('stormborn', 'Nascido da Tempestade', 'Stormborn',
          "No 17º nível, você tem um deslocamento de voo igual ao seu deslocamento de caminhada atual sempre que não estiver no subsolo ou em ambientes fechados.",
          "At 17th level, you have a flying speed equal to your current walking speed whenever you are not underground or indoors.")],
      }),
  },

  death: {
    name: b('Domínio da Morte', 'Death Domain'), source: 'DMG',
    desc: b('Forças que causam a morte e a não-vida; opção de vilão, sujeita ao mestre (versão de 2014 ajustada).', 'Forces of death and undeath; a villain option subject to DM approval (adjusted 2014 version).'),
    levels: domain('death', b('Domínio da Morte', 'Death Domain'),
      { 3: ['falseLife', 'rayOfSickness', 'blindnessDeafness', 'rayOfEnfeeblement'], 5: ['animateDead', 'vampiricTouch'], 7: ['blight', 'deathWard'], 9: ['antilifeShell', 'cloudkill'] },
      {
        3: [
          f('deathBonusProficiency', 'Proficiência Bônus', 'Bonus Proficiency',
            "Quando você escolhe este domínio no 1º nível, você ganha proficiência com armaduras pesadas.", "When you choose this domain at 1st level, you gain proficiency with heavy armor."),
          f('reaper', 'Ceifador', 'Reaper',
            "No 1º nível, o clérigo aprende um truque de necromancia à sua escolha de qualquer lista de magias. Quando o clérigo conjura um truque de necromancia que normalmente tem como alvo apenas uma criatura, a magia pode, em vez disso, ter como alvo duas criaturas dentro do alcance e a até 1,5 metro uma da outra.",
            "At 1st level, the cleric learns one necromancy cantrip of his or her choice from any spell list. When the cleric casts a necromancy cantrip that normally targets only one creature, the spell can instead target two creatures within range and within 5 feet of each other."),
          f('touchOfDeath', 'Toque da Morte', 'Touch of Death',
            "A partir do 2º nível, o clérigo pode usar o Canalizar Divindade para destruir a força vital de outra criatura através do toque. Quando o clérigo atinge uma criatura com um ataque corpo a corpo, ele pode usar o Canalizar Divindade para causar dano necrótico extra ao alvo. O dano é igual a 5 + o dobro do seu nível de clérigo.",
            "Starting at 2nd level, the cleric can use Channel Divinity to destroy another creature's life force by touch. When the cleric hits a creature with a melee attack, the cleric can use Channel Divinity to deal extra necrotic damage to the target. The damage equals 5 + twice his or her cleric level."),
        ],
        6: [f('inescapableDestruction', 'Destruição Inescapável', 'Inescapable Destruction',
          "A partir do 6º nível, a habilidade do clérigo de canalizar energia negativa torna-se mais potente. O dano necrótico causado pelas magias de clérigo do personagem e pelas opções de Canalizar Divindade ignora resistência a dano necrótico.",
          "Starting at 6th level, the cleric's ability to channel negative energy becomes more potent. Necrotic damage dealt by the character's cleric spells and Channel Divinity options ignores resistance to necrotic damage.")],
        17: [f('improvedReaper', 'Ceifador Aprimorado', 'Improved Reaper',
          "A partir do 17º nível, quando o clérigo conjurar uma magia de necromancia de 1º a 5º círculo que tenha como alvo apenas uma criatura, a magia pode, em vez disso, ter como alvo duas criaturas dentro do alcance e a até 1,5 metro uma da outra. Se a magia consumir seus componentes materiais, o clérigo deve fornecê-los para cada alvo.",
          "Starting at 17th level, when the cleric casts a necromancy spell of 1st through 5th level that targets only one creature, the spell can instead target two creatures within range and within 5 feet of each other. If the spell consumes its material components, the cleric must provide them for each target.")],
      }),
  },

  arcana: {
    name: b('Domínio Arcano', 'Arcana Domain'), source: 'SCAG',
    desc: b('A magia arcana vista como dádiva divina (versão de 2014 ajustada).', 'Arcane magic as a divine gift (adjusted 2014 version).'),
    levels: domain('arcana', b('Domínio Arcano', 'Arcana Domain'),
      { 3: ['detectMagic', 'magicMissile', 'magicWeapon', 'arcanistsMagicAura'], 5: ['dispelMagic', 'magicCircle'], 7: ['arcaneEye', 'secretChest'], 9: ['planarBinding', 'teleportationCircle'] },
      {
        3: [
          f('arcaneInitiate', 'Iniciado Arcano', 'Arcane Initiate',
            "Quando você escolhe este domínio no 1º nível, você ganha proficiência na perícia Arcanismo e aprende dois truques de sua escolha da lista de magias de mago. Para você, esses truques contam como truques de clérigo.",
            "When you choose this domain at 1st level, you gain proficiency in the Arcana skill, and you gain two cantrips of your choice from the wizard spell list. For you, these cantrips count as cleric cantrips."),
          f('arcaneAbjuration', 'Abjuração Arcana', 'Arcane Abjuration',
            "A partir do 2º nível, você pode usar seu Canalizar Divindade para abjurar criaturas de outros mundos.\n\nCom uma ação, você apresenta seu símbolo sagrado, e um celestial, elemental, fada ou corruptor à sua escolha a até 9 metros de você deve fazer uma salvaguarda de Sabedoria, desde que a criatura possa vê-lo ou ouvi-lo. Se a criatura falhar na salvaguarda, ela é expulsa por 1 minuto ou até sofrer qualquer dano.\n\nUma criatura expulsa deve usar seus turnos tentando se mover o mais longe possível de você, e não pode terminar voluntariamente seu movimento em um espaço a até 9 metros de você. Ela também não pode realizar reações. Como ação, ela pode usar apenas a ação de Disparada ou tentar escapar de um efeito que a impeça de se mover. Se não houver para onde se mover, a criatura pode usar a ação de Desviar.\ne deve usar seus turnos tentando se mover o mais longe possível de você, e não pode terminar voluntariamente seu movimento em um espaço a até 9 metros de você. Ela também não pode realizar reações. Como ação, ela pode usar apenas a ação de Disparada ou tentar escapar de um efeito que a impeça de se mover. Se não houver para onde se mover, a criatura pode usar a ação de Desviar.\n\nDepois que você alcançar o 5º nível, quando uma criatura falhar na salvaguarda contra a sua característica Abjuração Arcana, a criatura é banida por 1 minuto (como na magia banimento, sem exigir concentração) se ela não estiver em seu plano de origem e seu nível de desafio for igual ou inferior a um determinado limiar, conforme mostrado na tabela Banimento Arcano.\n\nBANIMENTO ARCANO\n\nNível de Clérigo | Bane Criaturas de ND ...\n\n5º | 1/2 ou menor\n\n8º | 1 ou menor\n\n11º | 2 ou menor\n\n14º | 3 ou menor\n\n17º | 4 ou menor",
            "Starting at 2nd level, you can use your Channel Divinity to abjure otherworldly creatures.\n\nAs an action, you present your holy symbol, and one celestial, elemental, fey, or fiend of your choice that is within 30 feet of you must make a Wisdom saving throw, provided that the creature can see or hear you. If the creature fails its saving throw, it is turned for 1 minute or until it takes any damage.\n\nA turned creature must spend its turns trying to move as far away from you as it can, and it can't willingly end its move in a space within 30 feet of you. It also can't take reactions. For its action, it can only use the Dash action or try to escape from an effect that prevents it from moving. If there's nowhere to move, the creature can use the Dodge action.\ne must spend its turns trying to move as far away from you as it can, and it can't willingly end its move in a space within 30 feet of you. It also can't take reactions. For its action, it can only use the Dash action or try to escape from an effect that prevents it from moving. If there's nowhere to move, the creature can use the Dodge action.\n\nAfter you reach 5th level, when a creature fails its saving throw against your Arcane Abjuration feature, the creature is banished for 1 minute (as in the banishment spell, no concentration required) if it isn't on its plane of origin and its challenge rating is at or below a certain threshold, as shown on the Arcane Banishment table.\n\nARCANE BANISHMENT\n\nCleric Level | Banishes Creatures of CR ...\n\n5th | 1/2 or lower\n\n8th | 1 or lower\n\n11th | 2 or lower\n\n14th | 3 or lower\n\n17th | 4 or lower"),
        ],
        6: [f('spellBreaker', 'Quebra-Magia', 'Spell Breaker',
          "A partir do 6º nível, quando você recupera pontos de vida de um aliado com uma magia de 1º círculo ou superior, você também pode encerrar uma magia à sua escolha naquela criatura. O círculo da magia encerrada deve ser igual ou inferior ao círculo do espaço de magia que você usou para conjurar a magia de cura.",
          "Starting at 6th level, when you restore hit points to an ally with a spell of 1st level or higher, you can also end one spell of your choice on that creature. The level of the spell you end must be equal to or lower than the level of the spell slot you use to cast the healing spell.")],
        17: [f('arcaneMastery', 'Maestria Arcana', 'Arcane Mastery',
          "No 17º nível, você escolhe quatro magias da lista de magias de mago, uma de cada um dos seguintes círculos: 6º, 7º, 8º e 9º. Você as adiciona à sua lista de magias de domínio. Assim como suas outras magias de domínio, elas estão sempre preparadas e contam como magias de clérigo para você.",
          "At 17th level, you choose four spells from the wizard spell list, one from each of the following levels: 6th, 7th, 8th, and 9th. You add them to your list of domain spells. Like your other domain spells, they are always prepared and count as cleric spells for you.")],
      }),
  },

  forge: {
    name: b('Domínio da Forja', 'Forge Domain'), source: 'XGE',
    desc: b('Artesãos sagrados do metal e do fogo (versão de 2014 ajustada).', 'Holy artisans of metal and fire (adjusted 2014 version).'),
    levels: domain('forge', b('Domínio da Forja', 'Forge Domain'),
      { 3: ['identify', 'searingSmite', 'heatMetal', 'magicWeapon'], 5: ['elementalWeapon', 'protectionFromEnergy'], 7: ['fabricate', 'wallOfFire'], 9: ['animateObjects', 'creation'] },
      {
        3: [
          f('forgeBonusProficiencies', 'Proficiências Bônus', 'Bonus Proficiencies',
            "Quando você escolhe este domínio no 1º nível, você ganha proficiência com armaduras pesadas e ferramentas de ferreiro.", "When you choose this domain at 1st level, you gain proficiency with heavy armor and smith’s tools."),
          f('blessingOfTheForge', 'Bênção da Forja', 'Blessing of the Forge',
            "No 1º nível, você ganha a habilidade de imbuir magia em uma arma ou armadura. Ao final de um descanso longo, você pode tocar um objeto não mágico que seja um traje de armadura ou uma arma simples ou marcial. Até o final do seu próximo descanso longo ou até você morrer, o objeto se torna um item mágico, concedendo um bônus de +1 na CA se for uma armadura ou um bônus de +1 nas jogadas de ataque e dano se for uma arma.\n\nDepois de usar essa característica, você não pode usá-la novamente até terminar um descanso longo.",
            "At 1st level, you gain the ability to imbue magic into a weapon or armor. At the end of a long rest, you can touch one nonmagical object that is a suit of armor or a simple or martial weapon. Until the end of your next long rest or until you die, the object becomes a magic item, granting a +1 bonus to AC if it’s armor or a +1 bonus to attack and damage rolls if it’s a weapon.\n\nOnce you use this feature, you can’t use it again until you finish a long rest."),
          f('artisansBlessing', 'Bênção do Artesão', 'Artisan\'s Blessing',
            "A partir do 2º nível, você pode usar seu Canalizar Divindade para criar itens simples.\n\nVocê realiza um ritual de uma hora que cria um item não mágico que deve incluir algum metal: uma arma simples ou marcial, um traje de armadura, dez munições, um conjunto de ferramentas ou outro objeto de metal (consulte o capítulo 5, “Equipamento”, no Livro do Jogador para obter exemplos desses itens). A criação é concluída ao final de uma hora, coalescendo em um espaço desocupado à sua escolha em uma superfície a até 1,5 metro de você.\n\nO que você cria pode ser algo que não valha mais de 100 po. Como parte desse ritual, você deve dispor de metal, o que pode incluir moedas, com valor igual ao da criação. O metal coalescerá irrevogavelmente e se transformará na criação ao final do ritual, formando magicamente até mesmo as partes não metálicas da criação.\n\nO ritual pode criar uma cópia de um item não mágico que contenha metal, como uma chave, se você possuir o original durante o ritual.",
            "Starting at 2nd level, you can use your Channel Divinity to create simple items.\n\nYou conduct an hour-long ritual that crafts a nonmagical item that must include some metal: a simple or martial weapon, a suit of armor, ten pieces of ammunition, a set of tools, or another metal object (see chapter 5, “Equipment,” in the Player’s Handbook for examples of these items). The creation is completed at the end of the hour, coalescing in an unoccupied space of your choice on a surface within 5 feet of you.\n\nThe thing you create can be something that is worth no more than 100 gp. As part of this ritual, you must lay out metal, which can include coins, with a value equal to the creation. The metal irretrievably coalesces and transforms into the creation at the ritual’s end, magically forming even nonmetal parts of the creation.\n\nThe ritual can create a duplicate of a nonmagical item that contains metal, such as a key, if you possess the original during the ritual."),
        ],
        6: [f('soulOfTheForge', 'Alma da Forja', 'Soul of the Forge',
          "A partir do 6º nível, sua maestria na forja concede a você habilidades especiais:\n\n• Você ganha resistência a dano de fogo.\n\n• Enquanto estiver usando armadura pesada, você ganha um bônus de +1 na CA.", "Starting at 6th level, your mastery of the forge grants you special abilities:\n\n• You gain resistance to fire damage.\n\n• While wearing heavy armor, you gain a +1 bonus to AC.")],
        17: [f('saintOfForgeAndFire', 'Santo da Forja e do Fogo', 'Saint of Forge and Fire',
          "No 17º nível, sua afinidade abençoada com o fogo e o metal se torna mais poderosa:\n\n• Você ganha imunidade a dano de fogo.\n\n• Enquanto estiver usando armadura pesada, você tem resistência a dano contundente, perfurante e cortante de ataques não mágicos.",
          "At 17th level, your blessed affinity with fire and metal becomes more powerful:\n\n• You gain immunity to fire damage.\n\n• While wearing heavy armor, you have resistance to bludgeoning, piercing, and slashing damage from non-magical attacks.")],
      }),
  },

  grave: {
    name: b('Domínio da Sepultura', 'Grave Domain'), source: 'XGE',
    desc: b('Guardiões do limiar entre a vida e a morte (versão de 2014 ajustada).', 'Guardians of the line between life and death (adjusted 2014 version).'),
    levels: domain('grave', b('Domínio da Sepultura', 'Grave Domain'),
      { 3: ['bane', 'falseLife', 'gentleRepose', 'rayOfEnfeeblement'], 5: ['revivify', 'vampiricTouch'], 7: ['blight', 'deathWard'], 9: ['antilifeShell', 'raiseDead'] },
      {
        3: [
          f('circleOfMortality', 'Círculo da Mortalidade', 'Circle of Mortality',
            "No 1º nível, você adquire a habilidade de manipular a linha entre a vida e a morte. Quando normalmente rolaria um ou mais dados para recuperar pontos de vida com uma magia em uma criatura com 0 pontos de vida, em vez disso, você usa o maior número possível para cada dado.\n\nAlém disso, você aprende o truque poupar os moribundos, que não conta no número de truques de clérigo que você conhece. Para você, ele tem um alcance de 9 metros, e você pode conjurá-lo como uma ação bônus.",
            "At 1st level, you gain the ability to manipulate the line between life and death. When you would normally roll one or more dice to restore hit points with a spell to a creature at 0 hit points, you instead use the highest number possible for each die.\n\nIn addition, you learn the spare the dying cantrip, which doesn’t count against the number of cleric cantrips you know. For you, it has a range of 30 feet, and you can cast it as a bonus action."),
          f('eyesOfTheGrave', 'Olhos da Sepultura', 'Eyes of the Grave',
            "No 1º nível, você ganha a habilidade de sentir ocasionalmente a presença de mortos-vivos, cuja existência é um insulto ao ciclo natural da vida. Com uma ação, você pode abrir sua percepção para detectar mortos-vivos magicamente. Até o final do seu próximo turno, você sabe a localização de qualquer morto-vivo a até 18 metros de você que não esteja atrás de cobertura total e que não esteja protegido contra magia de adivinhação. Esse sentido não revela nada sobre as capacidades ou identidade de uma criatura.\n\nVocê pode usar esta característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez). Você recupera todos os usos gastos ao terminar um descanso longo.",
            "At lst level, you gain the ability to occasionally sense the presence of the undead, whose existence is an insult to the natural cycle of life. As an action, you can open your awareness to magically detect undead. Until the end of your next turn, you know the location of any undead within 60 feet of you that isn’t behind total cover and that isn’t protected from divination magic. This sense doesn’t tell you anything about a creature's capabilities or identity.\n\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a long rest."),
          f('pathToTheGrave', 'Caminho para a Sepultura', 'Path to the Grave',
            "A partir do 2º nível, você pode usar seu Canalizar Divindade para marcar a força vital de outra criatura para o extermínio.\n\nCom uma ação, você escolhe uma criatura que você possa ver a até 9 metros de você, amaldiçoando-a até o final do seu próximo turno. Na próxima vez que você ou um aliado seu atingir a criatura amaldiçoada com um ataque, a criatura terá vulnerabilidade a todo o dano desse ataque, e então a maldição se encerra.",
            "Starting at 2nd level, you can use your Channel Divinity to mark another creature’s life force for termination.\n\nAs an action, you choose one creature you can see within 30 feet of you, cursing it until the end of your next turn. The next time you or an ally of yours hits the cursed creature with an attack, the creature has vulnerability to all of that attack's damage, and then the curse ends."),
        ],
        6: [f('sentinelAtDeathsDoor', 'Sentinela à Porta da Morte', 'Sentinel at Death\'s Door',
          "No 6º nível, você adquire a habilidade de impedir o avanço da morte. Como uma reação quando você ou uma criatura que você possa ver a até 9 metros de você sofrer um acerto crítico, você pode transformar esse acerto em um acerto normal. Quaisquer efeitos ativados por um acerto crítico são cancelados. Você pode usar essa característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez). Você recupera todos os usos gastos ao terminar um descanso longo.",
          "At 6th level, you gain the ability to impede death’s progress. As a reaction when you or a creature you can see within 30 feet of you suffers a critical hit, you can turn that hit into a normal hit. Any effects triggered by a critical hit are canceled. You can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a long rest.")],
        17: [f('keeperOfSouls', 'Guardião das Almas', 'Keeper of Souls',
          "A partir do 17º nível, você pode capturar um vestígio de vitalidade de uma alma que parte e usá-lo para curar os vivos. Quando um inimigo que você possa ver morrer a até 18 metros de você, você ou uma criatura à sua escolha a até 18 metros de você recupera uma quantidade de pontos de vida igual ao número de Dados de Vida do inimigo. Você só pode usar essa característica se não estiver incapacitado. Depois de usá-la, você não pode fazê-lo novamente até o início do seu próximo turno.",
          "Starting at 17th level. you can seize a trace of vitality from a parting soul and use it to heal the living. When an enemy you can see dies within 60 feet of you, you or one creature of your choice that is within 60 feet of you regains hit points equal to the enemy’s number of Hit Dice. You can use this feature only if you aren’t incapacitated. Once you use it, you can't do so again until the start of your next turn.")],
      },
      { 3: { autoCantrips: ['spareTheDying'] } }),
  },

  order: {
    name: b('Domínio da Ordem', 'Order Domain'), source: 'TCE',
    desc: b('Disciplina, lei e comando sobre aliados e inimigos (versão de 2014 ajustada).', 'Discipline, law, and command over allies and foes (adjusted 2014 version).'),
    levels: domain('order', b('Domínio da Ordem', 'Order Domain'),
      { 3: ['command', 'heroism', 'holdPerson', 'zoneOfTruth'], 5: ['massHealingWord', 'slow'], 7: ['compulsion', 'locateCreature'], 9: ['commune', 'dominatePerson'] },
      {
        3: [
          f('orderBonusProficiencies', 'Proficiências Bônus', 'Bonus Proficiencies',
            "Quando você escolhe este domínio no 1º nível, você ganha proficiência com armaduras pesadas. Você também ganha proficiência na perícia Intimidação ou Persuasão (sua escolha).", "When you choose this domain at 1st level, you gain proficiency with heavy armor. You also gain proficiency in the Intimidation or Persuasion skill (your choice)."),
          f('voiceOfAuthority', 'Voz da Autoridade', 'Voice of Authority',
            "Característica de 1º nível do Domínio da Ordem\n\nVocê pode invocar o poder da lei para encorajar um aliado a atacar. Se você conjurar uma magia com um espaço de magia de 1º círculo ou superior e tiver um aliado como alvo da magia, esse aliado pode usar a reação dele imediatamente após a magia para fazer um ataque com arma contra uma criatura à sua escolha que você possa ver.\n\nSe a magia tiver como alvo mais de um aliado, você escolhe qual aliado pode fazer o ataque.",
            "1st-level Order Domain feature\n\nYou can invoke the power of law to embolden an ally to attack. If you cast a spell with a spell slot of 1st level or higher and target an ally with the spell, that ally can use their reaction immediately after the spell to make one weapon attack against a creature of your choice that you can see.\n\nIf the spell targets more than one ally, you choose the ally who can make the attack."),
          f('ordersDemand', 'Exigência da Ordem', 'Order\'s Demand',
            "Característica de 2º nível do Domínio da Ordem\n\nVocê pode usar seu Canalizar Divindade para exercer uma presença intimidadora sobre os outros.\n\nCom uma ação, você apresenta seu símbolo sagrado, e cada criatura à sua escolha a até 9 metros de você que puder vê-lo ou ouvi-lo deve ser bem-sucedida em uma salvaguarda de Sabedoria ou ficará enfeitiçada por você até o final do seu próximo turno ou até que a criatura enfeitiçada sofra qualquer dano. Você também pode fazer com que qualquer uma das criaturas enfeitiçadas solte o que estiver segurando quando falhar na salvaguarda.",
            "2nd-level Order Domain feature\n\nYou can use your Channel Divinity to exert an intimidating presence over others.\n\nAs an action, you present your holy symbol, and each creature of your choice that can see or hear you within 30 feet of you must succeed on a Wisdom saving throw or be charmed by you until the end of your next turn or until the charmed creature takes any damage. You can also cause any of the charmed creatures to drop what they are holding when they fail the saving throw."),
        ],
        6: [f('embodimentOfTheLaw', 'Encarnação da Lei', 'Embodiment of the Law',
          "Característica de 6º nível do Domínio da Ordem\n\nVocê se tornou extraordinariamente hábil em canalizar energia mágica para compelir outros.\n\nSe você conjurar uma magia da escola de encantamento usando um espaço de magia de 1º círculo ou superior, você pode alterar o tempo de conjuração da magia para 1 ação bônus para essa conjuração, desde que o tempo de conjuração original da magia seja normalmente 1 ação.\n\nVocê pode usar essa característica um número de vezes igual ao seu modificador de Sabedoria (mínimo de uma vez), e recupera todos os usos gastos dela ao terminar um descanso longo.",
          "6th-level Order Domain feature\n\nYou have become remarkably adept at channeling magical energy to compel others.\n\nIf you cast a spell of the enchantment school using a spell slot of 1st level or higher, you can change the spell’s casting time to 1 bonus action for this casting, provided the spell’s casting time is normally 1 action.\n\nYou can use this feature a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses of it when you finish a long rest.")],
        17: [f('ordersWrath', 'Ira da Ordem', 'Order\'s Wrath',
          'Uma vez por turno, ao causar o dano do Golpe Divino (opção de Golpes Abençoados), amaldiçoe o alvo: o próximo aliado que o acertar antes do fim do seu próximo turno causa +2d8 de dano psíquico. Requer ter escolhido Golpe Divino.',
          'Once per turn, when you deal Divine Strike damage (Blessed Strikes option), curse the target: the next ally to hit it before the end of your next turn deals an extra 2d8 Psychic damage. Requires the Divine Strike option.')],
      }),
  },

  peace: {
    name: b('Domínio da Paz', 'Peace Domain'), source: 'TCE',
    desc: b('Laços de harmonia que protegem os companheiros (versão de 2014 ajustada).', 'Bonds of harmony that shield companions (adjusted 2014 version).'),
    levels: domain('peace', b('Domínio da Paz', 'Peace Domain'),
      { 3: ['heroism', 'sanctuary', 'aid', 'wardingBond'], 5: ['beaconOfHope', 'sending'], 7: ['auraOfPurity', 'resilientSphere'], 9: ['greaterRestoration', 'telepathicBond'] },
      {
        3: [
          f('implementOfPeace', 'Instrumento da Paz', 'Implement of Peace',
            "Característica de 1º nível do Domínio da Paz\n\nVocê ganha proficiência na perícia Intuição, Atuação ou Persuasão (sua escolha).", "1st-level Peace Domain feature\n\nYou gain proficiency in the Insight, Performance, or Persuasion skill (your choice)."),
          f('emboldeningBond', 'Vínculo Encorajador', 'Emboldening Bond',
            "Característica de 1º nível do Domínio da Paz\n\nVocê pode forjar um elo fortalecedor entre pessoas que estão em paz umas com as outras. Com uma ação, você pode escolher um número de criaturas voluntárias a até 9 metros de você (o que pode incluir você mesmo) igual ao seu bônus de proficiência. Você cria um elo mágico entre elas por 10 minutos ou até usar essa característica novamente. Enquanto qualquer criatura vinculada estiver a até 9 metros de outra, a criatura pode rolar um d4 e adicionar o número rolado a uma jogada de ataque, teste de habilidade ou salvaguarda que realizar. Cada criatura pode adicionar o d4 no máximo uma vez por turno.\n\nVocê pode usar essa característica um número de vezes igual ao seu bônus de proficiência, e recupera todos os usos gastos ao terminar um descanso longo.",
            "1st-level Peace Domain feature\n\nYou can forge an empowering bond among people who are at peace with one another. As an action, you can choose a number of willing creatures within 30 feet of you (this can include yourself) equal to your proficiency bonus. You create a magical bond among them for 10 minutes or until you use this feature again. While any bonded creature is within 30 feet of another, the creature can roll a d4 and add the number rolled to an attack roll, an ability check, or a saving throw it makes. Each creature can add the d4 no more than once per turn.\n\nYou can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest."),
          f('balmOfPeace', 'Bálsamo da Paz', 'Balm of Peace',
            "Característica de 2º nível do Domínio da Paz\n\nVocê pode usar seu Canalizar Divindade para tornar sua própria presença um bálsamo reconfortante. Com uma ação, você pode se mover até o seu deslocamento, sem provocar ataques de oportunidade, e quando se mover a até 1,5 metro de qualquer outra criatura durante essa ação, você pode recuperar um número de pontos de vida daquela criatura igual a 2d6 + seu modificador de Sabedoria (mínimo de 1 ponto de vida). Uma criatura pode receber essa cura apenas uma vez sempre que você realizar essa ação.",
            "2nd-level Peace Domain feature\n\nYou can use your Channel Divinity to make your very presence a soothing balm. As an action, you can move up to your speed, without provoking an opportunity attacks, and when you move within 5 feet of any other creature during this action, you can restore a number of hit points to that creature equal to 2d6 + your Wisdom modifier (minimum of 1 hit point). A creature can receive this healing only once whenever you take this action."),
        ],
        6: [f('protectiveBond', 'Vínculo Protetor', 'Protective Bond',
          "Característica de 6º nível do Domínio da Paz\n\nO elo que você forja entre as pessoas ajuda-as a protegerem umas às outras. Quando uma criatura afetada por sua característica Elo Encorajador estiver prestes a sofrer dano, uma segunda criatura vinculada a até 9 metros da primeira pode usar sua reação para se teletransportar para um espaço desocupado a até 1,5 metro da primeira criatura. A segunda criatura então sofre todo o dano em seu lugar.",
          "6th-level Peace Domain feature\n\nThe bond you forge between people helps them protect each other. When a creature affected by your Emboldening Bond feature is about to take damage, a second bonded creature within 30 feet of the first can use its reaction to teleport to an unoccupied space within 5 feet of the first creature. The second creature then takes all the damage instead.")],
        17: [f('expansiveBond', 'Vínculo Expansivo', 'Expansive Bond',
          "Característica de 17º nível do Domínio da Paz\n\nOs benefícios de suas características Elo Encorajador e Elo Protetor agora funcionam quando as criaturas estão a até 18 metros uma da outra. Além disso, quando uma criatura usa Elo Protetor para assumir o dano de outra pessoa, a criatura tem resistência àquele dano.",
          "17th-level Peace Domain feature\n\nThe benefits of your Emboldening Bond and Protective Bond features now work when the creatures are within 60 feet of each other. Moreover, when a creature uses Protective Bond to take someone else’s damage, the creature has resistance to that damage.")],
      }),
  },

  twilight: {
    name: b('Domínio do Crepúsculo', 'Twilight Domain'), source: 'TCE',
    desc: b('Guardiões da penumbra, que protegem contra os horrores da noite (versão de 2014 ajustada).', 'Guardians of the dusk who shield others from the horrors of night (adjusted 2014 version).'),
    levels: domain('twilight', b('Domínio do Crepúsculo', 'Twilight Domain'),
      { 3: ['faerieFire', 'sleep', 'moonbeam', 'seeInvisibility'], 5: ['auraOfVitality', 'tinyHut'], 7: ['auraOfLife', 'greaterInvisibility'], 9: ['circleOfPower', 'mislead'] },
      {
        3: [
          f('twilightBonusProficiencies', 'Proficiências Bônus', 'Bonus Proficiencies',
            "Característica de 1º nível do Domínio do Crepúsculo\n\nVocê ganha proficiência com armas marciais e armaduras pesadas.", "1st-level Twilight Domain feature\n\nYou gain proficiency with martial weapons and heavy armor."),
          f('eyesOfNight', 'Olhos da Noite', 'Eyes of Night',
            "Característica de 1º nível do Domínio do Crepúsculo\n\nVocê pode enxergar através da mais profunda penumbra. Você tem visão no escuro com alcance de 90 metros. Nesse raio, você pode ver na luz penumbrosa como se fosse luz plena e na escuridão como se fosse luz penumbrosa.\n\nCom uma ação, você pode compartilhar magicamente a visão no escuro desta característica com criaturas voluntárias que possa ver a até 3 metros de você, até um número de criaturas igual ao seu modificador de Sabedoria (mínimo de uma criatura). A visão no escuro compartilhada dura por 1 hora. Uma vez compartilhada, você não pode fazê-lo novamente até terminar um descanso longo, a menos que gaste um espaço de magia de qualquer círculo para compartilhá-la novamente.",
            "1st-level Twilight Domain feature\n\nYou can see through the deepest gloom. You have darkvision out to a range of 300 feet. In that radius, you can see in dim light as if it were bright light and in darkness as if it were dim light.\n\nAs an action, you can magically share the darkvision of this feature with willing creatures you can see within 10 feet of you, up to a number of creatures equal to your Wisdom modifier (minimum of one creature). The shared darkvision lasts for 1 hour. Once you share it, you can’t do so again until you finish a long rest, unless you expend a spell slot of any level to share it again."),
          f('vigilantBlessing', 'Bênção Vigilante', 'Vigilant Blessing',
            "Característica de 1º nível do Domínio do Crepúsculo\n\nA noite ensinou você a ser vigilante. Com uma ação, você concede a uma criatura que você tocar (incluindo você mesmo, se desejar) vantagem na próxima jogada de iniciativa que a criatura fizer. Esse benefício termina imediatamente após a jogada ou se você usar essa característica novamente.",
            "1st-level Twilight Domain feature\n\nThe night has taught you to be vigilant. As an action, you give one creature you touch (including possibly yourself) advantage on the next initiative roll the creature makes. This benefit ends immediately after the roll or if you use this feature again."),
          f('twilightSanctuary', 'Santuário do Crepúsculo', 'Twilight Sanctuary',
            "Característica de 2º nível do Domínio do Crepúsculo\n\nVocê pode usar seu Canalizar Divindade para revigorar seus aliados com um crepúsculo reconfortante.\n\nCom uma ação, você apresenta seu símbolo sagrado, e uma esfera de crepúsculo emana de você. A esfera é centrada em você, tem um raio de 9 metros e é preenchida com penumbra. A esfera se move com você e dura por 1 minuto ou até você ficar incapacitado ou morrer. Sempre que uma criatura (incluindo você) terminar o turno dela na esfera, você pode conceder a essa criatura um dos seguintes benefícios:\n\n• Você concede a ela pontos de vida temporários iguais a 1d6 mais seu nível de clérigo.\n\n• Você encerra um efeito nela que esteja causando a condição enfeitiçado ou amedrontado.",
            "2nd-level Twilight Domain feature\n\nYou can use your Channel Divinity to refresh your allies with soothing twilight.\n\nAs an action, you present your holy symbol, and a sphere of twilight emanates from you. The sphere is centered on you, has a 30-foot radius, and is filled with dim light. The sphere moves with you, and it lasts for 1 minute or until you are incapacitated or die. Whenever a creature (including you) ends its turn in the sphere, you can grant that creature one of these benefits:\n\n• You grant it temporary hit points equal to 1d6 plus your cleric level.\n\n• You end one effect on it causing it to be charmed or frightened."),
        ],
        6: [f('stepsOfNight', 'Passos da Noite', 'Steps of Night',
          "Característica de 6º nível do Domínio do Crepúsculo\n\nVocê pode recorrer ao poder místico da noite para ascender ao ar. Como uma ação bônus quando você estiver na penumbra ou na escuridão, você pode magicamente conceder a si mesmo um deslocamento de voo igual ao seu deslocamento de caminhada por 1 minuto. Você pode usar essa ação bônus um número de vezes igual ao seu bônus de proficiência, e recupera todos os usos gastos ao terminar um descanso longo.",
          "6th-level Twilight Domain feature\n\nYou can draw on the mystical power of night to rise into the air. As a bonus action when you are in dim light or darkness, you can magically give yourself a flying speed equal to your walking speed for 1 minute. You can use this bonus action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.")],
        17: [f('twilightShroud', 'Mortalha do Crepúsculo', 'Twilight Shroud',
          "Característica de 17º nível do Domínio do Crepúsculo\n\nO crepúsculo que você invoca oferece um abraço protetor: você e seus aliados têm meia cobertura enquanto estiverem na esfera criada pelo seu Santuário do Crepúsculo.",
          "17th-level Twilight Domain feature\n\nThe twilight that you summon offers a protective embrace: you and your allies have half cover while in the sphere created by your Twilight Sanctuary.")],
      }),
  },

  // --- Unearthed Arcana (playtest, regras 2024) ------------------------------
  // Villainous Options (UA, 2/abr/2026). Resumo original; confira o documento.
  pestilence: {
    name: b('Domínio da Pestilência — UA', 'Pestilence Domain — UA'), source: 'UA26VO',
    desc: b('Playtest: clérigos de deuses da doença, da fome e da podridão, que espalham Exaustão entre os inimigos.',
      'Playtest: clerics of gods of disease, famine, and rot, who spread Exhaustion among their foes.'),
    levels: domain('pestilence', b('Domínio da Pestilência', 'Pestilence Domain'),
      { 3: ['detectPoisonAndDisease', 'protectionFromPoison', 'rayOfEnfeeblement', 'rayOfSickness'], 5: ['stinkingCloud', 'vampiricTouch'], 7: ['blight', 'giantInsect'], 9: ['contagion', 'insectPlague'] },
      {
        3: [
          f('blightWeaver', 'Tecelão da Praga', 'Blight Weaver',
            'Você tem Resistência a dano Necrótico e Venenoso e não pode ser infectado por contágios mágicos. O dano Necrótico ou Venenoso das suas magias e traços de clérigo ignora Resistência a esses tipos, e você pode trocar um tipo pelo outro ao causá-lo.',
            'You have Resistance to Necrotic and Poison damage and can\'t be infected by magical contagions. Necrotic or Poison damage from your Cleric spells and features ignores Resistance to those types, and you can swap one type for the other when you deal it.'),
          f('plagueBlessing', 'Bênção da Praga', 'Plague Blessing',
            `${cd('pt')}, ação Mágica: por 1 minuto, uma emanação de praga de 1,5 m envolve você ou uma criatura voluntária que você tocar (termina se você a dispensar, criá-la de novo ou ficar Incapacitado). Cada criatura à sua escolha que começar o turno nela faz salvaguarda de Constituição contra sua CD ou ganha 1 nível de Exaustão. Este traço não eleva a Exaustão de ninguém acima do seu modificador de Sabedoria (mínimo 1).`,
            `${cd('en')}, Magic action: for 1 minute, a 5-foot emanation of plague surrounds you or a willing creature you touch (it ends if you dismiss it, create it again, or are Incapacitated). Each creature of your choice that starts its turn in it makes a Constitution save against your DC or gains 1 Exhaustion level. This feature can't raise anyone's Exhaustion above your Wisdom modifier (minimum 1).`),
        ],
        6: [f('virulentBurst', 'Explosão Virulenta', 'Virulent Burst',
          "Reação: quando uma criatura hostil a até 18 m cai a 0 PV, ela explode numa emanação de praga de 3 m, ou de 6 m se tinha algum nível de Exaustão. Cada criatura à sua escolha na área faz salvaguarda de Constituição contra sua CD; se falhar, você escolhe: Choque Pútrido (fica Incapacitada e com Deslocamento 0 até o fim do próximo turno dela) ou Infecção Tóxica (3d6 de dano Necrótico ou Venenoso, à sua escolha). Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo.",
          'Reaction: when a hostile creature within 60 feet drops to 0 HP, it bursts into a 10-foot emanation of plague, or 20 feet if it had any Exhaustion. Each creature of your choice in the area makes a Constitution save against your DC; on a failure, you pick: Putrid Shock (Incapacitated and Speed 0 until the end of its next turn) or Toxic Infection (3d6 Necrotic or Poison damage, your choice). Uses: Wisdom modifier (minimum 1) per Long Rest.')],
        17: [f('verminForm', 'Forma de Vermes', 'Vermin Form',
          'Ação Bônus: por 10 minutos você vira um enxame Médio de pragas Minúsculas (baratas, larvas, ratos…). Nessa forma: imunidade a Agarrado, Paralisado, Caído e Contido; Resistência a dano Contundente, Cortante e Perfurante; você pode entrar e ficar no espaço de outras criaturas (e elas no seu); e um inimigo cujo espaço você entra, ou que entra no seu ou termina o turno nele, sofre dano Necrótico, Perfurante ou Venenoso (à sua escolha) igual ao seu modificador de Sabedoria, no máximo uma vez por turno. Termina antes se você quiser, ficar Incapacitado ou morrer. Uma vez por Descanso Longo, ou gaste um espaço de nível 5+ para recuperar o uso.',
          'Bonus Action: for 10 minutes you become a Medium swarm of Tiny pests (roaches, maggots, rats…). In this form: immunity to Grappled, Paralyzed, Prone, and Restrained; Resistance to Bludgeoning, Piercing, and Slashing damage; you can enter and occupy other creatures\' spaces (and they yours); and an enemy whose space you enter, or that enters or ends its turn in yours, takes Necrotic, Piercing, or Poison damage (your choice) equal to your Wisdom modifier, at most once per turn. It ends early if you choose, are Incapacitated, or die. Once per Long Rest, or expend a level 5+ slot to restore the use.')],
      }),
  },
};

// ---------------------------------------------------------------------------
// Recursos com usos (formato em README.md). Traços de domínio de livros de 2014
// começam no nível 3 em 2024 e no 1 em 2014: `both` gera as duas entradas.
const WIS = { ability: 'wis', min: 1 };
const both = (base, level2014) => [
  { ...base, rules: '2024' },
  { ...base, id: `${base.id}2014`, rules: '2014', minLevel: level2014 },
];
const resources = [
  { id: 'channelDivinity', name: b('Canalizar Divindade', 'Channel Divinity'), rules: '2024',
    desc: b('Descanso Curto recupera 1 uso; Longo recupera todos.', 'Short Rest regains one use; Long Rest regains all.'),
    uses: { byLevel: { 2: 2, 6: 3, 18: 4 } }, recharge: 'short', shortRestRegain: 1 },
  { id: 'channelDivinity2014', name: b('Canalizar Divindade', 'Channel Divinity'), rules: '2014',
    uses: { byLevel: { 2: 1, 6: 2, 18: 3 } }, recharge: 'short' },
  { id: 'divineIntervention', name: b('Intervenção Divina', 'Divine Intervention'), rules: '2024',
    desc: b('Se usada para Desejo (nível 20), só volta após 2d4 Descansos Longos.', 'If used for Wish (level 20), it returns only after 2d4 Long Rests.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 10 },
  { id: 'divineIntervention2014', name: b('Intervenção Divina', 'Divine Intervention'), rules: '2014',
    desc: b('Se funcionar, só pode tentar de novo após 7 dias; se falhar, após um Descanso Longo.', 'If it succeeds, you can\'t try again for 7 days; if it fails, after a Long Rest.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 10 },
  // Luz
  { id: 'wardingFlare', name: b('Clarão Protetor', 'Warding Flare'), subclass: ['light'], rules: '2024',
    desc: b('A partir do nível 6 (Clarão Aprimorado), volta também no Descanso Curto.', 'From level 6 (Improved Warding Flare) it also returns on a Short Rest.'),
    uses: WIS, recharge: 'long', minLevel: 3 },
  { id: 'wardingFlare2014', name: b('Clarão Protetor', 'Warding Flare'), subclass: ['light'], rules: '2014',
    uses: WIS, recharge: 'long', minLevel: 1 },
  { id: 'coronaOfLight', name: b('Coroa de Luz', 'Corona of Light'), subclass: ['light'], rules: '2024',
    uses: WIS, recharge: 'long', minLevel: 17 },
  // Guerra
  { id: 'warPriest', name: b('Sacerdote da Guerra', 'War Priest'), subclass: ['war'], rules: '2024',
    uses: WIS, recharge: 'short', minLevel: 3 },
  { id: 'warPriest2014', name: b('Sacerdote da Guerra', 'War Priest'), subclass: ['war'], rules: '2014',
    uses: WIS, recharge: 'long', minLevel: 1 },
  // Domínios de 2014 (mesmos usos nas duas versões; muda só o nível inicial)
  ...both({ id: 'wrathOfTheStorm', name: b('Ira da Tempestade', 'Wrath of the Storm'), subclass: ['tempest'], uses: WIS, recharge: 'long', minLevel: 3 }, 1),
  ...both({ id: 'eyesOfTheGrave', name: b('Olhos da Sepultura', 'Eyes of the Grave'), subclass: ['grave'], uses: WIS, recharge: 'long', minLevel: 3 }, 1),
  ...both({ id: 'blessingOfTheForge', name: b('Bênção da Forja', 'Blessing of the Forge'), subclass: ['forge'], uses: { fixed: 1 }, recharge: 'long', minLevel: 3 }, 1),
  ...both({ id: 'emboldeningBond', name: b('Vínculo Encorajador', 'Emboldening Bond'), subclass: ['peace'], uses: { profBonus: true }, recharge: 'long', minLevel: 3 }, 1),
  ...both({ id: 'eyesOfNight', name: b('Olhos da Noite (compartilhar)', 'Eyes of Night (share)'), subclass: ['twilight'],
    desc: b('Também pode ser usado gastando um espaço de magia.', 'Can also be used by expending a spell slot.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 3 }, 1),
  { id: 'sentinelAtDeathsDoor', name: b('Sentinela à Porta da Morte', 'Sentinel at Death\'s Door'), subclass: ['grave'], uses: WIS, recharge: 'long', minLevel: 6 },
  { id: 'embodimentOfTheLaw', name: b('Encarnação da Lei', 'Embodiment of the Law'), subclass: ['order'], uses: WIS, recharge: 'long', minLevel: 6 },
  { id: 'stepsOfNight', name: b('Passos da Noite', 'Steps of Night'), subclass: ['twilight'], uses: { profBonus: true }, recharge: 'long', minLevel: 6 },
  { id: 'visionsOfThePast', name: b('Visões do Passado', 'Visions of the Past'), subclass: ['knowledge'], uses: { fixed: 1 }, recharge: 'short', minLevel: 17 },
  // Pestilência (UA, só regras 2024)
  { id: 'virulentBurst', name: b('Explosão Virulenta', 'Virulent Burst'), subclass: ['pestilence'], rules: '2024',
    uses: WIS, recharge: 'long', minLevel: 6 },
  { id: 'verminForm', name: b('Forma de Vermes', 'Vermin Form'), subclass: ['pestilence'], rules: '2024',
    desc: b('Ou gaste um espaço de nível 5+ para recuperar.', 'Or expend a level 5+ slot to restore it.'),
    uses: { fixed: 1 }, recharge: 'long', minLevel: 17 },
];

export default {
  classId: 'cleric',
  pools,
  // Ordem Divina no 1; Golpes Abençoados no 7 (sem troca).
  choices: { 1: { divineOrder: 1 }, 7: { blessedStrikes: 1 } },
  // Escolhas de domínio: nível 3 nas fichas 2024, nível 1 nas fichas 2014.
  subclassChoices: {
    knowledge: { 3: { knowledgeLanguage: 2, knowledgeSkill: 2 } },
    nature: { 3: { natureSkill: 1, natureCantrip: 1 } },
    death: { 3: { reaperCantrip: 1 } },
    arcana: { 3: { arcanaCantrip: 2 }, 17: { arcaneMastery6: 1, arcaneMastery7: 1, arcaneMastery8: 1, arcaneMastery9: 1 } },
    order: { 3: { orderSkill: 1 } },
    peace: { 3: { peaceSkill: 1 } },
  },
  legacySubclassChoices: {
    life: { 1: { legacyDomainProficiencies: 1 } },
    war: { 1: { legacyDomainProficiencies: 1 } },
    knowledge: { 1: { knowledgeLanguage: 2, knowledgeSkill: 2 } },
    nature: { 1: { natureSkill: 1, natureCantrip: 1, legacyDomainProficiencies: 1 } },
    tempest: { 1: { legacyDomainProficiencies: 1 } },
    death: { 1: { reaperCantrip: 1, legacyDomainProficiencies: 1 } },
    arcana: { 1: { arcanaCantrip: 2, legacyDomainProficiencies: 1 }, 17: { arcaneMastery6: 1, arcaneMastery7: 1, arcaneMastery8: 1, arcaneMastery9: 1 } },
    forge: { 1: { legacyDomainProficiencies: 1 } },
    order: { 1: { orderSkill: 1, legacyDomainProficiencies: 1 } },
    peace: { 1: { peaceSkill: 1 } },
    twilight: { 1: { legacyDomainProficiencies: 1 } },
  },
  features,
  subclasses,
  resources,
};
