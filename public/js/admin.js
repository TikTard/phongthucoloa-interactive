// Streamer admin page (/admin): dashboard, hotkeys, viewer simulation, players, session summary.
import { Net } from './net.js';
import { Prompter } from './script.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = new Intl.NumberFormat('vi-VN');
const n0 = v => nf.format(Math.round(Number(v) || 0));
const hhmm = ts => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
const hms = ts => new Date(ts).toLocaleTimeString('vi-VN', { hour12: false });
const dateTime = ts => (ts ? new Date(ts).toLocaleString('vi-VN', { hour12: false }) : '—');
const clock = sec => {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
const durText = sec => {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h ? `${h} giờ ${m} phút` : `${m} phút ${sec % 60} giây`;
};

// the 9 guard classes (keys match the game's CLASSES in public/js/config.js)
const CLASS = {
  kiem: { name: 'Kiếm Sĩ', color: '#d9814a' },
  thuong: { name: 'Thương Binh', color: '#6ca7e0' },
  cung: { name: 'Cung Binh', color: '#3fb68b' },
  khien: { name: 'Khiên Vệ', color: '#9aa5b1' },
  phap: { name: 'Pháp Sư', color: '#a68be8' },
  y: { name: 'Y Sư', color: '#e57fa3' },
  song: { name: 'Song Đao', color: '#e8605a' },
  vo: { name: 'Võ Tăng', color: '#e0b840' },
  thich: { name: 'Thích Khách', color: '#7a6aa8' },
};
const clsName = c => CLASS[c]?.name || c || '—';

// ---------------------------------------------------------------- state
let S = null; // latest session summary from the server
let G = null; // latest gameState
let gameAt = 0;
let players = [];
let playersAt = 0;
let bans = [];
let wsOk = false;

// live host script (teleprompter) on the "Kịch bản live" tab
const prompter = new Prompter({ root: $('p-root'), tag: $('p-tag'), text: $('p-text'), note: $('p-note'), queue: $('p-queue'), counter: $('p-counter') }, () => players);
let liveSince = 0;

const net = new Net('admin', onMsg);

// ---------------------------------------------------------------- tabs
const TABS = ['dashboard', 'control', 'sim', 'players', 'summary', 'session', 'script'];
function showTab(name) {
  if (!TABS.includes(name)) name = 'dashboard';
  for (const t of TABS) $(`tab-${t}`).classList.toggle('on', t === name);
  for (const a of document.querySelectorAll('#nav a')) a.classList.toggle('on', a.dataset.tab === name);
  if (name === 'summary') { renderSummaryTab(); loadRecap(); }
  if (name === 'session') { renderCurrent(); loadHistory(); }
  if (name === 'players') renderPlayers();
  if (name === 'dashboard') renderCharts();
}
const currentTab = () => location.hash.slice(1) || 'dashboard';
window.addEventListener('hashchange', () => showTab(currentTab()));
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
  if (document.querySelector('dialog[open]')) return;
  // Shift+letter = the live bar's quick actions (Shift so a stray key press on stream does nothing)
  if (e.shiftKey) {
    const act = { P: 'pause', W: 'wave', B: 'boss', N: 'nothan', G: 'golden' }[e.key.toUpperCase()];
    if (act) { e.preventDefault(); net.send({ type: 'control', action: act, data: {} }); toast(`Đã gửi: ${QUICK[act]}`); }
    return;
  }
  if (currentTab() === 'script' && prompter.live) {
    if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); prompter.next(); return; }
    if (e.key === 'Backspace' || e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prompter.prev(); return; }
  }
  const i = Number(e.key) - 1;
  if (i >= 0 && i < TABS.length) location.hash = TABS[i];
});
const QUICK = { pause: 'tạm dừng / tiếp', wave: 'wave tiếp', boss: 'gọi boss', nothan: 'Nỏ Thần', golden: 'Giờ Vàng' };
showTab(currentTab());

// ---------------------------------------------------------------- toasts & confirm
function toast(text, ok = true) {
  const el = document.createElement('div');
  el.className = `toast${ok ? '' : ' bad'}`;
  el.textContent = text;
  $('toasts').append(el);
  setTimeout(() => el.remove(), 4000);
}
function confirmBox(title, text, yes = 'Đồng ý') {
  const d = $('confirm');
  $('confirm-title').textContent = title;
  $('confirm-text').textContent = text;
  $('confirm-yes').textContent = yes;
  return new Promise(resolve => {
    const done = v => { d.close(); $('confirm-yes').onclick = $('confirm-no').onclick = null; resolve(v); };
    $('confirm-yes').onclick = () => done(true);
    $('confirm-no').onclick = () => done(false);
    d.oncancel = () => resolve(false);
    d.showModal();
    $('confirm-no').focus();
  });
}
const admin = (action, data = {}) => net.send({ type: 'admin', action, data });

// ---------------------------------------------------------------- messages
function onMsg(msg) {
  switch (msg.type) {
    case 'status': renderTikTok(msg.status); break;
    case 'config':
      if (msg.username) $('tt-user').value = msg.username;
      if (msg.hasKey) $('tt-key').placeholder = 'Đã lưu API key (để trống để dùng lại)';
      break;
    case 'gameState':
      G = msg.state; gameAt = Date.now();
      prompter.onGame(G); renderLiveInfo();
      renderGame(); renderKpis(); renderClasses();
      break;
    case 'session':
      S = msg.session;
      S.clientOffset = Date.now() - S.now;
      renderKpis(); renderCharts(); renderClasses(); renderDonors();
      if (currentTab() === 'summary') { renderSummaryTab(); loadRecapThrottled(); }
      if (currentTab() === 'session') renderCurrent();
      break;
    case 'players':
      players = Array.isArray(msg.list) ? msg.list : [];
      playersAt = msg.at || Date.now();
      if (currentTab() === 'players') renderPlayers();
      if (!G?.classes) renderClasses();
      break;
    case 'roundEnd':
      toast(`Kết thúc ván: wave ${msg.round.wave}, hạ ${n0(msg.round.kills)} quái`);
      break;
    case 'bans': bans = msg.list || []; renderBans(); break;
    case 'notice': toast(msg.text, msg.ok !== false); if (currentTab() === 'session') loadHistory(); break;
    case 'log': addLog(msg.event); prompter.onLog(msg.event); break;
    case 'production': setLive(msg.since); break;
  }
}

