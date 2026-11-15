// Boss "urgent phase": when a boss arrives the whole field catches fire until it falls.
// Alarm horn + scrolling KHẨN CẤP hazard stripes, an eruption of flame pillars and meteors, fires burning along
// both edges, embers rising everywhere, a fire tornado on the boss, a throbbing red edge and a warm glow.
import { W, H, MAP_TOP, CITADEL_Y, HUD_BOTTOM } from './config.js';
import { rand } from './util.js';
import { HEAD, TEST } from './ui.js';

export class Urgent {
  constructor(scene) {
    this.s = scene;
    this.active = false;
    this.parts = [];
    this.makeStripes();
  }

  makeStripes() {
    const s = this.s;
    if (s.textures.exists('hazard')) return;
    const t = s.textures.createCanvas('hazard', 64, 40);
    const c = t.getContext();
    c.fillStyle = '#1a0806'; c.fillRect(0, 0, 64, 40);
    c.fillStyle = '#e8402a';
    for (let x = -40; x < 64; x += 32) { c.beginPath(); c.moveTo(x, 40); c.lineTo(x + 16, 40); c.lineTo(x + 56, 0); c.lineTo(x + 40, 0); c.closePath(); c.fill(); }
    c.fillStyle = '#ffb040'; c.fillRect(0, 0, 64, 3); c.fillRect(0, 37, 64, 3);
    t.refresh();
  }

  start(boss) {
    const s = this.s, fx = s.fx;
    this.boss = boss;
    if (this.active) return;
    this.active = true;
    this.nextPillar = s.time.now + 1800;
    this.nextMeteor = s.time.now + 3200;
    this.nextPulse = s.time.now + 1500;
    s.sfx.play('alarm');
    s.time.delayedCall(500, () => s.sfx.play('flames'));

    // hazard stripes under the HUD and over the river
    for (const y of [HUD_BOTTOM + 80, CITADEL_Y - 70]) {
      const strip = s.add.tileSprite(W / 2, y, W, 40, 'hazard').setDepth(46).setAlpha(0);
      const label = s.add.text(W / 2, y, 'KHẨN CẤP  ·  BOSS XUẤT TRẬN  ·  KHẨN CẤP', {
        fontFamily: HEAD, fontSize: '24px', color: '#fff2dc', testString: TEST, padding: { top: 4 }, stroke: '#1a0806', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(46.5).setAlpha(0);
      s.tweens.add({ targets: [strip, label], alpha: 1, duration: 200 });
      s.tweens.add({ targets: label, alpha: 0.35, duration: 380, yoyo: true, repeat: -1, delay: 250, ease: 'Stepped', easeParams: [1] });
      this.parts.push(strip, label);
      this.strips = (this.strips || []).concat(strip);
    }

    // warm glow over the field
    const glow = s.add.rectangle(0, MAP_TOP, W, CITADEL_Y - MAP_TOP + 260, 0xff5a1a, 0).setOrigin(0).setDepth(18).setBlendMode('ADD');
    s.tweens.add({ targets: glow, fillAlpha: { from: 0.05, to: 0.13 }, duration: 900, yoyo: true, repeat: -1 });
    this.parts.push(glow);

    // embers rising across the whole screen
    this.embers = s.add.particles(0, 0, 'px_dot', {
      x: { min: 0, max: W }, y: H - 140, lifespan: { min: 2200, max: 4200 }, speedY: { min: -260, max: -90 }, speedX: { min: -40, max: 40 },
      scale: { start: 1.6, end: 0.2 }, alpha: { start: 1, end: 0 }, tint: [0xffe25a, 0xff8a2a, 0xe8402a], blendMode: 'ADD', frequency: 25,
    }).setDepth(21);
    this.parts.push(this.embers);

    // fires along both edges of the field
    for (let y = MAP_TOP + 170, i = 0; y < CITADEL_Y - 40; y += 200, i++) {
      for (const x of [34, W - 34]) {
        const f = fx.pfx(i % 2 ? 'campfire' : 'torch', x, y, { scale: i % 2 ? 1 : 2, force: true, depth: 13, flip: x > W / 2 });
        if (f) { f.anims.setProgress(Math.random()); f.setAlpha(0); s.tweens.add({ targets: f, alpha: 1, duration: 300, delay: i * 60 }); this.parts.push(f); }
      }
    }

    // a fire tornado that follows the boss
    s.ambient.attach('bossTornado', 'firetornado', boss, () => this.active && boss.alive, 6, 2);

    // the eruption: pillars of fire across the field, meteors, a ring of fire at the gate
    for (let i = 0; i < 9; i++) {
      s.time.delayedCall(200 + i * 130, () => {
        if (!this.active) return;
        fx.pfx('flamepillar', rand(90, W - 90), rand(MAP_TOP + 200, CITADEL_Y - 60), { scale: 1, force: true, depth: 10, speed: 1.3 });
        if (i % 3 === 0) s.sfx.play('flames');
      });
    }
    for (let i = 0; i < 4; i++) s.time.delayedCall(500 + i * 280, () => this.meteor());
    fx.pfx('firering', W / 2, CITADEL_Y + 30, { scale: 2, force: true, depth: 9 });
    fx.edgeFlash(0xff3a1a, 1, 1400);
    s.cameras.main.shake(700, 0.01);
  }

  meteor() {
    if (!this.active) return;
    const s = this.s;
    const live = s.enemies.filter(e => e.alive && !e.boss);
    const t = live.length && Math.random() < 0.7 ? live[Math.floor(Math.random() * live.length)] : { x: rand(120, W - 120), y: rand(MAP_TOP + 200, CITADEL_Y - 100) };
    s.fx.pfx('meteor', t.x - 40, t.y + 40, { scale: 1, force: true, depth: 11, speed: 1.4 });
    s.time.delayedCall(700, () => { if (this.active) { s.cameras.main.shake(160, 0.006); s.sfx.play('explode'); } });
  }

  update(now) {
    if (!this.active) return;
    if (!this.s.enemies.some(e => e.boss && e.alive)) { this.stop(); return; }
    for (const st of this.strips || []) st.tilePositionX += 2;
    if (now > this.nextPillar) {
      this.nextPillar = now + rand(1400, 2400);
      this.s.fx.pfx('flamepillar', rand(90, W - 90), rand(MAP_TOP + 200, CITADEL_Y - 60), { scale: 1, force: true, depth: 10, speed: 1.3 });
      this.s.sfx.play('flames');
    }
    if (now > this.nextMeteor) { this.nextMeteor = now + rand(3500, 5500); this.meteor(); }
    if (now > this.nextPulse) { this.nextPulse = now + 1500; this.s.fx.edgeFlash(0xff2a1a, 0.4, 900); }
  }

  // the fire dies down when the boss falls (instant on a round reset)
  stop(instant = false) {
    if (!this.active) return;
    this.active = false;
    const s = this.s;
    this.embers?.stop();
    for (const p of this.parts) {
      s.tweens.killTweensOf(p);
      if (instant) { p.destroy(); continue; }
      if (p.x !== undefined && p.texture && (p.texture.key.startsWith('pfx_campfire') || p.texture.key.startsWith('pfx_torch'))) s.fx.puff(p.x, p.y - 30, 3);
      s.tweens.add({ targets: p, alpha: 0, duration: 900, onComplete: () => p.destroy() });
    }
    this.parts = [];
    this.strips = [];
  }
}
