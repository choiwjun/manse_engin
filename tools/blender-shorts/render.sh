#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BLENDER_EXE="${BLENDER_EXE:-blender}"
OUT_DIR="${OUT_DIR:-$ROOT/output/blender-shorts}"
RENDER_ENGINE="${RENDER_ENGINE:-cycles}"
mkdir -p "$OUT_DIR"

npm --prefix "$ROOT/packages/myeong-engine" run build
node "$ROOT/tools/blender-shorts/export-scene.mjs" --out "$OUT_DIR/first-money.json"

"$BLENDER_EXE" --background \
  --python "$ROOT/tools/blender-shorts/blender/build_scene.py" -- \
  --input "$OUT_DIR/first-money.json" \
  --output-blend "$OUT_DIR/first-money.blend" \
  --output-video "$OUT_DIR/first-money.mp4" \
  --engine "$RENDER_ENGINE" "$@"