// connection indicators
setInterval(() => {
  wsOk = net.ws?.readyState === 1;
  $('f-ws').className = `dot ${wsOk ? 'ok' : 'bad'}`;
  $('f-ws-t').textContent = wsOk ? 'Máy chủ: đã kết nối' : 'Máy chủ: mất kết nối…';
  const fresh = gameAt && Date.now() - gameAt < 6000;
  $('f-game').className = `dot ${fresh ? 'ok' : gameAt ? 'warn' : ''}`;
  $('f-game-t').textContent = fresh ? `Game: wave ${G?.wave ?? '—'}` : gameAt ? 'Game: không phản hồi' : 'Game: chưa thấy';
  $('g-age').textContent = gameAt ? `cập nhật ${Math.round((Date.now() - gameAt) / 1000)} giây trước` : '';
  $('alert-game').hidden = Boolean(fresh) || !wsOk;
  $('alert-tt').hidden = ttState === 'connected' || !fresh;
  renderLiveBar(fresh);
  tickDuration();
}, 1000);

// ---------------------------------------------------------------- live bar (top of every tab)
$('game-url').textContent = `${location.origin}/`;
$('copy-url').onclick = () => navigator.clipboard?.writeText(`${location.origin}/`).then(() => toast('Đã sao chép link trang game'), () => toast('Không sao chép được', false));
let ttState = 'idle';
function renderLiveBar(fresh) {
  const s = G, bar = $('livebar');
  $('lb-dot').className = `dot ${fresh ? 'ok' : gameAt ? 'warn' : ''}`;
  if (!s || !fresh) {
    $('lb-level').textContent = gameAt ? 'Trang game không phản hồi' : 'Chưa thấy trang game';
    $('lb-sub').textContent = '';
    bar.classList.remove('boss', 'paused');
    return;
  }
  const wl = s.wave ? ((s.wave - 1) % 10) + 1 : 0;
  $('lb-level').textContent = s.state === 'over' ? 'Kết thúc ván' : `Màn ${s.level} · ${s.levelName} · wave ${wl}/10`;
  const bits = [`${n0(s.soldiersAlive ?? s.soldiers)}/${n0(s.soldiers)} chiến sĩ`, `${n0(s.enemies)} quái`];
  if (s.boss) bits.unshift(`BOSS ${s.boss}`);
  if (s.state === 'rally') bits.unshift('đang tập hợp');
  if (s.twist) bits.push(s.twist.toLowerCase());
  if (s.event) bits.push(`sự kiện: ${s.event}`);
  if (s.combo > 1) bits.push(`combo x${s.combo}`);
  $('lb-sub').textContent = `· ${bits.join(' · ')}`;
  const c = Number(s.citadel) || 0;
  $('lb-wall').style.width = `${Math.max(0, Math.min(100, c))}%`;
  $('lb-wall').style.background = c > 50 ? 'var(--ok)' : c > 25 ? 'var(--accent)' : 'var(--bad)';
  $('lb-wall-v').textContent = `${n0(c)}%`;
  $('lb-pause').textContent = s.paused ? 'Tiếp tục' : 'Tạm dừng';
  $('lb-pause').classList.toggle('primary', Boolean(s.paused));
  $('lb-golden').textContent = s.golden ? 'Tắt Giờ Vàng' : 'Giờ Vàng';
  bar.classList.toggle('boss', Boolean(s.boss));
  bar.classList.toggle('paused', Boolean(s.paused));
  for (const b of document.querySelectorAll('.btn.map')) b.classList.toggle('on', Number(b.dataset.id) === s.level);
}

// ---------------------------------------------------------------- control: find a command by typing
const fold = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
$('cmd-filter').oninput = () => {
  const q = fold($('cmd-filter').value.trim());
  let any = false;
  for (const card of document.querySelectorAll('#cmdgrid .cmdcard')) {
    const title = fold(card.querySelector('h2')?.textContent);
    let n = 0;
    for (const b of card.querySelectorAll('button')) {
      const hit = !q || title.includes(q) || fold(`${b.textContent} ${b.dataset.c || ''} ${b.dataset.id || ''} ${b.dataset.k || ''} ${b.dataset.ult || ''}`).includes(q);
      b.classList.toggle('nomatch', !hit);
      if (hit) n++;
    }
    card.classList.toggle('nomatch', n === 0);
    if (n) any = true;
  }
  $('cmd-empty').hidden = any;
};

// ---------------------------------------------------------------- TikTok
const TT = { idle: 'Chưa kết nối', connecting: 'Đang kết nối…', connected: 'Đã kết nối', disconnected: 'Mất kết nối', error: 'Lỗi', ended: 'LIVE đã kết thúc' };
function renderTikTok(s) {
  const label = TT[s.state] || s.state;
  $('tt-status').textContent = `${label}${s.username ? ` · @${s.username}` : ''}${s.message ? ` · ${s.message}` : ''}`;
  $('tt-status').style.color = s.state === 'connected' ? 'var(--ok)' : s.state === 'error' ? 'var(--bad)' : '';
  $('f-tt').className = `dot ${s.state === 'connected' ? 'ok' : s.state === 'error' ? 'bad' : s.state === 'connecting' ? 'warn' : ''}`;
  $('f-tt-t').textContent = `TikTok: ${label.toLowerCase()}`;
  ttState = s.state;
}
$('tt-connect').onclick = () => {
  const username = $('tt-user').value.trim();
  if (!username) { $('tt-err').textContent = 'Nhập tên TikTok trước'; return; }
  $('tt-err').textContent = '';
  net.send({ type: 'connect', username, signApiKey: $('tt-key').value.trim() || undefined });
  $('tt-key').value = '';
};
$('tt-user').oninput = () => { $('tt-err').textContent = ''; };
$('tt-disconnect').onclick = () => net.send({ type: 'disconnect' });

