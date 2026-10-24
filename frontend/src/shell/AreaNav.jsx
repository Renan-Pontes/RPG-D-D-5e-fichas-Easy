// Navegação das áreas: abas no desktop e barra inferior fixa no celular.
// Também exporta <SubChips>, o segmentado das subvistas (as áreas usam para
// ficarem com o mesmo visual da casca).
import { useRef } from 'react';
import { areaLabel, SUB_ICONS, subLabel, subShortLabel, t } from './shell-logic.js';
import useScrollEdges from './useScrollEdges.js';
import './mesa.css';

export default function AreaNav({ areas, active, onSelect, onSearch, lang, badges = {}, showKeys = false }) {
  return (
    <>
      <nav className="shell-areas" role="tablist" aria-label={t(lang, 'Áreas da campanha', 'Campaign areas')}>
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
            {badges[a.id] > 0 && <span className="shell-badge" aria-label={t(lang, `${badges[a.id]} novo(s)`, `${badges[a.id]} new`)}>{badges[a.id]}</span>}
            {showKeys && <kbd className="shell-area-key" aria-hidden="true">{i + 1}</kbd>}
          </button>
        ))}
      </nav>

      <nav className="shell-bottom-bar no-print" aria-label={t(lang, 'Áreas da campanha', 'Campaign areas')}>
        {areas.map(a => (
          <button
            key={a.id}
            type="button"
            className={`shell-bottom-btn ${active === a.id ? 'active' : ''}`}
            aria-current={active === a.id ? 'page' : undefined}
            onClick={() => onSelect(a.id)}
          >
            <span className="shell-bottom-ico" aria-hidden="true">{a.icon}</span>
            <span className="shell-bottom-label">{areaLabel(a, lang)}</span>
            {badges[a.id] > 0 && <span className="shell-badge shell-badge-dot">{badges[a.id]}</span>}
          </button>
        ))}
        {onSearch && (
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
  const trackRef = useRef(null);
  const show = !!subs && subs.length >= 2;
  useScrollEdges(trackRef, { active, enabled: show, count: show ? subs.length : 0 });
  if (!show) return null;
  return (
    <div className="shell-seg-tabs">
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
                onClick={() => onSelect(s)}
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
