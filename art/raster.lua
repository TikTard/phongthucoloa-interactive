-- Tiny pixel-art rasterizer for Aseprite scripts.
-- Shapes are painted with a "material" (a 5-step colour ramp). Each shape is lit from the top-left,
-- so ellipses/capsules come out with cel-shaded volume. finalize() adds anime-style line art:
-- coloured outer outlines and inner lines wherever a later shape overlaps an earlier one.

local R = {}

---------------------------------------------------------------------------
-- colours
---------------------------------------------------------------------------
local function hex(h)
  return { tonumber(h:sub(2, 3), 16), tonumber(h:sub(4, 5), 16), tonumber(h:sub(6, 7), 16) }
end
local function mix(a, b, t)
  return { a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t }
end
R.hex, R.mix = hex, mix

local SHADOW = { 38, 18, 62 }   -- shadows lean purple
local LIGHT = { 255, 246, 214 } -- lights lean warm

-- 5-step hue-shifted ramp from one base colour
function R.ramp(baseHex, opts)
  opts = opts or {}
  local b = hex(baseHex)
  local d = opts.dark or 1
  return {
    mix(b, SHADOW, 0.62 * d),
    mix(b, SHADOW, 0.32 * d),
    b,
    mix(b, LIGHT, 0.32 * (opts.light or 1)),
    mix(b, LIGHT, 0.62 * (opts.light or 1)),
  }
end

-- material = { ramp, outline, noline, glow, name }
function R.mat(name, baseHex, opts)
  opts = opts or {}
  local ramp = opts.ramp or R.ramp(baseHex, opts)
  return {
    name = name,
    ramp = ramp,
    outline = opts.outline and hex(opts.outline) or mix(ramp[1], { 18, 8, 32 }, 0.55),
    noline = opts.noline,       -- never gets inner lines / never causes them
    nooutline = opts.nooutline, -- no outer outline (glows, effects)
    group = opts.group or name, -- shapes of the same group don't draw lines between each other
  }
end

-- flat single colour material (eyes, details)
function R.flat(name, h, opts)
  opts = opts or {}
  local c = hex(h)
  return R.mat(name, h, { ramp = { c, c, c, c, c }, noline = true, nooutline = opts.nooutline, outline = opts.outline })
end

---------------------------------------------------------------------------
-- canvas
---------------------------------------------------------------------------
function R.canvas(w, h)
  return { w = w, h = h, c = {}, m = {}, o = {}, n = 0 }
end

