// ⚙ Ajustes da campanha (DESIGN 1.2): identidade (nome, frase, capa, cor, tom),
// convite e link do telão, modo de nível e multiclasse, e Ferramentas avançadas
// (Dados preparados pelo mestre — desligado por padrão).
import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import CoverPicker from './CoverPicker.jsx';
import ToneAccentFields from './ToneAccentFields.jsx';
import { isHexColor, screenLink, t } from './shell-logic.js';

const AdvancedDice = lazy(() => import('./AdvancedDice.jsx'));

const SECTIONS = ['identity', 'table', 'rules', 'advanced'];

export default function SettingsMenu({ campaign, lang, onClose, onChange, worldCount = null, worldMax = 500, onMarkOnboarding }) {
  const [section, setSection] = useState('identity');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const labels = {
    identity: t(lang, 'Identidade', 'Identity'),
    table: t(lang, 'Convite e telão', 'Invite & TV'),
    rules: t(lang, 'Regras da mesa', 'Table rules'),
    advanced: t(lang, 'Ferramentas avançadas', 'Advanced tools'),
  };
  return (
    <div className="modal-backdrop shell-settings-backdrop" onClick={onClose}>
      <div className="modal shell-settings" role="dialog" aria-modal="true" aria-labelledby="shell-settings-title" onClick={(e) => e.stopPropagation()}>
        <div className="shell-settings-head">
          <h2 id="shell-settings-title">⚙ {t(lang, 'Ajustes da campanha', 'Campaign settings')}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t(lang, 'Fechar', 'Close')}>✕</button>
        </div>
        <div className="shell-subchips" role="tablist">
          {SECTIONS.map(s => (
            <button key={s} type="button" role="tab" aria-selected={section === s}
              className={`shell-subchip ${section === s ? 'active' : ''}`} onClick={() => setSection(s)}>{labels[s]}</button>
          ))}
        </div>
        <div className="shell-settings-body">
          {section === 'identity' && <IdentitySection campaign={campaign} lang={lang} onChange={onChange} onMarkOnboarding={onMarkOnboarding} />}
          {section === 'table' && <TableSection campaign={campaign} lang={lang} onChange={onChange} onMarkOnboarding={onMarkOnboarding} />}
          {section === 'rules' && <RulesSection campaign={campaign} lang={lang} onChange={onChange} />}
          {section === 'advanced' && <AdvancedSection campaign={campaign} lang={lang} onChange={onChange} worldCount={worldCount} worldMax={worldMax} />}
        </div>
      </div>
    </div>
  );
}

function useStatus() {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn, ok, lang) => {
    setBusy(true); setMsg('');
    try { await fn(); setMsg(ok); } catch (e) { setMsg(errorMessage(e, lang)); } finally { setBusy(false); }
  };
  return { msg, busy, run, setMsg };
}

