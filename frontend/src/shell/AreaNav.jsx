// Navegação das áreas: abas no desktop e barra inferior fixa no celular.
// Também exporta <SubChips>, os chips segmentados das subvistas (as áreas podem
// usar para ficarem com o mesmo visual da casca).
import { areaLabel, SUB_ICONS, subLabel, subShortLabel, t } from './shell-logic.js';

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
 * Chips segmentados das subvistas de uma área — o MESMO visual em Mundo,
 * Preparar, Jogar e Grupo (DESIGN 1.2). Ícone padrão por subvista (SUB_ICONS),
 * rótulo curto no celular estreito e rolagem horizontal se ainda não couber.
 *   labels: {sub: texto} substitui o rótulo; icons: {sub: '🗺'|null} idem p/ ícone.
 */
export function SubChips({ subs, active, onSelect, lang, labels = {}, icons = {}, badges = {}, badgeLabels = {}, ariaLabel }) {
  if (!subs || subs.length < 2) return null;
  return (
    <div className="shell-subchips" role="tablist" aria-label={ariaLabel || t(lang, 'Subvistas', 'Views')}>
      {subs.map(s => {
        const icon = s in icons ? icons[s] : SUB_ICONS[s];
        const long = labels[s] || subLabel(s, lang);
        const short = labels[s] || subShortLabel(s, lang);
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active === s}
            className={`shell-subchip ${active === s ? 'active' : ''}`}
            onClick={() => onSelect(s)}
          >
            {icon && <span className="shell-subchip-ico" aria-hidden="true">{icon}</span>}
            {short === long
              ? <span>{long}</span>
              : <><span className="shell-subchip-long">{long}</span><span className="shell-subchip-short" aria-hidden="true">{short}</span></>}
            {badges[s] > 0 && <span className="shell-badge" aria-label={badgeLabels[s] || undefined}>{badges[s]}</span>}
          </button>
        );
      })}
    </div>
  );
}
