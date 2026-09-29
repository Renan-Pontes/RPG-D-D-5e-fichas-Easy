import { test } from 'node:test';
import assert from 'node:assert/strict';
import paladin from '../data/class-options/paladin.js';
import { computeProgression, validateClassOptions } from '../src/progression/engine.js';
import { PROGRESSION_RULES_2024 } from '../src/progression/rules.js';

const base = (extra = {}) => ({ className: 'paladin', rulesVersion: '2024', level: 1, classOptions: [], abilities: { str: 16, dex: 10, con: 14, int: 8, wis: 10, cha: 16 }, ...extra });
const ids = (p) => p.features.map(f => f.id);

test('paladino 2024: traços revisados da classe base', () => {
  const p = computeProgression(base({ level: 20 }));
  for (const id of ['layOnHands', 'weaponMastery', 'paladinsSmite', 'divineSense', 'abjureFoes', 'radiantStrikes', 'restoringTouch', 'auraExpansion', 'epicBoon']) {
    assert.ok(ids(p).includes(id), id);
  }
  assert.ok(p.autoSpells.includes('divineSmite'));
  assert.ok(!PROGRESSION_RULES_2024.paladin.perLevel[19].features[0].descEn.includes('Spell List'));
});

test('paladino 2024: estilo de luta substitui a pendência genérica; maestria no 1', () => {
  const p1 = computeProgression(base());
  assert.ok(p1.pendingChoices.some(c => c.pool === 'weaponMastery' && c.missing === 2));
  const p2 = computeProgression(base({ level: 2 }));
  assert.ok(!p2.pendingChoices.some(c => c.type === 'fightingStyle'));
  assert.ok(p2.pendingChoices.some(c => c.pool === 'fightingStyle'));
});

test('Guerreiro Abençoado abre 2 truques de clérigo', () => {
  const ch = base({ level: 2 });
  assert.ok(validateClassOptions(ch, 'paladin', { adds: [
    { pool: 'fightingStyle', id: 'blessedWarrior' },
    { pool: 'blessedWarriorCantrip', id: 'guidance' },
    { pool: 'blessedWarriorCantrip', id: 'sacredFlame' },
  ] }).valid);
  assert.ok(!validateClassOptions(ch, 'paladin', { adds: [{ pool: 'blessedWarriorCantrip', id: 'guidance' }] }).valid);
  const picked = base({ level: 2, classOptions: [
    { classId: 'paladin', pool: 'fightingStyle', id: 'blessedWarrior', level: 2 },
    { classId: 'paladin', pool: 'blessedWarriorCantrip', id: 'guidance', level: 2 },
    { classId: 'paladin', pool: 'blessedWarriorCantrip', id: 'sacredFlame', level: 2 },
  ] });
  const p = computeProgression(picked);
  assert.ok(p.autoCantrips.includes('guidance') && p.autoCantrips.includes('sacredFlame'));
  assert.ok(!p.pendingChoices.some(c => c.pool === 'blessedWarriorCantrip'));
});

test('juramentos: traços 3/7/15/20 e magias 3/5/9/13/17', () => {
  for (const [id, sub] of Object.entries(paladin.subclasses)) {
    for (const lv of [3, 7, 15, 20]) assert.ok(sub.levels[lv]?.features?.length, `${id} ${lv}`);
    for (const lv of [3, 5, 9, 13, 17]) assert.equal(sub.levels[lv]?.autoSpells?.length, 2, `${id} magias ${lv}`);
    const p = computeProgression(base({ level: 20, subclass: id }));
    // Magias da classe (Golpe Divino nv 2, Encontrar Corcel nv 5) ficam de fora da conta.
    assert.equal(p.autoSpells.filter(s => s !== 'divineSmite' && s !== 'findSteed').length, 10, id);
  }
});

test('Devoção 2024 mantém as magias atuais', () => {
  const p = computeProgression(base({ level: 17, subclass: 'devotion' }));
  for (const s of ['protectionFromEvilAndGood', 'shieldOfFaith', 'aid', 'zoneOfTruth', 'beaconOfHope', 'dispelMagic', 'freedomOfMovement', 'guardianOfFaith', 'commune', 'flameStrike']) {
    assert.ok(p.autoSpells.includes(s), s);
  }
  assert.ok(ids(p).includes('smiteOfProtection'));
});

test('Vingança 2024 não usa texto de 2014', () => {
  const p = computeProgression(base({ level: 3, subclass: 'vengeance' }));
  assert.ok(ids(p).includes('vowOfEnmity'));
  assert.ok(!ids(p).includes('abjureEnemy'));
});

test('recursos: Imposição de Mãos, Canalizar Divindade por versão e capstones', () => {
  const r = paladin.resources;
  assert.deepEqual(r.find(x => x.id === 'layOnHands').uses, { perClassLevel: 5 });
  const cd = r.filter(x => x.id === 'channelDivinity');
  assert.deepEqual(cd.map(x => x.rules).sort(), ['2014', '2024']);
  const cd24 = cd.find(x => x.rules === '2024');
  assert.equal(cd24.shortRestRegain, 1);
  assert.deepEqual(cd24.uses.byLevel, { 3: 2, 11: 3 });
  for (const sub of Object.keys(paladin.subclasses)) {
    if (sub === 'redemption') continue;
    assert.ok(r.some(x => x.minLevel === 20 && x.subclass?.includes(sub)), `capstone ${sub}`);
  }
  for (const x of r) {
    assert.ok(['long', 'short'].includes(x.recharge), x.id);
    for (const s of x.subclass || []) assert.ok(paladin.subclasses[s], `${x.id}: ${s}`);
  }
});