function IdentitySection({ campaign, lang, onChange, onMarkOnboarding }) {
  const [name, setName] = useState(campaign.name || '');
  const [tagline, setTagline] = useState(campaign.tagline || '');
  const [tone, setTone] = useState(campaign.tone || '');
  const [accent, setAccent] = useState(campaign.accent || '');
  const { msg, busy, run } = useStatus();
  const coverStatus = useStatus();
  const dirty = name !== (campaign.name || '') || tagline !== (campaign.tagline || '') || tone !== (campaign.tone || '') || accent !== (campaign.accent || '');

  const save = () => run(async () => {
    await api.patchCampaign(campaign.id, { name: name.trim() || campaign.name, tagline: tagline.trim(), tone, accent: isHexColor(accent) ? accent : '' });
    onChange?.();
  }, t(lang, 'Salvo ✓', 'Saved ✓'), lang);

  const setCover = (dataUrl) => coverStatus.run(async () => {
    await api.setCampaignCover(campaign.id, dataUrl);
    if (dataUrl) onMarkOnboarding?.('cover');
    onChange?.();
  }, dataUrl ? t(lang, 'Capa atualizada ✓', 'Cover updated ✓') : t(lang, 'Capa removida', 'Cover removed'), lang);

  return (
    <div className="col gap-4 shell-settings-form">
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Capa', 'Cover')}</h3>
        <p className="muted text-sm" style={{ margin: 0 }}>{t(lang, 'A capa é salva assim que você escolhe.', 'The cover is saved as soon as you pick it.')}</p>
        <CoverPicker lang={lang} campaign={campaign} busy={coverStatus.busy} onPick={setCover} />
        {coverStatus.msg && <span className="muted text-sm" role="status">{coverStatus.msg}</span>}
      </section>
      <section className="col gap-3">
        <h3 className="shell-h3">{t(lang, 'Nome, tom e cor', 'Name, tone and color')}</h3>
        <label className="col gap-1">
          <span>{t(lang, 'Nome', 'Name')}</span>
          <input className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="col gap-1">
          <span>{t(lang, 'Frase de efeito', 'Tagline')}</span>
          <input className="input" value={tagline} maxLength={160} onChange={(e) => setTagline(e.target.value)}
            placeholder={t(lang, 'Onde a névoa guarda segredos…', 'Where the mist keeps its secrets…')} />
        </label>
        <ToneAccentFields lang={lang} tone={tone} accent={accent} onTone={setTone} onAccent={setAccent} />
        <div className="row gap-2 shell-save-row">
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy || !dirty}>{t(lang, 'Salvar', 'Save')}</button>
          {msg
            ? <span className="muted text-sm" role="status">{msg}</span>
            : dirty && <span className="muted text-sm">{t(lang, 'Há mudanças não salvas', 'Unsaved changes')}</span>}
        </div>
      </section>
    </div>
  );
}

function TableSection({ campaign, lang, onChange, onMarkOnboarding }) {
  const { msg, busy, run } = useStatus();
  const tv = screenLink(window.location.origin, campaign.screenToken);
  const copy = async (text, flag) => {
    try { await navigator.clipboard?.writeText(text); } catch { /* sem clipboard */ }
    if (flag) onMarkOnboarding?.(flag);
    run(async () => {}, t(lang, 'Copiado ✓', 'Copied ✓'), lang);
  };
  const rotate = async (kind) => {
    const ok = await confirmDialog({
      message: kind === 'invite'
        ? t(lang, 'Gerar um novo código de convite? O antigo deixa de funcionar.', 'Generate a new invite code? The old one stops working.')
        : t(lang, 'Gerar um novo link do telão? O antigo deixa de funcionar.', 'Generate a new TV link? The old one stops working.'),
      confirmLabel: t(lang, 'Gerar novo', 'Generate new'),
    });
    if (!ok) return;
    run(async () => {
      if (kind === 'invite') await api.rotateInviteCode(campaign.id); else await api.rotateScreenToken(campaign.id);
      onChange?.();
    }, t(lang, 'Novo código gerado ✓', 'New code generated ✓'), lang);
  };
  return (
    <div className="col gap-4 shell-settings-form">
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Convite', 'Invite')}</h3>
        <p className="muted text-sm" style={{ margin: 0 }}>{t(lang, 'Os jogadores entram em Campanhas › Entrar com código.', 'Players join under Campaigns › Join with code.')}</p>
        <div className="invite-code-display">{campaign.inviteCode}</div>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => copy(campaign.inviteCode, 'invite')}>{t(lang, 'Copiar código', 'Copy code')}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => rotate('invite')} disabled={busy}>{t(lang, 'Gerar novo código', 'New code')}</button>
        </div>
      </section>
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Telão', 'TV screen')}</h3>
        <p className="muted text-sm" style={{ margin: 0 }}>{t(lang, 'Abra este link na TV ou tablet que a mesa vê.', 'Open this link on the TV or tablet the table watches.')}</p>
        <input className="input shell-link-input" readOnly value={tv} onFocus={(e) => e.target.select()} aria-label={t(lang, 'Link do telão', 'TV link')} />
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => copy(tv, 'tv')}>{t(lang, 'Copiar link', 'Copy link')}</button>
          <a className="btn btn-ghost btn-sm" href={tv} target="_blank" rel="noreferrer" onClick={() => onMarkOnboarding?.('tv')}>{t(lang, 'Abrir', 'Open')}</a>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => rotate('tv')} disabled={busy}>{t(lang, 'Gerar novo link', 'New link')}</button>
        </div>
      </section>
      {msg && <p className="muted text-sm" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}

