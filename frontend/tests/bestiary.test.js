import { test } from 'node:test';
import assert from 'node:assert/strict';
import SRD from '../data/srd.js';
import { MONSTERS } from '../data/monsters.js';
import { MONSTERS_SRD521 } from '../data/monsters-srd521.js';
import { BESTIARY, BESTIARY_BY_ID, LEGACY_IDS, findMonster, monsterForCombat, MONSTER_TYPES } from '../data/bestiary.js';
import {
  parseAttack, parseSave, parseDamageChain, splitName, cleanText, convertCreature,
} from '../../scripts/import-open5e-monsters.mjs';
import {
  actionStatus, actionSummary, groupCombatActions, legendaryInfo, limitLabel, logLine,
} from '../src/campaigns/monster-actions.js';

const DICE = /^(\d+d\d+([+-]\d+)?|\d+)$/;
const allActions = (m) => [...m.actions, ...(m.bonusActions || []), ...(m.reactions || []), ...(m.legendary?.actions || [])];

test('SRD 5.2.1: 331 criaturas, ND 0–30, só srd-2024, nomes PT', () => {
  assert.equal(MONSTERS_SRD521.length, 331);
  const crs = MONSTERS_SRD521.map(m => m.crNum);
  assert.equal(Math.min(...crs), 0);
  assert.equal(Math.max(...crs), 30);
  for (const m of MONSTERS_SRD521) {
    assert.equal(m.source, 'SRD 5.2.1');
    assert.ok(m.name.pt && m.name.en, m.id);
    assert.ok(MONSTER_TYPES.includes(m.type), `${m.id}: tipo ${m.type}`);
    assert.ok(m.ac > 0 && m.hp > 0, m.id);
    for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha']) assert.equal(typeof m.abilities[k], 'number', m.id);
  }
  assert.equal(new Set(MONSTERS_SRD521.map(m => m.id)).size, 331);
});

test('ataques e saves estruturados com dano rolável', () => {
  let attacks = 0;
  for (const m of MONSTERS_SRD521) {
    for (const a of allActions(m)) {
      assert.ok(['melee', 'ranged', 'save', 'special'].includes(a.type), `${m.id}/${a.name.en}`);
      if (a.type === 'melee' || a.type === 'ranged') {
        attacks++;
        assert.equal(typeof a.atk, 'number', `${m.id}/${a.name.en}`);
      }
      if (a.type === 'save') {
        assert.match(a.save.ability, /^(STR|DEX|CON|INT|WIS|CHA)$/);
        assert.ok(Number.isInteger(a.save.dc));
        assert.equal(typeof a.save.halfOnSave, 'boolean');
      }
      for (const d of [a.damage, ...(a.extraDamage || []).map(e => e.damage)].filter(Boolean)) assert.match(d, DICE, `${m.id}/${a.name.en}`);
      if (a.recharge) assert.ok([4, 5, 6].includes(a.recharge));
      if (a.uses) assert.ok(['day', 'rest'].includes(a.usesPer));
    }
  }
  assert.ok(attacks > 400);
});

test('bloco do Dragão Vermelho Adulto (SRD 5.2.1)', () => {
  const d = BESTIARY_BY_ID['adult-red-dragon'];
  assert.equal(d.name.pt, 'Dragão Vermelho Adulto');
  assert.equal(d.cr, '17');
  assert.equal(d.xp, 18000);
  const rend = d.actions.find(a => a.name.en === 'Rend');
  assert.deepEqual([rend.atk, rend.damage, rend.damageType], [14, '1d10+8', 'slashing']);
  assert.deepEqual(rend.extraDamage, [{ damage: '2d4', damageType: 'fire' }]);
  const breath = d.actions.find(a => a.name.en === 'Fire Breath');
  assert.equal(breath.recharge, 5);
  assert.deepEqual([breath.save.ability, breath.save.dc, breath.save.halfOnSave, breath.save.area], ['DEX', 21, true, true]);
  assert.deepEqual([breath.damage, breath.damageType], ['17d6', 'fire']);
  assert.equal(d.legendary.uses, 3);
  assert.equal(d.legendary.lairUses, 4);
  assert.equal(d.legendary.actions.length, 3);
  assert.deepEqual(d.legendaryResistance, { uses: 3, lairUses: 4 });
  assert.equal(d.actions[0].name.en, 'Multiattack');
  const tarrasque = BESTIARY_BY_ID.tarrasque;
  assert.equal(tarrasque.crNum, 30);
  assert.equal(tarrasque.legendary.lairUses, undefined);
});

