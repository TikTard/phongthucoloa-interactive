// A look and sound for each of the 10 maps. The field art (grass, path, fringe, trees, bushes, bamboo, flowers,
// rice, rocks) is recoloured at runtime from the base sprites: every pixel is sorted into a band by its hue
// (greens / earth / blossom pinks) and that band is moved to the theme's hue, saturation and lightness. Each theme
// also picks its edge scenery, its weather overlays and its background sounds + music key.
//
// band rule: { h: target hue 0-360 (null = keep), s: saturation multiplier, l: lightness shift (-1..1), lc: lightness
// contrast multiplier around 0.5 (optional) }
export const THEMES = [
  { id: 'lang', name: 'Làng Cổ Loa', green: null, earth: null, bloom: null,
    decor: ['tree', 'bamboo', 'tree_blossom', 'bush', 'lantern', 'tree', 'rock', 'bamboo', 'tree_blossom'], flowers: 0.25,
    weather: ['petals', 'butterflies', 'godrays'], sound: { semis: 0, tempo: 1, ambience: 'birds' } },
  { id: 'lua', name: 'Đồng Lúa Chín', green: { h: 62, s: 1.05, l: 0.06 }, earth: { h: 34, s: 1.1, l: 0.04 }, bloom: { h: 48, s: 1, l: 0.05 },
    decor: ['tree', 'bush', 'lantern', 'tree', 'rock', 'bush', 'tree_blossom'], flowers: 0.35, rice: true,
    weather: ['leaves', 'butterflies', 'godrays'], sound: { semis: 2, tempo: 1.02, ambience: 'crickets' } },
  { id: 'truc', name: 'Rừng Trúc', green: { h: 132, s: 1.1, l: -0.02 }, earth: { h: 30, s: 0.8, l: 0 }, bloom: { h: 120, s: 0.6, l: 0.05 },
    decor: ['bamboo', 'bamboo', 'tree', 'bamboo', 'bush', 'bamboo'], flowers: 0.1,
    weather: ['leaves_green', 'godrays', 'butterflies'], sound: { semis: -2, tempo: 0.95, ambience: 'bamboo' } },
  { id: 'suong', name: 'Thung Lũng Sương', green: { h: 150, s: 0.55, l: 0.1 }, earth: { h: 32, s: 0.6, l: 0.08 }, bloom: { h: 270, s: 0.7, l: 0.1 },
    decor: ['tree', 'rock', 'bush', 'lantern', 'tree', 'rock'], flowers: 0.2,
    weather: ['fog', 'godrays'], sound: { semis: 3, tempo: 0.92, ambience: 'wind' } },
  { id: 'dam', name: 'Đầm Lầy', green: { h: 160, s: 0.8, l: -0.03 }, earth: { h: 40, s: 0.55, l: -0.05 }, bloom: { h: 175, s: 0.8, l: 0 },
    decor: ['bamboo', 'bush', 'rock', 'tree', 'bush'], flowers: 0.1,
    weather: ['fireflies', 'fog'], sound: { semis: -3, tempo: 0.9, ambience: 'frogs' } },
  { id: 'nui', name: 'Núi Đá', green: { h: 55, s: 0.45, l: 0.03 }, earth: { h: 30, s: 0.25, l: 0.05 }, bloom: { h: 40, s: 0.3, l: 0.15 },
    decor: ['rock', 'rock', 'tree', 'rock', 'bush'], flowers: 0.05,
    weather: ['leaves', 'godrays'], sound: { semis: -5, tempo: 1, ambience: 'wind' } },
  { id: 'tuyet', name: 'Tuyết Sơn', green: { h: 205, s: 0.22, l: 0.3, lc: 0.45 }, earth: { h: 215, s: 0.25, l: 0.14 }, bloom: { h: 200, s: 0.3, l: 0.25 },
    decor: ['tree', 'rock', 'lantern', 'tree', 'rock'], flowers: 0,
    weather: ['snowfall'], sound: { semis: 5, tempo: 0.95, ambience: 'blizzard' } },
  { id: 'hoa', name: 'Hỏa Diệm Sơn', green: { h: 26, s: 0.85, l: -0.02 }, earth: { h: 12, s: 0.55, l: -0.06 }, bloom: { h: 18, s: 1.2, l: 0.05 },
    decor: ['rock', 'rock', 'lantern', 'bush', 'rock'], flowers: 0.05,
    weather: ['embers', 'heat'], sound: { semis: -1, tempo: 1.1, ambience: 'fire' } },
  { id: 'ma', name: 'Ma Giới', green: { h: 272, s: 0.65, l: -0.02 }, earth: { h: 255, s: 0.3, l: -0.02 }, bloom: { h: 300, s: 1, l: 0.05 },
    decor: ['tree', 'lantern', 'rock', 'bamboo', 'lantern'], flowers: 0.15,
    weather: ['wisps', 'fog'], sound: { semis: 1, tempo: 1.05, ambience: 'eerie' } },
  { id: 'quy', name: 'Cổng Quỷ', green: { h: 352, s: 0.6, l: -0.06 }, earth: { h: 0, s: 0.18, l: -0.08 }, bloom: { h: 355, s: 1.2, l: 0 },
    decor: ['rock', 'lantern', 'tree', 'rock', 'lantern'], flowers: 0.05,
    weather: ['embers', 'wisps'], sound: { semis: -4, tempo: 1.12, ambience: 'drums' } },
];

export const THEMED_KEYS = ['tile_grass', 'tile_grass2', 'tile_grass3', 'tile_path', 'tile_edge', 'tile_edge2', 'tuft', 'bush', 'tree', 'tree_blossom', 'bamboo', 'flowers', 'rice', 'rock'];

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const clamp01 = x => Math.max(0, Math.min(1, x));

// which band a pixel belongs to
function band(h, s, l) {
  if (s < 0.12 || l < 0.06) return null;           // greys, outline, near-black: leave alone
  if (h >= 55 && h < 175) return 'green';
  if ((h >= 290 || h < 12) && l > 0.45) return 'bloom'; // pinks / reds of blossoms and flowers
  if (h >= 12 && h < 55) return 'earth';            // path, dirt, wood, bark
  return null;
}

function applyRule(h, s, l, rule) {
  if (!rule) return null;
  let nh = rule.h ?? h;
  // keep a little of the original hue variation so shading still reads
  if (rule.h !== null && rule.h !== undefined) nh = rule.h + (h - (h >= 55 && h < 175 ? 110 : h >= 290 || h < 12 ? 340 : 30)) * 0.25;
  let nl = l;
  if (rule.lc !== undefined) nl = 0.5 + (l - 0.5) * rule.lc;
  return hsl2rgb(nh, clamp01(s * (rule.s ?? 1)), clamp01(nl + (rule.l ?? 0)));
}

// make (once) and return the themed copy of a texture
export function themedKey(scene, key, ti) {
  const t = THEMES[ti];
  if (!t || (!t.green && !t.earth && !t.bloom)) return key;
  const out = `${key}~${t.id}`;
  if (scene.textures.exists(out)) return out;
  if (!scene.textures.exists(key)) return key;
  const src = scene.textures.get(key).getSourceImage();
  const w = src.width, h = src.height;
  const cv = scene.textures.createCanvas(out, w, h);
  const ctx = cv.getContext();
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const [hh, ss, ll] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
    const b = band(hh, ss, ll);
    if (!b) continue;
    const c = applyRule(hh, ss, ll, t[b]);
    if (!c) continue;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  ctx.putImageData(img, 0, 0);
  cv.refresh();
  cv.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return out;
}
