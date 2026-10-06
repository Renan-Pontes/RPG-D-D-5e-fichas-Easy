// Escolha da capa: galeria de artes prontas do app ou upload próprio.
// `onPick(dataUrl | null, artPath?)` — a arte da galeria é convertida em dataURL
// para o servidor guardar como capa (o telão e os jogadores a veem sem login extra).
import { useRef, useState } from 'react';
import { api } from '../api/client.js';
import { compressImage } from '../world/image.js';
import { COVER_ART, coverArtName, t } from './shell-logic.js';

export async function artToDataUrl(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error('art_unavailable');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('read_failed'));
    r.readAsDataURL(blob);
  });
}

export default function CoverPicker({ lang, campaign = null, selected = null, onPick, busy = false, allowRemove = true }) {
  const fileRef = useRef(null);
  const [err, setErr] = useState('');
  const [working, setWorking] = useState(false);
  const current = campaign ? api.campaignCoverUrl(campaign) : null;

  const pickArt = async (path) => {
    setErr(''); setWorking(true);
    try { onPick(await artToDataUrl(path), path); } catch { setErr(t(lang, 'Não deu para carregar essa arte.', 'Could not load that art.')); } finally { setWorking(false); }
  };
  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErr(''); setWorking(true);
    try {
      const { url } = await compressImage(f, 1600);
      onPick(url, null);
    } catch (x) {
      setErr(x?.message === 'not_image'
        ? t(lang, 'Escolha um arquivo de imagem.', 'Pick an image file.')
        : t(lang, 'Imagem grande demais.', 'Image too large.'));
    } finally { setWorking(false); }
  };

  return (
    <div className="shell-cover-picker">
      {current && (
        <div className="shell-cover-current">
          <img src={current} alt={t(lang, 'Capa atual', 'Current cover')} />
          {allowRemove && <button type="button" className="btn btn-ghost btn-sm" disabled={busy || working} onClick={() => onPick(null, null)}>{t(lang, 'Remover capa', 'Remove cover')}</button>}
        </div>
      )}
      <div className="shell-cover-grid" role="listbox" aria-label={t(lang, 'Artes prontas', 'Ready-made art')}>
        {COVER_ART.map(p => (
          <button key={p} type="button" role="option" aria-selected={selected === p}
            className={`shell-cover-opt ${selected === p ? 'active' : ''}`} disabled={busy || working} onClick={() => pickArt(p)}
            aria-label={coverArtName(p, lang)} title={coverArtName(p, lang)}>
            <img src={p} alt="" loading="lazy" />
          </button>
        ))}
        <button type="button" className="shell-cover-opt shell-cover-upload" disabled={busy || working} onClick={() => fileRef.current?.click()}>
          <span aria-hidden="true">⬆</span>
          <span>{t(lang, 'Enviar imagem', 'Upload image')}</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
      {working && <p className="muted text-sm" style={{ margin: 0 }}>{t(lang, 'Preparando imagem…', 'Preparing image…')}</p>}
      {err && <p className="text-sm" style={{ margin: 0, color: 'var(--blood-bright)' }}>{err}</p>}
    </div>
  );
}
