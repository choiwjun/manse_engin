$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Blender = if ($env:BLENDER_EXE) { $env:BLENDER_EXE } else { "blender" }
$OutDir = if ($env:OUT_DIR) { $env:OUT_DIR } else { Join-Path $Root "output\blender-shorts" }
$Engine = if ($env:RENDER_ENGINE) { $env:RENDER_ENGINE } else { "cycles" }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

npm --prefix (Join-Path $Root "packages\myeong-engine") run build
node (Join-Path $Root "tools\blender-shorts\export-scene.mjs") --out (Join-Path $OutDir "first-money.json")

& $Blender --background `
  --python (Join-Path $Root "tools\blender-shorts\blender\build_scene.py") -- `
  --input (Join-Path $OutDir "first-money.json") `
  --output-blend (Join-Path $OutDir "first-money.blend") `
  --output-video (Join-Path $OutDir "first-money.mp4") `
  --engine $Engine @args
