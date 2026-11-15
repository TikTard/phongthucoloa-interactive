-- Viewer soldier classes (32x32, 6 classes x 3 tiers) and the legend bosses
-- (Ngư Tinh, Hồ Tinh, Mộc Tinh) + the fox minion.
local R = ...
local M, F = R.mat, R.flat
local out, src = R.outDir, R.srcDir

local function glow(name, h) return R.mat(name, h, { noline = true, nooutline = true, light = 1.4 }) end

local SKIN = M('skin', '#f8cfae', { light = 0.8 })
local MOUTH = F('mouth', '#b8545a')
local BLUSH = F('blush', '#f6a3a8')
local LASH = F('lash', '#1d1230')
local PUPIL = F('pupil', '#160c24')
local WHITE = F('white', '#ffffff')
local DARK = F('dark', '#1d1230')
local GOLD = M('gold', '#f2c443')
local METAL = M('metal', '#c4ccdc')
local WOOD = M('wood', '#8a5a34')
local WOOD_DARK = M('wood', '#5e3b22')
local STRING = F('string', '#efe6d0')
local RED = M('red', '#d23c3c')
local BONE = M('bone', '#efe2c4')
local LEAF = M('leaf', '#4caa5a')

---------------------------------------------------------------------------
-- tiers: 1 cloth/leather, 2 silver armour + blue trim, 3 elite gold trim + cape/plume
---------------------------------------------------------------------------
local TIER = {
  { trim = M('trim', '#a87a48'), armor = nil, boots = M('boots', '#4a3020'), belt = M('belt', '#5a3a20') },
  { trim = M('trim', '#4a7ad8'), armor = M('armor', '#aeb8cc'), boots = M('boots', '#3a3a50'), belt = M('belt', '#3a4a7a') },
  { trim = GOLD, armor = M('armor', '#e2e6f0'), boots = M('boots', '#5a2a2a'), belt = M('belt', '#7a2a2a'),
    cape = M('cape', '#c02838'), plume = M('plume', '#e03040') },
}

---------------------------------------------------------------------------
-- frame poses (15 frames: idle 0-3, walk 4-7, attack 8-11, cast 12-14)
---------------------------------------------------------------------------
local POSES = {
  { p = 'idle', by = 0, sway = 0 }, { p = 'idle', by = 0, sway = 1 }, { p = 'idle', by = 1, sway = 0 }, { p = 'idle', by = 1, sway = -1 },
  { p = 'walk', by = 0, step = 2, swing = 1 }, { p = 'walk', by = -1, step = 0, liftR = 2, swing = 0 },
  { p = 'walk', by = 0, step = -2, swing = -1 }, { p = 'walk', by = -1, step = 0, liftL = 2, swing = 0 },
  { p = 'a0', by = 0, lean = -1, face = 'fierce' }, { p = 'a1', by = 0, lean = 1, face = 'fierce', shout = true },
  { p = 'a2', by = 1, lean = 1, face = 'fierce' }, { p = 'a3', by = 0 },
  { p = 'c0', by = 1, face = 'fierce' }, { p = 'c1', by = -1, face = 'happy', shout = true, raise = true }, { p = 'c2', by = -1, face = 'fierce', shout = true, raise = true },
}

local function toHex(c) return string.format('#%02x%02x%02x', math.floor(c[1]), math.floor(c[2]), math.floor(c[3])) end

-- 3x3 chibi eyes
local EYE_L = { "kkk", "DPW", "LDL" }
local EYE_R = { "kkk", "WPD", "LDL" }
local EYE_L_FIERCE = { "kk.", "DkW", "LDL" }
local EYE_R_FIERCE = { ".kk", "WkD", "LDL" }
local EYE_HAPPY_L = { "...", "kkk", "k.k" }
local EYE_HAPPY_R = { "...", "kkk", "k.k" }

local function sparkle(U, x, y, g, big)
  U.px(x, y, g, 1)
  if big then U.px(x - 1, y, g, 1); U.px(x + 1, y, g, 1); U.px(x, y - 1, g, 1); U.px(x, y + 1, g, 1) end
end

---------------------------------------------------------------------------
-- hair + headgear (head centre 16,10.5)
---------------------------------------------------------------------------
local function hairFront(U, hair, style)
  U.ellipse(16, 7, 7.2, 4, hair)
  for _, t in ipairs({
    { { 8.6, 11 }, { 10.4, 4.5 }, { 13.4, 9.4 } }, { { 12, 9.6 }, { 15, 3.4 }, { 17, 9.4 } },
    { { 15.6, 9.4 }, { 19.4, 3.6 }, { 20.6, 9.8 } }, { { 19.2, 9.2 }, { 22, 5 }, { 23.4, 11 } },
  }) do U.poly(t, hair) end
  U.capsule(9.2, 8, 9, 12.5, 1.1, hair)
  U.capsule(22.8, 8, 23, 12.5, 1.1, hair)
  if style == 'topknot' then
    U.ellipse(16, 2.6, 2.6, 2.2, hair)
    U.capsule(13.8, 4.2, 18.2, 4.2, 0.6, GOLD)
  end
  U.recolor(11, 4.5, 21, 5.4, hair, 5)
end

local HEADGEAR = {
  headband = function(U, T, f, m)
    U.rect(8.8, 6.6, 14.4, 1.6, m.band)
    local s = f.sway or 0
    U.curve({ { 9, 7.4 }, { 6.5, 8.5 + s }, { 4.5, 8 + s } }, 0.6, m.band)
    U.curve({ { 9, 7.8 }, { 7, 10.5 + s }, { 5.2, 11 + s } }, 0.55, m.band)
  end,
  helmet = function(U, T, f, m)
    U.ellipse(16, 5.9, 7.6, 4.5, m.helm)
    U.rect(8.4, 6.2, 15.2, 1.6, m.helm, { shade = 0.42 })
    U.capsule(10.5, 4, 13, 2.6, 0.5, m.helm, { shade = 1 })
    if m.tier == 2 then U.capsule(16, 1.8, 16, 6, 0.7, T.trim) end
    if m.tier == 3 then
      U.rect(8.4, 6.2, 15.2, 0.9, GOLD)
      U.curve({ { 16, 1.6 }, { 13, -0.2 }, { 9.5, 0.8 }, { 7.5 + (f.sway or 0) * 0.5, 3 } }, 1.2, T.plume)
      U.px(16, 1.8, GOLD, 1)
    end
  end,
  nonla = function(U, T, f, m)
    U.ellipse(16, 7.4, 10.4, 1.7, m.straw, { shade = 0.45 })
    U.poly({ { 5.6, 7.4 }, { 26.4, 7.4 }, { 16, -0.2 } }, m.straw)
    U.capsule(10.5, 5.6, 21.5, 5.6, 0.55, m.tier == 1 and M('band', '#8a6a40') or T.trim)
    U.curve({ { 10.5, 8.5 }, { 11, 13 }, { 13, 16 } }, 0.4, M('strap', '#8a6a40'))
    if m.tier == 3 then
      U.curve({ { 16, 0 }, { 13.5, -0.5 }, { 11, 1 } }, 0.9, T.plume)
      U.px(16, 0.4, GOLD, 1)
    end
  end,
  wizard = function(U, T, f, m)
    local s = f.sway or 0
    U.poly({ { 9.6, 6.8 }, { 22.4, 6.8 }, { 19.5, 2.2 }, { 13.5 + s * 0.5, -0.4 }, { 15, 3 } }, m.hat)
    U.ellipse(16, 7.2, 9.6, 1.7, m.hat, { shade = 0.4 })
    U.rect(10.2, 5, 11.6, 1.5, T.trim)
    U.px(16, 5.6, m.tier == 1 and F('gem', '#7fe0ff') or GOLD, 1)
    if m.tier == 3 then U.px(13.6 + s * 0.5, 0, glow('star', '#fff6b0'), 1) end
  end,
}

