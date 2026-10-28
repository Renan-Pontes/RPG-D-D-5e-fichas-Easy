// Dados preparados pelo mestre: as contas dos cartões por jogador
// (src/shell/prepared-dice.js) — campo "Valores", filas, ↑ ↓ ×, histórico.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DICE_TYPES, MAX_VALUES, canMoveDown, canMoveUp, diceLabel, historyRows, moveValue, parseValues, pendingCount,
  planEnqueue, planMove, planNext, playersOf, queueBlocks, queueSummary, removeValueAt, rigUserId, rigsByUser, valuesError,
} from '../src/shell/prepared-dice.js';

// O servidor em miniatura (api/views_dice.py › _consume_or_roll): as filas do dado e
// de 'any' pela ordem, o primeiro valor não usado sai e fica "usado".
function roll(rigs, die) {
  for (const r of rigs) {
    if (r.diceType !== die && r.diceType !== 'any') continue;
    const v = r.values.find(x => !x.consumed);
    if (v) { v.consumed = true; return v.value; }
  }
  return null;   // ao acaso
}
// Grava o plano como o servidor novo (create com `before` entra antes daquela fila).
let nextId = 100;
function apply(rigs, plan) {
  const out = rigs.map(r => ({ ...r, values: r.values.map(v => ({ ...v })) }));
  const writes = Array.isArray(plan) ? plan : plan.update ? [plan.update] : [];
  for (const w of writes) out.find(r => r.id === w.id).values = w.values.map(v => ({ ...v }));
  if (plan.create) {
    const rig = { id: nextId++, diceType: plan.create.diceType, values: plan.create.values.map(v => ({ value: v.value, consumed: false })) };
    const at = plan.before ? out.findIndex(r => r.id === plan.before) : -1;
    if (at >= 0) out.splice(at, 0, rig); else out.push(rig);
  }
  return out;
}
const vals = (...xs) => xs.map(x => (typeof x === 'number' ? { value: x, consumed: false } : { value: x[0], consumed: true }));

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

test('planEnqueue: no fim da fila que o jogador já tem desse dado (sem fila nova)', () => {
  // achado da revisão: o 20 novo virava uma 2ª fila d20 e o ↑ dele ficava apagado
  const rigs = [{ id: 1, diceType: 'd20', values: vals(20, 3, 18) }, { id: 2, diceType: 'd6', values: vals(6) }];
  const p = planEnqueue(rigs, 'd20', [{ value: 20 }]);
  assert.deepEqual(p, { update: { id: 1, values: [...vals(20, 3, 18), { value: 20, consumed: false, label: null }] } });
  const after = apply(rigs, p);
  assert.equal(after.length, 2);
  // o 20 novo sobe (mesma fila)
  assert.deepEqual(planMove(after, 1, 3, -1), [{ id: 1, values: [...vals(20, 3), { value: 20, consumed: false, label: null }, ...vals(18)] }]);
  // dado sem fila: fila nova (POST só com os números)
  assert.deepEqual(planEnqueue(rigs, 'd8', [{ value: 7 }]), { create: { diceType: 'd8', values: [{ value: 7 }] } });
  // a fila cheia não passa de MAX_VALUES: vai para uma nova
  const full = [{ id: 9, diceType: 'd20', values: vals(...Array.from({ length: MAX_VALUES }, () => 5)) }];
  assert.ok(planEnqueue(full, 'd20', [{ value: 1 }]).create);
});

