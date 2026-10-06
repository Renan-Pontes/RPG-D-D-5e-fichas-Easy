// Navegação das áreas: abas no desktop e barra inferior fixa no celular.
// Também exporta <SubChips>, os chips segmentados das subvistas (as áreas podem
// usar para ficarem com o mesmo visual da casca).
import { areaLabel, subLabel, t } from './shell-logic.js';

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

/** Chips segmentados das subvistas de uma área. */
export function SubChips({ subs, active, onSelect, lang, labels = {}, badges = {} }) {
  if (!subs || subs.length < 2) return null;
  return (
    <div className="shell-subchips" role="tablist" aria-label={t(lang, 'Subvistas', 'Views')}>
      {subs.map(s => (
        <button
          key={s}
          type="button"
          role="tab"
          aria-selected={active === s}
          className={`shell-subchip ${active === s ? 'active' : ''}`}
          onClick={() => onSelect(s)}
        >
          {labels[s] || subLabel(s, lang)}
          {badges[s] > 0 && <span className="shell-badge">{badges[s]}</span>}
        </button>
      ))}
    </div>
  );
}
