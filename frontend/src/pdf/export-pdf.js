/**
 * Exporta a ficha no layout clássico de D&D 5e (3 páginas, carta).
 *
 * Desenhamos nossa própria ficha, com campos de formulário nos mesmos lugares e
 * com os mesmos nomes da ficha preenchível oficial: o PDF abre editável em
 * qualquer leitor e volta para a Forja (ou para outras ferramentas) pela
 * importação. Texto que não cabe diminui até 6 pt; o que passar disso vai para
 * páginas de continuação. Magias que não cabem geram páginas de magia extras.
 * Com foto, abre com uma capa (sem campos de formulário) e a foto também
 * preenche o retrato da página de detalhes.
 */
import { PDFDocument, StandardFonts, TextAlignment, drawCheckMark, rgb } from 'pdf-lib';
import { ORN, brandHeader, caption, decorateMainPages, decorateSpellPage, fieldBg, frame } from './ornaments.js';
import { LAYOUT, blankSheetData, buildSheetData, buildCoverData, pageField } from './sheet-data.js';

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
  STR: ['FORÇA', 'STRENGTH', 'top'], DEX: ['DESTREZA', 'DEXTERITY', 'top'], CON: ['CONSTITUIÇÃO', 'CONSTITUTION', 'top'],
  INT: ['INTELIGÊNCIA', 'INTELLIGENCE', 'top'], WIS: ['SABEDORIA', 'WISDOM', 'top'], CHA: ['CARISMA', 'CHARISMA', 'top'],
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
  CP: ['PC', 'CP', 'coin'], SP: ['PP', 'SP', 'coin'], EP: ['PE', 'EP', 'coin'], GP: ['PO', 'GP', 'coin'], PP: ['PL', 'PP', 'coin'],
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

function drawLabel(page, font, label, rect, where, color = MUTED) {
  const [x1, y1, x2, y2] = rect;
  let size = where === 'coin' ? 5.5 : where === 'right' ? 6.2 : 6;
  // Rótulos centralizados encolhem para não passar da moldura (atributos, deslocamento).
  if (where === 'top' || where === 'below') while (size > 4.5 && font.widthOfTextAtSize(label, size) > x2 - x1 + (where === 'top' ? -2 : 2)) size -= 0.25;
  const tw = font.widthOfTextAtSize(label, size);
  const cx = (x1 + x2) / 2;
  const pos = {
    below: [cx - tw / 2, y1 - size - 1.5], above: [x1 + 1, y2 + 2.5], top: [cx - tw / 2, y2 + 4],
    left: [x1 - tw - 3, (y1 + y2) / 2 - size / 3], coin: [x1 - tw - 6, (y1 + y2) / 2 - size / 3], right: [x2 + 8, (y1 + y2) / 2 - size / 3],
  }[where];
  page.drawText(label, { x: pos[0], y: pos[1], size, font, color });
}

function drawSheetHeader(page, bold, font, lang, title) {
  brandHeader(page, bold, font, `${title} · D&D 5e`);
  const foot = T(lang, 'Gerada pela Forja de Heróis', 'Made with Forja de Heróis');
  page.drawText(foot, { x: (LAYOUT.pageSize[0] - font.widthOfTextAtSize(foot, 5.5)) / 2, y: 10, size: 5.5, font, color: MUTED });
}

