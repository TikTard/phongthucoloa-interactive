-- Anime-chibi heroes, viewer soldiers and Thánh Gióng.
local R = ...

local M = R.mat
local F = R.flat

local SKIN = M('skin', '#f8cfae', { light = 0.8 })
local SKIN_DARK = M('skin', '#e9b48f', { light = 0.8 })
local MOUTH = F('mouth', '#b8545a')
local BLUSH = F('blush', '#f6a3a8')
local LASH = F('lash', '#1d1230')
local PUPIL = F('pupil', '#160c24')
local WHITE = F('white', '#ffffff')
local GOLD = M('gold', '#f2c443')
local METAL = M('metal', '#aeb8cc')
local WOOD = M('wood', '#8a5a34')
local WOOD_DARK = M('wood', '#5e3b22')
local STRING = F('string', '#efe6d0')
local RED = M('red', '#d23c3c')

local function glow(name, h) return R.mat(name, h, { noline = true, nooutline = true, light = 1.4 }) end

-- 4x5 anime eye. iris = material with ramp
local function toHex(c) return string.format('#%02x%02x%02x', math.floor(c[1]), math.floor(c[2]), math.floor(c[3])) end
local function eyePal(iris)
  return {
    k = LASH, P = PUPIL, W = WHITE,
    D = F('irisD', toHex(iris.ramp[1])),
    M = F('irisM', toHex(iris.ramp[3])),
    L = F('irisL', toHex(iris.ramp[5])),
  }
end
local EYE_L = { "kkkk.", "WDDDk", "DPPM.", "MMML.", ".LL.." }
local EYE_R = { ".kkkk", "kDDDW", ".MPPD", ".LMMM", "..LL." }
local EYE_L_CLOSED = { ".....", ".....", "kkkk.", ".kk..", "....." } -- happy ^^ when attacking
local EYE_R_CLOSED = { ".....", ".....", ".kkkk", "..kk.", "....." }
local EYE_L_FIERCE = { "kk...", "WkkDk", "DPPM.", "MMML.", ".LL.." }
local EYE_R_FIERCE = { "...kk", "kDkkW", ".MPPD", ".LMMM", "..LL." }

local function shineArc(U, cx, cy, rx, mat)
  for i = -rx, rx do
    local y = cy + (i * i) / (rx * 2.2)
    U.recolor(cx + i, y, cx + i, y + 0.6, mat, 5)
    if math.abs(i) < rx - 1 then U.recolor(cx + i, y + 1, cx + i, y + 1.4, mat, 4) end
  end
end

---------------------------------------------------------------------------
-- hair styles
---------------------------------------------------------------------------
local HAIR_BACK = {
  long = function(U, hair, sway)
    U.poly({ { 12, 10 }, { 33, 10 }, { 35.5, 33 + sway }, { 28, 36 }, { 17, 36 }, { 9.5, 33 - sway } }, hair)
  end,
  ponytail = function(U, hair, sway)
    U.curve({ { 31, 8 }, { 36, 12 }, { 38 + sway, 20 }, { 37 + sway, 28 } }, 2.6, hair)
  end,
}

local HAIR_FRONT = {
  short = function(U, hair)
    U.ellipse(22.5, 9.5, 10.8, 6.6, hair)
    for _, t in ipairs({
      { { 12, 14 }, { 14.5, 6 }, { 17.5, 13 } }, { { 16, 13 }, { 19.5, 4 }, { 21.5, 13.5 } },
      { { 20.5, 13 }, { 25, 3.5 }, { 25.5, 14 } }, { { 24.5, 12.5 }, { 29.5, 5 }, { 29.5, 14 } },
      { { 28, 13 }, { 32.5, 7 }, { 33.5, 15.5 } }, { { 15, 6 }, { 17, -0.5 }, { 22, 4.5 } },
      { { 21, 4.5 }, { 27.5, -0.5 }, { 28, 6 } },
    }) do U.poly(t, hair) end
    U.capsule(13.3, 10, 12.8, 19, 1.5, hair)
    U.capsule(31.7, 10, 32.2, 19, 1.5, hair)
    shineArc(U, 22.5, 6.2, 6, hair)
  end,
  long = function(U, hair)
    U.ellipse(22.5, 9, 11, 6.8, hair)
    for i = 0, 4 do
      local x0 = 12.5 + i * 4.2
      U.poly({ { x0, 7.5 }, { x0 + 5.5, 7.5 }, { x0 + 2.8 + (i - 2) * 0.4, 15.5 } }, hair)
    end
    U.capsule(13, 10, 12, 27, 2.1, hair)
    U.capsule(32, 10, 33, 27, 2.1, hair)
    shineArc(U, 22.5, 5.6, 6, hair)
  end,
  ponytail = function(U, hair)
    U.ellipse(22.5, 9, 11, 6.8, hair)
    for i = 0, 4 do
      local x0 = 12.5 + i * 4.2
      U.poly({ { x0, 7.5 }, { x0 + 5.5, 7.5 }, { x0 + 3.4, 14.5 - (i % 2) * 2 } }, hair)
    end
    U.capsule(13, 10, 12.6, 20, 1.7, hair)
    U.capsule(32, 10, 32.4, 20, 1.7, hair)
    U.ellipse(31.5, 7.5, 2, 2, R.mat('tie', '#e04a5a'))
    shineArc(U, 22.5, 5.6, 6, hair)
  end,
  topknot = function(U, hair)
    U.ellipse(22.5, 9.5, 10.2, 6.2, hair)
    U.ellipse(22.5, 2.8, 3.4, 2.8, hair)
    U.capsule(17.5, 2.6, 27.5, 2.2, 0.7, GOLD)
    U.capsule(13.5, 10, 13, 17, 1.5, hair)
    U.capsule(31.5, 10, 32, 17, 1.5, hair)
    shineArc(U, 22.5, 6, 5, hair)
  end,
  bald = function() end,
  messy = function(U, hair)
    U.ellipse(22.5, 9.5, 11, 6.6, hair)
    for _, t in ipairs({
      { { 11, 12 }, { 12.5, 4 }, { 17, 10 } }, { { 15, 11 }, { 18, 2 }, { 22, 10 } },
      { { 21, 10 }, { 26, 1 }, { 27, 10 } }, { { 26, 10 }, { 32, 3 }, { 32, 12 } },
      { { 30, 11 }, { 35, 8 }, { 33, 16 } }, { { 14, 14 }, { 18, 9 }, { 19.5, 14.5 } }, { { 25, 14 }, { 28, 9 }, { 30.5, 14.5 } },
    }) do U.poly(t, hair) end
    shineArc(U, 22.5, 6, 6, hair)
  end,
}

