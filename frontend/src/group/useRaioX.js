// Os ganchos do Raio-X fora dele (cartão de Grupo › Jogadores, Próxima sessão): carrega
// as contas sob demanda (import dinâmico — o jogador e quem não abre essas telas nunca
// baixam party-metrics/spotlights) e os ajustes do mestre 1 vez por campanha enquanto o
// app está aberto (loadInsightsOnce: estilo, momentos, Tabela × Ficha…).
// O que chega logo depois de um toque espera 600 ms (nada mexe debaixo do dedo).
import { useEffect, useRef, useState } from 'react';
import { cachedInsights, loadInsightsOnce, withDefaults } from './insights-api.js';

const SETTLE_MS = 600;

/** {PM, S, ins} quando tudo chegou; null enquanto carrega ou se `enabled` é falso. */
export default function useRaioX(campaignId, enabled) {
  const [got, setGot] = useState(null);
  const touchedAt = useRef(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const mark = () => { touchedAt.current = Date.now(); };
    document.addEventListener('pointerdown', mark, true);
    let alive = true;
    let timer = null;
    const cached = cachedInsights(campaignId);
    Promise.all([
      import('./party-metrics.js'),
      import('./spotlights.js'),
      cached ? Promise.resolve(cached) : loadInsightsOnce(campaignId).catch(() => withDefaults({})),
    ]).then(([PM, S, ins]) => {
      if (!alive) return;
      const apply = () => { if (alive) setGot({ PM, S, ins }); };
      const wait = touchedAt.current + SETTLE_MS - Date.now();
      if (wait > 0) timer = setTimeout(apply, wait); else apply();
    }).catch(() => { /* sem o gancho: a tela funciona igual */ });
    return () => { alive = false; clearTimeout(timer); document.removeEventListener('pointerdown', mark, true); };
  }, [campaignId, enabled]);
  return enabled ? got : null;
}
