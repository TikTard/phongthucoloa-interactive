-- Tiles (32x32, seamless), decorations, the citadel gate and effect sprites.
local R = ...
local M, F = R.mat, R.flat
local out, src = R.outDir, R.srcDir
local hex = R.hex

local function glow(name, h, extra)
  local o = { noline = true, nooutline = true, light = 1.4 }
  for k, v in pairs(extra or {}) do o[k] = v end
  return R.mat(name, h, o)
end
local GOLD = M('gold', '#f2c443')
local WHITE = F('white', '#ffffff')

---------------------------------------------------------------------------
-- direct pixel tiles
---------------------------------------------------------------------------
local TAU = math.pi * 2
local function px(img, x, y, c)
  x, y = x % img.width, y % img.height -- wrap = seamless
  img:drawPixel(x, y, app.pixelColor.rgba(math.floor(c[1]), math.floor(c[2]), math.floor(c[3]), 255))
end
-- periodic noise (integer frequencies keep it seamless on a 32px tile)
local function pnoise(x, y, seedv)
  local s = 0
  local fr = { { 1, 2, 0.5 }, { 2, 1, 0.3 }, { 3, 2, 0.2 }, { 1, 3, 0.25 }, { 4, 3, 0.12 } }
  for i, q in ipairs(fr) do
    s = s + math.sin(TAU * (x / 32 * q[1] + y / 32 * q[2]) + seedv * (i + 1.7)) * q[3]
      + math.cos(TAU * (x / 32 * q[2] - y / 32 * q[1]) + seedv * (i + 0.3)) * q[3] * 0.7
  end
  return s
