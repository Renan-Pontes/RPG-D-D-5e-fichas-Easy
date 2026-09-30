/* Barra de abas rolável (ficha, campanha): no celular as últimas abas ficam
   fora da tela. Mostra setas com esmaecimento nas bordas enquanto houver mais
   abas daquele lado e traz a aba ativa para a vista quando ela muda. */
import { useEffect, useRef, useState, useCallback } from 'react';

export default function ScrollTabs({ className = '', activeKey, lang = 'pt', children, ...rest }) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [measure]);

  // Aba ativa sempre visível (atalhos de teclado, links "ir para a aba").
  useEffect(() => {
    const el = ref.current;
    const active = el?.querySelector('.tab.active');
    if (!el || !active) return;
    const a = active.offsetLeft, b = a + active.offsetWidth;
    if (a < el.scrollLeft + 32) el.scrollTo({ left: Math.max(0, a - 40), behavior: 'smooth' });
    else if (b > el.scrollLeft + el.clientWidth - 32) el.scrollTo({ left: b - el.clientWidth + 40, behavior: 'smooth' });
    measure();
  }, [activeKey, measure]);

  const scroll = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.6), behavior: 'smooth' });
  };

  const pt = lang === 'pt';
  return (
    <div ref={ref} className={`tabs ${edges.left ? 'more-left' : ''} ${edges.right ? 'more-right' : ''} ${className}`} {...rest}>
      {edges.left && (
        <button type="button" className="tabs-arrow left" tabIndex={-1} aria-hidden="true"
          title={pt ? 'Abas anteriores' : 'Previous tabs'} onClick={() => scroll(-1)}>‹</button>
      )}
      {children}
      {edges.right && (
        <button type="button" className="tabs-arrow right" tabIndex={-1} aria-hidden="true"
          title={pt ? 'Mais abas' : 'More tabs'} onClick={() => scroll(1)}>›</button>
      )}
    </div>
  );
}
