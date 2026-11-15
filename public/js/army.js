// Viewer soldiers: they pour out of the citadel gate at each wave, march up the path against the enemy flow,
// block and fight, die, and come back at the next wave. Six classes and in-session levels. Guards have no stamina:
// their class ultimate is fired by a gift from their viewer (with a cut-in). Heroes' stamina skills are in game.js.
import {
  W, CITADEL_Y, CLASSES, CLASS_MIX, RANKS, LEVEL_DMG, LEVEL_HP, SOLDIER_LEVELS, levelNeed, STAMINA, HEROES, GUARD, ARMY,
  RECRUIT_DMG_MULT,
} from './config.js';
import { rand, clamp, truncate } from './util.js';
import { ptext } from './ui.js';

export const CLASS_KEYS = Object.keys(CLASSES);
const tierOf = rank => (rank >= 4 ? 3 : rank >= 2 ? 2 : 1);
const CLASS_COLOR = { kiem: '#ffd27a', thuong: '#ffb070', cung: '#a8e2a0', khien: '#cfe0f4', phap: '#d8b0ff', y: '#9fe1cb', song: '#ff9a8a', vo: '#f0c060', thich: '#b8a8e0' };

export function classFromText(f) {
  for (const k of CLASS_KEYS) if (CLASSES[k].words.includes(f)) return k;
  return null;
}

export class Army {
  constructor(scene) {
    this.s = scene;
    this.gfx = scene.add.graphics().setDepth(6.6);
    this.melee = [];          // marching melee soldiers sorted by d (rebuilt each frame for blocking)
    this.minD = 0;
  }

  get list() { return this.s.soldiers; }

  // ------------------------------------------------------------------ class & look
  defaultClass() {
    const counts = Object.fromEntries(CLASS_KEYS.map(k => [k, 0]));
    for (const s of this.list) counts[s.viewer.cls] = (counts[s.viewer.cls] || 0) + 1;
    const n = this.list.length + 1;
    let best = 'kiem', gap = -Infinity;
    for (const k of CLASS_KEYS) {
      const want = CLASS_MIX[k] / 100 * n - counts[k] + Math.random() * 0.6;
      if (want > gap) { gap = want; best = k; }
    }
    return best;
  }

  setClass(v, cls) {
    if (!CLASSES[cls] || v.cls === cls) return false;
    const s = v.soldier;
    const frac = s ? s.hp / this.maxHp(s) : 1;
    v.cls = cls;
    if (s) {
      this.look(s, true);
      s.hp = this.maxHp(s) * frac;
      this.s.fx.pfx('collect', s.sprite.x, s.sprite.y + 6, { scale: 1, every: 60 });
    }
    return true;
  }

  key(v) {
    const k = `sol_${v.cls}_${tierOf(v.rank)}`;
    if (this.s.textures.exists(k)) return k;
    return this.s.isRecruit(v) ? 'soldier_new' : `soldier_${v.rank + 1}`;
  }

  look(s, force = false) {
    const v = s.viewer;
    const key = this.key(v);
    if (force || s.key !== key) {
      s.key = key;
      s.sprite.setTexture(key);
      s.anim = null;
      this.play(s, s.mode === 'march' ? 'walk' : 'idle', true);
    }
    // the real class sprites carry the class; the fallback sprites get a class-coloured tint
    s.classTint = key.startsWith('sol_') ? null : Phaser.Display.Color.HexStringToColor(CLASS_COLOR[v.cls]).color;
    if (!s.fallen && !s.hurtUntil) { if (s.classTint) s.sprite.setTint(s.classTint); else s.sprite.clearTint(); }
    s.tag.setColor(this.s.isRecruit(v) ? '#9fe1cb' : v.rank >= 3 ? '#ffd94a' : '#ffffff');
    this.retag(s);
  }

  play(s, name, force = false) {
    if (!force && s.anim === name && s.sprite.anims.isPlaying) return;
    const a = this.s.anim(s.key, name);
    if (!a) return;
    s.anim = name;
    s.sprite.play(a);
  }

