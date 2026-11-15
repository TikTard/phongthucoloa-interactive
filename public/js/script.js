// Live host script ("kịch bản live") for the admin page: a teleprompter that tells the streamer what to say.
// It opens with a fixed introduction, then reacts to the game (waves, bosses, low citadel, new maps, puzzles,
// events) and to viewers (gifts, follows, shares, newcomers). When nothing happens it fills in with reminders.
// The host reads the big card and presses Space (or "Tiếp") for the next one. Urgent cards jump the queue.
//
// Text marks: *word* = highlighted command / keyword.

const ULT = {
  kiem: ['Kiếm Sĩ', 'Kiếm Phong Bạo'], thuong: ['Thương Binh', 'Thương Long Đột'], cung: ['Cung Binh', 'Vạn Tiễn Xuyên Vân'],
  khien: ['Khiên Vệ', 'Thiết Bích Trấn Thủ'], phap: ['Pháp Sư', 'Lôi Hỏa Thiên Giáng'], y: ['Y Sư', 'Hồi Xuân Diệu Thủ'],
  song: ['Song Đao', 'Song Long Loạn Vũ'], vo: ['Võ Tăng', 'Kim Cang Phục Ma'], thich: ['Thích Khách', 'Ảnh Sát Vô Hình'],
};

const OPENING = [
  { tag: 'Mở đầu', text: 'Xin chào cả nhà! Chào mừng mọi người đến với *Giữ Thành Cổ Loa*, trò chơi thủ thành mà chính các bạn là quân lính! Quái vật đang kéo tới, thành đang cần người!', note: 'Nói chậm, nhìn camera, cười.' },
  { tag: 'Cách vào', text: 'Muốn ra trận rất dễ: gõ *vào* trong bình luận. Tên bạn sẽ hiện ngay trên đầu một chiến sĩ trên tường thành!', note: 'Chỉ tay vào khu tường thành phía dưới.' },
  { tag: 'Chọn lớp', text: 'Có 9 lớp để chọn: gõ *kiếm*, *thương*, *cung*, *khiên*, *phép*, *y*, *song*, *võ* hoặc *thích*. Muốn nhanh thì gõ *vào cung* là vừa vào vừa chọn luôn!', note: 'Khiên trâu nhất, Y Sư hồi máu, Thích Khách sát thương cao.' },
  { tag: 'Lệnh', text: 'Trong trận: gõ *cứu* để cứu đồng đội đang dưỡng thương, *nâng* kèm số ô để nâng cấp anh hùng. Gõ *tôi* để xem cấp và số quái mình đã hạ.', note: '' },
  { tag: 'Tim · Follow · Share', text: 'Thả tim là nạp *Nỏ Thần*, đủ tim là Nỏ Thần bắn quét cả bản đồ! *Follow* kênh được tặng ngay một Cung Thủ anh hùng và hồi sinh 3 chiến sĩ. *Chia sẻ* live thì sửa thành thêm máu.', note: '' },
  { tag: 'Quà = Tuyệt kỹ', text: 'Tặng quà là chiến sĩ của bạn tung *tuyệt kỹ*, cả màn hình zoom vào bạn luôn! Từ *20 xu* lên tuyệt kỹ cấp II, từ *100 xu* là Tuyệt Kỹ toàn phần, cực kỳ hoành tráng.', note: 'Không ép tặng quà, chỉ giới thiệu.' },
  { tag: 'Vào trận', text: 'Mỗi màn có *10 wave*, qua *10 màn* là thắng chung cuộc, mỗi màn đổi bản đồ và khó hơn. Rồi, cả nhà gõ *vào* đi nào, trận sắp bắt đầu!', note: 'Đếm ngược cùng màn hình.' },
];

