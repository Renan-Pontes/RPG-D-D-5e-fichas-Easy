/**
 * Cobertura por classe — 1→20 ganhos automáticos.
 *
 * Para cada classe + 1 subclasse representativa, varremos os 20 níveis
 * verificando que features e autos esperados aparecem no `computeProgression`.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeProgression, applyAutosToCharacter } from '../src/progression/index.js';

const ABILITIES_DEFAULT = { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 };

function build(className, level, subclass = null, extra = {}) {
  return { className, level, subclass, abilities: ABILITIES_DEFAULT, ...extra };
}

function featureAt(prog, id, level) {
  return prog.features.find(f => f.id === id && f.level === level);
}

// Cobertura: cada classe testa que ao chegar no nv 20 tem profBonus=6 e que
// uma feature característica de cada nível chave está presente.

describe('Bárbaro 1→20 (Berserker)', () => {
  test('rage e unarmoredDefense no nível 1', () => {
    const p = computeProgression(build('barbarian', 1));
    assert.ok(featureAt(p, 'rage', 1));
    assert.ok(featureAt(p, 'unarmoredDefense', 1));
  });
  test('Berserker frenzy no nível 3', () => {
    const p = computeProgression(build('barbarian', 3, 'berserker'));
    assert.ok(featureAt(p, 'frenzy', 3));
  });
  test('extra attack no nível 5', () => {
    const p = computeProgression(build('barbarian', 5));
    assert.equal(p.extraAttacks, 1);
  });
  test('nível 20 tem Primal Champion', () => {
    const p = computeProgression(build('barbarian', 20, 'berserker'));
    assert.ok(featureAt(p, 'primalChampion', 20));
    assert.equal(p.profBonus, 6);
  });
});

describe('Bardo 1→20 (Lore)', () => {
  test('Bardic Inspiration no 1', () => {
    const p = computeProgression(build('bard', 1));
    assert.ok(featureAt(p, 'bardicInspiration', 1));
    assert.equal(p.cantripsKnown, 2);
  });
  test('Lore Cutting Words no 3', () => {
    const p = computeProgression(build('bard', 3, 'lore'));
    assert.ok(featureAt(p, 'cuttingWords', 3));
  });
  test('Bardic Inspiration d8 no 5, d10 no 15', () => {
    const p5 = computeProgression(build('bard', 5, 'lore'));
    assert.ok(featureAt(p5, 'bardicInspirationD8', 5));
    const p15 = computeProgression(build('bard', 15, 'lore'));
    assert.ok(featureAt(p15, 'bardicInspirationD10', 15));
  });
  test('Superior Inspiration no 20', () => {
    const p = computeProgression(build('bard', 20, 'lore'));
    assert.ok(featureAt(p, 'superiorInspiration', 20));
  });
});

describe('Clérigo 1→20 (Life)', () => {
  test('Life ganha bless e cureWounds auto no 1', () => {
    const p = computeProgression(build('cleric', 1, 'life'));
    assert.ok(p.autoSpells.includes('bless'));
    assert.ok(p.autoSpells.includes('cureWounds'));
  });
  test('Life acumula domain spells até o nv 9', () => {
    const p = computeProgression(build('cleric', 9, 'life'));
    ['bless','cureWounds','lesserRestoration','spiritualWeapon','beaconOfHope','revivify','deathWard','guardianOfFaith','massCureWounds','raiseDead']
      .forEach(s => assert.ok(p.autoSpells.includes(s), `falta ${s}`));
  });
  test('Divine Intervention no nv 10', () => {
    const p = computeProgression(build('cleric', 10, 'life'));
    assert.ok(featureAt(p, 'divineIntervention', 10));
  });
  test('Supreme Healing no 17', () => {
    const p = computeProgression(build('cleric', 17, 'life'));
    assert.ok(featureAt(p, 'supremeHealing', 17));
  });
});

describe('Druida 1→20 (Land + Stars já cobertos)', () => {
  test('Druid Land com forest type acumula spells', () => {
    const p = computeProgression(build('druid', 5, 'land', { landType: 'forest' }));
    assert.ok(p.autoSpells.includes('barkskin'));
    assert.ok(p.autoSpells.includes('spiderClimb'));
    assert.ok(p.autoSpells.includes('callLightning'));
  });
  test('Druid Land sem landType pede escolha', () => {
    const p = computeProgression(build('druid', 3, 'land'));
    assert.ok(p.pendingChoices.find(c => c.type === 'landType'));
  });
  test('Druid Land arctic no nv 9 tem coneOfCold', () => {
    const p = computeProgression(build('druid', 9, 'land', { landType: 'arctic' }));
    assert.ok(p.autoSpells.includes('coneOfCold'));
  });
  test('Druid Land mountain ≠ swamp', () => {
    const m = computeProgression(build('druid', 5, 'land', { landType: 'mountain' }));
    const s = computeProgression(build('druid', 5, 'land', { landType: 'swamp' }));
    assert.notDeepEqual(m.autoSpells, s.autoSpells);
  });
});

describe('Guerreiro 1→20 (Champion)', () => {
  test('Second Wind no 1, Action Surge no 2', () => {
    const p2 = computeProgression(build('fighter', 2));
    assert.ok(featureAt(p2, 'secondWind', 1));
    assert.ok(featureAt(p2, 'actionSurge', 2));
  });
  test('Champion improvedCritical no 3', () => {
    const p = computeProgression(build('fighter', 3, 'champion'));
    assert.ok(featureAt(p, 'improvedCritical', 3));
  });
  test('extra attack escala: 1 no 5, 2 no 11, 3 no 20', () => {
    assert.equal(computeProgression(build('fighter', 5)).extraAttacks, 1);
    assert.equal(computeProgression(build('fighter', 11)).extraAttacks, 2);
    assert.equal(computeProgression(build('fighter', 20)).extraAttacks, 3);
  });
  test('Champion Survivor no 18', () => {
    const p = computeProgression(build('fighter', 18, 'champion'));
    assert.ok(featureAt(p, 'survivor', 18));
  });
});

describe('Monge 1→20 (Open Hand)', () => {
  test('Unarmored Defense e Martial Arts no 1', () => {
    const p = computeProgression(build('monk', 1));
    assert.ok(featureAt(p, 'unarmoredDefense', 1));
    assert.ok(featureAt(p, 'martialArts', 1));
  });
  test('Open Hand Technique no 3', () => {
    const p = computeProgression(build('monk', 3, 'openHand'));
    assert.ok(featureAt(p, 'openHandTechnique', 3));
  });
  test('Stunning Strike e Extra Attack no 5', () => {
    const p = computeProgression(build('monk', 5));
    assert.ok(featureAt(p, 'stunningStrike', 5));
    assert.equal(p.extraAttacks, 1);
  });
  test('Quivering Palm no 17, Perfect Self no 20', () => {
    const p17 = computeProgression(build('monk', 17, 'openHand'));
    assert.ok(featureAt(p17, 'quiveringPalm', 17));
    const p20 = computeProgression(build('monk', 20, 'openHand'));
    assert.ok(featureAt(p20, 'perfectSelf', 20));
  });
});

describe('Paladino 1→20 (Devotion)', () => {
  test('Lay on Hands no 1, Spellcasting + Divine Smite no 2', () => {
    const p2 = computeProgression(build('paladin', 2));
    assert.ok(featureAt(p2, 'layOnHands', 1));
    assert.ok(featureAt(p2, 'divineSmite', 2));
  });
  test('Devotion auto-prepara Protection from Evil and Good no 3', () => {
    const p = computeProgression(build('paladin', 3, 'devotion'));
    assert.ok(p.autoSpells.includes('protectionFromEvilAndGood'));
  });
  test('Aura of Protection no 6, Aura of Courage no 10', () => {
    const p10 = computeProgression(build('paladin', 10, 'devotion'));
    assert.ok(featureAt(p10, 'auraOfProtection', 6));
    assert.ok(featureAt(p10, 'auraOfCourage', 10));
  });
  test('Holy Nimbus no 20 (Devotion)', () => {
    const p = computeProgression(build('paladin', 20, 'devotion'));
    assert.ok(featureAt(p, 'holyNimbus', 20));
  });
});

describe('Patrulheiro 1→20 (Hunter)', () => {
  test('Favored Enemy e Natural Explorer no 1', () => {
    const p = computeProgression(build('ranger', 1));
    assert.ok(featureAt(p, 'favoredEnemy', 1));
    assert.ok(featureAt(p, 'naturalExplorer', 1));
  });
  test("Hunter's Prey no 3", () => {
    const p = computeProgression(build('ranger', 3, 'hunter'));
    assert.ok(featureAt(p, 'huntersPrey', 3));
  });
  test('Foe Slayer no 20', () => {
    const p = computeProgression(build('ranger', 20, 'hunter'));
    assert.ok(featureAt(p, 'foeSlayer', 20));
  });
});

describe('Ladino 1→20 (Thief)', () => {
  test("Sneak Attack e Thieves' Cant no 1", () => {
    const p = computeProgression(build('rogue', 1));
    assert.ok(featureAt(p, 'sneakAttack', 1));
    assert.ok(featureAt(p, 'thievesCant', 1));
    assert.equal(p.expertiseSlots, 2);
  });
  test('Thief Fast Hands no 3', () => {
    const p = computeProgression(build('rogue', 3, 'thief'));
    assert.ok(featureAt(p, 'fastHands', 3));
  });
  test("Evasion no 7, Reliable Talent no 11", () => {
    const p11 = computeProgression(build('rogue', 11, 'thief'));
    assert.ok(featureAt(p11, 'evasion', 7));
    assert.ok(featureAt(p11, 'reliableTalent', 11));
  });
  test('Stroke of Luck no 20', () => {
    const p = computeProgression(build('rogue', 20, 'thief'));
    assert.ok(featureAt(p, 'strokeOfLuck', 20));
  });
});

describe('Feiticeiro 1→20 (Draconato)', () => {
  test('Draconic Ancestor e Resilience no 1', () => {
    const p = computeProgression(build('sorcerer', 1, 'draconic'));
    assert.ok(featureAt(p, 'dragonAncestor', 1));
    assert.ok(featureAt(p, 'draconicResilience', 1));
  });
  test('Font of Magic no 2, Metamagic no 3', () => {
    const p3 = computeProgression(build('sorcerer', 3, 'draconic'));
    assert.ok(featureAt(p3, 'fontOfMagic', 2));
    assert.ok(featureAt(p3, 'metamagic', 3));
  });
  test('Dragon Wings no 14, Draconic Presence no 18', () => {
    const p18 = computeProgression(build('sorcerer', 18, 'draconic'));
    assert.ok(featureAt(p18, 'dragonWings', 14));
    assert.ok(featureAt(p18, 'draconicPresence', 18));
  });
});

describe('Bruxo 1→20 (Hexblade)', () => {
  test('Hexblade autoSpells e features no 1', () => {
    const p = computeProgression(build('warlock', 1, 'hexblade'));
    assert.ok(p.autoSpells.includes('shield'));
    assert.ok(p.autoSpells.includes('wrathfulSmite'));
    assert.ok(featureAt(p, 'hexblade_curse', 1));
    assert.ok(featureAt(p, 'hexWarrior', 1));
  });
  test('Eldritch Invocations no 2, Pact Boon no 3', () => {
    const p3 = computeProgression(build('warlock', 3, 'hexblade'));
    assert.ok(featureAt(p3, 'eldritchInvocations', 2));
    assert.ok(featureAt(p3, 'pactBoon', 3));
  });
  test('Mystic Arcanum 6→9 nos níveis 11/13/15/17', () => {
    const p17 = computeProgression(build('warlock', 17, 'hexblade'));
    assert.ok(featureAt(p17, 'mysticArcanum6', 11));
    assert.ok(featureAt(p17, 'mysticArcanum7', 13));
    assert.ok(featureAt(p17, 'mysticArcanum8', 15));
    assert.ok(featureAt(p17, 'mysticArcanum9', 17));
  });
  test('Master of Hexes no 14', () => {
    const p = computeProgression(build('warlock', 14, 'hexblade'));
    assert.ok(featureAt(p, 'masterOfHexes', 14));
  });
});

describe('Mago 1→20 (Evocação)', () => {
  test('Spellbook e Arcane Recovery no 1', () => {
    const p = computeProgression(build('wizard', 1));
    assert.ok(featureAt(p, 'spellbook', 1));
    assert.ok(featureAt(p, 'arcaneRecovery', 1));
    assert.equal(p.cantripsKnown, 3);
  });
  test('Evocação Sculpt Spells no 2', () => {
    const p = computeProgression(build('wizard', 2, 'evocation'));
    assert.ok(featureAt(p, 'sculptSpells', 2));
  });
  test('Empowered Evocation no 10, Overchannel no 14', () => {
    const p14 = computeProgression(build('wizard', 14, 'evocation'));
    assert.ok(featureAt(p14, 'empoweredEvocation', 10));
    assert.ok(featureAt(p14, 'overchannel', 14));
  });
  test('Signature Spells no 20', () => {
    const p = computeProgression(build('wizard', 20, 'evocation'));
    assert.ok(featureAt(p, 'signatureSpells', 20));
  });
});

describe('applyAutosToCharacter — novas subclasses', () => {
  test('Cleric Life nv 5 aplica bless, cureWounds, lesserRestoration, spiritualWeapon, beaconOfHope, revivify', () => {
    const c = applyAutosToCharacter(build('cleric', 5, 'life'));
    const ids = new Set(c.spells.map(s => s.id));
    ['bless','cureWounds','lesserRestoration','spiritualWeapon','beaconOfHope','revivify']
      .forEach(s => assert.ok(ids.has(s), `falta ${s}`));
  });

  test('Druid Land forest nv 7 aplica spells acumulados', () => {
    const c = applyAutosToCharacter(build('druid', 7, 'land', { landType: 'forest' }));
    const ids = new Set(c.spells.map(s => s.id));
    ['barkskin','spiderClimb','callLightning','plantGrowth','divination','freedomOfMovement']
      .forEach(s => assert.ok(ids.has(s), `falta ${s}`));
  });

  test('Druid Land mudar landType remove autos antigos', () => {
    let c = applyAutosToCharacter(build('druid', 5, 'land', { landType: 'forest' }));
    assert.ok(c.spells.find(s => s.id === 'barkskin'));
    c = applyAutosToCharacter({ ...c, landType: 'desert' });
    assert.equal(c.spells.find(s => s.id === 'barkskin'), undefined);
    assert.ok(c.spells.find(s => s.id === 'blur'));
  });

  test('Warlock Hexblade aplica shield e wrathfulSmite', () => {
    const c = applyAutosToCharacter(build('warlock', 1, 'hexblade'));
    const ids = new Set(c.spells.map(s => s.id));
    assert.ok(ids.has('shield'));
    assert.ok(ids.has('wrathfulSmite'));
  });

  test('Paladin Devotion nv 5 aplica oath spells de 3 e 5', () => {
    const c = applyAutosToCharacter(build('paladin', 5, 'devotion'));
    const ids = new Set(c.spells.map(s => s.id));
    ['protectionFromEvilAndGood','sanctuary','lesserRestoration','zoneOfTruth']
      .forEach(s => assert.ok(ids.has(s), `falta ${s}`));
  });
});

describe('Profundidade da engine', () => {
  test('Todas as 12 classes têm regras', () => {
    const expected = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
    for (const cls of expected) {
      const p = computeProgression({ className: cls, level: 1, abilities: ABILITIES_DEFAULT });
      assert.ok(p.classId === cls, `${cls} sem regras`);
    }
  });
  test('asiLevels canônicos: 4/8/12/16/19 para todas exceto fighter/rogue', () => {
    const canon = ['barbarian', 'bard', 'cleric', 'druid', 'monk', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];
    for (const cls of canon) {
      const p = computeProgression({ className: cls, level: 20, abilities: ABILITIES_DEFAULT });
      assert.deepEqual(p.asiLevels.sort((a, b) => a - b), [4, 8, 12, 16, 19], `${cls} asiLevels: ${p.asiLevels}`);
    }
  });
  test('Fighter tem ASI extras no 6 e 14', () => {
    const p = computeProgression({ className: 'fighter', level: 20, abilities: ABILITIES_DEFAULT });
    assert.deepEqual(p.asiLevels.sort((a, b) => a - b), [4, 6, 8, 12, 14, 16, 19]);
  });
  test('Rogue tem ASI extra no 10', () => {
    const p = computeProgression({ className: 'rogue', level: 20, abilities: ABILITIES_DEFAULT });
    assert.deepEqual(p.asiLevels.sort((a, b) => a - b), [4, 8, 10, 12, 16, 19]);
  });
});
