-- Giữ Thành Cổ Loa — pixel art generator (run through Aseprite, see build-art.ps1)
-- Params: dir=<this folder>  out=<png output dir>  src=<.aseprite output dir>  only=<optional module name>
local dir = app.params.dir
assert(dir and app.params.out and app.params.src, "missing --script-param dir/out/src")

local R = dofile(dir .. "/raster.lua")
R.outDir = app.params.out
R.srcDir = app.params.src

for _, mod in ipairs({ "characters", "monsters", "classes", "world", "ui" }) do
  local path = dir .. "/" .. mod .. ".lua"
  local f = io.open(path, "r")
  if f then
    f:close()
    local chunk = assert(loadfile(path))
    chunk(R)
    print("built " .. mod)
  end
end

R.writeManifest(R.outDir)
print("Built " .. #R.manifest .. " sprites")