---------------------------------------------------------------------------
-- headgear
---------------------------------------------------------------------------
local HEADGEAR = {
  nonla = function(U, m)
    U.ellipse(22.5, 12.5, 15.8, 2.6, m.straw, { shade = 0.42 })
    U.poly({ { 7.5, 12.4 }, { 37.5, 12.4 }, { 22.5, -1.5 } }, m.straw)
    U.capsule(13.5, 10.6, 31.5, 10.6, 0.9, m.trim)
    U.curve({ { 14, 13 }, { 15.5, 19 }, { 18, 23 } }, 0.45, m.strap)
  end,
  helmet = function(U, m)
    U.ellipse(22.5, 9, 11.2, 8, m.helm)
    U.rect(11.2, 10, 22.6, 2.6, m.helm, { shade = 0.45 })
    U.poly({ { 20.5, 2.5 }, { 24.5, 2.5 }, { 23.5, -2 }, { 21.5, -2 } }, m.trim)
    U.capsule(15, 6, 19, 3.5, 0.6, m.helm, { shade = 1 })
  end,
  wizard = function(U, m)
    U.ellipse(22.5, 10, 14.2, 2.8, m.top, { shade = 0.4 })
    U.poly({ { 12.5, 9.8 }, { 32.5, 9.8 }, { 31, 3 }, { 37, -1 }, { 27, 0.5 } }, m.top)
    U.rect(12.8, 7.2, 19.6, 2.4, m.trim)
    U.px(22.5, 8, GOLD, 1)
  end,
  tiara = function(U, m)
    U.poly({ { 22.5, -0.5 }, { 25, 3.5 }, { 22.5, 7 }, { 20, 3.5 } }, m.ice)
    U.poly({ { 17.5, 2.5 }, { 19.5, 5 }, { 17.5, 7.5 }, { 15.5, 5 } }, m.ice)
    U.poly({ { 27.5, 2.5 }, { 29.5, 5 }, { 27.5, 7.5 }, { 25.5, 5 } }, m.ice)
    U.capsule(15, 6.6, 30, 6.6, 0.7, m.trim)
  end,
  headband = function(U, m, sway)
    U.rect(12.6, 8.8, 19.8, 2.6, m.trim)
    U.curve({ { 32, 10 }, { 36, 12 + sway }, { 39.5, 10.5 + sway } }, 0.9, m.trim)
    U.curve({ { 32, 10.5 }, { 35, 14 + sway }, { 38.5, 15 + sway } }, 0.8, m.trim)
  end,
  turban = function(U, m)
    U.ellipse(22.5, 7.5, 11.4, 6.6, m.turban)
    U.capsule(12.5, 9, 31.5, 5.5, 1.0, m.turban, { shade = 0.3 })
    U.capsule(13.5, 5, 30, 10, 0.9, m.turban, { shade = 0.35 })
    U.ellipse(22.5, 9.2, 1.7, 1.7, m.gem)
  end,
  goggles = function(U, m)
    U.rect(12.4, 8.4, 20.2, 2.2, m.strap)
    U.ellipse(18.2, 9.2, 2.8, 2.5, m.trim)
    U.ellipse(26.8, 9.2, 2.8, 2.5, m.trim)
    U.ellipse(18.2, 9.2, 1.7, 1.5, m.lens)
    U.ellipse(26.8, 9.2, 1.7, 1.5, m.lens)
  end,
  none = function() end,
}

