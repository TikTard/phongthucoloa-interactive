// Animated scenery: small hand-placed pixel props painted in code with the PixelSpec master palette and the same
// 1 px dark outline as the characters, then brought to life per map theme.
//  - every map: flags waving on the citadel wall, demon banners at the rift, trees / bamboo / rice swaying
//  - by theme: water wheel, windmill, village huts with chimney smoke, birds, fish jumping in the river, frogs on
//    lily pads, snow piles and a frozen river, glowing lava cracks and a lava river, skull totems with ghost flames
// Props stay on grass cells away from the path and the hero slots, under every unit (depth 1-3).
import { W, TILE, MAP_TOP, MAP_X0, CITADEL_Y, SLOT_ROWS } from './config.js';
import { rand, pick } from './util.js';

const ART = 2;
const tileX = c => MAP_X0 + c * TILE + TILE / 2;
const tileY = r => MAP_TOP + r * TILE + TILE / 2;

// PixelSpec master palette (art/pixelspec/*: k outline, wood x/y/z, stone a/b/c, reds, jade) + a few prop colours
const PAL = {
  k: '#241622', d: '#6a4630', w: '#94673f', l: '#c4955e', m: '#6a7088', n: '#a4acc0', E: '#e0e6f0',
  R: '#6e1e24', r: '#a8322e', o: '#d8553a', g: '#a8701e', G: '#e0a838', Y: '#f8dc7a',
  j: '#2f6b55', J: '#4f9a72', t: '#a8803e', T: '#d8b46a', b: '#2f5f9a', B: '#6aa8dc', C: '#bfe4f4',
  s: '#dfe8f4', S: '#ffffff', v: '#3a2450', V: '#6a3a9a', p: '#a070d8', f: '#ff8a2a', F: '#ffd94a', h: '#2b1d2a',
};

// paint `frames` frames of w x h into one horizontal sheet; draw(P, f) fills shapes, then a 1 px outline is added
function sheet(scene, key, w, h, frames, draw) {
  if (scene.textures.exists(key)) return key;
  const fw = w + 2, fh = h + 2;
  const tex = scene.textures.createCanvas(key, fw * frames, fh);
  const ctx = tex.getContext();
  for (let f = 0; f < frames; f++) {
    const g = Array.from({ length: fh }, () => Array(fw).fill('.'));
    const set = (x, y, c) => { x = Math.round(x) + 1; y = Math.round(y) + 1; if (y >= 1 && y <= h && x >= 1 && x <= w) g[y][x] = c; };
    const P = {
      px: set,
      rect: (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); },
      disc: (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) set(cx + x, cy + y, c); },
      line: (x0, y0, x1, y1, c) => { const n = Math.max(1, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2); for (let i = 0; i <= n; i++) set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
    };
    draw(P, f);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      if (g[y][x] !== '.') continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = g[y + dy]?.[x + dx]; return c && c !== '.' && c !== 'k'; })) g[y][x] = 'k';
    }
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (g[y][x] !== '.') { ctx.fillStyle = PAL[g[y][x]]; ctx.fillRect(f * fw + x, y, 1, 1); }
    tex.add(String(f), 0, f * fw, 0, fw, fh);
  }
  tex.refresh();
  return key;
}

function anim(scene, key, frames, fps, repeat = -1) {
  const k = `a_${key}`;
  if (!scene.anims.exists(k)) scene.anims.create({ key: k, frames: Array.from({ length: frames }, (_, i) => ({ key, frame: String(i) })), frameRate: fps, repeat });
  return k;
}

