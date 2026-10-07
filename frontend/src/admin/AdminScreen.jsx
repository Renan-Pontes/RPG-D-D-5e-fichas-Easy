/* Área de administração (só contas admin): visão geral, contas, fichas e campanhas.
   Somente leitura, exceto o plano/extras de cada conta (PATCH /api/admin/users/<id>/plan). */
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { tName } from '../../data/i18n.js';
import { Modal } from '../../components/Shared.jsx';
import Icon from '../../components/Icons.jsx';
import './admin.css';
import { loadCatalog, plansApi } from '../plans/plans-api.js';
import '../plans/plans.css';
import { L as PL, formatPrice, normalizeMyPlan, planName } from '../plans/plans-logic.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const fmtDate = (iso, lang) => (iso ? new Date(iso).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const className = (id, lang) => (id && id !== '—' ? tName('class', id, lang) : L(lang, 'sem classe', 'no class'));
const CLASSES = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard', 'artificer'];

function useLoad(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const reload = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: null }));
    fn().then(data => setState({ loading: false, data, error: null }))
      .catch(error => setState({ loading: false, data: null, error }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

const Status = ({ state, lang }) => (state.loading ? <p className="muted">{L(lang, 'Carregando…', 'Loading…')}</p>
  : state.error ? <p className="adm-error">{errorMessage(state.error, lang)}</p> : null);

function Stat({ label, value, sub }) {
  return (
    <div className="adm-stat">
      <div className="adm-stat-value mono">{value}</div>
      <div className="adm-stat-label">{label}</div>
      {sub && <div className="adm-stat-sub muted">{sub}</div>}
    </div>
  );
}

function CharacterRow({ c, lang, onOpen, showOwner = true }) {
  return (
    <button type="button" className="adm-row" onClick={() => onOpen(c.id)}>
      <span className="adm-row-main">
        <strong>{c.name || L(lang, 'Sem nome', 'Unnamed')}</strong>
        <span className="muted"> · {className(c.className, lang)} {c.level} · {c.rulesVersion}</span>
      </span>
      {showOwner && <span className="adm-row-side muted">{c.owner.displayName} ({c.owner.email})</span>}
      <span className="adm-row-side muted mono">{fmtDate(c.updatedAt, lang)}</span>
    </button>
  );
}

function Overview({ lang, openUser, openChar }) {
  const st = useLoad(() => api.adminOverview(), []);
  const d = st.data;
  return (
    <>
      <Status state={st} lang={lang} />
      {d && (
        <>
          <div className="adm-stats">
            <Stat label={L(lang, 'Contas', 'Accounts')} value={d.totals.users}
              sub={L(lang, `+${d.signups.week} na semana · +${d.signups.month} no mês`, `+${d.signups.week} this week · +${d.signups.month} this month`)} />
            <Stat label={L(lang, 'Ativas (login)', 'Active (login)')} value={d.activeUsers.week}
              sub={L(lang, `na semana · ${d.activeUsers.month} no mês`, `this week · ${d.activeUsers.month} this month`)} />
            <Stat label={L(lang, 'Fichas', 'Characters')} value={d.totals.characters}
              sub={L(lang, `+${d.charactersCreated.week} na semana · +${d.charactersCreated.month} no mês`, `+${d.charactersCreated.week} this week · +${d.charactersCreated.month} this month`)} />
            <Stat label={L(lang, 'Campanhas', 'Campaigns')} value={d.totals.campaigns}
              sub={L(lang, `${d.totals.activeShares} links de ficha ativos`, `${d.totals.activeShares} active share links`)} />
          </div>
          <div className="adm-two">
            <section className="adm-card">
              <h3>{L(lang, 'Fichas por classe', 'Characters by class')}</h3>
              {d.byClass.map(([id, n]) => (
                <div key={id} className="adm-bar">
                  <span>{className(id, lang)}</span>
                  <span className="adm-bar-track"><span style={{ width: `${(n / Math.max(1, d.totals.characters)) * 100}%` }} /></span>
                  <span className="mono">{n}</span>
                </div>
              ))}
              <p className="muted text-xs" style={{ marginTop: 8 }}>
                {L(lang, 'Regras', 'Rules')}: {d.byRules.map(([r, n]) => `${r}: ${n}`).join(' · ')}
              </p>
            </section>
            <section className="adm-card">
              <h3>{L(lang, 'Contas recentes', 'Recent accounts')}</h3>
              {d.recentUsers.map(u => (
                <button key={u.id} type="button" className="adm-row" onClick={() => openUser(u.id)}>
                  <span className="adm-row-main"><strong>{u.displayName}</strong> <span className="muted">{u.email}</span></span>
                  <span className="adm-row-side muted mono">{fmtDate(u.dateJoined, lang)}</span>
                </button>
              ))}
            </section>
          </div>
          <section className="adm-card">
            <h3>{L(lang, 'Fichas criadas recentemente', 'Recently created characters')}</h3>
            {d.recentCharacters.map(c => <CharacterRow key={c.id} c={c} lang={lang} onOpen={openChar} />)}
          </section>
        </>
      )}
    </>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return <input className="adm-search" type="search" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
}

function Pager({ total, offset, setOffset, size = 50, lang }) {
  if (total <= size) return null;
  return (
    <div className="adm-pager">
      <button className="btn btn-ghost btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - size))}>{L(lang, 'Anterior', 'Previous')}</button>
      <span className="muted mono">{offset + 1}–{Math.min(total, offset + size)} / {total}</span>
      <button className="btn btn-ghost btn-sm" disabled={offset + size >= total} onClick={() => setOffset(offset + size)}>{L(lang, 'Próxima', 'Next')}</button>
    </div>
  );
}

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function Users({ lang, openUser }) {
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const dq = useDebounced(q);
  useEffect(() => setOffset(0), [dq]);
  const st = useLoad(() => api.adminUsers(dq, offset), [dq, offset]);
  return (
    <>
      <SearchBox value={q} onChange={setQ} placeholder={L(lang, 'Buscar por e-mail ou nome…', 'Search by email or name…')} />
      <Status state={st} lang={lang} />
      {st.data && (
        <section className="adm-card">
          <div className="muted text-xs" style={{ marginBottom: 6 }}>{st.data.total} {L(lang, 'contas', 'accounts')}</div>
          {st.data.results.map(u => (
            <button key={u.id} type="button" className="adm-row" onClick={() => openUser(u.id)}>
              <span className="adm-row-main">
                <strong>{u.displayName}</strong>{u.isAdmin && <span className="adm-tag">admin</span>}
                {(u.plan?.slug || typeof u.plan === 'string') && (u.plan?.slug || u.plan) !== 'free' && <span className="adm-tag">{u.plan?.slug || u.plan}</span>}
                <span className="muted"> {u.email}</span>
              </span>
              <span className="adm-row-side muted">{u.characters} {L(lang, 'fichas', 'chars')} · {u.campaigns} {L(lang, 'mesas', 'tables')}</span>
              <span className="adm-row-side muted mono" title={L(lang, 'Último login', 'Last login')}>{fmtDate(u.lastLogin, lang)}</span>
            </button>
          ))}
          <Pager total={st.data.total} offset={offset} setOffset={setOffset} lang={lang} />
        </section>
      )}
    </>
  );
}

function Characters({ lang, openChar }) {
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('');
  const [rules, setRules] = useState('');
  const [offset, setOffset] = useState(0);
  const dq = useDebounced(q);
  useEffect(() => setOffset(0), [dq, cls, rules]);
  const st = useLoad(() => api.adminCharacters({ q: dq, className: cls, rules, offset }), [dq, cls, rules, offset]);
  return (
    <>
      <div className="adm-filters">
        <SearchBox value={q} onChange={setQ} placeholder={L(lang, 'Buscar ficha, dono ou e-mail…', 'Search character, owner or email…')} />
        <select value={cls} onChange={e => setCls(e.target.value)}>
          <option value="">{L(lang, 'Todas as classes', 'All classes')}</option>
          {CLASSES.map(id => <option key={id} value={id}>{tName('class', id, lang)}</option>)}
        </select>
        <select value={rules} onChange={e => setRules(e.target.value)}>
          <option value="">{L(lang, 'Todas as regras', 'All rules')}</option>
          <option value="2024">2024</option>
          <option value="2014">2014</option>
        </select>
      </div>
      <Status state={st} lang={lang} />
      {st.data && (
        <section className="adm-card">
          <div className="muted text-xs" style={{ marginBottom: 6 }}>{st.data.total} {L(lang, 'fichas', 'characters')}</div>
          {st.data.results.map(c => <CharacterRow key={c.id} c={c} lang={lang} onOpen={openChar} />)}
          <Pager total={st.data.total} offset={offset} setOffset={setOffset} lang={lang} />
        </section>
      )}
    </>
  );
}

function Campaigns({ lang, openUser }) {
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const dq = useDebounced(q);
  useEffect(() => setOffset(0), [dq]);
  const st = useLoad(() => api.adminCampaigns(dq, offset), [dq, offset]);
  return (
    <>
      <SearchBox value={q} onChange={setQ} placeholder={L(lang, 'Buscar campanha ou e-mail do mestre…', 'Search campaign or DM email…')} />
      <Status state={st} lang={lang} />
      {st.data && (
        <section className="adm-card">
          <div className="muted text-xs" style={{ marginBottom: 6 }}>{st.data.total} {L(lang, 'campanhas', 'campaigns')}</div>
          {st.data.results.map(c => (
            <button key={c.id} type="button" className="adm-row" onClick={() => openUser(c.dm.id)}>
              <span className="adm-row-main"><strong>{c.name}</strong> <span className="muted">· {L(lang, 'mestre', 'DM')} {c.dm.displayName}</span></span>
              <span className="adm-row-side muted">{c.members} {L(lang, 'membros', 'members')}</span>
              <span className="adm-row-side muted mono">{fmtDate(c.updatedAt, lang)}</span>
            </button>
          ))}
          <Pager total={st.data.total} offset={offset} setOffset={setOffset} lang={lang} />
        </section>
      )}
    </>
  );
}

function UserModal({ id, lang, onClose, openChar }) {
  const st = useLoad(() => api.adminUser(id), [id]);
  const d = st.data;
  return (
    <Modal onClose={onClose} title={d ? d.user.displayName : L(lang, 'Conta', 'Account')}>
      <Status state={st} lang={lang} />
      {d && (
        <>
          <p className="muted text-sm">
            {d.user.email}{d.user.isAdmin && <span className="adm-tag">admin</span>}<br />
            {L(lang, 'Criada em', 'Joined')} {fmtDate(d.user.dateJoined, lang)} · {L(lang, 'último login', 'last login')} {fmtDate(d.user.lastLogin, lang)}
          </p>
          <PlanEditor userId={id} initial={d.plan || d.userPlan || null} lang={lang} />
          <h4>{L(lang, 'Fichas', 'Characters')} ({d.characters.length})</h4>
          {d.characters.length ? d.characters.map(c => <CharacterRow key={c.id} c={c} lang={lang} onOpen={openChar} showOwner={false} />)
            : <p className="muted text-sm">{L(lang, 'Nenhuma ficha.', 'No characters.')}</p>}
          <h4 style={{ marginTop: 12 }}>{L(lang, 'Campanhas', 'Campaigns')}</h4>
          {[...d.campaignsAsDm.map(c => ({ ...c, role: L(lang, 'mestre', 'DM') })), ...d.campaignsAsPlayer.map(c => ({ ...c, role: L(lang, 'jogador', 'player') }))]
            .map(c => <div key={`${c.id}-${c.role}`} className="text-sm">{c.name} <span className="muted">({c.role})</span></div>)}
          {!d.campaignsAsDm.length && !d.campaignsAsPlayer.length && <p className="muted text-sm">{L(lang, 'Nenhuma campanha.', 'No campaigns.')}</p>}
        </>
      )}
    </Modal>
  );
}

/** Plano e extras da conta (admin). Pagamento ainda não existe: é aqui que se libera. */
function PlanEditor({ userId, initial, lang }) {
  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState(null);   // {plan, addons:{slug:qtd}, validUntil:'aaaa-mm-dd'}
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    let alive = true;
    (async () => {
      const cat = await loadCatalog();
      let raw = initial;
      if (!raw) { try { raw = await plansApi.adminGetPlan(userId); } catch { raw = null; } }
      const my = normalizeMyPlan(raw || { plan: 'free' }, cat);
      if (!alive) return;
      setCatalog(cat);
      setForm({ plan: my.plan.slug || 'free', addons: { ...my.addons }, validUntil: my.validUntil ? String(my.validUntil).slice(0, 10) : '', source: my.source });
    })();
    return () => { alive = false; };
  }, [userId, initial]);
  if (!catalog || !form) return <p className="muted text-sm">{L(lang, 'Carregando plano…', 'Loading plan…')}</p>;
  const setAddon = (slug, v) => setForm(f => ({ ...f, addons: { ...f.addons, [slug]: Math.max(0, Math.min(99, parseInt(v, 10) || 0)) } }));
  const save = async () => {
    setBusy(true); setMsg('');
    try {
      await plansApi.adminSetPlan(userId, { plan: form.plan, addons: form.addons, validUntil: form.validUntil || null });
      setMsg(L(lang, 'Plano salvo ✓', 'Plan saved ✓'));
    } catch (e) { setMsg(errorMessage(e, lang)); } finally { setBusy(false); }
  };
  return (
    <section className="adm-plan">
      <h4 style={{ marginTop: 0 }}>{L(lang, 'Plano da conta', 'Account plan')}
        {form.source && form.source !== 'free' && <span className="adm-tag">{form.source}</span>}</h4>
      <div className="adm-plan-grid">
        <label className="adm-plan-field">
          <span>{L(lang, 'Plano', 'Plan')}</span>
          <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
            {catalog.plans.map(p => <option key={p.slug} value={p.slug}>{planName(p, lang)} — {formatPrice(p.priceCents, lang, { free: false })}</option>)}
          </select>
        </label>
        <label className="adm-plan-field">
          <span>{L(lang, 'Válido até (vazio = sem prazo)', 'Valid until (empty = no end)')}</span>
          <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
        </label>
        {catalog.addons.map(a => (
          <label key={a.slug} className="adm-plan-field adm-plan-addon">
            <span>{PL(lang, a.namePt, a.nameEn)}</span>
            <input type="number" min={0} max={99} inputMode="numeric" value={form.addons[a.slug] || 0} onChange={e => setAddon(a.slug, e.target.value)} />
          </label>
        ))}
      </div>
      <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? '…' : L(lang, 'Salvar plano', 'Save plan')}</button>
        {msg && <span className="muted text-sm" role="status">{msg}</span>}
      </div>
    </section>
  );
}