  // ------------------------------------------------------------------ stats
  level(v) { return v.level || 1; }
  maxHp(s) { const v = s.viewer; return CLASSES[v.cls].hp * RANKS[v.rank].mult * (1 + LEVEL_HP * (this.level(v) - 1)) * (this.s.isRecruit(v) ? 1.3 : 1); }
  dmgOf(s, mult = 1) {
    const v = s.viewer, sc = this.s;
    const crowd = Math.min(1, 7 / Math.sqrt(Math.max(1, this.list.length)));
    return CLASSES[v.cls].dmg * RANKS[v.rank].mult * (1 + LEVEL_DMG * (this.level(v) - 1)) * sc.waveScale() * sc.combo.mult
      * crowd * (sc.isRecruit(v) ? RECRUIT_DMG_MULT : 1) * (this.rageUntil > sc.time.now ? 1.6 : 1) * mult;
  }
  enemyHitScale() { return (1 + GUARD.hitPerWave * Math.max(0, this.s.wave - 1)) * this.s.hardcore; }

  // damage dealt by a soldier -> level progress
  credit(v, dealt) {
    if (!(dealt > 0) || this.level(v) >= SOLDIER_LEVELS) return;
    v.lvDmg = (v.lvDmg || 0) + dealt;
    while (this.level(v) < SOLDIER_LEVELS && v.lvDmg >= levelNeed(this.level(v))) {
      v.lvDmg -= levelNeed(this.level(v));
      v.level = this.level(v) + 1;
      this.onLevelUp(v);
    }
  }

  onLevelUp(v) {
    const s = v.soldier, sc = this.s;
    if (s && !s.fallen) {
      s.hp = this.maxHp(s);
      sc.fx.pfx('pillar', s.sprite.x, s.sprite.y + 4, { scale: 1, speed: 2, every: 120 });
      this.floatText(s, `LÊN CẤP ${v.level}`, '#ffe58a');
      this.retag(s);
    }
    if (v.level === 5 || v.level === 10) {
      sc.say(v, `Lv${v.level}! ${CLASSES[v.cls].name} mạnh hơn`, 'rank');
      sc.feed(`${v.name} đạt Lv${v.level} (${CLASSES[v.cls].name})`, '#ffe58a');
      sc.sfx.play('levelUp');
    }
  }

