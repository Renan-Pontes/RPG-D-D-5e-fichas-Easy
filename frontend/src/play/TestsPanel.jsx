// Jogar › Testes — lista ÚNICA: testes pedidos à mesa (CheckRequest) e
// rolagens pedidas pelos jogadores (RollRequest) juntos, em
// Abertos · Respondidos · Histórico. O "Rolar (mestre)" saiu: o mestre usa o
// botão flutuante de dados.
// Celular: a lista vem primeiro; "🎯 Pedir teste à mesa" abre uma folha.
// Desktop (≥ 1024): 2 colunas, o pedir fixo à esquerda e a lista à direita.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { usePolling } from '../api/polling.js';
import GroupCheckPanel, { DMCheckCard } from '../checks/GroupCheckPanel.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import { PendingDMRow, RollHistoryRow } from './RollRows.jsx';
import { testsBadge, unifyTests } from './scene-model.js';
import { flash } from './flash.js';
import useMedia from './useMedia.js';
import '../checks/checks-styles.css';
import '../campaigns/combat-styles.css';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function TestsPanel({ campaign, lang = 'pt', onChange, onCount }) {
  const [data, setData] = useState({ checks: [], pendingRolls: [], recentRolls: [] });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('open');
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

  const list = groups[view] || [];
  const tabs = [
    ['open', L(lang, 'Abertos', 'Open'), groups.open.length],
    ['answered', L(lang, 'Respondidos', 'Answered'), groups.answered.length],
    ['history', L(lang, 'Histórico', 'History'), groups.history.length],
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
          {tabs.map(([k, label, n]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k}
              className={`mesa-seg-btn tl-tab ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>
              <span>{label}</span>{n > 0 && <span className="tl-count" aria-label={`(${n})`}>{n}</span>}
            </button>
          ))}
        </div>
        {error && <div className="check-card-error" role="alert">{error}</div>}
        {!loaded && <p className="muted small">{L(lang, 'Carregando…', 'Loading…')}</p>}
        {loaded && list.length === 0 && (
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
