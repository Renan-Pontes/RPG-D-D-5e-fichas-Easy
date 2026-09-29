/**
 * Importa uma ficha de D&D 5e em PDF com formulário: a ficha preenchível
 * oficial, o PDF do D&D Beyond ou a nossa própria exportação. PDFs "achatados"
 * (sem campos, só desenho/texto) não têm o que ler: o chamador avisa o usuário.
 */
import { PDFDocument, PDFCheckBox, PDFTextField, PDFDropdown, PDFRadioGroup } from 'pdf-lib';
import { sheetValuesToChar } from './sheet-data.js';

export async function readPdfFields(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const values = {};
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    try {
      if (field instanceof PDFTextField) values[name] = field.getText() || '';
      else if (field instanceof PDFCheckBox) values[name] = field.isChecked();
      else if (field instanceof PDFDropdown) values[name] = field.getSelected().join(', ');
      else if (field instanceof PDFRadioGroup) values[name] = field.getSelected() || '';
    } catch { /* campo corrompido: ignora */ }
  }
  return values;
}

/** Devolve { char, unmatched, fieldCount }; fieldCount 0 = PDF sem formulário. */
export async function importDnd5ePdf(bytes) {
  const values = await readPdfFields(bytes);
  const filled = Object.values(values).filter(v => v === true || (typeof v === 'string' && v.trim())).length;
  if (!filled) return { char: null, unmatched: [], fieldCount: 0 };
  return { ...sheetValuesToChar(values), fieldCount: filled };
}