  floatText(s, str, color = '#ffe58a', size = 26) {
    const t = ptext(this.s, s.sprite.x, s.sprite.y - s.sprite.displayHeight - 6, str, size, color, { shadowColor: '#000000' })
      .setOrigin(0.5, 1).setDepth(29).setStroke('#140a06', 4);
    this.s.tweens.add({ targets: t, y: t.y - 46, duration: 900, ease: 'Cubic.Out' });
    this.s.tweens.add({ targets: t, alpha: 0, duration: 300, delay: 700, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------------------------ lifecycle
  init(s) {
    s.mode = 'home';
    s.d = this.s.pathLen;
    s.off = rand(-24, 24);
    s.atkCd = rand(0.2, 1);
    s.stunUntil = 0; s.shieldUntil = 0; s.poisonUntil = 0; s.hurtUntil = 0; s.marchAt = 0;
    s.hp = this.maxHp(s);
  }

  // send a soldier out of the gate (wave start, late join, revive)
  deploy(s, delayMs = 0) {
    const sc = this.s;
    s.fallen = false;
    s.launched = false;
    s.inInfirmary = false;
    s.mode = 'march';
    this.s.tweens.killTweensOf(s.sprite);
    s.sprite.clearTint();
    this.s.placeSoldier(s);
    s.d = sc.pathLen + 4;
    s.off = rand(-30, 30);
    s.pace = rand(0.88, 1.12);
    s.hp = this.maxHp(s);
    s.stunUntil = 0; s.poisonUntil = 0;
    s.marchAt = sc.time.now + delayMs;
    s.sprite.setAngle(0).setAlpha(1).setVisible(false);
    s.shadow.setVisible(false);
    s.tag.setVisible(false);
  }

  // spread the army over the field: each class group gets its own band of the path, posts evenly spaced inside it
  assignPosts() {
    const L = this.s.pathLen;
    const groups = { melee: [], ranged: [], heal: [] };
    for (const s of this.list) {
      const c = CLASSES[s.viewer.cls];
      (s.viewer.cls === 'y' ? groups.heal : c.melee ? groups.melee : groups.ranged).push(s);
    }
    const band = { melee: [ARMY.front, ARMY.meleeBand], ranged: [ARMY.front + ARMY.rangedFrom, ARMY.rangedBand], heal: [ARMY.front + ARMY.healFrom, ARMY.healBand] };
    for (const [k, list] of Object.entries(groups)) {
      list.sort((a, b) => a.index - b.index);
      const [from, width] = band[k];
      list.forEach((s, i) => {
        const f = Math.min(0.96, from + width * (i + 0.5) / list.length);
        if (s.postF === undefined || Math.abs(s.postF - f) > 0.02) { s.postF = f; s.postJitter = rand(-30, 30); }
        s.post = Math.max(L * ARMY.noGo, L * s.postF + s.postJitter);
      });
    }
  }

  onWaveStart() {
    this.assignPosts();
    // everyone (the dead included) marches out of the gate in a stream
    const queue = this.list.filter(s => s.mode !== 'march' || s.fallen);
    queue.forEach((s, i) => this.deploy(s, Math.min(7000, i * 45)));
  }

  goHome() {
    for (const s of this.list) {
      s.mode = 'home';
      s.fallen = false;
      s.launched = false;
      s.inInfirmary = false;
      s.hp = this.maxHp(s);
      s.sprite.setAngle(0).setAlpha(1).setVisible(true);
      s.shadow.setVisible(true);
      this.look(s, true);
      this.s.placeSoldier(s);
    }
  }

  die(s, src) {
    if (s.fallen) return;
    const sc = this.s;
    this.noteDeath(s, src);
    s.fallen = true;
    s.mode = 'dead';
    s.fellAt = sc.time.now;
    s.tag.setVisible(false);
    // knock-out: the knees buckle (PixelSpec "ko" frames), a little hop back, then the body tips over
    const ko = sc.anim(s.key, 'ko');
    if (ko) { s.sprite.play(ko); s.anim = 'ko'; } else s.sprite.anims.stop();
    const back = s.sprite.flipX ? 10 : -10;
    sc.tweens.add({ targets: s.sprite, x: s.sprite.x + back, y: s.sprite.y - 10, duration: 120, yoyo: true, ease: 'Quad.Out' });
    sc.time.delayedCall(ko ? 280 : 0, () => {
      if (!s.fallen || s.launched || s.inInfirmary) return;
      s.sprite.anims.stop();
      s.sprite.setAngle(s.sprite.flipX ? -90 : 90).setTint(0x8a8aa0);
      sc.fx.pfx('poof', s.sprite.x, s.sprite.y + 2, { scale: 1, every: 60 });
    });
    sc.sfx.play('hurt');
    s.viewer.deaths = (s.viewer.deaths || 0) + 1;
    sc.time.delayedCall(700, () => { if (s.fallen && !s.launched) this.toInfirmary(s, true); });
  }

  // ------------------------------------------------------------------ infirmary ("nằm dưỡng thương")
  // rows of beds inside the citadel, below the wall boards
  infirmarySpot(s) {
    const perRow = 20, i = s.index;
    const row = Math.floor(i / perRow) % 3, col = i % perRow;
    return { x: 40 + col * 52 + (row % 2) * 26, y: CITADEL_Y + 206 + row * 22 };
  }

  // carried: the body floats back to its bed with a white cross over it; otherwise it just lands in bed
  toInfirmary(s, carried) {
    const sc = this.s;
    if (!s.fallen || s.mode !== 'dead') return;
    const spot = this.infirmarySpot(s);
    const lie = () => {
      if (!s.fallen) return;
      s.inInfirmary = true;
      s.sprite.setPosition(spot.x, spot.y).setAngle(s.sprite.flipX ? -90 : 90).setScale(2).setDepth(5 + spot.y * 1e-4).setTint(0xe0d6cc).setVisible(true);
      s.shadow.setPosition(spot.x, spot.y).setScale(0.7, 0.4).setAlpha(0.7).setVisible(true);
    };
    s.sprite.setTint(0xe0d6cc).setVisible(true);
    s.shadow.setVisible(false);
    if (!carried) {
      lie();
      s.sprite.setAlpha(0);
      sc.tweens.add({ targets: s.sprite, alpha: 1, duration: 300 });
      sc.fx.puff(spot.x, spot.y - 6, 2);
      return;
    }
    const cross = sc.add.image(s.sprite.x, s.sprite.y - 40, 'fx_heal').setScale(2).setDepth(29);
    s.sprite.setAlpha(0.85).setDepth(28);
    const dur = Math.min(1600, 500 + Phaser.Math.Distance.Between(s.sprite.x, s.sprite.y, spot.x, spot.y) * 0.9);
    sc.tweens.add({
      targets: s.sprite, x: spot.x, y: spot.y, duration: dur, ease: 'Sine.InOut',
      onUpdate: () => cross.setPosition(s.sprite.x, s.sprite.y - 40),
      onComplete: () => { cross.destroy(); s.sprite.setAlpha(1); lie(); sc.fx.spark(spot.x, spot.y - 10, 'green', 4); },
    });
  }

  // comic knock-out: the guard spins away in a high arc off the side of the screen (respawns next wave)
  launch(s, from) {
    if (s.fallen || s.ulting || s.mode !== 'march' || !s.sprite.visible) return;
    const sc = this.s, now = sc.time.now;
    s.fallen = true; s.mode = 'dead'; s.fellAt = now; s.launched = true;
    s.viewer.killedBy = from?.boss ? from.name : from?.def ? sc.enemyName(from) : 'bị hất bay'; s.viewer.diedWave = sc.wave;
    s.viewer.deaths = (s.viewer.deaths || 0) + 1;
    s.tag.setVisible(false);
    s.shadow.setVisible(false);
    s.sprite.anims.stop();
    const sx = s.sprite.x, sy = s.sprite.y;
    const dir = sx >= from.x ? 1 : -1;
    const tx = dir > 0 ? W + 140 : -140;
    const peak = Math.max(60, sy - rand(380, 760));
    const dur = rand(800, 1150);
    sc.fx.pfx('pow', sx, sy - 10, { scale: 1, every: 120, depth: 28, flip: dir < 0 });
    sc.fx.spark(sx, sy - 20, 'white', 6);
    sc.sfx.play('launch');
    if (Math.random() < 0.6) {
      const shout = ['VÈO!', 'Á Á Á!', 'BỐP!', 'CỨU TÔI!', 'BAY NÈ!', 'ỐI GIỜI ƠI!'][Math.floor(Math.random() * 6)];
      this.floatText(s, shout, '#ffffff', 30);
    }
    s.sprite.setDepth(29);
    const prog = { t: 0 };
    sc.tweens.add({
      targets: prog, t: 1, duration: dur, ease: 'Linear',
      onUpdate: () => {
        if (!s.launched) return; // redeployed mid-flight
        const t = prog.t;
        s.sprite.x = sx + (tx - sx) * t;
        s.sprite.y = sy + (peak - sy) * 4 * t * (1 - t) + 260 * t * t;
        s.sprite.angle = dir * 1260 * t;
        if (Math.random() < 0.3) sc.fx.trail(s.sprite.x, s.sprite.y - 10, 'white');
      },
      onComplete: () => { const was = s.launched; s.launched = false; if (was && s.fallen) { s.sprite.setAngle(0); this.toInfirmary(s, false); } },
    });
  }

  revive(s) {
    if (!s.fallen) return false;
    s.inInfirmary = false;
    if (this.s.state === 'play') this.deploy(s, 0);
    else { s.fallen = false; s.mode = 'home'; s.sprite.setAngle(0).setAlpha(1).setVisible(true); s.shadow.setAlpha(1).setVisible(true); this.look(s, true); this.s.placeSoldier(s); }
    s.hp = this.maxHp(s);
    return true;
  }

  hurt(s, amount, src) {
    if (s.fallen || s.mode !== 'march' || s.ulting) return;
    const now = this.s.time.now;
    let a = amount;
    if (s.shieldUntil > now) a *= 0.3;
    s.hp -= a;
    s.lastHurt = now;
    if (!s.hurtUntil) s.sprite.setTintFill(0xffffff);
    s.hurtUntil = now + 70;
    if (s.hp <= 0) { this.die(s, src); return; }
    // flinch: recoil frames (PixelSpec "hurt"), unless mid-swing
    if (a > this.maxHp(s) * 0.15 && !(s.anim === 'attack' && s.sprite.anims.isPlaying)) this.play(s, 'hurt', true);
  }

  heal(s, amount) {
    if (s.fallen) return 0;
    const before = s.hp;
    s.hp = Math.min(this.maxHp(s), s.hp + amount);
    return s.hp - before;
  }

  // ------------------------------------------------------------------ positions
  place(s) {
    const sc = this.s;
    const p = sc.posAt(s.d);
    const len = Math.hypot(p.dx, p.dy) || 1;
    const nx = -p.dy / len, ny = p.dx / len;
    const x = p.x + nx * s.off, y = p.y + 28 + ny * s.off * 0.8;
    s.sprite.setPosition(x, y).setDepth(s.ulting ? 27 : 5 + y * 1e-4);
    s.shadow.setPosition(x, y - 1);
    s.tag.setPosition(x, y - s.sprite.displayHeight + 4);
    s.dirX = p.dx; // enemies walk +dx, soldiers walk -dx
  }

  face(s, tx) { s.sprite.setFlipX(tx < s.sprite.x); }

  // ------------------------------------------------------------------ enemy side: who blocks whom
  prepareBlocking() {
    this.melee = this.list.filter(s => s.mode === 'march' && !s.fallen && CLASSES[s.viewer.cls].block > 0 && this.s.time.now >= s.marchAt);
    this.melee.sort((a, b) => a.d - b.d);
    for (const s of this.melee) s.holding = 0;
  }

  // first melee soldier standing just ahead of this enemy (along the path) with room to hold it
  blockerFor(e) {
    if (e.boss || e.def.fly || e.charm) return null;
    const arr = this.melee;
    let lo = 0, hi = arr.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].d < e.d - 6) lo = m + 1; else hi = m; }
    for (let i = lo; i < arr.length; i++) {
      const s = arr[i];
      if (s.d - e.d > 30) break;
      if (!s.fallen && s.holding < CLASSES[s.viewer.cls].block) {
        s.holding++;
        if (e.heldBy !== s) {
          e.heldBy = s;
          this.s.fx.pfx('parry', (s.sprite.x + e.x) / 2, s.sprite.y - 6, { scale: 1, every: 140, flip: e.x < s.sprite.x });
        }
        return s;
      }
    }
    return null;
  }