end
local function pal(list) local t = {}; for i, h in ipairs(list) do t[i] = hex(h) end; return t end
local function pickTone(p, v)
  local i = math.max(1, math.min(#p, math.floor(v * #p) + 1))
  return p[i]
end

local GRASS = pal({ '#5a9a4c', '#68aa52', '#78ba5a', '#8cc864', '#a2d670' })
local function grassTile(seedv, flowers)
  R.seed(1000 + seedv * 77)
  local img = Image(32, 32, ColorMode.RGB)
  for y = 0, 31 do
    for x = 0, 31 do
      local v = 0.5 + pnoise(x, y, seedv) * 0.32 + (R.rnd() - 0.5) * 0.18
      px(img, x, y, pickTone(GRASS, v))
    end
  end
  for _ = 1, 26 do -- blades
    local x, y = math.floor(R.rnd() * 32), math.floor(R.rnd() * 32)
    px(img, x, y + 1, GRASS[1]); px(img, x, y, GRASS[4]); px(img, x, y - 1, GRASS[5])
    if R.rnd() < 0.5 then px(img, x + 1, y, GRASS[4]); px(img, x + 1, y - 1, GRASS[5]) end
  end
  if flowers then
    local cols = pal({ '#f4cf5a', '#f6efe0', '#ec8aa0', '#9fc8e0' })
    for _ = 1, 5 do
      local x, y = math.floor(R.rnd() * 32), math.floor(R.rnd() * 32)
      local c = cols[math.floor(R.rnd() * #cols) + 1]
      px(img, x, y + 1, GRASS[1]); px(img, x - 1, y, c); px(img, x + 1, y, c); px(img, x, y - 1, c); px(img, x, y + 1, c)
      px(img, x, y, hex('#f2a020'))
    end
  end
  return img
end

local DIRT = pal({ '#8a6040', '#a67a4c', '#c2955c', '#d8b072', '#eccb8e' })
local STONE = pal({ '#7f7066', '#9c8c7c', '#b9a892', '#d4c4a8', '#eee2c6' })
local function pathTile()
  R.seed(4242)
  local img = Image(32, 32, ColorMode.RGB)
  for y = 0, 31 do
    for x = 0, 31 do
      px(img, x, y, pickTone(DIRT, 0.55 + pnoise(x, y, 3.3) * 0.25 + (R.rnd() - 0.5) * 0.25))
    end
  end
  -- cobbles
  local stones = { { 5, 5, 4.5, 3.4 }, { 15, 3, 4, 3 }, { 25, 6, 4.6, 3.6 }, { 9, 14, 4.2, 3.2 }, { 20, 15, 5, 3.4 },
    { 30, 16, 3.6, 3 }, { 4, 24, 4.6, 3.4 }, { 14, 25, 4.2, 3.4 }, { 24, 26, 4.8, 3.2 } }
  for _, s in ipairs(stones) do
    local cx, cy, rx, ry = s[1], s[2], s[3], s[4]
    for y = -5, 5 do
      for x = -6, 6 do
        local nx, ny = (x + 0.5) / rx, (y + 0.5) / ry
        local d = nx * nx + ny * ny
        if d <= 1 then
          local l = -0.6 * nx - 0.8 * ny
          px(img, cx + x, cy + y, pickTone(STONE, 0.45 + l * 0.35 + (R.rnd() - 0.5) * 0.1))
        elseif d <= 1.45 and (ny > 0 or nx > 0) then
          px(img, cx + x, cy + y, DIRT[1])
        end
      end
    end
  end
  return img
end

local WATER = pal({ '#2a7896', '#3592aa', '#44acbc', '#64c6cc', '#a8e8e0' })
local function waterTile(ph)
  local img = Image(32, 32, ColorMode.RGB)
  for y = 0, 31 do
    for x = 0, 31 do
      local w = math.sin(TAU * (x / 32 + y / 32 * 2) + ph * TAU / 4) * 0.5 + math.sin(TAU * (x / 16 - y / 32) - ph * TAU / 4) * 0.3
      local v = 0.45 + w * 0.22 + pnoise(x, y, 7) * 0.12
      px(img, x, y, pickTone(WATER, v))
      if w > 0.72 then px(img, x, y, WATER[5]) end
    end
  end
  return img
end

local BRICK = pal({ '#5e5266', '#7c6e80', '#9a8c96', '#b8aaac', '#d6cac4' })
local function wallTile()
  R.seed(77)
  local img = Image(32, 32, ColorMode.RGB)
  for y = 0, 31 do for x = 0, 31 do px(img, x, y, BRICK[1]) end end
  for row = 0, 3 do
    local off = (row % 2) * 8
    for col = 0, 1 do
      local x0, y0 = col * 16 + off, row * 8
      local tone = 0.45 + (R.rnd() - 0.5) * 0.3
      for y = 1, 6 do
        for x = 1, 14 do
          local v = tone + (R.rnd() - 0.5) * 0.12
          if y == 1 or x == 1 then v = v + 0.25 end
          if y == 6 or x == 14 then v = v - 0.25 end
          px(img, x0 + x, y0 + y, pickTone(BRICK, v))
        end
      end
    end
  end
  for _ = 1, 6 do px(img, math.floor(R.rnd() * 32), math.floor(R.rnd() * 32), hex('#5f9446')) end
  return img
end

local WOODP = pal({ '#4a3020', '#64402a', '#7a5234', '#90643e', '#a8784c' })
local function plankTile()
  R.seed(99)
  local img = Image(32, 32, ColorMode.RGB)
  for y = 0, 31 do
    local board = math.floor(y / 8)
    for x = 0, 31 do
      local v = 0.5 + math.sin((x + board * 13) * 0.45 + math.sin(y * 0.8) * 1.5) * 0.12 + (R.rnd() - 0.5) * 0.1
      if y % 8 == 0 then v = 0.05 elseif y % 8 == 1 then v = v + 0.2 elseif y % 8 == 7 then v = v - 0.2 end
      px(img, x, y, pickTone(WOODP, v))
    end
    if y % 8 == 4 then px(img, (board * 11 + 3) % 32, y, hex('#d8d0c0')); px(img, (board * 11 + 19) % 32, y, hex('#d8d0c0')) end
  end
  return img
end

-- grass fringe that hangs over the top edge of a path tile (rotated in-game for the other sides)
local function edgeTile(seedv)
  R.seed(3000 + seedv)
  local img = Image(32, 10, ColorMode.RGB)
  local function put(x, y, c, a) img:drawPixel(x, y, app.pixelColor.rgba(math.floor(c[1]), math.floor(c[2]), math.floor(c[3]), a or 255)) end
  for x = 0, 31 do
    local len = 2 + math.floor(R.rnd() * 3) + ((x % 5 == 0) and math.floor(R.rnd() * 4) or 0)
    for y = 0, len - 1 do
      local t = y / math.max(1, len - 1)
      put(x, y, t < 0.4 and GRASS[3] or (t < 0.8 and GRASS[4] or GRASS[5]))
    end
    put(x, len, { 40, 26, 18 }, 110) -- soft contact shadow on the stones
    if len + 1 < 10 then put(x, len + 1, { 40, 26, 18 }, 45) end
  end
  return img
end
R.save(out, src, 'tile_edge', { edgeTile(1) })
R.save(out, src, 'tile_edge2', { edgeTile(2) })

R.save(out, src, 'tile_grass', { grassTile(1, false) })
R.save(out, src, 'tile_grass2', { grassTile(2, true) })
R.save(out, src, 'tile_grass3', { grassTile(3, false) })
R.save(out, src, 'tile_path', { pathTile() })
R.save(out, src, 'tile_water', { waterTile(0), waterTile(1), waterTile(2), waterTile(3) }, 260, { flow = { 0, 3, 4, true } })
R.save(out, src, 'tile_wall', { wallTile() })
R.save(out, src, 'tile_plank', { plankTile() })

---------------------------------------------------------------------------
-- decorations (rasterizer)
---------------------------------------------------------------------------
local LEAF = M('leaf', '#4f914c')
local LEAF2 = M('leaf2', '#6cac52', { group = 'leaf' })
local TRUNK = M('trunk', '#6a4a30')

R.save(out, src, 'tree', { R.frame(48, 56, function(cv)
  local P = R.painter(cv)
  P.capsule(24, 52, 24, 34, 3.4, TRUNK)
  P.capsule(24, 40, 31, 33, 1.6, TRUNK)
  P.ellipse(24, 53.5, 6, 2, M('root', '#4a3020'))
  for _, c in ipairs({ { 16, 26, 10, 9 }, { 32, 26, 10, 9 }, { 24, 30, 12, 8 }, { 13, 17, 8, 7.5 }, { 35, 17, 8, 7.5 }, { 24, 14, 12, 10 }, { 24, 6, 8, 6 } }) do
    P.ellipse(c[1], c[2], c[3], c[4], (c[2] < 20) and LEAF2 or LEAF, { rim = true })
  end
  local fruit = F('fruit', '#ff6a5a')
  for _, p in ipairs({ { 14, 22 }, { 30, 12 }, { 34, 28 }, { 21, 27 } }) do P.px(p[1], p[2], fruit) end
end) })

-- hoa đào: blossom tree
R.save(out, src, 'tree_blossom', { R.frame(48, 56, function(cv)
  local P = R.painter(cv)
  local pink, pink2 = M('blossom', '#e88aa4'), M('blossom2', '#f6b8c8', { group = 'blossom' })
  P.capsule(24, 52, 23, 30, 3.2, TRUNK)
  P.capsule(23, 38, 14, 28, 1.5, TRUNK); P.capsule(24, 34, 33, 25, 1.5, TRUNK)
  P.ellipse(24, 53.5, 6, 2, M('root', '#4a3020'))
  for _, c in ipairs({ { 13, 24, 9, 7 }, { 35, 23, 9, 7 }, { 24, 26, 10, 6 }, { 17, 13, 9, 8 }, { 31, 12, 9, 8 }, { 24, 7, 8, 6 } }) do
    P.ellipse(c[1], c[2], c[3], c[4], c[2] < 18 and pink2 or pink, { rim = true })
  end
  local w = F('petal', '#fff0f4')
  for _, p in ipairs({ { 12, 20 }, { 28, 10 }, { 36, 20 }, { 20, 9 }, { 30, 27 }, { 8, 30 }, { 40, 33 }, { 18, 44 } }) do P.px(p[1], p[2], w) end
end) })

R.save(out, src, 'tuft', { R.frame(16, 10, function(cv)
  local P = R.painter(cv)
  local g1, g2 = M('tuftA', '#6cac52'), M('tuftB', '#a2d670', { group = 'tuftA' })
  P.poly({ { 2, 10 }, { 4, 2 }, { 6, 10 } }, g1)
  P.poly({ { 5, 10 }, { 8, 0 }, { 10, 10 } }, g2)
  P.poly({ { 9, 10 }, { 12, 3 }, { 14, 10 } }, g1)
end, { noOutline = true }) })

R.save(out, src, 'bamboo', { R.frame(32, 60, function(cv)
  local P = R.painter(cv)
  local B, BD = M('bamboo', '#9cc860'), M('bambooD', '#5f9446')
  for i, x in ipairs({ 9, 16, 23 }) do
    local top = 4 + i * 3
    P.capsule(x, 58, x + (i - 2) * 2, top, 1.9, i == 2 and B or BD)
    for y = top + 6, 56, 9 do P.capsule(x + (i - 2) * 2 * (1 - (y - top) / (58 - top)) - 2, y, x + (i - 2) * 2 * (1 - (y - top) / (58 - top)) + 2, y, 0.8, BD) end
  end
  for _, l in ipairs({ { 12, 10, 3, 4 }, { 20, 14, 4, 2 }, { 6, 20, -3, 3 }, { 27, 22, 4, 4 }, { 14, 30, -4, 2 }, { 25, 6, 3, -2 } }) do
    P.poly({ { l[1], l[2] }, { l[1] + l[3] * 2.5, l[2] + l[4] }, { l[1] + l[3], l[2] + 2 } }, LEAF2)
  end
end) })

R.save(out, src, 'lantern', { R.frame(16, 26, function(cv)
  local P = R.painter(cv)
  P.capsule(8, 0, 8, 3, 0.5, M('cord', '#3a2a20'))
  P.rect(5, 3, 6, 2, GOLD)
  P.ellipse(8, 12, 6.5, 7.5, M('silk', '#d8303a'))
  P.ellipse(7, 11, 3, 4.5, glow('glow', '#ffb04a'))
  for _, x in ipairs({ 4, 8, 12 }) do P.capsule(x, 6, x, 18, 0.35, M('rib', '#8a1a2a')) end
  P.rect(5, 19, 6, 2, GOLD)
  P.capsule(8, 21, 8, 25, 0.6, M('tassel', '#ffcc3a'))
end) })

R.save(out, src, 'rock', { R.frame(24, 16, function(cv)
  local P = R.painter(cv)
  P.ellipse(13, 10, 9.5, 5.5, M('rock', '#8a8680'))
  P.ellipse(7, 11, 5, 3.6, M('rock2', '#7a766e', { group = 'rock' }))
  P.ellipse(14, 6, 3.4, 1.4, M('moss', '#7aac52'))
end) })

R.save(out, src, 'bush', { R.frame(28, 18, function(cv)
  local P = R.painter(cv)
  P.ellipse(8, 11, 7, 6, LEAF); P.ellipse(20, 11, 7, 6, LEAF); P.ellipse(14, 8, 8, 6.5, LEAF2)
  P.px(9, 8, F('b', '#ec8aa0')); P.px(18, 6, F('b2', '#f4cf5a')); P.px(13, 12, F('b', '#ec8aa0'))
end) })

R.save(out, src, 'flowers', { R.frame(20, 14, function(cv)
  local P = R.painter(cv)
  for i, c in ipairs({ { 4, 5, '#ec8aa0' }, { 11, 3, '#f4cf5a' }, { 16, 7, '#ffffff' }, { 8, 10, '#9fc8e0' } }) do
    P.capsule(c[1], c[2] + 2, c[1], 13, 0.5, M('stem', '#4f914c'))
    P.ellipse(c[1], c[2], 2.2, 2, M('petal' .. i, c[3]))
    P.px(c[1], c[2], F('core', '#f2a020'))
  end
end) })

R.save(out, src, 'rice', { R.frame(32, 22, function(cv)
  local P = R.painter(cv)
  P.rect(0, 15, 32, 7, M('paddy', '#3592aa'), { shade = 0.55 })
  P.capsule(0, 16, 32, 16, 0.5, F('shine', '#a8e8e0'))
  for i = 0, 3 do
    local x = 4 + i * 8
    for j = -1, 1 do P.curve({ { x, 17 }, { x + j * 1.5, 10 }, { x + j * 3, 5 } }, 0.5, M('stalk', '#a0c85e')) end
    P.ellipse(x + 2, 5, 1.6, 2.6, M('grain', '#f0d060'))
    P.ellipse(x - 2, 6, 1.4, 2.2, M('grain', '#f0d060'))
  end
end) })

---------------------------------------------------------------------------
-- citadel gate 128x96
---------------------------------------------------------------------------
R.save(out, src, 'gate', { R.frame(128, 96, function(cv)
  local P = R.painter(cv)
  local stone = M('stone', '#a89aa0')
  local mortar = F('mortar', '#4a3e4a')
  local red = M('red', '#b8303a')
  local roof = M('roof', '#4a3a4e')
  local roofL = M('roofL', '#7a3a2a', { group = 'roof' })
  -- base wall with bricks
  P.rect(6, 50, 116, 46, stone)
  for row = 0, 5 do
    P.rect(6, 50 + row * 8, 116, 0.9, mortar)
    for x = 6 + (row % 2) * 8, 120, 16 do P.rect(x, 50 + row * 8, 0.9, 8, mortar) end
  end
  P.rect(4, 47, 120, 4, M('cap', '#c4b6b4'))
  for x = 6, 118, 12 do P.rect(x, 41, 7, 7, M('crenel', '#b4a6a8', { group = 'cap' })) end
  -- arch door
  P.ellipse(64, 66, 17, 14, F('void', '#1a1424'))
  P.rect(47, 66, 34, 30, F('void', '#1a1424'))
  P.rect(49, 66, 14.5, 30, M('door', '#7a4a2a'))
  P.rect(64.5, 66, 14.5, 30, M('door2', '#6a4024', { group = 'door' }))
  for _, x in ipairs({ 53, 58, 69, 74 }) do for y = 70, 92, 6 do P.px(x, y, GOLD, 1) end end
  P.ellipse(60.5, 80, 1.6, 1.6, GOLD); P.ellipse(67.5, 80, 1.6, 1.6, GOLD)
  P.curve({ { 46, 66 }, { 50, 55 }, { 64, 51 }, { 78, 55 }, { 82, 66 } }, 1.4, M('archstone', '#d0c2bc'))
  -- pavilion
  P.rect(28, 22, 72, 20, red)
  for x = 30, 96, 11 do P.capsule(x, 22, x, 42, 1.6, M('pillar', '#d84a3a')) end
  for x = 35, 92, 11 do P.rect(x, 26, 6, 10, F('window', '#2a1a20')); P.rect(x + 2.6, 26, 0.8, 10, GOLD) end
  P.rect(26, 40, 76, 3, GOLD)
  P.rect(52, 30, 24, 8, GOLD)
  P.rect(54, 32, 20, 4, M('plaque', '#8a1a2a'))
  -- roofs with upturned eaves
  P.poly({ { 14, 24 }, { 114, 24 }, { 106, 16 }, { 22, 16 } }, roof)
  P.curve({ { 14, 24 }, { 8, 22 }, { 6, 17 } }, 1.4, roof); P.curve({ { 114, 24 }, { 120, 22 }, { 122, 17 } }, 1.4, roof)
  P.rect(30, 9, 68, 8, red)
  P.poly({ { 22, 11 }, { 106, 11 }, { 96, 3 }, { 32, 3 } }, roofL)
  P.curve({ { 22, 11 }, { 17, 9 }, { 15, 5 } }, 1.2, roofL); P.curve({ { 106, 11 }, { 111, 9 }, { 113, 5 } }, 1.2, roofL)
  P.capsule(32, 3, 96, 3, 1.4, GOLD)
  P.ellipse(64, 1.5, 3, 2.2, GOLD)
  P.curve({ { 6, 17 }, { 4, 13 }, { 7, 11 } }, 0.9, GOLD); P.curve({ { 122, 17 }, { 124, 13 }, { 121, 11 } }, 0.9, GOLD)
  -- lanterns
  for _, x in ipairs({ 38, 90 }) do
    P.capsule(x, 43, x, 46, 0.4, M('cord', '#3a2a20'))
    P.ellipse(x, 51, 4, 5, M('silk', '#e0303a'))
    P.ellipse(x - 0.8, 50, 1.8, 2.8, glow('lglow', '#ffc04a'))
  end
end) })

---------------------------------------------------------------------------
-- effects (no outlines, glowing)
---------------------------------------------------------------------------
local FX_R, FX_O, FX_Y, FX_W = glow('r', '#e8402a'), glow('o', '#ff8a2a'), glow('y', '#ffe25a'), glow('w', '#fffbe8')
local SMOKE = R.mat('smoke', '#8a8494', { noline = true, nooutline = true })

-- explosion 48x48, 6 frames
do
  local imgs = {}
  for t = 0, 5 do
    imgs[#imgs + 1] = R.frame(48, 48, function(cv)
      local P = R.painter(cv)
      R.seed(500 + t)
      if t <= 3 then
        local rad = 7 + t * 4.5
        local pts = {}
        for i = 0, 15 do
          local a = i / 16 * math.pi * 2
          local rr = rad * (0.75 + R.rnd() * 0.45)
          pts[#pts + 1] = { 24 + math.cos(a) * rr, 24 + math.sin(a) * rr }
        end
        P.poly(pts, FX_R)
        P.ellipse(24, 24, rad * 0.78, rad * 0.78, FX_O)
        P.ellipse(23, 23, rad * 0.5, rad * 0.5, FX_Y)
        if t < 2 then P.ellipse(22.5, 22.5, rad * 0.28, rad * 0.28, FX_W) end
      end
      if t >= 2 then
        for i = 0, 6 do
          local a = i / 7 * math.pi * 2 + t
          local d = 8 + t * 3
          P.ellipse(24 + math.cos(a) * d, 22 + math.sin(a) * d - t, 4.5 - (t - 2) * 0.7, 4 - (t - 2) * 0.6, SMOKE)
        end
      end
      for i = 0, 7 do
        local a = i / 8 * math.pi * 2 + 0.3
        local d = 10 + t * 5
        P.px(24 + math.cos(a) * d, 24 + math.sin(a) * d, FX_Y, 1)
      end
    end, { noOutline = true, noInner = true })
  end
  R.save(out, src, 'fx_explosion', imgs, 60, { boom = { 0, 5, 16, false } })
end

-- hit spark 24x24, 4 frames
do
  local imgs = {}
  for t = 0, 3 do
    imgs[#imgs + 1] = R.frame(24, 24, function(cv)
      local P = R.painter(cv)
      local len = 3 + t * 3
      for i = 0, 3 do
        local a = i * math.pi / 2 + math.pi / 4 * (t % 2)
        P.capsule(12, 12, 12 + math.cos(a) * len, 12 + math.sin(a) * len, math.max(0.5, 1.6 - t * 0.35), FX_W)
      end
      if t < 2 then P.ellipse(12, 12, 3 - t, 3 - t, FX_Y) end
    end, { noOutline = true, noInner = true })
  end
  R.save(out, src, 'fx_hit', imgs, 50, { hit = { 0, 3, 20, false } })
end

-- slash arc 48x48, 3 frames
do
  local imgs = {}
  for t = 0, 2 do
    imgs[#imgs + 1] = R.frame(48, 48, function(cv)
      local P = R.painter(cv)
      local c = glow('slash', '#bff6ff')
      for i = 0, 14 do
        local a = -math.pi * 0.85 + i / 14 * math.pi * 0.9 + t * 0.35
        local w = math.sin(i / 14 * math.pi) * (3.2 - t)
        if w > 0.3 then P.ellipse(24 + math.cos(a) * 17, 24 + math.sin(a) * 17, w, w, i > 6 and FX_W or c) end
      end
    end, { noOutline = true, noInner = true })
  end
  R.save(out, src, 'fx_slash', imgs, 60, { slash = { 0, 2, 16, false } })
end

-- magic circle 64x32, 4 frames (rotating runes)
do
  local imgs = {}
  for t = 0, 3 do
    imgs[#imgs + 1] = R.frame(64, 32, function(cv)
      local P = R.painter(cv)
      local g, g2 = glow('ring', '#ffd94a'), glow('ring2', '#fff4b0')
      for y = 0, 31 do
        for x = 0, 63 do
          local nx, ny = (x + 0.5 - 32) / 30, (y + 0.5 - 16) / 14
          local d = math.sqrt(nx * nx + ny * ny)
          if (d > 0.9 and d <= 1) or (d > 0.66 and d <= 0.72) then P.px(x, y, d > 0.8 and g or g2, 0.6) end
        end
      end
      for i = 0, 7 do
        local a = i / 8 * math.pi * 2 + t * math.pi / 16
        local x, y = 32 + math.cos(a) * 25, 16 + math.sin(a) * 11.5
        P.ellipse(x, y, 1.4, 1, g2)
      end
      for i = 0, 2 do
        local a = i / 3 * math.pi * 2 - t * math.pi / 12
        P.capsule(32 + math.cos(a) * 20, 16 + math.sin(a) * 9.3, 32 + math.cos(a + 2.1) * 20, 16 + math.sin(a + 2.1) * 9.3, 0.5, g)
      end
    end, { noOutline = true, noInner = true })
  end
  R.save(out, src, 'fx_circle', imgs, 120, { spin = { 0, 3, 8, true } })
end

-- fireball 20x12, 4 frames (points right)
do
  local imgs = {}
  for t = 0, 3 do
    imgs[#imgs + 1] = R.frame(20, 12, function(cv)
      local P = R.painter(cv)
      local fl = (t % 2) * 1.5
      P.poly({ { 13, 2 }, { 0, 4 + fl }, { 4, 6 }, { 0, 8 - fl }, { 13, 10 } }, FX_R)
      P.ellipse(14, 6, 5, 4.6, FX_O)
      P.poly({ { 13, 4 }, { 5, 5.5 + fl * 0.5 }, { 13, 8 } }, FX_O)
      P.ellipse(15, 6, 3, 2.8, FX_Y)
      P.ellipse(15.5, 5.6, 1.4, 1.2, FX_W)
    end, { noOutline = true, noInner = true })
  end
  R.save(out, src, 'fx_fireball', imgs, 70, { burn = { 0, 3, 14, true } })
end

local function fx(key, w, h, draw) R.save(out, src, key, { R.frame(w, h, draw, { noInner = true }) }) end

fx('fx_arrow', 22, 7, function(cv)
  local P = R.painter(cv)
  P.capsule(3, 3.5, 17, 3.5, 0.55, M('shaft', '#a87a4a'))
  P.poly({ { 16.5, 1 }, { 21.5, 3.5 }, { 16.5, 6 } }, M('head', '#d8dce8'))
  P.poly({ { 0, 1 }, { 5, 3.5 }, { 0, 6 } }, M('fletch', '#e04a4a'))
end)
fx('fx_bolt', 22, 5, function(cv)
  local P = R.painter(cv)
  P.capsule(1, 2.5, 17, 2.5, 0.8, M('shaft', '#6a6f80'))
  P.poly({ { 16, 0 }, { 21.5, 2.5 }, { 16, 5 } }, M('head', '#e8ecf6'))
end)
fx('fx_ice', 14, 14, function(cv)
  local P = R.painter(cv)
  P.poly({ { 7, 0.5 }, { 11, 7 }, { 7, 13.5 }, { 3, 7 } }, glow('ice', '#9be7ff'))
  P.poly({ { 7, 2 }, { 8.6, 7 }, { 7, 11 } }, glow('iceW', '#f0ffff'))
end, nil)
fx('fx_orb', 12, 12, function(cv)
  local P = R.painter(cv)
  P.ellipse(6, 6, 5.5, 5.5, glow('orbO', '#d0d0d0'))
  P.ellipse(5.5, 5.5, 3.4, 3.4, glow('orbM', '#f0f0f0'))
  P.ellipse(5, 5, 1.6, 1.6, WHITE)
end)
fx('fx_heal', 14, 14, function(cv)
  local P = R.painter(cv)
  local g = glow('heal', '#5af08a')
  P.rect(5, 1, 4, 12, g); P.rect(1, 5, 12, 4, g)
  P.rect(6, 2, 2, 10, glow('healW', '#d8ffe0')); P.rect(2, 6, 10, 2, glow('healW', '#d8ffe0'))
end)
fx('fx_star', 11, 11, function(cv)
  local P = R.painter(cv)
  P.poly({ { 5.5, 0 }, { 6.8, 4.2 }, { 11, 5.5 }, { 6.8, 6.8 }, { 5.5, 11 }, { 4.2, 6.8 }, { 0, 5.5 }, { 4.2, 4.2 } }, FX_Y)
  P.ellipse(5.5, 5.5, 1.4, 1.4, FX_W)
end)
fx('fx_bigbolt', 56, 16, function(cv)
  local P = R.painter(cv)
  P.poly({ { 0, 4 }, { 18, 6.5 }, { 18, 9.5 }, { 0, 12 } }, glow('trail', '#ffe8a0'))
  P.capsule(10, 8, 44, 8, 2.2, GOLD)
  P.poly({ { 42, 2 }, { 55.5, 8 }, { 42, 14 } }, M('tip', '#fff2b0'))
  P.capsule(14, 7, 44, 7, 0.6, glow('edge', '#ffffff'))
end)
fx('ui_heart', 11, 10, function(cv)
  local P = R.painter(cv)
  local h = M('heart', '#ff4a78')
  P.ellipse(3, 3.2, 3, 3, h); P.ellipse(8, 3.2, 3, 3, h)
  P.poly({ { 0.2, 4 }, { 10.8, 4 }, { 5.5, 9.8 } }, h)
  P.px(2.4, 2.2, WHITE)
end)
fx('fx_coin', 10, 10, function(cv)
  local P = R.painter(cv)
  P.ellipse(5, 5, 4.6, 4.6, GOLD)
  P.rect(4, 2.5, 2, 5, M('coinD', '#c8902a'))
end)

return true
