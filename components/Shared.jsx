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

// === Header ===
const AppHeader = ({ lang, setLang, onHome, right }) => {
  return (
    <header className="app-header no-print">
      <div className="brand" onClick={onHome}>
        <div className="brand-mark"><Icon name="logo" size={32}/></div>
        <div className="brand-name">{lang === 'pt' ? 'Forja' : 'Hero'} <span>{lang === 'pt' ? 'de Heróis' : 'Forge'}</span></div>
      </div>
      <div className="header-actions">
        {right}
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
const AvatarUpload = ({ value, onChange, size = 84, letter }) => {
  const fileRef = useRef(null);
  const handle = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Compress to ~200px square
      const img = new Image();
      img.onload = () => {
        const max = 260;
        const ratio = Math.min(max / img.width, max / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        onChange(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };
  return (
    <>
      <div
        className="hero-avatar"
        style={{ width: size, height: size }}
        onClick={() => fileRef.current && fileRef.current.click()}
        title="Upload avatar"
      >
        {value
          ? <img src={value} alt="" />
          : <span className="hero-avatar-letter">{letter || '?'}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handle} style={{ display: 'none' }} />
    </>
  );
};

export { Filigree, Modal, Toast, LangToggle, AppHeader, NumStepper, Pips, AvatarUpload };
