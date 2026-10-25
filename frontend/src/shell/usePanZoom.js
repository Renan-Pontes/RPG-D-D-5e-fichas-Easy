// Ver de perto e andar pelo mapa com o dedo (plano §4.5): pinça, um dedo no
// fundo, roda do mouse e os botões ＋ − ⤢. Mesma ideia de prep/MapCanvas.jsx e
// world/WorldMap.jsx, num lugar só, para o mapa de combate e o do jogador.
//
// - As contas são puras e testadas em tests/pan-zoom.test.js: a vista é
//   { z, x, y } — z é o zoom (1 = o conteúdo inteiro cabe na caixa) e (x, y) é
//   onde o canto (0, 0) do conteúdo fica na caixa, em px de tela.
// - O hook só liga os eventos: mede a caixa, guarda a vista e transforma os
//   ponteiros em gestos (pan, pinça, arrastar um item, tocar). Quem desenha é o
//   componente (canvas, SVG ou HTML).
// - A caixa precisa de `touch-action: none` (só ela: fora do mapa a página rola).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 1.5;
/** Quanto o ponteiro anda (px de tela) antes de o toque virar arrasto. */
export const TAP_SLOP = { touch: 8, pen: 6, mouse: 4 };

const ok = (n) => typeof n === 'number' && Number.isFinite(n);
const hasSize = (r) => !!r && r.w > 0 && r.h > 0;

/** Zoom dentro de [min, max]; valor inválido vira o mínimo. */
export function clampZoom(z, min = ZOOM_MIN, max = ZOOM_MAX) {
  return ok(z) ? Math.min(max, Math.max(min, z)) : min;
}

/** Escala do zoom 1: o conteúdo inteiro cabe na caixa (como `object-fit: contain`). */
export function fitScale(box, content) {
  if (!hasSize(box) || !hasSize(content)) return 1;
  return Math.min(box.w / content.w, box.h / content.h);
}

/** px de tela por unidade do conteúdo, na vista atual. */
export function viewScale(view, box, content) {
  return fitScale(box, content) * (view?.z || 1);
}

/** "Ver tudo": zoom 1, conteúdo no meio da caixa. */
export function fitView(box, content) {
  const s = fitScale(box, content);
  if (!hasSize(box) || !hasSize(content)) return { z: 1, x: 0, y: 0 };
  return { z: 1, x: (box.w - content.w * s) / 2, y: (box.h - content.h * s) / 2 };
}

/**
 * Prende a vista: com o conteúdo maior que a caixa, nada de vão nas bordas;
 * menor que a caixa (no zoom 1, numa direção), fica no meio.
 */
export function clampView(view, box, content, { min = ZOOM_MIN, max = ZOOM_MAX } = {}) {
  const z = clampZoom(view?.z, min, max);
  if (!hasSize(box) || !hasSize(content)) return { z, x: ok(view?.x) ? view.x : 0, y: ok(view?.y) ? view.y : 0 };
  const S = fitScale(box, content) * z;
  const axis = (pos, b, c) => {
    const len = c * S;
    if (len <= b + 0.5) return (b - len) / 2;
    return Math.min(0, Math.max(b - len, ok(pos) ? pos : 0));
  };
  return { z, x: axis(view?.x, box.w, content.w), y: axis(view?.y, box.h, content.h) };
}

/** Caixa (px) → conteúdo (unidades do conteúdo). */
export function toContent(view, px, py, box, content) {
  const S = viewScale(view, box, content);
  return { x: (px - view.x) / S, y: (py - view.y) / S };
}

/** Conteúdo → caixa (px). */
export function toBox(view, x, y, box, content) {
  const S = viewScale(view, box, content);
  return { x: view.x + x * S, y: view.y + y * S };
}

/** Zoom para `z` com o ponto (px, py) da caixa parado debaixo do dedo/cursor. */
export function zoomAround(view, z, px, py, box, content, lim) {
  const s = fitScale(box, content);
  const nz = clampZoom(z, lim?.min, lim?.max);
  const c = { x: (px - view.x) / (s * view.z), y: (py - view.y) / (s * view.z) };
  return clampView({ z: nz, x: px - c.x * s * nz, y: py - c.y * s * nz }, box, content, lim);
}

/** ＋ (dir > 0) ou − (dir < 0) em torno do meio da caixa; encosta nos limites. */
export function stepZoom(view, dir, box, content, lim) {
  let z = dir > 0 ? view.z * ZOOM_STEP : view.z / ZOOM_STEP;
  if (Math.abs(z - 1) < 0.02) z = 1;
  return zoomAround(view, z, (box?.w || 0) / 2, (box?.h || 0) / 2, box, content, lim);
}

