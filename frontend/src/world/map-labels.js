// Rótulos dos marcadores no mapa do Mundo (mestre e jogador), sem se cobrirem
// (F11). No celular, com o mapa inteiro na tela, os nomes se empilhavam (6
// rótulos cruzados a 320 px). Em vez de esconder todos, mostra os que cabem:
// quanto mais zoom, mais nomes aparecem. O nome de quem fica sem rótulo continua
// no leitor de tela (aria-label do marcador) e na folha que abre ao tocar.
//
// Tudo em px de tela, dentro da caixa do mapa:
//   pin = { id, x, y, w, prio }
//   - (x, y): a ponta do marcador; a cabeça ocupa HEAD_W × HEAD_H logo acima;
//   - w: largura do rótulo (medida no DOM; 0 = sem rótulo);
//   - prio: quem ganha a vaga (o selecionado, depois o que os jogadores veem).
// O rótulo fica embaixo da ponta, centrado e empurrado para dentro da caixa; se
// embaixo não couber, tenta em cima da cabeça. Nunca cobre outro rótulo nem a
// cabeça de outro marcador. O de prio ≥ FORCE (o selecionado) aparece mesmo
// encostando numa cabeça (mas nunca em outro rótulo: ele é posto primeiro).

export const HEAD_W = 36;   // a cabeça do marcador (34 px) + 1 px de cada lado
export const HEAD_H = 42;   // a gota girada é mais alta que larga
export const LABEL_H = 22;  // 12 px de texto + respiro + borda
export const GAP = 3;       // entre a ponta (ou a cabeça) e o rótulo
export const EDGE = 2;      // folga até a borda da caixa
export const FORCE = 3;     // prioridade do marcador selecionado

const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** A cabeça do marcador: o retângulo logo acima da ponta. */
export function headRect(pin) {
  const x = num(pin.x), y = num(pin.y);
  return { l: x - HEAD_W / 2, t: y - HEAD_H, r: x + HEAD_W / 2, b: y };
}

/**
 * O retângulo do rótulo de `pin` embaixo (above=false) ou em cima (above=true),
 * já empurrado para dentro da caixa na horizontal. Devolve também `dx`, o quanto
 * ele saiu do centro (o CSS desloca o rótulo nisso).
 */
export function labelRect(pin, above, box) {
  const x = num(pin.x), y = num(pin.y);
  const w = Math.max(0, num(pin.w));
  const bw = Math.max(0, num(box?.w, Infinity));
  let l = x - w / 2;
  if (Number.isFinite(bw)) {
    if (l + w > bw - EDGE) l = bw - EDGE - w;
    if (l < EDGE) l = EDGE;
  }
  const t = above ? y - HEAD_H - GAP - LABEL_H : y + GAP;
  return { l, t, r: l + w, b: t + LABEL_H, dx: Math.round((l + w / 2 - x) * 10) / 10 };
}

/** Dois retângulos se cruzam (encostar na borda não conta). */
export function hits(a, b) {
  return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
}

/** O retângulo cabe inteiro na caixa (na vertical; a horizontal já foi empurrada). */
function fitsBox(r, box) {
  const bh = num(box?.h, Infinity);
  const bw = num(box?.w, Infinity);
  return r.t >= 0 && r.b <= bh && r.l >= 0 && r.r <= bw;
}

/** O marcador está à vista na caixa (com a cabeça)? Fora dela, nem cabeça nem rótulo contam. */
export function pinInBox(pin, box) {
  const x = num(pin.x, NaN), y = num(pin.y, NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return x >= -HEAD_W && y >= 0 && x <= num(box?.w, Infinity) + HEAD_W && y <= num(box?.h, Infinity) + HEAD_H;
}

/**
 * Quais rótulos aparecem. Map id → { dx, above }; quem não está no Map fica sem
 * rótulo. Ordem de escolha: prio maior, depois quem está mais acima, depois o id
 * (determinístico: a mesma vista dá sempre os mesmos rótulos).
 * avoid: retângulos ({l, t, r, b}, px da caixa) que nenhum rótulo cobre — os
 * botões ＋ − ⤢ por cima do mapa.
 */
export function layoutPinLabels(pins, box, { avoid = [] } = {}) {
  const list = (pins || []).filter(p => p && p.id != null && pinInBox(p, box));
  const heads = list.map(p => ({ id: p.id, r: headRect(p) }));
  const order = list
    .filter(p => num(p.w) > 0)
    .sort((a, b) => num(b.prio) - num(a.prio) || num(a.y) - num(b.y) || String(a.id).localeCompare(String(b.id)));
  const placed = [...(avoid || []).filter(Boolean)];
  const out = new Map();
  for (const p of order) {
    const force = num(p.prio) >= FORCE;
    const tries = [false, true].map(above => ({ above, r: labelRect(p, above, box) }));
    const free = (c) => !placed.some(q => hits(c.r, q));
    let pick = tries.find(c => fitsBox(c.r, box) && free(c) && (force || !heads.some(h => h.id !== p.id && hits(c.r, h.r))));
    // o selecionado aparece mesmo cortado pela borda (mas nunca em cima de outro rótulo nem dos botões)
    if (!pick && force) pick = tries.find(free);
    if (!pick) continue;
    placed.push(pick.r);
    out.set(p.id, { dx: pick.r.dx, above: pick.above });
  }
  return out;
}

/**
 * A coluna de botões ＋ − ⤢ no canto de baixo da caixa (n botões de `size`), à
 * direita (o mapa do mestre) ou à esquerda (side: 'left', o do jogador: à direita
 * o dado flutuante do celular cairia em cima dela).
 */
export function zoomControlsRect(box, { n = 3, size = 44, gap = 6, inset = 8, side = 'right' } = {}) {
  const w = num(box?.w), h = num(box?.h);
  if (!(w > 0 && h > 0)) return null;
  const tall = n * size + (n - 1) * gap;
  const l = side === 'left' ? inset : w - inset - size;
  return { l, t: h - inset - tall, r: l + size, b: h - inset };
}

/**
 * Qual marcador tem o rótulo À VISTA sob o ponto `pt` (px da caixa)? O rótulo é
 * parte do alvo do marcador: tocar no nome abre o mesmo que tocar na cabeça.
 * pins e labels são os mesmos de layoutPinLabels (só os rótulos que ele pôs
 * contam); devolve o id ou null.
 */
export function labelAt(pins, labels, pt, box) {
  const x = num(pt?.x, NaN), y = num(pt?.y, NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !labels?.size) return null;
  for (const p of pins || []) {
    const lab = p && labels.get(p.id);
    if (!lab) continue;
    const r = labelRect(p, lab.above, box);
    if (x >= r.l && x <= r.r && y >= r.t && y <= r.b) return p.id;
  }
  return null;
}

/**
 * Prioridade de um marcador do mapa do mestre: o selecionado sempre; depois os
 * que os jogadores veem; depois os ocultos.
 */
export function pinPriority({ selected = false, visible = false, isNew = false } = {}) {
  if (selected) return FORCE;
  if (isNew) return 2;
  return visible ? 1 : 0;
}
