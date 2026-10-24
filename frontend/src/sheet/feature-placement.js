/**
 * Onde cada traço de classe aparece na ficha. Pedido do dono: os traços acumulados
 * ficam ao longo da ficha, junto do que tratam (magias com as magias, truques com os
 * truques, Fúria junto das gemas da Fúria…); o índice completo continua no painel de
 * Progressão. Só apresentação: nenhuma regra de jogo muda aqui. Funções puras (Node).
 *
 * Lugares (PLACES) e onde eles ficam (PLACE_INFO):
 *   spells        aba Magias, na seção da classe (Conjuração, magias sempre preparadas…)
 *   cantrips      aba Magias, logo acima dos truques
 *   attacks       aba Jogar, painel Ataques
 *   defense       aba Jogar, embaixo dos medalhões (CA, iniciativa, salvaguardas, resistências)
 *   movement      aba Jogar, embaixo dos medalhões (deslocamento)
 *   resources     aba Jogar, embaixo da linha do recurso que ele usa (gemas da Fúria,
 *                 Canalizar Divindade…) ou no painel da Forma Selvagem; sem a linha, no fim
 *                 do painel de recursos
 *   skills        aba Atributos, painel Perícias
 *   proficiencies aba Atributos, painel Idiomas e Outras Proficiências
 *   items         aba Inventário, painel Equipamento (infusões, sintonia, itens replicados)
 *   other         aba Atributos, painel Outros traços
 *   meta          só no índice (Subclasse de X, Aumento no Valor de Atributo, Dádiva Épica)
 *
 * Como o lugar é escolhido (placeOf):
 *   1. CONTEXT_PLACES: o mesmo id com outro sentido numa classe ou numa regra
 *      ('monk:touchOfDeath', '2014:favoredEnemy').
 *   2. BY_PICK: depende da escolha de classe (Ordem Divina Taumaturgo → truques;
 *      Protetor → proficiências).
 *   3. PLACE_IDS: o mapa por id (a classe ali só organiza a leitura). O teste
 *      tests/feature-placement.test.js roda computeProgression em todas as classes e
 *      subclasses (2014 e 2024, nível 20) e falha se aparecer id fora deste mapa.
 *   4. Id desconhecido (dado novo, homebrew): palavras-chave do nome em inglês (KEYWORDS).
 * Traços de recurso: ANCHOR_IDS diz a linha (id do recurso em data/class-options/, com ou
 * sem o sufixo 2014/Legacy, da mesma classe); sem âncora, o próprio id do traço.
 *
 * Escolhas de classe (invocações, metamagia, manobras…) vão dentro do traço que as
 * concede (POOL_PARENTS); sem esse traço na ficha, no lugar de STANDALONE_POOLS
 * (ferramentas e instrumentos no painel de proficiências) ou no painel Outros traços.
 */
import { computeProgression } from '../progression/engine.js';
import { computeResources } from '../progression/resources.js';
import { findOption, optionPool } from '../progression/options.js';
import { pickLabel } from '../progression/options-catalog.js';
import { CLASS_OPTIONS } from '../../data/class-options/index.js';
import { t, tName } from '../../data/i18n.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean);

export const PLACES = ['spells', 'cantrips', 'attacks', 'defense', 'movement', 'resources', 'skills', 'proficiencies', 'items', 'other', 'meta'];

// Aba e seção de cada lugar (o índice mostra "→ aba Magias · truques").
export const PLACE_INFO = {
  spells: { tab: 'spells', pt: '', en: '' }, // a seção da classe: "aba Magias" basta
  cantrips: { tab: 'spells', pt: 'truques', en: 'cantrips' },
  attacks: { tab: 'play', pt: 'ataques', en: 'attacks' },
  defense: { tab: 'play', pt: 'defesa', en: 'defense' },
  movement: { tab: 'play', pt: 'movimento', en: 'movement' },
  resources: { tab: 'play', pt: 'recursos', en: 'resources' },
  skills: { tab: 'stats', pt: 'perícias', en: 'skills' },
  proficiencies: { tab: 'stats', pt: 'proficiências', en: 'proficiencies' },
  items: { tab: 'inv', pt: 'equipamento', en: 'equipment' },
  other: { tab: 'stats', pt: 'outros traços', en: 'other features' },
  meta: { tab: null, pt: 'só no índice', en: 'index only' },
};
const TAB_KEY = { play: 'tabPlay', stats: 'tabStats', spells: 'tabSpells', inv: 'tabInv' };

// Rótulo curto da lista de traços em cada seção da ficha.
export const PLACE_LABEL = {
  spells: { pt: 'Traços de magia', en: 'Spell features' },
  cantrips: { pt: 'Traços dos truques', en: 'Cantrip features' },
  attacks: { pt: 'Traços de ataque', en: 'Attack features' },
  defense: { pt: 'Traços de defesa', en: 'Defense features' },
  movement: { pt: 'Traços de movimento', en: 'Movement features' },
  resources: { pt: 'Outros traços de recurso', en: 'Other resource features' },
  skills: { pt: 'Traços de perícia', en: 'Skill features' },
  proficiencies: { pt: 'Traços de proficiência', en: 'Proficiency features' },
  items: { pt: 'Traços de itens', en: 'Item features' },
  other: { pt: 'Outros traços', en: 'Other features' },
};