  // enemy e is held by soldier s this frame: it strikes back on its own timer
  enemyStrike(e, s, dt) {
    e.atkCd = (e.atkCd ?? 0.4) - dt;
    if (e.atkCd > 0) return;
    e.atkCd = 1;
    // fragile guards: count hits, not HP
    const hits = (e.dmg >= GUARD.heavyDmg ? GUARD.heavyHits : GUARD.hits) + (s.viewer.cls === 'khien' ? GUARD.khienExtraHits : 0);
    if (e.def.onHit === 'launch' && Math.random() < 0.3) { this.launch(s, e); return; }
    this.hurt(s, this.maxHp(s) / hits * 1.02, e);
    const now = this.s.time.now;
    if (e.def.onHit === 'poison') s.poisonUntil = Math.max(s.poisonUntil || 0, now + 2500);
    else if (e.def.onHit === 'web' && Math.random() < 0.35) { s.stunUntil = Math.max(s.stunUntil, now + 700); this.s.fx.spark(s.sprite.x, s.sprite.y - 16, 'white', 4); }
    else if (e.def.onHit === 'knock' && Math.random() < 0.4) { s.d = Math.min(this.s.pathLen, s.d + 60); this.s.fx.pfx('blunt', s.sprite.x, s.sprite.y - 8, { scale: 1, every: 150 }); }
    if (e.def.scale >= 2 && e.maxHp > 150) this.s.fx.pfx('blunt', s.sprite.x, s.sprite.y - 8, { scale: 1, every: 200 });
  }

