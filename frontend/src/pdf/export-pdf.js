/**
 * Exporta a ficha no layout clássico de D&D 5e (3 páginas, carta).
 *
 * Desenhamos nossa própria ficha, com campos de formulário nos mesmos lugares e
 * com os mesmos nomes da ficha preenchível oficial: o PDF abre editável em
 * qualquer leitor e volta para a Forja (ou para outras ferramentas) pela
 * importação. Texto que não cabe diminui até 6 pt; o que passar disso vai para
 * páginas de continuação. Magias que não cabem geram páginas de magia extras.
 */
import { PDFDocument, StandardFonts, TextAlignment, rgb } from 'pdf-lib';
import { LAYOUT, buildSheetData, pageField } from './sheet-data.js';

const INK = rgb(0.13, 0.12, 0.11);
const MUTED = rgb(0.42, 0.4, 0.37);
const LINE = rgb(0.55, 0.53, 0.5);
const FILL = rgb(0.96, 0.95, 0.93);
const MIN_SIZE = 6;

const T = (lang, pt, en) => (lang === 'pt' ? pt : en);

// Rótulos desenhados junto de cada campo: [pt, en, posição].
const LABELS = {
  CharacterName: ['NOME DO PERSONAGEM', 'CHARACTER NAME', 'below'],
  ClassLevel: ['CLASSE E NÍVEL', 'CLASS & LEVEL', 'below'],
  Background: ['ANTECEDENTE', 'BACKGROUND', 'below'],
  PlayerName: ['JOGADOR', 'PLAYER NAME', 'below'],
  'Race ': ['ESPÉCIE', 'SPECIES', 'below'],
  Alignment: ['ALINHAMENTO', 'ALIGNMENT', 'below'],
  XP: ['EXPERIÊNCIA', 'EXPERIENCE POINTS', 'below'],
  Inspiration: ['INSPIRAÇÃO', 'INSPIRATION', 'right'],
  ProfBonus: ['BÔNUS DE PROFICIÊNCIA', 'PROFICIENCY BONUS', 'right'],
  STR: ['FORÇA', 'STRENGTH', 'above'], DEX: ['DESTREZA', 'DEXTERITY', 'above'], CON: ['CONSTITUIÇÃO', 'CONSTITUTION', 'above'],
  INT: ['INTELIGÊNCIA', 'INTELLIGENCE', 'above'], WIS: ['SABEDORIA', 'WISDOM', 'above'], CHA: ['CARISMA', 'CHARISMA', 'above'],
  AC: ['CA', 'ARMOR CLASS', 'below'], Initiative: ['INICIATIVA', 'INITIATIVE', 'below'], Speed: ['DESLOCAMENTO', 'SPEED', 'below'],
  HPMax: ['PV máximos', 'Hit Point Maximum', 'left'],
  HPCurrent: ['PONTOS DE VIDA ATUAIS', 'CURRENT HIT POINTS', 'below'],
  HPTemp: ['PONTOS DE VIDA TEMPORÁRIOS', 'TEMPORARY HIT POINTS', 'below'],
  HDTotal: ['Total', 'Total', 'left'], HD: ['DADOS DE VIDA', 'HIT DICE', 'below'],
  'PersonalityTraits ': ['TRAÇOS DE PERSONALIDADE', 'PERSONALITY TRAITS', 'below'],
  Ideals: ['IDEAIS', 'IDEALS', 'below'], Bonds: ['VÍNCULOS', 'BONDS', 'below'], Flaws: ['DEFEITOS', 'FLAWS', 'below'],
  'Wpn Name': ['NOME', 'NAME', 'above'], 'Wpn1 AtkBonus': ['BÔNUS', 'ATK BONUS', 'above'], 'Wpn1 Damage': ['DANO/TIPO', 'DAMAGE/TYPE', 'above'],
  AttacksSpellcasting: ['ATAQUES E CONJURAÇÃO', 'ATTACKS & SPELLCASTING', 'below'],
  Passive: ['SABEDORIA (PERCEPÇÃO) PASSIVA', 'PASSIVE WISDOM (PERCEPTION)', 'right'],
  ProficienciesLang: ['OUTRAS PROFICIÊNCIAS E IDIOMAS', 'OTHER PROFICIENCIES & LANGUAGES', 'below'],
  CP: ['PC', 'CP', 'left'], SP: ['PP', 'SP', 'left'], EP: ['PE', 'EP', 'left'], GP: ['PO', 'GP', 'left'], PP: ['PL', 'PP', 'left'],
  Equipment: ['EQUIPAMENTO', 'EQUIPMENT', 'below'],
  'Features and Traits': ['CARACTERÍSTICAS E TRAÇOS', 'FEATURES & TRAITS', 'below'],
  'CharacterName 2': ['NOME DO PERSONAGEM', 'CHARACTER NAME', 'below'],
  Age: ['IDADE', 'AGE', 'below'], Height: ['ALTURA', 'HEIGHT', 'below'], Weight: ['PESO', 'WEIGHT', 'below'],
  Eyes: ['OLHOS', 'EYES', 'below'], Skin: ['PELE', 'SKIN', 'below'], Hair: ['CABELO', 'HAIR', 'below'],
  Allies: ['ALIADOS E ORGANIZAÇÕES', 'ALLIES & ORGANIZATIONS', 'above'],
  FactionName: ['NOME', 'NAME', 'below'],
  Backstory: ['HISTÓRIA DO PERSONAGEM', 'CHARACTER BACKSTORY', 'above'],
  'Feat+Traits': ['CARACTERÍSTICAS E TRAÇOS ADICIONAIS', 'ADDITIONAL FEATURES & TRAITS', 'above'],
  Treasure: ['TESOURO', 'TREASURE', 'above'],
  'Spellcasting Class 2': ['CLASSE CONJURADORA', 'SPELLCASTING CLASS', 'below'],
  'SpellcastingAbility 2': ['ATRIBUTO', 'SPELLCASTING ABILITY', 'below'],
  'SpellSaveDC  2': ['CD DE MAGIA', 'SPELL SAVE DC', 'below'],
  'SpellAtkBonus 2': ['ATAQUE MÁGICO', 'SPELL ATTACK BONUS', 'below'],
};
const SAVE_NAMES = [['Força', 'Strength'], ['Destreza', 'Dexterity'], ['Constituição', 'Constitution'], ['Inteligência', 'Intelligence'], ['Sabedoria', 'Wisdom'], ['Carisma', 'Charisma']];
const SKILL_NAMES = [
  ['Acrobacia (Des)', 'Acrobatics (Dex)'], ['Adestrar Animais (Sab)', 'Animal Handling (Wis)'], ['Arcanismo (Int)', 'Arcana (Int)'],
  ['Atletismo (For)', 'Athletics (Str)'], ['Enganação (Car)', 'Deception (Cha)'], ['História (Int)', 'History (Int)'],
  ['Intuição (Sab)', 'Insight (Wis)'], ['Intimidação (Car)', 'Intimidation (Cha)'], ['Investigação (Int)', 'Investigation (Int)'],
  ['Medicina (Sab)', 'Medicine (Wis)'], ['Natureza (Int)', 'Nature (Int)'], ['Percepção (Sab)', 'Perception (Wis)'],
  ['Atuação (Car)', 'Performance (Cha)'], ['Persuasão (Car)', 'Persuasion (Cha)'], ['Religião (Int)', 'Religion (Int)'],
  ['Prestidigitação (Des)', 'Sleight of Hand (Dex)'], ['Furtividade (Des)', 'Stealth (Dex)'], ['Sobrevivência (Sab)', 'Survival (Wis)'],
];
const SKILL_FIELD_ORDER = ['Acrobatics', 'Animal', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'SleightofHand', 'Stealth', 'Survival'];

