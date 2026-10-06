// Conteúdo provisório das áreas enquanto os pacotes novos (WorldArea, PlayArea,
// PrepareArea, GroupArea, PlayerTable, PlayerWorld) não existem ou falham ao
// carregar. Reaproveita as telas antigas para nada se perder no caminho.
import { Component, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import { createEntry, listWorld } from '../world/world-api.js';
import { KINDS, kindIcon, kindLabel } from '../world/world-model.js';
import RollRequestPanel from '../campaigns/RollRequestPanel.jsx';
import DiaryTab from '../campaigns/DiaryTab.jsx';
import CampaignItemsTab from '../items/CampaignItemsTab.jsx';
import { SubChips } from './AreaNav.jsx';
import { ApprovalsLoader, CampaignDiceRoller, MembersTab, ScreenTab } from './legacy/LegacyTabs.jsx';
import { t } from './shell-logic.js';

const PrepTab = lazy(() => import('../prep/PrepTab.jsx'));
const CombatTab = lazy(() => import('../campaigns/CombatTab.jsx'));
const TableNow = lazy(() => import('../campaigns/TableNow.jsx'));

export const Loading = ({ lang }) => <p className="muted shell-loading">{t(lang, 'Carregando…', 'Loading…')}</p>;

/** Se uma área nova quebrar, mostra o erro e deixa usar a tela antiga. */
export class AreaBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  componentDidCatch(error) { console.warn('[shell] área falhou', error); }
  render() {
    if (!this.state.error) return this.props.children;
    const { lang, fallback } = this.props;
    return (
      <div className="col gap-3">
        <div className="shell-area-error" role="alert">
          {t(lang, 'Esta área teve um problema para abrir. Mostrando a versão anterior.', 'This area failed to open. Showing the previous version.')}
        </div>
        {fallback || null}
      </div>
    );
  }
}