  // ------------------------------------------------------------------ update
  update(now, dt) {
    const sc = this.s;
    const enemies = sc.enemies.filter(e => e.alive);
    this.minD = sc.pathLen * ARMY.noGo;
    if (now > (this.postsAt || 0)) { this.postsAt = now + 3000; this.assignPosts(); }
    const battle = sc.state === 'play';
    for (const s of this.list) {
      if (s.hurtUntil && now > s.hurtUntil) {
        s.hurtUntil = 0;
        if (!s.fallen) { if (s.stunUntil > now) s.sprite.setTint(0xff9ad8); else if (s.classTint) s.sprite.setTint(s.classTint); else s.sprite.clearTint(); }
      }
      if (s.mode !== 'march' || s.fallen) continue;
      if (now < s.marchAt) continue;
      if (!s.sprite.visible) {
        s.sprite.setVisible(true).setAlpha(1);
        s.shadow.setVisible(true).setAlpha(1);
        this.place(s);
        sc.fx.puff(s.sprite.x, s.sprite.y - 6, 2);
        sc.fx.pfx('landing', s.sprite.x, s.sprite.y, { scale: 1, every: 260, speed: 1.6, depth: 4.8 });
      }
      const v = s.viewer, c = CLASSES[v.cls];
      if (s.ulting) { if (!s.freePos) this.place(s); continue; } // the ultimate cinematic drives this guard
      if (s.poisonUntil > now) this.hurt(s, this.maxHp(s) * 0.06 * dt);
      else if (now - (s.lastHurt || 0) > GUARD.regenDelay * 1000) s.hp = Math.min(this.maxHp(s), s.hp + this.maxHp(s) * GUARD.regen * dt);
      if (s.fallen) continue;
      if (s.stunUntil > now) {
        sc.ambient.attach(s, 'stunned', s, () => !s.fallen && s.stunUntil > sc.time.now, -s.sprite.displayHeight - 4);
        this.play(s, 'idle'); this.place(s); continue;
      }
      if (s.shieldUntil > now) sc.ambient.attach('sh' + v.id, 'divshield', s, () => !s.fallen && s.shieldUntil > sc.time.now, 4);
      s.atkCd -= dt;

      // ---- pick a target
      let target = null;
      if (c.melee) {
        let best = Infinity;
        for (const e of enemies) {
          const gap = s.d - e.d;
          if (gap < -24 || gap > c.reach) continue;
          if (Math.abs(gap) < best) { best = Math.abs(gap); target = e; }
        }
      } else {
        let best = -1;
        const x = s.sprite.x, y = s.sprite.y - 20;
        for (const e of enemies) {
          const dd = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
          if (dd <= c.reach * c.reach && e.d > best) { best = e.d; target = e; }
        }
      }


      // ---- a gift ultimate waiting for something to hit
      if (v.pendingUlt && sc.ult.idle() && (target || enemies.some(e => Math.abs(e.x - s.sprite.x) < 300 && Math.abs(e.y - s.sprite.y) < 260))) {
        const xu = v.pendingUlt;
        v.pendingUlt = 0;
        sc.ult.play(s, xu);
        this.place(s);
        continue;
      }

      // ---- move or fight
      let hold = Boolean(target);
      if (!c.melee && !hold) {
        // ranged: keep a distance from the nearest enemy ahead on the path
        for (const e of enemies) { const gap = s.d - e.d; if (gap > 0 && gap < c.reach * 0.7) { hold = true; break; } }
      }
      if (v.cls === 'y') {
        const hurtAlly = this.hurtAllyNear(s, c.reach);
        if (hurtAlly && s.atkCd <= 0) { this.attackHeal(s, hurtAlly); s.atkCd = 1 / c.rate; }
        if (hurtAlly) hold = true;
      }
      if (target && s.atkCd <= 0) {
        s.atkCd = 1 / c.rate * rand(0.9, 1.1);
        this.attack(s, target, enemies);
      }
      const post = s.post ?? this.minD;
      let want = post;
      if (c.melee && !target) {
        // chase the closest monster coming down the lane, but never further than ARMY.chase ahead of the post
        let best = null;
        for (const e of enemies) { const gap = s.d - e.d; if (gap > 0 && e.d > post - ARMY.chase - c.reach && (!best || e.d > best.d)) best = e; }
        if (best) want = Math.max(post - ARMY.chase, best.d + c.reach * 0.6);
      }
      want = Math.max(this.minD, want);
      const busy = (s.anim === 'attack' || s.anim === 'hurt') && s.sprite.anims.isPlaying;
      if (!hold && s.d > want + 4) {
        s.d = Math.max(want, s.d - c.speed * (s.pace || 1) * dt);
        if (!busy) this.play(s, 'walk');
        if (s.dirX) s.sprite.setFlipX(s.dirX > 0);
      } else if (!hold && !target && s.d < want - 4) {
        // back to the post (a bit slower), facing the way they walk
        s.d = Math.min(want, s.d + c.speed * 0.7 * (s.pace || 1) * dt);
        if (!busy) this.play(s, 'walk');
        if (s.dirX) s.sprite.setFlipX(s.dirX < 0);
      } else if (!target && !busy) {
        this.play(s, 'idle');
        if (s.dirX) s.sprite.setFlipX(s.dirX > 0);
      }
      this.place(s);
    }
  }

