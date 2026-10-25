import type { Category, Concern } from "./types";

// Shopper-facing copy. Cosmetic guidance only, never medical claims.

export const CONCERN_INFO: Record<Concern, { measures: string; helps: string[]; benefit: string }> = {
  acne: {
    measures: "Active blemishes and breakouts across your face.",
    helps: ["Salicylic acid", "Azelaic acid", "Niacinamide"],
    benefit: "Blemishes",
  },
  pore: {
    measures: "How visible and enlarged your pores are, mostly on the nose and cheeks.",
    helps: ["Niacinamide", "Salicylic acid", "Retinoids", "Clay"],
    benefit: "Pores",
  },
  wrinkle: {
    measures: "Fine lines and wrinkles on the forehead, around the eyes and mouth.",
    helps: ["Retinoids", "Peptides", "Daily SPF"],
    benefit: "Fine lines",
  },
  texture: {
    measures: "How smooth your skin surface is: roughness, bumps and unevenness.",
    helps: ["AHAs (glycolic, lactic)", "PHAs", "Enzymes", "Retinoids"],
    benefit: "Smoothing",
  },
  redness: {
    measures: "Visible redness and irritation.",
    helps: ["Centella asiatica", "Azelaic acid", "Ceramides"],
    benefit: "Calming",
  },
  oiliness: {
    measures: "Shine and excess oil, especially across the T-zone.",
    helps: ["Niacinamide", "Salicylic acid", "Zinc", "Clay"],
    benefit: "Oil control",
  },
  moisture: {
    measures: "How hydrated your skin is. A low score means dehydrated skin.",
    helps: ["Hyaluronic acid", "Glycerin", "Ceramides", "Squalane"],
    benefit: "Hydrating",
  },
  radiance: {
    measures: "Your skin's glow. A low score means skin looks dull or tired.",
    helps: ["Vitamin C", "AHAs", "Niacinamide"],
    benefit: "Brightening",
  },
  age_spot: {
    measures: "Dark spots and uneven pigmentation.",
    helps: ["Vitamin C", "Tranexamic acid", "Niacinamide", "Daily SPF"],
    benefit: "Dark spots",
  },
  dark_circle: {
    measures: "Darkness in the under-eye area.",
    helps: ["Vitamin K", "Caffeine", "Niacinamide"],
    benefit: "Dark circles",
  },
  eye_bag: {
    measures: "Puffiness under the eyes.",
    helps: ["Caffeine", "Peptides"],
    benefit: "De-puffing",
  },
  firmness: {
    measures: "Elasticity and sagging along the jaw and cheeks.",
    helps: ["Peptides", "Retinoids", "Daily SPF"],
    benefit: "Firming",
  },
};

export type Band = "healthy" | "fair" | "care";

export function scoreBand(score: number): Band {
  if (score >= 80) return "healthy";
  if (score >= 65) return "fair";
  return "care";
}

export const BAND_STYLE: Record<Band, { label: string; text: string; bar: string; soft: string }> = {
  healthy: { label: "Healthy", text: "text-sage", bar: "bg-sage", soft: "bg-sage/10 text-sage" },
  fair: { label: "Fair", text: "text-amber", bar: "bg-amber", soft: "bg-amber/10 text-amber" },
  care: { label: "Needs care", text: "text-clay", bar: "bg-clay", soft: "bg-clay/10 text-clay" },
};

export const CATEGORY_INFO: Record<Category, { label: string; howTo: string; seconds: number }> = {
  cleanser: { label: "Cleanser", howTo: "Massage onto damp skin for 30–60 seconds, then rinse.", seconds: 60 },
  toner: { label: "Toner", howTo: "Pat into skin with clean hands after cleansing.", seconds: 20 },
  serum: { label: "Serum", howTo: "Press 2–3 drops into skin before moisturizer.", seconds: 30 },
  treatment: {
    label: "Treatment",
    howTo: "Apply a thin layer at night. Start 2–3 nights a week and build up.",
    seconds: 30,
  },
  moisturizer: { label: "Moisturizer", howTo: "Smooth a pea-sized amount over face and neck.", seconds: 30 },
  spf: {
    label: "Sunscreen",
    howTo: "Apply two finger-lengths as your last morning step. Reapply every 2 hours outdoors.",
    seconds: 30,
  },
  eye: { label: "Eye care", howTo: "Tap a rice-grain amount around the eye with your ring finger.", seconds: 20 },
};

export const CATEGORY_PLURAL: Record<Category, string> = {
  cleanser: "Cleansers",
  toner: "Toners",
  serum: "Serums",
  treatment: "Treatments",
  moisturizer: "Moisturizers",
  spf: "Sunscreen",
  eye: "Eye care",
};
