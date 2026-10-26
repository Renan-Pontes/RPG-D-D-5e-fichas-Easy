// Media query como estado do React (celular × desktop na área Jogar).
//   const wide = useMedia('(min-width: 1024px)');
import { useEffect, useState } from 'react';

export function mediaNow(q, fallback = false) {
  try { return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : fallback; } catch { return fallback; }
}

export default function useMedia(q, fallback = false) {
  const [on, setOn] = useState(() => mediaNow(q, fallback));
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(q); } catch { return undefined; }
    const upd = () => setOn(mq.matches);
    upd();
    mq.addEventListener?.('change', upd);
    return () => mq.removeEventListener?.('change', upd);
  }, [q]);
  return on;
}
