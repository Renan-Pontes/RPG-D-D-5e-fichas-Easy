// Cabeçalho da campanha: a "capa" (DESIGN 1.1, plano §2).
// Banner com capa (ou arte padrão), cor de destaque, nome, frase, "Sessão N",
// selo "Ao vivo" e as ações do mestre.
// - Celular (≤ 767): capa compacta em 2 linhas, que rola junto.
//     1ª: ← (44×44) + nome numa linha (toque no nome mostra o nome todo).
//     2ª: "● Ao vivo", "Sessão N", cena (some em < 360) e, à direita,
//         ▶ Começar sessão N / ■ Encerrar com texto e 44 px.
//   Tela, Buscar e Ajustes ficam na folha "Mais" (shell/MoreSheet.jsx).
// - Desktop: a capa larga, com tudo rotulado: Começar/Encerrar, 📺 Tela (abre a
//   janela da Tela já "ao vivo", V4 — o popover de antes saiu: o que estava nele
//   mora na janela, na folha Tela ao vivo e em Jogar › Tela), 🔍 Buscar e ⚙ Ajustes.
// Exporta também <TvPanel>, o conteúdo da Tela da folha "Mais" (celular).
import { useState } from 'react';
import { api } from '../api/client.js';
import { defaultCoverArt, nextSessionNumber, screenLink, t } from './shell-logic.js';
import { frontIcon, frontLabel, screenLine, stageNow } from '../stage/stage-now.js';
import { sendToStage, stageBack, stageClear, stageDark } from '../stage/stage-api.js';
import useStage from '../stage/useStage.js';
import ClosedCampaignBanner from '../plans/ClosedCampaignBanner.jsx';
import './mesa.css';

export default function CampaignHeader({
  campaign, lang, isDM, onBack, onStartSession, onEndSession, onSearch, onSettings, onOpenScreen, busy,
}) {
  const st = campaign.state || {};
  const live = !!st.live;
  const session = parseInt(st.session, 10);
  const cover = api.campaignCoverUrl(campaign) || defaultCoverArt(campaign);
  const [nameOpen, setNameOpen] = useState(false);
  const closed = campaign.status === 'closed';

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
              <button type="button" className="mesa-btn shell-act" onClick={onOpenScreen}
                title={t(lang, 'Abre a janela da Tela ao vivo (tecla T copia o link)', 'Opens the live screen window (T copies the link)')}>
                <span aria-hidden="true">📺</span> <span className="shell-act-txt">{t(lang, 'Tela', 'Screen')}</span>
              </button>
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

/**
 * Conteúdo da Tela da folha "Mais" (e, antes da V4, do popover do PC): "Na tela
 * agora" pela regra única (stage-now.js), ✕ Tirar (volta para o fundo) e
 * 🧹 Limpar a tela, o link (Copiar marca o passo dos primeiros passos; Abrir na
 * TV ↗) e o atalho para o controle completo (Jogar › Tela). Lê o palco do GET da
 * campanha que a casca já faz (nenhum polling próprio).
 */
export function TvPanel({ campaign, lang, onOpened, onChanged, onChoose }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = screenLink(window.location.origin, campaign.screenToken);
  const stage = useStage(campaign);
  const now = stageNow({ stage, combat: campaign.combatNow });
  const line = screenLine({ stage, combat: campaign.combatNow, lang });
  const act = async (send, done) => {
    setBusy(true);
    try { await sendToStage(campaign.id, send, { lang, done, onDone: () => onChanged?.() }); } finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* sem clipboard */ }
    onOpened?.();
  };
  return (
    <div className="shell-tv-panel">
      <div className="shell-pop-row">
        <span className="mesa-eyebrow">{t(lang, 'Na tela agora', 'On screen now')}</span>
        <strong className="shell-pop-now">{now.mode === 'front' ? `${frontIcon(now.front)} ` : ''}{line}</strong>
        {now.waiting && (
          <span className="shell-pop-note muted">{t(lang, 'Depois do combate: ', 'After combat: ')}{frontLabel(now.waiting, lang, { dm: true })}</span>
        )}
        {now.held && (
          <span className="shell-pop-note muted">{t(lang, 'Atrás da Tela escurecida: ', 'Behind the blacked-out screen: ')}{frontLabel(now.held, lang, { dm: true })}</span>
        )}
        {now.gone && (
          <span className="shell-pop-note muted">{frontLabel(now.gone, lang, { dm: true })}{t(lang, ' · não aparece na Tela (oculto ou apagado)', ' · not on screen (hidden or deleted)')}</span>
        )}
        <div className="shell-pop-clear-row">
          {(now.front || now.waiting || now.gone) && (
            <button type="button" className="mesa-btn shell-pop-clear" disabled={busy}
              onClick={() => act(() => stageBack(campaign.id), t(lang, 'Tirado ✓', 'Removed ✓'))}>
              ✕ {t(lang, 'Tirar', 'Remove')}
            </button>
          )}
          {now.mode === 'dark' ? (
            <button type="button" className="mesa-btn shell-pop-clear" disabled={busy}
              onClick={() => act(() => stageDark(campaign.id, false), t(lang, 'Tela acesa ✓', 'Screen lit ✓'))}>
              ◑ {t(lang, 'Acender', 'Light up')}
            </button>
          ) : (now.front || now.waiting || now.gone) ? (
            <button type="button" className="mesa-btn shell-pop-clear" disabled={busy}
              onClick={() => act(() => stageClear(campaign.id), t(lang, 'Tela limpa ✓', 'Screen cleared ✓'))}>
              🧹 {t(lang, 'Limpar a tela', 'Clear screen')}
            </button>
          ) : null}
        </div>
      </div>
      <div className="shell-pop-link mesa-field">
        <label htmlFor={`tv-link-${campaign.id}`} className="mesa-field-label">{t(lang, 'Link da Tela', 'Screen link')}</label>
        <input id={`tv-link-${campaign.id}`} className="input" readOnly value={url} onFocus={(e) => e.target.select()} />
      </div>
      <div className="shell-pop-actions">
        <button type="button" className="mesa-btn is-primary" onClick={copy}>{copied ? t(lang, 'Copiado ✓', 'Copied ✓') : t(lang, 'Copiar link', 'Copy link')}</button>
        <a className="mesa-btn" href={url} target="_blank" rel="noreferrer" onClick={() => onOpened?.()}>{t(lang, 'Abrir na TV', 'Open on TV')} ↗</a>
      </div>
      <p className="shell-pop-help">{t(lang, 'Abra este link no navegador da TV, do notebook ligado na TV ou de um tablet.', 'Open this link in the browser of the TV, of a laptop connected to the TV or of a tablet.')}</p>
      {onChoose ? (
        <button type="button" className="mesa-btn is-quiet shell-pop-choose" onClick={onChoose}>
          {t(lang, 'Abrir o controle completo → Jogar › Tela', 'Open full control → Play › Screen')}
        </button>
      ) : (
        <p className="shell-pop-help">{t(lang, 'O que aparece lá você escolhe em Jogar › Tela.', 'Choose what shows there in Play › Screen.')}</p>
      )}
    </div>
  );
}
