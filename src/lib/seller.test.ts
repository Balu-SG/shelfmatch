import { describe, expect, it } from "vitest";
import { DEMO_PRODUCTS } from "@/data/demo-store";
import { funnel, gapAnalysis, scansPerDay, skinTypeMix } from "./insights";
import { tagProduct, tagWithKeywords } from "./keyword-tagger";
import { simulateScans } from "./simulate";
import type { Product } from "./types";

const NOW = new Date("2026-10-25T12:00:00Z").getTime();

describe("simulateScans", () => {
  const scans = simulateScans(DEMO_PRODUCTS, { now: NOW });

  it("is deterministic for a seed", () => {
    expect(simulateScans(DEMO_PRODUCTS, { now: NOW })).toEqual(scans);
  });

  it("spreads 240 scans over the last 30 days", () => {
    expect(scans).toHaveLength(240);
    const days = scansPerDay(scans, 30, NOW);
    expect(days.reduce((s, d) => s + d.scans, 0)).toBe(240);
  });

  it("recommends only products from the catalog", () => {
    const ids = new Set(DEMO_PRODUCTS.map((p) => p.id));
    for (const s of scans) for (const id of s.recommendedIds) expect(ids.has(id)).toBe(true);
  });

  it("surfaces oil control as the demo store's top gap", () => {
    const top = gapAnalysis(scans, DEMO_PRODUCTS)[0];
    expect(top.concern).toBe("oiliness");
    expect(top.supply).toBe(2);
    expect(top.demandPct).toBeGreaterThanOrEqual(20);
  });

  it("produces a realistic funnel and skin-type mix", () => {
    const f = funnel(scans);
    expect(f.conversionPct).toBeGreaterThan(20);
    expect(f.conversionPct).toBeLessThan(50);
    expect(skinTypeMix(scans).length).toBeGreaterThanOrEqual(3);
  });
});

describe("keyword tagger", () => {
  const p = (title: string, description = "", productType?: string): Product => ({
    id: title,
    title,
    description,
    productType,
    price: 20,
    currency: "USD",
  });

  it("tags actives and categories", () => {
    const t = tagProduct(p("Niacinamide 10% Pore Serum", "with zinc for oily skin"))!;
    expect(t.category).toBe("serum");
    expect(t.concerns.pore).toBeGreaterThanOrEqual(0.5);
    expect(t.skinTypes).toContain("oily");
  });

  it("recognizes full words like moisturizer and wash", () => {
    expect(tagProduct(p("Priming Moisturizer Balance"))?.category).toBe("moisturizer");
    expect(tagProduct(p("Daily Gel Wash", "", "Skincare"))?.category).toBe("cleanser");
  });

  it("flags strong actives as unsuitable for sensitive skin", () => {
    expect(tagProduct(p("Retinol Night Cream"))?.avoidFor).toContain("sensitive");
  });

  it("skips non-skincare by store product type and title", () => {
    const { tagged, skipped } = tagWithKeywords([
      p("Balm Dotcom", "lip balm", "Balms"),
      p("Cloud Paint", "cheek color", "Makeup"),
      p("Hand Cream", "", "Body"),
      p("Hydrating Cleanser", "ceramides", "Skincare"),
    ]);
    expect(tagged.map((x) => x.title)).toEqual(["Hydrating Cleanser"]);
    expect(skipped).toHaveLength(3);
  });

  it("keeps sunscreen even with makeup-like words", () => {
    expect(tagProduct(p("Tinted Sunscreen SPF 40", "", "Skincare"))?.category).toBe("spf");
  });
});
