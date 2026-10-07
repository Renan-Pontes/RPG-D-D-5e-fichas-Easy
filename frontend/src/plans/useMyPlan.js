// Hook leve: plano da conta normalizado (ou null enquanto carrega/sem login/offline).
import { useEffect, useState } from 'react';
import { loadMyPlan } from './plans-api.js';

export default function useMyPlan(enabled = true) {
  const [my, setMy] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    loadMyPlan().then(r => { if (alive) setMy(r); }).catch(() => {});
    return () => { alive = false; };
  }, [enabled]);
  return my;
}
