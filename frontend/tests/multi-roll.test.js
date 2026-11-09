import test from 'node:test';
import assert from 'node:assert/strict';
import { newRow, addBadge, removeOne, rollDice, evalRow, critExtra, duplicateRow, rowText } from '../src/dice/multi-roll.js';

const mods = { str: 3, dex: 2, pb: 2 };
const build = (...bs) => bs.reduce((r, b) => addBadge(r, b), newRow());
const fixed = (vals) => { let i = 0; return () => vals[i++]; }; // rand() → valor pronto
const r01 = (v, sides) => (v - 1) / sides + 1e-9;

test('emblemas iguais empilham; o fixo soma; tirar um desempilha', () => {
  let r = build({ kind: 'die', die: 6 }, { kind: 'die', die: 6 }, { kind: 'flat', value: 2 }, { kind: 'flat', value: 1 });
  assert.equal(r.badges.length, 2);
  assert.equal(r.badges[0].count, 2);
  assert.equal(r.badges[1].value, 3);
  r = removeOne(r, 0);
  assert.equal(r.badges[0].count, 1);
  assert.equal(rowText(build({ kind: 'die', die: 20 }, { kind: 'abil', abil: 'str' }, { kind: 'pb' }, { kind: 'die', die: 12, sign: -1 })), 'd20 +STR +PB −d12');
});

test('linha com d20: teste = d20+mods; dano = outros dados + atributo + fixo (sem BP)', () => {
  const axe = build({ kind: 'die', die: 20 }, { kind: 'abil', abil: 'str' }, { kind: 'pb' }, { kind: 'flat', value: 3 }, { kind: 'die', die: 12 });
  const rolls = { 0: [14], 4: [9] };
  const ev = evalRow(axe, mods, rolls);
  assert.equal(ev.check, 14 + 3 + 2 + 3);
  assert.equal(ev.damage, 9 + 3 + 3);
  assert.equal(ev.crit, false);
});

test('20 natural: crítico; o dano soma os dados extras', () => {
  const axe = build({ kind: 'die', die: 20 }, { kind: 'abil', abil: 'str' }, { kind: 'die', die: 12 });
  const ev = evalRow(axe, mods, { 0: [20], 2: [5] }, { 2: [7] });
  assert.equal(ev.crit, true);
  assert.equal(ev.damage, 5 + 7 + 3);
  assert.deepEqual(Object.keys(critExtra(axe, () => 0)), ['2']);
});

test('vantagem rola 2 d20 e mantém o maior; desvantagem o menor', () => {
  const row = { ...build({ kind: 'die', die: 20 }), adv: 'adv' };
  const rolls = rollDice(row, fixed([r01(5, 20), r01(15, 20)]));
  assert.equal(rolls[0].length, 2);
  assert.equal(evalRow(row, mods, rolls).check, 15);
  assert.equal(evalRow({ ...row, adv: 'dis' }, mods, rolls).check, 5);
});

test('sem d20 é uma soma só; subtrair funciona', () => {
  const r = build({ kind: 'die', die: 6 }, { kind: 'die', die: 4, sign: -1 }, { kind: 'abil', abil: 'dex' });
  assert.equal(evalRow(r, mods, { 0: [6], 1: [3] }).total, 6 - 3 + 2);
  const c = duplicateRow(r); c.badges[0].count = 9;
  assert.equal(r.badges[0].count, 1);
});

import { dropOnBadge, coupleBadges, toggleLock, addBadgeTo, dropTemps, evalUnits } from '../src/dice/multi-roll.js';

test('soltar FOR sobre 2d6 acopla os dois num grupo', () => {
  let r = addBadgeTo(addBadgeTo(newRow(), { kind: 'die', die: 20 }), { kind: 'die', die: 6, count: 2 });
  r = dropOnBadge(r, 1, { kind: 'abil', abil: 'str' });
  assert.equal(r.badges[1].group, r.badges[2].group);
  assert.ok(r.badges[1].group);
  const u = evalUnits(r, { str: 3, pb: 2 }, { 0: [12], 1: [4, 5] });
  assert.deepEqual(u.map(x => [x.kind, x.value]), [['check', 12], ['damage', 12]]);
});

test('estáticos soltos: tudo no teste; atributo/fixo só no 1º dano sem acoplados', () => {
  let r = newRow();
  for (const b of [{ kind: 'die', die: 20 }, { kind: 'abil', abil: 'str' }, { kind: 'pb' }, { kind: 'die', die: 8 }]) r = addBadgeTo(r, b);
  const u = evalUnits(r, { str: 3, pb: 2 }, { 0: [10], 3: [6] });
  assert.deepEqual(u.map(x => [x.kind, x.value]), [['check', 15], ['damage', 9]]);
});

test('arrastar um emblema da linha sobre outro também acopla', () => {
  let r = newRow();
  for (const b of [{ kind: 'die', die: 6 }, { kind: 'flat', value: 2 }, { kind: 'die', die: 4 }]) r = addBadgeTo(r, b);
  r = coupleBadges(r, 1, 2);
  assert.equal(r.badges[1].kind, 'die');
  assert.equal(r.badges[2].group, r.badges[1].group);
  const u = evalUnits(r, {}, { 0: [3], 1: [4] });
  assert.deepEqual(u.map(x => x.value), [3, 6]);
});

test('trava: o que entra depois é temporário e some depois da rolagem', () => {
  let r = addBadgeTo(newRow(), { kind: 'die', die: 20 });
  r = toggleLock(r);
  r = addBadgeTo(r, { kind: 'die', die: 4 }); // Bênção desta rolagem
  assert.equal(r.badges[1].temp, true);
  assert.equal(dropTemps(r).badges.length, 1);
  assert.equal(dropTemps(r).locked, true);
});

import { unitStatics, defaultRows } from '../src/dice/multi-roll.js';

test('linhas iniciais: corpo a corpo, distância e mágico só para quem conjura', () => {
  const U = { spellcastingAbility: (c) => c.caster ? 'cha' : null };
  assert.equal(defaultRows({}, U, 'en').length, 2);
  const rows = defaultRows({ caster: true }, U, 'en');
  assert.deepEqual(rows.map(r => r.name), ['Melee weapon attack', 'Ranged weapon attack', 'Spell attack']);
  // dano corpo a corpo: d8 acoplado à FOR
  const melee = rows[0];
  const d8 = melee.badges.findIndex(b => b.kind === 'die' && b.die === 8);
  assert.ok(melee.badges[d8].group && melee.badges.some((b, i) => i !== d8 && b.group === melee.badges[d8].group && b.abil === 'str'));
  // estáticos fundidos: teste +5 (FOR 3 + BP 2) no d20, dano +3 no d8
  assert.deepEqual(unitStatics(melee, { str: 3, pb: 2 }), { 0: 5, [d8]: 3 });
});