// ---------------------------------------------------------------- dashboard: KPIs
function tickDuration() {
  if (!S) return;
  const sec = (Date.now() - S.clientOffset - S.startedAt) / 1000;
  const el = $('kpi-dur');
  if (el) el.textContent = clock(sec);
}
function renderKpis() {
  if (!S) return;
  const t = S.totals, sm = S.sim, g = { ...S.game, ...(G || {}) };
  const simNote = k => (sm[k] ? `giả lập ${n0(sm[k])}` : '');
  const alive = g.soldiersAlive ?? g.soldiers;
  const tiles = [
    ['Thời lượng live', `<span id="kpi-dur">—</span>`, `từ ${hhmm(S.startedAt)}`, true],
    ['Người xem duy nhất', n0(t.viewers), simNote('viewers')],
    ['Người mới', n0(t.newViewers), simNote('newViewers')],
    ['Bình luận', n0(t.chats), simNote('chats')],
    ['Tim', n0(t.likes), simNote('likes')],
    ['Quà', n0(t.gifts), simNote('gifts')],
    ['Xu', n0(t.xu), simNote('xu'), true],
    ['Follow', n0(t.follows), simNote('follows')],
    ['Share', n0(t.shares), simNote('shares')],
    ['Vào phòng', n0(t.joins), simNote('joins')],
    ['Wave / kỷ lục', `${n0(g.wave)} <span class="muted" style="font-size:15px">/ ${n0(g.record)}</span>`, `cao nhất phiên ${n0(S.game.maxWave)}`],
    ['Quái đã hạ', n0(g.kills), `${n0(S.rounds.length)} ván xong`],
    ['Boss đã hạ', n0(g.bossKills), ''],
    ['Chiến sĩ đang sống', n0(alive), `đông nhất ${n0(S.game.peakSoldiers)}`],
    ['Tuyệt kỹ đã tung', n0(g.skillsCast), ''],
  ];
  $('kpis').innerHTML = tiles.map(([k, v, s, hl]) => `<div class="kpi${hl ? ' hl' : ''}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${esc(s)}</div></div>`).join('');
  $('d-started').textContent = `Phiên bắt đầu ${dateTime(S.startedAt)}${S.dropped ? ` · đã chặn ${n0(S.dropped)} sự kiện từ người bị cấm` : ''}`;
  tickDuration();
}

// ---------------------------------------------------------------- dashboard: game strip
const STATE = { rally: 'Tập hợp', play: 'Đang đánh', over: 'Kết thúc ván' };
function renderGame() {
  const s = G;
  if (!s) return;
  const items = [
    ['Trạng thái', `${STATE[s.state] || s.state || '—'}${s.paused ? ' (tạm dừng)' : ''}`],
    ['Thành', `${n0(s.citadel)}%`],
    ['Chiến sĩ', `${n0(s.soldiersAlive ?? s.soldiers)} sống / ${n0(s.soldiers)} · ${n0(s.viewers)} người`],
    ['Quái', n0(s.enemies)], ['Anh hùng', n0(s.heroes)], ['Combo', `x${s.combo ?? 1}`], ['Bong bóng chờ', n0(s.queue)],
    ['Màn', s.level ? `${s.level}/10 · ${s.levelName}` : '—'], ['Diễn biến', s.twist || '—'], ['Boss', s.boss || '—'], ['Tuyệt kỹ', s.ultBusy ? `đang tung · chờ ${n0(s.ultQueue)}` : `chờ ${n0(s.ultQueue || 0)}`], ['Xe bắn đá quỷ', s.enemySiege ? 'đang bắn' : 'chưa'],
    ['Sự kiện', s.event || '—'], ['Giờ Vàng', s.golden ? 'BẬT' : 'tắt'], ['Chế độ khó', s.hardcore ? 'BẬT' : 'tắt'],
  ];
  $('g-strip').innerHTML = items.map(([k, v]) => `<span><span class="muted">${k}</span><b>${esc(v)}</b></span>`).join('');
}

// ---------------------------------------------------------------- dashboard: charts (inline SVG, no libraries)
let range = 60;
for (const b of document.querySelectorAll('#range button')) {
  b.onclick = () => {
    range = Number(b.dataset.r);
    for (const x of document.querySelectorAll('#range button')) x.classList.toggle('on', x === b);
    renderCharts();
  };
}
const SERIES = [
  { key: 'viewers', label: 'Người xem hoạt động', color: '#6ca7e0', agg: 'max' },
  { key: 'chats', label: 'Bình luận', color: '#3fb68b', agg: 'sum' },
  { key: 'likes', label: 'Tim', color: '#e57fa3', agg: 'sum' },
  { key: 'xu', label: 'Xu', color: '#e3b341', agg: 'sum' },
];
function renderCharts() {
  const box = $('charts');
  if (!S || !box.offsetParent) return;
  if (!box.children.length) {
    box.innerHTML = SERIES.map(s => `<div class="chart" data-k="${s.key}"><div class="head"><b>${s.label}</b><span></span></div><svg></svg></div>`).join('');
  }
  const tl = S.timeline || [];
  const data = range ? tl.slice(-range) : tl;
  for (const s of SERIES) {
    const wrap = box.querySelector(`[data-k="${s.key}"]`);
    const vals = data.map(b => b[s.key] || 0);
    const total = s.agg === 'max' ? Math.max(0, ...vals) : vals.reduce((a, b) => a + b, 0);
    const last = vals.length ? vals[vals.length - 1] : 0;
    wrap.querySelector('.head span').textContent = `${s.agg === 'max' ? 'cao nhất' : 'tổng'} ${n0(total)} · phút này ${n0(last)}`;
    drawBars(wrap.querySelector('svg'), data, s);
  }
}
function drawBars(svg, data, s) {
  const W = Math.max(200, svg.clientWidth || 300), H = 110, padL = 34, padB = 16, padT = 6;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const vals = data.map(b => b[s.key] || 0);
  const max = Math.max(1, ...vals);
  const n = Math.max(vals.length, range || 10);
  const bw = (W - padL) / n;
  const ih = H - padB - padT;
  let out = `<line class="axis" x1="${padL}" x2="${W}" y1="${H - padB + .5}" y2="${H - padB + .5}"/>`;
  out += `<line class="axis" x1="${padL}" x2="${W}" y1="${padT + .5}" y2="${padT + .5}" stroke-dasharray="2 3"/>`;
  out += `<text x="${padL - 4}" y="${padT + 8}" text-anchor="end">${esc(n0(max))}</text><text x="${padL - 4}" y="${H - padB}" text-anchor="end">0</text>`;
  const off = n - vals.length; // right-align: newest minute at the right edge
  vals.forEach((v, i) => {
    const h = v ? Math.max(1.5, (v / max) * ih) : 0;
    const x = padL + (off + i) * bw;
    const b = data[i];
    out += `<rect x="${(x + bw * 0.12).toFixed(1)}" y="${(H - padB - h).toFixed(1)}" width="${Math.max(1, bw * 0.76).toFixed(1)}" height="${h.toFixed(1)}" fill="${s.color}" opacity="${i === vals.length - 1 ? 1 : 0.78}"><title>${hhmm(S.startedAt + b.m * 60000)} · ${s.label}: ${n0(v)}</title></rect>`;
  });
  if (data.length) {
    out += `<text x="${padL + off * bw}" y="${H - 3}">${hhmm(S.startedAt + data[0].m * 60000)}</text>`;
    out += `<text x="${W}" y="${H - 3}" text-anchor="end">${hhmm(S.startedAt + data[data.length - 1].m * 60000)}</text>`;
  }
  svg.innerHTML = out;
}
let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(renderCharts, 150); });

