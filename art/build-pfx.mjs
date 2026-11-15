// Bakes pixelfx effects (https://github.com/patch-gg/pixelfx, MIT) into sprite sheets for the game.
//
//   npm run pfx                       (expects the pixelfx checkout next to this project: ../pixelfx)
//   PIXELFX_DIR=D:/path/pixelfx npm run pfx
//
// Writes public/assets/pfx/<key>.png and public/assets/pfx/manifest.json
// ({ key: { w, h, frames, fps, loop, pivot } }). The game loads them as pfx_<key>.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PFX = resolve(process.env.PIXELFX_DIR || join(HERE, '..', '..', 'pixelfx'));
const OUT = join(HERE, '..', 'public', 'assets', 'pfx');
if (!existsSync(join(PFX, 'tools', 'lib', 'fxlib.mjs'))) {
  console.error(`pixelfx not found at ${PFX}. Clone it: git clone https://github.com/patch-gg/pixelfx (next to this project) or set PIXELFX_DIR.`);
  process.exit(1);
}
const { loadEffect, renderFrames, spriteSheet } = await import(pathToFileURL(join(PFX, 'tools', 'lib', 'fxlib.mjs')).href);
const { PAL } = await import(pathToFileURL(join(PFX, 'src', 'core', 'color.js')).href);

// key -> pixelfx id + options. fps 20 keeps sheets small; the game plays them at the same rate.
const LIST = {
  // hits
  hitspark: { id: 'impacts/hit-spark' },
  crit: { id: 'impacts/crit-hit' },
  zap: { id: 'lightning/zap-hit' },
  snowburst: { id: 'ice/snowflake-burst', opts: { count: 7 } },
  boom: { id: 'explosions/small-explosion' },
  slash: { id: 'melee/spin-slash' },
  // deaths, spawns
  poof: { id: 'spawn/poof' },
  portal: { id: 'spawn/spawn-portal' },
  darkboom: { id: 'shadow/dark-explosion' },
  // skills
  strike: { id: 'lightning/lightning-strike' },
  frostnova: { id: 'ice/frost-nova' },
  healaoe: { id: 'holy/heal-aoe' },
  pillar: { id: 'holy/holy-pillar' },
  slam: { id: 'impacts/ground-slam' },
  // heroes, gifts, rewards
  circle: { id: 'arcane/magic-circle-cast', opts: { palette: PAL.gold } },
  collect: { id: 'pickups/collect-burst', opts: { palette: PAL.gold } },
  firework: { id: 'explosions/firework-burst' },
  firework2: { id: 'explosions/firework-burst', opts: { seed: 23, palette: PAL.ice ?? undefined } },
  chest: { id: 'pickups/chest-open' },
  // soldier class skills
  thrust: { id: 'melee/thrust' },
  shieldblock: { id: 'impacts/shield-block' },
  starfall: { id: 'arcane/star-fall', opts: { palette: PAL.gold } },
  heal1: { id: 'holy/heal' },
  // boss skills
  wave: { id: 'water/wave-crash' },
  geyser: { id: 'water/geyser' },
  roots: { id: 'nature/root-snare' },
  thorns: { id: 'nature/thorns' },
  poison: { id: 'nature/poison-cloud' },
  charm: { id: 'status/charmed' },
  // projectiles (loops, face right)
  fireball: { id: 'fire/fireball' },
  icelance: { id: 'ice/ice-lance' },
  // ambient world (loops)
  brazier: { id: 'fire/brazier', fps: 12 },
  butterfly: { id: 'critters/butterfly', fps: 12 },
  ripples: { id: 'water/ripples', fps: 12 },
  rift: { id: 'arcane/portal', fps: 12 },
  // screen-size weather effects bake a dark night-sky haze into every pixel; dehaze strips it so only the
  // petals / rays are left over our bright field
  petals: { id: 'weather/cherry-blossoms', fps: 12, dehaze: true },
  godrays: { id: 'weather/god-rays', fps: 10, dehaze: true },
  // per-map weather (screen overlays, haze stripped)
  leaves: { id: 'weather/falling-leaves', fps: 12, dehaze: true },
  leaves_green: { id: 'weather/falling-leaves', fps: 12, dehaze: true, opts: { palette: PAL.leaf } },
  snowfall: { id: 'weather/snow', fps: 12, dehaze: true },
  fog: { id: 'weather/fog', fps: 10, dehaze: true },
  fireflies: { id: 'weather/fireflies', fps: 12, dehaze: true },
  wisp: { id: 'critters/wisp', fps: 12 },
  // combat feedback
  parry: { id: 'impacts/parry' },
  coindrop: { id: 'spawn/coin-drop' },
  blunt: { id: 'impacts/blunt-hit' },
  landing: { id: 'impacts/heavy-landing' },
  muzzle: { id: 'projectiles/muzzle-shotgun' },
  stunned: { id: 'status/stunned', fps: 12 },
  divshield: { id: 'holy/divine-shield', fps: 12 },
  // UI moments
  countdown: { id: 'ui/countdown' },
  combo2: { id: 'ui/combo-counter', opts: { count: 2, palette: PAL.gold } },
  combo3: { id: 'ui/combo-counter', opts: { count: 3, palette: PAL.gold } },
  combo5: { id: 'ui/combo-counter', opts: { count: 5, palette: PAL.fire } },
  // boss urgent phase: fire everywhere
  flamepillar: { id: 'fire/flame-pillar' },
  meteor: { id: 'fire/meteor' },
  firering: { id: 'fire/fire-ring' },
  firetornado: { id: 'fire/fire-tornado', fps: 12 },
  campfire: { id: 'fire/campfire', fps: 12 },
  torch: { id: 'fire/torch', fps: 12 },
  // comic hits: guards kicked off the screen
  pow: { id: 'explosions/cartoon-pow' },
};

