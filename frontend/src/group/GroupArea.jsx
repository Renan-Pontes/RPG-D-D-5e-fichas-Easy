import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import DiaryTab from '../campaigns/DiaryTab.jsx';
import { SubChips } from '../shell/AreaNav.jsx';
import { useArea } from '../shell/useArea.js';
import InviteCard from './InviteCard.jsx';
import PlayersPanel from './PlayersPanel.jsx';
import RequestsPanel from './RequestsPanel.jsx';
import { GroupToast, useGroupConfirm } from './GroupConfirm.jsx';
import { groupApi } from './group-api.js';
import { pendingCount, t } from './group-model.js';
import './group-styles.css';

// Raio-X do grupo: as contas e os gráficos só carregam quando o mestre abre a subvista.
const PartyInsights = lazy(() => import('./PartyInsights.jsx'));

const SUBS = ['players', 'insights', 'chronicle'];
const subKey = (id) => `forja:group-sub:${id}`;
function readSub(id) {
  try { const v = localStorage.getItem(subKey(id)); return SUBS.includes(v) ? v : null; } catch { return null; }
}
function writeSub(id, v) {
  try { localStorage.setItem(subKey(id), v); } catch { /* sem storage: só não lembra */ }
}

/**
 * Área "Grupo" (mestre e jogador): Jogadores (cards, convite, pedidos de
 * nível/XP), Raio-X do grupo (só o mestre: métricas, lacunas e ideias de cena) e
 * Crônica (diário + "Anteriormente em…").
 *
 * Props:
 *  - campaign, lang, isDM, characters (fichas do usuário, p/ "Trocar personagem")
 *  - onChange(): recarrega a campanha na casca
 *  - sub / onSubChange(sub): subvista controlada pela casca (useArea); sem
 *    elas, a área lembra a última subvista por campanha (localStorage)
 *  - hasJoinRoute: o app abre /join/<código>? (decide o que "Copiar link" copia)
 *  - onPendingCount(n): opcional, avisa a casca do nº de pedidos pendentes
 *  - onLeaveCampaign(): jogador saiu da mesa → a casca volta para Campanhas
 *  - params.recap: "Encerrar e escrever o recap" — a Crônica abre já no rascunho do recap
 */
export default function GroupArea({ campaign, lang = 'pt', isDM, characters = [], onChange, sub, onSubChange, hasJoinRoute = false, onPendingCount, onLeaveCampaign, params }) {
  const { clearParams } = useArea();
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

  // No Raio-X os pedidos não aparecem: a contagem vem do GET da campanha (que a casca
  // já busca) e o polling dos pedidos para — a subvista fica nos 24 pedidos/min da casca.
  const onInsights = current === 'insights';
  usePolling(() => (onInsights ? null : loadApprovals()), 6000, [campaign.id, onInsights]);
  useEffect(() => { loadXp(); }, [loadXp]);

  const count = approvals && !onInsights ? pendingCount(approvals) : (campaign.pendingApprovals ?? 0);
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
      {isDM && (
        <SubChips subs={SUBS} active={current} onSelect={setSub} lang={lang}
          ariaLabel={t(lang, 'Grupo', 'Group')} badges={{ players: count }}
          badgeLabels={{ players: t(lang, `${count} pedido(s) pendente(s)`, `${count} pending request(s)`) }} />
      )}

      {current === 'players' && (
        <div className="grp-players-view" role="tabpanel">
          {isDM && <InviteCard campaign={campaign} lang={lang} hasJoinRoute={hasJoinRoute} compact={(campaign.members || []).length > 2} />}
          <PlayersPanel campaign={campaign} lang={lang} isDM={isDM} characters={characters} approvals={approvals || []}
            ask={ask} notify={notify} onChange={refresh} onLeft={onLeaveCampaign} />
          {approvals == null
            ? <p className="muted small">{t(lang, 'Carregando pedidos…', 'Loading requests…')}</p>
            : <RequestsPanel campaign={campaign} approvals={approvals} xpEvents={xpEvents} lang={lang} isDM={isDM}
                ask={ask} notify={notify} onChange={refresh} />}
        </div>
      )}

      {current === 'insights' && (
        <Suspense fallback={<p className="muted" role="status">{t(lang, 'Carregando o Raio-X…', 'Loading the X-ray…')}</p>}>
          <PartyInsights campaign={campaign} lang={lang} params={params} onParamsDone={clearParams} />
        </Suspense>
      )}

      {current === 'chronicle' && (
        <div role="tabpanel">
          <DiaryTab campaign={campaign} lang={lang} isDM={isDM} onCampaignChange={onChange} showStartSession={false}
            autoRecap={!!params?.recap} onAutoRecap={clearParams} />
        </div>
      )}

      {confirmUi}
      <GroupToast toast={toast} onDone={clearToast} />
    </div>
  );
}
