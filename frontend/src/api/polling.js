// Polling utility — substitui o socket.io.
// PythonAnywhere free não suporta WebSocket; polling a cada N ms é suficiente
// para a quantidade de jogadores típica.

import { useEffect, useRef } from 'react';

export function computeBackoffMs(failures, baseMs = 2500, maxMs = 30_000, rng = Math.random) {
  if (!failures || failures <= 0) return baseMs;
  const raw = Math.min(maxMs, baseMs * Math.pow(2, Math.min(failures, 4)));
  const jitter = 0.85 + rng() * 0.3;
  return Math.max(baseMs, Math.min(maxMs, Math.round(raw * jitter)));
}

export function usePolling(fn, intervalMs = 2500, deps = [], opts = {}) {
  const fnRef = useRef(fn);
  const statusRef = useRef(opts?.onStatus);
  fnRef.current = fn;
  statusRef.current = opts?.onStatus;
  const maxMs = opts?.maxMs ?? 30_000;

  useEffect(() => {
    let active = true;
    let timer = null;
    let failures = 0;

    const tick = async () => {
      if (!active) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, intervalMs);
        return;
      }
      let nextDelay = intervalMs;
      try {
        await fnRef.current();
        if (failures > 0) statusRef.current?.({ online: true, failures: 0, nextDelayMs: intervalMs });
        failures = 0;
      } catch {
        failures += 1;
        nextDelay = computeBackoffMs(failures, intervalMs, maxMs);
        statusRef.current?.({ online: false, failures, nextDelayMs: nextDelay });
      }
      if (active) timer = setTimeout(tick, nextDelay);
    };

    tick();

    const onVis = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        failures = 0;
        clearTimeout(timer);
        tick();
      }
    };
    const onOnline = () => {
      failures = 0;
      clearTimeout(timer);
      tick();
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    if (typeof window !== 'undefined') window.addEventListener('online', onOnline);

    return () => {
      active = false;
      clearTimeout(timer);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
      if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, maxMs, ...deps]);
}