---------------------------------------------------------------------------
-- weapons. return right-hand position; draw(U, mats, a) where a = nil (idle) or 0/1/2 (attack)
---------------------------------------------------------------------------
local function staffBody(U, m, x1, y1, x2, y2)
  U.capsule(x1, y1, x2, y2, 1.15, m.staff)
end

local WEAPONS = {
  bow = function(U, m, a)
    if a == 0 then
      U.curve({ { 33, 14 }, { 37.5, 20 }, { 39, 30 }, { 37.5, 40 }, { 33, 46 } }, 1.2, WOOD)
      U.capsule(33, 14.5, 27, 30, 0.45, STRING); U.capsule(27, 30, 33, 45.5, 0.45, STRING)
      U.capsule(26, 30, 43, 30, 0.6, WOOD_DARK)
      U.poly({ { 42.5, 28.4 }, { 46.5, 30 }, { 42.5, 31.6 } }, METAL)
      U.poly({ { 25, 28.2 }, { 28.5, 30 }, { 25, 31.8 } }, RED)
      return 27.5, 30.5
    end
    U.curve({ { 33, 14 }, { 37, 20 }, { 38.3, 30 }, { 37, 40 }, { 33, 46 } }, 1.2, WOOD)
    U.capsule(33, 14.5, 33, 45.5, 0.45, STRING)
    if a == 1 then
      local g = glow('spark', '#fff1a8')
      U.capsule(40, 30, 47, 30, 0.7, g)
      U.px(44, 27, g, 1); U.px(45, 33, g, 1)
    end
    return 36.5, 31
  end,

  crossbow = function(U, m, a)
    local dx = a == 1 and -1.5 or 0
    U.capsule(21 + dx, 31.5, 41 + dx, 30.5, 1.5, WOOD)
    U.curve({ { 38 + dx, 23 }, { 40.5 + dx, 26.5 }, { 41 + dx, 30.5 }, { 40.5 + dx, 34.5 }, { 38 + dx, 38 } }, 1.1, METAL)
    if a == 1 then
      U.capsule(38 + dx, 23.5, 38 + dx, 37.5, 0.45, STRING)
      local g = glow('flash', '#fff6c0')
      U.ellipse(45.5, 30.5, 2.4, 2.4, g)
    else
      U.capsule(38, 23.5, 33, 30.5, 0.45, STRING); U.capsule(33, 30.5, 38, 37.5, 0.45, STRING)
      U.capsule(31, 29.6, 44, 29.6, 0.6, METAL)
      U.poly({ { 43.5, 28.3 }, { 46.8, 29.6 }, { 43.5, 30.9 } }, METAL)
    end
    return 27 + dx, 33
  end,

  orbstaff = function(U, m, a)
    local function head(cx, cy, big)
      if m.kind == 'fire' then
        U.curve({ { cx - 3.5, cy + 3 }, { cx - 3.8, cy - 1 }, { cx - 2, cy - 3 } }, 0.7, GOLD)
        U.curve({ { cx + 3.5, cy + 3 }, { cx + 3.8, cy - 1 }, { cx + 2, cy - 3 } }, 0.7, GOLD)
        U.ellipse(cx, cy, 3.2 + big, 3.2 + big, m.orb)
        if big > 0 then
          U.poly({ { cx - 2.5, cy - 2 }, { cx, cy - 8 - big }, { cx + 2.5, cy - 2 } }, m.orb)
          U.poly({ { cx - 4, cy - 1 }, { cx - 5.5, cy - 6 }, { cx - 1.5, cy - 3 } }, m.orb)
        end
      elseif m.kind == 'ice' then
        U.poly({ { cx, cy - 6 - big }, { cx + 3 + big * 0.5, cy }, { cx, cy + 5 }, { cx - 3 - big * 0.5, cy } }, m.orb)
        if big > 0 then
          U.poly({ { cx - 6, cy - 4 }, { cx - 4.5, cy - 2 }, { cx - 6, cy } }, m.orb)
          U.poly({ { cx + 6, cy - 4 }, { cx + 7.5, cy - 2 }, { cx + 6, cy } }, m.orb)
        end
      elseif m.kind == 'thunder' then
        U.ellipse(cx, cy, 3.6 + big * 0.5, 3.6 + big * 0.5, GOLD)
        U.ellipse(cx, cy, 2 + big * 0.4, 2 + big * 0.4, m.orb)
        if big > 0 then
          U.curve({ { cx + 2, cy - 4 }, { cx + 5, cy - 8 }, { cx + 3, cy - 9 }, { cx + 7, cy - 14 } }, 0.6, m.orb)
          U.curve({ { cx - 2, cy - 4 }, { cx - 5, cy - 7 }, { cx - 3, cy - 9 }, { cx - 6, cy - 12 } }, 0.6, m.orb)
        end
      else -- heal / lotus
        U.ellipse(cx - 2.6, cy, 2, 3, m.orb); U.ellipse(cx + 2.6, cy, 2, 3, m.orb); U.ellipse(cx, cy - 1.2, 2.2, 3.6, m.orb)
        U.ellipse(cx, cy + 2.6, 3.6, 1.2, M('leaf', '#4caa5a'))
        if big > 0 then
          local g = glow('sparkle', '#d8ffd0')
          for _, p in ipairs({ { -6, -5 }, { 6, -6 }, { 0, -10 }, { -7, 2 }, { 7, 1 } }) do U.px(cx + p[1], cy + p[2], g, 1) end
        end
      end
    end
    if a == 0 then
      staffBody(U, m, 34, 11, 33.5, 44); head(34.2, 8, 1.5); return 33.6, 27
    elseif a == 1 then
      staffBody(U, m, 27, 38, 41, 17); head(42, 14, 2.5); return 32, 30
    end
    staffBody(U, m, 34, 15, 33.5, 46); head(34.4, 11.5, 0); return 33.6, 30
  end,

  longstaff = function(U, m, a, sway)
    local hx, hy = 34, 31
    local ends
    if a == 0 then ends = { { hx - 16, hy - 15 }, { hx + 10, hy + 9 } }
    elseif a == 1 then
      local trail = glow('trail', '#ffd9a0')
      U.curve({ { 6, 22 }, { 12, 14 }, { 22, 9 }, { 33, 9 } }, 0.8, trail)
      ends = { { 4, hy }, { 46, hy } }
    elseif a == 2 then ends = { { hx - 15, hy + 13 }, { hx + 11, hy - 12 } }
    else ends = { { 36, 4 }, { 35, 46 } } end
    U.capsule(ends[1][1], ends[1][2], ends[2][1], ends[2][2], 1.15, WOOD)
    U.ellipse(ends[1][1], ends[1][2], 1.8, 1.8, GOLD)
    U.ellipse(ends[2][1], ends[2][2], 1.8, 1.8, GOLD)
    if not a then return 35.3, 30 end
    return hx, hy
  end,

  cannon = function(U, m, a)
    local r = a == 0 and -2 or 0
    local CAN = M('cannon', '#4a4f63')
    U.capsule(21 + r, 25, 42 + r, 20.5, 3.3, CAN)
    U.capsule(26 + r, 23.4, 26.6 + r, 27.4, 1, GOLD)
    U.capsule(35 + r, 21.3, 35.6 + r, 25.3, 1, GOLD)
    U.ellipse(42.8 + r, 20.4, 2.6, 3.6, M('cannonMouth', '#2a2d3a'))
    if a == 0 then
      local g1, g2 = glow('flashO', '#ff9a3a'), glow('flashY', '#fff3a0')
      U.poly({ { 44, 14 }, { 48, 20.5 }, { 44, 27 }, { 46, 20.5 } }, g1)
      U.ellipse(46, 20.5, 2.2, 2.6, g2)
    elseif a == 1 then
      local smoke = R.mat('smoke', '#b9b4c8', { noline = true, nooutline = true })
      U.ellipse(45, 18, 2.6, 2.4, smoke); U.ellipse(42.5, 14.5, 2, 1.8, smoke)
    end
    return 32 + r, 27
  end,
}

