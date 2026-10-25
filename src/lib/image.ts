import { cropAroundFace, FACE_SHARE, getDetector } from "./face";

// Client-side photo prep: decode anything the browser can read (incl. HEIC on
// Safari), crop around the face, cap the size, and re-encode as JPEG.

const MAX_SIDE = 2048;
export const MIN_SHORT_SIDE = 480;

export class PhotoError extends Error {}

export async function toJpeg(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("We can't read this photo format. Please use a JPG or PNG.");
  }
  const { width, height } = bitmap;
  if (Math.min(width, height) < MIN_SHORT_SIDE) {
    throw new PhotoError(`That photo is too small (${width}×${height}). Use one at least ${MIN_SHORT_SIDE}px on the short side.`);
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToJpeg(await frameFace(canvas));
}

// Crop loose photos so the face fills enough of the frame for YouCam.
async function frameFace(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  let detections;
  try {
    detections = (await getDetector("IMAGE")).detect(canvas).detections;
  } catch {
    return canvas; // detector unavailable: let the server judge the photo
  }
  if (detections.length === 0) {
    throw new PhotoError("We couldn't find a face in that photo. Use a clear, front-facing selfie.");
  }
  if (detections.length > 1) throw new PhotoError("We found more than one face. Use a photo of just you.");
  const bb = detections[0].boundingBox!;
  if (bb.width / canvas.width >= FACE_SHARE - 0.05) return canvas;
  return cropAroundFace(canvas, canvas.width, canvas.height, { x: bb.originX, y: bb.originY, w: bb.width, h: bb.height });
}

export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PhotoError("Couldn't process the photo."))), "image/jpeg", 0.92),
  );
}

// Phones get the native camera via <input capture>; desktops get an in-page webcam.
export function prefersNativeCamera(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches || !navigator.mediaDevices?.getUserMedia;
}