// ---------------------------------------------------------------- dashboard: classes & donors
function classCounts() {
  const c = G?.classes || S?.game?.classes;
  if (c && Object.keys(c).length) return c;
  const out = {};
  for (const p of players) if (p.cls) out[p.cls] = (out[p.cls] || 0) + 1;
  return out;
}
function renderClasses() {
  const c = classCounts();
  const entries = Object.entries(c).filter(([, v]) => v > 0);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  $('cls-total').textContent = total ? `${n0(total)} chiến sĩ` : '';
  if (!total) { $('cls-bar').innerHTML = ''; $('cls-legend').innerHTML = '<span class="muted">Chưa có dữ liệu</span>'; return; }
  const order = [...Object.keys(CLASS), ...entries.map(([k]) => k).filter(k => !CLASS[k])];
  const rows = order.map(k => [k, c[k] || 0]).filter(([, v]) => v > 0);
  $('cls-bar').innerHTML = rows.map(([k, v]) => `<div style="width:${(v / total) * 100}%;background:${CLASS[k]?.color || '#626b73'}" title="${esc(clsName(k))}: ${v}"></div>`).join('');
  $('cls-legend').innerHTML = rows.map(([k, v]) => `<span><i style="background:${CLASS[k]?.color || '#626b73'}"></i>${esc(clsName(k))} <b class="num">${n0(v)}</b> <span class="muted">${Math.round((v / total) * 100)}%</span></span>`).join('');
}
function donorTable(list, empty = 'Chưa có quà') {
  if (!list?.length) return `<div class="empty">${empty}</div>`;
  return `<table><thead><tr><th>#</th><th>Tên</th><th class="r">Quà</th><th class="r">Xu</th></tr></thead><tbody>${list.map((d, i) => `<tr><td class="muted">${i + 1}</td><td>${esc(d.name)}${d.sim ? ' <span class="pill sim">giả lập</span>' : ''}</td><td class="r">${n0(d.gifts)}</td><td class="r">${n0(d.xu)}</td></tr>`).join('')}</tbody></table>`;
}
function renderDonors() { $('d-donors').innerHTML = donorTable(S?.topDonors?.slice(0, 5)); }

// ---------------------------------------------------------------- dashboard: event log
const logEl = $('log');
function addLog(e) {
  if (e.type === 'like' && $('log-hide-likes').checked) return;
  const what = e.type === 'chat' ? `: ${e.text ?? ''}`
    : e.type === 'gift' ? ` tặng ${e.gift?.name ?? 'quà'} x${e.gift?.count ?? 1} (${n0(e.gift?.total ?? e.gift?.diamonds)} xu)`
      : e.type === 'like' ? ` thả ${n0(e.count)} tim`
        : e.type === 'follow' ? ' đã follow' : e.type === 'share' ? ' đã share' : e.type === 'member' ? ' vào phòng' : ` ${e.type}`;
  const ln = document.createElement('div');
  ln.className = `ln ${e.type}`;
  ln.dataset.id = e.id || '';
  ln.dataset.name = e.name || '';
  ln.innerHTML = `<span class="t">${hms(e.ts || Date.now())}</span><span><span class="who">${esc(e.name)}</span><span class="what">${esc(what)}</span>${e.sim ? '<span class="tag">giả lập</span>' : ''}${e.isNew ? '<span class="tag">mới</span>' : ''}</span>${e.id ? '<span class="acts"><button class="btn xs" data-act="kick">Đuổi</button><button class="btn xs danger" data-act="ban">Cấm</button></span>' : '<span></span>'}`;
  const atTop = logEl.scrollTop < 8;
  logEl.prepend(ln);
  while (logEl.children.length > 300) logEl.lastChild.remove();
  if (!atTop) logEl.scrollTop += ln.offsetHeight;
}
logEl.addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const ln = b.closest('.ln');
  userAction(b.dataset.act, ln.dataset.id, ln.dataset.name);
});
async function userAction(act, id, name) {
  if (!id) return;
  if (act === 'kick') admin('kick', { id, name });
  else if (act === 'ban') {
    if (await confirmBox('Cấm người xem', `Cấm "${name || id}"? Mọi bình luận, tim, quà của người này sẽ bị bỏ qua và chiến sĩ bị xoá khỏi trận.`, 'Cấm')) admin('ban', { id, name });
  } else if (act === 'unban') admin('unban', { id });
}

// ---------------------------------------------------------------- control: ultimate tester
let ultXu = 20;
for (const b of document.querySelectorAll('#ult-xu [data-xu]')) {
  b.onclick = () => {
    ultXu = Number(b.dataset.xu);
    for (const o of document.querySelectorAll('#ult-xu [data-xu]')) o.classList.toggle('primary', o === b);
  };
}
for (const b of document.querySelectorAll('[data-ult]')) {
  b.onclick = () => net.send({ type: 'control', action: 'testUlt', data: { cls: b.dataset.ult, xu: ultXu } });
}

