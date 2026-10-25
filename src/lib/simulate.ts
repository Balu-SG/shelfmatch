import { buildRoutine, routineProducts } from "./routine";
import type { ScanEvent } from "./insights";
import { CONCERNS, type Concern, type Product, type SkinScan } from "./types";

// Deterministic simulated shoppers for the demo dashboard. Each one gets
// plausible YouCam-style scores and is run through the real routine engine,
// so recommendations, carts and gaps are exactly what the live app would do.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Typical score centres for this store's audience. Oil and pores run low so
// the demo store (only 2 oil-control products) shows a clear gap.
const CENTRE: Record<Concern, number> = {
  acne: 72,
  pore: 64,
  wrinkle: 76,
  texture: 70,
  redness: 71,
  oiliness: 58,
  moisture: 66,
  radiance: 69,
  age_spot: 74,
  dark_circle: 68,
  eye_bag: 75,
  firmness: 79,
};

const DAY = 86_400_000;

export function simulateScans(catalog: Product[], { count = 240, days = 30, seed = 7, now = Date.now() } = {}): ScanEvent[] {
  const rand = mulberry32(seed);
  const normal = () => {
    // Box–Muller
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
  const events: ScanEvent[] = [];

  for (let i = 0; i < count; i++) {
    // Skewed toward recent days (growing adoption); never in the future.
    const ts = now - Math.floor(Math.pow(rand(), 1.4) * (days - 1) * DAY);
    const age = Math.round(22 + rand() * 30);
    const ageShift = (age - 35) * 0.6; // older skin: lower wrinkle/firmness scores
    const scores = CONCERNS.map((concern) => {
      let centre = CENTRE[concern];
      if (concern === "wrinkle" || concern === "firmness" || concern === "age_spot") centre -= ageShift;
      if (concern === "acne" || concern === "oiliness") centre += ageShift * 0.5;
      const uiScore = Math.round(Math.min(97, Math.max(25, centre + normal() * 11)));
      return { concern, uiScore, rawScore: uiScore };
    });
    const overall = Math.round(scores.reduce((s, c) => s + c.uiScore, 0) / scores.length);
    const scan: SkinScan = { scores, overall, skinAge: age + Math.round(normal() * 3), source: "mock" };
    const routine = buildRoutine(scan, catalog);
    const products = routineProducts(routine);
    const carted = rand() < 0.34;
    // Some shoppers buy only part of the routine.
    const share = carted ? (rand() < 0.6 ? 1 : 0.4 + rand() * 0.4) : 0;
    events.push({
      ts,
      priorities: routine.priorities.map((p) => p.concern),
      addedToCart: carted,
      cartValue: Math.round(routine.total * share * 100) / 100,
      recommendedIds: products.map((p) => p.id),
      skinType: routine.skinType,
      overall,
      skinAge: scan.skinAge,
    });
  }
  return events.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
}
