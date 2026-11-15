// Gift ultimates as ~6.5-second cinematics, one at a time:
//   0.0-1.2s  FOCUS: camera zooms onto the guard, a spotlight darkens everything else, time slows, the guard charges up
//             (magic circle, spiralling energy, ground cracks, crackling arcs) and the cut-in slams in.
//   1.2-5.6s  COMBO: camera snaps back with a flash + shockwave, then 5-6 class beats; the camera punches in on big hits
//             and the action freezes for an instant (hit-stop).
//   ~5.6s     FINALE: one huge blow, white flash, long hit-stop, and the total damage shown over the guard.
//   ~6.8s     END: the spotlight fades and the camera settles back.
// Bigger gifts (ultPower) hit harder; 20+ xu "II", 100+ xu "Tuyệt Kỹ" with bigger effects.
import { W, H, CLASSES, ULTS, ultPower, ultTier, ULT_DMG } from './config.js';
import { rand } from './util.js';
import { HEAD, TEST } from './ui.js';

const COLOR = { kiem: 0xffd94a, thuong: 0xff6a2a, cung: 0xffe58a, khien: 0xbfe0ff, phap: 0xc58aff, y: 0x7dff9a, song: 0xff9a8a, vo: 0xf0c060, thich: 0xb8a8e0 };
const FXC = { kiem: 'gold', thuong: 'fire', cung: 'gold', khien: 'white', phap: 'purple', y: 'green', song: 'fire', vo: 'gold', thich: 'purple' };
const FOCUS_MS = 1200;
const END_MS = 6800;

export class UltDirector {
  constructor(scene) {
    this.s = scene;
    this.busy = false;
    this.makeSpotTexture();
  }

  idle() { return !this.busy; }