function paintAll(scene) {
  // waving banner on a pole: red silk with a gold trim and a gold disc (ours) — 4 frames
  const flag = (key, cloth, trim, mark) => sheet(scene, key, 16, 26, 4, (P, f) => {
    P.rect(1, 0, 2, 25, 'd'); P.rect(1, 0, 1, 25, 'w'); P.px(1, 0, 'G'); P.px(2, 0, 'G');
    for (let x = 0; x < 12; x++) {
      const wave = Math.round(Math.sin((x / 12) * Math.PI * 1.6 - f * Math.PI / 2) * 1.4 * (x / 11));
      const top = 2 + wave, len = 11 - Math.round(x / 6);
      P.rect(3 + x, top, 3 + x, top + len, cloth);
      P.px(3 + x, top + len, trim);
      if (x > 3 && x < 9 && f >= 0) P.px(3 + x, top + 5, mark);
    }
    P.disc(9, 7 + Math.round(Math.sin(0.9 - f * Math.PI / 2)), 1, mark);
  });
  flag('sc_flag', 'r', 'G', 'Y');
  flag('sc_flag_demon', 'v', 'V', 'p');

  // water wheel: rim, 8 paddles turning (4 frames = 45 deg of an 8-fold wheel), on a wooden stand
  sheet(scene, 'sc_wheel', 26, 26, 4, (P, f) => {
    const cx = 12.5, cy = 12.5;
    for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; P.px(cx + Math.cos(t) * 10, cy + Math.sin(t) * 10, 'w'); P.px(cx + Math.cos(t) * 9, cy + Math.sin(t) * 9, 'd'); }
    for (let i = 0; i < 8; i++) {
      const t = (i / 8 + f / 32) * Math.PI * 2;
      P.line(cx, cy, cx + Math.cos(t) * 9, cy + Math.sin(t) * 9, 'd');
      P.rect(Math.round(cx + Math.cos(t) * 11) - 1, Math.round(cy + Math.sin(t) * 11) - 1, Math.round(cx + Math.cos(t) * 11) + 1, Math.round(cy + Math.sin(t) * 11) + 1, 'l');
    }
    P.disc(cx, cy, 2, 'm'); P.px(cx, cy, 'n');
  });

  // windmill: stone tower, thatched cap, 4 cloth sails turning
  sheet(scene, 'sc_mill_tower', 16, 26, 1, P => {
    P.rect(3, 8, 12, 25, 'n'); P.rect(3, 8, 4, 25, 'E'); P.rect(11, 8, 12, 25, 'm');
    for (let y = 11; y < 25; y += 4) P.rect(5, y, 10, y, 'm');
    P.rect(6, 19, 9, 25, 'd'); P.rect(7, 19, 8, 19, 'w');
    for (let y = 0; y < 8; y++) P.rect(8 - y, y + 1, 7 + y, y + 1, y < 2 ? 'T' : 't');
  });
  sheet(scene, 'sc_mill_sails', 30, 30, 4, (P, f) => {
    const cx = 14.5, cy = 14.5;
    for (let i = 0; i < 4; i++) {
      const t = (i / 4 + f / 16) * Math.PI * 2, ux = Math.cos(t), uy = Math.sin(t), vx = -uy, vy = ux;
      P.line(cx, cy, cx + ux * 14, cy + uy * 14, 'd');
      for (let s = 4; s <= 13; s++) for (let k = 1; k <= 3; k++) P.px(cx + ux * s + vx * k, cy + uy * s + vy * k, k === 3 ? 'n' : 'E');
    }
    P.disc(cx, cy, 1, 'w');
  });

  // village hut: thatched roof, wooden walls, a little chimney
  sheet(scene, 'sc_hut', 30, 24, 1, P => {
    P.rect(4, 11, 25, 23, 'l'); P.rect(22, 11, 25, 23, 'w');
    for (let x = 6; x < 22; x += 4) P.rect(x, 12, x, 23, 'w');
    P.rect(12, 16, 16, 23, 'd'); P.rect(13, 17, 15, 23, 'h');
    P.rect(19, 14, 21, 17, 'Y');
    for (let y = 0; y < 11; y++) P.rect(14 - y - 2, y + 1, 15 + y + 2, y + 1, y % 3 === 2 ? 't' : 'T');
    P.rect(21, 0, 23, 5, 'm'); P.rect(21, 0, 23, 0, 'n');
  });

  // small bird, 2-frame flap
  sheet(scene, 'sc_bird', 9, 5, 2, (P, f) => {
    if (f === 0) { P.line(0, 0, 3, 3, 'h'); P.line(8, 0, 5, 3, 'h'); } else { P.line(0, 3, 3, 2, 'h'); P.line(8, 3, 5, 2, 'h'); }
    P.rect(3, 2, 5, 3, 'h'); P.px(4, 4, 'h');
  });
  // fish: silver body, 2 frames (tail flick)
  sheet(scene, 'sc_fish', 11, 6, 2, (P, f) => {
    P.rect(2, 1, 7, 4, 'n'); P.rect(2, 1, 7, 1, 'E'); P.rect(3, 4, 6, 4, 'm'); P.px(7, 2, 'k'); P.px(8, 2, 'n'); P.px(8, 3, 'n');
    if (f === 0) { P.rect(0, 0, 1, 1, 'B'); P.rect(0, 4, 1, 5, 'B'); } else { P.rect(0, 2, 1, 3, 'B'); }
  });
  // frog on a lily pad (sit / leap)
  sheet(scene, 'sc_pad', 14, 6, 1, P => { P.disc(6, 3, 3, 'J'); P.rect(3, 2, 10, 4, 'J'); P.rect(6, 2, 7, 3, 'j'); P.px(9, 1, 'o'); });
  sheet(scene, 'sc_frog', 8, 7, 2, (P, f) => {
    if (f === 0) { P.rect(1, 3, 6, 6, 'J'); P.rect(2, 2, 5, 3, 'J'); P.px(2, 1, 'Y'); P.px(5, 1, 'Y'); P.rect(1, 6, 6, 6, 'j'); }
    else { P.rect(2, 1, 5, 4, 'J'); P.px(2, 0, 'Y'); P.px(5, 0, 'Y'); P.line(1, 5, 0, 6, 'j'); P.line(6, 5, 7, 6, 'j'); }
  });
  // snow piles (2 shapes)
  sheet(scene, 'sc_snow', 18, 8, 2, (P, f) => {
    if (f === 0) { P.disc(6, 6, 4, 's'); P.disc(12, 6, 5, 's'); P.rect(1, 6, 17, 7, 's'); P.rect(5, 3, 13, 4, 'S'); }
    else { P.disc(9, 6, 5, 's'); P.rect(2, 6, 16, 7, 's'); P.rect(7, 2, 11, 3, 'S'); }
  });
  // lava crack: dark rock seam with an orange-yellow core
  sheet(scene, 'sc_crack', 24, 10, 2, (P, f) => {
    const pts = f === 0 ? [[1, 5], [6, 3], [10, 6], [15, 4], [22, 6]] : [[1, 3], [5, 6], [11, 4], [17, 7], [22, 4]];
    for (let i = 0; i < pts.length - 1; i++) P.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'f');
    for (let i = 1; i < pts.length - 1; i++) P.px(pts[i][0], pts[i][1], 'F');
  });
  sheet(scene, 'sc_crack_glow', 24, 10, 2, (P, f) => {
    const pts = f === 0 ? [[1, 5], [6, 3], [10, 6], [15, 4], [22, 6]] : [[1, 3], [5, 6], [11, 4], [17, 7], [22, 4]];
    for (let i = 0; i < pts.length - 1; i++) P.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'F');
  });
  // skull totem with a ghost flame (3 flicker frames)
  sheet(scene, 'sc_totem', 12, 24, 3, (P, f) => {
    P.rect(5, 11, 6, 23, 'd'); P.rect(5, 11, 5, 23, 'w'); P.rect(2, 21, 9, 23, 'm');
    P.rect(3, 7, 8, 11, 'E'); P.rect(3, 11, 8, 11, 'n'); P.px(4, 9, 'k'); P.px(7, 9, 'k'); P.px(5, 11, 'k'); P.px(6, 11, 'k');
    const sway = [0, 1, -1][f];
    P.rect(4 + sway, 3, 7 + sway, 6, 'p'); P.rect(5 + sway, 1, 6 + sway, 3, 'p'); P.px(5 + sway, 0, 'E'); P.rect(5, 5, 6, 6, 'E');
  });
}