// Avatar é data URL (JPEG da Forja; PNG em fichas antigas/importadas).
async function embedAvatar(doc, dataUrl) {
  const m = /^data:image\/(jpe?g|png);base64,(.+)$/i.exec(dataUrl || '');
  if (!m) return null;
  const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
  try {
    return /png/i.test(m[1]) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch { return null; }
}

// Encaixa a imagem no retângulo sem distorcer (fotos antigas podem não ser quadradas).
function drawImageFit(page, img, [x1, y1, x2, y2]) {
  const w = x2 - x1, h = y2 - y1;
  const fit = Math.min(w / img.width, h / img.height);
  const fw = img.width * fit, fh = img.height * fit;
  page.drawRectangle({ x: x1, y: y1, width: w, height: h, color: FILL });
  page.drawImage(img, { x: x1 + (w - fw) / 2, y: y1 + (h - fh) / 2, width: fw, height: fh });
}

function drawCoverPage(page, { font, bold, clean, lang, img, cover }) {
  const [W, H] = LAYOUT.pageSize;
  const margin = 54;
  drawSheetHeader(page, bold, font, lang, T(lang, 'CAPA', 'COVER'));
  const side = 300;
  const top = H - 92;
  const px = (W - side) / 2;
  frame(page, [px - 10, top - side - 10, px + side + 10, top + 10], { cut: 12 });
  drawImageFit(page, img, [px, top - side, px + side, top]);

  let y = top - side - 40;
  const center = (text, size, f, color = INK) => {
    let s = size;
    const t = clean(text);
    while (s > 9 && f.widthOfTextAtSize(t, s) > W - margin * 2) s -= 1;
    page.drawText(t, { x: (W - f.widthOfTextAtSize(t, s)) / 2, y, size: s, font: f, color });
    y -= s + 8;
  };
  center(cover.name || T(lang, 'Sem nome', 'Unnamed'), 26, bold);
  if (cover.classLevel) center(cover.classLevel, 13, font);
  if (cover.subtitle) center(cover.subtitle, 11, font, MUTED);
  if (cover.player) center(`${T(lang, 'Jogador', 'Player')}: ${cover.player}`, 9, font, MUTED);
  y -= 6;
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.6, color: LINE });
  y -= 18;

  // Fatos curtos em linha.
  const factW = (W - margin * 2) / Math.max(1, cover.facts.length);
  cover.facts.forEach(([label, value], i) => {
    const x = margin + i * factW;
    page.drawText(clean(label.toUpperCase()), { x, y, size: 6.5, font: bold, color: MUTED });
    const v = wrap(font, clean(value), 9, factW - 8).slice(0, 2);
    v.forEach((l, j) => page.drawText(l, { x, y: y - 12 - j * 11, size: 9, font, color: INK }));
  });
  y -= 44;

  // Condições e NPCs em duas colunas, até o rodapé; o resto é cortado com "…".
  const colW = (W - margin * 2 - 18) / 2;
  const column = (x, title, items) => {
    let cy = y;
    if (!items.length) return;
    page.drawText(clean(title.toUpperCase()), { x, y: cy, size: 8, font: bold, color: INK });
    cy -= 4;
    page.drawLine({ start: { x, y: cy }, end: { x: x + colW, y: cy }, thickness: 0.6, color: LINE });
    cy -= 12;
    for (const it of items) {
      const lines = [
        ...(it.title ? wrap(bold, clean(it.title), 8, colW).map(l => [l, bold]) : []),
        ...(it.text ? wrap(font, clean(it.text), 7.5, colW).map(l => [l, font]) : []),
      ];
      for (const [l, f] of lines) {
        if (cy < 40) { page.drawText('…', { x, y: cy, size: 8, font, color: MUTED }); return; }
        page.drawText(l, { x, y: cy, size: f === bold ? 8 : 7.5, font: f, color: INK });
        cy -= 10;
      }
      cy -= 4;
    }
  };
  const left = cover.conditions.length ? cover.conditions.map(c => ({ text: `• ${c}` })) : [];
  column(margin, T(lang, 'Condições e efeitos ativos', 'Active conditions & effects'), left);
  column(left.length ? margin + colW + 18 : margin, T(lang, 'NPCs conhecidos', 'Known NPCs'), cover.npcs);
}

