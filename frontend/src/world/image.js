// Compressão e processamento de imagens no cliente (contrato C4).
//
// O Mundo, a Preparação e a capa da campanha usam este módulo.
// O backend aceita data:image/(jpeg|png|webp|gif);base64 com até 5.000.000 caracteres,
// ou URLs externas http(s):// diretas.

export const IMAGE_MAX_CHARS = 4_500_000;
export const AVATAR_PX = 800;

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type || '')) { reject(new Error('not_image')); return; }
    if (file.size > MAX_FILE_BYTES) { reject(new Error('image_too_large')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_failed'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('not_image'));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

/** Encaixa (w, h) num retângulo com lado maior ≤ `max`, mantendo proporção. Puro. */
export function fitSize(w, h, max) {
  if (w <= max && h <= max) return { w, h };
  const s = Math.min(max / w, max / h);
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

/**
 * Lê uma imagem e preserva resolução original total sempre que couber no limite.
 * Se exceder `max` ou `limit`, comprime mantendo alta fidelidade (qualidade 0.92 inicial).
 * → {url, w, h}. Erros: not_image | image_too_large | read_failed.
 */
export async function compressImage(file, max = 3840, limit = IMAGE_MAX_CHARS) {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // Pass-through sem perdas quando já cabe dentro do limite e da resolução máxima
  if (dataUrl.length <= limit && origW <= max && origH <= max) {
    return { url: dataUrl, w: origW, h: origH };
  }

  let size = max;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { w, h } = fitSize(origW, origH, size);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (ctx.imageSmoothingEnabled !== undefined) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    ctx.drawImage(img, 0, 0, w, h);

    const quality = attempt === 0 ? 0.92 : (attempt === 1 ? 0.85 : 0.75);
    const url = c.toDataURL('image/jpeg', quality);
    if (url.length <= limit) return { url, w, h };
    size = Math.round(size * 0.75);
  }
  throw new Error('image_too_large');
}

/** Retrato quadrado (recorte central), 800 px, alta qualidade. → dataURL */
export async function compressAvatar(file, px = AVATAR_PX) {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  const side = Math.min(origW, origH);
  const out = Math.min(px, side);

  const c = document.createElement('canvas');
  c.width = out; c.height = out;
  const ctx = c.getContext('2d');
  if (ctx.imageSmoothingEnabled !== undefined) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  ctx.drawImage(img, (origW - side) / 2, (origH - side) / 2, side, side, 0, 0, out, out);

  let url = c.toDataURL('image/jpeg', 0.92);
  if (url.length > IMAGE_MAX_CHARS) url = c.toDataURL('image/jpeg', 0.80);
  if (url.length > IMAGE_MAX_CHARS) url = c.toDataURL('image/jpeg', 0.65);
  if (url.length > IMAGE_MAX_CHARS) throw new Error('image_too_large');
  return url;
}

/**
 * Imagem certa para cada tipo de cartão: NPC vira retrato quadrado; mapa e
 * lugares mantêm a proporção (mapas com resolução 4K até 3840px). → dataURL
 */
export async function compressForEntry(file, { kind, isMap } = {}) {
  if (kind === 'npc') return compressAvatar(file, 800);
  const { url } = await compressImage(file, isMap ? 3840 : 2560);
  return url;
}

// ---------------------------------------------------------------- Auto-Fit & Proporções
const ratioCache = new Map();

/**
 * Carrega e calcula a proporção w / h de uma URL de imagem (com cache).
 * Retorna { width, height, ratio } ou null em falha.
 */
export function fetchImageRatio(url) {
  if (!url) return Promise.resolve(null);
  if (ratioCache.has(url)) return Promise.resolve(ratioCache.get(url));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || img.width || 1;
      const h = img.naturalHeight || img.height || 1;
      const res = { width: w, height: h, ratio: w / h };
      ratioCache.set(url, res);
      resolve(res);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Ajusta a zona retangular no mapa pai para que a proporção visual do retângulo
 * na tela seja EXATAMENTE igual à proporção da imagem do cartão de destino (childRatio).
 *
 * Fórmula:
 *   Proporção na tela = (zone.w * W_pai) / (zone.h * H_pai) = (zone.w / zone.h) * parentRatio
 *   Queremos: (zone.w / zone.h) * parentRatio = childRatio
 *   => zone.w / zone.h = childRatio / parentRatio (K)
 *   => zone.h = zone.w / K
 *
 * Mantém o centro (cx, cy) da zona fixo.
 */
export function autoFitZoneRatio(zone, parentRatio, childRatio) {
  if (!zone || !parentRatio || !childRatio || parentRatio <= 0 || childRatio <= 0) return zone;
  const K = childRatio / parentRatio; // razão w/h desejada em coordenadas normalizadas [0..1]
  let w = zone.w || 0.2;
  let h = w / K;

  if (h > 0.85) {
    h = 0.85;
    w = h * K;
  }
  if (w > 0.95) {
    w = 0.95;
    h = w / K;
  }

  const cx = zone.x + (zone.w || 0.2) / 2;
  const cy = zone.y + (zone.h || 0.2) / 2;
  const x = Math.max(0, Math.min(1 - w, cx - w / 2));
  const y = Math.max(0, Math.min(1 - h, cy - h / 2));

  return {
    ...zone,
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
    w: Math.round(w * 1000) / 1000,
    h: Math.round(h * 1000) / 1000,
  };
}
