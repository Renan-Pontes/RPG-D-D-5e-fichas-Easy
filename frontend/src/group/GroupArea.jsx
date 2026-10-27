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
import useTouchHold from './useTouchHold.js';
import { groupApi } from './group-api.js';
import { pendingCount, t } from './group-model.js';
import './group-styles.css';

// Raio-X do grupo: as contas e os gráficos só carregam quando o mestre abre a subvista.
const PartyInsights = lazy(() => import('./PartyInsights.jsx'));

const SUBS = ['players', 'requests', 'insights', 'chronicle'];
const subKey = (id) => `forja:group-sub:${id}`;
function readSub(id) {
  try { const v = localStorage.getItem(subKey(id)); return SUBS.includes(v) ? v : null; } catch { return null; }
}
function writeSub(id, v) {
  try { localStorage.setItem(subKey(id), v); } catch { /* sem storage: só não lembra */ }
}

/**
 * Área "Grupo".
 *  - Mestre: segmentado Jogadores · Pedidos (n) · Raio-X · Crônica.
 *    Jogadores: cartões (PlayersPanel) e o convite (grande no topo com a mesa
 *    vazia; senão no fim). Pedidos: RequestsPanel (pedidos, nível de cada um,
 *    evolução, aguardando, histórico). Raio-X: métricas, lacunas e ideias de
 *    cena (PartyInsights). Crônica: diário + "Anteriormente em…".
 *  - Jogador: uma vista só, com o próprio cartão primeiro e "Meus pedidos"
 *    logo abaixo dele (a Crônica dele é uma área própria na casca).
 *
 * Props:
 *  - campaign, lang, isDM, characters (fichas do usuário, p/ "Trocar personagem")
 *  - onChange(): recarrega a campanha na casca
 *  - sub / onSubChange(sub): subvista controlada pela casca (useArea); sem
 *    elas, a área lembra a última subvista por campanha (localStorage)
 *  - params: efêmeros da casca ({ membershipId } da busca rápida traz o cartão
 *    à vista; { recap: true } de "Encerrar e escrever o recap" abre o recap)
 *  - hasJoinRoute: o app abre /join/<código>? (decide o que "Copiar link" copia)
 *  - onPendingCount(n): opcional, avisa a casca do nº de pedidos pendentes
 *    (null ao desmontar: a casca volta a contar pelo GET da campanha)
 *  - onLeaveCampaign(): jogador saiu da mesa → a casca volta para Campanhas
 */
export default function GroupArea({ campaign, lang = 'pt', isDM, characters = [], onChange, sub, onSubChange, params, hasJoinRoute = false, onPendingCount, onLeaveCampaign }) {
  const { clearParams } = useArea();
  const [ownSub, setOwnSub] = useState(() => readSub(campaign.id) || 'players');
  const current = !isDM ? 'players' : (SUBS.includes(sub) ? sub : ownSub);
  const setSub = (v) => { if (onSubChange) onSubChange(v); else setOwnSub(v); writeSub(campaign.id, v); };

  const [approvals, setApprovals] = useState(null);
  const [xpEvents, setXpEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const [ask, confirmUi] = useGroupConfirm(lang);

  // Nada mexe debaixo do dedo: o que chega pelo polling (pedidos a 6 s, campanha a 2,5 s na
  // casca) logo depois de um toque espera 600 ms. A recarga depois de uma ação do mestre
  // entra na hora (é a resposta ao toque dele).
  const hold = useTouchHold();
  const loadApprovals = useCallback(async (fromPoll = false) => {
    const r = await api.listApprovals(campaign.id);
    const apply = () => setApprovals(r.approvals || []);
    if (fromPoll) hold(apply, 'approvals'); else apply();
  }, [campaign.id, hold]);
  const [held, setHeld] = useState(campaign);
  useEffect(() => { hold(() => setHeld(campaign), 'campaign'); }, [campaign, hold]);
  const shown = held.id === campaign.id ? held : campaign;
  const loadXp = useCallback(async () => {
    if (!isDM) return;
    try { const r = await groupApi.xpEvents(campaign.id); setXpEvents(r.entries || []); } catch { /* histórico de XP é opcional */ }
  }, [campaign.id, isDM]);

  // No Raio-X os pedidos não aparecem: a contagem vem do GET da campanha (que a casca
  // já busca) e o polling dos pedidos para — a subvista fica nos 24 pedidos/min da casca.
  const onInsights = current === 'insights';
  usePolling(() => (onInsights ? null : loadApprovals(true)), 6000, [campaign.id, onInsights]);
  useEffect(() => { loadXp(); }, [loadXp]);

  const count = approvals && !onInsights ? pendingCount(approvals) : (campaign.pendingApprovals ?? 0);
  useEffect(() => { onPendingCount?.(count); }, [count, onPendingCount]);
  // fora do Grupo o selo volta a seguir a campanha (a conta daqui envelhece)
  useEffect(() => () => onPendingCount?.(null), [onPendingCount]);

  const notify = useCallback((text, kind = 'ok') => setToast({ text, kind, id: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);
  // devolve a promessa dos pedidos: o painel só religa os botões com a lista nova à vista
  const refresh = useCallback(() => {
    loadXp();
    onChange?.();
    return loadApprovals().catch(() => {});
  }, [loadApprovals, loadXp, onChange]);

  const tableEmpty = !(shown.members || []).some(m => m.role !== 'dm');
  const invite = (compact) => (
    <InviteCard campaign={shown} lang={lang} hasJoinRoute={hasJoinRoute} compact={compact} />
  );
  const loadingRequests = <p className="grp-none">{t(lang, 'Carregando pedidos…', 'Loading requests…')}</p>;
  const requests = (
    approvals == null ? loadingRequests
      : <RequestsPanel campaign={shown} approvals={approvals} xpEvents={xpEvents} lang={lang} isDM={isDM}
          ask={ask} notify={notify} onChange={refresh} />
  );

  return (
    <div className={`grp-area ${isDM ? 'is-dm' : 'is-player'}`}>
      {/* Jogador: a Crônica é uma área própria na casca; aqui só Jogadores. */}
      {isDM && (
        <SubChips subs={SUBS} active={current} onSelect={setSub} lang={lang}
          ariaLabel={t(lang, 'Grupo', 'Group')} badges={{ requests: count }}
          badgeLabels={{ requests: t(lang, `${count} pedido(s) pendente(s)`, `${count} pending request(s)`) }} />
      )}

      {current === 'players' && (
        <div className="grp-players-view" role="tabpanel">
          {/* convite: grande no topo com a mesa vazia; com gente, no fim (compacto com mais de 2) */}
          {isDM && tableEmpty && invite(false)}
          <PlayersPanel campaign={shown} lang={lang} isDM={isDM} characters={characters} approvals={approvals || []}
            ask={ask} notify={notify} onChange={refresh} onLeft={onLeaveCampaign}
            focusMember={params?.membershipId ?? null}
            afterMine={!isDM ? requests : null} />
          {isDM && !tableEmpty && invite((shown.members || []).length > 2)}
        </div>
      )}

      {current === 'requests' && isDM && (
        <div className="grp-requests-view" role="tabpanel">{requests}</div>
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
