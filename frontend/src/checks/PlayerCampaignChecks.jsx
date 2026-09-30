// Pedidos do mestre na aba "Rolagens" da campanha (visão do jogador).
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import CheckRequestCard from './CheckRequestCard.jsx';
import './checks-styles.css';

export default function PlayerCampaignChecks({ campaign, lang = 'pt', userId }) {
  const [checks, setChecks] = useState([]);
  const load = useCallback(async () => {
    try { setChecks((await api.listChecks(campaign.id)).checks || []); } catch { /* polling */ }
  }, [campaign.id]);
  useEffect(() => { load(); }, [load]);
  usePolling(load, 3000, [campaign.id]);

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