// Helvetica padrão só codifica WinAnsi: troca o que não existe nela.
function makeSanitizer(font) {
  const cache = new Map();
  const REPL = { '★': '*', '✦': '*', '❖': '*', '→': '->', '≥': '>=', '≤': '<=', '½': '1/2', '\t': ' ' };
  return text => [...String(text ?? '')].map(ch => {
    if (ch === '\n') return ch;
    if (cache.has(ch)) return cache.get(ch);
    let out = REPL[ch];
    if (out === undefined) { try { font.encodeText(ch); out = ch; } catch { out = '?'; } }
    cache.set(ch, out);
    return out;
  }).join('');
}

function wrap(font, text, size, width) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      const tryLine = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(tryLine, size) <= width) { line = tryLine; continue; }
      if (line) lines.push(line);
      // Palavra maior que a linha: quebra por caractere.
      let w = word;
      while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
        let cut = w.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > width) cut--;
        lines.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      line = w;
    }
    lines.push(line);
  }
  return lines;
}

/** Maior fonte (<= max) em que o texto cabe; se nem a 6 pt couber, devolve o que sobra. */
function fitText(font, text, rect, { multiline, max = 10 }) {
  const w = rect[2] - rect[0] - 4;
  const h = rect[3] - rect[1] - 2;
  if (!text) return { size: Math.min(max, h * 0.7), text: '', rest: '' };
  if (!multiline) {
    let size = Math.min(max + 2, h * 0.72);
    while (size > MIN_SIZE && font.widthOfTextAtSize(text, size) > w) size -= 0.5;
    return { size, text, rest: '' };
  }
  for (let size = max; size >= MIN_SIZE; size -= 0.5) {
    if (wrap(font, text, size, w).length * size * 1.18 <= h) return { size, text, rest: '' };
  }
  // Enche linha a linha por parágrafo, para o resto continuar com as quebras originais.
  let room = Math.max(1, Math.floor(h / (MIN_SIZE * 1.18)) - 1);
  const kept = [];
  const paras = String(text).split('\n');
  let i = 0;
  for (; i < paras.length && room > 0; i++) {
    const lines = wrap(font, paras[i], MIN_SIZE, w);
    if (lines.length <= room) { kept.push(paras[i]); room -= lines.length; continue; }
    kept.push(lines.slice(0, room).join(' '));
    paras[i] = lines.slice(room).join(' ');
    room = 0;
    break;
  }
  return { size: MIN_SIZE, text: kept.join('\n'), rest: paras.slice(i).join('\n') };
}

