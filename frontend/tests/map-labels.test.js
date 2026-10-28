// Rótulos dos marcadores do mapa do Mundo (src/world/map-labels.js): só os que
// cabem aparecem, nunca um rótulo em cima de outro nem da cabeça de outro pin.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EDGE, FORCE, GAP, HEAD_H, HEAD_W, LABEL_H, headRect, hits, labelRect, layoutPinLabels, pinInBox, pinPriority, zoomControlsRect,
} from '../src/world/map-labels.js';

const box = { w: 300, h: 214 };       // o mapa do mestre a 320 px
const pin = (id, x, y, w = 100, prio = 1) => ({ id, x, y, w, prio });

test('headRect: a cabeça fica logo acima da ponta', () => {
  assert.deepEqual(headRect({ x: 100, y: 80 }), { l: 100 - HEAD_W / 2, t: 80 - HEAD_H, r: 100 + HEAD_W / 2, b: 80 });
});

test('labelRect: embaixo da ponta e centrado; em cima da cabeça com above', () => {
  const r = labelRect(pin('a', 150, 100, 80), false, box);
  assert.equal(r.l, 110);
  assert.equal(r.r, 190);
  assert.equal(r.t, 100 + GAP);
  assert.equal(r.b, 100 + GAP + LABEL_H);
  assert.equal(r.dx, 0);
  const up = labelRect(pin('a', 150, 100, 80), true, box);
  assert.equal(up.b, 100 - HEAD_H - GAP);
  assert.equal(up.t, up.b - LABEL_H);
});

test('labelRect: perto da borda, o rótulo é empurrado para dentro (dx diz quanto)', () => {
  const left = labelRect(pin('a', 10, 100, 80), false, box);
  assert.equal(left.l, EDGE);
  assert.equal(left.dx, EDGE + 40 - 10);
  const right = labelRect(pin('b', 295, 100, 80), false, box);
  assert.equal(right.r, box.w - EDGE);
  assert.ok(right.dx < 0);
});

test('hits: cruzar conta, encostar não', () => {
  assert.ok(hits({ l: 0, t: 0, r: 10, b: 10 }, { l: 5, t: 5, r: 15, b: 15 }));
  assert.ok(!hits({ l: 0, t: 0, r: 10, b: 10 }, { l: 10, t: 0, r: 20, b: 10 }));
  assert.ok(!hits({ l: 0, t: 0, r: 10, b: 10 }, { l: 0, t: 10, r: 10, b: 20 }));
});

test('dois marcadores longe: os dois rótulos aparecem', () => {
  const out = layoutPinLabels([pin('a', 60, 60, 90), pin('b', 220, 160, 90)], box);
  assert.deepEqual([...out.keys()].sort(), ['a', 'b']);
  assert.equal(out.get('a').above, false);
});

test('dois marcadores quase juntos: um rótulo embaixo e o outro em cima da cabeça', () => {
  const out = layoutPinLabels([pin('a', 150, 100, 120), pin('b', 160, 110, 120)], box);
  assert.equal(out.size, 2);
  assert.notEqual(out.get('a').above, out.get('b').above);
});

test('três marcadores colados: sobra vaga para 2 rótulos; o selecionado sempre tem', () => {
  const pins = [pin('a', 150, 100, 120), pin('b', 152, 102, 120), pin('c', 154, 104, 120)];
  const out = layoutPinLabels(pins, box);
  assert.equal(out.size, 2);
  const sel = layoutPinLabels([pin('a', 150, 100, 120), pin('b', 152, 102, 120), pin('c', 154, 104, 120, FORCE)], box);
  assert.ok(sel.has('c'));
  assert.equal(sel.size, 2);
});

test('o rótulo não cobre a cabeça de outro marcador (vai para cima ou some)', () => {
  // b está logo abaixo de a: o rótulo de a (embaixo) cairia na cabeça de b
  const a = pin('a', 150, 60, 80, 1);
  const b = pin('b', 150, 60 + GAP + 30, 0, 1);   // b sem rótulo
  const out = layoutPinLabels([a, b], box);
  assert.ok(!out.has('a') || out.get('a').above === true);
  // em cima não cabe (a perto do topo): fica sem rótulo
  const out2 = layoutPinLabels([pin('a', 150, HEAD_H + 2, 80), pin('b', 150, HEAD_H + 2 + GAP + 30, 0)], box);
  assert.ok(!out2.has('a'));
});