// ---------------------------------------------------------------- control: hotkeys & audio
for (const b of document.querySelectorAll('[data-c]')) {
  b.onclick = async () => {
    if (b.dataset.confirm && !(await confirmBox('Xác nhận', b.dataset.confirm))) return;
    net.send({ type: 'control', action: b.dataset.c, data: { id: b.dataset.id } });
  };
}
const sendAudio = () => {
  const sfx = Number($('a-sfx').value) / 100, music = Number($('a-music').value) / 100;
  $('a-sfx-v').textContent = $('a-sfx').value;
  $('a-music-v').textContent = $('a-music').value;
  net.send({ type: 'control', action: 'audio', data: { sfx, music, mute: $('a-mute').checked } });
  try { localStorage.setItem('panelAudio', JSON.stringify({ sfx: $('a-sfx').value, music: $('a-music').value, mute: $('a-mute').checked })); } catch { /* ignore */ }
};
try {
  const saved = JSON.parse(localStorage.getItem('panelAudio') || 'null');
  if (saved) { $('a-sfx').value = saved.sfx; $('a-music').value = saved.music; $('a-mute').checked = saved.mute; $('a-sfx-v').textContent = saved.sfx; $('a-music-v').textContent = saved.music; }
} catch { /* ignore */ }
$('a-sfx').oninput = sendAudio;
$('a-music').oninput = sendAudio;
$('a-mute').onchange = sendAudio;
for (const b of document.querySelectorAll('[data-snd]')) b.onclick = () => net.send({ type: 'control', action: 'sfxtest', data: { name: b.dataset.snd } });

// ---------------------------------------------------------------- simulation
const FIRST = ['Minh', 'Lan', 'Hùng', 'Hoa', 'Tú', 'Bảo', 'Hà', 'Long', 'Mai', 'Quân', 'Linh', 'Phúc', 'Trang', 'Duy', 'Nga', 'Khoa', 'Vy', 'Sơn', 'Thảo', 'An', 'Nam', 'Yến', 'Đức', 'Hải', 'Thư', 'Tâm', 'Huy', 'Ngọc', 'Phương', 'Kiên'];
const CHATS = ['cố lên anh em!', 'giữ thành nha', 'boss to quá', 'hay quá', 'lần đầu xem', 'bắn con boss đi', 'đội mình mạnh nhất', 'sắp thắng rồi', 'ai gửi quà đi', 'đỉnh thật sự', 'hello mọi người', 'game hay ghê', 'thả tim nào', 'chào streamer'];
const CLASS_CMDS = ['kiếm', 'thương', 'cung', 'khiên', 'phép', 'y', 'song', 'võ', 'thích'];
const pick = a => a[Math.floor(Math.random() * a.length)];
// continue numbering across page reloads so new sim viewers don't collide with ones still in the game
let simCount = Number(sessionStorage.getItem('simCount') || 0) || Math.floor(Math.random() * 1000) * 1000;
const simUsers = [];
function newSimUser(extra = {}) {
  simCount++;
  try { sessionStorage.setItem('simCount', String(simCount)); } catch { /* ignore */ }
  const u = { id: `sim:${simCount}`, name: `${FIRST[simCount % FIRST.length]}${simCount > FIRST.length ? simCount % 10000 : ''}` };
  simUsers.push(u);
  return { ...u, ...extra };
}
const anyUser = () => (simUsers.length ? pick(simUsers) : newSimUser());
const sim = (event, extra = {}) => net.send({ type: 'sim', event: { ...event, ...extra } });

function runSim(kind, ds) {
  const n = Number(ds.n || 1);
  switch (kind) {
    case 'join':
      for (let i = 0; i < n; i++) setTimeout(() => sim({ type: 'chat', user: newSimUser(), text: 'vào' }), i * 40);
      break;
    case 'veteran':
      sim({ type: 'chat', user: newSimUser(), text: 'vào', simXp: 3200, simNew: false });
      break;
    case 'member':
      for (let i = 0; i < n; i++) setTimeout(() => sim({ type: 'member', user: newSimUser() }), i * 80);
      break;
    case 'chat':
      for (let i = 0; i < n; i++) setTimeout(() => sim({ type: 'chat', user: anyUser(), text: pick(CHATS) }), i * 120);
      break;
    case 'cmd':
      for (let i = 0; i < n; i++) setTimeout(() => sim({ type: 'chat', user: anyUser(), text: ds.t }), i * 100);
      break;
    case 'classmix':
      for (let i = 0; i < n; i++) setTimeout(() => sim({ type: 'chat', user: anyUser(), text: pick(CLASS_CMDS) }), i * 60);
      break;
    case 'like':
      for (let i = 0; i < 6; i++) setTimeout(() => sim({ type: 'like', user: anyUser(), count: Math.ceil(n / 6) }), i * 150);
      break;
    case 'follow': sim({ type: 'follow', user: anyUser() }); break;
    case 'share': sim({ type: 'share', user: anyUser() }); break;
    case 'gift': {
      const d = Number(ds.d);
      sim({ type: 'gift', user: anyUser(), gift: { name: ds.name, diamonds: d, count: 1, total: d } });
      break;
    }
  }
}
for (const b of document.querySelectorAll('[data-sim]')) b.onclick = () => runSim(b.dataset.sim, b.dataset);

$('c-send').onclick = () => {
  const name = $('c-name').value.trim() || 'Bạn';
  const text = $('c-text').value.trim();
  if (!text) { $('c-err').textContent = 'Nhập bình luận trước'; return; }
  $('c-err').textContent = '';
  sim({ type: 'chat', user: { id: `sim:me:${name}`, name }, text });
  $('c-text').value = '';
};
$('c-text').oninput = () => { $('c-err').textContent = ''; };
$('c-text').onkeydown = e => { if (e.key === 'Enter') $('c-send').click(); };

