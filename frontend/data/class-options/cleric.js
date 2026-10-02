// Clérigo — opções, traços e domínios (regras 2024). Formato em README.md.
// Classe base e Domínio da Vida: SRD 5.2.1 (CC-BY 4.0), texto adaptado.
// Demais domínios: resumos ORIGINAIS (nada copiado de livros pagos).
// Domínios de livros de 2014 foram ajustados às regras de 2024: traços dos
// níveis 1 e 2 vão para o 3; magias de domínio nos níveis 3/5/7/9; o traço de
// nível 8 (Golpe Divino / Conjuração Potente) sai, pois a classe já concede
// Golpes Abençoados no nível 7.
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
      desc: b('Some o modificador de Sabedoria ao dano de qualquer truque de clérigo. No nível 14, ao causar dano com um truque de clérigo, você ou uma criatura a até 18 m (60 pés) recebe PV temporários iguais ao dobro do seu modificador de Sabedoria.',
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
      'Canalizar Divindade, ação Mágica: aponte o Símbolo Sagrado para outra criatura que você veja a até 9 m (30 pés). Role 1d8 + modificador de Sabedoria e cure esse total, ou force uma salvaguarda de Constituição: se falhar, sofre esse total em dano necrótico ou radiante (à sua escolha); se passar, metade. Dados: 2d8 no nível 7, 3d8 no 13 e 4d8 no 18.',
      'Channel Divinity, Magic action: point your Holy Symbol at another creature you can see within 30 feet. Roll 1d8 + your Wisdom modifier and either restore that many Hit Points or force a Constitution save: on a failure it takes that much Necrotic or Radiant damage (your choice), half on a success. Dice: 2d8 at level 7, 3d8 at 13, 4d8 at 18.'),
    f('turnUndead', 'Expulsar Mortos-Vivos', 'Turn Undead',
      'Canalizar Divindade, ação Mágica: apresente o Símbolo Sagrado; cada morto-vivo à sua escolha a até 9 m (30 pés) faz uma salvaguarda de Sabedoria. Se falhar, fica Amedrontado e Incapacitado por 1 minuto e tenta se afastar de você. O efeito termina se ele sofrer dano, se você ficar Incapacitado ou morrer.',
      'Channel Divinity, Magic action: present your Holy Symbol; each Undead of your choice within 30 feet makes a Wisdom save. On a failure it has the Frightened and Incapacitated conditions for 1 minute and tries to move away from you. The effect ends early if it takes damage, or if you are Incapacitated or die.'),
  ],
  3: [
    f('clericSubclass', 'Subclasse de Clérigo', 'Cleric Subclass',
      'Escolha um Domínio divino. Ele concede traços nos níveis de clérigo 3, 6 e 17 e magias sempre preparadas nos níveis 3, 5, 7 e 9.',
      'Choose a divine Domain. It grants features at Cleric levels 3, 6, and 17 and always-prepared spells at levels 3, 5, 7, and 9.'),
  ],
  4: [asi(4)],
  5: [
    f('searUndead', 'Abrasar Mortos-Vivos', 'Sear Undead',
      'Ao usar Expulsar Mortos-Vivos, role um número de d8 igual ao seu modificador de Sabedoria (mínimo 1d8). Cada morto-vivo que falhar na salvaguarda sofre dano radiante igual ao total. Esse dano não encerra o efeito de expulsão.',
      'Whenever you use Turn Undead, roll a number of d8s equal to your Wisdom modifier (minimum 1d8). Each Undead that fails its save takes Radiant damage equal to the total. This damage doesn\'t end the turn effect.'),
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
      'A opção escolhida em Golpes Abençoados fica mais forte. Golpe Divino: o dano extra passa a 2d8. Conjuração Potente: ao causar dano com um truque de clérigo, você ou outra criatura a até 18 m (60 pés) recebe PV temporários iguais ao dobro do seu modificador de Sabedoria.',
      'The option you chose for Blessed Strikes grows stronger. Divine Strike: the extra damage becomes 2d8. Potent Spellcasting: when a Cleric cantrip deals damage to a creature, you or another creature within 60 feet gains Temporary Hit Points equal to twice your Wisdom modifier.'),
  ],
  16: [asi(16)],
  19: [
    f('epicBoon', 'Dádiva Épica', 'Epic Boon',
      'Você ganha um talento de Dádiva Épica ou outro talento para o qual se qualifique. Recomendado: Dádiva do Destino.',
      'You gain an Epic Boon feat or another feat of your choice for which you qualify. Boon of Fate is recommended.'),
  ],
  20: [
    f('greaterDivineIntervention', 'Intervenção Divina Maior', 'Greater Divine Intervention',
      'Ao usar Intervenção Divina, você pode escolher Desejo. Se fizer isso, só pode usar Intervenção Divina de novo após terminar 2d4 Descansos Longos.',
      'When you use Divine Intervention, you can choose Wish. If you do, you can\'t use Divine Intervention again until you finish 2d4 Long Rests.'),
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
            'Quando uma magia conjurada com espaço de magia restaura PV de uma criatura, ela recupera, no turno da conjuração, PV adicionais iguais a 2 + o círculo do espaço.',
            'When a spell you cast with a spell slot restores Hit Points to a creature, it regains additional Hit Points on that turn equal to 2 plus the slot\'s level.'),
          f('preserveLife', 'Preservar a Vida', 'Preserve Life',
            `${cd('pt')}, ação Mágica: restaure PV num total de 5 × seu nível de clérigo, divididos entre criaturas Sangrando a até 9 m (30 pés), incluindo você. Nenhuma passa de metade do PV máximo.`,
            `${cd('en')}, Magic action: restore Hit Points equal to five times your Cleric level, divided among Bloodied creatures within 30 feet (you included). No creature goes above half its Hit Point maximum.`),
        ],
        6: [f('blessedHealer', 'Curandeiro Abençoado', 'Blessed Healer',
          'Logo depois de conjurar, com espaço de magia, uma magia que restaura PV de outras criaturas, você recupera PV iguais a 2 + o círculo do espaço.',
          'Immediately after you cast a spell with a spell slot that restores Hit Points to creatures other than yourself, you regain Hit Points equal to 2 plus the slot\'s level.')],
        17: [f('supremeHealing', 'Cura Suprema', 'Supreme Healing',
          'Quando for rolar dados para restaurar PV com uma magia ou com Canalizar Divindade, use o valor máximo de cada dado (ex.: 2d6 vira 12).',
          'When you would roll dice to restore Hit Points with a spell or Channel Divinity, use the highest number on each die instead (e.g., 2d6 becomes 12).')],
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
            `${cd('pt')}, ação Mágica: uma emanação de 9 m (30 pés) dissipa Escuridão mágica; criaturas à sua escolha nela fazem salvaguarda de Constituição e sofrem 2d10 + seu nível de clérigo de dano radiante (metade se passarem).`,
            `${cd('en')}, Magic action: a 30-foot emanation dispels magical Darkness; creatures of your choice in it make a Constitution save, taking 2d10 + your Cleric level Radiant damage (half on a success).`),
          f('wardingFlare', 'Clarão Protetor', 'Warding Flare',
            'Reação: quando uma criatura que você vê a até 9 m (30 pés) faz uma jogada de ataque, imponha Desvantagem a ela com um clarão de luz. Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo.',
            'Reaction: when a creature you can see within 30 feet makes an attack roll, flash light to impose Disadvantage on it. Uses: your Wisdom modifier (minimum 1) per Long Rest.'),
        ],
        6: [f('improvedWardingFlare', 'Clarão Protetor Aprimorado', 'Improved Warding Flare',
          'Os usos do Clarão Protetor voltam num Descanso Curto ou Longo. Ao usá-lo, o alvo do ataque recebe 2d6 + seu modificador de Sabedoria em PV temporários.',
          'Warding Flare uses return on a Short or Long Rest. When you use it, the attack\'s target gains 2d6 + your Wisdom modifier Temporary Hit Points.')],
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
            'Ação Mágica: você ou uma criatura voluntária a até 9 m (30 pés) ganha Vantagem em testes de Destreza (Furtividade) até você terminar um Descanso Longo ou usar este traço de novo.',
            'Magic action: you or a willing creature within 30 feet gains Advantage on Dexterity (Stealth) checks until you finish a Long Rest or use this feature again.'),
          f('invokeDuplicity', 'Invocar Duplicidade', 'Invoke Duplicity',
            `${cd('pt')}, ação Bônus: cria uma ilusão perfeita de você num espaço a até 9 m (30 pés) por 1 minuto (sem Concentração). Você pode conjurar magias como se estivesse no espaço dela, tem Vantagem em ataques contra criaturas a até 1,5 m de vocês dois, e pode movê-la 9 m com uma ação Bônus (até 36 m de você).`,
            `${cd('en')}, Bonus Action: create a perfect illusion of yourself in a space within 30 feet for 1 minute (no Concentration). You can cast spells as though you were in its space, have Advantage on attacks against creatures within 5 feet of both of you, and can move it 30 feet as a Bonus Action (staying within 120 feet of you).`),
        ],
        6: [f('trickstersTransposition', 'Transposição do Trapaceiro', 'Trickster\'s Transposition',
          'Ao criar a ilusão da Duplicidade ou movê-la com ação Bônus, você pode se teleportar, trocando de lugar com ela.',
          'When you create your Duplicity illusion or move it with a Bonus Action, you can teleport, swapping places with it.')],
        17: [f('improvedDuplicity', 'Duplicidade Aprimorada', 'Improved Duplicity',
          'Você e seus aliados têm Vantagem em ataques contra criaturas a até 1,5 m (5 pés) da ilusão. Quando a ilusão acaba, você ou uma criatura a até 1,5 m dela recupera PV iguais ao seu nível de clérigo.',
          'You and your allies have Advantage on attacks against creatures within 5 feet of the illusion. When the illusion ends, you or a creature within 5 feet of it regains Hit Points equal to your Cleric level.')],
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
            `${cd('pt')}: quando você ou uma criatura a até 9 m (30 pés) erra uma jogada de ataque, some +10 a ela, possivelmente acertando. Para ajudar outra criatura, gaste também sua Reação.`,
            `${cd('en')}: when you or a creature within 30 feet misses with an attack roll, add +10 to it, possibly turning it into a hit. Helping another creature also costs your Reaction.`),
          f('warPriest', 'Sacerdote da Guerra', 'War Priest',
            'Ação Bônus: faça um ataque com arma ou um Ataque Desarmado. Usos: modificador de Sabedoria (mínimo 1), recuperados num Descanso Curto ou Longo.',
            'Bonus Action: make one attack with a weapon or an Unarmed Strike. Uses: your Wisdom modifier (minimum 1), regained on a Short or Long Rest.'),
        ],
        6: [f('warGodsBlessing', 'Bênção do Deus da Guerra', 'War God\'s Blessing',
          `Gaste um uso de ${cd('pt')} para conjurar Escudo da Fé ou Arma Espiritual sem espaço de magia; a magia não exige Concentração e dura 1 minuto.`,
          `Expend a use of ${cd('en')} to cast Shield of Faith or Spiritual Weapon without a spell slot; it needs no Concentration and lasts 1 minute.`)],
        17: [f('avatarOfBattle', 'Avatar da Batalha', 'Avatar of Battle',
          'Você tem Resistência a dano contundente, perfurante e cortante.',
          'You have Resistance to Bludgeoning, Piercing, and Slashing damage.')],
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
            'Aprenda dois idiomas e escolha duas perícias entre Arcanismo, História, Natureza e Religião: você é proficiente nelas com Especialização.',
            'Learn two languages and choose two skills among Arcana, History, Nature, and Religion: you gain proficiency with Expertise in them.'),
          f('knowledgeOfTheAges', 'Conhecimento das Eras', 'Knowledge of the Ages',
            `${cd('pt')}, ação Mágica: por 10 minutos você fica proficiente numa perícia ou ferramenta à sua escolha.`,
            `${cd('en')}, Magic action: for 10 minutes you gain proficiency with one skill or tool of your choice.`),
        ],
        6: [f('readThoughts', 'Ler Pensamentos', 'Read Thoughts',
          `${cd('pt')}, ação Mágica: uma criatura a até 18 m (60 pés) faz salvaguarda de Sabedoria. Se falhar, você lê os pensamentos superficiais dela por 1 minuto e, nesse tempo, pode encerrar o efeito para conjurar Sugestão nela sem espaço de magia (falha automática na salvaguarda).`,
          `${cd('en')}, Magic action: a creature within 60 feet makes a Wisdom save. On a failure you read its surface thoughts for 1 minute and may end the effect to cast Suggestion on it without a slot (it fails the save automatically).`)],
        17: [f('visionsOfThePast', 'Visões do Passado', 'Visions of the Past',
          'Meditando por até 1 minuto (Concentração), você vislumbra o passado recente de um objeto que segura ou do lugar onde está. Uma vez por Descanso Curto ou Longo.',
          'Meditating for up to 1 minute (Concentration), you glimpse the recent past of an object you hold or of your surroundings. Once per Short or Long Rest.')],
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
            'Aprenda um truque de druida (conta como truque de clérigo, fora do limite) e ganhe proficiência em Adestrar Animais, Natureza ou Sobrevivência.',
            'Learn one Druid cantrip (a Cleric cantrip for you, outside your limit) and gain proficiency in Animal Handling, Nature, or Survival.'),
          f('natureBonusProficiency', 'Proficiência Bônus', 'Bonus Proficiency',
            'Você ganha treino com armadura pesada.', 'You gain training with Heavy armor.'),
          f('charmAnimalsAndPlants', 'Encantar Animais e Plantas', 'Charm Animals and Plants',
            `${cd('pt')}, ação Mágica: cada Fera ou Planta que você vê a até 9 m (30 pés) faz salvaguarda de Sabedoria; se falhar, fica Enfeitiçada por você por 1 minuto ou até sofrer dano.`,
            `${cd('en')}, Magic action: each Beast or Plant you can see within 30 feet makes a Wisdom save; on a failure it is Charmed by you for 1 minute or until it takes damage.`),
        ],
        6: [f('dampenElements', 'Atenuar Elementos', 'Dampen Elements',
          'Reação: quando você ou uma criatura a até 9 m (30 pés) sofre dano de ácido, elétrico, frio, fogo ou trovão, conceda Resistência a esse dano.',
          'Reaction: when you or a creature within 30 feet takes Acid, Cold, Fire, Lightning, or Thunder damage, grant Resistance to that damage.')],
        17: [f('masterOfNature', 'Mestre da Natureza', 'Master of Nature',
          'Ação Bônus: dê ordens verbais às criaturas Enfeitiçadas por Encantar Animais e Plantas, decidindo o que farão no próximo turno delas.',
          'Bonus Action: verbally command creatures Charmed by your Charm Animals and Plants, deciding what they do on their next turn.')],
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
            'Proficiência com armas marciais e treino com armadura pesada.', 'Proficiency with Martial weapons and training with Heavy armor.'),
          f('wrathOfTheStorm', 'Ira da Tempestade', 'Wrath of the Storm',
            'Reação: quando uma criatura a até 1,5 m (5 pés) que você vê o acerta, ela faz salvaguarda de Destreza e sofre 2d8 de dano elétrico ou trovão (à sua escolha); metade se passar. Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo.',
            'Reaction: when a creature you can see within 5 feet hits you, it makes a Dexterity save, taking 2d8 Lightning or Thunder damage (your choice), half on a success. Uses: your Wisdom modifier (minimum 1) per Long Rest.'),
          f('destructiveWrath', 'Ira Destrutiva', 'Destructive Wrath',
            `${cd('pt')}: ao rolar dano elétrico ou trovão, use o dano máximo em vez de rolar.`,
            `${cd('en')}: when you roll Lightning or Thunder damage, deal maximum damage instead of rolling.`),
        ],
        6: [f('thunderboltStrike', 'Golpe Trovejante', 'Thunderbolt Strike',
          'Quando você causa dano elétrico a uma criatura Grande ou menor, pode empurrá-la até 3 m (10 pés) para longe.',
          'When you deal Lightning damage to a Large or smaller creature, you can push it up to 10 feet away.')],
        17: [f('stormborn', 'Nascido da Tempestade', 'Stormborn',
          'Ao ar livre (fora de subterrâneos e construções), você tem deslocamento de voo igual ao seu deslocamento.',
          'While outdoors (not underground or indoors), you have a Fly Speed equal to your Speed.')],
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
            'Proficiência com armas marciais.', 'Proficiency with Martial weapons.'),
          f('reaper', 'Ceifador', 'Reaper',
            'Aprenda um truque de necromancia de qualquer lista (conta como truque de clérigo, fora do limite). Seus truques de necromancia que afetam só uma criatura podem afetar duas, a até 1,5 m (5 pés) uma da outra.',
            'Learn one necromancy cantrip from any list (a Cleric cantrip for you, outside your limit). Your necromancy cantrips that target one creature can target two within 5 feet of each other.'),
          f('touchOfDeath', 'Toque da Morte', 'Touch of Death',
            `${cd('pt')}: ao acertar uma criatura com ataque corpo a corpo, cause dano necrótico extra igual a 5 + o dobro do seu nível de clérigo.`,
            `${cd('en')}: when you hit a creature with a melee attack, deal extra Necrotic damage equal to 5 + twice your Cleric level.`),
        ],
        6: [f('inescapableDestruction', 'Destruição Inescapável', 'Inescapable Destruction',
          'O dano necrótico das suas magias de clérigo e de Canalizar Divindade ignora Resistência a dano necrótico.',
          'Necrotic damage from your Cleric spells and Channel Divinity ignores Resistance to Necrotic damage.')],
        17: [f('improvedReaper', 'Ceifador Aprimorado', 'Improved Reaper',
          'Magias de necromancia de 1º a 5º círculo que afetam só uma criatura podem afetar duas, a até 1,5 m uma da outra (componentes consumidos são exigidos para cada uma).',
          'Level 1–5 necromancy spells that target one creature can target two within 5 feet of each other (consumed components are needed for each).')],
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
            'Proficiência em Arcanismo e dois truques de mago à sua escolha, que contam como truques de clérigo e ficam fora do limite.',
            'Proficiency in Arcana and two Wizard cantrips of your choice, which count as Cleric cantrips and don\'t count against your limit.'),
          f('arcaneAbjuration', 'Abjuração Arcana', 'Arcane Abjuration',
            `${cd('pt')}, ação Mágica: um Celestial, Elemental, Fada ou Corruptor a até 9 m (30 pés) faz salvaguarda de Sabedoria; se falhar, é expulso por 1 minuto (como em Expulsar Mortos-Vivos). A partir do nível 5, se o ND dele for até ½ (nível 5), 1 (8), 2 (11), 3 (14) ou 4 (17), é banido por 1 minuto para seu plano natal.`,
            `${cd('en')}, Magic action: one Celestial, Elemental, Fey, or Fiend within 30 feet makes a Wisdom save; on a failure it is turned for 1 minute (as Turn Undead). From level 5, if its CR is at most 1/2 (level 5), 1 (8), 2 (11), 3 (14), or 4 (17), it is banished to its home plane for 1 minute instead.`),
        ],
        6: [f('spellBreaker', 'Quebra-Magia', 'Spell Breaker',
          'Quando você cura um aliado com uma magia de 1º círculo ou maior, também pode encerrar uma magia nele de círculo igual ou menor ao do espaço usado.',
          'When you heal an ally with a level 1+ spell, you can also end one spell on it of a level no higher than the slot used.')],
        17: [f('arcaneMastery', 'Maestria Arcana', 'Arcane Mastery',
          'Escolha uma magia de mago de cada círculo, 6º, 7º, 8º e 9º. Elas viram magias de domínio, sempre preparadas.',
          'Choose one Wizard spell of each level 6, 7, 8, and 9. They become domain spells, always prepared.')],
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
            'Treino com armadura pesada e proficiência com ferramentas de ferreiro.', 'Training with Heavy armor and proficiency with Smith\'s Tools.'),
          f('blessingOfTheForge', 'Bênção da Forja', 'Blessing of the Forge',
            'Ao terminar um Descanso Longo, toque uma armadura ou uma arma simples ou marcial não mágica: até seu próximo Descanso Longo ela é mágica e concede +1 na CA (armadura) ou +1 nas jogadas de ataque e dano (arma). Uma vez por Descanso Longo.',
            'At the end of a Long Rest, touch a nonmagical armor or Simple or Martial weapon: until your next Long Rest it is magical, granting +1 AC (armor) or +1 to attack and damage rolls (weapon). Once per Long Rest.'),
          f('artisansBlessing', 'Bênção do Artesão', 'Artisan\'s Blessing',
            `${cd('pt')}: num ritual de 1 hora, crie um item não mágico que contenha metal, de até 100 PO, consumindo metal de valor igual.`,
            `${cd('en')}: in a 1-hour ritual, craft a nonmagical item containing metal worth up to 100 GP, consuming metal of equal value.`),
        ],
        6: [f('soulOfTheForge', 'Alma da Forja', 'Soul of the Forge',
          'Resistência a dano de fogo; usando armadura pesada, +1 na CA.', 'Resistance to Fire damage; while wearing Heavy armor, +1 AC.')],
        17: [f('saintOfForgeAndFire', 'Santo da Forja e do Fogo', 'Saint of Forge and Fire',
          'Imunidade a dano de fogo; usando armadura pesada, Resistência a dano contundente, perfurante e cortante de ataques não mágicos.',
          'Immunity to Fire damage; while wearing Heavy armor, Resistance to Bludgeoning, Piercing, and Slashing damage from nonmagical attacks.')],
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
            'Quando você cura com magia uma criatura com 0 PV, use o valor máximo dos dados. Você aprende Poupar os Moribundos (fora do limite), que para você tem alcance de 9 m (30 pés) e pode ser conjurado como ação Bônus.',
            'When you heal a creature at 0 Hit Points with a spell, use the maximum on the dice. You learn Spare the Dying (outside your limit), which for you has a 30-foot range and can be cast as a Bonus Action.'),
          f('eyesOfTheGrave', 'Olhos da Sepultura', 'Eyes of the Grave',
            'Ação Mágica: até o fim do seu próximo turno, você sente a localização de mortos-vivos a até 18 m (60 pés) que não estejam atrás de cobertura total. Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo.',
            'Magic action: until the end of your next turn, you sense the location of Undead within 60 feet not behind total cover. Uses: your Wisdom modifier (minimum 1) per Long Rest.'),
          f('pathToTheGrave', 'Caminho para a Sepultura', 'Path to the Grave',
            `${cd('pt')}, ação Mágica: amaldiçoe uma criatura a até 9 m (30 pés) até o fim do seu próximo turno. O próximo ataque que a acertar ignora a Resistência dela ou, se não tiver, causa dano dobrado; então a maldição acaba.`,
            `${cd('en')}, Magic action: curse a creature within 30 feet until the end of your next turn. The next attack that hits it ignores its Resistance or, if it has none, deals double damage; then the curse ends.`),
        ],
        6: [f('sentinelAtDeathsDoor', 'Sentinela à Porta da Morte', 'Sentinel at Death\'s Door',
          'Reação: quando você ou uma criatura a até 9 m (30 pés) sofre um Acerto Crítico, transforme-o em acerto normal. Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo.',
          'Reaction: when you or a creature within 30 feet is hit by a Critical Hit, turn it into a normal hit. Uses: your Wisdom modifier (minimum 1) per Long Rest.')],
        17: [f('keeperOfSouls', 'Guardião das Almas', 'Keeper of Souls',
          'Uma vez por rodada, quando um inimigo morre a até 18 m (60 pés), você ou uma criatura a até 18 m recupera PV iguais ao número de Dados de Vida dele (não funciona com Constructos nem mortos-vivos).',
          'Once per round, when an enemy dies within 60 feet, you or a creature within 60 feet regains Hit Points equal to its number of Hit Dice (not for Constructs or Undead).')],
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
            'Treino com armadura pesada e proficiência em Intimidação ou Persuasão (à escolha).', 'Training with Heavy armor and proficiency in Intimidation or Persuasion (your choice).'),
          f('voiceOfAuthority', 'Voz da Autoridade', 'Voice of Authority',
            'Quando você conjura uma magia de 1º círculo ou maior com espaço de magia num aliado, ele pode usar a Reação para fazer um ataque com arma contra uma criatura que você escolher e que ele veja.',
            'When you cast a level 1+ spell with a slot targeting an ally, that ally can use its Reaction to make one weapon attack against a creature of your choice that it can see.'),
          f('ordersDemand', 'Exigência da Ordem', 'Order\'s Demand',
            `${cd('pt')}, ação Mágica: criaturas à sua escolha a até 9 m (30 pés) fazem salvaguarda de Sabedoria; se falharem, ficam Enfeitiçadas por você até o fim do seu próximo turno ou até sofrer dano, e você pode fazê-las largar o que seguram.`,
            `${cd('en')}, Magic action: creatures of your choice within 30 feet make a Wisdom save; on a failure they are Charmed by you until the end of your next turn or until they take damage, and you can make them drop what they hold.`),
        ],
        6: [f('embodimentOfTheLaw', 'Encarnação da Lei', 'Embodiment of the Law',
          'Magias de encantamento de 1º círculo ou maior que levam uma ação podem ser conjuradas como ação Bônus. Usos: modificador de Sabedoria (mínimo 1) por Descanso Longo.',
          'Level 1+ enchantment spells with a casting time of an action can be cast as a Bonus Action. Uses: your Wisdom modifier (minimum 1) per Long Rest.')],
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
            'Proficiência em Intuição, Atuação ou Persuasão (à escolha).', 'Proficiency in Insight, Performance, or Persuasion (your choice).'),
          f('emboldeningBond', 'Vínculo Encorajador', 'Emboldening Bond',
            'Ação Mágica: vincule até um número de criaturas voluntárias igual ao seu bônus de proficiência, a até 9 m (30 pés), por 10 minutos. Uma vez por turno, uma criatura vinculada a até 9 m de outra vinculada pode somar 1d4 a uma jogada de ataque, teste de atributo ou salvaguarda. Usos: bônus de proficiência por Descanso Longo.',
            'Magic action: bond a number of willing creatures up to your Proficiency Bonus within 30 feet for 10 minutes. Once per turn, a bonded creature within 30 feet of another bonded creature can add 1d4 to an attack roll, ability check, or saving throw. Uses: Proficiency Bonus per Long Rest.'),
          f('balmOfPeace', 'Bálsamo da Paz', 'Balm of Peace',
            `${cd('pt')}, ação Mágica: mova-se até seu deslocamento sem provocar Ataques de Oportunidade; cada criatura à sua escolha de quem você passar a até 1,5 m (5 pés) recupera 2d6 + seu modificador de Sabedoria em PV (uma vez cada).`,
            `${cd('en')}, Magic action: move up to your Speed without provoking Opportunity Attacks; each creature of your choice you pass within 5 feet of regains 2d6 + your Wisdom modifier Hit Points (once each).`),
        ],
        6: [f('protectiveBond', 'Vínculo Protetor', 'Protective Bond',
          'Quando uma criatura vinculada vai sofrer dano, outra vinculada a até 9 m (30 pés) pode usar a Reação para se teleportar para perto dela e sofrer o dano no lugar.',
          'When a bonded creature is about to take damage, another bonded creature within 30 feet can use its Reaction to teleport next to it and take the damage instead.')],
        17: [f('expansiveBond', 'Vínculo Expansivo', 'Expansive Bond',
          'As distâncias do Vínculo Encorajador e do Vínculo Protetor passam a 18 m (60 pés), e quem recebe dano pelo Vínculo Protetor tem Resistência a ele.',
          'The ranges of Emboldening Bond and Protective Bond become 60 feet, and a creature taking damage through Protective Bond has Resistance to it.')],
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
            'Proficiência com armas marciais e treino com armadura pesada.', 'Proficiency with Martial weapons and training with Heavy armor.'),
          f('eyesOfNight', 'Olhos da Noite', 'Eyes of Night',
            'Visão no escuro de 90 m (300 pés). Ação Mágica: compartilhe-a por 1 hora com até um número de criaturas voluntárias a até 3 m igual ao seu modificador de Sabedoria (mínimo 1). Uma vez por Descanso Longo, ou gastando um espaço de magia.',
            'Darkvision out to 300 feet. Magic action: share it for 1 hour with willing creatures within 10 feet, up to your Wisdom modifier (minimum 1). Once per Long Rest, or by expending a spell slot.'),
          f('vigilantBlessing', 'Bênção Vigilante', 'Vigilant Blessing',
            'Ação Mágica: você ou uma criatura que você toca tem Vantagem na próxima jogada de Iniciativa (um alvo por vez).',
            'Magic action: you or a creature you touch has Advantage on its next Initiative roll (one target at a time).'),
          f('twilightSanctuary', 'Santuário do Crepúsculo', 'Twilight Sanctuary',
            `${cd('pt')}, ação Mágica: por 1 minuto, uma esfera de 9 m (30 pés) de penumbra centrada em você o acompanha. Quem você escolher e terminar o turno nela recebe 1d6 + seu nível de clérigo em PV temporários ou encerra em si a condição Enfeitiçado ou Amedrontado.`,
            `${cd('en')}, Magic action: for 1 minute, a 30-foot sphere of dim light centered on you moves with you. A creature of your choice that ends its turn in it gains 1d6 + your Cleric level Temporary Hit Points or ends the Charmed or Frightened condition on itself.`),
        ],
        6: [f('stepsOfNight', 'Passos da Noite', 'Steps of Night',
          'Ação Bônus, em penumbra ou escuridão: ganhe deslocamento de voo igual ao seu deslocamento por 1 minuto. Usos: bônus de proficiência por Descanso Longo.',
          'Bonus Action, while in dim light or darkness: gain a Fly Speed equal to your Speed for 1 minute. Uses: Proficiency Bonus per Long Rest.')],
        17: [f('twilightShroud', 'Mortalha do Crepúsculo', 'Twilight Shroud',
          'Você e seus aliados têm Meia Cobertura enquanto estiverem no Santuário do Crepúsculo.',
          'You and your allies have Half Cover while in your Twilight Sanctuary.')],
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
