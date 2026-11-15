// Giữ Thành Cổ Loa — local server
//  http://localhost:3000/        the game (add as Browser Source in TikTok LIVE Studio / OBS, 1080x1920)
//  http://localhost:3000/admin   streamer admin: connect TikTok, dashboard, hotkeys, simulate viewers, players, session summary
import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { PlayerStore, ROOT, DATA_DIR } from './store.js';
import { TikTokSource } from './tiktok.js';
import { Session, listArchives, readArchive, recapText, sessionCsv } from './session.js';
import { ttsRoute } from './tts.js';

const PORT = Number(process.env.PORT || 3000);
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const loadConfig = () => {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
};
const saveConfig = cfg => {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
};

const store = new PlayerStore();
const session = new Session();

// ---- bans (data/config.json -> bans: [{id, name}]) ----
const bans = new Map((Array.isArray(loadConfig().bans) ? loadConfig().bans : []).map(b => [String(b.id), String(b.name || '')]));
const banList = () => [...bans].map(([id, name]) => ({ id, name }));
const saveBans = () => saveConfig({ ...loadConfig(), bans: banList() });

const app = express();
const noCache = res => res.set('Cache-Control', 'no-cache');
// the old panel moved to /admin
app.get(['/panel', '/panel.html'], (_req, res) => res.redirect(302, '/admin'));
app.get('/admin', (_req, res) => { noCache(res); res.sendFile(path.join(ROOT, 'public', 'admin.html')); });