test('parsers do texto 2024', () => {
  assert.deepEqual(parseSave('Wisdom Saving Throw: DC 16, one creature. Failure: The target has the Charmed condition.'),
    { type: 'save', save: { ability: 'WIS', dc: 16, targets: 'one creature', area: false, halfOnSave: false, conditions: ['charmed'] } });
  const aboleth = parseSave('Intelligence Saving Throw: DC 16, one creature within 30 feet. Failure: 10 (3d6) Psychic damage. Success: Half damage. Failure or Success: The aboleth gains memories.');
  assert.deepEqual([aboleth.damage, aboleth.damageType, aboleth.save.halfOnSave], ['3d6', 'psychic', true]);
  const staged = parseSave('Constitution Saving Throw: DC 12, each creature in a 30-foot Cone. First Failure The target has the Restrained condition.');
  assert.deepEqual(staged.save.conditions, ['restrained']);
  assert.deepEqual(parseAttack('Melee or Ranged Attack Roll: +3, reach 5 ft. or range 20/60 ft. 4 (1d6 + 1) Piercing damage.'),
    { type: 'melee', atk: 3, range: '5 ft (20/60 ranged)', damage: '1d6+1', damageType: 'piercing' });
  assert.equal(parseAttack('Ranged Attack Roll: +11, range 60/240 ft. 23 (3d10 + 7) Bludgeoning damage plus 4 (1d8) Fire damage, and pushed.').extraDamage[0].damage, '1d8');
  assert.equal(parseAttack('Melee Attack Roll: +0, reach 5 ft. 1 Slashing damage.').damage, '1');
  assert.deepEqual(parseDamageChain('13 (1d10 + 8) Slashing damage plus 5 (2d4) Fire damage.'),
    [{ damage: '1d10+8', damageType: 'slashing' }, { damage: '2d4', damageType: 'fire' }]);
  assert.deepEqual(splitName('Petrifying Gaze (Recharge 4-6)'), { name: 'Petrifying Gaze', recharge: 4 });
  assert.deepEqual(splitName('Phantasms (Recharge after a Short or Long Rest)'), { name: 'Phantasms', uses: 1, usesPer: 'rest' });
  assert.equal(cleanText('a 20-foot-radius Sphere [Area of Effect]|XPHB|Sphere centered'), 'a 20-foot-radius Sphere centered');
  assert.equal(cleanText('has Cover|XPHB|Total Cover against'), 'has Total Cover against');
  assert.equal(cleanText('_Trigger:_ hit. _Response:_ adds 3'), 'Trigger: hit. Response: adds 3');
});

test('convertCreature: ações lendárias só com action_type LEGENDARY_ACTION', () => {
  const m = convertCreature({
    key: 'srd-2024_test', name: 'Test', challenge_rating: 0.25, type: { key: 'beast' }, size: { name: 'Small' },
    speed: { walk: 30, unit: 'feet' }, armor_class: 12, hit_points: 5, hit_dice: '2d6 - 2',
    ability_scores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 2, wisdom: 10, charisma: 2 },
    traits: [], languages: {}, resistances_and_immunities: {},
    actions: [
      { name: 'Bite', desc: 'Melee Attack Roll: +2, reach 5 ft. 3 (1d4 + 1) Piercing damage.', action_type: 'ACTION', legendary_action_cost: 1, usage_limits: null },
      { name: 'Dash', desc: 'It moves.', action_type: 'BONUS_ACTION', legendary_action_cost: null, usage_limits: { type: 'PER_DAY', param: 3 } },
    ],
  });
  assert.equal(m.cr, '1/4');
  assert.equal(m.hitDice, '2d6-2');
  assert.equal(m.actions[0].cost, undefined);
  assert.deepEqual([m.bonusActions[0].uses, m.bonusActions[0].usesPer], [3, 'day']);
  assert.equal(m.legendary, undefined);
});

