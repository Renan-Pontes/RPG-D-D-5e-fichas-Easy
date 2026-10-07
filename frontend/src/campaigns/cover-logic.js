// Capa da campanha: recorte 16:9 e preparação da imagem no cliente.
//
// Decisão (G4): a capa escolhida — pronta ou enviada — vira SEMPRE um dataURL
// JPEG 16:9 (≤ 450k) enviado por PUT /api/campaigns/:id/cover. Assim o backend
// continua com uma única fonte de capa (`cover_image` + `coverVer`), o telão
// (/screen/:token/cover) e os jogadores a recebem sem nenhuma regra nova, e uma
// capa pronta que mude de arquivo no futuro não altera campanhas já criadas.

import { compressImage } from '../world/image.js';

export const COVER_RATIO = 16 / 9;
export const COVER_MAX_W = 1600;
export const COVER_MAX_SOURCE_BYTES = 20 * 1024 * 1024;

const clamp01 = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5);

/**
 * Maior retângulo 16:9 dentro de (w, h). `focusY` (0 = topo, 1 = base) escolhe
 * a faixa vertical quando a imagem é mais alta que 16:9; na horizontal o corte
 * é sempre centralizado. Puro. → {sx, sy, sw, sh}
 */
export function cropRect16x9(w, h, focusY = 0.5) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  let sw = w, sh = Math.round(w / COVER_RATIO);
  if (sh > h) { sh = h; sw = Math.min(w, Math.round(h * COVER_RATIO)); }
  const sx = Math.round((w - sw) / 2);
  const sy = Math.round((h - sh) * clamp01(focusY));
  return { sx, sy, sw, sh };
}

/** Tamanho final (nunca amplia; largura ≤ max). Puro. → {w, h} */
export function coverOutputSize(sw, sh, max = COVER_MAX_W) {
  if (sw <= max) return { w: Math.max(1, sw), h: Math.max(1, sh) };
  const s = max / sw;
  return { w: max, h: Math.max(1, Math.round(sh * s)) };
}

/** A imagem é mais alta que 16:9 (vale a pena oferecer "enquadrar")? Puro. */
export const needsVerticalFrame = (w, h) => w > 0 && h > 0 && w / h < COVER_RATIO - 0.02;

/** Mensagem de erro amigável para os códigos do pipeline. */
export function coverErrorText(code, lang) {
  const pt = lang !== 'en';
  if (code === 'not_image') return pt ? 'Esse arquivo não é uma imagem. Escolha um JPG, PNG ou WebP.' : 'That file is not an image. Pick a JPG, PNG or WebP.';
  if (code === 'image_too_large') return pt ? 'Imagem pesada demais. Tente uma menor (até 20 MB).' : 'Image too heavy. Try a smaller one (up to 20 MB).';
  if (code === 'art_unavailable') return pt ? 'Não deu para carregar essa capa. Tente outra.' : 'Could not load that cover. Try another.';
  return pt ? 'Não deu para preparar a imagem.' : 'Could not prepare the image.';
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not_image')); };
    img.src = url;
  });
}

/** Lê o arquivo/URL e devolve a imagem decodificada (para recortar de novo sem reler). */
export async function readCoverSource(source) {
  let blob = source;
  if (typeof source === 'string') {
    let res;
    try { res = await fetch(source); } catch { throw new Error('art_unavailable'); }
    if (!res.ok) throw new Error('art_unavailable');
    blob = await res.blob();
  }
  if (!blob || !/^image\//.test(blob.type || '')) throw new Error('not_image');
  if (blob.size > COVER_MAX_SOURCE_BYTES) throw new Error('image_too_large');
  return loadImage(blob);
}

/**
 * Recorta em 16:9 (≤ 1600 px de largura) e comprime com `compressImage`
 * (JPEG ≤ 450k caracteres). → dataURL
 */
export async function coverDataUrlFromImage(img, focusY = 0.5) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const r = cropRect16x9(w, h, focusY);
  const out = coverOutputSize(r.sw, r.sh);
  const c = document.createElement('canvas');
  c.width = out.w; c.height = out.h;
  c.getContext('2d').drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, out.w, out.h);
  const blob = await new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('read_failed'))), 'image/jpeg', 0.92));
  const { url } = await compressImage(new File([blob], 'cover.jpg', { type: 'image/jpeg' }), COVER_MAX_W);
  return url;
}
