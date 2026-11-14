// Nomes em inglês dos traços de classe que só tinham o nome em português (a ficha em
// inglês mostrava "Conjuração", "Infundir Item"…). Nomes oficiais (fatos); os textos curtos
// em inglês são resumos próprios, iguais aos resumos em português que já existiam.
// Usado por src/sheet/feature-placement.js (placeFeatures). Chave: `classe:id` ou `id`.
export const FEATURE_NAME_EN = {
  // Artífice (2014)
  'artificer:spellcasting': 'Spellcasting', 'rogue:spellcasting': 'Spellcasting', magicalTinkering: 'Magical Tinkering', infuseItem: 'Infuse Item',
  artificerSpecialist: 'Artificer Specialist', rightTool: 'The Right Tool for the Job', toolExpertise: 'Tool Expertise',
  flashOfGenius: 'Flash of Genius', magicItemAdept: 'Magic Item Adept', spellStoringItem: 'Spell-Storing Item',
  magicItemSavant: 'Magic Item Savant', magicItemMaster: 'Magic Item Master', soulOfArtifice: 'Soul of Artifice',
  alchemistTools: 'Tool Proficiency', artilleristTools: 'Tool Proficiency', experimentalElixir: 'Experimental Elixir',
  alchemicalSavant: 'Alchemical Savant', restorativeReagents: 'Restorative Reagents', chemicalMastery: 'Chemical Mastery',
  arcaneArmor: 'Arcane Armor', armorModifications: 'Armor Modifications', perfectedArmor: 'Perfected Armor',
  'artificer:extraAttack': 'Extra Attack', 'bard:extraAttack': 'Extra Attack',
  eldritchCannon: 'Eldritch Cannon', arcaneFirearm: 'Arcane Firearm', explosiveCannon: 'Explosive Cannon',
  fortifiedPosition: 'Fortified Position', battleReady: 'Battle Ready', steelDefender: 'Steel Defender',
  arcaneJolt: 'Arcane Jolt', improvedDefender: 'Improved Defender',
  // Bardo (Valor)
  combatProficiencies: 'Bonus Proficiencies', combatInspiration: 'Combat Inspiration', battleMagic: 'Battle Magic',
  // Clérigo (Conhecimento, Luz)
  blessingsOfKnowledge: 'Blessings of Knowledge', knowledgeOfAges: 'Channel Divinity: Knowledge of the Ages',
  readThoughts: 'Channel Divinity: Read Thoughts', visionsOfPast: 'Visions of the Past',
  wardingFlare: 'Warding Flare', radianceOfDawn: 'Channel Divinity: Radiance of the Dawn',
  improvedFlare: 'Improved Flare', potentSpellcasting: 'Potent Spellcasting', coronaOfLight: 'Corona of Light',
  // Druida (Lua, Sonhos, Esporos, Estrelas, Fogo Selvagem)
  combatWildShape: 'Combat Wild Shape', circleForms: 'Circle Forms', moonPrimalStrike: 'Primal Strike',
  elementalWildShape: 'Elemental Wild Shape', thousandForms: 'Thousand Forms',
  balmOfSummer: 'Balm of the Summer Court', hearthOfMoonlight: 'Hearth of Moonlight and Shadow',
  hiddenPaths: 'Hidden Paths', walkerInDreams: 'Walker in Dreams',
  haloOfSpores: 'Halo of Spores', symbioticEntity: 'Symbiotic Entity', fungalInfestation: 'Fungal Infestation',
  spreadingSpores: 'Spreading Spores', fungalBody: 'Fungal Body',
  starMap: 'Star Map', starryForm: 'Starry Form', cosmicOmen: 'Cosmic Omen',
  twinklingConstellations: 'Twinkling Constellations', fullOfStars: 'Full of Stars',
  wildfireSpirit: 'Summon Wildfire Spirit', enhancedBond: 'Enhanced Bond', cauterizingFlames: 'Cauterizing Flames',
  blazingRevival: 'Blazing Revival',
  // Guerreiro (Mestre de Batalha)
  combatSuperiority: 'Combat Superiority', studentOfWar: 'Student of War', knowYourEnemy: 'Know Your Enemy',
  improvedSuperiority10: 'Improved Combat Superiority (d10)', improvedSuperiority18: 'Improved Combat Superiority (d12)',
  superiorityDice5: 'Combat Superiority (5 dice)', superiorityDice6: 'Combat Superiority (6 dice)', relentless: 'Relentless',
  // Monge, Ladino, Mago, Bruxo
  ki: 'Ki',
  mageHandLegerdemain: 'Mage Hand Legerdemain', magicalAmbush: 'Magical Ambush', versatileTrickster: 'Versatile Trickster',
  spellThief: 'Spell Thief', bonusProficiencies: 'Bonus Proficiencies', assassinate: 'Assassinate',
  infiltrationExpertise: 'Infiltration Expertise', impostor: 'Impostor', deathStrike: 'Death Strike',
  swashbuckler_9_0: 'Panache', panache: 'Panache',
  divinationSavant: 'Divination Savant', portent: 'Portent', expertDivination: 'Expert Divination',
  theThirdEye: 'The Third Eye', greaterPortent: 'Greater Portent',
  hexblade_curse: "Hexblade's Curse", hexWarrior: 'Hex Warrior', accursedSpecter: 'Accursed Specter',
  armorOfHexes: 'Armor of Hexes', masterOfHexes: 'Master of Hexes',
};

// Nome em português que estava em inglês.
export const FEATURE_NAME_PT = { hexWarrior: 'Guerreiro do Malefício' };

// Resumos próprios em inglês dos traços que só tinham o resumo em português.
export const FEATURE_DESC_EN = {
  moonPrimalStrike: 'Your attacks in beast form count as magical for overcoming resistance and immunity.',
  impostor: 'After 3 hours of observing someone, you can mimic their speech, writing and behavior flawlessly.',
  improvedSuperiority10: 'Your superiority dice become d10s; learn 2 more maneuvers.',
  improvedSuperiority18: 'Your superiority dice become d12s.',
  radianceOfDawn: 'Channel Divinity: dispel magical darkness; creatures within 30 ft make a CON save or take 2d10 + cleric level radiant damage.',
  combatProficiencies: 'Medium armor, shields and martial weapons.',
  balmOfSummer: 'Pool of d6s equal to your druid level (long rest). Bonus action: spend up to half your level in dice on a creature within 120 ft; it heals the total and gains 1 temporary HP per die.',
  knowledgeOfAges: 'Channel Divinity: proficiency in any skill or tool for 10 minutes.',
  hearthOfMoonlight: 'At the start of a short or long rest: a 30-ft sphere grants +5 to Stealth and Perception and hides light from inside.',
  hexblade_curse: 'Bonus action: curse a creature within 30 ft. +PB damage against it, crits on 19–20, and you regain HP when it dies.',
  visionsOfPast: 'Once per short rest: meditate up to 1 minute per WIS to see the past of an object or place.',
  superiorityDice5: '5 superiority dice; learn 2 more maneuvers.',
  superiorityDice6: '6 superiority dice; learn 2 more maneuvers.',
};

export const featureNameEn = (classId, id) => FEATURE_NAME_EN[`${classId}:${id}`] || FEATURE_NAME_EN[id] || null;