// Lugar → classe → ids (separados por espaço). A classe só organiza a leitura: o id vale
// em qualquer classe ('shared' = várias). Ids gerados (`war_1_0`) são os das subclasses do
// catálogo expandido (rules.js: `${sub}_${nível}_${i}`).
const PLACE_IDS = {
  spells: {
    shared: `
      spellBreaker spellcasting`,
    artificer: `
      alchemicalSavant arcaneFirearm guidedPrecision`,
    barbarian: `
      animalSpeaker natureSpeaker spiritSeeker spiritWalker totem_10_0 totem_3_0`,
    bard: `
      additionalMagicalSecrets magicalDiscoveries magicalSecrets spiritualFocus wordsOfCreation`,
    cleric: `
      arcanaDomainSpells arcaneMastery blessedHealer circleOfMortality deathDomainSpells discipleOfLife
      forgeDomainSpells graveDomainSpells improvedReaper inescapableDestruction knowledgeDomainSpells
      lifeDomainSpells lightDomainSpells natureDomainSpells orderDomainSpells peaceDomainSpells
      pestilenceDomainSpells supremeHealing tempestDomainSpells trickeryDomainSpells twilightDomainSpells
      voiceOfAuthority warDomainSpells`,
    druid: `
      circleOfTheLandSpells circleSpells enhancedBond mightySummoner moonCircleSpells seaCircleSpells
      sporesCircleSpells thousandForms titanCircleSpells wildCompanion wildfireCircleSpells`,
    fighter: `
      eldritchknight_18_0 eldritchknight_3_0 improvedWarMagic`,
    monk: `
      shadowArts shadow_3_0`,
    paladin: `
      oathOfConquestSpells oathOfDevotionSpells oathOfGlorySpells oathOfRedemptionSpells
      oathOfTheAncientsSpells oathOfTheCrownSpells oathOfTheWatchersSpells oathOfVengeanceSpells
      oathbreakerSpells`,
    ranger: `
      beastmaster_15_0 feyWandererSpells gloomStalkerSpells horizonWalkerMagic monsterSlayerMagic
      primevalAwareness relentlessHunter shareSpells swarmkeeperMagic`,
    rogue: `
      magicalAmbush`,
    sorcerer: `
      abyssalConduit abyssalRealm clockworkSpells controlledChaos demonicSpells divineMagic divine_1_0
      divine_6_0 draconicSpells elementalAffinity empoweredHealing eyesOfTheDark fontOfMagic
      heartOfTheStorm psionicSpells wildMagicSurge wildmagic_14_0 wildmagic_18_0 wildmagic_1_0`,
    warlock: `
      archfeySpells bewitchingMagic celestialSpells createThrall eldritchHex eldritchInvocations
      fathomlessSpells fiendSpells genieSpells greatOldOneSpells hexbladeSpells mysticArcanum6
      mysticArcanum7 mysticArcanum8 mysticArcanum9 mysticArcanumLevel6Spell mysticArcanumLevel7Spell
      mysticArcanumLevel8Spell mysticArcanumLevel9Spell pactBoon pactMagic psychicSpells radiantSoul
      undeadSpells undyingSpells`,
    wizard: `
      abjurationSavant abjuration_10_0 abjuration_2_0 alterMemories arcaneRecovery conjurationSavant
      divinationSavant durableSummons empoweredEvocation enchantmentSavant evocationSavant
      expertDivination focusedConjuration gravityWell grimHarvest illusionSavant illusion_14_0
      illusion_2_0 illusion_6_0 illusoryReality memorizeSpell minorConjuration necromancySavant
      necromancy_2_0 necromancy_2_1 necromancy_6_0 overchannel ritualAdept sculptSpells signatureSpells
      spellMastery spellbook splitEnchantment transmutationSavant transmutation_2_0 undeadThralls
      wizardlyQuill`,
  },
  cantrips: {
    barbarian: `
      giantPower`,
    bard: `
      guidingWhispers`,
    cleric: `
      acolyteOfNature arcaneInitiate potentSpellcasting reaper`,
    druid: `
      bonusCantrip`,
    fighter: `
      eldritchknight_7_0 warMagic`,
    monk: `
      manipulateElements`,
    ranger: `
      draconicGift`,
    rogue: `
      mageHandLegerdemain versatileTrickster`,
    sorcerer: `
      moonFire`,
    warlock: `
      amongTheDead`,
    wizard: `
      illusion_2_1 improvedIllusions potentCantrip`,
  },
  attacks: {
    shared: `
      extraAttack fightingStyle psychicBlades weaponMastery`,
    artificer: `
      battleReady improvedDefender steelDefender`,
    barbarian: `
      batteringRoots brutalCritical brutalCritical2 brutalCritical3 brutalStrike improvedBrutalStrike13
      improvedBrutalStrike17 recklessAbandon recklessAttack retaliation`,
    bard: `
      battleMagic bladeFlourish mastersFlourish swordsFightingStyle`,
    cleric: `
      blessedStrikes divineStrike improvedBlessedStrikes ordersWrath tempest_6_0 tempest_8_0
      thunderboltStrike trickery_8_0 war_8_0`,
    druid: `
      elementalFury improvedElementalFury`,
    fighter: `
      additionalFightingStyle champion_10_0 curvingShot devilsMisfortune eldritchStrike
      eldritchknight_10_0 eldritchknight_3_1 ferociousCharger hellForgedWeapon holdTheLine
      improvedCritical legionOfOne magicArrow manifestEcho rapidStrike studiedAttacks superiorCritical
      tacticalMaster threeExtraAttacks twoExtraAttacks vigilantDefender warBond`,
    monk: `
      armsOfTheAstralSelf awakenedAstralSelf draconicDisciple drunkenTechnique elementalAttunement
      elementalBurst elementalEpitome empoweredStrikes handOfHarm intoxicatedFrenzy kiEmpoweredStrikes
      martialArts oneWithTheBlade openHandTechnique pathOfTheKensei physiciansTouch quiveringPalm
      radiantSunBolt searingArcStrike searingSunburst shadow_17_0 sharpenTheBlade stunningStrike
      touchOfTheLongDeath unerringAccuracy`,
    paladin: `
      auraOfHate divineSmite improvedDivineSmite paladinsSmite radiantStrikes relentlessAvenger
      smiteOfProtection soulOfVengeance vengeance_15_0 vengeance_7_0 vigilantRebuke`,
    ranger: `
      beastmaster_11_0 beastmaster_3_0 beastmaster_7_0 bestialFury distantStrike dreadAmbusher
      dreadfulStrikes exceptionalTraining foeSlayer gatheredSwarm huntersPrey mightySwarm multiattack
      planarWarrior preciseHunter primalCompanion slayersCounter slayersPrey stalkersFlurry
      superiorHuntersPrey`,
    rogue: `
      assassinate cunningStrike deathStrike deviousStrikes envenomWeapons eyeForWeakness
      improvedCunningStrike insightfulFighting masterOfTactics rakishAudacity sneakAttack soulBlades
      steadyAim suddenStrike`,
    sorcerer: `
      stormsFury`,
    warlock: `
      graveTouched hexWarrior`,
  },
  defense: {
    shared: `
      evasion unarmoredDefense`,
    artificer: `
      arcaneArmor armorModel armorModifications chemicalMastery`,
    barbarian: `
      battleragerArmor dangerSense feralInstinct spikedRetribution stormSoul`,
    bard: `
      dazzlingFootwork leadingEvasion`,
    cleric: `
      avatarOfBattle blightWeaver dampenElements saintOfForgeAndFire soulOfTheForge vigilantBlessing
      war_17_0`,
    druid: `
      fungalBody naturesWard`,
    fighter: `
      bornToTheSaddle guardedMind infernalEquipment survivor`,
    monk: `
      bodyOfTheAstralSelf deflectAttacks deflectEnergy deflectMissiles diamondSoul disciplinedSurvivor
      masteryOfDeath purityOfBody selfRestoration stillnessOfMind sunShield superiorDefense tipsySway
      tranquility`,
    paladin: `
      ancients_7_0 auraExpansion auraImprovements auraOfConquest auraOfCourage auraOfDevotion
      auraOfProtection auraOfTheGuardian auraOfTheSentinel auraOfWarding divineAllegiance divineHealth
      emissaryOfRedemption protectiveSpirit purityOfSpirit scornfulRebuke supernaturalResistance
      unyieldingSpirit`,
    ranger: `
      beguilingTwist defensiveTactics ironMind shadowyDodge spectralDefense superiorHuntersDefense
      supernaturalDefense`,
    rogue: `
      ambushMaster elusive misdirection slipperyMind soulOfDeceit uncannyDodge`,
    sorcerer: `
      draconicResilience psychicDefenses`,
    warlock: `
      archfey_10_0 celestialResilience darkOnesBlessing fiendishResilience greatoldone_10_0 oceanicSoul
      thoughtShield`,
    wizard: `
      abjuration_14_0 arcaneDeflection deflectingShroud durableMagic instinctiveCharm inuredToUndeath
      necromancy_10_0 spellResistance tacticalWit temporalAwareness`,
  },
  movement: {
    shared: `
      landsStride stormborn`,
    artificer: `
      ingeniousMovement`,
    barbarian: `
      bestialSoul fastMovement instinctivePounce`,
    cleric: `
      tempest_17_0`,
    monk: `
      acrobaticMovement fleetStep improvedShadowStep shadowStep shadow_6_0 slowFall strideOfTheElements
      unarmoredMovement unarmoredMovementImproved`,
    paladin: `
      auraOfAlacrity`,
    ranger: `
      roving`,
    rogue: `
      cunningAction fancyFootwork secondStoryWork skirmisher superiorMobility`,
    sorcerer: `
      divine_14_0 otherworldlyWings shadowWalk tempestuousMagic`,
    warlock: `
      giftOfTheSea`,
  },
  skills: {
    shared: `
      expertise`,
    barbarian: `
      indomitableMight primalKnowledge`,
    bard: `
      jackOfAllTrades silverTongue`,
    cleric: `
      blessingsOfKnowledge implementOfPeace`,
    fighter: `
      arcaneArcherLore bonusProficiency elegantCourtier remarkableAthlete royalEnvoy`,
    ranger: `
      deftExplorer favoredEnemy3 favoredEnemyImprovement hideInPlainSight naturalExplorer naturalExplorer3
      otherworldlyGlamour vanish`,
    rogue: `
      earForDeceit elegantManeuver eyeForDetail impostor infiltrationExpertise insightfulManipulator
      panache reliableTalent steadyEye supremeSneak survivalist whispersOfTheDead`,
    wizard: `
      scholar`,
  },
  proficiencies: {
    shared: `
      bonusProficiencies`,
    artificer: `
      alchemistTools artilleristTools rightTool toolExpertise toolsOfTheTrade`,
    bard: `
      combatProficiencies martialTraining swordsProficiencies`,
    cleric: `
      deathBonusProficiency forgeBonusProficiencies heavyArmorProficiency natureBonusProficiency
      orderBonusProficiencies tempestBonusProficiencies twilightBonusProficiencies`,
    druid: `
      druidic speechOfTheWoods`,
    fighter: `
      diabolicalGift studentOfWar`,
    monk: `
      drunkenBonusProficiencies implementsOfMercy tongueOfSunAndMoon`,
    rogue: `
      assassinsTools masterOfIntrigue thievesCant`,
    sorcerer: `
      windSpeaker`,
    wizard: `
      trainingInWarAndSong`,
  },
  items: {
    artificer: `
      advancedArtifice adventurersAtlas armorReplication infuseItem magicItemAdept magicItemMaster
      magicItemSavant magicItemTinker replicateMagicItem soulOfArtifice`,
    rogue: `
      useMagicDevice`,
  },
  resources: {
    shared: `
      channelDivinity guidedStrike psionicPower touchOfDeath`,
    artificer: `
      arcaneJolt eldritchCannon experimentalElixir explosiveCannon flashOfGenius fortifiedPosition
      mappingMagic perfectedArmor restorativeReagents spellStoringItem superiorAtlas tinkersMagic`,
    barbarian: `
      ancestralProtectors battleragerCharge bolsteringMagic branchesOfTheTree callTheHunt
      consultTheSpirits controlledSurge demiurgicColossus divineFury elementalCleaver fanaticalFocus
      formOfTheBeast frenzy giantsHavoc infectiousFury intimidatingPresence magicAwareness mightyImpel
      mindlessRage persistentRage powerOfTheWilds rage rageOfTheGods rageOfTheWilds ragingStorm
      relentlessRage shieldingStorm spiritShield stormAura totemSpirit totem_14_0 totem_3_1
      totemicAttunement travelAlongTheTree unstableBacklash vengefulAncestors vitalityOfTheTree
      warriorOfTheGods wildSurge zealousPresence`,
    bard: `
      animatingPerformance bardicDieD12 bardicInspiration bardicInspirationD10 bardicInspirationD12
      bardicInspirationD8 beguilingMagic combatInspiration creativeCrescendo cuttingWords
      fontOfInspiration glamour_14_0 glamour_3_0 glamour_3_1 glamour_6_0 infectiousInspiration
      inspiringMovement mantleOfInspiration mantleOfMajesty mantleOfWhispers moteOfPotential
      mysticalConnection peerlessSkill performanceOfCreation shadowLore spiritSession superiorInspiration
      talesFromBeyond tandemFootwork unbreakableMajesty unfailingInspiration universalSpeech
      unsettlingWords wordsOfTerror`,
    cleric: `
      arcaneAbjuration artisansBlessing balmOfPeace blessingOfTheForge channelDivinity2 channelDivinity3
      charmAnimalsAndPlants coronaOfLight destroyUndead destructiveWrath divineIntervention
      divineInterventionImproved divineSpark embodimentOfTheLaw emboldeningBond expansiveBond eyesOfNight
      eyesOfTheGrave greaterDivineIntervention improvedDuplicity improvedFlare improvedWardingFlare
      invokeDuplicity knowledgeOfAges knowledgeOfTheAges masterOfNature ordersDemand pathToTheGrave
      plagueBlessing preserveLife protectiveBond radianceOfDawn radianceOfTheDawn readThoughts searUndead
      sentinelAtDeathsDoor stepsOfNight tempest_1_0 tempest_2_0 trickery_17_0 trickery_2_0 trickery_6_0
      trickstersTransposition turnUndead twilightSanctuary twilightShroud verminForm virulentBurst
      visionsOfPast visionsOfThePast warGodsBlessing warPriest war_1_0 war_2_0 war_6_0 wardingFlare
      wrathOfTheStorm`,
    druid: `
      aquaticAffinity archdruid balmOfSummer beastSpells blazingRevival cauterizingFlames circleForms
      combatWildShape cosmicOmen direImpact elementalWildShape faithfulSummons fullOfStars
      fungalInfestation guardianSpirit hiddenPaths improvedCircleForms landsAid lunarForm
      monstrousAppetite moonPrimalStrike moonlightStep naturalRecovery naturesSanctuary oceanicGift
      primalHavoc spiritTotem spreadingSpores starMap starryForm symbioticEntity titanForms
      twinklingConstellations walkerInDreams wildResurgence wildShape wildfireSpirit wrathOfTheSea`,
    fighter: `
      actionSurge actionSurge2 actionSurgeOneUse actionSurgeTwoUses advancedWounds arcaneCharge arcaneShot
      bulwark bulwarkOfForce combatSuperiority eldritchknight_15_0 everReadyShot fightingSpirit
      giantsMight greatStature hellfireSurge improvedCombatSuperiority improvedInspiringSurge
      improvedShots improvedSuperiority10 improvedSuperiority18 indomitable indomitable2 indomitable3
      indomitableOneUse indomitableThreeUses indomitableTwoUses infernalBargain infernalWound
      inspiringSurge knowYourEnemy protectiveField psionicStrike rallyingCry reclaimPotential relentless
      runicJuggernaut runicShield secondWind shadowMartyr strengthBeforeDeath superiorityDice5
      superiorityDice6 tacticalMind tacticalShift telekineticAdept telekineticMaster telekineticMovement
      tirelessSpirit ultimateCombatSuperiority unleashIncarnation unwaveringMark wardingManeuver`,
    monk: `
      ascendantAspect aspectOfTheWyrm breathOfTheDragon discipleOfTheElements drunkardsLuck emptyBody
      extraElementalDiscipline11 extraElementalDiscipline17 extraElementalDiscipline6
      flurryOfHealingAndHarm fourelements_11_0 fourelements_17_0 fourelements_3_0 fourelements_6_0
      handOfHealing handOfUltimateMercy heightenedFocus ki monksFocus perfectFocus perfectSelf
      uncannyMetabolism wholenessOfBody wingsUnfurled`,
    paladin: `
      abjureFoes abjureTheExtraplanar ancients_15_0 ancients_20_0 ancients_3_0 ancients_3_1
      avengingAngel championChallenge cleansingTouch conqueringPresence controlUndead divineSense
      dreadLord dreadfulAspect elderChampion emissaryOfPeace exaltedChampion faithfulSteed
      gloriousDefense holyNimbus inspiringSmite invincibleConqueror layOnHands livingLegend
      mortalBulwark naturesWrath peerlessAthlete rebukeTheViolent restoringTouch sacredWeapon
      turnTheTide turnUnholy undyingSentinel vengeance_20_0 vengeance_3_0 vengeance_3_1 vowOfEnmity
      watchersWill`,
    ranger: `
      bondOfFangAndScale detectPortal drakeCompanion drakesBreath etherealStep favoredEnemy
      feyReinforcements huntersSense magicUsersNemesis mistyWanderer naturesVeil perfectedBond
      swarmingDispersal tireless writhingTide`,
    rogue: `
      deathsFriend ghostWalk masterDuelist psychicVeil rendMind spellThief strokeOfLuck unerringEye
      wailsFromTheGrave`,
    sorcerer: `
      abyssalExplosion abyssalRupture arcaneApotheosis bastionOfLaw bendLuck clockworkCavalcade
      divine_18_0 divine_1_1 draconicPresence dragonCompanion dragonWings favoredByTheGods houndOfIllOmen
      innateSorcery lunarBoons lunarEmbodiment lunarPhenomenon metamagic psionicSorcery restoreBalance
      revelationInFlesh sorcerousRestoration sorceryIncarnate strengthOfTheGrave tamedSurge tidesOfChaos
      tranceOfOrder umbralForm unearthlyRecovery warpingImplosion waxingAndWaning wildmagic_1_1
      wildmagic_6_0 windSoul`,
    warlock: `
      accursedSpecter archfey_14_0 archfey_1_0 archfey_6_0 armorOfHexes beguilingDefenses
      clairvoyantCombatant contactPatron darkOnesOwnLuck defyDeath eldritchMaster elementalGift
      fathomlessPlunge formOfDread geniesVessel graspingTentacles greatoldone_6_0 guardianCoil
      healingLight hexblade_curse hexbladesCurse hurlThroughHell indestructibleLife limitedWish
      magicalCunning masterOfHexes mistyEscape necroticHusk sanctuaryVessel searingVengeance
      spiritProjection stepsOfTheFey tentacleOfTheDeeps`,
    wizard: `
      abjuration_2_1 abjuration_6_0 arcaneAbeyance arcaneWard awakenedSpellbook benignTransposition
      bladesong chronalShift eventHorizon greaterPortent illusion_10_0 illusorySelf manifestMind
      masterScrivener momentaryStasis oneWithTheWord phantasmalCreatures portent powerSurge projectedWard
      shapechanger songOfDefense songOfVictory theThirdEye transmutation_10_0 violentAttraction`,
  },
  meta: {
    shared: `
      abilityScoreImprovement epicBoon`,
    artificer: `
      artificerSpecialist artificerSubclass`,
    barbarian: `
      barbarianSubclass`,
    bard: `
      bardSubclass`,
    cleric: `
      clericSubclass`,
    druid: `
      druidSubclass`,
    fighter: `
      fighterSubclass`,
    monk: `
      monkSubclass`,
    paladin: `
      paladinSubclass`,
    ranger: `
      rangerSubclass`,
    rogue: `
      rogueSubclass`,
    sorcerer: `
      sorcererSubclass`,
    warlock: `
      warlockSubclass`,
    wizard: `
      wizardSubclass`,
  },
  other: {
    shared: `
      timelessBody`,
    artificer: `
      magicalTinkering`,
    barbarian: `
      aspectOfTheBeast aspectOfTheWilds primalChampion totem_6_0`,
    bard: `
      countercharm songOfRest`,
    cleric: `
      blessingOfTheTrickster divineOrder keeperOfSouls trickery_1_0`,
    druid: `
      haloOfSpores hearthOfMoonlight primalOrder`,
    fighter: `
      echoAvatar heroicWarrior masterOfRunes runeCarver`,
    monk: `
      bodyAndMind cloakOfShadows hourOfReaping shadow_11_0 visageOfTheAstralSelf`,
    ranger: `
      feralSenses huntersLore umbralSight`,
    rogue: `
      blindsense fastHands thiefsReflexes tokensOfTheDeparted`,
    sorcerer: `
      dragonAncestor lunarEmpowerment stormGuide telepathicSpeech`,
    warlock: `
      awakenedMind greatoldone_14_0 greatoldone_1_0 undyingNature`,
    wizard: `
      adjustDensity commandUndead convergentFuture hypnoticGaze masterTransmuter minorAlchemy
      necromancy_14_0 transmutation_14_0 transmutation_2_1 transmutation_6_0 transmutersStone`,
  },
};