/** Arrastar o fundo: a vista anda (dx, dy) px, presa às bordas. */
export function panView(view, dx, dy, box, content, lim) {
  return clampView({ z: view.z, x: view.x + dx, y: view.y + dy }, box, content, lim);
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Pinça: `start` = { view, a, b } quando o 2º dedo encostou; (a1, b1) agora
 * (px da caixa). O zoom segue a abertura dos dedos e o ponto do conteúdo que
 * estava entre eles acompanha o meio dos dedos (pinça e arrasto juntos).
 */
export function pinchView(start, a1, b1, box, content, lim) {
  const { view, a, b } = start;
  const d0 = dist(a, b) || 1;
  const s = fitScale(box, content);
  const nz = clampZoom(view.z * (dist(a1, b1) / d0), lim?.min, lim?.max);
  const m0 = mid(a, b), m1 = mid(a1, b1);
  const c = { x: (m0.x - view.x) / (s * view.z), y: (m0.y - view.y) / (s * view.z) };
  return clampView({ z: nz, x: m1.x - c.x * s * nz, y: m1.y - c.y * s * nz }, box, content, lim);
}

/** Fator de zoom de um evento de roda (mouse: ~1,2× por dente; trackpad: suave). */
export function wheelFactor(deltaY, deltaMode = 0) {
  const px = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 400 : 1);
  return Math.exp(-Math.max(-120, Math.min(120, px)) * 0.0018);
}

/**
 * O item tocado: entre os que estão a até max(raio, minRadius) do ponto,
 * o de borda mais perto (dentro do desenho ganha; empate fica com o de cima,
 * o último da lista). Itens: { id, x, y, r } em unidades do conteúdo.
 */
export function nearestHit(items, p, minRadius = 0) {
  let best = null;
  let bestScore = Infinity;
  for (const it of items || []) {
    const d = Math.hypot(it.x - p.x, it.y - p.y);
    const r = it.r || 0;
    if (d > Math.max(r, minRadius)) continue;
    const score = d - r;
    if (score <= bestScore) { best = it; bestScore = score; }
  }
  return best;
}

/** O ponteiro andou o bastante para deixar de ser toque? */
export function passedSlop(dx, dy, pointerType = 'mouse') {
  return Math.hypot(dx, dy) > (TAP_SLOP[pointerType] ?? TAP_SLOP.mouse);
}

/**
 * Hook dos gestos.
 *   const pz = usePanZoom({ content: { w, h }, hitTest, onItemDrag, onItemDrop, onItemTap, onItemCancel });
 *   <div ref={pz.boxRef} {...pz.handlers} style={{ touchAction: 'none' }}>…</div>
 * - `hitTest(ponto do conteúdo, escala)` devolve o id do item sob o dedo (ou null).
 * - Um dedo num item arrasta o item (onItemDragStart com o ponto onde encostou,
 *   onItemDrag a cada movimento, onItemDrop ao soltar); sem mexer é um toque
 *   (onItemTap). No fundo, move a vista; sem mexer é onTap.
 * - Dois dedos: pinça (um arrasto de item em andamento é cancelado: onItemCancel).
 * - Roda: zoom no cursor. No zoom mínimo (ou máximo), a roda que não muda nada
 *   devolve a rolagem à página.
 */
