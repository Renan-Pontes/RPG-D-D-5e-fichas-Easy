// Nada mexe debaixo do dedo (princípio 8): o que chega pelo polling logo depois de um
// toque (pointerdown) espera completar 600 ms desse toque antes de entrar na tela.
//   const hold = useTouchHold();
//   hold(() => setApprovals(list), 'approvals');   // por chave, o último dado vence
import { useCallback, useEffect, useRef } from 'react';

export const SETTLE_MS = 600;

export default function useTouchHold(ms = SETTLE_MS) {
  const touchedAt = useRef(0);
  const timers = useRef({});
  useEffect(() => {
    const mark = () => { touchedAt.current = Date.now(); };
    document.addEventListener('pointerdown', mark, true);
    const pending = timers.current;
    return () => {
      document.removeEventListener('pointerdown', mark, true);
      for (const id of Object.values(pending)) clearTimeout(id);
    };
  }, []);
  return useCallback((fn, key = 'default') => {
    clearTimeout(timers.current[key]);
    delete timers.current[key];
    const wait = touchedAt.current + ms - Date.now();
    if (wait <= 0) { fn(); return; }
    timers.current[key] = setTimeout(() => { delete timers.current[key]; fn(); }, wait);
  }, [ms]);
}
