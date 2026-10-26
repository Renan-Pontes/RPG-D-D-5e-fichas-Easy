// Cabeçalho da campanha: a "capa" (DESIGN 1.1, plano §2).
// Banner com capa (ou arte padrão), cor de destaque, nome, frase, "Sessão N",
// selo "Ao vivo" e as ações do mestre.
// - Celular (≤ 767): capa compacta em 2 linhas, que rola junto.
//     1ª: ← (44×44) + nome numa linha (toque no nome mostra o nome todo).
//     2ª: "● Ao vivo", "Sessão N", cena (some em < 360) e, à direita,
//         ▶ Começar sessão N / ■ Encerrar com texto e 44 px.
//   Telão, Buscar e Ajustes ficam na folha "Mais" (shell/MoreSheet.jsx).
// - Desktop: a capa larga, com tudo rotulado: Começar/Encerrar, 📺 Telão
//   (popover com ✕), 🔍 Buscar e ⚙ Ajustes.
// Exporta também <TvPanel>, o conteúdo do Telão (o popover e a folha "Mais"
// usam o mesmo).
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { defaultCoverArt, nextSessionNumber, screenLink, t } from './shell-logic.js';
import { getScreen } from '../play/play-api.js';
import { cardKind, screenNow } from '../play/screen-now.js';
import ClosedCampaignBanner from '../plans/ClosedCampaignBanner.jsx';
import './mesa.css';

export default function CampaignHeader({
  campaign, lang, isDM, onBack, onStartSession, onEndSession, onSearch, onSettings, onTvOpened, onClearScreen, onChooseScreen, busy,
}) {
  const st = campaign.state || {};
  const live = !!st.live;
  const session = parseInt(st.session, 10);
  const cover = api.campaignCoverUrl(campaign) || defaultCoverArt(campaign);
  const [tvOpen, setTvOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const tvBtn = useRef(null);
  const closed = campaign.status === 'closed';
  const closeTv = (refocus) => {
    setTvOpen(false);
    if (refocus) { try { tvBtn.current?.focus({ preventScroll: true }); } catch { /* ok */ } }
  };

  return (
    <header className={`shell-header ${live ? 'is-live' : ''} ${isDM ? 'is-dm' : 'is-player'} ${closed ? 'is-closed' : ''} ${nameOpen ? 'is-name-open' : ''}`}>
      <div className="shell-cover" aria-hidden="true">
        <img src={cover} alt="" onError={(e) => { e.currentTarget.src = defaultCoverArt(campaign); }} />
      </div>
      <div className="shell-header-inner">
        <button type="button" className="shell-back" onClick={onBack} aria-label={t(lang, 'Voltar para Campanhas', 'Back to Campaigns')}>
          <span aria-hidden="true">←</span> <span className="shell-back-txt">{t(lang, 'Campanhas', 'Campaigns')}</span>
        </button>
        {/* No celular o nome fica numa linha; tocar nele mostra o nome inteiro (e a frase). */}
        <h1 className="shell-name" onClick={() => setNameOpen(v => !v)}>
          <span className="mesa-foil">{campaign.name}</span>
        </h1>
        {campaign.tagline && <p className="shell-tagline">{campaign.tagline}</p>}
        <div className="shell-meta">
          <span className={`role-pill role-${campaign.role}`}>{isDM ? t(lang, 'Mestre', 'DM') : t(lang, 'Jogador', 'Player')}</span>
          {live && <span className="shell-live" role="status"><span className="shell-live-dot" aria-hidden="true" />{t(lang, 'Ao vivo', 'Live')}</span>}
          {Number.isFinite(session) && session > 0 && (
            <span className="shell-session">{t(lang, 'Sessão', 'Session')} {session}</span>
          )}
          {closed && <span className="pl-tag pl-tag-closed shell-closed-tag" style={{ marginLeft: 0 }}>⌛ {t(lang, 'Encerrada', 'Closed')}</span>}
          {st.scene && <span className="shell-scene" title={st.scene}>{st.scene}</span>}
        </div>

        {isDM && (
          <div className="shell-actions">
            {closed ? null : live ? (
              <button type="button" className="mesa-btn shell-act shell-end-btn" onClick={onEndSession} disabled={busy}>
                <span aria-hidden="true">■</span> <span className="shell-act-txt">{t(lang, 'Encerrar', 'End')}</span>
              </button>
            ) : (
              <button type="button" className="mesa-btn is-primary shell-act shell-start" onClick={onStartSession} disabled={busy}>
                <span aria-hidden="true">▶</span> <span className="shell-act-txt">{t(lang, `Começar sessão ${nextSessionNumber(st)}`, `Start session ${nextSessionNumber(st)}`)}</span>
              </button>
            )}
            <div className="shell-tv-wrap shell-desk-only">
              <button type="button" ref={tvBtn} className="mesa-btn shell-act" onClick={() => setTvOpen(v => !v)}
                aria-expanded={tvOpen} aria-haspopup="dialog" title={t(lang, 'Telão (tecla T copia o link)', 'TV screen (T copies the link)')}>
                <span aria-hidden="true">📺</span> <span className="shell-act-txt">{t(lang, 'Telão', 'TV')}</span>
              </button>
              {tvOpen && (
                <TvPopover campaign={campaign} lang={lang} onClose={closeTv} onOpened={onTvOpened} onClear={onClearScreen}
                  onChoose={onChooseScreen ? () => { setTvOpen(false); onChooseScreen(); } : undefined} />
              )}
            </div>
            <button type="button" className="mesa-btn shell-act shell-desk-only" onClick={onSearch}
              title={t(lang, 'Buscar (Ctrl+K)', 'Search (Ctrl+K)')} aria-keyshortcuts="Control+K">
              <span aria-hidden="true">🔍</span> <span className="shell-act-txt">{t(lang, 'Buscar', 'Search')}</span>
            </button>
            <button type="button" className="mesa-btn shell-act shell-desk-only" onClick={onSettings}>
              <span aria-hidden="true">⚙</span> <span className="shell-act-txt">{t(lang, 'Ajustes', 'Settings')}</span>
            </button>
          </div>
        )}
      </div>
      {closed && (
        <div className="shell-header-closed">
          <ClosedCampaignBanner campaign={campaign} lang={lang} isDM={isDM} />
        </div>
      )}
    </header>
  );
}

/** Popover do Telão (desktop): o TvPanel com ✕; fecha também com Esc e clique fora. */
function TvPopover({ campaign, lang, onClose, onOpened, onClear, onChoose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('.shell-tv-wrap')) onClose(false); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(true); };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="shell-popover" role="dialog" aria-labelledby="shell-pop-title" ref={ref}>
      <div className="shell-pop-head">
        <span className="mesa-gem" aria-hidden="true" />
        <h2 id="shell-pop-title" className="shell-pop-title"><span className="mesa-foil">{t(lang, 'Telão', 'TV screen')}</span></h2>
        <button type="button" className="mesa-icon-btn shell-pop-x" onClick={() => onClose(true)}
          aria-label={t(lang, 'Fechar', 'Close')} title={t(lang, 'Fechar (Esc)', 'Close (Esc)')}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <TvPanel campaign={campaign} lang={lang} onOpened={onOpened} onClear={onClear} onChoose={onChoose} />
    </div>
  );
}

