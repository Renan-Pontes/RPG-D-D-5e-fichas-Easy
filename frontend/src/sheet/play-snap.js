// Aba Jogar no celular/tablet: dois gestos diferentes.
//  • Arrastar (dedo apoiado, devagar): rolagem nativa, livre e fina; nada encaixa.
//  • Arremessar (flick: dedo rápido que solta em movimento): corta a inércia nativa e leva,
//    numa animação curta, o topo do PRÓXIMO painel (ou do anterior) ao topo da tela. Painel
//    mais alto que a tela anda uma tela por arremesso, sem pular o conteúdo dele.

export const FLICK = { minSpeed: 0.55, window: 90, maxHold: 350, margin: 12, page: 0.85, ms: 260 };

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
export function flickDelta(rects, vh, dir, opts = FLICK) {
  const m = opts.margin;
  const max = vh * opts.page;
  if (dir > 0) {
    const next = rects.map(r => r.top - m).filter(d => d > 8).sort((x, y) => x - y)[0];
    if (next == null) return Math.min(max, Math.max(0, ...rects.map(r => r.bottom - (vh - m))));
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

/** Liga os gestos (devolve a função que desliga). */
export function attachPlaySnap(getPanels, { maxWidth = 1023 } = {}) {
  if (typeof window === 'undefined') return () => {};
  let samples = [], anim = 0, holdStart = 0;
  const root = document.documentElement;
  const stop = () => { if (anim) { cancelAnimationFrame(anim); anim = 0; root.style.overflow = ''; } };
  const onStart = (e) => {
    stop();
    holdStart = performance.now();
    samples = [{ y: e.touches[0].clientY, t: holdStart }];
  };
  const onMove = (e) => {
    const t = performance.now();
    samples.push({ y: e.touches[0].clientY, t });
    if (samples.length > 12) samples.shift();
  };
  const onEnd = () => {
    if (window.innerWidth > maxWidth || e_multi) return;
    const dir = flickDir(samples);
    samples = [];
    if (!dir) return;
    const rects0 = getPanels().map(el => el.getBoundingClientRect()).filter(r => r.height > 0);
    if (!rects0.length || rects0[0].top > window.innerHeight || rects0[rects0.length - 1].bottom < 0) return;
    // corta a inércia nativa já; o alvo é medido no quadro seguinte, depois que o último
    // pedaço da rolagem do dedo foi aplicado (senão ele "briga" com a animação)
    root.style.overflow = 'hidden';
    anim = requestAnimationFrame(() => requestAnimationFrame(() => go(dir)));
  };
  const go = (dir) => {
    const rects = getPanels().map(el => el.getBoundingClientRect()).filter(r => r.height > 0);
    const d = flickDelta(rects, window.innerHeight, dir);
    if (!d) { anim = 0; root.style.overflow = ''; return; }
    const from = window.scrollY, to = from + d;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { window.scrollTo(0, to); anim = 0; root.style.overflow = ''; return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / FLICK.ms);
      window.scrollTo(0, from + (to - from) * ease(k));
      if (k < 1) anim = requestAnimationFrame(step); else { anim = 0; root.style.overflow = ''; }
    };
    anim = requestAnimationFrame(step);
  };
  let e_multi = false;
  const onStartWrap = (e) => { e_multi = e.touches.length > 1; if (!e_multi) onStart(e); };
  window.addEventListener('touchstart', onStartWrap, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onEnd, { passive: true });
  return () => {
    stop();
    window.removeEventListener('touchstart', onStartWrap);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onEnd);
  };
}
