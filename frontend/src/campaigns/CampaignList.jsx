import { errorMessage } from '../api/errors.js';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { createSampleWorld } from '../world/world-api.js';
import CoverPicker from '../shell/CoverPicker.jsx';
import ToneAccentFields from '../shell/ToneAccentFields.jsx';
import { defaultCoverArt, isHexColor, saveRememberedArea, TONES } from '../shell/shell-logic.js';
import '../shell/shell.css';

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
      setError(errorMessage(e, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="campaign-list">
      {onBack && <button className="btn btn-ghost btn-sm" onClick={onBack}>← {t(lang, 'Voltar', 'Back')}</button>}
      <div className="page-head">
        <h1>{t(lang, 'Campanhas', 'Campaigns')}</h1>
        <div className="page-head-actions">
          <button className="btn btn-ghost" onClick={() => setShowJoin(true)}>{t(lang, 'Entrar com código', 'Join with code')}</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>{t(lang, '+ Nova campanha', '+ New campaign')}</button>
        </div>
      </div>

      {loading && <p>{t(lang, 'Carregando…', 'Loading…')}</p>}
      {error && <p style={{ color: 'var(--blood-bright)' }}>{error}</p>}

      {!loading && campaigns.length === 0 && (
        <div className="empty-state">
          <p>{t(lang, 'Você ainda não está em nenhuma campanha.', "You're not in any campaign yet.")}</p>
          <p style={{ color: 'var(--ink-secondary)' }}>
            {t(lang, 'Crie uma como mestre ou entre com o código de uma existente.', 'Create one as DM or join with an invite code.')}
          </p>
        </div>
      )}

      <div className="campaign-grid camp-cover-grid">
        {campaigns.map(c => <CampaignCard key={c.id} c={c} lang={lang} onOpen={onOpen} />)}
      </div>

      {showCreate && <CreateCampaignModal lang={lang} onClose={() => setShowCreate(false)} onCreated={(c) => { setShowCreate(false); load(); onOpen?.(c); }} />}
      {showJoin && <JoinCampaignModal lang={lang} onClose={() => setShowJoin(false)} onJoined={(c) => { setShowJoin(false); load(); onOpen?.(c); }} />}
    </div>
  );
}

function CampaignCard({ c, lang, onOpen }) {
  const cover = api.campaignCoverUrl(c) || defaultCoverArt(c);
  const accent = isHexColor(c.accent) ? c.accent : null;
  const tone = TONES.find(x => x.id === c.tone);
  const st = c.state || {};
  return (
    <article className="camp-card" style={accent ? { '--camp-accent': accent } : undefined}
      onClick={() => onOpen?.(c)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(c); } }}>
      <div className="camp-card-cover" aria-hidden="true">
        <img src={cover} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = defaultCoverArt(c); }} />
      </div>
      <div className="camp-card-body">
        <div className="camp-card-top">
          <span className={`role-pill role-${c.role}`}>{c.role === 'dm' ? t(lang, 'Mestre', 'DM') : t(lang, 'Jogador', 'Player')}</span>
          {st.live && <span className="shell-live"><span className="shell-live-dot" aria-hidden="true" />{t(lang, 'Ao vivo', 'Live')}</span>}
          {tone && <span className="camp-card-tone">{lang === 'en' ? tone.en : tone.pt}</span>}
        </div>
        <h3 className="camp-card-name">{c.name}</h3>
        {(c.tagline || c.description) && <p className="camp-card-tagline">{c.tagline || c.description}</p>}
        <div className="camp-card-meta">
          {st.session || st.scene
            ? [st.session && `${t(lang, 'Sessão', 'Session')} ${st.session}`, st.scene].filter(Boolean).join(' · ')
            : t(lang, 'Nenhuma sessão ainda', 'No sessions yet')}
          <span className="campaign-card-go" aria-hidden="true">→</span>
        </div>
      </div>
    </article>
  );
}

/**
 * Assistente de criação em 3 passos curtos (todos puláveis depois do nome):
 * 1. nome e frase · 2. capa, tom e cor · 3. mundo em branco ou exemplo.
 */
