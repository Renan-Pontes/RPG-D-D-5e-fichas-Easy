import { errorMessage } from '../api/errors.js';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { createSampleWorld } from '../world/world-api.js';
import ReadyAdventureGallery from '../ready/ReadyAdventureGallery.jsx';
import { readyApi } from '../ready/ready-logic.js';
import CoverPicker from './CoverPicker.jsx';
import ToneAccentFields from '../shell/ToneAccentFields.jsx';
import { defaultCoverArt, isHexColor, saveRememberedArea, TONES } from '../shell/shell-logic.js';
import '../shell/shell.css';
import { TableInviteCard } from '../creator/JoinTable.jsx';
import { normalizeInviteCode, joinFromInvite, joinToast } from '../creator/creation.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

/**
 * joinCode: código vindo da rota /join/<código> — abre o "Entrar com código" já preenchido.
 * characters: fichas do jogador, para escolher qual levar à mesa.
 * onJoinCodeUsed: avisa que o código pré-preenchido já foi usado/fechado.
 * onToast: mensagem de sucesso ao entrar.
 */
export default function CampaignList({ lang = 'pt', onOpen, onBack, joinCode = null, characters = [], onJoinCodeUsed, onToast }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(!!joinCode);
  useEffect(() => { if (joinCode) setShowJoin(true); }, [joinCode]);
  const closeJoin = () => { setShowJoin(false); onJoinCodeUsed?.(); };

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
      {showJoin && <JoinCampaignModal lang={lang} initialCode={joinCode || ''} characters={characters} onClose={closeJoin}
        onJoined={(c) => { closeJoin(); load(); onOpen?.(c); if (c.toast) onToast?.(c.toast); }} />}
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
  const [cover, setCover] = useState(null);           // dataURL 16:9 (pronta ou enviada) ou null
  const [coverChoice, setCoverChoice] = useState('none'); // id da capa pronta | 'upload' | 'none'
  const [coverWorking, setCoverWorking] = useState(false);
  const [tone, setTone] = useState('');
  const [accent, setAccent] = useState('');
  const [start, setStart] = useState('blank');   // 'blank' | 'sample' | 'ready'
  const [readyId, setReadyId] = useState(null);   // aventura pronta escolhida (start === 'ready')
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
    if (!canNext || busy || coverWorking) return;
    if (step === 2 && start === 'ready' && !readyId) {
      setError(t(lang, 'Escolha uma das aventuras prontas (ou outro jeito de começar).', 'Pick one of the ready adventures (or another way to start).'));
      return;
    }
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
      let imported = false;
      if (start === 'ready' && readyId) {
        try { await readyApi.importInto(c.id, readyId, lang); imported = true; } catch { /* segue: dá para importar em Preparar */ }
      }
      // Primeira visita: com aventura pronta, cai na aventura; senão, no Mundo (Primeiros passos).
      saveRememberedArea(c.id, imported ? { area: 'prepare', sub: 'adventures' } : { area: 'world', sub: 'atlas' });
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

          {/* Passo 2 fica montado (só escondido) para a escolha de capa não se perder ao voltar. */}
          <div className="col gap-3" style={step !== 1 ? { display: 'none' } : undefined}>
            <div className="col gap-1">
              <span className="shell-label">{t(lang, 'Capa', 'Cover')}</span>
              <CoverPicker lang={lang} name={name} tagline={tagline} accent={isHexColor(accent) ? accent : ''}
                initialChoice={coverChoice} busy={busy}
                onWorking={setCoverWorking} onPick={(url, choice) => { setCover(url); setCoverChoice(choice); }} />
            </div>
            <ToneAccentFields lang={lang} tone={tone} accent={accent} onTone={setTone} onAccent={setAccent} />
          </div>

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
              <button type="button" role="radio" aria-checked={start === 'ready'} className={`camp-start ${start === 'ready' ? 'active' : ''}`} onClick={() => { setStart('ready'); setError(''); }}>
                <span className="camp-start-ico" aria-hidden="true">📖</span>
                <strong>{t(lang, 'Começar com uma aventura pronta', 'Start with a ready adventure')}</strong>
                <span className="muted text-sm">{t(lang,
                  'Uma aventura completa para iniciantes: mundo, personagens, salas, pistas e dicas para conduzir.',
                  'A complete beginner adventure: world, characters, rooms, clues and tips for running it.')}</span>
              </button>
            </div>
          )}
          {step === 2 && start === 'ready' && (
            <ReadyAdventureGallery lang={lang} mode="pick" selected={readyId} onSelect={(id) => { setReadyId(id); setError(''); }} />
          )}

          {error && <div className="auth-error">{error}</div>}
          <div className="camp-wizard-actions">
            {step > 0
              ? <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={busy}>← {t(lang, 'Voltar', 'Back')}</button>
              : <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>{t(lang, 'Cancelar', 'Cancel')}</button>}
            <span className="camp-wizard-spacer" aria-hidden="true" />
            {step < 2 && canNext && (
              <button type="button" className="btn btn-ghost" onClick={create} disabled={busy || coverWorking}>{t(lang, 'Criar agora', 'Create now')}</button>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy || !canNext || coverWorking}>
              {busy ? t(lang, 'Criando…', 'Creating…') : step < 2 ? t(lang, 'Próximo', 'Next') : t(lang, 'Criar campanha', 'Create campaign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Entrar numa campanha com o código, escolhendo (opcional) qual ficha levar. */
function JoinCampaignModal({ lang, onClose, onJoined, initialCode = '', characters = [] }) {
  const [code, setCode] = useState(normalizeInviteCode(initialCode));
  // Só fichas da conta (id do servidor); as que já estão numa mesa ficam desabilitadas.
  const mine = characters.filter(c => typeof c.id === 'number');
  const [charId, setCharId] = useState(() => (mine.find(c => !c.inCampaign)?.id ?? ''));
  const [table, setTable] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Código preenchido pela rota: mostra a mesa (se o servidor souber dizer).
  useEffect(() => {
    let alive = true;
    const c = normalizeInviteCode(initialCode);
    if (!c) return undefined;
    api.campaignInvite(c).then(res => { if (alive) setTable(joinFromInvite(c, res)); }).catch(() => {});
    return () => { alive = false; };
  }, [initialCode]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const body = { inviteCode: normalizeInviteCode(code) };
      if (charId !== '') body.characterId = charId;
      const res = await api.joinCampaign(body);
      const ch = mine.find(c => c.id === charId);
      onJoined({ id: res.campaignId, slug: res.slug, toast: ch && table && normalizeInviteCode(code) === table.code ? joinToast(ch.name, table.name, lang) : '' });
    } catch (e) {
      if (e?.data?.error === 'invite_invalid') setError(t(lang, 'Código inválido: confira as letras com o seu mestre.', 'Invalid code: check the letters with your GM.'));
      else setError(errorMessage(e, lang));
    } finally { setBusy(false); }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="join-camp-title" onClick={e => e.stopPropagation()}>
        <h2 id="join-camp-title" style={{ marginTop: 0 }}>{t(lang, 'Entrar em campanha', 'Join campaign')}</h2>
        <form onSubmit={submit} className="col gap-3">
          <label className="col gap-1">
            <span>{t(lang, 'Código de convite', 'Invite code')}</span>
            <input
              className="input"
              required
              value={code}
              onChange={e => { setCode(normalizeInviteCode(e.target.value)); setError(''); }}
              placeholder="ABCDEF"
              maxLength={16}
              autoFocus={!initialCode}
              autoComplete="off"
              style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: 2, fontSize: '1.2em' }}
            />
          </label>
          {table && normalizeInviteCode(code) === table.code && <TableInviteCard table={table} lang={lang} />}
          {mine.length > 0 && (
            <fieldset className="col gap-1" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <legend style={{ marginBottom: 'var(--s-1)' }}>{t(lang, 'Qual personagem vai para a mesa?', 'Which character goes to the table?')}</legend>
              <div className="join-chars">
                {mine.map(c => (
                  <label key={c.id} className={`join-char ${c.inCampaign ? 'is-disabled' : ''}`}>
                    <input type="radio" name="join-char" checked={charId === c.id} disabled={!!c.inCampaign} onChange={() => setCharId(c.id)} />
                    <span className="join-char-name">{c.name || t(lang, 'Sem nome', 'Unnamed')}</span>
                    <span className="muted text-sm">{c.inCampaign ? t(lang, 'já está numa mesa', 'already in a table') : `${t(lang, 'nível', 'level')} ${c.level || 1}`}</span>
                  </label>
                ))}
                <label className="join-char">
                  <input type="radio" name="join-char" checked={charId === ''} onChange={() => setCharId('')} />
                  <span className="join-char-name">{t(lang, 'Escolho depois', "I'll pick later")}</span>
                </label>
              </div>
            </fieldset>
          )}
          {error && <div className="auth-error">{error}</div>}
          <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={busy || !code}>{busy ? t(lang, 'Entrando…', 'Joining…') : t(lang, 'Entrar', 'Join')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
