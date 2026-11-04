// E1.4 (onda 3): o ↶ que não some — Voltar turno enquanto há turno anterior; a última ação
// de PV/condição com Desfazer até a próxima; o ↶ em cada linha do Registro que o servidor
// ainda sabe desfazer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canPrevTurn, lastUndo, logRows, prevTurnName, undoText } from '../src/play/undo-model.js';
import { logLine } from '../src/campaigns/monster-actions.js';

const list = [{ id: 'a', name: 'Pipo' }, { id: 'b', name: 'Goblin #2' }, { id: 'c', name: 'Dagna' }];
const fight = (log, round = 1, turnIndex = 1) => ({ active: true, round, turnIndex, combatants: list, log });

test('Voltar turno: vale enquanto o último Próximo deixou a vez onde ela está', () => {
  assert.equal(canPrevTurn(fight([{ type: 'start' }], 1, 0)), false);
  assert.equal(canPrevTurn(fight([{ type: 'start' }, { type: 'next_turn', round: 1, index: 1 }])), true);
  // depois de voltar: o Próximo de antes ainda vale (encadeia)
  const back = [{ type: 'start' }, { type: 'next_turn', round: 1, index: 1 }, { type: 'next_turn', round: 1, index: 2, undone: true }, { type: 'prev_turn', round: 1, index: 1 }];
  assert.equal(canPrevTurn(fight(back)), true);
  // voltou até o começo: não há mais para onde
  const start = [{ type: 'start' }, { type: 'next_turn', round: 1, index: 1, undone: true }, { type: 'prev_turn', round: 1, index: 0 }];
  assert.equal(canPrevTurn(fight(start, 1, 0)), false);
  // a vez mudou por outro caminho (ordem refeita): a foto não vale
  assert.equal(canPrevTurn(fight([{ type: 'next_turn', round: 1, index: 2 }])), false);
  // registro curto sem nenhum Próximo à vista: o servidor decide (fora da 1ª vez)
  assert.equal(canPrevTurn(fight([{ type: 'damage', target: 'x', amount: 1 }], 2, 0)), true);
  assert.equal(canPrevTurn(fight([], 1, 0)), false);
  assert.equal(canPrevTurn({ active: false, log: [] }), false);
  assert.equal(prevTurnName(fight([], 1, 0)), 'Dagna');
  assert.equal(prevTurnName(fight([], 1, 2)), 'Goblin #2');
});

test('a última ação desfazível: só a ÚLTIMA, e só com a marca do servidor', () => {
  const dmg = { type: 'damage', target: 'Goblin #2', amount: 7, opId: 'op-1', undo: true };
  assert.deepEqual(lastUndo(fight([{ type: 'start' }, dmg]), 'pt').text, 'Goblin #2 −7');
  // o Próximo turno depois não esconde o ↶ do dano
  assert.equal(lastUndo(fight([dmg, { type: 'next_turn', round: 1, index: 2 }])).opId, 'op-1');
  // uma ação nova sem a marca (sem opId, servidor de antes) tira o ↶ da de trás
  assert.equal(lastUndo(fight([dmg, { type: 'damage', target: 'Pipo', amount: 1 }])), null);
  // desfeita: volta a valer a de antes (se o servidor ainda souber)
  const heal = { type: 'heal', target: 'Dagna', healed: 5, opId: 'op-2', undone: true };
  assert.equal(lastUndo(fight([dmg, heal, { type: 'undo', of: 'heal', target: 'Dagna' }])).opId, 'op-1');
  // Vários alvos: uma entrada por alvo, o mesmo opId
  const many = [
    { type: 'damage', target: 'Goblin #1', amount: 14, opId: 'op-3', undo: true },
    { type: 'damage', target: 'Goblin #2', amount: 7, opId: 'op-3', undo: true },
  ];
  assert.deepEqual(lastUndo(fight(many), 'pt').text, '2 alvos (−)');
  assert.equal(lastUndo(fight(many), 'en').text, '2 targets (−)');
  assert.equal(undoText([{ type: 'add_condition', target: 'Pipo', condition: 'poisoned' }], 'pt'), 'Pipo: + envenenado');
  assert.equal(undoText([{ type: 'temp_hp', target: 'Kaelor', temp: 5 }], 'en'), 'Kaelor +5 temp');
  assert.equal(lastUndo(null), null);
});

test('Registro recente: o ↶ só na linha que o servidor sabe desfazer (uma vez por opId)', () => {
  const log = [
    { type: 'start' },
    { type: 'damage', target: 'Goblin #1', amount: 3, opId: 'op-a', undo: true },
    { type: 'damage', target: 'Goblin #2', amount: 3, opId: 'op-a', undo: true },
    { type: 'damage', target: 'Pipo', amount: 2 },
    { type: 'heal', target: 'Dagna', healed: 4, opId: 'op-b', undone: true },
  ];
  const rows = logRows(fight(log), (e) => logLine(e, 'pt'));
  assert.deepEqual(rows.map(r => r.opId), [null, null, 'op-a', null, null]);
  assert.match(rows[0].text, /desfeito/);
  assert.equal(logRows(fight(log), (e) => logLine(e, 'pt'), 2).length, 2);
});
