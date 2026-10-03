/* Shared UI components */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Icon from './Icons.jsx';

// === Filigree divider ===
const Filigree = ({ children }) => (
  <div className="filigree">
    {children ? <>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-deep), transparent)' }} />
      <span className="filigree-dot" />
      <span style={{ fontFamily: 'var(--display)', fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{children}</span>
      <span className="filigree-dot" />
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-deep), transparent)' }} />
    </> : <>
      <span className="filigree-dot" />
    </>}
  </div>
);

// === Modal ===
const Modal = ({ children, onClose, title }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20}/></button>
        {title && <h2 style={{ marginBottom: 16 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

// === Toast ===
const Toast = ({ msg, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  return <div className="toast">{msg}</div>;
};

// === Lang toggle ===
const LangToggle = ({ lang, setLang }) => (
  <div className="lang-toggle" role="group">
    <button className={lang === 'pt' ? 'active' : ''} onClick={() => setLang('pt')}>PT</button>
    <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
  </div>
);

// === Theme picker: Clássico (padrão) · Claro · Escuro ===
const THEME_OPTIONS = [
  { id: 'classico', icon: 'scroll', pt: 'Tema Clássico', en: 'Classic theme' },
  { id: 'light', icon: 'sun', pt: 'Tema Claro', en: 'Light theme' },
  { id: 'dark', icon: 'moon', pt: 'Tema Escuro', en: 'Dark theme' },
];
const ThemeToggle = ({ theme, setTheme, lang }) => (
  <div className="lang-toggle theme-toggle" role="group" aria-label={lang === 'pt' ? 'Tema' : 'Theme'}>
    {THEME_OPTIONS.map(o => (
      <button
        key={o.id}
        className={theme === o.id ? 'active' : ''}
        onClick={() => setTheme(o.id)}
        aria-label={lang === 'pt' ? o.pt : o.en}
        aria-pressed={theme === o.id}
        title={lang === 'pt' ? o.pt : o.en}
      >
        <Icon name={o.icon} size={15}/>
      </button>
    ))}
  </div>
);

// === Header ===
const AppHeader = ({ lang, setLang, theme, setTheme, onHome, right }) => {
  return (
    <header className="app-header no-print">
      <div className="brand" onClick={onHome}>
        <div className="brand-mark"><Icon name="logo" size={32}/></div>
        <div className="brand-name">{lang === 'pt' ? 'Forja' : 'Hero'} <span>{lang === 'pt' ? 'de Heróis' : 'Forge'}</span></div>
      </div>
      <div className="header-actions">
        {right}
        {setTheme && <ThemeToggle theme={theme} setTheme={setTheme} lang={lang} />}
        <LangToggle lang={lang} setLang={setLang} />
      </div>
    </header>
  );
};

// === Numeric stepper ===
const NumStepper = ({ value, onChange, min = 0, max = 99, step = 1 }) => (
  <div className="row gap-2">
    <button className="stat-btn" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}><Icon name="minus" size={16}/></button>
    <span className="stat-value mono">{value}</span>
    <button className="stat-btn" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}><Icon name="plus" size={16}/></button>
  </div>
);

// === Pip rows (death saves, slots) ===
const Pips = ({ count, used, onChange, type = 'normal' }) => {
  const pips = [];
  for (let i = 0; i < count; i++) {
    const isUsed = i < used;
    pips.push(
      <button
        key={i}
        className={`slot-pip ${isUsed ? 'used' : ''}`}
        onClick={() => onChange(isUsed ? i : i + 1)}
        type="button"
      />
    );
  }
  return <div className="slot-pips">{pips}</div>;
};

// Avatar input
// Sem foto: clique abre o seletor. Com foto: clique abre a foto ampliada com
// "Alterar" / "Remover". A imagem é recortada no centro (quadrado) e reduzida
// pra 400px JPEG — fica no JSON da ficha (~30KB), sem mídia no servidor.
const AVATAR_PX = 400;
const compressAvatar = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const out = Math.min(AVATAR_PX, side);
      const c = document.createElement('canvas');
      c.width = out; c.height = out;
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const AvatarUpload = ({ value, onChange, size = 84, letter, lang = 'pt' }) => {
  const fileRef = useRef(null);
  const [viewing, setViewing] = useState(false);
  const pt = lang === 'pt';
  const pick = () => fileRef.current && fileRef.current.click();
  const handle = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      onChange(await compressAvatar(f));
      setViewing(false);
    } catch { /* arquivo não é imagem legível — ignora */ }
  };
  return (
    <>
      <div
        className="hero-avatar"
        style={{ width: size, height: size }}
        onClick={() => (value ? setViewing(true) : pick())}
        role="button"
        title={value ? (pt ? 'Ver foto' : 'View photo') : (pt ? 'Adicionar foto' : 'Add photo')}
      >
        {value
          ? <img src={value} alt="" />
          : <span className="hero-avatar-letter">{letter || '?'}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handle} style={{ display: 'none' }} />
      {viewing && value && (
        <Modal onClose={() => setViewing(false)}>
          <div className="avatar-viewer">
            <img src={value} alt="" />
            <div className="avatar-viewer-actions">
              <button className="btn btn-primary" onClick={pick}>
                <Icon name="upload" size={14}/> {pt ? 'Alterar foto' : 'Change photo'}
              </button>
              <button className="btn btn-ghost" onClick={() => { onChange(''); setViewing(false); }}>
                {pt ? 'Remover' : 'Remove'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export { Filigree, Modal, Toast, LangToggle, ThemeToggle, AppHeader, NumStepper, Pips, AvatarUpload };
