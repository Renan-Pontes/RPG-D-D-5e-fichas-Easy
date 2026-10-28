// Pedidos do mestre na aba "Rolagens" da campanha (visão do jogador).
// Com o pulso do jogador (V13): a lista só é buscada quando o `checksRev` dele muda;
// sem ele (servidor antigo, tela fora da casca), a cada 3 s, como antes.
import { useCallback, useState } from 'react';
import { api } from '../api/client.js';
import { useOnRev, usePlayerPulse } from '../play/table-store.js';
import CheckRequestCard from './CheckRequestCard.jsx';
import './checks-styles.css';

export default function PlayerCampaignChecks({ campaign, lang = 'pt', userId }) {
  const [checks, setChecks] = useState([]);
  const pp = usePlayerPulse();
  const load = useCallback(async () => {
    try { setChecks((await api.listChecks(campaign.id)).checks || []); } catch { /* polling */ }
  }, [campaign.id]);
  useOnRev(pp?.pulse?.checksRev, load, { table: pp, fallbackMs: 3000, safetyMs: Infinity });

  const me = (campaign.members || []).find(m => (userId ? m.user?.id === userId : m.character?.data));
  const char = me?.character?.data ? { ...me.character.data, id: me.character.id } : null;
  if (!checks.length) return null;
  return (
    <div className="player-checks">
      {checks.map(c => (
        <CheckRequestCard key={c.id} check={c} char={char} lang={lang}
          onAnswered={(u) => setChecks(prev => prev.map(x => (x.id === u.id ? { ...x, ...u } : x)))} />
      ))}
    </div>
  );
}
