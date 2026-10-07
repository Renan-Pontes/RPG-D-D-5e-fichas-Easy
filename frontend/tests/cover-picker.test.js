// Escolha de capa (G4): galeria de capas prontas e recorte 16:9.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  CAMPAIGN_COVERS, CAMPAIGN_COVER_RESERVE, buildCampaignCovers, campaignCoverName,
} from '../src/art.js';
import manifest from '../src/art-covers.json' with { type: 'json' };
import {
  cropRect16x9, coverOutputSize, needsVerticalFrame, coverErrorText, COVER_MAX_W,
} from '../src/campaigns/cover-logic.js';

const pub = (p) => fileURLToPath(new URL(`../public${p}`, import.meta.url));

test('manifesto de capas é um array de ids', () => {
  assert.ok(Array.isArray(manifest));
  for (const id of manifest) assert.match(id, /^[A-Za-z0-9_-]+$/);
});

test('toda capa da galeria existe em public/ e tem nome pt/en', () => {
  assert.ok(CAMPAIGN_COVERS.length >= 8);
  const ids = new Set();
  for (const c of CAMPAIGN_COVERS) {
    assert.ok(!ids.has(c.id), `id repetido ${c.id}`);
    ids.add(c.id);
    assert.ok(existsSync(pub(c.src)), `arquivo faltando: ${c.src}`);
    assert.equal(c.name.length, 2);
    assert.ok(c.name[0] && c.name[1]);
  }
});

test('manifesto vem primeiro; reserva completa até o mínimo', () => {
  const list = buildCampaignCovers(['cover-dark-forest', 'mountain-kingdom'], 5);
  assert.deepEqual(list.map(c => c.id).slice(0, 2), ['cover-dark-forest', 'mountain-kingdom']);
  assert.equal(list[0].src, '/art/covers/cover-dark-forest.webp');
  assert.deepEqual(list[0].name, ['Floresta sombria', 'Dark forest']);
  assert.deepEqual(list[1].name, ['Reino nas montanhas', 'Mountain kingdom']);
  assert.equal(list.length, 5);
  assert.deepEqual(list.slice(2).map(c => c.id), CAMPAIGN_COVER_RESERVE.slice(0, 3).map(c => c.id));
});

test('manifesto cheio dispensa a reserva; ids estranhos e repetidos são ignorados', () => {
  const many = Array.from({ length: 12 }, (_, i) => `c${i}`);
  assert.equal(buildCampaignCovers(many, 12).length, 12);
  assert.ok(buildCampaignCovers(many, 12).every(c => c.src.startsWith('/art/covers/')));
  const odd = buildCampaignCovers(['../x', 'a b', '', null, 'ok', 'ok'], 1);
  assert.deepEqual(odd.map(c => c.id), ['ok']);
  assert.deepEqual(odd[0].name, ['Ok', 'Ok']);
  assert.deepEqual(buildCampaignCovers(undefined, 2).map(c => c.id), CAMPAIGN_COVER_RESERVE.slice(0, 2).map(c => c.id));
});

test('nome do clima por idioma', () => {
  const c = { name: ['Floresta sombria', 'Dark forest'] };
  assert.equal(campaignCoverName(c, 'pt'), 'Floresta sombria');
  assert.equal(campaignCoverName(c, 'en'), 'Dark forest');
  assert.equal(campaignCoverName(null, 'pt'), '');
});

test('recorte 16:9: imagem larga corta as laterais, centralizado', () => {
  assert.deepEqual(cropRect16x9(2000, 900), { sx: 200, sy: 0, sw: 1600, sh: 900 });
  assert.deepEqual(cropRect16x9(1600, 900), { sx: 0, sy: 0, sw: 1600, sh: 900 });
});

test('recorte 16:9: imagem alta corta em cima/embaixo conforme o enquadramento', () => {
  assert.deepEqual(cropRect16x9(900, 1600, 0.5), { sx: 0, sy: 547, sw: 900, sh: 506 });
  assert.equal(cropRect16x9(900, 1600, 0).sy, 0);
  assert.equal(cropRect16x9(900, 1600, 1).sy, 1600 - 506);
  assert.equal(cropRect16x9(900, 1600, 7).sy, 1600 - 506);   // limitado
  assert.equal(cropRect16x9(900, 1600, NaN).sy, 547);        // padrão: centro
  const r = cropRect16x9(1, 1);
  assert.ok(r.sw >= 1 && r.sh >= 1);
});

test('tamanho final nunca amplia e respeita a largura máxima', () => {
  assert.deepEqual(coverOutputSize(640, 360), { w: 640, h: 360 });
  assert.deepEqual(coverOutputSize(3200, 1800), { w: COVER_MAX_W, h: 900 });
});

test('enquadrar só aparece para imagens mais altas que 16:9', () => {
  assert.equal(needsVerticalFrame(1600, 900), false);
  assert.equal(needsVerticalFrame(2000, 900), false);
  assert.equal(needsVerticalFrame(1000, 1000), true);
  assert.equal(needsVerticalFrame(0, 0), false);
});

test('mensagens de erro em pt e en', () => {
  assert.match(coverErrorText('not_image', 'pt'), /imagem/);
  assert.match(coverErrorText('not_image', 'en'), /image/);
  assert.match(coverErrorText('image_too_large', 'pt'), /20 MB/);
  assert.ok(coverErrorText('whatever', 'pt').length > 0);
});
