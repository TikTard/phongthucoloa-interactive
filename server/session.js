// Stream session tracking: one "session" = one stream.
// Every viewer event (real TikTok + simulated) is counted. Simulated events (user id "sim:...")
// are ALSO counted separately under `sim`, so totals = all events and `totals - sim` = real only.
// The recap text uses real-only numbers (and mentions simulated activity separately).
// Saved to data/session.json every ~10s; Clear archives it to data/sessions/<timestamp>.json.
import fs from 'node:fs';
import path from 'node:path';


import { DATA_DIR } from './store.js';
const FILE = path.join(DATA_DIR, 'session.json');
export const ARCHIVE_DIR = path.join(DATA_DIR, 'sessions');
const STALE_MS = 6 * 3600 * 1000; // a saved session idle this long is archived on startup
const MAX_ROUNDS = 500;
const MAX_MINUTES = 24 * 60;

const COUNT_KEYS = ['events', 'chats', 'likes', 'gifts', 'xu', 'follows', 'shares', 'joins', 'viewers', 'newViewers'];
const zero = () => Object.fromEntries(COUNT_KEYS.map(k => [k, 0]));

export const CLASS_NAMES = { kiem: 'Kiếm', thuong: 'Thương', cung: 'Cung', khien: 'Khiên', phep: 'Phép', y: 'Y' };

function fresh() {
  const now = Date.now();
  return {
    version: 1,
    startedAt: now,
    updatedAt: now,
    lastEventAt: 0,
    totals: zero(),
    sim: zero(),
    dropped: 0, // events from banned viewers
    viewers: {}, // id -> { name, sim, isNew, first, last, chats, likes, xu, gifts }
    timeline: [], // per minute since startedAt: { m, viewers, chats, likes, xu, joins, sim }
    game: {
      state: '', wave: 0, record: 0, maxWave: 0, citadel: 0, peakSoldiers: 0, peakViewers: 0,
      kills: 0, bossKills: 0, soldiersAlive: 0, classes: {}, skillsCast: 0, updatedAt: 0,
    },
    rounds: [],
    fighters: {}, // id -> best-seen { name, cls, level, dmg, kills } from the players list
    players: [], // latest players list from the game
    playersAt: 0,
  };
}

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fileStamp = ts => new Date(ts).toISOString().replace(/[:.]/g, '-');

export class Session {
  constructor() {
    this.s = fresh();
    this.dirty = false;
    this.minuteSets = new Map(); // minute index -> Set of viewer ids (active viewers that minute)
    try {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
      if (fs.existsSync(FILE)) {
        const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
        if (saved?.version === 1) {
          this.s = { ...fresh(), ...saved, game: { ...fresh().game, ...saved.game } };
          const last = this.s.lastEventAt || this.s.updatedAt;
          if (last && Date.now() - last > STALE_MS) this.archiveAndReset();
        }
      }
    } catch (err) {
      console.error('[session] could not load session.json, starting fresh:', err.message);
    }
    setInterval(() => this.flush(), 10000).unref();
  }

  minute(ts = Date.now()) {
    const m = Math.max(0, Math.floor((ts - this.s.startedAt) / 60000));
    const tl = this.s.timeline;
    if (m >= MAX_MINUTES) return tl[tl.length - 1] || null;
    while (tl.length <= m) tl.push({ m: tl.length, viewers: 0, chats: 0, likes: 0, xu: 0, joins: 0, sim: 0 });
    return tl[m];
  }

  // ev is the normalized event from handleEvent (user.id, user.name, profile.isNew)
  track(ev) {
    const now = Date.now();
    const s = this.s;
    const id = ev.user.id;
    const isSim = id.startsWith('sim:');
    const buckets = isSim ? [s.totals, s.sim] : [s.totals];
    const add = (k, n = 1) => { for (const b of buckets) b[k] += n; };
    const bucket = this.minute(now);

    let v = s.viewers[id];
    if (!v) {
      v = s.viewers[id] = { name: ev.user.name, sim: isSim, isNew: Boolean(ev.profile?.isNew), first: now, last: now, chats: 0, likes: 0, xu: 0, gifts: 0 };
      add('viewers');
      if (v.isNew) add('newViewers');
    }
    v.name = ev.user.name || v.name;
    v.last = now;
    add('events');
    if (bucket) {
      const mIdx = bucket.m;
      let set = this.minuteSets.get(mIdx);
      if (!set) {
        set = new Set();
        this.minuteSets.set(mIdx, set);
        for (const k of this.minuteSets.keys()) if (k < mIdx - 1) this.minuteSets.delete(k);
      }
      set.add(id);
      bucket.viewers = Math.max(bucket.viewers, set.size);
      if (isSim) bucket.sim++;
    }

    switch (ev.type) {
      case 'chat':
        add('chats'); v.chats++; if (bucket) bucket.chats++;
        break;
      case 'like': {
        const n = Math.max(1, num(ev.count) || 1);
        add('likes', n); v.likes += n; if (bucket) bucket.likes += n;
        break;
      }
      case 'gift': {
        const g = ev.gift || {};
        const count = Math.max(1, num(g.count) || 1);
        const xu = Math.max(0, Math.round(num(g.total) || num(g.diamonds) * count));
        add('gifts', count); add('xu', xu);
        v.gifts += count; v.xu += xu;
        if (bucket) bucket.xu += xu;
        break;
      }
      case 'follow': add('follows'); break;
      case 'share': add('shares'); break;
      case 'member': add('joins'); if (bucket) bucket.joins++; break;
    }
    s.lastEventAt = s.updatedAt = now;
    this.dirty = true;
  }

