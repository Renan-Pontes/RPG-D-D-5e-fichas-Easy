// Trilho que rola de lado (segmentado das subvistas, chips de filtro, abas):
// marca com data-l / data-r a ponta que ainda tem mais (o CSS de .mesa-scroll
// põe o degradê) e traz o item ativo para a vista quando ele muda.
// A mesma ideia de components/ScrollTabs.jsx e do useEdgeFade do Grimório.
// As contas são puras (testadas em tests/scroll-edges.test.js); o hook só liga
// os eventos.
import { useEffect } from 'react';

/** Quais pontas do trilho ainda escondem conteúdo. `slack` evita piscar no meio-pixel. */
export function scrollEdges({ scrollLeft = 0, clientWidth = 0, scrollWidth = 0 } = {}, slack = 4) {
  if (scrollWidth <= clientWidth + slack) return { l: false, r: false };
  return {
    l: scrollLeft > slack,
    r: scrollLeft + clientWidth < scrollWidth - slack,
  };
}

/**
 * Novo scrollLeft para o item [start, start + width) (medido a partir do começo
 * do conteúdo do trilho) ficar inteiro à vista, com `pad` de folga para o
 * degradê não cobrir o item. null = já está à vista (ou nada rola).
 */
export function revealScrollLeft({ scrollLeft = 0, clientWidth = 0, scrollWidth = 0 } = {}, { start = 0, width = 0 } = {}, pad = 24) {
  if (scrollWidth <= clientWidth + 1 || clientWidth <= 0) return null;
  const max = scrollWidth - clientWidth;
  const end = start + width;
  let next = null;
  if (width + 2 * pad >= clientWidth) next = start - (clientWidth - width) / 2; // item quase do tamanho do trilho: centraliza
  else if (start < scrollLeft + pad) next = start - pad;
  else if (end > scrollLeft + clientWidth - pad) next = end - clientWidth + pad;
  if (next == null) return null;
  const clamped = Math.round(Math.max(0, Math.min(max, next)));
  return Math.abs(clamped - scrollLeft) < 1 ? null : clamped;
}

/** Escreve data-l / data-r no elemento (só quando muda). */
export function markEdges(el) {
  if (!el) return;
  const e = scrollEdges(el);
  const l = e.l ? '1' : '';
  const r = e.r ? '1' : '';
  if (el.dataset.l !== l) el.dataset.l = l;
  if (el.dataset.r !== r) el.dataset.r = r;
}

/**
 * Liga o degradê e a rolagem até o ativo num trilho.
 *   ref:      ref do elemento que rola (overflow-x: auto)
 *   active:   chave do item ativo (quando muda, rola até ele)
 *   selector: como achar o item ativo dentro do trilho
 *   enabled:  false desliga (ex.: componente que ainda não desenhou o trilho)
 */
export default function useScrollEdges(ref, { active = null, selector = '[aria-selected="true"], .active, [aria-pressed="true"]', enabled = true, count = 0 } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return undefined;
    const upd = () => markEdges(el);
    upd();
    el.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(upd) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', upd);
      window.removeEventListener('resize', upd);
      ro?.disconnect();
    };
  }, [ref, enabled, count]);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const item = el.querySelector(selector);
    if (!item) { markEdges(el); return; }
    const box = el.getBoundingClientRect();
    const ib = item.getBoundingClientRect();
    const next = revealScrollLeft(el, { start: ib.left - box.left + el.scrollLeft, width: ib.width });
    if (next != null) {
      let calm = false;
      try { calm = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { /* ok */ }
      try { el.scrollTo({ left: next, behavior: calm ? 'auto' : 'smooth' }); } catch { el.scrollLeft = next; }
    }
    markEdges(el);
  }, [ref, active, enabled, count, selector]);
}
