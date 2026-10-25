"use client";

import { useState } from "react";
import { Clock, Lightbulb, Moon, RotateCcw, Sun, Target } from "lucide-react";
import { BAND_STYLE, CATEGORY_INFO, CONCERN_INFO, scoreBand } from "@/lib/concern-info";
import type { Pick, Routine } from "@/lib/routine";
import { CONCERN_LABELS, type Concern, type ConcernScore, type Product, type SkinScan } from "@/lib/types";
import { FaceMesh, type Hotspot } from "./FaceMesh";
import { InfoTip } from "./InfoTip";
import { ProductArt } from "./ProductArt";
import { ScoreRing } from "./ScoreRing";

export function ScanResult({
  scan,
  routine,
  preview,
  onAddToCart,
  onRescan,
}: {
  scan: SkinScan;
  routine: Routine;
  preview?: string;
  onAddToCart: (items: Product[], total: number) => void;
  onRescan: () => void;
}) {
  const sorted = [...scan.scores].sort((a, b) => a.uiScore - b.uiScore);
  const [selected, setSelected] = useState<Concern>(sorted[0]?.concern ?? "moisture");
  const [time, setTime] = useState<"am" | "pm">("am");
  const priority = new Set(routine.priorities.map((p) => p.concern));
  const selectedScore = scan.scores.find((s) => s.concern === selected);
  const photo = selectedScore?.maskUrl ?? scan.imageUrl ?? preview;
  const products = [...new Map([...routine.am, ...routine.pm].map((p) => [p.product.id, p.product])).values()];
  const minutes = (picks: Pick[]) =>
    Math.max(1, Math.round(picks.reduce((s, p) => s + CATEGORY_INFO[p.slot].seconds, 0) / 60));

  return (
    <div className="fade-up">
      {/* Report header */}
      <div className="grid gap-8 border-b border-sand px-5 py-8 sm:px-10 lg:grid-cols-[300px_1fr]">
        <aside className="lg:row-span-2">
          <div className="relative mx-auto aspect-[3/4] max-w-[240px] overflow-hidden rounded-[1.75rem] bg-cream shadow-soft lg:max-w-none">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={`${CONCERN_LABELS[selected]} map`} className="size-full object-cover" />
            ) : (
              <div className="flex size-full flex-col items-center justify-center p-3">
                <FaceMesh className="w-full" hotspots={focusSpots(routine.priorities)} />
                <p className="eyebrow mt-1 text-center text-[10px] text-muted">Sample report · your photo maps here</p>
              </div>
            )}
            {selectedScore?.maskUrl && (
              <span className="absolute inset-x-3 bottom-3 rounded-full bg-ink/70 px-3 py-1.5 text-center text-xs text-ivory backdrop-blur">
                Showing · {CONCERN_LABELS[selected]} map
              </span>
            )}
          </div>
          <p className="mt-4 hidden text-[11px] leading-relaxed text-muted lg:block">
            Cosmetic guidance, not a medical diagnosis. See a dermatologist for persistent skin concerns.
          </p>
        </aside>

        <div className="min-w-0">
          <p className="eyebrow text-gold">Your skin analysis</p>
          <h2 className="mt-3 flex flex-wrap items-center gap-x-2 font-serif text-[2rem] leading-tight sm:text-[2.25rem]">
            Focus on {joinLabels(routine.priorities.map((p) => p.concern))}
            <InfoTip label="How focus areas are chosen" side="bottom">
              Your focus areas are your three lowest scores under 80. Every product is ranked by how well it targets
              them, so they shape your whole routine.
            </InfoTip>
          </h2>

          <div className="mt-6 grid grid-cols-3 divide-x divide-sand rounded-2xl border border-sand bg-white">
            <div className="flex items-center gap-4 p-4 sm:p-5">
              {scan.overall !== undefined && <ScoreRing score={scan.overall} size={64} />}
              <p className="flex items-center gap-1 text-sm text-muted">
                Skin score
                <InfoTip label="About skin score" align="start">
                  Your overall result across all 12 measurements, from 1 to 100. Higher means healthier skin.
                </InfoTip>
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="font-serif text-4xl leading-none tabular-nums">{scan.skinAge ?? "—"}</p>
              <p className="mt-2 flex items-center gap-1 text-sm text-muted">
                Skin age
                <InfoTip label="About skin age" align="start">
                  An AI estimate of how old your skin looks, based on lines, spots and firmness. Lighting and expression
                  can shift it by a few years.
                </InfoTip>
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="font-serif text-4xl leading-none capitalize">{routine.skinType}</p>
              <p className="mt-2 flex items-center gap-1 text-sm text-muted">
                Skin type
                <InfoTip label="About skin type" align="end">
                  Estimated from your oiliness, hydration and redness scores. We use it to leave out products that may
                  not suit your skin.
                </InfoTip>
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-serif text-2xl">Twelve measurements</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              {(["healthy", "fair", "care"] as const).map((b) => (
                <span key={b} className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${BAND_STYLE[b].bar}`} />
                  {BAND_STYLE[b].label} {b === "healthy" ? "80+" : b === "fair" ? "65–79" : "<65"}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((s) => (
              <ConcernRow
                key={s.concern}
                score={s}
                focus={priority.has(s.concern)}
                active={selected === s.concern}
                onSelect={() => setSelected(s.concern)}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Higher is healthier. Select a measurement to see where it shows.</p>

          {selectedScore && <ConcernDetail score={selectedScore} routine={routine} />}
        </div>
      </div>

      {/* Ritual */}
      <div className="bg-cream/60 px-5 py-8 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-gold">Made from this store&apos;s shelf</p>
            <h3 className="mt-2 flex items-center gap-1 font-serif text-4xl">
              Your routine
              <InfoTip label="How products are picked" align="start">
                For each step we score every product on this store&apos;s shelf by how strongly it targets your concerns,
                weighted by how much each one needs care. Products that may irritate {routine.skinType} skin are left
                out.
              </InfoTip>
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Clock className="size-3.5" /> About {minutes(routine[time])} min · {routine[time].length} steps
            </p>
          </div>
          <div className="flex rounded-full border border-sand bg-white p-1 text-sm">
            {(["am", "pm"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTime(t)}
                className={`flex items-center gap-1.5 rounded-full px-5 py-2 transition ${
                  time === t ? "bg-ink text-ivory" : "text-muted hover:text-ink"
                }`}
              >
                {t === "am" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {t === "am" ? "Morning" : "Night"}
              </button>
            ))}
          </div>
        </div>

        <ol className="relative mt-6 space-y-3">
          {routine[time].map((pick, i) => (
            <RoutineCard
              key={pick.slot + pick.product.id}
              pick={pick}
              step={i + 1}
              last={i === routine[time].length - 1}
              priority={priority}
            />
          ))}
        </ol>

        <RoutineTips routine={routine} />

        <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-4 text-ivory shadow-lift sm:px-6">
          <div className="min-w-0 text-sm">
            <p className="font-medium whitespace-nowrap">
              {products.length} products · ${routine.total.toFixed(2)}
            </p>
            <p className="hidden truncate text-ivory/60 sm:block">Morning + night ritual, all from this store</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onRescan}
              aria-label="Scan again"
              title="Scan again"
              className="hidden size-10 place-items-center rounded-full text-ivory/70 hover:bg-ivory/10 hover:text-ivory sm:grid"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              onClick={() => onAddToCart(products, routine.total)}
              className="rounded-full bg-ivory px-6 py-3 text-sm font-medium whitespace-nowrap text-ink hover:bg-white"
            >
              Add routine to bag
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted lg:hidden">
          Cosmetic guidance, not a medical diagnosis. See a dermatologist for persistent skin concerns.
        </p>
      </div>
    </div>
  );
}

function ConcernRow({
  score: s,
  focus,
  active,
  onSelect,
}: {
  score: ConcernScore;
  focus: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  const band = BAND_STYLE[scoreBand(s.uiScore)];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
      className={`cursor-pointer rounded-xl border px-3.5 py-3 transition ${
        active ? "border-ink/80 bg-white shadow-soft" : "border-sand bg-white/60 hover:border-stone hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1 text-sm">
          {CONCERN_LABELS[s.concern]}
          <InfoTip label={`About ${CONCERN_LABELS[s.concern]}`} align="start">
            {CONCERN_INFO[s.concern].measures}
          </InfoTip>
          {focus && <span className="eyebrow rounded-full bg-gold/12 px-1.5 py-0.5 text-[9px] text-gold">Focus</span>}
        </span>
        <span className="font-serif text-2xl leading-none tabular-nums">{s.uiScore}</span>
      </div>
      <div className="mt-2.5 h-1 rounded-full bg-sand">
        <div className={`h-full rounded-full ${band.bar}`} style={{ width: `${s.uiScore}%` }} />
      </div>
    </div>
  );
}