let botTimer = null;
$('bots').onchange = e => {
  clearInterval(botTimer);
  if (!e.target.checked) return;
  if (simUsers.length < 25) runSim('join', { n: 25 });
  botTimer = setInterval(() => {
    const r = Math.random();
    if (r < 0.33) sim({ type: 'chat', user: anyUser(), text: pick(CHATS) });
    else if (r < 0.56) sim({ type: 'chat', user: anyUser(), text: 'tôi' });
    else if (r < 0.6) sim({ type: 'chat', user: anyUser(), text: pick(CLASS_CMDS) });
    else if (r < 0.84) sim({ type: 'like', user: anyUser(), count: 5 + Math.floor(Math.random() * 15) });
    else if (r < 0.89) sim({ type: 'chat', user: anyUser(), text: 'cứu' });
    else if (r < 0.93) sim({ type: 'chat', user: anyUser(), text: `nâng ${1 + Math.floor(Math.random() * 16)}` });
    else if (r < 0.98) { if ($('bot-gifts').checked && Math.random() < 0.15) sim({ type: 'gift', user: anyUser(), gift: { name: 'Hoa Hồng', diamonds: 1, count: 1, total: 1 } }); }
    else sim({ type: 'chat', user: newSimUser(), text: 'vào' });
  }, 350);
};

// ---------------------------------------------------------------- players
const PCOLS = [
  { k: 'name', label: 'Tên' }, { k: 'cls', label: 'Lớp' }, { k: 'level', label: 'Cấp', r: 1 }, { k: 'rank', label: 'Hạng' },
  { k: 'xp', label: 'XP', r: 1 }, { k: 'kills', label: 'Hạ quái', r: 1 }, { k: 'dmg', label: 'Sát thương', r: 1 },
  { k: 'gifts', label: 'Quà (xu)', r: 1 }, { k: 'alive', label: 'Trạng thái' }, { k: 'skills', label: 'Tuyệt kỹ', r: 1 },
];
let psort = { k: 'dmg', dir: -1 };
$('p-table').tHead.innerHTML = `<tr>${PCOLS.map(c => `<th class="sort${c.r ? ' r' : ''}" data-k="${c.k}">${c.label}<span class="arr"></span></th>`).join('')}<th></th></tr>`;
$('p-table').tHead.onclick = e => {
  const th = e.target.closest('th[data-k]');
  if (!th) return;
  const k = th.dataset.k;
  psort = psort.k === k ? { k, dir: -psort.dir } : { k, dir: ['name', 'cls', 'rank'].includes(k) ? 1 : -1 };
  renderPlayers();
};
$('p-search').oninput = () => renderPlayers();
$('p-cls').onchange = () => renderPlayers();
$('p-alive').onchange = () => renderPlayers();
$('p-table').tBodies[0].onclick = e => {
  const b = e.target.closest('button[data-act]');
  if (b) userAction(b.dataset.act, b.dataset.id, b.dataset.name);
};
function renderPlayers() {
  $('p-meta').textContent = playersAt ? `${n0(players.length)} người trong trận · cập nhật ${hms(playersAt)}` : 'Chưa nhận danh sách từ game';
  const clsSel = $('p-cls');
  const have = new Set(players.map(p => p.cls).filter(Boolean));
  const want = ['', ...Object.keys(CLASS).filter(k => have.has(k)), ...[...have].filter(k => !CLASS[k])];
  if (clsSel.options.length !== want.length || [...clsSel.options].some((o, i) => o.value !== want[i])) {
    const cur = clsSel.value;
    clsSel.innerHTML = want.map(k => `<option value="${esc(k)}">${k ? esc(clsName(k)) : 'Mọi lớp'}</option>`).join('');
    clsSel.value = want.includes(cur) ? cur : '';
  }
  const q = $('p-search').value.trim().toLowerCase();
  const cls = clsSel.value;
  const aliveOnly = $('p-alive').checked;
  const rows = players.filter(p => (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) && (!cls || p.cls === cls) && (!aliveOnly || p.alive));
  const { k, dir } = psort;
  rows.sort((a, b) => {
    const x = a[k], y = b[k];
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    if (typeof x === 'boolean') return ((x ? 1 : 0) - (y ? 1 : 0)) * dir;
    return String(x ?? '').localeCompare(String(y ?? ''), 'vi') * dir;
  });
  for (const th of $('p-table').tHead.querySelectorAll('th[data-k]')) th.querySelector('.arr').textContent = th.dataset.k === k ? (dir > 0 ? '▲' : '▼') : '';
  $('p-count').textContent = rows.length !== players.length ? `${n0(rows.length)} / ${n0(players.length)}` : '';
  const banned = new Set(bans.map(b => b.id));
  $('p-table').tBodies[0].innerHTML = rows.length ? rows.map(p => `<tr class="${p.alive ? '' : 'dead'}">
    <td>${esc(p.name)}${p.id.startsWith('sim:') ? ' <span class="pill sim">giả lập</span>' : ''}</td>
    <td>${CLASS[p.cls] ? `<i style="display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;background:${CLASS[p.cls].color}"></i>` : ''}${esc(clsName(p.cls))}</td>
    <td class="r">${n0(p.level)}</td><td>${esc(p.rank || '—')}</td><td class="r">${n0(p.xp)}</td><td class="r">${n0(p.kills)}</td>
    <td class="r">${n0(p.dmg)}</td><td class="r">${n0(p.gifts)}</td>
    <td>${p.alive ? '<span class="pill ok">sống</span>' : '<span class="pill">ngã</span>'}</td><td class="r">${n0(p.skills)}</td>
    <td><button class="btn xs" data-act="kick" data-id="${esc(p.id)}" data-name="${esc(p.name)}">Đuổi</button>
    ${banned.has(p.id) ? '<span class="pill">đã cấm</span>' : `<button class="btn xs danger" data-act="ban" data-id="${esc(p.id)}" data-name="${esc(p.name)}">Cấm</button>`}</td></tr>`).join('')
    : `<tr><td colspan="${PCOLS.length + 1}" class="empty">${players.length ? 'Không có ai khớp bộ lọc' : 'Chưa có người chơi (game gửi danh sách mỗi ~5 giây)'}</td></tr>`;
}
function renderBans() {
  $('bans').innerHTML = bans.length
    ? `<div class="tblwrap" style="max-height:300px"><table><thead><tr><th>Tên</th><th>ID</th><th></th></tr></thead><tbody>${bans.map(b => `<tr><td>${esc(b.name || '—')}</td><td class="muted">${esc(b.id)}</td><td><button class="btn xs" data-act="unban" data-id="${esc(b.id)}">Bỏ cấm</button></td></tr>`).join('')}</tbody></table></div>`
    : '<div class="empty">Chưa cấm ai</div>';
  if (currentTab() === 'players') renderPlayers();
}
$('bans').onclick = e => {
  const b = e.target.closest('button[data-act]');
  if (b) userAction(b.dataset.act, b.dataset.id);
};
$('ban-add').onclick = () => {
  const id = $('ban-id').value.trim();
  if (!id) { toast('Nhập ID người xem cần cấm', false); return; }
  userAction('ban', id, $('ban-name').value.trim());
  $('ban-id').value = $('ban-name').value = '';
};

