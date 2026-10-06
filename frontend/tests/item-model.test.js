import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dmgTypeLabel, formToItem, formWeightLb, kgToLb, lbToKg, rarityLabel, toForm, weaponPropLabel, weightLabel,
} from '../src/items/item-model.js';

test('tipos de dano, propriedades e raridade em pt', () => {
  assert.equal(dmgTypeLabel('bludgeoning', 'pt'), 'contundente');
  assert.equal(dmgTypeLabel('piercing', 'en'), 'piercing');
  assert.equal(weaponPropLabel('finesse', 'pt'), 'Acuidade');
  assert.equal(weaponPropLabel('two-handed', 'pt'), 'Duas Mãos');
  assert.equal(weaponPropLabel('custom-x', 'pt'), 'custom-x');
  assert.equal(rarityLabel('very-rare', 'pt'), 'Muito raro');
  assert.equal(rarityLabel('very rare', 'en'), 'Very rare');
});

test('peso: libras guardadas, kg na tela em pt', () => {
  assert.equal(lbToKg(2), 0.9);
  assert.equal(kgToLb(0.9), 2);
  assert.equal(weightLabel(2, 'pt'), '0,9 kg (2 lb)');
  assert.equal(weightLabel(2, 'en'), '2 lb');
  assert.equal(weightLabel(null, 'pt'), '');
});

test('editar sem mexer no peso preserva as libras exatas', () => {
  const item = { name: 'Corda', type: 'gear', weight: 3 };
  const f = toForm(item, 'pt');
  assert.equal(f.weight, '1.4');
  assert.equal(formToItem(f).weight, 3);
  // mudou o campo: converte kg → lb
  assert.equal(formWeightLb({ ...f, weight: '2' }), 4.4);
  assert.equal(formWeightLb({ ...f, weight: '2,5' }), 5.6);
  // em inglês o campo já é em libras
  const fe = toForm(item, 'en');
  assert.equal(fe.weight, '3');
  assert.equal(formToItem({ ...fe, weight: '5' }).weight, 5);
  assert.equal(formToItem({ ...f, weight: '' }).weight, undefined);
});

test('propriedades da arma ida e volta (lista, preservando desconhecidas)', () => {
  const item = { name: 'Adaga', type: 'weapon', weapon: { damage: '1d4', dmgType: 'piercing', props: ['finesse', 'burst-fire'], range: '20/60' } };
  const f = toForm(item, 'pt');
  assert.deepEqual(f.props, ['finesse', 'burst-fire']);
  const out = formToItem({ ...f, props: [...f.props, 'light'] });
  assert.deepEqual(out.weapon.props, ['finesse', 'burst-fire', 'light']);
  assert.equal(out.weapon.range, '20/60');
  // formato antigo (texto separado por vírgula) ainda funciona
  assert.deepEqual(formToItem({ ...f, props: 'finesse, light' }).weapon.props, ['finesse', 'light']);
});
