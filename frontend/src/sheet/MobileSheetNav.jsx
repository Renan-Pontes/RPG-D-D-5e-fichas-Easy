const ITEMS = [
  { id: 'play', icon: '⚔', pt: 'Combate', en: 'Combat' },
  { id: 'spells', icon: '✦', pt: 'Magias', en: 'Spells' },
  { id: 'skills', icon: '◈', pt: 'Perícias', en: 'Skills' },
  { id: 'inventory', icon: '🎒', pt: 'Mochila', en: 'Bag' },
  { id: 'story', icon: '📜', pt: 'História', en: 'Story' },
];

export default function MobileSheetNav({ activeTab, onSelect, lang = 'pt' }) {
  return (
    <nav className="fh-mobile-nav no-print" aria-label={lang === 'en' ? 'Sheet sections' : 'Seções da ficha'}>
      {ITEMS.map(item => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`fh-mobile-nav-btn${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(item.id)}
          >
            <span className="fh-mobile-nav-ico" aria-hidden="true">{item.icon}</span>
            <span className="fh-mobile-nav-lbl">{lang === 'en' ? item.en : item.pt}</span>
          </button>
        );
      })}
    </nav>
  );
}