local function put(cv, x, y, mat, shade)
  x, y = math.floor(x), math.floor(y)
  if x < 0 or y < 0 or x >= cv.w or y >= cv.h then return end
  local r = mat.ramp
  local i = math.floor(math.max(0, math.min(1, shade)) * (#r - 1) + 0.5) + 1
  local k = y * cv.w + x
  cv.c[k] = r[i]
  cv.m[k] = mat
  cv.o[k] = cv.n
end

local LX, LY, LZ = -0.5, -0.72, 0.55
do local l = math.sqrt(LX * LX + LY * LY + LZ * LZ); LX, LY, LZ = LX / l, LY / l, LZ / l end

local function lit(nx, ny, nz, opt)
  local d = math.max(0, nx * LX + ny * LY + nz * LZ)
  local s = 0.08 + 1.0 * d + (opt and opt.bias or 0)
  if opt and opt.rim and nx > 0.55 and ny > -0.2 then s = s + 0.25 end -- back-light rim
  return s
end

-- painter with a transform (offset + uniform scale)
function R.painter(cv, ox, oy, k)
  ox, oy, k = ox or 0, oy or 0, k or 1
  local P = { cv = cv, ox = ox, oy = oy, k = k }
  local tx = function(x) return ox + x * k end
  local ty = function(y) return oy + y * k end

  function P.ellipse(cx, cy, rx, ry, mat, opt)
    opt = opt or {}
    cx, cy, rx, ry = tx(cx), ty(cy), rx * k, ry * k
    cv.n = cv.n + 1
    for y = math.floor(cy - ry - 1), math.ceil(cy + ry + 1) do
      for x = math.floor(cx - rx - 1), math.ceil(cx + rx + 1) do
        local nx = (x + 0.5 - cx) / rx
        local ny = (y + 0.5 - cy) / ry
        local d = nx * nx + ny * ny
        if d <= 1 then
          local s = opt.shade or lit(nx, ny, math.sqrt(1 - d), opt)
          put(cv, x, y, mat, s)
        end
      end
    end
  end

  -- capsule (thick line with round ends), shaded as a cylinder
  function P.capsule(x1, y1, x2, y2, r, mat, opt)
    opt = opt or {}
    x1, y1, x2, y2, r = tx(x1), ty(y1), tx(x2), ty(y2), r * k
    cv.n = cv.n + 1
    local dx, dy = x2 - x1, y2 - y1
    local len2 = dx * dx + dy * dy
    for y = math.floor(math.min(y1, y2) - r - 1), math.ceil(math.max(y1, y2) + r + 1) do
      for x = math.floor(math.min(x1, x2) - r - 1), math.ceil(math.max(x1, x2) + r + 1) do
        local px, py = x + 0.5, y + 0.5
        local t = len2 > 0 and math.max(0, math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2)) or 0
        local cx, cy = x1 + dx * t, y1 + dy * t
        local ex, ey = px - cx, py - cy
        local d = math.sqrt(ex * ex + ey * ey)
        if d <= r then
          local nx, ny = ex / r, ey / r
          local nz = math.sqrt(math.max(0, 1 - nx * nx - ny * ny))
          put(cv, x, y, mat, opt.shade or lit(nx, ny, nz, opt))
        end
      end
    end
  end

  -- polyline of capsules (for curves)
  function P.curve(pts, r, mat, opt)
    for i = 1, #pts - 1 do P.capsule(pts[i][1], pts[i][2], pts[i + 1][1], pts[i + 1][2], r, mat, opt) end
  end

  -- filled polygon with a top-left to bottom-right gradient
  function P.poly(pts, mat, opt)
    opt = opt or {}
    local tp = {}
    local minx, miny, maxx, maxy = 1e9, 1e9, -1e9, -1e9
    for i, p in ipairs(pts) do
      tp[i] = { tx(p[1]), ty(p[2]) }
      minx = math.min(minx, tp[i][1]); maxx = math.max(maxx, tp[i][1])
      miny = math.min(miny, tp[i][2]); maxy = math.max(maxy, tp[i][2])
    end
    cv.n = cv.n + 1
    local w, h = math.max(1, maxx - minx), math.max(1, maxy - miny)
    for y = math.floor(miny), math.ceil(maxy) do
      for x = math.floor(minx), math.ceil(maxx) do
        local px, py = x + 0.5, y + 0.5
        local inside = false
        local j = #tp
        for i = 1, #tp do
          local xi, yi, xj, yj = tp[i][1], tp[i][2], tp[j][1], tp[j][2]
          if ((yi > py) ~= (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi) then inside = not inside end
          j = i
        end
        if inside then
          local s = opt.shade
          if not s then
            local t = ((px - minx) / w) * 0.45 + ((py - miny) / h) * 0.55
            s = 0.92 - 0.62 * t + (opt.bias or 0)
          end
          put(cv, x, y, mat, s)
        end
      end
    end
  end

  function P.rect(x, y, w, h, mat, opt)
    P.poly({ { x, y }, { x + w, y }, { x + w, y + h }, { x, y + h } }, mat, opt)
  end

  -- single pixel (after transform), shade 0..1
  function P.px(x, y, mat, shade)
    cv.n = cv.n + 1
    put(cv, tx(x), ty(y), mat, shade or 0.5)
  end

  -- tiny ASCII stamp at transformed position, 1 char = 1 real pixel (not scaled)
  function P.stamp(x, y, rows, pal)
    cv.n = cv.n + 1
    local bx, by = math.floor(tx(x)), math.floor(ty(y))
    for j, row in ipairs(rows) do
      for i = 1, #row do
        local ch = row:sub(i, i)
        if ch ~= '.' and pal[ch] then put(cv, bx + i - 1, by + j - 1, pal[ch], 0.5) end
      end
    end
  end

  -- recolour already painted pixels of a material inside a band (hair shine etc.)
  function P.recolor(x1, y1, x2, y2, mat, shadeIndex, test)
    for y = math.floor(ty(y1)), math.floor(ty(y2)) do
      for x = math.floor(tx(x1)), math.floor(tx(x2)) do
        local key = y * cv.w + x
        if x >= 0 and y >= 0 and x < cv.w and y < cv.h and cv.m[key] == mat and (not test or test(x, y)) then
          cv.c[key] = mat.ramp[shadeIndex]
        end
      end
    end
  end

  return P
end

---------------------------------------------------------------------------
-- line art + export
---------------------------------------------------------------------------
function R.finalize(cv, opts)
  opts = opts or {}
  local w, h = cv.w, cv.h
  local out = {}
  for k, v in pairs(cv.c) do out[k] = v end
  local N = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }
  -- inner lines: a pixel touching a *later* shape of a different group gets darkened
  if not opts.noInner then
    for k, m in pairs(cv.m) do
      if not m.noline then
        local x, y = k % w, math.floor(k / w)
        for _, d in ipairs(N) do
          local nx, ny = x + d[1], y + d[2]
          if nx >= 0 and ny >= 0 and nx < w and ny < h then
            local nk = ny * w + nx
            local nm = cv.m[nk]
            if nm and not nm.noline and nm.group ~= m.group and cv.o[nk] > cv.o[k] then
              out[k] = mix(m.ramp[1], { 20, 10, 36 }, 0.35)
              break
            end
          end
        end
      end
    end
  end
  -- outer outline
  if not opts.noOutline then
    for y = 0, h - 1 do
      for x = 0, w - 1 do
        local k = y * w + x
        if not cv.c[k] then
          local best, bo = nil, -1
          for _, d in ipairs(N) do
            local nx, ny = x + d[1], y + d[2]
            if nx >= 0 and ny >= 0 and nx < w and ny < h then
              local nk = ny * w + nx
              local nm = cv.m[nk]
              if nm and not nm.nooutline and cv.o[nk] > bo then best, bo = nm, cv.o[nk] end
            end
          end
          if best then out[k] = best.outline end
        end
      end
    end
  end
  return out
end

function R.toImage(cv, colors)
  local img = Image(cv.w, cv.h, ColorMode.RGB)
  for k, c in pairs(colors) do
    local x, y = k % cv.w, math.floor(k / cv.w)
    img:drawPixel(x, y, app.pixelColor.rgba(math.floor(c[1] + 0.5), math.floor(c[2] + 0.5), math.floor(c[3] + 0.5), c[4] or 255))
  end
  return img
end

-- convenience: build one frame with a draw function
function R.frame(w, h, draw, fopts)
  local cv = R.canvas(w, h)
  draw(cv)
  return R.toImage(cv, R.finalize(cv, fopts))
end

---------------------------------------------------------------------------
-- deterministic random
---------------------------------------------------------------------------
local seed = 20241114
function R.seed(s) seed = s end
function R.rnd()
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
end

---------------------------------------------------------------------------
-- output
---------------------------------------------------------------------------
R.manifest = {}

-- images: list of Image; anims: { name = {firstFrame0, lastFrame0, fps, loop} }
function R.save(outDir, srcDir, key, images, durMs, anims)
  local w, h = images[1].width, images[1].height
  local spr = Sprite(w, h, ColorMode.RGB)
  for i = 2, #images do spr:newEmptyFrame(i) end
  local layer = spr.layers[1]
  for i, img in ipairs(images) do
    local cel = layer:cel(i)
    if cel then cel.image = img; cel.position = Point(0, 0)
    else spr:newCel(layer, i, img, Point(0, 0)) end
    spr.frames[i].duration = (durMs or 150) / 1000
  end
  -- tag animations in Aseprite too, so artists see them
  if anims then
    for name, a in pairs(anims) do
      local tag = spr:newTag(a[1] + 1, a[2] + 1)
      tag.name = name
    end
  end
  spr:saveAs(srcDir .. "/" .. key .. ".aseprite")
  spr:close()

  local strip = Image(w * #images, h, ColorMode.RGB)
  for i, img in ipairs(images) do strip:drawImage(img, Point((i - 1) * w, 0)) end
  strip:saveAs(outDir .. "/" .. key .. ".png")

  local animJson = {}
  if anims then
    for name, a in pairs(anims) do
      animJson[#animJson + 1] = string.format('"%s": [%d, %d, %d, %s]', name, a[1], a[2], a[3] or 8, a[4] == false and 'false' or 'true')
    end
    table.sort(animJson)
  end
  R.manifest[#R.manifest + 1] = string.format('  "%s": {"w": %d, "h": %d, "frames": %d, "anims": {%s}}', key, w, h, #images, table.concat(animJson, ', '))
end

function R.writeManifest(outDir)
  table.sort(R.manifest)
  local f = io.open(outDir .. "/manifest.json", "w")
  f:write("{\n" .. table.concat(R.manifest, ",\n") .. "\n}\n")
  f:close()
end

return R
