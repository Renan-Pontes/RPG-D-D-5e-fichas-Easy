/**
 * Acabamento visual da ficha exportada: painéis, molduras, escudo da CA e
 * ovais dos modificadores. Desenho próprio da Forja — só acompanha as posições
 * dos campos em dnd5e-layout.js. Tudo é vetor (sem imagens), então o PDF
 * continua leve e imprime nítido.
 *
 * Coordenadas: retângulos [x1, y1, x2, y2] no sistema do PDF (y para cima).
 */
import { rgb } from 'pdf-lib';

export const ORN = {
  ink: rgb(0.13, 0.12, 0.11),
  panel: rgb(0.88, 0.88, 0.87),
  paper: rgb(1, 1, 1),
  field: rgb(0.93, 0.94, 0.97),
};

// Caminho SVG (y para baixo, origem no canto superior esquerdo do retângulo).
const chamferPath = (w, h, c) =>
  `M ${c} 0 L ${w - c} 0 L ${w} ${c} L ${w} ${h - c} L ${w - c} ${h} L ${c} ${h} L 0 ${h - c} L 0 ${c} Z`;

const roundPath = (w, h, r) =>
  `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;

const svg = (page, [x1, , , y2], path, opts) => page.drawSvgPath(path, { x: x1, y: y2, ...opts });
const size = ([x1, y1, x2, y2]) => [x2 - x1, y2 - y1];
const inset = ([x1, y1, x2, y2], d) => [x1 + d, y1 + d, x2 - d, y2 - d];

/** Fundo cinza arredondado atrás de um grupo de caixas. */
export function panel(page, rect, r = 9) {
  const [w, h] = size(rect);
  svg(page, rect, roundPath(w, h, r), { color: ORN.panel, borderWidth: 0 });
}

/** Moldura de cantos chanfrados com borda dupla (grossa por fora, fina por dentro). */
export function frame(page, rect, { cut = 7, fill = ORN.paper } = {}) {
  const [w, h] = size(rect);
  svg(page, rect, chamferPath(w, h, cut), { color: fill, borderColor: ORN.ink, borderWidth: 1.4 });
  const inner = inset(rect, 2.6);
  const [iw, ih] = size(inner);
  svg(page, inner, chamferPath(iw, ih, Math.max(2, cut - 1.6)), { borderColor: ORN.ink, borderWidth: 0.45 });
}

/** Escudo (CA). */
export function shield(page, rect) {
  const [w, h] = size(rect);
  const path = (W, H) =>
    `M 0 ${H * 0.08} Q ${W * 0.25} 0 ${W / 2} ${H * 0.04} Q ${W * 0.75} 0 ${W} ${H * 0.08} ` +
    `L ${W} ${H * 0.55} Q ${W * 0.95} ${H * 0.85} ${W / 2} ${H} Q ${W * 0.05} ${H * 0.85} 0 ${H * 0.55} Z`;
  svg(page, rect, path(w, h), { color: ORN.paper, borderColor: ORN.ink, borderWidth: 1.6 });
  const inner = inset(rect, 3);
  const [iw, ih] = size(inner);
  svg(page, inner, path(iw, ih), { borderColor: ORN.ink, borderWidth: 0.45 });
}

/** Oval (modificador de atributo, bônus de proficiência). */
export function oval(page, rect) {
  const [x1, y1, x2, y2] = rect;
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const rx = (x2 - x1) / 2, ry = (y2 - y1) / 2;
  page.drawEllipse({ x: cx, y: cy, xScale: rx, yScale: ry, color: ORN.paper, borderColor: ORN.ink, borderWidth: 1.4 });
  page.drawEllipse({ x: cx, y: cy, xScale: rx - 2.4, yScale: ry - 2.4, borderColor: ORN.ink, borderWidth: 0.45 });
}

/**
 * Faixa com uma caixa na ponta esquerda (Inspiração, Proficiência, Percepção
 * passiva). `shape`: 'square' | 'circle'.
 */
export function tab(page, rect, boxW, shape = 'square') {
  const [x1, y1, x2, y2] = rect;
  const h = y2 - y1;
  frame(page, [x1 + boxW * 0.6, y1 + h * 0.18, x2, y2 - h * 0.18], { cut: 4 });
  if (shape === 'circle') oval(page, [x1, y1, x1 + boxW, y2]);
  else frame(page, [x1, y1, x1 + boxW, y2], { cut: 4 });
}

/** Faixa do nome: moldura com pontas recortadas, estilo pergaminho. */
export function banner(page, rect) {
  const [w, h] = size(rect);
  const n = Math.min(10, h / 2.5);
  const path = (W, H) => `M 0 0 L ${W} 0 L ${W - n} ${H / 2} L ${W} ${H} L 0 ${H} L ${n} ${H / 2} Z`;
  svg(page, rect, path(w, h), { color: ORN.paper, borderColor: ORN.ink, borderWidth: 1.4 });
  const inner = inset(rect, 2.6);
  const [iw, ih] = size(inner);
  svg(page, inner, path(iw, ih), { borderColor: ORN.ink, borderWidth: 0.45 });
}

/** Fundo suave de um campo de texto de uma linha. */
export function fieldBg(page, [x1, y1, x2, y2]) {
  page.drawRectangle({ x: x1, y: y1, width: x2 - x1, height: y2 - y1, color: ORN.field });
}

/** Título centralizado (rótulo de seção na base ou topo de uma moldura). */
export function caption(page, font, text, rect, y, sz = 6.5) {
  const [x1, , x2] = rect;
  const w = font.widthOfTextAtSize(text, sz);
  page.drawText(text, { x: (x1 + x2) / 2 - w / 2, y, size: sz, font, color: ORN.ink });
}

/** Marca da Forja no topo de toda página. */
export function brandHeader(page, bold, font, subtitle) {
  page.drawText('FORJA DE HERÓIS', { x: 40, y: 766, size: 12, font: bold, color: ORN.ink });
  const w = bold.widthOfTextAtSize('FORJA DE HERÓIS', 12);
  page.drawLine({ start: { x: 40, y: 762 }, end: { x: 40 + w, y: 762 }, thickness: 0.8, color: ORN.ink });
  page.drawText(subtitle, { x: 40, y: 753, size: 6.5, font, color: ORN.ink });
}

/** Painéis e molduras das páginas 1 e 2, desenhados antes dos campos. */
export function decorateMainPages([p1, p2], byName) {
  const r = n => byName[n].rect;

  // ---- Página 1 ----
  banner(p1, [40, 696, 236, 740]);
  frame(p1, [258, 688, 580, 752], { cut: 9 });

  // Atributos: coluna cinza; cada atributo numa moldura com o oval do modificador.
  panel(p1, [26, 222, 90, 662]);
  for (const [score, mod] of [['STR', 'STRmod'], ['DEX', 'DEXmod'], ['CON', 'CONmod'], ['INT', 'INTmod'], ['WIS', 'WISmod'], ['CHA', 'CHamod']]) {
    const s = r(score), m = r(mod);
    frame(p1, [s[0] - 5, m[1] + 2, s[2] + 5, s[3] + 14], { cut: 6 });
    oval(p1, [m[0] - 6, m[1] - 4, m[2] + 6, m[3] + 4]);
  }

  tab(p1, [94, 640, 208, 665], 27, 'square');
  tab(p1, [94, 602, 208, 627], 27, 'circle');
  frame(p1, [94, 490, 208, 594]);
  frame(p1, [94, 212, 208, 480]);
  tab(p1, [28, 180, 204, 205], 28, 'square');
  frame(p1, [28, 22, 204, 174]);

  // Combate: painel central.
  panel(p1, [218, 424, 395, 670]);
  shield(p1, [226, 610, 269, 666]);
  frame(p1, [280, 605, 328, 664], { cut: 5 });
  frame(p1, [338, 605, 386, 664], { cut: 5 });
  frame(p1, [226, 537, 386, 600]);
  frame(p1, [226, 485, 386, 533]);
  frame(p1, [226, 429, 298, 480], { cut: 5 });
  frame(p1, [302, 429, 389, 480], { cut: 5 });

  frame(p1, [212, 212, 395, 416]);
  frame(p1, [212, 22, 395, 207]);
  for (const c of ['CP', 'SP', 'EP', 'GP', 'PP']) {
    const [x1, y1, x2, y2] = r(c);
    frame(p1, [x1 - 3, y1 - 3, x2 + 3, y2 + 3], { cut: 4 });
  }

  // Personalidade: painel à direita.
  panel(p1, [408, 418, 584, 670]);
  frame(p1, [413, 593, 579, 662]);
  frame(p1, [413, 537, 579, 588]);
  frame(p1, [413, 481, 579, 532]);
  frame(p1, [413, 425, 579, 476]);
  frame(p1, [406, 22, 584, 412]);

  // ---- Página 2 ----
  banner(p2, [40, 692, 250, 738]);
  frame(p2, [256, 684, 580, 752], { cut: 9 });
  frame(p2, [28, 436, 208, 676]);
  frame(p2, [216, 436, 410, 676]);
  panel(p2, [414, 488, 584, 676]);
  frame(p2, [418, 494, 568, 668]);
  frame(p2, [28, 22, 208, 426]);
  frame(p2, [216, 206, 584, 430]);
  frame(p2, [216, 22, 584, 202]);
}

/** Etiqueta pontuda com o número do círculo de magia. */
export function badge(page, bold, rect, text) {
  const [x1, y1, x2, y2] = rect;
  const [w, h] = size(rect);
  const path = (W, H) => `M 0 ${H * 0.18} L ${W * 0.6} 0 L ${W} ${H * 0.5} L ${W * 0.6} ${H} L 0 ${H * 0.82} Z`;
  svg(page, rect, path(w, h), { color: ORN.paper, borderColor: ORN.ink, borderWidth: 1.4 });
  const inner = inset(rect, 2.4);
  const [iw, ih] = size(inner);
  svg(page, inner, path(iw, ih), { borderColor: ORN.ink, borderWidth: 0.45 });
  const sz = 11;
  const tw = bold.widthOfTextAtSize(text, sz);
  page.drawText(text, { x: x1 + w * 0.42 - tw / 2, y: (y1 + y2) / 2 - sz * 0.35, size: sz, font: bold, color: ORN.ink });
}

const SPELL_COLUMNS = [[22, 205], [211, 394], [400, 583]];

/**
 * Página de magias: blocos por círculo (fundo claro), barra com a etiqueta do
 * número e as caixas de espaços, e o cabeçalho com faixa e molduras.
 * Devolve onde escrever os rótulos (só no 1º círculo, como na ficha clássica).
 */
export function decorateSpellPage(page, bold, rectOf, spellRows) {
  banner(page, [40, 694, 262, 738]);
  frame(page, [272, 698, 580, 750], { cut: 9 });
  for (const n of ['SpellcastingAbility 2', 'SpellSaveDC  2', 'SpellAtkBonus 2']) {
    const [x1, y1, x2, y2] = rectOf[n];
    frame(page, [x1 - 4, y1 - 0.5, x2 + 4, y2 + 2], { cut: 5, fill: ORN.field });
  }
  for (let lvl = 0; lvl <= 9; lvl++) {
    const rows = spellRows[lvl].map(r => rectOf[r.field]);
    const first = rows[0];
    const col = SPELL_COLUMNS.find(([a, b]) => first[0] >= a && first[0] < b);
    const bottom = Math.min(...rows.map(r => r[1])) - 5;
    // Barra do cabeçalho do círculo: sobre os espaços (1+) ou acima das linhas (truques).
    const bar = lvl === 0
      ? [col[0] + 18, first[3] + 6, col[1] - 6, first[3] + 22]
      : (() => { const t = rectOf[`SlotsTotal ${lvl + 18}`], u = rectOf[`SlotsRemaining ${lvl + 18}`]; return [t[0] - 6, t[1] - 4, u[2] + 4, t[3] + 4]; })();
    const top = bar[3] + (lvl === 1 ? 14 : 5);
    page.drawSvgPath(roundPath(col[1] - col[0], top - bottom, 7), { x: col[0], y: top, color: rgb(0.95, 0.95, 0.94), borderColor: rgb(0.7, 0.7, 0.69), borderWidth: 0.6 });
    frame(page, bar, { cut: 5 });
    if (lvl > 0) {
      for (const n of [`SlotsTotal ${lvl + 18}`, `SlotsRemaining ${lvl + 18}`]) fieldBg(page, rectOf[n]);
    }
    badge(page, bold, [col[0] + 2, bar[1] - 4, col[0] + 26, bar[3] + 4], String(lvl));
    for (const r of rows) {
      fieldBg(page, r);
      page.drawLine({ start: { x: r[0], y: r[1] }, end: { x: r[2], y: r[1] }, thickness: 0.6, color: ORN.ink });
    }
  }
}
