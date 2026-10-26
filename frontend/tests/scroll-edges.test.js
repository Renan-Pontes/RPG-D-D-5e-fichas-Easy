// Trilho que rola de lado (segmentado das subvistas, chips): degradê nas pontas
// e rolagem até o item ativo — src/shell/useScrollEdges.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollEdges, revealScrollLeft, markEdges } from '../src/shell/useScrollEdges.js';

test('scrollEdges: tudo cabe → sem degradê', () => {
  assert.deepEqual(scrollEdges({ scrollLeft: 0, clientWidth: 300, scrollWidth: 300 }), { l: false, r: false });
  // meio pixel de diferença não liga o degradê
  assert.deepEqual(scrollEdges({ scrollLeft: 0, clientWidth: 300, scrollWidth: 302 }), { l: false, r: false });
  assert.deepEqual(scrollEdges({}), { l: false, r: false });
});

test('scrollEdges: no começo, no meio e no fim', () => {
  const box = { clientWidth: 300, scrollWidth: 500 };
  assert.deepEqual(scrollEdges({ ...box, scrollLeft: 0 }), { l: false, r: true });
  assert.deepEqual(scrollEdges({ ...box, scrollLeft: 100 }), { l: true, r: true });
  assert.deepEqual(scrollEdges({ ...box, scrollLeft: 200 }), { l: true, r: false });
  assert.deepEqual(scrollEdges({ ...box, scrollLeft: 198 }), { l: true, r: false }); // folga de 4 px
});

test('revealScrollLeft: item à vista não rola; nada rola se tudo cabe', () => {
  const box = { scrollLeft: 0, clientWidth: 300, scrollWidth: 600 };
  assert.equal(revealScrollLeft(box, { start: 40, width: 80 }), null);
  assert.equal(revealScrollLeft({ scrollLeft: 0, clientWidth: 300, scrollWidth: 300 }, { start: 250, width: 80 }), null);
  assert.equal(revealScrollLeft({ scrollLeft: 0, clientWidth: 0, scrollWidth: 300 }, { start: 250, width: 80 }), null);
});

test('revealScrollLeft: item escondido à direita ou à esquerda entra com folga', () => {
  const box = { scrollLeft: 0, clientWidth: 300, scrollWidth: 600 };
  // fim do item em 450 → rola até 450 - 300 + 24 = 174
  assert.equal(revealScrollLeft(box, { start: 370, width: 80 }), 174);
  // item no começo com o trilho rolado → volta até start - 24
  assert.equal(revealScrollLeft({ ...box, scrollLeft: 250 }, { start: 100, width: 80 }), 76);
  // não passa do começo nem do fim
  assert.equal(revealScrollLeft({ ...box, scrollLeft: 250 }, { start: 10, width: 80 }), 0);
  assert.equal(revealScrollLeft(box, { start: 540, width: 60 }), 300);
});

test('revealScrollLeft: item quase do tamanho do trilho fica no meio', () => {
  const box = { scrollLeft: 0, clientWidth: 300, scrollWidth: 900 };
  assert.equal(revealScrollLeft(box, { start: 400, width: 280 }), 390);
});

test('markEdges: escreve data-l / data-r só quando muda', () => {
  const writes = [];
  const dataset = new Proxy({}, { set(o, k, v) { writes.push(`${String(k)}=${v}`); o[k] = v; return true; } });
  const el = { scrollLeft: 0, clientWidth: 300, scrollWidth: 500, dataset };
  markEdges(el);
  assert.equal(el.dataset.l, '');
  assert.equal(el.dataset.r, '1');
  const n = writes.length;
  markEdges(el);
  assert.equal(writes.length, n); // nada mudou, nada escrito
  el.scrollLeft = 200;
  markEdges(el);
  assert.equal(el.dataset.l, '1');
  assert.equal(el.dataset.r, '');
  assert.doesNotThrow(() => markEdges(null));
});