// a recoloured copy of the river strip: every pixel's lightness is mapped onto a colour ramp (dark -> light)
function riverVariant(scene, name, ramp) {
  const key = `tile_water_${name}`, ak = `a_${key}_flow`;
  if (!scene.textures.exists(key)) {
    const src = scene.textures.get('tile_water').getSourceImage();
    const cv = document.createElement('canvas');
    cv.width = src.width; cv.height = src.height;
    const ctx = cv.getContext('2d');
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data;
    const rgb = ramp.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const l = (Math.max(d[i], d[i + 1], d[i + 2]) + Math.min(d[i], d[i + 1], d[i + 2])) / 510;
      const t = Math.min(rgb.length - 1.001, Math.max(0, (l - 0.38) / 0.42 * (rgb.length - 1))); // the water art sits at lightness 0.4-0.8
      const k = Math.floor(t), f = t - k, a = rgb[k], b = rgb[k + 1];
      d[i] = a[0] + (b[0] - a[0]) * f; d[i + 1] = a[1] + (b[1] - a[1]) * f; d[i + 2] = a[2] + (b[2] - a[2]) * f;
    }
    ctx.putImageData(img, 0, 0);
    scene.textures.addSpriteSheet(key, cv, { frameWidth: 32, frameHeight: 32 });
  }
  if (!scene.anims.exists(ak)) scene.anims.create({ key: ak, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 3 }), frameRate: 3, repeat: -1 });
  return { key, ak };
}
const RIVERS = {
  6: ['ice', ['#7aa8cc', '#b8dcf0', '#e4f4fc', '#ffffff']],
  7: ['lava', ['#a8322e', '#e05a20', '#ff8a2a', '#ffd94a']],
  9: ['blood', ['#6e1e24', '#a8322e', '#d8553a', '#ff9a7a']],
};

