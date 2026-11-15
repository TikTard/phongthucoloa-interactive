// Skill cut-in: an anime-style band slams across the field with the caster's portrait, the skill name and the
// viewer's name. One at a time; when the army fires lots of skills only the most important get the full cut-in
// (heroes and bosses first, then high-level / high-rank soldiers), the rest get a small label over their head.
import { W } from './config.js';
import { PX, HEAD, TEST } from './ui.js';

const STYLE = {
  soldier: { band: 0x140c08, edge: 0xffd94a, edge2: 0x8a1a12, title: '#ffe58a', stroke: '#3a0a06', label: 'KỸ NĂNG' },
  hero: { band: 0x1a0606, edge: 0xffb03a, edge2: 0xffe58a, title: '#fff2b0', stroke: '#5a1206', label: 'TUYỆT CHIÊU' },
  boss: { band: 0x12020a, edge: 0xff3a3a, edge2: 0x6a0a2a, title: '#ff8a8a', stroke: '#2a0208', label: 'BOSS' },
};
const HOLD_MS = 1050;
const GAP_MS = 180;
const BAND_H = 210;

export class CutIn {
  constructor(scene) {
    this.s = scene;
    this.queue = [];
    this.busyUntil = 0;
    this.y = 860;
    this.live = []; // screen-fixed layers that must ignore camera zoom (ultimate cinematics zoom the camera)
  }

  // o: { kind, key, anim, title, name, sub, priority }
  show(o) {
    const now = this.s.time.now;
    if (o.immediate) { this.busyUntil = now + HOLD_MS + 320 + GAP_MS; this.play(o); return true; }
    this.queue.push({ ...o, at: now });
    this.queue.sort((a, b) => b.priority - a.priority);
    if (this.queue.length > 4) this.queue.length = 4;
    return true;
  }

  // would a new entry with this priority get a full cut-in soon?
  wouldShow(priority) {
    return this.queue.length < 4 || priority > this.queue[this.queue.length - 1].priority;
  }

  update(now) {
    // keep cut-ins fixed on screen while the camera zooms: undo the zoom around the screen centre
    const z = this.s.cameras.main.zoom;
    this.live = this.live.filter(l => l.active);
    for (const l of this.live) l.setScale(1 / z).setPosition(W / 2 * (1 - 1 / z), 1920 / 2 * (1 - 1 / z));
    if (now < this.busyUntil || !this.queue.length) return;
    this.queue = this.queue.filter(q => now - q.at < 2600 || q.kind === 'boss' || q.gift);
    const o = this.queue.shift();
    if (!o) return;
    this.busyUntil = now + HOLD_MS + 320 + GAP_MS;
    this.play(o);
  }

