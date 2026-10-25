import {
  CONCERN_LABELS,
  type Category,
  type Concern,
  type ConcernScore,
  type Product,
  type SkinScan,
  type SkinType,
} from "./types";

// Deterministic, explainable routine builder. Every pick carries a reason.

export const PRIORITY_COUNT = 3;
// A concern scoring at or above this is "fine" and never becomes a priority.
export const HEALTHY_SCORE = 80;

export interface Pick {
  slot: Category;
  product: Product;
  score: number;
  why: string;
}

export interface Routine {
  skinType: SkinType;
  priorities: ConcernScore[];
  am: Pick[];
  pm: Pick[];
  total: number;
  currency: string;
  missing: Category[]; // slots the store had no suitable product for
}

const severity = (s: ConcernScore) => (100 - s.uiScore) / 100;

export function priorityConcerns(scan: SkinScan, n = PRIORITY_COUNT): ConcernScore[] {
  return [...scan.scores]
    .filter((s) => s.uiScore < HEALTHY_SCORE)
    .sort((a, b) => a.uiScore - b.uiScore)
    .slice(0, n);
}

// YouCam returns skin type separately (format unconfirmed); fall back to a
// heuristic from oiliness/moisture/redness so the engine always has one.
export function inferSkinType(scan: SkinScan): SkinType {
  if (scan.skinType) return scan.skinType;
  const get = (c: Concern) => scan.scores.find((s) => s.concern === c)?.uiScore ?? 70;
  const oily = get("oiliness") < 55;
  const dry = get("moisture") < 55;
  if (get("redness") < 50) return "sensitive";
  if (oily && dry) return "combination";
  if (oily) return "oily";
  if (dry) return "dry";
  return "normal";
}

function suits(p: Product, skinType: SkinType): boolean {
  const t = p.tags;
  if (!t) return false;
  return !t.avoidFor.includes(skinType);
}

export function scoreProduct(
  p: Product,
  scan: SkinScan,
  priorities: ConcernScore[],
  skinType: SkinType,
): { score: number; top?: ConcernScore } {
  const t = p.tags;
  if (!t) return { score: 0 };
  const priority = new Set(priorities.map((s) => s.concern));
  let score = 0;
  let top: ConcernScore | undefined;
  let topContribution = 0;
  for (const s of scan.scores) {
    const strength = t.concerns[s.concern] ?? 0;
    if (!strength) continue;
    const contribution = strength * severity(s) * (priority.has(s.concern) ? 2 : 1);
    score += contribution;
    if (contribution > topContribution) {
      topContribution = contribution;
      top = s;
    }
  }
  if (t.skinTypes.includes(skinType)) score += 0.15;
  return { score, top };
}

function explain(p: Product, top: ConcernScore | undefined, skinType: SkinType): string {
  const ing = p.tags?.keyIngredients[0];
  if (!top) {
    return p.tags?.skinTypes.includes(skinType)
      ? `Gentle basic made for ${skinType} skin`
      : "Gentle basic that suits your skin";
  }
  const label = CONCERN_LABELS[top.concern].toLowerCase();
  // A healthy score is prevention, not treatment.
  const reason =
    top.uiScore >= HEALTHY_SCORE
      ? `Helps keep your ${label} in check (${top.uiScore}/100)`
      : `For your ${label} (${top.uiScore}/100)`;
  return ing ? `${reason} · with ${ing}` : reason;
}

// Strong actives that shouldn't be doubled up in one routine (irritation risk).
const STRONG_ACTIVES = ["retin", "glycolic", "lactic", "salicylic"];

export function strongActives(p: Product): string[] {
  const ings = (p.tags?.keyIngredients ?? []).join(" ").toLowerCase();
  return STRONG_ACTIVES.filter((a) => ings.includes(a));
}

function best(
  catalog: Product[],
  categories: Category[],
  scan: SkinScan,
  priorities: ConcernScore[],
  skinType: SkinType,
  exclude: Set<string>,
  actives: Set<string>,
  maxPrice?: number,
): Pick | undefined {
  let winner: Pick | undefined;
  for (const p of catalog) {
    if (!p.tags || !categories.includes(p.tags.category)) continue;
    if (exclude.has(p.id) || !suits(p, skinType)) continue;
    if (maxPrice !== undefined && p.price > maxPrice) continue;
    if (strongActives(p).some((a) => actives.has(a))) continue;
    const { score, top } = scoreProduct(p, scan, priorities, skinType);
    // Tie-break on price so the cheaper of two equal matches wins.
    if (!winner || score > winner.score || (score === winner.score && p.price < winner.product.price)) {
      winner = { slot: categories[0], product: p, score, why: explain(p, top, skinType) };
    }
  }
  return winner;
}

// Treatments (retinoids, acids, masks) are PM-only: they raise sun sensitivity.
const AM_SLOTS: Category[][] = [["cleanser"], ["serum"], ["moisturizer"], ["spf"]];
const PM_SLOTS: Category[][] = [["cleanser"], ["treatment", "serum"], ["moisturizer"]];

export interface RoutineOptions {
  maxPricePerItem?: number;
}

export function buildRoutine(
  scan: SkinScan,
  catalog: Product[],
  opts: RoutineOptions = {},
): Routine {
  const priorities = priorityConcerns(scan);
  const skinType = inferSkinType(scan);
  const missing: Category[] = [];

  const run = (slots: Category[][], reuse: Map<Category, Pick>, used: Set<string>) => {
    const picks: Pick[] = [];
    const actives = new Set<string>();
    for (const cats of slots) {
      const slot = cats[0];
      // Cleanser and moisturizer can be the same bottle morning and night.
      const shared = reuse.get(slot);
      if (shared && (slot === "cleanser" || slot === "moisturizer")) {
        picks.push(shared);
        strongActives(shared.product).forEach((a) => actives.add(a));
        continue;
      }
      const pick = best(catalog, cats, scan, priorities, skinType, used, actives, opts.maxPricePerItem);
      if (!pick) {
        if (!missing.includes(slot)) missing.push(slot);
        continue;
      }
      pick.slot = slot;
      used.add(pick.product.id);
      strongActives(pick.product).forEach((a) => actives.add(a));
      reuse.set(slot, pick);
      picks.push(pick);
    }
    return picks;
  };

  const reuse = new Map<Category, Pick>();
  const used = new Set<string>();
  const am = run(AM_SLOTS, reuse, used);
  const pmSlots = [...PM_SLOTS];
  const isEye = (s: ConcernScore) => s.concern === "dark_circle" || s.concern === "eye_bag";
  const eyeNeed = priorities.some(isEye) || scan.scores.some((s) => isEye(s) && s.uiScore < 65);
  if (eyeNeed) pmSlots.push(["eye"]);
  const pm = run(pmSlots, reuse, used);

  const routine: Routine = { skinType, priorities, am, pm, total: 0, currency: "USD", missing };
  const products = routineProducts(routine);
  routine.total = Math.round(products.reduce((sum, p) => sum + p.price, 0) * 100) / 100;
  routine.currency = products[0]?.currency ?? catalog[0]?.currency ?? "USD";
  return routine;
}

export function routineProducts(r: Routine): Product[] {
  const unique = new Map<string, Product>();
  for (const p of [...r.am, ...r.pm]) unique.set(p.product.id, p.product);
  return [...unique.values()];
}