---------------------------------------------------------------------------
-- weapons: draw(U, T, f, m) -> right hand x, y, [frontFn]
---------------------------------------------------------------------------
local function sword(U, T, hx, hy, ang, len, m)
  local a = math.rad(ang)
  local dx, dy = math.cos(a), math.sin(a)
  local tx, ty = hx + dx * len, hy + dy * len
  U.capsule(hx + dx * 2, hy + dy * 2, tx - dx * 1, ty - dy * 1, 1.0, m.blade)
  U.poly({ { tx - dx * 1.5 - dy * 0.9, ty - dy * 1.5 + dx * 0.9 }, { tx + dx * 0.6, ty + dy * 0.6 }, { tx - dx * 1.5 + dy * 0.9, ty - dy * 1.5 - dx * 0.9 } }, m.blade)
  U.capsule(hx + dx * 1.4 - dy * 1.8, hy + dy * 1.4 + dx * 1.8, hx + dx * 1.4 + dy * 1.8, hy + dy * 1.4 - dx * 1.8, 0.6, m.guard)
  U.px(hx - dx * 1.4, hy - dy * 1.4, m.guard, 0.7)
end

local function spear(U, T, x1, y1, x2, y2, m)
  local len = math.sqrt((x2 - x1) ^ 2 + (y2 - y1) ^ 2)
  local dx, dy = (x2 - x1) / len, (y2 - y1) / len
  U.capsule(x1, y1, x2 - dx * 3, y2 - dy * 3, 0.75, m.shaft)
  local bx, by = x2 - dx * 4.2, y2 - dy * 4.2
  U.poly({ { bx - dy * 1.3, by + dx * 1.3 }, { x2, y2 }, { bx + dy * 1.3, by - dx * 1.3 } }, m.blade)
  U.capsule(bx - dy * 0.2, by + dx * 0.2, bx - dx * 1.2 - dy * 1.5, by - dy * 1.2 + dx * 1.5, 0.7, m.tassel)
end

local function bow(U, cx, top, bot, pull, m)
  local mid = (top + bot) / 2
  U.curve({ { cx - 2, top }, { cx + 0.6, top + 4 }, { cx + 1.5, mid }, { cx + 0.6, bot - 4 }, { cx - 2, bot } }, 0.9, m.bow)
  if m.tipc then U.px(cx - 2, top, m.tipc, 1); U.px(cx - 2, bot, m.tipc, 1) end
  if pull then
    U.capsule(cx - 2, top + 0.4, cx - 2 - pull, mid, 0.35, STRING); U.capsule(cx - 2 - pull, mid, cx - 2, bot - 0.4, 0.35, STRING)
  else
    U.capsule(cx - 2, top + 0.4, cx - 2, bot - 0.4, 0.35, STRING)
  end
  return mid
end

local function arrow(U, x1, x2, y, m, y2)
  y2 = y2 or y
  local len = math.sqrt((x2 - x1) ^ 2 + (y2 - y) ^ 2)
  local dx, dy = (x2 - x1) / len, (y2 - y) / len
  U.capsule(x1, y, x2 - dx * 2, y2 - dy * 2, 0.4, WOOD_DARK)
  U.poly({ { x2 - dx * 2.6 - dy * 1.2, y2 - dy * 2.6 + dx * 1.2 }, { x2, y2 }, { x2 - dx * 2.6 + dy * 1.2, y2 - dy * 2.6 - dx * 1.2 } }, m.arrowhead)
  U.px(x1, y - 0.8, m.fletch, 0.5); U.px(x1, y + 0.8, m.fletch, 0.5)
end

local function staffOrb(U, x1, y1, x2, y2, orbR, m, flare)
  U.capsule(x1, y1, x2, y2, 0.8, m.staff)
  local len = math.sqrt((x2 - x1) ^ 2 + (y2 - y1) ^ 2)
  local dx, dy = (x2 - x1) / len, (y2 - y1) / len
  local ox, oy = x2 + dx * (orbR - 0.3), y2 + dy * (orbR - 0.3)
  -- prongs
  U.curve({ { x2 - dy * 1.6, y2 + dx * 1.6 }, { ox - dy * (orbR + 0.6), oy + dx * (orbR + 0.6) }, { ox + dx * orbR - dy * 0.8, oy + dy * orbR + dx * 0.8 } }, 0.5, m.prong)
  U.curve({ { x2 + dy * 1.6, y2 - dx * 1.6 }, { ox + dy * (orbR + 0.6), oy - dx * (orbR + 0.6) }, { ox + dx * orbR + dy * 0.8, oy + dy * orbR - dx * 0.8 } }, 0.5, m.prong)
  if flare and flare > 0 then
    U.ellipse(ox, oy, orbR + flare, orbR + flare, m.halo, { shade = 0.8 })
  end
  U.ellipse(ox, oy, orbR, orbR, m.orb)
  U.px(ox - orbR * 0.4, oy - orbR * 0.4, WHITE, 1)
  if flare and flare > 1 then
    local r = orbR + flare + 1.5
    for i = 0, 7 do
      local a = i * math.pi / 4 + 0.3
      sparkle(U, ox + math.cos(a) * r, oy + math.sin(a) * r, m.spark, i % 2 == 0 and flare > 2)
    end
  end
end

local function herbStaff(U, x1, y1, x2, y2, m, glowLvl)
  U.capsule(x1, y1, x2, y2, 0.75, m.staff)
  U.curve({ { x2, y2 }, { x2 + 1.6, y2 - 1.6 }, { x2 + 0.6, y2 - 3 } }, 0.7, m.staff)
  U.ellipse(x2 - 1.6, y2 - 1.2, 1.8, 1, LEAF)
  U.ellipse(x2 + 1.8, y2 - 3.6, 1.8, 1, LEAF)
  U.ellipse(x2 + 0.4, y2 - 3.2, 1.4, 1.4, m.bud)
  if glowLvl and glowLvl > 0 then
    local g = m.spark
    local cx, cy = x2 + 0.4, y2 - 3
    for i = 0, 5 do
      local a = i * math.pi / 3 + glowLvl
      local r = 3.4 + glowLvl * 1.3
      sparkle(U, cx + math.cos(a) * r, cy + math.sin(a) * r, g, glowLvl > 1 and i % 2 == 0)
    end
    if glowLvl > 1 then
      -- a little "+" healing cross
      U.capsule(cx, cy - 7.5, cx, cy - 4.5, 0.6, m.cross); U.capsule(cx - 1.5, cy - 6, cx + 1.5, cy - 6, 0.6, m.cross)
    end
  end
end

local function towerShield(U, T, x, y, m)
  U.poly({ { x, y + 0.6 }, { x + 4, y - 0.6 }, { x + 8, y + 0.6 }, { x + 8, y + 11.5 }, { x + 4, y + 14.5 }, { x, y + 11.5 } }, m.shield)
  U.curve({ { x + 0.6, y + 1 }, { x + 4, y }, { x + 7.4, y + 1 } }, 0.6, m.rim)
  U.capsule(x + 0.6, y + 1.2, x + 0.6, y + 11.2, 0.55, m.rim)
  U.capsule(x + 7.4, y + 1.2, x + 7.4, y + 11.2, 0.55, m.rim)
  U.curve({ { x + 0.6, y + 11.4 }, { x + 4, y + 13.9 }, { x + 7.4, y + 11.4 } }, 0.55, m.rim)
  -- boss emblem: a simple sun disc (no real insignia)
  U.ellipse(x + 4, y + 6.5, 2.2, 2.2, m.boss)
  U.px(x + 3.4, y + 5.8, WHITE, 1)
  U.px(x + 2, y + 2.4, m.rim, 1); U.px(x + 6, y + 2.4, m.rim, 1)
end

local WEAPONS = {}

