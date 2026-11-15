// "Diễn biến": the things that keep a long stream from feeling the same.
//  - Random events (7 new ones beside rain / charge / treasure in game.js).
//  - Wave twists, announced with the wave banner.
//  - Boss phases: rage at 60% HP, all-out at 25%.
import { W, MAP_TOP, CITADEL_Y, ENEMIES, WAVE_TWISTS, TWIST_CHANCE, XP } from './config.js';
import { rand, pick } from './util.js';

const FLYERS = ['bat', 'bat_fire', 'wisp', 'wisp_blue'];
const ARMORED = ['shield', 'shield_red', 'golem', 'golem_moss', 'toad'];
const SWARMERS = ['imp', 'wolf', 'bat', 'fox', 'snake', 'wisp'];

export class Director {
  constructor(scene) {
    this.s = scene;
    this.twist = null;
    this.fogParts = [];
  }

  // ------------------------------------------------------------------ wave twists
  pickTwist(n) {
    if (this.forceTwist) { const t = WAVE_TWISTS.find(x => x.id === this.forceTwist); this.forceTwist = ''; if (t) return t; }
    if (n < 3 || Math.random() > TWIST_CHANCE) return null;
    let r = Math.random() * WAVE_TWISTS.reduce((a, t) => a + t.weight, 0);
    for (const t of WAVE_TWISTS) { r -= t.weight; if (r <= 0) return t; }
    return null;
  }

  // mutates the scene's spawn queue for this wave
  applyTwist(n, types) {
    const sc = this.s, q = sc.spawnQueue;
    const t = this.twist = this.pickTwist(n);
    if (!t) return null;
    const unlocked = new Set(types);
    switch (t.id) {
      case 'armored': { // ~60% of the wave becomes armored units (it used to be all of them: a death wave late on)
        const ar = ARMORED.filter(k => unlocked.has(k));
        for (let i = 0; i < q.length; i++) if (Math.random() < 0.6) q[i] = pick(ar.length ? ar : ['shield']);
        break;
      }
      case 'swarm': { const sw = SWARMERS.filter(k => unlocked.has(k)); const add = q.length; for (let i = 0; i < add; i++) q.push(pick(sw.length ? sw : ['imp'])); break; }
      case 'flyers': { const fl = FLYERS.filter(k => unlocked.has(k)); for (let i = 0; i < q.length; i++) if (Math.random() < 0.75) q[i] = pick(fl.length ? fl : ['bat']); break; }
      case 'horde': { const add = Math.round(q.length * 0.5); for (let i = 0; i < add; i++) q.push(pick(types)); break; }
      case 'elite': this.elitesLeft = 3 + Math.floor(n / 8); break;
      case 'captain': this.captainPending = true; break;
    }
    return t;
  }

  // per-enemy modifiers while a twist is active
  onSpawn(e) {
    const t = this.twist;
    if (!t) return;
    if (t.id === 'swift') e.speed *= 1.5, e.hp *= 0.8, e.maxHp = e.hp;
    if (t.id === 'swarm') e.hp *= 0.5, e.maxHp = e.hp;
    if (t.id === 'armored') e.armor = Math.min(0.55, (e.armor || 0) + 0.15);
    if (t.id === 'elite' && this.elitesLeft > 0 && Math.random() < 0.3) { this.elitesLeft--; this.makeElite(e, 'Tinh Anh', 5, 0xffd94a); }
    if (t.id === 'captain' && this.captainPending && this.s.spawnQueue.length < 3) { this.captainPending = false; this.makeElite(e, 'Đầu Lĩnh', 12, 0xff6a3a, 1.6); this.s.announce(`ĐẦU LĨNH ${this.s.enemyName(e).toUpperCase()}!`, '#ff9060', 52); }
  }

  makeElite(e, title, hpMult, color, scaleMult = 1.3) {
    const sc = this.s;
    e.hp *= hpMult; e.maxHp = e.hp;
    e.elite = title;
    e.def = { ...e.def, scale: e.def.scale * scaleMult };
    e.sprite.setScale(e.def.scale);
    sc.fx.glow(e.sprite, color, 3);
    sc.fx.pfx('pillar', e.x, e.y + 20, { scale: 1, force: true, speed: 2 });
  }

  onKill(e, v) {
    const sc = this.s;
    if (e.elite) {
      sc.fx.coinBurst(e.x, e.y - 20, 18);
      sc.fx.pfx('coindrop', e.x, e.y + 20, { scale: 2, force: true });
      if (v) { sc.addXp(v, 25); sc.say(v, `hạ ${e.elite} ${sc.enemyName(e)}! +25 XP`, 'ok'); }
    }
    if (e.def.treasure) {
      sc.announce(`RƯƠNG BÁU BỊ PHÁ!${v ? `\n${v.name}` : ''}`, '#ffd94a', 56);
      sc.fx.pfx('chest', e.x, e.y + 20, { scale: 2, force: true });
      sc.fx.fireworks(4);
      sc.fx.coinBurst(e.x, e.y - 30, 40);
      sc.sfx.play('treasure');
      for (const o of sc.viewers.values()) if (o.soldier && !o.soldier.fallen) sc.addXp(o, XP.treasure / 2);
      if (v) sc.addXp(v, XP.treasure);
    }
  }

