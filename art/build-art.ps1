# Rebuilds all sprites with Aseprite.
# Usage: powershell -ExecutionPolicy Bypass -File art/build-art.ps1
# Set the ASEPRITE env var if Aseprite lives somewhere else.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$aseprite = if ($env:ASEPRITE) { $env:ASEPRITE } else { "E:\SteamLibrary\steamapps\common\Aseprite\Aseprite.exe" }
$out = Join-Path $root "public\assets\sprites"
$src = Join-Path $root "art\src"
foreach ($d in @($out, $src)) {
  New-Item -ItemType Directory -Force $d | Out-Null
  Get-ChildItem $d -File | Where-Object { $_.Extension -in ".png", ".aseprite", ".json" } | Remove-Item
}
$result = & $aseprite -b --script-param "dir=$PSScriptRoot" --script-param "out=$out" --script-param "src=$src" --script (Join-Path $PSScriptRoot "build-art.lua") 2>&1 | Out-String
Write-Output $result
if ($result -notmatch "Built \d+ sprites") { throw "Aseprite script failed" }
