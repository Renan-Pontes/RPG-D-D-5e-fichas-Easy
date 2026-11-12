// Aba Jogar no celular/tablet (uma coluna): depois de um deslize vertical, a tela
// "encaixa" no painel mais próximo (topo do painel no topo da tela). Painel mais alto que a
// tela não prende: enquanto se lê dentro dele, nada encaixa; ao chegar perto do fim, encaixa
// no fim dele ou no próximo. Só depois de toque (mouse/teclado rolam livres).

/**
 * Para onde encaixar. `tops`/`bottoms` dos painéis relativos à tela; `vh` altura da tela.
 * Devolve o deslocamento a aplicar (px; 0 = fica onde está).
 */
export function snapDelta(rects, vh, { margin = 12, reach = 0.35 } = {}) {
  if (!rects.length) return 0;
  // dentro de um painel mais alto que a tela, lendo o meio dele: não mexe
  const inside = rects.find(r => r.top < margin && r.bottom > vh);
  if (inside) return 0;
  let best = null;
  for (const r of rects) {
    const toTop = r.top - margin;
    if (Math.abs(toTop) <= vh * reach && (!best || Math.abs(toTop) < Math.abs(best))) best = toTop;
    // fim de painel alto à vista: alinhar o fim dele com o pé da tela
    if (r.bottom - r.top > vh - margin * 2) {
      const toEnd = r.bottom - (vh - margin);
      if (Math.abs(toEnd) <= vh * reach && (!best || Math.abs(toEnd) < Math.abs(best))) best = toEnd;
    }
  }
  return best == null || Math.abs(best) < 2 ? 0 : best;
}

/** Liga o encaixe na lista de painéis (devolve a função que desliga). */
export function attachPlaySnap(getPanels, { maxWidth = 1023 } = {}) {
  if (typeof window === 'undefined') return () => {};
  let touched = false, timer = null, snapping = false;
  const onTouch = () => { touched = true; };
  const settle = () => {
    if (!touched || snapping || window.innerWidth > maxWidth) return;
    touched = false;
    const rects = getPanels().map(el => el.getBoundingClientRect()).filter(r => r.height > 0);
    const d = snapDelta(rects, window.innerHeight);
    if (!d) return;
    snapping = true;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollBy({ top: d, behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => { snapping = false; }, 500);
  };
  const onScroll = () => { clearTimeout(timer); timer = setTimeout(settle, 140); };
  window.addEventListener('touchend', onTouch, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    clearTimeout(timer);
    window.removeEventListener('touchend', onTouch);
    window.removeEventListener('scroll', onScroll);
  };
}