  dropped() { this.s.dropped++; this.dirty = true; }

  gameState(st = {}) {
    const g = this.s.game;
    g.state = String(st.state || '');
    g.wave = num(st.wave);
    g.record = Math.max(num(st.record), g.record);
    g.maxWave = Math.max(g.maxWave, g.wave);
    g.citadel = num(st.citadel);
    g.peakSoldiers = Math.max(g.peakSoldiers, num(st.soldiers));
    g.peakViewers = Math.max(g.peakViewers, num(st.viewers));
    g.soldiers = num(st.soldiers);
    g.gameViewers = num(st.viewers);
    if ('kills' in st) g.kills = num(st.kills);
    if ('bossKills' in st) g.bossKills = num(st.bossKills);
    if ('soldiersAlive' in st) g.soldiersAlive = num(st.soldiersAlive);
    if ('skillsCast' in st) g.skillsCast = num(st.skillsCast);
    if (st.classes && typeof st.classes === 'object') {
      g.classes = Object.fromEntries(Object.entries(st.classes).map(([k, n]) => [String(k), num(n)]));
    }
    g.updatedAt = Date.now();
    this.dirty = true;
  }

  roundEnd(r = {}) {
    const round = {
      wave: num(r.wave), durationSec: num(r.durationSec), kills: num(r.kills), bossKills: num(r.bossKills),
      endedAt: num(r.endedAt) || Date.now(),
      top: (Array.isArray(r.top) ? r.top : []).slice(0, 20).map(t => ({ id: String(t.id ?? ''), name: String(t.name || '').slice(0, 24), dmg: num(t.dmg), kills: num(t.kills) })),
    };
    this.s.rounds.push(round);
    if (this.s.rounds.length > MAX_ROUNDS) this.s.rounds.splice(0, this.s.rounds.length - MAX_ROUNDS);
    this.dirty = true;
    return round;
  }

  players(list) {
    if (!Array.isArray(list)) return [];
    const clean = list.slice(0, 2000).map(p => ({
      id: String(p.id ?? ''), name: String(p.name || 'Ẩn danh').slice(0, 24), cls: String(p.cls || ''),
      level: num(p.level), rank: p.rank == null ? '' : String(p.rank), xp: num(p.xp), kills: num(p.kills), dmg: num(p.dmg),
      gifts: num(p.gifts), alive: Boolean(p.alive), skills: num(p.skills),
    }));
    this.s.players = clean;
    this.s.playersAt = Date.now();
    for (const p of clean) {
      const f = this.s.fighters[p.id] || (this.s.fighters[p.id] = { name: p.name, cls: p.cls, level: 0, dmg: 0, kills: 0 });
      f.name = p.name; f.cls = p.cls || f.cls;
      f.level = Math.max(f.level, p.level); f.dmg = Math.max(f.dmg, p.dmg); f.kills = Math.max(f.kills, p.kills);
    }
    this.dirty = true;
    return clean;
  }

  topDonors(n = 10, includeSim = true) {
    return Object.entries(this.s.viewers)
      .filter(([, v]) => v.xu > 0 && (includeSim || !v.sim))
      .sort((a, b) => b[1].xu - a[1].xu).slice(0, n)
      .map(([id, v]) => ({ id, name: v.name, xu: v.xu, gifts: v.gifts, sim: v.sim }));
  }

  topChatters(n = 5) {
    return Object.entries(this.s.viewers).filter(([, v]) => v.chats > 0)
      .sort((a, b) => b[1].chats - a[1].chats).slice(0, n)
      .map(([id, v]) => ({ id, name: v.name, chats: v.chats, sim: v.sim }));
  }

