"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, CircleAlert, Loader2, RotateCcw, Upload } from "lucide-react";
import type { FaceDetector } from "@mediapipe/tasks-vision";
import { assess, cropAroundFace, getDetector, regionLuma, type Assessment } from "@/lib/face";
import { canvasToJpeg } from "@/lib/image";

// In-page webcam. A face detector coaches the shopper live (distance, light,
// angle) and the capture is cropped around the face so it passes YouCam's
// "face wider than 60% of the image" rule from a normal sitting distance.

type Status = "starting" | "live" | "countdown" | "review" | "error";

export function CameraCapture({
  onCapture,
  onUpload,
}: {
  onCapture: (photo: Blob, preview: string) => void;
  onUpload: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [error, setError] = useState("");
  const [count, setCount] = useState(3);
  const [shot, setShot] = useState<{ blob: Blob; url: string }>();
  const [check, setCheck] = useState<Assessment>();
  const [detector, setDetector] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("live");
      })
      .catch((err: DOMException) => {
        if (cancelled) return;
        setError(
          err.name === "NotAllowedError"
            ? "Camera access is blocked. Click the camera icon in your browser's address bar to allow it, or upload a photo instead."
            : err.name === "NotFoundError"
              ? "We couldn't find a camera on this device. Upload a photo instead."
              : err.name === "NotReadableError"
                ? "Your camera is being used by another app. Close it and try again, or upload a photo."
                : "We couldn't start your camera. Upload a photo instead.",
        );
        setStatus("error");
      });
    getDetector("VIDEO")
      .then(() => !cancelled && setDetector("ready"))
      .catch(() => !cancelled && setDetector("failed"));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Live coaching loop (~7 checks a second).
  useEffect(() => {
    if (detector !== "ready" || (status !== "live" && status !== "countdown")) return;
    let det: FaceDetector | undefined;
    let raf = 0;
    let last = 0;
    let stopped = false;
    getDetector("VIDEO").then((d) => (det = d));
    const tick = (t: number) => {
      if (stopped) return;
      const v = videoRef.current;
      if (det && v && v.readyState >= 2 && t - last > 140) {
        last = t;
        const res = det.detectForVideo(v, t);
        const next = assess(res.detections, v.videoWidth, v.videoHeight, (box) => regionLuma(v, box));
        setCheck((prev) => (prev?.message === next.message ? prev : next));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [detector, status]);

  useEffect(() => {
    if (status !== "countdown") return;
    if (count === 0) {
      capture();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [status, count]);

  async function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    // Full frame, mirrored to match the preview the shopper saw.
    const frame = document.createElement("canvas");
    frame.width = vw;
    frame.height = vh;
    const ctx = frame.getContext("2d")!;
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    let out: HTMLCanvasElement | undefined;
    try {
      const det = await getDetector("IMAGE");
      const { detections } = det.detect(frame);
      const bb = detections.length === 1 ? detections[0].boundingBox : undefined;
      if (bb) out = cropAroundFace(frame, vw, vh, { x: bb.originX, y: bb.originY, w: bb.width, h: bb.height });
    } catch {
      // Detector unavailable: fall back to the plain center crop below.
    }
    if (!out) {
      const cw = Math.min(vw, (vh * 3) / 4);
      const ch = (cw * 4) / 3;
      out = document.createElement("canvas");
      out.width = Math.round(cw);
      out.height = Math.round(ch);
      out.getContext("2d")!.drawImage(frame, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, out.width, out.height);
    }
    const blob = await canvasToJpeg(out);
    setShot({ blob, url: URL.createObjectURL(blob) });
    setStatus("review");
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-clay/10 text-clay">
          <CameraOff className="size-6" />
        </span>
        <p className="mt-4 font-semibold">Camera unavailable</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <button
          onClick={onUpload}
          className="mt-6 flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-medium text-white"
        >
          <Upload className="size-4" /> Upload a photo
        </button>
      </div>
    );
  }

  // Without a working detector, don't block the shopper; the server still checks.
  const ready = status === "live" && (detector === "failed" || check?.ok === true);
  const ovalColor = check?.ok ? "#4ade80" : "white";

  return (
    <div className="flex flex-col items-center px-6 py-8">
      <div className="relative aspect-[3/4] w-full max-w-[340px] overflow-hidden rounded-3xl bg-ink">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`size-full -scale-x-100 object-cover ${status === "review" ? "hidden" : ""}`}
        />
        {shot && status === "review" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.url} alt="Your selfie" className="size-full object-cover" />
        )}
        {status !== "review" && (
          <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 size-full">
            <defs>
              <mask id="oval">
                <rect width="300" height="400" fill="white" />
                <ellipse cx="150" cy="185" rx="104" ry="138" fill="black" />
              </mask>
            </defs>
            <rect width="300" height="400" fill="rgba(0,0,0,0.45)" mask="url(#oval)" />
            <ellipse
              cx="150"
              cy="185"
              rx="104"
              ry="138"
              fill="none"
              stroke={ovalColor}
              strokeWidth={check?.ok ? 3 : 2}
              strokeDasharray={check?.ok ? undefined : "6 6"}
              className="transition-all"
            />
          </svg>
        )}
        {status === "starting" && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/80">Starting camera…</p>
        )}
        {status === "countdown" && count > 0 && (
          <p className="absolute inset-0 grid place-items-center text-7xl font-semibold text-white drop-shadow-lg">
            {count}
          </p>
        )}
        {status !== "review" && status !== "starting" && (
          <div className="absolute inset-x-3 bottom-3 flex justify-center">
            <span
              data-testid="camera-hint"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur ${
                check?.ok ? "bg-green-500/85 text-white" : "bg-black/60 text-white"
              }`}
            >
              {detector === "loading" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Getting ready…
                </>
              ) : detector === "failed" ? (
                "Fill the oval with your face · look straight ahead"
              ) : check?.ok ? (
                <>
                  <CheckCircle2 className="size-3.5" /> {check.message}
                </>
              ) : (
                <>
                  <CircleAlert className="size-3.5" /> {check?.message ?? "Looking for your face…"}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {status === "review" && shot ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-xs text-muted">We cropped the photo around your face for the most accurate scan.</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShot(undefined);
                setCount(3);
                setStatus("live");
              }}
              className="flex items-center gap-2 rounded-full border border-sand bg-white px-5 py-3 text-sm font-medium"
            >
              <RotateCcw className="size-4" /> Retake
            </button>
            <button
              onClick={() => onCapture(shot.blob, shot.url)}
              className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-white"
            >
              Analyze my skin
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            disabled={!ready && status !== "countdown"}
            onClick={() => {
              setCount(3);
              setStatus("countdown");
            }}
            className="flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera className="size-5" /> {status === "countdown" ? "Hold still…" : "Take photo"}
          </button>
          <button onClick={onUpload} className="text-sm text-muted underline underline-offset-4 hover:text-ink">
            Upload a photo instead
          </button>
        </div>
      )}
    </div>
  );
}
