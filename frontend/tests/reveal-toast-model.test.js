import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshReveals, revealKey } from '../src/player/reveal-toast-model.js';

const e = (id, at, name = `E${id}`) => ({ id, name, revealedAt: at });

test('revelar um segredo de um cartão já avisado gera toast de novo (#17)', () => {
  const toasted = new Set();
  const first = freshReveals([e(81, '2026-10-06T20:00:00Z')], '2026-10-06T19:00:00Z', 1, toasted);
  assert.deepEqual(first.map(x => x.id), [81]);
  first.forEach(x => toasted.add(revealKey(x)));
  // mesma revelação de novo (poll repetido): nada
  assert.deepEqual(freshReveals([e(81, '2026-10-06T20:00:00Z')], '2026-10-06T19:00:00Z', 1, toasted), []);
  // o segredo s1 foi revelado: o servidor renova revealedAt → toast novo
  const again = freshReveals([e(81, '2026-10-06T20:05:00Z')], '2026-10-06T19:00:00Z', 1, toasted);
  assert.deepEqual(again.map(x => x.id), [81]);
});

test('filtra antes de cortar: duas revelações na mesma janela não somem', () => {
  const toasted = new Set([revealKey(e(1, '2026-10-06T20:10:00Z'))]);
  const list = [e(1, '2026-10-06T20:10:00Z'), e(2, '2026-10-06T20:09:00Z'), e(3, '2026-10-06T18:00:00Z')];
  assert.deepEqual(freshReveals(list, '2026-10-06T19:00:00Z', 1, toasted).map(x => x.id), [2]);
});

test('telão cobre só o que foi revelado até o instante do telão', () => {
  const shown = new Map([[7, '2026-10-06T20:01:00Z']]);
  const seen = '2026-10-06T19:00:00Z';
  assert.deepEqual(freshReveals([e(7, '2026-10-06T20:00:30Z')], seen, 1, new Set(), shown), []);
  assert.deepEqual(freshReveals([e(7, '2026-10-06T20:02:00Z')], seen, 1, new Set(), shown).map(x => x.id), [7]);
});

test('"👁 Revelar e mostrar": o cartão da Tela já avisou e o contador não troca o aviso por uma revelação antiga (D9)', () => {
  // Morvane revelada agora e avisada pelo cartão da Tela; Irmã Velna revelada há dois dias.
  const morvane = e(4, '2026-10-26T20:10:00Z', 'Morvane');
  const velna = e(3, '2026-10-24T18:00:00Z', 'Irmã Velna');
  const toasted = new Set([revealKey(morvane)]);
  const shown = new Map([[4, '2026-10-26T20:10:01Z']]);
  assert.deepEqual(freshReveals([morvane, velna], null, 1, toasted, shown), []);
  // duas revelações no mesmo poll (Borin pelo Mundo + Morvane pela Tela): só Borin
  const borin = e(2, '2026-10-26T20:09:30Z', 'Borin');
  assert.deepEqual(freshReveals([morvane, borin, velna], null, 2, toasted, shown).map(x => x.name), ['Borin']);
  // um segredo novo de Morvane depois de mostrada: avisa de novo
  assert.deepEqual(freshReveals([e(4, '2026-10-26T20:20:00Z', 'Morvane'), velna], null, 1, toasted, shown).map(x => x.id), [4]);
});

test('sem aumento no contador, sem toast', () => {
  assert.deepEqual(freshReveals([e(1, '2026-10-06T20:00:00Z')], null, 0), []);
});

test('mostrar não é revelar (D9): o cartão da Tela só avisa junto com a revelação', async () => {
  const { isRevealShow, cardRevealKey } = await import('../src/player/reveal-toast-model.js');
  const at = '2026-10-26T20:10:00Z';
  // "👁 Revelar e mostrar": revelado meio segundo antes de ir à Tela → avisa
  assert.equal(isRevealShow({ type: 'entry', entryId: 3, at, revealedAt: '2026-10-26T20:09:59.500Z' }), true);
  // cartão revelado há uma hora e só mostrado agora → não avisa
  assert.equal(isRevealShow({ type: 'entry', entryId: 3, at, revealedAt: '2026-10-26T19:10:00Z' }), false);
  // sem revealedAt (servidor antigo), recap ou nada → não avisa
  assert.equal(isRevealShow({ type: 'entry', entryId: 3, at }), false);
  assert.equal(isRevealShow({ type: 'recap', at, revealedAt: at }), false);
  assert.equal(isRevealShow(null), false);
  // revelado depois de mostrar (o worldNewCount avisa; este caminho não)
  assert.equal(isRevealShow({ type: 'entry', entryId: 3, at, revealedAt: '2026-10-26T20:12:00Z' }), false);
  assert.equal(cardRevealKey({ entryId: 3, revealedAt: at }), `3@${at}`);
});
