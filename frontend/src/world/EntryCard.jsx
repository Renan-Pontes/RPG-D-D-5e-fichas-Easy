// Cartão de uma entrada do Mundo (contrato C4 — dono: WP4).
//
// Props:
//   entry    WorldEntryLight ou WorldEntryFull
//   mode     'dm' | 'player'
//   isNew    selo "Novo!" (jogador)
//   onOpen(entry)          clique no cartão
//   onReveal?(entry)       botão 👁 (mestre) — quem chama decide o que revelar
//   onShow?(entry)         botão 📺 "Mostrar no telão" (mestre; desabilitado se oculto)
//   compact  linha horizontal com miniatura (listas, painéis laterais)
//   lang     'pt' | 'en' (padrão 'pt')
//   selected destaca o cartão
//   extra    nó React opcional renderizado no rodapé
import { useState } from 'react';
import { worldImageUrl } from './world-api.js';
import { KIND_META, VIS_META, defaultArt, kindLabel, subtitleOf, t, visLabel } from './world-model.js';
import './world-styles.css';

export function VisibilitySeal({ visibility, lang = 'pt', small = false }) {
  const v = VIS_META[visibility] ? visibility : 'hidden';
  return (
    <span className={`wl-seal wl-seal-${v}${small ? ' wl-seal-sm' : ''}`} title={visLabel(v, lang)}>
      <span aria-hidden="true" className="wl-seal-ico">{VIS_META[v].icon}</span>
      {!small && <span className="wl-seal-txt">{visLabel(v, lang)}</span>}
      {small && <span className="wl-sr">{visLabel(v, lang)}</span>}
    </span>
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
  entry, mode = 'dm', isNew = false, onOpen, onReveal, onShow, compact = false, lang = 'pt', selected = false, extra = null,
}) {
  if (!entry) return null;
  const dm = mode === 'dm';
  const meta = KIND_META[entry.kind] || KIND_META.lore;
  const vis = entry.visibility || 'hidden';
  const rumor = !dm && vis === 'partial';
  const sub = subtitleOf(entry, lang);
  const secretsTotal = entry.secretsCount || 0;
  const secretsShown = dm ? (entry.secretsRevealed || 0) : secretsTotal;
  const open = () => onOpen && onOpen(entry);
  const onKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); open(); } };
  const stop = (fn) => (e) => { e.stopPropagation(); fn(entry); };
  const style = { '--wl-kind': meta.color };

  const actions = dm && (onReveal || onShow) ? (
    <div className="wl-card-actions">
      {onReveal && (
        <button type="button" className="wl-act" onClick={stop(onReveal)} title={t(lang, 'Revelar aos jogadores', 'Reveal to players')}>
          <span aria-hidden="true">👁</span> {t(lang, 'Revelar', 'Reveal')}
        </button>
      )}
      {onShow && (
        <button type="button" className="wl-act" onClick={stop(onShow)} disabled={vis === 'hidden'}
          title={vis === 'hidden' ? t(lang, 'Revele antes de mostrar no telão', 'Reveal before showing on screen') : t(lang, 'Mostrar no telão', 'Show on screen')}>
          <span aria-hidden="true">📺</span> {t(lang, 'Mostrar', 'Show')}
        </button>
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
        <span className="wl-kind-badge"><span aria-hidden="true">{meta.icon}</span> {kindLabel(entry.kind, lang)}</span>
        {dm && <VisibilitySeal visibility={vis} lang={lang} />}
        {entry.isMap && <span className="wl-map-badge" title={t(lang, 'Tem mapa', 'Has a map')}>🗺 {t(lang, 'Mapa', 'Map')}</span>}
        {isNew && <span className="wl-new">{t(lang, 'Novo!', 'New!')}</span>}
        {rumor && <span className="wl-rumor-tag">{t(lang, 'Rumores…', 'Rumors…')}</span>}
      </div>
      <div className="wl-card-body">
        <h3 className="wl-card-name">{entry.name}</h3>
        {sub && <div className="wl-card-sub">{sub}</div>}
        {entry.summary
          ? <p className="wl-card-summary">{entry.summary}</p>
          : dm && <p className="wl-card-summary wl-muted">{t(lang, 'Sem frase ainda — toque para escrever.', 'No tagline yet — tap to write one.')}</p>}
        <div className="wl-card-foot">
          {secretsTotal > 0 && (
            <span className="wl-secrets" title={t(lang, 'Segredos revelados / total', 'Secrets revealed / total')}>
              🗝 {dm ? `${secretsShown}/${secretsTotal}` : secretsShown} {t(lang, secretsTotal === 1 && !dm ? 'segredo' : 'segredos', secretsTotal === 1 && !dm ? 'secret' : 'secrets')}
            </span>
          )}
          {(entry.tags || []).slice(0, 3).map(tag => <span key={tag} className="wl-tag">#{tag}</span>)}
          {entry.whenLabel && <span className="wl-when">⌛ {entry.whenLabel}</span>}
        </div>
        {actions}
        {extra}
      </div>
    </article>
  );
}