const FILLER = [
  'Ai mới vào live thì gõ *vào* để nhập ngũ nhé, tên bạn sẽ hiện ngay trên tường thành!',
  'Nhớ thả tim liên tục để nạp *Nỏ Thần* nha cả nhà, đủ tim là bắn quét cả bản đồ!',
  'Chiến sĩ nào đang nằm viện thì đồng đội gõ *cứu* để kéo dậy nhé!',
  'Gõ *tôi* để xem bạn đang cấp mấy, hạ được bao nhiêu quái rồi!',
  'Bạn chưa thích lớp hiện tại? Gõ *khiên*, *y*, *phép*… để đổi lớp bất cứ lúc nào.',
  '*Follow* kênh để nhận Cung Thủ anh hùng miễn phí và hồi sinh 3 chiến sĩ nha!',
  'Chia sẻ live cho bạn bè vào cùng giữ thành, mỗi lượt *chia sẻ* là sửa thành thêm máu đó!',
  'Thả tim liên tục đi cả nhà, quái càng đông thì càng cần *Nỏ Thần*!',
  'Ai đang đứng top bảng xếp hạng nhỉ? Hạ quái, giải đố và tặng quà đều được cộng XP đó!',
  'Có anh hùng trên ô thì gõ *nâng* kèm số ô, ví dụ *nâng 3*, để anh hùng mạnh hơn!',
];

const WAVE_LINES = [
  'Wave {w}/10 tới rồi! Giữ vững tường thành nha cả nhà!',
  'Wave {w}! Quái đông hơn rồi đó, thả tim nạp *Nỏ Thần* nào!',
  'Wave {w}/10 · {soldiers} chiến sĩ đang trên tường thành, ai chưa vào thì gõ *vào* nhé!',
  'Wave {w}! Ai đang nằm viện thì nhờ đồng đội gõ *cứu* nha!',
];

const EVENTS = {
  rain: 'Trời mưa rồi! Mưa làm quái chậm lại, tranh thủ thả tim nạp *Nỏ Thần* nào!',
  charge: 'Voi Quỷ lao tới! Cả nhà thả tim nạp *Nỏ Thần* để chặn nó lại!',
  treasure: 'Kho báu chạy ngang màn hình! Gõ *cướp* thật nhanh để giành vàng!',
  meteor: 'Mưa thiên thạch! Cẩn thận, cả chiến trường đang rung chuyển!',
  tornado: 'Lốc xoáy xuất hiện! Quái bị cuốn bay tứ tung!',
  festival: 'Lễ hội! Mọi người được thưởng thêm, quẩy lên nào!',
  fog: 'Sương mù kéo tới, khó nhìn quá! Cứ thả tim đều tay nha!',
  ambush: 'Phục kích! Quái tràn ra từ hai bên, cẩn thận!',
  chestrun: 'Rương báu biết chạy! Bắn nó trước khi nó trốn mất!',
  quake: 'Động đất! Cả bản đồ rung lắc!',
};

const PRI = { low: 1, normal: 2, urgent: 3 };
const TTL = { 1: 60000, 2: 150000, 3: 45000 };

const fill = (t, d) => t.replace(/\{(\w+)\}/g, (_, k) => (d[k] ?? ''));
const names = list => (list.length <= 3 ? list.join(', ') : `${list.slice(0, 3).join(', ')} và ${list.length - 3} bạn nữa`);

export class Prompter {
  // el: { tag, text, note, queue, counter }, players(): latest players list from the game
  constructor(el, players) {
    this.el = el;
    this.players = players;
    this.since = 0;
    this.cur = null;
    this.queue = [];
    this.history = [];
    this.G = null;
    this.fillerI = 0;
    this.waveI = 0;
    this.lastCardAt = Date.now();
    this.lastRecap = 0;
    this.batch = { join: [], follow: [], share: [], smallGift: [] };
    this.seen = new Set();
    this.lowWarned = false;
    this.milestone = 0;
    setInterval(() => this.tick(), 1000);
    this.render();
  }

  setLive(since) {
    const fresh = since && since !== this.since;
    this.since = since;
    if (fresh) {
      this.queue = [];
      this.history = [];
      this.cur = null;
      this.seen.clear();
      this.milestone = 0;
      this.lastRecap = since;
      for (const b of Object.values(this.batch)) b.length = 0;
      OPENING.forEach((c, i) => this.queue.push({ ...c, pri: PRI.normal, kind: 'opening', at: Date.now(), ttl: Infinity, step: `${i + 1}/${OPENING.length}` }));
      this.next();
    }
    this.render();
  }

  get live() { return Boolean(this.since); }

