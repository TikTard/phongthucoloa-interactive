// Chat bubbles above viewers' soldiers: name + message, drawn with pixel frames.
// At most BUBBLES.max on screen; extra ones queue; gifts jump the queue; one bubble per viewer.
import { W, BUBBLES, HUD_BOTTOM, SAFE_BOTTOM, SAFE_RIGHT, SAFE_RIGHT_FROM } from './config.js';
import { truncate } from './util.js';
import { panel, PX, HEAD, TEST } from './ui.js';

// frame = art/ui.lua frame name
const STYLES = {
  chat: { frame: 'paper', name: '#8a2a12', text: '#2a170e', size: 30 },
  cmd: { frame: 'sky', name: '#14406a', text: '#14243a', size: 30 },
  gift: { frame: 'lacquer', name: '#ffe58a', text: '#fff2dc', size: 32 },
  recruit: { frame: 'jade', name: '#0e4a30', text: '#0e2a20', size: 30 },
  ok: { frame: 'lacquer', name: '#ffe58a', text: '#fff2dc', size: 32 },
  wrong: { frame: 'rose', name: '#7a1a1a', text: '#3a0e14', size: 28 },
  rank: { frame: 'violet', name: '#4a2a8a', text: '#1e1236', size: 30 },
  sys: { frame: 'dark', name: '#ffd94a', text: '#f3e4c0', size: 30 },
};
const PAD = { lacquer: 16, dark: 14 };

export class Bubbles {
  constructor(scene) {
    this.scene = scene;
    this.live = [];
    this.queue = [];
  }

  // opts: { id, name, text, kind, anchor: () => ({x, y}) }
  show(opts) {
    const now = this.scene.time.now;
    const existing = opts.id && this.live.find(b => b.id === opts.id);
    if (existing && existing.kind !== 'gift') this.remove(existing, true);
    else if (existing) { this.enqueue(opts, now); return; }
    if (this.live.length >= BUBBLES.max) {
      if (opts.kind === 'gift' || opts.kind === 'ok') {
        const victim = this.live.find(b => b.kind !== 'gift' && b.kind !== 'ok') || this.live[0];
        this.remove(victim, true);
      } else { this.enqueue(opts, now); return; }
    }
    this.create(opts, now);
  }

  enqueue(opts, now) {
    this.queue = this.queue.filter(q => q.id !== opts.id);
    this.queue.push({ ...opts, at: now });
    if (this.queue.length > BUBBLES.maxQueue) this.queue.shift();
  }

  create(opts, now) {
    const s = this.scene;
    const st = STYLES[opts.kind] || STYLES.chat;
    const a = opts.anchor ? opts.anchor() : { x: W / 2, y: 1500 };
    const nameT = s.add.text(0, 0, (opts.name || '').toUpperCase(), { fontFamily: HEAD, fontSize: '22px', color: st.name, testString: TEST, padding: { top: 4 } });
    const msgT = s.add.text(0, 0, truncate(String(opts.text || ''), opts.kind === 'sys' || opts.kind === 'cmd' ? BUBBLES.maxChars + 30 : BUBBLES.maxChars), {
      fontFamily: PX, fontSize: `${st.size}px`, color: st.text, testString: TEST, wordWrap: { width: 340, useAdvancedWrap: true }, lineSpacing: -6,
    });
    const pad = PAD[st.frame] || 12;
    const w = Math.max(nameT.width, msgT.width) + pad * 2;
    const h = nameT.height + msgT.height + pad * 1.2 - 4;
    const frame = panel(s, st.frame, 0, -h / 2, w, h);
    nameT.setPosition(-frame.panelW / 2 + pad, -frame.panelH + pad * 0.6);
    msgT.setPosition(-frame.panelW / 2 + pad, -frame.panelH + pad * 0.6 + nameT.height - 4);
    const tail = s.add.image(0, -4, 'ui_tail_' + st.frame).setOrigin(0.5, 0);

    // keep bubbles out of TikTok's overlays: comments cover the bottom of the phone, buttons the lower right edge
    let y = Math.round(Math.min(SAFE_BOTTOM, Math.max(HUD_BOTTOM + h + 16, a.y - 14)));
    const maxX = () => (y > SAFE_RIGHT_FROM - h ? SAFE_RIGHT : W - 8) - w / 2;
    let x = Phaser.Math.Clamp(Math.round(a.x), w / 2 + 8, maxX());
    for (let tries = 0; tries < 8; tries++) {
      const hit = this.live.find(b => Math.abs(b.rect.x - x) < (b.rect.w + w) / 2 + 4 && Math.abs(b.rect.y - (y - h / 2)) < (b.rect.h + h) / 2 + 4);
      if (!hit) break;
      y = hit.rect.y - hit.rect.h / 2 - 18;
      if (y < HUD_BOTTOM + h) { y = HUD_BOTTOM + h + 16; x = Phaser.Math.Clamp(x + (x < W / 2 ? 140 : -140), w / 2 + 8, maxX()); }
    }

    const box = s.add.container(x, y, [frame, tail, nameT, msgT]).setDepth(30);
    // pixel-style pop: two hard steps instead of a smooth zoom
    box.setScale(0.85);
    s.time.delayedCall(50, () => box.active && box.setScale(1.06));
    s.time.delayedCall(100, () => box.active && box.setScale(1));
    const life = opts.kind === 'gift' || opts.kind === 'ok' ? BUBBLES.giftMs : BUBBLES.chatMs;
    this.live.push({ id: opts.id, kind: opts.kind, box, until: now + life, rect: { x, y: y - h / 2, w, h } });
  }

  remove(b, instant = false) {
    this.live = this.live.filter(x => x !== b);
    if (instant) { b.box.destroy(); return; }
    // blink out, like old handheld games
    let n = 0;
    const ev = this.scene.time.addEvent({
      delay: 60, repeat: 3,
      callback: () => { if (!b.box.active) return; b.box.setVisible(n++ % 2 === 1); if (n >= 4) { ev.remove(); b.box.destroy(); } },
    });
  }

  update(now) {
    for (const b of [...this.live]) if (now > b.until) this.remove(b);
    this.queue = this.queue.filter(q => now - q.at < BUBBLES.maxAgeMs);
    while (this.queue.length && this.live.length < BUBBLES.max) this.create(this.queue.shift(), now);
  }

  get waiting() { return this.queue.length; }

  clear() {
    for (const b of this.live) b.box.destroy();
    this.live = [];
    this.queue = [];
  }
}