// Traços de recurso que ficam embaixo de OUTRA linha (a do recurso que eles usam):
// 'rage' = gemas da Fúria; 'a|b' = a primeira que existir na ficha; 'wildShape' = painel
// da Forma Selvagem. Os demais traços de recurso usam o próprio id.
const ANCHOR_IDS = {
  'actionSurge': `
    actionSurge2 actionSurgeOneUse actionSurgeTwoUses arcaneCharge eldritchknight_15_0 hellfireSurge
    improvedInspiringSurge inspiringSurge`,
  'arcaneShot': `
    everReadyShot improvedShots`,
  'arcaneWard': `
    abjuration_2_1 abjuration_6_0 projectedWard`,
  'avengingAngel': `
    vengeance_20_0`,
  'bardicInspiration': `
    bardicDieD12 bardicInspirationD10 bardicInspirationD12 bardicInspirationD8 combatInspiration
    cuttingWords fontOfInspiration glamour_3_0 inspiringMovement mantleOfInspiration moteOfPotential
    mysticalConnection peerlessSkill superiorInspiration talesFromBeyond tandemFootwork
    unfailingInspiration unsettlingWords`,
  'bladesong': `
    songOfDefense songOfVictory`,
  'bottledRespite': `
    geniesVessel sanctuaryVessel`,
  'breathOfTheDragon': `
    ascendantAspect`,
  'channelDivinity': `
    abjureFoes abjureTheExtraplanar ancients_3_0 ancients_3_1 arcaneAbjuration artisansBlessing
    balmOfPeace championChallenge channelDivinity2 channelDivinity3 charmAnimalsAndPlants
    conqueringPresence controlUndead destroyUndead destructiveWrath divineSense divineSpark
    dreadfulAspect emissaryOfPeace guidedStrike improvedDuplicity inspiringSmite invokeDuplicity
    knowledgeOfAges knowledgeOfTheAges masterOfNature naturesWrath ordersDemand pathToTheGrave
    peerlessAthlete plagueBlessing preserveLife radianceOfDawn radianceOfTheDawn readThoughts
    rebukeTheViolent sacredWeapon searUndead tempest_2_0 touchOfDeath trickery_17_0 trickery_2_0
    trickery_6_0 trickstersTransposition turnTheTide turnUndead turnUnholy twilightSanctuary
    twilightShroud vengeance_3_0 vengeance_3_1 vowOfEnmity warGodsBlessing war_2_0 war_6_0
    watchersWill`,
  'darkDelirium': `
    archfey_14_0`,
  'divineIntervention': `
    divineInterventionImproved greaterDivineIntervention`,
  'drakeCompanion': `
    bondOfFangAndScale perfectedBond`,
  'elderChampion': `
    ancients_20_0`,
  'eldritchCannon': `
    explosiveCannon fortifiedPosition`,
  'eldritchMaster|magicalCunning': `
    eldritchMaster`,
  'elementalGiftFlight': `
    elementalGift`,
  'emboldeningBond': `
    expansiveBond protectiveBond`,
  'enthrallingPerformance': `
    glamour_3_1`,
  'entropicWard': `
    greatoldone_6_0`,
  'favoredByTheGods': `
    divine_1_1`,
  'feyPresence': `
    archfey_1_0`,
  'fightingSpirit': `
    tirelessSpirit`,
  'focusPoints|ki': `
    drunkardsLuck handOfHealing heightenedFocus monksFocus perfectFocus`,
  'freeFindSteed': `
    faithfulSteed`,
  'giantsMight': `
    greatStature runicJuggernaut`,
  'hexbladesCurse': `
    armorOfHexes hexblade_curse masterOfHexes`,
  'illusorySelf': `
    illusion_10_0`,
  'indomitable': `
    bulwark indomitable2 indomitable3 indomitableOneUse indomitableThreeUses indomitableTwoUses`,
  'infernalWound': `
    advancedWounds infernalBargain`,
  'innateSorcery': `
    abyssalRupture arcaneApotheosis sorceryIncarnate`,
  'ki|focusPoints': `
    discipleOfTheElements emptyBody extraElementalDiscipline11 extraElementalDiscipline17
    extraElementalDiscipline6 fourelements_11_0 fourelements_17_0 fourelements_3_0 fourelements_6_0
    perfectSelf`,
  'layOnHands': `
    restoringTouch`,
  'mantleOfMajesty': `
    glamour_6_0`,
  'mistyEscape': `
    archfey_6_0`,
  'mistyEscape|stepsOfTheFey': `
    mistyEscape`,
  'performanceOfCreation': `
    creativeCrescendo`,
  'persistentRage|rage': `
    persistentRage`,
  'portent': `
    greaterPortent`,
  'psiPoweredLeap': `
    telekineticAdept`,
  'psionicEnergy': `
    protectiveField psionicStrike`,
  'psionicEnergy|psionicEnergyDice': `
    psionicPower`,
  'rage': `
    ancestralProtectors battleragerCharge branchesOfTheTree controlledSurge demiurgicColossus divineFury
    elementalCleaver fanaticalFocus formOfTheBeast frenzy giantsHavoc mightyImpel mindlessRage
    powerOfTheWilds rageOfTheWilds ragingStorm relentlessRage shieldingStorm spiritShield stormAura
    totemSpirit totem_14_0 totem_3_1 totemicAttunement travelAlongTheTree unstableBacklash
    vengefulAncestors vitalityOfTheTree wildSurge`,
  'secondWind': `
    rallyingCry tacticalMind tacticalShift`,
  'shapechanger': `
    transmutation_10_0`,
  'sorcerousRestoration|sorceryPoints': `
    sorcerousRestoration`,
  'sorceryPoints': `
    bastionOfLaw bendLuck draconicPresence houndOfIllOmen metamagic psionicSorcery revelationInFlesh
    umbralForm waxingAndWaning wildmagic_6_0`,
  'spiritTotem': `
    guardianSpirit`,
  'starMapGuidingBolt': `
    starMap`,
  'superiorAtlasFindThePath': `
    superiorAtlas`,
  'superiorityDice': `
    combatSuperiority improvedCombatSuperiority improvedSuperiority10 improvedSuperiority18 relentless
    superiorityDice5 superiorityDice6 ultimateCombatSuperiority`,
  'tentacleOfTheDeeps': `
    guardianCoil`,
  'tidesOfChaos': `
    wildmagic_1_1`,
  'unbreakableMajesty': `
    glamour_14_0`,
  'undyingSentinel': `
    ancients_15_0`,
  'unearthlyRecovery': `
    divine_18_0`,
  'visionsOfThePast': `
    visionsOfPast`,
  'wailsFromTheGrave': `
    deathsFriend`,
  'warPriest': `
    war_1_0`,
  'wardingFlare': `
    improvedFlare improvedWardingFlare`,
  'wildShape': `
    aquaticAffinity archdruid beastSpells circleForms combatWildShape direImpact elementalWildShape
    fullOfStars improvedCircleForms landsAid lunarForm monstrousAppetite moonPrimalStrike
    naturesSanctuary oceanicGift primalHavoc spreadingSpores starryForm symbioticEntity titanForms
    twinklingConstellations wildShape wildfireSpirit wrathOfTheSea`,
  'wrathOfTheStorm': `
    tempest_1_0`,
};

