// Cartão de uma entrada do Mundo (contrato C4 — dono: WP4).
//
// Props:
//   entry    WorldEntryLight ou WorldEntryFull
//   mode     'dm' | 'player'
//   isNew    selo "Novo!" (jogador)
//   onOpen(entry)          clique no cartão
//   onReveal?(entry)       botão 👁 (mestre) — quem chama decide o que revelar
//   showCampaign?          campanha do mestre → o 📺 único (ShowOnTable: oculto
//                          pergunta "Só a imagem"; documento privado diz o motivo)
//   onRevealed?(full)      o 📺 revelou o cartão ("👁 Revelar e mostrar" / "◐ Só o nome")
//   compact  linha horizontal com miniatura (listas, painéis laterais)
//   lang     'pt' | 'en' (padrão 'pt')
//   selected destaca o cartão
//   extra    nó React opcional renderizado no rodapé
//
// <EntryRow> (abaixo): a linha do Atlas do mestre no celular (plano F9): miniatura,
// nome, tipo · subtítulo — frase, selo de visibilidade ESCRITO, 🗝 n/m revelados,
// 🗺 Mapa, sussurro, quando e tags numa linha, e 👁 / 📺 com 48 px à direita.
import { useState } from 'react';
import { worldImageUrl } from './world-api.js';
import ShowOnTable from '../stage/ShowOnTable.jsx';
import { cardShowMode, privateShort } from '../stage/stage-now.js';
import { KIND_META, VIS_META, defaultArt, kindLabel, secretsText, subtitleOf, t, visLabel, visShort } from './world-model.js';
import { entryWhispers } from './living/living-logic.js';
import './world-styles.css';
import './living/living.css';

/** Mestre: "a mesa sussurrou sobre isto" com os ícones das reações dos jogadores. */
function Whisper({ entry, lang }) {
  const w = entryWhispers(entry);
  if (!w.any) return null;
  return (
    <div className="lv-whisper" title={t(lang, 'Reações dos jogadores a este cartão', 'Player reactions to this card')}>
      <span>{t(lang, 'a mesa sussurrou sobre isto', 'the table whispered about this')}</span>
      <span className="lv-whisper-icons">
        {w.icons.map(i => (
          <span key={i.id}>{i.n <= 3 ? i.icon.repeat(i.n) : <>{i.icon}<small>×{i.n}</small></>}</span>
        ))}
      </span>
    </div>
  );
}

// small: só o ícone (o nome fica para o leitor de tela); short: o nome curto escrito
// ("Só o nome"), para as linhas estreitas. O nome por extenso fica no title (mouse).
export function VisibilitySeal({ visibility, lang = 'pt', small = false, short = false }) {
  const v = VIS_META[visibility] ? visibility : 'hidden';
  return (
    <span className={`wl-seal wl-seal-${v}${small ? ' wl-seal-sm' : ''}${short ? ' wl-seal-short' : ''}`} title={visLabel(v, lang)}>
      <span aria-hidden="true" className="wl-seal-ico">{VIS_META[v].icon}</span>
      {!small && <span className="wl-seal-txt">{short ? visShort(v, lang) : visLabel(v, lang)}</span>}
      {small && <span className="wl-sr">{visLabel(v, lang)}</span>}
      {short && visShort(v, lang) !== visLabel(v, lang) && <span className="wl-sr"> ({visLabel(v, lang)})</span>}
    </span>
  );
}

/** "a mesa sussurrou": a versão de uma linha (ícones das reações), para a linha do celular. */
function WhisperShort({ entry, lang }) {
  const w = entryWhispers(entry);
  if (!w.any) return null;
  return (
    <span className="wl-lrow-whisper">
      <span className="wl-sr">{t(lang, 'A mesa sussurrou: ', 'The table whispered: ')}</span>
      <span aria-hidden="true">💬</span>
      {w.icons.map(i => <span key={i.id}>{i.icon}{i.n > 1 ? `×${i.n}` : ''}</span>)}
    </span>
  );
}

