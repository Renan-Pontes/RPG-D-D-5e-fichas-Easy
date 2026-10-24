import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editLogEntries, describeEditLogEntry, editLogFieldLabel, formatEditLogDate } from '../src/campaigns/edit-log.js';

const entry = (over = {}) => ({ at: '2026-10-24T14:05:00Z', by: 'Renan', byId: 3, field: 'languages', added: ['Elvish', 'Féerico'], removed: ['Dwarvish'], ...over });

test('servidor antigo / ficha sem registro: lista vazia (a seção não aparece)', () => {
  assert.deepEqual(editLogEntries({}), []);
  assert.deepEqual(editLogEntries(null), []);
  assert.deepEqual(editLogEntries({ editLog: 'lixo' }), []);
  assert.deepEqual(editLogEntries({ editLog: [null, 3, { at: 'x' }] }), []);
});

test('mais recente primeiro', () => {
  const list = editLogEntries({ editLog: [entry({ added: ['A'] }), entry({ added: ['B'] })] });
  assert.deepEqual(list.map(e => e.added[0]), ['B', 'A']);
  assert.deepEqual(list.map(e => e.seq), [1, 0]);
});

test('descreve idiomas com rótulo pt/en (personalizado como foi digitado)', () => {
  const pt = describeEditLogEntry(editLogEntries({ editLog: [entry()] })[0], 'pt');
  assert.equal(pt.field, 'Idiomas');
  assert.deepEqual(pt.added, ['Élfico', 'Féerico']);
  assert.deepEqual(pt.removed, ['Anão']);
  assert.equal(pt.by, 'Renan');
  assert.equal(pt.change, null);
  assert.match(pt.when, /2026/);
  const en = describeEditLogEntry(entry(), 'en');
  assert.equal(en.field, 'Languages');
  assert.deepEqual(en.added, ['Elvish', 'Féerico']);
});

test('campo simples (futuro) vira de → para; campo sem rótulo sai pelo id', () => {
  const d = describeEditLogEntry({ at: '2026-10-24T14:05:00Z', field: 'alignment', from: '', to: 'CG' }, 'pt');
  assert.deepEqual(d.change, { from: '—', to: 'CG' });
  assert.equal(d.field, 'alignment');
  assert.equal(editLogFieldLabel('languages', 'en'), 'Languages');
});

test('data inválida não quebra', () => {
  assert.equal(formatEditLogDate('não é data', 'pt'), '');
  assert.equal(formatEditLogDate(undefined, 'en'), '');
  const d = describeEditLogEntry({ field: 'languages', added: 'x' }, 'pt');
  assert.deepEqual(d.added, []);
  assert.equal(d.when, '');
});