  hurtAllyNear(s, r) {
    let best = null, frac = 0.92;
    for (const o of this.list) {
      if (o.fallen || o.mode !== 'march' || !o.sprite.visible) continue;
      const f = o.hp / this.maxHp(o);
      if (f >= frac) continue;
      if (Math.abs(o.sprite.x - s.sprite.x) > r || Math.abs(o.sprite.y - s.sprite.y) > r) continue;
      frac = f; best = o;
    }
    return best;
  }

  attackHeal(s, ally) {
    const sc = this.s;
    this.play(s, 'attack', true);
    this.face(s, ally.sprite.x);
    const amt = CLASSES.y.heal * RANKS[s.viewer.rank].mult * (1 + LEVEL_DMG * (this.level(s.viewer) - 1)) * (1 + 0.1 * Math.max(0, sc.wave - 1));
    const got = this.heal(ally, amt);
    if (got > 0) {
      sc.fx.spark(ally.sprite.x, ally.sprite.y - 24, 'green', 4);
      this.credit(s.viewer, got * 1.5);
    }
  }

  attack(s, target, enemies) {
    const sc = this.s, v = s.viewer, c = CLASSES[v.cls];
    this.play(s, 'attack', true);
    this.face(s, target.x);
    const recruitKill = sc.isRecruit(v) && !v.firstKillDone && !target.boss;
    const hit = e => {
      if (!e.alive) return;
      let dealt;
      if (recruitKill && !v.firstKillDone) {
        v.firstKillDone = true;
        dealt = sc.damage(e, e.hp / (1 - e.armor) + 1, v);
        sc.fx.spark(e.x, e.y, 'teal', 12);
        sc.say(v, `hạ gục ${sc.enemyName(e)}! Chiến công đầu!`, 'recruit');
      } else {
        const crit = c.crit && Math.random() < c.crit;
        dealt = sc.damage(e, this.dmgOf(s, crit ? 2.5 : 1), v);
        if (crit) { sc.fx.pfx('crit', e.x, e.y, { scale: 1, every: 60 }); sc.fx.damageNumber(e.x, e.y - 50, dealt, true); }
      }
      this.credit(v, dealt);
      return dealt;
    };
    switch (v.cls) {
      case 'cung':
        sc.sfx.play('arrow');
        sc.fireProjectile(s.sprite.x, s.sprite.y - 30, target, 'fx_arrow', 1.6, 1000, null, e => { hit(e); sc.fx.pfx('hitspark', e.x, e.y - 4, { scale: 1, every: 40 }); }, true);
        break;
      case 'phap':
        sc.sfx.play('orb');
        sc.fireProjectile(s.sprite.x, s.sprite.y - 34, target, 'fx_orb', 1.8, 760, 0xc58aff, e => {
          hit(e);
          for (const o of sc.enemiesNear(e.x, e.y, c.splash)) if (o !== e) sc.damage(o, this.dmgOf(s, 0.5), v);
          sc.fx.spark(e.x, e.y - 10, 'purple', 6);
        }, false, 'purple');
        break;
      case 'y':
        sc.fireProjectile(s.sprite.x, s.sprite.y - 30, target, 'fx_orb', 1.3, 760, 0x8ff58f, e => hit(e), false, 'green');
        break;
      default:
        // melee: the blow lands on the swing frame
        sc.time.delayedCall(110, () => {
          if (s.fallen || !target.alive) return;
          hit(target);
          if (c.cleave) for (const o of enemies.filter(o => o !== target && o.alive && Math.abs(o.d - s.d) < c.reach + 10).slice(0, c.cleave - 1)) hit(o);
          if (v.cls === 'song') sc.time.delayedCall(140, () => { if (target.alive && !s.fallen) hit(target); });
          if (Math.random() < 0.5) sc.fx.pfx('hitspark', target.x, target.y - 4, { scale: 1, every: 30, flip: target.x < s.sprite.x });
          sc.sfx.play('hit');
        });
    }
  }

