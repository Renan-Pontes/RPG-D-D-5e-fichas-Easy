import { test } from 'node:test';
import assert from 'node:assert/strict';
import SRD from '../data/srd.js';
import { ITEMS, ITEMS_BY_ID } from '../data/items.js';
import { SHARED } from '../data/class-options/shared.js';
import { tName } from '../data/i18n.js';

// Catálogo de armas (srd.js WEAPONS e items.js) conferido contra SHARED.weaponMastery (números 2024).
const OPTIONS = SHARED.weaponMastery.options;
const DICE = /^(\d+d\d+|\d+)$/;
const sameSet = (a, b) => [...a].sort().join(',') === [...b].sort().join(',');

test('toda arma de SHARED.weaponMastery existe em items.js com dano, propriedades e maestria 2024', () => {
  for (const o of OPTIONS) {
    const it = ITEMS_BY_ID[o.id];
    assert.ok(it, `items.js sem ${o.id}`);
    assert.equal(it.type, 'weapon', o.id);
    const w = { ...it.weapon, ...(it.weapon.v2024 || {}) };
    assert.match(w.damage, DICE, o.id);
    assert.equal(w.damage, o.damage, `${o.id}: dano 2024`);
    assert.equal(w.dmgType, o.dmgType, `${o.id}: tipo de dano`);
    assert.ok(sameSet(w.props, o.props), `${o.id}: propriedades 2024 ${w.props} ≠ ${o.props}`);
    assert.equal(w.mastery, o.mastery, `${o.id}: maestria`);
    assert.equal(w.range || null, o.range || null, `${o.id}: alcance`);
    assert.equal(it.name.pt, o.name.pt, `${o.id}: nome PT`);
    assert.equal(it.name.en, o.name.en, `${o.id}: nome EN`);
    assert.equal(it.source || 'SRD', o.source, `${o.id}: fonte`);
  }
});

test('armas do SRD 5.2.1 existem em srd.js com os números 2024 via weaponFor', () => {
  for (const o of OPTIONS.filter(x => x.source === 'SRD')) {
    const w = SRD.weaponFor(o.id, '2024');
    assert.ok(w, `srd.js sem ${o.id}`);
    assert.equal(w.damage, o.damage, `${o.id}: dano 2024`);
    assert.equal(w.dmgType, o.dmgType, o.id);
    assert.ok(sameSet(w.props, o.props), `${o.id}: propriedades 2024`);
    assert.equal(w.mastery, o.mastery, `${o.id}: maestria`);
    assert.equal(w.range || null, o.range || null, `${o.id}: alcance`);
    assert.equal(w.type, `${o.category}-${o.melee ? 'melee' : 'ranged'}`, `${o.id}: categoria`);
    assert.equal(tName('weapon', o.id, 'pt'), o.name.pt, `${o.id}: tradução PT (i18n)`);
    assert.equal(tName('weapon', o.id, 'en'), o.name.en, `${o.id}: tradução EN (i18n)`);
  }
});

test('fichas 2014 mantêm os números antigos', () => {
  assert.deepEqual([SRD.weaponFor('lance').damage, SRD.weaponFor('lance').props], ['1d12', ['reach', 'special']]);
  assert.equal(SRD.weaponFor('trident', '2014').damage, '1d6');
  assert.deepEqual(SRD.weaponFor('warPick', '2014').props, []);
  assert.equal(ITEMS_BY_ID.lance.weapon.damage, '1d12');
  // A rede só existe em 2014.
  assert.ok(SRD.weaponsFor('2014').some(w => w.id === 'net'));
  assert.ok(!SRD.weaponsFor('2024').some(w => w.id === 'net'));
  assert.equal(SRD.weaponsFor('2024').find(w => w.id === 'lance').damage, '1d10');
});

test('armas de arremesso corpo a corpo têm alcance em items.js', () => {
  for (const id of ['dagger', 'handaxe', 'javelin', 'lightHammer', 'spear', 'trident']) {
    assert.match(ITEMS_BY_ID[id].weapon.range || '', /^\d+\/\d+$/, id);
  }
  for (const it of ITEMS.filter(i => i.weapon)) {
    const p = it.weapon.props;
    if (p.includes('thrown') || p.includes('ammo')) assert.ok(it.weapon.range, `${it.sourceId} sem alcance`);
  }
});

test('traduções corrigidas', () => {
  const pt = (id) => ITEMS_BY_ID[id].name.pt;
  assert.equal(pt('glaive'), 'Glaive');
  assert.equal(pt('halberd'), 'Alabarda');
  assert.equal(pt('morningstar'), 'Maça-estrela');
  assert.equal(pt('chainShirt'), 'Camisão de Malha');
  assert.equal(pt('lance'), 'Lança de Montaria');
  assert.equal(tName('armor', 'chainShirt', 'pt'), 'Camisão de Malha');
  assert.equal(tName('weapon', 'morningstar', 'pt'), 'Maça-estrela');
  const names = ITEMS.map(i => i.name.pt);
  for (const bad of ['Halberda', 'Mangrenata', 'Cota de Cordames', 'Estrela Matina']) assert.ok(!names.includes(bad), bad);
  assert.equal(new Set(ITEMS.map(i => i.sourceId)).size, ITEMS.length, 'sourceId duplicado');
});
