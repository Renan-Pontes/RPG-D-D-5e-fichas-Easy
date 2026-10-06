// Rota da campanha na URL (#c/<slug>/<área>/<sub>) e a área inicial vinda dela.
import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignRoute, parseCampaignRoute, initialArea } from '../src/shell/shell-logic.js';

test('campaignRoute monta o hash com slug, área e subvista', () => {
  assert.equal(campaignRoute('vale-de-teste', 'world', 'map'), '#c/vale-de-teste/world/map');
  assert.equal(campaignRoute('vale-de-teste', 'table'), '#c/vale-de-teste/table');
  assert.equal(campaignRoute('vale-de-teste'), '#c/vale-de-teste');
  assert.equal(campaignRoute(12, 'play', 'combat'), '#c/12/play/combat');
});

test('campaignRoute recusa slug ou partes estranhas', () => {
  assert.equal(campaignRoute(''), '');
  assert.equal(campaignRoute(null), '');
  assert.equal(campaignRoute('a/b'), '');
  assert.equal(campaignRoute('ok', 'wor ld', 'x'), '#c/ok');
  assert.equal(campaignRoute('ok', 'world', '<x>'), '#c/ok/world');
});

test('parseCampaignRoute lê o hash de volta', () => {
  assert.deepEqual(parseCampaignRoute('#c/vale-de-teste/world/map'), { slug: 'vale-de-teste', area: 'world', sub: 'map' });
  assert.deepEqual(parseCampaignRoute('#c/vale/table'), { slug: 'vale', area: 'table', sub: null });
  assert.deepEqual(parseCampaignRoute('#c/vale'), { slug: 'vale', area: null, sub: null });
  assert.deepEqual(parseCampaignRoute('#c/vale/'), { slug: 'vale', area: null, sub: null });
  for (const h of [campaignRoute('x-1', 'group', 'chronicle'), campaignRoute('7', 'prepare')]) {
    assert.equal(campaignRoute(...Object.values(parseCampaignRoute(h))), h);
  }
});

test('parseCampaignRoute ignora outros hashes', () => {
  for (const h of ['', '#', '#grimorio/x', '#s=abc', '#join=XYZ', '#c/', '#c/a b', '#c/%E0%A4%A', null, undefined]) {
    assert.equal(parseCampaignRoute(h), null, String(h));
  }
});

test('initialArea: a área da URL vence sessão ao vivo e memória', () => {
  assert.deepEqual(
    initialArea({ isDM: true, live: true, combatActive: true, remembered: { area: 'prepare', sub: 'next' }, fromUrl: { area: 'world', sub: 'map' } }),
    { area: 'world', sub: 'map' },
  );
  assert.deepEqual(initialArea({ isDM: false, fromUrl: { area: 'chronicle', sub: null } }), { area: 'chronicle', sub: null });
});

test('initialArea: área inválida na URL cai na regra normal', () => {
  assert.deepEqual(initialArea({ isDM: false, fromUrl: { area: 'play', sub: 'combat' } }), { area: 'table', sub: null });
  assert.deepEqual(initialArea({ isDM: true, live: true, fromUrl: { area: 'nada' } }), { area: 'play', sub: 'scene' });
  // subvista inválida → padrão da área
  assert.deepEqual(initialArea({ isDM: true, fromUrl: { area: 'world', sub: 'xyz' } }), { area: 'world', sub: 'atlas' });
});

import { ACCENTS, ACCENT_NAMES, accentName, COVER_ART, coverArtName } from '../src/shell/shell-logic.js';

test('toda cor de destaque e toda arte de capa têm nome legível', () => {
  for (const c of ACCENTS) {
    assert.ok(ACCENT_NAMES[c], c);
    assert.doesNotMatch(accentName(c, 'pt'), /#/);
    assert.doesNotMatch(accentName(c, 'en'), /#/);
  }
  assert.equal(accentName('#6B5CA5', 'pt'), 'Violeta');
  assert.equal(accentName('#123456', 'en'), 'Custom color');
  for (const p of COVER_ART) {
    assert.match(coverArtName(p, 'pt'), /^Capa: (?!Arte$)/);
    assert.match(coverArtName(p, 'en'), /^Cover: /);
  }
  assert.equal(coverArtName('/art/backgrounds/wayfarer.webp', 'pt'), 'Capa: Viajante');
});