  // ------------------------------------------------------------------ gift ultimates
  // A gift from the viewer: their guard fires its class ultimate. In battle with enemies near it fires now; otherwise
  // it's held (gold aura) until the guard is out on the field with something to hit. A fallen guard gets back up.
  onGift(v, xu) {
    const s = v.soldier;
    if (!s) return;
    v.pendingUlt = Math.max(v.pendingUlt || 0, xu);
    if (s.fallen && this.s.state === 'play') { this.revive(s); this.s.feed(`${v.name} tặng quà, hồi sinh tại cổng!`, '#ffd94a'); }
  }

  // ------------------------------------------------------------------ bars
  drawBars(now) {
    const g = this.gfx.clear();
    let n = 0;
    for (const s of this.list) {
      if (s.mode !== 'march' || s.fallen || !s.sprite.visible || n > 160) continue;
      const max = this.maxHp(s);
      if (s.hp >= max * 0.999 && !s.tag.visible) continue;
      n++;
      const w = 30, x = Math.round(s.sprite.x - w / 2), y = Math.round(s.sprite.y - s.sprite.displayHeight - 8);
      g.fillStyle(0x140a06, 0.85).fillRect(x - 2, y - 2, w + 4, 7);
      const f = clamp(s.hp / max, 0, 1);
      g.fillStyle(f > 0.4 ? 0x4ab8ff : 0x9adcff, 1).fillRect(x, y, Math.round(w * f / 2) * 2, 3); // ours = blue, monsters = red
    }
    // wounded guards resting in the citadel: a little bandage cross over each bed
    let beds = 0;
    for (const s of this.list) {
      if (!s.inInfirmary || !s.fallen || beds++ > 120) continue;
      const x = Math.round(s.sprite.x), y = Math.round(s.sprite.y - 30 - (Math.floor(now / 600 + s.index) % 2));
      g.fillStyle(0x241622, 1).fillRect(x - 4, y - 4, 9, 9);
      g.fillStyle(0xf4ecd8, 1).fillRect(x - 3, y - 3, 7, 7);
      g.fillStyle(0xd8553a, 1).fillRect(x - 1, y - 3, 3, 7).fillRect(x - 3, y - 1, 7, 3);
    }
    // guards holding a gift ultimate: pulsing gold ring at their feet
    const pulse = 0.5 + 0.5 * Math.sin(now / 140);
    for (const s of this.list) {
      if (!s.viewer.pendingUlt || s.fallen || !s.sprite.visible) continue;
      const r = 14 * s.sprite.scaleX + pulse * 4;
      g.lineStyle(3, 0xffd94a, 0.5 + 0.4 * pulse).strokeEllipse(s.sprite.x, s.sprite.y - 2, r * 2, r * 0.9);
    }
    // heroes on the slots: gold stamina bar under the nameplate, flashing when the ultimate is ready
    for (const h of this.s.heroes) {
      const st = clamp((h.stamina || 0) / STAMINA.max, 0, 1);
      const w = 112, x = Math.round(h.slot.x - w / 2), y = Math.round(h.slot.y + 104);
      g.fillStyle(0x140a06, 0.9).fillRect(x - 3, y - 3, w + 6, 12);
      g.fillStyle(0x3a2a14, 1).fillRect(x, y, w, 6);
      const full = st >= 1;
      g.fillStyle(full && Math.floor(now / 120) % 2 ? 0xffffff : 0xffc23d, 1).fillRect(x, y, Math.round(w * st / 2) * 2, 6);
      for (let i = 1; i < 5; i++) g.fillStyle(0x140a06, 0.7).fillRect(x + Math.round(w * i / 5), y, 2, 6);
    }
  }

