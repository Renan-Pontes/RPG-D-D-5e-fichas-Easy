/* Shared UI components */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Icon from './Icons.jsx';
import './header.css';

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
  <div className="lang-toggle" role="group" aria-label={lang === 'pt' ? 'Idioma' : 'Language'}>
    <button type="button" className={lang === 'pt' ? 'active' : ''} aria-pressed={lang === 'pt'} onClick={() => setLang('pt')}
      aria-label="Português" title={lang === 'pt' ? undefined : 'Mudar para português'}>PT</button>
    <button type="button" className={lang === 'en' ? 'active' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}
      aria-label="English" title={lang === 'en' ? undefined : 'Switch to English'}>EN</button>
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

const AvatarUpload = ({
  value,
  onChange,
  size = 84,
  letter,
  lang = 'pt',
  position = { x: 50, y: 22 },
  onPositionChange,
}) => {
  const fileRef = useRef(null);
  const [viewing, setViewing] = useState(false);
  const pt = lang === 'pt';
  const posX = typeof position?.x === 'number' ? position.x : 50;
  const posY = typeof position?.y === 'number' ? position.y : 22;

  const pick = () => fileRef.current && fileRef.current.click();
  const handle = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      onChange(await compressAvatar(f));
      if (onPositionChange) onPositionChange({ x: 50, y: 22 });
      setViewing(true);
    } catch { /* arquivo não é imagem legível — ignora */ }
  };

  const handlePosX = (newX) => {
    if (onPositionChange) onPositionChange({ x: Number(newX), y: posY });
  };
  const handlePosY = (newY) => {
    if (onPositionChange) onPositionChange({ x: posX, y: Number(newY) });
  };
  const setPreset = (x, y) => {
    if (onPositionChange) onPositionChange({ x, y });
  };

  const objPos = `${posX}% ${posY}%`;

  return (
    <>
      <div
        className="hero-avatar"
        style={{ width: size, height: size }}
        onClick={() => (value ? setViewing(true) : pick())}
        role="button"
        title={value ? (pt ? 'Ver e enquadrar foto' : 'View & frame photo') : (pt ? 'Adicionar foto' : 'Add photo')}
      >
        {value
          ? <img src={value} alt="" style={{ objectPosition: objPos }} />
          : <span className="hero-avatar-letter">{letter || '?'}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handle} style={{ display: 'none' }} />
      {viewing && value && (
        <Modal onClose={() => setViewing(false)}>
          <div className="avatar-viewer">
            <h3 style={{ margin: 0, fontFamily: 'var(--display)', color: 'var(--gold-bright)' }}>
              {pt ? 'Enquadramento da Imagem' : 'Character Portrait Framing'}
            </h3>

            {/* Banner Preview Frame */}
            <div className="avatar-viewer-preview-box" style={{ width: '100%', maxWidth: 420 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>{pt ? 'Prévia do Banner Superior' : 'Top Banner Preview'}</span>
                <span>{posX}% · {posY}%</span>
              </div>
              <div
                className="avatar-banner-preview"
                style={{
                  width: '100%',
                  height: 110,
                  borderRadius: 6,
                  overflow: 'hidden',
                  border: '1px solid var(--gold-deep)',
                  background: 'rgba(0,0,0,0.6)',
                  position: 'relative',
                }}
              >
                <img
                  src={value}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: objPos,
                    display: 'block',
                  }}
                />
              </div>
            </div>

            {/* Circular Token Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--gold-bright)',
                  boxShadow: '0 0 12px rgba(224, 181, 94, 0.4)',
                  flexShrink: 0,
                }}
              >
                <img
                  src={value}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: objPos,
                  }}
                />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                {pt ? 'Ajuste os controles abaixo para centralizar o rosto ou corpo no banner superior e no token redondo.'
                    : 'Adjust the sliders below to center your character\'s face or body in the banner and token.'}
              </div>
            </div>

            {/* Framing Sliders */}
            <div className="avatar-position-controls" style={{ width: '100%', maxWidth: 420, display: 'grid', gap: 10 }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                  <span>{pt ? 'Posição Horizontal (X)' : 'Horizontal Framing (X)'}</span>
                  <span style={{ color: 'var(--gold-bright)', fontWeight: 600 }}>{posX}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={posX}
                  onChange={(e) => handlePosX(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--gold-bright)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                  <span>{pt ? 'Posição Vertical / Altura (Y)' : 'Vertical Framing (Y)'}</span>
                  <span style={{ color: 'var(--gold-bright)', fontWeight: 600 }}>{posY}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={posY}
                  onChange={(e) => handlePosY(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--gold-bright)' }}
                />
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPreset(50, 15)}>
                  👤 {pt ? 'Topo / Cabeça' : 'Top / Head'}
                </button>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPreset(50, 50)}>
                  🎯 {pt ? 'Centro' : 'Center'}
                </button>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPreset(50, 85)}>
                  🛡️ {pt ? 'Base' : 'Bottom'}
                </button>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPreset(50, 22)}>
                  ↺ {pt ? 'Padrão' : 'Reset'}
                </button>
              </div>
            </div>

            <div className="avatar-viewer-actions" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-primary" onClick={() => setViewing(false)}>
                ✓ {pt ? 'Pronto' : 'Done'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={pick}>
                <Icon name="upload" size={14}/> {pt ? 'Alterar foto' : 'Change photo'}
              </button>
              <button type="button" className="btn btn-ghost btn-danger" onClick={() => { onChange(''); setViewing(false); }}>
                {pt ? 'Remover' : 'Remove'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export { Filigree, Modal, Toast, LangToggle, AppHeader, NumStepper, Pips, AvatarUpload };