// ---------------------------------------------------------------- summary (also used for past sessions)
function summaryHtml(sum) {
  const t = sum.totals || {}, sm = sum.sim || {}, r = sum.real || {}, g = sum.game || {};
  const rows = [['viewers', 'Người xem duy nhất'], ['newViewers', 'Người xem mới'], ['joins', 'Lượt vào phòng'], ['chats', 'Bình luận'], ['likes', 'Tim'], ['gifts', 'Quà (món)'], ['xu', 'Xu'], ['follows', 'Follow'], ['shares', 'Share'], ['events', 'Tổng sự kiện']];
  const totalsTbl = `<table><thead><tr><th>Chỉ số</th><th class="r">Thật</th><th class="r">Giả lập</th><th class="r">Tổng</th></tr></thead><tbody>${rows.map(([k, l]) => `<tr><td>${l}</td><td class="r">${n0(r[k])}</td><td class="r muted">${n0(sm[k])}</td><td class="r">${n0(t[k])}</td></tr>`).join('')}</tbody></table>`;
  const gameKv = [
    ['Thời lượng', durText(sum.durationSec)], ['Bắt đầu', dateTime(sum.startedAt)],
    ['Wave cao nhất', n0(g.maxWave)], ['Kỷ lục', n0(g.record)], ['Số ván', n0(sum.rounds?.length)],
    ['Quái đã hạ', n0(g.kills)], ['Boss đã hạ', n0(g.bossKills)], ['Chiến sĩ đông nhất', n0(g.peakSoldiers)],
    ['Tuyệt kỹ đã tung', n0(g.skillsCast)], ['Sự kiện bị chặn (cấm)', n0(sum.dropped)],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  const fighters = sum.topFighters?.length
    ? `<table><thead><tr><th>#</th><th>Tên</th><th>Lớp</th><th class="r">Cấp</th><th class="r">Sát thương</th><th class="r">Hạ quái</th></tr></thead><tbody>${sum.topFighters.map((f, i) => `<tr><td class="muted">${i + 1}</td><td>${esc(f.name)}${f.sim ? ' <span class="pill sim">giả lập</span>' : ''}</td><td>${esc(clsName(f.cls))}</td><td class="r">${n0(f.level)}</td><td class="r">${n0(f.dmg)}</td><td class="r">${n0(f.kills)}</td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">Chưa có dữ liệu chiến đấu</div>';
  const rounds = sum.rounds?.length
    ? `<div class="tblwrap" style="max-height:360px"><table><thead><tr><th>#</th><th>Kết thúc</th><th class="r">Wave</th><th class="r">Thời gian</th><th class="r">Hạ quái</th><th class="r">Hạ boss</th><th>Top sát thương</th></tr></thead><tbody>${sum.rounds.map((x, i) => `<tr><td class="muted">${i + 1}</td><td>${hhmm(x.endedAt)}</td><td class="r">${n0(x.wave)}</td><td class="r">${clock(x.durationSec)}</td><td class="r">${n0(x.kills)}</td><td class="r">${n0(x.bossKills)}</td><td>${(x.top || []).slice(0, 3).map(t => `${esc(t.name)} <span class="muted">${n0(t.dmg)}</span>`).join(' · ') || '—'}</td></tr>`).reverse().join('')}</tbody></table></div>`
    : '<div class="empty">Chưa kết thúc ván nào</div>';
  return `<div class="grid cols-2" style="margin-bottom:12px">
      <div class="card"><h2>Tổng số</h2>${totalsTbl}</div>
      <div class="card"><h2>Game</h2><dl class="kv">${gameKv}</dl></div>
    </div>
    <div class="grid cols-2" style="margin-bottom:12px">
      <div class="card"><h2>Top 10 ủng hộ</h2>${donorTable(sum.topDonors)}</div>
      <div class="card"><h2>Top 10 chiến binh (sát thương)</h2>${fighters}</div>
    </div>
    <div class="card"><h2>Các ván</h2>${rounds}</div>`;
}
function renderSummaryTab() {
  if (!S) return;
  $('s-meta').textContent = `Bắt đầu ${dateTime(S.startedAt)} · ${durText(S.durationSec)}`;
  const y = window.scrollY;
  $('s-body').innerHTML = summaryHtml(S);
  window.scrollTo(0, y);
}
async function loadRecap() {
  try {
    const r = await fetch('/admin/api/session.txt', { cache: 'no-store' });
    $('recap').value = await r.text();
  } catch { /* offline */ }
}
let recapT = 0;
function loadRecapThrottled() {
  if (Date.now() - recapT < 10000) return;
  recapT = Date.now();
  loadRecap();
}
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall back */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* ignore */ }
  ta.remove();
  return ok;
}
$('copy-recap').onclick = async () => {
  await loadRecap();
  const ok = await copyText($('recap').value);
  toast(ok ? 'Đã sao chép tóm tắt' : 'Không sao chép được — hãy bôi đen ô bên dưới và Ctrl+C', ok);
  if (!ok) $('recap').select();
};