  // ------------------------------------------------------------------ helpers for bosses
  frontline(n = 8, nearD = null) {
    const alive = this.list.filter(s => s.mode === 'march' && !s.fallen && s.sprite.visible);
    if (nearD !== null) alive.sort((a, b) => Math.abs(a.d - nearD) - Math.abs(b.d - nearD));
    else alive.sort((a, b) => a.d - b.d);
    return alive.slice(0, n);
  }

  classCounts() {
    const out = Object.fromEntries(CLASS_KEYS.map(k => [k, 0]));
    for (const s of this.list) out[s.viewer.cls] = (out[s.viewer.cls] || 0) + 1;
    return out;
  }

  tagName(v) { return truncate(v.name, 12); }
  // name tag: "Name Lv3" — the level is the guard's level this stream, so a viewer can find theirs and see it grow
  retag(s) { const v = s.viewer, lv = this.level(v); s.tag.setText(lv > 1 ? `${truncate(v.name, 10)} Lv${lv}` : this.tagName(v)); }
  // why a guard went down, for its viewer (bubble on their next message, float text if they were active)
  noteDeath(s, src, how) {
    const v = s.viewer, sc = this.s;
    v.killedBy = src ? sc.enemyName(src) : (how || 'trúng đòn');
    v.diedWave = sc.wave;
    if (sc.time.now - v.lastActive < 45000 || this.list.length <= 40) this.floatText(s, `${how || 'ngã'} · ${v.killedBy}`, '#ffb0a0', 24);
  }
}
