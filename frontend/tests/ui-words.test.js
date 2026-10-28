// Uma palavra, um sentido (especificação §1.3 e §9): as palavras que saíram do
// app não podem voltar a botões, títulos e avisos. Procura nos textos do código
// (sem os comentários). Cada fatia acrescenta as suas: V3 → "Telão" virou "Tela".
// V14 fecha a lista da §9: "Telão", "Encontro", "Próxima sessão", "Conduzir", "recap" e
// "Apagar a tela" (pt) e os equivalentes em inglês, que só se procuram dentro dos textos
// (o 2º texto de t()/L(), de ['pt', 'en'] e de { pt, en }): em inglês os nomes do
// código (`encounter`, `EncounterDifficulty`) usam as mesmas palavras.
// Os sinônimos da busca (NAV_PLACES em shell-logic.js, `was:` e `kw:`) e o cartão "O que
// mudou" (`was:` em guide-model.js) guardam de propósito os nomes antigos: é por eles
// que "telão" acha a Tela e que o mestre lê "Telão → Tela".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeFiles, stripComments } from './stage-api-calls.test.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SYNONYMS = /\b(?:was|kw):\s*(?:['[]|tt\()/;

const GONE = [
  { word: /tel[ãa]o/i, now: 'Tela' },   // V3
  // V5: a subvista e o título "Próxima sessão" viraram "Plano" / "Plano da Sessão N" (o "até a
  // próxima sessão" da barra da mesa continua: é a próxima sessão mesmo, não o nome do plano)
  { word: /Pr[óo]xima sess[ãa]o|\bNext session\b/, now: 'Plano' },
  // V12: o "recap" virou "Resumo da sessão" em português (o inglês continua "recap")
  { word: /\b(?:[Oo]|um|do|ao|[Mm]ontar)\s+recap\b|\bRecap\s+(?:desta|salvo)\b/, now: 'Resumo' },
  // V14: "Encontro" virou "Combate" (a ficha do jogador, fora da área do mestre, fala do
  // "encontro" das anotações dele)
  { word: /\b[Ee]ncontros?\b/, now: 'Combate', skip: /components[\\/]SheetTabs\.jsx$/ },
  // V14: o modo da aventura "Conduzir" virou "Na mesa"
  { word: /\b[Cc]onduzir\b/, now: 'Na mesa' },
  // V14: a Tela escurece, nunca "apaga"
  { word: /\b[Aa]pagar\s+(?:a\s+)?[Tt]ela\b/, now: 'Escurecer' },
  { word: /conhecido de nome|known by name/i, now: 'Só o nome' },   // F9: o selo, o filtro e o interruptor
];

// V14, dentro dos textos: nenhum "recap" em português (é "Resumo da sessão")…
const GONE_PT_TEXT = [
  { word: /\brecap\b/i, now: 'Resumo' },
];
// … e os nomes antigos em inglês.
const GONE_EN_TEXT = [
  { word: /\bTV screen\b|\bShow on (?:the )?TV\b|\b(?:Remove|Take) from (?:the )?TV\b|\bon the TV now\b/i, now: 'screen' },
  { word: /\bencounters?\b/i, now: 'combat' },
  { word: /^Run$|[“"]Run[”"]|\bRun mode\b/, now: 'At the table' },
  { word: /\bNext session\b/, now: 'Plan' },
  { word: /\b(?:turn|switch) off the screen\b|\bblank the screen\b/i, now: 'Black out' },
];

const files = () => [...codeFiles(join(ROOT, 'src')), ...codeFiles(join(ROOT, 'components')),
  join(ROOT, 'app.jsx'), join(ROOT, 'main.jsx')];

// Pares de texto pt/en: t(lang, 'pt', 'en'), L(lang, …), ['pt', 'en'] e { pt: '…', en: '…' }.
const STR = String.raw`('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\]|\\.)*\`)`;
const PAIRS = [
  new RegExp(String.raw`\b(?:t|L|tt|T)\(\s*lang\s*,\s*` + STR + String.raw`\s*,\s*` + STR, 'g'),
  new RegExp(String.raw`\[\s*` + STR + String.raw`\s*,\s*` + STR + String.raw`\s*\]`, 'g'),
  new RegExp(String.raw`\bpt:\s*` + STR + String.raw`\s*,\s*en:\s*` + STR, 'g'),
];