---------------------------------------------------------------------------
-- the chibi body
---------------------------------------------------------------------------
-- spec: { skin, hair, hairStyle, iris, top, bottom, boots, robe, trim, armor, cape, headgear, weapon, extra, mats }
-- f:    { by, sway, a (attack index or nil), face = 'normal'|'happy'|'fierce' }
local function human(cv, spec, f, ox, oy, k)
  ox, oy, k = ox or 0, oy or 0, k or 1
  local P = R.painter(cv, ox, oy, k)
  local U = R.painter(cv, ox, oy + (f.by or 0) * k, k)
  local sway = f.sway or 0
  local m = spec.mats

  -- behind the body
  if spec.cape then
    U.poly({ { 15.5, 26.5 }, { 29.5, 26.5 }, { 34 + sway, 44.5 }, { 22.5, 46 }, { 11 + sway, 44.5 } }, spec.cape)
  end
  if HAIR_BACK[spec.hairStyle] then HAIR_BACK[spec.hairStyle](U, spec.hair, sway) end

  -- legs
  if not spec.seated then
    P.capsule(19.6, 37, 19.2, 44, 2.3, spec.bottom)
    P.capsule(25.4, 37, 25.8, 44, 2.3, spec.bottom)
    P.ellipse(18.9, 45.3, 3.1, 1.9, spec.boots)
    P.ellipse(26.3, 45.3, 3.1, 1.9, spec.boots)
  end

  -- torso
  if spec.robe then
    U.poly({ { 16, 32 }, { 29, 32 }, { 32.5, 43.5 }, { 22.5, 44.5 }, { 12.5, 43.5 } }, spec.top)
  end
  U.ellipse(22.5, 31, 7.4, 6.9, spec.top)
  if spec.armor then
    U.poly({ { 17.3, 26.8 }, { 27.7, 26.8 }, { 27.3, 33.5 }, { 22.5, 35 }, { 17.7, 33.5 } }, spec.armor)
    U.capsule(19, 29.5, 26, 29.5, 0.5, spec.trim)
  end
  U.capsule(18.5, 25.6, 26.5, 25.6, 1.1, spec.trim)
  U.rect(15.6, 34.2, 13.8, 2.2, spec.trim)
  U.rect(21.4, 34, 2.2, 2.6, GOLD)
  if spec.extra then spec.extra(U, f) end

  -- left arm
  U.capsule(16, 27.5, 13.3, 34.5, 2.1, spec.sleeve or spec.top)
  U.ellipse(13.2, 35.8, 1.9, 1.9, spec.skin)
  if spec.armor then
    U.ellipse(15.3, 27.2, 3.4, 2.7, spec.armor)
    U.ellipse(29.7, 27.2, 3.4, 2.7, spec.armor)
  end

  -- head
  U.rect(21, 22.6, 3, 3.4, spec.skin, { shade = 0.3 })
  U.ellipse(22.5, 14.8, 9.6, 9.1, spec.skin)
  U.poly({ { 14, 15 }, { 31, 15 }, { 28, 21.4 }, { 22.5, 24.2 }, { 17, 21.4 } }, spec.skin, { shade = 0.66 })
  -- face
  local pal = eyePal(spec.iris)
  local face = f.face or 'normal'
  local el = face == 'happy' and EYE_L_CLOSED or face == 'fierce' and EYE_L_FIERCE or EYE_L
  local er = face == 'happy' and EYE_R_CLOSED or face == 'fierce' and EYE_R_FIERCE or EYE_R
  U.stamp(16, 15.5, el, pal)
  U.stamp(24, 15.5, er, pal)
  if spec.hairStyle ~= 'bald' then
    U.capsule(16.6, 14, 19.4, 13.6, 0.5, spec.hair, { shade = 0.15 })
    U.capsule(25.6, 13.6, 28.4, 14, 0.5, spec.hair, { shade = 0.15 })
  else
    U.capsule(16.6, 14, 19.4, 13.6, 0.5, SKIN_DARK, { shade = 0 })
    U.capsule(25.6, 13.6, 28.4, 14, 0.5, SKIN_DARK, { shade = 0 })
  end
  U.px(16.4, 21, BLUSH); U.px(17.4, 21, BLUSH); U.px(27.6, 21, BLUSH); U.px(28.6, 21, BLUSH)
  if f.a == 1 then U.px(22, 22.3, MOUTH); U.px(23, 22.3, MOUTH); U.px(22.5, 23.2, MOUTH)
  else U.px(22.2, 22.4, MOUTH); U.px(23.2, 22.4, MOUTH) end
  if spec.beard then
    U.poly({ { 16.5, 20.5 }, { 28.5, 20.5 }, { 26.5, 27 }, { 22.5, 32 }, { 18.5, 27 } }, spec.hair)
    U.capsule(18, 21.8, 27, 21.8, 0.8, spec.hair, { shade = 0.9 })
  end

  -- front hair + headgear
  HAIR_FRONT[spec.hairStyle](U, spec.hair)
  HEADGEAR[spec.headgear or 'none'](U, m, sway)
  if spec.crown then
    U.poly({ { 24.5, 4.5 }, { 31, 4.5 }, { 31.5, 0.5 }, { 29.5, 2.5 }, { 27.8, -0.5 }, { 26, 2.5 }, { 24, 0.5 } }, GOLD)
    U.px(27.8, 3, R.flat('ruby', '#ff3060'), 1)
  end

  -- right arm + weapon
  local hx, hy = WEAPONS[spec.weapon](U, m, f.a, sway)
  U.capsule(29, 27.5, hx, hy, 2.1, spec.sleeve or spec.top)
  U.ellipse(hx, hy + 0.6, 1.9, 1.9, spec.skin)
  if spec.weaponFront then spec.weaponFront(U, f) end
