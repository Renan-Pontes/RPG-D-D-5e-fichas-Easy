// Front novo × servidor ainda não atualizado (a Vercel publica no merge; o PythonAnywhere
// é atualizado à mão depois): a rota nova dá a página HTML de 404 do Django.
import test from 'node:test';
import assert from 'node:assert/strict';
import { errorMessage, isOldServer } from '../src/api/errors.js';
import { legacyScreenCard } from '../src/stage/stage-legacy.js';

const old404 = Object.assign(new Error('backend_unavailable'), { status: 404, data: null });

test('isOldServer: só o 404 em HTML (rota que ainda não existe)', () => {
  assert.equal(isOldServer(old404), true);
  assert.equal(isOldServer(Object.assign(new Error('not_found'), { status: 404, data: { detail: 'not_found' } })), false);
  assert.equal(isOldServer(Object.assign(new Error('entry_not_found'), { status: 404, data: { error: 'entry_not_found' } })), false);
  assert.equal(isOldServer(Object.assign(new Error('backend_unavailable'), { status: 502, data: null })), false);
  assert.equal(isOldServer(null), false);
});

test('errorMessage diz que falta atualizar o servidor', () => {
  assert.match(errorMessage(old404, 'pt'), /ainda não foi atualizado/);
  assert.match(errorMessage(old404, 'en'), /hasn't been updated/);
});

test('legacyScreenCard: o que o screen-card antigo sabe fazer', () => {
  assert.deepEqual(legacyScreenCard({ op: 'show', target: { kind: 'card', entryId: 7 } }), { type: 'entry', entryId: 7 });
  assert.deepEqual(legacyScreenCard({ op: 'show', target: { kind: 'card', entryId: 7, secretIds: ['s1'] } }), { type: 'entry', entryId: 7, secretIds: ['s1'] });
  assert.deepEqual(legacyScreenCard({ op: 'show', target: { kind: 'recap', title: 'T', text: 'x' } }), { type: 'recap', title: 'T', text: 'x' });
  assert.deepEqual(legacyScreenCard({ op: 'show', target: { kind: 'scene', advId: 2, nodeId: 'n1' } }), { type: 'scene', adventureId: 2, nodeId: 'n1' });
  assert.equal(legacyScreenCard({ op: 'back' }), null);
  assert.equal(legacyScreenCard({ op: 'clear' }), null);
});

test('legacyScreenCard: o resto não existe no servidor antigo', () => {
  for (const body of [
    { op: 'show', target: { kind: 'image', ref: { entryId: 7 } } },
    { op: 'show', target: { kind: 'text', text: 'oi' } },
    { op: 'show', target: { kind: 'scene', sceneId: 'c1' } },
    { op: 'undo' }, { op: 'dark', on: true }, { op: 'bg', bg: 'map' }, { op: 'prefs', prefs: {} },
  ]) assert.equal(legacyScreenCard(body), undefined, JSON.stringify(body));
});