// Mesmo id, outro sentido: '<classe>:<id>' ou '<regra>:<id>' (vale antes do mapa).
const CONTEXT_PLACES = {
  'bard:bonusProficiencies': 'skills', // bardo do Conhecimento: 3 perícias (o do assassino é kit)
  'druid:stormborn': 'resources', // Círculo do Mar: voo com a Ira do Mar (Forma Selvagem)
  'monk:touchOfDeath': 'defense', // Longa Morte: PV temporários (o do clérigo é Canalizar Divindade)
  '2014:favoredEnemy': 'skills', // 2014: rastrear e idioma (2024: Marca do Caçador grátis)
  '2014:knowYourEnemy': 'other', // 2014: observar 1 min (2024: tem usos)
  '2014:dragonWings': 'movement', // 2014: voo permanente (2024: tem uso)
  '2014:intimidatingPresence': 'other', // 2014: ação sem usos contados
  '2014:coronaOfLight': 'spells', // 2014: ação sem usos contados
  '2014:divineSense': 'other', // 2014: 1 + CAR usos próprios (2024: opção de Canalizar Divindade)
};
const CONTEXT_ANCHORS = { 'druid:stormborn': ['wildShape'] };

// Lugar pela escolha de classe: { traço: [pool, { opção: lugar }] }.
const BY_PICK = {
  divineOrder: ['divineOrder', { thaumaturge: 'cantrips', protector: 'proficiencies' }],
  primalOrder: ['primalOrder', { magician: 'cantrips', warden: 'proficiencies' }],
  blessedStrikes: ['blessedStrikes', { divineStrike: 'attacks', potentSpellcasting: 'cantrips' }],
  improvedBlessedStrikes: ['blessedStrikes', { divineStrike: 'attacks', potentSpellcasting: 'cantrips' }],
  elementalFury: ['elementalFury', { primalStrike: 'attacks', potentSpellcasting: 'cantrips' }],
  improvedElementalFury: ['elementalFury', { primalStrike: 'attacks', potentSpellcasting: 'cantrips' }],
  // Paladino/patrulheiro: Guerreiro Abençoado/Druídico troca o estilo por 2 truques.
  fightingStyle: ['fightingStyle', { blessedWarrior: 'cantrips', druidicWarrior: 'cantrips' }],
};

