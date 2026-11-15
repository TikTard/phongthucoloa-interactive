// Pixel UI kit: 9-slice panels from Aseprite frames, ribbon banner, pixel text with hard shadows.
export const PX = 'VT323';     // pixel body font (has Vietnamese)
export const HEAD = 'Bungee';  // chunky display font (has Vietnamese)
export const INK = '#2a170e';
// Phaser measures line height from this string; include stacked Vietnamese capitals so accents aren't clipped
export const TEST = 'ẮẦỖỰẪ|MÉqgy';

// border width (screen px) of each frame in art/ui.lua
const SLICE = { paper: 6, sky: 6, jade: 6, violet: 6, rose: 6, wood: 6, bar: 8, dark: 8, lacquer: 10, seal: 6, banner: 0 };

function ensureSlices(scene, key, s) {
  const tex = scene.textures.get(key);
  if (tex.has('c')) return;
  const src = tex.getSourceImage();
  const w = src.width, h = src.height;
  const xs = [0, s, w - s], ws = [s, w - 2 * s, s];
  const ys = [0, s, h - s], hs = [s, h - 2 * s, s];
  const names = [['tl', 't', 'tr'], ['l', 'c', 'r'], ['bl', 'b', 'br']];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) tex.add(names[r][c], 0, xs[c], ys[r], ws[c], hs[r]);
}

// Works in Canvas and WebGL. Returns a container centred on (x, y).
export function panel(scene, kind, x, y, w, h) {
  const key = 'ui_' + kind;
  const s = SLICE[kind] ?? 6;
  ensureSlices(scene, key, s);
  w = Math.max(2 * s + 2, Math.round(w / 2) * 2);
  h = Math.max(2 * s + 2, Math.round(h / 2) * 2);
  const cw = w - 2 * s, ch = h - 2 * s;
  const parts = [];
  const add = (f, px, py, sw, sh) => {
    const fr = scene.textures.getFrame(key, f);
    parts.push(scene.add.image(px, py, key, f).setOrigin(0).setScale(sw / fr.width, sh / fr.height));
  };
  add('tl', 0, 0, s, s); add('t', s, 0, cw, s); add('tr', s + cw, 0, s, s);
  add('l', 0, s, s, ch); add('c', s, s, cw, ch); add('r', s + cw, s, s, ch);
  add('bl', 0, s + ch, s, s); add('b', s, s + ch, cw, s); add('br', s + cw, s + ch, s, s);
  const inner = scene.add.container(-w / 2, -h / 2, parts);
  const c = scene.add.container(x, y, [inner]);
  c.panelW = w; c.panelH = h;
  return c;
}

// pixel body text: VT323 with a hard 1-step shadow, no glow, no blur
export function ptext(scene, x, y, str, size, color = '#f3e4c0', opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: PX, fontSize: `${size}px`, color, align: opts.align || 'left', testString: TEST,
    wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: opts.lineSpacing ?? -4,
  });
  if (opts.shadow !== false) t.setShadow(0, Math.max(2, Math.round(size / 14)), opts.shadowColor || '#1a0e08', 0, false, true);
  return t;
}

// chunky headline: Bungee, dark outline + hard drop shadow
export function htext(scene, x, y, str, size, color = '#ffe58a', opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: HEAD, fontSize: `${size}px`, color, align: opts.align || 'center', testString: TEST, padding: { top: Math.round(size * 0.15) },
    stroke: opts.stroke || '#2a0a08', strokeThickness: Math.max(4, Math.round(size / 7)),
    wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
  });
  t.setShadow(0, Math.max(3, Math.round(size / 10)), opts.shadowColor || '#2a0a08', 0, true, true);
  return t;
}

// red silk ribbon with swallowtail ends. Returns a container centred on (x, y).
export function banner(scene, x, y, title, size = 44, color = '#fff2dc') {
  const t = htext(scene, 0, -4, title, size, color, { stroke: '#4a0a10', shadowColor: '#3a060c' }).setOrigin(0.5);
  const w = Math.max(260, t.width + 70);
  const bodyH = 88;
  const body = scene.add.image(0, 0, 'ui_banner').setDisplaySize(w, bodyH);
  const l = scene.add.image(-w / 2 - 18, 6, 'ui_banner_end').setScale(2);
  const r = scene.add.image(w / 2 + 18, 6, 'ui_banner_end').setScale(2).setFlipX(true);
  return scene.add.container(x, y, [l, r, body, t]);
}

export async function loadFonts() {
  if (!document.fonts?.load) return;
  const sample = 'GIỮ THÀNH Cổ Loa ắẫậ 0123';
  await Promise.race([
    Promise.all([document.fonts.load(`40px ${HEAD}`, sample), document.fonts.load(`32px ${PX}`, sample)]),
    new Promise(r => setTimeout(r, 3000)),
  ]);
}