export class Scenery {
  constructor(scene) {
    this.s = scene;
    this.objs = [];
    this.timers = [];
    paintAll(scene);
    this.walls();
  }

  // flags along the citadel wall walkway (every map); the catapults and braziers keep their spots
  walls() {
    const s = this.s, key = anim(s, 'sc_flag', 4, 7);
    for (const x of [40, 262, 360, 720, 818, W - 40]) {
      const f = s.add.sprite(x, CITADEL_Y + 40, 'sc_flag', 0).setOrigin(0.1, 1).setScale(ART).setDepth(4.55).setFlipX(x > W / 2);
      f.play({ key, startFrame: Math.floor(Math.random() * 4) });
      f.anims.timeScale = rand(0.8, 1.2);
    }
  }

  clear() {
    const s = this.s;
    for (const o of this.objs) { s.tweens.killTweensOf(o); if (o.stop) o.stop(); o.destroy(); }
    for (const t of this.timers) t.remove();
    this.objs = []; this.timers = [];
    for (const w of s.waterSprites || []) if (w.texture.key !== 'tile_water') w.play({ key: 'a_tile_water_flow', startFrame: Math.floor(Math.random() * 4) });
  }

  keep(o) { this.objs.push(o); return o; }
  every(ms, fn) { const t = this.s.time.addEvent({ delay: ms, loop: true, callback: fn }); this.timers.push(t); }

  // grass cells far enough from the path and the hero slots for a prop
  freeCells(field) {
    const isPath = (c, r) => field.pathCells.has(`${c},${r}`);
    const slot = (c, r) => SLOT_ROWS.includes(r); // hero rows stay clear (heroes and their plates stand there)
    const out = [];
    for (let r = 2; r <= 18; r++) for (let c = 1; c <= 15; c++) {
      if (isPath(c, r) || slot(c, r)) continue;
      let near = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (isPath(c + dc, r + dr)) near++;
      if (near <= 1) out.push({ c, r, x: tileX(c), y: tileY(r) });
    }
    return out;
  }

