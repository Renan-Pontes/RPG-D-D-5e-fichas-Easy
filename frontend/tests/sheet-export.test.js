import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXPORT_OPTIONS, exportText, runExport } from '../src/sheet/export-options.js';

// Modal Exportar da ficha: as 5 saídas que eram botões soltos na barra de ações.
test('nenhuma saída sumiu: imprimir, os dois PDFs, o link e o JSON, na ordem dos botões antigos', () => {
  assert.deepEqual(EXPORT_OPTIONS.map(o => o.id), ['print', 'pdfEdit', 'pdfPrint', 'share', 'json']);
});

test('cada linha tem ícone, nome e frase do que faz em pt e en (e o texto de "trabalhando")', () => {
  for (const o of EXPORT_OPTIONS) {
    assert.ok(o.icon, o.id);
    for (const lang of ['pt', 'en']) {
      const tx = exportText(o, lang);
      assert.ok(tx.name && tx.desc && tx.busy, `${o.id} ${lang}`);
      assert.ok(tx.desc.length > tx.name.length, `${o.id} ${lang}: a frase explica a saída`);
    }
    assert.notEqual(exportText(o, 'pt').desc, exportText(o, 'en').desc, o.id);
  }
  // idioma sem texto cai no inglês
  assert.equal(exportText(EXPORT_OPTIONS[0], 'fr').name, 'Print');
  // o link continua avisando que precisa de conta (e que vale 24 h)
  const share = EXPORT_OPTIONS.find(o => o.id === 'share');
  assert.match(exportText(share, 'pt').desc, /24 horas/);
  assert.match(exportText(share, 'pt').desc, /conta/);
});

const spyHandlers = (ret) => {
  const calls = [];
  const h = (name) => (...args) => { calls.push([name, ...args]); return typeof ret === 'function' ? ret(name) : ret; };
  return { calls, handlers: { onPrint: h('onPrint'), onExportPdf: h('onExportPdf'), onShare: h('onShare'), onExport: h('onExport') } };
};

test('cada linha chama o handler de antes, com as mesmas opções, já dentro do clique', async () => {
  const want = {
    print: ['onPrint'],
    pdfEdit: ['onExportPdf', { flatten: false }],
    pdfPrint: ['onExportPdf', { flatten: true }],
    share: ['onShare'],
    json: ['onExport'],
  };
  for (const [id, call] of Object.entries(want)) {
    const { calls, handlers } = spyHandlers(Promise.resolve(true));
    const done = runExport(id, handlers);
    // síncrono: o Imprimir precisa abrir a aba no próprio clique (bloqueador de pop-up)
    assert.deepEqual(calls, [call], id);
    assert.equal(await done, true, id);
  }
});

test('resultado: fecha quando deu certo; fica aberto quando o handler diz que não deu', async () => {
  assert.equal(await runExport('json', spyHandlers(undefined).handlers), true); // handler antigo, sem retorno
  assert.equal(await runExport('json', spyHandlers(true).handlers), true);
  assert.equal(await runExport('share', spyHandlers(false).handlers), false); // sem conta: o toast avisa
  assert.equal(await runExport('pdfEdit', spyHandlers(Promise.resolve(false)).handlers), false);
  const quiet = console.error; console.error = () => {};
  try {
    assert.equal(await runExport('print', spyHandlers(() => Promise.reject(new Error('x'))).handlers), false);
    assert.equal(await runExport('print', spyHandlers(() => { throw new Error('x'); }).handlers), false);
    assert.equal(await runExport('print', {}), false); // sem handler: não quebra
  } finally { console.error = quiet; }
  assert.equal(await runExport('nada', spyHandlers(true).handlers), false);
});

// ---------- Contratos da tela (lidos do código, sem renderizar) ----------
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('app.jsx: os handlers de saída dizem se deu certo (o modal só fecha nesse caso)', () => {
  const s = src('../app.jsx');
  const body = (name) => s.slice(s.indexOf(`const ${name} =`), s.indexOf('\n  };\n', s.indexOf(`const ${name} =`)));
  for (const name of ['handleExport', 'handleExportPdf', 'handleShare', 'handlePrint']) {
    assert.match(body(name), /return true;/, name);
  }
  for (const name of ['handleExportPdf', 'handleShare', 'handlePrint']) {
    assert.match(body(name), /return false;/, name);
  }
});