/**
 * Linha do cartão no Atlas do mestre (celular, ≤ 767 px). O toque na linha abre o
 * editor. `move` = {canUp, canDown, onUp, onDown, grid?}: modo Ordenar — as ações dão
 * lugar a ↑ ↓ de 48 px e o toque na linha não abre nada.
 */
export function EntryRow({ entry, lang = 'pt', selected = false, onOpen, onReveal, showCampaign = null, onRevealed, move = null }) {
  if (!entry) return null;
  const meta = KIND_META[entry.kind] || KIND_META.lore;
  const vis = entry.visibility || 'hidden';
  const sub = subtitleOf(entry, lang);
  const secrets = secretsText(entry, lang, true);
  const priv = !!showCampaign && cardShowMode(entry) === 'private';
  const whyId = `wl-why-${entry.id}`;
  const open = () => { if (!move) onOpen?.(entry); };
  const onKey = (e) => { if (!move && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); open(); } };
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  const line2 = [kindLabel(entry.kind, lang), sub].filter(Boolean).join(' · ');
  return (
    <div className={`wl-lrow wl-vis-${vis}${selected ? ' is-selected' : ''}${move ? ' is-moving' : ''}`} style={{ '--wl-kind': meta.color }}
      data-entry={entry.id}
      {...(move ? {} : { role: 'button', tabIndex: 0, onClick: open, onKeyDown: onKey, 'aria-label': `${entry.name} — ${kindLabel(entry.kind, lang)} · ${visLabel(vis, lang)}` })}>
      <span className="wl-lrow-pic"><EntryImage entry={entry} className="wl-thumb-img" /></span>
      <span className="wl-lrow-main">
        <span className="wl-lrow-name">{entry.name}</span>
        <span className="wl-lrow-sub">
          <span aria-hidden="true">{meta.icon}</span> {line2}
          {entry.summary ? <span className="wl-lrow-sum"> — {entry.summary}</span> : null}
        </span>
        <span className="wl-lrow-meta">
          <VisibilitySeal visibility={vis} lang={lang} short />
          {priv && <span className="wl-lrow-why" id={whyId}>📺 {privateShort(entry, showCampaign.members, lang)}</span>}
          {secrets && <span className="wl-lrow-secrets">{secrets}</span>}
          {entry.isMap && <span className="wl-lrow-map">🗺 {t(lang, 'Mapa', 'Map')}</span>}
          <WhisperShort entry={entry} lang={lang} />
          {entry.whenLabel && <span className="wl-when">⌛ {entry.whenLabel}</span>}
          {(entry.tags || []).slice(0, 2).map(tag => <span key={tag} className="wl-lrow-tag">#{tag}</span>)}
        </span>
      </span>
      {move ? (
        <span className="wl-lrow-act">
          <MoveButtons move={move} lang={lang} name={entry.name} />
        </span>
      ) : (onReveal || showCampaign) ? (
        <span className="wl-lrow-act">
          {onReveal && (
            <button type="button" className="wl-lrow-btn" onClick={stop(() => onReveal(entry))}
              aria-label={`${vis === 'hidden' ? t(lang, 'Revelar', 'Reveal') : t(lang, 'Quem vê', 'Who sees')}: ${entry.name}`}>
              <span aria-hidden="true" className="wl-lrow-btn-ico">👁</span>
              <span aria-hidden="true" className="wl-lrow-btn-txt">{vis === 'hidden' ? t(lang, 'Revelar', 'Reveal') : t(lang, 'Quem vê', 'Who sees')}</span>
            </button>
          )}
          {showCampaign && (priv ? (
            <button type="button" className="wl-lrow-btn" disabled aria-describedby={whyId}
              aria-label={`${t(lang, 'Mostrar na Tela', 'Show on screen')}: ${entry.name}`}>
              <span aria-hidden="true" className="wl-lrow-btn-ico">📺</span>
              <span aria-hidden="true" className="wl-lrow-btn-txt">{t(lang, 'Mostrar', 'Show')}</span>
            </button>
          ) : (
            <ShowOnTable campaign={showCampaign} target={{ kind: 'card', entry }} lang={lang} className="wl-lrow-btn"
              onRevealed={onRevealed} ariaLabel={`${t(lang, 'Mostrar na Tela', 'Show on screen')}: ${entry.name}`}>
              <span aria-hidden="true" className="wl-lrow-btn-ico">📺</span>
              <span aria-hidden="true" className="wl-lrow-btn-txt">{t(lang, 'Mostrar', 'Show')}</span>
            </ShowOnTable>
          ))}
        </span>
      ) : null}
    </div>
  );
}

/**
 * ↑ ↓ do modo Ordenar (48 px): na lista sobem e descem; na grade (`move.grid`) vão
 * para antes e depois na ordem (◀ ▶). O botão sem para onde ir fica apagado com o
 * motivo no rótulo ("Já é o primeiro").
 */
export function MoveButtons({ move, lang = 'pt', name = '' }) {
  const grid = !!move.grid;
  const up = grid ? t(lang, 'Antes', 'Earlier') : t(lang, 'Subir', 'Move up');
  const down = grid ? t(lang, 'Depois', 'Later') : t(lang, 'Descer', 'Move down');
  return (
    <>
      <button type="button" className="wl-move-btn" data-move="up" disabled={!move.canUp || move.busy}
        onClick={(e) => { e.stopPropagation(); move.onUp?.(e); }}
        aria-label={`${up}: ${name}${move.canUp ? '' : ` — ${t(lang, 'já é o primeiro', 'already first')}`}`}>
        <span aria-hidden="true">{grid ? '◀' : '↑'}</span>
        <span aria-hidden="true" className="wl-move-txt">{up}</span>
      </button>
      <button type="button" className="wl-move-btn" data-move="down" disabled={!move.canDown || move.busy}
        onClick={(e) => { e.stopPropagation(); move.onDown?.(e); }}
        aria-label={`${down}: ${name}${move.canDown ? '' : ` — ${t(lang, 'já é o último', 'already last')}`}`}>
        <span aria-hidden="true">{grid ? '▶' : '↓'}</span>
        <span aria-hidden="true" className="wl-move-txt">{down}</span>
      </button>
    </>
  );
}

/** Imagem do cartão com arte padrão por tipo (e troca para a arte se a imagem falhar). */
export function EntryImage({ entry, className = '', alt = '' }) {
  const own = worldImageUrl(entry);
  const [failed, setFailed] = useState(false);
  const src = own && !failed ? own : defaultArt(entry);
  const isDefault = !own || failed;
  return (
    <img
      className={`${className} ${isDefault ? 'wl-img-default' : ''}`}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => { if (own && !failed) setFailed(true); }}
    />
  );
}