/**
 * Conteúdo do Telão: "Na tela agora", Tirar o cartão / Voltar para a capa,
 * link (Copiar marca o passo dos primeiros passos; Abrir em nova aba) e o
 * atalho para escolher o que mostrar (Jogar › Telão).
 * Lê o MESMO estado da TV (/api/screen/<token>) a cada 4 s, só enquanto está
 * montado (popover ou folha "Mais" abertos).
 */
export function TvPanel({ campaign, lang, onOpened, onClear, onChoose }) {
  const [copied, setCopied] = useState(false);
  const url = screenLink(window.location.origin, campaign.screenToken);
  const [screen, setScreen] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!campaign.screenToken) return undefined;
    let alive = true;
    getScreen(campaign.screenToken).then(r => { if (alive) setScreen(r); }).catch(() => {});
    const tm = setTimeout(() => setTick(n => n + 1), 4000);
    return () => { alive = false; clearTimeout(tm); };
  }, [campaign.screenToken, tick]);
  const card = screen ? (screen.card || null) : (campaign.screenCard || null);
  const now = screenNow({ combat: screen?.combat, card });
  const clear = async () => { await onClear?.(); setTick(n => n + 1); };
  const copy = async () => {
    try { await navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* sem clipboard */ }
    onOpened?.();
  };
  return (
    <div className="shell-tv-panel">
      <div className="shell-pop-row">
        <span className="mesa-eyebrow">{t(lang, 'Na tela agora', 'On screen now')}</span>
        <strong className="shell-pop-now">
          {now.mode === 'combat'
            ? <>⚔ {t(lang, 'Combate', 'Combat')}{now.round ? <span className="muted"> · {t(lang, 'rodada', 'round')} {now.round}</span> : null}</>
            : now.card?.title
              ? <>{cardKind(now.card, lang) ? <span className="muted">{cardKind(now.card, lang)} · </span> : null}{now.card.title}</>
              : t(lang, 'Capa da campanha', 'Campaign cover')}
        </strong>
        {now.overlay && (
          <span className="shell-pop-note">
            <span className="muted">{t(lang, 'Junto, ao lado: ', 'Alongside: ')}</span>
            {cardKind(now.overlay, lang) ? `${cardKind(now.overlay, lang)} · ` : ''}{now.overlay.title}
          </span>
        )}
        {now.waiting && (
          <span className="shell-pop-note muted">{t(lang, 'Depois do combate: ', 'After combat: ')}{now.waiting.title}</span>
        )}
        {card && onClear && (
          <button type="button" className="mesa-btn shell-pop-clear" onClick={clear}>
            {now.mode === 'combat' ? t(lang, 'Tirar o cartão', 'Remove the card') : t(lang, 'Voltar para a capa', 'Back to cover')}
          </button>
        )}
      </div>
      <div className="shell-pop-link mesa-field">
        <label htmlFor={`tv-link-${campaign.id}`} className="mesa-field-label">{t(lang, 'Link do telão', 'TV link')}</label>
        <input id={`tv-link-${campaign.id}`} className="input" readOnly value={url} onFocus={(e) => e.target.select()} />
      </div>
      <div className="shell-pop-actions">
        <button type="button" className="mesa-btn is-primary" onClick={copy}>{copied ? t(lang, 'Copiado ✓', 'Copied ✓') : t(lang, 'Copiar link', 'Copy link')}</button>
        <a className="mesa-btn" href={url} target="_blank" rel="noreferrer" onClick={() => onOpened?.()}>{t(lang, 'Abrir em nova aba', 'Open in new tab')}</a>
      </div>
      <p className="shell-pop-help">{t(lang, 'Abra este link na TV ou tablet que a mesa vê.', 'Open this link on the TV or tablet the table watches.')}</p>
      {onChoose ? (
        <button type="button" className="mesa-btn is-quiet shell-pop-choose" onClick={onChoose}>
          {t(lang, 'Escolher o que mostrar → Jogar › Telão', 'Choose what to show → Play › TV screen')}
        </button>
      ) : (
        <p className="shell-pop-help">{t(lang, 'O que aparece lá você escolhe em Jogar › Telão.', 'Choose what shows there in Play › TV screen.')}</p>
      )}
    </div>
  );
}
