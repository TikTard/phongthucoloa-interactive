// Giữ Thành Cổ Loa — main game scene
import {
  W, H, TILE, MAP_TOP, MAP_ROWS, MAP_X0, CITADEL_Y, HUD_BOTTOM, PATH, SLOT_ROWS, SLOT_COLS, SOLDIER_ROWS,
  RANKS, rankOf, XP, RECRUIT_SECONDS, RECRUIT_XP_MULT, RECRUIT_DMG_MULT,
  HEROES, HERO_LEVEL_BONUS, MAX_HERO_LEVEL, MAX_HEROES_PER_VIEWER, GIFT_TIERS,
  ENEMIES, BOSSES, ENEMY_UNLOCKS, BOSS_EVERY, CITADEL_MAX_HP,
  NO_THAN_BASE, NO_THAN_PER_VIEWER, COMBO_WINDOW, COMBO_STEPS, UPGRADE_PER_CMD, UPGRADE_PER_LIKE,
  EVENT_EVERY, PUZZLE_EVERY, PUZZLE_SECONDS, SKILLS, TICKER, CLASSES, HERO_ULTS, STAMINA, GUARD, ULTS, ultTier, EVENTS, ARMY, LEVELS, WAVES_PER_LEVEL, STAGE_HP, STAGE_SPEED,
  WAVE_COUNT, CROWD, LEVEL_CLEAR_HEAL, LEAK_DMG_MAX,
 HERO_SKILL,} from './config.js';
import { Army, classFromText } from './army.js';
import { CutIn } from './cutin.js';
import { Ambient } from './ambient.js';
import { Urgent } from './urgent.js';
import { UltDirector } from './ultimate.js';
import { Director } from './director.js';
import { Siege, flingCorpse } from './siege.js';
import { THEMES, themedKey } from './themes.js';
import { fold, foldAnswer, clean, pick, rand, clamp, fmt, truncate } from './util.js';
import { Net } from './net.js';
import { Bubbles } from './bubbles.js';
import { makePuzzle, makeMath, makeWord, PUZZLE_TYPES } from './puzzles.js';
import { FX, COLORS } from './effects.js';
import { Sfx } from './sfx.js';
import { panel, ptext, htext, banner, PX, HEAD, TEST } from './ui.js';
import { InfoBoards } from './boards.js';
import { Scenery } from './scenery.js';
import { HeroTalk } from './herotalk.js';