function drawLabel(page, font, label, rect, where) {
  const size = where === 'left' || where === 'right' ? 6.5 : 6;
  const tw = font.widthOfTextAtSize(label, size);
  const [x1, y1, x2, y2] = rect;
  const cx = (x1 + x2) / 2;
  const pos = {
    below: [cx - tw / 2, y1 - size - 1.5], above: [x1 + 1, y2 + 2.5],
    left: [x1 - tw - 3, (y1 + y2) / 2 - size / 3], right: [x2 + 4, (y1 + y2) / 2 - size / 3],
  }[where];
  page.drawText(label, { x: pos[0], y: pos[1], size, font, color: MUTED });
}

function box(page, rect, { fill = false, pad = 1.5 } = {}) {
  const [x1, y1, x2, y2] = rect;
  page.drawRectangle({ x: x1 - pad, y: y1 - pad, width: x2 - x1 + pad * 2, height: y2 - y1 + pad * 2, borderColor: LINE, borderWidth: 0.6, color: fill ? FILL : undefined });
}

function drawSheetHeader(page, bold, font, lang, title) {
  page.drawText('D&D 5e', { x: 36, y: 752, size: 16, font: bold, color: INK });
  page.drawText(title, { x: 36, y: 740, size: 7, font, color: MUTED });
  page.drawText(T(lang, 'Gerada pela Forja de Heróis', 'Made with Forja de Heróis'), { x: 36, y: 20, size: 5.5, font, color: MUTED });
}

