// Hero voices: Vietnamese text to speech through Microsoft Edge's online neural voices (msedge-tts, no API key).
//   GET /tts?h=<hero>&t=<text>  ->  audio/mpeg
// Every line is cached as an mp3 in data/tts-cache, so a line that was said once plays instantly afterwards; only new
// text (usually a new viewer name) goes to the service. Each new line uses its own short-lived connection.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { DATA_DIR } from './store.js';

const require = createRequire(import.meta.url);
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const CACHE_DIR = path.join(DATA_DIR, 'tts-cache');
const MALE = 'vi-VN-NamMinhNeural', FEMALE = 'vi-VN-HoaiMyNeural';
// voice + pitch/rate per hero, so the eight sound different
const HERO_VOICE = {
  cungthu: [MALE, '+8%', '+36%'],
  nothu: [MALE, '-14%', '+28%'],
  hoasu: [FEMALE, '+4%', '+40%'],
  bangnu: [FEMALE, '+10%', '+26%'],
  loisu: [MALE, '-22%', '+20%'],
  vosu: [MALE, '-4%', '+42%'],
  luongy: [MALE, '0%', '+30%'],
  phaothu: [MALE, '-8%', '+38%'],
};

const memo = new Map();    // cache key -> Buffer (small in-memory LRU on top of the disk cache)
const inflight = new Map(); // cache key -> Promise (the same line asked twice shares one request)

// one short-lived connection per new line: a kept-open socket gets dropped by the service while idle and then stalls
async function synth(voice, text, pitch, rate) {
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 6000, synthesisTimeoutMs: 8000 });
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    return await new Promise((resolve, reject) => {
      const { audioStream } = tts.toStream(text, { pitch, rate });
      const parts = [];
      const stall = setTimeout(() => reject(new Error('no audio')), FIRST_BYTE_MS);
      audioStream.on('data', d => { clearTimeout(stall); parts.push(d); });
      audioStream.on('end', () => { clearTimeout(stall); resolve(Buffer.concat(parts)); });
      audioStream.on('error', e => { clearTimeout(stall); reject(e); });
    });
  } finally {
    try { tts.close(); } catch { /* already closed */ }
  }
}

// A good request starts sending audio within ~0.7 s; a bad one hangs after turn.start and the service drops it at
// ~2.7 s (about one in three). So each attempt gives up when no audio has arrived after FIRST_BYTE_MS, and we try again
// right away, one at a time (parallel attempts get throttled), up to TRIES.
const FIRST_BYTE_MS = 3500, TRIES = 3;
async function tries(fn) {
  let err;
  for (let i = 0; i < TRIES; i++) {
    try { return await fn(); } catch (e) { err = e; }
  }
  throw err;
}

export async function speak(hero, text) {
  const [voice, pitch, rate] = HERO_VOICE[hero] || HERO_VOICE.luongy;
  const key = crypto.createHash('sha1').update(`${voice}|${pitch}|${rate}|${text}`).digest('hex');
  if (memo.has(key)) return memo.get(key);
  const file = path.join(CACHE_DIR, `${key}.mp3`);
  let buf = null;
  try { buf = fs.readFileSync(file); } catch { /* not cached yet */ }
  if (!buf) {
    if (!inflight.has(key)) {
      inflight.set(key, tries(() => synth(voice, text, pitch, rate)).finally(() => inflight.delete(key)));
    }
    buf = await inflight.get(key);
    if (!buf.length) throw new Error('empty audio');
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFile(file, buf, () => {});
  }
  memo.set(key, buf);
  if (memo.size > 300) memo.delete(memo.keys().next().value);
  return buf;
}

export function ttsRoute(req, res) {
  const hero = String(req.query.h || '');
  const text = String(req.query.t || '').replace(/[<>&]/g, ' ').trim().slice(0, 220);
  if (!text) { res.status(400).end(); return; }
  speak(hero, text)
    .then(buf => res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' }).send(buf))
    .catch(err => { console.warn('[tts]', err?.message || err); res.status(503).end(); });
}
