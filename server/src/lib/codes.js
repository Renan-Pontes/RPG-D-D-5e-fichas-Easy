// Geradores de identificadores curtos/aleatórios usados em campanhas.
import crypto from 'node:crypto';

const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I

function pick(alphabet, len) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function newSlug() {
  return pick(SLUG_ALPHABET, 10);
}

export function newScreenToken() {
  return crypto.randomBytes(16).toString('hex');
}

export function newInviteCode() {
  return pick(CODE_ALPHABET, 6);
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || newSlug();
}
