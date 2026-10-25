"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Glasses, ScanFace, ShieldCheck, Sun, Smile, Upload, X } from "lucide-react";
import { FaceMesh } from "./FaceMesh";
import { PhotoError, prefersNativeCamera, toJpeg } from "@/lib/image";
import { recordScan, markCarted } from "@/lib/events";
import { buildRoutine, routineProducts, type Routine } from "@/lib/routine";
import type { Product, SkinScan } from "@/lib/types";
import { CameraCapture } from "./CameraCapture";
import { ScanResult } from "./ScanResult";

type State =
  | { step: "intro" }
  | { step: "camera" }
  | { step: "scanning"; preview?: string }
  | { step: "result"; scan: SkinScan; routine: Routine; preview?: string; eventIndex: number }
  | { step: "error"; message: string };

const SCAN_MESSAGES = [
  "Detecting your face…",
  "Measuring pores, texture and tone…",
  "Checking hydration, oil and redness…",
  "Matching products on our shelf…",
];

const TIPS = [
  { icon: Sun, title: "Bright, even light", body: "Face a window. Avoid strong shadows or backlight." },
  { icon: ScanFace, title: "Fill the frame", body: "Arm's length, face covering most of the photo." },
  { icon: Smile, title: "Neutral expression", body: "Look straight ahead, mouth closed, eyes open." },
  { icon: Glasses, title: "Bare face", body: "No glasses or heavy makeup. Hair off your forehead." },
];