test('catálogo unificado sem duplicatas; prefere o 5.2.1', () => {
  const ids = BESTIARY.map(m => m.id);
  assert.equal(new Set(ids).size, ids.length);
  const legacyOnly = BESTIARY.filter(m => m.source !== 'SRD 5.2.1').map(m => m.id).sort();
  assert.deepEqual(legacyOnly, ['banshee', 'displacer-beast', 'lizardfolk', 'orc', 'orog', 'troglodyte']);
  assert.equal(BESTIARY.length, 331 + legacyOnly.length);
  for (const m of MONSTERS) {
    const found = findMonster(m.id);
    assert.ok(found, m.id);
    if (LEGACY_IDS[m.id]) assert.equal(found.id, LEGACY_IDS[m.id]);
  }
  for (let i = 1; i < BESTIARY.length; i++) assert.ok(BESTIARY[i - 1].crNum <= BESTIARY[i].crNum);
});

test('todo animal da Forma Selvagem existe no 5.2.1 com ataque real (sem o 1d4 fixo)', () => {
  assert.equal(SRD.BEASTS.length, 43); // Forma Selvagem continua intacta
  for (const b of SRD.BEASTS) {
    const m = findMonster(b.id);
    assert.ok(m, b.id);
    assert.equal(m.source, 'SRD 5.2.1', b.id);
    const atk = m.actions.find(a => a.type === 'melee' || a.type === 'ranged');
    assert.ok(atk && atk.damage, b.id);
  }
  const brown = findMonster('brownBear');
  assert.ok(brown.actions.some(a => a.atk === 5 && a.damage === '1d8+3'));
});

test('monsterForCombat: lista única com kind e índice estável; idempotente', () => {
  const d = BESTIARY_BY_ID['adult-red-dragon'];
  const snap = monsterForCombat(d);
  assert.equal(snap.combatReady, true);
  assert.equal(snap.bonusActions, undefined);
  assert.deepEqual(snap.legendary, { uses: 3, lairUses: 4 });
  const n = d.actions.length + (d.bonusActions || []).length + (d.reactions || []).length + d.legendary.actions.length;
  assert.equal(snap.actions.length, n);
  assert.ok(snap.actions.filter(a => a.kind === 'legendary').every(a => a.cost === 1));
  assert.deepEqual(monsterForCombat(snap), snap);
  // não altera o catálogo
  assert.equal(d.actions[0].kind, undefined);
  // monstro antigo sem extensões continua funcionando
  const orc = monsterForCombat(BESTIARY_BY_ID.orc);
  assert.ok(orc.actions.every(a => a.kind === 'action'));
  assert.equal(orc.legendary, undefined);
});

test('estado de recarga/usos/lendárias na UI espelha o backend', () => {
  const snap = monsterForCombat(BESTIARY_BY_ID['adult-red-dragon']);
  const breath = snap.actions.findIndex(a => a.name.en === 'Fire Breath');
  const pounce = snap.actions.findIndex(a => a.name.en === 'Pounce');
  const c = {
    stats: { actions: snap.actions },
    action_state: { [breath]: { charged: false } },
    legendary: { max: 3, remaining: 0, lair_max: 4 },
  };
  assert.deepEqual(actionStatus(c, breath), { available: false, reason: 'recharging' });
  assert.deepEqual(actionStatus(c, pounce), { available: false, reason: 'no_legendary_actions' });
  assert.match(limitLabel(c, breath, 'pt'), /Recarga 5–6 · gasta/);
  assert.deepEqual(legendaryInfo({ ...c, in_lair: true }), { remaining: 0, max: 4 });
  const groups = groupCombatActions(snap.actions);
  assert.equal(groups.legendary.length, 3);
  assert.equal(groups.action[0].index, 0);
  assert.match(actionSummary(snap.actions[breath], 'pt'), /DES CD 21 · 17d6 fogo/);
  assert.match(actionSummary(snap.actions[breath], 'en'), /DEX DC 21 · 17d6 fire/);
  const uses = { stats: { actions: [{ type: 'special', uses: 2, usesPer: 'day' }] }, action_state: { 0: { uses_left: 0 } } };
  assert.equal(actionStatus(uses, 0).reason, 'no_uses_left');
  assert.equal(limitLabel(uses, 0, 'en'), '0/2 per day');
  assert.match(logLine({ type: 'recharge', target: 'Dragão', rolls: [{ name: 'Fire Breath', roll: 6, recharged: true }] }, 'pt'), /d6=6 recarregou/);
});