test('nenhum par de rótulos escolhidos se cruza (muitos marcadores juntos)', () => {
  const pins = [];
  for (let i = 0; i < 14; i++) pins.push(pin(`p${i}`, 20 + (i * 37) % 260, 50 + (i * 53) % 150, 60 + (i % 5) * 20, i % 3));
  const out = layoutPinLabels(pins, box);
  const rects = [...out.entries()].map(([id, o]) => labelRect(pins.find(p => p.id === id), o.above, box));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) assert.ok(!hits(rects[i], rects[j]), `${i}×${j}`);
  // e nenhum rótulo cobre a cabeça de outro marcador
  for (const [id, o] of out) {
    const r = labelRect(pins.find(p => p.id === id), o.above, box);
    for (const p of pins) if (p.id !== id && pinInBox(p, box)) assert.ok(!hits(r, headRect(p)), `${id} cobre ${p.id}`);
  }
  assert.ok(out.size > 0);
});

test('fora da caixa (zoom levou para longe): sem rótulo e não atrapalha os outros', () => {
  const out = layoutPinLabels([pin('fora', -200, 100, 80), pin('a', 150, 100, 80)], box);
  assert.ok(!out.has('fora'));
  assert.ok(out.has('a'));
  assert.equal(pinInBox({ x: 150, y: -5 }, box), false);
  assert.equal(pinInBox({ x: NaN, y: 10 }, box), false);
});

test('rótulo que passaria da borda de baixo vai para cima da cabeça', () => {
  const out = layoutPinLabels([pin('a', 150, box.h - 4, 80)], box);
  assert.equal(out.get('a').above, true);
});

test('o selecionado aparece mesmo cortado pela borda; os outros não', () => {
  // caixa baixinha: nem embaixo nem em cima cabe
  const small = { w: 300, h: 50 };
  assert.equal(layoutPinLabels([pin('a', 150, 45, 80, 1)], small).size, 0);
  assert.equal(layoutPinLabels([pin('a', 150, 45, 80, FORCE)], small).size, 1);
});

test('mesma entrada, mesma saída (empate decidido pela altura e pelo id)', () => {
  const pins = [pin('b', 150, 100, 120), pin('a', 150, 100, 120)];
  const one = layoutPinLabels(pins, box);
  const two = layoutPinLabels([...pins].reverse(), box);
  assert.deepEqual([...one.entries()], [...two.entries()]);
  assert.equal(one.get('a').above, false);   // 'a' escolhe primeiro: fica embaixo
  assert.equal(one.get('b').above, true);
});

test('sem rótulo (w 0) não ocupa vaga; lista vazia ou lixo não quebra', () => {
  assert.equal(layoutPinLabels([pin('a', 150, 100, 0)], box).size, 0);
  assert.equal(layoutPinLabels([], box).size, 0);
  assert.equal(layoutPinLabels(null, box).size, 0);
  assert.equal(layoutPinLabels([null, { x: 1 }], box).size, 0);
});

test('pinPriority: selecionado > novo > visível > oculto', () => {
  assert.equal(pinPriority({ selected: true }), FORCE);
  assert.ok(pinPriority({ isNew: true }) > pinPriority({ visible: true }));
  assert.ok(pinPriority({ visible: true }) > pinPriority({ visible: false }));
  assert.equal(pinPriority(), 0);
});

test('avoid: nenhum rótulo embaixo dos botões ＋ − ⤢ (nem o do selecionado)', () => {
  const z = zoomControlsRect(box);
  assert.deepEqual(z, { l: 300 - 8 - 44, t: 214 - 8 - 144, r: 300 - 8, b: 214 - 8 });
  // marcador perto do canto: o rótulo (embaixo ou em cima) cairia nos botões
  const p = pin('a', 255, 150, 90);
  assert.ok(layoutPinLabels([p], box).has('a'));
  const out = layoutPinLabels([p], box, { avoid: [z] });
  if (out.has('a')) assert.ok(!hits(labelRect(p, out.get('a').above, box), z));
  const sel = layoutPinLabels([pin('a', 255, 150, 90, FORCE)], box, { avoid: [z] });
  if (sel.has('a')) assert.ok(!hits(labelRect(pin('a', 255, 150, 90), sel.get('a').above, box), z));
  // longe dos botões, nada muda
  assert.ok(layoutPinLabels([pin('b', 60, 60, 90)], box, { avoid: [z] }).has('b'));
  assert.equal(zoomControlsRect({ w: 0, h: 0 }), null);
  assert.equal(layoutPinLabels([pin('b', 60, 60, 90)], box, { avoid: [null] }).size, 1);
});
