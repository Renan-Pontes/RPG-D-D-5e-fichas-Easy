// Escolha da capa da campanha (assistente de nova campanha e ⚙ Ajustes › Identidade).
//
// Prévia grande 16:9 com o nome da campanha por cima; abaixo, a galeria de capas
// prontas (CAMPAIGN_COVERS, de art.js) com o nome do clima, "Usar minha imagem"
// e "Sem capa". No celular a galeria vira um carrossel.
//
// `onPick(dataUrl | null, choice)` — choice = id da capa pronta | 'upload' | 'none'.
// Toda escolha vira um dataURL JPEG 16:9 ≤ 450k (ver cover-logic.js) — o pai só
// guarda (assistente) ou envia por PUT /campaigns/:id/cover (Ajustes).
import { useEffect, useRef, useState } from 'react';
import { CAMPAIGN_COVERS, campaignCoverName } from '../art.js';
import { coverDataUrlFromImage, coverErrorText, needsVerticalFrame, readCoverSource } from './cover-logic.js';
import './cover-picker.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);
const FRAMES = [[0, 'Topo', 'Top'], [0.5, 'Centro', 'Center'], [1, 'Base', 'Bottom']];

export default function CoverPicker({
  lang = 'pt', name = '', tagline = '', accent = '',
  currentSrc = null,       // capa que a campanha já tem (Ajustes)
  fallbackSrc = null,      // arte que a mesa mostra quando não há capa
  initialChoice = null,
  busy = false, onPick, onWorking,
}) {
  const [choice, setChoice] = useState(initialChoice ?? (currentSrc ? 'current' : 'none'));
  const [preview, setPreview] = useState(currentSrc);
  const [upload, setUpload] = useState(null);   // {img, focus, url}
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  const ticket = useRef(0);   // a última escolha vence (cliques rápidos)
  const gridRef = useRef(null);
  const previewRef = useRef(null);

  // Retorno visual: a miniatura clicada "voa" até a prévia grande, que troca com fade/zoom.
  const flyToPreview = (fromEl) => {
    const target = previewRef.current;
    if (!fromEl || !target) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tr = target.getBoundingClientRect();
    // No celular a prévia pode estar fora da tela: leva o jogador até ela.
    if (tr.top < 0 || tr.bottom > window.innerHeight) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    if (reduce) return;
    const img = fromEl.querySelector('img');
    if (!img || typeof img.animate !== 'function') return;
    const fr = img.getBoundingClientRect();
    const ghost = img.cloneNode();
    Object.assign(ghost.style, {
      position: 'fixed', left: `${fr.left}px`, top: `${fr.top}px`, width: `${fr.width}px`, height: `${fr.height}px`,
      objectFit: 'cover', borderRadius: '8px', zIndex: 3000, pointerEvents: 'none', boxShadow: '0 12px 40px rgba(0,0,0,.6)',
    });
    document.body.appendChild(ghost);
    const t2 = previewRef.current.getBoundingClientRect();
    const dx = t2.left - fr.left, dy = t2.top - fr.top, sx = t2.width / fr.width, sy = t2.height / fr.height;
    ghost.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1, transformOrigin: 'top left' },
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.15, transformOrigin: 'top left' },
    ], { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => ghost.remove();
  };
  const withFly = (fn) => (e) => { flyToPreview(e?.currentTarget); fn(); };

  // Carrossel (celular): mantém a capa escolhida à vista, sem mexer na página.
  useEffect(() => {
    const grid = gridRef.current;
    const el = grid?.querySelector('.cvp-tile.active');
    if (!grid || !el || grid.scrollWidth <= grid.clientWidth) return;
    const left = el.offsetLeft; // .cvp-grid é position: relative
    if (left < grid.scrollLeft || left + el.offsetWidth > grid.scrollLeft + grid.clientWidth) {
      grid.scrollTo({ left: Math.max(0, left - 8), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [choice]);

  useEffect(() => { onWorking?.(working); }, [working]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (nextChoice, nextPreview, make) => {
    const my = ++ticket.current;
    setErr(''); setWorking(true);
    const prev = { choice, preview };
    setChoice(nextChoice); if (nextPreview !== undefined) setPreview(nextPreview);
    try {
      const out = await make();
      if (my !== ticket.current) return;
      await onPick?.(out.url, nextChoice);
      if (out.preview) setPreview(out.preview);
    } catch (e) {
      if (my !== ticket.current) return;
      setChoice(prev.choice); setPreview(prev.preview);
      setErr(coverErrorText(e?.message, lang));
    } finally {
      if (my === ticket.current) setWorking(false);
    }
  };

  const pickPreset = (c) => {
    if (busy || c.id === choice) return;
    run(c.id, c.src, async () => ({ url: await coverDataUrlFromImage(await readCoverSource(c.src)) }));
  };
  const pickNone = () => {
    if (busy || choice === 'none') return;
    run('none', null, async () => ({ url: null }));
  };
  const pickCurrent = () => {
    if (busy || choice === 'current' || !currentSrc) return;
    // Voltar para a capa que já está salva: nada a enviar.
    ticket.current++; setErr(''); setChoice('current'); setPreview(currentSrc);
  };
  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || busy) return;
    run('upload', undefined, async () => {
      const img = await readCoverSource(f);
      const url = await coverDataUrlFromImage(img, 0.5);
      setUpload({ img, focus: 0.5, url, tall: needsVerticalFrame(img.naturalWidth, img.naturalHeight) });
      return { url, preview: url };
    });
  };
  const reframe = (focus) => {
    if (!upload || busy || focus === upload.focus) return;
    run('upload', undefined, async () => {
      const url = await coverDataUrlFromImage(upload.img, focus);
      setUpload({ ...upload, focus, url });
      return { url, preview: url };
    });
  };
  const reuseUpload = () => {
    if (!upload || busy || choice === 'upload') return;
    run('upload', upload.url, async () => ({ url: upload.url }));
  };

  const shown = choice === 'none' ? fallbackSrc : preview;
  const title = name.trim() || t(lang, 'Sua campanha', 'Your campaign');
  const selName = choice === 'none' ? t(lang, 'Sem capa', 'No cover')
    : choice === 'upload' ? t(lang, 'Sua imagem', 'Your image')
    : choice === 'current' ? t(lang, 'Capa atual', 'Current cover')
    : campaignCoverName(CAMPAIGN_COVERS.find((c) => c.id === choice), lang);
  const disabled = busy;

  return (
    <div className="cvp" style={accent ? { '--cvp-accent': accent } : undefined}>
      <figure ref={previewRef} className={`cvp-preview ${shown ? '' : 'is-empty'} ${working ? 'is-working' : ''}`} aria-live="polite">
        {shown && <img key={shown} className="cvp-preview-img" src={shown} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}
        <span key={`glint-${choice}`} className="cvp-glint" aria-hidden="true" />
        <figcaption className="cvp-preview-text">
          <span className="cvp-preview-name">{title}</span>
          {tagline.trim() && <span className="cvp-preview-tag">{tagline.trim()}</span>}
        </figcaption>
        <span className="cvp-preview-chip">{working ? t(lang, 'Preparando…', 'Preparing…') : selName}</span>
      </figure>
      {choice === 'none' && (
        <p className="cvp-note">{fallbackSrc
          ? t(lang, 'Sem capa própria: a mesa mostra esta arte da Forja no lugar.', 'No cover of your own: the table shows this Forge art instead.')
          : t(lang, 'Sem capa própria: a mesa mostra uma arte da Forja no lugar. Dá para escolher depois em ⚙ Ajustes.', 'No cover of your own: the table shows a Forge art instead. You can pick one later in ⚙ Settings.')}</p>
      )}
      {choice === 'upload' && upload?.tall && (
        <div className="cvp-frame" role="group" aria-label={t(lang, 'Enquadrar a imagem', 'Frame the image')}>
          <span className="muted text-sm">{t(lang, 'Enquadrar:', 'Frame:')}</span>
          {FRAMES.map(([f, pt, en]) => (
            <button key={f} type="button" className={`cvp-frame-btn ${upload.focus === f ? 'active' : ''}`} aria-pressed={upload.focus === f}
              disabled={disabled || working} onClick={() => reframe(f)}>{t(lang, pt, en)}</button>
          ))}
        </div>
      )}

      <div className="cvp-grid" ref={gridRef} role="radiogroup" aria-label={t(lang, 'Capas', 'Covers')}>
        {currentSrc && (
          <CoverTile active={choice === 'current'} disabled={disabled} onClick={withFly(pickCurrent)} label={t(lang, 'Capa atual', 'Current cover')}>
            <img src={currentSrc} alt="" loading="lazy" />
          </CoverTile>
        )}
        <CoverTile active={choice === 'upload'} disabled={disabled} special
          onClick={() => (upload && choice !== 'upload' ? reuseUpload() : fileRef.current?.click())}
          label={upload ? t(lang, 'Sua imagem', 'Your image') : t(lang, 'Usar minha imagem', 'Use my image')}>
          {upload ? <img src={upload.url} alt="" /> : <span className="cvp-tile-ico" aria-hidden="true">⬆</span>}
        </CoverTile>
        <CoverTile active={choice === 'none'} disabled={disabled} special onClick={withFly(pickNone)} label={t(lang, 'Sem capa', 'No cover')}>
          <span className="cvp-tile-ico" aria-hidden="true">∅</span>
        </CoverTile>
        {CAMPAIGN_COVERS.map((c) => (
          <CoverTile key={c.id} active={choice === c.id} disabled={disabled} onClick={withFly(() => pickPreset(c))} label={campaignCoverName(c, lang)}>
            <img src={c.src} alt="" loading="lazy" />
          </CoverTile>
        ))}
      </div>
      <div className="cvp-actions">
        {upload && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={disabled || working} onClick={() => fileRef.current?.click()}>
            ⬆ {t(lang, 'Trocar minha imagem', 'Replace my image')}
          </button>
        )}
        <span className="muted text-sm">{t(lang, 'JPG, PNG ou WebP — cortada em 16:9.', 'JPG, PNG or WebP — cropped to 16:9.')}</span>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={onFile} />
      {err && <p className="cvp-err" role="alert">{err}</p>}
    </div>
  );
}

function CoverTile({ active, disabled, onClick, label, special = false, children }) {
  return (
    <button type="button" role="radio" aria-checked={active} disabled={disabled} onClick={onClick}
      className={`cvp-tile ${active ? 'active' : ''} ${special ? 'is-special' : ''}`}>
      <span className="cvp-tile-img">{children}</span>
      <span className="cvp-tile-name">{label}</span>
    </button>
  );
}