// Escolhas de classe (pools de data/class-options/) → traço que as concede, por classe.
// A primeira que existir na ficha recebe as escolhas. STANDALONE_POOLS: não têm traço
// próprio (ficam soltas no lugar indicado lá).
const POOL_PARENTS = {
  artificer: {
    plan: 'replicateMagicItem', replicateItem: 'replicateMagicItem', infusion: 'infuseItem', armorModel: 'armorModel',
    specialistTools: 'toolsOfTheTrade alchemistTools artilleristTools arcaneArmor battleReady',
  },
  barbarian: {
    weaponMastery: 'weaponMastery', primalKnowledge: 'primalKnowledge', wildHeartAspect: 'aspectOfTheWilds',
    totemSpirit: 'totemSpirit totem_3_1', tigerAspectSkill: 'totemSpirit totem_3_1', totemAspect: 'aspectOfTheBeast totem_6_0',
    totemAttunement: 'totemicAttunement totem_14_0', stormEnvironment: 'stormAura', divineFuryType: 'divineFury',
    giantCantrip: 'giantPower', giantLanguage: 'giantPower',
  },
  bard: {
    expertise: 'expertise', loreSkill: 'bonusProficiencies', magicalDiscoveries: 'magicalDiscoveries',
    additionalMagicalSecrets: 'additionalMagicalSecrets', magicalSecrets2014: 'magicalSecrets', fightingStyle: 'swordsFightingStyle',
  },
  cleric: {
    divineOrder: 'divineOrder', thaumaturgeCantrip: 'divineOrder', blessedStrikes: 'blessedStrikes',
    knowledgeLanguage: 'blessingsOfKnowledge', knowledgeSkill: 'blessingsOfKnowledge', natureSkill: 'acolyteOfNature',
    natureCantrip: 'acolyteOfNature', reaperCantrip: 'reaper', arcanaCantrip: 'arcaneInitiate',
    arcaneMastery6: 'arcaneMastery', arcaneMastery7: 'arcaneMastery', arcaneMastery8: 'arcaneMastery', arcaneMastery9: 'arcaneMastery',
    orderSkill: 'orderBonusProficiencies', peaceSkill: 'implementOfPeace',
  },
  druid: {
    primalOrder: 'primalOrder', magicianCantrip: 'primalOrder', elementalFury: 'elementalFury', landBonusCantrip: 'bonusCantrip',
  },
  fighter: {
    fightingStyle: 'fightingStyle', weaponMastery: 'weaponMastery', maneuver: 'combatSuperiority',
    studentOfWarTool: 'studentOfWar', studentOfWarSkill: 'studentOfWar', arcaneShot: 'arcaneShot',
    arcaneArcherSkill: 'arcaneArcherLore', arcaneArcherCantrip: 'arcaneArcherLore', rune: 'runeCarver',
    cavalierProficiency: 'bonusProficiency', cavalierLanguage: 'bonusProficiency', samuraiProficiency: 'bonusProficiency',
    samuraiLanguage: 'bonusProficiency', samuraiSave: 'elegantCourtier', royalEnvoy: 'royalEnvoy', hellKnightSkill: 'diabolicalGift',
  },
  monk: {
    elementalDiscipline: 'discipleOfTheElements fourelements_3_0', kenseiWeapon: 'pathOfTheKensei',
    kenseiWeaponMelee: 'pathOfTheKensei', kenseiWeaponRanged: 'pathOfTheKensei', kenseiBrush: 'pathOfTheKensei',
    subclassProficiencies: 'implementsOfMercy drunkenBonusProficiencies', dragonLanguage: 'draconicDisciple',
  },
  paladin: { fightingStyle: 'fightingStyle', blessedWarriorCantrip: 'fightingStyle', weaponMastery: 'weaponMastery' },
  ranger: {
    fightingStyle: 'fightingStyle', druidicWarriorCantrip: 'fightingStyle', weaponMastery: 'weaponMastery',
    expertise: 'deftExplorer expertise', languages: 'deftExplorer favoredEnemy', favoredEnemy: 'favoredEnemy',
    favoredTerrain: 'naturalExplorer', huntersPrey: 'huntersPrey', defensiveTactics: 'defensiveTactics',
    hunterMultiattack: 'multiattack', superiorHuntersDefense: 'superiorHuntersDefense', primalCompanion: 'primalCompanion',
    ironMind: 'ironMind', otherworldlyGlamour: 'otherworldlyGlamour', swarmAppearance: 'gatheredSwarm', draconicEssence: 'drakeCompanion',
  },
  rogue: {
    expertise: 'expertise', expertise2014: 'expertise', language: 'thievesCant', weaponMastery: 'weaponMastery',
    mastermindLanguage: 'masterOfIntrigue', mastermindGamingSet: 'masterOfIntrigue', phantomWhispers: 'whispersOfTheDead',
  },
  sorcerer: {
    metamagic: 'metamagic', metamagic2014: 'metamagic', elementalAffinity: 'elementalAffinity',
    dragonAncestor: 'dragonAncestor draconicResilience', divineAffinity: 'divineMagic divine_1_0',
    psionicSpells1: 'psionicSpells', psionicSpells2: 'psionicSpells', psionicSpells3: 'psionicSpells', psionicSpells4: 'psionicSpells', psionicSpells5: 'psionicSpells',
    clockworkSpells1: 'clockworkSpells', clockworkSpells2: 'clockworkSpells', clockworkSpells3: 'clockworkSpells', clockworkSpells4: 'clockworkSpells', clockworkSpells5: 'clockworkSpells',
  },
  warlock: {
    invocation: 'eldritchInvocations', pactBoon: 'pactBoon', tomeCantrip: 'pactBoon', tomeRitual: 'pactBoon', genieKind: 'geniesVessel',
    mysticArcanum6: 'mysticArcanumLevel6Spell mysticArcanum6', mysticArcanum7: 'mysticArcanumLevel7Spell mysticArcanum7',
    mysticArcanum8: 'mysticArcanumLevel8Spell mysticArcanum8', mysticArcanum9: 'mysticArcanumLevel9Spell mysticArcanum9',
  },
  wizard: {
    scholar: 'scholar', spellMastery1: 'spellMastery', spellMastery2: 'spellMastery', legacySpellMastery1: 'spellMastery',
    legacySpellMastery2: 'spellMastery', signatureSpells: 'signatureSpells', abjurationSavant: 'abjurationSavant abjuration_2_0',
    divinationSavant: 'divinationSavant', evocationSavant: 'evocationSavant', illusionSavant: 'illusionSavant illusion_2_0',
    improvedIllusionsCantrip: 'improvedIllusions illusion_2_1', bladesingerWeapon: 'trainingInWarAndSong',
    transmutersStone: 'transmutersStone transmutation_6_0',
  },
};
// Pools sem traço próprio na progressão → lugar das escolhas soltas: proficiência inicial
// (ferramenta, instrumento, proficiências de domínio 2014) junto das proficiências; opções
// do TCE e a Dádiva Feérica em Outros traços.
export const STANDALONE_POOLS = {
  artificer: { artisanTool: 'proficiencies' },
  bard: { musicalInstrument: 'proficiencies', musicalInstrumentStart: 'proficiencies' },
  barbarian: { tceOptional: 'other' },
  cleric: { legacyDomainProficiencies: 'proficiencies' },
  monk: { tool: 'proficiencies' },
  ranger: { tceOptional: 'other', feywildGift: 'other' },
};

