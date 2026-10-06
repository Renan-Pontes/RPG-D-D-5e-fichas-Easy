// Cabeçalho fixo da campanha: a "capa" (DESIGN 1.1).
// Banner com capa (ou arte padrão), cor de destaque, nome, frase, "Sessão N",
// selo "Ao vivo" e as ações do mestre (começar/encerrar sessão, telão, busca, ajustes).
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { defaultCoverArt, nextSessionNumber, screenLink, t } from './shell-logic.js';

export default function CampaignHeader({
  campaign, lang, isDM, onBack, onStartSession, onEndSession, onSearch, onSettings, onTvOpened, onClearScreen, busy,
}) {
  const st = campaign.state || {};
  const live = !!st.live;
  const session = parseInt(st.session, 10);
  const cover = api.campaignCoverUrl(campaign) || defaultCoverArt(campaign);
  const [tvOpen, setTvOpen] = useState(false);

  return (
    <header className={`shell-header ${live ? 'is-live' : ''} ${isDM ? 'is-dm' : ''}`}>
      <div className="shell-cover" aria-hidden="true">
        <img src={cover} alt="" onError={(e) => { e.currentTarget.src = defaultCoverArt(campaign); }} />
      </div>
      <div className="shell-header-inner">
        <div className="shell-title-block">
          <button type="button" className="shell-back" onClick={onBack} aria-label={t(lang, 'Voltar para Campanhas', 'Back to Campaigns')}>
            ← <span className="shell-back-txt">{t(lang, 'Campanhas', 'Campaigns')}</span>
          </button>
          <h1 className="shell-name">{campaign.name}</h1>
          {campaign.tagline && <p className="shell-tagline">{campaign.tagline}</p>}
          <div className="shell-meta">
            <span className={`role-pill role-${campaign.role}`}>{isDM ? t(lang, 'Mestre', 'DM') : t(lang, 'Jogador', 'Player')}</span>
            {Number.isFinite(session) && session > 0 && (
              <span className="shell-session">{t(lang, 'Sessão', 'Session')} {session}</span>
            )}
            {live && <span className="shell-live" role="status"><span className="shell-live-dot" aria-hidden="true" />{t(lang, 'Ao vivo', 'Live')}</span>}
            {st.scene && <span className="shell-scene" title={st.scene}>{st.scene}</span>}
          </div>
        </div>

        {isDM && (
          <div className="shell-actions">
            {live ? (
              <button type="button" className="btn btn-ghost btn-sm shell-act" onClick={onEndSession} disabled={busy}>
                <span aria-hidden="true">■</span> <span className="shell-act-txt">{t(lang, 'Encerrar', 'End')}</span>
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm shell-act shell-start" onClick={onStartSession} disabled={busy}>
                <span aria-hidden="true">▶</span> <span className="shell-act-txt">{t(lang, `Começar sessão ${nextSessionNumber(st)}`, `Start session ${nextSessionNumber(st)}`)}</span>
                <span className="shell-act-short">{t(lang, `Sessão ${nextSessionNumber(st)}`, `Session ${nextSessionNumber(st)}`)}</span>
              </button>
            )}
            <div className="shell-tv-wrap">
              <button type="button" className="btn btn-ghost btn-sm shell-act" onClick={() => setTvOpen(v => !v)}
                aria-expanded={tvOpen} aria-haspopup="dialog" title={t(lang, 'Telão (tecla T copia o link)', 'TV screen (T copies the link)')}>
                <span aria-hidden="true">📺</span> <span className="shell-act-txt">{t(lang, 'Telão', 'TV')}</span>
              </button>
              {tvOpen && (
                <TvPopover campaign={campaign} lang={lang} onClose={() => setTvOpen(false)} onOpened={onTvOpened} onClear={onClearScreen} />
              )}
            </div>
            <button type="button" className="btn btn-ghost btn-sm shell-act" onClick={onSearch}
              title={t(lang, 'Buscar (Ctrl+K)', 'Search (Ctrl+K)')} aria-keyshortcuts="Control+K">
              <span aria-hidden="true">🔍</span> <span className="shell-act-txt">{t(lang, 'Buscar', 'Search')}</span>
            </button>
            <button type="button" className="btn btn-ghost btn-sm shell-act" onClick={onSettings} aria-label={t(lang, 'Ajustes', 'Settings')}>
              <span aria-hidden="true">⚙</span> <span className="shell-act-txt">{t(lang, 'Ajustes', 'Settings')}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function TvPopover({ campaign, lang, onClose, onOpened, onClear }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  const url = screenLink(window.location.origin, campaign.screenToken);
  const card = campaign.screenCard;
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('.shell-tv-wrap')) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const copy = async () => {
    try { await navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* sem clipboard */ }
    onOpened?.();
  };
  return (
    <div className="shell-popover" role="dialog" aria-label={t(lang, 'Telão', 'TV screen')} ref={ref}>
      <div className="shell-pop-row">
        <span className="eyebrow">{t(lang, 'Na tela agora', 'On screen now')}</span>
        <strong className="shell-pop-now">
          {card?.title
            ? <>{card.kindLabel ? <span className="muted">{card.kindLabel} · </span> : null}{card.title}</>
            : t(lang, 'Capa da campanha', 'Campaign cover')}
        </strong>
        {card && onClear && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>{t(lang, 'Voltar para a capa', 'Back to cover')}</button>
        )}
      </div>
      <div className="shell-pop-link">
        <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} aria-label={t(lang, 'Link do telão', 'TV link')} />
      </div>
      <div className="shell-pop-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={copy}>{copied ? t(lang, 'Copiado ✓', 'Copied ✓') : t(lang, 'Copiar link', 'Copy link')}</button>
        <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer" onClick={() => onOpened?.()}>{t(lang, 'Abrir em nova aba', 'Open in new tab')}</a>
      </div>
      <p className="muted text-xs" style={{ margin: 0 }}>{t(lang, 'Abra este link na TV ou tablet que a mesa vê. O que aparece lá você escolhe em Jogar › Telão.', 'Open this link on the TV or tablet the table watches. Choose what shows there in Play › TV screen.')}</p>
    </div>
  );
}
