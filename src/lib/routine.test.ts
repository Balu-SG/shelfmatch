import { describe, expect, it } from "vitest";
import { DEMO_PRODUCTS } from "@/data/demo-store";
import mock from "./fixtures/skin-analysis.mock.json";
import realFixture from "./fixtures/skin-analysis.real.json";
import { gapAnalysis, funnel, type ScanEvent } from "./insights";
import { buildRoutine, inferSkinType, priorityConcerns, routineProducts, strongActives } from "./routine";
import type { SkinScan } from "./types";
import { parseResult } from "./youcam";

const scan = parseResult(mock as Parameters<typeof parseResult>[0], "mock");

function withScores(overrides: Record<string, number>): SkinScan {
  return {
    ...scan,
    scores: scan.scores.map((s) => ({ ...s, uiScore: overrides[s.concern] ?? 90 })),
  };
}

describe("parseResult", () => {
  it("normalizes YouCam output", () => {
    expect(scan.scores).toHaveLength(12);
    expect(scan.scores.find((s) => s.concern === "dark_circle")?.uiScore).toBe(55);
    expect(scan.overall).toBe(67);
    expect(scan.skinAge).toBe(29);
  });
});

describe("priorities and skin type", () => {
  it("picks the three lowest scores", () => {
    expect(priorityConcerns(scan).map((s) => s.concern)).toEqual(["oiliness", "pore", "dark_circle"]);
  });

  it("ignores healthy concerns", () => {
    expect(priorityConcerns(withScores({ acne: 60 })).map((s) => s.concern)).toEqual(["acne"]);
  });

  it("infers skin type from scores", () => {
    expect(inferSkinType(scan)).toBe("oily");
    expect(inferSkinType(withScores({ moisture: 40 }))).toBe("dry");
    expect(inferSkinType(withScores({ moisture: 40, oiliness: 40 }))).toBe("combination");
    expect(inferSkinType(withScores({ redness: 30 }))).toBe("sensitive");
  });
});

describe("buildRoutine", () => {
  const r = buildRoutine(scan, DEMO_PRODUCTS);

  it("fills every slot from the store's catalog", () => {
    expect(r.am.map((p) => p.slot)).toEqual(["cleanser", "serum", "moisturizer", "spf"]);
    expect(r.pm.map((p) => p.slot)).toEqual(["cleanser", "treatment", "moisturizer", "eye"]);
    expect(r.missing).toEqual([]);
  });

  it("targets the shopper's priorities", () => {
    expect(r.am[1].product.id).toBe("sr-niac");
    expect(r.am[1].why).toMatch(/oiliness \(41\/100\)/);
  });

  it("never recommends a product to avoid for the skin type", () => {
    for (const p of routineProducts(r)) expect(p.tags!.avoidFor).not.toContain(r.skinType);
  });

  it("reuses cleanser and moisturizer but not actives", () => {
    expect(r.pm[0].product.id).toBe(r.am[0].product.id);
    expect(r.pm[2].product.id).toBe(r.am[2].product.id);
    expect(r.pm[1].product.id).not.toBe(r.am[1].product.id);
  });

  it("totals unique products only", () => {
    const sum = routineProducts(r).reduce((s, p) => s + p.price, 0);
    expect(r.total).toBe(sum);
  });

  it("skips the eye slot when eyes are fine", () => {
    const fine = buildRoutine(withScores({ acne: 50 }), DEMO_PRODUCTS);
    expect(fine.pm.map((p) => p.slot)).not.toContain("eye");
  });

  it("reports slots it cannot fill", () => {
    const noSpf = DEMO_PRODUCTS.filter((p) => p.tags?.category !== "spf");
    expect(buildRoutine(scan, noSpf).missing).toEqual(["spf"]);
  });

  it("respects a per-item budget", () => {
    const cheap = buildRoutine(scan, DEMO_PRODUCTS, { maxPricePerItem: 20 });
    for (const p of routineProducts(cheap)) expect(p.price).toBeLessThanOrEqual(20);
  });
});

describe("real YouCam response", () => {
  const real = parseResult(realFixture as Parameters<typeof parseResult>[0], "youcam");
  const r = buildRoutine(real, DEMO_PRODUCTS);

  it("reads overall, skin age and the base image from output entries", () => {
    expect(real.scores).toHaveLength(12);
    expect(real.overall).toBe(74);
    expect(real.skinAge).toBe(62);
    expect(real.imageUrl).toMatch(/resize_image/);
  });

  it("prioritizes the lowest scores", () => {
    expect(r.priorities.map((s) => s.concern)).toEqual(["firmness", "wrinkle", "eye_bag"]);
  });

  it("keeps treatments out of the morning", () => {
    for (const p of r.am) expect(p.product.tags!.category).not.toBe("treatment");
  });

  it("adds an eye product when an eye concern is a priority", () => {
    expect(r.pm.map((p) => p.slot)).toContain("eye");
  });

  it("never doubles a strong active within one routine", () => {
    for (const picks of [r.am, r.pm]) {
      const unique = [...new Map(picks.map((p) => [p.product.id, p.product])).values()];
      const actives = unique.flatMap(strongActives);
      expect(new Set(actives).size).toBe(actives.length);
    }
  });
});

describe("insights", () => {
  const scans: ScanEvent[] = [
    { priorities: ["oiliness", "pore"], addedToCart: true, cartValue: 80, recommendedIds: [] },
    { priorities: ["oiliness", "acne"], addedToCart: false, cartValue: 0, recommendedIds: [] },
    { priorities: ["moisture"], addedToCart: true, cartValue: 60, recommendedIds: [] },
  ];

  it("flags oil control as the top gap in the demo store", () => {
    const gaps = gapAnalysis(scans, DEMO_PRODUCTS);
    expect(gaps[0].concern).toBe("oiliness");
    expect(gaps[0].supply).toBe(2);
    expect(gaps[0].demandPct).toBe(67);
  });

  it("computes the funnel", () => {
    expect(funnel(scans)).toEqual({ scans: 3, carts: 2, conversionPct: 67, avgCart: 70, revenue: 140 });
  });
});
