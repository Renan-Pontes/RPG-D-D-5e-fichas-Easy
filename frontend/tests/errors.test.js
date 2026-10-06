import test from 'node:test';
import assert from 'node:assert/strict';
import { errorMessage, errorText } from '../src/api/errors.js';

test('código conhecido vira texto legível (PT/EN)', () => {
  const e = { message: 'campaign_uses_milestones', data: { error: 'campaign_uses_milestones' } };
  assert.match(errorMessage(e, 'pt'), /Marcos/);
  assert.match(errorMessage(e, 'en'), /Milestones/);
});

test('permissão negada usa o código do detail', () => {
  assert.equal(errorMessage({ message: 'forbidden', data: { error: 'forbidden', detail: 'dm_only' } }, 'pt'), 'Só o mestre pode fazer isso.');
});

test('erro de rede e código desconhecido', () => {
  assert.match(errorMessage(new TypeError('Failed to fetch'), 'pt'), /conexão/);
  assert.match(errorMessage({ message: 'xyz_code', data: { error: 'xyz_code' } }, 'pt'), /código: xyz_code/);
  assert.equal(errorMessage({ message: 'xyz_code' }, 'pt', 'Falhou.'), 'Falhou.');
});

test('issues do backend aparecem como lista', () => {
  assert.equal(errorMessage({ data: { issues: ['a', 'b'] } }, 'pt'), 'a · b');
  assert.equal(errorText('nao_existe', 'pt'), null);
});

test('códigos do mundo, telão e convite têm texto nas duas línguas', () => {
  for (const code of ['version_conflict', 'image_too_large', 'entry_hidden', 'too_many_entries', 'invite_invalid', 'character_already_in_campaign']) {
    const pt = errorText(code, 'pt');
    const en = errorText(code, 'en');
    assert.ok(pt && en && pt !== en, code);
    assert.doesNotMatch(pt, /código:/, code);
  }
  // 409 do mundo chega como { error: 'version_conflict', entry }
  assert.match(errorMessage({ message: 'version_conflict', data: { error: 'version_conflict', entry: {} } }, 'pt'), /outra aba/);
});
