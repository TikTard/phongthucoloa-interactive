// Info boards: how-to-play guide, gift guide, top fighters and top supporters.
//  - Two small signboards hang on the citadel wall during battle (left: guide, right: rankings).
//  - Between rounds a big scroll over the field shows everything page by page.
import { W, CITADEL_Y, GIFT_TIERS, HEROES } from './config.js';
import { panel, ptext, htext, banner, HEAD, TEST } from './ui.js';
import { clean, fmt, truncate } from './util.js';

// [key, full text for the big scroll, short text for the wall sign]
const GUIDE = [
  ['vào', 'nhập ngũ, xuất thành đánh quái', 'nhập ngũ'],
  ['Lớp', 'kiếm · thương · cung · khiên · phép · y · song · võ · thích', 'kiếm/cung/võ/thích'],
  ['Thể lực', 'anh hùng đầy thanh vàng → tuyệt kỹ', 'anh hùng → tuyệt kỹ'],
  ['tôi', 'xem lớp, cấp, số quái đã hạ', 'xem cấp'],
  ['cứu', 'hồi sinh đồng đội ngay', 'hồi sinh đồng đội'],
  ['nâng 3', 'nâng anh hùng ở ô số 3', 'nâng ô số 3'],
  ['Thả tim', 'nạp Nỏ Thần, bắn cả bãi', 'nạp Nỏ Thần'],
  ['Follow', 'nhận Cung Thủ miễn phí', 'Cung Thủ free'],
  ['Share', 'sửa tường thành', 'sửa thành'],
  ['Giải đố', 'ai đúng trước tung chiêu', 'tung chiêu'],
];

const CMDS = new Set(['vào', 'tôi', 'cứu', 'nâng 3']);
const keyLabel = k => (CMDS.has(k) ? `"${k}"` : k);
// a gift fires the gifter's class ultimate; the gift size sets its power
const GIFTS = [
  ['1 xu', 'tung tuyệt kỹ lớp của bạn'],
  ['5 xu', 'tuyệt kỹ mạnh x1.6'],
  ['20 xu', 'tuyệt kỹ II · x2.2'],
  ['100 xu', 'TUYỆT KỸ · x2.8, hiệu ứng lớn'],
  ['1000 xu', 'x3.7 · rung chuyển chiến trường'],
  ['Chết?', 'tặng quà = hồi sinh ngay tại cổng'],
];

const MEDAL = ['#ffd94a', '#dfe6f0', '#e6a26a', '#f3e4c0', '#f3e4c0'];
const PAPER_INK = '#2a170e';
const PAPER_RED = '#8a1a12';
const PAPER_MED = ['#b8860b', '#6a7a8a', '#9a5a2a', '#5a3a1e', '#5a3a1e'];

// squeeze a text horizontally (pixel fonts look fine) so it never spills out of its box
const fit = (t, maxW) => { t.setScale(1, 1); if (t.width > maxW) t.setScale(maxW / t.width, 1); return t; };

export class InfoBoards {
  constructor(scene) {
    this.s = scene;
    this.page = { guide: 0, rank: 0, big: 0 };
    this.next = { guide: 0, rank: 0, big: 0, refresh: 0 };
    this.buildWall();
    this.buildBig();
  }