export default function EntryCard({
  entry, mode = 'dm', isNew = false, onOpen, onReveal, showCampaign = null, onRevealed, compact = false, lang = 'pt', selected = false, extra = null,
}) {
  if (!entry) return null;
  const dm = mode === 'dm';
  const meta = KIND_META[entry.kind] || KIND_META.lore;
  const vis = entry.visibility || 'hidden';
  const rumor = !dm && vis === 'partial';
  const sub = subtitleOf(entry, lang);
  const secretsTotal = entry.secretsCount || 0;
  const open = () => onOpen && onOpen(entry);
  const onKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); open(); } };
  const stop = (fn) => (e) => { e.stopPropagation(); fn(entry); };
  const style = { '--wl-kind': meta.color };

  const actions = dm && (onReveal || showCampaign) ? (
    <div className="wl-card-actions">
      {onReveal && (
        <button type="button" className="wl-act" onClick={stop(onReveal)}
          title={vis === 'hidden' ? t(lang, 'Revelar aos jogadores', 'Reveal to players') : t(lang, 'Mudar quem vê este cartão', 'Change who sees this card')}>
          <span aria-hidden="true">👁</span> {vis === 'hidden' ? t(lang, 'Revelar', 'Reveal') : t(lang, 'Quem vê…', 'Who sees…')}
        </button>
      )}
      {showCampaign && (
        <ShowOnTable campaign={showCampaign} target={{ kind: 'card', entry }} lang={lang} className="wl-act" reason="short"
          onRevealed={onRevealed} ariaLabel={`${t(lang, 'Mostrar na Tela', 'Show on screen')}: ${entry.name}`}>
          <span aria-hidden="true">📺</span> {t(lang, 'Mostrar', 'Show')}
        </ShowOnTable>
      )}
    </div>
  ) : null;

  if (compact) {
    return (
      <div className={`wl-card wl-card-compact wl-vis-${vis}${selected ? ' is-selected' : ''}${rumor ? ' is-rumor' : ''}`} style={style}
        role="button" tabIndex={0} onClick={open} onKeyDown={onKey} aria-label={entry.name}>
        <div className="wl-thumb"><EntryImage entry={entry} className="wl-thumb-img" /></div>
        <div className="wl-compact-body">
          <div className="wl-compact-top">
            <span className="wl-kind-dot" aria-hidden="true">{meta.icon}</span>
            <span className="wl-compact-name">{entry.name}</span>
            {isNew && <span className="wl-new wl-new-inline">{t(lang, 'Novo!', 'New!')}</span>}
          </div>
          <div className="wl-compact-sub">{sub || entry.summary || kindLabel(entry.kind, lang)}</div>
        </div>
        {dm && <VisibilitySeal visibility={vis} lang={lang} small />}
        {actions}
        {extra}
      </div>
    );
  }

  return (
    <article className={`wl-card wl-vis-${vis}${selected ? ' is-selected' : ''}${rumor ? ' is-rumor' : ''}${entry.isMap ? ' is-map' : ''}`} style={style}
      role="button" tabIndex={0} onClick={open} onKeyDown={onKey} aria-label={entry.name}>
      <div className="wl-card-art">
        <EntryImage entry={entry} className="wl-card-img" />
        <div className="wl-card-art-fade" aria-hidden="true" />
        <div className="wl-card-top">
          <span className="wl-kind-badge"><span aria-hidden="true">{meta.icon}</span> {kindLabel(entry.kind, lang)}</span>
          {dm && <VisibilitySeal visibility={vis} lang={lang} />}
        </div>
        {entry.isMap && <span className="wl-map-badge" title={t(lang, 'Tem mapa', 'Has a map')}>🗺 {t(lang, 'Mapa', 'Map')}</span>}
        {isNew && <span className="wl-new">{t(lang, 'Novo!', 'New!')}</span>}
        {rumor && <span className="wl-rumor-tag">{t(lang, 'Rumores…', 'Rumors…')}</span>}
      </div>
      <div className="wl-card-body">
        <h3 className="wl-card-name">{entry.name}</h3>
        {sub && <div className="wl-card-sub">{sub}</div>}
        {entry.summary
          ? <p className="wl-card-summary">{entry.summary}</p>
          : dm && <p className="wl-card-summary wl-muted">{t(lang, 'Sem frase ainda — abra o cartão para escrever.', 'No tagline yet — open the card to write one.')}</p>}
        <div className="wl-card-foot">
          {secretsTotal > 0 && (
            <span className="wl-secrets" title={t(lang, 'Segredos revelados / total', 'Secrets revealed / total')}>
              {secretsText(entry, lang, dm)}
            </span>
          )}
          {(entry.tags || []).slice(0, 3).map(tag => <span key={tag} className="wl-tag">#{tag}</span>)}
          {entry.whenLabel && <span className="wl-when">⌛ {entry.whenLabel}</span>}
        </div>
        {dm && <Whisper entry={entry} lang={lang} />}
        {actions}
        {extra}
      </div>
    </article>
  );
}
