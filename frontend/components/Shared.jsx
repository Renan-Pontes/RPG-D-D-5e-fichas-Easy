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
const AVATAR_PX = 800;
// Mantém o formato da foto (o banner é largo, o token é redondo): só reduz o lado maior.
const compressAvatar = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const k = Math.min(1, AVATAR_PX / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// Enquadramento WYSIWYG: a moldura tem a proporção real do banner do herói; arrastar a foto
// (mouse ou dedo) move o recorte. object-position em %: com object-fit cover, só o eixo que
// sobra pode andar; 1px arrastado = 100/sobra %.
const ratioOf = (a) => { const [w, h] = String(a).split('/').map(Number); return w > 0 && h > 0 ? +(w / h).toFixed(4) : 1.7778; };
const FrameDrag = ({ src, pos, onPos, aspect, round = false, className = '', label }) => {
  const box = useRef(null);
  const [nat, setNat] = useState(null);
  const drag = useRef(null);
  const overflow = () => {
    const el = box.current;
    if (!el || !nat) return { x: 0, y: 0 };
    const fw = el.clientWidth, fh = el.clientHeight;
    const k = Math.max(fw / nat.w, fh / nat.h);
    return { x: nat.w * k - fw, y: nat.h * k - fh };
  };
  const down = (e) => {
    e.preventDefault();
    box.current?.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const o = overflow();
    const clamp = (v) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
    onPos({
      x: o.x > 0 ? clamp(d.px - ((e.clientX - d.x) / o.x) * 100) : d.px,
      y: o.y > 0 ? clamp(d.py - ((e.clientY - d.y) / o.y) * 100) : d.py,
    });
  };
  const up = () => { drag.current = null; };
  const key = (e) => {
    const step = e.shiftKey ? 10 : 2;
    const m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!m) return;
    e.preventDefault();
    onPos({ x: Math.max(0, Math.min(100, pos.x + m[0])), y: Math.max(0, Math.min(100, pos.y + m[1])) });
  };
  return (
    <div ref={box} className={`avatar-frame ${round ? 'is-round' : ''} ${className}`}
      style={{ aspectRatio: aspect, ...(round ? {} : { width: `min(100%, calc(48vh * ${ratioOf(aspect)}))`, marginInline: 'auto' }) }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      tabIndex={0} role="slider" aria-label={label} aria-valuetext={`${pos.x}% · ${pos.y}%`} onKeyDown={key}>
      <img src={src} alt="" draggable={false} onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        style={{ objectPosition: `${pos.x}% ${pos.y}%` }} />
    </div>
  );
};

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
  // Proporção real do banner do herói (moldura WYSIWYG); sem a ficha na tela, 16:9.
  const bannerAspect = (() => {
    if (!viewing || typeof document === 'undefined') return '16 / 9';
    const r = document.querySelector('.fh-hero-art')?.getBoundingClientRect();
    return r && r.width > 0 && r.height > 0 ? `${Math.round(r.width)} / ${Math.round(r.height)}` : '16 / 9';
  })();

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
          <div className="avatar-viewer is-wysiwyg">
            <h3 style={{ margin: 0, fontFamily: 'var(--display)', color: 'var(--gold-bright)' }}>
              {pt ? 'Enquadrar o retrato' : 'Frame the portrait'}
            </h3>
            <p className="avatar-frame-hint">{pt ? 'Arraste a imagem dentro da moldura (mouse ou dedo). É exatamente o que aparece na ficha.' : 'Drag the image inside the frame (mouse or finger). This is exactly what the sheet shows.'}</p>
            <FrameDrag src={value} pos={{ x: posX, y: posY }} onPos={(p) => onPositionChange && onPositionChange(p)}
              aspect={bannerAspect} className="is-banner" label={pt ? 'Enquadramento do banner' : 'Banner framing'} />
            <div className="avatar-frame-row">
              <FrameDrag src={value} pos={{ x: posX, y: posY }} onPos={(p) => onPositionChange && onPositionChange(p)}
                aspect="1 / 1" round className="is-token" label={pt ? 'Enquadramento do retrato redondo' : 'Round portrait framing'} />
              <div className="avatar-frame-meta">
                <span>{pt ? 'Retrato redondo: mesmo recorte.' : 'Round portrait: same crop.'}</span>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPreset(50, 22)}>↺ {pt ? 'Centralizar' : 'Recenter'}</button>
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
