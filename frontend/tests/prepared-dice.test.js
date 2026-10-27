// Dados preparados pelo mestre: as contas dos cartões por jogador
// (src/shell/prepared-dice.js) — campo "Valores", filas, ↑ ↓ ×, histórico.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DICE_TYPES, canMoveDown, canMoveUp, diceLabel, historyRows, moveValue, parseValues, pendingCount,
  playersOf, queueSummary, removeValueAt, rigUserId, rigsByUser, valuesError,
} from '../src/shell/prepared-dice.js';

test('parseValues: vírgula, ponto, ponto e vírgula e espaço separam', () => {
  assert.deepEqual(parseValues('15, 12 18;3.20').values.map(v => v.value), [15, 12, 18, 3, 20]);
  assert.deepEqual(parseValues('').values, []);
  assert.deepEqual(parseValues('  20  ').values, [{ value: 20 }]);
});

test('parseValues: fora das faces do dado ou não-inteiro vai para bad', () => {
  const r = parseValues('20, 21, 0, x, -3, 4', 'd20');
  assert.deepEqual(r.values.map(v => v.value), [20, 4]);
  assert.deepEqual(r.bad, ['21', '0', 'x', '-3']);
  assert.deepEqual(parseValues('7', 'd6').bad, ['7']);
  assert.deepEqual(parseValues('100', 'd100').values, [{ value: 100 }]);
  // qualquer dado aceita até 100 (como o "próximo resultado")
  assert.deepEqual(parseValues('100', 'any').values, [{ value: 100 }]);
  assert.deepEqual(parseValues('101', 'any').bad, ['101']);
});

test('valuesError: motivo escrito em pt e en', () => {
  assert.equal(valuesError(parseValues('20', 'd20'), 'd20', 'pt'), '');
  assert.match(valuesError(parseValues('', 'd20'), 'd20', 'pt'), /pelo menos um/);
  assert.match(valuesError(parseValues('9', 'd8'), 'd8', 'pt'), /"9" não serve: use números de 1 a 8 \(d8\)/);
  assert.match(valuesError(parseValues('9', 'd8'), 'd8', 'en'), /from 1 to 8/);
  const many = parseValues(Array.from({ length: 51 }, () => '2').join(','), 'd20');
  assert.match(valuesError(many, 'd20', 'pt'), /No máximo 50/);
});

test('diceLabel e DICE_TYPES', () => {
  assert.deepEqual(DICE_TYPES, ['d20', 'd12', 'd10', 'd8', 'd6', 'd4', 'd100', 'any']);
  assert.equal(diceLabel('d12', 'pt'), 'd12');
  assert.equal(diceLabel('any', 'pt'), 'Qualquer dado');
  assert.equal(diceLabel('any', 'en'), 'Any die');
});

test('rigUserId, playersOf, rigsByUser e pendingCount', () => {
  const rigs = [
    { id: 1, targetUser: { id: 3 }, values: [{ value: 20 }, { value: 3, consumed: true }] },
    { id: 2, targetUserId: 2, values: [{ value: 1, consumed: true }] },
    { id: 3, targetUser: { id: 3 }, targetUserId: 3, values: [{ value: 5 }] },
    { id: 4, values: [] },
  ];
  assert.equal(rigUserId(rigs[1]), 2);
  assert.equal(rigUserId(rigs[3]), null);
  const by = rigsByUser(rigs);
  assert.deepEqual(Object.keys(by).sort(), ['2', '3']);
  assert.deepEqual(by[3].map(r => r.id), [1, 3]);
  assert.equal(pendingCount(by[3]), 2);
  assert.equal(pendingCount(by[2]), 0);
  assert.equal(pendingCount(undefined), 0);
  const members = [{ role: 'dm', user: { id: 1 } }, { role: 'player', user: { id: 2 } }, { role: 'player' }];
  assert.deepEqual(playersOf(members).map(m => m.user.id), [2]);
});

test('↑ ↓: valores usados não se movem e não são ultrapassados', () => {
  const v = [{ value: 1, consumed: true }, { value: 2 }, { value: 3 }, { value: 4 }];
  assert.equal(canMoveUp(v, 0), false);
  assert.equal(canMoveUp(v, 1), false);   // passaria por cima do usado
  assert.equal(canMoveUp(v, 2), true);
  assert.equal(canMoveDown(v, 0), false); // usado
  assert.equal(canMoveDown(v, 2), true);
  assert.equal(canMoveDown(v, 3), false); // último
  assert.deepEqual(moveValue(v, 2, 1).map(x => x.value), [1, 3, 2, 4]);
  assert.deepEqual(moveValue(v, 2, 3).map(x => x.value), [1, 2, 4, 3]);
  assert.equal(moveValue(v, 1, 0), null);
  assert.equal(moveValue(v, 3, 4), null);
  assert.equal(moveValue(v, 1, 3), null); // só um passo por vez
  // não muda a fila original
  assert.deepEqual(v.map(x => x.value), [1, 2, 3, 4]);
});

test('×: tirar o último valor esvazia a fila (apagar a fila inteira)', () => {
  assert.deepEqual(removeValueAt([{ value: 1 }, { value: 2 }], 0), { values: [{ value: 2 }], empty: false });
  assert.deepEqual(removeValueAt([{ value: 9 }], 0), { values: [], empty: true });
});

test('historyRows: nome de quem rolou, ★ da fila e no máximo 50', () => {
  const members = [{ role: 'player', user: { id: 2, displayName: 'Ana' } }];
  const log = Array.from({ length: 60 }, (_, i) => ({ id: i, result: 20, dice_type: 'd20', user_id: i === 0 ? 2 : 9, label: i === 0 ? 'Ataque' : '', rigged: i === 0, created_at: '2026-10-24T18:00:00Z' }));
  const rows = historyRows(log, members);
  assert.equal(rows.length, 50);
  assert.deepEqual(rows[0], { id: 0, result: 20, dice: 'd20', who: 'Ana', label: 'Ataque', rigged: true, at: '2026-10-24T18:00:00Z' });
  assert.equal(rows[1].who, '#9');
  assert.equal(rows[1].rigged, false);
  assert.deepEqual(historyRows(null, members), []);
});

test('queueSummary', () => {
  assert.equal(queueSummary(0, 'pt'), 'fila vazia');
  assert.equal(queueSummary(3, 'pt'), '3 na fila');
  assert.equal(queueSummary(1, 'en'), '1 queued');
});
