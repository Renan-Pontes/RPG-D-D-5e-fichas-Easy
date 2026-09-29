// Listas de magias das fichas 2014 (catálogo legado SRD.SPELLS + listas de classe 2014).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import SRD from '../data/srd.js';
import { SPELLS_2024 } from '../data/rules2024.js';
import { LEGACY_SPELL_CLASSES } from '../data/spells-legacy-classes.js';

// Quantidade de magias por nível (truques = índice 0) em cada lista de classe do PHB 2014
// (o artífice conta as magias do PHB que entram na lista do TCE). Suplementos só somam.
const PHB_2014_COUNTS = {
  artificer: [15, 14, 19, 11, 9, 5, 0, 0, 0, 0],
  bard:      [11, 21, 22, 16, 8, 16, 7, 10, 5, 4],
  cleric:    [7, 15, 17, 20, 8, 13, 10, 8, 4, 4],
  druid:     [8, 16, 18, 13, 16, 14, 9, 5, 7, 4],
  paladin:   [0, 15, 8, 10, 6, 6, 0, 0, 0, 0],
  ranger:    [0, 13, 13, 11, 5, 4, 0, 0, 0, 0],
  sorcerer:  [16, 20, 24, 20, 10, 11, 10, 8, 5, 5],
  warlock:   [9, 11, 12, 12, 4, 4, 8, 4, 5, 5],
  wizard:    [16, 30, 34, 29, 23, 23, 20, 15, 13, 12],
};

test('cada classe conjuradora 2014 tem ao menos as magias do PHB por nível', () => {
  for (const [cls, counts] of Object.entries(PHB_2014_COUNTS)) {
    counts.forEach((min, level) => {
      const n = SRD.SPELLS.filter(s => s.level === level && s.classes.includes(cls)).length;
      assert.ok(n >= min, `${cls} nível ${level}: ${n} < ${min}`);
    });
  }
});

test('ids do catálogo legado são únicos', () => {
  const ids = SRD.SPELLS.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('nenhuma magia 2014 fica sem lista de classe', () => {
  const empty = SRD.SPELLS.filter(s => !s.classes?.length).map(s => s.id);
  assert.deepEqual(empty, []);
});

test('toda magia do mapa 2014 existe no catálogo legado com a lista 2014', () => {
  const byId = new Map(SRD.SPELLS.map(s => [s.id, s]));
  for (const [id, classes] of Object.entries(LEGACY_SPELL_CLASSES)) {
    const spell = byId.get(id);
    assert.ok(spell, id);
    for (const c of classes) assert.ok(spell.classes.includes(c), `${id} sem ${c}`);
    assert.equal(spell.rulesVersion, undefined, id);
  }
});

test('ids 2014 com nome próprio não ganham duplicata do catálogo 2024', () => {
  const ids = new Set(SRD.SPELLS.map(s => s.id));
  for (const [legacy, modern] of [['commandSpell', 'command'], ['identifySpell', 'identify'], ['spareDying', 'spareTheDying'], ['expediteRetreat', 'expeditiousRetreat'], ['healSpell', 'heal'], ['wishSpell', 'wish']]) {
    assert.ok(ids.has(legacy), legacy);
    assert.ok(!ids.has(modern), modern);
  }
});

test('listas 2014 conferem em exemplos do PHB e suplementos', () => {
  const get = id => SRD.SPELLS.find(s => s.id === id).classes;
  assert.deepEqual([...get('magicMissile')].sort(), ['sorcerer', 'wizard']);
  assert.ok(get('spiritualWeapon').includes('cleric'));
  assert.ok(!get('conjureFey').includes('bard'));
  assert.ok(get('tollTheDead').includes('cleric'));
  assert.ok(get('mindSliver').includes('sorcerer'));
  assert.ok(get('hex').includes('warlock'));
  // a cópia para o legado não altera a magia do catálogo 2024
  const hex24 = SPELLS_2024.find(s => s.id === 'mindSliver');
  assert.notEqual(hex24, SRD.SPELLS.find(s => s.id === 'mindSliver'));
});
