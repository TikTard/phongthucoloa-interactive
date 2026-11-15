import { BAD_WORDS } from './config.js';

// "Bắn  ĐI" -> "ban di"  (no accents, lower case, single spaces)
export const fold = s => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/\s+/g, ' ').trim();

// answers ignore accents AND spaces: "co loa" == "CỔLOA"
export const foldAnswer = s => fold(s).replace(/[^a-z0-9]/g, '');

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Whole-word match on the exact spellings in BAD_WORDS (accents matter, so "lớn"/"các"/"đeo" stay safe).
// Add common no-accent spellings to BAD_WORDS explicitly when you see them in chat.
const badRes = BAD_WORDS.map(w => new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRe(w)})(?=$|[^\\p{L}\\p{N}])`, 'giu'));

// Replace bad words with ***.
export function clean(text) {
  let out = String(text || '');
  for (const re of badRes) out = out.replace(re, (_m, pre) => pre + '***');
  return out;
}

export const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmt = n => Math.round(n).toLocaleString('vi-VN');