  add(card) {
    if (!this.live) return;
    card.at = Date.now();
    card.pri = card.pri || PRI.normal;
    card.ttl = card.ttl ?? TTL[card.pri];
    if (card.key) { // one card per key at a time (e.g. one boss card)
      this.queue = this.queue.filter(c => c.key !== card.key);
      if (this.cur?.key === card.key) { this.cur = card; this.render(); return; }
    }
    // urgent cards interrupt anything but another urgent card; the interrupted card goes back on the queue
    if (card.pri === PRI.urgent && (!this.cur || this.cur.pri < PRI.urgent)) {
      if (this.cur && this.cur.kind !== 'filler') this.queue.unshift(this.cur);
      this.show(card);
      return;
    }
    this.queue.push(card);
    this.queue.sort((a, b) => (a.kind === 'opening') - (b.kind === 'opening') || b.pri - a.pri || a.at - b.at);
    // keep openings in order at the front while they last
    const op = this.queue.filter(c => c.kind === 'opening');
    if (op.length) this.queue = [...op, ...this.queue.filter(c => c.kind !== 'opening')];
    if (!this.cur || this.cur.kind === 'filler') this.next();
    else this.render();
  }

  show(card) {
    if (this.cur) this.history.push(this.cur);
    if (this.history.length > 50) this.history.shift();
    this.cur = card;
    this.cur.shownAt = Date.now();
    this.lastCardAt = Date.now();
    this.render();
  }

  next() {
    const now = Date.now();
    this.queue = this.queue.filter(c => now - c.at < c.ttl);
    const c = this.queue.shift();
    if (c) this.show(c);
    else if (this.live) this.show({ tag: 'Nhắc khán giả', text: FILLER[this.fillerI++ % FILLER.length], kind: 'filler', pri: PRI.low });
    else this.render();
  }

  prev() {
    const c = this.history.pop();
    if (!c) return;
    if (this.cur) this.queue.unshift(this.cur);
    this.cur = c;
    this.render();
  }

  jump(i) {
    const [c] = this.queue.splice(i, 1);
    if (!c) return;
    if (this.cur && this.cur.kind !== 'filler') this.queue.unshift(this.cur);
    this.show(c);
  }