WEAPONS.kiem = function(U, T, f, m)
  local p = f.p
  if p == 'idle' or p == 'walk' or p == 'a3' then
    local hx, hy = 23 + (f.swing or 0) * 0.4, 22
    sword(U, T, hx, hy, p == 'a3' and -35 or -58, 10, m)
    return hx, hy
  elseif p == 'a0' then
    U.curve({ { 27, 13 }, { 25, 5 }, { 20, 1.5 } }, 0.5, m.trail)
    sword(U, T, 23.5, 14, -100, 10, m); return 23.5, 14
  elseif p == 'a1' then
    U.curve({ { 15, 3 }, { 24, 3.5 }, { 30, 10 }, { 30.5, 18 }, { 27, 25 } }, 0.8, m.trail)
    sword(U, T, 24, 19.5, 18, 8.5, m); return 24, 19.5
  elseif p == 'a2' then
    sword(U, T, 23.5, 22.5, 62, 8, m); return 23.5, 22.5
  elseif p == 'c0' then
    sword(U, T, 22, 19, -75, 9, m); return 22, 19
  else
    local hx, hy = 24.5, 10.5
    if p == 'c2' then
      U.ellipse(24.5, 3, 3.6, 3.6, m.halo, { shade = 0.8 })
    end
    sword(U, T, hx, hy, -90, 9.6, m)
    sparkle(U, 21.5, 2, m.spark, p == 'c2'); sparkle(U, 28, 4, m.spark, p == 'c1'); sparkle(U, 28.5, 0.6, m.spark)
    return hx, hy
  end
end

WEAPONS.thuong = function(U, T, f, m)
  local p, s = f.p, (f.swing or 0) * 0.4
  if p == 'idle' or p == 'walk' then spear(U, T, 18.5 + s, 30.5, 28.5 + s, 2.5, m); return 21.7 + s, 21.5
  elseif p == 'a0' then spear(U, T, 3, 21.5, 26, 15.5, m); return 20, 17.1
  elseif p == 'a1' then
    U.capsule(1, 16.5, 6, 16.5, 0.4, m.trail); U.capsule(2, 20.5, 7, 20.5, 0.4, m.trail)
    spear(U, T, 6.5, 19.5, 31.5, 18, m); return 23, 18.5
  elseif p == 'a2' then spear(U, T, 5, 18, 30.5, 21.5, m); return 22, 20.3
  elseif p == 'a3' then spear(U, T, 17, 30.5, 27, 5, m); return 21, 20.2
  elseif p == 'c0' then spear(U, T, 18.5, 30.5, 25, 4, m); return 21.4, 20
  else
    spear(U, T, 13, 19, 30.5, 1, m)
    local big = p == 'c2'
    U.ellipse(29, 2.6, big and 3 or 2, big and 3 or 2, m.halo, { shade = 0.8 })
    sparkle(U, 25, 1, m.spark, big); sparkle(U, 31, 6.5, m.spark, not big); sparkle(U, 26.5, 7, m.spark)
    return 23.5, 10.4
  end
end