end

---------------------------------------------------------------------------
-- hero designs
---------------------------------------------------------------------------
local TIERS = {
  { armor = '#8a6440', trim = '#c9a06b' },
  { armor = '#4fa070', trim = '#d8e07a' },
  { armor = '#7f98b8', trim = '#e8eef6', cape = '#3a5a9a' },
  { armor = '#b8503a', trim = '#f0b848', cape = '#a02030' },
  { armor = '#f0c040', trim = '#fff2b0', cape = '#f4f0ff', crown = true },
}

local HEROES = {
  cungthu = { hair = '#3b2a20', hairStyle = 'short', iris = '#3d9a4a', top = '#4f9a4a', bottom = '#6b4a2f', boots = '#4a3020',
    headgear = 'nonla', weapon = 'bow', mats = { straw = M('straw', '#e2c27a'), strap = M('strap', '#8a6a40') } },
  nothu = { hair = '#2a2235', hairStyle = 'ponytail', iris = '#3b6fd1', top = '#3a6fb0', bottom = '#2f3a5a', boots = '#2a2a3a',
    headgear = 'helmet', weapon = 'crossbow', mats = { helm = M('helm', '#9aa6bc') } },
  hoasu = { hair = '#e0603a', hairStyle = 'long', iris = '#f09a20', top = '#b8323a', bottom = '#6a1a2a', boots = '#4a1a1a', robe = true,
    headgear = 'wizard', weapon = 'orbstaff', mats = { kind = 'fire', staff = WOOD_DARK, orb = glow('fire', '#ff8a2a') } },
  bangnu = { hair = '#d8ecff', hairStyle = 'long', iris = '#2ab0e8', top = '#7ec8f0', bottom = '#3a78b0', boots = '#2a4a7a', robe = true,
    headgear = 'tiara', weapon = 'orbstaff', mats = { kind = 'ice', staff = M('silver', '#c8d4e8'), orb = glow('ice', '#9be7ff'), ice = glow('ice', '#bdf2ff') } },
  loisu = { hair = '#f2f0f6', hairStyle = 'topknot', iris = '#e0b020', top = '#6a3fa0', bottom = '#3a2260', boots = '#2a1a40', robe = true, beard = true,
    headgear = 'none', weapon = 'orbstaff', mats = { kind = 'thunder', staff = WOOD_DARK, orb = glow('bolt', '#fff27a') } },
  vosu = { hair = '#f8cfae', hairStyle = 'bald', iris = '#8a5a2a', top = '#e07a20', bottom = '#a04a10', boots = '#5a3a20',
    headgear = 'headband', weapon = 'longstaff', mats = {} },
  luongy = { hair = '#4a2a1a', hairStyle = 'long', iris = '#3aa060', top = '#f2eee2', bottom = '#4c8a5a', boots = '#3a5a3a', robe = true, sleeve = '#e8e2d2',
    headgear = 'turban', weapon = 'orbstaff', mats = { kind = 'heal', staff = WOOD, orb = glow('lotus', '#ff9ec8'), turban = M('turban', '#4caa6a'), gem = R.flat('gem', '#ff4a7a') },
    extra = function(U) U.ellipse(16.5, 38.5, 2.2, 2.6, M('gourd', '#d8a040')); U.ellipse(16.5, 35.6, 1.4, 1.4, M('gourd', '#d8a040')) end },
  phaothu = { hair = '#a0522d', hairStyle = 'messy', iris = '#8a4a1a', top = '#8a5a34', bottom = '#4a4f63', boots = '#3a2a20',
    headgear = 'goggles', weapon = 'cannon', mats = { strap = M('strap', '#5a3a20'), lens = glow('lens', '#7fe0ff') } },
}
local HERO_ORDER = { 'cungthu', 'nothu', 'hoasu', 'bangnu', 'loisu', 'vosu', 'luongy', 'phaothu' }

