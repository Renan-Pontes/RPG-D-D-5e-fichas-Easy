import { useEffect } from 'react';

const HAPTIC_PATTERNS = {
  nat20: [18, 40, 28, 40, 45],
  nat1: [70, 35, 70],
  seal: [16, 28, 32],
  tap: 12,
};

export function triggerHaptic(kind = 'tap') {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    const pat = HAPTIC_PATTERNS[kind];
    if (!pat) return false;
    return navigator.vibrate(pat);
  } catch {
    return false;
  }
}

export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.wakeLock?.request) return undefined;
    let sentinel = null;
    let active = true;

    const acquire = async () => {
      if (!active || (typeof document !== 'undefined' && document.hidden)) return;
      try {
        if (!sentinel || sentinel.released) {
          sentinel = await navigator.wakeLock.request('screen');
        }
      } catch { /* Wake Lock denied or unsupported */ }
    };

    const onVis = () => {
      if (typeof document !== 'undefined' && !document.hidden) acquire();
    };

    acquire();
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);

    return () => {
      active = false;
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
      try { sentinel?.release?.(); } catch { /* ignore */ }
    };
  }, [enabled]);
}
