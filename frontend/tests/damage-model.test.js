import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  padPress, padValue, rememberType, typeChips, readTypeMemory, writeTypeMemory, multiTargets, toggleMark,
  hpFlash, manyFlash, newOpId, turnMarks, markLabel, shouldScrollTo, PAD_KEYS,
} from '../src/play/damage-model.js';

test('teclado próprio: algarismos, ½, ⌫ e o teto de 4 algarismos', () => {
  let v = '';
  for (const k of ['0', '7']) v = padPress(v, k);
  assert.equal(v, '7');                                   // zero à esquerda some
  v = padPress(v, '5');
  assert.equal(v, '75');
  assert.equal(padPress(v, 'half'), '37');                // ½ arredonda para baixo
  assert.equal(padPress('1', 'half'), '0');
  assert.equal(padPress('', 'half'), '');
  assert.equal(padPress('75', 'back'), '7');
  assert.equal(padPress('9999', '1'), '9999');            // o servidor aceita até 9999
  assert.equal(padPress('12', 'x'), '12');
  assert.equal(padValue(''), 0);
  assert.equal(padValue('07'), 7);
  assert.deepEqual(PAD_KEYS, ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'half', '0', 'back']);
});

test('o tipo de dano vem do último usado no alvo e os 3 últimos viram chips', () => {
  let m = { byTarget: {}, recent: [] };
  assert.deepEqual(typeChips(m, 'g1'), { type: 'slashing', chips: ['slashing', 'piercing', 'bludgeoning'] });
  assert.equal(typeChips(m, 'g1', 'fire').type, 'fire');   // o do ataque do monstro, se ninguém usou nada
  m = rememberType(m, 'g1', 'fire');
  m = rememberType(m, 'g2', 'cold');
  m = rememberType(m, 'g1', 'radiant');
  assert.deepEqual(typeChips(m, 'g1').chips, ['radiant', 'fire', 'cold']);
  assert.equal(typeChips(m, 'g1').type, 'radiant');
  assert.deepEqual(typeChips(m, 'g3').chips, ['radiant', 'cold', 'fire']);   // alvo novo: os da mesa
  m = rememberType(m, 'g1', 'fire');
  assert.deepEqual(m.byTarget.g1, ['fire', 'radiant']);    // sem repetir
  // lembrado no aparelho (e sem quebrar sem storage)
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  writeTypeMemory(1, m, storage);
  assert.deepEqual(readTypeMemory(1, storage), m);
  assert.deepEqual(readTypeMemory(2, { getItem: () => { throw new Error('privado'); } }), { byTarget: {}, recent: [] });
});

test('vários alvos: "½ passou" leva a metade, na ordem da lista', () => {
  let marks = {};
  marks = toggleMark(marks, 'g2');
  marks = toggleMark(marks, 'g1');
  marks = toggleMark(marks, 'g2', { half: true });
  assert.deepEqual(multiTargets(marks, 9, ['g1', 'g2']), [{ id: 'g1', amount: 9 }, { id: 'g2', amount: 4 }]);
  marks = toggleMark(marks, 'g1');                         // 2º toque tira o alvo
  assert.deepEqual(multiTargets(marks, 9, ['g1', 'g2']), [{ id: 'g2', amount: 4 }]);
  assert.deepEqual(multiTargets({}, 9), []);
});

test('o aviso do dano diz o PV que ficou e se caiu', () => {
  const after = { name: 'Goblin #1', type: 'monster', current_hp: 0, defeated: true, stats: { max_hp: 10 } };
  assert.equal(hpFlash({ op: 'damage', amount: 7, after }, 'pt'), 'Goblin #1 −7 (0/10, derrotado)');
  assert.equal(hpFlash({ op: 'damage', amount: 7, taken: 3, after: { ...after, current_hp: 7, defeated: false } }, 'en'),
    'Goblin #1 −3 (7/10)');
  const pc = { name: 'Dagna', type: 'pc', current_hp: 0, temp_hp: 0, stats: { max_hp: 10 } };
  assert.equal(hpFlash({ op: 'damage', amount: 9, after: pc }, 'pt'), 'Dagna −9 (0/10, caído)');
  assert.equal(hpFlash({ op: 'heal', amount: 5, after: { ...pc, current_hp: 5 } }, 'pt'), 'Dagna +5 (5/10)');
  assert.equal(hpFlash({ op: 'temp', amount: 5, after: { ...pc, temp_hp: 8 } }, 'pt'), 'Dagna +5 temp (8 temp)');
  assert.equal(manyFlash([{ id: 'a', name: 'Goblin #1', damage_taken: 8 }, { id: 'b', name: 'Goblin #2', damage_taken: 4 }],
    { b: { half: true } }, 'pt'), 'Vários alvos: Goblin #1 −8 · Goblin #2 −4 (½)');
  assert.equal(manyFlash([{ id: 'a', name: 'Dagna', amount: 5 }], {}, 'en', 'heal'), 'Several targets: Dagna +5');
});

test('opId: um id por toque', () => {
  const a = newOpId();
  const b = newOpId();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{8,64}$/);
});

test('marcas de vez: ✓ agiu · ▶ agora · † caiu, do turnIndex', () => {
  const combat = {
    active: true, turnIndex: 2, combatants: [
      { id: 'p', current_hp: 9 }, { id: 'e', current_hp: 7 }, { id: 'g2', current_hp: 10 },
      { id: 'd', current_hp: 3 }, { id: 'g1', current_hp: 0, defeated: true }, { id: 'k', current_hp: 11 },
    ],
  };
  assert.deepEqual(turnMarks(combat), { p: 'acted', e: 'acted', g2: 'now', d: null, g1: 'down', k: null });
  assert.deepEqual(turnMarks({ ...combat, active: false }), {});
  // 3 "Próximo" depois do início (vez 0 → 3)
  assert.deepEqual(Object.values(turnMarks({ ...combat, turnIndex: 3 })).filter(m => m === 'acted').length, 3);
  assert.equal(markLabel('acted', 'pt'), '✓ agiu');
  assert.equal(markLabel('now', 'en'), '▶ now');
  assert.equal(markLabel('down', 'pt'), '† caiu');
  assert.equal(markLabel(null, 'pt'), '');
});

test('a lista só rola até quem age se ele estiver fora da vista e sem toque há 600 ms', () => {
  const view = { top: 100, bottom: 700 };
  assert.equal(shouldScrollTo({ top: 200, bottom: 256 }, { ...view, now: 5000 }), false);   // à vista
  assert.equal(shouldScrollTo({ top: 760, bottom: 816 }, { ...view, now: 5000 }), true);
  assert.equal(shouldScrollTo({ top: 760, bottom: 816 }, { ...view, now: 5000, lastTouchAt: 4600 }), false);
  assert.equal(shouldScrollTo({ top: 20, bottom: 76 }, { ...view, now: 5000, lastTouchAt: 4000 }), true);
  assert.equal(shouldScrollTo(null, view), false);
});
