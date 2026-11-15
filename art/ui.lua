-- Pixel UI: 9-slice frames (baked at 2x so pixels stay chunky), bubble tails, banner, scroll, icons.
local R = ...
local M, F = R.mat, R.flat
local out, src = R.outDir, R.srcDir
local hex = R.hex

local function color(h) local c = hex(h); return app.pixelColor.rgba(c[1], c[2], c[3], 255) end

local function up2(img)
  local o = Image(img.width * 2, img.height * 2, ColorMode.RGB)
  for y = 0, img.height - 1 do
    for x = 0, img.width - 1 do
      local p = img:getPixel(x, y)
      if app.pixelColor.rgbaA(p) > 0 then
        o:drawPixel(x * 2, y * 2, p); o:drawPixel(x * 2 + 1, y * 2, p)
        o:drawPixel(x * 2, y * 2 + 1, p); o:drawPixel(x * 2 + 1, y * 2 + 1, p)
      end
    end
  end
  return o
end

local function save(key, img) R.save(out, src, key, { up2(img) }) end

-- generic bevelled frame. layers = list of {colorTopLeft, colorBottomRight} from the outside in, then fill.
local function frame(w, h, layers, fill, opts)
  opts = opts or {}
  local img = Image(w, h, ColorMode.RGB)
  for y = 0, h - 1 do
    for x = 0, w - 1 do
      local d = math.min(x, y, w - 1 - x, h - 1 - y)
      local corner = (x == 0 or x == w - 1) and (y == 0 or y == h - 1)
      if not corner then
        local c
        if d < #layers then
          local l = layers[d + 1]
          c = ((x - d <= 0 or y - d <= 0) and (w - 1 - x - d > 0 and h - 1 - y - d > 0)) and l[1] or l[2]
          if (x == d or y == d) and not (x == w - 1 - d or y == h - 1 - d) then c = l[1] else c = l[2] end
        else
          c = fill
        end
        img:drawPixel(x, y, color(c))
      end
    end
  end
  -- 2-step rounded corners
  local oc = color(layers[1][1])
  for _, p in ipairs({ { 1, 1 }, { w - 2, 1 }, { 1, h - 2 }, { w - 2, h - 2 } }) do img:drawPixel(p[1], p[2], oc) end
  if opts.studs then
    local s = color(opts.studs)
    local i = #layers
    for _, p in ipairs({ { i, i }, { w - 1 - i, i }, { i, h - 1 - i }, { w - 1 - i, h - 1 - i } }) do img:drawPixel(p[1], p[2], s) end
  end
  return img
end

-- bubble tail matching a frame (outline + fill), 9x6 art px, tip pointing down
local function tail(outline, fill)
  local img = Image(9, 6, ColorMode.RGB)
  for r = 0, 5 do
    local half = 4 - math.floor(r * 0.8)
    for x = 4 - half, 4 + half do
      local edge = (x == 4 - half or x == 4 + half) or r == 5
      if r == 0 and not (x == 0 or x == 8) then edge = false end
      img:drawPixel(x, r, color(edge and outline or fill))
    end
  end
  return img
end