function CreateCampaignModal({ lang, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [cover, setCover] = useState(null);      // dataURL
  const [coverArt, setCoverArt] = useState(null); // caminho da arte escolhida (destaque)
  const [tone, setTone] = useState('');
  const [accent, setAccent] = useState('');
  const [start, setStart] = useState('blank');   // 'blank' | 'sample'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const canNext = name.trim().length > 0;
  const steps = [t(lang, 'Nome', 'Name'), t(lang, 'Capa e tom', 'Cover & tone'), t(lang, 'Como começar', 'How to start')];

  const create = async (e) => {
    e?.preventDefault?.();
    if (!canNext || busy) return;
    setBusy(true); setError('');
    try {
      const res = await api.createCampaign({
        name: name.trim(), description: '', tagline: tagline.trim(), tone, accent: isHexColor(accent) ? accent : '',
      });
      const c = res.campaign;
      // O resto é "bônus": se falhar, a campanha já existe e o mestre ajusta depois.
      if (cover) {
        try {
          await api.setCampaignCover(c.id, cover);
          await api.patchCampaign(c.id, { onboarding: { cover: true } });
        } catch { /* segue */ }
      }
      if (start === 'sample') {
        try { await createSampleWorld(c.id, lang); } catch { /* segue */ }
      }
      // Primeira visita: cai no Mundo, com os Primeiros passos.
      saveRememberedArea(c.id, { area: 'world', sub: 'atlas' });
      onCreated(c);
    } catch (err) {
      setError(errorMessage(err, lang));
      setBusy(false);
    }
  };

  const next = (e) => {
    e?.preventDefault?.();
    if (!canNext) return;
    if (step < 2) setStep(step + 1); else create();
  };

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal camp-wizard" role="dialog" aria-modal="true" aria-labelledby="camp-wizard-title" onClick={e => e.stopPropagation()}>
        <h2 id="camp-wizard-title" style={{ marginTop: 0 }}>{t(lang, 'Nova campanha', 'New campaign')}</h2>
        <ol className="camp-wizard-steps" aria-label={t(lang, 'Passos', 'Steps')}>
          {steps.map((s, i) => (
            <li key={s} className={`${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} aria-current={i === step ? 'step' : undefined}>
              <button type="button" onClick={() => canNext && setStep(i)} disabled={!canNext && i > 0}>
                <span className="camp-wizard-num">{i < step ? '✓' : i + 1}</span> {s}
              </button>
            </li>
          ))}
        </ol>

        <form onSubmit={next} className="col gap-3">
          {step === 0 && (
            <>
              <label className="col gap-1">
                <span>{t(lang, 'Nome da campanha', 'Campaign name')}</span>
                <input className="input" required value={name} maxLength={120} onChange={e => setName(e.target.value)} autoFocus
                  placeholder={t(lang, 'ex.: Ecos de Valdoria', 'e.g.: Echoes of Valdoria')} />
              </label>
              <label className="col gap-1">
                <span>{t(lang, 'Frase de efeito', 'Tagline')} <span className="muted text-sm">({t(lang, 'opcional', 'optional')})</span></span>
                <input className="input" value={tagline} maxLength={160} onChange={e => setTagline(e.target.value)}
                  placeholder={t(lang, 'Onde a névoa guarda segredos…', 'Where the mist keeps its secrets…')} />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <div className="col gap-1">
                <span>{t(lang, 'Capa', 'Cover')}</span>
                <CoverPicker lang={lang} selected={coverArt} busy={busy} allowRemove={false}
                  onPick={(url, art) => { setCover(url); setCoverArt(art || 'upload'); }} />
                {cover && coverArt === 'upload' && <img className="camp-wizard-preview" src={cover} alt={t(lang, 'Capa enviada', 'Uploaded cover')} />}
              </div>
              <ToneAccentFields lang={lang} tone={tone} accent={accent} onTone={setTone} onAccent={setAccent} />
            </>
          )}

          {step === 2 && (
            <div className="camp-wizard-starts" role="radiogroup" aria-label={t(lang, 'Como começar', 'How to start')}>
              <button type="button" role="radio" aria-checked={start === 'blank'} className={`camp-start ${start === 'blank' ? 'active' : ''}`} onClick={() => setStart('blank')}>
                <span className="camp-start-ico" aria-hidden="true">📜</span>
                <strong>{t(lang, 'Mundo em branco', 'Blank world')}</strong>
                <span className="muted text-sm">{t(lang, 'Você cria tudo do seu jeito, um cartão de cada vez.', 'You build everything your way, one card at a time.')}</span>
              </button>
              <button type="button" role="radio" aria-checked={start === 'sample'} className={`camp-start ${start === 'sample' ? 'active' : ''}`} onClick={() => setStart('sample')}>
                <span className="camp-start-ico" aria-hidden="true">🏔️</span>
                <strong>{t(lang, 'Começar com um exemplo', 'Start with a sample')}</strong>
                <span className="muted text-sm">{t(lang,
                  'A vila "Vale de Brumafria": um mapa, 3 NPCs, uma facção, um rumor, um segredo e uma aventura de 3 salas. Tudo editável e apagável.',
                  'The village "Mistfrost Vale": a map, 3 NPCs, a faction, a rumor, a secret and a 3-room adventure. All editable and deletable.')}</span>
              </button>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          <div className="camp-wizard-actions">
            {step > 0
              ? <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={busy}>← {t(lang, 'Voltar', 'Back')}</button>
              : <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>{t(lang, 'Cancelar', 'Cancel')}</button>}
            <span style={{ flex: 1 }} />
            {step < 2 && canNext && (
              <button type="button" className="btn btn-ghost" onClick={create} disabled={busy}>{t(lang, 'Criar agora', 'Create now')}</button>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy || !canNext}>
              {busy ? t(lang, 'Criando…', 'Creating…') : step < 2 ? t(lang, 'Próximo', 'Next') : t(lang, 'Criar campanha', 'Create campaign')}
            </button>
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
      else setError(errorMessage(e, lang));
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
