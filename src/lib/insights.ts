import { CONCERNS, type Concern, type Product, type SkinType } from "./types";

// Seller-side analytics: what shoppers' skin needs vs what the shelf offers.

// Strength at which a product counts as "addressing" a concern.
export const SUPPLY_STRENGTH = 0.5;

export interface ScanEvent {
  priorities: Concern[];
  addedToCart: boolean;
  cartValue: number;
  recommendedIds: string[];
  ts?: number; // epoch ms
  skinType?: SkinType;
  overall?: number;
  skinAge?: number;
  live?: boolean; // a real scan from this browser, not simulated
}

export interface ConcernGap {
  concern: Concern;
  demandPct: number; // % of scans where this concern was a priority
  supply: number; // products that address it
  opportunity: number; // higher = more under-served
}

export function concernSupply(catalog: Product[]): Record<Concern, number> {
  const supply = Object.fromEntries(CONCERNS.map((c) => [c, 0])) as Record<Concern, number>;
  for (const p of catalog) {
    for (const [c, strength] of Object.entries(p.tags?.concerns ?? {})) {
      if ((strength ?? 0) >= SUPPLY_STRENGTH) supply[c as Concern]++;
    }
  }
  return supply;
}

export function gapAnalysis(scans: ScanEvent[], catalog: Product[]): ConcernGap[] {
  const supply = concernSupply(catalog);
  const total = Math.max(scans.length, 1);
  return CONCERNS.map((concern) => {
    const hits = scans.filter((s) => s.priorities.includes(concern)).length;
    const demandPct = Math.round((hits / total) * 100);
    return {
      concern,
      demandPct,
      supply: supply[concern],
      // Demand per product on the shelf; +1 so zero supply doesn't divide by zero.
      opportunity: Math.round((demandPct / (supply[concern] + 1)) * 10) / 10,
    };
  }).sort((a, b) => b.opportunity - a.opportunity);
}

export function funnel(scans: ScanEvent[]) {
  const carts = scans.filter((s) => s.addedToCart);
  const revenue = carts.reduce((sum, s) => sum + s.cartValue, 0);
  return {
    scans: scans.length,
    carts: carts.length,
    conversionPct: scans.length ? Math.round((carts.length / scans.length) * 100) : 0,
    avgCart: carts.length ? Math.round((revenue / carts.length) * 100) / 100 : 0,
    revenue: Math.round(revenue * 100) / 100,
  };
}

export function recommendationCounts(scans: ScanEvent[], catalog: Product[]) {
  const counts = new Map<string, number>(catalog.map((p) => [p.id, 0]));
  for (const s of scans) for (const id of s.recommendedIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const ranked = catalog
    .map((p) => ({ product: p, count: counts.get(p.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
  return {
    top: ranked.filter((r) => r.count > 0).slice(0, 5),
    never: ranked.filter((r) => r.count === 0).map((r) => r.product),
  };
}

const DAY = 86_400_000;

/** Scans per calendar day for the last `days` days, oldest first. */
export function scansPerDay(scans: ScanEvent[], days: number, now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const first = start.getTime() - (days - 1) * DAY;
  const buckets = Array.from({ length: days }, (_, i) => ({ day: first + i * DAY, scans: 0, carts: 0 }));
  for (const s of scans) {
    if (s.ts === undefined || s.ts < first) continue;
    const i = Math.floor((s.ts - first) / DAY);
    if (i >= 0 && i < days) {
      buckets[i].scans++;
      if (s.addedToCart) buckets[i].carts++;
    }
  }
  return buckets;
}

export function skinTypeMix(scans: ScanEvent[]) {
  const counts = new Map<SkinType, number>();
  for (const s of scans) if (s.skinType) counts.set(s.skinType, (counts.get(s.skinType) ?? 0) + 1);
  const total = Math.max(1, [...counts.values()].reduce((a, b) => a + b, 0));
  return [...counts.entries()]
    .map(([type, n]) => ({ type, n, pct: Math.round((n / total) * 100) }))
    .sort((a, b) => b.n - a.n);
}

export function averages(scans: ScanEvent[]) {
  const withScore = scans.filter((s) => s.overall !== undefined);
  const withAge = scans.filter((s) => s.skinAge !== undefined);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : undefined);
  return { score: avg(withScore.map((s) => s.overall!)), skinAge: avg(withAge.map((s) => s.skinAge!)) };
}
