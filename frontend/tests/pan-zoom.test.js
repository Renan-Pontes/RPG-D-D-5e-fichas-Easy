// Contas do zoom e do arrasto dos mapas (pinça, um dedo, roda, ＋ − ⤢) —
// src/shell/usePanZoom.js. A vista é { z, x, y }: z = zoom (1 = cabe inteiro),
// (x, y) = onde fica o canto do conteúdo na caixa, em px de tela.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ZOOM_MIN, ZOOM_MAX, clampZoom, fitScale, fitView, clampView, toContent, toBox,
  zoomAround, stepZoom, panView, pinchView, wheelFactor, nearestHit, passedSlop, viewScale,
} from '../src/shell/usePanZoom.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);
const map = { w: 1200, h: 800 };
const phone = { w: 354, h: 236 };   // celular de 390 px: o mapa 3:2 enche a largura
const tall = { w: 354, h: 400 };    // caixa mais alta que o mapa

test('clampZoom: de 1× a 4×; lixo vira 1×', () => {
  assert.equal(ZOOM_MIN, 1);
  assert.equal(ZOOM_MAX, 4);
  assert.equal(clampZoom(0.3), 1);
  assert.equal(clampZoom(9), 4);
  assert.equal(clampZoom(2.5), 2.5);
  assert.equal(clampZoom(NaN), 1);
  assert.equal(clampZoom(undefined), 1);
});

test('fitScale / fitView: o mapa inteiro cabe e fica no meio', () => {
  near(fitScale(phone, map), 0.295);
  assert.deepEqual(fitView(phone, map), { z: 1, x: 0, y: 0 });
  const v = fitView(tall, map);
  assert.equal(v.z, 1);
  near(v.x, 0);
  near(v.y, (400 - 800 * 0.295) / 2); // faixa igual em cima e embaixo
  // mapa em pé numa caixa deitada: centraliza na largura
  const v2 = fitView({ w: 800, h: 400 }, { w: 400, h: 800 });
  near(v2.x, (800 - 200) / 2);
  near(v2.y, 0);
  // sem medida ainda: não quebra
  assert.deepEqual(fitView({ w: 0, h: 0 }, map), { z: 1, x: 0, y: 0 });
  assert.equal(fitScale({ w: 0, h: 0 }, map), 1);
});

test('clampView: sem vão nas bordas quando ampliado; no meio quando cabe', () => {
  // 2×: o mapa tem 708×472 na tela; x vai de 354-708 = -354 a 0
  assert.deepEqual(clampView({ z: 2, x: 50, y: 30 }, phone, map), { z: 2, x: 0, y: 0 });
  const v = clampView({ z: 2, x: -1000, y: -1000 }, phone, map);
  near(v.x, -354);
  near(v.y, -236);
  // zoom 1: não dá para empurrar o mapa para fora
  assert.deepEqual(clampView({ z: 1, x: 80, y: -40 }, phone, map), { z: 1, x: 0, y: 0 });
  // o zoom também é preso
  assert.equal(clampView({ z: 7, x: 0, y: 0 }, phone, map).z, 4);
  // caixa alta, 1,2×: na altura ainda cabe (centraliza), na largura já passa
  const t = clampView({ z: 1.2, x: 30, y: 0 }, tall, map);
  near(t.x, 0);
  near(t.y, (400 - 800 * 0.295 * 1.2) / 2);
});

test('toContent e toBox são inversos', () => {
  const v = { z: 2.5, x: -300, y: -120 };
  const p = toContent(v, 100, 60, phone, map);
  const back = toBox(v, p.x, p.y, phone, map);
  near(back.x, 100);
  near(back.y, 60);
  // zoom 1 no celular: o centro da caixa é o centro do mapa
  const c = toContent(fitView(phone, map), 177, 118, phone, map);
  near(c.x, 600);
  near(c.y, 400);
});

test('zoomAround: o ponto debaixo do dedo/cursor fica parado', () => {
  const v0 = fitView(phone, map);
  const before = toContent(v0, 200, 100, phone, map);
  const v1 = zoomAround(v0, 3, 200, 100, phone, map);
  assert.equal(v1.z, 3);
  const after = toContent(v1, 200, 100, phone, map);
  near(after.x, before.x, 1e-6);
  near(after.y, before.y, 1e-6);
  // além do limite: para em 4× e continua sem vão
  const v2 = zoomAround(v1, 50, 0, 0, phone, map);
  assert.equal(v2.z, 4);
  assert.ok(v2.x <= 0 && v2.y <= 0);
});

test('stepZoom (＋ −): passos de 1,5× entre 1× e 4×, em torno do meio', () => {
  let v = fitView(phone, map);
  const zs = [];
  for (let i = 0; i < 5; i++) { v = stepZoom(v, 1, phone, map); zs.push(+v.z.toFixed(3)); }
  assert.deepEqual(zs, [1.5, 2.25, 3.375, 4, 4]);
  // o meio do mapa continua no meio da caixa
  const c = toContent(v, phone.w / 2, phone.h / 2, phone, map);
  near(c.x, 600, 1e-6);
  near(c.y, 400, 1e-6);
  for (let i = 0; i < 6; i++) v = stepZoom(v, -1, phone, map);
  assert.deepEqual(v, fitView(phone, map));
  // 1,5 → 1 volta exatamente a 1 (sem 0,999…)
  assert.equal(stepZoom({ z: 1.5, x: 0, y: 0 }, -1, phone, map).z, 1);
});

