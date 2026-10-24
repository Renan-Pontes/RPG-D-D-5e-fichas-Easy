/* Saídas da ficha (modal "Exportar", src/sheet/FhExport.jsx): os 5 botões que ficavam
 * soltos na barra de ações viraram linhas de um só modal. Aqui só a lista e o despacho;
 * quem gera o PDF, o link e o arquivo continua sendo o handler de sempre (app.jsx), com
 * os mesmos toasts de sucesso e erro.
 * - Ordem: a mesma dos botões antigos (Imprimir, PDF editável, PDF para imprimir,
 *   Compartilhar, Exportar JSON).
 * - Compartilhar aparece sempre, como antes: sem conta, o handler avisa "Entre na sua
 *   conta…" e o modal fica aberto. */

export const EXPORT_OPTIONS = [
  {
    id: 'print', icon: 'print',
    name: { pt: 'Imprimir', en: 'Print' },
    desc: {
      // (o livro de magias só sai para quem tem magias: spellbookSection, src/pdf/sheet-data.js)
      pt: 'Abre a ficha ornamentada (com as magias, se houver) para imprimir.',
      en: 'Opens the ornate sheet (with spells, if any), ready to print.',
    },
    busy: { pt: 'Preparando a impressão…', en: 'Preparing to print…' },
  },
  {
    id: 'pdfEdit', icon: 'edit',
    name: { pt: 'PDF editável', en: 'Editable PDF' },
    desc: {
      pt: 'Ficha de D&D 5e com campos para preencher em qualquer leitor de PDF.',
      en: 'D&D 5e sheet with fields to fill in any PDF reader.',
    },
    busy: { pt: 'Gerando o PDF…', en: 'Creating the PDF…' },
  },
  {
    id: 'pdfPrint', icon: 'download',
    name: { pt: 'PDF para imprimir', en: 'Print-ready PDF' },
    desc: {
      pt: 'Ficha de D&D 5e com o texto fixo, para baixar e imprimir.',
      en: 'D&D 5e sheet with fixed text, to download and print.',
    },
    busy: { pt: 'Gerando o PDF…', en: 'Creating the PDF…' },
  },
  {
    id: 'share', icon: 'share',
    name: { pt: 'Compartilhar link', en: 'Share link' },
    desc: {
      pt: 'Copia um link da ficha que vale 24 horas. Precisa entrar na conta.',
      en: 'Copies a link to the sheet, valid for 24 hours. Needs you logged in.',
    },
    busy: { pt: 'Gerando o link…', en: 'Creating the link…' },
  },
  {
    id: 'json', icon: 'braces',
    name: { pt: 'Arquivo JSON', en: 'JSON file' },
    desc: {
      pt: 'Baixa a ficha num arquivo para guardar ou importar em outro aparelho.',
      en: 'Downloads the sheet as a file to keep or import on another device.',
    },
    busy: { pt: 'Baixando…', en: 'Downloading…' },
  },
];

const pick = (txt, lang) => txt[lang] || txt.en;

/** Textos de uma opção no idioma da ficha. */
export const exportText = (opt, lang) => ({ name: pick(opt.name, lang), desc: pick(opt.desc, lang), busy: pick(opt.busy, lang) });

/**
 * Roda a opção com os handlers de sempre (props da Sheet). A chamada é SÍNCRONA, dentro
 * do clique: o Imprimir abre a aba nova na hora, senão o bloqueador de pop-up barra.
 * Devolve Promise<boolean>: false só quando o handler diz que não deu (devolveu false ou
 * falhou); aí o modal fica aberto para tentar de novo ou escolher outra saída.
 */
export function runExport(id, { onPrint, onExportPdf, onShare, onExport } = {}) {
  const call = {
    print: () => onPrint(),
    pdfEdit: () => onExportPdf({ flatten: false }),
    pdfPrint: () => onExportPdf({ flatten: true }),
    share: () => onShare(),
    json: () => onExport(),
  }[id];
  let out;
  try { out = call ? call() : false; } catch (e) { console.error(e); return Promise.resolve(false); }
  return Promise.resolve(out).then(r => r !== false, (e) => { console.error(e); return false; });
}
