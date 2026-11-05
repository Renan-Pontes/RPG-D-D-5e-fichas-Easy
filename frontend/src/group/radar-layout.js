// Contas dos radares do Raio-X (Radar.jsx só desenha): onde cada rótulo fica, se os rótulos
// cabem sem se sobrepor, a escala dos bônus e as abreviações das perícias. Sem React —
// testado em tests/radar-layout.test.js (os tamanhos que a tela usa ficam conferidos lá).
//
// A largura do texto é uma estimativa (0,58 em por letra, folgada para a EB Garamond em
// versalete/maiúscula); o teste usa a mesma conta, então "não sobrepõe" vale com folga.
const CHAR_EM = 0.58;
const LABEL_GAP = 8;     // do fim do raio até o começo do rótulo
const LINE = 1.1;        // altura da linha do rótulo, em em

/** Rótulo longo ("Corpo a corpo") em até 2 linhas, quebrando no espaço do meio. */
export function labelLines(text) {
  const s = String(text || '');
  if (s.length <= 9 || !s.includes(' ')) return [s];
  const mid = s.length / 2;
  let best = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [s.slice(0, best), s.slice(best + 1)];
}

export const textWidth = (s, size) => String(s || '').length * size * CHAR_EM;

/**
 * Espaço em volta do radar para os rótulos: o rótulo mais largo mais a folga (os dos lados
 * crescem para fora). Sem rótulos, 8 px.
 */
export function autoPad(axes, labelSize = 13, labels = true) {
  if (!labels) return 8;
  const widest = Math.max(0, ...axes.map(a => Math.max(...labelLines(a.label).map(l => textWidth(l, labelSize)))));
  return Math.ceil(LABEL_GAP + widest + 2);
}

/**
 * Onde fica cada rótulo: o ponto de ancoragem (x, y da 1ª linha), a âncora do texto e a
 * caixa que ele ocupa (para conferir sobreposição e se cabe no quadro).
 * → [{x, y, anchor, lines, box: {x0, y0, x1, y1}}]
 */
export function radarLabelLayout({ axes, size, pad, labelSize = 13 }) {
  const n = axes.length;
  const c = size / 2;
  const R = c - pad;
  const lh = labelSize * LINE;
  return axes.map((a, i) => {
    const ang = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const x = c + (R + LABEL_GAP) * cos;
    const y = c + (R + LABEL_GAP) * sin;
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
    const lines = labelLines(a.label);
    // em cima, o texto sobe; embaixo, desce; dos lados, fica centrado na ponta do raio
    const y0 = sin > 0.5 ? y + labelSize * 0.9 : sin < -0.5 ? y - 2 - (lines.length - 1) * lh : y + labelSize * 0.35 - ((lines.length - 1) * lh) / 2;
    const w = Math.max(...lines.map(l => textWidth(l, labelSize)));
    const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
    // a caixa é a do navegador: do topo da fonte (≈ 0,95 em acima da linha de base) ao pé
    // das letras que descem (≈ 0,3 em abaixo), em cada linha
    const top = y0 - labelSize * 0.95;
    const bottom = y0 + (lines.length - 1) * lh + labelSize * 0.3;
    return { x, y: y0, anchor, lines, box: { x0, y0: top, x1: x0 + w, y1: bottom } };
  });
}

const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Os rótulos cabem? → {inside: todos dentro do quadro, overlaps: [[i, j]] que se tocam} */
export function labelsFit(layout, size) {
  const overlaps = [];
  for (let i = 0; i < layout.length; i++) {
    for (let j = i + 1; j < layout.length; j++) if (hit(layout[i].box, layout[j].box)) overlaps.push([i, j]);
  }
  const inside = layout.every(l => l.box.x0 >= -0.5 && l.box.y0 >= -0.5 && l.box.x1 <= size + 0.5 && l.box.y1 <= size + 0.5);
  return { inside, overlaps };
}

/**
 * Escala dos bônus (salvaguardas e perícias de cada personagem): do menor ao maior valor do
 * grupo, em passos de 2, com o 0 sempre dentro — os valores (−1…+7 no nível 1) ocupam o
 * radar inteiro em vez de ficar espremidos no centro de um −5…+15.
 * → {min, max, rings, mark: 0}
 */
export function bonusScale(values) {
  const vals = (values || []).filter(Number.isFinite);
  const lo = Math.floor(Math.min(-1, ...vals) / 2) * 2;
  const hi = Math.ceil(Math.max(4, ...vals) / 2) * 2;
  const mid = Math.round(hi / 4) * 2;
  const rings = [...new Set([lo, 0, mid, hi])].filter(v => v >= lo && v <= hi).sort((a, b) => a - b);
  return { min: lo, max: hi, rings, mark: 0 };
}

// Abreviações das 18 perícias nos eixos (até 8 letras; o nome inteiro fica no <title> e nas
// listas). Cuidado com as que começam igual: Intuição/Intimidação/Investigação.
export const SHORT_SKILL = {
  acrobatics: ['Acrob.', 'Acro.'], animalHandling: ['Animais', 'Animal'], arcana: ['Arcan.', 'Arcana'], athletics: ['Atlet.', 'Athl.'],
  deception: ['Blefar', 'Decep.'], history: ['Hist.', 'Hist.'], insight: ['Intuição', 'Insight'], intimidation: ['Intim.', 'Intim.'],
  investigation: ['Invest.', 'Invest.'], medicine: ['Medic.', 'Med.'], nature: ['Natur.', 'Nature'], perception: ['Perc.', 'Perc.'],
  performance: ['Atuação', 'Perf.'], persuasion: ['Persu.', 'Pers.'], religion: ['Relig.', 'Relig.'], sleightOfHand: ['Prest.', 'Sleight'],
  stealth: ['Furtiv.', 'Stealth'], survival: ['Sobrev.', 'Surv.'],
};
export const shortSkill = (k, lang) => SHORT_SKILL[k]?.[lang === 'en' ? 1 : 0] || k;

// Os tamanhos dos radares de perícias (18 eixos) que a tela usa, conferidos no teste: com
// rótulos de 12 px, nada se sobrepõe e tudo cabe no quadro.
export const SKILL_RADAR = { each: 320, overlay: 360, group: 360, labelSize: 12 };