mkdirSync(OUT, { recursive: true });
const manifest = {};
for (const [key, { id, opts, fps = 20, dehaze = false }] of Object.entries(LIST)) {
  const fx = await loadEffect(id, join(PFX, 'src', 'fx'));
  const options = Object.fromEntries(Object.entries(opts || {}).filter(([, v]) => v !== undefined));
  const r = renderFrames(fx, { fps, actor: false, bg: 'none', options });
  if (dehaze) {
    // drop dark pixels (the baked sky) and fade dim ones, keep the bright petals / light shafts
    for (const f of r.frames) {
      const c = f.clear;
      for (let i = 0; i < c.length; i += 4) {
        const lum = 0.3 * c[i] + 0.59 * c[i + 1] + 0.11 * c[i + 2];
        if (lum < 70) c[i + 3] = 0;
        else if (lum < 120) c[i + 3] = Math.round(c[i + 3] * (lum - 70) / 50);
        if (c[i + 3] === 0) c[i] = c[i + 1] = c[i + 2] = 0;
      }
    }
  }
  // drop trailing empty frames so one-shots end the moment they're gone
  let n = r.frames.length;
  while (n > 2 && !r.frames[n - 1].clear.some((v, i) => i % 4 === 3 && v > 8)) n--;
  r.frames = r.frames.slice(0, n);
  const s = spriteSheet(fx, r, key);
  const cols = s.json.meta.pixelfx.columns;
  writeFileSync(join(OUT, `${key}.png`), s.png);
  manifest[key] = { id, w: r.w, h: r.h, frames: n, cols, fps, loop: Boolean(fx.meta.loop), pivot: fx.meta.origin };
  console.log(`${key.padEnd(10)} ${id.padEnd(32)} ${n} frames ${r.w}x${r.h}`);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
writeFileSync(join(OUT, 'NOTICE.md'), 'Effects in this folder are rendered from pixelfx by Patch (https://github.com/patch-gg/pixelfx), MIT license.\nRebuild with `npm run pfx`.\n');
console.log(`Built ${Object.keys(manifest).length} pixelfx sheets -> ${OUT}`);
