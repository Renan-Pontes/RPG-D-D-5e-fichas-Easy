// Telão: subtítulo do recap sem repetição e detecção de link morto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { recapSubtitle, isDeadScreenLink } from '../src/screen/tv-logic.js';

test('recapSubtitle esconde títulos que só repetem "Anteriormente em <campanha>"', () => {
  const name = 'E1 Brumas do Iniciante';
  assert.equal(recapSubtitle('Anteriormente em E1 Brumas do Iniciante…', name), '');
  assert.equal(recapSubtitle('Anteriormente em E1 Brumas do Iniciante', name), '');
  assert.equal(recapSubtitle('anteriormente em e1 brumas do iniciante...', name), '');
  assert.equal(recapSubtitle('Previously on E1 Brumas do Iniciante', name), '');
  assert.equal(recapSubtitle('E1 Brumas do Iniciante', name), '');
  assert.equal(recapSubtitle('Anteriormente…', name), '');
  assert.equal(recapSubtitle('', name), '');
  assert.equal(recapSubtitle(null, name), '');
});

test('recapSubtitle mantém títulos de verdade', () => {
  const name = 'Vale';
  assert.equal(recapSubtitle('Sessão 3 — A cripta do sino', name), 'Sessão 3 — A cripta do sino');
  assert.equal(recapSubtitle('Anteriormente em Vale: a cripta', name), 'Anteriormente em Vale: a cripta');
  assert.equal(recapSubtitle('Valente', name), 'Valente');
});

test('isDeadScreenLink: só 404/410', () => {
  assert.equal(isDeadScreenLink({ status: 404 }), true);
  assert.equal(isDeadScreenLink({ status: 410 }), true);
  assert.equal(isDeadScreenLink({ status: 500 }), false);
  assert.equal(isDeadScreenLink({ status: 502 }), false);
  assert.equal(isDeadScreenLink(null), false);
  assert.equal(isDeadScreenLink(new Error('x')), false);
});
