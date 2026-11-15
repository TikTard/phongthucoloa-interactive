// Siege catapults on the citadel wall ("xe cẩu ném lửa"): slow to reload, not accurate, but every fire pot that lands
// blasts a wide area, and monsters it kills are flung flying off the screen.
import { W, CITADEL_Y, MAP_TOP } from './config.js';
import { rand, pick } from './util.js';

// our catapults only fire at monsters that have come at least `from` of the way along the path (0 = rift, 1 = gate)
export const SIEGE = { from: 0.5, reload: [8000, 11000], inaccuracy: [130, 80], radius: 120, dmg: 90, bossMult: 0.3, flight: 1300 };
// the demons' catapults at the top of the field: from `fromWave` they lob purple fire at the guards (guards caught in
// the blast are kicked off the screen); with no guards out they shell the citadel instead
// `until`: they only fire at guards that have pushed into the rift's half of the path (path progress below `until`)
export const ENEMY_SIEGE = { fromWave: 3, until: 0.5, reload: [11000, 15000], inaccuracy: [150, 90], radius: 95, citadelDmg: 2, flight: 1500 };

const PAL = { k: '#241622', d: '#6a4630', w: '#94673f', l: '#c4955e', m: '#6a7088', n: '#a4acc0', r: '#cdbfa6', b: '#3e2a22', f: '#e05a20', y: '#ffb040' };

// tiny pixel painter: fill shapes with palette chars, then a 1px outline around everything (like the PixelSpec art)
function paint(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = Array.from({ length: h + 2 }, () => Array(w + 2).fill('.'));
  const set = (x, y, c) => { x = Math.round(x) + 1; y = Math.round(y) + 1; if (y >= 1 && y <= h && x >= 1 && x <= w) g[y][x] = c; };
  const P = {
    rect: (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); },
    disc: (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) set(cx + x, cy + y, c); },
    line: (x0, y0, x1, y1, c, t = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let k = 0; k < t; k++) set(x + k, y, c); } },
    px: set,
  };
  draw(P);
  for (let y = 0; y < h + 2; y++) for (let x = 0; x < w + 2; x++) {
    if (g[y][x] !== '.') continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = g[y + dy]?.[x + dx]; return c && c !== '.' && c !== 'k'; });
    if (n) g[y][x] = 'k';
  }
  const t = scene.textures.createCanvas(key, w + 2, h + 2);
  const c = t.getContext();
  for (let y = 0; y < h + 2; y++) for (let x = 0; x < w + 2; x++) if (g[y][x] !== '.') { c.fillStyle = PAL[g[y][x]]; c.fillRect(x, y, 1, 1); }
  t.refresh();
}

export class Siege {
  constructor(scene) {
    this.s = scene;
    // base: wheels, chassis, A-frame uprights and a crossbar with the pivot
    paint(scene, 'catapult_base', 30, 22, P => {
      P.line(9, 11, 14, 2, 'w', 2); P.line(20, 11, 15, 2, 'd', 2);
      P.rect(12, 1, 18, 2, 'l'); P.disc(15, 2, 1, 'm');
      P.rect(1, 11, 28, 11, 'l'); P.rect(1, 12, 28, 13, 'w'); P.rect(1, 14, 28, 14, 'd');
      P.line(4, 11, 9, 7, 'r'); P.line(25, 11, 20, 7, 'r');
      for (const cx of [6, 23]) { P.disc(cx, 17, 4, 'd'); P.disc(cx, 17, 3, 'w'); P.disc(cx, 17, 1, 'm'); P.px(cx, 17, 'n'); }
    });
    // arm: a long beam with a bowl at the end (drawn pointing right, pivot at its left end)
    paint(scene, 'catapult_arm', 32, 7, P => {
      P.rect(0, 3, 24, 3, 'l'); P.rect(0, 4, 24, 4, 'w'); P.disc(1, 3, 1, 'm');
      P.rect(24, 1, 25, 5, 'd'); P.rect(30, 1, 31, 5, 'd'); P.rect(25, 5, 30, 6, 'd'); P.rect(26, 4, 29, 4, 'b');
    });
    this.cats = [-1, 1].map(side => this.makeCatapult(side, false)).concat([-1, 1].map(side => this.makeCatapult(side, true)));
  }

  makeCatapult(side, enemy) {
    const s = this.s;
    const x = enemy ? (side < 0 ? 330 : 760) : (side < 0 ? 130 : W - 130);
    const y = enemy ? MAP_TOP + 70 : CITADEL_Y + 46;
    const base = s.add.image(0, 0, 'catapult_base').setOrigin(0.5, 1);
    const pivot = { x: 15 + 1 - 16, y: 2 + 1 - 24 }; // base pixels relative to bottom-centre
    const arm = s.add.image(pivot.x, pivot.y, 'catapult_arm').setOrigin(2 / 34, 4 / 9).setAngle(-170);
    const pot = s.add.image(0, 0, 'px_soft').setTint(0xffa040).setBlendMode('ADD').setScale(0.22);
    const box = s.add.container(x, y, [arm, base, pot]).setScale(side < 0 ? 3 : -3, 3).setDepth(4.7);
    if (enemy) { base.setTint(0xa078c8); arm.setTint(0xa078c8); pot.setTint(0xc58aff); }
    return { side, x, y, box, arm, pot, pivot, next: 0, loaded: true, enemy };
  }