test('panView: um dedo no fundo move a vista, sem passar das bordas', () => {
  const v = { z: 2, x: -100, y: -100 };
  assert.deepEqual(panView(v, 30, -20, phone, map), { z: 2, x: -70, y: -120 });
  const far = panView(v, 5000, 5000, phone, map);
  assert.deepEqual(far, { z: 2, x: 0, y: 0 });
  // no zoom 1 não há para onde ir
  assert.deepEqual(panView(fitView(phone, map), 60, 60, phone, map), fitView(phone, map));
});

test('pinchView: abrir os dedos amplia em torno do meio deles e arrasta junto', () => {
  const v0 = fitView(phone, map);
  const start = { view: v0, a: { x: 150, y: 100 }, b: { x: 200, y: 100 } };
  // dedos se afastam o dobro, mesmo meio (175,100)
  const v1 = pinchView(start, { x: 125, y: 100 }, { x: 225, y: 100 }, phone, map);
  assert.equal(v1.z, 2);
  const mid0 = toContent(v0, 175, 100, phone, map);
  const mid1 = toContent(v1, 175, 100, phone, map);
  near(mid1.x, mid0.x, 1e-6);
  near(mid1.y, mid0.y, 1e-6);
  // mesma abertura, o meio anda 40 px para a esquerda: a vista anda junto
  const start2 = { view: { z: 2, x: -200, y: -100 }, a: { x: 100, y: 100 }, b: { x: 200, y: 100 } };
  const v2 = pinchView(start2, { x: 60, y: 100 }, { x: 160, y: 100 }, phone, map);
  near(v2.z, 2);
  near(v2.x, -240);
  near(v2.y, -100);
  // fechar demais para em 1×; abrir demais para em 4×
  assert.equal(pinchView(start, { x: 174, y: 100 }, { x: 176, y: 100 }, phone, map).z, 1);
  assert.equal(pinchView(start, { x: 0, y: 0 }, { x: 354, y: 236 }, phone, map).z, 4);
  // dedos no mesmo ponto no começo: não divide por zero
  const z0 = pinchView({ view: v0, a: { x: 10, y: 10 }, b: { x: 10, y: 10 } }, { x: 10, y: 10 }, { x: 20, y: 10 }, phone, map);
  assert.ok(Number.isFinite(z0.z) && Number.isFinite(z0.x));
});

test('wheelFactor: roda para cima aproxima, para baixo afasta; trackpad é suave', () => {
  const up = wheelFactor(-100), down = wheelFactor(100);
  assert.ok(up > 1.15 && up < 1.3, String(up));
  near(up * down, 1, 1e-9);
  assert.ok(wheelFactor(-4) > 1 && wheelFactor(-4) < 1.01);
  // linhas (Firefox) contam como ~16 px; um puxão enorme não pula de 1× a 4×
  assert.ok(wheelFactor(-3, 1) > 1);
  assert.ok(wheelFactor(-5000) < 1.3);
});

test('nearestHit: toque de 44 px acha o token pequeno; dentro do desenho ganha', () => {
  const S = viewScale(fitView(phone, map), phone, map); // 0,295 px por unidade
  const minR = 22 / S; // 22 px de tela = raio do alvo de 44 px
  const tokens = [
    { id: 'goblin', x: 625, y: 125, r: 25 },
    { id: 'bugbear', x: 875, y: 225, r: 50 },
  ];
  // 15 px de tela ao lado do goblin (fora do desenho de 7 px): ainda acha
  assert.equal(nearestHit(tokens, { x: 625 + 15 / S, y: 125 }, minR)?.id, 'goblin');
  // longe de tudo: nada
  assert.equal(nearestHit(tokens, { x: 100, y: 700 }, minR), null);
  // sem raio mínimo (mouse no desktop grande): só dentro do desenho
  assert.equal(nearestHit(tokens, { x: 660, y: 125 }, 0), null);
  // dois sobrepostos: vence quem tem o ponto mais para dentro
  const pile = [{ id: 'big', x: 100, y: 100, r: 50 }, { id: 'small', x: 130, y: 100, r: 25 }];
  assert.equal(nearestHit(pile, { x: 130, y: 100 }, 0)?.id, 'small');
  assert.equal(nearestHit(pile, { x: 90, y: 100 }, 0)?.id, 'big');
  // mesmo lugar: o de cima (último desenhado)
  assert.equal(nearestHit([{ id: 'a', x: 0, y: 0, r: 10 }, { id: 'b', x: 0, y: 0, r: 10 }], { x: 0, y: 0 })?.id, 'b');
});

test('passedSlop: o dedo tem mais folga que o mouse antes de virar arrasto', () => {
  assert.equal(passedSlop(5, 0, 'touch'), false);
  assert.equal(passedSlop(5, 0, 'mouse'), true);
  assert.equal(passedSlop(6, 6, 'touch'), true);
  assert.equal(passedSlop(2, 2), false);
});