// ---------------------------------------------------------------- Mundo
export function WorldFallback({ campaign, lang, isDM, params }) {
  const [entries, setEntries] = useState(null);
  const [kind, setKind] = useState('npc');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => listWorld(campaign.id).then(r => setEntries(r.entries || [])).catch(() => setEntries([])), [campaign.id]);
  useEffect(() => { load(); }, [load]);
  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try { await createEntry(campaign.id, { kind, name: name.trim() }); setName(''); await load(); } finally { setBusy(false); }
  };
  const focus = params?.entryId;
  return (
    <div className="col gap-3">
      {isDM && (
        <form className="shell-quick-create" onSubmit={create}>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t(lang, 'Tipo', 'Kind')}>
            {KINDS.map(k => <option key={k} value={k}>{kindIcon(k)} {kindLabel(k, lang)}</option>)}
          </select>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120}
            placeholder={t(lang, 'Nome (só o nome já basta)', 'Name (just the name is enough)')} aria-label={t(lang, 'Nome', 'Name')} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !name.trim()}>+ {t(lang, 'Criar', 'Create')}</button>
        </form>
      )}
      {entries && entries.length === 0 && (
        <div className="shell-empty">
          <img src="/art/backgrounds/wayfarer.webp" alt="" />
          <p>{isDM
            ? t(lang, 'Seu mundo ainda está em silêncio. Crie um lugar — só o nome já basta.', 'Your world is still silent. Create a place — just the name is enough.')
            : t(lang, 'O mestre ainda não revelou nada do mundo.', 'The DM has not revealed anything about the world yet.')}</p>
        </div>
      )}
      <div className="shell-fallback-grid">
        {(entries || []).map(e => (
          <article key={e.id} className={`shell-fallback-card ${focus === e.id ? 'is-focus' : ''}`} ref={focus === e.id ? (el) => el?.scrollIntoView?.({ block: 'center' }) : undefined}>
            <span className="shell-fallback-kind">{kindIcon(e.kind)} {kindLabel(e.kind, lang)}</span>
            <strong>{e.name}</strong>
            {e.summary && <span className="muted text-sm">{e.summary}</span>}
          </article>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Preparar
export function PrepareFallback({ campaign, lang, sub, onSubChange, onOpenTab }) {
  const subs = ['adventures', 'items'];
  const cur = subs.includes(sub) ? sub : 'adventures';
  return (
    <div className="col gap-3">
      <SubChips subs={subs} active={cur} onSelect={onSubChange} lang={lang} />
      <Suspense fallback={<Loading lang={lang} />}>
        {cur === 'adventures' && <PrepTab campaign={campaign} lang={lang} onOpenTab={onOpenTab} />}
        {cur === 'items' && <CampaignItemsTab campaign={campaign} lang={lang} />}
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------- Jogar
export function PlayFallback({ campaign, lang, sub, onSubChange, onChange, onNavigate }) {
  const subs = ['scene', 'combat', 'checks', 'screen'];
  const cur = subs.includes(sub) ? sub : 'scene';
  const [approvals, setApprovals] = useState([]);
  const loadApprovals = useCallback(async () => {
    if (cur !== 'scene') return;
    try { const r = await api.listApprovals(campaign.id); setApprovals(r.approvals || []); } catch { /* ok */ }
  }, [campaign.id, cur]);
  usePolling(loadApprovals, 10000, [campaign.id, cur]);
  return (
    <div className="col gap-3">
      <SubChips subs={subs} active={cur} onSelect={onSubChange} lang={lang} />
      <Suspense fallback={<Loading lang={lang} />}>
        {cur === 'scene' && <TableNow campaign={campaign} approvals={approvals} lang={lang} onChange={onChange} onNavigate={onNavigate} />}
        {cur === 'combat' && <CombatTab campaign={campaign} lang={lang} onChange={onChange} onNavigate={onNavigate} />}
        {cur === 'checks' && <RollRequestPanel campaign={campaign} lang={lang} isDM onChange={onChange} />}
        {cur === 'screen' && <ScreenTab campaign={campaign} lang={lang} onChange={onChange} />}
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------- Grupo
export function GroupFallback({ campaign, lang, isDM, sub, onSubChange, characters, onChange }) {
  const subs = ['players', 'chronicle'];
  const cur = subs.includes(sub) ? sub : 'players';
  return (
    <div className="col gap-3">
      <SubChips subs={subs} active={cur} onSelect={onSubChange} lang={lang} />
      {cur === 'players' && (
        <>
          <MembersTab campaign={campaign} lang={lang} isDM={isDM} characters={characters} onChange={onChange} />
          <ApprovalsLoader campaign={campaign} lang={lang} isDM={isDM} onChange={onChange} refreshKey={campaign.pendingApprovals} />
        </>
      )}
      {cur === 'chronicle' && <DiaryTab campaign={campaign} lang={lang} isDM={isDM} />}
    </div>
  );
}

// ---------------------------------------------------------------- Jogador
export function PlayerTableFallback({ campaign, lang, onChange }) {
  const st = campaign.state || {};
  return (
    <div className="col gap-4">
      <div className="info-box">
        <div className="state-tiles">
          {[[t(lang, 'Sessão', 'Session'), st.session], [t(lang, 'Cena', 'Scene'), st.scene], [t(lang, 'Clima', 'Weather'), st.weather]].map(([k, v]) => (
            <div key={k} className="state-tile">
              <span className="eyebrow">{k}</span>
              <span className={v ? '' : 'muted'}>{v || '—'}</span>
            </div>
          ))}
        </div>
        {st.sceneText && <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{st.sceneText}</p>}
      </div>
      <RollRequestPanel campaign={campaign} lang={lang} isDM={false} onChange={onChange} />
      <CampaignDiceRoller campaign={campaign} lang={lang} />
    </div>
  );
}

export function PlayerGroupFallback({ campaign, lang, characters, onChange }) {
  return (
    <div className="col gap-3">
      <MembersTab campaign={campaign} lang={lang} isDM={false} characters={characters} onChange={onChange} />
      <ApprovalsLoader campaign={campaign} lang={lang} isDM={false} onChange={onChange} />
    </div>
  );
}

export function ChronicleView({ campaign, lang, isDM }) {
  return <DiaryTab campaign={campaign} lang={lang} isDM={isDM} />;
}