local INK = '#2a170e'
local FRAMES = {
  paper  = { layers = { { INK, INK }, { '#fff8e2', '#cdb486' } }, fill = '#f3e4c0' },
  sky    = { layers = { { '#14243a', '#14243a' }, { '#f2fbff', '#9ab8d0' } }, fill = '#dcebf5' },
  jade   = { layers = { { '#0e2a20', '#0e2a20' }, { '#d8ffe8', '#5aa080' } }, fill = '#a8e2c4' },
  violet = { layers = { { '#1e1236', '#1e1236' }, { '#f0e6ff', '#9a80c8' } }, fill = '#d8c8f2' },
  rose   = { layers = { { '#3a0e14', '#3a0e14' }, { '#ffe2e2', '#c88a8a' } }, fill = '#f2c4c4' },
  lacquer = { layers = { { '#22070a', '#22070a' }, { '#ffe58a', '#9a6a14' }, { '#f2c443', '#b8862a' }, { '#5a1016', '#5a1016' } }, fill = '#8e1f26', studs = '#ffe58a' },
  dark   = { layers = { { '#0a0606', '#0a0606' }, { '#c89a4a', '#6a4a1a' }, { '#3a2818', '#1e140c' } }, fill = '#2a1d14', studs = '#ffe58a' },
  wood   = { layers = { { '#1a0e08', '#1a0e08' }, { '#b07a46', '#5a3a1e' } }, fill = '#8a5a34' },
  bar    = { layers = { { '#0a0606', '#0a0606' }, { '#d8b060', '#6a4a1a' }, { '#120a06', '#120a06' } }, fill = '#22160e' },
}
for name, f in pairs(FRAMES) do
  local size = (#f.layers + 3) * 2 + 4
  save('ui_' .. name, frame(size, size, f.layers, f.fill, { studs = f.studs }))
  save('ui_tail_' .. name, tail(f.layers[1][1], #f.layers > 2 and f.layers[2][1] or f.fill))
end

-- red silk banner body (9-slice horizontally) + fishtail ends
do
  local w, h = 16, 22
  local img = Image(w, h, ColorMode.RGB)
  for y = 0, h - 1 do
    for x = 0, w - 1 do
      local c
      if y == 0 or y == h - 1 then c = INK
      elseif y == 1 or y == h - 2 then c = '#ffe58a'
      elseif y == 2 or y == h - 3 then c = '#c8902a'
      elseif y == 3 then c = '#e8484a'
      elseif y >= h - 5 then c = '#8a1a22'
      else c = '#b8262e' end
      img:drawPixel(x, y, color(c))
    end
  end
  save('ui_banner', img)
  local e = Image(12, 26, ColorMode.RGB)
  for y = 0, 25 do
    for x = 0, 11 do
      -- swallowtail: notch cut from the left edge
      local notch = math.abs(y - 12.5) < (6 - x) * 1.2
      local inBody = y >= 2 and y <= 23
      if inBody and not notch then
        local c = '#8a1a22'
        if y == 2 or y == 23 then c = INK
        elseif y == 3 or y == 22 then c = '#c8902a'
        elseif math.abs(y - 12.5) < (6 - x) * 1.2 + 1.2 then c = INK end
        if x == 11 then c = INK end
        e:drawPixel(x, y, color(c))
      end
    end
  end
  save('ui_banner_end', e)
end

-- scroll rod (wood with gold caps)
do
  local img = Image(8, 44, ColorMode.RGB)
  for y = 0, 43 do
    for x = 0, 7 do
      local cap = y < 4 or y > 39
      local c
      if cap then
        if x >= 1 and x <= 6 then c = (x <= 2) and '#ffe58a' or (x >= 5 and '#9a6a14' or '#f2c443') end
        if y == 0 or y == 43 then c = (x >= 2 and x <= 5) and INK or nil end
        if (x == 0 or x == 7) and y > 0 and y < 43 then c = INK end
      elseif x >= 1 and x <= 6 then
        c = (x == 1 or x == 6) and INK or (x == 2 and '#a8683a' or (x == 5 and '#4a2a14' or '#7a4a26'))
      end
      if c then img:drawPixel(x, y, color(c)) end
    end
  end
  save('ui_rod', img)
end

-- red seal / tag
save('ui_seal', frame(12, 12, { { '#3a0606', '#3a0606' }, { '#e84a3a', '#8a1414' } }, '#c42a26'))

---------------------------------------------------------------------------
-- icons 14x14 (rasterizer, outlined) and the treasure chest
---------------------------------------------------------------------------
local GOLD = M('gold', '#f2c443')
local function icon(key, w, h, draw) R.save(out, src, key, { R.frame(w, h, draw) }) end

icon('ic_castle', 14, 14, function(cv)
  local P = R.painter(cv)
  local st = M('stone', '#b8b8c8')
  P.rect(1, 5, 12, 8, st)
  for _, x in ipairs({ 1, 5, 9 }) do P.rect(x, 2, 3, 3, st) end
  P.rect(5, 8, 4, 5, F('door', '#3a2418'))
  P.poly({ { 6, 0 }, { 9, 1.2 }, { 6, 2.4 } }, M('flag', '#e8484a'))
end)
icon('ic_sword', 14, 14, function(cv)
  local P = R.painter(cv)
  P.capsule(3, 11, 11.5, 2.5, 1.1, M('blade', '#dfe6f2'))
  P.capsule(2, 8.5, 5.5, 12, 0.9, GOLD)
  P.capsule(1.5, 12.5, 3, 11, 0.9, M('grip', '#6a3a1e'))
end)
icon('ic_skull', 14, 14, function(cv)
  local P = R.painter(cv)
  local b = M('bone', '#efe2c4')
  P.ellipse(7, 6, 5.5, 5, b); P.rect(4.5, 9, 5, 3.5, b)
  P.ellipse(5, 6.5, 1.4, 1.6, F('eye', '#e8303a')); P.ellipse(9, 6.5, 1.4, 1.6, F('eye', '#e8303a'))
  P.px(6, 11.5, F('t', '#2a170e')); P.px(8, 11.5, F('t', '#2a170e'))
end)
icon('ic_crown', 14, 12, function(cv)
  local P = R.painter(cv)
  P.poly({ { 1, 10 }, { 13, 10 }, { 13, 3 }, { 10, 6 }, { 7, 1 }, { 4, 6 }, { 1, 3 } }, GOLD)
  P.px(7, 6.5, F('ruby', '#ff3060'))
end)
icon('ic_medal', 14, 16, function(cv)
  local P = R.painter(cv)
  P.poly({ { 3, 0 }, { 6, 0 }, { 8, 6 }, { 5, 6 } }, M('ribbonA', '#3a6ad8'))
  P.poly({ { 8, 0 }, { 11, 0 }, { 9, 6 }, { 6, 6 } }, M('ribbonB', '#e8484a'))
  P.ellipse(7, 10.5, 4.5, 4.5, GOLD)
  P.px(7, 10.5, F('star', '#fff6c0'))
end)
icon('ic_gift', 14, 14, function(cv)
  local P = R.painter(cv)
  P.rect(1, 6, 12, 7, M('box', '#e8484a'))
  P.rect(0.5, 4, 13, 3, M('lid', '#f05a5a'))
  P.rect(6, 4, 2, 9, GOLD)
  P.ellipse(4.5, 2.5, 2.4, 1.6, GOLD); P.ellipse(9.5, 2.5, 2.4, 1.6, GOLD)
end)
icon('ic_book', 14, 14, function(cv)
  local P = R.painter(cv)
  P.rect(1, 2, 12, 10, M('cover', '#3a8a5a'))
  P.rect(2.5, 3, 4, 8, M('page', '#f3e4c0')); P.rect(7.5, 3, 4, 8, M('page2', '#e8d8b0', { group = 'page' }))
  P.capsule(3.5, 5, 5.5, 5, 0.4, F('ink', '#7a5a3a')); P.capsule(8.5, 5, 10.5, 5, 0.4, F('ink', '#7a5a3a'))
end)
icon('ic_cross', 14, 14, function(cv)
  local P = R.painter(cv)
  local g = M('heal', '#4ad87a')
  P.rect(5, 1, 4, 12, g); P.rect(1, 5, 12, 4, g)
end)
icon('ic_sprout', 14, 14, function(cv)
  local P = R.painter(cv)
  P.capsule(7, 13, 7, 6, 0.8, M('stem', '#3a8a3a'))
  P.ellipse(4.5, 6, 3, 2, M('leafA', '#6ad05a')); P.ellipse(9.5, 4.5, 3, 2, M('leafB', '#5ac04a', { group = 'leafA' }))
end)

icon('chest', 28, 22, function(cv)
  local P = R.painter(cv)
  local wood, woodD = M('wood', '#8a5228'), M('woodD', '#6a3a1a')
  P.rect(2, 10, 24, 11, wood)
  P.poly({ { 2, 10 }, { 26, 10 }, { 25, 4 }, { 21, 1.5 }, { 7, 1.5 }, { 3, 4 } }, woodD)
  P.rect(1.5, 9, 25, 2.4, GOLD)
  P.rect(5, 2, 2.4, 19, GOLD); P.rect(20.6, 2, 2.4, 19, GOLD)
  P.rect(11.5, 8, 5, 6, GOLD)
  P.px(14, 11, F('hole', '#2a170e'))
  local glow = R.mat('gl', '#fff2a0', { noline = true, nooutline = true })
  P.px(9, 0.5, glow); P.px(18, 0, glow)
end)

return true
