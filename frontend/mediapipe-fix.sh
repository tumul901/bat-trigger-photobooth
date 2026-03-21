#!/bin/sh
# Patch the MediaPipe package.json bug that crashes Vite builds
FILE="node_modules/@mediapipe/tasks-vision/package.json"
if [ -f "$FILE" ]; then
    echo "Patching $FILE..."
    cat <<EOF > "$FILE"
{
  "name": "@mediapipe/tasks-vision",
  "version": "0.10.33",
  "description": "MediaPipe Vision Tasks",
  "main": "vision_bundle.cjs",
  "browser": "vision_bundle.mjs",
  "module": "vision_bundle.mjs",
  "exports": {
    ".": {
      "import": "./vision_bundle.mjs",
      "require": "./vision_bundle.cjs",
      "default": "./vision_bundle.mjs",
      "types": "./vision.d.ts"
    },
    "./vision_wasm_internal.js": "./vision_wasm_internal.js",
    "./vision_wasm_internal.wasm": "./vision_wasm_internal.wasm",
    "./vision_wasm_nosimd_internal.js": "./vision_wasm_nosimd_internal.js",
    "./vision_wasm_nosimd_internal.wasm": "./vision_wasm_nosimd_internal.wasm",
    "./vision_wasm_module_internal.js": "./vision_wasm_module_internal.js",
    "./vision_wasm_module_internal.wasm": "./vision_wasm_module_internal.wasm"
  },
  "author": "mediapipe@google.com",
  "license": "Apache-2.0",
  "type": "module",
  "types": "vision.d.ts",
  "homepage": "http://mediapipe.dev",
  "keywords": [ "AR", "ML", "Augmented", "MediaPipe", "MediaPipe Tasks" ]
}
EOF
else
    echo "Error: $FILE not found!"
    exit 1
fi