test('planMove: na mesma fila, entre filas vizinhas do mesmo dado, nunca entre dados', () => {
  const rigs = [
    { id: 1, diceType: 'd20', values: vals([1], 20, 3) },
    { id: 2, diceType: 'd20', values: vals(18) },     // fila antiga: cada "Adicionar" criava uma
    { id: 3, diceType: 'any', values: vals(17) },
    { id: 4, diceType: 'd20', values: vals(9) },
  ];
  assert.equal(planMove(rigs, 1, 1, -1), null);        // passaria por cima do usado
  assert.equal(planMove(rigs, 1, 0, 1), null);         // o usado não se move
  assert.deepEqual(planMove(rigs, 1, 2, -1), [{ id: 1, values: vals([1], 3, 20) }]);
  // 18 sobe para a fila 1 e o 3 desce para a 2: 2 PUTs, cada fila com o mesmo tamanho
  const up = planMove(rigs, 2, 0, -1);
  assert.deepEqual(up, [{ id: 2, values: vals(3) }, { id: 1, values: vals([1], 20, 18) }]);
  const after = apply(rigs, up);
  assert.deepEqual([roll(after, 'd20'), roll(after, 'd20'), roll(after, 'd20')], [20, 18, 3]);
  // d20 ↔ qualquer dado: não (o valor mudaria de dado)
  assert.equal(planMove(rigs, 2, 0, 1), null);
  assert.equal(planMove(rigs, 3, 0, -1), null);
  assert.equal(planMove(rigs, 4, 0, 1), null);         // último
  assert.equal(planMove(rigs, 4, 0, 2), null);
  assert.equal(planMove(rigs, 99, 0, -1), null);
});

test('queueBlocks: um bloco por trecho do mesmo dado, na ordem em que saem', () => {
  const rigs = [
    { id: 1, diceType: 'd20', values: vals([1], 20) },
    { id: 2, diceType: 'd20', values: vals(18) },
    { id: 3, diceType: 'any', values: vals(17) },
    { id: 4, diceType: 'd6', values: [] },
    { id: 5, diceType: 'any', values: vals(2) },
  ];
  const b = queueBlocks(rigs);
  assert.deepEqual(b.map(x => [x.die, x.rows.map(r => r.entry.value)]), [['d20', [1, 20, 18]], ['any', [17, 2]]]);
  assert.deepEqual(b[0].rows[2], { key: '2-0', rigId: 2, i: 0, entry: { value: 18, consumed: false } });
  assert.deepEqual(queueBlocks(null), []);
});

test('planNext: o ⚡ Próximo resultado sai mesmo na próxima rolagem, de qualquer dado', () => {
  const d20 = () => ({ id: 1, diceType: 'd20', values: vals(20, 3, 18) });
  // achado da revisão: com fila d20, o "próximo" entrava no fim e só saía depois do 18
  let rigs = [d20()];
  let p = planNext(rigs, 17);
  assert.deepEqual(p, { create: { diceType: 'any', values: [{ value: 17 }] }, before: 1 });
  let after = apply(rigs, p);
  assert.equal(roll(after, 'd20'), 17);
  assert.equal(roll(after, 'd20'), 20);
  assert.equal(roll(apply(rigs, p), 'd6'), 17);
  // a 1ª fila com valor é 'any': entra antes do 1º não usado dela (1 PUT)
  rigs = [{ id: 2, diceType: 'any', values: vals([4], 9) }, d20()];
  p = planNext(rigs, 12);
  assert.deepEqual(p, { update: { id: 2, values: [...vals([4]), { value: 12, consumed: false, label: null }, ...vals(9)] } });
  assert.equal(roll(apply(rigs, p), 'd8'), 12);
  // a fila logo antes é 'any' e já foi toda usada (a da Ana no seed): entra no fim dela
  rigs = [{ id: 2, diceType: 'any', values: vals([1]) }, d20()];
  p = planNext(rigs, 5);
  assert.deepEqual(p, { update: { id: 2, values: [...vals([1]), { value: 5, consumed: false, label: null }] } });
  assert.equal(roll(apply(rigs, p), 'd20'), 5);
  // nada na fila: reaproveita a fila 'any' (ou cria uma)
  assert.deepEqual(planNext([{ id: 7, diceType: 'd20', values: vals([2]) }, { id: 8, diceType: 'any', values: vals([1]) }], 6),
    { update: { id: 8, values: [...vals([1]), { value: 6, consumed: false, label: null }] } });
  assert.deepEqual(planNext([], 6), { create: { diceType: 'any', values: [{ value: 6 }] } });
  assert.deepEqual(planNext([{ id: 7, diceType: 'd20', values: vals([2]) }], 6), { create: { diceType: 'any', values: [{ value: 6 }] } });
  // fila d20 com um usado na frente: a nova fura antes dela inteira
  rigs = [{ id: 1, diceType: 'd20', values: vals([20], 3) }];
  after = apply(rigs, planNext(rigs, 11));
  assert.equal(roll(after, 'd20'), 11);
  assert.equal(roll(after, 'd20'), 3);
});