function RulesSection({ campaign, lang, onChange }) {
  const st = campaign.state || {};
  const mode = st.levelingMode === 'xp' ? 'xp' : 'milestone';
  const multi = st.allowMulticlass !== false;
  const { msg, busy, run } = useStatus();
  const patch = (p) => run(async () => { await api.patchCampaignState(campaign.id, p); onChange?.(); }, t(lang, 'Salvo ✓', 'Saved ✓'), lang);
  return (
    <div className="col gap-4">
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Como os personagens sobem de nível', 'How characters level up')}</h3>
        <div className="shell-segmented" role="radiogroup">
          {[['milestone', t(lang, 'Marcos', 'Milestones')], ['xp', 'XP']].map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} disabled={busy}
              className={`shell-seg ${mode === id ? 'active' : ''}`} onClick={() => mode !== id && patch({ levelingMode: id })}>{label}</button>
          ))}
        </div>
        <p className="muted text-sm" style={{ margin: 0 }}>
          {mode === 'xp'
            ? t(lang, 'Você distribui XP em Grupo › Jogadores; ao atingir o total, o jogador pode subir.', 'You award XP under Party › Players; at the threshold, the player may level up.')
            : t(lang, 'Você libera a subida de nível quando a história pede (Grupo › Jogadores).', 'You unlock level ups when the story calls for it (Party › Players).')}
        </p>
      </section>
      <label className="rule-toggle">
        <input type="checkbox" checked={multi} disabled={busy} onChange={() => patch({ allowMulticlass: !multi })} />
        <span>{t(lang, 'Permitir multiclasse', 'Allow multiclassing')}</span>
      </label>
      {msg && <p className="muted text-sm" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}

function AdvancedSection({ campaign, lang, onChange, worldCount, worldMax }) {
  const on = !!campaign.advancedDice;
  const [open, setOpen] = useState(false);
  const { msg, busy, run } = useStatus();
  const toggle = () => run(async () => {
    await api.patchCampaign(campaign.id, { advancedDice: !on });
    if (on) setOpen(false);
    onChange?.();
  }, '', lang);
  return (
    <div className="col gap-4">
      <section className="col gap-2">
        <label className="rule-toggle">
          <input type="checkbox" checked={on} disabled={busy} onChange={toggle} />
          <span>{t(lang, 'Dados preparados pelo mestre', 'DM-prepared dice')}</span>
        </label>
        <p className="muted text-sm" style={{ margin: 0 }}>
          {t(lang,
            'Para quem gosta: define os próximos resultados das rolagens feitas pelo app. A maioria das mesas não precisa disto — com dados físicos, o jogador digita o resultado.',
            'For those who want it: sets the next results of rolls made in the app. Most tables do not need this — with physical dice, players type the result.')}
        </p>
        {on && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(v => !v)} aria-expanded={open} style={{ alignSelf: 'flex-start' }}>
            {open ? t(lang, 'Fechar dados preparados', 'Close prepared dice') : t(lang, 'Abrir dados preparados', 'Open prepared dice')}
          </button>
        )}
        {on && open && (
          <Suspense fallback={<p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}>
            <AdvancedDice campaign={campaign} lang={lang} />
          </Suspense>
        )}
        {msg && <p className="muted text-sm" role="status" style={{ margin: 0 }}>{msg}</p>}
      </section>
      {worldCount != null && (
        <section className="col gap-1">
          <h3 className="shell-h3">{t(lang, 'Espaço do mundo', 'World space')}</h3>
          <div className="shell-meter" role="meter" aria-valuemin={0} aria-valuemax={worldMax} aria-valuenow={worldCount}>
            <span style={{ width: `${Math.min(100, (worldCount / (worldMax || 500)) * 100)}%` }} />
          </div>
          <span className="muted text-sm">{t(lang, `${worldCount} de ${worldMax} cartões`, `${worldCount} of ${worldMax} cards`)}</span>
        </section>
      )}
    </div>
  );
}
