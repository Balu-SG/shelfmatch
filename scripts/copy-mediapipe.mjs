// Copies MediaPipe's WASM runtime into public/ so the face detector is
// self-hosted (no third-party CDN at runtime). Runs on postinstall.
import { cpSync, mkdirSync } from "node:fs";

const from = "node_modules/@mediapipe/tasks-vision/wasm";
const to = "public/mediapipe";
mkdirSync(to, { recursive: true });
for (const f of [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
]) {
  cpSync(`${from}/${f}`, `${to}/${f}`);
}
console.log("mediapipe wasm copied to", to);
