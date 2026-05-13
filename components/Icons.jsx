/* Inline SVG icons — minimal, line-style, gold-tone friendly */
export const Icon = ({ name, size = 18, ...props }) => {
  const stroke = "currentColor";
  const sw = 1.5;
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", ...props };
  switch (name) {
    case 'plus':       return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus':      return <svg {...common}><path d="M5 12h14"/></svg>;
    case 'check':      return <svg {...common}><path d="M5 12l5 5L20 7"/></svg>;
    case 'x':          return <svg {...common}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'chevron-right': return <svg {...common}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chevron-left':  return <svg {...common}><path d="M15 6l-6 6 6 6"/></svg>;
    case 'chevron-down':  return <svg {...common}><path d="M6 9l6 6 6-6"/></svg>;
    case 'dice':       return <svg {...common}><polygon points="12,2 22,8 22,17 12,22 2,17 2,8"/><line x1="12" y1="22" x2="12" y2="12"/><line x1="22" y1="8" x2="12" y2="12"/><line x1="2" y1="8" x2="12" y2="12"/></svg>;
    case 'print':      return <svg {...common}><path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
    case 'edit':       return <svg {...common}><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
    case 'trash':      return <svg {...common}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>;
    case 'share':      return <svg {...common}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
    case 'download':   return <svg {...common}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;
    case 'upload':     return <svg {...common}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>;
    case 'star':       return <svg {...common}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case 'star-fill':  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case 'sword':      return <svg {...common}><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/></svg>;
    case 'shield':     return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case 'heart':      return <svg {...common}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
    case 'book':       return <svg {...common}><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
    case 'feather':    return <svg {...common}><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z M16 8L2 22M17.5 15H9"/></svg>;
    case 'sparkle':    return <svg {...common}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>;
    case 'shoe':       return <svg {...common}><path d="M2 17h20M4 17V9a2 2 0 012-2h2l3 3h7a4 4 0 014 4v3"/></svg>;
    case 'target':     return <svg {...common}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case 'eye':        return <svg {...common}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'crown':      return <svg {...common}><path d="M3 7l4 6 5-9 5 9 4-6v12H3z"/></svg>;
    case 'scroll':     return <svg {...common}><path d="M8 3h11l-2 5h-9zM6 8h11l-2 5H4zM4 13h11l-2 5h-9zM2 18h11"/></svg>;
    case 'flask':      return <svg {...common}><path d="M9 3h6M10 3v6L4 19a2 2 0 002 2h12a2 2 0 002-2L14 9V3"/></svg>;
    case 'menu':       return <svg {...common}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
    case 'arrow-back': return <svg {...common}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
    case 'image':      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
    case 'home':       return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2h-4v-7H10v7H6a2 2 0 01-2-2z"/></svg>;
    case 'gem':        return <svg {...common}><polygon points="6 3 18 3 22 9 12 22 2 9"/><polyline points="11 3 8 9 12 22"/><polyline points="13 3 16 9 12 22"/><line x1="2" y1="9" x2="22" y2="9"/></svg>;
    case 'cog':        return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82h0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
    case 'flame':      return <svg {...common}><path d="M8.5 14c2 2 5 2 7 0 2-2 2-5 0-7C13 4 12 2 12 2s-1.5 2-3 4c-1.5 2-2 4-0.5 8z"/></svg>;
    case 'logo':       // Decorative diamond + cross
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <path d="M20 2 L38 20 L20 38 L2 20 Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M20 8 L32 20 L20 32 L8 20 Z" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6"/>
          <circle cx="20" cy="20" r="3" fill="currentColor"/>
          <path d="M20 14 L20 26 M14 20 L26 20" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      );
    default: return null;
  }
};

export default Icon;
