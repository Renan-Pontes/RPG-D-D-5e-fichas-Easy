// Jogar › Testes — lista ÚNICA: testes pedidos à mesa (CheckRequest) e
// rolagens pedidas pelos jogadores (RollRequest) juntos, em
// Abertos · Respondidos · Histórico. O "Rolar (mestre)" saiu: o mestre usa o
// botão flutuante de dados.
// Celular: a lista vem primeiro; "🎯 Pedir teste à mesa" abre uma folha.
// Desktop (≥ 1024): 2 colunas, o pedir fixo à esquerda e a lista à direita.
// V10: o filtro "🎲 Rolagens na Tela" lista as rolagens de MESA (o 🎲 do mestre 📺/🔒,
// ataques e salvaguardas de monstro, 20/1 dos testes e o rolador da Mesa dos
// jogadores; GET …/recent?table=1, ao abrir o filtro e quando o pulso muda). O Histórico
// continua só com os pedidos, como antes.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { usePolling } from '../api/polling.js';
import GroupCheckPanel, { DMCheckCard } from '../checks/GroupCheckPanel.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import { PendingDMRow, RollHistoryRow, TableRollRow } from './RollRows.jsx';
import { testsBadge, unifyTests } from './scene-model.js';
import { flash } from './flash.js';
import { useOnRev, useTable } from './table-store.js';
import useMedia from './useMedia.js';
import '../checks/checks-styles.css';
import '../campaigns/combat-styles.css';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function TestsPanel({ campaign, lang = 'pt', onChange, onCount }) {
  const [data, setData] = useState({ checks: [], pendingRolls: [], recentRolls: [] });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('open');
  const [tableRolls, setTableRolls] = useState(null);   // null = ainda não buscou
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(false);
  const wide = useMedia('(min-width: 1024px)');

  const load = useCallback(async () => {
    const [c, p, r] = await Promise.allSettled([
      api.listChecks(campaign.id), api.listPendingRolls(campaign.id), api.listRecentRolls(campaign.id),
    ]);
    setData(prev => ({
      checks: c.status === 'fulfilled' ? (c.value.checks || []) : prev.checks,
      pendingRolls: p.status === 'fulfilled' ? (p.value.rolls || []) : prev.pendingRolls,
      recentRolls: r.status === 'fulfilled' ? (r.value.rolls || []) : prev.recentRolls,
    }));
    setLoaded(true);
  }, [campaign.id]);
  usePolling(load, 3000, [campaign.id]);
  // 🎲 Rolagens na Tela: busca ao abrir o filtro e quando o pulso diz que as rolagens
  // mudaram (nenhum pedido a mais parado; sem o pulso, a cada 6 s com o filtro aberto).
  const table = useTable();
  const viewRef = useRef(view);
  viewRef.current = view;
  const loadTable = useCallback(async () => {
    if (viewRef.current !== 'table') return;
    try { const m = await api.listTableRolls(campaign.id); setTableRolls(m.rolls || []); } catch { /* o próximo tenta */ }
  }, [campaign.id]);
  useEffect(() => { if (view === 'table') loadTable(); }, [view, loadTable]);
  useOnRev(table?.pulse?.checksRev, loadTable, { table, fallbackMs: 6000, safetyMs: Infinity, initial: false });

  const groups = useMemo(() => unifyTests(data), [data]);
  const waiting = testsBadge(groups);
  // Avisa a casca (selo da subaba) sem re-render em loop.
  useEffect(() => { onCount?.(waiting); }, [waiting, onCount]);

  const act = async (fn) => {
    setError('');
    try { await fn(); await load(); onChange?.(); } catch (e) { setError(errorMessage(e, lang)); }
  };
  const resolve = (id, visibility, extra = {}) => act(() => api.resolveRoll(id, { visibility, ...extra }));
  const cancel = (id) => act(() => api.cancelRoll(id));
  const onSent = () => { load(); setView('open'); };

  const list = view === 'table' ? [] : (groups[view] || []);
  const tabs = [
    ['open', L(lang, 'Abertos', 'Open'), groups.open.length],
    ['answered', L(lang, 'Respondidos', 'Answered'), groups.answered.length],
    ['history', L(lang, 'Histórico', 'History'), groups.history.length],
    ['table', L(lang, '🎲 Na Tela', '🎲 Screen'), 0, L(lang, 'Rolagens na Tela', 'Rolls on screen')],
  ];

  return (
    <div className={`tests-panel ${wide ? 'is-wide' : 'is-narrow'}`}>
      {wide ? (
        <div className="tests-ask-col">
          <GroupCheckPanel campaign={campaign} lang={lang} showList={false} onSent={onSent} />
        </div>
      ) : (
        <button type="button" className="mesa-btn mesa-btn-lg is-primary tests-ask-btn" aria-haspopup="dialog" onClick={() => setAsking(true)}>
          🎯 {L(lang, 'Pedir teste à mesa', 'Ask the table for a check')}
        </button>
      )}

      <section className="mesa-panel tl-box" aria-labelledby="tl-h">
        <MesaTitle id="tl-h">{L(lang, 'Testes e rolagens', 'Checks and rolls')}</MesaTitle>
        <div className="mesa-seg tl-tabs" role="tablist" aria-label={L(lang, 'Filtrar', 'Filter')}>
          {tabs.map(([k, label, n, full]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} title={full}
              aria-label={full ? `${full}` : undefined}
              className={`mesa-seg-btn tl-tab ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>
              <span>{label}</span>{n > 0 && <span className="tl-count" aria-label={`(${n})`}>{n}</span>}
            </button>
          ))}
        </div>
        {error && <div className="check-card-error" role="alert">{error}</div>}
        {!loaded && <p className="muted small">{L(lang, 'Carregando…', 'Loading…')}</p>}
        {view === 'table' && (
          <>
            <p className="mesa-hint tl-table-hint">{L(lang,
              'As rolagens da mesa: o seu 🎲 (📺 na Tela ou 🔒 só você), os monstros, os 20 e 1 dos testes, o rolador da Mesa e as fichas dos jogadores (📜). As regras ficam em Jogar › Tela.',
              'Table rolls: your 🎲 (📺 on screen or 🔒 only you), the monsters, natural 20s and 1s of checks, the players’ table roller and their sheets (📜). The rules live in Play › Screen.')}</p>
            {tableRolls === null && <p className="muted small">{L(lang, 'Carregando…', 'Loading…')}</p>}
            {tableRolls?.length === 0 && (
              <p className="muted tl-empty">{L(lang, 'Nenhuma rolagem de mesa ainda. Toque no 🎲 e escolha “📺 Na tela”.', 'No table rolls yet. Tap 🎲 and pick “📺 On screen”.')}</p>
            )}
            <div className="gc-list rolls-panel">
              {(tableRolls || []).map(r => <TableRollRow key={r.id} r={r} lang={lang} />)}
            </div>
          </>
        )}
        {view !== 'table' && loaded && list.length === 0 && (
          <p className="muted tl-empty">
            {view === 'open' && (wide
              ? L(lang, 'Nada esperando. Toque numa perícia ao lado para pedir um teste à mesa.', 'Nothing waiting. Tap a skill on the left to ask the table for a check.')
              : L(lang, 'Nada esperando. Toque em “Pedir teste à mesa” para pedir um teste.', 'Nothing waiting. Tap “Ask the table for a check” to ask for one.'))}
            {view === 'answered' && L(lang, 'Quando todos responderem um teste, ele aparece aqui para você encerrar ou mostrar na Tela.', 'When everyone answers a check it shows up here for you to close or show on screen.')}
            {view === 'history' && L(lang, 'Ainda não há testes encerrados nem rolagens resolvidas.', 'No closed checks or resolved rolls yet.')}
          </p>
        )}
        <div className="gc-list rolls-panel">
          {list.map(row => (
            row.source === 'check'
              ? <DMCheckCard key={row.key} check={row.item} campaign={campaign} lang={lang} act={act} />
              : (row.pending
                ? <PendingDMRow key={row.key} r={row.item} lang={lang} onResolve={resolve} onCancel={cancel} />
                : <RollHistoryRow key={row.key} r={row.item} lang={lang} />)
          ))}
        </div>
      </section>

      {asking && !wide && (
        <GroupCheckPanel campaign={campaign} lang={lang} showList={false} asSheet onClose={() => setAsking(false)} onSent={onSent} />
      )}
    </div>
  );
}
