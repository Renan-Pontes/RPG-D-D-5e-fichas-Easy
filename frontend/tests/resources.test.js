import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeResources, spendResource, restResources } from '../src/progression/resources.js';
import { CLASS_OPTIONS } from '../data/class-options/index.js';

const barb = (level, extra = {}) => ({ rulesVersion: '2024', className: 'barbarian', level, abilities: { str: 16 }, ...extra });
const find = (c, id) => computeResources(c).find(r => r.id === id);

test('Fúria: usos por nível, recupera 1 no curto e tudo no longo', () => {
  assert.equal(find(barb(1), 'rage').max, 2);
  assert.equal(find(barb(17), 'rage').max, 6);
  let c = spendResource(spendResource(barb(5), 'barbarian.rage'), 'barbarian.rage');
  assert.equal(find(c, 'rage').used, 2);
  assert.equal(find(restResources(c, 'short'), 'rage').used, 1);
  assert.equal(find(restResources(c, 'long'), 'rage').used, 0);
  for (let i = 0; i < 9; i++) c = spendResource(c, 'barbarian.rage');
  assert.equal(find(c, 'rage').used, 3, 'não passa do máximo');
});

test('versão das regras, subclasse e multiclasse', () => {
  assert.ok(find(barb(5, { rulesVersion: undefined }), 'rage2014'));
  assert.ok(!find(barb(5, { rulesVersion: undefined }), 'rage'));
  const mc = { rulesVersion: '2024', className: 'barbarian', level: 7, multiclass: [{ id: 'paladin', subclass: '' }],
    classSequence: ['barbarian', 'barbarian', 'barbarian', 'barbarian', 'barbarian', 'paladin', 'paladin'], abilities: { cha: 14 } };
  const keys = computeResources(mc).map(r => r.key);
  assert.ok(keys.includes('barbarian.rage') && keys.includes('paladin.layOnHands'));
  assert.equal(computeResources(mc).find(r => r.key === 'paladin.layOnHands').max, 10, '5 × nível de paladino');
});

test('recarga curta a partir de um nível (Inspiração de Bardo)', () => {
  const bard = (level) => ({ rulesVersion: '2024', className: 'bard', level, abilities: { cha: 16 } });
  assert.equal(find(bard(4), 'bardicInspiration').recharge, 'long');
  assert.equal(find(bard(5), 'bardicInspiration').recharge, 'short');
});

test('todo recurso das classes tem forma válida', () => {
  for (const [cls, data] of Object.entries(CLASS_OPTIONS)) {
    for (const r of data.resources || []) {
      assert.ok(r.id && r.name?.pt && r.name?.en, `${cls}.${r.id}: nome`);
      assert.ok(['long', 'short'].includes(r.recharge), `${cls}.${r.id}: recharge`);
      assert.ok(r.uses && typeof r.uses === 'object', `${cls}.${r.id}: uses`);
    }
  }
});

test('recursos de espécie: Sopro Dracônico = proficiência; Voo só no 5', () => {
  const d = (level) => ({ rulesVersion: '2024', className: 'fighter', race: 'dragonborn', level });
  assert.equal(find(d(1), 'breathWeapon').max, 2);
  assert.ok(!find(d(4), 'draconicFlight') && find(d(5), 'draconicFlight'));
  assert.equal(find({ className: 'fighter', race: 'dragonborn', level: 3 }, 'breathWeapon').recharge, 'short', '2014: descanso curto');
});
