/* Shared UI components */
import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
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
// (mouse ou dedo) move o recorte. Posição por eixo em %: 0…100 percorre a sobra como
// object-position; −25…125 é a folga de 50% (meia moldura a mais) para cabeças e pés
// colados na borda. Zoom z (0.4…1) reduz a foto a partir do tamanho que cobre a moldura,
// mostrando mais dela. FramedImg aplica o mesmo cálculo na ficha, no selo e aqui.
export const AVATAR_POS_MIN = -25, AVATAR_POS_MAX = 125, AVATAR_ZOOM_MIN = 0.4;
const clampPos = (v) => Math.max(AVATAR_POS_MIN, Math.min(AVATAR_POS_MAX, Math.round(v * 10) / 10));
export const avatarZoom = (pos) => { const z = Number(pos?.z); return z >= AVATAR_ZOOM_MIN && z <= 1 ? z : 1; };
const posXY = (pos, dx = 50, dy = 22) => ({ x: typeof pos?.x === 'number' ? pos.x : dx, y: typeof pos?.y === 'number' ? pos.y : dy });
/** Deslocamento em px de um eixo: f = moldura, w = foto, x = posição em %. */
export const frameAxisPx = (x, f, w) => {
  const free = f - w, s = free > 0 ? 1 : -1;
  if (x < 0) return s * x * f / 100;
  if (x > 100) return free + s * (x - 100) * f / 100;
  return free * x / 100;
};
/** Inverso de frameAxisPx: px → posição em %. */
export const frameAxisPos = (L, f, w) => {
  const free = f - w, s = free > 0 ? 1 : -1;
  const before = s > 0 ? L < 0 : L > 0;
  const after = s > 0 ? L > free : L < free;
  if (before) return (L / (s * f)) * 100;
  if (after) return 100 + ((L - free) / (s * f)) * 100;
  return free ? (L / free) * 100 : 0;
};
/** Estilo da foto dentro da moldura medida (geo = {fw, fh, nw, nh}); sem medida, cover simples. */
export const framedStyle = (pos, geo, dx, dy) => {
  const { x, y } = posXY(pos, dx, dy);
  if (!geo?.fw || !geo?.nw) return { objectPosition: `${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%` };
  const k = Math.max(geo.fw / geo.nw, geo.fh / geo.nh) * avatarZoom(pos);
  const w = geo.nw * k, h = geo.nh * k;
  return { position: 'absolute', inset: 'auto', left: frameAxisPx(x, geo.fw, w), top: frameAxisPx(y, geo.fh, h), width: w, height: h, objectFit: 'fill', maxWidth: 'none', maxHeight: 'none' };
};
const useFrameGeo = (src) => {
  const ref = useRef(null);
  const [geo, setGeo] = useState(null);
  const measure = () => {
    const img = ref.current, box = img?.parentElement;
    if (!img || !box || !img.naturalWidth) return;
    const g = { fw: box.clientWidth, fh: box.clientHeight, nw: img.naturalWidth, nh: img.naturalHeight };
    setGeo(o => (o && o.fw === g.fw && o.fh === g.fh && o.nw === g.nw && o.nh === g.nh ? o : g));
  };
  useLayoutEffect(() => {
    const box = ref.current?.parentElement;
    measure();
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [src]);
  return { ref, geo, measure };
};
/** <img> enquadrada pela posição/zoom da ficha; o pai precisa ser posicionado com overflow oculto. */
export const FramedImg = ({ src, pos, dx, dy, style, onLoad, alt = '', ...rest }) => {
  const { ref, geo, measure } = useFrameGeo(src);
  return <img ref={ref} src={src} alt={alt} {...rest}
    onLoad={(e) => { measure(); onLoad && onLoad(e); }}
    style={{ ...framedStyle(pos, geo, dx, dy), ...style }} />;
};
const ratioOf = (a) => { const [w, h] = String(a).split('/').map(Number); return w > 0 && h > 0 ? +(w / h).toFixed(4) : 1.7778; };
const FrameDrag = ({ src, pos, onPos, aspect, round = false, className = '', label }) => {
  const { ref, geo, measure } = useFrameGeo(src);
  const drag = useRef(null);
  const size = () => {
    if (!geo) return null;
    const k = Math.max(geo.fw / geo.nw, geo.fh / geo.nh) * avatarZoom(pos);
    return { w: geo.nw * k, h: geo.nh * k };
  };
  const down = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const sz = size();
    if (!sz) return;
    drag.current = { x: e.clientX, y: e.clientY, lx: frameAxisPx(pos.x, geo.fw, sz.w), ly: frameAxisPx(pos.y, geo.fh, sz.h), sz };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    onPos({ ...pos,
      x: clampPos(frameAxisPos(d.lx + e.clientX - d.x, geo.fw, d.sz.w)),
      y: clampPos(frameAxisPos(d.ly + e.clientY - d.y, geo.fh, d.sz.h)) });
  };
  const up = () => { drag.current = null; };
  const key = (e) => {
    const step = e.shiftKey ? 10 : 2;
    const m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!m) return;
    e.preventDefault();
    onPos({ ...pos, x: clampPos(pos.x + m[0]), y: clampPos(pos.y + m[1]) });
  };
  return (
    <div className={`avatar-frame ${round ? 'is-round' : ''} ${className}`}
      style={{ aspectRatio: aspect, ...(round ? {} : { width: `min(100%, calc(48vh * ${ratioOf(aspect)}))`, marginInline: 'auto' }) }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      tabIndex={0} role="slider" aria-label={label} aria-valuetext={`${pos.x}% · ${pos.y}%`} onKeyDown={key}>
      <img ref={ref} src={src} alt="" draggable={false} onLoad={measure} style={framedStyle(pos, geo)} />
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
  // Fotos enviadas antes da v1.0.115 foram salvas recortadas em quadrado; o original não existe mais.
  const [square, setSquare] = useState(false);
  useEffect(() => {
    if (!value || !viewing) return undefined;
    let live = true;
    const im = new Image();
    im.onload = () => { if (live) setSquare(im.naturalWidth > 0 && im.naturalWidth === im.naturalHeight); };
    im.src = value;
    return () => { live = false; };
  }, [value, viewing]);
  const pt = lang === 'pt';
  const posX = typeof position?.x === 'number' ? position.x : 50;
  const posY = typeof position?.y === 'number' ? position.y : 22;
  const zoom = avatarZoom(position);
  const fpos = { x: posX, y: posY, ...(zoom < 1 ? { z: zoom } : {}) };
  const setPos = (p) => { if (!onPositionChange) return; const { z, ...rest } = p; onPositionChange(z != null && z < 1 ? { ...rest, z } : rest); };

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
          ? <FramedImg src={value} pos={fpos} />
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
            {square && (
              <p className="avatar-frame-warn" role="status">
                {pt
                  ? 'Esta foto foi salva cortada em quadrado por uma versão antiga, e as bordas originais não estão mais guardadas. Use "Alterar foto" e envie a imagem de novo para ter ela inteira.'
                  : 'An older version saved this photo cut to a square, so its original edges are gone. Use "Change photo" and upload the image again to get all of it.'}
              </p>
            )}
            <FrameDrag src={value} pos={fpos} onPos={setPos}
              aspect={bannerAspect} className="is-banner" label={pt ? 'Enquadramento do banner' : 'Banner framing'} />
            <div className="avatar-frame-row">
              <FrameDrag src={value} pos={fpos} onPos={setPos}
                aspect="1 / 1" round className="is-token" label={pt ? 'Enquadramento do retrato redondo' : 'Round portrait framing'} />
              <div className="avatar-frame-meta">
                <span>{pt ? 'Retrato redondo: mesmo recorte.' : 'Round portrait: same crop.'}</span>
                <label className="avatar-zoom">
                  <span>{pt ? 'Zoom' : 'Zoom'} {Math.round(zoom * 100)}%</span>
                  <input type="range" min={AVATAR_ZOOM_MIN} max={1} step={0.01} value={zoom}
                    aria-label={pt ? 'Zoom da foto' : 'Photo zoom'}
                    onChange={(e) => setPos({ ...fpos, z: Number(e.target.value) })} />
                </label>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPos({ x: 50, y: 22 })}>↺ {pt ? 'Centralizar' : 'Recenter'}</button>
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
