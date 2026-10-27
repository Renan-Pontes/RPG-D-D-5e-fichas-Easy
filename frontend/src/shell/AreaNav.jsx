// Navegação das áreas: abas no desktop e barra inferior fixa no celular.
//   Celular, mestre:  Mundo · Preparar · Jogar · Grupo · Mais (folha "Mesa do mestre")
//   Celular, jogador: Mesa · Mundo · Crônica · Grupo · Buscar
// Também exporta <SubChips>, o segmentado das subvistas (as áreas usam para
// ficarem com o mesmo visual da casca).
import { useRef } from 'react';
import { areaLabel, SUB_ICONS, subLabel, subShortLabel, t } from './shell-logic.js';
import useScrollEdges from './useScrollEdges.js';
import { OfflineNote } from '../stage/TableBar.jsx';
import './mesa.css';

/**
 * onMore: 5ª casa "Mais" (mestre) — abre a folha; moreOpen marca a casa.
 * onSearch: 5ª casa "Buscar" (quando não há onMore: o jogador).
 * marks: {área: [{k, icon, label}]} — selos que não são número (Jogar: "● ao vivo"
 * e "⚔" com combate ativo, V4); o ícone com o texto para o leitor de tela.
 * No PC, com a mesa sem resposta há 8 s, as abas (presas no topo) terminam em
 * "⟳ Sem conexão há N s" (OfflineNote; só no mestre, que tem a loja da mesa).
 */
export default function AreaNav({ areas, active, onSelect, onSearch, onMore, moreOpen = false, lang, badges = {}, marks = {}, showKeys = false }) {
  const markSpans = (id, cls) => (marks[id] || []).map(m => (
    <span key={m.k} className={`shell-mark is-${m.k} ${cls}`}>
      <span aria-hidden="true">{m.icon}</span><span className="sr-only"> {m.label}</span>
    </span>
  ));
  return (
    <>
      <nav className="shell-areas" aria-label={t(lang, 'Áreas da campanha', 'Campaign areas')}>
       <div className="shell-areas-tabs" role="tablist" aria-label={t(lang, 'Áreas da campanha', 'Campaign areas')}>
        {areas.map((a, i) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            id={`area-tab-${a.id}`}
            aria-selected={active === a.id}
            aria-controls="shell-panel"
            className={`shell-area-tab ${active === a.id ? 'active' : ''}`}
            onClick={() => onSelect(a.id)}
            aria-keyshortcuts={showKeys ? String(i + 1) : undefined}
            title={showKeys ? t(lang, `Atalho: tecla ${i + 1}`, `Shortcut: key ${i + 1}`) : undefined}
          >
            <span className="shell-area-ico" aria-hidden="true">{a.icon}</span>
            <span className="shell-area-label">{areaLabel(a, lang)}</span>
            {markSpans(a.id, 'is-tab')}
            {badges[a.id] > 0 && <span className="shell-badge" aria-label={t(lang, `${badges[a.id]} novo(s)`, `${badges[a.id]} new`)}>{badges[a.id]}</span>}
            {showKeys && <kbd className="shell-area-key" aria-hidden="true">{i + 1}</kbd>}
          </button>
        ))}
       </div>
        <OfflineNote lang={lang} className="is-areas" />
      </nav>

      <nav className="shell-bottom-bar no-print" aria-label={t(lang, 'Áreas da campanha', 'Campaign areas')}>
        {areas.map(a => (
          <button
            key={a.id}
            type="button"
            className={`shell-bottom-btn ${active === a.id && !moreOpen ? 'active' : ''}`}
            aria-current={active === a.id ? 'page' : undefined}
            onClick={() => onSelect(a.id)}
          >
            <span className="shell-bottom-ico" aria-hidden="true">{a.icon}</span>
            <span className="shell-bottom-label">{areaLabel(a, lang)}</span>
            {(marks[a.id] || []).length > 0 && <span className="shell-marks">{markSpans(a.id, 'is-bottom')}</span>}
            {badges[a.id] > 0 && <span className="shell-badge shell-badge-dot">{badges[a.id]}</span>}
          </button>
        ))}
        {onMore ? (
          <button type="button" className={`shell-bottom-btn shell-bottom-more ${moreOpen ? 'active' : ''}`} onClick={onMore}
            aria-haspopup="dialog" aria-expanded={moreOpen}
            aria-label={t(lang, 'Mais: sessão, busca, Tela e ajustes', 'More: session, search, screen and settings')}>
            <span className="shell-bottom-ico" aria-hidden="true">☰</span>
            <span className="shell-bottom-label" aria-hidden="true">{t(lang, 'Mais', 'More')}</span>
          </button>
        ) : onSearch && (
          <button type="button" className="shell-bottom-btn" onClick={onSearch} aria-label={t(lang, 'Buscar', 'Search')}>
            <span className="shell-bottom-ico" aria-hidden="true">🔍</span>
            <span className="shell-bottom-label">{t(lang, 'Buscar', 'Search')}</span>
          </button>
        )}
      </nav>
    </>
  );
}