  makeSpotTexture() {
    const s = this.s;
    if (s.textures.exists('spot')) return;
    const t = s.textures.createCanvas('spot', 420, 420);
    const c = t.getContext();
    const g = c.createRadialGradient(210, 210, 50, 210, 210, 210);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 420, 420);
    t.refresh();
  }

  // a guard with no monster near it blinks (portal out, portal in) to the nearest one before the ultimate starts
  blink(s) {
    const sc = this.s, army = sc.army;
    const x = s.sprite.x, y = s.sprite.y;
    if (sc.enemiesNear(x, y, 230).length) return;
    let best = null, bd = Infinity;
    for (const e of sc.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return;
    sc.fx.pfx('portal', x, y, { scale: 1, force: true, depth: 26 });
    sc.fx.pfx('poof', x, y - 10, { scale: 1, force: true });
    if (s.mode !== 'march') { s.mode = 'march'; s.marchAt = 0; }
    s.d = Math.max(0, Math.min(sc.pathLen, best.d + 70)); // a step on the gate side of the monster
    s.off = Math.max(-30, Math.min(30, (best.off || 0) + (Math.random() < 0.5 ? -18 : 18)));
    army.place(s);
    army.face(s, best.x);
    sc.fx.pfx('portal', s.sprite.x, s.sprite.y, { scale: 1.4, force: true, depth: 26 });
    sc.fx.pfx('landing', s.sprite.x, s.sprite.y, { scale: 1, force: true });
    sc.sfx.play('summon');
  }

  // ------------------------------------------------------------------ the cinematic
  play(s, xu) {
    const sc = this.s, army = sc.army, v = s.viewer, cls = v.cls, u = ULTS[cls], c = CLASSES[cls];
    this.busy = true;
    const run = this.run = (this.run || 0) + 1; // timers from an earlier ultimate must not end this one
    const p = ultPower(xu), big = xu >= 20, huge = xu >= 100;
    const k = huge ? 2 : 1;                       // effect scale
    const R = 1 + 0.15 * (p - 1);                 // radius scale
    const now = sc.time.now;
    const cam = sc.cameras.main;
    this.blink(s);                                // nobody around: teleport next to the nearest monster first
    const x0 = s.sprite.x, y0 = s.sprite.y;
    const col = COLOR[cls];
    const name = u.name + ultTier(xu);
    s.ulting = true;
    s.stunUntil = 0;
    v.skills = (v.skills || 0) + 1;
    sc.stats.skillsCast++;
    this.total = 0;
    const T = (ms, fn) => sc.time.delayedCall(ms, () => { if (s.sprite.active && this.run === run) fn(); });
    const crowd = Math.min(1, 7 / Math.sqrt(Math.max(1, army.list.length)));
    const dmg = m => army.dmgOf(s, m * p) / crowd;
    const near = (x, y, r) => sc.enemiesNear(x, y, r);
    const bossCap = ULT_DMG.bossCap(p), bossDone = new Map();
    const hit = (list, m, extra) => {
      for (const e of list) {
        if (!e.alive) continue;
        let a = dmg(m) * ULT_DMG.mult;
        if (e.boss) {
          const used = bossDone.get(e) || 0, add = Math.min(e.maxHp * ULT_DMG.bossPct * m * p, e.maxHp * bossCap - used);
          if (add > 0) { a += add; bossDone.set(e, used + add); }
        } else a += e.maxHp * ULT_DMG.mobPct * m * p;
        const d = sc.damage(e, a, v, { force: true, pierce: true });
        this.total += d;
        army.credit(v, d);
        extra?.(e);
      }
    };
    const cluster = (x, y, r = 380) => {
      const pool = sc.enemies.filter(e => e.alive && Math.abs(e.x - x) < r && Math.abs(e.y - y) < r);
      let best = null, bn = -1;
      for (const e of pool) { const n = pool.filter(o => Math.abs(o.x - e.x) < 100 && Math.abs(o.y - e.y) < 100).length; if (n > bn) { bn = n; best = e; } }
      return best ? { x: best.x, y: best.y } : { x: x + (s.sprite.flipX ? -160 : 160), y };
    };
    const X = () => s.sprite.x, Y = () => s.sprite.y;
    // camera tools
    const punch = (x, y, z = 1.3, hold = 360) => {
      cam.pan(x, y, 110, 'Cubic.easeOut', true); cam.zoomTo(z, 110, 'Cubic.easeOut', true);
      sc.time.delayedCall(hold, () => { if (!this.busy || this.run !== run) return; cam.pan(W / 2, H / 2, 220, 'Cubic.easeInOut', true); cam.zoomTo(1, 220, 'Cubic.easeInOut', true); });
    };
    const stop = (ms = 120) => { sc.slowUntil = Math.max(sc.slowUntil, sc.time.now + ms); };
    const boom = (x, y, color, r, shake = 0.009) => { sc.fx.shockwave(x, y, color, r, 420, 12); cam.shake(260, shake); sc.sfx.play('explode'); };
    // a guard leaving the path for a moment (jumps, blinks) must not be snapped back by the army
    const lift = (dy, ms) => {
      s.freePos = true;
      const by = Y();
      sc.tweens.add({ targets: s.sprite, y: by - dy, duration: ms / 2, ease: 'Cubic.Out', yoyo: true, onComplete: () => { s.freePos = false; army.place(s); } });
    };

    // ---------------- FOCUS (0 - 1.2 s)
    sc.slowUntil = now + FOCUS_MS;
    cam.pan(x0, y0 - 40, 280, 'Cubic.easeOut', true);
    cam.zoomTo(huge ? 2.1 : 1.8, 280, 'Cubic.easeOut', true);
    this.spotOn(s, 0.76);
    s.sprite.setDepth(27);
    army.play(s, 'cast', true);
    sc.fx.pfx('circle', x0, y0 + 10, { scale: k, force: true, depth: 26 });
    sc.fx.halo(x0, y0 - 24, FXC[cls], 1.8 * k, 600);
    sc.sfx.play('summon');
    // energy spirals in from all around
    for (let i = 0; i < 18; i++) {
      T(45 * i, () => {
        const a = i * 0.9 + Math.random(), r = 170;
        const sp = sc.add.image(x0 + Math.cos(a) * r, y0 - 24 + Math.sin(a) * r, 'px_soft').setTint(col).setBlendMode('ADD').setScale(0.4).setDepth(28);
        sc.tweens.add({ targets: sp, x: x0, y: y0 - 24, scale: 0.06, duration: 420, ease: 'Cubic.In', onComplete: () => sp.destroy() });
      });
    }
    T(300, () => { sc.fx.lightning(x0 - 70, y0 - 140, x0, y0 - 30, col); sc.fx.lightning(x0 + 70, y0 - 150, x0, y0 - 30, col); cam.shake(220, 0.004); });
    T(560, () => { sc.fx.pfx('landing', x0, y0, { scale: 1 + k, force: true, speed: 1.4 }); sc.fx.debris(x0, y0, 10); });
    T(760, () => { sc.fx.beam(x0, y0, FXC[cls], 600); sc.fx.lightning(x0, y0 - 200, x0, y0 - 30, 0xffffff); cam.shake(300, 0.006); });
    T(220, () => sc.cutin.show({ kind: big ? 'hero' : 'soldier', key: s.key, anim: sc.anim(s.key, 'cast'), title: name, name: v.name, sub: `${c.name} · ${xu} xu`, priority: 10000 + xu, immediate: true }));

    // ---------------- RELEASE
    T(FOCUS_MS, () => {
      cam.pan(W / 2, H / 2, 200, 'Cubic.easeIn', true);
      cam.zoomTo(1, 200, 'Cubic.easeIn', true);
      cam.flash(160, 255, 250, 230);
      this.spotTo(0.38);
      boom(X(), Y() - 10, col, 460 * R, huge ? 0.012 : 0.008);
      sc.fx.edgeFlash(col, 0.8, 800);
    });
    const t0 = FOCUS_MS + 80;
    const at = (ms, fn) => T(t0 + ms, fn);
    const FIN = 4300; // finale beat, relative to t0
    const finale = (x, y) => {
      cam.flash(220, 255, 255, 255);
      stop(320);
      punch(x, y, 1.35, 520);
      boom(x, y, col, 560 * R, 0.016);
      sc.fx.edgeFlash(col, 1, 1100);
      sc.fx.pfx('darkboom', x, y + 20, { scale: 1, force: true, speed: 1.8 });
      // every ultimate reaches the boss: whatever is left of its boss share lands as a sky strike on each boss
      sc.time.delayedCall(220, () => {
        for (const b of sc.enemies) {
          if (!b.alive || !b.boss) continue;
          const left = b.maxHp * bossCap - (bossDone.get(b) || 0);
          if (left <= 1) continue;
          bossDone.set(b, b.maxHp * bossCap);
          sc.fx.lightning(b.x + 30, b.y - 260, b.x, b.y - 20, col);
          sc.fx.lightning(b.x - 40, b.y - 250, b.x, b.y - 20, 0xffffff);
          sc.fx.pfx('pillar', b.x, b.y + 10, { scale: 2, force: true, depth: 26 });
          sc.fx.pfx('crit', b.x, b.y - 20, { scale: 3, force: true, depth: 26 });
          const d = sc.damage(b, left, v, { force: true, pierce: true });
          this.total += d;
          army.credit(v, d);
          sc.fx.damageNumber(b.x, b.y - 80, d, true);
        }
      });
      sc.time.delayedCall(450, () => this.showTotal(s));
    };

    switch (cls) {
      case 'kiem': { // Kiếm Phong Bạo: dash cut, two whirlwinds, a blade-star ring, a leaping slam, then ten thousand swords
        const r = u.radius * R;
        at(0, () => { sc.fx.pfx('thrust', X(), Y() - 20, { scale: 1 + k, force: true, depth: 26, flip: s.sprite.flipX }); hit(near(X(), Y() - 20, r), 0.12, e => sc.fx.pfx('hitspark', e.x, e.y, { scale: 1 })); sc.sfx.play('slash'); });
        at(450, () => { sc.fx.pfx('slash', X(), Y() + 6, { scale: 2 + k, force: true, depth: 26 }); hit(near(X(), Y() - 20, r * 1.3), 0.14); stop(90); sc.sfx.play('slash'); });
        at(850, () => { sc.fx.pfx('slash', X(), Y() + 6, { scale: 2 + k, force: true, depth: 26, flip: true }); sc.fx.shockwave(X(), Y() - 10, col, r * 1.7, 360, 8); hit(near(X(), Y() - 20, r * 1.7), 0.14); stop(90); sc.sfx.play('slash'); });
        at(1350, () => {
          for (let i = 0; i < 14; i++) T(t0 + 1350 + i * 30, () => { const a = i / 14 * Math.PI * 2; sc.fx.pfx('crit', X() + Math.cos(a) * r * 1.5, Y() - 10 + Math.sin(a) * r, { scale: 1, force: true }); });
          hit(near(X(), Y() - 20, r * 1.9), 0.14);
        });
        at(2100, () => { lift(140, 600); sc.sfx.play('power'); });
        at(2420, () => { sc.fx.pfx('slam', X(), Y() + 10, { scale: 2 + k, force: true, speed: 1.4 }); boom(X(), Y(), col, r * 2.2); hit(near(X(), Y(), r * 2.2), 0.18); stop(140); punch(X(), Y(), 1.25, 300); });
        at(3200, () => {
          const c2 = cluster(X(), Y());
          sc.fx.pfx('starfall', c2.x, c2.y + 40, { scale: 2 + (huge ? 1 : 0), force: true, depth: 26, speed: 1.5 });
          for (let i = 0; i < 30; i++) T(t0 + 3200 + i * 32, () => this.fallingBlade(c2.x + rand(-230, 230), c2.y + rand(-160, 140)));
        });
        at(FIN, () => { const c2 = cluster(X(), Y()); sc.fx.pfx('slash', c2.x, c2.y + 10, { scale: 3 + k, force: true, depth: 26, angle: 35 }); sc.fx.pfx('slash', c2.x, c2.y + 10, { scale: 3 + k, force: true, depth: 26, angle: -35, flip: true }); hit(near(c2.x, c2.y, 260 * R), 0.4, e => sc.fx.pfx('crit', e.x, e.y, { scale: 1 })); finale(c2.x, c2.y); });
        break;
      }
      case 'thuong': { // Thương Long Đột: six lightning dashes zig-zagging up the path, dragon pillars, then a world-piercing thrust
        const dash = i => {
          const from = s.d, to = Math.max(army.minD * 0.8, s.d - (u.dash * R) / 4);
          const pp = sc.posAt(from);
          const ang = Phaser.Math.RadToDeg(Math.atan2(-pp.dy, -pp.dx));
          sc.fx.pfx('thrust', X(), Y() - 20, { scale: 1 + k, force: true, angle: ang, depth: 26 });
          const ox = X(), oy = Y();
          s.d = to; s.off = i % 2 ? 26 : -26; army.place(s);
          for (let j = 0; j < 6; j++) sc.fx.trail(ox + (X() - ox) * j / 6, oy - 20 + (Y() - oy) * j / 6, 'fire');
          hit(sc.enemies.filter(e => e.alive && e.d <= from + 30 && e.d >= to - 60), 0.09, e => sc.fx.pfx('crit', e.x, e.y + 4, { scale: 1, force: true }));
          cam.shake(120, 0.006); sc.sfx.play('slash');
        };
        for (let i = 0; i < 6; i++) at(i * 260, () => dash(i));
        at(1800, () => {
          for (let i = 0; i < 3; i++) T(t0 + 1800 + i * 200, () => { const pp = sc.posAt(Math.max(0, s.d - 80 - i * 90)); sc.fx.pfx('flamepillar', pp.x, pp.y + 30, { scale: 1 + (i === 2 ? 1 : 0), force: true, depth: 26, speed: 1.4 }); hit(near(pp.x, pp.y, 120 * R), 0.1); sc.sfx.play('flames'); });
        });
        at(2700, () => { sc.fx.pfx('firering', X(), Y() + 10, { scale: 2, force: true, depth: 9 }); hit(near(X(), Y(), 200 * R), 0.12); punch(X(), Y(), 1.25, 300); stop(120); });
        at(3400, () => { lift(110, 500); army.play(s, 'cast', true); sc.sfx.play('power'); });
        at(FIN, () => {
          const pp = sc.posAt(s.d), ang = Phaser.Math.RadToDeg(Math.atan2(-pp.dy, -pp.dx));
          sc.fx.pfx('thrust', X(), Y() - 20, { scale: 3, force: true, angle: ang, depth: 27 });
          for (let i = 0; i < 6; i++) T(t0 + FIN + i * 70, () => { const q = sc.posAt(Math.max(0, s.d - 60 - i * 70)); sc.fx.pfx('boom', q.x, q.y + 26, { scale: 1, force: true, speed: 1.8 }); });
          hit(sc.enemies.filter(e => e.alive && e.d <= s.d + 40 && e.d >= s.d - 520), 0.42, e => sc.fx.pfx('crit', e.x, e.y, { scale: 1 }));
          finale(X(), Y());
        });
        break;
      }
      case 'cung': { // Vạn Tiễn Xuyên Vân: fan volley, two arrow storms, ricochet arrows, then the cloud-piercing arrow
        const c1 = cluster(X(), Y());
        at(0, () => { for (let i = 0; i < 22; i++) this.flyArrow(X(), Y() - 30, c1.x + rand(-140, 140), c1.y + rand(-90, 90), i * 16); sc.sfx.play('arrowRain'); T(t0 + 360, () => hit(near(c1.x, c1.y, 160 * R), 0.12)); });
        at(600, () => { sc.fx.pfx('starfall', c1.x, c1.y + 40, { scale: 1 + k, force: true, depth: 26, speed: 1.6 }); T(t0 + 900, () => { hit(near(c1.x, c1.y, u.radius * R), 0.14); stop(90); }); });
        at(1300, () => { const c2 = cluster(c1.x + rand(-220, 220), c1.y); sc.fx.pfx('starfall', c2.x, c2.y + 40, { scale: 1 + k, force: true, depth: 26, speed: 1.6 }); T(t0 + 1600, () => hit(near(c2.x, c2.y, u.radius * R), 0.14)); sc.sfx.play('arrowRain'); });
        at(2100, () => {
          let from = { x: X(), y: Y() - 30 };
          const pool = sc.enemies.filter(e => e.alive && Math.abs(e.x - X()) < 600).sort(() => Math.random() - 0.5).slice(0, 8);
          pool.forEach((e, i) => T(t0 + 2100 + i * 110, () => { if (!e.alive) return; this.flyArrow(from.x, from.y, e.x, e.y - 10, 0); from = { x: e.x, y: e.y - 10 }; hit([e], 0.08, o => sc.fx.pfx('hitspark', o.x, o.y, { scale: 1 })); }));
          sc.sfx.play('arrow');
        });
        at(3300, () => { lift(120, 600); army.play(s, 'cast', true); punch(X(), Y() - 40, 1.35, 500); sc.sfx.play('power'); });
        at(FIN, () => {
          const ly = c1.y, fromLeft = X() > W / 2;
          const b = sc.add.image(fromLeft ? -120 : W + 120, ly, 'fx_bigbolt').setScale(5 + k).setDepth(27).setFlipX(!fromLeft);
          sc.fx.glow(b, 0xffe58a, 8);
          sc.tweens.add({ targets: b, x: fromLeft ? W + 140 : -140, duration: 420, onUpdate: () => sc.fx.trail(b.x, ly, 'gold'), onComplete: () => b.destroy() });
          sc.fx.pfx('starfall', W / 2, ly + 40, { scale: 3, force: true, depth: 26, speed: 1.8 });
          hit(sc.enemies.filter(e => e.alive && Math.abs(e.y - ly) < 90), 0.42, e => sc.fx.pfx('crit', e.x, e.y, { scale: 1 }));
          sc.sfx.play('volley');
          finale(W / 2, ly);
        });
        break;
      }
      case 'khien': { // Thiết Bích Trấn Thủ: three stomps, a shield charge, a golden dome over the squad, then the earth shatters
        const r = u.radius * R;
        [0, 380, 760].forEach((ms, i) => at(ms, () => {
          const rr = r * (1 + i * 0.4);
          sc.fx.pfx('slam', X(), Y() + 10, { scale: 1 + k, force: true, speed: 1.5 });
          sc.fx.shockwave(X(), Y(), col, rr, 380, 10);
          sc.fx.debris(X(), Y(), 10 + i * 6);
          const until = sc.time.now + 1500 + i * 600;
          hit(near(X(), Y() - 20, rr), 0.1, e => { if (!e.boss) e.stunUntil = Math.max(e.stunUntil || 0, until); });
          cam.shake(220, 0.006 + i * 0.002); stop(80); sc.sfx.play('wallHit');
        }));
        at(1400, () => {
          const from = s.d; s.d = Math.max(army.minD * 0.8, s.d - 120); army.place(s);
          sc.fx.pfx('shieldblock', X() + (s.sprite.flipX ? -30 : 30), Y() + 4, { scale: 2, force: true, flip: s.sprite.flipX, depth: 26 });
          hit(sc.enemies.filter(e => e.alive && e.d <= from + 20 && e.d >= s.d - 60), 0.16, e => { if (!e.boss) e.d = Math.max(0, e.d - 120); sc.fx.pfx('blunt', e.x, e.y, { scale: 1 }); });
          punch(X(), Y(), 1.25, 300); sc.sfx.play('shield');
        });
        at(2300, () => {
          s.shieldUntil = sc.time.now + 7000;
          sc.ambient.attach('dome' + v.id, 'divshield', s, () => !s.fallen && s.shieldUntil > sc.time.now, 10, 2 + k);
          for (const o of army.list) if (!o.fallen && o.mode === 'march' && Math.abs(o.sprite.x - X()) < r * 2.4 && Math.abs(o.sprite.y - Y()) < r * 2.4) { o.shieldUntil = sc.time.now + 6000; army.heal(o, army.maxHp(o)); sc.fx.spark(o.sprite.x, o.sprite.y - 20, 'white', 4); }
          sc.sfx.play('heal');
        });
        at(3300, () => { lift(160, 700); sc.sfx.play('power'); });
        at(FIN, () => {
          sc.fx.pfx('slam', X(), Y() + 10, { scale: 3, force: true, speed: 1.3 });
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; sc.fx.pfx('landing', X() + Math.cos(a) * 200, Y() + Math.sin(a) * 120, { scale: 2, force: true }); }
          const until = sc.time.now + u.stun * 1000 * Math.min(2, p) + 1000;
          hit(near(X(), Y(), r * 3), 0.4, e => { if (!e.boss) e.stunUntil = Math.max(e.stunUntil || 0, until); });
          sc.fx.debris(X(), Y(), 40);
          finale(X(), Y());
        });
        break;
      }
      case 'phap': { // Lôi Hỏa Thiên Giáng: a storm of lightning, a magic circle, two meteors, then a ring of fire pillars
        const pool = sc.enemies.filter(e => e.alive && Math.abs(e.x - X()) < 460 && Math.abs(e.y - Y()) < 460).sort(() => Math.random() - 0.5).slice(0, 8);
        pool.forEach((e, i) => at(i * 140, () => {
          if (!e.alive) return;
          sc.fx.pfx('strike', e.x, e.y + 20, { scale: k, force: true, depth: 26, speed: 1.8 });
          T(t0 + i * 140 + 200, () => { hit(near(e.x, e.y, 90 * R), 0.07); sc.sfx.play('thunder'); });
        }));
        const c1 = cluster(X(), Y());
        at(1300, () => { sc.fx.pfx('circle', c1.x, c1.y + 20, { scale: 2 + (huge ? 1 : 0), force: true, depth: 5 }); punch(c1.x, c1.y, 1.2, 600); sc.sfx.play('summon'); });
        at(2000, () => sc.fx.pfx('meteor', c1.x - 80, c1.y + 30, { scale: 1 + k, force: true, depth: 26, speed: 1.6 }));
        at(2500, () => { hit(near(c1.x - 40, c1.y, 150 * R), 0.16); stop(120); boom(c1.x - 40, c1.y, 0xff8a2a, 260); });
        at(2700, () => sc.fx.pfx('meteor', c1.x + 40, c1.y + 50, { scale: 1 + k, force: true, depth: 26, speed: 1.6 }));
        at(3200, () => { hit(near(c1.x + 40, c1.y, 150 * R), 0.16); stop(120); boom(c1.x + 40, c1.y, 0xff8a2a, 260); });
        at(FIN, () => {
          sc.fx.pfx('firering', c1.x, c1.y + 20, { scale: 2 + (huge ? 1 : 0), force: true, depth: 9 });
          for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; sc.fx.pfx('flamepillar', c1.x + Math.cos(a) * 170, c1.y + Math.sin(a) * 100 + 20, { scale: 1, force: true, depth: 26, speed: 1.6 }); }
          sc.fx.pfx('strike', c1.x, c1.y + 20, { scale: 2, force: true, depth: 27, speed: 1.6 });
          hit(near(c1.x, c1.y, u.radius * R * 1.7), 0.42, e => sc.fx.pfx('crit', e.x, e.y, { scale: 1 }));
          finale(c1.x, c1.y);
        });
        break;
      }
      case 'y': { // Hồi Xuân Diệu Thủ: bloom of life, light on the wounded, the fallen rise, shields, holy rain, then a pillar of heaven
        const r = u.radius * R;
        const healAround = (x, y, rr, pct) => { for (const o of army.list) if (!o.fallen && o.mode === 'march' && Math.abs(o.sprite.x - x) < rr && Math.abs(o.sprite.y - y) < rr) { army.heal(o, army.maxHp(o) * pct); o.stunUntil = 0; o.poisonUntil = 0; sc.fx.spark(o.sprite.x, o.sprite.y - 24, 'green', 3); } };
        at(0, () => { sc.fx.pfx('healaoe', X(), Y() + 8, { scale: 1 + k, force: true, depth: 9 }); healAround(X(), Y(), r, u.healPct); sc.sfx.play('heal'); });
        const allies = army.list.filter(o => !o.fallen && o.mode === 'march' && o !== s).sort((a, b) => a.hp / army.maxHp(a) - b.hp / army.maxHp(b)).slice(0, 8);
        allies.forEach((o, i) => at(400 + i * 130, () => { if (o.fallen) return; sc.fx.pfx('pillar', o.sprite.x, o.sprite.y + 4, { scale: 1, force: true, speed: 1.8, depth: 26 }); army.heal(o, army.maxHp(o)); o.shieldUntil = sc.time.now + 4000; }));
        at(1600, () => {
          const revives = huge ? 10 : big ? 5 : 3;
          const dead = army.list.filter(o => o.fallen).sort((a, b) => b.fellAt - a.fellAt).slice(0, revives);
          for (const o of dead) army.revive(o);
          if (dead.length) sc.feed(`${v.name} hồi sinh ${dead.length} chiến sĩ!`, '#9fe1cb');
          sc.fx.pfx('pillar', W / 2, sc.pathPts[sc.pathPts.length - 1].y + 40, { scale: 2, force: true, speed: 1.5 });
          sc.sfx.play('revive');
        });
        at(2300, () => { const c1 = cluster(X(), Y()); sc.fx.pfx('starfall', c1.x, c1.y + 40, { scale: 1 + k, force: true, depth: 26, speed: 1.5 }); T(t0 + 2650, () => hit(near(c1.x, c1.y, 170 * R), 0.5, e => sc.fx.spark(e.x, e.y - 10, 'green', 6))); });
        at(3100, () => { const c1 = cluster(X() + rand(-200, 200), Y()); sc.fx.pfx('starfall', c1.x, c1.y + 40, { scale: 1 + k, force: true, depth: 26, speed: 1.5 }); T(t0 + 3450, () => hit(near(c1.x, c1.y, 170 * R), 0.5)); });
        at(FIN, () => {
          sc.fx.pfx('pillar', X(), Y() + 6, { scale: 3, force: true, depth: 26, speed: 1.3 });
          sc.fx.pfx('healaoe', X(), Y() + 8, { scale: 3, force: true, depth: 9 });
          healAround(X(), Y(), r * 3, 1);
          hit(near(X(), Y(), r * 1.6), 0.8);
          finale(X(), Y());
        });
        break;
      }
      case 'song': { // Song Long Loạn Vũ: a blade frenzy, a faster second frenzy, a leaping cross, then twin dragons
        const r = u.radius * R;
        const cut = (i, scale) => {
          const t = near(X(), Y() - 20, r * 1.5).filter(e => e.alive);
          const e = t.length ? t[i % t.length] : null;
          const ex = e ? e.x : X() + rand(-r, r), ey = e ? e.y : Y() + rand(-60, 30);
          sc.fx.pfx('slash', ex, ey + 10, { scale, force: true, depth: 26, flip: i % 2 === 1, angle: rand(-35, 35) });
          if (e) hit([e], 0.035, o => sc.fx.pfx('hitspark', o.x, o.y, { scale: 1 }));
          if (i % 3 === 0) sc.sfx.play('slash');
        };
        for (let i = 0; i < 12; i++) at(i * 90, () => cut(i, 1));
        for (let i = 0; i < 16; i++) at(1300 + i * 55, () => cut(i, 1 + (i % 4 === 0 ? 1 : 0)));
        at(2400, () => { lift(150, 600); sc.sfx.play('power'); });
        at(2700, () => { sc.fx.pfx('slash', X(), Y() + 6, { scale: 2 + k, force: true, depth: 26, angle: 35 }); sc.fx.pfx('slash', X(), Y() + 6, { scale: 2 + k, force: true, depth: 26, angle: -35, flip: true }); hit(near(X(), Y(), r * 1.6), 0.16); stop(140); punch(X(), Y(), 1.3, 300); });
        at(FIN, () => {
          const c2 = cluster(X(), Y());
          sc.fx.pfx('thrust', c2.x - 120, c2.y - 20, { scale: 3, force: true, depth: 27, angle: 20 });
          sc.fx.pfx('thrust', c2.x + 120, c2.y - 20, { scale: 3, force: true, depth: 27, angle: 160 });
          sc.fx.pfx('slash', c2.x, c2.y + 10, { scale: 3 + k, force: true, depth: 26 });
          hit(near(c2.x, c2.y, 240 * R), 0.42, e => sc.fx.pfx('crit', e.x, e.y, { scale: 1 }));
          finale(c2.x, c2.y);
        });
        break;
      }
      case 'vo': { // Kim Cang Phục Ma: three palms, a whirling staff, a golden pillar, then the Buddha palm from the sky
        const r = u.radius * R;
        [0, 360, 720].forEach((ms, i) => at(ms, () => {
          const dir = s.sprite.flipX ? -1 : 1, px = X() + dir * (60 + i * 50);
          sc.fx.pfx('blunt', px, Y() - 10, { scale: 2 + (i === 2 ? 1 : 0), force: true, depth: 26 });
          sc.fx.shockwave(px, Y() - 10, col, r * (0.8 + i * 0.4), 360, 10);
          hit(near(px, Y() - 10, r * (0.8 + i * 0.4)), 0.09, e => { if (!e.boss) e.d = Math.max(0, e.d - 50); });
          cam.shake(200, 0.007); stop(80); sc.sfx.play('wallHit');
        }));
        for (let i = 0; i < 3; i++) at(1300 + i * 280, () => { sc.fx.pfx('slash', X(), Y() + 6, { scale: 1 + i, force: true, depth: 26, flip: i % 2 === 1 }); hit(near(X(), Y(), r * (1 + i * 0.3)), 0.08); sc.sfx.play('slash'); });
        at(2400, () => { sc.fx.pfx('pillar', X(), Y() + 6, { scale: 2 + k, force: true, depth: 26, speed: 1.4 }); sc.fx.pfx('circle', X(), Y() + 10, { scale: 2, force: true, depth: 5 }); for (const o of army.list) if (!o.fallen && o.mode === 'march' && Math.abs(o.sprite.x - X()) < r * 2 && Math.abs(o.sprite.y - Y()) < r * 2) army.heal(o, army.maxHp(o) * 0.5); sc.sfx.play('gong'); });
        at(3300, () => { const c2 = cluster(X(), Y()); punch(c2.x, c2.y - 120, 1.2, 700); sc.fx.beam(c2.x, c2.y, 'gold', 900); });
        at(FIN, () => {
          const c2 = cluster(X(), Y());
          sc.fx.pfx('pillar', c2.x, c2.y + 10, { scale: 3, force: true, depth: 27, speed: 1.3 });
          sc.fx.pfx('slam', c2.x, c2.y + 20, { scale: 3, force: true, speed: 1.3 });
          sc.fx.debris(c2.x, c2.y, 40);
          const until = sc.time.now + u.stun * 1000 * Math.min(2, p);
          hit(near(c2.x, c2.y, r * 2.2), 0.45, e => { if (!e.boss) e.stunUntil = Math.max(e.stunUntil || 0, until); });
          sc.sfx.play('gong');
          finale(c2.x, c2.y);
        });
        break;
      }
      case 'thich': { // Ảnh Sát Vô Hình: vanish, two rounds of blink-stabs that mark the targets, smoke, then every mark detonates
        const home = { x: X(), y: Y() };
        const marked = new Set();
        const pickTargets = n => sc.enemies.filter(e => e.alive && Math.abs(e.x - home.x) < 560 && Math.abs(e.y - home.y) < 560)
          .sort((a, b) => (b.boss - a.boss) || b.maxHp - a.maxHp).slice(0, n);
        at(0, () => { s.freePos = true; sc.fx.pfx('poof', X(), Y() + 4, { scale: 2, force: true }); s.sprite.setAlpha(0.12); sc.sfx.play('power'); });
        const round = (start, n, scale) => {
          const ts = pickTargets(n);
          ts.forEach((e, i) => at(start + i * 140, () => {
            if (!e.alive) return;
            s.sprite.setPosition(e.x - 26, e.y + 24).setAlpha(0.9);
            sc.fx.pfx('thrust', e.x - 30, e.y - 10, { scale, force: true, depth: 26 });
            sc.fx.pfx('crit', e.x, e.y, { scale: 1 + (huge ? 1 : 0), force: true });
            hit([e], 0.07 * 2.5);
            marked.add(e);
            sc.time.delayedCall(80, () => s.sprite.setAlpha(0.12));
            sc.sfx.play('slash');
          }));
        };
        round(150, Math.round(u.targets * Math.min(1.6, R)), k);
        at(1400, () => { for (let i = 0; i < 6; i++) sc.fx.pfx('poof', home.x + rand(-180, 180), home.y + rand(-120, 80), { scale: 2, force: true }); });
        round(1900, Math.round(u.targets * Math.min(1.6, R)), 1 + k);
        at(3500, () => { s.sprite.setPosition(home.x, home.y).setAlpha(1); s.freePos = false; army.place(s); army.play(s, 'cast', true); punch(X(), Y(), 1.4, 500); sc.sfx.play('power'); });
        at(FIN, () => {
          for (const e of marked) if (e.alive) sc.fx.pfx('darkboom', e.x, e.y + 20, { scale: 1, force: true, speed: 1.8 });
          hit([...marked], 0.35);
          finale(X(), Y());
        });
        break;
      }
    }

    // ---------------- END
    T(END_MS, () => this.end(s));
    sc.time.delayedCall(END_MS + 900, () => { if (this.busy && this.run === run) this.end(s); }); // safety
  }

  // the total damage, big over the guard
  showTotal(s) {
    const sc = this.s;
    if (!s.sprite.active || this.total < 1) return;
    const t = sc.add.text(s.sprite.x, s.sprite.y - 90, `TỔNG SÁT THƯƠNG\n${Math.round(this.total).toLocaleString('vi-VN')}`, {
      fontFamily: HEAD, fontSize: '34px', color: '#ffe58a', align: 'center', testString: TEST, padding: { top: 8 }, stroke: '#3a0a06', strokeThickness: 8,
    }).setOrigin(0.5, 1).setDepth(57).setScale(0.4);
    sc.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.Out' });
    sc.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 500, delay: 1100, onComplete: () => t.destroy() });
  }

  end(s) {
    if (!this.busy) return;
    this.busy = false;
    s.ulting = false;
    s.freePos = false;
    if (s.sprite.active) s.sprite.setAlpha(1);
    if (s.sprite.active) { s.sprite.setDepth(5 + s.sprite.y * 1e-4); if (!s.fallen) { this.s.army.play(s, 'idle', true); this.s.army.place(s); } }
    this.spotOff();
    const cam = this.s.cameras.main;
    if (cam.zoom !== 1 || cam.scrollX || cam.scrollY) { cam.zoomTo(1, 200); cam.pan(W / 2, H / 2, 200); }
  }

  // ------------------------------------------------------------------ helpers
  fallingBlade(x, y) {
    const sc = this.s;
    const b = sc.add.image(x, y - 360, 'fx_arrow').setScale(3).setAngle(90).setTint(0xfff2b0).setDepth(27);
    sc.tweens.add({ targets: b, y, duration: 220, ease: 'Cubic.In', onComplete: () => { sc.fx.spark(x, y, 'gold', 4); sc.fx.pfx('hitspark', x, y, { scale: 1, every: 30 }); b.destroy(); } });
  }

  flyArrow(x, y, tx, ty, delay) {
    const sc = this.s;
    const a = sc.add.image(x, y, 'fx_arrow').setScale(2.4).setDepth(27).setAngle(Phaser.Math.RadToDeg(Math.atan2(ty - y, tx - x)));
    sc.tweens.add({ targets: a, x: tx, y: ty, duration: 260, delay, onComplete: () => { sc.fx.spark(tx, ty, 'gold', 2); a.destroy(); } });
  }

  // spotlight: a dark layer over the field with a soft hole that follows the caster
  spotOn(s, alpha) {
    const sc = this.s;
    if (!this.rt) this.rt = sc.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(25);
    this.rt.setVisible(true);
    this.spotTarget = s;
    this.spotAlpha = 0;
    sc.tweens.killTweensOf(this);
    sc.tweens.add({ targets: this, spotAlpha: alpha, duration: 220 });
  }
  spotTo(alpha) { this.s.tweens.killTweensOf(this); this.s.tweens.add({ targets: this, spotAlpha: alpha, duration: 260 }); }
  spotOff() {
    const sc = this.s;
    sc.tweens.killTweensOf(this);
    sc.tweens.add({ targets: this, spotAlpha: 0, duration: 450, onComplete: () => { this.spotTarget = null; this.rt?.setVisible(false); } });
  }

  update() {
    if (!this.rt || !this.spotTarget) return;
    const s = this.spotTarget, rt = this.rt;
    rt.clear();
    if (this.spotAlpha <= 0.01) return;
    rt.fill(0x05030a, this.spotAlpha);
    const r = 210;
    rt.erase('spot', s.sprite.x - r, s.sprite.y - 30 - r);
    rt.erase('spot', s.sprite.x - r, s.sprite.y - 30 - r); // twice: a clean, bright centre
  }
}