function ConcernDetail({ score: s, routine }: { score: ConcernScore; routine: Routine }) {
  const info = CONCERN_INFO[s.concern];
  const band = scoreBand(s.uiScore);
  const targeting = [...routine.am.map((p) => ({ ...p, time: "Morning" })), ...routine.pm.map((p) => ({ ...p, time: "Night" }))]
    .filter((p) => (p.product.tags?.concerns[s.concern] ?? 0) >= 0.3)
    .filter((p, i, all) => all.findIndex((q) => q.product.id === p.product.id) === i);
  return (
    <div className="mt-5 rounded-2xl border border-sand bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="font-serif text-2xl">{CONCERN_LABELS[s.concern]}</h4>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BAND_STYLE[band].soft}`}>
          {s.uiScore}/100 · {BAND_STYLE[band].label}
        </span>
        {s.maskUrl && <span className="text-xs text-muted">mapped on your photo</span>}
      </div>
      <p className="mt-1.5 text-sm text-muted">{info.measures}</p>
      <div className="mt-5 grid gap-5 border-t border-sand pt-5 sm:grid-cols-2">
        <div>
          <p className="eyebrow text-muted">Ingredients that help</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {info.helps.map((h) => (
              <span key={h} className="rounded-full border border-sand bg-ivory px-3 py-1 text-xs">
                {h}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow text-muted">In your routine</p>
          {targeting.length ? (
            <ul className="mt-2.5 space-y-1.5 text-sm">
              {targeting.map((p) => (
                <li key={p.product.id} className="flex items-center gap-2">
                  <Target className="size-3.5 shrink-0 text-gold" /> {p.product.title}
                  <span className="text-xs text-muted">· {p.time}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 text-sm text-muted">
              {band === "healthy" ? "Looking good. Your routine keeps it that way." : "No product on this shelf targets it directly."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RoutineCard({
  pick,
  step,
  last,
  priority,
}: {
  pick: Pick;
  step: number;
  last: boolean;
  priority: Set<Concern>;
}) {
  const info = CATEGORY_INFO[pick.slot];
  const targets = Object.entries(pick.product.tags?.concerns ?? {})
    .filter(([c, s]) => priority.has(c as Concern) && (s ?? 0) >= 0.3)
    .map(([c]) => c as Concern);
  return (
    <li className="relative flex gap-3 sm:gap-5">
      <div className="flex flex-col items-center pt-2">
        <span className="font-serif text-3xl leading-none text-gold">{String(step).padStart(2, "0")}</span>
        {!last && <span className="mt-2 w-px flex-1 bg-stone/60" />}
      </div>
      <div className="mb-1 flex min-w-0 flex-1 gap-4 rounded-2xl border border-sand bg-white p-3 shadow-soft sm:gap-5 sm:p-4">
        <ProductArt product={pick.product} className="size-24 shrink-0 rounded-xl sm:size-28" />
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="eyebrow text-[10px] text-muted">{info.label}</p>
              <p className="font-medium font-serif text-xl leading-tight">{pick.product.title}</p>
            </div>
            <span className="shrink-0 text-sm font-medium">${pick.product.price}</span>
          </div>
          <p className="mt-1.5 flex items-start gap-1 text-sm text-ink/80">
            <span>{pick.why}</span>
            <InfoTip label="Why this product" align="end">
              Picked as the best match on this shelf for your {info.label.toLowerCase()} step.
              {pick.product.tags?.keyIngredients.length ? <> Key ingredients: {pick.product.tags.keyIngredients.join(", ")}.</> : null}
            </InfoTip>
          </p>
          {targets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {targets.map((c) => (
                <span key={c} className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-[#8a6d45]">
                  Targets {CONCERN_LABELS[c].toLowerCase()}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs leading-relaxed text-muted">
            <span className="font-medium text-ink/70">How to use ·</span> {info.howTo}
          </p>
        </div>
      </div>
    </li>
  );
}

function RoutineTips({ routine }: { routine: Routine }) {
  const tips: string[] = [];
  const active = routine.pm.find((p) => p.slot === "treatment");
  if (active) tips.push(`Start ${active.product.title} 2–3 nights a week, then build up as your skin adjusts.`);
  if (routine.am.some((p) => p.slot === "spf"))
    tips.push("Use sunscreen every morning, even when it's cloudy. Active ingredients make skin more sun-sensitive.");
  tips.push("Patch-test new products on your jaw for 24 hours before using them on your whole face.");
  tips.push("Rescan in 4–6 weeks under the same lighting to track your progress.");
  if (routine.missing.length) tips.push(`This store has no ${routine.missing.join(" or ")} that suits you, so that step is skipped.`);
  return (
    <div className="mt-6 rounded-2xl border border-sand bg-white p-5 sm:p-6">
      <p className="flex items-center gap-2 font-serif text-xl">
        <Lightbulb className="size-4 text-gold" /> Tips for your routine
      </p>
      <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm text-muted sm:grid-cols-2">
        {tips.map((t) => (
          <li key={t} className="flex gap-2.5">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-gold" /> {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Where each concern shows on the face map, in order of preference.
const CONCERN_SPOTS: Record<Concern, Hotspot["at"][]> = {
  oiliness: ["forehead", "nose"],
  pore: ["leftCheek", "nose"],
  wrinkle: ["forehead", "underEyeL"],
  texture: ["rightCheek", "leftCheek"],
  redness: ["leftCheek", "rightCheek"],
  moisture: ["rightCheek", "leftCheek"],
  radiance: ["rightCheek", "forehead"],
  age_spot: ["leftCheek", "rightCheek"],
  dark_circle: ["underEyeR", "underEyeL"],
  eye_bag: ["underEyeL", "underEyeR"],
  firmness: ["jaw", "chin"],
  acne: ["chin", "leftCheek"],
};

function focusSpots(priorities: ConcernScore[]): Hotspot[] {
  const used = new Set<string>();
  const out: Hotspot[] = [];
  for (const p of priorities) {
    const at = CONCERN_SPOTS[p.concern].find((s) => !used.has(s));
    if (!at) continue;
    used.add(at);
    out.push({ at, label: CONCERN_LABELS[p.concern], value: p.uiScore });
  }
  return out;
}

function joinLabels(concerns: Concern[]) {
  const labels = concerns.map((c) => CONCERN_LABELS[c].toLowerCase());
  if (labels.length <= 1) return labels[0] ?? "keeping your skin healthy";
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}