// Fallback de id desconhecido: palavras do nome em inglês (o nome em pt se não houver).
const KEYWORDS = [
  ['meta', /\bsubclass\b|ability score improvement|epic boon/i],
  ['cantrips', /cantrip/i],
  ['resources', /\brage\b|channel divinity|wild shape|inspiration|action surge|second wind|\bki\b|\bfocus\b|lay on hands|metamagic|sorcery point|superiority/i],
  ['spells', /spell|magic|pact|arcan|ritual/i],
  ['attacks', /attack|strike|smite|weapon|fighting style|critical|\bshot\b|blade/i],
  ['defense', /defen|armor|ward|resist|evasion|dodge|aura|\bsave|resilien|initiative/i],
  ['movement', /movement|speed|stride|\bstep\b|flight|\bfly|climb|swim|leap|jump|teleport/i],
  ['skills', /expertise|skill|jack of all trades|talent|explorer/i],
  ['proficiencies', /proficienc|language|\btools?\b|training/i],
  ['items', /\bitems?\b|infus|attune/i],
];

const PLACE_OF = new Map();
for (const [place, byClass] of Object.entries(PLACE_IDS)) {
  for (const list of Object.values(byClass)) for (const id of words(list)) PLACE_OF.set(id, place);
}
const ANCHOR_OF = new Map();
for (const [target, list] of Object.entries(ANCHOR_IDS)) for (const id of words(list)) ANCHOR_OF.set(id, target.split('|'));

