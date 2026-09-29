import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import SRD from '../data/srd.js';
import * as FS from '../src/progression/fighting-styles.js';
import { poolOptions, matchesOptionFilter } from '../src/progression/options-catalog.js';
import { SHARED } from '../data/class-options/shared.js';

const fighter = (styles = [], extra = {}) => ({
  rulesVersion: '2024', className: 'fighter', level: 1, race: 'human',
  abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 8 }, raceBonus: {},
  classOptions: styles.map(id => ({ classId: 'fighter', pool: 'fightingStyle', id, level: 1 })),
  ...extra,
});
const weapon = (id) => { const w = SRD.WEAPONS.find(x => x.id === id); return { id, name: id, damage: w.damage, dmgType: w.dmgType, props: w.props }; };

test('Defesa: +1 CA só usando armadura', () => {
  const semArmadura = fighter(['defense']);
  assert.equal(Utils.computeAc(semArmadura), Utils.computeAc(fighter([])));
  assert.deepEqual(FS.acBonuses(semArmadura), []);

  const cota = fighter(['defense'], { armor: 'chainMail' });
  const base = fighter([], { armor: 'chainMail' });
  assert.ok(SRD.ARMOR.some(a => a.id === 'chainMail'));
  assert.equal(Utils.computeAc(cota), Utils.computeAc(base) + 1);
  assert.equal(FS.partsLabel(FS.acBonuses(cota), 'pt'), '+1 Defesa');

  const couro = fighter(['defense'], { armor: 'leather', hasShield: true });
  assert.equal(Utils.computeAc(couro), 11 + 2 + 2 + 1);
});

test('Arquearia: +2 no ataque só com armas à distância', () => {
  const c = fighter(['archery']);
  const arco = FS.weaponStyleBonuses(c, weapon('longbow'));
  assert.equal(arco.attack, 2);
  assert.equal(arco.damage, 0);
  assert.equal(arco.attackParts[0].label.pt, 'Arquearia');
  assert.equal(FS.weaponStyleBonuses(c, weapon('longsword')).attack, 0);
  assert.equal(FS.weaponStyleBonuses(fighter([]), weapon('longbow')).attack, 0);
});

test('Duelo: +2 no dano corpo a corpo sem Duas Mãos', () => {
  const c = fighter(['dueling']);
  assert.equal(FS.weaponStyleBonuses(c, weapon('longsword')).damage, 2);
  assert.equal(FS.weaponStyleBonuses(c, weapon('rapier')).damage, 2);
  assert.equal(FS.weaponStyleBonuses(c, weapon('greatsword')).damage, 0);
  assert.equal(FS.weaponStyleBonuses(c, weapon('longbow')).damage, 0);
});

test('Duelismo do Colégio das Espadas herda o efeito do estilo compartilhado', () => {
  const c = { ...fighter([]), className: 'bard', classOptions: [{ classId: 'bard', pool: 'fightingStyle', id: 'dueling' }] };
  assert.equal(FS.weaponStyleBonuses(c, weapon('rapier')).damage, 2);
});

test('Arremesso, Armas Grandes, Duas Armas: dano do dardo e notas', () => {
  const c = fighter(['thrownWeaponFighting', 'greatWeaponFighting', 'twoWeaponFighting']);
  assert.equal(FS.weaponStyleBonuses(c, weapon('dart')).damage, 2);
  const adaga = FS.weaponStyleBonuses(c, weapon('dagger'));
  assert.equal(adaga.damage, 0);
  assert.ok(adaga.notes.some(n => n.pt.includes('arremessar')));
  assert.ok(adaga.notes.some(n => n.pt.includes('Leve')));
  assert.ok(FS.weaponStyleBonuses(c, weapon('greatsword')).notes.some(n => n.pt.includes('contam como 3')));
});

test('Luta às Cegas, Desarmado e reações', () => {
  const c = fighter(['blindFighting', 'unarmedFighting', 'interception']);
  assert.equal(FS.blindsight(c), 10);
  assert.equal(FS.unarmedStrike(c).die, '1d6');
  assert.deepEqual(FS.styleReactions(c).map(r => r.id), ['interception']);
  assert.equal(FS.styleSummaries(c).length, 3);
  assert.equal(FS.blindsight(fighter([])), 0);
});

test('maestria aparece só nas armas dominadas', () => {
  const c = fighter([], { classOptions: [{ classId: 'fighter', pool: 'weaponMastery', id: 'greatsword' }] });
  const m = FS.weaponStyleBonuses(c, weapon('greatsword')).mastery;
  assert.equal(m.id, 'graze');
  assert.equal(m.name.pt, SHARED.masteryProperties.graze.name.pt);
  assert.equal(FS.weaponStyleBonuses(c, weapon('longsword')).mastery, null);
});

test('maestria filtrada por classe no seletor', () => {
  const ids = (classId) => poolOptions({ ...fighter([]), className: classId, classOptions: [] }, classId, 'weaponMastery').map(o => o.id);
  const barb = ids('barbarian');
  assert.ok(barb.includes('greataxe') && !barb.includes('longbow'));
  const rogue = ids('rogue');
  assert.ok(rogue.includes('rapier') && rogue.includes('shortbow') && rogue.includes('crossbowHand'));
  assert.ok(!rogue.includes('greatsword') && !rogue.includes('longbow'));
  assert.equal(ids('fighter').length, SHARED.weaponMastery.options.length);
  assert.ok(matchesOptionFilter({ firearm: undefined }, { firearm: false }));
});