export function ScanFlow({
  storeName,
  products,
  onClose,
  onAddToCart,
}: {
  storeName: string;
  products: Product[];
  onClose: () => void;
  onAddToCart: (items: Product[], total: number) => void;
}) {
  const [state, setState] = useState<State>({ step: "intro" });
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Escape closes an open tooltip first, the dialog only when none is showing.
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && !document.querySelector("[role=tooltip]") && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function run(body: FormData, preview?: string) {
    setState({ step: "scanning", preview });
    try {
      const res = await fetch("/api/scan", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      // Match against this storefront's own catalog (demo or imported).
      const scan: SkinScan = data.scan;
      const routine = buildRoutine(scan, products);
      const eventIndex = recordScan({
        priorities: routine.priorities.map((p) => p.concern),
        addedToCart: false,
        cartValue: 0,
        recommendedIds: routineProducts(routine).map((p) => p.id),
        skinType: routine.skinType,
        overall: scan.overall,
        skinAge: scan.skinAge,
      });
      setState({ step: "result", scan, routine, preview, eventIndex });
    } catch (err) {
      setState({ step: "error", message: (err as Error).message });
    }
  }

  function analyze(photo: Blob, preview: string) {
    const body = new FormData();
    body.set("image", photo, "selfie.jpg");
    run(body, preview);
  }

  async function onFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = ""; // allow picking the same file again
    if (!file) return;
    try {
      const jpeg = await toJpeg(file);
      analyze(jpeg, URL.createObjectURL(jpeg));
    } catch (err) {
      setState({
        step: "error",
        message: err instanceof PhotoError ? err.message : "We couldn't read that photo. Try another one.",
      });
    }
  }

  function takeSelfie() {
    if (prefersNativeCamera()) cameraRef.current?.click();
    else setState({ step: "camera" });
  }

  function sample() {
    const body = new FormData();
    body.set("sample", "1");
    run(body);
  }

  const stepIndex = { intro: 0, camera: 0, error: 0, scanning: 1, result: 2 }[state.step];

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-ink/55 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Skin match"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[2rem] bg-ivory shadow-lift sm:rounded-[2rem]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-sand px-5 py-3.5 sm:px-8">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-xl">Skin match</span>
            <span className="hidden text-xs text-muted sm:inline">· {storeName}</span>
          </div>
          <Stepper current={stepIndex} />
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full border border-sand hover:bg-white"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => onFile(e.target)}
        />
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target)} />

        <div className="overflow-y-auto" data-scroll>
          {state.step === "camera" && (
            <CameraCapture onCapture={analyze} onUpload={() => uploadRef.current?.click()} />
          )}

          {state.step === "intro" && (
            <div className="fade-up grid md:grid-cols-[1.05fr_1fr]">
              <div className="flex flex-col px-6 py-9 sm:px-12 sm:py-12">
                <p className="eyebrow text-gold">Powered by YouCam Skin AI</p>
                <h2 className="mt-4 font-serif text-[2.6rem] leading-[1.05] sm:text-5xl">
                  Your routine, from <em>one selfie.</em>
                </h2>
                <p className="mt-4 leading-relaxed text-muted">
                  We measure 12 skin concerns, from hydration to fine lines, then build a morning and night ritual
                  using only products on our shelf, with the reason behind every pick.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {["12 measurements with visual maps", "A ritual from our shelf, every pick explained", "About 15 seconds, no sign-up"].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <span className="grid size-5 place-items-center rounded-full bg-gold/15 text-gold">
                        <Check className="size-3" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 grid gap-3 sm:max-w-md sm:grid-cols-2">
                  <button
                    onClick={takeSelfie}
                    className="flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-4 font-medium text-ivory shadow-lift transition hover:bg-ink"
                  >
                    <Camera className="size-5" /> Take a selfie
                  </button>
                  <button
                    onClick={() => uploadRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-full border border-stone bg-white px-6 py-4 font-medium transition hover:border-ink"
                  >
                    <Upload className="size-5" /> Upload a photo
                  </button>
                </div>
                <button onClick={sample} className="mt-4 self-start text-sm text-muted underline underline-offset-4 hover:text-ink">
                  No camera handy? See a sample result
                </button>
                <p className="mt-auto flex items-start gap-2 pt-10 text-xs leading-relaxed text-muted">
                  <ShieldCheck className="size-4 shrink-0 text-gold" />
                  Your photo is sent securely for analysis and discarded right after. Only anonymous scores are kept.
                </p>
              </div>

              <div className="relative flex flex-col justify-between overflow-hidden bg-brand px-6 py-8 text-ivory sm:px-10">
                <div className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-gold/25 blur-3xl" />
                <FaceMesh
                  tone="dark"
                  className="relative mx-auto w-full max-w-[380px]"
                  hotspots={[
                    { at: "forehead", label: "Lines", side: "left" },
                    { at: "rightCheek", label: "Hydration", side: "right" },
                    { at: "leftCheek", label: "Pores", side: "left" },
                  ]}
                />
                <div className="relative">
                  <p className="eyebrow text-gold">For an accurate scan</p>
                  <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
                    {TIPS.map(({ icon: Icon, title, body }) => (
                      <div key={title} className="flex gap-2.5">
                        <Icon className="mt-0.5 size-4 shrink-0 text-gold" />
                        <div>
                          <p className="text-sm font-medium">{title}</p>
                          <p className="text-xs leading-relaxed text-ivory/60">{body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {state.step === "scanning" && <Scanning preview={state.preview} />}

          {state.step === "error" && (
            <div className="fade-up mx-auto max-w-md px-6 py-16 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-clay/10 text-clay">
                <Camera className="size-6" />
              </span>
              <h2 className="mt-5 font-serif text-3xl">Let&apos;s try that again</h2>
              <p className="mt-2 text-muted">{state.message}</p>
              <button
                onClick={() => setState({ step: "intro" })}
                className="mt-7 rounded-full bg-brand px-7 py-3.5 font-medium text-ivory hover:bg-ink"
              >
                Try another photo
              </button>
            </div>
          )}

          {state.step === "result" && (
            <ScanResult
              scan={state.scan}
              routine={state.routine}
              preview={state.preview}
              onAddToCart={(items, total) => {
                markCarted(state.eventIndex, total);
                onAddToCart(items, total);
              }}
              onRescan={() => setState({ step: "intro" })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  const steps = ["Selfie", "Analysis", "Routine"];
  return (
    <ol className="flex items-center gap-1.5 text-xs sm:gap-3">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5 sm:gap-3">
          <span className={`flex items-center gap-1.5 ${i <= current ? "text-ink" : "text-muted/60"}`}>
            <span
              className={`grid size-5 place-items-center rounded-full text-[10px] font-semibold ${
                i < current ? "bg-gold text-white" : i === current ? "bg-ink text-ivory" : "border border-stone"
              }`}
            >
              {i < current ? <Check className="size-3" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{s}</span>
          </span>
          {i < steps.length - 1 && <span className="h-px w-4 bg-stone sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

function Scanning({ preview }: { preview?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, SCAN_MESSAGES.length - 1)), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center px-6 py-12">
      <div className="relative aspect-[3/4] w-64 overflow-hidden rounded-[1.75rem] bg-brand shadow-lift">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover opacity-80" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-brand/10 via-transparent to-brand/60" />
        <FaceMesh tone="dark" sweep className="absolute inset-0 m-auto w-[118%] max-w-none -translate-x-[8%] opacity-80" />
      </div>
      <p className="mt-7 font-serif text-2xl">{SCAN_MESSAGES[i]}</p>
      <div className="mt-4 h-0.5 w-64 overflow-hidden rounded-full bg-sand">
        <div
          className="h-full rounded-full bg-gold transition-all duration-[2000ms]"
          style={{ width: `${((i + 1) / SCAN_MESSAGES.length) * 90}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted">Usually takes 10–20 seconds</p>
    </div>
  );
}
