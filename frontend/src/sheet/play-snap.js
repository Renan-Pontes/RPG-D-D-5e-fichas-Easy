// Aba Jogar no celular/tablet: dois gestos diferentes.
//  • Arrastar (dedo apoiado, devagar): rolagem nativa, livre e fina; nada encaixa.
//  • Arremessar (flick: dedo rápido que solta em movimento): corta a inércia nativa e leva,
//    numa animação curta, o topo do PRÓXIMO painel (ou do anterior) ao topo da tela. Painel
//    mais alto que a tela anda uma tela por arremesso, sem pular o conteúdo dele.

export const FLICK = { minSpeed: 0.4, window: 90, maxHold: 350, margin: 12, page: 0.85, ms: 170 };

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

/** Liga os gestos (devolve a função que desliga). */
export function attachPlaySnap(getPanels, { maxWidth = 1023 } = {}) {
  if (typeof window === 'undefined') return () => {};
  let samples = [], anim = 0, holdStart = 0, stuckInset = 0;
  const stop = () => { if (anim) { cancelAnimationFrame(anim); anim = 0; } };
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
    const rects = getPanels().map(el => el.getBoundingClientRect()).filter(r => r.height > 0);
    if (!rects.length || rects[0].top > window.innerHeight || rects[rects.length - 1].bottom < 0) return;
    // alvo em coordenada ABSOLUTA da página, medido no instante em que o dedo solta: a
    // inércia nativa que ainda vier não muda o destino (cada quadro sobrescreve a rolagem)
    const inset = Math.max(topInset(), stuckInset);
    const d = flickDelta(rects, window.innerHeight, dir, FLICK, inset);
    if (!d) return;
    const to = Math.max(0, window.scrollY + d);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { window.scrollTo(0, to); return; }
    const from = window.scrollY;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / FLICK.ms);
      window.scrollTo(0, from + (to - from) * ease(k));
      if (k < 1) anim = requestAnimationFrame(step);
      else {
        anim = 0; stuckInset = Math.max(stuckInset, topInset());
        // inércia que sobrou depois do fim: um último acerto
        setTimeout(() => { if (!anim && Math.abs(window.scrollY - to) > 2) window.scrollTo(0, to); }, 90);
      }
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
