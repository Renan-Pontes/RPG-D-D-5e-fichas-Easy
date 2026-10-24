import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, TONES, TONE_GLOW, mixHex, dieColors, stageTone } from '../src/dice/dice-tones.js';

test('mixHex: extremos, meio e entradas fora da faixa', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0), '#000000');
  assert.equal(mixHex('#000000', '#ffffff', 1), '#ffffff');
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mixHex('#102030', '#102030', 0.7), '#102030');
  assert.equal(mixHex('#000000', '#ffffff', 2), '#ffffff');
  assert.equal(mixHex('#000000', '#ffffff', -1), '#000000');
  assert.equal(mixHex('#fff', '#000', 0), '#ffffff');
});

test('dado rolando (t = 0) tem a cor normal do tipo, mesmo sendo crítico ou falha', () => {
  for (const tone of ['crit', 'fumble']) {
    const c = dieColors('d20', tone, 0);
    assert.equal(c.body, PALETTE.d20.body);
    assert.equal(c.ink, PALETTE.d20.ink);
    assert.equal(c.edge, PALETTE.d20.edge);
    assert.equal(c.glowIntensity, 0);
  }
});

test('depois de parar (t = 1) o dado está no tom; no meio, entre os dois', () => {
  const crit = dieColors('d20', 'crit', 1);
  assert.equal(crit.body, TONES.crit.body);
  assert.equal(crit.ink, TONES.crit.ink);
  assert.equal(crit.edge, TONES.crit.edge);
  assert.equal(crit.glow, TONES.crit.glow);
  assert.equal(crit.glowIntensity, TONE_GLOW);
  assert.equal(dieColors('d20', 'fumble', 1).body, TONES.fumble.body);
  const mid = dieColors('d20', 'crit', 0.5);
  assert.equal(mid.body, mixHex(PALETTE.d20.body, TONES.crit.body, 0.5));
  assert.ok(mid.glowIntensity > 0 && mid.glowIntensity < TONE_GLOW);
});

test('sem tom, tom desconhecido ou dado descartado: sempre a cor normal', () => {
  assert.deepEqual(dieColors('d6'), { ...PALETTE.d6, glow: '#000000', glowIntensity: 0 });
  assert.equal(dieColors('d20', 'bogus', 1).body, PALETTE.d20.body);
  assert.equal(dieColors('d20', 'crit', 1, { dimmed: true }).body, PALETTE.d20.body);
  assert.equal(dieColors('d999', null).body, PALETTE.d20.body); // tipo desconhecido usa o d20
});

test('stageTone: nada enquanto rola; o tom pedido só depois de parar', () => {
  assert.equal(stageTone('crit', false), null);
  assert.equal(stageTone('fumble', false), null);
  assert.equal(stageTone('crit', true), 'crit');
  assert.equal(stageTone('fumble', true), 'fumble');
  assert.equal(stageTone(null, true), null);
  assert.equal(stageTone('bogus', true), null);
});
