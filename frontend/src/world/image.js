// Compressão de imagens no cliente (contrato C4).
//
// `compressImage` veio do NodeEditor (preparação) e agora mora aqui para o
// Mundo, a Preparação e a capa da campanha usarem o mesmo pipeline.
// `compressAvatar` faz o recorte quadrado de retrato (mesmo algoritmo do
// AvatarUpload em components/Shared.jsx) e respeita o mesmo limite.
//
// O backend aceita data:image/(jpeg|png|webp);base64 com até 450k caracteres.

export const IMAGE_MAX_CHARS = 450_000;
export const AVATAR_PX = 400;

const MAX_FILE_BYTES = 12 * 1024 * 1024;

function readAsImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type || '')) { reject(new Error('not_image')); return; }
    if (file.size > MAX_FILE_BYTES) { reject(new Error('image_too_large')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('not_image'));
      img.onload = () => resolve(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Encaixa (w, h) num quadrado de lado `max`, mantendo a proporção. Puro. */
export function fitSize(w, h, max) {
  if (w <= max && h <= max) return { w, h };
  const s = Math.min(max / w, max / h);
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

/**
 * Lê uma imagem e comprime (JPEG, lado maior ≤ max) até caber em `limit`
 * caracteres. → {url, w, h}. Erros: not_image | image_too_large | read_failed.
 */
export async function compressImage(file, max = 1280, limit = IMAGE_MAX_CHARS) {
  const img = await readAsImage(file);
  let size = max;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { w, h } = fitSize(img.width, img.height, size);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const url = c.toDataURL('image/jpeg', attempt ? 0.65 : 0.75);
    if (url.length <= limit) return { url, w, h };
    size = Math.round(size * 0.75);
  }
  throw new Error('image_too_large');
}

/** Retrato quadrado (recorte central), 400 px, JPEG. → dataURL */
export async function compressAvatar(file, px = AVATAR_PX) {
  const img = await readAsImage(file);
  const side = Math.min(img.width, img.height);
  const out = Math.min(px, side);
  const c = document.createElement('canvas');
  c.width = out; c.height = out;
  c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
  let url = c.toDataURL('image/jpeg', 0.82);
  if (url.length > IMAGE_MAX_CHARS) url = c.toDataURL('image/jpeg', 0.6);
  if (url.length > IMAGE_MAX_CHARS) throw new Error('image_too_large');
  return url;
}

/**
 * Imagem certa para cada tipo de cartão: NPC vira retrato quadrado; mapa e
 * lugares mantêm a proporção (mapas com mais resolução). → dataURL
 */
export async function compressForEntry(file, { kind, isMap } = {}) {
  if (kind === 'npc') return compressAvatar(file, 512);
  const { url } = await compressImage(file, isMap ? 1800 : 1280);
  return url;
}