  play(o) {
    const s = this.s, st = STYLE[o.kind] || STYLE.soldier, y = this.y;
    const parts = [];
    // dim the field a touch
    const dim = s.add.rectangle(0, 0, W, 1920, 0x000000, 0.28).setOrigin(0);
    // skewed band with two-tone edges (hard pixel edges, no gradients)
    const g = s.add.graphics();
    const skew = 60, h = BAND_H;
    const poly = (top, bot, col, a = 1) => { g.fillStyle(col, a); g.fillPoints([{ x: -20, y: top + skew / 2 }, { x: W + 20, y: top - skew / 2 }, { x: W + 20, y: bot - skew / 2 }, { x: -20, y: bot + skew / 2 }], true); };
    poly(-h / 2 - 16, h / 2 + 16, st.edge2);
    poly(-h / 2 - 8, h / 2 + 8, st.edge);
    poly(-h / 2, h / 2, st.band, 0.96);
    parts.push(g);
    // speed lines
    const lines = [];
    for (let i = 0; i < 14; i++) {
      const ly = -h / 2 + 14 + Math.random() * (h - 28);
      const r = s.add.rectangle(Math.random() * W, ly, 80 + Math.random() * 220, 3, 0xffffff, 0.12 + Math.random() * 0.18).setOrigin(0, 0.5);
      lines.push(r);
      parts.push(r);
    }
    // portrait: the caster's own sprite, big, in its cast pose
    let portrait = null;
    if (o.key && s.textures.exists(o.key)) {
      const fr = s.textures.getFrame(o.key, 0);
      const scale = Math.max(2, Math.floor(200 / Math.max(fr.height, fr.width * 0.8)));
      portrait = s.add.sprite(-160, h / 2 + 6, o.key).setOrigin(0.5, 1).setScale(scale);
      if (o.anim) portrait.play(o.anim);
      if (o.flip) portrait.setFlipX(true);
      parts.push(portrait);
    }
    const x0 = o.key ? 330 : 90;
    const label = s.add.text(x0, -h / 2 + 22, `${st.label}${o.sub ? `  ·  ${o.sub}` : ''}`, { fontFamily: PX, fontSize: '34px', color: '#d8c8a8', testString: TEST }).setOrigin(0, 0.5);
    const title = s.add.text(x0 + 60, -8, o.title.toUpperCase(), {
      fontFamily: HEAD, fontSize: '62px', color: st.title, testString: TEST, padding: { top: 10 },
      stroke: st.stroke, strokeThickness: 10,
    }).setOrigin(0, 0.5).setShadow(0, 6, '#000000', 0, true, true);
    const maxW = W - x0 - 110; // title starts at x0 + 60, and the band is tilted
    if (title.width > maxW) title.setScale(maxW / title.width);
    const name = s.add.text(x0 + 120, h / 2 - 36, o.name.toUpperCase(), {
      fontFamily: HEAD, fontSize: '36px', color: '#ffffff', testString: TEST, padding: { top: 6 }, stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0, 0.5);
    if (name.width > maxW - 80) name.setScale((maxW - 80) / name.width);
    parts.push(label, title, name);
    const box = s.add.container(0, y, parts).setAngle(-3);
    const layer = s.add.container(0, 0, [dim, box]).setDepth(59).setScrollFactor(0, 0, true);
    this.live.push(layer);

    // slam in: band opens in 2 hard steps, text slides from the right, portrait from the left
    box.setScale(1, 0.08);
    s.tweens.add({ targets: box, scaleY: 1, duration: 110, ease: 'Stepped', easeParams: [2] });
    title.x += 260; title.setAlpha(0);
    s.tweens.add({ targets: title, x: title.x - 260, alpha: 1, duration: 220, ease: 'Back.Out', delay: 60 });
    name.x += 340;
    s.tweens.add({ targets: name, x: name.x - 340, duration: 260, ease: 'Cubic.Out', delay: 120 });
    if (portrait) s.tweens.add({ targets: portrait, x: 180, duration: 240, ease: 'Back.Out' });
    s.tweens.add({ targets: lines, x: '-=900', duration: HOLD_MS + 200 });
    const star = s.fx.pfx('crit', o.key ? 180 : W / 2, y + 30, { scale: 2, force: true, depth: 58.5 });
    if (star) { star.setScrollFactor(0); layer.addAt(star, 1); }
    s.cameras.main.shake(140, o.kind === 'boss' ? 0.008 : 0.004);
    s.fx.edgeFlash(o.kind === 'boss' ? 0xff2a2a : 0xffd94a, o.kind === 'soldier' ? 0.35 : 0.6, 500);
    s.sfx.play(o.kind === 'boss' ? 'boss' : 'power');
    if (o.kind !== 'soldier') s.sfx.play('gong');
    // hold, then snap shut
    s.time.delayedCall(HOLD_MS, () => {
      s.tweens.add({ targets: box, scaleY: 0, duration: 120, ease: 'Stepped', easeParams: [2] });
      s.tweens.add({ targets: dim, alpha: 0, duration: 160, onComplete: () => layer.destroy() });
    });
  }
}