  // damage leaders: best of (players-list totals) and (sum of per-round tops)
  topFighters(n = 10) {
    const m = new Map();
    for (const [id, f] of Object.entries(this.s.fighters)) m.set(id, { id, name: f.name, cls: f.cls, level: f.level, dmg: f.dmg, kills: f.kills });
    const sums = new Map();
    for (const r of this.s.rounds) for (const t of r.top) {
      const x = sums.get(t.id) || { name: t.name, dmg: 0, kills: 0 };
      x.dmg += t.dmg; x.kills += t.kills; x.name = t.name || x.name;
      sums.set(t.id, x);
    }
    for (const [id, x] of sums) {
      const cur = m.get(id) || { id, name: x.name, cls: '', level: 0, dmg: 0, kills: 0 };
      cur.dmg = Math.max(cur.dmg, x.dmg); cur.kills = Math.max(cur.kills, x.kills);
      m.set(id, cur);
    }
    return [...m.values()].filter(f => f.dmg > 0 || f.kills > 0)
      .sort((a, b) => b.dmg - a.dmg || b.kills - a.kills).slice(0, n)
      .map(f => ({ ...f, sim: f.id.startsWith('sim:') }));
  }

  real() {
    const t = this.s.totals, sm = this.s.sim;
    return Object.fromEntries(COUNT_KEYS.map(k => [k, t[k] - sm[k]]));
  }

  durationSec(now = Date.now()) { return Math.max(0, Math.round((now - this.s.startedAt) / 1000)); }

  // compact live summary (no per-viewer map, no players list)
  summary() {
    const s = this.s;
    this.minute(); // make sure the timeline reaches "now"
    return {
      startedAt: s.startedAt, updatedAt: s.updatedAt, lastEventAt: s.lastEventAt, now: Date.now(),
      durationSec: this.durationSec(), totals: s.totals, sim: s.sim, real: this.real(), dropped: s.dropped,
      game: s.game, timeline: s.timeline, rounds: s.rounds,
      topDonors: this.topDonors(10), topFighters: this.topFighters(10), topChatters: this.topChatters(5),
    };
  }

  // full export (summary + per-viewer list + latest players)
  exportJson() {
    return {
      ...this.summary(),
      players: this.s.players, playersAt: this.s.playersAt,
      viewers: Object.entries(this.s.viewers).map(([id, v]) => ({ id, ...v })),
    };
  }

  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.s));
      fs.renameSync(tmp, FILE);
    } catch (err) { console.error('[session] save failed:', err.message); }
  }

  isEmpty() { return this.s.totals.events === 0 && this.s.rounds.length === 0 && !this.s.game.updatedAt; }

  // archives the current session (if it had anything) and starts a new one; returns archive file name or ''
  archiveAndReset() {
    let name = '';
    if (!this.isEmpty()) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
      name = `${fileStamp(this.s.startedAt)}.json`;
      const data = { ...this.exportJson(), archivedAt: Date.now() };
      fs.writeFileSync(path.join(ARCHIVE_DIR, name), JSON.stringify(data));
    }
    this.s = fresh();
    this.minuteSets.clear();
    this.dirty = true;
    this.flush();
    return name;
  }
}

// ---- past sessions ----
const SAFE = /^[\w.-]+\.json$/;
export function listArchives() {
  let files = [];
  try { files = fs.readdirSync(ARCHIVE_DIR).filter(f => SAFE.test(f)); } catch { return []; }
  return files.sort().reverse().map(file => {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, file), 'utf8'));
      return {
        file, startedAt: d.startedAt, archivedAt: d.archivedAt || 0, durationSec: d.durationSec || 0,
        xu: d.totals?.xu || 0, viewers: d.totals?.viewers || 0, realXu: d.real?.xu ?? 0, realViewers: d.real?.viewers ?? 0,
        maxWave: d.game?.maxWave || 0, rounds: d.rounds?.length || 0,
      };
    } catch { return { file, error: true }; }
  });
}
export function readArchive(file) {
  if (!SAFE.test(file)) return null;
  try { return JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, file), 'utf8')); } catch { return null; }
}

