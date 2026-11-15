// Always-on world VFX (pixelfx loops): braziers at the gate, a rift at the spawn, butterflies over the field, river
// ripples, drifting cherry petals and soft sun rays. Plus "attached" status effects that follow a unit around
// (stun stars, shield bubble) and disappear when the status ends.
import { W, MAP_TOP, CITADEL_Y, TILE } from './config.js';
import { rand } from './util.js';
import { THEMES } from './themes.js';

const tileY = r => MAP_TOP + r * TILE + TILE / 2;

export class Ambient {
  constructor(scene) {
    this.s = scene;
    this.attached = new Map(); // key -> { sprite, target, until(), dy }
    this.flies = [];
    this.themeObjs = [];
    if (!scene.pfxManifest?.brazier) return;
    const fx = scene.fx;
    // braziers on the wall either side of the gate
    for (const dx of [-112, 112]) fx.pfx('brazier', W / 2 + dx, CITADEL_Y + 44, { scale: 1, force: true, depth: 4.6 });
    // the rift the demons pour out of
    const sp = scene.pathPts[0];
    this.rift = fx.pfx('rift', Math.max(90, sp.x), MAP_TOP + 96, { scale: 1, force: true, depth: 3, alpha: 0.9 });
    // river ripples
    for (const x of [170, 330, 760, 930]) fx.pfx('ripples', x, tileY(20) + 6, { scale: 1, force: true, depth: 2, alpha: 0.75 })?.anims.setProgress(Math.random());
    this.themeObjs = [];
    this.setTheme(0);
  }

  // weather and light for the current map (see THEMES[i].weather)
  setTheme(i) {
    const s = this.s, fx = s.fx;
    for (const o of this.themeObjs) { s.tweens.killTweensOf(o); if (o.stop) o.stop(); o.destroy(); }
    this.themeObjs = [];
    this.flies = [];
    const keep = o => { if (o) this.themeObjs.push(o); return o; };
    const overlay = (key, opts) => {
      for (const [y, a] of [[MAP_TOP + 600, opts.alpha], [MAP_TOP + 1150, opts.alpha * 0.9]]) {
        const p = keep(fx.pfx(key, W / 2, y, { scale: 3.4, force: true, depth: opts.depth ?? 20, alpha: a, add: opts.add }));
        p?.anims.setProgress(Math.random());
        if (opts.tint) p?.setTint(opts.tint);
        if (key === 'snowfall') p?.setCrop(0, 0, p.width, p.height * 0.8); // the sheet's bottom rows are a snowdrift strip that showed as a band across the field
      }
    };
    const wanderers = (key, n, alpha = 0.95) => {
      for (let k = 0; k < n; k++) {
        const b = keep(fx.pfx(key, rand(120, W - 120), rand(MAP_TOP + 150, CITADEL_Y - 200), { scale: 1, force: true, depth: 12, alpha }));
        if (b) { b.anims.setProgress(Math.random()); this.flies.push(b); this.wander(b); }
      }
    };
    for (const w of THEMES[i]?.weather || []) {
      if (w === 'godrays') keep(fx.pfx('godrays', W / 2, MAP_TOP + 640, { scale: 3, force: true, depth: 19, add: true, alpha: 0.28 }));
      else if (w === 'heat') keep(fx.pfx('godrays', W / 2, MAP_TOP + 640, { scale: 3, force: true, depth: 19, add: true, alpha: 0.32 }))?.setTint(0xff8a4a);
      else if (w === 'petals') overlay('petals', { alpha: 0.9 });
      else if (w === 'leaves' || w === 'leaves_green') overlay(w, { alpha: 0.95 });
      else if (w === 'snowfall') overlay('snowfall', { alpha: 1 });
      else if (w === 'fog') overlay('fog', { alpha: 0.4, add: true, depth: 19, tint: i === 8 ? 0xc8a0ff : undefined });
      else if (w === 'fireflies') overlay('fireflies', { alpha: 1, add: true });
      else if (w === 'butterflies') wanderers('butterfly', 4);
      else if (w === 'wisps') wanderers('wisp', 5, 0.85);
      else if (w === 'embers') {
        keep(s.add.particles(0, 0, 'px_dot', {
          x: { min: 0, max: W }, y: CITADEL_Y - 40, lifespan: { min: 3000, max: 5000 }, speedY: { min: -120, max: -50 }, speedX: { min: -25, max: 25 },
          scale: { start: 1.3, end: 0.2 }, alpha: { start: 0.9, end: 0 }, tint: i === 9 ? [0xff4a4a, 0xff2a5a, 0xffa080] : [0xffe25a, 0xff8a2a, 0xff5a2a],
          blendMode: 'ADD', frequency: 70,
        }).setDepth(21));
      }
    }
  }

  wander(b) {
    const x = rand(100, W - 100);
    b.setFlipX(x < b.x);
    this.s.tweens.add({
      targets: b, x, y: rand(MAP_TOP + 150, CITADEL_Y - 160), duration: rand(5000, 9000), ease: 'Sine.InOut',
      onComplete: () => this.wander(b),
    });
  }

  // a looping status effect that follows `target` (anything with x/y or sprite) while alive() is true
  attach(id, key, target, alive, dy = 0, scale = 1) {
    if (this.attached.has(id)) return;
    if (this.attached.size > 40) return;
    const pos = this.posOf(target);
    const sp = this.s.fx.pfx(key, pos.x, pos.y + dy, { scale, force: true, depth: 27 });
    if (!sp) return;
    this.attached.set(id, { sprite: sp, target, alive, dy });
  }

  posOf(t) { return t.sprite ? { x: t.sprite.x, y: t.sprite.y } : { x: t.x, y: t.y }; }

  update() {
    for (const [id, a] of this.attached) {
      if (!a.alive() || (a.target.sprite && !a.target.sprite.active)) { a.sprite.destroy(); this.attached.delete(id); continue; }
      const p = this.posOf(a.target);
      a.sprite.setPosition(Math.round(p.x), Math.round(p.y + a.dy));
    }
  }

  clear() { for (const a of this.attached.values()) a.sprite.destroy(); this.attached.clear(); }
}