  // ------------------------------------------------------------------ boss phases
  checkBoss(e) {
    if (!e.boss || !e.alive) return;
    const f = e.hp / e.maxHp;
    if (!e.phase) e.phase = 1;
    if (e.phase === 1 && f < 0.6) this.bossPhase(e, 2);
    else if (e.phase === 2 && f < 0.25) this.bossPhase(e, 3);
  }

  bossPhase(e, n) {
    const sc = this.s, fx = sc.fx;
    e.phase = n;
    const title = n === 2 ? 'NỔI GIẬN' : 'LIỀU MẠNG';
    sc.announce(`${e.name.toUpperCase()} ${title}!`, '#ff6060', 56);
    e.speed *= n === 2 ? 1.25 : 1.3;
    e.def = { ...e.def, every: Math.max(3, (e.def.every || 7) * (n === 2 ? 0.7 : 0.55)) };
    sc.timers.bossSkill = sc.time.now + 1200;
    fx.pfx('darkboom', e.x, e.y + 20, { scale: 2, force: true, speed: 1.4 });
    fx.shockwave(e.x, e.y, 0xff2a2a, 520, 700, 14);
    fx.edgeFlash(0xff1a1a, 1, 1200);
    sc.cameras.main.shake(600, 0.012);
    sc.sfx.play('boss');
    e.sprite.setTint(n === 2 ? 0xff9a8a : 0xff5a5a);
    e.tintHold = true;
    // minions pour out around the boss
    const count = n === 2 ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const types = sc.unlockedTypes();
      const m = sc.spawnEnemy(pick(types));
      m.d = Math.max(0, e.d - 30 - i * 26);
      if (n === 3) this.makeElite(m, 'Tinh Anh', 4, 0xffd94a);
    }
    sc.feed(`${e.name} vào giai đoạn ${n}: ${title}!`, '#ff8080');
  }

  // ------------------------------------------------------------------ events
  startEvent(id) {
    const sc = this.s, now = sc.time.now, fx = sc.fx;
    switch (id) {
      case 'meteor':
        sc.event = { id, label: 'Mưa sao băng — trời giúp ta!', until: now + 15000, next: now + 800 };
        sc.announce('MƯA SAO BĂNG!\nTrời giáng sao trúng quái', '#ffe58a', 54);
        sc.sfx.play('gong');
        return true;
      case 'tornado': {
        sc.event = { id, label: 'Gió lốc quét đường', until: now + 7000 };
        sc.announce('GIÓ LỐC!\nQuét lùi quân địch', '#9fe1cb', 54);
        const tw = fx.pfx('firetornado', sc.pathPts[sc.pathPts.length - 1].x, CITADEL_Y - 40, { scale: 2, force: true, depth: 12 });
        sc.event.tornado = tw; sc.event.d = sc.pathLen;
        sc.sfx.play('flames');
        return true;
      }
      case 'festival': {
        sc.event = { id, label: 'Lễ hội đèn lồng — x2 XP, hồi máu nhanh', until: now + 25000 };
        sc.announce('LỄ HỘI ĐÈN LỒNG!\nx2 XP · chiến sĩ hồi máu nhanh', '#ffb070', 52);
        sc.event.lanterns = sc.add.particles(0, 0, 'lantern', {
          x: { min: 40, max: W - 40 }, y: CITADEL_Y, lifespan: 6000, speedY: { min: -120, max: -60 }, speedX: { min: -20, max: 20 },
          scale: { start: 2, end: 1.4 }, alpha: { start: 1, end: 0 }, frequency: 260,
        }).setDepth(20);
        sc.sfx.play('rankUp');
        return true;
      }
      case 'fog': {
        sc.event = { id, label: 'Sương mù — anh hùng bắn gần lại', until: now + 20000 };
        sc.announce('SƯƠNG MÙ!\nTầm bắn anh hùng giảm', '#d8e0e8', 52);
        for (let i = 0; i < 7; i++) {
          const f = sc.add.image(rand(0, W), rand(MAP_TOP + 100, CITADEL_Y - 100), 'px_soft').setTint(0xeef2f6).setAlpha(0).setScale(rand(9, 14), rand(4, 6)).setDepth(19);
          sc.tweens.add({ targets: f, alpha: 0.45, duration: 1200 });
          sc.tweens.add({ targets: f, x: f.x + rand(-300, 300), duration: 20000 });
          this.fogParts.push(f);
        }
        return true;
      }
      case 'ambush': {
        const d = sc.pathLen * rand(0.4, 0.6);
        const p = sc.posAt(d);
        sc.event = { id, label: 'Quỷ đánh úp giữa đường!', until: now + 9000, d, left: 8 + Math.floor(sc.wave / 2), next: now + 800 };
        sc.event.rift = fx.pfx('rift', p.x, p.y + 30, { scale: 1, force: true, depth: 3 });
        fx.pfx('darkboom', p.x, p.y + 20, { scale: 1, force: true });
        sc.announce('QUỶ ĐÁNH ÚP!\nCửa quỷ mở giữa đường', '#c58aff', 54);
        sc.sfx.play('boss');
        return true;
      }
      case 'chestrun': {
        const e = sc.spawnEnemy('chestrun');
        e.hp = e.maxHp = ENEMIES.chestrun.hp * sc.waveScale();
        fx.glow(e.sprite, 0xffd94a, 4);
        sc.event = { id, label: 'Rương báu chạy trốn — đánh vỡ nó!', until: now + 20000, chestEnemy: e };
        sc.announce('RƯƠNG BÁU CHẠY TRỐN!\nĐánh vỡ trước khi nó thoát', '#ffd94a', 52);
        sc.sfx.play('treasure');
        return true;
      }
      case 'quake': {
        sc.event = { id, label: 'Động đất', until: now + 4000 };
        sc.announce('ĐỘNG ĐẤT!\nQuân địch choáng váng', '#d8b070', 54);
        sc.cameras.main.shake(1800, 0.01);
        for (let i = 0; i < 6; i++) sc.time.delayedCall(i * 250, () => fx.pfx('slam', rand(100, W - 100), rand(MAP_TOP + 200, CITADEL_Y - 80), { scale: 2, force: true, speed: 1.5 }));
        for (const e of sc.enemies) if (e.alive && !e.boss) { e.stunUntil = now + 3500; sc.damage(e, e.maxHp * 0.15, null, { pierce: true }); }
        for (const s of sc.soldiers) if (s.mode === 'march' && !s.fallen) s.stunUntil = now + 800;
        sc.sfx.play('wallHit');
        return true;
      }
    }
    return false;
  }

  update(now) {
    const sc = this.s, ev = sc.event;
    if (!ev) return;
    if (ev.id === 'meteor' && now > ev.next) {
      ev.next = now + rand(500, 900);
      const live = sc.enemies.filter(e => e.alive);
      const t = live.length ? pick(live) : { x: rand(120, W - 120), y: rand(MAP_TOP + 200, CITADEL_Y - 100) };
      sc.fx.pfx('meteor', t.x - 40, t.y + 40, { scale: 1, force: true, depth: 11, speed: 1.5 });
      sc.time.delayedCall(650, () => {
        for (const e of sc.enemiesNear(t.x, t.y, 110)) sc.damage(e, (e.boss ? 40 : 60) * sc.waveScale(), null, { pierce: true });
        sc.cameras.main.shake(120, 0.005); sc.sfx.play('explode');
      });
    }
    if (ev.id === 'tornado' && ev.tornado?.active) {
      ev.d = Math.max(0, ev.d - 600 * (1 / 60));
      const p = sc.posAt(ev.d);
      ev.tornado.setPosition(p.x, p.y + 30);
      for (const e of sc.enemiesNear(p.x, p.y, 90)) {
        if (e.boss) continue;
        e.d = Math.max(0, e.d - 6);
        if (!e.tornadoHit) { e.tornadoHit = true; sc.damage(e, e.maxHp * 0.25, null, { pierce: true }); }
      }
      if (ev.d <= 0) { ev.tornado.destroy(); ev.until = now; }
    }
    if (ev.id === 'festival') for (const s of sc.soldiers) if (s.mode === 'march' && !s.fallen) sc.army.heal(s, sc.army.maxHp(s) * 0.03 / 60);
    if (ev.id === 'ambush' && ev.left > 0 && now > ev.next) {
      ev.next = now + 550; ev.left--;
      const e = sc.spawnEnemy(pick(sc.unlockedTypes()));
      e.d = ev.d;
    }
    if (ev.id === 'chestrun' && !ev.chestEnemy.alive && now < ev.until) ev.until = now;
  }

  // called when an event ends
  end(ev) {
    if (ev.id === 'fog') { for (const f of this.fogParts) this.s.tweens.add({ targets: f, alpha: 0, duration: 1200, onComplete: () => f.destroy() }); this.fogParts = []; }
    if (ev.lanterns) { ev.lanterns.stop(); this.s.time.delayedCall(6000, () => ev.lanterns.destroy()); }
    if (ev.tornado?.active) ev.tornado.destroy();
    if (ev.rift?.active) this.s.tweens.add({ targets: ev.rift, alpha: 0, duration: 600, onComplete: () => ev.rift.destroy() });
    if (ev.id === 'chestrun' && ev.chestEnemy?.alive) {
      const e = ev.chestEnemy; e.alive = false;
      this.s.fx.puff(e.x, e.y, 4); e.sprite.destroy(); e.shadow.destroy();
      this.s.announce('Rương báu đã chạy thoát...', '#c8b896', 44);
    }
  }
}