// ---- formatting (shared by the HTTP exports) ----
export const fmtDuration = sec => {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h} giờ ${m} phút` : m ? `${m} phút ${s} giây` : `${s} giây`;
};
const n0 = v => Number(v || 0).toLocaleString('vi-VN');

// Short Vietnamese recap the streamer can paste. Uses real (non-simulated) numbers.
export function recapText(sum) {
  const r = sum.real || sum.totals;
  const g = sum.game || {};
  const date = new Date(sum.startedAt).toLocaleString('vi-VN', { hour12: false });
  const lines = [
    `Tổng kết buổi LIVE Giữ Thành Cổ Loa (${date})`,
    `- Thời lượng: ${fmtDuration(sum.durationSec)}`,
    `- Người xem: ${n0(r.viewers)} (mới ${n0(r.newViewers)}), ${n0(r.joins)} lượt vào phòng`,
    `- Bình luận: ${n0(r.chats)} · Tim: ${n0(r.likes)} · Follow: ${n0(r.follows)} · Share: ${n0(r.shares)}`,
    `- Quà: ${n0(r.gifts)} món · ${n0(r.xu)} xu`,
    `- Wave cao nhất: ${n0(g.maxWave)} (kỷ lục ${n0(g.record)}) · Quái hạ: ${n0(g.kills)} · Boss hạ: ${n0(g.bossKills)} · Số ván: ${n0(sum.rounds?.length)}`,
  ];
  const donors = (sum.topDonors || []).filter(d => !d.sim).slice(0, 5);
  if (donors.length) lines.push(`- Cảm ơn top ủng hộ: ${donors.map((d, i) => `${i + 1}. ${d.name} (${n0(d.xu)} xu)`).join(', ')}`);
  const fighters = (sum.topFighters || []).filter(f => !f.sim).slice(0, 3);
  if (fighters.length) lines.push(`- Chiến binh mạnh nhất: ${fighters.map(f => `${f.name} (${n0(f.dmg)} sát thương)`).join(', ')}`);
  if (sum.sim?.events) lines.push(`(Không tính ${n0(sum.sim.events)} sự kiện giả lập)`);
  lines.push('Cảm ơn mọi người đã cùng giữ thành! Hẹn gặp lại buổi LIVE sau.');
  return lines.join('\n');
}

const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRows = rows => rows.map(r => r.map(csvCell).join(',')).join('\r\n');

// One CSV with several blocks (UTF-8 BOM so Excel shows Vietnamese correctly)
export function sessionCsv(sum) {
  const t = sum.totals, sm = sum.sim, r = sum.real || {}, g = sum.game || {};
  const label = { events: 'Sự kiện', chats: 'Bình luận', likes: 'Tim', gifts: 'Quà (món)', xu: 'Xu', follows: 'Follow', shares: 'Share', joins: 'Vào phòng', viewers: 'Người xem duy nhất', newViewers: 'Người xem mới' };
  const out = [];
  out.push(csvRows([
    ['Tổng kết phiên'],
    ['Bắt đầu', new Date(sum.startedAt).toISOString()],
    ['Thời lượng (giây)', sum.durationSec],
    [],
    ['Chỉ số', 'Tổng', 'Thật', 'Giả lập'],
    ...Object.keys(label).map(k => [label[k], t[k], r[k], sm[k]]),
    ['Sự kiện bị chặn (ban)', sum.dropped || 0],
    [],
    ['Game'],
    ['Wave cao nhất', g.maxWave], ['Kỷ lục', g.record], ['Quái đã hạ', g.kills], ['Boss đã hạ', g.bossKills],
    ['Chiến sĩ đông nhất', g.peakSoldiers], ['Kỹ năng đã tung', g.skillsCast], ['Số ván', sum.rounds?.length || 0],
    [],
    ['Top ủng hộ'], ['#', 'ID', 'Tên', 'Xu', 'Quà', 'Giả lập'],
    ...(sum.topDonors || []).map((d, i) => [i + 1, d.id, d.name, d.xu, d.gifts, d.sim ? 'x' : '']),
    [],
    ['Top chiến binh'], ['#', 'ID', 'Tên', 'Lớp', 'Cấp', 'Sát thương', 'Hạ quái'],
    ...(sum.topFighters || []).map((f, i) => [i + 1, f.id, f.name, CLASS_NAMES[f.cls] || f.cls, f.level, f.dmg, f.kills]),
    [],
    ['Các ván'], ['#', 'Wave', 'Thời gian (giây)', 'Hạ quái', 'Hạ boss', 'Kết thúc', 'Top 1'],
    ...(sum.rounds || []).map((x, i) => [i + 1, x.wave, x.durationSec, x.kills, x.bossKills, new Date(x.endedAt).toISOString(), x.top?.[0]?.name || '']),
    [],
    ['Theo phút'], ['Phút', 'Người xem hoạt động', 'Bình luận', 'Tim', 'Xu', 'Vào phòng', 'Sự kiện giả lập'],
    ...(sum.timeline || []).map(b => [b.m, b.viewers, b.chats, b.likes, b.xu, b.joins, b.sim]),
  ]));
  return '﻿' + out.join('\r\n') + '\r\n';
}