  // ---------------------------------------------------------------- data
  merged(serverList, localKey) {
    const map = new Map();
    for (const p of serverList || []) map.set(String(p.id), { name: clean(p.name), value: p.value });
    for (const v of this.s.viewers.values()) {
      if (!(v[localKey] > 0)) continue;
      const cur = map.get(v.id);
      if (!cur || cur.value < v[localKey]) map.set(v.id, { name: v.name, value: v[localKey] });
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }
  topWarriors(n = 5) { return this.merged(this.s.leaders.today, 'sessionXp').slice(0, n); }
  topDonors(n = 5) { return this.merged(this.s.leaders.donorsToday, 'sessionGifts').slice(0, n); }

  // ---------------------------------------------------------------- wall signboards (battle)
  buildWall() {
    const s = this.s;
    const y = CITADEL_Y + 116, bw = 404, bh = 130; // lower and shorter: the catapults stand on the wall top
    const make = (x, title) => {
      const titleT = htext(s, 0, -bh / 2 + 2, title, 20, '#fff2dc', { stroke: '#3a0606' }).setOrigin(0.5);
      const rows = [0, 1, 2].map(i => {
        const ry = -24 + i * 33;
        return {
          a: ptext(s, -bw / 2 + 16, ry, '', 34, '#ffe58a').setOrigin(0, 0.5),
          b: ptext(s, 0, ry, '', 34, '#f3e4c0').setOrigin(0, 0.5),
          c: ptext(s, bw / 2 - 16, ry, '', 34, '#a8e2c4').setOrigin(1, 0.5),
        };
      });
      const seal = panel(s, 'seal', 0, -bh / 2 + 2, 300, 40);
      const box = s.add.container(x, y, [panel(s, 'dark', 0, 6, bw, bh), seal, titleT, ...rows.flatMap(r => [r.a, r.b, r.c])]).setDepth(4.5);
      return { box, titleT, seal, rows, w: bw };
    };
    this.guideBoard = make(24 + bw / 2, 'HƯỚNG DẪN');
    this.rankBoard = make(W - 24 - bw / 2, 'TOP CHIẾN SĨ');
  }

  setTitle(board, str) {
    board.titleT.setText(str);
    fit(board.titleT, 280);
  }

  // rows: [{a, b, c, ac}] ; a = key / rank, b = text, c = right-aligned value
  fillWall(board, rows) {
    const half = board.w / 2 - 16;
    const aw = Math.max(0, ...rows.map(r => { board.rows[0].a.setText(r.a); return board.rows[0].a.width; }));
    board.rows.forEach((row, i) => {
      const r = rows[i];
      row.a.setText(r ? r.a : '').setColor(r?.ac || '#ffe58a');
      row.c.setText(r?.c || '');
      row.b.setText(r ? r.b : '').setColor(r?.bc || '#f3e4c0').setX(-half + aw + 12);
      const right = r?.c ? half - row.c.width - 10 : half;
      fit(row.b, right - (-half + aw + 12));
    });
  }

  flip(target, mid) {
    const s = this.s;
    s.tweens.add({
      targets: target, scaleY: 0.05, duration: 90, ease: 'Stepped', easeParams: [2],
      onComplete: () => { mid(); s.tweens.add({ targets: target, scaleY: 1, duration: 90, ease: 'Stepped', easeParams: [2] }); },
    });
  }

  guidePages() {
    const pages = [];
    for (let i = 0; i < GUIDE.length; i += 3) pages.push({ title: 'HƯỚNG DẪN', rows: GUIDE.slice(i, i + 3).map(([k, , d]) => ({ a: keyLabel(k), b: d })) });
    for (let i = 0; i < GIFTS.length; i += 3) pages.push({ title: 'TẶNG QUÀ', rows: GIFTS.slice(i, i + 3).map(([k, d]) => ({ a: k, b: d, ac: '#ffb070' })) });
    return pages;
  }

  rankPage(which) {
    if (which === 0) {
      const top = this.topWarriors(3);
      return {
        title: 'TOP CHIẾN SĨ',
        rows: top.length ? top.map((p, i) => ({ a: `${i + 1}.`, ac: MEDAL[i], b: truncate(p.name, 14), bc: i === 0 ? '#ffe58a' : '#f3e4c0', c: `${fmt(p.value)} XP` }))
          : [{ a: '', b: 'Chưa có ai lên bảng' }, { a: '', b: 'Gõ "vào" để nhập ngũ!', bc: '#ffe58a' }],
      };
    }
    const top = this.topDonors(3);
    return {
      title: 'TOP ỦNG HỘ',
      rows: top.length ? top.map((p, i) => ({ a: `${i + 1}.`, ac: MEDAL[i], b: truncate(p.name, 14), bc: i === 0 ? '#ffe58a' : '#f3e4c0', c: `${fmt(p.value)} xu` }))
        : [{ a: '', b: 'Chưa có quà hôm nay' }, { a: '', b: 'Tặng quà = tung tuyệt kỹ!', bc: '#ffb070' }],
    };
  }

  // ---------------------------------------------------------------- big scroll (between rounds)
  buildBig() {
    const s = this.s;
    this.bigW = 940; this.bigH = 660;
    const paper = panel(s, 'paper', 0, 0, this.bigW, this.bigH);
    const rodL = s.add.image(-this.bigW / 2 - 12, 0, 'ui_rod').setScale(2.4, 8.4);
    const rodR = s.add.image(this.bigW / 2 + 12, 0, 'ui_rod').setScale(2.4, 8.4);
    this.bigContent = s.add.container(0, 0);
    this.dots = [0, 1, 2, 3].map(i => s.add.rectangle(-45 + i * 30, this.bigH / 2 - 34, 16, 16, 0x8a1a12));
    this.big = s.add.container(W / 2, 640, [paper, rodL, rodR, this.bigContent, ...this.dots]).setDepth(49).setVisible(false);
  }

  renderBig(page) {
    const s = this.s;
    const c = this.bigContent;
    c.removeAll(true);
    const pg = page % 4;
    this.dots.forEach((d, i) => d.setFillStyle(i === pg ? 0x8a1a12 : 0xc8a878));
    const top = -this.bigH / 2;
    const left = -this.bigW / 2 + 60, right = this.bigW / 2 - 60;
    const titles = ['CÁCH CHƠI', 'TẶNG QUÀ = TUYỆT KỸ', 'TOP CHIẾN SĨ HÔM NAY', 'TOP ỦNG HỘ HÔM NAY'];
    c.add(banner(s, 0, top + 6, titles[pg], 38));
    const keyRow = (rows, y0, step, keyColor) => {
      const tmp = ptext(s, 0, 0, '', 42);
      const kw = Math.max(...rows.map(([k]) => tmp.setText(k).width));
      tmp.destroy();
      rows.forEach(([k, d], i) => {
        const y = y0 + i * step;
        c.add(s.add.text(left, y, k, { fontFamily: 'VT323', fontSize: '42px', color: keyColor, testString: TEST }).setOrigin(0, 0.5));
        c.add(fit(ptext(s, left + kw + 24, y, d, 42, PAPER_INK, { shadow: false }).setOrigin(0, 0.5), right - left - kw - 24));
        if (i < rows.length - 1) c.add(s.add.rectangle(0, y + step / 2, this.bigW - 120, 2, 0xc8a878));
      });
    };
    if (pg === 0) {
      keyRow(GUIDE.map(([k, d]) => [keyLabel(k), d]), top + 100, Math.min(58, 480 / (GUIDE.length - 1)), PAPER_RED);
    } else if (pg === 1) {
      keyRow(GIFTS, top + 112, 66, PAPER_RED);
      c.add(ptext(s, 0, top + 112 + 6 * 66 + 4, 'Camera zoom vào bạn · tên bạn hiện to giữa màn hình', 32, '#7a5a3a', { shadow: false }).setOrigin(0.5));
    } else {
      const list = pg === 2 ? this.topWarriors(5) : this.topDonors(5);
      const unit = pg === 2 ? 'XP' : 'xu';
      if (!list.length) {
        c.add(ptext(s, 0, -20, pg === 2 ? 'Chưa có ai lên bảng hôm nay' : 'Chưa có quà hôm nay', 44, '#7a5a3a', { shadow: false }).setOrigin(0.5));
        c.add(ptext(s, 0, 40, pg === 2 ? 'Gõ "vào" để nhập ngũ và ghi điểm!' : 'Tặng quà để tung tuyệt kỹ và lên bảng!', 38, PAPER_RED, { shadow: false }).setOrigin(0.5));
      }
      list.forEach((p, i) => {
        const y = top + 120 + i * 84;
        if (i < 3) c.add(s.add.image(left + 18, y, 'ic_medal').setScale(3.6).setTint([0xffd94a, 0xdfe6f0, 0xe6a26a][i]));
        else c.add(ptext(s, left + 18, y, `${i + 1}`, 44, PAPER_MED[i], { shadow: false }).setOrigin(0.5));
        const nameT = s.add.text(left + 64, y, truncate(p.name, 16).toUpperCase(), { fontFamily: HEAD, fontSize: i === 0 ? '40px' : '34px', testString: TEST, padding: { top: 6 }, color: i === 0 ? PAPER_RED : PAPER_INK }).setOrigin(0, 0.5);
        const valT = ptext(s, right, y, `${fmt(p.value)} ${unit}`, 42, PAPER_MED[i], { shadow: false }).setOrigin(1, 0.5);
        c.add([nameT, fit(valT, 220)]);
        fit(nameT, right - left - 64 - valT.displayWidth - 20);
        if (i < list.length - 1) c.add(s.add.rectangle(0, y + 42, this.bigW - 120, 2, 0xc8a878));
      });
    }
  }

  // ---------------------------------------------------------------- tick
  update(now) {
    const s = this.s;
    const rally = s.state === 'rally' && !s.paused && !(s.announceUntil > now); // a ribbon is up: get out of its way
    // wall boards rotate during battle
    if (now > this.next.guide) {
      this.next.guide = now + 5000;
      const pages = this.guidePages();
      const p = pages[this.page.guide++ % pages.length];
      this.flip(this.guideBoard.box, () => { this.setTitle(this.guideBoard, p.title); this.fillWall(this.guideBoard, p.rows); });
    }
    if (now > this.next.rank) {
      this.next.rank = now + 8000;
      const which = this.page.rank++ % 2;
      this.flip(this.rankBoard.box, () => { const p = this.rankPage(which); this.setTitle(this.rankBoard, p.title); this.fillWall(this.rankBoard, p.rows); this.rankWhich = which; });
    } else if (now > this.next.refresh && this.rankWhich !== undefined) {
      this.next.refresh = now + 2000;
      const p = this.rankPage(this.rankWhich);
      this.fillWall(this.rankBoard, p.rows);
    }
    // big scroll between rounds
    if (rally !== this.big.visible) {
      this.big.setVisible(rally);
      if (rally && now > (this.hiddenAt || 0) + 3000) { this.page.big = 0; this.next.big = 0; }
      if (!rally) this.hiddenAt = now;
    }
    if (rally && now > this.next.big) {
      this.next.big = now + 4500;
      const pg = this.page.big++;
      if (pg === 0) this.renderBig(pg);
      else this.flip(this.big, () => this.renderBig(pg));
    }
  }
}