const tileX = c => MAP_X0 + c * TILE + TILE / 2;
const tileY = r => MAP_TOP + r * TILE + TILE / 2;
const ENEMY_SPEED = 1.15;            // global pace multiplier for enemies (per-type speeds are in config.js)
const ART = 2;                      // 32px tiles / 48px heroes drawn at 2x
const SOLDIER_H = 28;                // soldier sprite height in art pixels
const TIER_TINT = [0xc9a66b, 0x8fd16a, 0xbfd3ea, 0xffa066, 0xffe066];
const TIER_GLOW = [null, null, null, 0xff7a3a, 0xffd94a];
const RECRUIT_TINT = 0x7ff5d6;
const SOLDIER_MODES = [{ max: 120, scale: 2, sp: 48 }, { max: 320, scale: 1, sp: 26 }, { max: Infinity, scale: 1, sp: 20 }];
const HERO_SFX = { arrow: 'arrow', bolt: 'bolt', fire: 'fire', ice: 'ice', chain: 'thunder', spin: 'slash', heal: 'heal', cannon: 'cannon' };
const HERO_FX = { arrow: 'gold', bolt: 'white', fire: 'fire', ice: 'ice', chain: 'purple', spin: 'gold', heal: 'green', cannon: 'fire' };

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  // ------------------------------------------------------------------ loading
  preload() {
    this.load.json('manifest', 'assets/sprites/manifest.json');
    // pixelfx effect sheets (art/build-pfx.mjs); the game still runs without them
    this.load.json('pfxManifest', 'assets/pfx/manifest.json');
    this.load.on('filecomplete-json-pfxManifest', (_key, _type, data) => {
      for (const [k, m] of Object.entries(data || {})) this.load.spritesheet(`pfx_${k}`, `assets/pfx/${k}.png`, { frameWidth: m.w, frameHeight: m.h });
    });
    this.load.on('filecomplete-json-manifest', (_key, _type, data) => {
      for (const [k, m] of Object.entries(data)) {
        this.load.spritesheet(k, `assets/sprites/${k}.png`, { frameWidth: m.w, frameHeight: m.h });
      }
    });
  }

  anim(key, name) {
    const m = this.manifest[key];
    if (!m?.anims) return null;
    const n = name && m.anims[name] ? name : Object.keys(m.anims)[0];
    return n ? `a_${key}_${n}` : null;
  }

  create() {
    this.manifest = this.cache.json.get('manifest');
    this.pfxManifest = this.cache.json.get('pfxManifest') || {};
    for (const [k, m] of Object.entries(this.pfxManifest)) {
      if (!this.textures.exists(`pfx_${k}`)) { delete this.pfxManifest[k]; continue; }
      this.anims.create({ key: `a_pfx_${k}_${k}`, frames: this.anims.generateFrameNumbers(`pfx_${k}`, { start: 0, end: m.frames - 1 }), frameRate: m.fps, repeat: m.loop ? -1 : 0 });
      this.anims.create({ key: `a_pfx_${k}`, frames: this.anims.generateFrameNumbers(`pfx_${k}`, { start: 0, end: m.frames - 1 }), frameRate: m.fps, repeat: m.loop ? -1 : 0 });
      this.manifest[`pfx_${k}`] = { anims: { [k]: [0, m.frames - 1, m.fps, m.loop] } };
    }
    for (const [k, m] of Object.entries(this.manifest)) {
      for (const [name, a] of Object.entries(m.anims || {})) {
        if (this.anims.exists(`a_${k}_${name}`)) continue;
        this.anims.create({
          key: `a_${k}_${name}`, frames: this.anims.generateFrameNumbers(k, { start: a[0], end: a[1] }),
          frameRate: a[2], repeat: a[3] ? -1 : 0,
        });
      }
    }

    this.viewers = new Map();
    this.soldiers = [];
    this.heroes = [];
    this.enemies = [];
    this.projectiles = [];
    this.summons = [];
    this.actions = [];
    this.combo = { mult: 1, until: 0 };
    this.noThan = 0;
    this.citadel = CITADEL_MAX_HP;
    this.shieldUntil = 0;
    this.wave = 0;
    try { this.record = Number(localStorage.getItem('record') || 0); } catch { this.record = 0; }
    this.state = 'rally';
    this.rallyUntil = 0;
    this.goldenUntil = 0;
    this.hardcore = 1;
    this.paused = false;
    this.slowUntil = 0;
    this.event = null;
    this.puzzle = null;
    this.leaders = { allTime: [], today: [], donorsToday: [], donorsAll: [] };
    this.soldierMode = 0;
    this.timers = { presence: 0, xpFlush: 0, state: 0, ticker: 0, tags: 0, nextEvent: 0, nextPuzzle: 0, bossSkill: 0, memberToast: 0, players: 0 };
    this.tickerIndex = 0;

    // audio: browsers need one user gesture; OBS / LIVE Studio browser sources usually allow autoplay
    this.sfx = new Sfx();
    this.sfx.resume();
    this.sfx.startMusic();
    this.sfx.setTheme(THEMES[0].sound);
    const unlock = () => this.sfx.resume();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this.fx = new FX(this);
    this.level = 1;
    this.buildPath(LEVELS[0].path);
    this.drawMap();
    this.buildSlots();
    this.buildHud();
    this.boards = new InfoBoards(this);
    this.army = new Army(this);
    this.cutin = new CutIn(this);
    this.ambient = new Ambient(this);
    this.urgent = new Urgent(this);
    this.ult = new UltDirector(this);
    this.director = new Director(this);
    this.siege = new Siege(this);
    this.scenery = new Scenery(this);
    this.scenery.setTheme(0, this.decorImgs);
    this.talk = new HeroTalk(this);
    this.stats = { kills: 0, bossKills: 0, skillsCast: 0 };
    this.bubbles = new Bubbles(this);
    this.barGfx = this.add.graphics().setDepth(10);
    this.teamGfx = this.add.graphics().setDepth(4.3); // team rings under feet: blue = ours, red = monsters
    this.rainGfx = this.add.graphics().setDepth(21);
    this.rainDrops = Array.from({ length: 110 }, () => ({ x: rand(0, W), y: rand(MAP_TOP, H), s: rand(900, 1400) }));

    this.net = new Net('game', msg => this.onNet(msg));
    this.startRally();
    this.input.keyboard?.on('keydown-B', () => this.spawnBoss());
  }

  // ------------------------------------------------------------------ map
  buildPath(path = PATH) {
    this.pathDef = path;
    this.pathPts = path.map(([c, r]) => ({ x: tileX(c), y: tileY(r) }));
    this.segs = [];
    let total = 0;
    for (let i = 0; i < this.pathPts.length - 1; i++) {
      const a = this.pathPts[i], b = this.pathPts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.segs.push({ a, b, len, start: total });
      total += len;
    }
    this.pathLen = total;
    // horizontal stretches of the path (used by lane-wide skills)
    const rows = [];
    for (let i = 0; i < path.length - 1; i++) if (path[i][1] === path[i + 1][1] && path[i][1] >= 0 && path[i][1] <= 19 && !rows.includes(path[i][1])) rows.push(path[i][1]);
    this.laneYs = (rows.length ? rows : [5, 9, 13]).map(tileY);
  }

  posAt(d) {
    d = clamp(d, 0, this.pathLen);
    for (const s of this.segs) {
      if (d <= s.start + s.len) {
        const t = (d - s.start) / s.len;
        return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, dx: s.b.x - s.a.x, dy: s.b.y - s.a.y };
      }
    }
    const last = this.segs[this.segs.length - 1];
    return { x: last.b.x, y: last.b.y, dx: 0, dy: 1 };
  }

  drawMap() {
    this.drawField();
    this.drawStatic();
  }

  // grass, path, decor and the rift for the current level; everything it adds is remembered so a level change can
  // tear it down and draw the next map
  drawField() {
    const before = this.children.list.length;
    const ti = (this.level || 1) - 1, TH = THEMES[ti];
    const K = key => themedKey(this, key, ti);
    const PATHL = this.pathDef;
    const pathCells = new Set();
    for (let i = 0; i < PATHL.length - 1; i++) {
      const [c1, r1] = PATHL[i], [c2, r2] = PATHL[i + 1];
      const steps = Math.max(Math.abs(c2 - c1), Math.abs(Math.ceil(r2) - Math.floor(r1)));
      for (let s = 0; s <= steps; s++) {
        const c = Math.round(c1 + (c2 - c1) * (s / steps));
        const r = Math.round(r1 + (r2 - r1) * (s / steps));
        if (r >= 0 && r < MAP_ROWS) pathCells.add(`${c},${r}`);
      }
    }
    this.pathCells = pathCells;
    const isPath = (c, r) => pathCells.has(`${c},${r}`);
    // seeded random so the map looks the same every stream, but without a visible grid
    let seed = 7 + ((this.level || 1) - 1) * 977;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const grass = ['tile_grass', 'tile_grass3', 'tile_grass', 'tile_grass3', 'tile_grass2'];
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < 17; c++) {
        const key = K(isPath(c, r) ? 'tile_path' : grass[Math.floor(rnd() * grass.length)]);
        this.add.image(tileX(c), tileY(r), key).setScale(ART).setDepth(0).setFlip(rnd() < 0.5, rnd() < 0.5);
      }
    }
    // grass fringe hanging over every path edge that touches grass (rotated per side)
    const sides = [[0, -1, 0], [1, 0, 90], [0, 1, 180], [-1, 0, 270]];
    for (const key of pathCells) {
      const [c, r] = key.split(',').map(Number);
      for (const [dc, dr, angle] of sides) {
        const nc = c + dc, nr = r + dr;
        if (isPath(nc, nr) || nr < 0 || nr >= MAP_ROWS || nc < 0 || nc > 16) continue;
        const x = tileX(c) + dc * 22, y = tileY(r) + dr * 22;
        this.add.image(x, y, K(rnd() < 0.5 ? 'tile_edge' : 'tile_edge2')).setScale(ART).setAngle(angle).setDepth(0).setFlipX(rnd() < 0.5);
      }
    }

    this.decorImgs = [];
    const deco = (x, y, key, depth = 1) => { const d = this.add.image(x, y, K(key)).setOrigin(0.5, 1).setScale(ART).setDepth(depth).setFlipX(rnd() < 0.5); this.decorImgs.push(d); return d; };
    // outer columns: varied scenery, never the same thing twice in a row
    const outer = TH.decor;
    let last = '';
    for (let r = 0; r < MAP_ROWS - 1; r++) {
      for (const c of [0, 16]) {
        if (isPath(c, r) || rnd() < 0.15) continue;
        let k;
        let tries = 0;
        do { k = outer[Math.floor(rnd() * outer.length)]; } while (k === last && ++tries < 6);
        last = k;
        const x = tileX(c) + (c === 0 ? 4 : -4), y = tileY(r) + 30 + Math.round(rnd() * 6);
        if (k === 'lantern') { deco(x, y - 4, 'lantern', 2); this.lanternGlow(x, y - 30); }
        else deco(x, y, k, k.startsWith('tree') || k === 'bamboo' ? 3 : 1);
      }
    }
    // small grass tufts and flowers scattered on the open fields (kept off slots and soldier lines)
    for (let i = 0; i < 70; i++) {
      const c = 1 + Math.floor(rnd() * 15), r = Math.floor(rnd() * 18);
      if (isPath(c, r)) continue;
      deco(tileX(c) + Math.round(rnd() * 40 - 20), tileY(r) + Math.round(rnd() * 20), rnd() < 1 - TH.flowers ? 'tuft' : 'flowers', 1).setAlpha(0.95);
    }
    if (ti === 0 || TH.rice) for (let c = 9; c <= 15; c += 2) if (!isPath(c, 18) && !isPath(c + 1, 18)) deco(tileX(c) + 32, tileY(18) + 22, 'rice');
    for (let c = 1; c <= 7; c += 3) if (!isPath(c, 18) && !isPath(c + 1, 18)) deco(tileX(c) + 32, tileY(18) + 24, 'flowers');

    // spawn portal where the demons enter (top of the first lane)
    const px = this.pathPts[0].x, py = MAP_TOP + 30;
    this.portal = this.fx.circle(px, py, 1.6, 0, 'purple').setDepth(1).setAlpha(0.8);
    const pg = this.add.image(px, py, 'px_soft').setTint(0x8a3aff).setBlendMode('ADD').setScale(2.2).setDepth(1);
    this.tweens.add({ targets: pg, alpha: 0.45, scale: 1.8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.fieldObjs = this.children.list.slice(before);
  }

  drawStatic() {
    for (let c = 1; c <= 16; c++) {
      if (c >= 7 && c <= 9) continue;
      (this.waterSprites = this.waterSprites || []).push(this.add.sprite(tileX(c), tileY(20), 'tile_water').setScale(ART).setDepth(0.1).play({ key: 'a_tile_water_flow', startFrame: c % 4 }));
    }

    // citadel
    for (let c = 0; c < 17; c++) {
      this.add.image(tileX(c), CITADEL_Y + 32, 'tile_plank').setScale(ART).setDepth(0);
      for (let r = 1; r < 5; r++) this.add.image(tileX(c), CITADEL_Y + 32 + r * 64, 'tile_wall').setScale(ART).setDepth(0);
    }
    this.add.rectangle(0, CITADEL_Y + 64, W, 6, 0x000000, 0.35).setOrigin(0).setDepth(0);
    this.gate = this.add.image(W / 2, CITADEL_Y - 40, 'gate').setOrigin(0.5, 0).setScale(ART).setDepth(4);
    this.lanternGlow(W / 2 - 52, CITADEL_Y - 40 + 100);
    this.lanternGlow(W / 2 + 52, CITADEL_Y - 40 + 100);
    this.shieldGfx = this.add.graphics().setDepth(12);
    for (let c = 0; c < 17; c++) this.add.image(tileX(c), CITADEL_Y + 32 + 5 * 64, 'tile_wall').setScale(ART).setDepth(0).setTint(0xb8a8a0);
    this.add.rectangle(0, H - 34, W, 34, 0x241622, 0.85).setOrigin(0).setDepth(0.5);
  }

  lanternGlow(x, y) {
    const g = this.add.image(x, y, 'px_soft').setTint(0xffa040).setBlendMode('ADD').setScale(1.4).setAlpha(0.5).setDepth(2);
    this.tweens.add({ targets: g, alpha: 0.25, scale: 1.2, duration: 1200 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  buildSlots() {
    this.slots = [];
    let n = 1;
    for (const r of SLOT_ROWS) {
      for (const c of SLOT_COLS) {
        const x = tileX(c) + 32, y = tileY(r);
        // empty slot: dirt pad + small wooden number plaque
        const pad = this.add.ellipse(x, y + 28, 92, 30, 0x3a2414, 0.5).setDepth(2).setStrokeStyle(4, 0xb07a46, 0.85);
        const numT = htext(this, 0, 1, String(n), 20, '#ffe58a').setOrigin(0.5);
        const num = this.add.container(x, y - 4, [panel(this, 'wood', 0, 0, n > 9 ? 56 : 44, 38), numT]).setDepth(2);
        this.tweens.add({ targets: num, y: y - 10, duration: 1100 + n * 40, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        this.slots.push({ n, x, y, pad, num, hero: null });
        n++;
      }
    }
  }

  // ------------------------------------------------------------------ HUD (pixel frames)
  buildHud() {
    panel(this, 'wood', W / 2, HUD_BOTTOM / 2 - 4, W + 16, HUD_BOTTOM + 8).setDepth(40);
    // instruction ticker: a red lacquer strip at the bottom of the HUD (it used to sit at the very bottom of the
    // screen, under TikTok's comments)
    panel(this, 'lacquer', W / 2, HUD_BOTTOM - 26, W - 20, 44).setDepth(40);
    panel(this, 'dark', W / 2, 38, W - 20, 64).setDepth(40);
    const D = 41;
    this.hud = {
      wave: htext(this, 28, 14, 'WAVE 0', 30, '#ffe58a').setOrigin(0, 0).setDepth(D),
      record: ptext(this, W / 2 + 14, 38, 'Kỷ lục 0', 36, '#f3e4c0').setOrigin(0.5).setDepth(D),
      viewers: ptext(this, W - 28, 38, '0 chiến sĩ', 36, '#a8e2c4').setOrigin(1, 0.5).setDepth(D),
      wallLbl: ptext(this, 70, 92, 'THÀNH', 34, '#f3e4c0').setOrigin(0, 0.5).setDepth(D),
      wallVal: ptext(this, W - 24, 92, '100%', 34, '#f3e4c0').setOrigin(1, 0.5).setDepth(D),
      ntLbl: ptext(this, 70, 132, 'NỎ THẦN', 34, '#ffc4d4').setOrigin(0, 0.5).setDepth(D),
      ntVal: ptext(this, W - 24, 132, '0/150', 34, '#f3e4c0').setOrigin(1, 0.5).setDepth(D),
      line4: ptext(this, 70, 170, '', 32, '#f3e4c0').setOrigin(0, 0.5).setDepth(D),
    };
    this.add.image(W / 2 - 92, 38, 'ic_crown').setScale(2.4).setDepth(D);
    this.add.image(38, 92, 'ic_castle').setScale(2.6).setDepth(D);
    this.add.image(38, 132, 'ui_heart').setScale(3).setDepth(D);
    this.hudIcon4 = this.add.image(38, 170, 'ic_sword').setScale(2.4).setDepth(D);
    this.barFrames = [panel(this, 'bar', 560, 92, 720, 34).setDepth(D), panel(this, 'bar', 560, 132, 720, 34).setDepth(D)];
    this.bossFrame = panel(this, 'bar', 640, 170, 560, 30).setDepth(D).setVisible(false);
    this.hudGfx = this.add.graphics().setDepth(D + 1);

    // combo badge: small lacquer plaque on the grass corner under the HUD (never covers a lane)
    this.comboText = htext(this, 0, 0, '', 26, '#ffe58a', { stroke: '#3a0606' }).setOrigin(0.5);
    this.comboBadge = this.add.container(W - 130, HUD_BOTTOM + 34, [panel(this, 'lacquer', 0, 0, 220, 50), this.comboText]).setDepth(46).setVisible(false);
    this.hud.foes = ptext(this, W - 24, 170, '', 30, '#f3e4c0').setOrigin(1, 0.5).setDepth(D);

    this.ticker = ptext(this, W / 2, HUD_BOTTOM - 26, TICKER[0], 32, '#ffe58a', { shadowColor: '#3a0606' }).setOrigin(0.5).setDepth(D);
    // event feed: one line on a dark strip just under the HUD; it fades out when nothing new happens
    this.feedBack = this.add.rectangle(16, HUD_BOTTOM + 6, 10, 38, 0x140a06, 0.72).setOrigin(0, 0).setDepth(39).setAlpha(0);
    this.feedLine = ptext(this, 28, HUD_BOTTOM + 25, '', 30, '#f3e4c0').setOrigin(0, 0.5).setDepth(D).setAlpha(0);

    // rally screen: ribbon + parchment note
    const note = panel(this, 'paper', 0, 120, 760, 190);
    this.rallyLine = ptext(this, 0, 80, 'Gõ "vào" để nhập ngũ!', 46, '#2a170e', { shadow: false }).setOrigin(0.5);
    this.rallyCount = new Phaser.GameObjects.Text(this, 0, 150, '', { fontFamily: HEAD, fontSize: '40px', testString: TEST, padding: { top: 6 }, color: '#8a1a12' }).setOrigin(0.5);
    this.add.existing(this.rallyCount);
    this.rallyBox = this.add.container(W / 2, 1080, [note, banner(this, 0, 0, 'GIỮ THÀNH CỔ LOA', 46), this.rallyLine, this.rallyCount]).setDepth(50).setVisible(false);

    // puzzle: unrolled bamboo scroll over the river/field rows (no lanes there)
    const paper = panel(this, 'paper', 0, 0, 880, 188);
    const rodL = this.add.image(-452, 0, 'ui_rod').setScale(2.2, 2.2);
    const rodR = this.add.image(452, 0, 'ui_rod').setScale(2.2, 2.2);
    const seal = panel(this, 'seal', 0, -94, 520, 44);
    this.pz = {
      title: htext(this, 0, -96, '', 20, '#fff2dc', { stroke: '#3a0606' }).setOrigin(0.5),
      q: this.add.text(0, -14, '', { fontFamily: HEAD, fontSize: '54px', testString: TEST, padding: { top: 6 }, color: '#7a1a12' }).setOrigin(0.5).setShadow(0, 4, '#c8a878', 0, false, true),
      hint: ptext(this, 0, 50, '', 32, '#5a3a1e', { shadow: false }).setOrigin(0.5),
      bar: this.add.graphics(),
    };
    this.pzBox = this.add.container(W / 2, HUD_BOTTOM + 220, [paper, rodL, rodR, seal, this.pz.title, this.pz.q, this.pz.hint, this.pz.bar]).setDepth(45).setVisible(false);
  }

  drawHud(now) {
    const g = this.hudGfx;
    g.clear();
    // chunky segmented pixel bar
    const bar = (cx, cy, w, frac, color, light) => {
      const x0 = cx - w / 2 + 8, y0 = cy - 9, iw = w - 16, ih = 18;
      const fw = Math.round(iw * clamp(frac, 0, 1) / 2) * 2;
      if (fw > 0) {
        g.fillStyle(color, 1).fillRect(x0, y0, fw, ih);
        g.fillStyle(light, 1).fillRect(x0, y0, fw, 4);
        g.fillStyle(0x000000, 0.25).fillRect(x0, y0 + ih - 4, fw, 4);
        g.fillStyle(0x000000, 0.35);
        for (let x = x0 + 24; x < x0 + fw; x += 24) g.fillRect(x, y0, 2, ih);
      }
    };
    const shield = this.shieldUntil > now;
    const wallColor = shield ? [0xf2c443, 0xffe58a] : this.citadel > 50 ? [0x4ab08a, 0x9ff0c8] : this.citadel > 25 ? [0xd8862a, 0xffc070] : [0xc42a26, 0xff7a6a];
    bar(560, 92, 720, this.citadel / CITADEL_MAX_HP, wallColor[0], wallColor[1]);
    bar(560, 132, 720, this.noThan / this.noThanMax(), 0xd84a78, 0xffa8c4);
    this.hud.wave.setText(`MÀN ${this.level} · WAVE ${this.waveInLevel()}/${WAVES_PER_LEVEL}`);
    this.hud.record.setText(`Kỷ lục ${this.record}`);
    const extra = this.viewers.size - this.soldiers.length;
    this.hud.viewers.setText(`${fmt(this.soldiers.length)} chiến sĩ${extra > 0 ? ` +${extra}` : ''}`);
    this.hud.wallVal.setText(shield ? 'KHIÊN' : `${Math.ceil(this.citadel)}%`);
    this.hud.ntVal.setText(`${fmt(this.noThan)}/${fmt(this.noThanMax())}`);

    const boss = this.enemies.find(e => e.boss);
    this.bossFrame.setVisible(Boolean(boss));
    if (boss) {
      bar(640, 170, 560, boss.hp / boss.maxHp, 0xc42a26, 0xff7a6a);
      this.hudIcon4.setTexture('ic_skull');
      this.hud.line4.setText(boss.name.toUpperCase()).setColor('#ff9a8a');
    } else if (this.event) {
      this.hudIcon4.setTexture('ic_sword');
      this.hud.line4.setText(`${this.event.label} · ${Math.ceil((this.event.until - now) / 1000)}s`).setColor('#a8e2c4');
    } else {
      this.hudIcon4.setTexture('ic_sword');
      const n = this.comboCount(now);
      const next = [...this.comboSteps()].reverse().find(s => s.n > n);
      this.hud.line4.setText(next ? `Combo ${n}/${next.n} → x${next.mult}` : `Combo ${n} · tối đa`).setColor('#f3e4c0');
    }
  }

  feed(text, color = '#f3e4c0') {
    const t = this.feedLine.setText(clean(text)).setColor(color);
    t.setScale(1); if (t.width > W - 300) t.setScale((W - 300) / t.width, 1); // leave room for the combo plaque
    this.feedBack.width = t.displayWidth + 24;
    this.tweens.killTweensOf([t, this.feedBack]);
    t.setAlpha(1); this.feedBack.setAlpha(0.72);
    this.tweens.add({ targets: [t, this.feedBack], alpha: 0, delay: 6000, duration: 600 });
  }

  // "TITLE\nsubtitle" -> red ribbon with the title, parchment tag with the subtitle
  announce(text, color = '#fff2dc') {
    // at most two ribbons on screen: a new one pushes the oldest away
    this.announceList = (this.announceList || []).filter(b => b.active);
    while (this.announceList.length >= 2) this.announceList.shift().destroy();
    const used = new Set(this.announceList.map(b => b.getData('slot')));
    const slot = used.has(0) ? 1 : 0;
    const [title, ...rest] = String(text).split('\n');
    const sub = rest.join(' ');
    const y = 640 + slot * 200;
    const parts = [];
    if (sub) {
      const st = ptext(this, 0, 74, sub, 38, '#2a170e', { shadow: false }).setOrigin(0.5);
      parts.push(panel(this, 'paper', 0, 74, st.width + 48, 56), st);
    }
    const textColor = color === '#ffd94a' ? '#ffe58a' : color.startsWith('#ff') && color !== '#ffffff' ? color : '#fff2dc';
    parts.push(banner(this, 0, 0, title, title.length > 18 ? 36 : 44, textColor));
    const box = this.add.container(W / 2, y - 220, parts).setDepth(50).setData('slot', slot);
    this.announceList.push(box);
    this.announceUntil = this.time.now + 2400;
    this.tweens.add({ targets: box, y, duration: 420, ease: 'Bounce.Out' });
    this.tweens.add({ targets: box, y: y - 40, alpha: 0, delay: 2100, duration: 260, ease: 'Stepped', easeParams: [4], onComplete: () => box.destroy() });
  }

  // ------------------------------------------------------------------ network
  onNet(msg) {
    this.sfx.resume();
    if (msg.type === 'event') this.onViewerEvent(msg.event);
    else if (msg.type === 'control') this.onControl(msg.action, msg.data || {});
    else if (msg.type === 'leaders') this.leaders = { allTime: msg.allTime || [], today: msg.today || [], donorsToday: msg.donorsToday || [], donorsAll: msg.donorsAll || [] };
  }

  onControl(action, data) {
    switch (action) {
      case 'boss': this.spawnBoss(data.id !== undefined && data.id !== null && data.id !== '' ? Number(data.id) : undefined); break;
      case 'twist': this.director.forceTwist = String(data.id || ''); if (this.state === 'play') this.startWave(this.wave + 1); break;
      case 'golden':
        this.goldenUntil = this.goldenUntil > this.time.now ? 0 : this.time.now + 10 * 60000;
        this.announce(this.goldenUntil ? 'GIỜ VÀNG! x2 XP trong 10 phút' : 'Giờ Vàng kết thúc', '#ffd94a');
        break;
      case 'puzzle-math': this.startPuzzle(makeMath(Math.max(1, this.wave))); break;
      case 'puzzle-word': this.startPuzzle(makeWord()); break;
      case 'puzzle': this.startPuzzle((PUZZLE_TYPES[data.id] || makePuzzle)(Math.max(1, this.wave))); break;
      case 'event': this.startEvent(data.id); break;
      case 'nothan': this.fireNoThan(null); break;
      case 'hardcore':
        this.hardcore = this.hardcore > 1 ? 1 : 1.5;
        this.announce(this.hardcore > 1 ? 'CHẾ ĐỘ KHÓ: quái +50% máu' : 'Chế độ thường', '#ff8080');
        break;
      case 'pause': this.paused = !this.paused; this.announce(this.paused ? 'TẠM DỪNG' : 'TIẾP TỤC', '#ffffff'); break;
      case 'reset': this.gameOver(true); break;
      case 'wave': this.startWave(this.wave + 1); break;
      case 'level': if (this.state === 'play' || this.state === 'rally') { this.wave = this.level * WAVES_PER_LEVEL; this.finishLevel(); } break;
      case 'map': this.gotoLevel(Number(data.id)); break;
      case 'audio': this.sfx.setVolumes(data); break;
      case 'clearSession': this.clearSession(); break;
      case 'production': this.startProduction(); break;
      case 'kick': this.kickViewer(String(data.id || '')); break;
      case 'testUlt': this.testUlt(String(data.cls || 'kiem'), Number(data.xu) || 20); break;
      case 'talk': this.talk.poke(); break;
      case 'sfxtest': this.sfx.play(data.name || 'coin'); break;
    }
  }

  // ------------------------------------------------------------------ viewers
  getViewer(ev) {
    const now = this.time.now;
    let v = this.viewers.get(ev.user.id);
    if (!v) {
      const xp = Number(ev.profile?.xp || 0);
      v = {
        id: ev.user.id, name: clean(ev.user.name).slice(0, 18) || 'Ẩn danh', xp, rank: rankOf(xp),
        streak: ev.profile?.streak || 1, isNew: Boolean(ev.profile?.isNew),
        recruitUntil: ev.profile?.isNew ? now + RECRUIT_SECONDS * 1000 : 0, firstKillDone: false,
        lastActive: now, soldier: null, heroes: [], pendingXp: 0, greeted: false, sessionXp: 0, sessionGifts: 0,
        cls: null, level: 1, lvDmg: 0, skills: 0, deaths: 0, kills: 0,
        cd: { shoot: 0, chatXp: 0, nang: 0, like: 0, revive: 0 },
        round: { dmg: 0, kills: 0, gifts: 0, puzzles: 0, revives: 0, bossKills: 0 },
      };
      this.viewers.set(v.id, v);
    }
    v.lastActive = now;
    return v;
  }

  isRecruit(v) { return v.recruitUntil > this.time.now; }

  addXp(v, amount) {
    if (!v || amount <= 0) return;
    let a = amount;
    if (this.isRecruit(v)) a *= RECRUIT_XP_MULT;
    if (this.goldenUntil > this.time.now) a *= 2;
    if (this.event?.id === 'festival') a *= 2;
    a = Math.round(a);
    v.xp += a;
    v.pendingXp += a;
    v.sessionXp += a;
    const r = rankOf(v.xp);
    if (r > v.rank) { v.rank = r; this.onRankUp(v); }
  }

  onRankUp(v) {
    const rn = RANKS[v.rank].name;
    this.say(v, `lên ${rn}!`, 'rank');
    this.feed(`${v.name} thăng cấp ${rn}!`, '#d7b8ff');
    if (v.rank >= 3) this.announce(`${v.name} trở thành ${rn}!`, '#d7b8ff', 52);
    this.sfx.play('rankUp');
    if (v.soldier) {
      this.setSoldierLook(v.soldier);
      if (!this.fx.pfx('pillar', v.soldier.sprite.x, v.soldier.sprite.y + 4, { scale: 1, speed: 1.6, every: 200 })) this.fx.beam(v.soldier.sprite.x, v.soldier.sprite.y, 'purple', 260);
      this.fx.shockwave(v.soldier.sprite.x, v.soldier.sprite.y, 0xb06aff, 70, 350, 4);
    }
    for (const h of v.heroes) { this.setHeroLook(h); this.fx.beam(h.slot.x, h.slot.y + 30, 'gold'); }
  }

  anchorOf(v, preferHero = false) {
    return () => {
      if (preferHero && v.heroes[0]) return { x: v.heroes[0].sprite.x, y: v.heroes[0].sprite.y - 96 };
      if (v.soldier && (v.soldier.fallen || !v.soldier.sprite.visible)) return { x: W / 2, y: CITADEL_Y + 40 };
      if (v.soldier) return { x: v.soldier.sprite.x, y: v.soldier.sprite.y - v.soldier.sprite.displayHeight - 4 };
      return { x: W / 2, y: CITADEL_Y + 40 };
    };
  }

  say(v, text, kind = 'chat', preferHero = false) {
    this.bubbles.show({ id: v.id, name: v.name, text: clean(text), kind, anchor: this.anchorOf(v, preferHero) });
  }

  registerAction(n = 1) {
    const now = this.time.now;
    for (let i = 0; i < Math.min(n, 20); i++) this.actions.push(now);
  }

  comboCount(now) {
    const cut = now - COMBO_WINDOW * 1000;
    while (this.actions.length && this.actions[0] < cut) this.actions.shift();
    return this.actions.length;
  }

  onViewerEvent(ev) {
    if (!ev?.user?.id) return;
    const v = this.getViewer(ev);
    const now = this.time.now;
    switch (ev.type) {
      case 'member':
        if (now > this.timers.memberToast) {
          this.timers.memberToast = now + 2500;
          this.feed(`Chào ${v.name}! Gõ "vào" để chiến đấu`, '#9fe1cb');
        }
        return;
      case 'chat': this.onChat(v, String(ev.text || '')); break;
      case 'like': this.onLike(v, Math.max(1, Number(ev.count || 1))); break;
      case 'gift': this.onGift(v, ev.gift || { name: 'Quà', diamonds: 1, count: 1, total: 1 }); break;
      case 'follow': this.onFollow(v); break;
      case 'share': this.onShare(v); break;
    }
  }

  ensureSoldier(v) {
    if (v.soldier) return true;
    if (this.soldiers.length >= this.soldierCapacity()) return false;
    this.addSoldier(v);
    this.sfx.play('join');
    if (!v.greeted) {
      v.greeted = true;
      const s = v.soldier.sprite;
      this.fx.puff(s.x, s.y - 4, 3);
      if (this.isRecruit(v)) {
        this.say(v, 'Tân binh nhập ngũ!', 'recruit');
        this.fx.spark(s.x, s.y - 20, 'teal', 14);
        this.feed(`Tân binh ${v.name} đã nhập ngũ!`, '#9fe1cb');
      } else if (v.rank >= 3) {
        this.say(v, `${RANKS[v.rank].name} đã đến!`, 'rank');
        this.announce(`${RANKS[v.rank].name} ${v.name} đã đến!`, '#d7b8ff', 48);
        this.fx.beam(s.x, s.y, 'gold', 360);
      } else if (v.streak >= 2) {
        this.say(v, `nhập ngũ! Chuỗi ${v.streak} ngày`, 'cmd');
      }
    }
    return true;
  }

  onChat(v, raw) {
    const now = this.time.now;
    const text = clean(raw.trim());
    if (!text) return;
    this.ensureSoldier(v);
    this.registerAction();
    const f = fold(raw);

    if (this.puzzle && !this.puzzle.solvedBy && this.isAnswer(raw)) {
      if (this.solvePuzzle(v)) return;
    } else if (this.puzzle?.solvedBy && now - this.puzzle.solvedAt < 3000 && this.isAnswer(raw)) {
      this.addXp(v, XP.puzzleLate);
      this.say(v, `${text} ✓`, 'cmd');
      return;
    }

    // "vào cung", "vao khien": join and pick the class in one message
    const joinCls = f.startsWith('vao ') ? classFromText(f.slice(4).trim()) : null;
    const cls = classFromText(f) || joinCls;
    if (cls && joinCls && v.soldier) {
      this.army.setClass(v, cls);
      this.say(v, `nhập ngũ! ${CLASSES[cls].name}`, 'recruit'); this.cheer(v.soldier);
    } else if (cls) {
      if (!v.soldier) this.say(v, 'chưa còn chỗ trên tường thành!', 'sys');
      else if (this.army.setClass(v, cls)) { this.say(v, `chọn ${CLASSES[cls].name}!`, 'recruit'); this.cheer(v.soldier); }
      else this.say(v, `đang là ${CLASSES[cls].name}`, 'cmd');
    } else if (f === 'lop' || f === 'class' || f === 'nghe') {
      this.say(v, 'gõ: kiếm · thương · cung · khiên · phép · y · song · võ · thích', 'sys');
    } else if (f === 'vao' || f === 'join') {
      if (!v.soldier) this.say(v, 'chưa còn chỗ trên tường thành!', 'sys');
      else { this.say(v, v.joinHinted ? `nhập ngũ! ${CLASSES[v.cls].name}` : `nhập ngũ! ${CLASSES[v.cls].name} · gõ "cung", "khiên"… để đổi lớp`, 'cmd'); v.joinHinted = true; this.cheer(v.soldier); }
    } else if (f === 'toi' || f === 'info' || f === 'me' || f === 'cap' || f === 'level') {
      this.sayInfo(v);
    } else if (f === 'cuu' || f.startsWith('cuu ')) {
      this.cmdRevive(v);
    } else if (/^nang( ?\d{1,2})?$/.test(f)) {
      this.cmdUpgrade(v, Number((f.match(/\d+/) || [])[0] || 0));
    } else if (f === 'cuop' && this.event?.id === 'treasure') {
      this.cmdTreasure(v);
    } else {
      this.say(v, text, 'chat');
    }
    if (now > v.cd.chatXp) { v.cd.chatXp = now + 3000; this.addXp(v, XP.chat); }
  }

  onLike(v, count) {
    const now = this.time.now;
    this.ensureSoldier(v);
    this.registerAction(Math.ceil(count / 5));
    this.noThan += count;
    this.sfx.play('like');
    for (const h of v.heroes) h.stamina = Math.min(STAMINA.max, (h.stamina || 0) + STAMINA.perLikeEvent);
    if (v.soldier && Math.random() < 0.5) {
      const h = this.add.image(v.soldier.sprite.x, v.soldier.sprite.y - 40, 'ui_heart').setScale(2.4).setDepth(28);
      this.tweens.add({ targets: h, y: h.y - 70, x: h.x + rand(-20, 20), alpha: 0, duration: 900, onComplete: () => h.destroy() });
    }
    const up = UPGRADE_PER_LIKE * count / Math.max(1, this.soldiers.length / 20);
    for (const h of this.heroes) this.addUpgrade(h, up, null);
    if (now > v.cd.like) { v.cd.like = now + 2000; this.addXp(v, XP.like); }
    if (this.noThan >= this.noThanMax()) { this.noThan = 0; this.fireNoThan(v); }
  }

  onFollow(v) {
    this.ensureSoldier(v);
    this.registerAction(5);
    this.addXp(v, XP.follow);
    let msg = 'theo dõi! +XP';
    if (v.heroes.length === 0) {
      const slot = this.freeSlot();
      if (slot) { this.placeHero(v, slot, 'cungthu', 1); msg = 'theo dõi! Nhận Cung Thủ miễn phí'; }
    }
    this.say(v, msg, 'gift', true);
    let revived = 0;
    for (const s of this.soldiers) if (s.fallen && revived < 3) { this.reviveSoldier(s); revived++; }
  }

  onShare(v) {
    this.ensureSoldier(v);
    this.registerAction(5);
    this.addXp(v, XP.share);
    this.citadel = Math.min(CITADEL_MAX_HP, this.citadel + 3);
    this.fx.spark(W / 2, CITADEL_Y + 40, 'green', 16);
    this.sfx.play('heal');
    this.say(v, 'chia sẻ! Sửa thành +3', 'cmd');
  }

  // ------------------------------------------------------------------ commands
  // "tôi": class, level, rank and how the last fight went, in the viewer's bubble
  sayInfo(v) {
    if (!v.soldier) { this.say(v, 'chưa nhập ngũ · gõ "vào"', 'sys'); return; }
    const s = v.soldier, lv = this.army.level(v);
    const state = s.fallen ? `đang dưỡng thương${v.killedBy ? ` (${v.killedBy})` : ''}` : `${Math.round(100 * s.hp / this.army.maxHp(s))}% máu`;
    this.say(v, `${CLASSES[v.cls].name} Lv${lv} · ${RANKS[v.rank].name} · ${v.kills || 0} quái · ${state}`, 'sys');
  }

  cmdRevive(v) {
    const now = this.time.now;
    if (now < v.cd.revive) return;
    v.cd.revive = now + 2000;
    const fallen = this.soldiers.filter(s => s.fallen).sort((a, b) => b.fellAt - a.fellAt)[0];
    if (!fallen) { this.say(v, 'cứu! (không ai bị ngã)', 'cmd'); return; }
    this.fx.pfx('heal1', W / 2, CITADEL_Y + 90, { scale: 1, every: 200 });
    this.reviveSoldier(fallen);
    this.sfx.play('revive');
    v.round.revives++;
    const bonus = fallen.viewer.rank < v.rank && fallen.viewer.rank <= 1 ? 2 : 1;
    this.addXp(v, XP.revive * bonus);
    this.addXp(fallen.viewer, XP.revive);
    this.say(v, `cứu ${fallen.viewer.name}!`, 'cmd');
    this.feed(`${v.name} hồi sinh ${fallen.viewer.name}`, '#9fe1cb');
  }

  cmdUpgrade(v, n) {
    const now = this.time.now;
    if (now < v.cd.nang) return;
    v.cd.nang = now + 1500;
    const slot = n ? this.slots[n - 1] : v.heroes[0] ? v.heroes[0].slot : null;
    if (!slot || !slot.hero) { this.say(v, n ? `ô ${n} chưa có anh hùng` : 'nâng!', 'cmd'); return; }
    this.addUpgrade(slot.hero, UPGRADE_PER_CMD, v);
    this.fx.spark(slot.x, slot.y, 'gold', 5);
    this.addXp(v, 2);
    this.say(v, `nâng ô ${slot.n} (${Math.round(slot.hero.progress * 100)}%)`, 'cmd');
  }

  cmdTreasure(v) {
    const ev = this.event;
    if (ev.claimed.has(v.id) || ev.claimed.size >= 10) return;
    ev.claimed.add(v.id);
    this.addXp(v, XP.treasure);
    this.fx.coinBurst(ev.chest.x, ev.chest.y, 6);
    this.fx.pfx('collect', ev.chest.x, ev.chest.y + 20, { scale: 1, every: 100 });
    this.sfx.play('treasure');
    this.say(v, `cướp được kho báu! +${XP.treasure} XP`, 'ok');
  }

  // ------------------------------------------------------------------ soldiers
  soldierCapacity() { return this.soldierSlots(2).length; }

  soldierSlots(mode) {
    this.slotCache = this.slotCache || {};
    if (this.slotCache[mode]) return this.slotCache[mode];
    const sp = SOLDIER_MODES[mode].sp;
    const heroXs = SLOT_COLS.map(c => tileX(c) + 32);
    // keep the rows right above and below each hero slot clear around the slot (hero body + nameplate)
    const aboveHero = new Set(SLOT_ROWS.flatMap(r => [r - 1, r + 1]));
    const rows = [];
    const rowXs = (x0, x1) => { const xs = []; for (let x = x0; x <= x1; x += sp) xs.push(x); return xs; };
    for (const r of SOLDIER_ROWS) {
      const y = tileY(r) + 28;
      let xs = rowXs(110, 970);
      if (aboveHero.has(r)) xs = xs.filter(x => heroXs.every(hx => Math.abs(x - hx) > 80));
      if (r === 19) xs = xs.filter(x => Math.abs(x - W / 2) > 70);
      rows.push(xs.map(x => ({ x, y })));
    }
    // the wall's upper half holds the info boards; soldiers line up along its foot
    for (const y of [CITADEL_Y + 222, CITADEL_Y + 256]) rows.push(rowXs(30, 1050).map(x => ({ x, y })));
    // fill the lower field + wall first: the between-rounds scroll covers the upper field,
    // and that's exactly when most viewers join, so their names must stay visible
    const out = [];
    const interleave = group => {
      const longest = Math.max(0, ...group.map(r => r.length));
      for (let i = 0; i < longest; i++) {
        for (const row of group) {
          const mid = Math.floor(row.length / 2);
          const k = i % 2 === 0 ? mid + i / 2 : mid - (i + 1) / 2;
          if (row[k]) out.push(row[k]);
        }
      }
    };
    const SCROLL_BOTTOM = 990;
    interleave(rows.filter(r => r[0] && r[0].y > SCROLL_BOTTOM));
    interleave(rows.filter(r => r[0] && r[0].y <= SCROLL_BOTTOM).reverse());
    return (this.slotCache[mode] = out);
  }

  desiredSoldierMode(n) { return SOLDIER_MODES.findIndex(m => n <= m.max); }

  addSoldier(v) {
    const shadow = this.add.image(0, 0, 'shadow').setDepth(4).setAlpha(0.8);
    const sprite = this.add.sprite(0, 0, 'soldier_1').setOrigin(0.5, 31 / 32).setDepth(5); // PixelSpec guards: feet on row 30, row 31 empty
    const tag = ptext(this, 0, 0, truncate(v.name, 12), 32, '#ffffff', { shadowColor: '#000000' }).setOrigin(0.5, 1).setDepth(6).setStroke('#140a06', 5);
    const s = { viewer: v, sprite, shadow, tag, fallen: false, fellAt: 0, cd: rand(0.3, 1.6), index: this.soldiers.length, joinedAt: this.time.now };
    v.cls = v.cls || this.army.defaultClass();
    v.soldier = s;
    this.soldiers.push(s);
    this.army.init(s);
    this.army.look(s, true);
    const mode = this.desiredSoldierMode(this.soldiers.length);
    if (mode !== this.soldierMode) this.layoutSoldiers(mode);
    else this.placeSoldier(s, true);
    // late joiners march straight out of the gate
    if (this.state === 'play') this.army.deploy(s, 300);
    this.timers.tags = Math.min(this.timers.tags, this.time.now + 250);
  }

  setSoldierLook(s) { this.army.look(s); }

  cheer(s) {
    if (!s || s.fallen || s.mode === 'march') return;
    this.army.play(s, s.key.startsWith('sol_') ? 'cast' : 'cheer', true);
    this.time.delayedCall(450, () => { if (!s.fallen && s.sprite.active && s.mode === 'home') this.army.play(s, 'idle', true); });
  }

  placeSoldier(s, pop = false) {
    const sc = SOLDIER_MODES[this.soldierMode].scale;
    s.sprite.setScale(sc);
    s.tag.setFontSize(sc >= 2 ? 32 : 26);
    s.shadow.setScale(0.32 * sc, 0.4 * sc);
    if (s.mode && s.mode !== 'home') return; // marching soldiers are placed by the army every frame
    const pos = this.soldierSlots(this.soldierMode)[s.index];
    if (!pos) return;
    s.sprite.setPosition(pos.x, pos.y).setDepth(5);
    s.shadow.setPosition(pos.x, pos.y - 1).setScale(0.32 * sc, 0.4 * sc);
    s.tag.setPosition(pos.x, pos.y - SOLDIER_H * sc).setFontSize(sc >= 2 ? 32 : 26);
    if (pop) {
      s.sprite.setScale(sc * 0.3);
      this.tweens.add({ targets: s.sprite, scale: sc, duration: 260, ease: 'Back.Out' });
      this.fx.spark(pos.x, pos.y - 14, 'white', 5);
    }
  }

  layoutSoldiers(mode) {
    this.soldierMode = mode;
    this.soldiers.forEach((s, i) => { s.index = i; this.placeSoldier(s); });
    this.refreshTags();
  }

  // Big readable name tags. Only tags that don't overlap are shown, picked by priority:
  // just joined > just talked / gifted > strongest fighters, so everyone gets their moment.
  refreshTags() {
    const now = this.time.now;
    const score = s => {
      const v = s.viewer;
      let p = v.round.dmg * 0.01 + v.xp * 0.02 + v.sessionGifts * 5;
      if (now - s.joinedAt < 12000) p += 1e6 - (now - s.joinedAt);
      if (now - v.lastActive < 8000) p += 5e5;
      return p;
    };
    const placed = [];
    for (const s of [...this.soldiers].sort((a, b) => score(b) - score(a))) {
      const t = s.tag;
      const w = t.width + 6, h = t.height - 4, x = t.x, y = t.y - h / 2;
      const ok = !s.fallen && s.sprite.visible && !placed.some(r => Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - y) < (r.h + h) / 2);
      t.setVisible(ok);
      if (ok) placed.push({ x, y, w, h });
    }
  }

  knockDown(s) { this.army.hurt(s, 1e9); }

  reviveSoldier(s) {
    if (!this.army.revive(s)) return;
    if (s.mode === 'home') {
      this.fx.spark(s.sprite.x, s.sprite.y - 20, 'green', 10);
      this.fx.halo(s.sprite.x, s.sprite.y - 20, 'green', 0.9, 400);
    }
  }

  removeSoldier(s) {
    s.sprite.destroy(); s.shadow.destroy(); s.tag.destroy();
    this.soldiers = this.soldiers.filter(o => o !== s);
    s.viewer.soldier = null;
    this.soldiers.forEach((o, i) => { o.index = i; if (o.mode === 'home') this.placeSoldier(o); });
  }

  kickViewer(id) {
    const v = this.viewers.get(id);
    if (!v) return;
    if (v.soldier) this.removeSoldier(v.soldier);
    for (const h of [...v.heroes]) this.removeHero(h);
    this.viewers.delete(id);
    this.bubbles.queue = (this.bubbles.queue || []).filter(q => q.id !== id);
  }

  // admin "clear session": a clean slate for a new stream
  clearSession() {
    for (const s of [...this.soldiers]) { s.sprite.destroy(); s.shadow.destroy(); s.tag.destroy(); }
    this.soldiers = [];
    for (const h of [...this.heroes]) this.removeHero(h);
    this.viewers.clear();
    this.stats = { kills: 0, bossKills: 0, skillsCast: 0 };
    this.noThan = 0;
    this.combo = { mult: 1, until: 0 };
    this.actions = [];
    this.soldierMode = 0;
    this.resetRound();
    this.announce('PHIÊN MỚI', '#ffe58a', 64);
  }

  // admin "BẬT LIVE": everything back to the start (level 1, wave 0, normal mode) for the real stream
  startProduction() {
    if (this.event) this.endEvent();
    if (this.puzzle) this.endPuzzle();
    this.paused = false;
    this.goldenUntil = 0;
    this.hardcore = 1;
    if (this.director) this.director.forceTwist = '';
    this.clearSession();
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.announce('TRẬN MỚI · GÕ "VÀO" ĐỂ NHẬP NGŨ', '#ffe58a', 56);
  }

  // ------------------------------------------------------------------ heroes
  freeSlot() {
    const free = this.slots.filter(s => !s.hero);
    return free.length ? pick(free) : null;
  }

  heroKey(h) { return `hero_${h.type}_${h.owner ? h.owner.rank + 1 : 1}`; }

  setHeroLook(h) {
    const key = this.heroKey(h);
    if (h.key !== key) {
      h.key = key;
      h.sprite.setTexture(key);
      h.sprite.play({ key: this.anim(key, 'idle'), startFrame: Math.floor(Math.random() * 4) });
      if (h.glow) { h.sprite.preFX?.remove(h.glow); h.glow = null; }
      const tier = h.owner ? h.owner.rank : 0;
      if (TIER_GLOW[tier]) h.glow = this.fx.glow(h.sprite, TIER_GLOW[tier], 2);
    }
    const stars = '★'.repeat(h.owner ? h.owner.rank + 1 : 1);
    // nameplate: dark brass plaque, owner name + hero / level / rank stars
    h.label?.destroy();
    const tierColors = ['#c9a06b', '#a8e2a0', '#cfe0f4', '#ffb070', '#ffe58a'];
    const nameT = ptext(this, 0, -14, truncate(h.owner ? h.owner.name : HEROES[h.type].name, 11), 36, '#ffffff', { shadowColor: '#000000' }).setOrigin(0.5);
    const infoT = ptext(this, 0, 15, `${HEROES[h.type].name} Lv${h.level} ${stars}`, 26, tierColors[h.owner ? h.owner.rank : 0], { shadowColor: '#000000' }).setOrigin(0.5);
    const pw = Math.min(188, Math.max(nameT.width, infoT.width) + 18);
    if (nameT.width > pw - 12) nameT.setScale((pw - 12) / nameT.width, 1);
    if (infoT.width > pw - 12) infoT.setScale((pw - 12) / infoT.width, 1);
    h.label = this.add.container(h.slot.x, h.slot.y + 68, [panel(this, 'dark', 0, 0, pw, 62), nameT, infoT]).setDepth(7);
    this.drawAura(h);
  }

  placeHero(owner, slot, type, level = 1) {
    if (slot.hero) this.removeHero(slot.hero);
    const shadow = this.add.image(slot.x, slot.y + 32, 'shadow').setScale(1.3, 1).setDepth(4);
    const sprite = this.add.sprite(slot.x, slot.y + 34, `hero_${type}_1`, 0).setOrigin(0.5, 46 / 48).setScale(ART).setDepth(6);
    const label = null; // built in setHeroLook
    const h = { slot, type, owner, level: clamp(level, 1, MAX_HERO_LEVEL), progress: 0, sprite, shadow, label, aura: null, cd: 0.6, placedAt: this.time.now };
    slot.hero = h;
    slot.num.setVisible(false);
    slot.pad.setVisible(false);
    this.heroes.push(h);
    if (owner) owner.heroes.push(h);
    this.setHeroLook(h);
    sprite.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: sprite, scale: ART, alpha: 1, duration: 420, ease: 'Back.Out', delay: 150 });
    if (!this.fx.pfx('circle', slot.x, slot.y + 40, { scale: 1, force: true, depth: 5 })) this.fx.circle(slot.x, slot.y + 30, 2.6, 1500);
    this.fx.beam(slot.x, slot.y + 34, HERO_FX[HEROES[type].kind] || 'gold', 420);
    this.fx.shockwave(slot.x, slot.y + 32, COLORS[HERO_FX[HEROES[type].kind]] || 0xffd94a, 110, 420, 6);
    this.time.delayedCall(450, () => { this.fx.puff(slot.x, slot.y + 30, 5); this.cameras.main.shake(80, 0.002); });
    this.sfx.play('heroSpawn');
    this.talk?.onHero(h);
    return h;
  }

  drawAura(h) {
    const tier = h.owner ? h.owner.rank : 0;
    const want = tier >= 3 || h.level >= 4;
    if (want && !h.aura) {
      h.aura = this.fx.circle(h.slot.x, h.slot.y + 30, 1.8, 0, tier >= 4 ? 'gold' : 'fire');
      h.aura.setAlpha(0.55).setDepth(3);
    } else if (!want && h.aura) { h.aura.destroy(); h.aura = null; }
  }

  removeHero(h) {
    h.sprite.destroy(); h.label?.destroy(); h.shadow.destroy(); h.aura?.destroy();
    h.slot.hero = null;
    h.slot.num.setVisible(true);
    h.slot.pad.setVisible(true);
    this.heroes = this.heroes.filter(x => x !== h);
    if (h.owner) h.owner.heroes = h.owner.heroes.filter(x => x !== h);
  }

  addUpgrade(h, amount, v) {
    if (h.level >= MAX_HERO_LEVEL) return;
    h.progress += amount;
    if (h.progress >= 1) {
      h.progress = 0;
      h.level++;
      this.setHeroLook(h);
      if (!this.fx.pfx('pillar', h.slot.x, h.slot.y + 38, { scale: 1, speed: 1.6, every: 150, depth: 7 })) this.fx.beam(h.slot.x, h.slot.y + 34, 'gold', 360);
      this.fx.shockwave(h.slot.x, h.slot.y + 32, 0xffd94a, 90, 380, 5);
      this.sfx.play('levelUp');
      this.feed(`Ô ${h.slot.n}: ${HEROES[h.type].name} lên Lv${h.level}${v ? ` nhờ ${v.name}` : ''}`, '#ffd94a');
    }
  }

  heroDamage(h) {
    const def = HEROES[h.type];
    // heroes scale with the wave like guards do (they used to fall far behind monster HP after level 3)
    let d = def.dmg * RANKS[h.owner ? h.owner.rank : 0].mult * (1 + HERO_LEVEL_BONUS * (h.level - 1)) * this.combo.mult * this.waveScale();
    if (this.event?.id === 'rain' && def.kind === 'fire') d *= 0.6;
    if (this.heroes.some(o => o !== h && o.type === 'luongy' && Phaser.Math.Distance.Between(o.slot.x, o.slot.y, h.slot.x, h.slot.y) < HEROES.luongy.aura)) d *= 1.2;
    return d;
  }

  heroRange(h) { return HEROES[h.type].range * (1 + 0.05 * (h.level - 1)) * (this.event?.id === 'fog' ? 0.7 : 1); }

  unlockedTypes() { return ENEMY_UNLOCKS.filter(([w]) => Math.max(1, this.wave) >= w).map(([, t]) => t); }

  heroAttack(h) {
    const def = HEROES[h.type];
    const range = this.heroRange(h);
    const x = h.slot.x, y = h.slot.y;
    const target = this.firstEnemyInRange(x, y, range);
    if (!target && def.kind !== 'heal') return false;
    // 12% critical hits: double damage, big number, heavier hit
    const crit = Math.random() < 0.12;
    const dmg = this.heroDamage(h) * (crit ? 2 : 1);
    const owner = h.owner;
    const color = HERO_FX[def.kind];
    h.sprite.play(this.anim(h.key, 'attack'));
    h.sprite.once('animationcomplete', () => { if (h.sprite.active) h.sprite.play(this.anim(h.key, 'idle')); });
    if (target) h.sprite.setFlipX(target.x < x);
    const dir = h.sprite.flipX ? -1 : 1;
    const sx = x + 24 * dir, sy = y - 20;
    this.sfx.play(HERO_SFX[def.kind]);
    this.fx.halo(sx, sy - 10, color, 0.5, 160); // muzzle / cast flash
    const hitFx = e => {
      if (crit) {
        if (!this.fx.pfx('crit', e.x, e.y + 4, { scale: 1, every: 70, flip: e.x < x })) this.fx.hit(e.x, e.y - 14, 'gold');
        this.fx.spark(e.x, e.y - 14, 'gold', 8);
        this.fx.damageNumber(e.x, e.y - 60, dmg, true);
        this.sfx.play('crit');
      } else {
        if (def.kind === 'bolt') { if (!this.fx.pfx('zap', e.x, e.y + 6, { scale: 1, every: 60 })) this.fx.hit(e.x, e.y - 14, color); }
        else if (!this.fx.pfx('hitspark', e.x, e.y - 4, { scale: 1, every: 35, flip: e.x < x, angle: rand(-25, 25) })) this.fx.hit(e.x, e.y - 14, color);
        this.sfx.play('hit');
      }
    };
    switch (def.kind) {
      case 'arrow':
        this.fireProjectile(sx, sy, target, 'fx_arrow', 2.4, 1100, null, e => { this.damage(e, dmg, owner); hitFx(e); }, true);
        break;
      case 'bolt':
        this.fireProjectile(sx, sy, target, 'fx_bolt', 2.4, 1500, null, e => {
          this.damage(e, dmg, owner); hitFx(e);
          const next = this.nearestEnemy(e.x, e.y, 110, e);
          if (next) { this.damage(next, dmg * 0.6, owner); hitFx(next); }
        }, true, 'white');
        break;
      case 'fire':
        this.fireProjectile(sx, y - 50, target, this.pfxManifest.fireball ? 'pfx_fireball' : 'fx_fireball', this.pfxManifest.fireball ? 1 : 2.6, 700, null, e => {
          if (!this.fx.pfx('boom', e.x, e.y + 14, { scale: 1, speed: 1.8, every: 120 })) this.fx.explode(e.x, e.y - 10, 1.3);
          this.fx.scorch(e.x, e.y + 16, 0.8);
          this.sfx.play('explode');
          if (crit) this.fx.damageNumber(e.x, e.y - 60, dmg, true);
          this.splash(e.x, e.y, def.splash, dmg, owner);
        }, true, 'fire');
        break;
      case 'ice':
        this.fireProjectile(sx, y - 50, target, this.pfxManifest.icelance ? 'pfx_icelance' : 'fx_ice', this.pfxManifest.icelance ? 1 : 2.6, 800, null, e => {
          if (!this.fx.pfx('snowburst', e.x, e.y + 10, { scale: 1, speed: 1.6, every: 120 })) this.fx.spark(e.x, e.y - 10, 'ice', 12);
          this.fx.halo(e.x, e.y - 10, 'ice', 1.6, 300);
          for (const o of this.enemiesNear(e.x, e.y, def.splash)) { this.damage(o, dmg, owner); o.slowUntil = this.time.now + 2200; }
        }, true, 'ice');
        break;
      case 'chain': {
        let from = { x: sx, y: y - 56 }, cur = target, hit = new Set(), mult = 1;
        for (let i = 0; i < def.chains + Math.floor(h.level / 2) && cur; i++) {
          this.fx.lightning(from.x, from.y, cur.x, cur.y - 14);
          this.fx.pfx('zap', cur.x, cur.y + 6, { scale: 1, every: 40 });
          this.damage(cur, dmg * mult, owner);
          hit.add(cur);
          from = { x: cur.x, y: cur.y };
          cur = this.enemies.filter(e => e.alive && !hit.has(e)).sort((a, b) => Phaser.Math.Distance.Between(from.x, from.y, a.x, a.y) - Phaser.Math.Distance.Between(from.x, from.y, b.x, b.y))[0];
          if (cur && Phaser.Math.Distance.Between(from.x, from.y, cur.x, cur.y) > 200) cur = null;
          mult *= 0.75;
        }
        break;
      }
      case 'spin': {
        if (!this.fx.pfx('slash', x, y + 36, { scale: Math.max(1, Math.round(range / 90)), flip: dir < 0, depth: 7 })) {
          const sl = this.add.sprite(x, y - 6, 'fx_slash').setScale(range / 26).setDepth(26).setBlendMode('ADD').setFlipX(dir < 0);
          sl.play(this.anim('fx_slash'));
          sl.once('animationcomplete', () => sl.destroy());
        }
        for (const e of this.enemiesNear(x, y, range)) { this.damage(e, dmg, owner); hitFx(e); }
        break;
      }
      case 'heal':
        this.citadel = Math.min(CITADEL_MAX_HP, this.citadel + 0.25 * h.level);
        this.fx.trail(x + 20 * dir, y - 60, 'green');
        if (target) this.fireProjectile(sx, y - 50, target, 'fx_orb', 2, 850, 0x8ff58f, e => { this.damage(e, dmg, owner); hitFx(e); }, false, 'green');
        break;
      case 'cannon':
        this.fx.halo(x + 46 * dir, y - 30, 'fire', 1, 200);
        this.fx.pfx('muzzle', x + 40 * dir, y - 2, { scale: 1, flip: dir < 0, every: 120, speed: 2 });
        this.fireProjectile(x + 46 * dir, y - 30, target, 'fx_orb', 3, 750, 0x3a3a4a, e => {
          if (!this.fx.pfx('boom', e.x, e.y + 16, { scale: 1, speed: 1.5, every: 80 })) this.fx.explode(e.x, e.y - 10, 2);
          this.fx.shockwave(e.x, e.y + 10, 0xff9a3a, 120, 300, 6);
          this.fx.scorch(e.x, e.y + 16, 1.2);
          this.fx.debris(e.x, e.y, 10);
          this.sfx.play('explode');
          if (crit) this.fx.damageNumber(e.x, e.y - 60, dmg, true);
          this.cameras.main.shake(90, 0.003);
          this.splash(e.x, e.y, def.splash, dmg, owner);
        }, false, 'fire');
        break;
    }
    return true;
  }

  // ------------------------------------------------------------------ gifts
  onGift(v, gift) {
    this.ensureSoldier(v);
    const total = Math.max(1, Number(gift.total || gift.diamonds * gift.count || 1));
    v.round.gifts += total;
    this.army.onGift(v, total); // the gifter's guard fires its class ultimate (cut-in pop-up)
    v.sessionGifts += total;
    this.registerAction(Math.min(30, 3 + total));
    this.addXp(v, total * XP.giftPerDiamond);
    const giftName = clean(gift.name || 'Quà');
    const countTxt = gift.count > 1 ? ` x${gift.count}` : '';
    if (v.soldier) {
      const sx = v.soldier.sprite.x, sy = v.soldier.sprite.y - 30;
      this.fx.coinBurst(sx, sy, Math.min(20, 3 + total));
      this.fx.pfx('collect', sx, sy + 24, { scale: total >= 20 ? 2 : 1, force: true });
      this.fx.shockwave(sx, sy + 26, 0xffd94a, 60 + Math.min(120, total * 2), 400, 5);
    }
    // gift value drives the spectacle
    this.sfx.play(total >= 20 ? 'giftBig' : 'coin');
    this.talk.onGift(v, total);
    if (total >= 100) {
      this.fx.fireworks(total >= 1000 ? 12 : total >= 300 ? 7 : 4);
      this.fx.edgeFlash(0xffd94a, total >= 1000 ? 0.9 : 0.5, 900);
    }

    // a gift = the gifter's class ultimate (no summons); the army queues and plays it as a cinematic
    if (v.soldier) {
      const u = ULTS[v.cls];
      this.say(v, `tặng ${giftName}${countTxt} → ${u.name}${ultTier(total)}!`, 'gift');
      this.feed(`${v.name} tặng ${giftName}${countTxt}: tuyệt kỹ ${u.name}`, '#ffd94a');
    } else this.say(v, `tặng ${giftName}${countTxt}!`, 'gift');
  }

  // admin "Thử tuyệt kỹ": a test guard of that class marches out and fires its ultimate right away
  testUlt(cls, xu) {
    if (!CLASSES[cls]) return;
    if (this.state === 'over') return;
    if (this.state === 'rally') this.rallyUntil = this.time.now;
    const id = `sim:test_${cls}`;
    const v = this.getViewer({ user: { id, name: `Thử ${CLASSES[cls].name}` }, profile: { xp: 400 } });
    if (!this.ensureSoldier(v)) return;
    this.army.setClass(v, cls) || (v.cls = cls);
    const s = v.soldier;
    this.time.delayedCall(this.state === 'play' ? 0 : 700, () => {
      if (s.mode !== 'march' || s.fallen) this.army.deploy(s, 0);
      // stand in the middle of the field, with something to hit
      s.d = this.pathLen * 0.55;
      s.marchAt = 0;
      const near = this.enemies.filter(e => e.alive && Math.abs(e.d - s.d) < 400).length;
      for (let i = near; i < 10; i++) {
        const e = this.spawnEnemy(i % 3 === 0 ? 'shield' : 'imp');
        e.d = Math.max(0, s.d - 90 - i * 22);
      }
      v.pendingUlt = Math.max(v.pendingUlt || 0, xu);
    });
  }

  summonGiong(v) {
    this.announce(`THÁNH GIÓNG XUẤT TRẬN!\n${v.name}`, '#ffd94a', 60);
    const end = this.posAt(this.pathLen);
    this.fx.circle(end.x, end.y, 4, 1400);
    this.fx.beam(end.x, end.y, 'fire', 700);
    this.fx.shockwave(end.x, end.y, 0xff7a2a, 300, 600, 10);
    this.fx.debris(end.x, end.y, 24);
    this.sfx.play('summon');
    const sprite = this.add.sprite(0, 0, 'summon_giong').setScale(3).setOrigin(0.5, 0.9).setDepth(11);
    sprite.play(this.anim('summon_giong'));
    this.fx.glow(sprite, 0xff7a2a, 3);
    this.summons.push({ sprite, owner: v, d: this.pathLen, dir: -1, speed: 440, dmg: 260, hitCd: new Map(), radius: 120, trail: 'fire' });
  }

  summonDragon(v) {
    this.announce(`RỒNG VÀNG GIÁNG THẾ!\n${v.name}`, '#ffd94a', 64);
    this.cameras.main.flash(350, 255, 220, 120);
    this.sfx.play('summon');
    this.time.delayedCall(300, () => this.sfx.play('volley'));
    const sprite = this.add.sprite(0, 0, 'summon_dragon').setScale(3).setDepth(11);
    sprite.play(this.anim('summon_dragon'));
    this.fx.glow(sprite, 0xffd94a, 4);
    this.summons.push({ sprite, owner: v, d: 0, dir: 1, speed: 1100, dmg: 99999, bossPct: 0.25, hitCd: new Map(), radius: 150, trail: 'gold' });
  }

  summonTurtle(v) {
    this.announce(`RÙA VÀNG HỘ THÀNH!\n${v.name}`, '#ffd94a', 60);
    this.shieldUntil = this.time.now + 25000;
    this.citadel = Math.min(CITADEL_MAX_HP, this.citadel + 30);
    this.sfx.play('shield');
    this.fx.shockwave(W / 2, CITADEL_Y + 70, 0xffd94a, 320, 700, 10);
    const sprite = this.add.sprite(W / 2, CITADEL_Y - 40, 'summon_turtle').setScale(3).setDepth(12);
    sprite.play(this.anim('summon_turtle'));
    this.fx.glow(sprite, 0xffd94a, 4);
    this.fx.beam(W / 2, CITADEL_Y + 20, 'gold', 800);
    this.tweens.add({ targets: sprite, y: sprite.y - 14, yoyo: true, repeat: 11, duration: 1000, ease: 'Sine.InOut', onComplete: () => sprite.destroy() });
  }

  // ------------------------------------------------------------------ enemies & waves
  stageHp() { return 1 + STAGE_HP * (this.level - 1); }
  stageSpeed() { return 1 + STAGE_SPEED * (this.level - 1); }
  waveInLevel() { return !this.wave || (this.state === 'rally' && this.wave % WAVES_PER_LEVEL === 0) ? 0 : ((this.wave - 1) % WAVES_PER_LEVEL) + 1; }

  waveScale() { return 1 + 0.18 * Math.max(0, this.wave - 1); }
  activeSoldiers() { return this.soldiers.filter(s => !s.fallen).length; }

  difficultyMult() {
    const power = this.heroes.reduce((a, h) => a + h.level * RANKS[h.owner ? h.owner.rank : 0].mult, 0);
    return (1 + clamp((this.activeSoldiers() - CROWD.ref / 2) * CROWD.hpPerGuard, 0, CROWD.hpMax) + Math.min(0.5, power * 0.02)) * this.hardcore;
  }
  // more guards = more monsters per wave (see CROWD in config.js)
  crowdK() { return clamp(Math.sqrt(this.soldiers.length / CROWD.ref), CROWD.minK, CROWD.maxK); }
  waveCount() {
    const c = WAVE_COUNT, wl = ((Math.max(1, this.wave) - 1) % WAVES_PER_LEVEL) + 1;
    return Math.min(c.max, Math.round((c.base + c.perWave * wl + c.perLevel * (this.level - 1)) * this.crowdK()));
  }

  startRally() {
    if (this.level !== 1) this.setLevel(1);
    this.victory = false;
    this.state = 'rally';
    this.countdownShown = false;
    this.rallyUntil = this.time.now + 15000;
    this.wave = 0;
  }

  // ------------------------------------------------------------------ levels (màn)
  setLevel(n) {
    this.level = n;
    for (const o of this.fieldObjs || []) { this.tweens.killTweensOf(o); o.destroy(); }
    this.buildPath(LEVELS[n - 1].path);
    this.drawField();
    const p0 = this.pathPts[0];
    this.ambient?.rift?.setPosition(Math.max(90, p0.x), MAP_TOP + 96);
    this.ambient?.setTheme(n - 1);
    this.scenery?.setTheme(n - 1, this.decorImgs);
    this.sfx.setTheme(THEMES[n - 1].sound);
    this.siege?.placeEnemyCats(this.pathDef);
    if (this.army) this.army.postsAt = 0;
  }

  clearField() {
    for (const e of this.enemies) { e.sprite.destroy(); e.shadow.destroy(); e.ice?.destroy(); }
    for (const p of this.projectiles) p.sprite.destroy();
    for (const s of this.summons) s.sprite.destroy();
    this.enemies = []; this.projectiles = []; this.summons = [];
    this.spawnQueue = []; this.bossPending = false;
    this.endEvent(); this.endPuzzle();
    this.urgent.stop(true);
    this.ambient.clear();
  }

  // admin "đổi bản đồ": jump straight to a level's map (army, heroes and levels kept), with a short rally
  gotoLevel(n) {
    if (!LEVELS[n - 1] || this.state === 'over' || this.state === 'transition') return;
    this.state = 'transition';
    const cam = this.cameras.main;
    cam.fadeOut(350, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.clearField();
      this.army.goHome();
      this.setLevel(n);
      this.wave = (n - 1) * WAVES_PER_LEVEL;
      cam.fadeIn(500, 0, 0, 0);
      this.announce(`MÀN ${n}: ${LEVELS[n - 1].name.toUpperCase()}`, '#ffd27a', 60);
      this.state = 'rally';
      this.countdownShown = false;
      this.rallyUntil = this.time.now + 8000;
    });
  }

  finishLevel() {
    if (this.state !== 'play' && this.state !== 'rally') return;
    const done = this.level;
    this.state = 'transition';
    for (const v of this.viewers.values()) if (v.soldier && !v.soldier.fallen) this.addXp(v, 30);
    this.citadel = Math.min(CITADEL_MAX_HP, this.citadel + LEVEL_CLEAR_HEAL);
    if (done >= LEVELS.length) { this.grandVictory(); return; }
    this.announce(`HOÀN THÀNH MÀN ${done}!\n${LEVELS[done - 1].name}`, '#ffe58a', 64);
    this.fx.fireworks(8);
    this.fx.edgeFlash(0xffd94a, 0.8, 1200);
    this.sfx.play('rankUp'); this.sfx.play('gong');
    this.feed(`Hoàn thành màn ${done}! Cả làng +30 XP · thành +${LEVEL_CLEAR_HEAL}%`, '#ffe58a');
    this.talk.say('levelClear', { prio: 3, delay: 700 });
    this.time.delayedCall(2600, () => {
      const cam = this.cameras.main;
      cam.fadeOut(450, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => {
        this.clearField();
        this.army.goHome();
        this.setLevel(done + 1);
        cam.fadeIn(650, 0, 0, 0);
        const L = LEVELS[done];
        this.announce(`MÀN ${done + 1}: ${L.name.toUpperCase()}\nĐường mới · quái mạnh hơn`, '#ffd27a', 60);
        this.sfx.play('wave');
        this.state = 'rally';
        this.countdownShown = false;
        this.rallyUntil = this.time.now + 10000;
      });
    });
  }

  grandVictory() {
    this.clearField();
    this.announce('ĐẠI THẮNG!\nGiữ vững Cổ Loa qua 10 màn', '#ffe58a', 72);
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 700, () => this.fx.fireworks(6));
    this.fx.edgeFlash(0xffd94a, 1, 2500);
    this.sfx.play('bossDeath');
    for (const v of this.viewers.values()) if (v.soldier) this.addXp(v, 100);
    this.feed('ĐẠI THẮNG! Cả làng +100 XP', '#ffe58a');
    this.time.delayedCall(5500, () => { this.victory = true; this.state = 'play'; this.gameOver(true); });
  }

  // ------------------------------------------------------------------ boss skills
  bossSkill(boss, now) {
    const def = boss.def, sk = def.skill || { id: 'darkbolt', name: 'Hắc Lôi' };
    // no cut-in for boss skills (those are kept for gift ultimates); a floating skill name over the boss instead
    this.bossSkillLabel(boss, sk.name);
    if (this.anims.exists(this.anim(boss.sprite.texture.key, 'cast') || '') && this.manifest[boss.sprite.texture.key]?.anims?.cast) {
      boss.sprite.play(this.anim(boss.sprite.texture.key, 'cast'));
      boss.sprite.once('animationcomplete', () => { if (boss.alive) boss.sprite.play(this.anim(boss.sprite.texture.key, 'walk')); });
    }
    const hit = this.army.enemyHitScale();
    const front = this.army.frontline(10, boss.d);
    let n = 0;
    switch (sk.id) {
      case 'warcry': {
        for (const e of this.enemies) e.rageUntil = now + 5000;
        this.fx.shockwave(boss.x, boss.y, 0xff3a3a, 420, 600, 10);
        this.fx.pfx('darkboom', boss.x, boss.y + 20, { scale: 1, force: true });
        for (const s of front.slice(0, 2 + Math.floor(this.wave / 10))) { this.fx.lightning(boss.x, boss.y - 60, s.sprite.x, s.sprite.y - 20, 0xff3a3a); this.army.hurt(s, 60 * hit, boss); n++; }
        this.feed(`${boss.name}: Chiến Hống! Quái tăng tốc`, '#ff8080');
        break;
      }
      case 'tide': {
        const t = front[0] || boss;
        this.fx.pfx('wave', t.sprite ? t.sprite.x : t.x, (t.sprite ? t.sprite.y : t.y) + 10, { scale: 2, force: true, depth: 9 });
        this.fx.pfx('geyser', boss.x, boss.y + 24, { scale: 1, force: true });
        for (const s of this.soldiers) {
          if (s.mode !== 'march' || s.fallen || Math.abs(s.d - boss.d) > 380) continue;
          s.d = Math.min(this.pathLen, s.d + 170);
          this.army.hurt(s, this.army.maxHp(s) * 0.2, boss);
          n++;
        }
        this.cameras.main.shake(300, 0.006);
        this.feed(`${boss.name}: Hải Khiếu cuốn lùi ${n} chiến sĩ`, '#7ad0ff');
        break;
      }
      case 'poison': {
        const t = front[0];
        if (!t) break;
        const px = t.sprite.x, py = t.sprite.y;
        this.fx.pfx('poison', px, py + 6, { scale: 2, force: true, depth: 9 });
        for (const s of this.soldiers) {
          if (s.mode === 'march' && !s.fallen && Math.abs(s.sprite.x - px) < 170 && Math.abs(s.sprite.y - py) < 110) { s.poisonUntil = now + 5000; n++; }
        }
        this.feed(`${boss.name}: Độc Vụ trúng ${n} chiến sĩ! Y Sư đâu?`, '#a8e26a');
        break;
      }
      case 'charm': {
        for (const s of front.slice(0, 3 + Math.floor(this.wave / 10))) {
          s.stunUntil = now + 3000;
          s.sprite.setTint(0xff9ad8);
          this.fx.pfx('charm', s.sprite.x, s.sprite.y + 2, { scale: 1, force: true });
          n++;
        }
        for (let i = 0; i < 4; i++) {
          const fox = this.spawnEnemy('fox');
          fox.d = Math.max(0, boss.d - 20 - i * 18);
        }
        this.fx.halo(boss.x, boss.y - 30, 'purple', 2.4, 400);
        this.feed(`${boss.name} mê hoặc ${n} chiến sĩ, gọi hồ ly con!`, '#ff9ad8');
        break;
      }
      case 'roots': {
        for (const s of front.slice(0, 8)) {
          s.stunUntil = now + 3000;
          this.fx.pfx('roots', s.sprite.x, s.sprite.y + 2, { scale: 1, force: true });
          this.army.hurt(s, 20 * hit, boss);
          n++;
        }
        this.fx.pfx('thorns', boss.x, boss.y + 24, { scale: 2, force: true });
        boss.hp = Math.min(boss.maxHp, boss.hp + boss.maxHp * 0.04);
        this.fx.spark(boss.x, boss.y - 40, 'green', 14);
        this.feed(`${boss.name}: Thiên Căn Trói ${n} chiến sĩ, hồi máu!`, '#8fd16a');
        break;
      }
      case 'quake': {
        this.fx.pfx('slam', boss.x, boss.y + 26, { scale: 3, force: true, speed: 1.3 });
        this.fx.shockwave(boss.x, boss.y, 0xd8b070, 460, 600, 14);
        this.cameras.main.shake(700, 0.014);
        for (const s of this.soldiers) {
          if (s.mode !== 'march' || s.fallen || Math.abs(s.sprite.x - boss.x) > 300 || Math.abs(s.sprite.y - boss.y) > 300) continue;
          s.stunUntil = now + 2200; this.army.hurt(s, 30 * hit, boss); n++;
        }
        for (let i = 0; i < 4; i++) this.time.delayedCall(i * 160, () => this.fx.pfx('landing', boss.x + rand(-200, 200), boss.y + rand(-120, 120), { scale: 2, force: true }));
        this.feed(`${boss.name}: Chấn Địa! ${n} chiến sĩ choáng`, '#d8b070');
        break;
      }
      case 'swoop': {
        for (const s of front.slice(0, 3 + Math.floor(this.wave / 12))) {
          const sx = s.sprite.x, sy = s.sprite.y;
          this.fx.pfx('crit', sx, sy, { scale: 1, force: true });
          this.army.hurt(s, this.army.maxHp(s) * 0.35, boss);
          if (!s.fallen) { s.d = Math.min(this.pathLen, s.d + 600); s.stunUntil = now + 1200; }
          n++;
        }
        this.fx.shockwave(boss.x, boss.y - 40, 0xe8dcc0, 380, 500, 10);
        for (let i = 0; i < 12; i++) this.fx.trail(boss.x + rand(-200, 200), boss.y + rand(-160, 40), 'white');
        this.cameras.main.shake(300, 0.008);
        this.feed(`${boss.name} quắp ${n} chiến sĩ ném về cổng!`, '#e8dcc0');
        break;
      }
      case 'flood': {
        for (const ly of this.laneYs) this.time.delayedCall(Math.random() * 400, () => this.fx.pfx('wave', rand(200, W - 200), ly + 20, { scale: 2, force: true, depth: 9 }));
        for (const s of this.soldiers) {
          if (s.mode !== 'march' || s.fallen || Math.abs(s.d - boss.d) > 500) continue;
          s.d = Math.min(this.pathLen, s.d + 220); this.army.hurt(s, this.army.maxHp(s) * 0.15, boss); n++;
        }
        for (let i = 0; i < 5; i++) { const m = this.spawnEnemy('snake'); m.d = Math.max(0, boss.d - 20 - i * 24); }
        this.cameras.main.shake(400, 0.008);
        this.feed(`${boss.name}: Hồng Thủy cuốn ${n} chiến sĩ, rắn tràn ra!`, '#7ad0ff');
        break;
      }
      default: { // darkbolt
        for (const s of this.army.frontline(30).sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(this.wave / 10))) {
          this.fx.lightning(boss.x, boss.y - 60, s.sprite.x, s.sprite.y - 20, 0xff3a3a);
          this.fx.pfx('strike', s.sprite.x, s.sprite.y + 2, { scale: 1, force: true, speed: 1.8 });
          this.army.hurt(s, this.army.maxHp(s) * 0.7, boss);
          n++;
        }
        if (n) this.feed(`${boss.name}: Hắc Lôi đánh trọng thương ${n} chiến sĩ!`, '#ff8080');
      }
    }
  }

  bossSkillLabel(boss, name) {
    const t = htext(this, boss.x, boss.y - boss.sprite.displayHeight - 10, name.toUpperCase(), 30, '#ffb0a0', { stroke: '#3a0606' }).setOrigin(0.5, 1).setDepth(29);
    this.tweens.add({ targets: t, y: t.y - 50, duration: 1100, ease: 'Cubic.Out' });
    this.tweens.add({ targets: t, alpha: 0, duration: 300, delay: 900, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------------------------ hero ultimates (stamina full)
  heroUlt(h) {
    const def = HEROES[h.type], ult = HERO_ULTS[h.type];
    const range = this.heroRange(h) * 1.4;
    const x = h.slot.x, y = h.slot.y;
    const inRange = this.enemiesNear(x, y, range);
    if (!inRange.length && def.kind !== 'heal') return false;
    h.stamina = 0;
    this.stats.skillsCast++;
    const owner = h.owner;
    if (owner) owner.skills = (owner.skills || 0) + 1;
    const dmg = m => this.heroDamage(h) * m * HERO_SKILL.mult;
    const hitAll = (list, m) => { for (const e of list) this.damage(e, dmg(m), owner); };
    h.sprite.play(this.anim(h.key, 'attack'));
    h.sprite.once('animationcomplete', () => { if (h.sprite.active) h.sprite.play(this.anim(h.key, 'idle')); });
    // stamina skills are routine: effect only, no cut-in (cut-ins are for gift ultimates and bosses)
    void ult;
    // skills are meant to matter against a boss: a fixed share of its max HP on top of the hits
    for (const b of inRange) {
      if (!b.boss || !b.alive) continue;
      this.damage(b, b.maxHp * HERO_SKILL.bossPct, owner, { force: true, pierce: true });
      this.fx.pfx('crit', b.x, b.y - 20, { scale: 2, force: true });
    }
    this.fx.halo(x, y - 20, HERO_FX[def.kind], 2, 400);
    const pickN = n => [...inRange].sort((a, b) => b.d - a.d).slice(0, n);
    switch (def.kind) {
      case 'arrow':
        for (const e of pickN(8)) this.fireProjectile(x, y - 30, e, 'fx_arrow', 2.6, 1300, null, t => { this.damage(t, dmg(3), owner); this.fx.pfx('hitspark', t.x, t.y - 4, { scale: 1 }); }, true);
        this.sfx.play('arrowRain');
        break;
      case 'bolt':
        for (const e of pickN(4)) this.fireProjectile(x, y - 30, e, 'fx_bolt', 3, 1700, null, t => { this.damage(t, dmg(5), owner); this.fx.pfx('crit', t.x, t.y + 4, { scale: 1 }); }, true, 'white');
        this.sfx.play('volley');
        break;
      case 'fire': {
        const t = pickN(1)[0];
        this.fx.pfx('boom', t.x, t.y + 20, { scale: 2, force: true, speed: 1.4 });
        this.time.delayedCall(150, () => { hitAll(this.enemiesNear(t.x, t.y, 160), 6); this.cameras.main.shake(200, 0.006); this.sfx.play('explode'); });
        break;
      }
      case 'ice':
        this.fx.pfx('frostnova', x, y + 34, { scale: 1, force: true, speed: 1.3 });
        for (const e of inRange) { e.frozenUntil = this.time.now + 3000; e.sprite.setTint(0x9be7ff); this.damage(e, dmg(2), owner); }
        this.sfx.play('freeze');
        break;
      case 'chain':
        for (const e of pickN(4)) { this.fx.pfx('strike', e.x, e.y + 18, { scale: 1, force: true, speed: 1.6 }); this.damage(e, dmg(5), owner); }
        this.sfx.play('thunder');
        break;
      case 'spin':
        this.fx.pfx('slam', x, y + 36, { scale: 2, force: true, speed: 1.3 });
        for (const e of inRange) { this.damage(e, dmg(5), owner); if (!e.boss) e.stunUntil = this.time.now + 1500; }
        this.cameras.main.shake(220, 0.006);
        this.sfx.play('explode');
        break;
      case 'heal':
        this.citadel = Math.min(CITADEL_MAX_HP, this.citadel + 4);
        this.fx.pfx('healaoe', x, y + 36, { scale: 2, force: true });
        for (const s of this.soldiers) if (s.mode === 'march' && !s.fallen && Math.abs(s.sprite.x - x) < 320 && Math.abs(s.sprite.y - y) < 320) this.army.heal(s, this.army.maxHp(s) * 0.5);
        this.sfx.play('heal');
        break;
      case 'cannon':
        pickN(5).forEach((e, i) => this.time.delayedCall(i * 140, () => {
          if (!e.alive) return;
          this.fx.pfx('boom', e.x, e.y + 16, { scale: 1, force: true, speed: 1.6 });
          hitAll(this.enemiesNear(e.x, e.y, 110), 4);
          this.sfx.play('cannon');
        }));
        this.cameras.main.shake(300, 0.006);
        break;
    }
    return true;
  }

  startWave(n) {
    if (n === 1) this.roundStartedAt = this.time.now;
    this.wave = n;
    this.waveStartedAt = this.time.now;
    const types = ENEMY_UNLOCKS.filter(([w]) => n >= w).map(([, t]) => t);
    // bigger crowds get bigger waves
    const count = this.waveCount();
    this.spawnGap = clamp(21 / count, 0.3, 0.9); // a wave pours out over ~20 s whatever its size
    this.spawnQueue = [];
    // weighted mix: the 6 newest types are the core of the wave, older ones fill in, heavies (300+ HP) stay rare.
    // (it used to be 35% "newest type", which made level 10 a parade of Bạch Hầu Quỷ that one-shot every guard)
    const weights = types.map((t, i) => (i >= types.length - 6 ? 3 : 1) * (ENEMIES[t].hp >= 300 ? 0.3 : 1));
    const wsum = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < count; i++) {
      let r = Math.random() * wsum, k = 0;
      while (k < types.length - 1 && (r -= weights[k]) > 0) k++;
      this.spawnQueue.push(types[k]);
    }
    this.spawnTimer = 0;
    this.bossPending = n % BOSS_EVERY === 0;
    this.army.onWaveStart();
    const twist = this.bossPending ? null : this.director.applyTwist(n, types);
    if (!twist) this.director.twist = null;
    const wl = `MÀN ${this.level} · WAVE ${this.waveInLevel()}`;
    this.announce(this.bossPending ? `${wl}\nBOSS XUẤT HIỆN!` : twist ? `${wl}\n${twist.name}` : wl, this.bossPending ? '#ff8080' : twist ? '#ffd27a' : '#ffffff', 72);
    if (twist) this.feed(`Diễn biến: ${twist.name.toLowerCase()} — ${twist.desc}`, '#ffd27a');
    // war drums + a shockwave rolling out of the gate
    this.sfx.play('wave');
    this.fx.shockwave(W / 2, CITADEL_Y + 70, 0xffd94a, 420, 700, 8);
    this.fx.halo(this.pathPts[0].x, MAP_TOP + 30, 'purple', 3, 700);
    this.fx.pfx('portal', Math.max(110, this.pathPts[0].x), MAP_TOP + 70, { scale: 1, force: true, depth: 3 });
    if (n > this.record) {
      this.record = n;
      try { localStorage.setItem('record', String(n)); } catch { /* storage unavailable */ }
    }
  }

  makeEnemy(def, sprite, extra) {
    if (!this.textures.exists(sprite) && def.fallback) sprite = def.fallback;
    const s = this.add.sprite(0, 0, sprite).setScale(def.scale).setOrigin(0.5, 0.9).setDepth(extra.boss ? 8 : 7);
    const walk = this.anim(sprite);
    if (walk) s.play(walk); else this.tweens.add({ targets: s, angle: { from: -6, to: 6 }, duration: 160, yoyo: true, repeat: -1 });
    const shadow = this.add.image(0, 0, 'shadow').setDepth(4).setScale(s.displayWidth / 64 * 0.9, Math.max(0.6, s.displayWidth / 150));
    const e = { def, d: 0, x: 0, y: 0, sprite: s, shadow, alive: true, boss: false, slowUntil: 0, frozenUntil: 0, armor: def.armor || 0, dmg: def.dmg, hitAt: 0, shieldUntil: this.time.now + ARMY.spawnShieldMs, ...extra };
    // fade in out of the portal
    s.setAlpha(0); shadow.setAlpha(0);
    this.tweens.add({ targets: [s, shadow], alpha: 1, duration: 350 });
    this.enemies.push(e);
    return e;
  }

  spawnEnemy(type) {
    const def = ENEMIES[type];
    const hp = def.hp * this.waveScale() * this.difficultyMult() * this.stageHp();
    const e = this.makeEnemy(def, def.sprite, { type, hp, maxHp: hp, speed: def.speed * ENEMY_SPEED * this.stageSpeed() * rand(0.92, 1.08) });
    this.director.onSpawn(e);
    return e;
  }

  spawnBoss(pickIdx) {
    const idx = Math.floor(Math.max(0, this.wave - 1) / BOSS_EVERY);
    const def = BOSSES[Number.isInteger(pickIdx) && BOSSES[pickIdx] ? pickIdx : idx % BOSSES.length];
    const hp = def.hp * (1 + 0.45 * idx) * this.difficultyMult() * (1 + clamp((this.soldiers.length - CROWD.ref / 2) * CROWD.bossPerGuard, 0, CROWD.bossMax)) * this.stageHp();
    const e = this.makeEnemy(def, def.sprite, { type: 'boss', name: def.name, hp, maxHp: hp, speed: def.speed * ENEMY_SPEED, armor: 0.1, boss: true });
    this.fx.glow(e.sprite, 0xff3a3a, 3);
    this.timers.bossSkill = this.time.now + 5000;
    // boss entrance: the sky darkens, red pulse around the screen, roar + gong
    this.cameras.main.shake(450, 0.007);
    this.fx.screenTint(0x000000, 0.45, 900);
    this.fx.edgeFlash(0xff2a2a, 0.9, 1200);
    this.time.delayedCall(600, () => this.fx.edgeFlash(0xff2a2a, 0.6, 900));
    this.fx.shockwave(this.pathPts[0].x, MAP_TOP + 40, 0xff3a3a, 360, 800, 12);
    this.fx.pfx('darkboom', Math.max(160, this.pathPts[0].x), MAP_TOP + 240, { scale: 2, force: true, depth: 12 });
    this.sfx.play('boss');
    this.announce(`${def.name.toUpperCase()} ĐÃ ĐẾN!\nThả tim nạp Nỏ Thần!`, '#ff6060', 64);
    this.urgent.start(e);
    return e;
  }

  damage(e, amount, v, opts = {}) {
    if (!e.alive) return 0;
    if (e.shieldUntil > this.time.now && !opts.force) return 0; // just out of the rift
    let a = amount * (1 - (opts.pierce ? 0 : e.armor));
    if (e.frozenUntil > this.time.now) a *= 1.15;
    a = Math.min(a, e.hp);
    e.hp -= a;
    if (v) v.round.dmg += a;
    e.sprite.setTintFill(0xffffff);
    e.flashUntil = this.time.now + 60;
    e.hitAt = this.time.now; // drives the squash in updateEnemies
    if (e.boss) this.director.checkBoss(e);
    if (e.hp <= 0.01) this.kill(e, v);
    return a;
  }

  kill(e, v) {
    e.alive = false;
    this.stats.kills++;
    if (e.boss) this.stats.bossKills++;
    if (v) v.kills = (v.kills || 0) + 1;
    if (e.flingFrom && !e.boss) flingCorpse(this, e);
    else if (e.boss) this.fx.pfx('darkboom', e.x, e.y + 20, { scale: 2, force: true, speed: 1.3 });
    else this.fx.pfx('poof', e.x, e.y + 18, { scale: e.type === 'charger' || e.type === 'golem' ? 2 : 1, every: 45, speed: 1.4 });
    this.fx.death(e.x, e.y - 20, e.boss || e.type === 'charger');
    if (!e.boss && (e.maxHp > 150 || Math.random() < 0.18)) this.fx.pfx('coindrop', e.x, e.y + 20, { scale: 1, every: 220, speed: 1.3 });
    this.fx.scorch(e.x, e.y + 18, e.boss ? 2.2 : 0.7);
    this.sfx.play(e.boss ? 'bossDeath' : 'kill');
    if (!e.boss && !e.flingFrom && e.sprite.active && this.enemies.length < 120) {
      // death squash: flash white, pop up, splat flat and fade (the sprite leaves the enemy list right away)
      const sp = e.sprite, sx = sp.scaleX, sy = sp.scaleY;
      sp.anims.pause(); sp.setTintFill(0xffffff).setDepth(6.9);
      this.tweens.add({ targets: sp, y: sp.y - 14, scaleX: sx * 0.85, scaleY: sy * 1.2, duration: 80, ease: 'Quad.Out',
        onComplete: () => this.tweens.add({ targets: sp, y: sp.y + 16, scaleX: sx * 1.5, scaleY: sy * 0.18, alpha: 0, duration: 200, ease: 'Quad.In', onComplete: () => sp.destroy() }) });
    } else e.sprite.destroy();
    e.shadow.destroy();
    e.ice?.destroy();
    if (v) { v.round.kills++; this.addXp(v, XP.kill); }
    if (e.boss) {
      this.slowUntil = this.time.now + 900;
      this.cameras.main.shake(600, 0.012);
      this.cameras.main.flash(300, 255, 240, 200);
      this.fx.coinBurst(e.x, e.y - 40, 60);
      this.fx.beam(e.x, e.y + 20, 'gold', 900);
      this.fx.shockwave(e.x, e.y + 10, 0xffd94a, 480, 900, 14);
      this.fx.debris(e.x, e.y, 30);
      this.fx.edgeFlash(0xffd94a, 0.8, 1200);
      this.time.delayedCall(500, () => this.fx.fireworks(6));
      if (v) {
        v.round.bossKills++;
        this.addXp(v, XP.bossLastHit);
        this.announce(`${v.name}\nhạ gục ${e.name}!`, '#ffd94a', 66);
        this.say(v, `hạ gục ${e.name}! +${XP.bossLastHit} XP`, 'ok');
      } else this.announce(`${e.name} đã bị tiêu diệt!`, '#ffd94a', 60);
      this.feed(`${v ? v.name : 'Cả làng'} hạ gục ${e.name}`, '#ffd94a');
      for (let i = 0; i < 10; i++) this.time.delayedCall(i * 70, () => this.fx.explode(e.x + rand(-90, 90), e.y + rand(-100, 30), 1.4));
    } else if (v && Math.random() < 0.08) {
      this.feed(`${v.name} hạ gục ${this.enemyName(e)}!`);
    }
    this.director.onKill(e, v);
    if (e === this.event?.charger) {
      this.announce(`Đã chặn Voi Quỷ!${v ? `\n${v.name}` : ''}`, '#9fe1cb', 56);
      if (v) this.addXp(v, 30);
    }
  }

  enemyName(e) {
    return e.boss ? e.name : ENEMIES[e.type]?.name || 'giặc';
  }

  enemiesNear(x, y, r) { return this.enemies.filter(e => e.alive && Phaser.Math.Distance.Between(x, y, e.x, e.y) <= r); }

  nearestEnemy(x, y, r, exclude) {
    let best = null, bd = r;
    for (const e of this.enemies) {
      if (!e.alive || e === exclude) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  firstEnemyInRange(x, y, r) {
    let best = null;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) <= r && (!best || e.d > best.d)) best = e;
    }
    return best;
  }

  splash(x, y, r, dmg, v) { for (const e of this.enemiesNear(x, y, r)) this.damage(e, dmg, v); }

  // ------------------------------------------------------------------ projectiles
  fireProjectile(x, y, target, key, scale, speed, tint, onHit, rotate = false, trail = null) {
    if (this.projectiles.length > 280) { onHit(target); return; }
    const sprite = this.add.sprite(x, y, key).setScale(scale).setDepth(8);
    const a = this.anim(key);
    if (a) sprite.play(a);
    if (tint) sprite.setTint(tint);
    this.projectiles.push({ sprite, target, speed, onHit, rotate, trail, tx: target.x, ty: target.y });
  }

  // ------------------------------------------------------------------ Nỏ Thần
  noThanMax() { return NO_THAN_BASE + NO_THAN_PER_VIEWER * this.soldiers.length; }

  fireNoThan(v) {
    this.announce(`NỎ THẦN BẮN!${v ? `\n${v.name} thả tim cuối` : ''}`, '#ff9ab8', 64);
    this.cameras.main.flash(220, 255, 230, 160);
    this.fx.beam(W / 2, CITADEL_Y + 40, 'gold', 1200);
    this.fx.edgeFlash(0xff7aa8, 0.6, 700);
    this.sfx.play('volley');
    this.laneYs.forEach((y, i) => {
      const fromLeft = i % 2 === 0;
      const b = this.add.image(fromLeft ? -80 : W + 80, y, 'fx_bigbolt').setScale(3).setDepth(11).setFlipX(!fromLeft);
      this.fx.glow(b, 0xffd94a, 4);
      const tw = this.tweens.add({
        targets: b, x: fromLeft ? W + 100 : -100, duration: 650, delay: i * 90,
        onUpdate: () => this.fx.trail(b.x - (fromLeft ? 60 : -60), y, 'gold'),
        onComplete: () => b.destroy(),
      });
      void tw;
    });
    this.time.delayedCall(300, () => {
      for (const e of [...this.enemies]) {
        if (!e.alive) continue;
        this.fx.hit(e.x, e.y - 14, 'gold');
        this.damage(e, e.boss ? e.maxHp * 0.07 : e.maxHp * 0.45 + 40 * this.waveScale(), v, { pierce: true });
      }
    });
    if (v) this.addXp(v, 15);
  }

  // ------------------------------------------------------------------ puzzles & skills
  isAnswer(raw) {
    const p = this.puzzle, f = foldAnswer(raw);
    return Boolean(f) && [p.answer, ...(p.accept || [])].some(a => foldAnswer(a) === f);
  }

  startPuzzle(p) {
    if (this.state !== 'play') return;
    const recruitOnly = Math.random() < 0.25 && [...this.viewers.values()].some(v => v.rank <= 1 && v.soldier);
    const skill = pick(SKILLS);
    this.puzzle = { ...p, skill, recruitOnly, until: this.time.now + (p.seconds || PUZZLE_SECONDS) * 1000, solvedBy: null };
    this.pz.title.setText(`${p.title} → ${skill.name}${recruitOnly ? '  ·  CHỈ TÂN BINH' : ''}`);
    this.pz.q.setText(p.q);
    // long questions (proverbs, riddles, trivia) wrap and shrink to fit the scroll
    this.pz.q.setStyle({ wordWrap: { width: 800, useAdvancedWrap: true }, align: 'center' });
    this.pz.q.setFontSize(p.long ? (p.q.length > 40 ? 32 : 38) : 54);
    this.pz.hint.setText(`${p.hint} · ${p.seconds || PUZZLE_SECONDS}s`);
    this.pzBox.setVisible(true).setScale(0.5);
    this.tweens.add({ targets: this.pzBox, scale: 1, duration: 250, ease: 'Back.Out' });
    this.sfx.play('gong');
  }

  solvePuzzle(v) {
    const p = this.puzzle;
    if (p.recruitOnly && v.rank > 1) { this.say(v, 'đúng! (câu này dành cho tân binh)', 'cmd'); return true; }
    p.solvedBy = v;
    p.solvedAt = this.time.now;
    v.round.puzzles++;
    this.addXp(v, XP.puzzle);
    const mult = this.enemies.some(e => e.boss) ? 2 : 1;
    this.say(v, `${p.answer} ✓  → ${p.skill.name}${mult > 1 ? ' x2' : ''}!`, 'ok');
    this.announce(`${v.name} giải đúng!\n${p.skill.name.toUpperCase()}${mult > 1 ? ' x2' : ''}!`, '#ffd94a', 60);
    this.pz.hint.setText(`${v.name} giải đúng! Đáp án: ${p.answer}`);
    if (v.soldier) this.fx.beam(v.soldier.sprite.x, v.soldier.sprite.y, 'gold', 500);
    this.fx.confetti(this.pzBox.x, this.pzBox.y - 60, 70);
    this.sfx.play('solve');
    this.castSkill(p.skill.id, v, mult);
    this.time.delayedCall(3000, () => { if (this.puzzle === p) this.endPuzzle(); });
    return true;
  }

  endPuzzle() { this.puzzle = null; this.pzBox.setVisible(false); }

  castSkill(id, v, mult = 1) {
    const ws = this.waveScale() * this.difficultyMult();
    switch (id) {
      case 'arrows':
        this.sfx.play('arrowRain');
        for (let i = 0; i < 46; i++) {
          const x = rand(40, W - 40), y = rand(MAP_TOP + 40, CITADEL_Y - 40);
          // arrows fall on a diagonal; the sprite angle matches the flight direction (dx=+120, dy=+420)
          const a = this.add.image(x - 120, y - 420, 'fx_arrow').setScale(2.4).setAngle(Phaser.Math.RadToDeg(Math.atan2(420, 120))).setDepth(11);
          this.tweens.add({ targets: a, x, y, duration: 360, delay: i * 16, onComplete: () => { this.fx.spark(x, y, 'gold', 3); a.destroy(); } });
        }
        this.time.delayedCall(480, () => { for (const e of [...this.enemies]) this.damage(e, (e.boss ? 150 : 70) * ws * mult, v, { pierce: true }); });
        break;
      case 'thunder': {
        const targets = [...this.enemies].filter(e => e.alive).sort((a, b) => (b.boss - a.boss) || b.maxHp - a.maxHp).slice(0, 3);
        for (const e of targets) {
          if (!this.fx.pfx('strike', e.x, e.y + 18, { scale: 2, force: true, speed: 1.5 })) this.fx.lightning(e.x + rand(-40, 40), MAP_TOP, e.x, e.y - 20, 0xffe14a);
          this.fx.explode(e.x, e.y - 20, 1.6, 'gold');
          this.damage(e, e.boss ? e.maxHp * 0.12 * mult : e.maxHp * mult, v, { pierce: true });
        }
        this.cameras.main.flash(160, 230, 220, 255);
        this.fx.edgeFlash(0xfff2a0, 0.6, 400);
        this.sfx.play('thunder');
        this.time.delayedCall(80, () => this.sfx.play('explode'));
        break;
      }
      case 'freeze':
        this.fx.snow(true);
        this.laneYs.forEach((ly, i) => this.time.delayedCall(i * 90, () => this.fx.pfx('frostnova', i % 2 ? 360 : 720, ly + 30, { scale: 2, force: true, speed: 1.3, depth: 9 })));
        for (const e of this.enemies) {
          e.frozenUntil = this.time.now + 5000 * mult;
          e.sprite.setTint(0x9be7ff);
          if (!e.ice) e.ice = this.add.image(e.x, e.y, 'fx_ice').setScale(3).setDepth(9).setAlpha(0.85);
        }
        this.cameras.main.flash(220, 160, 220, 255);
        this.fx.edgeFlash(0x9be7ff, 0.9, 2500);
        this.fx.screenTint(0x9be7ff, 0.18, 2500);
        this.sfx.play('freeze');
        break;
      case 'heal':
        this.citadel = Math.min(CITADEL_MAX_HP, this.citadel + 25 * mult);
        if (!this.fx.pfx('healaoe', W / 2, CITADEL_Y + 110, { scale: 2, force: true, depth: 9 })) this.fx.beam(W / 2, CITADEL_Y + 60, 'green', 600);
        this.fx.edgeFlash(0x7dff9a, 0.5, 800);
        this.sfx.play('heal');
        for (let i = 0; i < 8; i++) this.time.delayedCall(i * 80, () => this.fx.spark(rand(200, 880), CITADEL_Y + rand(20, 160), 'green', 8));
        break;
      case 'crossbow':
        this.fireNoThan(v);
        break;
      case 'meteor': {
        const live = this.enemies.filter(e => e.alive).sort((a, b) => b.maxHp - a.maxHp).slice(0, 7);
        live.forEach((e, i) => this.time.delayedCall(i * 160, () => {
          this.fx.pfx('meteor', e.x - 40, e.y + 40, { scale: 1, force: true, depth: 11, speed: 1.6 });
          this.time.delayedCall(600, () => { for (const o of this.enemiesNear(e.x, e.y, 120)) this.damage(o, (o.boss ? 120 : 90) * ws * mult, v, { pierce: true }); this.cameras.main.shake(140, 0.006); this.sfx.play('explode'); });
        }));
        this.fx.edgeFlash(0xff8a2a, 0.7, 900);
        break;
      }
      case 'rage':
        this.army.rageUntil = this.time.now + 12000 * mult;
        for (const s of this.soldiers) if (s.mode === 'march' && !s.fallen) this.fx.pfx('collect', s.sprite.x, s.sprite.y + 4, { scale: 1, every: 20 });
        this.fx.edgeFlash(0xffb03a, 0.8, 1000);
        this.announce('KHÍ THẾ NGÚT TRỜI!\nChiến sĩ x1.6 sát thương', '#ffb03a', 52);
        this.sfx.play('rankUp');
        break;
      case 'revive': {
        let n = 0;
        for (const s of this.soldiers) { if (s.fallen) { this.army.revive(s); n++; } else if (s.mode === 'march') this.army.heal(s, this.army.maxHp(s)); }
        this.fx.pfx('healaoe', W / 2, CITADEL_Y + 100, { scale: 2, force: true, depth: 9 });
        this.fx.edgeFlash(0x7dff9a, 0.7, 900);
        this.feed(`Hồi sinh toàn quân: ${n} chiến sĩ trở lại!`, '#9fe1cb');
        this.sfx.play('revive');
        break;
      }
    }
  }

  // ------------------------------------------------------------------ random events
  startEvent(id) {
    if (this.state !== 'play') return;
    if (this.event) this.endEvent();
    if (!EVENTS.includes(id)) id = pick(EVENTS);
    const now = this.time.now;
    if (this.director.startEvent(id)) return;
    if (id === 'rain') {
      this.event = { id, label: 'Mưa lớn — quái chậm lại', until: now + 20000 };
      this.announce('MƯA LỚN!\nQuái chậm lại, lửa yếu đi', '#9fd3ff', 52);
    } else if (id === 'charge') {
      const charger = this.spawnEnemy('charger');
      charger.hp = charger.maxHp = ENEMIES.charger.hp * this.waveScale() * this.difficultyMult();
      this.fx.glow(charger.sprite, 0x5affb0, 3);
      this.event = { id, label: 'Voi Quỷ lao tới — thả tim nạp Nỏ Thần!', until: now + 25000, charger };
      this.announce('VOI QUỶ LAO TỚI!\nThả tim nạp Nỏ Thần!', '#ff9060', 56);
    } else if (id === 'treasure') {
      const tagText = htext(this, 0, -66, 'KHO BÁU', 18, '#fff2dc', { stroke: '#3a0606' }).setOrigin(0.5);
      const chest = this.add.container(-80, MAP_TOP + 64, [
        this.add.image(0, 0, 'px_soft').setTint(0xffd94a).setBlendMode('ADD').setScale(2),
        this.add.image(0, 0, 'chest').setScale(3),
        panel(this, 'seal', 0, -66, tagText.width + 30, 36), tagText,
      ]).setDepth(28);
      this.tweens.add({ targets: chest, x: W + 80, duration: 15000 });
      this.event = { id, label: 'Kho báu — 10 người gõ "cướp" đầu tiên', until: now + 15000, claimed: new Set(), chest };
      this.announce('XE KHO BÁU!\n10 người gõ "cướp" đầu tiên', '#ffd94a', 52);
    }
  }

  endEvent() {
    const ev = this.event;
    if (!ev) return;
    if (ev.chest) ev.chest.destroy();
    this.director.end(ev);
    this.event = null;
  }

  // ------------------------------------------------------------------ game over / MVP
  gameOver(manual = false) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.endPuzzle();
    this.endEvent();
    // round report for the admin dashboard
    const vsAll = [...this.viewers.values()];
    this.net.send({
      type: 'roundEnd',
      round: {
        wave: this.wave, durationSec: Math.round((this.time.now - (this.roundStartedAt || this.time.now)) / 1000),
        kills: vsAll.reduce((a, v) => a + v.round.kills, 0), bossKills: vsAll.reduce((a, v) => a + v.round.bossKills, 0), endedAt: Date.now(),
        top: vsAll.filter(v => v.round.dmg > 0).sort((a, b) => b.round.dmg - a.round.dmg).slice(0, 10)
          .map(v => ({ id: v.id, name: v.name, dmg: Math.round(v.round.dmg), kills: v.round.kills })),
      },
    });
    if (!manual) {
      this.sfx.play('gameOver');
      this.fx.edgeFlash(0xff2a2a, 1, 1500);
      this.fx.debris(W / 2, CITADEL_Y + 60, 40);
      this.cameras.main.shake(700, 0.012);
    }
    this.sfx.setMood('calm');
    const vs = [...this.viewers.values()];
    const best = (key, filter = () => true) => vs.filter(filter).filter(v => v.round[key] > 0).sort((a, b) => b.round[key] - a.round[key])[0];
    const rows = [
      ['ic_sword', 'Sát thương cao nhất', best('dmg'), v => fmt(v.round.dmg)],
      ['ic_gift', 'Mạnh thường quân', best('gifts'), v => `${fmt(v.round.gifts)} xu`],
      ['ic_book', 'Trí tướng', best('puzzles'), v => `${v.round.puzzles} câu đố`],
      ['ic_cross', 'Cứu tinh', best('revives'), v => `${v.round.revives} lần cứu`],
      ['ic_sprout', 'Tân binh xuất sắc', best('dmg', v => v.isNew), v => fmt(v.round.dmg)],
    ];
    const ink = '#2a170e';
    const parts = [this.add.rectangle(0, 0, W, H, 0x0a0604, 0.82).setOrigin(0)];
    parts.push(panel(this, 'paper', W / 2, 990, 900, 1180));
    parts.push(this.add.image(W / 2 - 470, 990, 'ui_rod').setScale(2.4, 14.5));
    parts.push(this.add.image(W / 2 + 470, 990, 'ui_rod').setScale(2.4, 14.5));
    parts.push(banner(this, W / 2, 400, this.victory ? 'ĐẠI THẮNG!' : manual ? 'VÁN MỚI' : 'THÀNH ĐÃ THẤT THỦ!', 46));
    parts.push(ptext(this, W / 2, 500, `Màn ${this.level} · ${this.wave} wave  ·  Kỷ lục ${this.record}`, 40, '#7a1a12', { shadow: false }).setOrigin(0.5));
    parts.push(this.add.rectangle(W / 2, 540, 760, 4, 0xa8845a).setOrigin(0.5));
    parts.push(ptext(this, W / 2, 582, 'ANH HÙNG CỦA VÁN', 40, ink, { shadow: false }).setOrigin(0.5));
    rows.forEach(([icon, label, v, val], i) => {
      const y = 660 + i * 104;
      parts.push(this.add.image(170, y + 22, icon).setScale(3.4));
      parts.push(ptext(this, 230, y - 4, label, 32, '#7a5a3a', { shadow: false }));
      parts.push(this.add.text(230, y + 26, v ? v.name.toUpperCase() : '—', { fontFamily: HEAD, fontSize: '30px', testString: TEST, padding: { top: 6 }, color: v ? '#8a1a12' : '#a89878' }));
      if (v) parts.push(ptext(this, 910, y + 22, val(v), 36, ink, { shadow: false }).setOrigin(1, 0.5));
    });
    parts.push(this.add.rectangle(W / 2, 1200, 760, 4, 0xa8845a).setOrigin(0.5));
    parts.push(this.add.image(170, 1250, 'ic_crown').setScale(3.4));
    parts.push(ptext(this, 230, 1228, 'TOP HÔM NAY', 40, ink, { shadow: false }));
    const top = this.boards.topWarriors(5).map(p => ({ ...p, name: p.name }));
    if (!top.length) parts.push(ptext(this, 230, 1290, 'Chưa có', 34, '#7a5a3a', { shadow: false }));
    top.forEach((p, i) => {
      parts.push(ptext(this, 230, 1286 + i * 46, `${i + 1}. ${clean(p.name)}`, 36, i === 0 ? '#8a1a12' : ink, { shadow: false }));
      parts.push(ptext(this, 910, 1286 + i * 46, `${fmt(p.value)} XP`, 36, '#7a5a3a', { shadow: false }).setOrigin(1, 0));
    });
    const cd = ptext(this, 0, 0, '', 36, '#ffe58a').setOrigin(0.5);
    parts.push(this.add.container(W / 2, 1680, [panel(this, 'dark', 0, 0, 760, 64), cd]));
    const board = this.add.container(0, 0, parts).setDepth(60);
    let left = 12;
    const tick = () => {
      cd.setText(`Ván mới sau ${left}s · gõ "vào" để giữ chỗ`);
      if (left-- <= 0) { board.destroy(); this.resetRound(); return; }
      this.time.delayedCall(1000, tick);
    };
    tick();
  }

  resetRound() {
    for (const e of this.enemies) { e.sprite.destroy(); e.shadow.destroy(); e.ice?.destroy(); }
    for (const p of this.projectiles) p.sprite.destroy();
    for (const s of this.summons) s.sprite.destroy();
    for (const h of [...this.heroes]) this.removeHero(h);
    this.enemies = []; this.projectiles = []; this.summons = [];
    this.army.goHome();
    this.urgent.stop(true);
    this.ambient.clear();
    for (const v of this.viewers.values()) v.round = { dmg: 0, kills: 0, gifts: 0, puzzles: 0, revives: 0, bossKills: 0 };
    this.citadel = CITADEL_MAX_HP;
    this.noThan = 0;
    this.spawnQueue = [];
    this.startRally();
  }

  // ------------------------------------------------------------------ main loop
  update(time, deltaMs) {
    const now = time;
    let dt = Math.min(0.05, deltaMs / 1000);
    if (now < this.slowUntil) dt *= 0.3;
    this.bubbles.update(now);
    this.cutin.update(now);
    this.talk.update(now);
    this.ambient.update(now);
    this.urgent.update(now);
    this.ult.update(now);
    if (this.state === 'play') this.director.update(now);
    this.siege.update(now);
    this.army.drawBars(now);
    this.drawHud(now);
    this.updateTimers(now);
    this.boards.update(now);
    if (this.paused || this.state === 'over') return;

    if (this.state === 'rally') {
      const left = Math.ceil((this.rallyUntil - now) / 1000);
      this.rallyBox.setVisible(true);
      this.rallyCount.setText(`Bắt đầu sau ${left}s`);
      if (left <= 3 && !this.countdownShown) { this.countdownShown = true; this.fx.pfx('countdown', W / 2, 640, { scale: 3, force: true, depth: 56 }); }
      if (now >= this.rallyUntil) {
        this.rallyBox.setVisible(false);
        this.state = 'play';
        this.timers.nextEvent = now + rand(...EVENT_EVERY) * 1000;
        this.timers.nextPuzzle = now + 30000;
        this.startWave(this.wave + 1);
      }
    }

    if (this.state === 'play') this.updateWaves(now, dt);
    this.updateEnemies(now, dt);
    this.updateHeroes(dt);
    this.updateSoldiers(now, dt);
    this.updateProjectiles(dt);
    this.updateSummons(now, dt);
    this.updateCombo(now);
    this.drawWorldFx(now, dt);
    this.fx.update(dt);
    this.sfx.setMood(this.state !== 'play' ? 'calm' : this.enemies.some(e => e.boss) ? 'boss' : 'battle');
  }

  updateWaves(now, dt) {
    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const e = this.spawnEnemy(this.spawnQueue.shift());
        this.fx.puff(this.pathPts[0].x, tileY(0), 3);
        void e;
        this.spawnTimer = this.spawnGap || 0.6;
      }
    } else if (this.bossPending) {
      this.bossPending = false;
      this.spawnBoss();
    } else {
      const elapsed = (now - this.waveStartedAt) / 1000;
      if (this.wave % WAVES_PER_LEVEL === 0) { if (this.enemies.length === 0 && elapsed > 3) this.finishLevel(); }
      else if ((this.enemies.length === 0 && elapsed > 4) || (elapsed > 32 && !this.enemies.some(e => e.boss))) this.startWave(this.wave + 1);
    }

    const boss = this.enemies.find(e => e.boss && e.alive);
    if (boss && now > this.timers.bossSkill) {
      this.timers.bossSkill = now + (boss.def.every || 7) * 1000;
      this.bossSkill(boss, now);
    }

    if (this.event && now > this.event.until) this.endEvent();
    if (!this.event && now > this.timers.nextEvent && !boss) {
      this.startEvent();
      this.timers.nextEvent = now + rand(...EVENT_EVERY) * 1000;
    }
    if (this.puzzle && !this.puzzle.solvedBy && now > this.puzzle.until) {
      this.pz.hint.setText(`Hết giờ! Đáp án: ${this.puzzle.answer}`);
      const p = this.puzzle;
      p.solvedBy = 'timeout';
      this.time.delayedCall(2500, () => { if (this.puzzle === p) this.endPuzzle(); });
    }
    if (!this.puzzle && now > this.timers.nextPuzzle) {
      this.startPuzzle(makePuzzle(this.wave));
      this.timers.nextPuzzle = now + rand(...PUZZLE_EVERY) * 1000;
    }
    if (this.puzzle && !this.puzzle.solvedBy) {
      const frac = clamp((this.puzzle.until - now) / ((this.puzzle.seconds || PUZZLE_SECONDS) * 1000), 0, 1);
      // incense-stick timer: 20 pixel blocks burning down
      const blocks = Math.ceil(frac * 20);
      const g = this.pz.bar.clear();
      for (let i = 0; i < 20; i++) {
        g.fillStyle(i < blocks ? (frac > 0.3 ? 0x8a1a12 : 0xc42a26) : 0xd8c094, 1).fillRect(-300 + i * 30, 74, 24, 10);
      }
    }
  }

  updateEnemies(now, dt) {
    this.army.prepareBlocking();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      let sp = e.speed;
      const frozen = e.frozenUntil > now;
      let fighting = false;
      if (frozen || e.stunUntil > now) sp = 0;
      if (e.stunUntil > now) this.ambient.attach(e, 'stunned', e, () => e.alive && e.stunUntil > this.time.now, -e.sprite.displayHeight * 0.75);
      else {
        if (e.frozenUntil) { e.frozenUntil = 0; e.sprite.clearTint(); e.ice?.destroy(); e.ice = null; }
        if (e.slowUntil > now) sp *= 1 - HEROES.bangnu.slow;
        if (this.event?.id === 'rain') sp *= 0.6;
        if (e.rageUntil > now) sp *= 1.45;
        if (sp > 0) {
          const blocker = this.army.blockerFor(e);
          if (blocker) { sp = 0; fighting = true; this.army.enemyStrike(e, blocker, dt); }
        }
      }
      if (e.boss || e.def.tramples) {
        const reach = e.boss ? 70 : 54;
        // a boss kicks away at most ~3 guards a second (it used to wipe the whole column it walked through)
        e.kickCd = (e.kickCd || 0) - dt;
        if (e.kickCd <= 0) {
          for (const s of this.soldiers) {
            if (s.mode === 'march' && !s.fallen && s.sprite.visible && !s.ulting && Math.abs(s.sprite.x - e.x) < reach && Math.abs(s.sprite.y - e.y - 20) < reach) {
              this.army.launch(s, e);
              e.kickCd = e.boss ? 0.33 : 0.5;
              break;
            }
          }
        }
      }
      if (e.boss) {
        e.trampleCd = (e.trampleCd ?? 1) - dt;
        if (e.trampleCd <= 0) {
          e.trampleCd = 1;
          this.fx.pfx('landing', e.x, e.y + 24, { scale: 2, every: 600, speed: 1.4, depth: 6 });
          this.cameras.main.shake(80, 0.002);
        }
      }
      if (e.flashUntil && now > e.flashUntil) {
        e.flashUntil = 0;
        if (frozen) e.sprite.setTint(0x9be7ff); else if (e.slowUntil > now) e.sprite.setTint(0xb8e8ff); else if (e.tintHold) e.sprite.setTint(e.phase === 3 ? 0xff5a5a : 0xff9a8a); else e.sprite.clearTint();
      }
      e.d += sp * dt;
      const p = this.posAt(e.d);
      e.x = p.x; e.y = p.y;
      e.sprite.setPosition(p.x, p.y + 22);
      // hit squash: wide + short for ~120ms after a hit
      const k = Math.max(0, 1 - (now - e.hitAt) / 120);
      e.sprite.setScale(e.def.scale * (1 + 0.14 * k), e.def.scale * (1 - 0.14 * k));
      e.shadow.setPosition(p.x, p.y + 20);
      if (this.event?.id === 'rain' && Math.random() < 0.02) this.fx.splash(p.x + rand(-20, 20), p.y + 22);
      e.ice?.setPosition(p.x, p.y - 10);
      if (p.dx !== 0) e.sprite.setFlipX(p.dx < 0);
      if (sp === 0 && !fighting) e.sprite.anims.pause(); else if (e.sprite.anims.isPaused) e.sprite.anims.resume();
      if (e.d >= this.pathLen) {
        e.alive = false;
        e.sprite.destroy(); e.shadow.destroy(); e.ice?.destroy();
        if (this.shieldUntil > now) {
          this.fx.halo(W / 2, CITADEL_Y + 40, 'gold', 3, 400);
        } else {
          this.citadel -= e.boss ? e.dmg : Math.min(LEAK_DMG_MAX, e.dmg);
          this.cameras.main.shake(e.boss ? 500 : 140, e.boss ? 0.01 : 0.004);
          if (!this.fx.pfx('slam', W / 2, CITADEL_Y + 80, { scale: e.boss ? 2 : 1, every: e.boss ? 0 : 400, speed: 1.4 })) this.fx.explode(W / 2, CITADEL_Y + 70, e.boss ? 3 : 1.6);
          this.fx.debris(W / 2, CITADEL_Y + 60, e.boss ? 30 : 10);
          this.fx.edgeFlash(0xff2a2a, e.boss ? 0.9 : 0.45, 500);
          this.sfx.play('wallHit');
        }
        if (this.citadel <= 0) { this.citadel = 0; this.gameOver(); return; }
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);
  }

  updateHeroes(dt) {
    for (const h of this.heroes) {
      h.cd -= dt;
      if (h.cd > 0) continue;
      if ((h.stamina || 0) >= STAMINA.max && this.heroUlt(h)) { h.cd = 1; continue; }
      const fired = this.heroAttack(h);
      if (fired) h.stamina = Math.min(STAMINA.max, (h.stamina || 0) + (HERO_ULTS[h.type]?.perHit || 8));
      h.cd = fired ? 1 / HEROES[h.type].rate : 0.2;
    }
  }

  updateSoldiers(now, dt) { this.army.update(now, dt); }

  updateSoldiersOld(now, dt) {
    const comboMult = this.combo.mult;
    // diminishing returns: 50 soldiers ≈ full power each, 300 soldiers ≈ 40% each (total still grows)
    const crowd = Math.min(1, 7 / Math.sqrt(Math.max(1, this.soldiers.length)));
    for (const s of this.soldiers) {
      if (s.fallen) { if (now - s.fellAt > 40000) this.reviveSoldier(s); continue; }
      s.cd -= dt;
      if (s.cd > 0) continue;
      s.cd = rand(1.4, 1.9);
      const v = s.viewer;
      const x = s.sprite.x, y = s.sprite.y - 20;
      const recruit = this.isRecruit(v);
      let target;
      if (recruit && !v.firstKillDone) target = this.enemiesNear(x, y, 520).filter(e => !e.boss).sort((a, b) => a.hp - b.hp)[0];
      target = target || this.nearestEnemy(x, y, 250);
      if (!target) continue;
      const dmg = 4 * RANKS[v.rank].mult * this.waveScale() * comboMult * crowd * (recruit ? RECRUIT_DMG_MULT : 1);
      const firstKill = recruit && !v.firstKillDone && !target.boss;
      if (firstKill) v.firstKillDone = true;
      const tint = recruit ? RECRUIT_TINT : TIER_TINT[v.rank];
      this.sfx.play('orb');
      this.fireProjectile(x, y, target, 'fx_orb', 1.4, 760, tint, e => {
        if (firstKill && e.alive) {
          this.damage(e, e.hp / (1 - e.armor) + 1, v);
          this.fx.spark(e.x, e.y, 'teal', 12);
          this.say(v, `hạ gục ${this.enemyName(e)}! Chiến công đầu!`, 'recruit');
        } else this.damage(e, dmg, v);
      });
    }
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.target.alive) { p.tx = p.target.x; p.ty = p.target.y - 14; }
      const dx = p.tx - p.sprite.x, dy = p.ty - p.sprite.y;
      const dist = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (dist <= step + 4) {
        if (p.target.alive) p.onHit(p.target);
        p.done = true;
        p.sprite.destroy();
        continue;
      }
      p.sprite.x += (dx / dist) * step;
      p.sprite.y += (dy / dist) * step;
      if (p.rotate) p.sprite.setRotation(Math.atan2(dy, dx));
      if (p.trail) this.fx.trail(p.sprite.x, p.sprite.y, p.trail);
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
  }

  updateSummons(now, dt) {
    for (const s of this.summons) {
      s.d += s.dir * s.speed * dt;
      const p = this.posAt(s.d);
      s.sprite.setPosition(p.x, p.y + 10);
      if (p.dx !== 0) s.sprite.setFlipX(s.dir > 0 ? p.dx < 0 : p.dx > 0);
      if (s.trail) this.fx.trail(p.x + rand(-30, 30), p.y + rand(-20, 20), s.trail);
      for (const e of this.enemiesNear(p.x, p.y, s.radius)) {
        if ((s.hitCd.get(e) || 0) > now) continue;
        s.hitCd.set(e, now + 500);
        const dmg = e.boss ? (s.bossPct ? e.maxHp * s.bossPct : s.dmg * this.waveScale() * 2) : s.dmg * this.waveScale();
        this.damage(e, dmg, s.owner, { pierce: true });
        this.fx.explode(e.x, e.y - 10, 1.2, s.trail === 'gold' ? 'gold' : 'fire');
      }
      if (s.d <= 0 || s.d >= this.pathLen) {
        s.done = true;
        this.tweens.add({ targets: s.sprite, alpha: 0, duration: 400, onComplete: () => s.sprite.destroy() });
      }
    }
    this.summons = this.summons.filter(s => !s.done);
  }

  // combo thresholds grow with √(army/20): 150 people chatting used to hold a permanent x3-x5 on every guard
  comboSteps() {
    const k = Math.max(1, Math.sqrt(this.soldiers.length / 20));
    if (this._comboK !== k) { this._comboK = k; this._comboSteps = COMBO_STEPS.map(s => ({ n: Math.round(s.n * k), mult: s.mult })); }
    return this._comboSteps;
  }

  updateCombo(now) {
    const n = this.comboCount(now);
    const step = this.comboSteps().find(s => n >= s.n);
    if (step && (step.mult > this.combo.mult || now > this.combo.until)) {
      if (step.mult > this.combo.mult) {
        this.announce(`TẤT CẢ BẮN! x${step.mult}`, '#ffd94a', 70);
        this.fx.pfx(`combo${step.mult}`, W - 230, MAP_TOP + 130, { scale: 2, force: true, depth: 47 });
        this.cameras.main.flash(120, 255, 220, 120);
        this.fx.edgeFlash(0xffb03a, 0.7, 700);
        this.sfx.play('combo');
      }
      this.combo = { mult: step.mult, until: now + 8000 };
    } else if (!step && now > this.combo.until) {
      this.combo = { mult: 1, until: 0 };
    }
    const on = this.combo.mult > 1;
    this.comboBadge.setVisible(on);
    if (on) {
      const left = Math.max(0, Math.ceil((this.combo.until - now) / 1000));
      this.comboText.setText(`COMBO x${this.combo.mult} · ${left}s`);
      // 2-frame pixel pulse
      this.comboBadge.setScale(Math.floor(now / 250) % 2 ? 1.04 : 1);
    }
    this.hud.foes.setText(this.state === 'play' ? `Quái: ${this.enemies.length + (this.spawnQueue?.length || 0)}` : '');
  }

  drawWorldFx(now, dt) {
    const g = this.barGfx;
    g.clear();
    for (const e of this.enemies) {
      if (!e.alive || e.hp >= e.maxHp) continue;
      const w = e.boss ? 150 : 50;
      const y = e.y + 22 - e.sprite.displayHeight * 0.9 - 6;
      g.fillStyle(0x000000, 0.7).fillRect(e.x - w / 2 - 1, y - 1, w + 2, 9);
      g.fillStyle(e.boss ? 0xff2020 : 0xff5a4a, 1).fillRect(e.x - w / 2, y, w * (e.hp / e.maxHp), 7);
    }
    // team rings: red under every monster, blue under every guard in the field
    const tg = this.teamGfx;
    tg.clear();
    for (const e of this.enemies) {
      if (!e.alive || e.def.treasure) continue;
      const rw = Math.max(40, e.sprite.displayWidth * 0.75), fy = e.y + 22;
      tg.fillStyle(0xff2a2a, 0.22).fillEllipse(e.x, fy, rw, rw * 0.36);
      tg.lineStyle(3, 0xff3a3a, 0.9).strokeEllipse(e.x, fy, rw, rw * 0.36);
    }
    for (const s of this.soldiers) {
      if (s.mode !== 'march' || s.fallen || !s.sprite.visible) continue;
      const rw = Math.max(30, s.sprite.displayWidth * 0.7), fy = s.sprite.y - 2;
      tg.fillStyle(0x3aa8ff, 0.2).fillEllipse(s.sprite.x, fy, rw, rw * 0.36);
      tg.lineStyle(3, 0x4ab8ff, 0.9).strokeEllipse(s.sprite.x, fy, rw, rw * 0.36);
    }
    for (const h of this.heroes) {
      if (h.progress <= 0 || h.level >= MAX_HERO_LEVEL) continue;
      g.fillStyle(0x000000, 0.7).fillRect(h.slot.x - 30, h.slot.y - 66, 60, 6);
      g.fillStyle(0xffd94a, 1).fillRect(h.slot.x - 30, h.slot.y - 66, 60 * h.progress, 6);
    }
    this.shieldGfx.clear();
    if (this.shieldUntil > now) {
      this.shieldGfx.lineStyle(6, 0xffd94a, 0.5 + 0.3 * Math.sin(now / 150)).strokeEllipse(W / 2, CITADEL_Y + 70, 560, 220);
      this.shieldGfx.fillStyle(0xffd94a, 0.12).fillEllipse(W / 2, CITADEL_Y + 70, 560, 220);
    }
    const rg = this.rainGfx;
    rg.clear();
    if (this.event?.id === 'rain') {
      rg.lineStyle(3, 0x9fd3ff, 0.55);
      for (const d of this.rainDrops) {
        d.y += d.s * dt; d.x -= d.s * 0.15 * dt;
        if (d.y > CITADEL_Y + 200) { d.y = MAP_TOP; d.x = rand(0, W + 200); }
        rg.lineBetween(d.x, d.y, d.x + 6, d.y - 26);
      }
    }
  }

  updateTimers(now) {
    const t = this.timers;
    if (now > t.presence) {
      t.presence = now + 10000;
      for (const v of this.viewers.values()) if (now - v.lastActive < 120000 && v.soldier) this.addXp(v, XP.presence);
      for (const s of this.soldiers) if (s.key === 'soldier_new' && !this.isRecruit(s.viewer)) this.setSoldierLook(s);
    }
    if (now > t.xpFlush) {
      t.xpFlush = now + 5000;
      const list = [];
      for (const v of this.viewers.values()) if (v.pendingXp > 0) { list.push({ id: v.id, add: v.pendingXp, name: v.name }); v.pendingXp = 0; }
      if (list.length) this.net.send({ type: 'xp', list });
    }
    if (now > t.state) {
      t.state = now + 2000;
      this.net.send({
        type: 'gameState',
        state: {
          state: this.state, wave: this.wave, record: this.record, citadel: Math.ceil(this.citadel), soldiers: this.soldiers.length, viewers: this.viewers.size,
          enemies: this.enemies.length, heroes: this.heroes.length, combo: this.combo.mult, queue: this.bubbles.waiting, event: this.event?.id || '',
          paused: this.paused, golden: this.goldenUntil > now, hardcore: this.hardcore > 1,
          kills: this.stats.kills, bossKills: this.stats.bossKills, skillsCast: this.stats.skillsCast,
          soldiersAlive: this.soldiers.filter(s => !s.fallen).length, classes: this.army.classCounts(),
          twist: this.director.twist?.name || '', boss: this.enemies.find(e => e.boss && e.alive)?.name || '',
          ultBusy: !this.ult.idle(), ultQueue: [...this.viewers.values()].filter(v => v.pendingUlt > 0).length,
          enemySiege: this.state === 'play' && this.wave >= 3, puzzle: this.puzzle && !this.puzzle.solvedBy ? this.puzzle.title : '', puzzleQ: this.puzzle?.q || '', puzzleA: this.puzzle?.answer || '', level: this.level, levelName: LEVELS[this.level - 1].name,
        },
      });
    }
    if (now > t.tags) { t.tags = now + (this.state === 'play' ? 500 : 2000); this.refreshTags(); }
    // idle life in the rally: a few guards waiting at home cheer, hop or swing now and then
    if (this.state === 'rally' && now > (t.idleFx || 0)) {
      t.idleFx = now + 700;
      const home = this.soldiers.filter(s => s.mode === 'home' && !s.fallen);
      for (let i = 0; i < Math.min(2, home.length); i++) {
        const s = home[Math.floor(Math.random() * home.length)];
        if (Math.random() < 0.5) this.cheer(s);
        else if (!this.tweens.isTweening(s.sprite)) this.tweens.add({ targets: s.sprite, y: s.sprite.y - 10, duration: 140, yoyo: true, ease: 'Quad.Out' });
      }
    }
    if (now > t.players) {
      t.players = now + 5000;
      const list = [...this.viewers.values()].filter(v => v.soldier || v.heroes.length).slice(0, 400).map(v => ({
        id: v.id, name: v.name, cls: v.cls, level: v.level || 1, rank: v.rank, xp: v.xp, kills: v.kills || 0,
        dmg: Math.round(v.round.dmg), gifts: v.sessionGifts || 0, alive: Boolean(v.soldier && !v.soldier.fallen), skills: v.skills || 0,
      }));
      this.net.send({ type: 'players', list });
    }
    if (now > t.ticker) {
      t.ticker = now + 5000;
      const boss = this.enemies.some(e => e.boss);
      let line;
      if (boss) line = 'Thả tim nạp Nỏ Thần! Cả làng đang đánh Boss!';
      else if (this.soldiers.some(s => s.fallen)) line = 'Có chiến sĩ bị ngã! Gõ "cứu" để hồi sinh';
      else {
        const top = this.boards.topWarriors(3);
        const lines = [...TICKER];
        if (top.length) lines.push(`Top hôm nay: ${top.map(p => `${clean(p.name)} ${fmt(p.value)}`).join(' · ')}`);
        if (this.goldenUntil > now) lines.push('GIỜ VÀNG: x2 XP cho tất cả!');
        line = lines[this.tickerIndex++ % lines.length];
      }
      this.ticker.setText(line);
    }
  }
}