/** Os pares pt/en de um arquivo (já sem comentários), com a linha de cada um. */
function textPairs(src) {
  const out = [];
  for (const R of PAIRS) {
    R.lastIndex = 0;
    let m;
    while ((m = R.exec(src))) {
      out.push({ pt: m[1].slice(1, -1), en: m[2].slice(1, -1), line: src.slice(0, m.index).split('\n').length });
    }
  }
  return out;
}

test('palavras que saíram do app não voltam', () => {
  const hits = [];
  for (const f of files()) {
    const lines = stripComments(readFileSync(f, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      if (SYNONYMS.test(line)) return;
      for (const g of GONE) {
        if (g.skip?.test(f)) continue;
        if (g.word.test(line)) hits.push(`${relative(ROOT, f)}:${i + 1} (${g.now}) ${line.trim().slice(0, 90)}`);
      }
    });
  }
  assert.deepEqual(hits, []);
});

test('nem dentro dos textos: "recap" em português e os nomes antigos em inglês', () => {
  const hits = [];
  for (const f of files()) {
    const src = stripComments(readFileSync(f, 'utf8'));
    const lines = src.split('\n');
    for (const p of textPairs(src)) {
      if (SYNONYMS.test(lines[p.line - 1] || '')) continue;
      for (const g of GONE_PT_TEXT) if (g.word.test(p.pt)) hits.push(`${relative(ROOT, f)}:${p.line} (${g.now}) ${p.pt.slice(0, 80)}`);
      for (const g of GONE_EN_TEXT) if (g.word.test(p.en)) hits.push(`${relative(ROOT, f)}:${p.line} (${g.now}) ${p.en.slice(0, 80)}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('o teste acha as palavras antigas (para não passar por engano)', () => {
  const src = [
    "t(lang, 'Começar encontro', 'Start encounter')",
    "L(lang, 'Mostrar no telão', 'Show on TV')",
    "['Montar recap', 'Draft recap']",
    "{ id: 'x', pt: 'Conduzir', en: 'Run' }",
  ].join('\n');
  const pairs = textPairs(src);
  assert.equal(pairs.length, 4);
  const en = (pt) => pairs.find(p => p.pt === pt).en;
  assert.ok(GONE_EN_TEXT.some(g => g.word.test(en('Começar encontro'))), 'encounter');
  assert.ok(GONE_EN_TEXT.some(g => g.word.test(en('Mostrar no telão'))), 'Show on TV');
  assert.ok(GONE_PT_TEXT.some(g => g.word.test('Montar recap')), 'recap');
  assert.ok(GONE_EN_TEXT.some(g => g.word.test(en('Conduzir'))), 'Run');
  for (const pt of ['Começar encontro', 'Conduzir', 'Apagar a tela', 'Mostrar no Telão']) {
    assert.ok(GONE.some(g => g.word.test(`t(lang, '${pt}', 'x')`)), pt);
  }
  // "encontrou", "Run-down" e o "recap" do inglês continuam valendo
  assert.ok(!GONE.some(g => g.word.test("'você encontrou um mosteiro'")));
  assert.ok(!GONE_EN_TEXT.some(g => g.word.test('Run-down, with a leaking roof') || g.word.test('Session recap')));
  // os sinônimos da busca ficam de fora; um texto de verdade, não
  assert.ok(SYNONYMS.test("  { id: 'screen', was: ['Telão', 'TV screen'],"));
  assert.ok(SYNONYMS.test("    kw: 'telão tv link'"));
  assert.ok(SYNONYMS.test("    { was: tt(lang, 'Telão', 'TV screen'), now: tt(lang, 'Tela', 'Screen') },"));
  assert.ok(!SYNONYMS.test("t(lang, 'Telão', 'TV')"));
});