WEAPONS.cung = function(U, T, f, m)
  local p = f.p
  if p == 'idle' or p == 'walk' or p == 'a3' then
    local cx = 26 + (f.swing or 0) * 0.3
    local mid = bow(U, cx, 13, 29, nil, m)
    return cx + 1, mid + 0.5
  elseif p == 'a0' then
    local mid = bow(U, 28.5, 12, 28, 6, m)
    arrow(U, 20.5, 31.5, mid, m)
    return 21.5, mid + 0.4
  elseif p == 'a1' then
    local mid = bow(U, 28.5, 12, 28, nil, m)
    U.capsule(26, mid, 31.5, mid, 0.6, m.trail)
    sparkle(U, 29.5, mid - 3, m.spark); sparkle(U, 30.5, mid + 3, m.spark)
    return 22, mid - 1
  elseif p == 'a2' then
    local mid = bow(U, 27.5, 12.5, 28.5, nil, m)
    return 22.5, mid
  elseif p == 'c0' then
    local mid = bow(U, 27, 12, 28, 3, m)
    arrow(U, 22, 30, mid, m)
    return 23.5, mid + 0.3
  else
    -- aim high (-40 deg): rotated bow, glowing arrow
    local ang = math.rad(-40)
    local dx, dy = math.cos(ang), math.sin(ang)   -- aim direction
    local nx, ny = -dy, dx                        -- bow axis
    local cx, cy = 26.5, 9.5
    local half, pull = 7.5, p == 'c1' and 5 or 0
    local pts = {}
    for i = -2, 2 do
      local t = i / 2
      local bend = (1 - t * t) * 1.8 - 1.8
      pts[#pts + 1] = { cx + nx * half * t + dx * bend, cy + ny * half * t + dy * bend }
    end
    U.curve(pts, 0.9, m.bow)
    local ax, ay = pts[1][1], pts[1][2]
    local bx, by = pts[5][1], pts[5][2]
    local sx, sy = cx - dx * (1.8 + pull), cy - dy * (1.8 + pull)
    U.capsule(ax, ay, sx, sy, 0.35, STRING); U.capsule(sx, sy, bx, by, 0.35, STRING)
    if p == 'c1' then
      U.ellipse(cx + dx * 4, cy + dy * 4, 2, 2, m.halo, { shade = 0.8 })
      arrow(U, sx, cx + dx * 5.5, sy, m, cy + dy * 5.5)
      sparkle(U, cx + dx * 6 + 1, cy + dy * 6 - 1, m.spark, true)
      return sx, sy + 0.5
    end
    for i = -1, 1 do
      U.capsule(cx + dx * 2 + nx * i * 2.5, cy + dy * 2 + ny * i * 2.5, cx + dx * 8 + nx * i * 3.5, cy + dy * 8 + ny * i * 3.5, 0.5, m.trail)
    end
    sparkle(U, 30.5, 9, m.spark, true); sparkle(U, 25, 1, m.spark)
    return sx, sy + 0.5
  end
end

WEAPONS.khien = function(U, T, f, m)
  -- short sword (hand) is drawn behind; the shield covers the front
  local p = f.p
  local sx, sy = 19.8 + (f.swing or 0) * 0.3, 14
  if p == 'a0' then sx = 17.5
  elseif p == 'a1' then sx = 22.8
  elseif p == 'a2' then sx = 21.6
  elseif p == 'a3' then sx = 20.6
  elseif p == 'c0' then sy = 15
  elseif p == 'c1' or p == 'c2' then sy = 12 end
  local hx, hy = sx + 3.5, sy + 7
  return hx, hy, function()
    if p == 'c1' or p == 'c2' then
      local r = p == 'c2' and 1 or 0
      U.curve({ { sx - 2 - r, sy + 15 + r }, { sx - 3 - r, sy + 6 }, { sx + 1, sy - 3 - r }, { sx + 4, sy - 4 - r }, { sx + 7, sy - 3 - r }, { sx + 11 + r, sy + 6 }, { sx + 10 + r, sy + 15 + r } }, 0.6, m.aura)
    end
    towerShield(U, T, sx, sy, m)
    if p == 'a1' then
      U.capsule(31, 12, 31, 26, 0.5, m.trail)
      sparkle(U, 30, 9.5, m.spark, true); sparkle(U, 30, 28.5, m.spark, true)
    end
    if p == 'c2' then sparkle(U, sx + 9.5, sy - 2, m.spark, true); sparkle(U, sx - 1.5, sy - 1, m.spark, true) end
  end
end

WEAPONS.phap = function(U, T, f, m)
  local p, s = f.p, (f.swing or 0) * 0.3
  if p == 'idle' or p == 'walk' or p == 'a3' then
    staffOrb(U, 24.2 + s, 30.5, 24.4 + s, 8, 2.2, m, (f.sway or 0) ~= 0 and 0.6 or 0); return 24 + s, 20.5
  elseif p == 'a0' then staffOrb(U, 21, 30, 22.5, 7.5, 2.2, m, 0.8); return 21.8, 19.5
  elseif p == 'a1' then
    staffOrb(U, 17, 28.5, 26.5, 9.5, 2.6, m, 2.2); return 22.6, 17.3
  elseif p == 'a2' then staffOrb(U, 18.5, 29.5, 26.5, 9.5, 2.4, m, 1.2); return 23, 18.5
  elseif p == 'c0' then staffOrb(U, 23.5, 30.5, 23.8, 9, 2.2, m, 1.0); return 23.5, 19
  else
    staffOrb(U, 27, 23, 27, 7.5, p == 'c2' and 2.6 or 2.3, m, p == 'c2' and 2.4 or 1.4); return 26.8, 13
  end
end

WEAPONS.y = function(U, T, f, m)
  local p, s = f.p, (f.swing or 0) * 0.3
  if p == 'idle' or p == 'walk' or p == 'a3' then herbStaff(U, 23.6 + s, 30, 24 + s, 14, m); return 23.8 + s, 21.5
  elseif p == 'a0' then herbStaff(U, 22.5, 25, 23.5, 9, m, 0.3); return 23, 17.5
  elseif p == 'a1' then herbStaff(U, 21, 23, 26, 8, m, 1.2); return 23.2, 16.5
  elseif p == 'a2' then herbStaff(U, 21.5, 24, 25.5, 9, m, 2.2); return 23, 17.5
  elseif p == 'c0' then herbStaff(U, 23.4, 30, 23.8, 13, m, 0.4); return 23.6, 20.5
  else herbStaff(U, 25, 21, 25, 7, m, p == 'c2' and 2.4 or 1.6); return 25, 12 end
end

---------------------------------------------------------------------------
-- class definitions
---------------------------------------------------------------------------
local function blades(t)
  if t == 3 then return M('blade', '#e8eef8', { light = 1.2 }), GOLD end
  if t == 2 then return M('blade', '#c4ccdc'), M('guard', '#4a7ad8') end
  return M('blade', '#b0b4c0'), M('guard', '#8a6a40')
end

local CLASSES = {
  kiem = {
    top = { '#c8503a', '#3a68b0', '#b8283a' }, bottom = '#4a3a3a', hair = '#3a2a22', iris = '#4a5aa8',
    headgear = function(t) return t == 1 and 'headband' or 'helmet' end,
    mats = function(t, T)
      local b, g = blades(t)
      return { blade = b, guard = g, band = M('band', '#e8d8b0'), helm = t == 3 and M('helm', '#e2e6f0') or METAL, tier = t,
        trail = glow('trail', '#ffffff'), halo = glow('halo', t == 3 and '#ffe27a' or '#bfe8ff'), spark = glow('spark', '#fff6c0'),
        buckler = M('buckler', t == 1 and '#9a6a3a' or t == 2 and '#aeb8cc' or '#f2c443'), boss = t == 1 and METAL or t == 2 and M('boss', '#4a7ad8') or RED }
    end,
    offhand = function(U, T, f, m, lx, ly)
      U.ellipse(lx - 0.5, ly - 1.5, 3.3, 3.6, m.buckler)
      U.ellipse(lx - 0.5, ly - 1.5, 1.2, 1.2, m.boss)
      U.recolor(lx - 3, ly - 5, lx + 2, ly - 4.2, m.buckler, 5)
    end,
  },
  thuong = {
    top = { '#4f8a4a', '#3a8a6a', '#2a7a5a' }, bottom = '#4a3a3a', hair = '#2a1e1a', iris = '#3a8a4a',
    headgear = function() return 'nonla' end,
    mats = function(t, T)
      local b = blades(t)
      return { blade = b, shaft = t == 3 and M('shaft', '#a03030') or WOOD, tassel = t == 1 and RED or t == 2 and M('tassel', '#4a7ad8') or GOLD,
        straw = t == 3 and M('straw', '#f0c860') or M('straw', '#e2c27a'), tier = t,
        trail = glow('trail', '#ffffff'), halo = glow('halo', '#fff0a0'), spark = glow('spark', '#fff6c0') }
    end,
  },
  cung = {
    top = { '#6a8a3a', '#3f7a5a', '#2f6a4a' }, bottom = '#5a4a32', hair = '#5a3220', iris = '#3d9a4a',
    headgear = function() return 'headband' end,
    mats = function(t, T)
      return { bow = t == 3 and M('bow', '#a83a2a') or t == 2 and M('bow', '#6a4a8a') or WOOD, tipc = t >= 2 and T.trim or nil,
        band = t == 1 and M('band', '#d23c3c') or T.trim, arrowhead = METAL, fletch = t == 3 and GOLD or WHITE, tier = t,
        quiver = M('quiver', t == 1 and '#8a5a34' or t == 2 and '#5a4a7a' or '#8a2a2a'),
        trail = glow('trail', '#fff6c0'), halo = glow('halo', '#fff0a0'), spark = glow('spark', '#ffffff') }
    end,
    back = function(U, T, f, m)
      U.capsule(8.6, 13.5, 11.6, 24, 1.8, m.quiver)
      U.capsule(8.8, 14.5, 11.3, 23, 0.4, m.tier == 1 and WOOD_DARK or T.trim)
      U.poly({ { 6.6, 12.8 }, { 7.6, 10 }, { 9, 12.4 } }, M('feather', m.tier == 3 and '#f2c443' or '#f0ece0'))
      U.poly({ { 8.4, 12.3 }, { 9.8, 9.4 }, { 10.6, 12.2 } }, M('feather', '#d23c3c'))
    end,
  },
  khien = {
    top = { '#7a5a3a', '#4a5a8a', '#6a2a3a' }, bottom = '#3a3a48', hair = '#2a1e1a', iris = '#8a5a2a', sturdy = true,
    headgear = function() return 'helmet' end,
    mats = function(t, T)
      return { helm = t == 1 and M('helm', '#8a6a4a') or t == 2 and METAL or M('helm', '#e2e6f0'), tier = t,
        shield = M('shield', t == 1 and '#9a6a3a' or t == 2 and '#5a78b8' or '#b8283a'),
        rim = t == 1 and M('rim', '#6a6a78') or t == 2 and METAL or GOLD,
        boss = t == 1 and METAL or GOLD,
        trail = glow('trail', '#ffffff'), aura = glow('aura', '#ffe27a'), spark = glow('spark', '#fff6c0') }
    end,
  },
  phap = {
    top = { '#6a3fa0', '#3a4aa8', '#4a2a7a' }, bottom = '#2a1a40', hair = '#c8c0d8', iris = '#a060e0', robe = true, robeTrim = '#a07ad0',
    headgear = function() return 'wizard' end,
    mats = function(t, T)
      local orb = ({ '#7fe0ff', '#c08aff', '#ffd84a' })[t]
      return { hat = M('hat', ({ '#5a3a8a', '#2a3a8a', '#3a1a6a' })[t]), tier = t,
        staff = t == 1 and WOOD_DARK or t == 2 and M('staff', '#c8d4e8') or M('staff', '#3a2a50'), prong = t == 1 and WOOD or t == 2 and METAL or GOLD,
        orb = glow('orb', orb), halo = R.mat('halo', orb, { noline = true, nooutline = true, light = 2.2, dark = 0.2 }), spark = glow('spark', '#ffffff') }
    end,
  },
  y = {
    top = { '#f2eee2', '#eef4f0', '#fffaf0' }, bottom = '#3a6a4a', hair = '#4a2a1a', iris = '#3aa060', robe = true, sleeve = true, robeTrim = '#4caa6a',
    hairStyle = 'topknot',
    headgear = function() return nil end,
    mats = function(t, T)
      return { staff = t == 3 and M('staff', '#c8a050') or WOOD, bud = M('bud', t == 3 and '#ffd84a' or '#ff9ec8'), tier = t,
        spark = glow('spark', '#b8ffc0'), cross = glow('cross', '#7affa0'),
        gourd = M('gourd', '#d8a040'), sash = M('sash', t == 1 and '#4caa6a' or t == 2 and '#3a8ad0' or '#f2c443') }
    end,
    extra = function(U, T, f, m)
      -- gourd on the hip + herb satchel strap
      U.capsule(12, 17, 19.5, 24, 0.5, m.sash)
      U.ellipse(11, 25.6, 1.9, 2.2, m.gourd)
      U.ellipse(11, 22.9, 1.2, 1.1, m.gourd)
      U.px(11, 21.6, RED, 0.6)
    end,
  },
}
local CLASS_ORDER = { 'kiem', 'thuong', 'cung', 'khien', 'phap', 'y' }

---------------------------------------------------------------------------
-- the 32x32 chibi soldier
---------------------------------------------------------------------------
local function soldierClass(cv, cls, t, f)
  local C, T = CLASSES[cls], TIER[t]
  local m = C.mats(t, T)
  local lean = f.lean or 0
  local P = R.painter(cv, 0, 0, 1)
  local U = R.painter(cv, lean, f.by or 0, 1)
  local top = M('top', C.top[t])
  local bottom = M('bottom', C.bottom)
  local hair = M('hair', C.hair, { light = 1.1 })
  local step = f.step or 0
  local sturdy = C.sturdy

  -- cape (tier 3) and back items
  if T.cape then
    local s = (f.sway or 0) + (f.p == 'walk' and -1 or 0)
    U.poly({ { 12.5, 17 }, { 19.5, 17 }, { 21, 28.5 }, { 14, 29.6 }, { 7 + s, 28 } }, T.cape)
  end
  if C.back then C.back(U, T, f, m) end

  -- legs
  local lx, rx = 13.6 + step * 0.9, 18.4 - step * 0.9
  local ll, rl = f.liftL or 0, f.liftR or 0
  if f.p == 'c0' then lx, rx = 12.6, 19.4 end
  if f.p == 'a1' or f.p == 'a2' then lx, rx = 12.8, 19.8 end
  P.capsule(13.6, 24.6, lx, 28.4 - ll, sturdy and 1.9 or 1.7, bottom)
  P.capsule(18.4, 24.6, rx, 28.4 - rl, sturdy and 1.9 or 1.7, bottom)
  local function boots()
    P.ellipse(lx - 0.3, 29.7 - ll, 2.3, 1.3, T.boots)
    P.ellipse(rx + 0.3, 29.7 - rl, 2.3, 1.3, T.boots)
  end
  if not C.robe then boots() end

  -- torso
  if C.robe then
    local h = step * 0.5
    U.poly({ { 11.6, 21 }, { 20.4, 21 }, { 22.6 - h, 29.2 - (f.by or 0) }, { 16, 29.8 - (f.by or 0) }, { 9.4 - h, 29.2 - (f.by or 0) } }, top)
    local rt = t == 1 and M('robeTrim', C.robeTrim) or T.trim
    U.capsule(9.8 - h, 28.6 - (f.by or 0), 22.2 - h, 28.6 - (f.by or 0), 0.6, rt)
    U.capsule(16, 22, 16, 29, 0.6, rt)
    boots()
  end
  U.ellipse(16, 20.8, sturdy and 6.2 or 5.4, 4.6, top)
  if T.armor then
    U.poly({ { 12.2, 17.4 }, { 19.8, 17.4 }, { 19.6, 22.5 }, { 16, 23.6 }, { 12.4, 22.5 } }, C.robe and top or T.armor)
    if not C.robe then U.capsule(13.6, 19.6, 18.4, 19.6, 0.45, T.trim) end
  end
  if C.robe and t >= 2 then
    U.capsule(13, 17.6, 16, 21.5, 0.6, T.trim); U.capsule(19, 17.6, 16, 21.5, 0.6, T.trim)
  else
    U.capsule(13.6, 16.8, 18.4, 16.8, 0.8, T.trim)
  end
  U.rect(10.8, 23, 10.4, 1.6, T.belt)
  U.rect(15.2, 22.8, 1.6, 2, GOLD)
  if C.extra then C.extra(U, T, f, m) end

  -- left arm (back side)
  local lhx, lhy = 10.2 - (f.swing or 0) * 0.9, 23.4
  if f.raise and cls ~= 'kiem' and cls ~= 'khien' then lhx, lhy = 8.6, 13 end
  if f.p == 'a0' then lhx = lhx - 0.6 end
  U.capsule(12, 18.2, lhx, lhy - 1, 1.5, C.sleeve and top or top)
  U.ellipse(lhx, lhy, 1.4, 1.4, SKIN)
  if T.armor and not C.robe then
    U.ellipse(11.8, 17.6, sturdy and 2.9 or 2.5, 2, T.armor)
    U.ellipse(20.2, 17.6, sturdy and 2.9 or 2.5, 2, T.armor)
    U.capsule(10.2, 18.8, 13.2, 18.8, 0.4, T.trim)
  end
  if C.offhand then C.offhand(U, T, f, m, lhx, lhy) end

  -- head
  U.ellipse(16, 10.6, 6.9, 6.3, SKIN)
  U.poly({ { 10, 11 }, { 22, 11 }, { 20, 15.2 }, { 16, 16.8 }, { 12, 15.2 } }, SKIN, { shade = 0.66 })
  local iris = R.mat('iris', C.iris)
  local pal = { k = LASH, P = PUPIL, W = WHITE, D = F('irisD', toHex(iris.ramp[2])), L = F('irisL', toHex(iris.ramp[4])) }
  local face = f.face or 'normal'
  local el = face == 'happy' and EYE_HAPPY_L or face == 'fierce' and EYE_L_FIERCE or EYE_L
  local er = face == 'happy' and EYE_HAPPY_R or face == 'fierce' and EYE_R_FIERCE or EYE_R
  U.stamp(11.5, 10.5, el, pal)
  U.stamp(17.5, 10.5, er, pal)
  U.px(11, 13.8, BLUSH); U.px(21, 13.8, BLUSH)
  if f.shout then U.px(16, 14.6, MOUTH); U.px(16, 15.4, MOUTH) else U.px(16, 14.8, MOUTH) end
  hairFront(U, hair, C.hairStyle)
  local hg = C.headgear(t)
  if hg then HEADGEAR[hg](U, T, f, m) end

  -- right arm + weapon (front)
  local hx, hy, front = WEAPONS[cls](U, T, f, m)
  U.capsule(20, 18.2, hx, hy - 0.8, 1.5, top)
  U.ellipse(hx, hy, 1.4, 1.4, SKIN)
  if front then front() end
end

for _, cls in ipairs(CLASS_ORDER) do
  for t = 1, 3 do
    local imgs = {}
    for _, f in ipairs(POSES) do imgs[#imgs + 1] = R.frame(32, 32, function(cv) soldierClass(cv, cls, t, f) end) end
    R.save(out, src, 'sol_' .. cls .. '_' .. t, imgs, 120,
      { idle = { 0, 3, 6, true }, walk = { 4, 7, 10, true }, attack = { 8, 11, 14, false }, cast = { 12, 14, 8, false } })
  end
end

---------------------------------------------------------------------------
-- legend bosses (walk 0-3 @8fps loop, cast 4-7 @8fps once) + fox minion
---------------------------------------------------------------------------
local function bossFrames(w, h, draw)
  local t = {}
  for f = 0, 7 do t[#t + 1] = R.frame(w, h, function(cv) draw(cv, f) end) end
  return t
end
local BOSS_ANIMS = { walk = { 0, 3, 8, true }, cast = { 4, 7, 8, false } }

-- scale arcs painted as darker pixels of the same material (no inner lines)
local function scales(U, mat, cx, cy, rx, ry, x1, x2, y1, y2, skip)
  local row = 0
  for y = y1, y2, 4 do
    local off = (row % 2) * 2.5
    for x = x1 + off, x2, 5 do
      local nx, ny = (x - cx) / rx, (y - cy) / ry
      if nx * nx + ny * ny < 0.78 and not (skip and skip(x, y)) then
        U.px(x - 1, y, mat, 0.18); U.px(x, y + 1, mat, 0.18); U.px(x + 1, y, mat, 0.18)
        U.px(x, y - 1, mat, 0.95)
      end
    end
    row = row + 1
  end
end

---------------------------------------------------------------------------
-- Ngư Tinh — fish demon walking on its fins (96x72)
---------------------------------------------------------------------------
local function ngutinh(cv, f)
  local body, dark, belly, fin, spine = M('fish', '#2a8a9a'), M('fishD', '#1c5a78'), M('fbelly', '#c8ecd8'), M('fin', '#46c0c8'), M('spine', '#1a4a68')
  local walk, i = f < 4, f % 4
  local bob = walk and ({ 0, -1, 0, -1 })[i + 1] or ({ 2, -1, -2, 0 })[i + 1]
  local head = walk and 0 or ({ 1, -5, -6, -2 })[i + 1]
  local open = walk and ({ 0, 1, 0, 1 })[i + 1] or ({ 0, 5, 7, 2 })[i + 1]
  local a = walk and ({ 3, 1, -3, -1 })[i + 1] or 0
  local sw = walk and ({ 0, 2, 0, -2 })[i + 1] or ({ 1, -2, -3, 0 })[i + 1]
  local frontLift = (not walk and (i == 1 or i == 2)) and 3 or 0
  local P = R.painter(cv, 0, 0, 1)
  local U = R.painter(cv, 0, bob, 1)
  local H = R.painter(cv, 0, bob + head, 1)
  local water = glow('water', '#7fe8ff')

  local function finLeg(hx, hy, fx, fy, m, lift)
    fy = fy - (lift or 0)
    P.capsule(hx, hy + bob, (hx + fx) / 2 + 1, (hy + fy) / 2 + 2 + bob * 0.5, 3.4, m)
    P.capsule((hx + fx) / 2 + 1, (hy + fy) / 2 + 2 + bob * 0.5, fx, fy - 2, 2.4, m)
    P.poly({ { fx - 5, fy + 0.6 }, { fx + 6, fy + 0.6 }, { fx + 3.5, fy - 3.5 }, { fx - 2.5, fy - 3.5 } }, fin)
    P.capsule(fx - 2.5, fy - 3, fx - 4, fy, 0.45, spine); P.capsule(fx + 0.5, fy - 3, fx + 0.5, fy, 0.45, spine); P.capsule(fx + 3, fy - 3, fx + 5, fy, 0.45, spine)
  end
  -- far legs
  finLeg(34, 50, 31 - a, 70, dark)
  finLeg(56, 50, 59 + a, 70, dark, frontLift)
  -- tail + tail fin
  U.capsule(26, 40, 13, 35 + sw * 0.5, 7.5, body)
  U.capsule(13, 35 + sw * 0.5, 7, 31 + sw, 4.2, body)
  U.poly({ { 9, 30 + sw }, { 1, 13 + sw * 1.5 }, { 4, 30 + sw }, { 1, 48 + sw * 0.5 }, { 9, 36 + sw } }, fin)
  U.curve({ { 7, 31 + sw }, { 3, 18 + sw * 1.3 } }, 0.5, spine); U.curve({ { 7, 33 + sw }, { 3, 44 + sw * 0.6 } }, 0.5, spine)
  -- dorsal fin
  for k = 0, 6 do
    local x = 24 + k * 6
    local nx = (x - 44) / 26
    local ty = 40 - 15 * math.sqrt(math.max(0, 1 - nx * nx)) + 3
    local hgt = 10 - math.abs(k - 3) * 1.2 + ((k + f) % 2)
    U.poly({ { x - 3, ty }, { x - 4, ty - hgt }, { x + 4, ty } }, fin)
    U.capsule(x - 2.5, ty, x - 4, ty - hgt + 0.5, 0.5, spine)
  end
  -- body
  U.ellipse(44, 40, 26, 15.5, body)
  U.ellipse(47, 48, 20, 7, belly)
  scales(U, body, 44, 40, 26, 15.5, 22, 66, 30, 44, function(x, y) return y > 44 end)
  for k = 0, 4 do U.capsule(32 + k * 7, 45.5, 33 + k * 7, 52, 0.4, belly, { shade = 0.25 }) end
  -- near legs
  finLeg(38, 52, 41 + a, 70, body)
  finLeg(60, 52, 63 - a, 70, body, frontLift)
  -- pectoral fin
  U.poly({ { 58, 40 }, { 44, 33 + sw * 0.5 }, { 41, 41 }, { 45, 49 - sw * 0.5 }, { 58, 45 } }, fin)
  for _, e in ipairs({ { 44, 34 }, { 42, 41 }, { 45, 48 } }) do U.capsule(57, 42.5, e[1] + 1, e[2] + (e[2] < 40 and sw * 0.5 or -sw * 0.3), 0.45, spine) end

  -- head
  H.poly({ { 62, 22 }, { 54, 11 }, { 60, 16 }, { 58, 8 }, { 66, 20 } }, fin)
  H.ellipse(70, 31, 14, 12.5, body)
  H.poly({ { 76, 21 }, { 92, 30 }, { 92, 36 }, { 76, 39 } }, body)
  -- mouth
  if open > 0 then
    H.poly({ { 64, 38 }, { 92, 36 }, { 90, 37 + open }, { 66, 40 + open * 0.6 } }, M('maw', '#7a1a3a'))
    H.capsule(70, 38.5 + open * 0.4, 84, 38.5 + open * 0.6, 1, F('tongue', '#ff6a8a'))
  end
  H.poly({ { 64, 39 + open * 0.6 }, { 91, 37 + open }, { 86, 44 + open }, { 70, 47 + open * 0.5 } }, belly)
  for _, x in ipairs({ 71, 76, 81, 86, 90 }) do H.poly({ { x - 1.4, 36.5 }, { x + 1.4, 36.5 }, { x, 40.5 } }, BONE) end
  for _, x in ipairs({ 73.5, 78.5, 83.5, 88 }) do
    local yb = 38 + open * (0.5 + (x - 64) / 54)
    H.poly({ { x - 1.3, yb + 1.5 }, { x + 1.3, yb + 1.5 }, { x, yb - 2.5 } }, BONE)
  end
  -- gills, eye, brow, barbels
  for k = 0, 2 do H.curve({ { 60 + k * 2.4, 25 }, { 58.5 + k * 2.4, 31 }, { 60 + k * 2.4, 38 } }, 0.5, dark) end
  H.ellipse(76, 27, 3.4, 2.8, glow('eye', '#ffe24a'))
  H.capsule(76, 25.5, 76, 28.5, 0.5, DARK)
  H.px(74.6, 26, WHITE, 1)
  H.capsule(70.5, 22.8, 80.5, 25.2, 1, DARK, { shade = 0 })
  local wh = M('barbel', '#bfe8ff')
  H.curve({ { 90, 37 }, { 93, 44 }, { 90, 50 + sw * 0.5 } }, 0.55, wh)
  H.curve({ { 78, 38 }, { 74, 46 }, { 68, 50 - sw * 0.5 } }, 0.55, wh)
  H.recolor(62, 19, 80, 21, body, 5)
  -- water magic
  if not walk and i >= 1 then
    local r = i == 2 and 13 or 10
    for k = 0, 9 do
      local an = k * math.pi / 5 + i * 0.4
      local x, y = 78 + math.cos(an) * r * 1.2, 30 + head + math.sin(an) * r
      if x < 95 and y > 1 then H.ellipse(x, y - head, 1.3 + (k % 2) * 0.7, 1.3 + (k % 2) * 0.7, water) end
    end
    if i == 2 then
      U.curve({ { 90, 40 + head }, { 94, 32 + head }, { 93, 24 + head } }, 0.9, water)
      U.curve({ { 22, 70 }, { 14, 64 }, { 8, 66 } }, 0.8, water); U.curve({ { 70, 70 }, { 80, 64 }, { 88, 67 } }, 0.8, water)
    end
  end
end

---------------------------------------------------------------------------
-- Hồ Tinh — nine-tailed fox spirit (88x72)
---------------------------------------------------------------------------
local function hotinh(cv, f)
  local fur, furD, orange, orangeD, inner = M('fur', '#fff4ea'), M('furD', '#d8c8c8'), M('orange', '#f08a3a'), M('orangeD', '#c0582a'), M('inner', '#ff9ec0')
  local sock, sockD = M('sock', '#5a2a3a'), M('sockD', '#3a1a2a')
  local walk, i = f < 4, f % 4
  local bob = walk and ({ 0, -1, 0, -1 })[i + 1] or ({ 2, -1, -2, 0 })[i + 1]
  local a = walk and ({ 3, 1, -3, -1 })[i + 1] or 0
  local rear = walk and 0 or ({ 0, 6, 8, 2 })[i + 1]
  local spread = walk and 0 or ({ 0.1, 0.35, 0.45, 0.15 })[i + 1]
  local P = R.painter(cv, 0, 0, 1)
  local U = R.painter(cv, 0, bob, 1)
  local Hd = R.painter(cv, 0, bob - rear, 1)
  local fire = glow('foxfire', '#a98aff')
  local fireL = glow('foxfireL', '#e6dcff')

  -- nine tails, fanned behind (back ones first)
  local bx, by = 28, 46
  for k = 8, 0, -1 do
    local ang = math.rad(-62 - k * (15.5 + spread * 6))
    local len = 23 + (k % 2) * 4 + spread * 5
    local dx, dy = math.cos(ang), math.sin(ang)
    local nx, ny = -dy, dx
    local ph = f * 1.4 + k * 0.7
    local mat = M('tail' .. k, (k % 2 == 0) and '#f08a3a' or '#e07030')
    local tip = M('tip' .. k, '#fff4ea')
    local pts = {}
    for s = 0, 8 do
      local t = s / 8
      local wv = math.sin(t * math.pi * 1.2 + ph) * 2.6 * t
      pts[#pts + 1] = { bx + dx * len * t + nx * wv, by + dy * len * t + ny * wv, 1.9 + 2.3 * math.sin(t * math.pi * 0.8) }
    end
    for s, q in ipairs(pts) do
      U.ellipse(q[1], q[2], q[3], q[3], s >= 8 and tip or mat)
    end
    local tp = pts[#pts]
    U.poly({ { tp[1] - nx * 1.8, tp[2] - ny * 1.8 }, { tp[1] + dx * 4.5, tp[2] + dy * 4.5 }, { tp[1] + nx * 1.8, tp[2] + ny * 1.8 } }, tip)
  end
  -- far legs
  local function leg(hx, hy, fx, fy, m, sock)
    P.capsule(hx, hy + bob, (hx + fx) / 2, (hy + fy) / 2 + bob * 0.5, 2.8, m)
    P.capsule((hx + fx) / 2, (hy + fy) / 2 + bob * 0.5, fx, fy, 2.1, m)
    P.ellipse(fx + 1, fy + 0.6, 2.8, 1.6, sock)
  end
  local fl = rear > 0 and rear + 2 or 0
  leg(33, 52, 31 - a, 68.6, orangeD, sockD)
  leg(54, 50 - rear, 56 + a + fl * 0.6, 68.6 - fl * 1.6, orangeD, sockD)
  -- body (rear haunch + chest that rises when rearing)
  U.ellipse(38, 49, 12.5, 9.5, orange)
  U.ellipse(52, 46 - rear * 0.7, 10.5, 9.5, orange)
  U.ellipse(46, 54.5 - rear * 0.3, 10, 3.2, fur)
  U.ellipse(58, 47 - rear * 0.8, 4.6, 7, fur)
  -- near legs
  leg(37, 54, 39 + a, 68.6, orange, sock)
  leg(57, 52 - rear, 59 - a + fl, 68.6 - fl * 1.9, orange, sock)
  -- ruff
  for k = 0, 4 do
    local y = 40 + k * 3.2 - rear * 0.8
    U.poly({ { 58, y - 2 }, { 65 - math.abs(k - 2) * 0.8, y + 1 }, { 58, y + 3 } }, fur)
  end
  -- head
  Hd.poly({ { 58, 27 }, { 57, 11 }, { 65, 23 } }, orangeD)
  Hd.poly({ { 59.5, 24 }, { 58.8, 16 }, { 62, 23 } }, inner)
  Hd.poly({ { 64, 24 }, { 69, 10 }, { 71, 25 } }, orange)
  Hd.poly({ { 66.5, 23 }, { 68.8, 15.5 }, { 69.5, 23.5 } }, inner)
  Hd.px(57, 11.5, sock, 0.5); Hd.px(69, 10.5, sock, 0.5)
  Hd.ellipse(65, 31, 9.5, 8.2, orange)
  Hd.poly({ { 57, 34 }, { 66, 33.5 }, { 72, 37 }, { 65, 40 }, { 58, 38.5 } }, fur)
  Hd.poly({ { 70, 29.5 }, { 82, 32 }, { 81, 35 }, { 71, 38 } }, fur)
  Hd.px(81.5, 32.6, DARK); Hd.px(82, 33.4, DARK)
  Hd.capsule(73, 36.4, 80, 34.8, 0.45, DARK)
  if not walk and i >= 1 then Hd.poly({ { 73, 36.5 }, { 80, 35 }, { 78, 39 }, { 74, 39 } }, M('maw', '#7a1a3a')); Hd.px(75, 37.2, WHITE, 1); Hd.px(78.5, 36.4, WHITE, 1) end
  -- red kitsune markings + glowing eye
  Hd.capsule(61, 25.5, 64.5, 27.5, 0.6, F('mark', '#d0203a'))
  local eye = glow('eye', not walk and i >= 1 and '#fff6c0' or '#ffd23a')
  Hd.poly({ { 65, 29.5 }, { 73, 26.6 }, { 72, 30.8 }, { 66, 31.4 } }, eye)
  Hd.capsule(69.6, 28, 69.6, 30.5, 0.5, DARK)
  Hd.capsule(64.5, 28.4, 73.5, 25.2, 0.6, DARK, { shade = 0 })
  Hd.recolor(58, 22, 72, 24.5, orange, 5)
  -- forehead jewel
  Hd.ellipse(64.5, 24.8, 1.3, 1.3, fire)
  -- foxfire wisps
  local nW = walk and 2 or ({ 3, 5, 7, 4 })[i + 1]
  for k = 0, nW - 1 do
    local an = k * (math.pi * 2 / nW) + f * 0.6
    local x = 44 + math.cos(an) * (walk and 34 or 36)
    local y = 30 + math.sin(an) * (walk and 10 or 22) - (walk and 6 or 0)
    if x > 2 and x < 86 and y > 3 then
      U.poly({ { x - 2.2, y + 1 }, { x, y - 5 - (k + f) % 2 }, { x + 2.2, y + 1 } }, fire)
      U.ellipse(x, y + 1, 2.2, 2.2, fire)
      U.ellipse(x, y + 1.2, 1.1, 1.1, fireL)
    end
  end
end

---------------------------------------------------------------------------
-- Mộc Tinh — ancient tree demon (80x96)
---------------------------------------------------------------------------
local function moctinh(cv, f)
  local bark, barkD, root, moss = M('bark', '#7a5a3a'), M('barkD', '#5a3e28'), M('root', '#6a4a30'), M('moss', '#6aa04a')
  local leaf, leafD, leafL = M('leaf', '#2f7a5a'), M('leafD', '#1f5048'), M('leafL', '#8ac85a')
  local autumn = M('autumn', '#d86a2a')
  local hollow = F('hollow', '#24140c')
  local walk, i = f < 4, f % 4
  local bob = walk and ({ 0, -1, 0, -1 })[i + 1] or ({ 2, -1, -2, 0 })[i + 1]
  local a = walk and ({ 3, 1, -3, -1 })[i + 1] or 0
  local liftL = walk and ({ 0, 0, 0, 2 })[i + 1] or 0
  local liftR = walk and ({ 0, 2, 0, 0 })[i + 1] or 0
  local sw = walk and ({ 0, 1.5, 0, -1.5 })[i + 1] or 0
  local raise = walk and 0 or ({ 0.2, 1, 1, 0.5 })[i + 1]
  local open = walk and 0 or ({ 0, 3, 4, 1 })[i + 1]
  local P = R.painter(cv, 0, 0, 1)
  local U = R.painter(cv, 0, bob, 1)
  local spore = glow('spore', '#c8ff6a')
  local eyeG = glow('eye', '#d8ff5a')

  -- root legs
  local function rootLeg(hx, fx, lift, dir)
    P.capsule(hx, 80 + bob, (hx + fx) / 2, 87 - lift * 0.5, 5, root)
    P.capsule((hx + fx) / 2, 87 - lift * 0.5, fx, 91.5 - lift, 3.6, root)
    P.capsule(fx, 92 - lift, fx + dir * 7, 93.4 - lift, 1.4, root)
    P.capsule(fx, 92 - lift, fx - dir * 6, 93.4 - lift, 1.3, root)
    P.capsule(fx, 92 - lift, fx + dir * 2, 94 - lift, 1.2, root)
  end
  rootLeg(32, 26 + a, liftL, -1)
  rootLeg(48, 54 - a, liftR, 1)
  -- arms (branches)
  local function arm(sx, dir)
    local ex = sx + dir * 13
    local ey = 52 + sw * dir - raise * 18
    local hx = sx + dir * (19 - raise * 3)
    local hy = 46 + sw * dir - raise * 32
    U.capsule(sx, 46, ex, ey, 3.4, bark)
    U.capsule(ex, ey, hx, hy, 2.4, bark)
    for k = -1, 1 do
      local an = math.atan(hy - ey, hx - ex) + k * 0.6
      U.capsule(hx, hy, hx + math.cos(an) * 5, hy + math.sin(an) * 5, 0.9, barkD)
    end
    U.ellipse(ex, ey - 2, 3, 2, leaf)
  end
  arm(26, -1)
  -- trunk
  U.poly({ { 25, 36 }, { 55, 36 }, { 58, 76 }, { 52, 86 }, { 28, 86 }, { 22, 76 } }, bark)
  for _, gx in ipairs({ 28, 34, 46, 52 }) do
    U.curve({ { gx, 40 }, { gx + 1.5, 52 }, { gx - 0.5, 66 }, { gx + 1, 82 } }, 0.55, barkD)
  end
  U.ellipse(30, 74, 2.2, 3, barkD); U.ellipse(30, 74, 1, 1.6, hollow)
  U.ellipse(28, 40, 6, 2.6, moss); U.ellipse(53, 41, 5, 2.4, moss); U.ellipse(50, 82, 4, 1.8, moss)
  -- face
  U.ellipse(36, 54, 4.6, 3.4, hollow); U.ellipse(49, 54, 4.6, 3.4, hollow)
  U.ellipse(36.5, 54.4, 2, 1.6, eyeG); U.ellipse(49.5, 54.4, 2, 1.6, eyeG)
  U.capsule(30, 48.5, 40, 51.5, 1.3, barkD, { shade = 0.9 }); U.capsule(55, 48.5, 45, 51.5, 1.3, barkD, { shade = 0.9 })
  U.poly({ { 33, 63 }, { 53, 63 }, { 51, 67 + open }, { 43, 69 + open }, { 35, 67 + open } }, hollow)
  local tooth = M('tooth', '#d8c090')
  for _, x in ipairs({ 36, 40.5, 45, 49.5 }) do U.poly({ { x - 1.3, 63 }, { x + 1.3, 63 }, { x, 65.6 } }, tooth) end
  for _, x in ipairs({ 38, 43, 48 }) do U.poly({ { x - 1.2, 67.6 + open }, { x + 1.2, 67.6 + open }, { x, 65.4 + open } }, tooth) end
  arm(54, 1)
  -- crown
  local cs = sw * 0.6
  U.capsule(34, 38, 26, 22, 1.6, barkD); U.capsule(46, 38, 56, 20, 1.6, barkD)
  for _, c in ipairs({ { 40, 24, 24, 13, leafD }, { 20 + cs, 27, 11, 8, leafD }, { 60 + cs, 27, 11, 8, leafD }, { 40 + cs, 12, 16, 10, leaf },
    { 26 + cs, 17, 10, 8, leaf }, { 54 + cs, 17, 10, 8, leaf }, { 33, 27, 9, 6, leaf }, { 49, 27, 9, 6, leaf } }) do
    U.ellipse(c[1], c[2], c[3], c[4], c[5])
  end
  for _, c in ipairs({ { 36 + cs, 8, 5, 3 }, { 22 + cs, 13, 4, 2.6 }, { 50 + cs, 12, 5, 3 }, { 30, 23, 3.6, 2.4 } }) do U.ellipse(c[1], c[2], c[3], c[4], leafL) end
  for _, c in ipairs({ { 14 + cs, 28, 4, 3 }, { 62 + cs, 21, 4.5, 3 }, { 44, 30, 3.5, 2.4 }, { 46 + cs, 4, 3.5, 2.2 } }) do U.ellipse(c[1], c[2], c[3], c[4], autumn) end
  -- dead twigs poking out
  U.curve({ { 14, 28 }, { 8, 24 }, { 5, 25 } }, 0.8, barkD); U.curve({ { 66, 27 }, { 72, 22 }, { 75, 23 } }, 0.8, barkD)
  -- glowing fruit / spores
  for _, q in ipairs({ { 30, 20 }, { 47, 15 }, { 57, 25 } }) do U.ellipse(q[1] + cs, q[2], 1.3, 1.3, eyeG) end
  if not walk and i >= 1 then
    local n = i == 2 and 12 or 8
    for k = 0, n - 1 do
      local an = k * math.pi * 2 / n + i * 0.5
      local r = i == 2 and 34 or 28
      local x, y = 40 + math.cos(an) * r, 40 + math.sin(an) * r * 1.1
      if x > 1 and x < 79 and y > 1 and y < 92 then
        if k % 2 == 0 then U.poly({ { x - 2.6, y }, { x, y - 2.6 }, { x + 2.6, y }, { x, y + 2.6 } }, spore)
        else U.ellipse(x, y, 1.6, 1.6, spore) end
      end
    end
  end
  if walk and i % 2 == 1 then U.ellipse(14, 60, 1.4, 1, leafL) end
end

---------------------------------------------------------------------------
-- Fox minion 32x24 (side view, running)
---------------------------------------------------------------------------
local function foxMinion(cv, f)
  local fur, dark, light = M('fur', '#f08a3a'), M('furD', '#b0502a'), M('furL', '#fff2e0')
  local a = ({ 3, 1, -3, -1 })[f + 1]
  local bob = ({ 0, -1, 0, -1 })[f + 1]
  local str = ({ 1, 0, -1, 0 })[f + 1]
  local P = R.painter(cv, 0, 0, 1)
  local U = R.painter(cv, 0, bob, 1)
  -- far legs
  P.capsule(10, 15, 9 - a - str, 21, 1.3, dark); P.capsule(20, 15, 21 + a + str, 21, 1.3, dark)
  -- tail
  local tw = ({ 0, 1, 0, -1 })[f + 1]
  U.curve({ { 9, 12 }, { 5, 9 + tw }, { 2.5, 5 + tw } }, 2.5, fur)
  U.ellipse(2.5, 4.5 + tw, 2.4, 2.2, light)
  -- body
  U.ellipse(15, 13.5, 7.5, 4.2, fur)
  U.ellipse(17, 15.5, 5, 2, light)
  -- near legs
  P.capsule(12, 16, 12 + a + str, 21.2, 1.4, fur); P.capsule(21, 16, 22 - a - str, 21.2, 1.4, fur)
  P.ellipse(12.5 + a + str, 21.8, 1.6, 0.9, dark); P.ellipse(22.5 - a - str, 21.8, 1.6, 0.9, dark)
  -- head
  U.poly({ { 20, 7.5 }, { 21, 1.5 }, { 23.5, 6.5 } }, fur)
  U.poly({ { 23.5, 6.5 }, { 26, 1.5 }, { 26.5, 7.5 } }, fur)
  U.px(25.6, 4.4, M('inner', '#ff9ec0'), 0.6)
  U.ellipse(23.5, 9.5, 4.2, 3.6, fur)
  U.poly({ { 25, 8 }, { 31, 10.4 }, { 30, 12 }, { 25.5, 12.6 } }, light)
  U.px(30.6, 10.4, DARK)
  U.stamp(24, 8, { "EW" }, { E = glow('eye', '#ffe24a'), W = WHITE })
  U.capsule(23.5, 7.2, 26, 7.6, 0.4, DARK, { shade = 0 })
end

R.save(out, src, 'boss_ngutinh', bossFrames(96, 72, ngutinh), 125, BOSS_ANIMS)
R.save(out, src, 'boss_hotinh', bossFrames(88, 72, hotinh), 125, BOSS_ANIMS)
R.save(out, src, 'boss_moctinh', bossFrames(80, 96, moctinh), 125, BOSS_ANIMS)
do
  local t = {}
  for fr = 0, 3 do t[#t + 1] = R.frame(32, 24, function(cv) foxMinion(cv, fr) end) end
  R.save(out, src, 'enemy_fox', t, 83, { walk = { 0, 3, 12, true } })
end

return true
