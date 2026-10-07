import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelLabel, metaLine, readyErrorText, importedNote } from '../src/ready/ready-logic.js';

test('levelLabel: singular, faixa e inglês', () => {
  assert.equal(levelLabel('3', 'pt'), 'Nível 3');
  assert.equal(levelLabel('1–2', 'pt'), 'Níveis 1–2');
  assert.equal(levelLabel('2–3', 'en'), 'Levels 2–3');
  assert.equal(levelLabel('', 'pt'), '');
});

test('metaLine conta cenas, cartões e sessões nas duas línguas', () => {
  const a = { scenes: 8, cards: 19, sessions: '1–2' };
  assert.equal(metaLine(a, 'pt'), '8 cenas · 19 cartões do Mundo · 1–2 sessões');
  assert.equal(metaLine(a, 'en'), '8 scenes · 19 World cards · 1–2 sessions');
  assert.equal(metaLine({ scenes: 1, cards: 1, sessions: '1' }, 'pt'), '1 cena · 1 cartão do Mundo · 1 sessão');
  assert.equal(metaLine(null), '');
});

test('readyErrorText traduz os códigos do servidor', () => {
  assert.match(readyErrorText('already_imported', 'pt'), /já está na campanha/);
  assert.match(readyErrorText('world_full', 'en'), /too full/);
  assert.equal(readyErrorText('outro', 'pt'), null);
});

test('importedNote: sem festa, explica onde ficou e o que é oculto', () => {
  const pt = importedNote({ name: 'Maré de Cinzas', sessionPlanFilled: true }, 'pt');
  assert.match(pt, /Preparar › Aventuras/);
  assert.match(pt, /ocultos/);
  assert.match(pt, /plano da próxima sessão/);
  assert.doesNotMatch(pt, /parab|🎉|!/i);
  const en = importedNote({ name: 'The Ashen Tide', sessionPlanFilled: false }, 'en');
  assert.match(en, /hidden/);
  assert.doesNotMatch(en, /next session plan/);
  assert.equal(importedNote(null), '');
});
