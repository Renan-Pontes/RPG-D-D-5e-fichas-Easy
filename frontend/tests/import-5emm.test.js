/**
 * Importação de monstros: .5emm.json (5e Monster Maker, saveVersion 1–11) e
 * criaturas do Open5e (v1 /monsters, v2 /creatures). Fixtures pequenas feitas
 * à mão com números do SRD (CC-BY 4.0).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { importMonsters, detectFormat, parseActionText, process5emmTokens } from '../src/campaigns/import-5emm.js';
import { estimateCr } from '../src/combat/cr-estimate.js';

const save = (proficient = false) => ({ proficient, override: false, overrideValue: 0 });
const attack = (id, name, dice, count, extra = {}) => ({
  id, name, distance: 'MELEE', kind: 'WEAPON',
  modifier: { override: false, overrideValue: 0, stat: 'STR', proficient: true },
  range: { standard: 20, long: 60, reach: 5 }, targets: 1,
  damage: { dice, count, modifier: { override: false, overrideValue: 0, stat: 'STR' }, type: 'slashing' },
  alternateDamage: { dice: 6, count: 1, modifier: { override: false, overrideValue: 0, stat: 'STR' }, type: 'slashing', condition: '', active: false },
  additionalDamage: [], save: 0, description: '', legendaryOnly: false, ...extra,
});

// Knight (SRD 5.1) no formato v11
const knightV11 = {
  name: 'Knight', nickname: '', saveVersion: 11, size: 'Medium', type: 'humanoid (any race)', alignment: 'any alignment',
  languages: 'any one language', AC: 18, ACType: 'plate armor', CR: 6, proficiency: 2,
  HP: { HD: 8, type: 8, modifier: 16 },
  stats: { STR: 16, DEX: 11, CON: 14, INT: 11, WIS: 11, CHA: 15 },
  saves: { STR: save(), DEX: save(), CON: save(true), INT: save(), WIS: save(true), CHA: save() },
  speeds: [{ id: 's', type: 'walk', speed: 30, note: '' }],
  skills: [], resistances: [], immunities: [], vulnerabilities: [], conditions: [],
  senses: { blindsight: 0, darkvision: 0, tremorsense: 0, truesight: 0 }, sensesNotes: '',
  passivePerception: { override: false, overrideValue: null },
  traits: [{ name: 'Brave', id: 't1', description: 'The {NAME} has advantage on saving throws against being frightened.', limitedUse: { count: 0, rate: 'DAY' } }],
  spellcasting: { stat: 'WIS', save: { override: false, overrideValue: 0 }, modifier: { override: false, overrideValue: 0 }, attack: { override: false, overrideValue: 0 }, level: 1, slots: [], atWill: [], standard: [] },
  attacks: [attack('gs', 'Greatsword', 6, 2), { ...attack('hc', 'Heavy Crossbow', 10, 1), distance: 'RANGED', modifier: { override: true, overrideValue: 2, stat: 'DEX', proficient: true }, damage: { dice: 10, count: 1, modifier: { override: false, overrideValue: 0, stat: 'DEX' }, type: 'piercing' }, range: { standard: 100, long: 400, reach: 5 } }],
  actions: [{
    name: 'Leadership', id: 'a1', description: 'For 1 minute, the {NAME} can utter a special command.', recharge: '',
    legendaryOnly: false, limitedUse: { count: 1, rate: 'LONG_OR_SHORT' }, stat: 'none', save: { override: false, overrideValue: 0 },
    crAnnotation: { maxDamage: 0, maxSave: 0, maxModifier: 0, multitarget: false, ehpMultiplier: 1, ehpModifier: 0, acModifier: 0, include: true },
  }],
  multiattacks: [{ id: 'm1', attacks: ['gs', 'gs'], actions: [] }],
  legendaryActions: { count: 3, actions: [] },
  mythicActions: { actions: [] },
  reactions: [{ name: 'Parry', id: 'r1', description: 'The {NAME} adds 2 to its AC against one melee attack.', trigger: '' }],
  lairActions: [], regionalEffects: [], regionalEffectDescription: '', inventory: '',
};

// Mesmo monstro, arquivo antigo (v1): sem os campos novos, attack.kind/distance em minúsculas
const knightV1 = (() => {
  const k = JSON.parse(JSON.stringify(knightV11));
  k.saveVersion = 1;
  delete k.nickname; delete k.sensesNotes; delete k.inventory; delete k.mythicActions;
  k.attacks = k.attacks.map(a => ({ ...a, distance: a.distance === 'RANGED' ? 'Ranged' : 'Melee', kind: 'Weapon' }));
  k.actions[0].limitedUse.rate = 'long or short rest';
  delete k.actions[0].stat; delete k.actions[0].save;
  return k;
})();

test('detecta os formatos', () => {
  assert.equal(detectFormat(knightV11), '5emm');
  assert.equal(detectFormat({ name: 'x', strength: 10, hit_points: 5 }), 'open5e-v1');
  assert.equal(detectFormat({ name: 'x', ability_scores: {}, hit_points: 5 }), 'open5e-v2');
  assert.equal(detectFormat({ foo: 1 }), null);
});

test('tokens do 5emm: {NAME}, {3d6}, {DC:STR}, {A:DEX}', () => {
  const mm = { name: 'ogre', useArticleInToken: true, proficiency: 2, stats: { STR: 19, DEX: 8 } };
  assert.equal(process5emmTokens('{NAME} hits for {2d8+4}.', mm), 'The ogre hits for 13 (2d8 + 4).');
  assert.equal(process5emmTokens('{DC:STR} or {A:DEX}', mm), 'DC 14 or +1');
});

test('5emm v11: converte Knight para o formato de combate', () => {
  const r = importMonsters(JSON.stringify(knightV11));
  assert.deepEqual(r.errors, []);
  const m = r.monsters[0];
  assert.equal(m.id, 'imp-knight');
  assert.equal(m.cr, '3');            // índice 6 da tabela
  assert.equal(m.hp, 52);             // 8d8+16
  assert.equal(m.hitDice, '8d8+16');
  assert.equal(m.ac, 18);
  assert.equal(m.type, 'humanoid');
  assert.deepEqual(m.saves, { con: 4, wis: 2 });
  const gs = m.actions.find(a => a.name.en === 'Greatsword');
  assert.deepEqual([gs.type, gs.atk, gs.damage, gs.damageType, gs.range], ['melee', 5, '2d6+3', 'slashing', '5 ft']);
  const xb = m.actions.find(a => a.name.en === 'Heavy Crossbow');
  assert.deepEqual([xb.type, xb.atk, xb.damage, xb.range], ['ranged', 2, '1d10', '100/400 ft']);
  assert.equal(m.actions[0].name.en, 'Multiattack');
  assert.deepEqual(m.multiattack, [[{ name: 'Greatsword', count: 2 }]]);
  const lead = m.actions.find(a => a.name.en === 'Leadership');
  assert.deepEqual([lead.uses, lead.usesPer], [1, 'rest']);
  assert.equal(m.traits[0].desc.en, 'The Knight has advantage on saving throws against being frightened.');
  assert.equal(m.reactions[0].name.en, 'Parry');
  assert.equal(m.custom, true);
  const est = estimateCr(m);
  assert.equal(est.offensive.dpr, 20);   // 2 × 10
  assert.ok(Math.abs(est.crNum - 3) <= 1, `estimado ${est.cr}`);
});

test('5emm v1 (arquivo antigo) importa igual', () => {
  const r = importMonsters(knightV1);
  assert.deepEqual(r.errors, []);
  const m = r.monsters[0];
  assert.equal(m.cr, '3');
  assert.equal(m.actions.find(a => a.name.en === 'Heavy Crossbow').type, 'ranged');
  assert.deepEqual(m.multiattack, [[{ name: 'Greatsword', count: 2 }]]);
});

test('5emm: valida o essencial', () => {
  const bad = { ...knightV11, saveVersion: 42, stats: { STR: 10 }, CR: 99 };
  const r = importMonsters(bad);
  assert.equal(r.monsters.length, 0);
  assert.ok(r.errors.some(e => /saveVersion/.test(e)));
  assert.ok(r.errors.some(e => /stats|Atributos/.test(e)));
  assert.ok(r.errors.some(e => /ND|CR/.test(e)));
  assert.match(importMonsters('{nope').errors[0], /JSON inválido/);
});

test('5emm: dano extra, recarga com CD por atributo e ações lendárias', () => {
  const d = JSON.parse(JSON.stringify(knightV11));
  d.name = 'Wyrm';
  d.attacks = [attack('b', 'Bite', 10, 2, { additionalDamage: [{ id: 'x', dice: 6, count: 2, type: 'fire', note: '' }] })];
  d.multiattacks = [];
  d.actions = [{
    name: 'Fire Breath', id: 'fb', recharge: '5-6', legendaryOnly: false, limitedUse: { count: 0, rate: 'DAY' },
    description: 'Each creature in a 30-foot cone must make a {DC:CON} Dexterity saving throw, taking {10d6} fire damage on a failed save, or half as much damage on a successful one.',
    stat: 'CON', save: { override: false, overrideValue: 0 },
    crAnnotation: { maxDamage: 35, multitarget: true, include: true, ehpMultiplier: 1, ehpModifier: 0, acModifier: 0 },
  }];
  d.legendaryActions = { count: 3, actions: [{ actionId: 'b', cost: 2 }] };
  const m = importMonsters(d).monsters[0];
  const bite = m.actions.find(a => a.name.en === 'Bite');
  assert.deepEqual(bite.extraDamage, [{ damage: '2d6', damageType: 'fire' }]);
  const fb = m.actions.find(a => a.name.en === 'Fire Breath');
  assert.equal(fb.type, 'save');
  assert.deepEqual(fb.save, { ability: 'DEX', dc: 12, halfOnSave: true, area: true });
  assert.equal(fb.damage, '10d6');
  assert.equal(fb.recharge, 5);
  assert.equal(m.legendary.uses, 3);
  assert.equal(m.legendary.actions[0].cost, 2);
});

// ---------------------------------------------------------------- Open5e

const goblinV1 = {
  slug: 'goblin', name: 'Goblin', size: 'Small', type: 'Humanoid', subtype: 'goblinoid', alignment: 'neutral evil',
  armor_class: 15, armor_desc: 'leather armor, shield', hit_points: 7, hit_dice: '2d6', speed: { walk: 30 },
  strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8,
  strength_save: null, dexterity_save: null, constitution_save: null, intelligence_save: null, wisdom_save: null, charisma_save: null,
  perception: null, skills: { stealth: 6 }, damage_vulnerabilities: '', damage_resistances: '', damage_immunities: '', condition_immunities: '',
  senses: 'darkvision 60 ft., passive Perception 9', languages: 'Common, Goblin', challenge_rating: '1/4', cr: 0.25,
  actions: [
    { name: 'Scimitar', desc: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.', attack_bonus: 4, damage_dice: '1d6', damage_bonus: 2 },
    { name: 'Shortbow', desc: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.', attack_bonus: 4, damage_dice: '1d6', damage_bonus: 2 },
  ],
  bonus_actions: null, reactions: null, legendary_desc: '', legendary_actions: null,
  special_abilities: [{ name: 'Nimble Escape', desc: 'The goblin can take the Disengage or Hide action as a bonus action on each of its turns.' }],
  spell_list: [], document__slug: 'wotc-srd', document__title: '5e Core Rules',
};

const dragonV2 = {
  key: 'srd_adult-red-dragon', name: 'Adult Red Dragon', type: { name: 'Dragon', key: 'dragon' }, size: { name: 'Huge', key: 'huge' },
  challenge_rating: 17, speed: { walk: 40, unit: 'feet', fly: 80, climb: 40 }, alignment: 'chaotic evil',
  languages: { as_string: 'Common, Draconic' }, armor_class: 19, hit_points: 256, hit_dice: '19d12+133',
  ability_scores: { strength: 27, dexterity: 10, constitution: 25, intelligence: 16, wisdom: 13, charisma: 21 },
  saving_throws: { dexterity: 6, constitution: 13, wisdom: 7, charisma: 11 }, skill_bonuses: { perception: 13, stealth: 6 },
  passive_perception: 23,
  resistances_and_immunities: { damage_immunities_display: 'fire', damage_immunities: [{ name: 'Fire', key: 'fire' }], damage_resistances: [], damage_vulnerabilities: [], condition_immunities: [] },
  darkvision_range: 120, blindsight_range: 60,
  actions: [
    { name: 'Multiattack', desc: 'The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.', action_type: 'ACTION', order_in_statblock: 0 },
    // o v2 às vezes traz o tipo de dano errado nos campos estruturados: o texto vale
    { name: 'Bite', desc: 'Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 7 (2d6) fire damage.', action_type: 'ACTION', order_in_statblock: 1,
      attacks: [{ to_hit_mod: 14, reach: 10, damage_die_count: 2, damage_die_type: 'D10', damage_bonus: null, damage_type: { key: 'thunder' } }] },
    { name: 'Claw', desc: 'Melee Weapon Attack: +14 to hit, reach 5 ft., one target. Hit: 15 (2d6 + 8) slashing damage.', action_type: 'ACTION', order_in_statblock: 2 },
    { name: 'Fire Breath', desc: 'The dragon exhales fire in a 60-foot cone. Each creature in that area must make a DC 21 Dexterity saving throw, taking 63 (18d6) fire damage on a failed save, or half as much damage on a successful one.', action_type: 'ACTION', order_in_statblock: 3, usage_limits: { type: 'RECHARGE_ON_ROLL', param: 5 } },
    { name: 'Tail Attack', desc: 'The dragon makes a tail attack.', action_type: 'LEGENDARY_ACTION', legendary_action_cost: 1, order_in_statblock: 4 },
    { name: 'Wing Attack (Costs 2 Actions)', desc: 'Each creature within 10 ft. of the dragon must succeed on a DC 22 Dexterity saving throw or take 15 (2d6 + 8) bludgeoning damage and be knocked prone.', action_type: 'LEGENDARY_ACTION', legendary_action_cost: 2, order_in_statblock: 5 },
    { name: 'Tail', desc: 'Melee Weapon Attack: +14 to hit, reach 15 ft., one target. Hit: 17 (2d8 + 8) bludgeoning damage.', action_type: 'ACTION', order_in_statblock: 6 },
  ],
  traits: [{ name: 'Legendary Resistance (3/Day)', desc: 'If the dragon fails a saving throw, it can choose to succeed instead.' }],
  document: { name: 'System Reference Document 5.1' },
};

test('texto de ação 2014 e 2024', () => {
  const a14 = parseActionText('Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.');
  assert.deepEqual([a14.type, a14.atk, a14.range, a14.damage, a14.damageType], ['melee', 5, '5 ft', '1d6+3', 'slashing']);
  const a24 = parseActionText('Ranged Attack Roll: +5, range 30/90 ft. 8 (1d10 + 3) Piercing damage.');
  assert.deepEqual([a24.type, a24.atk, a24.range, a24.damage, a24.damageType], ['ranged', 5, '30/90 ft', '1d10+3', 'piercing']);
  const s24 = parseActionText('Dexterity Saving Throw: DC 21, each creature in a 60-foot Cone. Failure: 59 (17d6) Fire damage. Success: Half damage.', 'Fire Breath (Recharge 5–6)');
  assert.deepEqual([s24.type, s24.save.ability, s24.save.dc, s24.save.halfOnSave, s24.save.area, s24.damage, s24.recharge], ['save', 'DEX', 21, true, true, '17d6', 5]);
});

test('Open5e v1: goblin', () => {
  const r = importMonsters(goblinV1);
  assert.deepEqual(r.errors, []);
  const m = r.monsters[0];
  assert.deepEqual([m.id, m.cr, m.crNum, m.type, m.size, m.ac, m.hp], ['o5e-goblin', '1/4', 0.25, 'humanoid', 'Small', 15, 7]);
  assert.deepEqual(m.actions.map(a => [a.name.en, a.type, a.atk, a.damage, a.damageType]), [
    ['Scimitar', 'melee', 4, '1d6+2', 'slashing'], ['Shortbow', 'ranged', 4, '1d6+2', 'piercing'],
  ]);
  assert.equal(m.traits[0].name.en, 'Nimble Escape');
});

test('Open5e v2: dragão com multiataque, recarga e lendárias', () => {
  const r = importMonsters({ count: 1, results: [dragonV2] });
  assert.deepEqual(r.errors, []);
  const m = r.monsters[0];
  assert.deepEqual([m.cr, m.size, m.type, m.ac, m.hp], ['17', 'Huge', 'dragon', 19, 256]);
  assert.deepEqual(m.speed, { walk: 40, fly: 80, climb: 40 });
  assert.deepEqual(m.saves, { dex: 6, con: 13, wis: 7, cha: 11 });
  assert.deepEqual(m.damageImmunities, ['fire']);
  const bite = m.actions.find(a => a.name.en === 'Bite');
  assert.equal(bite.damageType, 'piercing');
  assert.deepEqual(bite.extraDamage, [{ damage: '2d6', damageType: 'fire' }]);
  assert.equal(m.actions.find(a => a.name.en === 'Fire Breath').recharge, 5);
  assert.deepEqual(m.legendary.actions.map(a => [a.name.en, a.cost]), [['Tail Attack', 1], ['Wing Attack', 2]]);
  assert.match(m.senses, /darkvision 120 ft/);
  const est = estimateCr(m);
  assert.deepEqual(est.offensive.multiattack, [{ name: 'Bite', count: 1 }, { name: 'Claw', count: 2 }]);
  assert.ok(est.offensive.legendaryPerRound > 0);
  assert.ok(Math.abs(est.crNum - 17) <= 2, `estimado ${est.cr}`);
});

test('lista mista: um válido e um desconhecido', () => {
  const r = importMonsters([goblinV1, { name: 'Weird' }]);
  assert.equal(r.monsters.length, 1);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /Weird/);
});
