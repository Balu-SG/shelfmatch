import type { Detection, FaceDetector } from "@mediapipe/tasks-vision";

// Client-side face framing. YouCam rejects photos where the face is narrower
// than 60% of the image, which a laptop webcam at arm's length never meets.
// We find the face (MediaPipe BlazeFace, self-hosted) and crop around it, and
// coach the shopper live until the shot is usable.

const WASM = "/mediapipe";
const MODEL = "/models/blaze_face_short_range.tflite";

/** Face width as a share of the final crop width (YouCam needs > 0.6). */
export const FACE_SHARE = 0.7;
/** Below this many source pixels of face width, upscaling hurts analysis. */
export const MIN_FACE_PX = 220;
const OUTPUT_MIN_W = 600;
const OUTPUT_MAX_W = 1080;

// MediaPipe's WASM routes its INFO logs to console.error, which the Next dev
// overlay reports as an issue. Drop just those lines.
if (typeof window !== "undefined") {
  const original = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("INFO: ")) return;
    original(...args);
  };
}

type Mode = "IMAGE" | "VIDEO";
const detectors: Partial<Record<Mode, Promise<FaceDetector>>> = {};

export function getDetector(mode: Mode): Promise<FaceDetector> {
  detectors[mode] ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    return FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
      runningMode: mode,
      minDetectionConfidence: 0.6,
    });
  })();
  // Let a failed load retry next time instead of caching the rejection.
  detectors[mode]!.catch(() => delete detectors[mode]);
  return detectors[mode]!;
}

export interface Assessment {
  ok: boolean;
  message: string;
  box?: { x: number; y: number; w: number; h: number };
}

/** Judge a frame for skin analysis. Coordinates are in source pixels. */
export function assess(
  detections: Detection[],
  width: number,
  height: number,
  luma?: (box: { x: number; y: number; w: number; h: number }) => number,
): Assessment {
  if (detections.length === 0) return { ok: false, message: "Move closer and look straight at the camera" };
  if (detections.length > 1) return { ok: false, message: "Only one face in the frame, please" };
  const d = detections[0];
  const bb = d.boundingBox!;
  const box = { x: bb.originX, y: bb.originY, w: bb.width, h: bb.height };

  if (box.w < MIN_FACE_PX) return { ok: false, message: "Move a little closer", box };
  // Close is fine (we crop), but the whole face plus some forehead must be in frame.
  if (box.h > height * 0.8) return { ok: false, message: "Move back a little", box };
  const edge = Math.min(width, height) * 0.02;
  if (box.x < edge || box.x + box.w > width - edge || box.y < box.h * 0.12 || box.y + box.h > height - edge) {
    return { ok: false, message: "Center your face in the frame", box };
  }

  // BlazeFace keypoints (normalized): 0 right eye, 1 left eye, 2 nose tip.
  const [eyeR, eyeL, nose] = d.keypoints ?? [];
  if (eyeR && eyeL && nose) {
    const dx = (eyeL.x - eyeR.x) * width;
    const dy = (eyeL.y - eyeR.y) * height;
    const roll = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
    if (Math.min(roll, 180 - roll) > 12) return { ok: false, message: "Keep your head level", box };
    const mid = (eyeL.x + eyeR.x) / 2;
    const yaw = Math.abs(nose.x - mid) / Math.abs(eyeL.x - eyeR.x);
    if (yaw > 0.22) return { ok: false, message: "Face the camera straight on", box };
  }

  if (luma) {
    const l = luma(box);
    if (l < 70) return { ok: false, message: "Find brighter light, like facing a window", box };
    if (l > 225) return { ok: false, message: "Too bright. Step out of direct light", box };
  }
  return { ok: true, message: "Looks good. Hold still", box };
}

/** Average brightness (0–255) of a region, sampled at low resolution. */
export function regionLuma(
  source: CanvasImageSource,
  box: { x: number; y: number; w: number; h: number },
): number {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, 32, 32);
  const px = ctx.getImageData(0, 0, 32, 32).data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  return sum / (px.length / 4);
}

/** Portrait 3:4 crop around the face so it fills FACE_SHARE of the width. */
export function cropAroundFace(
  source: CanvasImageSource,
  width: number,
  height: number,
  box: { x: number; y: number; w: number; h: number },
): HTMLCanvasElement {
  let cw = box.w / FACE_SHARE;
  let ch = (cw * 4) / 3;
  if (ch > height) {
    ch = height;
    cw = (ch * 3) / 4;
  }
  if (cw > width) {
    cw = width;
    ch = Math.min(height, (cw * 4) / 3);
  }
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 - ch * 0.04; // a little headroom for the forehead
  const sx = Math.min(Math.max(cx - cw / 2, 0), width - cw);
  const sy = Math.min(Math.max(cy - ch / 2, 0), height - ch);

  const outW = Math.round(Math.min(Math.max(cw, OUTPUT_MIN_W), OUTPUT_MAX_W));
  const outH = Math.round((outW * ch) / cw);
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, cw, ch, 0, 0, outW, outH);
  return out;
}
