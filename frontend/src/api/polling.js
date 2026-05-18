// Polling utility — substitui o socket.io.
// PythonAnywhere free não suporta WebSocket; polling a cada N ms é suficiente
// para a quantidade de jogadores típica.

import { useEffect, useRef } from 'react';

/**
 * Hook que executa `fn` a cada `intervalMs`. Pausa quando a página está oculta
 * para economizar bateria/banda.
 *
 * Retorna uma função `trigger` para forçar refresh imediato.
 */
export function usePolling(fn, intervalMs = 2500, deps = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let active = true;
    let timer = null;

    const tick = async () => {
      if (!active) return;
      if (document.hidden) {
        timer = setTimeout(tick, intervalMs);
        return;
      }
      try { await fnRef.current(); } catch { /* swallow */ }
      if (active) timer = setTimeout(tick, intervalMs);
    };

    tick();

    const onVis = () => { if (!document.hidden) { clearTimeout(timer); tick(); } };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
