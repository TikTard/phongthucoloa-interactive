// Puzzles shown on the scroll. The first correct answer in chat casts a skill for the whole army.
// Types: math, word scramble, missing letters, number sequence, tục ngữ (finish the proverb), riddle, trivia.
import { WORDS } from './config.js';
import { PROVERBS, RIDDLES, TRIVIA } from './puzzledata.js';
import { WORDS_HARD, PROVERBS_HARD, RIDDLES_HARD, TRIVIA_HARD } from './puzzlehard.js';
import { pick } from './util.js';

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const recent = [];
// avoid repeating the same question within the last 12
const fresh = (list, keyOf) => {
  const pool = list.filter(x => !recent.includes(keyOf(x)));
  const item = pick(pool.length ? pool : list);
  recent.push(keyOf(item));
  if (recent.length > 12) recent.shift();
  return item;
};

// hard puzzles: ★ KHÓ title, 30 s. More of them on later maps (wave counts across maps, 1-100).
export const hardChance = wave => Math.min(0.6, 0.12 + Math.max(0, wave - 1) / 150);
const HARD_SECONDS = 30;
const harden = p => ({ ...p, title: `★ KHÓ · ${p.title}`, seconds: HARD_SECONDS, hard: true });

export function makeMath(wave, hard = false) {
  const d = hard ? 4 : Math.min(3, Math.floor((wave - 1) / 5));
  let q, a;
  const r = Math.random();
  if (d === 4) {
    if (r < 0.25) { const x = ri(11, 25); q = `${x}²`; a = x * x; }
    else if (r < 0.5) { const pct = pick([5, 15, 25, 75]), base = pick([40, 80, 120, 160, 240, 360]); q = `${pct}% của ${base}`; a = pct * base / 100; }
    else if (r < 0.75) { const x = ri(12, 29), y = ri(3, 9); q = `${x} × ${y}`; a = x * y; }
    else { const x = ri(6, 12), y = ri(2, 9), z = ri(10, 40); q = `${x}² − ${y} × ${z % 10 + 2}`; a = x * x - y * (z % 10 + 2); }
    return harden({ type: 'math', title: 'GIẢI TOÁN', q: `${q} = ?`, answer: String(a), hint: 'Gõ đáp án vào bình luận' });
  }
  if (d === 0) {
    const x = ri(3, 25), y = ri(2, 20);
    if (r < 0.4) { q = `${x} + ${y}`; a = x + y; } else if (r < 0.75) { q = `${x + y} − ${y}`; a = x; } else { q = `${x} + ${x}`; a = 2 * x; }
  } else if (d === 1) {
    const x = ri(2, 9), y = ri(2, 9);
    if (r < 0.6) { q = `${x} × ${y}`; a = x * y; } else { q = `${x * y} ÷ ${y}`; a = x; }
  } else if (d === 2) {
    const x = ri(3, 9), y = ri(3, 9), z = ri(1, 9);
    if (r < 0.4) { q = `${x} × ${y} − ${z}`; a = x * y - z; } else if (r < 0.75) { q = `(${x} + ${z}) × ${y}`; a = (x + z) * y; } else { q = `${z} + ${x} × ${y}`; a = z + x * y; }
  } else {
    const x = ri(3, 9), y = ri(3, 9), z = ri(2, 9), w = ri(2, 9);
    if (r < 0.6) { q = `${x} × ${y} + ${z} × ${w}`; a = x * y + z * w; } else { q = `${x * y} ÷ ${y} × ${z}`; a = x * z; }
  }
  return { type: 'math', title: 'GIẢI TOÁN', q: `${q} = ?`, answer: String(a), hint: 'Gõ đáp án vào bình luận' };
}

