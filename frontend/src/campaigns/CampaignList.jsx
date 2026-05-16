import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

export default function CampaignList({ lang = 'pt', onOpen, onBack }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.listCampaigns();
      setCampaigns(res.campaigns || []);
      setError('');
    } catch (e) {
      setError(e?.message || 'failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="campaign-list">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          {onBack && <button className="btn btn-ghost btn-sm" onClick={onBack}>← {t(lang, 'Voltar', 'Back')}</button>}
          <h1 style={{ margin: '8px 0 0 0' }}>{t(lang, 'Campanhas', 'Campaigns')}</h1>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost" onClick={() => setShowJoin(true)}>{t(lang, 'Entrar com código', 'Join with code')}</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t(lang, '+ Nova campanha', '+ New campaign')}</button>
        </div>
      </div>

      {loading && <p>{t(lang, 'Carregando…', 'Loading…')}</p>}
      {error && <p style={{ color: '#ff9999' }}>{error}</p>}

      {!loading && campaigns.length === 0 && (
        <div className="empty-state">
          <p>{t(lang, 'Você ainda não está em nenhuma campanha.', "You're not in any campaign yet.")}</p>
          <p style={{ color: 'var(--ink-secondary)' }}>
            {t(lang, 'Crie uma como mestre ou entre com o código de uma existente.', 'Create one as DM or join with an invite code.')}
          </p>
        </div>
      )}

      <div className="campaign-grid">
        {campaigns.map(c => (
          <article key={c.id} className="campaign-card" onClick={() => onOpen?.(c)}>
            <div className="campaign-card-header">
              <h3 style={{ margin: 0 }}>{c.name}</h3>
              <span className={`role-pill role-${c.role}`}>{c.role === 'dm' ? t(lang, 'Mestre', 'DM') : t(lang, 'Jogador', 'Player')}</span>
            </div>
            {c.description && <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9em' }}>{c.description}</p>}
            <div style={{ fontSize: '0.8em', color: 'var(--ink-secondary)' }}>{c.slug}</div>
          </article>
        ))}
      </div>

      {showCreate && <CreateCampaignModal lang={lang} onClose={() => setShowCreate(false)} onCreated={(c) => { setShowCreate(false); load(); onOpen?.(c); }} />}
      {showJoin && <JoinCampaignModal lang={lang} onClose={() => setShowJoin(false)} onJoined={(c) => { setShowJoin(false); load(); onOpen?.(c); }} />}
    </div>
  );
}

function CreateCampaignModal({ lang, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.createCampaign({ name, description: desc });
      onCreated(res.campaign);
    } catch (e) {
      setError(e?.message || 'failed');
    } finally { setBusy(false); }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{t(lang, 'Nova campanha', 'New campaign')}</h2>
        <form onSubmit={submit} className="col gap-3">
          <label className="col gap-1">
            <span>{t(lang, 'Nome', 'Name')}</span>
            <input className="input" required value={name} onChange={e => setName(e.target.value)} autoFocus />
          </label>
          <label className="col gap-1">
            <span>{t(lang, 'Descrição', 'Description')}</span>
            <textarea className="input" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{t(lang, 'Criar', 'Create')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinCampaignModal({ lang, onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.joinCampaign({ inviteCode: code });
      onJoined({ id: res.campaignId, slug: res.slug });
    } catch (e) {
      if (e?.data?.error === 'invite_invalid') setError(t(lang, 'Código inválido', 'Invalid code'));
      else setError(e?.message || 'failed');
    } finally { setBusy(false); }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{t(lang, 'Entrar em campanha', 'Join campaign')}</h2>
        <form onSubmit={submit} className="col gap-3">
          <label className="col gap-1">
            <span>{t(lang, 'Código de convite', 'Invite code')}</span>
            <input
              className="input"
              required
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              maxLength={10}
              autoFocus
              style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: 2, fontSize: '1.2em' }}
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{t(lang, 'Entrar', 'Join')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
