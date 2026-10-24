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
  // o Imprimir não promete livro de magias a quem não tem magias (spellbookSection sai nulo)
  const print = EXPORT_OPTIONS.find(o => o.id === 'print');
  assert.doesNotMatch(exportText(print, 'pt').desc, /livro de magias/);
  assert.doesNotMatch(exportText(print, 'en').desc, /spellbook/);
  assert.match(exportText(print, 'pt').desc, /se houver/);
  assert.match(exportText(print, 'en').desc, /if any/);
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

test('Sheet: um botão Exportar no lugar dos 5 soltos, sem duplicar as saídas', () => {
  const s = src('../components/Sheet.jsx');
  const bar = s.slice(s.indexOf('<div className="action-bar fh-actions no-print">'), s.indexOf('{cheatOpen &&'));
  // Exportar, Editar (fora de campanha; em campanha é um <span> travado) e Modo trapaça
  assert.equal((bar.match(/<button/g) || []).length, 3);
  assert.match(bar, /onClick=\{\(\) => setExportOpen\(true\)\}/);
  for (const gone of ['onClick={onPrint}', 'onExportPdf({', 'onClick={onShare}', 'onClick={onExport}']) {
    assert.ok(!s.includes(gone), gone);
  }
  assert.match(s, /handlers=\{\{ onPrint, onExportPdf, onShare, onExport \}\}/);
  // as props de hoje continuam (app.jsx não muda de contrato)
  assert.match(s, /const Sheet = \(\{ lang, char, onUpdate, onEdit, onPrint, onExportPdf, onShare, onExport,/);
});

test('modal: foco na 1ª linha, Tab preso no modal, Esc do Modal do app; linhas >= 48 px', () => {
  const m = src('../src/sheet/FhExport.jsx');
  assert.match(m, /querySelector\('\.fh-export-opt'\)\?\.focus\(\)/);
  assert.match(m, /e\.key !== 'Tab'/);
  assert.match(m, /<Modal onClose=\{onClose\}>/);
  assert.match(m, /aria-disabled=/);
  const css = src('../src/sheet/ficha.css');
  const minH = +(css.match(/\.ficha \.fh-export-opt \{[^}]*min-height: (\d+)px/) || [])[1];
  assert.ok(minH >= 48, `min-height ${minH}`);
});

test('modal: no celular (em pé ou deitado, < 700 px) é um sheet de borda a borda', () => {
  const css = src('../src/sheet/ficha.css');
  // a faixa vai até o ponto em que o .modal-backdrop do app volta a centralizar (700 px)
  const m = css.match(/@media \(max-width: (\d+)px\) \{\s*\.ficha \.modal:has\(> \.fh-export-list\) \{([^}]*)\}/);
  assert.ok(m, 'regra do sheet inferior');
  assert.equal(+m[1], 699);
  assert.match(m[2], /width: 100%;/);
  // vence o max-width: 95vw de app-extra-styles.css (≤720 px)
  assert.match(m[2], /max-width: 100% !important;/);
});

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