// ---- admin HTTP API (read-only; actions go over the WebSocket) ----
const stamp = ts => new Date(ts).toISOString().slice(0, 16).replace(/[:T]/g, '-');
const download = (res, name, type, body) => {
  res.set({ 'Content-Type': type, 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' });
  res.send(body);
};
app.get('/admin/api/session', (_req, res) => { res.set('Cache-Control', 'no-store'); res.json(session.summary()); });
app.get('/admin/api/session.json', (_req, res) => {
  const d = session.exportJson();
  download(res, `phien-${stamp(d.startedAt)}.json`, 'application/json; charset=utf-8', JSON.stringify(d, null, 2));
});
app.get('/admin/api/session.csv', (_req, res) => {
  const d = session.summary();
  download(res, `phien-${stamp(d.startedAt)}.csv`, 'text/csv; charset=utf-8', sessionCsv(d));
});
app.get('/admin/api/session.txt', (_req, res) => {
  res.set({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.send(recapText(session.summary()));
});
app.get('/admin/api/sessions', (_req, res) => { res.set('Cache-Control', 'no-store'); res.json(listArchives()); });
app.get('/admin/api/sessions/:file', (req, res) => {
  const file = String(req.params.file);
  const d = readArchive(file);
  if (!d) return res.status(404).json({ error: 'not found' });
  const fmt = String(req.query.format || '');
  if (fmt === 'csv') return download(res, file.replace(/\.json$/, '.csv'), 'text/csv; charset=utf-8', sessionCsv(d));
  if (fmt === 'txt') { res.set('Content-Type', 'text/plain; charset=utf-8'); return res.send(recapText(d)); }
  if (req.query.download) return download(res, file, 'application/json; charset=utf-8', JSON.stringify(d, null, 2));
  res.set('Cache-Control', 'no-store');
  res.json(d);
});
app.get('/admin/api/bans', (_req, res) => res.json(banList()));

// no-cache: browsers / OBS revalidate every file, so game updates show up on a plain reload
app.get('/tts', ttsRoute); // hero voices (Edge neural TTS, cached in data/tts-cache)
app.use(express.static(path.join(ROOT, 'public'), { setHeaders: noCache }));
app.use('/fonts', express.static(path.join(ROOT, 'node_modules/@fontsource')));
app.get('/lib/phaser.min.js', (_req, res) => res.sendFile(path.join(ROOT, 'node_modules/phaser/dist/phaser.min.js')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set(); // { ws, role: 'game' | 'admin' }
const send = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const broadcast = (role, msg) => {
  const data = JSON.stringify(msg);
  for (const c of clients) if ((!role || c.role === role) && c.ws.readyState === 1) c.ws.send(data);
};
const toGames = msg => broadcast('game', msg);
const toAdmins = msg => broadcast('admin', msg);
const hasAdmins = () => [...clients].some(c => c.role === 'admin');

// Simulated viewers (ids starting with "sim:") live only in memory so tests never touch real progress.
const simProfiles = new Map();
function touchSim(ev) {
  let p = simProfiles.get(ev.user.id);
  let isNew = false;
  if (!p) {
    p = { xp: Number(ev.simXp || 0), streak: 1 };
    isNew = ev.simNew !== false;
    simProfiles.set(ev.user.id, p);
  }
  return { profile: p, isNew };
}

// Every viewer event (real or simulated) goes through here.
function handleEvent(ev) {
  if (!ev?.user?.id) return;
  ev.user.id = String(ev.user.id);
  ev.user.name = String(ev.user.name || 'Ẩn danh').slice(0, 24);
  if (bans.has(ev.user.id)) { session.dropped(); return; } // banned: never reaches the game
  const sim = ev.user.id.startsWith('sim:');
  const { profile, isNew } = sim ? touchSim(ev) : store.touch(ev.user);
  ev.profile = { xp: profile.xp, streak: profile.streak, isNew };
  if (ev.type === 'gift' && !sim) {
    const g = ev.gift || {};
    store.addGift(ev.user.id, Number(g.total || (g.diamonds || 0) * (g.count || 1)), ev.user.name);
  }
  session.track(ev);
  sessionChanged = true;
  toGames({ type: 'event', event: ev });
  toAdmins({ type: 'log', event: { type: ev.type, id: ev.user.id, name: ev.user.name, sim, isNew, text: ev.text, gift: ev.gift, count: ev.count, ts: Date.now() } });
}

const tiktok = new TikTokSource(handleEvent, status => toAdmins({ type: 'status', status }));
const connectLive = cfg => tiktok.connect(cfg.username, cfg.signApiKey);

// live session summary -> admins (throttled)
let sessionChanged = true;
let lastPush = 0;
setInterval(() => {
  if (!hasAdmins()) return;
  const now = Date.now();
  if (!sessionChanged && now - lastPush < 15000) return;
  sessionChanged = false;
  lastPush = now;
  toAdmins({ type: 'session', session: session.summary() });
}, 2000).unref();

let liveSince = 0; // when the streamer pressed BẬT LIVE (0 = not in live mode)
const notice = (ws, text, ok = true) => send(ws, { type: 'notice', text, ok });

function adminAction(ws, action, data = {}) {
  switch (action) {
    case 'clearSession': {
      const file = session.archiveAndReset();
      simProfiles.clear();
      toGames({ type: 'control', action: 'clearSession', data: {} });
      sessionChanged = true;
      toAdmins({ type: 'session', session: session.summary() });
      toAdmins({ type: 'players', list: [], at: Date.now() });
      notice(ws, file ? `Đã lưu phiên cũ (${file}) và bắt đầu phiên mới` : 'Đã bắt đầu phiên mới');
      break;
    }
    case 'production': {
      // "BẬT LIVE": save the old session, wipe sims and restart the game from level 1, wave 0
      const file = session.archiveAndReset();
      simProfiles.clear();
      liveSince = Date.now();
      toGames({ type: 'control', action: 'production', data: {} });
      sessionChanged = true;
      toAdmins({ type: 'session', session: session.summary() });
      toAdmins({ type: 'players', list: [], at: Date.now() });
      toAdmins({ type: 'production', since: liveSince });
      notice(ws, file ? `ĐANG LIVE · phiên cũ đã lưu (${file})` : 'ĐANG LIVE · trận mới bắt đầu');
      break;
    }
    case 'productionEnd': {
      liveSince = 0;
      toAdmins({ type: 'production', since: 0 });
      notice(ws, 'Đã tắt chế độ live (game vẫn chạy)');
      break;
    }
    case 'kick': {
      const id = String(data.id || '');
      if (!id) return notice(ws, 'Thiếu id người xem', false);
      toGames({ type: 'control', action: 'kick', data: { id } });
      notice(ws, `Đã đuổi ${data.name || id} khỏi trận`);
      break;
    }
    case 'ban': {
      const id = String(data.id || '');
      if (!id) return notice(ws, 'Thiếu id người xem', false);
      const name = String(data.name || session.s.viewers[id]?.name || '').slice(0, 24);
      bans.set(id, name);
      saveBans();
      toGames({ type: 'control', action: 'kick', data: { id } });
      toAdmins({ type: 'bans', list: banList() });
      notice(ws, `Đã cấm ${name || id}`);
      break;
    }
    case 'unban': {
      const id = String(data.id || '');
      const name = bans.get(id);
      if (!bans.delete(id)) return notice(ws, 'Người này không bị cấm', false);
      saveBans();
      toAdmins({ type: 'bans', list: banList() });
      notice(ws, `Đã bỏ cấm ${name || id}`);
      break;
    }
    case 'resetToday': {
      const n = store.resetToday();
      broadcast(null, { type: 'leaders', ...store.leaders() });
      notice(ws, `Đã đặt lại bảng xếp hạng hôm nay (${n} người)`);
      break;
    }
    default:
      notice(ws, `Lệnh không hợp lệ: ${action}`, false);
  }
}

wss.on('connection', ws => {
  const client = { ws, role: 'game' };
  clients.add(client);
  ws.on('close', () => clients.delete(client));
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    switch (msg.type) {
      case 'hello':
        // 'panel' is the old name of the admin page
        client.role = msg.role === 'admin' || msg.role === 'panel' ? 'admin' : 'game';
        if (client.role === 'admin') {
          const cfg = loadConfig();
          send(ws, { type: 'status', status: tiktok.status });
          send(ws, { type: 'config', username: cfg.username || '', hasKey: Boolean(cfg.signApiKey) });
          send(ws, { type: 'session', session: session.summary() });
          send(ws, { type: 'players', list: session.s.players, at: session.s.playersAt });
          send(ws, { type: 'bans', list: banList() });
          send(ws, { type: 'production', since: liveSince });
        }
        send(ws, { type: 'leaders', ...store.leaders() });
        break;
      case 'sim': // simulated viewer event from the admin page
        handleEvent(msg.event);
        break;
      case 'control': // streamer hotkeys -> game
        if (typeof msg.action !== 'string') break;
        if (msg.action === 'clearSession') { adminAction(ws, 'clearSession'); break; }
        toGames({ type: 'control', action: msg.action, data: msg.data });
        break;
      case 'admin': // server-side admin actions
        adminAction(ws, String(msg.action || ''), msg.data || {});
        break;
      case 'xp': // game reports XP earned
        for (const row of msg.list || []) store.addXp(String(row.id), Number(row.add), row.name);
        break;
      case 'gameState': // game -> admin (wave, viewers, kills, classes...)
        if (!msg.state || typeof msg.state !== 'object') break;
        session.gameState(msg.state);
        sessionChanged = true;
        toAdmins({ type: 'gameState', state: msg.state });
        break;
      case 'roundEnd': {
        const round = session.roundEnd(msg.round || {});
        sessionChanged = true;
        toAdmins({ type: 'roundEnd', round });
        break;
      }
      case 'players': {
        const list = session.players(msg.list);
        toAdmins({ type: 'players', list, at: Date.now() });
        break;
      }
      case 'connect': {
        const cfg = loadConfig();
        const next = {
          ...cfg,
          username: msg.username || cfg.username,
          autoConnect: true, // a server restart reconnects to the LIVE on its own
          ...(msg.signApiKey ? { signApiKey: msg.signApiKey } : {}),
        };
        saveConfig(next);
        connectLive(next);
        break;
      }
      case 'disconnect':
        saveConfig({ ...loadConfig(), autoConnect: false });
        tiktok.disconnect();
        break;
    }
  });
});

setInterval(() => broadcast(null, { type: 'leaders', ...store.leaders() }), 20000).unref();

server.listen(PORT, () => {
  console.log(`\n  Giữ Thành Cổ Loa`);
  console.log(`  Game:  http://localhost:${PORT}/        (Browser Source 1080x1920)`);
  console.log(`  Admin: http://localhost:${PORT}/admin\n`);
  const cfg = loadConfig();
  if (process.env.TIKTOK_USERNAME || cfg.autoConnect) {
    connectLive({ ...cfg, username: process.env.TIKTOK_USERNAME || cfg.username, signApiKey: process.env.SIGN_API_KEY || cfg.signApiKey });
  }
});

const shutdown = () => { store.flush(); session.flush(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