/** Ids com lugar definido no mapa (o teste confere que cobrem todos os traços). */
export const knownFeatureIds = () => new Set(PLACE_OF.keys());
/** Mapa bruto lugar → classe → ids (para o teste achar ids repetidos). */
export const placeTable = () => PLACE_IDS;

/** Lugar pelo nome em inglês (só para ids fora do mapa). */
export function placeByKeywords(name) {
  for (const [place, re] of KEYWORDS) if (re.test(String(name || ''))) return place;
  return 'other';
}

/**
 * Lugar de um traço: { place, anchors } (anchors só em 'resources').
 * ctx: { classId, rules: '2014'|'2024', picks: [{ pool, id }] da classe }.
 */
export function placeOf(feature, ctx = {}) {
  const id = feature?.id;
  const rules = ctx.rules === '2024' ? '2024' : '2014';
  const byCtx = CONTEXT_PLACES[`${ctx.classId}:${id}`] || CONTEXT_PLACES[`${rules}:${id}`];
  let place = byCtx || PLACE_OF.get(id);
  const pick = BY_PICK[id];
  if (!byCtx && pick) {
    const chosen = (ctx.picks || []).find(p => p.pool === pick[0] && pick[1][p.id]);
    if (chosen) place = pick[1][chosen.id];
  }
  if (!place) place = placeByKeywords(feature?.nameEn || feature?.name);
  if (place !== 'resources') return { place, anchors: null };
  return { place, anchors: CONTEXT_ANCHORS[`${ctx.classId}:${id}`] || ANCHOR_OF.get(id) || [id] };
}