  // ---------------------------------------------------------------- inputs
  onGame(g) {
    const p = this.G;
    this.G = g;
    if (!this.live || !p) return;
    const wl = g.wave ? ((g.wave - 1) % 10) + 1 : 0;
    if (g.level !== p.level) {
      if (p.level === 10 && g.level === 1 && g.state !== 'over') this.add({ tag: 'THẮNG CHUNG CUỘC', text: 'THẮNG CHUNG CUỘC!!! Cả nhà đã giữ được Thành Cổ Loa qua đủ 10 màn! Cảm ơn tất cả các chiến binh, quá đỉnh luôn!', note: 'Ăn mừng thật to. Đọc tên top người chơi ở tab Người chơi.', pri: PRI.urgent, key: 'level' });
      else if (g.level > p.level) this.add({ tag: `Màn ${g.level}`, text: `Qua màn ${p.level} rồi! Chào mừng đến *${g.levelName}*. Quân và cấp vẫn giữ nguyên, nhưng quái ở đây mạnh hơn đó, chuẩn bị tinh thần nha!`, note: 'Bản đồ, nhạc và thời tiết đều đổi.', pri: PRI.normal, key: 'level' });
    }
    if (g.wave > p.wave && g.state === 'play') {
      if (wl === 1) this.add({ tag: `Màn ${g.level} · Wave 1`, text: `Màn ${g.level}: *${g.levelName}*! Wave đầu tiên bắt đầu, giữ vững tường thành nào!`, pri: PRI.normal, key: 'wave' });
      else if (wl === 10) this.add({ tag: 'Wave cuối', text: `Wave cuối của màn ${g.level}! Qua được wave này là sang bản đồ mới, dốc hết sức nào cả nhà!`, pri: PRI.normal, key: 'wave' });
      else if (wl % 3 === 0 || g.twist) this.add({ tag: `Wave ${wl}/10`, text: fill(WAVE_LINES[this.waveI++ % WAVE_LINES.length], { w: wl, soldiers: g.soldiersAlive ?? g.soldiers }), pri: PRI.low, key: 'wave' });
      this.lowWarned = false;
    }
    if (g.twist && g.twist !== p.twist) this.add({ tag: 'Diễn biến', text: `Diễn biến wave này: *${g.twist}*! Cẩn thận nha cả nhà!`, pri: PRI.normal, key: 'twist' });
    if (g.boss && g.boss !== p.boss) this.add({ tag: 'BOSS', text: `BOSS *${g.boss}* XUẤT HIỆN! Cả nhà thả tim liên tục cho *Nỏ Thần*! Ai muốn tung tuyệt kỹ thì đây là lúc đẹp nhất!`, note: 'Giọng gấp gáp. Màn hình đang cháy rực.', pri: PRI.urgent, key: 'boss' });
    if ((g.bossKills || 0) > (p.bossKills || 0)) this.add({ tag: 'Hạ boss', text: `HẠ ĐƯỢC ${p.boss ? `*${p.boss}*` : 'BOSS'} RỒI!!! Cảm ơn cả nhà, mấy chiến binh hôm nay quá đỉnh!`, pri: PRI.urgent, key: 'boss' });
    if (g.state === 'play' && g.citadel <= 35 && g.citadel > 0 && !this.lowWarned) {
      this.lowWarned = true;
      this.add({ tag: 'THÀNH NGUY', text: `Thành sắp vỡ, chỉ còn *${g.citadel}%*! Gõ *cứu*, *chia sẻ* live để sửa thành, nhanh lên cả nhà!`, pri: PRI.urgent, key: 'wall' });
    }
    if (g.state === 'over' && p.state !== 'over') this.add({ tag: 'Thất thủ', text: `Thành Cổ Loa đã thất thủ ở wave *${g.wave}*… Không sao! Ván mới bắt đầu ngay, mọi người gõ *vào* để tập hợp lại nhé!`, note: 'Động viên, không than.', pri: PRI.urgent, key: 'over' });
    if (g.event && g.event !== p.event && EVENTS[g.event]) this.add({ tag: 'Sự kiện', text: EVENTS[g.event], pri: PRI.normal, key: 'event' });
    if (g.puzzle && g.puzzleQ !== p.puzzleQ) this.add({ tag: `Câu đố · ${g.puzzle}`, text: `Câu đố! ${g.puzzleQ} Ai trả lời đúng nhanh nhất được thưởng XP!`, note: `Đáp án (đừng đọc): ${g.puzzleA}`, pri: PRI.urgent, key: 'puzzle', ttl: 20000 });
    if (g.golden && !p.golden) this.add({ tag: 'Giờ Vàng', text: '*GIỜ VÀNG* bắt đầu! Nhân đôi XP trong 10 phút, tranh thủ leo bảng xếp hạng nào!', pri: PRI.normal, key: 'golden' });
    for (const m of [10, 25, 50, 100, 200]) {
      if (g.soldiers >= m && this.milestone < m) {
        this.milestone = m;
        this.add({ tag: 'Cột mốc', text: `Đã có *${m} chiến sĩ* trên tường thành rồi! Cảm ơn cả nhà, rủ thêm bạn bè vào cho đông vui nha!`, pri: PRI.low, key: 'milestone' });
      }
    }
  }

  onLog(ev) {
    if (!this.live || !ev) return;
    const name = ev.name || 'bạn';
    if (ev.type === 'gift') {
      const g = ev.gift || {};
      const xu = Number(g.total || (g.diamonds || 0) * (g.count || 1)) || 1;
      if (xu < 20) { this.batch.smallGift.push(name); return; }
      const cls = this.players().find(p => p.id === ev.id)?.cls;
      const u = ULT[cls];
      this.add({ tag: `Quà ${xu} xu`, text: `Cảm ơn *${name}* đã tặng ${g.name || 'quà'}${g.count > 1 ? ` x${g.count}` : ''}! ${u ? `${u[0]} của bạn tung tuyệt kỹ *${u[1]}*` : 'Tuyệt kỹ đang được tung ra'}, xem nè cả nhà!`, note: xu >= 100 ? 'Quà lớn: dừng lại, cảm ơn thật kỹ.' : '', pri: xu >= 100 ? PRI.urgent : PRI.normal, ttl: 90000 });
      return;
    }
    if (ev.type === 'member' || (ev.type === 'chat' && ev.isNew)) {
      if (!this.seen.has(ev.id)) { this.seen.add(ev.id); this.batch.join.push(name); }
    } else if (ev.type === 'follow') this.batch.follow.push(name);
    else if (ev.type === 'share') this.batch.share.push(name);
  }