  // demon catapults stand on the top row, clear of where the new path enters
  placeEnemyCats(path) {
    const top = new Set();
    for (let i = 0; i < path.length - 1; i++) {
      const [c1, r1] = path[i], [c2, r2] = path[i + 1];
      if (Math.min(r1, r2) <= 1.5) for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) top.add(c);
    }
    const free = [3, 5, 7, 11, 13, 4, 10, 12].filter(c => ![c - 1, c, c + 1].some(x => top.has(x)));
    const cols = free.length >= 2 ? [free[0], free.find(c => Math.abs(c - free[0]) >= 4) ?? free[1]] : [3, 13];
    this.cats.filter(c => c.enemy).forEach((c, i) => {
      c.x = -4 + cols[i] * 64 + 32;
      c.box.setPosition(c.x, c.y);
    });
  }

  // world position of the bowl at the end of the arm
  bowl(c) {
    const a = Phaser.Math.DegToRad(c.arm.angle), L = 27;
    const lx = c.pivot.x + Math.cos(a) * L, ly = c.pivot.y + Math.sin(a) * L;
    return { lx, ly, x: c.x + lx * c.box.scaleX, y: c.y + ly * c.box.scaleY };
  }

  update(now) {
    const sc = this.s;
    for (const c of this.cats) {
      const b = this.bowl(c);
      c.pot.setPosition(b.lx, b.ly - 2).setVisible(c.loaded).setAlpha(0.7 + 0.3 * Math.sin(now / 90));
      if (sc.state !== 'play' || sc.paused) { if (sc.state === 'rally') this.announced = false; continue; }
      if (c.enemy) { this.updateEnemy(c, now); continue; }
      if (!c.next) c.next = now + rand(2000, 5000) + (c.side > 0 ? 1500 : 0);
      if (now < c.next || !c.loaded) continue;
      const targets = sc.enemies.filter(e => e.alive && e.d >= sc.pathLen * SIEGE.from && e.y < CITADEL_Y - 120 && !(e.shieldUntil > now));
      if (!targets.length) { c.next = now + 800; continue; }
      // aim at a monster near the front of the march (closest to the gate), with plenty of slop
      targets.sort((a, b2) => b2.d - a.d);
      const t = pick(targets.slice(0, 6));
      this.fire(c, t);
      c.next = now + rand(...SIEGE.reload);
    }
  }

  updateEnemy(c, now) {
    const sc = this.s;
    if (sc.wave < ENEMY_SIEGE.fromWave) { c.next = 0; return; }
    if (!c.next) c.next = now + rand(3000, 6000) + (c.side > 0 ? 2500 : 0);
    if (now < c.next || !c.loaded) return;
    if (!this.announced) { this.announced = true; sc.announce('QUỶ DỰNG XE BẮN LỬA!\nTản ra kẻo bị bắn bay', '#c58aff', 50); }
    // aim at the guards holding the front (they're the ones in the way), with plenty of slop
    const guards = sc.soldiers.filter(s => s.mode === 'march' && !s.fallen && s.sprite.visible && !s.ulting && s.d <= sc.pathLen * ENEMY_SIEGE.until);
    if (!guards.length) { c.next = now + 1000; return; } // nobody in their half: hold fire
    guards.sort((a, b) => a.d - b.d);
    const g = pick(guards.slice(0, 10)).sprite;
    const t = { x: g.x, y: g.y - 10 };
    this.fire(c, t);
    c.next = now + rand(...ENEMY_SIEGE.reload);
  }

  fire(c, t) {
    const sc = this.s;
    c.loaded = false;
    sc.sfx.play('wallHit');
    // the arm whips over, the pot leaves at the top of the swing
    sc.tweens.add({
      targets: c.arm, angle: -40, duration: 220, ease: 'Back.Out',
      onComplete: () => {
        const from = this.bowl(c);
        const inacc = c.enemy ? ENEMY_SIEGE.inaccuracy : SIEGE.inaccuracy;
        this.throwPot(from.x, from.y - 10, t.x + rand(-1, 1) * inacc[0], t.y + rand(-1, 1) * inacc[1], c.enemy, t.citadel);
        // slowly winched back and reloaded
        sc.tweens.add({ targets: c.arm, angle: -170, duration: 2600, delay: 400, ease: 'Sine.InOut', onComplete: () => { c.loaded = true; } });
      },
    });
    sc.fx.puff(c.x, c.y - 30, 2);
  }

  throwPot(x0, y0, x1, y1, enemy = false, citadel = false) {
    const sc = this.s;
    const ball = sc.fx.pfx('fireball', x0, y0, { scale: 1, force: true, depth: 27 }) || sc.add.image(x0, y0, 'fx_fireball').setScale(2.5).setDepth(27);
    if (enemy) ball.setTint(0xc58aff);
    const peak = Math.min(y0, y1) - rand(260, 380);
    const prog = { t: 0 };
    let px = x0, py = y0;
    sc.sfx.play('flames');
    sc.tweens.add({
      targets: prog, t: 1, duration: enemy ? ENEMY_SIEGE.flight : SIEGE.flight, ease: 'Linear',
      onUpdate: () => {
        const t = prog.t;
        const x = x0 + (x1 - x0) * t;
        const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * peak + t * t * y1;
        ball.setPosition(x, y).setAngle(Phaser.Math.RadToDeg(Math.atan2(y - py, x - px)));
        ball.setScale(1 + 0.5 * Math.sin(Math.PI * t)); // "height"
        if (Math.random() < 0.6) sc.fx.trail(x, y, enemy ? 'purple' : 'fire');
        px = x; py = y;
      },
      onComplete: () => { ball.destroy(); if (enemy) this.enemyImpact(x1, y1, citadel); else this.impact(x1, y1); },
    });
  }

  impact(x, y) {
    const sc = this.s, fx = sc.fx;
    fx.pfx('boom', x, y + 20, { scale: 2, force: true, speed: 1.6 });
    fx.pfx('firering', x, y + 20, { scale: 1, force: true, depth: 9 });
    fx.shockwave(x, y, 0xff8a2a, SIEGE.radius * 1.2, 420, 10);
    fx.scorch(x, y + 18, 1.6);
    fx.debris(x, y, 14);
    sc.cameras.main.shake(260, 0.008);
    sc.sfx.play('explode');
    const amount = SIEGE.dmg * sc.waveScale();
    for (const e of sc.enemiesNear(x, y, SIEGE.radius)) {
      e.flingFrom = { x, y };
      sc.damage(e, e.boss ? amount * SIEGE.bossMult : amount, null, { pierce: true });
      if (e.alive) { e.flingFrom = null; e.d = Math.max(0, e.d - 30); }
    }
  }

  // demon fire pot: guards caught in it are kicked off the screen; a pot that reaches the citadel cracks the wall
  enemyImpact(x, y, citadel) {
    const sc = this.s, fx = sc.fx;
    fx.pfx('darkboom', x, y + 20, { scale: 1, force: true, speed: 1.7 });
    fx.pfx('boom', x, y + 20, { scale: 1, force: true, speed: 1.8 });
    fx.shockwave(x, y, 0xc58aff, ENEMY_SIEGE.radius * 1.2, 400, 9);
    fx.scorch(x, y + 18, 1.2);
    sc.cameras.main.shake(220, 0.007);
    sc.sfx.play('explode');
    let n = 0;
    for (const s of sc.soldiers) {
      if (s.mode !== 'march' || s.fallen || !s.sprite.visible || s.ulting) continue;
      if (Math.abs(s.sprite.x - x) < ENEMY_SIEGE.radius && Math.abs(s.sprite.y - y) < ENEMY_SIEGE.radius * 0.8) { sc.army.launch(s, { x, y }); n++; }
    }
    if (citadel && sc.shieldUntil <= sc.time.now) {
      sc.citadel = Math.max(0, sc.citadel - ENEMY_SIEGE.citadelDmg);
      fx.edgeFlash(0xc58aff, 0.5, 500);
      sc.sfx.play('wallHit');
      if (sc.citadel <= 0) sc.gameOver();
    }
    if (n >= 3) sc.feed(`Xe bắn lửa của quỷ hất bay ${n} chiến sĩ!`, '#c58aff');
  }
}

// a monster killed by a blast flies away spinning, off the screen
export function flingCorpse(scene, e) {
  const sp = e.sprite, from = e.flingFrom;
  const g = scene.add.sprite(sp.x, sp.y, sp.texture.key, sp.frame.name).setOrigin(sp.originX, sp.originY)
    .setScale(sp.scaleX, sp.scaleY).setFlipX(sp.flipX).setDepth(29).setTint(0xffb080);
  const dir = sp.x === from.x ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(sp.x - from.x);
  const sx = sp.x, sy = sp.y, tx = dir > 0 ? W + 160 : -160, peak = Math.max(40, sy - rand(420, 820));
  const prog = { t: 0 };
  scene.tweens.add({
    targets: prog, t: 1, duration: rand(900, 1300),
    onUpdate: () => {
      const t = prog.t;
      g.setPosition(sx + (tx - sx) * t, sy + (peak - sy) * 4 * t * (1 - t) + 300 * t * t).setAngle(dir * 1440 * t);
      if (Math.random() < 0.4) scene.fx.trail(g.x, g.y, 'fire');
    },
    onComplete: () => g.destroy(),
  });
}
