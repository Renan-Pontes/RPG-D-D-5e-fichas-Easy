// V10 · O 🎲 do mestre na mesa: o contexto da campanha, o destino lembrado (🔒/📺),
// a fórmula nos grupos do servidor e os valores que voltam para o rolador desenhar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFormula, rollFormula } from '../src/dice/dice-math.js';
import {
  clearDiceTable, getDiceTable, presetFromServer, purposeLabel, readTarget, rollBody, serverGroups, setDiceTable,
  subscribeDiceTable, targetKey, writeTarget,
} from '../src/dice/dice-table.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('a casca do mestre diz a campanha; sair limpa só se ainda é ela', () => {
  const seen = [];
  const off = subscribeDiceTable(c => seen.push(c?.campaignId ?? null));
  setDiceTable({ campaignId: 1, dmDefault: 'secret' });
  assert.equal(getDiceTable().campaignId, 1);
  clearDiceTable(2);
  assert.equal(getDiceTable().campaignId, 1);
  clearDiceTable(1);
  assert.equal(getDiceTable(), null);
  off();
  setDiceTable({ campaignId: 3 });
  assert.deepEqual(seen, [1, null]);
  setDiceTable(null);
});

test('destino: o lembrado no aparelho vence; senão a regra "Do mestre"', () => {
  const store = memory();
  assert.equal(readTarget(null, store), 'secret');
  assert.equal(readTarget({ campaignId: 5, dmDefault: 'shown' }, store), 'shown');
  assert.equal(readTarget({ campaignId: 5 }, store), 'secret');
  writeTarget({ campaignId: 5 }, 'shown', store);
  assert.equal(store.getItem(targetKey(5)), 'shown');
  assert.equal(readTarget({ campaignId: 5, dmDefault: 'secret' }, store), 'shown');
  const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('x'); } };
  assert.equal(readTarget({ campaignId: 5, dmDefault: 'shown' }, broken), 'shown');
  writeTarget({ campaignId: 5 }, 'secret', broken);   // não quebra
});

test('fórmula → grupos do servidor (ou null quando não cabe)', () => {
  assert.deepEqual(serverGroups(parseFormula('1d8+2d6+3')), [
    { diceType: 'd8', count: 1, sign: 1 }, { diceType: 'd6', count: 2, sign: 1 }]);
  assert.deepEqual(serverGroups(parseFormula('1d20-1d4')), [
    { diceType: 'd20', count: 1, sign: 1 }, { diceType: 'd4', count: 1, sign: -1 }]);
  assert.equal(serverGroups(parseFormula('21d6')), null);
  assert.equal(serverGroups(parseFormula('20d6+20d8+1d4')), null);
  assert.equal(serverGroups(null), null);
});

test('corpo do POST: Na tela/Só eu, bônus, vantagem só no 1d20 e o "Para quê?"', () => {
  const ctx = { campaignId: 9 };
  assert.deepEqual(rollBody(ctx, parseFormula('1d20+5'), { label: purposeLabel('attack'), adv: 'adv', shown: true }), {
    campaignId: 9, groups: [{ diceType: 'd20', count: 1, sign: 1 }], modifier: 5, label: 'Ataque', table: true, adv: 'adv' });
  const b = rollBody(ctx, parseFormula('2d6+3'), { adv: 'adv' });
  assert.equal(b.adv, undefined);
  assert.equal(b.table, false);
  assert.equal(b.label, '2d6+3');
  assert.equal(rollBody(null, parseFormula('1d20')), null);
  assert.equal(purposeLabel('luck', 'en'), 'Luck');
  assert.equal(purposeLabel('nada'), '');
});

test('os valores do servidor desenham o mesmo resultado no rolador', () => {
  const parsed = parseFormula('1d20+2');
  const res = { results: [{ value: 4, kept: false }, { value: 17, kept: true }], total: 17 };
  const r = rollFormula(parsed, { adv: 'adv', preset: presetFromServer(res) });
  assert.equal(r.total, 19);
  assert.deepEqual(r.groups[0].rolls, [{ value: 4, kept: false }, { value: 17, kept: true }]);
  const mixed = rollFormula(parseFormula('1d8+2d6'), { preset: presetFromServer({ results: [{ value: 5 }, { value: 2 }, { value: 6 }] }) });
  assert.equal(mixed.total, 13);
});
