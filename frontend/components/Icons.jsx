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
    case 'braces':     return <svg {...common}><path d="M8 3H7a2 2 0 00-2 2v5a2 2 0 01-2 2 2 2 0 012 2v5a2 2 0 002 2h1M16 3h1a2 2 0 012 2v5a2 2 0 002 2 2 2 0 00-2 2v5a2 2 0 01-2 2h-1"/></svg>;
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
    case 'moon':       return <svg {...common}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;
    case 'chevron-up':    return <svg {...common}><path d="M18 15l-6-6-6 6"/></svg>;
    // Glifos que antes eram emoji (cor e desenho mudavam por aparelho): mesmo traço dos demais.
    case 'search':     return <svg {...common}><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>;
    case 'warning':    return <svg {...common}><path d="M12 3.5L2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.2v.3"/></svg>;
    case 'info':       return <svg {...common}><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.3v.3"/></svg>;
    case 'lock':       return <svg {...common}><rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 018 0v3M12 14.5v2.5"/></svg>;
    case 'key':        return <svg {...common}><circle cx="7.5" cy="15.5" r="4"/><path d="M10.5 12.5L20 3M16.5 6.5l3 3M13.5 9.5l2 2"/></svg>;
    case 'mail':       return <svg {...common}><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M3 7l9 6.5L21 7"/></svg>;
    case 'eye-off':    return <svg {...common}><path d="M3 3l18 18M10.6 5.2A10.6 10.6 0 0112 5c7 0 11 7 11 7a18 18 0 01-3.2 3.9M6.5 6.6C3.1 8.6 1 12 1 12s4 7 11 7a10.5 10.5 0 004.9-1.2M9.9 9.9a3 3 0 004.2 4.2"/></svg>;
    case 'tv':         return <svg {...common}><rect x="2.5" y="4.5" width="19" height="12.5" rx="1.5"/><path d="M8 21h8M12 17v4"/></svg>;
    case 'castle':     return <svg {...common}><path d="M3.5 21V10.5h3.5V4.5h2.2v2h1.7v-2h2.2v2h1.7v-2H17v6h3.5V21z"/><path d="M10 21v-4.2a2 2 0 014 0V21M3.5 14h3.5M17 14h3.5"/></svg>;
    case 'chair':      return <svg {...common}><path d="M7 3v11M17 3v11M7 6h10M7 10h10M5 14h14v3H5zM6.5 17v4M17.5 17v4"/></svg>;
    case 'film':       return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21M7.5 12h9"/></svg>;
    case 'palette':    return <svg {...common}><path d="M12 3a9 9 0 100 18c1.4 0 2-1 2-2 0-1.6-1-1.8-1-3 0-1 .9-1.6 2-1.6h2.2A3.8 3.8 0 0021 10.6C21 6.4 17 3 12 3z"/><circle cx="7.6" cy="11.5" r=".9"/><circle cx="9.8" cy="7.6" r=".9"/><circle cx="14.4" cy="7.2" r=".9"/></svg>;
    case 'link':       return <svg {...common}><path d="M10 13.5a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1.2 1.2M14 10.5a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1.2-1.2"/></svg>;
    case 'ruler':      return <svg {...common}><path d="M3 16.5L16.5 3 21 7.5 7.5 21zM7 12.5l2 2M10 9.5l2 2M13 6.5l2 2"/></svg>;
    case 'toolbox':    return <svg {...common}><rect x="2.5" y="8" width="19" height="12" rx="2"/><path d="M8.5 8V6a2 2 0 012-2h3a2 2 0 012 2v2M2.5 13.5h19M10 12v3h4v-3"/></svg>;
    case 'compass':    return <svg {...common}><circle cx="12" cy="12" r="9.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>;
    case 'coins':      return <svg {...common}><ellipse cx="9" cy="8" rx="6" ry="3"/><path d="M3 8v4c0 1.7 2.7 3 6 3s6-1.3 6-3V8M9 15v1c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.2-1.4-2.3-3.5-2.8"/></svg>;
    case 'users':      return <svg {...common}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.8a3.5 3.5 0 010 6.4M18.5 14.2A6.5 6.5 0 0121.5 20"/></svg>;
    case 'map':        return <svg {...common}><path d="M3 6l6-2.5 6 2.5 6-2.5V18l-6 2.5L9 18l-6 2.5zM9 3.5V18M15 6v14.5"/></svg>;
    case 'monster':    return <svg {...common}><path d="M5 4l3 4h8l3-4v7c0 5-3.2 9-7 9s-7-4-7-9z"/><path d="M8.5 12.5l2 1M15.5 12.5l-2 1M10 17l1-1 1 1 1-1 1 1"/></svg>;
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