export function makeWord(_wave, hard = false) {
  if (hard) return harden(makeWordFrom(WORDS_HARD));
  return makeWordFrom(WORDS);
}
function makeWordFrom(list) {
  const [word, hint] = fresh(list, w => w[0]);
  const letters = [...word.replace(/\s+/g, '')];
  let shuffled = letters;
  for (let tries = 0; tries < 10 && shuffled.join('') === letters.join(''); tries++) {
    shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  return { type: 'word', title: 'SẮP XẾP CHỮ', q: shuffled.join(' '), answer: word, hint: `Gợi ý: ${hint}` };
}

// "N Ỏ  _ H Ầ N": hide 1-2 letters of a word
export function makeMissing(_wave, hard = false) {
  const [word, hint] = fresh((hard ? WORDS_HARD : WORDS).filter(w => w[0].replace(/\s/g, '').length >= 4), w => 'm' + w[0]);
  const chars = [...word];
  const idx = chars.map((c, i) => (c === ' ' ? -1 : i)).filter(i => i >= 0);
  const hide = new Set([pick(idx)]);
  if (idx.length >= 6) hide.add(pick(idx));
  while (hard && hide.size < Math.min(idx.length - 2, Math.ceil(idx.length / 3))) hide.add(pick(idx));
  const q = chars.map((c, i) => (c === ' ' ? '  ' : hide.has(i) ? '_' : c)).join(' ');
  const p = { type: 'missing', title: 'ĐIỀN CHỮ CÒN THIẾU', q, answer: word, hint: `Gõ cả từ · ${hint}` };
  return hard ? harden(p) : p;
}

// 2, 4, 8, 16, ?
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
export function makeSequence(wave, hard = false) {
  const kind = hard ? ri(4, 8) : ri(0, wave >= 8 ? 3 : 1);
  let seq;
  if (kind === 4) { const a = ri(1, 4); seq = Array.from({ length: 5 }, (_, i) => (a + i) ** 3); }
  else if (kind === 5) { const a = ri(0, 8); seq = PRIMES.slice(a, a + 5); }
  else if (kind === 6) { const a = ri(1, 5); seq = Array.from({ length: 5 }, (_, i) => (a + i) * (a + i + 1)); }
  else if (kind === 7) { seq = [ri(1, 5)]; while (seq.length < 5) seq.push(seq[seq.length - 1] * 2 + 1); }
  else if (kind === 8) { const a = ri(2, 6), b = ri(2, 5); seq = [a]; while (seq.length < 6) seq.push(seq.length % 2 ? seq[seq.length - 1] + b : seq[seq.length - 1] * 2); }
  else if (kind === 0) { const a = ri(1, 9), d = ri(2, 9); seq = Array.from({ length: 5 }, (_, i) => a + d * i); }
  else if (kind === 1) { const a = ri(1, 4), m = ri(2, 3); seq = Array.from({ length: 5 }, (_, i) => a * m ** i); }
  else if (kind === 2) { const a = ri(1, 5); seq = Array.from({ length: 5 }, (_, i) => (a + i) ** 2); }
  else { seq = [ri(1, 3), ri(2, 5)]; while (seq.length < 5) seq.push(seq[seq.length - 1] + seq[seq.length - 2]); }
  const answer = seq.pop();
  const p = { type: 'sequence', title: 'SỐ TIẾP THEO', q: `${seq.join(', ')}, ?`, answer: String(answer), hint: 'Tìm quy luật dãy số' };
  return hard ? harden(p) : p;
}

export function makeProverb(_wave, hard = false) {
  const [q, a] = fresh(hard ? PROVERBS_HARD : PROVERBS, p => p[0]);
  const p = { type: 'proverb', title: 'TỤC NGỮ', q, answer: a, hint: 'Gõ chữ còn thiếu', long: true };
  return hard ? harden(p) : p;
}

export function makeRiddle(_wave, hard = false) {
  const r = fresh(hard ? RIDDLES_HARD : RIDDLES, x => x.q);
  const p = { type: 'riddle', title: 'CÂU ĐỐ DÂN GIAN', q: r.q, answer: r.a, accept: r.accept, hint: 'Là gì? Gõ đáp án', long: true };
  return hard ? harden(p) : p;
}

export function makeTrivia(_wave, hard = false) {
  const t = fresh(hard ? TRIVIA_HARD : TRIVIA, x => x.q);
  const p = { type: 'trivia', title: 'ĐỐ VUI', q: t.q, answer: t.a, accept: t.accept, hint: 'Ai nhanh tay nhất?', long: true };
  return hard ? harden(p) : p;
}

export const PUZZLE_TYPES = { math: makeMath, word: makeWord, missing: makeMissing, sequence: makeSequence, proverb: makeProverb, riddle: makeRiddle, trivia: makeTrivia, hard: w => makePuzzle(w, true) };

export function makePuzzle(wave, hard = Math.random() < hardChance(wave)) {
  const table = [['math', 3], ['word', 2], ['missing', 1.5], ['sequence', wave >= 3 ? 1.5 : 0.5], ['proverb', 2], ['riddle', 2], ['trivia', 2]];
  let r = Math.random() * table.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of table) { r -= w; if (r <= 0) return PUZZLE_TYPES[k](wave, hard); }
  return makeMath(wave);
}
