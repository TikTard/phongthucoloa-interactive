// Visual effects: particles, glow, light beams, magic circles, lightning, weather, ambient motes.
import { W, H, MAP_TOP, CITADEL_Y } from './config.js';

export const COLORS = {
  gold: 0xffd94a, fire: 0xff7a2a, ice: 0x9be7ff, green: 0x7dff9a, purple: 0xb06aff,
  red: 0xff4a4a, white: 0xffffff, pink: 0xff7aa8, teal: 0x5dffd0,
};

export class FX {
  constructor(scene) {
    this.s = scene;
    this.webgl = scene.game.renderer.type === Phaser.WEBGL;
    this.makeTextures();
    this.emitters = {};
    for (const [name, color] of Object.entries(COLORS)) {
      this.emitters[name] = scene.add.particles(0, 0, 'px_dot', {
        speed: { min: 90, max: 320 }, lifespan: { min: 260, max: 620 }, scale: { start: 1.6, end: 0 },
        alpha: { start: 1, end: 0.2 }, tint: color, blendMode: 'ADD', emitting: false,
      }).setDepth(27);
    }
    this.glowEmit = {};
    for (const name of ['fire', 'ice', 'gold', 'green', 'purple', 'white']) {
      this.glowEmit[name] = scene.add.particles(0, 0, 'px_soft', {
        speed: { min: 0, max: 30 }, lifespan: { min: 180, max: 320 }, scale: { start: 0.42, end: 0 },
        alpha: { start: 0.75, end: 0 }, tint: COLORS[name], blendMode: 'ADD', emitting: false,
      }).setDepth(26);
    }
    this.smoke = scene.add.particles(0, 0, 'px_soft', {
      speed: { min: 20, max: 80 }, angle: { min: 200, max: 340 }, lifespan: { min: 500, max: 900 },
      scale: { start: 0.5, end: 1.2 }, alpha: { start: 0.5, end: 0 }, tint: [0x4a3a5a, 0x2a2238, 0x6a5a7a], emitting: false,
    }).setDepth(26);
    this.coins = scene.add.particles(0, 0, 'fx_coin', {
      speed: { min: 260, max: 620 }, angle: { min: 220, max: 320 }, gravityY: 1300, lifespan: 1400,
      scale: { start: 2.4, end: 2 }, rotate: { min: 0, max: 360 }, emitting: false,
    }).setDepth(28);
    this.snowE = scene.add.particles(0, 0, 'px_dot', {
      x: { min: 0, max: W }, y: MAP_TOP, speedY: { min: 120, max: 260 }, speedX: { min: -40, max: 40 },
      lifespan: 6000, scale: { min: 0.8, max: 1.8 }, alpha: { start: 0.9, end: 0.2 }, tint: 0xe8f8ff, frequency: -1, quantity: 6,
    }).setDepth(22);
    // ambient: falling leaves
    this.leaves = scene.add.particles(0, 0, 'px_leaf', {
      x: { min: -40, max: W }, y: MAP_TOP - 10, speedY: { min: 30, max: 70 }, speedX: { min: 10, max: 50 },
      lifespan: 16000, scale: { min: 2, max: 3 }, rotate: { start: 0, end: 360 }, alpha: 0.85, frequency: 900,
      tint: [0x8fd16a, 0xd8c060, 0xe08a4a],
    }).setDepth(21);
    // fireworks / confetti / debris
    this.fireworkE = scene.add.particles(0, 0, 'px_dot', {
      speed: { min: 120, max: 420 }, lifespan: { min: 700, max: 1300 }, gravityY: 260, scale: { start: 1.8, end: 0 },
      alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(33);
    this.confettiE = scene.add.particles(0, 0, 'px_dot', {
      speed: { min: 260, max: 700 }, angle: { min: 210, max: 330 }, gravityY: 900, lifespan: 1600,
      scale: { min: 1.2, max: 2.2 }, rotate: { min: 0, max: 360 }, emitting: false,
      tint: [0xff4a6a, 0xffd94a, 0x5dffd0, 0x7aa8ff, 0xffffff, 0xff9a3a],
    }).setDepth(33);
    this.debrisE = scene.add.particles(0, 0, 'px_dot', {
      speed: { min: 120, max: 380 }, angle: { min: 200, max: 340 }, gravityY: 1200, lifespan: 900,
      scale: { min: 1.4, max: 2.6 }, emitting: false, tint: [0x8c8c96, 0x6e6e82, 0xa08060, 0x5a4a3a],
    }).setDepth(26);
    this.splashE = scene.add.particles(0, 0, 'px_dot', {
      speed: { min: 30, max: 90 }, angle: { min: 220, max: 320 }, gravityY: 500, lifespan: 260,
      scale: { start: 1, end: 0 }, alpha: 0.8, tint: 0xcfe8ff, emitting: false,
    }).setDepth(22);
    // river sparkles
    this.sparkleE = scene.add.particles(0, 0, 'px_dot', {
      x: { min: 40, max: W - 40 }, y: { min: CITADEL_Y - 64 - 22, max: CITADEL_Y - 64 + 22 }, lifespan: { min: 300, max: 700 },
      scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 }, tint: 0xffffff, blendMode: 'ADD', frequency: 90,
    }).setDepth(1);
    // drifting cloud shadows over the whole field
    this.clouds = [];
    for (let i = 0; i < 4; i++) {
      const c = scene.add.image(Phaser.Math.Between(-300, W), Phaser.Math.Between(MAP_TOP + 100, CITADEL_Y), 'px_soft')
        .setTint(0x0a1a10).setAlpha(0.06).setScale(Phaser.Math.FloatBetween(8, 12), Phaser.Math.FloatBetween(5, 7)).setDepth(19);
      c.speed = Phaser.Math.FloatBetween(8, 16);
      this.clouds.push(c);
    }
    this.scorches = [];
    if (this.webgl && scene.cameras.main.postFX) scene.cameras.main.postFX.addVignette(0.5, 0.5, 0.95, 0.14);
  }

  update(dt) {
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x - c.displayWidth / 2 > W) { c.x = -c.displayWidth / 2; c.y = Phaser.Math.Between(MAP_TOP + 100, CITADEL_Y); }
    }
  }

  // coloured flash around the screen edges (damage = red, combo = gold, freeze = blue)
  edgeFlash(color, alpha = 0.6, ms = 500) {
    const v = this.s.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W, H).setTint(color).setAlpha(alpha).setDepth(35);
    this.s.tweens.add({ targets: v, alpha: 0, duration: ms, ease: 'Quad.Out', onComplete: () => v.destroy() });
  }

  shockwave(x, y, color = 0xffd94a, maxR = 240, ms = 450, width = 8) {
    const g = this.s.add.graphics().setDepth(25).setBlendMode('ADD');
    const st = { r: 10 };
    this.s.tweens.add({
      targets: st, r: maxR, duration: ms, ease: 'Cubic.Out',
      onUpdate: tw => { g.clear().lineStyle(width * (1 - tw.progress) + 1, color, 0.9 * (1 - tw.progress)).strokeEllipse(x, y, st.r * 2, st.r * 1.1); },
      onComplete: () => g.destroy(),
    });
  }

  // pixelfx sprite-sheet effect (baked by art/build-pfx.mjs). (x, y) is the effect's own origin,
  // usually the floor point under it. Returns the sprite, or null when capped / rate-limited / missing.
  //  o.scale (2 = the game's art pixel size), o.every (ms between two of this key), o.speed, o.flip, o.angle, o.depth, o.add
  pfx(key, x, y, o = {}) {
    const s = this.s, m = s.pfxManifest?.[key], k = `pfx_${key}`;
    if (!m || !s.textures.exists(k)) return null;
    const now = s.time.now;
    this.pfxLast = this.pfxLast || {};
    this.pfxLive = this.pfxLive || 0;
    if (o.every && now - (this.pfxLast[key] ?? -1e9) < o.every) return null;
    if (!o.force && this.pfxLive >= 80) return null;
    this.pfxLast[key] = now;
    const sc = o.scale ?? 2;
    const sp = s.add.sprite(Math.round(x), Math.round(y), k, 0)
      .setOrigin(m.pivot[0] / m.w, m.pivot[1] / m.h).setScale(sc).setDepth(o.depth ?? 26).setFlipX(Boolean(o.flip));
    if (o.angle) sp.setAngle(o.angle);
    if (o.add) sp.setBlendMode('ADD');
    if (o.alpha) sp.setAlpha(o.alpha);
    this.pfxLive++;
    sp.once('destroy', () => { this.pfxLive--; });
    sp.play(`a_pfx_${key}`);
    sp.anims.timeScale = o.speed ?? 1;
    if (!m.loop) sp.once('animationcomplete', () => sp.destroy());
    return sp;
  }

  fireworks(n = 4, area = { x0: 80, x1: W - 80, y0: MAP_TOP + 80, y1: 900 }) {
    // pixelfx shells: each climbs from below and bursts near the top of its sheet
    if (this.s.pfxManifest?.firework) {
      for (let i = 0; i < n; i++) {
        this.s.time.delayedCall(i * 260 + Math.random() * 140, () => {
          const x = Phaser.Math.Between(area.x0, area.x1), y = Phaser.Math.Between(area.y0 + 300, area.y1 + 300);
          this.pfx(i % 2 ? 'firework2' : 'firework', x, y, { scale: 2, depth: 33, force: true, speed: 1.2 });
          this.s.time.delayedCall(700, () => this.s.sfx?.play('explode'));
        });
      }
      return;
    }
    const tints = [0xff4a6a, 0xffd94a, 0x5dffd0, 0x7aa8ff, 0xff9a3a, 0xd87aff];
    for (let i = 0; i < n; i++) {
      this.s.time.delayedCall(i * 220 + Math.random() * 120, () => {
        const x = Phaser.Math.Between(area.x0, area.x1), y = Phaser.Math.Between(area.y0, area.y1);
        // rising rocket trail
        const r = this.s.add.image(x, y + 300, 'px_soft').setTint(0xfff2c0).setBlendMode('ADD').setScale(0.25).setDepth(33);
        this.s.tweens.add({
          targets: r, y, duration: 380, ease: 'Quad.Out', onUpdate: () => this.trail(r.x, r.y + 10, 'gold'),
          onComplete: () => {
            r.destroy();
            const tint = tints[Math.floor(Math.random() * tints.length)];
            if (this.fireworkE.setParticleTint) this.fireworkE.setParticleTint(tint); else this.fireworkE.particleTint = tint;
            this.fireworkE.explode(40, x, y);
            this.halo(x, y, 'white', 2.2, 300);
            this.s.sfx?.play('explode');
          },
        });
      });
    }
  }

  confetti(x, y, n = 60) { this.confettiE.explode(n, x, y); }
  debris(x, y, n = 18) { this.debrisE.explode(n, x, y); this.puff(x, y, 6); }
  splash(x, y) { this.splashE.explode(5, x, y); }

  // dark burn mark left on the ground where something exploded (fades out)
  scorch(x, y, size = 1) {
    if (this.scorches.length > 24) this.scorches.shift().destroy();
    const s = this.s.add.image(x, y, 'px_soft').setTint(0x1a0e08).setAlpha(0.45).setScale(1.1 * size, 0.5 * size).setDepth(1);
    this.scorches.push(s);
    this.s.tweens.add({ targets: s, alpha: 0, delay: 2500, duration: 2000, onComplete: () => { s.destroy(); this.scorches = this.scorches.filter(o => o !== s); } });
  }

  // brief full-screen tint (boss entrance darkness, freeze frost)
  screenTint(color, alpha, ms) {
    const r = this.s.add.rectangle(0, 0, W, H, color, alpha).setOrigin(0).setDepth(34);
    this.s.tweens.add({ targets: r, alpha: 0, duration: ms, ease: 'Quad.In', onComplete: () => r.destroy() });
  }

  makeTextures() {
    const s = this.s;
    const g = s.make.graphics({ x: 0, y: 0, add: false });
    for (let r = 32; r > 0; r -= 1.5) { g.fillStyle(0xffffff, 0.035 + Math.pow(1 - r / 32, 2) * 0.22); g.fillCircle(32, 32, r); }
    g.generateTexture('px_soft', 64, 64); g.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4); g.generateTexture('px_dot', 4, 4); g.clear();
    for (let i = 0; i < 7; i++) { g.fillStyle(0x000000, 0.09); g.fillEllipse(32, 12, 64 - i * 8, 22 - i * 2.6); }
    g.generateTexture('shadow', 64, 24); g.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 2).fillRect(1, 2, 2, 1); g.generateTexture('px_leaf', 4, 3); g.clear();
    for (let i = 0; i < 32; i++) { g.fillStyle(0xffffff, 0.5 * Math.sin((i / 32) * Math.PI)); g.fillRect(i, 0, 1, 64); }
    g.generateTexture('px_beam', 32, 64);
    g.destroy();
    // screen-edge vignette (transparent centre, white edges, tinted when used)
    // square texture stretched to the screen -> elliptical vignette that reaches every edge
    const vt = s.textures.createCanvas('vignette', 128, 128);
    const vc = vt.getContext();
    vc.fillStyle = '#ffffff'; vc.fillRect(0, 0, 128, 128);
    // erase the middle: fully clear inside, fading back to solid at the edge
    const grad = vc.createRadialGradient(64, 64, 26, 64, 64, 66);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.75)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    vc.globalCompositeOperation = 'destination-out';
    vc.fillStyle = grad; vc.fillRect(0, 0, 128, 128);
    vc.globalCompositeOperation = 'source-over';
    vt.refresh();
    for (const k of ['px_soft', 'shadow', 'px_beam', 'vignette']) s.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  spark(x, y, color = 'gold', n = 10) { this.emitters[color]?.explode(n, x, y); }
  trail(x, y, color) { this.glowEmit[color]?.emitParticleAt(x, y, 1); }
  puff(x, y, n = 8) { this.smoke.explode(n, x, y); }
  coinBurst(x, y, n = 30) { this.coins.explode(n, x, y); }

  halo(x, y, color = 'gold', scale = 1.2, ms = 400) {
    const h = this.s.add.image(x, y, 'px_soft').setTint(COLORS[color] ?? color).setBlendMode('ADD').setScale(scale * 0.4).setDepth(26);
    this.s.tweens.add({ targets: h, scale, alpha: 0, duration: ms, onComplete: () => h.destroy() });
  }

  hit(x, y, color = 'white') {
    const s = this.s.add.sprite(x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(-10, 4), 'fx_hit').setScale(2).setDepth(27).setBlendMode('ADD');
    if (color !== 'white') s.setTint(COLORS[color]);
    s.play('a_fx_hit_hit');
    s.once('animationcomplete', () => s.destroy());
  }

  explode(x, y, size = 1, color = 'fire') {
    const s = this.s.add.sprite(x, y, 'fx_explosion').setScale(1.4 * size).setDepth(25);
    s.play('a_fx_explosion_boom');
    s.once('animationcomplete', () => s.destroy());
    this.halo(x, y, color, 1.4 * size, 350);
    this.spark(x, y, color === 'fire' ? 'gold' : color, Math.round(6 * size));
  }

  death(x, y, big = false) {
    this.explode(x, y, big ? 2.4 : 1, 'fire');
    this.puff(x, y, big ? 20 : 6);
    const soul = this.s.add.image(x, y, 'px_soft').setTint(COLORS.purple).setBlendMode('ADD').setScale(0.35).setDepth(26);
    this.s.tweens.add({ targets: soul, y: y - 90, alpha: 0, scale: 0.15, duration: 700, ease: 'Sine.Out', onComplete: () => soul.destroy() });
  }

  beam(x, y, color = 'gold', height = 520) {
    const b = this.s.add.image(x, y, 'px_beam').setOrigin(0.5, 1).setTint(COLORS[color]).setBlendMode('ADD').setDepth(26)
      .setDisplaySize(10, height).setAlpha(0.9);
    this.s.tweens.add({ targets: b, displayWidth: 90, alpha: 0, duration: 650, ease: 'Cubic.Out', onComplete: () => b.destroy() });
    this.spark(x, y - 40, color, 18);
  }

  circle(x, y, scale = 2.4, ms = 1600, color) {
    const c = this.s.add.sprite(x, y, 'fx_circle').setScale(scale * 0.4).setDepth(3).setBlendMode('ADD');
    if (color) c.setTint(COLORS[color]);
    c.play('a_fx_circle_spin');
    this.s.tweens.add({ targets: c, scale, duration: 300, ease: 'Back.Out' });
    if (ms > 0) this.s.tweens.add({ targets: c, alpha: 0, delay: ms - 400, duration: 400, onComplete: () => c.destroy() });
    return c;
  }

  lightning(x1, y1, x2, y2, color = 0xb06aff) {
    const g = this.s.add.graphics().setDepth(27).setBlendMode('ADD');
    const pts = [{ x: x1, y: y1 }];
    const n = 7;
    for (let i = 1; i < n; i++) pts.push({ x: x1 + (x2 - x1) * (i / n) + Phaser.Math.Between(-16, 16), y: y1 + (y2 - y1) * (i / n) + Phaser.Math.Between(-16, 16) });
    pts.push({ x: x2, y: y2 });
    g.lineStyle(16, color, 0.25).strokePoints(pts);
    g.lineStyle(7, color, 0.7).strokePoints(pts);
    g.lineStyle(2.5, 0xffffff, 1).strokePoints(pts);
    this.halo(x2, y2, 'purple', 1, 250);
    this.s.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  }

  glow(sprite, color, strength = 3) {
    if (!this.webgl || !sprite.preFX) return null;
    return sprite.preFX.addGlow(color, strength, 0, false, 0.1, 10);
  }

  snow(on) { if (on) this.snowE.explode(80); }

  damageNumber(x, y, value, crit = false) {
    // pixel digits that hop up in hard steps, like classic arcade score pops
    const t = this.s.add.text(Math.round(x), Math.round(y), String(Math.round(value)), {
      fontFamily: 'VT323', fontSize: crit ? '56px' : '40px', color: crit ? '#ffe14a' : '#ffffff',
    }).setOrigin(0.5).setDepth(29);
    t.setShadow(3, 3, crit ? '#8a1a12' : '#1a0e08', 0, false, true);
    this.s.tweens.add({ targets: t, y: y - 56, duration: 520, ease: 'Stepped', easeParams: [6] });
    this.s.time.delayedCall(700, () => t.destroy());
  }
}
