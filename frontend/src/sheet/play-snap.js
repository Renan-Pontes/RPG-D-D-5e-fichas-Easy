import { ROLL_FIELD_SELECTOR } from '../dice/dice-gestures.js';
// Aba Jogar no celular/tablet: dois gestos diferentes.
//  • Arrastar (dedo apoiado, devagar): rolagem nativa, livre e fina; nada encaixa.
//  • Arremessar (flick: dedo rápido que solta em movimento): corta a inércia nativa e leva,
//    numa animação curta, o topo do PRÓXIMO painel (ou do anterior) ao topo da tela. Painel
//    mais alto que a tela anda uma tela por arremesso, sem pular o conteúdo dele.

export const FLICK = { minSpeed: 0.4, window: 90, maxHold: 350, margin: 12, page: 0.85, ms: 110 };

/** É arremesso? `samples` = [{ y, t }] do toque (y da tela, t em ms). Devolve -1 (sobe a
 *  página = conteúdo para cima), +1 (desce) ou 0 (arrasto: deixa nativo). */
export function flickDir(samples, opts = FLICK) {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const first = samples[0];
  if (last.t - first.t > 2000) { /* gesto longo: só conta o fim */ }
  const recent = samples.filter(s => last.t - s.t <= opts.window);
  const a = recent[0];
  const dt = last.t - a.t;
  if (dt <= 0) return 0;
  const v = (a.y - last.y) / dt;                  // px/ms; >0 = dedo subiu = página desce
  if (Math.abs(v) < opts.minSpeed) return 0;
  return v > 0 ? 1 : -1;
}

/** Quanto rolar num arremesso. `rects` = painéis ({top,bottom} na tela), `vh` = altura. */
export function flickDelta(rects, vh, dir, opts = FLICK, inset = 0) {
  // `inset` = altura das barras fixas no topo (abas): o título do painel fica logo abaixo delas
  const m = opts.margin + inset;
  const max = (vh - inset) * opts.page;
  if (dir > 0) {
    const next = rects.map(r => r.top - m).filter(d => d > 8).sort((x, y) => x - y)[0];
    if (next == null) return Math.min(max, Math.max(0, ...rects.map(r => r.bottom - (vh - opts.margin))));
    return Math.min(next, max);
  }
  if (dir < 0) {
    const prev = rects.map(r => r.top - m).filter(d => d < -8).sort((x, y) => y - x)[0];
    if (prev == null) return 0;
    return Math.max(prev, -max);
  }
  return 0;
}

const ease = (k) => 1 - Math.pow(1 - k, 3);

/** Altura ocupada no topo por barras fixas/grudadas (ex.: abas da ficha no celular). */
export function topInset() {
  let bottom = 0;
  for (const el of document.querySelectorAll('.tabs, header, nav, [data-sticky-top]')) {
    const st = getComputedStyle(el);
    if (st.position !== 'sticky' && st.position !== 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.height < 200 && r.top <= 1) bottom = Math.max(bottom, r.bottom);
  }
  return bottom;
}

/** Liga os gestos (devolve a função que desliga).
 *  A rolagem vertical que COMEÇA na área dos painéis é conduzida aqui, não pelo navegador:
 *  o arrasto move a página 1:1 sob o dedo (controle fino, sem inércia), e só o arremesso
 *  anima até o painel. Assim a inércia nativa nunca se mistura ao encaixe. Gesto horizontal
 *  (trocar de aba), multitoque e controles que se arrastam (barras, sliders) seguem nativos. */
export function attachPlaySnap(getPanels, { maxWidth = 1023, area = null } = {}) {
  if (typeof window === 'undefined') return () => {};
  let samples = [], anim = 0, stuckInset = 0;
  let g = null;                                   // gesto atual: { x0, y0, s0, mode }
  const stop = () => { if (anim) { cancelAnimationFrame(anim); anim = 0; } };
  const skip = (t) => !!t?.closest?.('input, textarea, select, [role="slider"], [data-no-snap], .fh-dragbar, .hp-drag') || !!t?.closest?.(ROLL_FIELD_SELECTOR);

  const animateTo = (to, speed) => {
    const from = window.scrollY;
    const dist = Math.abs(to - from);
    if (dist < 1) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { window.scrollTo(0, to); return; }
    // duração casada com a velocidade do dedo: arremesso forte chega mais rápido
    const ms = Math.max(80, Math.min(FLICK.ms + 50, dist / Math.max(1, speed * 2)));
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      window.scrollTo(0, from + (to - from) * ease(k));
      if (k < 1) anim = requestAnimationFrame(step);
      else { anim = 0; stuckInset = Math.max(stuckInset, topInset()); }
    };
    anim = requestAnimationFrame(step);
  };

  const onStart = (e) => {
    stop();
    g = null;
    if (e.touches.length !== 1 || window.innerWidth > maxWidth) return;
    const t = e.touches[0];
    const el = area?.();
    if (el && !el.contains(e.target)) return;
    if (skip(e.target)) return;
    g = { x0: t.clientX, y0: t.clientY, s0: window.scrollY, mode: null };
    samples = [{ y: t.clientY, t: performance.now() }];
  };
  const onMove = (e) => {
    if (!g) return;
    if (e.touches.length !== 1) { g = null; return; }
    const t = e.touches[0];
    const dx = t.clientX - g.x0, dy = t.clientY - g.y0;
    if (!g.mode) {
      if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) g.mode = 'v';
      else if (Math.abs(dx) > 6) { g = null; return; }     // horizontal: navegador/abas
      else return;
    }
    e.preventDefault();                                     // sem rolagem (nem inércia) nativa
    window.scrollTo(0, g.s0 - dy);
    samples.push({ y: t.clientY, t: performance.now() });
    if (samples.length > 16) samples.shift();
  };
  const onEnd = () => {
    const was = g; g = null;
    if (!was || was.mode !== 'v') return;
    const dir = flickDir(samples);
    const last = samples[samples.length - 1], prev = samples.find(s => last.t - s.t <= FLICK.window) || samples[0];
    const speed = Math.abs((prev.y - last.y) / Math.max(1, last.t - prev.t));
    samples = [];
    if (!dir) return;                                       // arrasto: fica onde o dedo deixou
    const rects = getPanels().map(el => el.getBoundingClientRect()).filter(r => r.height > 0);
    if (!rects.length) return;
    const inset = Math.max(topInset(), stuckInset);
    const d = flickDelta(rects, window.innerHeight, dir, FLICK, inset);
    if (d) animateTo(Math.max(0, window.scrollY + d), speed);
  };
  const opts = { passive: false };
  window.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('touchmove', onMove, opts);
  window.addEventListener('touchend', onEnd, { passive: true });
  window.addEventListener('touchcancel', onEnd, { passive: true });
  return () => {
    stop();
    window.removeEventListener('touchstart', onStart);
    window.removeEventListener('touchmove', onMove, opts);
    window.removeEventListener('touchend', onEnd);
    window.removeEventListener('touchcancel', onEnd);
  };
}