local function buildSpec(def, tierIndex)
  local t = TIERS[tierIndex]
  local spec = {}
  for k, v in pairs(def) do spec[k] = v end
  spec.skin = SKIN
  spec.hair = M('hair', def.hair, { light = 1.1 })
  spec.iris = R.mat('iris', def.iris)
  spec.top = M('top', def.top)
  spec.sleeve = def.sleeve and M('sleeve', def.sleeve) or nil
  spec.bottom = M('bottom', def.bottom)
  spec.boots = M('boots', def.boots)
  spec.trim = M('trim', t.trim)
  spec.armor = tierIndex >= 2 and M('armor', t.armor) or nil
  spec.cape = t.cape and M('cape', t.cape) or nil
  spec.crown = t.crown
  spec.mats = {}
  for k, v in pairs(def.mats or {}) do spec.mats[k] = v end
  spec.mats.trim = spec.trim
  spec.mats.top = spec.top
  if def.headgear == 'helmet' and tierIndex >= 3 then spec.mats.helm = M('helm', t.armor) end
  return spec
end

local IDLE = { { by = 0, sway = 0 }, { by = 0, sway = 1 }, { by = 1, sway = 0 }, { by = 1, sway = -1 } }
local ATTACK = { { by = -1, a = 0, face = 'fierce' }, { by = 0, a = 1, face = 'fierce' }, { by = 0, a = 2 } }