function CharacterModal({ id, lang, onClose, openUser }) {
  const st = useLoad(() => api.adminCharacter(id), [id]);
  const [busy, setBusy] = useState(false);
  const c = st.data;
  const pdf = async () => {
    setBusy(true);
    try {
      const [{ downloadDnd5ePdf }, { speciesSummary }] = await Promise.all([
        import('../pdf/export-pdf.js'), import('../progression/SpeciesChoices.jsx'),
      ]);
      await downloadDnd5ePdf(c.data, lang, { speciesSummary, flatten: true });
    } finally { setBusy(false); }
  };
  const json = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(c.data, null, 2)], { type: 'application/json' }));
    a.download = `${(c.name || 'ficha').replace(/[^a-z0-9]+/gi, '_')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  return (
    <Modal onClose={onClose} title={c ? c.name : L(lang, 'Ficha', 'Character')}>
      <Status state={st} lang={lang} />
      {c && (
        <>
          {c.data?.avatar && <img className="adm-avatar" src={c.data.avatar} alt="" />}
          <p className="text-sm">
            {className(c.className, lang)} {c.level}
            {c.race && <> · {tName('race', c.race, lang)}</>}
            {c.background && <> · {tName('background', c.background, lang)}</>}
            {' '}· {L(lang, 'regras', 'rules')} {c.rulesVersion}
          </p>
          <p className="text-sm muted">
            {L(lang, 'Dono', 'Owner')}: <button type="button" className="adm-link" onClick={() => openUser(c.owner.id)}>{c.owner.displayName} ({c.owner.email})</button><br />
            {L(lang, 'Criada', 'Created')} {fmtDate(c.createdAt, lang)} · {L(lang, 'atualizada', 'updated')} {fmtDate(c.updatedAt, lang)}
          </p>
          <div className="row gap-2" style={{ flexWrap: 'wrap', marginTop: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={pdf} disabled={busy}><Icon name="download" size={14}/> {busy ? '…' : L(lang, 'Baixar PDF', 'Download PDF')}</button>
            <button className="btn btn-ghost btn-sm" onClick={json}><Icon name="download" size={14}/> JSON</button>
          </div>
        </>
      )}
    </Modal>
  );
}

const TABS = [
  ['overview', 'Visão geral', 'Overview'], ['users', 'Contas', 'Accounts'],
  ['characters', 'Fichas', 'Characters'], ['campaigns', 'Campanhas', 'Campaigns'],
];

export default function AdminScreen({ lang, onBack }) {
  const [tab, setTab] = useState('overview');
  const [userId, setUserId] = useState(null);
  const [charId, setCharId] = useState(null);
  const openUser = (id) => { setCharId(null); setUserId(id); };
  const openChar = (id) => { setUserId(null); setCharId(id); };
  return (
    <div className="adm">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{L(lang, 'Administração', 'Administration')}</h2>
        <div className="row gap-2">
          <a className="btn btn-ghost btn-sm" href="/admin/" target="_blank" rel="noreferrer">{L(lang, 'Painel do Django', 'Django admin')}</a>
          <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon name="arrow-back" size={14}/> {L(lang, 'Voltar', 'Back')}</button>
        </div>
      </div>
      <nav className="adm-tabs" role="tablist">
        {TABS.map(([id, pt, en]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`adm-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{L(lang, pt, en)}</button>
        ))}
      </nav>
      {tab === 'overview' && <Overview lang={lang} openUser={openUser} openChar={openChar} />}
      {tab === 'users' && <Users lang={lang} openUser={openUser} />}
      {tab === 'characters' && <Characters lang={lang} openChar={openChar} />}
      {tab === 'campaigns' && <Campaigns lang={lang} openUser={openUser} />}
      {userId && <UserModal id={userId} lang={lang} onClose={() => setUserId(null)} openChar={openChar} />}
      {charId && <CharacterModal id={charId} lang={lang} onClose={() => setCharId(null)} openUser={openUser} />}
    </div>
  );
}