export function usePanZoom({
  content, min = ZOOM_MIN, max = ZOOM_MAX, enabled = true,
  hitTest, onItemDragStart, onItemDrag, onItemDrop, onItemTap, onItemCancel, onTap,
} = {}) {
  const boxRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [rawView, setRawView] = useState(null); // null = ainda não mexeu: "ver tudo"
  const [mode, setMode] = useState('idle'); // idle | pan | pinch | item
  const cw = content?.w || 0, ch = content?.h || 0;
  const lim = { min, max };
  const view = rawView ? clampView(rawView, box, { w: cw, h: ch }, lim) : fitView(box, { w: cw, h: ch });

  const live = useRef({});
  live.current = { view, box, content: { w: cw, h: ch }, lim, enabled, hitTest, onItemDragStart, onItemDrag, onItemDrop, onItemTap, onItemCancel, onTap };

  // mede a caixa (gira o celular, abre a barra lateral…)
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight;
      setBox(b => (Math.abs(b.w - w) < 0.5 && Math.abs(b.h - h) < 0.5 ? b : { w, h }));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const setView = useCallback((next) => {
    setRawView(cur => {
      const L = live.current;
      const base = cur ? clampView(cur, L.box, L.content, L.lim) : fitView(L.box, L.content);
      const v = typeof next === 'function' ? next(base) : next;
      return v ? clampView(v, L.box, L.content, L.lim) : null;
    });
  }, []);
  const zoomIn = useCallback(() => setView(v => stepZoom(v, 1, live.current.box, live.current.content, live.current.lim)), [setView]);
  const zoomOut = useCallback(() => setView(v => stepZoom(v, -1, live.current.box, live.current.content, live.current.lim)), [setView]);
  const fit = useCallback(() => setRawView(null), []);

  // ---------------------------------------------------------------- ponteiros
  const pointers = useRef(new Map());
  const gesture = useRef(null);

  const local = (e) => {
    const r = boxRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const contentAt = (p) => {
    const L = live.current;
    return toContent(L.view, p.x, p.y, L.box, L.content);
  };
  const end = () => { gesture.current = null; setMode('idle'); };

  const onPointerDown = (e) => {
    const L = live.current;
    if (!L.enabled || !boxRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { boxRef.current.setPointerCapture(e.pointerId); } catch { /* ok */ }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (pointers.current.size === 2) {
      if (g?.type === 'item' && g.moved) L.onItemCancel?.(g.id);
      const [a, b] = [...pointers.current.values()];
      gesture.current = { type: 'pinch', start: { view: L.view, a, b } };
      setMode('pinch');
      return;
    }
    if (pointers.current.size > 2) return;
    const scale = viewScale(L.view, L.box, L.content);
    const id = L.hitTest ? L.hitTest(contentAt(p), scale, e.pointerType) : null;
    if (id != null) {
      gesture.current = { type: 'item', id, sx: p.x, sy: p.y, moved: false, pt: e.pointerType };
      setMode('item');
    } else {
      gesture.current = { type: 'pan', sx: p.x, sy: p.y, view: L.view, moved: false, pt: e.pointerType };
      setMode('pan');
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const L = live.current;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (g.type === 'pinch') {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      setRawView(pinchView(g.start, a, b, L.box, L.content, L.lim));
    } else if (g.type === 'pan') {
      if (!g.moved && !passedSlop(p.x - g.sx, p.y - g.sy, g.pt)) return;
      g.moved = true;
      setRawView(panView(g.view, p.x - g.sx, p.y - g.sy, L.box, L.content, L.lim));
    } else if (g.type === 'item') {
      if (!g.moved && !passedSlop(p.x - g.sx, p.y - g.sy, g.pt)) return;
      if (!g.moved) { g.moved = true; L.onItemDragStart?.(g.id, contentAt({ x: g.sx, y: g.sy })); }
      L.onItemDrag?.(g.id, contentAt(p));
    }
  };

  const onPointerUp = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const L = live.current;
    const p = local(e);
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) { if (!pointers.current.size) setMode('idle'); return; }
    if (g.type === 'pinch') {
      // o dedo que sobra não faz nada até todos saírem (não "pula" a vista)
      if (pointers.current.size < 2) gesture.current = { type: 'done' };
      return;
    }
    if (g.type === 'done') { if (!pointers.current.size) end(); return; }
    if (pointers.current.size) return;
    if (g.type === 'item') {
      if (g.moved) L.onItemDrop?.(g.id, contentAt(p));
      else L.onItemTap?.(g.id);
    } else if (g.type === 'pan' && !g.moved) {
      L.onTap?.(contentAt(p));
    }
    end();
  };

  const onPointerCancel = (e) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.type === 'item' && g.moved) live.current.onItemCancel?.(g.id);
    if (!pointers.current.size) end();
    else gesture.current = { type: 'done' };
  };

  // roda do mouse: listener não-passivo para poder segurar a rolagem da página
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      const L = live.current;
      if (!L.enabled) return;
      const f = wheelFactor(e.deltaY, e.deltaMode);
      const z = L.view.z;
      if ((f < 1 && z <= L.lim.min + 1e-6) || (f > 1 && z >= L.lim.max - 1e-6)) return; // nada muda: a página rola
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      setRawView(cur => {
        const base = cur ? clampView(cur, L.box, L.content, L.lim) : fitView(L.box, L.content);
        return zoomAround(base, base.z * f, px, py, L.box, L.content, L.lim);
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return {
    boxRef, box, view, mode,
    scale: viewScale(view, box, { w: cw, h: ch }),
    setView, zoomIn, zoomOut, fit,
    canZoomIn: view.z < max - 1e-6, canZoomOut: view.z > min + 1e-6,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