local function heroFrames(spec)
  local imgs = {}
  for _, f in ipairs(IDLE) do imgs[#imgs + 1] = R.frame(48, 48, function(cv) human(cv, spec, f) end) end
  for _, f in ipairs(ATTACK) do imgs[#imgs + 1] = R.frame(48, 48, function(cv) human(cv, spec, f) end) end
  return imgs
end

local out, src = R.outDir, R.srcDir
for _, id in ipairs(HERO_ORDER) do
  for t = 1, 5 do
    R.save(out, src, 'hero_' .. id .. '_' .. t, heroFrames(buildSpec(HEROES[id], t)), 160,
      { idle = { 0, 3, 5, true }, attack = { 4, 6, 12, false } })
  end
end

---------------------------------------------------------------------------
-- viewer soldiers 24x28 — a chunkier chibi, one look per rank
---------------------------------------------------------------------------
local SOLDIER_LOOKS = {
  { tunic = '#8a6440', hat = 'nonla', hatc = '#e2c27a' },
  { tunic = '#4fa070', hat = 'band', hatc = '#d8e07a' },
  { tunic = '#5f7fa8', hat = 'helm', hatc = '#aeb8cc' },
  { tunic = '#b8503a', hat = 'plume', hatc = '#c8a050' },
  { tunic = '#e8b830', hat = 'gold', hatc = '#ffd860' },
  { tunic = '#3fbfa0', hat = 'leaf', hatc = '#7fe0b0' }, -- recruit
}

local function soldier(cv, look, f)
  local P = R.painter(cv, 0, 0, 1)
  local U = R.painter(cv, 0, f.by or 0, 1)
  local tunic = M('tunic', look.tunic)
  local hatc = M('hat', look.hatc)
  local pants = M('pants', '#4a3a3a')
  -- spear
  local sy = f.cheer and -3 or 0
  U.capsule(20, 4 + sy, 20, 27 + sy, 0.75, WOOD)
  U.poly({ { 18.6, 5 + sy }, { 21.4, 5 + sy }, { 20, 0 + sy } }, METAL)
  U.px(20, 6 + sy, RED, 0.6)
  -- legs + body
  P.capsule(10, 21, 9.6, 25.5, 1.6, pants)
  P.capsule(14, 21, 14.4, 25.5, 1.6, pants)
  P.ellipse(9.3, 26.3, 2.1, 1.3, M('boots', '#3a2a20'))
  P.ellipse(14.7, 26.3, 2.1, 1.3, M('boots', '#3a2a20'))
  U.ellipse(12, 19, 5.2, 4.8, tunic)
  U.rect(7.4, 20.6, 9.2, 1.5, M('belt', '#5a3a20'))
  U.capsule(8, 17, 6.4, 21, 1.4, tunic)
  U.ellipse(6.4, 21.6, 1.3, 1.3, SKIN)
  -- head
  U.ellipse(12, 10.4, 6.6, 6.2, SKIN)
  local hair = M('hair', '#3a2a22')
  U.ellipse(12, 6.2, 6.8, 3.4, hair)
  U.poly({ { 5.8, 9 }, { 7.6, 4.5 }, { 10, 8.4 } }, hair)
  U.poly({ { 14, 8.4 }, { 16.4, 4.5 }, { 18.2, 9 } }, hair)
  local eyes = { k = LASH, W = WHITE, D = R.flat('i', '#4a5aa8'), L = R.flat('l', '#8ab4e8') }
  U.stamp(8, 10, { "kk", "DW", "LL" }, eyes)
  U.stamp(14, 10, { "kk", "WD", "LL" }, eyes)
  U.px(12, 14.2, MOUTH)
  U.px(8, 13.4, BLUSH); U.px(16, 13.4, BLUSH)
  -- hats per rank
  if look.hat == 'nonla' then
    U.ellipse(12, 7, 9.5, 1.6, hatc, { shade = 0.45 })
    U.poly({ { 2.5, 7 }, { 21.5, 7 }, { 12, -1 } }, hatc)
  elseif look.hat == 'band' or look.hat == 'leaf' then
    U.rect(5.6, 5.8, 12.8, 1.8, hatc)
    U.curve({ { 18, 6.6 }, { 21, 8 + (f.by or 0) } }, 0.6, hatc)
    if look.hat == 'leaf' then U.poly({ { 14, 5.5 }, { 17, 1 }, { 18.5, 5 } }, M('leaf', '#4caa5a')) end
  else
    U.ellipse(12, 6.2, 7.2, 5, hatc)
    U.rect(4.6, 6.4, 14.8, 1.6, hatc, { shade = 0.45 })
    if look.hat == 'plume' then U.curve({ { 12, 1.5 }, { 9, -0.5 }, { 6, 0.5 } }, 1.1, RED) end
    if look.hat == 'gold' then
      U.poly({ { 9.5, 2 }, { 14.5, 2 }, { 15, -1 }, { 13.4, 0.5 }, { 12, -1.5 }, { 10.6, 0.5 }, { 9, -1 } }, GOLD)
    end
  end
  -- right arm holding spear
  local hy = f.cheer and 13 or 17
  U.capsule(15.5, 16.5, 19, hy, 1.4, tunic)
  U.ellipse(19.6, hy, 1.4, 1.4, SKIN)
end

for i, look in ipairs(SOLDIER_LOOKS) do
  local frames = {}
  for _, f in ipairs({ { by = 0 }, { by = 1 }, { by = -1, cheer = true } }) do
    frames[#frames + 1] = R.frame(24, 28, function(cv) soldier(cv, look, f) end)
  end
  R.save(out, src, i == 6 and 'soldier_new' or ('soldier_' .. i), frames, 300, { idle = { 0, 1, 3, true }, cheer = { 2, 2, 4, false } })
end

---------------------------------------------------------------------------
-- Thánh Gióng on the iron horse (72x64)
---------------------------------------------------------------------------
local IRON = M('iron', '#5a6680')
local IRON_DARK = M('ironD', '#3e4660')
local FIRE = glow('fire', '#ff8a2a')
local FIRE_Y = glow('fireY', '#ffe36a')

local function giong(cv, f)
  local P = R.painter(cv, 0, 0, 1)
  local lift = ({ 0, -2, -1, 1 })[f + 1]
  local H = R.painter(cv, 0, lift, 1)
  -- legs (gallop cycle)
  local legs = ({
    { { -6, 6 }, { 4, 2 }, { -2, 8 }, { 6, 4 } },
    { { -2, 8 }, { 6, 4 }, { 2, 6 }, { -4, 4 } },
    { { 4, 4 }, { -4, 6 }, { 6, 2 }, { -6, 6 } },
    { { 2, 6 }, { -2, 8 }, { -4, 4 }, { 4, 6 } },
  })[f + 1]
  local hips = { { 18, 40 }, { 24, 41 }, { 42, 41 }, { 48, 40 } }
  for i, h in ipairs(hips) do
    local m = (i == 1 or i == 3) and IRON_DARK or IRON
    H.capsule(h[1], h[2], h[1] + legs[i][1] * 0.6, 49 + legs[i][2] * 0.3, 3.2, m)
    H.capsule(h[1] + legs[i][1] * 0.6, 49 + legs[i][2] * 0.3, h[1] + legs[i][1], 56 + legs[i][2] * 0.4, 2.3, m)
    H.ellipse(h[1] + legs[i][1], 58 + legs[i][2] * 0.4, 3, 1.8, M('hoof', '#2a2d3a'))
  end
  -- fiery tail
  H.poly({ { 14, 34 }, { 2, 30 - lift }, { 6, 36 }, { 0, 40 - lift }, { 12, 40 } }, FIRE)
  H.poly({ { 13, 35 }, { 5, 33 }, { 11, 38 } }, FIRE_Y)
  -- body
  H.ellipse(33, 38, 19, 9, IRON)
  H.poly({ { 44, 34 }, { 52, 22 }, { 58, 22 }, { 54, 38 } }, IRON)
  H.ellipse(59, 22, 7, 5, IRON)
  H.ellipse(64, 24.5, 3.6, 3, IRON_DARK)
  H.poly({ { 53, 17 }, { 55, 12 }, { 57, 18 } }, IRON_DARK)
  H.px(60, 20.5, glow('eyeH', '#ffb43a'), 1); H.px(61, 20.5, glow('eyeH', '#ffb43a'), 1)
  if f % 2 == 0 then H.poly({ { 67, 25 }, { 72, 22 }, { 71.5, 28 } }, FIRE_Y) end
  -- saddle cloth
  H.poly({ { 22, 30 }, { 38, 30 }, { 36, 41 }, { 24, 41 } }, M('saddle', '#b8323a'))
  H.capsule(23, 40.5, 35.5, 40.5, 0.9, GOLD)
  -- rider (upper body of the chibi builder, scaled)
  local spec = buildSpec({ hair = '#2a1e1a', hairStyle = 'short', iris = '#d08020', top = '#6a7590', bottom = '#4a5068', boots = '#2a2d3a',
    headgear = 'helmet', weapon = 'longstaff', mats = { helm = M('helm', '#8a94ae') } }, 5)
  spec.seated = true
  spec.cape = M('cape', '#c83040')
  spec.crown = false
  spec.weapon = 'bamboo'
  WEAPONS.bamboo = function(U, m, a)
    U.capsule(26, 36, 48, 6, 1.4, M('bamboo', '#5cb85c'))
    for i = 1, 4 do local t = i / 5; U.capsule(26 + 22 * t - 1, 36 - 30 * t + 0.7, 26 + 22 * t + 1, 36 - 30 * t - 0.7, 1.5, M('bambooNode', '#3a8a3a')) end
    return 34, 25
  end
  human(cv, spec, { by = 0, face = 'fierce' }, 13, 4 + lift, 0.72)
  -- fire mane drawn last so it flows in front of the rider's legs
  for i = 0, 5 do
    local x, y = 57 - i * 2.4, 17 + i * 3
    H.poly({ { x, y }, { x - 6 - ((f + i) % 2) * 2, y - 3 }, { x - 1.5, y + 3 } }, i % 2 == 0 and FIRE or FIRE_Y)
  end
end

do
  local frames = {}
  for f = 0, 3 do frames[#frames + 1] = R.frame(72, 64, function(cv) giong(cv, f) end) end
  R.save(out, src, 'summon_giong', frames, 110, { run = { 0, 3, 10, true } })
end

return { TIERS = TIERS }
