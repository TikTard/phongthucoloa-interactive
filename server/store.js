// Player profiles (XP, streaks) saved to data/players.json so progress carries over between streams.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const FILE = path.join(DATA_DIR, 'players.json');

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

export class PlayerStore {
  constructor() {
    this.players = {};
    this.dirty = false;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      if (fs.existsSync(FILE)) this.players = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch (err) {
      console.error('[store] could not load players.json, starting fresh:', err.message);
      this.players = {};
    }
    setInterval(() => this.flush(), 5000).unref();
  }

  // Returns the profile and whether this is the first time we've ever seen the viewer.
  touch(user) {
    const day = today();
    let p = this.players[user.id];
    let isNew = false;
    if (!p) {
      p = this.players[user.id] = { name: user.name, xp: 0, streak: 0, lastDay: '', dayXp: 0, firstSeen: Date.now() };
      isNew = true;
    }
    p.name = user.name || p.name;
    if (user.avatar) p.avatar = user.avatar;
    if (p.lastDay !== day) {
      p.streak = p.lastDay === yesterday() ? p.streak + 1 : 1;
      p.lastDay = day;
      p.dayXp = 0;
      p.dayGifts = 0;
    }
    this.dirty = true;
    return { profile: p, isNew };
  }

  addXp(id, amount, name) {
    const p = this.players[id];
    if (!p || !Number.isFinite(amount) || amount <= 0) return;
    p.xp += Math.round(amount);
    p.dayXp = (p.lastDay === today() ? p.dayXp : 0) + Math.round(amount);
    if (name) p.name = name;
    this.dirty = true;
  }

  // diamonds gifted (for the "Top ủng hộ" board)
  addGift(id, amount, name) {
    const p = this.players[id];
    if (!p || !Number.isFinite(amount) || amount <= 0) return;
    p.gifts = (p.gifts || 0) + Math.round(amount);
    p.dayGifts = (p.lastDay === today() ? p.dayGifts || 0 : 0) + Math.round(amount);
    if (name) p.name = name;
    this.dirty = true;
  }

  // admin: wipe today's leaderboard (dayXp / dayGifts) without touching all-time progress
  resetToday() {
    let n = 0;
    for (const p of Object.values(this.players)) {
      if (p.dayXp || p.dayGifts) n++;
      p.dayXp = 0;
      p.dayGifts = 0;
    }
    this.dirty = true;
    this.flush();
    return n;
  }

  leaders() {
    const all = Object.entries(this.players);
    const pick = ([id, p], key) => ({ id, name: p.name, value: p[key], xp: p.xp });
    const day = today();
    return {
      allTime: all.sort((a, b) => b[1].xp - a[1].xp).slice(0, 10).map(e => pick(e, 'xp')),
      today: all.filter(([, p]) => p.lastDay === day && p.dayXp > 0)
        .sort((a, b) => b[1].dayXp - a[1].dayXp).slice(0, 10).map(e => pick(e, 'dayXp')),
      donorsToday: all.filter(([, p]) => p.lastDay === day && p.dayGifts > 0)
        .sort((a, b) => b[1].dayGifts - a[1].dayGifts).slice(0, 10).map(e => pick(e, 'dayGifts')),
      donorsAll: all.filter(([, p]) => p.gifts > 0)
        .sort((a, b) => b[1].gifts - a[1].gifts).slice(0, 10).map(e => pick(e, 'gifts')),
    };
  }

  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.players));
    fs.renameSync(tmp, FILE);
  }
}