// ---------------------------------------------------------------- session tab
function renderCurrent() {
  if (!S) return;
  const t = S.totals;
  $('cur-kv').innerHTML = [
    ['Bắt đầu', dateTime(S.startedAt)], ['Thời lượng', durText((Date.now() - S.clientOffset - S.startedAt) / 1000)],
    ['Người xem', `${n0(t.viewers)} (giả lập ${n0(S.sim.viewers)})`], ['Xu', `${n0(t.xu)} (giả lập ${n0(S.sim.xu)})`],
    ['Số ván', n0(S.rounds.length)], ['Wave cao nhất', n0(S.game.maxWave)],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
}
$('clear-session').onclick = async () => {
  if (await confirmBox('Xoá phiên hiện tại?', 'Phiên hiện tại được lưu vào lịch sử rồi xoá thống kê. Game sẽ xoá toàn bộ người xem, chiến sĩ, anh hùng và bắt đầu tập hợp lại.', 'Xoá & bắt đầu mới')) {
    admin('clearSession');
    $('log').innerHTML = '';
  }
};
$('reset-today').onclick = async () => {
  if (await confirmBox('Đặt lại bảng xếp hạng hôm nay?', 'XP hôm nay và quà hôm nay của mọi người sẽ về 0. Không thể hoàn tác.', 'Đặt lại')) admin('resetToday');
};
async function loadHistory() {
  let list = [];
  try { list = await (await fetch('/admin/api/sessions', { cache: 'no-store' })).json(); } catch { /* offline */ }
  const tb = $('hist').tBodies[0];
  tb.innerHTML = list.length ? list.map(s => s.error
    ? `<tr><td colspan="6" class="muted">${esc(s.file)} (lỗi đọc file)</td><td></td></tr>`
    : `<tr><td>${dateTime(s.startedAt)}</td><td class="r">${durText(s.durationSec)}</td><td class="r">${n0(s.realViewers)}${s.viewers !== s.realViewers ? ` <span class="muted">/ ${n0(s.viewers)}</span>` : ''}</td><td class="r">${n0(s.realXu)}${s.xu !== s.realXu ? ` <span class="muted">/ ${n0(s.xu)}</span>` : ''}</td><td class="r">${n0(s.maxWave)}</td><td class="r">${n0(s.rounds)}</td><td><button class="btn xs" data-file="${esc(s.file)}">Xem</button></td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">Chưa có phiên nào được lưu</td></tr>';
}
$('hist').tBodies[0].onclick = async e => {
  const b = e.target.closest('button[data-file]');
  if (!b) return;
  const file = b.dataset.file;
  let d;
  try { d = await (await fetch(`/admin/api/sessions/${encodeURIComponent(file)}`, { cache: 'no-store' })).json(); } catch { d = null; }
  if (!d || d.error) { toast('Không đọc được phiên này', false); return; }
  $('past-title').textContent = `Phiên ${dateTime(d.startedAt)} · ${durText(d.durationSec)}`;
  const base = `/admin/api/sessions/${encodeURIComponent(file)}`;
  $('past-links').innerHTML = `<a class="btn" href="${base}?download=1">Tải JSON</a><a class="btn" href="${base}?format=csv">Tải CSV</a><button class="btn" id="past-copy">Sao chép tóm tắt</button>`;
  $('past-copy').onclick = async () => {
    const text = await (await fetch(`${base}?format=txt`)).text();
    toast((await copyText(text)) ? 'Đã sao chép tóm tắt' : 'Không sao chép được', true);
  };
  $('past-body').innerHTML = summaryHtml(d);
  $('past').showModal();
};
$('past-close').onclick = () => $('past').close();
$('hist-refresh').onclick = loadHistory;

// ---------------------------------------------------------------- live production
// BẬT LIVE: the server archives the session, the game restarts from level 1 / wave 0, bots stop, the script opens.
function setLive(since) {
  liveSince = Number(since) || 0;
  prompter.setLive(liveSince);
  for (const b of [$('lb-golive'), $('p-golive')]) {
    b.classList.toggle('on', Boolean(liveSince));
    b.textContent = liveSince ? 'Kết thúc live' : '● BẬT LIVE';
  }
  $('lb-clock').classList.toggle('on', Boolean(liveSince));
  renderLiveInfo();
}
async function toggleLive() {
  if (liveSince) {
    if (await confirmBox('Kết thúc live?', 'Đồng hồ live và kịch bản sẽ dừng. Game vẫn chạy, thống kê phiên vẫn giữ (lưu ở tab Phiên).', 'Kết thúc')) admin('productionEnd');
    return;
  }
  const ok = await confirmBox('BẬT LIVE PRODUCTION?',
    'Phiên hiện tại được lưu vào lịch sử rồi xoá sạch: người xem, chiến sĩ, anh hùng, bot giả lập. Game quay về màn 1, wave 0, tắt tạm dừng / Giờ Vàng / chế độ khó. Kịch bản đọc sẽ mở ngay.',
    'Bật live');
  if (!ok) return;
  if ($('bots').checked) { $('bots').checked = false; $('bots').dispatchEvent(new Event('change')); }
  simUsers.length = 0;
  $('log').innerHTML = '';
  admin('production');
  location.hash = 'script';
}
$('lb-golive').onclick = toggleLive;
$('p-golive').onclick = toggleLive;
$('p-next').onclick = () => prompter.next();
$('p-prev').onclick = () => prompter.prev();
$('p-queue').onclick = e => { const li = e.target.closest('li'); if (li) prompter.jump(Number(li.dataset.i)); };

function renderLiveInfo() {
  const s = G || {};
  const wl = s.wave ? ((s.wave - 1) % 10) + 1 : 0;
  const rows = [
    ['Thời gian', liveSince ? clock((Date.now() - liveSince) / 1000) : 'chưa live'],
    ['Màn', s.level ? `${s.level}/10 · ${s.levelName}` : '—'], ['Wave', s.level ? `${wl}/10` : '—'],
    ['Thành', s.citadel !== undefined ? `${n0(s.citadel)}%` : '—'], ['Chiến sĩ', s.soldiers !== undefined ? `${n0(s.soldiersAlive ?? s.soldiers)}/${n0(s.soldiers)}` : '—'],
    ['Quái đã hạ', n0(s.kills)], ['Boss', s.boss || '—'], ['Xu phiên này', n0(S?.totals?.diamonds ?? S?.diamonds)],
  ];
  $('p-kv').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  $('p-pz').hidden = !s.puzzle;
  if (s.puzzle) { $('p-pz-q').textContent = `${s.puzzle}: ${s.puzzleQ}`; $('p-pz-a').textContent = s.puzzleA; }
}
setInterval(() => {
  if (liveSince) $('lb-clock-t').textContent = clock((Date.now() - liveSince) / 1000);
  if (currentTab() === 'script') renderLiveInfo();
}, 1000);