  // called after drawField(): theme `ti` (0..9), the scene's decor images for swaying
  setTheme(ti, decor = []) {
    const s = this.s;
    this.clear();
    // seeded so a map looks the same every stream
    let seed = 99 + ti * 131;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const cells = this.freeCells(s).sort(() => rnd() - 0.5);
    const take = () => cells.shift();

    // sway: trees, bamboo and rice lean with the wind (origin is at the trunk's foot)
    for (const d of decor) {
      const k = d.texture.key;
      if (!/tree|bamboo|rice/.test(k)) continue;
      const amp = /bamboo/.test(k) ? 3 : /rice/.test(k) ? 4 : 1.6;
      s.tweens.add({ targets: d, angle: { from: -amp, to: amp }, duration: rand(1700, 2600), yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: rand(0, 1500) });
    }

    // demon banners either side of the rift (every map; purple)
    const p0 = s.pathPts[0];
    const dk = anim(s, 'sc_flag_demon', 4, 8);
    for (const dx of [-70, 70]) {
      const x = Math.max(40, Math.min(W - 40, p0.x + dx));
      const f = this.keep(s.add.sprite(x, MAP_TOP + 120, 'sc_flag_demon', 0).setOrigin(0.1, 1).setScale(ART).setDepth(2.6).setFlipX(dx < 0));
      f.play({ key: dk, startFrame: Math.floor(Math.random() * 4) });
    }

    const river = [1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16].map(c => tileX(c));
    const riverY = tileY(20);
    const bright = [0, 1, 2, 3, 5].includes(ti);
    const wet = ti <= 5;

    // ---- the river: wheel, fish, frogs; frozen on the snow map, lava on the fire maps
    if (RIVERS[ti]) {
      const { ak } = riverVariant(s, ...RIVERS[ti]);
      (s.waterSprites || []).forEach((w, i) => w.play({ key: ak, startFrame: i % 4 }));
      if (ti !== 6) this.every(700, () => { // lava bubbles pop on the river
        const x = pick(river) + rand(-24, 24);
        s.fx.spark?.(x, riverY + rand(-6, 10), 'fire', 3);
      });
    }
    if (wet) {
      const wk = anim(s, 'sc_wheel', 4, 6);
      const wx = tileX(4);
      this.keep(s.add.rectangle(wx, riverY - 8, 6, 30, 0x6a4630).setDepth(1.4));
      const wheel = this.keep(s.add.sprite(wx, riverY - 10, 'sc_wheel', 0).setScale(ART).setDepth(1.5));
      wheel.play(wk);
      this.every(1400, () => { if (Math.random() < 0.6) s.fx.splash?.(wx + rand(-20, 20), riverY + 10); });
      // fish jump out of the river now and then
      const fk = anim(s, 'sc_fish', 2, 8);
      this.every(2600, () => {
        if (Math.random() < 0.45) return;
        const x0 = pick(river) + rand(-20, 20), dir = Math.random() < 0.5 ? -1 : 1;
        const fish = this.keep(s.add.sprite(x0, riverY + 6, 'sc_fish', 0).setScale(ART).setDepth(2.2).setFlipX(dir < 0));
        fish.play(fk);
        const t = { k: 0 };
        s.fx.splash?.(x0, riverY + 8);
        s.tweens.add({
          targets: t, k: 1, duration: 760, ease: 'Linear',
          onUpdate: () => { fish.x = x0 + dir * 46 * t.k; fish.y = riverY + 6 - Math.sin(t.k * Math.PI) * 54; fish.angle = dir * (t.k - 0.5) * 120; },
          onComplete: () => { s.fx.splash?.(fish.x, riverY + 8); fish.destroy(); this.objs = this.objs.filter(o => o !== fish); },
        });
      });
    }
    if (ti === 4) { // swamp: lily pads bobbing, a frog that hops between them
      const pads = [tileX(2), tileX(5), tileX(11), tileX(13)].map(x => this.keep(s.add.image(x, riverY + 2, 'sc_pad').setScale(ART).setDepth(1.6)));
      for (const p of pads) s.tweens.add({ targets: p, y: p.y + 3, duration: rand(1200, 1800), yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const frog = this.keep(s.add.sprite(pads[0].x, riverY - 4, 'sc_frog', 0).setScale(ART).setDepth(1.7));
      let at = 0;
      this.every(3200, () => {
        const nx = (at + 1) % pads.length; at = nx;
        frog.setFrame(1).setFlipX(pads[nx].x < frog.x);
        s.tweens.add({ targets: frog, x: pads[nx].x, duration: 520, ease: 'Sine.InOut' });
        s.tweens.add({ targets: frog, y: riverY - 40, duration: 260, yoyo: true, ease: 'Quad.Out', onComplete: () => { frog.setFrame(0); s.fx.splash?.(frog.x, riverY + 6); } });
      });
    }

    // ---- set pieces on free grass
    const smoke = (x, y) => this.keep(s.add.particles(x, y, 'px_soft', {
      lifespan: 2600, speedY: { min: -36, max: -22 }, speedX: { min: 4, max: 14 }, scale: { start: 0.35, end: 1.1 },
      alpha: { start: 0.45, end: 0 }, tint: 0xe8e4dc, frequency: 420,
    }).setDepth(2.9));
    if ([0, 1, 3].includes(ti)) {
      for (let i = 0; i < 2; i++) {
        const c = take(); if (!c) break;
        this.keep(s.add.image(c.x, c.y + 26, 'sc_hut').setOrigin(0.5, 1).setScale(ART).setDepth(2.5).setFlipX(rnd() < 0.5));
        smoke(c.x + (22 - 15) * ART, c.y + 26 - 24 * ART);
      }
    }
    if ([1, 5].includes(ti)) {
      const c = take();
      if (c) {
        this.keep(s.add.image(c.x, c.y + 26, 'sc_mill_tower').setOrigin(0.5, 1).setScale(ART).setDepth(2.5));
        const sails = this.keep(s.add.sprite(c.x, c.y + 26 - 22 * ART, 'sc_mill_sails', 0).setScale(ART).setDepth(2.6));
        sails.play(anim(s, 'sc_mill_sails', 4, 5));
      }
    }
    if (ti === 6) for (let i = 0; i < 9; i++) { const c = take(); if (c) this.keep(s.add.image(c.x + rand(-14, 14), c.y + 24, 'sc_snow', i % 2).setOrigin(0.5, 1).setScale(ART).setDepth(1.2)); }
    if (ti === 7 || ti === 9) {
      for (let i = 0; i < 7; i++) {
        const c = take(); if (!c) break;
        const fr = i % 2, x = c.x + rand(-16, 16), y = c.y + rand(-10, 16);
        this.keep(s.add.image(x, y, 'sc_crack', fr).setScale(ART).setDepth(0.6));
        const glow = this.keep(s.add.image(x, y, 'sc_crack_glow', fr).setScale(ART).setDepth(0.7).setBlendMode('ADD').setAlpha(0.2));
        s.tweens.add({ targets: glow, alpha: 0.85, duration: rand(900, 1500), yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: rand(0, 900) });
      }
    }
    if (ti >= 8) {
      const tk = anim(s, 'sc_totem', 3, 7);
      for (let i = 0; i < 4; i++) {
        const c = take(); if (!c) break;
        const t = this.keep(s.add.sprite(c.x, c.y + 26, 'sc_totem', 0).setOrigin(0.5, 1).setScale(ART).setDepth(2.5));
        t.play({ key: tk, startFrame: i % 3 });
        const g = this.keep(s.add.image(c.x, c.y + 26 - 20 * ART, 'px_soft').setTint(0xa070ff).setBlendMode('ADD').setScale(0.9).setAlpha(0.5).setDepth(2.4));
        s.tweens.add({ targets: g, alpha: 0.2, scale: 0.7, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    }

    // ---- birds cross the sky on bright maps
    if (bright) {
      const bk = anim(s, 'sc_bird', 2, 6);
      this.every(9000, () => {
        if (Math.random() < 0.35) return;
        const dir = Math.random() < 0.5 ? 1 : -1, y0 = rand(MAP_TOP + 260, MAP_TOP + 900), n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const b = this.keep(s.add.sprite(dir > 0 ? -30 - i * 34 : W + 30 + i * 34, y0 + (i % 2) * 22 + i * 8, 'sc_bird', 0).setScale(ART).setDepth(22).setFlipX(dir < 0).setAlpha(0.9));
          b.play({ key: bk, startFrame: i % 2 });
          s.tweens.add({ targets: b, x: dir > 0 ? W + 80 : -80, y: b.y - rand(40, 120), duration: rand(7000, 9000), onComplete: () => { b.destroy(); this.objs = this.objs.filter(o => o !== b); } });
        }
      });
    }
  }
}