/**
 * Segmentado das subvistas de uma área — o MESMO em Mundo, Preparar, Jogar,
 * Grupo, no Mundo do jogador e nas telas antigas (Fallbacks). Plano §4.2:
 *  - celular (≤ 767): largura total, preso no topo ao rolar, colunas iguais,
 *    ícone em cima e rótulo curto embaixo (≤ 480), 48 px, selo no canto;
 *  - se ainda não couber: rola de lado, com degradê na ponta que tem mais e
 *    rolagem até a subvista ativa (useScrollEdges);
 *  - desktop: o segmentado de sempre, com 44 px.
 * O rótulo longo continua para o leitor de tela. Mesmas props de antes:
 *   labels: {sub: texto} substitui o rótulo; icons: {sub: '🗺'|null} idem p/ ícone;
 *   badges: {sub: n}; badgeLabels: {sub: texto do selo para o leitor de tela}.
 */
export function SubChips({ subs, active, onSelect, lang, labels = {}, icons = {}, badges = {}, badgeLabels = {}, ariaLabel }) {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const show = !!subs && subs.length >= 2;
  useScrollEdges(trackRef, { active, enabled: show, count: show ? subs.length : 0 });
  if (!show) return null;
  // Celular: com a faixa presa no topo, a troca manteria a rolagem e a nova
  // subvista abriria no meio. Volta para onde a faixa fica no fluxo: a subvista
  // começa logo abaixo dela, em todas as áreas. Rola já (sem animação), antes de
  // o React trocar o conteúdo: o "Carregando…" das subvistas preguiçosas encolhe
  // a página e cortaria uma rolagem feita depois. Vem depois do onSelect para
  // valer sobre o scrollTo(0) do goTo da casca.
  const pick = (s) => {
    const top = s === active ? null : stuckFlowTop(wrapRef.current);
    onSelect(s);
    if (top != null) window.scrollTo(0, top);
  };
  return (
    <div ref={wrapRef} className="shell-seg-tabs">
      {/* celular sem a barra da mesa: "⟳ Sem conexão há N s" numa faixa fina sob o segmentado */}
      <OfflineNote lang={lang} className="is-seg" />
      <div className="mesa-seg has-track">
        <div ref={trackRef} className="mesa-seg-track mesa-scroll" role="tablist" aria-label={ariaLabel || t(lang, 'Subvistas', 'Views')}>
          {subs.map(s => {
            const icon = s in icons ? icons[s] : SUB_ICONS[s];
            const long = labels[s] || subLabel(s, lang);
            const short = labels[s] || subShortLabel(s, lang);
            const on = active === s;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={on}
                data-sub={s}
                className={`mesa-seg-btn shell-seg-tab ${on ? 'active' : ''}`}
                onClick={() => pick(s)}
              >
                {icon && <span className="shell-seg-ico" aria-hidden="true">{icon}</span>}
                {/* data-label: o CSS reserva a largura do rótulo em negrito (o ativo) */}
                {short === long
                  ? <span className="shell-seg-label" data-label={long}>{long}</span>
                  : <><span className="shell-seg-label shell-seg-long" data-label={long}>{long}</span><span className="shell-seg-label shell-seg-short" data-label={short} aria-hidden="true">{short}</span></>}
                {badges[s] > 0 && <span className="shell-badge shell-seg-badge" aria-label={badgeLabels[s] || undefined}>{badges[s]}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Se a faixa (sticky) está presa agora, a posição dela no fluxo da página
 * (o scrollY em que ela começa a prender); senão null. */
function stuckFlowTop(el) {
  if (!el || !(window.scrollY > 0) || getComputedStyle(el).position !== 'sticky') return null;
  const now = el.getBoundingClientRect().top;
  el.style.position = 'static';
  const flow = el.getBoundingClientRect().top;
  el.style.position = '';
  return flow < now - 1 ? Math.max(0, Math.round(flow + window.scrollY)) : null;
}
