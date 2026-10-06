import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import DiaryTab from '../campaigns/DiaryTab.jsx';
import InviteCard from './InviteCard.jsx';
import PlayersPanel from './PlayersPanel.jsx';
import RequestsPanel from './RequestsPanel.jsx';
import { GroupToast, useGroupConfirm } from './GroupConfirm.jsx';
import { groupApi } from './group-api.js';
import { pendingCount, t } from './group-model.js';
import './group-styles.css';

const SUBS = ['players', 'chronicle'];
const subKey = (id) => `forja:group-sub:${id}`;
function readSub(id) {
  try { const v = localStorage.getItem(subKey(id)); return SUBS.includes(v) ? v : null; } catch { return null; }
}
function writeSub(id, v) {
  try { localStorage.setItem(subKey(id), v); } catch { /* sem storage: só não lembra */ }
}

/**
 * Área "Grupo" (mestre e jogador): Jogadores (cards, convite, pedidos de
 * nível/XP) e Crônica (diário + "Anteriormente em…").
 *
 * Props:
 *  - campaign, lang, isDM, characters (fichas do usuário, p/ "Trocar personagem")
 *  - onChange(): recarrega a campanha na casca
 *  - sub / onSubChange(sub): subvista controlada pela casca (useArea); sem
 *    elas, a área lembra a última subvista por campanha (localStorage)
 *  - hasJoinRoute: o app abre /join/<código>? (decide o que "Copiar link" copia)
 *  - onPendingCount(n): opcional, avisa a casca do nº de pedidos pendentes
 */
export default function GroupArea({ campaign, lang = 'pt', isDM, characters = [], onChange, sub, onSubChange, hasJoinRoute = false, onPendingCount }) {
  const [ownSub, setOwnSub] = useState(() => readSub(campaign.id) || 'players');
  const current = !isDM ? 'players' : (SUBS.includes(sub) ? sub : ownSub);
  const setSub = (v) => { if (onSubChange) onSubChange(v); else setOwnSub(v); writeSub(campaign.id, v); };

  const [approvals, setApprovals] = useState(null);
  const [xpEvents, setXpEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const [ask, confirmUi] = useGroupConfirm(lang);

  const loadApprovals = useCallback(async () => {
    const r = await api.listApprovals(campaign.id);
    setApprovals(r.approvals || []);
  }, [campaign.id]);
  const loadXp = useCallback(async () => {
    if (!isDM) return;
    try { const r = await groupApi.xpEvents(campaign.id); setXpEvents(r.entries || []); } catch { /* histórico de XP é opcional */ }
  }, [campaign.id, isDM]);

  usePolling(loadApprovals, 6000, [campaign.id]);
  useEffect(() => { loadXp(); }, [loadXp]);

  const count = approvals ? pendingCount(approvals) : (campaign.pendingApprovals ?? 0);
  useEffect(() => { onPendingCount?.(count); }, [count, onPendingCount]);

  const notify = useCallback((text, kind = 'ok') => setToast({ text, kind, id: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);
  const refresh = useCallback(() => {
    loadApprovals().catch(() => {});
    loadXp();
    onChange?.();
  }, [loadApprovals, loadXp, onChange]);

  return (
    <div className="grp-area">
      {/* Jogador: a Crônica é uma área própria na casca; aqui só Jogadores. */}
      {isDM && <nav className="grp-subnav" role="tablist" aria-label={t(lang, 'Grupo', 'Group')}>
        <button type="button" role="tab" aria-selected={current === 'players'} className={current === 'players' ? 'on' : ''} onClick={() => setSub('players')}>
          🛡 {t(lang, 'Jogadores', 'Players')}
          {isDM && count > 0 && <span className="grp-pill-badge" aria-label={t(lang, `${count} pedido(s) pendente(s)`, `${count} pending request(s)`)}>{count}</span>}
        </button>
        <button type="button" role="tab" aria-selected={current === 'chronicle'} className={current === 'chronicle' ? 'on' : ''} onClick={() => setSub('chronicle')}>
          📜 {t(lang, 'Crônica', 'Chronicle')}
        </button>
      </nav>}

      {current === 'players' && (
        <div className="grp-players-view" role="tabpanel">
          {isDM && <InviteCard campaign={campaign} lang={lang} hasJoinRoute={hasJoinRoute} compact={(campaign.members || []).length > 2} />}
          <PlayersPanel campaign={campaign} lang={lang} isDM={isDM} characters={characters} approvals={approvals || []}
            ask={ask} notify={notify} onChange={refresh} />
          {approvals == null
            ? <p className="muted small">{t(lang, 'Carregando pedidos…', 'Loading requests…')}</p>
            : <RequestsPanel campaign={campaign} approvals={approvals} xpEvents={xpEvents} lang={lang} isDM={isDM}
                ask={ask} notify={notify} onChange={refresh} />}
        </div>
      )}

      {current === 'chronicle' && (
        <div role="tabpanel">
          <DiaryTab campaign={campaign} lang={lang} isDM={isDM} onCampaignChange={onChange} showStartSession={false} />
        </div>
      )}

      {confirmUi}
      <GroupToast toast={toast} onDone={clearToast} />
    </div>
  );
}