export async function exportDnd5ePdf(char, lang = 'pt', opts = {}) {
  // opts.blank: ficha vazia para quem prefere preencher direto no PDF (e importar depois).
  const data = opts.blank ? blankSheetData() : buildSheetData(char, lang, opts);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();
  const clean = makeSanitizer(font);
  const [W, H] = LAYOUT.pageSize;
  const overflow = [];
  const title = clean(char.name || (opts.blank ? T(lang, 'Ficha em branco', 'Blank sheet') : T(lang, 'Sem nome', 'Unnamed')));
  doc.setTitle(`${title} — D&D 5e`);
  doc.setCreator('Forja de Heróis');

  const avatar = opts.blank ? null : await embedAvatar(doc, char.avatar);
  if (avatar) drawCoverPage(doc.addPage([W, H]), { font, bold, clean, lang, img: avatar, cover: buildCoverData(char, lang) });
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
    tf.addToPage(page, { x: rect[0], y: rect[1], width: rect[2] - rect[0], height: rect[3] - rect[1], borderWidth: 0, borderColor: undefined, backgroundColor: undefined, font, textColor: INK });
    tf.setFontSize(fit.size);
    tf.setText(fit.text);
  };
  const addCheck = (page, name, rect, checked) => {
    const [x1, y1, x2, y2] = rect;
    const r = Math.min(x2 - x1, y2 - y1) / 2 + 0.5;
    page.drawCircle({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, size: r, color: rgb(1, 1, 1), borderColor: INK, borderWidth: 0.7 });
    const cb = form.createCheckBox(name);
    // Sem fundo: o padrão do pdf-lib é branco e apagaria o círculo desenhado embaixo.
    cb.addToPage(page, { x: x1, y: y1, width: x2 - x1, height: y2 - y1, borderWidth: 0, borderColor: undefined, backgroundColor: undefined, textColor: INK });
    if (checked) cb.check();
    // Aparência própria: só o tique. A padrão desenha um quadrado (borda 0 no PDF = linha mais fina, não "sem linha").
    cb.updateAppearances((_, widget) => {
      const { width, height } = widget.getRectangle();
      const on = drawCheckMark({ x: width / 2, y: height / 2, size: Math.min(width, height) / 2, thickness: 1.1, color: INK });
      return { normal: { on, off: [] } };
    });
  };

  // --- Páginas 1 e 2 ---
  decorateMainPages(pages, Object.fromEntries(LAYOUT.fields.filter(f => f.page <= 1).map(f => [f.name.trim(), f])));
  const seen = new Set();
  for (const f of LAYOUT.fields) {
    if (f.page > 1 || seen.has(f.name)) continue;
    seen.add(f.name);
    const page = pages[f.page];
    if (f.type === 'image') {
      fieldBg(page, f.rect);
      if (avatar && f.name === 'CHARACTER IMAGE') drawImageFit(page, avatar, f.rect);
      continue;
    }
    if (f.type === 'check') {
      addCheck(page, f.name, f.rect, !!data.checks[f.name]);
      continue;
    }
    const big = /^(STR|DEX|CON|INT|WIS|CHA|AC|Initiative|Speed|HPCurrent|HPTemp)$/.test(f.name);
    // As molduras já contornam os grupos: campo de uma linha só ganha um fundo leve.
    if (!f.multiline && !big) fieldBg(page, f.rect);
    const label = LABELS[f.name];
    if (label) drawLabel(page, bold, clean(lang === 'pt' ? label[0] : label[1]), f.rect, label[2], ORN.ink);
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
  caption(pages[0], bold, clean(T(lang, 'SALVAGUARDAS', 'SAVING THROWS')), [94, 0, 208], 495);
  caption(pages[0], bold, clean(T(lang, 'PERÍCIAS', 'SKILLS')), [94, 0, 208], 217);
  for (const [text, y] of [[T(lang, 'SUCESSOS', 'SUCCESSES'), 462], [T(lang, 'FALHAS', 'FAILURES'), 447]]) {
    sectionTitle(pages[0], text, 342 - bold.widthOfTextAtSize(clean(text), 6.5), y);
  }
  caption(pages[0], bold, clean(T(lang, 'TESTES CONTRA A MORTE', 'DEATH SAVES')), [306, 0, 389], 434, 5.5);
  sectionTitle(pages[1], T(lang, 'RETRATO', 'CHARACTER APPEARANCE'), 36, 665);
  sectionTitle(pages[1], T(lang, 'SÍMBOLO', 'SYMBOL'), 424, 500);

  // --- Páginas de magia (repetem enquanto houver magias) ---
  const spellFields = LAYOUT.fields.filter(f => f.page === 2);
  const rectOf = Object.fromEntries(spellFields.map(f => [f.name, f.rect]));
  data.spellPages.forEach((sp, index) => {
    const page = doc.addPage([W, H]);
    drawSheetHeader(page, bold, font, lang, T(lang, 'MAGIAS', 'SPELLCASTING') + (sp.continued ? T(lang, ' (continuação)', ' (continued)') : ''));
    decorateSpellPage(page, bold, rectOf, LAYOUT.spells);
    const head = { 'Spellcasting Class 2': sp.header.className, 'SpellcastingAbility 2': sp.header.ability, 'SpellSaveDC  2': sp.header.dc, 'SpellAtkBonus 2': sp.header.atk };
    for (const [name, value] of Object.entries(head)) {
      const l = LABELS[name];
      drawLabel(page, bold, clean(lang === 'pt' ? l[0] : l[1]), rectOf[name], l[2], ORN.ink);
      addText(page, pageField(name, index), rectOf[name], value, { align: 1, max: 14 });
    }
    for (let lvl = 0; lvl <= 9; lvl++) {
      const rows = LAYOUT.spells[lvl];
      const top = rectOf[rows[0].field];
      if (lvl === 0) {
        caption(page, bold, clean(T(lang, 'TRUQUES', 'CANTRIPS')), [top[0] + 20, 0, top[2]], top[3] + 11.5, 7);
      } else {
        const total = rectOf[`SlotsTotal ${lvl + 18}`];
        const used = rectOf[`SlotsRemaining ${lvl + 18}`];
        // Rótulos só no 1º círculo, acima da barra (os outros seguem o mesmo padrão).
        if (lvl === 1) {
          const y = total[3] + 7;
          page.drawText(clean(T(lang, 'ESPAÇOS', 'SLOTS TOTAL')), { x: total[0], y, size: 5.5, font: bold, color: MUTED });
          page.drawText(clean(T(lang, 'GASTOS', 'SLOTS EXPENDED')), { x: used[0], y, size: 5.5, font: bold, color: MUTED });
          caption(page, bold, clean(T(lang, 'NOME DA MAGIA  (círculo = preparada)', 'SPELL NAME  (circle = prepared)')), [top[0], 0, top[2]], top[3] + 8, 5.5);
        }
        addText(page, pageField(`SlotsTotal ${lvl + 18}`, index), total, sp.slots[lvl] ? String(sp.slots[lvl]) : '', { align: 1, max: 12 });
        addText(page, pageField(`SlotsRemaining ${lvl + 18}`, index), used, '', { align: 1 });
      }
      rows.forEach((row, i) => {
        const r = rectOf[row.field];
        const spell = sp.levels[lvl]?.[i];
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
  // "Para imprimir": grava o texto na página e remove os campos (não dá mais para editar).
  if (opts.flatten) form.flatten();
  return doc.save();
}

export async function downloadDnd5ePdf(char, lang, opts) {
  const bytes = await exportDnd5ePdf(char, lang, opts);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = opts?.blank
    ? `Ficha_DnD5e_em_branco.pdf`
    : `${(char.name || 'personagem').replace(/[^a-z0-9]+/gi, '_')}_DnD5e${opts?.flatten ? '' : '_editavel'}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