export async function exportDnd5ePdf(char, lang = 'pt', opts = {}) {
  const data = buildSheetData(char, lang, opts);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();
  const clean = makeSanitizer(font);
  const [W, H] = LAYOUT.pageSize;
  const overflow = [];
  const title = clean(char.name || T(lang, 'Sem nome', 'Unnamed'));
  doc.setTitle(`${title} — D&D 5e`);
  doc.setCreator('Forja de Heróis');

  const pages = [0, 1].map(() => doc.addPage([W, H]));
  drawSheetHeader(pages[0], bold, font, lang, T(lang, 'FICHA DE PERSONAGEM', 'CHARACTER SHEET'));
  drawSheetHeader(pages[1], bold, font, lang, T(lang, 'DETALHES DO PERSONAGEM', 'CHARACTER DETAILS'));

  const addText = (page, name, rect, value, { multiline = false, align = 0, max } = {}) => {
    const v = clean(value);
    const fit = fitText(font, v, rect, { multiline, max: max ?? (multiline ? 9 : 11) });
    if (fit.rest) {
      overflow.push({ field: name, rest: fit.rest });
      fit.text = `${fit.text} …`;
    }
    const tf = form.createTextField(name);
    if (multiline) tf.enableMultiline();
    tf.setAlignment(align === 1 ? TextAlignment.Center : align === 2 ? TextAlignment.Right : TextAlignment.Left);
    tf.addToPage(page, { x: rect[0], y: rect[1], width: rect[2] - rect[0], height: rect[3] - rect[1], borderWidth: 0, font, textColor: INK });
    tf.setFontSize(fit.size);
    tf.setText(fit.text);
  };
  const addCheck = (page, name, rect, checked) => {
    const [x1, y1, x2, y2] = rect;
    const r = Math.min(x2 - x1, y2 - y1) / 2 + 0.5;
    page.drawCircle({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, size: r, borderColor: LINE, borderWidth: 0.6 });
    const cb = form.createCheckBox(name);
    cb.addToPage(page, { x: x1, y: y1, width: x2 - x1, height: y2 - y1, borderWidth: 0, textColor: INK });
    if (checked) cb.check();
  };

  // --- Páginas 1 e 2 ---
  const seen = new Set();
  for (const f of LAYOUT.fields) {
    if (f.page > 1 || seen.has(f.name)) continue;
    seen.add(f.name);
    const page = pages[f.page];
    if (f.type === 'image') {
      box(page, f.rect, { fill: true, pad: 0 });
      continue;
    }
    if (f.type === 'check') {
      addCheck(page, f.name, f.rect, !!data.checks[f.name]);
      continue;
    }
    const big = /^(STR|DEX|CON|INT|WIS|CHA|AC|Initiative|Speed|HPCurrent|HPTemp)$/.test(f.name);
    box(page, f.rect, { fill: !f.multiline && !big });
    const label = LABELS[f.name];
    if (label) drawLabel(page, font, clean(lang === 'pt' ? label[0] : label[1]), f.rect, label[2]);
    addText(page, f.name, f.rect, data.fields[f.name] ?? '', { multiline: f.multiline, align: f.align, max: big ? 16 : undefined });
  }
  // Nomes das salvaguardas e perícias ao lado das caixas.
  const byName = Object.fromEntries(LAYOUT.fields.filter(f => f.page === 0).map(f => [f.name.trim(), f]));
  SAVE_NAMES.forEach(([pt, en], i) => {
    const f = byName[['ST Strength', 'ST Dexterity', 'ST Constitution', 'ST Intelligence', 'ST Wisdom', 'ST Charisma'][i]];
    pages[0].drawText(clean(lang === 'pt' ? pt : en), { x: f.rect[2] + 4, y: f.rect[1] + 1.5, size: 7, font, color: INK });
  });
  SKILL_FIELD_ORDER.forEach((name, i) => {
    const f = byName[name];
    pages[0].drawText(clean(lang === 'pt' ? SKILL_NAMES[i][0] : SKILL_NAMES[i][1]), { x: f.rect[2] + 4, y: f.rect[1] + 1.5, size: 7, font, color: INK });
  });
  const sectionTitle = (page, text, x, y) => page.drawText(clean(text), { x, y, size: 6.5, font: bold, color: MUTED });
  sectionTitle(pages[0], T(lang, 'SALVAGUARDAS', 'SAVING THROWS'), 100, 498);
  sectionTitle(pages[0], T(lang, 'PERÍCIAS', 'SKILLS'), 100, 222);
  for (const [text, y] of [[T(lang, 'SUCESSOS', 'SUCCESSES'), 462], [T(lang, 'FALHAS', 'FAILURES'), 447]]) {
    sectionTitle(pages[0], text, 342 - bold.widthOfTextAtSize(clean(text), 6.5), y);
  }
  sectionTitle(pages[0], T(lang, 'TESTES CONTRA A MORTE', 'DEATH SAVES'), 312, 432);
  sectionTitle(pages[1], T(lang, 'RETRATO', 'CHARACTER APPEARANCE'), 36, 665);
  sectionTitle(pages[1], T(lang, 'SÍMBOLO', 'SYMBOL'), 424, 500);

  // --- Páginas de magia (repetem enquanto houver magias) ---
  const spellFields = LAYOUT.fields.filter(f => f.page === 2);
  const rectOf = Object.fromEntries(spellFields.map(f => [f.name, f.rect]));
  data.spellPages.forEach((sp, index) => {
    const page = doc.addPage([W, H]);
    drawSheetHeader(page, bold, font, lang, T(lang, 'MAGIAS', 'SPELLCASTING') + (sp.continued ? T(lang, ' (continuação)', ' (continued)') : ''));
    const head = { 'Spellcasting Class 2': sp.header.className, 'SpellcastingAbility 2': sp.header.ability, 'SpellSaveDC  2': sp.header.dc, 'SpellAtkBonus 2': sp.header.atk };
    for (const [name, value] of Object.entries(head)) {
      box(page, rectOf[name]);
      const l = LABELS[name];
      drawLabel(page, font, clean(lang === 'pt' ? l[0] : l[1]), rectOf[name], l[2]);
      addText(page, pageField(name, index), rectOf[name], value, { align: 1, max: 14 });
    }
    for (let lvl = 0; lvl <= 9; lvl++) {
      const rows = LAYOUT.spells[lvl];
      const top = rectOf[rows[0].field];
      // Cabeçalho do nível: círculo com o número, total e gastos.
      if (lvl === 0) {
        sectionTitle(page, `0  ${T(lang, 'TRUQUES', 'CANTRIPS')}`, top[0], top[3] + 8);
      } else {
        const total = rectOf[`SlotsTotal ${lvl + 18}`];
        const used = rectOf[`SlotsRemaining ${lvl + 18}`];
        page.drawCircle({ x: total[0] - 12, y: (total[1] + total[3]) / 2, size: 9, borderColor: LINE, borderWidth: 0.8 });
        page.drawText(String(lvl), { x: total[0] - 14.5, y: (total[1] + total[3]) / 2 - 3.5, size: 10, font: bold, color: INK });
        box(page, total, { fill: true });
        box(page, used);
        drawLabel(page, font, clean(T(lang, 'ESPAÇOS', 'SLOTS TOTAL')), total, 'above');
        drawLabel(page, font, clean(T(lang, 'GASTOS', 'SLOTS EXPENDED')), used, 'above');
        addText(page, pageField(`SlotsTotal ${lvl + 18}`, index), total, sp.slots[lvl] ? String(sp.slots[lvl]) : '', { align: 1, max: 12 });
        addText(page, pageField(`SlotsRemaining ${lvl + 18}`, index), used, '', { align: 1 });
      }
      rows.forEach((row, i) => {
        const r = rectOf[row.field];
        const spell = sp.levels[lvl]?.[i];
        page.drawLine({ start: { x: r[0], y: r[1] }, end: { x: r[2], y: r[1] }, thickness: 0.5, color: LINE });
        addText(page, pageField(row.field, index), r, spell?.name || '', { max: 8.5 });
        if (row.prepared) addCheck(page, pageField(row.prepared, index), rectOf[row.prepared], !!spell?.prepared);
      });
    }
  });

  // --- Continuação: texto integral de traços/características e o que transbordou ---
  const sections = [...data.sections];
  if (overflow.length) {
    const labelOf = n => (LABELS[n] ? (lang === 'pt' ? LABELS[n][0] : LABELS[n][1]) : n);
    sections.unshift({ title: T(lang, 'Continuação dos campos', 'Continued fields'), items: overflow.map(o => ({ title: `${labelOf(o.field)} (…)`, text: o.rest })) });
  }
  if (sections.length) {
    const margin = 40;
    const colW = (W - margin * 2 - 18) / 2;
    let page; let col = 0; let y = 0;
    const newPage = () => {
      page = doc.addPage([W, H]);
      drawSheetHeader(page, bold, font, lang, `${title} — ${T(lang, 'CONTINUAÇÃO', 'CONTINUED')}`);
      col = 0; y = 728;
    };
    const ensure = h => {
      if (y - h >= 36) return;
      if (col === 0) { col = 1; y = 728; } else newPage();
    };
    const x = () => margin + col * (colW + 18);
    newPage();
    for (const s of sections) {
      ensure(30);
      page.drawText(clean(s.title.toUpperCase()), { x: x(), y, size: 9, font: bold, color: INK });
      y -= 4;
      page.drawLine({ start: { x: x(), y }, end: { x: x() + colW, y }, thickness: 0.6, color: LINE });
      y -= 11;
      for (const it of s.items) {
        const titleLines = it.title ? wrap(bold, clean(it.title), 8, colW) : [];
        const body = wrap(font, clean(it.text || ''), 7.5, colW).filter((l, i, a) => l || i < a.length - 1);
        ensure(titleLines.length * 10 + Math.min(body.length, 3) * 9);
        for (const l of titleLines) { page.drawText(l, { x: x(), y, size: 8, font: bold, color: INK }); y -= 10; }
        for (const l of body) {
          ensure(9);
          page.drawText(l, { x: x(), y, size: 7.5, font, color: INK });
          y -= 9;
        }
        y -= 5;
      }
      y -= 6;
    }
  }

  form.updateFieldAppearances(font);
  return doc.save();
}

export async function downloadDnd5ePdf(char, lang, opts) {
  const bytes = await exportDnd5ePdf(char, lang, opts);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(char.name || 'personagem').replace(/[^a-z0-9]+/gi, '_')}_DnD5e.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
