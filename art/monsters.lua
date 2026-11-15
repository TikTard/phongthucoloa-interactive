-- Demon army (fantasy), bosses, and the dragon / turtle summons.
local R = ...
local M, F = R.mat, R.flat
local out, src = R.outDir, R.srcDir

local function glow(name, h) return R.mat(name, h, { noline = true, nooutline = true, light = 1.4 }) end
local WHITE = F('white', '#ffffff')
local DARK = F('dark', '#1d1230')
local GOLD = M('gold', '#f2c443')
local METAL = M('metal', '#aeb8cc')
local BONE = M('bone', '#efe2c4')

local function frames(n, w, h, draw)
  local t = {}
  for f = 0, n - 1 do t[#t + 1] = R.frame(w, h, function(cv) draw(cv, f) end) end
  return t
end

---------------------------------------------------------------------------
-- Imp 32x32
---------------------------------------------------------------------------
local function imp(pal)
  return function(cv, f)
    local bob = ({ 0, -1, 0, -1 })[f + 1]
    local step = ({ 1.6, 0, -1.6, 0 })[f + 1]
    local P = R.painter(cv, 0, 0, 1)
    local U = R.painter(cv, 0, bob, 1)
    local body, dark, belly, wing = M('body', pal.body), M('bodyD', pal.dark), M('belly', pal.belly), M('wing', pal.wing)
    U.curve({ { 21, 24 }, { 26, 25.5 }, { 29, 21.5 }, { 28.5, 17 } }, 1.1, body)
    U.poly({ { 26.5, 17.5 }, { 29.5, 13.5 }, { 30.8, 18.5 } }, dark)
    local flap = (f % 2 == 0) and 0 or 2
    U.poly({ { 10, 17 }, { 2, 9 + flap }, { 4.5, 15 }, { 1.5, 19 + flap }, { 10, 21 } }, wing)
    U.poly({ { 22, 17 }, { 30, 9 + flap }, { 27.5, 15 }, { 30.5, 19 + flap }, { 22, 21 } }, wing)
    P.capsule(13, 25, 12 + step, 29.5, 1.9, dark)
    P.capsule(19, 25, 20 - step, 29.5, 1.9, dark)
    P.ellipse(12 + step, 30.4, 2.3, 1.2, dark)
    P.ellipse(20 - step, 30.4, 2.3, 1.2, dark)
    U.ellipse(16, 21, 6.6, 6, body)
    U.ellipse(16, 22.6, 4, 3.6, belly)
    U.capsule(10.5, 19, 7.8, 24, 1.7, body)
    U.capsule(21.5, 19, 24.2, 24, 1.7, body)
    U.px(7, 25, BONE, 0.8); U.px(25, 25, BONE, 0.8)
    U.ellipse(16, 12.5, 8.6, 7.6, body)
    U.poly({ { 7.8, 12 }, { 2.5, 9 }, { 8.4, 15.5 } }, body)
    U.poly({ { 24.2, 12 }, { 29.5, 9 }, { 23.6, 15.5 } }, body)
    U.poly({ { 9.5, 8.5 }, { 13, 7 }, { 7, 0.5 } }, BONE)
    U.poly({ { 22.5, 8.5 }, { 19, 7 }, { 25, 0.5 } }, BONE)
    local eye = glow('eye', pal.eye)
    U.capsule(10.5, 9.8, 14, 11, 0.6, dark, { shade = 0 })
    U.capsule(21.5, 9.8, 18, 11, 0.6, dark, { shade = 0 })
    U.stamp(11, 11, { "EEW", ".EE" }, { E = eye, W = WHITE })
    U.stamp(18, 11, { "WEE", "EE." }, { E = eye, W = WHITE })
    U.capsule(12.5, 15.6, 19.5, 15.6, 0.7, DARK)
    U.px(13.4, 16.4, WHITE); U.px(18.6, 16.4, WHITE)
  end
end

---------------------------------------------------------------------------
-- Wolf 40x28 (side view, faces right)
---------------------------------------------------------------------------
local function wolf(pal)
  return function(cv, f)
    local fur, dark, light = M('fur', pal.fur), M('furD', pal.dark), M('furL', pal.light)
    local a = ({ 2.5, 1, -2.5, -1 })[f + 1]
    local bob = ({ 0, -1, 0, 1 })[f + 1]
    local P = R.painter(cv, 0, 0, 1)
    local U = R.painter(cv, 0, bob, 1)
    -- far legs
    P.capsule(12, 18, 10 - a, 25, 1.6, dark); P.capsule(27, 18, 28 + a, 25, 1.6, dark)
    -- tail
    U.poly({ { 9, 12 }, { 1, 5 - bob }, { 3, 10 }, { 0, 13 }, { 8, 16 } }, fur)
    U.poly({ { 2, 6.5 - bob }, { 1, 5 - bob }, { 3.5, 6 - bob } }, light)
    -- body
    U.ellipse(19, 14.5, 11.5, 6.4, fur)
    U.ellipse(28, 14.5, 5.5, 6.4, light)
    U.poly({ { 12, 9 }, { 15, 6.5 }, { 18, 9 }, { 21, 6.8 }, { 24, 9 } }, dark)
    -- near legs
    P.capsule(15, 18, 16 + a, 25, 1.8, fur); P.capsule(30, 18, 31 - a, 25, 1.8, fur)
    P.ellipse(16 + a, 25.8, 2, 1.1, dark); P.ellipse(31 - a, 25.8, 2, 1.1, dark)
    -- head
    U.ellipse(32.5, 10.5, 5.6, 4.8, fur)
    U.poly({ { 34, 9 }, { 39.5, 11.5 }, { 38.5, 13.5 }, { 34.5, 14.5 } }, fur)
    U.px(39, 11.5, DARK)
    U.poly({ { 29, 7 }, { 31.5, 6.5 }, { 29.5, 0.5 } }, dark)
    U.poly({ { 32.5, 6.5 }, { 35, 7 }, { 34, 0.5 } }, fur)
    U.stamp(33, 9, { "EW", "EE" }, { E = glow('eye', pal.eye), W = WHITE })
    U.capsule(35, 13.5, 38.5, 13, 0.5, DARK)
    U.px(36, 14.2, WHITE); U.px(38, 14, WHITE)
  end
end

---------------------------------------------------------------------------
-- Shield oni 36x36
---------------------------------------------------------------------------
local function oni(pal)
  return function(cv, f)
    local skin, dark, armor = M('skin', pal.skin), M('skinD', pal.dark), M('armor', pal.armor)
    local step = ({ 1.5, 0, -1.5, 0 })[f + 1]
    local bob = ({ 0, -1, 0, -1 })[f + 1]
    local P = R.painter(cv, 0, 0, 1)
    local U = R.painter(cv, 0, bob, 1)
    P.capsule(13, 27, 12 + step, 33, 2.4, dark); P.capsule(20, 27, 21 - step, 33, 2.4, dark)
    P.ellipse(12 + step, 34, 3, 1.5, M('boot', '#3a2a30')); P.ellipse(21 - step, 34, 3, 1.5, M('boot', '#3a2a30'))
    U.ellipse(16.5, 22, 8.5, 7.5, skin)
    U.poly({ { 10, 18 }, { 23, 18 }, { 22, 27 }, { 11, 27 } }, armor)
    U.capsule(10.5, 22.5, 22.5, 22.5, 0.6, GOLD)
    U.capsule(9, 19, 6, 27, 2.2, skin)
    U.ellipse(16.5, 11, 7.6, 7, skin)
    U.poly({ { 10, 7 }, { 23, 7 }, { 22, 2.5 }, { 16.5, 0.5 }, { 11, 2.5 } }, armor)
    U.poly({ { 15, 3 }, { 18, 3 }, { 17.5, -4 } }, BONE)
    U.capsule(11.5, 9.6, 15, 10.6, 0.6, dark, { shade = 0 })
    U.capsule(21.5, 9.6, 18, 10.6, 0.6, dark, { shade = 0 })
    U.stamp(12, 11, { "EEW" }, { E = glow('eye', pal.eye), W = WHITE })
    U.stamp(18, 11, { "WEE" }, { E = glow('eye', pal.eye), W = WHITE })
    U.capsule(13, 15, 20, 15, 0.7, DARK)
    U.poly({ { 13.5, 15.5 }, { 14.5, 15.5 }, { 14, 17.5 } }, WHITE)
    U.poly({ { 18.5, 15.5 }, { 19.5, 15.5 }, { 19, 17.5 } }, WHITE)
    -- big shield in front
    local SH = M('shield', pal.shield)
    U.poly({ { 21, 10 }, { 34, 10 }, { 34, 26 }, { 27.5, 32 }, { 21, 26 } }, SH)
    U.capsule(21.6, 10.6, 33.4, 10.6, 0.7, GOLD)
    U.ellipse(27.5, 19, 3.6, 3.6, GOLD)
    U.ellipse(27.5, 19, 2, 2, M('gem', pal.gem))
    U.capsule(24, 22, 23, 25, 1.9, skin)
  end
end

---------------------------------------------------------------------------
-- Bat 32x24
---------------------------------------------------------------------------
local function bat(pal)
  return function(cv, f)
    local body, wing, dark = M('body', pal.body), M('wing', pal.wing), M('wingD', pal.dark)
    local U = R.painter(cv, 0, ({ 0, 1, 2, 1 })[f + 1], 1)
    local wy = ({ -6, -1, 5, -1 })[f + 1]
    U.poly({ { 13, 10 }, { 4, 4 + wy }, { 0, 9 + wy }, { 3, 12 + wy * 0.5 }, { 6, 11 + wy * 0.4 }, { 8, 14 }, { 13, 14 } }, wing)
    U.poly({ { 19, 10 }, { 28, 4 + wy }, { 32, 9 + wy }, { 29, 12 + wy * 0.5 }, { 26, 11 + wy * 0.4 }, { 24, 14 }, { 19, 14 } }, wing)
    U.capsule(13, 10, 4, 4 + wy, 0.6, dark); U.capsule(19, 10, 28, 4 + wy, 0.6, dark)
    U.ellipse(16, 13, 4.6, 5.2, body)
    U.poly({ { 12.5, 9 }, { 12, 3.5 }, { 14.5, 7.5 } }, body)
    U.poly({ { 19.5, 9 }, { 20, 3.5 }, { 17.5, 7.5 } }, body)
    U.stamp(13, 11, { "EW..WE" }, { E = glow('eye', pal.eye), W = WHITE })
    U.px(15, 14.5, WHITE); U.px(17, 14.5, WHITE)
  end
end

---------------------------------------------------------------------------
-- Stone golem 40x40
---------------------------------------------------------------------------
local function golem(pal)
  return function(cv, f)
    local rock, dark, moss = M('rock', pal.rock), M('rockD', pal.dark), M('moss', pal.moss)
    local core = glow('core', pal.core)
    local step = ({ 2, 0, -2, 0 })[f + 1]
    local bob = ({ 0, -1, 0, -1 })[f + 1]
    local P = R.painter(cv, 0, 0, 1)
    local U = R.painter(cv, 0, bob, 1)
    P.ellipse(14 + step, 34, 4.5, 4.5, dark); P.ellipse(26 - step, 34, 4.5, 4.5, dark)
    U.ellipse(20, 23, 11.5, 10, rock)
    U.ellipse(7, 22, 5, 6.5, rock); U.ellipse(33, 22, 5, 6.5, rock)
    U.ellipse(6, 30, 4, 3.5, dark); U.ellipse(34, 30, 4, 3.5, dark)
    U.ellipse(20, 10, 7, 6, rock)
    U.poly({ { 15, 20 }, { 18, 18 }, { 20, 24 }, { 23, 19 }, { 25, 22 }, { 21, 28 }, { 17, 26 } }, core)
    U.stamp(16, 9, { "EE..EE" }, { E = core })
    U.ellipse(13, 15, 4, 1.8, moss); U.ellipse(26, 14.5, 3.5, 1.6, moss); U.ellipse(20, 4.8, 4, 1.6, moss)
  end
end

local function save(key, fr, w, h, dur, fn)
  R.save(out, src, key, frames(fr, w, h, fn), dur, { walk = { 0, fr - 1, math.floor(1000 / dur), true } })
end

save('enemy_imp', 4, 32, 32, 150, imp({ body = '#d8443c', dark = '#9a2a30', belly = '#f08a6a', wing = '#7a2a5a', eye = '#ffe24a' }))
save('enemy_imp_ice', 4, 32, 32, 150, imp({ body = '#4a8ad8', dark = '#2a4a9a', belly = '#9ad0f8', wing = '#3a3a8a', eye = '#bff6ff' }))
save('enemy_imp_poison', 4, 32, 32, 150, imp({ body = '#5ab04a', dark = '#2a6a3a', belly = '#b0e07a', wing = '#4a2a6a', eye = '#ff5ad8' }))
save('enemy_wolf', 4, 40, 28, 110, wolf({ fur = '#8a8aa0', dark = '#4a4a62', light = '#c8c8d8', eye = '#ff4a4a' }))
save('enemy_wolf_shadow', 4, 40, 28, 110, wolf({ fur = '#5a3a8a', dark = '#2a1a4a', light = '#9a7ac8', eye = '#ffe24a' }))
save('enemy_shield', 4, 36, 36, 180, oni({ skin = '#7a5ac8', dark = '#4a3a8a', armor = '#5a5f78', shield = '#8a92aa', gem = '#ff4a4a', eye = '#ffe24a' }))
save('enemy_shield_red', 4, 36, 36, 180, oni({ skin = '#d84a3a', dark = '#8a2a2a', armor = '#3a3040', shield = '#b8902a', gem = '#4affd8', eye = '#ffffff' }))
save('enemy_bat', 4, 32, 24, 90, bat({ body = '#5a3a7a', wing = '#7a4a9a', dark = '#3a2050', eye = '#ff4a4a' }))
save('enemy_bat_fire', 4, 32, 24, 90, bat({ body = '#9a3a2a', wing = '#e07a2a', dark = '#7a2a1a', eye = '#fff27a' }))
save('enemy_golem', 4, 40, 40, 220, golem({ rock = '#8a8478', dark = '#5a564e', moss = '#6aa04a', core = '#ff8a2a' }))
save('enemy_golem_moss', 4, 40, 40, 220, golem({ rock = '#6a7a5a', dark = '#45503a', moss = '#8ad05a', core = '#5affb0' }))

---------------------------------------------------------------------------
-- Boss: Oni general 72x72
---------------------------------------------------------------------------
local function general(pal)
  return function(cv, f)
    local skin, armor, armorD, cape, mane = M('skin', pal.skin), M('armor', pal.armor), M('armorD', pal.armorD), M('cape', pal.cape), M('mane', pal.mane)
    local step = ({ 2.5, 0, -2.5, 0 })[f + 1]
    local bob = ({ 0, -1, 0, -1 })[f + 1]
    local sw = ({ 0, 1, 0, -1 })[f + 1]
    local P = R.painter(cv, 0, 0, 1)
    local U = R.painter(cv, 0, bob, 1)
    U.poly({ { 22, 30 }, { 50, 30 }, { 58 + sw, 66 }, { 36, 70 }, { 14 + sw, 66 } }, cape)
    P.capsule(29, 50, 27 + step, 64, 4.2, armorD); P.capsule(43, 50, 45 - step, 64, 4.2, armorD)
    P.ellipse(27 + step, 66, 5, 2.6, M('boot', '#2a2030')); P.ellipse(45 - step, 66, 5, 2.6, M('boot', '#2a2030'))
    -- mane behind head
    for i = 0, 6 do
      local a = math.pi * (0.9 + i * 0.2)
      U.poly({ { 36 + math.cos(a) * 6, 20 + math.sin(a) * 6 }, { 36 + math.cos(a + 0.25) * 16, 20 + math.sin(a + 0.25) * 15 }, { 36 + math.cos(a + 0.4) * 6, 20 + math.sin(a + 0.4) * 6 } }, mane)
    end
    -- torso
    U.ellipse(36, 42, 13.5, 12, armor)
    U.poly({ { 25, 48 }, { 47, 48 }, { 49, 58 }, { 23, 58 } }, armorD)
    U.poly({ { 27, 33 }, { 45, 33 }, { 43, 46 }, { 36, 49 }, { 29, 46 } }, armorD)
    U.capsule(28, 41, 44, 41, 0.9, GOLD)
    U.ellipse(36, 41, 3.2, 3.2, GOLD); U.ellipse(36, 41, 1.8, 1.8, glow('gem', pal.gem))
    U.rect(24, 47, 24, 2.6, GOLD)
    -- left arm
    U.capsule(24, 36, 17, 50, 4, skin)
    U.ellipse(16.5, 51.5, 3.6, 3.4, armorD)
    -- pauldrons with spikes
    U.ellipse(22, 33, 7.5, 5.5, armor); U.ellipse(50, 33, 7.5, 5.5, armor)
    U.poly({ { 17, 30 }, { 13, 23 }, { 20, 28 } }, BONE); U.poly({ { 55, 30 }, { 59, 23 }, { 52, 28 } }, BONE)
    -- head
    U.ellipse(36, 21, 10, 10, skin)
    U.poly({ { 27, 22 }, { 45, 22 }, { 42, 30 }, { 36, 32 }, { 30, 30 } }, skin, { shade = 0.55 })
    U.curve({ { 29, 15 }, { 24, 10 }, { 21, 3 } }, 2.4, BONE); U.poly({ { 19.5, 4 }, { 22.5, 3 }, { 20, -2 } }, BONE)
    U.curve({ { 43, 15 }, { 48, 10 }, { 51, 3 } }, 2.4, BONE); U.poly({ { 52.5, 4 }, { 49.5, 3 }, { 52, -2 } }, BONE)
    U.capsule(28.5, 17, 34, 19.5, 1, DARK, { shade = 0 }); U.capsule(43.5, 17, 38, 19.5, 1, DARK, { shade = 0 })
    local eye = glow('eye', pal.eye)
    U.stamp(29, 20, { "EEEW", ".EEE" }, { E = eye, W = WHITE })
    U.stamp(39, 20, { "WEEE", "EEE." }, { E = eye, W = WHITE })
    U.capsule(31, 27, 41, 27, 1.1, DARK)
    U.poly({ { 31.5, 27 }, { 33.5, 27 }, { 32.5, 31 } }, WHITE); U.poly({ { 38.5, 27 }, { 40.5, 27 }, { 39.5, 31 } }, WHITE)
    -- giant blade
    local B = M('blade', pal.blade)
    U.poly({ { 50, 44 + sw }, { 55, 46 + sw }, { 71, 5 }, { 67, 1 } }, B)
    U.capsule(53, 44 + sw, 69, 3, 0.6, glow('edge', '#ffffff'))
    U.capsule(48, 45 + sw, 58, 50 + sw, 1.6, GOLD)
    U.capsule(51, 48 + sw, 49, 53 + sw, 1.3, M('grip', '#3a2a20'))
    U.capsule(46, 36, 51, 49 + sw, 4, skin)
    U.ellipse(51, 50 + sw, 3.6, 3.4, armorD)
  end
end
save('boss_general', 4, 72, 72, 200, general({ skin = '#c83a3a', armor = '#5a3040', armorD = '#3a2030', cape = '#4a2a6a', mane = '#f0eef6', eye = '#ffe24a', gem = '#ff3a6a', blade = '#c8d0e0' }))
save('boss_general_dark', 4, 72, 72, 200, general({ skin = '#4a4a7a', armor = '#2a2a3a', armorD = '#1a1a2a', cape = '#8a1a2a', mane = '#3a3050', eye = '#4affe0', gem = '#4affe0', blade = '#8a5ac8' }))

---------------------------------------------------------------------------
-- Serpent boss / golden dragon 96x48 (body is a sine wave of shaded ellipses)
---------------------------------------------------------------------------
local function wyrm(pal, dragon)
  return function(cv, f)
    local body, belly, fin = M('body', pal.body), M('belly', pal.belly), M('fin', pal.fin)
    local U = R.painter(cv, 0, 0, 1)
    local N = 22
    local phase = f * math.pi / 2
    local pts = {}
    for i = 0, N do
      local x = 4 + i * 3.4
      local y = 30 + math.sin(i * 0.42 - phase) * (dragon and 8 or 6)
      pts[#pts + 1] = { x, y, 2.4 + 6.2 * (i / N) }
    end
    for i, p in ipairs(pts) do
      if i % 3 == 0 then
        U.poly({ { p[1] - 2, p[2] - p[3] + 1 }, { p[1] + 0.5, p[2] - p[3] - 4.5 - (dragon and 2 or 0) }, { p[1] + 2.5, p[2] - p[3] + 1 } }, fin)
      end
    end
    if dragon then
      for _, i in ipairs({ 8, 16 }) do
        local p = pts[i]
        U.capsule(p[1], p[2] + 2, p[1] - 2, p[2] + p[3] + 4, 1.6, body)
        U.stamp(p[1] - 4, p[2] + p[3] + 4, { "W.W.W" }, { W = BONE })
      end
    end
    for _, p in ipairs(pts) do U.ellipse(p[1], p[2], p[3] * 1.15, p[3], body) end
    for _, p in ipairs(pts) do U.ellipse(p[1], p[2] + p[3] * 0.5, p[3] * 0.8, p[3] * 0.42, belly) end
    local hx, hy = 83, pts[#pts][2] - 6
    local open = (f % 2 == 1) and 2.5 or 0
    U.ellipse(hx, hy, 10, 8, body)
    U.poly({ { hx + 4, hy - 4 }, { hx + 14, hy + 0.5 }, { hx + 5, hy + 3 } }, body)
    U.poly({ { hx + 3, hy + 3 + open }, { hx + 12, hy + 3.5 + open }, { hx + 4, hy + 7 + open } }, belly)
    if open > 0 then
      U.capsule(hx + 5, hy + 3.8, hx + 11, hy + 3.8, 0.9, M('mouth', '#6a1a2a'))
      U.curve({ { hx + 9, hy + 4.5 }, { hx + 13.5, hy + 5.5 }, { hx + 15, hy + 4.5 } }, 0.5, F('tongue', '#ff4a6a'))
    end
    U.px(hx + 6.5, hy + 3.4, WHITE); U.px(hx + 9.5, hy + 3.6, WHITE)
    U.stamp(math.floor(hx + 1), math.floor(hy - 3), { "EEW", "EE." }, { E = glow('eye', pal.eye), W = WHITE })
    if dragon then
      -- antlers, whiskers and flame mane: a Vietnamese-style dragon
      U.curve({ { hx - 3, hy - 6 }, { hx - 7, hy - 13 }, { hx - 4, hy - 17 } }, 1, GOLD)
      U.curve({ { hx - 6, hy - 11 }, { hx - 11, hy - 13 } }, 0.8, GOLD)
      U.curve({ { hx, hy - 7 }, { hx + 1, hy - 14 }, { hx + 4, hy - 17 } }, 1, GOLD)
      local wh = F('whisker', '#fff2c0')
      U.curve({ { hx + 11, hy + 1 }, { hx + 15, hy - 3 }, { hx + 13, hy - 8 + (f % 2) } }, 0.4, wh)
      U.curve({ { hx + 10, hy + 4 }, { hx + 13, hy + 9 }, { hx + 10, hy + 12 - (f % 2) } }, 0.4, wh)
      local fire = glow('mane', '#ff6a3a')
      for i = 0, 3 do U.poly({ { hx - 6 - i * 3, hy - 4 + i }, { hx - 12 - i * 3, hy - 9 + i * 2 - (f % 2) }, { hx - 8 - i * 3, hy + i } }, fire) end
    else
      for i = 0, 2 do U.poly({ { hx - 5 + i * 3.5, hy - 6 }, { hx - 4 + i * 3.5, hy - 12 + math.abs(i - 1) * 2 }, { hx - 2.5 + i * 3.5, hy - 6 } }, GOLD) end
    end
  end
end
save('boss_serpent', 4, 96, 48, 160, wyrm({ body = '#3a8a5a', belly = '#d8e08a', fin = '#2a5a6a', eye = '#ff3a3a' }, false))
save('summon_dragon', 4, 96, 48, 110, wyrm({ body = '#f0b830', belly = '#fff0b0', fin = '#e04a2a', eye = '#ff3a3a' }, true))

---------------------------------------------------------------------------
-- Golden turtle 48x32
---------------------------------------------------------------------------
save('summon_turtle', 2, 48, 32, 400, function(cv, f)
  local U = R.painter(cv, 0, 0, 1)
  local jade, shell, rim = M('jade', '#4ab08a'), M('shell', '#f0c040'), M('rim', '#c8902a')
  U.ellipse(10, 26, 5, 2.6, jade); U.ellipse(34, 26, 5, 2.6, jade)
  U.ellipse(40 + f, 17 - f, 5.5, 4.4, jade)
  U.stamp(41 + f, 15 - f, { "kW", "kk" }, { k = DARK, W = WHITE })
  U.ellipse(22, 22, 17.5, 4, rim)
  U.ellipse(22, 17, 16, 11, shell)
  for _, c in ipairs({ { 22, 12 }, { 15, 16 }, { 29, 16 }, { 22, 19 }, { 12, 21 }, { 32, 21 } }) do
    U.ellipse(c[1], c[2], 3.4, 2.6, rim, { shade = 0.75 })
  end
  U.ellipse(10, 26, 4, 2, jade)
end)

return true