/** Linha do painel de recursos para as âncoras (mesma classe; aceita o sufixo 2014/Legacy). */
export function resourceFor(resources, classId, anchors) {
  for (const a of anchors || []) {
    const r = (resources || []).find(x => x.classId === classId && (x.id === a || x.id === `${a}2014` || x.id === `${a}Legacy`));
    if (r) return r;
  }
  return null;
}

// Chave estável de um traço na ficha (o mesmo id pode voltar em outro nível: Metamagia +1).
export const featureItemKey = (f, classId) => `${classId}:${f.id}:${f.classLevel ?? f.level}`;

// Escolhas de um pool em texto, nas duas línguas: pool dinâmico (truque, perícia, idioma)
// numa linha só ("Especialização: Furtividade, Atletismo"); opção fixa com a descrição dela.
function pickRows(classId, pool, picks) {
  const def = optionPool(classId, pool);
  const both = (fn) => ({ pt: fn('pt'), en: fn('en') });
  const label = (p, lang) => pickLabel(classId, p, lang) + (p.detail ? ` (${p.detail})` : '');
  if (def?.kind) {
    return [{ name: both(lang => def.name?.[lang] || pool), desc: both(lang => picks.map(p => label(p, lang)).join(', ')) }];
  }
  return picks.map(p => {
    const opt = findOption(classId, pool, p.id);
    return { name: both(lang => label(p, lang)), desc: both(lang => opt?.desc?.[lang] || '') };
  });
}

/**
 * Chave de memo da ficha: só o que muda os traços, as escolhas ou as linhas de recurso.
 * A ficha recalcula a cada tecla (notas, PV…): com esta chave o useMemo não refaz nada.
 */
export function featureKey(char) {
  const c = char || {};
  return JSON.stringify([c.rulesVersion, c.className, c.subclass, c.landType, c.level, c.race, c.multiclass,
    c.classSequence, c.classOptions, c.abilities, c.raceBonus, c.levelChoices]);
}

/**
 * Traços da ficha com o lugar de cada um.
 * Devolve { multi, items, by: { <lugar>: items }, orphanPicks } onde item =
 *   { key, id, classId, level (nível na classe), name: {pt,en}, desc: {pt,en}, place,
 *     anchor: 'wildShape'|null, resourceKey, resourceName: {pt,en}|null, picks: [{name,desc}] }
 * e orphanPicks = [{ key, classId, level, name, desc, place, picks }] (escolhas sem traço-pai
 *   na ficha, no mesmo formato de item para a ficha desenhar igual). Elas também entram em
 *   by[place] (depois dos traços): 'proficiencies' (STANDALONE_POOLS) ou 'other'.
 */
export function placeFeatures(char, prog = computeProgression(char || {})) {
  const out = { multi: !!prog?.classes, items: [], by: Object.fromEntries(PLACES.map(p => [p, []])), orphanPicks: [] };
  if (!char?.className || !prog) return out;
  const rules = char.rulesVersion === '2024' ? '2024' : '2014';
  const resources = computeResources(char);
  const picks = (prog.classOptions || []).map(p => ({ ...p, classId: p.classId || char.className }));
  const seen = new Set();
  for (const f of prog.features || []) {
    const classId = f.classId || char.className;
    const key = featureItemKey(f, classId);
    if (seen.has(key)) continue;
    seen.add(key);
    const { place, anchors } = placeOf(f, { classId, rules, picks: picks.filter(p => p.classId === classId) });
    const wild = !!anchors?.includes('wildShape');
    const res = place === 'resources' && !wild ? resourceFor(resources, classId, anchors) : null;
    const item = {
      key, id: f.id, classId, level: f.classLevel ?? f.level,
      name: { pt: f.name, en: f.nameEn || f.name }, desc: { pt: f.desc || '', en: f.descEn || f.desc || '' },
      place, anchor: wild ? 'wildShape' : null, resourceKey: res?.key || null, resourceName: res?.name || null, picks: [],
    };
    out.items.push(item);
    out.by[place].push(item);
  }
  // Escolhas de classe: dentro do traço que as concede (o de menor nível), senão à parte.
  const groups = new Map();
  for (const p of picks) {
    const k = `${p.classId}:${p.pool}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  for (const [k, list] of groups) {
    const [classId, pool] = k.split(':');
    const parents = words(POOL_PARENTS[classId]?.[pool]);
    const parent = parents.map(id => out.items.find(i => i.classId === classId && i.id === id)).find(Boolean);
    const rows = pickRows(classId, pool, list);
    if (parent) parent.picks.push(...rows);
    else {
      const def = optionPool(classId, pool);
      const level = Math.min(...list.map(p => p.level || 1));
      const place = STANDALONE_POOLS[classId]?.[pool] || 'other';
      const orphan = { key: k, classId, level, name: { pt: def?.name?.pt || pool, en: def?.name?.en || pool }, desc: { pt: '', en: '' }, place, picks: rows };
      out.orphanPicks.push(orphan);
      out.by[place].push(orphan);
    }
  }
  return out;
}

/** Pools de opções de todas as classes ({ classe: [pool] }), para o teste de cobertura. */
export function allPools() {
  return Object.fromEntries(Object.entries(CLASS_OPTIONS).map(([id, d]) => [id, Object.keys(d.pools || {})]));
}
export const poolParents = () => POOL_PARENTS;

/** Onde o traço aparece, em texto curto: "aba Magias · truques", "aba Jogar · Fúria". */
export function placeLabel(item, lang = 'pt') {
  const info = PLACE_INFO[item?.place] || PLACE_INFO.other;
  if (!info.tab) return L(lang, info.pt, info.en);
  const tab = L(lang, `aba ${t(TAB_KEY[info.tab], 'pt')}`, `${t(TAB_KEY[info.tab], 'en')} tab`);
  const section = item.anchor === 'wildShape' ? L(lang, 'Forma Selvagem', 'Wild Shape')
    : item.resourceName ? item.resourceName[lang === 'pt' ? 'pt' : 'en']
      : L(lang, info.pt, info.en);
  return section ? `${tab} · ${section}` : tab;
}

/** Etiqueta do traço: "Nv. 3" ou, na multiclasse, "Nv. 3 · Clérigo". */
export function levelTag(item, multi, lang = 'pt') {
  const lv = `${L(lang, 'Nv.', 'Lv')} ${item.level}`;
  return multi ? `${lv} · ${tName('class', item.classId, lang)}` : lv;
}
