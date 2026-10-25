import "server-only";
import { CONCERNS, type Concern, type SkinScan } from "./types";
import mockResponse from "./fixtures/skin-analysis.mock.json";

// YouCam AI Skin Analysis (docs.makeupar.com/reference/ai_skin_analysis).
// Flow: register file → PUT bytes to pre-signed URL → create task → poll.
// Units are only charged when a task succeeds.

const BASE = "https://yce-api-01.makeupar.com";

const SD_ACTIONS = [
  "acne",
  "pore",
  "wrinkle",
  "texture",
  "redness",
  "oiliness",
  "moisture",
  "radiance",
  "age_spot",
  "dark_circle_v2",
  "eye_bag",
  "firmness",
];

// Photo problems we can explain to the shopper instead of failing silently.
const FRIENDLY_ERRORS: Record<string, string> = {
  error_below_min_image_size: "That photo is too small. Use a sharper, closer selfie.",
  error_exceed_max_image_size: "That photo is too large. Try a smaller image.",
  exceed_max_filesize: "That photo is over 10 MB. Try a smaller image.",
  error_src_face_too_small: "Move closer so your face fills most of the frame.",
  error_src_face_out_of_bound: "Keep your whole face inside the frame.",
  error_lighting_dark: "It's too dark. Face a window or a bright light.",
  error_no_face: "We couldn't find a face. Look straight at the camera.",
  error_multiple_people: "Only one face, please.",
  error_large_face_angle: "Face the camera straight on.",
  error_pose: "Face the camera straight on with a neutral expression.",
  error_unsupport_ratio: "Use a portrait or square photo.",
};

export class YouCamError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? FRIENDLY_ERRORS[code] ?? "Skin analysis failed. Please try another photo.");
  }
}

export function friendlyError(code: string): string | undefined {
  return FRIENDLY_ERRORS[code];
}

function apiKey(): string | undefined {
  return process.env.YOUCAM_API_KEY || undefined;
}

export function isMockMode(): boolean {
  return !apiKey() || process.env.YOUCAM_MOCK === "1";
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.status && body.status !== 200)) {
    throw new YouCamError(body.error_code ?? `http_${res.status}`, body.error);
  }
  return body as T;
}

async function uploadImage(bytes: Buffer, contentType: string): Promise<string> {
  const ext = contentType === "image/png" ? "png" : "jpg";
  const reg = await call<{
    data: {
      files: {
        file_id: string;
        requests: { method: string; url: string; headers: Record<string, string> }[];
      }[];
    };
  }>("/s2s/v2.0/file", {
    method: "POST",
    body: JSON.stringify({
      files: [{ content_type: contentType, file_name: `selfie.${ext}`, file_size: bytes.length }],
    }),
  });
  const file = reg.data.files[0];
  const put = file.requests[0];
  const res = await fetch(put.url, {
    method: put.method,
    headers: put.headers,
    body: new Uint8Array(bytes),
  });
  if (!res.ok) throw new YouCamError("upload_failed", `Image upload failed (${res.status}).`);
  return file.file_id;
}

// With format "json", everything arrives in `output`: one entry per concern,
// plus "all" (overall score), "skin_age" and "resize_image" (the processed
// photo the masks line up with). Signed URLs expire after ~2 hours.
interface RawOutput {
  type: string;
  ui_score?: number;
  raw_score?: number;
  score?: number;
  mask_urls?: string[];
}

interface RawTask {
  data: {
    task_status: "running" | "success" | "error";
    error?: string | null;
    error_code?: string;
    results?: { output?: RawOutput[] };
  };
}

export function parseResult(raw: RawTask, source: SkinScan["source"]): SkinScan {
  const scan: SkinScan = { scores: [], source };
  for (const o of raw.data.results?.output ?? []) {
    if (o.type === "all" && o.score !== undefined) scan.overall = Math.round(o.score);
    else if (o.type === "skin_age" && o.score !== undefined) scan.skinAge = Math.round(o.score);
    else if (o.type === "resize_image") scan.imageUrl = o.mask_urls?.[0];
    else {
      const concern = (o.type === "dark_circle_v2" ? "dark_circle" : o.type) as Concern;
      if (!CONCERNS.includes(concern) || o.ui_score === undefined) continue;
      scan.scores.push({
        concern,
        uiScore: Math.round(o.ui_score),
        rawScore: o.raw_score ?? o.ui_score,
        maskUrl: o.mask_urls?.[0],
      });
    }
  }
  return scan;
}

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 60_000;

export async function analyzeSkin(
  bytes: Buffer,
  contentType: string,
  opts: { mock?: boolean } = {},
): Promise<SkinScan> {
  if (opts.mock || isMockMode()) {
    await new Promise((r) => setTimeout(r, 1200)); // feel like a real scan
    return parseResult(mockResponse as RawTask, "mock");
  }

  const fileId = await uploadImage(bytes, contentType);
  const created = await call<{ data: { task_id: string } }>("/s2s/v2.1/task/skin-analysis", {
    method: "POST",
    body: JSON.stringify({
      src_file_id: fileId,
      dst_actions: SD_ACTIONS,
      miniserver_args: { enable_mask_overlay: true },
      format: "json",
    }),
  });
  const taskId = created.data.task_id;

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const task = await call<RawTask>(`/s2s/v2.1/task/skin-analysis/${encodeURIComponent(taskId)}`);
    if (task.data.task_status === "success") {
      if (process.env.YOUCAM_LOG_RAW === "1") console.log(JSON.stringify(task));
      return parseResult(task, "youcam");
    }
    if (task.data.task_status === "error") {
      throw new YouCamError(task.data.error_code ?? task.data.error ?? "task_error");
    }
  }
  throw new YouCamError("timeout", "Skin analysis took too long. Please try again.");
}