  // batches + fillers + recaps, once a second
  tick() {
    if (!this.live) { this.render(); return; }
    const now = Date.now();
    const b = this.batch;
    if (!this.flushAt || now > this.flushAt) {
      this.flushAt = now + 25000;
      if (b.smallGift.length) { this.add({ tag: 'Cảm ơn quà', text: `Cảm ơn ${names([...new Set(b.smallGift)])} đã tặng quà! Chiến sĩ của các bạn vừa tung tuyệt kỹ đó!`, pri: PRI.normal, key: 'smallgift' }); b.smallGift.length = 0; }
      if (b.follow.length) { this.add({ tag: 'Cảm ơn follow', text: `Cảm ơn ${names([...new Set(b.follow)])} đã follow! Cung Thủ anh hùng đã về phe bạn rồi nha!`, pri: PRI.low, key: 'follow' }); b.follow.length = 0; }
      if (b.share.length) { this.add({ tag: 'Cảm ơn chia sẻ', text: `Cảm ơn ${names([...new Set(b.share)])} đã chia sẻ live! Thành vừa được sửa thêm máu!`, pri: PRI.low, key: 'share' }); b.share.length = 0; }
      if (b.join.length >= 2 || (b.join.length && now - this.lastCardAt > 20000)) { this.add({ tag: 'Chào bạn mới', text: `Chào ${names(b.join)}! Gõ *vào* để nhập ngũ giữ thành cùng mọi người nhé!`, pri: PRI.low, key: 'join' }); b.join.length = 0; }
    }
    if (now - this.lastRecap > 15 * 60000 && this.G) {
      this.lastRecap = now;
      const mins = Math.round((now - this.since) / 60000);
      this.add({ tag: 'Tổng kết nhanh', text: `Mình đã live được *${mins} phút*, cả nhà hạ *${this.G.kills || 0}* quái và ${this.G.bossKills || 0} boss, đang ở màn ${this.G.level} wave ${this.G.wave ? ((this.G.wave - 1) % 10) + 1 : 0}. Ai mới vào thì gõ *vào* nhập ngũ nha!`, pri: PRI.normal, key: 'recap' });
    }
    // nothing new for a while: offer a reminder
    if (this.cur?.kind !== 'opening' && !this.queue.length && now - this.lastCardAt > 75000) this.next();
    this.render();
  }

  // ---------------------------------------------------------------- view
  render() {
    const { el } = this;
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const md = s => esc(s).replace(/\*([^*]+)\*/g, '<mark>$1</mark>');
    const c = this.cur;
    el.root.classList.toggle('urgent', c?.pri === PRI.urgent);
    el.root.classList.toggle('idle', !this.live);
    if (!this.live) {
      el.tag.textContent = 'Chưa live';
      el.text.innerHTML = 'Bấm <mark>BẬT LIVE</mark> khi đã sẵn sàng. Game sẽ xoá sạch và bắt đầu lại từ màn 1, kịch bản sẽ hiện ở đây.';
      el.note.textContent = '';
      el.counter.textContent = '';
      el.queue.innerHTML = '';
      return;
    }
    el.tag.textContent = c ? `${c.tag}${c.step ? ` · ${c.step}` : ''}` : '';
    if (el.text.dataset.id !== String(c?.shownAt)) { el.text.innerHTML = c ? md(c.text) : ''; el.text.dataset.id = String(c?.shownAt); }
    el.note.textContent = c?.note || '';
    el.note.hidden = !c?.note;
    const now = Date.now();
    this.queue = this.queue.filter(q => now - q.at < q.ttl);
    el.counter.textContent = this.queue.length ? `${this.queue.length} thẻ đang chờ` : 'Hết thẻ chờ · bấm Tiếp để lấy câu nhắc';
    const html = this.queue.slice(0, 8).map((q, i) => `<li class="p${q.pri}" data-i="${i}"><b>${esc(q.tag)}</b><span>${md(q.text)}</span></li>`).join('');
    if (el.queue.dataset.html !== html) { el.queue.innerHTML = html; el.queue.dataset.html = html; }
  }
}
