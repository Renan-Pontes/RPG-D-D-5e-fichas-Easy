// A crônica vira história: acrescenta (não apaga) e não duplica.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCharacter } from '../src/creator/creation.js';
import { selectClass } from '../src/creator/class-helpers.js';
import { applyBackground } from '../src/creator/background-helpers.js';
import { chronicleText } from '../src/creator/chronicle.js';
import { withChronicle, hasChronicle, chroniclePreview } from '../src/creator/chronicle-story.js';

test('história vazia recebe a crônica inteira', () => {
  assert.equal(withChronicle('', 'Você nasceu anão.'), 'Você nasceu anão.');
  assert.equal(withChronicle(undefined, '  Você nasceu anão.  '), 'Você nasceu anão.');
});

test('com texto, junta com uma linha em branco e não apaga nada', () => {
  assert.equal(withChronicle('Tenho medo do escuro.', 'Você nasceu anão.'), 'Tenho medo do escuro.\n\nVocê nasceu anão.');
  assert.equal(withChronicle('Tenho medo do escuro.\n\n\n', 'Você nasceu anão.'), 'Tenho medo do escuro.\n\nVocê nasceu anão.');
});

test('não duplica a crônica que já está lá; crônica vazia não muda nada', () => {
  const once = withChronicle('Oi.', 'Você nasceu anão.');
  assert.equal(withChronicle(once, 'Você nasceu anão.'), once);
  assert.equal(hasChronicle(once, 'Você nasceu anão.'), true);
  assert.equal(hasChronicle('Oi.', ''), false);
  assert.equal(withChronicle('Oi.', ''), 'Oi.');
  assert.equal(withChronicle('Oi.', '   '), 'Oi.');
});

test('funciona com a crônica real (pt/en)', () => {
  let c = newCharacter('2024');
  c = { ...c, ...selectClass(c, 'fighter') };
  c = { ...c, ...applyBackground(c, 'soldier'), name: 'Brom' };
  for (const lang of ['pt', 'en']) {
    const t = chronicleText(c, lang);
    assert.ok(t.length > 20);
    const s = withChronicle('Minha história.', t);
    assert.ok(s.startsWith('Minha história.\n\n'));
    assert.ok(s.endsWith(t));
    assert.equal(withChronicle(s, t), s);
  }
});

test('prévia curta corta numa palavra', () => {
  assert.equal(chroniclePreview('Curto.'), 'Curto.');
  const long = 'Você nasceu anão, sob montanhas onde a pedra guarda a memória dos ancestrais. '.repeat(5);
  const p = chroniclePreview(long, 60);
  assert.ok(p.length <= 61);
  assert.ok(p.endsWith('…'));
  assert.ok(!/\s…$/.test(p));
});
